'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Menu, X, ArrowRight, User, Settings, CreditCard, LogOut, LayoutDashboard } from 'lucide-react'
import { useAuth } from '@/components/auth/AuthContext'
import { trackLoginClicked, trackSignupCtaClicked } from '@/lib/analytics'

export default function Navbar() {
  const { user, profile, isAuthenticated, logout } = useAuth()
  const pathname = usePathname()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef(null)

  // Handle outside click to close dropdown
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false)
      }
    }
    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  const displayName = profile?.name || user?.name || user?.email?.split('@')[0] || 'Creator'
  const displayAvatar = profile?.avatar || user?.avatar
  const displayInitials = (displayName[0] || 'C').toUpperCase()

  const isFeaturesActive = pathname === '/features' || pathname.startsWith('/features/')
  const isSafetyActive = pathname === '/safety' || pathname.startsWith('/safety/')
  const isPricingActive = pathname === '/pricing' || pathname.startsWith('/pricing/')
  const isHowItWorksActive = pathname === '/how-it-works' || pathname.startsWith('/how-it-works/')
  const isHomeActive = pathname === '/'

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-[999] w-full bg-[#000000] border-b border-[#303030] select-none">
        {/* Full-width container spanning edge-to-edge with refined 76-80px desktop height */}
        <div className="w-full flex items-center justify-between h-[64px] sm:h-[72px] md:h-[76px] lg:h-[80px] pl-5 sm:pl-6 md:pl-8 lg:pl-9 pr-0">
          
          {/* LEFT: CreatorStore Italic Script Wordmark (~155-165px wide on desktop) */}
          <div className="flex items-center shrink-0">
            <Link
              href="/"
              aria-label="CreatorStore Home"
              className="italic text-2xl sm:text-3xl md:text-[32px] lg:text-[34px] xl:text-[35px] font-normal tracking-tight text-white hover:opacity-90 transition-opacity select-none leading-none pt-0.5"
              style={{
                fontFamily: "'Instrument Serif', Georgia, 'Times New Roman', serif",
                fontStyle: 'italic',
              }}
            >
              creatorstore
            </Link>
          </div>

          {/* RIGHT: Navigation Links + Login Section Divider + Full-Height Start Selling CTA (Desktop) */}
          <div className="hidden md:flex items-center h-full">
            {/* Primary Navigation Links (18-20px on desktop, balanced spacing, compact white active pill) */}
            <nav className="flex items-center gap-1 md:gap-1.5 lg:gap-2 xl:gap-2.5 mr-3 md:mr-4 lg:mr-5 text-base md:text-[17px] lg:text-[18px] xl:text-[19px] font-medium font-sans">
              <Link
                href="/"
                className={`transition-all duration-150 whitespace-nowrap ${
                  isHomeActive && !isSafetyActive && !isPricingActive && !isHowItWorksActive && !isFeaturesActive
                    ? 'bg-white text-black font-semibold px-3.5 md:px-4 lg:px-5 py-1.5 lg:py-2 rounded-full shadow-sm'
                    : 'text-white/85 hover:text-white px-2.5 md:px-3 lg:px-3.5 py-1.5 lg:py-2 rounded-full transition-colors'
                }`}
              >
                Home
              </Link>
              <Link
                href="/features"
                className={`transition-all duration-150 whitespace-nowrap ${
                  isFeaturesActive
                    ? 'bg-white text-black font-semibold px-3.5 md:px-4 lg:px-5 py-1.5 lg:py-2 rounded-full shadow-sm'
                    : 'text-white/85 hover:text-white px-2.5 md:px-3 lg:px-3.5 py-1.5 lg:py-2 rounded-full transition-colors'
                }`}
              >
                Features
              </Link>
              <Link
                href="/pricing"
                className={`transition-all duration-150 whitespace-nowrap ${
                  isPricingActive
                    ? 'bg-white text-black font-semibold px-3.5 md:px-4 lg:px-5 py-1.5 lg:py-2 rounded-full shadow-sm'
                    : 'text-white/85 hover:text-white px-2.5 md:px-3 lg:px-3.5 py-1.5 lg:py-2 rounded-full transition-colors'
                }`}
              >
                Pricing
              </Link>
              <Link
                href="/safety"
                className={`transition-all duration-150 whitespace-nowrap ${
                  isSafetyActive
                    ? 'bg-white text-black font-semibold px-3.5 md:px-4 lg:px-5 py-1.5 lg:py-2 rounded-full shadow-sm'
                    : 'text-white/85 hover:text-white px-2.5 md:px-3 lg:px-3.5 py-1.5 lg:py-2 rounded-full transition-colors'
                }`}
              >
                Safety
              </Link>
              <Link
                href="/how-it-works"
                className={`transition-all duration-150 whitespace-nowrap ${
                  isHowItWorksActive
                    ? 'bg-white text-black font-semibold px-3.5 md:px-4 lg:px-5 py-1.5 lg:py-2 rounded-full shadow-sm'
                    : 'text-white/85 hover:text-white px-2.5 md:px-3 lg:px-3.5 py-1.5 lg:py-2 rounded-full transition-colors'
                }`}
              >
                How It Works
              </Link>
            </nav>

            {/* Authenticated State vs Unauthenticated State */}
            {isAuthenticated ? (
              <div className="flex items-center h-full">
                {/* Profile Trigger separated by vertical divider */}
                <div className="h-full flex items-center px-4 lg:px-6 border-l border-[#303030]" ref={dropdownRef}>
                  <div className="relative">
                    <button
                      onClick={() => setDropdownOpen(!dropdownOpen)}
                      aria-expanded={dropdownOpen}
                      aria-haspopup="true"
                      aria-label="User Profile Menu"
                      className="flex h-10 w-10 lg:h-11 lg:w-11 items-center justify-center rounded-full bg-[#FF4B1F] text-white font-bold text-sm shadow-xs hover:opacity-90 transition-all duration-150 overflow-hidden focus:outline-none focus:ring-2 focus:ring-white cursor-pointer border-0"
                    >
                      {displayAvatar ? (
                        <img src={displayAvatar} alt={displayName} className="h-full w-full object-cover" />
                      ) : (
                        <span>{displayInitials}</span>
                      )}
                    </button>

                    {/* Profile Dropdown Menu */}
                    {dropdownOpen && (
                      <div className="absolute right-0 mt-3 w-64 rounded-2xl bg-[#161616] border border-[#303030] shadow-2xl p-2.5 text-[#F5F5F5] z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                        <div className="px-3 py-2.5 border-b border-[#303030] mb-1">
                          <p className="font-bold text-sm text-[#F5F5F5] truncate">{displayName}</p>
                          <p className="text-xs text-[#A3A3A3] font-medium truncate">{user?.email}</p>
                        </div>

                        <div className="space-y-1 text-sm font-medium">
                          <Link
                            href="/dashboard/settings"
                            onClick={() => setDropdownOpen(false)}
                            className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-white/10 hover:text-white transition-colors"
                          >
                            <User className="h-4 w-4" /> Profile
                          </Link>
                          <Link
                            href="/dashboard/settings"
                            onClick={() => setDropdownOpen(false)}
                            className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-white/10 hover:text-white transition-colors"
                          >
                            <Settings className="h-4 w-4" /> Settings
                          </Link>
                          <Link
                            href="/dashboard/settings"
                            onClick={() => setDropdownOpen(false)}
                            className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-white/10 hover:text-white transition-colors"
                          >
                            <CreditCard className="h-4 w-4" /> Billing
                          </Link>

                          <div className="border-t border-[#303030] pt-1">
                            <button
                              onClick={() => {
                                setDropdownOpen(false)
                                logout()
                              }}
                              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-rose-400 hover:bg-rose-500/10 transition-colors text-left cursor-pointer"
                            >
                              <LogOut className="h-4 w-4" /> Logout
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Full-Height Dashboard CTA on far right (matching Gumroad segment structure) */}
                <Link
                  href="/dashboard/store"
                  className="h-full flex items-center justify-center bg-white hover:bg-[#EAEAEA] text-black font-semibold text-base md:text-[17px] lg:text-[18px] tracking-tight px-6 lg:px-7 border-l border-[#303030] transition-colors shrink-0 whitespace-nowrap rounded-none"
                >
                  <span>Dashboard</span>
                  <ArrowRight className="h-4 w-4 ml-2 stroke-[2.5]" />
                </Link>
              </div>
            ) : (
              <div className="flex items-center h-full">
                {/* LOGIN SECTION: Separated from navigation by subtle vertical divider, 18-20px text */}
                <div className="h-full flex items-center border-l border-[#303030]">
                  <Link
                    href="/login"
                    onClick={() => trackLoginClicked('navbar')}
                    className="h-full flex items-center px-5 md:px-6 lg:px-7 xl:px-8 text-base md:text-[17px] lg:text-[18px] xl:text-[19px] font-medium text-white hover:text-white/80 transition-colors whitespace-nowrap"
                  >
                    Log in
                  </Link>
                </div>

                {/* START SELLING CTA: Prominent, full-height white CTA on the far right, 28-32px padding, 18-20px text */}
                <Link
                  href="/signup"
                  onClick={() => trackSignupCtaClicked('navbar')}
                  className="h-full flex items-center justify-center bg-white hover:bg-[#EAEAEA] text-black font-semibold text-base md:text-[17px] lg:text-[18px] xl:text-[19px] tracking-tight px-7 lg:px-8 border-l border-[#303030] transition-colors shrink-0 whitespace-nowrap rounded-none focus:outline-none focus:ring-2 focus:ring-white"
                >
                  Start selling
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Menu Toggle Button */}
          <div className="flex md:hidden items-center pr-4">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2.5 text-white hover:bg-[#161616] rounded-xl transition-colors cursor-pointer border-0"
              aria-label="Toggle Menu"
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6 text-white" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu (Accessible, responsive, solid black background) */}
        {mobileMenuOpen && (
          <div className="md:hidden mx-4 my-3 bg-[#0A0A0A] border border-[#303030] rounded-2xl p-6 shadow-2xl space-y-4 animate-in fade-in slide-in-from-top-2 duration-150 text-[#F5F5F5]">
            <div className="flex flex-col space-y-2 font-medium text-base">
              <Link
                href="/"
                onClick={() => setMobileMenuOpen(false)}
                className={`py-2.5 px-4 rounded-xl transition-colors ${
                  isHomeActive && !isSafetyActive && !isPricingActive && !isHowItWorksActive && !isFeaturesActive
                    ? 'bg-white text-black font-bold'
                    : 'text-white/90 hover:text-white'
                }`}
              >
                Home
              </Link>
              <Link
                href="/features"
                onClick={() => setMobileMenuOpen(false)}
                className={`py-2.5 px-4 rounded-xl transition-colors ${
                  isFeaturesActive ? 'bg-white text-black font-bold' : 'text-white/90 hover:text-white'
                }`}
              >
                Features
              </Link>
              <Link
                href="/pricing"
                onClick={() => setMobileMenuOpen(false)}
                className={`py-2.5 px-4 rounded-xl transition-colors ${
                  isPricingActive ? 'bg-white text-black font-bold' : 'text-white/90 hover:text-white'
                }`}
              >
                Pricing
              </Link>
              <Link
                href="/safety"
                onClick={() => setMobileMenuOpen(false)}
                className={`py-2.5 px-4 rounded-xl transition-colors ${
                  isSafetyActive ? 'bg-white text-black font-bold' : 'text-white/90 hover:text-white'
                }`}
              >
                Safety
              </Link>
              <Link
                href="/how-it-works"
                onClick={() => setMobileMenuOpen(false)}
                className={`py-2.5 px-4 rounded-xl transition-colors ${
                  isHowItWorksActive ? 'bg-white text-black font-bold' : 'text-white/90 hover:text-white'
                }`}
              >
                How It Works
              </Link>
            </div>

            <div className="pt-4 border-t border-[#303030] flex flex-col gap-3">
              {isAuthenticated ? (
                <>
                  <div className="flex items-center gap-3 p-3 bg-[#161616] rounded-xl border border-[#303030]">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#FF4B1F] text-white font-bold text-sm overflow-hidden shrink-0">
                      {displayAvatar ? (
                        <img src={displayAvatar} alt={displayName} className="h-full w-full object-cover" />
                      ) : (
                        <span>{displayInitials}</span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-sm text-[#F5F5F5] truncate">{displayName}</p>
                      <p className="text-xs text-[#A3A3A3] truncate">{user?.email}</p>
                    </div>
                  </div>

                  <Link href="/dashboard/store" onClick={() => setMobileMenuOpen(false)}>
                    <button
                      type="button"
                      className="w-full h-12 rounded-xl flex items-center justify-center gap-2 bg-white text-black hover:bg-neutral-200 font-bold text-sm border-0 shadow-sm cursor-pointer transition-colors"
                    >
                      <LayoutDashboard className="h-4 w-4" /> Go to Dashboard
                    </button>
                  </Link>

                  <button
                    onClick={() => {
                      setMobileMenuOpen(false)
                      logout()
                    }}
                    className="w-full py-3 rounded-xl text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 text-xs font-bold flex items-center justify-center gap-2 cursor-pointer border-0 transition-colors"
                  >
                    <LogOut className="h-4 w-4" /> Logout
                  </button>
                </>
              ) : (
                <>
                  <Link
                    href="/login"
                    onClick={() => {
                      trackLoginClicked('navbar_mobile')
                      setMobileMenuOpen(false)
                    }}
                  >
                    <button
                      type="button"
                      className="w-full text-white hover:bg-[#161616] font-medium h-12 rounded-xl text-base border border-[#303030] transition-colors cursor-pointer"
                    >
                      Log in
                    </button>
                  </Link>
                  <Link
                    href="/signup"
                    onClick={() => {
                      trackSignupCtaClicked('navbar_mobile')
                      setMobileMenuOpen(false)
                    }}
                  >
                    <button
                      type="button"
                      className="w-full h-12 font-bold bg-white hover:bg-neutral-200 text-black rounded-xl text-base border-0 shadow-sm transition-colors cursor-pointer"
                    >
                      Start selling
                    </button>
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </header>

      {/* Structural spacer matching fixed header height (64px mobile, 76-80px desktop) */}
      <div className="h-[64px] sm:h-[72px] md:h-[76px] lg:h-[80px] w-full shrink-0 pointer-events-none" aria-hidden="true" />
    </>
  )
}
