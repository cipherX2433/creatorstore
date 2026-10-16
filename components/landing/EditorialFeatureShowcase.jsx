'use client'

import React from 'react'
import Image from 'next/image'
import { motion, useReducedMotion } from 'framer-motion'

/**
 * PixelatedTransition
 * Recreates the digital pixel jagged transition from black to white
 * with scattered neon green accent blocks as shown in reference screenshots.
 */
function PixelatedTransition() {
  return (
    <div className="w-full bg-[#000000] overflow-hidden leading-none select-none -mb-px">
      <svg
        viewBox="0 0 1200 64"
        preserveAspectRatio="none"
        className="w-full h-12 sm:h-16 md:h-20 block"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Base Black Background */}
        <rect width="1200" height="64" fill="#000000" />

        {/* Row 0 (y=0 to 16): Scattered white pixels and occasional green accent */}
        <rect x="100" y="0" width="20" height="16" fill="#FFFFFF" />
        <rect x="260" y="0" width="20" height="16" fill="#FFFFFF" />
        <rect x="440" y="0" width="20" height="16" fill="#22C55E" />
        <rect x="620" y="0" width="20" height="16" fill="#FFFFFF" />
        <rect x="800" y="0" width="20" height="16" fill="#FFFFFF" />
        <rect x="980" y="0" width="20" height="16" fill="#FFFFFF" />
        <rect x="1120" y="0" width="20" height="16" fill="#4ADE80" />

        {/* Row 1 (y=16 to 32): Stepped jagged white clusters + green accents */}
        <rect x="40" y="16" width="40" height="16" fill="#FFFFFF" />
        <rect x="100" y="16" width="60" height="16" fill="#FFFFFF" />
        <rect x="180" y="16" width="20" height="16" fill="#22C55E" />
        <rect x="220" y="16" width="80" height="16" fill="#FFFFFF" />
        <rect x="340" y="16" width="60" height="16" fill="#FFFFFF" />
        <rect x="420" y="16" width="80" height="16" fill="#FFFFFF" />
        <rect x="540" y="16" width="40" height="16" fill="#FFFFFF" />
        <rect x="600" y="16" width="80" height="16" fill="#FFFFFF" />
        <rect x="700" y="16" width="20" height="16" fill="#4ADE80" />
        <rect x="740" y="16" width="80" height="16" fill="#FFFFFF" />
        <rect x="860" y="16" width="60" height="16" fill="#FFFFFF" />
        <rect x="940" y="16" width="80" height="16" fill="#FFFFFF" />
        <rect x="1060" y="16" width="60" height="16" fill="#FFFFFF" />
        <rect x="1140" y="16" width="40" height="16" fill="#FFFFFF" />

        {/* Row 2 (y=32 to 48): Mostly white with jagged black teeth and green accents */}
        <rect x="0" y="32" width="1200" height="16" fill="#FFFFFF" />
        <rect x="60" y="32" width="20" height="16" fill="#000000" />
        <rect x="160" y="32" width="20" height="16" fill="#000000" />
        <rect x="300" y="32" width="20" height="16" fill="#000000" />
        <rect x="520" y="32" width="20" height="16" fill="#000000" />
        <rect x="680" y="32" width="20" height="16" fill="#000000" />
        <rect x="840" y="32" width="20" height="16" fill="#000000" />
        <rect x="1020" y="32" width="20" height="16" fill="#000000" />
        {/* Accent greens in Row 2 */}
        <rect x="220" y="32" width="20" height="16" fill="#22C55E" />
        <rect x="620" y="32" width="20" height="16" fill="#4ADE80" />
        <rect x="900" y="32" width="20" height="16" fill="#22C55E" />

        {/* Row 3 (y=48 to 64): Solid White with rare 1-block teeth */}
        <rect x="0" y="48" width="1200" height="16" fill="#FFFFFF" />
        <rect x="120" y="48" width="20" height="16" fill="#000000" />
        <rect x="760" y="48" width="20" height="16" fill="#000000" />
      </svg>
    </div>
  )
}

/**
 * Editorial Feature Grid Data
 * Matches the asymmetric editorial / masonry rhythm shown in the reference screenshots.
 * Each block has [ IMAGE ] on top, [ TITLE ] directly below, [ DESCRIPTION ] directly below title.
 */
