/**
 * Public storefront gallery themes.
 * Styles creatorstore.store/{username} only — not the admin dashboard.
 *
 * New storefront-only colors (not in tokens.css):
 *   #F3E9DC Chalk cream
 *   #1A1A1A charcoal text
 *   #6B4FBB / #E0459E Flare gradient
 *   #3B6FE0 / #2A4FA8 / #5B8CFF Tide blues
 *   #1A140F / #2C241C / #F5E6D3 Afterglow dark/warm
 * Reused: #4D7CFF brand primary, #CBE957 brand lime, #313743 charcoal, #F4F2EC chalk
 */

import { getThemeTokens } from '@/lib/themePresets'

export const STOREFRONT_GALLERY_THEMES = [
  {
    id: 'custom',
    name: 'Custom',
    isDefault: true,
  },
  {
    id: 'creatorstore',
    name: 'CreatorStore',
    wallpaper: { style: 'fill', value: '#000000' },
    text: { pageFont: 'Manrope', pageTextColor: '#F4F2EC', altTitleFont: false },
    colors: {
      background: '#000000',
      buttons: '#4D7CFF',
      buttonShadows: '#12141c',
      buttonText: '#000000',
      pageText: '#F4F2EC',
      title: '#F4F2EC',
    },
    button: { style: 'filled', shape: 'pill', color: '#4D7CFF', textColor: '#000000', borderColor: 'transparent' },
  },
  {
    id: 'chalk',
    name: 'Chalk',
    wallpaper: { style: 'fill', value: '#F3E9DC' },
    text: { pageFont: 'Manrope', pageTextColor: '#1A1A1A', altTitleFont: false },
    colors: {
      background: '#F3E9DC',
      buttons: '#F3E9DC',
      buttonShadows: '#1A1A1A',
      buttonText: '#1A1A1A',
      pageText: '#1A1A1A',
      title: '#1A1A1A',
    },
    button: { style: 'filled', shape: 'pill', color: '#F3E9DC', textColor: '#1A1A1A', borderColor: '#1A1A1A' },
  },
  {
    id: 'flare',
    name: 'Flare',
    wallpaper: { style: 'gradient', stops: ['#6B4FBB', '#E0459E', '#F0441E'], angle: 135 },
    text: { pageFont: 'Manrope', pageTextColor: '#FFFFFF', altTitleFont: false },
    colors: {
      background: '#6B4FBB',
      buttons: '#FFFFFF',
      buttonShadows: '#1A1A1A',
      buttonText: '#1A1A1A',
      pageText: '#FFFFFF',
      title: '#FFFFFF',
    },
    button: { style: 'filled', shape: 'pill', color: '#FFFFFF', textColor: '#1A1A1A' },
  },
  {
    id: 'tide',
    name: 'Tide',
    wallpaper: { style: 'gradient', stops: ['#3B6FE0', '#2A4FA8'], angle: 160, accent: 'tide' },
    text: { pageFont: 'Link Sans', pageTextColor: '#FFFFFF', altTitleFont: false },
    colors: {
      background: '#3B6FE0',
      buttons: '#5B8CFF',
      buttonShadows: '#000000',
      buttonText: '#FFFFFF',
      pageText: '#FFFFFF',
      title: '#FFFFFF',
    },
    button: { style: 'filled', shape: 'pill', color: '#5B8CFF', textColor: '#FFFFFF' },
  },
  {
    id: 'afterglow',
    name: 'Afterglow',
    wallpaper: { style: 'fill', value: '#1A140F', overlay: 'spotlight' },
    text: { pageFont: 'Manrope', pageTextColor: '#F5E6D3', altTitleFont: false },
    colors: {
      background: '#1A140F',
      buttons: '#2C241C',
      buttonShadows: '#000000',
      buttonText: '#F5E6D3',
      pageText: '#F5E6D3',
      title: '#F5E6D3',
    },
    button: { style: 'filled', shape: 'pill', color: '#2C241C', textColor: '#F5E6D3' },
  },
  {
    id: 'lattice',
    name: 'Lattice',
    wallpaper: { style: 'pattern', value: '#E7F0C4', pattern: 'grid' },
    text: { pageFont: 'Manrope', pageTextColor: '#1A1A1A', altTitleFont: false },
    colors: {
      background: '#E7F0C4',
      buttons: '#FFFFFF',
      buttonShadows: '#1A1A1A',
      buttonText: '#1A1A1A',
      pageText: '#1A1A1A',
      title: '#1A1A1A',
    },
    button: { style: 'filled', shape: 'pill', color: '#FFFFFF', textColor: '#1A1A1A' },
  },
]

