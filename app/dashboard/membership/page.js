'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { api, formatMoney } from '@/lib/clientApi'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import {
  Users, DollarSign, TrendingUp, UserCheck, UserX, Plus, Search, CheckCircle2,
  XCircle, Ban, AlertCircle, Eye, Settings
} from 'lucide-react'

export default function CreatorMembershipDashboard() {
  const [products, setProducts] = useState([])
  const [selectedProductId, setSelectedProductId] = useState('')
  const [config, setConfig] = useState(null)
  const [members, setMembers] = useState([])
  const [totalMembers, setTotalMembers] = useState(0)
  const [analytics, setAnalytics] = useState({ activeMembers: 0, mrr: 0, newThisMonth: 0, cancelled: 0 })
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')

  useEffect(() => {
    loadMembershipData()
  }, [])

  function loadMembershipData() {
    setLoading(true)
    Promise.all([
      api.get('/products'),
      api.get('/membership/creator/analytics'),
    ]).then(([prodsRes, analRes]) => {
      const memProds = (prodsRes.products || []).filter(p => p.type === 'MEMBERSHIP')
      setProducts(memProds)
      setAnalytics(analRes)
      if (memProds.length > 0) {
        setSelectedProductId(memProds[0].id)
        fetchMemberRoster(memProds[0].id)
      } else {
        setLoading(false)
      }
    }).catch(() => setLoading(false))
  }

  function fetchMemberRoster(prodId) {
    setLoading(true)
    Promise.all([
      api.get(`/membership/config/${prodId}`),
      api.get(`/membership/creator/members?productId=${prodId}`),
    ]).then(([confRes, memRes]) => {
      setConfig(confRes.config)
      setMembers(memRes.items || [])
      setTotalMembers(memRes.total || 0)
      setLoading(false)
    }).catch(() => setLoading(false))
  }

  const filteredMembers = members.filter((m) => {
    const matchesStatus = statusFilter === 'ALL' || m.status === statusFilter
    const matchesSearch = (m.customerName || '').toLowerCase().includes(search.toLowerCase()) ||
                          (m.customerEmail || '').toLowerCase().includes(search.toLowerCase())
    return matchesStatus && matchesSearch
  })

  return (
    <div className="space-y-8 font-sans text-[#010619]">
      
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#D8DFFA] pb-5">
        <div>
          <h1 className="text-3xl font-bold text-[#010619] tracking-tight flex items-center gap-2">
            <Users className="h-7 w-7 text-primary" /> Memberships & Recurring Revenue
          </h1>
          <p className="text-sm text-[#666666] font-medium">Track active subscriptions, monthly recurring revenue (MRR), and member roster.</p>
        </div>

        <div className="flex items-center gap-3">
          {products.length > 1 && (
            <select
              value={selectedProductId}
              onChange={(e) => { setSelectedProductId(e.target.value); fetchMemberRoster(e.target.value) }}
              className="h-10 rounded-xl border border-[#D8DFFA] text-xs font-semibold px-3 bg-white text-[#010619] focus:outline-none focus:ring-1 focus:ring-primary"
            >
              {products.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
            </select>
          )}

          <Link href="/dashboard/products/new">
            <Button className="bg-primary hover:bg-primary/90 text-white font-bold text-xs rounded-xl shadow-xs gap-1.5 cursor-pointer">
              <Plus className="h-4 w-4" /> Create Membership
            </Button>
          </Link>
        </div>
      </div>

      {products.length === 0 && !loading ? (
        <div className="rounded-2xl border border-dashed border-[#D8DFFA] bg-white p-12 text-center space-y-3 shadow-xs">
          <Users className="h-10 w-10 text-[#666666] mx-auto" />
          <h3 className="text-base font-bold text-[#010619]">No Memberships Created Yet</h3>
          <p className="text-xs text-[#666666] max-w-sm mx-auto">Sell recurring monthly subscriptions, build a member community, and unlock exclusive content.</p>
          <div className="pt-2">
            <Link href="/dashboard/products/new">
              <Button className="bg-primary hover:bg-primary/90 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer">
                Create Membership
              </Button>
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          
          {/* ANALYTICS STATS CARDS */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-[#D8DFFA] shadow-xs space-y-1">
              <div className="text-xs text-[#666666] font-semibold flex items-center justify-between">
                <span>Active Members</span>
                <UserCheck className="h-4 w-4 text-emerald-600" />
              </div>
              <div className="text-2xl font-bold text-[#010619]">{analytics.activeMembers}</div>
              <div className="text-[11px] text-[#666666] font-medium">Total active subscribers</div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-[#D8DFFA] shadow-xs space-y-1">
              <div className="text-xs text-[#666666] font-semibold flex items-center justify-between">
                <span>Monthly Recurring (MRR)</span>
                <TrendingUp className="h-4 w-4 text-primary" />
              </div>
              <div className="text-2xl font-bold text-primary">₹{analytics.mrr.toLocaleString()}</div>
              <div className="text-[11px] text-[#666666] font-medium">Estimated monthly revenue</div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-[#D8DFFA] shadow-xs space-y-1">
              <div className="text-xs text-[#666666] font-semibold flex items-center justify-between">
                <span>New This Month</span>
                <Users className="h-4 w-4 text-primary" />
              </div>
              <div className="text-2xl font-bold text-[#010619]">+{analytics.newThisMonth}</div>
              <div className="text-[11px] text-[#666666] font-medium">Joined last 30 days</div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-[#D8DFFA] shadow-xs space-y-1">
              <div className="text-xs text-[#666666] font-semibold flex items-center justify-between">
                <span>Cancelled / Expired</span>
                <UserX className="h-4 w-4 text-[#666666]" />
              </div>
              <div className="text-2xl font-bold text-[#010619]">{analytics.cancelled}</div>
              <div className="text-[11px] text-[#666666] font-medium">Past subscriptions</div>
            </div>
          </div>

          {/* OVERVIEW CARD */}
          {config && (
            <div className="bg-white p-6 rounded-2xl border border-[#D8DFFA] shadow-xs space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#D8DFFA] pb-4">
                <div>
                  <span className="text-[10px] font-bold uppercase bg-primary/10 text-primary px-2.5 py-0.5 rounded-full">
                    MEMBERSHIP PRODUCT
                  </span>
                  <h2 className="text-xl font-bold text-[#010619] mt-1">{config.name}</h2>
                  <p className="text-xs text-[#666666] font-medium">{config.shortDescription}</p>
                </div>

                {config.productId && (
                  <Link href={`/dashboard/membership/${config.productId}/setup`}>
                    <Button variant="outline" size="sm" className="rounded-xl text-xs font-semibold gap-1 border-[#D8DFFA] bg-white hover:bg-[#E8EDFB] text-[#010619]">
                      <Settings className="h-4 w-4" /> Edit Plan & Benefits
                    </Button>
                  </Link>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                <div className="bg-[#EEF1FB] p-3 rounded-xl border border-[#D8DFFA]">
                  <span className="text-[#666666] font-semibold">Price & Interval</span>
                  <div className="font-bold text-primary mt-0.5">
                    {config.isFree ? 'FREE' : `${formatMoney(config.price, config.currency)} / ${(config.billingType || 'MONTHLY').toLowerCase()}`}
                  </div>
                </div>

                <div className="bg-[#EEF1FB] p-3 rounded-xl border border-[#D8DFFA]">
                  <span className="text-[#666666] font-semibold">Benefits</span>
                  <div className="font-bold text-[#010619] mt-0.5">{config.benefits?.length || 0} Included</div>
                </div>

                <div className="bg-[#EEF1FB] p-3 rounded-xl border border-[#D8DFFA]">
                  <span className="text-[#666666] font-semibold">Unlocked Resources</span>
                  <div className="font-bold text-[#010619] mt-0.5">{config.unlockedResources?.length || 0} Products</div>
                </div>
              </div>
            </div>
          )}

          {/* MEMBER ROSTER TABLE */}
          <div className="bg-white rounded-2xl p-6 border border-[#D8DFFA] shadow-xs space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#D8DFFA] pb-4">
              <div>
                <h2 className="text-base font-bold text-[#010619]">Member Directory</h2>
                <p className="text-xs text-[#666666] font-medium">Search active members, view subscription status, and billing renewal dates.</p>
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="h-10 rounded-xl border border-[#D8DFFA] text-xs font-semibold px-3 bg-white text-[#010619] focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="ACTIVE">Active</option>
                  <option value="TRIALING">Trialing</option>
                  <option value="CANCELLED">Cancelled</option>
                  <option value="EXPIRED">Expired</option>
                </select>

                <div className="relative w-56">
                  <Search className="h-4 w-4 text-[#666666] absolute left-3 top-3" />
                  <Input
                    placeholder="Search member..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="h-10 pl-9 rounded-xl text-xs font-medium border-[#D8DFFA] bg-white text-[#010619]"
                  />
                </div>
              </div>
            </div>

            {loading ? (
              <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 w-full rounded-xl" />)}</div>
            ) : filteredMembers.length === 0 ? (
              <div className="py-8 text-center text-xs text-[#666666] font-medium">No members found.</div>
            ) : (
              <div className="divide-y divide-[#D8DFFA] overflow-x-auto">
                {filteredMembers.map((mem) => (
                  <div key={mem.id} className="py-3 flex items-center justify-between gap-4 text-xs">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold uppercase shrink-0">
                        {(mem.customerName || mem.customerEmail || 'M')[0]}
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-[#010619] truncate">{mem.customerName}</div>
                        <div className="text-[#666666] text-[11px]">{mem.customerEmail}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-[#666666] font-medium">
                      <div>
                        <div className="text-[11px] text-[#666666] font-semibold">Billing Interval</div>
                        <div className="font-bold text-[#010619] capitalize">{mem.billingInterval.toLowerCase()}</div>
                      </div>

                      <div>
                        <div className="text-[11px] text-[#666666] font-semibold">Next Renewal</div>
                        <div className="font-bold text-[#010619]">{new Date(mem.currentPeriodEnd).toLocaleDateString()}</div>
                      </div>

                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        mem.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : mem.status === 'CANCELLED' ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-[#EEF1FB] text-[#010619] border border-[#D8DFFA]'
                      }`}>
                        {mem.cancelAtPeriodEnd ? 'CANCELS AT END' : mem.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      )}

    </div>
  )
}
