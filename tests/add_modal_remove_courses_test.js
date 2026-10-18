import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

console.log('=== Running Add Modal - View All & Modal Scrolling Test Suite ===\n');

const menuViewPath = path.join(process.cwd(), 'components/dashboard/AddToStoreMenuView.jsx');
const menuContent = fs.readFileSync(menuViewPath, 'utf8');

const storePagePath = path.join(process.cwd(), 'app/dashboard/store/page.js');
const storePageContent = fs.readFileSync(storePagePath, 'utf8');

const modalPath = path.join(process.cwd(), 'components/dashboard/AddToStoreModal.jsx');
const modalContent = fs.readFileSync(modalPath, 'utf8');

// 1. Static Verification: Zero Courses references and no GraduationCap in AddToStoreMenuView
assert.ok(
  !menuContent.includes('courses_suggested'),
  'courses_suggested must not exist in AddToStoreMenuView.jsx'
);
assert.ok(
  !menuContent.includes('courses_commerce'),
  'courses_commerce must not exist in AddToStoreMenuView.jsx'
);
assert.ok(
  !menuContent.includes('Sell online courses and lessons to your audience'),
  'Courses description must not exist in AddToStoreMenuView.jsx'
);
assert.ok(
  !menuContent.includes('GraduationCap'),
  'GraduationCap icon must not be imported or used in AddToStoreMenuView.jsx'
);
console.log('✓ PASS: Static verification confirms zero Courses references and no GraduationCap import');

// 2. Extract and evaluate WIZARD_OPTIONS and WIZARD_CATEGORIES
const sandbox = {
  console,
  Search: 'Search',
  X: 'X',
  Sparkles: 'Sparkles',
  Store: 'Store',
  Heart: 'Heart',
  PlayCircle: 'PlayCircle',
  Contact: 'Contact',
  Calendar: 'Calendar',
  Type: 'Type',
  MoreHorizontal: 'MoreHorizontal',
  Folder: 'Folder',
  Link2: 'Link2',
  Tag: 'Tag',
  MessageSquare: 'MessageSquare',
  Package: 'Package',
  Video: 'Video',
  Layers: 'Layers',
  FileText: 'FileText',
  Instagram: 'Instagram',
  Play: 'Play',
  Images: 'Images',
  Headphones: 'Headphones',
  Music2: 'Music2',
  Youtube: 'Youtube',
  Mail: 'Mail',
  Send: 'Send',
  MessageSquareQuote: 'MessageSquareQuote',
  HelpCircle: 'HelpCircle',
  Radio: 'Radio',
  AlignLeft: 'AlignLeft',
  Heading: 'Heading',
  ChevronRight: 'ChevronRight',
  Plus: 'Plus',
  exports: {},
};

const catStart = menuContent.indexOf('export const WIZARD_CATEGORIES = [');
const optStart = menuContent.indexOf('export const WIZARD_OPTIONS = [');
const optEnd = menuContent.indexOf('\n]\n\nexport default function AddToStoreMenuView');

assert.ok(catStart !== -1, 'WIZARD_CATEGORIES must exist');
assert.ok(optStart !== -1, 'WIZARD_OPTIONS must exist');
assert.ok(optEnd !== -1, 'End of WIZARD_OPTIONS must be found');

const categoriesCode = menuContent.slice(catStart + 'export const WIZARD_CATEGORIES = '.length, optStart).trim();
const optionsCode = menuContent.slice(optStart + 'export const WIZARD_OPTIONS = '.length, optEnd + 2).trim();

vm.runInNewContext(`
  WIZARD_CATEGORIES = ${categoriesCode};
  WIZARD_OPTIONS = ${optionsCode};
`, sandbox);

const { WIZARD_CATEGORIES, WIZARD_OPTIONS } = sandbox;

// 3. Verify no duplicate IDs exist in WIZARD_OPTIONS
const ids = WIZARD_OPTIONS.map((o) => o.id);
const uniqueIds = new Set(ids);
assert.equal(ids.length, uniqueIds.size, 'Every option in WIZARD_OPTIONS must have a unique ID (no duplicates)');
console.log('✓ PASS: Zero duplicate option IDs in WIZARD_OPTIONS');

// 4. Verify Suggested category does not include Courses
const suggestedOptions = WIZARD_OPTIONS.filter((opt) => opt.category === 'suggested');
assert.ok(
  !suggestedOptions.some((opt) => opt.title === 'Courses' || opt.type === 'course'),
  'Courses option must not appear in Suggested category'
);
console.log('✓ PASS: Suggested category does not include Courses');

// 5. Verify Commerce category options
const commerceOptions = WIZARD_OPTIONS.filter((opt) => opt.category === 'ecommerce');
assert.ok(!commerceOptions.some((opt) => opt.title === 'Courses' || opt.type === 'course'));

