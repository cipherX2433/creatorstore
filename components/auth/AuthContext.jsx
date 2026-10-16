'use client'

import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/clientApi'

const AuthContext = createContext({
  user: null,
  profile: null,
  store: null,
  subscription: null,
  isAuthenticated: false,
  loading: true,
  refresh: async () => {},
  logout: async () => {},
})

export function AuthProvider({ children }) {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [store, setStore] = useState(null)
  const [subscription, setSubscription] = useState(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    try {
      const me = await api.get('/me')
      if (me && me.user) {
        setUser(me.user)
        setProfile(me.profile || null)
        setStore(me.store || null)
        setSubscription(me.subscription || null)
      } else {
        setUser(null)
        setProfile(null)
        setStore(null)
        setSubscription(null)
      }
      return me
    } catch (err) {
      setUser(null)
      setProfile(null)
      setStore(null)
      setSubscription(null)
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout')
    } catch (err) {
      // ignore
    } finally {
      setUser(null)
      setProfile(null)
      setStore(null)
      setSubscription(null)
      router.push('/login')
    }
  }, [router])

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        store,
        subscription,
        isAuthenticated: Boolean(user),
        loading,
        refresh,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
