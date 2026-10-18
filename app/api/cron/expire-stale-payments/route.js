import { NextResponse } from 'next/server'
import { validateCronSecret } from '@/lib/cron'
import { paymentLifecycleService } from '@/lib/payment-lifecycle'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

async function handleExpireStalePayments(request) {
  if (!validateCronSecret(request)) {
    return NextResponse.json(
      { ok: false, error: 'Unauthorized' },
      { status: 401, headers: { 'Cache-Control': 'no-store' } }
    )
  }

  try {
    const searchParams = request.nextUrl?.searchParams || new URL(request.url).searchParams
    const ttlMinutesParam = searchParams.get('ttlMinutes')
    const ttlMinutes = ttlMinutesParam ? parseInt(ttlMinutesParam, 10) : undefined

    const startTime = Date.now()
    const result = await paymentLifecycleService.runStalePaymentCleanup({ ttlMinutes })
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
    console.error('[Cron Expire Stale Payments] Execution failed:', error.message)
    return NextResponse.json(
      {
        ok: false,
        error: error.message || 'Internal payment expiration error',
        timestamp: new Date().toISOString(),
      },
      {
        status: 500,
        headers: { 'Cache-Control': 'no-store' },
      }
    )
  }
}

export const GET = handleExpireStalePayments
export const POST = handleExpireStalePayments
