import { DodoPayments } from 'dodopayments'
import { Webhook } from 'standardwebhooks'
import fs from 'fs'
import path from 'path'
import { getAppUrl, sanitizeBrowserUrl } from '../config/site.js'

/**
 * Dodo Payments Provider Module
 *
 * Implements official Dodo Payments API & SDK for CreatorStore:
 * - Hosted checkout session creation for subscriptions & one-time product purchases
 * - Cryptographic webhook signature verification via standardwebhooks
 * - Subscription retrieval, status checks, and cancellation
 * - Payment status verification
 * - Secure error handling and audit logging
 *
 * Security Guarantee:
 * - NO mock checkout fallbacks.
 * - NO fabricated successful payments.
 * - Real provider redirection only.
 */

function getEnvVar(key) {
  try {
    const envPath = path.join(process.cwd(), '.env')
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf8')
      const match = content.match(new RegExp(`^${key}=(.*)$`, 'm'))
      if (match && match[1]) {
        let val = match[1].trim()
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1).trim()
        }
        if (val) return val
      }
    }
  } catch (e) {}
  let val = (process.env[key] || '').trim()
  if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
    val = val.slice(1, -1).trim()
  }
  return val
}

export function getDodoEnvironment() {
  const env = (getEnvVar('DODO_PAYMENTS_ENVIRONMENT') || getEnvVar('DODO_ENVIRONMENT') || '').toLowerCase().trim()
  if (env === 'live' || env === 'live_mode' || env === 'production') return 'live_mode'
  return 'test_mode'
}

export function isDodoConfigured() {
  const apiKey = getEnvVar('DODO_PAYMENTS_API_KEY') || getEnvVar('DODO_API_KEY')
  return Boolean(apiKey && !apiKey.startsWith('your_') && !apiKey.includes('placeholder'))
}

export function isDodoWebhookConfigured() {
  const webhookKey = getEnvVar('DODO_PAYMENTS_WEBHOOK_KEY') || getEnvVar('DODO_WEBHOOK_SECRET')
  return Boolean(webhookKey && !webhookKey.startsWith('your_') && !webhookKey.includes('placeholder'))
}

/**
 * Returns the configurable timeout in minutes for pending payments and checkout sessions.
 * Safe default: 30 minutes. Range: [5, 1440].
 */
export function getPendingPaymentTTLMinutes() {
  const raw = getEnvVar('DODO_PENDING_PAYMENT_TTL_MINUTES') || process.env.DODO_PENDING_PAYMENT_TTL_MINUTES
  if (!raw) return 30
  const parsed = parseInt(String(raw).trim(), 10)
  if (isNaN(parsed) || parsed < 5 || parsed > 1440) {
    return 30
  }
  return parsed
}

export function getPendingPaymentTTLMs() {
  return getPendingPaymentTTLMinutes() * 60 * 1000
}

export function getDodoBaseUrl() {
  const explicit = getEnvVar('DODO_RETURN_URL_BASE') || getEnvVar('DODO_BASE_URL')
  if (explicit) return sanitizeBrowserUrl(explicit.replace(/\/+$/, ''))
  return sanitizeBrowserUrl(getAppUrl())
}

export function getDodoReturnUrl(type = 'subscription') {
  const explicit = getEnvVar('DODO_RETURN_URL')
  if (explicit) return sanitizeBrowserUrl(explicit)
  const base = getDodoBaseUrl()
  if (type === 'product') {
    return `${base}/api/checkout/dodo/return`
  }
  return `${base}/api/creator/subscription/dodo/return`
}

export function getDodoCancelUrl() {
  const explicit = getEnvVar('DODO_CANCEL_URL')
  if (explicit) return sanitizeBrowserUrl(explicit)
  return `${getDodoBaseUrl()}/dashboard/settings/billing?canceled=true`
}

class DodoProvider {
  constructor() {
    this._client = null
  }

  getClient() {
    if (this._client) return this._client
    const apiKey = getEnvVar('DODO_PAYMENTS_API_KEY') || getEnvVar('DODO_API_KEY')
    const environment = getDodoEnvironment()
    const webhookKey = getEnvVar('DODO_PAYMENTS_WEBHOOK_KEY') || getEnvVar('DODO_WEBHOOK_SECRET')

    if (!apiKey) {
      throw new Error('Dodo Payments is not configured. Missing DODO_PAYMENTS_API_KEY.')
    }

    this._client = new DodoPayments({
      bearerToken: apiKey,
      environment,
      webhookKey: webhookKey || undefined,
    })
    return this._client
  }

