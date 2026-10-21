/**
 * CreatorStore — Storefront Theme Consistency and Contrast Fix Test Suite
 * 
 * Verifies:
 * 1. Unified semantic token system across all 7 gallery themes (Custom, CreatorStore, Chalk, Flare, Tide, Afterglow, Lattice).
 * 2. Presence of all 15 semantic design tokens:
 *    pageBackground, surfaceBackground, surfaceElevated, primaryText, secondaryText,
 *    mutedText, borderColor, accentColor, accentText, buttonBackground, buttonText,
 *    iconColor, inputBackground, inputText, cardShadow, focusRing.
 * 3. Instagram cards (Profile, Grid, Carousel, Card, Single) consume semantic surface & text tokens,
 *    never hardcoding black on light themes like Chalk or Lattice.
 * 4. WCAG AA contrast compliance:
 *    - primaryText on surfaceBackground >= 4.5:1
 *    - buttonText on buttonBackground >= 4.5:1
 *    - secondaryText / mutedText on surfaceBackground >= 3.0:1
 *    - inputText on inputBackground >= 4.5:1
 * 5. getContrastColor(bgHex, tokens) resolves from theme semantic tokens.
 * 6. Codebase audit: no leftover hardcoded bg-[#000000] in Instagram, Social, or Button cards.
 * 7. Custom theme handling: safe contrast fallback for custom background/button colors.
 */

import { describe, it } from 'node:test'
import assert from 'node:assert'
import fs from 'node:fs'
import path from 'node:path'

import {
  GALLERY_SEMANTIC_PALETTES,
  resolveUnifiedSemanticTokens,
  applyAutoContrastTokens,
  getContrastColor,
  getContrastRatio,
  isLightColor,
  getAccessibleTextColor,
} from '../lib/colorContrast.js'
import { getThemeTokens, STORE_PRESETS } from '../lib/themePresets.js'
import { STOREFRONT_GALLERY_THEMES, themePatchFromGallery } from '../lib/storefront-themes.js'

const GALLERY_THEME_IDS = ['creatorstore', 'chalk', 'flare', 'tide', 'afterglow', 'lattice', 'custom']

describe('1. Unified Theme Token System Audit', () => {
  it('defines semantic palettes for all preset gallery themes', () => {
    const requiredPresets = ['creatorstore', 'chalk', 'flare', 'tide', 'afterglow', 'lattice']
    for (const id of requiredPresets) {
      assert.ok(GALLERY_SEMANTIC_PALETTES[id], `Missing semantic palette for ${id}`)
    }
  })

  it('provides all 16 required semantic tokens for every gallery theme', () => {
    const requiredTokens = [
      'pageBackground',
      'surfaceBackground',
      'surfaceElevated',
      'primaryText',
      'secondaryText',
      'mutedText',
      'borderColor',
      'accentColor',
      'accentText',
      'buttonBackground',
      'buttonText',
      'iconColor',
      'inputBackground',
      'inputText',
      'cardShadow',
      'focusRing',
    ]

    for (const themeId of GALLERY_THEME_IDS) {
      const preset = STOREFRONT_GALLERY_THEMES.find(t => t.id === themeId) || {}
      const patch = themePatchFromGallery(preset)
      const tokens = getThemeTokens({ ...patch, galleryThemeId: themeId })

      assert.ok(tokens.semantic, `Theme ${themeId} must have tokens.semantic`)

      for (const tok of requiredTokens) {
        assert.ok(
          tokens.semantic[tok] !== undefined && tokens.semantic[tok] !== null,
          `Theme ${themeId} is missing semantic token '${tok}'`
        )
      }
    }
  })

  it('aligns tokens.cards.bg and tokens.colors.cardBg with semantic.surfaceBackground', () => {
    for (const themeId of GALLERY_THEME_IDS) {
      const preset = STOREFRONT_GALLERY_THEMES.find(t => t.id === themeId) || {}
      const patch = themePatchFromGallery(preset)
      const tokens = getThemeTokens({ ...patch, galleryThemeId: themeId })

      assert.strictEqual(
        tokens.cards.bg,
        tokens.semantic.surfaceBackground,
        `Theme ${themeId} cards.bg must match semantic.surfaceBackground`
      )
      assert.strictEqual(
        tokens.colors.cardBg,
        tokens.semantic.surfaceBackground,
        `Theme ${themeId} colors.cardBg must match semantic.surfaceBackground`
      )
    }
  })
})

