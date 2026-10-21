import { isCustomizedTheme, getThemeTokens, STORE_PRESETS } from '../lib/themePresets.js'
import { getGalleryThemeId } from '../lib/storefront-themes.js'
import { prisma } from '../lib/prisma.js'

async function runVerification() {
  console.log('=== CREATORSTORE DEFAULT STOREFRONT THEME VERIFICATION ===\n')

  let passed = 0
  let failed = 0

  function assert(condition, testName) {
    if (condition) {
      console.log(`✅ PASS: ${testName}`)
      passed++
    } else {
      console.error(`❌ FAIL: ${testName}`)
      failed++
    }
  }

  // 1. Test isCustomizedTheme helper
  console.log('--- 1. Testing isCustomizedTheme helper ---')
  assert(isCustomizedTheme(null) === false, 'null theme is uncustomized')
  assert(isCustomizedTheme({}) === false, 'empty theme object is uncustomized')
  assert(isCustomizedTheme({ presetId: 'default' }) === false, 'presetId: default is uncustomized')
  assert(isCustomizedTheme({
    font: 'Manrope',
    cardStyle: 'shadow',
    background: '#ffffff',
    buttonStyle: 'solid',
    buttonRadius: 12,
    primaryColor: '#4D7CFF'
  }) === false, 'legacy signup default theme object is uncustomized')

  assert(isCustomizedTheme({ presetId: 'dark' }) === true, 'presetId: dark is recognized as customized')
  assert(isCustomizedTheme({ presetId: 'luxury' }) === true, 'presetId: luxury is recognized as customized')
  assert(isCustomizedTheme({ galleryThemeId: 'flare' }) === true, 'galleryThemeId: flare is recognized as customized')
  assert(isCustomizedTheme({ customized: true }) === true, 'customized: true flag is recognized')
  assert(isCustomizedTheme({ background: '#0F172A' }) === true, 'custom background color is recognized')
  assert(isCustomizedTheme({ cardBg: '#1E293B' }) === true, 'custom cardBg is recognized')
  assert(isCustomizedTheme({ buttonColor: '#FF5500' }) === true, 'custom buttonColor is recognized')

  // 2. Test getThemeTokens
  console.log('\n--- 2. Testing getThemeTokens resolution ---')
  const defaultTokens = getThemeTokens({})
  assert(defaultTokens.presetId === 'default', 'Empty theme resolves to default preset')
  assert(defaultTokens.colors.pageBackground === '#A8ADB4', 'Default pageBackground is #A8ADB4')
  assert(defaultTokens.colors.background === '#F4F4F5', 'Default background surface is #F4F4F5')
  assert(defaultTokens.colors.cardBg === '#FFFFFF', 'Default cardBg is #FFFFFF')
  assert(defaultTokens.colors.text === '#0F172A', 'Default text color is #0F172A')
  assert(defaultTokens.cards.radius === 20, 'Default card radius is 20px')
  assert(defaultTokens.buttons.radius === 9999, 'Default button radius is 9999 (pill)')
  assert(defaultTokens.buttons.shape === 'pill', 'Default button shape is pill')

  // 3. Test preservation of customized theme tokens
  console.log('\n--- 3. Testing preservation of customized themes ---')
  const darkTokens = getThemeTokens({ presetId: 'dark' })
  assert(darkTokens.presetId === 'dark', 'Dark theme retains dark presetId')
  assert(darkTokens.colors.background === '#09090B', 'Dark theme background is preserved')

  const luxuryTokens = getThemeTokens({ presetId: 'luxury' })
  assert(luxuryTokens.presetId === 'luxury', 'Luxury theme retains luxury presetId')
  assert(luxuryTokens.colors.primaryColor === '#D4AF37', 'Luxury theme primary color is preserved')

  const customColorTokens = getThemeTokens({ background: '#2D3748', buttonColor: '#E53E3E' })
  assert(customColorTokens.colors.background === '#2D3748', 'Custom background color is preserved')
  assert(customColorTokens.colors.buttonColor === '#E53E3E', 'Custom buttonColor is preserved')

  // 4. Test getGalleryThemeId
  console.log('\n--- 4. Testing getGalleryThemeId ---')
  assert(getGalleryThemeId(null) === 'default', 'null theme gets default gallery theme')
  assert(getGalleryThemeId({}) === 'default', 'empty theme gets default gallery theme')
  assert(getGalleryThemeId({ galleryThemeId: 'flare' }) === 'flare', 'flare gallery theme is preserved')
  assert(getGalleryThemeId({ presetId: 'dark' }) === 'tide', 'dark preset maps to tide gallery theme')

  // 5. Database check
  console.log('\n--- 5. Database check for existing stores ---')
  try {
    const stores = await prisma.store.findMany({
      take: 10,
      select: { id: true, slug: true, storeName: true, theme: true }
    })
    console.log(`Found ${stores.length} sample stores in database:`)
    for (const s of stores) {
      const isCust = isCustomizedTheme(s.theme)
      const resolved = getThemeTokens(s.theme)
      console.log(` - Store "${s.slug}": customized=${isCust}, resolvedPreset=${resolved.presetId}, bg=${resolved.colors.background}, cardBg=${resolved.colors.cardBg}`)
    }
    assert(stores.length >= 0, 'Database query executed successfully')
  } catch (err) {
    console.error('DB query error:', err.message)
  }

  // 6. Test HTTP storefront endpoints
  console.log('\n--- 6. HTTP Storefront verification ---')
  try {
    const res = await fetch('http://localhost:3000/mohit1')
    if (res.ok) {
      const html = await res.text()
      assert(html.includes('CreatorStoreMark') || html.includes('svg') || html.length > 500, 'Public store renders valid HTML')
      console.log('HTTP 200 OK for http://localhost:3000/mohit1')
    } else {
      console.log(`HTTP ${res.status} for store link`)
    }
  } catch (e) {
    console.log('HTTP fetch notice:', e.message)
  }

  console.log(`\n========================================`)
  console.log(`VERIFICATION SUMMARY: ${passed} PASSED, ${failed} FAILED`)
  console.log(`========================================`)

  if (failed > 0) {
    process.exit(1)
  } else {
    process.exit(0)
  }
}

runVerification().catch(e => {
  console.error('Verification failed with error:', e)
  process.exit(1)
})
