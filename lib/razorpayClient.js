'use client'

/**
 * Loads the Razorpay Checkout script dynamically on demand for subscription checkout in India.
 */
export function loadRazorpayScript() {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') return resolve(false)
    if (window.Razorpay) return resolve(true)

    const existingScript = document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]')
    if (existingScript) {
      existingScript.addEventListener('load', () => resolve(true))
      existingScript.addEventListener('error', () => resolve(false))
      return
    }

    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.async = true
    script.onload = () => resolve(true)
    script.onerror = () => {
      console.error('Failed to load Razorpay checkout script')
      resolve(false)
    }
    document.body.appendChild(script)
  })
}

/**
 * Safely extracts diagnostic error details from Razorpay's payment.failed event.
 * Handles nested, non-enumerable, Error instances, and empty objects without logging secrets.
 */
export function extractRazorpayErrorInfo(resp, fallbackSubscriptionId = null) {
  const sourceObj = resp?.detail || resp || {}
  const raw = sourceObj.error || sourceObj

  const isRawObj = raw && typeof raw === 'object'

  // Extract core fields with fallback checks
  const code =
    (isRawObj && raw.code) ||
    sourceObj.code ||
    (raw instanceof Error ? raw.name : null) ||
    'PAYMENT_FAILED'

  const description =
    (isRawObj && (raw.description || raw.message)) ||
    sourceObj.description ||
    sourceObj.message ||
    (typeof raw === 'string' ? raw : null) ||
    'Payment could not be completed.'

  const source = (isRawObj && raw.source) || sourceObj.source || null
  const step = (isRawObj && raw.step) || sourceObj.step || null
  const reason = (isRawObj && raw.reason) || sourceObj.reason || null

  const metadata = (isRawObj && raw.metadata) || sourceObj.metadata || {}
  const paymentId =
    metadata.payment_id ||
    metadata.paymentId ||
    (isRawObj && (raw.payment_id || raw.paymentId)) ||
    sourceObj.payment_id ||
    sourceObj.paymentId ||
    null

  const orderId =
    metadata.order_id ||
    metadata.orderId ||
    (isRawObj && (raw.order_id || raw.orderId)) ||
    sourceObj.order_id ||
    sourceObj.orderId ||
    null

  const subscriptionId =
    metadata.subscription_id ||
    metadata.subscriptionId ||
    (isRawObj && (raw.subscription_id || raw.subscriptionId)) ||
    sourceObj.subscription_id ||
    sourceObj.subscriptionId ||
    fallbackSubscriptionId ||
    null

  const safeDetails = {
    provider: 'razorpay',
    status: 'failed',
    code,
    description,
    source,
    step,
    reason,
    paymentId,
    orderId,
    subscriptionId,
  }

  // Safely extract any other scalar/string properties without copying raw nested objects or sensitive keys
  const SENSITIVE_KEY_RE = /(key|secret|password|token|auth|credential|card_number|cvv)/i
  try {
    if (isRawObj) {
      const propNames = new Set([
        ...Object.keys(raw),
        ...Object.getOwnPropertyNames(raw),
      ])
      for (const prop of propNames) {
        if (
          SENSITIVE_KEY_RE.test(prop) ||
          prop === 'metadata' ||
          prop === 'error' ||
          prop === 'stack'
        ) {
          continue
        }
        if (safeDetails[prop] === undefined) {
          const val = raw[prop]
          if (
            val !== undefined &&
            val !== null &&
            (typeof val === 'string' || typeof val === 'number' || typeof val === 'boolean')
          ) {
            safeDetails[prop] = val
          }
        }
      }
    }
  } catch (e) {}

  // Generate a clean, user-friendly customer message without leaking server/internal details
  const SENSITIVE_MSG_RE = /(secret|password|bearer|credential|key_id|private_key)/i
  let customerMessage = 'Payment was not completed. Please try again or use another payment method.'
  if (description && description !== 'Payment could not be completed.' && !SENSITIVE_MSG_RE.test(description)) {
    customerMessage = description
  } else if (reason) {
    customerMessage = `Payment failed: ${String(reason).replace(/_/g, ' ')}`
  }

  return {
    code,
    description,
    source,
    step,
    reason,
    paymentId,
    orderId,
    subscriptionId,
    customerMessage,
    safeDetails,
  }
}

/**
 * Opens the Razorpay modal for subscription checkout and executes the verify API upon payment completion.
 * Note: For Razorpay Subscriptions, 'amount' and 'currency' are determined by the plan mandate on the server
 * and must NOT be passed in options to avoid options validation conflicts.
 */
