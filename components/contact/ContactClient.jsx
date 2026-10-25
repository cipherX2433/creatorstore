'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  Mail,
  Clock,
  ShieldCheck,
  Check,
  Copy,
  ArrowRight,
  ArrowUpRight,
  CreditCard,
  LifeBuoy,
  Lock,
  MessageSquare,
  BookOpen,
} from 'lucide-react'
import HelpCenterHeader from '@/components/help/HelpCenterHeader'
import HelpBreadcrumbs from '@/components/help/HelpBreadcrumbs'
import HelpFooter from '@/components/help/HelpFooter'
import { SUPPORT_EMAIL } from '@/config/site'

const INQUIRY_OPTIONS = [
  {
    id: 'billing',
    title: 'Billing & Subscriptions',
    description: 'Plan upgrades, invoices, and payment queries.',
    icon: CreditCard,
    subject: 'CreatorStore Billing & Subscription Inquiry',
  },
  {
    id: 'tech-support',
    title: 'Technical Support',
    description: 'Storefront setup, products, or Instagram AutoDM.',
    icon: LifeBuoy,
    subject: 'CreatorStore Technical Support',
  },
  {
    id: 'privacy',
    title: 'Privacy & Data Deletion',
    description: 'Data deletion and account privacy requests.',
    icon: Lock,
    subject: 'CreatorStore Privacy or Data Request',
  },
  {
    id: 'general',
    title: 'General Inquiries',
    description: 'Partnerships, verification, and feedback.',
    icon: MessageSquare,
    subject: 'CreatorStore General Inquiry',
  },
]

