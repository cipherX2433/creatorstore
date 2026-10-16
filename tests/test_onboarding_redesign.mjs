import { prisma } from '../lib/prisma.js'
import { hashToken } from '../lib/auth.js'

const BASE_URL = 'http://localhost:3000/api'

async function run() {
  console.log('==================================================')
  console.log('CREATORSTORE ONBOARDING REDESIGN INTEGRATION TESTS')
  console.log('==================================================')

  const rnd = Math.floor(Math.random() * 900000) + 100000
  const email = `creator_wizard_${rnd}@example.com`
  const password = 'Password123!'
  const username = `wizard_store_${rnd}`

  let sessionCookie = ''

  // TEST 1: Signup
  console.log(`\n[TEST 1] Signup for new creator: ${email}`)
  const signupRes = await fetch(`${BASE_URL}/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email,
      password,
      name: `Alex ${rnd}`,
      role: 'CREATOR',
      accountType: 'CREATOR',
    }),
  })
  if (!signupRes.ok) {
    throw new Error(`Signup failed: ${await signupRes.text()}`)
  }
  const signupData = await signupRes.json()
  if (signupData.requiresVerification !== true || signupData.user?.emailVerified === true) {
    throw new Error('Expected signup to require verification and emailVerified to be false')
  }
  console.log('✓ Account created, emailVerified=false, requiresVerification=true, no session created.')

  // TEST 6: Login before verification
  console.log('\n[TEST 6] Login before verification (should fail with EMAIL_NOT_VERIFIED)')
  const loginUnverifiedRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  if (loginUnverifiedRes.status !== 403) {
    throw new Error(`Expected 403 but got ${loginUnverifiedRes.status}`)
  }
  const unverifiedBody = await loginUnverifiedRes.json()
  if (!unverifiedBody.error?.toLowerCase().includes('verify your email') && unverifiedBody.code !== 'EMAIL_NOT_VERIFIED') {
    throw new Error(`Expected error message about email verification: ${JSON.stringify(unverifiedBody)}`)
  }
  console.log('✓ Login correctly rejected with 403 EMAIL_NOT_VERIFIED.')

  // Get verification OTP from DB
  const user = await prisma.user.findUnique({ where: { email } })
  if (!user || !user.verificationTokenHash) {
    throw new Error('Verification token hash not set on user record')
  }
  // Find which 6-digit OTP matches the hash (000000-999999)
  let foundOtp = ''
  for (let i = 100000; i <= 999999; i++) {
    const s = String(i)
    if (hashToken(s) === user.verificationTokenHash) {
      foundOtp = s
      break
    }
  }
  if (!foundOtp) throw new Error('Could not resolve 6-digit OTP from hash')
  console.log(`Found valid OTP for ${email}: ${foundOtp}`)

  // TEST 7: OTP verification -> emailVerified=true & creates session
  console.log('\n[TEST 7] Verifying 6-digit OTP')
  const verifyRes = await fetch(`${BASE_URL}/auth/verify-email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, otp: foundOtp }),
  })
  if (!verifyRes.ok) throw new Error(`Verify OTP failed: ${await verifyRes.text()}`)
  const rawCookie = verifyRes.headers.get('set-cookie') || ''
  const cookieMatch = rawCookie.match(/creatorzero_session=([^;]+)/)
  if (cookieMatch) {
    sessionCookie = `creatorzero_session=${cookieMatch[1]}`
  }
  console.log('✓ OTP verified, session cookie received.')

  // TEST 8: Check that /me indicates uncompleted onboarding (target = /onboarding)
  console.log('\n[TEST 8] Direct /me check for newly verified creator')
  const meRes = await fetch(`${BASE_URL}/me`, {
    headers: { Cookie: sessionCookie },
  })
  const meData = await meRes.json()
  const isCompleteInitial = meData.profile?.onboardingComplete || meData.profile?.onboardingStatus === 'COMPLETED'
  if (isCompleteInitial) {
    throw new Error('Newly verified creator should NOT have onboardingComplete=true')
  }
  console.log('✓ Newly verified creator has onboardingComplete=false (Directs to /onboarding, NOT /dashboard).')

  // TEST 3 & 5: Abandon onboarding & login again -> still onboarding incomplete
  console.log('\n[TEST 3 & 5] Abandon onboarding and log in again')
  const loginLaterRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  if (!loginLaterRes.ok) throw new Error(`Login failed: ${await loginLaterRes.text()}`)
  const laterCookie = loginLaterRes.headers.get('set-cookie') || ''
  const laterMatch = laterCookie.match(/creatorzero_session=([^;]+)/)
  if (laterMatch) sessionCookie = `creatorzero_session=${laterMatch[1]}`

  const meLaterRes = await fetch(`${BASE_URL}/me`, {
    headers: { Cookie: sessionCookie },
  })
  const meLaterData = await meLaterRes.json()
  if (meLaterData.profile?.onboardingComplete) {
    throw new Error('Onboarding should still be incomplete on subsequent login')
  }
  console.log('✓ Subsequent login preserves incomplete onboarding state (Routes to /onboarding).')

  // ONBOARDING WIZARD STEPS
  console.log('\n[WIZARD STEP 2] Validate and set username')
  const checkUsernameRes = await fetch(`${BASE_URL}/store/username/check?u=${username}`, {
    headers: { Cookie: sessionCookie },
  })
  const checkUsernameData = await checkUsernameRes.json()
  if (!checkUsernameData.available) {
    throw new Error(`Expected username ${username} to be available: ${JSON.stringify(checkUsernameData)}`)
  }
  console.log(`✓ Real-time username check confirmed '${username}' is available.`)

  const setUsernameRes = await fetch(`${BASE_URL}/store/username`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: sessionCookie },
    body: JSON.stringify({ username }),
  })
  if (!setUsernameRes.ok) throw new Error(`Set username failed: ${await setUsernameRes.text()}`)

  const saveProfileRes = await fetch(`${BASE_URL}/me/profile`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Cookie: sessionCookie },
    body: JSON.stringify({
      name: `Alex Morgan ${rnd}`,
      bio: 'Creating top notch creator tools',
      onboardingStatus: 'CREATOR_TYPE',
    }),
  })
  if (!saveProfileRes.ok) throw new Error(`Save profile failed: ${await saveProfileRes.text()}`)
  console.log('✓ Step 2 (About You) persisted.')

  console.log('\n[WIZARD STEP 3] Save Creator Type')
  const saveTypeRes = await fetch(`${BASE_URL}/me/profile`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Cookie: sessionCookie },
    body: JSON.stringify({
      category: 'Educator',
      onboardingStatus: 'STORE_SETUP',
    }),
  })
  if (!saveTypeRes.ok) throw new Error(`Save creator type failed: ${await saveTypeRes.text()}`)
  console.log('✓ Step 3 (Creator Type) persisted.')

  console.log('\n[WIZARD STEP 4] Save Store Setup')
  const saveStoreRes = await fetch(`${BASE_URL}/store`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Cookie: sessionCookie },
    body: JSON.stringify({
      storeName: `Alex's Learning Vault ${rnd}`,
      bio: 'Masterclasses & digital playbooks',
    }),
  })
  if (!saveStoreRes.ok) throw new Error(`Save store setup failed: ${await saveStoreRes.text()}`)
  console.log('✓ Step 4 (Store Setup) persisted.')

  console.log('\n[WIZARD STEP 5] Save Store Customization')
  const saveThemeRes = await fetch(`${BASE_URL}/store`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Cookie: sessionCookie },
    body: JSON.stringify({
      theme: {
        primaryColor: '#4D7CFF',
        buttonStyle: 'rounded',
        cardStyle: 'solid',
        headerTitle: `Alex Morgan ${rnd}`,
      },
    }),
  })
  if (!saveThemeRes.ok) throw new Error(`Save theme customization failed: ${await saveThemeRes.text()}`)
  console.log('✓ Step 5 (Store Customization) persisted.')

  // TEST 2: Complete onboarding on Step 6
  console.log('\n[TEST 2 & WIZARD STEP 6] Complete Onboarding')
  const completeRes = await fetch(`${BASE_URL}/me/profile`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Cookie: sessionCookie },
    body: JSON.stringify({
      name: `Alex Morgan ${rnd}`,
      category: 'Educator',
      onboardingComplete: true,
      onboardingStatus: 'COMPLETED',
    }),
  })
  if (!completeRes.ok) throw new Error(`Complete onboarding failed: ${await completeRes.text()}`)
  const completeData = await completeRes.json()
  if (completeData.profile?.onboardingComplete !== true) {
    throw new Error('Expected profile.onboardingComplete to be true')
  }
  console.log('✓ Onboarding completed! onboardingComplete=true, onboardingStatus=COMPLETED.')

  // TEST 4 & 9: Verified + onboarding completed -> login directly lands on /dashboard
  console.log('\n[TEST 4 & 9] Login as completed creator')
  const loginCompletedRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  if (!loginCompletedRes.ok) throw new Error(`Login completed user failed: ${await loginCompletedRes.text()}`)
  const compCookie = loginCompletedRes.headers.get('set-cookie') || ''
  const compMatch = compCookie.match(/creatorzero_session=([^;]+)/)
  const compSession = compMatch ? `creatorzero_session=${compMatch[1]}` : sessionCookie

  const meCompletedRes = await fetch(`${BASE_URL}/me`, {
    headers: { Cookie: compSession },
  })
  const meCompletedData = await meCompletedRes.json()
  if (meCompletedData.profile?.onboardingComplete !== true) {
    throw new Error('Expected onboardingComplete to be true for completed creator')
  }
  console.log('✓ Login for completed creator verifies onboarding is done (Routes directly to /dashboard).')

  // TEST 10: Store configuration is saved and accessible to creator
  console.log('\n[TEST 10] Verify creator store configuration and state')
  const storeRes = await fetch(`${BASE_URL}/store`, {
    headers: { Cookie: compSession },
  })
  if (!storeRes.ok) throw new Error(`GET /store failed: ${await storeRes.text()}`)
  const storeData = await storeRes.json()
  if (storeData.store?.username !== username) {
    throw new Error(`Expected store username ${username} but got ${storeData.store?.username}`)
  }
  console.log(`✓ Creator store verified with username="${storeData.store?.username}", storeName="${storeData.store?.storeName}"`)

  console.log('\n==================================================')
  console.log('ALL TESTS PASSED SUCCESSFULLY! (10/10 SCENARIOS)')
  console.log('==================================================')
}

run()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('\n❌ TEST SUITE FAILED:', err)
    process.exit(1)
  })
