'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { api } from '@/lib/clientApi'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ShoppingBag, ArrowRight, CheckCircle2, FileText } from 'lucide-react'

export default function CustomerOrdersPage() {
  const [orders, setOrders] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/account/orders')
      .then((res) => setOrders(res.orders || []))
      .catch(() => setOrders([]))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl sm:text-3xl font-black text-[#F4F2EC] tracking-tight">Order History</h1>
        <p className="text-xs sm:text-sm text-[rgba(244,242,236,0.68)] font-medium mt-1">
          View all your completed purchases, receipts, and order statuses.
        </p>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-2xl" />
          ))}
        </div>
      ) : !orders || orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-16 text-center bg-[#12141c] rounded-3xl border border-dashed border-white/10 space-y-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <ShoppingBag className="h-8 w-8" />
          </div>
          <div className="space-y-1 max-w-sm">
            <h3 className="text-lg font-extrabold text-[#F4F2EC]">No orders found</h3>
            <p className="text-xs text-[rgba(244,242,236,0.68)] font-medium leading-relaxed">
              You haven’t placed any orders yet.
            </p>
          </div>
          <Link href="/account/library">
            <Button variant="outline" className="text-xs font-bold rounded-xl">
              Explore Products
            </Button>
          </Link>
        </div>
      ) : (
        <div className="bg-[#12141c] rounded-3xl border border-white/10 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#12141c] border-b border-white/10 text-[rgba(244,242,236,0.5)] font-black uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="p-4 pl-6">Order ID</th>
                  <th className="p-4">Product</th>
                  <th className="p-4">Creator</th>
                  <th className="p-4">Amount</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Date</th>
                  <th className="p-4 pr-6 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-[#F4F2EC]">
                {orders.map((o) => (
                  <tr key={o.id} className="hover:bg-[#1e222d] transition-colors">
                    <td className="p-4 pl-6 font-bold text-[#F4F2EC] font-mono">#{o.orderNumber}</td>
                    <td className="p-4 font-bold text-[#F4F2EC]">{o.productTitle}</td>
                    <td className="p-4 text-[rgba(244,242,236,0.68)]">{o.creatorName}</td>
                    <td className="p-4 font-extrabold text-[#F4F2EC]">₹{o.amount}</td>
                    <td className="p-4">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-700">
                        <CheckCircle2 className="h-3 w-3" /> {o.status}
                      </span>
                    </td>
                    <td className="p-4 text-[rgba(244,242,236,0.68)]">{new Date(o.createdAt).toLocaleDateString()}</td>
                    <td className="p-4 pr-6 text-right">
                      <Link href={`/account/orders/${o.id}`}>
                        <Button variant="outline" size="sm" className="text-xs font-bold rounded-xl">
                          View
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
