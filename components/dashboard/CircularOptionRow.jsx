'use client'

import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { IconBadge } from '@/components/ui/icon-badge'

export default function CircularOptionRow({
  href,
  onClick,
  icon: Icon,
  iconColor,
  title,
  description,
  trailing,
  disabled = false,
}) {
  const inner = (
    <div className="w-full flex items-center justify-between gap-4 p-3 rounded-[18px] group cursor-pointer transition-all bg-transparent hover:bg-[#F5F5F3]">
      <div className="flex items-center gap-4 min-w-0">
        <div className="h-12 w-12 rounded-full bg-[#F2F1EF] border border-[#E5E5E3] flex items-center justify-center shrink-0 text-[#1F1F1F] transition-transform duration-200 group-hover:scale-105">
          {Icon ? <Icon className="h-5 w-5 stroke-[2] text-[#1F1F1F]" /> : null}
        </div>
        <div className="min-w-0">
          <h3 className="text-sm sm:text-base font-bold text-[#1F1F1F] group-hover:text-[#000000] transition-colors leading-snug">
            {title}
          </h3>
          {description ? (
            <p className="text-xs text-[#6F6F6B] mt-0.5 leading-normal">
              {description}
            </p>
          ) : null}
        </div>
      </div>
      {trailing || (
        <ChevronRight className="h-4.5 w-4.5 text-[#999995] transition-all duration-200 group-hover:text-[#1F1F1F] group-hover:translate-x-1 shrink-0 ml-2" />
      )}
    </div>
  )

  if (disabled || (!href && !onClick)) {
    return <div className="w-full opacity-60 cursor-default">{inner}</div>
  }

  if (href) {
    return (
      <Link href={href} className="w-full block no-underline">
        {inner}
      </Link>
    )
  }

  return (
    <button type="button" onClick={onClick} className="w-full block text-left bg-transparent p-0 border-0 cursor-pointer">
      {inner}
    </button>
  )
}
