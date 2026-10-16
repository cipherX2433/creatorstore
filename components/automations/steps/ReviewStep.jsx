'use client'

import { MessageCircle, Video } from 'lucide-react'

export default function ReviewStep({ formData, selectedProductObj, onEdit }) {
  const isCustomUrl = formData.destinationType === 'CUSTOM_LINK' || formData.destinationType === 'CUSTOM_URL'
  const isProduct = formData.destinationType === 'PRODUCT'

  const previewMessage = isCustomUrl
    ? (formData.message.trim() ? formData.message : "Here's the link you requested 👇")
    : isProduct
      ? (formData.message.trim()
        ? formData.message.replace(/\{\{\s*product_name\s*\}\}/g, selectedProductObj?.title || 'Resource')
        : `Here's the ${selectedProductObj?.title || 'resource'} you requested 👇`)
      : 'Select a destination to preview'

  return (
    <div className="flex flex-col gap-stack">
      <div>
        <h2 className="text-section text-content-primary">Review & Activate</h2>
        <p className="text-meta text-content-muted mt-1">Confirm the flow, then save as a draft or activate.</p>
      </div>

      <section className="p-card rounded-card bg-surface-raised border border-edge flex flex-col gap-field">
        <div className="flex items-center justify-between">
          <p className="text-label text-content-muted">Trigger</p>
          <button type="button" onClick={() => onEdit(1)} className="text-meta text-brand hover:text-brand-hover">Edit</button>
        </div>
        <p className="text-body text-content-primary">{formData.mediaCaption || 'All Posts & Reels'}</p>
        <div className="flex flex-wrap gap-2">
          {formData.keywords.map((k) => (
            <span key={k} className="px-2 py-0.5 rounded-chip border border-edge text-meta text-content-secondary font-mono">
              {k}
            </span>
          ))}
        </div>
      </section>

      <section className="p-card rounded-card bg-surface-raised border border-edge flex flex-col gap-field">
        <div className="flex items-center justify-between">
          <p className="text-label text-content-muted">Public reply</p>
          <button type="button" onClick={() => onEdit(2)} className="text-meta text-brand hover:text-brand-hover">Edit</button>
        </div>
        <p className="text-body text-content-primary">{formData.commentReply || '—'}</p>
      </section>

      <section className="p-card rounded-card bg-surface-raised border border-edge flex flex-col gap-field">
        <div className="flex items-center justify-between">
          <p className="text-label text-content-muted">DM sequence</p>
          <button type="button" onClick={() => onEdit(3)} className="text-meta text-brand hover:text-brand-hover">Edit</button>
        </div>
        <p className="text-body text-content-secondary">
          Opening message: {formData.openingMessageEnabled ? 'On' : 'Off'}
        </p>
        <p className="text-body text-content-primary">
          Destination:{' '}
          {isCustomUrl
            ? 'Custom URL'
            : isProduct
              ? (selectedProductObj && Number(selectedProductObj.price || 0) === 0 ? 'Free product access' : (selectedProductObj?.title || 'Product checkout'))
              : 'Not selected'}
        </p>
        <p className="text-body text-content-secondary">Button: {formData.buttonText || (isCustomUrl ? 'Get it here' : 'Get access')}</p>
        {formData.responses?.length > 0 && (
          <p className="text-body text-content-secondary">{formData.responses.length} additional response step{formData.responses.length === 1 ? '' : 's'}</p>
        )}
      </section>

      <section className="p-card rounded-card bg-surface-raised border border-edge flex flex-col gap-field">
        <p className="text-label text-content-muted flex items-center gap-1">
          <MessageCircle className="h-3.5 w-3.5" /> Live DM card preview
        </p>
        <div className="p-card rounded-control bg-surface-card border border-edge flex flex-col gap-field">
          <div className="flex items-center gap-inline border-b border-edge pb-2">
            <div className="h-6 w-6 rounded-full bg-brand text-brand-fg flex items-center justify-center text-micro">CS</div>
            <span className="text-label text-content-primary">CreatorStore Account</span>
          </div>
          <p className="text-body text-content-primary">{previewMessage}</p>
          <div className="w-full py-2 rounded-control bg-brand text-brand-fg text-label text-center">
            {formData.buttonText || (isCustomUrl ? 'Get it here' : 'Get access')}
          </div>
        </div>
        <p className="text-meta text-content-muted flex items-center gap-1">
          <Video className="h-3.5 w-3.5" /> On: {formData.mediaCaption || 'All Posts & Reels'}
        </p>
      </section>
    </div>
  )
}