export async function openRazorpaySubscriptionCheckout({
  keyId,
  subscriptionId,
  planName = 'CreatorStore Subscription',
  billingInterval = 'monthly',
  customerEmail = '',
  customerName = '',
  customerContact = '',
  notes = {},
  onSuccess,
  onError,
  onDismiss,
}) {
  const activeKeyId = (keyId || (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_RAZORPAY_KEY_ID) || '').trim()
  if (!activeKeyId) {
    throw new Error('Razorpay client key ID is missing. Please contact support.')
  }
  if (!subscriptionId) {
    throw new Error('Razorpay subscription ID is missing. Unable to open checkout.')
  }

  const loaded = await loadRazorpayScript()
  if (!loaded || !window.Razorpay) {
    throw new Error('Unable to load Razorpay payment SDK. Please check your internet connection or try again.')
  }

  // In Razorpay Subscriptions Checkout, amount and currency are defined by the plan itself
  const options = {
    key: activeKeyId,
    subscription_id: subscriptionId,
    name: 'CreatorStore',
    description: `${planName} (${billingInterval.toLowerCase()})`,
    handler: async function (response) {
      if (onSuccess) {
        await onSuccess({
          razorpay_subscription_id: response.razorpay_subscription_id || subscriptionId,
          razorpay_payment_id: response.razorpay_payment_id,
          razorpay_signature: response.razorpay_signature,
        })
      }
    },
    modal: {
      ondismiss: function () {
        console.log('[Razorpay] Checkout modal dismissed by user.')
        if (onDismiss) onDismiss()
      },
      escape: true,
      backdropclose: false,
    },
    prefill: {
      email: customerEmail || undefined,
      name: customerName || undefined,
      contact: customerContact || undefined,
    },
    notes: {
      platform: 'CreatorStore',
      plan: planName,
      billingInterval,
      ...notes,
    },
    theme: {
      color: '#FF4B1F',
    },
  }

  const rzp = new window.Razorpay(options)
  rzp.on('payment.failed', function (resp) {
    const errorInfo = extractRazorpayErrorInfo(resp, subscriptionId)
    console.warn('[Razorpay Subscription Checkout] Payment failed (expected provider rejection):', errorInfo.safeDetails)
    if (onError) onError(errorInfo)
  })
  rzp.open()
}

/**
 * Opens the Razorpay modal for a one-time digital product purchase.
 * Strict rules:
 * - Uses Razorpay standard Orders API (order_id), NEVER subscription API.
 * - Server provides authoritative amount in paise and order_id.
 * - Does NOT grant access merely on modal close.
 */
export async function openRazorpayProductCheckout({
  keyId,
  orderId,
  amount,
  currency = 'INR',
  productTitle = 'Product Purchase',
  customerEmail = '',
  customerName = '',
  notes = {},
  onSuccess,
  onError,
  onDismiss,
}) {
  const activeKeyId = (keyId || (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_RAZORPAY_KEY_ID) || '').trim()
  if (!activeKeyId) {
    throw new Error('Razorpay client key ID is missing. Please contact support.')
  }
  if (!orderId) {
    throw new Error('Razorpay order ID is missing. Unable to open checkout.')
  }

  const loaded = await loadRazorpayScript()
  if (!loaded || !window.Razorpay) {
    throw new Error('Unable to load Razorpay payment SDK. Please check your internet connection or try again.')
  }

  const options = {
    key: activeKeyId,
    amount: Math.round(Number(amount)), // in paise
    currency: (currency || 'INR').toUpperCase(),
    name: 'CreatorStore',
    description: productTitle || 'Digital Product',
    order_id: orderId,
    handler: async function (response) {
      if (onSuccess) {
        await onSuccess({
          razorpay_order_id: response.razorpay_order_id || orderId,
          razorpay_payment_id: response.razorpay_payment_id,
          razorpay_signature: response.razorpay_signature,
        })
      }
    },
    modal: {
      ondismiss: function () {
        console.log('[Razorpay Product Checkout] Modal dismissed by customer.')
        if (onDismiss) onDismiss()
      },
      escape: true,
      backdropclose: false,
    },
    prefill: {
      email: customerEmail || undefined,
      name: customerName || undefined,
    },
    notes: {
      platform: 'CreatorStore',
      orderId,
      ...notes,
    },
    theme: {
      color: '#000000',
    },
  }

  const rzp = new window.Razorpay(options)
  rzp.on('payment.failed', function (resp) {
    const errorInfo = extractRazorpayErrorInfo(resp, null)
    console.warn('[Razorpay Product Checkout] Payment failed (expected provider rejection):', errorInfo.safeDetails)
    if (onError) onError(errorInfo)
  })
  rzp.open()
  return rzp
}

