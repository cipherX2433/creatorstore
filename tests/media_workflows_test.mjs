import assert from 'node:assert'
import fs from 'node:fs'
import path from 'node:path'
import {
  extractTikTokId,
  extractVimeoId,
  extractDirectVideo,
  extractYouTubeId,
  detectMediaPlatform,
  MEDIA_PLATFORMS,
} from '../lib/mediaUtils.js'

const ROOT = process.cwd()

console.log('--- Starting Complete Video, TikTok Video & Vimeo Verification Tests ---\n')

// ============================================================================
// 1. URL Extraction, Normalization & Host Security Testing
// ============================================================================
console.log('1. Testing URL Parsers, Whitelist Validation & Security...')

// TikTok Valid URLs
const tiktokId = extractTikTokId('https://www.tiktok.com/@creator/video/7123456789012345678')
assert.strictEqual(tiktokId, '7123456789012345678', 'Must parse standard TikTok video ID')

const tiktokShort = extractTikTokId('https://vm.tiktok.com/ZM2XYZ123/')
assert.strictEqual(tiktokShort, 'ZM2XYZ123', 'Must parse short vm.tiktok.com ID')

// TikTok Malicious / Spoofed Hosts
assert.strictEqual(extractTikTokId('https://evil-tiktok.com/@creator/video/12345'), null, 'Must reject spoofed tiktok domain')
assert.strictEqual(extractTikTokId('https://tiktok.com.attacker.com/video/12345'), null, 'Must reject subdomain spoofing')
assert.strictEqual(extractTikTokId('javascript:alert(1)'), null, 'Must reject non-http schemes')

// Vimeo Valid URLs
const vimeoStandard = extractVimeoId('https://vimeo.com/123456789')
assert.strictEqual(vimeoStandard, '123456789', 'Must parse standard Vimeo ID')

const vimeoChannel = extractVimeoId('https://vimeo.com/channels/staffpicks/987654321')
assert.strictEqual(vimeoChannel, '987654321', 'Must parse Vimeo channel URL ID')

const vimeoPlayer = extractVimeoId('https://player.vimeo.com/video/555444333')
assert.strictEqual(vimeoPlayer, '555444333', 'Must parse player.vimeo.com URL ID')

// Vimeo Malicious / Spoofed Hosts
assert.strictEqual(extractVimeoId('https://vimeo.com.fake.org/123456'), null, 'Must reject spoofed vimeo domain')
assert.strictEqual(extractVimeoId('https://notvimeo.com/123456'), null, 'Must reject unrelated domain')

// Direct Video & Loom
const directMp4 = extractDirectVideo('https://storage.googleapis.com/assets/sample-showcase.mp4')
assert.ok(directMp4, 'Must parse direct MP4 URL')
assert.strictEqual(directMp4.format, 'mp4')
assert.strictEqual(directMp4.title, 'Sample Showcase')

const directWebm = extractDirectVideo('https://cdn.example.com/videos/product-demo.webm?auth=token')
assert.ok(directWebm, 'Must parse direct WEBM URL')
assert.strictEqual(directWebm.format, 'webm')
assert.strictEqual(directWebm.title, 'Product Demo')

const loomVideo = extractDirectVideo('https://www.loom.com/share/abc123xyz456')
assert.ok(loomVideo, 'Must parse Loom share URL')
assert.strictEqual(loomVideo.isLoom, true)
assert.strictEqual(loomVideo.videoId, 'abc123xyz456')

// Media platform detection
assert.strictEqual(detectMediaPlatform('https://youtu.be/dQw4w9WgXcQ'), 'youtube')
assert.strictEqual(detectMediaPlatform('https://www.tiktok.com/@dance/video/7123456789012345678'), 'tiktok')
assert.strictEqual(detectMediaPlatform('https://vimeo.com/123456789'), 'vimeo')
assert.strictEqual(detectMediaPlatform('https://example.com/intro.mp4'), 'video')
assert.strictEqual(detectMediaPlatform('https://www.loom.com/share/12345'), 'video')

// Media platform registry
assert.ok(MEDIA_PLATFORMS.youtube, 'Registry must include youtube')
assert.ok(MEDIA_PLATFORMS.tiktok, 'Registry must include tiktok')
assert.ok(MEDIA_PLATFORMS.vimeo, 'Registry must include vimeo')
assert.ok(MEDIA_PLATFORMS.video, 'Registry must include video')

console.log('✅ URL Parsers, Whitelist Validation & Security passed.\n')

// ============================================================================
// 2. Backend Metadata Endpoints & Upload Infrastructure Verification
// ============================================================================
console.log('2. Verifying Backend Endpoints & Upload Capabilities...')
const apiRoutePath = path.join(ROOT, 'app/api/[[...path]]/route.js')
assert.ok(fs.existsSync(apiRoutePath), 'route.js does not exist')
const apiRouteContent = fs.readFileSync(apiRoutePath, 'utf8')

