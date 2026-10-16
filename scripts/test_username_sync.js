import { prisma } from '../lib/prisma.js'
import {
  authService,
  meService,
  storeService,
  productService,
  publicService,
  creatorSubscriptionService
} from '../lib/services.js'

async function runTests() {
  console.log('======================================================================')
  console.log('🧪 RUNNING COMPREHENSIVE USERNAME, STORE NAME & DISPLAY NAME TEST MATRIX')
  console.log('======================================================================\n')

  const ts = Date.now()
  const emailA = `creator_a_${ts}@test.com`
  const emailB = `creator_b_${ts}@test.com`
  const initialUsername = `mohitr_${ts.toString().slice(-4)}`
  const updatedUsername = `creator123_${ts.toString().slice(-4)}`
  const initialStoreName = 'Mohit Ranjan'
  const initialFullName = 'Mohit Ranjan'
  const updatedStoreName = 'CreatorStore by Mohit'
  const productSlug = `test-ebook-${ts.toString().slice(-4)}`

  let userA, userB

  try {
    // -------------------------------------------------------------
    // Setup Creator A & Creator B
    // -------------------------------------------------------------
    userA = await authService.signup({
      email: emailA,
      password: 'Password123!',
      role: 'CREATOR',
      name: initialFullName
    })
    await prisma.user.update({ where: { id: userA.user.id }, data: { emailVerified: true } })

    userB = await authService.signup({
      email: emailB,
      password: 'Password123!',
      role: 'CREATOR',
      name: 'Creator B'
    })
    await prisma.user.update({ where: { id: userB.user.id }, data: { emailVerified: true } })

    const creatorAId = userA.user.id
    const creatorBId = userB.user.id

    // Activate Pro trial for Creator A
    await creatorSubscriptionService.startTrial(creatorAId, { plan: 'PRO' })

    // Set initial username and initial store name for Creator A
    await storeService.setUsername(creatorAId, initialUsername)
    await storeService.update(creatorAId, {
      storeName: initialStoreName,
    })
    await storeService.publish(creatorAId)

    // Create a product for Creator A
    await productService.create(creatorAId, {
      title: 'Awesome Test Ebook',
      slug: productSlug,
      price: 499,
      type: 'DIGITAL_DOWNLOAD',
      status: 'PUBLISHED',
      storePublished: true,
    })

    // -------------------------------------------------------------
    // TEST 1: Initial Combination Verification
    // Store Name: Mohit Ranjan
    // Creator Full Name: Mohit Ranjan
    // Username: mohitr
    // Expected:
    // Dashboard: @mohitr
    // Store URL: creatorstore.store/mohitr
    // Preview name: Mohit Ranjan
    // Preview URL: creatorstore.store/mohitr
    // -------------------------------------------------------------
    console.log('▶ TEST 1: Initial Identity Setup & Matrix Verification');
    const meA1 = await meService.getMe(creatorAId)
    const storeA1 = await storeService.getOrCreate(creatorAId)
    const storeSlug1 = storeA1.slug || storeA1.username
    const handle1 = `@${storeSlug1}`
    const storeUrl1 = `creatorstore.store/${storeSlug1}`
    const previewUrl1 = `creatorstore.store/${storeSlug1}`
    const previewName1 = storeA1.storeName || meA1.profile.name

    if (handle1 !== `@${initialUsername}`) throw new Error(`TEST 1 FAILED: handle is '${handle1}', expected '@${initialUsername}'`)
    if (storeUrl1 !== `creatorstore.store/${initialUsername}`) throw new Error(`TEST 1 FAILED: storeUrl is '${storeUrl1}'`)
    if (previewUrl1 !== `creatorstore.store/${initialUsername}`) throw new Error(`TEST 1 FAILED: previewUrl is '${previewUrl1}'`)
    if (previewName1 !== initialStoreName) throw new Error(`TEST 1 FAILED: previewName is '${previewName1}', expected '${initialStoreName}'`)
    if (meA1.profile.name !== initialFullName) throw new Error(`TEST 1 FAILED: profile.name is '${meA1.profile.name}'`)

    console.log(`   ✅ Setup verified: handle=${handle1}, url=${storeUrl1}, preview=${previewName1}\n`)

    // -------------------------------------------------------------
    // TEST 2: Change ONLY Store Name
    // Store Name: CreatorStore by Mohit
    // Expected:
    // Dashboard: @mohitr (unchanged)
    // Store URL: creatorstore.store/mohitr (unchanged)
    // Preview: CreatorStore by Mohit (updated)
    // -------------------------------------------------------------
    console.log('▶ TEST 2: Change ONLY Store Name (to "CreatorStore by Mohit")');
    await storeService.update(creatorAId, { storeName: updatedStoreName })
    const storeA2 = await storeService.getOrCreate(creatorAId)
    const meA2 = await meService.getMe(creatorAId)

    const storeSlug2 = storeA2.slug || storeA2.username
    const handle2 = `@${storeSlug2}`
    const storeUrl2 = `creatorstore.store/${storeSlug2}`
    const previewName2 = storeA2.storeName || meA2.profile.name

    if (handle2 !== `@${initialUsername}`) throw new Error(`TEST 2 FAILED: handle changed unexpectedly to '${handle2}'`)
    if (storeUrl2 !== `creatorstore.store/${initialUsername}`) throw new Error(`TEST 2 FAILED: storeUrl changed unexpectedly to '${storeUrl2}'`)
    if (previewName2 !== updatedStoreName) throw new Error(`TEST 2 FAILED: previewName is '${previewName2}', expected '${updatedStoreName}'`)

    console.log(`   ✅ Store Name updated independently: handle=${handle2}, url=${storeUrl2}, preview=${previewName2}\n`)

    // -------------------------------------------------------------
    // TEST 3: Change ONLY Username
    // Username: creator123
    // Expected:
    // Dashboard: @creator123
    // Store URL: creatorstore.store/creator123
    // Preview: CreatorStore by Mohit (unchanged)
    // -------------------------------------------------------------
    console.log('▶ TEST 3: Change ONLY Username (to "creator123")');
    await storeService.update(creatorAId, { username: updatedUsername })
    const storeA3 = await storeService.getOrCreate(creatorAId)
    const meA3 = await meService.getMe(creatorAId)

    const storeSlug3 = storeA3.slug || storeA3.username
    const handle3 = `@${storeSlug3}`
    const storeUrl3 = `creatorstore.store/${storeSlug3}`
    const previewName3 = storeA3.storeName || meA3.profile.name

    if (handle3 !== `@${updatedUsername}`) throw new Error(`TEST 3 FAILED: handle is '${handle3}', expected '@${updatedUsername}'`)
    if (storeUrl3 !== `creatorstore.store/${updatedUsername}`) throw new Error(`TEST 3 FAILED: storeUrl is '${storeUrl3}', expected 'creatorstore.store/${updatedUsername}'`)
    if (previewName3 !== updatedStoreName) throw new Error(`TEST 3 FAILED: previewName changed unexpectedly to '${previewName3}'`)

    console.log(`   ✅ Username updated independently: handle=${handle3}, url=${storeUrl3}, preview=${previewName3}\n`)

    // -------------------------------------------------------------
    // TEST 4: Change ONLY Creator Full Name
    // Creator Full Name: Mohit Ranjan
    // Expected:
    // Store Name: CreatorStore by Mohit (unchanged)
    // Username: creator123 (unchanged)
    // URL: creatorstore.store/creator123 (unchanged)
    // Preview: CreatorStore by Mohit (unchanged)
    // -------------------------------------------------------------
    console.log('▶ TEST 4: Change ONLY Creator Full Name (to "Mohit Ranjan")');
    await meService.updateProfile(creatorAId, { name: initialFullName })
    const storeA4 = await storeService.getOrCreate(creatorAId)
    const meA4 = await meService.getMe(creatorAId)

    const storeSlug4 = storeA4.slug || storeA4.username
    const handle4 = `@${storeSlug4}`
    const storeUrl4 = `creatorstore.store/${storeSlug4}`
    const previewName4 = storeA4.storeName || meA4.profile.name

    if (handle4 !== `@${updatedUsername}`) throw new Error(`TEST 4 FAILED: handle changed unexpectedly to '${handle4}'`)
    if (storeUrl4 !== `creatorstore.store/${updatedUsername}`) throw new Error(`TEST 4 FAILED: storeUrl changed unexpectedly to '${storeUrl4}'`)
    if (storeA4.storeName !== updatedStoreName) throw new Error(`TEST 4 FAILED: storeName changed unexpectedly to '${storeA4.storeName}'`)
    if (meA4.profile.name !== initialFullName) throw new Error(`TEST 4 FAILED: profile.name is '${meA4.profile.name}', expected '${initialFullName}'`)
    if (previewName4 !== updatedStoreName) throw new Error(`TEST 4 FAILED: previewName is '${previewName4}', expected '${updatedStoreName}'`)

    console.log(`   ✅ Full Name updated independently: profile.name=${meA4.profile.name}, storeName=${storeA4.storeName}, url=${storeUrl4}\n`)

    // -------------------------------------------------------------
    // TEST 5: Public Storefront & Canonical Product Routing
    // -------------------------------------------------------------
    console.log('▶ TEST 5: Public storefront and Canonical product routing');
    const storefrontNew = await publicService.resolveStorefront(updatedUsername)
    if (storefrontNew.status !== 'ok' || storefrontNew.slug !== updatedUsername) {
      throw new Error(`TEST 5 FAILED: Could not resolve storefront for '${updatedUsername}'`)
    }
    const prodData = await publicService.getProduct(updatedUsername, productSlug)
    if (!prodData || !prodData.product || prodData.creator?.username !== updatedUsername) {
      throw new Error(`TEST 5 FAILED: Canonical product route failed for /${updatedUsername}/${productSlug}`)
    }
    console.log(`   ✅ Public storefront /${updatedUsername} and product /${updatedUsername}/${productSlug} resolved correctly\n`)

    // -------------------------------------------------------------
    // TEST 6: Inactive old username verification
    // -------------------------------------------------------------
    console.log('▶ TEST 6: Verify old username is inactive');
    const storefrontOld = await publicService.resolveStorefront(initialUsername)
    if (storefrontOld.status === 'ok') {
      throw new Error(`TEST 6 FAILED: Old username '${initialUsername}' still active!`)
    }
    console.log(`   ✅ Old username /${initialUsername} is correctly inactive\n`)

    // -------------------------------------------------------------
    // TEST 7: Username uniqueness & IDOR protection
    // -------------------------------------------------------------
    console.log('▶ TEST 7: Username uniqueness & IDOR protection');
    let dupeRejected = false
    try {
      await storeService.setUsername(creatorBId, updatedUsername)
    } catch (err) {
      dupeRejected = true
      console.log(`   ✅ Duplicate username rejected with error: ${err.message}`)
    }
    if (!dupeRejected) throw new Error('TEST 7 FAILED: Duplicate username allowed!')

    // IDOR protection check
    const storeBBefore = await storeService.getOrCreate(creatorBId)
    await storeService.update(creatorAId, { bio: 'Bio check' })
    const storeBAfter = await storeService.getOrCreate(creatorBId)
    if (storeBAfter.username !== storeBBefore.username) {
      throw new Error('TEST 7 FAILED: Creator B state mutated unexpectedly')
    }
    console.log('   ✅ Creator isolation & IDOR protection confirmed\n')

    // -------------------------------------------------------------
    // TEST 8: Direct Database Verification (Hard refresh / DB state)
    // -------------------------------------------------------------
    console.log('▶ TEST 8: Direct DB Verification');
    const freshDbStore = await prisma.store.findUnique({ where: { creatorId: creatorAId } })
    const freshDbProfile = await prisma.creatorProfile.findUnique({ where: { creatorId: creatorAId } })
    if (freshDbStore.username !== updatedUsername) throw new Error(`TEST 8 FAILED: DB store.username='${freshDbStore.username}'`)
    if (freshDbStore.storeName !== updatedStoreName) throw new Error(`TEST 8 FAILED: DB store.storeName='${freshDbStore.storeName}'`)
    if (freshDbProfile.name !== initialFullName) throw new Error(`TEST 8 FAILED: DB profile.name='${freshDbProfile.name}'`)

    console.log(`   ✅ Direct DB persistence confirmed: username=${freshDbStore.username}, storeName=${freshDbStore.storeName}, profile.name=${freshDbProfile.name}\n`)

    console.log('======================================================================')
    console.log('🎉 ALL MATRIX TESTS PASSED SUCCESSFULLY!')
    console.log('======================================================================')
  } finally {
    // Cleanup test users
    if (userA?.user?.id) {
      await prisma.product.deleteMany({ where: { creatorId: userA.user.id } }).catch(() => {})
      await prisma.store.deleteMany({ where: { creatorId: userA.user.id } }).catch(() => {})
      await prisma.creatorProfile.deleteMany({ where: { creatorId: userA.user.id } }).catch(() => {})
      await prisma.creatorSubscription.deleteMany({ where: { creatorId: userA.user.id } }).catch(() => {})
      await prisma.user.deleteMany({ where: { id: userA.user.id } }).catch(() => {})
    }
    if (userB?.user?.id) {
      await prisma.store.deleteMany({ where: { creatorId: userB.user.id } }).catch(() => {})
      await prisma.creatorProfile.deleteMany({ where: { creatorId: userB.user.id } }).catch(() => {})
      await prisma.creatorSubscription.deleteMany({ where: { creatorId: userB.user.id } }).catch(() => {})
      await prisma.user.deleteMany({ where: { id: userB.user.id } }).catch(() => {})
    }
  }
}

runTests().catch((err) => {
  console.error('❌ Test suite failed:', err)
  process.exit(1)
})
