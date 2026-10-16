import crypto from 'crypto'
import fs from 'fs'
import path from 'path'
import { getAppUrl, sanitizeBrowserUrl } from '../config/site.js'

/**
 * PayPal Payment Provider for International CreatorStore Subscriptions & Orders
 *
 * Implements direct PayPal checkout flow, bypassing Razorpay for international USD purchases.
 * Supports PayPal REST API (v1 Subscriptions & v2 Orders).
 */

function getEnvVar(key) {
  try {
    const envPath = path.join(process.cwd(), '.env')
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf8')
      const match = content.match(new RegExp(`^${key}=(.*)$`, 'm'))
      if (match && match[1]) {
        const val = match[1].trim()
        if (val) return val
      }
    }
  } catch (e) { }
  return (process.env[key] || '').trim()
}

/**
 * Resolves the trusted base URL for PayPal return, cancel, and approval redirects.
 * Prioritizes explicit overrides, then canonical NEXT_PUBLIC_APP_URL / APP_URL.
 * Never produces 0.0.0.0.
 */
export function getPayPalBaseUrl() {
  const explicit = getEnvVar('PAYPAL_RETURN_URL_BASE') || getEnvVar('PAYPAL_BASE_URL') || getEnvVar('PAYPAL_APP_URL')
  if (explicit) {
    return sanitizeBrowserUrl(explicit.replace(/\/+$/, ''))
  }
  return sanitizeBrowserUrl(getAppUrl())
}

export function getPayPalReturnUrl() {
  const explicit = getEnvVar('PAYPAL_RETURN_URL')
  if (explicit) return sanitizeBrowserUrl(explicit)
  return `${getPayPalBaseUrl()}/api/creator/subscription/paypal/return`
}

export function getPayPalCancelUrl() {
  const explicit = getEnvVar('PAYPAL_CANCEL_URL')
  if (explicit) return sanitizeBrowserUrl(explicit)
  return `${getPayPalBaseUrl()}/dashboard/settings/billing?canceled=true`
}

export function getPayPalWebhookUrl() {
  const explicit = getEnvVar('PAYPAL_WEBHOOK_URL')
  if (explicit) return sanitizeBrowserUrl(explicit)
  const webhookBase = getEnvVar('PAYPAL_WEBHOOK_BASE') || getPayPalBaseUrl()
  return `${sanitizeBrowserUrl(webhookBase).replace(/\/+$/, '')}/api/webhooks/paypal`
}

export function isPlaceholderPayPalId(id) {
  if (!id || typeof id !== 'string') return true
  const trimmed = id.trim().toLowerCase()
  return (
    trimmed.startsWith('your_') ||
    trimmed.includes('placeholder') ||
    trimmed === 'your_paypal_client_id' ||
    trimmed === 'your_paypal_client_secret' ||
    trimmed === 'your_paypal_webhook_id'
  )
}

export function isPayPalConfigured() {
  const clientId = getEnvVar('PAYPAL_CLIENT_ID')
  const secret = getEnvVar('PAYPAL_CLIENT_SECRET')
  return Boolean(
    clientId &&
    secret &&
    clientId !== secret && // A valid client ID and secret are never identical
    !isPlaceholderPayPalId(clientId) &&
    !isPlaceholderPayPalId(secret)
  )
}

export function getPayPalMode() {
  const mode = getEnvVar('PAYPAL_MODE') || getEnvVar('PAYPAL_ENV') || 'sandbox'
  return mode.toLowerCase() === 'live' || mode.toLowerCase() === 'production' ? 'live' : 'sandbox'
}

export function allowPayPalMockFallbacks() {
  const mode = getPayPalMode()
  const mockFlag = getEnvVar('PAYPAL_MOCK') === 'true'
  const isDevOrTest = process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test' || !process.env.NODE_ENV
  const liveConfigured = mode === 'live' && isPayPalConfigured()

  return (isDevOrTest || mockFlag || !isPayPalConfigured()) && !liveConfigured
}

