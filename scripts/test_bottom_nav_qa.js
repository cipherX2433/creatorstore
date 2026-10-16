const { MOBILE_BOTTOM_NAV_ITEMS, MORE_MENU_CATEGORIES } = require('../lib/navigationConfig');
const http = require('http');

console.log('======================================================');
console.log('CREATORSTORE — PHASE 3 MOBILE BOTTOM NAV QA & AUDIT');
console.log('======================================================');

// 1. Test Active Route Matching Logic
console.log('\n1. Verifying Route Matching Logic across destinations:');

const testCases = [
  { pathname: '/dashboard/store', expected: 'store' },
  { pathname: '/dashboard/store?tab=design', expected: 'store' },
  { pathname: '/dashboard/products', expected: 'products' },
  { pathname: '/dashboard/products/new', expected: 'products' },
  { pathname: '/dashboard/products/12345', expected: 'products' },
  { pathname: '/dashboard/courses/new', expected: 'products' },
  { pathname: '/dashboard/coaching', expected: 'products' },
  { pathname: '/dashboard/earn/earnings', expected: 'earn' },
  { pathname: '/dashboard/earn/orders', expected: 'earn' },
  { pathname: '/dashboard/orders', expected: 'earn' },
  { pathname: '/dashboard', expected: 'insights' },
  { pathname: '/dashboard/analytics', expected: 'insights' },
  { pathname: '/dashboard/automations', expected: 'more' },
  { pathname: '/dashboard/calendar', expected: 'more' },
  { pathname: '/dashboard/payments', expected: 'more' },
  { pathname: '/dashboard/customers', expected: 'more' },
  { pathname: '/dashboard/marketing', expected: 'more' },
  { pathname: '/dashboard/settings', expected: 'more' },
  { pathname: '/dashboard/settings/billing', expected: 'more' },
  { pathname: '/dashboard/settings/connected-accounts', expected: 'more' },
  { pathname: '/dashboard/success-center', expected: 'more' },
];

let matchFailures = 0;
for (const tc of testCases) {
  let matchedItem = null;
  for (const item of MOBILE_BOTTOM_NAV_ITEMS) {
    if (item.matches(tc.pathname, new URLSearchParams(tc.pathname.includes('?') ? tc.pathname.split('?')[1] : ''))) {
      matchedItem = item.id;
      break;
    }
  }
  if (matchedItem === tc.expected) {
    console.log(`   ✅ Route [${tc.pathname}] -> Destination: ${matchedItem}`);
  } else {
    console.log(`   ❌ Route [${tc.pathname}] -> Expected: ${tc.expected}, Got: ${matchedItem}`);
    matchFailures++;
  }
}

// 2. Test All Categories in More Menu
console.log('\n2. Verifying More Menu Category Route Validity:');
let moreItemsCount = 0;
for (const cat of MORE_MENU_CATEGORIES) {
  console.log(`   📂 Category [${cat.title}] (${cat.items.length} items):`);
  for (const item of cat.items) {
    console.log(`      - ${item.label} (${item.href})`);
    moreItemsCount++;
  }
}
console.log(`   ✅ Total ${moreItemsCount} secondary destinations configured in More menu.`);

// 3. HTTP 200 Route Accessibility Verification
console.log('\n3. Testing HTTP SSR/Page Responses for all navigation routes:');

const ROUTES_TO_TEST = [
  '/',
  '/dashboard',
  '/dashboard/store',
  '/dashboard/products',
  '/dashboard/orders',
  '/dashboard/earn/orders',
  '/dashboard/earn/earnings',
  '/dashboard/automations',
  '/dashboard/calendar',
  '/dashboard/payments',
  '/dashboard/customers',
  '/dashboard/marketing',
  '/dashboard/settings',
  '/dashboard/settings/billing',
  '/dashboard/settings/connected-accounts'
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

async function runHttpTests() {
  for (const route of ROUTES_TO_TEST) {
    const res = await fetchRoute(route);
    if (res.statusCode === 200 || res.statusCode === 307 || res.statusCode === 308) {
      console.log(`   ✅ Route [${route}]: HTTP ${res.statusCode} (${res.length} bytes)`);
    } else {
      console.log(`   ❌ Route [${route}]: Failed with status ${res.statusCode || res.error}`);
    }
  }
}

runHttpTests().then(() => {
  console.log('\n======================================================');
  console.log(`PHASE 3 QA AUDIT COMPLETE - Match Failures: ${matchFailures}`);
  console.log('======================================================');
});
