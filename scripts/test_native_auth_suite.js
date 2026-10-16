import { prisma } from '../lib/prisma.js';
import { authService, meService } from '../lib/services.js';
import { verifyPassword, hashToken, generateOtp, generateSecureToken } from '../lib/auth.js';
import { usersRepo } from '../lib/repos.js';
import { v4 as uuidv4 } from 'uuid';

async function runAuthTests() {
  console.log('====================================================');
  console.log(' NATIVE BCRYPT AUTHENTICATION INTEGRATION SUITE');
  console.log('====================================================\n');

  const timestamp = Date.now();
  const createdUserIds = [];

  try {
    // ----------------------------------------------------
    // TEST 1: NEW SIGNUP & BCRYPT HASH VERIFICATION
    // ----------------------------------------------------
    console.log('--- TEST 1: NEW CREATOR SIGNUP (NATIVE BCRYPT) ---');
    const creatorEmail = `bcrypt_creator_${timestamp}@example.com`;
    const creatorPassword = `StrongPass123!_${timestamp}`;
    const creatorName = `Bcrypt Creator ${timestamp}`;

    const signupResult = await authService.signup({
      email: creatorEmail,
      password: creatorPassword,
      name: creatorName,
      storeName: `Bcrypt Store ${timestamp}`,
      role: 'CREATOR',
    });

    const creatorId = signupResult.user.id;
    createdUserIds.push(creatorId);

    console.log(`   ✅ Signup API completed. User ID: ${creatorId}`);
    if (signupResult.user.passwordHash || signupResult.user.password) {
      throw new Error('SECURITY VIOLATION: Password or passwordHash exposed in signup response!');
    }
    if (signupResult.token) {
      throw new Error('SECURITY VIOLATION: Signup must NOT return JWT token before verification!');
    }
    if (signupResult.user.emailVerified !== false) {
      throw new Error('Signup user emailVerified must be false');
    }

    // Verify creator email with 6-digit OTP before login
    const testOtp = generateOtp();
    await usersRepo.setVerificationToken(creatorId, hashToken(testOtp), new Date(Date.now() + 10 * 60 * 1000));
    await authService.verifyEmail({ email: creatorEmail, otp: testOtp });
    console.log(`   ✅ Verified email with 6-digit OTP for login tests`);

    // Inspect database record directly via Prisma
    const dbCreator = await prisma.user.findUnique({
      where: { id: creatorId },
      include: { creatorProfile: true, store: true }
    });

    if (!dbCreator) throw new Error('User record missing in DB');
    if (!dbCreator.passwordHash) throw new Error('passwordHash is null/empty in DB');
    if (dbCreator.passwordHash === '[SUPABASE_AUTH]') {
      throw new Error('CRITICAL BUG: passwordHash was stored as "[SUPABASE_AUTH]" literal!');
    }
    if (!dbCreator.passwordHash.startsWith('$2a$') && !dbCreator.passwordHash.startsWith('$2b$')) {
      throw new Error(`passwordHash is not a valid bcrypt hash: ${dbCreator.passwordHash}`);
    }
    console.log(`   ✅ Real bcrypt hash verified in DB: ${dbCreator.passwordHash.slice(0, 20)}...`);
    console.log(`   ✅ Associated Profile & Store verified (Store: ${dbCreator.store?.username})`);

    // ----------------------------------------------------
    // TEST 2: SIGNUP DUPLICATE EMAIL REJECTION
    // ----------------------------------------------------
    console.log('\n--- TEST 2: DUPLICATE EMAIL REJECTION ---');
    try {
      await authService.signup({
        email: creatorEmail.toUpperCase(), // Case insensitive test
        password: 'AnotherPassword123!',
        name: 'Duplicate User',
      });
      throw new Error('Duplicate signup was NOT rejected!');
    } catch (err) {
      if (err.message.includes('NOT rejected')) throw err;
      console.log(`   ✅ Duplicate email properly rejected with error: ${err.message}`);
    }

    // ----------------------------------------------------
    // TEST 3: INVALID/WEAK PASSWORD REJECTION
    // ----------------------------------------------------
    console.log('\n--- TEST 3: INVALID PASSWORD REJECTION ---');
    try {
      await authService.signup({
        email: `short_pwd_${timestamp}@example.com`,
        password: '123',
        name: 'Short Pwd User',
      });
      throw new Error('Short password was NOT rejected!');
    } catch (err) {
      if (err.message.includes('NOT rejected')) throw err;
      console.log(`   ✅ Short password properly rejected with error: ${err.message}`);
    }

    // ----------------------------------------------------
    // TEST 4: LOGIN WITH VALID CREDENTIALS
    // ----------------------------------------------------
    console.log('\n--- TEST 4: LOGIN WITH CORRECT PASSWORD & EMAIL NORMALIZATION ---');
    const loginResult = await authService.login({
      email: creatorEmail.toUpperCase(), // Test case normalization
      password: creatorPassword,
    });

    if (loginResult.user.id !== creatorId) throw new Error('Login returned wrong user ID');
    if (loginResult.user.passwordHash || loginResult.user.password) {
      throw new Error('SECURITY VIOLATION: Password hash exposed in login response!');
    }
    if (!loginResult.token) throw new Error('Login token missing');
    console.log(`   ✅ Login successful! Token issued for user ${loginResult.user.email}`);

    // ----------------------------------------------------
    // TEST 5: LOGIN WITH INCORRECT PASSWORD
    // ----------------------------------------------------
    console.log('\n--- TEST 5: LOGIN WITH INCORRECT PASSWORD ---');
    try {
      await authService.login({
        email: creatorEmail,
        password: 'WrongPassword456!',
      });
      throw new Error('Invalid password login was NOT rejected!');
    } catch (err) {
      if (err.message.includes('NOT rejected')) throw err;
      console.log(`   ✅ Incorrect password properly rejected: ${err.message}`);
    }

    // ----------------------------------------------------
    // TEST 6: USER FROM TOKEN & ME SERVICE
    // ----------------------------------------------------
    console.log('\n--- TEST 6: SESSION VERIFICATION & ME SERVICE ---');
    const sessionUser = await authService.userFromToken(loginResult.token);
    if (!sessionUser || sessionUser.id !== creatorId) {
      throw new Error('userFromToken failed to validate valid JWT');
    }
    console.log(`   ✅ userFromToken successfully resolved user ${sessionUser.id}`);

    const meData = await meService.getMe(creatorId);
    if (!meData.profile || !meData.store) {
      throw new Error('meService.getMe failed to retrieve profile/store');
    }
    console.log(`   ✅ meService verified profile for ${meData.profile.name}`);

    // ----------------------------------------------------
    // TEST 7: PASSWORD RESET FLOW
    // ----------------------------------------------------
    console.log('\n--- TEST 7: PASSWORD RESET FLOW (NATIVE BCRYPT) ---');
    // Step 1: Request reset
    const forgotResult = await authService.forgotPassword({ email: creatorEmail });
    if (!forgotResult.ok) throw new Error('forgotPassword failed');
    console.log(`   ✅ Forgot password initiated: ${forgotResult.message}`);

    // Step 2: Query DB for reset token
    const userWithReset = await prisma.user.findUnique({ where: { id: creatorId } });
    if (!userWithReset.resetTokenHash) throw new Error('Reset token hash not set on user');
    console.log(`   ✅ Reset token hash recorded in DB: ${userWithReset.resetTokenHash.slice(0, 16)}...`);

    // Step 3: Test reset with direct token simulation
    // We can generate a known token to test resetPassword
    const testRawToken = generateSecureToken();
    const testTokenHash = hashToken(testRawToken);
    const expiresAt = new Date(Date.now() + 3600 * 1000);

    await usersRepo.setResetToken(creatorId, testTokenHash, expiresAt);

    const newPassword = `BrandNewPass456!_${timestamp}`;
    const resetResult = await authService.resetPassword({
      token: testRawToken,
      newPassword: newPassword,
    });
    if (!resetResult.ok) throw new Error('resetPassword returned non-ok');
    console.log(`   ✅ resetPassword successfully executed`);

    // Verify token was cleared
    const userAfterReset = await prisma.user.findUnique({ where: { id: creatorId } });
    if (userAfterReset.resetTokenHash) throw new Error('Reset token hash was NOT cleared after reset');
    console.log(`   ✅ Reset token hash cleared from DB`);

    // Verify old password fails
    try {
      await authService.login({ email: creatorEmail, password: creatorPassword });
      throw new Error('Old password still worked after reset!');
    } catch (err) {
      if (err.message.includes('still worked')) throw err;
      console.log(`   ✅ Old password properly rejected`);
    }

    // Verify new password succeeds
    const newLoginResult = await authService.login({ email: creatorEmail, password: newPassword });
    if (newLoginResult.user.id !== creatorId) throw new Error('Login with new password failed');
    console.log(`   ✅ Login with newly reset bcrypt password successful!`);

    // ----------------------------------------------------
    // TEST 8: EMAIL VERIFICATION FLOW (6-DIGIT OTP)
    // ----------------------------------------------------
    console.log('\n--- TEST 8: EMAIL VERIFICATION FLOW (6-DIGIT OTP) ---');
    const freshOtp = generateOtp();
    const freshOtpHash = hashToken(freshOtp);
    const verifyExpires = new Date(Date.now() + 10 * 60 * 1000);

    // Mark user unverified first
    await prisma.user.update({ where: { id: creatorId }, data: { emailVerified: false } });

    await usersRepo.setVerificationToken(creatorId, freshOtpHash, verifyExpires);
    const verifyResult = await authService.verifyEmail({ email: creatorEmail, otp: freshOtp });
    if (!verifyResult.ok) throw new Error('verifyEmail failed');

    const userAfterVerify = await prisma.user.findUnique({ where: { id: creatorId } });
    if (!userAfterVerify.emailVerified) throw new Error('emailVerified was not updated to true');
    console.log(`   ✅ Email verified successfully with 6-digit OTP in DB`);

    // ----------------------------------------------------
    // TEST 9: LEGACY [SUPABASE_AUTH] ACCOUNT HANDLING
    // ----------------------------------------------------
    console.log('\n--- TEST 9: LEGACY [SUPABASE_AUTH] ACCOUNT HANDLING ---');
    const legacyEmail = `legacy_user_${timestamp}@example.com`;
    const legacyUser = await prisma.user.create({
      data: {
        id: uuidv4(),
        email: legacyEmail,
        passwordHash: '[SUPABASE_AUTH]',
        role: 'CREATOR',
        emailVerified: true,
      }
    });
    createdUserIds.push(legacyUser.id);

    try {
      await authService.login({
        email: legacyEmail,
        password: 'AnyPassword123!',
      });
      throw new Error('Legacy [SUPABASE_AUTH] user login was NOT intercepted!');
    } catch (err) {
      if (err.message.includes('NOT intercepted')) throw err;
      console.log(`   ✅ Legacy user intercepted with safe prompt: "${err.message}"`);
    }

    console.log('\n====================================================');
    console.log(' ALL 9 NATIVE BCRYPT AUTH SUITE TESTS PASSED! 🎉');
    console.log('====================================================\n');

  } finally {
    // Clean up created test users
    console.log('--- CLEANUP: REMOVING TEST USERS ---');
    if (createdUserIds.length > 0) {
      await prisma.store.deleteMany({ where: { creatorId: { in: createdUserIds } } });
      await prisma.creatorProfile.deleteMany({ where: { creatorId: { in: createdUserIds } } });
      await prisma.creatorSubscription.deleteMany({ where: { creatorId: { in: createdUserIds } } });
      await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
      console.log(`   ✅ Cleaned up ${createdUserIds.length} test records from DB.`);
    }
  }
}

runAuthTests()
  .catch((err) => {
    console.error('\n❌ AUTH TEST SUITE FAILED:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
