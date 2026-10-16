'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import { api } from '@/lib/clientApi'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import InstagramMediaSelectorModal from '@/components/dashboard/InstagramMediaSelectorModal'
import AddResponseModal from '@/components/dashboard/AddResponseModal'
import ConnectInstagramModal from '@/components/automations/ConnectInstagramModal'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import {
  Bot, ArrowLeft, Loader2, Save, Trash2, CheckCircle2,
  PauseCircle, PlayCircle, Sparkles, MessageSquare, Activity, AlertTriangle, ArrowRight, Check, X,
  Video, Image as ImageIcon, Plus, Zap, MessageCircle, Send, ChevronDown
} from 'lucide-react'

export default function EditAutomationPage() {
  const router = useRouter()
  const params = useParams()
  const id = params?.id

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [products, setProducts] = useState([])
  const [metrics, setMetrics] = useState({ comments: 0, dmsSent: 0, dmFailures: 0, clicks: 0, checkouts: 0, purchases: 0, revenue: 0 })
  const [events, setEvents] = useState([])
  const [healthStatus, setHealthStatus] = useState('ACTIVE')

  // Modals & Popovers state
  const [mediaModalOpen, setMediaModalOpen] = useState(false)
  const [responseModalOpen, setResponseModalOpen] = useState(false)
  const [productSelectOpen, setProductSelectOpen] = useState(false)
  const [connectModalOpen, setConnectModalOpen] = useState(false)

  // Keywords chip input
  const [keywordInput, setKeywordInput] = useState('')

  const [formData, setFormData] = useState({
    name: '',
    mediaId: 'ALL',
    mediaType: 'ALL',
    mediaUrl: '',
    mediaCaption: 'All Posts & Reels',
    keywords: ['GUIDE'],
    commentReply: 'Just sent you a DM! Check your messages 💌',
    openingMessageEnabled: false,
    openingMessage: "Hey there! 👋 Thanks for your interest.\n\nTap below and I'll send you the link.",
    openingButtonText: 'Send me the link',
    productId: '',
    destinationType: 'PRODUCT',
    customUrl: '',
    message: '',
    buttonText: 'Get access',
    responses: [],
    status: 'ACTIVE',
  })

  useEffect(() => {
    if (id) fetchAutomationData()
  }, [id])

  async function fetchAutomationData() {
    setLoading(true)
    try {
      const [autoRes, productsRes, eventsRes] = await Promise.all([
        api.get(`/automations/${id}`),
        api.get('/products').catch(() => []),
        api.get(`/automations/${id}/events`).catch(() => [])
      ])

      const productList = Array.isArray(productsRes)
        ? productsRes
        : (productsRes?.products || productsRes?.items || [])
      setProducts(productList)
      setEvents(Array.isArray(eventsRes) ? eventsRes : [])

      if (autoRes) {
        const rawKw = Array.isArray(autoRes.keywords) && autoRes.keywords.length > 0
          ? autoRes.keywords
          : (autoRes.triggerValue ? String(autoRes.triggerValue).split(',').map(k => k.trim()).filter(Boolean) : ['GUIDE'])

        const destType = autoRes.destinationType === 'CUSTOM_LINK' ? 'CUSTOM_LINK' : 'PRODUCT'

        setFormData({
          name: autoRes.name || '',
          mediaId: autoRes.mediaId || 'ALL',
          mediaType: autoRes.mediaType || 'ALL',
          mediaUrl: autoRes.mediaUrl || '',
          mediaCaption: autoRes.mediaCaption || 'All Posts & Reels',
          keywords: rawKw,
          commentReply: autoRes.commentReply || 'Just sent you a DM! Check your messages 💌',
          openingMessageEnabled: Boolean(autoRes.openingMessageEnabled),
          openingMessage: autoRes.openingMessage || "Hey there! 👋 Thanks for your interest.\n\nTap below and I'll send you the link.",
          openingButtonText: autoRes.openingButtonText || 'Send me the link',
          productId: autoRes.productId || '',
          destinationType: destType,
          customUrl: autoRes.customUrl || '',
          message: autoRes.message || '',
          buttonText: autoRes.buttonText || (destType === 'CUSTOM_LINK' ? 'Get it here' : 'Get access'),
          responses: Array.isArray(autoRes.responses) ? autoRes.responses : [],
          status: autoRes.status || 'ACTIVE',
        })
        if (autoRes.metrics) setMetrics(autoRes.metrics)
        if (autoRes.healthStatus) setHealthStatus(autoRes.healthStatus)
      }
    } catch (err) {
      console.error('Failed to load automation:', err)
      toast.error('Automation not found')
      router.push('/dashboard/automations')
    } finally {
      setLoading(false)
    }
  }

  // Keywords helper functions
  function commitKeyword(rawInput, showToastOnDuplicate = false) {
    if (!rawInput) return
    const parts = rawInput
      .split(',')
      .map((k) => k.trim().toUpperCase())
      .filter(Boolean)

    if (parts.length === 0) {
      setKeywordInput('')
      return
    }

    setFormData((prev) => {
      const existing = new Set(prev.keywords)
      const newKeywords = [...prev.keywords]
      let addedAny = false
      let duplicateFound = false

      for (const val of parts) {
        if (existing.has(val)) {
          duplicateFound = true
        } else {
          existing.add(val)
          newKeywords.push(val)
          addedAny = true
        }
      }

      if (duplicateFound && showToastOnDuplicate) {
        toast.info('Keyword already exists')
      }

      return addedAny ? { ...prev, keywords: newKeywords } : prev
    })

    setKeywordInput('')
  }

  function handleAddKeyword(e) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      commitKeyword(keywordInput, true)
    }
  }

  function handleKeywordBlur() {
    commitKeyword(keywordInput, false)
  }

  function handleRemoveKeyword(keywordToRemove) {
    setFormData((prev) => ({
      ...prev,
      keywords: prev.keywords.filter((k) => k !== keywordToRemove),
    }))
  }

  // Add response modal step handler
  function handleAddResponseStep(newStep) {
    setFormData((prev) => ({
      ...prev,
      responses: [...(prev.responses || []), { ...newStep, id: `step_${Date.now()}` }]
    }))
  }

  function handleRemoveResponseStep(stepId) {
    setFormData((prev) => ({
      ...prev,
      responses: prev.responses.filter((r) => r.id !== stepId)
    }))
  }

  async function handleSave() {
    if (formData.keywords.length === 0) {
      return toast.error('Please add at least one trigger keyword')
    }
    if (!formData.commentReply.trim()) {
      return toast.error('Public comment reply cannot be empty')
    }

    if (formData.destinationType === 'CUSTOM_LINK' || formData.destinationType === 'CUSTOM_URL') {
      if (!formData.customUrl.trim()) return toast.error('Enter a valid destination URL')
      if (!formData.buttonText.trim()) return toast.error('Enter button text for your custom link')
    } else {
      if (!formData.productId) return toast.error('Select a product to promote')
    }

    setSaving(true)
    try {
      const payloadDestinationType = (formData.destinationType === 'CUSTOM_LINK' || formData.destinationType === 'CUSTOM_URL')
        ? 'CUSTOM_LINK'
        : 'PRODUCT'

      await api.patch(`/automations/${id}`, {
        ...formData,
        destinationType: payloadDestinationType,
        triggerValue: formData.keywords.join(', '),
      })
      toast.success('Automation updated successfully!')
      router.push('/dashboard/automations')
    } catch (err) {
      if (err.code === 'INSTAGRAM_NOT_CONNECTED' || err.status === 403) {
        setConnectModalOpen(true)
      } else {
        toast.error(err.message || 'Failed to update automation')
      }
      setSaving(false)
    }
  }

  async function handleToggleStatus() {
    const newStatus = formData.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE'
    setSaving(true)
    try {
      await api.patch(`/automations/${id}`, { statusOnly: true, status: newStatus })
      setFormData((prev) => ({ ...prev, status: newStatus }))
      toast.success(`Automation ${newStatus === 'ACTIVE' ? 'activated' : 'paused'}`)
    } catch (err) {
      if (err.code === 'INSTAGRAM_NOT_CONNECTED' || err.status === 403) {
        setConnectModalOpen(true)
      } else {
        toast.error(err.message || 'Failed to update status')
      }
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!confirm('Are you sure you want to delete this automation? This action cannot be undone.')) return
    setDeleting(true)
    try {
      await api.delete(`/automations/${id}`)
      toast.success('Automation deleted')
      router.push('/dashboard/automations')
    } catch (err) {
      toast.error(err.message || 'Failed to delete automation')
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center bg-[#FFFFFF] rounded-[24px] border border-[#E5E5E3]">
        <Loader2 className="h-8 w-8 animate-spin text-[#1F1F1F]" />
      </div>
    )
  }

  const publishedProducts = products.filter(p => !p.status || p.status === 'PUBLISHED')
  const selectedProductObj = publishedProducts.find(p => p.id === formData.productId) || products.find(p => p.id === formData.productId)

  const isCustomUrl = formData.destinationType === 'CUSTOM_LINK' || formData.destinationType === 'CUSTOM_URL'
  const isProduct = formData.destinationType === 'PRODUCT'

  return (
    <div className="max-w-6xl space-y-6 text-[#010619]">
      
      {/* Back & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/automations">
            <Button variant="outline" className="border-[#E5E5E3] bg-[#FFFFFF] text-[#1F1F1F] hover:bg-[#F5F5F3] p-2.5 rounded-full">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-[#1F1F1F] tracking-tight">{formData.name || 'Edit Automation'}</h1>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase ${
                healthStatus === 'ACTIVE'
                  ? 'bg-[#16A34A]/10 text-[#16A34A] border border-[#16A34A]/20'
                  : healthStatus === 'PAUSED'
                  ? 'bg-[#D97706]/10 text-[#D97706] border border-[#D97706]/20'
                  : 'bg-[#DC2626]/10 text-[#DC2626] border border-[#DC2626]/20'
              }`}>
                {healthStatus.replace('_', ' ')}
              </span>
            </div>
            <p className="text-sm text-[#6F6F6B]">Manage settings, keyword triggers, and DM responses.</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={handleToggleStatus}
            disabled={saving}
            variant="outline"
            className="border-[#E5E5E3] bg-[#FFFFFF] text-[#1F1F1F] hover:bg-[#F5F5F3] text-xs font-bold rounded-full"
          >
            {formData.status === 'ACTIVE' ? <PauseCircle className="h-4 w-4 mr-1.5 text-[#D97706]" /> : <PlayCircle className="h-4 w-4 mr-1.5 text-[#16A34A]" />}
            {formData.status === 'ACTIVE' ? 'Pause' : 'Activate'}
          </Button>

          <Button
            onClick={handleDelete}
            disabled={deleting}
            variant="outline"
            className="border-[#DC2626]/30 text-[#DC2626] bg-[#FFFFFF] hover:bg-[#DC2626]/10 text-xs font-bold rounded-full"
          >
            <Trash2 className="h-4 w-4 mr-1" /> Delete
          </Button>

          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-[#1F1F1F] text-white font-bold hover:bg-[#000000] text-xs px-5 rounded-full shadow-xs"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
            Save Changes
          </Button>
        </div>
      </div>

      {/* Main Grid: Left Builder Form (2 Cols) | Right Live Summary & Preview (1 Col) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

        {/* Left Builder Column */}
        <div className="lg:col-span-8 space-y-6">

          {/* SECTION 1: SELECT POST OR REEL */}
          <div className="bg-[#FFFFFF] rounded-2xl sm:rounded-3xl border border-[#E5E5E3] p-6 sm:p-8 space-y-4 shadow-[0_8px_30px_rgba(0,0,0,0.04)]">
            <div className="flex items-center justify-between border-b border-[#E5E5E3] pb-4">
              <div className="flex items-center gap-3">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#1F1F1F] text-white font-bold text-xs">1</span>
                <div>
                  <h3 className="text-base font-bold text-[#1F1F1F]">Selected Post or Reel</h3>
                  <p className="text-xs text-[#6F6F6B]">Post or reel triggering comments for this automation.</p>
                </div>
              </div>
              <Button
                onClick={() => setMediaModalOpen(true)}
                className="bg-[#1F1F1F] text-white font-bold hover:bg-[#000000] text-xs rounded-full"
              >
                Change Content
              </Button>
            </div>

            {formData.mediaId && formData.mediaId !== 'ALL' ? (
              <div className="p-4 rounded-xl bg-[#FBFBFB] border border-[#E5E5E3] flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  {formData.mediaUrl ? (
                    <img src={formData.mediaUrl} alt="Thumbnail" className="h-14 w-14 rounded-xl object-cover border border-[#E5E5E3]" />
                  ) : (
                    <div className="h-14 w-14 rounded-xl bg-[#FFFFFF] border border-[#E5E5E3] flex items-center justify-center text-[#1F1F1F]">
                      {formData.mediaType === 'REEL' ? <Video className="h-6 w-6" /> : <ImageIcon className="h-6 w-6" />}
                    </div>
                  )}
                  <div>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-[#F5F5F3] text-[#1F1F1F] border border-[#E5E5E3]">
                      {formData.mediaType}
                    </span>
                    <h4 className="text-xs font-bold text-[#1F1F1F] mt-1 line-clamp-1">{formData.mediaCaption || 'Selected Instagram Media'}</h4>
                    <span className="text-[11px] text-[#6F6F6B]">ID: {formData.mediaId}</span>
                  </div>
                </div>
                <Button onClick={() => setMediaModalOpen(true)} variant="outline" className="border-[#E5E5E3] text-xs text-[#1F1F1F] bg-[#FFFFFF] hover:bg-[#F5F5F3] rounded-full">
                  Change
                </Button>
              </div>
            ) : (
              <div
                onClick={() => setMediaModalOpen(true)}
                className="p-6 rounded-2xl bg-[#FBFBFB] border-2 border-dashed border-[#E5E5E3] hover:border-[#1F1F1F] cursor-pointer transition-colors text-center space-y-2"
              >
                <div className="p-3 rounded-full bg-[#F5F5F3] text-[#1F1F1F] w-fit mx-auto border border-[#E5E5E3]">
                  <ImageIcon className="h-6 w-6" />
                </div>
                <h4 className="text-xs font-bold text-[#1F1F1F]">Any Post or Reel (Default)</h4>
                <p className="text-[11px] text-[#6F6F6B]">Click to pick a specific post or reel from your connected account.</p>
              </div>
            )}
          </div>

          {/* SECTION 2: SETUP KEYWORDS */}
          <div className="bg-[#FFFFFF] rounded-2xl sm:rounded-3xl border border-[#E5E5E3] p-6 sm:p-8 space-y-4 shadow-[0_8px_30px_rgba(0,0,0,0.04)]">
            <div className="flex items-center gap-3 border-b border-[#E5E5E3] pb-4">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#1F1F1F] text-white font-bold text-xs">2</span>
              <div>
                <h3 className="text-base font-bold text-[#1F1F1F]">Setup Keywords</h3>
                <p className="text-xs text-[#6F6F6B]">When someone comments one of these words, CreatorStore sends your DM.</p>
              </div>
            </div>

            <div className="space-y-3">
              <Label className="text-xs font-bold text-[#1F1F1F]">Comment Keywords</Label>
              
              <div className="p-3 bg-[#FFFFFF] border border-[#E5E5E3] rounded-xl flex flex-wrap items-center gap-2 min-h-[52px] focus-within:border-[#1F1F1F]">
                {formData.keywords.map((kw) => (
                  <span
                    key={kw}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#F5F5F3] border border-[#E5E5E3] text-xs font-mono font-bold text-[#1F1F1F]"
                  >
                    {kw}
                    <button onClick={() => handleRemoveKeyword(kw)} className="text-[#6F6F6B] hover:text-[#1F1F1F]">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </span>
                ))}

                <input
                  type="text"
                  value={keywordInput}
                  onChange={(e) => setKeywordInput(e.target.value)}
                  onKeyDown={handleAddKeyword}
                  onBlur={handleKeywordBlur}
                  placeholder={formData.keywords.length === 0 ? "Type keyword and press Enter (e.g. GUIDE)" : "+ Add keyword..."}
                  className="flex-1 bg-transparent text-xs text-[#1F1F1F] placeholder-[#999995] focus:outline-none min-w-[140px] uppercase font-mono"
                />
              </div>
            </div>
          </div>

          {/* SECTION 3: COMMENT REPLY */}
          <div className="bg-[#FFFFFF] rounded-2xl sm:rounded-3xl border border-[#E5E5E3] p-6 sm:p-8 space-y-4 shadow-[0_8px_30px_rgba(0,0,0,0.04)]">
            <div className="flex items-center gap-3 border-b border-[#E5E5E3] pb-4">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#1F1F1F] text-white font-bold text-xs">3</span>
              <div>
                <h3 className="text-base font-bold text-[#1F1F1F]">Public Comment Reply</h3>
                <p className="text-xs text-[#6F6F6B]">This is the public reply people see under their comment on Instagram.</p>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold text-[#1F1F1F]">Public Comment Reply Text</Label>
              <Input
                value={formData.commentReply}
                onChange={(e) => setFormData({ ...formData, commentReply: e.target.value })}
                placeholder="e.g. Just sent you a DM! Check your messages 💌"
                className="bg-[#FFFFFF] border-[#E5E5E3] text-[#1F1F1F] text-xs focus:border-[#1F1F1F]"
              />
            </div>
          </div>

          {/* SECTION 4: OPENING MESSAGE */}
          <div className="bg-[#FFFFFF] rounded-2xl sm:rounded-3xl border border-[#E5E5E3] p-6 sm:p-8 space-y-4 shadow-[0_8px_30px_rgba(0,0,0,0.04)]">
            <div className="flex items-center justify-between border-b border-[#E5E5E3] pb-4">
              <div className="flex items-center gap-3">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#1F1F1F] text-white font-bold text-xs">4</span>
                <div>
                  <h3 className="text-base font-bold text-[#1F1F1F]">Opening Message</h3>
                  <p className="text-xs text-[#6F6F6B]">Send a friendly message with a button before sharing your product link.</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setFormData({ ...formData, openingMessageEnabled: !formData.openingMessageEnabled })}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                  formData.openingMessageEnabled ? 'bg-[#1F1F1F]' : 'bg-[#E5E5E3]'
                }`}
              >
                <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition duration-200 ease-in-out ${
                  formData.openingMessageEnabled ? 'translate-x-5' : 'translate-x-0'
                }`} />
              </button>
            </div>

            {formData.openingMessageEnabled ? (
              <div className="space-y-4 pt-2">
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-[#1F1F1F]">Opening DM Message</Label>
                  <Textarea
                    rows={3}
                    value={formData.openingMessage}
                    onChange={(e) => setFormData({ ...formData, openingMessage: e.target.value })}
                    className="bg-[#FFFFFF] border-[#E5E5E3] text-[#1F1F1F] text-xs focus:border-[#1F1F1F]"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold text-[#1F1F1F]">Button Text (CTA Prompt)</Label>
                  <Input
                    value={formData.openingButtonText}
                    onChange={(e) => setFormData({ ...formData, openingButtonText: e.target.value })}
                    className="bg-[#FFFFFF] border-[#E5E5E3] text-[#1F1F1F] text-xs font-bold focus:border-[#1F1F1F]"
                  />
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-[#FBFBFB] border border-[#E5E5E3] text-xs text-[#6F6F6B]">
                ⚡ Opening Message is OFF. Users will receive your product message directly when commenting.
              </div>
            )}
          </div>

          {/* SECTION 5: RESOURCE / PRODUCT MESSAGE */}
          <div className="bg-[#FFFFFF] rounded-2xl sm:rounded-3xl border border-[#E5E5E3] p-6 sm:p-8 space-y-6 shadow-[0_8px_30px_rgba(0,0,0,0.04)]">
            <div className="flex items-center gap-3 border-b border-[#E5E5E3] pb-4">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#1F1F1F] text-white font-bold text-xs">5</span>
              <div>
                <h3 className="text-base font-bold text-[#1F1F1F]">Resource / Product Message</h3>
                <p className="text-xs text-[#6F6F6B]">The private DM containing your product link and access button.</p>
              </div>
            </div>

            {/* Destination Type Choices ONLY */}
            <div className="space-y-3">
              <Label className="text-xs font-bold text-[#1F1F1F]">Destination Type</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Product Card */}
                <div
                  onClick={() => {
                    setFormData((prev) => ({
                      ...prev,
                      destinationType: 'PRODUCT',
                      message: prev.message && prev.message !== "Here's the link you requested 👇" ? prev.message : "Here's the {{product_name}} you requested 👇",
                      buttonText: prev.buttonText && prev.buttonText !== 'Get it here' ? prev.buttonText : 'Get access',
                    }))
                  }}
                  className={`p-5 rounded-2xl border cursor-pointer transition-all space-y-2 ${
                    isProduct
                      ? 'bg-[#F5F5F3] border-[#1F1F1F] shadow-xs'
                      : 'bg-[#FFFFFF] border-[#E5E5E3] hover:border-[#1F1F1F]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">📦</span>
                      <span className="text-sm font-bold text-[#1F1F1F]">Product</span>
                    </div>
                    {isProduct && (
                      <CheckCircle2 className="h-5 w-5 text-[#1F1F1F]" />
                    )}
                  </div>
                  <p className="text-xs text-[#6F6F6B] leading-relaxed">
                    Promote a CreatorStore product/resource
                  </p>
                </div>

                {/* Custom URL Card */}
                <div
                  onClick={() => {
                    setFormData((prev) => ({
                      ...prev,
                      destinationType: 'CUSTOM_URL',
                      message: prev.message && prev.message !== "Here's the {{product_name}} you requested 👇" ? prev.message : "Here's the link you requested 👇",
                      buttonText: prev.buttonText && prev.buttonText !== 'Get access' ? prev.buttonText : 'Get it here',
                    }))
                  }}
                  className={`p-5 rounded-2xl border cursor-pointer transition-all space-y-2 ${
                    isCustomUrl
                      ? 'bg-[#F5F5F3] border-[#1F1F1F] shadow-xs'
                      : 'bg-[#FFFFFF] border-[#E5E5E3] hover:border-[#1F1F1F]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">🔗</span>
                      <span className="text-sm font-bold text-[#1F1F1F]">Custom URL</span>
                    </div>
                    {isCustomUrl && (
                      <CheckCircle2 className="h-5 w-5 text-[#1F1F1F]" />
                    )}
                  </div>
                  <p className="text-xs text-[#6F6F6B] leading-relaxed">
                    Send users to any URL
                  </p>
                </div>
              </div>
            </div>

            {/* CONDITIONAL CONTENT BASED ON DESTINATION SELECTION */}
            {isProduct && (
              <div className="space-y-5 pt-4 border-t border-[#E5E5E3]">
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-[#1F1F1F]">Select Product</Label>
                  {publishedProducts.length === 0 ? (
                    <p className="text-xs text-[#D97706] bg-[#D97706]/10 p-3 rounded-xl border border-[#D97706]/20">
                      No published products found. Please publish a product in CreatorStore first.
                    </p>
                  ) : (
                    <Popover open={productSelectOpen} onOpenChange={setProductSelectOpen}>
                      <PopoverTrigger asChild>
                        <button
                          type="button"
                          role="combobox"
                          aria-expanded={productSelectOpen}
                          className="w-full h-12 bg-[#FFFFFF] border border-[#E5E5E3] hover:border-[#1F1F1F] focus:border-[#1F1F1F] focus:outline-none rounded-xl px-4 flex items-center justify-between text-xs transition-all cursor-pointer shadow-xs"
                        >
                          {selectedProductObj ? (
                            <div className="flex items-center justify-between w-full pr-2">
                              <div className="flex items-center gap-2.5 min-w-0">
                                <span className="text-base shrink-0">📦</span>
                                <span className="font-bold text-[#1F1F1F] text-sm truncate">{selectedProductObj.title}</span>
                              </div>
                              <span className="font-bold text-[#1F1F1F] text-xs shrink-0 ml-2">
                                {Number(selectedProductObj.price || 0) === 0 ? 'Free' : `₹${selectedProductObj.price}`}
                              </span>
                            </div>
                          ) : (
                            <span className="text-[#6F6F6B] text-xs font-medium">Select a product...</span>
                          )}
                          <ChevronDown className={`h-4 w-4 text-[#6F6F6B] shrink-0 transition-transform duration-200 ${productSelectOpen ? 'rotate-180 text-[#1F1F1F]' : ''}`} />
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[--radix-popover-trigger-width] min-w-[280px] sm:min-w-[340px] p-0 bg-[#FFFFFF] border border-[#E5E5E3] rounded-xl shadow-[0_10px_30px_rgba(0,0,0,0.08)] z-50 overflow-hidden" align="start">
                        <Command className="bg-[#FFFFFF] text-[#1F1F1F] border-none">
                          <CommandInput
                            placeholder="Search products..."
                            className="h-11 text-xs text-[#1F1F1F] placeholder-[#999995] border-b border-[#E5E5E3] focus:ring-0 focus:outline-none"
                          />
                          <CommandList className="max-h-60 overflow-y-auto p-1.5 space-y-1">
                            <CommandEmpty className="py-4 text-center text-xs text-[#6F6F6B]">
                              No products found.
                            </CommandEmpty>
                            <CommandGroup>
                              {publishedProducts.map((prod) => {
                                const isSelected = formData.productId === prod.id
                                const isFree = Number(prod.price || 0) === 0
                                return (
                                  <CommandItem
                                    key={prod.id}
                                    value={`${prod.title} ${prod.id}`}
                                    onSelect={() => {
                                      setFormData((prev) => ({ ...prev, productId: prod.id }))
                                      setProductSelectOpen(false)
                                    }}
                                    className={`flex items-center justify-between px-3 py-2.5 my-0.5 rounded-lg cursor-pointer text-xs transition-all data-[selected=true]:bg-[#F5F5F3] data-[selected=true]:text-[#1F1F1F] ${
                                      isSelected ? 'bg-[#F2F1EF] text-[#1F1F1F] font-bold' : 'text-[#1F1F1F] hover:bg-[#F5F5F3]'
                                    }`}
                                  >
                                    <div className="flex items-center gap-2.5 min-w-0 pr-2">
                                      <div className={`h-4 w-4 rounded-full border flex items-center justify-center shrink-0 ${isSelected ? 'border-[#1F1F1F] bg-[#1F1F1F]' : 'border-[#E5E5E3]'}`}>
                                        {isSelected && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
                                      </div>
                                      <span className="truncate font-bold text-sm text-[#1F1F1F]">{prod.title}</span>
                                    </div>
                                    <span className="text-xs font-bold text-[#1F1F1F] shrink-0">
                                      {isFree ? 'Free' : `₹${prod.price}`}
                                    </span>
                                  </CommandItem>
                                )
                              })}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  )}
                </div>

                {selectedProductObj && (
                  <div className="p-3 rounded-xl bg-[#16A34A]/10 border border-[#16A34A]/20 text-xs font-medium text-[#16A34A]">
                    {Number(selectedProductObj.price || 0) === 0
                      ? '✓ Free resource — users get direct access'
                      : `✓ Paid product (₹${selectedProductObj.price}) — users will continue to checkout`}
                  </div>
                )}

                <div className="space-y-2">
                  <Label className="text-xs font-bold text-[#1F1F1F]">Resource Button Label</Label>
                  <Input
                    value={formData.buttonText}
                    onChange={(e) => setFormData({ ...formData, buttonText: e.target.value })}
                    placeholder="Get access"
                    className="bg-[#FFFFFF] border-[#E5E5E3] text-[#1F1F1F] text-xs font-bold focus:border-[#1F1F1F]"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold text-[#1F1F1F]">Message Card Title</Label>
                  <Textarea
                    rows={2}
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    placeholder="Here's the {{product_name}} you requested 👇"
                    className="bg-[#FFFFFF] border-[#E5E5E3] text-[#1F1F1F] text-xs focus:border-[#1F1F1F]"
                  />
                </div>
              </div>
            )}

            {isCustomUrl && (
              <div className="space-y-5 pt-4 border-t border-[#E5E5E3]">
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-[#1F1F1F]">Destination URL</Label>
                  <Input
                    type="url"
                    value={formData.customUrl}
                    onChange={(e) => setFormData({ ...formData, customUrl: e.target.value })}
                    placeholder="https://example.com/your-link"
                    className="bg-[#FFFFFF] border-[#E5E5E3] text-[#1F1F1F] text-xs font-mono focus:border-[#1F1F1F]"
                  />
                  <p className="text-[11px] text-[#6F6F6B]">Users will be directed straight to this link when tapping the DM button.</p>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold text-[#1F1F1F]">Button Label</Label>
                  <Input
                    value={formData.buttonText}
                    onChange={(e) => setFormData({ ...formData, buttonText: e.target.value })}
                    placeholder="Get it here"
                    className="bg-[#FFFFFF] border-[#E5E5E3] text-[#1F1F1F] text-xs font-bold focus:border-[#1F1F1F]"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold text-[#1F1F1F]">Message Card Title</Label>
                  <Textarea
                    rows={2}
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    placeholder="Here's the link you requested 👇"
                    className="bg-[#FFFFFF] border-[#E5E5E3] text-[#1F1F1F] text-xs focus:border-[#1F1F1F]"
                  />
                </div>
              </div>
            )}

          </div>

          {/* SECTION 6: ADD RESPONSE & STEPS */}
          <div className="bg-[#FFFFFF] rounded-2xl sm:rounded-3xl border border-[#E5E5E3] p-6 sm:p-8 space-y-4 shadow-[0_8px_30px_rgba(0,0,0,0.04)]">
            <div className="flex items-center justify-between border-b border-[#E5E5E3] pb-4">
              <div className="flex items-center gap-3">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#1F1F1F] text-white font-bold text-xs">6</span>
                <div>
                  <h3 className="text-base font-bold text-[#1F1F1F]">Additional Response Steps</h3>
                  <p className="text-xs text-[#6F6F6B]">Add card messages, follow-up texts, or visual cards to your flow.</p>
                </div>
              </div>
              <Button
                type="button"
                onClick={() => setResponseModalOpen(true)}
                variant="outline"
                className="border-[#E5E5E3] text-[#1F1F1F] hover:bg-[#F5F5F3] text-xs font-bold rounded-full"
              >
                <Plus className="h-4 w-4 mr-1" /> Add Response
              </Button>
            </div>

            {formData.responses && formData.responses.length > 0 ? (
              <div className="space-y-3">
                {formData.responses.map((resp, idx) => (
                  <div key={resp.id} className="p-4 rounded-xl bg-[#FBFBFB] border border-[#E5E5E3] flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <span className="h-6 w-6 rounded-full bg-[#FFFFFF] border border-[#E5E5E3] text-[#1F1F1F] text-xs font-bold flex items-center justify-center">
                        {idx + 1}
                      </span>
                      <div>
                        <h4 className="text-xs font-bold text-[#1F1F1F]">{resp.title}</h4>
                        <p className="text-[11px] text-[#6F6F6B]">{resp.text || 'Configured message response step'}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveResponseStep(resp.id)}
                      className="p-1.5 text-[#DC2626] hover:text-[#B91C1C] rounded-lg hover:bg-[#DC2626]/10 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-[#6F6F6B]">No additional response steps configured. Click "+ Add Response" to expand your sequence.</p>
            )}
          </div>

        </div>

        {/* Right Sidebar Column: Visual Flow Summary & Live DM Preview */}
        <div className="lg:col-span-4 space-y-6">

          <div className="bg-[#FFFFFF] rounded-2xl sm:rounded-3xl border border-[#E5E5E3] p-6 space-y-4 shadow-[0_8px_30px_rgba(0,0,0,0.04)] sticky top-6">
            <div className="flex items-center gap-2 border-b border-[#E5E5E3] pb-3">
              <Zap className="h-5 w-5 text-[#1F1F1F]" />
              <h3 className="text-sm font-bold text-[#1F1F1F] uppercase tracking-wider">Automation Summary</h3>
            </div>

            <div className="space-y-4 text-xs">
              <div className="space-y-1">
                <span className="text-[11px] font-bold text-[#6F6F6B] uppercase">WHEN SOMEONE COMMENTS</span>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {formData.keywords.map(k => (
                    <span key={k} className="px-2 py-0.5 rounded bg-[#F5F5F3] border border-[#E5E5E3] text-[#1F1F1F] font-mono font-bold text-[11px]">
                      "{k}"
                    </span>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-[11px] font-bold text-[#6F6F6B] uppercase">ON INSTAGRAM CONTENT</span>
                <div className="p-2.5 rounded-xl bg-[#FBFBFB] border border-[#E5E5E3] text-[#1F1F1F] font-bold text-xs flex items-center gap-2">
                  <Video className="h-4 w-4 text-[#1F1F1F]" />
                  <span className="line-clamp-1">{formData.mediaCaption || 'All Posts & Reels'}</span>
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t border-[#E5E5E3]">
                <span className="text-[11px] font-bold text-[#6F6F6B] uppercase">EXECUTION STEPS</span>
                
                <ol className="space-y-2 text-xs">
                  <li className="flex items-start gap-2 text-[#1F1F1F]">
                    <span className="h-4 w-4 rounded-full bg-[#1F1F1F] text-white font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">1</span>
                    <span>Post public comment reply: <strong className="text-[#16A34A]">"{formData.commentReply}"</strong></span>
                  </li>

                  {formData.openingMessageEnabled && (
                    <li className="flex items-start gap-2 text-[#1F1F1F]">
                      <span className="h-4 w-4 rounded-full bg-[#1F1F1F] text-white font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">2</span>
                      <span>Send opening DM with button <strong className="text-[#1F1F1F]">"{formData.openingButtonText}"</strong></span>
                    </li>
                  )}

                  <li className="flex items-start gap-2 text-[#1F1F1F]">
                    <span className="h-4 w-4 rounded-full bg-[#1F1F1F] text-white font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                      {formData.openingMessageEnabled ? '3' : '2'}
                    </span>
                    <span>
                      Send DM card with button <strong className="text-[#1F1F1F]">"{formData.buttonText || (formData.destinationType === 'CUSTOM_LINK' ? 'Get it here' : 'Get access')}"</strong>
                    </span>
                  </li>

                  <li className="flex items-start gap-2 text-[#6F6F6B]">
                    <span className="h-4 w-4 rounded-full bg-[#F2F1EF] text-[#1F1F1F] font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">➔</span>
                    <span>
                      Destination: <strong className="text-[#1F1F1F]">
                        {formData.destinationType === 'CUSTOM_LINK' ? 'Custom Link' : (selectedProductObj && Number(selectedProductObj.price || 0) === 0 ? 'Free Product Access' : 'Paid Product Checkout')}
                      </strong>
                    </span>
                  </li>
                </ol>
              </div>

              {/* Instagram Live DM Mock Preview */}
              <div className="pt-4 border-t border-[#E5E5E3] space-y-2">
                <span className="text-[11px] font-bold text-[#6F6F6B] uppercase flex items-center gap-1">
                  <MessageCircle className="h-3.5 w-3.5 text-[#1F1F1F]" /> Live DM Card Preview
                </span>

                <div className="p-4 rounded-2xl bg-[#FBFBFB] border border-[#E5E5E3] space-y-3 font-sans">
                  <div className="flex items-center gap-2 border-b border-[#E5E5E3] pb-2">
                    <div className="h-6 w-6 rounded-full bg-[#1F1F1F] flex items-center justify-center text-white font-bold text-[10px]">
                      CS
                    </div>
                    <span className="text-xs font-bold text-[#1F1F1F]">CreatorStore Account</span>
                  </div>

                  <div className="bg-[#FFFFFF] p-3.5 rounded-xl text-xs text-[#1F1F1F] space-y-3 border border-[#E5E5E3] shadow-xs">
                    <p className="font-bold text-xs">
                      {formData.destinationType === 'CUSTOM_LINK'
                        ? (formData.message.trim() ? formData.message : "Here's the link you requested 👇")
                        : (formData.message.trim()
                            ? formData.message.replace(/\{\{\s*product_name\s*\}\}/g, selectedProductObj?.title || 'Resource')
                            : `Here's the ${selectedProductObj?.title || 'resource'} you requested 👇`)}
                    </p>

                    <div className="pt-2 border-t border-[#E5E5E3]">
                      <button className="w-full py-2 rounded-xl bg-[#1F1F1F] hover:bg-[#000000] text-white font-bold text-xs shadow-xs transition-colors flex items-center justify-center gap-1">
                        <span>{formData.buttonText || (formData.destinationType === 'CUSTOM_LINK' ? 'Get it here' : 'Get access')}</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>

        </div>

      </div>

      {/* Modals */}
      <InstagramMediaSelectorModal
        isOpen={mediaModalOpen}
        onClose={() => setMediaModalOpen(false)}
        selectedMediaId={formData.mediaId}
        onSelectMedia={(media) => {
          setFormData((prev) => ({
            ...prev,
            mediaId: media.id,
            mediaType: media.mediaType,
            mediaUrl: media.mediaUrl,
            mediaCaption: media.caption,
          }))
        }}
      />

      <AddResponseModal
        isOpen={responseModalOpen}
        onClose={() => setResponseModalOpen(false)}
        onAddResponse={handleAddResponseStep}
      />

      <ConnectInstagramModal
        open={connectModalOpen}
        onOpenChange={setConnectModalOpen}
        returnUrl={`/dashboard/automations/${id}`}
      />

    </div>
  )
}