function getPayPalApiBase(overrideMode = null) {
  const mode = overrideMode || getPayPalMode()
  return mode === 'live'
    ? 'https://api-m.paypal.com'
    : 'https://api-m.sandbox.paypal.com'
}

/**
 * Returns safe environment variable diagnostics (presence & length only, no secrets)
 */
export function getPayPalConfigDiagnostics() {
  const clientId = getEnvVar('PAYPAL_CLIENT_ID')
  const secret = getEnvVar('PAYPAL_CLIENT_SECRET')
  const mode = getPayPalMode()
  const webhookId = getEnvVar('PAYPAL_WEBHOOK_ID')
  const creatorPlanId = getEnvVar('PAYPAL_CREATOR_MONTHLY_PLAN_ID')
  const proPlanId = getEnvVar('PAYPAL_PRO_MONTHLY_PLAN_ID')
  const isIdentical = Boolean(clientId && secret && clientId === secret)

  return {
    environment: mode,
    apiBase: getPayPalApiBase(),
    isConfigured: isPayPalConfigured(),
    allowMockFallbacks: allowPayPalMockFallbacks(),
    diagnosticsAlert: isIdentical
      ? 'CRITICAL_CONFIG_ERROR: PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET are identical. In PayPal Developer Dashboard, the Secret is a distinct value revealed by clicking Show under your app credentials.'
      : null,
    variables: {
      PAYPAL_CLIENT_ID: {
        present: Boolean(clientId),
        length: clientId ? clientId.length : 0,
        isPlaceholder: isPlaceholderPayPalId(clientId),
      },
      PAYPAL_CLIENT_SECRET: {
        present: Boolean(secret),
        length: secret ? secret.length : 0,
        isPlaceholder: isPlaceholderPayPalId(secret),
        identicalToClientId: isIdentical,
      },
      PAYPAL_MODE: {
        present: Boolean(getEnvVar('PAYPAL_MODE') || getEnvVar('PAYPAL_ENV')),
        value: mode,
      },
      PAYPAL_WEBHOOK_ID: {
        present: Boolean(webhookId),
        length: webhookId ? webhookId.length : 0,
        isPlaceholder: isPlaceholderPayPalId(webhookId),
        isUrl: Boolean(webhookId && webhookId.startsWith('http')),
      },
      PAYPAL_CREATOR_MONTHLY_PLAN_ID: {
        present: Boolean(creatorPlanId),
        length: creatorPlanId ? creatorPlanId.length : 0,
        value: creatorPlanId || 'P-06L05256BW4479128NLFBZCA',
      },
      PAYPAL_PRO_MONTHLY_PLAN_ID: {
        present: Boolean(proPlanId),
        length: proPlanId ? proPlanId.length : 0,
        value: proPlanId || 'P-19001753VV158844WNLFB3ZA',
      },
    },
  }
}

let detectedWorkingMode = null

