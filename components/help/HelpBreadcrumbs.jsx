'use client'

import Link from 'next/link'
import { ChevronRight, Home } from 'lucide-react'

export default function HelpBreadcrumbs({ items = [] }) {
  return (
    <nav aria-label="Breadcrumb" className="w-full mb-6 sm:mb-8">
      <ol className="flex items-center flex-wrap gap-1.5 sm:gap-2 text-xs sm:text-sm text-[#777A83]">
        <li>
          <Link
            href="/help"
            className="hover:text-[#202432] transition-colors font-medium flex items-center gap-1"
          >
            <span>Help Center</span>
          </Link>
        </li>

        {items.map((item, index) => {
          const isLast = index === items.length - 1
          return (
            <li key={index} className="flex items-center gap-1.5 sm:gap-2">
              <span className="text-[#E2E3DD] select-none">/</span>
              {item.href && !isLast ? (
                <Link
                  href={item.href}
                  className="hover:text-[#202432] transition-colors font-medium truncate max-w-[200px] sm:max-w-none"
                >
                  {item.label}
                </Link>
              ) : (
                <span
                  className={`font-semibold truncate max-w-[220px] sm:max-w-md ${
                    isLast ? 'text-[#202432]' : 'text-[#777A83]'
                  }`}
                  aria-current={isLast ? 'page' : undefined}
                >
                  {item.label}
                </span>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
