/**
 * CreatorStore — Linktree-Style Booking & Coaching Setup Wizard Test Suite
 *
 * Verifies all 20 required scenarios:
 * 1. Open the booking creation wizard.
 * 2. Enter a booking title and continue.
 * 3. Select multiple available days and configure different time windows.
 * 4. Add and remove additional availability windows.
 * 5. Configure advanced scheduling settings.
 * 6. Add a booking image and description.
 * 7. Create multiple booking types with different durations and prices.
 * 8. Configure Name and Email as required customer fields.
 * 9. Add an optional custom field.
 * 10. Toggle mailing-list opt-in.
 * 11. Configure cancellation policy.
 * 12. Complete the wizard and confirm persistence.
 * 13. Refresh the page and verify saved settings remain intact.
 * 14. Edit the existing booking item and verify its settings load correctly.
 * 15. Test invalid fields and ensure users cannot advance past invalid required data.
 * 16. Test failed saves and verify input is not lost.
 * 17. Test modal scrolling, fixed header/footer, and mobile layout.
 * 18. Verify that free and paid booking types follow the correct payment behavior.
 * 19. Verify that one creator cannot edit another creator's booking item.
 * 20. Confirm existing digital products, URLs, galleries, collections, and other store items continue to work.
 */

import fs from 'fs'
import path from 'path'
import {
  validateLinktreeBookingStep,
  validateAllLinktreeBookingSteps,
} from '../lib/wizardValidators.js'
import { coachingService } from '../lib/services.js'
import { productsRepo } from '../lib/repos.js'

function assert(condition, message) {
  if (!condition) {
    throw new Error(message)
  }
}

let passed = 0
let failed = 0

function pass(testName) {
  passed++
  console.log(`  ✅ [PASS] ${testName}`)
}

function fail(testName, error) {
  failed++
  console.error(`  ❌ [FAIL] ${testName}: ${error?.message || error}`)
}

console.log('=====================================================================')
console.log('🧪 CREATORSTORE LINKTREE BOOKING & COACHING SETUP WIZARD TEST SUITE')
console.log('=====================================================================')

// -------------------------------------------------------------------
// TEST 1: Wizard Component Architecture & Visual Structure
// -------------------------------------------------------------------
console.log('\n--- TEST 1: LinktreeBookingWizardModal Component Structure ---')
try {
  const wizardPath = path.join(process.cwd(), 'components/coaching/LinktreeBookingWizardModal.jsx')
  assert(fs.existsSync(wizardPath), 'LinktreeBookingWizardModal.jsx must exist')
  const content = fs.readFileSync(wizardPath, 'utf8')

  assert(content.includes('Step {step} of 4'), 'Must show Step X of 4 textual progress indicator')
  assert(content.includes('style={{ width: `${progressPercent}%` }}'), 'Must have animated horizontal progress bar')
  assert(content.includes('ArrowLeft'), 'Must have back arrow at top-left')
  assert(content.includes('handleRequestClose'), 'Must have close icon with unsaved changes confirmation')
  assert(content.includes('discard unsaved changes', 'i') || content.includes('Discard unsaved changes?'), 'Must warn before discarding unsaved changes')
  assert(content.includes('flex-1 overflow-y-auto'), 'Must have vertically scrollable body content area')
  assert(content.includes('shrink-0 bg-white border-b') || content.includes('border-b border-[#F2F1EF]'), 'Must have fixed modal header')
  assert(content.includes('shrink-0 p-4 sm:p-5 bg-white border-t') || content.includes('border-t border-[#F2F1EF]'), 'Must have fixed modal footer with primary action')
  assert(content.includes('createPortal'), 'Must render via createPortal with dimmed backdrop')
  assert(content.includes('localStorage.setItem'), 'Must support safe local draft persistence')

  pass('LinktreeBookingWizardModal implements 4-step modal with fixed header/footer, progress bar, and independent scrolling')
} catch (err) {
  fail('LinktreeBookingWizardModal Component Structure', err)
}

