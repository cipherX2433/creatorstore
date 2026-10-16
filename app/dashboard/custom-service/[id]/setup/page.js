'use client'

import { useEffect, useState, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { api, formatMoney } from '@/lib/clientApi'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import {
  Sparkles, Check, ArrowLeft, ArrowRight, Plus, Trash2, ShieldCheck, Clock, RefreshCw,
  FileText, Upload, HelpCircle, CheckCircle2, AlertCircle, Save
} from 'lucide-react'

const STEPS = [
  { id: 1, title: 'Basic Info' },
  { id: 2, title: 'Deliverables & Scope' },
  { id: 3, title: 'Pricing' },
  { id: 4, title: 'Customer Requirements' },
  { id: 5, title: 'Delivery & Revisions' },
  { id: 6, title: 'Settings' },
  { id: 7, title: 'Review & Publish' },
]

const CATEGORIES = ['Career', 'Design', 'Development', 'Marketing', 'Writing', 'Data', 'Business', 'Education', 'Other']
const FIELD_TYPES = [
  { type: 'SHORT_TEXT', label: 'Short Text' },
  { type: 'LONG_TEXT', label: 'Long Text' },
  { type: 'FILE_UPLOAD', label: 'File Upload' },
  { type: 'MULTIPLE_CHOICE', label: 'Multiple Choice' },
  { type: 'CHECKBOX', label: 'Checkbox' },
]

export default function CustomServiceSetupPage({ params }) {
  const resolvedParams = use(params)
  const productId = resolvedParams.id
  const router = useRouter()

  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [publishing, setPublishing] = useState(false)

  // Config State
  const [name, setName] = useState('Resume Review')
  const [shortDescription, setShortDescription] = useState('Get a detailed review of your resume with actionable feedback.')
  const [description, setDescription] = useState("I will review your resume and provide detailed feedback on structure, achievements, skills, ATS optimization, and overall presentation.")
  const [category, setCategory] = useState('Career')
  const [tags, setTags] = useState('#resume, #career, #ats')
  const [coverImage, setCoverImage] = useState('')
  const [price, setPrice] = useState(1499)
  const [currency, setCurrency] = useState('inr')
  const [isFree, setIsFree] = useState(false)
  const [deliveryDays, setDeliveryDays] = useState(3)
  const [revisionLimit, setRevisionLimit] = useState(2) // -1 for unlimited
  const [deliverables, setDeliverables] = useState([
    { id: 'd1', title: 'Detailed Resume Review PDF', description: 'Section-by-section line feedback' },
    { id: 'd2', title: 'ATS Optimization Checklist', description: 'Keyword optimization guide' }
  ])
  const [scopeIncluded, setScopeIncluded] = useState('Resume up to 2 pages, ATS optimization, written feedback checklist')
  const [scopeExcluded, setScopeExcluded] = useState('Resume rewriting from scratch, LinkedIn bio writing, interview coaching calls')
  const [requirements, setRequirements] = useState([
    { id: 'r1', label: 'Current Resume File', description: 'Upload your latest resume (PDF/DOCX)', type: 'FILE_UPLOAD', required: true },
    { id: 'r2', label: 'Target Job Role & Title', description: 'e.g. Senior Software Engineer', type: 'SHORT_TEXT', required: true },
    { id: 'r3', label: 'Target Companies / Notes', description: 'Any specific focus area or target companies', type: 'LONG_TEXT', required: false }
  ])
  const [maxActiveRequests, setMaxActiveRequests] = useState('')
  const [cancellationPolicy, setCancellationPolicy] = useState('ALLOW_BEFORE_START')

  useEffect(() => {
    if (!productId) return
    api.get(`/custom-service/config/${productId}`)
      .then((res) => {
        if (res.config) {
          const c = res.config
          setName(c.name || 'Resume Review')
          setShortDescription(c.shortDescription || '')
          setDescription(c.description || '')
          setCategory(c.category || 'Career')
          setTags(Array.isArray(c.tags) ? c.tags.join(', ') : '')
          setCoverImage(c.coverImage || '')
          setPrice(c.price !== undefined ? c.price : 1499)
          setCurrency(c.currency || 'inr')
          setIsFree(!!c.isFree)
          setDeliveryDays(c.deliveryDays || 3)
          setRevisionLimit(c.revisionLimit !== undefined ? c.revisionLimit : 2)
          if (Array.isArray(c.deliverables) && c.deliverables.length > 0) setDeliverables(c.deliverables)
          setScopeIncluded(c.scopeIncluded || '')
          setScopeExcluded(c.scopeExcluded || '')
          if (Array.isArray(c.requirements) && c.requirements.length > 0) setRequirements(c.requirements)
          setMaxActiveRequests(c.maxActiveRequests ? String(c.maxActiveRequests) : '')
          setCancellationPolicy(c.cancellationPolicy || 'ALLOW_BEFORE_START')
        }
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [productId])

  function addDeliverable() {
    setDeliverables(prev => [...prev, { id: `d_${Date.now()}`, title: '', description: '' }])
  }

  function updateDeliverable(idx, field, val) {
    setDeliverables(prev => {
      const copy = [...prev]
      copy[idx] = { ...copy[idx], [field]: val }
      return copy
    })
  }

  function removeDeliverable(idx) {
    setDeliverables(prev => prev.filter((_, i) => i !== idx))
  }

  function addRequirement() {
    setRequirements(prev => [...prev, { id: `r_${Date.now()}`, label: '', description: '', type: 'SHORT_TEXT', required: true }])
  }

  function updateRequirement(idx, field, val) {
    setRequirements(prev => {
      const copy = [...prev]
      copy[idx] = { ...copy[idx], [field]: val }
      return copy
    })
  }

  function removeRequirement(idx) {
    setRequirements(prev => prev.filter((_, i) => i !== idx))
  }

  function buildPayload() {
    return {
      name,
      shortDescription,
      description,
      category,
      tags: typeof tags === 'string' ? tags.split(',').map(t => t.trim()).filter(Boolean) : tags,
      coverImage,
      price: isFree ? 0 : Number(price),
      currency,
      isFree,
      deliveryDays: Number(deliveryDays),
      revisionLimit: Number(revisionLimit),
      deliverables,
      scopeIncluded,
      scopeExcluded,
      requirements,
      maxActiveRequests: maxActiveRequests ? Number(maxActiveRequests) : null,
      cancellationPolicy,
    }
  }

  async function handleSaveDraft(silent = false) {
    setSaving(true)
    try {
      const payload = buildPayload()
      await api.post(`/custom-service/config/${productId}`, payload)
      if (!silent) toast.success('Draft saved successfully!')
    } catch (err) {
      toast.error(err.message || 'Failed to save draft')
    } finally {
      setSaving(false)
    }
  }

  async function handlePublish() {
    setPublishing(true)
    try {
      const payload = buildPayload()
      await api.post(`/custom-service/config/${productId}`, { ...payload, status: 'PUBLISHED' })
      await api.post(`/products/${productId}/publish`)
      toast.success('Custom Service published successfully! 🎉')
      router.push('/dashboard/products')
    } catch (err) {
      toast.error(err.message || 'Failed to publish service')
    } finally {
      setPublishing(false)
    }
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-96 w-full rounded-3xl" />
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-8 font-sans text-[#010619]">
      
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#D8DFFA] pb-5">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/products">
            <Button variant="ghost" size="sm" className="rounded-xl text-[#666666] hover:text-[#010619] hover:bg-[#E8EDFB]">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <span className="text-[10px] font-bold uppercase bg-primary/10 text-primary px-2.5 py-0.5 rounded-full">
              CUSTOM SERVICE SETUP
            </span>
            <h1 className="text-2xl font-bold text-[#010619] tracking-tight mt-1">{name || 'Resume Review'}</h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => handleSaveDraft(false)} disabled={saving} className="rounded-xl text-xs font-medium border-[#D8DFFA] bg-white hover:bg-[#E8EDFB] text-[#010619] gap-1.5">
            <Save className="h-4 w-4" /> {saving ? 'Saving...' : 'Save Draft'}
          </Button>
          {step === 7 ? (
            <Button onClick={handlePublish} disabled={publishing} className="bg-primary hover:bg-primary/90 text-white font-bold text-xs rounded-xl shadow-xs gap-1.5 cursor-pointer">
              <Sparkles className="h-4 w-4" /> {publishing ? 'Publishing...' : 'Publish Service'}
            </Button>
          ) : (
            <Button onClick={() => { handleSaveDraft(true); setStep(s => Math.min(7, s + 1)) }} className="bg-primary hover:bg-primary/90 text-white font-bold text-xs rounded-xl shadow-xs gap-1.5 cursor-pointer">
              Next Step <ArrowRight className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* STEPPER PROGRESS */}
      <div className="flex items-center justify-between gap-1 overflow-x-auto pb-2 border-b border-[#D8DFFA]">
        {STEPS.map((s) => (
          <button
            key={s.id}
            onClick={() => setStep(s.id)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
              step === s.id
                ? 'bg-primary text-white shadow-xs'
                : step > s.id
                ? 'bg-primary/10 text-primary hover:bg-primary/15'
                : 'text-[#666666] hover:bg-[#E8EDFB] hover:text-[#010619]'
            }`}
          >
            <span className={`h-4 w-4 rounded-full text-[10px] flex items-center justify-center font-bold ${
              step === s.id ? 'bg-white/20 text-white' : 'bg-[#EEF1FB] border border-[#D8DFFA] text-[#666666]'
            }`}>
              {s.id}
            </span>
            {s.title}
          </button>
        ))}
      </div>

      {/* STEP CONTENT PANELS */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-[#D8DFFA] shadow-xs space-y-6">

        {/* STEP 1 — BASIC INFO */}
        {step === 1 && (
          <div className="space-y-5">
            <div>
              <h3 className="text-lg font-bold text-[#010619]">Step 1 — Basic Information</h3>
              <p className="text-xs text-[#666666] font-medium">Define your custom service name, description, category, and branding.</p>
            </div>

            <div className="space-y-4">
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-[#010619]">Service Name *</Label>
                <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Resume Review" className="h-11 text-xs rounded-xl border-[#D8DFFA] bg-white text-[#010619]" />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold text-[#010619]">Short Summary *</Label>
                <Input value={shortDescription} onChange={e => setShortDescription(e.target.value)} placeholder="e.g. Get a detailed review of your resume with actionable feedback." className="h-11 text-xs rounded-xl border-[#D8DFFA] bg-white text-[#010619]" />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold text-[#010619]">Full Service Description</Label>
                <Textarea value={description} onChange={e => setDescription(e.target.value)} rows={5} placeholder="Describe how the service works, what the client gets, and expected outcome..." className="text-xs rounded-xl border-[#D8DFFA] bg-white text-[#010619]" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-[#010619]">Category</Label>
                  <select value={category} onChange={e => setCategory(e.target.value)} className="w-full h-11 rounded-xl border border-[#D8DFFA] text-xs font-medium px-3 bg-white text-[#010619] focus:outline-none focus:ring-1 focus:ring-primary">
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-[#010619]">Tags (comma separated)</Label>
                  <Input value={tags} onChange={e => setTags(e.target.value)} placeholder="#resume, #career, #ats" className="h-11 text-xs rounded-xl border-[#D8DFFA] bg-white text-[#010619]" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 2 — DELIVERABLES & SCOPE */}
        {step === 2 && (
          <div className="space-y-5">
            <div>
              <h3 className="text-lg font-bold text-[#010619]">Step 2 — Deliverables & Scope</h3>
              <p className="text-xs text-[#666666] font-medium">Outline what the customer will receive and clarify what is included vs excluded.</p>
            </div>

            {/* Deliverables Checklist */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold text-[#010619]">What You'll Receive (Deliverables)</Label>
                <Button size="sm" variant="outline" onClick={addDeliverable} className="text-xs font-semibold rounded-xl gap-1 border-[#D8DFFA] bg-white hover:bg-[#E8EDFB] text-[#010619] cursor-pointer">
                  <Plus className="h-3.5 w-3.5" /> Add Deliverable
                </Button>
              </div>

              <div className="space-y-3">
                {deliverables.map((d, i) => (
                  <div key={d.id || i} className="p-4 bg-[#EEF1FB] rounded-xl border border-[#D8DFFA] space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <Input value={d.title} onChange={e => updateDeliverable(i, 'title', e.target.value)} placeholder="Deliverable Title" className="h-9 text-xs font-semibold rounded-xl bg-white border-[#D8DFFA] text-[#010619]" />
                      <Button variant="ghost" size="sm" onClick={() => removeDeliverable(i)} className="text-red-600 hover:bg-red-50 hover:text-red-700 rounded-xl h-9 w-9 p-0 shrink-0 cursor-pointer">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <Input value={d.description} onChange={e => updateDeliverable(i, 'description', e.target.value)} placeholder="Deliverable Description (optional)" className="h-9 text-xs rounded-xl bg-white border-[#D8DFFA] text-[#010619]" />
                  </div>
                ))}
              </div>
            </div>

            {/* Scope Included & Excluded */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-[#D8DFFA]">
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-emerald-700 flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Included Scope
                </Label>
                <Textarea value={scopeIncluded} onChange={e => setScopeIncluded(e.target.value)} rows={3} placeholder="e.g. Resume up to 2 pages, ATS keyword optimization, written report" className="text-xs rounded-xl border-[#D8DFFA] bg-white text-[#010619]" />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold text-rose-700 flex items-center gap-1">
                  <AlertCircle className="h-3.5 w-3.5" /> Not Included (Excluded)
                </Label>
                <Textarea value={scopeExcluded} onChange={e => setScopeExcluded(e.target.value)} rows={3} placeholder="e.g. Resume rewriting from scratch, LinkedIn bio creation" className="text-xs rounded-xl border-[#D8DFFA] bg-white text-[#010619]" />
              </div>
            </div>
          </div>
        )}

        {/* STEP 3 — PRICING */}
        {step === 3 && (
          <div className="space-y-5">
            <div>
              <h3 className="text-lg font-bold text-[#010619]">Step 3 — Fixed Pricing</h3>
              <p className="text-xs text-[#666666] font-medium">Set the price for your bespoke custom service.</p>
            </div>

            <div className="bg-[#EEF1FB] p-5 rounded-xl border border-[#D8DFFA] space-y-4">
              <div className="flex items-center gap-2">
                <input type="checkbox" id="freeCheck" checked={isFree} onChange={e => setIsFree(e.target.checked)} className="rounded border-[#D8DFFA] text-primary" />
                <Label htmlFor="freeCheck" className="text-xs font-semibold text-[#010619] cursor-pointer">Offer as a FREE Custom Service</Label>
              </div>

              {!isFree && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-[#010619]">Price Amount *</Label>
                    <Input type="number" min="0" value={price} onChange={e => setPrice(e.target.value)} className="h-11 text-xs rounded-xl font-bold border-[#D8DFFA] bg-white text-[#010619]" />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-[#010619]">Currency</Label>
                    <select value={currency} onChange={e => setCurrency(e.target.value)} className="w-full h-11 rounded-xl border border-[#D8DFFA] text-xs font-semibold px-3 bg-white text-[#010619] focus:outline-none focus:ring-1 focus:ring-primary">
                      <option value="inr">INR (₹)</option>
                      <option value="usd">USD ($)</option>
                    </select>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* STEP 4 — CUSTOMER REQUIREMENTS INTAKE FORM */}
        {step === 4 && (
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-[#010619]">Step 4 — Customer Requirements Intake</h3>
                <p className="text-xs text-[#666666] font-medium">Configure questions & file upload fields customer must submit before work begins.</p>
              </div>

              <Button size="sm" onClick={addRequirement} className="bg-primary hover:bg-primary/90 text-white text-xs font-bold rounded-xl gap-1 shadow-xs cursor-pointer">
                <Plus className="h-3.5 w-3.5" /> Add Requirement Field
              </Button>
            </div>

            <div className="space-y-4">
              {requirements.map((r, i) => (
                <div key={r.id || i} className="p-4 bg-[#EEF1FB] rounded-xl border border-[#D8DFFA] space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-primary uppercase">Field #{i + 1}</span>
                    <Button variant="ghost" size="sm" onClick={() => removeRequirement(i)} className="text-red-600 hover:bg-red-50 hover:text-red-700 rounded-xl h-8 w-8 p-0 cursor-pointer">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold text-[#010619]">Field Label / Question *</Label>
                      <Input value={r.label} onChange={e => updateRequirement(i, 'label', e.target.value)} placeholder="e.g. Upload Resume File" className="h-9 text-xs rounded-xl bg-white border-[#D8DFFA] text-[#010619]" />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs font-semibold text-[#010619]">Input Type</Label>
                      <select value={r.type} onChange={e => updateRequirement(i, 'type', e.target.value)} className="w-full h-9 rounded-xl border border-[#D8DFFA] text-xs font-medium px-3 bg-white text-[#010619] focus:outline-none focus:ring-1 focus:ring-primary">
                        {FIELD_TYPES.map(ft => <option key={ft.type} value={ft.type}>{ft.label}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold text-[#010619]">Description / Help Text</Label>
                      <Input value={r.description} onChange={e => updateRequirement(i, 'description', e.target.value)} placeholder="e.g. Upload latest PDF/DOCX version" className="h-9 text-xs rounded-xl bg-white border-[#D8DFFA] text-[#010619]" />
                    </div>

                    <div className="flex items-center gap-2 pt-5">
                      <input type="checkbox" id={`req_${i}`} checked={r.required} onChange={e => updateRequirement(i, 'required', e.target.checked)} className="rounded border-[#D8DFFA] text-primary" />
                      <Label htmlFor={`req_${i}`} className="text-xs font-semibold text-[#010619] cursor-pointer">Required Field</Label>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* STEP 5 — DELIVERY & REVISIONS */}
        {step === 5 && (
          <div className="space-y-5">
            <div>
              <h3 className="text-lg font-bold text-[#010619]">Step 5 — Delivery Time & Revisions</h3>
              <p className="text-xs text-[#666666] font-medium">Specify how long turnaround delivery takes and how many revisions are included.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1 bg-[#EEF1FB] p-4 rounded-xl border border-[#D8DFFA]">
                <Label className="text-xs font-semibold text-[#010619] flex items-center gap-1.5">
                  <Clock className="h-4 w-4 text-primary" /> Delivery Turnaround (Days)
                </Label>
                <select value={deliveryDays} onChange={e => setDeliveryDays(e.target.value)} className="w-full h-11 rounded-xl border border-[#D8DFFA] text-xs font-semibold px-3 bg-white text-[#010619] mt-2 focus:outline-none focus:ring-1 focus:ring-primary">
                  <option value="1">1 Calendar Day (Express)</option>
                  <option value="2">2 Calendar Days</option>
                  <option value="3">3 Calendar Days (Standard)</option>
                  <option value="5">5 Calendar Days</option>
                  <option value="7">7 Calendar Days (1 Week)</option>
                  <option value="14">14 Calendar Days (2 Weeks)</option>
                  <option value="30">30 Calendar Days (1 Month)</option>
                </select>
              </div>

              <div className="space-y-1 bg-[#EEF1FB] p-4 rounded-xl border border-[#D8DFFA]">
                <Label className="text-xs font-semibold text-[#010619] flex items-center gap-1.5">
                  <RefreshCw className="h-4 w-4 text-primary" /> Included Revisions Limit
                </Label>
                <select value={revisionLimit} onChange={e => setRevisionLimit(e.target.value)} className="w-full h-11 rounded-xl border border-[#D8DFFA] text-xs font-semibold px-3 bg-white text-[#010619] mt-2 focus:outline-none focus:ring-1 focus:ring-primary">
                  <option value="0">No Revisions (Final Delivery)</option>
                  <option value="1">1 Revision Included</option>
                  <option value="2">2 Revisions Included (Recommended)</option>
                  <option value="3">3 Revisions Included</option>
                  <option value="-1">Unlimited Revisions</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* STEP 6 — SETTINGS & LIMITS */}
        {step === 6 && (
          <div className="space-y-5">
            <div>
              <h3 className="text-lg font-bold text-[#010619]">Step 6 — Service Settings & Capacity</h3>
              <p className="text-xs text-[#666666] font-medium">Protect yourself from workload overload by setting max active requests.</p>
            </div>

            <div className="space-y-4">
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-[#010619]">Maximum Active Requests Limit (Optional)</Label>
                <Input type="number" min="1" value={maxActiveRequests} onChange={e => setMaxActiveRequests(e.target.value)} placeholder="e.g. 10 (leave blank for unlimited)" className="h-11 text-xs rounded-xl border-[#D8DFFA] bg-white text-[#010619]" />
                <p className="text-[11px] text-[#666666] font-medium">When active requests reach this count, new customers will see "Currently Unavailable".</p>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold text-[#010619]">Cancellation Policy</Label>
                <select value={cancellationPolicy} onChange={e => setCancellationPolicy(e.target.value)} className="w-full h-11 rounded-xl border border-[#D8DFFA] text-xs font-semibold px-3 bg-white text-[#010619] focus:outline-none focus:ring-1 focus:ring-primary">
                  <option value="ALLOW_BEFORE_START">Allow cancellation before creator starts work</option>
                  <option value="NO_CANCELLATION">No cancellations once order is placed</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* STEP 7 — REVIEW & PUBLISH */}
        {step === 7 && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-bold text-[#010619]">Step 7 — Review & Publish Custom Service</h3>
              <p className="text-xs text-[#666666] font-medium">Review your service details before publishing to your store.</p>
            </div>

            <div className="bg-[#EEF1FB] p-6 rounded-2xl border border-[#D8DFFA] space-y-4 text-xs">
              <div className="flex justify-between items-center border-b border-[#D8DFFA] pb-3">
                <span className="font-bold text-[#010619] text-base">{name}</span>
                <span className="font-bold text-primary text-base">{isFree ? 'FREE' : formatMoney(price, currency)}</span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-[#666666] font-semibold">Category</span>
                  <div className="font-bold text-[#010619]">{category}</div>
                </div>
                <div>
                  <span className="text-[#666666] font-semibold">Delivery Turnaround</span>
                  <div className="font-bold text-[#010619]">{deliveryDays} Calendar Days</div>
                </div>
                <div>
                  <span className="text-[#666666] font-semibold">Included Revisions</span>
                  <div className="font-bold text-[#010619]">{revisionLimit < 0 ? 'Unlimited' : `${revisionLimit} Revisions`}</div>
                </div>
                <div>
                  <span className="text-[#666666] font-semibold">Intake Fields</span>
                  <div className="font-bold text-[#010619]">{requirements.length} Required Fields</div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#D8DFFA]">
              <Button variant="outline" onClick={() => handleSaveDraft(false)} disabled={saving} className="rounded-xl text-xs font-medium border-[#D8DFFA] bg-white hover:bg-[#E8EDFB] text-[#010619]">
                Save Draft
              </Button>
              <Button onClick={handlePublish} disabled={publishing} className="bg-primary hover:bg-primary/90 text-white font-bold text-xs rounded-xl shadow-xs gap-1.5 cursor-pointer">
                <Sparkles className="h-4 w-4" /> {publishing ? 'Publishing...' : 'Publish Service Now'}
              </Button>
            </div>
          </div>
        )}

      </div>

    </div>
  )
}
