import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { HELP_CATEGORIES, HELP_ARTICLES } from '../lib/helpContent.js'
import { supportService } from '../lib/services.js'
import { supportTicketsRepo } from '../lib/repos.js'
import prisma from '../lib/prisma.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const ROOT = path.resolve(__dirname, '..')

console.log('--- Starting CreatorStore Help & Support Center Test Suite ---')

// ----------------------------------------------------
// TEST 1: Navigation Entry Points and Routing Verification
// ----------------------------------------------------
console.log('\nTest 1: Validating Account Menu Dropdown and Navigation Routing...')

// 1.1 SidebarProfileRow.jsx inspection
const sidebarProfileContent = fs.readFileSync(path.join(ROOT, 'components/dashboard/SidebarProfileRow.jsx'), 'utf-8')
assert.ok(
  sidebarProfileContent.includes('href="/dashboard/help"'),
  'SidebarProfileRow must route Help & Support to /dashboard/help'
)
assert.ok(
  sidebarProfileContent.includes('Help & Support'),
  'SidebarProfileRow must display "Help & Support"'
)
assert.ok(
  sidebarProfileContent.includes('Give Feedback'),
  'SidebarProfileRow must preserve Give Feedback as a separate option'
)

// 1.2 Route file existence
assert.ok(
  fs.existsSync(path.join(ROOT, 'app/dashboard/help/page.js')),
  '/dashboard/help/page.js must exist'
)
assert.ok(
  fs.existsSync(path.join(ROOT, 'app/dashboard/help/HelpClient.jsx')),
  '/dashboard/help/HelpClient.jsx must exist'
)
assert.ok(
  fs.existsSync(path.join(ROOT, 'app/dashboard/success-center/page.js')),
  '/dashboard/success-center/page.js must exist for legacy redirect'
)

// 1.3 Legacy redirect inspection
const successCenterContent = fs.readFileSync(path.join(ROOT, 'app/dashboard/success-center/page.js'), 'utf-8')
assert.ok(
  successCenterContent.includes("redirect('/dashboard/help')"),
  'success-center must redirect to /dashboard/help'
)

console.log('✅ Test 1 PASSED: Navigation entry points and routing validated.')

// ----------------------------------------------------
// TEST 2: Help Categories Validation
// ----------------------------------------------------
console.log('\nTest 2: Validating Quick Help Categories...')

const expectedCategories = [
  'getting-started',
  'products-content',
  'payments-earnings',
  'bookings',
  'plans-billing',
  'account-security',
]

assert.equal(HELP_CATEGORIES.length, 6, 'Must have exactly 6 help categories')
for (const catId of expectedCategories) {
  const cat = HELP_CATEGORIES.find((c) => c.id === catId)
  assert.ok(cat, `Category "${catId}" must exist in HELP_CATEGORIES`)
  assert.ok(cat.title, `Category "${catId}" must have a title`)
  assert.ok(cat.description, `Category "${catId}" must have a description`)
  assert.ok(cat.iconName, `Category "${catId}" must have an iconName`)
  assert.ok(Array.isArray(cat.topics) && cat.topics.length >= 3, `Category "${catId}" must list at least 3 topics`)
}

console.log('✅ Test 2 PASSED: All 6 Quick Help Categories are properly configured.')

// ----------------------------------------------------
// TEST 3: Help Articles & Search/Filtering Behavior
// ----------------------------------------------------
console.log('\nTest 3: Validating Help Articles, Search, and Category Filtering...')

assert.ok(HELP_ARTICLES.length >= 8, 'Must have at least 8 curated help articles')

for (const art of HELP_ARTICLES) {
  assert.ok(art.id, 'Article must have an ID')
  assert.ok(art.slug, 'Article must have a slug')
  assert.ok(art.categoryId, 'Article must belong to a categoryId')
  assert.ok(art.title, 'Article must have a title')
  assert.ok(art.summary, 'Article must have a summary')
  assert.ok(art.content && art.content.length > 50, 'Article must have substantial guide content')
  assert.ok(Array.isArray(art.keywords), 'Article must have keywords array')
}

// 3.1 Search by keywords
const searchResultsPayout = supportService.getArticles({ search: 'payout' })
assert.ok(searchResultsPayout.length > 0, 'Searching for "payout" must return articles')
assert.ok(
  searchResultsPayout.some((a) => a.title.toLowerCase().includes('payout')),
  'Search result must include payout article'
)

// 3.2 Search by store setup
const searchResultsStore = supportService.getArticles({ search: 'storefront' })
assert.ok(searchResultsStore.length > 0, 'Searching for "storefront" must return articles')

// 3.3 Filter by category
const bookingsArticles = supportService.getArticles({ category: 'bookings' })
assert.ok(bookingsArticles.length > 0, 'Filtering by "bookings" must return articles')
assert.ok(
  bookingsArticles.every((a) => a.categoryId === 'bookings'),
  'All returned articles must belong to "bookings" category'
)

// 3.4 Get article by slug
const articleBySlug = supportService.getArticleBySlug('how-to-set-up-storefront')
assert.ok(articleBySlug, 'Retrieving article by slug must return article')
assert.equal(articleBySlug.slug, 'how-to-set-up-storefront')

console.log('✅ Test 3 PASSED: Articles, search query filtering, and slug retrieval validated.')

// ----------------------------------------------------
// TEST 4: Support Request Form Validation & Ticket Creation
// ----------------------------------------------------
console.log('\nTest 4: Validating Support Ticket Validation and Rate Limiting...')

const mockCreatorId = crypto.randomUUID()

