import assert from 'node:assert/strict'
import {
  getSafeRedirect,
  getRequestedReturnUrl,
  getPostAuthDestination,
  DEFAULT_POST_AUTH_PATH,
} from '../lib/redirectUtils.js'

console.log('🧪 Starting Post-Auth Redirect Unit Tests...\n')

// Test 1: Default post auth path is /dashboard
assert.equal(DEFAULT_POST_AUTH_PATH, '/dashboard')
console.log('✓ DEFAULT_POST_AUTH_PATH is /dashboard')

// Test 2: getSafeRedirect with valid internal paths
assert.equal(getSafeRedirect('/dashboard/store'), '/dashboard/store')
assert.equal(getSafeRedirect('/dashboard/products'), '/dashboard/products')
assert.equal(getSafeRedirect('/account/orders'), '/account/orders')
assert.equal(getSafeRedirect('/dashboard/settings?tab=billing'), '/dashboard/settings?tab=billing')
console.log('✓ Valid internal paths preserved')

// Test 3: getSafeRedirect blocks open redirect vulnerabilities
assert.equal(getSafeRedirect('https://evil.com'), '/dashboard')
assert.equal(getSafeRedirect('http://attacker.com/steal'), '/dashboard')
assert.equal(getSafeRedirect('//evil.com'), '/dashboard')
assert.equal(getSafeRedirect('//evil.com/phish'), '/dashboard')
assert.equal(getSafeRedirect('/\\evil.com'), '/dashboard')
assert.equal(getSafeRedirect('\\\\evil.com'), '/dashboard')
assert.equal(getSafeRedirect('javascript:alert(1)'), '/dashboard')
assert.equal(getSafeRedirect('/http://evil.com'), '/dashboard')
assert.equal(getSafeRedirect(''), '/dashboard')
assert.equal(getSafeRedirect(null), '/dashboard')
assert.equal(getSafeRedirect(undefined), '/dashboard')
console.log('✓ Open redirects, protocol injection, and falsy inputs safely rejected')

// Test 4: getSafeRedirect prevents redirect loops to auth pages
assert.equal(getSafeRedirect('/login'), '/dashboard')
assert.equal(getSafeRedirect('/signup'), '/dashboard')
assert.equal(getSafeRedirect('/verify-email'), '/dashboard')
assert.equal(getSafeRedirect('/login?foo=bar'), '/dashboard')
console.log('✓ Auth loop destinations safely redirected to default')

// Test 5: getRequestedReturnUrl parsing
const mockParams1 = new URLSearchParams('returnTo=%2Fdashboard%2Fproducts')
assert.equal(getRequestedReturnUrl(mockParams1), '/dashboard/products')

const mockParams2 = new URLSearchParams('redirectTo=%2Faccount%2Flibrary')
assert.equal(getRequestedReturnUrl(mockParams2), '/account/library')

const mockParams3 = new URLSearchParams('callbackUrl=%2Fdashboard%2Fstore')
assert.equal(getRequestedReturnUrl(mockParams3), '/dashboard/store')

const mockParams4 = new URLSearchParams('redirect=%2Fcustom%2Fpage')
assert.equal(getRequestedReturnUrl(mockParams4), '/custom/page')

const mockParamsEmpty = new URLSearchParams('')
assert.equal(getRequestedReturnUrl(mockParamsEmpty), null)

assert.equal(getRequestedReturnUrl({ returnTo: '/foo' }), '/foo')
console.log('✓ Search params correctly extracted from URLSearchParams or objects')

// Test 6: getPostAuthDestination for CUSTOMER role
const customerUser = { role: 'CUSTOMER' }
assert.equal(getPostAuthDestination({ user: customerUser }), '/account')
assert.equal(getPostAuthDestination({ user: customerUser, requestedDestination: '/account/orders' }), '/account/orders')
// Customer cannot be routed outside customer account by requestedDestination
assert.equal(getPostAuthDestination({ user: customerUser, requestedDestination: '/dashboard/store' }), '/account')
console.log('✓ Customer accounts safely routed to /account')

// Test 7: getPostAuthDestination for CREATOR with incomplete onboarding
const incompleteProfile = { onboardingComplete: false, onboardingStatus: 'STEP_1' }
const creatorUser = { role: 'CREATOR' }
assert.equal(getPostAuthDestination({ user: creatorUser, profile: incompleteProfile }), '/onboarding')
assert.equal(
  getPostAuthDestination({
    user: creatorUser,
    profile: incompleteProfile,
    requestedDestination: '/dashboard/products',
  }),
  '/onboarding'
)
console.log('✓ Incomplete onboarding creators always directed to /onboarding')

// Test 8: getPostAuthDestination for CREATOR with complete onboarding
const completeProfile1 = { onboardingComplete: true }
const completeProfile2 = { onboardingStatus: 'COMPLETED' }

// Default destination must be /dashboard
assert.equal(getPostAuthDestination({ user: creatorUser, profile: completeProfile1 }), '/dashboard')
assert.equal(getPostAuthDestination({ user: creatorUser, profile: completeProfile2 }), '/dashboard')

// Valid requested destination honored
assert.equal(
  getPostAuthDestination({
    user: creatorUser,
    profile: completeProfile1,
    requestedDestination: '/dashboard/products',
  }),
  '/dashboard/products'
)

// Malicious requested destination falls back to /dashboard
assert.equal(
  getPostAuthDestination({
    user: creatorUser,
    profile: completeProfile1,
    requestedDestination: 'https://attacker.com',
  }),
  '/dashboard'
)
console.log('✓ Completed creators default to /dashboard, with safe destination preservation')

console.log('\n🎉 ALL UNIT TESTS PASSED!')
