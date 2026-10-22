'use client'

import Link from 'next/link'
import {
  Compass,
  Package,
  Wallet,
  Calendar,
  Sparkles,
  ShieldCheck,
  Folder,
  ArrowUpRight,
} from 'lucide-react'

const ICON_MAP = {
  Compass,
  Package,
  Wallet,
  Calendar,
  Sparkles,
  ShieldCheck,
}

export default function HelpCategoryCard({ category, articleCount }) {
  const IconComponent = ICON_MAP[category.iconName] || Folder

  return (
    <Link
      href={`/help/${category.id}`}
      className="group relative bg-white rounded-[24px] sm:rounded-[28px] p-7 sm:p-8 border border-[#E2E3DD] hover:border-[#5B347C]/40 hover:shadow-[0_12px_32px_rgba(32,36,50,0.06)] focus:outline-none focus:ring-2 focus:ring-[#5B347C] focus:ring-offset-2 transition-all duration-200 flex flex-col justify-between min-h-[220px]"
    >
      <div>
        {/* Soft Lavender Icon Tile */}
        <div className="w-12 h-12 rounded-2xl bg-[#EBC1EB]/60 text-[#5B347C] flex items-center justify-center transition-transform group-hover:scale-105 duration-200">
          <IconComponent className="w-6 h-6 stroke-[1.8]" />
        </div>

        {/* Title & Description */}
        <div className="mt-5 sm:mt-6">
          <div className="flex items-center justify-between gap-2">
            <h3
              className="text-xl sm:text-2xl font-bold text-[#202432] group-hover:text-[#5B347C] transition-colors tracking-tight"
              style={{ fontFamily: "'Plus Jakarta Sans', var(--font-brand), sans-serif" }}
            >
              {category.title}
            </h3>
            <ArrowUpRight className="w-4 h-4 text-transparent group-hover:text-[#5B347C] transition-colors shrink-0 -translate-y-0.5" />
          </div>
          <p className="text-sm sm:text-base text-[#777A83] mt-2 leading-relaxed line-clamp-2">
            {category.description}
          </p>
        </div>
      </div>

      {/* Article Count */}
      <div className="mt-6 pt-2">
        <span className="text-xs sm:text-sm font-semibold text-[#777A83] group-hover:text-[#202432] transition-colors">
          {articleCount} {articleCount === 1 ? 'article' : 'articles'}
        </span>
      </div>
    </Link>
  )
}
