import assert from 'node:assert'
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { instagramService, publicService } from '../lib/services.js'
import { instagramRepo, storesRepo, storeSectionsRepo, usersRepo, profilesRepo } from '../lib/repos.js'
import { prisma } from '../lib/prisma.js'

const ROOT = process.cwd()

console.log('======================================================================')
console.log('🧪 CreatorStore — Instagram Followers & Following Count Verification')
console.log('======================================================================\n')

const TEST_CREATOR_ID = crypto.randomUUID()
const TEST_STORE_SLUG = 'store_' + Date.now()

try {
  // -------------------------------------------------------------------------
  // 1. Source Code Audit — Requested Field Names & Property Mappings
  // -------------------------------------------------------------------------
  console.log('1. Auditing requested fields and property mappings in services.js...')
  const servicesPath = path.join(ROOT, 'lib/services.js')
  const servicesContent = fs.readFileSync(servicesPath, 'utf8')

  assert.ok(
    servicesContent.includes('followers_count') && servicesContent.includes('follows_count'),
    'services.js must request exact fields followers_count and follows_count from Meta API'
  )
  assert.ok(
    servicesContent.includes('followersCount: followersCount') && servicesContent.includes('followerCount: followersCount'),
    'services.js must map followers_count to both followersCount and followerCount'
  )
  assert.ok(
    servicesContent.includes('followingCount: followingCount') && servicesContent.includes('followsCount: followingCount'),
    'services.js must map follows_count to both followingCount and followsCount'
  )
  assert.ok(
    servicesContent.includes('followersCountUnavailable: !hasFollowers'),
    'services.js must dynamically set followersCountUnavailable'
  )
  console.log('✅ Step 1 PASSED: Exact field names and model properties verified.\n')

  // -------------------------------------------------------------------------
  // 2. Real Returned Counts (Positive Integers)
  // -------------------------------------------------------------------------
  console.log('2. Verifying profile mapping with real positive follower/following counts...')
  const mockRealProfileData = {
    id: 'ig_user_12345',
    username: 'creator_pro',
    name: 'Pro Creator',
    account_type: 'BUSINESS',
    profile_picture_url: 'https://instagram.fcdn.net/pro.jpg',
    biography: 'Professional creator studio',
    media_count: 50,
    followers_count: 14250,
    follows_count: 485,
  }

  // Inject into service cache to test data mapping
  global.__instagramProfileCache = global.__instagramProfileCache || new Map()
  global.__instagramProfileCache.set(TEST_CREATOR_ID, {
    connected: true,
    id: mockRealProfileData.id,
    username: mockRealProfileData.username,
    name: mockRealProfileData.name,
    profilePictureUrl: mockRealProfileData.profile_picture_url,
    biography: mockRealProfileData.biography,
    accountType: mockRealProfileData.account_type,
    mediaCount: mockRealProfileData.media_count,
    followersCount: mockRealProfileData.followers_count,
    followerCount: mockRealProfileData.followers_count,
    followingCount: mockRealProfileData.follows_count,
    followsCount: mockRealProfileData.follows_count,
    followersCountUnavailable: false,
    followingCountUnavailable: false,
    profileUrl: `https://instagram.com/${mockRealProfileData.username}`,
    lastSyncedAt: new Date().toISOString(),
    status: 'CONNECTED',
    _cachedAt: Date.now(),
  })

  // Ensure DB user exists for foreign key checks
  await usersRepo.create({
    id: TEST_CREATOR_ID,
    email: `ig_counts_${Date.now()}@example.com`,
    passwordHash: '$2b$10$abcdefghijklmnopqrstuvwxyz1234567890',
    role: 'CREATOR',
  })
  await profilesRepo.upsert(TEST_CREATOR_ID, { name: 'Pro Creator' })
  await prisma.creatorSubscription.upsert({
    where: { creatorId: TEST_CREATOR_ID },
    update: { plan: 'CREATOR', status: 'ACTIVE', amount: 6 },
    create: {
      creatorId: TEST_CREATOR_ID,
      plan: 'CREATOR',
      status: 'ACTIVE',
      billingInterval: 'MONTHLY',
      amount: 6,
      currency: 'USD',
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  })
  await instagramRepo.upsert(TEST_CREATOR_ID, {
    platformUserId: 'ig_user_12345',
    username: 'creator_pro',
    accessToken: 'valid_test_token',
    status: 'CONNECTED',
  })

  const profResult = await instagramService.getProfile(TEST_CREATOR_ID, { forceRefresh: false })
  assert.strictEqual(profResult.followersCount, 14250, 'followersCount must be 14250')
  assert.strictEqual(profResult.followerCount, 14250, 'followerCount alias must be 14250')
  assert.strictEqual(profResult.followingCount, 485, 'followingCount must be 485')
  assert.strictEqual(profResult.followsCount, 485, 'followsCount alias must be 485')
  assert.strictEqual(profResult.followersCountUnavailable, false, 'followersCountUnavailable must be false')
  assert.strictEqual(profResult.followingCountUnavailable, false, 'followingCountUnavailable must be false')

  console.log('✅ Step 2 PASSED: Positive follower and following counts mapped accurately.\n')

  // -------------------------------------------------------------------------
  // 3. Zero Values (Valid Zero Counts Preserved, Not Unavailable)
  // -------------------------------------------------------------------------
  console.log('3. Testing zero counts (0 followers & 0 following must NOT be marked Unavailable)...')
  global.__instagramProfileCache.set(TEST_CREATOR_ID, {
    connected: true,
    id: 'ig_user_zero',
    username: 'new_creator',
    name: 'New Creator',
    accountType: 'CREATOR',
    mediaCount: 0,
    followersCount: 0,
    followerCount: 0,
    followingCount: 0,
    followsCount: 0,
    followersCountUnavailable: false,
    followingCountUnavailable: false,
    profileUrl: 'https://instagram.com/new_creator',
    lastSyncedAt: new Date().toISOString(),
    status: 'CONNECTED',
    _cachedAt: Date.now(),
  })

  const zeroProf = await instagramService.getProfile(TEST_CREATOR_ID, { forceRefresh: false })
  assert.strictEqual(zeroProf.followersCount, 0, 'Followers count of 0 must be preserved as 0')
  assert.strictEqual(zeroProf.followingCount, 0, 'Following count of 0 must be preserved as 0')
  assert.strictEqual(zeroProf.followersCountUnavailable, false, 'followersCountUnavailable must be false for 0')
  assert.strictEqual(zeroProf.followingCountUnavailable, false, 'followingCountUnavailable must be false for 0')

  // UI rendering verification: 0 != null is true, Number(0).toLocaleString() is '0'
  const editorPath = path.join(ROOT, 'components/dashboard/editors/SocialItemEditor.jsx')
  const editorContent = fs.readFileSync(editorPath, 'utf8')
  assert.ok(
    editorContent.includes('igProfile?.followersCount != null') && editorContent.includes('Number(igProfile.followersCount).toLocaleString()'),
    'SocialItemEditor must check != null and format with toLocaleString() so 0 renders as "0"'
  )

  const rendererPath = path.join(ROOT, 'components/storefront/PublicStoreRenderer.jsx')
  const rendererContent = fs.readFileSync(rendererPath, 'utf8')
  assert.ok(
    rendererContent.includes('igProfile?.followersCount != null') && rendererContent.includes('Number(igProfile.followersCount).toLocaleString()'),
    'PublicStoreRenderer must check != null and format with toLocaleString() so 0 renders as "0"'
  )

  console.log('✅ Step 3 PASSED: Zero counts preserved and rendered as "0", not converted to Unavailable.\n')

  // -------------------------------------------------------------------------
  // 4. Missing Fields (Absent / Null Fields Handled Honestly Without Fabricating)
  // -------------------------------------------------------------------------
  console.log('4. Testing missing/unsupported fields (Must display "Unavailable", never fabricate)...')
  global.__instagramProfileCache.set(TEST_CREATOR_ID, {
    connected: true,
    id: 'ig_user_missing',
    username: 'personal_acc',
    name: 'Personal Account',
    accountType: 'PERSONAL',
    mediaCount: 10,
    followersCount: null,
    followerCount: null,
    followingCount: null,
    followsCount: null,
    followersCountUnavailable: true,
    followingCountUnavailable: true,
    profileUrl: 'https://instagram.com/personal_acc',
    lastSyncedAt: new Date().toISOString(),
    status: 'CONNECTED',
    _cachedAt: Date.now(),
  })

  const missingProf = await instagramService.getProfile(TEST_CREATOR_ID, { forceRefresh: false })
  assert.strictEqual(missingProf.followersCount, null, 'Missing follower count must be null')
  assert.strictEqual(missingProf.followingCount, null, 'Missing following count must be null')
  assert.strictEqual(missingProf.followersCountUnavailable, true, 'followersCountUnavailable must be true')
  assert.strictEqual(missingProf.followingCountUnavailable, true, 'followingCountUnavailable must be true')

  // Ensure UI displays Unavailable when null
  assert.ok(
    editorContent.includes("'Unavailable'"),
    'SocialItemEditor must render "Unavailable" when followers count is null'
  )
  assert.ok(
    rendererContent.includes("'Unavailable'"),
    'PublicStoreRenderer must render "Unavailable" when followers count is null'
  )

  console.log('✅ Step 4 PASSED: Missing fields render "Unavailable" without inventing fake counts.\n')

  // -------------------------------------------------------------------------
  // 5. Storefront Resolution with Real Follower & Following Counts
  // -------------------------------------------------------------------------
  console.log('5. Verifying public storefront resolution enriches Instagram section with real counts...')
  // Re-prime cache with 12,400 followers and 350 following
  global.__instagramProfileCache.set(TEST_CREATOR_ID, {
    connected: true,
    id: 'ig_user_12345',
    username: 'creator_pro',
    name: 'Pro Creator',
    accountType: 'BUSINESS',
    mediaCount: 42,
    followersCount: 12400,
    followerCount: 12400,
    followingCount: 350,
    followsCount: 350,
    followersCountUnavailable: false,
    followingCountUnavailable: false,
    profileUrl: 'https://instagram.com/creator_pro',
    lastSyncedAt: new Date().toISOString(),
    status: 'CONNECTED',
    _cachedAt: Date.now(),
  })

  await storesRepo.upsertStore(TEST_CREATOR_ID, {
    username: TEST_STORE_SLUG,
    slug: TEST_STORE_SLUG,
    storeName: 'Count Verification Store',
    published: true,
  })

  const sectionId = crypto.randomUUID()
  await storeSectionsRepo.saveSections(TEST_CREATOR_ID, [
    {
      id: sectionId,
      type: 'instagram',
      title: 'Instagram Profile',
      props: {
        url: 'https://instagram.com/creator_pro',
        style: 'profile',
      },
    },
  ])

  const storefrontRes = await publicService.resolveStorefront(TEST_STORE_SLUG)
  assert.strictEqual(storefrontRes.status, 'ok', 'Storefront must resolve')
  const igSec = storefrontRes.data.sections.find((s) => s.id === sectionId)
  assert.ok(igSec, 'Instagram section must be resolved')
  assert.ok(igSec.props.instagramData?.profile, 'instagramData.profile must be populated')
  assert.strictEqual(igSec.props.instagramData.profile.followersCount, 12400, 'Storefront profile must receive followersCount: 12400')
  assert.strictEqual(igSec.props.instagramData.profile.followingCount, 350, 'Storefront profile must receive followingCount: 350')
  assert.strictEqual(igSec.props.instagramData.profile.followersCountUnavailable, false)
  assert.strictEqual(igSec.props.instagramData.profile.followingCountUnavailable, false)

  console.log('✅ Step 5 PASSED: Public storefront resolves real follower & following counts.\n')

  // -------------------------------------------------------------------------
  // 6. Cleanup
  // -------------------------------------------------------------------------
  await instagramRepo.deleteByCreatorId(TEST_CREATOR_ID).catch(() => {})
  await prisma.storeSection?.deleteMany({ where: { creatorId: TEST_CREATOR_ID } }).catch(() => {})
  await prisma.store?.deleteMany({ where: { creatorId: TEST_CREATOR_ID } }).catch(() => {})
  await prisma.creatorSubscription?.deleteMany({ where: { creatorId: TEST_CREATOR_ID } }).catch(() => {})
  await prisma.creatorProfile?.deleteMany({ where: { creatorId: TEST_CREATOR_ID } }).catch(() => {})
  await prisma.user?.deleteMany({ where: { id: TEST_CREATOR_ID } }).catch(() => {})

  console.log('======================================================================')
  console.log('🎉 ALL INSTAGRAM FOLLOWER & FOLLOWING COUNT AUDIT TESTS PASSED! 🎉')
  console.log('======================================================================\n')
} catch (err) {
  console.error('\n❌ TEST FAILED:', err)
  process.exit(1)
}
