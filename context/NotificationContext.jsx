'use client'

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'

const NotificationContext = createContext({
  isOpen: false,
  openNotificationCenter: () => {},
  closeNotificationCenter: () => {},
  toggleNotificationCenter: () => {},
  notifications: [],
  unreadCount: 0,
  loading: false,
  activeTab: 'All',
  setActiveTab: () => {},
  markAsRead: async () => {},
  markAllAsRead: async () => {},
  refreshNotifications: async () => {},
})

export function NotificationProvider({ children }) {
  const [isOpen, setIsOpen] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('All')
  const [isMarkingAll, setIsMarkingAll] = useState(false)

  // Fetch notifications from server
  const fetchNotifications = useCallback(async (tab = 'All') => {
    try {
      setLoading(true)
      const res = await fetch(`/api/notifications?category=${encodeURIComponent(tab)}`)
      if (!res.ok) throw new Error('Failed to load notifications')
      const data = await res.json()
      setNotifications(data.notifications || [])
      setUnreadCount(typeof data.unreadCount === 'number' ? data.unreadCount : 0)
    } catch (err) {
      console.warn('Error fetching notifications:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  // Initial unread count probe
  useEffect(() => {
    fetch('/api/notifications/unread-count')
      .then((r) => (r.ok ? r.json() : { unreadCount: 0 }))
      .then((data) => {
        if (typeof data.unreadCount === 'number') {
          setUnreadCount(data.unreadCount)
        }
      })
      .catch(() => {})
  }, [])

  // Refresh when opening or switching tabs
  useEffect(() => {
    if (isOpen) {
      fetchNotifications(activeTab)
    }
  }, [isOpen, activeTab, fetchNotifications])

  // Mark single notification as read
  const markAsRead = async (id) => {
    if (!id) return
    // Optimistic UI update
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    )
    setUnreadCount((prev) => Math.max(0, prev - 1))

    try {
      const res = await fetch(`/api/notifications/${id}/read`, {
        method: 'POST',
      })
      if (!res.ok) throw new Error('Failed to mark read')
      const data = await res.json()
      if (typeof data.unreadCount === 'number') {
        setUnreadCount(data.unreadCount)
      }
    } catch (err) {
      console.warn('Failed to persist read state:', err)
      // Revert if error
      fetchNotifications(activeTab)
    }
  }

  // Mark all unread notifications as read
  const markAllAsRead = async () => {
    if (isMarkingAll || unreadCount === 0) return
    setIsMarkingAll(true)

    // Optimistic update
    const prevList = [...notifications]
    const prevCount = unreadCount
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })))
    setUnreadCount(0)

    try {
      const res = await fetch('/api/notifications/mark-all-read', {
        method: 'POST',
      })
      if (!res.ok) throw new Error('Failed to mark all as read')
      toast.success('All notifications marked as read')
    } catch (err) {
      console.error('Error marking all as read:', err)
      toast.error('Could not mark all as read. Please try again.')
      // Revert on failure
      setNotifications(prevList)
      setUnreadCount(prevCount)
    } finally {
      setIsMarkingAll(false)
    }
  }

  const openNotificationCenter = () => setIsOpen(true)
  const closeNotificationCenter = () => setIsOpen(false)
  const toggleNotificationCenter = () => setIsOpen((prev) => !prev)

  return (
    <NotificationContext.Provider
      value={{
        isOpen,
        openNotificationCenter,
        closeNotificationCenter,
        toggleNotificationCenter,
        notifications,
        unreadCount,
        loading,
        activeTab,
        setActiveTab,
        markAsRead,
        markAllAsRead,
        refreshNotifications: () => fetchNotifications(activeTab),
        isMarkingAll,
      }}
    >
      {children}
    </NotificationContext.Provider>
  )
}

export function useNotifications() {
  return useContext(NotificationContext)
}
