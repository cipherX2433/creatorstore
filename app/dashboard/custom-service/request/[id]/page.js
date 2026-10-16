'use client'

import { useEffect, useState, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { api } from '@/lib/clientApi'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import {
  Sparkles, ArrowLeft, Clock, CheckCircle2, AlertCircle, FileText, Upload, Send,
  Lock, MessageSquare, RefreshCw, Download, ExternalLink, HelpCircle
} from 'lucide-react'

export default function CreatorRequestWorkspacePage({ params }) {
  const resolvedParams = use(params)
  const requestId = resolvedParams.id
  const router = useRouter()

  const [req, setReq] = useState(null)
  const [loading, setLoading] = useState(true)
  const [savingNotes, setSavingNotes] = useState(false)
  const [submittingDelivery, setSubmittingDelivery] = useState(false)
  const [submittingClarification, setSubmittingClarification] = useState(false)

  // Internal Notes State
  const [internalNotes, setInternalNotes] = useState('')

  // Deliverable Submission State
  const [deliveryMessage, setDeliveryMessage] = useState('')
  const [deliveryFileUrl, setDeliveryFileUrl] = useState('')
  const [deliveryFileName, setDeliveryFileName] = useState('')

  // Clarification Modal State
  const [clarificationMsg, setClarificationMsg] = useState('')
  const [showClarificationModal, setShowClarificationModal] = useState(false)

  useEffect(() => {
    if (!requestId) return
    loadRequestData()
  }, [requestId])

  function loadRequestData() {
    setLoading(true)
    api.get(`/custom-service/creator/requests/${requestId}`)
      .then((res) => {
        if (res.request) {
          setReq(res.request)
          setInternalNotes(res.request.internalNotes || '')
        }
        setLoading(false)
      })
      .catch((err) => {
        toast.error(err.message || 'Failed to load request')
        setLoading(false)
      })
  }

  async function handleSaveNotes() {
    setSavingNotes(true)
    try {
      await api.post('/custom-service/creator/notes', {
        requestId,
        internalNotes,
      })
      toast.success('Internal notes saved!')
      setSavingNotes(false)
    } catch (err) {
      toast.error(err.message || 'Failed to save notes')
      setSavingNotes(false)
    }
  }

  async function handleSubmitClarification(e) {
    e.preventDefault()
    if (!clarificationMsg.trim()) return
    setSubmittingClarification(true)
    try {
      await api.post('/custom-service/creator/clarification', {
        requestId,
        message: clarificationMsg,
      })
      toast.success('Clarification requested from client!')
      setShowClarificationModal(false)
      setClarificationMsg('')
      loadRequestData()
    } catch (err) {
      toast.error(err.message || 'Failed to send clarification request')
    } finally {
      setSubmittingClarification(false)
    }
  }

  async function handleSubmitDelivery(e) {
    e.preventDefault()
    if (!deliveryMessage.trim() && !deliveryFileUrl.trim()) {
      toast.error('Please provide a message or deliverable file link.')
      return
    }

    setSubmittingDelivery(true)
    try {
      const files = deliveryFileUrl ? [{ name: deliveryFileName || 'Deliverable_File', url: deliveryFileUrl }] : []
      await api.post('/custom-service/creator/delivery', {
        requestId,
        message: deliveryMessage,
        files,
      })
      toast.success('Deliverable submitted to client! 🎉')
      setDeliveryMessage('')
      setDeliveryFileUrl('')
      setDeliveryFileName('')
      loadRequestData()
    } catch (err) {
      toast.error(err.message || 'Failed to submit delivery')
    } finally {
      setSubmittingDelivery(false)
    }
  }

  async function handleStatusChange(newStatus) {
    try {
      await api.post('/custom-service/creator/status', {
        requestId,
        status: newStatus,
      })
      toast.success(`Order status updated to ${newStatus}`)
      loadRequestData()
    } catch (err) {
      toast.error(err.message || 'Failed to update status')
    }
  }

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto p-6 space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-96 w-full rounded-3xl" />
      </div>
    )
  }

  if (!req) {
    return (
      <div className="max-w-4xl mx-auto p-12 text-center text-[#666666]">
        Service request not found.
      </div>
    )
  }

  const dueStr = new Date(req.dueAt).toLocaleDateString()
  const isOverdue = new Date(req.dueAt).getTime() < Date.now() && req.status !== 'COMPLETED' && req.status !== 'DELIVERED'

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6 space-y-8 font-sans text-[#010619]">
      
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#D8DFFA] pb-5">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/custom-service">
            <Button variant="ghost" size="sm" className="rounded-xl text-[#666666] hover:text-[#010619] hover:bg-[#E8EDFB]">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className={`text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full ${
                req.status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                req.status === 'DELIVERED' ? 'bg-primary/10 text-primary border border-primary/20' :
                req.status === 'REVISION_REQUESTED' ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-[#EEF1FB] text-[#010619] border border-[#D8DFFA]'
              }`}>
                {req.status}
              </span>
              <span className={`text-xs font-semibold ${isOverdue ? 'text-red-600 font-bold' : 'text-[#666666]'}`}>
                Due: {dueStr}
              </span>
            </div>
            <h1 className="text-2xl font-bold text-[#010619] tracking-tight mt-0.5">
              Client: {req.customerName} ({req.customerEmail})
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={req.status}
            onChange={(e) => handleStatusChange(e.target.value)}
            className="h-9 rounded-xl border border-[#D8DFFA] text-xs font-semibold px-3 bg-white text-[#010619] focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="SUBMITTED">Submitted</option>
            <option value="REQUIREMENTS_RECEIVED">Requirements Received</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="CLARIFICATION_REQUIRED">Clarification Required</option>
            <option value="DELIVERED">Delivered</option>
            <option value="REVISION_REQUESTED">Revision Requested</option>
            <option value="COMPLETED">Completed</option>
            <option value="CANCELLED">Cancelled</option>
          </select>

          <Button variant="outline" onClick={() => setShowClarificationModal(true)} className="rounded-xl text-xs font-semibold gap-1 text-primary border-primary/30 bg-white hover:bg-primary/5 cursor-pointer">
            <HelpCircle className="h-4 w-4" /> Request Clarification
          </Button>
        </div>
      </div>

      {/* REVISION REQUEST ALERT */}
      {req.status === 'REVISION_REQUESTED' && req.revisionRequest && (
        <div className="bg-amber-50 p-5 rounded-2xl border border-amber-200 space-y-2">
          <div className="flex items-center gap-2 text-amber-900 font-bold text-sm">
            <RefreshCw className="h-4 w-4 text-amber-600" />
            <span>Revision Requested by Client (#{req.usedRevisions})</span>
          </div>
          <p className="text-xs text-amber-800 font-medium bg-white p-3 rounded-xl border border-amber-200">
            "{req.revisionRequest.message}"
          </p>
        </div>
      )}

      {/* MAIN TWO-COLUMN WORKSPACE */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN: CUSTOMER REQUIREMENTS & ANSWERS (5 Cols) */}
        <div className="lg:col-span-5 space-y-6">
          
          <div className="bg-white rounded-2xl p-6 border border-[#D8DFFA] shadow-xs space-y-4">
            <div className="border-b border-[#D8DFFA] pb-3">
              <h3 className="text-base font-bold text-[#010619] flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" /> Submitted Requirements
              </h3>
              <p className="text-xs text-[#666666] font-medium">Information provided by client.</p>
            </div>

            {req.answers?.length === 0 ? (
              <div className="text-xs text-[#666666] py-4 text-center">No intake form answers recorded.</div>
            ) : (
              <div className="space-y-4 text-xs">
                {req.answers.map((ans, i) => (
                  <div key={ans.questionId || i} className="p-3.5 bg-[#EEF1FB] rounded-xl border border-[#D8DFFA] space-y-1">
                    <span className="font-bold text-[#010619] block">{ans.questionText || `Field #${i + 1}`}</span>
                    <div className="text-[#010619] font-medium">{ans.answer || ans.value || 'N/A'}</div>

                    {/* Files attached */}
                    {ans.files?.length > 0 && (
                      <div className="pt-2 space-y-1">
                        <span className="text-[10px] font-semibold text-[#666666] uppercase">Attached Files:</span>
                        {ans.files.map((f, fi) => (
                          <a key={fi} href={f.url} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-primary font-semibold hover:underline">
                            <Download className="h-3.5 w-3.5" /> {f.name || 'View File'}
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* PRIVATE CREATOR INTERNAL NOTES */}
          <div className="bg-white rounded-2xl p-6 border border-[#D8DFFA] shadow-xs space-y-4">
            <div className="border-b border-[#D8DFFA] pb-3 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-[#010619] flex items-center gap-1.5">
                  <Lock className="h-4 w-4 text-primary" /> Creator Internal Notes
                </h3>
                <p className="text-xs text-[#666666] font-medium">Private notes — never visible to client.</p>
              </div>
              <Button size="sm" onClick={handleSaveNotes} disabled={savingNotes} className="bg-[#010619] hover:bg-[#333333] text-white rounded-xl text-xs font-semibold cursor-pointer">
                {savingNotes ? 'Saving...' : 'Save Notes'}
              </Button>
            </div>

            <Textarea
              value={internalNotes}
              onChange={e => setInternalNotes(e.target.value)}
              rows={4}
              placeholder="Add key insights, candidate metrics, or internal notes..."
              className="text-xs rounded-xl border-[#D8DFFA] bg-white text-[#010619]"
            />
          </div>

        </div>

        {/* RIGHT COLUMN: WORK AREA & DELIVERABLE SUBMISSION (7 Cols) */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* UPLOAD DELIVERABLE FORM */}
          <div className="bg-white rounded-2xl p-6 sm:p-8 border border-[#D8DFFA] shadow-xs space-y-5">
            <div className="border-b border-[#D8DFFA] pb-3">
              <h3 className="text-base font-bold text-[#010619] flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" /> Submit Deliverable Work
              </h3>
              <p className="text-xs text-[#666666] font-medium">Upload final work files or paste text response for the client.</p>
            </div>

            <form onSubmit={handleSubmitDelivery} className="space-y-4 text-xs">
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-[#010619]">Deliverable Response / Review Notes</Label>
                <Textarea
                  value={deliveryMessage}
                  onChange={e => setDeliveryMessage(e.target.value)}
                  rows={5}
                  placeholder="Provide your main review feedback, findings, or message to the client..."
                  className="text-xs rounded-xl border-[#D8DFFA] bg-white text-[#010619]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-[#010619]">Deliverable File Name</Label>
                  <Input
                    value={deliveryFileName}
                    onChange={e => setDeliveryFileName(e.target.value)}
                    placeholder="e.g. Final_Resume_Review.pdf"
                    className="h-10 text-xs rounded-xl border-[#D8DFFA] bg-white text-[#010619]"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-[#010619]">File Download URL</Label>
                  <Input
                    value={deliveryFileUrl}
                    onChange={e => setDeliveryFileUrl(e.target.value)}
                    placeholder="https://..."
                    className="h-10 text-xs rounded-xl border-[#D8DFFA] bg-white text-[#010619]"
                  />
                </div>
              </div>

              <Button type="submit" disabled={submittingDelivery} className="w-full h-11 bg-primary hover:bg-primary/90 text-white font-bold text-xs rounded-xl shadow-xs gap-2 cursor-pointer">
                <Send className="h-4 w-4" /> {submittingDelivery ? 'Submitting...' : 'Submit Delivery to Client'}
              </Button>
            </form>
          </div>

          {/* DELIVERY HISTORY LOG */}
          {req.deliveries?.length > 0 && (
            <div className="bg-white rounded-2xl p-6 border border-[#D8DFFA] shadow-xs space-y-4">
              <div className="border-b border-[#D8DFFA] pb-3">
                <h3 className="text-base font-bold text-[#010619]">Delivery History ({req.deliveries.length})</h3>
              </div>

              <div className="space-y-3 divide-y divide-[#D8DFFA]">
                {req.deliveries.map((del, i) => (
                  <div key={del.id || i} className="pt-3 first:pt-0 space-y-2 text-xs">
                    <div className="flex items-center justify-between font-bold text-[#010619]">
                      <span>Delivery #{del.revisionNumber || i + 1}</span>
                      <span className="text-[#666666] text-[11px] font-normal">{new Date(del.deliveredAt).toLocaleString()}</span>
                    </div>

                    {del.message && <p className="text-[#010619] bg-[#EEF1FB] p-3 rounded-xl border border-[#D8DFFA]">{del.message}</p>}

                    {del.files?.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {del.files.map((f, fi) => (
                          <a key={fi} href={f.url} target="_blank" rel="noreferrer" className="px-3 py-1.5 bg-primary/10 text-primary rounded-xl border border-primary/20 font-semibold flex items-center gap-1.5">
                            <Download className="h-3.5 w-3.5" /> {f.name || 'File'}
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

      </div>

      {/* CLARIFICATION MODAL */}
      {showClarificationModal && (
        <div className="fixed inset-0 bg-black/45 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 sm:p-8 max-w-lg w-full space-y-4 shadow-xl border border-[#D8DFFA]">
            <h3 className="text-lg font-bold text-[#010619]">Request Clarification from Client</h3>
            <p className="text-xs text-[#666666] font-medium">Explain what additional information or file version you need from the client.</p>

            <form onSubmit={handleSubmitClarification} className="space-y-4">
              <Textarea
                required
                value={clarificationMsg}
                onChange={e => setClarificationMsg(e.target.value)}
                rows={4}
                placeholder="e.g. Please re-upload your resume as a clear PDF and specify which target companies you want ATS feedback on..."
                className="text-xs rounded-xl border-[#D8DFFA] bg-white text-[#010619]"
              />

              <div className="flex items-center justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setShowClarificationModal(false)} className="rounded-xl text-xs font-medium border-[#D8DFFA] bg-white hover:bg-[#E8EDFB] text-[#010619]">
                  Cancel
                </Button>
                <Button type="submit" disabled={submittingClarification} className="bg-primary hover:bg-primary/90 text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer">
                  {submittingClarification ? 'Sending...' : 'Send Clarification Request'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}
