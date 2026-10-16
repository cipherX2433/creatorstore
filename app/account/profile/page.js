'use client'

import { useEffect, useState } from 'react'
import { api } from '@/lib/clientApi'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { User, Mail, Globe, Clock, Save, Loader2, ShieldCheck } from 'lucide-react'

export default function CustomerProfilePage() {
  const [profile, setProfile] = useState({ name: '', email: '', timezone: 'Asia/Kolkata' })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    api.get('/me')
      .then((res) => {
        if (res.user) {
          setProfile({
            name: res.user.name || '',
            email: res.user.email || '',
            timezone: res.profile?.timezone || 'Asia/Kolkata',
          })
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    try {
      await api.patch('/me/profile', { name: profile.name, timezone: profile.timezone })
      toast.success('Profile updated successfully!')
    } catch (err) {
      toast.error(err.message || 'Failed to update profile')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="p-8 text-center text-xs text-[rgba(244,242,236,0.5)]">Loading profile...</div>
  }

  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl sm:text-3xl font-black text-[#F4F2EC] tracking-tight">Customer Profile</h1>
        <p className="text-xs sm:text-sm text-[rgba(244,242,236,0.68)] font-medium mt-1">
          Manage your personal account details, display name, and preferences.
        </p>
      </div>

      <form onSubmit={handleSave} className="bg-[#12141c] p-6 sm:p-8 rounded-3xl border border-white/10 shadow-sm space-y-6">
        {/* Avatar Display */}
        <div className="flex items-center gap-4 border-b border-white/10 pb-6">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/15 text-primary font-black text-xl uppercase border-2 border-primary/30 shadow-inner">
            {profile.email?.[0] || 'U'}
          </div>
          <div>
            <h3 className="font-extrabold text-base text-[#F4F2EC]">{profile.name || 'Customer'}</h3>
            <p className="text-xs text-[rgba(244,242,236,0.68)] font-medium">{profile.email}</p>
          </div>
        </div>

        {/* Form Fields */}
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-[#F4F2EC]">Display Name</Label>
            <Input
              value={profile.name}
              onChange={(e) => setProfile({ ...profile, name: e.target.value })}
              placeholder="Your full name"
              className="text-xs rounded-xl"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-[#F4F2EC]">Email Address (Primary Identity)</Label>
            <Input
              value={profile.email}
              disabled
              className="text-xs rounded-xl bg-slate-100 text-[rgba(244,242,236,0.68)] cursor-not-allowed"
            />
            <p className="text-[11px] text-[rgba(244,242,236,0.5)] font-medium">Email is locked for authentication security.</p>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-[#F4F2EC]">Preferred Timezone</Label>
            <select
              value={profile.timezone}
              onChange={(e) => setProfile({ ...profile, timezone: e.target.value })}
              className="w-full h-10 px-3 text-xs rounded-xl border border-white/10 bg-[#12141c] font-medium focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
              <option value="America/New_York">America/New_York (EST)</option>
              <option value="Europe/London">Europe/London (GMT/BST)</option>
              <option value="UTC">UTC</option>
            </select>
          </div>
        </div>

        {/* Save Button */}
        <div className="pt-2 border-t border-white/10 flex justify-end">
          <Button type="submit" disabled={saving} className="bg-primary hover:bg-primary-hover text-white font-extrabold text-xs rounded-xl gap-2 shadow-md">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save Changes
          </Button>
        </div>
      </form>
    </div>
  )
}
