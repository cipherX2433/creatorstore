'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { api } from '@/lib/clientApi'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import {
  Users, MessageSquare, Shield, Activity, Plus, Search, UserX, ShieldAlert, CheckCircle2, XCircle
} from 'lucide-react'

export default function CreatorCommunityDashboard() {
  const [products, setProducts] = useState([])
  const [selectedProductId, setSelectedProductId] = useState('')
  const [stats, setStats] = useState({ totalMembers: 0, totalPosts: 0, activeToday: 0 })
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    loadCommunityProducts()
  }, [])

  function loadCommunityProducts() {
    setLoading(true)
    api.get('/products')
      .then((res) => {
        const commProds = (res.products || []).filter(p => p.type === 'COMMUNITY')
        setProducts(commProds)
        if (commProds.length > 0) {
          setSelectedProductId(commProds[0].id)
          fetchCommunityData(commProds[0].id)
        } else {
          setLoading(false)
        }
      })
      .catch(() => setLoading(false))
  }

  function fetchCommunityData(prodId) {
    setLoading(true)
    Promise.all([
      api.get(`/community/creator/stats?productId=${prodId}`),
      api.get(`/community/${prodId}/members`),
    ]).then(([statsRes, membersRes]) => {
      setStats(statsRes || { totalMembers: 0, totalPosts: 0, activeToday: 0 })
      setMembers(membersRes.items || [])
      setLoading(false)
    }).catch(() => setLoading(false))
  }

  async function handleManageMember(targetEmail, role, status) {
    if (!selectedProductId) return
    try {
      await api.post('/community/creator/members/manage', {
        communityId: selectedProductId,
        targetEmail,
        role,
        status,
      })
      toast.success(`Updated member ${targetEmail}`)
      fetchCommunityData(selectedProductId)
    } catch (err) {
      toast.error(err.message || 'Failed to update member')
    }
  }

  const filteredMembers = members.filter(m =>
    (m.customerEmail || '').toLowerCase().includes(search.toLowerCase()) ||
    (m.customerName || '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-8">
      
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-primary/20 pb-5">
        <div>
          <h1 className="text-3xl font-black text-[#F4F2EC] tracking-tight">Community Management</h1>
          <p className="text-sm text-[rgba(244,242,236,0.68)] font-medium">Manage members, assign moderator roles, view post analytics, and moderate discussions.</p>
        </div>

        <div className="flex items-center gap-3">
          {products.length > 1 && (
            <select
              value={selectedProductId}
              onChange={(e) => { setSelectedProductId(e.target.value); fetchCommunityData(e.target.value) }}
              className="h-10 rounded-xl border border-white/10 text-xs font-extrabold px-3 bg-white"
            >
              {products.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
            </select>
          )}

          <Link href="/dashboard/products/new">
            <Button className="bg-primary hover:bg-primary text-white font-extrabold text-xs rounded-xl shadow-md gap-1.5">
              <Plus className="h-4 w-4" /> Create Community
            </Button>
          </Link>
        </div>
      </div>

      {products.length === 0 && !loading ? (
        <div className="rounded-3xl border border-dashed border-white/10 bg-white p-12 text-center space-y-3">
          <Users className="h-10 w-10 text-slate-300 mx-auto" />
          <h3 className="text-base font-extrabold text-[#F4F2EC]">No Community Created Yet</h3>
          <p className="text-xs text-[rgba(244,242,236,0.68)] max-w-sm mx-auto">Create a private group space to build your community and engage with your paid members.</p>
          <div className="pt-2">
            <Link href="/dashboard/products/new">
              <Button className="bg-primary hover:bg-primary text-white font-extrabold text-xs rounded-xl shadow-md">
                Create Community
              </Button>
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          
          {/* STATS OVERVIEW */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-3xl border border-white/10 shadow-2xs space-y-1">
              <span className="text-xs font-bold text-[rgba(244,242,236,0.5)]">Total Active Members</span>
              <div className="text-3xl font-black text-[#F4F2EC] flex items-center gap-2">
                <Users className="h-6 w-6 text-primary" /> {stats.totalMembers}
              </div>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-white/10 shadow-2xs space-y-1">
              <span className="text-xs font-bold text-[rgba(244,242,236,0.5)]">Total Posts & Discussions</span>
              <div className="text-3xl font-black text-[#F4F2EC] flex items-center gap-2">
                <MessageSquare className="h-6 w-6 text-primary" /> {stats.totalPosts}
              </div>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-white/10 shadow-2xs space-y-1">
              <span className="text-xs font-bold text-[rgba(244,242,236,0.5)]">Active Today</span>
              <div className="text-3xl font-black text-emerald-600 flex items-center gap-2">
                <Activity className="h-6 w-6 text-emerald-500" /> {stats.activeToday}
              </div>
            </div>
          </div>

          {/* MEMBER MANAGEMENT TABLE */}
          <div className="bg-white rounded-3xl p-6 border border-white/10 shadow-sm space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
              <div>
                <h2 className="text-base font-extrabold text-[#F4F2EC]">Member Roster & Roles</h2>
                <p className="text-xs text-[rgba(244,242,236,0.68)] font-medium">Manage permissions, promote admins, or suspend inappropriate members.</p>
              </div>

              <div className="relative w-64">
                <Search className="h-4 w-4 text-[rgba(244,242,236,0.5)] absolute left-3 top-3" />
                <Input
                  placeholder="Search members..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-10 pl-9 rounded-xl text-xs font-medium"
                />
              </div>
            </div>

            {loading ? (
              <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 w-full rounded-xl" />)}</div>
            ) : filteredMembers.length === 0 ? (
              <div className="py-8 text-center text-xs text-[rgba(244,242,236,0.5)] font-medium">No members found.</div>
            ) : (
              <div className="divide-y divide-slate-100 overflow-x-auto">
                {filteredMembers.map((m) => (
                  <div key={m.id} className="py-3 flex items-center justify-between gap-4 text-xs">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-9 w-9 rounded-full bg-primary/15 text-primary flex items-center justify-center font-black uppercase shrink-0">
                        {(m.customerEmail || 'M')[0]}
                      </div>
                      <div className="min-w-0">
                        <div className="font-extrabold text-[#F4F2EC] truncate">{m.customerName || m.customerEmail}</div>
                        <div className="text-[rgba(244,242,236,0.5)] text-[11px]">{m.customerEmail}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                        m.role === 'OWNER' ? 'bg-amber-100 text-amber-800' : m.role === 'ADMIN' ? 'bg-primary/15 text-primary' : 'bg-slate-100 text-[#F4F2EC]'
                      }`}>
                        {m.role || 'MEMBER'}
                      </span>

                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                        m.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
                      }`}>
                        {m.status}
                      </span>

                      {m.role !== 'OWNER' && (
                        <div className="flex items-center gap-1">
                          {m.role === 'ADMIN' ? (
                            <Button size="sm" variant="outline" onClick={() => handleManageMember(m.customerEmail, 'MEMBER', m.status)} className="h-8 text-[11px] font-bold rounded-lg">
                              Demote to Member
                            </Button>
                          ) : (
                            <Button size="sm" variant="outline" onClick={() => handleManageMember(m.customerEmail, 'ADMIN', m.status)} className="h-8 text-[11px] font-bold rounded-lg text-primary">
                              Make Admin
                            </Button>
                          )}

                          {m.status === 'ACTIVE' ? (
                            <Button size="sm" variant="outline" onClick={() => handleManageMember(m.customerEmail, m.role, 'SUSPENDED')} className="h-8 text-[11px] font-bold rounded-lg text-red-600 hover:bg-red-50">
                              Suspend
                            </Button>
                          ) : (
                            <Button size="sm" variant="outline" onClick={() => handleManageMember(m.customerEmail, m.role, 'ACTIVE')} className="h-8 text-[11px] font-bold rounded-lg text-emerald-600 hover:bg-emerald-50">
                              Reactivate
                            </Button>
                          )}
                        </div>
                      )}
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
