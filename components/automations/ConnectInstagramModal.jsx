'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { api } from '@/lib/clientApi'
import { Button } from '@/components/ui/button'
import { Dialog, DialogOverlay, DialogPortal, DialogTitle } from '@/components/ui/dialog'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { Instagram, Loader2, X } from 'lucide-react'

export default function ConnectInstagramModal({
  open,
  onOpenChange,
  returnUrl = '/dashboard/automations?openCreate=1'
}) {
  const [connecting, setConnecting] = useState(false)

  async function handleConnect() {
    if (connecting) return
    setConnecting(true)
    try {
      const res = await api.get(`/integrations/instagram/oauth?returnUrl=${encodeURIComponent(returnUrl)}`)
      if (res?.url) {
        window.location.href = res.url
      } else {
        toast.error('Unable to initialize Instagram OAuth redirect')
        setConnecting(false)
      }
    } catch (err) {
      toast.error(err.message || 'Failed to start Instagram authorization flow')
      setConnecting(false)
    }
  }

  function handleCancel() {
    if (connecting) return
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!connecting) onOpenChange(next) }}>
      <DialogPortal>
        <DialogOverlay className="fixed inset-0 z-50 bg-black/35 backdrop-blur-none transition-opacity animate-in fade-in" />
        <DialogPrimitive.Content
          aria-describedby="connect-ig-description"
          className="fixed left-[50%] top-[50%] z-50 w-[92vw] max-w-md translate-x-[-50%] translate-y-[-50%] bg-[#FFFFFF] p-6 sm:p-8 rounded-[24px] border border-[#E5E5E3] shadow-[0_20px_60px_rgba(0,0,0,0.12)] text-[#1F1F1F] focus:outline-none animate-in zoom-in-95 duration-150"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="h-12 w-12 rounded-full bg-[#F2F1EF] text-[#1F1F1F] border border-[#E5E5E3] flex items-center justify-center shrink-0 shadow-xs">
              <Instagram className="h-6 w-6" />
            </div>
            <DialogPrimitive.Close asChild>
              <button
                type="button"
                onClick={handleCancel}
                disabled={connecting}
                className="rounded-full p-2 text-[#6F6F6B] hover:text-[#1F1F1F] hover:bg-[#F5F5F3] transition-colors cursor-pointer disabled:opacity-50"
              >
                <X className="h-4 w-4" />
                <span className="sr-only">Cancel</span>
              </button>
            </DialogPrimitive.Close>
          </div>

          <div className="mt-5 space-y-2">
            <DialogTitle className="text-xl font-bold text-[#1F1F1F] tracking-tight">
              Connect your Instagram account
            </DialogTitle>
            <p id="connect-ig-description" className="text-xs sm:text-sm text-[#6F6F6B] font-normal leading-relaxed">
              Connect your Instagram account before creating an automation. CreatorStore needs access to Instagram to monitor comments and send automated DMs.
            </p>
          </div>

          <div className="mt-8 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={connecting}
              className="w-full sm:w-auto font-semibold rounded-full h-11 px-5 border-[#E5E5E3] bg-[#FFFFFF] text-[#1F1F1F] hover:bg-[#F5F5F3] text-xs cursor-pointer"
            >
              Cancel
            </Button>

            <button
              type="button"
              onClick={handleConnect}
              disabled={connecting}
              className="w-full sm:w-auto font-semibold bg-[#1F1F1F] hover:bg-[#000000] active:bg-[#111111] text-[#FFFFFF] rounded-full h-11 px-6 transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer shadow-sm text-xs disabled:opacity-50"
            >
              {connecting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-1 text-white" />
                  Redirecting to Instagram...
                </>
              ) : (
                <>
                  <Instagram className="h-4 w-4 text-white" />
                  Connect Instagram
                </>
              )}
            </button>
          </div>
        </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
  )
}

