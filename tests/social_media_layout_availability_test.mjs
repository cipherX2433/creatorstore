import assert from 'node:assert'
import fs from 'node:fs'
import path from 'node:path'
import {
  SOCIAL_PLATFORMS,
  SOCIAL_DISPLAY_STYLES,
  getSocialPlatform,
  isInstagramPlatform,
  isSocialStyleAvailable,
  resolveSocialStyle,
  isValidSocialStyle,
  NON_INSTAGRAM_AVAILABLE_LAYOUTS,
  COMING_SOON_LAYOUTS,
} from '../lib/socialPlatforms.js'

const ROOT = process.cwd()

console.log('--- Starting CreatorStore Social Media Layout Availability & Gating Tests ---\n')

// ============================================================================
// Test 1: Canonical Instagram Detection
// ============================================================================
console.log('Test 1: Validating Canonical Instagram Identification...')

assert.strictEqual(isInstagramPlatform('instagram'), true, 'String "instagram" must be identified as Instagram')
assert.strictEqual(isInstagramPlatform('INSTAGRAM'), true, 'Case-insensitive string "INSTAGRAM" must be identified as Instagram')
assert.strictEqual(isInstagramPlatform({ id: 'instagram', name: 'Instagram' }), true, 'Object with id "instagram" must be identified as Instagram')
assert.strictEqual(isInstagramPlatform({ platform: 'instagram' }), true, 'Object with platform "instagram" must be identified as Instagram')
assert.strictEqual(isInstagramPlatform('https://instagram.com/myhandle'), true, 'Instagram URL must be identified as Instagram')

// Non-Instagram platforms
const nonIgPlatforms = [
  'youtube',
  'tiktok',
  'facebook',
  'x',
  'twitter',
  'linkedin',
  'pinterest',
  'snapchat',
  'twitch',
  'discord',
  'whatsapp',
  'telegram',
  'generic',
]

for (const plat of nonIgPlatforms) {
  assert.strictEqual(isInstagramPlatform(plat), false, `Platform "${plat}" must not be identified as Instagram`)
  assert.strictEqual(isInstagramPlatform({ id: plat }), false, `Object with id "${plat}" must not be identified as Instagram`)
}

console.log('✅ Test 1 PASSED: Canonical Instagram identifier detection verified.\n')

// ============================================================================
// Test 2: Layout Availability Rule (Instagram has all 6, others only Classic & Single)
// ============================================================================
console.log('Test 2: Validating Platform-Aware Layout Availability Rules...')

const allStyles = ['classic', 'cards', 'grid', 'carousel', 'profile', 'single']

// Instagram retains all 6 styles
for (const styleId of allStyles) {
  assert.strictEqual(
    isSocialStyleAvailable(styleId, 'instagram'),
    true,
    `Instagram must have style "${styleId}" available`
  )
}

// All other platforms only have Classic and Single
for (const plat of nonIgPlatforms) {
  assert.strictEqual(
    isSocialStyleAvailable('classic', plat),
    true,
    `Platform "${plat}" must have "classic" available`
  )
  assert.strictEqual(
    isSocialStyleAvailable('single', plat),
    true,
    `Platform "${plat}" must have "single" available`
  )

  for (const styleId of COMING_SOON_LAYOUTS) {
    assert.strictEqual(
      isSocialStyleAvailable(styleId, plat),
      false,
      `Platform "${plat}" must have coming soon style "${styleId}" disabled`
    )
  }
}

console.log('✅ Test 2 PASSED: Layout availability rules match specifications.\n')

// ============================================================================
// Test 3: Safe Fallback for Previously Saved Layouts
// ============================================================================
console.log('Test 3: Validating Safe Fallback of Saved Unsupported Layouts to Classic...')

// Instagram: keeps all layouts
assert.strictEqual(resolveSocialStyle('cards', 'instagram'), 'cards', 'Instagram preserves "cards"')
assert.strictEqual(resolveSocialStyle('grid', 'instagram'), 'grid', 'Instagram preserves "grid"')
assert.strictEqual(resolveSocialStyle('carousel', 'instagram'), 'carousel', 'Instagram preserves "carousel"')
assert.strictEqual(resolveSocialStyle('profile', 'instagram'), 'profile', 'Instagram preserves "profile"')
assert.strictEqual(resolveSocialStyle('single', 'instagram'), 'single', 'Instagram preserves "single"')
assert.strictEqual(resolveSocialStyle('classic', 'instagram'), 'classic', 'Instagram preserves "classic"')

// Non-Instagram: preserves Classic and Single, defaults others to Classic
for (const plat of ['youtube', 'tiktok', 'facebook', 'x', 'linkedin', 'twitch']) {
  assert.strictEqual(resolveSocialStyle('classic', plat), 'classic', `${plat} preserves classic`)
  assert.strictEqual(resolveSocialStyle('single', plat), 'single', `${plat} preserves single`)
  assert.strictEqual(resolveSocialStyle('cards', plat), 'classic', `${plat} defaults cards to classic`)
  assert.strictEqual(resolveSocialStyle('grid', plat), 'classic', `${plat} defaults grid to classic`)
  assert.strictEqual(resolveSocialStyle('carousel', plat), 'classic', `${plat} defaults carousel to classic`)
  assert.strictEqual(resolveSocialStyle('profile', plat), 'classic', `${plat} defaults profile to classic`)
}

