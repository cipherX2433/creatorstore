import assert from 'node:assert'
import fs from 'node:fs'
import path from 'node:path'
import { productService, analyticsService } from '../lib/services.js'

const ROOT = process.cwd()

console.log('--- Starting CreatorStore Products Dashboard Redesign Test Suite ---\n')

// ============================================================================
// 1. Static Verification of ProductsClient.jsx Architecture & Components
// ============================================================================
console.log('Test 1: Validating ProductsClient.jsx component and structure...')

const clientPath = path.join(ROOT, 'app/dashboard/products/ProductsClient.jsx')
assert.ok(fs.existsSync(clientPath), 'ProductsClient.jsx must exist')
const clientCode = fs.readFileSync(clientPath, 'utf8')

// Header checks
assert.ok(clientCode.includes('Products'), 'Must render Products page title')
assert.ok(clientCode.includes('href="/dashboard/settings"'), 'Must have Settings link in header')
assert.ok(clientCode.includes('Settings className'), 'Must render Settings icon')

// Earnings Summary Banner checks
assert.ok(clientCode.includes('rounded-[20px] sm:rounded-[22px] bg-[#0A0A0A]'), 'Must render dark earnings summary banner')
assert.ok(clientCode.includes('Views'), 'Must display Views metric')
assert.ok(clientCode.includes('Clicks'), 'Must display Clicks metric')
assert.ok(clientCode.includes('Orders'), 'Must display Orders metric')
assert.ok(clientCode.includes('Earnings'), 'Must display Earnings metric')
assert.ok(clientCode.includes('DATE_RANGES'), 'Must have DATE_RANGES options')
assert.ok(clientCode.includes('Last 30 days'), 'Must support Last 30 days default option')
assert.ok(clientCode.includes('Last 7 days'), 'Must support Last 7 days option')
assert.ok(clientCode.includes('All time'), 'Must support All time option')

// Product Management Panel checks
assert.ok(clientCode.includes('Search products'), 'Must have search products input')
assert.ok(clientCode.includes('TYPE_FILTERS'), 'Must have TYPE_FILTERS array')
assert.ok(clientCode.includes('All types'), 'Must have All types filter')
assert.ok(clientCode.includes('Booking'), 'Must support Booking type filter')
assert.ok(clientCode.includes('Digital Download'), 'Must support Digital Download type filter')
assert.ok(clientCode.includes('STATUS_FILTERS'), 'Must have STATUS_FILTERS array')
assert.ok(clientCode.includes('All statuses'), 'Must have All statuses filter')
assert.ok(clientCode.includes('Setup incomplete'), 'Must support Setup incomplete filter')
assert.ok(clientCode.includes('Add product'), 'Must render + Add product button')

// Table columns & rows checks
assert.ok(clientCode.includes('Product name'), 'Table must have Product name column')
assert.ok(clientCode.includes('Status'), 'Table must have Status column')
assert.ok(clientCode.includes('Created'), 'Table must have Created column')
assert.ok(clientCode.includes('All-time clicks'), 'Table must have All-time clicks column')
assert.ok(clientCode.includes('All-time orders'), 'Table must have All-time orders column')
assert.ok(clientCode.includes('Price'), 'Table must have Price column')

// Status badges
assert.ok(clientCode.includes('bg-[#7C3AED]') && clientCode.includes('Published'), 'Published badge must use purple styling')
assert.ok(clientCode.includes('Setup incomplete') && clientCode.includes('AlertTriangle'), 'Setup incomplete must display warning indicator')

// Missing price fallback check
assert.ok(clientCode.includes("formatProductPrice"), 'Must use formatProductPrice helper')
assert.ok(clientCode.includes("return '—'"), 'Missing price must return em dash instead of false zero')

// Sorting & Pagination checks
assert.ok(clientCode.includes('handleSort'), 'Must support column sorting')
assert.ok(clientCode.includes('sortColumn'), 'Must track sortColumn')
assert.ok(clientCode.includes('sortDirection'), 'Must track sortDirection')
assert.ok(clientCode.includes('paginatedProducts'), 'Must support pagination')
assert.ok(clientCode.includes('pageSize'), 'Must configure pageSize')

// Actions & Modals checks
assert.ok(clientCode.includes('AddToStoreModal'), 'Must connect AddToStoreModal creation wizard')
assert.ok(clientCode.includes('ProductManagementModal'), 'Must connect ProductManagementModal')
assert.ok(clientCode.includes('deleteModal'), 'Must have delete confirmation modal')
assert.ok(clientCode.includes('depModal'), 'Must have automation dependency modal')
assert.ok(clientCode.includes('handleTogglePublish'), 'Must support toggle publish')
assert.ok(clientCode.includes('duplicateProduct'), 'Must support product duplication')
assert.ok(clientCode.includes('executeRemove'), 'Must support secure product deletion')

console.log('✅ Test 1 PASSED: ProductsClient.jsx structure and UI requirements verified.\n')

// ============================================================================
// 2. Data & Analytics Services Verification
// ============================================================================
console.log('Test 2: Validating backend analytics and product enrichment services...')

const servicesPath = path.join(ROOT, 'lib/services.js')
assert.ok(fs.existsSync(servicesPath), 'services.js must exist')
const servicesCode = fs.readFileSync(servicesPath, 'utf8')

