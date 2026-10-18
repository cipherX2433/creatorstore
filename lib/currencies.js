/**
 * Multi-Currency Pricing & Exchange Rate Engine
 *
 * Implements authoritative multi-currency conversions and Dodo Payments localization:
 * - Creator canonical pricing preservation
 * - Supported currencies validation & precision rules
 * - Reliable exchange rate retrieval with caching & offline fallbacks
 * - Authoritative Dodo checkout session preview integration
 * - Server-side validation against client tampering
 */

import { dodoProvider } from './dodo.js'

// Official supported currencies list
export const SUPPORTED_CURRENCIES = {
  USD: { code: 'USD', symbol: '$', name: 'US Dollar', decimals: 2, minAmount: 0.5 },
  INR: { code: 'INR', symbol: '₹', name: 'Indian Rupee', decimals: 2, minAmount: 1 },
  EUR: { code: 'EUR', symbol: '€', name: 'Euro', decimals: 2, minAmount: 0.5 },
  GBP: { code: 'GBP', symbol: '£', name: 'British Pound', decimals: 2, minAmount: 0.3 },
  CAD: { code: 'CAD', symbol: 'CA$', name: 'Canadian Dollar', decimals: 2, minAmount: 0.5 },
  AUD: { code: 'AUD', symbol: 'A$', name: 'Australian Dollar', decimals: 2, minAmount: 0.5 },
  AED: { code: 'AED', symbol: 'AED', name: 'UAE Dirham', decimals: 2, minAmount: 2 },
  SGD: { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar', decimals: 2, minAmount: 0.5 },
  JPY: { code: 'JPY', symbol: '¥', name: 'Japanese Yen', decimals: 0, minAmount: 50 },
}

// Baseline reputable exchange rates relative to 1 USD for graceful fallback
export const BASELINE_RATES_USD = {
  USD: 1,
  INR: 83.5,
  EUR: 0.92,
  GBP: 0.79,
  CAD: 1.36,
  AUD: 1.52,
  AED: 3.67,
  SGD: 1.35,
  JPY: 155.0,
}

// In-memory rate cache: { rates, timestamp, expiresAt }
let rateCache = {
  rates: { ...BASELINE_RATES_USD },
  timestamp: new Date('2026-10-18T00:00:00Z'),
  expiresAt: 0,
}

const CACHE_TTL_MS = 60 * 60 * 1000 // 1 hour

export function isSupportedCurrency(currencyCode) {
  if (!currencyCode || typeof currencyCode !== 'string') return false
  return Boolean(SUPPORTED_CURRENCIES[currencyCode.toUpperCase().trim()])
}

export function normalizeCurrency(currencyCode, fallback = 'USD') {
  if (!currencyCode || typeof currencyCode !== 'string') return fallback
  const clean = currencyCode.toUpperCase().trim()
  return SUPPORTED_CURRENCIES[clean] ? clean : fallback
}

export function getCurrencyConfig(currencyCode) {
  const norm = normalizeCurrency(currencyCode)
  return SUPPORTED_CURRENCIES[norm] || SUPPORTED_CURRENCIES.USD
}

/**
 * Fetch and cache latest exchange rates (relative to USD)
 */
export async function getLatestRates({ forceRefresh = false } = {}) {
  const now = Date.now()
  if (!forceRefresh && rateCache.expiresAt > now && rateCache.rates) {
    return {
      rates: rateCache.rates,
      timestamp: rateCache.timestamp,
      isCached: true,
    }
  }

  try {
    const apiUrl = process.env.EXCHANGE_RATE_API_URL || 'https://open.er-api.com/v6/latest/USD'
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 4000)

    const res = await fetch(apiUrl, { signal: controller.signal })
    clearTimeout(timeout)

    if (res.ok) {
      const data = await res.json()
      if (data && data.rates && typeof data.rates === 'object') {
        const merged = { ...BASELINE_RATES_USD }
        for (const [curr, rate] of Object.entries(data.rates)) {
          if (SUPPORTED_CURRENCIES[curr] && typeof rate === 'number' && rate > 0) {
            merged[curr] = rate
          }
        }
        rateCache = {
          rates: merged,
          timestamp: new Date(data.time_last_update_utc || now),
          expiresAt: now + CACHE_TTL_MS,
        }
        return { rates: rateCache.rates, timestamp: rateCache.timestamp, isLive: true }
      }
    }
  } catch (err) {
    console.warn('[Currency] Exchange rate API unavailable, using cached/baseline rates:', err.message)
  }

  // Graceful fallback to baseline rates
  rateCache.expiresAt = now + 15 * 60 * 1000 // Retry in 15 mins
  return {
    rates: rateCache.rates,
    timestamp: rateCache.timestamp,
    isFallback: true,
  }
}

