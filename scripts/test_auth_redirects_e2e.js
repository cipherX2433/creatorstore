import assert from 'node:assert/strict'
import {
  getSafeRedirect,
  getRequestedReturnUrl,
  getPostAuthDestination,
} from '../lib/redirectUtils.js'

const BASE_URL = 'http://localhost:3000/api'

async function runE2ETests() {
  console.log('🚀 Running Comprehensive Auth & Redirect E2E Integration Suite...\n')

  // 1. Invalid Login Attempt
  console.log('1. Testing Invalid Login...')
  const invalidRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'redirect_test_user@creatorzero.com',
      password: 'WrongPassword123!',
    }),
  })
  assert.equal(invalidRes.status, 401, 'Invalid login should return status 401')
  const invalidJson = await invalidRes.json()
  assert.match(invalidJson.message || invalidJson.error, /invalid/i)
  console.log('✓ Invalid login correctly returned 401 with error message')

  // 2. Successful Login Attempt
  console.log('\n2. Testing Successful Login...')
  const loginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'redirect_test_user@creatorzero.com',
      password: 'Password123!',
    }),
  })
  assert.equal(loginRes.status, 200, 'Successful login should return status 200')
  const cookieHeader = loginRes.headers.get('set-cookie')
  assert.ok(cookieHeader && cookieHeader.includes('creatorzero_session'), 'Session cookie should be set')
  console.log('✓ Login succeeded and issued session cookie')

  // Extract session cookie for authenticated requests
  const sessionCookie = cookieHeader.split(';')[0]

  // 3. Authenticated Context & Profile Verification (/api/me)
  console.log('\n3. Verifying Authenticated Context & Store Profile (/api/me)...')
  const meRes = await fetch(`${BASE_URL}/me`, {
    headers: { Cookie: sessionCookie },
  })
  assert.equal(meRes.status, 200, '/me should return 200 for authenticated user')
  const meData = await meRes.json()
  assert.equal(meData.user.email, 'redirect_test_user@creatorzero.com')
  assert.equal(meData.user.role, 'CREATOR')
  assert.equal(meData.profile.onboardingComplete, true)
  assert.equal(meData.profile.onboardingStatus, 'COMPLETED')
  assert.ok(meData.store, 'Store object must be present')
  assert.equal(meData.store.username, 'redirecttest')
  console.log('✓ Authenticated context returned complete creator profile & store data')

  // 4. Verification of Default Redirect Destination
  console.log('\n4. Verifying Default Redirect Destination...')
  const defaultDestination = getPostAuthDestination({
    user: meData.user,
    profile: meData.profile,
  })
  assert.equal(defaultDestination, '/dashboard/store', 'Default destination must be /dashboard/store')
  console.log('✓ Default destination is /dashboard/store (NOT /dashboard)')

  // 5. Verification of Explicit Valid Return Destination
  console.log('\n5. Verifying Explicit Internal Return Destination (?redirect=/dashboard/products)...')
  const explicitParams = new URLSearchParams('redirect=%2Fdashboard%2Fproducts')
  const requestedUrl = getRequestedReturnUrl(explicitParams)
  const explicitDestination = getPostAuthDestination({
    user: meData.user,
    profile: meData.profile,
    requestedDestination: requestedUrl,
  })
  assert.equal(explicitDestination, '/dashboard/products')
  console.log('✓ Valid internal return destination preserved: /dashboard/products')

  // 6. Verification of Open Redirect Defense
  console.log('\n6. Verifying Open Redirect Attack Defense (?redirect=https://evil.com)...')
  const attackParams = new URLSearchParams('redirect=https%3A%2F%2Fevil.com%2Fphish')
  const attackUrl = getRequestedReturnUrl(attackParams)
  const safeDestination = getPostAuthDestination({
    user: meData.user,
    profile: meData.profile,
    requestedDestination: attackUrl,
  })
  assert.equal(safeDestination, '/dashboard/store', 'Open redirect must fall back to /dashboard/store')
  console.log('✓ Open redirect https://evil.com/phish rejected -> safely routed to /dashboard/store')

  // 7. Verification of Incomplete Onboarding Enforcement
  console.log('\n7. Verifying Incomplete Onboarding Enforcement...')
  const incompleteProfile = { onboardingComplete: false, onboardingStatus: 'STEP_1' }
  const onboardingDestination = getPostAuthDestination({
    user: meData.user,
    profile: incompleteProfile,
    requestedDestination: '/dashboard/products',
  })
  assert.equal(onboardingDestination, '/onboarding', 'Incomplete profile must go to /onboarding')
  console.log('✓ Incomplete onboarding creator redirected to /onboarding')

  // 8. Verification of Customer Role Isolation
  console.log('\n8. Verifying Customer Account Isolation...')
  const customerUser = { role: 'CUSTOMER' }
  const customerDestination = getPostAuthDestination({
    user: customerUser,
    profile: null,
    requestedDestination: '/dashboard/store',
  })
  assert.equal(customerDestination, '/account', 'Customer must never land on creator dashboard')
  console.log('✓ Customer accounts safely routed to /account')

  // 9. Verification of Store Data Loading on Destination
  console.log('\n9. Verifying Store Endpoint (/api/store) Loads with Session...')
  const storeRes = await fetch(`${BASE_URL}/store`, {
    headers: { Cookie: sessionCookie },
  })
  assert.equal(storeRes.status, 200, 'Store endpoint should return 200')
  const storeData = await storeRes.json()
  assert.equal(storeData.store?.username, 'redirecttest')
  console.log('✓ Store data loaded successfully for authenticated creator on /dashboard/store')

  console.log('\n🎉 ALL E2E INTEGRATION & REGRESSION TESTS PASSED!')
}

runE2ETests().catch((err) => {
  console.error('\n❌ Test failed:', err)
  process.exit(1)
})
