'use client'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Image as ImageIcon, Video, X } from 'lucide-react'

export default function TriggerStep({
  formData,
  keywordInput,
  setKeywordInput,
  onAddKeyword,
  onKeywordBlur,
  onRemoveKeyword,
  onOpenMediaPicker,
}) {
  return (
    <div className="flex flex-col gap-stack">
      <div>
        <h2 className="text-section text-content-primary">Trigger</h2>
        <p className="text-meta text-content-muted mt-1">
          Choose where comments should fire this automation, then add the keywords to watch for.
        </p>
      </div>

      <div className="flex flex-col gap-field">
        <Label className="text-label text-content-secondary">Select a Post or Reel</Label>
        {formData.mediaId && formData.mediaId !== 'ALL' ? (
          <div className="p-card rounded-control bg-surface-raised border border-edge flex items-center justify-between gap-inline">
            <div className="flex items-center gap-inline min-w-0">
              {formData.mediaUrl ? (
                <img src={formData.mediaUrl} alt="" className="h-12 w-12 rounded-control object-cover shrink-0" />
              ) : (
                <div className="h-12 w-12 rounded-control bg-surface-hover flex items-center justify-center text-brand shrink-0">
                  {formData.mediaType === 'REEL' ? <Video className="h-5 w-5" /> : <ImageIcon className="h-5 w-5" />}
                </div>
              )}
              <div className="min-w-0">
                <p className="text-card-title text-content-primary truncate">{formData.mediaCaption || 'Selected Instagram Media'}</p>
                <p className="text-meta text-content-muted">{formData.mediaType}</p>
              </div>
            </div>
            <Button type="button" variant="outline" onClick={onOpenMediaPicker} className="rounded-control border-edge text-content-primary shrink-0">
              Change
            </Button>
          </div>
        ) : (
          <button
            type="button"
            onClick={onOpenMediaPicker}
            className="p-card rounded-control bg-surface-raised border border-dashed border-edge hover:bg-surface-hover text-left"
          >
            <p className="text-card-title text-content-primary">Any Post or Reel</p>
            <p className="text-meta text-content-muted">Default. Click to pick a specific post or reel.</p>
          </button>
        )}
      </div>

      <div className="flex flex-col gap-field">
        <Label className="text-label text-content-secondary">Comment Keywords</Label>
        <div className="p-3 bg-surface-raised border border-edge rounded-control flex flex-wrap items-center gap-2 min-h-[52px]">
          {formData.keywords.map((kw) => (
            <span
              key={kw}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-chip bg-surface-card border border-brand text-meta font-mono text-brand-yellow"
            >
              {kw}
              <button type="button" onClick={() => onRemoveKeyword(kw)} className="text-content-muted hover:text-content-primary" aria-label={`Remove ${kw}`}>
                <X className="h-3.5 w-3.5" />
              </button>
            </span>
          ))}
          <input
            type="text"
            value={keywordInput}
            onChange={(e) => setKeywordInput(e.target.value)}
            onKeyDown={onAddKeyword}
            onBlur={onKeywordBlur}
            placeholder={formData.keywords.length === 0 ? 'Type keyword and press Enter (e.g. GUIDE)' : '+ Add keyword...'}
            className="flex-1 bg-transparent text-body text-content-primary placeholder:text-content-muted focus:outline-none min-w-[140px] uppercase font-mono"
          />
        </div>
        <p className="text-meta text-content-muted">Type a keyword and press Enter or comma.</p>
      </div>
    </div>
  )
}
