import { payoutService } from '../lib/services.js'
import { usersRepo, payoutProfilesRepo, earningsLedgerRepo } from '../lib/repos.js'
import fs from 'fs'
import path from 'path'

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

async function createTestCreator(suffix = '') {
  const email = `creator_payout_flow_${Date.now()}_${Math.random().toString(36).slice(2, 7)}_${suffix}@test.com`
  const user = await usersRepo.create({
    email,
    name: 'Payout Flow Test Creator',
    role: 'CREATOR',
    passwordHash: 'hashed_pw_for_test'
  })
  return user
}

async function runCompletePayoutFlowTests() {
  console.log('='.repeat(80))
  console.log('COMPLETE PAYOUT VERIFICATION STATUS FLOW - 13 ACCEPTANCE TESTS')
  console.log('='.repeat(80))

  try {
    // ------------------------------------------------------------------------
    console.log('\n--- TEST 1: New bank details submitted ---')
    const user1 = await createTestCreator('t1')
    const res1 = await payoutService.onboard(user1.id, {
      accountHolderName: 'Mohit Ranjan',
      bankName: 'HDFC Bank',
      accountNumber: '50100432109876',
      confirmAccountNumber: '50100432109876',
      ifscCode: 'HDFC0001234',
      payoutMethod: 'BANK_ACCOUNT',
      minimumPayoutThreshold: 500,
      payoutSchedule: 'weekly'
    })

    const dbProfile1 = await payoutProfilesRepo.getByCreator(user1.id)
    assert(dbProfile1.status === 'PENDING', `Database status is PENDING (got ${dbProfile1.status})`)
    assert(res1.status === 'PENDING', `Status in response is PENDING`)
    assert(res1.verificationStatus === 'PENDING', `Verification status is PENDING`)
    assert(res1.verificationMessage === 'Verification usually completes within 12–24 hours.', `Verification subtext matches "Verification usually completes within 12–24 hours."`)
    assert(res1.isEligibleForPayout === false, `PENDING bank account is not eligible for payout`)

    // ------------------------------------------------------------------------
    console.log('\n--- TEST 2: New UPI submitted ---')
    const user2 = await createTestCreator('t2')
    const res2 = await payoutService.onboard(user2.id, {
      accountHolderName: 'Mohit Ranjan',
      upiId: 'mohit@okhdfcbank',
      payoutMethod: 'UPI',
      minimumPayoutThreshold: 200,
      payoutSchedule: 'monthly'
    })

    const dbProfile2 = await payoutProfilesRepo.getByCreator(user2.id)
    assert(dbProfile2.status === 'PENDING', `Database status is PENDING (got ${dbProfile2.status})`)
    assert(res2.status === 'PENDING', `Status in response is PENDING`)
    assert(res2.verificationStatus === 'PENDING', `Verification status is PENDING`)
    assert(res2.verificationMessage === 'Verification usually completes within 12–24 hours.', `Verification subtext matches "Verification usually completes within 12–24 hours."`)
    assert(res2.isEligibleForPayout === false, `PENDING UPI account is not eligible for payout`)

    // ------------------------------------------------------------------------
    console.log('\n--- TEST 3: Backend verification succeeds: PENDING -> VERIFIED ---')
    const user3 = await createTestCreator('t3')
    await payoutService.onboard(user3.id, {
      accountHolderName: 'Verified Creator',
      bankName: 'SBI',
      accountNumber: '11112222333344',
      confirmAccountNumber: '11112222333344',
      ifscCode: 'SBIN0001234',
      payoutMethod: 'BANK_ACCOUNT'
    })
    // Legitimate backend verification occurs
    await payoutProfilesRepo.updateStatus(user3.id, 'VERIFIED', { verificationStatus: 'VERIFIED' })
    const dbProfile3 = await payoutProfilesRepo.getByCreator(user3.id)
    assert(dbProfile3.status === 'VERIFIED', `Database status successfully updated to VERIFIED`)

    // Refresh / fetch payout settings
    const refreshStatus3 = await payoutService.getStatus(user3.id)
    assert(refreshStatus3.status === 'VERIFIED' || refreshStatus3.status === 'ACTIVE', `Status is VERIFIED/ACTIVE`)
    assert(refreshStatus3.verificationStatus === 'VERIFIED', `Verification status is VERIFIED`)
    assert(refreshStatus3.verificationMessage === 'Your payout account has been verified and is ready for payouts.', `Verification subtext is "Your payout account has been verified and is ready for payouts."`)

    // ------------------------------------------------------------------------
    console.log('\n--- TEST 4: Creator opens payout settings while status is VERIFIED ---')
    const viewStatus3 = await payoutService.getStatus(user3.id)
    assert(viewStatus3.status === 'VERIFIED' || viewStatus3.status === 'ACTIVE', `Status remains VERIFIED on viewing`)
    assert(viewStatus3.verificationMessage === 'Your payout account has been verified and is ready for payouts.', `Message remains verified message`)

    // ------------------------------------------------------------------------
    console.log('\n--- TEST 5: Creator edits VERIFIED bank details -> PENDING ---')
    const editedBankRes = await payoutService.onboard(user3.id, {
      accountHolderName: 'Verified Creator',
      bankName: 'ICICI Bank',
      accountNumber: '99998888777766',
      confirmAccountNumber: '99998888777766',
      ifscCode: 'ICIC0005678',
      payoutMethod: 'BANK_ACCOUNT'
    })
    const dbProfile3Edited = await payoutProfilesRepo.getByCreator(user3.id)
    assert(dbProfile3Edited.status === 'PENDING', `Database status returned to PENDING after bank edit`)
    assert(editedBankRes.status === 'PENDING', `Response status returned to PENDING`)
    assert(editedBankRes.verificationMessage === 'Verification usually completes within 12–24 hours.', `Subtext reset to 12-24 hours info`)

    // ------------------------------------------------------------------------
    console.log('\n--- TEST 6: Creator edits VERIFIED UPI -> PENDING ---')
    const user6 = await createTestCreator('t6')
    await payoutService.onboard(user6.id, {
      accountHolderName: 'UPI Creator',
      upiId: 'initial@okaxis',
      payoutMethod: 'UPI'
    })
    await payoutProfilesRepo.updateStatus(user6.id, 'VERIFIED', { verificationStatus: 'VERIFIED' })
    const dbProfile6Before = await payoutProfilesRepo.getByCreator(user6.id)
    assert(dbProfile6Before.status === 'VERIFIED', `UPI verified initially in DB`)

    const editedUpiRes = await payoutService.onboard(user6.id, {
      accountHolderName: 'UPI Creator',
      upiId: 'updated@okaxis',
      payoutMethod: 'UPI'
    })
    const dbProfile6After = await payoutProfilesRepo.getByCreator(user6.id)
    assert(dbProfile6After.status === 'PENDING', `Database status returned to PENDING after UPI edit`)
    assert(editedUpiRes.status === 'PENDING', `Response status is PENDING`)

    // ------------------------------------------------------------------------
    console.log('\n--- TEST 7: Creator sends status = "VERIFIED" from frontend ---')
    const user7 = await createTestCreator('t7')
    const res7 = await payoutService.onboard(user7.id, {
      accountHolderName: 'Spoof Creator 1',
      upiId: 'spoof1@okicici',
      payoutMethod: 'UPI',
      status: 'VERIFIED'
    })
    const dbProfile7 = await payoutProfilesRepo.getByCreator(user7.id)
    assert(dbProfile7.status === 'PENDING', `Backend ignored status='VERIFIED'; DB status is PENDING`)
    assert(res7.status === 'PENDING', `Response status is PENDING`)

    // ------------------------------------------------------------------------
    console.log('\n--- TEST 8: Creator sends status = "ACTIVE" from frontend ---')
    const user8 = await createTestCreator('t8')
    const res8 = await payoutService.onboard(user8.id, {
      accountHolderName: 'Spoof Creator 2',
      bankName: 'Kotak Bank',
      accountNumber: '44445555666677',
      confirmAccountNumber: '44445555666677',
      ifscCode: 'KKBK0001234',
      payoutMethod: 'BANK_ACCOUNT',
      status: 'ACTIVE',
      verified: true
    })
    const dbProfile8 = await payoutProfilesRepo.getByCreator(user8.id)
    assert(dbProfile8.status === 'PENDING', `Backend ignored status='ACTIVE'; DB status is PENDING`)
    assert(res8.status === 'PENDING', `Response status is PENDING`)

    // ------------------------------------------------------------------------
    console.log('\n--- TEST 9: PENDING account attempts payout -> Blocked ---')
    const user9 = await createTestCreator('t9')
    await payoutService.onboard(user9.id, {
      accountHolderName: 'Pending Creator',
      upiId: 'pending@paytm',
      payoutMethod: 'UPI'
    })
    await earningsLedgerRepo.createEntry({
      creatorId: user9.id,
      grossAmount: 5000,
      netAmount: 5000,
      status: 'AVAILABLE',
      currency: 'INR'
    })

    let withdrawalBlocked = false
    try {
      await payoutService.requestWithdrawal(user9.id, { amount: 1000 })
    } catch (err) {
      withdrawalBlocked = true
      assert(err.status === 400, `Withdrawal blocked with HTTP 400`)
      assert(err.message.includes('pending verification'), `Error states account is pending verification`)
    }
    assert(withdrawalBlocked, `Payout transfer is blocked for PENDING account`)

    // ------------------------------------------------------------------------
    console.log('\n--- TEST 10: VERIFIED account attempts eligible payout -> Allowed ---')
    const user10 = await createTestCreator('t10')
    await payoutService.onboard(user10.id, {
      accountHolderName: 'Eligible Creator',
      bankName: 'HDFC Bank',
      accountNumber: '66667777888899',
      confirmAccountNumber: '66667777888899',
      ifscCode: 'HDFC0005678',
      payoutMethod: 'BANK_ACCOUNT'
    })
    await payoutProfilesRepo.updateStatus(user10.id, 'VERIFIED', { verificationStatus: 'VERIFIED' })
    await earningsLedgerRepo.createEntry({
      creatorId: user10.id,
      grossAmount: 5000,
      netAmount: 5000,
      status: 'AVAILABLE',
      currency: 'INR'
    })

    const withdrawalRes = await payoutService.requestWithdrawal(user10.id, { amount: 2000 })
    assert(withdrawalRes.success === true, `Withdrawal request successfully processed for VERIFIED account`)
    assert(withdrawalRes.amount === 2000, `Withdrawal amount recorded as 2000`)

    // ------------------------------------------------------------------------
    console.log('\n--- TEST 11: Search creator-facing payout UI for manual verification controls ---')
    const wizardFile = fs.readFileSync(path.resolve('components/dashboard/PayoutOnboardingWizard.jsx'), 'utf-8')
    const paymentsFile = fs.readFileSync(path.resolve('app/dashboard/payments/page.js'), 'utf-8')

    const forbiddenTerms = [
      'Verify Account',
      'Verify Bank',
      'Verify UPI',
      'Verify Now',
      'Upload Proof',
      'Upload Bank Proof',
      'Cancelled Cheque',
      'Upload Documents',
      'Contact Admin',
      'Contact Support',
      'Request Verification',
      'Waiting for Admin Approval'
    ]

    for (const term of forbiddenTerms) {
      const inWizard = wizardFile.toLowerCase().includes(term.toLowerCase())
      const inPayments = paymentsFile.toLowerCase().includes(term.toLowerCase())
      assert(!inWizard && !inPayments, `UI does not contain manual verification text '${term}'`)
    }

    // ------------------------------------------------------------------------
    console.log('\n--- TEST 12: PENDING account display state ---')
    const pendingStatusCheck = await payoutService.getStatus(user1.id)
    assert(pendingStatusCheck.status === 'PENDING', `Status is PENDING`)
    assert(pendingStatusCheck.verificationMessage === 'Verification usually completes within 12–24 hours.', `Shows: "Verification usually completes within 12–24 hours."`)
    assert(pendingStatusCheck.verificationMessage !== 'Your payout account has been verified and is ready for payouts.', `NOT: "Payout is active" text`)

    // ------------------------------------------------------------------------
    console.log('\n--- TEST 13: VERIFIED account display state ---')
    const verifiedStatusCheck = await payoutService.getStatus(user10.id)
    assert(verifiedStatusCheck.status === 'VERIFIED' || verifiedStatusCheck.status === 'ACTIVE', `Status is VERIFIED/ACTIVE`)
    assert(verifiedStatusCheck.verificationMessage === 'Your payout account has been verified and is ready for payouts.', `Shows verified description`)
    assert(!verifiedStatusCheck.verificationMessage.includes('12–24 hours'), `NOT: 12-24 hours message`)

    console.log('\n' + '='.repeat(80))
    console.log(`ALL 13 ACCEPTANCE TESTS PASSED! (${passed} assertions passed, ${failed} failed)`)
    console.log('='.repeat(80))
  } catch (err) {
    console.error('\nTEST EXECUTION ERROR:', err)
    process.exit(1)
  }
}

runCompletePayoutFlowTests()
