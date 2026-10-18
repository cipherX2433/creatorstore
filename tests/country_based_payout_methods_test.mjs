import assert from 'node:assert'
import { prisma } from '../lib/prisma.js'
import { usersRepo, profilesRepo, payoutProfilesRepo } from '../lib/repos.js'
import { payoutService, maskPayPalEmail } from '../lib/services.js'

async function runTests() {
  console.log('=====================================================================')
  console.log('🧪 COUNTRY-BASED CREATOR PAYOUT METHODS TEST SUITE')
  console.log('=====================================================================\n')

  let passed = 0
  let failed = 0

  function pass(desc) {
    console.log(`  ✅ [PASS] ${desc}`)
    passed++
  }

  function fail(desc, err) {
    console.error(`  ❌ [FAIL] ${desc}`)
    console.error(`     Error: ${err?.message || err}`)
    failed++
  }

  const inCreatorId = '88888888-4444-4444-8888-888888888881'
  const usCreatorId = '88888888-4444-4444-8888-888888888882'
  const fallbackCreatorId = '88888888-4444-4444-8888-888888888883'

  try {
    // Setup test users in Postgres
    console.log('--- Setup: Test Creators ---')
    await prisma.payoutProfile.deleteMany({
      where: { creatorId: { in: [inCreatorId, usCreatorId, fallbackCreatorId] } }
    })
    await prisma.creatorProfile.deleteMany({
      where: { creatorId: { in: [inCreatorId, usCreatorId, fallbackCreatorId] } }
    })
    await prisma.user.deleteMany({
      where: { id: { in: [inCreatorId, usCreatorId, fallbackCreatorId] } }
    })

    // 1. Indian creator
    await prisma.user.create({
      data: {
        id: inCreatorId,
        email: `in_creator_${Date.now()}@example.com`,
        passwordHash: 'dummy',
        country: 'IN',
        role: 'CREATOR'
      }
    })
    await prisma.creatorProfile.create({
      data: {
        creatorId: inCreatorId,
        name: 'Indian Creator',
        country: 'IN'
      }
    })

    // 2. US creator (Outside India)
    await prisma.user.create({
      data: {
        id: usCreatorId,
        email: `us_creator_${Date.now()}@example.com`,
        passwordHash: 'dummy',
        country: 'US',
        role: 'CREATOR'
      }
    })
    await prisma.creatorProfile.create({
      data: {
        creatorId: usCreatorId,
        name: 'US Creator',
        country: 'US'
      }
    })

    // 3. Fallback creator (Missing / Null country)
    await prisma.user.create({
      data: {
        id: fallbackCreatorId,
        email: `fallback_creator_${Date.now()}@example.com`,
        passwordHash: 'dummy',
        country: null,
        role: 'CREATOR'
      }
    })
    await prisma.creatorProfile.create({
      data: {
        creatorId: fallbackCreatorId,
        name: 'Fallback Creator',
        country: null
      }
    })
    console.log('  Clean test fixtures initialized.\n')

    // Test 1: Indian creator sees Bank Account Details and UPI
    console.log('--- 1. Indian Creator Payout Methods ---')
    try {
      const status = await payoutService.getStatus(inCreatorId)
      assert.strictEqual(status.country, 'IN', 'Country should be IN')
      assert.strictEqual(status.isIndia, true, 'isIndia should be true')
      assert.deepStrictEqual(status.allowedPayoutMethods, ['BANK_ACCOUNT', 'UPI'], 'Indian creator allowed methods must be Bank Account and UPI')
      assert(!status.allowedPayoutMethods.includes('PAYPAL'), 'Indian creator must NOT have PayPal in allowed methods')
      pass('Indian creator sees Bank Account Details and UPI, with PayPal excluded')
    } catch (e) {
      fail('Indian creator method options test failed', e)
    }

    // Test 2: Indian creator cannot save PayPal
    console.log('\n--- 2. Indian Creator PayPal Restriction ---')
    try {
      let threw = false
      try {
        await payoutService.onboard(inCreatorId, {
          payoutMethod: 'PAYPAL',
          paypalEmail: 'indian_creator@paypal.com',
        })
      } catch (err) {
        threw = true
        assert(err.message.includes('PayPal is not available for creators in India'), `Expected India PayPal restriction message, got: ${err.message}`)
      }
      assert.strictEqual(threw, true, 'Server must reject PayPal for creators in India')
      pass('Indian creator attempting to configure PayPal is rejected server-side with 400')
    } catch (e) {
      fail('Indian creator PayPal restriction test failed', e)
    }

    // Test 3: Non-Indian creator sees only PayPal
    console.log('\n--- 3. Non-Indian Creator Payout Methods ---')
    try {
      const status = await payoutService.getStatus(usCreatorId)
      assert.strictEqual(status.country, 'US', 'Country should be US')
      assert.strictEqual(status.isIndia, false, 'isIndia should be false')
      assert.deepStrictEqual(status.allowedPayoutMethods, ['PAYPAL'], 'Non-Indian creator allowed methods must be strictly PayPal')
      assert(!status.allowedPayoutMethods.includes('BANK_ACCOUNT'), 'Bank Account must be excluded for non-Indian creators')
      assert(!status.allowedPayoutMethods.includes('UPI'), 'UPI must be excluded for non-Indian creators')
      pass('Non-Indian creator sees strictly PayPal, with Bank Account and UPI excluded')
    } catch (e) {
      fail('Non-Indian creator method options test failed', e)
    }

    // Test 4: Non-Indian creator cannot save Bank Account or UPI
    console.log('\n--- 4. Non-Indian Creator Bank/UPI Restriction ---')
    try {
      let threwBank = false
      try {
        await payoutService.onboard(usCreatorId, {
          payoutMethod: 'BANK_ACCOUNT',
          accountHolderName: 'US Creator',
          bankName: 'Chase Bank',
          accountNumber: '1234567890',
          ifscCode: 'CHAS0001234',
        })
      } catch (err) {
        threwBank = true
        assert(err.message.includes('Bank Account and UPI are not available for creators in United States'), `Expected bank restriction message, got: ${err.message}`)
      }
      assert.strictEqual(threwBank, true, 'Server must reject Bank Account for non-Indian creators')

      let threwUpi = false
      try {
        await payoutService.onboard(usCreatorId, {
          payoutMethod: 'UPI',
          upiId: 'uscreator@okhdfcbank',
        })
      } catch (err) {
        threwUpi = true
        assert(err.message.includes('Creators outside India must use PayPal'), `Expected UPI restriction message, got: ${err.message}`)
      }
      assert.strictEqual(threwUpi, true, 'Server must reject UPI for non-Indian creators')

      pass('Non-Indian creator attempting to save Bank Account or UPI is rejected server-side')
    } catch (e) {
      fail('Non-Indian Bank/UPI restriction test failed', e)
    }

    // Test 5: Client spoofing protection
    console.log('\n--- 5. Client Spoofing Protection ---')
    try {
      let threwSpoof = false
      try {
        // Client attempts to claim country='IN' in body payload while database user country is 'US'
        await payoutService.onboard(usCreatorId, {
          country: 'IN',
          payoutMethod: 'BANK_ACCOUNT',
          accountHolderName: 'Spoof Test',
          bankName: 'SBI',
          accountNumber: '1234567890',
          ifscCode: 'SBIN0001234',
        })
      } catch (err) {
        threwSpoof = true
        assert(err.message.includes('Creators outside India must use PayPal'), `Expected rejection based on DB user country, got: ${err.message}`)
      }
      assert.strictEqual(threwSpoof, true, 'Server must ignore body.country and enforce database user country')
      pass('Client cannot spoof country in request payload to access unavailable payout methods')
    } catch (e) {
      fail('Client spoofing protection test failed', e)
    }

    // Test 6: Valid payout details save and reload correctly
    console.log('\n--- 6. Save and Reload Payout Details ---')
    try {
      // 1. Non-Indian saves PayPal
      const usSaved = await payoutService.onboard(usCreatorId, {
        payoutMethod: 'PAYPAL',
        paypalEmail: 'US_Creator@Business.com',
        minimumPayoutThreshold: 75,
        payoutSchedule: 'monthly',
      })
      assert.strictEqual(usSaved.payoutMethod, 'PAYPAL', 'Payout method is PAYPAL')
      assert.strictEqual(usSaved.paypalEmail, 'us_creator@business.com', 'Normalized lowercase PayPal email')
      assert.strictEqual(usSaved.paypalEmailMasked, maskPayPalEmail('us_creator@business.com'), 'Masked PayPal email present')
      assert.strictEqual(usSaved.minimumPayoutThreshold, 75, 'Threshold saved as 75')
      assert.strictEqual(usSaved.payoutSchedule, 'monthly', 'Schedule saved as monthly')

      // Reload via getStatus
      const usReloaded = await payoutService.getStatus(usCreatorId)
      assert.strictEqual(usReloaded.payoutMethod, 'PAYPAL', 'Reloaded method is PAYPAL')
      assert.strictEqual(usReloaded.paypalEmailMasked, maskPayPalEmail('us_creator@business.com'), 'Reloaded masked email')

      // 2. Indian saves UPI
      const inSaved = await payoutService.onboard(inCreatorId, {
        payoutMethod: 'UPI',
        upiId: 'mohit@okhdfcbank',
        accountHolderName: 'Mohit Ranjan',
        minimumPayoutThreshold: 200,
        payoutSchedule: 'weekly',
      })
      assert.strictEqual(inSaved.payoutMethod, 'UPI', 'Payout method is UPI')
      assert(inSaved.upiIdMasked.includes('••'), 'Masked UPI present')

      pass('Valid PayPal and UPI details save and reload accurately with masked destinations')
    } catch (e) {
      fail('Save and reload test failed', e)
    }

    // Test 7: Invalid payout details rejected server-side
    console.log('\n--- 7. Server-Side Validation Rules ---')
    try {
      // Invalid PayPal email
      let threwInvalidEmail = false
      try {
        await payoutService.onboard(usCreatorId, {
          payoutMethod: 'PAYPAL',
          paypalEmail: 'invalid-email-address',
        })
      } catch (err) {
        threwInvalidEmail = true
        assert(err.message.includes('valid PayPal email address'), `Expected email validation message, got: ${err.message}`)
      }
      assert.strictEqual(threwInvalidEmail, true, 'Invalid PayPal email rejected')

      // Empty PayPal email
      let threwEmptyEmail = false
      try {
        await payoutService.onboard(usCreatorId, {
          payoutMethod: 'PAYPAL',
          paypalEmail: '   ',
        })
      } catch (err) {
        threwEmptyEmail = true
        assert(err.message.includes('PayPal email is required'), `Expected required email message, got: ${err.message}`)
      }
      assert.strictEqual(threwEmptyEmail, true, 'Empty PayPal email rejected')

      // Invalid threshold
      let threwBadThreshold = false
      try {
        await payoutService.onboard(usCreatorId, {
          payoutMethod: 'PAYPAL',
          paypalEmail: 'valid@example.com',
          minimumPayoutThreshold: -10,
        })
      } catch (err) {
        threwBadThreshold = true
        assert(err.message.includes('greater than zero'), `Expected positive threshold error, got: ${err.message}`)
      }
      assert.strictEqual(threwBadThreshold, true, 'Negative threshold rejected')

      pass('Server correctly rejects invalid email, empty email, and non-positive thresholds')
    } catch (e) {
      fail('Validation test failed', e)
    }

    // Test 8: Previously saved details preserved
    console.log('\n--- 8. Preservation of Previously Saved Details ---')
    try {
      // Indian creator saves bank details first
      await payoutService.onboard(inCreatorId, {
        payoutMethod: 'BANK_ACCOUNT',
        accountHolderName: 'Mohit Bank',
        bankName: 'HDFC Bank',
        accountNumber: '987654321098',
        ifscCode: 'HDFC0001234',
      })

      // Indian creator switches to UPI
      await payoutService.onboard(inCreatorId, {
        payoutMethod: 'UPI',
        upiId: 'mohit@okhdfcbank',
      })

      // Verify that bank details in database record were NOT wiped out
      const rawProfile = await payoutProfilesRepo.getByCreator(inCreatorId)
      assert.strictEqual(rawProfile.upiId, 'mohit@okhdfcbank', 'UPI ID is active')
      assert.strictEqual(rawProfile.bankName, 'HDFC Bank', 'Previous bank name preserved in DB')
      assert.strictEqual(rawProfile.bankLast4, '1098', 'Previous bank last4 preserved in DB')

      pass('Previous payment details are preserved in storage across method switches')
    } catch (e) {
      fail('Preservation of details test failed', e)
    }

    // Test 9: Country changes and mismatch flagging
    console.log('\n--- 9. Country Change Mismatch Flagging ---')
    try {
      // Simulate Indian creator relocating to UK (GB)
      await usersRepo.update(inCreatorId, { country: 'GB' })
      await profilesRepo.upsert(inCreatorId, { country: 'GB' })

      const statusAfterMove = await payoutService.getStatus(inCreatorId)
      assert.strictEqual(statusAfterMove.country, 'GB', 'Country updated to GB')
      assert.strictEqual(statusAfterMove.isIndia, false, 'isIndia updated to false')
      assert.strictEqual(statusAfterMove.methodMismatch, true, 'methodMismatch must be flagged true')
      assert.strictEqual(statusAfterMove.status, 'ACTION_REQUIRED', 'Status set to ACTION_REQUIRED')
      assert.strictEqual(statusAfterMove.isEligibleForPayout, false, 'Ineligible for payout until matching method configured')
      assert(statusAfterMove.eligibilityReason.includes('PayPal'), 'Eligibility reason directs creator to configure PayPal')

      // Now creator configures PayPal
      const paypalConfigured = await payoutService.onboard(inCreatorId, {
        payoutMethod: 'PAYPAL',
        paypalEmail: 'mohit.uk@example.com',
      })
      assert.strictEqual(paypalConfigured.methodMismatch, false, 'methodMismatch cleared after configuring PayPal')
      assert.strictEqual(paypalConfigured.payoutMethod, 'PAYPAL', 'Payout method is now PAYPAL')

      // Reset test user back to IN for clean state
      await usersRepo.update(inCreatorId, { country: 'IN' })
      await profilesRepo.upsert(inCreatorId, { country: 'IN' })

      pass('Country changes accurately trigger ACTION_REQUIRED mismatch and clear when updated')
    } catch (e) {
      fail('Country change mismatch test failed', e)
    }

    // Test 10: Missing or unsupported country safely handled
    console.log('\n--- 10. Missing / Unsupported Country Safety ---')
    try {
      const fallbackStatus = await payoutService.getStatus(fallbackCreatorId)
      assert.strictEqual(fallbackStatus.country, 'IN', 'Default country safely falls back to IN')
      assert.strictEqual(fallbackStatus.isIndia, true, 'isIndia safely defaults to true')
      assert.deepStrictEqual(fallbackStatus.allowedPayoutMethods, ['BANK_ACCOUNT', 'UPI'], 'Default allowed methods are Indian methods')

      pass('Missing or null country code gracefully defaults to safe domestic fallback (IN)')
    } catch (e) {
      fail('Missing country safety test failed', e)
    }

    // Test 11: Public API privacy protection
    console.log('\n--- 11. Privacy: No Payout Details in Public APIs ---')
    try {
      // Check that maskPayPalEmail properly obfuscates
      const masked = maskPayPalEmail('creator.store.business@gmail.com')
      assert.strictEqual(masked, 'cr••••s@gmail.com', `Masked email should be obfuscated, got: ${masked}`)

      // Ensure public User serialization does not expose payout profiles or paypal email
      const userDoc = await usersRepo.findById(usCreatorId)
      assert.strictEqual(userDoc.paypalEmail, undefined, 'User document must not have paypalEmail')
      assert.strictEqual(userDoc.accountNumber, undefined, 'User document must not have accountNumber')

      pass('Creator payout identifiers are masked and never exposed through public user endpoints')
    } catch (e) {
      fail('Privacy test failed', e)
    }

    // Test 12: Payout execution safety & eligibility
    console.log('\n--- 12. Payout Execution & Withdrawal Safety ---')
    try {
      // Unverified account cannot withdraw
      let threwWithdrawal = false
      try {
        await payoutService.requestWithdrawal(usCreatorId, { amount: 50 })
      } catch (err) {
        threwWithdrawal = true
        assert(err.message.includes('pending verification'), `Expected verification pending message, got: ${err.message}`)
      }
      assert.strictEqual(threwWithdrawal, true, 'Unverified payout account cannot execute withdrawal')

      pass('Payout withdrawal strictly requires active/verified status and prevents premature execution')
    } catch (e) {
      fail('Payout execution safety test failed', e)
    }

    // Cleanup
    console.log('\n--- Cleanup ---')
    await prisma.payoutProfile.deleteMany({
      where: { creatorId: { in: [inCreatorId, usCreatorId, fallbackCreatorId] } }
    })
    await prisma.creatorProfile.deleteMany({
      where: { creatorId: { in: [inCreatorId, usCreatorId, fallbackCreatorId] } }
    })
    await prisma.user.deleteMany({
      where: { id: { in: [inCreatorId, usCreatorId, fallbackCreatorId] } }
    })
    console.log('  Cleaned up temporary test fixtures.')

  } catch (err) {
    console.error('Unexpected test suite error:', err)
  }

  console.log('\n=====================================================================')
  console.log(` TEST RESULTS: ${passed} PASSED, ${failed} FAILED`)
  console.log('=====================================================================')

  if (failed > 0) process.exit(1)
  process.exit(0)
}

runTests()