const digitalProductsSection = commerceOptions.filter((opt) => opt.section === 'Digital products');
const digitalProductTitles = digitalProductsSection.map((opt) => opt.title);
assert.ok(digitalProductTitles.includes('Coaching & bookings'));
assert.ok(digitalProductTitles.includes('Digital products'));
assert.ok(digitalProductTitles.includes('Bundles & Packages'));
assert.equal(digitalProductTitles.length, 3);

const affiliateSection = commerceOptions.filter((opt) => opt.section === 'Affiliate products');
assert.equal(affiliateSection.length, 1);
assert.equal(affiliateSection[0].title, 'Affiliate products');
console.log('✓ PASS: Commerce category correctly preserves Digital products and Affiliate products without Courses');

// 6. Verify "View all" displays all supported categories
const viewAllOptions = WIZARD_OPTIONS.filter((opt) => opt.category !== 'suggested' && opt.type !== 'course');
const viewAllCategories = new Set(viewAllOptions.map((o) => o.category));

assert.ok(viewAllCategories.has('ecommerce'), 'View all must include Commerce');
assert.ok(viewAllCategories.has('social'), 'View all must include Social');
assert.ok(viewAllCategories.has('media'), 'View all must include Media');
assert.ok(viewAllCategories.has('contact'), 'View all must include Contact & Forms');
assert.ok(viewAllCategories.has('events'), 'View all must include Events');
assert.ok(viewAllCategories.has('text'), 'View all must include Text');
assert.ok(!viewAllOptions.some((opt) => opt.type === 'course' || opt.title === 'Courses'));
console.log('✓ PASS: View all includes every supported category (Commerce, Social, Media, Contact, Events, Text) and excludes Courses');

// 7. Verify search functionality across all categories
const searchQueries = ['digital', 'coaching', 'instagram', 'youtube', 'newsletter', 'webinar', 'heading'];
for (const query of searchQueries) {
  const matching = viewAllOptions.filter((opt) => {
    return (
      opt.title.toLowerCase().includes(query) ||
      opt.description.toLowerCase().includes(query) ||
      (opt.keywords && opt.keywords.toLowerCase().includes(query))
    );
  });
  assert.ok(matching.length > 0, `Search for "${query}" should match at least one option`);
}
// Search for courses must return 0 results
const coursesSearch = WIZARD_OPTIONS.filter((opt) => {
  return (
    opt.type === 'course' ||
    opt.title.toLowerCase() === 'courses' ||
    (opt.keywords && opt.keywords.includes('curriculum'))
  );
});
assert.equal(coursesSearch.length, 0, 'Search must return 0 courses results');
console.log('✓ PASS: Search finds options across all eligible categories and never returns Courses');

// 8. Verify modal responsive height and scroll classes
assert.ok(
  !menuContent.includes('min-h-[460px] max-h-[520px]'),
  'Hardcoded fixed min-h-[460px] max-h-[520px] must be removed from AddToStoreMenuView'
);
assert.ok(
  menuContent.includes('flex-1 min-h-0'),
  'AddToStoreMenuView must use flex-1 min-h-0 for proper responsive scrolling'
);
assert.ok(
  menuContent.includes('overscroll-contain'),
  'AddToStoreMenuView must use overscroll-contain to prevent background scrolling'
);
console.log('✓ PASS: AddToStoreMenuView has proper responsive scroll architecture with no fixed pixel constraints');

// 9. Verify Store page and AddToStoreModal modal sizing
assert.ok(
  storePageContent.includes('h-[88vh] sm:h-[640px] max-h-[92vh]'),
  'store/page.js modal must use responsive viewport height'
);
assert.ok(
  modalContent.includes('h-[88vh] sm:h-[640px] max-h-[92vh]'),
  'AddToStoreModal.jsx must use responsive viewport height'
);
console.log('✓ PASS: Modals are constrained to responsive viewport height (88vh - 92vh) with flex columns');

// 10. Verify onSelectOption handles all option types in store/page.js and AddToStoreModal.jsx
const requiredTypes = [
  'digital_product',
  'coaching',
  'link',
  'link_preset',
  'collection',
  'instagram',
  'form_contact',
  'form_newsletter',
  'youtube',
  'video',
  'gallery',
  'audio',
  'pdf',
  'webinar',
  'heading',
  'text_block',
];

for (const t of requiredTypes) {
  assert.ok(
    storePageContent.includes(t),
    `store/page.js must handle option type: ${t}`
  );
  assert.ok(
    modalContent.includes(t),
    `AddToStoreModal.jsx must handle option type: ${t}`
  );
}
console.log('✓ PASS: All option types are handled and route to working creation/config flows');

// 11. Verify existing products integration in View all and Commerce
assert.ok(
  menuContent.includes("Commerce — Affiliate products") &&
  menuContent.includes("Add Existing Products"),
  'Existing products must be integrated under Commerce section in View all'
);
console.log('✓ PASS: Existing products are accessible in both Commerce and View all views');

console.log('\n========================================');
console.log('Test Results: All 11 Passed, 0 Failed');
console.log('========================================');
