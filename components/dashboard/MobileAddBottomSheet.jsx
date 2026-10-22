'use client'

import React, { useState, useMemo, useEffect, useRef } from 'react'
import {
  X,
  Search,
  Folder,
  Link2,
  Tag,
  MessageSquare,
  Instagram,
  Youtube,
  Music2,
  Headphones,
  Video,
  FileText,
  Send,
  MessageCircle,
  Package,
  Layers,
  ChevronRight,
  Plus,
  Loader2
} from 'lucide-react'
import { BRAND_COLOR } from '@/components/brand/CreatorStoreBrand'

export const PRIMARY_ADD_OPTIONS = [
  {
    id: 'collection',
    label: 'Collection',
    icon: Folder,
  },
  {
    id: 'link',
    label: 'Link',
    icon: Link2,
  },
  {
    id: 'product',
    label: 'Product',
    icon: Tag,
  },
  {
    id: 'form',
    label: 'Form',
    icon: MessageSquare,
  },
]

export const SUGGESTED_ITEMS = [
  {
    id: 'messaging',
    type: 'form_contact',
    title: 'Messaging',
    description: 'Let visitors message you directly from your store',
    icon: Send,
    iconBg: 'bg-[#1F1F1F] text-white',
    keywords: 'message chat contact direct email inquiry',
  },
  {
    id: 'instagram',
    type: 'instagram',
    title: 'Instagram',
    description: 'Display your posts, reels, and profile',
    icon: Instagram,
    iconBg: 'bg-[#E1306C] text-white',
    keywords: 'instagram ig reels posts social feed',
  },
  {
    id: 'tiktok',
    type: 'add_tiktok',
    title: 'TikTok',
    description: 'Share your TikTok profile and videos',
    icon: Music2,
    iconBg: 'bg-[#000000] text-white',
    keywords: 'tiktok reels short video music',
  },
  {
    id: 'youtube',
    type: 'add_youtube',
    title: 'YouTube',
    description: 'Share YouTube videos or channel on your store',
    icon: Youtube,
    iconBg: 'bg-[#EF4444] text-white',
    keywords: 'youtube video stream yt channel',
  },
  {
    id: 'whatsapp',
    type: 'link',
    title: 'WhatsApp community',
    description: 'Connect with your audience on WhatsApp',
    icon: MessageCircle,
    iconBg: 'bg-[#22C55E] text-white',
    presetUrl: 'https://chat.whatsapp.com',
    keywords: 'whatsapp chat community group support',
  },
  {
    id: 'spotify',
    type: 'audio',
    title: 'Spotify & Music',
    description: 'Share your latest tracks, playlist, or podcast',
    icon: Headphones,
    iconBg: 'bg-[#1DB954] text-white',
    keywords: 'spotify music podcast audio tracks playlist',
  },
  {
    id: 'form_newsletter',
    type: 'form_newsletter',
    title: 'Email Newsletter',
    description: 'Grow your audience with newsletter subscriptions',
    icon: FileText,
    iconBg: 'bg-[#EC4899] text-white',
    keywords: 'newsletter subscribe email lead capture form',
  },
  {
    id: 'coaching_session',
    type: 'coaching',
    title: 'Book a session',
    description: 'Sell 1:1 sessions, consultations, and calls',
    icon: Video,
    iconBg: 'bg-[#A855F7] text-white',
    keywords: 'coaching booking call session consultation calendar',
  },
]

/**
 * MobileAddBottomSheet — Mobile Add bottom sheet matching Linktree reference Screenshot 3.
 * 
 * Features:
 * - Anchored to bottom of viewport with rounded top corners (rounded-t-[28px])
 * - Dim background overlay
 * - Drag handle at top
 * - Search / URL paste field: "Paste a link or search..."
 * - 4 Primary Add options in compact grid: Collection, Link, Product, Form
 * - Vertically scrollable Suggested items list with icons, titles, descriptions, and chevrons
 * - Proper backdrop close, Escape key support, body scroll locking
 */
