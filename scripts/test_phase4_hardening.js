const { v4: uuidv4 } = require('uuid');
const { usersRepo, productsRepo, instagramRepo, prisma, automationEventsRepo } = require('../lib/repos');
const { checkoutService, webhookService, automationService, analyticsService, attributionService } = require('../lib/services');

async function runTests() {
  console.log('='.repeat(70));
  console.log('PHASE 4 — CREATORSTORE HARDENING & ANALYTICS INTEGRATION TEST');
  console.log('='.repeat(70));

  try {
    // 1. Create test Creator A
    const creatorAId = uuidv4();
    const emailA = `creator_a_${Date.now()}@example.com`;
    const creatorA = await usersRepo.create({
      id: creatorAId,
      email: emailA,
      passwordHash: 'hashed_pw',
      role: 'CREATOR',
      emailVerified: true
    });
    console.log(`[✓] Creator A registered: ${creatorA.id}`);

    // 2. Create test Creator B
    const creatorBId = uuidv4();
    const emailB = `creator_b_${Date.now()}@example.com`;
    const creatorB = await usersRepo.create({
      id: creatorBId,
      email: emailB,
      passwordHash: 'hashed_pw',
      role: 'CREATOR',
      emailVerified: true
    });
    console.log(`[✓] Creator B registered: ${creatorB.id}`);

    // Create Connected Instagram Account for Creator A
    await instagramRepo.upsert(creatorA.id, {
      platformUserId: `ig_user_a_${Date.now()}`,
      username: 'creator_a_ig',
      accessToken: 'encrypted_mock_token',
      status: 'CONNECTED'
    });
    console.log(`[✓] Creator A connected Instagram account created`);

    // 3. Create Product for Creator A
    const productA = await productsRepo.create({
      creatorId: creatorA.id,
      title: 'Mastering AI Playbook',
      price: 499,
      published: true
    });
    console.log(`[✓] Creator A Product created: ${productA.id}`);

    // 4. Create Product for Creator B
    const productB = await productsRepo.create({
      creatorId: creatorB.id,
      title: 'Creator B Secret Course',
      price: 999,
      published: true
    });
    console.log(`[✓] Creator B Product created: ${productB.id}`);

    // 5. TEST: Cross-Creator Product Attachment Validation
    console.log('\n--- 1. Testing Cross-Creator Automation Validation ---');
    try {
      await automationService.createAutomation(creatorA.id, {
        name: 'Hacker Automation',
        triggerValue: 'HACK',
        productId: productB.id, // Belonging to Creator B!
        message: 'Link: {{product_link}}'
      });
      console.error('[✗] IDOR VULNERABILITY! Creator A attached Creator B product!');
      process.exit(1);
    } catch (err) {
      console.log(`[✓] Security Enforcement Verified: ${err.message}`);
    }

    // 6. Create Valid Automation for Creator A
    const autoA = await automationService.createAutomation(creatorA.id, {
      name: 'AI Playbook Auto DM',
      triggerValue: 'PLAYBOOK',
      productId: productA.id,
      message: 'Get your playbook here: {{product_link}}',
      destinationType: 'CHECKOUT'
    });
    console.log(`[✓] Valid Automation created: ${autoA.id}`);

    // 7. TEST: IDOR Access Prevention on Automation
    console.log('\n--- 2. Testing Cross-Creator IDOR Access Control ---');
    try {
      await automationService.getAutomation(autoA.id, creatorB.id);
      console.error('[✗] IDOR VULNERABILITY! Creator B accessed Creator A automation!');
      process.exit(1);
    } catch (err) {
      console.log(`[✓] Security Enforcement Verified: ${err.message}`);
    }

    try {
      await automationService.getAutomationEvents(autoA.id, creatorB.id);
      console.error('[✗] IDOR VULNERABILITY! Creator B accessed Creator A event log!');
      process.exit(1);
    } catch (err) {
      console.log(`[✓] Security Enforcement Verified: ${err.message}`);
    }

    // 8. TEST: Attribution Token Generation & Security
    console.log('\n--- 3. Testing Signed Attribution Token Security ---');
    const validRefToken = attributionService.generateAttributionToken({
      creatorId: creatorA.id,
      automationId: autoA.id,
      productId: productA.id
    });
    console.log(`[✓] Signed attribution token generated: ${validRefToken.slice(0, 30)}...`);

    const verifiedAttr = attributionService.verifyAttributionToken(validRefToken);
    console.log(`[✓] Verified payload: creator=${verifiedAttr.creatorId}, auto=${verifiedAttr.automationId}, prod=${verifiedAttr.productId}`);

    // Test tampered token
    const tamperedToken = validRefToken.slice(0, -5) + 'xxxxx';
    const tamperedResult = attributionService.verifyAttributionToken(tamperedToken);
    if (tamperedResult !== null) {
      console.error('[✗] ATTRIBUTION SECURITY FAILURE! Tampered token was accepted!');
      process.exit(1);
    }
    console.log('[✓] Security Enforcement Verified: Tampered attribution token rejected!');

    // Test Cross-Creator attribution token (Token created for Creator B, used on Creator A product)
    const crossCreatorToken = attributionService.generateAttributionToken({
      creatorId: creatorB.id,
      automationId: uuidv4(),
      productId: productB.id
    });

    const checkoutSessionCross = await checkoutService.createSession({
      productId: productA.id,
      customerEmail: 'buyer@example.com',
      customerName: 'Test Buyer',
      ref: crossCreatorToken
    });

    if (checkoutSessionCross.order.automationId !== null && checkoutSessionCross.order.automationId !== undefined) {
      console.error('[✗] ATTRIBUTION HIJACKING! Cross-creator token bound automationId to order!');
      process.exit(1);
    }
    console.log('[✓] Security Enforcement Verified: Cross-creator attribution token rejected during checkout!');

    // 9. TEST: Full Attribution & Analytics Conversion Flow
    console.log('\n--- 4. Testing End-to-End Attribution & Real Analytics ---');
    
    // Step A: Record COMMENT_RECEIVED & DM_SENT
    await automationEventsRepo.recordEvent({
      creatorId: creatorA.id,
      automationId: autoA.id,
      productId: productA.id,
      commentId: `comment_${Date.now()}`,
      eventType: 'COMMENT_RECEIVED',
      status: 'SUCCESS',
      metadata: { username: 'test_fan', commentText: 'PLAYBOOK' }
    });

    await automationEventsRepo.recordEvent({
      creatorId: creatorA.id,
      automationId: autoA.id,
      productId: productA.id,
      eventType: 'DM_SENT',
      status: 'SUCCESS',
      metadata: { username: 'test_fan' }
    });

    // Step B: Record LINK_CLICKED
    await automationEventsRepo.recordEvent({
      creatorId: creatorA.id,
      automationId: autoA.id,
      productId: productA.id,
      eventType: 'LINK_CLICKED',
      status: 'SUCCESS'
    });

    // Step C: Checkout with Valid Signed Token
    const checkoutSessionValid = await checkoutService.createSession({
      productId: productA.id,
      customerEmail: 'buyer_paid@example.com',
      customerName: 'Paid Buyer',
      ref: validRefToken
    });

    if (checkoutSessionValid.order.automationId !== autoA.id) {
      console.error('[✗] Valid attribution failed to bind automationId to order!');
      process.exit(1);
    }
    console.log(`[✓] Checkout session created & bound to automationId: ${checkoutSessionValid.order.automationId}`);

    // Step D: Finalize Payment (Simulate Razorpay webhook completion)
    const paidOrder = await webhookService.finalizeOrder(
      checkoutSessionValid.order.id,
      `pay_${Date.now()}`,
      'buyer_paid@example.com'
    );
    console.log(`[✓] Payment finalized for Order ${paidOrder.id}. Status: ${paidOrder.status}`);

    // Step E: Fetch Automation Performance Metrics
    const updatedAuto = await automationService.getAutomation(autoA.id, creatorA.id);
    console.log('\n--- Automation Performance Metrics ---');
    console.log(JSON.stringify(updatedAuto.metrics, null, 2));

    if (updatedAuto.metrics.comments !== 1) throw new Error(`Expected comments = 1, got ${updatedAuto.metrics.comments}`);
    if (updatedAuto.metrics.dmsSent !== 1) throw new Error(`Expected dmsSent = 1, got ${updatedAuto.metrics.dmsSent}`);
    if (updatedAuto.metrics.clicks !== 1) throw new Error(`Expected clicks = 1, got ${updatedAuto.metrics.clicks}`);
    if (updatedAuto.metrics.checkouts !== 1) throw new Error(`Expected checkouts = 1, got ${updatedAuto.metrics.checkouts}`);
    if (updatedAuto.metrics.purchases !== 1) throw new Error(`Expected purchases = 1, got ${updatedAuto.metrics.purchases}`);
    if (updatedAuto.metrics.revenue !== 499) throw new Error(`Expected revenue = 499, got ${updatedAuto.metrics.revenue}`);

    console.log('[✓] ALL METRICS DERIVED ACCURATELY FROM DATABASE RECORDS!');

    // Step F: Fetch Creator Overview Analytics
    const overview = await analyticsService.overview(creatorA.id, 30);
    console.log('\n--- Creator Overview Analytics ---');
    console.log(JSON.stringify(overview.instagram, null, 2));

    if (overview.instagram.purchases !== 1) throw new Error(`Expected IG overview purchases = 1, got ${overview.instagram.purchases}`);
    if (overview.instagram.revenue !== 499) throw new Error(`Expected IG overview revenue = 499, got ${overview.instagram.revenue}`);

    console.log('\n' + '='.repeat(70));
    console.log('ALL PHASE 4 HARDENING, SECURITY, AND ANALYTICS TESTS PASSED!');
    console.log('='.repeat(70));

  } catch (err) {
    console.error('\n[✗] TEST FAILURE:', err);
    process.exit(1);
  } finally {
    if (prisma && typeof prisma.$disconnect === 'function') {
      await prisma.$disconnect();
    }
    process.exit(0);
  }
}

runTests();
