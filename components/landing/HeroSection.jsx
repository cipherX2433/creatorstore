'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/components/auth/AuthContext'
import { normalizeSlug } from '@/lib/slug'
import { trackLandingPageView, trackHeroCtaClicked } from '@/lib/analytics'

const PENDING_USERNAME_KEY = 'creatorstore_pending_username'

// Words to cycle through as requested by user
const WORDS = ['storefront', 'blog/', 'link-in-bio', 'portfolio']

// Characters used for the scramble transition effect (matches screenshot 1's "st__^_*(")
const SCRAMBLE_CHARS = '^_*()_!$?#&~+/@<>=%'

const CREATOR_AVATARS = [
  { name: 'Elena', src: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&q=80&auto=format&fit=crop&crop=faces' },
  { name: 'Alex', src: 'https://images.unsplash.com/photo-1548690312-e3b507d8c110?w=120&q=80&auto=format&fit=crop&crop=faces' },
  { name: 'David', src: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=120&q=80&auto=format&fit=crop&crop=faces' },
  { name: 'Maya', src: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=120&q=80&auto=format&fit=crop&crop=faces' },
]

function sanitizeUsername(raw) {
  return String(raw || '').toLowerCase().replace(/[^a-z0-9_-]/g, '')
}

/**
 * Custom hook to simulate the text scramble / morphing transition
 * Exactly like in screenshot 1: "st__^_*(" transitioning between words
 */
function useTextScramble(words, holdDuration = 2600, stepSpeed = 35) {
  const [index, setIndex] = useState(0)
  const [displayText, setDisplayText] = useState(words[0])
  const [isScrambling, setIsScrambling] = useState(false)

  useEffect(() => {
    let timeoutId
    let intervalId

    timeoutId = setTimeout(() => {
      const nextIndex = (index + 1) % words.length
      const currentWord = words[index]
      const targetWord = words[nextIndex]

      setIsScrambling(true)
      let iteration = 0
      const totalSteps = Math.max(currentWord.length, targetWord.length) * 3

      intervalId = setInterval(() => {
        iteration++
        const progress = iteration / totalSteps
        const resolvedLength = Math.floor(progress * targetWord.length)

        let result = ''
        for (let i = 0; i < targetWord.length; i++) {
          if (i < resolvedLength) {
            result += targetWord[i]
          } else {
            result += SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)]
          }
        }

        setDisplayText(result)

        if (iteration >= totalSteps) {
          clearInterval(intervalId)
          setDisplayText(targetWord)
          setIsScrambling(false)
          setIndex(nextIndex)
        }
      }, stepSpeed)
    }, holdDuration)

    return () => {
      clearTimeout(timeoutId)
      if (intervalId) clearInterval(intervalId)
    }
  }, [index, words, holdDuration, stepSpeed])

  return displayText
}

/**
 * 3D Rosette Orb Cluster Graphic
 * Recreates the iconic glossy spheres cluster above the headline
 * with multi-stop radial specular gradients and ambient colored glow
 */
function RosetteOrbs() {
  return (
    <div className="relative w-32 h-32 sm:w-36 sm:h-36 mx-auto mb-6 sm:mb-8 flex items-center justify-center select-none pointer-events-none">
      {/* Ambient center bloom */}
      <div className="absolute inset-0 bg-radial from-rose-500/15 via-amber-500/10 to-transparent blur-xl pointer-events-none rounded-full" />

      <svg
        viewBox="0 0 140 140"
        className="w-full h-full drop-shadow-[0_4px_16px_rgba(255,46,126,0.3)] animate-orb-float"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Specular White-to-Magenta Sphere */}
          <radialGradient id="sphere-magenta" cx="35%" cy="30%" r="65%">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.95" />
            <stop offset="18%" stopColor="#FFA6CE" stopOpacity="0.9" />
            <stop offset="48%" stopColor="#FF1879" />
            <stop offset="85%" stopColor="#9E0042" />
            <stop offset="100%" stopColor="#E60055" />
          </radialGradient>

          {/* Deep Pink/Ruby Sphere */}
          <radialGradient id="sphere-rose" cx="35%" cy="30%" r="65%">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.95" />
            <stop offset="20%" stopColor="#FFB3C6" />
            <stop offset="50%" stopColor="#F43F5E" />
            <stop offset="85%" stopColor="#881337" />
            <stop offset="100%" stopColor="#E11D48" />
          </radialGradient>

          {/* Golden Amber / Yellow Sphere */}
          <radialGradient id="sphere-gold" cx="35%" cy="30%" r="65%">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.95" />
            <stop offset="22%" stopColor="#FEF08A" />
            <stop offset="52%" stopColor="#F59E0B" />
            <stop offset="85%" stopColor="#78350F" />
            <stop offset="100%" stopColor="#D97706" />
          </radialGradient>

          {/* Coral / Red-Orange Sphere */}
          <radialGradient id="sphere-coral" cx="35%" cy="30%" r="65%">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.95" />
            <stop offset="20%" stopColor="#FFCCD5" />
            <stop offset="50%" stopColor="#FF4622" />
            <stop offset="85%" stopColor="#7F1D1D" />
            <stop offset="100%" stopColor="#DC2626" />
          </radialGradient>

          {/* Soft Pearl / Light Pink Sphere */}
          <radialGradient id="sphere-pearl" cx="35%" cy="30%" r="65%">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.95" />
            <stop offset="35%" stopColor="#FCE7F3" />
            <stop offset="70%" stopColor="#F472B6" />
            <stop offset="100%" stopColor="#DB2777" />
          </radialGradient>

          {/* Glow filter */}
          <filter id="orb-shadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="2" stdDeviation="2.5" floodColor="#FF2E7E" floodOpacity="0.4" />
          </filter>
        </defs>

        {/* ================= Radial Formation matching Screenshots ================= */}

        {/* TOP AXIS */}
        {/* Top-most tiny bead */}
        <circle cx="70" cy="15" r="4" fill="url(#sphere-pearl)" filter="url(#orb-shadow)" />
        {/* Top inner sphere */}
        <circle cx="70" cy="33" r="8" fill="url(#sphere-rose)" filter="url(#orb-shadow)" />

        {/* BOTTOM AXIS */}
        {/* Bottom inner large sphere (golden amber) */}
        <circle cx="70" cy="98" r="9.5" fill="url(#sphere-gold)" filter="url(#orb-shadow)" />
        {/* Bottom outer sphere (amber/yellow) */}
        <circle cx="70" cy="118" r="5.5" fill="url(#sphere-gold)" filter="url(#orb-shadow)" />

        {/* LEFT AXIS */}
        {/* Left inner large sphere (fiery coral red) */}
        <circle cx="42" cy="70" r="9.5" fill="url(#sphere-coral)" filter="url(#orb-shadow)" />
        {/* Left outer sphere (magenta/pink) */}
        <circle cx="21" cy="70" r="4.5" fill="url(#sphere-magenta)" filter="url(#orb-shadow)" />

        {/* RIGHT AXIS */}
        {/* Right inner large sphere (vibrant fuchsia) */}
        <circle cx="98" cy="70" r="9.5" fill="url(#sphere-magenta)" filter="url(#orb-shadow)" />
        {/* Right outer sphere */}
        <circle cx="116" cy="70" r="5.5" fill="url(#sphere-pearl)" filter="url(#orb-shadow)" />
        {/* Right-most tiny tip bead */}
        <circle cx="130" cy="70" r="3" fill="url(#sphere-magenta)" filter="url(#orb-shadow)" />

        {/* DIAGONALS (ROSETTE PETALS) */}
        {/* Top-Left: cream/yellowish pearl */}
        <circle cx="49" cy="48" r="7.5" fill="url(#sphere-gold)" filter="url(#orb-shadow)" />
        {/* Top-Right: magenta/rose */}
        <circle cx="91" cy="48" r="7.5" fill="url(#sphere-magenta)" filter="url(#orb-shadow)" />
        {/* Bottom-Left: coral/rose */}
        <circle cx="49" cy="92" r="7.5" fill="url(#sphere-rose)" filter="url(#orb-shadow)" />
        {/* Bottom-Right: deep orchid/fuchsia */}
        <circle cx="91" cy="92" r="7.5" fill="url(#sphere-magenta)" filter="url(#orb-shadow)" />

        {/* Subtle accent perimeter beads */}
        <circle cx="34" cy="36" r="3.2" fill="url(#sphere-pearl)" opacity="0.9" />
        <circle cx="106" cy="38" r="3.2" fill="url(#sphere-magenta)" opacity="0.9" />
        <circle cx="36" cy="104" r="3.2" fill="url(#sphere-coral)" opacity="0.9" />
        <circle cx="104" cy="102" r="3.2" fill="url(#sphere-pearl)" opacity="0.9" />
      </svg>
    </div>
  )
}

