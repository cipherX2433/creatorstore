'use client'

import { useEffect, useState } from 'react'
import { api, formatMoney } from '@/lib/clientApi'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { ShoppingBag, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useDashboardHeader } from '@/components/dashboard/HeaderContext'

const ST = {
  PAID: 'bg-[#16A34A]/10 text-[#16A34A] border border-[#16A34A]/20',
  PENDING: 'bg-[#D97706]/10 text-[#D97706] border border-[#D97706]/20',
  FAILED: 'bg-[#DC2626]/10 text-[#DC2626] border border-[#DC2626]/20',
  REFUNDED: 'bg-[#F2F1EF] text-[#6F6F6B] border border-[#E5E5E3]',
}

export default function OrdersPage() {
  const [orders, setOrders] = useState(null)
  const [map, setMap] = useState({ products: {}, customers: {} })
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const { setHeaderConfig } = useDashboardHeader()

  useEffect(() => {
    setHeaderConfig({
      title: 'Sales',
      actions: null
    })
  }, [setHeaderConfig])

  useEffect(() => {
    Promise.all([
      api.get(`/orders?page=${page}&limit=20`),
      api.get('/products').catch(() => ({ products: [] })),
      api.get('/customers').catch(() => ({ customers: [] })),
    ])
      .then(([o, p, c]) => {
        setMap({
          products: Object.fromEntries((p.products || p.items || []).map((x) => [x.id, x])),
          customers: Object.fromEntries((c.customers || c.items || []).map((x) => [x.id, x])),
        })
        setOrders(o.orders || o.items || [])
        if (o.totalPages) setTotalPages(o.totalPages)
      }).catch(() => setOrders([]))
  }, [page])

  return (
    <div className="space-y-6 text-[#1F1F1F]">
      
      {/* Header Banner */}
      <div className="bg-[#FFFFFF] p-4 sm:p-6 rounded-[20px] border border-[#E5E5E3] shadow-[0_8px_30px_rgba(0,0,0,0.04)] space-y-1">
        <div className="inline-flex items-center gap-1.5 text-xs font-bold text-[#1F1F1F] bg-[#F5F5F3] px-3 py-1 rounded-full mb-1 border border-[#E5E5E3]">
          <Sparkles className="h-3.5 w-3.5" /> Sales Ledger
        </div>
        <p className="text-xs sm:text-sm text-[#6F6F6B] font-medium">Real-time payment transactions and sales fulfillment history.</p>
      </div>

      {orders === null ? (
        <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-[20px] bg-[#F5F5F3]" />)}</div>
      ) : orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-[20px] border-2 border-dashed border-[#E5E5E3] bg-[#FFFFFF] py-16 sm:py-20 text-center shadow-xs p-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-[16px] bg-[#F2F1EF] text-[#1F1F1F] border border-[#E5E5E3]">
            <ShoppingBag className="h-7 w-7" />
          </div>
          <p className="text-sm font-semibold text-[#6F6F6B] max-w-sm">No customer orders recorded yet. Share your store link to start selling.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto rounded-[20px] border border-[#E5E5E3] bg-[#FFFFFF] shadow-[0_8px_30px_rgba(0,0,0,0.04)]">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-[#E5E5E3] bg-[#FBFBFB] text-[#6F6F6B] font-bold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="px-5 py-3.5">Product Purchased</th>
                  <th className="px-5 py-3.5">Customer</th>
                  <th className="px-5 py-3.5">Amount</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E5E3] text-[#1F1F1F] font-medium">
                {orders.map((o) => (
                  <tr key={o.id} className="hover:bg-[#F5F5F3] transition-colors">
                    <td className="px-5 py-4 font-bold text-[#1F1F1F]">{map.products[o.productId]?.title || 'Product'}</td>
                    <td className="px-5 py-4 text-[#6F6F6B]">{map.customers[o.customerId]?.email || o.customerEmail || '—'}</td>
                    <td className="px-5 py-4 font-bold text-[#1F1F1F]">{formatMoney(o.amount, o.currency)}</td>
                    <td className="px-5 py-4"><Badge className={`${ST[o.status] || ST.PENDING} rounded-full`}>{o.status}</Badge></td>
                    <td className="px-5 py-4 text-[#6F6F6B] font-medium">{new Date(o.paidAt || o.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card List View */}
          <div className="md:hidden space-y-3">
            {orders.map((o) => (
              <div key={o.id} className="p-4 rounded-[16px] border border-[#E5E5E3] bg-[#FFFFFF] space-y-2 shadow-xs">
                <div className="flex items-start justify-between gap-2">
                  <span className="font-bold text-sm text-[#1F1F1F] line-clamp-1">
                    {map.products[o.productId]?.title || 'Product'}
                  </span>
                  <Badge className={`${ST[o.status] || ST.PENDING} shrink-0 text-[10px] rounded-full`}>{o.status}</Badge>
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

          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-3 text-xs font-semibold text-[#6F6F6B]">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="rounded-full border-[#E5E5E3] bg-[#FFFFFF] hover:bg-[#F5F5F3] text-[#1F1F1F] h-8 px-3.5">Previous</Button>
              <span>Page {page} of {totalPages}</span>
              <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="rounded-full border-[#E5E5E3] bg-[#FFFFFF] hover:bg-[#F5F5F3] text-[#1F1F1F] h-8 px-3.5">Next</Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
