'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { api } from '@/lib/clientApi'
import { Loader2 } from 'lucide-react'
import CreateAutomationModal from '@/components/automations/CreateAutomationModal'
import ConnectInstagramModal from '@/components/automations/ConnectInstagramModal'

export default function NewAutomationPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const productId = searchParams ? searchParams.get('productId') : null

  const [loading, setLoading] = useState(true)
  const [connected, setConnected] = useState(false)
  const [connectModalOpen, setConnectModalOpen] = useState(false)

  const returnUrl = `/dashboard/automations/new${productId ? `?productId=${productId}` : ''}`

  useEffect(() => {
    checkConnection()
  }, [])

  async function checkConnection() {
    setLoading(true)
    try {
      const res = await api.get('/integrations/instagram/status').catch(() => ({ connected: false }))
      if (res?.connected) {
        setConnected(true)
        setConnectModalOpen(false)
      } else {
        setConnected(false)
        setConnectModalOpen(true)
      }
    } catch {
      setConnected(false)
      setConnectModalOpen(true)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--accent-primary)]" />
      </div>
    )
  }

  if (!connected) {
    return (
      <ConnectInstagramModal
        open={connectModalOpen}
        onOpenChange={(next) => {
          setConnectModalOpen(next)
          if (!next) router.push('/dashboard/automations')
        }}
        returnUrl={returnUrl}
      />
    )
  }

  return (
    <CreateAutomationModal
      open
      productId={productId}
      onOpenChange={(next) => {
        if (!next) router.push('/dashboard/automations')
      }}
      onCreated={() => router.push('/dashboard/automations')}
    />
  )
}
