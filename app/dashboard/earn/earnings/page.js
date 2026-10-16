'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { api, formatMoney } from '@/lib/clientApi'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { useDashboardHeader } from '@/components/dashboard/HeaderContext'
import { CreditCard, DollarSign, Wallet } from 'lucide-react'

export default function EarnEarningsPage() {
  const { setHeaderConfig } = useDashboardHeader()
  const [dashboard, setDashboard] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setHeaderConfig({ title: 'Earnings', actions: null })
  }, [setHeaderConfig])

  useEffect(() => {
    api.get('/payouts/dashboard')
      .then((res) => {
        setDashboard(res)
        setLoading(false)
      })
      .catch(() => {
        setDashboard({
          overview: { totalSales: 0, creatorEarnings: 0, pendingEarnings: 0, availableEarnings: 0, paidOut: 0 },
          ledger: [],
        })
        setLoading(false)
      })
  }, [])

  const overview = dashboard?.overview || {
    totalSales: 0,
    creatorEarnings: 0,
    pendingEarnings: 0,
    availableEarnings: 0,
    paidOut: 0,
  }
  const ledger = dashboard?.ledger || dashboard?.recentTransactions || []

  if (loading) {
    return (
      <div className="space-y-6 text-[#1F1F1F]">
        <h1 className="text-xl sm:text-2xl font-extrabold text-[#1F1F1F]">Earnings</h1>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
          <Skeleton className="h-28 rounded-[20px] bg-[#F5F5F3]" />
          <Skeleton className="h-28 rounded-[20px] bg-[#F5F5F3]" />
          <Skeleton className="h-28 rounded-[20px] bg-[#F5F5F3]" />
          <Skeleton className="h-28 rounded-[20px] bg-[#F5F5F3]" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 text-[#1F1F1F]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-[#1F1F1F]">Earnings & Revenue</h1>
          <p className="text-xs sm:text-sm text-[#6F6F6B] mt-0.5">Overview of your lifetime sales, pending payouts, and available balance.</p>
        </div>
        <Link href="/dashboard/payments">
          <Button variant="outline" className="rounded-full border-[#E5E5E3] bg-[#FFFFFF] text-[#1F1F1F] hover:bg-[#F5F5F3] text-xs font-semibold h-9 px-4 shadow-xs">
            <CreditCard className="h-3.5 w-3.5 mr-1.5 text-[#1F1F1F]" />
            Payout Settings
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        <div className="bg-[#FFFFFF] border border-[#E5E5E3] rounded-[20px] p-4 sm:p-5 flex flex-col justify-between hover:border-[#DADAD7] shadow-[0_8px_30px_rgba(0,0,0,0.04)] transition-all min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#6F6F6B]">Available Balance</p>
          <p className="text-xl sm:text-2xl font-bold text-[#16A34A] tracking-tight mt-1 truncate">{formatMoney(overview.availableEarnings)}</p>
        </div>
        <div className="bg-[#FFFFFF] border border-[#E5E5E3] rounded-[20px] p-4 sm:p-5 flex flex-col justify-between hover:border-[#DADAD7] shadow-[0_8px_30px_rgba(0,0,0,0.04)] transition-all min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#6F6F6B]">Pending Payout</p>
          <p className="text-xl sm:text-2xl font-bold text-[#D97706] tracking-tight mt-1 truncate">{formatMoney(overview.pendingEarnings)}</p>
        </div>
        <div className="bg-[#FFFFFF] border border-[#E5E5E3] rounded-[20px] p-4 sm:p-5 flex flex-col justify-between hover:border-[#DADAD7] shadow-[0_8px_30px_rgba(0,0,0,0.04)] transition-all min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#6F6F6B]">Net Creator Earnings</p>
          <p className="text-xl sm:text-2xl font-bold text-[#1F1F1F] tracking-tight mt-1 truncate">{formatMoney(overview.creatorEarnings)}</p>
        </div>
        <div className="bg-[#FFFFFF] border border-[#E5E5E3] rounded-[20px] p-4 sm:p-5 flex flex-col justify-between hover:border-[#DADAD7] shadow-[0_8px_30px_rgba(0,0,0,0.04)] transition-all min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#6F6F6B]">Total Paid Out</p>
          <p className="text-xl sm:text-2xl font-bold text-[#1F1F1F] tracking-tight mt-1 truncate">{formatMoney(overview.paidOut)}</p>
        </div>
      </div>

      <div className="bg-[#FFFFFF] border border-[#E5E5E3] rounded-[20px] p-4 sm:p-6 flex flex-col gap-4 shadow-[0_8px_30px_rgba(0,0,0,0.04)]">
        <h2 className="text-base sm:text-lg font-bold text-[#1F1F1F]">Recent activity</h2>
        {ledger.length === 0 ? (
          <p className="text-xs sm:text-sm text-[#6F6F6B] py-6 text-center">No earnings yet. Sales and payouts will appear here after your first order.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-[#E5E5E3]">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#FBFBFB] text-[#6F6F6B] font-bold uppercase tracking-wider border-b border-[#E5E5E3] text-[10px]">
                <tr>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E5E3] text-[#1F1F1F]">
                {ledger.slice(0, 20).map((row, i) => (
                  <tr key={row.id || i} className="hover:bg-[#F5F5F3] transition-colors">
                    <td className="py-3.5 px-4 text-[#6F6F6B]">{new Date(row.createdAt || row.date).toLocaleDateString()}</td>
                    <td className="py-3.5 px-4 font-semibold text-[#1F1F1F]">{row.type || row.status || 'Sale'}</td>
                    <td className="py-3.5 px-4 text-right font-bold text-[#1F1F1F]">{formatMoney(row.amount || row.net || 0, row.currency)}</td>
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
