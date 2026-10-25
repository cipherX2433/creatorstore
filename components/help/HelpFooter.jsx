'use client'

import Link from 'next/link'

export default function HelpFooter() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="w-full bg-[#F3F3F0] border-t border-[#E2E3DD] py-12 sm:py-16 px-4 sm:px-6 mt-16 sm:mt-24">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 text-sm text-[#777A83]">
        {/* Brand & Note */}
        <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-6 text-center sm:text-left">
          <Link
            href="/"
            className="text-lg font-bold text-[#202432] hover:opacity-85 transition-opacity"
            style={{ fontFamily: "'Plus Jakarta Sans', var(--font-brand), sans-serif" }}
          >
            CreatorStore
          </Link>
          <span className="hidden sm:inline text-[#E2E3DD]">•</span>
          <span>Help Center &amp; Documentation</span>
        </div>

        {/* Footer Navigation */}
        <div className="flex flex-wrap items-center justify-center gap-5 sm:gap-7 font-medium text-xs sm:text-sm">
          <Link href="/how-it-works" className="hover:text-[#202432] transition-colors">
            How It Works
          </Link>
          <Link href="/pricing" className="hover:text-[#202432] transition-colors">
            Pricing
          </Link>
          <Link href="/compare" className="hover:text-[#202432] transition-colors">
            Compare
          </Link>
          <Link href="/privacy" className="hover:text-[#202432] transition-colors">
            Privacy Policy
          </Link>
          <Link href="/terms" className="hover:text-[#202432] transition-colors">
            Terms of Service
          </Link>
          <Link href="/contact" className="hover:text-[#202432] transition-colors">
            Contact
          </Link>
        </div>

        {/* Copyright */}
        <div className="text-xs text-[#777A83]">
          &copy; {currentYear} CreatorStore Inc. All rights reserved.
        </div>
      </div>
    </footer>
  )
}
