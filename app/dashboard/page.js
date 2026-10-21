'use client'

import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  TrendingUp, ShoppingBag, Users, Eye, ArrowUpRight,
  Plus, Link2, Sparkles, Bot, Package, ArrowRight,
  Calendar, CheckCircle2, ChevronRight, Store, DollarSign,
  Share2, Bell, Zap, Palette, Pencil
} from 'lucide-react'
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
  Tooltip, CartesianGrid, PieChart, Pie, Cell, AreaChart, Area
} from 'recharts'
import { api, formatMoney } from '@/lib/clientApi'
import { useDashboard } from '@/components/dashboard/DashboardContext'
import { useDashboardHeader } from '@/components/dashboard/HeaderContext'

// Color Constants matching CreatorStore Light Neutral Design System
const ACCENT_PRIMARY = '#1F1F1F'
const ACCENT_SECONDARY = '#6F6F6B'
const STATUS_SUCCESS = '#16A34A'
const BG_SURFACE = '#FFFFFF'
const BG_SURFACE_HOVER = '#F5F5F3'
const BORDER_SUBTLE = '#E5E5E3'
const TEXT_HEADING = '#1F1F1F'
const TEXT_SECONDARY = '#6F6F6B'

export default function DashboardOverviewPage() {
  const router = useRouter()
  const { me } = useDashboard()
  const { setPricingModalOpen } = useDashboardHeader()

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

  const creatorName = me?.profile?.name || me?.store?.username || 'Creator'

  useEffect(() => {
    let isMounted = true
    setLoading(true)

    Promise.all([
      api.get(`/analytics/overview?days=${days}`).catch(() => null),
      api.get('/products').catch(() => ({ products: [] })),
      api.get('/orders?page=1&limit=10').catch(() => ({ orders: [] })),
      api.get('/customers').catch(() => ({ customers: [] })),
    ]).then(([analyticsRes, productsRes, ordersRes, customersRes]) => {
      if (!isMounted) return
      setAnalytics(analyticsRes)
      setProducts(productsRes?.products || productsRes?.items || [])
      setOrders(ordersRes?.orders || ordersRes?.items || [])
      setCustomers(customersRes?.customers || customersRes?.items || [])
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

  // Chart Data Preparation (Revenue Overview from real analytics/orders)
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

  // Traffic sources from real tracked analytics
  const trafficData = useMemo(() => {
    if (analytics?.traffic && Array.isArray(analytics.traffic) && analytics.traffic.length > 0) {
      return analytics.traffic
    }
    const igViews = analytics?.instagram?.clicks || 0
    if (storeViews > 0) {
      const igPct = Math.min(100, Math.round((igViews / storeViews) * 100))
      const directPct = Math.max(0, 100 - igPct)
      const res = []
      if (igPct > 0) res.push({ name: 'Instagram', value: igPct, color: '#1F1F1F' })
      if (directPct > 0) res.push({ name: 'Direct / Store', value: directPct, color: '#6F6F6B' })
      return res
    }
    return []
  }, [analytics, storeViews])

  // Top products list calculated strictly from database data
  const topProductsList = useMemo(() => {
    if (analytics?.topProducts && analytics.topProducts.length > 0) {
      return analytics.topProducts.map((p) => {
        const matchingProduct = products.find((x) => x.id === p.id)
        return {
          id: p.id,
          name: p.title || matchingProduct?.title || 'Digital Product',
          thumbnail: p.thumbnail || matchingProduct?.thumbnail || matchingProduct?.coverImage || null,
          sales: p.sales || (p.revenue && matchingProduct?.price ? Math.round(p.revenue / Number(matchingProduct.price)) : 0),
          revenue: Number(p.revenue || 0),
          growth: '',
        }
      })
    }
    if (products.length > 0) {
      return products.slice(0, 4).map((p) => ({
        id: p.id,
        name: p.title || 'Digital Product',
        thumbnail: p.thumbnail || p.coverImage || null,
        sales: 0,
        revenue: 0,
        growth: '',
      }))
    }
    return []
  }, [analytics, products])

  // Recent activity list strictly from database orders
  const recentActivityList = useMemo(() => {
    if (orders.length > 0) {
      return orders.slice(0, 4).map((o, idx) => {
        const product = products.find((p) => p.id === o.productId)
        return {
          id: o.id || String(idx),
          customerName: o.customerName || o.customerEmail?.split('@')[0] || 'Customer',
          action: 'purchased',
          productName: o.productTitle || product?.title || 'Digital Product',
          amount: Number(o.amount) || 0,
          time: o.paidAt || o.createdAt ? new Date(o.paidAt || o.createdAt).toLocaleDateString() : 'Recent',
        }
      })
    }
    return []
  }, [orders, products])

  const username = me?.store?.username || me?.store?.slug || me?.profile?.username || 'store'

  const greeting = useMemo(() => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good morning'
    if (hour < 18) return 'Good afternoon'
    return 'Good evening'
  }, [])

  return (
    <div className="space-y-6 sm:space-y-8 bg-transparent text-[#1F1F1F] min-h-screen">

      {/* MOBILE HEADER & STORE PREVIEW CARD (md:hidden - Matching Screenshot 1) */}
      <div className="md:hidden space-y-4 -mt-2 pb-1">
        {/* Mobile Header Row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-full bg-[#E5E7EB] flex items-center justify-center overflow-hidden border border-[#E5E5E3]">
              {me?.profile?.avatarUrl ? (
                <img src={me.profile.avatarUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="text-xs font-bold text-[#1F1F1F]">{(username || 'C')[0].toUpperCase()}</span>
              )}
            </div>
            <button
              type="button"
              onClick={() => setPricingModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-[#E5E5E3] bg-[#FFFFFF] text-[11px] font-bold text-[#1F1F1F] shadow-2xs cursor-pointer"
            >
              <Zap className="h-3 w-3 text-[#FF4B1F] fill-[#FF4B1F]" />
              <span>{isPaid ? 'Pro Plan' : isTrialActive ? 'Keep Pro' : 'Reactivate Pro'}</span>
            </button>
          </div>

          <div className="flex items-center gap-1 text-[#71717A]">
            <a
              href={`/${username}`}
              target="_blank"
              rel="noreferrer"
              className="p-2 rounded-full hover:bg-[#F2F1EF] transition-colors"
              title="Share / View store"
            >
              <Share2 className="h-4.5 w-4.5" />
            </a>
            <Link
              href="/dashboard/help"
              className="p-2 rounded-full hover:bg-[#F2F1EF] transition-colors"
              title="Help & Notifications"
            >
              <Bell className="h-4.5 w-4.5" />
            </Link>
          </div>
        </div>

        {/* Creator Name & Store URL */}
        <div>
          <h1 className="text-2xl font-extrabold text-[#1F1F1F] tracking-tight truncate">
            {username}
          </h1>
          <p className="text-xs text-[#71717A] mt-0.5 truncate font-medium">
            creatorstore.store/{username}
          </p>
        </div>

        {/* Quick Action Pills: + Add, Products, Design */}
        <div className="flex items-center gap-2 pt-0.5">
          <Link
            href="/dashboard/store"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#F2F1EF] hover:bg-[#EAE9E6] text-xs font-bold text-[#1F1F1F] transition-colors"
          >
            <Plus className="h-3.5 w-3.5 stroke-[2.5]" />
            <span>Add</span>
          </Link>
          <Link
            href="/dashboard/products"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#F2F1EF] hover:bg-[#EAE9E6] text-xs font-bold text-[#1F1F1F] transition-colors"
          >
            <ShoppingBag className="h-3.5 w-3.5 stroke-[1.8]" />
            <span>Products</span>
          </Link>
          <Link
            href="/dashboard/store?tab=design"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#F2F1EF] hover:bg-[#EAE9E6] text-xs font-bold text-[#1F1F1F] transition-colors"
          >
            <Palette className="h-3.5 w-3.5 stroke-[1.8]" />
            <span>Design</span>
          </Link>
        </div>

        {/* Store Preview Card (Screenshot 1) */}
        <div className="relative rounded-[24px] bg-[#FFFFFF] border border-[#E5E5E3] p-5 shadow-2xs flex flex-col items-center text-center">
          <div className="h-20 w-20 rounded-full bg-[#E5E7EB] border border-[#E5E5E3] overflow-hidden flex items-center justify-center my-2 shadow-xs">
            {me?.profile?.avatarUrl ? (
              <img src={me.profile.avatarUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <span className="text-2xl font-bold text-[#1F1F1F]">{(username || 'C')[0].toUpperCase()}</span>
            )}
          </div>

          <h3 className="text-base font-bold text-[#1F1F1F] mt-1 truncate max-w-full">
            {username}
          </h3>
          <p className="text-xs text-[#71717A] mt-0.5 font-medium">
            {products.length} {products.length === 1 ? 'item' : 'items'} + Shop
          </p>

          <div className="flex items-center gap-2 mt-4 w-full justify-end">
            <a
              href={`/${username}`}
              target="_blank"
              rel="noreferrer"
              className="p-2 rounded-full border border-[#E5E5E3] bg-[#F9F9F8] text-[#1F1F1F] hover:bg-[#F2F1EF] transition-colors"
              title="Share store"
            >
              <Share2 className="h-4 w-4" />
            </a>
            <Link
              href="/dashboard/store"
              className="px-4 py-1.5 rounded-full border border-[#E5E5E3] bg-[#F9F9F8] hover:bg-[#F2F1EF] text-xs font-bold text-[#1F1F1F] transition-colors shadow-2xs"
            >
              Edit
            </Link>
          </div>
        </div>

        {/* Section Heading: In the last week */}
        <div className="pt-2">
          <h2 className="text-base font-extrabold text-[#1F1F1F] tracking-tight">
            In the last week
          </h2>
        </div>
      </div>

      {/* 1. DESKTOP WELCOME HEADER + STORE URL PILL (hidden md:flex) */}
      <div className="hidden md:flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 pb-2">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-[#1F1F1F] tracking-tight truncate">
            {greeting}, {username}
          </h1>
        </div>

        {/* Live Store Pill Button */}
        <div className="flex items-center gap-2.5">
          <a
            href={`/${username}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#FFFFFF] border border-[#E5E5E3] hover:border-[#DADAD7] hover:bg-[#F5F5F3] text-[#1F1F1F] text-xs font-semibold shadow-[0_2px_8px_rgba(0,0,0,0.04)] transition-all cursor-pointer shrink-0"
          >
            <span className="text-[#16A34A] font-bold">✳</span>
            <span className="truncate max-w-[200px]">creatorstore.store/{username}</span>
            <ArrowUpRight className="h-3.5 w-3.5 text-[#6F6F6B]" />
          </a>

          {/* Date Range Selector Dropdown/Pills */}
          <div className="hidden sm:flex items-center gap-1 p-1 bg-[#FFFFFF] rounded-full border border-[#E5E5E3] shadow-xs shrink-0">
            {[
              { label: '7D', value: 7 },
              { label: '30D', value: 30 },
              { label: '90D', value: 90 },
            ].map((item) => (
              <button
                key={item.value}
                onClick={() => setDays(item.value)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-all cursor-pointer whitespace-nowrap ${days === item.value
                    ? 'bg-[#1F1F1F] text-[#FFFFFF] font-bold shadow-xs'
                    : 'text-[#6F6F6B] hover:text-[#1F1F1F] hover:bg-[#F5F5F3]'
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
        <div className="bg-[#FFFFFF] border border-[#E5E5E3] rounded-[20px] p-4 sm:p-5 lg:p-6 flex flex-col justify-between hover:border-[#DADAD7] shadow-[0_8px_30px_rgba(0,0,0,0.04)] transition-all min-w-0">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-full bg-[#F2F1EF] border border-[#E5E5E3] flex items-center justify-center text-[#1F1F1F]">
              <DollarSign className="h-5 w-5" />
            </div>
            {totalRevenue > 0 && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#16A34A]/10 text-[#16A34A] border border-[#16A34A]/20">
                Live
              </span>
            )}
          </div>

          <div className="mt-3 sm:mt-4 min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-[#6F6F6B]">Total Revenue</p>
            <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-[#1F1F1F] tracking-tight mt-1 truncate">
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
        <div className="bg-[#FFFFFF] border border-[#E5E5E3] rounded-[20px] p-4 sm:p-5 lg:p-6 flex flex-col justify-between hover:border-[#DADAD7] shadow-[0_8px_30px_rgba(0,0,0,0.04)] transition-all min-w-0">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-full bg-[#F2F1EF] border border-[#E5E5E3] flex items-center justify-center text-[#1F1F1F]">
              <ShoppingBag className="h-5 w-5" />
            </div>
            {totalOrders > 0 && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#F2F1EF] text-[#1F1F1F] border border-[#E5E5E3]">
                Orders
              </span>
            )}
          </div>

          <div className="mt-3 sm:mt-4 min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-[#6F6F6B]">Total Orders</p>
            <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-[#1F1F1F] tracking-tight mt-1 truncate">
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
        <div className="bg-[#FFFFFF] border border-[#E5E5E3] rounded-[20px] p-4 sm:p-5 lg:p-6 flex flex-col justify-between hover:border-[#DADAD7] shadow-[0_8px_30px_rgba(0,0,0,0.04)] transition-all min-w-0">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-full bg-[#F2F1EF] border border-[#E5E5E3] flex items-center justify-center text-[#1F1F1F]">
              <Users className="h-5 w-5" />
            </div>
            {totalCustomers > 0 && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#F2F1EF] text-[#1F1F1F] border border-[#E5E5E3]">
                Audience
              </span>
            )}
          </div>

          <div className="mt-3 sm:mt-4 min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-[#6F6F6B]">Total Customers</p>
            <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-[#1F1F1F] tracking-tight mt-1 truncate">
              {totalCustomers.toLocaleString()}
            </p>
          </div>

          <div className="h-8 mt-3 w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={sparklineCustomers}>
                <Area type="monotone" dataKey="v" stroke="#6F6F6B" strokeWidth={2} fill="#6F6F6B" fillOpacity={0.06} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* KPI 4: Store Views */}
        <div className="bg-[#FFFFFF] border border-[#E5E5E3] rounded-[20px] p-4 sm:p-5 lg:p-6 flex flex-col justify-between hover:border-[#DADAD7] shadow-[0_8px_30px_rgba(0,0,0,0.04)] transition-all min-w-0">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-full bg-[#F2F1EF] border border-[#E5E5E3] flex items-center justify-center text-[#1F1F1F]">
              <Eye className="h-5 w-5" />
            </div>
            {storeViews > 0 && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#F2F1EF] text-[#1F1F1F] border border-[#E5E5E3]">
                Traffic
              </span>
            )}
          </div>

          <div className="mt-3 sm:mt-4 min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-[#6F6F6B]">Store Views</p>
            <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-[#1F1F1F] tracking-tight mt-1 truncate">
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

      {/* 3. REVENUE OVERVIEW (BAR CHART) & QUICK ACTIONS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Large Revenue Overview Chart Card (2 cols) */}
        <div className="lg:col-span-2 bg-[#FFFFFF] border border-[#E5E5E3] rounded-[20px] p-5 sm:p-6 flex flex-col justify-between shadow-[0_8px_30px_rgba(0,0,0,0.04)]">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#E5E5E3]">
              <div>
                <h2 className="text-lg font-bold text-[#1F1F1F]">Revenue Overview</h2>
                <p className="text-xs text-[#6F6F6B] mt-0.5">Your store performance over the last {days} days.</p>
              </div>

              {/* Chart Legend */}
              <div className="flex items-center gap-4 text-xs font-semibold">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-[#1F1F1F]" />
                  <span className="text-[#1F1F1F]">Revenue</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-[#999995]" />
                  <span className="text-[#6F6F6B]">Orders</span>
                </div>
              </div>
            </div>

            {/* Flat Bar Chart */}
            <div className="h-[280px] sm:h-[300px] w-full pt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revenueChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E5E3" vertical={false} />
                  <XAxis
                    dataKey="date"
                    stroke="#999995"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="#999995"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(val) => `₹${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}`}
                  />
                  <Tooltip
                    cursor={{ fill: '#F5F5F3' }}
                    contentStyle={{
                      backgroundColor: '#FFFFFF',
                      borderColor: '#E5E5E3',
                      borderRadius: '12px',
                      color: '#1F1F1F',
                      fontSize: '12px',
                      boxShadow: '0 10px 30px rgba(0,0,0,0.08)',
                    }}
                    formatter={(val, name) => [
                      name === 'revenue' ? formatMoney(val, currency) : val,
                      name === 'revenue' ? 'Revenue' : 'Orders'
                    ]}
                  />
                  <Bar dataKey="revenue" fill="#1F1F1F" radius={[4, 4, 0, 0]} maxBarSize={28} />
                  <Bar dataKey="orders" fill="#999995" radius={[4, 4, 0, 0]} maxBarSize={14} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Quick Actions Card (1 col) */}
        <div className="bg-[#FFFFFF] border border-[#E5E5E3] rounded-[20px] p-5 sm:p-6 flex flex-col justify-between shadow-[0_8px_30px_rgba(0,0,0,0.04)]">
          <div>
            <h2 className="text-lg font-bold text-[#1F1F1F]">Quick Actions</h2>
            <p className="text-xs text-[#6F6F6B] mt-0.5">Frequently used tools to build & grow your store.</p>

            <div className="space-y-2.5 mt-5">

              {/* + Add Product (Primary Black Filled Pill) */}
              <button
                type="button"
                onClick={() => {
                  if (!canCreate) {
                    toast.error('Your Pro trial has ended. Upgrade your plan to create products and continue selling.')
                    setPricingModalOpen(true)
                  } else {
                    router.push('/dashboard/products?create=true')
                  }
                }}
                className="w-full flex items-center justify-between p-3.5 rounded-full bg-[#1F1F1F] text-[#FFFFFF] font-bold text-sm hover:bg-[#000000] active:bg-[#111111] transition-all group cursor-pointer shadow-xs"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                    <Plus className="h-4 w-4" />
                  </div>
                  <span>Add Product</span>
                </div>
                <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
              </button>

              {/* → Add Link (Secondary White Pill) */}
              <button
                type="button"
                onClick={() => {
                  if (!canCreate) {
                    toast.error('Your Pro trial has ended. Upgrade your plan to add links and continue selling.')
                    setPricingModalOpen(true)
                  } else {
                    router.push('/dashboard/store')
                  }
                }}
                className="w-full flex items-center justify-between p-3.5 rounded-full bg-[#FFFFFF] border border-[#E5E5E3] text-[#1F1F1F] font-semibold text-sm hover:bg-[#F5F5F3] hover:border-[#DADAD7] transition-all group cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#F2F1EF] border border-[#E5E5E3] flex items-center justify-center text-[#1F1F1F]">
                    <Link2 className="h-4 w-4" />
                  </div>
                  <span>Add Link</span>
                </div>
                <ArrowRight className="h-4 w-4 text-[#6F6F6B] group-hover:text-[#1F1F1F] group-hover:translate-x-0.5 transition-all" />
              </button>

              {/* ↗ Create Offer (Secondary White Pill) */}
              <Link
                href="/dashboard/marketing"
                className="w-full flex items-center justify-between p-3.5 rounded-full bg-[#FFFFFF] border border-[#E5E5E3] text-[#1F1F1F] font-semibold text-sm hover:bg-[#F5F5F3] hover:border-[#DADAD7] transition-all group cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#F2F1EF] border border-[#E5E5E3] flex items-center justify-center text-[#1F1F1F]">
                    <Sparkles className="h-4 w-4" />
                  </div>
                  <span>Create Offer</span>
                </div>
                <ArrowRight className="h-4 w-4 text-[#6F6F6B] group-hover:text-[#1F1F1F] group-hover:translate-x-0.5 transition-all" />
              </Link>

              {/* ✈ Setup Auto DM (Secondary White Pill) */}
              <Link
                href="/dashboard/automations"
                className="w-full flex items-center justify-between p-3.5 rounded-full bg-[#FFFFFF] border border-[#E5E5E3] text-[#1F1F1F] font-semibold text-sm hover:bg-[#F5F5F3] hover:border-[#DADAD7] transition-all group cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#F2F1EF] border border-[#E5E5E3] flex items-center justify-center text-[#1F1F1F]">
                    <Bot className="h-4 w-4" />
                  </div>
                  <span>Setup Auto DM</span>
                </div>
                <ArrowRight className="h-4 w-4 text-[#6F6F6B] group-hover:text-[#1F1F1F] group-hover:translate-x-0.5 transition-all" />
              </Link>

            </div>
          </div>
        </div>

      </div>

      {/* 4. THREE-COLUMN SECTION: TOP PRODUCTS, TRAFFIC SOURCES, RECENT ACTIVITY */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Column 1: Top Products */}
        <div className="bg-[#FFFFFF] border border-[#E5E5E3] rounded-[20px] p-5 sm:p-6 flex flex-col justify-between shadow-[0_8px_30px_rgba(0,0,0,0.04)]">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-[#E5E5E3]">
              <div>
                <h3 className="text-base font-bold text-[#1F1F1F]">Top Products</h3>
                <p className="text-xs text-[#6F6F6B] mt-0.5">Best performing items</p>
              </div>
              <Link href="/dashboard/products" className="text-xs font-semibold text-[#1F1F1F] hover:underline">
                View all
              </Link>
            </div>

            <div className="space-y-3 mt-4">
              {topProductsList.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                  <div className="w-12 h-12 rounded-full bg-[#F5F5F3] border border-[#E5E5E3] flex items-center justify-center text-[#6F6F6B] mb-2">
                    <Package className="h-6 w-6" />
                  </div>
                  <p className="text-xs font-semibold text-[#1F1F1F]">No products created yet</p>
                  <Link href="/dashboard/store" className="mt-2 text-xs font-bold text-[#1F1F1F] hover:underline">
                    Create your first product →
                  </Link>
                </div>
              ) : (
                topProductsList.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-3 rounded-[14px] bg-[#FBFBFB] border border-[#E5E5E3] hover:border-[#DADAD7] hover:bg-[#F5F5F3] transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-[#F2F1EF] border border-[#E5E5E3] flex items-center justify-center overflow-hidden shrink-0 text-[#1F1F1F]">
                        {item.thumbnail ? (
                          <img src={item.thumbnail} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <Package className="h-5 w-5" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-[#1F1F1F] truncate">{item.name}</p>
                        <p className="text-[11px] text-[#6F6F6B] mt-0.5">{item.sales} sales</p>
                      </div>
                    </div>

                    <div className="text-right shrink-0 pl-2">
                      <p className="text-xs font-bold text-[#1F1F1F]">{formatMoney(item.revenue, currency)}</p>
                      {item.growth && <span className="text-[10px] font-bold text-[#16A34A]">{item.growth}</span>}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Column 2: Traffic Sources */}
        <div className="bg-[#FFFFFF] border border-[#E5E5E3] rounded-[20px] p-5 sm:p-6 flex flex-col justify-between shadow-[0_8px_30px_rgba(0,0,0,0.04)]">
          <div>
            <div className="pb-3 border-b border-[#E5E5E3]">
              <h3 className="text-base font-bold text-[#1F1F1F]">Traffic Sources</h3>
              <p className="text-xs text-[#6F6F6B] mt-0.5">Where your visitors are coming from</p>
            </div>

            {trafficData.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-4 text-center mt-2">
                <div className="w-12 h-12 rounded-full bg-[#F5F5F3] border border-[#E5E5E3] flex items-center justify-center text-[#6F6F6B] mb-2">
                  <Eye className="h-6 w-6" />
                </div>
                <p className="text-xs font-semibold text-[#1F1F1F]">No visitor traffic recorded yet</p>
                <p className="text-[11px] text-[#6F6F6B] mt-0.5">Share your store link to start tracking visitor sources.</p>
              </div>
            ) : (
              <>
                {/* Donut Chart with Center Label */}
                <div className="relative h-44 w-full flex items-center justify-center mt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={trafficData}
                        cx="50%"
                        cy="50%"
                        innerRadius={54}
                        outerRadius={74}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {trafficData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} stroke="#FFFFFF" strokeWidth={2} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#FFFFFF',
                          borderColor: '#E5E5E3',
                          borderRadius: '10px',
                          color: '#1F1F1F',
                          fontSize: '11px',
                          boxShadow: '0 10px 30px rgba(0,0,0,0.08)',
                        }}
                        formatter={(val) => [`${val}%`, 'Share']}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-xs font-bold text-[#6F6F6B]">Total Views</span>
                    <span className="text-base font-extrabold text-[#1F1F1F] mt-0.5">
                      {storeViews > 1000 ? `${(storeViews / 1000).toFixed(1)}K` : storeViews}
                    </span>
                  </div>
                </div>

                {/* Sources Legend */}
                <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-[#E5E5E3]">
                  {trafficData.map((src) => (
                    <div key={src.name} className="flex items-center justify-between text-xs py-1 px-2.5 rounded-full bg-[#FBFBFB] border border-[#E5E5E3]">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: src.color }} />
                        <span className="text-[#6F6F6B] truncate">{src.name}</span>
                      </div>
                      <span className="font-bold text-[#1F1F1F]">{src.value}%</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Column 3: Recent Activity */}
        <div className="bg-[#FFFFFF] border border-[#E5E5E3] rounded-[20px] p-5 sm:p-6 flex flex-col justify-between shadow-[0_8px_30px_rgba(0,0,0,0.04)]">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-[#E5E5E3]">
              <div>
                <h3 className="text-base font-bold text-[#1F1F1F]">Recent Activity</h3>
                <p className="text-xs text-[#6F6F6B] mt-0.5">Latest sales &amp; store events</p>
              </div>
              <Link href="/dashboard/earn/orders" className="text-xs font-semibold text-[#1F1F1F] hover:underline">
                View all
              </Link>
            </div>

            <div className="space-y-3 mt-4">
              {recentActivityList.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                  <div className="w-12 h-12 rounded-full bg-[#F5F5F3] border border-[#E5E5E3] flex items-center justify-center text-[#6F6F6B] mb-2">
                    <ShoppingBag className="h-6 w-6" />
                  </div>
                  <p className="text-xs font-semibold text-[#1F1F1F]">No recent orders yet</p>
                  <p className="text-[11px] text-[#6F6F6B] mt-0.5">Customer purchases will automatically appear here.</p>
                </div>
              ) : (
                recentActivityList.map((act) => (
                  <div
                    key={act.id}
                    className="flex items-center justify-between p-3 rounded-[14px] bg-[#FBFBFB] border border-[#E5E5E3] hover:border-[#DADAD7] hover:bg-[#F5F5F3] transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-full bg-[#F2F1EF] border border-[#E5E5E3] flex items-center justify-center font-bold text-xs text-[#1F1F1F] shrink-0">
                        {act.customerName[0].toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-[#1F1F1F] truncate">{act.customerName}</p>
                        <p className="text-[11px] text-[#6F6F6B] truncate mt-0.5">
                          {act.action} <span className="text-[#1F1F1F]">{act.productName}</span>
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0 pl-2">
                      <p className="text-xs font-bold text-[#16A34A]">
                        +{formatMoney(act.amount, currency)}
                      </p>
                      <p className="text-[10px] text-[#6F6F6B] mt-0.5">{act.time}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

      </div>

    </div>
  )
}