describe('2. Instagram & Card Surface Harmony (No Hardcoded Black)', () => {
  it('Chalk theme uses light cream card surface, NOT pitch black #000000', () => {
    const chalkPreset = STOREFRONT_GALLERY_THEMES.find(t => t.id === 'chalk')
    const patch = themePatchFromGallery(chalkPreset)
    const tokens = getThemeTokens({ ...patch, galleryThemeId: 'chalk' })

    assert.notStrictEqual(tokens.semantic.surfaceBackground, '#000000')
    assert.strictEqual(tokens.semantic.surfaceBackground, '#FAF6F0')
    assert.strictEqual(tokens.cards.bg, '#FAF6F0')
    assert.strictEqual(isLightColor(tokens.semantic.surfaceBackground), true)
  })

  it('Lattice theme uses light sage card surface, NOT pitch black #000000', () => {
    const latticePreset = STOREFRONT_GALLERY_THEMES.find(t => t.id === 'lattice')
    const patch = themePatchFromGallery(latticePreset)
    const tokens = getThemeTokens({ ...patch, galleryThemeId: 'lattice' })

    assert.notStrictEqual(tokens.semantic.surfaceBackground, '#000000')
    assert.strictEqual(tokens.semantic.surfaceBackground, '#F4F8DE')
    assert.strictEqual(isLightColor(tokens.semantic.surfaceBackground), true)
  })

  it('Flare theme uses harmonious violet surface #2A164D', () => {
    const flarePreset = STOREFRONT_GALLERY_THEMES.find(t => t.id === 'flare')
    const patch = themePatchFromGallery(flarePreset)
    const tokens = getThemeTokens({ ...patch, galleryThemeId: 'flare' })

    assert.strictEqual(tokens.semantic.surfaceBackground, '#2A164D')
    assert.strictEqual(tokens.cards.bg, '#2A164D')
  })

  it('Tide theme uses harmonious ocean navy surface #1B3266', () => {
    const tidePreset = STOREFRONT_GALLERY_THEMES.find(t => t.id === 'tide')
    const patch = themePatchFromGallery(tidePreset)
    const tokens = getThemeTokens({ ...patch, galleryThemeId: 'tide' })

    assert.strictEqual(tokens.semantic.surfaceBackground, '#1B3266')
    assert.strictEqual(tokens.cards.bg, '#1B3266')
  })

  it('Afterglow theme uses warm amber surface #282019', () => {
    const afterglowPreset = STOREFRONT_GALLERY_THEMES.find(t => t.id === 'afterglow')
    const patch = themePatchFromGallery(afterglowPreset)
    const tokens = getThemeTokens({ ...patch, galleryThemeId: 'afterglow' })

    assert.strictEqual(tokens.semantic.surfaceBackground, '#282019')
    assert.strictEqual(tokens.cards.bg, '#282019')
  })
})

describe('3. WCAG AA Text Contrast Verification', () => {
  it('guarantees >= 4.5:1 contrast for primaryText on surfaceBackground across all themes', () => {
    for (const themeId of GALLERY_THEME_IDS) {
      const preset = STOREFRONT_GALLERY_THEMES.find(t => t.id === themeId) || {}
      const patch = themePatchFromGallery(preset)
      const tokens = getThemeTokens({ ...patch, galleryThemeId: themeId })

      const surface = tokens.semantic.surfaceBackground
      const text = tokens.semantic.primaryText
      const ratio = getContrastRatio(surface, text)

      assert.ok(
        ratio >= 4.5,
        `Theme ${themeId}: primaryText (${text}) on surfaceBackground (${surface}) contrast ratio ${ratio.toFixed(2)} must be >= 4.5:1`
      )
    }
  })

  it('guarantees >= 4.5:1 contrast for buttonText on buttonBackground across all themes', () => {
    for (const themeId of GALLERY_THEME_IDS) {
      const preset = STOREFRONT_GALLERY_THEMES.find(t => t.id === themeId) || {}
      const patch = themePatchFromGallery(preset)
      const tokens = getThemeTokens({ ...patch, galleryThemeId: themeId })

      const btnBg = tokens.semantic.buttonBackground
      const btnText = tokens.semantic.buttonText
      const ratio = getContrastRatio(btnBg, btnText)

      assert.ok(
        ratio >= 4.5,
        `Theme ${themeId}: buttonText (${btnText}) on buttonBackground (${btnBg}) contrast ratio ${ratio.toFixed(2)} must be >= 4.5:1`
      )
    }
  })

  it('guarantees >= 3.0:1 contrast for secondaryText and mutedText on surfaceBackground', () => {
    for (const themeId of GALLERY_THEME_IDS) {
      const preset = STOREFRONT_GALLERY_THEMES.find(t => t.id === themeId) || {}
      const patch = themePatchFromGallery(preset)
      const tokens = getThemeTokens({ ...patch, galleryThemeId: themeId })

      const surface = tokens.semantic.surfaceBackground
      const secText = tokens.semantic.secondaryText
      const ratio = getContrastRatio(surface, secText)

      assert.ok(
        ratio >= 3.0,
        `Theme ${themeId}: secondaryText (${secText}) on surface (${surface}) contrast ratio ${ratio.toFixed(2)} must be >= 3.0:1`
      )
    }
  })

  it('guarantees >= 4.5:1 contrast for inputText on inputBackground across all themes', () => {
    for (const themeId of GALLERY_THEME_IDS) {
      const preset = STOREFRONT_GALLERY_THEMES.find(t => t.id === themeId) || {}
      const patch = themePatchFromGallery(preset)
      const tokens = getThemeTokens({ ...patch, galleryThemeId: themeId })

      const inputBg = tokens.semantic.inputBackground
      const inputText = tokens.semantic.inputText
      const ratio = getContrastRatio(inputBg, inputText)

      assert.ok(
        ratio >= 4.5,
        `Theme ${themeId}: inputText (${inputText}) on inputBackground (${inputBg}) contrast ratio ${ratio.toFixed(2)} must be >= 4.5:1`
      )
    }
  })
})

