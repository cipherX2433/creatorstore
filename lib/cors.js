// ==============================================================================
// CREATORSTORE — CENTRALIZED CORS POLICY & ALLOWLIST (SEC-004)
// Enforces strict origin allowlists, credentials security, and preflight handling
// ==============================================================================

export const CANONICAL_PROD_ORIGINS = [
  'https://creatorstore.store',
  'https://www.creatorstore.store',
  'https://app.creatorstore.store',
]

export const CANONICAL_DEV_ORIGINS = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:3001',
  'http://127.0.0.1:3001',
  'http://0.0.0.0:3000',
]

/**
 * Compiles the authorized origins allowlist based on environment configuration.
 * Strips insecure wildcards (*) and trailing slashes.
 */
export function getAllowedOrigins() {
  const allowed = new Set()

  // 1. Explicitly configured origins from environment
  if (process.env.CORS_ORIGINS) {
    const parts = process.env.CORS_ORIGINS.split(',')
    for (const part of parts) {
      const trimmed = part.trim().replace(/\/+$/, '')
      if (trimmed && trimmed !== '*') {
        allowed.add(trimmed.toLowerCase())
      }
    }
  }

  // 2. Canonical app URL if configured
  if (process.env.NEXT_PUBLIC_APP_URL) {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL.trim().replace(/\/+$/, '')
    if (appUrl) {
      allowed.add(appUrl.toLowerCase())
    }
  }

  // 3. Platform production domains
  for (const origin of CANONICAL_PROD_ORIGINS) {
    allowed.add(origin.toLowerCase())
  }

  // 4. Local development origins only in non-production environments
  if (process.env.NODE_ENV !== 'production') {
    for (const origin of CANONICAL_DEV_ORIGINS) {
      allowed.add(origin.toLowerCase())
    }
  }

  return allowed
}

/**
 * Validates whether an incoming Origin header is permitted.
 * Supports exact allowlist matches and verified subdomains of creatorstore.store.
 */
export function isOriginAllowed(origin) {
  if (!origin || typeof origin !== 'string') return false
  const normalized = origin.trim().replace(/\/+$/, '').toLowerCase()

  const allowedOrigins = getAllowedOrigins()
  if (allowedOrigins.has(normalized)) return true

  // Support secure subdomains of creatorstore.store
  try {
    const parsed = new URL(normalized)
    if (
      parsed.protocol === 'https:' &&
      (parsed.hostname === 'creatorstore.store' || parsed.hostname.endsWith('.creatorstore.store'))
    ) {
      return true
    }
  } catch {}

  return false
}

/**
 * Applies security and CORS headers to the response based on the request's Origin.
 *
 * Security rules:
 * - Never reflects untrusted origins.
 * - Never combines wildcard '*' with Access-Control-Allow-Credentials: true.
 * - Adds Vary: Origin for cache consistency.
 */
export function applyCors(res, request) {
  if (!res || !res.headers) return res

  res.headers.set('Vary', 'Origin')
  res.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS')
  res.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With')
  res.headers.set('Access-Control-Max-Age', '86400')
  res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')

  const origin = request
    ? (typeof request.headers?.get === 'function' ? request.headers.get('origin') : request.headers?.origin)
    : null

  if (origin && isOriginAllowed(origin)) {
    res.headers.set('Access-Control-Allow-Origin', origin)
    res.headers.set('Access-Control-Allow-Credentials', 'true')
  } else {
    // Strictly omit allow-origin and credentials for untrusted or absent origins
    if (typeof res.headers.delete === 'function') {
      res.headers.delete('Access-Control-Allow-Origin')
      res.headers.delete('Access-Control-Allow-Credentials')
    } else {
      delete res.headers['Access-Control-Allow-Origin']
      delete res.headers['Access-Control-Allow-Credentials']
    }
  }

  return res
}
