'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import { api } from '@/lib/clientApi'
import { Button } from '@/components/ui/button'
import { Loader2, Instagram, CheckCircle2, AlertCircle, RefreshCw, Unlink, Sparkles, ArrowLeft } from 'lucide-react'

export default function ConnectedAccountsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(true)
  const [account, setAccount] = useState({ connected: false })
  const [connecting, setConnecting] = useState(false)
  const [disconnecting, setDisconnecting] = useState(false)

  useEffect(() => {
    fetchAccountStatus()

    if (searchParams.get('connected') === '1') {
      toast.success('Instagram account connected successfully!')
    } else if (searchParams.get('error')) {
      toast.error(`Instagram connection error: ${searchParams.get('error')}`)
    }
  }, [searchParams])

  async function fetchAccountStatus() {
    setLoading(true)
    try {
      const res = await api.get('/integrations/instagram/account')
      setAccount(res || { connected: false })
    } catch (err) {
      console.error('Failed to fetch Instagram account:', err)
      setAccount({ connected: false })
    } finally {
      setLoading(false)
    }
  }

  async function handleConnectInstagram() {
    setConnecting(true)
    try {
      const res = await api.get('/integrations/instagram/oauth')
      if (res.url) {
        window.location.href = res.url
      } else {
        toast.error('Unable to initialize Meta OAuth redirect')
      }
    } catch (err) {
      toast.error(err.message || 'Failed to start Meta authorization flow')
      setConnecting(false)
    }
  }

  async function handleDisconnectInstagram() {
    if (!confirm('Are you sure you want to disconnect your Instagram account? Any active automations will stop sending DMs.')) {
      return
    }

    setDisconnecting(true)
    try {
      await api.delete('/integrations/instagram/account')
      toast.success('Instagram account disconnected')
      setAccount({ connected: false })
    } catch (err) {
      toast.error(err.message || 'Failed to disconnect account')
    } finally {
      setDisconnecting(false)
    }
  }

  return (
    <div className="max-w-3xl space-y-6 text-[#1F1F1F]">
      
      {/* Settings Navigation Tabs */}
      <div className="flex items-center gap-3 border-b border-[#E5E5E3] pb-4 overflow-x-auto">
        <Link
          href="/dashboard/settings"
          className="px-4 py-2 text-sm font-semibold text-[#6F6F6B] hover:text-[#1F1F1F] transition-colors shrink-0"
        >
          Profile &amp; Store
        </Link>
        <Link
          href="/dashboard/settings/payments"
          className="px-4 py-2 text-sm font-semibold text-[#6F6F6B] hover:text-[#1F1F1F] transition-colors shrink-0"
        >
          Payments
        </Link>
        <Link
          href="/dashboard/settings/connected-accounts"
          className="px-4 py-2 text-sm font-bold text-[#1F1F1F] border-b-2 border-[#1F1F1F] shrink-0"
        >
          Connected Accounts
        </Link>
        <Link
          href="/dashboard/settings/billing"
          className="px-4 py-2 text-sm font-semibold text-[#6F6F6B] hover:text-[#1F1F1F] transition-colors shrink-0"
        >
          Billing &amp; Subscription
        </Link>
      </div>

      {/* Header */}
      <div className="bg-[#FFFFFF] p-6 sm:p-8 rounded-[24px] border border-[#E5E5E3] space-y-2 shadow-[0_8px_30px_rgba(0,0,0,0.04)]">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-[#F2F1EF] text-[#1F1F1F] flex items-center justify-center shrink-0 border border-[#E5E5E3]">
            <Instagram className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-[#1F1F1F]">Connected Accounts</h1>
            <p className="text-sm text-[#6F6F6B]">Manage social integrations and official platform authorizations for marketing automations.</p>
          </div>
        </div>
      </div>

      {/* Account Card */}
      <div className="bg-[#FFFFFF] rounded-[24px] border border-[#E5E5E3] p-6 sm:p-8 space-y-6 shadow-[0_8px_30px_rgba(0,0,0,0.04)]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E5E5E3] pb-6">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-linear-to-tr from-[#F58529] via-[#DD2A7B] to-[#8134AF] flex items-center justify-center text-white font-bold shrink-0 shadow-xs">
              <Instagram className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-[#1F1F1F]">Instagram</h3>
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin text-[#6F6F6B]" />
                ) : account.connected ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#16A34A]/10 text-[#16A34A] border border-[#16A34A]/20">
                    <CheckCircle2 className="h-3 w-3" /> Connected
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#F2F1EF] text-[#6F6F6B] border border-[#E5E5E3]">
                    Not Connected
                  </span>
                )}
              </div>
              <p className="text-xs text-[#6F6F6B] mt-1">
                {account.connected
                  ? `Authorized account: @${account.username || 'connected_account'}`
                  : 'Connect via official Meta OAuth to trigger automated DMs from comment keywords.'}
              </p>
            </div>
          </div>

          <div>
            {loading ? (
              <Button disabled variant="outline" className="border-[#E5E5E3] text-[#6F6F6B] rounded-full">
                <Loader2 className="h-4 w-4 animate-spin mr-2" /> Checking...
              </Button>
            ) : account.connected ? (
              <div className="flex items-center gap-2">
                <Button
                  onClick={handleConnectInstagram}
                  disabled={connecting}
                  variant="outline"
                  className="border-[#E5E5E3] bg-[#FFFFFF] text-[#1F1F1F] hover:bg-[#F5F5F3] rounded-full"
                >
                  {connecting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                  Reconnect
                </Button>
                <Button
                  onClick={handleDisconnectInstagram}
                  disabled={disconnecting}
                  variant="outline"
                  className="border-[#E5E5E3] text-[#DC2626] bg-[#FFFFFF] hover:bg-[#F5F5F3] rounded-full"
                >
                  {disconnecting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Unlink className="h-4 w-4 mr-2" />}
                  Disconnect
                </Button>
              </div>
            ) : (
              <Button
                onClick={handleConnectInstagram}
                disabled={connecting}
                className="bg-[#1F1F1F] text-white font-semibold hover:bg-[#000000] active:bg-[#111111] rounded-full px-5"
              >
                {connecting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" /> Connecting...
                  </>
                ) : (
                  <>
                    <Instagram className="h-4 w-4 mr-2" /> Connect Instagram
                  </>
                )}
              </Button>
            )}
          </div>
        </div>

        {/* Feature Highlights */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 rounded-[18px] bg-[#FBFBFB] border border-[#E5E5E3] space-y-1">
            <div className="flex items-center gap-2 text-[#1F1F1F] font-semibold text-xs">
              <Sparkles className="h-4 w-4" /> Official Meta Authorization
            </div>
            <p className="text-xs text-[#6F6F6B]">
              Uses Meta Graph API OAuth. We never ask for your Instagram password or store client tokens in browser state.
            </p>
          </div>
          <div className="p-4 rounded-[18px] bg-[#FBFBFB] border border-[#E5E5E3] space-y-1">
            <div className="flex items-center gap-2 text-[#1F1F1F] font-semibold text-xs">
              <Sparkles className="h-4 w-4" /> High Conversion Auto-DM
            </div>
            <p className="text-xs text-[#6F6F6B]">
              Automatically convert Instagram comment interest directly into CreatorStore digital product purchases.
            </p>
          </div>
        </div>

        {/* Action Link to Automations */}
        {account.connected && (
          <div className="pt-2 flex justify-end">
            <Link href="/dashboard/automations">
              <Button className="bg-[#1F1F1F] text-white font-semibold hover:bg-[#000000] active:bg-[#111111] rounded-full px-5">
                Go to Automations →
              </Button>
            </Link>
          </div>
        )}
      </div>

    </div>
  )
}