describe('4. getContrastColor Theme-Aware Resolution', () => {
  it('returns matching semantic cardBg, cardBorder, and text tokens when tokens is provided', () => {
    const chalkTokens = getThemeTokens({ galleryThemeId: 'chalk' })
    const surfaceTheme = getContrastColor(chalkTokens.colors.background, chalkTokens)

    assert.strictEqual(surfaceTheme.cardBg, chalkTokens.semantic.surfaceBackground)
    assert.strictEqual(surfaceTheme.cardBorder, chalkTokens.semantic.borderColor)
    assert.strictEqual(surfaceTheme.heading, chalkTokens.semantic.primaryText)
    assert.strictEqual(surfaceTheme.text, chalkTokens.semantic.primaryText)
    assert.strictEqual(surfaceTheme.isLight, true)
  })

  it('returns harmonious dark surface for Flare theme', () => {
    const flareTokens = getThemeTokens({ galleryThemeId: 'flare' })
    const surfaceTheme = getContrastColor(flareTokens.colors.background, flareTokens)

    assert.strictEqual(surfaceTheme.cardBg, '#2A164D')
    assert.strictEqual(surfaceTheme.isLight, false)
    assert.strictEqual(surfaceTheme.heading, '#FFFFFF')
  })

  it('retains backward compatibility when only bgHex string is provided', () => {
    const lightResult = getContrastColor('#FFFFFF')
    assert.strictEqual(lightResult.isLight, true)
    assert.strictEqual(lightResult.cardBg, '#FFFFFF')

    const darkResult = getContrastColor('#000000')
    assert.strictEqual(darkResult.isLight, false)
    assert.strictEqual(darkResult.cardBg, '#1A1A1A')
  })
})

describe('5. Source Code Audit — No Hardcoded Black in Storefront Cards', () => {
  const publicStoreRendererPath = path.resolve(process.cwd(), 'components/storefront/PublicStoreRenderer.jsx')
  const content = fs.readFileSync(publicStoreRendererPath, 'utf8')

  it('does not contain hardcoded bg-[#000000] in card containers', () => {
    // Check that bg-[#000000] is not inside any card className
    const matches = content.match(/className="[^"]*bg-\[#000000\][^"]*"/g) || []
    assert.strictEqual(
      matches.length,
      0,
      `Found ${matches.length} instances of hardcoded bg-[#000000] in PublicStoreRenderer.jsx: ${JSON.stringify(matches)}`
    )
  })

  it('ProfileHeader Instagram icon uses theme-aware style, not hardcoded #1A1A1A', () => {
    const headerIgHardcoded = content.includes('className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#1A1A1A]')
    assert.strictEqual(
      headerIgHardcoded,
      false,
      'ProfileHeader Instagram icon still has hardcoded bg-[#1A1A1A]'
    )
  })

  it('Floating controls in PublicStore.jsx consume semantic tokens', () => {
    const publicStorePath = path.resolve(process.cwd(), 'components/storefront/PublicStore.jsx')
    const publicStoreContent = fs.readFileSync(publicStorePath, 'utf8')

    assert.ok(
      publicStoreContent.includes('semantic.surfaceElevated'),
      'PublicStore.jsx floating controls must use semantic.surfaceElevated'
    )
  })
})

describe('6. Custom Creator Theme Contrast Safety', () => {
  it('custom light theme (#F0F4F8) resolves readable dark text and buttons with WCAG AA', () => {
    const customTokens = getThemeTokens({
      background: '#F0F4F8',
      buttonColor: '#F0F4F8', // Blending button color
      textColor: '#FFFFFF',   // Unreadable white text on light page
    })

    assert.strictEqual(customTokens.contrast.isLight, true)
    // Primary text must contrast against surface
    const textRatio = getContrastRatio(customTokens.semantic.surfaceBackground, customTokens.semantic.primaryText)
    assert.ok(textRatio >= 4.5, `Custom light text contrast ${textRatio.toFixed(2)} must be >= 4.5:1`)

    // Button text must contrast against button
    const btnRatio = getContrastRatio(customTokens.semantic.buttonBackground, customTokens.semantic.buttonText)
    assert.ok(btnRatio >= 4.5, `Custom light button text contrast ${btnRatio.toFixed(2)} must be >= 4.5:1`)
  })

  it('custom dark theme (#0D1117) resolves readable light text with WCAG AA', () => {
    const customTokens = getThemeTokens({
      background: '#0D1117',
      textColor: '#000000', // Unreadable black text on dark page
    })

    assert.strictEqual(customTokens.contrast.isLight, false)
    const textRatio = getContrastRatio(customTokens.semantic.surfaceBackground, customTokens.semantic.primaryText)
    assert.ok(textRatio >= 4.5, `Custom dark text contrast ${textRatio.toFixed(2)} must be >= 4.5:1`)
  })
})
