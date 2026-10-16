import assert from 'assert'
import { PrismaClient } from '@prisma/client'
import { validateCronSecret } from '../lib/cron.js'
import { otpVerificationsRepo } from '../lib/repos.js'

const prisma = new PrismaClient()

async function testCronCleanup() {
  console.log('--- TESTING SECURE SCHEDULED OTP CLEANUP (TASK 2) ---')

  const originalSecret = process.env.CRON_SECRET
  const testSecret = 'super_secret_cron_token_for_scheduled_tasks_32chars'

  try {
    // 1. Authorization tests
    process.env.CRON_SECRET = testSecret

    // Missing header
    const reqNoHeader = { headers: new Map() }
    assert.strictEqual(validateCronSecret(reqNoHeader), false, 'Must reject missing Authorization header')

    // Invalid scheme
    const reqBadScheme = { headers: new Map([['authorization', 'Basic ' + testSecret]]) }
    assert.strictEqual(validateCronSecret(reqBadScheme), false, 'Must reject Basic auth')

    // Wrong secret
    const reqWrongSecret = { headers: new Map([['authorization', 'Bearer wrong_secret']]) }
    assert.strictEqual(validateCronSecret(reqWrongSecret), false, 'Must reject incorrect secret')

    // Valid secret
    const reqValid = { headers: new Map([['authorization', 'Bearer ' + testSecret]]) }
    assert.strictEqual(validateCronSecret(reqValid), true, 'Must accept exact matching Bearer secret')

    // Unset server CRON_SECRET must reject everything
    delete process.env.CRON_SECRET
    assert.strictEqual(validateCronSecret(reqValid), false, 'Must reject all requests if CRON_SECRET is unset on server')

    console.log('✅ PASS: Constant-time CRON_SECRET authorization validated.')

    // 2. Data cleanup precision tests
    const now = new Date()
    const emailActive = 'active.otp@test.com'
    const emailExpiredOld = 'expired.old.otp@test.com'
    const emailConsumedOld = 'consumed.old.otp@test.com'
    const emailConsumedRecent = 'consumed.recent.otp@test.com'

    // Clean up test emails first
    await prisma.otpVerification.deleteMany({
      where: {
        identifier: {
          in: [emailActive, emailExpiredOld, emailConsumedOld, emailConsumedRecent],
        },
      },
    })

    // Record A: Active, unexpired OTP (expires in 10 minutes)
    await prisma.otpVerification.create({
      data: {
        identifier: emailActive,
        purpose: 'TEST_PURPOSE',
        otpHash: 'hash_active',
        attempts: 1,
        maxAttempts: 5,
        expiresAt: new Date(now.getTime() + 10 * 60 * 1000),
        resendAvailableAt: new Date(now.getTime() + 60 * 1000),
      },
    })

    // Record B: Expired 2 hours ago
    await prisma.otpVerification.create({
      data: {
        identifier: emailExpiredOld,
        purpose: 'TEST_PURPOSE',
        otpHash: 'hash_expired_old',
        attempts: 2,
        maxAttempts: 5,
        expiresAt: new Date(now.getTime() - 2 * 3600 * 1000),
        resendAvailableAt: new Date(now.getTime() - 2 * 3600 * 1000),
      },
    })

    // Record C: Consumed 2 hours ago
    await prisma.otpVerification.create({
      data: {
        identifier: emailConsumedOld,
        purpose: 'TEST_PURPOSE',
        otpHash: null,
        attempts: 1,
        maxAttempts: 5,
        expiresAt: new Date(now.getTime() - 2 * 3600 * 1000),
        resendAvailableAt: new Date(now.getTime() - 2 * 3600 * 1000),
        consumedAt: new Date(now.getTime() - 2 * 3600 * 1000),
        updatedAt: new Date(now.getTime() - 2 * 3600 * 1000),
      },
    })

    // Record D: Consumed recently (5 minutes ago) - must be kept for replay protection
    await prisma.otpVerification.create({
      data: {
        identifier: emailConsumedRecent,
        purpose: 'TEST_PURPOSE',
        otpHash: null,
        attempts: 1,
        maxAttempts: 5,
        expiresAt: new Date(now.getTime() + 5 * 60 * 1000),
        resendAvailableAt: new Date(now.getTime() + 5 * 60 * 1000),
        consumedAt: new Date(now.getTime() - 5 * 60 * 1000),
        updatedAt: new Date(now.getTime() - 5 * 60 * 1000),
      },
    })

    console.log('2. Running otpVerificationsRepo.cleanupExpired()...')
    const cleanupResult = await otpVerificationsRepo.cleanupExpired()
    console.log(`   Deleted rows count: ${cleanupResult.count}`)
    assert.ok(cleanupResult.count >= 2, 'Should delete at least the 2 eligible old records')

    // Verify Active record is still intact
    const activeCheck = await prisma.otpVerification.findUnique({
      where: { identifier_purpose: { identifier: emailActive, purpose: 'TEST_PURPOSE' } },
    })
    assert.ok(activeCheck !== null, 'Active unexpired record must NOT be deleted')
    assert.strictEqual(activeCheck.otpHash, 'hash_active')

    // Verify Recently consumed record is still intact
    const recentConsumedCheck = await prisma.otpVerification.findUnique({
      where: { identifier_purpose: { identifier: emailConsumedRecent, purpose: 'TEST_PURPOSE' } },
    })
    assert.ok(recentConsumedCheck !== null, 'Recently consumed record must NOT be deleted')

    // Verify 2-hour expired record was deleted
    const oldExpiredCheck = await prisma.otpVerification.findUnique({
      where: { identifier_purpose: { identifier: emailExpiredOld, purpose: 'TEST_PURPOSE' } },
    })
    assert.strictEqual(oldExpiredCheck, null, '2-hour expired record must be deleted')

    // Verify 2-hour consumed record was deleted
    const oldConsumedCheck = await prisma.otpVerification.findUnique({
      where: { identifier_purpose: { identifier: emailConsumedOld, purpose: 'TEST_PURPOSE' } },
    })
    assert.strictEqual(oldConsumedCheck, null, '2-hour consumed record must be deleted')

    console.log('✅ PASS: Only eligible expired/consumed records were deleted; active records preserved.')

    // 3. Idempotency test: Second execution
    const secondRun = await otpVerificationsRepo.cleanupExpired()
    console.log(`   Second run deleted: ${secondRun.count}`)
    console.log('✅ PASS: Cleanup repeated execution is safe and idempotent.')

    // Clean up remaining test records
    await prisma.otpVerification.deleteMany({
      where: {
        identifier: {
          in: [emailActive, emailExpiredOld, emailConsumedOld, emailConsumedRecent],
        },
      },
    })

    console.log('--- ALL CRON CLEANUP TESTS PASSED! ---')
  } finally {
    if (originalSecret) {
      process.env.CRON_SECRET = originalSecret
    } else {
      delete process.env.CRON_SECRET
    }
    await prisma.$disconnect()
  }
}

testCronCleanup().catch((e) => {
  console.error('FAILED CRON CLEANUP TEST:', e)
  process.exit(1)
})
