'use client'

import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/clientApi'

const DashboardContext = createContext(null)

export function DashboardProvider({ children }) {
  const router = useRouter()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  const fetchMe = useCallback(async () => {
    try {
      const res = await api.get('/me')
      if (!res || !res.user) {
        router.push('/login')
        setLoading(false)
        return null
      }
      if (res.user.role === 'CUSTOMER') {
        router.push('/account')
        setLoading(false)
        return null
      }
      const isComplete = res.profile?.onboardingComplete || res.profile?.onboardingStatus === 'COMPLETED'
      if (res.user.role === 'CREATOR' && !isComplete) {
        router.push('/onboarding')
        setLoading(false)
        return null
      }
      setData(res)
      setLoading(false)
      return res
    } catch (err) {
      if (err.status === 401) {
        router.push('/login')
      }
      setLoading(false)
      return null
    }
  }, [router])

  useEffect(() => {
    fetchMe()
  }, [fetchMe])

  const updateProfile = useCallback((newProfile) => {
    setData((prev) => prev ? { ...prev, profile: { ...prev.profile, ...newProfile } } : prev)
  }, [])

  const updateStore = useCallback((newStore) => {
    setData((prev) => prev ? { ...prev, store: { ...prev.store, ...newStore } } : prev)
  }, [])

  return (
    <DashboardContext.Provider value={{ me: data, loading, refreshMe: fetchMe, updateProfile, updateStore }}>
      {children}
    </DashboardContext.Provider>
  )
}

export function useDashboard() {
  const context = useContext(DashboardContext)
  if (!context) {
    throw new Error('useDashboard must be used within a DashboardProvider')
  }
  return context
}
