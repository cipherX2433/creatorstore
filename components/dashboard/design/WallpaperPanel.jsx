'use client'

import { Droplets, Grid3x3, Image as ImageIcon, Square, Blend, Video, Upload } from 'lucide-react'
import ColorField from './ColorField'
import ProBadge from './ProBadge'
import { WALLPAPER_PATTERNS, patternPreviewStyle, parseGradientAngle, wallpaperStyleFromTheme } from '@/lib/storefront-themes'
import { Slider } from '@/components/ui/slider'

const STYLES = [
  { id: 'fill', label: 'Fill', Icon: Square, gated: false },
  { id: 'gradient', label: 'Gradient', Icon: Blend, gated: false },
  { id: 'blur', label: 'Blur', Icon: Droplets, gated: false },
  { id: 'pattern', label: 'Pattern', Icon: Grid3x3, gated: false },
  { id: 'image', label: 'Image', Icon: ImageIcon, gated: true },
  { id: 'video', label: 'Video', Icon: Video, gated: true },
]

export default function WallpaperPanel({ theme, onChange, onUpgrade, onUploadImage, onUploadVideo }) {
  const style = wallpaperStyleFromTheme(theme)
  const fillColor = theme.background || '#000000'
  const angle = parseGradientAngle(theme.gradientDirection)

  function selectStyle(next) {
    if (STYLES.find((s) => s.id === next)?.gated && wallpaperStyleFromTheme(theme) !== next) {
      onUpgrade?.()
    }
    if (next === 'fill') onChange({ bgType: 'solid' })
    else if (next === 'gradient') onChange({ bgType: 'gradient' })
    else onChange({ bgType: next })
  }

  function selectPattern(id, pro) {
    if (pro && theme.wallpaperPattern !== id) onUpgrade?.()
    onChange({ bgType: 'pattern', wallpaperPattern: id })
  }

  return (
    <div className="space-y-5 bg-surface-card border border-edge rounded-card p-4">
      <div className="grid grid-cols-6 gap-2">
        {STYLES.map(({ id, label, Icon, gated }) => {
          const selected = style === id
          return (
            <button
              key={id}
              type="button"
              onClick={() => selectStyle(id)}
              className="flex flex-col items-center gap-1.5 cursor-pointer"
            >
              <div className={`relative h-12 w-full rounded-control border flex items-center justify-center ${
                selected ? 'border-edge-focus ring-1 ring-edge-focus' : 'border-edge bg-surface-raised'
              }`}>
                <Icon className="h-4 w-4 text-content-muted" />
                {gated && <ProBadge as="span" className="absolute -top-1.5 -right-1.5" />}
              </div>
              <span className="text-micro text-content-muted">{label}</span>
            </button>
          )
        })}
      </div>

      {(style === 'fill' || style === 'blur') && (
        <ColorField
          label="Background color"
          value={theme.background}
          fallback="#000000"
          onChange={(v) => onChange({ background: v })}
        />
      )}

      {style === 'gradient' && (
        <div className="space-y-3">
          <ColorField
            label="Start color"
            value={theme.gradientStart || theme.background}
            fallback="#000000"
            onChange={(v) => onChange({ gradientStart: v, gradientStops: null })}
          />
          <ColorField
            label="End color"
            value={theme.gradientEnd}
            fallback="#121212"
            onChange={(v) => onChange({ gradientEnd: v, gradientStops: null })}
          />
          <div>
            <p className="text-label text-content-primary mb-2">Angle {angle}°</p>
            <Slider
              min={0}
              max={360}
              step={1}
              value={[angle]}
              onValueChange={([v]) => onChange({ gradientDirection: `${v}deg`, gradientStops: null })}
            />
          </div>
        </div>
      )}

      {style === 'pattern' && (
        <div className="space-y-4">
          <ColorField
            label="Background color"
            value={theme.background}
            fallback="#E7F0C4"
            onChange={(v) => onChange({ background: v })}
          />
          <div>
            <p className="text-label text-content-primary mb-2">Pattern</p>
            <div className="grid grid-cols-4 gap-2">
              {WALLPAPER_PATTERNS.map((p) => {
                const selected = (theme.wallpaperPattern || 'grid') === p.id
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => selectPattern(p.id, p.pro)}
                    className="flex flex-col gap-1 cursor-pointer"
                  >
                    <div
                      className={`relative h-14 w-full rounded-control border overflow-hidden ${
                        selected ? 'border-edge-focus ring-1 ring-edge-focus' : 'border-edge'
                      }`}
                      style={patternPreviewStyle(p.id, fillColor)}
                    >
                      {p.pro && <ProBadge as="span" className="absolute top-1 right-1" />}
                    </div>
                    <span className="text-micro text-content-muted">{p.label}</span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {style === 'image' && (
        <MediaUpload
          kind="image"
          src={theme.backgroundImage}
          accept="image/*"
          onUpload={onUploadImage}
          onRemove={() => onChange({ backgroundImage: '', bgType: 'solid' })}
        />
      )}

      {style === 'video' && (
        <MediaUpload
          kind="video"
          src={theme.backgroundVideo}
          accept="video/mp4,video/webm"
          onUpload={onUploadVideo}
          onRemove={() => onChange({ backgroundVideo: '', bgType: 'solid' })}
        />
      )}
    </div>
  )
}

function MediaUpload({ kind, src, accept, onUpload, onRemove }) {
  return src ? (
    <div className="space-y-2">
      <div className="relative h-32 w-full rounded-control overflow-hidden border border-edge bg-surface-raised">
        {kind === 'video' ? (
          <video src={src} className="h-full w-full object-cover" muted />
        ) : (
          <img src={src} alt="" className="h-full w-full object-cover" />
        )}
      </div>
      <div className="flex gap-2">
        <label className="flex-1 h-9 rounded-control bg-surface-raised border border-edge text-label text-content-primary flex items-center justify-center gap-1.5 cursor-pointer">
          <Upload className="h-3.5 w-3.5" /> Replace
          <input type="file" accept={accept} onChange={onUpload} className="hidden" />
        </label>
        <button type="button" onClick={onRemove} className="px-3 h-9 rounded-control text-error-fg text-label border border-edge cursor-pointer">
          Remove
        </button>
      </div>
    </div>
  ) : (
    <label className="flex flex-col items-center justify-center p-6 rounded-control border-2 border-dashed border-edge hover:border-edge-focus bg-surface-raised cursor-pointer text-center gap-2">
      <Upload className="h-6 w-6 text-brand" />
      <span className="text-label text-content-primary">Upload {kind}</span>
      <input type="file" accept={accept} onChange={onUpload} className="hidden" />
    </label>
  )
}