export const paypalProvider = {
  isConfigured() {
    return isPayPalConfigured()
  },

  getMode() {
    return detectedWorkingMode || getPayPalMode()
  },

  get isLive() {
    return (detectedWorkingMode || getPayPalMode()) === 'live' && isPayPalConfigured()
  },

  getApiBase() {
    return getPayPalApiBase(detectedWorkingMode || getPayPalMode())
  },

  /**
   * Resolve configured recurring subscription plan ID for a given tier
   */
  resolveSubscriptionPlanId({ plan = 'PRO', interval = 'monthly' } = {}) {
    const normPlan = String(plan || 'PRO').toUpperCase().trim()
    if (normPlan === 'CREATOR' || normPlan === 'CREATOR_MONTHLY') {
      return getEnvVar('PAYPAL_CREATOR_MONTHLY_PLAN_ID') || 'P-06L05256BW4479128NLFBZCA'
    }
    return getEnvVar('PAYPAL_PRO_MONTHLY_PLAN_ID') || 'P-19001753VV158844WNLFB3ZA'
  },

  /**
   * Obtain an OAuth 2.0 access token from PayPal with safe diagnostic logging
   */
  async getAccessToken() {
    if (!isPayPalConfigured()) {
      const clientId = getEnvVar('PAYPAL_CLIENT_ID')
      const secret = getEnvVar('PAYPAL_CLIENT_SECRET')
      if (clientId && secret && clientId === secret) {
        console.warn(`[PayPal] Configuration Alert: PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET are identical (${clientId.length} chars). In the PayPal Developer Dashboard, Client ID and Secret are two distinct keys. Ensure you click 'Show' on Secret in your app dashboard.`)
      }
      if (allowPayPalMockFallbacks()) {
        return 'mock_access_token_' + crypto.randomBytes(8).toString('hex')
      }
      if (clientId && secret && clientId === secret) {
        throw new Error('PayPal is misconfigured: PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET are identical. Please configure the distinct Secret from your PayPal Developer Dashboard.')
      }
      throw new Error('PayPal is not configured. Missing PAYPAL_CLIENT_ID or PAYPAL_CLIENT_SECRET.')
    }

    const clientId = getEnvVar('PAYPAL_CLIENT_ID')
    const secret = getEnvVar('PAYPAL_CLIENT_SECRET')
    const auth = Buffer.from(`${clientId}:${secret}`).toString('base64')
    const configuredMode = detectedWorkingMode || getPayPalMode()
    const apiBase = getPayPalApiBase(configuredMode)

    let res = await fetch(`${apiBase}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    })

    if (!res.ok) {
      let errData = {}
      try {
        errData = await res.json()
      } catch (e) {
        errData = { error: res.statusText }
      }

      console.warn(`[PayPal] OAuth error: HTTP ${res.status} ${res.statusText} on environment "${configuredMode}" (${apiBase}) - safe details:`, {
        error: errData.error,
        error_description: errData.error_description,
      })

      // Sandbox vs. Live Mismatch Detection:
      // If configured as sandbox but rejected with invalid_client, verify if credentials belong to Live.
      if (configuredMode === 'sandbox' && errData.error === 'invalid_client') {
        try {
          const liveCheck = await fetch('https://api-m.paypal.com/v1/oauth2/token', {
            method: 'POST',
            headers: {
              Authorization: `Basic ${auth}`,
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: 'grant_type=client_credentials',
          })
          if (liveCheck.ok) {
            console.log('[PayPal] Sandbox/Live mismatch detected: Credentials authenticate successfully with PayPal Live. Auto-switching to Live environment.')
            detectedWorkingMode = 'live'
            const liveData = await liveCheck.json()
            return liveData.access_token
          }
        } catch (probeErr) { }
      }

      if (allowPayPalMockFallbacks()) {
        console.warn('[PayPal] Falling back to mock access token for non-live environment')
        return 'mock_access_token_' + crypto.randomBytes(8).toString('hex')
      }

      throw new Error(`PayPal authentication failed: HTTP ${res.status} (${errData.error || res.statusText}) on ${configuredMode}`)
    }

    const data = await res.json()
    return data.access_token
  },

  /**
   * Create a genuine recurring subscription via PayPal Subscriptions API (/v1/billing/subscriptions)
   */
  async createSubscription({
    creatorId,
    planId,
    planName = 'Pro Plan',
    customerEmail = '',
    returnUrl,
    cancelUrl,
  }) {
    const effectivePlanId = planId || this.resolveSubscriptionPlanId({ plan: planName })
    const effectiveReturnUrl = returnUrl || getPayPalReturnUrl()
    const effectiveCancelUrl = cancelUrl || getPayPalCancelUrl()

    if (!isPayPalConfigured()) {
      throw new Error('PayPal payment provider is not configured. Valid PAYPAL_CLIENT_ID and distinct PAYPAL_CLIENT_SECRET are required.')
    }

    const accessToken = await this.getAccessToken()
    const apiBase = this.getApiBase()

    const subscriptionPayload = {
      plan_id: effectivePlanId,
      custom_id: creatorId,
      application_context: {
        brand_name: 'CreatorStore',
        locale: 'en-US',
        shipping_preference: 'NO_SHIPPING',
        user_action: 'SUBSCRIBE_NOW',
        return_url: effectiveReturnUrl,
        cancel_url: effectiveCancelUrl,
      },
    }

    if (customerEmail) {
      subscriptionPayload.subscriber = { email_address: customerEmail }
    }

    const res = await fetch(`${apiBase}/v1/billing/subscriptions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(subscriptionPayload),
    })

    const subData = await res.json()
    if (!res.ok) {
      console.error(`[PayPal] Create subscription error on ${apiBase}:`, {
        name: subData.name,
        message: subData.message,
        details: subData.details,
      })
      throw new Error(subData.message || 'Failed to create PayPal subscription')
    }

    const approveLink = subData.links?.find((l) => l.rel === 'approve')
    return {
      id: subData.id,
      status: subData.status,
      approvalUrl: approveLink ? approveLink.href : null,
      planId: subData.plan_id || effectivePlanId,
    }
  },

  /**
   * Fetch live subscription status & billing details from PayPal Subscriptions API
   */
  async getSubscription(subscriptionId) {
    if (!subscriptionId) throw new Error('PayPal subscriptionId is required')

    // Reject mock subscription IDs
    if (String(subscriptionId).startsWith('I-mock-') || String(subscriptionId).includes('mock')) {
      throw new Error('Invalid PayPal subscription: Mock identifiers are not accepted for live/sandbox verification')
    }

    if (!isPayPalConfigured()) {
      throw new Error('PayPal payment provider is not configured')
    }

    const accessToken = await this.getAccessToken()
    const apiBase = this.getApiBase()

    const res = await fetch(`${apiBase}/v1/billing/subscriptions/${subscriptionId}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    })

    const data = await res.json()
    if (!res.ok) {
      console.error(`[PayPal] Get subscription error on ${apiBase}:`, data)
      throw new Error(data.message || 'Failed to fetch PayPal subscription')
    }

    return data
  },

  /**
   * Cancel an active PayPal subscription
   */
  async cancelSubscription(subscriptionId, reason = 'Customer requested cancellation') {
    if (!subscriptionId) throw new Error('PayPal subscriptionId is required')

    if (!isPayPalConfigured() || String(subscriptionId).startsWith('I-mock-')) {
      return { id: subscriptionId, status: 'CANCELLED' }
    }

    const accessToken = await this.getAccessToken()
    const apiBase = this.getApiBase()

    const res = await fetch(`${apiBase}/v1/billing/subscriptions/${subscriptionId}/cancel`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ reason }),
    })

    if (!res.ok && res.status !== 204) {
      const data = await res.json().catch(() => ({}))
      console.error(`[PayPal] Cancel subscription error:`, data)
      throw new Error(data.message || 'Failed to cancel PayPal subscription')
    }

    return { id: subscriptionId, status: 'CANCELLED' }
  },

  /**
   * Create a PayPal Order for international checkout (one-time or order fallback)
   */
  async createOrder({
    creatorId,
    planName,
    amount,
    currency = 'USD',
    billingInterval = 'MONTHLY',
    customerEmail = '',
    returnUrl,
    cancelUrl,
  }) {
    const normCurrency = (currency || 'USD').toUpperCase()
    const numAmount = Number(amount)
    const formattedAmount = numAmount.toFixed(2)

    const effectiveReturnUrl = returnUrl || getPayPalReturnUrl()
    const effectiveCancelUrl = cancelUrl || getPayPalCancelUrl()

    if (!isPayPalConfigured()) {
      throw new Error('PayPal payment provider is not configured. Valid PAYPAL_CLIENT_ID and distinct PAYPAL_CLIENT_SECRET are required.')
    }

    const accessToken = await this.getAccessToken()
    const apiBase = this.getApiBase()

    const orderPayload = {
      intent: 'CAPTURE',
      purchase_units: [
        {
          reference_id: `sub_${creatorId ? creatorId.slice(0, 12) : 'creator'}_${Date.now()}`,
          description: `CreatorStore ${planName} Plan (${billingInterval})`,
          custom_id: creatorId,
          amount: {
            currency_code: normCurrency,
            value: formattedAmount,
          },
        },
      ],
      application_context: {
        brand_name: 'CreatorStore',
        locale: 'en-US',
        landing_page: 'BILLING',
        user_action: 'PAY_NOW',
        return_url: effectiveReturnUrl,
        cancel_url: effectiveCancelUrl,
      },
    }

    if (customerEmail) {
      orderPayload.payer = { email_address: customerEmail }
    }

    const res = await fetch(`${apiBase}/v2/checkout/orders`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(orderPayload),
    })

    const orderData = await res.json()
    if (!res.ok) {
      console.error(`[PayPal] Create order error on ${apiBase}:`, orderData)
      throw new Error(orderData.message || 'Failed to create PayPal order')
    }

    const approveLink = orderData.links?.find((l) => l.rel === 'approve' || l.rel === 'payer-action')
    return {
      id: orderData.id,
      status: orderData.status,
      approvalUrl: approveLink ? approveLink.href : null,
      amount: formattedAmount,
      currency: normCurrency,
    }
  },

  /**
   * Capture an authorized PayPal Order
   */
  async captureOrder(orderId) {
    if (!orderId) throw new Error('PayPal orderId is required to capture payment')

    if (!isPayPalConfigured() || orderId.startsWith('order_paypal_mock_')) {
      if (allowPayPalMockFallbacks() || orderId.startsWith('order_paypal_mock_')) {
        return {
          id: orderId,
          status: 'COMPLETED',
          payer: {
            email_address: 'customer@example.com',
            payer_id: 'PAYER_MOCK_ID',
          },
          purchase_units: [
            {
              payments: {
                captures: [
                  {
                    id: `capture_mock_${crypto.randomBytes(6).toString('hex')}`,
                    status: 'COMPLETED',
                  },
                ],
              },
            },
          ],
        }
      }
      throw new Error('PayPal is not configured')
    }

    const accessToken = await this.getAccessToken()
    const apiBase = this.getApiBase()

    const res = await fetch(`${apiBase}/v2/checkout/orders/${orderId}/capture`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    })

    const captureData = await res.json()
    if (!res.ok) {
      console.error(`[PayPal] Capture order error on ${apiBase}:`, captureData)
      throw new Error(captureData.message || 'Failed to capture PayPal payment')
    }

    return captureData
  },

  /**
   * Verify authenticity of a PayPal webhook event
   */
  async verifyWebhook({ headers, rawBody, webhookId = null }) {
    const effectiveWebhookId = webhookId || getEnvVar('PAYPAL_WEBHOOK_ID')

    if (!isPayPalConfigured() || !effectiveWebhookId || isPlaceholderPayPalId(effectiveWebhookId)) {
      if (allowPayPalMockFallbacks()) {
        const parsed = JSON.parse(rawBody)
        return { verification_status: 'SUCCESS', event: parsed }
      }
      throw new Error('PayPal webhook verification unconfigured. Missing PAYPAL_WEBHOOK_ID.')
    }

    const accessToken = await this.getAccessToken()
    const apiBase = this.getApiBase()

    const verifyPayload = {
      auth_algo: headers['paypal-auth-algo'],
      cert_url: headers['paypal-cert-url'],
      transmission_id: headers['paypal-transmission-id'],
      transmission_sig: headers['paypal-transmission-sig'],
      transmission_time: headers['paypal-transmission-time'],
      webhook_id: effectiveWebhookId,
      webhook_event: JSON.parse(rawBody),
    }

    const res = await fetch(`${apiBase}/v1/notifications/verify-webhook-signature`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(verifyPayload),
    })

    const result = await res.json()
    if (!res.ok || result.verification_status !== 'SUCCESS') {
      throw new Error('Invalid PayPal webhook signature')
    }

    return { verification_status: 'SUCCESS', event: JSON.parse(rawBody) }
  },
}

