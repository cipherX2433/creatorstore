'use client'

import { useEffect, useState } from 'react'
import { api, formatMoney } from '@/lib/clientApi'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import {
  ShieldCheck, RefreshCw, Banknote, DollarSign, ArrowUpRight, CheckCircle2,
  QrCode, Landmark, Users, CreditCard, Copy, Check, X, Loader2, Search
} from 'lucide-react'

export default function AdminPaymentsPage() {
  const [statsData, setStatsData] = useState(null)
  const [creators, setCreators] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [copiedId, setCopiedId] = useState(null)

  // Mark as Paid Modal State
  const [selectedCreator, setSelectedCreator] = useState(null)
  const [payAmount, setPayAmount] = useState('')
  const [referenceId, setReferenceId] = useState('')
  const [payNotes, setPayNotes] = useState('')
  const [submittingPay, setSubmittingPay] = useState(false)

  useEffect(() => {
    fetchData()
  }, [])

  function fetchData() {
    setLoading(true)
    Promise.all([
      api.get('/admin/payments').catch(() => ({ stats: {}, transfers: [] })),
      api.get('/admin/payouts').catch(() => []),
    ])
      .then(([statsRes, creatorsRes]) => {
        setStatsData(statsRes)
        setCreators(Array.isArray(creatorsRes) ? creatorsRes : [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }

  function handleCopy(text, id) {
    if (!text) return
    navigator.clipboard.writeText(text)
    setCopiedId(id)
    toast.success('Copied to clipboard')
    setTimeout(() => setCopiedId(null), 2000)
  }

  function openPayModal(creator) {
    setSelectedCreator(creator)
    setPayAmount(creator.availableBalance ? String(creator.availableBalance) : '0')
    setReferenceId('')
    setPayNotes('')
  }

  async function handleMarkPaid(e) {
    e.preventDefault()
    if (!selectedCreator) return

    const num = Number(payAmount)
    if (!num || num <= 0) {
      toast.error('Please enter a valid amount greater than 0')
      return
    }

    setSubmittingPay(true)
    try {
      const res = await api.post('/admin/payouts/mark-paid', {
        creatorId: selectedCreator.creatorId,
        amount: num,
        referenceId: referenceId.trim() || `UTR-${Date.now()}`,
        notes: payNotes.trim(),
      })

      toast.success(res.message || 'Payout successfully marked as paid!')
      setSelectedCreator(null)
      fetchData()
    } catch (err) {
      toast.error(err.message || 'Failed to mark payout as paid')
    } finally {
      setSubmittingPay(false)
    }
  }

  if (loading && !statsData) {
    return (
      <div className="max-w-6xl space-y-6">
        <Skeleton className="h-32 w-full rounded-3xl bg-[var(--bg-surface,#242424)]" />
        <div className="grid grid-cols-4 gap-4">
          <Skeleton className="h-28 w-full rounded-3xl bg-[var(--bg-surface,#242424)]" />
          <Skeleton className="h-28 w-full rounded-3xl bg-[var(--bg-surface,#242424)]" />
          <Skeleton className="h-28 w-full rounded-3xl bg-[var(--bg-surface,#242424)]" />
          <Skeleton className="h-28 w-full rounded-3xl bg-[var(--bg-surface,#242424)]" />
        </div>
      </div>
    )
  }

  const stats = statsData?.stats || { totalGmv: 0, platformRevenue: 0, creatorPayouts: 0, totalRefunds: 0 }
  const transfers = statsData?.transfers || []

  const filteredCreators = creators.filter((c) => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      c.creatorName?.toLowerCase().includes(q) ||
      c.creatorEmail?.toLowerCase().includes(q) ||
      c.accountHolderName?.toLowerCase().includes(q) ||
      c.upiIdRaw?.toLowerCase().includes(q) ||
      c.bankAccountRaw?.toLowerCase().includes(q)
    )
  })

  return (
    <div className="max-w-6xl space-y-8 pb-12 text-[var(--text-heading,#F5F5F5)]">
      
      {/* Header */}
      <div className="bg-[var(--bg-surface,#242424)] text-[var(--text-heading,#F5F5F5)] p-6 sm:p-8 rounded-[24px] border border-[var(--border-subtle,#303030)] shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-[var(--accent-primary)]">Internal Admin</span>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight mt-0.5">Manual Creator Payouts & Processing</h1>
          <p className="text-xs text-[var(--text-secondary,#A3A3A3)] font-medium pt-1">Manage creator payout accounts, review earnings owed, and log manual bank/UPI transfers.</p>
        </div>
        <Button onClick={fetchData} variant="outline" className="border-[var(--border-subtle,#303030)] bg-[var(--bg-surface-hover,#2A2A2A)] text-[var(--text-heading,#F5F5F5)] hover:bg-[var(--bg-surface-hover,#2A2A2A)] rounded-full">
          <RefreshCw className="h-4 w-4 mr-1.5 text-[var(--accent-primary)]" /> Refresh
        </Button>
      </div>

      {/* Admin Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[var(--bg-surface,#242424)] p-5 rounded-[20px] border border-[var(--border-subtle,#303030)] space-y-1">
          <span className="text-xs font-bold text-[var(--text-secondary,#A3A3A3)] uppercase tracking-wider block">Total GMV</span>
          <div className="text-2xl font-black text-[var(--text-heading,#F5F5F5)]">{formatMoney(stats.totalGmv)}</div>
          <span className="text-[11px] font-medium text-[var(--text-secondary,#A3A3A3)]">Gross marketplace volume</span>
        </div>

        <div className="bg-[var(--bg-surface,#242424)] p-5 rounded-[20px] border border-[var(--border-subtle,#303030)] space-y-1">
          <span className="text-xs font-bold text-[var(--text-secondary,#A3A3A3)] uppercase tracking-wider block">Creators Registered</span>
          <div className="text-2xl font-black text-[var(--accent-primary)]">{creators.length}</div>
          <span className="text-[11px] font-medium text-[var(--text-secondary,#A3A3A3)]">Submitted payout details</span>
        </div>

        <div className="bg-[var(--bg-surface,#242424)] p-5 rounded-[20px] border border-[var(--border-subtle,#303030)] space-y-1">
          <span className="text-xs font-bold text-[var(--text-secondary,#A3A3A3)] uppercase tracking-wider block">Total Paid Out</span>
          <div className="text-2xl font-black text-[var(--status-success,#22C55E)]">{formatMoney(stats.creatorPayouts)}</div>
          <span className="text-[11px] font-medium text-[var(--status-success,#22C55E)]/80">Manually transferred</span>
        </div>

        <div className="bg-[var(--bg-surface,#242424)] p-5 rounded-[20px] border border-[var(--border-subtle,#303030)] space-y-1">
          <span className="text-xs font-bold text-[var(--text-secondary,#A3A3A3)] uppercase tracking-wider block">Total Refunds</span>
          <div className="text-2xl font-black text-[var(--status-warning,#EF6820)]">{formatMoney(stats.totalRefunds)}</div>
          <span className="text-[11px] font-medium text-[var(--status-warning,#EF6820)]/80">Refunded orders</span>
        </div>
      </div>

      {/* Creators Payout Profiles Table */}
      <div className="bg-[var(--bg-surface,#242424)] rounded-[24px] border border-[var(--border-subtle,#303030)] shadow-md p-6 sm:p-8 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-extrabold text-[var(--text-heading,#F5F5F5)]">Creator Payout Accounts</h2>
            <p className="text-xs text-[var(--text-secondary,#A3A3A3)] font-medium">List of creators with saved payout details for manual processing</p>
          </div>

          <div className="relative w-64">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--text-secondary,#A3A3A3)]" />
            <input
              type="text"
              placeholder="Search creator, UPI, account..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-9 pl-9 pr-3 rounded-full bg-[var(--bg-surface-hover,#2A2A2A)] border border-[var(--border-subtle,#303030)] text-xs text-[var(--text-heading,#F5F5F5)] placeholder:text-[var(--text-secondary,#A3A3A3)] focus:outline-none focus:border-[var(--accent-primary)]"
            />
          </div>
        </div>

        {filteredCreators.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed border-[var(--border-subtle,#303030)] rounded-2xl space-y-2">
            <Users className="h-10 w-10 text-[var(--text-secondary,#A3A3A3)] mx-auto" />
            <p className="text-sm font-bold text-[var(--text-heading,#F5F5F5)]">No creator payout accounts found</p>
            <p className="text-xs text-[var(--text-secondary,#A3A3A3)]">Creators who submit their UPI or bank account will appear here.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-medium text-[var(--text-heading,#F5F5F5)]">
              <thead className="bg-[var(--bg-sidebar,#0D0D0D)] text-[var(--text-secondary,#A3A3A3)] uppercase text-[10px] font-black tracking-wider border-b border-[var(--border-subtle,#303030)]">
                <tr>
                  <th className="py-3 px-4 rounded-l-xl">Creator</th>
                  <th className="py-3 px-4">Payout Method</th>
                  <th className="py-3 px-4">Account Holder</th>
                  <th className="py-3 px-4">Payout Details</th>
                  <th className="py-3 px-4">Available Balance</th>
                  <th className="py-3 px-4 text-right rounded-r-xl">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle,#303030)]">
                {filteredCreators.map((c) => {
                  const rawTarget = c.payoutMethod === 'UPI' ? c.upiIdRaw : `${c.bankAccountRaw} (${c.ifsc})`
                  const maskedDisplay = c.payoutMethod === 'UPI' ? c.upiIdMasked : `${c.bankAccountMasked} (${c.bankIfscMasked})`

                  return (
                    <tr key={c.id} className="hover:bg-[var(--bg-surface-hover,#2A2A2A)] transition-colors">
                      <td className="py-3.5 px-4">
                        <span className="font-bold text-[var(--text-heading,#F5F5F5)] block">{c.creatorName}</span>
                        <span className="text-[11px] text-[var(--text-secondary,#A3A3A3)] block">{c.creatorEmail}</span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[var(--accent-primary)]/15 text-[var(--accent-primary)] border border-[var(--accent-primary)]/20">
                          {c.payoutMethod === 'UPI' ? (
                            <>
                              <QrCode className="h-3 w-3" /> UPI
                            </>
                          ) : (
                            <>
                              <Landmark className="h-3 w-3" /> Bank
                            </>
                          )}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-[var(--text-heading,#F5F5F5)]">
                        {c.accountHolderName}
                      </td>
                      <td className="py-3.5 px-4 font-mono">
                        <div className="flex items-center gap-2">
                          <span className="text-[var(--text-heading,#F5F5F5)] font-bold">{maskedDisplay}</span>
                          {rawTarget && (
                            <button
                              type="button"
                              onClick={() => handleCopy(rawTarget, c.id)}
                              className="p-1 rounded bg-[var(--bg-surface-hover,#2A2A2A)] hover:bg-[var(--border-subtle,#303030)] text-[var(--text-secondary,#A3A3A3)] hover:text-white transition-colors cursor-pointer"
                              title="Copy raw details for payment"
                            >
                              {copiedId === c.id ? <Check className="h-3 w-3 text-[var(--status-success,#22C55E)]" /> : <Copy className="h-3 w-3" />}
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="text-sm font-black text-[var(--status-success,#22C55E)]">
                          {formatMoney(c.availableBalance)}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <Button
                          size="sm"
                          onClick={() => openPayModal(c)}
                          className="font-bold text-xs bg-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/90 text-white rounded-full h-8 px-3.5 cursor-pointer shadow-sm"
                        >
                          Mark as Paid
                        </Button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Recent Payout Transfers Log */}
      <div className="bg-[var(--bg-surface,#242424)] rounded-[24px] border border-[var(--border-subtle,#303030)] shadow-md p-6 sm:p-8 space-y-6">
        <div>
          <h2 className="text-xl font-extrabold text-[var(--text-heading,#F5F5F5)]">Recent Processed Payouts</h2>
          <p className="text-xs text-[var(--text-secondary,#A3A3A3)] font-medium">Reconciliation audit log of manual creator transfers</p>
        </div>

        {transfers.length === 0 ? (
          <div className="text-center py-10 border-2 border-dashed border-[var(--border-subtle,#303030)] rounded-2xl space-y-2">
            <Banknote className="h-8 w-8 text-[var(--text-secondary,#A3A3A3)] mx-auto" />
            <p className="text-xs font-bold text-[var(--text-secondary,#A3A3A3)]">No manual transfers recorded yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-medium text-[var(--text-heading,#F5F5F5)]">
              <thead className="bg-[var(--bg-sidebar,#0D0D0D)] text-[var(--text-secondary,#A3A3A3)] uppercase text-[10px] font-black tracking-wider border-b border-[var(--border-subtle,#303030)]">
                <tr>
                  <th className="py-3 px-4 rounded-l-xl">Reference / UTR</th>
                  <th className="py-3 px-4">Amount</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 rounded-r-xl">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle,#303030)]">
                {transfers.map((t) => (
                  <tr key={t.id} className="hover:bg-[var(--bg-surface-hover,#2A2A2A)] transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-[var(--text-heading,#F5F5F5)]">{t.transferId || t.razorpayTransferId || t.id.slice(0, 12)}</td>
                    <td className="py-3 px-4 font-black text-[var(--status-success,#22C55E)]">{formatMoney(t.amount)}</td>
                    <td className="py-3 px-4">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-[var(--status-success,#22C55E)]/10 text-[var(--status-success,#22C55E)] border border-[var(--status-success,#22C55E)]/20">
                        {t.status || 'PROCESSED'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-[var(--text-secondary,#A3A3A3)]">{new Date(t.date || t.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ================= MARK AS PAID MODAL ================= */}
      {selectedCreator && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg bg-[var(--bg-surface,#242424)] border border-[var(--border-subtle,#303030)] rounded-[24px] p-6 sm:p-8 shadow-2xl text-[var(--text-heading,#F5F5F5)] space-y-6">
            
            <button
              onClick={() => setSelectedCreator(null)}
              className="absolute top-4 right-4 p-1.5 rounded-full bg-[var(--bg-surface-hover,#2A2A2A)] text-[var(--text-secondary,#A3A3A3)] hover:text-white transition-colors cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--accent-primary)]">Manual Payout Transfer</span>
              <h2 className="text-xl font-extrabold text-white">Record Payout for {selectedCreator.creatorName}</h2>
              <p className="text-xs text-[var(--text-secondary,#A3A3A3)]">Enter the transferred amount and reference ID (UTR / bank ref) to log this manual payout.</p>
            </div>

            {/* Target Account Summary Box */}
            <div className="bg-[var(--bg-surface-hover,#2A2A2A)] p-4 rounded-[16px] border border-[var(--border-subtle,#303030)] space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-[var(--text-secondary,#A3A3A3)]">Method:</span>
                <span className="font-bold text-white">{selectedCreator.payoutMethod === 'UPI' ? 'UPI Transfer' : 'Bank Transfer'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--text-secondary,#A3A3A3)]">Account Holder:</span>
                <span className="font-bold text-white">{selectedCreator.accountHolderName}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[var(--text-secondary,#A3A3A3)]">Details:</span>
                <div className="flex items-center gap-1.5 font-mono font-bold text-white">
                  <span>{selectedCreator.payoutMethod === 'UPI' ? selectedCreator.upiIdRaw || selectedCreator.upiIdMasked : `${selectedCreator.bankAccountRaw || selectedCreator.bankAccountMasked} (${selectedCreator.ifsc})`}</span>
                  <button
                    type="button"
                    onClick={() => handleCopy(selectedCreator.payoutMethod === 'UPI' ? selectedCreator.upiIdRaw : `${selectedCreator.bankAccountRaw}, ${selectedCreator.ifsc}`, 'modal')}
                    className="p-1 rounded bg-[var(--bg-surface,#242424)] text-[var(--text-secondary,#A3A3A3)] hover:text-white cursor-pointer"
                  >
                    <Copy className="h-3 w-3" />
                  </button>
                </div>
              </div>
              <div className="flex justify-between pt-1 border-t border-[var(--border-subtle,#303030)]">
                <span className="text-[var(--text-secondary,#A3A3A3)]">Current Available Balance:</span>
                <span className="font-black text-[var(--status-success,#22C55E)]">{formatMoney(selectedCreator.availableBalance)}</span>
              </div>
            </div>

            <form onSubmit={handleMarkPaid} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="payAmount" className="text-xs font-bold text-[var(--text-heading,#F5F5F5)]">
                  Payout Amount (₹) <span className="text-[var(--status-error,#EF4444)]">*</span>
                </Label>
                <Input
                  id="payAmount"
                  type="number"
                  step="0.01"
                  required
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  className="rounded-full h-11 bg-[var(--bg-surface-hover,#2A2A2A)] border border-[var(--border-subtle,#303030)] text-white font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="referenceId" className="text-xs font-bold text-[var(--text-heading,#F5F5F5)]">
                  UTR / Transaction Reference ID
                </Label>
                <Input
                  id="referenceId"
                  type="text"
                  placeholder="e.g. UTR1234567890 or Bank Transaction ID"
                  value={referenceId}
                  onChange={(e) => setReferenceId(e.target.value)}
                  className="rounded-full h-11 bg-[var(--bg-surface-hover,#2A2A2A)] border border-[var(--border-subtle,#303030)] text-white font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="payNotes" className="text-xs font-bold text-[var(--text-heading,#F5F5F5)]">
                  Internal Notes (Optional)
                </Label>
                <Input
                  id="payNotes"
                  type="text"
                  placeholder="e.g. Processed via HDFC Corporate Netbanking"
                  value={payNotes}
                  onChange={(e) => setPayNotes(e.target.value)}
                  className="rounded-full h-11 bg-[var(--bg-surface-hover,#2A2A2A)] border border-[var(--border-subtle,#303030)] text-white"
                />
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setSelectedCreator(null)}
                  className="rounded-full border-[var(--border-subtle,#303030)] text-[var(--text-heading,#F5F5F5)] hover:bg-[var(--bg-surface-hover,#2A2A2A)]"
                >
                  Cancel
                </Button>
                <button
                  type="submit"
                  disabled={submittingPay}
                  className="font-extrabold bg-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/90 text-white rounded-full h-10 px-6 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 text-xs shadow-sm"
                >
                  {submittingPay ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                  Confirm Payout Paid
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  )
}
