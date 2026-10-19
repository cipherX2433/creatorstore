'use client'

import React, { useState, useEffect, useRef } from 'react'
import {
  Camera,
  Images,
  X,
  Share2,
  Send,
  Check,
  AlertCircle,
  ExternalLink,
} from 'lucide-react'
import { toast } from 'sonner'

export default function GalleryWizardModal({
  gallery,
  isOpen,
  onClose,
  creator,
  onProductClick,
}) {
  const [copied, setCopied] = useState(false)
  const [failedImages, setFailedImages] = useState({})
  const modalRef = useRef(null)
  const scrollRef = useRef(null)

  const title = gallery?.title || gallery?.props?.title || 'gallery'
  const caption = gallery?.caption || gallery?.props?.caption || ''
  const images = Array.isArray(gallery?.images)
    ? gallery.images
    : Array.isArray(gallery?.props?.images)
      ? gallery.props.images
      : []

  // Prevent background scrolling when modal is open
  useEffect(() => {
    if (isOpen) {
      const originalStyle = window.getComputedStyle(document.body).overflow
      document.body.style.overflow = 'hidden'
      return () => {
        document.body.style.overflow = originalStyle
      }
    }
  }, [isOpen])

  // Scroll to top and reset errors when opened or gallery changed
  useEffect(() => {
    if (isOpen) {
      setFailedImages({})
      if (scrollRef.current) {
        scrollRef.current.scrollTop = 0
      }
    }
  }, [isOpen, gallery?.id, gallery?.props?.title])

  // ESC key to close
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose?.()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  // Share gallery link
  async function handleShare() {
    const url = typeof window !== 'undefined' ? window.location.href : ''
    try {
      if (navigator.share) {
        await navigator.share({
          title,
          text: caption || `Check out ${title} on CreatorStore`,
          url,
        })
        return
      }
    } catch (err) {
      if (err?.name === 'AbortError') return
    }

    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      toast.success('Gallery link copied!')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Could not copy link')
    }
  }

  // Send / Email share
  function handleSend() {
    const url = typeof window !== 'undefined' ? window.location.href : ''
    const subject = encodeURIComponent(`Gallery: ${title}`)
    const body = encodeURIComponent(`Take a look at this gallery on CreatorStore:\n\n${title}\n${url}`)
    window.open(`mailto:?subject=${subject}&body=${body}`, '_blank')
  }

  function handleImageError(idx) {
    setFailedImages((prev) => ({ ...prev, [idx]: true }))
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/65 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose?.()
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="gallery-wizard-title"
    >
      <div
        ref={modalRef}
        className="relative w-full max-w-[480px] bg-white text-zinc-900 rounded-[32px] sm:rounded-[36px] shadow-2xl flex flex-col max-h-[88vh] sm:max-h-[85vh] overflow-hidden border border-zinc-100/90 font-sans animate-in zoom-in-95 duration-200 select-none"
      >
        {/* Top Header: Title and Photo Count */}
        <div className="pt-6 pb-4 px-6 text-center border-b border-zinc-100/80 shrink-0 bg-white z-10">
          <h2
            id="gallery-wizard-title"
            className="text-base sm:text-lg font-bold text-zinc-950 tracking-tight capitalize"
          >
            {title}
          </h2>
          <p className="text-xs text-zinc-500 font-medium flex items-center justify-center gap-1.5 mt-1">
            <Camera className="h-3.5 w-3.5 shrink-0 opacity-70" />
            <span>
              Gallery · {images.length} {images.length === 1 ? 'photo' : 'photos'}
            </span>
          </p>
          {caption && (
            <p className="text-xs text-zinc-600 mt-2 max-w-sm mx-auto line-clamp-2">
              {caption}
            </p>
          )}
        </div>

        {/* Scrollable Gallery Images Container with bottom padding for floating bar */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto px-5 py-4 pb-24 space-y-6 no-scrollbar"
        >
          {images.length === 0 ? (
            <div className="py-14 text-center text-zinc-400 space-y-2">
              <Images className="h-10 w-10 mx-auto opacity-40" />
              <p className="text-sm font-semibold text-zinc-700">Empty Gallery</p>
              <p className="text-xs text-zinc-400">No images have been added yet.</p>
            </div>
          ) : (
            images.map((img, idx) => {
              const isFailed = failedImages[idx]
              const imgTitle = img.title || img.name || ''
              const imgCaption = img.caption || ''
              const imgAlt = imgTitle || imgCaption || `${title} photo ${idx + 1}`

              return (
                <div key={img.id || img.url || idx} className="space-y-2.5">
                  {/* Image Card Container */}
                  <div className="w-full rounded-2xl overflow-hidden bg-zinc-100 border border-zinc-200/60 shadow-xs flex items-center justify-center relative">
                    {isFailed ? (
                      <div className="p-8 text-center text-zinc-400 flex flex-col items-center gap-2">
                        <AlertCircle className="h-8 w-8 text-zinc-300" />
                        <p className="text-xs font-medium text-zinc-500">Image unavailable</p>
                        {imgTitle && <p className="text-[11px] text-zinc-400 truncate max-w-xs">{imgTitle}</p>}
                      </div>
                    ) : (
                      <img
                        src={img.url}
                        alt={imgAlt}
                        className="w-full h-auto max-h-[62vh] object-contain select-none transition-all duration-300"
                        loading="lazy"
                        onError={() => handleImageError(idx)}
                      />
                    )}
                  </div>

                  {/* Caption / Title below image (matching Reference 1 e.g. 'aaa') */}
                  {(imgTitle || imgCaption) && (
                    <div className="px-1 text-left">
                      {imgTitle && (
                        <p className="text-sm sm:text-base font-bold text-zinc-950 leading-snug">
                          {imgTitle}
                        </p>
                      )}
                      {imgCaption && imgCaption !== imgTitle && (
                        <p className="text-xs text-zinc-500 mt-0.5 leading-relaxed">
                          {imgCaption}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Optional linked product action */}
                  {img.productId && onProductClick && (
                    <button
                      type="button"
                      onClick={() => onProductClick({ id: img.productId, title: imgTitle || imgCaption })}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:underline pt-0.5 px-1"
                    >
                      <span>View linked product</span>
                      <ExternalLink className="h-3 w-3" />
                    </button>
                  )}
                </div>
              )
            })
          )}
        </div>

        {/* Floating Action Bar matching Reference 1 (Pill on left + Send, Share, Close on right) */}
        <div className="absolute bottom-4 left-0 right-0 z-20 px-5 flex items-center justify-between pointer-events-none">
          {/* Left Black Pill with Gallery Title */}
          <div className="pointer-events-auto h-11 px-5 rounded-full bg-black text-white text-xs sm:text-sm font-bold flex items-center justify-center shadow-lg tracking-wide max-w-[200px] sm:max-w-[240px] truncate select-none">
            {title}
          </div>

          {/* Right Circular Action Buttons: Send, Share, Close */}
          <div className="pointer-events-auto flex items-center gap-2">
            <button
              type="button"
              onClick={handleSend}
              aria-label="Send gallery"
              title="Share via email"
              className="h-11 w-11 rounded-full bg-white border border-zinc-200/90 shadow-md flex items-center justify-center text-zinc-700 hover:text-black hover:bg-zinc-50 transition-all cursor-pointer active:scale-95"
            >
              <Send className="h-4 w-4" />
            </button>

            <button
              type="button"
              onClick={handleShare}
              aria-label="Share gallery link"
              title="Copy gallery link"
              className="h-11 w-11 rounded-full bg-white border border-zinc-200/90 shadow-md flex items-center justify-center text-zinc-700 hover:text-black hover:bg-zinc-50 transition-all cursor-pointer active:scale-95"
            >
              {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Share2 className="h-4 w-4" />}
            </button>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close gallery modal"
              title="Close"
              className="h-11 w-11 rounded-full bg-white border border-zinc-200/90 shadow-md flex items-center justify-center text-zinc-700 hover:text-black hover:bg-zinc-50 transition-all cursor-pointer active:scale-95"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
