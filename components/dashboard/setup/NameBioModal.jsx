'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { BaseModal } from '@/components/ui/base-modal'
import { api } from '@/lib/clientApi'
import TitleBioFields from '@/components/dashboard/design/TitleBioFields'

export default function NameBioModal({ open, onOpenChange, profile, store, onSaved }) {
  const theme = store?.theme || {}
  const [title, setTitle] = useState('')
  const [bio, setBio] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setTitle(theme.headerTitle || profile?.name || '')
    setBio(theme.headerBio || profile?.bio || '')
  }, [open, theme.headerTitle, theme.headerBio, profile?.name, profile?.bio])

  async function save() {
    setSaving(true)
    try {
      await api.patch('/me/profile', { name: title.replace(/^@/, ''), bio })
      await api.patch('/store', { theme: { ...theme, headerTitle: title, headerBio: bio } })
      toast.success('Profile updated')
      onSaved?.({ title, bio })
      onOpenChange(false)
    } catch (err) {
      toast.error(err.message || 'Could not save')
    } finally {
      setSaving(false)
    }
  }

  return (
    <BaseModal
      open={open}
      onOpenChange={onOpenChange}
      title="Add your name and bio"
      secondaryLabel="Cancel"
      onSecondary={() => onOpenChange(false)}
      primaryLabel={saving ? 'Saving…' : 'Save'}
      onPrimary={save}
      primaryDisabled={saving || !title.trim() || !bio.trim()}
      primaryLoading={saving}
    >
      <TitleBioFields title={title} bio={bio} onTitleChange={setTitle} onBioChange={setBio} />
    </BaseModal>
  )
}
