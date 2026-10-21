import assert from 'node:assert'
import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()

console.log('--- Starting Instagram Connect & Menu Option Verification Tests ---\n')

// 1. Verify app/dashboard/store/page.js
console.log('1. Verifying store/page.js Instagram handlers and onSelectOption wiring...')
const pagePath = path.join(ROOT, 'app/dashboard/store/page.js')
assert.ok(fs.existsSync(pagePath), 'store/page.js must exist')
const pageContent = fs.readFileSync(pagePath, 'utf8')

// Check handler definitions
assert.ok(pageContent.includes('async function handleConnectInstagram()'), 'Must define handleConnectInstagram')
assert.ok(pageContent.includes('async function handleDisconnectInstagram()'), 'Must define handleDisconnectInstagram')
assert.ok(pageContent.includes('const connectInstagram = handleConnectInstagram'), 'Must provide connectInstagram alias')
assert.ok(pageContent.includes('const disconnectInstagram = handleDisconnectInstagram'), 'Must provide disconnectInstagram alias')

// Check onSelectOption branch
const onSelectMatch = pageContent.match(/opt\.type === 'instagram'[\s\S]*?(?:handleDisconnectInstagram[\s\S]*?handleConnectInstagram|disconnectInstagram[\s\S]*?connectInstagram)/)
assert.ok(onSelectMatch, 'onSelectOption must handle opt.type === "instagram" with defined handlers')

// Ensure no bare undefined calls exist
assert.ok(!pageContent.includes('} else {\n                  connectInstagram()\n                }'), 'Must not call undeclared connectInstagram')

console.log('✅ store/page.js Instagram handlers verified.\n')

// 2. Verify complete onSelectOption coverage for all WIZARD_OPTIONS in AddToStoreMenuView
console.log('2. Verifying AddToStoreMenuView options are handled in store/page.js...')
const menuViewPath = path.join(ROOT, 'components/dashboard/AddToStoreMenuView.jsx')
assert.ok(fs.existsSync(menuViewPath), 'AddToStoreMenuView.jsx must exist')
const menuViewContent = fs.readFileSync(menuViewPath, 'utf8')

// Extract option types
const typeMatches = [...menuViewContent.matchAll(/type:\s*'([^']+)'/g)].map(m => m[1])
const uniqueTypes = [...new Set(typeMatches)]

console.log(`Found ${uniqueTypes.length} unique option types in AddToStoreMenuView:`, uniqueTypes)

for (const type of uniqueTypes) {
  const handled =
    pageContent.includes(`opt.type === '${type}'`) ||
    pageContent.includes(`'${type}'`) ||
    (type.startsWith('form_') && pageContent.includes("opt.type === 'form'"))
  assert.ok(handled, `Option type "${type}" must have an active handler in onSelectOption`)
}

console.log('✅ All menu options have valid handlers in store/page.js.\n')

// 3. Verify Backend Instagram API routes
console.log('3. Verifying Backend Instagram endpoints...')
const routePath = path.join(ROOT, 'app/api/[[...path]]/route.js')
assert.ok(fs.existsSync(routePath), 'route.js must exist')
const routeContent = fs.readFileSync(routePath, 'utf8')

assert.ok(routeContent.includes("route === '/integrations/instagram/oauth'"), 'Must have /integrations/instagram/oauth')
assert.ok(routeContent.includes("route === '/integrations/instagram/callback'"), 'Must have /integrations/instagram/callback')
assert.ok(routeContent.includes("route === '/integrations/instagram/status'"), 'Must have /integrations/instagram/status')
assert.ok(routeContent.includes("route === '/integrations/instagram/account'"), 'Must have /integrations/instagram/account')
assert.ok(routeContent.includes('instagramService.getOAuthUrl'), 'Must invoke instagramService.getOAuthUrl')
assert.ok(routeContent.includes('instagramService.disconnectAccount'), 'Must invoke instagramService.disconnectAccount')

console.log('✅ Backend Instagram endpoints verified.\n')

console.log('🎉 ALL INSTAGRAM & MENU AUDIT CHECKS PASSED SUCCESSFULLY! 🎉\n')
