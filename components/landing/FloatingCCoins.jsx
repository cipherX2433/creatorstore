'use client'

import React from 'react'
import { CreatorCoin } from './CCoin'

/**
 * FloatingCCoins — Clean composition of 4–5 solid Electric Blue (#194DF5) & Amber (#F9B67D)
 * flat 2D illustrated CreatorStore coins positioned around the centered hero.
 * 
 * Target Scale & Safety:
 * - Layered strictly on z-0 behind hero text, input, and CTA (z-10).
 * - Desktop/tablet responsive placement with safe margins.
 * - Solid and opaque, no glassmorphism, no glow effects.
 */
export default function FloatingCCoins() {
  return (
    <div
      className="absolute inset-0 pointer-events-none z-0 overflow-hidden select-none"
      aria-hidden="true"
    >
      {/* 1. TOP-LEFT: Prominent coin on desktop, safely tucked on tablet, hidden on narrow mobile */}
      <div className="hidden md:block absolute top-[6%] left-[24px] lg:left-[64px] xl:left-[90px]">
        <CreatorCoin
          size={220}
          rotation={-32}
          color="#194DF5"
          floatDuration="8.5s"
          floatDelay="0s"
          floatDistance="8px"
          className="scale-[0.8] lg:scale-100"
        />
      </div>

      {/* 2. TOP-RIGHT: Compact coin tucked in top corner on mobile, large on desktop */}
      <div className="absolute top-[2%] right-[10px] sm:top-[6%] sm:right-[32px] md:right-[50px] lg:right-[90px]">
        <CreatorCoin
          size={220}
          rotation={-26}
          color="#194DF5"
          floatDuration="9.5s"
          floatDelay="1.2s"
          floatDistance="8px"
          className="scale-[0.52] sm:scale-[0.75] md:scale-[0.9] lg:scale-100 origin-top-right"
        />
      </div>

      {/* 3. LOWER-LEFT: Compact coin in bottom corner on mobile, large on desktop */}
      <div className="absolute bottom-[2%] left-[8px] sm:bottom-[5%] sm:left-[24px] md:left-[45px] lg:left-[75px]">
        <CreatorCoin
          size={200}
          rotation={-30}
          color="#194DF5"
          floatDuration="10s"
          floatDelay="0.5s"
          floatDistance="8px"
          className="scale-[0.48] sm:scale-[0.7] md:scale-[0.88] lg:scale-100 origin-bottom-left"
        />
      </div>

      {/* 4. LOWER-RIGHT: Desktop & tablet only */}
      <div className="hidden md:block absolute bottom-[7%] right-[32px] lg:right-[75px]">
        <CreatorCoin
          size={200}
          rotation={-34}
          color="#194DF5"
          floatDuration="11s"
          floatDelay="1.8s"
          floatDistance="9px"
          className="scale-[0.88] lg:scale-100"
        />
      </div>

      {/* 5. RIGHT-MIDDLE / SUBTLE: Large desktop only */}
      <div className="hidden xl:block absolute top-[44%] right-[45px]">
        <CreatorCoin
          size={120}
          rotation={-20}
          color="#F9B67D"
          floatDuration="10.5s"
          floatDelay="2.5s"
          floatDistance="6px"
        />
      </div>
    </div>
  )
}

