/**
 * Centralized Server-Side Billing Configuration
 *
 * Enforces server-authoritative billing parameters for India (INR) and International (USD) flows.
 *
 * Rules:
 * - Server determines provider, currency, amount, plan, and billing cycle.
 * - Client submits only: plan, billingCycle/interval, and region.
 * - Client-submitted amount, currency, and provider are NEVER trusted.
 */

export const BILLING_REGIONS = {
  INDIA: 'INDIA',
  INTERNATIONAL: 'INTERNATIONAL',
}

export const BILLING_PROVIDERS = {
  DODO: 'dodo',
  RAZORPAY: 'razorpay',
  PAYPAL: 'paypal',
}

export const BILLING_CURRENCIES = {
  INR: 'INR',
  USD: 'USD',
}

/**
 * Normalizes user-supplied region string.
 * Defaults to INTERNATIONAL (USD) for standardized global pricing.
 */
export function normalizeRegion(regionInput) {
  if (!regionInput) return BILLING_REGIONS.INTERNATIONAL
  const str = String(regionInput).toUpperCase().trim()

  if (
    str === 'IN' ||
    str === 'IND' ||
    str === 'INDIA' ||
    str === 'DOMESTIC'
  ) {
    return BILLING_REGIONS.INDIA
  }

  if (
    str === 'INT' ||
    str === 'INTL' ||
    str === 'INTERNATIONAL' ||
    str === 'OUTSIDE_INDIA' ||
    str === 'OUTSIDE INDIA' ||
    str === 'GLOBAL' ||
    str === 'ROW' ||
    str === 'US' ||
    str === 'USA'
  ) {
    return BILLING_REGIONS.INTERNATIONAL
  }

  return BILLING_REGIONS.INTERNATIONAL
}

/**
 * Canonical plan IDs
 */
export const PLAN_KEYS = {
  CREATOR: 'CREATOR',
  PRO: 'PRO',
}

/**
 * Server-authoritative billing catalog.
 *
 * Canonical Prices:
 * INDIA (INR):
 * - CREATOR: Monthly ₹499 | Annual ₹4,790 (20% off ₹5,988)
 * - PRO: Monthly ₹999 | Annual ₹9,590 (20% off ₹11,988)
 *
 * OUTSIDE INDIA (USD):
 * - CREATOR: Monthly $6 | Annual $58 (20% off $72)
 * - PRO: Monthly $12 | Annual $115 (20% off $144)
 */