// TikTok metadata route
assert.ok(apiRouteContent.includes('/media/tiktok/metadata'), 'Must provide /api/media/tiktok/metadata endpoint')
assert.ok(apiRouteContent.includes('tiktok.com/oembed'), 'TikTok metadata endpoint must use public oEmbed')
assert.ok(apiRouteContent.includes('ALLOWED_TIKTOK_HOSTS'), 'TikTok endpoint must validate host against SSRF')

// Vimeo metadata route
assert.ok(apiRouteContent.includes('/media/vimeo/metadata'), 'Must provide /api/media/vimeo/metadata endpoint')
assert.ok(apiRouteContent.includes('vimeo.com/api/oembed.json'), 'Vimeo metadata endpoint must use public oEmbed')
assert.ok(apiRouteContent.includes('ALLOWED_VIMEO_HOSTS'), 'Vimeo endpoint must validate host against SSRF')

// Video metadata route
assert.ok(apiRouteContent.includes('/media/video/metadata'), 'Must provide /api/media/video/metadata endpoint')
assert.ok(apiRouteContent.includes('loom.com/v1/oembed'), 'Video metadata endpoint must support Loom oEmbed')

// Upload video MIME types and limits
assert.ok(apiRouteContent.includes("'video/mp4'"), 'Upload route must support video/mp4')
assert.ok(apiRouteContent.includes("'video/webm'"), 'Upload route must support video/webm')
assert.ok(apiRouteContent.includes("'video/quicktime'"), 'Upload route must support video/quicktime (.mov)')
assert.ok(apiRouteContent.includes('50 * 1024 * 1024'), 'Upload route must enforce 50MB limit')

console.log('✅ Backend API endpoints & Upload capabilities verified.\n')

// ============================================================================
// 3. Shared AddMediaModalView Component Verification
// ============================================================================
console.log('3. Verifying AddMediaModalView Component...')
const addMediaViewPath = path.join(ROOT, 'components/dashboard/AddMediaModalView.jsx')
assert.ok(fs.existsSync(addMediaViewPath), 'AddMediaModalView.jsx does not exist')
const addMediaViewContent = fs.readFileSync(addMediaViewPath, 'utf8')

assert.ok(addMediaViewContent.includes('handleUrlChange'), 'Must handle URL change')
assert.ok(addMediaViewContent.includes('fetchMetadata'), 'Must fetch metadata')
assert.ok(addMediaViewContent.includes('media-result-card'), 'Must provide selectable metadata result card')
assert.ok(addMediaViewContent.includes('media-url-input'), 'Must have accessible URL input with id')
assert.ok(addMediaViewContent.includes('uploadZone') || addMediaViewContent.includes('handleFileUpload'), 'Video mode must provide file upload zone')
assert.ok(addMediaViewContent.includes('50MB'), 'Must display 50MB file limit warning for video uploads')
assert.ok(!addMediaViewContent.includes('Connect YouTube'), 'Must not include Connect YouTube button')
assert.ok(!addMediaViewContent.includes('Connect TikTok'), 'Must not include Connect TikTok button')
assert.ok(!addMediaViewContent.includes('Connect Vimeo'), 'Must not include Connect Vimeo button')

console.log('✅ AddMediaModalView component verified.\n')

// ============================================================================
// 4. Shared MediaContentEditor Component Verification
// ============================================================================
console.log('4. Verifying MediaContentEditor Component...')
const mediaEditorPath = path.join(ROOT, 'components/dashboard/editors/MediaContentEditor.jsx')
assert.ok(fs.existsSync(mediaEditorPath), 'MediaContentEditor.jsx does not exist')
const mediaEditorContent = fs.readFileSync(mediaEditorPath, 'utf8')

assert.ok(mediaEditorContent.includes('StoreItemEditorShell'), 'Must reuse StoreItemEditorShell')
assert.ok(mediaEditorContent.includes('activeTab'), 'Must have tab switcher')
assert.ok(mediaEditorContent.includes('media-title-input'), 'Must have title input with id')
assert.ok(mediaEditorContent.includes('120'), 'Must enforce 120 character limit counter')
assert.ok(mediaEditorContent.includes('media-custom-thumbnail-btn'), 'Must have custom thumbnail upload button')
assert.ok(mediaEditorContent.includes("layout === 'classic'"), 'Must support Classic layout')
assert.ok(mediaEditorContent.includes("layout === 'image'"), 'Must support Image layout')
assert.ok(mediaEditorContent.includes('media-layout-classic-btn'), 'Classic layout selector must have unique id')
assert.ok(mediaEditorContent.includes('media-layout-image-btn'), 'Image layout selector must have unique id')
assert.ok(mediaEditorContent.includes('handleRefreshMetadata'), 'Must allow refreshing metadata')
assert.ok(!mediaEditorContent.includes('autoplay'), 'Editor preview must not autoplay external videos')

console.log('✅ MediaContentEditor component verified.\n')

