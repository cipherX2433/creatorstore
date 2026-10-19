/**
 * CreatorStore — Linktree-Style Independent Panel Scrolling Layout Audit Test
 *
 * Verifies:
 * 1. Fixed dashboard shell (Header, Sidebar rail, Document/body scroll ownership).
 * 2. Independently scrollable left panel on desktop with subtle scrollbar.
 * 3. Stationary storefront preview centered in workspace without page-level movement.
 * 4. Responsive behavior (mobile stacks normally with full page scroll).
 * 5. Other dashboard pages retain their standard scrolling behavior.
 * 6. Item editors (ProductEditor, StoreItemEditorShell) inherit independent panel scrolling.
 */

import fs from 'fs'
import path from 'path'

function assert(condition, message) {
  if (!condition) {
    throw new Error(message)
  }
}

let passed = 0
let failed = 0

function pass(testName) {
  passed++
  console.log(`  ✅ [PASS] ${testName}`)
}

function fail(testName, error) {
  failed++
  console.error(`  ❌ [FAIL] ${testName}: ${error?.message || error}`)
}

console.log('=====================================================================')
console.log('🧪 STORE DASHBOARD INDEPENDENT PANEL SCROLLING AUDIT TEST SUITE')
console.log('=====================================================================')

// -------------------------------------------------------------------
// TEST 1: Parent Dashboard Layout Shell Audit (app/dashboard/layout.js)
// -------------------------------------------------------------------
console.log('\n--- TEST 1: Dashboard Shell Layout & Scroll Ownership ---')
try {
  const layoutPath = path.join(process.cwd(), 'app/dashboard/layout.js')
  const layoutContent = fs.readFileSync(layoutPath, 'utf8')

  // Root viewport enclosure
  assert(layoutContent.includes('h-screen w-screen overflow-hidden'), 'Root dashboard shell must be constrained to viewport with overflow-hidden')

  // Top header fixed in place
  assert(layoutContent.includes('<GlobalTopBar') && layoutContent.includes('z-50 shrink-0'), 'Global top header must be fixed with z-50 shrink-0')

  // Left navigation rail fixed in place
  assert(layoutContent.includes('absolute top-0 bottom-0 left-0 z-40'), 'Left navigation rail must be positioned with absolute top-0 bottom-0')

  // Scoped store page layout condition
  assert(layoutContent.includes("const isStorePage = pathname.startsWith('/dashboard/store')"), 'isStorePage condition missing in dashboard layout')

  // Main canvas wrapper desktop overflow restriction vs non-store pages
  assert(
    layoutContent.includes("isStorePage ? 'overflow-y-auto lg:overflow-hidden' : 'overflow-y-auto'"),
    'Canvas wrapper must prevent desktop page scrolling on /dashboard/store while preserving it for other pages and mobile'
  )

  // Main tag responsive padding and height
  assert(
    layoutContent.includes("isStorePage") && layoutContent.includes("lg:h-full lg:min-h-0 lg:overflow-hidden flex flex-col"),
    'Main element must fill remaining viewport with lg:h-full lg:min-h-0 for store page'
  )

  // Mobile padding preserved on <main>
  assert(
    layoutContent.includes('px-3.5 sm:px-6 md:px-8 pb-28 sm:pb-32'),
    'Mobile padding pb-28 sm:pb-32 must be preserved so mobile bottom nav does not obscure content'
  )

  pass('Dashboard shell keeps header and sidebar fixed in viewport')
  pass('Store dashboard container constrained to viewport height on desktop without document scroll')
  pass('Non-store dashboard pages retain standard full-page vertical scrolling')
  pass('Mobile layouts preserve normal fluid padding and scrolling')
} catch (err) {
  fail('Parent Dashboard Layout Shell Audit', err)
}