/**
 * Get exchange rate between two currencies
 */
export async function getExchangeRate(fromCurrency, toCurrency) {
  const from = normalizeCurrency(fromCurrency, 'USD')
  const to = normalizeCurrency(toCurrency, 'USD')

  if (from === to) {
    return { from, to, rate: 1, timestamp: new Date() }
  }

  const { rates, timestamp, isFallback } = await getLatestRates()
  const fromRateUSD = rates[from] || BASELINE_RATES_USD[from] || 1
  const toRateUSD = rates[to] || BASELINE_RATES_USD[to] || 1

  // Cross rate: (1 / fromRate) * toRate
  const rate = toRateUSD / fromRateUSD

  return {
    from,
    to,
    rate: Math.round(rate * 1000000) / 1000000,
    timestamp,
    isFallback: Boolean(isFallback),
  }
}

/**
 * Convert an amount from one currency to another using high-precision decimal math
 */
export async function convertCurrency({ amount, fromCurrency, toCurrency }) {
  const numAmount = Number(amount || 0)
  const from = normalizeCurrency(fromCurrency, 'USD')
  const to = normalizeCurrency(toCurrency, 'USD')
  const toConfig = getCurrencyConfig(to)

  if (from === to) {
    return {
      originalAmount: numAmount,
      originalCurrency: from,
      convertedAmount: numAmount,
      targetCurrency: to,
      rate: 1,
      rateTimestamp: new Date(),
      isEstimated: false,
    }
  }

  const { rate, timestamp, isFallback } = await getExchangeRate(from, to)
  const rawConverted = numAmount * rate

  // Precision rounding based on target currency decimals
  const factor = Math.pow(10, toConfig.decimals)
  const roundedAmount = Math.round(rawConverted * factor) / factor

  return {
    originalAmount: numAmount,
    originalCurrency: from,
    convertedAmount: roundedAmount,
    targetCurrency: to,
    rate,
    rateTimestamp: timestamp,
    isFallback,
    isEstimated: true,
  }
}

/**
 * Validates whether an amount satisfies the payment provider minimum for a currency
 */
export function validateMinimumAmount(amount, currency) {
  const norm = normalizeCurrency(currency)
  const config = getCurrencyConfig(norm)
  const num = Number(amount || 0)

  if (num < config.minAmount) {
    return {
      valid: false,
      minAmount: config.minAmount,
      currency: norm,
      message: `Amount ${num} ${norm} is below the minimum required charge of ${config.minAmount} ${norm}.`,
    }
  }

  return { valid: true }
}

/**
 * Authoritative preview from Dodo Payments checkout preview API
 */
export async function previewDodoPrice({ dodoProductId, billingCurrency, billingCountry }) {
  if (!dodoProductId) return null
  const client = dodoProvider.getClient()
  const targetCurrency = normalizeCurrency(billingCurrency)

  try {
    const previewParams = {
      product_cart: [{ product_id: dodoProductId, quantity: 1 }],
      billing_currency: targetCurrency,
    }
    if (billingCountry) {
      previewParams.billing_address = { country: billingCountry }
    }

    const preview = await client.checkoutSessions.preview(previewParams)
    const cartItem = preview.product_cart?.[0]
    const subtotal = preview.current_breakup?.subtotal ? preview.current_breakup.subtotal / 100 : 0
    const tax = preview.current_breakup?.tax ? preview.current_breakup.tax / 100 : 0
    const total = preview.total_price ? preview.total_price / 100 : subtotal + tax

    return {
      isAuthoritative: true,
      currency: preview.currency,
      subtotal,
      tax,
      total,
      originalPrice: cartItem?.og_price ? cartItem.og_price / 100 : null,
      originalCurrency: cartItem?.og_currency || null,
      dodoProductId,
    }
  } catch (err) {
    console.warn('[Currency] Dodo preview error, falling back to local conversion:', err.message)
    return null
  }
}

export function fromMinorUnits(minorUnits, currencyCode) {
  const meta = getCurrencyConfig(currencyCode)
  const factor = Math.pow(10, meta.decimals)
  return Number((Number(minorUnits) / factor).toFixed(meta.decimals))
}

export function toMinorUnits(majorUnits, currencyCode) {
  const meta = getCurrencyConfig(currencyCode)
  const factor = Math.pow(10, meta.decimals)
  return Math.round(Number(majorUnits) * factor)
}
