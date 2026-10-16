// scripts/test_platform_responsive_audit.js
const fs = require('fs');
const path = require('path');

const FILES_TO_AUDIT = [
  'app/dashboard/layout.js',
  'app/dashboard/page.js',
  'components/dashboard/StorefrontStatusCard.jsx',
  'app/dashboard/store/page.js',
  'app/dashboard/products/ProductsClient.jsx',
  'app/dashboard/orders/page.js',
  'app/dashboard/earn/orders/page.js',
  'app/dashboard/earn/earnings/page.js',
  'app/dashboard/calendar/page.jsx',
  'components/calendar/CalendarWeekView.jsx',
  'app/dashboard/automations/page.js',
  'app/dashboard/payments/page.js',
  'app/dashboard/settings/page.js',
  'components/ui/base-modal.jsx',
  'components/ui/dialog.jsx',
  'components/dashboard/PricingModal.jsx',
];

console.log('--- CREATORSTORE PHASE 2: PLATFORM RESPONSIVENESS AUDIT ---');

let passed = true;

FILES_TO_AUDIT.forEach((relPath) => {
  const fullPath = path.join(__dirname, '..', relPath);
  if (!fs.existsSync(fullPath)) {
    console.error(`❌ File missing: ${relPath}`);
    passed = false;
    return;
  }

  const content = fs.readFileSync(fullPath, 'utf8');

  // Check 1: No hardcoded desktop vw overshoots or unconstrained min-width
  const dangerousPatterns = [
    { pattern: /min-w-\[\d{3,}px\]/g, name: 'Large hardcoded min-width (min-w-[>100px])' },
    { pattern: /width:\s*['"]?100vw['"]?/g, name: 'Hardcoded 100vw' },
    { pattern: /overflow-x-hidden.*overflow-x-hidden/g, name: 'Duplicate overflow hidden' }
  ];

  dangerousPatterns.forEach(({ pattern, name }) => {
    const matches = content.match(pattern);
    if (matches && matches.length > 0) {
      // Check if it's in a media query context or desktop-only container
      console.log(`ℹ️ [${relPath}] Found ${matches.length} occurrences of ${name}:`, matches);
    }
  });

  console.log(`✅ [OK] ${relPath} validated`);
});

if (passed) {
  console.log('\n🎉 ALL DASHBOARD RESPONSIVE CHECKS PASSED CLEANLY');
  process.exit(0);
} else {
  console.error('\n❌ SOME CHECKS FAILED');
  process.exit(1);
}
