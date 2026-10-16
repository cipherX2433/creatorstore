'use client'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { CheckCircle2, ChevronDown, Plus, Trash2 } from 'lucide-react'

export default function DmSequenceStep({
  formData,
  setFormData,
  publishedProducts,
  selectedProductObj,
  productSelectOpen,
  setProductSelectOpen,
  onOpenResponseModal,
  onRemoveResponseStep,
}) {
  const isCustomUrl = formData.destinationType === 'CUSTOM_LINK' || formData.destinationType === 'CUSTOM_URL'
  const isProduct = formData.destinationType === 'PRODUCT'

  return (
    <div className="flex flex-col gap-stack">
      <div>
        <h2 className="text-section text-content-primary">DM Sequence</h2>
        <p className="text-meta text-content-muted mt-1">
          Optional opening message, then the resource people receive in DMs.
        </p>
      </div>

      <div className="flex items-center justify-between gap-inline">
        <div>
          <p className="text-label text-content-primary">Opening Message</p>
          <p className="text-meta text-content-muted">Send a friendly message before the product link.</p>
        </div>
        <button
          type="button"
          onClick={() => setFormData({ ...formData, openingMessageEnabled: !formData.openingMessageEnabled })}
          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent ${
            formData.openingMessageEnabled ? 'bg-brand' : 'bg-surface-hover'
          }`}
          aria-pressed={formData.openingMessageEnabled}
        >
          <span className={`inline-block h-5 w-5 transform rounded-full bg-brand-fg shadow transition ${
            formData.openingMessageEnabled ? 'translate-x-5' : 'translate-x-0'
          }`} />
        </button>
      </div>

      {formData.openingMessageEnabled ? (
        <div className="flex flex-col gap-stack">
          <div className="flex flex-col gap-field">
            <Label className="text-label text-content-secondary">Opening DM Message</Label>
            <Textarea
              rows={3}
              value={formData.openingMessage}
              onChange={(e) => setFormData({ ...formData, openingMessage: e.target.value })}
              className="bg-surface-raised border-edge text-content-primary text-body rounded-control"
            />
          </div>
          <div className="flex flex-col gap-field">
            <Label className="text-label text-content-secondary">Button Text (CTA Prompt)</Label>
            <Input
              value={formData.openingButtonText}
              onChange={(e) => setFormData({ ...formData, openingButtonText: e.target.value })}
              placeholder="e.g. Send me the link"
              className="bg-surface-raised border-edge text-content-primary text-body rounded-control"
            />
            <p className="text-meta text-content-muted">When they tap this button, they receive your resource message.</p>
          </div>
        </div>
      ) : (
        <p className="text-meta text-content-muted p-card rounded-control bg-surface-raised border border-edge">
          Opening message is off. Users receive your product message directly.
        </p>
      )}

      <div className="flex flex-col gap-field">
        <Label className="text-label text-content-secondary">Destination Type</Label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-stack">
          <button
            type="button"
            onClick={() => {
              setFormData((prev) => ({
                ...prev,
                destinationType: 'PRODUCT',
                message: prev.message && prev.message !== "Here's the link you requested 👇" ? prev.message : "Here's the {{product_name}} you requested 👇",
                buttonText: prev.buttonText && prev.buttonText !== 'Get it here' ? prev.buttonText : 'Get access',
              }))
            }}
            className={`p-card rounded-control border text-left ${
              isProduct ? 'border-brand bg-surface-raised' : 'border-edge bg-surface-raised hover:bg-surface-hover'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-card-title text-content-primary">Product</span>
              {isProduct && <CheckCircle2 className="h-4 w-4 text-brand" />}
            </div>
            <p className="text-meta text-content-muted mt-1">Promote a CreatorStore product</p>
          </button>
          <button
            type="button"
            onClick={() => {
              setFormData((prev) => ({
                ...prev,
                destinationType: 'CUSTOM_URL',
                message: prev.message && prev.message !== "Here's the {{product_name}} you requested 👇" ? prev.message : "Here's the link you requested 👇",
                buttonText: prev.buttonText && prev.buttonText !== 'Get access' ? prev.buttonText : 'Get it here',
              }))
            }}
            className={`p-card rounded-control border text-left ${
              isCustomUrl ? 'border-brand bg-surface-raised' : 'border-edge bg-surface-raised hover:bg-surface-hover'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-card-title text-content-primary">Custom URL</span>
              {isCustomUrl && <CheckCircle2 className="h-4 w-4 text-brand" />}
            </div>
            <p className="text-meta text-content-muted mt-1">Send users to any URL</p>
          </button>
        </div>
      </div>

      {isProduct && (
        <div className="flex flex-col gap-stack">
          <div className="flex flex-col gap-field">
            <Label className="text-label text-content-secondary">Select Product</Label>
            {publishedProducts.length === 0 ? (
              <p className="text-meta text-warning-fg p-card rounded-control bg-warning-subtle">
                No published products found. Publish a product in CreatorStore first.
              </p>
            ) : (
              <Popover open={productSelectOpen} onOpenChange={setProductSelectOpen}>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className="w-full h-12 bg-surface-raised border border-edge hover:bg-surface-hover rounded-control px-4 flex items-center justify-between text-body"
                  >
                    {selectedProductObj ? (
                      <span className="text-content-primary truncate">{selectedProductObj.title}</span>
                    ) : (
                      <span className="text-content-muted">Select a product...</span>
                    )}
                    <ChevronDown className="h-4 w-4 text-content-muted shrink-0" />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0 bg-surface-card border border-edge rounded-control" align="start">
                  <Command className="bg-surface-card text-content-primary border-none">
                    <CommandInput placeholder="Search products..." className="text-body" />
                    <CommandList className="max-h-60">
                      <CommandEmpty className="py-4 text-center text-meta text-content-muted">No products found.</CommandEmpty>
                      <CommandGroup>
                        {publishedProducts.map((prod) => (
                          <CommandItem
                            key={prod.id}
                            value={`${prod.title} ${prod.id}`}
                            onSelect={() => {
                              setFormData((prev) => ({ ...prev, productId: prod.id }))
                              setProductSelectOpen(false)
                            }}
                            className="text-body"
                          >
                            {prod.title}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            )}
          </div>
          <div className="flex flex-col gap-field">
            <Label className="text-label text-content-secondary">Resource Button Label</Label>
            <Input
              value={formData.buttonText}
              onChange={(e) => setFormData({ ...formData, buttonText: e.target.value })}
              placeholder="Get access"
              className="bg-surface-raised border-edge text-content-primary text-body rounded-control"
            />
          </div>
          <div className="flex flex-col gap-field">
            <Label className="text-label text-content-secondary">Message Card Title</Label>
            <Textarea
              rows={2}
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              placeholder="Here's the {{product_name}} you requested 👇"
              className="bg-surface-raised border-edge text-content-primary text-body rounded-control"
            />
          </div>
        </div>
      )}

      {isCustomUrl && (
        <div className="flex flex-col gap-stack">
          <div className="flex flex-col gap-field">
            <Label className="text-label text-content-secondary">Destination URL</Label>
            <Input
              type="url"
              value={formData.customUrl}
              onChange={(e) => setFormData({ ...formData, customUrl: e.target.value })}
              placeholder="https://example.com/your-link"
              className="bg-surface-raised border-edge text-content-primary text-body rounded-control font-mono"
            />
          </div>
          <div className="flex flex-col gap-field">
            <Label className="text-label text-content-secondary">Button Label</Label>
            <Input
              value={formData.buttonText}
              onChange={(e) => setFormData({ ...formData, buttonText: e.target.value })}
              placeholder="Get it here"
              className="bg-surface-raised border-edge text-content-primary text-body rounded-control"
            />
          </div>
          <div className="flex flex-col gap-field">
            <Label className="text-label text-content-secondary">Message Card Title</Label>
            <Textarea
              rows={2}
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              placeholder="Here's the link you requested 👇"
              className="bg-surface-raised border-edge text-content-primary text-body rounded-control"
            />
          </div>
        </div>
      )}

      <div className="flex flex-col gap-stack">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-label text-content-primary">Additional Response Steps</p>
            <p className="text-meta text-content-muted">Optional follow-up cards, texts, or images.</p>
          </div>
          <Button type="button" variant="outline" onClick={onOpenResponseModal} className="rounded-control border-edge text-content-primary">
            <Plus className="h-4 w-4 mr-1" /> Add Response
          </Button>
        </div>
        {formData.responses?.length > 0 ? (
          formData.responses.map((resp, idx) => (
            <div key={resp.id} className="p-card rounded-control bg-surface-raised border border-edge flex items-center justify-between gap-inline">
              <div>
                <p className="text-card-title text-content-primary">{idx + 1}. {resp.title}</p>
                <p className="text-meta text-content-muted">{resp.text || 'Configured message response step'}</p>
              </div>
              <button type="button" onClick={() => onRemoveResponseStep(resp.id)} className="text-error-fg p-1">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))
        ) : (
          <p className="text-meta text-content-muted">No additional response steps configured.</p>
        )}
      </div>
    </div>
  )
}
