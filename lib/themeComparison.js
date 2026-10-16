/**
 * Theme normalization and deep comparison utilities for CreatorStore storefront themes.
 * Provides deterministic dirty-state checking between currentTheme and savedTheme.
 */

const STRING_PROPS = [
  'presetId', 'id', 'galleryThemeId', 'layoutPreset', 'bgType', 'background',
  'gradientStart', 'gradientEnd', 'gradientDirection', 'backgroundImage',
  'backgroundVideo', 'backgroundFit', 'backgroundPosition', 'wallpaperPattern',
  'wallpaperOverlay', 'wallpaperAccent', 'headerLayout', 'headerTitle', 'headerBio',
  'titleStyle', 'headerLogoUrl', 'avatarUrl', 'primaryColor', 'buttonColor',
  'buttonTextColor', 'buttonBorderColor', 'buttonShadowColor', 'textColor',
  'secondaryTextColor', 'titleColor', 'cardBg', 'border', 'surface', 'buttonStyle',
  'buttonShape', 'buttonShadow', 'cardStyle', 'font', 'titleFont', 'headingSize',
  'headingWeight', 'bodySize', 'bodyWeight'
]

const BOOLEAN_PROPS = [
  'altTitleFont', 'showFooterBranding', 'showFooterSocials'
]

const NUMERIC_PROPS = [
  'buttonRadius', 'cardRadius', 'backgroundOverlay'
]

const EXCLUDED_KEYS = new Set([
  ...STRING_PROPS,
  ...BOOLEAN_PROPS,
  ...NUMERIC_PROPS,
  'gradientStops',
  'hero',
  'galleryManualSnapshot',
  'createdAt',
  'updatedAt',
  '_id',
  'id',
  'tempId',
  'previewMode',
  'isSaving',
  'isDirty'
])

/**
 * Normalizes a theme object into a canonical representation for reliable comparison.
 */
export function normalizeThemeForComparison(theme = {}) {
  if (!theme || typeof theme !== 'object') return {}

  const result = {}

  // Standardize preset identification
  const presetId = theme.galleryThemeId || theme.presetId || theme.id || 'custom'
  result.galleryThemeId = String(presetId).trim()

  for (const prop of STRING_PROPS) {
    if (prop === 'galleryThemeId' || prop === 'id' || prop === 'presetId') continue
    const val = theme[prop]
    if (val !== undefined && val !== null && String(val).trim() !== '') {
      result[prop] = String(val).trim()
    }
  }

  // Boolean properties with explicit defaults
  if (theme.altTitleFont !== undefined) {
    result.altTitleFont = Boolean(theme.altTitleFont)
  } else {
    result.altTitleFont = false
  }

  if (theme.showFooterBranding !== undefined) {
    result.showFooterBranding = Boolean(theme.showFooterBranding)
  } else {
    result.showFooterBranding = true
  }

  if (theme.showFooterSocials !== undefined) {
    result.showFooterSocials = Boolean(theme.showFooterSocials)
  } else {
    result.showFooterSocials = true
  }

  for (const prop of NUMERIC_PROPS) {
    const val = theme[prop]
    if (val !== undefined && val !== null && val !== '') {
      const num = Number(val)
      result[prop] = isNaN(num) ? val : num
    }
  }

  if (Array.isArray(theme.gradientStops) && theme.gradientStops.length > 0) {
    result.gradientStops = theme.gradientStops.map((s) => String(s).trim())
  }

  if (theme.hero && typeof theme.hero === 'object') {
    result.hero = {
      enabled: Boolean(theme.hero.enabled),
      position: theme.hero.position || 'center',
      height: theme.hero.height || 'large',
      overlay: theme.hero.overlay !== undefined ? Boolean(theme.hero.overlay) : true,
      overlayStrength: theme.hero.overlayStrength !== undefined ? Number(theme.hero.overlayStrength) : 60,
      overlapDepth: theme.hero.overlapDepth || 'medium',
    }
    if (theme.hero.imageUrl) {
      result.hero.imageUrl = String(theme.hero.imageUrl).trim()
    }
  }

  // Include any extra arbitrary custom configuration keys
  for (const [key, val] of Object.entries(theme)) {
    if (EXCLUDED_KEYS.has(key)) continue
    if (val !== undefined && val !== null) {
      if (typeof val === 'object') {
        result[key] = JSON.parse(JSON.stringify(val))
      } else {
        result[key] = val
      }
    }
  }

  return result
}

/**
 * Deep equality check for arbitrary JSON-compatible values.
 */
export function deepEqual(a, b) {
  if (a === b) return true
  if (a === null || b === null || a === undefined || b === undefined) return a === b
  if (typeof a !== 'object' || typeof b !== 'object') return false

  const isArrA = Array.isArray(a)
  const isArrB = Array.isArray(b)
  if (isArrA !== isArrB) return false

  if (isArrA) {
    if (a.length !== b.length) return false
    for (let i = 0; i < a.length; i++) {
      if (!deepEqual(a[i], b[i])) return false
    }
    return true
  }

  const keysA = Object.keys(a).filter((k) => a[k] !== undefined).sort()
  const keysB = Object.keys(b).filter((k) => b[k] !== undefined).sort()

  if (keysA.length !== keysB.length) return false

  for (let i = 0; i < keysA.length; i++) {
    const key = keysA[i]
    if (key !== keysB[i]) return false
    if (!deepEqual(a[key], b[key])) return false
  }

  return true
}

/**
 * Checks whether the current editor theme state has diverged from the saved baseline.
 */
export function isThemeDirty(currentTheme, savedTheme) {
  if (!currentTheme && !savedTheme) return false
  const normCurrent = normalizeThemeForComparison(currentTheme || {})
  const normSaved = normalizeThemeForComparison(savedTheme || {})
  return !deepEqual(normCurrent, normSaved)
}
