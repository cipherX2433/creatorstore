'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import {
  ChevronDown,
  HelpCircle,
  LogOut,
  MessageSquare,
  Plus,
  User,
  Zap,
  Bell,
} from 'lucide-react'
import { toast } from 'sonner'
import { useDashboardHeader } from '@/components/dashboard/HeaderContext'

export default function SidebarProfileRow({
  me,
  onLogout,
  onNavigate,
  compact = false,
  collapsed = false,
}) {
  const { setPricingModalOpen } = useDashboardHeader()
  const [open, setOpen] = useState(false)
  const menuRef = useRef(null)

  const rawUsername = me?.store?.username || me?.store?.slug || me?.profile?.username || 'creator'
  const username = rawUsername.startsWith('@') ? rawUsername : `@${rawUsername}`
  const pureUsername = rawUsername.replace(/^@/, '')
  const creatorName = me?.profile?.name || pureUsername
  const initial = (creatorName || me?.user?.email || 'C')[0].toUpperCase()
  const storeDomain = `creatorstore.store/${pureUsername}`

  const sub = me?.subscription
  const isPaid = sub?.status === 'ACTIVE' || sub?.status === 'TRIALING'
  const planName = sub?.isTrial
    ? 'Pro'
    : isPaid
    ? (sub?.plan === 'PRO' ? 'Pro' : (sub?.plan || 'Pro'))
    : (sub?.isTrialExpired ? 'Expired' : 'Free')

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Close when pressing Escape key
  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === 'Escape' && open) {
        setOpen(false)
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open])

  function closeAnd(fn) {
    setOpen(false)
    onNavigate?.()
    fn?.()
  }

  function handleFeedback() {
    closeAnd(() => {
      const email = 'support@creatorstore.app'
      const subject = encodeURIComponent('CreatorStore Feedback')
      const body = encodeURIComponent(
        `Hi CreatorStore Team,\n\nHere is my feedback:\n\n- Creator: ${pureUsername}\n\n`
      )
      window.open(`mailto:${email}?subject=${subject}&body=${body}`, '_blank')
      toast.success('Opening feedback prompt...')
    })
  }

  return (
    <div className="relative shrink-0 w-full" ref={menuRef}>
      {/* Account Trigger Row */}
      {collapsed ? (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex items-center justify-center w-full py-1.5 rounded-[10px] bg-transparent hover:bg-[#EAE9E6] transition-colors cursor-pointer select-none outline-none focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1F1F1F]/20"
          title={pureUsername}
          aria-expanded={open}
          aria-haspopup="menu"
        >
          <div className="flex h-[34px] w-[34px] min-w-[34px] min-h-[34px] max-w-[34px] max-h-[34px] items-center justify-center overflow-hidden rounded-full bg-[#1F1F1F] text-xs font-semibold text-[#FFFFFF] shrink-0 ring-1 ring-[#E5E5E3]">
            {me?.profile?.avatarUrl ? (
              <img
                src={me.profile.avatarUrl}
                alt=""
                className="h-full w-full object-cover rounded-full"
              />
            ) : (
              initial
            )}
          </div>
        </button>
      ) : (
        <div className="flex items-center justify-between w-full h-[40px] gap-1">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="group flex items-center justify-between min-w-0 flex-1 h-[40px] px-1.5 rounded-[10px] bg-transparent hover:bg-[#EAE9E6] transition-colors duration-150 cursor-pointer select-none outline-none focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1F1F1F]/20"
            aria-expanded={open}
            aria-haspopup="menu"
          >
            <div className="flex items-center gap-2 min-w-0">
              {/* Avatar 32px */}
              <div className="flex h-[32px] w-[32px] min-w-[32px] min-h-[32px] max-w-[32px] max-h-[32px] items-center justify-center overflow-hidden rounded-full bg-[#1F1F1F] text-xs font-semibold text-[#FFFFFF] shrink-0 ring-1 ring-[#E5E5E3]">
                {me?.profile?.avatarUrl ? (
                  <img
                    src={me.profile.avatarUrl}
                    alt=""
                    className="h-full w-full object-cover rounded-full"
                  />
                ) : (
                  initial
                )}
              </div>

              {/* Username */}
              <span className="truncate text-[15px] font-semibold text-[#1F1F1F] group-hover:text-[#000000] tracking-[-0.01em] transition-colors">
                {pureUsername}
              </span>
            </div>

            {/* Chevron */}
            <ChevronDown
              className={`h-4 w-4 shrink-0 text-[#8C8C88] group-hover:text-[#1F1F1F] transition-transform duration-200 ml-1 ${
                open ? 'rotate-180 text-[#1F1F1F]' : ''
              }`}
            />
          </button>

          {/* Notification Bell */}
          <button
            type="button"
            onClick={() => toast.info('No new notifications')}
            className="h-7.5 w-7.5 flex items-center justify-center rounded-[8px] text-[#5F5F5F] hover:text-[#1F1F1F] hover:bg-[#EAE9E6] transition-colors cursor-pointer outline-none focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1F1F1F]/20 shrink-0"
            title="Notifications"
            aria-label="Notifications"
          >
            <Bell className="h-[18px] w-[18px] stroke-[1.8]" />
          </button>
        </div>
      )}

      {/* Floating White Account Dropdown */}
      {open && (
        <div
          role="menu"
          className={`absolute ${
            collapsed ? 'left-14 top-0' : 'left-0 top-full mt-1.5'
          } z-50 w-[240px] rounded-[18px] bg-[#FFFFFF] p-1.5 shadow-[0_10px_30px_rgba(0,0,0,0.08)] border border-[#E5E5E3] text-[#1F1F1F] animate-in fade-in slide-in-from-top-2 duration-150 origin-top select-none`}
        >
          {/* Top Account Information Header */}
          <div className="p-2.5 rounded-[12px] bg-[#FBFBFB] border border-[#E5E5E3] mb-1">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <div
                  className="flex h-8 w-8 min-w-[32px] min-h-[32px] max-w-[32px] max-h-[32px] items-center justify-center overflow-hidden rounded-full bg-[#1F1F1F] text-[10px] font-bold text-[#FFFFFF] shrink-0 shadow-xs ring-1 ring-[#E5E5E3]"
                  style={{ width: 32, height: 32 }}
                >
                  {me?.profile?.avatarUrl ? (
                    <img
                      src={me.profile.avatarUrl}
                      alt=""
                      className="h-full w-full object-cover rounded-full"
                      style={{ width: '100%', height: '100%' }}
                    />
                  ) : (
                    initial
                  )}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-xs font-bold text-[#1F1F1F]">
                    {username}
                  </p>
                </div>
              </div>

              {/* Plan Badge */}
              <span
                className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                  planName === 'Pro'
                    ? 'bg-[#1F1F1F] text-[#FFFFFF]'
                    : 'bg-[#F2F1EF] text-[#6F6F6B] border border-[#E5E5E3]'
                }`}
              >
                {planName}
              </span>
            </div>

            <div className="mt-1.5 pl-9">
              <p className="truncate text-[10px] font-medium text-[#6F6F6B]">
                {storeDomain}
              </p>
            </div>
          </div>

          {/* Section 1: Account actions */}
          <div className="space-y-0.5">
            <Link
              href="/dashboard/store"
              onClick={() => closeAnd()}
              className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-[10px] text-xs font-medium text-[#1F1F1F] hover:bg-[#F5F5F3] transition-colors duration-150"
            >
              <Plus className="h-3.5 w-3.5 text-[#6F6F6B]" />
              <span>Create new store</span>
            </Link>

            <Link
              href="/dashboard/settings"
              onClick={() => closeAnd()}
              className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-[10px] text-xs font-medium text-[#1F1F1F] hover:bg-[#F5F5F3] transition-colors duration-150"
            >
              <User className="h-3.5 w-3.5 text-[#6F6F6B]" />
              <span>Account</span>
            </Link>

            <button
              type="button"
              onClick={() => closeAnd(() => setPricingModalOpen(true))}
              className="flex w-full items-center gap-2.5 px-2.5 py-1.5 rounded-[10px] text-xs font-medium text-[#1F1F1F] hover:bg-[#F5F5F3] transition-colors duration-150 cursor-pointer text-left"
            >
              <Zap className="h-3.5 w-3.5 text-[#1F1F1F]" />
              <span>Upgrade Plan</span>
            </button>
          </div>

          {/* Divider */}
          <div className="my-1 border-t border-[#E5E5E3]" />

          {/* Section 2: Support & Feedback */}
          <div className="space-y-0.5">
            <Link
              href="/help"
              onClick={() => closeAnd()}
              className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-[10px] text-xs font-medium text-[#1F1F1F] hover:bg-[#F5F5F3] transition-colors duration-150"
            >
              <HelpCircle className="h-3.5 w-3.5 text-[#6F6F6B]" />
              <span>Help & Support</span>
            </Link>

            <button
              type="button"
              onClick={handleFeedback}
              className="flex w-full items-center gap-2.5 px-2.5 py-1.5 rounded-[10px] text-xs font-medium text-[#1F1F1F] hover:bg-[#F5F5F3] transition-colors duration-150 cursor-pointer text-left"
            >
              <MessageSquare className="h-3.5 w-3.5 text-[#6F6F6B]" />
              <span>Give Feedback</span>
            </button>
          </div>

          {/* Divider */}
          <div className="my-1 border-t border-[#E5E5E3]" />

          {/* Section 3: Danger (Log out) */}
          <div className="space-y-0.5">
            <button
              type="button"
              onClick={() => closeAnd(onLogout)}
              className="flex w-full items-center gap-2.5 px-2.5 py-1.5 rounded-[10px] text-xs font-semibold text-[#DC2626] hover:bg-[#FDECEC] transition-colors duration-150 cursor-pointer text-left"
            >
              <LogOut className="h-3.5 w-3.5 text-[#DC2626]" />
              <span>Log out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
