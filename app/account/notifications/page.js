'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { api } from '@/lib/clientApi'
import { Skeleton } from '@/components/ui/skeleton'
import { Bell, PackageCheck, Video, Sparkles, CheckCircle2, Clock } from 'lucide-react'

export default function CustomerNotificationsPage() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/account/notifications')
      .then((res) => setData(res))
      .catch(() => setData(null))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="max-w-3xl space-y-8">
      <div>
        <h1 className="text-2xl sm:text-3xl font-black text-[#F4F2EC] tracking-tight">Notification Center</h1>
        <p className="text-xs sm:text-sm text-[rgba(244,242,236,0.68)] font-medium mt-1">
          Stay updated on your purchases, upcoming sessions, and product deliveries.
        </p>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-2xl" />
          ))}
        </div>
      ) : !data || data.notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-16 text-center bg-[#12141c] rounded-3xl border border-dashed border-white/10 space-y-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Bell className="h-8 w-8" />
          </div>
          <p className="text-xs text-[rgba(244,242,236,0.68)] font-medium">You don’t have any notifications right now.</p>
        </div>
      ) : (
        <div className="bg-[#12141c] rounded-3xl border border-white/10 shadow-sm overflow-hidden divide-y divide-slate-100">
          {data.notifications.map((n) => (
            <Link
              key={n.id}
              href={n.link || '/account'}
              className="flex items-start gap-4 p-5 hover:bg-[#1e222d] transition-colors"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary mt-0.5">
                {n.type === 'ORDER' ? <PackageCheck className="h-5 w-5" /> : n.type === 'COACHING' ? <Video className="h-5 w-5" /> : <Sparkles className="h-5 w-5" />}
              </div>
              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between">
                  <h3 className="font-extrabold text-sm text-[#F4F2EC]">{n.title}</h3>
                  <span className="text-[10px] font-bold text-[rgba(244,242,236,0.5)]">
                    {new Date(n.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-xs text-[rgba(244,242,236,0.68)] font-medium leading-relaxed">{n.message}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
