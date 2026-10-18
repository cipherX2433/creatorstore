import { prisma } from '../lib/prisma.js'
import { hashToken } from '../lib/auth.js'
import { storeService, authService } from '../lib/services.js'
import { storesRepo } from '../lib/repos.js'

const BASE_URL = 'http://localhost:3000/api'

async function runTests() {
  console.log('=================================================================')
  console.log('CREATORSTORE USERNAME AVAILABILITY & ONBOARDING OWNERSHIP TESTS')
  console.log('=================================================================')

  const timestamp = Date.now()
  const user1Email = `user1_${timestamp}@example.com`
  const user1Username = `creator1_${timestamp}`
  const user2Email = `user2_${timestamp}@example.com`
  const user2Username = `creator2_${timestamp}`
  const password = 'Password123!'

  let sessionCookieUser1 = ''
  let sessionCookieUser2 = ''
  let user1Id = ''
  let user2Id = ''

  try {
    // -------------------------------------------------------------------------
    // TEST 1: Unauthenticated check for unclaimed username (Signup flow)
    // -------------------------------------------------------------------------
    console.log('\n[TEST 1] Unauthenticated check for unclaimed username')
    const unauthCheckRes = await fetch(`${BASE_URL}/store/username/check?u=${user1Username}`)
    const unauthCheckData = await unauthCheckRes.json()
    if (!unauthCheckRes.ok || !unauthCheckData.available || unauthCheckData.isCurrent) {
      throw new Error(`Unauthenticated check failed: ${JSON.stringify(unauthCheckData)}`)
    }
    console.log('✓ Unauthenticated check returns available: true, isCurrent: false')

    // -------------------------------------------------------------------------
    // TEST 2: Signup for User 1 with chosen username
    // -------------------------------------------------------------------------
    console.log(`\n[TEST 2] Signup User 1 with username: ${user1Username}`)
    const signup1Res = await fetch(`${BASE_URL}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: user1Email,
        password,
        name: 'User One',
        username: user1Username,
        slug: user1Username,
        storeName: 'User One Store',
        role: 'CREATOR',
        accountType: 'CREATOR',
      }),
    })
    if (!signup1Res.ok) throw new Error(`User 1 signup failed: ${await signup1Res.text()}`)

    const user1Db = await prisma.user.findUnique({ where: { email: user1Email } })
    user1Id = user1Db.id
    const store1Db = await prisma.store.findUnique({ where: { creatorId: user1Id } })
    if (!store1Db || store1Db.username.toLowerCase() !== user1Username.toLowerCase()) {
      throw new Error(`User 1 store not created with username: ${JSON.stringify(store1Db)}`)
    }
    console.log(`✓ User 1 created with store username='${store1Db.username}' and creatorId='${user1Id}'`)

    // Verify OTP for User 1
    let otp1 = ''
    for (let i = 100000; i <= 999999; i++) {
      if (hashToken(String(i)) === user1Db.verificationTokenHash) {
        otp1 = String(i)
        break
      }
    }
    const verify1Res = await fetch(`${BASE_URL}/auth/verify-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: user1Email, otp: otp1 }),
    })
    if (!verify1Res.ok) throw new Error(`Verify 1 failed: ${await verify1Res.text()}`)
    const rawCookie1 = verify1Res.headers.get('set-cookie') || ''
    const cookie1Match = rawCookie1.match(/creatorzero_session=([^;]+)/)
    if (cookie1Match) sessionCookieUser1 = `creatorzero_session=${cookie1Match[1]}`

    // -------------------------------------------------------------------------
    // TEST 3: Signup for User 2 with different username
    // -------------------------------------------------------------------------
    console.log(`\n[TEST 3] Signup User 2 with username: ${user2Username}`)
    const signup2Res = await fetch(`${BASE_URL}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: user2Email,
        password,
        name: 'User Two',
        username: user2Username,
        slug: user2Username,
        storeName: 'User Two Store',
        role: 'CREATOR',
        accountType: 'CREATOR',
      }),
    })
    if (!signup2Res.ok) throw new Error(`User 2 signup failed: ${await signup2Res.text()}`)

    const user2Db = await prisma.user.findUnique({ where: { email: user2Email } })
    user2Id = user2Db.id

    let otp2 = ''
    for (let i = 100000; i <= 999999; i++) {
      if (hashToken(String(i)) === user2Db.verificationTokenHash) {
        otp2 = String(i)
        break
      }
    }
    const verify2Res = await fetch(`${BASE_URL}/auth/verify-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: user2Email, otp: otp2 }),
    })
    if (!verify2Res.ok) throw new Error(`Verify 2 failed: ${await verify2Res.text()}`)
    const rawCookie2 = verify2Res.headers.get('set-cookie') || ''
    const cookie2Match = rawCookie2.match(/creatorzero_session=([^;]+)/)
    if (cookie2Match) sessionCookieUser2 = `creatorzero_session=${cookie2Match[1]}`

    // -------------------------------------------------------------------------
    // TEST 4: CASE A - Authenticated User 1 checks their OWN username during onboarding
    // -------------------------------------------------------------------------
    console.log('\n[TEST 4] CASE A: User 1 checks their own username during onboarding')
    const caseARes = await fetch(`${BASE_URL}/store/username/check?u=${user1Username}`, {
      headers: { Cookie: sessionCookieUser1 },
    })
    const caseAData = await caseARes.json()
    if (!caseARes.ok || !caseAData.available || !caseAData.isCurrent) {
      throw new Error(`Case A failed: Expected available=true and isCurrent=true, got ${JSON.stringify(caseAData)}`)
    }
    console.log(`✓ Case A passed: ${JSON.stringify(caseAData)} (Available for owner, marked isCurrent=true)`)

    // -------------------------------------------------------------------------
    // TEST 5: CASE B - User 1 checks User 2's username (belogns to another user)
    // -------------------------------------------------------------------------
    console.log('\n[TEST 5] CASE B: User 1 checks User 2\'s username (taken by another user)')
    const caseBRes = await fetch(`${BASE_URL}/store/username/check?u=${user2Username}`, {
      headers: { Cookie: sessionCookieUser1 },
    })
    const caseBData = await caseBRes.json()
    if (caseBData.available !== false || caseBData.isCurrent !== false) {
      throw new Error(`Case B failed: Expected available=false and isCurrent=false, got ${JSON.stringify(caseBData)}`)
    }
    console.log(`✓ Case B passed: ${JSON.stringify(caseBData)} (Marked taken, cannot be claimed by User 1)`)

    // -------------------------------------------------------------------------
    // TEST 6: CASE C - User 1 checks an unclaimed username
    // -------------------------------------------------------------------------
    const unclaimedUsername = `brand_new_${timestamp}`
    console.log(`\n[TEST 6] CASE C: User 1 checks an unclaimed username (${unclaimedUsername})`)
    const caseCRes = await fetch(`${BASE_URL}/store/username/check?u=${unclaimedUsername}`, {
      headers: { Cookie: sessionCookieUser1 },
    })
    const caseCData = await caseCRes.json()
    if (!caseCRes.ok || !caseCData.available || caseCData.isCurrent) {
      throw new Error(`Case C failed: Expected available=true and isCurrent=false, got ${JSON.stringify(caseCData)}`)
    }
    console.log(`✓ Case C passed: ${JSON.stringify(caseCData)} (Available, not isCurrent)`)

    // -------------------------------------------------------------------------
    // TEST 7: Case Normalization & Insensitivity
    // -------------------------------------------------------------------------
    console.log('\n[TEST 7] Case normalization (User 1 checks uppercase of their own username)')
    const caseUpperRes = await fetch(`${BASE_URL}/store/username/check?u=${user1Username.toUpperCase()}`, {
      headers: { Cookie: sessionCookieUser1 },
    })
    const caseUpperData = await caseUpperRes.json()
    if (!caseUpperData.available || !caseUpperData.isCurrent) {
      throw new Error(`Case-insensitive check failed: ${JSON.stringify(caseUpperData)}`)
    }
    console.log('✓ Uppercase version normalized and identified as current username.')

    // -------------------------------------------------------------------------
    // TEST 8: Reserved Slugs rejection
    // -------------------------------------------------------------------------
    console.log('\n[TEST 8] Reserved slug check (admin, api, etc.)')
    const reservedRes = await fetch(`${BASE_URL}/store/username/check?u=admin`, {
      headers: { Cookie: sessionCookieUser1 },
    })
    const reservedData = await reservedRes.json()
    if (reservedData.available !== false) {
      throw new Error(`Reserved slug should not be available: ${JSON.stringify(reservedData)}`)
    }
    console.log('✓ Reserved username properly rejected.')

    // -------------------------------------------------------------------------
    // TEST 9: Onboarding Final Save - Retaining existing username (Case A)
    // -------------------------------------------------------------------------
    console.log('\n[TEST 9] User 1 completes onboarding retaining existing username')
    const setSameUsernameRes = await fetch(`${BASE_URL}/store/username`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: sessionCookieUser1 },
      body: JSON.stringify({ username: user1Username }),
    })
    if (!setSameUsernameRes.ok) {
      throw new Error(`Setting own username failed: ${await setSameUsernameRes.text()}`)
    }
    console.log('✓ Setting own username succeeded with 200 OK (no conflict).')

    // -------------------------------------------------------------------------
    // TEST 10: Onboarding Final Save - Changing to another user's username fails (Case B)
    // -------------------------------------------------------------------------
    console.log('\n[TEST 10] User 1 tries to claim User 2\'s username (should fail with 409)')
    const setTakenUsernameRes = await fetch(`${BASE_URL}/store/username`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: sessionCookieUser1 },
      body: JSON.stringify({ username: user2Username }),
    })
    if (setTakenUsernameRes.status !== 409) {
      throw new Error(`Expected 409 conflict when claiming taken username, got ${setTakenUsernameRes.status}`)
    }
    console.log('✓ Claiming taken username correctly returned 409 Conflict.')

    // -------------------------------------------------------------------------
    // TEST 11: Onboarding Final Save - Changing to an unclaimed username (Case C)
    // -------------------------------------------------------------------------
    console.log(`\n[TEST 11] User 1 changes username to: ${unclaimedUsername}`)
    const setNewUsernameRes = await fetch(`${BASE_URL}/store/username`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: sessionCookieUser1 },
      body: JSON.stringify({ username: unclaimedUsername }),
    })
    if (!setNewUsernameRes.ok) {
      throw new Error(`Setting new username failed: ${await setNewUsernameRes.text()}`)
    }
    const updatedStore = await prisma.store.findUnique({ where: { creatorId: user1Id } })
    if (updatedStore.username !== unclaimedUsername) {
      throw new Error(`Expected store username to update to ${unclaimedUsername}, got ${updatedStore.username}`)
    }
    console.log(`✓ Username safely changed to ${unclaimedUsername}.`)

    // -------------------------------------------------------------------------
    // TEST 12: Previous username is released and can now be claimed by User 2
    // -------------------------------------------------------------------------
    console.log(`\n[TEST 12] User 2 checks former username of User 1 (${user1Username})`)
    const checkReleasedRes = await fetch(`${BASE_URL}/store/username/check?u=${user1Username}`, {
      headers: { Cookie: sessionCookieUser2 },
    })
    const checkReleasedData = await checkReleasedRes.json()
    if (!checkReleasedData.available) {
      throw new Error(`Expected released username to be available: ${JSON.stringify(checkReleasedData)}`)
    }
    console.log(`✓ Old username '${user1Username}' is now available for other users to claim.`)

    // -------------------------------------------------------------------------
    // TEST 13: Direct service unit verification
    // -------------------------------------------------------------------------
    console.log('\n[TEST 13] Direct service unit verification for storeService.checkUsername')
    const unitCaseA = await storeService.checkUsername(user1Id, unclaimedUsername)
    if (!unitCaseA.available || !unitCaseA.isCurrent) {
      throw new Error(`Service unit Case A failed: ${JSON.stringify(unitCaseA)}`)
    }
    const unitCaseB = await storeService.checkUsername(user2Id, unclaimedUsername)
    if (unitCaseB.available !== false || unitCaseB.isCurrent !== false) {
      throw new Error(`Service unit Case B failed: ${JSON.stringify(unitCaseB)}`)
    }
    const unitCaseC = await storeService.checkUsername(user1Id, `totally_fresh_${timestamp}`)
    if (!unitCaseC.available || unitCaseC.isCurrent !== false) {
      throw new Error(`Service unit Case C failed: ${JSON.stringify(unitCaseC)}`)
    }
    console.log('✓ storeService.checkUsername direct unit tests passed.')

    console.log('\n=================================================================')
    console.log('ALL USERNAME AVAILABILITY & ONBOARDING OWNERSHIP TESTS PASSED! ✓')
    console.log('=================================================================')
  } finally {
    // Cleanup created test users
    if (user1Id) {
      await prisma.user.delete({ where: { id: user1Id } }).catch(() => null)
    }
    if (user2Id) {
      await prisma.user.delete({ where: { id: user2Id } }).catch(() => null)
    }
  }
}

runTests().catch((err) => {
  console.error('\n❌ Test suite failed:', err)
  process.exit(1)
})
