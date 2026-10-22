'use client'

import { useState, useEffect } from 'react'
import { Check } from 'lucide-react'
import {
  ROUNDNESS_PRESETS,
  roundnessKeyFromTheme,
  shadowKeyFromTheme,
  styleKeyFromTheme,
} from '@/lib/storefrontLayout'

/**
 * Available button styles in CreatorStore
 */
const BUTTON_STYLES = [
  { key: 'filled', label: 'Solid', description: 'Filled background' },
  { key: 'outline', label: 'Outline', description: 'Transparent outline' },
  { key: 'soft', label: 'Soft', description: 'Subtle tinted surface' },
]

/**
 * Button shadow presets
 */
const SHADOW_PRESETS = [
  { key: 'none', label: 'None' },
  { key: 'soft', label: 'Soft' },
  { key: 'strong', label: 'Strong' },
  { key: 'hard', label: 'Hard' },
]

/**
 * Accessible Hex color picker with double-outlined swatch and validated hex text input
 */
function HexColorPickerField({ label, value, fallback = '#194DF5', onChange }) {
  const [localText, setLocalText] = useState(value || fallback)

  useEffect(() => {
    setLocalText(value || fallback)
  }, [value, fallback])

  const isValidHex = (hex) => /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(hex)
  const currentHex = isValidHex(value) ? value : fallback

  const handleTextChange = (e) => {
    let raw = e.target.value.trim()
    if (!raw.startsWith('#') && raw.length > 0) {
      raw = `#${raw}`
    }
    setLocalText(raw)
    if (isValidHex(raw)) {
      onChange(raw)
    }
  }

  const handleBlur = () => {
    if (!isValidHex(localText)) {
      setLocalText(currentHex)
    }
  }

  return (
    <div className="flex-1 min-w-0 space-y-1.5">
      <label className="block text-xs font-bold text-[#1F1F1F] tracking-tight">{label}</label>
      <div className="flex items-center gap-2.5">
        <label
          className="relative h-10 w-10 shrink-0 rounded-lg border border-black/20 ring-1 ring-inset ring-black/10 shadow-xs cursor-pointer overflow-hidden transition-transform hover:scale-105 active:scale-95"
          style={{ backgroundColor: currentHex }}
          title={`Click to pick ${label}`}
        >
          <input
            type="color"
            value={isValidHex(currentHex) && currentHex.length === 7 ? currentHex : '#194DF5'}
            onChange={(e) => {
              const hexVal = e.target.value.toUpperCase()
              setLocalText(hexVal)
              onChange(hexVal)
            }}
            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
            aria-label={`Choose ${label}`}
          />
        </label>
        <input
          type="text"
          value={localText}
          placeholder={fallback}
          onChange={handleTextChange}
          onBlur={handleBlur}
          maxLength={7}
          className="h-10 w-full px-3 text-xs font-mono font-semibold uppercase tracking-wider text-[#1F1F1F] bg-[#FAFAFA] border border-[#E5E5E3] rounded-lg focus:bg-white focus:border-[#1F1F1F] focus:ring-1 focus:ring-[#1F1F1F] outline-none transition-colors"
          aria-label={`${label} hex code`}
        />
      </div>
    </div>
  )
}

/**
 * ButtonsPanel component for Storefront Appearance customization
 * High-contrast, clean layout conforming to the CreatorStore dashboard design system.
 */
