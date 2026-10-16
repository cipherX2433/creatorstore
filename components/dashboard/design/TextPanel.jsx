'use client'

import { useState } from 'react'
import { ChevronRight } from 'lucide-react'
import ColorField from './ColorField'
import FontPickerModal from './FontPickerModal'
import AltTitleFontToggle from './AltTitleFontToggle'

export default function TextPanel({ theme, onChange, onUpgrade }) {
  const [picker, setPicker] = useState(null)
  const altOn = !!theme.altTitleFont
  const pageFont = theme.font || 'Manrope'
  const titleFont = theme.titleFont || pageFont

  return (
    <div className="space-y-1 bg-surface-card border border-edge rounded-card p-4">
      <button
        type="button"
        onClick={() => setPicker('page')}
        className="w-full flex items-center justify-between py-3 border-b border-edge-subtle cursor-pointer"
      >
        <span className="text-label text-content-primary">Page font</span>
        <span className="flex items-center gap-1 text-meta text-content-muted">
          {pageFont}
          <ChevronRight className="h-4 w-4" />
        </span>
      </button>

      <ColorField
        label="Page text color"
        value={theme.textColor}
        fallback="#FFFFFF"
        onChange={(v) => onChange({ textColor: v })}
      />

      <div className="border-t border-edge-subtle">
        <AltTitleFontToggle
          checked={altOn}
          onChange={(val) => onChange({ altTitleFont: val })}
          onUpgrade={onUpgrade}
        />
      </div>

      {altOn && (
        <>
          <button
            type="button"
            onClick={() => setPicker('title')}
            className="w-full flex items-center justify-between py-3 border-t border-edge-subtle cursor-pointer"
          >
            <span className="text-label text-content-primary">Title font</span>
            <span className="flex items-center gap-1 text-meta text-content-muted">
              {titleFont}
              <ChevronRight className="h-4 w-4" />
            </span>
          </button>
          <ColorField
            label="Title color"
            value={theme.titleColor || theme.textColor}
            fallback="#FFFFFF"
            onChange={(v) => onChange({ titleColor: v })}
          />
        </>
      )}

      <FontPickerModal
        open={picker === 'page'}
        title="Page font"
        value={pageFont}
        onSelect={(id) => onChange({ font: id })}
        onClose={() => setPicker(null)}
        onUpgrade={onUpgrade}
      />
      <FontPickerModal
        open={picker === 'title'}
        title="Title font"
        value={titleFont}
        onSelect={(id) => onChange({ titleFont: id, altTitleFont: true })}
        onClose={() => setPicker(null)}
        onUpgrade={onUpgrade}
      />
    </div>
  )
}
