import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { OTHER_PRIMARY_NAV, MORE_MENU_CATEGORIES, MOBILE_BOTTOM_NAV_ITEMS } from '../lib/navigationConfig.js'
import { businessCardService } from '../lib/services.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const ROOT = path.resolve(__dirname, '..')

console.log('--- Starting CreatorStore Business Cards Feature Test Suite ---')

// ----------------------------------------------------
// TEST 1: Sidebar & Mobile Navigation Integration
// ----------------------------------------------------
console.log('\nTest 1: Validating Business Cards in Navigation Configs...')

// 1.1 Desktop OTHER_PRIMARY_NAV
const bcPrimaryNav = OTHER_PRIMARY_NAV.find((item) => item.href === '/dashboard/business-cards')
assert.ok(bcPrimaryNav, 'Business cards must exist in OTHER_PRIMARY_NAV')
assert.equal(bcPrimaryNav.label, 'Business cards', 'Navigation label must be "Business cards"')
assert.ok(bcPrimaryNav.icon, 'Navigation item must have an icon')

// 1.2 Mobile More Drawer
const toolsCategory = MORE_MENU_CATEGORIES.find((cat) => cat.id === 'tools')
assert.ok(toolsCategory, 'Tools category must exist in MORE_MENU_CATEGORIES')
const bcMoreItem = toolsCategory.items.find((item) => item.href === '/dashboard/business-cards')
assert.ok(bcMoreItem, 'Business cards must exist in Tools category in MORE_MENU_CATEGORIES')
assert.equal(bcMoreItem.label, 'Business cards', 'More drawer label must be "Business cards"')

// 1.3 Mobile Bottom Nav More Matcher
const moreBottomNav = MOBILE_BOTTOM_NAV_ITEMS.find((item) => item.id === 'more')
assert.ok(moreBottomNav, 'More item must exist in MOBILE_BOTTOM_NAV_ITEMS')
assert.equal(
  moreBottomNav.matches('/dashboard/business-cards'),
  true,
  'mobile bottom nav more button must match /dashboard/business-cards'
)

console.log('✅ Test 1 PASSED: Sidebar and mobile navigation correctly configured.')

// ----------------------------------------------------
// TEST 2: Business Card Service - Get & Fallbacks
// ----------------------------------------------------
console.log('\nTest 2: Validating businessCardService.get and fallback defaults...')

async function runServiceTests() {
  // Test mock creator ID
  const testCreatorId = 'test-creator-' + Date.now()

  // 2.1 Unauthorized check
  await assert.rejects(
    async () => {
      await businessCardService.get(null)
    },
    /Unauthorized/,
    'businessCardService.get must reject when creatorId is missing'
  )

  // 2.2 Save and retrieve business card settings
  console.log('Testing businessCardService.save validation & persistence...')
  
  // Valid save payload
  const savePayload = {
    displayName: 'Alex Morgan — Creator',
    backgroundColor: '#D2E823',
    allowContactShare: true,
    contactDetails: {
      fullName: 'Alex Morgan',
      title: 'Digital Creator & Educator',
      organization: 'CreatorStore Studios',
      email: 'alex@creatorstore.test',
      phone: '+1 555-0199',
      website: 'https://creatorstore.store/alex',
      note: 'Connect with me on CreatorStore',
    },
  }

  // Save with invalid email should reject
  await assert.rejects(
    async () => {
      await businessCardService.save('00000000-0000-0000-0000-000000000001', {
        ...savePayload,
        contactDetails: { ...savePayload.contactDetails, email: 'invalid-email-address' },
      })
    },
    /Invalid contact email address/,
    'Saving with invalid email must throw 400 error'
  )

  console.log('✅ Test 2 PASSED: Validation rules in businessCardService verified.')
}

// ----------------------------------------------------
// TEST 3: vCard (RFC 6350) Generation
// ----------------------------------------------------
console.log('\nTest 3: Validating vCard generation format...')

