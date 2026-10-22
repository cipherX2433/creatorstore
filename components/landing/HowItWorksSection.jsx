'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { motion, useReducedMotion } from 'framer-motion'
import {
  ArrowRight,
  Sparkles,
  Copy,
  Check,
  BarChart3,
  Instagram,
  Youtube,
  Layers,
  ArrowUpRight
} from 'lucide-react'
import { themeColors } from '@/config/theme'

// Step cards configuration following Reference Image #2
const STEP_CARDS = [
  {
    step: '01',
    title: 'CREATE YOUR STORE',
    description: 'Sign up, customize your storefront, and add your profile, links, and products.',
    bgColor: '#FF4B1F',
    textColor: '#FFFFFF',
    descColor: 'rgba(255, 255, 255, 0.88)',
    badgeColor: 'rgba(255, 255, 255, 0.25)',
    arrowColor: '#FFFFFF',
    href: '/signup',
  },
  {
    step: '02',
    title: 'ADD YOUR PRODUCTS',
    description: 'Upload digital products, templates, resources, or set up your creator offerings.',
    bgColor: themeColors.neonAccent || '#A8FF2A',
    textColor: '#0D0D0D',
    descColor: '#17220B',
    badgeColor: 'rgba(0, 0, 0, 0.18)',
    arrowColor: '#0D0D0D',
    href: '/signup',
  },
  {
    step: '03',
    title: 'SHARE & START EARNING',
    description: 'Share your store with your audience and let CreatorStore handle payments, delivery, and access.',
    bgColor: '#F5F5F5',
    textColor: '#0D0D0D',
    descColor: '#4A4A4A',
    badgeColor: 'rgba(0, 0, 0, 0.15)',
    arrowColor: '#0D0D0D',
    href: '/signup',
  },
]

