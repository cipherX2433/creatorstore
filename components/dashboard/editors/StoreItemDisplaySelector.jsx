'use client'

import React from 'react'
import { Zap, Images, Package, Link2 } from 'lucide-react'

export default function StoreItemDisplaySelector({
  value = 'classic',
  onChange,
  thumbnail = null,
  itemType = 'generic', // 'product' | 'gallery' | 'link'
  title = 'Display',
  subtitle = 'How you display your content on your storefront.',
}) {
  const isClassic = value === 'classic'
  const isFeatured = value === 'featured'

  const FallbackIcon = itemType === 'gallery' ? Images : itemType === 'link' ? Link2 : Package

  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-base sm:text-[17px] font-bold text-[#1F1F1F]">{title}</h3>
        {subtitle && (
          <p className="text-xs sm:text-[13px] text-[#6F6F6B] mt-0.5">{subtitle}</p>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* OPTION 1: CLASSIC */}
        <div
          onClick={() => onChange('classic')}
          className={`rounded-[12px] p-4 transition-all cursor-pointer flex flex-col justify-between gap-3 ${
            isClassic
              ? 'border-2 border-[#1F1F1F] bg-[#FFFFFF] shadow-sm'
              : 'border border-[#D9D9D9] bg-[#FFFFFF] hover:border-[#999995]'
          }`}
        >
          {/* Visual Diagram for Classic */}
          <div className="h-20 w-full rounded-lg bg-[#F5F5F3] border border-[#E5E5E3] flex items-center justify-center px-4">
            <div className="w-full h-9 rounded-lg bg-white border border-[#E5E5E3] px-2.5 flex items-center gap-2 shadow-xs">
              <div className="h-5 w-5 rounded-md bg-[#1F1F1F]/15 shrink-0 overflow-hidden flex items-center justify-center">
                {thumbnail ? (
                  <img src={thumbnail} alt="" className="h-full w-full object-cover" />
                ) : (
                  <FallbackIcon className="h-3 w-3 text-[#1F1F1F]/40" />
                )}
              </div>
              <div className="h-2 w-20 rounded bg-[#1F1F1F]/30" />
              <div className="ml-auto h-2 w-6 rounded bg-[#1F1F1F]/20" />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-[#1F1F1F]">Classic</p>
              <p className="text-xs text-[#6F6F6B]">Clean compact link pill</p>
            </div>
            <div
              className={`h-4 w-4 rounded-full border flex items-center justify-center ${
                isClassic
                  ? 'border-[#1F1F1F] bg-[#1F1F1F]'
                  : 'border-[#999995]'
              }`}
            >
              {isClassic && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
            </div>
          </div>
        </div>

        {/* OPTION 2: FEATURED */}
        <div
          onClick={() => onChange('featured')}
          className={`rounded-[12px] p-4 transition-all cursor-pointer flex flex-col justify-between gap-3 ${
            isFeatured
              ? 'border-2 border-[#1F1F1F] bg-[#FFFFFF] shadow-sm'
              : 'border border-[#D9D9D9] bg-[#FFFFFF] hover:border-[#999995]'
          }`}
        >
          {/* Visual Diagram for Featured */}
          <div className="h-20 w-full rounded-lg bg-[#F5F5F3] border border-[#E5E5E3] flex flex-col overflow-hidden shadow-xs">
            <div className="h-11 w-full bg-[#1F1F1F]/15 overflow-hidden flex items-center justify-center relative">
              {thumbnail ? (
                <img src={thumbnail} alt="" className="h-full w-full object-cover" />
              ) : (
                <FallbackIcon className="h-4 w-4 text-[#1F1F1F]/40" />
              )}
              <div className="absolute top-1 right-1 h-3.5 w-3.5 rounded-full bg-white/80 flex items-center justify-center shadow-xs">
                <Zap className="h-2 w-2 text-[#D97706]" />
              </div>
            </div>
            <div className="h-9 w-full bg-white px-2.5 flex items-center gap-2">
              <div className="h-2 w-16 rounded bg-[#1F1F1F]/30" />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-[#1F1F1F]">Featured</p>
              <p className="text-xs text-[#6F6F6B]">Prominent showcase card</p>
            </div>
            <div
              className={`h-4 w-4 rounded-full border flex items-center justify-center ${
                isFeatured
                  ? 'border-[#1F1F1F] bg-[#1F1F1F]'
                  : 'border-[#999995]'
              }`}
            >
              {isFeatured && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
