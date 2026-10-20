'use client'

import React, { useState } from 'react'
import {
  X,
  Zap,
  MoreVertical,
  Check,
  ChevronRight,
  ExternalLink,
  Loader2,
  Sparkles,
} from 'lucide-react'
import {
  getSocialPlatform,
  SOCIAL_DISPLAY_STYLES,
} from '@/lib/socialPlatforms'

export default function SocialDisplaySelectModalView({
  platformId,
  platform: platformProp,
  store = {},
  theme = {},
  tokens = {},
  canCreate = true,
  isPro = false,
  onConfirm,
  onSelectStyle,
  onCancel,
  onOpenPricing,
}) {
  const rawId = platformId || (typeof platformProp === 'string' ? platformProp : platformProp?.id) || 'instagram'
  const platform = getSocialPlatform(rawId)
  const PlatformIcon = platform.icon

  const [selectedStyle, setSelectedStyle] = useState('classic')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const activeStyleConfig =
    SOCIAL_DISPLAY_STYLES.find((s) => s.id === selectedStyle) || SOCIAL_DISPLAY_STYLES[0]

  const isProLocked = activeStyleConfig.isPro && !isPro

  const handleAction = async () => {
    if (isProLocked) {
      onOpenPricing?.()
      return
    }
    setIsSubmitting(true)
    try {
      if (onSelectStyle) {
        await onSelectStyle(selectedStyle === 'cards' ? 'image' : selectedStyle)
      } else if (onConfirm) {
        await onConfirm({
          style: selectedStyle === 'cards' ? 'image' : selectedStyle,
          displayMode: selectedStyle === 'cards' ? 'image' : selectedStyle,
          platform: platform.id,
          title: platform.name,
        })
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  // Realistic sample photos for preview
  const samplePhotos = [
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&q=80',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&q=80',
    'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&q=80',
  ]

  return (
    <div className="flex flex-col flex-1 h-full min-h-[500px]">
      {/* TWO-COLUMN BODY (SCROLLABLE) */}
      <div className="flex-1 overflow-y-auto no-scrollbar p-4 sm:p-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* LEFT COLUMN: STYLE SELECTION */}
          <div className="lg:col-span-6 space-y-4">
            <div>
              <h4 className="text-lg font-bold text-[#1F1F1F]">Display</h4>
              <p className="text-xs sm:text-sm text-[#6F6F6B] mt-1">
                Drive engagement by showcasing your {platform.name}, your way
              </p>
            </div>

            {/* 6 DISPLAY TILES GRID (2 cols x 3 rows) */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              {/* STYLE 1: CLASSIC */}
              <div
                id="social-style-classic-btn"
                onClick={() => setSelectedStyle('classic')}
                className={`p-3.5 rounded-[16px] border-2 transition-all cursor-pointer flex flex-col justify-between gap-3 relative ${
                  selectedStyle === 'classic'
                    ? 'border-[#1F1F1F] bg-[#FFFFFF] shadow-sm ring-1 ring-[#1F1F1F]'
                    : 'border-[#E5E5E3] bg-[#F9F9F8] hover:border-[#999995]'
                }`}
              >
                <div className="h-16 w-full rounded-[10px] bg-[#EFEFEF] p-2 flex items-center justify-center">
                  <div className="w-full bg-white rounded-full px-2 py-1.5 shadow-xs flex items-center gap-2 border border-[#E5E5E3]">
                    <div
                      className="h-4 w-4 rounded-full flex items-center justify-center shrink-0"
                      style={{ backgroundColor: `${platform.color}25`, color: platform.color }}
                    >
                      <PlatformIcon className="h-2.5 w-2.5" />
                    </div>
                    <div className="h-1.5 w-12 bg-[#1F1F1F]/40 rounded-full" />
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs sm:text-sm font-bold text-[#1F1F1F]">Classic</span>
                  {selectedStyle === 'classic' && (
                    <div className="h-4 w-4 rounded-full bg-[#1F1F1F] text-white flex items-center justify-center">
                      <Check className="h-2.5 w-2.5" />
                    </div>
                  )}
                </div>
              </div>

              {/* STYLE 2: CARDS / IMAGE */}
              <div
                id="social-style-cards-btn"
                onClick={() => setSelectedStyle('cards')}
                className={`p-3.5 rounded-[16px] border-2 transition-all cursor-pointer flex flex-col justify-between gap-3 relative ${
                  selectedStyle === 'cards'
                    ? 'border-[#1F1F1F] bg-[#FFFFFF] shadow-sm ring-1 ring-[#1F1F1F]'
                    : 'border-[#E5E5E3] bg-[#F9F9F8] hover:border-[#999995]'
                }`}
              >
                <div className="absolute top-2 right-2 flex items-center gap-1 text-[10px] font-bold text-[#6F6F6B] bg-[#E5E5E3] px-1.5 py-0.5 rounded-full">
                  <Zap className="h-2.5 w-2.5 fill-current" />
                </div>
                <div className="h-16 w-full rounded-[10px] bg-[#EFEFEF] p-2 flex items-center justify-center relative overflow-hidden">
                  <div className="w-8 h-12 bg-white rounded-md shadow-xs rotate-[-12deg] absolute left-4 border border-[#E5E5E3]" />
                  <div className="w-8 h-12 bg-white rounded-md shadow-xs rotate-[12deg] absolute right-4 border border-[#E5E5E3]" />
                  <div className="w-10 h-13 bg-white rounded-md shadow-md z-10 flex flex-col p-1 border border-[#E5E5E3]">
                    <div className="flex-1 bg-black/10 rounded-xs mb-1" />
                    <div className="h-1 w-3/4 bg-black/40 rounded-full" />
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs sm:text-sm font-bold text-[#1F1F1F]">Cards</span>
                  {selectedStyle === 'cards' && (
                    <div className="h-4 w-4 rounded-full bg-[#1F1F1F] text-white flex items-center justify-center">
                      <Check className="h-2.5 w-2.5" />
                    </div>
                  )}
                </div>
              </div>

              {/* STYLE 3: GRID (PRO) */}
              <div
                id="social-style-grid-btn"
                onClick={() => setSelectedStyle('grid')}
                className={`p-3.5 rounded-[16px] border-2 transition-all cursor-pointer flex flex-col justify-between gap-3 relative ${
                  selectedStyle === 'grid'
                    ? 'border-[#1F1F1F] bg-[#FFFFFF] shadow-sm ring-1 ring-[#1F1F1F]'
                    : 'border-[#E5E5E3] bg-[#F9F9F8] hover:border-[#999995]'
                }`}
              >
                <div className="absolute top-2 right-2 flex items-center gap-0.5 text-[10px] font-bold text-[#7C3AED] bg-[#EDE9FE] px-1.5 py-0.5 rounded-full">
                  <span>Pro</span>
                  <Zap className="h-2.5 w-2.5 fill-current" />
                </div>
                <div className="h-16 w-full rounded-[10px] bg-[#EFEFEF] p-2 flex items-center justify-center">
                  <div className="grid grid-cols-2 gap-1 w-full h-full p-1 bg-white rounded-md border border-[#E5E5E3]">
                    <div className="bg-black/15 rounded-xs" />
                    <div className="bg-black/15 rounded-xs" />
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs sm:text-sm font-bold text-[#1F1F1F]">Grid</span>
                  {selectedStyle === 'grid' && (
                    <div className="h-4 w-4 rounded-full bg-[#1F1F1F] text-white flex items-center justify-center">
                      <Check className="h-2.5 w-2.5" />
                    </div>
                  )}
                </div>
              </div>

              {/* STYLE 4: CAROUSEL (PRO) */}
              <div
                id="social-style-carousel-btn"
                onClick={() => setSelectedStyle('carousel')}
                className={`p-3.5 rounded-[16px] border-2 transition-all cursor-pointer flex flex-col justify-between gap-3 relative ${
                  selectedStyle === 'carousel'
                    ? 'border-[#1F1F1F] bg-[#FFFFFF] shadow-sm ring-1 ring-[#1F1F1F]'
                    : 'border-[#E5E5E3] bg-[#F9F9F8] hover:border-[#999995]'
                }`}
              >
                <div className="absolute top-2 right-2 flex items-center gap-1 text-[10px] font-bold text-[#6F6F6B] bg-[#E5E5E3] px-1.5 py-0.5 rounded-full">
                  <Zap className="h-2.5 w-2.5 fill-current" />
                </div>
                <div className="h-16 w-full rounded-[10px] bg-[#EFEFEF] p-2 flex items-center gap-1 overflow-hidden">
                  <div className="w-10 h-12 bg-white rounded-md shrink-0 shadow-xs border border-[#E5E5E3]" />
                  <div className="w-10 h-12 bg-white rounded-md shrink-0 shadow-xs border border-[#E5E5E3]" />
                  <div className="w-10 h-12 bg-white rounded-md shrink-0 shadow-xs border border-[#E5E5E3]" />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs sm:text-sm font-bold text-[#1F1F1F]">Carousel</span>
                  {selectedStyle === 'carousel' && (
                    <div className="h-4 w-4 rounded-full bg-[#1F1F1F] text-white flex items-center justify-center">
                      <Check className="h-2.5 w-2.5" />
                    </div>
                  )}
                </div>
              </div>

              {/* STYLE 5: PROFILE (PRO) */}
              <div
                id="social-style-profile-btn"
                onClick={() => setSelectedStyle('profile')}
                className={`p-3.5 rounded-[16px] border-2 transition-all cursor-pointer flex flex-col justify-between gap-3 relative ${
                  selectedStyle === 'profile'
                    ? 'border-[#1F1F1F] bg-[#FFFFFF] shadow-sm ring-1 ring-[#1F1F1F]'
                    : 'border-[#E5E5E3] bg-[#F9F9F8] hover:border-[#999995]'
                }`}
              >
                <div className="absolute top-2 right-2 flex items-center gap-1 text-[10px] font-bold text-[#6F6F6B] bg-[#E5E5E3] px-1.5 py-0.5 rounded-full">
                  <Zap className="h-2.5 w-2.5 fill-current" />
                </div>
                <div className="h-16 w-full rounded-[10px] bg-[#EFEFEF] p-2 flex flex-col justify-between">
                  <div className="flex items-center gap-1.5">
                    <div className="h-5 w-5 rounded-full bg-black/20" />
                    <div className="h-1.5 w-12 bg-black/40 rounded-full" />
                  </div>
                  <div className="grid grid-cols-3 gap-1">
                    <div className="h-4 bg-white rounded-xs border border-[#E5E5E3]" />
                    <div className="h-4 bg-white rounded-xs border border-[#E5E5E3]" />
                    <div className="h-4 bg-white rounded-xs border border-[#E5E5E3]" />
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs sm:text-sm font-bold text-[#1F1F1F]">Profile</span>
                  {selectedStyle === 'profile' && (
                    <div className="h-4 w-4 rounded-full bg-[#1F1F1F] text-white flex items-center justify-center">
                      <Check className="h-2.5 w-2.5" />
                    </div>
                  )}
                </div>
              </div>

              {/* STYLE 6: SINGLE (PRO) */}
              <div
                id="social-style-single-btn"
                onClick={() => setSelectedStyle('single')}
                className={`p-3.5 rounded-[16px] border-2 transition-all cursor-pointer flex flex-col justify-between gap-3 relative ${
                  selectedStyle === 'single'
                    ? 'border-[#1F1F1F] bg-[#FFFFFF] shadow-sm ring-1 ring-[#1F1F1F]'
                    : 'border-[#E5E5E3] bg-[#F9F9F8] hover:border-[#999995]'
                }`}
              >
                <div className="absolute top-2 right-2 flex items-center gap-1 text-[10px] font-bold text-[#6F6F6B] bg-[#E5E5E3] px-1.5 py-0.5 rounded-full">
                  <Zap className="h-2.5 w-2.5 fill-current" />
                </div>
                <div className="h-16 w-full rounded-[10px] bg-[#EFEFEF] p-2 flex items-center justify-center">
                  <div className="h-full w-14 bg-white rounded-md shadow-xs border border-[#E5E5E3] p-1 flex flex-col">
                    <div className="flex-1 bg-black/15 rounded-xs mb-1" />
                    <div className="h-1 w-2/3 bg-black/40 rounded-full" />
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs sm:text-sm font-bold text-[#1F1F1F]">Single</span>
                  {selectedStyle === 'single' && (
                    <div className="h-4 w-4 rounded-full bg-[#1F1F1F] text-white flex items-center justify-center">
                      <Check className="h-2.5 w-2.5" />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: STOREFRONT LIVE PREVIEW */}
          <div className="lg:col-span-6 flex flex-col items-center justify-center min-h-[380px] p-6 rounded-[24px] bg-[#F5F5F3] border border-[#E5E5E3]">
            <div className="w-full max-w-[340px] flex flex-col items-center justify-center transition-all duration-300">
              {/* PREVIEW 1: CLASSIC PILL */}
              {selectedStyle === 'classic' && (
                <div className="w-full p-3.5 rounded-full bg-white border border-[#E5E5E3] shadow-sm flex items-center justify-between gap-3 hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="h-10 w-10 rounded-full flex items-center justify-center shrink-0"
                      style={{ backgroundColor: `${platform.color}15`, color: platform.color }}
                    >
                      <PlatformIcon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="text-sm font-bold text-[#1F1F1F] truncate">
                        {platform.name}
                      </h4>
                      <p className="text-xs text-[#6F6F6B] truncate">
                        @yourhandle · Connect
                      </p>
                    </div>
                  </div>
                  <MoreVertical className="h-4 w-4 text-[#999995] shrink-0" />
                </div>
              )}

              {/* PREVIEW 2: CARDS / IMAGE */}
              {selectedStyle === 'cards' && (
                <div className="w-full p-4 rounded-[20px] bg-white border border-[#E5E5E3] shadow-md space-y-3.5">
                  {/* Fan of stacked photos */}
                  <div className="h-44 w-full relative flex items-center justify-center">
                    <img
                      src={samplePhotos[0]}
                      alt=""
                      className="w-28 h-36 object-cover rounded-xl shadow-md rotate-[-12deg] absolute left-3 border border-white"
                    />
                    <img
                      src={samplePhotos[1]}
                      alt=""
                      className="w-28 h-36 object-cover rounded-xl shadow-md rotate-[12deg] absolute right-3 border border-white"
                    />
                    <div className="w-32 h-40 object-cover rounded-xl shadow-xl z-10 relative overflow-hidden border-2 border-white">
                      <img
                        src={samplePhotos[2]}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                      <div
                        className="absolute bottom-2 right-2 h-6 w-6 rounded-full flex items-center justify-center shadow"
                        style={{ backgroundColor: platform.color, color: '#FFFFFF' }}
                      >
                        <PlatformIcon className="h-3.5 w-3.5" />
                      </div>
                    </div>
                  </div>

                  <div className="text-center space-y-1">
                    <h4 className="text-sm font-bold text-[#1F1F1F]">{platform.name}</h4>
                    <p className="text-xs text-[#6F6F6B]">@{platform.id}_official</p>
                  </div>

                  <button
                    type="button"
                    className="w-full py-2 px-4 rounded-full text-xs font-semibold text-white shadow-xs transition-opacity hover:opacity-95"
                    style={{ backgroundColor: platform.color }}
                  >
                    Follow on {platform.name}
                  </button>
                </div>
              )}

              {/* PREVIEW 3: GRID (PRO) */}
              {selectedStyle === 'grid' && (
                <div className="w-full p-4 rounded-[20px] bg-white border border-[#E5E5E3] shadow-md space-y-3">
                  <div className="grid grid-cols-3 gap-1.5 rounded-xl overflow-hidden aspect-[3/1.2]">
                    {samplePhotos.map((img, i) => (
                      <img key={i} src={img} alt="" className="w-full h-full object-cover" />
                    ))}
                  </div>
                  <div className="flex items-center justify-between pt-1">
                    <div className="flex items-center gap-2">
                      <div
                        className="h-7 w-7 rounded-full flex items-center justify-center"
                        style={{ backgroundColor: `${platform.color}20`, color: platform.color }}
                      >
                        <PlatformIcon className="h-4 w-4" />
                      </div>
                      <span className="text-xs font-bold text-[#1F1F1F]">{platform.name}</span>
                    </div>
                    <button
                      type="button"
                      className="py-1 px-3 rounded-full text-[11px] font-semibold text-white"
                      style={{ backgroundColor: platform.color }}
                    >
                      Follow
                    </button>
                  </div>
                </div>
              )}

              {/* PREVIEW 4: CAROUSEL (PRO) */}
              {selectedStyle === 'carousel' && (
                <div className="w-full p-4 rounded-[20px] bg-white border border-[#E5E5E3] shadow-md space-y-3">
                  <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
                    {samplePhotos.map((img, i) => (
                      <div key={i} className="h-28 w-24 rounded-xl overflow-hidden shrink-0 shadow-xs border border-[#E5E5E3]">
                        <img src={img} alt="" className="w-full h-full object-cover" />
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#1F1F1F]">{platform.name}</span>
                    <button
                      type="button"
                      className="py-1 px-3 rounded-full text-[11px] font-semibold text-white"
                      style={{ backgroundColor: platform.color }}
                    >
                      Follow
                    </button>
                  </div>
                </div>
              )}

              {/* PREVIEW 5: PROFILE (PRO) */}
              {selectedStyle === 'profile' && (
                <div className="w-full p-4 rounded-[20px] bg-white border border-[#E5E5E3] shadow-md space-y-3">
                  <div className="grid grid-cols-3 gap-1 rounded-xl overflow-hidden h-20">
                    {samplePhotos.map((img, i) => (
                      <img key={i} src={img} alt="" className="w-full h-full object-cover" />
                    ))}
                  </div>
                  <div className="flex items-center justify-around text-center py-1">
                    <div>
                      <p className="text-xs font-bold text-[#1F1F1F]">86</p>
                      <p className="text-[10px] text-[#6F6F6B]">Posts</p>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-[#1F1F1F]">1,248</p>
                      <p className="text-[10px] text-[#6F6F6B]">Followers</p>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-[#1F1F1F]">412</p>
                      <p className="text-[10px] text-[#6F6F6B]">Following</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="w-full py-2 px-3 rounded-full text-xs font-semibold text-white"
                    style={{ backgroundColor: platform.color }}
                  >
                    Follow on {platform.name}
                  </button>
                </div>
              )}

              {/* PREVIEW 6: SINGLE (PRO) */}
              {selectedStyle === 'single' && (
                <div className="w-full p-4 rounded-[20px] bg-white border border-[#E5E5E3] shadow-md space-y-3">
                  <div className="h-44 w-full rounded-xl overflow-hidden shadow-xs border border-[#E5E5E3]">
                    <img src={samplePhotos[0]} alt="" className="w-full h-full object-cover" />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#1F1F1F]">{platform.name} Post</span>
                    <button
                      type="button"
                      className="py-1 px-3 rounded-full text-[11px] font-semibold text-white"
                      style={{ backgroundColor: platform.color }}
                    >
                      View
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 3. FIXED BOTTOM ACTION BAR */}
      <div className="p-4 sm:p-5 border-t border-[#E5E5E3] bg-white shrink-0 flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          className="px-5 py-2.5 rounded-full border border-[#D9D9D9] bg-white hover:bg-[#F5F5F3] text-sm font-semibold text-[#1F1F1F] transition-all cursor-pointer"
        >
          Cancel
        </button>

        <button
          id="social-modal-confirm-btn"
          type="button"
          onClick={handleAction}
          disabled={isSubmitting}
          className={`px-7 py-2.5 rounded-full text-sm font-semibold transition-all cursor-pointer shadow-md inline-flex items-center gap-2 ${
            isProLocked
              ? 'bg-[#7C3AED] hover:bg-[#6D28D9] text-white'
              : 'bg-[#1F1F1F] hover:bg-black text-white'
          }`}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Adding...</span>
            </>
          ) : isProLocked ? (
            <>
              <Zap className="h-4 w-4 fill-current text-yellow-300" />
              <span>Try Pro free for 7 days</span>
            </>
          ) : (
            <span>Add to my store</span>
          )}
        </button>
      </div>
    </div>
  )
}
