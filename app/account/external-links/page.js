'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { api } from '@/lib/clientApi'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import {
  Link2, ExternalLink as ExternalIcon, Check, Lock, Sparkles, ArrowRight,
  Globe, Youtube, Disc as Discord, FileText, HardDrive, Calendar
} from 'lucide-react'

const ICON_MAP = {
  YOUTUBE: Youtube,
  DISCORD: Discord,
  NOTION: FileText,
  GOOGLE_DRIVE: HardDrive,
  CALENDLY: Calendar,
  WEBSITE: Globe,
  OTHER: Link2,
}

export default function CustomerExternalLinksPage() {
  const [email, setEmail] = useState('')
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [openingId, setOpeningId] = useState(null)

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
    fetchCustomerPurchases(email)
  }, [email])

  function fetchCustomerPurchases(custEmail) {
    setLoading(true)
    api.get(`/external-link/student/purchases?email=${encodeURIComponent(custEmail)}`)
      .then((res) => {
        setItems(res.items || [])
        setLoading(false)
      })
      .catch((err) => {
        toast.error(err.message || 'Failed to load your external link resources')
        setLoading(false)
      })
  }

  function handleEmailSubmit(e) {
    e.preventDefault()
    if (!email) return
    if (typeof window !== 'undefined') {
      localStorage.setItem('creatorzero_customer_email', email)
    }
    fetchCustomerPurchases(email)
  }

  async function handleOpenResource(productId) {
    setOpeningId(productId)
    try {
      const res = await api.get(`/external-link/access/${productId}?email=${encodeURIComponent(email)}`)
      if (res.authorized && res.destinationUrl) {
        window.open(res.destinationUrl, '_blank', 'noopener,noreferrer')
      } else {
        toast.error('Could not retrieve authorized destination URL')
      }
    } catch (err) {
      toast.error(err.message || 'Failed to access external resource')
    } finally {
      setOpeningId(null)
    }
  }

  if (!email && !loading) {
    return (
      <div className="min-h-screen bg-[#000000] flex items-center justify-center p-6 text-[#F4F2EC] font-sans">
        <div className="max-w-md w-full bg-[#12141c] p-8 rounded-3xl border border-white/10 shadow-xl space-y-5 text-center">
          <div className="h-14 w-14 bg-primary/15 text-primary rounded-2xl flex items-center justify-center mx-auto shadow-xs">
            <Link2 className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-[#F4F2EC]">My External Resources</h1>
            <p className="text-xs text-[rgba(244,242,236,0.68)] font-medium mt-1">Enter your customer email address to access your purchased external links.</p>
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
              Access My Resources
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
            <Link2 className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-[#F4F2EC] tracking-tight">My External Resources</h1>
            <p className="text-xs text-[rgba(244,242,236,0.68)] font-medium">Access your purchased external links, masterclasses, and private group resources.</p>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-[#12141c] px-3 py-1.5 rounded-full border border-white/10 text-xs font-bold text-[rgba(244,242,236,0.68)]">
          <span>Customer: {email}</span>
        </div>
      </div>

      {/* ITEMS LIST */}
      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-32 w-full rounded-3xl" />
          <Skeleton className="h-32 w-full rounded-3xl" />
        </div>
      ) : items.length === 0 ? (
        <div className="bg-[#12141c] rounded-3xl p-12 border border-dashed border-white/10 text-center space-y-2">
          <Link2 className="h-10 w-10 text-slate-300 mx-auto" />
          <h3 className="text-base font-extrabold text-[#F4F2EC]">No external resources found</h3>
          <p className="text-xs text-[rgba(244,242,236,0.68)] font-medium">When you purchase external link products, your access links will appear here.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((item) => {
            const { product, config } = item
            const IconComp = ICON_MAP[config.destinationType] || Link2

            return (
              <div key={product.id} className="bg-[#12141c] rounded-3xl p-6 border border-white/10 shadow-sm space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    {product.thumbnail ? (
                      <img src={product.thumbnail} alt="" className="h-12 w-12 rounded-2xl object-cover shrink-0" />
                    ) : (
                      <div className="h-12 w-12 rounded-2xl bg-primary/15 text-primary flex items-center justify-center font-black text-lg shrink-0">
                        <IconComp className="h-6 w-6" />
                      </div>
                    )}
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-primary/15 text-primary">
                          {config.destinationType || 'EXTERNAL RESOURCE'}
                        </span>
                        <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 flex items-center gap-1">
                          <Check className="h-3 w-3" /> Access Granted
                        </span>
                      </div>
                      <h3 className="font-extrabold text-base text-[#F4F2EC] mt-0.5">{config.name || product.title}</h3>
                    </div>
                  </div>

                  <Button
                    onClick={() => handleOpenResource(product.id)}
                    disabled={openingId === product.id}
                    className="bg-primary hover:bg-primary text-white font-extrabold text-xs rounded-xl shadow-md gap-2 h-11 px-5"
                  >
                    {openingId === product.id ? 'Opening Link...' : 'Open External Resource ↗'} <ExternalIcon className="h-4 w-4" />
                  </Button>
                </div>

                {config.accessInstructions && (
                  <div className="bg-[#12141c] p-3.5 rounded-xl border border-white/10 text-xs text-[#F4F2EC] font-medium">
                    <span className="text-[10px] font-black uppercase text-[rgba(244,242,236,0.5)] block mb-0.5">Access Instructions:</span>
                    <p>{config.accessInstructions}</p>
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
