'use client'

import { useEffect, useState } from 'react'
import { api, formatMoney } from '@/lib/clientApi'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Sparkles, TrendingUp, Users, ShoppingBag, Eye, Percent, Bot, MessageSquare, MousePointer, DollarSign } from 'lucide-react'
import { ResponsiveContainer, AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts'

import { useDashboardHeader } from '@/components/dashboard/HeaderContext'

export default function AnalyticsPage() {
  const [days, setDays] = useState(30)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const { setHeaderConfig } = useDashboardHeader()

  useEffect(() => {
    setHeaderConfig({
      title: 'Analytics',
      actions: (
        <div className="flex items-center gap-1 p-1 bg-[#F2F1EF] rounded-full border border-[#E5E5E3]">
          {[
            { label: '7D', value: 7 },
            { label: '30D', value: 30 },
            { label: '90D', value: 90 },
            { label: 'All', value: 365 },
          ].map((item) => (
            <button
              key={item.value}
              onClick={() => setDays(item.value)}
              className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                days === item.value
                  ? 'bg-[#1F1F1F] text-white shadow-none'
                  : 'text-[#6F6F6B] hover:text-[#1F1F1F] hover:bg-[#FFFFFF]'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      )
    })
  }, [days, setHeaderConfig])

  useEffect(() => {
    let mounted = true
    setLoading(true)
    api.get(`/analytics/overview?days=${days}`)
      .then((d) => { if (mounted) { setData(d); setLoading(false) } })
      .catch(() => { if (mounted) setLoading(false) })
    return () => { mounted = false }
  }, [days])

  const cur = data?.currency || 'usd'

  const funnel = data ? [
    { stage: 'Store Views', value: data.storeViews },
    { stage: 'Product Views', value: data.productViews },
    { stage: 'Checkouts', value: data.checkoutStarted },
    { stage: 'Paid Orders', value: data.orders },
  ] : []

  const ig = data?.instagram || {
    comments: 0,
    dmsSent: 0,
    dmFailures: 0,
    dmSuccessRate: 0,
    clicks: 0,
    checkouts: 0,
    purchases: 0,
    revenue: 0,
    conversionRate: 0
  }

  const stats = [
    { label: `${days}-Day Revenue`, value: formatMoney(data?.revenue || 0, cur), icon: TrendingUp },
    { label: 'Total Orders', value: data?.orders ?? 0, icon: ShoppingBag },
    { label: 'Conversion Rate', value: `${data?.conversion ?? 0}%`, icon: Percent },
    { label: 'Storefront Views', value: data?.storeViews ?? 0, icon: Eye },
  ]

  return (
    <div className="space-y-6 text-[#1F1F1F]">

      {/* Subtitle Banner */}
      <div className="bg-[#FFFFFF] p-6 sm:p-8 rounded-[24px] border border-[#E5E5E3] shadow-[0_8px_30px_rgba(0,0,0,0.04)] flex items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-bold text-[#1F1F1F] bg-[#F2F1EF] px-3.5 py-1 rounded-full border border-[#E5E5E3] mb-2">
            <Sparkles className="h-3.5 w-3.5" /> Performance Metrics
          </div>
          <p className="text-xs sm:text-sm text-[#6F6F6B] font-medium">Real-time store traffic, Instagram comment-to-DM attribution, and revenue trends.</p>
        </div>
      </div>

      {/* Stat Grid */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-[24px] border border-[#E5E5E3] bg-[#FFFFFF] p-6 shadow-[0_8px_30px_rgba(0,0,0,0.04)]">
            <div className="flex h-10 w-10 items-center justify-center rounded-[12px] bg-[#F2F1EF] text-[#1F1F1F] border border-[#E5E5E3]">
              <s.icon className="h-5 w-5" />
            </div>
            {loading ? <Skeleton className="mt-4 h-8 w-24 rounded-lg bg-[#F2F1EF]" /> : <p className="mt-4 text-3xl font-extrabold text-[#1F1F1F] tracking-tight">{s.value}</p>}
            <p className="mt-1 text-xs font-bold text-[#6F6F6B] tracking-wide uppercase">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Instagram Automation Attribution Metrics Card */}
      <div className="bg-[#FFFFFF] rounded-[24px] border border-[#E5E5E3] p-6 sm:p-8 space-y-6 shadow-[0_8px_30px_rgba(0,0,0,0.04)]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[#F2F1EF] text-[#1F1F1F] rounded-[16px] border border-[#E5E5E3]">
              <Bot className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-xl font-black text-[#1F1F1F] tracking-tight">Instagram Conversion Attribution</h2>
              <p className="text-xs text-[#6F6F6B]">Verified sales attributable to Instagram Comment → DM automations.</p>
            </div>
          </div>
          <span className="text-xs font-black text-[#1F1F1F] bg-[#F2F1EF] px-3.5 py-1.5 rounded-full border border-[#E5E5E3]">
            Conv. Rate: {ig.conversionRate}%
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="bg-[#FBFBFB] p-4 rounded-[18px] border border-[#E5E5E3]">
            <span className="text-[10px] font-bold text-[#6F6F6B] uppercase tracking-wider block">Comments</span>
            <p className="text-2xl font-black text-[#1F1F1F] mt-1">{ig.comments.toLocaleString()}</p>
          </div>

          <div className="bg-[#FBFBFB] p-4 rounded-[18px] border border-[#E5E5E3]">
            <span className="text-[10px] font-bold text-[#6F6F6B] uppercase tracking-wider block">DMs Sent</span>
            <p className="text-2xl font-black text-[#16A34A] mt-1">{ig.dmsSent.toLocaleString()}</p>
            <span className="text-[10px] text-[#6F6F6B]">{ig.dmSuccessRate}% success</span>
          </div>

          <div className="bg-[#FBFBFB] p-4 rounded-[18px] border border-[#E5E5E3]">
            <span className="text-[10px] font-bold text-[#6F6F6B] uppercase tracking-wider block">DM Clicks</span>
            <p className="text-2xl font-black text-[#1F1F1F] mt-1">{ig.clicks.toLocaleString()}</p>
          </div>

          <div className="bg-[#FBFBFB] p-4 rounded-[18px] border border-[#E5E5E3]">
            <span className="text-[10px] font-bold text-[#6F6F6B] uppercase tracking-wider block">Checkouts</span>
            <p className="text-2xl font-black text-[#1F1F1F] mt-1">{ig.checkouts.toLocaleString()}</p>
          </div>

          <div className="bg-[#FBFBFB] p-4 rounded-[18px] border border-[#E5E5E3]">
            <span className="text-[10px] font-bold text-[#6F6F6B] uppercase tracking-wider block">IG Purchases</span>
            <p className="text-2xl font-black text-[#1F1F1F] mt-1">{ig.purchases.toLocaleString()}</p>
          </div>

          <div className="bg-[#FBFBFB] p-4 rounded-[18px] border border-[#E5E5E3] col-span-2 sm:col-span-1">
            <span className="text-[10px] font-bold text-[#6F6F6B] uppercase tracking-wider block">IG Revenue</span>
            <p className="text-2xl font-black text-[#1F1F1F] mt-1">₹{ig.revenue.toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">

        {/* Revenue Area Chart */}
        <div className="rounded-[24px] border border-[#E5E5E3] bg-[#FFFFFF] p-6 sm:p-8 shadow-[0_8px_30px_rgba(0,0,0,0.04)] space-y-4">
          <div>
            <h2 className="font-extrabold text-lg text-[#1F1F1F]">Revenue Trajectory</h2>
            <p className="text-xs text-[#6F6F6B] font-medium">Daily revenue progression over the last {days} days</p>
          </div>

          <div className="h-64 pt-2">
            {loading ? <Skeleton className="h-full w-full rounded-[18px] bg-[#F2F1EF]" /> : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data?.revenueSeries || []}>
                  <defs>
                    <linearGradient id="anGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#1F1F1F" stopOpacity={0.12} />
                      <stop offset="100%" stopColor="#1F1F1F" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E5E3" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#6F6F6B' }} tickFormatter={(d) => d.slice(5)} minTickGap={24} stroke="#E5E5E3" />
                  <YAxis tick={{ fontSize: 11, fill: '#6F6F6B' }} width={45} stroke="#E5E5E3" />
                  <Tooltip formatter={(v) => formatMoney(v, cur)} contentStyle={{ backgroundColor: '#FFFFFF', borderRadius: 16, border: '1px solid #E5E5E3', color: '#1F1F1F', fontSize: 12, boxShadow: '0 8px 30px rgba(0,0,0,0.04)' }} />
                  <Area type="monotone" dataKey="value" stroke="#1F1F1F" strokeWidth={2.5} fill="url(#anGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Conversion Funnel */}
        <div className="rounded-[24px] border border-[#E5E5E3] bg-[#FFFFFF] p-6 sm:p-8 shadow-[0_8px_30px_rgba(0,0,0,0.04)] space-y-4">
          <div>
            <h2 className="font-extrabold text-lg text-[#1F1F1F]">Conversion Funnel</h2>
            <p className="text-xs text-[#6F6F6B] font-medium">Visitor drop-off from storefront views to paid orders</p>
          </div>

          <div className="h-64 pt-2">
            {loading ? <Skeleton className="h-full w-full rounded-[18px] bg-[#F2F1EF]" /> : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={funnel} layout="vertical" margin={{ left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E5E5E3" />
                  <XAxis type="number" tick={{ fontSize: 11, fill: '#6F6F6B' }} allowDecimals={false} stroke="#E5E5E3" />
                  <YAxis type="category" dataKey="stage" tick={{ fontSize: 11, fill: '#6F6F6B', fontWeight: 600 }} width={100} stroke="#E5E5E3" />
                  <Tooltip contentStyle={{ backgroundColor: '#FFFFFF', borderRadius: 16, border: '1px solid #E5E5E3', color: '#1F1F1F', fontSize: 12, boxShadow: '0 8px 30px rgba(0,0,0,0.04)' }} />
                  <Bar dataKey="value" fill="#1F1F1F" radius={[0, 8, 8, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

      </div>

    </div>
  )
}
