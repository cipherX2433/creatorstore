'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { Check, ChevronRight } from 'lucide-react'
import { api } from '@/lib/clientApi'
import { useDashboard } from '@/components/dashboard/DashboardContext'

export default function SidebarTaskProgress({ collapsed = false, onNavClick, className = '' }) {
  const router = useRouter()
  const pathname = usePathname()
  const { me, refreshMe } = useDashboard()

  const [setupData, setSetupData] = useState(me?.setupStatus || null)

  const cardRef = useRef(null)

  const fetchStatus = useCallback(async () => {
    try {
      const res = await api.get('/creator/setup-status')
      if (res && Array.isArray(res.items) && typeof res.completed === 'number') {
        setSetupData(res)
      }
    } catch {
      // Graceful fallback: maintain existing verified state or keep unverified; never hide on error
    }
  }, [])

  // Sync with DashboardContext when me?.setupStatus updates
  useEffect(() => {
    if (me?.setupStatus && Array.isArray(me.setupStatus.items)) {
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
    if (setupData && Array.isArray(setupData.items)) return setupData

    const store = me?.store
    const profile = me?.profile
    const theme = store?.theme || {}

    const avatar = String(theme.avatarUrl || store?.avatarUrl || profile?.avatarUrl || '').trim()
    const isProfileImageDone = avatar.length > 0 && !avatar.includes('placeholder')

    const isProductDone = Boolean(me?.productsCount && me.productsCount > 0)

    const payout = me?.payoutProfile || me?.payout || {}
    const isUpi = payout.payoutMethod === 'UPI' || Boolean(payout.upiId)
    const hasPayoutDetails = isUpi
      ? Boolean(payout.upiId && String(payout.upiId).includes('@'))
      : Boolean(payout.accountHolderName && (payout.bankName || payout.bankLast4) && (payout.ifsc || payout.ifscCode))
    const isPayoutDone = Boolean(payout && hasPayoutDetails && payout.status !== 'NOT_CONFIGURED' && payout.status !== 'FAILED')

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
        title: 'Add a product',
        label: 'Add a product',
        description: 'Create a digital product, coaching session, or service to sell.',
        completed: isProductDone,
        actionType: 'product-wizard',
        route: isProductDone ? '/dashboard/products' : '/dashboard/products?create=true',
      },
      {
        id: 'payout-details',
        title: 'Set up payout details',
        label: 'Set up payout details',
        description: 'Add your bank or UPI details to receive payouts.',
        completed: isPayoutDone,
        actionType: 'navigate',
        route: isPayoutDone ? '/dashboard/settings/payments' : '/dashboard/payments/setup',
      },
    ]

    const completed = items.filter((t) => t.completed).length
    const total = items.length
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0
    const allDone = completed === total && total === 3
    const nextIncomplete = items.find((t) => !t.completed) || null

    return {
      items,
      completed,
      total,
      percentage,
      allDone,
      nextRoute: nextIncomplete?.route || (isProductDone ? '/dashboard/products' : '/dashboard/settings?focus=avatar'),
      storeSlug: store?.slug || store?.username || profile?.username || '',
    }
  }, [setupData, me])

  const { items = [], completed = 0, total = 3, percentage = 0, allDone = false, nextRoute = '/dashboard/settings?focus=avatar' } = computed

  // Completely hide the setup checklist card and its container when all 3 checkpoints are complete
  if (allDone) {
    return null
  }

  const handleTaskClick = (task) => {
    if (onNavClick) onNavClick()
    const targetRoute = task.completed
      ? (task.id === 'first-product' ? '/dashboard/products' : (task.id === 'payout-details' ? '/dashboard/settings/payments' : task.route))
      : task.route
    router.push(targetRoute)
  }

  const handleFinishSetup = (e) => {
    e?.preventDefault?.()
    if (onNavClick) onNavClick()
    const firstIncomplete = items.find((t) => !t.completed)
    const target = firstIncomplete?.route || nextRoute || '/dashboard/settings?focus=avatar'
    router.push(target)
  }

  const handleCollapsedClick = (e) => {
    e?.preventDefault?.()
    if (onNavClick) onNavClick()
    const firstIncomplete = items.find((t) => !t.completed)
    const target = firstIncomplete?.route || nextRoute || '/dashboard/settings?focus=avatar'
    router.push(target)
  }

  return (
    <div className={`shrink-0 px-2.5 pb-2 pt-1.5 mt-auto ${className}`.trim()}>
      <div ref={cardRef} className="relative">
        {/* Collapsed Sidebar view (72px rail width) */}
        {collapsed ? (
          <div className="flex justify-center py-1">
            <button
              type="button"
              onClick={handleCollapsedClick}
              className="p-1 rounded-[12px] hover:bg-[#EAE9E6] transition-colors cursor-pointer flex items-center justify-center focus:outline-none"
              title={`Setup checklist: ${percentage}% (${completed} of ${total} complete)`}
              aria-label={`Setup checklist: ${percentage}% complete`}
            >
              <ProgressRing pct={percentage} size={34} isDone={false} />
            </button>
          </div>
        ) : (
          /* Expanded Sidebar view (compact card fitting neatly into sidebar) */
          <div className="rounded-[18px] bg-[#FFFFFF] border border-[#E5E5E3] p-3 shadow-[0_2px_8px_rgba(0,0,0,0.03)] select-none">
            <ProgressRing pct={percentage} size={40} isDone={false} />

            <h4 className="text-[13.5px] font-bold text-[#1F1F1F] mt-2 tracking-tight">
              Your setup checklist
            </h4>
            <p className="text-[11.5px] text-[#5F5F5F] mt-0.5 font-medium">
              {`${completed} of ${total} complete`}
            </p>

            {/* 3 Interactive Checkpoints directly inside the card */}
            <div className="mt-2.5 pt-2 border-t border-[#F0F0EE] space-y-0.5" role="list">
              {items.map((task) => {
                const isDone = Boolean(task.completed)
                return (
                  <button
                    key={task.id}
                    type="button"
                    onClick={() => handleTaskClick(task)}
                    className={`w-full group flex items-center gap-2 px-1.5 py-1 rounded-[8px] text-left transition-colors cursor-pointer select-none ${
                      isDone
                        ? 'hover:bg-[#F9F9F8] text-[#71717A]'
                        : 'hover:bg-[#F4F4F2] text-[#1F1F1F]'
                    }`}
                    role="listitem"
                    title={`${task.title} (${isDone ? 'Complete' : 'Incomplete - Click to complete'})`}
                  >
                    {isDone ? (
                      <span
                        className="h-3.5 w-3.5 rounded-full bg-[#16A34A] text-[#FFFFFF] flex items-center justify-center shrink-0 shadow-2xs"
                        aria-label="Completed"
                      >
                        <Check className="h-2 w-2 stroke-[3]" />
                      </span>
                    ) : (
                      <span
                        className="h-3.5 w-3.5 rounded-full border-[1.5px] border-[#D1D1CE] group-hover:border-[#1F1F1F] flex items-center justify-center shrink-0 transition-colors"
                        aria-label="Incomplete"
                      />
                    )}

                    <span
                      className={`text-[11.5px] leading-tight truncate flex-1 ${
                        isDone ? 'font-medium text-[#71717A] line-through' : 'font-semibold text-[#1F1F1F]'
                      }`}
                    >
                      {task.title}
                    </span>

                    {!isDone && (
                      <ChevronRight className="h-3 w-3 text-[#A1A1AA] group-hover:text-[#1F1F1F] shrink-0 transition-transform group-hover:translate-x-0.5" />
                    )}
                  </button>
                )
              })}
            </div>

            {/* Finish setup CTA */}
            <button
              type="button"
              onClick={handleFinishSetup}
              className="mt-2.5 w-full h-[32px] rounded-full bg-[#1F1F1F] hover:bg-[#000000] text-[#FFFFFF] text-[11.5px] font-semibold flex items-center justify-center transition-colors cursor-pointer shadow-xs active:scale-[0.99]"
            >
              Finish setup
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function ProgressRing({ pct, size = 40, isDone = false }) {
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
