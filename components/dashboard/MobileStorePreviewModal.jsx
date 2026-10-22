'use client'

import React, { useEffect } from 'react'
import { ArrowLeft, ExternalLink, Share2, Eye } from 'lucide-react'
import StorePreview from '@/components/storefront/StorePreview'

/**
 * MobileStorePreviewModal — Full-screen mobile storefront preview matching Screenshot 4.
 * 
 * Reuses existing public storefront rendering logic (StorePreview / PublicStoreRenderer)
 * with real theme, products, links, and styling.
 */
export default function MobileStorePreviewModal({
  isOpen,
  onClose,
  store,
  storeSlug,
  profile,
  products,
  pages,
  activePageId,
  onSelectPage,
  onShare,
}) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  if (!isOpen) return null

  const liveUrl = typeof window !== 'undefined' && storeSlug
    ? `${window.location.origin}/${storeSlug}`
    : `/${storeSlug || 'store'}`

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-[#FBFAF9] text-[#1F1F1F] md:hidden overflow-hidden"
      role="dialog"
      aria-modal="true"
      aria-label="Mobile Storefront Preview"
    >
      {/* 1. TOP PREVIEW HEADER (Matching Screenshot 4) */}
      <div className="flex items-center justify-between px-4 h-14 border-b border-[#E5E5E3] bg-[#FFFFFF] shrink-0">
        <button
          type="button"
          onClick={onClose}
          className="flex items-center gap-2 p-1.5 -ml-1.5 rounded-full text-[#1F1F1F] hover:bg-[#F2F1EF] transition-colors cursor-pointer"
        >
          <ArrowLeft className="h-5 w-5 stroke-[2.2]" />
          <span className="text-base font-bold text-[#1F1F1F]">Preview</span>
        </button>

        <div className="flex items-center gap-2">
          {onShare && (
            <button
              type="button"
              onClick={onShare}
              className="p-2 rounded-full text-[#71717A] hover:text-[#1F1F1F] hover:bg-[#F2F1EF] transition-colors cursor-pointer"
              title="Share store"
            >
              <Share2 className="h-4.5 w-4.5 stroke-[1.8]" />
            </button>
          )}

          <a
            href={liveUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#1F1F1F] text-white text-xs font-bold transition-all shadow-2xs hover:bg-black"
          >
            <span>View live</span>
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </div>

      {/* 2. LIVE PREVIEW STORE RENDERER */}
      <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar bg-[#FBFAF9]">
        <div className="max-w-[420px] mx-auto min-h-full flex flex-col">
          <StorePreview
            device="mobile"
            editor
            store={store}
            username={storeSlug}
            profile={{
              ...(profile || {}),
              username: storeSlug || profile?.username,
              avatarUrl: store?.theme?.avatarUrl || store?.avatarUrl || profile?.avatarUrl,
              bio: store?.bio || profile?.bio,
            }}
            products={products}
            pages={pages}
            activePageId={activePageId}
            onSelectPage={onSelectPage}
          />
        </div>
      </div>
    </div>
  )
}
