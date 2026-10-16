'use client'

import { useRef, useEffect } from 'react'
import { Check, User, Globe } from 'lucide-react'
import { SOCIAL_ICONS } from '@/components/storefront/PublicStoreRenderer'
import { buildDefaultPalette } from '@/lib/imageContrast'

function getScrollParent(node) {
  if (!node || typeof window === 'undefined') return window
  let parent = node.parentElement
  while (parent && parent !== document.body && parent !== document.documentElement) {
    const style = window.getComputedStyle(parent)
    const overflowY = style.overflowY
    if (overflowY === 'auto' || overflowY === 'scroll') {
      return parent
    }
    parent = parent.parentElement
  }
  return window
}

export default function ImmersiveHeroHeader({
  profile,
  tokens,
  editor,
  username,
  store,
  contrastTheme,
}) {
  const containerRef = useRef(null)
  const rafIdRef = useRef(null)

  const { typography, header } = tokens
  const handle = username || profile?.username || store?.username || store?.slug || ''

  // Priority for visible storefront name
  const rawHeaderTitle = typeof header?.title === 'string' ? header.title.trim() : ''
  const isEmailOrPrefix = rawHeaderTitle && (
    rawHeaderTitle.includes('@') ||
    (profile?.email && rawHeaderTitle.toLowerCase() === profile.email.split('@')[0].toLowerCase())
  )
  const validHeaderTitle = (!isEmailOrPrefix && rawHeaderTitle) ? rawHeaderTitle : null
  const name = validHeaderTitle || store?.storeName || profile?.name || (handle ? `@${handle}` : 'Creator Store')
  const bio = header?.bio !== undefined && header?.bio !== null ? header.bio : (profile?.bio || store?.bio || '')
  const avatarUrl = header?.avatarUrl || store?.avatarUrl || profile?.avatarUrl || ''
  const titleStyle = header?.titleStyle === 'logo' && header?.logoUrl ? 'logo' : 'text'
  const showTitle = header?.showUsername !== false
  const showBio = header?.showBio !== false
  const showSocials = header?.showSocials !== false
  const isVerified = Boolean(profile?.isVerified || profile?.verified || store?.isVerified)

  // Palette from contrastTheme or tokens
  const palette = contrastTheme?.bg ? contrastTheme : (tokens?.contrast || buildDefaultPalette('dark'))

  // Scroll effect listener: gradual blur (0px -> 12px), smooth opacity fade (1.0 -> 0.18), subtle scale (1.0 -> 1.04)
  useEffect(() => {
    const node = containerRef.current
    if (!node) return

    const prefersReducedMotion = typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches

    if (prefersReducedMotion) {
      node.style.setProperty('--hero-blur', '0px')
      node.style.setProperty('--hero-opacity', '1')
      node.style.setProperty('--hero-scale', '1')
      node.style.setProperty('--hero-content-opacity', '1')
      node.style.setProperty('--hero-content-y', '0px')
      return
    }

    const scrollParent = getScrollParent(node)
    if (!scrollParent) return

    let lastScrollTop = -1

    const handleScroll = () => {
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current)
      rafIdRef.current = requestAnimationFrame(() => {
        const scrollTop = scrollParent === window
          ? (window.scrollY || document.documentElement.scrollTop || 0)
          : (scrollParent.scrollTop || 0)

        if (scrollTop === lastScrollTop) return
        lastScrollTop = scrollTop

        // Progress over 280px of scroll
        const transitionRange = 280
        const progress = Math.min(1, Math.max(0, scrollTop / transitionRange))

        // Specifications:
        // scroll 0: opacity 1, blur 0px
        // scroll 0.5: opacity ~0.7, blur ~4-6px
        // scroll 1.0: opacity ~0.18, blur ~12px
        const blurPx = (progress * 12).toFixed(2)
        const opacityVal = Math.max(0.18, 1 - progress * 0.82).toFixed(3)
        const scaleVal = (1 + progress * 0.04).toFixed(3)
        const contentOpacity = Math.max(0, 1 - progress * 1.5).toFixed(3)
        const translateYVal = (-progress * 24).toFixed(1)

        node.style.setProperty('--hero-blur', `${blurPx}px`)
        node.style.setProperty('--hero-opacity', opacityVal)
        node.style.setProperty('--hero-scale', scaleVal)
        node.style.setProperty('--hero-content-opacity', contentOpacity)
        node.style.setProperty('--hero-content-y', `${translateYVal}px`)
      })
    }

    scrollParent.addEventListener('scroll', handleScroll, { passive: true })
    if (scrollParent !== window) {
      window.addEventListener('scroll', handleScroll, { passive: true })
    }

    handleScroll()

    return () => {
      scrollParent.removeEventListener('scroll', handleScroll)
      if (scrollParent !== window) {
        window.removeEventListener('scroll', handleScroll)
      }
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current)
    }
  }, [])

  const socialEntries = Object.entries(profile?.socialLinks || {}).filter(([, v]) => v)

  return (
    <div
      ref={containerRef}
      className="immersive-hero relative w-full overflow-hidden select-none"
      style={{
        height: 'clamp(380px, 48vh, 480px)',
        '--hero-blur': '0px',
        '--hero-opacity': '1',
        '--hero-scale': '1',
        '--hero-content-opacity': '1',
        '--hero-content-y': '0px',
      }}
    >
      {/* 1. HERO BACKGROUND IMAGE LAYER */}
      <div className="absolute inset-0 w-full h-full overflow-hidden">
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={name}
            className="w-full h-full object-cover object-center pointer-events-none transition-filter duration-75"
            style={{
              transform: 'scale(var(--hero-scale, 1))',
              filter: 'blur(var(--hero-blur, 0px))',
              opacity: 'var(--hero-opacity, 1)',
              willChange: 'transform, filter, opacity',
            }}
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center bg-gradient-to-b from-[#2B3240] to-[#12141A]"
            style={{
              transform: 'scale(var(--hero-scale, 1))',
              filter: 'blur(var(--hero-blur, 0px))',
              opacity: 'var(--hero-opacity, 1)',
              willChange: 'transform, filter, opacity',
            }}
          >
            <User className="h-28 w-28 text-white/20" />
          </div>
        )}
      </div>

      {/* 2. SOFT IMAGE-TO-THEME FADE LAYER: Dissolves the image smoothly into palette.bg */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,0) 35%, ${palette.bg}B3 72%, ${palette.bg} 100%)`,
        }}
      />

      {/* 3. SUBTLE TOP SCRIM FOR FLOATING HEADER BUTTONS */}
      <div
        className="absolute inset-x-0 top-0 h-20 pointer-events-none"
        style={{
          background: 'linear-gradient(to bottom, rgba(0, 0, 0, 0.35) 0%, transparent 100%)',
        }}
      />

      {/* 4. CREATOR CONTENT LAYER OVER HERO TRANSITION AREA */}
      <div
        className="absolute bottom-4 sm:bottom-6 inset-x-0 z-10 px-4 sm:px-8 flex flex-col items-center text-center gap-1.5"
        style={{
          opacity: 'var(--hero-content-opacity, 1)',
          transform: 'translateY(var(--hero-content-y, 0px))',
          willChange: 'transform, opacity',
        }}
      >
        {/* Creator Name or Logo */}
        {showTitle && (
          titleStyle === 'logo' && header.logoUrl ? (
            <img
              src={header.logoUrl}
              alt={name}
              className="h-10 sm:h-12 max-w-[220px] object-contain drop-shadow-md"
            />
          ) : (
            <h1
              className={`text-2xl sm:text-4xl font-extrabold tracking-tight drop-shadow-sm ${typography?.titleWeight || ''}`}
              style={{
                fontFamily: typography?.headingFont,
                color: palette.text || '#FFFFFF',
              }}
            >
              {name}
            </h1>
          )
        )}

        {/* Bio */}
        {showBio && bio && (
          <p
            className="text-xs sm:text-sm leading-relaxed font-medium max-w-md mx-auto drop-shadow-sm break-words line-clamp-2"
            style={{
              color: palette.textSecondary || 'rgba(255,255,255,0.78)',
            }}
          >
            {bio}
          </p>
        )}

        {/* Optional Verified Badge */}
        {isVerified && (
          <div
            className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold tracking-wide backdrop-blur-md transition-colors"
            style={{
              backgroundColor: palette.badgeBg || 'rgba(255,255,255,0.15)',
              color: palette.badgeFg || '#FFFFFF',
              border: `1px solid ${palette.badgeBorder || 'rgba(255,255,255,0.22)'}`,
            }}
          >
            <span className="inline-flex items-center justify-center h-3 w-3 rounded-full bg-[#0052FF] text-white">
              <Check className="h-2 w-2 stroke-[3]" />
            </span>
            <span>Verified</span>
          </div>
        )}

        {/* Social Icons Row */}
        {showSocials && socialEntries.length > 0 && (
          <div className="flex flex-wrap items-center justify-center gap-2 pt-0.5">
            {socialEntries.map(([key, val]) => {
              const Icon = SOCIAL_ICONS?.[key] || Globe
              const strVal = typeof val === 'string' ? val : ''
              const href = strVal.startsWith('http') ? strVal : `https://${strVal}`

              const iconPill = (
                <span
                  className="flex h-8 w-8 items-center justify-center rounded-full backdrop-blur-md transition-transform hover:scale-110"
                  style={{
                    backgroundColor: palette.socialBg || 'rgba(255,255,255,0.15)',
                    color: palette.socialFg || '#FFFFFF',
                    border: `1px solid ${palette.socialBorder || 'rgba(255,255,255,0.20)'}`,
                  }}
                >
                  <Icon className="h-3.5 w-3.5" />
                </span>
              )

              return editor ? (
                <span key={key}>{iconPill}</span>
              ) : (
                <a key={key} href={href} target="_blank" rel="noreferrer" aria-label={key}>
                  {iconPill}
                </a>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
