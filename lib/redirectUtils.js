/**
 * Utility to safely validate and resolve redirect destinations.
 * Protects against open-redirect vulnerabilities (e.g. protocol-relative URLs,
 * external hostnames, javascript: or encoded tricks).
 */

export const DEFAULT_POST_AUTH_PATH = '/dashboard/store'

/**
 * Validates that a destination URL is a safe internal application path.
 *
 * @param {string|null|undefined} url - The candidate redirect URL
 * @param {string} [fallback='/dashboard/store'] - The safe fallback if invalid
 * @returns {string} Safe relative path
 */
export function getSafeRedirect(url, fallback = DEFAULT_POST_AUTH_PATH) {
  if (!url || typeof url !== 'string') {
    return fallback
  }

  const trimmed = url.trim()
  if (!trimmed) {
    return fallback
  }

  // Must start with exactly one forward slash, not // or /\ or contain backslashes
  if (!trimmed.startsWith('/') || trimmed.startsWith('//') || trimmed.startsWith('/\\') || trimmed.includes('\\')) {
    return fallback
  }

  // Prevent protocol injection (e.g. /http:// or /javascript:)
  if (trimmed.includes('://') || /^\/[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed)) {
    return fallback
  }

  // Prevent circular redirects to auth entry pages
  const cleanPath = trimmed.split('?')[0].split('#')[0]
  if (['/login', '/signup', '/verify-email'].includes(cleanPath)) {
    return fallback
  }

  return trimmed
}

/**
 * Extracts a candidate return destination from query search params or URLSearchParams.
 * Checks commonly used parameter keys: 'returnTo', 'redirectTo', 'callbackUrl', 'redirect'.
 *
 * @param {URLSearchParams|object|null} searchParams
 * @returns {string|null}
 */
export function getRequestedReturnUrl(searchParams) {
  if (!searchParams) return null

  if (typeof searchParams.get === 'function') {
    return (
      searchParams.get('returnTo') ||
      searchParams.get('redirectTo') ||
      searchParams.get('callbackUrl') ||
      searchParams.get('redirect') ||
      null
    )
  }

  if (typeof searchParams === 'object') {
    return (
      searchParams.returnTo ||
      searchParams.redirectTo ||
      searchParams.callbackUrl ||
      searchParams.redirect ||
      null
    )
  }

  return null
}

/**
 * Computes the target redirect destination for an authenticated user based on role,
 * onboarding completion status, and any optional explicit return destination.
 *
 * Rules:
 * 1. Customer role always routes to /account (or an internal /account/* destination if requested).
 * 2. Uncompleted creator must complete onboarding (/onboarding).
 * 3. Completed creator routes to the valid requested return destination if provided, or defaults to /dashboard/store.
 *
 * @param {Object} options
 * @param {Object|null} options.user
 * @param {Object|null} options.profile
 * @param {string|null} [options.requestedDestination]
 * @param {string} [options.defaultDestination='/dashboard/store']
 * @returns {string}
 */
export function getPostAuthDestination({
  user,
  profile,
  requestedDestination,
  defaultDestination = DEFAULT_POST_AUTH_PATH,
}) {
  if (user?.role === 'CUSTOMER') {
    const safe = getSafeRedirect(requestedDestination, '/account')
    return safe.startsWith('/account') ? safe : '/account'
  }

  const isComplete = profile?.onboardingComplete || profile?.onboardingStatus === 'COMPLETED'
  if (!isComplete) {
    return '/onboarding'
  }

  return getSafeRedirect(requestedDestination, defaultDestination)
}