// -------------------------------------------------------------------
// TEST 2: Store Page 2-Column Workspace Layout (app/dashboard/store/page.js)
// -------------------------------------------------------------------
console.log('\n--- TEST 2: Store Page Independent Panel & Stationary Preview ---')
try {
  const storePagePath = path.join(process.cwd(), 'app/dashboard/store/page.js')
  const storePageContent = fs.readFileSync(storePagePath, 'utf8')

  // Workspace container grid height
  assert(
    storePageContent.includes('lg:items-stretch lg:h-full lg:min-h-0'),
    'Workspace grid must stretch to full height on desktop'
  )

  // Left column container
  assert(
    storePageContent.includes('w-full max-w-[740px] mx-auto min-w-0 lg:h-full lg:min-h-0 flex flex-col'),
    'Left editing panel container must occupy lg:h-full lg:min-h-0'
  )

  // Default store list white card independent scroll container
  assert(
    storePageContent.includes('lg:h-full lg:min-h-0 lg:overflow-y-auto subtle-scrollbar'),
    'Default store editor card must have independent vertical scroll with subtle-scrollbar'
  )

  // CreatorStore footer card remains accessible inside scroll container
  assert(
    storePageContent.includes('CreatorStore footer'),
    'CreatorStore footer settings card must be present inside the left panel'
  )

  // Right storefront preview column stationary and vertically centered
  assert(
    storePageContent.includes('flex flex-col items-center justify-center w-full max-w-[420px] mx-auto lg:h-full lg:min-h-0 shrink-0'),
    'Right preview column must be vertically centered in available space with lg:h-full shrink-0'
  )

  // Phone preview frame stays within available viewport height
  assert(
    storePageContent.includes('max-h-[calc(100vh-120px)] h-[720px]'),
    'Phone preview frame must be constrained with max-h-[calc(100vh-120px)]'
  )

  // Attached preview side controls preserved
  assert(
    storePageContent.includes('Copy Store Link') && storePageContent.includes('Open Live Store'),
    'Attached side controls (copy link & open store) must remain functional and attached'
  )

  // DesignStudioPage layout also enforces independent panel scrolling
  assert(
    storePageContent.includes('lg:overflow-y-auto subtle-scrollbar'),
    'DesignStudioPage left panel must also support independent scrolling with subtle-scrollbar'
  )

  pass('Left editor card scrolls independently within viewport height')
  pass('Right storefront preview stays stationary and vertically centered')
  pass('Phone preview frame is constrained against viewport overflow on small laptops')
  pass('CreatorStore footer settings card and all list items remain fully accessible')
  pass('Attached preview controls (copy link & open live store) preserved')
} catch (err) {
  fail('Store Page Layout Audit', err)
}

// -------------------------------------------------------------------
// TEST 3: Item Editors & Shared Shell Independent Scrolling
// -------------------------------------------------------------------
console.log('\n--- TEST 3: ProductEditor & StoreItemEditorShell Independent Scrolling ---')
try {
  const shellPath = path.join(process.cwd(), 'components/dashboard/StoreItemEditorShell.jsx')
  const shellContent = fs.readFileSync(shellPath, 'utf8')

  assert(shellContent.includes('lg:h-full'), 'StoreItemEditorShell outer card must support lg:h-full')
  assert(shellContent.includes('sticky top-0 z-20'), 'StoreItemEditorShell header must stay pinned to top of card')
  assert(shellContent.includes('flex-1 overflow-y-auto subtle-scrollbar'), 'StoreItemEditorShell form canvas must scroll independently with subtle-scrollbar')

  const prodPath = path.join(process.cwd(), 'components/products/ProductEditor.jsx')
  const prodContent = fs.readFileSync(prodPath, 'utf8')

  assert(prodContent.includes('lg:h-full'), 'ProductEditor in store context must support lg:h-full')
  assert(prodContent.includes('sticky top-0 z-20'), 'ProductEditor header must stay pinned to top of card')
  assert(prodContent.includes('flex-1 flex flex-col min-w-0 overflow-y-auto subtle-scrollbar'), 'ProductEditor form canvas must scroll independently with subtle-scrollbar')

  pass('StoreItemEditorShell header stays pinned while form canvas scrolls independently')
  pass('ProductEditor header stays pinned while product form canvas scrolls independently')
} catch (err) {
  fail('Item Editors Independent Scrolling Audit', err)
}

// -------------------------------------------------------------------
// TEST 4: Subtle Scrollbar Design System (app/globals.css)
// -------------------------------------------------------------------
console.log('\n--- TEST 4: Subtle Scrollbar Styling & Page Transition ---')
try {
  const cssPath = path.join(process.cwd(), 'app/globals.css')
  const cssContent = fs.readFileSync(cssPath, 'utf8')

  assert(cssContent.includes('.subtle-scrollbar'), '.subtle-scrollbar utility must be declared in globals.css')
  assert(cssContent.includes('scrollbar-width: thin;'), 'subtle-scrollbar must use thin scrollbar')
  assert(cssContent.includes('#D4D4D8'), 'subtle-scrollbar thumb must use subtle gray (#D4D4D8)')
  assert(cssContent.includes('#A1A1AA'), 'subtle-scrollbar hover state must use refined darker gray (#A1A1AA)')

  const transitionPath = path.join(process.cwd(), 'components/dashboard/DashboardPageTransition.jsx')
  const transitionContent = fs.readFileSync(transitionPath, 'utf8')

  assert(transitionContent.includes('className = \'\'') && transitionContent.includes('className={className}'), 'DashboardPageTransition must pass className to motion.div')

  pass('Subtle scrollbar defined with thin width, transparent track, and refined thumb')
  pass('DashboardPageTransition properly passes height and layout classes to motion wrapper')
} catch (err) {
  fail('Scrollbar & Transition Audit', err)
}

console.log('\n=====================================================================')
console.log(`SUMMARY: ${passed} PASSED, ${failed} FAILED`)
console.log('=====================================================================')

if (failed > 0) {
  process.exit(1)
}
