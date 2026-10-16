'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { BaseModal } from '@/components/ui/base-modal'
import { TextInput } from '@/components/ui/text-input'
import { api } from '@/lib/clientApi'

function normalizeUrl(raw) {
  const t = String(raw || '').trim()
  if (!t) return ''
  if (/^https?:\/\//i.test(t)) return t
  return `https://${t}`
}

export default function AddFirstItemModal({ open, onOpenChange, store, onSaved }) {
  const [title, setTitle] = useState('')
  const [url, setUrl] = useState('')
  const [saving, setSaving] = useState(false)

  async function save() {
    const href = normalizeUrl(url)
    if (!href || !title.trim()) return
    setSaving(true)
    try {
      const current = (await api.get('/store'))?.store || store || {}
      const sections = Array.isArray(current.sections) ? [...current.sections] : []
      sections.push({
        id: crypto.randomUUID(),
        type: 'button',
        hidden: false,
        props: { label: title.trim(), url: href, layout: 'classic' },
      })
      await api.patch('/store', { sections })
      toast.success('Link added')
      onSaved?.(sections)
      onOpenChange(false)
      setTitle('')
      setUrl('')
    } catch (err) {
      toast.error(err.message || 'Could not add link')
    } finally {
      setSaving(false)
    }
  }

  return (
    <BaseModal
      open={open}
      onOpenChange={onOpenChange}
      title="Add your first product or link"
      secondaryLabel="Cancel"
      onSecondary={() => onOpenChange(false)}
      primaryLabel={saving ? 'Saving…' : 'Add Link to Store'}
      onPrimary={save}
      primaryDisabled={saving}
      primaryLoading={saving}
    >
      <div className="space-y-3">
        <TextInput
          label="Link title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Link title"
        />
        <TextInput
          label="URL"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://"
        />
      </div>
    </BaseModal>
  )
}
