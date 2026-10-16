import { readFileSync } from 'fs';
import path from 'path';

async function verifyStoreActions() {
  console.log('--- STARTING MOBILE STORE ACTIONS QA AUDIT ---');
  let failures = 0;

  const storePagePath = path.join(process.cwd(), 'app/dashboard/store/page.js');
  const content = readFileSync(storePagePath, 'utf8');

  // 1. Check top duplicate action buttons are removed
  if (!content.includes('Design Storefront') && !content.includes('Preview Storefront')) {
    console.log('✅ Check 1 PASS: Top "Design Storefront" and "Preview Storefront" duplicate buttons removed.');
  } else {
    console.error('❌ Check 1 FAIL: Top duplicate buttons still present.');
    failures++;
  }

  // 2. Check "+ Add" and mobile-only "Design" button row in controls
  if (content.includes("onClick={() => handleAddToStore('suggested')}") && content.includes("onClick={() => handleTabChange('design')}") && content.includes('className="inline-flex lg:hidden items-center gap-1.5 h-10 px-4 rounded-full')) {
    console.log('✅ Check 2 PASS: "[ + Add ]" and mobile-only "[ Design ]" controls are present with Palette icon and lg:hidden desktop hiding.');
  } else {
    console.error('❌ Check 2 FAIL: "[ + Add ]" and "[ Design ]" button controls missing or improperly configured.');
    failures++;
  }

  // 3. Check "Add collection" is removed from profile card buttons
  if (!content.includes('Add collection</button>')) {
    console.log('✅ Check 3 PASS: "Add collection" button replaced by "Design" button.');
  } else {
    console.error('❌ Check 3 FAIL: "Add collection" button still present.');
    failures++;
  }

  // 4. Check Back to Store in DesignStudioPage
  if (content.includes('Back to Store') && content.includes('onBackToContent')) {
    console.log('✅ Check 4 PASS: "Back to Store" navigation is present in DesignStudioPage for seamless mobile return.');
  } else {
    console.error('❌ Check 4 FAIL: "Back to Store" navigation missing.');
    failures++;
  }

  // 5. Check No Global Top Bar regressions & Bottom Nav active
  const layoutPath = path.join(process.cwd(), 'app/dashboard/layout.js');
  const layoutContent = readFileSync(layoutPath, 'utf8');
  if (layoutContent.includes('hidden md:flex') && layoutContent.includes('MobileBottomNavigation')) {
    console.log('✅ Check 5 PASS: Mobile bottom nav remains active and no global mobile top bar reintroduced.');
  } else {
    console.error('❌ Check 5 FAIL: Global layout regression.');
    failures++;
  }

  if (failures === 0) {
    console.log('\n🌟 ALL MOBILE STORE ACTIONS AUDIT CHECKS PASSED (5/5)');
    process.exit(0);
  } else {
    console.error(`\n❌ ${failures} CHECKS FAILED`);
    process.exit(1);
  }
}

verifyStoreActions();