  /**
   * Create a hosted checkout session for a recurring creator subscription
   */
  async createSubscriptionCheckoutSession({
    creatorId,
    productId,
    planId,
    billingInterval = 'MONTHLY',
    customerEmail,
    customerName,
    returnUrl,
    metadata = {},
  }) {
    if (!creatorId) throw new Error('creatorId is required for subscription checkout session')
    if (!productId) throw new Error('productId is required for subscription checkout session')

    const client = this.getClient()
    const resolvedReturnUrl = returnUrl || getDodoReturnUrl('subscription')

    const sessionParams = {
      product_cart: [
        {
          product_id: productId,
          quantity: 1,
        },
      ],
      customer: {
        email: customerEmail || undefined,
        name: customerName || undefined,
      },
      return_url: resolvedReturnUrl,
      cancel_url: getDodoCancelUrl(),
      metadata: {
        creatorId,
        planId: planId || 'PRO',
        billingInterval,
        checkoutType: 'CREATOR_SUBSCRIPTION',
        ...metadata,
      },
    }

    console.log(`[Dodo Payments] Creating subscription checkout session for creator ${creatorId} (Product: ${productId})`)
    const res = await client.checkoutSessions.create(sessionParams)

    if (!res?.checkout_url) {
      throw new Error('Dodo Payments did not return a valid checkout URL.')
    }

    return {
      sessionId: res.session_id,
      checkoutUrl: res.checkout_url,
      provider: 'dodo',
    }
  }

  /**
   * Resolves or registers a digital product in the Dodo Payments catalog.
   * Dodo checkoutSessions.create requires a valid Dodo catalog product ID (`pdt_...`) in product_cart.
   * Ensures an authoritative Dodo catalog product exists for this internal product and price,
   * caching the resolution to prevent duplicate Dodo products.
   */
  async ensureProduct({ productId, title, amount, currency = 'USD', description, metadata = {} }) {
    if (!productId) throw new Error('productId is required to ensure Dodo product')

    const client = this.getClient()
    const amountInCents = Math.max(1, Math.round(Number(amount) * 100))
    const normalizedCurrency = String(currency || 'USD').toUpperCase()
    const cacheKey = `${productId}:${amountInCents}:${normalizedCurrency}`

    if (!this._productCache) {
      this._productCache = new Map()
    }

    if (this._productCache.has(cacheKey)) {
      return this._productCache.get(cacheKey)
    }

    // Check if an existing product with matching metadata and price exists in Dodo
    try {
      for await (const p of client.products.list({ recurring: false })) {
        if (
          p.metadata?.creatorStoreProductId === productId &&
          p.price?.price === amountInCents &&
          p.price?.currency === normalizedCurrency
        ) {
          this._productCache.set(cacheKey, p.product_id)
          return p.product_id
        }
      }
    } catch (listErr) {
      console.warn('[Dodo Payments] Could not query existing products catalog:', listErr.message)
    }

    // Register product in Dodo catalog
    const productPayload = {
      name: String(title || 'CreatorStore Product').slice(0, 255),
      description: description ? String(description).slice(0, 1000) : undefined,
      price: {
        currency: normalizedCurrency,
        price: amountInCents,
        type: 'one_time_price',
      },
      tax_category: 'digital_products',
      metadata: {
        creatorStoreProductId: productId,
        ...metadata,
      },
    }

    console.log(`[Dodo Payments] Registering digital product in Dodo catalog: "${productPayload.name}" (${amountInCents} ${normalizedCurrency})`)
    const createdProduct = await client.products.create(productPayload)
    if (!createdProduct?.product_id) {
      throw new Error('Dodo Payments failed to create product in catalog.')
    }

    this._productCache.set(cacheKey, createdProduct.product_id)
    return createdProduct.product_id
  }