export function getBillingCatalog() {
  const envCreatorInr = (typeof process !== 'undefined' && process.env)
    ? Number(process.env.CREATOR_PLAN_PRICE || process.env.CREATOR_PLAN_PRICE_INR || 499)
    : 499
  const creatorMonthlyInr = (!isNaN(envCreatorInr) && envCreatorInr > 0) ? envCreatorInr : 499

  const envProInr = (typeof process !== 'undefined' && process.env)
    ? Number(process.env.PRO_PLAN_PRICE || process.env.PRO_PLAN_PRICE_INR || 999)
    : 999
  const proMonthlyInr = (!isNaN(envProInr) && envProInr > 0) ? envProInr : 999

  const creatorAnnualInr = 4790
  const proAnnualInr = 9590

  // USD canonical pricing
  const creatorMonthlyUsd = 6
  const creatorAnnualUsd = 58
  const proMonthlyUsd = 12
  const proAnnualUsd = 115

  // Dodo Product Identifiers
  const dodoCreatorInrMonthlyProductId = ((typeof process !== 'undefined' && process.env && process.env.DODO_PRODUCT_CREATOR_INR_MONTHLY_ID) || 'pdt_0Npr1OkJpjUoI3QGIcfpN').replace(/^["']|["']$/g, '').trim()
  const dodoCreatorInrAnnualProductId = ((typeof process !== 'undefined' && process.env && process.env.DODO_PRODUCT_CREATOR_INR_ANNUAL_ID) || 'pdt_0Npr1TPj3jLkccDnHD0qG').replace(/^["']|["']$/g, '').trim()
  const dodoProInrMonthlyProductId = ((typeof process !== 'undefined' && process.env && process.env.DODO_PRODUCT_PRO_INR_MONTHLY_ID) || 'pdt_0Npr1TQvpN3wjhmxI9i8B').replace(/^["']|["']$/g, '').trim()
  const dodoProInrAnnualProductId = ((typeof process !== 'undefined' && process.env && process.env.DODO_PRODUCT_PRO_INR_ANNUAL_ID) || 'pdt_0Npr1TSDutgJhg6IhLy3I').replace(/^["']|["']$/g, '').trim()

  const dodoCreatorUsdMonthlyProductId = ((typeof process !== 'undefined' && process.env && process.env.DODO_PRODUCT_CREATOR_MONTHLY_ID) || 'pdt_0Npr1TTLQxbN2SyyZFuuk').replace(/^["']|["']$/g, '').trim()
  const dodoCreatorUsdAnnualProductId = ((typeof process !== 'undefined' && process.env && process.env.DODO_PRODUCT_CREATOR_ANNUAL_ID) || 'pdt_0Npr1TUSAwDv7UwBM7MtZ').replace(/^["']|["']$/g, '').trim()
  const dodoProUsdMonthlyProductId = ((typeof process !== 'undefined' && process.env && process.env.DODO_PRODUCT_PRO_MONTHLY_ID) || 'pdt_0Npr1TVXPzU3U6cXTAX8Y').replace(/^["']|["']$/g, '').trim()
  const dodoProUsdAnnualProductId = ((typeof process !== 'undefined' && process.env && process.env.DODO_PRODUCT_PRO_ANNUAL_ID) || 'pdt_0Npr1TWhB4cSL9GO1CYKJ').replace(/^["']|["']$/g, '').trim()

  const rzpCreatorInrMonthlyPlanId = ((typeof process !== 'undefined' && process.env && process.env.RAZORPAY_CREATOR_PLAN_ID) || 'plan_TpJZAJytKRsviK').trim()
  const rzpCreatorInrAnnualPlanId = (typeof process !== 'undefined' && process.env && process.env.RAZORPAY_CREATOR_ANNUAL_PLAN_ID) ? process.env.RAZORPAY_CREATOR_ANNUAL_PLAN_ID.trim() : null
  const rzpProInrMonthlyPlanId = ((typeof process !== 'undefined' && process.env && process.env.RAZORPAY_PRO_PLAN_ID) || 'plan_TpJmVECUaYFWXf').trim()
  const rzpProInrAnnualPlanId = (typeof process !== 'undefined' && process.env && process.env.RAZORPAY_PRO_ANNUAL_PLAN_ID) ? process.env.RAZORPAY_PRO_ANNUAL_PLAN_ID.trim() : null

  const rzpCreatorUsdMonthlyPlanId = process.env.RAZORPAY_CREATOR_USD_PLAN_ID || null
  const rzpCreatorUsdAnnualPlanId = process.env.RAZORPAY_CREATOR_USD_ANNUAL_PLAN_ID || null
  const rzpProUsdMonthlyPlanId = process.env.RAZORPAY_PRO_USD_PLAN_ID || null
  const rzpProUsdAnnualPlanId = process.env.RAZORPAY_PRO_USD_ANNUAL_PLAN_ID || null

  const payPalCreatorMonthlyPlanId = process.env.PAYPAL_CREATOR_MONTHLY_PLAN_ID || 'P-06L05256BW4479128NLFBZCA'
  const payPalCreatorAnnualPlanId = process.env.PAYPAL_CREATOR_ANNUAL_PLAN_ID || null
  const payPalProMonthlyPlanId = process.env.PAYPAL_PRO_MONTHLY_PLAN_ID || 'P-19001753VV158844WNLFB3ZA'
  const payPalProAnnualPlanId = process.env.PAYPAL_PRO_ANNUAL_PLAN_ID || null

  return {
    [PLAN_KEYS.CREATOR]: {
      name: 'Creator',
      [BILLING_REGIONS.INDIA]: {
        monthly: {
          provider: BILLING_PROVIDERS.RAZORPAY,
          dodoProductId: dodoCreatorInrMonthlyProductId,
          currency: BILLING_CURRENCIES.INR,
          currencySymbol: '₹',
          amount: creatorMonthlyInr,
          amountSmallestUnit: Math.round(creatorMonthlyInr * 100),
          planIdRazorpay: rzpCreatorInrMonthlyPlanId,
          flowType: 'subscription',
          isRecurring: true,
          renewalType: 'AUTO_RENEWING',
          billingNotice: 'Auto-renews monthly until cancelled. Cancel anytime in billing settings.',
          priceFormatted: `₹${creatorMonthlyInr.toLocaleString('en-IN')}`,
          periodLabel: '/mo',
          paymentMethodsDescription: 'UPI, Cards, Netbanking, Apple Pay, Google Pay',
        },
        annual: {
          provider: BILLING_PROVIDERS.RAZORPAY,
          dodoProductId: dodoCreatorInrAnnualProductId,
          currency: BILLING_CURRENCIES.INR,
          currencySymbol: '₹',
          amount: creatorAnnualInr,
          amountSmallestUnit: Math.round(creatorAnnualInr * 100),
          planIdRazorpay: rzpCreatorInrAnnualPlanId,
          flowType: 'subscription',
          isRecurring: true,
          renewalType: 'AUTO_RENEWING',
          billingNotice: 'Auto-renews annually until cancelled. Cancel anytime in billing settings.',
          priceFormatted: `₹${creatorAnnualInr.toLocaleString('en-IN')}`,
          periodLabel: '/year',
          originalPriceFormatted: `₹${(creatorMonthlyInr * 12).toLocaleString('en-IN')}`,
          discountPercent: 20,
          paymentMethodsDescription: 'UPI, Cards, Netbanking, Apple Pay, Google Pay',
        },
      },
      [BILLING_REGIONS.INTERNATIONAL]: {
        monthly: {
          provider: BILLING_PROVIDERS.DODO,
          dodoProductId: dodoCreatorUsdMonthlyProductId,
          currency: BILLING_CURRENCIES.USD,
          currencySymbol: '$',
          amount: creatorMonthlyUsd,
          amountSmallestUnit: Math.round(creatorMonthlyUsd * 100), // cents
          planIdPayPal: payPalCreatorMonthlyPlanId,
          planIdRazorpay: rzpCreatorUsdMonthlyPlanId,
          flowType: 'subscription',
          isRecurring: true,
          renewalType: 'AUTO_RENEWING',
          billingNotice: 'Auto-renews monthly ($6/mo). Cancel anytime in billing settings.',
          priceFormatted: `$${creatorMonthlyUsd}`,
          periodLabel: '/mo',
          paymentMethodsDescription: 'Cards, Apple Pay, Google Pay, Global Methods',
        },
        annual: {
          provider: BILLING_PROVIDERS.DODO,
          dodoProductId: dodoCreatorUsdAnnualProductId,
          currency: BILLING_CURRENCIES.USD,
          currencySymbol: '$',
          amount: creatorAnnualUsd,
          amountSmallestUnit: Math.round(creatorAnnualUsd * 100), // cents
          planIdPayPal: payPalCreatorAnnualPlanId,
          planIdRazorpay: rzpCreatorUsdAnnualPlanId,
          flowType: 'subscription',
          isRecurring: true,
          renewalType: 'AUTO_RENEWING',
          billingNotice: 'Auto-renews annually ($58/year with 20% discount). Cancel anytime.',
          priceFormatted: `$${creatorAnnualUsd}`,
          periodLabel: '/year',
          originalPriceFormatted: `$${creatorMonthlyUsd * 12}`,
          discountPercent: 20,
          paymentMethodsDescription: 'Cards, Apple Pay, Google Pay, Global Methods',
        },
      },
    },
    [PLAN_KEYS.PRO]: {
      name: 'Pro',
      [BILLING_REGIONS.INDIA]: {
        monthly: {
          provider: BILLING_PROVIDERS.RAZORPAY,
          dodoProductId: dodoProInrMonthlyProductId,
          currency: BILLING_CURRENCIES.INR,
          currencySymbol: '₹',
          amount: proMonthlyInr,
          amountSmallestUnit: Math.round(proMonthlyInr * 100),
          planIdRazorpay: rzpProInrMonthlyPlanId,
          flowType: 'subscription',
          isRecurring: true,
          renewalType: 'AUTO_RENEWING',
          billingNotice: 'Auto-renews monthly until cancelled. Cancel anytime in billing settings.',
          priceFormatted: `₹${proMonthlyInr.toLocaleString('en-IN')}`,
          periodLabel: '/mo',
          paymentMethodsDescription: 'UPI, Cards, Netbanking, Apple Pay, Google Pay',
        },
        annual: {
          provider: BILLING_PROVIDERS.RAZORPAY,
          dodoProductId: dodoProInrAnnualProductId,
          currency: BILLING_CURRENCIES.INR,
          currencySymbol: '₹',
          amount: proAnnualInr,
          amountSmallestUnit: Math.round(proAnnualInr * 100),
          planIdRazorpay: rzpProInrAnnualPlanId,
          flowType: 'subscription',
          isRecurring: true,
          renewalType: 'AUTO_RENEWING',
          billingNotice: 'Auto-renews annually until cancelled. Cancel anytime in billing settings.',
          priceFormatted: `₹${proAnnualInr.toLocaleString('en-IN')}`,
          periodLabel: '/year',
          originalPriceFormatted: `₹${(proMonthlyInr * 12).toLocaleString('en-IN')}`,
          discountPercent: 20,
          paymentMethodsDescription: 'UPI, Cards, Netbanking, Apple Pay, Google Pay',
        },
      },
      [BILLING_REGIONS.INTERNATIONAL]: {
        monthly: {
          provider: BILLING_PROVIDERS.DODO,
          dodoProductId: dodoProUsdMonthlyProductId,
          currency: BILLING_CURRENCIES.USD,
          currencySymbol: '$',
          amount: proMonthlyUsd,
          amountSmallestUnit: Math.round(proMonthlyUsd * 100), // cents
          planIdPayPal: payPalProMonthlyPlanId,
          planIdRazorpay: rzpProUsdMonthlyPlanId,
          flowType: 'subscription',
          isRecurring: true,
          renewalType: 'AUTO_RENEWING',
          billingNotice: 'Auto-renews monthly ($12/mo). Cancel anytime in billing settings.',
          priceFormatted: `$${proMonthlyUsd}`,
          periodLabel: '/mo',
          paymentMethodsDescription: 'Cards, Apple Pay, Google Pay, Global Methods',
        },
        annual: {
          provider: BILLING_PROVIDERS.DODO,
          dodoProductId: dodoProUsdAnnualProductId,
          currency: BILLING_CURRENCIES.USD,
          currencySymbol: '$',
          amount: proAnnualUsd,
          amountSmallestUnit: Math.round(proAnnualUsd * 100), // cents
          planIdPayPal: payPalProAnnualPlanId,
          planIdRazorpay: rzpProUsdAnnualPlanId,
          flowType: 'subscription',
          isRecurring: true,
          renewalType: 'AUTO_RENEWING',
          billingNotice: 'Auto-renews annually ($115/year with 20% discount). Cancel anytime.',
          priceFormatted: `$${proAnnualUsd}`,
          periodLabel: '/year',
          originalPriceFormatted: `$${proMonthlyUsd * 12}`,
          discountPercent: 20,
          paymentMethodsDescription: 'Cards, Apple Pay, Google Pay, Global Methods',
        },
      },
    },
  }
}

/**
 * Resolves the billing configuration on the server.
 * Completely immune to client-side price tampering.
 */
export function resolveBillingConfig({ plan = 'PRO', interval = 'monthly', region = 'INTERNATIONAL' } = {}) {
  const normPlan = String(plan || 'PRO').toUpperCase().trim()
  const effectivePlan = normPlan === 'CREATOR' || normPlan === 'CREATOR_MONTHLY'
    ? PLAN_KEYS.CREATOR
    : PLAN_KEYS.PRO

  const normInterval = String(interval || 'monthly').toLowerCase().trim() === 'annual' || String(interval || '').toLowerCase().trim() === 'yearly'
    ? 'annual'
    : 'monthly'

  const effectiveRegion = normalizeRegion(region)
  const catalog = getBillingCatalog()
  const planCatalog = catalog[effectivePlan]
  const regionConfig = planCatalog[effectiveRegion]
  const targetConfig = regionConfig[normInterval]

  const isAnnual = normInterval === 'annual'

  return {
    planId: effectivePlan,
    planName: planCatalog.name,
    billingInterval: isAnnual ? 'ANNUAL' : 'MONTHLY',
    intervalKey: normInterval,
    isAnnual,
    region: effectiveRegion,
    provider: targetConfig.provider || BILLING_PROVIDERS.DODO,
    dodoProductId: targetConfig.dodoProductId,
    currency: targetConfig.currency,
    currencySymbol: targetConfig.currencySymbol,
    amount: targetConfig.amount,
    amountSmallestUnit: targetConfig.amountSmallestUnit,
    planIdPayPal: targetConfig.planIdPayPal || null,
    planIdRazorpay: targetConfig.planIdRazorpay,
    flowType: targetConfig.flowType,
    isRecurring: targetConfig.isRecurring,
    renewalType: targetConfig.renewalType,
    billingNotice: targetConfig.billingNotice,
    priceFormatted: targetConfig.priceFormatted,
    periodLabel: targetConfig.periodLabel,
    paymentMethodsDescription: targetConfig.paymentMethodsDescription,
    discountPercent: targetConfig.discountPercent || null,
    originalPriceFormatted: targetConfig.originalPriceFormatted || null,
  }
}
