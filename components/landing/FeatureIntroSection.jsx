'use client'

import React from 'react'
import Image from 'next/image'
import { motion, useReducedMotion } from 'framer-motion'

export default function FeatureIntroSection() {
  const prefersReducedMotion = useReducedMotion()

  return (
    <section
      id="feature-intro"
      aria-label="Built for every niche"
      className="relative w-full bg-[#000000] text-white overflow-hidden pt-20 sm:pt-28 md:pt-32 pb-0 selection:bg-[#FF4B1F] selection:text-white"
    >
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* =========================================================================
            1. TOP INTRO TYPOGRAPHY (Clean Modern Sans + Italic Serif + Muted Paragraph)
           ========================================================================= */}
        <div className="text-center max-w-4xl mx-auto space-y-3 sm:space-y-4">
          
          {/* First Heading: Clean Modern Sans-Serif, Thin/Light Weight */}
          <motion.h2
            initial={{ opacity: 0, y: prefersReducedMotion ? 0 : 25 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: prefersReducedMotion ? 0.2 : 0.65, ease: [0.22, 1, 0.36, 1] }}
            className="text-3xl sm:text-4xl md:text-5xl lg:text-[54px] font-light text-white tracking-tight leading-[1.1]"
          >
            Built for every niche.
          </motion.h2>

          {/* Main Editorial Heading: Elegant High-Contrast Italic Serif */}
          <motion.h3
            initial={{ opacity: 0, y: prefersReducedMotion ? 0 : 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: prefersReducedMotion ? 0.2 : 0.75, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
            className="font-hero-serif text-4xl sm:text-6xl md:text-7xl lg:text-[76px] font-normal italic text-white tracking-tight leading-[1.02] sm:leading-[1.05]"
          >
            Creators, designers and writers
          </motion.h3>

          {/* Supporting Paragraph: Centered Muted Light-Gray */}
          <motion.p
            initial={{ opacity: 0, y: prefersReducedMotion ? 0 : 25 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: prefersReducedMotion ? 0.2 : 0.7, delay: 0.18, ease: [0.22, 1, 0.36, 1] }}
            className="text-base sm:text-lg md:text-[20px] text-[#A1A1AA] font-light leading-relaxed max-w-[890px] mx-auto pt-2 sm:pt-4"
          >
            CreatorStore lets creators sell digital products, grow a subscriber list, and share all their content — from one branded link. 0% transaction fees.
          </motion.p>
        </div>

        {/* =========================================================================
            2. PRODUCT SHOWCASE VISUAL (Tablet & Phone in Grass)
           ========================================================================= */}
        <motion.div
          initial={{ opacity: 0, y: prefersReducedMotion ? 0 : 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: prefersReducedMotion ? 0.2 : 0.85, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
          className="relative mt-12 sm:mt-16 md:mt-20 max-w-[1200px] mx-auto flex justify-center"
        >
          {/* Subtle Ambient Glow behind visual */}
          <div className="absolute -inset-4 bg-gradient-to-r from-[#FF4B1F]/10 via-transparent to-transparent rounded-[36px] blur-3xl pointer-events-none" />

          <div className="relative w-full overflow-hidden flex justify-center">
            <Image
              src="/assets/features/devices-showcase.png"
              alt="CreatorStore - Built for every niche. Creators, designers and writers"
              width={1024}
              height={605}
              priority
              className="w-full h-auto max-w-[1100px] object-contain mx-auto select-none pointer-events-none"
            />
          </div>
        </motion.div>

      </div>
    </section>
  )
}