  /**
   * Create a hosted checkout session for a digital product purchase
   */
  async createProductCheckoutSession({
    orderId,
    productId,
    productTitle,
    amount,
    currency = 'USD',
    billingCurrency,
    customerEmail,
    customerName,
    returnUrl,
    metadata = {},
  }) {
    if (!orderId) throw new Error('orderId is required')
    if (!productId) throw new Error('productId is required')

    const client = this.getClient()
    const resolvedReturnUrl = returnUrl || getDodoReturnUrl('product')

    // Authoritatively resolve Dodo catalog product ID (pdt_...) from internal database productId
    let dodoProductId = productId
    if (!String(productId).startsWith('pdt_')) {
      dodoProductId = await this.ensureProduct({
        productId,
        title: productTitle,
        amount,
        currency,
        description: metadata.productDescription || productTitle,
        metadata: {
          creatorId: metadata.creatorId,
          productSlug: metadata.productSlug,
        },
      })
    }

    const targetBillingCurrency = billingCurrency ? String(billingCurrency).toUpperCase().trim() : undefined

    const sessionParams = {
      product_cart: [
        {
          product_id: dodoProductId,
          quantity: 1,
        },
      ],
      billing_currency: targetBillingCurrency || undefined,
      customer: {
        email: customerEmail || undefined,
        name: customerName || undefined,
      },
      flags: {
        allow_currency_selection: true,
      },
      return_url: `${resolvedReturnUrl}?order_id=${encodeURIComponent(orderId)}`,
      cancel_url: `${getDodoBaseUrl()}/p/${metadata.productSlug || productId}?canceled=true`,
      metadata: {
        orderId,
        productId,
        dodoProductId,
        originalPrice: amount,
        originalCurrency: currency,
        presentmentCurrency: targetBillingCurrency || currency,
        checkoutType: 'PRODUCT_PURCHASE',
        ...metadata,
      },
    }

    console.log(`[Dodo Payments] Creating product checkout session for order ${orderId} (Product: ${productId} -> Dodo: ${dodoProductId}, billingCurrency: ${targetBillingCurrency || currency})`)
    const res = await client.checkoutSessions.create(sessionParams)

    if (!res?.checkout_url) {
      throw new Error('Dodo Payments did not return a valid checkout URL.')
    }

    return {
      sessionId: res.session_id,
      checkoutUrl: res.checkout_url,
      provider: 'dodo',
      dodoProductId,
      billingCurrency: targetBillingCurrency || currency,
    }
  }

  /**
   * Process a refund on Dodo Payments
   */
  async createRefund({ paymentId, amount, reason = 'customer_request' }) {
    if (!paymentId) throw new Error('paymentId is required for refund')
    const client = this.getClient()
    const payload = { payment_id: paymentId }
    if (amount) payload.amount = Math.round(Number(amount) * 100)
    if (reason) payload.reason = reason
    console.log(`[Dodo Payments] Issuing refund for payment ${paymentId} (amount: ${amount || 'full'})`)
    return await client.refunds.create(payload)
  }

  /**
   * Retrieve checkout session details by session ID
   */
  async getCheckoutSession(sessionId) {
    if (!sessionId) return null
    const client = this.getClient()
    const session = await client.checkoutSessions.retrieve(sessionId)
    if (session && !session.checkout_url && session.id) {
      const isTest = this.mode === 'test_mode' || process.env.DODO_PAYMENTS_ENVIRONMENT === 'test_mode' || String(session.id).startsWith('cks_')
      const baseDomain = isTest ? 'https://test.checkout.dodopayments.com' : 'https://checkout.dodopayments.com'
      session.checkout_url = `${baseDomain}/session/${session.id}`
    }
    return session
  }

  /**
   * Retrieve subscription details by Dodo subscription ID
   */
  async getSubscription(subscriptionId) {
    if (!subscriptionId) return null
    const client = this.getClient()
    return await client.subscriptions.retrieve(subscriptionId)
  }

  /**
   * Retrieve payment details by Dodo payment ID
   */
  async getPayment(paymentId) {
    if (!paymentId) return null
    const client = this.getClient()
    return await client.payments.retrieve(paymentId)
  }

  /**
   * Cancel subscription on Dodo
   */
  async cancelSubscription(subscriptionId, { cancelAtNextBillingDate = true, immediately = false, cancelReason = 'cancelled_by_customer', comment = null } = {}) {
    if (!subscriptionId) throw new Error('subscriptionId is required')
    const client = this.getClient()
    const payload = {}
    if (immediately) {
      payload.status = 'cancelled'
      payload.cancel_reason = cancelReason
      if (comment) payload.cancellation_comment = comment
    } else {
      payload.cancel_at_next_billing_date = cancelAtNextBillingDate
      payload.cancel_reason = cancelReason
      if (comment) payload.cancellation_comment = comment
    }
    return await client.subscriptions.update(subscriptionId, payload)
  }

