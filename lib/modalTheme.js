import { getAccessibleTextColor, getContrastColor } from '@/lib/colorContrast'
import { theme } from '@/config/theme'

/** Primary brand accent used for selected cards, focus rings, and primary modal actions. */
export const MODAL_ACCENT = theme.colors.primary
export const MODAL_SURFACE = theme.colors.surface
export const MODAL_SURFACE_LIGHT = theme.colors.surfaceElevated
export const MODAL_TAG_BG = theme.colors.surfaceElevated
export const MODAL_HEADING = theme.colors.textPrimary
export const MODAL_MUTED = theme.colors.textSecondary

export function modalAccentTextColor() {
  return getAccessibleTextColor(MODAL_ACCENT, null, 4.5)
}

export function modalSurfaceContrast() {
  return getContrastColor(MODAL_SURFACE)
}


