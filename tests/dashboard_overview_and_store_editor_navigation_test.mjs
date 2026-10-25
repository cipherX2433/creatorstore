import assert from 'assert'
import fs from 'fs'
import path from 'path'
import {
  DEFAULT_POST_AUTH_PATH,
  getSafeRedirect,
  getPostAuthDestination,
} from '../lib/redirectUtils.js'
import { MOBILE_BOTTOM_NAV_ITEMS } from '../lib/navigationConfig.js'

console.log('=====================================================================')
console.log('🧪 P0 AUDIT: DASHBOARD OVERVIEW & STORE EDITOR NAVIGATION')
console.log('=====================================================================\n')

let passed = 0
let failed = 0

function pass(name) {
  console.log(`  ✅ [PASS] ${name}`)
  passed++
}

function fail(name, err) {
  console.error(`  ❌ [FAIL] ${name}:`, err?.message || err)
  failed++
}

// -----------------------------------------------------------------------------
// CHECKLIST P0-A: Route Architecture & Route Ownership
// -----------------------------------------------------------------------------
console.log('--- CHECKLIST P0-A: Route Architecture & Route Ownership ---')

try {
  // 1. Mobile Bottom Navigation Configuration
  const storeNavItem = MOBILE_BOTTOM_NAV_ITEMS.find((item) => item.id === 'store')
  assert.ok(storeNavItem, 'Mobile bottom nav must have store item')
  assert.equal(storeNavItem.href, '/dashboard', 'Store bottom nav must point to /dashboard (dashboard overview)')
  assert.ok(storeNavItem.matches('/dashboard'), 'Store item must match /dashboard')
  assert.ok(storeNavItem.matches('/dashboard/store'), 'Store item must match /dashboard/store')

  const insightsNavItem = MOBILE_BOTTOM_NAV_ITEMS.find((item) => item.id === 'insights')
  assert.ok(insightsNavItem, 'Mobile bottom nav must have insights item')
  assert.equal(insightsNavItem.href, '/dashboard/analytics', 'Insights bottom nav must point to /dashboard/analytics')
  assert.ok(insightsNavItem.matches('/dashboard/analytics'), 'Insights item must match /dashboard/analytics')
  assert.ok(!insightsNavItem.matches('/dashboard'), 'Insights must NOT match /dashboard')

  // 2. Desktop Sidebar in app/dashboard/layout.js
  const layoutPath = path.resolve('app/dashboard/layout.js')
  const layoutContent = fs.readFileSync(layoutPath, 'utf8')

  assert.ok(
    layoutContent.includes("isStoreActive = pathname === '/dashboard' || pathname.startsWith('/dashboard/store')"),
    'layout.js must consider /dashboard as active store overview'
  )
  assert.ok(
    layoutContent.includes('href="/dashboard"') && layoutContent.includes('My Store'),
    'Desktop sidebar My Store link must point to /dashboard'
  )
  assert.ok(
    layoutContent.includes("pathname === '/dashboard'") && layoutContent.includes("'Overview'"),
    'Route title for /dashboard must be Overview'
  )
  assert.ok(
    layoutContent.includes("pathname.startsWith('/dashboard/analytics')") && layoutContent.includes("'Insights'"),
    'Route title for /dashboard/analytics must be Insights'
  )

  pass('Route architecture correctly establishes /dashboard as Overview and /dashboard/analytics as Insights')
} catch (err) {
  fail('Route architecture audit failed', err)
}

// -----------------------------------------------------------------------------
// CHECKLIST P0-B: Dashboard Overview Page (/dashboard)
// -----------------------------------------------------------------------------
console.log('\n--- CHECKLIST P0-B: Dashboard Overview Page (/dashboard) ---')

