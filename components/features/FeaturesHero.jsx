'use client'

import { Search, X } from 'lucide-react'

export default function FeaturesHero({
  searchQuery,
  onSearchChange,
  onSearchSubmit,
}) {
  return (
    <section className="w-full bg-[#EAC4E8] pt-28 sm:pt-36 pb-16 sm:pb-24 px-4 sm:px-6 lg:px-8 border-b border-black/5 select-none">
      <div className="max-w-4xl mx-auto text-center space-y-6 sm:space-y-8">
        {/* Main Title */}
        <h1
          className="text-5xl sm:text-6xl md:text-7xl lg:text-[80px] font-black text-[#1C1C1C] tracking-tight leading-[1.05]"
          style={{ fontFamily: "'Plus Jakarta Sans', var(--font-brand), sans-serif" }}
        >
          Features
        </h1>

        {/* Subtitle */}
        <p className="text-lg sm:text-xl md:text-2xl text-[#2D2D2D] font-medium max-w-2xl mx-auto leading-relaxed">
          Everything you need to create, manage, and grow your creator business with CreatorStore.
        </p>

        {/* Search Field */}
        <div className="max-w-xl mx-auto pt-2">
          <form
            onSubmit={(e) => {
              e.preventDefault()
              if (onSearchSubmit) onSearchSubmit()
            }}
            className="relative flex items-center"
            role="search"
          >
            <label htmlFor="features-search-input" className="sr-only">
              Search features
            </label>
            <input
              id="features-search-input"
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search features (e.g. products, Instagram, payouts)"
              className="w-full h-14 sm:h-16 pl-6 pr-14 rounded-full bg-white text-[#1C1C1C] placeholder:text-[#787878] text-base sm:text-lg font-medium shadow-[0_8px_30px_rgba(0,0,0,0.06)] border border-black/5 focus:outline-none focus:ring-3 focus:ring-[#1C1C1C]/20 transition-all"
            />
            {searchQuery ? (
              <button
                type="button"
                onClick={() => onSearchChange('')}
                className="absolute right-4 p-2 text-[#787878] hover:text-[#1C1C1C] rounded-full hover:bg-black/5 transition-colors"
                aria-label="Clear search"
              >
                <X className="w-5 h-5" />
              </button>
            ) : (
              <div className="absolute right-5 text-[#787878] pointer-events-none">
                <Search className="w-5 h-5 stroke-[2.2]" />
              </div>
            )}
          </form>
        </div>

        {/* Supporting Paragraph */}
        <p className="text-sm sm:text-base text-[#4A4A4A] max-w-2xl mx-auto leading-relaxed pt-2">
          CreatorStore features are the tools that help creators, educators, coaches, and digital entrepreneurs grow their audience, sell digital products, and manage their business from one link in bio. From Instagram AutoDM to store analytics, instant digital downloads to customizable storefronts, there is a feature for every goal you&apos;re working toward.
        </p>
      </div>
    </section>
  )
}
