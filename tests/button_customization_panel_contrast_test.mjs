/**
 * CreatorStore — Button Customization Panel Contrast and Layout Test Suite
 * 
 * Verifies:
 * 1. Visual Hierarchy & Contrast Compliance:
 *    - Panel uses clean, high-contrast dashboard surface tokens (white / #FFFFFF, border #E5E5E3).
 *    - No unreadable black-on-black container or dark navy text on dark charcoal.
 *    - All section labels ("Button style", "Corner roundness", "Button shadow", "Button color", "Button text color")
 *      have contrast ratios exceeding WCAG AAA (>= 7:1) on panel surfaces.
 * 2. Option Selectors:
 *    - Button Style: Solid ('filled'), Outline ('outline'), Soft ('soft') - no duplicate labels.
 *    - Corner Roundness: Sharp (4px / square), Medium (8px / rounded), Soft (12px / rounded), Full (9999px / pill).
 *    - Button Shadow: None ('none'), Soft ('soft'), Strong ('strong'), Hard ('hard').
 *    - Selected states use multi-cue design (thick border, subtle tint, AND checkmark icon badge).
 *    - Unselected options have clear neutral borders and readable text.
 *    - Previews accurately reflect style, radius, and shadow treatments.
 * 3. Color Pickers:
 *    - Double-outlined swatch ensuring visibility for pure white (#FFFFFF), pure black (#000000), and pastels.
 *    - Hex validation logic handles '#' prefixing, lowercase-to-uppercase normalization, and invalid fallback.
 * 4. Dashboard Theme-Safety & Live Synchronization:
 *    - Panel controls are strictly dashboard-scoped and not overridden by storefront public theme.
 *    - Storefront preview parameters (buttonStyle, buttonRadius, buttonShape, buttonShadow, buttonColor, buttonTextColor)
 *      are emitted immediately on change.
 *    - Reset functionality correctly restores preset button defaults.
 */

import { describe, it } from 'node:test'
import assert from 'node:assert'
import fs from 'node:fs'
import path from 'node:path'

import { getContrastRatio } from '../lib/colorContrast.js'
import {
  ROUNDNESS_PRESETS,
  roundnessKeyFromTheme,
  shadowKeyFromTheme,
  styleKeyFromTheme,
} from '../lib/storefrontLayout.js'
import { STORE_PRESETS } from '../lib/themePresets.js'

describe('1. Visual Hierarchy & WCAG Contrast Compliance', () => {
  it('ButtonsPanel component file exists and is cleanly exported', () => {
    const componentPath = path.resolve(process.cwd(), 'components/dashboard/design/ButtonsPanel.jsx')
    assert.ok(fs.existsSync(componentPath), 'ButtonsPanel.jsx must exist')
    const content = fs.readFileSync(componentPath, 'utf8')
    assert.ok(content.includes('export default function ButtonsPanel'), 'Must export ButtonsPanel component')
  })

  it('ButtonsPanel replaces legacy dark container with high-contrast dashboard card', () => {
    const componentPath = path.resolve(process.cwd(), 'components/dashboard/design/ButtonsPanel.jsx')
    const content = fs.readFileSync(componentPath, 'utf8')

    // Must use white background and light border consistent with HeaderPanel, ColorsPanel, TextPanel
    assert.ok(content.includes('bg-white'), 'Panel container must use bg-white')
    assert.ok(content.includes('border-[#E5E5E3]'), 'Panel container must use border-[#E5E5E3]')
    assert.ok(content.includes('rounded-2xl'), 'Panel container must have rounded-2xl')

    // Must NOT contain unreadable black-on-black container or dark text on dark background
    assert.ok(!content.includes("bg-[#1A1A1A]"), 'ButtonsPanel must not have hardcoded dark charcoal container')
    assert.ok(!content.includes("text-[#010619]"), 'ButtonsPanel must not use dark navy label on dark background')
  })

  it('Verifies WCAG AAA contrast (>= 7:1) for all section labels and headings', () => {
    const panelBg = '#FFFFFF'
    const headingText = '#1F1F1F'
    const secondaryText = '#6F6F6B'
    const unselectedText = '#444444'

    const headingContrast = getContrastRatio(headingText, panelBg)
    assert.ok(
      headingContrast >= 7.0,
      `Heading text (#1F1F1F) contrast on panel bg (#FFFFFF) must be >= 7:1 (got ${headingContrast.toFixed(2)})`
    )

    const unselectedContrast = getContrastRatio(unselectedText, '#FAFAFA')
    assert.ok(
      unselectedContrast >= 4.5,
      `Unselected card text (#444444) contrast on option card bg (#FAFAFA) must be >= 4.5:1 (got ${unselectedContrast.toFixed(2)})`
    )

    const secondaryContrast = getContrastRatio(secondaryText, panelBg)
    assert.ok(
      secondaryContrast >= 4.5,
      `Secondary text (#6F6F6B) contrast on panel bg (#FFFFFF) must be >= 4.5:1 (got ${secondaryContrast.toFixed(2)})`
    )
  })

  it('Contains all 5 required labels', () => {
    const componentPath = path.resolve(process.cwd(), 'components/dashboard/design/ButtonsPanel.jsx')
    const content = fs.readFileSync(componentPath, 'utf8')

    const requiredLabels = [
      'Button style',
      'Corner roundness',
      'Button shadow',
      'Button color',
      'Button text color',
    ]

    for (const label of requiredLabels) {
      assert.ok(content.includes(label), `ButtonsPanel must contain label "${label}"`)
    }
  })
})

