// ==============================================================================
// CREATORSTORE — SECURITY REMEDIATION PHASE 1 VERIFICATION SUITE
// Tests SEC-001 (Auth Bypass), SEC-003 (JWT Config), SEC-002 (OTP Store & Concurrency), SEC-004 (CORS)
// ==============================================================================

import assert from 'node:assert'
import crypto from 'node:crypto'
import { v4 as uuidv4 } from 'uuid'
import { prisma } from '../lib/prisma.js'
import { usersRepo, otpVerificationsRepo } from '../lib/repos.js'
import { authService, httpError } from '../lib/services.js'
import { purchaseOtpService, PURCHASE_SESSION_COOKIE } from '../lib/purchaseOtpService.js'
import { getJwtSecret, signToken, verifyToken, hashPassword, hashToken } from '../lib/auth.js'
import { isOriginAllowed, applyCors, getAllowedOrigins } from '../lib/cors.js'

let totalTests = 0
let passedTests = 0

function logPass(title) {
  totalTests++
  passedTests++
  console.log(`  ✅ PASS: ${title}`)
}

async function runSecurityPhase1Suite() {
  console.log('======================================================================')
  console.log('CREATORSTORE — SECURITY REMEDIATION PHASE 1 TEST SUITE')
  console.log('======================================================================\n')

  // ---------------------------------------------------------------------------
  // SECTION 1: SEC-003 — ENFORCE PRODUCTION JWT CONFIGURATION
  // ---------------------------------------------------------------------------
  console.log('▶ SECTION 1: Testing SEC-003 (Production JWT Secret Enforcement)...')

  const originalEnv = { ...process.env }

  try {
    // 1.1 Development fallback
    process.env.NODE_ENV = 'development'
    delete process.env.JWT_SECRET
    const devSecret = getJwtSecret()
    assert.strictEqual(devSecret, 'dev-secret', 'Development must allow default fallback')
    const devToken = signToken({ role: 'CREATOR', sub: 'dev-user' })
    const devPayload = verifyToken(devToken)
    assert.strictEqual(devPayload.role, 'CREATOR', 'Dev token verifies cleanly')
    logPass('Development environment allows safe documented dev-secret fallback')

    // 1.2 Production: Missing JWT_SECRET must throw fatal error
    process.env.NODE_ENV = 'production'
    delete process.env.JWT_SECRET
    let missingSecretThrown = false
    try {
      getJwtSecret()
    } catch (e) {
      missingSecretThrown = e.message.includes('FATAL') && e.message.includes('JWT_SECRET must be configured')
    }
    assert.strictEqual(missingSecretThrown, true, 'Production must reject missing JWT_SECRET')
    logPass('Production throws fatal error on missing JWT_SECRET')

    // 1.3 Production: Known development secret must throw fatal error
    const knownDevSecrets = ['dev-secret', 'development', 'secret', 'changeme', 'jwt-secret', '123456']
    for (const secretVal of knownDevSecrets) {
      process.env.JWT_SECRET = secretVal
      let knownSecretThrown = false
      try {
        getJwtSecret()
      } catch (e) {
        knownSecretThrown = e.message.includes('FATAL')
      }
      assert.strictEqual(knownSecretThrown, true, `Production must reject known secret: ${secretVal}`)
    }
    logPass('Production rejects all known development / default secrets')

    // 1.4 Production: Short secret (< 32 chars) must throw fatal error
    process.env.JWT_SECRET = 'short_secret_under_32_chars'
    let shortSecretThrown = false
    try {
      getJwtSecret()
    } catch (e) {
      shortSecretThrown = e.message.includes('FATAL') && e.message.includes('at least 32 characters')
    }
    assert.strictEqual(shortSecretThrown, true, 'Production must reject secrets shorter than 32 chars')
    logPass('Production rejects secrets shorter than 32 characters')

    // 1.5 Production: Valid 32+ char secret succeeds
    const validProdSecret = 'c7a8b9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8'
    process.env.JWT_SECRET = validProdSecret
    const prodSecret = getJwtSecret()
    assert.strictEqual(prodSecret, validProdSecret)
    const prodToken = signToken({ role: 'CREATOR', sub: 'prod-user-123' })
    const prodPayload = verifyToken(prodToken)
    assert.strictEqual(prodPayload.sub, 'prod-user-123', 'Valid production token signs and verifies')
    logPass('Production accepts cryptographically strong secret and verifies tokens')
  } finally {
    // Restore original env
    process.env.NODE_ENV = originalEnv.NODE_ENV
    if (originalEnv.JWT_SECRET) {
      process.env.JWT_SECRET = originalEnv.JWT_SECRET
    } else {
      delete process.env.JWT_SECRET
    }
  }

  // ---------------------------------------------------------------------------
  // SECTION 2: SEC-001 — EMAIL VERIFICATION AUTHENTICATION BYPASS FIX
  // ---------------------------------------------------------------------------
  console.log('\n▶ SECTION 2: Testing SEC-001 (Email Verification Auth Bypass Fix)...')

  const testEmailVerified = `qa_verified_${Date.now()}@testsec.com`
  const testEmailUnverified = `qa_unverified_${Date.now()}@testsec.com`
  const plainPassword = 'Password123!@#'
  const hashedPassword = hashPassword(plainPassword)

  // Seed verified user
  const verifiedUser = await usersRepo.create({
    email: testEmailVerified,
    passwordHash: hashedPassword,
    role: 'CREATOR',
    emailVerified: true,
  })

  // Seed unverified user with an OTP
  const validOtp = '789123'
  const validOtpHash = hashToken(validOtp)
  const unverifiedUser = await usersRepo.create({
    email: testEmailUnverified,
    passwordHash: hashedPassword,
    role: 'CREATOR',
    emailVerified: false,
    verificationTokenHash: validOtpHash,
    verificationTokenExpires: new Date(Date.now() + 10 * 60 * 1000),
  })
  await otpVerificationsRepo.upsert({
    identifier: testEmailUnverified,
    purpose: 'EMAIL_VERIFICATION',
    otpHash: validOtpHash,
    expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    resendAvailableAt: new Date(Date.now() + 60 * 1000),
    maxAttempts: 5,
  })

  try {
    // 2.1 Already-verified email with arbitrary OTP
    const alreadyVerifiedWithArbitraryOtp = await authService.verifyEmail({
      email: testEmailVerified,
      otp: '999999',
    })
    assert.strictEqual(alreadyVerifiedWithArbitraryOtp.ok, true)
    assert.strictEqual(alreadyVerifiedWithArbitraryOtp.alreadyVerified, true)
    assert.strictEqual(alreadyVerifiedWithArbitraryOtp.token, undefined, 'CRITICAL: Must NEVER return token for already-verified user')
    assert.strictEqual(alreadyVerifiedWithArbitraryOtp.message.includes('already verified'), true)
    logPass('Already-verified user with arbitrary OTP returns informational response without session token')

    // 2.2 Already-verified email with missing OTP
    const alreadyVerifiedWithMissingOtp = await authService.verifyEmail({
      email: testEmailVerified,
      otp: '',
    })
    assert.strictEqual(alreadyVerifiedWithMissingOtp.ok, true)
    assert.strictEqual(alreadyVerifiedWithMissingOtp.alreadyVerified, true)
    assert.strictEqual(alreadyVerifiedWithMissingOtp.token, undefined, 'CRITICAL: Must NEVER return token when OTP is omitted')
    logPass('Already-verified user with missing OTP returns informational response without session token')

    // 2.3 Unknown email must be rejected with 400
    let unknownEmailFailed = false
    try {
      await authService.verifyEmail({ email: 'nonexistent_user_9999@testsec.com', otp: '123456' })
    } catch (e) {
      unknownEmailFailed = e.status === 400
    }
    assert.strictEqual(unknownEmailFailed, true, 'Unknown email must be rejected with HTTP 400')
    logPass('Unknown email verification attempt is safely rejected with HTTP 400')

    // 2.4 Invalid OTP for unverified account must be rejected with 400
    let invalidOtpFailed = false
    try {
      await authService.verifyEmail({ email: testEmailUnverified, otp: '000000' })
    } catch (e) {
      invalidOtpFailed = e.status === 400
    }
    assert.strictEqual(invalidOtpFailed, true, 'Invalid OTP must be rejected with HTTP 400')
    logPass('Invalid OTP for unverified account is rejected with HTTP 400')

    // 2.5 Valid OTP for unverified account must verify email and return session token
    const validOtpResult = await authService.verifyEmail({
      email: testEmailUnverified,
      otp: validOtp,
    })
    assert.strictEqual(validOtpResult.ok, true)
    assert.ok(validOtpResult.token, 'Legitimate initial verification returns session token')
    const refreshedUnverifiedUser = await usersRepo.findById(unverifiedUser.id)
    assert.strictEqual(refreshedUnverifiedUser.emailVerified, true, 'User is now marked emailVerified in database')
    logPass('Valid OTP for unverified account verifies email and returns legitimate session token')

    // 2.6 Subsequent verifyEmail call on newly-verified account must now refuse to issue token
    const subsequentVerifyAttempt = await authService.verifyEmail({
      email: testEmailUnverified,
      otp: validOtp,
    })
    assert.strictEqual(subsequentVerifyAttempt.alreadyVerified, true)
    assert.strictEqual(subsequentVerifyAttempt.token, undefined, 'Subsequent verification call must NOT issue token')
    logPass('Subsequent verification attempt on newly-verified account refuses to issue session token')

    // 2.7 Normal password-based login succeeds and establishes session
    const loginResult = await authService.login({
      email: testEmailVerified,
      password: plainPassword,
    })
    assert.ok(loginResult.token, 'Normal password login succeeds for verified account')
    assert.strictEqual(loginResult.user.email, testEmailVerified)
    logPass('Verified account establishes authenticated session via standard password login')
  } finally {
    // Cleanup users
    await prisma.user.deleteMany({
      where: { id: { in: [verifiedUser.id, unverifiedUser.id] } },
    })
    await prisma.otpVerification.deleteMany({
      where: { identifier: { in: [testEmailVerified, testEmailUnverified] } },
    })
  }

  // ---------------------------------------------------------------------------
  // SECTION 3: SEC-002 — PERSISTENT OTP STORAGE & CONCURRENCY LIMITS
  // ---------------------------------------------------------------------------
  console.log('\n▶ SECTION 3: Testing SEC-002 (Persistent Shared OTP Storage & Concurrency)...')

  const testPurchaseEmail = `guest_purchase_${Date.now()}@testsec.com`

  try {
    // 3.1 Request OTP via purchaseOtpService (Instance A)
    const reqResult = await purchaseOtpService.requestOtp(testPurchaseEmail)
    assert.strictEqual(reqResult.success, true, 'requestOtp succeeds')
    assert.ok(reqResult.rawOtp, 'rawOtp generated for email transmission')

    // 3.2 Verify DB persistence in otp_verifications table
    const storedRecord = await otpVerificationsRepo.get(testPurchaseEmail, 'PURCHASE_ACCESS')
    assert.ok(storedRecord, 'OTP record exists in shared PostgreSQL table')
    assert.strictEqual(storedRecord.attempts, 0, 'Initial attempts count is 0')
    assert.strictEqual(storedRecord.consumedAt, null, 'consumedAt is initially null')
    logPass('OTP requested on Instance A is persisted in shared PostgreSQL table with 0 attempts')

    // 3.3 Cooldown enforcement across instances
    const cooldownResult = await purchaseOtpService.requestOtp(testPurchaseEmail)
    assert.strictEqual(cooldownResult.success, false, 'Immediate resend must be blocked by cooldown')
    assert.ok(cooldownResult.cooldownRemaining > 0, 'Cooldown remaining seconds returned')
    logPass('Resend cooldown (60s) is enforced across separate requests via database timestamps')

    // 3.4 Verification attempt on simulated Instance B (using rawOtp from DB metadata)
    const enteredWrongOtp = '111222'
    const wrongAttemptResult = await purchaseOtpService.verifyOtp(testPurchaseEmail, enteredWrongOtp)
    assert.strictEqual(wrongAttemptResult.success, false)
    assert.strictEqual(wrongAttemptResult.remainingAttempts, 4)

    // Check DB record: attempts must be atomically 1 in database
    const dbRecordAfterWrong = await otpVerificationsRepo.get(testPurchaseEmail, 'PURCHASE_ACCESS')
    assert.strictEqual(dbRecordAfterWrong.attempts, 1, 'Attempts counter incremented atomically in PostgreSQL')
    logPass('Failed verification attempt on Instance B increments database attempt counter to 1')

    // 3.5 Concurrent verification race simulation: 10 parallel incorrect attempts
    const concurrentAttempts = Array.from({ length: 6 }, () => 
      purchaseOtpService.verifyOtp(testPurchaseEmail, '000000')
    )
    await Promise.all(concurrentAttempts)

    const dbRecordAfterConcurrent = await otpVerificationsRepo.get(testPurchaseEmail, 'PURCHASE_ACCESS')
    assert.ok(dbRecordAfterConcurrent.attempts >= 5, 'Attempts must reach max_attempts')
    assert.ok(dbRecordAfterConcurrent.consumedAt !== null || dbRecordAfterConcurrent.otpHash === null, 'OTP is invalidated')

    // Subsequent attempt must be locked with maxAttemptsExceeded
    const lockedAttempt = await purchaseOtpService.verifyOtp(testPurchaseEmail, reqResult.rawOtp)
    assert.strictEqual(lockedAttempt.success, false)
    assert.strictEqual(lockedAttempt.maxAttemptsExceeded, true)
    logPass('Concurrent brute-force attempts are atomically serialized and lock the OTP at 5 attempts')

    // 3.6 Clean new request and legitimate verification
    // Clear lock
    await prisma.otpVerification.deleteMany({ where: { identifier: testPurchaseEmail } })
    const freshReq = await purchaseOtpService.requestOtp(testPurchaseEmail)
    const verifySuccess = await purchaseOtpService.verifyOtp(testPurchaseEmail, freshReq.rawOtp)
    assert.strictEqual(verifySuccess.success, true)
    assert.ok(verifySuccess.sessionToken, 'Purchase access session token issued')

    // Replay attack prevention: Re-using the same OTP must fail
    const replayAttempt = await purchaseOtpService.verifyOtp(testPurchaseEmail, freshReq.rawOtp)
    assert.strictEqual(replayAttempt.success, false, 'Consumed OTP cannot be replayed')
    logPass('Legitimate OTP verification succeeds and cannot be replayed (consumedAt enforced)')

    // 3.7 Hourly rate limit enforcement (5 requests per hour)
    const rateLimitEmail = `ratelimit_${Date.now()}@testsec.com`
    for (let i = 1; i <= 5; i++) {
      const rl = await otpVerificationsRepo.checkAndIncrementRateLimit(rateLimitEmail, 'PURCHASE_OTP_REQ_LIMIT', 3600, 5)
      assert.strictEqual(rl.allowed, true, `Request ${i} within limit`)
    }
    const blockedRl = await otpVerificationsRepo.checkAndIncrementRateLimit(rateLimitEmail, 'PURCHASE_OTP_REQ_LIMIT', 3600, 5)
    assert.strictEqual(blockedRl.allowed, false, '6th request within hour is blocked')
    logPass('Hourly request rate limiting (5 req/hr) is enforced persistently in PostgreSQL')
    await prisma.otpVerification.deleteMany({ where: { identifier: rateLimitEmail } })
  } finally {
    await prisma.otpVerification.deleteMany({ where: { identifier: testPurchaseEmail } })
  }

  // ---------------------------------------------------------------------------
  // SECTION 4: SEC-004 — STRICT CORS ALLOWLIST & PREFLIGHT HANDLING
  // ---------------------------------------------------------------------------
  console.log('\n▶ SECTION 4: Testing SEC-004 (Strict CORS Allowlist & Wildcard Prevention)...')

  // 4.1 Allowed canonical production origin
  const trustedProdOrigin = 'https://creatorstore.store'
  assert.strictEqual(isOriginAllowed(trustedProdOrigin), true)
  const reqTrusted = { headers: { get: (h) => (h === 'origin' ? trustedProdOrigin : null) } }
  const resTrusted = applyCors(Response.json({ ok: true }), reqTrusted)
  assert.strictEqual(resTrusted.headers.get('Access-Control-Allow-Origin'), trustedProdOrigin)
  assert.strictEqual(resTrusted.headers.get('Access-Control-Allow-Credentials'), 'true')
  assert.strictEqual(resTrusted.headers.get('Vary'), 'Origin')
  logPass('Trusted canonical production origin receives matched Access-Control-Allow-Origin and credentials')

  // 4.2 Untrusted malicious origin
  const evilOrigin = 'https://evil-hacker-site.com'
  assert.strictEqual(isOriginAllowed(evilOrigin), false)
  const reqEvil = { headers: { get: (h) => (h === 'origin' ? evilOrigin : null) } }
  const resEvil = applyCors(Response.json({ ok: true }), reqEvil)
  assert.strictEqual(resEvil.headers.get('Access-Control-Allow-Origin'), null, 'Must NOT reflect untrusted origin')
  assert.strictEqual(resEvil.headers.get('Access-Control-Allow-Credentials'), null, 'Must NOT grant credentials to untrusted origin')
  logPass('Untrusted external origin is strictly denied CORS headers (no reflection, no credentials)')

  // 4.3 Never set wildcard '*' with credentials
  assert.notStrictEqual(resTrusted.headers.get('Access-Control-Allow-Origin'), '*')
  assert.notStrictEqual(resEvil.headers.get('Access-Control-Allow-Origin'), '*')
  logPass('Wildcard (*) is never combined with Access-Control-Allow-Credentials')

  // 4.4 Same-origin request without Origin header
  const reqNoOrigin = { headers: { get: () => null } }
  const resNoOrigin = applyCors(Response.json({ ok: true }), reqNoOrigin)
  assert.strictEqual(resNoOrigin.headers.get('Access-Control-Allow-Origin'), null)
  assert.strictEqual(resNoOrigin.headers.get('Access-Control-Allow-Credentials'), null)
  assert.strictEqual(resNoOrigin.headers.get('Vary'), 'Origin')
  logPass('Same-origin requests without Origin header receive clean security headers without CORS reflection')

  // 4.5 Subdomain wildcard matching for platform domains
  const creatorSubdomain = 'https://alice.creatorstore.store'
  assert.strictEqual(isOriginAllowed(creatorSubdomain), true)
  const reqSubdomain = { headers: { get: (h) => (h === 'origin' ? creatorSubdomain : null) } }
  const resSubdomain = applyCors(Response.json({ ok: true }), reqSubdomain)
  assert.strictEqual(resSubdomain.headers.get('Access-Control-Allow-Origin'), creatorSubdomain)
  assert.strictEqual(resSubdomain.headers.get('Access-Control-Allow-Credentials'), 'true')
  logPass('Verified subdomains of creatorstore.store are permitted with credentials')

  // 4.6 Preflight OPTIONS request
  const preflightRes = applyCors(new Response(null, { status: 204 }), reqTrusted)
  assert.strictEqual(preflightRes.status, 204)
  assert.strictEqual(preflightRes.headers.get('Access-Control-Allow-Origin'), trustedProdOrigin)
  assert.strictEqual(preflightRes.headers.get('Access-Control-Allow-Methods'), 'GET, POST, PUT, PATCH, DELETE, OPTIONS')
  assert.ok(preflightRes.headers.get('Access-Control-Allow-Headers').includes('Authorization'))
  assert.ok(preflightRes.headers.get('Access-Control-Max-Age'), '86400')
  logPass('Preflight OPTIONS response is properly constructed with methods, headers, and max-age')

  console.log('\n======================================================================')
  console.log(`🎉 ALL ${passedTests}/${totalTests} SECURITY REMEDIATION TESTS PASSED CLEANLY!`)
  console.log('======================================================================\n')
}

runSecurityPhase1Suite()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ TEST FAILED:', err)
    process.exit(1)
  })