// Section props object inspection
assert.strictEqual(
  resolveSocialStyle({ platform: 'youtube', layout: 'grid' }),
  'classic',
  'Section with YouTube and grid must safely resolve to classic'
)
assert.strictEqual(
  resolveSocialStyle({ platform: 'instagram', layout: 'grid' }),
  'grid',
  'Section with Instagram and grid must resolve to grid'
)

console.log('✅ Test 3 PASSED: Safe fallback to classic verified.\n')

// ============================================================================
// Test 4: SocialStylePicker UI & Coming Soon Badging
// ============================================================================
console.log('Test 4: Inspecting SocialStylePicker component implementation...')

const pickerPath = path.join(ROOT, 'components/dashboard/SocialStylePicker.jsx')
assert.ok(fs.existsSync(pickerPath), 'SocialStylePicker.jsx must exist')
const pickerSrc = fs.readFileSync(pickerPath, 'utf8')

assert.ok(pickerSrc.includes('isSocialStyleAvailable'), 'SocialStylePicker must import and use isSocialStyleAvailable')
assert.ok(pickerSrc.includes('Coming Soon'), 'SocialStylePicker must render "Coming Soon" badge')
assert.ok(pickerSrc.includes('opacity-55') || pickerSrc.includes('opacity-50'), 'Unavailable styles must have reduced opacity')
assert.ok(pickerSrc.includes('cursor-not-allowed'), 'Unavailable styles must have cursor-not-allowed')
assert.ok(pickerSrc.includes('if (!isAvailable) return'), 'Click handler must reject unavailable styles')
assert.ok(pickerSrc.includes('tabIndex={isAvailable && !disabled ? 0 : -1}'), 'Unavailable styles must not be focusable')
assert.ok(pickerSrc.includes('aria-disabled={!isAvailable || disabled}'), 'Unavailable styles must indicate aria-disabled')

console.log('✅ Test 4 PASSED: SocialStylePicker UI specifications verified.\n')

// ============================================================================
// Test 5: SocialDisplaySelectModalView Guard & Submission Lock
// ============================================================================
console.log('Test 5: Inspecting SocialDisplaySelectModalView component implementation...')

const modalPath = path.join(ROOT, 'components/dashboard/SocialDisplaySelectModalView.jsx')
assert.ok(fs.existsSync(modalPath), 'SocialDisplaySelectModalView.jsx must exist')
const modalSrc = fs.readFileSync(modalPath, 'utf8')

assert.ok(modalSrc.includes('isSocialStyleAvailable'), 'Modal must import isSocialStyleAvailable')
assert.ok(modalSrc.includes('setSelectedStyle(\'classic\')'), 'Modal must auto-correct unavailable selected style to classic')
assert.ok(modalSrc.includes('handleSelectStyle'), 'Modal must guard layout selection')
assert.ok(modalSrc.includes('disabled={isSubmitting || !isCurrentStyleAvailable}'), 'Add to my store button must be disabled for unavailable styles')
assert.ok(modalSrc.includes('if (!isCurrentStyleAvailable)'), 'handleAction must prevent submitting unavailable styles')

console.log('✅ Test 5 PASSED: SocialDisplaySelectModalView guard and submission lock verified.\n')

// ============================================================================
// Test 6: SocialItemEditor, AddToStoreModal & PublicStoreRenderer Integration
// ============================================================================
console.log('Test 6: Validating SocialItemEditor, AddToStoreModal, and PublicStoreRenderer integration...')

const editorPath = path.join(ROOT, 'components/dashboard/editors/SocialItemEditor.jsx')
const editorSrc = fs.readFileSync(editorPath, 'utf8')
assert.ok(editorSrc.includes('isSocialStyleAvailable'), 'SocialItemEditor must import isSocialStyleAvailable')
assert.ok(editorSrc.includes('resolveSocialStyle(initialProps, platform.id)'), 'SocialItemEditor must resolve initial layout with platform.id')
assert.ok(editorSrc.includes('if (!isSocialStyleAvailable(newLayout, platform.id)) return'), 'SocialItemEditor must reject unavailable layouts on change')

const addModalPath = path.join(ROOT, 'components/dashboard/AddToStoreModal.jsx')
const addModalSrc = fs.readFileSync(addModalPath, 'utf8')
assert.ok(addModalSrc.includes('resolveSocialStyle(styleKey, platformInfo?.id)'), 'AddToStoreModal must sanitize styleKey on select')

const storePagePath = path.join(ROOT, 'app/dashboard/store/page.js')
const storePageSrc = fs.readFileSync(storePagePath, 'utf8')
assert.ok(storePageSrc.includes('resolveSocialStyle(styleKey, platformInfo?.id)'), 'store/page.js must sanitize styleKey on select')

const rendererPath = path.join(ROOT, 'components/storefront/PublicStoreRenderer.jsx')
const rendererSrc = fs.readFileSync(rendererPath, 'utf8')
assert.ok(rendererSrc.includes('resolveSocialStyle(section.props?.layout || section.props?.displayMode || section.props?.displayStyle, platform.id)'), 'PublicStoreRenderer must resolve social style with platform.id')

console.log('✅ Test 6 PASSED: End-to-end integration across editor, modal, store page, and storefront verified.\n')

console.log('=====================================================================')
console.log('🎉 ALL SOCIAL MEDIA LAYOUT AVAILABILITY & GATING TESTS PASSED! 🎉')
console.log('=====================================================================\n')
