import assert from 'node:assert'
import { getAppUrl } from '../config/site.js'
import { purchaseConfirmationEmailTemplate } from '../lib/emailTemplates.js'
import { guestAccessService } from '../lib/services.js'

function extractCtaHref(html, buttonText) {
  const regex = new RegExp(`<a[^>]+href="([^"]+)"[^>]*>[\\s\\S]*?${buttonText}[\\s\\S]*?<\\/a>`, 'i')
  const match = html.match(regex)
  if (match) return match[1]

  const spanRegex = new RegExp(`<a[^>]+href="([^"]+)"[^>]*>[\\s\\S]*?<span>[\\s\\S]*?${buttonText}[\\s\\S]*?<\\/span>[\\s\\S]*?<\\/a>`, 'i')
  const spanMatch = html.match(spanRegex)
  if (spanMatch) return spanMatch[1]

  return null
}

function extractVisitStoreHref(html) {
  const match = html.match(/<a[^>]+href="([^"]+)"[^>]*>\s*Visit Store\s*<\/a>/i)
  return match ? match[1] : null
}

async function runTests() {
  console.log('=== RUNNING PURCHASE EMAIL CTA & SECURE ACCESS REGRESSION TESTS ===\n')

  const originalEnv = { ...process.env }

  try {
    // ----------------------------------------------------
    // TEST 1: Railway production NEXT_PUBLIC_APP_URL canonical access URL
    // ----------------------------------------------------
    process.env.NEXT_PUBLIC_APP_URL = 'https://creatorstore.store'
    delete process.env.APP_URL
    delete process.env.NEXT_PUBLIC_BASE_URL
    delete process.env.NEXT_PUBLIC_SITE_URL

    const testSecureToken = 'SECURE_TOKEN_ABC123XYZ'
    const generatedAccessUrl = getAppUrl(`/access/${testSecureToken}`)
    console.log('[Test 1] Generated production access URL:', generatedAccessUrl)
    assert.strictEqual(
      generatedAccessUrl,
      'https://creatorstore.store/access/SECURE_TOKEN_ABC123XYZ',
      'Should correctly format production access URL'
    )

    // ----------------------------------------------------
    // TEST 2: Paid purchase confirmation email HTML inspection
    // ----------------------------------------------------
    const paidEmail = purchaseConfirmationEmailTemplate({
      customerName: 'Mohan Kumar',
      creatorName: 'Mohan Studio',
      productTitle: 'Instagram Growth Masterclass',
      amount: 999,
      currency: 'INR',
      orderId: 'ord_paid_998877',
      accessUrl: generatedAccessUrl,
      purchaseDate: new Date('2026-09-21T12:00:00Z'),
    })

    const paidCtaHref = extractCtaHref(paidEmail.html, 'ACCESS PRODUCT')
    console.log('[Test 2] Paid Email ACCESS PRODUCT href:', paidCtaHref)

    assert.strictEqual(
      paidCtaHref,
      'https://creatorstore.store/access/SECURE_TOKEN_ABC123XYZ',
      'ACCESS PRODUCT href must exactly equal https://creatorstore.store/access/SECURE_TOKEN_ABC123XYZ'
    )
    assert(!paidCtaHref.includes('localhost'), 'ACCESS PRODUCT href must NOT contain localhost')
    assert(!paidCtaHref.includes('8080'), 'ACCESS PRODUCT href must NOT contain 8080')
    assert(!paidCtaHref.includes('127.0.0.1'), 'ACCESS PRODUCT href must NOT contain 127.0.0.1')
    assert(!paidCtaHref.includes('/mohan243233/aa'), 'ACCESS PRODUCT href must NOT be direct product URL')
    assert(paidCtaHref.startsWith('https://creatorstore.store/access/'), 'ACCESS PRODUCT must start with https://creatorstore.store/access/')

    // Check Visit Store link
    const visitStoreHref = extractVisitStoreHref(paidEmail.html)
    console.log('[Test 2] Visit Store href:', visitStoreHref)
    assert.strictEqual(visitStoreHref, 'https://creatorstore.store', 'Visit Store href must point to public site')

    // ----------------------------------------------------
    // TEST 3: Free (₹0) purchase confirmation email HTML inspection
    // ----------------------------------------------------
    const freeSecureToken = 'FREE_SECURE_TOKEN_FREE99'
    const freeAccessUrl = getAppUrl(`/access/${freeSecureToken}`)

    const freeEmail = purchaseConfirmationEmailTemplate({
      customerName: 'Aarav Sharma',
      creatorName: 'Aarav Art',
      productTitle: 'Free Brush Starter Pack',
      amount: 0,
      currency: 'INR',
      orderId: 'ord_free_112233',
      accessUrl: freeAccessUrl,
      purchaseDate: new Date('2026-09-21T12:00:00Z'),
    })

    const freeCtaHref = extractCtaHref(freeEmail.html, 'ACCESS PRODUCT')
    console.log('[Test 3] Free Email ACCESS PRODUCT href:', freeCtaHref)

    assert.strictEqual(
      freeCtaHref,
      'https://creatorstore.store/access/FREE_SECURE_TOKEN_FREE99',
      'Free Email ACCESS PRODUCT href must equal https://creatorstore.store/access/FREE_SECURE_TOKEN_FREE99'
    )
    assert(!freeCtaHref.includes('localhost'), 'Free email CTA must not contain localhost')
    assert(!freeCtaHref.includes('8080'), 'Free email CTA must not contain 8080')
    assert(!freeCtaHref.includes('127.0.0.1'), 'Free email CTA must not contain 127.0.0.1')

    // ----------------------------------------------------
    // TEST 4: Missing accessUrl throws descriptive error (no silent localhost fallback)
    // ----------------------------------------------------
    console.log('[Test 4] Verifying missing accessUrl throws error...')
    assert.throws(
      () => {
        purchaseConfirmationEmailTemplate({
          customerName: 'Test User',
          creatorName: 'Test Creator',
          productTitle: 'Test Product',
          amount: 500,
          currency: 'INR',
          orderId: 'ord_missing_access',
          accessUrl: null, // missing
        })
      },
      /Missing required secure accessUrl/,
      'Template must throw an error when accessUrl is missing'
    )
    console.log('✓ PASS: Email template strictly requires secure accessUrl and does not silently fall back')

    // ----------------------------------------------------
    // TEST 5: Security audit — No JWT or storage tokens in email
    // ----------------------------------------------------
    console.log('[Test 5] Security check on email contents...')
    const allEmailContent = paidEmail.html + ' ' + paidEmail.text + ' ' + freeEmail.html + ' ' + freeEmail.text
    assert(!allEmailContent.includes('supabase'), 'Email must never expose Supabase URLs')
    assert(!allEmailContent.includes('bearer'), 'Email must never contain auth tokens')
    assert(!allEmailContent.includes('jwt'), 'Email must never contain JWT references')
    assert(!allEmailContent.includes('token_hash'), 'Email must never contain database token hashes')
    console.log('✓ PASS: Zero sensitive tokens, hashes, or Supabase URLs exposed')

    // ----------------------------------------------------
    // TEST 6: Production fallback when env var is unset
    // ----------------------------------------------------
    delete process.env.NEXT_PUBLIC_APP_URL
    process.env.NODE_ENV = 'production'
    const fallbackUrl = getAppUrl('/access/PROD_FALLBACK_TOKEN')
    console.log('[Test 6] Production fallback URL without env var:', fallbackUrl)
    assert.strictEqual(
      fallbackUrl,
      'https://creatorstore.store/access/PROD_FALLBACK_TOKEN',
      'In production, getAppUrl must default to https://creatorstore.store'
    )
    assert(!fallbackUrl.includes('localhost'), 'Production fallback must not include localhost')

    // ----------------------------------------------------
    // TEST 7: /access/[token] Canonical Redirect Generation in Production
    // ----------------------------------------------------
    process.env.NEXT_PUBLIC_APP_URL = 'https://creatorstore.store'
    process.env.NODE_ENV = 'production'

    const simulatedCreatorSlug = 'mohan243233'
    const simulatedProductSlug = 'aaaaa'
    const relativeRedirectPath = `/${simulatedCreatorSlug}/${simulatedProductSlug}`
    const productionRedirectUrl = getAppUrl(relativeRedirectPath)
    console.log('[Test 7] Production Access Redirect URL:', productionRedirectUrl)
    assert.strictEqual(
      productionRedirectUrl,
      'https://creatorstore.store/mohan243233/aaaaa',
      'Access route redirect must resolve to https://creatorstore.store/mohan243233/aaaaa'
    )
    assert(!productionRedirectUrl.includes('localhost'), 'Production redirect must not contain localhost')
    assert(!productionRedirectUrl.includes('8080'), 'Production redirect must not contain 8080')

    // ----------------------------------------------------
    // TEST 8: Local Development Mode Resolution
    // ----------------------------------------------------
    process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000'
    process.env.NODE_ENV = 'development'
    delete process.env.RAILWAY_ENVIRONMENT
    delete process.env.VERCEL_ENV
    delete process.env.PORT

    const devAccessUrl = getAppUrl('/access/DEV_TOKEN_123')
    const devProductUrl = getAppUrl('/mohan243233/aaaaa')
    console.log('[Test 8] Local development access URL:', devAccessUrl)
    console.log('[Test 8] Local development product URL:', devProductUrl)
    assert.strictEqual(devAccessUrl, 'http://localhost:3000/access/DEV_TOKEN_123')
    assert.strictEqual(devProductUrl, 'http://localhost:3000/mohan243233/aaaaa')

    console.log('\n=== ALL PURCHASE EMAIL & ACCESS ROUTE REGRESSION TESTS PASSED (8/8) ===\n')
  } finally {
    process.env = originalEnv
  }
}

runTests().catch((err) => {
  console.error('Test failed:', err)
  process.exit(1)
})
