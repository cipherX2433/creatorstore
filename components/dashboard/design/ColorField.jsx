'use client'

import { Input } from '@/components/ui/input'

export default function ColorField({ label, value, fallback = '#000000', onChange }) {
  const hex = value || fallback
  return (
    <div className="flex items-center justify-between gap-3 py-2">
      {label ? <span className="text-label text-content-primary">{label}</span> : null}
      <div className="flex items-center gap-2 min-w-0">
        <input
          type="color"
          value={/^#([0-9a-f]{6})$/i.test(hex) ? hex : fallback}
          onChange={(e) => onChange(e.target.value)}
          className="h-9 w-9 cursor-pointer rounded-control border border-edge bg-surface-raised shrink-0"
        />
        <Input
          value={value || ''}
          placeholder={fallback}
          onChange={(e) => onChange(e.target.value)}
          className="h-9 w-[7.5rem] text-meta bg-surface-raised border-edge text-content-primary rounded-control uppercase"
        />
      </div>
    </div>
  )
}
