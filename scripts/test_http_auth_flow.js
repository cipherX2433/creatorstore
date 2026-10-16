import dotenv from 'dotenv'
dotenv.config()

import { prisma } from '../lib/prisma.js'

async function testHttpAuthFlow() {
  const BASE_URL = 'http://localhost:3000/api';
  const timestamp = Date.now();
  const testEmail = `http_user_${timestamp}@example.com`;
  const testPassword = `SecureP@ss123_${timestamp}`;
  const testName = `HTTP Tester ${timestamp}`;

  console.log('====================================================');
  console.log(' HTTP API END-TO-END AUTHENTICATION TEST');
  console.log('====================================================\n');

  // 1. SIGNUP
  console.log('1. Testing POST /api/auth/signup...');
  const signupRes = await fetch(`${BASE_URL}/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: testEmail,
      password: testPassword,
      name: testName,
      storeName: `Store ${timestamp}`,
      role: 'CREATOR'
    }),
  });

  if (!signupRes.ok) {
    const err = await signupRes.json();
    throw new Error(`Signup failed (${signupRes.status}): ${JSON.stringify(err)}`);
  }

  const signupData = await signupRes.json();
  console.log(`   ✅ Signup API HTTP 201: User ID = ${signupData.user?.id}, emailVerified = ${signupData.user?.emailVerified}`);

  // Extract set-cookie (should be NONE)
  const signupCookieHeader = signupRes.headers.get('set-cookie');
  if (signupCookieHeader) {
    throw new Error(`Signup must NOT issue a session cookie! Got: ${signupCookieHeader}`);
  }
  console.log(`   ✅ Verified: No session cookie issued upon signup`);

  // 2. ATTEMPT LOGIN BEFORE VERIFICATION
  console.log('2. Testing POST /api/auth/login BEFORE verification...');
  const earlyLoginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: testEmail,
      password: testPassword,
    }),
  });
  if (earlyLoginRes.status !== 403) {
    throw new Error(`Expected 403 Forbidden for unverified login, got ${earlyLoginRes.status}`);
  }
  const earlyLoginErr = await earlyLoginRes.json();
  console.log(`   ✅ Login rejected before verification: "${earlyLoginErr.error || earlyLoginErr.message}"`);

  // 3. VERIFY EMAIL (simulate entering 6-digit OTP received via email)
  console.log('3. Setting test 6-digit OTP and verifying email...');
  const userInDb = await prisma.user.findUnique({ where: { email: testEmail } });
  
  const { hashToken } = await import('../lib/auth.js');
  const testOtp = '482901';
  const otpHash = hashToken(testOtp);
  await prisma.user.update({
    where: { id: userInDb.id },
    data: {
      verificationTokenHash: otpHash,
      verificationTokenExpires: new Date(Date.now() + 10 * 60 * 1000)
    }
  });

  const verifyRes = await fetch(`${BASE_URL}/auth/verify-email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: testEmail, otp: testOtp }),
  });
  if (!verifyRes.ok) {
    const err = await verifyRes.json();
    throw new Error(`Email verification failed: ${JSON.stringify(err)}`);
  }
  console.log(`   ✅ 6-digit OTP verification succeeded`);

  // 4. LOGIN AFTER VERIFICATION
  console.log('4. Testing POST /api/auth/login AFTER verification...');
  const loginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: testEmail,
      password: testPassword,
    }),
  });
  if (!loginRes.ok) {
    const err = await loginRes.json();
    throw new Error(`Login failed (${loginRes.status}): ${JSON.stringify(err)}`);
  }
  const loginData = await loginRes.json();
  const loginCookieHeader = loginRes.headers.get('set-cookie');
  if (!loginCookieHeader) {
    throw new Error('Login must issue session cookie!');
  }
  console.log(`   ✅ Login succeeded! User ID = ${loginData.user?.id}, Session cookie issued: YES`);

  // 5. ME PROBE (with session cookie)
  console.log('5. Testing GET /api/me with session cookie...');
  const meRes = await fetch(`${BASE_URL}/me`, {
    headers: { Cookie: loginCookieHeader },
  });
  const meData = await meRes.json();
  if (!meData.user || meData.user.id !== loginData.user.id) {
    throw new Error(`GET /api/me failed to return user with valid cookie: ${JSON.stringify(meData)}`);
  }
  console.log(`   ✅ GET /api/me returned authenticated creator: ${meData.user.email}`);

  // 6. LOGOUT
  console.log('6. Testing POST /api/auth/logout...');
  const logoutRes = await fetch(`${BASE_URL}/auth/logout`, {
    method: 'POST',
    headers: { Cookie: loginCookieHeader },
  });
  if (!logoutRes.ok) throw new Error('Logout failed');
  const logoutCookieHeader = logoutRes.headers.get('set-cookie');
  console.log(`   ✅ Logout returned Set-Cookie invalidating session: ${logoutCookieHeader ? 'YES' : 'NO'}`);

  // 7. ME PROBE AFTER LOGOUT
  console.log('7. Testing GET /api/me after logout...');
  const meAfterLogoutRes = await fetch(`${BASE_URL}/me`, {
    headers: { Cookie: logoutCookieHeader || '' },
  });
  const meAfterLogout = await meAfterLogoutRes.json();
  if (meAfterLogout.user !== null) {
    throw new Error('GET /api/me still returned user after logout!');
  }
  console.log(`   ✅ GET /api/me verified unauthenticated (user: null)`);

  // Cleanup test user
  await prisma.store.deleteMany({ where: { creatorId: userInDb.id } });
  await prisma.creatorProfile.deleteMany({ where: { creatorId: userInDb.id } });
  await prisma.creatorSubscription.deleteMany({ where: { creatorId: userInDb.id } });
  await prisma.user.deleteMany({ where: { id: userInDb.id } });
  await prisma.$disconnect();

  console.log('\n====================================================');
  console.log(' ALL HTTP AUTH & VERIFICATION TESTS PASSED! 🎉');
  console.log('====================================================\n');
}

testHttpAuthFlow().catch((e) => {
  console.error('\n❌ HTTP AUTH TEST FAILED:', e);
  process.exit(1);
});
