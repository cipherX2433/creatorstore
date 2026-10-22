'use client'

import Link from 'next/link'
import {
  Package,
  Store,
  Bot,
  BarChart3,
  Calendar,
  Wallet,
  Palette,
  Users,
  FormInput,
  IdCard,
  Tag,
  ShoppingBag,
  CreditCard,
  Mail,
  Link2,
  ArrowRight,
  SearchX,
  X,
} from 'lucide-react'
import { FEATURE_CATEGORIES, CREATORSTORE_FEATURES } from '@/lib/featuresData'

const ICON_MAP = {
  Package,
  Store,
  Bot,
  BarChart3,
  Calendar,
  Wallet,
  Palette,
  Users,
  FormInput,
  IdCard,
  Tag,
  ShoppingBag,
  CreditCard,
  Mail,
  Link2,
}

export default function AllFeaturesSection({
  searchQuery,
  activeCategory,
  onCategoryChange,
  onResetFilters,
}) {
  // Filter features by category and search query
  const filteredFeatures = CREATORSTORE_FEATURES.filter((feature) => {
    // 1. Category filter
    if (activeCategory !== 'All features' && feature.category !== activeCategory) {
      return false
    }

    // 2. Search query filter
    if (searchQuery && searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase().trim()
      const matchName = feature.name.toLowerCase().includes(q)
      const matchDesc = feature.description.toLowerCase().includes(q)
      const matchKeywords = feature.searchKeywords.toLowerCase().includes(q)
      const matchCategory = feature.category.toLowerCase().includes(q)
      if (!matchName && !matchDesc && !matchKeywords && !matchCategory) {
        return false
      }
    }

    return true
  })

  return (
    <section
      id="all-features"
      className="w-full bg-[#EAC4E8] py-16 sm:py-24 px-4 sm:px-6 lg:px-8 border-b border-black/5"
    >
      <div className="max-w-7xl mx-auto">
        {/* Section Heading */}
        <h2
          className="text-4xl sm:text-5xl lg:text-6xl font-black text-[#1C1C1C] text-center mb-8 sm:mb-10 tracking-tight"
          style={{ fontFamily: "'Plus Jakarta Sans', var(--font-brand), sans-serif" }}
        >
          All features
        </h2>

        {/* Filter Pills Bar */}
        <div className="flex justify-center mb-6">
          <div className="bg-white p-1.5 rounded-full inline-flex flex-wrap items-center justify-center gap-1.5 shadow-[0_4px_20px_rgba(0,0,0,0.04)] border border-black/5">
            {FEATURE_CATEGORIES.map((category) => {
              const isActive = activeCategory === category

              return (
                <button
                  key={category}
                  type="button"
                  onClick={() => onCategoryChange(category)}
                  className={`rounded-full px-5 py-2 text-sm font-bold transition-all cursor-pointer ${
                    isActive
                      ? 'bg-[#1C1C1C] text-white shadow-xs'
                      : 'text-[#1C1C1C] hover:bg-[#F2F1EF]'
                  }`}
                  aria-pressed={isActive}
                >
                  {category}
                </button>
              )
            })}
          </div>
        </div>

        {/* Active Search / Filter Status Indicator */}
        <div className="flex items-center justify-between flex-wrap gap-3 mb-6 text-sm text-[#4A4A4A] px-1">
          <span className="font-semibold">
            {filteredFeatures.length === 1
              ? '1 feature available'
              : `${filteredFeatures.length} features available`}
            {searchQuery && (
              <span>
                {' '}
                for &ldquo;<strong className="text-[#1C1C1C]">{searchQuery}</strong>&rdquo;
              </span>
            )}
            {activeCategory !== 'All features' && (
              <span> in <strong className="text-[#1C1C1C]">{activeCategory}</strong></span>
            )}
          </span>

          {(searchQuery || activeCategory !== 'All features') && (
            <button
              type="button"
              onClick={onResetFilters}
              className="inline-flex items-center gap-1 text-xs font-bold text-[#1C1C1C] hover:text-[#FF4B1F] bg-white/70 hover:bg-white px-3 py-1 rounded-full transition-all cursor-pointer border border-black/5 shadow-2xs"
            >
              <X className="w-3.5 h-3.5" />
              <span>Reset filters</span>
            </button>
          )}
        </div>

        {/* Feature Cards Grid (2-Column Desktop, 1-Column Mobile) */}
        {filteredFeatures.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
            {filteredFeatures.map((feature) => {
              const IconComponent = ICON_MAP[feature.iconName] || Package

              return (
                <div
                  key={feature.id}
                  className="bg-white rounded-[24px] sm:rounded-[28px] p-6 sm:p-7 flex flex-col justify-between shadow-[0_4px_20px_rgba(0,0,0,0.04)] hover:shadow-[0_12px_32px_rgba(0,0,0,0.08)] hover:-translate-y-0.5 transition-all duration-150 border border-black/5 group"
                >
                  <div>
                    {/* Top Row: Icon + Category Pill */}
                    <div className="flex items-center justify-between gap-3">
                      <div className="w-11 h-11 rounded-full bg-[#F3F3F0] flex items-center justify-center text-[#1C1C1C] group-hover:scale-105 transition-transform duration-150">
                        <IconComponent className="w-5 h-5 stroke-[2]" />
                      </div>

                      <span className="px-3 py-1 rounded-full bg-[#F3F3F0] text-[#1C1C1C] text-xs font-bold tracking-wide uppercase">
                        {feature.category}
                      </span>
                    </div>

                    {/* Feature Title */}
                    <h3
                      className="text-xl sm:text-2xl font-bold text-[#1C1C1C] mt-4 mb-2 tracking-tight group-hover:text-[#FF4B1F] transition-colors"
                      style={{ fontFamily: "'Plus Jakarta Sans', var(--font-brand), sans-serif" }}
                    >
                      {feature.name}
                    </h3>

                    {/* Feature Description */}
                    <p className="text-sm text-[#555555] leading-relaxed line-clamp-2">
                      {feature.description}
                    </p>
                  </div>

                  {/* Bottom View Feature Link */}
                  <div className="mt-5 pt-1">
                    <Link
                      href={feature.href}
                      className="inline-flex items-center gap-1.5 text-sm font-bold text-[#1C1C1C] hover:text-[#FF4B1F] group-hover:gap-2.5 transition-all"
                    >
                      <span>View feature</span>
                      <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                    </Link>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          /* Empty Search Results State */
          <div className="bg-white rounded-[28px] p-10 sm:p-14 text-center max-w-lg mx-auto shadow-sm border border-black/5 space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-[#F3F3F0] flex items-center justify-center mx-auto text-[#787878]">
              <SearchX className="w-7 h-7 stroke-[1.8]" />
            </div>

            <h3
              className="text-xl sm:text-2xl font-bold text-[#1C1C1C]"
              style={{ fontFamily: "'Plus Jakarta Sans', var(--font-brand), sans-serif" }}
            >
              No features found
            </h3>

            <p className="text-sm text-[#6F6F6B] leading-relaxed">
              We couldn&apos;t find any features matching &ldquo;{searchQuery}&rdquo; in {activeCategory}. Try adjusting your keywords or clearing the filter.
            </p>

            <div className="pt-2">
              <button
                type="button"
                onClick={onResetFilters}
                className="px-6 py-2.5 rounded-full bg-[#1C1C1C] text-white font-bold text-sm hover:bg-black transition-colors shadow-sm cursor-pointer"
              >
                Reset all filters
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
