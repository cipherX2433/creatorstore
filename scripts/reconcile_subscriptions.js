#!/usr/bin/env node

/**
 * CreatorStore Subscription Reconciliation & Duplicate Audit CLI
 *
 * Usage:
 *   # Dry-run audit for a specific user by email or creator ID
 *   node scripts/reconcile_subscriptions.js --email mohit.mr11082@gmail.com
 *   node scripts/reconcile_subscriptions.js --creator <creatorId>
 *
 *   # Audit all active creators
 *   node scripts/reconcile_subscriptions.js --all
 *
 *   # Safely cancel an unwanted duplicate subscription (Requires explicit --confirm)
 *   node scripts/reconcile_subscriptions.js --cancel <subscriptionId> --confirm
 */

import { auditCustomerSubscriptions, auditAllActiveSubscribers, cancelUnwantedSubscription } from '../lib/subscription-reconciliation.js'

async function main() {
  const args = process.argv.slice(2)

  const emailIdx = args.indexOf('--email')
  const email = emailIdx !== -1 ? args[emailIdx + 1] : null

  const creatorIdx = args.indexOf('--creator')
  const creatorId = creatorIdx !== -1 ? args[creatorIdx + 1] : null

  const cancelIdx = args.indexOf('--cancel')
  const cancelSubId = cancelIdx !== -1 ? args[cancelIdx + 1] : null

  const isAll = args.includes('--all')
  const isConfirm = args.includes('--confirm')

  console.log('\n=============================================================')
  console.log('   CREATORSTORE SUBSCRIPTION RECONCILIATION AUDIT TOOL       ')
  console.log('=============================================================\n')

  if (cancelSubId) {
    if (!isConfirm) {
      console.log('⚠️  DRY RUN: To execute cancellation on Dodo Payments, you must supply --confirm')
      console.log(`Command would cancel unwanted subscription: ${cancelSubId}`)
      process.exit(0)
    }

    console.log(`Cancelling duplicate subscription: ${cancelSubId}...`)
    try {
      const res = await cancelUnwantedSubscription({
        subscriptionId: cancelSubId,
        reason: 'Manual admin duplicate cleanup',
        confirm: true,
      })
      console.log('✅ Result:', res.message)
    } catch (e) {
      console.error('❌ Error cancelling subscription:', e.message)
    }
    process.exit(0)
  }

  if (email || creatorId) {
    console.log(`Auditing subscriber: ${email || creatorId}...`)
    const report = await auditCustomerSubscriptions({ creatorId, email })
    console.log('\n--- AUDIT REPORT ---')
    console.log(`Creator ID: ${report.creatorId || 'N/A'}`)
    console.log(`Email: ${report.email || 'N/A'}`)
    console.log(`Dodo Customer ID: ${report.dodoCustomerId || 'N/A'}`)
    console.log(`Local DB Plan: ${report.localDbSubscription?.plan || 'NONE'} (${report.localDbSubscription?.status || 'NONE'})`)
    console.log(`Total Subscriptions on Dodo: ${report.totalDodoSubscriptions}`)
    console.log(`Active Subscriptions on Dodo: ${report.activeCount}`)
    console.log(`Duplicate Active Detected: ${report.hasDuplicateActive ? '⚠️ YES' : 'NO'}`)

    if (report.intendedSubscription) {
      console.log('\n✅ Intended Active Subscription:')
      console.log(`  ID: ${report.intendedSubscription.subscriptionId}`)
      console.log(`  Plan: ${report.intendedSubscription.plan}`)
      console.log(`  Recurring: ${report.intendedSubscription.recurringAmount / 100} ${report.intendedSubscription.currency}`)
      console.log(`  Next Billing: ${report.intendedSubscription.nextBillingDate}`)
    }

    if (report.unwantedSubscriptions.length > 0) {
      console.log('\n⚠️  Unwanted Duplicate Subscriptions on Dodo:')
      for (const s of report.unwantedSubscriptions) {
        console.log(`  - Subscription ID: ${s.subscriptionId}`)
        console.log(`    Plan: ${s.plan} (${s.recurringAmount / 100} ${s.currency})`)
        console.log(`    Created: ${s.createdAt}`)
        console.log(`    To cancel this duplicate, run:`)
        console.log(`      node scripts/reconcile_subscriptions.js --cancel ${s.subscriptionId} --confirm\n`)
      }
    }

    if (report.isAmbiguous) {
      console.log(`\n⚠️  AMBIGUOUS STATE FLAGGED FOR MANUAL REVIEW: ${report.ambiguityReason}`)
    }

    process.exit(0)
  }

  if (isAll) {
    console.log('Scanning all active subscribers...')
    const summary = await auditAllActiveSubscribers()
    console.log(`\nTotal scanned: ${summary.totalScanned}`)
    console.log(`Accounts with duplicate active subscriptions: ${summary.totalWithDuplicates}`)

    if (summary.duplicates.length > 0) {
      console.log('\n--- ACCOUNTS WITH DUPLICATE SUBSCRIPTIONS ---')
      for (const d of summary.duplicates) {
        console.log(`• Creator: ${d.email} (${d.creatorId})`)
        console.log(`  Active subscriptions: ${d.activeCount}`)
        console.log(`  Intended: ${d.intendedSubscription?.subscriptionId} (${d.intendedSubscription?.plan})`)
        console.log(`  Unwanted: ${d.unwantedSubscriptions.map(u => u.subscriptionId).join(', ')}`)
      }
    } else {
      console.log('✅ No accounts with duplicate active subscriptions found.')
    }
    process.exit(0)
  }

  console.log('No option provided. Use --email <email>, --creator <id>, --all, or --cancel <subId> --confirm')
}

main().catch(console.error)