const FEATURE_ROWS = [
  // ROW 1: Launch mini-site (Left) + Drag-and-drop (Right)
  {
    id: 'row-1',
    left: {
      id: 'feature-1',
      title: 'Launch mini-site in minutes',
      description:
        'Forget about 80% unnecessary features in complex website builders. Focus on your needs, get your site up and running with a domain in just a few simple clicks.',
      image: '/assets/features/launch-mini-site.png',
      width: 1086,
      height: 1448,
      alt: 'Alia storefront - Launch mini-site in minutes',
      colSpan: 'lg:col-span-5',
    },
    right: {
      id: 'feature-2',
      title: 'Drag-and-drop your brand into place',
      description:
        'Effortlessly customize your branded mini site by simply dragging and dropping elements.',
      image: '/assets/features/drag-and-drop.png',
      width: 1446,
      height: 1928,
      alt: 'Site Editor - Drag-and-drop your brand into place',
      colSpan: 'lg:col-span-7',
    },
  },
  // ROW 2: Stunning pre-made (Left, Narrower) + Sell digital product (Right, Wider)
  {
    id: 'row-2',
    left: {
      id: 'feature-3',
      title: 'Stunning pre-made',
      description:
        'Pick and publish. no coding and design skills needed. (or add your own seasoning.)',
      image: '/assets/features/stunning-premade.png',
      width: 691,
      height: 921,
      alt: 'Storefront Presets - Stunning pre-made',
      colSpan: 'lg:col-span-4',
    },
    right: {
      id: 'feature-4',
      title: 'Sell digital product with built-in checkout',
      description:
        'Create a digital product with a payment link in just minutes and get paid out to your Stripe or Paypal. 0% transaction Fees.',
      image: '/assets/features/sell-digital-product.png',
      width: 1446,
      height: 1084,
      alt: 'Paris digital art collection - Sell digital product with built-in checkout',
      colSpan: 'lg:col-span-8',
    },
  },
  // ROW 3: All contents in one (Left, Wide) + Curated blocks (Right, Narrow)
  {
    id: 'row-3',
    left: {
      id: 'feature-5',
      title: 'All contents in one, all devices supported',
      description:
        'Build one that scales automatically for all platforms, ensuring no interruptions.',
      image: '/assets/features/all-devices.png',
      width: 1446,
      height: 813,
      alt: 'All devices supported - All contents in one',
      colSpan: 'lg:col-span-8',
    },
    right: {
      id: 'feature-6',
      title: 'curated blocks',
      description:
        'add some excitement with a handpicked visual preset.',
      image: '/assets/features/curated-blocks.png',
      width: 691,
      height: 921,
      alt: 'Curated Blocks - Visual presets',
      colSpan: 'lg:col-span-4',
    },
  },
  // ROW 4: Own your audience (Left) + Monetize performance (Right)
  {
    id: 'row-4',
    left: {
      id: 'feature-7',
      title: 'Own your audience',
      description:
        'Build a subscriber list from all channels and monetize it.',
      image: '/assets/features/own-your-audience.png',
      width: 691,
      height: 691,
      alt: 'Own your audience - Subscriber list and email monetization',
      colSpan: 'lg:col-span-5',
    },
    right: {
      id: 'feature-8',
      title: 'Monetize performance',
      description:
        'Grasp how your visitors interacted with your site.',
      image: '/assets/features/monetize-performance.png',
      width: 1446,
      height: 813,
      alt: 'Monetize performance - Visitor interaction and analytics dashboard',
      colSpan: 'lg:col-span-7',
    },
  },
]

/**
 * EditorialFeatureCard Component
 * Displays [ IMAGE ] on top, [ TITLE ] directly below, and [ DESCRIPTION ] directly below title.
 */