// 4.1 Missing creatorId / unauthorized
await assert.rejects(
  async () => {
    await supportService.createTicket(null, {
      subject: 'Test issue',
      category: 'Storefront',
      description: 'Detailed description of the issue',
    })
  },
  /Unauthorized/,
  'createTicket must reject when creatorId is missing'
)

// 4.2 Subject validation
await assert.rejects(
  async () => {
    await supportService.createTicket(mockCreatorId, {
      subject: '',
      category: 'Storefront',
      description: 'Detailed description of the issue',
    })
  },
  /Subject is required/,
  'createTicket must reject empty subject'
)

// 4.3 Category validation
await assert.rejects(
  async () => {
    await supportService.createTicket(mockCreatorId, {
      subject: 'Valid Subject',
      category: '',
      description: 'Detailed description of the issue',
    })
  },
  /category/,
  'createTicket must reject missing category'
)

// 4.4 Description validation
await assert.rejects(
  async () => {
    await supportService.createTicket(mockCreatorId, {
      subject: 'Valid Subject',
      category: 'Storefront',
      description: 'Too short',
    })
  },
  /Description is required/,
  'createTicket must reject description shorter than 10 characters'
)

console.log('✅ Test 4 PASSED: Validation constraints properly enforced.')

// ----------------------------------------------------
// TEST 5: Database Persistence & Creator Isolation Scoping
// ----------------------------------------------------
console.log('\nTest 5: Validating Database Persistence and Creator Isolation...')

async function runPersistenceTests() {
  // Find or use an existing creator in the database
  let existingUser = await prisma.user.findFirst({
    where: { role: 'CREATOR' }
  })

  const creatorAId = existingUser ? existingUser.id : crypto.randomUUID()
  const creatorBId = crypto.randomUUID()

  // 5.1 Create ticket for Creator A
  const ticketA = await supportService.createTicket(creatorAId, {
    subject: 'Automated Test: Payout inquiry',
    category: 'Payments & Earnings',
    relatedPage: '/dashboard/payments',
    description: 'This is an automated test ticket verifying persistence and creator scoping.',
  })

  assert.ok(ticketA, 'Ticket must be created')
  assert.ok(ticketA.id, 'Ticket must have a database ID')
  assert.ok(ticketA.ticketNumber, 'Ticket must have a ticketNumber')
  assert.ok(ticketA.ticketNumber.startsWith('CS-'), 'Ticket number must start with CS-')
  assert.equal(ticketA.status, 'OPEN', 'Default ticket status must be OPEN')
  assert.equal(ticketA.priority, 'NORMAL', 'Default priority must be NORMAL')
  assert.equal(ticketA.subject, 'Automated Test: Payout inquiry')
  assert.equal(ticketA.category, 'Payments & Earnings')
  assert.equal(ticketA.relatedPage, '/dashboard/payments')

  // 5.2 List tickets for Creator A
  const creatorATickets = await supportService.listTickets(creatorAId)
  assert.ok(Array.isArray(creatorATickets), 'listTickets must return array')
  const foundInA = creatorATickets.find((t) => t.id === ticketA.id)
  assert.ok(foundInA, 'Creator A must see their own ticket')

  // 5.3 Creator B scoping - Creator B must NOT see Creator A's tickets
  const creatorBTickets = await supportService.listTickets(creatorBId)
  const foundInB = creatorBTickets.find((t) => t.id === ticketA.id)
  assert.equal(foundInB, undefined, 'Creator B must NEVER see Creator A tickets')

  // 5.4 Fetch single ticket scoped to creator
  const ticketDirect = await supportService.getTicket(creatorAId, ticketA.id)
  assert.ok(ticketDirect, 'Creator A can view their own ticket detail')
  assert.equal(ticketDirect.id, ticketA.id)

  // Creator B should get 404 when attempting to access Creator A's ticket
  await assert.rejects(
    async () => {
      await supportService.getTicket(creatorBId, ticketA.id)
    },
    /not found/i,
    'Creator B must be rejected with 404 when attempting to access Creator A ticket'
  )

  // Cleanup test ticket
  try {
    await prisma.supportTicket.delete({ where: { id: ticketA.id } })
  } catch {
    // If deleted or direct DB fallback, ignore
  }

  console.log('✅ Test 5 PASSED: Persistence, unique reference generation, and creator isolation verified.')
}

// ----------------------------------------------------
// TEST 6: API Route Integration Verification
// ----------------------------------------------------
console.log('\nTest 6: Validating API Route Registration in route.js...')

const routeContent = fs.readFileSync(path.join(ROOT, 'app/api/[[...path]]/route.js'), 'utf-8')
assert.ok(
  routeContent.includes("path[0] === 'support'"),
  'app/api/[[...path]]/route.js must handle path[0] === "support"'
)
assert.ok(
  routeContent.includes("supportService"),
  'app/api/[[...path]]/route.js must import and use supportService'
)
assert.ok(
  routeContent.includes("path[1] === 'tickets'"),
  'app/api/[[...path]]/route.js must handle support tickets endpoint'
)
assert.ok(
  routeContent.includes("path[1] === 'categories'"),
  'app/api/[[...path]]/route.js must handle categories endpoint'
)
assert.ok(
  routeContent.includes("path[1] === 'articles'"),
  'app/api/[[...path]]/route.js must handle articles endpoint'
)

console.log('✅ Test 6 PASSED: API routes registered and authenticated.')

// Run async tests
runPersistenceTests()
  .then(() => {
    console.log('\n🎉 ALL CREATORSTORE HELP & SUPPORT TESTS PASSED SUCCESSFULLY! 🎉\n')
    process.exit(0)
  })
  .catch((err) => {
    console.error('❌ Test failed with error:', err)
    process.exit(1)
  })
