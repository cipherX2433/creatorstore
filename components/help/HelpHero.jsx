'use client'

import HelpCenterHeader from './HelpCenterHeader'
import HelpSearch from './HelpSearch'

export default function HelpHero({
  title = 'How can we help?',
  subtitle = 'Search our guides, or browse by topic below.',
}) {
  return (
    <section className="w-full bg-[#D8F21F] text-[#202432] pb-16 sm:pb-24 transition-colors">
      {/* Floating Pill Header inside hero */}
      <HelpCenterHeader />

      {/* Hero Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-12 sm:pt-16 text-center">
        <h1
          className="text-4xl sm:text-6xl md:text-[68px] font-black tracking-tight text-[#202432] leading-[1.08] mb-4 sm:mb-5"
          style={{ fontFamily: "'Plus Jakarta Sans', var(--font-brand), sans-serif" }}
        >
          {title}
        </h1>

        <p className="text-base sm:text-xl text-[#202432]/85 font-medium max-w-xl mx-auto mb-8 sm:mb-10 leading-relaxed">
          {subtitle}
        </p>

        {/* Prominent White Search Pill */}
        <div className="w-full flex justify-center">
          <HelpSearch variant="hero" placeholder="Search for articles" />
        </div>
      </div>
    </section>
  )
}
