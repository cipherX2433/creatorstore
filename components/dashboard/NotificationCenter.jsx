'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  X,
  MoreHorizontal,
  CheckCheck,
  Package,
  Calendar,
  Sparkles,
  TrendingUp,
  FileText,
  Bell,
  Check,
  ExternalLink,
  Inbox,
  Loader2,
} from 'lucide-react'
import { useNotifications } from '@/context/NotificationContext'

const TABS = ['All', 'Updates', 'Opportunities', 'Insights']

// Helper to format relative time like the reference ("8 hours ago", "2 days ago")
function formatRelativeTime(dateString) {
  if (!dateString) return 'Just now'
  const date = new Date(dateString)
  const now = new Date()
  const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000)

  if (diffSec < 60) return 'Just now'
  const diffMin = Math.floor(diffSec / 60)
  if (diffMin < 60) return `${diffMin}m ago`
  const diffHours = Math.floor(diffMin / 60)
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`
  const diffDays = Math.floor(diffHours / 24)
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`
  const diffWeeks = Math.floor(diffDays / 7)
  if (diffWeeks < 4) return `${diffWeeks} week${diffWeeks > 1 ? 's' : ''} ago`
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// Group notifications into Today, This week, Earlier
function groupNotificationsByDate(notifications) {
  const groups = {
    today: [],
    thisWeek: [],
    earlier: [],
  }

  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const sevenDaysAgo = startOfToday - 6 * 24 * 60 * 60 * 1000

  for (const item of notifications) {
    const itemTime = item.createdAt ? new Date(item.createdAt).getTime() : now.getTime()
    if (itemTime >= startOfToday) {
      groups.today.push(item)
    } else if (itemTime >= sevenDaysAgo) {
      groups.thisWeek.push(item)
    } else {
      groups.earlier.push(item)
    }
  }

  return groups
}

// Icon mapper for notification types
function getNotificationIcon(item) {
  switch (item.type) {
    case 'ORDER':
      return <Package className="h-5 w-5 text-[#FF4D24]" />
    case 'BOOKING':
      return <Calendar className="h-5 w-5 text-[#8B5CF6]" />
    case 'SUBMISSION':
      return <FileText className="h-5 w-5 text-[#194DF5]" />
    case 'INSIGHTS':
      return <TrendingUp className="h-5 w-5 text-[#10B981]" />
    default:
      return <Sparkles className="h-5 w-5 text-[#1F1F1F]" />
  }
}