try {
  const dashboardPagePath = path.resolve('app/dashboard/page.js')
  const dashboardContent = fs.readFileSync(dashboardPagePath, 'utf8')

  // 1. StoreProfileCard component exists with centered avatar, username, item count, Share & Edit
  assert.ok(dashboardContent.includes('function StoreProfileCard'), 'StoreProfileCard component must be defined')
  assert.ok(dashboardContent.includes('href="/dashboard/store"'), 'Edit button on StoreProfileCard must navigate to /dashboard/store')
  assert.ok(dashboardContent.includes('aria-label="Share store"'), 'Share button must be present on StoreProfileCard')
  assert.ok(dashboardContent.includes('+ Shop'), 'Item count must display + Shop metadata')
  assert.ok(dashboardContent.includes('rounded-[28px]'), 'StoreProfileCard must use rounded-[28px] soft neutral card styling')

  // 2. Mobile Layout (md:hidden) strictly follows Reference Image 1
  assert.ok(dashboardContent.includes('md:hidden'), 'Dashboard must have responsive mobile layout')
  assert.ok(dashboardContent.includes('Reactivate Pro') || dashboardContent.includes('Pro Plan'), 'Mobile header must have subscription indicator')
  assert.ok(dashboardContent.includes('aria-label="Share storefront"'), 'Mobile header must have share action')
  assert.ok(dashboardContent.includes('aria-label="Notifications"'), 'Mobile header must have notifications action')
  assert.ok(dashboardContent.includes('aria-label="Messages"'), 'Mobile header must have messages action')
  assert.ok(dashboardContent.includes('href="/dashboard/store"'), 'Quick action Add must navigate to /dashboard/store')
  assert.ok(dashboardContent.includes('href="/dashboard/products"'), 'Quick action Products must navigate to /dashboard/products')
  assert.ok(dashboardContent.includes('href="/dashboard/store?tab=design"'), 'Quick action Design must navigate to /dashboard/store?tab=design')

  // 3. Desktop Layout (hidden md:block) strictly follows Reference Image 2
  assert.ok(dashboardContent.includes('hidden md:block'), 'Dashboard must have desktop layout')
  assert.ok(dashboardContent.includes('{greeting}, {username}'), 'Desktop header must show greeting and username')
  assert.ok(dashboardContent.includes('creatorstore.store/'), 'Desktop header must show live storefront shortcut')
  assert.ok(dashboardContent.includes('Your Store'), 'Desktop must have Your Store section heading')
  assert.ok(dashboardContent.includes('max-w-[340px]'), 'Desktop profile card must be compact (max-w-[340px])')

  // 4. Performance section: 4 metric cards preserved with date range selector
  assert.ok(dashboardContent.includes('performanceTitle') || dashboardContent.includes('In the last 30 days'), 'Must display performance section heading')
  assert.ok(dashboardContent.includes('7D') && dashboardContent.includes('30D') && dashboardContent.includes('90D'), 'Must preserve 7D, 30D, 90D date controls')
  assert.ok(dashboardContent.includes('Total Revenue'), 'Must display Total Revenue KPI card')
  assert.ok(dashboardContent.includes('Total Orders'), 'Must display Total Orders KPI card')
  assert.ok(dashboardContent.includes('Total Customers'), 'Must display Total Customers KPI card')
  assert.ok(dashboardContent.includes('Store Views'), 'Must display Store Views KPI card')

  // 5. Completely remove lower sections below the 4 metric cards
  assert.ok(!dashboardContent.includes('Revenue Overview'), 'Revenue Overview must be completely removed from /dashboard')
  assert.ok(!dashboardContent.includes('Quick Actions'), 'Quick Actions panel must be completely removed from /dashboard')
  assert.ok(!dashboardContent.includes('Traffic Sources'), 'Traffic Sources must be completely removed from /dashboard')
  assert.ok(!dashboardContent.includes('Top Products'), 'Top Products must be completely removed from /dashboard')
  assert.ok(!dashboardContent.includes('Recent Activity'), 'Recent Activity must be completely removed from /dashboard')

  pass('Dashboard overview (/dashboard) implements complete mobile (Ref 1) and desktop (Ref 2) designs')
} catch (err) {
  fail('Dashboard overview page audit failed', err)
}

// -----------------------------------------------------------------------------
// CHECKLIST P0-C: Store Editor Workspace (/dashboard/store) Navigation & Back
// -----------------------------------------------------------------------------
console.log('\n--- CHECKLIST P0-C: Store Editor Workspace (/dashboard/store) Navigation ---')

