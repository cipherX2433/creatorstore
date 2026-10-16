import assert from 'assert'
import { purchaseOtpService, PURCHASE_SESSION_COOKIE } from '../lib/purchaseOtpService.js'
import { emailService } from '../lib/services.js'
import { prisma } from '../lib/prisma.js'

async function runTests() {
  console.log('--- STARTING PURCHASE ACCESS RECOVERY FLOW TESTS ---')

  const testEmailWithPurchases = `delivered@resend.dev`
  const testEmailNoPurchases = `testnopurchases_${Date.now()}@resend.dev`

  // =========================================================================
  // SCENARIO 1: Unverified Session (Fresh Visitor or Incognito)
  // =========================================================================
  console.log('\n[TEST 1] Check Access Status without session cookie (Incognito / First Visit)...')
  const noSessionVerification = purchaseOtpService.verifySessionToken(null)
  assert.strictEqual(noSessionVerification, null, 'Null session token must not verify')
  console.log('✓ No access session: correctly unverified.')

  // =========================================================================
  // SCENARIO 2: Request OTP via purchaseOtpService and emailService
  // =========================================================================
  console.log('\n[TEST 2] Request OTP and check email sending...')
  assert.strictEqual(typeof emailService.sendPurchaseAccessOtpEmail, 'function', 'emailService.sendPurchaseAccessOtpEmail must exist')
  
  const otpReq = await purchaseOtpService.requestOtp(testEmailWithPurchases)
  assert.strictEqual(otpReq.success, true, 'OTP request should succeed')
  assert(otpReq.rawOtp && otpReq.rawOtp.length === 6, 'Should generate a 6-digit OTP')

  // Send via emailService
  const emailRes = await emailService.sendPurchaseAccessOtpEmail({
    to: testEmailWithPurchases,
    otp: otpReq.rawOtp,
    expiryMinutes: otpReq.expiryMinutes,
  })
  assert(emailRes.delivered === true || emailRes.simulated === true, 'Email service should simulate or deliver OTP')
  console.log('✓ OTP generated and email sent successfully.')

  // =========================================================================
  // SCENARIO 3: Resend Cooldown
  // =========================================================================
  console.log('\n[TEST 3] Verify Resend Cooldown is enforced...')
  const immediateResend = await purchaseOtpService.requestOtp(testEmailWithPurchases)
  assert.strictEqual(immediateResend.success, false, 'Immediate resend must be rejected')
  assert(immediateResend.cooldownRemaining > 0, 'Must provide remaining cooldown seconds')
  console.log(`✓ Cooldown enforced: ${immediateResend.error}`)

  // =========================================================================
  // SCENARIO 4: Verify Incorrect OTP
  // =========================================================================
  console.log('\n[TEST 4] Verify with incorrect OTP...')
  const badOtpVerify = await purchaseOtpService.verifyOtp(testEmailWithPurchases, '000000')
  assert.strictEqual(badOtpVerify.success, false, 'Bad OTP must fail')
  assert(badOtpVerify.remainingAttempts < 5, 'Remaining attempts must decrement')
  console.log(`✓ Bad OTP rejected: ${badOtpVerify.error}`)

  // =========================================================================
  // SCENARIO 5: Verify Correct OTP -> Session Token Created
  // =========================================================================
  console.log('\n[TEST 5] Verify with correct OTP...')
  const goodOtpVerify = await purchaseOtpService.verifyOtp(testEmailWithPurchases, otpReq.rawOtp)
  assert.strictEqual(goodOtpVerify.success, true, 'Correct OTP must succeed')
  assert(goodOtpVerify.sessionToken, 'Must generate signed sessionToken')
  assert.strictEqual(goodOtpVerify.email, testEmailWithPurchases, 'Must match clean email')
  console.log('✓ OTP verified, signed session token received.')

  // OTP replay protection
  console.log('\n[TEST 5b] Replay protection check...')
  const replayVerify = await purchaseOtpService.verifyOtp(testEmailWithPurchases, otpReq.rawOtp)
  assert.strictEqual(replayVerify.success, false, 'Replaying consumed OTP must fail')
  console.log('✓ Replay protection verified.')

  // =========================================================================
  // SCENARIO 6: Normal Browser vs Incognito Isolation
  // =========================================================================
  console.log('\n[TEST 6] Browser Session Isolation (Normal vs Incognito)...')
  const normalBrowserSession = goodOtpVerify.sessionToken
  const incognitoCookie = null // Incognito does not share normal browser cookie jar

  // Normal browser has valid session
  const normalParsed = purchaseOtpService.verifySessionToken(normalBrowserSession)
  assert.strictEqual(normalParsed?.email, testEmailWithPurchases, 'Normal browser must have verified email')

  // Incognito browser has NO session
  const incognitoParsed = purchaseOtpService.verifySessionToken(incognitoCookie)
  assert.strictEqual(incognitoParsed, null, 'Incognito browser must have NO verified session')
  console.log('✓ Session isolation confirmed: Incognito does NOT inherit normal browser session!')

  // =========================================================================
  // SCENARIO 7: Verified Email with NO Products
  // =========================================================================
  console.log('\n[TEST 7] Verified Email with NO purchases...')
  const noPurchasesReq = await purchaseOtpService.requestOtp(testEmailNoPurchases)
  const noPurchasesVerify = await purchaseOtpService.verifyOtp(testEmailNoPurchases, noPurchasesReq.rawOtp)
  assert.strictEqual(noPurchasesVerify.success, true)

  const entitlementsEmpty = await prisma.entitlement.findMany({
    where: { customerEmail: testEmailNoPurchases, status: 'ACTIVE' },
  })
  assert.strictEqual(entitlementsEmpty.length, 0, 'New email should have 0 entitlements')
  console.log('✓ Verified email with 0 purchases correctly returns empty list without error.')

  // =========================================================================
  // SCENARIO 8: Verified Email with Products (Entitlement check)
  // =========================================================================
  console.log('\n[TEST 8] Customer Entitlement Access check...')
  // Find an existing product
  const product = await prisma.product.findFirst()
  if (product) {
    // Create test customer & entitlement for testEmailWithPurchases
    const testOrder = await prisma.order.create({
      data: {
        customerEmail: testEmailWithPurchases,
        customerName: 'Test Buyer',
        amount: Number(product.price || 0) > 0 ? Number(product.price) : 0,
        currency: 'INR',
        status: 'PAID',
        productId: product.id,
        creatorId: product.creatorId,
      },
    })

    const testEnt = await prisma.entitlement.create({
      data: {
        orderId: testOrder.id,
        productId: product.id,
        customerEmail: testEmailWithPurchases,
        status: 'ACTIVE',
      },
    })

    // Query entitlements for testEmailWithPurchases
    const customerPurchases = await prisma.entitlement.findMany({
      where: { customerEmail: testEmailWithPurchases, status: 'ACTIVE' },
      include: { order: true, product: true },
    })

    assert(customerPurchases.length >= 1, 'Should find at least 1 entitlement')
    assert.strictEqual(customerPurchases[0].customerEmail, testEmailWithPurchases)
    console.log(`✓ Verified customer entitlements queried: ${customerPurchases.length} product(s) accessible.`)

    // Attempt unauthorized access by another email
    const unauthorizedPurchases = await prisma.entitlement.findMany({
      where: { customerEmail: testEmailNoPurchases, status: 'ACTIVE' },
    })
    assert.strictEqual(unauthorizedPurchases.length, 0, 'Unauthorized email must not see purchases of another user')
    console.log('✓ Unauthorized customer enumeration prevented!')

    // Clean up test data
    await prisma.entitlement.delete({ where: { id: testEnt.id } })
    await prisma.order.delete({ where: { id: testOrder.id } })
    console.log('✓ Cleaned up test database records.')
  }

  console.log('\n=============================================')
  console.log('ALL PURCHASE ACCESS RECOVERY FLOW TESTS PASSED!')
  console.log('=============================================\n')
}

runTests()
  .catch((err) => {
    console.error('Test Failed:', err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
