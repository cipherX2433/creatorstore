'use client'

import { ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { IconBadge } from '@/components/ui/icon-badge'

export function SettingsValuePill({ children, className }) {
  return (
    <span
      className={cn(
        'text-xs font-semibold text-[#1F1F1F] bg-[#F5F5F3] px-3 py-1 rounded-full border border-[#E5E5E3]',
        className
      )}
    >
      {children}
    </span>
  )
}

export function SettingsRow({
  icon: Icon,
  iconColor,
  title,
  description,
  value,
  valueNode,
  onClick,
  className,
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'w-full flex items-center justify-between p-4 rounded-[20px] border border-[#E5E5E3] bg-[#FFFFFF] hover:bg-[#F5F5F3] hover:border-[#DADAD7] transition-colors cursor-pointer text-left group',
        className
      )}
    >
      <div className="flex items-center gap-3.5 min-w-0">
        <IconBadge color={iconColor}>
          {Icon ? <Icon className="h-5 w-5" /> : null}
        </IconBadge>
        <div className="min-w-0">
          <h4 className="text-sm font-bold text-[#1F1F1F]">{title}</h4>
          {description ? (
            <p className="text-xs text-[#6F6F6B] font-medium">{description}</p>
          ) : null}
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {valueNode || (value != null ? <SettingsValuePill>{value}</SettingsValuePill> : null)}
        <ChevronRight className="h-4 w-4 text-[#6F6F6B] group-hover:text-[#1F1F1F]" />
      </div>
    </button>
  )
}

export function AddOptionRow({
  icon: Icon,
  iconColor,
  title,
  description,
  onClick,
  trailing,
  disabled = false,
  className: customClassName,
}) {
  const inner = (
    <>
      <div className="flex items-center gap-3.5 min-w-0">
        <IconBadge color={iconColor} size="md" className="h-11 w-11 shrink-0 shadow-none">
          {Icon ? <Icon className="h-5 w-5 stroke-[2] text-white" /> : null}
        </IconBadge>
        <div className="min-w-0">
          <p className="text-[15px] font-semibold text-[#1F1F1F] leading-tight">{title}</p>
          {description ? (
            <p className="text-xs text-[#6F6F6B] leading-snug mt-0.5 font-normal">{description}</p>
          ) : null}
        </div>
      </div>
      <div className="shrink-0 ml-3">
        {trailing || (
          <ChevronRight className="h-4 w-4 text-[#A8A8A4] group-hover:text-[#1F1F1F] group-hover:translate-x-0.5 transition-all" />
        )}
      </div>
    </>
  )

  const className = cn(
    'w-full flex items-center justify-between p-3 sm:px-3.5 sm:py-3 rounded-2xl bg-transparent text-left transition-colors duration-150 group border-none select-none',
    disabled
      ? 'opacity-50 cursor-default'
      : 'hover:bg-[#F2F1EF] active:bg-[#EAE9E6] cursor-pointer',
    customClassName
  )

  if (disabled || !onClick) {
    return <div className={className}>{inner}</div>
  }

  return (
    <button type="button" onClick={onClick} className={className}>
      {inner}
    </button>
  )
}