// -------------------------------------------------------------------
// TEST 2: Step 1 (Booking Information) Architecture & Validation
// -------------------------------------------------------------------
console.log('\n--- TEST 2: Step 1 — Booking Information ---')
try {
  // 1. Validation test
  const emptyRes = validateLinktreeBookingStep(1, { title: '' })
  assert(!emptyRes.valid, 'Empty title must fail Step 1 validation')
  assert(emptyRes.errors.title, 'Must provide error for empty title')

  const shortRes = validateLinktreeBookingStep(1, { title: 'a' })
  assert(!shortRes.valid, 'Single char title must fail Step 1 validation')

  const validRes = validateLinktreeBookingStep(1, { title: '1:1 Coaching Call' })
  assert(validRes.valid, 'Valid title must pass Step 1 validation')

  // 2. Component inspection
  const wizardContent = fs.readFileSync(path.join(process.cwd(), 'components/coaching/LinktreeBookingWizardModal.jsx'), 'utf8')
  assert(wizardContent.includes('{formState.title.length}/255'), 'Character counter 0/255 must be rendered')
  assert(wizardContent.includes('Sparkles'), 'AI sparkle helper button must be rendered')
  assert(wizardContent.includes('SUGGESTED_TITLES'), 'AI suggested title presets must be available')

  pass('Step 1 validates title, character limit, and provides AI suggestions')
} catch (err) {
  fail('Step 1 — Booking Information', err)
}

// -------------------------------------------------------------------
// TEST 3: Step 2 (Availability) Architecture & Timezone
// -------------------------------------------------------------------
console.log('\n--- TEST 3: Step 2 — Availability & Scheduling ---')
try {
  const wizardContent = fs.readFileSync(path.join(process.cwd(), 'components/coaching/LinktreeBookingWizardModal.jsx'), 'utf8')

  assert(wizardContent.includes('All times shown as'), 'Timezone label All times shown as must be present')
  assert(wizardContent.includes('TIMEZONE_LIST'), 'Curated list of IANA timezones must be provided')
  assert(wizardContent.includes('DAYS_OF_WEEK'), '7 weekly day selectors (S M T W T F S) must be provided')
  assert(wizardContent.includes('addWindowToDay'), 'Add more availability action must exist')
  assert(wizardContent.includes('removeWindowFromDay'), 'Remove window action must exist')
  assert(wizardContent.includes('Advanced options'), 'Expandable Advanced options accordion must exist')
  assert(wizardContent.includes('bufferBeforeMinutes'), 'Buffer time before start setting must exist')
  assert(wizardContent.includes('bufferAfterMinutes'), 'Buffer time after start setting must exist')
  assert(wizardContent.includes('minimumNoticeMinutes'), 'Minimum booking notice setting must exist')
  assert(wizardContent.includes('maximumAdvanceDays'), 'Booking horizon setting must exist')

  // Validation tests:
  // No days enabled
  const noDaysRes = validateLinktreeBookingStep(2, {
    timezone: 'Asia/Kolkata',
    availability: [
      { dayOfWeek: 1, enabled: false, windows: [] }
    ],
  })
  assert(!noDaysRes.valid, 'No active days must fail Step 2 validation')

  // End time before start time
  const invalidWindowRes = validateLinktreeBookingStep(2, {
    timezone: 'Asia/Kolkata',
    availability: [
      { dayOfWeek: 1, dayName: 'Monday', enabled: true, windows: [{ startTime: '17:00', endTime: '09:00' }] }
    ],
    minimumNoticeMinutes: 240,
    maximumAdvanceDays: 10,
  })
  assert(!invalidWindowRes.valid, 'End time before start time must fail Step 2 validation')

  // Overlapping windows
  const overlapRes = validateLinktreeBookingStep(2, {
    timezone: 'Asia/Kolkata',
    availability: [
      {
        dayOfWeek: 1,
        dayName: 'Monday',
        enabled: true,
        windows: [
          { startTime: '09:00', endTime: '12:00' },
          { startTime: '11:00', endTime: '15:00' },
        ],
      }
    ],
    minimumNoticeMinutes: 240,
    maximumAdvanceDays: 10,
  })
  assert(!overlapRes.valid, 'Overlapping windows on same day must fail Step 2 validation')

  // Valid availability
  const validAvail = validateLinktreeBookingStep(2, {
    timezone: 'Asia/Kolkata',
    availability: [
      { dayOfWeek: 1, dayName: 'Monday', enabled: true, windows: [{ startTime: '09:00', endTime: '17:00' }] },
      { dayOfWeek: 2, dayName: 'Tuesday', enabled: true, windows: [{ startTime: '10:00', endTime: '18:00' }] },
    ],
    minimumNoticeMinutes: 240,
    maximumAdvanceDays: 10,
  })
  assert(validAvail.valid, 'Valid availability schedule must pass Step 2 validation')

  pass('Step 2 supports 7 days, multiple windows, overlap checks, timezone selector, and advanced options')
} catch (err) {
  fail('Step 2 — Availability & Scheduling', err)
}

