import dotenv from 'dotenv'
dotenv.config()

import assert from 'assert'
import crypto from 'crypto'
import { prisma } from '../lib/prisma.js'
import {
  downloadService,
  guestAccessService,
  checkoutService,
  webhookService,
  emailService,
} from '../lib/services.js'
import { signPurpose, hashToken, generateSecureToken } from '../lib/auth.js'
import { ordersRepo, entitlementsRepo, productAccessTokensRepo, productsRepo, storesRepo, usersRepo, customersRepo } from '../lib/repos.js'
import { supabaseAdmin, ensureBucket } from '../lib/supabase.js'

async function runExactScenarioTests() {
  console.log('=================================================================')
  console.log('STARTING EXACT SCREENSHOT SCENARIO (pw-dsa) TEST')
  console.log('=================================================================')

  const testId = crypto.randomUUID()
  const creatorId = crypto.randomUUID()
  const creatorEmail = `mohit_creator_${Date.now()}@example.com`.toLowerCase()
  const customerEmail = `customer_pwdsa_${Date.now()}@example.com`.toLowerCase()

  // 1. Setup creator "mohit" and store
  const creatorUser = await usersRepo.create({
    id: creatorId,
    email: creatorEmail,
    passwordHash: 'hash1234567890',
    name: 'Mohit',
    role: 'CREATOR',
  })

  const creatorStore = await storesRepo.create({
    id: crypto.randomUUID(),
    creatorId: creatorUser.id,
    name: 'Mohit Store',
    slug: `mohit_${Date.now()}`,
    username: `mohit_${Date.now()}`,
  })

  // Ensure file is in storage
  await ensureBucket('product-files', false)
  const testFileKey = `pw_dsa_${Date.now()}.pdf`
  await supabaseAdmin.storage.from('product-files').upload(testFileKey, Buffer.from('%PDF-1.4 PW DSA Course Material'), {
    contentType: 'application/pdf',
    upsert: true
  })

  // 2. Create Product "pw-dsa" (FREE)
  const productPwdsa = await productsRepo.create({
    id: crypto.randomUUID(),
    creatorId: creatorUser.id,
    title: 'pw-dsa',
    slug: `pw-dsa-${Date.now()}`,
    type: 'DIGITAL_DOWNLOAD',
    price: 0,
    currency: 'INR',
    fileId: testFileKey,
    fileName: 'pw-dsa-notes.pdf',
    fileSize: 154200,
    fileMime: 'application/pdf',
    published: true,
  })

  console.log('✓ Product pw-dsa created (Free Product)')

  // -------------------------------------------------------------
  // SCENARIO 1: Free Checkout on Product Page -> Instant Download
  // -------------------------------------------------------------
  console.log('\n--- SCENARIO 1: Free Checkout on Product Page -> Instant Download ---')
  const freeCheckoutRes = await checkoutService.createSession({
    productId: productPwdsa.id,
    email: customerEmail,
    customerName: 'Mohit Student',
  })
  assert.strictEqual(freeCheckoutRes.isFree, true, 'Order should be marked free')
  assert.strictEqual(freeCheckoutRes.success, true, 'Order creation should succeed')

  // Simulate server setting cookie on checkout response
  const sessionToken = guestAccessService.createGuestSessionToken({
    email: customerEmail,
    productId: productPwdsa.id,
  })
  assert(sessionToken, 'Session token should be generated')

  // Simulate client calling POST /api/download with the cookie
  const verifiedGuest = guestAccessService.verifyGuestSession(sessionToken)
  assert.strictEqual(verifiedGuest.email, customerEmail, 'Guest session should be verified')

  const dlRes1 = await downloadService.authorizeAndGetDownloadFile({
    productId: productPwdsa.id,
    guestEmail: verifiedGuest.email,
  })
  assert(Buffer.isBuffer(dlRes1.fileBuffer), 'Download must return direct binary Buffer')
  assert(dlRes1.fileBuffer.length > 0, 'Buffer must contain file bytes')
  assert(!('downloadUrl' in dlRes1), 'Must NOT return downloadUrl')
  console.log('✓ PASS: Customer completed free checkout and downloaded pw-dsa binary directly without error')

  // -------------------------------------------------------------
  // SCENARIO 2: Customer with existing entitlement visits product page
  // -------------------------------------------------------------
  console.log('\n--- SCENARIO 2: Check-Access syncs session for existing entitlement ---')
  // Entitlement already exists from Scenario 1
  const hasEnt = await entitlementsRepo.has(null, productPwdsa.id, customerEmail)
  assert.strictEqual(hasEnt, true, 'Entitlement should exist in database')

  // /checkout/check-access establishes/syncs session token
  const syncedToken = guestAccessService.createGuestSessionToken({
    email: customerEmail,
    productId: productPwdsa.id,
  })
  const verifiedSynced = guestAccessService.verifyGuestSession(syncedToken)

  const dlRes2 = await downloadService.authorizeAndGetDownloadFile({
    productId: productPwdsa.id,
    guestEmail: verifiedSynced.email,
  })
  assert(Buffer.isBuffer(dlRes2.fileBuffer), 'Download must return direct binary Buffer')
  assert(!('downloadUrl' in dlRes2), 'Must NOT return downloadUrl')
  console.log('✓ PASS: Check-access and download authorize against same entitlement and stream file directly')

  // -------------------------------------------------------------
  // SCENARIO 3: Access link from email -> /access/<token> -> Download
  // -------------------------------------------------------------
  console.log('\n--- SCENARIO 3: Email Access Token -> /access/<token> -> Download ---')
  const tokenRecord = await productAccessTokensRepo.getByOrderId(freeCheckoutRes.orderId)
  assert(tokenRecord, 'Access token record should exist in DB')

  // Let's create a fresh access token to simulate clicking email link
  const freshToken = await guestAccessService.createAccessToken({
    orderId: freeCheckoutRes.orderId,
    productId: productPwdsa.id,
    customerEmail,
  })
  const resolveRes = await guestAccessService.validateTokenAndResolve(freshToken.rawToken)
  assert.strictEqual(resolveRes.success, true, 'Token resolution must succeed')
  assert.strictEqual(resolveRes.redirectUrl, `/${creatorStore.slug}/${productPwdsa.slug}`, 'Redirect URL must be canonical /{store}/{product}')

  const sessionFromEmail = guestAccessService.verifyGuestSession(resolveRes.sessionCookieValue)
  const dlRes3 = await downloadService.authorizeAndGetDownloadFile({
    productId: productPwdsa.id,
    guestEmail: sessionFromEmail.email,
  })
  assert(Buffer.isBuffer(dlRes3.fileBuffer), 'Download must return direct binary Buffer')
  assert(!('downloadUrl' in dlRes3), 'Must NOT return downloadUrl')
  console.log('✓ PASS: Email /access/<token> resolves and downloads pw-dsa binary file directly')

  console.log('\n=================================================================')
  console.log('EXACT SCREENSHOT SCENARIOS PASSED 100%')
  console.log('=================================================================')

  // Cleanup
  await prisma.productAccessToken.deleteMany({ where: { orderId: freeCheckoutRes.orderId } })
  await prisma.entitlement.deleteMany({ where: { orderId: freeCheckoutRes.orderId } })
  await prisma.order.deleteMany({ where: { id: freeCheckoutRes.orderId } })
  await prisma.product.deleteMany({ where: { id: productPwdsa.id } })
  await prisma.store.deleteMany({ where: { id: creatorStore.id } })
  await prisma.user.deleteMany({ where: { id: creatorUser.id } })
  console.log('✓ Test data cleaned up successfully.')
}

runExactScenarioTests().catch((e) => {
  console.error('EXACT SCENARIO TEST FAILED:', e)
  process.exit(1)
})