export default function NotificationCenter() {
  const {
    isOpen,
    closeNotificationCenter,
    notifications,
    unreadCount,
    loading,
    activeTab,
    setActiveTab,
    markAsRead,
    markAllAsRead,
    isMarkingAll,
  } = useNotifications()

  const router = useRouter()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef(null)
  const panelRef = useRef(null)

  // Close overflow menu on click outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false)
      }
    }
    if (menuOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [menuOpen])

  // Close on Escape key
  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        if (menuOpen) {
          setMenuOpen(false)
        } else if (isOpen) {
          closeNotificationCenter()
        }
      }
    }
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown)
      return () => document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, menuOpen, closeNotificationCenter])

  // Prevent background scrolling while modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
      return () => {
        document.body.style.overflow = ''
      }
    }
  }, [isOpen])

  if (!isOpen) return null

  const grouped = groupNotificationsByDate(notifications)
  const hasNotifications = notifications.length > 0

  const handleNotificationClick = (item) => {
    if (!item.isRead) {
      markAsRead(item.id)
    }
    if (item.link) {
      closeNotificationCenter()
      router.push(item.link)
    }
  }

  const handleMarkAll = async (e) => {
    e.stopPropagation()
    setMenuOpen(false)
    await markAllAsRead()
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Notification Center"
      className="fixed inset-0 z-[100] bg-black/45 backdrop-blur-[2px] flex items-center justify-center p-3 sm:p-6 select-none animate-in fade-in duration-200"
      onClick={closeNotificationCenter}
    >
      {/* Modal Card */}
      <div
        ref={panelRef}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[570px] max-h-[82vh] bg-white text-[#1F1F1F] rounded-[24px] shadow-[0_24px_70px_rgba(0,0,0,0.2)] border border-[#E5E5E3] flex flex-col overflow-hidden relative animate-in zoom-in-95 duration-150"
      >
        {/* ========================================================== */}
        {/* HEADER: Close Button + Centered Title + Overflow Menu */}
        {/* ========================================================== */}
        <div className="relative flex items-center justify-between px-5 pt-4 pb-3 border-b border-[#F2F1EF] shrink-0">
          {/* Close button on left */}
          <button
            type="button"
            onClick={closeNotificationCenter}
            aria-label="Close notifications"
            className="w-9 h-9 rounded-full flex items-center justify-center text-[#555555] hover:text-black hover:bg-[#F2F2F0] transition-colors cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-black"
          >
            <X className="h-4.5 w-4.5 stroke-[2]" />
          </button>

          {/* Centered title */}
          <h2
            className="text-base sm:text-[17px] font-bold text-[#1C1C1C] tracking-tight"
            style={{ fontFamily: "'Plus Jakarta Sans', var(--font-brand), sans-serif" }}
          >
            Notifications
          </h2>

          {/* Overflow Menu on right */}
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label="More options"
              aria-expanded={menuOpen}
              aria-haspopup="menu"
              className="w-9 h-9 rounded-full flex items-center justify-center text-[#555555] hover:text-black hover:bg-[#F2F2F0] transition-colors cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-black"
            >
              <MoreHorizontal className="h-4.5 w-4.5" />
            </button>

            {/* Overflow Dropdown */}
            {menuOpen && (
              <div
                role="menu"
                className="absolute right-0 top-full mt-1.5 w-52 rounded-[16px] bg-white border border-[#E5E5E3] shadow-[0_12px_32px_rgba(0,0,0,0.12)] p-1.5 z-50 animate-in fade-in slide-in-from-top-1 duration-150 origin-top-right"
              >
                <button
                  type="button"
                  role="menuitem"
                  onClick={handleMarkAll}
                  disabled={unreadCount === 0 || isMarkingAll}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-[10px] text-xs font-semibold text-[#1F1F1F] hover:bg-[#F4F4F2] disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-left cursor-pointer"
                >
                  <CheckCheck className="h-4 w-4 text-[#1F1F1F] shrink-0" />
                  <span>Mark all as read</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ========================================================== */}
        {/* CATEGORY TABS: All, Updates, Opportunities, Insights */}
        {/* ========================================================== */}
        <div className="px-5 pt-3 pb-3 border-b border-[#F2F1EF] shrink-0">
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
            {TABS.map((tab) => {
              const isSelected = activeTab === tab
              return (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-1.5 rounded-full text-xs sm:text-[13px] font-semibold transition-all cursor-pointer whitespace-nowrap outline-none focus-visible:ring-2 focus-visible:ring-black ${
                    isSelected
                      ? 'bg-[#000000] text-[#FFFFFF] shadow-xs'
                      : 'bg-[#F1F1EF] text-[#555555] hover:text-[#111111] hover:bg-[#EAEAEA]'
                  }`}
                >
                  {tab}
                </button>
              )
            })}
          </div>
        </div>

        {/* ========================================================== */}
        {/* NOTIFICATION LIST (Scrollable, Date-Grouped) */}
        {/* ========================================================== */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6 no-scrollbar">
          {loading && !hasNotifications ? (
            <div className="py-16 flex flex-col items-center justify-center text-[#8C8C88]">
              <Loader2 className="h-6 w-6 animate-spin mb-2" />
              <p className="text-xs font-medium">Loading notifications...</p>
            </div>
          ) : !hasNotifications ? (
            /* Empty State */
            <div className="py-16 px-4 flex flex-col items-center justify-center text-center">
              <div className="w-12 h-12 rounded-full bg-[#F1F1EF] flex items-center justify-center text-[#8C8C88] mb-3">
                <Inbox className="h-6 w-6 stroke-[1.8]" />
              </div>
              <h3 className="text-sm font-bold text-[#1F1F1F] mb-1">
                No notifications in {activeTab}
              </h3>
              <p className="text-xs text-[#6F6F6B] max-w-xs leading-relaxed">
                {activeTab === 'All'
                  ? 'When customers purchase, book calls, or submit forms, you will receive updates here.'
                  : `There are currently no notifications in the ${activeTab} category.`}
              </p>
            </div>
          ) : (
            <>
              {/* GROUP: Today */}
              {grouped.today.length > 0 && (
                <div>
                  <h3 className="text-xs font-bold text-[#1F1F1F] mb-2 tracking-tight uppercase">
                    Today
                  </h3>
                  <div className="space-y-1">
                    {grouped.today.map((item) => (
                      <NotificationItem
                        key={item.id}
                        item={item}
                        onClick={() => handleNotificationClick(item)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* GROUP: This week */}
              {grouped.thisWeek.length > 0 && (
                <div>
                  <h3 className="text-xs font-bold text-[#1F1F1F] mb-2 tracking-tight uppercase">
                    This week
                  </h3>
                  <div className="space-y-1">
                    {grouped.thisWeek.map((item) => (
                      <NotificationItem
                        key={item.id}
                        item={item}
                        onClick={() => handleNotificationClick(item)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* GROUP: Earlier */}
              {grouped.earlier.length > 0 && (
                <div>
                  <h3 className="text-xs font-bold text-[#1F1F1F] mb-2 tracking-tight uppercase">
                    Earlier
                  </h3>
                  <div className="space-y-1">
                    {grouped.earlier.map((item) => (
                      <NotificationItem
                        key={item.id}
                        item={item}
                        onClick={() => handleNotificationClick(item)}
                      />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function NotificationItem({ item, onClick }) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onClick()
        }
      }}
      className={`group w-full flex items-start gap-3.5 p-3 rounded-[16px] text-left transition-colors cursor-pointer select-none outline-none focus-visible:ring-2 focus-visible:ring-black ${
        item.isRead
          ? 'hover:bg-[#F9F9F8]'
          : 'bg-[#FAFAFA] hover:bg-[#F4F4F2]'
      }`}
    >
      {/* Icon / Avatar Thumbnail */}
      <div className="w-10 h-10 rounded-full bg-[#F1F1EF] group-hover:bg-white flex items-center justify-center shrink-0 shadow-xs border border-[#EAEAE8] transition-colors">
        {getNotificationIcon(item)}
      </div>

      {/* Main Content */}
      <div className="flex-1 min-w-0 pr-1">
        <p
          className={`text-sm leading-snug tracking-tight truncate ${
            item.isRead ? 'font-medium text-[#444444]' : 'font-bold text-[#111111]'
          }`}
        >
          {item.title}
        </p>

        {item.message && (
          <p className="text-xs text-[#6F6F6B] mt-0.5 line-clamp-2 leading-relaxed">
            {item.message}
          </p>
        )}

        <span className="text-[11px] text-[#999995] font-medium mt-1 inline-block">
          {formatRelativeTime(item.createdAt)}
        </span>
      </div>

      {/* Unread Indicator Dot (Purple/Violet matching reference) */}
      {!item.isRead && (
        <div className="pt-2 shrink-0">
          <span
            className="block w-2.5 h-2.5 rounded-full bg-[#8B5CF6] shadow-xs"
            title="Unread"
          />
        </div>
      )}
    </div>
  )
}
