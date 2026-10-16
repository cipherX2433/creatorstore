'use client'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function PublicReplyStep({ formData, setFormData }) {
  return (
    <div className="flex flex-col gap-stack">
      <div>
        <h2 className="text-section text-content-primary">Public Reply</h2>
        <p className="text-meta text-content-muted mt-1">
          This is the public reply people see under their comment on Instagram.
        </p>
      </div>

      <div className="flex flex-col gap-field">
        <Label className="text-label text-content-secondary">Public Comment Reply Text</Label>
        <Input
          value={formData.commentReply}
          onChange={(e) => setFormData({ ...formData, commentReply: e.target.value })}
          placeholder="e.g. Just sent you a DM! Check your messages 💌"
          className="bg-surface-raised border-edge text-content-primary text-body rounded-control"
        />
        <p className="text-meta text-content-muted">
          Publicly posted directly under the user&apos;s comment to boost engagement.
        </p>
      </div>

      <div className="p-card rounded-card bg-surface-raised border border-edge flex flex-col gap-field">
        <p className="text-label text-content-muted">Preview</p>
        <div className="flex items-start gap-inline">
          <div className="h-8 w-8 rounded-full bg-brand text-brand-fg flex items-center justify-center text-micro shrink-0">
            CS
          </div>
          <div className="min-w-0">
            <p className="text-label text-content-primary">you</p>
            <p className="text-body text-content-secondary">link please</p>
            <p className="text-body text-content-primary mt-1">
              {formData.commentReply || 'Your public reply will appear here'}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
