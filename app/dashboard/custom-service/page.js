'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { api, formatMoney } from '@/lib/clientApi'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import {
  Sparkles, DollarSign, Clock, CheckCircle2, AlertCircle, Plus, Search,
  FileText, ExternalLink, Settings, ShieldCheck, UserCheck, MessageSquare
} from 'lucide-react'

export default function CreatorCustomServiceDashboard() {
  const [products, setProducts] = useState([])
  const [selectedProductId, setSelectedProductId] = useState('')
  const [requests, setRequests] = useState([])
  const [analytics, setAnalytics] = useState({ totalRequests: 0, activeRequests: 0, completedRequests: 0, totalRevenue: 0 })
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')

  useEffect(() => {
    loadCustomServiceData()
  }, [])

  function loadCustomServiceData() {
    setLoading(true)
    Promise.all([
      api.get('/products'),
      api.get('/custom-service/creator/analytics'),
    ]).then(([prodsRes, analRes]) => {
      const csProds = (prodsRes.products || []).filter(p => p.type === 'CUSTOM_PRODUCT' || p.type === 'CUSTOM_SERVICE')
      setProducts(csProds)
      setAnalytics(analRes)
      if (csProds.length > 0) {
        setSelectedProductId(csProds[0].id)
        fetchRequests(csProds[0].id)
      } else {
        setLoading(false)
      }
    }).catch(() => setLoading(false))
  }

  function fetchRequests(prodId) {
    setLoading(true)
    api.get(`/custom-service/creator/requests?productId=${prodId}`)
      .then((res) => {
        setRequests(res.items || [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }

  const filteredRequests = requests.filter((r) => {
    const matchesStatus = statusFilter === 'ALL' || r.status === statusFilter
    const matchesSearch = (r.customerName || '').toLowerCase().includes(search.toLowerCase()) ||
                          (r.customerEmail || '').toLowerCase().includes(search.toLowerCase())
    return matchesStatus && matchesSearch
  })

  return (
    <div className="space-y-8 font-sans">
      
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-primary/20 pb-5">
        <div>
          <h1 className="text-3xl font-black text-[#F4F2EC] tracking-tight flex items-center gap-2">
            <Sparkles className="h-7 w-7 text-primary" /> Custom Services Workspace
          </h1>
          <p className="text-sm text-[rgba(244,242,236,0.68)] font-medium">Manage incoming client requests, submit deliverables, and handle revisions.</p>
        </div>

        <div className="flex items-center gap-3">
          {products.length > 1 && (
            <select
              value={selectedProductId}
              onChange={(e) => { setSelectedProductId(e.target.value); fetchRequests(e.target.value) }}
              className="h-10 rounded-xl border border-white/10 text-xs font-extrabold px-3 bg-white"
            >
              {products.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
            </select>
          )}

          <Link href="/dashboard/products/new">
            <Button className="bg-primary hover:bg-primary text-white font-extrabold text-xs rounded-xl shadow-md gap-1.5">
              <Plus className="h-4 w-4" /> Create Custom Service
            </Button>
          </Link>
        </div>
      </div>

      {products.length === 0 && !loading ? (
        <div className="rounded-3xl border border-dashed border-white/10 bg-white p-12 text-center space-y-3">
          <Sparkles className="h-10 w-10 text-slate-300 mx-auto" />
          <h3 className="text-base font-extrabold text-[#F4F2EC]">No Custom Services Created Yet</h3>
          <p className="text-xs text-[rgba(244,242,236,0.68)] max-w-sm mx-auto">Offer resume reviews, portfolio audits, custom consulting reports, and bespoke deliverables.</p>
          <div className="pt-2">
            <Link href="/dashboard/products/new">
              <Button className="bg-primary hover:bg-primary text-white font-extrabold text-xs rounded-xl shadow-md">
                Create Custom Service
              </Button>
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          
          {/* ANALYTICS STATS CARDS */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-3xl border border-white/10 shadow-xs space-y-1">
              <div className="text-xs text-[rgba(244,242,236,0.5)] font-extrabold flex items-center justify-between">
                <span>Active Requests</span>
                <Clock className="h-4 w-4 text-primary" />
              </div>
              <div className="text-2xl font-black text-primary">{analytics.activeRequests}</div>
              <div className="text-[11px] text-[rgba(244,242,236,0.68)] font-medium">In progress or submitted</div>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-white/10 shadow-xs space-y-1">
              <div className="text-xs text-[rgba(244,242,236,0.5)] font-extrabold flex items-center justify-between">
                <span>Completed</span>
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              </div>
              <div className="text-2xl font-black text-[#F4F2EC]">{analytics.completedRequests}</div>
              <div className="text-[11px] text-[rgba(244,242,236,0.68)] font-medium">Delivered & accepted</div>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-white/10 shadow-xs space-y-1">
              <div className="text-xs text-[rgba(244,242,236,0.5)] font-extrabold flex items-center justify-between">
                <span>Total Requests</span>
                <FileText className="h-4 w-4 text-primary" />
              </div>
              <div className="text-2xl font-black text-[#F4F2EC]">{analytics.totalRequests}</div>
              <div className="text-[11px] text-[rgba(244,242,236,0.68)] font-medium">All time submissions</div>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-white/10 shadow-xs space-y-1">
              <div className="text-xs text-[rgba(244,242,236,0.5)] font-extrabold flex items-center justify-between">
                <span>Total Revenue</span>
                <DollarSign className="h-4 w-4 text-emerald-500" />
              </div>
              <div className="text-2xl font-black text-[#F4F2EC]">₹{analytics.totalRevenue.toLocaleString()}</div>
              <div className="text-[11px] text-[rgba(244,242,236,0.68)] font-medium">Earned from services</div>
            </div>
          </div>

          {/* REQUESTS LIST TABLE */}
          <div className="bg-white rounded-3xl p-6 border border-white/10 shadow-sm space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
              <div>
                <h2 className="text-base font-extrabold text-[#F4F2EC]">Client Service Requests</h2>
                <p className="text-xs text-[rgba(244,242,236,0.68)] font-medium">Review customer requirements, manage clarifications, and upload deliverables.</p>
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="h-10 rounded-xl border border-white/10 text-xs font-bold px-3 bg-white"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="SUBMITTED">Submitted</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="CLARIFICATION_REQUIRED">Clarification Needed</option>
                  <option value="DELIVERED">Delivered</option>
                  <option value="REVISION_REQUESTED">Revision Requested</option>
                  <option value="COMPLETED">Completed</option>
                </select>

                <div className="relative w-56">
                  <Search className="h-4 w-4 text-[rgba(244,242,236,0.5)] absolute left-3 top-3" />
                  <Input
                    placeholder="Search client..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="h-10 pl-9 rounded-xl text-xs font-medium"
                  />
                </div>
              </div>
            </div>

            {loading ? (
              <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 w-full rounded-xl" />)}</div>
            ) : filteredRequests.length === 0 ? (
              <div className="py-8 text-center text-xs text-[rgba(244,242,236,0.5)] font-medium">No service requests found.</div>
            ) : (
              <div className="divide-y divide-slate-100 overflow-x-auto">
                {filteredRequests.map((req) => {
                  const dueStr = new Date(req.dueAt).toLocaleDateString()
                  const isOverdue = new Date(req.dueAt).getTime() < Date.now() && req.status !== 'COMPLETED' && req.status !== 'DELIVERED'

                  return (
                    <div key={req.id} className="py-3 flex items-center justify-between gap-4 text-xs">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="h-9 w-9 rounded-full bg-primary/15 text-primary flex items-center justify-center font-black uppercase shrink-0">
                          {(req.customerName || req.customerEmail || 'C')[0]}
                        </div>
                        <div className="min-w-0">
                          <div className="font-extrabold text-[#F4F2EC] truncate">{req.customerName}</div>
                          <div className="text-[rgba(244,242,236,0.5)] text-[11px]">{req.customerEmail}</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 text-[rgba(244,242,236,0.68)] font-medium">
                        <div>
                          <div className="text-[11px] text-[rgba(244,242,236,0.5)] font-bold">Due Date</div>
                          <div className={`font-extrabold ${isOverdue ? 'text-red-500' : 'text-[#F4F2EC]'}`}>{dueStr}</div>
                        </div>

                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                          req.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-800' :
                          req.status === 'DELIVERED' ? 'bg-primary/15 text-primary' :
                          req.status === 'REVISION_REQUESTED' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-[#F4F2EC]'
                        }`}>
                          {req.status}
                        </span>

                        <Link href={`/dashboard/custom-service/request/${req.id}`}>
                          <Button size="sm" className="bg-primary hover:bg-primary text-white rounded-xl text-xs font-bold gap-1">
                            Open Workspace <ExternalLink className="h-3.5 w-3.5" />
                          </Button>
                        </Link>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

        </div>
      )}

    </div>
  )
}
