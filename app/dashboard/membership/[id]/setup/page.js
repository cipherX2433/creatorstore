'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import { api, formatMoney } from '@/lib/clientApi'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Skeleton } from '@/components/ui/skeleton'
import {
  ArrowLeft, Check, ChevronRight, Loader2, Sparkles, Shield, Users, Plus, Trash2,
  CalendarClock, Radio, GraduationCap, FileDown, DollarSign, Layers, CheckCircle2
} from 'lucide-react'

const STEPS = [
  { id: 1, label: 'Basic Info' },
  { id: 2, label: 'Membership Plan' },
  { id: 3, label: 'Benefits' },
  { id: 4, label: 'Unlocked Access' },
  { id: 5, label: 'Settings' },
  { id: 6, label: 'Review & Publish' },
]

export default function CreatorMembershipSetup() {
  const params = useParams()
  const router = useRouter()
  const productId = params?.id

  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)

  const [product, setProduct] = useState(null)
  const [creatorProducts, setCreatorProducts] = useState([])

  const [config, setConfig] = useState({
    name: 'Pro Community',
    shortDescription: 'Exclusive access to our private community, resources, and monthly live Q&As.',
    description: 'Join our premium membership for exclusive content, private discussions, monthly live sessions, and members-only resources.',
    category: 'Technology',
    tags: ['#career', '#developers', '#community'],
    coverImage: '',
    billingType: 'MONTHLY', // 'MONTHLY' | 'YEARLY'
    price: 499,
    currency: 'inr',
    isFree: false,
    trialDays: 0,
    allowCancellation: true,
    cancellationPolicy: 'END_OF_PERIOD',
    benefits: [
      { id: 'b1', title: 'Private Community Access', description: 'Access to our private developer group space.' },
      { id: 'b2', title: 'Monthly Live Q&A', description: 'Ask questions directly during monthly live sessions.' },
      { id: 'b3', title: 'Exclusive Downloads', description: 'Members-only access to premium templates and guides.' },
    ],
    unlockedResources: [],
    status: 'DRAFT',
  })

  useEffect(() => {
    if (!productId) return
    setLoading(true)
    Promise.all([
      api.get(`/products/${productId}`),
      api.get(`/membership/config/${productId}`),
      api.get('/products'),
    ]).then(([prodRes, confRes, prodsRes]) => {
      setProduct(prodRes.product)
      if (confRes.config) {
        setConfig((prev) => ({
          ...prev,
          ...confRes.config,
        }))
      }
      setCreatorProducts((prodsRes.products || []).filter(p => p.id !== productId && p.status === 'PUBLISHED'))
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [productId])

  async function handleSaveConfig(autoAdvance = true) {
    setSaving(true)
    try {
      const payload = {
        ...config,
        price: config.isFree ? 0 : Number(config.price),
      }
      const res = await api.post(`/membership/config/${productId}`, payload)
      setConfig((prev) => ({ ...prev, ...res.config }))
      toast.success('Membership settings saved!')
      if (autoAdvance && step < 6) setStep(step + 1)
    } catch (err) {
      toast.error(err.message || 'Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  async function handlePublish() {
    setPublishing(true)
    try {
      const payload = {
        ...config,
        price: config.isFree ? 0 : Number(config.price),
      }
      await api.post(`/membership/config/${productId}`, payload)
      await api.post(`/products/${productId}/publish`)
      toast.success('Membership published successfully! 🎉')
      router.push('/dashboard/membership')
    } catch (err) {
      toast.error(err.message || 'Failed to publish membership')
    } finally {
      setPublishing(false)
    }
  }

  async function handleImageUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingImage(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await api.postForm(`/products/${productId}/file`, formData)
      if (res.product?.thumbnail) {
        setConfig({ ...config, coverImage: res.product.thumbnail })
        toast.success('Cover banner uploaded!')
      }
    } catch (err) {
      toast.error('Failed to upload banner image')
    } finally {
      setUploadingImage(false)
    }
  }

  function addBenefit() {
    const b = { id: `b_${Date.now()}`, title: 'New Benefit', description: 'Benefit description...' }
    setConfig({ ...config, benefits: [...config.benefits, b] })
  }

  function updateBenefit(id, field, val) {
    setConfig({
      ...config,
      benefits: config.benefits.map(b => b.id === id ? { ...b, [field]: val } : b)
    })
  }

  function removeBenefit(id) {
    setConfig({ ...config, benefits: config.benefits.filter(b => b.id !== id) })
  }

  function toggleUnlockedResource(p) {
    const exists = config.unlockedResources.some(r => r.resourceId === p.id)
    if (exists) {
      setConfig({
        ...config,
        unlockedResources: config.unlockedResources.filter(r => r.resourceId !== p.id)
      })
    } else {
      const newRes = {
        type: p.type,
        resourceId: p.id,
        resourceName: p.title,
      }
      setConfig({
        ...config,
        unlockedResources: [...config.unlockedResources, newRes]
      })
    }
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        <Skeleton className="h-12 w-64 rounded-2xl" />
        <Skeleton className="h-96 w-full rounded-3xl" />
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-16 font-sans">
      
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#D8DFFA] pb-5">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/products">
            <Button variant="ghost" size="sm" className="rounded-xl font-semibold text-xs gap-1 text-[#666666] hover:text-[#010619] hover:bg-[#E8EDFB]">
              <ArrowLeft className="h-4 w-4" /> Products
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-[#010619] tracking-tight flex items-center gap-2">
              <Users className="h-6 w-6 text-primary" /> Membership Setup Wizard
            </h1>
            <p className="text-xs text-[#666666] font-medium">Configure recurring monthly/yearly plans, member benefits, and unlocked resources.</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => handleSaveConfig(false)} disabled={saving} className="rounded-xl font-medium text-xs border-[#D8DFFA] bg-white hover:bg-[#E8EDFB] text-[#010619]">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save Draft'}
          </Button>
        </div>
      </div>

      {/* STEPPER NAV */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {STEPS.map((s) => {
          const isActive = step === s.id
          const isDone = step > s.id
          return (
            <button
              key={s.id}
              onClick={() => setStep(s.id)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all shrink-0 cursor-pointer ${
                isActive
                  ? 'bg-primary text-white shadow-xs'
                  : isDone
                  ? 'bg-primary/10 text-primary hover:bg-primary/15'
                  : 'bg-[#EEF1FB] text-[#666666] border border-[#D8DFFA] hover:bg-[#E8EDFB]'
              }`}
            >
              <span className={`h-5 w-5 rounded-full text-[10px] flex items-center justify-center font-bold ${
                isActive ? 'bg-white/20 text-white' : isDone ? 'bg-primary text-white' : 'bg-white border border-[#D8DFFA] text-[#666666]'
              }`}>
                {isDone ? <Check className="h-3 w-3" /> : s.id}
              </span>
              <span>{s.label}</span>
            </button>
          )
        })}
      </div>

      {/* STEP CONTENTS */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-[#D8DFFA] shadow-xs space-y-6">

        {/* STEP 1: BASIC INFO */}
        {step === 1 && (
          <div className="space-y-5">
            <h2 className="text-lg font-bold text-[#010619]">Step 1 — Basic Information</h2>
            
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-[#010619]">Membership Name *</Label>
              <Input
                value={config.name}
                onChange={(e) => setConfig({ ...config, name: e.target.value })}
                placeholder="e.g. Pro Community"
                className="h-11 rounded-xl text-xs font-medium border-[#D8DFFA] bg-white text-[#010619]"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-[#010619]">Short Summary *</Label>
              <Input
                value={config.shortDescription}
                onChange={(e) => setConfig({ ...config, shortDescription: e.target.value })}
                placeholder="e.g. Exclusive access to our community, resources and monthly sessions."
                className="h-11 rounded-xl text-xs font-medium border-[#D8DFFA] bg-white text-[#010619]"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-[#010619]">Full Description *</Label>
              <Textarea
                rows={5}
                value={config.description}
                onChange={(e) => setConfig({ ...config, description: e.target.value })}
                placeholder="Detailed membership breakdown..."
                className="rounded-xl text-xs font-medium border-[#D8DFFA] bg-white text-[#010619]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-[#010619]">Category</Label>
                <select
                  value={config.category}
                  onChange={(e) => setConfig({ ...config, category: e.target.value })}
                  className="w-full h-11 rounded-xl border border-[#D8DFFA] text-xs font-medium px-3 bg-white text-[#010619] focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  {['Technology', 'Career', 'Business', 'Marketing', 'Education', 'Design', 'Fitness', 'Other'].map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-[#010619]">Cover Banner Image</Label>
                <div className="flex items-center gap-3">
                  <Input type="file" accept="image/*" onChange={handleImageUpload} className="h-11 text-xs rounded-xl border-[#D8DFFA] bg-white text-[#010619]" />
                  {uploadingImage && <Loader2 className="h-5 w-5 animate-spin text-primary" />}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: MEMBERSHIP PLAN */}
        {step === 2 && (
          <div className="space-y-5">
            <h2 className="text-lg font-bold text-[#010619]">Step 2 — Membership Subscription Plan</h2>
            
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-[#010619]">Billing Interval *</Label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setConfig({ ...config, billingType: 'MONTHLY' })}
                  className={`p-4 rounded-xl border text-left font-semibold text-xs transition-all cursor-pointer ${
                    config.billingType === 'MONTHLY' ? 'border-primary bg-primary/10 text-primary' : 'border-[#D8DFFA] bg-[#EEF1FB] text-[#010619] hover:bg-[#E8EDFB]'
                  }`}
                >
                  <div className="text-sm font-bold">Monthly Subscription</div>
                  <div className="text-[11px] text-[#666666] font-medium mt-0.5">Recurring billing every month</div>
                </button>

                <button
                  type="button"
                  onClick={() => setConfig({ ...config, billingType: 'YEARLY' })}
                  className={`p-4 rounded-xl border text-left font-semibold text-xs transition-all cursor-pointer ${
                    config.billingType === 'YEARLY' ? 'border-primary bg-primary/10 text-primary' : 'border-[#D8DFFA] bg-[#EEF1FB] text-[#010619] hover:bg-[#E8EDFB]'
                  }`}
                >
                  <div className="text-sm font-bold">Yearly Subscription</div>
                  <div className="text-[11px] text-[#666666] font-medium mt-0.5">Recurring billing once per year</div>
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 rounded-xl border border-[#D8DFFA] bg-[#EEF1FB]">
              <div className="space-y-0.5">
                <Label className="text-xs font-semibold text-[#010619]">Free Membership</Label>
                <p className="text-xs text-[#666666] font-medium">Allow members to subscribe without payment.</p>
              </div>
              <Switch
                checked={config.isFree}
                onCheckedChange={(checked) => setConfig({ ...config, isFree: checked, price: checked ? 0 : (config.price || 499) })}
              />
            </div>

            {!config.isFree && (
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-[#010619]">Recurring Price (₹) *</Label>
                <Input
                  type="number"
                  value={config.price}
                  onChange={(e) => setConfig({ ...config, price: Math.max(0, Number(e.target.value)) })}
                  placeholder="499"
                  className="h-11 rounded-xl text-xs font-medium border-[#D8DFFA] bg-white text-[#010619]"
                />
                <p className="text-[11px] text-[#666666] font-medium">Members will be charged {formatMoney(config.price, config.currency)} / {config.billingType === 'YEARLY' ? 'year' : 'month'}.</p>
              </div>
            )}
          </div>
        )}

        {/* STEP 3: BENEFITS */}
        {step === 3 && (
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-[#010619]">Step 3 — Member Benefits</h2>
              <Button type="button" onClick={addBenefit} size="sm" className="bg-primary hover:bg-primary/90 text-white text-xs font-semibold rounded-xl gap-1 shadow-xs cursor-pointer">
                <Plus className="h-4 w-4" /> Add Benefit
              </Button>
            </div>

            <div className="space-y-3">
              {config.benefits.map((b, idx) => (
                <div key={b.id} className="p-4 rounded-xl border border-[#D8DFFA] bg-[#EEF1FB] space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-primary">Benefit #{idx + 1}</span>
                    <button type="button" onClick={() => removeBenefit(b.id)} className="text-red-600 hover:text-red-700 text-xs font-medium cursor-pointer">
                      Remove
                    </button>
                  </div>
                  <Input
                    value={b.title}
                    onChange={(e) => updateBenefit(b.id, 'title', e.target.value)}
                    placeholder="Benefit Title (e.g. Private Community Access)"
                    className="h-10 text-xs font-medium bg-white border-[#D8DFFA] text-[#010619]"
                  />
                  <Input
                    value={b.description}
                    onChange={(e) => updateBenefit(b.id, 'description', e.target.value)}
                    placeholder="Short benefit details..."
                    className="h-10 text-xs font-medium bg-white border-[#D8DFFA] text-[#010619]"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* STEP 4: UNLOCKED ACCESS */}
        {step === 4 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-lg font-bold text-[#010619]">Step 4 — Unlocked Content & Resources</h2>
              <p className="text-xs text-[#666666] font-medium">Select which of your existing products & communities are automatically unlocked by this membership.</p>
            </div>

            {creatorProducts.length === 0 ? (
              <div className="p-6 text-center text-xs text-[#666666] font-medium bg-[#EEF1FB] rounded-xl border border-[#D8DFFA]">
                No other published products available yet. You can publish communities or courses later and link them here.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {creatorProducts.map((p) => {
                  const isSelected = config.unlockedResources.some(r => r.resourceId === p.id)
                  return (
                    <div
                      key={p.id}
                      onClick={() => toggleUnlockedResource(p)}
                      className={`p-4 rounded-xl border cursor-pointer flex items-center justify-between gap-3 transition-all ${
                        isSelected ? 'border-primary bg-primary/10 shadow-xs' : 'border-[#D8DFFA] bg-[#EEF1FB] hover:bg-[#E8EDFB]'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold shrink-0">
                          {p.type === 'COMMUNITY' ? <CalendarClock className="h-5 w-5" /> : p.type === 'COURSE' ? <GraduationCap className="h-5 w-5" /> : p.type === 'WEBINAR' ? <Radio className="h-5 w-5" /> : <FileDown className="h-5 w-5" />}
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-xs text-[#010619] truncate">{p.title}</div>
                          <div className="text-[11px] text-[#666666] uppercase font-semibold">{p.type}</div>
                        </div>
                      </div>

                      <div className={`h-5 w-5 rounded-full border flex items-center justify-center shrink-0 ${isSelected ? 'bg-primary border-primary text-white' : 'border-[#D8DFFA] bg-white'}`}>
                        {isSelected && <Check className="h-3 w-3" />}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* STEP 5: SETTINGS */}
        {step === 5 && (
          <div className="space-y-5">
            <h2 className="text-lg font-bold text-[#010619]">Step 5 — Settings & Cancellation Policy</h2>
            
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-[#010619]">Cancellation Policy</Label>
              <select
                value={config.cancellationPolicy}
                onChange={(e) => setConfig({ ...config, cancellationPolicy: e.target.value })}
                className="w-full h-11 rounded-xl border border-[#D8DFFA] text-xs font-medium px-3 bg-white text-[#010619] focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="END_OF_PERIOD">Access remains active until end of billing period (Recommended)</option>
                <option value="IMMEDIATE">Immediate cancellation & access revocation</option>
              </select>
            </div>
          </div>
        )}

        {/* STEP 6: REVIEW & PUBLISH */}
        {step === 6 && (
          <div className="space-y-6">
            <h2 className="text-lg font-bold text-[#010619]">Step 6 — Review & Publish</h2>
            
            <div className="bg-[#EEF1FB] p-6 rounded-2xl border border-[#D8DFFA] space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-14 w-14 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold shrink-0">
                  <Users className="h-8 w-8" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-[#010619]">{config.name}</h3>
                  <p className="text-xs text-[#666666] font-medium">{config.shortDescription}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2 text-xs">
                <div className="bg-white p-3 rounded-xl border border-[#D8DFFA]">
                  <div className="text-[#666666] font-semibold">Price & Billing</div>
                  <div className="font-bold text-primary mt-0.5">
                    {config.isFree ? 'FREE' : `${formatMoney(config.price, config.currency)} / ${config.billingType.toLowerCase()}`}
                  </div>
                </div>
                <div className="bg-white p-3 rounded-xl border border-[#D8DFFA]">
                  <div className="text-[#666666] font-semibold">Benefits</div>
                  <div className="font-bold text-[#010619] mt-0.5">{config.benefits?.length || 0} Included</div>
                </div>
                <div className="bg-white p-3 rounded-xl border border-[#D8DFFA]">
                  <div className="text-[#666666] font-semibold">Unlocked Resources</div>
                  <div className="font-bold text-[#010619] mt-0.5">{config.unlockedResources?.length || 0} Products</div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#D8DFFA]">
              <Button variant="outline" onClick={() => handleSaveConfig(false)} disabled={saving} className="rounded-xl font-medium text-xs border-[#D8DFFA] bg-white hover:bg-[#E8EDFB] text-[#010619]">
                Save Draft
              </Button>
              <Button onClick={handlePublish} disabled={publishing} className="bg-primary hover:bg-primary/90 text-white font-bold text-xs rounded-xl shadow-xs gap-1 cursor-pointer">
                {publishing ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Publish Membership 🎉'}
              </Button>
            </div>
          </div>
        )}

        {/* BOTTOM NAV BUTTONS */}
        {step < 6 && (
          <div className="flex items-center justify-between pt-4 border-t border-[#D8DFFA]">
            <Button
              type="button"
              variant="outline"
              onClick={() => setStep(Math.max(1, step - 1))}
              disabled={step === 1}
              className="rounded-xl font-medium text-xs border-[#D8DFFA] bg-white hover:bg-[#E8EDFB] text-[#010619]"
            >
              Previous
            </Button>
            <Button
              type="button"
              onClick={() => handleSaveConfig(true)}
              disabled={saving}
              className="bg-primary hover:bg-primary/90 text-white font-bold text-xs rounded-xl gap-1 shadow-xs cursor-pointer"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Save & Continue <ChevronRight className="h-4 w-4" /></>}
            </Button>
          </div>
        )}

      </div>
    </div>
  )
}
