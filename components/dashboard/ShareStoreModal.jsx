'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { toast } from 'sonner'
import { api } from '@/lib/clientApi'
import { BaseModal } from '@/components/ui/base-modal'
import { IconBadge, ICON_BADGE_COLORS } from '@/components/ui/icon-badge'
import { Button } from '@/components/ui/button'
import {
  Settings, Copy, X, Instagram, QrCode, Link2,
} from 'lucide-react'

const QRCodeCanvas = dynamic(() => import('qrcode.react').then((m) => m.QRCodeCanvas), { ssr: false })

export default function ShareStoreModal({ open, onOpenChange, username, onShared }) {
  const slug = username || 'store'
  const displayUrl = `creatorstore.store/${slug}`
  const shareUrl = typeof window !== 'undefined' ? `${window.location.origin}/${slug}` : `https://creatorstore.store/${slug}`

  const [showQr, setShowQr] = useState(true)
  const [igAccount, setIgAccount] = useState(null)

  useEffect(() => {
    if (!open) return
    setShowQr(true)
    api.get('/integrations/instagram/account')
      .then((res) => setIgAccount(res?.account || res || null))
      .catch(() => setIgAccount(null))
  }, [open])

  function copyLink() {
    navigator.clipboard?.writeText(shareUrl)
    toast.success('Link copied')
    onShared?.()
  }

  const igConnected = !!(igAccount?.connected || igAccount?.username)

  return (
    <BaseModal
      open={open}
      onOpenChange={onOpenChange}
      title="Share"
      hideFooter
      headerRight={(
        <Link
          href="/dashboard/settings"
          className="p-1 rounded-full text-[#777777] hover:text-[#222222] hover:bg-[#F2F2F2] transition-colors"
          aria-label="Share settings"
        >
          <Settings className="h-4 w-4" />
        </Link>
      )}
    >

        <div className="flex flex-col gap-4 text-[#222222]">
          <div className="flex items-center gap-3 bg-[#F2F2F2] border border-[#E8E8E8] rounded-full p-2 pl-4">
            <span className="text-xs font-mono text-[#777777] truncate flex-1">{displayUrl}</span>
            <Button
              type="button"
              size="sm"
              onClick={copyLink}
              className="h-8 rounded-full bg-[#1F1F1F] text-white hover:bg-[#2A2A2A] shrink-0 font-bold shadow-2xs"
            >
              <Copy className="h-3.5 w-3.5 mr-1.5" /> Copy
            </Button>
          </div>

          {showQr && (
            <div className="relative bg-[#FAFAFA] border border-[#E8E8E8] rounded-2xl p-6 flex flex-col items-center gap-3 shadow-2xs">
              <button
                type="button"
                onClick={() => setShowQr(false)}
                className="absolute top-3 right-3 p-1 rounded-full text-[#777777] hover:text-[#222222] hover:bg-[#F2F2F2] transition-colors cursor-pointer"
                aria-label="Dismiss QR code"
              >
                <X className="h-4 w-4" />
              </button>
              <div className="bg-white rounded-xl p-3 border border-[#E8E8E8] shadow-2xs">
                {shareUrl ? <QRCodeCanvas value={shareUrl} size={148} fgColor="#222222" bgColor="#ffffff" /> : null}
              </div>
              <div className="text-center">
                <p className="text-sm font-bold text-[#222222]">Add link to Instagram bio</p>
                <p className="text-xs text-[#777777]">Scan with your phone</p>
              </div>
            </div>
          )}

          <div className="flex flex-col gap-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#777777]">My platforms</h3>
            {igConnected ? (
              <div className="flex items-center gap-3 p-4 rounded-2xl bg-[#FFFFFF] border border-[#E8E8E8] shadow-2xs">
                <IconBadge color={ICON_BADGE_COLORS.instagram} shape="circle" size="md">
                  <Instagram className="h-5 w-5" />
                </IconBadge>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-[#222222]">Instagram</p>
                  <p className="text-xs text-[#777777]">@{igAccount.username || 'connected'}</p>
                </div>
              </div>
            ) : (
              <Link
                href="/dashboard/settings/connected-accounts"
                className="flex items-center gap-3 p-4 rounded-2xl bg-[#FFFFFF] border border-[#E8E8E8] hover:bg-[#F2F2F2] hover:border-[#D0D0CE] transition-all shadow-2xs"
              >
                <IconBadge color={ICON_BADGE_COLORS.instagram} shape="circle" size="md">
                  <Instagram className="h-5 w-5" />
                </IconBadge>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-[#222222]">Instagram</p>
                  <p className="text-xs text-[#777777]">Connect to show it here</p>
                </div>
              </Link>
            )}
          </div>

          <div className="border-t border-[#E8E8E8] pt-4">
            <div className="grid grid-cols-3 gap-3">
              <button type="button" onClick={copyLink} className="flex flex-col items-center gap-2 p-2 rounded-2xl hover:bg-[#F2F2F2] transition-colors cursor-pointer">
                <div className="h-12 w-12 rounded-full bg-[#FFFFFF] border border-[#E8E8E8] flex items-center justify-center shadow-2xs">
                  <Link2 className="h-5 w-5 text-[#222222]" />
                </div>
                <span className="text-xs font-medium text-[#777777]">Store</span>
              </button>
              <button type="button" onClick={() => setShowQr(true)} className="flex flex-col items-center gap-2 p-2 rounded-2xl hover:bg-[#F2F2F2] transition-colors cursor-pointer">
                <div className="h-12 w-12 rounded-full bg-[#FFFFFF] border border-[#E8E8E8] flex items-center justify-center shadow-2xs">
                  <QrCode className="h-5 w-5 text-[#222222]" />
                </div>
                <span className="text-xs font-medium text-[#777777]">QR code</span>
              </button>
              <a
                href={igConnected ? `https://instagram.com/${igAccount.username}` : '/dashboard/settings/connected-accounts'}
                target={igConnected ? '_blank' : undefined}
                rel={igConnected ? 'noreferrer' : undefined}
                className="flex flex-col items-center gap-2 p-2 rounded-2xl hover:bg-[#F2F2F2] transition-colors cursor-pointer"
              >
                <div className="h-12 w-12 rounded-full bg-[#E1306C] text-white flex items-center justify-center shadow-2xs">
                  <Instagram className="h-5 w-5" />
                </div>
                <span className="text-xs font-medium text-[#777777]">Instagram</span>
              </a>
            </div>
          </div>
        </div>
    </BaseModal>
  )
}
