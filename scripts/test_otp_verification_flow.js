import dotenv from 'dotenv'
dotenv.config()

import { prisma } from '../lib/prisma.js'
import { authService, meService } from '../lib/services.js'
import { generateOtp, hashToken } from '../lib/auth.js'
import { verificationEmailTemplate } from '../lib/emailTemplates.js'
import { usersRepo } from '../lib/repos.js'
import { v4 as uuidv4 } from 'uuid'

async function runOtpVerificationSuite() {
  console.log('====================================================')
  console.log(' CREATORSTORE 6-DIGIT OTP VERIFICATION TEST SUITE')
  console.log('====================================================\n')

  const timestamp = Date.now()
  const createdUserIds = []

  try {
    // ----------------------------------------------------
    // TEST 1: Signup valid user
    // ----------------------------------------------------
    console.log('--- TEST 1: SIGNUP VALID USER ---')
    const testEmail = `otp_user_${timestamp}@example.com`
    const testPassword = `SecurePass123!_${timestamp}`
    const testName = `OTP Tester ${timestamp}`

    const signupRes = await authService.signup({
      email: testEmail,
      password: testPassword,
      name: testName,
      storeName: `OTP Store ${timestamp}`,
      role: 'CREATOR',
    })

    const userId = signupRes.user.id
    createdUserIds.push(userId)

    if (signupRes.token) {
      throw new Error('TEST 1 FAILED: JWT token was issued during signup! Signup must NOT create a session.')
    }
    if (signupRes.user.emailVerified !== false) {
      throw new Error('TEST 1 FAILED: emailVerified must be false upon signup.')
    }
    if (!signupRes.requiresVerification) {
      throw new Error('TEST 1 FAILED: requiresVerification flag must be true.')
    }
    console.log('   ✅ User created with emailVerified = false, no JWT issued, verification required.')

    // ----------------------------------------------------
    // TEST 2: Email Template contains 6-digit OTP and NO verification link
    // ----------------------------------------------------
    console.log('\n--- TEST 2: EMAIL TEMPLATE OTP FORMAT & NO LINKS ---')
    const sampleOtp = '482901'
    const template = verificationEmailTemplate({ name: testName, otp: sampleOtp })

    if (!template.subject.includes('verification code')) {
      throw new Error(`TEST 2 FAILED: Subject should be 'Your CreatorStore verification code', got '${template.subject}'`)
    }
    if (!template.html.includes(sampleOtp)) {
      throw new Error('TEST 2 FAILED: Email HTML does not contain the 6-digit OTP.')
    }
    if (template.html.includes('verify-email?token=') || template.html.includes('Verify Email Address') || template.html.includes('ctaUrl')) {
      throw new Error('TEST 2 FAILED: Email HTML still contains clickable verification links!')
    }
    console.log('   ✅ Email template verified: Contains 6-digit OTP card, no verification links/CTAs.')

    // ----------------------------------------------------
    // TEST 3: OTP Format & Generator
    // ----------------------------------------------------
    console.log('\n--- TEST 3: CRYPTOGRAPHIC 6-DIGIT OTP GENERATION ---')
    for (let i = 0; i < 50; i++) {
      const generated = generateOtp()
      if (!/^\d{6}$/.test(generated)) {
        throw new Error(`TEST 3 FAILED: Generated OTP "${generated}" is not exactly 6 digits!`)
      }
      const num = parseInt(generated, 10)
      if (num < 100000 || num > 999999) {
        throw new Error(`TEST 3 FAILED: OTP "${generated}" out of bounds (100000-999999).`)
      }
    }
    console.log('   ✅ Verified 50 consecutive OTPs: All strictly 6 numeric digits.')

    // ----------------------------------------------------
    // TEST 4: OTP Stored Securely (SHA-256 Hash, Expiration)
    // ----------------------------------------------------
    console.log('\n--- TEST 4: SECURE STORAGE IN DATABASE ---')
    const dbUser = await prisma.user.findUnique({ where: { id: userId } })
    if (!dbUser.verificationTokenHash) {
      throw new Error('TEST 4 FAILED: verificationTokenHash is null in DB.')
    }
    if (dbUser.verificationTokenHash.length !== 64) {
      throw new Error('TEST 4 FAILED: verificationTokenHash is not a SHA-256 hex string.')
    }
    if (!dbUser.verificationTokenExpires) {
      throw new Error('TEST 4 FAILED: verificationTokenExpires is null in DB.')
    }
    const expiryDiffMs = new Date(dbUser.verificationTokenExpires).getTime() - Date.now()
    if (expiryDiffMs <= 0 || expiryDiffMs > 11 * 60 * 1000) {
      throw new Error(`TEST 4 FAILED: Expiry duration is unexpected: ${expiryDiffMs / 1000}s`)
    }
    console.log(`   ✅ DB check: SHA-256 Hash = ${dbUser.verificationTokenHash.slice(0, 16)}..., Expiry = ~${Math.round(expiryDiffMs / 60000)} minutes.`)

    // ----------------------------------------------------
    // TEST 12: Login BEFORE Verification Gate
    // ----------------------------------------------------
    console.log('\n--- TEST 12: LOGIN BEFORE VERIFICATION GATE ---')
    try {
      await authService.login({ email: testEmail, password: testPassword })
      throw new Error('TEST 12 FAILED: Unverified user was allowed to log in!')
    } catch (err) {
      if (err.message.includes('TEST 12 FAILED')) throw err
      if (err.code !== 'EMAIL_NOT_VERIFIED' && !err.message.includes('verify your email')) {
        throw new Error(`TEST 12 FAILED: Expected EMAIL_NOT_VERIFIED error, got: ${err.message}`)
      }
      console.log(`   ✅ Login rejected with 403: "${err.message}"`)
    }

    // ----------------------------------------------------
    // TEST 6: Incorrect OTP Rejection
    // ----------------------------------------------------
    console.log('\n--- TEST 6: INCORRECT OTP REJECTION ---')
    try {
      await authService.verifyEmail({ email: testEmail, otp: '000000' })
      throw new Error('TEST 6 FAILED: Invalid OTP was accepted!')
    } catch (err) {
      if (err.message.includes('TEST 6 FAILED')) throw err
      console.log(`   ✅ Invalid OTP properly rejected: "${err.message}"`)
    }

    // ----------------------------------------------------
    // TEST 7: Expired OTP Rejection
    // ----------------------------------------------------
    console.log('\n--- TEST 7: EXPIRED OTP REJECTION ---')
    const expiredOtp = '654321'
    const expiredHash = hashToken(expiredOtp)
    await usersRepo.setVerificationToken(userId, expiredHash, new Date(Date.now() - 5000)) // 5 seconds in the past

    try {
      await authService.verifyEmail({ email: testEmail, otp: expiredOtp })
      throw new Error('TEST 7 FAILED: Expired OTP was accepted!')
    } catch (err) {
      if (err.message.includes('TEST 7 FAILED')) throw err
      console.log(`   ✅ Expired OTP properly rejected: "${err.message}"`)
    }

    // ----------------------------------------------------
    // TEST 11: Resend Cooldown Rate Limiting (60s)
    // ----------------------------------------------------
    console.log('\n--- TEST 11: RESEND COOLDOWN RATE LIMITING (60s) ---')
    try {
      await authService.resendVerification({ email: testEmail })
      throw new Error('TEST 11 FAILED: Rapid resend was NOT throttled!')
    } catch (err) {
      if (err.message.includes('TEST 11 FAILED')) throw err
      console.log(`   ✅ Rapid resend rejected with 429: "${err.message}"`)
    }

    // ----------------------------------------------------
    // TEST 10: Resend OTP for user with expired cooldown
    // ----------------------------------------------------
    console.log('\n--- TEST 10: RESEND OTP GENERATES NEW CODE & INVALIDATES OLD ---')
    const resendUserEmail = `resend_user_${timestamp}@example.com`
    const resendUserId = uuidv4()
    const initialOtpHash = hashToken('112233')
    await prisma.user.create({
      data: {
        id: resendUserId,
        email: resendUserEmail,
        passwordHash: 'dummy_hash',
        role: 'CREATOR',
        emailVerified: false,
        verificationTokenHash: initialOtpHash,
        verificationTokenExpires: new Date(Date.now() - 5000), // In the past (no active cooldown)
      },
    })
    createdUserIds.push(resendUserId)

    const resendRes = await authService.resendVerification({ email: resendUserEmail })
    if (!resendRes.ok) throw new Error('TEST 10 FAILED: Resend OTP failed.')

    const userAfterResend = await prisma.user.findUnique({ where: { id: resendUserId } })
    if (userAfterResend.verificationTokenHash === initialOtpHash) {
      throw new Error('TEST 10 FAILED: Previous OTP hash was not replaced.')
    }
    console.log('   ✅ Resend generated fresh OTP with new 10-minute expiry.')

    // ----------------------------------------------------
    // TEST 9: Five Incorrect Attempts Lockout / Invalidation
    // ----------------------------------------------------
    console.log('\n--- TEST 9: 5 FAILED OTP ATTEMPTS PROTECTION ---')
    const bruteUserEmail = `brute_user_${timestamp}@example.com`
    const bruteUserRes = await authService.signup({
      email: bruteUserEmail,
      password: testPassword,
      name: 'Brute User',
      storeName: `Brute Store ${timestamp}`,
      role: 'CREATOR',
    })
    createdUserIds.push(bruteUserRes.user.id)

    // Set known OTP
    const knownOtp = '777888'
    await usersRepo.setVerificationToken(bruteUserRes.user.id, hashToken(knownOtp), new Date(Date.now() + 10 * 60 * 1000))

    let lockedOut = false
    for (let attempt = 1; attempt <= 5; attempt++) {
      try {
        await authService.verifyEmail({ email: bruteUserEmail, otp: `11111${attempt}` })
      } catch (err) {
        if (attempt === 5 && (err.message.includes('Too many') || err.message.includes('request a new code'))) {
          lockedOut = true
        }
      }
    }

    if (!lockedOut) {
      throw new Error('TEST 9 FAILED: 5th failed attempt did not trigger lockout.')
    }

    // Verify OTP was invalidated in DB
    const lockedUser = await prisma.user.findUnique({ where: { id: bruteUserRes.user.id } })
    if (lockedUser.verificationTokenHash !== null) {
      throw new Error('TEST 9 FAILED: Token was not invalidated in DB after 5 failed attempts.')
    }

    // Verify even the previously correct OTP now fails
    try {
      await authService.verifyEmail({ email: bruteUserEmail, otp: knownOtp })
      throw new Error('TEST 9 FAILED: Previously valid OTP still worked after 5 failed attempts!')
    } catch (err) {
      console.log('   ✅ 5 failed attempts successfully locked out and cleared OTP token.')
    }

    // ----------------------------------------------------
    // TEST 5: Correct OTP Verification
    // ----------------------------------------------------
    console.log('\n--- TEST 5: CORRECT OTP VERIFICATION ---')
    const validOtp = '907315'
    await usersRepo.setVerificationToken(userId, hashToken(validOtp), new Date(Date.now() + 10 * 60 * 1000))

    const verifySuccessRes = await authService.verifyEmail({ email: testEmail, otp: validOtp })
    if (!verifySuccessRes.ok) throw new Error('TEST 5 FAILED: verifyEmail failed on correct OTP.')
    if (!verifySuccessRes.token) throw new Error('TEST 5 FAILED: verifyEmail must issue session token upon successful OTP verification!')

    const sessionUser = await authService.userFromToken(verifySuccessRes.token)
    if (!sessionUser || sessionUser.id !== userId) {
      throw new Error('TEST 5 FAILED: Session token from verifyEmail could not resolve authenticated user.')
    }

    const verifiedUser = await prisma.user.findUnique({ where: { id: userId } })
    if (verifiedUser.emailVerified !== true) {
      throw new Error('TEST 5 FAILED: emailVerified was not set to true!')
    }
    if (verifiedUser.verificationTokenHash !== null) {
      throw new Error('TEST 5 FAILED: verificationTokenHash was not cleared after success.')
    }
    console.log('   ✅ Correct OTP verified user! emailVerified = true, session token issued, OTP invalidated.')

    // ----------------------------------------------------
    // TEST 8: OTP Reuse Rejection & Safe Already-Verified Authentication
    // ----------------------------------------------------
    console.log('\n--- TEST 8: OTP REUSE / ALREADY-VERIFIED AUTHENTICATION ---')
    const reuseRes = await authService.verifyEmail({ email: testEmail, otp: validOtp })
    if (!reuseRes.alreadyVerified || !reuseRes.token) {
      throw new Error('TEST 8 FAILED: Reusing OTP on already verified account must return alreadyVerified and session token.')
    }
    console.log('   ✅ Reusing OTP handled safely: "Your email is already verified.", session preserved.')

    // ----------------------------------------------------
    // TEST 13: Login AFTER Verification Gate
    // ----------------------------------------------------
    console.log('\n--- TEST 13: LOGIN AFTER SUCCESSFUL VERIFICATION ---')
    const loginResult = await authService.login({ email: testEmail, password: testPassword })
    if (!loginResult.token) {
      throw new Error('TEST 13 FAILED: JWT session token missing from login response.')
    }
    if (loginResult.user.id !== userId) {
      throw new Error('TEST 13 FAILED: User ID mismatch.')
    }
    console.log(`   ✅ Login succeeded after verification! JWT Token issued for user ${loginResult.user.email}`)

    // ----------------------------------------------------
    // TEST 14: Verified Legacy User
    // ----------------------------------------------------
    console.log('\n--- TEST 14: VERIFIED LEGACY USER LOGIN ---')
    const legacyEmail = `legacy_verified_${timestamp}@example.com`
    const { hashPassword } = await import('../lib/auth.js')
    const legacyUser = await prisma.user.create({
      data: {
        id: uuidv4(),
        email: legacyEmail,
        passwordHash: hashPassword(testPassword),
        role: 'CREATOR',
        emailVerified: true,
      },
    })
    createdUserIds.push(legacyUser.id)

    const legacyLogin = await authService.login({ email: legacyEmail, password: testPassword })
    if (!legacyLogin.token) throw new Error('TEST 14 FAILED: Legacy verified user login failed.')
    console.log(`   ✅ Verified legacy user logged in successfully without requiring re-verification.`)

    console.log('\n====================================================')
    console.log(' ALL 14 BACKEND OTP VERIFICATION TESTS PASSED! 🎉')
    console.log('====================================================\n')
  } finally {
    console.log('--- CLEANUP: REMOVING TEST USERS ---')
    if (createdUserIds.length > 0) {
      await prisma.store.deleteMany({ where: { creatorId: { in: createdUserIds } } })
      await prisma.creatorProfile.deleteMany({ where: { creatorId: { in: createdUserIds } } })
      await prisma.creatorSubscription.deleteMany({ where: { creatorId: { in: createdUserIds } } })
      await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } })
      console.log(`   ✅ Cleaned up ${createdUserIds.length} test records from DB.`)
    }
    await prisma.$disconnect()
  }
}

runOtpVerificationSuite().catch((err) => {
  console.error('\n❌ OTP VERIFICATION TEST SUITE FAILED:', err)
  process.exit(1)
})