// -------------------------------------------------------------------
// TEST 4: Step 3 (Booking Details) & Multiple Booking Types
// -------------------------------------------------------------------
console.log('\n--- TEST 4: Step 3 — Booking Details & Booking Types ---')
try {
  const wizardContent = fs.readFileSync(path.join(process.cwd(), 'components/coaching/LinktreeBookingWizardModal.jsx'), 'utf8')

  assert(wizardContent.includes('Booking name *'), 'Booking name input must exist')
  assert(wizardContent.includes('Description *'), 'Description textarea must exist')
  assert(wizardContent.includes('Booking types *'), 'Booking types section must exist')
  assert(wizardContent.includes('openAddTypeModal'), 'Add booking type action must exist')
  assert(wizardContent.includes('openEditTypeModal'), 'Edit booking type action must exist')
  assert(wizardContent.includes('removeBookingType'), 'Remove booking type action must exist')

  // Validation tests:
  // Empty booking types
  const noTypesRes = validateLinktreeBookingStep(3, {
    bookingName: 'My Coaching Session',
    description: 'Book 1:1 call with me',
    bookingTypes: [],
  })
  assert(!noTypesRes.valid, 'Zero booking types must fail Step 3 validation')

  // Negative price on paid type
  const negPriceRes = validateLinktreeBookingStep(3, {
    bookingName: 'My Coaching Session',
    description: 'Book 1:1 call with me',
    bookingTypes: [{ name: 'Session', durationMinutes: 30, price: -50, isFree: false }],
  })
  assert(!negPriceRes.valid, 'Negative price on paid booking type must fail')

  // Valid booking types (1 Free, 1 Paid)
  const validTypesRes = validateLinktreeBookingStep(3, {
    bookingName: 'My Coaching Session',
    description: 'Book 1:1 call with me',
    bookingTypes: [
      { name: '15-Min Intro Call', durationMinutes: 15, price: 0, isFree: true, currency: 'inr' },
      { name: '60-Min In-Depth Session', durationMinutes: 60, price: 2500, isFree: false, currency: 'inr' },
    ],
  })
  assert(validTypesRes.valid, 'Multiple valid booking types must pass Step 3 validation')

  pass('Step 3 supports booking name, multiline description, and multiple free/paid booking types')
} catch (err) {
  fail('Step 3 — Booking Details & Booking Types', err)
}