export default function ContactClient() {
  const [copied, setCopied] = useState(false)

  const handleCopyEmail = async () => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(SUPPORT_EMAIL)
        setCopied(true)
        setTimeout(() => setCopied(false), 2200)
      }
    } catch (err) {
      console.error('Failed to copy email to clipboard', err)
    }
  }

  return (
    <div className="min-h-screen bg-[#F3F3F0] text-[#202432] selection:bg-[#D8F21F] selection:text-black font-sans antialiased flex flex-col justify-between">
      <div>
        {/* Navigation Header consistent with /help */}
        <HelpCenterHeader />

        <main className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 sm:pt-8 pb-16 sm:pb-20">
          {/* Breadcrumb Navigation */}
          <HelpBreadcrumbs items={[{ label: 'Contact Support' }]} />

          {/* Page Introduction: Centered, constrained, matching /help */}
          <header className="text-center max-w-2xl mx-auto mt-4 sm:mt-6 mb-12 sm:mb-14 space-y-4">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#EBC1EB]/50 text-[#5B347C] border border-[#EBC1EB]">
              <Mail className="w-3.5 h-3.5 stroke-[2.2]" />
              <span>Contact &amp; Support</span>
            </div>

            <h1
              className="text-3xl sm:text-4xl md:text-5xl font-black text-[#202432] tracking-tight"
              style={{ fontFamily: "'Plus Jakarta Sans', var(--font-brand), sans-serif" }}
            >
              Contact CreatorStore
            </h1>

            <p className="text-base sm:text-lg text-[#777A83] font-normal leading-relaxed">
              Have questions, need help, or want to report an issue? We&apos;re here to help. Reach out to our team directly.
            </p>
          </header>

          {/* Main 2-Column Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-stretch">
            {/* Card 1 — Email Support */}
            <section
              aria-labelledby="email-support-heading"
              className="lg:col-span-5 bg-white rounded-[24px] sm:rounded-[28px] p-6 sm:p-8 border border-[#E2E3DD] shadow-sm flex flex-col justify-between space-y-6"
            >
              <div className="space-y-5">
                {/* Lavender Icon Badge */}
                <div className="w-12 h-12 rounded-2xl bg-[#EBC1EB]/60 text-[#5B347C] flex items-center justify-center">
                  <Mail className="w-6 h-6 stroke-[1.8]" />
                </div>

                <div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-[#777A83]">
                    Official Support Channel
                  </span>
                  <h2
                    id="email-support-heading"
                    className="text-xl sm:text-2xl font-bold text-[#202432] mt-1 tracking-tight"
                    style={{ fontFamily: "'Plus Jakarta Sans', var(--font-brand), sans-serif" }}
                  >
                    Email Us Directly
                  </h2>
                </div>

                <p className="text-sm sm:text-base text-[#777A83] leading-relaxed">
                  For customer support, business verification, subscription inquiries, billing, or general questions, email our support team.
                </p>

                {/* Readable, Selectable Support Email Container */}
                <div className="p-3.5 bg-[#FBFBFA] border border-[#E2E3DD] rounded-2xl flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <span className="block text-[11px] font-semibold uppercase tracking-wider text-[#777A83]">
                      Recipient
                    </span>
                    <a
                      href={`mailto:${SUPPORT_EMAIL}`}
                      className="text-sm sm:text-base font-bold text-[#202432] hover:text-[#5B347C] transition-colors truncate block select-all"
                      title={SUPPORT_EMAIL}
                    >
                      {SUPPORT_EMAIL}
                    </a>
                  </div>

                  <button
                    type="button"
                    onClick={handleCopyEmail}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border shrink-0 ${
                      copied
                        ? 'bg-[#EBC1EB]/60 border-[#5B347C] text-[#5B347C]'
                        : 'bg-white border-[#E2E3DD] text-[#202432] hover:bg-[#F3F3F0] hover:border-gray-300'
                    }`}
                    aria-label={copied ? 'Email copied to clipboard' : 'Copy email address'}
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-[#5B347C]" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-[#777A83]" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Primary Action Button */}
                <div>
                  <a
                    href={`mailto:${SUPPORT_EMAIL}`}
                    className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-full bg-[#202432] hover:bg-[#151720] text-white font-bold text-sm shadow-sm hover:scale-[1.01] active:scale-[0.99] transition-all"
                  >
                    <Mail className="w-4 h-4" />
                    <span>Open Email Client</span>
                  </a>
                </div>
              </div>

              {/* Operating Hours & Security Trust Signals */}
              <div className="pt-5 border-t border-[#E2E3DD] space-y-3.5">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-[#F3F3F0] text-[#202432] flex items-center justify-center shrink-0">
                    <Clock className="w-4 h-4 text-[#202432]" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-[#202432]">Response Time</h3>
                    <p className="text-xs text-[#777A83]">Within 24 to 48 business hours</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-[#F3F3F0] text-[#202432] flex items-center justify-center shrink-0">
                    <ShieldCheck className="w-4 h-4 text-[#202432]" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-[#202432]">Security &amp; Privacy</h3>
                    <p className="text-xs text-[#777A83]">Your inquiries are confidential</p>
                  </div>
                </div>
              </div>
            </section>

            {/* Card 2 — Quick Inquiry */}
            <section
              aria-labelledby="quick-inquiry-heading"
              className="lg:col-span-7 bg-white rounded-[24px] sm:rounded-[28px] p-6 sm:p-8 border border-[#E2E3DD] shadow-sm flex flex-col justify-between space-y-6"
            >
              <div className="space-y-6">
                <div className="space-y-1.5">
                  <span className="text-xs font-semibold uppercase tracking-wider text-[#5B347C]">
                    Quick inquiry
                  </span>
                  <h2
                    id="quick-inquiry-heading"
                    className="text-xl sm:text-2xl font-bold text-[#202432] tracking-tight"
                    style={{ fontFamily: "'Plus Jakarta Sans', var(--font-brand), sans-serif" }}
                  >
                    How Can We Help You?
                  </h2>
                  <p className="text-sm sm:text-base text-[#777A83] leading-relaxed">
                    Choose the subject that best describes your inquiry.
                  </p>
                </div>

                {/* 4 Inquiry Selectable Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
                  {INQUIRY_OPTIONS.map((item) => {
                    const IconComponent = item.icon
                    const encodedSubject = encodeURIComponent(item.subject)
                    const mailtoHref = `mailto:${SUPPORT_EMAIL}?subject=${encodedSubject}`

                    return (
                      <a
                        key={item.id}
                        href={mailtoHref}
                        className="group p-4 sm:p-5 rounded-2xl bg-[#FBFBFA] border border-[#E2E3DD] hover:border-[#5B347C]/40 hover:bg-white hover:shadow-[0_8px_24px_rgba(32,36,50,0.06)] focus:outline-none focus:ring-2 focus:ring-[#5B347C] transition-all flex flex-col justify-between min-h-[130px]"
                      >
                        <div>
                          <div className="flex items-center justify-between gap-2 mb-2.5">
                            <div className="w-8 h-8 rounded-xl bg-white border border-[#E2E3DD] text-[#5B347C] flex items-center justify-center shrink-0 group-hover:bg-[#EBC1EB]/40 group-hover:border-[#EBC1EB] transition-colors">
                              <IconComponent className="w-4 h-4 stroke-[1.8]" />
                            </div>
                            <ArrowUpRight className="w-4 h-4 text-[#777A83] group-hover:text-[#5B347C] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all shrink-0" />
                          </div>

                          <h3 className="text-sm sm:text-base font-bold text-[#202432] group-hover:text-[#5B347C] transition-colors tracking-tight">
                            {item.title}
                          </h3>
                        </div>

                        <p className="text-xs text-[#777A83] leading-relaxed mt-2 line-clamp-2">
                          {item.description}
                        </p>
                      </a>
                    )
                  })}
                </div>
              </div>

              {/* Bottom Guidance & Direct Action */}
              <div className="pt-5 border-t border-[#E2E3DD] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#777A83]">
                <p className="text-center sm:text-left">
                  Selecting an inquiry opens a pre-composed message in your email client.
                </p>
                <a
                  href={`mailto:${SUPPORT_EMAIL}`}
                  className="font-semibold text-[#5B347C] hover:text-[#202432] hover:underline shrink-0"
                >
                  Direct email &rarr;
                </a>
              </div>
            </section>
          </div>

          {/* Cross-Link Banner: Browse Help Center for Self-Service */}
          <section
            aria-labelledby="help-center-banner-heading"
            className="mt-8 sm:mt-12 bg-white rounded-[24px] sm:rounded-[28px] border border-[#E2E3DD] p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-sm"
          >
            <div className="flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
              <div className="w-12 h-12 rounded-2xl bg-[#EBC1EB]/60 text-[#5B347C] flex items-center justify-center shrink-0">
                <BookOpen className="w-6 h-6 stroke-[1.8]" />
              </div>
              <div>
                <h2
                  id="help-center-banner-heading"
                  className="text-lg sm:text-xl font-bold text-[#202432] tracking-tight"
                  style={{ fontFamily: "'Plus Jakarta Sans', var(--font-brand), sans-serif" }}
                >
                  Looking for self-service guides or instant answers?
                </h2>
                <p className="text-sm text-[#777A83] mt-1">
                  Explore tutorials on storefront setup, products, payouts, and Instagram AutoDM.
                </p>
              </div>
            </div>

            <Link
              href="/help"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-full border border-[#E2E3DD] text-[#202432] font-semibold text-sm hover:bg-[#F3F3F0] transition-colors shrink-0"
            >
              <span>Explore Help Center</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </section>
        </main>
      </div>

      {/* Footer consistent with /help */}
      <HelpFooter />
    </div>
  )
}
