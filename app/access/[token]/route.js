import { NextResponse } from 'next/server'
import { guestAccessService } from '@/lib/services'
import { purchaseOtpService, PURCHASE_SESSION_COOKIE } from '@/lib/purchaseOtpService'
import { getAppUrl } from '@/config/site'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request, { params: paramsPromise }) {
  const params = await paramsPromise
  const rawToken = params?.token

  if (!rawToken) {
    const errorUrl = getAppUrl('/access/error?message=' + encodeURIComponent('This access link is invalid or has expired.'))
    return NextResponse.redirect(errorUrl, 302)
  }

  const result = await guestAccessService.validateTokenAndResolve(rawToken)

  if (!result.success) {
    const errorParam = encodeURIComponent(result.message || 'This access link is invalid or has expired.')
    const errorUrl = getAppUrl(`/notifications/settings?expired=true&error=${errorParam}`)
    return NextResponse.redirect(errorUrl, 302)
  }

  // Redirect to Notifications / Purchases page with the product modal open
  const targetUrl = getAppUrl(`/notifications/settings?listingId=${result.product.id}&openPurchase=true`)
  const response = NextResponse.redirect(targetUrl, 307)

  // Establish secure customer guest access session cookie
  const isProd = process.env.NODE_ENV === 'production'
  response.cookies.set('creatorstore_guest_session', result.sessionCookieValue, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    path: '/',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  })

  // Establish purchase access session cookie for immediate download access
  if (result.customerEmail) {
    const purchaseSessionToken = purchaseOtpService.createSessionToken(result.customerEmail)
    if (purchaseSessionToken) {
      response.cookies.set(PURCHASE_SESSION_COOKIE, purchaseSessionToken, {
        httpOnly: true,
        secure: isProd,
        sameSite: 'lax',
        path: '/',
        maxAge: 30 * 60,
      })
    }
  }

  // Protect against referrer leakage
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')

  return response
}

