import { payoutService } from '../lib/services.js'
import { payoutProfilesRepo, usersRepo } from '../lib/repos.js'
import { prisma } from '../lib/prisma.js'

async function runPayoutTests() {
  console.log('====================================================')
  console.log(' PAYOUT CONDITIONAL VALIDATION & SCHEMA TEST SUITE')
  console.log('====================================================\n')

  let passed = 0
  let failed = 0

  function assert(condition, message) {
    if (condition) {
      console.log(`✅ [PASS] ${message}`)
      passed++
    } else {
      console.error(`❌ [FAIL] ${message}`)
      failed++
    }
  }

  // Create a temporary test creator
  const testEmail = `payout_qa_${Date.now()}@example.com`
  const testUser = await usersRepo.create({
    email: testEmail,
    password: 'Password123!',
    role: 'CREATOR',
    emailVerified: true,
  })
  const creatorId = testUser.id
  console.log(`Initialized Test Creator: ${testEmail} (ID: ${creatorId})\n`)

  try {
    // TEST 1: Account Details + valid bank information -> PASS
    console.log('--- TEST 1: Account Details + valid bank information ---')
    const res1 = await payoutService.onboard(creatorId, {
      payoutMethod: 'ACCOUNT',
      accountHolderName: 'Mohit Ranjan',
      bankName: 'HDFC Bank',
      accountNumber: '50100234567890',
      confirmAccountNumber: '50100234567890',
      ifscCode: 'HDFC0001234',
      payoutSchedule: 'weekly',
      minimumPayoutThreshold: 500,
    })
    assert(res1.status === 'PENDING', 'Status is PENDING after Account onboarding')
    assert(res1.payoutMethod === 'ACCOUNT', 'Payout method is ACCOUNT')
    assert(res1.accountHolderName === 'Mohit Ranjan', 'Account holder name matches')
    assert(res1.bankName === 'HDFC Bank', 'Bank name matches HDFC Bank')
    assert(res1.bankLast4 === '7890', 'Bank last 4 digits are 7890')
    assert(res1.bankAccountMasked === '•••• 7890', 'Bank account masked format is correct')
    assert(res1.ifsc === 'HDFC0001234', 'IFSC matches HDFC0001234')
    assert(res1.upiId === '', 'UPI ID is empty for Account Details')

    // TEST 2: Account Details + missing bank name -> server validation rejects
    console.log('\n--- TEST 2: Account Details + missing bank name ---')
    let err2 = null
    try {
      await payoutService.onboard(creatorId, {
        payoutMethod: 'ACCOUNT',
        accountHolderName: 'Mohit Ranjan',
        bankName: '',
        accountNumber: '50100234567890',
        confirmAccountNumber: '50100234567890',
        ifscCode: 'HDFC0001234',
      })
    } catch (e) {
      err2 = e
    }
    assert(err2 && (err2.status === 400 || err2.statusCode === 400) && err2.message.includes('Bank name'), `Missing bank name rejected: ${err2?.message}`)

    // TEST 3: Account Details + missing account number -> server validation rejects
    console.log('\n--- TEST 3: Account Details + missing account number ---')
    let err3 = null
    try {
      await payoutService.onboard(creatorId, {
        payoutMethod: 'ACCOUNT',
        accountHolderName: 'Mohit Ranjan',
        bankName: 'HDFC Bank',
        accountNumber: '',
        ifscCode: 'HDFC0001234',
      })
    } catch (e) {
      err3 = e
    }
    assert(err3 && (err3.status === 400 || err3.statusCode === 400) && err3.message.includes('account number'), `Missing account number rejected: ${err3?.message}`)

    // TEST 4: Account Details + missing IFSC -> server validation rejects
    console.log('\n--- TEST 4: Account Details + missing IFSC ---')
    let err4 = null
    try {
      await payoutService.onboard(creatorId, {
        payoutMethod: 'ACCOUNT',
        accountHolderName: 'Mohit Ranjan',
        bankName: 'HDFC Bank',
        accountNumber: '50100234567890',
        confirmAccountNumber: '50100234567890',
        ifscCode: '',
      })
    } catch (e) {
      err4 = e
    }
    assert(err4 && (err4.status === 400 || err4.statusCode === 400) && err4.message.includes('IFSC'), `Missing IFSC rejected: ${err4?.message}`)

    // TEST 5: UPI + valid UPI ID -> PASS
    console.log('\n--- TEST 5: UPI + valid UPI ID ---')
    const res5 = await payoutService.onboard(creatorId, {
      payoutMethod: 'UPI',
      upiId: 'mohit@okhdfcbank',
      payoutSchedule: 'monthly',
      minimumPayoutThreshold: 1000,
    })
    assert(res5.status === 'PENDING', 'Status is PENDING after UPI onboarding')
    assert(res5.payoutMethod === 'UPI', 'Payout method is UPI')
    assert(res5.upiIdMasked.includes('okhdfcbank'), 'UPI ID masked correctly')
    assert(res5.bankAccountMasked === '', 'Bank account masked is empty for UPI')
    assert(res5.bankName === '', 'Bank name is not exposed for UPI active destination')

    // TEST 6: UPI + no bank name -> PASS
    console.log('\n--- TEST 6: UPI + no bank name ---')
    const res6 = await payoutService.onboard(creatorId, {
      payoutMethod: 'UPI',
      upiId: 'creator@upi',
      bankName: '',
    })
    assert(res6.status === 'PENDING' && res6.payoutMethod === 'UPI', 'UPI without bank name succeeds')

    // TEST 7: UPI + no account number -> PASS
    console.log('\n--- TEST 7: UPI + no account number ---')
    const res7 = await payoutService.onboard(creatorId, {
      payoutMethod: 'UPI',
      upiId: 'creator2@paytm',
      accountNumber: '',
    })
    assert(res7.status === 'PENDING' && res7.payoutMethod === 'UPI', 'UPI without account number succeeds')

    // TEST 8: UPI + no IFSC -> PASS
    console.log('\n--- TEST 8: UPI + no IFSC ---')
    const res8 = await payoutService.onboard(creatorId, {
      payoutMethod: 'UPI',
      upiId: 'creator3@axl',
      ifscCode: '',
    })
    assert(res8.status === 'PENDING' && res8.payoutMethod === 'UPI', 'UPI without IFSC code succeeds')

    // TEST 9: Switch Account -> UPI -> PASS
    console.log('\n--- TEST 9: Switch Account -> UPI ---')
    // First save Account
    await payoutService.onboard(creatorId, {
      payoutMethod: 'ACCOUNT',
      accountHolderName: 'Jane Doe',
      bankName: 'State Bank of India',
      accountNumber: '123456789012',
      confirmAccountNumber: '123456789012',
      ifscCode: 'SBIN0001234',
    })
    // Then switch to UPI
    const res9 = await payoutService.onboard(creatorId, {
      payoutMethod: 'UPI',
      upiId: 'janedoe@icici',
    })
    assert(res9.payoutMethod === 'UPI', 'Method successfully switched to UPI')
    assert(res9.status === 'PENDING', 'Status remains/resets to PENDING')
    assert(res9.upiIdMasked.includes('icici'), 'Active destination is UPI ID')
    assert(res9.bankAccountMasked === '', 'Bank details are NOT active destination')

    // TEST 10: Switch UPI -> Account -> PASS
    console.log('\n--- TEST 10: Switch UPI -> Account ---')
    const res10 = await payoutService.onboard(creatorId, {
      payoutMethod: 'ACCOUNT',
      accountHolderName: 'Jane Doe',
      bankName: 'ICICI Bank',
      accountNumber: '987654321098',
      confirmAccountNumber: '987654321098',
      ifscCode: 'ICIC0001234',
    })
    assert(res10.payoutMethod === 'ACCOUNT', 'Method successfully switched back to ACCOUNT')
    assert(res10.status === 'PENDING', 'Status is PENDING')
    assert(res10.bankName === 'ICICI Bank', 'Bank name is ICICI Bank')
    assert(res10.bankLast4 === '1098', 'Active destination is bank account ending in 1098')
    assert(res10.upiId === '', 'UPI ID is NOT active destination')

    // TEST 11: Refresh page / getStatus -> active payout method persists
    console.log('\n--- TEST 11: getStatus persistence check ---')
    const status11 = await payoutService.getStatus(creatorId)
    assert(status11.payoutMethod === 'ACCOUNT', 'Persisted payoutMethod is ACCOUNT')
    assert(status11.bankName === 'ICICI Bank', 'Persisted bankName is ICICI Bank')
    assert(status11.accountHolderName === 'Jane Doe', 'Persisted accountHolderName is Jane Doe')
    assert(status11.bankLast4 === '1098', 'Persisted bankLast4 is 1098')

    // TEST 12: Database direct schema check (no schema cache error)
    console.log('\n--- TEST 12: Direct DB schema cache query ---')
    const rawProfile = await payoutProfilesRepo.getByCreator(creatorId)
    assert(rawProfile.bankName === 'ICICI Bank', 'Direct query returned bankName correctly')
    assert(rawProfile.payoutMethod === 'ACCOUNT', 'Direct query returned payoutMethod correctly')
    assert(rawProfile.ifscCode === 'ICIC0001234', 'Direct query returned ifscCode correctly')

  } finally {
    // Cleanup test user & cascade delete payout profile
    console.log('\n--- Cleaning up test records ---')
    await prisma.$executeRawUnsafe(`DELETE FROM payout_profiles WHERE creator_id = '${creatorId}'::uuid;`)
    await prisma.$executeRawUnsafe(`DELETE FROM users WHERE id = '${creatorId}'::uuid;`)
    await prisma.$disconnect()
  }

  console.log(`\n====================================================`)
  console.log(` RESULTS: ${passed} PASSED, ${failed} FAILED`)
  console.log(`====================================================\n`)

  if (failed > 0) {
    process.exit(1)
  }
}

runPayoutTests().catch((err) => {
  console.error('Test execution failed:', err)
  process.exit(1)
})
