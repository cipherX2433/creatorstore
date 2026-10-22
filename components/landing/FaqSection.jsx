'use client'

import { useState } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import {
  MessageSquare,
  BookOpen,
  ArrowRight,
  ChevronDown
} from 'lucide-react'

const FAQ_ITEMS = [
  {
    id: '01',
    question: 'What is CreatorStore?',
    answer:
      'CreatorStore is an all-in-one commerce and automation platform for creators. It lets you create your personal storefront, sell digital downloads and services, share links, collect leads, and automate Instagram direct messages — all without any technical skills.',
  },
  {
    id: '02',
    question: 'How does pricing work?',
    answer:
      'CreatorStore offers two straightforward plans: Creator (₹499/mo) and Pro (₹999/mo), with 20% savings on annual billing. CreatorStore charges 0% platform transaction fees on all paid plans, meaning you keep 100% of what you earn.',
  },
  {
    id: '03',
    question: 'What kind of products can I sell?',
    answer:
      'You can sell digital downloads (PDF guides, Notion templates, presets, ebooks), product bundles, custom services, and 1:1 coaching sessions with automated calendar scheduling.',
  },
  {
    id: '04',
    question: 'How do payments and payouts work?',
    answer:
      'Payments are processed securely via Dodo Payments (supporting UPI, credit/debit cards, Apple Pay, and Google Pay for India and international buyers). Earnings settle on standard processing schedules with zero artificial holds.',
  },
  {
    id: '05',
    question: 'How does Instagram automation work?',
    answer:
      'CreatorStore connects via direct Instagram account authorization. When followers comment on your Reels or posts with your configured trigger keyword (e.g., "GUIDE"), CreatorStore Delivery Guard paces and sends your product link straight to their DMs within safe rate limits.',
  },
  {
    id: '06',
    question: 'Is there a free trial?',
    answer:
      'Yes! You can explore the platform and set up your store for free. We offer a full-access trial so you can configure your storefront, upload products, and test live AutoDM workflows before activating your plan.',
  },
  {
    id: '07',
    question: 'What happens after my trial ends?',
    answer:
      'When your trial concludes, simply choose the Creator or Pro plan to keep your storefront published and your Instagram automations active. You retain permanent ownership of all your product files, orders, and customer lists.',
  },
  {
    id: '08',
    question: 'How does automated product delivery work?',
    answer:
      'Upon successful payment, CreatorStore instantly provides the customer with an encrypted, authenticated download link on the checkout confirmation screen and automatically delivers a digital receipt with the access link via email.',
  },
]