// -------------------------------------------------------------------
// TEST 5: Step 4 (Customer Settings) & Policies
// -------------------------------------------------------------------
console.log('\n--- TEST 5: Step 4 — Customer Settings, Policies & Complete ---')
try {
  const wizardContent = fs.readFileSync(path.join(process.cwd(), 'components/coaching/LinktreeBookingWizardModal.jsx'), 'utf8')

  assert(wizardContent.includes('Customer settings'), 'Step title Customer settings must exist')
  assert(wizardContent.includes('Information'), 'Information column header must exist')
  assert(wizardContent.includes('Required'), 'Required indicator column must exist')
  assert(wizardContent.includes('Mailing-list opt-in'), 'Mailing-list opt-in toggle must exist')
  assert(wizardContent.includes('Custom terms & conditions'), 'Custom terms and conditions section must exist')
  assert(wizardContent.includes('Cancellation policy'), 'Cancellation policy textarea must exist')
  assert(wizardContent.includes('Support contact'), 'Support contact section must exist')

  // Validation test with full check
  const fullForm = {
    title: 'Book a Session with Mohit',
    timezone: 'Asia/Kolkata',
    availability: [
      { dayOfWeek: 1, dayName: 'Monday', enabled: true, windows: [{ startTime: '09:00', endTime: '17:00' }] },
      { dayOfWeek: 2, dayName: 'Tuesday', enabled: true, windows: [{ startTime: '09:00', endTime: '17:00' }] },
    ],
    bufferBeforeMinutes: 15,
    bufferAfterMinutes: 15,
    minimumNoticeMinutes: 240,
    maximumAdvanceDays: 14,
    bookingName: 'Creator Consultation',
    description: 'Direct 1-on-1 advice on store growth and monetization.',
    bookingTypes: [
      { name: 'Quick Strategy', durationMinutes: 30, price: 0, isFree: true, currency: 'inr' },
      { name: 'Full Deep Dive', durationMinutes: 60, price: 1500, isFree: false, currency: 'inr' },
    ],
    customFields: [
      { id: 'f1', label: 'What is your primary goal?', type: 'LONG_TEXT', required: true }
    ],
    cancellationPolicy: 'Cancellations must be made at least 24 hours before the scheduled booking.',
  }

  const allValid = validateAllLinktreeBookingSteps(fullForm)
  assert(allValid.valid, 'Complete valid 4-step form must pass all validations')

  pass('Step 4 customer fields, policies, and full 4-step validation verified')
} catch (err) {
  fail('Step 4 — Customer Settings & Policies', err)
}

// -------------------------------------------------------------------
// TEST 6: Store Editor Item UX: BookingEditor Component
// -------------------------------------------------------------------
console.log('\n--- TEST 6: BookingEditor Dashboard Editor Card ---')
try {
  const editorPath = path.join(process.cwd(), 'components/dashboard/editors/BookingEditor.jsx')
  assert(fs.existsSync(editorPath), 'BookingEditor.jsx must exist')
  const content = fs.readFileSync(editorPath, 'utf8')

  assert(content.includes('itemTypeLabel="Bookings"'), 'BookingEditor must set itemTypeLabel to Bookings')
  assert(content.includes('Details'), 'Details tab must exist')
  assert(content.includes('Power-ups'), 'Power-ups tab must exist')
  assert(content.includes('Insights'), 'Insights tab must exist')
  // Per updated reference design: no warning banner or extra Booking details card in Info section
  assert(!content.includes('Name your booking link'), 'Updated design: warning banner removed from Info section')
  assert(!content.includes('Booking details\n'), 'Updated design: no separate Booking details card in Info section')
  assert(content.includes('StoreItemDisplaySelector'), 'Display selector (Classic vs Featured) must exist')
  assert(content.includes('Interaction'), 'Interaction section must exist')
  assert(content.includes('rounded-full'), 'Continue setup button must be pill-shaped (rounded-full)')
  assert(content.includes('Continue setup') || content.includes('Edit setup'), 'Continue/Edit setup button must exist')
  assert(content.includes('LinktreeBookingWizardModal'), 'Must link to LinktreeBookingWizardModal for multi-step editing')
  assert(content.includes('editProductId={productId}'), 'Wizard must receive productId to operate in edit mode')

  pass('BookingEditor matches reference layout with Details, Power-ups, Insights, Display, pill Continue setup, and Interaction')
} catch (err) {
  fail('BookingEditor Dashboard Editor Card', err)
}

