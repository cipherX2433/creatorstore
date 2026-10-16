'use client'

import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { MODAL_ACCENT } from '@/lib/modalTheme'
import { IconBadge } from '@/components/ui/icon-badge'

export function SelectableCardGrid({ children, className }) {
  return (
    <div className={cn('grid grid-cols-1 sm:grid-cols-2 gap-3', className)}>
      {children}
    </div>
  )
}

export function SelectableCard({
  selected = false,
  onSelect,
  title,
  description,
  icon,
  iconColor,
  disabled = false,
  className,
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      disabled={disabled}
      onClick={onSelect}
      className={cn(
        'relative w-full text-left p-5 rounded-2xl transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed',
        selected
          ? 'bg-[#F5F5F3] border-2 border-[#1F1F1F]'
          : 'bg-[#FFFFFF] border border-[#E5E5E3] hover:bg-[#F5F5F3] hover:border-[#DADAD7]',
        className
      )}
      style={
        selected
          ? { borderColor: '#1F1F1F', boxSizing: 'border-box' }
          : undefined
      }
    >
      {selected ? (
        <span
          className="absolute top-3 right-3 h-5 w-5 rounded-full flex items-center justify-center bg-[#1F1F1F]"
        >
          <Check className="h-3 w-3 text-white" strokeWidth={3} />
        </span>
      ) : null}

      <div className={cn('flex flex-col gap-1 pr-7', !description && 'justify-center')}>
        {icon ? (
          iconColor ? (
            <IconBadge color={iconColor} className="mb-2">{icon}</IconBadge>
          ) : (
            <IconBadge color="#1F1F1F" className="mb-2">{icon}</IconBadge>
          )
        ) : null}
        <p className="text-sm font-bold text-[#1F1F1F]">{title}</p>
        {description ? (
          <p className="text-sm text-[#6F6F6B] leading-relaxed">{description}</p>
        ) : null}
      </div>
    </button>
  )
}
