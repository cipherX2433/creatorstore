'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/clientApi'
import { toast } from 'sonner'
import {
  Mail, Send, Users, Sparkles, Loader2, AlertCircle, RefreshCw,
  CheckCircle2, Eye, EyeOff, RotateCcw, X, Info, FileText, ArrowRight
} from 'lucide-react'
import { useDashboardHeader } from '@/components/dashboard/HeaderContext'

const AUDIENCE_OPTIONS = [
  { value: 'ALL_CUSTOMERS', label: 'All Customers & Leads', desc: 'All past buyers and lead magnet contacts' },
  { value: 'CUSTOMERS', label: 'Customers Only', desc: 'People who have purchased products' },
  { value: 'LEADS', label: 'Lead Magnet Subscribers', desc: 'Contacts captured from free lead magnets' },
  { value: 'COURSE_BUYERS', label: 'Course Buyers Only', desc: 'Students enrolled in courses' },
]

export default function CreatorEmailBroadcastsPage() {
  const router = useRouter()
  const { setHeaderConfig } = useDashboardHeader()

  // State
  const [broadcasts, setBroadcasts] = useState([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [testing, setTesting] = useState(false)
  const [audienceCount, setAudienceCount] = useState(0)
  const [loadingAudience, setLoadingAudience] = useState(false)
  const [previewMode, setPreviewMode] = useState(false)

  // Modals
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [showTestModal, setShowTestModal] = useState(false)
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  const [testEmailAddress, setTestEmailAddress] = useState('')

  // Form
  const [form, setForm] = useState({
    name: '',
    subject: '',
    content: '',
    audience: 'ALL_CUSTOMERS',
  })

  useEffect(() => {
    setHeaderConfig({
      title: 'Email Broadcasts',
      actions: null,
    })
  }, [setHeaderConfig])

  useEffect(() => {
    fetchBroadcasts()
  }, [])

  useEffect(() => {
    fetchAudienceEstimate(form.audience)
  }, [form.audience])

  function fetchBroadcasts() {
    setLoading(true)
    api.get('/email/broadcasts')
      .then((res) => setBroadcasts(res.broadcasts || []))
      .catch((err) => {
        console.error('Failed to load broadcasts:', err)
        toast.error('Failed to load campaign history')
      })
      .finally(() => setLoading(false))
  }

  async function fetchAudienceEstimate(segment) {
    setLoadingAudience(true)
    try {
      const res = await api.get(`/email/audience-estimate?segment=${encodeURIComponent(segment)}`)
      setAudienceCount(res.count !== undefined ? res.count : 0)
    } catch (e) {
      setAudienceCount(0)
    } finally {
      setLoadingAudience(false)
    }
  }

  function handleOpenConfirm(e) {
    e.preventDefault()
    if (!form.subject.trim()) return toast.error('Subject line is required')
    if (!form.content.trim()) return toast.error('Email message content is required')
    setShowConfirmModal(true)
  }

  async function handleSendCampaign() {
    setSending(true)
    try {
      const res = await api.post('/email/broadcasts', {
        name: form.name.trim() || form.subject.trim(),
        subject: form.subject.trim(),
        content: form.content.trim(),
        audience: form.audience,
      })
      toast.success(`Campaign sent to ${res.broadcast?.sentCount || audienceCount} recipients!`)
      setForm({ name: '', subject: '', content: '', audience: 'ALL_CUSTOMERS' })
      setShowConfirmModal(false)
      setPreviewMode(false)
      fetchBroadcasts()
    } catch (err) {
      console.error('Send broadcast error:', err)
      if (err.status === 403 || err.message?.includes('Pro plan') || err.message?.includes('Upgrade')) {
        setShowConfirmModal(false)
        setShowUpgradeModal(true)
      } else {
        toast.error(err.message || 'Unable to send campaign. Please try again later.')
      }
    } finally {
      setSending(false)
    }
  }

  async function handleSendTestEmail(e) {
    e.preventDefault()
    if (!testEmailAddress.trim() || !testEmailAddress.includes('@')) {
      return toast.error('Please enter a valid test email address')
    }
    if (!form.subject.trim() || !form.content.trim()) {
      return toast.error('Subject and content are required to send a test')
    }

    setTesting(true)
    try {
      await api.post('/email/test', {
        testEmail: testEmailAddress.trim(),
        subject: form.subject.trim(),
        content: form.content.trim(),
      })
      toast.success(`Test email sent to ${testEmailAddress}`)
      setShowTestModal(false)
    } catch (err) {
      console.error('Send test error:', err)
      if (err.status === 403 || err.message?.includes('Pro plan') || err.message?.includes('Upgrade')) {
        setShowTestModal(false)
        setShowUpgradeModal(true)
      } else {
        toast.error(err.message || 'Failed to send test email')
      }
    } finally {
      setTesting(false)
    }
  }

  const selectedAudienceLabel = AUDIENCE_OPTIONS.find(a => a.value === form.audience)?.label || form.audience

  return (
    <div className="max-w-5xl mx-auto space-y-8 text-[#1F1F1F]">
      
      {/* HEADER */}
      <div className="bg-[#FFFFFF] p-6 rounded-2xl border border-[#E5E5E3] shadow-[0_8px_30px_rgba(0,0,0,0.04)]">
        <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#1F1F1F] bg-[#F5F5F3] px-3 py-1 rounded-full border border-[#E5E5E3] mb-1.5">
          <Sparkles className="h-3.5 w-3.5 text-[#1F1F1F]" /> Email Broadcasts
        </div>
        <h1 className="text-xl font-bold text-[#1F1F1F] tracking-tight">
          Email Broadcasts
        </h1>
        <p className="text-xs sm:text-sm text-[#6F6F6B] font-medium mt-0.5">
          Send newsletters, product announcements, and updates to your audience.
        </p>
      </div>

      {/* CAMPAIGN COMPOSER */}
      <div className="bg-[#FFFFFF] rounded-2xl border border-[#E5E5E3] p-6 sm:p-7 shadow-[0_8px_30px_rgba(0,0,0,0.04)] space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-[#E5E5E3]">
          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-[#1F1F1F]" />
            <h2 className="text-base font-bold text-[#1F1F1F]">
              Create Campaign
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPreviewMode(!previewMode)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors flex items-center gap-1.5 cursor-pointer ${
                previewMode
                  ? 'bg-[#1F1F1F] text-[#FFFFFF] border-[#1F1F1F]'
                  : 'bg-[#FFFFFF] text-[#6F6F6B] hover:text-[#1F1F1F] hover:bg-[#F5F5F3] border-[#E5E5E3]'
              }`}
            >
              {previewMode ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              <span>{previewMode ? 'Edit Mode' : 'Preview'}</span>
            </button>
          </div>
        </div>

        {previewMode ? (
          /* PREVIEW CANVAS */
          <div className="p-6 rounded-xl bg-[#FBFBFB] border border-[#E5E5E3] space-y-4">
            <div className="space-y-1 pb-3 border-b border-[#E5E5E3]">
              <span className="text-[10px] uppercase font-bold text-[#6F6F6B]">
                Email Subject Preview
              </span>
              <h3 className="text-base font-bold text-[#1F1F1F]">
                {form.subject || '(No subject provided)'}
              </h3>
              <div className="text-xs text-[#6F6F6B]">
                Audience: <strong className="text-[#1F1F1F]">{selectedAudienceLabel}</strong> ({audienceCount} recipients)
              </div>
            </div>

            <div className="text-sm text-[#1F1F1F] whitespace-pre-wrap leading-relaxed py-2">
              {form.content || '(No message content written yet)'}
            </div>
          </div>
        ) : (
          /* FORM FIELDS */
          <form onSubmit={handleOpenConfirm} className="space-y-5">
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Campaign Internal Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-[#6F6F6B]">
                  Campaign Name (Optional)
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. September Community Newsletter"
                  className="w-full text-xs bg-[#FFFFFF] border border-[#E5E5E3] rounded-xl px-3.5 py-2.5 text-[#1F1F1F] placeholder:text-[#999995] focus:outline-none focus:border-[#1F1F1F] transition-colors"
                />
              </div>

              {/* Audience Selector */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-[#6F6F6B]">
                  Target Audience
                </label>
                <select
                  value={form.audience}
                  onChange={(e) => setForm({ ...form, audience: e.target.value })}
                  className="w-full text-xs bg-[#FFFFFF] border border-[#E5E5E3] rounded-xl px-3.5 py-2.5 text-[#1F1F1F] focus:outline-none focus:border-[#1F1F1F] transition-colors"
                >
                  {AUDIENCE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Subject Line */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-[#6F6F6B]">
                Subject Line *
              </label>
              <input
                type="text"
                required
                value={form.subject}
                onChange={(e) => setForm({ ...form, subject: e.target.value })}
                placeholder="e.g. New Session Slots Open & Strategy Masterclass Announcement"
                className="w-full text-xs bg-[#FFFFFF] border border-[#E5E5E3] rounded-xl px-3.5 py-2.5 text-[#1F1F1F] placeholder:text-[#999995] focus:outline-none focus:border-[#1F1F1F] transition-colors"
              />
            </div>

            {/* Message Body */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold uppercase tracking-wider text-[#6F6F6B]">
                  Message Content *
                </label>
                <span className="text-[10px] font-mono text-[#6F6F6B]">
                  {form.content.length} characters
                </span>
              </div>
              <textarea
                rows={7}
                required
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
                placeholder="Write your email message here. Plain paragraphs and line breaks are formatted cleanly..."
                className="w-full text-xs bg-[#FFFFFF] border border-[#E5E5E3] rounded-xl p-3.5 text-[#1F1F1F] placeholder:text-[#999995] focus:outline-none focus:border-[#1F1F1F] transition-colors leading-relaxed"
              />
            </div>

            {/* BOTTOM BAR: ESTIMATED AUDIENCE & ACTIONS */}
            <div className="pt-3 border-t border-[#E5E5E3] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              
              {/* Audience Estimate Pill */}
              <div className="flex items-center gap-2 text-xs">
                <Users className="h-4 w-4 text-[#1F1F1F]" />
                <span className="text-[#6F6F6B]">
                  Estimated Audience:
                </span>
                <span className="font-bold text-[#1F1F1F] bg-[#F5F5F3] border border-[#E5E5E3] px-2 py-0.5 rounded-md">
                  {loadingAudience ? 'Calculating...' : `${audienceCount} recipients`}
                </span>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowTestModal(true)}
                  className="px-3.5 py-2 rounded-xl bg-[#FFFFFF] border border-[#E5E5E3] text-[#1F1F1F] hover:bg-[#F5F5F3] text-xs font-semibold transition-colors cursor-pointer"
                >
                  Send Test
                </button>

                <button
                  type="submit"
                  disabled={sending}
                  className="px-5 py-2 rounded-xl bg-[#1F1F1F] text-[#FFFFFF] text-xs font-semibold hover:bg-[#000000] disabled:opacity-50 transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <Send className="h-3.5 w-3.5" />
                  <span>Send Campaign</span>
                </button>
              </div>

            </div>

          </form>
        )}

      </div>

      {/* CAMPAIGN HISTORY SECTION */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-[#1F1F1F]">
              Campaign History
            </h2>
            <p className="text-xs text-[#6F6F6B] mt-0.5">
              Previous email broadcasts delivered to your subscribers.
            </p>
          </div>

          <button
            type="button"
            onClick={fetchBroadcasts}
            title="Refresh history"
            className="p-2 rounded-lg bg-[#FFFFFF] border border-[#E5E5E3] text-[#6F6F6B] hover:text-[#1F1F1F] hover:bg-[#F5F5F3] transition-colors cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin text-[#1F1F1F]' : ''}`} />
          </button>
        </div>

        {loading ? (
          <div className="space-y-3">
            <div className="h-16 bg-[#FFFFFF] border border-[#E5E5E3] rounded-xl animate-pulse" />
            <div className="h-16 bg-[#FFFFFF] border border-[#E5E5E3] rounded-xl animate-pulse" />
          </div>
        ) : broadcasts.length === 0 ? (
          <div className="p-10 rounded-2xl bg-[#FFFFFF] border border-dashed border-[#E5E5E3] text-center space-y-2">
            <Mail className="h-8 w-8 text-[#999995] mx-auto" />
            <h3 className="text-sm font-bold text-[#1F1F1F]">
              No campaigns sent yet
            </h3>
            <p className="text-xs text-[#6F6F6B] max-w-sm mx-auto">
              Compose your first campaign above to send announcements, product drops, or updates to your subscribers.
            </p>
          </div>
        ) : (
          <div className="bg-[#FFFFFF] border border-[#E5E5E3] rounded-2xl overflow-hidden shadow-[0_8px_30px_rgba(0,0,0,0.04)]">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#E5E5E3] bg-[#FBFBFB] text-[#6F6F6B] font-semibold uppercase tracking-wider text-[10px]">
                  <th className="py-3.5 px-5">Campaign & Subject</th>
                  <th className="py-3.5 px-5">Audience Segment</th>
                  <th className="py-3.5 px-5">Recipients</th>
                  <th className="py-3.5 px-5">Status</th>
                  <th className="py-3.5 px-5 text-right">Sent Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E5E3] font-medium text-[#1F1F1F]">
                {broadcasts.map((b) => (
                  <tr key={b.id} className="hover:bg-[#F5F5F3] transition-colors">
                    <td className="py-4 px-5">
                      <div className="font-bold text-[#1F1F1F] truncate max-w-xs sm:max-w-md">
                        {b.subject}
                      </div>
                      {b.name && b.name !== b.subject && (
                        <div className="text-[11px] text-[#6F6F6B] mt-0.5 truncate">
                          {b.name}
                        </div>
                      )}
                    </td>
                    <td className="py-4 px-5">
                      <span className="text-[11px] font-medium text-[#6F6F6B]">
                        {AUDIENCE_OPTIONS.find(a => a.value === b.audience)?.label || b.audience}
                      </span>
                    </td>
                    <td className="py-4 px-5">
                      <span className="font-mono text-xs font-bold text-[#1F1F1F]">
                        {b.sentCount || 0}
                      </span>
                    </td>
                    <td className="py-4 px-5">
                      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${
                        b.status === 'FAILED'
                          ? 'bg-[#DC2626]/10 text-[#DC2626] border-[#DC2626]/20'
                          : 'bg-[#16A34A]/10 text-[#16A34A] border-[#16A34A]/20'
                      }`}>
                        {b.status || 'SENT'}
                      </span>
                    </td>
                    <td className="py-4 px-5 text-right text-[#6F6F6B] font-mono text-[11px]">
                      {new Date(b.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* CONFIRMATION SEND MODAL */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/35 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-[#FFFFFF] border border-[#E5E5E3] rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.12)] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#E5E5E3] bg-[#FBFBFB]">
              <div className="flex items-center gap-2">
                <Send className="h-4 w-4 text-[#1F1F1F]" />
                <h3 className="text-base font-bold text-[#1F1F1F]">
                  Ready to send?
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="p-1 rounded-md text-[#6F6F6B] hover:text-[#1F1F1F] hover:bg-[#F5F5F3]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <p className="text-[#6F6F6B]">
                You are about to send an email broadcast campaign through CreatorStore.
              </p>

              <div className="p-4 rounded-xl bg-[#FBFBFB] border border-[#E5E5E3] space-y-2">
                <div>
                  <span className="text-[10px] uppercase font-bold text-[#6F6F6B] block">Subject:</span>
                  <span className="font-bold text-sm text-[#1F1F1F] block">{form.subject}</span>
                </div>
                <div className="pt-2 border-t border-[#E5E5E3] flex items-center justify-between">
                  <span className="text-[#6F6F6B]">Target Audience:</span>
                  <span className="font-bold text-[#1F1F1F]">{selectedAudienceLabel}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#6F6F6B]">Recipients:</span>
                  <span className="font-bold text-[#1F1F1F]">{audienceCount} subscribers</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end px-6 py-4 border-t border-[#E5E5E3] bg-[#FBFBFB] gap-2">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                disabled={sending}
                className="px-4 py-2 rounded-xl bg-[#FFFFFF] border border-[#E5E5E3] text-[#1F1F1F] text-xs font-semibold hover:bg-[#F5F5F3] transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSendCampaign}
                disabled={sending}
                className="px-5 py-2 rounded-xl bg-[#1F1F1F] text-[#FFFFFF] text-xs font-semibold hover:bg-[#000000] disabled:opacity-50 transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                {sending ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Sending Campaign...</span>
                  </>
                ) : (
                  <>
                    <Send className="h-3.5 w-3.5" />
                    <span>Send Campaign</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TEST EMAIL MODAL */}
      {showTestModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/35 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-[#FFFFFF] border border-[#E5E5E3] rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.12)] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#E5E5E3] bg-[#FBFBFB]">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-[#1F1F1F]" />
                <h3 className="text-base font-bold text-[#1F1F1F]">
                  Send Test Email
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowTestModal(false)}
                className="p-1 rounded-md text-[#6F6F6B] hover:text-[#1F1F1F] hover:bg-[#F5F5F3]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSendTestEmail} className="p-6 space-y-4 text-xs">
              <p className="text-[#6F6F6B]">
                Deliver a preview of this email broadcast to your inbox before broadcasting to all subscribers.
              </p>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-[#6F6F6B]">
                  Test Recipient Email
                </label>
                <input
                  type="email"
                  required
                  value={testEmailAddress}
                  onChange={(e) => setTestEmailAddress(e.target.value)}
                  placeholder="your.email@example.com"
                  className="w-full text-xs bg-[#FFFFFF] border border-[#E5E5E3] rounded-xl px-3.5 py-2.5 text-[#1F1F1F] placeholder:text-[#999995] focus:outline-none focus:border-[#1F1F1F] transition-colors"
                />
              </div>

              <div className="flex items-center justify-end pt-3 border-t border-[#E5E5E3] gap-2">
                <button
                  type="button"
                  onClick={() => setShowTestModal(false)}
                  disabled={testing}
                  className="px-4 py-2 rounded-xl bg-[#FFFFFF] border border-[#E5E5E3] text-[#1F1F1F] text-xs font-semibold hover:bg-[#F5F5F3] transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={testing}
                  className="px-5 py-2 rounded-xl bg-[#1F1F1F] text-[#FFFFFF] text-xs font-semibold hover:bg-[#000000] disabled:opacity-50 transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  {testing ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Sending Test...</span>
                    </>
                  ) : (
                    <span>Send Test</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PRO RESTRICTION UPGRADE MODAL */}
      {showUpgradeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/35 animate-in fade-in duration-200">
          <div className="relative w-full max-w-md bg-[#FFFFFF] border border-[#E5E5E3] rounded-3xl p-6 sm:p-8 space-y-6 text-[#1F1F1F] shadow-[0_20px_60px_rgba(0,0,0,0.12)]">
            <button
              onClick={() => setShowUpgradeModal(false)}
              className="absolute top-5 right-5 p-2 rounded-full bg-[#F5F5F3] text-[#6F6F6B] hover:text-[#1F1F1F] transition-colors border border-[#E5E5E3]"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="space-y-3">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider text-[#1F1F1F] bg-[#F5F5F3] border border-[#E5E5E3]">
                <Sparkles className="h-3.5 w-3.5" /> PRO FEATURE
              </span>
              <h3 className="text-2xl font-bold text-[#1F1F1F]">Feature requires Pro</h3>
              <p className="text-xs sm:text-sm text-[#6F6F6B] leading-relaxed">
                Sending marketing email broadcasts and test campaigns requires an active CreatorStore Pro plan (₹999/month).
              </p>
            </div>

            <div className="flex flex-col gap-3 pt-2">
              <button
                type="button"
                onClick={() => router.push('/pricing')}
                className="w-full h-11 bg-[#1F1F1F] hover:bg-[#000000] text-[#FFFFFF] font-bold text-xs sm:text-sm rounded-xl flex items-center justify-center gap-2 cursor-pointer shadow-xs transition-colors"
              >
                Upgrade to Pro <ArrowRight className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setShowUpgradeModal(false)}
                className="text-xs text-[#6F6F6B] hover:text-[#1F1F1F] font-medium py-1 cursor-pointer transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