export const WALLPAPER_PATTERNS = [
  { id: 'noise', label: 'Noise', pro: false },
  { id: 'grid', label: 'Grid', pro: false },
  { id: 'blobs', label: 'Blobs', pro: true },
  { id: 'dots', label: 'Dots', pro: true },
]

export function getGalleryThemeId(theme = {}) {
  const id = theme.galleryThemeId
  if (STOREFRONT_GALLERY_THEMES.some((t) => t.id === id)) return id
  return 'custom'
}

export function getGalleryTheme(id) {
  return STOREFRONT_GALLERY_THEMES.find((t) => t.id === id) || STOREFRONT_GALLERY_THEMES[0]
}

export function wallpaperStyleFromTheme(theme = {}) {
  const t = theme.bgType || 'solid'
  if (t === 'solid' || t === 'fill') return 'fill'
  return t
}

export function snapshotManualTheme(theme = {}) {
  const tokens = getThemeTokens(theme)
  return {
    bgType: theme.bgType || tokens.wallpaper.bgType,
    background: theme.background || tokens.colors.background,
    gradientStart: theme.gradientStart || tokens.wallpaper.gradientStart,
    gradientEnd: theme.gradientEnd || tokens.wallpaper.gradientEnd,
    gradientDirection: theme.gradientDirection || tokens.wallpaper.gradientDirection,
    gradientStops: theme.gradientStops || null,
    wallpaperPattern: theme.wallpaperPattern || null,
    wallpaperOverlay: theme.wallpaperOverlay || null,
    wallpaperAccent: theme.wallpaperAccent || null,
    backgroundImage: theme.backgroundImage || '',
    backgroundVideo: theme.backgroundVideo || '',
    buttonStyle: theme.buttonStyle || tokens.buttons.style,
    buttonShape: theme.buttonShape || tokens.buttons.shape,
    buttonRadius: theme.buttonRadius !== undefined ? theme.buttonRadius : tokens.buttons.radius,
    buttonColor: theme.buttonColor || tokens.buttons.color,
    buttonTextColor: theme.buttonTextColor || tokens.buttons.textColor,
    buttonBorderColor: theme.buttonBorderColor || tokens.buttons.borderColor,
    buttonShadowColor: theme.buttonShadowColor || null,
    textColor: theme.textColor || tokens.colors.text,
    secondaryTextColor: theme.secondaryTextColor || tokens.colors.mutedText,
    primaryColor: theme.primaryColor || tokens.colors.primaryColor,
    titleColor: theme.titleColor || null,
    font: theme.font || tokens.typography.fontFamily,
    titleFont: theme.titleFont || null,
    altTitleFont: !!theme.altTitleFont,
  }
}

function cssBackground(preset) {
  const w = preset.wallpaper
  if (!w) return '#000000'
  if (w.style === 'gradient' && w.stops?.length) {
    return `linear-gradient(${w.angle ?? 135}deg, ${w.stops.join(', ')})`
  }
  if (w.overlay === 'spotlight') {
    return `radial-gradient(ellipse at 50% 0%, #C47A3A 0%, ${w.value || '#1A140F'} 62%)`
  }
  if (w.style === 'pattern' && w.pattern === 'grid') {
    return w.value || '#E7F0C4'
  }
  return w.value || preset.colors?.background || '#000000'
}

export function gallerySwatchStyle(preset) {
  if (!preset || preset.id === 'custom') return { background: 'transparent' }
  if (preset.wallpaper?.style === 'pattern' && preset.wallpaper.pattern === 'grid') {
    return {
      backgroundColor: preset.wallpaper.value || '#E7F0C4',
      backgroundImage: 'linear-gradient(to right, rgba(26,26,26,0.12) 1px, transparent 1px), linear-gradient(to bottom, rgba(26,26,26,0.12) 1px, transparent 1px)',
      backgroundSize: '16px 16px',
    }
  }
  return { background: cssBackground(preset) }
}

