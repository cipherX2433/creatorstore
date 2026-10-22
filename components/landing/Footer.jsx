'use client'

import React from 'react'
import Link from 'next/link'
import { motion, useReducedMotion } from 'framer-motion'
import { ArrowRight, Heart, Instagram, Youtube, Linkedin } from 'lucide-react'
import { useAuth } from '@/components/auth/AuthContext'
import CreatorStoreBrand, { CREATORSTORE_DOTS } from '@/components/brand/CreatorStoreBrand'
import { trackSignupCtaClicked } from '@/lib/analytics'

export default function Footer({ showCta = true }) {
  const { isAuthenticated } = useAuth()
  const prefersReducedMotion = useReducedMotion()

  const ctaLink = isAuthenticated ? '/dashboard/store' : '/signup'

  // Animation variants
  const fadeInUp = {
    hidden: { opacity: 0, y: prefersReducedMotion ? 0 : 20 },
    visible: (custom = 0) => ({
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
        delay: prefersReducedMotion ? 0 : custom * 0.1,
        ease: [0.22, 1, 0.36, 1],
      },
    }),
  }

  return (
    <footer className="w-full bg-[#0D0D0D] text-[#A3A3A3] select-none overflow-x-hidden">
      {/* =========================================================================
          1. TOP CTA SECTION — FULL WIDTH BLUE PANEL WITH NOTCHED CUTOUTS
         ========================================================================= */}
      {showCta && (
        <section className="w-full bg-[#232323] px-4 sm:px-6 lg:px-8 py-16 sm:py-20 lg:py-24 border-t border-[#303030]">
          <div className="max-w-7xl mx-auto">
            {/* The CreatorStore-Orange Notched Container */}
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-60px' }}
              variants={fadeInUp}
              custom={0}
              className="relative w-full bg-[#FF4B1F] text-white p-8 sm:p-12 lg:p-16 shadow-[0_24px_64px_rgba(255,75,31,0.22)]"
              style={{
                clipPath:
                  'polygon(20px 0%, calc(50% - 24px) 0%, 50% 24px, calc(50% + 24px) 0%, calc(100% - 20px) 0%, 100% 20px, 100% calc(100% - 20px), calc(100% - 20px) 100%, calc(50% + 24px) 100%, 50% calc(100% - 24px), calc(50% - 24px) 100%, 20px 100%, 0% calc(100% - 20px), 0% 20px)',
              }}
            >
              {/* Decorative Brand Radiant / Emblem in Top Right */}
              <div
                className="absolute top-6 right-6 sm:top-8 sm:right-8 lg:top-10 lg:right-12 pointer-events-none select-none opacity-90 hidden sm:block"
                aria-hidden="true"
              >
                <svg
                  width="54"
                  height="40"
                  viewBox="0 0 54 40"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className="text-white fill-current"
                >
                  {/* Bottom horizontal base bar */}
                  <rect x="2" y="32" width="50" height="6.5" rx="1.5" />
                  {/* Center vertical beam */}
                  <rect x="23.75" y="4" width="6.5" height="22" rx="1.5" />
                  {/* Left diagonal beam */}
                  <rect
                    x="10.5"
                    y="11"
                    width="6.5"
                    height="19"
                    rx="1.5"
                    transform="rotate(-38 10.5 11)"
                  />
                  {/* Right diagonal beam */}
                  <rect
                    x="41.5"
                    y="7"
                    width="6.5"
                    height="19"
                    rx="1.5"
                    transform="rotate(38 41.5 7)"
                  />
                </svg>
              </div>

              {/* 2-Column Responsive Layout */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-14 items-center">
                {/* LEFT SIDE: Eyebrow + Large Editorial Headline */}
                <div className="lg:col-span-7 space-y-4 sm:space-y-6">
                  {/* Eyebrow */}
                  <motion.div
                    variants={fadeInUp}
                    custom={1}
                    className="text-xs sm:text-sm font-mono font-bold tracking-widest text-white/90 uppercase"
                  >
                    READY TO GET STARTED? —
                  </motion.div>

                  {/* Heading */}
                  <motion.h2
                    variants={fadeInUp}
                    custom={2}
                    className="text-4xl sm:text-5xl md:text-6xl lg:text-[72px] font-black text-white tracking-tight leading-[1.03]"
                  >
                    Launch Your
                    <br />
                    Creator Store
                    <br />
                    <span className="text-[#0D0D0D]">Today.</span>
                  </motion.h2>
                </div>

                {/* RIGHT SIDE: Supporting Copy + Pill Button */}
                <div className="lg:col-span-5 flex flex-col items-start lg:items-start space-y-6 sm:space-y-7">
                  <motion.p
                    variants={fadeInUp}
                    custom={3}
                    className="text-base sm:text-lg lg:text-[19px] text-white/95 font-medium leading-relaxed max-w-md"
                  >
                    Build your storefront, sell digital products and grow your audience with
                    CreatorStore — everything you need to launch and scale your business in one
                    place.
                  </motion.p>

                  <motion.div
                    variants={fadeInUp}
                    custom={4}
                    className="w-full sm:w-auto flex flex-col sm:flex-row items-start sm:items-center gap-4"
                  >
                    <Link
                      href={ctaLink}
                      onClick={() => trackSignupCtaClicked('footer')}
                      className="w-full sm:w-auto inline-flex items-center justify-center gap-3 px-8 sm:px-10 py-4 sm:py-4.5 rounded-full bg-white text-[#0D0D0D] font-extrabold text-base sm:text-lg hover:bg-[#F0F0F0] hover:-translate-y-0.5 active:translate-y-0 shadow-[0_12px_32px_rgba(0,0,0,0.22)] transition-all group cursor-pointer"
                    >
                      <span>Start My Trial</span>
                      <ArrowRight className="w-5 h-5 text-[#0D0D0D] transition-transform duration-200 group-hover:translate-x-1.5" />
                    </Link>
                  </motion.div>

                  <motion.div
                    variants={fadeInUp}
                    custom={5}
                    className="text-xs font-semibold text-white/85 tracking-wide"
                  >
                    Start free · 7-day Pro trial · No credit card required to explore
                  </motion.div>
                </div>
              </div>
            </motion.div>
          </div>
        </section>
      )}

      {/* =========================================================================
          2. MAIN FOOTER — FULL-WIDTH 5-COLUMN EDITORIAL SAAS LAYOUT (#0D0D0D)
         ========================================================================= */}
      <div className="w-full border-t border-[#303030] bg-[#0D0D0D] px-4 sm:px-6 lg:px-8 py-16 sm:py-20 lg:py-24">
        <div className="max-w-7xl mx-auto space-y-16">
          {/* 5-Column Grid */}
          <div className="grid grid-cols-2 md:grid-cols-12 gap-10 lg:gap-12 items-start">
            {/* COLUMN 1 — BRAND (Col span 4 on desktop) */}
            <div className="col-span-2 md:col-span-12 lg:col-span-4 space-y-4">
              <CreatorStoreBrand href="/" theme="dark" size="lg" />

              <p className="text-sm text-[#A3A3A3] leading-relaxed max-w-sm font-normal">
                The all-in-one platform for creators to build their storefront, sell digital
                products, automate their audience and grow their business.
              </p>
            </div>

            {/* COLUMN 2 — PRODUCT (Col span 2) */}
            <div className="col-span-1 md:col-span-3 lg:col-span-2 space-y-3.5 text-sm">
              <h4 className="font-bold text-white tracking-widest uppercase text-xs">
                Product
              </h4>
              <ul className="space-y-2.5 font-medium text-[#A3A3A3]">
                <li>
                  <Link href="/#features" className="hover:text-[#FF4B1F] transition-colors">
                    Features
                  </Link>
                </li>
                <li>
                  <Link href="/pricing" className="hover:text-[#FF4B1F] transition-colors">
                    Pricing
                  </Link>
                </li>
                <li>
                  <Link href="/compare" className="hover:text-[#FF4B1F] transition-colors">
                    Compare
                  </Link>
                </li>
                <li>
                  <Link href="/help" className="hover:text-[#FF4B1F] transition-colors">
                    Help Center
                  </Link>
                </li>
              </ul>
            </div>

            {/* COLUMN 3 — COMPANY (Col span 2) */}
            <div className="col-span-1 md:col-span-3 lg:col-span-2 space-y-3.5 text-sm">
              <h4 className="font-bold text-white tracking-widest uppercase text-xs">
                Company
              </h4>
              <ul className="space-y-2.5 font-medium text-[#A3A3A3]">
                <li>
                  <Link href="/safety" className="hover:text-[#FF4B1F] transition-colors">
                    About &amp; Safety
                  </Link>
                </li>
                <li>
                  <Link href="/contact" className="hover:text-[#FF4B1F] transition-colors">
                    Contact
                  </Link>
                </li>
                <li>
                  <Link href="/pricing" className="hover:text-[#FF4B1F] transition-colors">
                    Plans &amp; Pricing
                  </Link>
                </li>
                <li>
                  <Link href="/login" className="hover:text-[#FF4B1F] transition-colors">
                    Creator Login
                  </Link>
                </li>
              </ul>
            </div>

            {/* COLUMN 4 — LEGAL (Col span 2) */}
            <div className="col-span-1 md:col-span-3 lg:col-span-2 space-y-3.5 text-sm">
              <h4 className="font-bold text-white tracking-widest uppercase text-xs">
                Legal
              </h4>
              <ul className="space-y-2.5 font-medium text-[#A3A3A3]">
                <li>
                  <Link href="/terms" className="hover:text-[#FF4B1F] transition-colors">
                    Terms of Service
                  </Link>
                </li>
                <li>
                  <Link href="/privacy" className="hover:text-[#FF4B1F] transition-colors">
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link href="/refund" className="hover:text-[#FF4B1F] transition-colors">
                    Refund Policy
                  </Link>
                </li>
                <li>
                  <Link href="/shipping" className="hover:text-[#FF4B1F] transition-colors">
                    Delivery Policy
                  </Link>
                </li>
                <li>
                  <Link href="/data-deletion" className="hover:text-[#FF4B1F] transition-colors">
                    Data Deletion
                  </Link>
                </li>
              </ul>
            </div>

            {/* COLUMN 5 — FOLLOW US / SOCIAL (Col span 2) */}
            <div className="col-span-1 md:col-span-3 lg:col-span-2 space-y-3.5 text-sm">
              <h4 className="font-bold text-white tracking-widest uppercase text-xs">
                Follow Us
              </h4>

              {/* Social Icon Buttons Row */}
              <div className="flex items-center gap-2.5 pt-1">
                {/* Instagram */}
                <a
                  href="https://instagram.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Instagram"
                  className="w-9 h-9 rounded-lg bg-[#181818] border border-[#303030] hover:border-[#FF4B1F] hover:text-[#FF4B1F] text-[#F5F5F5] flex items-center justify-center transition-all duration-200"
                >
                  <Instagram className="w-4 h-4" />
                </a>

                {/* YouTube */}
                <a
                  href="https://youtube.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="YouTube"
                  className="w-9 h-9 rounded-lg bg-[#181818] border border-[#303030] hover:border-[#FF4B1F] hover:text-[#FF4B1F] text-[#F5F5F5] flex items-center justify-center transition-all duration-200"
                >
                  <Youtube className="w-4 h-4" />
                </a>

                {/* X / Twitter */}
                <a
                  href="https://x.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="X (Twitter)"
                  className="w-9 h-9 rounded-lg bg-[#181818] border border-[#303030] hover:border-[#FF4B1F] hover:text-[#FF4B1F] text-[#F5F5F5] flex items-center justify-center transition-all duration-200"
                >
                  <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                  </svg>
                </a>

                {/* LinkedIn */}
                <a
                  href="https://linkedin.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="LinkedIn"
                  className="w-9 h-9 rounded-lg bg-[#181818] border border-[#303030] hover:border-[#FF4B1F] hover:text-[#FF4B1F] text-[#F5F5F5] flex items-center justify-center transition-all duration-200"
                >
                  <Linkedin className="w-4 h-4" />
                </a>
              </div>

              <p className="text-xs text-[#808080] font-normal leading-normal pt-1">
                Get product updates, creator tips and growth resources.
              </p>
            </div>
          </div>

          {/* =========================================================================
              3. GIANT EDITORIAL FOOTER BRANDING — "creator ❖ store"
                 Subtle translucent grey text effect inspired by reference
             ========================================================================= */}
          <div className="w-full pt-10 sm:pt-14 lg:pt-20 pb-8 sm:pb-12 lg:pb-16 border-t border-[#303030]/60 overflow-hidden select-none">
            <div className="w-full flex items-center justify-center text-center">
              <span
                className="font-hero-serif italic tracking-tighter leading-none inline-flex items-center justify-center flex-nowrap whitespace-nowrap text-[12.5vw] sm:text-[13vw] md:text-[13.5vw] lg:text-[150px] xl:text-[185px] 2xl:text-[220px] bg-gradient-to-b from-[#A3A3A3]/30 via-[#A3A3A3]/16 to-[#A3A3A3]/05 bg-clip-text text-transparent hover:from-[#F5F5F5]/45 hover:via-[#A3A3A3]/28 hover:to-[#A3A3A3]/10 transition-all duration-700 cursor-default"
                style={{
                  fontFamily: "'Instrument Serif', Georgia, 'Times New Roman', serif",
                  fontStyle: 'italic',
                }}
                aria-label="CreatorStore"
              >
                <span>creator</span>
                <span className="inline-flex items-center justify-center mx-[0.16em] text-[0.42em] leading-none text-[#A3A3A3]/30 hover:text-[#FF4B1F]/45 transition-colors duration-500 transform -translate-y-[0.06em]">
                  <svg viewBox="0 0 100 100" className="w-[1em] h-[1em] fill-current">
                    {CREATORSTORE_DOTS.map((dot) => (
                      <circle key={dot.key} cx={dot.cx} cy={dot.cy} r={dot.r} />
                    ))}
                  </svg>
                </span>
                <span>store</span>
              </span>
            </div>
          </div>

          {/* Bottom Divider & Copyright Row */}
          <div className="pt-6 sm:pt-8 border-t border-[#303030]/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-semibold text-[#808080]">
            <p className="flex items-center gap-1.5 flex-wrap justify-center sm:justify-start">
              <span>© {new Date().getFullYear()} CreatorStore. All rights reserved.</span>
              <span className="hidden sm:inline text-[#505050]">•</span>
              <span className="inline-flex items-center gap-1">
                <span>Coded with love for creators</span>
                <Heart className="w-3.5 h-3.5 inline fill-[#FF4B1F] text-[#FF4B1F]" />
              </span>
            </p>

            <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 text-xs text-[#808080]">
              <Link href="/terms" className="hover:text-[#FF4B1F] transition-colors">
                Terms of Service
              </Link>
              <Link href="/privacy" className="hover:text-[#FF4B1F] transition-colors">
                Privacy
              </Link>
              <Link href="/refund" className="hover:text-[#FF4B1F] transition-colors">
                Refund Policy
              </Link>
              <Link href="/shipping" className="hover:text-[#FF4B1F] transition-colors">
                Delivery
              </Link>
              <Link href="/contact" className="hover:text-[#FF4B1F] transition-colors">
                Support
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
