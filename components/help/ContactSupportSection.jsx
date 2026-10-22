'use client'

import Link from 'next/link'
import { LifeBuoy, ArrowRight, MessageSquare, Mail } from 'lucide-react'
import { useAuth } from '@/components/auth/AuthContext'

export default function ContactSupportSection({
  title = 'Still need help?',
  description = 'Can’t find what you’re looking for? Reach out to our dedicated support team and we’ll get back to you shortly.',
}) {
  const { isAuthenticated } = useAuth()

  // Authenticated creators can jump directly to the in-app support & ticket dashboard,
  // while public visitors can reach out via the official contact page.
  const supportHref = isAuthenticated ? '/dashboard/help?tab=contact' : '/contact'

  return (
    <section className="w-full mt-12 sm:mt-16 bg-white rounded-[24px] sm:rounded-[28px] border border-[#E2E3DD] p-7 sm:p-10 shadow-sm relative overflow-hidden">
      <div className="max-w-2xl">
        <div className="w-12 h-12 rounded-2xl bg-[#EBC1EB]/60 text-[#5B347C] flex items-center justify-center mb-5">
          <LifeBuoy className="w-6 h-6 stroke-[1.8]" />
        </div>

        <h3
          className="text-2xl sm:text-3xl font-black text-[#202432] tracking-tight mb-2 sm:mb-3"
          style={{ fontFamily: "'Plus Jakarta Sans', var(--font-brand), sans-serif" }}
        >
          {title}
        </h3>

        <p className="text-sm sm:text-base text-[#777A83] mb-6 sm:mb-8 leading-relaxed max-w-lg">
          {description}
        </p>

        <div className="flex flex-wrap items-center gap-3">
          <Link
            href={supportHref}
            className="inline-flex items-center gap-2 px-6 py-3.5 rounded-full bg-[#202432] text-white font-bold text-sm hover:bg-[#151720] hover:scale-[1.01] active:scale-[0.99] transition-all shadow-sm"
          >
            <span>Contact Support</span>
            <ArrowRight className="w-4 h-4" />
          </Link>

          <Link
            href="/contact"
            className="inline-flex items-center gap-2 px-5 py-3 rounded-full border border-[#E2E3DD] text-[#202432] font-semibold text-sm hover:bg-[#F3F3F0] transition-colors"
          >
            <Mail className="w-4 h-4 text-[#777A83]" />
            <span>Email us directly</span>
          </Link>
        </div>
      </div>
    </section>
  )
}
