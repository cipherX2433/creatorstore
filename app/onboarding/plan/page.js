'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'

export default function OnboardingPlanRedirect() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/onboarding')
  }, [router])

  return (
    <div className="min-h-screen bg-[#1C1C1C] flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-[#194DF5]" />
    </div>
  )
}
