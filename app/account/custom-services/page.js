'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { api } from '@/lib/clientApi'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import {
  Sparkles, Clock, CheckCircle2, AlertCircle, FileText, Download, Send, RefreshCw,
  HelpCircle, Check, ArrowRight
} from 'lucide-react'

export default function CustomerCustomServicesPage() {
  const [email, setEmail] = useState('')
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('active') // 'active' | 'completed'

  // Modal / Form state for Revision & Clarification Response
  const [selectedReqId, setSelectedReqId] = useState(null)
  const [revisionMsg, setRevisionMsg] = useState('')
  const [showRevisionModal, setShowRevisionModal] = useState(false)

  const [clarificationMsg, setClarificationMsg] = useState('')
  const [showClarificationModal, setShowClarificationModal] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)

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
    fetchCustomerRequests(email)
  }, [email])

  function fetchCustomerRequests(custEmail) {
    setLoading(true)
    api.get(`/custom-service/student/requests?email=${encodeURIComponent(custEmail)}`)
      .then((res) => {
        setItems(res.items || [])
        setLoading(false)
      })
      .catch((err) => {
        toast.error(err.message || 'Failed to load your requests')
        setLoading(false)
      })
  }

  function handleEmailSubmit(e) {
    e.preventDefault()
    if (!email) return
    if (typeof window !== 'undefined') {
      localStorage.setItem('creatorzero_customer_email', email)
    }
    fetchCustomerRequests(email)
  }

  async function handleAcceptDelivery(reqId) {
    if (!confirm('Accept this delivery and mark the custom service request as completed?')) return
    try {
      await api.post(`/custom-service/requests/${reqId}/accept?email=${encodeURIComponent(email)}`)
      toast.success('Service marked as completed! Thank you! 🎉')
      fetchCustomerRequests(email)
    } catch (err) {
      toast.error(err.message || 'Failed to accept delivery')
    }
  }

  async function handleSubmitRevision(e) {
    e.preventDefault()
    if (!revisionMsg.trim()) return
    setActionLoading(true)
    try {
      await api.post(`/custom-service/requests/${selectedReqId}/revision?email=${encodeURIComponent(email)}`, {
        message: revisionMsg,
      })
      toast.success('Revision request sent to creator!')
      setShowRevisionModal(false)
      setRevisionMsg('')
      fetchCustomerRequests(email)
    } catch (err) {
      toast.error(err.message || 'Failed to request revision')
    } finally {
      setActionLoading(false)
    }
  }

  async function handleSubmitClarificationResponse(e) {
    e.preventDefault()
    if (!clarificationMsg.trim()) return
    setActionLoading(true)
    try {
      await api.post(`/custom-service/requests/${selectedReqId}/clarification-response?email=${encodeURIComponent(email)}`, {
        message: clarificationMsg,
      })
      toast.success('Clarification response sent! Creator work resumed.')
      setShowClarificationModal(false)
      setClarificationMsg('')
      fetchCustomerRequests(email)
    } catch (err) {
      toast.error(err.message || 'Failed to send clarification response')
    } finally {
      setActionLoading(false)
    }
  }

  const activeRequests = items.filter(i => i.request?.status !== 'COMPLETED' && i.request?.status !== 'CANCELLED')
  const completedRequests = items.filter(i => i.request?.status === 'COMPLETED' || i.request?.status === 'CANCELLED')

  const displayed = activeTab === 'active' ? activeRequests : completedRequests

  if (!email && !loading) {
    return (
      <div className="min-h-screen bg-[#000000] flex items-center justify-center p-6 text-[#F4F2EC] font-sans">
        <div className="max-w-md w-full bg-[#12141c] p-8 rounded-3xl border border-white/10 shadow-xl space-y-5 text-center">
          <div className="h-14 w-14 bg-primary/15 text-primary rounded-2xl flex items-center justify-center mx-auto shadow-xs">
            <Sparkles className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-[#F4F2EC]">My Service Requests</h1>
            <p className="text-xs text-[rgba(244,242,236,0.68)] font-medium mt-1">Enter your customer email address to view custom service status, deliverables, and revision history.</p>
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
              Access My Service Requests
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
            <Sparkles className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-[#F4F2EC] tracking-tight">My Custom Services</h1>
            <p className="text-xs text-[rgba(244,242,236,0.68)] font-medium">Track progress of your bespoke deliverables, download work files, and request revisions.</p>
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
          Active Requests ({activeRequests.length})
        </button>
        <button
          onClick={() => setActiveTab('completed')}
          className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center gap-1.5 ${
            activeTab === 'completed' ? 'bg-primary text-[#000000] shadow-xs' : 'text-[rgba(244,242,236,0.68)] hover:bg-[#12141c]'
          }`}
        >
          Completed ({completedRequests.length})
        </button>
      </div>

      {/* REQUESTS LIST */}
      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-48 w-full rounded-3xl" />
          <Skeleton className="h-48 w-full rounded-3xl" />
        </div>
      ) : displayed.length === 0 ? (
        <div className="bg-[#12141c] rounded-3xl p-12 border border-dashed border-white/10 text-center space-y-2">
          <Sparkles className="h-10 w-10 text-slate-300 mx-auto" />
          <h3 className="text-base font-extrabold text-[#F4F2EC]">No {activeTab} service requests found</h3>
          <p className="text-xs text-[rgba(244,242,236,0.68)] font-medium">When you submit custom service orders, your request status and deliverables will appear here.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {displayed.map((item) => {
            const { request: req, config, product } = item
            const dueStr = new Date(req.dueAt).toLocaleDateString()
            const limit = config.revisionLimit !== undefined ? Number(config.revisionLimit) : 2
            const canRequestRevision = req.status === 'DELIVERED' && (limit < 0 || (req.usedRevisions || 0) < limit)

            return (
              <div key={req.id} className="bg-[#12141c] rounded-3xl p-6 sm:p-8 border border-white/10 shadow-sm space-y-6">
                
                {/* Request Header */}
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
                  <div className="flex items-center gap-3">
                    {product.thumbnail ? (
                      <img src={product.thumbnail} alt="" className="h-12 w-12 rounded-2xl object-cover shrink-0" />
                    ) : (
                      <div className="h-12 w-12 rounded-2xl bg-primary/15 text-primary flex items-center justify-center font-black text-lg shrink-0">
                        <Sparkles className="h-6 w-6" />
                      </div>
                    )}
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                          req.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-800' :
                          req.status === 'DELIVERED' ? 'bg-primary/15 text-primary' :
                          req.status === 'REVISION_REQUESTED' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-[#F4F2EC]'
                        }`}>
                          {req.status}
                        </span>
                      </div>
                      <h3 className="font-extrabold text-base text-[#F4F2EC] mt-0.5">{config.name || product.title}</h3>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-[rgba(244,242,236,0.5)] font-bold text-xs">Estimated Delivery</span>
                    <div className="font-extrabold text-[#F4F2EC] text-xs">{dueStr}</div>
                  </div>
                </div>

                {/* TIMELINE PROGRESS BAR */}
                <div className="bg-[#12141c] p-4 rounded-2xl border border-white/10 space-y-2">
                  <span className="text-[10px] font-black uppercase text-[rgba(244,242,236,0.5)]">Request Progress</span>
                  <div className="grid grid-cols-4 gap-2 text-center text-[11px] font-extrabold">
                    <div className={`py-1.5 rounded-xl border ${req.status === 'SUBMITTED' ? 'bg-primary text-[#000000] border-primary/30' : 'bg-emerald-100 text-emerald-800 border-emerald-200'}`}>
                      1. Submitted
                    </div>
                    <div className={`py-1.5 rounded-xl border ${req.status === 'IN_PROGRESS' || req.status === 'CLARIFICATION_REQUIRED' ? 'bg-primary text-[#000000] border-primary/30' : ['DELIVERED', 'REVISION_REQUESTED', 'COMPLETED'].includes(req.status) ? 'bg-emerald-100 text-emerald-800 border-emerald-200' : 'bg-[#12141c] text-[rgba(244,242,236,0.5)] border-white/10'}`}>
                      2. In Progress
                    </div>
                    <div className={`py-1.5 rounded-xl border ${req.status === 'DELIVERED' || req.status === 'REVISION_REQUESTED' ? 'bg-primary text-[#000000] border-primary/30' : req.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-800 border-emerald-200' : 'bg-[#12141c] text-[rgba(244,242,236,0.5)] border-white/10'}`}>
                      3. Delivered
                    </div>
                    <div className={`py-1.5 rounded-xl border ${req.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-800 border-emerald-200' : 'bg-[#12141c] text-[rgba(244,242,236,0.5)] border-white/10'}`}>
                      4. Completed
                    </div>
                  </div>
                </div>

                {/* CLARIFICATION NEEDED ALERT */}
                {req.status === 'CLARIFICATION_REQUIRED' && req.clarificationRequest && (
                  <div className="bg-primary/10 p-5 rounded-2xl border border-primary/30 space-y-3">
                    <div className="flex items-center gap-2 text-primary font-extrabold text-xs">
                      <HelpCircle className="h-4 w-4" />
                      <span>Creator Requested Additional Information</span>
                    </div>
                    <p className="text-xs text-[#F4F2EC] font-medium bg-[#12141c] p-3 rounded-xl border border-primary/20">
                      "{req.clarificationRequest.message}"
                    </p>
                    <Button onClick={() => { setSelectedReqId(req.id); setShowClarificationModal(true) }} size="sm" className="bg-primary hover:bg-primary text-white rounded-xl text-xs font-bold gap-1">
                      Respond to Clarification
                    </Button>
                  </div>
                )}

                {/* LATEST DELIVERABLE DOWNLOAD & ACTION BUTTONS */}
                {req.deliveries?.length > 0 && (
                  <div className="bg-primary/10 p-5 rounded-2xl border border-primary/20 space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black uppercase text-primary">Latest Deliverable (Submission #{req.deliveries.length})</span>
                      <span className="text-[11px] text-[rgba(244,242,236,0.5)] font-bold">{new Date(req.deliveries[req.deliveries.length - 1].deliveredAt).toLocaleString()}</span>
                    </div>

                    {req.deliveries[req.deliveries.length - 1].message && (
                      <p className="text-xs text-[#F4F2EC] bg-[#12141c] p-3 rounded-xl border border-primary/20 font-medium">
                        {req.deliveries[req.deliveries.length - 1].message}
                      </p>
                    )}

                    {req.deliveries[req.deliveries.length - 1].files?.length > 0 && (
                      <div className="flex flex-wrap gap-2 text-xs">
                        {req.deliveries[req.deliveries.length - 1].files.map((f, fi) => (
                          <a key={fi} href={f.url} target="_blank" rel="noreferrer" className="px-4 py-2 bg-[#12141c] text-primary rounded-xl border border-primary/30 font-extrabold shadow-xs flex items-center gap-2 hover:underline">
                            <Download className="h-4 w-4" /> Download {f.name || 'Deliverable File'}
                          </a>
                        ))}
                      </div>
                    )}

                    {/* ACCEPT / REVISION ACTIONS */}
                    {req.status === 'DELIVERED' && (
                      <div className="flex flex-wrap items-center gap-3 pt-2">
                        <Button onClick={() => handleAcceptDelivery(req.id)} className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-md gap-1">
                          <Check className="h-4 w-4" /> Accept Delivery & Complete
                        </Button>
                        
                        {canRequestRevision && (
                          <Button variant="outline" onClick={() => { setSelectedReqId(req.id); setShowRevisionModal(true) }} className="rounded-xl text-xs font-bold gap-1 text-amber-700 border-amber-200 hover:bg-amber-50">
                            <RefreshCw className="h-4 w-4" /> Request Revision ({req.usedRevisions || 0}/{limit < 0 ? '∞' : limit})
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* SUBMITTED REQUIREMENTS PREVIEW */}
                {req.answers?.length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-white/10">
                    <span className="text-[11px] font-black uppercase text-[rgba(244,242,236,0.5)]">Your Submitted Requirements</span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      {req.answers.map((ans, i) => (
                        <div key={i} className="p-3 bg-[#12141c] rounded-xl border border-white/10 space-y-0.5">
                          <span className="font-bold text-[rgba(244,242,236,0.5)] text-[10px]">{ans.questionText || `Field #${i + 1}`}</span>
                          <div className="font-extrabold text-[#F4F2EC] truncate">{ans.answer || ans.value || 'N/A'}</div>
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

      {/* REVISION MODAL */}
      {showRevisionModal && (
        <div className="fixed inset-0 bg-[#0A0A0A] flex items-center justify-center p-4 z-50">
          <div className="bg-[#12141c] rounded-3xl p-6 sm:p-8 max-w-lg w-full space-y-4 shadow-2xl">
            <h3 className="text-lg font-black text-[#F4F2EC]">Request Service Revision</h3>
            <p className="text-xs text-[rgba(244,242,236,0.68)] font-medium">Describe what specific changes or improvements you would like the creator to make.</p>

            <form onSubmit={handleSubmitRevision} className="space-y-4">
              <Textarea
                required
                value={revisionMsg}
                onChange={e => setRevisionMsg(e.target.value)}
                rows={4}
                placeholder="e.g. Please focus more on ATS keywords in the experience section and improve the project impact bullet points..."
                className="text-xs rounded-xl"
              />

              <div className="flex items-center justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setShowRevisionModal(false)} className="rounded-xl text-xs font-bold">
                  Cancel
                </Button>
                <Button type="submit" disabled={actionLoading} className="bg-primary hover:bg-primary text-white text-xs font-extrabold rounded-xl">
                  {actionLoading ? 'Submitting...' : 'Submit Revision Request'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CLARIFICATION RESPONSE MODAL */}
      {showClarificationModal && (
        <div className="fixed inset-0 bg-[#0A0A0A] flex items-center justify-center p-4 z-50">
          <div className="bg-[#12141c] rounded-3xl p-6 sm:p-8 max-w-lg w-full space-y-4 shadow-2xl">
            <h3 className="text-lg font-black text-[#F4F2EC]">Respond to Creator Clarification</h3>
            <p className="text-xs text-[rgba(244,242,236,0.68)] font-medium">Provide the requested details to allow the creator to resume work on your deliverable.</p>

            <form onSubmit={handleSubmitClarificationResponse} className="space-y-4">
              <Textarea
                required
                value={clarificationMsg}
                onChange={e => setClarificationMsg(e.target.value)}
                rows={4}
                placeholder="Enter your response to the creator's question..."
                className="text-xs rounded-xl"
              />

              <div className="flex items-center justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setShowClarificationModal(false)} className="rounded-xl text-xs font-bold">
                  Cancel
                </Button>
                <Button type="submit" disabled={actionLoading} className="bg-primary hover:bg-primary text-white text-xs font-extrabold rounded-xl">
                  {actionLoading ? 'Sending...' : 'Send Clarification Response'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}
