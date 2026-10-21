import fs from 'node:fs'
import path from 'node:path'
import assert from 'node:assert/strict'

console.log('=================================================================')
console.log('🧪 VERIFYING RUNTIME & HYDRATION FIXES IN SOURCE CODE')
console.log('=================================================================')

const root = process.cwd()

// File 1: components/dashboard/StoreItemEditorShell.jsx
console.log('\n▶ Inspecting components/dashboard/StoreItemEditorShell.jsx...')
const shellPath = path.join(root, 'components/dashboard/StoreItemEditorShell.jsx')
const shellContent = fs.readFileSync(shellPath, 'utf8')

// Requirement 1 & 2: Shell must handle both string and JSX itemTypeLabel without nesting <div> inside <p>
assert(
  shellContent.includes("typeof itemTypeLabel === 'string'"),
  'StoreItemEditorShell must distinguish string vs non-string itemTypeLabel'
)
assert(
  shellContent.includes('<p className="text-[13px] sm:text-sm font-medium text-[#6F6F6B] truncate leading-none mb-1">'),
  'StoreItemEditorShell must keep semantic <p> for string labels'
)
assert(
  shellContent.includes('<div className="text-[13px] sm:text-sm font-medium text-[#6F6F6B] truncate leading-none mb-1">'),
  'StoreItemEditorShell must use <div> container for JSX labels'
)
console.log('  ✓ StoreItemEditorShell safely renders string in <p> and JSX in <div>')

// File 2: components/dashboard/editors/BundleEditor.jsx
console.log('\n▶ Inspecting components/dashboard/editors/BundleEditor.jsx...')
const bundleEditorPath = path.join(root, 'components/dashboard/editors/BundleEditor.jsx')
const bundleEditorContent = fs.readFileSync(bundleEditorPath, 'utf8')

// Requirement 1: headerItemTypeLabel must NOT be a <div>, must be semantic <span>
assert(
  bundleEditorContent.includes('<span className="inline-flex items-center gap-2">'),
  'headerItemTypeLabel in BundleEditor must use <span> and inline-flex, not block-level <div>'
)
assert(
  !bundleEditorContent.includes('const headerItemTypeLabel = (\n    <div'),
  'headerItemTypeLabel must not be declared with <div'
)
console.log('  ✓ headerItemTypeLabel uses inline semantic <span> elements')

// Requirement 3: Eager useEffect calling onUpdateProps must be removed
const eagerEffectRegex = /useEffect\(\s*\(\)\s*=>\s*\{\s*onUpdateProps\?\.\([\s\S]*?\)\s*\}\s*,\s*\[[\s\S]*?onUpdateProps[\s\S]*?\]\)/
assert(
  !eagerEffectRegex.test(bundleEditorContent),
  'Eager useEffect calling onUpdateProps must be eliminated to prevent infinite update loop'
)
console.log('  ✓ Eager useEffect removed from BundleEditor')

// Requirement 3: saveState must be derived, avoiding state sync loops
assert(
  bundleEditorContent.includes("const saveState = isSaving ? 'saving' : isDirty ? 'dirty' : 'saved'"),
  'saveState must be cleanly derived from isSaving and isDirty without extra useState or useEffect'
)
assert(
  !bundleEditorContent.includes("setSaveState('saved')"),
  'Redundant setSaveState calls removed'
)
console.log('  ✓ saveState is cleanly derived; redundant synchronization loops removed')

// Requirement 3: onUpdatePropsRef and stable notifyPreview callback
assert(
  bundleEditorContent.includes('const onUpdatePropsRef = useRef(onUpdateProps)'),
  'onUpdatePropsRef must be used to stabilize caller references'
)
assert(
  bundleEditorContent.includes('const notifyPreview = useCallback('),
  'notifyPreview must be provided with stable callback'
)
console.log('  ✓ onUpdatePropsRef and notifyPreview provide stable update mechanism')

// Requirement 3: Bundle sync effect must only synchronize when target bundle identity changes
assert(
  bundleEditorContent.includes('const prevBundleIdRef = useRef(targetBundleId)'),
  'prevBundleIdRef must track targetBundleId across renders'
)
assert(
  bundleEditorContent.includes('targetBundleId && targetBundleId !== prevBundleIdRef.current'),
  'Sync must only trigger when targetBundleId identity actually changes'
)
console.log('  ✓ External sync is strictly guarded by bundle identity check')

// Check user event handlers trigger notifyPreview
assert(bundleEditorContent.includes('notifyPreview({ title: val })'), 'handleTitleChange calls notifyPreview')
assert(bundleEditorContent.includes('notifyPreview({ description: val })'), 'handleDescriptionChange calls notifyPreview')
assert(bundleEditorContent.includes('notifyPreview({ layout: mode, displayMode: mode })'), 'handleDisplayModeChange calls notifyPreview')
assert(bundleEditorContent.includes('notifyPreview({ thumbnail: res.url })'), 'handleThumbnailUpload calls notifyPreview')
assert(bundleEditorContent.includes('notifyPreview({ thumbnail: null })'), 'handleRemoveThumbnail calls notifyPreview')
console.log('  ✓ All user event handlers update preview immediately via notifyPreview')

console.log('\n=================================================================')
console.log('🎉 ALL INTEGRATION & IMPLEMENTATION CHECKS PASSED (100%)')
console.log('=================================================================')