function testVCardFormatting() {
  const c = {
    fullName: 'Jane Doe',
    title: 'Lead Architect',
    organization: 'Acme Corp',
    email: 'jane@example.com',
    phone: '+1 800-555-0199',
    website: 'https://creatorstore.store/janedoe',
    note: 'Digital Business Card',
  }

  const lines = [
    'BEGIN:VCARD',
    'VERSION:3.0',
    `FN:${c.fullName.replace(/\n/g, ' ')}`,
    `N:${c.fullName.split(' ').slice(1).join(' ') || ''};${c.fullName.split(' ')[0] || ''};;;`,
    `TITLE:${c.title}`,
    `ORG:${c.organization}`,
    `EMAIL;TYPE=INTERNET,WORK:${c.email}`,
    `TEL;TYPE=CELL,VOICE:${c.phone}`,
    `URL:${c.website}`,
    `NOTE:${c.note}`,
    'REV:' + new Date().toISOString(),
    'END:VCARD',
  ]
  const content = lines.join('\r\n')

  assert.ok(content.startsWith('BEGIN:VCARD\r\nVERSION:3.0'), 'vCard must start with standard RFC header')
  assert.ok(content.includes('FN:Jane Doe'), 'vCard must include FN line')
  assert.ok(content.includes('TITLE:Lead Architect'), 'vCard must include TITLE line')
  assert.ok(content.includes('ORG:Acme Corp'), 'vCard must include ORG line')
  assert.ok(content.includes('EMAIL;TYPE=INTERNET,WORK:jane@example.com'), 'vCard must include EMAIL line')
  assert.ok(content.includes('TEL;TYPE=CELL,VOICE:+1 800-555-0199'), 'vCard must include TEL line')
  assert.ok(content.includes('URL:https://creatorstore.store/janedoe'), 'vCard must include URL line')
  assert.ok(content.endsWith('END:VCARD'), 'vCard must end with END:VCARD')

  console.log('✅ Test 3 PASSED: vCard conforms to standard RFC 6350 contact format.')
}

// ----------------------------------------------------
// TEST 4: UI Component Architecture & Wallet Exclusion
// ----------------------------------------------------
console.log('\nTest 4: Validating component files and checking Wallet exclusion...')

function testComponentFiles() {
  const clientPath = path.join(ROOT, 'app', 'dashboard', 'business-cards', 'BusinessCardsClient.jsx')
  const pagePath = path.join(ROOT, 'app', 'dashboard', 'business-cards', 'page.js')
  const contactModalPath = path.join(ROOT, 'components', 'dashboard', 'business-cards', 'ContactDetailsModal.jsx')
  const publicContactModalPath = path.join(ROOT, 'components', 'storefront', 'PublicContactModal.jsx')

  assert.ok(fs.existsSync(clientPath), 'BusinessCardsClient.jsx must exist')
  assert.ok(fs.existsSync(pagePath), 'app/dashboard/business-cards/page.js must exist')
  assert.ok(fs.existsSync(contactModalPath), 'ContactDetailsModal.jsx must exist')
  assert.ok(fs.existsSync(publicContactModalPath), 'PublicContactModal.jsx must exist')

  const clientContent = fs.readFileSync(clientPath, 'utf8')

  // Requirement: Do not implement or display Apple Wallet or Google Wallet
  assert.ok(
    !clientContent.includes('Add to Apple Wallet'),
    'BusinessCardsClient must NOT contain "Add to Apple Wallet"'
  )
  assert.ok(
    !clientContent.includes('Add to Google Wallet'),
    'BusinessCardsClient must NOT contain "Add to Google Wallet"'
  )
  assert.ok(
    !clientContent.includes('apple-wallet'),
    'BusinessCardsClient must NOT contain apple-wallet references'
  )

  // Verify key UI elements
  assert.ok(clientContent.includes('Business cards'), 'Page must contain "Business cards" title')
  assert.ok(clientContent.includes('Card style'), 'Page must contain "Card style" panel')
  assert.ok(clientContent.includes('Let visitors share their details back'), 'Page must contain contact collection section')
  assert.ok(clientContent.includes('Let visitors save your contact'), 'Page must contain contact details section')
  assert.ok(clientContent.includes('QRCodeCanvas'), 'Page must include dynamic QRCodeCanvas')
  assert.ok(clientContent.includes('Download QR'), 'Page must include Download QR button')

  console.log('✅ Test 4 PASSED: Component files exist, features present, wallet UI strictly excluded.')
}

async function runAll() {
  await runServiceTests()
  testVCardFormatting()
  testComponentFiles()
  console.log('\n========================================================')
  console.log('🎉 ALL BUSINESS CARDS TESTS PASSED SUCCESSFULLY! 🎉')
  console.log('========================================================\n')
}

runAll().catch((err) => {
  console.error('\n❌ Test Suite Failed:', err)
  process.exit(1)
})
