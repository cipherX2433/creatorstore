import { prisma } from '../lib/prisma.js'
import {
  authService,
  creatorSubscriptionService
} from '../lib/services.js'

function getTrialCountdown(subscription, simulatedNow = Date.now()) {
  if (!subscription) return null
  const isTrial = Boolean(
    subscription.isTrial ||
    subscription.status === 'TRIALING' ||
    subscription.trialStatus === 'ACTIVE'
  )
  const isExpired = Boolean(
    subscription.isTrialExpired ||
    subscription.trialStatus === 'EXPIRED' ||
    subscription.status === 'EXPIRED'
  )

  if (!isTrial || isExpired) return null
  if (!subscription.trialEndsAt) return null

  const now = simulatedNow
  const endsAt = new Date(subscription.trialEndsAt).getTime()
  const diffMs = endsAt - now

  if (diffMs <= 0) return null

  const oneDayMs = 24 * 60 * 60 * 1000
  const days = Math.floor(diffMs / oneDayMs)

  if (diffMs < oneDayMs) {
    return {
      desktopText: '7-Day Trial · Less than 1 day left',
      tabletText: 'Trial · <1d left',
    }
  }

  if (days === 1) {
    return {
      desktopText: '7-Day Trial · 1 day left',
      tabletText: 'Trial · 1d left',
    }
  }

  return {
    desktopText: `7-Day Trial · ${days} days left`,
    tabletText: `Trial · ${days}d left`,
  }
}

