'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { Check, ChevronRight, X, ExternalLink } from 'lucide-react'
import { api } from '@/lib/clientApi'
import { useDashboard } from '@/components/dashboard/DashboardContext'

export default function SidebarTaskProgress({ collapsed = false, onNavClick }) {
  const router = useRouter()
  const pathname = usePathname()
  const { me, refreshMe } = useDashboard()

  const [setupData, setSetupData] = useState(me?.setupStatus || null)
  const [isPopupOpen, setIsPopupOpen] = useState(false)
  const [pos, setPos] = useState({ left: 260, bottom: 24 })

  const cardRef = useRef(null)
  const popupRef = useRef(null)

  const fetchStatus = useCallback(async () => {
    try {
      const res = await api.get('/creator/setup-status')
      if (res && typeof res.completed === 'number') {
        setSetupData(res)
      }
    } catch {
      // Keep existing state on error
    }
  }, [])

  // Sync with DashboardContext when me?.setupStatus updates
  useEffect(() => {
    if (me?.setupStatus) {
      setSetupData(me.setupStatus)
    }
  }, [me?.setupStatus])

  // Revalidate on mount and on route navigation
  useEffect(() => {
    fetchStatus()
  }, [fetchStatus, pathname])

  // Real-time update listeners: window focus and custom update events
  useEffect(() => {
    const handleUpdate = () => {
      fetchStatus()
      if (refreshMe) refreshMe()
    }
    window.addEventListener('creatorstore:setup-updated', handleUpdate)
    window.addEventListener('focus', handleUpdate)
    return () => {
      window.removeEventListener('creatorstore:setup-updated', handleUpdate)
      window.removeEventListener('focus', handleUpdate)
    }
  }, [fetchStatus, refreshMe])

  // Compute fallback data if setupData from API hasn't loaded yet
  const computed = useMemo(() => {
    if (setupData) return setupData

    const store = me?.store
    const profile = me?.profile
    const theme = store?.theme || {}

    const avatar = String(theme.avatarUrl || store?.avatarUrl || profile?.avatarUrl || '').trim()
    const isProfileImageDone = avatar.length > 0

    const isProductDone = Boolean(me?.productsCount && me.productsCount > 0)

    const bio = String(theme.headerBio || store?.bio || profile?.bio || '').trim()
    const isStoreProfileDone = bio.length > 0

    const items = [
      {
        id: 'profile-image',
        title: 'Add profile image',
        label: 'Add profile image',
        description: 'A photo helps people recognize you.',
        completed: isProfileImageDone,
        actionType: 'navigate',
        route: '/dashboard/settings?focus=avatar',
      },
      {
        id: 'first-product',
        title: 'Add your first product',
        label: 'Add your first product',
        description: 'Create a digital product, course, or service to sell.',
        completed: isProductDone,
        actionType: 'product-wizard',
        route: isProductDone ? '/dashboard/products' : '/dashboard/products?create=true',
      },
      {
        id: 'store-profile',
        title: 'Complete your store profile',
        label: 'Complete your store profile',
        description: 'Add your store name, bio, and brand details.',
        completed: isStoreProfileDone,
        actionType: 'navigate',
        route: '/dashboard/store',
      },
    ]

    const completed = items.filter((t) => t.completed).length
    const total = items.length
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0
    const allDone = completed === total
    const nextIncomplete = items.find((t) => !t.completed) || null

    return {
      items,
      completed,
      total,
      percentage,
      allDone,
      nextRoute: nextIncomplete?.route || '/dashboard/store',
      storeSlug: store?.slug || store?.username || profile?.username || '',
    }
  }, [setupData, me])

  const { items = [], completed = 0, total = 3, percentage = 0, allDone = false, storeSlug = '' } = computed
  const storeUrl = storeSlug ? `/${storeSlug}` : '/dashboard/store'

  // Update popup positioning near sidebar card
  const updatePosition = useCallback(() => {
    if (!cardRef.current) return
    const rect = cardRef.current.getBoundingClientRect()
    const viewportWidth = window.innerWidth
    const viewportHeight = window.innerHeight

    if (viewportWidth < 640) {
      const popoverWidth = Math.min(viewportWidth - 32, 330)
      setPos({
        left: Math.max(16, (viewportWidth - popoverWidth) / 2),
        bottom: 84,
      })
      return
    }

    const targetLeft = rect.right + 12
    const clampedLeft = Math.min(targetLeft, viewportWidth - 350)
    const targetBottom = Math.max(20, viewportHeight - rect.bottom)
    const clampedBottom = Math.min(targetBottom, viewportHeight - 260)

    setPos({
      left: clampedLeft,
      bottom: clampedBottom,
    })
  }, [])

  // Listen for outside clicks and Escape key to close popup
  useEffect(() => {
    if (!isPopupOpen) return

    const handleOutsideClick = (e) => {
      if (
        popupRef.current &&
        !popupRef.current.contains(e.target) &&
        cardRef.current &&
        !cardRef.current.contains(e.target)
      ) {
        setIsPopupOpen(false)
      }
    }

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsPopupOpen(false)
      }
    }

    window.addEventListener('mousedown', handleOutsideClick)
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('resize', updatePosition)

    return () => {
      window.removeEventListener('mousedown', handleOutsideClick)
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('resize', updatePosition)
    }
  }, [isPopupOpen, updatePosition])

  const handleTogglePopup = (e) => {
    e?.preventDefault?.()
    e?.stopPropagation?.()
    if (!isPopupOpen) {
      updatePosition()
      setIsPopupOpen(true)
    } else {
      setIsPopupOpen(false)
    }
  }

  const handleTaskClick = (task) => {
    setIsPopupOpen(false)
    if (onNavClick) onNavClick()
    const targetRoute = task.completed
      ? (task.id === 'first-product' ? '/dashboard/products' : task.route)
      : task.route
    router.push(targetRoute)
  }

  return (
    <>
      <div ref={cardRef} className="relative">
        {/* Collapsed Sidebar view (72px width) */}
        {collapsed ? (
          <div className="flex justify-center py-2">
            {allDone ? (
              <a
                href={storeUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={onNavClick}
                className="p-1.5 rounded-[16px] hover:bg-[#EAE9E6] transition-colors cursor-pointer flex items-center justify-center"
                title="Setup complete (100%) - View store"
              >
                <ProgressRing pct={percentage} size={38} isDone={allDone} />
              </a>
            ) : (
              <button
                type="button"
                onClick={handleTogglePopup}
                className="p-1.5 rounded-[16px] hover:bg-[#EAE9E6] transition-colors cursor-pointer flex items-center justify-center focus:outline-none"
                title={`Setup checklist: ${percentage}% (${completed} of ${total} complete)`}
                aria-label="Toggle setup checklist"
              >
                <ProgressRing pct={percentage} size={38} isDone={allDone} />
              </button>
            )}
          </div>
        ) : (
          /* Expanded Sidebar view (240-250px width) */
          <div className="rounded-[24px] bg-[#FFFFFF] border border-[#E5E5E3] p-5 shadow-[0_2px_8px_rgba(0,0,0,0.03)] select-none">
            <ProgressRing pct={percentage} size={48} isDone={allDone} />
            <h4 className="text-[15px] font-bold text-[#1F1F1F] mt-3 tracking-tight">
              Your setup checklist
            </h4>
            <p className="text-[13px] text-[#5F5F5F] mt-0.5 font-medium">
              {allDone ? 'All setup steps complete' : `${completed} of ${total} complete`}
            </p>
            {allDone ? (
              <a
                href={storeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3.5 w-full h-10 rounded-full bg-[#1F1F1F] hover:bg-[#000000] text-[#FFFFFF] text-[13px] font-semibold flex items-center justify-center transition-colors cursor-pointer shadow-xs gap-1.5"
              >
                View Store
                <ExternalLink className="h-3.5 w-3.5 opacity-70" />
              </a>
            ) : (
              <button
                type="button"
                onClick={handleTogglePopup}
                className="mt-3.5 w-full h-10 rounded-full bg-[#1F1F1F] hover:bg-[#000000] text-[#FFFFFF] text-[13px] font-semibold flex items-center justify-center transition-colors cursor-pointer shadow-xs"
              >
                Finish setup
              </button>
            )}
          </div>
        )}
      </div>

      {/* Interactive Setup Checklist Popup / Popover */}
      {isPopupOpen && !allDone && (
        <div
          ref={popupRef}
          role="dialog"
          aria-label="Finish setting up your store"
          className="fixed z-50 w-[310px] sm:w-[330px] rounded-[20px] bg-[#FFFFFF] border border-[#E5E5E3] p-4 shadow-[0_12px_36px_rgba(0,0,0,0.12),0_2px_8px_rgba(0,0,0,0.04)] text-[#1F1F1F] select-none"
          style={{ left: pos.left, bottom: pos.bottom }}
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-[#F0F0EE]">
            <h3 className="text-[14px] font-bold text-[#1F1F1F] tracking-tight">
              Finish setting up your store
            </h3>
            <button
              type="button"
              onClick={() => setIsPopupOpen(false)}
              className="p-1 rounded-full text-[#8E8E93] hover:text-[#1F1F1F] hover:bg-[#F2F1EF] transition-colors cursor-pointer"
              aria-label="Close checklist"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Checklist Task Rows */}
          <div className="py-2.5 space-y-1.5" role="list">
            {items.map((task) => {
              const isDone = Boolean(task.completed)
              return (
                <button
                  key={task.id}
                  type="button"
                  onClick={() => handleTaskClick(task)}
                  className={`w-full group flex items-center gap-3 p-2.5 rounded-[14px] text-left transition-colors cursor-pointer select-none ${
                    isDone
                      ? 'hover:bg-[#F9F9F8] text-[#71717A]'
                      : 'hover:bg-[#F4F4F2] text-[#1F1F1F]'
                  }`}
                  role="listitem"
                >
                  {isDone ? (
                    <span
                      className="h-5 w-5 rounded-full bg-[#16A34A] text-[#FFFFFF] flex items-center justify-center shrink-0"
                      aria-label="Completed"
                    >
                      <Check className="h-3 w-3 stroke-[3]" />
                    </span>
                  ) : (
                    <span
                      className="h-5 w-5 rounded-full border-2 border-[#D1D1CE] group-hover:border-[#1F1F1F] flex items-center justify-center shrink-0 transition-colors"
                      aria-label="Incomplete"
                    />
                  )}

                  <div className="flex-1 min-w-0">
                    <p
                      className={`text-[13px] leading-tight ${
                        isDone ? 'font-medium text-[#71717A]' : 'font-semibold text-[#1F1F1F]'
                      }`}
                    >
                      {task.title || task.label}
                    </p>
                  </div>

                  {!isDone && (
                    <ChevronRight className="h-4 w-4 text-[#A1A1AA] group-hover:text-[#1F1F1F] shrink-0 transition-transform group-hover:translate-x-0.5" />
                  )}
                </button>
              )
            })}
          </div>

          {/* Footer */}
          <div className="pt-3 border-t border-[#F0F0EE] flex items-center justify-between text-[12px] font-medium text-[#71717A]">
            <span>{completed} of {total} complete</span>
            <span className="font-bold text-[#1F1F1F]">{percentage}%</span>
          </div>
        </div>
      )}
    </>
  )
}

function ProgressRing({ pct, size = 48, isDone = false }) {
  const strokeWidth = 3.5
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (pct / 100) * circumference

  return (
    <div className="relative flex items-center justify-center shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#E5E5E3"
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={isDone ? '#16A34A' : '#1F1F1F'}
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-500 ease-out"
        />
      </svg>
      <span className={`absolute text-[11px] font-bold ${isDone ? 'text-[#16A34A]' : 'text-[#1F1F1F]'}`}>
        {pct}%
      </span>
    </div>
  )
}