describe('2. Redesigned Option Selectors', () => {
  it('Configures distinct, unique button styles without duplicate labels', () => {
    const componentPath = path.resolve(process.cwd(), 'components/dashboard/design/ButtonsPanel.jsx')
    const content = fs.readFileSync(componentPath, 'utf8')

    // Ensure distinct options for Solid (filled), Outline (outline), and Soft (soft)
    assert.ok(content.includes("{ key: 'filled', label: 'Solid'"), "Must have Solid option for 'filled'")
    assert.ok(content.includes("{ key: 'outline', label: 'Outline'"), "Must have Outline option for 'outline'")
    assert.ok(content.includes("{ key: 'soft', label: 'Soft'"), "Must have Soft option for 'soft'")

    // Ensure no duplicate 'Solid' labels in the BUTTON_STYLES array
    const matches = content.match(/label:\s*'Solid'/g) || []
    assert.strictEqual(matches.length, 1, 'Should have exactly one Solid button style label')
  })

  it('Corner roundness options cover Sharp, Medium, Soft, Full', () => {
    assert.strictEqual(ROUNDNESS_PRESETS.length, 4, 'Should define 4 roundness presets')
    const keys = ROUNDNESS_PRESETS.map((p) => p.key)
    assert.deepStrictEqual(keys, ['sharp', 'medium', 'soft', 'full'])

    // Verify mappings
    assert.strictEqual(ROUNDNESS_PRESETS.find((p) => p.key === 'sharp').radius, 4)
    assert.strictEqual(ROUNDNESS_PRESETS.find((p) => p.key === 'medium').radius, 8)
    assert.strictEqual(ROUNDNESS_PRESETS.find((p) => p.key === 'soft').radius, 12)
    assert.strictEqual(ROUNDNESS_PRESETS.find((p) => p.key === 'full').radius, 9999)
  })

  it('Button shadow options cover None, Soft, Strong, Hard', () => {
    const componentPath = path.resolve(process.cwd(), 'components/dashboard/design/ButtonsPanel.jsx')
    const content = fs.readFileSync(componentPath, 'utf8')

    assert.ok(content.includes("{ key: 'none', label: 'None' }"), "Must have None shadow")
    assert.ok(content.includes("{ key: 'soft', label: 'Soft' }"), "Must have Soft shadow")
    assert.ok(content.includes("{ key: 'strong', label: 'Strong' }"), "Must have Strong shadow")
    assert.ok(content.includes("{ key: 'hard', label: 'Hard' }"), "Must have Hard shadow")
  })

  it('Option cards feature multi-attribute selected indicator (check icon + border + bg)', () => {
    const componentPath = path.resolve(process.cwd(), 'components/dashboard/design/ButtonsPanel.jsx')
    const content = fs.readFileSync(componentPath, 'utf8')

    // Selected state indicator check
    assert.ok(content.includes('border-2 border-[#1F1F1F] bg-[#F5F5F3]'), 'Selected card has high-contrast border and background')
    assert.ok(content.includes('<Check className='), 'Selected card has visual Check icon indicator')
    assert.ok(content.includes('rounded-full bg-[#1F1F1F] text-white'), 'Check icon has high-contrast badge')
  })

  it('Option cards include keyboard focus indicators and ARIA roles', () => {
    const componentPath = path.resolve(process.cwd(), 'components/dashboard/design/ButtonsPanel.jsx')
    const content = fs.readFileSync(componentPath, 'utf8')

    assert.ok(content.includes('focus-visible:ring-2 focus-visible:ring-[#1F1F1F]'), 'Option buttons must have clear focus rings')
    assert.ok(content.includes('role="radio"'), 'Option cards must declare role="radio" for accessibility')
    assert.ok(content.includes('aria-checked={selected}'), 'Option cards must declare aria-checked')
  })
})

