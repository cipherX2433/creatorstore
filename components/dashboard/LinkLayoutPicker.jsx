'use client'

import { useState } from 'react'
import { LayoutGrid } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { normalizeSectionLayout } from '@/lib/storefrontLayout'

export default function LinkLayoutPicker({ sectionType, layout, onSelect }) {
  const [open, setOpen] = useState(false)
  const current = normalizeSectionLayout(sectionType, layout)

  function choose(next) {
    onSelect(next)
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          title="Layout"
          aria-label="Choose layout"
          className="p-2 rounded-control text-content-muted hover:text-content-primary hover:bg-surface-hover transition-colors cursor-pointer shrink-0"
        >
          <LayoutGrid className="h-4 w-4" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={8}
        onPointerDown={(e) => e.stopPropagation()}
        className="w-[280px] p-3 bg-surface-overlay border-edge rounded-modal shadow-dropdown text-content-primary"
      >
        <p className="text-label text-content-primary mb-3">Layout</p>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => choose('classic')}
            className={`flex flex-col gap-2 p-2 rounded-control border text-left cursor-pointer transition-colors ${
              current === 'classic'
                ? 'border-edge-focus bg-brand-soft'
                : 'border-edge bg-surface-raised hover:border-edge-strong'
            }`}
          >
            <div className="h-10 w-full rounded-control border border-edge bg-surface-card flex items-center gap-1.5 px-1.5">
              <span className="h-6 w-6 rounded-chip bg-brand shrink-0" />
              <span className="h-1.5 flex-1 rounded-chip bg-content-subtle/40" />
            </div>
            <span className="text-micro text-content-primary">Classic</span>
          </button>
          <button
            type="button"
            onClick={() => choose('featured')}
            className={`flex flex-col gap-2 p-2 rounded-control border text-left cursor-pointer transition-colors ${
              current === 'featured'
                ? 'border-edge-focus bg-brand-soft'
                : 'border-edge bg-surface-raised hover:border-edge-strong'
            }`}
          >
            <div className="w-full rounded-control border border-edge bg-surface-card overflow-hidden">
              <div className="h-7 w-full bg-brand/70" />
              <div className="px-1.5 py-1 space-y-1">
                <span className="block h-1.5 w-3/4 rounded-chip bg-content-subtle/40" />
                <span className="block h-1 w-1/3 rounded-chip bg-content-subtle/25" />
              </div>
            </div>
            <span className="text-micro text-content-primary">Featured</span>
          </button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
