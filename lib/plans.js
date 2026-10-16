/**
 * CreatorStore Central Entitlement & Pricing Configuration
 *
 * Access Model:
 * - Free Account (Unsubscribed): Explore and preview the dashboard for free.
 * - Paid Plan required to create, publish, sell, collect payments, and activate Instagram AutoDM.
 *
 * Two Paid Plans:
 * 1. CREATOR — Configurable via CREATOR_PLAN_PRICE_INR in .env (default: ₹1/mo)
 * 2. PRO — Configurable via PRO_PLAN_PRICE_INR in .env (default: ₹499/mo)
 */

export const PLAN_IDS = {
  UNSUBSCRIBED: 'UNSUBSCRIBED',
  CREATOR: 'CREATOR',
  PRO: 'PRO',
}

export const ANNUAL_DISCOUNT_PERCENT = 20

export const SUPPORTED_CURRENCIES = {
  INR: {
    code: 'INR',
    symbol: '₹',
    label: '₹ INR',
    name: 'Indian Rupee',
    isBillingCurrency: true,
  },
  USD: {
    code: 'USD',
    symbol: '$',
    label: '$ USD',
    name: 'US Dollar',
    isBillingCurrency: true,
    displayPrices: {
      CREATOR: {
        monthly: 6,
        annual: 58, // 20% off $72 ($57.6 -> $58)
      },
      PRO: {
        monthly: 12,
        annual: 115, // 20% off $144 ($115.2 -> $115)
      },
    },
    billingDisclaimer: 'International checkout is processed in USD via Razorpay with connected PayPal and international cards.',
  },
}

export { BILLING_REGIONS, normalizeRegion, resolveBillingConfig } from './billing/config.js'

/**
 * Resolves subscription pricing configuration from environment variables, target currency, and billing interval.
 * Canonical INR Prices:
 * - CREATOR Monthly: ₹499/mo | Annual: ₹4,790/year (20% off ₹5,988)
 * - PRO Monthly: ₹999/mo | Annual: ₹9,590/year (20% off ₹11,988)
 */