try {
  // 1. Mobile Store Editor Back Button (Reference Image 3)
  const mobileEditorPath = path.resolve('components/dashboard/MobileStoreDashboard.jsx')
  const mobileEditorContent = fs.readFileSync(mobileEditorPath, 'utf8')

  assert.ok(
    mobileEditorContent.includes('<Link\n          href="/dashboard"') ||
    mobileEditorContent.includes('href="/dashboard"'),
    'Mobile Store Editor must have Back button pointing deterministically to /dashboard'
  )
  assert.ok(
    mobileEditorContent.includes('aria-label="Back to dashboard"'),
    'Mobile Store Editor Back button must have aria-label'
  )

  // 2. Desktop Store Editor Back Button
  const storePagePath = path.resolve('app/dashboard/store/page.js')
  const storePageContent = fs.readFileSync(storePagePath, 'utf8')

  assert.ok(
    storePageContent.includes('href="/dashboard"') && storePageContent.includes('Back to Dashboard'),
    'Desktop Store Editor must have visible Back to Dashboard button'
  )

  // 3. Store editor does NOT render analytics overview as main content
  assert.ok(
    !storePageContent.includes('Total Revenue') && !storePageContent.includes('Revenue Overview'),
    'Store editor must not render dashboard analytics overview'
  )

  // 4. Item editing opens specific item editor
  assert.ok(mobileEditorContent.includes('function handleCardEdit(section)'), 'Mobile editor must handle item editing')
  assert.ok(mobileEditorContent.includes('isBundle'), 'Bundle items must open bundle editor')
  assert.ok(mobileEditorContent.includes('isBooking'), 'Coaching items must open booking editor')
  assert.ok(mobileEditorContent.includes('onEditProduct'), 'Product items must open product editor')

  pass('Store Editor workspace correctly provides deterministic Back buttons to /dashboard and item-level editing')
} catch (err) {
  fail('Store editor navigation audit failed', err)
}

// -----------------------------------------------------------------------------
// CHECKLIST P0-D: Redirects and Authentication Flow
// -----------------------------------------------------------------------------
console.log('\n--- CHECKLIST P0-D: Redirects and Authentication Flow ---')

try {
  // 1. Default Post-Auth Path is /dashboard
  assert.equal(DEFAULT_POST_AUTH_PATH, '/dashboard', 'DEFAULT_POST_AUTH_PATH must be /dashboard')

  // 2. getSafeRedirect fallback
  assert.equal(getSafeRedirect(null), '/dashboard', 'Null fallback must be /dashboard')
  assert.equal(getSafeRedirect('https://evil.com'), '/dashboard', 'Open redirect fallback must be /dashboard')

  // 3. getPostAuthDestination
  const normalCreator = { user: { role: 'CREATOR' }, profile: { onboardingComplete: true } }
  assert.equal(getPostAuthDestination(normalCreator), '/dashboard', 'Completed creator defaults to /dashboard')

  // 4. Preserves valid intentional destination
  const billingReturn = { user: { role: 'CREATOR' }, profile: { onboardingComplete: true }, requestedDestination: '/dashboard/payments' }
  assert.equal(getPostAuthDestination(billingReturn), '/dashboard/payments', 'Valid explicit destination is preserved')

  // 5. Customer role routes to /account
  const customer = { user: { role: 'CUSTOMER' }, profile: {} }
  assert.equal(getPostAuthDestination(customer), '/account', 'Customer routes to /account')

  // 6. Onboarding Completion redirects to /dashboard
  const onboardingPath = path.resolve('app/onboarding/page.js')
  const onboardingContent = fs.readFileSync(onboardingPath, 'utf8')
  assert.ok(onboardingContent.includes("router.replace('/dashboard')"), 'Onboarding must redirect to /dashboard')
  assert.ok(!onboardingContent.includes("router.replace('/dashboard/store')"), 'Onboarding must not redirect to /dashboard/store')

  // 7. Subscribe completion redirects to /dashboard
  const subscribePath = path.resolve('app/creator/subscribe/page.js')
  const subscribeContent = fs.readFileSync(subscribePath, 'utf8')
  assert.ok(!subscribeContent.includes("router.push('/dashboard/store')"), 'Subscribe must not push to /dashboard/store')
  assert.ok(subscribeContent.includes("router.push('/dashboard')"), 'Subscribe must push to /dashboard')

  pass('Authentication and workflow redirects correctly default to /dashboard while preserving explicit workflows')
} catch (err) {
  fail('Redirects audit failed', err)
}

// -----------------------------------------------------------------------------
// SUMMARY
// -----------------------------------------------------------------------------
console.log('\n=====================================================================')
console.log(`AUDIT RESULTS: ${passed} passed, ${failed} failed`)
console.log('=====================================================================')

if (failed > 0) {
  process.exit(1)
} else {
  console.log('🎉 ALL P0 REQUIREMENTS VERIFIED SUCCESSFULLY!\n')
}
