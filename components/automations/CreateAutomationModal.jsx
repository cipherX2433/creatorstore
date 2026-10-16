'use client'

import { useEffect, useState } from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { toast } from 'sonner'
import { api } from '@/lib/clientApi'
import { Button } from '@/components/ui/button'
import { Dialog, DialogOverlay, DialogPortal, DialogTitle } from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import TriggerStep from '@/components/automations/steps/TriggerStep'
import PostReelPicker from '@/components/automations/steps/PostReelPicker'
import AddResponsePicker from '@/components/automations/steps/AddResponsePicker'
import PublicReplyStep from '@/components/automations/steps/PublicReplyStep'
import DmSequenceStep from '@/components/automations/steps/DmSequenceStep'
import ReviewStep from '@/components/automations/steps/ReviewStep'
import ConnectInstagramModal from '@/components/automations/ConnectInstagramModal'
import { Loader2, Sparkles, X } from 'lucide-react'

const STEPS = [
  { id: 1, label: 'Trigger' },
  { id: 2, label: 'Reply' },
  { id: 3, label: 'DMs' },
  { id: 4, label: 'Review' },
]

const INITIAL_FORM = {
  name: 'Instagram Comment Campaign',
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
  message: "Here's the {{product_name}} you requested 👇",
  buttonText: 'Get access',
  responses: [],
  status: 'ACTIVE',
}

