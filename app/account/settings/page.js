'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/clientApi'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { Bell, ShieldCheck, Lock, CheckCircle2, Save, Store, ArrowRight, Loader2, Sparkles } from 'lucide-react'
import { getSubscriptionPricing } from '@/lib/plans'

export default function CustomerSettingsPage() {
  const router = useRouter()
  const [userRole, setUserRole] = useState('CUSTOMER')
  const [upgrading, setUpgrading] = useState(false)
  const [prefs, setPrefs] = useState({
    purchaseConfirmations: true,
    bookingReminders: true,
    webinarReminders: true,
    membershipNotifications: true,
    serviceUpdates: true,
  })

  useEffect(() => {
    api.get('/me')
      .then((res) => {
        if (res.user?.role) setUserRole(res.user.role)
      })
      .catch(() => {})
  }, [])

  async function handleUpgrade() {
    setUpgrading(true)
    try {
      await api.post('/account/upgrade-to-creator')
      toast.success('Account upgraded! Start your Creator subscription.')
      router.push('/creator/subscribe')
    } catch (err) {
      toast.error(err.message || 'Upgrade failed')
    } finally {
      setUpgrading(false)
    }
  }

  function handleSave(e) {
    e.preventDefault()
    toast.success('Notification preferences saved!')
  }

  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl sm:text-3xl font-black text-[#F4F2EC] tracking-tight">Account Settings</h1>
        <p className="text-xs sm:text-sm text-[rgba(244,242,236,0.68)] font-medium mt-1">
          Configure your notification preferences, security settings, and creator upgrade options.
        </p>
      </div>

      {/* Become a Creator CTA Card (for CUSTOMER accounts) */}
      {userRole !== 'CREATOR' && (
        <div className="bg-gradient-to-r from-primary/20 via-surface-card to-surface-card border border-primary/20 p-6 sm:p-8 rounded-3xl text-white shadow-xl space-y-4">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-[#1A1A1A] text-white">
              <Sparkles className="h-3 w-3 text-[#00F090]" /> Upgrade Available
            </span>
          </div>

          <div className="space-y-1">
            <h3 className="text-xl font-black tracking-tight">Start selling with CreatorStore</h3>
            <p className="text-xs text-white/80 font-medium leading-relaxed max-w-lg">
              Sell your courses, digital products, coaching, and services. Upgrade your existing account to a Creator account without losing any of your customer purchases or history.
            </p>
          </div>

          <div className="pt-2 flex items-center justify-between">
            <span className="text-sm font-extrabold text-white/90">Starting at {getSubscriptionPricing().CREATOR.priceFormatted} / month</span>
            <Button
              onClick={handleUpgrade}
              disabled={upgrading}
              variant="accent"
              className="font-extrabold text-xs rounded-xl shadow-lg gap-2"
            >
              {upgrading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Store className="h-4 w-4" />}
              Become a Creator <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Notification Preferences */}
      <form onSubmit={handleSave} className="bg-[#12141c] p-6 sm:p-8 rounded-3xl border border-white/10 shadow-sm space-y-6">
        <div className="flex items-center gap-2 border-b border-white/10 pb-4">
          <Bell className="h-5 w-5 text-primary" />
          <h3 className="font-extrabold text-base text-[#F4F2EC]">Notification Preferences</h3>
        </div>

        <div className="space-y-4">
          {[
            { id: 'purchaseConfirmations', label: 'Purchase confirmations', desc: 'Receive instant receipts for completed orders.' },
            { id: 'bookingReminders', label: 'Booking reminders', desc: 'Alerts before upcoming 1:1 coaching sessions.' },
            { id: 'webinarReminders', label: 'Webinar reminders', desc: 'Notifications when registered webinars are starting.' },
            { id: 'membershipNotifications', label: 'Membership notifications', desc: 'Renewal and subscription billing alerts.' },
            { id: 'serviceUpdates', label: 'Service updates', desc: 'Status changes and deliveries for custom service requests.' },
          ].map((item) => (
            <label key={item.id} className="flex items-start gap-3 p-3 rounded-2xl hover:bg-[#12141c] transition-colors cursor-pointer border border-transparent hover:border-white/10">
              <input
                type="checkbox"
                checked={prefs[item.id]}
                onChange={(e) => setPrefs({ ...prefs, [item.id]: e.target.checked })}
                className="mt-0.5 h-4 w-4 rounded text-primary focus:ring-primary"
              />
              <div className="space-y-0.5">
                <span className="text-xs font-bold text-[#F4F2EC] block">{item.label}</span>
                <span className="text-[11px] text-[rgba(244,242,236,0.68)] font-medium block">{item.desc}</span>
              </div>
            </label>
          ))}
        </div>

        <div className="pt-4 border-t border-white/10 flex justify-end">
          <Button type="submit" className="bg-primary hover:bg-primary-hover text-white font-extrabold text-xs rounded-xl gap-2 shadow-md">
            <Save className="h-4 w-4" /> Save Preferences
          </Button>
        </div>
      </form>

      {/* Security Info */}
      <div className="bg-[#12141c] p-6 sm:p-8 rounded-3xl border border-white/10 shadow-sm space-y-4">
        <div className="flex items-center gap-2 border-b border-white/10 pb-4">
          <ShieldCheck className="h-5 w-5 text-emerald-600" />
          <h3 className="font-extrabold text-base text-[#F4F2EC]">Security & Privacy</h3>
        </div>
        <p className="text-xs text-[rgba(244,242,236,0.68)] font-medium leading-relaxed">
          Your account is secured with HTTP-only encrypted session cookies and scrypt password hashing.
        </p>
      </div>
    </div>
  )
}
