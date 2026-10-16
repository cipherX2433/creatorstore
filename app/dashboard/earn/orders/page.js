'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Search } from 'lucide-react'
import { api, formatMoney } from '@/lib/clientApi'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { useDashboard } from '@/components/dashboard/DashboardContext'
import { useDashboardHeader } from '@/components/dashboard/HeaderContext'
import ShareStoreModal from '@/components/dashboard/ShareStoreModal'

const ST = {
  PAID: 'bg-[#16A34A]/10 text-[#16A34A] border border-[#16A34A]/20',
  PENDING: 'bg-[#D97706]/10 text-[#D97706] border border-[#D97706]/20',
  FAILED: 'bg-[#DC2626]/10 text-[#DC2626] border border-[#DC2626]/20',
  REFUNDED: 'bg-[#F2F1EF] text-[#6F6F6B] border border-[#E5E5E3]',
}

function MarketButton({ onClick, className = '' }) {
  return (
    <Button
      type="button"
      onClick={onClick}
      className={`rounded-full bg-[#1F1F1F] text-white hover:bg-[#000000] active:bg-[#111111] font-bold shadow-xs ${className}`}
    >
      Market your products
    </Button>
  )
}

export default function EarnOrdersPage() {
  const { me } = useDashboard()
  const { setHeaderConfig } = useDashboardHeader()
  const [orders, setOrders] = useState(null)
  const [map, setMap] = useState({ products: {}, customers: {} })
  const [shareOpen, setShareOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('ALL')
  const [range, setRange] = useState('ALL')

  useEffect(() => {
    Promise.all([
      api.get('/orders?page=1&limit=100'),
      api.get('/products').catch(() => ({ products: [] })),
      api.get('/customers').catch(() => ({ customers: [] })),
    ])
      .then(([o, p, c]) => {
        setMap({
          products: Object.fromEntries((p.products || p.items || []).map((x) => [x.id, x])),
          customers: Object.fromEntries((c.customers || c.items || []).map((x) => [x.id, x])),
        })
        setOrders(o.orders || o.items || [])
      })
      .catch(() => setOrders([]))
  }, [])

  const filtered = useMemo(() => {
    if (!orders) return []
    const now = Date.now()
    const rangeMs = range === '7D' ? 7 * 86400000 : range === '30D' ? 30 * 86400000 : null
    const q = query.trim().toLowerCase()

    return orders.filter((o) => {
      if (status !== 'ALL' && o.status !== status) return false
      const ts = new Date(o.paidAt || o.createdAt).getTime()
      if (rangeMs && now - ts > rangeMs) return false
      if (!q) return true
      const product = map.products[o.productId]?.title || ''
      const customer = map.customers[o.customerId]?.email || o.customerEmail || ''
      return [o.id, product, customer].some((v) => String(v).toLowerCase().includes(q))
    })
  }, [orders, query, status, range, map])

  const hasOrders = (orders || []).length > 0

  useEffect(() => {
    setHeaderConfig({
      title: 'Orders',
      actions: hasOrders ? <MarketButton onClick={() => setShareOpen(true)} /> : null,
    })
  }, [setHeaderConfig, hasOrders])

  function exportOrders() {
    if (!filtered.length) return
    const rows = [
      ['Order', 'Customer', 'Product', 'Date', 'Status', 'Amount'],
      ...filtered.map((o) => [
        o.id,
        map.customers[o.customerId]?.email || o.customerEmail || '',
        map.products[o.productId]?.title || 'Product',
        new Date(o.paidAt || o.createdAt).toISOString(),
        o.status,
        o.amount,
      ]),
    ]
    const csv = rows.map((r) => r.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'orders.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  const username = me?.store?.username || me?.store?.slug || me?.username

  return (
    <div className="flex flex-col gap-6 text-[#1F1F1F]">
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard/earn"
          className="p-2 rounded-full text-[#6F6F6B] hover:text-[#1F1F1F] hover:bg-[#F5F5F3] transition-colors"
          aria-label="Back to Earn"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-2xl font-extrabold text-[#1F1F1F]">Orders</h1>
      </div>

      <div className="bg-[#FFFFFF] border border-[#E5E5E3] rounded-2xl p-6 shadow-[0_8px_30px_rgba(0,0,0,0.04)]">
        <p>
          <span className="text-2xl font-black text-[#1F1F1F]">{orders === null ? '—' : filtered.length}</span>
          {' '}
          <span className="text-[#6F6F6B] text-sm font-medium">Orders</span>
        </p>
      </div>

      <div className="bg-[#FFFFFF] border border-[#E5E5E3] rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center gap-3 shadow-[0_8px_30px_rgba(0,0,0,0.04)]">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#999995]" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search order, customer, or product"
            className="pl-9 bg-[#FFFFFF] border-[#E5E5E3] text-[#1F1F1F] placeholder-[#999995] rounded-full focus:border-[#1F1F1F] focus:ring-1 focus:ring-[#1F1F1F]"
          />
        </div>
        <select
          value={range}
          onChange={(e) => setRange(e.target.value)}
          className="h-10 px-4 rounded-full bg-[#FFFFFF] border border-[#E5E5E3] text-xs font-semibold text-[#1F1F1F] outline-none hover:border-[#DADAD7] focus:border-[#1F1F1F] transition-colors"
        >
          <option value="ALL">All dates</option>
          <option value="7D">Last 7 days</option>
          <option value="30D">Last 30 days</option>
        </select>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="h-10 px-4 rounded-full bg-[#FFFFFF] border border-[#E5E5E3] text-xs font-semibold text-[#1F1F1F] outline-none hover:border-[#DADAD7] focus:border-[#1F1F1F] transition-colors"
        >
          <option value="ALL">All statuses</option>
          <option value="PAID">Paid</option>
          <option value="PENDING">Pending</option>
          <option value="FAILED">Failed</option>
          <option value="REFUNDED">Refunded</option>
        </select>
        <Button
          type="button"
          variant="outline"
          disabled={!hasOrders}
          onClick={exportOrders}
          className={`rounded-full border-[#E5E5E3] ${hasOrders ? 'bg-[#FFFFFF] text-[#1F1F1F] hover:bg-[#F5F5F3]' : 'bg-[#ECECE9] text-[#A8A8A4] opacity-50 cursor-not-allowed'}`}
        >
          Export orders
        </Button>
      </div>

      {orders === null ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-2xl bg-[#F5F5F3]" />)}
        </div>
      ) : !hasOrders ? (
        <div className="bg-[#FFFFFF] border border-[#E5E5E3] rounded-2xl p-12 flex flex-col items-center justify-center text-center gap-4 min-h-[280px] shadow-[0_8px_30px_rgba(0,0,0,0.04)]">
          <p className="text-sm text-[#6F6F6B] max-w-sm">
            You&apos;re all set up — now let&apos;s get your first sale.
          </p>
          <MarketButton onClick={() => setShareOpen(true)} />
        </div>
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto rounded-2xl border border-[#E5E5E3] bg-[#FFFFFF] shadow-[0_8px_30px_rgba(0,0,0,0.04)]">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-[#E5E5E3] bg-[#FBFBFB] text-[10px] font-bold uppercase tracking-wider text-[#6F6F6B]">
                <tr>
                  <th className="px-4 py-3">Order</th>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Product</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E5E3]">
                {filtered.map((o) => (
                  <tr key={o.id} className="hover:bg-[#F5F5F3] transition-colors">
                    <td className="px-4 py-3 font-mono text-[11px] text-[#6F6F6B]">{String(o.id).slice(0, 8)}</td>
                    <td className="px-4 py-3 text-[#6F6F6B]">{map.customers[o.customerId]?.email || o.customerEmail || '—'}</td>
                    <td className="px-4 py-3 font-semibold text-[#1F1F1F]">{map.products[o.productId]?.title || 'Product'}</td>
                    <td className="px-4 py-3 text-[#6F6F6B]">{new Date(o.paidAt || o.createdAt).toLocaleDateString()}</td>
                    <td className="px-4 py-3">
                      <Badge className={ST[o.status] || ST.PENDING}>{o.status}</Badge>
                    </td>
                    <td className="px-4 py-3 font-bold text-[#1F1F1F]">{formatMoney(o.amount, o.currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card List View */}
          <div className="md:hidden space-y-3">
            {filtered.map((o) => (
              <div key={o.id} className="p-4 rounded-2xl border border-[#E5E5E3] bg-[#FFFFFF] space-y-2 shadow-xs">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <span className="font-bold text-sm text-[#1F1F1F] line-clamp-1">
                      {map.products[o.productId]?.title || 'Product'}
                    </span>
                    <span className="font-mono text-[10px] text-[#6F6F6B]">
                      #{String(o.id).slice(0, 8)}
                    </span>
                  </div>
                  <Badge className={`${ST[o.status] || ST.PENDING} shrink-0 text-[10px]`}>{o.status}</Badge>
                </div>
                <div className="flex items-center justify-between text-xs pt-1 border-t border-[#E5E5E3]">
                  <span className="text-[#6F6F6B] truncate max-w-[180px]">
                    {map.customers[o.customerId]?.email || o.customerEmail || '—'}
                  </span>
                  <span className="font-bold text-[#1F1F1F]">
                    {formatMoney(o.amount, o.currency)}
                  </span>
                </div>
                <div className="text-[10px] text-[#6F6F6B]">
                  {new Date(o.paidAt || o.createdAt).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <ShareStoreModal open={shareOpen} onOpenChange={setShareOpen} username={username} />
    </div>
  )
}