export function getSubscriptionPricing(currency = 'INR', interval = 'monthly') {
  const normCurrency = String(currency || 'INR').toUpperCase().trim()
  const normInterval = String(interval || 'monthly').toLowerCase().trim() === 'annual' || String(interval || '').toLowerCase().trim() === 'yearly'
    ? 'annual'
    : 'monthly'

  const rawCreatorMonthly = (typeof process !== 'undefined' && process.env)
    ? (process.env.CREATOR_PLAN_PRICE ??
       process.env.CREATOR_PLAN_PRICE_INR ??
       process.env.STARTER_PRICE_INR ??
       process.env.CREATOR_PRICE_INR ??
       process.env.NEXT_PUBLIC_CREATOR_PLAN_PRICE_INR ??
       process.env.NEXT_PUBLIC_STARTER_PRICE_INR ??
       '499')
    : '499'

  const rawProMonthly = (typeof process !== 'undefined' && process.env)
    ? (process.env.PRO_PLAN_PRICE ??
       process.env.PRO_PLAN_PRICE_INR ??
       process.env.PRO_PRICE_INR ??
       process.env.NEXT_PUBLIC_PRO_PLAN_PRICE_INR ??
       '999')
    : '999'

  const creatorMonthlyNum = Number(rawCreatorMonthly)
  const proMonthlyNum = Number(rawProMonthly)

  const creatorMonthlyPriceInr = (!isNaN(creatorMonthlyNum) && creatorMonthlyNum > 0) ? creatorMonthlyNum : 499
  const proMonthlyPriceInr = (!isNaN(proMonthlyNum) && proMonthlyNum > 0) ? proMonthlyNum : 999

  // Canonical Annual Calculations (20% off baseline 12 months)
  const creatorAnnualOriginalInr = creatorMonthlyPriceInr * 12 // ₹5,988
  const creatorAnnualPriceInr = 4790 // Canonical ₹4,790/year
  const proAnnualOriginalInr = proMonthlyPriceInr * 12 // ₹11,988
  const proAnnualPriceInr = 9590 // Canonical ₹9,590/year

  const razorpayCreatorMonthlyPlanId = (typeof process !== 'undefined' && process.env)
    ? (process.env.RAZORPAY_CREATOR_PLAN_ID || process.env.RAZORPAY_STARTER_PLAN_ID || null)
    : null

  const razorpayCreatorAnnualPlanId = (typeof process !== 'undefined' && process.env)
    ? (process.env.RAZORPAY_CREATOR_ANNUAL_PLAN_ID || null)
    : null

  const razorpayProMonthlyPlanId = (typeof process !== 'undefined' && process.env)
    ? (process.env.RAZORPAY_PRO_PLAN_ID || null)
    : null

  const razorpayProAnnualPlanId = (typeof process !== 'undefined' && process.env)
    ? (process.env.RAZORPAY_PRO_ANNUAL_PLAN_ID || null)
    : null

  if (normCurrency === 'USD') {
    const usdCreatorMonthly = SUPPORTED_CURRENCIES.USD.displayPrices.CREATOR.monthly
    const usdCreatorAnnual = SUPPORTED_CURRENCIES.USD.displayPrices.CREATOR.annual
    const usdProMonthly = SUPPORTED_CURRENCIES.USD.displayPrices.PRO.monthly
    const usdProAnnual = SUPPORTED_CURRENCIES.USD.displayPrices.PRO.annual

    const isAnnual = normInterval === 'annual'
    const creatorDisplayPrice = isAnnual ? usdCreatorAnnual : usdCreatorMonthly
    const creatorPriceInr = isAnnual ? creatorAnnualPriceInr : creatorMonthlyPriceInr
    const proDisplayPrice = isAnnual ? usdProAnnual : usdProMonthly
    const proPriceInr = isAnnual ? proAnnualPriceInr : proMonthlyPriceInr

    return {
      currency: 'USD',
      currencySymbol: '$',
      isBillingCurrency: true,
      billingCurrency: 'USD',
      billingInterval: normInterval,
      billingDisclaimer: SUPPORTED_CURRENCIES.USD.billingDisclaimer,
      discountPercent: ANNUAL_DISCOUNT_PERCENT,
      CREATOR: {
        planId: 'CREATOR',
        name: 'Creator',
        currency: 'USD',
        currencySymbol: '$',
        interval: normInterval,
        isAnnual,
        price: creatorDisplayPrice,
        priceInr: creatorPriceInr,
        priceFormatted: isAnnual ? `$${usdCreatorAnnual}` : `$${usdCreatorMonthly}`,
        periodLabel: isAnnual ? '/year' : '/mo',
        billingPriceFormatted: isAnnual ? `₹${creatorAnnualPriceInr.toLocaleString('en-IN')}` : `₹${creatorMonthlyPriceInr.toLocaleString('en-IN')}`,
        amountInrPaise: Math.round(creatorPriceInr * 100),
        planIdRazorpay: isAnnual ? razorpayCreatorAnnualPlanId : razorpayCreatorMonthlyPlanId,
        monthly: {
          price: usdCreatorMonthly,
          priceInr: creatorMonthlyPriceInr,
          priceFormatted: `$${usdCreatorMonthly}`,
          periodLabel: '/mo',
          amountInrPaise: Math.round(creatorMonthlyPriceInr * 100),
          planIdRazorpay: razorpayCreatorMonthlyPlanId,
        },
        annual: {
          price: usdCreatorAnnual,
          priceInr: creatorAnnualPriceInr,
          originalPrice: usdCreatorMonthly * 12,
          originalPriceFormatted: `$${usdCreatorMonthly * 12}`,
          originalPriceInr: creatorAnnualOriginalInr,
          originalPriceInrFormatted: `₹${creatorAnnualOriginalInr.toLocaleString('en-IN')}`,
          discountPercent: ANNUAL_DISCOUNT_PERCENT,
          priceFormatted: `$${usdCreatorAnnual}`,
          periodLabel: '/year',
          amountInrPaise: Math.round(creatorAnnualPriceInr * 100),
          planIdRazorpay: razorpayCreatorAnnualPlanId,
        },
      },
      PRO: {
        planId: 'PRO',
        name: 'Pro',
        currency: 'USD',
        currencySymbol: '$',
        interval: normInterval,
        isAnnual,
        price: proDisplayPrice,
        priceInr: proPriceInr,
        priceFormatted: isAnnual ? `$${usdProAnnual}` : `$${usdProMonthly}`,
        periodLabel: isAnnual ? '/year' : '/mo',
        billingPriceFormatted: isAnnual ? `₹${proAnnualPriceInr.toLocaleString('en-IN')}` : `₹${proMonthlyPriceInr.toLocaleString('en-IN')}`,
        amountInrPaise: Math.round(proPriceInr * 100),
        planIdRazorpay: isAnnual ? razorpayProAnnualPlanId : razorpayProMonthlyPlanId,
        monthly: {
          price: usdProMonthly,
          priceInr: proMonthlyPriceInr,
          priceFormatted: `$${usdProMonthly}`,
          periodLabel: '/mo',
          amountInrPaise: Math.round(proMonthlyPriceInr * 100),
          planIdRazorpay: razorpayProMonthlyPlanId,
        },
        annual: {
          price: usdProAnnual,
          priceInr: proAnnualPriceInr,
          originalPrice: usdProMonthly * 12,
          originalPriceFormatted: `$${usdProMonthly * 12}`,
          originalPriceInr: proAnnualOriginalInr,
          originalPriceInrFormatted: `₹${proAnnualOriginalInr.toLocaleString('en-IN')}`,
          discountPercent: ANNUAL_DISCOUNT_PERCENT,
          priceFormatted: `$${usdProAnnual}`,
          periodLabel: '/year',
          amountInrPaise: Math.round(proAnnualPriceInr * 100),
          planIdRazorpay: razorpayProAnnualPlanId,
        },
      },
    }
  }

  const isAnnual = normInterval === 'annual'
  const creatorActivePriceInr = isAnnual ? creatorAnnualPriceInr : creatorMonthlyPriceInr
  const proActivePriceInr = isAnnual ? proAnnualPriceInr : proMonthlyPriceInr

  return {
    currency: 'INR',
    currencySymbol: '₹',
    isBillingCurrency: true,
    billingCurrency: 'INR',
    billingInterval: normInterval,
    billingDisclaimer: null,
    discountPercent: ANNUAL_DISCOUNT_PERCENT,
    CREATOR: {
      planId: 'CREATOR',
      name: 'Creator',
      currency: 'INR',
      currencySymbol: '₹',
      interval: normInterval,
      isAnnual,
      price: creatorActivePriceInr,
      priceInr: creatorActivePriceInr,
      amountInrPaise: Math.round(creatorActivePriceInr * 100),
      priceFormatted: isAnnual ? `₹${creatorAnnualPriceInr.toLocaleString('en-IN')}` : `₹${creatorMonthlyPriceInr.toLocaleString('en-IN')}`,
      periodLabel: isAnnual ? '/year' : '/mo',
      billingPriceFormatted: isAnnual ? `₹${creatorAnnualPriceInr.toLocaleString('en-IN')}` : `₹${creatorMonthlyPriceInr.toLocaleString('en-IN')}`,
      planIdRazorpay: isAnnual ? razorpayCreatorAnnualPlanId : razorpayCreatorMonthlyPlanId,
      monthly: {
        price: creatorMonthlyPriceInr,
        priceInr: creatorMonthlyPriceInr,
        amountInrPaise: Math.round(creatorMonthlyPriceInr * 100),
        priceFormatted: `₹${creatorMonthlyPriceInr.toLocaleString('en-IN')}`,
        periodLabel: '/mo',
        planIdRazorpay: razorpayCreatorMonthlyPlanId,
      },
      annual: {
        price: creatorAnnualPriceInr,
        priceInr: creatorAnnualPriceInr,
        originalPrice: creatorAnnualOriginalInr,
        originalPriceFormatted: `₹${creatorAnnualOriginalInr.toLocaleString('en-IN')}`,
        originalPriceInr: creatorAnnualOriginalInr,
        originalPriceInrFormatted: `₹${creatorAnnualOriginalInr.toLocaleString('en-IN')}`,
        discountPercent: ANNUAL_DISCOUNT_PERCENT,
        amountInrPaise: Math.round(creatorAnnualPriceInr * 100),
        priceFormatted: `₹${creatorAnnualPriceInr.toLocaleString('en-IN')}`,
        periodLabel: '/year',
        planIdRazorpay: razorpayCreatorAnnualPlanId,
      },
    },
    PRO: {
      planId: 'PRO',
      name: 'Pro',
      currency: 'INR',
      currencySymbol: '₹',
      interval: normInterval,
      isAnnual,
      price: proActivePriceInr,
      priceInr: proActivePriceInr,
      amountInrPaise: Math.round(proActivePriceInr * 100),
      priceFormatted: isAnnual ? `₹${proAnnualPriceInr.toLocaleString('en-IN')}` : `₹${proMonthlyPriceInr.toLocaleString('en-IN')}`,
      periodLabel: isAnnual ? '/year' : '/mo',
      billingPriceFormatted: isAnnual ? `₹${proAnnualPriceInr.toLocaleString('en-IN')}` : `₹${proMonthlyPriceInr.toLocaleString('en-IN')}`,
      planIdRazorpay: isAnnual ? razorpayProAnnualPlanId : razorpayProMonthlyPlanId,
      monthly: {
        price: proMonthlyPriceInr,
        priceInr: proMonthlyPriceInr,
        amountInrPaise: Math.round(proMonthlyPriceInr * 100),
        priceFormatted: `₹${proMonthlyPriceInr.toLocaleString('en-IN')}`,
        periodLabel: '/mo',
        planIdRazorpay: razorpayProMonthlyPlanId,
      },
      annual: {
        price: proAnnualPriceInr,
        priceInr: proAnnualPriceInr,
        originalPrice: proAnnualOriginalInr,
        originalPriceFormatted: `₹${proAnnualOriginalInr.toLocaleString('en-IN')}`,
        originalPriceInr: proAnnualOriginalInr,
        originalPriceInrFormatted: `₹${proAnnualOriginalInr.toLocaleString('en-IN')}`,
        discountPercent: ANNUAL_DISCOUNT_PERCENT,
        amountInrPaise: Math.round(proAnnualPriceInr * 100),
        priceFormatted: `₹${proAnnualPriceInr.toLocaleString('en-IN')}`,
        periodLabel: '/year',
        planIdRazorpay: razorpayProAnnualPlanId,
      },
    },
  }
}

