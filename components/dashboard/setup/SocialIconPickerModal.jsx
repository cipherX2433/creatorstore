'use client'

import { useMemo, useState } from 'react'
import { Mail } from 'lucide-react'
import { toast } from 'sonner'
import { BaseModal, ModalFooterActions } from '@/components/ui/base-modal'
import { TextInput } from '@/components/ui/text-input'
import { api } from '@/lib/clientApi'
import { ONBOARDING_PLATFORMS, platformHref } from '@/lib/onboardingPlatforms'

const EXTRA = [{ id: 'email', label: 'Email', Icon: Mail, prefix: 'mailto:' }]

export default function SocialIconPickerModal({ open, onOpenChange, profile, onSaved }) {
  const [query, setQuery] = useState('')
  const [picked, setPicked] = useState(null)
  const [handle, setHandle] = useState('')
  const [saving, setSaving] = useState(false)

  const list = useMemo(() => {
    const all = [...ONBOARDING_PLATFORMS, ...EXTRA]
    const q = query.trim().toLowerCase()
    if (!q) return all
    return all.filter((p) => p.label.toLowerCase().includes(q) || p.id.includes(q))
  }, [query])

  async function save() {
    if (!picked) return
    setSaving(true)
    try {
      const href = picked.id === 'email'
        ? (handle.includes('mailto:') ? handle : `mailto:${handle.replace(/^mailto:/, '')}`)
        : platformHref(picked.id, handle)
      if (!href) throw new Error('Enter a username or URL')
      const socialLinks = { ...(profile?.socialLinks || {}), [picked.id]: href }
      await api.patch('/me/profile', { socialLinks })
      toast.success(`${picked.label} added`)
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('creatorstore:setup-updated'))
      }
      onSaved?.(socialLinks)
      setPicked(null)
      setHandle('')
      onOpenChange(false)
    } catch (err) {
      toast.error(err.message || 'Could not save')
    } finally {
      setSaving(false)
    }
  }

  async function connectInstagram() {
    try {
      const res = await api.get('/integrations/instagram/oauth')
      if (res?.url) window.location.href = res.url
      else toast.error('Instagram connect is not available')
    } catch (err) {
      toast.error(err.message || 'Instagram connect failed')
    }
  }

  return (
    <BaseModal
      open={open}
      onOpenChange={onOpenChange}
      title="Add social icon"
      hideFooter
    >
      {!picked ? (
        <div className="space-y-3">
          <TextInput
            label="Search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search"
          />
          <div className="max-h-72 overflow-y-auto divide-y divide-white/[0.08]">
            {list.map(({ id, label, Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => {
                  if (id === 'instagram') {
                    connectInstagram()
                    return
                  }
                  setPicked({ id, label })
                }}
                className="w-full flex items-center gap-3 py-3 text-left hover:bg-[#232323] cursor-pointer"
              >
                <Icon className="h-5 w-5 text-white" />
                <span className="text-sm text-white">{label}</span>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <TextInput
            label={picked.label}
            value={handle}
            onChange={(e) => setHandle(e.target.value)}
            placeholder={picked.id === 'email' ? 'you@email.com' : '@username or URL'}
          />
          <ModalFooterActions
            secondaryLabel="Back"
            onSecondary={() => setPicked(null)}
            primaryLabel={saving ? 'Saving…' : 'Add'}
            onPrimary={save}
            primaryDisabled={saving || !handle.trim()}
            primaryLoading={saving}
          />
        </div>
      )}
    </BaseModal>
  )
}
