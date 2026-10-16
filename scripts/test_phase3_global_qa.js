const fs = require('fs');
const path = require('path');
const http = require('http');

console.log('====================================================');
console.log('CREATORSTORE — PHASE 3 QA & RESPONSIVE AUDIT SUITE');
console.log('====================================================');

const TARGET_FILES = [
  'app/page.js',
  'components/landing/Navbar.jsx',
  'components/landing/Hero.jsx',
  'components/landing/FloatingCCoins.jsx',
  'components/landing/CCoin.jsx',
  'components/landing/Footer.jsx',
  'app/pricing/page.js',
  'app/contact/page.js',
  'app/terms/page.js',
  'app/privacy/page.js',
  'app/refund/page.js',
  'app/shipping/page.js',
  'app/dashboard/layout.js',
  'app/dashboard/page.js',
  'app/dashboard/store/page.js',
  'components/dashboard/StorefrontStatusCard.jsx',
  'app/dashboard/products/ProductsClient.jsx',
  'app/dashboard/orders/page.js',
  'app/dashboard/earn/orders/page.js',
  'app/dashboard/earn/earnings/page.js',
  'app/dashboard/calendar/page.jsx',
  'app/dashboard/automations/page.js',
  'app/dashboard/payments/page.js',
  'app/dashboard/settings/page.js',
  'components/ui/base-modal.jsx',
  'components/ui/dialog.jsx',
  'components/dashboard/PricingModal.jsx'
];

let issues = [];

function checkFile(relPath) {
  const fullPath = path.join(__dirname, '..', relPath);
  if (!fs.existsSync(fullPath)) {
    issues.push({ file: relPath, issue: 'File does not exist' });
    return;
  }
  const content = fs.readFileSync(fullPath, 'utf8');

  // Check 1: Check for dangerous fixed widths > 320px without responsive prefixes
  const fixedWidthMatch = content.match(/\b(w-\[([4-9]\d{2,}|\d{4,})px\]|min-w-\[([4-9]\d{2,}|\d{4,})px\])/g);
  if (fixedWidthMatch) {
    fixedWidthMatch.forEach(m => {
      issues.push({ file: relPath, issue: `Potential dangerous fixed width: ${m}` });
    });
  }

  // Check 2: Check modal width safety
  if (relPath.includes('modal') || relPath.includes('dialog')) {
    if (!content.includes('calc(100vw-') && !content.includes('max-w-') && !content.includes('w-full')) {
      issues.push({ file: relPath, issue: 'Modal lacks safe mobile viewport constraint' });
    }
  }

  // Check 3: Check for tables without overflow handling or responsive cards
  if (content.includes('<table') && !content.includes('overflow-x-auto') && !content.includes('md:hidden') && !content.includes('hidden md:table') && !content.includes('hidden md:block')) {
    issues.push({ file: relPath, issue: 'Table detected without horizontal overflow or responsive card container' });
  }

  // Check 4: Check for reduced-motion in animated files
  if (relPath.includes('CCoin.jsx') || relPath.includes('FloatingCCoins.jsx')) {
    if (!content.includes('prefers-reduced-motion')) {
      issues.push({ file: relPath, issue: 'Animation missing prefers-reduced-motion media query' });
    }
  }
}

console.log('1. Static Code Responsiveness & Safety Checks:');
TARGET_FILES.forEach(checkFile);

if (issues.length === 0) {
  console.log('   ✅ All 27 target components passed static responsive safety rules.');
} else {
  console.log(`   ⚠️ Found ${issues.length} potential items:`);
  issues.forEach(i => console.log(`      - [${i.file}]: ${i.issue}`));
}

// Check 2: SSR Route HTTP 200 Verification
console.log('\n2. SSR Route HTTP Verification on Local Server:');
const ROUTES_TO_TEST = [
  '/',
  '/pricing',
  '/contact',
  '/terms',
  '/privacy',
  '/refund',
  '/shipping',
  '/dashboard',
  '/dashboard/store',
  '/dashboard/products',
  '/dashboard/orders',
  '/dashboard/earn/earnings',
  '/dashboard/settings',
  '/dashboard/calendar',
  '/dashboard/automations',
  '/dashboard/payments'
];

function fetchRoute(route) {
  return new Promise((resolve) => {
    http.get(`http://localhost:3000${route}`, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({ route, statusCode: res.statusCode, length: data.length });
      });
    }).on('error', (err) => {
      resolve({ route, error: err.message });
    });
  });
}

async function runRouteTests() {
  for (const route of ROUTES_TO_TEST) {
    const res = await fetchRoute(route);
    if (res.statusCode === 200 || res.statusCode === 307 || res.statusCode === 308) {
      console.log(`   ✅ Route [${route}]: HTTP ${res.statusCode} (Bytes: ${res.length})`);
    } else {
      console.log(`   ❌ Route [${route}]: Failed with status ${res.statusCode || res.error}`);
    }
  }
}

runRouteTests().then(() => {
  console.log('\n====================================================');
  console.log('PHASE 3 AUDIT SUITE COMPLETE');
  console.log('====================================================');
});
