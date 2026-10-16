/**
 * ==============================================================================
 * CREATORSTORE CENTRALIZED GLOBAL THEME CONFIGURATION
 * ==============================================================================
 * This is the SINGLE SOURCE OF TRUTH for all platform colors and theme tokens.
 * 
 * To change the platform theme (e.g., from Blue to Orange, Green, or Purple), simply edit
 * the primary/secondary/accent/surface values below.
 * 
 * The entire platform (Landing page, Dashboard, Sidebar, Buttons, Modals, Badges,
 * Forms, and UI components) will automatically update.
 * ==============================================================================
 */

/** Helper: Converts HEX (#RRGGBB or #RGB) to HSL triplet string ("H S% L%") */
function hexToHsl(hex) {
  if (!hex || typeof hex !== 'string') return '0 0% 0%'
  let c = hex.replace('#', '').trim()
  if (c.length === 3) {
    c = c.split('').map((char) => char + char).join('')
  }
  if (c.length !== 6) return '0 0% 0%'

  const r = parseInt(c.slice(0, 2), 16) / 255
  const g = parseInt(c.slice(2, 4), 16) / 255
  const b = parseInt(c.slice(4, 6), 16) / 255

  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  let h = 0
  let s = 0
  const l = (max + min) / 2

  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0)
        break
      case g:
        h = (b - r) / d + 2
        break
      case b:
        h = (r - g) / d + 4
        break
    }
    h = h / 6
  }

  const hDeg = Math.round(h * 360 * 10) / 10
  const sPct = Math.round(s * 100 * 10) / 10
  const lPct = Math.round(l * 100 * 10) / 10

  return `${hDeg} ${sPct}% ${lPct}%`
}

/** Helper: Adjusts HSL lightness to derive hover/active states */
function adjustLightness(hex, deltaPercent) {
  if (!hex || typeof hex !== 'string') return hex
  let c = hex.replace('#', '').trim()
  if (c.length === 3) c = c.split('').map((x) => x + x).join('')
  if (c.length !== 6) return hex

  let r = parseInt(c.slice(0, 2), 16) / 255
  let g = parseInt(c.slice(2, 4), 16) / 255
  let b = parseInt(c.slice(4, 6), 16) / 255

  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  let h = 0, s = 0, l = (max + min) / 2

  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break
      case g: h = (b - r) / d + 2; break
      case b: h = (r - g) / d + 4; break
    }
    h /= 6
  }

  l = Math.max(0, Math.min(1, l + deltaPercent / 100))

  const hue2rgb = (p, q, t) => {
    if (t < 0) t += 1
    if (t > 1) t -= 1
    if (t < 1 / 6) return p + (q - p) * 6 * t
    if (t < 1 / 2) return q
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6
    return p
  }

  const q = l < 0.5 ? l * (1 + s) : l + s - l * s
  const p = 2 * l - q
  const rOut = Math.round(hue2rgb(p, q, h + 1 / 3) * 255)
  const gOut = Math.round(hue2rgb(p, q, h) * 255)
  const bOut = Math.round(hue2rgb(p, q, h - 1 / 3) * 255)

  const toHex = (n) => n.toString(16).padStart(2, '0')
  return `#${toHex(rOut)}${toHex(gOut)}${toHex(bOut)}`.toUpperCase()
}

