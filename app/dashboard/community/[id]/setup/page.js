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
import { TagInput } from '@/components/ui/tag-input'
import { Switch } from '@/components/ui/switch'
import { Skeleton } from '@/components/ui/skeleton'
import {
  ArrowLeft, Check, ChevronRight, Loader2, Sparkles, Shield, Users, Lock, Image as ImageIcon,
  DollarSign, BookOpen, AlertCircle, Plus, Trash2, Globe, Eye
} from 'lucide-react'

const STEPS = [
  { id: 1, label: 'Basic Info' },
  { id: 2, label: 'Settings' },
  { id: 3, label: 'Access & Pricing' },
  { id: 4, label: 'Community Rules' },
  { id: 5, label: 'Benefits' },
  { id: 6, label: 'Review & Publish' },
]

const CATEGORIES = [
  'Technology', 'Business & Startups', 'Career', 'Design', 'Marketing', 'Education', 'Fitness', 'Other'
]

export default function CreatorCommunitySetup() {
  const params = useParams()
  const router = useRouter()
  const productId = params?.id

  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)

  const [product, setProduct] = useState(null)
  const [config, setConfig] = useState({
    name: 'Builders Club',
    slug: 'builders-club',
    shortDescription: 'A private community for developers building startups.',
    description: 'Join a private community of developers, founders and builders. Share ideas, ask technical questions, get feedback, discover opportunities and connect with other builders.',
    category: 'Technology',
    tags: ['#developers', '#startups', '#saas'],
    coverImage: '',
    accessType: 'ONE_TIME',
    allowNewMembers: true,
    rules: [
      { id: 'r1', title: 'Be respectful', description: 'Treat all community members with empathy and respect.' },
      { id: 'r2', title: 'No spam', description: 'Self-promotion and spam will be removed immediately.' },
      { id: 'r3', title: 'Keep discussions relevant', description: 'Stay on topic and contribute meaningfully.' },
    ],
    benefits: [
      'Direct access to group discussions',
      'Networking with fellow members',
      'Exclusive announcements and updates',
    ],
    status: 'DRAFT',
  })

  useEffect(() => {
    if (!productId) return
    setLoading(true)
    Promise.all([
      api.get(`/products/${productId}`),
      api.get(`/community/config/${productId}`),
    ]).then(([prodRes, confRes]) => {
      setProduct(prodRes.product)
      if (confRes.config) {
        setConfig((prev) => ({ ...prev, ...confRes.config }))
      }
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [productId])

  async function handleSaveConfig(autoAdvance = true) {
    setSaving(true)
    try {
      const res = await api.post(`/community/config/${productId}`, config)
      setConfig(res.config)
      toast.success('Community settings saved!')
      if (autoAdvance && step < 6) setStep(step + 1)
    } catch (err) {
      toast.error(err.message || 'Failed to save configuration')
    } finally {
      setSaving(false)
    }
  }

  async function handlePublish() {
    setPublishing(true)
    try {
      await api.post(`/community/config/${productId}`, config)
      await api.post(`/products/${productId}/publish`)
      toast.success('Community published successfully! 🎉')
      router.push('/dashboard/community')
    } catch (err) {
      toast.error(err.message || 'Failed to publish community')
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
        toast.success('Cover image uploaded!')
      }
    } catch (err) {
      toast.error('Failed to upload image')
    } finally {
      setUploadingImage(false)
    }
  }

  function addRule() {
    const r = { id: `r_${Date.now()}`, title: 'New Rule', description: 'Rule description...' }
    setConfig({ ...config, rules: [...config.rules, r] })
  }

  function updateRule(id, field, val) {
    setConfig({
      ...config,
      rules: config.rules.map(r => r.id === id ? { ...r, [field]: val } : r)
    })
  }

  function removeRule(id) {
    setConfig({ ...config, rules: config.rules.filter(r => r.id !== id) })
  }

  function addBenefit() {
    setConfig({ ...config, benefits: [...config.benefits, 'New Community Benefit'] })
  }

  function updateBenefit(idx, val) {
    const copy = [...config.benefits]
    copy[idx] = val
    setConfig({ ...config, benefits: copy })
  }

  function removeBenefit(idx) {
    setConfig({ ...config, benefits: config.benefits.filter((_, i) => i !== idx) })
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
    <div className="max-w-4xl mx-auto space-y-8 pb-16">
      
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#D8DFFA] pb-5">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/products">
            <Button variant="ghost" size="sm" className="rounded-xl font-semibold text-xs gap-1 text-[#666666] hover:text-[#010619] hover:bg-[#E8EDFB]">
              <ArrowLeft className="h-4 w-4" /> Products
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-[#010619] tracking-tight">Community Setup Wizard</h1>
            <p className="text-xs text-[#666666] font-medium">Build and launch a private group space for your members.</p>
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
              <Label className="text-xs font-semibold text-[#010619]">Community Name *</Label>
              <Input
                value={config.name}
                onChange={(e) => setConfig({ ...config, name: e.target.value })}
                placeholder="e.g. Builders Club"
                className="h-11 rounded-xl text-xs font-medium border-[#D8DFFA] bg-white text-[#010619]"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-[#010619]">Short Tagline / Summary *</Label>
              <Input
                value={config.shortDescription}
                onChange={(e) => setConfig({ ...config, shortDescription: e.target.value })}
                placeholder="e.g. A private community for developers building startups."
                className="h-11 rounded-xl text-xs font-medium border-[#D8DFFA] bg-white text-[#010619]"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-[#010619]">Full Description *</Label>
              <Textarea
                rows={4}
                value={config.description}
                onChange={(e) => setConfig({ ...config, description: e.target.value })}
                placeholder="Detailed community description..."
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
                  {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
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

            <TagInput
              label="Tags"
              tags={config.tags}
              onChange={(next) => setConfig({ ...config, tags: next })}
              placeholder="Add a tag and press Enter"
            />
          </div>
        )}

        {/* STEP 2: SETTINGS */}
        {step === 2 && (
          <div className="space-y-5">
            <h2 className="text-lg font-bold text-[#010619]">Step 2 — Community Settings & Privacy</h2>
            
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-[#010619]">Community URL Slug *</Label>
              <div className="flex items-center">
                <span className="bg-[#EEF1FB] border border-r-0 border-[#D8DFFA] rounded-l-xl px-3 py-2.5 text-xs text-[#666666] font-semibold">
                  /community/
                </span>
                <Input
                  value={config.slug}
                  onChange={(e) => setConfig({ ...config, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                  placeholder="builders-club"
                  className="h-11 rounded-r-xl rounded-l-none text-xs font-medium border-[#D8DFFA] bg-white text-[#010619]"
                />
              </div>
            </div>

            <div className="p-4 rounded-xl bg-primary/10 border border-primary/20 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-primary">
                <Lock className="h-4 w-4" /> Private Group Space
              </div>
              <p className="text-xs text-[#666666] font-medium">
                This community is <strong className="text-[#010619]">PRIVATE</strong> by default. Only users who purchase membership will gain access to posts, discussions, comments, and member lists. Unauthenticated visitors will only see the public product page.
              </p>
            </div>
          </div>
        )}

        {/* STEP 3: ACCESS & PRICING */}
        {step === 3 && (
          <div className="space-y-5">
            <h2 className="text-lg font-bold text-[#010619]">Step 3 — Access & Pricing</h2>
            
            {product && (
              <div className="bg-[#EEF1FB] p-4 rounded-xl border border-[#D8DFFA] space-y-3">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-[#666666]">Product Title:</span>
                  <span className="font-bold text-[#010619]">{product.title}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-[#666666]">Membership Price:</span>
                  <span className="font-bold text-primary text-sm">{formatMoney(product.price, product.currency)}</span>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between p-4 rounded-xl border border-[#D8DFFA] bg-[#EEF1FB]">
              <div className="space-y-0.5">
                <Label className="text-xs font-semibold text-[#010619]">Allow New Members</Label>
                <p className="text-xs text-[#666666] font-medium">When disabled, new purchases are paused and no new members can join.</p>
              </div>
              <Switch
                checked={config.allowNewMembers}
                onCheckedChange={(checked) => setConfig({ ...config, allowNewMembers: checked })}
              />
            </div>
          </div>
        )}

        {/* STEP 4: RULES */}
        {step === 4 && (
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-[#010619]">Step 4 — Community Rules</h2>
              <Button type="button" onClick={addRule} size="sm" className="bg-primary hover:bg-primary/90 text-white text-xs font-semibold rounded-xl gap-1 shadow-xs cursor-pointer">
                <Plus className="h-4 w-4" /> Add Rule
              </Button>
            </div>

            <div className="space-y-3">
              {config.rules.map((rule, idx) => (
                <div key={rule.id} className="p-4 rounded-xl border border-[#D8DFFA] bg-[#EEF1FB] space-y-2 relative">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-primary">Rule #{idx + 1}</span>
                    {config.rules.length > 1 && (
                      <button type="button" onClick={() => removeRule(rule.id)} className="text-red-600 hover:text-red-700 text-xs font-medium cursor-pointer">
                        Remove
                      </button>
                    )}
                  </div>
                  <Input
                    value={rule.title}
                    onChange={(e) => updateRule(rule.id, 'title', e.target.value)}
                    placeholder="Rule Title"
                    className="h-10 text-xs font-medium bg-white border-[#D8DFFA] text-[#010619]"
                  />
                  <Input
                    value={rule.description}
                    onChange={(e) => updateRule(rule.id, 'description', e.target.value)}
                    placeholder="Rule Description"
                    className="h-10 text-xs font-medium bg-white border-[#D8DFFA] text-[#010619]"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* STEP 5: BENEFITS */}
        {step === 5 && (
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-[#010619]">Step 5 — What Members Get (Benefits)</h2>
              <Button type="button" onClick={addBenefit} size="sm" className="bg-primary hover:bg-primary/90 text-white text-xs font-semibold rounded-xl gap-1 shadow-xs cursor-pointer">
                <Plus className="h-4 w-4" /> Add Benefit
              </Button>
            </div>

            <div className="space-y-2">
              {config.benefits.map((b, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <Input
                    value={b}
                    onChange={(e) => updateBenefit(idx, e.target.value)}
                    className="h-10 text-xs font-medium rounded-xl border-[#D8DFFA] bg-white text-[#010619]"
                  />
                  <Button type="button" variant="ghost" size="sm" onClick={() => removeBenefit(idx)} className="text-red-600 hover:bg-red-50 hover:text-red-700 cursor-pointer">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* STEP 6: REVIEW & PUBLISH */}
        {step === 6 && (
          <div className="space-y-6">
            <h2 className="text-lg font-bold text-[#010619]">Step 6 — Review & Publish</h2>
            
            <div className="bg-[#EEF1FB] p-6 rounded-2xl border border-[#D8DFFA] space-y-4">
              <div className="flex items-center gap-3">
                {config.coverImage ? (
                  <img src={config.coverImage} alt="" className="h-16 w-16 rounded-xl object-cover" />
                ) : (
                  <div className="h-16 w-16 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
                    <Users className="h-8 w-8" />
                  </div>
                )}
                <div>
                  <h3 className="font-bold text-lg text-[#010619]">{config.name}</h3>
                  <p className="text-xs text-[#666666] font-medium">{config.shortDescription}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 text-xs">
                <div className="bg-white p-3 rounded-xl border border-[#D8DFFA]">
                  <div className="text-[#666666] font-semibold">Category</div>
                  <div className="font-bold text-[#010619] mt-0.5">{config.category}</div>
                </div>
                <div className="bg-white p-3 rounded-xl border border-[#D8DFFA]">
                  <div className="text-[#666666] font-semibold">Slug</div>
                  <div className="font-bold text-[#010619] mt-0.5">/{config.slug}</div>
                </div>
                <div className="bg-white p-3 rounded-xl border border-[#D8DFFA]">
                  <div className="text-[#666666] font-semibold">Privacy</div>
                  <div className="font-bold text-emerald-600 mt-0.5">PRIVATE</div>
                </div>
                <div className="bg-white p-3 rounded-xl border border-[#D8DFFA]">
                  <div className="text-[#666666] font-semibold">Rules</div>
                  <div className="font-bold text-[#010619] mt-0.5">{config.rules.length} Rules</div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#D8DFFA]">
              <Button variant="outline" onClick={() => handleSaveConfig(false)} disabled={saving} className="rounded-xl font-medium text-xs border-[#D8DFFA] bg-white hover:bg-[#E8EDFB] text-[#010619]">
                Save Draft
              </Button>
              <Button onClick={handlePublish} disabled={publishing} className="bg-primary hover:bg-primary/90 text-white font-bold text-xs rounded-xl shadow-xs gap-1 cursor-pointer">
                {publishing ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Publish Community 🎉'}
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
