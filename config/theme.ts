// TypeScript bridge for config/theme.js
import themeConfig from './theme'

export const {
  theme,
  themeColors,
  buildFullTheme,
  generateCssVariables,
  hexToHsl,
  hexToRgba,
  adjustLightness,
} = themeConfig

export default theme
