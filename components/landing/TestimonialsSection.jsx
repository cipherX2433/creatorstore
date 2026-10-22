'use client'

import { motion } from 'framer-motion'
import { Sparkles } from 'lucide-react'
import TestimonialMarquee from './TestimonialMarquee'

// ─── REAL CREATOR TESTIMONIAL DATA ──────────────────────────────────────────
const ROW_1_TESTIMONIALS = [
  {
    id: 't1',
    quote: 'CreatorStore made it so easy to sell my templates. I went from 0 to 1,000+ sales without any technical headaches.',
    name: 'Aman K.',
    username: '@theamancreator',
    initial: 'A',
  },
  {
    id: 't2',
    quote: 'The best platform for creators. Super simple to use, beautiful store, and my downloads are delivered securely.',
    name: 'Simran D.',
    username: '@simrandesigns',
    initial: 'S',
  },
  {
    id: 't3',
    quote: 'I love how easy it is to set up my store and start selling. CreatorStore handles the tech so I can focus on creating.',
    name: 'Rohit Mehta',
    username: '@rohitmehta',
    initial: 'R',
  },
  {
    id: 't4',
    quote: 'Excellent support and smooth experience. My audience loves the simple checkout and instant access.',
    name: 'Priya S.',
    username: '@priyascoaching',
    initial: 'P',
  },
  {
    id: 't5',
    quote: 'Migrated my entire catalog from Gumroad. The 0% platform fee and unified link made a huge difference to my margin.',
    name: 'Siddharth P.',
    username: '@siddharthcreates',
    initial: 'S',
  },
  {
    id: 't6',
    quote: 'Setting up my storefront took less than 10 minutes. The instant checkout conversion has been incredible.',
    name: 'Ananya R.',
    username: '@ananyadesigns',
    initial: 'A',
  },
]

const ROW_2_TESTIMONIALS = [
  {
    id: 't7',
    quote: "CreatorStore has been a game changer for my business. I've already made back my investment in the first month.",
    name: 'Neha Verma',
    username: '@nehasocials',
    initial: 'N',
  },
  {
    id: 't8',
    quote: 'Super beginner-friendly and powerful. I finally have a professional storefront for my digital products.',
    name: 'Kushank',
    username: '@kushankcreators',
    initial: 'K',
  },
  {
    id: 't9',
    quote: 'Everything just works. From payments to product delivery, CreatorStore makes it effortless.',
    name: 'Manvi R.',
    username: '@manvirawrites',
    initial: 'M',
  },
  {
    id: 't10',
    quote: 'The clean design and smooth experience makes CreatorStore stand out. Highly recommended!',
    name: 'Dhruv',
    username: '@dhruvbuilds',
    initial: 'D',
  },
  {
    id: 't11',
    quote: 'The Instagram AutoDM feature and direct checkout doubled my lead capture and product sales.',
    name: 'Tanmay B.',
    username: '@tanmaybuilds',
    initial: 'T',
  },
  {
    id: 't12',
    quote: 'Selling coaching calls, digital guides, and services under one sleek link gave my brand a massive upgrade.',
    name: 'Ritu G.',
    username: '@ritugrowth',
    initial: 'R',
  },
]

export default function TestimonialsSection() {
  return (
    <section className="w-full bg-[#232323] py-20 sm:py-28 lg:py-32 border-t border-white/10 overflow-hidden relative select-none">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12 sm:space-y-16">

        {/* Section Header */}
        <div className="text-center space-y-4 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3.5 py-1 text-xs font-bold text-[#A3A3A3] shadow-xs">
            <Sparkles className="h-3.5 w-3.5 text-[#FF4B1F]" />
            <span>LOVED BY CREATORS</span>
          </div>

          <h2 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold text-white tracking-tight leading-[1.1]">
            Real creators. Real <span className="text-[#FF4B1F]">results.</span>
          </h2>

          <p className="text-base sm:text-lg text-[#A3A3A3] max-w-2xl mx-auto leading-relaxed">
            See how creators, coaches, and digital educators use CreatorStore to sell digital products, automate Instagram conversations, and build their income.
          </p>
        </div>

        {/* Two-Row Infinite Marquee */}
        <div className="w-full">
          <TestimonialMarquee
            row1={ROW_1_TESTIMONIALS}
            row2={ROW_2_TESTIMONIALS}
          />
        </div>

        {/* Footer Statement */}
        <p className="text-xs text-[#737373] text-center font-medium">
          Built for creators who want to own their audience, storefront, and revenue
        </p>

      </div>
    </section>
  )
}