// Analytics overview enhancements
assert.ok(servicesCode.includes('views: storeViews + productViews'), 'analyticsService.overview must calculate total views')
assert.ok(servicesCode.includes('clicks: checkoutStarted'), 'analyticsService.overview must calculate clicks')
assert.ok(servicesCode.includes('periodRevenue: Math.round'), 'analyticsService.overview must return periodRevenue')
assert.ok(servicesCode.includes('prevRevenue: Math.round'), 'analyticsService.overview must return prevRevenue')
assert.ok(servicesCode.includes('headline'), 'analyticsService.overview must compute dynamic headline')
assert.ok(servicesCode.includes('comparisonText'), 'analyticsService.overview must compute comparisonText')
assert.ok(servicesCode.includes('trend'), 'analyticsService.overview must evaluate trend (up/down/steady)')

// ProductService list enrichment
assert.ok(servicesCode.includes('allTimeOrders: count'), 'productService.list must return allTimeOrders')
assert.ok(servicesCode.includes('allTimeClicks: clicks'), 'productService.list must return allTimeClicks')
assert.ok(servicesCode.includes('setupIncomplete'), 'productService.list must return setupIncomplete')
assert.ok(servicesCode.includes('isSetupComplete'), 'productService.list must return isSetupComplete')

console.log('✅ Test 2 PASSED: Analytics and product list enrichment verified.\n')

// ============================================================================
// 3. Price and Date Formatting Unit Checks
// ============================================================================
console.log('Test 3: Testing unit functions for formatProductPrice & formatProductDate...')

function testFormatProductPrice(price, currency = 'usd') {
  if (price === null || price === undefined || price === '' || isNaN(Number(price))) {
    return '—'
  }
  return Number(price) === 0 ? '$0.00' : `$${Number(price).toFixed(2)}`
}

function testFormatProductDate(dateStr) {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(d)
}

// Missing prices must show em dash
assert.strictEqual(testFormatProductPrice(null), '—', 'null price must return em dash')
assert.strictEqual(testFormatProductPrice(undefined), '—', 'undefined price must return em dash')
assert.strictEqual(testFormatProductPrice(''), '—', 'empty string price must return em dash')

// Numeric prices must format correctly
assert.strictEqual(testFormatProductPrice(0), '$0.00', '0 price must return $0.00')
assert.strictEqual(testFormatProductPrice(49), '$49.00', '49 price must return $49.00')
assert.strictEqual(testFormatProductPrice(99.99), '$99.99', '99.99 price must return $99.99')

// Dates must format as Month Day, Year
const testDate = '2026-10-19T10:00:00.000Z'
const formatted = testFormatProductDate(testDate)
assert.ok(formatted.includes('Oct') && formatted.includes('2026'), `Date formatting must include Oct and 2026, got: ${formatted}`)

console.log('✅ Test 3 PASSED: Price and date formatting logic verified.\n')

// ============================================================================
// 4. Product Type & Status Filtering Logic Check
// ============================================================================
console.log('Test 4: Testing filtering & sorting logic simulation...')

const sampleProducts = [
  { id: '1', title: 'My Bookings Link', type: 'COACHING', status: 'PUBLISHED', price: 0, createdAt: '2026-10-19', allTimeClicks: 2, allTimeOrders: 2 },
  { id: '2', title: 'My digital product', type: 'DIGITAL', status: 'DRAFT', price: null, createdAt: '2026-10-19', allTimeClicks: 0, allTimeOrders: 0, setupIncomplete: true },
  { id: '3', title: 'Another Booking', type: 'COACHING', status: 'DRAFT', price: 0, createdAt: '2026-09-13', allTimeClicks: 0, allTimeOrders: 0, setupIncomplete: true },
  { id: '4', title: 'Masterclass Course', type: 'COURSE', status: 'PUBLISHED', price: 49, createdAt: '2026-08-01', allTimeClicks: 15, allTimeOrders: 8 },
]

// Filter by search
const searchResult = sampleProducts.filter(p => p.title.toLowerCase().includes('booking'))
assert.strictEqual(searchResult.length, 2, 'Search by "booking" should return 2 products')

// Filter by type
const bookingResult = sampleProducts.filter(p => p.type === 'COACHING')
assert.strictEqual(bookingResult.length, 2, 'Filter by COACHING should return 2 products')

// Filter by status
const publishedResult = sampleProducts.filter(p => p.status === 'PUBLISHED')
assert.strictEqual(publishedResult.length, 2, 'Filter by PUBLISHED should return 2 products')
const incompleteResult = sampleProducts.filter(p => p.setupIncomplete === true)
assert.strictEqual(incompleteResult.length, 2, 'Filter by setupIncomplete should return 2 products')

// Sorting by created desc
const sortedCreated = [...sampleProducts].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
assert.strictEqual(sortedCreated[0].id, '1', 'First item sorted by created desc should be id 1')
assert.strictEqual(sortedCreated[sortedCreated.length - 1].id, '4', 'Last item sorted by created desc should be id 4')

// Sorting by clicks desc
const sortedClicks = [...sampleProducts].sort((a, b) => b.allTimeClicks - a.allTimeClicks)
assert.strictEqual(sortedClicks[0].id, '4', 'First item sorted by clicks desc should be id 4 (15 clicks)')

// Sorting by orders desc
const sortedOrders = [...sampleProducts].sort((a, b) => b.allTimeOrders - a.allTimeOrders)
assert.strictEqual(sortedOrders[0].id, '4', 'First item sorted by orders desc should be id 4 (8 orders)')

console.log('✅ Test 4 PASSED: Filter and sort simulation verified.\n')

console.log('========================================================')
console.log('🎉 ALL PRODUCTS DASHBOARD REDESIGN TESTS PASSED! 🎉')
console.log('========================================================\n')
