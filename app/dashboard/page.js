'use client'

import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  ShoppingBag, Users, Eye, ArrowUpRight,
  Plus, Package, DollarSign,
  Share2, Bell, Palette, Send
} from 'lucide-react'
import {
  ResponsiveContainer, AreaChart, Area
} from 'recharts'
import { api, formatMoney } from '@/lib/clientApi'
import { useDashboard } from '@/components/dashboard/DashboardContext'
import { useDashboardHeader } from '@/components/dashboard/HeaderContext'
import { useNotifications } from '@/context/NotificationContext'

// Color Constants matching CreatorStore Light Neutral Design System
const ACCENT_PRIMARY = '#1F1F1F'
const ACCENT_SECONDARY = '#777777'
const STATUS_SUCCESS = '#16A34A'
const BG_SURFACE = '#FFFFFF'
const BG_SURFACE_HOVER = '#F2F2F2'
const BORDER_SUBTLE = '#E8E8E8'
const TEXT_HEADING = '#222222'
const TEXT_SECONDARY = '#777777'

// Store Profile Overview Card Component (Strictly follows Reference Image 1 & 2)
function StoreProfileCard({ avatarUrl, displayName, itemCountLabel, onShare, className = '' }) {
  return (
    <div className={`rounded-[28px] bg-[#FFFFFF] border border-[#E8E8E8] p-5 sm:p-6 flex flex-col justify-between shadow-[0_2px_12px_rgba(0,0,0,0.03)] ${className}`}>
      {/* Centered Large Circular Avatar */}
      <div className="py-6 sm:py-7 flex items-center justify-center">
        <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-full bg-[#F2F2F2] border border-[#E8E8E8] flex items-center justify-center overflow-hidden shadow-2xs text-[#777777] shrink-0">
          {avatarUrl ? (
            <img src={avatarUrl} alt={displayName} className="w-full h-full object-cover" />
          ) : (
            <svg className="w-20 h-20 text-[#CCCCCC] fill-current" viewBox="0 0 24 24">
              <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
            </svg>
          )}
        </div>
      </div>

      {/* Card Footer: Name and metadata on left, Share and Edit actions on right */}
      <div className="flex items-end justify-between gap-3 pt-2">
        <div className="min-w-0">
          <p className="text-base font-bold text-[#222222] truncate tracking-tight">{displayName}</p>
          <p className="text-xs text-[#777777] font-medium mt-0.5">{itemCountLabel}</p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onShare}
            className="p-2.5 rounded-full bg-[#FFFFFF] border border-[#E8E8E8] hover:bg-[#F2F2F2] hover:border-[#D0D0CE] text-[#222222] transition-all shadow-2xs cursor-pointer"
            aria-label="Share store"
            title="Share storefront"
          >
            <Share2 className="h-4 w-4 stroke-[2]" />
          </button>

          <Link
            href="/dashboard/store"
            className="px-4 py-2 rounded-full bg-[#FFFFFF] border border-[#E8E8E8] hover:bg-[#F2F2F2] hover:border-[#D0D0CE] text-xs font-bold text-[#222222] transition-all shadow-2xs cursor-pointer inline-flex items-center justify-center"
            aria-label="Edit store"
          >
            Edit
          </Link>
        </div>
      </div>
    </div>
  )
}

