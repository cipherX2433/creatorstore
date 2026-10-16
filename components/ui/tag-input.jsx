'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

export function TagInput({
  label = 'Tags',
  tags = [],
  onChange,
  placeholder = 'Add a tag and press Enter',
  className,
}) {
  const [draft, setDraft] = useState('')

  function commit(raw) {
    const value = String(raw || '').trim().replace(/,$/, '')
    if (!value) return
    if (tags.includes(value)) {
      setDraft('')
      return
    }
    onChange?.([...tags, value])
    setDraft('')
  }

  function onKeyDown(e) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      commit(draft)
    } else if (e.key === 'Backspace' && !draft && tags.length) {
      onChange?.(tags.slice(0, -1))
    }
  }

  function onPaste(e) {
    const text = e.clipboardData?.getData('text') || ''
    if (!text.includes(',')) return
    e.preventDefault()
    const next = text.split(',').map((t) => t.trim()).filter(Boolean)
    const merged = [...tags]
    next.forEach((t) => {
      if (!merged.includes(t)) merged.push(t)
    })
    onChange?.(merged)
    setDraft('')
  }

  return (
    <div className={cn('flex flex-col gap-1.5 w-full', className)}>
      {label ? <label className="text-xs font-semibold text-[#010619]">{label}</label> : null}
      <div
        className="flex flex-wrap items-center gap-2 min-h-[48px] w-full bg-[#FFFFFF] border border-[#E5E4E2] rounded-xl px-3 py-2.5 transition-all hover:border-[#D5D4D2] focus-within:border-[#194DF5] focus-within:ring-2 focus-within:ring-[#194DF5]/15"
      >
        {tags.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1.5 rounded-full bg-[#F2F1EF] text-[#010619] border border-[#E5E4E2] text-xs font-semibold px-3 py-1"
          >
            {tag}
            <button
              type="button"
              onClick={() => onChange?.(tags.filter((t) => t !== tag))}
              className="text-[#6B7399] hover:text-[#010619] transition-colors cursor-pointer"
              aria-label={`Remove ${tag}`}
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKeyDown}
          onPaste={onPaste}
          onBlur={() => commit(draft)}
          placeholder={tags.length ? '' : placeholder}
          className="flex-1 min-w-[120px] bg-transparent text-sm text-[#010619] placeholder:text-[#6B7399] outline-none"
        />
      </div>
    </div>
  )
}
