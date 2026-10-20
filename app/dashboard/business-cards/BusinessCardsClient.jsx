'use client'

import React, { useState, useEffect, useRef, useMemo } from 'react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { toast } from 'sonner'
import { api } from '@/lib/clientApi'
import { useDashboard } from '@/components/dashboard/DashboardContext'
import {
  IdCard,
  QrCode,
  Share2,
  Users,
  X,
  Check,
  Plus,
  ExternalLink,
  Copy,
  Download,
  Loader2,
  Building2,
  Mail,
  Phone,
  Globe,
  Sparkles,
  MessageSquare,
  Smartphone,
  Eye,
  CheckCircle2,
  AlertCircle,
  HelpCircle
} from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import ContactDetailsModal from '@/components/dashboard/business-cards/ContactDetailsModal'
import { CreatorStoreMark } from '@/components/brand/CreatorStoreBrand'

const QRCodeCanvas = dynamic(() => import('qrcode.react').then((m) => m.QRCodeCanvas), { ssr: false })

// 11 curated solid palette presets matching reference
export const PRESET_COLORS = [
  { name: 'Lime', hex: '#D2E823', isDark: false },
  { name: 'Forest Green', hex: '#264634', isDark: true },
  { name: 'Light Pink', hex: '#F2D8EB', isDark: false },
  { name: 'Navy', hex: '#1D2A57', isDark: true },
  { name: 'Orange', hex: '#ED6B28', isDark: true },
  { name: 'Mint Green', hex: '#79D3A8', isDark: false },
  { name: 'Charcoal', hex: '#273238', isDark: true },
  { name: 'Red', hex: '#C03A30', isDark: true },
  { name: 'Burgundy', hex: '#571D23', isDark: true },
  { name: 'Teal', hex: '#4EA5BC', isDark: false },
  { name: 'Purple', hex: '#9A55DC', isDark: true },
]

// Simple luminance check for text contrast
function isColorDark(hex) {
  if (!hex || typeof hex !== 'string') return false
  const cleanHex = hex.replace('#', '')
  if (cleanHex.length !== 6 && cleanHex.length !== 3) return false
  const r = parseInt(cleanHex.length === 3 ? cleanHex[0] + cleanHex[0] : cleanHex.substring(0, 2), 16)
  const g = parseInt(cleanHex.length === 3 ? cleanHex[1] + cleanHex[1] : cleanHex.substring(2, 4), 16)
  const b = parseInt(cleanHex.length === 3 ? cleanHex[2] + cleanHex[2] : cleanHex.substring(4, 6), 16)
  const yiq = (r * 299 + g * 587 + b * 114) / 1000
  return yiq < 140
}