function EditorialFeatureCard({ feature, prefersReducedMotion }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: prefersReducedMotion ? 0 : 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: prefersReducedMotion ? 0.2 : 0.65, ease: [0.22, 1, 0.36, 1] }}
      className={`w-full flex flex-col ${feature.colSpan}`}
    >
      {/* Visual Image Container with Generous Rounded Corners */}
      <div className="w-full rounded-[24px] sm:rounded-[28px] lg:rounded-[32px] overflow-hidden bg-black select-none">
        <Image
          src={feature.image}
          alt={feature.alt}
          width={feature.width}
          height={feature.height}
          className="w-full h-auto block object-contain"
          loading="lazy"
        />
      </div>

      {/* Title Directly Underneath Image */}
      <h3 className="text-2xl sm:text-3xl lg:text-[32px] xl:text-[34px] font-normal sm:font-medium tracking-tight text-[#0A0A0A] leading-snug mt-5 sm:mt-6">
        {feature.title}
      </h3>

      {/* Description Directly Underneath Title */}
      <p className="text-base sm:text-lg text-[#666666] font-normal leading-relaxed mt-2.5 max-w-xl">
        {feature.description}
      </p>
    </motion.div>
  )
}

export default function EditorialFeatureShowcase() {
  const prefersReducedMotion = useReducedMotion()

  return (
    <div id="features" className="w-full bg-white select-none scroll-mt-16">
      {/* 1. SCROLL-DRIVEN PIXELATED TRANSITION (Black to White) */}
      <PixelatedTransition />

      {/* 2. EDITORIAL FEATURES CONTAINER */}
      <section className="relative w-full bg-white text-[#0A0A0A] pt-16 sm:pt-24 lg:pt-28 pb-28 sm:pb-36 lg:pb-44">
        <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8">
          
          {/* =========================================================================
              TOP INTRO: "a magic cookbook" / "more than link-in-bio"
             ========================================================================= */}
          <div className="text-center max-w-3xl mx-auto mb-20 sm:mb-28 lg:mb-36 space-y-3 sm:space-y-4">
            <motion.h2
              initial={{ opacity: 0, y: prefersReducedMotion ? 0 : 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: prefersReducedMotion ? 0.2 : 0.6, ease: [0.22, 1, 0.36, 1] }}
              className="font-hero-serif text-4xl sm:text-5xl lg:text-[62px] font-normal italic text-[#000000] tracking-tight leading-tight"
            >
              a magic cookbook
            </motion.h2>

            <motion.h3
              initial={{ opacity: 0, y: prefersReducedMotion ? 0 : 25 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: prefersReducedMotion ? 0.2 : 0.65, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
              className="text-3xl sm:text-4xl lg:text-[54px] font-normal text-[#000000] tracking-tight leading-tight"
            >
              more than link-in-bio
            </motion.h3>

            <motion.p
              initial={{ opacity: 0, y: prefersReducedMotion ? 0 : 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: prefersReducedMotion ? 0.2 : 0.6, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
              className="text-base sm:text-lg text-[#666666] font-normal leading-relaxed max-w-2xl mx-auto pt-4"
            >
              alike gives you a better online presence — whether you're sharing links, content and eventually selling your products in minutes.
            </motion.p>

            <motion.p
              initial={{ opacity: 0, y: prefersReducedMotion ? 0 : 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: prefersReducedMotion ? 0.2 : 0.5, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
              className="text-xs sm:text-sm text-[#888888] font-normal pt-1"
            >
              not for everyone, but creators who want...
            </motion.p>
          </div>

          {/* =========================================================================
              EDITORIAL MASONRY GRID (Data-Driven Rows with [IMAGE] -> [TITLE] -> [DESC])
             ========================================================================= */}
          <div className="space-y-20 sm:space-y-28 lg:space-y-36">
            {FEATURE_ROWS.map((row) => (
              <div
                key={row.id}
                className="grid grid-cols-1 lg:grid-cols-12 gap-x-8 sm:gap-x-10 lg:gap-x-12 gap-y-12 sm:gap-y-16 items-start"
              >
                {/* Left Feature Block */}
                <EditorialFeatureCard
                  feature={row.left}
                  prefersReducedMotion={prefersReducedMotion}
                />

                {/* Right Feature Block */}
                <EditorialFeatureCard
                  feature={row.right}
                  prefersReducedMotion={prefersReducedMotion}
                />
              </div>
            ))}
          </div>

        </div>
      </section>
    </div>
  )
}