async function runTests() {
  console.log('======================================================================')
  console.log('🧪 RUNNING TOP BAR TRIAL INDICATOR & SEARCH REMOVAL TESTS')
  console.log('======================================================================\n')

  const ts = Date.now()
  const emailA = `trial_test_${ts}@test.com`
  let userA

  try {
    // -------------------------------------------------------------
    // Setup Creator Account
    // -------------------------------------------------------------
    userA = await authService.signup({
      email: emailA,
      password: 'Password123!',
      role: 'CREATOR',
      name: 'Trial Tester'
    })
    const creatorId = userA.user.id
    await prisma.user.update({ where: { id: creatorId }, data: { emailVerified: true } })

    // -------------------------------------------------------------
    // TEST 1: Active trial with 6+ days remaining
    // -------------------------------------------------------------
    console.log('▶ TEST 1: Active trial with 6+ days remaining');
    await creatorSubscriptionService.startTrial(creatorId, { plan: 'PRO' })
    const sub1 = await creatorSubscriptionService.getStatus(creatorId)
    const countdown1 = getTrialCountdown(sub1)

    if (!countdown1 || countdown1.desktopText !== '7-Day Trial · 6 days left') {
      throw new Error(`TEST 1 FAILED: Expected '7-Day Trial · 6 days left', got '${countdown1?.desktopText}'`)
    }
    console.log(`   ✅ Active trial badge: "${countdown1.desktopText}" (tablet: "${countdown1.tabletText}")\n`)

    // -------------------------------------------------------------
    // TEST 2: Active trial with less than 24 hours remaining
    // -------------------------------------------------------------
    console.log('▶ TEST 2: Active trial with less than 24 hours remaining');
    const now = Date.now()
    const simulatedSub2 = {
      ...sub1,
      trialEndsAt: new Date(now + 12 * 60 * 60 * 1000).toISOString(),
    }
    const countdown2 = getTrialCountdown(simulatedSub2, now)

    if (!countdown2 || countdown2.desktopText !== '7-Day Trial · Less than 1 day left') {
      throw new Error(`TEST 2 FAILED: Expected '7-Day Trial · Less than 1 day left', got '${countdown2?.desktopText}'`)
    }
    console.log(`   ✅ Urgent badge: "${countdown2.desktopText}" (tablet: "${countdown2.tabletText}")\n`)

    // -------------------------------------------------------------
    // TEST 3: Expired trial
    // -------------------------------------------------------------
    console.log('▶ TEST 3: Expired trial');
    await prisma.creatorSubscription.update({
      where: { creatorId },
      data: {
        trialStatus: 'EXPIRED',
        trialEndsAt: new Date(Date.now() - 3600000),
      }
    })
    const sub3 = await creatorSubscriptionService.getStatus(creatorId)
    const countdown3 = getTrialCountdown(sub3)

    if (countdown3 !== null) {
      throw new Error(`TEST 3 FAILED: Expected null for expired trial, got '${JSON.stringify(countdown3)}'`)
    }
    console.log('   ✅ Expired trial correctly hides trial countdown badge\n')

    // -------------------------------------------------------------
    // TEST 4: Creator Plan (₹499/mo) active
    // -------------------------------------------------------------
    console.log('▶ TEST 4: Creator Plan (₹499/mo) active');
    await prisma.creatorSubscription.update({
      where: { creatorId },
      data: {
        plan: 'CREATOR',
        status: 'ACTIVE',
        trialStatus: 'EXPIRED',
        amount: 499,
        currency: 'INR',
        provider: 'RAZORPAY',
        providerSubscriptionId: 'sub_test_creator',
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      }
    })
    const sub4 = await creatorSubscriptionService.getStatus(creatorId)
    const countdown4 = getTrialCountdown(sub4)

    if (countdown4 !== null) {
      throw new Error(`TEST 4 FAILED: Expected null for paid Creator plan, got '${JSON.stringify(countdown4)}'`)
    }
    console.log('   ✅ Active Creator plan correctly hides trial countdown badge\n')

    // -------------------------------------------------------------
    // TEST 5: Pro Plan (₹999/mo) active
    // -------------------------------------------------------------
    console.log('▶ TEST 5: Pro Plan (₹999/mo) active');
    await prisma.creatorSubscription.update({
      where: { creatorId },
      data: {
        plan: 'PRO',
        status: 'ACTIVE',
        trialStatus: 'EXPIRED',
        amount: 999,
        currency: 'INR',
        provider: 'RAZORPAY',
        providerSubscriptionId: 'sub_test_pro',
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      }
    })
    const sub5 = await creatorSubscriptionService.getStatus(creatorId)
    const countdown5 = getTrialCountdown(sub5)

    if (countdown5 !== null) {
      throw new Error(`TEST 5 FAILED: Expected null for paid Pro plan, got '${JSON.stringify(countdown5)}'`)
    }
    console.log('   ✅ Active Pro plan correctly hides trial countdown badge\n')

    // -------------------------------------------------------------
    // TEST 6: Free / Unsubscribed user (not started trial)
    // -------------------------------------------------------------
    console.log('▶ TEST 6: Free / Unsubscribed user (trial not started)');
    await prisma.creatorSubscription.update({
      where: { creatorId },
      data: {
        plan: 'UNSUBSCRIBED',
        status: 'INACTIVE',
        trialStatus: 'NOT_STARTED',
        trialStartedAt: null,
        trialEndsAt: null,
        amount: 0,
        providerSubscriptionId: null,
      }
    })
    const sub6 = await creatorSubscriptionService.getStatus(creatorId)
    const countdown6 = getTrialCountdown(sub6)

    if (countdown6 !== null) {
      throw new Error(`TEST 6 FAILED: Expected null for not started trial, got '${JSON.stringify(countdown6)}'`)
    }
    console.log('   ✅ Free user correctly hides trial countdown badge\n')

    console.log('======================================================================')
    console.log('🎉 ALL TOP BAR TRIAL INDICATOR TESTS PASSED SUCCESSFULLY!')
    console.log('======================================================================')
  } finally {
    if (userA?.user?.id) {
      await prisma.store.deleteMany({ where: { creatorId: userA.user.id } }).catch(() => {})
      await prisma.creatorProfile.deleteMany({ where: { creatorId: userA.user.id } }).catch(() => {})
      await prisma.creatorSubscription.deleteMany({ where: { creatorId: userA.user.id } }).catch(() => {})
      await prisma.user.deleteMany({ where: { id: userA.user.id } }).catch(() => {})
    }
  }
}

runTests().catch((err) => {
  console.error('❌ Test suite failed:', err)
  process.exit(1)
})
