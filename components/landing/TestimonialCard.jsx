'use client'

import { Star } from 'lucide-react'

export default function TestimonialCard({ item, index = 0 }) {
  const { quote, name, username, initial, role } = item
  const displayInitial = initial || (name ? name.charAt(0).toUpperCase() : 'C')

  // Controlled Tonal Variation: White → Light Grey → Steel Blue → Black
  const variant = index % 4

  let cardClass = 'bg-white text-[#0D0D0D] border-[#E1E4E8]'
  let textClass = 'text-[#0D0D0D]'
  let metaClass = 'text-[#5F6873]'
  let dividerClass = 'bg-[#E1E4E8]'
  let avatarClass = 'bg-[#F5F6F8] text-[#26384A] border-[#E1E4E8]'

  if (variant === 1) {
    cardClass = 'bg-[#F5F6F8] text-[#0D0D0D] border-[#E1E4E8]'
    textClass = 'text-[#0D0D0D]'
    metaClass = 'text-[#5F6873]'
    dividerClass = 'bg-[#E1E4E8]'
    avatarClass = 'bg-white text-[#26384A] border-[#E1E4E8]'
  } else if (variant === 2) {
    cardClass = 'bg-[#26384A] text-white border-[#30465B]'
    textClass = 'text-[#F5F5F5]'
    metaClass = 'text-[#E7EEF4]/80'
    dividerClass = 'bg-[#30465B]'
    avatarClass = 'bg-white/15 text-white border-white/15'
  } else if (variant === 3) {
    cardClass = 'bg-[#0D0D0D] text-white border-white/10'
    textClass = 'text-[#F5F5F5]'
    metaClass = 'text-[#A3A7AE]'
    dividerClass = 'bg-white/10'
    avatarClass = 'bg-white/10 text-white border-white/10'
  }

  return (
    <div
      className={`w-[290px] sm:w-[340px] lg:w-[360px] h-[210px] sm:h-[220px] rounded-[22px] border ${cardClass} hover:-translate-y-0.5 transition-all duration-200 p-5 sm:p-6 flex flex-col justify-between shrink-0 select-none cursor-default shadow-sm`}
    >
      <div>
        {/* 5 Stars */}
        <div className="flex items-center gap-1 mb-3 text-[#194DF5]">
          {[...Array(5)].map((_, i) => (
            <Star
              key={i}
              className="h-3.5 w-3.5 sm:h-4 sm:w-4 fill-[#194DF5] text-[#194DF5]"
              aria-hidden="true"
            />
          ))}
        </div>

        {/* Quote Text */}
        <p className={`text-xs sm:text-[13.5px] lg:text-sm leading-relaxed font-medium line-clamp-3 ${textClass}`}>
          &ldquo;{quote}&rdquo;
        </p>
      </div>

      <div>
        <div className={`h-px w-full my-3 ${dividerClass}`} />

        {/* Creator Info Row */}
        <div className="flex items-center gap-3">
          <div className={`h-8 w-8 sm:h-9 sm:w-9 rounded-full font-bold text-xs sm:text-sm flex items-center justify-center shrink-0 border ${avatarClass}`}>
            {displayInitial}
          </div>

          <div className="min-w-0 flex-1">
            <p className={`text-xs sm:text-sm font-bold leading-tight truncate ${textClass}`}>
              {name}
            </p>
            <p className={`text-[11px] sm:text-xs mt-0.5 truncate ${metaClass}`}>
              {username || (role ? role : '')}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