/**
 * Validates the environment variables on application startup.
 * Throws a clear error if prices are missing, NaN, or non-positive.
 */
export function validatePricingConfig() {
  const pricing = getSubscriptionPricing()
  if (!pricing.CREATOR.priceInr || pricing.CREATOR.priceInr <= 0) {
    throw new Error('Invalid CREATOR_PLAN_PRICE_INR: must be a positive number greater than 0')
  }
  if (!pricing.PRO.priceInr || pricing.PRO.priceInr <= 0) {
    throw new Error('Invalid PRO_PLAN_PRICE_INR: must be a positive number greater than 0')
  }
  return true
}

export const SUBSCRIPTION_PRICING = new Proxy({}, {
  get(target, prop) {
    const dynamicPricing = getSubscriptionPricing()
    return dynamicPricing[prop]
  },
})

export const PLAN_FEATURES = {
  UNSUBSCRIBED: {
    id: 'UNSUBSCRIBED',
    name: 'Free Account',
    price: 0,
    currency: 'INR',
    priceFormatted: '₹0',
    billingPeriod: 'month',
    headline: 'Explore Mode',
    description: 'Explore the dashboard, builder, and tools for free. Subscribe to launch your store.',
    ctaText: 'Upgrade to Launch',
    badge: null,
    isPaid: false,
    entitlements: {
      canPublish: false,
      canSell: false,
      canReceivePayments: false,
      canActivateAutoDm: false,
      storefront: false,
      unlimitedLinks: false,
      digitalProducts: false,
      productCheckout: false,
      digitalDelivery: false,
      collections: false,
      productVariants: 'none',
      productVariantsLimit: 0,
      creatorAnalytics: 'preview',
      advancedAnalytics: false,
      instagramAutoDm: 'preview',
      autoDmCampaignsLimit: 0,
      leadCollection: false,
      leadExport: false,
      leadMagnets: false,
      multiplePages: 0,
      storePagesLimit: 0,
      couponCodes: false,
      emailBroadcasts: false,
      customerManagement: 'preview',
      salesAnalytics: 'preview',
      audienceInsights: false,
      conversionAnalytics: false,
      customBranding: false,
      removeBranding: false,
      prioritySupport: false,
      platformFeePercent: 0,
    },
    displayFeatures: [
      'Full dashboard & editor preview',
      'Explore analytics & AutoDM interface',
      'Design your storefront layout',
      'Upgrade to launch & sell',
    ],
  },
  CREATOR: {
    id: 'CREATOR',
    name: 'Creator',
    currency: 'INR',
    billingPeriod: 'month',
    headline: 'Launch your store.',
    description: 'Everything you need to turn your audience into your first customers.',
    supportingText: 'Best for creators ready to start selling.',
    badge: null,
    isPaid: true,
    entitlements: {
      canPublish: true,
      canSell: true,
      canReceivePayments: true,
      canActivateAutoDm: true,
      storefront: true,
      unlimitedLinks: true,
      digitalProducts: true,
      productCheckout: true,
      digitalDelivery: true,
      collections: true,
      productVariants: 'limited',
      productVariantsLimit: 5,
      creatorAnalytics: 'basic',
      advancedAnalytics: false,
      instagramAutoDm: 'standard',
      autoDmCampaignsLimit: Infinity,
      leadCollection: true,
      leadExport: false,
      leadMagnets: true,
      multiplePages: 3,
      storePagesLimit: 3,
      couponCodes: true,
      emailBroadcasts: true,
      customerManagement: 'basic',
      salesAnalytics: 'basic',
      audienceInsights: false,
      conversionAnalytics: false,
      customBranding: false,
      removeBranding: false,
      prioritySupport: false,
      platformFeePercent: 0,
    },
    displayFeatures: [
      'Creator storefront & bio link',
      'Unlimited digital products & sales',
      'Unlimited links & social integrations',
      'Digital product checkout & instant delivery',
      'Product collections & grouping',
      'Standard store customization',
      'Unlimited Instagram DMs',
      'Up to 3 storefront pages',
      'Basic creator & sales analytics',
      'Basic customer management',
      'Leads & Lead Magnets',
      'Coupons & Discounts',
      'Email Broadcasts',
      '0% CreatorStore platform fee',
    ],
  },
  PRO: {
    id: 'PRO',
    name: 'Pro',
    currency: 'INR',
    billingPeriod: 'month',
    headline: 'Scale your business.',
    description: 'Advanced automation, analytics, branding, and growth tools for creators who are ready to grow.',
    supportingText: 'Best for creators who want to automate, analyze, and grow.',
    badge: 'BEST FOR GROWING CREATORS',
    recommended: true,
    isPaid: true,
    entitlements: {
      canPublish: true,
      canSell: true,
      canReceivePayments: true,
      canActivateAutoDm: true,
      storefront: true,
      unlimitedLinks: true,
      digitalProducts: true,
      productCheckout: true,
      digitalDelivery: true,
      collections: true,
      productVariants: 'unlimited',
      productVariantsLimit: Infinity,
      creatorAnalytics: 'advanced',
      advancedAnalytics: true,
      instagramAutoDm: 'advanced',
      autoDmCampaignsLimit: Infinity,
      leadCollection: true,
      leadExport: true,
      leadMagnets: true,
      multiplePages: Infinity,
      storePagesLimit: Infinity,
      couponCodes: true,
      emailBroadcasts: true,
      customerManagement: 'advanced',
      salesAnalytics: 'advanced',
      audienceInsights: true,
      conversionAnalytics: true,
      customBranding: true,
      removeBranding: true,
      prioritySupport: true,
      platformFeePercent: 0,
    },
    displayFeatures: [
      'Everything in Creator, plus:',
      'Leads & Lead Magnets',
      'Coupons & Discounts',
      'Email Broadcasts',
      'Unlimited Instagram DMs',
      'Unlimited storefront pages & navigation links',
      'Advanced creator & conversion analytics',
      'Unlimited product variants',
      'Lead export — CSV / CRM sync',
      'Advanced customer insights',
      'Remove CreatorStore branding',
      'Priority creator customer support',
      'Advanced storefront customization',
      'Advanced sales & revenue analytics',
      '0% CreatorStore platform fee',
    ],
  },
}