export function patternPreviewStyle(patternId, color = '#E7F0C4') {
  const base = { backgroundColor: color }
  if (patternId === 'grid') {
    return {
      ...base,
      backgroundImage: 'linear-gradient(to right, rgba(0,0,0,0.14) 1px, transparent 1px), linear-gradient(to bottom, rgba(0,0,0,0.14) 1px, transparent 1px)',
      backgroundSize: '12px 12px',
    }
  }
  if (patternId === 'dots') {
    return {
      ...base,
      backgroundImage: 'radial-gradient(rgba(0,0,0,0.2) 1px, transparent 1px)',
      backgroundSize: '10px 10px',
    }
  }
  if (patternId === 'blobs') {
    return {
      ...base,
      backgroundImage: 'radial-gradient(circle at 30% 40%, rgba(0,0,0,0.12) 0 28%, transparent 30%), radial-gradient(circle at 70% 70%, rgba(0,0,0,0.1) 0 22%, transparent 24%)',
    }
  }
  return {
    ...base,
    backgroundImage: 'repeating-linear-gradient(120deg, rgba(0,0,0,0.08) 0 1px, transparent 1px 3px)',
  }
}

export function themePatchFromGallery(preset, currentTheme = {}) {
  if (!preset || preset.id === 'custom') {
    if (getGalleryThemeId(currentTheme) === 'custom') {
      return { galleryThemeId: 'custom' }
    }
    const snap = currentTheme.galleryManualSnapshot || {}
    return {
      galleryThemeId: 'custom',
      ...snap,
      gradientStops: snap.gradientStops || null,
    }
  }

  const leavingCustom = getGalleryThemeId(currentTheme) === 'custom'
  const patch = { galleryThemeId: preset.id }
  if (leavingCustom) {
    patch.galleryManualSnapshot = snapshotManualTheme(currentTheme)
  }

  const colors = preset.colors || {}
  const text = preset.text || {}
  const w = preset.wallpaper || {}

  patch.textColor = text.pageTextColor || colors.pageText
  patch.titleColor = text.titleColor || colors.title || patch.textColor
  patch.secondaryTextColor = text.pageTextColor === '#FFFFFF' || colors.pageText === '#FFFFFF'
    ? 'rgba(255,255,255,0.78)'
    : '#64748B'
  patch.font = text.pageFont || 'Manrope'
  patch.altTitleFont = !!text.altTitleFont
  patch.titleFont = text.titleFont || null

  patch.background = colors.background
  patch.buttonColor = colors.buttons
  patch.buttonTextColor = colors.buttonText
  patch.buttonShadowColor = colors.buttonShadows || null
  patch.primaryColor = colors.buttons
  patch.buttonStyle = preset.button?.style || 'filled'
  patch.buttonShape = preset.button?.shape || 'pill'
  patch.buttonRadius = preset.button?.shape === 'pill' ? 9999 : 8
  patch.buttonBorderColor = preset.button?.borderColor || 'transparent'

  patch.wallpaperPattern = w.pattern || null
  patch.wallpaperOverlay = w.overlay || null
  patch.wallpaperAccent = w.accent || null

  if (w.style === 'gradient') {
    const stops = w.stops || []
    patch.bgType = 'gradient'
    patch.gradientStops = stops
    patch.gradientStart = stops[0]
    patch.gradientEnd = stops[stops.length - 1]
    patch.gradientDirection = `${w.angle ?? 135}deg`
  } else if (w.style === 'pattern') {
    patch.bgType = 'pattern'
    patch.gradientStops = null
  } else if (w.style === 'blur') {
    patch.bgType = 'blur'
    patch.gradientStops = null
  } else {
    patch.bgType = 'solid'
    patch.gradientStops = null
  }

  return patch
}

export function parseGradientAngle(direction) {
  if (!direction) return 180
  const deg = String(direction).match(/(-?\d+(?:\.\d+)?)deg/)
  if (deg) return Number(deg[1])
  const map = {
    'to right': 90,
    'to left': 270,
    'to bottom': 180,
    'to top': 0,
    'to bottom right': 135,
    'to bottom left': 225,
    'to top right': 45,
    'to top left': 315,
  }
  return map[direction] ?? 180
}
