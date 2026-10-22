'use client'

import React, { useState } from 'react'
import { X, Download, Send, CheckCircle2, AlertCircle, Mail, Phone, Globe, Building2, User, Sparkles } from 'lucide-react'

export default function PublicContactModal({
  isOpen,
  onClose,
  store,
  profile,
  username,
}) {
  const card = store?.theme?.businessCard || {}
  const contactDetails = card.contactDetails || {}
  const allowContactShare = Boolean(card.allowContactShare)

  const hasContactDetails = Boolean(
    contactDetails.fullName ||
    contactDetails.email ||
    contactDetails.phone ||
    contactDetails.website ||
    contactDetails.organization
  )

  const [activeTab, setActiveTab] = useState(
    hasContactDetails ? 'save' : (allowContactShare ? 'share' : 'save')
  )

  const [visitorForm, setVisitorForm] = useState({
    name: '',
    email: '',
    phone: '',
    message: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState(null)

  if (!isOpen) return null

  const creatorName = card.displayName || profile?.name || store?.storeName || username || 'Creator'

  async function handleVisitorSubmit(e) {
    e.preventDefault()
    if (!visitorForm.email.trim()) {
      setError('Please provide an email address')
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      const res = await fetch('/api/business-card/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creatorId: store?.creatorId,
          username: store?.username || username,
          name: visitorForm.name.trim(),
          email: visitorForm.email.trim(),
          phone: visitorForm.phone.trim(),
          message: visitorForm.message.trim(),
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.message || data.error || 'Failed to submit contact')
      }

      setSubmitted(true)
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  function handleDownloadVCard() {
    const slug = store?.username || store?.slug || username
    const url = `/api/business-card/vcard?username=${encodeURIComponent(slug)}`
    window.location.href = url
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md bg-[#18181B] text-[#FFFFFF] rounded-[28px] border border-white/10 shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-3">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-white/10 flex items-center justify-center text-white">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight leading-none">
                {creatorName}
              </h3>
              <p className="text-xs text-zinc-400 mt-1">Digital Contact Card</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tabs if both save & share are available */}
        {hasContactDetails && allowContactShare && (
          <div className="flex px-6 pt-2 pb-1 border-b border-white/10 gap-2">
            <button
              type="button"
              onClick={() => { setActiveTab('save'); setError(null) }}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-colors ${
                activeTab === 'save'
                  ? 'bg-white text-black'
                  : 'text-zinc-400 hover:text-white hover:bg-white/5'
              }`}
            >
              Save Contact
            </button>
            <button
              type="button"
              onClick={() => { setActiveTab('share'); setError(null) }}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-colors ${
                activeTab === 'share'
                  ? 'bg-white text-black'
                  : 'text-zinc-400 hover:text-white hover:bg-white/5'
              }`}
            >
              Share Your Details
            </button>
          </div>
        )}

        {/* Tab Content: Save Contact */}
        {activeTab === 'save' && hasContactDetails && (
          <div className="p-6 space-y-4">
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
              {contactDetails.fullName && (
                <div className="flex items-center gap-3 text-sm">
                  <User className="h-4 w-4 text-zinc-400 shrink-0" />
                  <span className="font-semibold text-white">{contactDetails.fullName}</span>
                </div>
              )}
              {contactDetails.title && (
                <div className="flex items-center gap-3 text-xs text-zinc-300">
                  <Building2 className="h-4 w-4 text-zinc-400 shrink-0" />
                  <span>
                    {contactDetails.title}
                    {contactDetails.organization ? ` at ${contactDetails.organization}` : ''}
                  </span>
                </div>
              )}
              {contactDetails.email && (
                <div className="flex items-center gap-3 text-xs text-zinc-300">
                  <Mail className="h-4 w-4 text-zinc-400 shrink-0" />
                  <a href={`mailto:${contactDetails.email}`} className="text-white hover:underline truncate">
                    {contactDetails.email}
                  </a>
                </div>
              )}
              {contactDetails.phone && (
                <div className="flex items-center gap-3 text-xs text-zinc-300">
                  <Phone className="h-4 w-4 text-zinc-400 shrink-0" />
                  <a href={`tel:${contactDetails.phone}`} className="text-white hover:underline">
                    {contactDetails.phone}
                  </a>
                </div>
              )}
              {contactDetails.website && (
                <div className="flex items-center gap-3 text-xs text-zinc-300">
                  <Globe className="h-4 w-4 text-zinc-400 shrink-0" />
                  <a href={contactDetails.website} target="_blank" rel="noreferrer" className="text-white hover:underline truncate">
                    {contactDetails.website}
                  </a>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={handleDownloadVCard}
              className="w-full py-3.5 px-4 rounded-2xl bg-white text-black text-sm font-bold hover:bg-zinc-200 transition-colors flex items-center justify-center gap-2 shadow-lg"
            >
              <Download className="h-4.5 w-4.5" />
              <span>Save Contact to Phone</span>
            </button>
            <p className="text-[11px] text-zinc-400 text-center">
              Downloads a vCard (.vcf) file compatible with Apple iOS, Android, and desktop contacts.
            </p>
          </div>
        )}

        {/* Tab Content: Share Your Details Back */}
        {activeTab === 'share' && allowContactShare && (
          <div className="p-6">
            {submitted ? (
              <div className="text-center py-6 space-y-3">
                <div className="mx-auto h-12 w-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <CheckCircle2 className="h-7 w-7" />
                </div>
                <h4 className="text-base font-bold text-white">Contact Sent!</h4>
                <p className="text-xs text-zinc-400 max-w-xs mx-auto">
                  Thank you! Your details have been shared with {creatorName}.
                </p>
                <button
                  type="button"
                  onClick={onClose}
                  className="mt-4 px-5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold text-white transition-colors"
                >
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={handleVisitorSubmit} className="space-y-3">
                <p className="text-xs text-zinc-300 mb-2">
                  Leave your details so {creatorName} can connect with you.
                </p>

                {error && (
                  <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-400 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <div>
                  <input
                    type="text"
                    value={visitorForm.name}
                    onChange={(e) => setVisitorForm((p) => ({ ...p, name: e.target.value }))}
                    placeholder="Your Name"
                    maxLength={100}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-white/10 bg-white/5 text-sm text-white placeholder:text-zinc-500 focus:bg-white/10 focus:border-white/30 outline-none transition-all"
                  />
                </div>

                <div>
                  <input
                    type="email"
                    required
                    value={visitorForm.email}
                    onChange={(e) => setVisitorForm((p) => ({ ...p, email: e.target.value }))}
                    placeholder="Your Email *"
                    maxLength={120}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-white/10 bg-white/5 text-sm text-white placeholder:text-zinc-500 focus:bg-white/10 focus:border-white/30 outline-none transition-all"
                  />
                </div>

                <div>
                  <input
                    type="tel"
                    value={visitorForm.phone}
                    onChange={(e) => setVisitorForm((p) => ({ ...p, phone: e.target.value }))}
                    placeholder="Phone Number (optional)"
                    maxLength={30}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-white/10 bg-white/5 text-sm text-white placeholder:text-zinc-500 focus:bg-white/10 focus:border-white/30 outline-none transition-all"
                  />
                </div>

                <div>
                  <textarea
                    value={visitorForm.message}
                    onChange={(e) => setVisitorForm((p) => ({ ...p, message: e.target.value }))}
                    placeholder="Brief Message or Note (optional)"
                    rows={2}
                    maxLength={500}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-white/10 bg-white/5 text-sm text-white placeholder:text-zinc-500 focus:bg-white/10 focus:border-white/30 outline-none transition-all resize-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3 px-4 rounded-xl bg-white text-black text-sm font-bold hover:bg-zinc-200 transition-colors flex items-center justify-center gap-2 shadow-lg disabled:opacity-50 mt-4 cursor-pointer"
                >
                  <Send className="h-4 w-4" />
                  <span>{submitting ? 'Sending...' : 'Send Details'}</span>
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
