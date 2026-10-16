'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
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

export default function ExternalLinkWidget({ productId }) {
  const router = useRouter()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [authorized, setAuthorized] = useState(false)
  const [destinationUrl, setDestinationUrl] = useState('')
  const [freeName, setFreeName] = useState('')
  const [freeEmail, setFreeEmail] = useState('')
  const [submittingFree, setSubmittingFree] = useState(false)

  useEffect(() => {
    if (!productId) return
    fetchDetails()
  }, [productId])

  function fetchDetails() {
    setLoading(true)
    api.get(`/external-link/public/${productId}`)
      .then((res) => {
        setData(res)
        // Check if customer already has authorized access
        return api.get(`/external-link/access/${productId}`).catch(() => null)
      })
      .then((accRes) => {
        if (accRes && accRes.authorized && accRes.destinationUrl) {
          setAuthorized(true)
          setDestinationUrl(accRes.destinationUrl)
        }
        setLoading(false)
      })
      .catch((err) => {
        toast.error(err.message || 'Failed to load external link details')
        setLoading(false)
      })
  }

  async function handleFreeAccessSubmit(e) {
    e.preventDefault()
    if (!freeEmail) return
    setSubmittingFree(true)
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem('creatorzero_customer_email', freeEmail)
      }
      const res = await api.post('/external-link/access-free', {
        productId,
        name: freeName,
        email: freeEmail,
      })
      if (res.authorized && res.destinationUrl) {
        setAuthorized(true)
        setDestinationUrl(res.destinationUrl)
        toast.success('Access granted! Opening external resource...')
        window.open(res.destinationUrl, '_blank', 'noopener,noreferrer')
      }
    } catch (err) {
      toast.error(err.message || 'Failed to grant free access')
    } finally {
      setSubmittingFree(false)
    }
  }

  function handleOpenLink() {
    if (destinationUrl) {
      window.open(destinationUrl, '_blank', 'noopener,noreferrer')
    }
  }

  if (loading) {
    return <Skeleton className="h-44 w-full rounded-2xl" />
  }

  if (!data || !data.config) return null

  const { config } = data
  const IconComponent = ICON_MAP[config.destinationType] || Link2

  return (
    <div className="bg-primary/10 rounded-2xl p-5 border border-primary/20 space-y-4 font-sans text-[#F4F2EC]">
      
      {/* Header Badge & Title */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-primary/15 text-primary shrink-0">
            <IconComponent className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[10px] font-black uppercase text-primary tracking-wider">{config.destinationType || 'EXTERNAL RESOURCE'}</span>
            <div className="font-extrabold text-xs text-[#F4F2EC]">Hosted Externally</div>
          </div>
        </div>

        <span className="px-2.5 py-1 rounded-full text-[11px] font-black bg-white border border-primary/30 text-primary shadow-2xs">
          {config.isFree ? 'FREE ACCESS' : `₹${config.price}`}
        </span>
      </div>

      {/* Access Instructions */}
      {config.accessInstructions && (
        <div className="bg-white p-3.5 rounded-xl border border-primary/20 text-xs text-[#F4F2EC] font-medium space-y-1">
          <span className="text-[10px] font-black uppercase text-[rgba(244,242,236,0.5)]">Access Instructions:</span>
          <p>{config.accessInstructions}</p>
        </div>
      )}

      {/* AUTHORIZED STATE vs FREE FORM / PURCHASE NEEDED */}
      {authorized ? (
        <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-200 space-y-3 text-center">
          <div className="flex items-center justify-center gap-1.5 text-emerald-800 font-black text-xs">
            <Check className="h-4 w-4 text-emerald-600" />
            <span>You have access to this resource!</span>
          </div>
          <Button
            onClick={handleOpenLink}
            className="w-full h-11 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-md gap-2"
          >
            Open External Resource ↗ <ExternalIcon className="h-4 w-4" />
          </Button>
        </div>
      ) : config.isFree ? (
        <form onSubmit={handleFreeAccessSubmit} className="space-y-3 bg-white p-4 rounded-xl border border-primary/20">
          <span className="text-xs font-extrabold text-[#F4F2EC] block">Get Free Access Now</span>
          <Input
            type="text"
            placeholder="Your Name (Optional)"
            value={freeName}
            onChange={e => setFreeName(e.target.value)}
            className="h-10 text-xs rounded-xl"
          />
          <Input
            type="email"
            required
            placeholder="Your Email Address *"
            value={freeEmail}
            onChange={e => setFreeEmail(e.target.value)}
            className="h-10 text-xs rounded-xl"
          />
          <Button
            type="submit"
            disabled={submittingFree}
            className="w-full h-10 bg-primary hover:bg-primary text-white text-xs font-extrabold rounded-xl shadow-xs gap-1"
          >
            {submittingFree ? 'Granting Access...' : 'Access Resource Now ↗'}
          </Button>
        </form>
      ) : (
        <div className="flex items-center gap-2 text-xs text-[rgba(244,242,236,0.68)] font-medium">
          <Lock className="h-4 w-4 text-primary shrink-0" />
          <span>Complete purchase above to unlock private external destination link.</span>
        </div>
      )}

    </div>
  )
}
