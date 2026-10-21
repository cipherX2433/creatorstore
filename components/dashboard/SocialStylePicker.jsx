'use client'

import React from 'react'
import { Check, Zap } from 'lucide-react'
import {
  getSocialPlatform,
  SOCIAL_DISPLAY_STYLES,
  resolveSocialStyle,
  isInstagramPlatform,
  isSocialStyleAvailable,
} from '@/lib/socialPlatforms'

/**
 * Shared Social Style Picker Component
 * Used identically in Add Social Media Modal and Card Editor.
 */
export default function SocialStylePicker({
  selectedStyle = 'classic',
  onSelectStyle,
  platform: platformProp = 'instagram',
  isPro = false,
  onOpenPricing,
  disabled = false,
}) {
  const platform = typeof platformProp === 'object' && platformProp !== null
    ? platformProp
    : getSocialPlatform(platformProp)
  const PlatformIcon = platform.icon
  const normalizedSelected = resolveSocialStyle(selectedStyle, platform.id)

  const handleCardClick = (style) => {
    if (disabled) return
    const isAvailable = isSocialStyleAvailable(style.id, platform)
    if (!isAvailable) return

    if (style.isPro && !isPro) {
      if (typeof onOpenPricing === 'function') {
        onOpenPricing()
      }
      return
    }
    onSelectStyle?.(style.id)
  }

  return (
    <div className="grid grid-cols-2 gap-3 pt-1">
      {SOCIAL_DISPLAY_STYLES.map((style) => {
        const isAvailable = isSocialStyleAvailable(style.id, platform)
        const isComingSoon = !isAvailable
        const isSelected = isAvailable && normalizedSelected === style.id
        const isLocked = isAvailable && style.isPro && !isPro

        return (
          <div
            key={style.id}
            id={`social-style-${style.id}-btn`}
            role="button"
            tabIndex={isAvailable && !disabled ? 0 : -1}
            aria-disabled={!isAvailable || disabled}
            onClick={() => handleCardClick(style)}
            onKeyDown={(e) => {
              if (!isAvailable || disabled) return
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                handleCardClick(style)
              }
            }}
            aria-pressed={isSelected}
            aria-label={`${style.name} display style${isComingSoon ? ' (Coming Soon)' : isLocked ? ' (Pro)' : ''}`}
            className={`p-3.5 rounded-[16px] border-2 transition-all flex flex-col justify-between gap-3 relative select-none ${
              isComingSoon
                ? 'border-[#E5E5E3] bg-[#F7F7F6] opacity-55 cursor-not-allowed'
                : isSelected
                ? 'border-[#1F1F1F] bg-[#FFFFFF] shadow-sm ring-1 ring-[#1F1F1F] cursor-pointer'
                : 'border-[#E5E5E3] bg-[#F9F9F8] hover:border-[#999995] cursor-pointer'
            } ${disabled ? 'opacity-60 pointer-events-none' : ''}`}
          >
            {/* Coming Soon Badge (Non-Instagram Unavailable Layouts) */}
            {isComingSoon && (
              <div
                data-testid={`coming-soon-badge-${style.id}`}
                className="absolute top-2 right-2 flex items-center text-[10px] font-semibold text-[#6F6F6B] bg-[#EAEAEA] border border-[#D9D9D7] px-2 py-0.5 rounded-full shadow-2xs tracking-tight"
              >
                <span>Coming Soon</span>
              </div>
            )}

            {/* Pro / Zap badge (Only shown if available) */}
            {!isComingSoon && style.isPro && (
              <div
                className={`absolute top-2 right-2 flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                  isLocked
                    ? 'text-[#7C3AED] bg-[#EDE9FE]'
                    : 'text-[#6F6F6B] bg-[#E5E5E3]'
                }`}
              >
                <span>Pro</span>
                <Zap className="h-2.5 w-2.5 fill-current" />
              </div>
            )}

            {!isComingSoon && !style.isPro && style.id === 'cards' && (
              <div className="absolute top-2 right-2 flex items-center gap-1 text-[10px] font-bold text-[#6F6F6B] bg-[#E5E5E3] px-1.5 py-0.5 rounded-full">
                <Zap className="h-2.5 w-2.5 fill-current" />
              </div>
            )}

            {/* PREVIEW ILLUSTRATIONS */}
            <div
              className={`h-16 w-full rounded-[10px] bg-[#EFEFEF] p-2 flex items-center justify-center relative overflow-hidden transition-opacity ${
                isComingSoon ? 'opacity-40 grayscale-[30%]' : ''
              }`}
            >
              {/* STYLE 1: CLASSIC PILL */}
              {style.id === 'classic' && (
                <div className="w-full bg-white rounded-full px-2 py-1.5 shadow-xs flex items-center gap-2 border border-[#E5E5E3]">
                  <div
                    className="h-4 w-4 rounded-full flex items-center justify-center shrink-0"
                    style={{ backgroundColor: `${platform.color}25`, color: platform.color }}
                  >
                    <PlatformIcon className="h-2.5 w-2.5" />
                  </div>
                  <div className="h-1.5 w-12 bg-[#1F1F1F]/40 rounded-full" />
                </div>
              )}

              {/* STYLE 2: CARDS / FAN */}
              {style.id === 'cards' && (
                <div className="w-full h-full relative flex items-center justify-center">
                  <div className="w-8 h-12 bg-white rounded-md shadow-xs rotate-[-12deg] absolute left-4 border border-[#E5E5E3]" />
                  <div className="w-8 h-12 bg-white rounded-md shadow-xs rotate-[12deg] absolute right-4 border border-[#E5E5E3]" />
                  <div className="w-10 h-13 bg-white rounded-md shadow-md z-10 flex flex-col p-1 border border-[#E5E5E3]">
                    <div className="flex-1 bg-black/10 rounded-xs mb-1" />
                    <div className="h-1 w-3/4 bg-black/40 rounded-full" />
                  </div>
                </div>
              )}

              {/* STYLE 3: GRID */}
              {style.id === 'grid' && (
                <div className="grid grid-cols-2 gap-1 w-full h-full p-1 bg-white rounded-md border border-[#E5E5E3]">
                  <div className="bg-black/15 rounded-xs" />
                  <div className="bg-black/15 rounded-xs" />
                </div>
              )}

              {/* STYLE 4: CAROUSEL */}
              {style.id === 'carousel' && (
                <div className="w-full h-full flex items-center gap-1 overflow-hidden">
                  <div className="w-10 h-12 bg-white rounded-md shrink-0 shadow-xs border border-[#E5E5E3]" />
                  <div className="w-10 h-12 bg-white rounded-md shrink-0 shadow-xs border border-[#E5E5E3]" />
                  <div className="w-10 h-12 bg-white rounded-md shrink-0 shadow-xs border border-[#E5E5E3]" />
                </div>
              )}

              {/* STYLE 5: PROFILE */}
              {style.id === 'profile' && (
                <div className="w-full h-full flex flex-col justify-between p-0.5">
                  <div className="flex items-center gap-1.5">
                    <div className="h-4 w-4 rounded-full bg-black/20" />
                    <div className="h-1 w-10 bg-black/40 rounded-full" />
                  </div>
                  <div className="grid grid-cols-3 gap-1">
                    <div className="h-4 bg-white rounded-xs border border-[#E5E5E3]" />
                    <div className="h-4 bg-white rounded-xs border border-[#E5E5E3]" />
                    <div className="h-4 bg-white rounded-xs border border-[#E5E5E3]" />
                  </div>
                </div>
              )}

              {/* STYLE 6: SINGLE */}
              {style.id === 'single' && (
                <div className="h-full w-14 bg-white rounded-md shadow-xs border border-[#E5E5E3] p-1 flex flex-col">
                  <div className="flex-1 bg-black/15 rounded-xs mb-1" />
                  <div className="h-1 w-2/3 bg-black/40 rounded-full" />
                </div>
              )}
            </div>

            {/* LABEL & CHECK INDICATOR */}
            <div className="flex items-center justify-between">
              <span
                className={`text-xs sm:text-sm font-bold transition-colors ${
                  isComingSoon ? 'text-[#8E8E89]' : 'text-[#1F1F1F]'
                }`}
              >
                {style.name}
              </span>
              {isSelected && (
                <div className="h-4 w-4 rounded-full bg-[#1F1F1F] text-white flex items-center justify-center">
                  <Check className="h-2.5 w-2.5" />
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

