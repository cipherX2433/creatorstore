import crypto from 'crypto'

/**
 * Validates the Authorization Bearer token against server-only CRON_SECRET.
 * Uses constant-time buffer comparison to prevent timing side-channel attacks.
 */
export function validateCronSecret(request) {
  const secret = process.env.CRON_SECRET
  if (!secret || typeof secret !== 'string' || !secret.trim()) {
    return false
  }

  const authHeader = request
    ? (typeof request.headers?.get === 'function' ? request.headers.get('authorization') : request.headers?.authorization)
    : null

  if (!authHeader || typeof authHeader !== 'string') return false

  const match = authHeader.match(/^Bearer\s+(.+)$/i)
  if (!match) return false

  const provided = match[1].trim()
  const expected = secret.trim()

  const bufProvided = Buffer.from(provided)
  const bufExpected = Buffer.from(expected)

  if (bufProvided.length !== bufExpected.length) {
    return false
  }

  return crypto.timingSafeEqual(bufProvided, bufExpected)
}
