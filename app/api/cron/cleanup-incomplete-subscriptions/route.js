import { NextResponse } from 'next/server'
import { validateCronSecret } from '@/lib/cron'
import { razorpaySubscriptionLifecycleService } from '@/lib/razorpay-subscription-lifecycle'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

async function handleCleanupIncompleteSubscriptions(request) {
  if (!validateCronSecret(request)) {
    return NextResponse.json(
      { ok: false, error: 'Unauthorized' },
      { status: 401, headers: { 'Cache-Control': 'no-store' } }
    )
  }

  try {
    const searchParams = request.nextUrl?.searchParams || new URL(request.url).searchParams
    const timeoutMinutesParam = searchParams.get('timeoutMinutes') || searchParams.get('ttlMinutes')
    const timeoutMinutes = timeoutMinutesParam ? parseInt(timeoutMinutesParam, 10) : undefined

    const startTime = Date.now()
    const result = await razorpaySubscriptionLifecycleService.cleanupAbandonedInitialCheckouts({ timeoutMinutes })
    const durationMs = Date.now() - startTime

    return NextResponse.json(
      {
        ok: true,
        durationMs,
        result,
        timestamp: new Date().toISOString(),
      },
      {
        status: 200,
        headers: { 'Cache-Control': 'no-store' },
      }
    )
  } catch (error) {
    console.error('[Cron Cleanup Incomplete Subscriptions] Execution failed:', error.message)
    return NextResponse.json(
      {
        ok: false,
        error: error.message || 'Internal subscription cleanup error',
        timestamp: new Date().toISOString(),
      },
      {
        status: 500,
        headers: { 'Cache-Control': 'no-store' },
      }
    )
  }
}

export const GET = handleCleanupIncompleteSubscriptions
export const POST = handleCleanupIncompleteSubscriptions
