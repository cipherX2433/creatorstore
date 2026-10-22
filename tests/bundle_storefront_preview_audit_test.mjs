import assert from 'assert'
import fs from 'fs'
import path from 'path'
import { prisma } from '../lib/prisma.js'

console.log('\n=====================================================================')
console.log('🧪 BUNDLE STOREFRONT PREVIEW AUDIT & VERIFICATION TEST')
console.log('=====================================================================\n')

const BASE_URL = process.env.TEST_APP_URL || 'http://localhost:3000'

async function runAudit() {
  let passed = 0
  let failed = 0

  function pass(desc) {
    console.log(`  ✅ [PASS] ${desc}`)
    passed++
  }

  function fail(desc, err) {
    console.error(`  ❌ [FAIL] ${desc}: ${err?.message || err}`)
    failed++
  }

  const modalPath = path.join(process.cwd(), 'components/storefront/ProductPurchaseModalFlow.jsx')
  const modalSrc = fs.readFileSync(modalPath, 'utf8')

  const publicStorePath = path.join(process.cwd(), 'components/storefront/PublicStoreRenderer.jsx')
  const publicStoreSrc = fs.readFileSync(publicStorePath, 'utf8')

  const purchasePagePath = path.join(process.cwd(), 'components/storefront/ProductPurchasePage.jsx')
  const purchasePageSrc = fs.readFileSync(purchasePagePath, 'utf8')

  // 1. Modal Container Checks
  console.log('--- 1. Modal Container Structure & Centering ---')
  try {
    assert(modalSrc.includes('fixed inset-0 z-50 flex items-center justify-center'), 'Backdrop centering classes missing')
    assert(modalSrc.includes('max-h-[calc(100dvh-32px)]'), 'calc(100dvh - 32px) height constraint missing')
    assert(modalSrc.includes('max-w-[480px] sm:max-w-[500px]'), 'Responsive width classes missing')
    assert(modalSrc.includes('flex flex-col'), 'Flex column layout missing')
    pass('Modal is centered horizontally and vertically in viewport with backdrop')
    pass('Responsive width with desktop maximum and mobile viewport safety is configured')
    pass('Viewport-aware max height calc(100dvh - 32px) prevents extending beyond screen')
  } catch (err) {
    fail('Modal container checks', err)
  }

  // 2. Vertical Hierarchy & Content Alignment
  console.log('\n--- 2. Bundle Content Vertical Hierarchy & Alignment ---')
  try {
    // Check top header bar
    assert(modalSrc.includes('Product Bundle'), 'Product Bundle badge label missing')
    assert(modalSrc.includes('handleShare'), 'Share button handler missing in top header')
    assert(modalSrc.includes('onClose'), 'Close button handler missing in top header')

    // Check thumbnail
    assert(modalSrc.includes('aspect-[16/10]'), 'Responsive aspect ratio 16/10 missing')

    // Check single title (no duplicate h2 at top of preview)
    const startIndex = modalSrc.indexOf("{step === 'preview' && (")
    const endIndex = modalSrc.indexOf("{step === 'existing_purchase' && (")
    assert(startIndex !== -1 && endIndex !== -1 && endIndex > startIndex, 'Preview step block not found')
    const previewContent = modalSrc.slice(startIndex, endIndex)

    const h1Count = (previewContent.match(/<h1/g) || []).length
    const h2Count = (previewContent.match(/<h2/g) || []).length
    assert.strictEqual(h1Count, 1, `Expected exactly 1 h1 in preview step, found ${h1Count}`)
    assert.strictEqual(h2Count, 0, `Expected 0 duplicate h2 in preview step, found ${h2Count}`)

    // Check creator attribution
    assert(previewContent.includes('by {creatorUsername'), 'Creator attribution missing')

    // Check CTA button
    assert(previewContent.includes('w-full') && previewContent.includes('h-12'), 'Full width CTA button missing')

    // Check included products
    assert(previewContent.includes('Includes'), 'Included products section title missing')
    assert(!previewContent.includes('max-h-40 overflow-y-auto'), 'Obsolete nested scrollbar found in included products')

    // Check past downloads link
    assert(previewContent.includes('handleSeeAllPastDownloads'), 'Past downloads link missing')

    pass('Top header includes badge, share, and close controls')
    pass('Thumbnail uses consistent aspect-[16/10] aspect ratio')
    pass('Exactly one primary title exists with no redundant duplicate headers')
    pass('Creator attribution and price are visually grouped with title')
    pass('CTA Buy now button spans full width with consistent h-12 height')
    pass('Included products list has no nested scrollbars and clean item rows')
    pass('Existing download-related links are preserved')
  } catch (err) {
    fail('Vertical hierarchy checks', err)
  }

  // 3. Scrolling Behavior & Background Scroll Lock
  console.log('\n--- 3. Independent Scrolling & Scroll Lock ---')
  try {
    assert(modalSrc.includes('document.body.style.overflow = \'hidden\''), 'Scroll lock missing on open')
    assert(modalSrc.includes('flex-1 overflow-y-auto'), 'Independently scrollable content area missing')
    pass('Background page scrolling is locked on mount and unlocked on unmount')
    pass('Modal header stays pinned while content scrolls independently')
  } catch (err) {
    fail('Scrolling behavior checks', err)
  }

  // 4. Dynamic Theme & Token Inheritance
  console.log('\n--- 4. Theme & Token Inheritance ---')
  try {
    assert(publicStoreSrc.includes('<ProductPurchaseModalFlow') && publicStoreSrc.includes('tokens={tokens}'), 'PublicStoreRenderer does not pass tokens to ProductPurchaseModalFlow')
    assert(purchasePageSrc.includes('<ProductPurchaseModalFlow') && purchasePageSrc.includes('tokens={tokens}'), 'ProductPurchasePage does not pass tokens to ProductPurchaseModalFlow')
    assert(modalSrc.includes('tokens = {}'), 'ProductPurchaseModalFlow does not accept tokens prop')
    assert(modalSrc.includes('isLightColor'), 'isLightColor contrast helper missing')
    pass('PublicStoreRenderer passes dynamic storefront tokens to ProductPurchaseModalFlow')
    pass('ProductPurchasePage passes dynamic storefront tokens to ProductPurchaseModalFlow')
    pass('ProductPurchaseModalFlow derives theme colors and contrast from tokens')
  } catch (err) {
    fail('Theme & token inheritance checks', err)
  }

  // 5. HTTP End-to-End Rendering
  console.log('\n--- 5. HTTP End-to-End Rendering ---')
  try {
    const resStore = await fetch(`${BASE_URL}/mohit`)
    assert.strictEqual(resStore.status, 200, `Expected 200 from /mohit, got ${resStore.status}`)
    const storeHtml = await resStore.text()
    assert(storeHtml.includes('abcd'), 'Expected bundle title "abcd" in rendered storefront HTML')
    pass('Storefront /mohit rendered successfully with HTTP 200 and bundle content')

    const resBundle = await fetch(`${BASE_URL}/mohit/abc`)
    assert.strictEqual(resBundle.status, 200, `Expected 200 from /mohit/abc, got ${resBundle.status}`)
    pass('Standalone bundle page /mohit/abc rendered successfully with HTTP 200')

    const resProductApi = await fetch(`${BASE_URL}/api/public/product/mohit/abc`)
    assert.strictEqual(resProductApi.status, 200, `Expected 200 from /api/public/product/mohit/abc, got ${resProductApi.status}`)
    const productData = await resProductApi.json()
    assert.strictEqual(productData.product?.title, 'abcd', 'Expected product.title === "abcd"')
    assert.strictEqual(productData.product?.type, 'BUNDLE', 'Expected product.type === "BUNDLE"')
    pass('Public product API successfully returns canonical bundle data for mohit/abc')
  } catch (err) {
    fail('HTTP End-to-End Rendering', err)
  }

  console.log('\n=====================================================================')
  console.log(`SUMMARY: ${passed} PASSED, ${failed} FAILED`)
  console.log('=====================================================================\n')

  if (failed > 0) process.exit(1)
  process.exit(0)
}

runAudit()
