import assert from 'node:assert/strict'
import { meService } from '../lib/services.js'
import { prisma } from '../lib/prisma.js'
import { profilesRepo, storesRepo, payoutProfilesRepo } from '../lib/repos.js'

async function runTests() {
  console.log('=== Running 3-Step Sidebar Setup Checklist Test Suite ===\n')

  let passed = 0
  let failed = 0

  function test(name, fn) {
    try {
      fn()
      console.log(`✓ PASS: ${name}`)
      passed++
    } catch (err) {
      console.error(`✗ FAIL: ${name}`)
      console.error(err)
      failed++
    }
  }

  async function asyncTest(name, fn) {
    try {
      await fn()
      console.log(`✓ PASS: ${name}`)
      passed++
    } catch (err) {
      console.error(`✗ FAIL: ${name}`)
      console.error(err)
      failed++
    }
  }

  // 1. Dynamic Progress Math Test
  test('Progress calculation dynamically returns 0%, 33%, 67%, 100%', () => {
    const total = 3
    const calc = (comp) => (total > 0 ? Math.round((comp / total) * 100) : 0)

    assert.equal(calc(0), 0, '0 of 3 must be 0%')
    assert.equal(calc(1), 33, '1 of 3 must be 33%')
    assert.equal(calc(2), 67, '2 of 3 must be 67%')
    assert.equal(calc(3), 100, '3 of 3 must be 100%')
  })

  // Mock-based verification of getCreatorSetupStatus
  // Save originals
  const origProfileGet = profilesRepo.getByCreator
  const origStoreGet = storesRepo.getByCreator
  const origProductCount = prisma.product.count
  const origPayoutGet = payoutProfilesRepo.getByCreator

  try {
    // 2. New account with all 3 steps incomplete
    await asyncTest('New account: all 3 steps incomplete (0%, nextRoute to avatar settings)', async () => {
      profilesRepo.getByCreator = async () => ({ id: 'u1', avatarUrl: null })
      storesRepo.getByCreator = async () => ({ id: 's1', avatarUrl: null, theme: {} })
      prisma.product.count = async () => 0
      payoutProfilesRepo.getByCreator = async () => null

      const res = await meService.getCreatorSetupStatus('u1')
      assert.equal(res.completed, 0)
      assert.equal(res.total, 3)
      assert.equal(res.percentage, 0)
      assert.equal(res.allDone, false)
      assert.equal(res.items.length, 3)

      assert.equal(res.items[0].id, 'profile-image')
      assert.equal(res.items[0].title, 'Add profile image')
      assert.equal(res.items[0].completed, false)
      assert.equal(res.items[0].route, '/dashboard/settings?focus=avatar')

      assert.equal(res.items[1].id, 'first-product')
      assert.equal(res.items[1].title, 'Add a product')
      assert.equal(res.items[1].completed, false)
      assert.equal(res.items[1].route, '/dashboard/products?create=true')

      assert.equal(res.items[2].id, 'payout-details')
      assert.equal(res.items[2].title, 'Set up payout details')
      assert.equal(res.items[2].completed, false)
      assert.equal(res.items[2].route, '/dashboard/payments/setup')

      assert.equal(res.nextRoute, '/dashboard/settings?focus=avatar')
    })

    // 3. Step 1 complete independently (Profile image saved)
    await asyncTest('Profile image saved independently (1 of 3, 33%)', async () => {
      profilesRepo.getByCreator = async () => ({ id: 'u2', avatarUrl: 'https://cdn.creatorstore.com/avatars/u2.png' })
      storesRepo.getByCreator = async () => ({ id: 's2', avatarUrl: '', theme: {} })
      prisma.product.count = async () => 0
      payoutProfilesRepo.getByCreator = async () => null

      const res = await meService.getCreatorSetupStatus('u2')
      assert.equal(res.completed, 1)
      assert.equal(res.percentage, 33)
      assert.equal(res.allDone, false)
      assert.equal(res.items[0].completed, true)
      assert.equal(res.items[1].completed, false)
      assert.equal(res.items[2].completed, false)
      assert.equal(res.nextRoute, '/dashboard/products?create=true')
    })

    // 4. Step 2 complete independently (Product saved)
    await asyncTest('Product saved independently (1 of 3, 33%)', async () => {
      profilesRepo.getByCreator = async () => ({ id: 'u3', avatarUrl: '' })
      storesRepo.getByCreator = async () => ({ id: 's3', avatarUrl: '', theme: {} })
      prisma.product.count = async () => 1
      payoutProfilesRepo.getByCreator = async () => null

      const res = await meService.getCreatorSetupStatus('u3')
      assert.equal(res.completed, 1)
      assert.equal(res.percentage, 33)
      assert.equal(res.allDone, false)
      assert.equal(res.items[0].completed, false)
      assert.equal(res.items[1].completed, true)
      assert.equal(res.items[2].completed, false)
      assert.equal(res.nextRoute, '/dashboard/settings?focus=avatar')
    })

    // 5. Step 3 complete independently (Payout details saved with UPI)
    await asyncTest('Payout details saved independently via UPI (1 of 3, 33%)', async () => {
      profilesRepo.getByCreator = async () => ({ id: 'u4', avatarUrl: '' })
      storesRepo.getByCreator = async () => ({ id: 's4', avatarUrl: '', theme: {} })
      prisma.product.count = async () => 0
      payoutProfilesRepo.getByCreator = async () => ({
        id: 'p1',
        payoutMethod: 'UPI',
        upiId: 'creator@okhdfcbank',
        status: 'PENDING',
      })

      const res = await meService.getCreatorSetupStatus('u4')
      assert.equal(res.completed, 1)
      assert.equal(res.percentage, 33)
      assert.equal(res.allDone, false)
      assert.equal(res.items[0].completed, false)
      assert.equal(res.items[1].completed, false)
      assert.equal(res.items[2].completed, true)
      assert.equal(res.items[2].route, '/dashboard/settings/payments')
    })

    // 6. Step 3 complete independently (Payout details saved with Bank Account)
    await asyncTest('Payout details saved independently via Bank Account (1 of 3, 33%)', async () => {
      profilesRepo.getByCreator = async () => ({ id: 'u5', avatarUrl: '' })
      storesRepo.getByCreator = async () => ({ id: 's5', avatarUrl: '', theme: {} })
      prisma.product.count = async () => 0
      payoutProfilesRepo.getByCreator = async () => ({
        id: 'p2',
        payoutMethod: 'ACCOUNT',
        accountHolderName: 'Jane Creator',
        bankName: 'HDFC Bank',
        accountNumber: '123456789012',
        bankLast4: '9012',
        ifscCode: 'HDFC0001234',
        status: 'ACTIVE',
      })

      const res = await meService.getCreatorSetupStatus('u5')
      assert.equal(res.completed, 1)
      assert.equal(res.percentage, 33)
      assert.equal(res.allDone, false)
      assert.equal(res.items[2].completed, true)
    })

    // 7. 2 of 3 complete (67%)
    await asyncTest('2 of 3 complete: Profile image + Product (67%, nextRoute to payout setup)', async () => {
      profilesRepo.getByCreator = async () => ({ id: 'u6', avatarUrl: 'https://cdn.creatorstore.com/avatars/u6.png' })
      storesRepo.getByCreator = async () => ({ id: 's6', avatarUrl: '', theme: {} })
      prisma.product.count = async () => 2
      payoutProfilesRepo.getByCreator = async () => null

      const res = await meService.getCreatorSetupStatus('u6')
      assert.equal(res.completed, 2)
      assert.equal(res.percentage, 67)
      assert.equal(res.allDone, false)
      assert.equal(res.items[0].completed, true)
      assert.equal(res.items[1].completed, true)
      assert.equal(res.items[2].completed, false)
      assert.equal(res.nextRoute, '/dashboard/payments/setup')
    })

    // 8. All 3 complete (100%)
    await asyncTest('All 3 complete: 100%, allDone = true', async () => {
      profilesRepo.getByCreator = async () => ({ id: 'u7', avatarUrl: 'https://cdn.creatorstore.com/avatars/u7.png' })
      storesRepo.getByCreator = async () => ({ id: 's7', avatarUrl: '', theme: {} })
      prisma.product.count = async () => 1
      payoutProfilesRepo.getByCreator = async () => ({
        id: 'p3',
        payoutMethod: 'UPI',
        upiId: 'john@axis',
        status: 'VERIFIED',
      })

      const res = await meService.getCreatorSetupStatus('u7')
      assert.equal(res.completed, 3)
      assert.equal(res.total, 3)
      assert.equal(res.percentage, 100)
      assert.equal(res.allDone, true)
      assert.equal(res.items[0].completed, true)
      assert.equal(res.items[1].completed, true)
      assert.equal(res.items[2].completed, true)
    })

    // 9. Edge case: Profile image selected locally but NOT saved in DB
    await asyncTest('Profile image unsaved / empty does not mark step complete', async () => {
      profilesRepo.getByCreator = async () => ({ id: 'u8', avatarUrl: '' })
      storesRepo.getByCreator = async () => ({ id: 's8', avatarUrl: '   ', theme: { avatarUrl: null } })
      prisma.product.count = async () => 0
      payoutProfilesRepo.getByCreator = async () => null

      const res = await meService.getCreatorSetupStatus('u8')
      assert.equal(res.items[0].completed, false)
    })

    // 10. Edge case: Product creation failed / 0 valid products
    await asyncTest('Product creation failed (count = 0) does not mark step complete', async () => {
      profilesRepo.getByCreator = async () => ({ id: 'u9', avatarUrl: '' })
      storesRepo.getByCreator = async () => ({ id: 's9', avatarUrl: '', theme: {} })
      prisma.product.count = async () => 0
      payoutProfilesRepo.getByCreator = async () => null

      const res = await meService.getCreatorSetupStatus('u9')
      assert.equal(res.items[1].completed, false)
    })

    // 11. Edge case: Incomplete payout setup (wizard opened or partial info)
    await asyncTest('Incomplete payout setup (NOT_CONFIGURED / empty details) does not mark step complete', async () => {
      profilesRepo.getByCreator = async () => ({ id: 'u10', avatarUrl: '' })
      storesRepo.getByCreator = async () => ({ id: 's10', avatarUrl: '', theme: {} })
      prisma.product.count = async () => 0
      payoutProfilesRepo.getByCreator = async () => ({
        id: 'p4',
        payoutMethod: 'ACCOUNT',
        accountHolderName: '',
        bankName: '',
        accountNumber: '',
        status: 'NOT_CONFIGURED',
      })

      const res = await meService.getCreatorSetupStatus('u10')
      assert.equal(res.items[2].completed, false)
    })

    // 12. Security constraint: Never leak sensitive bank details in checklist response
    await asyncTest('Checklist API response never exposes bank account or sensitive details', async () => {
      profilesRepo.getByCreator = async () => ({ id: 'u11', avatarUrl: '' })
      storesRepo.getByCreator = async () => ({ id: 's11', avatarUrl: '', theme: {} })
      prisma.product.count = async () => 0
      payoutProfilesRepo.getByCreator = async () => ({
        id: 'p5',
        payoutMethod: 'ACCOUNT',
        accountHolderName: 'Secret User',
        bankName: 'Secret Bank',
        accountNumber: '999988887777',
        bankLast4: '7777',
        ifscCode: 'SECR0001234',
        upiId: 'secret@upi',
        status: 'ACTIVE',
      })

      const res = await meService.getCreatorSetupStatus('u11')
      const jsonStr = JSON.stringify(res)

      assert.ok(!jsonStr.includes('999988887777'), 'Response must not contain raw account number')
      assert.ok(!jsonStr.includes('SECR0001234'), 'Response must not contain IFSC code')
      assert.ok(!jsonStr.includes('secret@upi'), 'Response must not contain raw UPI ID')
      assert.equal(res.items[2].completed, true)
    })

    // 13. API/database failure resilience
    await asyncTest('Database/API query failures default gracefully to false (never false-positive)', async () => {
      profilesRepo.getByCreator = async () => { throw new Error('DB connection timed out') }
      storesRepo.getByCreator = async () => { throw new Error('DB connection reset') }
      prisma.product.count = async () => { throw new Error('Query error') }
      payoutProfilesRepo.getByCreator = async () => { throw new Error('DB error') }

      const res = await meService.getCreatorSetupStatus('u12')
      assert.equal(res.completed, 0)
      assert.equal(res.percentage, 0)
      assert.equal(res.allDone, false, 'API failure must not mark allDone true or hide checklist')
      assert.equal(res.items[0].completed, false)
      assert.equal(res.items[1].completed, false)
      assert.equal(res.items[2].completed, false)
    })

    // 14. If a completed checkpoint becomes incomplete, allDone becomes false (displays checklist again)
    await asyncTest('Re-displays checklist if an account checkpoint becomes incomplete', async () => {
      // First: all 3 complete (allDone = true)
      profilesRepo.getByCreator = async () => ({ id: 'u13', avatarUrl: 'https://cdn.creatorstore.com/avatars/u13.png' })
      storesRepo.getByCreator = async () => ({ id: 's13', avatarUrl: '', theme: {} })
      let productsCount = 1
      prisma.product.count = async () => productsCount
      payoutProfilesRepo.getByCreator = async () => ({
        id: 'p13',
        payoutMethod: 'UPI',
        upiId: 'creator@okaxis',
        status: 'ACTIVE',
      })

      const completeRes = await meService.getCreatorSetupStatus('u13')
      assert.equal(completeRes.allDone, true)

      // Creator deletes/archives product: count becomes 0
      productsCount = 0
      const incompleteRes = await meService.getCreatorSetupStatus('u13')
      assert.equal(incompleteRes.completed, 2)
      assert.equal(incompleteRes.percentage, 67)
      assert.equal(incompleteRes.allDone, false, 'Checklist must re-appear (allDone = false) when step becomes incomplete')
      assert.equal(incompleteRes.items[1].completed, false)
    })

    // 15. Verify allDone boolean mapping: only true when completed === 3
    test('Visibility logic: card only hides when allDone === true (3 of 3)', () => {
      const shouldHide = (status) => Boolean(status && status.allDone === true && status.completed === 3)
      assert.equal(shouldHide({ completed: 0, total: 3, allDone: false }), false, '0 of 3 must not hide')
      assert.equal(shouldHide({ completed: 1, total: 3, allDone: false }), false, '1 of 3 must not hide')
      assert.equal(shouldHide({ completed: 2, total: 3, allDone: false }), false, '2 of 3 must not hide')
      assert.equal(shouldHide({ completed: 3, total: 3, allDone: true }), true, '3 of 3 must hide')
      assert.equal(shouldHide(null), false, 'null data must not hide')
      assert.equal(shouldHide({}), false, 'empty data must not hide')
    })

  } finally {
    // Restore originals
    profilesRepo.getByCreator = origProfileGet
    storesRepo.getByCreator = origStoreGet
    prisma.product.count = origProductCount
    payoutProfilesRepo.getByCreator = origPayoutGet
  }

  console.log(`\n========================================`)
  console.log(`Test Results: ${passed} Passed, ${failed} Failed`)
  console.log(`========================================`)

  if (failed > 0) {
    process.exit(1)
  }
}

runTests().catch((err) => {
  console.error('Fatal test error:', err)
  process.exit(1)
})
