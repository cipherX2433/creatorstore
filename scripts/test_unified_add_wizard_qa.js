import { existsSync, readFileSync } from 'fs';
import path from 'path';

async function verifyUnifiedAddWizard() {
  console.log('--- STARTING UNIFIED ADD-TO-STORE WIZARD QA ---');
  let failures = 0;

  // 1. Check ProductWizardModal is removed
  const oldModalPath = path.join(process.cwd(), 'components/products/ProductWizardModal.jsx');
  if (!existsSync(oldModalPath)) {
    console.log('✅ Check 1 PASS: Old ProductWizardModal.jsx has been completely removed.');
  } else {
    console.error('❌ Check 1 FAIL: Old ProductWizardModal.jsx still exists.');
    failures++;
  }

  // 2. Check AddToStoreModal exists and exports AddToStoreModal / AddToStoreWizard
  const addToStorePath = path.join(process.cwd(), 'components/dashboard/AddToStoreModal.jsx');
  if (existsSync(addToStorePath)) {
    const content = readFileSync(addToStorePath, 'utf8');
    if (
      content.includes('export default function AddToStoreModal') &&
      content.includes('export const AddToStoreWizard = AddToStoreModal') &&
      content.includes('Add to your store') &&
      content.includes('DigitalProductForm') &&
      content.includes('CoachingBookingWizardContent') &&
      content.includes('CourseWizardContent')
    ) {
      console.log('✅ Check 2 PASS: AddToStoreModal is unified and supports all product types.');
    } else {
      console.error('❌ Check 2 FAIL: AddToStoreModal content is missing required exports or sub-flows.');
      failures++;
    }
  } else {
    console.error('❌ Check 2 FAIL: AddToStoreModal.jsx does not exist.');
    failures++;
  }

  // 3. Check ProductsClient.jsx imports and uses AddToStoreModal
  const productsClientPath = path.join(process.cwd(), 'app/dashboard/products/ProductsClient.jsx');
  const productsClientContent = readFileSync(productsClientPath, 'utf8');
  if (
    productsClientContent.includes("import AddToStoreModal from '@/components/dashboard/AddToStoreModal'") &&
    productsClientContent.includes('<AddToStoreModal') &&
    !productsClientContent.includes('ProductWizardModal')
  ) {
    console.log('✅ Check 3 PASS: Products page (+ Create Product) triggers AddToStoreModal.');
  } else {
    console.error('❌ Check 3 FAIL: ProductsClient.jsx not using AddToStoreModal or still references ProductWizardModal.');
    failures++;
  }

  // 4. Check Store page maintains its Add modal flow
  const storePagePath = path.join(process.cwd(), 'app/dashboard/store/page.js');
  const storePageContent = readFileSync(storePagePath, 'utf8');
  if (
    storePageContent.includes("handleAddToStore") &&
    storePageContent.includes("Add to your store")
  ) {
    console.log('✅ Check 4 PASS: Store page maintains "+ Add" -> "Add to your store" flow.');
  } else {
    console.error('❌ Check 4 FAIL: Store page missing "+ Add" trigger or modal.');
    failures++;
  }

  // 5. Check category tabs and search in AddToStoreModal
  const modalContent = readFileSync(addToStorePath, 'utf8');
  const hasCategories = ['suggested', 'ecommerce', 'social', 'media', 'document', 'forms'].every(cat =>
    modalContent.includes(cat)
  );
  if (hasCategories && modalContent.includes('Paste or search a link...')) {
    console.log('✅ Check 5 PASS: All category tabs and link search are present in the reusable wizard.');
  } else {
    console.error('❌ Check 5 FAIL: Category tabs or search missing in AddToStoreModal.');
    failures++;
  }

  if (failures === 0) {
    console.log('\n🌟 ALL UNIFIED ADD-TO-STORE WIZARD CHECKS PASSED (5/5)');
    process.exit(0);
  } else {
    console.error(`\n❌ ${failures} CHECKS FAILED`);
    process.exit(1);
  }
}

verifyUnifiedAddWizard();
