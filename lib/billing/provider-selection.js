import { isValidCountryCode, normalizeCountryCode } from '../countries.js'

/**
 * Centralized Server-Side Subscription Payment Provider Selection
 *
 * Rules:
 * - India ('IN') => 'razorpay'
 * - All other countries => 'dodo'
 * - Provider is strictly determined by the authenticated user's database-persisted country.
 * - Client-supplied provider, country, amount, or currency are NEVER trusted.
 * - Applies ONLY to subscription billing (digital product purchases remain on Dodo).
 */

export const SUBSCRIPTION_PROVIDERS = {
  RAZORPAY: 'razorpay',
  DODO: 'dodo',
}

/**
 * Returns the payment provider for a given ISO 3166-1 alpha-2 country code.
 * Throws an error or returns null if country is missing/invalid.
 */
export function getSubscriptionProviderForCountry(countryCode) {
  const normalized = normalizeCountryCode(countryCode)
  if (!normalized) {
    throw new Error('Valid ISO 3166-1 alpha-2 country code is required for provider selection.')
  }
  if (normalized === 'IN') {
    return SUBSCRIPTION_PROVIDERS.RAZORPAY
  }
  return SUBSCRIPTION_PROVIDERS.DODO
}

/**
 * Returns the subscription payment provider for a user object loaded from database.
 */
export function getSubscriptionProviderForUser(user) {
  const code = user?.country || user?.countryCode || null
  return getSubscriptionProviderForCountry(code)
}

/**
 * Maps a country code to its canonical billing region ('INDIA' or 'INTERNATIONAL').
 */
export function getBillingRegionForCountry(countryCode) {
  const normalized = normalizeCountryCode(countryCode)
  if (!normalized) {
    throw new Error('Valid ISO 3166-1 alpha-2 country code is required for billing region resolution.')
  }
  return normalized === 'IN' ? 'INDIA' : 'INTERNATIONAL'
}

/**
 * Validates that a user record in the database has a valid country set.
 * Returns normalized country code or throws COUNTRY_REQUIRED error.
 */
export function requireUserCountry(user) {
  const rawCountry = user?.country || user?.countryCode || null
  const normalized = normalizeCountryCode(rawCountry)
  if (!normalized || !isValidCountryCode(normalized)) {
    const err = new Error('Country selection is required to determine subscription pricing and billing provider. Please set your country before proceeding.')
    err.code = 'COUNTRY_REQUIRED'
    err.status = 400
    err.statusCode = 400
    throw err
  }
  return normalized
}

export const PRODUCT_PAYMENT_PROVIDERS = {
  RAZORPAY: 'razorpay',
  DODO: 'dodo',
}

/**
 * Centralized Server-Side Digital Product Purchase Payment Provider Selection
 *
 * Rules:
 * - India ('IN') => 'razorpay'
 * - Every other supported country => 'dodo'
 * - Throws 400 error if country is missing or not a valid ISO 3166-1 alpha-2 code.
 * - Client-supplied provider selection is strictly ignored.
 */
export function getProductPaymentProviderForCountry(countryCode) {
  if (!countryCode || typeof countryCode !== 'string' || !countryCode.trim()) {
    const err = new Error('A valid country is required to complete your purchase.')
    err.code = 'COUNTRY_REQUIRED'
    err.status = 400
    err.statusCode = 400
    throw err
  }
  const clean = countryCode.trim().toUpperCase()
  if (clean === 'OTHER' || clean === 'OTHER_COUNTRY' || clean === 'OTHER COUNTRY' || clean === 'ROW') {
    return PRODUCT_PAYMENT_PROVIDERS.DODO
  }
  const normalized = normalizeCountryCode(countryCode)
  if (!normalized || !isValidCountryCode(normalized)) {
    const err = new Error(`Unsupported or invalid country code: "${countryCode}". Please select a valid country.`)
    err.code = 'INVALID_COUNTRY'
    err.status = 400
    err.statusCode = 400
    throw err
  }
  if (normalized === 'IN') {
    return PRODUCT_PAYMENT_PROVIDERS.RAZORPAY
  }
  return PRODUCT_PAYMENT_PROVIDERS.DODO
}