export default function BusinessCardsClient() {
  const { me } = useDashboard()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savedSuccess, setSavedSuccess] = useState(false)

  // Card settings state
  const [displayName, setDisplayName] = useState('')
  const [backgroundColor, setBackgroundColor] = useState('#D2E823')
  const [allowContactShare, setAllowContactShare] = useState(false)
  const [contactDetails, setContactDetails] = useState({
    fullName: '',
    title: '',
    organization: '',
    email: '',
    phone: '',
    website: '',
    note: '',
  })

  // UI state
  const [introDismissed, setIntroDismissed] = useState(false)
  const [contactModalOpen, setContactModalOpen] = useState(false)
  const [previewTab, setPreviewTab] = useState('card') // 'card' | 'store'
  const customColorInputRef = useRef(null)

  // Username and store URL
  const username = me?.store?.username || me?.store?.slug || me?.profile?.username || ''
  const canonicalStoreUrl = useMemo(() => {
    if (typeof window !== 'undefined' && username) {
      return `${window.location.origin}/${username}`
    }
    return username ? `https://creatorstore.store/${username}` : ''
  }, [username])

  const displayStoreUrl = username ? `creatorstore.store/${username}` : 'creatorstore.store'

  // Load intro dismissal preference from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const dismissed = localStorage.getItem('creatorstore_dismiss_bc_intro') === 'true'
      setIntroDismissed(dismissed)
    }
  }, [])

  function dismissIntro() {
    setIntroDismissed(true)
    if (typeof window !== 'undefined') {
      localStorage.setItem('creatorstore_dismiss_bc_intro', 'true')
    }
  }

  // Load business card settings from API
  useEffect(() => {
    let mounted = true
    setLoading(true)

    api.get('/business-card')
      .then((res) => {
        if (!mounted) return
        setDisplayName(res.displayName || '')
        setBackgroundColor(res.backgroundColor || '#D2E823')
        setAllowContactShare(Boolean(res.allowContactShare))
        if (res.contactDetails) {
          setContactDetails({
            fullName: res.contactDetails.fullName || '',
            title: res.contactDetails.title || '',
            organization: res.contactDetails.organization || '',
            email: res.contactDetails.email || '',
            phone: res.contactDetails.phone || '',
            website: res.contactDetails.website || '',
            note: res.contactDetails.note || '',
          })
        }
      })
      .catch((err) => {
        console.error('Failed to load business card settings:', err)
        // Fallbacks from profile
        const defName = me?.store?.storeName || me?.profile?.name || (username ? `@${username}` : '')
        setDisplayName(defName)
      })
      .finally(() => {
        if (mounted) setLoading(false)
      })

    return () => { mounted = false }
  }, [me, username])

  // Save business card settings
  async function handleSave() {
    setSaving(true)
    setSavedSuccess(false)
    try {
      const payload = {
        displayName: displayName.trim(),
        backgroundColor,
        allowContactShare,
        contactDetails,
      }
      await api.put('/business-card', payload)
      setSavedSuccess(true)
      toast.success('Business card saved successfully!')
      setTimeout(() => setSavedSuccess(false), 3000)
    } catch (err) {
      toast.error(err.message || 'Failed to save business card settings')
    } finally {
      setSaving(false)
    }
  }

  function handleSaveContactDetails(updated) {
    setContactDetails(updated)
    toast.success('Contact details updated. Remember to save your card.')
  }

  function handleRemoveContactDetails() {
    setContactDetails({
      fullName: '',
      title: '',
      organization: '',
      email: '',
      phone: '',
      website: '',
      note: '',
    })
    toast.success('Contact details cleared.')
  }

  function downloadQRCode() {
    const canvas = document.getElementById('business-card-qr-canvas')
    if (!canvas) {
      toast.error('QR code not ready yet')
      return
    }
    const pngUrl = canvas.toDataURL('image/png')
    const downloadLink = document.createElement('a')
    downloadLink.href = pngUrl
    downloadLink.download = `${username || 'creator'}-business-card-qr.png`
    document.body.appendChild(downloadLink)
    downloadLink.click()
    document.body.removeChild(downloadLink)
    toast.success('QR Code image downloaded!')
  }

  function copyStoreLink() {
    if (!canonicalStoreUrl) return
    navigator.clipboard?.writeText(canonicalStoreUrl)
    toast.success('Store link copied to clipboard!')
  }

  function testDownloadVCard() {
    const slug = username
    if (!slug) {
      toast.error('Creator username not available')
      return
    }
    window.location.href = `/api/business-card/vcard?username=${encodeURIComponent(slug)}`
  }

  const hasConfiguredContact = Boolean(
    contactDetails.fullName ||
    contactDetails.email ||
    contactDetails.phone ||
    contactDetails.website ||
    contactDetails.organization
  )

  const isDarkCard = isColorDark(backgroundColor)
  const textColor = isDarkCard ? '#FFFFFF' : '#121212'
  const textMutedColor = isDarkCard ? 'rgba(255, 255, 255, 0.7)' : 'rgba(18, 18, 18, 0.65)'

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-[#1F1F1F]">
        <Loader2 className="h-8 w-8 animate-spin text-[#1F1F1F] mb-3" />
        <p className="text-sm font-medium text-[#71717A]">Loading your business card...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-12">
      {/* 1. PAGE HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#1F1F1F] tracking-tight">
            Business cards
          </h1>
          <p className="text-xs sm:text-sm text-[#71717A] mt-1">
            Personalize your digital business card, QR code, and contact-sharing settings.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {canonicalStoreUrl && (
            <a
              href={canonicalStoreUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-[#E5E5E3] bg-[#FFFFFF] hover:bg-[#F4F4F5] text-xs font-semibold text-[#1F1F1F] transition-colors"
            >
              <span>View Storefront</span>
              <ExternalLink className="h-3.5 w-3.5 text-[#71717A]" />
            </a>
          )}
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#18181B] hover:bg-[#27272A] text-xs font-bold text-[#FFFFFF] shadow-sm transition-all disabled:opacity-50 cursor-pointer"
          >
            {saving ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Saving...</span>
              </>
            ) : savedSuccess ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-400" />
                <span>Saved!</span>
              </>
            ) : (
              <span>Save Changes</span>
            )}
          </button>
        </div>
      </div>

      {/* 2. DISMISSIBLE INTRODUCTION CARD (Matching Screenshot 1) */}
      {!introDismissed && (
        <div className="relative rounded-[24px] bg-[#FFFFFF] border border-[#E5E5E3] p-6 sm:p-8 shadow-[0_4px_20px_rgba(0,0,0,0.03)] overflow-hidden">
          <button
            type="button"
            onClick={dismissIntro}
            aria-label="Dismiss banner"
            className="absolute top-4 right-4 p-1.5 rounded-full text-[#A1A1AA] hover:text-[#1F1F1F] hover:bg-[#F4F4F5] transition-colors"
          >
            <X className="h-4.5 w-4.5" />
          </button>

          <div className="flex flex-col lg:flex-row lg:items-center gap-6 lg:gap-10">
            {/* Visual: Stylized stacked digital cards */}
            <div className="relative shrink-0 w-36 h-28 hidden sm:flex items-center justify-center">
              {/* Back card (Orange) */}
              <div className="absolute w-20 h-24 rounded-xl bg-[#ED6B28] rotate-12 shadow-sm border border-black/10 flex items-center justify-center text-white text-xs font-bold">
                <QrCode className="h-6 w-6 opacity-80" />
              </div>
              {/* Middle card (Green) */}
              <div className="absolute w-20 h-24 rounded-xl bg-[#264634] -rotate-6 shadow-md border border-black/10 flex items-center justify-center text-white text-xs font-bold">
                <Sparkles className="h-6 w-6 opacity-80" />
              </div>
              {/* Front card (Signature Lime) */}
              <div className="relative w-20 h-24 rounded-xl bg-[#D2E823] shadow-lg border border-black/10 flex flex-col justify-between p-2 text-black">
                <CreatorStoreMark size="xs" theme="light" className="h-3.5 w-3.5" />
                <div className="bg-white p-1 rounded-md self-center">
                  <QrCode className="h-6 w-6 text-black" />
                </div>
              </div>
            </div>

            {/* Content & 3 Column Features */}
            <div className="flex-1 space-y-4">
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-[#1F1F1F] tracking-tight">
                  Create your digital business card
                </h2>
                <p className="text-xs sm:text-sm text-[#71717A] mt-1 max-w-2xl">
                  Share your creator profile and contact details through a personalized digital business card.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                <div className="flex items-start gap-3">
                  <div className="h-8 w-8 rounded-lg bg-[#F4F4F5] flex items-center justify-center shrink-0 text-[#1F1F1F]">
                    <QrCode className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-[#1F1F1F]">Share your profile</h4>
                    <p className="text-[11px] text-[#71717A] mt-0.5 leading-snug">
                      Let people quickly access your CreatorStore profile.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="h-8 w-8 rounded-lg bg-[#F4F4F5] flex items-center justify-center shrink-0 text-[#1F1F1F]">
                    <Smartphone className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-[#1F1F1F]">Scan your QR code</h4>
                    <p className="text-[11px] text-[#71717A] mt-0.5 leading-snug">
                      Make it easy for people to open your storefront.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="h-8 w-8 rounded-lg bg-[#F4F4F5] flex items-center justify-center shrink-0 text-[#1F1F1F]">
                    <Users className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-[#1F1F1F]">Grow your audience</h4>
                    <p className="text-[11px] text-[#71717A] mt-0.5 leading-snug">
                      Give visitors a convenient way to discover your content and contact you.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. TWO-COLUMN LAYOUT: SETTINGS (LEFT) + PREVIEW (RIGHT) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* LEFT COLUMN: CUSTOMIZATION PANELS */}
        <div className="lg:col-span-7 space-y-6">
          {/* PANEL 1: CARD STYLE */}
          <div className="rounded-[24px] bg-[#FFFFFF] border border-[#E5E5E3] p-6 sm:p-7 shadow-sm space-y-6">
            <div>
              <h3 className="text-base sm:text-lg font-bold text-[#1F1F1F]">Card style</h3>
              <p className="text-xs sm:text-sm text-[#71717A] mt-0.5">
                Customize your display name and background, then preview your digital business card.
              </p>
            </div>

            {/* Display Name Input */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-[#27272A]">
                Display name
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder={username ? `@${username}` : 'Your Name'}
                maxLength={80}
                className="w-full px-4 py-3 rounded-xl border border-[#E4E4E7] bg-[#FAFAFA] text-sm text-[#18181B] placeholder:text-[#A1A1AA] focus:bg-[#FFFFFF] focus:border-[#18181B] focus:ring-1 focus:ring-[#18181B] outline-none transition-all"
              />
              <p className="text-[11px] text-[#71717A]">
                This updates your business card identity and does not change your account username or public storefront URL.
              </p>
            </div>

            {/* Background Color Palette (Matching Screenshot 2) */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold text-[#27272A]">
                  Background color
                </label>
                <span className="text-[11px] font-mono text-[#71717A] uppercase">
                  {backgroundColor}
                </span>
              </div>

              <div className="flex items-center gap-2.5 flex-wrap">
                {/* 1. Rainbow Color Wheel for Custom Color Picker */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => customColorInputRef.current?.click()}
                    title="Choose custom color"
                    className="w-9 h-9 rounded-full relative flex items-center justify-center transition-transform hover:scale-105 shadow-sm border border-black/10 cursor-pointer"
                    style={{
                      background: 'conic-gradient(from 180deg at 50% 50%, #FF0000 0deg, #FFA500 45deg, #FFFF00 90deg, #008000 135deg, #00FFFF 180deg, #0000FF 225deg, #800080 270deg, #FF00FF 315deg, #FF0000 360deg)',
                    }}
                  >
                    <input
                      ref={customColorInputRef}
                      type="color"
                      value={backgroundColor}
                      onChange={(e) => setBackgroundColor(e.target.value)}
                      className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
                    />
                  </button>
                </div>

                {/* 2-12. Preset Curated Colors */}
                {PRESET_COLORS.map((preset) => {
                  const isSelected = backgroundColor.toLowerCase() === preset.hex.toLowerCase()
                  return (
                    <button
                      key={preset.hex}
                      type="button"
                      onClick={() => setBackgroundColor(preset.hex)}
                      title={preset.name}
                      className={`w-9 h-9 rounded-full relative flex items-center justify-center transition-transform hover:scale-105 shadow-sm border border-black/10 cursor-pointer ${
                        isSelected ? 'ring-2 ring-offset-2 ring-[#18181B]' : ''
                      }`}
                      style={{ backgroundColor: preset.hex }}
                    >
                      {isSelected && (
                        <Check
                          className={`h-4 w-4 ${
                            preset.isDark ? 'text-white' : 'text-black'
                          }`}
                        />
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          {/* PANEL 2: VISITOR CONTACT COLLECTION (Matching Screenshot 2) */}
          <div className="rounded-[24px] bg-[#FFFFFF] border border-[#E5E5E3] p-6 sm:p-7 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <h3 className="text-base sm:text-lg font-bold text-[#1F1F1F]">
                  Let visitors share their details back
                </h3>
                <p className="text-xs sm:text-sm text-[#71717A] max-w-md">
                  Collect a visitor's name and email so you can follow up and grow your audience.
                </p>
              </div>

              <div className="shrink-0 pt-1">
                <Switch
                  checked={allowContactShare}
                  onCheckedChange={(checked) => setAllowContactShare(checked)}
                  aria-label="Toggle visitor contact collection"
                />
              </div>
            </div>

            {allowContactShare && (
              <div className="mt-4 p-3.5 rounded-xl bg-[#F4F4F5] border border-[#E4E4E7] text-xs text-[#27272A] flex items-center gap-2.5">
                <Users className="h-4 w-4 text-[#18181B] shrink-0" />
                <span>
                  New contacts will automatically be saved to your{' '}
                  <Link href="/dashboard/customers" className="font-semibold underline text-[#18181B]">
                    Audience
                  </Link>{' '}
                  and{' '}
                  <Link href="/dashboard/leads" className="font-semibold underline text-[#18181B]">
                    Leads
                  </Link>{' '}
                  lists.
                </span>
              </div>
            )}
          </div>

          {/* PANEL 3: VISITOR CONTACT DETAILS (Matching Screenshot 2) */}
          <div className="rounded-[24px] bg-[#FFFFFF] border border-[#E5E5E3] p-6 sm:p-7 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <h3 className="text-base sm:text-lg font-bold text-[#1F1F1F]">
                  Let visitors save your contact
                </h3>
                <p className="text-xs sm:text-sm text-[#71717A]">
                  Allow visitors to access the contact details you choose to share.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setContactModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#F4F4F5] hover:bg-[#E4E4E7] text-xs font-bold text-[#18181B] transition-colors shrink-0 cursor-pointer self-start sm:self-auto"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>{hasConfiguredContact ? 'Edit contact details' : 'Add contact details'}</span>
              </button>
            </div>

            {/* Configured Contact Summary */}
            {hasConfiguredContact ? (
              <div className="p-4 rounded-2xl bg-[#FAFAFA] border border-[#E4E4E7] space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {contactDetails.fullName && (
                    <div className="flex items-center gap-2 text-[#27272A]">
                      <span className="font-semibold">Name:</span> {contactDetails.fullName}
                    </div>
                  )}
                  {contactDetails.title && (
                    <div className="flex items-center gap-2 text-[#27272A]">
                      <span className="font-semibold">Title:</span> {contactDetails.title}
                    </div>
                  )}
                  {contactDetails.organization && (
                    <div className="flex items-center gap-2 text-[#27272A]">
                      <span className="font-semibold">Company:</span> {contactDetails.organization}
                    </div>
                  )}
                  {contactDetails.email && (
                    <div className="flex items-center gap-2 text-[#27272A]">
                      <span className="font-semibold">Email:</span> {contactDetails.email}
                    </div>
                  )}
                  {contactDetails.phone && (
                    <div className="flex items-center gap-2 text-[#27272A]">
                      <span className="font-semibold">Phone:</span> {contactDetails.phone}
                    </div>
                  )}
                  {contactDetails.website && (
                    <div className="flex items-center gap-2 text-[#27272A] truncate">
                      <span className="font-semibold">Website:</span> {contactDetails.website}
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-[#EFEFEF]">
                  <button
                    type="button"
                    onClick={testDownloadVCard}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#18181B] hover:underline cursor-pointer"
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span>Download vCard (.vcf)</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleRemoveContactDetails}
                    className="text-xs text-red-600 hover:text-red-700 font-medium cursor-pointer"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-xs text-[#A1A1AA] italic">
                No contact details shared yet. Click "Add contact details" to add phone, email, or company info to your downloadable vCard.
              </p>
            )}
          </div>

          {/* PANEL 4: GOT IDEAS / FEEDBACK NOTE (Matching Screenshot 2) */}
          <div className="flex items-center gap-3 p-4 rounded-2xl bg-[#FFFFFF] border border-[#E5E5E3]">
            <div className="h-9 w-9 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
              <Sparkles className="h-4 w-4" />
            </div>
            <div className="text-xs">
              <span className="font-bold text-[#1F1F1F]">Got ideas? </span>
              <span className="text-[#71717A]">We're listening! </span>
              <Link href="/contact" className="font-semibold underline text-[#1F1F1F]">
                Share feedback
              </Link>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: LIVE BUSINESS CARD PREVIEW (STICKY DESKTOP) */}
        <div className="lg:col-span-5 sticky top-6 space-y-4">
          {/* Preview Tab Controls */}
          <div className="flex items-center justify-between px-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[#71717A]">
              Live Preview
            </span>
            <div className="flex items-center gap-1 bg-[#F4F4F5] p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setPreviewTab('card')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                  previewTab === 'card'
                    ? 'bg-[#FFFFFF] text-[#1F1F1F] shadow-sm'
                    : 'text-[#71717A] hover:text-[#1F1F1F]'
                }`}
              >
                Digital Card
              </button>
              <button
                type="button"
                onClick={() => setPreviewTab('store')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                  previewTab === 'store'
                    ? 'bg-[#FFFFFF] text-[#1F1F1F] shadow-sm'
                    : 'text-[#71717A] hover:text-[#1F1F1F]'
                }`}
              >
                Store Mockup
              </button>
            </div>
          </div>

          {/* VIEW 1: DIGITAL BUSINESS CARD (Matching Screenshot 1) */}
          {previewTab === 'card' ? (
            <div className="space-y-4">
              <div
                className="rounded-[32px] p-7 sm:p-9 shadow-lg border border-black/5 relative overflow-hidden transition-all duration-300 min-h-[460px] flex flex-col justify-between"
                style={{ backgroundColor }}
              >
                {/* Card Top: Brand Mark */}
                <div className="flex items-center justify-between">
                  <div
                    className="p-2 rounded-xl transition-colors"
                    style={{
                      backgroundColor: isDarkCard ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.08)',
                    }}
                  >
                    <CreatorStoreMark
                      size="sm"
                      theme={isDarkCard ? 'dark' : 'light'}
                      className="h-5 w-5"
                    />
                  </div>
                  {allowContactShare && (
                    <span
                      className="px-2.5 py-1 rounded-full text-[10px] font-semibold tracking-wide uppercase"
                      style={{
                        backgroundColor: isDarkCard ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.08)',
                        color: textColor,
                      }}
                    >
                      Connect Enabled
                    </span>
                  )}
                </div>

                {/* Card Middle: Identity & URL */}
                <div className="space-y-4 my-6">
                  <div>
                    <span
                      className="text-[10px] font-bold tracking-widest uppercase block mb-1"
                      style={{ color: textMutedColor }}
                    >
                      NAME
                    </span>
                    <h2
                      className="text-2xl sm:text-3xl font-extrabold tracking-tight truncate leading-tight"
                      style={{ color: textColor }}
                    >
                      {displayName || (username ? `@${username}` : 'Your Name')}
                    </h2>
                  </div>

                  <div>
                    <span
                      className="text-[10px] font-bold tracking-widest uppercase block mb-1"
                      style={{ color: textMutedColor }}
                    >
                      URL
                    </span>
                    <p
                      className="text-sm sm:text-base font-semibold truncate"
                      style={{ color: textColor }}
                    >
                      {displayStoreUrl}
                    </p>
                  </div>
                </div>

                {/* Card Bottom: Scannable QR Code */}
                <div className="flex justify-center">
                  <div className="bg-white p-4 rounded-2xl shadow-md inline-flex items-center justify-center">
                    {canonicalStoreUrl ? (
                      <QRCodeCanvas
                        id="business-card-qr-canvas"
                        value={canonicalStoreUrl}
                        size={156}
                        level="H"
                        bgColor="#ffffff"
                        fgColor="#000000"
                        includeMargin={false}
                      />
                    ) : (
                      <div className="w-[156px] h-[156px] bg-zinc-100 flex items-center justify-center text-zinc-400">
                        <QrCode className="h-12 w-12" />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Toolbar Below Card */}
              <div className="flex items-center justify-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={downloadQRCode}
                  className="flex-1 py-2.5 px-3 rounded-xl bg-[#FFFFFF] border border-[#E5E5E3] hover:bg-[#F4F4F5] text-xs font-bold text-[#1F1F1F] transition-colors flex items-center justify-center gap-1.5 shadow-sm"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Download QR</span>
                </button>
                <button
                  type="button"
                  onClick={copyStoreLink}
                  className="flex-1 py-2.5 px-3 rounded-xl bg-[#FFFFFF] border border-[#E5E5E3] hover:bg-[#F4F4F5] text-xs font-bold text-[#1F1F1F] transition-colors flex items-center justify-center gap-1.5 shadow-sm"
                >
                  <Copy className="h-3.5 w-3.5" />
                  <span>Copy URL</span>
                </button>
              </div>
            </div>
          ) : (
            /* VIEW 2: STOREFRONT MOBILE MOCKUP (Matching Screenshot 1 & 2 Right Side) */
            <div className="rounded-[32px] bg-[#FFFFFF] border border-[#E5E5E3] p-4 shadow-sm">
              <div className="max-w-[320px] mx-auto rounded-[28px] bg-[#121212] text-white p-4 border border-zinc-800 shadow-xl space-y-4">
                {/* Storefront Top Bar with Contact button */}
                <div className="flex items-center justify-between">
                  <div className="h-7 w-7 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-300">
                    <Sparkles className="h-3.5 w-3.5" />
                  </div>
                  <div className="flex items-center gap-1.5">
                    {(hasConfiguredContact || allowContactShare) && (
                      <span className="px-2.5 py-1 rounded-full bg-zinc-800 text-[11px] font-semibold text-zinc-200 flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        <span>Contact</span>
                      </span>
                    )}
                    <div className="h-7 w-7 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-300">
                      <Share2 className="h-3 w-3" />
                    </div>
                  </div>
                </div>

                {/* Avatar & Profile */}
                <div className="text-center space-y-2 pt-2">
                  <div className="h-16 w-16 mx-auto rounded-full bg-zinc-800 border-2 border-zinc-700 flex items-center justify-center text-zinc-400 overflow-hidden">
                    {me?.profile?.avatarUrl ? (
                      <img
                        src={me.profile.avatarUrl}
                        alt="Avatar"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-xl font-bold">
                        {(displayName || username || 'C').charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">
                      {displayName || (username ? `@${username}` : 'Your Name')}
                    </h3>
                    <p className="text-[11px] text-zinc-400">
                      {displayStoreUrl}
                    </p>
                  </div>
                </div>

                {/* Mock Links / Products */}
                <div className="space-y-2 pt-2">
                  <div className="p-3 rounded-xl bg-zinc-800/80 border border-zinc-700/60 text-xs text-center font-medium text-zinc-200">
                    Explore My Products &amp; Store
                  </div>
                  {allowContactShare && (
                    <div className="p-2.5 rounded-xl bg-white/10 border border-white/20 text-xs text-center font-bold text-white flex items-center justify-center gap-1.5">
                      <MessageSquare className="h-3.5 w-3.5" />
                      <span>Leave Contact Details</span>
                    </div>
                  )}
                  {hasConfiguredContact && (
                    <div className="p-2.5 rounded-xl bg-white text-black text-xs text-center font-bold flex items-center justify-center gap-1.5 shadow-sm">
                      <Download className="h-3.5 w-3.5" />
                      <span>Save Contact to Phone</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 4. MODALS */}
      <ContactDetailsModal
        isOpen={contactModalOpen}
        onClose={() => setContactModalOpen(false)}
        initialDetails={contactDetails}
        onSave={handleSaveContactDetails}
      />
    </div>
  )
}
