'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Menu, X, ArrowRight, User, Settings, CreditCard, LogOut, LayoutDashboard, ShieldCheck } from 'lucide-react'
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

  const isSafetyActive = pathname === '/safety'
  const isPricingActive = pathname === '/pricing'
  const isHowItWorksActive = pathname === '/how-it-works'
  const isHomeActive = pathname === '/'

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-[999] w-full bg-black border-b border-[#262626] select-none">
      {/* Full-width container spanning edge-to-edge with right flush CTA */}
      <div className="w-full flex items-center justify-between h-16 pl-4 sm:pl-6 lg:pl-8 pr-0">
        
        {/* LEFT: Pure Italic Serif Wordmark (No Logo) matching reference style */}
        <div className="flex items-center shrink-0 py-2">
          <Link
            href="/"
            aria-label="CreatorStore Home"
            className="font-hero-serif italic text-2xl sm:text-[28px] font-normal tracking-tight text-white hover:opacity-90 transition-opacity select-none leading-none pt-0.5"
            style={{
              fontFamily: "'Instrument Serif', Georgia, 'Times New Roman', serif",
              fontStyle: 'italic',
            }}
          >
            creatorstore
          </Link>
        </div>

        {/* RIGHT: Navigation Links + Log in + Start Selling (Desktop) */}
        <div className="hidden md:flex items-center h-full">
          {/* Existing 5 Navigation Options (Exact same options, no new options) */}
          <nav className="flex items-center gap-1.5 lg:gap-2 mr-4 lg:mr-6 text-sm font-medium">
            <Link
              href="/"
              className={`transition-all duration-150 ${
                isHomeActive && !isSafetyActive && !isPricingActive && !isHowItWorksActive
                  ? 'bg-white text-black px-4 py-1.5 rounded-full font-semibold shadow-xs'
                  : 'text-white/85 hover:text-white px-3 py-1.5 rounded-full transition-colors'
              }`}
            >
              Home
            </Link>
            <Link
              href="/#features"
              className="text-white/85 hover:text-white px-3 py-1.5 rounded-full transition-colors"
            >
              Features
            </Link>
            <Link
              href="/pricing"
              className={`transition-all duration-150 ${
                isPricingActive
                  ? 'bg-white text-black px-4 py-1.5 rounded-full font-semibold shadow-xs'
                  : 'text-white/85 hover:text-white px-3 py-1.5 rounded-full transition-colors'
              }`}
            >
              Pricing
            </Link>
            <Link
              href="/safety"
              className={`transition-all duration-150 flex items-center gap-1.5 ${
                isSafetyActive
                  ? 'bg-white text-black px-4 py-1.5 rounded-full font-semibold shadow-xs'
                  : 'text-white/85 hover:text-white px-3 py-1.5 rounded-full transition-colors'
              }`}
            >
              <ShieldCheck className={`w-3.5 h-3.5 ${isSafetyActive ? 'text-black' : 'text-white/85'}`} />
              <span>Safety</span>
            </Link>
            <Link
              href="/how-it-works"
              className={`transition-all duration-150 ${
                isHowItWorksActive
                  ? 'bg-white text-black px-4 py-1.5 rounded-full font-semibold shadow-xs'
                  : 'text-white/85 hover:text-white px-3 py-1.5 rounded-full transition-colors'
              }`}
            >
              How It Works
            </Link>
          </nav>

          {/* Right Action Block */}
          {isAuthenticated ? (
            <div className="flex items-center h-full gap-4 pr-6 pl-2 border-l border-white/15">
              {/* Dashboard Button */}
              <Link href="/dashboard/store">
                <button
                  type="button"
                  className="font-bold px-4 py-2 rounded-full flex items-center gap-2 text-xs sm:text-sm bg-[#161616] text-[#F5F5F5] border border-[#303030] hover:bg-[#222222] transition-colors cursor-pointer"
                >
                  <span>Dashboard</span>
                  <ArrowRight className="h-3.5 w-3.5 stroke-[2.5]" />
                </button>
              </Link>

              {/* Profile Avatar Dropdown Trigger */}
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  aria-expanded={dropdownOpen}
                  aria-haspopup="true"
                  aria-label="User Profile Menu"
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-[#FF4B1F] text-white font-bold text-xs shadow-xs hover:opacity-90 transition-all duration-150 overflow-hidden focus:outline-none focus:ring-2 focus:ring-[#FF4B1F] cursor-pointer border-0"
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
          ) : (
            <div className="flex items-center h-full">
              {/* Log in Text Link */}
              <Link
                href="/login"
                onClick={() => trackLoginClicked('navbar')}
                className="text-white font-medium text-sm hover:text-white/80 transition-colors px-5 lg:px-6 flex items-center h-full"
              >
                Log in
              </Link>

              {/* Start selling Button with White Background (Full Height) */}
              <Link
                href="/signup"
                onClick={() => trackSignupCtaClicked('navbar')}
                className="h-full flex items-center justify-center bg-white hover:bg-neutral-200 text-black font-bold text-sm tracking-tight px-6 lg:px-8 border-l border-white/20 transition-colors shrink-0"
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
            className="p-2 text-white hover:bg-[#161616] rounded-lg transition-colors cursor-pointer border-0"
            aria-label="Toggle Menu"
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6 text-white" />}
          </button>
        </div>
      </div>

      {/* Mobile Dropdown Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden mx-4 my-3 bg-[#161616] border border-[#303030] rounded-2xl p-6 shadow-2xl space-y-4 animate-in fade-in slide-in-from-top-2 duration-150 text-[#F5F5F5]">
          <div className="flex flex-col space-y-2 font-medium text-base">
            <Link
              href="/"
              onClick={() => setMobileMenuOpen(false)}
              className={`py-2 px-3 rounded-xl transition-colors ${
                isHomeActive && !isSafetyActive && !isPricingActive && !isHowItWorksActive
                  ? 'bg-white text-black font-bold'
                  : 'text-white/90 hover:text-white'
              }`}
            >
              Home
            </Link>
            <Link
              href="/#features"
              onClick={() => setMobileMenuOpen(false)}
              className="py-2 px-3 rounded-xl text-white/90 hover:text-white transition-colors"
            >
              Features
            </Link>
            <Link
              href="/pricing"
              onClick={() => setMobileMenuOpen(false)}
              className={`py-2 px-3 rounded-xl transition-colors ${
                isPricingActive ? 'bg-white text-black font-bold' : 'text-white/90 hover:text-white'
              }`}
            >
              Pricing
            </Link>
            <Link
              href="/safety"
              onClick={() => setMobileMenuOpen(false)}
              className={`py-2 px-3 rounded-xl flex items-center gap-2 transition-colors ${
                isSafetyActive ? 'bg-white text-black font-bold' : 'text-white/90 hover:text-white'
              }`}
            >
              <ShieldCheck className={`w-4 h-4 ${isSafetyActive ? 'text-black' : 'text-[#FF4B1F]'}`} />
              <span>Safety</span>
            </Link>
            <Link
              href="/how-it-works"
              onClick={() => setMobileMenuOpen(false)}
              className={`py-2 px-3 rounded-xl transition-colors ${
                isHowItWorksActive ? 'bg-white text-black font-bold' : 'text-white/90 hover:text-white'
              }`}
            >
              How It Works
            </Link>
          </div>

          <div className="pt-4 border-t border-[#303030] flex flex-col gap-3">
            {isAuthenticated ? (
              <>
                <div className="flex items-center gap-3 p-3 bg-[#222222] rounded-xl border border-[#303030]">
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
                  <Button className="w-full h-11 rounded-xl flex items-center justify-center gap-2 bg-white text-black hover:bg-neutral-200 font-bold border-0 shadow-sm">
                    <LayoutDashboard className="h-4 w-4" /> Go to Dashboard
                  </Button>
                </Link>

                <button
                  onClick={() => {
                    setMobileMenuOpen(false)
                    logout()
                  }}
                  className="w-full py-2.5 rounded-xl text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 text-xs font-bold flex items-center justify-center gap-2 cursor-pointer border-0"
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
                    className="w-full text-white hover:bg-[#222222] font-medium h-11 rounded-full text-sm border border-[#303030] transition-colors"
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
                    className="w-full h-11 font-bold bg-white hover:bg-neutral-200 text-black rounded-full text-sm border-0 shadow-sm transition-colors"
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
    {/* Structural spacer matching fixed header height */}
    <div className="h-16 w-full shrink-0 pointer-events-none" aria-hidden="true" />
  </>
  )
}