export default function HowItWorksSection() {
  const prefersReducedMotion = useReducedMotion()
  const [copied, setCopied] = useState(false)

  const handleCopyUrl = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText('https://creatorstore.store/sarah')
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  // Animation variants
  const fadeIn = {
    hidden: { opacity: 0, y: prefersReducedMotion ? 0 : 20 },
    visible: (custom = 0) => ({
      opacity: 1,
      y: 0,
      transition: {
        duration: prefersReducedMotion ? 0.2 : 0.6,
        delay: prefersReducedMotion ? 0 : custom * 0.1,
        ease: [0.22, 1, 0.36, 1],
      },
    }),
  }

  const cardVariant = {
    hidden: {
      opacity: 0,
      y: prefersReducedMotion ? 0 : 35,
      scale: prefersReducedMotion ? 1 : 0.96,
    },
    visible: (custom = 0) => ({
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        duration: prefersReducedMotion ? 0.2 : 0.55,
        delay: prefersReducedMotion ? 0 : custom * 0.12,
        ease: [0.22, 1, 0.36, 1],
      },
    }),
  }

  return (
    <section
      id="how-it-works"
      className="relative w-full bg-[#232323] text-[#F5F5F5] py-20 sm:py-28 lg:py-36 overflow-hidden select-none border-t border-white/10 scroll-mt-16"
      style={{
        backgroundImage: `
          linear-gradient(to right, rgba(255, 255, 255, 0.025) 1px, transparent 1px),
          linear-gradient(to bottom, rgba(255, 255, 255, 0.025) 1px, transparent 1px)
        `,
        backgroundSize: '64px 64px',
      }}
    >
      <div className="relative z-10 max-w-[1380px] mx-auto px-4 sm:px-6 lg:px-8 space-y-16 sm:space-y-24">

        {/* =========================================================================
            TOP ROW: Editorial Headline (Left) & Asymmetric Creator UI Visual (Right)
           ========================================================================= */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-14 items-center">

          {/* LEFT: Editorial Typography Stack */}
          <div className="lg:col-span-6 space-y-6">
            
            {/* Small Eyebrow */}
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-50px' }}
              custom={0}
              variants={fadeIn}
              className="flex items-center gap-3 text-xs sm:text-sm font-mono tracking-widest text-[#A3A3A3] uppercase"
            >
              <span>HOW IT WORKS —</span>
              <span className="w-8 h-px bg-[#404040]" />
            </motion.div>

            {/* Giant Editorial Headline */}
            <div className="space-y-1">
              <motion.h2
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: '-50px' }}
                custom={1}
                variants={fadeIn}
                className="text-4xl sm:text-6xl md:text-7xl lg:text-[72px] font-black tracking-tight leading-[0.96] text-white uppercase"
              >
                LAUNCH YOUR
              </motion.h2>

              <motion.h2
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: '-50px' }}
                custom={2}
                variants={fadeIn}
                className="text-4xl sm:text-6xl md:text-7xl lg:text-[72px] font-black tracking-tight leading-[0.96] text-[#FF4B1F] uppercase"
              >
                CREATOR STORE
              </motion.h2>

              <motion.h2
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: '-50px' }}
                custom={3}
                variants={fadeIn}
                className="text-4xl sm:text-6xl md:text-7xl lg:text-[72px] font-black tracking-tight leading-[0.96] text-white uppercase"
              >
                IN <span className="text-[#FF4B1F]">3</span> SIMPLE STEPS.
              </motion.h2>
            </div>

            {/* Supporting Paragraph */}
            <motion.p
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-50px' }}
              custom={4}
              variants={fadeIn}
              className="text-base sm:text-lg text-[#A3A3A3] max-w-xl font-normal leading-relaxed pt-2"
            >
              Create your storefront, add your products, connect your audience, and start selling from one place.
            </motion.p>

            {/* Action link & outlined circular arrow */}
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-50px' }}
              custom={5}
              variants={fadeIn}
              className="pt-2 flex items-center gap-4"
            >
              <Link
                href="/signup"
                className="inline-flex items-center gap-3 group text-sm sm:text-base font-bold text-white hover:text-[#FF4B1F] transition-colors cursor-pointer"
              >
                <span>Get started in minutes</span>
                <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full border border-white/20 group-hover:border-[#FF4B1F] bg-[#1A1A1A] group-hover:bg-[#252525] flex items-center justify-center transition-all">
                  <ArrowRight className="w-4 h-4 text-white group-hover:text-[#FF4B1F] transition-transform group-hover:translate-x-1" />
                </div>
              </Link>
            </motion.div>

          </div>

          {/* RIGHT: Asymmetric Product & Creator UI Composition (Reference Image #1) */}
          <div className="lg:col-span-6 relative flex items-center justify-center py-4 lg:py-6">
            <div className="relative w-full max-w-[540px]">

              {/* Decorative Lightning Doodle (Electric Orange top right) */}
              <div className="absolute -top-6 right-8 sm:right-16 z-30 pointer-events-none text-[#FF4B1F] opacity-90 animate-pulse">
                <svg width="42" height="48" viewBox="0 0 42 48" fill="none">
                  <path
                    d="M18 2L4 26H22L16 46L38 18H22L28 2H18Z"
                    stroke="#FF4B1F"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>

              {/* Dashed connector path from floating card to live store */}
              <svg
                className="absolute inset-0 w-full h-full pointer-events-none z-20 hidden sm:block opacity-40"
                viewBox="0 0 540 400"
                fill="none"
              >
                <path
                  d="M180 120 C 320 80, 420 120, 440 210"
                  stroke="#FFFFFF"
                  strokeWidth="1.5"
                  strokeDasharray="4 6"
                />
                <circle cx="440" cy="210" r="3" fill="#FF4B1F" />
              </svg>

              {/* Main Creator Photo Frame */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
                className="relative rounded-[28px] sm:rounded-[34px] overflow-hidden border border-white/10 bg-[#1A1A1A] shadow-[0_25px_60px_rgba(0,0,0,0.8)]"
              >
                {/* Creator Photo */}
                <div className="relative aspect-[16/11] sm:aspect-[16/10] w-full overflow-hidden">
                  <img
                    src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=900&auto=format&fit=crop&q=80"
                    alt="Creator launching storefront on laptop"
                    className="w-full h-full object-cover object-top filter brightness-[0.92] contrast-[1.05]"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#141414]/90 via-transparent to-black/20" />
                </div>
              </motion.div>

              {/* FLOATING CARD 1: "Creator Growth Blueprint - Add Product" (Top Left, Tilted) */}
              <motion.div
                initial={{ opacity: 0, x: -30, y: -20, rotate: -4 }}
                whileInView={{ opacity: 1, x: 0, y: 0, rotate: -3 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: 0.7, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
                whileHover={{ rotate: 0, scale: 1.03 }}
                className="absolute -top-6 -left-3 sm:-left-6 z-30 w-[240px] sm:w-[260px] bg-white text-[#0D0D0D] rounded-2xl p-3.5 sm:p-4 shadow-[0_20px_45px_rgba(0,0,0,0.6)] border border-white/80 select-none cursor-pointer"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-[#FF4B1F] text-white flex items-center justify-center shrink-0 shadow-xs">
                    <BarChart3 className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="text-xs font-bold text-[#0D0D0D] leading-tight truncate">
                      Creator Growth Blueprint
                    </h4>
                    <p className="text-[11px] font-mono font-bold text-[#FF4B1F] mt-0.5">
                      ₹499
                    </p>
                  </div>
                </div>

                <div className="w-full h-8 rounded-lg bg-[#FF4B1F] hover:bg-[#FF6238] text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs transition-colors">
                  <span>Add Product</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </motion.div>

              {/* FLOATING CARD 2: "Your Store is Live" (Bottom Right, Tilted) */}
              <motion.div
                initial={{ opacity: 0, x: 30, y: 30, rotate: 3 }}
                whileInView={{ opacity: 1, x: 0, y: 0, rotate: 2 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: 0.7, delay: 0.25, ease: [0.22, 1, 0.36, 1] }}
                whileHover={{ rotate: 0, scale: 1.03 }}
                className="absolute -bottom-6 -right-2 sm:-right-6 z-30 w-[260px] sm:w-[290px] bg-[#161616] text-white rounded-2xl p-3.5 sm:p-4 shadow-[0_25px_50px_rgba(0,0,0,0.7)] border border-white/15 select-none"
              >
                {/* Live Store Pill */}
                <div className="flex items-center justify-between mb-2.5">
                  <div className="inline-flex items-center gap-1.5 text-[11px] font-bold text-white">
                    <span className="w-2 h-2 rounded-full bg-[#22C55E] animate-pulse" />
                    <span>Your Store is Live</span>
                    <span>🎉</span>
                  </div>
                </div>

                {/* Store URL Box */}
                <div className="w-full bg-[#242424] rounded-lg px-2.5 py-1.5 flex items-center justify-between gap-2 border border-white/10 text-xs font-mono mb-2.5">
                  <span className="text-[#A3A3A3] truncate text-[11px]">
                    creatorstore.store/yourname
                  </span>
                  <button
                    onClick={handleCopyUrl}
                    aria-label="Copy store link"
                    className="text-[#A3A3A3] hover:text-white transition-colors cursor-pointer shrink-0"
                  >
                    {copied ? (
                      <Check className="w-3.5 h-3.5 text-[#22C55E]" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>

                {/* Social Channel Icons */}
                <div className="flex items-center justify-center gap-2 pt-1 border-t border-white/10 text-[#A3A3A3]">
                  <div className="w-6 h-6 rounded-full bg-[#2A2A2A] flex items-center justify-center text-xs hover:text-white transition-colors">
                    <Instagram className="w-3.5 h-3.5 text-[#E4405F]" />
                  </div>
                  <div className="w-6 h-6 rounded-full bg-[#2A2A2A] flex items-center justify-center text-xs hover:text-white transition-colors">
                    <Youtube className="w-3.5 h-3.5 text-[#FF0000]" />
                  </div>
                  <div className="w-6 h-6 rounded-full bg-[#2A2A2A] flex items-center justify-center text-[10px] font-bold text-white hover:text-white transition-colors">
                    <span>TT</span>
                  </div>
                  <div className="w-6 h-6 rounded-full bg-[#2A2A2A] flex items-center justify-center text-xs text-white hover:text-white transition-colors">
                    <span>𝕏</span>
                  </div>
                </div>
              </motion.div>

            </div>
          </div>

        </div>

        {/* =========================================================================
            BOTTOM STEP CARDS: Shaped Colorful Angular Cards (Reference Image #2)
           ========================================================================= */}
        <div className="pt-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 items-stretch">
            {STEP_CARDS.map((card, idx) => (
              <motion.div
                key={card.step}
                custom={idx}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: '-40px' }}
                variants={cardVariant}
                whileHover={prefersReducedMotion ? {} : { y: -5 }}
                className="group relative flex flex-col cursor-pointer"
              >
                {/* 
                  The shaped card uses a precise geometric polygon clip-path matching Reference Image #2:
                  - Flat top edge
                  - Angular notched V-cut into the right edge
                  - Flat bottom edge
                  - Angular notched V-cut into the left edge
                */}
                <div
                  className="relative w-full h-full min-h-[220px] sm:min-h-[240px] flex flex-col justify-between px-7 sm:px-9 py-7 sm:py-8 transition-transform duration-300 shadow-xl"
                  style={{
                    backgroundColor: card.bgColor,
                    color: card.textColor,
                    clipPath: `polygon(
                      0% 0%,
                      100% 0%,
                      100% calc(50% - 24px),
                      calc(100% - 18px) 50%,
                      100% calc(50% + 24px),
                      100% 100%,
                      0% 100%,
                      0% calc(50% + 24px),
                      18px 50%,
                      0% calc(50% - 24px)
                    )`,
                  }}
                >
                  {/* Top Row: Large Step Number */}
                  <div className="flex items-center justify-between">
                    <span
                      className="font-mono font-black text-2xl sm:text-3xl tracking-tight opacity-90"
                      style={{ color: card.textColor }}
                    >
                      {card.step}
                    </span>
                  </div>

                  {/* Middle Content: Title & Description */}
                  <div className="my-auto py-3 space-y-2">
                    <h3
                      className="font-black text-xl sm:text-2xl tracking-tight uppercase leading-snug"
                      style={{ color: card.textColor }}
                    >
                      {card.title}
                    </h3>
                    <p
                      className="text-xs sm:text-sm font-medium leading-relaxed max-w-[280px]"
                      style={{ color: card.descColor }}
                    >
                      {card.description}
                    </p>
                  </div>

                  {/* Bottom Row: Integrated Arrow Icon at lower right */}
                  <div className="flex items-center justify-end pt-2">
                    <div
                      className="w-10 h-10 flex items-center justify-center transition-transform duration-300 group-hover:translate-x-1.5"
                      style={{ color: card.arrowColor }}
                    >
                      <ArrowRight className="w-6 h-6 stroke-[2.6]" />
                    </div>
                  </div>

                </div>
              </motion.div>
            ))}
          </div>
        </div>

      </div>
    </section>
  )
}