/**
 * Normalizes subscription plan names.
 * Unsubscribed / inactive users get UNSUBSCRIBED.
 * Active subscriptions get CREATOR or PRO.
 */
export function normalizePlanId(planInput, status = 'ACTIVE') {
  if (status !== 'ACTIVE' && status !== 'TRIALING') {
    return PLAN_IDS.UNSUBSCRIBED
  }

  if (!planInput) return PLAN_IDS.UNSUBSCRIBED
  const str = String(planInput).trim().toUpperCase()

  if (str === 'FREE' || str === 'UNSUBSCRIBED' || str === 'STARTER' || str === 'NONE') {
    return PLAN_IDS.UNSUBSCRIBED
  }

  if (str === 'PRO' || str === 'MAX' || str === 'CREATOR_PRO' || str === 'YEARLY' || str === 'MONTHLY') {
    return PLAN_IDS.PRO
  }
  if (str === 'CREATOR' || str === 'CREATOR_MONTHLY') {
    return PLAN_IDS.CREATOR
  }

  return PLAN_IDS.UNSUBSCRIBED
}

/**
 * Returns full plan definition with entitlements and dynamic prices from environment variables
 */
export function getPlanConfig(planInput, status = 'ACTIVE', interval = 'monthly') {
  const planId = normalizePlanId(planInput, status)
  const base = PLAN_FEATURES[planId] || PLAN_FEATURES.UNSUBSCRIBED
  const pricing = getSubscriptionPricing('INR', interval)
  const isAnnual = String(interval).toLowerCase().trim() === 'annual' || String(interval).toLowerCase().trim() === 'yearly'
  const periodSuffix = isAnnual ? '/year' : '/mo'

  if (planId === PLAN_IDS.CREATOR) {
    const p = pricing.CREATOR
    return {
      ...base,
      price: p.priceInr,
      currency: p.currency,
      interval: isAnnual ? 'annual' : 'monthly',
      priceFormatted: p.priceFormatted,
      periodLabel: periodSuffix,
      headline: `Start Selling for ${p.priceFormatted}${periodSuffix}`,
      ctaText: `Start with Creator — ${p.priceFormatted}${periodSuffix}`,
    }
  }

  if (planId === PLAN_IDS.PRO) {
    const p = pricing.PRO
    return {
      ...base,
      price: p.priceInr,
      currency: p.currency,
      interval: isAnnual ? 'annual' : 'monthly',
      priceFormatted: p.priceFormatted,
      periodLabel: periodSuffix,
      headline: `Scale your business for ${p.priceFormatted}${periodSuffix}`,
      ctaText: `Go Pro — ${p.priceFormatted}${periodSuffix}`,
    }
  }

  return base
}

