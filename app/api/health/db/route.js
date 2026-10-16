import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { supabaseAdmin } from '@/lib/supabase'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    let prismaOk = false
    let supabaseOk = false
    let details = {}

    // Check Prisma connectivity
    try {
      if (prisma) {
        await prisma.$queryRaw`SELECT 1`
        prismaOk = true
      }
    } catch (err) {
      details.prismaError = err.message || 'Prisma query failed'
    }

    // Check Supabase connectivity
    try {
      const { data, error } = await supabaseAdmin.from('users').select('id').limit(1)
      if (!error) {
        supabaseOk = true
      } else {
        details.supabaseError = error.message
      }
    } catch (err) {
      details.supabaseError = err.message || 'Supabase query failed'
    }

    const isHealthy = prismaOk || supabaseOk

    return NextResponse.json(
      {
        status: isHealthy ? 'ok' : 'error',
        database: 'postgresql',
        provider: 'supabase',
        orm: 'prisma',
        checks: {
          prisma: prismaOk ? 'connected' : 'offline_fallback',
          supabase: supabaseOk ? 'connected' : 'offline_fallback',
        },
        timestamp: new Date().toISOString(),
      },
      { status: isHealthy ? 200 : 500 }
    )
  } catch (error) {
    return NextResponse.json(
      { status: 'error', database: 'postgresql', error: error.message },
      { status: 500 }
    )
  }
}