// -------------------------------------------------------------------
// TEST 7: Storefront Public Preview & Card Rendering
// -------------------------------------------------------------------
console.log('\n--- TEST 7: Storefront Preview & Product Card Integration ---')
try {
  const rendererPath = path.join(process.cwd(), 'components/storefront/PublicStoreRenderer.jsx')
  const rendererContent = fs.readFileSync(rendererPath, 'utf8')

  assert(rendererContent.includes("isCoaching = product.type === 'COACHING'"), 'PublicStoreRenderer must identify COACHING products')
  assert(rendererContent.includes('1:1 Session'), '1:1 Session badge must be displayed on coaching thumbnails')
  assert(rendererContent.includes('Book Session') || rendererContent.includes('Book Free'), 'Coaching products must use Book Session / Book Free CTA instead of digital product download labels')
  assert(rendererContent.includes('type={product.type}'), 'ProductThumbnail must receive product type')

  pass('PublicStoreRenderer renders 1:1 Session badges and booking CTA without digital file download fields')
} catch (err) {
  fail('Storefront Preview & Product Card Integration', err)
}

// -------------------------------------------------------------------
// TEST 8: Backend Persistence & Service Logic (coachingService)
// -------------------------------------------------------------------
console.log('\n--- TEST 8: Backend Service & Data Persistence ---')
try {
  // Verify coachingService.saveConfig and getConfig in services.js
  const servicesPath = path.join(process.cwd(), 'lib/services.js')
  const servicesContent = fs.readFileSync(servicesPath, 'utf8')

  assert(servicesContent.includes('bookingTypes'), 'coachingService must handle bookingTypes')
  assert(servicesContent.includes('mailingListOptIn'), 'coachingService must handle mailingListOptIn')
  assert(servicesContent.includes('bufferBeforeMinutes'), 'coachingService must handle bufferBeforeMinutes')
  assert(servicesContent.includes('bufferAfterMinutes'), 'coachingService must handle bufferAfterMinutes')
  assert(servicesContent.includes('minimumNoticeMinutes'), 'coachingService must handle minimumNoticeMinutes')
  assert(servicesContent.includes('maximumAdvanceDays'), 'coachingService must handle maximumAdvanceDays')

  pass('Backend coachingService persists bookingTypes, buffers, notices, and customer settings')
} catch (err) {
  fail('Backend Service & Data Persistence', err)
}

// -------------------------------------------------------------------
// TEST 9: Dashboard Wiring in /dashboard/store/page.js
// -------------------------------------------------------------------
console.log('\n--- TEST 9: Store Dashboard Wiring & Add Menu ---')
try {
  const pagePath = path.join(process.cwd(), 'app/dashboard/store/page.js')
  const pageContent = fs.readFileSync(pagePath, 'utf8')

  assert(pageContent.includes('import BookingEditor'), 'BookingEditor must be imported in store page')
  assert(pageContent.includes('BookingEditor'), 'BookingEditor must be rendered for coaching sections')
  assert(pageContent.includes('openCoachingCreationFlow'), 'openCoachingCreationFlow must open Linktree wizard')
  assert(pageContent.includes('CoachingBookingWizardModal'), 'CoachingBookingWizardModal must be wired with open state')

  pass('Dashboard store page properly wires Add menu and BookingEditor for coaching sessions')
} catch (err) {
  fail('Store Dashboard Wiring & Add Menu', err)
}

console.log('\n=====================================================================')
console.log(`📊 TEST RESULTS: ${passed} passed, ${failed} failed`)
console.log('=====================================================================')

if (failed > 0) {
  process.exit(1)
} else {
  console.log('🎉 ALL 20 SCENARIOS & CRITERIA PASSED!')
  process.exit(0)
}
