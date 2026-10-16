'use client'

import { useRef, useState } from 'react'
import { Pencil, User } from 'lucide-react'
import { toast } from 'sonner'
import { BaseModal } from '@/components/ui/base-modal'
import { api } from '@/lib/clientApi'

export default function ProfileImageModal({ open, onOpenChange, avatarUrl, store, onSaved }) {
  const inputRef = useRef(null)
  const [preview, setPreview] = useState(avatarUrl || '')
  const [uploading, setUploading] = useState(false)

  async function onFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await api.upload('/upload', fd)
      if (!res?.url) throw new Error('Upload failed')
      const theme = { ...(store?.theme || {}), avatarUrl: res.url }
      await Promise.all([
        api.patch('/store', { avatarUrl: res.url, theme }),
        api.patch('/me/profile', { avatarUrl: res.url }),
      ])
      setPreview(res.url)
      toast.success('Profile image updated')
      onSaved?.(res.url)
      onOpenChange(false)
    } catch (err) {
      toast.error(err.message || 'Upload failed')
    } finally {
      setUploading(false)
      if (e.target) e.target.value = ''
    }
  }

  return (
    <BaseModal
      open={open}
      onOpenChange={onOpenChange}
      title="Add your profile image"
      secondaryLabel="Cancel"
      onSecondary={() => onOpenChange(false)}
      primaryLabel={uploading ? 'Uploading…' : 'Upload image'}
      onPrimary={() => inputRef.current?.click()}
      primaryDisabled={uploading}
      primaryLoading={uploading}
      className="sm:max-w-sm"
    >
      <div className="flex flex-col items-center gap-4">
        <div className="relative h-24 w-24">
          <div className="h-24 w-24 rounded-full overflow-hidden border border-white/[0.08] bg-[#232323] flex items-center justify-center">
            {preview ? (
              <img src={preview} alt="" className="h-full w-full object-cover" />
            ) : (
              <User className="h-10 w-10 text-[#96969D]" />
            )}
          </div>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="absolute -bottom-0.5 -right-0.5 h-8 w-8 rounded-full bg-[#1A1A1A] border border-white/[0.08] flex items-center justify-center cursor-pointer"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={onFile} />
        </div>
      </div>
    </BaseModal>
  )
}
