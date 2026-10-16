'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { BaseModal } from '@/components/ui/base-modal'
import { api } from '@/lib/clientApi'
import StorefrontThemeGallery from '@/components/dashboard/StorefrontThemeGallery'

export default function CustomizeDesignModal({ open, onOpenChange, store, onSaved }) {
  const [theme, setTheme] = useState(store?.theme || { galleryThemeId: 'custom' })
  const [saving, setSaving] = useState(false)

  async function save() {
    setSaving(true)
    try {
      const next = { ...theme, setupDesignComplete: true }
      await api.patch('/store', { theme: next })
      toast.success('Design saved')
      onSaved?.(next)
      onOpenChange(false)
    } catch (err) {
      toast.error(err.message || 'Could not save theme')
    } finally {
      setSaving(false)
    }
  }

  return (
    <BaseModal
      open={open}
      onOpenChange={onOpenChange}
      title="Customize your design"
      secondaryLabel="Cancel"
      onSecondary={() => onOpenChange(false)}
      primaryLabel={saving ? 'Saving…' : 'Save theme'}
      onPrimary={save}
      primaryDisabled={saving}
      primaryLoading={saving}
      className="sm:max-w-lg"
    >
      <StorefrontThemeGallery theme={theme} onChange={(patch) => setTheme((t) => ({ ...t, ...patch }))} />
    </BaseModal>
  )
}
