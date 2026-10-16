'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { AlertCircle, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'

function AccessErrorContent() {
  const searchParams = useSearchParams()
  const message = searchParams.get('message') || 'This access link is invalid or has expired.'

  return (
    <div className="min-h-screen bg-[#000000] flex flex-col items-center justify-center p-4 sm:p-6 text-[#F4F2EC] selection:bg-primary selection:text-black">
      <div className="w-full max-w-md bg-[#12141c] p-8 rounded-3xl border border-white/10 shadow-2xl space-y-6 text-center">
        <div className="h-16 w-16 bg-rose-500/10 border border-rose-500/30 text-rose-400 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
          <AlertCircle className="h-8 w-8" />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-black text-[#F4F2EC] tracking-tight">Access Link Unavailable</h1>
          <p className="text-sm text-[rgba(244,242,236,0.68)] font-medium leading-relaxed">
            {message}
          </p>
        </div>

        <div className="pt-2">
          <Link href="/">
            <Button variant="default" size="lg" className="w-full font-black bg-primary hover:bg-[#ff7be5] text-black rounded-xl">
              <ArrowLeft className="mr-2 h-4 w-4" /> Return to Storefront
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}

export default function AccessErrorPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#000000] flex items-center justify-center text-white">
        Loading...
      </div>
    }>
      <AccessErrorContent />
    </Suspense>
  )
}
