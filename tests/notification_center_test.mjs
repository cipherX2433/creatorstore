import { describe, it } from 'node:test'
import assert from 'node:assert'
import { prisma } from '../lib/prisma.js'
import { notificationService } from '../lib/notificationService.js'

describe('Notification Center Backend and Database Integration', async () => {
  // Test creator users
  let testUserA
  let testUserB

  it('verifies notification table schema and connects to database', async () => {
    // Ensure we can query the notification model in prisma
    const count = await prisma.notification.count()
    assert(typeof count === 'number', 'Notification table should return numeric count')
  })

  it('creates test creator users and verifies isolated notifications', async () => {
    const timestamp = Date.now()
    testUserA = await prisma.user.create({
      data: {
        email: `notif_user_a_${timestamp}@creatorstore.test`,
        passwordHash: 'dummy_hash_for_test',
        role: 'CREATOR',
        store: {
          create: {
            username: `notif_a_${timestamp}`,
            storeName: 'Test Store A',
          },
        },
      },
    })

    testUserB = await prisma.user.create({
      data: {
        email: `notif_user_b_${timestamp}@creatorstore.test`,
        passwordHash: 'dummy_hash_for_test',
        role: 'CREATOR',
        store: {
          create: {
            username: `notif_b_${timestamp}`,
            storeName: 'Test Store B',
          },
        },
      },
    })

    assert(testUserA.id, 'User A created')
    assert(testUserB.id, 'User B created')

    // Create notifications for User A
    const n1 = await notificationService.createNotification({
      userId: testUserA.id,
      title: 'Halloween stickers just dropped! 🎃',
      message: 'Boo! Treat your store to a Sorta Spooky sticker.',
      category: 'UPDATES',
      type: 'SYSTEM',
    })

    const n2 = await notificationService.createNotification({
      userId: testUserA.id,
      title: 'New booking: 1:1 Coaching',
      message: 'A customer booked Book 1:1 time with me from your store.',
      category: 'OPPORTUNITIES',
      type: 'BOOKING',
      link: '/dashboard/calendar',
    })

    const n3 = await notificationService.createNotification({
      userId: testUserA.id,
      title: 'Audience growth milestone',
      message: 'Your store received 500 visitors this week.',
      category: 'INSIGHTS',
      type: 'INSIGHTS',
      link: '/dashboard/analytics',
    })

    // Create a notification for User B
    const nB = await notificationService.createNotification({
      userId: testUserB.id,
      title: 'User B private notification',
      message: 'Should never leak to User A.',
      category: 'UPDATES',
      type: 'SYSTEM',
    })

    assert(n1.id && n2.id && n3.id && nB.id, 'All test notifications created')

    // 1. Verify User A notifications count and isolation
    const userANotifs = await notificationService.getNotifications(testUserA.id, { category: 'All' })
    assert.strictEqual(userANotifs.notifications.length, 3, 'User A should have exactly 3 notifications')
    assert.strictEqual(userANotifs.unreadCount, 3, 'User A should have 3 unread')
    assert(userANotifs.notifications.every((n) => n.userId === testUserA.id), 'All belong to User A')

    // 2. Verify User B isolation
    const userBNotifs = await notificationService.getNotifications(testUserB.id, { category: 'All' })
    assert.strictEqual(userBNotifs.notifications.length, 1, 'User B should have 1 notification')
    assert.strictEqual(userBNotifs.unreadCount, 1, 'User B should have 1 unread')
    assert.strictEqual(userBNotifs.notifications[0].title, 'User B private notification')

    // 3. Category filtering for User A
    const updates = await notificationService.getNotifications(testUserA.id, { category: 'Updates' })
    assert.strictEqual(updates.notifications.length, 1, 'Should find 1 Updates notification')
    assert.strictEqual(updates.notifications[0].category, 'UPDATES')

    const opps = await notificationService.getNotifications(testUserA.id, { category: 'Opportunities' })
    assert.strictEqual(opps.notifications.length, 1, 'Should find 1 Opportunities notification')
    assert.strictEqual(opps.notifications[0].category, 'OPPORTUNITIES')

    const insights = await notificationService.getNotifications(testUserA.id, { category: 'Insights' })
    assert.strictEqual(insights.notifications.length, 1, 'Should find 1 Insights notification')
    assert.strictEqual(insights.notifications[0].category, 'INSIGHTS')

    // 4. Mark single notification as read
    const markSingleRes = await notificationService.markAsRead(testUserA.id, n1.id)
    assert.strictEqual(markSingleRes.success, true)
    assert.strictEqual(markSingleRes.unreadCount, 2, 'Unread count should decrement to 2')

    // Check single read persistence
    const reloadedA = await notificationService.getNotifications(testUserA.id, { category: 'All' })
    const reloadedN1 = reloadedA.notifications.find((n) => n.id === n1.id)
    assert.strictEqual(reloadedN1.isRead, true, 'n1 should now be read')
    assert.strictEqual(reloadedA.unreadCount, 2, 'Total unread count reflects persistence')

    // 5. Cross-user security: User A tries to mark User B's notification
    const crossUserRes = await notificationService.markAsRead(testUserA.id, nB.id)
    assert.strictEqual(crossUserRes.success, true)
    const checkB = await notificationService.getNotifications(testUserB.id, { category: 'All' })
    assert.strictEqual(checkB.notifications[0].isRead, false, 'User B notification must remain unread')

    // 6. Mark all as read for User A
    const markAllRes = await notificationService.markAllAsRead(testUserA.id)
    assert.strictEqual(markAllRes.success, true)
    assert.strictEqual(markAllRes.updatedCount, 2, 'Updated remaining 2 unread notifications')
    assert.strictEqual(markAllRes.unreadCount, 0, 'Unread count is 0')

    // Check all read persistence
    const allReadA = await notificationService.getNotifications(testUserA.id, { category: 'All' })
    assert(allReadA.notifications.every((n) => n.isRead === true), 'All User A notifications are now read')
    assert.strictEqual(allReadA.unreadCount, 0, 'User A unread count is 0')

    // Ensure User B was unaffected by User A's mark all as read
    const stillUnreadB = await notificationService.getUnreadCount(testUserB.id)
    assert.strictEqual(stillUnreadB, 1, 'User B still has 1 unread notification')

    // 7. Idempotency: Calling markAllAsRead again when 0 unread
    const idempotentRes = await notificationService.markAllAsRead(testUserA.id)
    assert.strictEqual(idempotentRes.success, true)
    assert.strictEqual(idempotentRes.updatedCount, 0)
    assert.strictEqual(idempotentRes.unreadCount, 0)

    // Cleanup test data
    await prisma.notification.deleteMany({
      where: { userId: { in: [testUserA.id, testUserB.id] } },
    })
    await prisma.store.deleteMany({
      where: { creatorId: { in: [testUserA.id, testUserB.id] } },
    })
    await prisma.user.deleteMany({
      where: { id: { in: [testUserA.id, testUserB.id] } },
    })
  })
})