export default function FaqSection() {
  const prefersReducedMotion = useReducedMotion()
  const [openIdx, setOpenIdx] = useState(0) // 01 open by default per specification

  const toggleFaq = (idx) => {
    setOpenIdx((prev) => (prev === idx ? null : idx))
  }

  // Notched / Chamfered polygon for technical editorial feel matching reference
  const notchedClipPath =
    'polygon(12px 0%, calc(100% - 12px) 0%, 100% 12px, 100% calc(100% - 12px), calc(100% - 12px) 100%, 12px 100%, 0% calc(100% - 12px), 8px 50%, 0% 12px)'

  return (
    <section
      id="faq"
      className="w-full bg-[#232323] text-[#F5F5F5] py-20 sm:py-28 lg:py-32 px-4 sm:px-6 lg:px-8 border-t border-white/10 relative overflow-hidden select-none"
    >
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 items-start">

          {/* ========================================================== */}
          {/* LEFT COLUMN: Eyebrow + Large Heading + Subtext + 2 CTA Cards */}
          {/* ========================================================== */}
          <div className="lg:col-span-5 space-y-6 sm:space-y-8 text-left">
            <motion.div
              initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.5 }}
              className="space-y-4"
            >
              <div className="font-mono text-xs font-bold text-[#A3A3A3] tracking-widest uppercase">
                FAQ —
              </div>

              <h2 className="text-4xl sm:text-5xl lg:text-[54px] font-black text-white tracking-tight leading-[1.06]">
                Got Questions?
                <br />
                We&apos;ve Got You
                <br />
                <span className="text-[#FF4B1F]">Covered.</span>
              </h2>

              <p className="text-sm sm:text-base text-[#A3A3A3] font-medium leading-relaxed max-w-md">
                Everything you need to know about CreatorStore, from getting started to payments, products and growth. Can&apos;t find what you&apos;re looking for? We&apos;re here to help.
              </p>
            </motion.div>

            {/* Support CTA Cards */}
            <div className="space-y-3.5 pt-2 max-w-md">

              {/* CARD 1: Still have questions? (Dark Notched Card) */}
              <motion.div
                initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ duration: 0.5, delay: 0.1 }}
                whileHover={prefersReducedMotion ? {} : { x: 3 }}
                className="group cursor-pointer"
              >
                <Link href="/contact" className="block">
                  <div
                    className="p-[1px] bg-white/15 hover:bg-white/30 transition-colors"
                    style={{ clipPath: notchedClipPath }}
                  >
                    <div
                      className="bg-[#141518] hover:bg-[#18191E] p-4 sm:p-5 flex items-center justify-between gap-4 transition-colors"
                      style={{ clipPath: notchedClipPath }}
                    >
                      <div className="flex items-center gap-3.5 min-w-0 pl-2">
                        <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-[#FF4B1F] shrink-0">
                          <MessageSquare className="w-5 h-5" />
                        </div>
                        <div className="text-left min-w-0">
                          <h4 className="text-sm sm:text-base font-bold text-white tracking-tight truncate">
                            Still have questions?
                          </h4>
                          <p className="text-xs text-[#A3A3A3] truncate">
                            Chat with our support team anytime.
                          </p>
                        </div>
                      </div>

                      <div className="w-8 h-8 rounded-full border border-white/10 flex items-center justify-center text-[#A3A3A3] group-hover:text-white group-hover:border-white/30 shrink-0 transition-colors">
                        <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.div>

              {/* CARD 2: Browse Help Center (CreatorStore Orange Notched Card) */}
              <motion.div
                initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ duration: 0.5, delay: 0.2 }}
                whileHover={prefersReducedMotion ? {} : { x: 3 }}
                className="group cursor-pointer"
              >
                <Link href="/help" className="block">
                  <div
                    className="p-[1px] bg-[#FF4B1F] shadow-[0_0_24px_rgba(255,75,31,0.25)] transition-shadow"
                    style={{ clipPath: notchedClipPath }}
                  >
                    <div
                      className="bg-[#FF4B1F] hover:bg-[#FF6238] p-4 sm:p-5 flex items-center justify-between gap-4 text-white transition-colors"
                      style={{ clipPath: notchedClipPath }}
                    >
                      <div className="flex items-center gap-3.5 min-w-0 pl-2">
                        <div className="w-10 h-10 rounded-xl bg-black/20 flex items-center justify-center text-white shrink-0">
                          <BookOpen className="w-5 h-5" />
                        </div>
                        <div className="text-left min-w-0">
                          <h4 className="text-sm sm:text-base font-bold text-white tracking-tight truncate">
                            Browse Help Center
                          </h4>
                          <p className="text-xs text-white/80 truncate">
                            Guides, tutorials and detailed docs.
                          </p>
                        </div>
                      </div>

                      <div className="w-8 h-8 rounded-full border border-white/30 flex items-center justify-center text-white shrink-0 transition-colors">
                        <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.div>

            </div>
          </div>

          {/* ========================================================== */}
          {/* RIGHT COLUMN: 8 Numbered Notched FAQ Accordion Rows */}
          {/* ========================================================== */}
          <div className="lg:col-span-7 space-y-2.5">
            {FAQ_ITEMS.map((item, idx) => {
              const isOpen = openIdx === idx

              return (
                <motion.div
                  key={item.id}
                  initial={prefersReducedMotion ? false : { opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-40px' }}
                  transition={{
                    duration: 0.45,
                    delay: prefersReducedMotion ? 0 : idx * 0.05,
                  }}
                  className="group"
                >
                  {/* Outer Notched Border Container */}
                  <div
                    className={`p-[1px] transition-colors duration-200 ${
                      isOpen
                        ? 'bg-[#FF4B1F]/50 shadow-[0_0_20px_rgba(255,75,31,0.08)]'
                        : 'bg-white/10 hover:bg-white/20'
                    }`}
                    style={{ clipPath: notchedClipPath }}
                  >
                    <div
                      className="bg-[#141518] p-4 sm:p-5 transition-colors"
                      style={{ clipPath: notchedClipPath }}
                    >
                      {/* Header Row (Clickable) */}
                      <button
                        type="button"
                        onClick={() => toggleFaq(idx)}
                        aria-expanded={isOpen}
                        className="w-full flex items-center justify-between gap-4 text-left cursor-pointer focus:outline-none pl-2"
                      >
                        <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
                          {/* Number in CreatorStore Orange */}
                          <span className="font-mono text-xs sm:text-sm font-bold text-[#FF4B1F] shrink-0">
                            {item.id}
                          </span>

                          {/* Subtle Divider Dash */}
                          <span className="font-mono text-xs text-white/25 shrink-0 select-none">
                            —
                          </span>

                          {/* Question Text in Bold White */}
                          <span className="font-bold text-sm sm:text-base text-white tracking-tight leading-snug">
                            {item.question}
                          </span>
                        </div>

                        {/* Circular Outline Chevron Button */}
                        <div
                          className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full border flex items-center justify-center shrink-0 transition-all duration-300 ${
                            isOpen
                              ? 'border-[#FF4B1F] text-[#FF4B1F] bg-[#FF4B1F]/10'
                              : 'border-white/20 text-[#A3A3A3] group-hover:border-white/40 group-hover:text-white'
                          }`}
                        >
                          <ChevronDown
                            className={`w-3.5 h-3.5 sm:w-4 sm:h-4 transition-transform duration-300 ${
                              isOpen ? 'rotate-180' : 'rotate-0'
                            }`}
                          />
                        </div>
                      </button>

                      {/* Smooth Collapsible Answer Reveal */}
                      <AnimatePresence initial={false}>
                        {isOpen && (
                          <motion.div
                            key="content"
                            initial={
                              prefersReducedMotion
                                ? { opacity: 1 }
                                : { opacity: 0, height: 0 }
                            }
                            animate={
                              prefersReducedMotion
                                ? { opacity: 1 }
                                : { opacity: 1, height: 'auto' }
                            }
                            exit={
                              prefersReducedMotion
                                ? { opacity: 0 }
                                : { opacity: 0, height: 0 }
                            }
                            transition={{ duration: 0.28, ease: 'easeOut' }}
                            className="overflow-hidden"
                          >
                            <div className="pt-3 sm:pt-4 pl-8 sm:pl-10 pr-2">
                              <p className="text-xs sm:text-sm text-[#A3A3A3] font-normal leading-relaxed border-t border-white/5 pt-3">
                                {item.answer}
                              </p>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </div>

        </div>
      </div>
    </section>
  )
}
