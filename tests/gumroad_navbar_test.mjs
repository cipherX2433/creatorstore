import assert from 'assert'
import fs from 'fs'
import path from 'path'
import http from 'http'

console.log('======================================================================')
console.log('CREATORSTORE — GUMROAD-INSPIRED NAVBAR TEST SUITE')
console.log('======================================================================\n')

const navbarPath = path.join(process.cwd(), 'components/landing/Navbar.jsx')
assert(fs.existsSync(navbarPath), 'Navbar.jsx must exist')
const navbarContent = fs.readFileSync(navbarPath, 'utf8')

console.log('▶ TEST 1: Container & Height Proportions')
assert(navbarContent.includes('bg-[#000000]'), 'Navbar must use solid black background #000000')
assert(navbarContent.includes('border-b border-[#303030]'), 'Navbar must use subtle bottom divider #303030')
assert(
  navbarContent.includes('h-[88px]') || navbarContent.includes('h-[92px]') || navbarContent.includes('h-[96px]'),
  'Navbar desktop height must target 88-96px'
)
console.log('   ✅ Solid black container, subtle divider, and 88-96px desktop height verified.')

console.log('\n▶ TEST 2: Prominent CreatorStore Logo')
assert(navbarContent.includes('Instrument Serif'), 'Must use Instrument Serif logo')
assert(navbarContent.includes('creatorstore'), 'Must render creatorstore brand wordmark')
assert(
  navbarContent.includes('text-[38px]') || navbarContent.includes('text-[42px]') || navbarContent.includes('lg:text-[40px]'),
  'Logo must be visually prominent (~170-190px wide on desktop)'
)
assert(!navbarContent.includes('github') && !navbarContent.includes('GitHub'), 'No GitHub badge beside logo')
console.log('   ✅ Prominent script logo verified with generous left padding.')

console.log('\n▶ TEST 3: Navigation Links & Active Pill Styling')
const requiredNavLinks = [
  { label: 'Home', href: '/' },
  { label: 'Features', href: '/features' },
  { label: 'Pricing', href: '/pricing' },
  { label: 'Safety', href: '/safety' },
  { label: 'How It Works', href: '/how-it-works' },
]

for (const link of requiredNavLinks) {
  assert(navbarContent.includes(`href="${link.href}"`), `Must include navigation link to ${link.href}`)
  assert(navbarContent.includes(link.label), `Must render link label ${link.label}`)
}

assert(
  navbarContent.includes('text-[20px]') || navbarContent.includes('text-[21px]'),
  'Desktop navigation links must use ~20-22px typography'
)
assert(navbarContent.includes('font-medium'), 'Must use medium font weight')
assert(
  navbarContent.includes('bg-white text-black font-semibold') && navbarContent.includes('rounded-full'),
  'Active link must use compact white rounded-pill with black text'
)
console.log('   ✅ All 5 primary navigation links, 20-22px typography, and white active pill verified.')

console.log('\n▶ TEST 4: Login Section & Vertical Divider')
assert(navbarContent.includes('Log in'), 'Must render Log in link')
assert(navbarContent.includes('border-l border-[#303030]'), 'Must include vertical divider before Login')
console.log('   ✅ Login section separated with subtle vertical divider.')

console.log('\n▶ TEST 5: Full-Height White "Start Selling" CTA')
assert(navbarContent.includes('Start selling'), 'Must render Start selling CTA')
assert(navbarContent.includes('bg-white') && navbarContent.includes('text-black'), 'CTA must have white background and black text')
assert(navbarContent.includes('rounded-none'), 'CTA must be rectangular without pill radius')
assert(navbarContent.includes('h-full'), 'CTA must span full navbar height')
assert(navbarContent.includes('pr-0'), 'CTA container must be flush against the right edge')
console.log('   ✅ Full-height rectangular white CTA verified flush to the right edge.')

console.log('\n▶ TEST 6: Mobile Menu & Preserved Authentication')
assert(navbarContent.includes('trackLoginClicked'), 'Must preserve login analytics')
assert(navbarContent.includes('trackSignupCtaClicked'), 'Must preserve signup analytics')
assert(navbarContent.includes('mobileMenuOpen'), 'Must maintain mobile menu state')
assert(navbarContent.includes('isAuthenticated'), 'Must maintain authentication awareness')
console.log('   ✅ Mobile collapsible menu and authentication behavior preserved.')

console.log('\n▶ TEST 7: Live SSR Verification Across Public Pages')
async function testHttpRoute(urlPath) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(`http://localhost:3000${urlPath}`)
      const text = await res.text()
      if (res.status === 200) {
        return { statusCode: res.status, body: text }
      }
    } catch (e) {
      // wait and retry
    }
    await new Promise((r) => setTimeout(r, 600))
  }
  const res = await fetch(`http://localhost:3000${urlPath}`)
  return { statusCode: res.status, body: await res.text() }
}

const routesToTest = [
  '/',
  '/features',
  '/pricing',
  '/safety',
  '/how-it-works',
]

for (const route of routesToTest) {
  const res = await testHttpRoute(route)
  assert.strictEqual(res.statusCode, 200, `Route ${route} must respond with HTTP 200`)
  assert(res.body.includes('creatorstore'), `Route ${route} must render creatorstore logo`)
  assert(res.body.includes('Start selling'), `Route ${route} must render Start selling CTA`)
  console.log(`   ✅ Route ${route} verified with HTTP 200 and Gumroad-inspired navbar markup.`)
}

console.log('\n======================================================================')
console.log('🎉 ALL GUMROAD-INSPIRED NAVBAR TESTS COMPLETED SUCCESSFULLY!')
console.log('======================================================================')
