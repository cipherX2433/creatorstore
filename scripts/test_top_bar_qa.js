import { readFileSync } from 'fs';
import path from 'path';

async function verifyTopBar() {
  console.log('--- STARTING TOP BAR & PAGE TITLE AUDIT ---');
  let failures = 0;

  const layoutPath = path.join(process.cwd(), 'app/dashboard/layout.js');
  const layoutContent = readFileSync(layoutPath, 'utf8');

  // 1. Check prominent page title in top bar
  if (
    layoutContent.includes('text-base sm:text-lg md:text-xl font-bold text-[var(--text-heading,#F5F5F5)] tracking-tight truncate') &&
    layoutContent.includes('getRouteTitle(pathname, title)')
  ) {
    console.log('✅ Check 1 PASS: Top bar renders prominent, bold, theme-styled page title with route fallback.');
  } else {
    console.error('❌ Check 1 FAIL: Top bar title styling or helper missing.');
    failures++;
  }

  // 2. Check global View Store button is removed from top bar
  if (!layoutContent.includes('<span>View Store</span>')) {
    console.log('✅ Check 2 PASS: Global "View Store" button removed from top bar.');
  } else {
    console.error('❌ Check 2 FAIL: Global "View Store" button still present in layout header.');
    failures++;
  }

  // 3. Check Trial indicator & Upgrade button remain
  if (
    layoutContent.includes('trialCountdown.desktopText') &&
    layoutContent.includes('Upgrade Plan')
  ) {
    console.log('✅ Check 3 PASS: Trial countdown and Upgrade Plan CTA remain intact.');
  } else {
    console.error('❌ Check 3 FAIL: Trial countdown or Upgrade CTA missing.');
    failures++;
  }

  // 4. Check Store page setHeaderConfig sets title: 'Store' and null actions
  const storePagePath = path.join(process.cwd(), 'app/dashboard/store/page.js');
  const storePageContent = readFileSync(storePagePath, 'utf8');
  if (
    storePageContent.includes("setHeaderConfig({\n        title: 'Store',\n        actions: null\n      })")
  ) {
    console.log('✅ Check 4 PASS: Store page explicitly configures title "Store" and removes top bar action buttons.');
  } else {
    console.error('❌ Check 4 FAIL: Store page header configuration mismatch.');
    failures++;
  }

  // 5. Check StorefrontStatusCard still has View Store
  const statusCardPath = path.join(process.cwd(), 'components/dashboard/StorefrontStatusCard.jsx');
  const statusCardContent = readFileSync(statusCardPath, 'utf8');
  if (statusCardContent.includes('<span>View Store</span>')) {
    console.log('✅ Check 5 PASS: Store page\'s "Your Storefront" card retains "View Store" action.');
  } else {
    console.error('❌ Check 5 FAIL: View Store removed from StorefrontStatusCard.');
    failures++;
  }

  // 6. Check Products page retains its product creation action
  const productsClientPath = path.join(process.cwd(), 'app/dashboard/products/ProductsClient.jsx');
  const productsClientContent = readFileSync(productsClientPath, 'utf8');
  if (productsClientContent.includes('Create Product') || productsClientContent.includes('New Product')) {
    console.log('✅ Check 6 PASS: Products page retains product creation controls.');
  } else {
    console.error('❌ Check 6 FAIL: Products page missing creation controls.');
    failures++;
  }

  if (failures === 0) {
    console.log('\n🌟 ALL TOP BAR AUDIT CHECKS PASSED (6/6)');
    process.exit(0);
  } else {
    console.error(`\n❌ ${failures} CHECKS FAILED`);
    process.exit(1);
  }
}

verifyTopBar();
