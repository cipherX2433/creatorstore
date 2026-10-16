'use client'

import { useState, useEffect, useLayoutEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { api } from '@/lib/clientApi'
import { Bell, PackageCheck, Video, Sparkles } from 'lucide-react'

const PANEL_WIDTH = 320

export function NotificationDropdown({ variant = 'default' }) {
  const [open, setOpen] = useState(false)
  const [data, setData] = useState({ unreadCount: 0, notifications: [] })
  const [coords, setCoords] = useState({ top: 0, left: 0 })
  const [mounted, setMounted] = useState(false)
  const wrapRef = useRef(null)
  const isSidebar = variant === 'sidebar'

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    api.get('/account/notifications')
      .then((res) => setData(res))
      .catch(() => {})
  }, [])

  useLayoutEffect(() => {
    if (!open || !wrapRef.current) return

    function place() {
      const rect = wrapRef.current.getBoundingClientRect()
      const gap = 8
      const maxLeft = window.innerWidth - PANEL_WIDTH - 12
      if (isSidebar) {
        setCoords({
          top: rect.top,
          left: Math.min(rect.right + gap, maxLeft),
        })
      } else {
        setCoords({
          top: rect.bottom + gap,
          left: Math.max(12, Math.min(rect.right - PANEL_WIDTH, maxLeft)),
        })
      }
    }

    place()
    window.addEventListener('resize', place)
    window.addEventListener('scroll', place, true)
    return () => {
      window.removeEventListener('resize', place)
      window.removeEventListener('scroll', place, true)
    }
  }, [open, isSidebar])

  const panel = open && mounted ? createPortal(
    <>
      <div className="fixed inset-0 z-[60]" onClick={() => setOpen(false)} />
      <div
        className="fixed z-[70] rounded-modal bg-surface-overlay p-4 shadow-dropdown border border-edge text-white"
        style={{ top: coords.top, left: coords.left, width: PANEL_WIDTH }}
      >
        <div className="flex items-center justify-between border-b border-edge pb-3 mb-2">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-brand" />
            <h3 className="font-extrabold text-sm text-white">Notifications</h3>
          </div>
          <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-surface-raised text-brand border border-edge">
            {data.unreadCount} unread
          </span>
        </div>

        {data.notifications.length === 0 ? (
          <div className="py-8 text-center text-xs text-content-muted">
            No notifications right now.
          </div>
        ) : (
          <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
            {data.notifications.map((n) => (
              <Link
                key={n.id}
                href={n.link || '/account'}
                onClick={() => setOpen(false)}
                className="flex gap-3 p-2.5 rounded-xl hover:bg-surface-hover transition-colors border border-transparent hover:border-edge"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface-raised text-brand border border-edge">
                  {n.type === 'ORDER' ? <PackageCheck className="h-4 w-4" /> : n.type === 'COACHING' ? <Video className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
                </div>
                <div className="flex-1 space-y-0.5">
                  <p className="text-xs font-extrabold text-white line-clamp-1">{n.title}</p>
                  <p className="text-[11px] text-content-muted line-clamp-2 leading-relaxed">{n.message}</p>
                </div>
              </Link>
            ))}
          </div>
        )}

        <div className="border-t border-edge pt-2.5 mt-2 text-center">
          <Link
            href="/account/notifications"
            onClick={() => setOpen(false)}
            className="text-xs font-extrabold text-brand hover:underline"
          >
            View all notifications →
          </Link>
        </div>
      </div>
    </>,
    document.body
  ) : null

  return (
    <div ref={wrapRef} className="relative flex h-9 w-9 shrink-0 items-center justify-center">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={
          isSidebar
            ? 'relative flex h-9 w-9 items-center justify-center rounded-full text-white hover:bg-[#12141c] transition-colors focus:outline-none cursor-pointer'
            : 'relative flex h-9 w-9 items-center justify-center rounded-full bg-[#12141c] border border-white/10 text-white hover:bg-[#1e222d] transition-colors shadow-sm focus:outline-none'
        }
        aria-label="Notifications"
        aria-expanded={open}
      >
        <Bell className="h-4 w-4" />
        {data.unreadCount > 0 && (
          <span className="absolute top-0.5 right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-black text-black border border-white/12 shadow-sm">
            {data.unreadCount}
          </span>
        )}
      </button>
      {panel}
    </div>
  )
}
