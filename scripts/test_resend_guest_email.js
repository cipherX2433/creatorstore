import { emailService } from '../lib/email.js'
import { guestAccessService } from '../lib/services.js'
import { prisma } from '../lib/prisma.js'
import { v4 as uuidv4 } from 'uuid'
import { ordersRepo, entitlementsRepo } from '../lib/repos.js'

async function testLiveGuestEmail() {
  console.log('Testing live purchase confirmation email dispatch via Resend...')
  
  const creatorUser = await prisma.user.findFirst({
    where: { role: 'CREATOR' },
    include: { store: true, creatorProfile: true }
  })
  
  const product = await prisma.product.findFirst({
    where: { creatorId: creatorUser?.id }
  })
  
  if (!creatorUser || !product) {
    throw new Error('Creator or Product not found in DB')
  }

  const testEmail = 'mohit.mr11082@gmail.com'
  const creatorName = creatorUser.creatorProfile?.name || creatorUser.store?.storeName || 'Creator'
  
  // Create test order & entitlement
  const order = await ordersRepo.create({
    id: uuidv4(),
    creatorId: creatorUser.id,
    productId: product.id,
    customerName: 'Mohit Ranjan',
    customerEmail: testEmail,
    amount: product.price || 499,
    currency: 'INR',
    status: 'PAID',
    paymentMode: 'TEST',
  })

  const ent = await entitlementsRepo.createForOrder({
    id: uuidv4(),
    orderId: order.id,
    productId: product.id,
    customerEmail: testEmail,
    status: 'ACTIVE',
  })

  // Generate real guest access token
  const guestAccess = await guestAccessService.createAccessToken({
    orderId: order.id,
    entitlementId: ent.id,
    productId: product.id,
    customerEmail: testEmail,
    expiresInDays: 30,
  })

  console.log('Access URL generated:', guestAccess.accessUrl)

  // Send live purchase email via Resend
  const sendRes = await emailService.sendPurchaseConfirmation({
    to: testEmail,
    customerName: 'Mohit Ranjan',
    creatorName,
    productTitle: product.title,
    amount: order.amount,
    currency: 'INR',
    orderId: order.id,
    accessUrl: guestAccess.accessUrl,
    purchaseDate: order.createdAt,
  })

  console.log('Live email dispatch result:', sendRes)
  if (!sendRes?.success) {
    throw new Error('Failed to send live email: ' + sendRes?.error)
  }
  console.log('SUCCESS: Live purchase email sent successfully with message ID:', sendRes.messageId)
}

testLiveGuestEmail().catch(console.error)
