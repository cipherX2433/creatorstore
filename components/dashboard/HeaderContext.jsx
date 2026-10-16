'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'

const HeaderContext = createContext({
  title: '',
  setTitle: () => {},
  actions: null,
  setActions: () => {},
  pricingModalOpen: false,
  setPricingModalOpen: () => {},
  setHeaderConfig: () => {}
})

export function HeaderProvider({ children, defaultTitle = 'Dashboard' }) {
  const [title, setTitle] = useState('')
  const [actions, setActions] = useState(null)
  const [pricingModalOpen, setPricingModalOpen] = useState(false)
  const pathname = usePathname()

  // Reset actions & title when route changes to prevent cross-page leakage
  useEffect(() => {
    setActions(null)
    setTitle('')
  }, [pathname])

  const setHeaderConfig = React.useCallback(({ title: newTitle, actions: newActions }) => {
    if (newTitle !== undefined) setTitle(newTitle)
    if (newActions !== undefined) setActions(newActions)
  }, [])

  return (
    <HeaderContext.Provider
      value={{
        title,
        setTitle,
        actions,
        setActions,
        pricingModalOpen,
        setPricingModalOpen,
        setHeaderConfig
      }}
    >
      {children}
    </HeaderContext.Provider>
  )
}

export function useDashboardHeader(config) {
  const context = useContext(HeaderContext)
  if (!context) {
    throw new Error('useDashboardHeader must be used within a HeaderProvider')
  }

  useEffect(() => {
    if (config) {
      if (config.title !== undefined) context.setTitle(config.title)
      if (config.actions !== undefined) context.setActions(config.actions)
    }
  }, [config?.title, config?.actions])

  return context
}

export function DashboardHeaderConfig({ title, actions }) {
  const { setHeaderConfig } = useDashboardHeader()

  useEffect(() => {
    setHeaderConfig({ title, actions })
  }, [title, actions, setHeaderConfig])

  return null
}

export default HeaderContext