  /**
   * Change subscription plan (Upgrade or Downgrade) on Dodo
   */
  async changeSubscriptionPlan(subscriptionId, {
    productId,
    prorationBillingMode = 'prorated_immediately',
    quantity = 1,
    effectiveAt = 'immediately',
    cancelOlderPaymentLink = true,
    cancelScheduledChangePlan = true,
    collectViaPaymentLink = false,
    returnUrl,
    onPaymentFailure = 'prevent_change',
    metadata = {},
  }) {
    if (!subscriptionId) throw new Error('subscriptionId is required for changeSubscriptionPlan')
    if (!productId) throw new Error('productId is required for changeSubscriptionPlan')

    const client = this.getClient()
    const params = {
      product_id: productId,
      proration_billing_mode: prorationBillingMode,
      quantity,
      effective_at: effectiveAt,
      cancel_older_payment_link: cancelOlderPaymentLink,
      cancel_scheduled_change_plan: cancelScheduledChangePlan,
      metadata,
    }

    if (collectViaPaymentLink) {
      params.collect_via_payment_link = true
      params.on_payment_failure = 'prevent_change'
      if (returnUrl) params.return_url = returnUrl
    } else if (onPaymentFailure) {
      params.on_payment_failure = onPaymentFailure
    }

    console.log(`[Dodo Payments] Changing plan for subscription ${subscriptionId} -> Product ${productId} (mode: ${prorationBillingMode}, effective: ${effectiveAt})`)
    return await client.subscriptions.changePlan(subscriptionId, params)
  }

  /**
   * Preview a plan change (Proration quote) before executing
   */
  async previewChangePlan(subscriptionId, {
    productId,
    prorationBillingMode = 'prorated_immediately',
    quantity = 1,
    effectiveAt = 'immediately',
  }) {
    if (!subscriptionId) throw new Error('subscriptionId is required for previewChangePlan')
    if (!productId) throw new Error('productId is required for previewChangePlan')
    const client = this.getClient()
    return await client.subscriptions.previewChangePlan(subscriptionId, {
      product_id: productId,
      proration_billing_mode: prorationBillingMode,
      quantity,
      effective_at: effectiveAt,
    })
  }

  /**
   * Cancel a scheduled plan change on Dodo
   */
  async cancelScheduledChangePlan(subscriptionId) {
    if (!subscriptionId) throw new Error('subscriptionId is required')
    const client = this.getClient()
    return await client.subscriptions.cancelChangePlan(subscriptionId)
  }

  /**
   * List subscriptions for a customer or by status
   */
  async listSubscriptions({ customerId, status } = {}) {
    const client = this.getClient()
    const query = {}
    if (customerId) query.customer_id = customerId
    if (status) query.status = status
    const subs = []
    for await (const sub of client.subscriptions.list(query)) {
      subs.push(sub)
    }
    return subs
  }

  /**
   * Retrieve customer details by customer ID
   */
  async getCustomer(customerId) {
    if (!customerId) return null
    const client = this.getClient()
    return await client.customers.retrieve(customerId)
  }

  /**
   * List payments for a subscription, customer, or generally
   */
  async listPayments({ subscriptionId, customerId, limit = 20 } = {}) {
    const client = this.getClient()
    const query = {}
    if (subscriptionId) query.subscription_id = subscriptionId
    if (customerId) query.customer_id = customerId
    const payments = []
    for await (const p of client.payments.list(query)) {
      payments.push(p)
      if (payments.length >= limit) break
    }
    return payments
  }

  /**
   * Request payment method update link for a subscription
   */
  async updateSubscriptionPaymentMethod(subscriptionId, returnUrl) {
    if (!subscriptionId) throw new Error('subscriptionId is required')
    const client = this.getClient()
    const payload = {
      payment_method: { type: 'new' },
    }
    if (returnUrl) payload.return_url = returnUrl
    return await client.subscriptions.updatePaymentMethod(subscriptionId, payload)
  }

  /**
   * Cryptographically verify Dodo webhook payload and headers using standardwebhooks
   */
  verifyWebhook({ rawBody, headers }) {
    if (!rawBody) throw new Error('Missing webhook body')
    const webhookKey = getEnvVar('DODO_PAYMENTS_WEBHOOK_KEY') || getEnvVar('DODO_WEBHOOK_SECRET')

    if (!webhookKey) {
      throw new Error('Dodo webhook secret is not configured. Missing DODO_PAYMENTS_WEBHOOK_KEY.')
    }

    // Normalize header keys to lowercase
    const normalizedHeaders = {}
    if (headers) {
      for (const [k, v] of Object.entries(headers)) {
        normalizedHeaders[k.toLowerCase()] = v
      }
    }

    try {
      const wh = new Webhook(webhookKey)
      return wh.verify(rawBody, normalizedHeaders)
    } catch (err) {
      console.error('[Dodo Payments] Webhook verification failed:', err.message)
      throw new Error(`Invalid Dodo webhook signature: ${err.message}`)
    }
  }
}

export const dodoProvider = new DodoProvider()
