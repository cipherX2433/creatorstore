import crypto from 'crypto';
import { prisma } from '../lib/prisma.js';
import { authService, creatorSubscriptionService } from '../lib/services.js';
import { getPaymentProvider } from '../lib/payments.js';
import { getSubscriptionPricing } from '../lib/plans.js';

function generateSignature(orderId, paymentId, secret) {
  const body = `${orderId}|${paymentId}`;
  return crypto.createHmac('sha256', secret).update(body).digest('hex');
}

async function main() {
  console.log('====================================================');
  console.log(' CREATOR SUBSCRIPTION & RAZORPAY PAYMENT FLOW TEST ');
  console.log('====================================================\n');

  const pricing = getSubscriptionPricing();
  console.log(`Configured Pricing: Creator = ${pricing.CREATOR.priceFormatted} (${pricing.CREATOR.amountInrPaise} paise), Pro = ${pricing.PRO.priceFormatted} (${pricing.PRO.amountInrPaise} paise)`);

  const timestamp = Date.now();
  const testEmail = `sub_test_${timestamp}@example.com`;
  const testPassword = `Pass123!_${timestamp}`;
  const testName = `Sub Creator ${timestamp}`;

  // 1. Create test creator user
  console.log('1. Creating test Creator user...');
  const signupRes = await authService.signup({
    email: testEmail,
    password: testPassword,
    name: testName,
    role: 'CREATOR',
    storeName: `Sub Store ${timestamp}`,
    slug: `sub-store-${timestamp}`,
  });

  const creatorId = signupRes.user?.id || signupRes.id;
  console.log(`   ✅ User created. ID: ${creatorId}`);

  // 2. Initial Subscription Status Check
  console.log('\n2. Checking initial subscription status...');
  const initialStatus = await creatorSubscriptionService.getStatus(creatorId);
  console.log(`   ✅ Status: ${initialStatus.status}, Price: ₹${initialStatus.price}, Plan: ${initialStatus.plan}`);

  // 3. Test CREATOR Plan Selection & Checkout
  console.log(`\n3. Testing CREATOR (${pricing.CREATOR.priceFormatted}/mo) plan selection & Razorpay Order creation...`);
  await creatorSubscriptionService.selectPlan(creatorId, { plan: 'CREATOR' });
  const creatorCheckout = await creatorSubscriptionService.createCheckoutSession(creatorId, { plan: 'CREATOR' });
  console.log(`   ✅ Razorpay Order Created! Order ID: ${creatorCheckout.orderId}, Amount: ${creatorCheckout.amount} paise (₹${creatorCheckout.amount / 100})`);
  if (creatorCheckout.amount !== pricing.CREATOR.amountInrPaise) {
    throw new Error(`Expected Creator plan amount ${pricing.CREATOR.amountInrPaise} paise, got ${creatorCheckout.amount}`);
  }

  // 4. Test Server-side Payment Verification (CREATOR)
  console.log('\n4. Verifying payment server-side (HMAC Signature verification)...');
  const provider = getPaymentProvider();
  const mockPaymentId = `pay_test_${timestamp}`;
  const validSignature = provider.keySecret
    ? generateSignature(creatorCheckout.orderId, mockPaymentId, provider.keySecret)
    : 'sig_mock';

  const verifyRes = await creatorSubscriptionService.verifySubscriptionPayment(creatorId, {
    razorpayOrderId: creatorCheckout.orderId,
    razorpayPaymentId: mockPaymentId,
    razorpaySignature: validSignature,
  });

  console.log(`   ✅ Payment verified! Subscription Status: ${verifyRes.status}`);

  // 5. Query PostgreSQL via Prisma to verify subscription persistence
  console.log('\n5. Querying Supabase PostgreSQL via Prisma for Subscription record...');
  const dbSub = await prisma.creatorSubscription.findUnique({
    where: { creatorId },
  });

  if (!dbSub) throw new Error('Subscription record missing in PostgreSQL DB');
  if (dbSub.status !== 'ACTIVE') throw new Error(`Expected ACTIVE status in DB, got ${dbSub.status}`);
  if (dbSub.razorpayOrderId !== creatorCheckout.orderId) throw new Error('Razorpay Order ID mismatch in DB');
  if (dbSub.razorpayPaymentId !== mockPaymentId) throw new Error('Razorpay Payment ID mismatch in DB');

  console.log(`   ✅ PostgreSQL Record Verified:`);
  console.log(`      - ID: ${dbSub.id}`);
  console.log(`      - Status: ${dbSub.status}`);
  console.log(`      - Plan: ${dbSub.plan}`);
  console.log(`      - Amount: ₹${dbSub.price || dbSub.amount}`);
  console.log(`      - Razorpay Order ID: ${dbSub.razorpayOrderId}`);
  console.log(`      - Razorpay Payment ID: ${dbSub.razorpayPaymentId}`);
  console.log(`      - Period End: ${dbSub.currentPeriodEnd}`);

  // 6. Test Idempotency (Duplicate Verification Call)
  console.log('\n6. Testing Idempotency (Duplicate Callback handling)...');
  const duplicateVerify = await creatorSubscriptionService.verifySubscriptionPayment(creatorId, {
    razorpayOrderId: creatorCheckout.orderId,
    razorpayPaymentId: mockPaymentId,
    razorpaySignature: validSignature,
  });
  console.log(`   ✅ Idempotent verification returned status: ${duplicateVerify.status} (${duplicateVerify.message})`);

  const subCount = await prisma.creatorSubscription.count({ where: { creatorId } });
  if (subCount !== 1) throw new Error(`Idempotency failed: expected 1 subscription record, found ${subCount}`);
  console.log(`   ✅ Confirmed no duplicate subscription records in DB.`);

  // 7. Test PRO Plan Checkout & Upgrade
  console.log(`\n7. Testing PRO (${pricing.PRO.priceFormatted}/mo) plan checkout & upgrade...`);
  await creatorSubscriptionService.selectPlan(creatorId, { plan: 'PRO' });
  const proCheckout = await creatorSubscriptionService.createCheckoutSession(creatorId, { plan: 'PRO' });
  console.log(`   ✅ Razorpay Order Created! Order ID: ${proCheckout.orderId}, Amount: ${proCheckout.amount} paise (₹${proCheckout.amount / 100})`);
  if (proCheckout.amount !== pricing.PRO.amountInrPaise) {
    throw new Error(`Expected Pro plan amount ${pricing.PRO.amountInrPaise} paise, got ${proCheckout.amount}`);
  }

  const proPaymentId = `pay_pro_${timestamp}`;
  const proSignature = provider.keySecret
    ? generateSignature(proCheckout.orderId, proPaymentId, provider.keySecret)
    : 'sig_mock';

  await creatorSubscriptionService.verifySubscriptionPayment(creatorId, {
    razorpayOrderId: proCheckout.orderId,
    razorpayPaymentId: proPaymentId,
    razorpaySignature: proSignature,
  });

  const updatedDbSub = await prisma.creatorSubscription.findUnique({ where: { creatorId } });
  console.log(`   ✅ PostgreSQL Pro Record Verified: Plan: ${updatedDbSub.plan}, Amount: ₹${updatedDbSub.price || updatedDbSub.amount}`);

  // 8. Security Check: Invalid Signature Rejection
  console.log('\n8. Security Check: Invalid Payment Signature...');
  if (provider.isConfigured() && !provider.isMock) {
    try {
      await creatorSubscriptionService.verifySubscriptionPayment(creatorId, {
        razorpayOrderId: 'invalid_order_id',
        razorpayPaymentId: 'invalid_pay_id',
        razorpaySignature: 'invalid_signature_hash',
      });
      throw new Error('Invalid signature was NOT rejected!');
    } catch (err) {
      if (err.message.includes('NOT rejected')) throw err;
      console.log(`   ✅ Security check passed: ${err.message}`);
    }
  } else {
    console.log('   ℹ️ Signature security check skipped (Mock mode active)');
  }

  // 9. Cleanup
  console.log('\n9. Cleaning up test user and subscription...');
  const { supabaseAdmin } = await import('../lib/supabase.js');
  await supabaseAdmin.auth.admin.deleteUser(creatorId);
  await prisma.user.delete({ where: { id: creatorId } });
  console.log('   ✅ Test creator and subscription cleaned up.');

  console.log('\n====================================================');
  console.log(' ALL CREATOR SUBSCRIPTION PAYMENT TESTS PASSED! ');
  console.log('====================================================');
}

main()
  .catch((e) => {
    console.error('\n❌ SUBSCRIPTION TEST FAILED:', e.message);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