/**
 * Checks whether a given plan has access to a boolean feature entitlement
 */
export function hasEntitlement(planInput, featureKey, status = 'ACTIVE') {
  const plan = getPlanConfig(planInput, status)
  const val = plan.entitlements[featureKey]
  if (typeof val === 'boolean') return val
  if (val === 'advanced' || val === 'unlimited' || val === 'standard') return true
  return Boolean(val)
}

/**
 * Returns numeric or discrete limit for an entitlement
 */
export function getEntitlementLimit(planInput, limitKey, status = 'ACTIVE') {
  const plan = getPlanConfig(planInput, status)
  return plan.entitlements[limitKey] ?? 0
}

export function resolveCreatorPlan(subscription) {
  if (!subscription) return PLAN_IDS.UNSUBSCRIBED
  const status = subscription.status || subscription.rawStatus || 'INACTIVE'
  const plan = subscription.planId || subscription.plan || 'UNSUBSCRIBED'

  // Dynamic trial expiration check if trialEndsAt is present
  if (status === 'TRIALING' || subscription.trialStatus === 'ACTIVE') {
    const now = new Date()
    if (subscription.trialEndsAt && new Date(subscription.trialEndsAt) <= now) {
      return PLAN_IDS.UNSUBSCRIBED
    }
    return PLAN_IDS.PRO
  }

  return normalizePlanId(plan, status)
}

