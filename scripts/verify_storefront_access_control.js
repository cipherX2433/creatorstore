/**
 * Verification Test Suite: Storefront Activation + Paid Plan Access Control
 */

import { authService, storeService, publicService, creatorSubscriptionService } from '../lib/services.js'
import { storesRepo, creatorSubscriptionsRepo, usersRepo, productsRepo } from '../lib/repos.js'
import { v4 as uuidv4 } from 'uuid'

async function runTests() {
  console.log('=================================================================')
  console.log('  RUNNING STOREFRONT ACCESS CONTROL & PAID SUBSCRIPTION TESTS')
  console.log('=================================================================\n')

  let passed = 0
  let total = 0

  function assert(condition, testName) {
    total++
    if (condition) {
      console.log(`  ✓ PASS: ${testName}`)
      passed++
    } else {
      console.error(`  ✗ FAIL: ${testName}`)
      process.exitCode = 1
    }
  }

  // ─── TEST 1: NEW SIGNUP INITIALLY HAS STOREFRONT OFF ────────────────────────
  console.log('--- Test 1: New Signup Initial State ---')
  const email1 = `test_creator_free_${Date.now()}@example.com`
  const signupRes1 = await authService.signup({
    email: email1,
    password: 'Password123!',
    name: 'Alice Creator',
    username: `alice_${Date.now().toString().slice(-4)}`,
    role: 'CREATOR',
  })
  const user1 = signupRes1.user
  const initialStore1 = await storeService.getOrCreate(user1.id)
  const initialSub1 = await creatorSubscriptionService.get(user1.id)

  assert(initialStore1.published === false, 'New user has storefront published = false (OFF)')
  assert(initialSub1.canSell === false, 'New user cannot sell / is unpaid (canSell = false)')
  assert(initialSub1.planId === 'UNSUBSCRIBED', 'New user planId is UNSUBSCRIBED')

  // ─── TEST 2: FREE USER DIRECTLY CALLS ACTIVATION API -> 403 ───────────────
  console.log('\n--- Test 2: Free User Activation Rejection ---')
  let activationError = null
  try {
    await storeService.publish(user1.id)
  } catch (err) {
    activationError = err
  }
  assert(activationError !== null, 'Free user calling publish() threw an error')
  assert(activationError?.status === 403, 'Error status is HTTP 403 Forbidden')
  assert(activationError?.code === 'PAID_PLAN_REQUIRED', 'Error code is PAID_PLAN_REQUIRED')

  const storeAfterFailedActivation = await storesRepo.getByCreator(user1.id)
  assert(storeAfterFailedActivation.published === false, 'Storefront remains OFF in database after rejection')

  // ─── TEST 3: CREATOR ACTIVE SUBSCRIBER ACTIVATES STOREFRONT ──────────────
  console.log('\n--- Test 3: Creator Plan Subscriber Activation ---')
  const email2 = `test_creator_sub_${Date.now()}@example.com`
  const signupRes2 = await authService.signup({
    email: email2,
    password: 'Password123!',
    name: 'Bob Creator Plan',
    username: `bob_${Date.now().toString().slice(-4)}`,
    role: 'CREATOR',
  })
  const user2 = signupRes2.user

  // Grant active CREATOR subscription
  const periodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
  await creatorSubscriptionsRepo.upsert(user2.id, {
    status: 'ACTIVE',
    plan: 'CREATOR',
    billingCycle: 'MONTHLY',
    price: 1,
    currency: 'INR',
    currentPeriodEnd: periodEnd,
  })

  const sub2 = await creatorSubscriptionService.get(user2.id)
  assert(sub2.canSell === true && sub2.planId === 'CREATOR', 'Bob has active CREATOR subscription')

  const activateRes2 = await storeService.publish(user2.id)
  assert(activateRes2.success === true, 'Activation succeeded for Creator Plan')
  assert(activateRes2.storefrontEnabled === true, 'storefrontEnabled is true')
  assert(activateRes2.published === true, 'published is true')

  const storeAfterPublish2 = await storesRepo.getByCreator(user2.id)
  assert(storeAfterPublish2.published === true, 'Storefront is LIVE in database')

  // ─── TEST 4: PRO ACTIVE SUBSCRIBER ACTIVATES STOREFRONT ────────────────
  console.log('\n--- Test 4: Pro Plan Subscriber Activation ---')
  const email3 = `test_pro_sub_${Date.now()}@example.com`
  const signupRes3 = await authService.signup({
    email: email3,
    password: 'Password123!',
    name: 'Charlie Pro Creator',
    username: `charlie_${Date.now().toString().slice(-4)}`,
    role: 'CREATOR',
  })
  const user3 = signupRes3.user

  // Grant active PRO subscription
  await creatorSubscriptionsRepo.upsert(user3.id, {
    status: 'ACTIVE',
    plan: 'PRO',
    billingCycle: 'MONTHLY',
    price: 499,
    currency: 'INR',
    currentPeriodEnd: periodEnd,
  })

  const sub3 = await creatorSubscriptionService.get(user3.id)
  assert(sub3.canSell === true && sub3.planId === 'PRO', 'Charlie has active PRO subscription')

  const activateRes3 = await storeService.publish(user3.id)
  assert(activateRes3.success === true && activateRes3.published === true, 'Activation succeeded for Pro Plan')

  // ─── TEST 5: PAID USER TURNS STOREFRONT OFF ─────────────────────────────────
  console.log('\n--- Test 5: Paid User Turns Storefront OFF ---')
  // Add a product first to verify data integrity
  await productsRepo.create({
    id: uuidv4(),
    creatorId: user2.id,
    title: "Bob's Ebook",
    price: 29,
    status: 'PUBLISHED',
    slug: 'bobs-ebook',
    type: 'digital_download',
  })

  const deactRes = await storeService.unpublish(user2.id)
  assert(deactRes.success === true, 'Deactivate call succeeded')
  assert(deactRes.storefrontEnabled === false, 'storefrontEnabled is false')
  assert(deactRes.published === false, 'published is false')

  const storeAfterDeact = await storesRepo.getByCreator(user2.id)
  assert(storeAfterDeact.published === false, 'Storefront is OFF in database')

  const productsAfterDeact = await productsRepo.list(user2.id)
  assert(productsAfterDeact.length === 1 && productsAfterDeact[0].title === "Bob's Ebook", 'Products preserved intact after turning OFF')

  // ─── TEST 6: PAID USER TURNS STOREFRONT ON AGAIN ────────────────────────────
  console.log('\n--- Test 6: Re-Activating Storefront ---')
  const reactRes = await storeService.publish(user2.id)
  assert(reactRes.success === true && reactRes.published === true, 'Storefront reactivated successfully to LIVE')

  // ─── TEST 7: SUBSCRIPTION EXPIRES -> CANNOT REACTIVATE ──────────────────────
  console.log('\n--- Test 7: Expired Subscription Enforcement ---')
  // Turn off first
  await storeService.unpublish(user2.id)

  // Expire subscription in database
  const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000)
  await creatorSubscriptionsRepo.upsert(user2.id, {
    status: 'ACTIVE',
    plan: 'CREATOR',
    currentPeriodEnd: pastDate,
  })

  let expiredActivationErr = null
  try {
    await storeService.publish(user2.id)
  } catch (err) {
    expiredActivationErr = err
  }
  assert(expiredActivationErr !== null, 'Expired subscriber activation rejected')
  assert(expiredActivationErr?.status === 403, 'Rejected with HTTP 403')

  // ─── TEST 8: PUBLIC RESOLUTION OF AN OFF STOREFRONT ─────────────────────────
  console.log('\n--- Test 8: Public Resolution of Offline Storefront ---')
  const publicResolveOff = await publicService.resolveStorefront(storeAfterDeact.username)
  assert(publicResolveOff.status === 'unpublished', 'Public resolution returns status: unpublished')

  // Clean up test records
  console.log('\n=================================================================')
  console.log(`  RESULTS: ${passed}/${total} TESTS PASSED`)
  console.log('=================================================================\n')
}

runTests().catch((e) => {
  console.error('Test error:', e)
  process.exit(1)
})
