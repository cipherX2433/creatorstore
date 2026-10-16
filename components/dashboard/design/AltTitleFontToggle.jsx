'use client'

import ProBadge from './ProBadge'

export default function AltTitleFontToggle({ checked, onChange, onUpgrade }) {
  return (
    <div className="flex items-start justify-between gap-3 py-3">
      <div>
        <div className="flex items-center gap-1.5">
          <span className="text-label text-content-primary">Alternative title font</span>
          <ProBadge onUpgrade={onUpgrade} />
        </div>
        <p className="text-micro text-content-muted mt-0.5">Matches page font by default</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => {
          if (!checked) {
            onUpgrade?.()
            onChange(true)
            return
          }
          onChange(false)
        }}
        className={`relative h-6 w-10 rounded-full shrink-0 cursor-pointer transition-colors ${checked ? 'bg-brand' : 'bg-surface-raised border border-edge'}`}
      >
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${checked ? 'left-4' : 'left-0.5'}`} />
      </button>
    </div>
  )
}
