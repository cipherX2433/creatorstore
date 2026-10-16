import { NextResponse } from 'next/server'
import { validateCronSecret } from '@/lib/cron'
import { otpVerificationsRepo } from '@/lib/repos'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

async function handleCleanup(request) {
  if (!validateCronSecret(request)) {
    return NextResponse.json(
      { ok: false, error: 'Unauthorized' },
      { status: 401, headers: { 'Cache-Control': 'no-store' } }
    )
  }

  try {
    const result = await otpVerificationsRepo.cleanupExpired()
    return NextResponse.json(
      {
        ok: true,
        deleted: result?.count || 0,
        timestamp: new Date().toISOString(),
      },
      {
        status: 200,
        headers: { 'Cache-Control': 'no-store' },
      }
    )
  } catch (error) {
    console.error('[Cron Cleanup] Failed to cleanup expired OTPs:', error.message)
    return NextResponse.json(
      { ok: false, error: 'Internal cleanup error' },
      { status: 500, headers: { 'Cache-Control': 'no-store' } }
    )
  }
}

export const GET = handleCleanup
export const POST = handleCleanup
