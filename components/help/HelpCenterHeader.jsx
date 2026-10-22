'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/components/auth/AuthContext'
import { Menu, X, ArrowRight, LayoutDashboard, LogIn, ExternalLink } from 'lucide-react'

export default function HelpCenterHeader({ showSearch = false, onSearch }) {
  const pathname = usePathname()
  const { isAuthenticated, user, profile } = useAuth()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const displayName = profile?.name || user?.name || user?.email?.split('@')[0] || 'Account'

  return (
    <header className="w-full pt-4 sm:pt-6 px-4 sm:px-6 relative z-40">
      <div className="max-w-6xl mx-auto bg-white rounded-full px-5 sm:px-8 py-3 sm:py-3.5 shadow-sm border border-[#E2E3DD] flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="flex items-center gap-1.5 group"
            aria-label="CreatorStore Home"
          >
            <span
              className="text-xl sm:text-2xl font-bold tracking-tight text-[#202432] group-hover:opacity-85 transition-opacity"
              style={{ fontFamily: "'Plus Jakarta Sans', var(--font-brand), sans-serif" }}
            >
              CreatorStore
            </span>
          </Link>
          <span className="text-gray-300 font-light select-none">/</span>
          <Link
            href="/help"
            className="text-xs sm:text-sm font-semibold text-[#5B347C] bg-[#EBC1EB]/40 hover:bg-[#EBC1EB]/70 px-2.5 py-1 rounded-full transition-colors"
          >
            Help Center
          </Link>
        </div>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-[#202432]">
          <Link
            href="/how-it-works"
            className="hover:text-[#5B347C] transition-colors"
          >
            How It Works
          </Link>
          <Link
            href="/pricing"
            className="hover:text-[#5B347C] transition-colors"
          >
            Pricing
          </Link>
          <Link
            href="/compare"
            className="hover:text-[#5B347C] transition-colors"
          >
            Compare
          </Link>
          <Link
            href="/contact"
            className="hover:text-[#5B347C] transition-colors"
          >
            Contact
          </Link>
        </nav>

        {/* Right Action Buttons */}
        <div className="hidden sm:flex items-center gap-3">
          {isAuthenticated ? (
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs sm:text-sm font-semibold bg-[#202432] text-white hover:bg-[#151720] transition-colors"
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              <span>Dashboard</span>
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className="text-xs sm:text-sm font-semibold text-[#202432] hover:text-[#5B347C] px-3 py-1.5 transition-colors"
              >
                Log in
              </Link>
              <Link
                href="/signup"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs sm:text-sm font-semibold bg-[#202432] text-white hover:bg-[#151720] transition-colors shadow-sm"
              >
                <span>Get started</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </>
          )}
        </div>

        {/* Mobile Menu Button */}
        <div className="flex sm:hidden items-center gap-2">
          {isAuthenticated ? (
            <Link
              href="/dashboard"
              className="p-2 rounded-full bg-[#202432] text-white hover:bg-black transition-colors"
              aria-label="Dashboard"
            >
              <LayoutDashboard className="w-4 h-4" />
            </Link>
          ) : null}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-full text-[#202432] hover:bg-gray-100 transition-colors"
            aria-label="Toggle navigation menu"
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="sm:hidden mt-2 max-w-6xl mx-auto bg-white rounded-3xl p-5 shadow-lg border border-[#E2E3DD] space-y-4 animate-in fade-in slide-in-from-top-2 duration-150">
          <nav className="flex flex-col space-y-3 text-base font-semibold text-[#202432]">
            <Link
              href="/help"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 rounded-xl hover:bg-[#F3F3F0] transition-colors"
            >
              Help Center Home
            </Link>
            <Link
              href="/how-it-works"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 rounded-xl hover:bg-[#F3F3F0] transition-colors"
            >
              How It Works
            </Link>
            <Link
              href="/pricing"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 rounded-xl hover:bg-[#F3F3F0] transition-colors"
            >
              Pricing
            </Link>
            <Link
              href="/compare"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 rounded-xl hover:bg-[#F3F3F0] transition-colors"
            >
              Compare Platforms
            </Link>
            <Link
              href="/contact"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 rounded-xl hover:bg-[#F3F3F0] transition-colors"
            >
              Contact Support
            </Link>
          </nav>

          <div className="pt-3 border-t border-[#E2E3DD] flex flex-col gap-2.5">
            {isAuthenticated ? (
              <Link
                href="/dashboard"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-full bg-[#202432] text-white font-semibold text-sm hover:bg-black transition-colors"
              >
                <LayoutDashboard className="w-4 h-4" />
                <span>Go to Dashboard</span>
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full text-center py-2.5 rounded-full border border-[#E2E3DD] text-[#202432] font-semibold text-sm hover:bg-[#F3F3F0] transition-colors"
                >
                  Log in
                </Link>
                <Link
                  href="/signup"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-full bg-[#202432] text-white font-semibold text-sm hover:bg-black transition-colors"
                >
                  <span>Get started free</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  )
}
