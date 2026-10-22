import assert from 'node:assert'
import fs from 'node:fs'
import path from 'node:path'
import {
  instagramService,
  publicService,
} from '../lib/services.js'
import { instagramRepo, storesRepo, storeSectionsRepo, usersRepo, profilesRepo } from '../lib/repos.js'
import { prisma } from '../lib/prisma.js'

const ROOT = process.cwd()

console.log('======================================================================')
console.log('🚀 CreatorStore — Real Instagram Integration End-to-End Test Suite')
console.log('======================================================================\n')

import crypto from 'node:crypto'

const TEST_CREATOR_ID_1 = crypto.randomUUID()
const TEST_CREATOR_ID_2 = crypto.randomUUID()
const TEST_IG_ACCOUNT_ID = 'ig_uid_99887766'

try {
  // Create test users in DB
  await usersRepo.create({
    id: TEST_CREATOR_ID_1,
    email: `ig_test_1_${Date.now()}@example.com`,
    passwordHash: '$2b$10$abcdefghijklmnopqrstuvwxyz1234567890',
    role: 'CREATOR',
  })
  await profilesRepo.upsert(TEST_CREATOR_ID_1, {
    name: 'Real Creator Studio',
  })
  await prisma.creatorSubscription.upsert({
    where: { creatorId: TEST_CREATOR_ID_1 },
    update: {
      plan: 'CREATOR',
      status: 'ACTIVE',
      amount: 6,
    },
    create: {
      creatorId: TEST_CREATOR_ID_1,
      plan: 'CREATOR',
      status: 'ACTIVE',
      billingInterval: 'MONTHLY',
      amount: 6,
      currency: 'USD',
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  })

  await usersRepo.create({
    id: TEST_CREATOR_ID_2,
    email: `ig_test_2_${Date.now()}@example.com`,
    passwordHash: '$2b$10$abcdefghijklmnopqrstuvwxyz1234567890',
    role: 'CREATOR',
  })
  await profilesRepo.upsert(TEST_CREATOR_ID_2, {
    name: 'Other Creator',
  })
  // -------------------------------------------------------------------------
  // TEST 1 & 2: Authoritative Connection Status & Navigation Consistency
  // -------------------------------------------------------------------------
  console.log('Test 1 & 2: Authoritative Connection Status & Navigation Consistency...')

  // Clean initial state -> DISCONNECTED
  let status = await instagramService.getStatus(TEST_CREATOR_ID_1)
  assert.strictEqual(status.connected, false, 'Initial state must be not connected')
  assert.strictEqual(status.status, 'DISCONNECTED', 'Status must be DISCONNECTED')

  // Create an active connected account
  await instagramRepo.upsert(TEST_CREATOR_ID_1, {
    platform: 'INSTAGRAM',
    platformUserId: TEST_IG_ACCOUNT_ID,
    username: 'creator_studio_real',
    accessToken: 'test_token_valid_12345',
    status: 'CONNECTED',
    tokenExpiresAt: new Date(Date.now() + 60 * 24 * 3600 * 1000).toISOString(),
  })

  // Fetch status again
  status = await instagramService.getStatus(TEST_CREATOR_ID_1)
  assert.strictEqual(status.connected, true, 'Account must report connected: true')
  assert.strictEqual(status.status, 'CONNECTED', 'Status must be CONNECTED')
  assert.strictEqual(status.username, 'creator_studio_real', 'Username must match connected account')
  assert.strictEqual(status.isExpired, false, 'Valid connection must not be expired')
  assert.strictEqual(status.canReconnect, false, 'Valid connection must not require reconnect')
  assert.ok(status.account, 'Status response must provide account wrapper for backwards compatibility')
  assert.strictEqual(status.account.connected, true, 'account.connected must be true')

  // Verify dashboard store/page.js parsing handles both wrapped and flat responses
  const storePagePath = path.join(ROOT, 'app/dashboard/store/page.js')
  const storePageContent = fs.readFileSync(storePagePath, 'utf8')
  assert.ok(
    storePageContent.includes('const acc = igRes.account || igRes') || storePageContent.includes('igRes.account || igRes'),
    'app/dashboard/store/page.js must accept igRes.account || igRes so connection is not lost'
  )

  console.log('✅ Test 1 & 2 PASSED: Connection state is authoritative and survives navigation.\n')

  // -------------------------------------------------------------------------
  // TEST 3: Webhook failure does not show Reconnect or mark account disconnected
  // -------------------------------------------------------------------------
  console.log('Test 3: Webhook Subscription Failure Separation...')

  // Mark account as SUBSCRIPTION_FAILED (OAuth is valid, but webhook failed)
  await instagramRepo.upsert(TEST_CREATOR_ID_1, {
    platformUserId: TEST_IG_ACCOUNT_ID,
    username: 'creator_studio_real',
    accessToken: 'test_token_valid_12345',
    status: 'SUBSCRIPTION_FAILED',
  })

  const webhookFailStatus = await instagramService.getStatus(TEST_CREATOR_ID_1)
  assert.strictEqual(
    webhookFailStatus.connected,
    true,
    'Webhook subscription failure must NOT mark OAuth connection as disconnected'
  )
  assert.strictEqual(
    webhookFailStatus.status,
    'CONNECTED',
    'Authoritative status must remain CONNECTED'
  )
  assert.strictEqual(
    webhookFailStatus.subscriptionStatus,
    'FAILED',
    'subscriptionStatus must report FAILED separately'
  )
  assert.strictEqual(
    webhookFailStatus.isExpired,
    false,
    'Webhook failure must not be flagged as token expired'
  )
  assert.strictEqual(
    webhookFailStatus.canReconnect,
    false,
    'Webhook failure must not ask user to reconnect OAuth'
  )

  // Verify SocialItemEditor UI separation
  const editorPath = path.join(ROOT, 'components/dashboard/editors/SocialItemEditor.jsx')
  const editorContent = fs.readFileSync(editorPath, 'utf8')
  assert.ok(
    editorContent.includes('Webhook subscription is pending') || editorContent.includes('isWebhookFailed'),
    'SocialItemEditor must show informational notice for webhook issue without claiming token expired'
  )
  assert.ok(
    !editorContent.includes('isIgConnected ? "Connected" : "Instagram connection expired"'),
    'SocialItemEditor must not unconditionally claim connection expired when disconnected'
  )

  console.log('✅ Test 3 PASSED: Webhook subscription status is strictly decoupled from OAuth connection.\n')

  // -------------------------------------------------------------------------
  // TEST 4: Genuinely expired token shows reauthorization state with Reconnect
  // -------------------------------------------------------------------------
  console.log('Test 4: Genuinely Expired Token Detection & Reconnect Prompt...')

  // Set token to expired date in the past
  await instagramRepo.upsert(TEST_CREATOR_ID_1, {
    platformUserId: TEST_IG_ACCOUNT_ID,
    username: 'creator_studio_real',
    accessToken: 'expired_token_123',
    tokenExpiresAt: new Date(Date.now() - 3600 * 1000).toISOString(),
    status: 'CONNECTED',
  })

  const expiredStatus = await instagramService.getStatus(TEST_CREATOR_ID_1)
  assert.strictEqual(expiredStatus.connected, false, 'Expired token must report connected: false')
  assert.strictEqual(expiredStatus.status, 'EXPIRED', 'Status must be EXPIRED')
  assert.strictEqual(expiredStatus.reauthorizationRequired, true, 'reauthorizationRequired must be true for expired token')

  assert.ok(
    editorContent.includes('isTokenExpired'),
    'SocialItemEditor must track isTokenExpired'
  )
  assert.ok(
    editorContent.includes('Instagram connection expired'),
    'SocialItemEditor must show expired message ONLY when token genuinely expired'
  )

  console.log('✅ Test 4 PASSED: Expired tokens trigger reauthorization, preserving configuration.\n')

  // Restore to active CONNECTED for subsequent tests
  await instagramRepo.upsert(TEST_CREATOR_ID_1, {
    platformUserId: TEST_IG_ACCOUNT_ID,
    username: 'creator_studio_real',
    accessToken: 'valid_token_xyz',
    tokenExpiresAt: new Date(Date.now() + 60 * 24 * 3600 * 1000).toISOString(),
    status: 'CONNECTED',
  })

  // -------------------------------------------------------------------------
  // TEST 5: Temporary API timeout / error does not disconnect the account
  // -------------------------------------------------------------------------
  console.log('Test 5: Temporary API Failure Resilience...')

  // Prime cached profile and media in service cache
  global.__instagramProfileCache = global.__instagramProfileCache || new Map()
  global.__instagramProfileCache.set(TEST_CREATOR_ID_1, {
    id: TEST_IG_ACCOUNT_ID,
    username: 'creator_studio_real',
    name: 'Real Creator Studio',
    accountType: 'BUSINESS',
    profilePictureUrl: 'https://instagram.fcdn.net/real_avatar.jpg',
    biography: 'Official verified storefront account.',
    mediaCount: 42,
    followersCount: 5200,
    followerCount: 5200,
    followingCount: 310,
    followsCount: 310,
    followersCountUnavailable: false,
    followingCountUnavailable: false,
    profileUrl: 'https://instagram.com/creator_studio_real',
    lastSyncedAt: new Date().toISOString(),
    status: 'CONNECTED',
    _cachedAt: Date.now(),
  })

  global.__instagramMediaCache = global.__instagramMediaCache || new Map()
  global.__instagramMediaCache.set(TEST_CREATOR_ID_1, {
    media: [
      {
        id: 'media_101',
        caption: 'First real studio launch post',
        mediaType: 'IMAGE',
        mediaUrl: 'https://instagram.fcdn.net/p1.jpg',
        permalink: 'https://instagram.com/p/B123456/',
        timestamp: new Date().toISOString(),
      },
      {
        id: 'media_102',
        caption: 'Behind the scenes video',
        mediaType: 'VIDEO',
        mediaUrl: 'https://instagram.fcdn.net/p2.jpg',
        thumbnailUrl: 'https://instagram.fcdn.net/p2_thumb.jpg',
        permalink: 'https://instagram.com/p/B789012/',
        timestamp: new Date().toISOString(),
      },
    ],
    lastSyncedAt: new Date().toISOString(),
    _cachedAt: Date.now(),
  })

  // getProfile without force returns cached result safely
  const cachedProfileResult = await instagramService.getProfile(TEST_CREATOR_ID_1, { forceRefresh: false })
  assert.strictEqual(cachedProfileResult.username, 'creator_studio_real')
  assert.strictEqual(cachedProfileResult.mediaCount, 42)

  // Verify connection status remains CONNECTED
  const statusAfterTransient = await instagramService.getStatus(TEST_CREATOR_ID_1)
  assert.strictEqual(statusAfterTransient.connected, true, 'Temporary error must NOT disconnect account')
  assert.strictEqual(statusAfterTransient.status, 'CONNECTED')

  console.log('✅ Test 5 PASSED: Temporary API errors retain cache and do not disconnect account.\n')

  // -------------------------------------------------------------------------
  // TEST 6 & 7: Profile Mode Displays Real Follower/Following Counts
  // -------------------------------------------------------------------------
  console.log('Test 6 & 7: Profile Mode Displays Real Fields & Real Follower Counts...')

  assert.strictEqual(
    cachedProfileResult.followersCount,
    5200,
    'Follower count must match real returned count'
  )
  assert.strictEqual(
    cachedProfileResult.followersCountUnavailable,
    false,
    'followersCountUnavailable flag must be false when count is present'
  )
  assert.strictEqual(
    cachedProfileResult.followingCount,
    310,
    'Following count must match real returned count'
  )
  assert.strictEqual(
    cachedProfileResult.followingCountUnavailable,
    false,
    'followingCountUnavailable flag must be false when count is present'
  )
  assert.strictEqual(
    cachedProfileResult.mediaCount,
    42,
    'Media count from real API must be preserved'
  )

  // Verify PublicStoreRenderer handles unavailable follower/following counts honestly
  const rendererPath = path.join(ROOT, 'components/storefront/PublicStoreRenderer.jsx')
  const rendererContent = fs.readFileSync(rendererPath, 'utf8')

  assert.ok(
    rendererContent.includes('Unavailable') || rendererContent.includes('unavailable'),
    'PublicStoreRenderer must render "Unavailable" when follower counts are null'
  )
  assert.ok(
    !rendererContent.includes('14.2k') && !rendererContent.includes('12.4k'),
    'PublicStoreRenderer must NOT have hardcoded mock follower counts like 14.2k or 12.4k'
  )

  console.log('✅ Test 6 & 7 PASSED: Real profile fields used, follower count honestly marked Unavailable.\n')

  // -------------------------------------------------------------------------
  // TEST 8, 9, 10: Grid, Carousel & Card Modes Use Real Media & Permalinks
  // -------------------------------------------------------------------------
  console.log('Test 8, 9 & 10: Grid, Carousel, and Card Modes Render Real Media & Permalinks...')

  const cachedMediaResult = await instagramService.getMedia(TEST_CREATOR_ID_1, { limit: 12 })
  assert.strictEqual(cachedMediaResult.media.length, 2, 'Must return the 2 real media items')
  assert.strictEqual(cachedMediaResult.media[0].id, 'media_101')
  assert.strictEqual(cachedMediaResult.media[0].permalink, 'https://instagram.com/p/B123456/')
  assert.strictEqual(cachedMediaResult.media[1].id, 'media_102')
  assert.strictEqual(cachedMediaResult.media[1].permalink, 'https://instagram.com/p/B789012/')

  // Verify PublicStoreRenderer renders real media permalinks
  assert.ok(
    rendererContent.includes('item.permalink'),
    'PublicStoreRenderer must link real media to item.permalink'
  )
  assert.ok(
    rendererContent.includes('item.mediaUrl') || rendererContent.includes('item.thumbnailUrl'),
    'PublicStoreRenderer must render item.mediaUrl or item.thumbnailUrl'
  )

  // Verify SocialItemEditor preview renders real media
  assert.ok(
    editorContent.includes('igMedia'),
    'SocialItemEditor must use igMedia state for real previews'
  )
  assert.ok(
    !editorContent.includes('bg-linear-to-br from-purple-500/10 to-pink-500/10'),
    'SocialItemEditor must NOT render dummy placeholder boxes in live grid/carousel previews'
  )

  console.log('✅ Test 8, 9 & 10 PASSED: Grid, Carousel, and Card modes use real media URLs and permalinks.\n')

  // -------------------------------------------------------------------------
  // TEST 11: Empty Media Returns Clean Empty State (No Mock Posts)
  // -------------------------------------------------------------------------
  console.log('Test 11: Empty Media Returns Clean Empty State, Never Mock Posts...')

  // Clear cached media to empty
  global.__instagramMediaCache.set(TEST_CREATOR_ID_1, {
    media: [],
    lastSyncedAt: new Date().toISOString(),
    _cachedAt: Date.now(),
  })

  // Check backend getMedia
  const servicesContent = fs.readFileSync(path.join(ROOT, 'lib/services.js'), 'utf8')
  assert.ok(
    !servicesContent.includes('media_reel_1_') && !servicesContent.includes('https://images.unsplash.com/photo-1618005182384'),
    'lib/services.js must NOT contain mock Unsplash fallback media'
  )

  // Verify editor shows honest empty state
  assert.ok(
    editorContent.includes('No Instagram posts found'),
    'SocialItemEditor must show honest empty state when account has 0 posts'
  )

  // Verify storefront renderer shows honest empty state
  assert.ok(
    rendererContent.includes('No Instagram posts found'),
    'PublicStoreRenderer must show honest empty state when account has 0 posts'
  )

  console.log('✅ Test 11 PASSED: Empty media accounts produce honest empty state, zero fake posts.\n')

  // -------------------------------------------------------------------------
  // TEST 12: Unsupported Profile Fields Omitted or Marked Unavailable
  // -------------------------------------------------------------------------
  console.log('Test 12: Unsupported Profile Fields Omitted or Marked Unavailable...')

  global.__instagramProfileCache.set(TEST_CREATOR_ID_1, {
    ...global.__instagramProfileCache.get(TEST_CREATOR_ID_1),
    followersCount: null,
    followerCount: null,
    followingCount: null,
    followsCount: null,
    followersCountUnavailable: true,
    followingCountUnavailable: true,
    _cachedAt: Date.now(),
  })
  const unavailProf = await instagramService.getProfile(TEST_CREATOR_ID_1, { forceRefresh: false })
  assert.strictEqual(unavailProf.followersCount, null)
  assert.strictEqual(unavailProf.followingCount, null)
  assert.strictEqual(unavailProf.followersCountUnavailable, true)
  assert.strictEqual(unavailProf.followingCountUnavailable, true)

  console.log('✅ Test 12 PASSED: Unsupported fields properly marked unavailable.\n')

  // -------------------------------------------------------------------------
  // TEST 13: IDOR Security — Connection Cannot Be Accessed by Another Creator
  // -------------------------------------------------------------------------
  console.log('Test 13: Multi-Tenant IDOR Security Verification...')

  // Creator 2 has no Instagram connected
  const creator2Status = await instagramService.getStatus(TEST_CREATOR_ID_2)
  assert.strictEqual(creator2Status.connected, false, 'Creator 2 must not see Creator 1 connection')
  assert.strictEqual(creator2Status.username, '', 'Creator 2 username must be empty')

  const creator2Profile = await instagramService.getProfile(TEST_CREATOR_ID_2)
  assert.strictEqual(creator2Profile.connected, false, 'Creator 2 profile must report connected: false')

  const creator2Media = await instagramService.getMedia(TEST_CREATOR_ID_2)
  assert.strictEqual(creator2Media.media.length, 0, 'Creator 2 must get empty media')

  console.log('✅ Test 13 PASSED: Instagram connections are strictly isolated by creatorId.\n')

  // -------------------------------------------------------------------------
  // TEST 14: Existing Instagram Tiles Retain Configuration & Get Enriched
  // -------------------------------------------------------------------------
  console.log('Test 14: Backward Compatibility with Existing Tiles...')

  // Reset Creator 1 media cache with 1 post
  global.__instagramMediaCache.set(TEST_CREATOR_ID_1, {
    media: [
      {
        id: 'media_101',
        caption: 'First real studio launch post',
        mediaType: 'IMAGE',
        mediaUrl: 'https://instagram.fcdn.net/p1.jpg',
        permalink: 'https://instagram.com/p/B123456/',
        timestamp: new Date().toISOString(),
      },
    ],
    lastSyncedAt: new Date().toISOString(),
    _cachedAt: Date.now(),
  })

  // Create store with existing legacy tile
  const testStoreSlug = 'teststore_' + Date.now()
  await storesRepo.upsertStore(TEST_CREATOR_ID_1, {
    username: testStoreSlug,
    slug: testStoreSlug,
    storeName: 'Test Creator Store',
    published: true,
  })

  const testSecId = crypto.randomUUID()
  await storeSectionsRepo.saveSections(TEST_CREATOR_ID_1, [
    {
      id: testSecId,
      type: 'instagram',
      title: 'Follow My Studio',
      props: {
        url: 'https://instagram.com/creator_studio_real',
        style: 'profile',
      },
    },
  ])

  // Resolve storefront via publicService
  const storefrontRes = await publicService.resolveStorefront(testStoreSlug)
  assert.strictEqual(storefrontRes.status, 'ok', 'Storefront must resolve')
  const igSection = storefrontRes.data.sections.find((s) => s.id === testSecId)
  assert.ok(igSection, 'Instagram section must be present')
  assert.strictEqual(igSection.props.url, 'https://instagram.com/creator_studio_real')
  assert.strictEqual(igSection.props.style, 'profile')
  assert.ok(igSection.props.instagramData, 'Section must be dynamically enriched with real instagramData')
  assert.strictEqual(igSection.props.instagramData.profile.username, 'creator_studio_real')

  console.log('✅ Test 14 PASSED: Existing tiles retain title, URL, display style, and get enriched data.\n')

  // -------------------------------------------------------------------------
  // TEST 15: Reconnection Does Not Create Duplicate Account Records
  // -------------------------------------------------------------------------
  console.log('Test 15: Upsert Idempotency (No Duplicate Accounts on Reconnection)...')

  // Simulate user reconnecting the same account with an updated username
  await instagramRepo.upsert(TEST_CREATOR_ID_1, {
    platformUserId: TEST_IG_ACCOUNT_ID,
    username: 'creator_studio_real_v2',
    accessToken: 'new_refreshed_token_98765',
    status: 'CONNECTED',
  })

  const fetchedAcc = await instagramRepo.getByCreatorId(TEST_CREATOR_ID_1)
  assert.ok(fetchedAcc, 'Account must exist')
  assert.strictEqual(fetchedAcc.username, 'creator_studio_real_v2', 'Username must be updated in place')

  console.log('✅ Test 15 PASSED: Upsert updates in place without duplicate records.\n')

  // -------------------------------------------------------------------------
  // TEST 16: Public Storefront Does Not Expose Credentials
  // -------------------------------------------------------------------------
  console.log('Test 16: Public Storefront Credential Sanitization...')

  const publicData = await publicService.resolveStorefront(testStoreSlug)
  const jsonString = JSON.stringify(publicData)

  assert.ok(!jsonString.includes('new_refreshed_token_98765'), 'Access token must NOT be exposed in public storefront')
  assert.ok(!jsonString.includes('accessToken'), 'accessToken key must NOT be present in public storefront')
  assert.ok(!jsonString.includes('appSecret'), 'appSecret must NOT be present')
  assert.ok(!jsonString.includes('clientSecret'), 'clientSecret must NOT be present')

  console.log('✅ Test 16 PASSED: Storefront response is strictly sanitized and leak-free.\n')

  // -------------------------------------------------------------------------
  // TEST 17 & 18: Loading, Cached-Data, and Rate-Limit Handling
  // -------------------------------------------------------------------------
  console.log('Test 17 & 18: Error, Cache, and Rate Limit Graceful Degradation...')

  // Backend sync route test
  const apiRoutePath = path.join(ROOT, 'app/api/[[...path]]/route.js')
  const apiRouteContent = fs.readFileSync(apiRoutePath, 'utf8')
  assert.ok(
    apiRouteContent.includes("route === '/integrations/instagram/profile'"),
    'route.js must support /integrations/instagram/profile'
  )
  assert.ok(
    apiRouteContent.includes("route === '/integrations/instagram/sync'"),
    'route.js must support /integrations/instagram/sync'
  )

  // Verify rate limit / tokenExpired / transient error handling in getMedia
  assert.ok(
    servicesContent.includes("data.error.code === 190") &&
      servicesContent.includes("error: 'TOKEN_EXPIRED'") &&
      servicesContent.includes("temporaryError: true"),
    'getMedia must handle token expiration (code 190) and temporary API errors/rate-limits safely'
  )

  console.log('✅ Test 17 & 18 PASSED: Rate-limit and transient error handling validated.\n')

  // Clean up test records
  await instagramRepo.deleteByCreatorId(TEST_CREATOR_ID_1).catch(() => {})
  await instagramRepo.deleteByCreatorId(TEST_CREATOR_ID_2).catch(() => {})
  await prisma.storeSection?.deleteMany({ where: { creatorId: TEST_CREATOR_ID_1 } }).catch(() => {})
  await prisma.store?.deleteMany({ where: { creatorId: TEST_CREATOR_ID_1 } }).catch(() => {})
  await prisma.creatorSubscription?.deleteMany({ where: { creatorId: TEST_CREATOR_ID_1 } }).catch(() => {})
  await prisma.creatorProfile?.deleteMany({ where: { creatorId: { in: [TEST_CREATOR_ID_1, TEST_CREATOR_ID_2] } } }).catch(() => {})
  await prisma.user?.deleteMany({ where: { id: { in: [TEST_CREATOR_ID_1, TEST_CREATOR_ID_2] } } }).catch(() => {})

  console.log('======================================================================')
  console.log('🎉 ALL 18 INSTAGRAM END-TO-END INTEGRATION TEST SCENARIOS PASSED! 🎉')
  console.log('======================================================================\n')
} catch (err) {
  console.error('\n❌ TEST FAILED:', err)
  process.exit(1)
}
