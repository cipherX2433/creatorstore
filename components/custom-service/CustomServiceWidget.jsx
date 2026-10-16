'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { api, formatMoney } from '@/lib/clientApi'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import {
  Sparkles, Check, Clock, RefreshCw, FileText, CheckCircle2, ArrowRight, ShieldCheck,
  AlertCircle, Upload, Lock, Layers, Star, MessageSquare, Video, ExternalLink, Download,
  GitCommit, ChevronRight
} from 'lucide-react'

export default function CustomServiceWidget({ productId, onRequestSubmitted }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  // Package Selection State
  const [selectedPackageId, setSelectedPackageId] = useState(null)

  // Intake Form Answers State: { [fieldId]: answerValue }
  const [answers, setAnswers] = useState({})
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submittedReq, setSubmittedReq] = useState(null)

  // Revision Request State
  const [revisionNote, setRevisionNote] = useState('')
  const [submittingRevision, setSubmittingRevision] = useState(false)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedEmail = localStorage.getItem('creatorzero_customer_email') || ''
      if (savedEmail) setEmail(savedEmail)
    }
  }, [])

  useEffect(() => {
    if (!productId) return
    let mounted = true
    api.get(`/custom-service/public/${productId}`)
      .then((res) => {
        if (mounted) {
          setData(res)
          if (res.config?.packagesEnabled && res.config?.packages?.length > 0) {
            const popular = res.config.packages.find(p => p.isPopular) || res.config.packages[0]
            setSelectedPackageId(popular.id)
          }
          setLoading(false)
        }
      })
      .catch(() => { if (mounted) setLoading(false) })
    return () => { mounted = false }
  }, [productId])

  useEffect(() => {
    if (!productId || !email) return
    api.get(`/custom-service/my-requests?email=${encodeURIComponent(email)}`)
      .then((res) => {
        const reqs = res.items || []
        const active = reqs.find(r => r.productId === productId || r.serviceId === productId)
        if (active) {
          setSubmittedReq(active)
        }
      })
      .catch(() => {})
  }, [productId, email])

  if (loading || !data?.config) return null

  const { config, activeRequestsCount, isFull } = data

  const selectedPkg = config.packagesEnabled && config.packages?.length > 0
    ? config.packages.find(p => p.id === selectedPackageId) || config.packages[0]
    : null

  const activePrice = selectedPkg ? selectedPkg.price : (config.isFree ? 0 : config.price)
  const activeCurrency = selectedPkg ? selectedPkg.currency : config.currency
  const activeTurnaround = selectedPkg ? selectedPkg.turnaroundDays : (config.turnaroundValue || config.deliveryDays || 3)
  const activeRevisions = selectedPkg ? selectedPkg.revisions : config.revisionLimit

  const priceDisplay = (config.isFree && !selectedPkg) ? 'FREE' : formatMoney(activePrice, activeCurrency)

  function handleAnswerChange(fieldId, val) {
    setAnswers(prev => ({ ...prev, [fieldId]: val }))
  }

  function getFormattedAnswers() {
    return (config.requirements || []).map(req => {
      const val = answers[req.id] || ''
      return {
        questionId: req.id,
        questionText: req.question || req.label,
        answer: typeof val === 'string' ? val : JSON.stringify(val),
      }
    })
  }

  async function handleFreeRequest(e) {
    e.preventDefault()
    if (!email) {
      toast.error('Please enter your email address.')
      return
    }

    // Validate required fields
    for (const req of (config.requirements || [])) {
      if (req.required && !answers[req.id]) {
        toast.error(`Please complete required field: "${req.question || req.label}"`)
        return
      }
    }

    setSubmitting(true)
    try {
      const formatted = getFormattedAnswers()
      const res = await api.post('/custom-service/submit-free', {
        productId,
        name: name || email.split('@')[0],
        email,
        answers: formatted,
        packageId: selectedPackageId,
      })
      if (typeof window !== 'undefined') {
        localStorage.setItem('creatorzero_customer_email', email)
      }
      toast.success("Service request submitted! Your deliverable is in progress. 🎉")
      setSubmittedReq(res.request)
      if (onRequestSubmitted) onRequestSubmitted(res.request)
    } catch (err) {
      toast.error(err.message || 'Submission failed')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleRequestRevision(e) {
    e.preventDefault()
    if (!revisionNote.trim()) {
      toast.error('Please describe what changes you would like in the revision.')
      return
    }
    setSubmittingRevision(true)
    try {
      const res = await api.post(`/custom-service/request/${submittedReq.id}/revision`, {
        revisionNote,
      })
      toast.success('Revision request sent to the creator!')
      setSubmittedReq(res.request || { ...submittedReq, status: 'REVISION_REQUESTED' })
      setRevisionNote('')
    } catch (err) {
      toast.error(err.message || 'Failed to submit revision request.')
    } finally {
      setSubmittingRevision(false)
    }
  }

  if (isFull) {
    return (
      <div className="bg-[#000000] p-6 rounded-3xl border border-amber-500/40 text-center space-y-2 font-sans text-white">
        <AlertCircle className="h-8 w-8 text-amber-400 mx-auto" />
        <h4 className="text-base font-bold text-amber-400">Service Full — Temporarily Unavailable</h4>
        <p className="text-xs text-[rgba(244,242,236,0.68)]">The creator has reached maximum active request capacity for this service. Please check back soon.</p>
      </div>
    )
  }

  // Active / Submitted Service Request Customer View
  if (submittedReq) {
    const workflow = config.workflowStages || [
      { id: 'stg_1', name: 'New Request', key: 'SUBMITTED', order: 1 },
      { id: 'stg_2', name: 'Requirements Received', key: 'REQUIREMENTS_RECEIVED', order: 2 },
      { id: 'stg_3', name: 'In Progress', key: 'IN_PROGRESS', order: 3 },
      { id: 'stg_4', name: 'Under Review', key: 'REVIEW', order: 4 },
      { id: 'stg_5', name: 'Completed', key: 'COMPLETED', order: 5 },
    ]

    const getStatusIndex = (st) => {
      switch (st) {
        case 'SUBMITTED': return 0
        case 'REQUIREMENTS_RECEIVED': return 1
        case 'IN_PROGRESS': return 2
        case 'REVIEW':
        case 'CLARIFICATION_REQUIRED':
        case 'REVISION_REQUESTED': return 3
        case 'DELIVERED': return 3
        case 'COMPLETED': return 4
        default: return 1
      }
    }

    const currentStepIdx = getStatusIndex(submittedReq.status)

    return (
      <div className="bg-[#12141c] text-white rounded-3xl p-6 sm:p-8 border border-white/10 shadow-2xl space-y-6 font-sans">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-5">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase bg-emerald-500/20 text-emerald-400 px-2.5 py-0.5 rounded-full border border-emerald-500/30">
                ACTIVE SERVICE ORDER
              </span>
              <span className="text-xs text-[rgba(244,242,236,0.68)] font-bold">Order ID: #{submittedReq.id.slice(-6)}</span>
            </div>
            <h3 className="font-extrabold text-2xl text-white mt-1">{config.name}</h3>
          </div>

          <Link href="/account/custom-services">
            <Button className="bg-[#000000] hover:bg-white/10 text-white font-bold text-xs rounded-xl border border-white/10 gap-1.5">
              View All Orders <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </Link>
        </div>

        {/* Workflow Progress Stepper */}
        <div className="bg-[#000000] p-5 rounded-2xl border border-white/10 space-y-3">
          <div className="text-xs font-bold text-[rgba(244,242,236,0.68)] uppercase tracking-wider flex items-center justify-between">
            <span>Fulfillment Progress</span>
            <span className="text-[#CBE957] font-extrabold">
              Status: {submittedReq.status.replace('_', ' ')}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-2">
            {workflow.map((stg, i) => {
              const isPassed = i <= currentStepIdx
              const isCurrent = i === currentStepIdx
              return (
                <div
                  key={stg.id || i}
                  className={`p-2.5 rounded-xl border text-center space-y-1 transition-all ${
                    isCurrent
                      ? 'bg-primary/10 border-primary text-primary'
                      : isPassed
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                      : 'bg-[#242424] border-white/10 text-[rgba(244,242,236,0.68)]'
                  }`}
                >
                  <div className="text-[10px] font-black uppercase">Step {i + 1}</div>
                  <div className="text-xs font-bold truncate">{stg.name}</div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Creator Deliverables if delivered */}
        {submittedReq.deliveries && submittedReq.deliveries.length > 0 && (
          <div className="bg-[#000000] p-6 rounded-2xl border border-emerald-500/40 space-y-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              <h4 className="text-base font-bold text-white">Work Delivered by Creator</h4>
            </div>

            <div className="space-y-3">
              {submittedReq.deliveries.map((del, idx) => (
                <div key={idx} className="bg-[#12141c] border border-white/10 p-4 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#CBE957]">{del.title || `Deliverable #${idx + 1}`}</span>
                    {del.url && (
                      <a href={del.url} target="_blank" rel="noreferrer">
                        <Button size="sm" className="bg-primary text-[#000000] font-bold text-xs h-8 px-3 rounded-lg gap-1">
                          <Download className="w-3.5 h-3.5" /> Download Asset
                        </Button>
                      </a>
                    )}
                  </div>
                  {del.notes && <p className="text-xs text-[rgba(244,242,236,0.68)]">{del.notes}</p>}
                </div>
              ))}
            </div>

            {/* Revision Request Section */}
            {config.allowRevision !== false && (submittedReq.usedRevisions || 0) < (activeRevisions < 0 ? 99 : activeRevisions) && (
              <form onSubmit={handleRequestRevision} className="pt-4 border-t border-white/10 space-y-3">
                <Label className="text-xs font-semibold text-[rgba(244,242,236,0.68)]">
                  Need a revision? ({activeRevisions < 0 ? 'Unlimited' : `${activeRevisions - (submittedReq.usedRevisions || 0)} revisions remaining`})
                </Label>
                <Textarea
                  placeholder="Describe what specific adjustments you would like the creator to make..."
                  value={revisionNote}
                  onChange={(e) => setRevisionNote(e.target.value)}
                  rows={2}
                  className="bg-[#12141c] border-white/10 text-white text-xs rounded-xl focus:border-primary"
                />
                <Button
                  type="submit"
                  disabled={submittingRevision}
                  className="bg-[#39414D] hover:bg-white/20 text-white font-bold text-xs rounded-xl h-9 px-4"
                >
                  {submittingRevision ? 'Submitting...' : 'Request Revision'}
                </Button>
              </form>
            )}
          </div>
        )}

        {/* Submitted Answers */}
        {submittedReq.answers && submittedReq.answers.length > 0 && (
          <div className="bg-[#000000] p-5 rounded-2xl border border-white/10 space-y-3 text-xs">
            <div className="text-xs font-bold text-[rgba(244,242,236,0.68)] uppercase tracking-wider flex items-center gap-2">
              <FileText className="w-4 h-4 text-[#CBE957]" /> Your Submitted Project Requirements
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              {submittedReq.answers.map((ans, idx) => (
                <div key={idx} className="bg-[#12141c] p-3 rounded-xl border border-white/10 space-y-1">
                  <div className="text-[rgba(244,242,236,0.68)] font-semibold text-[11px]">{ans.questionText || `Question #${idx + 1}`}</div>
                  <div className="text-white font-medium">{ans.answer || '(No answer)'}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="bg-[#12141c] text-white rounded-3xl p-6 sm:p-8 border border-white/10 shadow-2xl space-y-8 font-sans">
      
      {/* Header */}
      <div className="space-y-4 border-b border-white/10 pb-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-black uppercase bg-[#F0441E] text-white px-3 py-1 rounded-full flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5" /> BESPOKE SERVICE
            </span>
            <span className="text-xs text-[rgba(244,242,236,0.68)] font-bold border-l border-white/10 pl-3">
              {config.category || 'Consulting'}
            </span>
          </div>

          <div className="flex items-center gap-3 bg-[#000000] px-4 py-1.5 rounded-full border border-white/10 text-xs font-bold text-white">
            <Clock className="h-4 w-4 text-[#CBE957]" />
            <span>{activeTurnaround} Turnaround</span>
          </div>
        </div>

        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight leading-tight">
          {config.name}
        </h1>

        {config.shortDescription && (
          <p className="text-sm text-[rgba(244,242,236,0.68)] leading-relaxed max-w-3xl">
            {config.shortDescription}
          </p>
        )}
      </div>

      {/* Package Tier Cards if packages enabled */}
      {config.packagesEnabled && config.packages?.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-xs font-bold text-[rgba(244,242,236,0.68)] uppercase tracking-wider flex items-center gap-2">
            <Layers className="w-4 h-4 text-primary" /> Select Service Tier Package
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {config.packages.map((pkg) => {
              const selected = (selectedPackageId || config.packages[0].id) === pkg.id
              return (
                <button
                  key={pkg.id}
                  type="button"
                  onClick={() => setSelectedPackageId(pkg.id)}
                  className={`p-5 rounded-2xl border text-left flex flex-col justify-between transition-all relative ${
                    selected
                      ? 'bg-[#000000] border-primary shadow-lg ring-1 ring-primary'
                      : 'bg-[#000000]/60 border-white/10 hover:border-white/40'
                  }`}
                >
                  {pkg.isPopular && (
                    <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-primary text-[#000000] text-[9px] font-black uppercase px-2.5 py-0.5 rounded-full flex items-center gap-1">
                      <Star className="w-2.5 h-2.5 fill-black" /> Popular
                    </span>
                  )}

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-extrabold text-base text-white">{pkg.name}</h4>
                      <span className="text-base font-black text-primary">
                        {formatMoney(pkg.price, pkg.currency)}
                      </span>
                    </div>

                    {pkg.description && (
                      <p className="text-xs text-[rgba(244,242,236,0.68)] leading-relaxed">{pkg.description}</p>
                    )}

                    <div className="text-[11px] text-[#CBE957] font-bold flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5" /> {pkg.turnaroundDays} Days • {pkg.revisions < 0 ? 'Unlimited' : `${pkg.revisions} Rev.`}
                    </div>

                    {pkg.features?.length > 0 && (
                      <div className="space-y-1 pt-2 border-t border-white/10">
                        {pkg.features.map((f, fIdx) => (
                          <div key={fIdx} className="text-[11px] text-white flex items-center gap-1.5">
                            <Check className="w-3 h-3 text-primary shrink-0" /> {f}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className={`w-full mt-4 h-9 rounded-xl font-extrabold text-xs flex items-center justify-center gap-1.5 transition-all ${
                    selected
                      ? 'bg-primary text-[#000000]'
                      : 'bg-[#12141c] text-white border border-white/10'
                  }`}>
                    {selected ? 'Selected Package' : 'Select Tier'}
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Deliverables Overview */}
      {config.deliverables?.length > 0 && (
        <div className="space-y-3 pt-4 border-t border-white/10">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#34D399]" /> What You'll Receive
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {config.deliverables.map((d, i) => (
              <div key={d.id || i} className="bg-[#000000] border border-white/10 p-3.5 rounded-xl space-y-1">
                <div className="text-xs font-bold text-white flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-primary" /> {d.title}
                </div>
                {d.description && <p className="text-[11px] text-[rgba(244,242,236,0.68)] pl-5">{d.description}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Scope Included / Excluded */}
      {(config.scopeIncluded || config.scopeExcluded) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-white/10 text-xs">
          {config.scopeIncluded && (
            <div className="bg-[#000000] p-4 rounded-2xl border border-emerald-500/30 space-y-1.5">
              <span className="font-bold text-emerald-400 flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" /> Included Scope
              </span>
              <p className="text-[rgba(244,242,236,0.68)] leading-relaxed">{config.scopeIncluded}</p>
            </div>
          )}

          {config.scopeExcluded && (
            <div className="bg-[#000000] p-4 rounded-2xl border border-[#F0441E]/30 space-y-1.5">
              <span className="font-bold text-[#F0441E] flex items-center gap-1.5">
                <AlertCircle className="h-4 w-4 text-[#F0441E]" /> Not Included
              </span>
              <p className="text-[rgba(244,242,236,0.68)] leading-relaxed">{config.scopeExcluded}</p>
            </div>
          )}
        </div>
      )}

      {/* CUSTOMER INTAKE REQUIREMENTS FORM */}
      {config.requirements?.length > 0 && (
        <div className="space-y-4 pt-4 border-t border-white/10">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <FileText className="w-4 h-4 text-[#CBE957]" /> Service Requirements Questionnaire
            </h3>
            <span className="text-xs text-[rgba(244,242,236,0.68)]">* Required fields</span>
          </div>

          <div className="space-y-4">
            {config.requirements.map((req) => (
              <div key={req.id} className="space-y-1.5">
                <Label className="text-xs font-semibold text-[rgba(244,242,236,0.68)]">
                  {req.question || req.label} {req.required && <span className="text-[#F0441E]">*</span>}
                </Label>
                {req.helpText && <p className="text-[11px] text-[rgba(244,242,236,0.68)]">{req.helpText}</p>}

                {req.type === 'LONG_TEXT' ? (
                  <Textarea
                    required={req.required}
                    value={answers[req.id] || ''}
                    onChange={e => handleAnswerChange(req.id, e.target.value)}
                    rows={3}
                    placeholder="Enter your detailed response..."
                    className="bg-[#000000] border-white/10 text-white text-xs rounded-xl focus:border-primary"
                  />
                ) : req.type === 'DROPDOWN' ? (
                  <Select
                    value={answers[req.id] || ''}
                    onValueChange={(val) => handleAnswerChange(req.id, val)}
                  >
                    <SelectTrigger className="bg-[#000000] border-white/10 text-white text-xs h-11 rounded-xl">
                      <SelectValue placeholder="Select an option" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#12141c] border-white/10 text-white">
                      {(req.options || []).map((opt, oIdx) => (
                        <SelectItem key={oIdx} value={opt}>{opt}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : req.type.includes('UPLOAD') ? (
                  <Input
                    required={req.required}
                    value={answers[req.id] || ''}
                    onChange={e => handleAnswerChange(req.id, e.target.value)}
                    placeholder="Paste File URL (Google Drive, Dropbox, Figma, etc.)..."
                    className="bg-[#000000] border-white/10 text-white text-xs h-11 rounded-xl focus:border-primary"
                  />
                ) : (
                  <Input
                    required={req.required}
                    value={answers[req.id] || ''}
                    onChange={e => handleAnswerChange(req.id, e.target.value)}
                    placeholder="Your answer..."
                    className="bg-[#000000] border-white/10 text-white text-xs h-11 rounded-xl focus:border-primary"
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUBMISSION FORM FOR FREE / INTAKE */}
      {config.isFree ? (
        <form onSubmit={handleFreeRequest} className="space-y-4 pt-4 border-t border-white/10">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-[rgba(244,242,236,0.68)]">Full Name</Label>
              <Input
                placeholder="Jane Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="bg-[#000000] border-white/10 text-white text-xs h-11 rounded-xl focus:border-primary"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-[rgba(244,242,236,0.68)]">Email Address *</Label>
              <Input
                type="email"
                required
                placeholder="jane@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-[#000000] border-white/10 text-white text-xs h-11 rounded-xl focus:border-primary"
              />
            </div>
          </div>

          <Button
            type="submit"
            disabled={submitting}
            className="w-full h-12 bg-primary hover:bg-primary-hover text-[#000000] font-extrabold text-xs rounded-xl shadow-lg gap-2 border border-black transition-all"
          >
            {submitting ? 'Submitting...' : <>Submit Free Service Request <ArrowRight className="h-4 w-4" /></>}
          </Button>
        </form>
      ) : null}

    </div>
  )
}
