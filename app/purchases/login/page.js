'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import PurchaseAccessVerification from '@/components/storefront/PurchaseAccessVerification'

export default function PurchasesLoginPage() {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-[#F3F3F1] text-zinc-900 font-sans selection:bg-zinc-200">
      <header className="w-full bg-[#F3F3F1] border-b border-zinc-200/60 sticky top-0 z-30">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="h-8 w-8 rounded-full bg-zinc-900 text-white flex items-center justify-center font-black text-sm group-hover:scale-105 transition-transform">
              ✦
            </div>
            <span className="font-extrabold text-sm tracking-tight text-zinc-900">CreatorStore</span>
          </Link>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 py-12 sm:py-16">
        <div className="bg-white rounded-[32px] p-6 sm:p-8 shadow-xs border border-zinc-200/60">
          <PurchaseAccessVerification
            variant="page"
            onSuccess={() => {
              router.push('/purchases')
            }}
          />
        </div>
      </main>
    </div>
  )
}