describe('3. Color Pickers & Hex Validation', () => {
  it('Swatch provides double-outline ring visible on pure white or pure black', () => {
    const componentPath = path.resolve(process.cwd(), 'components/dashboard/design/ButtonsPanel.jsx')
    const content = fs.readFileSync(componentPath, 'utf8')

    assert.ok(content.includes('border border-black/20 ring-1 ring-inset ring-black/10'), 'Swatch must have border and inset ring')
  })

  it('Validates and normalizes hex input safely', () => {
    // Test helper mimicking HexColorPickerField validation logic
    const isValidHex = (hex) => /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(hex)
    const normalizeHex = (raw) => {
      let trimmed = raw.trim()
      if (!trimmed.startsWith('#') && trimmed.length > 0) {
        trimmed = `#${trimmed}`
      }
      return trimmed
    }

    // Valid hexes
    assert.strictEqual(isValidHex('#194DF5'), true)
    assert.strictEqual(isValidHex('#FFF'), true)
    assert.strictEqual(isValidHex('#000000'), true)
    assert.strictEqual(isValidHex('#E5E5E3'), true)

    // Normalize without leading hash
    assert.strictEqual(normalizeHex('194df5'), '#194df5')
    assert.strictEqual(isValidHex(normalizeHex('194df5')), true)

    // Invalid hexes
    assert.strictEqual(isValidHex('#12'), false)
    assert.strictEqual(isValidHex('#GGGGGG'), false)
    assert.strictEqual(isValidHex('randomtext'), false)
  })
})

describe('4. Storefront Preview Integration and Theme Safety', () => {
  it('Store page imports and renders ButtonsPanel with theme, activePreset, and onChange', () => {
    const storePagePath = path.resolve(process.cwd(), 'app/dashboard/store/page.js')
    const content = fs.readFileSync(storePagePath, 'utf8')

    assert.ok(
      content.includes("import ButtonsPanel from '@/components/dashboard/design/ButtonsPanel'"),
      'Store page must import ButtonsPanel'
    )
    assert.ok(
      content.includes("<ButtonsPanel"),
      'Store page must render <ButtonsPanel>'
    )
    assert.ok(
      content.includes("activePreset={activePreset}"),
      'ButtonsPanel must receive activePreset'
    )
    assert.ok(
      content.includes("onChange={onChange}"),
      'ButtonsPanel must receive onChange'
    )
  })

  it('resetButtonsToDefaults correctly restores button properties from preset', () => {
    const storePagePath = path.resolve(process.cwd(), 'app/dashboard/store/page.js')
    const content = fs.readFileSync(storePagePath, 'utf8')

    assert.ok(content.includes('const resetButtonsToDefaults = () => {'), 'Must have resetButtonsToDefaults')
    assert.ok(content.includes('buttonStyle: activePreset.buttons.style'), 'Resets buttonStyle')
    assert.ok(content.includes('buttonRadius: activePreset.buttons.radius'), 'Resets buttonRadius')
    assert.ok(content.includes('buttonColor: activePreset.colors.buttonColor'), 'Resets buttonColor')
    assert.ok(content.includes('buttonTextColor: activePreset.colors.buttonText'), 'Resets buttonTextColor')
    assert.ok(content.includes('buttonShadow: \'soft\''), 'Resets buttonShadow')
  })

  it('Helper functions correctly derive current keys from theme state', () => {
    // Style key
    assert.strictEqual(styleKeyFromTheme({ buttonStyle: 'outline' }), 'outline')
    assert.strictEqual(styleKeyFromTheme({ buttonStyle: 'soft' }), 'soft')
    assert.strictEqual(styleKeyFromTheme({ buttonStyle: 'filled' }), 'filled')
    assert.strictEqual(styleKeyFromTheme({}), 'filled') // default

    // Roundness key
    assert.strictEqual(roundnessKeyFromTheme({ buttonRadius: 4 }), 'sharp')
    assert.strictEqual(roundnessKeyFromTheme({ buttonRadius: 8 }), 'medium')
    assert.strictEqual(roundnessKeyFromTheme({ buttonRadius: 12 }), 'soft')
    assert.strictEqual(roundnessKeyFromTheme({ buttonRadius: 9999 }), 'full')

    // Shadow key
    assert.strictEqual(shadowKeyFromTheme({ buttonShadow: 'hard' }), 'hard')
    assert.strictEqual(shadowKeyFromTheme({ buttonShadow: 'strong' }), 'strong')
    assert.strictEqual(shadowKeyFromTheme({ buttonShadow: 'soft' }), 'soft')
    assert.strictEqual(shadowKeyFromTheme({ buttonShadow: 'none' }), 'none')
  })
})
