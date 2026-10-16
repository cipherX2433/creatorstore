'use client'

import { X } from 'lucide-react'

export default function ThemeMatchModal({
  open,
  onClose,
  onApply,
  palette,
  avatarUrl,
  title,
  bio,
  products = [],
  sections = [],
}) {
  if (!open || !palette) return null

  // Extract top 2-3 real links or products from sections/products for the real preview
  const displayItems = []
  if (Array.isArray(sections)) {
    sections.forEach((s) => {
      if (s.type === 'button' && s.props?.label) {
        displayItems.push({ title: s.props.label, subtitle: s.props?.url || '' })
      }
    })
  }
  if (displayItems.length < 2 && Array.isArray(products)) {
    products.slice(0, 3).forEach((p) => {
      displayItems.push({ title: p.title, subtitle: p.price ? `$${p.price}` : '' })
    })
  }
  // Fallback items if store is completely empty
  if (displayItems.length === 0) {
    displayItems.push({ title: 'My Work & Portfolio' })
    displayItems.push({ title: 'Exclusive Content' })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/75 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Dialog Card */}
      <div className="relative w-full max-w-sm rounded-[28px] bg-[#1E2532] border border-white/15 shadow-2xl p-6 flex flex-col items-center z-10 animate-in fade-in zoom-in-95 duration-200">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 h-8 w-8 rounded-full bg-white/10 hover:bg-white/20 text-white/80 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          title="Close"
        >
          <X className="h-4 w-4" />
        </button>

        {/* 1. REAL LIVE PREVIEW CARD */}
        <div
          className="w-[210px] h-[290px] rounded-2xl overflow-hidden border border-white/15 shadow-xl relative flex flex-col select-none shrink-0"
          style={{ backgroundColor: palette.bg }}
        >
          {/* Top Hero Image with Soft Fade */}
          <div className="relative w-full h-[145px] shrink-0 overflow-hidden">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt=""
                className="w-full h-full object-cover object-center"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-b from-[#343D4B] to-[#1E2532]" />
            )}
            {/* Soft Dissolution Gradient into palette.bg */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background: `linear-gradient(to bottom, transparent 0%, transparent 35%, ${palette.bg}B3 70%, ${palette.bg} 100%)`,
              }}
            />
            {/* Real Creator Title & Bio */}
            <div className="absolute bottom-1 inset-x-0 px-2 text-center flex flex-col items-center">
              <span
                className="text-xs font-black tracking-tight truncate max-w-[190px]"
                style={{ color: palette.text }}
              >
                {title || 'Creator Store'}
              </span>
              {bio && (
                <span
                  className="text-[9px] font-medium truncate max-w-[180px] opacity-80"
                  style={{ color: palette.textSecondary }}
                >
                  {bio}
                </span>
              )}
            </div>
          </div>

          {/* Real Links / Products list styled with palette */}
          <div className="flex-1 px-3 py-2 flex flex-col gap-1.5 overflow-hidden">
            {displayItems.slice(0, 3).map((item, idx) => (
              <div
                key={idx}
                className="w-full py-2 px-2.5 rounded-lg flex items-center justify-between text-left shadow-xs transition-transform"
                style={{
                  backgroundColor: palette.surface,
                  border: `1px solid ${palette.border}`,
                }}
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  <span
                    className="h-4 w-4 rounded-full flex items-center justify-center shrink-0 text-[8px] font-bold"
                    style={{ backgroundColor: palette.bg, color: palette.text }}
                  >
                    ★
                  </span>
                  <span
                    className="text-[10px] font-bold truncate max-w-[130px]"
                    style={{ color: palette.text }}
                  >
                    {item.title}
                  </span>
                </div>
                <span
                  className="text-[9px] font-bold shrink-0"
                  style={{ color: palette.accent || palette.text }}
                >
                  →
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* 2. COPY SECTION */}
        <div className="text-center mt-5 space-y-1.5">
          <h3 className="text-lg sm:text-xl font-bold text-white tracking-tight">
            Update theme to match?
          </h3>
          <p className="text-xs text-white/70 max-w-[280px] mx-auto leading-relaxed">
            We&apos;ve created a fresh color scheme and selection of themes to match your new profile image.
          </p>
        </div>

        {/* 3. ACTION BUTTONS */}
        <div className="flex items-center gap-3 w-full mt-6">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 px-4 rounded-full border border-white/20 bg-white/10 hover:bg-white/15 text-white text-xs sm:text-sm font-semibold transition-colors cursor-pointer text-center"
          >
            Not right now
          </button>
          <button
            type="button"
            onClick={() => onApply(palette)}
            className="flex-1 py-2.5 px-4 rounded-full bg-white text-black hover:bg-white/90 text-xs sm:text-sm font-bold transition-opacity shadow-md cursor-pointer text-center"
          >
            Yes please
          </button>
        </div>
      </div>
    </div>
  )
}
