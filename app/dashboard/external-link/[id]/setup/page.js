'use client'

import { use, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { api } from '@/lib/clientApi'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import {
  Link2, ArrowLeft, Check, Sparkles, ExternalLink as ExternalIcon, AlertCircle, RefreshCw,
  Globe, Youtube, Disc as Discord, FileText, HardDrive, Calendar
} from 'lucide-react'

const DESTINATION_TYPES = [
  { id: 'YOUTUBE', label: 'YouTube', icon: Youtube, example: 'https://youtube.com/watch?v=...' },
  { id: 'DISCORD', label: 'Discord', icon: Discord, example: 'https://discord.gg/...' },
  { id: 'NOTION', label: 'Notion', icon: FileText, example: 'https://notion.so/...' },
  { id: 'GOOGLE_DRIVE', label: 'Google Drive', icon: HardDrive, example: 'https://drive.google.com/...' },
  { id: 'CALENDLY', label: 'Calendly', icon: Calendar, example: 'https://calendly.com/...' },
  { id: 'WEBSITE', label: 'Website', icon: Globe, example: 'https://example.com' },
  { id: 'OTHER', label: 'Other Platform', icon: Link2, example: 'https://...' },
]

export default function ExternalLinkSetupWizard({ params }) {
  const resolvedParams = use(params)
  const productId = resolvedParams.id
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [step, setStep] = useState(1) // 1..5

  const [form, setForm] = useState({
    name: 'YouTube Masterclass',
    shortDescription: 'Get access to our complete private YouTube growth masterclass.',
    description: 'Learn how to build, launch, and grow a successful YouTube channel. You will receive the private video link after completing your purchase.',
    category: 'Education',
    tags: ['YouTube', 'Content Creation', 'Growth'],
    coverImage: '',
    price: 299,
    currency: 'inr',
    isFree: false,
    destinationUrl: 'https://youtube.com/watch?v=demo12345',
    destinationType: 'YOUTUBE',
    accessInstructions: 'Click "Open Link" to launch the YouTube masterclass. Bookmark the link for future access.',
    status: 'DRAFT',
  })

  const [urlValidation, setUrlValidation] = useState({ valid: true, error: null })

  useEffect(() => {
    if (!productId) return
    api.get(`/external-link/config/${productId}`)
      .then((res) => {
        if (res.config) {
          setForm((prev) => ({
            ...prev,
            ...res.config,
            tags: res.config.tags || [],
          }))
          if (res.config.destinationUrl) {
            validateUrlInput(res.config.destinationUrl)
          }
        }
        setLoading(false)
      })
      .catch((err) => {
        toast.error(err.message || 'Failed to load external link configuration')
        setLoading(false)
      })
  }, [productId])

  function validateUrlInput(url) {
    if (!url || !url.trim()) {
      setUrlValidation({ valid: false, error: 'Destination URL is required.' })
      return false
    }
    const trimmed = url.trim().toLowerCase()
    if (trimmed.startsWith('javascript:') || trimmed.startsWith('data:') || trimmed.startsWith('file:') || trimmed.startsWith('vbscript:')) {
      setUrlValidation({ valid: false, error: 'Unsafe URL protocol rejected. Only HTTP/HTTPS URLs are allowed.' })
      return false
    }
    let norm = url.trim()
    if (!norm.toLowerCase().startsWith('http://') && !norm.toLowerCase().startsWith('https://')) {
      norm = `https://${norm}`
    }
    try {
      new URL(norm)
      setUrlValidation({ valid: true, error: null })
      return true
    } catch (e) {
      setUrlValidation({ valid: false, error: 'Invalid destination URL format.' })
      return false
    }
  }

  function handleUrlChange(val) {
    setForm(prev => ({ ...prev, destinationUrl: val }))
    validateUrlInput(val)
  }

  async function handleSaveDraft() {
    setSaving(true)
    try {
      await api.post(`/external-link/config/${productId}`, form)
      toast.success('Draft saved successfully!')
    } catch (err) {
      toast.error(err.message || 'Failed to save draft')
    } finally {
      setSaving(false)
    }
  }

  async function handlePublish() {
    if (!form.name.trim()) {
      toast.error('Product name is required')
      return
    }
    if (!urlValidation.valid || !form.destinationUrl.trim()) {
      toast.error('Valid destination URL is required before publishing')
      return
    }
    setPublishing(true)
    try {
      // 1. Save config
      await api.post(`/external-link/config/${productId}`, { ...form, status: 'PUBLISHED' })
      // 2. Publish product
      await api.post(`/products/${productId}/publish`)
      toast.success('External link product published successfully! 🎉')
      router.push('/dashboard/products')
    } catch (err) {
      toast.error(err.message || 'Failed to publish product')
    } finally {
      setPublishing(false)
    }
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        <Skeleton className="h-10 w-48 rounded-xl" />
        <Skeleton className="h-96 w-full rounded-3xl" />
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-8 font-sans text-[#010619]">
      
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#D8DFFA] pb-5">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/products" className="p-2.5 rounded-xl border border-[#D8DFFA] text-[#666666] hover:text-[#010619] hover:bg-[#E8EDFB] transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full bg-primary/10 text-primary">
                External Link
              </span>
              <span className="text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full bg-[#EEF1FB] text-[#666666] border border-[#D8DFFA]">
                {form.status}
              </span>
            </div>
            <h1 className="text-2xl font-bold text-[#010619] tracking-tight mt-0.5">{form.name || 'Setup External Link'}</h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleSaveDraft} disabled={saving} className="rounded-xl text-xs font-medium border-[#D8DFFA] bg-white hover:bg-[#E8EDFB] text-[#010619] gap-1.5">
            <RefreshCw className={`h-3.5 w-3.5 ${saving ? 'animate-spin' : ''}`} />
            Save Draft
          </Button>
          <Button onClick={handlePublish} disabled={publishing} className="bg-primary hover:bg-primary/90 text-white text-xs font-bold rounded-xl shadow-xs gap-1.5 cursor-pointer">
            <Sparkles className="h-4 w-4" />
            Publish Product
          </Button>
        </div>
      </div>

      {/* STEPPER NAV */}
      <div className="grid grid-cols-5 gap-2 text-center text-xs font-semibold">
        {[
          { num: 1, name: '1. Basic Info' },
          { num: 2, name: '2. Destination' },
          { num: 3, name: '3. Pricing' },
          { num: 4, name: '4. Settings' },
          { num: 5, name: '5. Review' },
        ].map(s => (
          <button
            key={s.num}
            onClick={() => setStep(s.num)}
            className={`py-3 px-2 rounded-xl border transition-all cursor-pointer ${
              step === s.num
                ? 'bg-primary text-white border-primary shadow-xs'
                : step > s.num
                ? 'bg-primary/10 text-primary border-primary/20'
                : 'bg-[#EEF1FB] text-[#666666] border-[#D8DFFA] hover:bg-[#E8EDFB] hover:text-[#010619]'
            }`}
          >
            {s.name}
          </button>
        ))}
      </div>

      {/* STEP 1: BASIC INFO */}
      {step === 1 && (
        <div className="bg-white rounded-2xl p-6 sm:p-8 border border-[#D8DFFA] shadow-xs space-y-6">
          <div className="border-b border-[#D8DFFA] pb-4">
            <h2 className="text-lg font-bold text-[#010619]">Step 1 — Basic Product Information</h2>
            <p className="text-xs text-[#666666] font-medium mt-1">Set the title, short description, and cover image for your external link resource.</p>
          </div>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#010619]">Product Name <span className="text-red-500">*</span></label>
              <Input
                required
                value={form.name}
                onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g. YouTube Masterclass"
                className="h-11 text-xs rounded-xl border-[#D8DFFA] bg-white text-[#010619]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#010619]">Short Description</label>
              <Input
                value={form.shortDescription}
                onChange={e => setForm(prev => ({ ...prev, shortDescription: e.target.value }))}
                placeholder="Watch our private 3-hour growth masterclass hosted on YouTube."
                className="h-11 text-xs rounded-xl border-[#D8DFFA] bg-white text-[#010619]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#010619]">Full Description</label>
              <Textarea
                rows={4}
                value={form.description}
                onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Provide details about what access includes, host platform, and overview..."
                className="text-xs rounded-xl border-[#D8DFFA] bg-white text-[#010619]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#010619]">Category</label>
                <Input
                  value={form.category}
                  onChange={e => setForm(prev => ({ ...prev, category: e.target.value }))}
                  placeholder="Education, Community, Content..."
                  className="h-11 text-xs rounded-xl border-[#D8DFFA] bg-white text-[#010619]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#010619]">Cover Image URL</label>
                <Input
                  value={form.coverImage}
                  onChange={e => setForm(prev => ({ ...prev, coverImage: e.target.value }))}
                  placeholder="https://images.unsplash.com/..."
                  className="h-11 text-xs rounded-xl border-[#D8DFFA] bg-white text-[#010619]"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-[#D8DFFA]">
            <Button onClick={() => setStep(2)} className="bg-primary hover:bg-primary/90 text-white text-xs font-bold rounded-xl px-6 shadow-xs cursor-pointer">
              Next: Destination URL →
            </Button>
          </div>
        </div>
      )}

      {/* STEP 2: DESTINATION URL & TYPE */}
      {step === 2 && (
        <div className="bg-white rounded-2xl p-6 sm:p-8 border border-[#D8DFFA] shadow-xs space-y-6">
          <div className="border-b border-[#D8DFFA] pb-4">
            <h2 className="text-lg font-bold text-[#010619]">Step 2 — Destination URL & Type</h2>
            <p className="text-xs text-[#666666] font-medium mt-1">Specify where customers should be directed after acquiring access.</p>
          </div>

          <div className="space-y-6">
            {/* DESTINATION TYPE SELECTION */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-[#010619]">Destination Type</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {DESTINATION_TYPES.map((t) => {
                  const IconComp = t.icon
                  const isSelected = form.destinationType === t.id
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setForm(prev => ({ ...prev, destinationType: t.id }))}
                      className={`p-3 rounded-xl border text-left flex flex-col items-center justify-center text-center transition-all cursor-pointer ${
                        isSelected ? 'border-primary bg-primary/10 text-primary shadow-xs' : 'border-[#D8DFFA] bg-[#EEF1FB] hover:bg-[#E8EDFB] text-[#010619]'
                      }`}
                    >
                      <IconComp className="h-5 w-5 mb-1.5" />
                      <span className="text-xs font-bold">{t.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* DESTINATION URL INPUT WITH VALIDATION */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-[#010619]">Destination URL <span className="text-red-500">*</span></label>
              <Input
                required
                value={form.destinationUrl}
                onChange={e => handleUrlChange(e.target.value)}
                placeholder="https://youtube.com/watch?v=..."
                className={`h-11 text-xs rounded-xl font-mono border-[#D8DFFA] bg-white text-[#010619] ${!urlValidation.valid ? 'border-red-500 bg-red-50/20' : ''}`}
              />
              
              {urlValidation.valid ? (
                <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-semibold">
                  <Check className="h-4 w-4" />
                  <span>Valid Destination URL</span>
                  {form.destinationUrl && (
                    <a href={form.destinationUrl.startsWith('http') ? form.destinationUrl : `https://${form.destinationUrl}`} target="_blank" rel="noopener noreferrer" className="ml-2 text-primary underline flex items-center gap-1">
                      <ExternalIcon className="h-3.5 w-3.5" /> Test Link ↗
                    </a>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-xs text-red-600 font-semibold">
                  <AlertCircle className="h-4 w-4" />
                  <span>{urlValidation.error}</span>
                </div>
              )}
            </div>

            {/* ACCESS INSTRUCTIONS */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#010619]">Access Instructions (Optional)</label>
              <Textarea
                rows={3}
                value={form.accessInstructions}
                onChange={e => setForm(prev => ({ ...prev, accessInstructions: e.target.value }))}
                placeholder="e.g. Click 'Open Link' to join our private Discord server. Make sure you accept the invite..."
                className="text-xs rounded-xl border-[#D8DFFA] bg-white text-[#010619]"
              />
              <p className="text-[11px] text-[#666666] font-medium">Displayed to customers on their purchase access screen before redirecting.</p>
            </div>
          </div>

          <div className="flex justify-between pt-4 border-t border-[#D8DFFA]">
            <Button variant="outline" onClick={() => setStep(1)} className="rounded-xl text-xs font-medium border-[#D8DFFA] bg-white hover:bg-[#E8EDFB] text-[#010619]">
              ← Back
            </Button>
            <Button onClick={() => setStep(3)} className="bg-primary hover:bg-primary/90 text-white text-xs font-bold rounded-xl px-6 shadow-xs cursor-pointer">
              Next: Pricing →
            </Button>
          </div>
        </div>
      )}

      {/* STEP 3: PRICING */}
      {step === 3 && (
        <div className="bg-white rounded-2xl p-6 sm:p-8 border border-[#D8DFFA] shadow-xs space-y-6">
          <div className="border-b border-[#D8DFFA] pb-4">
            <h2 className="text-lg font-bold text-[#010619]">Step 3 — Pricing & Access Rules</h2>
            <p className="text-xs text-[#666666] font-medium mt-1">Configure whether this external link is free or requires a one-time payment.</p>
          </div>

          <div className="space-y-6">
            <div className="flex items-center gap-3 p-4 bg-[#EEF1FB] rounded-xl border border-[#D8DFFA]">
              <input
                type="checkbox"
                id="isFreeToggle"
                checked={form.isFree}
                onChange={e => setForm(prev => ({ ...prev, isFree: e.target.checked, price: e.target.checked ? 0 : prev.price || 299 }))}
                className="h-5 w-5 accent-primary rounded-md"
              />
              <label htmlFor="isFreeToggle" className="text-xs font-semibold text-[#010619] cursor-pointer">
                Offer as a Free Resource (No checkout payment required)
              </label>
            </div>

            {!form.isFree && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#010619]">One-Time Price</label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-3 text-[#666666] font-semibold text-xs">₹</span>
                    <Input
                      type="number"
                      min="0"
                      value={form.price}
                      onChange={e => setForm(prev => ({ ...prev, price: Math.max(0, Number(e.target.value)) }))}
                      className="h-11 text-xs rounded-xl pl-8 border-[#D8DFFA] bg-white text-[#010619]"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#010619]">Currency</label>
                  <Input
                    value={form.currency.toUpperCase()}
                    disabled
                    className="h-11 text-xs rounded-xl bg-[#EEF1FB] border-[#D8DFFA] text-[#666666]"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-between pt-4 border-t border-[#D8DFFA]">
            <Button variant="outline" onClick={() => setStep(2)} className="rounded-xl text-xs font-medium border-[#D8DFFA] bg-white hover:bg-[#E8EDFB] text-[#010619]">
              ← Back
            </Button>
            <Button onClick={() => setStep(4)} className="bg-primary hover:bg-primary/90 text-white text-xs font-bold rounded-xl px-6 shadow-xs cursor-pointer">
              Next: Settings →
            </Button>
          </div>
        </div>
      )}

      {/* STEP 4: SETTINGS */}
      {step === 4 && (
        <div className="bg-white rounded-2xl p-6 sm:p-8 border border-[#D8DFFA] shadow-xs space-y-6">
          <div className="border-b border-[#D8DFFA] pb-4">
            <h2 className="text-lg font-bold text-[#010619]">Step 4 — Product Status & Archive Settings</h2>
            <p className="text-xs text-[#666666] font-medium mt-1">Manage public visibility and archive status.</p>
          </div>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#010619]">Product Status</label>
              <select
                value={form.status}
                onChange={e => setForm(prev => ({ ...prev, status: e.target.value }))}
                className="w-full h-11 px-3 bg-white border border-[#D8DFFA] rounded-xl text-xs font-semibold text-[#010619] focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="DRAFT">DRAFT — Hidden from public store</option>
                <option value="PUBLISHED">PUBLISHED — Live on public store</option>
                <option value="ARCHIVED">ARCHIVED — Hidden from store, existing purchasers retain access</option>
              </select>
            </div>
          </div>

          <div className="flex justify-between pt-4 border-t border-[#D8DFFA]">
            <Button variant="outline" onClick={() => setStep(3)} className="rounded-xl text-xs font-medium border-[#D8DFFA] bg-white hover:bg-[#E8EDFB] text-[#010619]">
              ← Back
            </Button>
            <Button onClick={() => setStep(5)} className="bg-primary hover:bg-primary/90 text-white text-xs font-bold rounded-xl px-6 shadow-xs cursor-pointer">
              Next: Review & Publish →
            </Button>
          </div>
        </div>
      )}

      {/* STEP 5: REVIEW & PUBLISH */}
      {step === 5 && (
        <div className="bg-white rounded-2xl p-6 sm:p-8 border border-[#D8DFFA] shadow-xs space-y-6">
          <div className="border-b border-[#D8DFFA] pb-4">
            <h2 className="text-lg font-bold text-[#010619]">Step 5 — Review & Publish</h2>
            <p className="text-xs text-[#666666] font-medium mt-1">Review your external link configuration before publishing.</p>
          </div>

          <div className="bg-[#EEF1FB] p-6 rounded-2xl border border-[#D8DFFA] space-y-4">
            <div className="flex items-center justify-between border-b border-[#D8DFFA] pb-3">
              <div>
                <span className="text-[10px] font-bold uppercase text-primary">{form.destinationType}</span>
                <h3 className="text-lg font-bold text-[#010619]">{form.name}</h3>
              </div>
              <div className="text-right">
                <span className="text-xs font-bold text-primary">{form.isFree ? 'FREE' : `₹${form.price}`}</span>
              </div>
            </div>

            <div className="text-xs space-y-2">
              <div>
                <span className="font-semibold text-[#666666]">Short Description:</span>
                <p className="text-[#010619] font-medium">{form.shortDescription || 'None'}</p>
              </div>
              <div>
                <span className="font-semibold text-[#666666]">Destination URL:</span>
                <p className="text-[#010619] font-mono text-[11px] truncate">{form.destinationUrl || 'Not set'}</p>
              </div>
              {form.accessInstructions && (
                <div>
                  <span className="font-semibold text-[#666666]">Access Instructions:</span>
                  <p className="text-[#010619] font-medium">{form.accessInstructions}</p>
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-between pt-4 border-t border-[#D8DFFA]">
            <Button variant="outline" onClick={() => setStep(4)} className="rounded-xl text-xs font-medium border-[#D8DFFA] bg-white hover:bg-[#E8EDFB] text-[#010619]">
              ← Back
            </Button>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={handleSaveDraft} disabled={saving} className="rounded-xl text-xs font-medium border-[#D8DFFA] bg-white hover:bg-[#E8EDFB] text-[#010619]">
                Save Draft
              </Button>
              <Button onClick={handlePublish} disabled={publishing} className="bg-primary hover:bg-primary/90 text-white text-xs font-bold rounded-xl px-6 shadow-xs gap-1.5 cursor-pointer">
                <Sparkles className="h-4 w-4" />
                Publish Now
              </Button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