export default function CreateAutomationModal({ open, onOpenChange, productId, onCreated }) {
  const [step, setStep] = useState(1)
  const [dirty, setDirty] = useState(false)
  const [confirmClose, setConfirmClose] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [connectModalOpen, setConnectModalOpen] = useState(false)
  const [igAccount, setIgAccount] = useState({ connected: false })
  const [products, setProducts] = useState([])
  const [modalView, setModalView] = useState('step')
  const [productSelectOpen, setProductSelectOpen] = useState(false)
  const [keywordInput, setKeywordInput] = useState('')
  const [formData, setFormDataRaw] = useState(INITIAL_FORM)

  function setFormData(next) {
    setDirty(true)
    setFormDataRaw(next)
  }

  useEffect(() => {
    if (!open) {
      setModalView('step')
      setConfirmClose(false)
      return
    }
    setStep(1)
    setModalView('step')
    setDirty(false)
    setKeywordInput('')
    setFormDataRaw(INITIAL_FORM)
    fetchInitialData()
  }, [open, productId])

  async function fetchInitialData() {
    setLoading(true)
    try {
      const [igRes, productsRes] = await Promise.all([
        api.get('/integrations/instagram/account').catch(() => ({ connected: false })),
        api.get('/products'),
      ])

      setIgAccount(igRes || { connected: false })
      const productList = Array.isArray(productsRes)
        ? productsRes
        : (productsRes?.products || productsRes?.items || [])

      setProducts(productList)

      if (productList.length > 0) {
        const targetProduct = (productId && productList.find((p) => p.id === productId))
          || productList.find((p) => p.status === 'PUBLISHED')
          || productList[0]

        setFormDataRaw((prev) => ({
          ...prev,
          destinationType: 'PRODUCT',
          productId: targetProduct.id,
        }))
      }
    } catch (err) {
      console.error('Failed to load initial data:', err)
      toast.error('Failed to load products or Instagram status')
    } finally {
      setLoading(false)
    }
  }

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

      if (duplicateFound && showToastOnDuplicate && !addedAny) {
        toast.error('Keyword already added')
      }

      return { ...prev, keywords: newKeywords }
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

  function handleAddResponseStep(type) {
    const newStep = {
      id: `resp_${Date.now()}`,
      type,
      title: type === 'CARD' ? 'Card Message' : type === 'TEXT' ? 'Text Message' : 'Image Message',
      enabled: true,
      text: type === 'TEXT' ? 'Check out this additional resource!' : '',
      imageUrl: type === 'IMAGE' || type === 'CARD' ? 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=500' : '',
      buttonText: 'Learn More',
    }
    setFormData((prev) => ({
      ...prev,
      responses: [...(prev.responses || []), newStep],
    }))
    toast.success(`${newStep.title} added!`)
    setModalView('step')
  }

  function handleRemoveResponseStep(id) {
    setFormData((prev) => ({
      ...prev,
      responses: (prev.responses || []).filter((r) => r.id !== id),
    }))
  }

  function validateCustomUrl(urlStr) {
    if (!urlStr || !urlStr.trim()) return { valid: false, message: 'Enter a Destination URL' }
    const trimmed = urlStr.trim()
    if (!trimmed.toLowerCase().startsWith('https://')) {
      return { valid: false, message: 'Custom URL must start with https://' }
    }
    try {
      const parsed = new URL(trimmed)
      const hostname = parsed.hostname.toLowerCase()
      if (
        hostname === 'localhost' ||
        hostname === '127.0.0.1' ||
        hostname === '0.0.0.0' ||
        hostname.startsWith('192.168.') ||
        hostname.startsWith('10.') ||
        hostname.startsWith('172.16.') ||
        hostname.endsWith('.local')
      ) {
        return { valid: false, message: 'Local or internal IP addresses are not allowed' }
      }
    } catch {
      return { valid: false, message: 'Enter a valid HTTPS URL' }
    }
    return { valid: true }
  }

  async function handleSubmit(statusToSet = 'ACTIVE') {
    if (!formData.name.trim()) return toast.error('Enter an automation name')
    if (!formData.keywords || formData.keywords.length === 0) return toast.error('Add at least one keyword (e.g. GUIDE)')

    if (!formData.destinationType) {
      return toast.error('Select a destination type (Product or Custom URL)')
    }

    if (formData.destinationType === 'CUSTOM_LINK' || formData.destinationType === 'CUSTOM_URL') {
      const check = validateCustomUrl(formData.customUrl)
      if (!check.valid) return toast.error(check.message)
      if (!formData.buttonText.trim()) return toast.error('Enter button text for your custom link')
    } else {
      if (!formData.productId) return toast.error('Select a product to promote')
    }

    if (!formData.message.trim()) return toast.error('Enter a resource DM message')

    if (statusToSet === 'ACTIVE' && !igAccount.connected) {
      setConnectModalOpen(true)
      return
    }

    setSaving(true)
    try {
      const payloadDestinationType = (formData.destinationType === 'CUSTOM_LINK' || formData.destinationType === 'CUSTOM_URL')
        ? 'CUSTOM_LINK'
        : 'PRODUCT'

      await api.post('/automations', {
        ...formData,
        destinationType: payloadDestinationType,
        triggerValue: formData.keywords.join(', '),
        status: statusToSet,
      })
      toast.success(`Automation ${statusToSet === 'ACTIVE' ? 'activated' : 'saved as draft'}!`)
      onOpenChange(false)
      onCreated?.()
    } catch (err) {
      if (err.code === 'INSTAGRAM_NOT_CONNECTED' || err.status === 403) {
        setConnectModalOpen(true)
      } else {
        toast.error(err.message || 'Failed to create automation')
      }
    } finally {
      setSaving(false)
    }
  }

  function requestClose() {
    if (dirty) setConfirmClose(true)
    else onOpenChange(false)
  }

  function handleDialogOpenChange(nextOpen) {
    if (!nextOpen) requestClose()
    else onOpenChange(true)
  }

  function goNext() {
    if (step === 1 && (!formData.keywords || formData.keywords.length === 0)) {
      return toast.error('Add at least one keyword (e.g. GUIDE)')
    }
    setStep((s) => Math.min(4, s + 1))
  }

  const publishedProducts = products.filter((p) => !p.status || p.status === 'PUBLISHED')
  const selectedProductObj = publishedProducts.find((p) => p.id === formData.productId) || products.find((p) => p.id === formData.productId)

  return (
    <>
      <Dialog open={open} onOpenChange={handleDialogOpenChange}>
        <DialogPortal>
          <DialogOverlay className="!bg-surface-overlay/80" />
          <DialogPrimitive.Content
            aria-describedby={undefined}
            className="fixed z-50 flex flex-col w-full max-h-[90vh] bg-surface-card shadow-modal border border-edge text-content-primary overflow-hidden
              inset-x-0 bottom-0 rounded-t-sheet
              md:inset-auto md:left-[50%] md:top-[50%] md:bottom-auto md:translate-x-[-50%] md:translate-y-[-50%] md:max-w-2xl md:max-h-[85vh] md:rounded-modal"
          >
            <div className="flex items-center justify-between p-card sm:p-card-lg border-b border-edge bg-surface-raised shrink-0">
              <DialogTitle className="text-section text-content-primary">Create Instagram Automation</DialogTitle>
              <button
                type="button"
                onClick={requestClose}
                className="p-1 rounded-control text-content-muted hover:text-content-primary hover:bg-surface-hover"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex items-center justify-center gap-2 px-card py-3 border-b border-edge shrink-0">
              {STEPS.map((s) => {
                const complete = s.id < step
                const current = s.id === step
                const canJump = s.id <= step
                return (
                  <button
                    key={s.id}
                    type="button"
                    disabled={!canJump}
                    onClick={() => {
                      if (!canJump) return
                      setModalView('step')
                      setStep(s.id)
                    }}
                    className="flex items-center gap-2 disabled:cursor-default"
                    aria-label={`${s.label}${current ? ', current step' : complete ? ', completed' : ''}`}
                  >
                    <span
                      className={`h-2 w-2 rounded-full ${
                        complete || current ? 'bg-brand' : 'border border-edge bg-transparent'
                      }`}
                    />
                  </button>
                )
              })}
            </div>

            <div className="flex-1 overflow-y-auto p-card sm:p-card-lg">
              {loading ? (
                <div className="flex h-48 items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-brand" />
                </div>
              ) : modalView === 'picker' ? (
                <PostReelPicker
                  selectedMediaId={formData.mediaId}
                  onBack={() => setModalView('step')}
                  onSelect={(media) => {
                    setFormData((prev) => ({
                      ...prev,
                      mediaId: media.id,
                      mediaType: media.mediaType,
                      mediaUrl: media.mediaUrl,
                      mediaCaption: media.caption,
                    }))
                    setModalView('step')
                  }}
                />
              ) : modalView === 'add-response' ? (
                <AddResponsePicker
                  onBack={() => setModalView('step')}
                  onAdd={handleAddResponseStep}
                />
              ) : (
                <>
                  {step === 1 && (
                    <TriggerStep
                      formData={formData}
                      keywordInput={keywordInput}
                      setKeywordInput={setKeywordInput}
                      onAddKeyword={handleAddKeyword}
                      onKeywordBlur={handleKeywordBlur}
                      onRemoveKeyword={handleRemoveKeyword}
                      onOpenMediaPicker={() => setModalView('picker')}
                    />
                  )}
                  {step === 2 && (
                    <PublicReplyStep formData={formData} setFormData={setFormData} />
                  )}
                  {step === 3 && (
                    <DmSequenceStep
                      formData={formData}
                      setFormData={setFormData}
                      publishedProducts={publishedProducts}
                      selectedProductObj={selectedProductObj}
                      productSelectOpen={productSelectOpen}
                      setProductSelectOpen={setProductSelectOpen}
                      onOpenResponseModal={() => setModalView('add-response')}
                      onRemoveResponseStep={handleRemoveResponseStep}
                    />
                  )}
                  {step === 4 && (
                    <ReviewStep
                      formData={formData}
                      selectedProductObj={selectedProductObj}
                      onEdit={setStep}
                    />
                  )}
                </>
              )}
            </div>

            {modalView === 'step' && (
            <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-field p-card sm:p-card-lg border-t border-edge bg-surface-raised shrink-0">
              <div>
                {step > 1 && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setStep((s) => s - 1)}
                    className="rounded-control border-edge text-content-primary hover:bg-surface-hover"
                  >
                    Back
                  </Button>
                )}
              </div>
              <div className="flex items-center justify-end gap-field">
                {step < 4 ? (
                  <Button
                    type="button"
                    onClick={goNext}
                    className="rounded-control bg-brand text-brand-fg hover:bg-brand-hover active:bg-brand-active"
                  >
                    Next
                  </Button>
                ) : (
                  <>
                    <Button
                      type="button"
                      variant="outline"
                      disabled={saving}
                      onClick={() => handleSubmit('PAUSED')}
                      className="rounded-control border-edge text-content-primary hover:bg-surface-hover"
                    >
                      Save as Draft
                    </Button>
                    <Button
                      type="button"
                      disabled={saving}
                      onClick={() => handleSubmit('ACTIVE')}
                      className="rounded-control bg-brand text-brand-fg hover:bg-brand-hover active:bg-brand-active"
                    >
                      {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
                      Save & Activate
                    </Button>
                  </>
                )}
              </div>
            </div>
            )}
          </DialogPrimitive.Content>
        </DialogPortal>
      </Dialog>

      <AlertDialog open={confirmClose} onOpenChange={setConfirmClose}>
        <AlertDialogContent className="bg-surface-card border-edge text-content-primary rounded-modal">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-section">Discard this automation?</AlertDialogTitle>
            <AlertDialogDescription className="text-meta text-content-muted">
              Your setup will not be saved.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-control border-edge">Keep editing</AlertDialogCancel>
            <AlertDialogAction
              className="rounded-control bg-brand text-brand-fg hover:bg-brand-hover"
              onClick={() => {
                setConfirmClose(false)
                onOpenChange(false)
              }}
            >
              Discard
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ConnectInstagramModal
        open={connectModalOpen}
        onOpenChange={setConnectModalOpen}
        returnUrl="/dashboard/automations?openCreate=1"
      />
    </>
  )
}
