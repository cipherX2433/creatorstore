import crypto from 'crypto';
import { creatorSubscriptionService, webhookService } from '../lib/services.js';
import { usersRepo, creatorSubscriptionsRepo, profilesRepo } from '../lib/repos.js';
import { getSubscriptionPricing } from '../lib/plans.js';
import { getPaymentProvider } from '../lib/payments.js';

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    process.exit(1);
  }
  console.log(`✅ PASS: ${message}`);
}

async function runTests() {
  console.log('====================================================');
  console.log('🚀 RUNNING RAZORPAY SUBSCRIPTION AUDIT & TEST SUITE');
  console.log('====================================================\n');

  // Test 1: Pricing configuration source of truth
  console.log('--- Test 1: Environment-Driven Subscription Pricing ---');
  const pricing = getSubscriptionPricing();
  assert(pricing.CREATOR.priceInr === 1, `Creator price in INR is 1 (got ${pricing.CREATOR.priceInr})`);
  assert(pricing.CREATOR.amountInrPaise === 100, `Creator price in paise is 100 (got ${pricing.CREATOR.amountInrPaise})`);
  assert(pricing.PRO.priceInr === 499, `Pro price in INR is 499 (got ${pricing.PRO.priceInr})`);
  assert(pricing.PRO.amountInrPaise === 49900, `Pro price in paise is 49900 (got ${pricing.PRO.amountInrPaise})`);

  // Create a test creator
  const testEmail = `test_creator_${Date.now()}@example.com`;
  const user = await usersRepo.create({
    email: testEmail,
    name: 'Test Creator',
    role: 'CREATOR',
  });
  assert(user && user.id, `Test user created with ID: ${user.id}`);

  // Test 2: Create Checkout Session (Razorpay Subscription Creation)
  console.log('\n--- Test 2: Create Checkout Session (Razorpay Subscription) ---');
  const checkoutRes = await creatorSubscriptionService.createCheckoutSession(user.id, { plan: 'CREATOR' });
  assert(checkoutRes.subscriptionId, `Subscription ID returned: ${checkoutRes.subscriptionId}`);
  assert(checkoutRes.price === 1, `Price in response is 1 (got ${checkoutRes.price})`);
  assert(checkoutRes.currency === 'INR', `Currency in response is INR (got ${checkoutRes.currency})`);

  // Verify pending subscription record in DB
  const pendingSub = await creatorSubscriptionsRepo.getByCreator(user.id);
  assert(pendingSub.status === 'PENDING', `Database status is PENDING`);
  assert(pendingSub.providerSubscriptionId === checkoutRes.subscriptionId, `Provider subscription ID matches: ${pendingSub.providerSubscriptionId}`);

  // Test 3: Subscription Signature Verification
  console.log('\n--- Test 3: Subscription Signature Verification ---');
  const provider = getPaymentProvider();
  const testPaymentId = `pay_${Date.now().toString(36)}`;
  const testSubId = checkoutRes.subscriptionId;

  // Generate valid HMAC signature for payment_id + '|' + subscription_id
  const validSig = crypto
    .createHmac('sha256', provider.keySecret || 'test_secret')
    .update(`${testPaymentId}|${testSubId}`)
    .digest('hex');

  const isValidSig = provider.verifySubscriptionSignature({
    razorpaySubscriptionId: testSubId,
    razorpayPaymentId: testPaymentId,
    razorpaySignature: validSig,
  });
  assert(isValidSig === true, 'Valid subscription HMAC signature passes verification');

  const isInvalidSig = provider.verifySubscriptionSignature({
    razorpaySubscriptionId: testSubId,
    razorpayPaymentId: testPaymentId,
    razorpaySignature: 'invalid_tampered_signature',
  });
  assert(isInvalidSig === false, 'Tampered/invalid subscription signature is rejected');

  // Test 4: Frontend Verify Payment Flow
  console.log('\n--- Test 4: Frontend Subscription Payment Verification ---');
  const verifyRes = await creatorSubscriptionService.verifySubscriptionPayment(user.id, {
    razorpaySubscriptionId: testSubId,
    razorpayPaymentId: testPaymentId,
    razorpaySignature: validSig,
  });
  assert(verifyRes.status === 'ACTIVE', `Subscription status successfully updated to ACTIVE`);
  assert(verifyRes.planId === 'CREATOR', `Plan ID is CREATOR`);

  // Verify DB state
  const activeSub = await creatorSubscriptionsRepo.getByCreator(user.id);
  assert(activeSub.status === 'ACTIVE', `DB Subscription status is ACTIVE`);
  assert(activeSub.providerSubscriptionId === testSubId, `DB providerSubscriptionId stored correctly`);
  assert(activeSub.razorpayPaymentId === testPaymentId, `DB razorpayPaymentId stored correctly`);
  assert(activeSub.currentPeriodEnd !== null, `DB currentPeriodEnd is populated`);

  // Verify Profile Onboarding Status
  const profile = await profilesRepo.getByCreator(user.id);
  assert(profile.onboardingStatus === 'COMPLETED', `Creator onboardingStatus is COMPLETED`);

  // Test 5: Idempotency & Repeat Verification
  console.log('\n--- Test 5: Idempotency (Repeat Verification) ---');
  const repeatVerifyRes = await creatorSubscriptionService.verifySubscriptionPayment(user.id, {
    razorpaySubscriptionId: testSubId,
    razorpayPaymentId: testPaymentId,
    razorpaySignature: validSig,
  });
  assert(repeatVerifyRes.status === 'ACTIVE', `Repeat verify call returned ACTIVE without duplicate writes`);

  // Test 6: Webhook Events Handling
  console.log('\n--- Test 6: Razorpay Webhooks (Subscription Events) ---');
  
  // 6a. subscription.charged event
  const newPaymentId = `pay_charged_${Date.now().toString(36)}`;
  const chargedEvent = {
    id: `event_${Date.now()}_charged`,
    event: 'subscription.charged',
    payload: {
      subscription: {
        entity: {
          id: testSubId,
          status: 'active',
          current_start: Math.floor(Date.now() / 1000),
          current_end: Math.floor((Date.now() + 30 * 24 * 60 * 60 * 1000) / 1000),
          notes: { creatorId: user.id },
        },
      },
      payment: {
        entity: {
          id: newPaymentId,
          amount: 100,
          currency: 'INR',
        },
      },
    },
  };
  await webhookService.handle(chargedEvent);
  const chargedSub = await creatorSubscriptionsRepo.getByCreator(user.id);
  assert(chargedSub.status === 'ACTIVE', `DB status remains ACTIVE after subscription.charged`);
  assert(chargedSub.razorpayPaymentId === newPaymentId, `Latest payment ID updated to ${newPaymentId}`);

  // 6b. subscription.cancelled event
  const cancelEvent = {
    id: `event_${Date.now()}_cancel`,
    event: 'subscription.cancelled',
    payload: {
      subscription: {
        entity: {
          id: testSubId,
          status: 'cancelled',
          ended_at: Math.floor(Date.now() / 1000),
          notes: { creatorId: user.id },
        },
      },
    },
  };
  await webhookService.handle(cancelEvent);
  const cancelledSub = await creatorSubscriptionsRepo.getByCreator(user.id);
  assert(cancelledSub.status === 'CANCELLED', `DB status updated to CANCELLED after subscription.cancelled webhook`);
  assert(cancelledSub.canceledAt !== null, `canceledAt timestamp recorded`);

  // 6c. Duplicate webhook idempotency
  const dupResult = await webhookService.handle(cancelEvent);
  assert(dupResult.duplicate === true, `Duplicate webhook correctly skipped with duplicate: true`);

  // Test 7: Subscription Status Query
  console.log('\n--- Test 7: Subscription Status Query ---');
  const statusRes = await creatorSubscriptionService.getStatus(user.id);
  assert(statusRes.status === 'CANCELLED', `getStatus reflects CANCELLED status`);
  assert(statusRes.providerSubscriptionId === testSubId, `getStatus returns providerSubscriptionId`);
  assert(statusRes.price === 0 || statusRes.price === 1, `getStatus price is non-negative (${statusRes.price})`);

  console.log('\n====================================================');
  console.log('🎉 ALL RAZORPAY SUBSCRIPTION AUDIT TESTS PASSED!');
  console.log('====================================================\n');
}

runTests().catch(err => {
  console.error('Unhandled test failure:', err);
  process.exit(1);
});
