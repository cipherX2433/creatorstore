/**
 * ==============================================================================
 * CREATORSTORE CENTRALIZED SITE & SUPPORT CONFIGURATION
 * ==============================================================================
 * Single source of truth for platform support contact, branding, and URLs.
 * 
 * Distinction:
 * - Customer Support: SUPPORT_EMAIL (support@creatorstore.store)
 * - Transactional Sender: TRANSACTIONAL_SENDER_EMAIL (noreply@creatorstore.store)
 * ==============================================================================
 */

/**
 * Resolves the canonical application base URL and optionally appends a path safely.
 * Primary canonical variable: NEXT_PUBLIC_APP_URL (as set in Railway production environment)
 * Fallback variables: APP_URL, NEXT_PUBLIC_BASE_URL, NEXT_PUBLIC_SITE_URL
 * Safe production fallback: 'https://creatorstore.store'
 * Local development fallback: 'http://localhost:3000'
 */
export function getAppUrl(path = '') {
  const rawUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_URL ||
    process.env.NEXT_PUBLIC_BASE_URL ||
    process.env.NEXT_PUBLIC_SITE_URL

  let base = ''
  if (rawUrl && typeof rawUrl === 'string' && rawUrl.trim() !== '') {
    base = rawUrl.trim().replace(/\/+$/, '')
  } else {
    // In production or hosted environment, never silently fall back to localhost
    const isProd =
      process.env.NODE_ENV === 'production' ||
      Boolean(process.env.RAILWAY_ENVIRONMENT) ||
      Boolean(process.env.VERCEL_ENV)

    if (isProd) {
      base = 'https://creatorstore.store'
    } else {
      base = 'http://localhost:3000'
    }
  }

  // Security: Never generate 0.0.0.0 in browser-facing or redirect URLs
  if (base.includes('0.0.0.0')) {
    base = base.replace(/0\.0\.0\.0/g, 'localhost')
  }

  if (!path) return base

  const cleanPath = String(path).startsWith('/') ? String(path) : `/${path}`
  return `${base}${cleanPath}`
}

/**
 * Sanitizes any URL to ensure it never targets 0.0.0.0
 */
export function sanitizeBrowserUrl(urlStr = '') {
  if (!urlStr || typeof urlStr !== 'string') return ''
  return urlStr.replace(/0\.0\.0\.0/g, 'localhost')
}

export const SUPPORT_EMAIL = process.env.NEXT_PUBLIC_SUPPORT_EMAIL || process.env.SUPPORT_EMAIL || 'support@creatorstore.store'
export const TRANSACTIONAL_SENDER_EMAIL = 'noreply@creatorstore.store'
export const APP_NAME = 'CreatorStore'
export const APP_URL = getAppUrl()

export const siteConfig = {
  name: APP_NAME,
  url: APP_URL,
  getAppUrl,
  supportEmail: SUPPORT_EMAIL,
  transactionalEmail: TRANSACTIONAL_SENDER_EMAIL,
  supportMailto: `mailto:${SUPPORT_EMAIL}`,
  description: 'The monetization operating system for modern creators.',
}

export default siteConfig
