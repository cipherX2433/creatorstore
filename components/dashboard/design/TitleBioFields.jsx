'use client'

import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

export const BIO_MAX = 160

export default function TitleBioFields({ title, bio, onTitleChange, onBioChange }) {
  const bioValue = bio || ''
  return (
    <>
      <div className="space-y-1.5">
        <span className="text-label text-content-primary">Title</span>
        <Input
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          className="bg-surface-raised border-edge text-content-primary text-body rounded-control"
        />
      </div>
      <div className="space-y-1.5">
        <span className="text-label text-content-primary">Bio</span>
        <div className="relative">
          <Textarea
            value={bioValue}
            maxLength={BIO_MAX}
            placeholder="Add a short bio"
            rows={3}
            onChange={(e) => onBioChange(e.target.value.slice(0, BIO_MAX))}
            className="bg-surface-raised border-edge text-content-primary text-body rounded-control resize-none pr-14 pb-6"
          />
          <span className="absolute bottom-2 right-2 text-micro text-content-muted">
            {bioValue.length}/{BIO_MAX}
          </span>
        </div>
      </div>
    </>
  )
}