// ============================================================================
// 5. Storefront Media Card Rendering Verification
// ============================================================================
console.log('5. Verifying Storefront Media Card Rendering for All Types...')
const storefrontCardPath = path.join(ROOT, 'components/storefront/StorefrontMediaCard.jsx')
assert.ok(fs.existsSync(storefrontCardPath), 'StorefrontMediaCard.jsx does not exist')
const storefrontCardContent = fs.readFileSync(storefrontCardPath, 'utf8')

assert.ok(storefrontCardContent.includes("['tiktok', 'vimeo'].includes(sectionType)") || storefrontCardContent.includes("['youtube', 'tiktok', 'vimeo'].includes(sectionType)"), 'Must handle youtube, tiktok, and vimeo')
assert.ok(storefrontCardContent.includes('target="_blank"'), 'Must open video links in a new tab')
assert.ok(storefrontCardContent.includes('rel="noopener noreferrer"'), 'Must include secure rel attributes')
assert.ok(storefrontCardContent.includes('tiktokThumbFallback'), 'Must provide fallback thumbnail for TikTok')
assert.ok(storefrontCardContent.includes('vimeoThumbFallback'), 'Must provide fallback thumbnail for Vimeo')
assert.ok(storefrontCardContent.includes('defaultVideoThumb'), 'Must provide fallback thumbnail for Video')
assert.ok(storefrontCardContent.includes('customThumbnail'), 'Custom thumbnail must take precedence over source thumbnail')

console.log('✅ StorefrontMediaCard rendering verified.\n')

// ============================================================================
// 6. Store Dashboard Wiring Verification (app/dashboard/store/page.js)
// ============================================================================
console.log('6. Verifying Store Dashboard Integration in page.js...')
const storePagePath = path.join(ROOT, 'app/dashboard/store/page.js')
assert.ok(fs.existsSync(storePagePath), 'store/page.js does not exist')
const storePageContent = fs.readFileSync(storePagePath, 'utf8')

assert.ok(storePageContent.includes('import MediaContentEditor from'), 'Must import MediaContentEditor in store page')
assert.ok(storePageContent.includes('import AddMediaModalView from'), 'Must import AddMediaModalView in store page')
assert.ok(storePageContent.includes("<MediaContentEditor"), 'Must render MediaContentEditor for editing')
assert.ok(storePageContent.includes("['tiktok', 'vimeo', 'video'].includes(editingSection.type)"), 'Must route tiktok, vimeo, and video to MediaContentEditor')
assert.ok(storePageContent.includes("['add_tiktok', 'add_vimeo', 'add_video'].includes(addModalType)"), 'Must handle add_tiktok, add_vimeo, and add_video modal states')
assert.ok(storePageContent.includes("s.type === 'tiktok'"), 'Must handle tiktok section styling and badge')
assert.ok(storePageContent.includes("s.type === 'vimeo'"), 'Must handle vimeo section styling and badge')

console.log('✅ Store page wiring verified.\n')

// ============================================================================
// 7. AddToStoreModal.jsx Wiring Verification
// ============================================================================
console.log('7. Verifying AddToStoreModal.jsx Integration...')
const modalPath = path.join(ROOT, 'components/dashboard/AddToStoreModal.jsx')
assert.ok(fs.existsSync(modalPath), 'AddToStoreModal.jsx does not exist')
const modalContent = fs.readFileSync(modalPath, 'utf8')

assert.ok(modalContent.includes('import AddMediaModalView from'), 'Must import AddMediaModalView in AddToStoreModal')
assert.ok(modalContent.includes("<AddMediaModalView"), 'Must render AddMediaModalView in AddToStoreModal subflow')
assert.ok(modalContent.includes("setAddModalType('add_tiktok')"), 'Must route TikTok option to add_tiktok')
assert.ok(modalContent.includes("setAddModalType('add_vimeo')"), 'Must route Vimeo option to add_vimeo')
assert.ok(modalContent.includes("setAddModalType('add_video')"), 'Must route Video option to add_video')

console.log('✅ AddToStoreModal integration verified.\n')

// ============================================================================
// 8. PublicStoreRenderer.jsx Integration Verification
// ============================================================================
console.log('8. Verifying PublicStoreRenderer.jsx Integration...')
const rendererPath = path.join(ROOT, 'components/storefront/PublicStoreRenderer.jsx')
assert.ok(fs.existsSync(rendererPath), 'PublicStoreRenderer.jsx does not exist')
const rendererContent = fs.readFileSync(rendererPath, 'utf8')

assert.ok(
  rendererContent.includes("case 'tiktok':") && rendererContent.includes("case 'vimeo':") && rendererContent.includes("case 'video':"),
  'PublicStoreRenderer must route tiktok, vimeo, and video to StorefrontMediaCard'
)

console.log('✅ PublicStoreRenderer integration verified.\n')

console.log('🎉 ALL 8 VERIFICATION CHECKS PASSED SUCCESSFULLY! 🎉\n')
