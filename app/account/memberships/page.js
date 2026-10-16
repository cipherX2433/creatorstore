'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { api, formatMoney } from '@/lib/clientApi'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import {
  Users, Calendar, Clock, ShieldCheck, CheckCircle2, XCircle, ArrowLeft, Loader2, RefreshCw, Ban
} from 'lucide-react'

export default function CustomerMembershipsPage() {
  const [email, setEmail] = useState('')
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('active') // 'active' | 'past'

  useEffect(() => {
    api.get('/me')
      .then((res) => {
        if (res.user && res.user.email) {
          setEmail(res.user.email)
        } else {
          const saved = typeof window !== 'undefined' ? (localStorage.getItem('creatorzero_customer_email') || '') : ''
          setEmail(saved)
        }
      })
      .catch(() => {
        const saved = typeof window !== 'undefined' ? (localStorage.getItem('creatorzero_customer_email') || '') : ''
        setEmail(saved)
      })
  }, [])

  useEffect(() => {
    if (!email) {
      setLoading(false)
      return
    }
    fetchCustomerMemberships(email)
  }, [email])

  function fetchCustomerMemberships(custEmail) {
    setLoading(true)
    api.get(`/membership/student/subscriptions?email=${encodeURIComponent(custEmail)}`)
      .then((res) => {
        setItems(res.items || [])
        setLoading(false)
      })
      .catch((err) => {
        toast.error(err.message || 'Failed to load your memberships')
        setLoading(false)
      })
  }

  function handleEmailSubmit(e) {
    e.preventDefault()
    if (!email) return
    if (typeof window !== 'undefined') {
      localStorage.setItem('creatorzero_customer_email', email)
    }
    fetchCustomerMemberships(email)
  }

  async function handleCancelSubscription(subId) {
    if (!confirm('Are you sure you want to cancel your membership subscription? You will retain access until the end of your billing period.')) return
    try {
      await api.post(`/membership/subscriptions/${subId}/cancel?email=${encodeURIComponent(email)}`)
      toast.success('Subscription cancelled. Access remains active until the end of your billing period.')
      fetchCustomerMemberships(email)
    } catch (err) {
      toast.error(err.message || 'Failed to cancel subscription')
    }
  }

  async function handleResumeSubscription(subId) {
    try {
      await api.post(`/membership/subscriptions/${subId}/resume?email=${encodeURIComponent(email)}`)
      toast.success('Subscription resumed! Auto-renewal is re-enabled.')
      fetchCustomerMemberships(email)
    } catch (err) {
      toast.error(err.message || 'Failed to resume subscription')
    }
  }

  const activeMemberships = items.filter(i => i.subscription?.status === 'ACTIVE' || i.subscription?.status === 'TRIALING')
  const pastMemberships = items.filter(i => i.subscription?.status !== 'ACTIVE' && i.subscription?.status !== 'TRIALING')

  const displayed = activeTab === 'active' ? activeMemberships : pastMemberships

  if (!email && !loading) {
    return (
      <div className="min-h-screen bg-[#000000] flex items-center justify-center p-6 text-[#F4F2EC] font-sans">
        <div className="max-w-md w-full bg-[#12141c] p-8 rounded-3xl border border-white/10 shadow-xl space-y-5 text-center">
          <div className="h-14 w-14 bg-primary/15 text-primary rounded-2xl flex items-center justify-center mx-auto shadow-xs">
            <Users className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-[#F4F2EC]">My Memberships</h1>
            <p className="text-xs text-[rgba(244,242,236,0.68)] font-medium mt-1">Enter your customer email address to manage your active subscriptions and access member benefits.</p>
          </div>

          <form onSubmit={handleEmailSubmit} className="space-y-3 pt-2 text-left">
            <div className="space-y-1">
              <label className="text-xs font-bold text-[#F4F2EC]">Customer Email</label>
              <Input
                type="email"
                required
                placeholder="your.email@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-11 text-xs rounded-xl"
              />
            </div>
            <Button type="submit" className="w-full h-11 bg-primary hover:bg-primary text-white text-xs font-extrabold rounded-xl">
              Access My Memberships
            </Button>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-6 font-sans text-[#F4F2EC]">
      
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-5">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-2xl bg-primary/15 text-primary flex items-center justify-center font-black shrink-0">
            <Users className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-[#F4F2EC] tracking-tight">My Active Memberships</h1>
            <p className="text-xs text-[rgba(244,242,236,0.68)] font-medium">Manage recurring subscriptions, view renewal dates, and access unlocked resources.</p>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-[#12141c] px-3 py-1.5 rounded-full border border-white/10 text-xs font-bold text-[rgba(244,242,236,0.68)]">
          <span>Customer: {email}</span>
        </div>
      </div>

      {/* TABS */}
      <div className="flex items-center gap-2 border-b border-white/10 pb-2">
        <button
          onClick={() => setActiveTab('active')}
          className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center gap-1.5 ${
            activeTab === 'active' ? 'bg-primary text-[#000000] shadow-xs' : 'text-[rgba(244,242,236,0.68)] hover:bg-[#12141c]'
          }`}
        >
          Active Subscriptions ({activeMemberships.length})
        </button>
        <button
          onClick={() => setActiveTab('past')}
          className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center gap-1.5 ${
            activeTab === 'past' ? 'bg-primary text-[#000000] shadow-xs' : 'text-[rgba(244,242,236,0.68)] hover:bg-[#12141c]'
          }`}
        >
          Past & Cancelled ({pastMemberships.length})
        </button>
      </div>

      {/* MEMBERSHIPS LIST */}
      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-48 w-full rounded-3xl" />
          <Skeleton className="h-48 w-full rounded-3xl" />
        </div>
      ) : displayed.length === 0 ? (
        <div className="bg-[#12141c] rounded-3xl p-12 border border-dashed border-white/10 text-center space-y-2">
          <Users className="h-10 w-10 text-slate-300 mx-auto" />
          <h3 className="text-base font-extrabold text-[#F4F2EC]">No {activeTab} memberships found</h3>
          <p className="text-xs text-[rgba(244,242,236,0.68)] font-medium">When you subscribe to membership products, your passes and benefits will appear here.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {displayed.map((item) => {
            const { subscription, config, product } = item
            const endStr = new Date(subscription.currentPeriodEnd).toLocaleDateString()

            return (
              <div key={subscription.id} className="bg-[#12141c] rounded-3xl p-6 border border-white/10 shadow-sm space-y-5">
                
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
                  <div className="flex items-center gap-3">
                    {product.thumbnail ? (
                      <img src={product.thumbnail} alt="" className="h-12 w-12 rounded-2xl object-cover shrink-0" />
                    ) : (
                      <div className="h-12 w-12 rounded-2xl bg-primary/15 text-primary flex items-center justify-center font-black text-lg shrink-0">
                        <Users className="h-6 w-6" />
                      </div>
                    )}
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                          subscription.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-[#F4F2EC]'
                        }`}>
                          {subscription.cancelAtPeriodEnd ? 'CANCELS AT PERIOD END' : subscription.status}
                        </span>
                      </div>
                      <h3 className="font-extrabold text-base text-[#F4F2EC] mt-0.5">{config.name || product.title}</h3>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {subscription.cancelAtPeriodEnd ? (
                      <Button size="sm" variant="outline" onClick={() => handleResumeSubscription(subscription.id)} className="text-xs font-bold rounded-xl text-primary border-primary/30">
                        Resume Subscription
                      </Button>
                    ) : (
                      <Button size="sm" variant="outline" onClick={() => handleCancelSubscription(subscription.id)} className="text-xs font-bold rounded-xl text-red-500 hover:bg-red-50 border-red-200">
                        Cancel Subscription
                      </Button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs bg-[#12141c] p-4 rounded-2xl border border-white/10">
                  <div className="space-y-0.5">
                    <span className="text-[rgba(244,242,236,0.5)] font-bold">Plan & Interval</span>
                    <div className="font-extrabold text-primary">{formatMoney(subscription.price, subscription.currency)} / {subscription.billingInterval.toLowerCase()}</div>
                  </div>

                  <div className="space-y-0.5">
                    <span className="text-[rgba(244,242,236,0.5)] font-bold">Next Renewal / Expiry</span>
                    <div className="font-extrabold text-[#F4F2EC]">{endStr}</div>
                  </div>

                  <div className="space-y-0.5">
                    <span className="text-[rgba(244,242,236,0.5)] font-bold">Auto Renewal Status</span>
                    <div className="font-extrabold text-[#F4F2EC]">{subscription.cancelAtPeriodEnd ? 'Disabled (Expires on ' + endStr + ')' : 'Active (Auto-Renews)'}</div>
                  </div>
                </div>

                {/* Benefits */}
                {config.benefits?.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-[11px] font-black uppercase text-[rgba(244,242,236,0.5)]">Included Benefits</span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      {config.benefits.map((b, i) => (
                        <div key={b.id || i} className="flex items-center gap-2 text-[#F4F2EC] font-bold">
                          <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                          <span>{b.title}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Unlocked Resources Links */}
                {config.unlockedResources?.length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-white/10">
                    <span className="text-[11px] font-black uppercase text-[rgba(244,242,236,0.5)]">Unlocked Content Passes</span>
                    <div className="flex flex-wrap gap-2 text-xs">
                      {config.unlockedResources.map((r, i) => (
                        <div key={i} className="px-3 py-1.5 bg-primary/10 text-primary rounded-xl border border-primary/20 font-bold flex items-center gap-1.5">
                          <ShieldCheck className="h-4 w-4" />
                          <span>{r.resourceName || r.resourceId}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              </div>
            )
          })}
        </div>
      )}

    </div>
  )
}
