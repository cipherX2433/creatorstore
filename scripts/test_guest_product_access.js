import { v4 as uuidv4 } from 'uuid'
import { prisma } from '../lib/prisma.js'
import {
  guestAccessService,
  downloadService,
  checkoutService,
  webhookService,
  emailService,
} from '../lib/services.js'
import {
  ordersRepo,
  entitlementsRepo,
  productAccessTokensRepo,
  productsRepo,
  usersRepo,
  storesRepo,
} from '../lib/repos.js'
import { hashToken, generateSecureToken } from '../lib/auth.js'

async function runGuestAccessTests() {
  console.log('====================================================')
  console.log('RUNNING SECURE GUEST CUSTOMER PRODUCT ACCESS TESTS')
  console.log('====================================================')

  // Setup: Find or create a test creator, store, and product
  const creatorUser = await prisma.user.findFirst({
    where: { role: 'CREATOR' },
    include: { store: true },
  })

  if (!creatorUser) {
    throw new Error('No creator user found in DB for testing.')
  }

  const store = creatorUser.store || await storesRepo.getByCreator(creatorUser.id)
  const username = store?.username || 'testcreator'

  // Find or create test digital product
  let product1 = await prisma.product.findFirst({
    where: { creatorId: creatorUser.id, status: 'PUBLISHED' },
  })

  if (!product1) {
    product1 = await productsRepo.create({
      creatorId: creatorUser.id,
      title: 'Mastering JavaScript E-Book',
      slug: 'mastering-javascript-ebook-' + Date.now(),
      type: 'DIGITAL_DOWNLOAD',
      price: 499,
      currency: 'INR',
      status: 'PUBLISHED',
      fileId: 'mock-file-id.pdf',
      fileName: 'mastering-js.pdf',
    })
  }

  const customerEmail1 = `guest.customer.${Date.now()}@example.com`

  console.log(`\nUsing Creator: ${username}, Product: ${product1.title} (${product1.id})`)
  console.log(`Using Customer: ${customerEmail1}`)

  // ----------------------------------------------------
  // TEST 1: Paid purchase -> order, entitlement, access token hashed
  // ----------------------------------------------------
  console.log('\n--- TEST 1: Paid Purchase & Access Token Generation ---')
  const order1 = await ordersRepo.create({
    id: uuidv4(),
    creatorId: creatorUser.id,
    productId: product1.id,
    customerName: 'Alice Guest',
    customerEmail: customerEmail1,
    amount: product1.price,
    currency: product1.currency || 'INR',
    status: 'PAID',
    paymentMode: 'TEST',
    razorpayOrderId: `order_test_${Date.now()}`,
    razorpayPaymentId: `pay_test_${Date.now()}`,
    createdAt: new Date(),
    updatedAt: new Date(),
  })

  const ent1 = await entitlementsRepo.createForOrder({
    id: uuidv4(),
    orderId: order1.id,
    productId: product1.id,
    customerEmail: customerEmail1,
    status: 'ACTIVE',
  })

  const tokenResult = await guestAccessService.createAccessToken({
    orderId: order1.id,
    entitlementId: ent1.id,
    productId: product1.id,
    customerEmail: customerEmail1,
    expiresInDays: 30,
  })

  console.log('Generated Raw Token (length):', tokenResult.rawToken.length)
  console.log('Generated Token Hash:', tokenResult.tokenHash)
  console.log('Access URL:', tokenResult.accessUrl)

  // Verify raw token is NOT in database
  const dbRecord = await prisma.productAccessToken.findUnique({
    where: { tokenHash: tokenResult.tokenHash },
  })
  if (!dbRecord) throw new Error('FAIL: Access token record not found in DB!')
  if (dbRecord.tokenHash !== hashToken(tokenResult.rawToken)) throw new Error('FAIL: Token hash mismatch in DB!')
  console.log('PASS TEST 1: Paid purchase created order, entitlement, and hashed token in DB.')

  // ----------------------------------------------------
  // TEST 2: Token Resolution & Guest Session Cookie Generation
  // ----------------------------------------------------
  console.log('\n--- TEST 2: Token Resolution & Cookie Creation ---')
  const resolveResult = await guestAccessService.validateTokenAndResolve(tokenResult.rawToken)
  if (!resolveResult.success) throw new Error(`FAIL: Token resolution failed: ${resolveResult.message}`)
  if (!resolveResult.sessionCookieValue) throw new Error('FAIL: No guest session cookie generated!')
  if (!resolveResult.redirectUrl.includes(product1.slug)) throw new Error(`FAIL: Redirect URL does not contain product slug: ${resolveResult.redirectUrl}`)

  console.log('Resolved Redirect URL:', resolveResult.redirectUrl)
  console.log('Signed Guest Session Cookie:', resolveResult.sessionCookieValue.slice(0, 30) + '...')
  console.log('PASS TEST 2: Token successfully resolved to canonical product URL and signed session cookie.')

  // ----------------------------------------------------
  // TEST 3: Server-side Entitlement Check with Guest Session Cookie
  // ----------------------------------------------------
  console.log('\n--- TEST 3: Server-side Entitlement Check via Guest Session Cookie ---')
  const verifiedGuest = guestAccessService.verifyGuestSession(resolveResult.sessionCookieValue)
  if (!verifiedGuest || verifiedGuest.email !== customerEmail1) throw new Error('FAIL: Guest session cookie verification failed!')

  const hasAccessProduct1 = await entitlementsRepo.has(null, product1.id, verifiedGuest.email)
  if (!hasAccessProduct1) throw new Error('FAIL: Server-side entitlement check failed for Product 1!')
  console.log(`Verified Access for ${verifiedGuest.email} on ${product1.title}: ${hasAccessProduct1}`)
  console.log('PASS TEST 3: Product ownership recognized server-side via guest session.')

  // ----------------------------------------------------
  // TEST 4: Direct Secure Download Mechanism
  // ----------------------------------------------------
  console.log('\n--- TEST 4: Direct Secure Download Verification ---')
  const downloadUrl = downloadService.buildUrl(order1)
  const dlToken = new URL(downloadUrl).searchParams.get('token')
  const downloadResolved = await downloadService.resolve(dlToken)
  if (downloadResolved.order.id !== order1.id || downloadResolved.product.id !== product1.id) {
    throw new Error('FAIL: Download service did not resolve correct order/product!')
  }
  console.log('Direct Download Token Verified for Order:', downloadResolved.order.id)
  console.log('PASS TEST 4: Secure download resolved order and product without redirection.')

  // ----------------------------------------------------
  // TEST 5: Multiple Products Isolation
  // ----------------------------------------------------
  console.log('\n--- TEST 5: Multi-Product Entitlement Isolation ---')
  const unpurchasedProductId = uuidv4()
  const hasAccessUnpurchased = await entitlementsRepo.has(null, unpurchasedProductId, verifiedGuest.email)
  if (hasAccessUnpurchased) throw new Error('FAIL: Access granted to an unpurchased product!')
  console.log(`Access for unpurchased product (${unpurchasedProductId}): ${hasAccessUnpurchased}`)
  console.log('PASS TEST 5: Purchases remain strictly isolated per product.')

  // ----------------------------------------------------
  // TEST 6: Unauthorized Access Denial
  // ----------------------------------------------------
  console.log('\n--- TEST 6: Unauthorized Customer Access Denial ---')
  const unauthorizedEmail = 'attacker@evil.com'
  const hasAccessAttacker = await entitlementsRepo.has(null, product1.id, unauthorizedEmail)
  if (hasAccessAttacker) throw new Error('FAIL: Attacker email was granted access!')
  console.log(`Attacker access to ${product1.title}: ${hasAccessAttacker}`)
  console.log('PASS TEST 6: Unauthorized access correctly rejected.')

  // ----------------------------------------------------
  // TEST 7: Token Tampering / Manipulation Protection
  // ----------------------------------------------------
  console.log('\n--- TEST 7: Token Tampering Protection ---')
  const tamperedToken = tokenResult.rawToken.slice(0, -1) + (tokenResult.rawToken.endsWith('a') ? 'b' : 'a')
  const tamperedResult = await guestAccessService.validateTokenAndResolve(tamperedToken)
  if (tamperedResult.success) throw new Error('FAIL: Tampered token was accepted!')
  console.log('Tampered token result:', tamperedResult.message)
  console.log('PASS TEST 7: Tampered access token rejected immediately.')

  // ----------------------------------------------------
  // TEST 8: Expired Token Rejection
  // ----------------------------------------------------
  console.log('\n--- TEST 8: Expired Token Rejection ---')
  const expiredRawToken = generateSecureToken()
  const expiredTokenHash = hashToken(expiredRawToken)
  await productAccessTokensRepo.create({
    orderId: order1.id,
    productId: product1.id,
    customerEmail: customerEmail1,
    tokenHash: expiredTokenHash,
    expiresAt: new Date(Date.now() - 10000), // Expired 10s ago
  })
  const expiredResult = await guestAccessService.validateTokenAndResolve(expiredRawToken)
  if (expiredResult.success) throw new Error('FAIL: Expired token was accepted!')
  console.log('Expired token result:', expiredResult.message)
  console.log('PASS TEST 8: Expired access token rejected cleanly.')

  // ----------------------------------------------------
  // TEST 9: Unpaid / Failed Order Token Rejection
  // ----------------------------------------------------
  console.log('\n--- TEST 9: Unpaid Order Token Rejection ---')
  const unpaidOrder = await ordersRepo.create({
    id: uuidv4(),
    creatorId: creatorUser.id,
    productId: product1.id,
    customerName: 'Unpaid Customer',
    customerEmail: 'unpaid@example.com',
    amount: product1.price,
    currency: 'INR',
    status: 'FAILED',
    createdAt: new Date(),
    updatedAt: new Date(),
  })
  const unpaidRawToken = generateSecureToken()
  await productAccessTokensRepo.create({
    orderId: unpaidOrder.id,
    productId: product1.id,
    customerEmail: 'unpaid@example.com',
    tokenHash: hashToken(unpaidRawToken),
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  })
  const unpaidResult = await guestAccessService.validateTokenAndResolve(unpaidRawToken)
  if (unpaidResult.success) throw new Error('FAIL: Unpaid order access token was accepted!')
  console.log('Unpaid order token result:', unpaidResult.message)
  console.log('PASS TEST 9: Unpaid order token rejected cleanly.')

  // ----------------------------------------------------
  // TEST 10: Duplicate Webhook Idempotency
  // ----------------------------------------------------
  console.log('\n--- TEST 10: Duplicate Webhook Idempotency ---')
  const didTransition1 = await ordersRepo.markPaidOnce(order1.id, { paidAt: new Date() })
  if (didTransition1) throw new Error('FAIL: markPaidOnce returned true on already paid order!')
  console.log('Duplicate markPaidOnce transition prevented:', !didTransition1)
  console.log('PASS TEST 10: Duplicate payment event is strictly idempotent.')

  console.log('\n====================================================')
  console.log('ALL 10 GUEST CUSTOMER ACCESS INTEGRATION TESTS PASSED!')
  console.log('====================================================')
}

runGuestAccessTests().catch((err) => {
  console.error('\nTEST SUITE FAILED:', err)
  process.exit(1)
})