/** Helper: Converts HEX to RGBA string */
function hexToRgba(hex, alpha = 1) {
  if (!hex || typeof hex !== 'string') return `rgba(0,0,0,${alpha})`
  let c = hex.replace('#', '').trim()
  if (c.length === 3) c = c.split('').map((x) => x + x).join('')
  if (c.length !== 6) return `rgba(0,0,0,${alpha})`

  const r = parseInt(c.slice(0, 2), 16)
  const g = parseInt(c.slice(2, 4), 16)
  const b = parseInt(c.slice(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

/**
 * BASE THEME DEFINITION
 * Linktree-inspired light neutral color system
 */
const themeColors = {
  // Brand Primary (#1F1F1F)
  primary: '#1F1F1F',
  primaryHover: '#000000',
  primaryActive: '#111111',
  primaryForeground: '#FFFFFF',
  primaryLight: '#F5F5F3',

  // Brand Secondary
  secondary: '#6F6F6B',
  secondaryForeground: '#FFFFFF',

  // Brand Accent
  accent: '#1F1F1F',
  accentForeground: '#FFFFFF',

  // Landing Page Theme Accent Tokens
  neonAccent: '#A8FF2A',
  electricBlue: '#FF4B1F',

  // Page & Surfaces
  background: '#FBFAF9',
  foreground: '#1F1F1F',

  // Sidebar
  sidebar: '#F2F1EF',
  sidebarForeground: '#1F1F1F',
  sidebarBorder: '#E5E5E3',

  // Surface ladder (Cards, Popovers, Modals, Elevated panels)
  surface: '#FFFFFF',
  surfaceElevated: '#FFFFFF',
  surfaceHover: '#F5F5F3',
  surfaceOverlay: '#FFFFFF',
  surfaceCard: '#FFFFFF',
  surfaceMuted: '#FBFBFB',

  // Borders
  border: '#E5E5E3',
  borderSubtle: '#E5E5E3',
  borderHover: '#DADAD7',
  borderStrong: '#DADAD7',

  // Text & Content Hierarchy
  textPrimary: '#1F1F1F',
  textSecondary: '#6F6F6B',
  muted: '#999995',
  mutedForeground: '#999995',
  textSubtle: '#999995',
  disabled: '#ECECE9',
  disabledText: '#A8A8A4',

  // Semantic Status (Only for actual system states/badges)
  success: '#16A34A',
  successLight: '#EAF8EF',
  successForeground: '#FFFFFF',
  warning: '#D97706',
  warningLight: '#FFF5DD',
  warningForeground: '#FFFFFF',
  danger: '#DC2626',
  dangerLight: '#FDECEC',
  dangerForeground: '#FFFFFF',
  info: '#2563EB',
  infoLight: '#EEF3FF',
  infoForeground: '#FFFFFF',
}

/**
 * Fully derived theme object with computed hover, active, subtle, and HSL values
 */
function buildFullTheme(base) {
  const primary = base.primary || '#4D7CFF'
  const secondary = base.secondary || '#F5A623'
  const accent = base.accent || '#22C55E'

  // Derive dynamic shades directly from primary / secondary / accent
  const primaryHover = base.primaryHover && base.primaryHover !== '#3D6CEF' && base.primaryHover !== '#2E65FF'
    ? base.primaryHover
    : adjustLightness(primary, -6)
  const primaryActive = base.primaryActive && base.primaryActive !== '#325BD4' && base.primaryActive !== '#1E4DD6'
    ? base.primaryActive
    : adjustLightness(primary, -12)
  const primaryLight = base.primaryLight || adjustLightness(primary, +10)
  const primarySubtle = hexToRgba(primary, 0.14)
  const primaryMuted = hexToRgba(primary, 0.28)

  const secondaryHover = adjustLightness(secondary, -6)
  const secondaryActive = adjustLightness(secondary, -12)
  const secondarySubtle = hexToRgba(secondary, 0.14)

  const accentHover = adjustLightness(accent, -6)
  const accentSubtle = hexToRgba(accent, 0.14)

  return {
    colors: {
      ...base,
      primary,
      primaryHover,
      primaryActive,
      primaryLight,
      primarySubtle,
      primaryMuted,
      borderFocus: primary,

      secondary,
      secondaryHover,
      secondaryActive,
      secondarySubtle,

      accent,
      accentHover,
      accentSubtle,

      // Brand aliases
      brand: primary,
      brandForeground: base.primaryForeground,
      brandHover: primaryHover,
      brandActive: primaryActive,
      brandSoft: primarySubtle,
    },
    hsl: {
      primary: hexToHsl(primary),
      primaryHover: hexToHsl(primaryHover),
      primaryActive: hexToHsl(primaryActive),
      primaryFg: hexToHsl(base.primaryForeground),

      secondary: hexToHsl(secondary),
      secondaryHover: hexToHsl(secondaryHover),
      secondaryActive: hexToHsl(secondaryActive),
      secondaryFg: hexToHsl(base.secondaryForeground),

      accent: hexToHsl(accent),
      accentHover: hexToHsl(accentHover),
      accentFg: hexToHsl(base.accentForeground),

      background: hexToHsl(base.background),
      foreground: hexToHsl(base.foreground),

      surfaceBase: hexToHsl(base.background),
      surfaceRaised: hexToHsl(base.surface),
      surfaceCard: hexToHsl(base.surfaceCard),
      surfaceOverlay: hexToHsl(base.surfaceOverlay),
      surfaceHover: hexToHsl(base.surfaceHover),

      sidebarBg: hexToHsl(base.sidebar),
      sidebarFg: hexToHsl(base.sidebarForeground),
      sidebarBorder: hexToHsl(base.sidebarBorder),

      border: hexToHsl(base.border),
      borderSubtle: hexToHsl(base.borderSubtle),
      borderStrong: hexToHsl(base.borderStrong),
      borderFocus: hexToHsl(primary),

      textPrimary: hexToHsl(base.textPrimary),
      textSecondary: hexToHsl(base.textSecondary),
      textMuted: hexToHsl(base.mutedForeground),
      textSubtle: hexToHsl(base.textSubtle),

      success: hexToHsl(base.success),
      successFg: hexToHsl(base.successForeground),
      warning: hexToHsl(base.warning),
      warningFg: hexToHsl(base.warningForeground),
      error: hexToHsl(base.danger),
      errorFg: hexToHsl(base.dangerForeground),
      info: hexToHsl(base.info),
      infoFg: hexToHsl(base.infoForeground),
    },
    radius: {
      sm: '8px',
      md: '12px',
      lg: '16px',
      xl: '20px',
      '2xl': '24px',
      pill: '9999px',
      chip: '8px',
      control: '12px',
      card: '20px',
      modal: '24px',
      sheet: '24px',
    },
  }
}

const theme = buildFullTheme(themeColors)

/**
 * Generates the CSS variables string to be applied globally in `<style id="theme-css-vars">`
 */
function generateCssVariables(activeTheme = theme) {
  const { colors, hsl, radius } = activeTheme

  return `
    :root {
      /* Linktree-Inspired Light Neutral Global System */
      --dashboard-bg: #FBFAF9;
      --sidebar-bg: #F2F1EF;
      --surface: #FFFFFF;
      --surface-secondary: #FBFBFB;
      --surface-hover: #F5F5F3;
      --border-subtle: #E5E5E3;
      --text-primary: #1F1F1F;
      --text-secondary: #6F6F6B;
      --text-muted: #999995;
      --button-primary: #1F1F1F;
      --button-primary-hover: #000000;
      --button-primary-active: #111111;

      --bg-page: #FBFAF9;
      --bg-card: #FFFFFF;
      --bg-muted: #FBFBFB;
      --bg-hover: #F5F5F3;

      --border: #E5E5E3;
      --border-hover: #DADAD7;

      --text-primary: #1F1F1F;
      --text-secondary: #6F6F6B;
      --text-muted: #999995;
      --text-disabled: #A8A8A4;

      --accent-primary: #1F1F1F;
      --accent-primary-hover: #000000;
      --accent-light: #F5F5F3;

      --success: #16A34A;
      --success-light: #EAF8EF;

      --warning: #D97706;
      --warning-light: #FFF5DD;

      --error: #DC2626;
      --error-light: #FDECEC;

      --white: #FFFFFF;
      --black: #1F1F1F;

      /* Radii */
      --radius-sm: 8px;
      --radius-md: 12px;
      --radius-lg: 16px;
      --radius-xl: 20px;
      --radius-2xl: 24px;
      --radius-pill: 9999px;
      --radius-chip: 8px;
      --radius-control: 12px;
      --radius-card: 20px;
      --radius-modal: 24px;
      --radius-sheet: 24px;

      /* Shadows (Extremely subtle neutral shadows) */
      --shadow-sm: 0 2px 8px rgba(0,0,0,0.04);
      --shadow-md: 0 4px 20px rgba(0,0,0,0.04);
      --shadow-lg: 0 8px 30px rgba(0,0,0,0.04);
      --shadow-card: 0 8px 30px rgba(0,0,0,0.04);
      --shadow-modal: 0 20px 60px rgba(0,0,0,0.12);
      --shadow-raised: 0 2px 8px rgba(0,0,0,0.04);
      --shadow-dropdown: 0 10px 30px rgba(0,0,0,0.08);

      /* Brand Primary (Solid Black #1F1F1F) */
      --color-primary: ${hsl.primary};
      --color-primary-hover: ${hsl.primaryHover};
      --color-primary-active: ${hsl.primaryActive};
      --color-primary-fg: ${hsl.primaryFg};
      --color-primary-hex: #1F1F1F;
      --color-primary-subtle: #F5F5F3;
      --color-primary-muted: rgba(31, 31, 31, 0.12);

      /* Brand Secondary */
      --color-secondary: ${hsl.secondary};
      --color-secondary-hover: ${hsl.secondaryHover};
      --color-secondary-active: ${hsl.secondaryActive};
      --color-secondary-fg: ${hsl.secondaryFg};
      --color-secondary-hex: ${colors.secondary};
      --color-secondary-subtle: ${colors.secondarySubtle};
      --accent-secondary: ${colors.secondary};

      /* Accent */
      --color-accent: ${hsl.primary};
      --color-accent-hover: ${hsl.primaryHover};
      --color-accent-fg: ${hsl.primaryFg};
      --color-accent-hex: #1F1F1F;
      --color-accent-subtle: #F5F5F3;

      /* Page & Surfaces */
      --color-background: #FBFAF9;
      --color-surface-base: ${hsl.background};
      --color-surface-raised: ${hsl.surfaceCard};
      --color-surface-card: ${hsl.surfaceCard};
      --color-surface-overlay: ${hsl.surfaceOverlay};
      --color-surface-hover: ${hsl.surfaceHover};
      --bg-surface: #FFFFFF;
      --bg-surface-secondary: #FBFBFB;
      --bg-surface-hover: #F5F5F3;

      /* Sidebar */
      --color-sidebar-bg: ${hsl.sidebarBg};
      --color-sidebar-fg: ${hsl.sidebarFg};
      --color-sidebar-border: ${hsl.sidebarBorder};
      --bg-sidebar: #F2F1EF;

      /* Typography */
      --color-text-primary: ${hsl.textPrimary};
      --color-text-secondary: ${hsl.textSecondary};
      --color-text-muted: ${hsl.textMuted};
      --color-text-subtle: ${hsl.textSubtle};
      --text-heading: #1F1F1F;
      --text-body: #1F1F1F;

      /* Borders */
      --color-border: ${hsl.border};
      --color-border-subtle: ${hsl.borderSubtle};
      --color-border-strong: ${hsl.borderStrong};
      --color-border-focus: ${hsl.primary};
      --border-subtle: #E5E5E3;

      /* Status (Only for actual system states/badges) */
      --color-success: ${hsl.success};
      --color-success-fg: ${hsl.successFg};
      --status-success: #16A34A;
      --color-warning: ${hsl.warning};
      --color-warning-fg: ${hsl.warningFg};
      --status-warning: #D97706;
      --color-error: ${hsl.error};
      --color-error-fg: ${hsl.errorFg};
      --status-error: #DC2626;
      --color-danger: #DC2626;
      --color-info: ${hsl.info};
      --color-info-fg: ${hsl.infoFg};

      /* Legacy shadcn / compatibility bindings */
      --primary: ${hsl.primary};
      --primary-foreground: ${hsl.primaryFg};
      --secondary: ${hsl.secondary};
      --secondary-foreground: ${hsl.secondaryFg};
      --accent: ${hsl.primary};
      --accent-foreground: ${hsl.primaryFg};
      --card: ${hsl.surfaceCard};
      --card-foreground: ${hsl.textPrimary};
      --popover: ${hsl.surfaceOverlay};
      --popover-foreground: ${hsl.textPrimary};
      --muted: ${hsl.surfaceHover};
      --muted-foreground: ${hsl.textMuted};
      --destructive: ${hsl.error};
      --destructive-foreground: ${hsl.errorFg};
      --input: ${hsl.borderSubtle};
      --ring: ${hsl.primary};
      --radius: 20px;
      --sidebar-background: ${hsl.sidebarBg};
      --sidebar-foreground: ${hsl.sidebarFg};
      --sidebar-primary: ${hsl.primary};
      --sidebar-primary-foreground: ${hsl.primaryFg};
      --sidebar-border: ${hsl.sidebarBorder};
      --sidebar-ring: ${hsl.primary};
    }
  `
}

module.exports = {
  theme,
  themeColors,
  buildFullTheme,
  generateCssVariables,
  hexToHsl,
  hexToRgba,
  adjustLightness,
}
