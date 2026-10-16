'use client'

import { Paintbrush } from 'lucide-react'
import {
  STOREFRONT_GALLERY_THEMES,
  getGalleryThemeId,
  gallerySwatchStyle,
  themePatchFromGallery,
} from '@/lib/storefront-themes'

export default function StorefrontThemeGallery({ theme, onChange }) {
  const selectedId = getGalleryThemeId(theme)

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {STOREFRONT_GALLERY_THEMES.map((preset) => {
        const selected = selectedId === preset.id
        const isCustom = preset.id === 'custom'
        const swatch = gallerySwatchStyle(preset)

        return (
          <button
            key={preset.id}
            type="button"
            onClick={() => onChange(themePatchFromGallery(preset, theme))}
            className="flex flex-col gap-2 text-left cursor-pointer"
          >
            <div
              className={`relative aspect-[3/4] w-full overflow-hidden rounded-card border transition-all ${
                selected
                  ? 'border-edge-focus ring-1 ring-edge-focus'
                  : 'border-edge hover:border-edge-strong'
              }`}
              style={isCustom ? undefined : swatch}
            >
              {isCustom ? (
                <div className="h-full w-full bg-surface-raised border border-dashed border-edge flex items-center justify-center">
                  <Paintbrush className="h-8 w-8 text-content-muted" />
                </div>
              ) : (
                <div className="absolute inset-0 p-3 flex flex-col justify-between">
                  <span
                    className="text-3xl font-black leading-none tracking-tight"
                    style={{ color: preset.colors?.pageText || preset.text?.pageTextColor || preset.text?.primary }}
                  >
                    Aa
                  </span>
                  <span
                    className="h-3 w-10 rounded-full shrink-0 border"
                    style={{
                      background: preset.button?.color || preset.colors?.buttons,
                      borderColor: preset.button?.borderColor || 'transparent',
                    }}
                  />
                </div>
              )}
            </div>
            <span className="text-label text-content-primary">{preset.name}</span>
          </button>
        )
      })}
    </div>
  )
}