export const COMPARISON_TABLE_ROWS = [
  { key: 'storefront_pages', name: 'Storefront Pages', feature: 'Storefront Pages', creator: 'Up to 3 Pages', starter: 'Up to 3 Pages', pro: 'Unlimited Pages' },
  { key: 'digital_products', name: 'Digital Products & Downloads', feature: 'Digital Products & Downloads', creator: 'Unlimited', starter: 'Unlimited', pro: 'Unlimited' },
  { key: 'online_courses', name: 'Online Courses & Video LMS', feature: 'Online Courses & Video LMS', creator: 'Unlimited', starter: 'Unlimited', pro: 'Unlimited' },
  { key: 'coaching_bookings', name: '1:1 Coaching & Bookings', feature: '1:1 Coaching & Bookings', creator: 'Unlimited', starter: 'Unlimited', pro: 'Unlimited' },
  { key: 'memberships_communities', name: 'Memberships & Communities', feature: 'Memberships & Communities', creator: 'Unlimited', starter: 'Unlimited', pro: 'Unlimited' },
  { key: 'instagram_autodm', name: 'Instagram AutoDM & Automations', feature: 'Instagram AutoDM & Automations', creator: true, starter: true, pro: true },
  { key: 'lead_magnets', name: 'Leads & Lead Magnets', feature: 'Leads & Lead Magnets', creator: true, starter: true, pro: true },
  { key: 'coupons_discounts', name: 'Coupons & Discounts', feature: 'Coupons & Discounts', creator: true, starter: true, pro: true },
  { key: 'email_broadcasts', name: 'Email Broadcasts', feature: 'Email Broadcasts', creator: true, starter: true, pro: true },
  { key: 'lead_export', name: 'Lead Export (CSV / CRM)', feature: 'Lead Export (CSV / CRM)', creator: false, starter: false, pro: true },
  { key: 'platform_fee', name: 'Platform Transaction Fee', feature: 'Platform Transaction Fee', creator: '0%', starter: '0%', pro: '0%' },
  { key: 'bank_payouts', name: 'Direct Bank Payouts', feature: 'Direct Bank Payouts', creator: true, starter: true, pro: true },
  { key: 'analytics', name: 'Traffic & Conversion Analytics', feature: 'Traffic & Conversion Analytics', creator: 'Standard', starter: 'Standard', pro: 'Advanced' },
  { key: 'priority_support', name: 'Priority 24/7 Support', feature: 'Priority 24/7 Support', creator: false, starter: false, pro: true },
]

