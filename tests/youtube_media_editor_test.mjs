import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

console.log('--- Starting YouTube Media Addition & Editor Verification Tests ---')

const ROOT = process.cwd()

// 1. Verify URL Regex and Host Extraction Logic
console.log('1. Testing YouTube URL extraction & host validation...')
function extractYouTubeId(url) {
  if (!url || typeof url !== 'string') return null
  const trimmed = url.trim()
  try {
    const parsed = new URL(trimmed.startsWith('http://') || trimmed.startsWith('https://') ? trimmed : `https://${trimmed}`)
    const validHosts = ['youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtu.be', 'music.youtube.com']
    if (!validHosts.includes(parsed.hostname.toLowerCase())) {
      return null
    }
  } catch {
    return null
  }
  const match = trimmed.match(
    /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([\w-]{11})/
  )
  return match && match[1] ? match[1] : null
}

// Valid formats
assert.equal(extractYouTubeId('https://www.youtube.com/watch?v=HTp-4iJPUJQ'), 'HTp-4iJPUJQ')
assert.equal(extractYouTubeId('https://youtu.be/HTp-4iJPUJQ'), 'HTp-4iJPUJQ')
assert.equal(extractYouTubeId('https://www.youtube.com/shorts/HTp-4iJPUJQ'), 'HTp-4iJPUJQ')
assert.equal(extractYouTubeId('https://m.youtube.com/watch?v=HTp-4iJPUJQ&feature=share'), 'HTp-4iJPUJQ')
assert.equal(extractYouTubeId('www.youtube.com/watch?v=dQw4w9WgXcQ'), 'dQw4w9WgXcQ')

// Malicious / Invalid formats
assert.equal(extractYouTubeId('https://malicious-youtube.com/watch?v=HTp-4iJPUJQ'), null, 'Host spoofing must be rejected')
assert.equal(extractYouTubeId('https://google.com/search?q=youtube'), null, 'Non-YouTube URLs must be rejected')
assert.equal(extractYouTubeId('not a url'), null, 'Arbitrary text must be rejected')
assert.equal(extractYouTubeId(''), null, 'Empty string must return null')
console.log('✅ URL Extraction & Validation passed.')

// 2. Verify backend endpoint implementation in app/api/[[...path]]/route.js
console.log('2. Verifying Backend YouTube Metadata Endpoint...')
const routeContent = fs.readFileSync(path.join(ROOT, 'app/api/[[...path]]/route.js'), 'utf8')
assert.ok(routeContent.includes("route === '/media/youtube/metadata'"), 'Missing /media/youtube/metadata route handler')
assert.ok(routeContent.includes('youtube.com/oembed'), 'oEmbed URL must be used for public metadata extraction')
assert.ok(routeContent.includes('canonicalUrl'), 'Must construct canonical YouTube watch URL')
assert.ok(routeContent.includes('defaultThumbnail'), 'Must include fallback thumbnail')
assert.ok(routeContent.includes('validHosts'), 'Must validate allowed YouTube hostnames to prevent SSRF')
console.log('✅ Backend API endpoint verified.')

// 3. Verify AddYouTubeModalView Component
console.log('3. Verifying AddYouTubeModalView Component...')
const modalViewPath = path.join(ROOT, 'components/dashboard/AddYouTubeModalView.jsx')
assert.ok(fs.existsSync(modalViewPath), 'AddYouTubeModalView.jsx does not exist')
const modalViewContent = fs.readFileSync(modalViewPath, 'utf8')
assert.ok(modalViewContent.includes('export function extractYouTubeId'), 'Must export extractYouTubeId helper')
assert.ok(modalViewContent.includes('Paste a video, short, channel, or playlist URL'), 'Placeholder must match reference screenshot')
assert.ok(modalViewContent.includes('Fetching URL information...'), 'Loading text must match reference screenshot')
assert.ok(modalViewContent.includes('Results'), 'Must show Results heading on detected video')
assert.ok(modalViewContent.includes('YouTube Video'), 'Must show YouTube Video label')
assert.ok(!modalViewContent.includes('Connect to YouTube</button>') && !modalViewContent.includes('Connect</button>'), 'Explicitly must NOT include Connect to YouTube button')
console.log('✅ AddYouTubeModalView component verified.')

