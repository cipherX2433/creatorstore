'use client'

import { use, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function CoachingSetupPage({ params: paramsPromise }) {
  const params = use(paramsPromise)
  const productId = params.id
  const router = useRouter()

  useEffect(() => {
    if (productId) {
      router.replace(`/dashboard/coaching?edit=${productId}`)
    } else {
      router.replace('/dashboard/coaching')
    }
  }, [productId, router])

  return (
    <div className="min-h-screen bg-[#1C1C1C] flex items-center justify-center text-[#A3A3A3] text-sm">
      Opening Coaching & Bookings...
    </div>
  )
}
