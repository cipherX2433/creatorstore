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
   * Create a hosted checkout session for a digital product purchase
   */
  async createProductCheckoutSession({
    orderId,
    productId,
    productTitle,
    amount,
    currency = 'USD',
    customerEmail,
    customerName,
    returnUrl,
    metadata = {},
  }) {
    if (!orderId) throw new Error('orderId is required')
    if (!productId) throw new Error('productId is required')

    const client = this.getClient()
    const resolvedReturnUrl = returnUrl || getDodoReturnUrl('product')

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
      return_url: `${resolvedReturnUrl}?order_id=${encodeURIComponent(orderId)}`,
      cancel_url: `${getDodoBaseUrl()}/p/${metadata.productSlug || productId}?canceled=true`,
      metadata: {
        orderId,
        productId,
        checkoutType: 'PRODUCT_PURCHASE',
        ...metadata,
      },
    }

    console.log(`[Dodo Payments] Creating product checkout session for order ${orderId} (Product: ${productId})`)
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
   * Retrieve checkout session details by session ID
   */
  async getCheckoutSession(sessionId) {
    if (!sessionId) return null
    const client = this.getClient()
    return await client.checkoutSessions.retrieve(sessionId)
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
  async cancelSubscription(subscriptionId, { cancelAtNextBillingDate = true } = {}) {
    if (!subscriptionId) throw new Error('subscriptionId is required')
    const client = this.getClient()
    return await client.subscriptions.update(subscriptionId, {
      cancel_at_next_billing_date: cancelAtNextBillingDate,
    })
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
