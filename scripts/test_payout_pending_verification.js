import { payoutService } from '../lib/services.js'
import { usersRepo, payoutProfilesRepo, earningsLedgerRepo } from '../lib/repos.js'
import { v4 as uuidv4 } from 'uuid'

let passed = 0
let failed = 0

function assert(condition, message) {
  if (condition) {
    passed++
    console.log(`  ✓ PASSED: ${message}`)
  } else {
    failed++
    console.error(`  ✗ FAILED: ${message}`)
    throw new Error(`Assertion failed: ${message}`)
  }
}

async function createTestCreator() {
  const email = `creator_payout_${Date.now()}_${Math.random().toString(36).slice(2, 7)}@test.com`
  const user = await usersRepo.create({
    email,
    name: 'Payout Test Creator',
    role: 'CREATOR',
    passwordHash: 'hashed_pw_for_test'
  })
  return user
}

async function runAllPayoutTests() {
  console.log('='.repeat(80))
  console.log('RUNNING PAYOUT DETAILS -> PENDING VERIFICATION TEST SUITE (13 ACCEPTANCE TESTS)')
  console.log('='.repeat(80))

  try {
    // ------------------------------------------------------------------------
    console.log('\n--- TEST 1: New Bank Account Submitted -> PENDING ---')
    const user1 = await createTestCreator()
    const res1 = await payoutService.onboard(user1.id, {
      accountHolderName: 'Mohit Ranjan',
      bankName: 'HDFC Bank',
      accountNumber: '123456789012',
      confirmAccountNumber: '123456789012',
      ifscCode: 'HDFC0001234',
      payoutMethod: 'BANK_ACCOUNT',
      minimumPayoutThreshold: 500,
      payoutSchedule: 'weekly'
    })

    assert(res1.status === 'PENDING', `Status is PENDING (got ${res1.status})`)
    assert(res1.onboardingStatus === 'PENDING', `Onboarding status is PENDING`)
    assert(res1.verificationStatus === 'PENDING', `Verification status is PENDING`)
    assert(res1.verificationMessage === 'Verification usually completes within 12–24 hours.', `Verification message is "Verification usually completes within 12–24 hours."`)
    assert(res1.isEligibleForPayout === false, `Pending account is NOT eligible for payout`)
    assert(res1.bankAccountMasked === '•••• 9012', `Bank account masked properly`)

    // ------------------------------------------------------------------------
    console.log('\n--- TEST 2: New UPI Submitted -> PENDING ---')
    const user2 = await createTestCreator()
    const res2 = await payoutService.onboard(user2.id, {
      accountHolderName: 'Mohit Ranjan',
      upiId: 'mohit@okhdfcbank',
      payoutMethod: 'UPI',
      minimumPayoutThreshold: 200,
      payoutSchedule: 'monthly'
    })

    assert(res2.status === 'PENDING', `UPI status is PENDING (got ${res2.status})`)
    assert(res2.onboardingStatus === 'PENDING', `UPI onboarding status is PENDING`)
    assert(res2.verificationStatus === 'PENDING', `UPI verification status is PENDING`)
    assert(res2.verificationMessage === 'Verification usually completes within 12–24 hours.', `UPI verification message is "Verification usually completes within 12–24 hours."`)
    assert(res2.isEligibleForPayout === false, `Pending UPI account is NOT eligible for payout`)
    assert(res2.upiIdMasked.includes('@okhdfcbank'), `UPI masked properly`)

    // ------------------------------------------------------------------------
    console.log('\n--- TEST 3: Existing ACTIVE Bank Account Edited -> PENDING ---')
    const user3 = await createTestCreator()
    // 1. Initial setup
    await payoutService.onboard(user3.id, {
      accountHolderName: 'Initial Creator',
      bankName: 'SBI',
      accountNumber: '111122223333',
      confirmAccountNumber: '111122223333',
      ifscCode: 'SBIN0001234',
      payoutMethod: 'BANK_ACCOUNT'
    })
    // 2. Verified by system / backend
    await payoutProfilesRepo.updateStatus(user3.id, 'ACTIVE', { verificationStatus: 'VERIFIED' })
    const activeCheck = await payoutService.getStatus(user3.id)
    assert(activeCheck.status === 'ACTIVE', `Account verified to ACTIVE`)

    // 3. Creator edits bank account details
    const editedRes3 = await payoutService.onboard(user3.id, {
      accountHolderName: 'Initial Creator',
      bankName: 'ICICI Bank',
      accountNumber: '999988887777',
      confirmAccountNumber: '999988887777',
      ifscCode: 'ICIC0005678',
      payoutMethod: 'BANK_ACCOUNT'
    })
    assert(editedRes3.status === 'PENDING', `Status transitioned from ACTIVE -> PENDING upon edit`)
    assert(editedRes3.isEligibleForPayout === false, `Edited bank account is not eligible for payout until verified`)

    // ------------------------------------------------------------------------
    console.log('\n--- TEST 4: Existing ACTIVE UPI Edited -> PENDING ---')
    const user4 = await createTestCreator()
    await payoutService.onboard(user4.id, {
      accountHolderName: 'UPI Creator',
      upiId: 'old@okaxis',
      payoutMethod: 'UPI'
    })
    await payoutProfilesRepo.updateStatus(user4.id, 'ACTIVE', { verificationStatus: 'VERIFIED' })
    const activeUpiCheck = await payoutService.getStatus(user4.id)
    assert(activeUpiCheck.status === 'ACTIVE', `UPI verified to ACTIVE`)

    // Creator edits UPI ID
    const editedRes4 = await payoutService.onboard(user4.id, {
      accountHolderName: 'UPI Creator',
      upiId: 'new_address@okaxis',
      payoutMethod: 'UPI'
    })
    assert(editedRes4.status === 'PENDING', `Status transitioned from ACTIVE -> PENDING upon UPI edit`)

    // ------------------------------------------------------------------------
    console.log('\n--- TEST 5: Creator sends status = "ACTIVE" in payload -> Backend forces PENDING ---')
    const user5 = await createTestCreator()
    const res5 = await payoutService.onboard(user5.id, {
      accountHolderName: 'Spoof Creator',
      upiId: 'spoof@okicici',
      payoutMethod: 'UPI',
      status: 'ACTIVE',
      onboardingStatus: 'ACTIVE'
    })
    assert(res5.status === 'PENDING', `Backend ignored client status payload; DB status is PENDING`)
    const dbProfile5 = await payoutProfilesRepo.getByCreator(user5.id)
    assert(dbProfile5.status === 'PENDING', `DB record explicitly has status = PENDING`)

    // ------------------------------------------------------------------------
    console.log('\n--- TEST 6: Creator sends verified = true in payload -> Backend forces PENDING ---')
    const user6 = await createTestCreator()
    const res6 = await payoutService.onboard(user6.id, {
      accountHolderName: 'Spoof Creator 2',
      bankName: 'Kotak Bank',
      accountNumber: '444455556666',
      confirmAccountNumber: '444455556666',
      ifscCode: 'KKBK0001234',
      payoutMethod: 'BANK_ACCOUNT',
      verified: true,
      isVerified: true,
      verificationStatus: 'VERIFIED'
    })
    assert(res6.status === 'PENDING', `Backend ignored client verified payload; status is PENDING`)
    assert(res6.verificationStatus === 'PENDING', `Verification status is PENDING`)

    // ------------------------------------------------------------------------
    console.log('\n--- TEST 7: PENDING Payout Account Attempts Withdrawal -> Blocked ---')
    const user7 = await createTestCreator()
    await payoutService.onboard(user7.id, {
      accountHolderName: 'Pending Creator',
      upiId: 'pending@paytm',
      payoutMethod: 'UPI'
    })
    // Give available earnings
    await earningsLedgerRepo.createEntry({
      creatorId: user7.id,
      grossAmount: 5000,
      netAmount: 5000,
      status: 'AVAILABLE',
      currency: 'INR'
    })

    let withdrawalBlocked = false
    try {
      await payoutService.requestWithdrawal(user7.id, { amount: 1000 })
    } catch (err) {
      withdrawalBlocked = true
      assert(err.status === 400, `Withdrawal blocked with HTTP 400`)
      assert(err.message.includes('pending verification'), `Error explains account is pending verification`)
    }
    assert(withdrawalBlocked, `Payout transfer is blocked for PENDING account`)

    const canReceive = await payoutService.canReceivePayout(user7.id)
    assert(canReceive === false, `canReceivePayout returns false for PENDING account`)

    // ------------------------------------------------------------------------
    console.log('\n--- TEST 8 & 9: Database Persistence After Refresh / Re-login ---')
    const user8 = await createTestCreator()
    await payoutService.onboard(user8.id, {
      accountHolderName: 'Persistence Creator',
      upiId: 'persist@okhdfc',
      payoutMethod: 'UPI'
    })
    
    // Simulate page refresh / new fetch
    const refreshStatus = await payoutService.getStatus(user8.id)
    assert(refreshStatus.status === 'PENDING', `Status after refresh is PENDING`)
    assert(refreshStatus.verificationMessage === 'Verification usually completes within 12–24 hours.', `Message persists after refresh`)

    // ------------------------------------------------------------------------
    console.log('\n--- TEST 10: Verify UI text requirements ---')
    // Ensure the message matches the exact requirement:
    assert(refreshStatus.verificationMessage === 'Verification usually completes within 12–24 hours.', `Exact message: "Verification usually completes within 12–24 hours."`)

    // ------------------------------------------------------------------------
    console.log('\n--- TEST 11: Viewing Existing ACTIVE Account Without Editing -> Remains ACTIVE ---')
    const user11 = await createTestCreator()
    await payoutService.onboard(user11.id, {
      accountHolderName: 'Active Viewer',
      upiId: 'viewer@upi',
      payoutMethod: 'UPI'
    })
    await payoutProfilesRepo.updateStatus(user11.id, 'ACTIVE', { verificationStatus: 'VERIFIED' })
    
    // Creator simply visits the settings page multiple times
    const view1 = await payoutService.getStatus(user11.id)
    const view2 = await payoutService.getStatus(user11.id)
    assert(view1.status === 'ACTIVE' && view2.status === 'ACTIVE', `Existing ACTIVE account remains ACTIVE when viewed without editing`)

    // ------------------------------------------------------------------------
    console.log('\n--- TEST 12: Bank -> UPI Switch -> UPI Becomes PENDING ---')
    const user12 = await createTestCreator()
    // 1. Bank ACTIVE
    await payoutService.onboard(user12.id, {
      accountHolderName: 'Method Switcher',
      bankName: 'Axis Bank',
      accountNumber: '121212121212',
      confirmAccountNumber: '121212121212',
      ifscCode: 'UTIB0001234',
      payoutMethod: 'BANK_ACCOUNT'
    })
    await payoutProfilesRepo.updateStatus(user12.id, 'ACTIVE', { verificationStatus: 'VERIFIED' })
    
    // 2. Switch to UPI
    const upiSwitchRes = await payoutService.onboard(user12.id, {
      accountHolderName: 'Method Switcher',
      upiId: 'switcher@oksbi',
      payoutMethod: 'UPI'
    })
    assert(upiSwitchRes.payoutMethod === 'UPI', `Method switched to UPI`)
    assert(upiSwitchRes.status === 'PENDING', `Switched UPI method has PENDING status`)
    assert(upiSwitchRes.isEligibleForPayout === false, `Switched method not eligible until verified`)

    // ------------------------------------------------------------------------
    console.log('\n--- TEST 13: UPI -> Bank Switch -> Bank Becomes PENDING ---')
    const user13 = await createTestCreator()
    // 1. UPI ACTIVE
    await payoutService.onboard(user13.id, {
      accountHolderName: 'UPI to Bank Switcher',
      upiId: 'upi_active@okicici',
      payoutMethod: 'UPI'
    })
    await payoutProfilesRepo.updateStatus(user13.id, 'ACTIVE', { verificationStatus: 'VERIFIED' })
    
    // 2. Switch to Bank
    const bankSwitchRes = await payoutService.onboard(user13.id, {
      accountHolderName: 'UPI to Bank Switcher',
      bankName: 'HDFC Bank',
      accountNumber: '888877776666',
      confirmAccountNumber: '888877776666',
      ifscCode: 'HDFC0004321',
      payoutMethod: 'BANK_ACCOUNT'
    })
    assert(bankSwitchRes.payoutMethod === 'BANK_ACCOUNT', `Method switched to Bank`)
    assert(bankSwitchRes.status === 'PENDING', `Switched Bank method has PENDING status`)
    assert(bankSwitchRes.isEligibleForPayout === false, `Switched method not eligible until verified`)

    console.log('\n' + '='.repeat(80))
    console.log(`ALL 13 ACCEPTANCE TESTS PASSED! (${passed} assertions passed, ${failed} failed)`)
    console.log('='.repeat(80))
  } catch (err) {
    console.error('\nTEST EXECUTION ERROR:', err)
    process.exit(1)
  }
}

runAllPayoutTests()
