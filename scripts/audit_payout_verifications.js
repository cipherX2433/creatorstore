/**
 * Audit payout profiles marked VERIFIED/ACTIVE against Razorpay.
 *
 *   node scripts/audit_payout_verifications.js
 *   node scripts/audit_payout_verifications.js --fix
 *
 * --fix marks falsely-verified rows ACTION_REQUIRED so they must re-onboard.
 */
import { payoutProfilesRepo } from '../lib/repos.js'
import { getPaymentProvider, isPlaceholderRazorpayId } from '../lib/payments.js'

const FIX = process.argv.includes('--fix')

function isFalseVerified(profile, rzpAccount) {
  const reasons = []
  const accId = profile.razorpayAccountId
  const fundId = profile.razorpayFundAccountId

  if (isPlaceholderRazorpayId(accId)) reasons.push('placeholder_account_id')
  if (isPlaceholderRazorpayId(fundId)) reasons.push('placeholder_fund_account_id')
  if (!accId) reasons.push('missing_account_id')
  if (!fundId) reasons.push('missing_fund_account_id')
  if (rzpAccount && rzpAccount.exists === false) reasons.push('razorpay_account_not_found')
  return reasons
}

async function main() {
  const profiles = await payoutProfilesRepo.listAll()
  const flagged = []
  const genuine = []
  const provider = getPaymentProvider()

  const candidates = (profiles || []).filter((p) => {
    const verified = String(p.verificationStatus || '').toUpperCase() === 'VERIFIED'
    const active = String(p.status || '').toUpperCase() === 'ACTIVE'
    return verified || active
  })

  console.log(`Scanning ${candidates.length} VERIFIED/ACTIVE payout profiles of ${profiles.length} total`)

  for (const profile of candidates) {
    let rzpAccount = null
    if (profile.razorpayAccountId && !isPlaceholderRazorpayId(profile.razorpayAccountId)) {
      try {
        rzpAccount = await provider.getAccountStatus(profile.razorpayAccountId)
      } catch (err) {
        rzpAccount = { exists: false, error: err.message }
      }
    }

    const reasons = isFalseVerified(profile, rzpAccount)
    const row = {
      creatorId: profile.creatorId,
      legalName: profile.legalName || '',
      status: profile.status,
      verificationStatus: profile.verificationStatus,
      razorpayAccountId: profile.razorpayAccountId || null,
      razorpayFundAccountId: profile.razorpayFundAccountId || null,
      reasons,
      razorpayExists: rzpAccount?.exists ?? null,
      razorpayStatus: rzpAccount?.status || null,
    }

    if (reasons.length) {
      flagged.push(row)
      if (FIX) {
        await payoutProfilesRepo.updateStatus(profile.creatorId, 'ACTION_REQUIRED', {
          verificationStatus: 'FAILED',
          verificationMessage: 'Payout account needs to be set up again. Previous verification could not be confirmed with Razorpay.',
          currentStep: 2,
        })
        row.fixed = true
      }
    } else {
      genuine.push(row)
    }
  }

  console.log(JSON.stringify({
    scanned: candidates.length,
    genuine: genuine.length,
    falselyVerified: flagged.length,
    fixApplied: FIX,
    flagged,
    genuine,
  }, null, 2))

  if (flagged.length && !FIX) {
    console.error(`\n${flagged.length} account(s) look falsely verified. Re-run with --fix to require re-onboarding.`)
    process.exitCode = 2
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
