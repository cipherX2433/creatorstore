'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { api, formatMoney } from '@/lib/clientApi'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  ShieldCheck, CheckCircle2, ArrowRight, Loader2, CreditCard, Sparkles,
  DollarSign, ArrowUpRight, Lock, AlertTriangle, Building, User, Banknote, RefreshCw, Settings,
  Receipt, ArrowDownLeft, ArrowUpRight as ArrowUpRightIcon, Wallet
} from 'lucide-react'

import { useDashboardHeader } from '@/components/dashboard/HeaderContext'

export default function PaymentsPage() {
  const [dashboard, setDashboard] = useState(null)
  const [loading, setLoading] = useState(true)
  const [withdrawing, setWithdrawing] = useState(false)
  const { setHeaderConfig } = useDashboardHeader()

  useEffect(() => {
    setHeaderConfig({
      title: 'Payments',
      actions: null
    })
  }, [setHeaderConfig])

  useEffect(() => {
    fetchDashboard()
  }, [])

  function fetchDashboard() {
    setLoading(true)
    api.get('/payouts/dashboard')
      .then((res) => {
        setDashboard(res)
        setLoading(false)
      })
      .catch(() => {
        api.get('/payouts/status')
          .then((statusRes) => {
            setDashboard({
              overview: { totalSales: 0, creatorEarnings: 0, pendingEarnings: 0, availableEarnings: 0, paidOut: 0, refunds: 0, totalPlatformFees: 0 },
              status: statusRes,
              ledger: [],
              recentTransactions: [],
              payoutHistory: [],
            })
            setLoading(false)
          })
          .catch(() => setLoading(false))
      })
  }

  async function handleWithdraw() {
    setWithdrawing(true)
    try {
      const res = await api.post('/payouts/withdraw', { amount: dashboard?.overview?.availableEarnings || 0 })
      if (!res.enabled) {
        toast.info(res.message || 'Real creator payouts are feature-flagged off for safety in Phase 3.')
      } else {
        toast.success('Payout withdrawal requested!')
      }
    } catch (err) {
      toast.error(err.message || 'Withdrawal failed')
    } finally {
      setWithdrawing(false)
    }
  }

  if (loading && !dashboard) return <PaymentsSkeleton />

  const status = dashboard?.status || {}
  const overview = dashboard?.overview || { totalSales: 0, creatorEarnings: 0, pendingEarnings: 0, availableEarnings: 0, paidOut: 0, refunds: 0 }
  const isPending = status.status === 'PENDING' || status.onboardingStatus === 'PENDING'
  const isActive = status.status === 'ACTIVE' || status.status === 'VERIFIED'
  const isSaved = isPending || isActive
  const availableAmount = overview.availableEarnings ?? (overview.creatorEarnings - overview.paidOut)

  return (
    <div className="max-w-6xl space-y-6 sm:space-y-8 pb-12">

      {/* 1. PAYMENTS HEADER */}
      <div className="bg-[#FFFFFF] p-6 sm:p-8 rounded-[24px] border border-[#E5E5E3] shadow-[0_8px_30px_rgba(0,0,0,0.04)] space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-[#1F1F1F] bg-[#F2F1EF] px-3.5 py-1 rounded-full border border-[#E5E5E3]">
              <Sparkles className="h-3.5 w-3.5" /> Direct Creator Payouts
            </div>
            <p className="text-xs sm:text-sm text-[#6F6F6B] font-normal max-w-2xl pt-1">
              Get paid directly from your CreatorStore product sales. Your earnings are tracked in real-time and transferred directly to your saved UPI ID or bank account.
            </p>
          </div>

          <div>
            {!isSaved ? (
              <Link href="/dashboard/payments/setup">
                <button className="font-bold bg-[#1F1F1F] hover:bg-[#000000] active:bg-[#111111] text-[#FFFFFF] rounded-full h-11 sm:h-12 px-6 transition-all duration-200 flex items-center gap-1.5 cursor-pointer shadow-sm text-sm">
                  Set Up Payout Details <ArrowRight className="ml-1.5 h-4 w-4" />
                </button>
              </Link>
            ) : (
              <Link href="/dashboard/payments/setup">
                <Button variant="outline" className="font-bold rounded-full h-11 border-[#E5E5E3] bg-[#FFFFFF] text-[#1F1F1F] hover:bg-[#F5F5F3] cursor-pointer">
                  <Settings className="h-4 w-4 mr-1.5 text-[#1F1F1F]" /> Manage Payout Details
                </Button>
              </Link>
            )}
          </div>
        </div>

        {/* Highlight Stats Banner */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 pt-2">
          <div className="bg-[#FBFBFB] p-4 rounded-[16px] border border-[#E5E5E3] space-y-0.5 min-w-0">
            <span className="text-xs font-bold text-[#6F6F6B]">CreatorStore Platform Fee</span>
            <div className="text-xl font-bold text-[#16A34A]">0%</div>
            <span className="text-[11px] text-[#6F6F6B] font-medium">No CreatorStore platform fee</span>
          </div>

          <div className="bg-[#FBFBFB] p-4 rounded-[16px] border border-[#E5E5E3] space-y-0.5 min-w-0">
            <span className="text-xs font-bold text-[#6F6F6B]">Payout Processing</span>
            <div className="text-xl font-bold text-[#1F1F1F]">Direct Transfer</div>
            <span className="text-[11px] text-[#6F6F6B] font-medium">Transferred directly to your saved account</span>
          </div>

          <div className="bg-[#FBFBFB] p-4 rounded-[16px] border border-[#E5E5E3] space-y-0.5 min-w-0">
            <span className="text-xs font-bold text-[#6F6F6B]">Payout Account Status</span>
            <div className="text-xl font-bold text-[#1F1F1F] flex items-center gap-1.5">
              {isActive ? (
                <span className="text-[#16A34A] flex items-center gap-1.5 text-sm sm:text-base font-bold">
                  <span className="h-2 w-2 rounded-full bg-[#16A34A] shrink-0" /> Payout is active
                </span>
              ) : isPending ? (
                <span className="text-[#D97706] flex items-center gap-1.5 text-sm sm:text-base font-bold">
                  <span className="h-2 w-2 rounded-full bg-[#D97706] shrink-0" /> Pending verification
                </span>
              ) : (
                <span className="text-[#D97706] flex items-center gap-1 text-sm sm:text-base">
                  <AlertTriangle className="h-4 w-4 shrink-0" /> Setup Required
                </span>
              )}
            </div>
            <span className="text-[11px] text-[#6F6F6B] font-medium block">
              {isPending
                ? 'Verification usually completes within 12–24 hours.'
                : (isActive
                  ? 'Your payout account has been verified and is ready for payouts.'
                  : 'Add payout details to receive earnings')}
            </span>
          </div>
        </div>
      </div>

      {/* 2. PAYOUT ACCOUNT DETAILS CARD */}
      <div className="bg-[#FFFFFF] p-6 sm:p-8 rounded-[24px] border border-[#E5E5E3] shadow-[0_8px_30px_rgba(0,0,0,0.04)] space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3.5">
            <div className={`h-11 w-11 rounded-full flex items-center justify-center font-bold border border-[#E5E5E3] shrink-0 ${isSaved ? 'bg-[#F2F1EF] text-[#1F1F1F]' : 'bg-[#FFF5DD] text-[#D97706]'}`}>
              {isSaved ? <CreditCard className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />}
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-[#1F1F1F]">Payout Account Overview</h2>
              <p className="text-xs text-[#6F6F6B] font-medium">Direct creator transfer details for settlement</p>
            </div>
          </div>

          <Link href="/dashboard/payments/setup">
            <Button variant="outline" size="sm" className="font-bold rounded-full text-xs border-[#E5E5E3] bg-[#FFFFFF] text-[#1F1F1F] hover:bg-[#F5F5F3] self-start sm:self-auto">
              {isSaved ? 'Edit Details' : 'Set Up Payouts'}
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 text-xs border-t border-[#E5E5E3] pt-4">
          <div>
            <span className="text-[#6F6F6B] font-bold block mb-0.5">Status</span>
            <span className={`font-bold ${isActive ? 'text-[#16A34A]' : (isPending ? 'text-[#D97706]' : 'text-[#DC2626]')}`}>
              {isActive ? 'Payout is active' : (isPending ? 'Pending verification' : 'Setup Required')}
            </span>
          </div>
          <div>
            <span className="text-[#6F6F6B] font-bold block mb-0.5">Payout Method</span>
            <span className="text-[#1F1F1F] font-bold">
              {status.payoutMethod === 'PAYPAL'
                ? 'PayPal'
                : (status.payoutMethod === 'UPI' ? 'UPI Transfer' : 'Bank Transfer')}
            </span>
          </div>
          <div>
            <span className="text-[#6F6F6B] font-bold block mb-0.5">Account / Holder</span>
            <span className="text-[#1F1F1F] font-bold">
              {status.payoutMethod === 'PAYPAL'
                ? (status.paypalEmailMasked || status.paypalEmail || 'PayPal Account')
                : (status.accountHolderName || 'Not configured')}
            </span>
          </div>
          <div>
            <span className="text-[#6F6F6B] font-bold block mb-0.5">
              {status.payoutMethod === 'PAYPAL' ? 'PayPal ID' : (status.payoutMethod === 'UPI' ? 'UPI ID' : 'Bank Details')}
            </span>
            <span className="text-[#1F1F1F] font-bold font-mono">
              {status.payoutMethod === 'PAYPAL'
                ? (status.paypalEmailMasked || status.paypalEmail || 'Not configured')
                : (status.payoutMethod === 'UPI'
                  ? (status.upiIdMasked || status.upiId || 'Not configured')
                  : (status.bankLast4 ? `•••• ${status.bankLast4} (${status.bankIfscMasked || status.ifsc})` : 'Not configured'))}
            </span>
          </div>
        </div>
      </div>

      {/* 3. PAYOUT PREVIEW & WITHDRAWAL SECTION */}
      <div className="bg-[#FFFFFF] p-6 sm:p-8 rounded-[24px] border border-[#E5E5E3] shadow-[0_8px_30px_rgba(0,0,0,0.04)] space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-[#F2F1EF] text-[#1F1F1F] border border-[#E5E5E3] flex items-center justify-center shrink-0">
              <Wallet className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-[#1F1F1F]">Available for Payout</h2>
              <p className="text-xs text-[#6F6F6B] font-medium">Eligible earnings ready for settlement</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 bg-[#FBFBFB] p-4 sm:p-6 rounded-[16px] sm:rounded-[20px] border border-[#E5E5E3]">
          <div className="space-y-1">
            <span className="text-xs font-bold text-[#6F6F6B] uppercase tracking-wider block">Available Balance</span>
            <div className="text-2xl sm:text-3xl font-bold text-[#16A34A]">{formatMoney(availableAmount, status.currency || 'INR')}</div>
            <span className="text-[11px] text-[#6F6F6B] font-medium block">Ready for withdrawal</span>
          </div>

          <div className="space-y-1">
            <span className="text-xs font-bold text-[#6F6F6B] uppercase tracking-wider block">CreatorStore Fee</span>
            <div className="text-2xl sm:text-3xl font-bold text-[#1F1F1F]">0%</div>
            <span className="text-[11px] text-[#16A34A] font-medium block">No CreatorStore platform fee</span>
          </div>

          <div className="space-y-1">
            <span className="text-xs font-bold text-[#6F6F6B] uppercase tracking-wider block">Estimated Payout</span>
            <div className="text-2xl sm:text-3xl font-bold text-[#1F1F1F]">{formatMoney(availableAmount, status.currency || 'INR')}</div>
            <span className="text-[11px] text-[#6F6F6B] font-medium block">Net transferable amount</span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
          <span className="text-xs text-[#6F6F6B] font-medium">
            {!isSaved ? 'Complete payout account setup to withdraw your earnings.' : availableAmount === 0 ? 'No earnings available for payout yet.' : 'Phase 3 Test Mode — Real creator transfers disabled.'}
          </span>

          <button
            onClick={handleWithdraw}
            disabled={withdrawing || !isSaved || availableAmount === 0}
            className="font-bold bg-[#1F1F1F] hover:bg-[#000000] active:bg-[#111111] text-[#FFFFFF] rounded-full h-11 sm:h-12 px-6 sm:px-8 transition-all duration-200 flex items-center justify-center disabled:opacity-50 cursor-pointer text-sm shrink-0 shadow-sm"
          >
            {withdrawing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Banknote className="h-4 w-4 mr-2" />}
            Withdraw Earnings
          </button>
        </div>
      </div>

      {/* 4. FEE STRUCTURE & CALCULATION INFORMATION CARD */}
      <div className="bg-[#FFFFFF] p-6 sm:p-8 rounded-[24px] border border-[#E5E5E3] shadow-[0_8px_30px_rgba(0,0,0,0.04)] space-y-5">
        <div className="flex items-start gap-4">
          <div className="h-10 w-10 rounded-full bg-[#EAF8EF] text-[#16A34A] border border-[#BBF7D0] flex items-center justify-center shrink-0 mt-0.5">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-[#1F1F1F]">0% CreatorStore Platform Fee</h3>
            <p className="text-xs sm:text-sm text-[#6F6F6B] font-normal leading-relaxed">
              CreatorStore charges 0% platform fees. Only applicable payment gateway processing charges apply.
            </p>
            <p className="text-xs sm:text-sm text-[#6F6F6B] font-normal leading-relaxed">
              18% GST is applicable on the gateway processing fee.
            </p>
          </div>
        </div>

        {/* Calculation Example Box */}
        <div className="bg-[#FBFBFB] p-5 rounded-[16px] border border-[#E5E5E3] space-y-3">
          <p className="text-xs font-bold text-[#1F1F1F] uppercase tracking-wider">
            Calculation Example (For a ₹100 Sale)
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <div className="p-3.5 rounded-[12px] bg-[#FFFFFF] border border-[#E5E5E3] space-y-1">
              <span className="text-[#6F6F6B] font-medium block">CreatorStore Fee</span>
              <span className="text-base font-bold text-[#16A34A] block">₹0 (0%)</span>
              <span className="text-[10px] text-[#6F6F6B] block">Zero platform cut</span>
            </div>
            <div className="p-3.5 rounded-[12px] bg-[#FFFFFF] border border-[#E5E5E3] space-y-1">
              <span className="text-[#6F6F6B] font-medium block">Payment Processing Fee</span>
              <span className="text-base font-bold text-[#1F1F1F] block">Applicable</span>
              <span className="text-[10px] text-[#6F6F6B] block">Standard gateway fee</span>
            </div>
            <div className="p-3.5 rounded-[12px] bg-[#FFFFFF] border border-[#E5E5E3] space-y-1">
              <span className="text-[#6F6F6B] font-medium block">GST on Processing Fee</span>
              <span className="text-base font-bold text-[#1F1F1F] block">18% of Gateway Fee</span>
              <span className="text-[10px] text-[#6F6F6B] block">Govt tax on gateway fee only</span>
            </div>
            <div className="p-3.5 rounded-[12px] bg-[#FFFFFF] border border-[#E5E5E3] space-y-1">
              <span className="text-[#6F6F6B] font-medium block">Creator Earnings</span>
              <span className="text-base font-bold text-[#1F1F1F] block">Sale − Applicable Charges</span>
              <span className="text-[10px] text-[#6F6F6B] block">Net settled payout</span>
            </div>
          </div>
          <p className="text-[11px] text-[#6F6F6B] leading-relaxed">
            Note: Actual payment processing rates depend on the payment mode (UPI, Cards, Netbanking) and are settled directly from transaction payment data.
          </p>
        </div>
      </div>

      {/* 5. EARNINGS LEDGER METRICS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-[#FFFFFF] p-6 rounded-[20px] border border-[#E5E5E3] shadow-[0_8px_30px_rgba(0,0,0,0.04)] space-y-2">
          <span className="text-xs font-bold text-[#6F6F6B] uppercase tracking-wider block">Gross Sales</span>
          <div className="text-3xl font-bold text-[#1F1F1F]">{formatMoney(overview.totalSales, status.currency || 'INR')}</div>
          <p className="text-xs font-medium text-[#6F6F6B] leading-snug">
            CreatorStore charges 0% platform fees. Applicable gateway processing fees and 18% GST on those fees may apply.
          </p>
        </div>

        <div className="bg-[#FFFFFF] p-6 rounded-[20px] border border-[#E5E5E3] shadow-[0_8px_30px_rgba(0,0,0,0.04)] space-y-2">
          <span className="text-xs font-bold text-[#6F6F6B] uppercase tracking-wider block">Creator Earnings</span>
          <div className="text-3xl font-bold text-[#1F1F1F]">{formatMoney(overview.creatorEarnings, status.currency || 'INR')}</div>
          <span className="text-xs font-medium text-[#6F6F6B]">After applicable payment processing charges</span>
        </div>

        <div className="bg-[#FFFFFF] p-6 rounded-[20px] border border-[#E5E5E3] shadow-[0_8px_30px_rgba(0,0,0,0.04)] space-y-2">
          <span className="text-xs font-bold text-[#6F6F6B] uppercase tracking-wider block">Paid Out</span>
          <div className="text-3xl font-bold text-[#1F1F1F]">{formatMoney(overview.paidOut, status.currency || 'INR')}</div>
          <span className="text-xs font-medium text-[#6F6F6B]">Transferred to creator account</span>
        </div>
      </div>

      {/* 5. FUTURE-READY PAYOUT HISTORY TABLE */}
      <div className="bg-[#FFFFFF] rounded-[24px] border border-[#E5E5E3] p-6 sm:p-8 space-y-6 shadow-[0_8px_30px_rgba(0,0,0,0.04)]">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-[#1F1F1F]">Payout History</h2>
            <p className="text-xs text-[#6F6F6B] font-medium">Record of completed transfers and settlements to your bank account</p>
          </div>
        </div>

        {(!dashboard?.payoutHistory || dashboard.payoutHistory.length === 0) ? (
          <div className="text-center py-12 border-2 border-dashed border-[#E5E5E3] bg-[#FBFBFB] rounded-[16px] space-y-2">
            <Receipt className="h-10 w-10 text-[#999995] mx-auto" />
            <p className="text-sm font-bold text-[#1F1F1F]">No payouts yet</p>
            <p className="text-xs text-[#6F6F6B] max-w-sm mx-auto">Payout history will become active after creator transfers are enabled in production.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-medium text-[#1F1F1F]">
              <thead className="bg-[#FBFBFB] text-[#6F6F6B] uppercase text-[10px] font-bold tracking-wider border-b border-[#E5E5E3]">
                <tr>
                  <th className="py-3 px-4 rounded-l-xl">Date</th>
                  <th className="py-3 px-4">Payout ID</th>
                  <th className="py-3 px-4">Amount</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 rounded-r-xl">Settlement Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E5E3]">
                {dashboard?.payoutHistory?.map((p) => (
                  <tr key={p.id} className="hover:bg-[#F5F5F3] transition-colors">
                    <td className="py-3.5 px-4 text-[#6F6F6B]">{new Date(p.date).toLocaleDateString()}</td>
                    <td className="py-3.5 px-4 font-mono font-bold text-[#1F1F1F]">#{p.id.slice(0, 8)}</td>
                    <td className="py-3.5 px-4 font-bold text-[#1F1F1F]">{formatMoney(p.amount, p.currency)}</td>
                    <td className="py-3.5 px-4">
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-[#EAF8EF] text-[#16A34A] border border-[#BBF7D0]">
                        {p.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-[#6F6F6B]">{new Date(p.date).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  )
}

function PaymentsSkeleton() {
  return (
    <div className="max-w-6xl space-y-8">
      <Skeleton className="h-48 w-full rounded-3xl" />
      <div className="grid grid-cols-3 gap-4">
        <Skeleton className="h-28 w-full rounded-3xl" />
        <Skeleton className="h-28 w-full rounded-3xl" />
        <Skeleton className="h-28 w-full rounded-3xl" />
      </div>
    </div>
  )
}
