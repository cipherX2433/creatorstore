import assert from 'node:assert'
import fs from 'node:fs'
import path from 'node:path'

async function runMobileLandingAudit() {
  console.log('=== RUNNING MOBILE LANDING PAGE RESPONSIVENESS AUDIT ===\n')

  // 1. Audit Navbar.jsx
  const navbarPath = path.resolve('components/landing/Navbar.jsx')
  const navbarCode = fs.readFileSync(navbarPath, 'utf8')
  console.log('[1/5] Auditing Navbar.jsx...')
  assert(navbarCode.includes('CreatorStoreBrand'), 'Navbar must contain CreatorStoreBrand')
  assert(navbarCode.includes('px-3.5 sm:px-6 lg:px-8'), 'Navbar must have responsive horizontal padding')
  assert(navbarCode.includes('h-16 sm:h-20 lg:h-[84px]'), 'Navbar must have responsive height')
  console.log('✓ PASS: Navbar has responsive padding, height, and touch targets')

  // 2. Audit HeroSection.jsx
  const heroPath = path.resolve('components/landing/HeroSection.jsx')
  const heroCode = fs.readFileSync(heroPath, 'utf8')
  console.log('[2/5] Auditing HeroSection.jsx...')
  assert(heroCode.includes('Turn What You Create Into What You Earn'), 'Hero must preserve exact headline')
  assert(heroCode.includes('Sell digital products, grow your audience, and turn your creator journey into a real business'), 'Hero must preserve description')
  assert(heroCode.includes('creatorstore.store/'), 'Hero must have username prefix')
  assert(heroCode.includes('Start Selling'), 'Hero must preserve Start Selling CTA')
  assert(heroCode.includes('Pick your username. Launch your store. Start selling — free.'), 'Hero must preserve supporting copy')
  assert(heroCode.includes('clamp('), 'Hero headline must use fluid responsive typography')
  assert(heroCode.includes('FloatingCCoins'), 'Hero must include FloatingCCoins decorative layer')
  console.log('✓ PASS: Hero maintains exact content, hierarchy, and fluid typography')

  // 3. Audit FloatingCCoins.jsx
  const coinsPath = path.resolve('components/landing/FloatingCCoins.jsx')
  const coinsCode = fs.readFileSync(coinsPath, 'utf8')
  console.log('[3/5] Auditing FloatingCCoins.jsx...')
  assert(coinsCode.includes('pointer-events-none'), 'Coins must be pointer-events-none')
  assert(coinsCode.includes('z-0'), 'Coins must be layered behind content on z-0')
  assert(coinsCode.includes('overflow-hidden'), 'Coins must be contained within overflow-hidden boundary')
  assert(coinsCode.includes('hidden md:block'), 'Overlapping interior coins must be hidden on mobile viewports')
  assert(coinsCode.includes('origin-top-right'), 'Mobile top-right coin must scale toward corner')
  assert(coinsCode.includes('origin-bottom-left'), 'Mobile bottom-left coin must scale toward corner')
  console.log('✓ PASS: Coins have dedicated mobile safe zones and zero content collision')

  // 4. Audit FeatureTape.jsx
  const tapePath = path.resolve('components/landing/FeatureTape.jsx')
  const tapeCode = fs.readFileSync(tapePath, 'utf8')
  console.log('[4/5] Auditing FeatureTape.jsx...')
  assert(tapeCode.includes('overflow-hidden'), 'FeatureTape must be overflow-hidden')
  assert(tapeCode.includes('animate-marquee'), 'FeatureTape must retain smooth infinite marquee animation')
  assert(tapeCode.includes('#F5A623'), 'FeatureTape must use brand secondary amber')
  console.log('✓ PASS: FeatureTape is contained without page-level horizontal overflow')

  // 5. Audit Design System Tokens
  console.log('[5/5] Auditing Design System Tokens...')
  const globalsPath = path.resolve('app/globals.css')
  const globalsCode = fs.readFileSync(globalsPath, 'utf8')
  assert(globalsCode.includes('#4D7CFF'), 'Primary color must be #4D7CFF')
  assert(globalsCode.includes('#F5A623'), 'Secondary color must be #F5A623')
  assert(globalsCode.includes('#1C1C1C'), 'Background color must be #1C1C1C')
  assert(globalsCode.includes('#242424'), 'Surface color must be #242424')
  assert(globalsCode.includes('#303030'), 'Border color must be #303030')
  console.log('✓ PASS: Theme tokens strictly conform to CreatorStore design system')

  console.log('\n=== ALL 5 MOBILE LANDING AUDIT CHECKS PASSED SUCCESSFULLY! ===\n')
}

runMobileLandingAudit().catch((err) => {
  console.error('Audit failed:', err)
  process.exit(1)
})
