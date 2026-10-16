'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { api, formatMoney } from '@/lib/clientApi'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import {
  Users, Check, Lock, CheckCircle2, ArrowRight, Sparkles, Layers, ShieldCheck
} from 'lucide-react'

export default function MembershipWidget({ productId, onSubscribed }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  // Registration Form State
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [subscribing, setSubscribing] = useState(false)
  const [isMember, setIsMember] = useState(false)
  const [subData, setSubData] = useState(null)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedEmail = localStorage.getItem('creatorzero_customer_email') || ''
      setEmail(savedEmail)
    }
  }, [])

  useEffect(() => {
    if (!productId) return
    let mounted = true
    api.get(`/membership/public/${productId}`)
      .then((res) => {
        if (mounted) {
          setData(res)
          setLoading(false)
        }
      })
      .catch(() => { if (mounted) setLoading(false) })
    return () => { mounted = false }
  }, [productId])

  useEffect(() => {
    if (!productId || !email) return
    api.get(`/membership/student/subscriptions?email=${encodeURIComponent(email)}`)
      .then((res) => {
        const found = (res.items || []).find(item => item.subscription?.productId === productId && (item.subscription?.status === 'ACTIVE' || item.subscription?.status === 'TRIALING'))
        if (found) {
          setIsMember(true)
          setSubData(found.subscription)
        }
      })
      .catch(() => {})
  }, [productId, email])

  if (loading || !data?.config) return null

  const { config, activeMembersCount } = data
  const priceDisplay = config.isFree ? 'FREE' : `${formatMoney(config.price, config.currency)} / ${(config.billingType || 'MONTHLY').toLowerCase()}`

  async function handleFreeSubscription(e) {
    e.preventDefault()
    if (!email) {
      toast.error('Please enter your email address.')
      return
    }

    setSubscribing(true)
    try {
      const res = await api.post('/membership/subscribe-free', {
        productId,
        name: name || email.split('@')[0],
        email,
      })
      if (typeof window !== 'undefined') {
        localStorage.setItem('creatorzero_customer_email', email)
      }
      toast.success("Welcome! Your membership is active. 🎉")
      setIsMember(true)
      setSubData(res.subscription)
      if (onSubscribed) onSubscribed(res.subscription)
    } catch (err) {
      toast.error(err.message || 'Subscription failed')
    } finally {
      setSubscribing(false)
    }
  }

  return (
    <div className="bg-white rounded-3xl p-6 sm:p-8 border border-white/10 shadow-md space-y-6 font-sans text-[#F4F2EC]">
      
      {/* Header Badge */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-5">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-2xl bg-primary/15 text-primary flex items-center justify-center font-black shrink-0">
            <Users className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase bg-primary/10 text-primary px-2.5 py-0.5 rounded-full flex items-center gap-1">
                <Users className="h-3 w-3" /> RECURRING MEMBERSHIP
              </span>
              <span className="text-xs text-[rgba(244,242,236,0.5)] font-bold">{config.category}</span>
            </div>
            <h3 className="font-extrabold text-xl text-[#F4F2EC] mt-0.5">{config.name}</h3>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-[#12141c] px-3 py-1.5 rounded-full border border-white/10 text-xs font-bold text-[#F4F2EC]">
          <Users className="h-4 w-4 text-primary" />
          <span>{activeMembersCount} Active Members</span>
        </div>
      </div>

      {/* Pricing Header */}
      <div className="bg-primary/10 p-4 rounded-2xl border border-primary/20 flex items-center justify-between">
        <div>
          <span className="text-xs font-bold text-[rgba(244,242,236,0.5)] uppercase">Subscription Price</span>
          <div className="text-xl font-black text-primary">{priceDisplay}</div>
        </div>

        <div className="text-right">
          <span className="text-xs font-bold text-[rgba(244,242,236,0.5)] uppercase">Billing Cycle</span>
          <div className="text-xs font-black text-[#F4F2EC] capitalize">{config.billingType?.toLowerCase()} recurring</div>
        </div>
      </div>

      {/* Included Benefits */}
      {config.benefits?.length > 0 && (
        <div className="space-y-2.5">
          <h4 className="text-xs font-black uppercase text-[rgba(244,242,236,0.5)]">Included Member Benefits</h4>
          <div className="space-y-2">
            {config.benefits.map((b, i) => (
              <div key={b.id || i} className="flex items-start gap-2.5 text-xs">
                <div className="h-5 w-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold shrink-0 mt-0.5">
                  <Check className="h-3 w-3" />
                </div>
                <div>
                  <span className="font-extrabold text-[#F4F2EC]">{b.title}</span>
                  {b.description && <p className="text-[rgba(244,242,236,0.68)] font-medium text-[11px]">{b.description}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Unlocked Resources */}
      {config.unlockedResources?.length > 0 && (
        <div className="space-y-2.5 pt-2 border-t border-white/10">
          <h4 className="text-xs font-black uppercase text-[rgba(244,242,236,0.5)]">Unlocked Products & Content</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            {config.unlockedResources.map((r, i) => (
              <div key={i} className="p-3 bg-[#12141c] rounded-xl border border-white/10 flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-primary shrink-0" />
                <span className="font-extrabold text-[#F4F2EC] truncate">{r.resourceName || r.resourceId}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Already Subscribed Screen */}
      {isMember ? (
        <div className="bg-emerald-50 p-6 rounded-2xl border border-emerald-200 text-center space-y-4">
          <div className="h-12 w-12 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle2 className="h-7 w-7" />
          </div>
          <div>
            <h4 className="text-lg font-black text-emerald-900">Your Membership is Active!</h4>
            <p className="text-xs text-emerald-700 font-medium mt-0.5">You have full member access to all benefits and unlocked products.</p>
          </div>

          <Link href="/account/memberships">
            <Button className="w-full h-12 bg-primary hover:bg-primary text-white font-extrabold text-xs rounded-xl shadow-md gap-2">
              <Users className="h-4 w-4" /> Go to My Memberships
            </Button>
          </Link>
        </div>
      ) : config.isFree ? (
        /* FREE MEMBERSHIP FORM */
        <form onSubmit={handleFreeSubscription} className="space-y-4 pt-2 border-t border-white/10">
          <h4 className="text-xs font-black uppercase text-[rgba(244,242,236,0.5)]">Join Free Membership</h4>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs font-bold text-[#F4F2EC]">Full Name</Label>
              <Input
                placeholder="Jane Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-10 text-xs rounded-xl"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-bold text-[#F4F2EC]">Email Address *</Label>
              <Input
                type="email"
                required
                placeholder="jane@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-10 text-xs rounded-xl"
              />
            </div>
          </div>

          <Button type="submit" disabled={subscribing} className="w-full h-12 bg-primary hover:bg-primary text-white font-extrabold text-xs rounded-2xl shadow-md gap-1">
            {subscribing ? 'Activating...' : <>Join Membership Now <ArrowRight className="h-4 w-4" /></>}
          </Button>
        </form>
      ) : null}

    </div>
  )
}
