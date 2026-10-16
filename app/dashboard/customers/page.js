'use client'

import { useEffect, useState } from 'react'
import { api } from '@/lib/clientApi'
import { Skeleton } from '@/components/ui/skeleton'
import { Users, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

import { useDashboardHeader } from '@/components/dashboard/HeaderContext'

export default function CustomersPage() {
  const [customers, setCustomers] = useState(null)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const { setHeaderConfig } = useDashboardHeader()

  useEffect(() => {
    setHeaderConfig({
      title: 'Audience',
      actions: null
    })
  }, [setHeaderConfig])

  useEffect(() => {
    api.get(`/customers?page=${page}&limit=20`).then((r) => {
      setCustomers(r.customers || r.items || [])
      if (r.totalPages) setTotalPages(r.totalPages)
    }).catch(() => setCustomers([]))
  }, [page])

  return (
    <div className="space-y-6 text-[var(--text-heading,#F5F5F5)]">
      
      {/* Header Banner */}
      <div className="bg-[var(--bg-surface,#242424)] p-5 sm:p-6 rounded-2xl border border-[var(--border-subtle,#303030)] shadow-md space-y-1">
        <div className="inline-flex items-center gap-1.5 text-xs font-bold text-[var(--accent-primary)] bg-[var(--bg-surface-hover,#2A2A2A)] px-3 py-1 rounded-full border border-[var(--border-subtle,#303030)] mb-1">
          <Sparkles className="h-3.5 w-3.5" /> Audience CRM
        </div>
        <p className="text-xs sm:text-sm text-[var(--text-secondary,#A3A3A3)] font-medium">People who have purchased products, courses, or bookings from your store.</p>
      </div>

      {customers === null ? (
        <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-2xl bg-[var(--bg-surface,#242424)]" />)}</div>
      ) : customers.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-[var(--border-subtle,#303030)] bg-[var(--bg-surface,#242424)] py-20 text-center shadow-sm">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--bg-surface-hover,#2A2A2A)] text-[var(--accent-primary)] border border-[var(--border-subtle,#303030)]">
            <Users className="h-7 w-7" />
          </div>
          <p className="text-sm font-semibold text-[var(--text-secondary,#A3A3A3)]">Your customer contacts will automatically appear here upon checkout.</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            {customers.map((c) => (
              <div key={c.id} className="flex items-center gap-4 rounded-2xl border border-[var(--border-subtle,#303030)] bg-[var(--bg-surface,#242424)] p-5 shadow-md hover:bg-[var(--bg-surface-hover,#2A2A2A)] transition-colors">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--accent-primary)] text-white font-black text-lg shrink-0">
                  {(c.name || c.email || '?')[0].toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-extrabold text-sm text-[var(--text-heading,#F5F5F5)]">{c.name || c.email}</p>
                  <p className="truncate text-xs text-[var(--text-secondary,#A3A3A3)] font-medium">{c.email}</p>
                </div>
                <Badge className="bg-[var(--bg-surface-hover,#2A2A2A)] text-[var(--accent-primary)] border border-[var(--border-subtle,#303030)] text-xs font-bold shrink-0">
                  {c.status || 'ACTIVE'}
                </Badge>
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4 text-xs font-bold text-[var(--text-secondary,#A3A3A3)]">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="rounded-full border-[var(--border-subtle,#303030)] bg-[var(--bg-surface-hover,#2A2A2A)] text-[var(--text-heading,#F5F5F5)]">Previous</Button>
              <span>Page {page} of {totalPages}</span>
              <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="rounded-full border-[var(--border-subtle,#303030)] bg-[var(--bg-surface-hover,#2A2A2A)] text-[var(--text-heading,#F5F5F5)]">Next</Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
