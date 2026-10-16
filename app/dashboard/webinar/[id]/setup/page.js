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
  ArrowLeft, Check, ChevronRight, Loader2, Sparkles, Shield, Users, Radio, Calendar,
  Clock, Globe, Video, DollarSign, Plus, Trash2, AlertCircle
} from 'lucide-react'

const STEPS = [
  { id: 1, label: 'Basic Info' },
  { id: 2, label: 'Schedule' },
  { id: 3, label: 'Pricing & Capacity' },
  { id: 4, label: 'Intake Questions' },
  { id: 5, label: 'Meeting Link' },
  { id: 6, label: 'Settings' },
  { id: 7, label: 'Review & Publish' },
]

const TIMEZONES = [
  'Asia/Kolkata', 'America/New_York', 'America/Los_Angeles', 'Europe/London',
  'Europe/Paris', 'Asia/Tokyo', 'Asia/Singapore', 'Australia/Sydney', 'UTC'
]

const DURATIONS = [30, 45, 60, 90, 120]

export default function CreatorWebinarSetup() {
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
    title: 'System Design Live',
    shortDescription: 'Live system design session for software engineering interviews.',
    description: 'Join a live interactive system design session where we will design a scalable system from scratch.',
    category: 'Technology',
    tags: ['#systemdesign', '#interviews', '#live'],
    coverImage: '',
    startDate: new Date(Date.now() + 86400000 * 5).toISOString().split('T')[0],
    startTime: '19:00',
    timezone: 'Asia/Kolkata',
    durationMinutes: 90,
    price: 499,
    currency: 'inr',
    isFree: false,
    capacity: 100,
    meetingType: 'VIDEO_CALL',
    meetingUrl: 'https://meet.google.com/abc-defg-hij',
    meetingInstructions: 'Please join 5 minutes before the webinar starts.',
    registrationRequired: true,
    registrationCutoffMinutes: 15,
    allowCancellation: true,
    cancellationCutoffHours: 2,
    questions: [
      { id: 'q1', question: 'What is your current role?', type: 'SHORT_TEXT', required: true, order: 1 },
      { id: 'q2', question: 'What do you hope to learn from this session?', type: 'LONG_TEXT', required: false, order: 2 },
    ],
    status: 'DRAFT',
  })

  const [tagInput, setTagInput] = useState('')

  useEffect(() => {
    if (!productId) return
    setLoading(true)
    Promise.all([
      api.get(`/products/${productId}`),
      api.get(`/webinar/config/${productId}`),
    ]).then(([prodRes, confRes]) => {
      setProduct(prodRes.product)
      if (confRes.config) {
        const startObj = new Date(confRes.config.startAtUTC || Date.now())
        const startDate = startObj.toISOString().split('T')[0]
        const startTime = `${String(startObj.getHours()).padStart(2, '0')}:${String(startObj.getMinutes()).padStart(2, '0')}`
        setConfig((prev) => ({
          ...prev,
          ...confRes.config,
          startDate: startDate || prev.startDate,
          startTime: startTime || prev.startTime,
        }))
      }
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [productId])

  function getCalculatedStartAtUTC() {
    try {
      const [year, month, day] = config.startDate.split('-').map(Number)
      const [hours, minutes] = config.startTime.split(':').map(Number)
      const d = new Date(Date.UTC(year, month - 1, day, hours, minutes))
      return d.toISOString()
    } catch {
      return new Date(Date.now() + 86400000 * 3).toISOString()
    }
  }

  async function handleSaveConfig(autoAdvance = true) {
    setSaving(true)
    try {
      const startAtUTC = getCalculatedStartAtUTC()
      const payload = {
        ...config,
        startAtUTC,
        price: config.isFree ? 0 : Number(config.price),
      }
      const res = await api.post(`/webinar/config/${productId}`, payload)
      setConfig((prev) => ({ ...prev, ...res.config }))
      toast.success('Webinar settings saved!')
      if (autoAdvance && step < 7) setStep(step + 1)
    } catch (err) {
      toast.error(err.message || 'Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  async function handlePublish() {
    setPublishing(true)
    try {
      const startAtUTC = getCalculatedStartAtUTC()
      if (new Date(startAtUTC).getTime() <= Date.now()) {
        toast.error('Webinar start time must be scheduled for a future date and time.')
        setPublishing(false)
        return
      }
      const payload = {
        ...config,
        startAtUTC,
        price: config.isFree ? 0 : Number(config.price),
      }
      await api.post(`/webinar/config/${productId}`, payload)
      await api.post(`/products/${productId}/publish`)
      toast.success('Live Webinar published successfully! 🎉')
      router.push('/dashboard/webinar')
    } catch (err) {
      toast.error(err.message || 'Failed to publish webinar')
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

  function addQuestion() {
    const q = { id: `q_${Date.now()}`, question: 'What is your query?', type: 'SHORT_TEXT', required: false, order: config.questions.length + 1 }
    setConfig({ ...config, questions: [...config.questions, q] })
  }

  function updateQuestion(id, field, val) {
    setConfig({
      ...config,
      questions: config.questions.map(q => q.id === id ? { ...q, [field]: val } : q)
    })
  }

  function removeQuestion(id) {
    setConfig({ ...config, questions: config.questions.filter(q => q.id !== id) })
  }

  function addTag() {
    if (!tagInput.trim()) return
    const formatted = tagInput.startsWith('#') ? tagInput.trim() : `#${tagInput.trim()}`
    if (!config.tags.includes(formatted)) {
      setConfig({ ...config, tags: [...config.tags, formatted] })
    }
    setTagInput('')
  }

  function removeTag(tag) {
    setConfig({ ...config, tags: config.tags.filter(t => t !== tag) })
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
            <h1 className="text-2xl font-bold text-[#010619] tracking-tight flex items-center gap-2">
              <Radio className="h-6 w-6 text-primary" /> Live Webinar Setup Wizard
            </h1>
            <p className="text-xs text-[#666666] font-medium">Configure date, time, capacity, registration questions and video call links.</p>
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
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all shrink-0 cursor-pointer ${
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
              <Label className="text-xs font-semibold text-[#010619]">Webinar Title *</Label>
              <Input
                value={config.title}
                onChange={(e) => setConfig({ ...config, title: e.target.value })}
                placeholder="e.g. System Design Live"
                className="h-11 rounded-xl text-xs font-medium border-[#D8DFFA] bg-white text-[#010619]"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-[#010619]">Short Summary *</Label>
              <Input
                value={config.shortDescription}
                onChange={(e) => setConfig({ ...config, shortDescription: e.target.value })}
                placeholder="e.g. Live system design session for software engineering interviews."
                className="h-11 rounded-xl text-xs font-medium border-[#D8DFFA] bg-white text-[#010619]"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-[#010619]">Full Description *</Label>
              <Textarea
                rows={5}
                value={config.description}
                onChange={(e) => setConfig({ ...config, description: e.target.value })}
                placeholder="Detailed session breakdown..."
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
                  {['Technology', 'Career', 'Business', 'Marketing', 'Education', 'Design', 'Other'].map((c) => (
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

        {/* STEP 2: SCHEDULE */}
        {step === 2 && (
          <div className="space-y-5">
            <h2 className="text-lg font-bold text-[#010619]">Step 2 — Date, Time & Timezone</h2>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-[#010619]">Event Date *</Label>
                <Input
                  type="date"
                  value={config.startDate}
                  onChange={(e) => setConfig({ ...config, startDate: e.target.value })}
                  className="h-11 rounded-xl text-xs font-medium border-[#D8DFFA] bg-white text-[#010619]"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-[#010619]">Start Time *</Label>
                <Input
                  type="time"
                  value={config.startTime}
                  onChange={(e) => setConfig({ ...config, startTime: e.target.value })}
                  className="h-11 rounded-xl text-xs font-medium border-[#D8DFFA] bg-white text-[#010619]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-[#010619]">Duration *</Label>
                <select
                  value={config.durationMinutes}
                  onChange={(e) => setConfig({ ...config, durationMinutes: Number(e.target.value) })}
                  className="w-full h-11 rounded-xl border border-[#D8DFFA] text-xs font-medium px-3 bg-white text-[#010619] focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  {DURATIONS.map((d) => (
                    <option key={d} value={d}>{d} minutes</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-[#010619]">Creator Timezone *</Label>
                <select
                  value={config.timezone}
                  onChange={(e) => setConfig({ ...config, timezone: e.target.value })}
                  className="w-full h-11 rounded-xl border border-[#D8DFFA] text-xs font-medium px-3 bg-white text-[#010619] focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  {TIMEZONES.map((tz) => (
                    <option key={tz} value={tz}>{tz}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: PRICING & CAPACITY */}
        {step === 3 && (
          <div className="space-y-5">
            <h2 className="text-lg font-bold text-[#010619]">Step 3 — Pricing & Capacity</h2>
            
            <div className="flex items-center justify-between p-4 rounded-xl border border-[#D8DFFA] bg-[#EEF1FB]">
              <div className="space-y-0.5">
                <Label className="text-xs font-semibold text-[#010619]">Free Webinar</Label>
                <p className="text-xs text-[#666666] font-medium">Allow attendees to register without payment.</p>
              </div>
              <Switch
                checked={config.isFree}
                onCheckedChange={(checked) => setConfig({ ...config, isFree: checked, price: checked ? 0 : (config.price || 499) })}
              />
            </div>

            {!config.isFree && (
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-[#010619]">Ticket Price (₹) *</Label>
                <Input
                  type="number"
                  value={config.price}
                  onChange={(e) => setConfig({ ...config, price: Math.max(0, Number(e.target.value)) })}
                  placeholder="499"
                  className="h-11 rounded-xl text-xs font-medium border-[#D8DFFA] bg-white text-[#010619]"
                />
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-[#010619]">Attendee Capacity Limit (Optional)</Label>
              <Input
                type="number"
                value={config.capacity || ''}
                onChange={(e) => setConfig({ ...config, capacity: e.target.value ? Number(e.target.value) : null })}
                placeholder="Leave blank for unlimited capacity (e.g. 100)"
                className="h-11 rounded-xl text-xs font-medium border-[#D8DFFA] bg-white text-[#010619]"
              />
            </div>
          </div>
        )}

        {/* STEP 4: INTAKE QUESTIONS */}
        {step === 4 && (
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-[#010619]">Step 4 — Registration Questions</h2>
              <Button type="button" onClick={addQuestion} size="sm" className="bg-primary hover:bg-primary/90 text-white text-xs font-semibold rounded-xl gap-1 shadow-xs cursor-pointer">
                <Plus className="h-4 w-4" /> Add Question
              </Button>
            </div>

            <div className="space-y-3">
              {config.questions.map((q, idx) => (
                <div key={q.id} className="p-4 rounded-xl border border-[#D8DFFA] bg-[#EEF1FB] space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-primary">Question #{idx + 1}</span>
                    <button type="button" onClick={() => removeQuestion(q.id)} className="text-red-600 hover:text-red-700 text-xs font-medium cursor-pointer">
                      Remove
                    </button>
                  </div>
                  <Input
                    value={q.question}
                    onChange={(e) => updateQuestion(q.id, 'question', e.target.value)}
                    placeholder="Question prompt..."
                    className="h-10 text-xs font-medium bg-white border-[#D8DFFA] text-[#010619]"
                  />
                  <div className="flex items-center justify-between pt-1">
                    <label className="flex items-center gap-2 text-xs font-medium text-[#010619] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={q.required}
                        onChange={(e) => updateQuestion(q.id, 'required', e.target.checked)}
                        className="rounded border-[#D8DFFA]"
                      />
                      Required field
                    </label>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* STEP 5: MEETING LINK */}
        {step === 5 && (
          <div className="space-y-5">
            <h2 className="text-lg font-bold text-[#010619]">Step 5 — Video Call & Meeting Access</h2>
            
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-[#010619]">Meeting Video URL *</Label>
              <Input
                type="url"
                value={config.meetingUrl}
                onChange={(e) => setConfig({ ...config, meetingUrl: e.target.value })}
                placeholder="e.g. https://meet.google.com/abc-defg-hij"
                className="h-11 rounded-xl text-xs font-medium border-[#D8DFFA] bg-white text-[#010619]"
              />
              <p className="text-[11px] text-[#666666] font-medium">This meeting link is securely hidden and will ONLY be revealed to confirmed registrants.</p>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-[#010619]">Attendee Join Instructions</Label>
              <Textarea
                rows={3}
                value={config.meetingInstructions}
                onChange={(e) => setConfig({ ...config, meetingInstructions: e.target.value })}
                placeholder="e.g. Please join 5 minutes before the webinar starts..."
                className="rounded-xl text-xs font-medium border-[#D8DFFA] bg-white text-[#010619]"
              />
            </div>
          </div>
        )}

        {/* STEP 6: SETTINGS */}
        {step === 6 && (
          <div className="space-y-5">
            <h2 className="text-lg font-bold text-[#010619]">Step 6 — Cutoffs & Cancellation Settings</h2>
            
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-[#010619]">Registration Cutoff (Minutes Before Start)</Label>
              <Input
                type="number"
                value={config.registrationCutoffMinutes}
                onChange={(e) => setConfig({ ...config, registrationCutoffMinutes: Number(e.target.value) })}
                className="h-11 rounded-xl text-xs font-medium border-[#D8DFFA] bg-white text-[#010619]"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-[#010619]">Cancellation Window (Hours Before Start)</Label>
              <Input
                type="number"
                value={config.cancellationCutoffHours}
                onChange={(e) => setConfig({ ...config, cancellationCutoffHours: Number(e.target.value) })}
                className="h-11 rounded-xl text-xs font-medium border-[#D8DFFA] bg-white text-[#010619]"
              />
            </div>
          </div>
        )}

        {/* STEP 7: REVIEW & PUBLISH */}
        {step === 7 && (
          <div className="space-y-6">
            <h2 className="text-lg font-bold text-[#010619]">Step 7 — Review & Publish</h2>
            
            <div className="bg-[#EEF1FB] p-6 rounded-2xl border border-[#D8DFFA] space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-14 w-14 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold shrink-0">
                  <Radio className="h-8 w-8" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-[#010619]">{config.title}</h3>
                  <p className="text-xs text-[#666666] font-medium">{config.shortDescription}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 text-xs">
                <div className="bg-white p-3 rounded-xl border border-[#D8DFFA]">
                  <div className="text-[#666666] font-semibold">Start Date & Time</div>
                  <div className="font-bold text-[#010619] mt-0.5">{config.startDate} {config.startTime}</div>
                </div>
                <div className="bg-white p-3 rounded-xl border border-[#D8DFFA]">
                  <div className="text-[#666666] font-semibold">Timezone</div>
                  <div className="font-bold text-[#010619] mt-0.5">{config.timezone}</div>
                </div>
                <div className="bg-white p-3 rounded-xl border border-[#D8DFFA]">
                  <div className="text-[#666666] font-semibold">Duration</div>
                  <div className="font-bold text-[#010619] mt-0.5">{config.durationMinutes} mins</div>
                </div>
                <div className="bg-white p-3 rounded-xl border border-[#D8DFFA]">
                  <div className="text-[#666666] font-semibold">Price</div>
                  <div className="font-bold text-primary mt-0.5">{config.isFree ? 'FREE' : formatMoney(config.price, config.currency)}</div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#D8DFFA]">
              <Button variant="outline" onClick={() => handleSaveConfig(false)} disabled={saving} className="rounded-xl font-medium text-xs border-[#D8DFFA] bg-white hover:bg-[#E8EDFB] text-[#010619]">
                Save Draft
              </Button>
              <Button onClick={handlePublish} disabled={publishing} className="bg-primary hover:bg-primary/90 text-white font-bold text-xs rounded-xl shadow-xs gap-1 cursor-pointer">
                {publishing ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Publish Webinar 🎉'}
              </Button>
            </div>
          </div>
        )}

        {/* BOTTOM NAV BUTTONS */}
        {step < 7 && (
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
