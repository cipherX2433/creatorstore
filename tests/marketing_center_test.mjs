import { marketingService, emailMarketingService, leadService, couponService } from '../lib/services.js'
import { leadsRepo, couponsRepo, emailRepo, productsRepo, profilesRepo, usersRepo, customersRepo, creatorSubscriptionsRepo } from '../lib/repos.js'
import { v4 as uuidv4 } from 'uuid'

async function runMarketingCenterTests() {
  console.log('=== STARTING CREATORSTORE MARKETING CENTER INTEGRATION TESTS ===\n')
  let passed = 0
  let failed = 0

  function assert(condition, message) {
    if (condition) {
      console.log(`✅ PASS: ${message}`)
      passed++
    } else {
      console.error(`❌ FAIL: ${message}`)
      failed++
    }
  }

  try {
    // 1. Setup creator user and profile
    const testCreatorId = uuidv4()
    console.log(`Test Creator ID: ${testCreatorId}`)

    await usersRepo.create({
      id: testCreatorId,
      email: `mkt_creator_${Date.now()}@example.com`,
      passwordHash: '$2b$10$abcdefghijklmnopqrstuvwxyz1234567890',
      role: 'CREATOR',
    })

    await profilesRepo.upsert(testCreatorId, {
      name: 'Marketing Test Creator',
    })

    await creatorSubscriptionsRepo.upsert(testCreatorId, {
      plan: 'PRO',
      status: 'ACTIVE',
      amount: 999,
      currency: 'INR',
    })

    // Create a product for coupon targeting
    const testProd = await productsRepo.create({
      id: uuidv4(),
      creatorId: testCreatorId,
      title: 'Marketing Masterclass',
      type: 'DIGITAL_DOWNLOAD',
      price: 1999,
      currency: 'INR',
      status: 'PUBLISHED',
    })

    // 2. Initial Marketing Overview (Empty state)
    const initialOverview = await marketingService.getOverview(testCreatorId)
    assert(initialOverview.totalLeads === 0, 'Initial leads count is 0')
    assert(initialOverview.activeCoupons === 0, 'Initial active coupons count is 0')
    assert(initialOverview.totalCampaigns === 0, 'Initial campaigns count is 0')

    // 3. Test Leads Capture & Listing
    const lead1 = await leadService.capture(testCreatorId, {
      name: 'Jane Doe',
      email: 'jane.doe@example.com',
      source: 'Storefront',
      leadMagnetTitle: 'Free Creator Ebook',
    })
    assert(lead1 && lead1.email === 'jane.doe@example.com', 'Lead 1 captured successfully')

    const lead2 = await leadService.capture(testCreatorId, {
      name: 'John Smith',
      email: 'john.smith@example.com',
      source: 'Instagram DM',
      leadMagnetTitle: 'Free Growth Checklist',
    })
    assert(lead2 && lead2.email === 'john.smith@example.com', 'Lead 2 captured successfully')

    const leadsList = await leadService.list(testCreatorId)
    assert((leadsList.total === 2 || leadsList.items?.length === 2 || leadsList.length === 2), 'Leads listing returns 2 leads')

    // 4. Test Coupon Creation & Validation (Regression Test)
    const coupon1 = await couponService.create(testCreatorId, {
      code: `PROMO20_${Date.now().toString().slice(-4)}`,
      type: 'PERCENTAGE',
      discount: 20,
      scope: 'ALL',
      minOrderPrice: 500,
      validityHours: 72,
    })
    assert(coupon1 && coupon1.discount === 20, 'Percentage coupon created successfully')

    const coupon2 = await couponService.create(testCreatorId, {
      code: `FLAT500_${Date.now().toString().slice(-4)}`,
      type: 'FIXED',
      discount: 500,
      scope: 'SPECIFIC',
      productIds: [testProd.id],
      minOrderPrice: 1000,
      validityHours: 24,
    })
    assert(coupon2 && coupon2.discount === 500, 'Specific product fixed discount coupon created successfully')

    // Validate coupon at checkout
    const validResult = await couponService.validate(testCreatorId, coupon1.code, testProd.id, 1999)
    assert(validResult && validResult.valid === true, 'Coupon validation succeeds on qualifying order')
    assert(validResult.discountAmount > 0, 'Coupon calculates correct discount amount')

    // 5. Test Email Audience Calculation
    const allAudience = await emailMarketingService.getAudienceEstimate(testCreatorId, 'ALL_CUSTOMERS')
    assert(allAudience.count >= 2, 'Audience estimate correctly captures lead magnet contacts')

    const leadsAudience = await emailMarketingService.getAudienceEstimate(testCreatorId, 'LEADS')
    assert(leadsAudience.count === 2, 'Leads audience segment returns exact leads count')

    // 6. Test Test Email
    const testEmailRes = await emailMarketingService.sendTestEmail(testCreatorId, {
      testEmail: 'preview@example.com',
      subject: 'Special Offer Announcement',
      content: 'Hello creator community, check out our new update!',
    })
    assert(testEmailRes.success === true, 'Test email sent successfully without throwing')

    // 7. Test Campaign Broadcast
    const broadcastRes = await emailMarketingService.sendBroadcast(testCreatorId, {
      name: 'Autumn Drop Campaign',
      subject: 'Autumn Drop is Live!',
      content: 'Get 20% off all digital items today only with code PROMO20!',
      audience: 'ALL_CUSTOMERS',
    })
    assert(broadcastRes && broadcastRes.subject === 'Autumn Drop is Live!', 'Broadcast campaign logged successfully')
    assert(broadcastRes.status === 'SENT', 'Broadcast status is SENT')

    const broadcasts = await emailMarketingService.listBroadcasts(testCreatorId)
    assert(broadcasts.length === 1, 'Broadcasts list returns exactly 1 campaign')

    // 8. Test Marketing Overview with Real Active Data
    const updatedOverview = await marketingService.getOverview(testCreatorId)
    assert(updatedOverview.totalLeads === 2, 'Updated overview reports exactly 2 leads')
    assert(updatedOverview.activeCoupons === 2, 'Updated overview reports exactly 2 active coupons')
    assert(updatedOverview.totalCampaigns === 1, 'Updated overview reports exactly 1 campaign')

    // 9. IDOR / Creator Security Protection
    const otherCreatorId = uuidv4()
    const otherOverview = await marketingService.getOverview(otherCreatorId)
    assert(otherOverview.totalLeads === 0 && otherOverview.activeCoupons === 0, 'Isolated creator data: other creator sees 0 leads and 0 coupons')

    // Summary
    console.log(`\n========================================`)
    console.log(`MARKETING CENTER TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`)
    console.log(`========================================\n`)

    if (failed > 0) {
      process.exit(1)
    }
  } catch (err) {
    console.error('Unhandled test error:', err)
    process.exit(1)
  }
}

runMarketingCenterTests()
