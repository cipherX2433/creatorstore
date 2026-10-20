/**
 * Media Utilities for CreatorStore
 * Provides URL parsing, platform detection, canonical URL construction,
 * and metadata extraction helpers for YouTube, TikTok, Vimeo, and Direct Video.
 */

// Supported hostnames per platform to prevent SSRF and host spoofing
export const VALID_HOSTS = {
  youtube: ['youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtu.be', 'music.youtube.com'],
  tiktok: ['tiktok.com', 'www.tiktok.com', 'vm.tiktok.com', 'm.tiktok.com', 'vt.tiktok.com'],
  vimeo: ['vimeo.com', 'www.vimeo.com', 'player.vimeo.com'],
}

/**
 * Safely parse a hostname from a raw URL string
 */
export function getHostname(urlStr) {
  if (!urlStr || typeof urlStr !== 'string') return null
  try {
    const parsed = new URL(urlStr.startsWith('http://') || urlStr.startsWith('https://') ? urlStr : `https://${urlStr}`)
    return parsed.hostname.toLowerCase()
  } catch {
    return null
  }
}

/**
 * Extract YouTube 11-char video ID
 */
export function extractYouTubeId(url) {
  if (!url || typeof url !== 'string') return null
  const trimmed = url.trim()
  const host = getHostname(trimmed)
  if (!host || !VALID_HOSTS.youtube.includes(host)) return null

  const match = trimmed.match(
    /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([\w-]{11})/
  )
  return match && match[1] ? match[1] : null
}

/**
 * Extract TikTok video ID / canonical URL info
 */
export function extractTikTokId(url) {
  if (!url || typeof url !== 'string') return null
  const trimmed = url.trim()
  const host = getHostname(trimmed)
  if (!host || !VALID_HOSTS.tiktok.includes(host)) return null

  // Standard format: /@user/video/1234567890123456789
  const match = trimmed.match(/(?:\/video\/|\/v\/)(\d+)/)
  if (match && match[1]) {
    return match[1]
  }

  // Short URL format: vm.tiktok.com/ZM... or tiktok.com/t/ZT...
  const shortMatch = trimmed.match(/(?:vm\.tiktok\.com|tiktok\.com\/t)\/([A-Za-z0-9_-]+)/)
  if (shortMatch && shortMatch[1]) {
    return shortMatch[1]
  }

  return 'tiktok_video'
}

/**
 * Extract Vimeo video ID
 */
export function extractVimeoId(url) {
  if (!url || typeof url !== 'string') return null
  const trimmed = url.trim()
  const host = getHostname(trimmed)
  if (!host || !VALID_HOSTS.vimeo.includes(host)) return null

  const match = trimmed.match(
    /(?:vimeo\.com\/(?:channels\/(?:\w+\/)?|groups\/(?:[^\/]*)\/videos\/|album\/(?:\d+)\/video\/|video\/|))(\d+)/
  )
  return match && match[1] ? match[1] : null
}

/**
 * Extract direct video or Loom video info
 */
export function extractDirectVideo(url) {
  if (!url || typeof url !== 'string') return null
  const trimmed = url.trim()

  // Loom check
  const host = getHostname(trimmed)
  if (host && (host === 'loom.com' || host === 'www.loom.com')) {
    const loomMatch = trimmed.match(/loom\.com\/(?:share|embed)\/([a-zA-Z0-9]+)/)
    if (loomMatch && loomMatch[1]) {
      return {
        isLoom: true,
        videoId: loomMatch[1],
        canonicalUrl: `https://www.loom.com/share/${loomMatch[1]}`,
      }
    }
  }

  // Direct video file extension check
  const fileExtMatch = trimmed.match(/\.(mp4|webm|mov|m4v)(?:\?.*)?$/i)
  if (fileExtMatch) {
    const ext = fileExtMatch[1].toLowerCase()
    let cleanTitle = 'Video'
    try {
      const urlObj = new URL(trimmed)
      const pathname = urlObj.pathname
      const filename = pathname.split('/').filter(Boolean).pop()?.replace(/\.[^/.]+$/, '')
      if (filename) {
        cleanTitle = decodeURIComponent(filename)
          .replace(/[-_]+/g, ' ')
          .trim()
          .replace(/\b\w/g, (c) => c.toUpperCase())
      }
    } catch {
      // fallback
    }
    return {
      isDirectFile: true,
      format: ext,
      title: cleanTitle,
      canonicalUrl: trimmed,
    }
  }

  return null
}

/**
 * Detect media platform from URL string
 */
export function detectMediaPlatform(url) {
  if (!url || typeof url !== 'string') return null
  if (extractYouTubeId(url)) return 'youtube'
  if (extractTikTokId(url)) return 'tiktok'
  if (extractVimeoId(url)) return 'vimeo'
  if (extractDirectVideo(url)) return 'video'
  return null
}

/**
 * Platform display metadata and config
 */
export const MEDIA_PLATFORMS = {
  youtube: {
    id: 'youtube',
    name: 'YouTube',
    title: 'YouTube',
    category: 'Video',
    color: '#EF4444',
    badgeBg: 'bg-[#FEF2F2]',
    badgeText: 'text-[#DC2626]',
    badgeBorder: 'border-[#FEE2E2]',
    placeholder: 'Paste a video, short, channel, or playlist URL',
    emptyTitle: 'Paste a URL',
    emptyDesc: 'Add content by pasting a URL to display YouTube videos or Shorts on your storefront.',
    apiRoute: '/media/youtube/metadata',
  },
  tiktok: {
    id: 'tiktok',
    name: 'TikTok Video',
    title: 'TikTok Video',
    category: 'Video',
    color: '#000000',
    badgeBg: 'bg-[#F4F4F5]',
    badgeText: 'text-[#18181B]',
    badgeBorder: 'border-[#E4E4E7]',
    placeholder: 'Paste a TikTok video or reel URL',
    emptyTitle: 'Paste a TikTok URL',
    emptyDesc: 'Add content by pasting a URL to display TikTok videos on your storefront.',
    apiRoute: '/media/tiktok/metadata',
  },
  vimeo: {
    id: 'vimeo',
    name: 'Vimeo',
    title: 'Vimeo',
    category: 'Video',
    color: '#06B6D4',
    badgeBg: 'bg-[#ECFEFF]',
    badgeText: 'text-[#0891B2]',
    badgeBorder: 'border-[#CFFAFE]',
    placeholder: 'Paste a Vimeo video URL',
    emptyTitle: 'Paste a Vimeo URL',
    emptyDesc: 'Add content by pasting a URL to display Vimeo videos on your storefront.',
    apiRoute: '/media/vimeo/metadata',
  },
  video: {
    id: 'video',
    name: 'Video',
    title: 'Video',
    category: 'Video',
    color: '#84CC16',
    badgeBg: 'bg-[#F7FEE7]',
    badgeText: 'text-[#65A30D]',
    badgeBorder: 'border-[#ECFCCB]',
    placeholder: 'Paste a direct video URL (.mp4, Loom) or upload a file',
    emptyTitle: 'Paste a URL or upload a video',
    emptyDesc: 'Add content by pasting a direct video URL or uploading an MP4 video file.',
    apiRoute: '/media/video/metadata',
  },
}