export default function MobileAddBottomSheet({
  isOpen,
  onClose,
  onSelectOption, // (type: 'collection' | 'link' | 'product' | 'form' | other, payload?: any) => void
  onAddDirectUrl, // (url: string) => void
}) {
  const [search, setSearch] = useState('')
  const inputRef = useRef(null)

  // Lock body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
      setSearch('')
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  // Escape key listener
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape' && isOpen) {
        onClose?.()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  const isUrl = useMemo(() => {
    const s = search.trim()
    return Boolean(
      s.startsWith('http://') ||
      s.startsWith('https://') ||
      (s.includes('.') && !s.includes(' ') && s.length > 3)
    )
  }, [search])

  const filteredPrimary = useMemo(() => {
    if (!search.trim()) return PRIMARY_ADD_OPTIONS
    const q = search.toLowerCase()
    return PRIMARY_ADD_OPTIONS.filter((opt) => opt.label.toLowerCase().includes(q))
  }, [search])

  const filteredSuggested = useMemo(() => {
    if (!search.trim()) return SUGGESTED_ITEMS
    const q = search.toLowerCase()
    return SUGGESTED_ITEMS.filter((item) =>
      item.title.toLowerCase().includes(q) ||
      item.description.toLowerCase().includes(q) ||
      item.keywords.toLowerCase().includes(q)
    )
  }, [search])

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center md:hidden"
      role="dialog"
      aria-modal="true"
      aria-label="Add to Store"
    >
      {/* 1. DIM BACKDROP OVERLAY */}
      <div
        className="fixed inset-0 bg-black/45 transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* 2. SOLID BOTTOM SHEET CONTAINER */}
      <div
        className="relative w-full max-h-[85vh] bg-[#FFFFFF] text-[#222222] rounded-t-[28px] shadow-[0_-8px_32px_rgba(0,0,0,0.12)] z-10 flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-200"
        style={{
          paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 16px)',
        }}
      >
        {/* DRAG HANDLE */}
        <div className="pt-2.5 pb-1 flex justify-center shrink-0">
          <div className="w-10 h-1 bg-[#E8E8E8] rounded-full" />
        </div>

        {/* VISIBLE TITLE BAR WITH CLOSE ACTION */}
        <div className="flex items-center justify-between px-5 pt-1 pb-2 shrink-0">
          <h2 className="text-base font-bold text-[#222222] tracking-tight">Add to store</h2>
          <button
            type="button"
            onClick={onClose}
            className="w-11 h-11 -mr-2 rounded-full text-[#777777] hover:text-[#222222] hover:bg-[#F2F2F2] active:scale-95 transition-all flex items-center justify-center cursor-pointer"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* SEARCH & URL INPUT */}
        <div className="px-5 pt-0 pb-3 shrink-0">
          <div className="relative flex items-center w-full h-12 rounded-full bg-[#F2F2F2] border border-[#E8E8E8] px-4 transition-all focus-within:border-[#222222] focus-within:ring-1 focus-within:ring-[#222222]">
            <Search className="h-4.5 w-4.5 text-[#777777] shrink-0 mr-2.5" />
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Paste a link or search..."
              className="w-full bg-transparent border-none outline-none text-[#222222] placeholder:text-[#777777] text-[15px] font-medium"
              autoComplete="off"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck="false"
            />
            {search ? (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="w-8 h-8 rounded-full text-[#777777] hover:text-[#222222] hover:bg-[#E8E8E8] transition-colors ml-1 cursor-pointer shrink-0 flex items-center justify-center"
              >
                <X className="h-4 w-4" />
              </button>
            ) : null}
          </div>
        </div>

        {/* SCROLLABLE SHEET CONTENT */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-5 py-2 space-y-5">

          {/* A. URL DETECTED ACTION */}
          {isUrl && (
            <div className="pb-1">
              <button
                type="button"
                onClick={() => {
                  onSelectOption?.('link_direct', { url: search.trim() })
                  onClose?.()
                }}
                className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-[#F2F2F2] hover:bg-[#E8E8E8] active:scale-[0.98] transition-all cursor-pointer group text-left border border-[#E8E8E8]"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="h-10 w-10 rounded-full bg-[#22C55E] flex items-center justify-center text-white shrink-0">
                    <Plus className="h-5 w-5 stroke-[2.5]" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[14px] font-bold text-[#222222] truncate">
                      Add link: <span className="font-normal text-[#777777]">{search.trim()}</span>
                    </p>
                    <p className="text-xs text-[#777777]">Tap to configure this link</p>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-[#777777] group-hover:text-[#222222] group-hover:translate-x-0.5 transition-all shrink-0 ml-2" />
              </button>
            </div>
          )}

          {/* B. PRIMARY 4 ADD OPTIONS (Collection, Link, Product, Form) */}
          <div className="grid grid-cols-4 gap-2.5">
            {filteredPrimary.map((opt) => {
              const Icon = opt.icon
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => {
                    onSelectOption?.(opt.id)
                    onClose?.()
                  }}
                  className="flex flex-col items-center justify-center h-[82px] p-2 rounded-2xl bg-[#F2F2F2] hover:bg-[#E8E8E8] active:scale-[0.96] transition-all cursor-pointer group border border-[#E8E8E8] select-none shadow-2xs"
                >
                  <Icon className="h-6 w-6 text-[#222222] stroke-[1.8] group-hover:scale-105 transition-transform" />
                  <span className="text-[12px] font-semibold text-[#222222] mt-2 tracking-tight">
                    {opt.label}
                  </span>
                </button>
              )
            })}
          </div>

          {/* C. SUGGESTED ITEMS SECTION */}
          {filteredSuggested.length > 0 && (
            <div className="space-y-2 pt-1">
              <h3 className="text-xs font-bold text-[#777777] uppercase tracking-wider px-0.5">
                Suggested
              </h3>

              <div className="divide-y divide-[#E8E8E8] rounded-2xl bg-[#FFFFFF] border border-[#E8E8E8] overflow-hidden shadow-2xs">
                {filteredSuggested.map((item) => {
                  const Icon = item.icon
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        onSelectOption?.(item.type, item)
                        onClose?.()
                      }}
                      className="w-full flex items-center justify-between p-3.5 hover:bg-[#F2F2F2] active:bg-[#E8E8E8] transition-colors group text-left cursor-pointer min-h-[56px]"
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 ${item.iconBg}`}>
                          <Icon className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[14px] font-bold text-[#222222] truncate">
                            {item.title}
                          </p>
                          <p className="text-xs text-[#777777] truncate">
                            {item.description}
                          </p>
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-[#777777] group-hover:text-[#222222] group-hover:translate-x-0.5 transition-all shrink-0 ml-2" />
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Empty search state */}
          {filteredPrimary.length === 0 && filteredSuggested.length === 0 && (
            <div className="text-center py-8 text-sm text-[#71717A]">
              No options matching &ldquo;{search}&rdquo;
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
