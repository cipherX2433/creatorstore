'use client'

import { Zap } from 'lucide-react'

export default function ProBadge({
  onUpgrade,
  className = '',
  as = onUpgrade ? 'button' : 'span',
  interactive = as !== 'span',
}) {
  const Component = as === 'span' || interactive === false ? 'span' : 'button'
  const isButton = Component === 'button'

  if (!isButton) {
    return (
      <span
        title="Upgrade plan"
        aria-label="Upgrade plan"
        className={`inline-flex h-5 w-5 items-center justify-center rounded-full bg-brand-yellow text-brand-fg select-none ${className}`}
      >
        <Zap className="h-3 w-3 fill-current" />
      </span>
    )
  }

  return (
    <button
      type="button"
      title="Upgrade plan"
      aria-label="Upgrade plan"
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        onUpgrade?.()
      }}
      className={`inline-flex h-5 w-5 items-center justify-center rounded-full bg-brand-yellow text-brand-fg cursor-pointer hover:brightness-95 transition-opacity ${className}`}
    >
      <Zap className="h-3 w-3 fill-current" />
    </button>
  )
}

