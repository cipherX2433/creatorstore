'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { api } from '@/lib/clientApi'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import {
  Link2, Plus, ExternalLink as ExternalIcon, Sparkles, ShoppingBag, Eye, DollarSign,
  Edit, ArrowRight
} from 'lucide-react'

export default function CreatorExternalLinksPage() {
  const [analytics, setAnalytics] = useState(null)
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    setLoading(true)
    try {
      const [anaRes, prodRes] = await Promise.all([
        api.get('/external-link/creator/analytics'),
        api.get('/products'),
      ])
      setAnalytics(anaRes || {})
      const extProds = (prodRes.products || []).filter(p => p.type === 'EXTERNAL_LINK')
      setProducts(extProds)
    } catch (err) {
      toast.error(err.message || 'Failed to load external link dashboard data')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-8 font-sans text-[#F4F2EC]">
      
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-5">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-2xl bg-primary/15 text-primary flex items-center justify-center font-black text-xl shrink-0">
            <Link2 className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-[#F4F2EC] tracking-tight">External Links</h1>
            <p className="text-xs text-[rgba(244,242,236,0.68)] font-medium">Sell or provide access to content anywhere on the web (YouTube, Discord, Notion, Drive, Calendly).</p>
          </div>
        </div>

        <Link href="/dashboard/products/new">
          <Button className="bg-primary hover:bg-primary text-white text-xs font-extrabold rounded-xl shadow-md gap-1.5">
            <Plus className="h-4 w-4" /> Create External Link
          </Button>
        </Link>
      </div>

      {/* ANALYTICS METRICS */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-3xl border border-white/10 shadow-sm space-y-1">
          <span className="text-xs font-bold text-[rgba(244,242,236,0.5)]">Total Link Products</span>
          <div className="text-2xl font-black text-[#F4F2EC]">{loading ? '...' : analytics?.totalProducts || 0}</div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-white/10 shadow-sm space-y-1">
          <span className="text-xs font-bold text-[rgba(244,242,236,0.5)]">Total Purchases</span>
          <div className="text-2xl font-black text-primary">{loading ? '...' : analytics?.totalPurchases || 0}</div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-white/10 shadow-sm space-y-1">
          <span className="text-xs font-bold text-[rgba(244,242,236,0.5)]">Total Link Opens</span>
          <div className="text-2xl font-black text-[#F4F2EC]">{loading ? '...' : analytics?.totalLinkOpens || 0}</div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-white/10 shadow-sm space-y-1">
          <span className="text-xs font-bold text-[rgba(244,242,236,0.5)]">Total Revenue</span>
          <div className="text-2xl font-black text-emerald-600">₹{loading ? '...' : analytics?.totalRevenue?.toLocaleString() || 0}</div>
        </div>
      </div>

      {/* PRODUCTS LIST */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-white/10 shadow-sm space-y-6">
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <h2 className="text-base font-extrabold text-[#F4F2EC]">Your External Link Products</h2>
          <span className="text-xs text-[rgba(244,242,236,0.68)] font-medium">{products.length} product(s)</span>
        </div>

        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-16 w-full rounded-2xl" />
            <Skeleton className="h-16 w-full rounded-2xl" />
          </div>
        ) : products.length === 0 ? (
          <div className="p-12 text-center border border-dashed border-white/10 rounded-3xl space-y-3">
            <Link2 className="h-10 w-10 text-slate-300 mx-auto" />
            <h3 className="text-base font-extrabold text-[#F4F2EC]">No External Link Products Yet</h3>
            <p className="text-xs text-[rgba(244,242,236,0.68)] max-w-sm mx-auto font-medium">Create a product to direct your audience to your YouTube masterclasses, private Discord, Notion templates, or Google Drive resources.</p>
            <Link href="/dashboard/products/new">
              <Button className="bg-primary hover:bg-primary text-white text-xs font-extrabold rounded-xl mt-2">
                Create First External Link
              </Button>
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {products.map((prod) => (
              <div key={prod.id} className="py-4 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  {prod.thumbnail ? (
                    <img src={prod.thumbnail} alt="" className="h-12 w-12 rounded-2xl object-cover shrink-0" />
                  ) : (
                    <div className="h-12 w-12 rounded-2xl bg-primary/15 text-primary flex items-center justify-center font-black text-lg shrink-0">
                      <Link2 className="h-6 w-6" />
                    </div>
                  )}
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                        prod.status === 'PUBLISHED' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-[#F4F2EC]'
                      }`}>
                        {prod.status}
                      </span>
                    </div>
                    <h3 className="font-extrabold text-sm text-[#F4F2EC] mt-0.5">{prod.title}</h3>
                  </div>
                </div>

                <div className="flex items-center gap-6 text-xs">
                  <div className="text-right">
                    <span className="text-[rgba(244,242,236,0.5)] font-bold">Price</span>
                    <div className="font-extrabold text-[#F4F2EC]">{Number(prod.price) === 0 ? 'FREE' : `₹${prod.price}`}</div>
                  </div>

                  <Link href={`/dashboard/external-link/${prod.id}/setup`}>
                    <Button variant="outline" size="sm" className="rounded-xl text-xs font-bold gap-1">
                      <Edit className="h-3.5 w-3.5" /> Setup & Edit
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  )
}
