#!/usr/bin/env node

/**
 * CreatorStore Stale Payment & Subscription Lifecycle Cleanup Job
 *
 * Railway-compatible scheduled runner.
 * Reconciles stale pending checkout sessions, orders, and subscription plan upgrades.
 * Uses PostgreSQL distributed advisory locks so multiple instances never race.
 *
 * Usage:
 *   # Run once (ideal for Railway Cron Jobs / Scheduled Triggers every 5 minutes)
 *   node scripts/expire_stale_payments.js
 *
 *   # Override TTL (minutes)
 *   node scripts/expire_stale_payments.js --ttl 15
 *
 *   # Run continuously as a background worker process (polls every N seconds)
 *   node scripts/expire_stale_payments.js --loop 300
 */

import { paymentLifecycleService } from '../lib/payment-lifecycle.js'
import { getPendingPaymentTTLMinutes } from '../lib/dodo.js'

async function runCleanup(ttlMinutes) {
  const startedAt = new Date()
  console.log(`\n[${startedAt.toISOString()}] Starting stale payment cleanup job... (TTL: ${ttlMinutes}m)`)

  try {
    const summary = await paymentLifecycleService.runStalePaymentCleanup({ ttlMinutes })
    const elapsedMs = Date.now() - startedAt.getTime()

    console.log(`[${new Date().toISOString()}] Stale payment cleanup finished in ${elapsedMs}ms`)
    console.log(`  - Total items scanned:      ${summary.scanned}`)
    console.log(`  - Reconciled (Active / Pro): ${summary.reconciledSuccess}`)
    console.log(`  - Expired:                   ${summary.expired}`)
    console.log(`  - Failed / Released:         ${summary.failedReleased}`)
    console.log(`  - Stale Processing (Needs attention): ${summary.staleProcessing}`)

    if (summary.errors && summary.errors.length > 0) {
      console.warn(`  ⚠️ Warnings / Non-fatal errors (${summary.errors.length}):`)
      summary.errors.forEach(e => console.warn(`     - [${e.id || e.phase}]: ${e.error}`))
    }

    return summary
  } catch (err) {
    console.error(`[${new Date().toISOString()}] Stale payment cleanup failed with fatal error:`, err)
    throw err
  }
}

async function main() {
  const args = process.argv.slice(2)
  const ttlIdx = args.indexOf('--ttl')
  const ttlMinutes = ttlIdx !== -1 ? parseInt(args[ttlIdx + 1], 10) : getPendingPaymentTTLMinutes()

  const loopIdx = args.indexOf('--loop')
  const loopIntervalSec = loopIdx !== -1 ? parseInt(args[loopIdx + 1], 10) : null

  if (loopIntervalSec && loopIntervalSec > 0) {
    console.log(`[Lifecycle Worker] Running in daemon mode, polling every ${loopIntervalSec}s...`)
    const tick = async () => {
      try {
        await runCleanup(ttlMinutes)
      } catch (e) {
        console.error('[Lifecycle Worker] Error during scheduled pass:', e.message)
      }
    }
    await tick()
    setInterval(tick, loopIntervalSec * 1000)
  } else {
    try {
      await runCleanup(ttlMinutes)
      process.exit(0)
    } catch {
      process.exit(1)
    }
  }
}

main().catch(err => {
  console.error('[Fatal Error]', err)
  process.exit(1)
})