export default function DashboardOverviewPage() {
  const router = useRouter()
  const { me } = useDashboard()
  const { setPricingModalOpen } = useDashboardHeader()
  const { openNotificationCenter, unreadCount } = useNotifications()

  const sub = me?.subscription
  const isPaid = Boolean(sub?.status === 'ACTIVE' && !sub?.isTrial && sub?.planId !== 'UNSUBSCRIBED' && sub?.plan !== 'UNSUBSCRIBED')
  const isTrialActive = Boolean(
    !isPaid &&
    (sub?.isTrial || sub?.status === 'TRIALING' || sub?.trialStatus === 'ACTIVE') &&
    !sub?.isTrialExpired &&
    sub?.trialStatus !== 'EXPIRED' &&
    sub?.status !== 'EXPIRED' &&
    (!sub?.trialEndsAt || new Date(sub.trialEndsAt).getTime() > Date.now())
  )
  const canCreate = isPaid || isTrialActive
  const [days, setDays] = useState(30)
  const [loading, setLoading] = useState(true)
  const [analytics, setAnalytics] = useState(null)
  const [products, setProducts] = useState([])
  const [orders, setOrders] = useState([])
  const [customers, setCustomers] = useState([])
  const [storeData, setStoreData] = useState(null)

  const creatorName = me?.profile?.name || me?.store?.username || 'Creator'

  useEffect(() => {
    let isMounted = true
    setLoading(true)

    Promise.all([
      api.get(`/analytics/overview?days=${days}`).catch(() => null),
      api.get('/products').catch(() => ({ products: [] })),
      api.get('/orders?page=1&limit=10').catch(() => ({ orders: [] })),
      api.get('/customers').catch(() => ({ customers: [] })),
      api.get('/store').catch(() => null),
    ]).then(([analyticsRes, productsRes, ordersRes, customersRes, storeRes]) => {
      if (!isMounted) return
      setAnalytics(analyticsRes)
      setProducts(productsRes?.products || productsRes?.items || [])
      setOrders(ordersRes?.orders || ordersRes?.items || [])
      setCustomers(customersRes?.customers || customersRes?.items || [])
      setStoreData(storeRes?.store || storeRes || null)
      setLoading(false)
    }).catch(() => {
      if (isMounted) setLoading(false)
    })

    return () => { isMounted = false }
  }, [days])

  const currency = analytics?.currency || 'inr'

  // Metric values with real database data
  const paidOrders = useMemo(() => orders.filter((o) => o.status === 'PAID'), [orders])
  const totalRevenue = analytics?.revenue ?? paidOrders.reduce((acc, o) => acc + (Number(o.amount) || 0), 0)
  const totalOrders = analytics?.orders ?? (paidOrders.length || orders.length)
  const totalCustomers = customers.length || analytics?.customers || 0
  const storeViews = analytics?.storeViews || 0

  // Metric sparkline data series from real analytics/orders
  const revenueChartData = useMemo(() => {
    if (analytics?.revenueSeries && analytics.revenueSeries.length > 0) {
      return analytics.revenueSeries.map((d) => ({
        date: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        revenue: d.value || 0,
        orders: d.orders || 0,
      }))
    }
    if (analytics?.dailyRevenue && analytics.dailyRevenue.length > 0) {
      return analytics.dailyRevenue.map((d) => ({
        date: d.date,
        revenue: d.revenue || 0,
        orders: d.orders || 0,
      }))
    }

    // Real empty baseline over selected date range
    const daysCount = days === 7 ? 7 : days === 30 ? 14 : 12
    const data = []
    const now = new Date()
    for (let i = daysCount - 1; i >= 0; i--) {
      const d = new Date()
      d.setDate(now.getDate() - i * (days === 30 ? 2 : 1))
      const dateLabel = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      data.push({
        date: dateLabel,
        revenue: 0,
        orders: 0,
      })
    }
    return data
  }, [analytics, days])

  // Sparkline data generators from real activity
  const sparklineRevenue = useMemo(() => {
    if (revenueChartData.length > 0) {
      return revenueChartData.map((d) => ({ v: d.revenue }))
    }
    return [{ v: 0 }, { v: 0 }]
  }, [revenueChartData])

  const sparklineOrders = useMemo(() => {
    if (revenueChartData.length > 0) {
      return revenueChartData.map((d) => ({ v: d.orders }))
    }
    return [{ v: 0 }, { v: 0 }]
  }, [revenueChartData])

  const sparklineCustomers = useMemo(() => {
    return [{ v: totalCustomers }, { v: totalCustomers }]
  }, [totalCustomers])

  const sparklineViews = useMemo(() => {
    return [{ v: storeViews }, { v: storeViews }]
  }, [storeViews])



  const rawStore = storeData || me?.store || {}
  const storeSections = rawStore?.sections || []
  const totalLinksCount = storeSections.length > 0 ? storeSections.length : products.length
  const itemCountLabel = `${totalLinksCount} link${totalLinksCount === 1 ? '' : 's'} + Shop`

  const avatarUrl = rawStore?.theme?.avatarUrl || rawStore?.avatarUrl || me?.profile?.avatarUrl || null
  const username = rawStore?.username || me?.store?.username || me?.profile?.username || 'store'
  const displayName = rawStore?.title || me?.profile?.name || username
  const storeUrlDisplay = `creatorstore.store/${username}`
  const liveStoreHref = `/${username}`

  const handleShare = () => {
    const url = typeof window !== 'undefined' ? `${window.location.origin}/${username}` : `/${username}`
    if (navigator.share) {
      navigator.share({ title: displayName, url }).catch(() => {})
    } else if (navigator.clipboard) {
      navigator.clipboard.writeText(url)
      toast.success('Storefront link copied to clipboard!')
    }
  }

  const greeting = useMemo(() => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good morning'
    if (hour < 18) return 'Good afternoon'
    return 'Good evening'
  }, [])

  const performanceTitle = days === 7 ? 'In the last 7 days' : days === 30 ? 'In the last 30 days' : 'In the last 90 days'

  return (
    <div className="space-y-6 sm:space-y-8 bg-transparent text-[#222222] min-h-screen">

      {/* A. MOBILE DASHBOARD OVERVIEW (Strictly Reference Image 1) */}
      <div className="md:hidden space-y-4">
        {/* 1. Mobile Header Row: Avatar + Pro plan pill on left, Share / Notifications / Send on right */}
        <div className="flex items-center justify-between pt-1 pb-1">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-[#F2F2F2] border border-[#E8E8E8] overflow-hidden flex items-center justify-center shrink-0 text-[#777777]">
              {avatarUrl ? (
                <img src={avatarUrl} alt={displayName} className="w-full h-full object-cover" />
              ) : (
                <svg className="w-5 h-5 text-[#CCCCCC] fill-current" viewBox="0 0 24 24">
                  <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                </svg>
              )}
            </div>
            <button
              type="button"
              onClick={() => setPricingModalOpen(true)}
              className="px-3.5 py-1.5 rounded-full border border-[#E8E8E8] bg-[#FFFFFF] text-[#222222] text-xs font-semibold hover:bg-[#F2F2F2] hover:border-[#D0D0CE] shadow-2xs transition-colors cursor-pointer"
            >
              {isPaid ? 'Pro Plan' : isTrialActive ? 'Keep Pro' : 'Reactivate Pro'}
            </button>
          </div>

          <div className="flex items-center gap-1.5 text-[#222222]">
            <button
              type="button"
              onClick={handleShare}
              className="p-2 rounded-full hover:bg-[#F2F2F2] transition-colors cursor-pointer"
              aria-label="Share storefront"
            >
              <Share2 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={openNotificationCenter}
              className="relative p-2 rounded-full hover:bg-[#F2F2F2] transition-colors cursor-pointer"
              aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#8B5CF6] ring-2 ring-white" />
              )}
            </button>
            <Link
              href="/dashboard/support"
              className="p-2 rounded-full hover:bg-[#F2F2F2] transition-colors"
              aria-label="Messages"
            >
              <Send className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {/* 2. Creator Info & Action Pills */}
        <div className="space-y-1 pt-1">
          <h1 className="text-2xl font-extrabold text-[#222222] tracking-tight">{username}</h1>
          <p className="text-xs text-[#777777] font-medium">{storeUrlDisplay}</p>

          <div className="flex items-center gap-2 pt-3 overflow-x-auto no-scrollbar">
            <Link
              href="/dashboard/store"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#FFFFFF] border border-[#E8E8E8] hover:bg-[#F2F2F2] hover:border-[#D0D0CE] text-[#222222] text-xs font-semibold shrink-0 shadow-2xs transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add</span>
            </Link>
            <Link
              href="/dashboard/products"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#FFFFFF] border border-[#E8E8E8] hover:bg-[#F2F2F2] hover:border-[#D0D0CE] text-[#222222] text-xs font-semibold shrink-0 shadow-2xs transition-colors"
            >
              <Package className="h-3.5 w-3.5" />
              <span>Products</span>
            </Link>
            <Link
              href="/dashboard/store?tab=design"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#FFFFFF] border border-[#E8E8E8] hover:bg-[#F2F2F2] hover:border-[#D0D0CE] text-[#222222] text-xs font-semibold shrink-0 shadow-2xs transition-colors"
            >
              <Palette className="h-3.5 w-3.5" />
              <span>Design</span>
            </Link>
          </div>
        </div>

        {/* 3. Mobile Store Profile Overview Card */}
        <div className="pt-2">
          <StoreProfileCard
            avatarUrl={avatarUrl}
            displayName={username}
            itemCountLabel={itemCountLabel}
            onShare={handleShare}
            className="w-full"
          />
        </div>

        {/* 4. Mobile Performance Heading */}
        <div className="flex items-center justify-between pt-4 pb-1">
          <h2 className="text-lg font-bold text-[#222222] tracking-tight">{performanceTitle}</h2>
          <div className="flex items-center gap-1 p-0.5 bg-[#FFFFFF] rounded-full border border-[#E8E8E8] shadow-2xs shrink-0">
            {[
              { label: '7D', value: 7 },
              { label: '30D', value: 30 },
              { label: '90D', value: 90 },
            ].map((item) => (
              <button
                key={item.value}
                onClick={() => setDays(item.value)}
                className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium transition-all ${
                  days === item.value ? 'bg-[#1F1F1F] text-[#FFFFFF] font-bold shadow-2xs' : 'text-[#777777] hover:text-[#222222]'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* B. DESKTOP DASHBOARD OVERVIEW (Strictly Reference Image 2) */}
      <div className="hidden md:block space-y-6">
        {/* 1. Desktop Header: Greeting & Live Storefront Shortcut */}
        <div className="flex items-center justify-between gap-4 pb-2">
          <h1 className="text-2xl lg:text-3xl font-extrabold text-[#222222] tracking-tight truncate">
            {greeting}, {username}
          </h1>

          <div className="flex items-center gap-3 shrink-0">
            <a
              href={liveStoreHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#FFFFFF] border border-[#E8E8E8] hover:border-[#D0D0CE] hover:bg-[#F2F2F2] text-[#222222] text-xs font-semibold shadow-[0_2px_8px_rgba(0,0,0,0.03)] transition-all cursor-pointer shrink-0"
            >
              <span className="text-[#16A34A] font-bold">✳</span>
              <span className="truncate max-w-[200px]">{storeUrlDisplay}</span>
              <ArrowUpRight className="h-3.5 w-3.5 text-[#777777]" />
            </a>
          </div>
        </div>

        {/* 2. Desktop Store Profile Overview Card */}
        <div className="space-y-3 pt-1">
          <h2 className="text-base font-bold text-[#222222]">Your Store</h2>
          <StoreProfileCard
            avatarUrl={avatarUrl}
            displayName={username}
            itemCountLabel={itemCountLabel}
            onShare={handleShare}
            className="w-full max-w-[340px]"
          />
        </div>

        {/* 3. Desktop Performance Heading & Date Range Selector */}
        <div className="flex items-center justify-between pt-4 pb-1">
          <h2 className="text-xl font-bold text-[#222222] tracking-tight">{performanceTitle}</h2>
          <div className="flex items-center gap-1 p-1 bg-[#FFFFFF] rounded-full border border-[#E8E8E8] shadow-2xs shrink-0">
            {[
              { label: '7D', value: 7 },
              { label: '30D', value: 30 },
              { label: '90D', value: 90 },
            ].map((item) => (
              <button
                key={item.value}
                onClick={() => setDays(item.value)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-all cursor-pointer whitespace-nowrap ${
                  days === item.value
                    ? 'bg-[#1F1F1F] text-[#FFFFFF] font-bold shadow-2xs'
                    : 'text-[#777777] hover:text-[#222222] hover:bg-[#F2F2F2]'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 2. 4 LARGE SOLID KPI CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">

        {/* KPI 1: Total Revenue */}
        <div className="bg-[#FFFFFF] border border-[#E8E8E8] rounded-[20px] p-4 sm:p-5 lg:p-6 flex flex-col justify-between hover:border-[#D0D0CE] shadow-[0_2px_12px_rgba(0,0,0,0.03)] transition-all min-w-0">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-full bg-[#F2F2F2] border border-[#E8E8E8] flex items-center justify-center text-[#222222]">
              <DollarSign className="h-5 w-5" />
            </div>
            {totalRevenue > 0 && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#16A34A]/10 text-[#16A34A] border border-[#16A34A]/20">
                Live
              </span>
            )}
          </div>

          <div className="mt-3 sm:mt-4 min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-[#777777]">Total Revenue</p>
            <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-[#222222] tracking-tight mt-1 truncate">
              {formatMoney(totalRevenue, currency)}
            </p>
          </div>

          <div className="h-8 mt-3 w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={sparklineRevenue}>
                <Area type="monotone" dataKey="v" stroke="#1F1F1F" strokeWidth={2} fill="#1F1F1F" fillOpacity={0.06} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* KPI 2: Total Orders */}
        <div className="bg-[#FFFFFF] border border-[#E8E8E8] rounded-[20px] p-4 sm:p-5 lg:p-6 flex flex-col justify-between hover:border-[#D0D0CE] shadow-[0_2px_12px_rgba(0,0,0,0.03)] transition-all min-w-0">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-full bg-[#F2F2F2] border border-[#E8E8E8] flex items-center justify-center text-[#222222]">
              <ShoppingBag className="h-5 w-5" />
            </div>
            {totalOrders > 0 && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#F2F2F2] text-[#222222] border border-[#E8E8E8]">
                Orders
              </span>
            )}
          </div>

          <div className="mt-3 sm:mt-4 min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-[#777777]">Total Orders</p>
            <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-[#222222] tracking-tight mt-1 truncate">
              {totalOrders.toLocaleString()}
            </p>
          </div>

          <div className="h-8 mt-3 w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={sparklineOrders}>
                <Area type="monotone" dataKey="v" stroke="#1F1F1F" strokeWidth={2} fill="#1F1F1F" fillOpacity={0.06} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* KPI 3: Total Customers */}
        <div className="bg-[#FFFFFF] border border-[#E8E8E8] rounded-[20px] p-4 sm:p-5 lg:p-6 flex flex-col justify-between hover:border-[#D0D0CE] shadow-[0_2px_12px_rgba(0,0,0,0.03)] transition-all min-w-0">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-full bg-[#F2F2F2] border border-[#E8E8E8] flex items-center justify-center text-[#222222]">
              <Users className="h-5 w-5" />
            </div>
            {totalCustomers > 0 && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#F2F2F2] text-[#222222] border border-[#E8E8E8]">
                Audience
              </span>
            )}
          </div>

          <div className="mt-3 sm:mt-4 min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-[#777777]">Total Customers</p>
            <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-[#222222] tracking-tight mt-1 truncate">
              {totalCustomers.toLocaleString()}
            </p>
          </div>

          <div className="h-8 mt-3 w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={sparklineCustomers}>
                <Area type="monotone" dataKey="v" stroke="#777777" strokeWidth={2} fill="#777777" fillOpacity={0.06} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* KPI 4: Store Views */}
        <div className="bg-[#FFFFFF] border border-[#E8E8E8] rounded-[20px] p-4 sm:p-5 lg:p-6 flex flex-col justify-between hover:border-[#D0D0CE] shadow-[0_2px_12px_rgba(0,0,0,0.03)] transition-all min-w-0">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-full bg-[#F2F2F2] border border-[#E8E8E8] flex items-center justify-center text-[#222222]">
              <Eye className="h-5 w-5" />
            </div>
            {storeViews > 0 && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#F2F2F2] text-[#222222] border border-[#E8E8E8]">
                Traffic
              </span>
            )}
          </div>

          <div className="mt-3 sm:mt-4 min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-[#777777]">Store Views</p>
            <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-[#222222] tracking-tight mt-1 truncate">
              {storeViews > 1000 ? `${(storeViews / 1000).toFixed(1)}K` : storeViews}
            </p>
          </div>

          <div className="h-8 mt-3 w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={sparklineViews}>
                <Area type="monotone" dataKey="v" stroke="#1F1F1F" strokeWidth={2} fill="#1F1F1F" fillOpacity={0.06} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

    </div>
  )
}
