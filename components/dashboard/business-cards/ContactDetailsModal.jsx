'use client'

import React, { useState, useEffect } from 'react'
import { X, User, Briefcase, Building2, Mail, Phone, Globe, FileText, Check, AlertCircle } from 'lucide-react'

export default function ContactDetailsModal({
  isOpen,
  onClose,
  initialDetails = {},
  onSave,
}) {
  const [formData, setFormData] = useState({
    fullName: '',
    title: '',
    organization: '',
    email: '',
    phone: '',
    website: '',
    note: '',
  })
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setFormData({
        fullName: initialDetails?.fullName || '',
        title: initialDetails?.title || '',
        organization: initialDetails?.organization || '',
        email: initialDetails?.email || '',
        phone: initialDetails?.phone || '',
        website: initialDetails?.website || '',
        note: initialDetails?.note || '',
      })
      setErrors({})
    }
  }, [isOpen, initialDetails])

  if (!isOpen) return null

  function handleChange(field, val) {
    setFormData((prev) => ({ ...prev, [field]: val }))
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev }
        delete next[field]
        return next
      })
    }
  }

  function validate() {
    const errs = {}
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      errs.email = 'Please enter a valid email address'
    }
    if (formData.website) {
      const w = formData.website.trim()
      if (!w.startsWith('http://') && !w.startsWith('https://') && !w.includes('.')) {
        errs.website = 'Please enter a valid website URL'
      }
    }
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!validate()) return

    setSaving(true)
    try {
      await onSave({
        fullName: formData.fullName.trim(),
        title: formData.title.trim(),
        organization: formData.organization.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        website: formData.website.trim(),
        note: formData.note.trim(),
      })
      onClose()
    } catch (err) {
      setErrors((prev) => ({ ...prev, submit: err.message || 'Failed to save contact details' }))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-lg bg-[#FFFFFF] rounded-[24px] border border-[#E5E5E3] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-[#EFEFEF] shrink-0">
          <div>
            <h3 className="text-lg font-bold text-[#1F1F1F]">Contact Details</h3>
            <p className="text-xs text-[#71717A] mt-0.5">
              These details will be included in your downloadable vCard contact file.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-[#71717A] hover:text-[#1F1F1F] hover:bg-[#F4F4F5] transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          {errors.submit && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
              <span>{errors.submit}</span>
            </div>
          )}

          {/* Full Name */}
          <div>
            <label className="block text-xs font-semibold text-[#27272A] mb-1.5">
              Full Name
            </label>
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#A1A1AA]" />
              <input
                type="text"
                value={formData.fullName}
                onChange={(e) => handleChange('fullName', e.target.value)}
                placeholder="e.g. Alex Morgan"
                maxLength={100}
                className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-[#E4E4E7] bg-[#FAFAFA] text-sm text-[#18181B] placeholder:text-[#A1A1AA] focus:bg-[#FFFFFF] focus:border-[#18181B] focus:ring-1 focus:ring-[#18181B] outline-none transition-all"
              />
            </div>
          </div>

          {/* Professional Title */}
          <div>
            <label className="block text-xs font-semibold text-[#27272A] mb-1.5">
              Professional Title
            </label>
            <div className="relative">
              <Briefcase className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#A1A1AA]" />
              <input
                type="text"
                value={formData.title}
                onChange={(e) => handleChange('title', e.target.value)}
                placeholder="e.g. Design Lead & Creator"
                maxLength={100}
                className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-[#E4E4E7] bg-[#FAFAFA] text-sm text-[#18181B] placeholder:text-[#A1A1AA] focus:bg-[#FFFFFF] focus:border-[#18181B] focus:ring-1 focus:ring-[#18181B] outline-none transition-all"
              />
            </div>
          </div>

          {/* Organization */}
          <div>
            <label className="block text-xs font-semibold text-[#27272A] mb-1.5">
              Business / Organization
            </label>
            <div className="relative">
              <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#A1A1AA]" />
              <input
                type="text"
                value={formData.organization}
                onChange={(e) => handleChange('organization', e.target.value)}
                placeholder="e.g. Studio Zero"
                maxLength={100}
                className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-[#E4E4E7] bg-[#FAFAFA] text-sm text-[#18181B] placeholder:text-[#A1A1AA] focus:bg-[#FFFFFF] focus:border-[#18181B] focus:ring-1 focus:ring-[#18181B] outline-none transition-all"
              />
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="block text-xs font-semibold text-[#27272A] mb-1.5">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#A1A1AA]" />
              <input
                type="email"
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
                placeholder="alex@example.com"
                maxLength={120}
                className={`w-full pl-10 pr-3.5 py-2.5 rounded-xl border ${
                  errors.email ? 'border-red-400 bg-red-50/50' : 'border-[#E4E4E7] bg-[#FAFAFA]'
                } text-sm text-[#18181B] placeholder:text-[#A1A1AA] focus:bg-[#FFFFFF] focus:border-[#18181B] focus:ring-1 focus:ring-[#18181B] outline-none transition-all`}
              />
            </div>
            {errors.email && <p className="text-xs text-red-600 mt-1">{errors.email}</p>}
          </div>

          {/* Phone */}
          <div>
            <label className="block text-xs font-semibold text-[#27272A] mb-1.5">
              Phone Number
            </label>
            <div className="relative">
              <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#A1A1AA]" />
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
                placeholder="+1 (555) 000-0000"
                maxLength={30}
                className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-[#E4E4E7] bg-[#FAFAFA] text-sm text-[#18181B] placeholder:text-[#A1A1AA] focus:bg-[#FFFFFF] focus:border-[#18181B] focus:ring-1 focus:ring-[#18181B] outline-none transition-all"
              />
            </div>
          </div>

          {/* Website */}
          <div>
            <label className="block text-xs font-semibold text-[#27272A] mb-1.5">
              Website
            </label>
            <div className="relative">
              <Globe className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#A1A1AA]" />
              <input
                type="text"
                value={formData.website}
                onChange={(e) => handleChange('website', e.target.value)}
                placeholder="https://creatorstore.store/username"
                maxLength={200}
                className={`w-full pl-10 pr-3.5 py-2.5 rounded-xl border ${
                  errors.website ? 'border-red-400 bg-red-50/50' : 'border-[#E4E4E7] bg-[#FAFAFA]'
                } text-sm text-[#18181B] placeholder:text-[#A1A1AA] focus:bg-[#FFFFFF] focus:border-[#18181B] focus:ring-1 focus:ring-[#18181B] outline-none transition-all`}
              />
            </div>
            {errors.website && <p className="text-xs text-red-600 mt-1">{errors.website}</p>}
          </div>

          {/* Note / Bio */}
          <div>
            <label className="block text-xs font-semibold text-[#27272A] mb-1.5">
              Note (Optional)
            </label>
            <div className="relative">
              <FileText className="absolute left-3.5 top-3 h-4 w-4 text-[#A1A1AA]" />
              <textarea
                value={formData.note}
                onChange={(e) => handleChange('note', e.target.value)}
                placeholder="Brief note to save in contacts (e.g. Connect on CreatorStore)"
                rows={2}
                maxLength={250}
                className="w-full pl-10 pr-3.5 py-2 rounded-xl border border-[#E4E4E7] bg-[#FAFAFA] text-sm text-[#18181B] placeholder:text-[#A1A1AA] focus:bg-[#FFFFFF] focus:border-[#18181B] focus:ring-1 focus:ring-[#18181B] outline-none transition-all resize-none"
              />
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[#EFEFEF] bg-[#FAFAFA] shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-[#71717A] hover:text-[#18181B] hover:bg-[#F4F4F5] transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving}
            className="px-5 py-2.5 rounded-xl bg-[#18181B] text-[#FFFFFF] text-xs font-bold hover:bg-[#27272A] disabled:opacity-50 transition-all flex items-center gap-1.5"
          >
            {saving ? 'Saving...' : 'Save Details'}
          </button>
        </div>
      </div>
    </div>
  )
}
