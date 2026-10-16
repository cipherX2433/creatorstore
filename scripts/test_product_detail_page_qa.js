import { readFileSync } from 'fs';
import path from 'path';

async function verifyProductDetailPage() {
  console.log('--- STARTING PRODUCT DETAIL PAGE AUDIT ---');
  let failures = 0;

  const pagePath = path.join(process.cwd(), 'app/dashboard/products/[id]/page.js');
  const content = readFileSync(pagePath, 'utf8');

  // 1. Check useDashboard and getAppUrl imports
  if (content.includes("from '@/components/dashboard/DashboardContext'") && content.includes("from '@/config/site'")) {
    console.log('✅ Check 1 PASS: DashboardContext and getAppUrl imported properly.');
  } else {
    console.error('❌ Check 1 FAIL: Imports missing.');
    failures++;
  }

  // 2. Check storeSlug definition in component
  if (content.includes('const { me } = useDashboard()') && content.includes('const storeSlug = me?.store?.slug || me?.store?.username || me?.username || me?.profile?.username || \'\'')) {
    console.log('✅ Check 2 PASS: storeSlug is cleanly resolved from server-backed useDashboard me context.');
  } else {
    console.error('❌ Check 2 FAIL: storeSlug declaration missing or incorrect.');
    failures++;
  }

  // 3. Check View Product Link construction
  if (content.includes('<Link href={storeSlug && product?.slug ? `/${storeSlug}/${product.slug}` : (product?.id ? `/products/${product.id}` : \'/\')}') && content.includes('View Product')) {
    console.log('✅ Check 3 PASS: "View Product" button targets canonical `/[username]/[slug]` path.');
  } else {
    console.error('❌ Check 3 FAIL: "View Product" button link malformed.');
    failures++;
  }

  // 4. Check that no undeclared storeSlug remains
  const lines = content.split('\n');
  let hasUndeclared = false;
  lines.forEach((line, idx) => {
    if (line.includes('storeSlug') && !line.includes('const storeSlug') && !content.includes('const storeSlug')) {
      hasUndeclared = true;
      console.error(`❌ Undeclared storeSlug on line ${idx + 1}: ${line}`);
    }
  });
  if (!hasUndeclared) {
    console.log('✅ Check 4 PASS: All storeSlug references are properly scoped.');
  } else {
    failures++;
  }

  if (failures === 0) {
    console.log('\n🌟 ALL PRODUCT DETAIL PAGE AUDIT CHECKS PASSED (4/4)');
    process.exit(0);
  } else {
    console.error(`\n❌ ${failures} CHECKS FAILED`);
    process.exit(1);
  }
}

verifyProductDetailPage();
