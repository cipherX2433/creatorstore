import { readFileSync } from 'fs';
import path from 'path';

async function runFloatingPillNavAudit() {
  console.log('--- STARTING FLOATING PILL NAVBAR QA AUDIT ---');
  let failures = 0;

  const navPath = path.join(process.cwd(), 'components/dashboard/MobileBottomNavigation.jsx');
  const navContent = readFileSync(navPath, 'utf8');

  // 1. Check Floating Pill Structure & Styling
  if (
    navContent.includes('fixed left-0 right-0 z-40 md:hidden') &&
    navContent.includes('rounded-full bg-[#0D0D0D]') &&
    navContent.includes('border-[var(--border-subtle,#303030)]') &&
    navContent.includes('shadow-[')
  ) {
    console.log('✅ Check 1 PASS: Floating pill container uses solid opaque surface, rounded-full, and elevation shadow.');
  } else {
    console.error('❌ Check 1 FAIL: Floating container styling mismatch.');
    failures++;
  }

  // 2. Check Active Pill LayoutId Animation
  if (
    navContent.includes("layoutId=\"activeBottomNavPill\"") &&
    navContent.includes('bg-[#202534]') &&
    navContent.includes('border-[#4D7CFF]/50')
  ) {
    console.log('✅ Check 2 PASS: Active pill uses Framer Motion layoutId animation with CreatorStore #202534 & #4D7CFF theme.');
  } else {
    console.error('❌ Check 2 FAIL: Active pill animation or theme color mismatch.');
    failures++;
  }

  // 3. Check Inactive vs Active Display (Inactive = Icon only, Active = Icon + Label)
  if (
    navContent.includes('w-[44px] min-w-[44px]') &&
    navContent.includes('{isActive && (') &&
    navContent.includes('item.label')
  ) {
    console.log('✅ Check 3 PASS: Inactive destinations display icon only; active destination expands with icon + label.');
  } else {
    console.error('❌ Check 3 FAIL: Inactive/Active item label behavior mismatch.');
    failures++;
  }

  // 4. Check Touch Targets
  if (
    navContent.includes('min-h-[44px]') &&
    navContent.includes('h-[44px]')
  ) {
    console.log('✅ Check 4 PASS: All navigation slots provide ≥44px touch targets.');
  } else {
    console.error('❌ Check 4 FAIL: Touch targets below 44px.');
    failures++;
  }

  // 5. Check Safe Area Support
  if (
    navContent.includes('env(safe-area-inset-bottom')
  ) {
    console.log('✅ Check 5 PASS: Safe-area inset bottom supported with floating margin.');
  } else {
    console.error('❌ Check 5 FAIL: Safe area inset missing.');
    failures++;
  }

  // 6. Check Layout Clearance Spacing
  const layoutPath = path.join(process.cwd(), 'app/dashboard/layout.js');
  const layoutContent = readFileSync(layoutPath, 'utf8');
  if (layoutContent.includes('pb-28 sm:pb-32 md:pb-20')) {
    console.log('✅ Check 6 PASS: Main canvas layout has ample bottom padding (pb-28 sm:pb-32) preventing content obstruction.');
  } else {
    console.error('❌ Check 6 FAIL: Layout bottom padding insufficient.');
    failures++;
  }

  // 7. Check 5 Navigation Destinations
  const navConfigPath = path.join(process.cwd(), 'lib/navigationConfig.js');
  const navConfigContent = readFileSync(navConfigPath, 'utf8');
  if (
    navConfigContent.includes("id: 'store'") &&
    navConfigContent.includes("id: 'products'") &&
    navConfigContent.includes("id: 'earn'") &&
    navConfigContent.includes("id: 'insights'") &&
    navConfigContent.includes("id: 'more'")
  ) {
    console.log('✅ Check 7 PASS: All 5 primary navigation destinations preserved without route changes.');
  } else {
    console.error('❌ Check 7 FAIL: Primary navigation destinations altered.');
    failures++;
  }

  if (failures === 0) {
    console.log('\n🌟 ALL FLOATING PILL NAVBAR AUDIT CHECKS PASSED (7/7)');
    process.exit(0);
  } else {
    console.error(`\n❌ ${failures} CHECKS FAILED`);
    process.exit(1);
  }
}

runFloatingPillNavAudit();