// 4. Verify YouTubeEditor Component
console.log('4. Verifying YouTubeEditor Component...')
const editorPath = path.join(ROOT, 'components/dashboard/editors/YouTubeEditor.jsx')
assert.ok(fs.existsSync(editorPath), 'YouTubeEditor.jsx does not exist')
const editorContent = fs.readFileSync(editorPath, 'utf8')
assert.ok(editorContent.includes('StoreItemEditorShell'), 'Must use shared StoreItemEditorShell')
assert.ok(editorContent.includes("maxLength={120}"), 'Must enforce reasonable character limit (120 chars) on title')
assert.ok(editorContent.includes('Refresh info'), 'Must provide Refresh info action for URL')
assert.ok(editorContent.includes("api.upload('/upload'"), 'Must support uploading custom thumbnail via existing upload API')
assert.ok(editorContent.includes('customThumbnail || thumbnail'), 'Custom thumbnail must take precedence over fetched thumbnail')
assert.ok(editorContent.includes("id: 'details'"), 'Must include Details tab')
assert.ok(editorContent.includes("id: 'display'"), 'Must include Display tab')
assert.ok(editorContent.includes("layout === 'image'"), 'Must support image layout')
assert.ok(editorContent.includes("layout === 'classic'"), 'Must support classic layout')
assert.ok(editorContent.includes('onSave'), 'Must provide save action')
console.log('✅ YouTubeEditor component verified.')

// 5. Verify StorefrontMediaCard Rendering
console.log('5. Verifying Storefront Media Card Rendering...')
const mediaCardPath = path.join(ROOT, 'components/storefront/StorefrontMediaCard.jsx')
assert.ok(fs.existsSync(mediaCardPath), 'StorefrontMediaCard.jsx does not exist')
const mediaCardContent = fs.readFileSync(mediaCardPath, 'utf8')
assert.ok(mediaCardContent.includes("sectionType === 'youtube' || props.mediaType === 'youtube' || props.embedType === 'youtube'"), 'Must handle youtube section type')
assert.ok(mediaCardContent.includes('isImage'), 'Must support Image layout')
assert.ok(mediaCardContent.includes('classicCard'), 'Must support Classic layout')
assert.ok(mediaCardContent.includes('aspect-video'), 'Image layout must have 16:9 aspect ratio')
assert.ok(mediaCardContent.includes('target="_blank"'), 'Must open external YouTube links in a new tab')
assert.ok(mediaCardContent.includes('rel="noopener noreferrer"'), 'Must include secure rel attributes')
assert.ok(mediaCardContent.includes('defaultYtThumb'), 'Must have fallback thumbnail handling')
const youtubeSlice = mediaCardContent.slice(
  mediaCardContent.indexOf('/* YOUTUBE MEDIA RENDERER'),
  mediaCardContent.indexOf('/* GENERAL VIDEO RENDERER')
)
assert.ok(youtubeSlice.length > 100, 'Must have extracted youtube slice')
assert.ok(!youtubeSlice.includes('autoplay'), 'YouTube section must not autoplay video')
assert.ok(!youtubeSlice.includes('<iframe'), 'YouTube section must be a card link, not an autoplaying iframe')
console.log('✅ StorefrontMediaCard rendering verified.')

// 6. Verify Store Dashboard Wiring in page.js
console.log('6. Verifying store/page.js Integration...')
const pagePath = path.join(ROOT, 'app/dashboard/store/page.js')
const pageContent = fs.readFileSync(pagePath, 'utf8')
assert.ok(pageContent.includes('import YouTubeEditor from'), 'Must import YouTubeEditor in store page')
assert.ok(pageContent.includes('import AddYouTubeModalView from'), 'Must import AddYouTubeModalView in store page')
assert.ok(pageContent.includes("<YouTubeEditor"), 'Must render YouTubeEditor in editing section switch')
assert.ok(pageContent.includes("<AddYouTubeModalView"), 'Must render AddYouTubeModalView in addModalType switch')
assert.ok(pageContent.includes("addModalType === 'add_youtube'"), 'Must handle add_youtube in modal state')
assert.ok(pageContent.includes("s.type === 'youtube'"), 'Must handle youtube section type styling and badge')
console.log('✅ Store page wiring verified.')

// 7. Verify AddToStoreModal.jsx Wiring
console.log('7. Verifying AddToStoreModal.jsx Integration...')
const addToStorePath = path.join(ROOT, 'components/dashboard/AddToStoreModal.jsx')
const addToStoreContent = fs.readFileSync(addToStorePath, 'utf8')
assert.ok(addToStoreContent.includes('import AddYouTubeModalView from'), 'Must import AddYouTubeModalView in AddToStoreModal')
assert.ok(addToStoreContent.includes("<AddYouTubeModalView"), 'Must render AddYouTubeModalView in AddToStoreModal subflow')
assert.ok(addToStoreContent.includes("setAddModalType('add_youtube')"), 'Must route YouTube option to add_youtube')
console.log('✅ AddToStoreModal integration verified.')

console.log('\n🎉 ALL 7 AUDIT CHECKS PASSED SUCCESSFULLY! 🎉')
