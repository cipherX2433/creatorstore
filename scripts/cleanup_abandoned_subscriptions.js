#!/usr/bin/env node

/**
 * CreatorStore Razorpay Abandoned Subscription Cleanup Runner
 *
 * Railway / Background Worker / Scheduled Runner:
 * Identifies incomplete Razorpay subscriptions (status 'created' awaiting authorization),
 * fetches live state from Razorpay, and cancels abandoned subscriptions beyond the configurable timeout.
 *
 * Usage:
 *   # Run once (ideal for Railway Scheduled Jobs / Cron every 15-30 minutes)
 *   node scripts/cleanup_abandoned_subscriptions.js
 *
 *   # Override timeout in minutes
 *   node scripts/cleanup_abandoned_subscriptions.js --timeout 60
 *
 *   # Run continuously as a background worker process (polls every N seconds)
 *   node scripts/cleanup_abandoned_subscriptions.js --loop 900
 */

import {
  razorpaySubscriptionLifecycleService,
  getRazorpayPendingSubscriptionTimeoutMinutes,
} from '../lib/razorpay-subscription-lifecycle.js'

async function runCleanup(timeoutMinutes) {
  const startedAt = new Date()
  console.log(`\n[${startedAt.toISOString()}] Starting Razorpay abandoned subscription cleanup... (Timeout: ${timeoutMinutes}m)`)

  try {
    const summary = await razorpaySubscriptionLifecycleService.cleanupAbandonedInitialCheckouts({ timeoutMinutes })
    const elapsedMs = Date.now() - startedAt.getTime()

    console.log(`[${new Date().toISOString()}] Razorpay cleanup finished in ${elapsedMs}ms`)
    console.log(`  - Total items scanned:      ${summary.scanned}`)
    console.log(`  - Cancelled abandoned:      ${summary.cancelled}`)
    console.log(`  - Reconciled active:        ${summary.reconciledActive}`)
    console.log(`  - Skipped:                  ${summary.skipped}`)

    if (summary.errors && summary.errors.length > 0) {
      console.warn(`  ⚠️ Warnings / Non-fatal errors (${summary.errors.length}):`)
      summary.errors.forEach(e => console.warn(`     - [${e.subscriptionId}]: ${e.error}`))
    }

    return summary
  } catch (err) {
    console.error(`[${new Date().toISOString()}] Cleanup job failed with fatal error:`, err)
    throw err
  }
}

async function main() {
  const args = process.argv.slice(2)
  const timeoutIdx = args.indexOf('--timeout')
  const timeoutMinutes = timeoutIdx !== -1 ? parseInt(args[timeoutIdx + 1], 10) : getRazorpayPendingSubscriptionTimeoutMinutes()

  const loopIdx = args.indexOf('--loop')
  const loopIntervalSec = loopIdx !== -1 ? parseInt(args[loopIdx + 1], 10) : null

  if (loopIntervalSec && loopIntervalSec > 0) {
    console.log(`[Lifecycle Worker] Running in daemon mode, polling every ${loopIntervalSec}s...`)
    const tick = async () => {
      try {
        await runCleanup(timeoutMinutes)
      } catch (e) {
        console.error('[Lifecycle Worker] Error during scheduled pass:', e.message)
      }
    }
    await tick()
    setInterval(tick, loopIntervalSec * 1000)
  } else {
    try {
      await runCleanup(timeoutMinutes)
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
