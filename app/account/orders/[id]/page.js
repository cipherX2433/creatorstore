'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { api } from '@/lib/clientApi'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { CheckCircle2, ArrowLeft, PackageCheck, ShieldCheck, Lock, Sparkles } from 'lucide-react'

export default function OrderDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (params.id) {
      api.get(`/account/orders/${params.id}`)
        .then((res) => setOrder(res.order))
        .catch((err) => setError(err.message || 'Order not found or unauthorized'))
        .finally(() => setLoading(false))
    }
  }, [params.id])

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <Skeleton className="h-8 w-48 rounded-xl" />
        <Skeleton className="h-64 w-full rounded-3xl" />
      </div>
    )
  }

  if (error || !order) {
    return (
      <div className="max-w-md mx-auto py-16 text-center space-y-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 mx-auto">
          <Lock className="h-8 w-8" />
        </div>
        <h2 className="text-xl font-black text-[#F4F2EC]">Access Denied</h2>
        <p className="text-xs text-[rgba(244,242,236,0.68)] font-medium">{error || 'Order not found.'}</p>
        <Link href="/account/orders">
          <Button variant="outline" size="sm" className="text-xs font-bold rounded-xl gap-2">
            <ArrowLeft className="h-4 w-4" /> Back to Orders
          </Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Link href="/account/orders" className="inline-flex items-center gap-2 text-xs font-bold text-[rgba(244,242,236,0.68)] hover:text-[#F4F2EC]">
        <ArrowLeft className="h-4 w-4" /> Back to Orders
      </Link>

      <div className="bg-[#12141c] p-6 sm:p-8 rounded-3xl border border-white/10 shadow-lg space-y-6">
        {/* Order Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <PackageCheck className="h-5 w-5 text-primary" />
              <h1 className="text-xl font-black text-[#F4F2EC]">Order #{order.orderNumber}</h1>
            </div>
            <p className="text-xs text-[rgba(244,242,236,0.68)] font-medium">Placed on {new Date(order.createdAt).toLocaleString()}</p>
          </div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-emerald-100 text-emerald-700 w-fit">
            <CheckCircle2 className="h-4 w-4" /> {order.status}
          </span>
        </div>

        {/* Item Breakdown */}
        <div className="space-y-4">
          <h3 className="font-extrabold text-sm text-[#F4F2EC]">Purchased Item</h3>
          <div className="flex items-center justify-between p-4 rounded-2xl bg-[#12141c] border border-white/10">
            <div>
              <h4 className="font-bold text-sm text-[#F4F2EC]">{order.productTitle}</h4>
              <p className="text-xs text-[rgba(244,242,236,0.68)] font-medium">Creator: {order.creatorName} • Type: {order.productType}</p>
            </div>
            <span className="font-black text-base text-[#F4F2EC]">₹{order.amount}</span>
          </div>
        </div>

        {/* Summary Table */}
        <div className="grid grid-cols-2 gap-4 pt-2 text-xs font-medium border-t border-white/10">
          <div>
            <span className="text-[rgba(244,242,236,0.5)] font-bold block mb-0.5">Payment Method</span>
            <span className="text-[#F4F2EC] font-semibold">Secure Online Checkout</span>
          </div>
          <div>
            <span className="text-[rgba(244,242,236,0.5)] font-bold block mb-0.5">Entitlement Status</span>
            <span className="inline-flex items-center gap-1 text-emerald-600 font-bold">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" /> {order.entitlementStatus}
            </span>
          </div>
        </div>

        {/* Action button to open product */}
        <div className="pt-4 border-t border-white/10 flex justify-end">
          <Link href="/account/library">
            <Button className="bg-primary hover:bg-primary-hover text-white font-extrabold text-xs rounded-xl shadow-md">
              Access Purchased Product →
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