export default function HeroSection() {
  const router = useRouter()
  const { isAuthenticated } = useAuth()
  const [username, setUsername] = useState('')
  const animatedWord = useTextScramble(WORDS, 2600, 35)

  useEffect(() => {
    trackLandingPageView()
  }, [])

  function handleClaim(e) {
    e?.preventDefault()
    trackHeroCtaClicked('hero')
    if (isAuthenticated) {
      router.push('/dashboard/store')
      return
    }
    const clean = normalizeSlug(username) || sanitizeUsername(username)
    try {
      if (clean) sessionStorage.setItem(PENDING_USERNAME_KEY, clean)
      else sessionStorage.removeItem(PENDING_USERNAME_KEY)
    } catch { /* ignore */ }
    router.push(clean ? `/signup?username=${encodeURIComponent(clean)}` : '/signup')
  }

  return (
    <section className="relative w-full bg-[#000000] text-white overflow-hidden pt-10 sm:pt-14 md:pt-16 pb-4 sm:pb-6 md:pb-8 selection:bg-[#FF4B1F] selection:text-white">
      {/* Fonts & Micro-animations */}
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Plus+Jakarta+Sans:wght@300;400;500;600;700&display=swap');

        .font-hero-serif {
          font-family: 'Instrument Serif', Georgia, 'Times New Roman', serif;
          font-style: italic;
          letter-spacing: -0.01em;
        }

        .font-hero-sans {
          font-family: 'Plus Jakarta Sans', var(--font-manrope), -apple-system, BlinkMacSystemFont, sans-serif;
        }

        @keyframes orb-float-anim {
          0%, 100% {
            transform: translateY(0px) scale(1);
          }
          50% {
            transform: translateY(-4px) scale(1.02);
          }
        }

        .hero-claim-input,
        .hero-claim-input:hover,
        .hero-claim-input:focus,
        .hero-claim-input:active {
          background-color: transparent !important;
          background: transparent !important;
          color: #FFFFFF !important;
          border: none !important;
          outline: none !important;
          box-shadow: none !important;
        }

        .hero-claim-input:-webkit-autofill,
        .hero-claim-input:-webkit-autofill:hover,
        .hero-claim-input:-webkit-autofill:focus,
        .hero-claim-input:-webkit-autofill:active {
          -webkit-text-fill-color: #FFFFFF !important;
          -webkit-box-shadow: 0 0 0px 1000px #080808 inset !important;
          box-shadow: 0 0 0px 1000px #080808 inset !important;
          caret-color: #FF4B1F !important;
        }
      `}</style>

      {/* Very subtle ambient lighting */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-gradient-to-b from-[#FF2B51]/10 via-[#FF4622]/5 to-transparent blur-[120px] pointer-events-none rounded-full" />

      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center flex flex-col items-center">

        {/* 1. TOP ROSETTE OF 3D GLOSSY SPHERES */}
        <RosetteOrbs />

        {/* 2. THE BIG HEADLINE */}
        <div className="flex flex-col items-center justify-center mb-6 sm:mb-8">
          {/* Changing colored italic serif word */}
          <div className="min-h-[1.15em] flex items-center justify-center">
            <span
              className="font-hero-serif text-5xl sm:text-7xl md:text-8xl lg:text-[96px] font-normal leading-none text-[#FF4B1F] drop-shadow-[0_2px_24px_rgba(255,75,31,0.25)] transition-all select-none"
              style={{
                fontFamily: "'Instrument Serif', Georgia, serif",
                fontStyle: 'italic',
              }}
            >
              {animatedWord}
            </span>
          </div>

          {/* Second line in clean sans */}
          <h1 className="font-hero-sans text-4xl sm:text-6xl md:text-7xl lg:text-[76px] font-normal tracking-tight text-white leading-[1.08] mt-1 sm:mt-2">
            in one bio link
          </h1>
        </div>

        {/* 3. SUPPORTING COPY */}
        <p className="text-base sm:text-lg md:text-[18px] text-[#A1A1AA] font-normal leading-relaxed max-w-2xl mx-auto mb-3">
          Your store, your content, your brand - live in minutes. No developer, no design skills needed. 0% transaction fees. More than link-in-bio.
        </p>



        {/* 4. THE CLAIM BOX CONTAINER */}
        <div className="w-full max-w-[480px] mx-auto mb-8 sm:mb-10">
          <form
            onSubmit={handleClaim}
            className="w-full bg-[#080808] border border-[#262626] hover:border-[#383838] focus-within:border-[#444444] rounded-[24px] p-2.5 sm:p-3 shadow-2xl transition-all flex flex-col gap-2.5 sm:gap-3"
          >
            {/* Top row: Domain prefix + text input */}
            <div className="flex items-center px-3.5 sm:px-4 pt-2.5 sm:pt-3 pb-1 text-sm sm:text-base">
              <span className="text-white font-medium select-none whitespace-nowrap">
                creatorstore.store/
              </span>
              <input
                type="text"
                name="username"
                autoComplete="username"
                autoCapitalize="none"
                spellCheck={false}
                value={username}
                onChange={(e) => setUsername(sanitizeUsername(e.target.value))}
                placeholder="e.g. keithan"
                className="hero-claim-input w-full !bg-transparent outline-none !border-none !shadow-none text-white placeholder:text-[#52525B] text-sm sm:text-base font-normal ml-2 caret-[#FF4B1F]"
                style={{
                  backgroundColor: 'transparent',
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  boxShadow: 'none',
                  color: '#FFFFFF',
                }}
                aria-label="Choose your username"
              />
            </div>

            {/* Bottom row: Full width red-orange button */}
            <button
              type="submit"
              className="w-full py-3.5 sm:py-4 px-6 rounded-xl sm:rounded-2xl bg-[#FF4B1F] hover:bg-[#FF6238] active:scale-[0.99] text-white font-semibold text-base sm:text-[17px] tracking-tight shadow-[0_4px_28px_rgba(255,75,31,0.38)] transition-all cursor-pointer flex items-center justify-center border-none"
            >
              Claim for free
            </button>
          </form>
        </div>

        {/* 5. CREATOR SOCIAL PROOF STACK */}
        <div className="flex items-center justify-center gap-3">
          <div className="flex items-center -space-x-2">
            {CREATOR_AVATARS.map((creator, idx) => (
              <img
                key={idx}
                src={creator.src}
                alt={creator.name}
                className="w-7 h-7 sm:w-8 sm:h-8 rounded-full border-2 border-black object-cover shadow-sm"
                loading="lazy"
              />
            ))}
          </div>
          <span className="text-xs sm:text-sm text-[#A1A1AA] font-medium">
            Join 500+ creators community
          </span>
        </div>

      </div>
    </section>
  )
}
