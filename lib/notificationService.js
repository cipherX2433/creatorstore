import { prisma } from './prisma.js'

/**
 * Service to manage real, persisted creator notifications.
 * Grounded in PostgreSQL `notifications` table.
 */
export const notificationService = {
  /**
   * Fetch notifications for a user, optionally filtered by category.
   * Auto-syncs any un-notified real store events (orders, bookings, form submissions)
   * on first load so real activity is reflected.
   */
  async getNotifications(userId, { category = 'All', limit = 50 } = {}) {
    if (!userId) return { notifications: [], unreadCount: 0 }

    // Check count of notifications in database
    const existingCount = await prisma.notification.count({
      where: { userId },
    })

    // If zero notifications exist yet for this creator, generate initial seed from real database events
    if (existingCount === 0) {
      await this.syncRealEventsToNotifications(userId)
    }

    // Build category filter
    const whereClause = { userId }
    if (category && category !== 'All') {
      whereClause.category = {
        equals: category.toUpperCase(),
        mode: 'insensitive',
      }
    }

    const [notifications, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        take: limit,
      }),
      prisma.notification.count({
        where: { userId, isRead: false },
      }),
    ])

    return {
      notifications,
      unreadCount,
    }
  },

  /**
   * Mark a single notification as read for the authenticated user.
   */
  async markAsRead(userId, notificationId) {
    if (!userId || !notificationId) return { success: false, unreadCount: 0 }

    await prisma.notification.updateMany({
      where: {
        id: notificationId,
        userId,
      },
      data: {
        isRead: true,
      },
    })

    const unreadCount = await prisma.notification.count({
      where: { userId, isRead: false },
    })

    return {
      success: true,
      notificationId,
      unreadCount,
    }
  },

  /**
   * Mark all unread notifications as read for the authenticated user.
   */
  async markAllAsRead(userId) {
    if (!userId) return { success: false, updatedCount: 0, unreadCount: 0 }

    const updateResult = await prisma.notification.updateMany({
      where: {
        userId,
        isRead: false,
      },
      data: {
        isRead: true,
      },
    })

    return {
      success: true,
      updatedCount: updateResult.count,
      unreadCount: 0,
    }
  },

  /**
   * Get unread notifications count for badge display.
   */
  async getUnreadCount(userId) {
    if (!userId) return 0
    return await prisma.notification.count({
      where: { userId, isRead: false },
    })
  },

  /**
   * Create a new notification record.
   */
  async createNotification({
    userId,
    title,
    message,
    category = 'UPDATES',
    type = 'SYSTEM',
    link = null,
    metadata = {},
  }) {
    if (!userId || !title) return null

    return await prisma.notification.create({
      data: {
        userId,
        title,
        message,
        category: category.toUpperCase(),
        type: type.toUpperCase(),
        isRead: false,
        link,
        metadata,
      },
    })
  },

  /**
   * Sync real store events into notifications table idempotently.
   */
  async syncRealEventsToNotifications(userId) {
    try {
      // 1. Fetch recent real orders for this creator
      const recentOrders = await prisma.order.findMany({
        where: { creatorId: userId, status: 'PAID' },
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: { product: true },
      }).catch(() => [])

      // 2. Fetch recent bookings for this creator
      const recentBookings = await prisma.coachingBooking?.findMany?.({
        where: { creatorId: userId },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }).catch(() => []) || []

      // 3. Fetch recent form submissions
      const recentSubmissions = await prisma.formSubmission.findMany({
        where: { creatorId: userId },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }).catch(() => [])

      const initialNotifications = []

      // Map real orders into Opportunities / Updates
      for (const order of recentOrders) {
        initialNotifications.push({
          userId,
          title: `New order: ₹${order.amount}`,
          message: `${order.customerName || 'A customer'} purchased ${order.product?.title || 'your product'}.`,
          category: 'OPPORTUNITIES',
          type: 'ORDER',
          isRead: false,
          link: `/dashboard/orders`,
          createdAt: order.createdAt || new Date(),
        })
      }

      // Map real bookings into Opportunities
      for (const booking of recentBookings) {
        initialNotifications.push({
          userId,
          title: 'New booking confirmed',
          message: `${booking.customerName || 'A customer'} booked 1:1 time with you: "${booking.sessionTitle || 'Coaching'}".`,
          category: 'OPPORTUNITIES',
          type: 'BOOKING',
          isRead: false,
          link: `/dashboard/calendar`,
          createdAt: booking.createdAt || new Date(),
        })
      }

      // Map real form submissions into Updates
      for (const sub of recentSubmissions) {
        initialNotifications.push({
          userId,
          title: 'New lead form inquiry',
          message: `${sub.name || 'A visitor'} submitted a response on your storefront form.`,
          category: 'UPDATES',
          type: 'SUBMISSION',
          isRead: false,
          link: `/dashboard/forms`,
          createdAt: sub.createdAt || new Date(),
        })
      }

      // System Welcome & Insights notifications if list is sparse
      initialNotifications.push({
        userId,
        title: 'Storefront live on CreatorStore',
        message: 'Your personal link in bio and digital store are active. Customize your theme and start sharing your link.',
        category: 'UPDATES',
        type: 'SYSTEM',
        isRead: false,
        link: '/dashboard/store',
        createdAt: new Date(),
      })

      initialNotifications.push({
        userId,
        title: 'Audience insights ready',
        message: 'Track pageviews, top referrers, and conversion rates across all your active offerings.',
        category: 'INSIGHTS',
        type: 'SYSTEM',
        isRead: false,
        link: '/dashboard/analytics',
        createdAt: new Date(Date.now() - 3600000 * 2),
      })

      // Bulk create notifications in database
      await prisma.notification.createMany({
        data: initialNotifications,
      })
    } catch (err) {
      console.warn('Failed to sync real events to notifications:', err?.message)
    }
  },
}
