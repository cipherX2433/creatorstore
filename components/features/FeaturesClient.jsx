'use client'

import { useState } from 'react'
import Navbar from '@/components/landing/Navbar'
import Footer from '@/components/landing/Footer'
import FeaturesHero from '@/components/features/FeaturesHero'
import PopularFeaturesSection from '@/components/features/PopularFeaturesSection'
import BrowseByGoalSection from '@/components/features/BrowseByGoalSection'
import AllFeaturesSection from '@/components/features/AllFeaturesSection'
import FeaturesFaqSection from '@/components/features/FeaturesFaqSection'

export default function FeaturesClient() {
  const [searchQuery, setSearchQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState('All features')

  // Scroll to all features section smoothly
  const scrollToCatalog = () => {
    if (typeof document !== 'undefined') {
      const el = document.getElementById('all-features')
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' })
      }
    }
  }

  const handleSearchSubmit = () => {
    scrollToCatalog()
  }

  const handleSelectFeatureChip = (feature) => {
    setSearchQuery(feature.name)
    setActiveCategory('All features')
    scrollToCatalog()
  }

  const handleResetFilters = () => {
    setSearchQuery('')
    setActiveCategory('All features')
  }

  return (
    <div className="min-h-screen bg-black font-sans antialiased text-[#1C1C1C] selection:bg-[#D7F01D] selection:text-black">
      {/* Section A — Public Navigation */}
      <Navbar />

      <main className="w-full">
        {/* Section B — Features Hero (Soft Lavender #EAC4E8) */}
        <FeaturesHero
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onSearchSubmit={handleSearchSubmit}
        />

        {/* Section C — Popular Features (Warm Orange #FF9414) */}
        <PopularFeaturesSection />

        {/* Section D — Browse by Goal (Bright Lime #D7F01D) */}
        <BrowseByGoalSection onSelectFeatureChip={handleSelectFeatureChip} />

        {/* Section E — All Features (Soft Lavender #EAC4E8) */}
        <AllFeaturesSection
          searchQuery={searchQuery}
          activeCategory={activeCategory}
          onCategoryChange={setActiveCategory}
          onResetFilters={handleResetFilters}
        />

        {/* Section F — Frequently Asked Questions (Light Neutral #F3F3F0) */}
        <FeaturesFaqSection />
      </main>

      {/* Section G — Closing CTA and Public Footer */}
      <Footer showCta={true} />
    </div>
  )
}