export default function ButtonsPanel({ theme = {}, activePreset = {}, onChange }) {
  const currentStyleKey = styleKeyFromTheme(theme)
  const currentRoundnessKey = roundnessKeyFromTheme(theme)
  const currentShadowKey = shadowKeyFromTheme(theme)

  const defaultButtonColor = activePreset?.colors?.buttonColor || activePreset?.colors?.primaryColor || '#194DF5'
  const defaultTextColor = activePreset?.colors?.buttonText || '#000000'

  return (
    <div className="bg-white border border-[#E5E5E3] rounded-2xl p-5 shadow-xs space-y-6">
      {/* 1. BUTTON STYLE */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold text-[#1F1F1F] uppercase tracking-wider">Button style</h4>
          <span className="text-[11px] text-[#6F6F6B]">Surface treatment</span>
        </div>
        <div className="grid grid-cols-3 gap-2.5">
          {BUTTON_STYLES.map((opt) => {
            const selected = currentStyleKey === opt.key
            return (
              <button
                key={opt.key}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => onChange({ buttonStyle: opt.key })}
                className={`relative flex flex-col items-center justify-between p-3 h-[84px] rounded-xl border text-center cursor-pointer transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1F1F1F] focus-visible:ring-offset-2 select-none ${
                  selected
                    ? 'border-2 border-[#1F1F1F] bg-[#F5F5F3] shadow-xs'
                    : 'border-[#E5E5E3] bg-[#FAFAFA] hover:border-[#A8A8A4] hover:bg-white'
                }`}
              >
                {selected && (
                  <div className="absolute top-1.5 right-1.5 h-4 w-4 rounded-full bg-[#1F1F1F] text-white flex items-center justify-center shadow-xs">
                    <Check className="h-2.5 w-2.5 stroke-[3]" />
                  </div>
                )}
                <div className="w-full flex items-center justify-center flex-1">
                  {opt.key === 'filled' ? (
                    <div className="h-6 w-full max-w-[80px] rounded-md bg-[#1F1F1F] shadow-xs" />
                  ) : opt.key === 'outline' ? (
                    <div className="h-6 w-full max-w-[80px] rounded-md border-2 border-[#1F1F1F] bg-transparent" />
                  ) : (
                    <div className="h-6 w-full max-w-[80px] rounded-md border border-[#C5C5C0] bg-[#EBEBE8]" />
                  )}
                </div>
                <span className={`text-xs ${selected ? 'font-bold text-[#1F1F1F]' : 'font-medium text-[#444444]'}`}>
                  {opt.label}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* 2. CORNER ROUNDNESS */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold text-[#1F1F1F] uppercase tracking-wider">Corner roundness</h4>
          <span className="text-[11px] text-[#6F6F6B]">Border radius</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {ROUNDNESS_PRESETS.map((opt) => {
            const selected = currentRoundnessKey === opt.key
            const r = opt.radius >= 90 ? '9999px' : `${opt.radius}px`
            return (
              <button
                key={opt.key}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => onChange({ buttonShape: opt.shape, buttonRadius: opt.radius })}
                className={`relative flex flex-col items-center justify-between p-3 h-[84px] rounded-xl border text-center cursor-pointer transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1F1F1F] focus-visible:ring-offset-2 select-none ${
                  selected
                    ? 'border-2 border-[#1F1F1F] bg-[#F5F5F3] shadow-xs'
                    : 'border-[#E5E5E3] bg-[#FAFAFA] hover:border-[#A8A8A4] hover:bg-white'
                }`}
              >
                {selected && (
                  <div className="absolute top-1.5 right-1.5 h-4 w-4 rounded-full bg-[#1F1F1F] text-white flex items-center justify-center shadow-xs">
                    <Check className="h-2.5 w-2.5 stroke-[3]" />
                  </div>
                )}
                <div className="w-full flex items-center justify-center flex-1">
                  <div
                    className="h-6 w-full max-w-[70px] bg-[#1F1F1F] shadow-xs transition-all"
                    style={{ borderRadius: r }}
                  />
                </div>
                <span className={`text-xs ${selected ? 'font-bold text-[#1F1F1F]' : 'font-medium text-[#444444]'}`}>
                  {opt.label}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* 3. BUTTON SHADOW */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold text-[#1F1F1F] uppercase tracking-wider">Button shadow</h4>
          <span className="text-[11px] text-[#6F6F6B]">Elevation depth</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {SHADOW_PRESETS.map((opt) => {
            const selected = currentShadowKey === opt.key
            return (
              <button
                key={opt.key}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => onChange({ buttonShadow: opt.key })}
                className={`relative flex flex-col items-center justify-between p-3 h-[84px] rounded-xl border text-center cursor-pointer transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1F1F1F] focus-visible:ring-offset-2 select-none ${
                  selected
                    ? 'border-2 border-[#1F1F1F] bg-[#F5F5F3] shadow-xs'
                    : 'border-[#E5E5E3] bg-[#FAFAFA] hover:border-[#A8A8A4] hover:bg-white'
                }`}
              >
                {selected && (
                  <div className="absolute top-1.5 right-1.5 h-4 w-4 rounded-full bg-[#1F1F1F] text-white flex items-center justify-center shadow-xs">
                    <Check className="h-2.5 w-2.5 stroke-[3]" />
                  </div>
                )}
                <div className="w-full flex items-center justify-center flex-1">
                  <div
                    className={`h-6 w-full max-w-[70px] rounded-md bg-white border border-[#D5D5D0] ${
                      opt.key === 'none'
                        ? 'shadow-none'
                        : opt.key === 'soft'
                        ? 'shadow-sm'
                        : opt.key === 'strong'
                        ? 'shadow-md'
                        : 'shadow-[2px_2px_0px_#1F1F1F] border-[#1F1F1F]'
                    }`}
                  />
                </div>
                <span className={`text-xs ${selected ? 'font-bold text-[#1F1F1F]' : 'font-medium text-[#444444]'}`}>
                  {opt.label}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* 4. BUTTON COLORS */}
      <div className="pt-2 border-t border-[#F0EFEB]">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <HexColorPickerField
            label="Button color"
            value={theme.buttonColor || defaultButtonColor}
            fallback={defaultButtonColor}
            onChange={(val) => onChange({ buttonColor: val })}
          />
          <HexColorPickerField
            label="Button text color"
            value={theme.buttonTextColor || defaultTextColor}
            fallback={defaultTextColor}
            onChange={(val) => onChange({ buttonTextColor: val })}
          />
        </div>
      </div>
    </div>
  )
}
