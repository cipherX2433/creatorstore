'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import { api, formatMoney } from '@/lib/clientApi'
import { DashboardProvider, useDashboard } from '@/components/dashboard/DashboardContext'
import { HeaderProvider, useDashboardHeader } from '@/components/dashboard/HeaderContext'
import PricingModal from '@/components/dashboard/PricingModal'
import SetupChecklist from '@/components/dashboard/setup/SetupChecklist'
import SidebarProfileRow from '@/components/dashboard/SidebarProfileRow'
import SidebarTaskProgress from '@/components/dashboard/SidebarTaskProgress'
import OnboardingWelcomeModal from '@/components/dashboard/OnboardingWelcomeModal'
import DashboardPageTransition from '@/components/dashboard/DashboardPageTransition'
import { CreatorStoreLogo } from '@/components/brand/CreatorStoreBrand'
import MobileBottomNavigation from '@/components/dashboard/MobileBottomNavigation'
import MobileMoreDrawer from '@/components/dashboard/MobileMoreDrawer'
import {
  MY_STORE_CHILDREN,
  EARN_CHILDREN,
  OTHER_PRIMARY_NAV
} from '@/lib/navigationConfig'
import {
  LayoutDashboard, Store, Package, CreditCard, Compass, Bot,
  Users, Link2, Palette, ChevronRight,
  Loader2, ExternalLink, Menu, X,
  Wallet, Clock, Calendar, Zap, ShoppingBag
} from 'lucide-react'

function NavTooltip({ label, visible }) {
  if (!visible) return null
  return (
    <span className="pointer-events-none absolute left-[68px] top-1/2 -translate-y-1/2 z-50 px-2.5 py-1 rounded-[6px] bg-[#18181B] text-[#FFFFFF] text-xs font-semibold whitespace-nowrap shadow-xl opacity-0 group-hover:opacity-100 transition-opacity duration-150">
      {label}
    </span>
  )
}

function DashboardContent({ children }) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const currentTab = searchParams?.get('tab')
  const { me, loading } = useDashboard()
  const { pricingModalOpen, setPricingModalOpen } = useDashboardHeader()

  const [isHovered, setIsHovered] = useState(false)
  const [myStoreOpen, setMyStoreOpen] = useState(true)
  const [earnOpen, setEarnOpen] = useState(true)
  const [availableEarnings, setAvailableEarnings] = useState(null)
  const [moreDrawerOpen, setMoreDrawerOpen] = useState(false)

  // Auto-expand sections if matching route is active
  useEffect(() => {
    if (pathname.startsWith('/dashboard/store') || pathname.startsWith('/dashboard/products')) {
      setMyStoreOpen(true)
    }
    if (pathname === '/dashboard' || pathname.startsWith('/dashboard/earn') || pathname.startsWith('/dashboard/orders')) {
      setEarnOpen(true)
    }
  }, [pathname])

  useEffect(() => {
    api.get('/payouts/dashboard')
      .then((res) => setAvailableEarnings(res?.overview?.availableEarnings ?? 0))
      .catch(() => setAvailableEarnings(0))
  }, [])

  async function logout() {
    try { await api.post('/auth/logout') } catch { }
    toast.success('Logged out')
    window.location.href = '/login'
  }

  function handleNavClick() {
    setIsHovered(false)
  }

  if (loading || !me) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FBFAF9] text-[#1F1F1F]">
        <Loader2 className="h-8 w-8 animate-spin text-[#1F1F1F]" />
      </div>
    )
  }

  const username = me?.store?.username || me?.store?.slug || me?.profile?.username || ''
  const isStoreActive = pathname.startsWith('/dashboard/store') || pathname.startsWith('/dashboard/products')
  const isEarnActive = pathname === '/dashboard' || pathname.startsWith('/dashboard/earn') || pathname.startsWith('/dashboard/orders')

  return (
    <div className="h-screen w-screen overflow-hidden bg-[#0D0D0D] text-[#1F1F1F] font-sans flex flex-col selection:bg-[#1F1F1F] selection:text-[#FFFFFF]">

      {/* 1. GLOBAL TOPBAR (REFERENCE STYLE: Full-width dark bar with brand mark, trial countdown & Keep Pro access CTA) */}
      <GlobalTopBar me={me} onOpenPricing={() => setPricingModalOpen(true)} />

      {/* 2. DASHBOARD BODY (SIDEBAR + MAIN CANVAS) - WITH ROUNDED TOP CORNER CUTOUTS */}
      <div className="flex-1 flex min-h-0 relative w-full overflow-hidden bg-[#FBFAF9] rounded-t-[20px] md:rounded-t-[24px]">

        {/* STATIC SPACER FOR DESKTOP (PREVENTS DASHBOARD FROM JUMPING/RESIZING ON SIDEBAR HOVER) */}
        <div className="hidden md:block w-[72px] shrink-0 bg-[#F2F1EF] rounded-tl-[20px] md:rounded-tl-[24px]" aria-hidden="true" />

        {/* DESKTOP COLLAPSIBLE LIGHT NAVIGATION RAIL + HOVER EXPANSION OVERLAY */}
        <aside
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          className={`hidden md:flex absolute top-0 bottom-0 left-0 z-40 bg-[#F2F1EF] border-r border-[#E5E5E3] flex-col transition-all duration-200 ease-out shadow-[4px_0_24px_rgba(0,0,0,0.02)] rounded-tl-[20px] md:rounded-tl-[24px] overflow-hidden ${isHovered ? 'w-[248px]' : 'w-[72px]'
            }`}
        >
          {/* Profile / Account Row */}
          <div className="pt-2 px-3 pb-1 shrink-0 bg-[#F2F1EF]">
            <SidebarProfileRow
              me={me}
              onLogout={logout}
              theme="light"
              collapsed={!isHovered}
            />
          </div>

          {/* Sidebar Navigation */}
          <nav className="flex-1 overflow-y-auto no-scrollbar py-1 px-3 space-y-1.5">

            {/* MY STORE COLLAPSIBLE SECTION */}
            <div>
              <div className="relative">
                <Link
                  href="/dashboard/store"
                  onClick={handleNavClick}
                  className={`group relative flex items-center h-[48px] transition-colors duration-150 outline-none focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1F1F1F]/20 ${
                    isHovered ? 'px-3 rounded-[12px]' : 'justify-center mx-0.5 rounded-[12px]'
                  } ${
                    isStoreActive && (!myStoreOpen || !isHovered)
                      ? 'bg-[#E5E4E1] text-[#1F1F1F] font-medium'
                      : 'text-[#5F5F5F] hover:bg-[#EAE9E6] hover:text-[#1F1F1F]'
                  }`}
                >
                  <div className="w-6 min-w-[24px] max-w-[24px] h-6 flex items-center justify-center shrink-0">
                    <Store className={`h-[21px] w-[21px] stroke-[1.8] shrink-0 ${
                      isStoreActive && (!myStoreOpen || !isHovered) ? 'text-[#1F1F1F]' : 'text-[#5F5F5F] group-hover:text-[#1F1F1F]'
                    }`} />
                  </div>

                  {isHovered ? (
                    <>
                      <span className={`ml-3.5 text-[16px] leading-none whitespace-nowrap tracking-[-0.01em] ${
                        isStoreActive && (!myStoreOpen || !isHovered) ? 'font-medium text-[#1F1F1F]' : 'font-[450] text-[#5F5F5F] group-hover:text-[#1F1F1F]'
                      }`}>
                        My Store
                      </span>
                      <button
                        type="button"
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setMyStoreOpen(!myStoreOpen) }}
                        className="ml-auto p-1 text-[#999995] hover:text-[#1F1F1F] cursor-pointer outline-none focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1F1F1F]/20 rounded-md"
                        aria-label="Toggle My Store submenu"
                      >
                        <ChevronRight className={`h-4.5 w-4.5 transition-transform duration-200 ${myStoreOpen ? 'rotate-90 text-[#1F1F1F]' : ''}`} />
                      </button>
                    </>
                  ) : (
                    <NavTooltip label="My Store" visible={!isHovered} />
                  )}
                </Link>
              </div>

              {/* MY STORE Child Items */}
              {isHovered && myStoreOpen && (
                <div className="ml-[23px] pl-3 border-l border-[#E5E5E3] space-y-1 my-1">
                  {MY_STORE_CHILDREN.map((child) => {
                    let active = false
                    if (child.label === 'Store') active = pathname === '/dashboard/store' && currentTab !== 'design'
                    else if (child.label === 'Products') active = pathname.startsWith('/dashboard/products')
                    else if (child.label === 'Design') active = pathname === '/dashboard/store' && currentTab === 'design'

                    const Icon = child.icon
                    return (
                      <Link
                        key={child.label}
                        href={child.href}
                        onClick={handleNavClick}
                        className={`group flex items-center gap-2.5 px-3 h-[40px] rounded-[10px] text-[14.5px] transition-colors duration-150 outline-none focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1F1F1F]/20 ${
                          active
                            ? 'bg-[#E5E4E1] text-[#1F1F1F] font-medium'
                            : 'text-[#5F5F5F] hover:text-[#1F1F1F] hover:bg-[#EAE9E6] font-[420]'
                        }`}
                      >
                        <Icon className={`h-4 w-4 shrink-0 ${active ? 'text-[#1F1F1F]' : 'text-[#5F5F5F] group-hover:text-[#1F1F1F]'}`} />
                        <span className="whitespace-nowrap">{child.label}</span>
                      </Link>
                    )
                  })}
                </div>
              )}
            </div>

            {/* EARN COLLAPSIBLE SECTION */}
            <div>
              <div className="relative">
                <Link
                  href="/dashboard"
                  onClick={handleNavClick}
                  className={`group relative flex items-center h-[48px] transition-colors duration-150 outline-none focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1F1F1F]/20 ${
                    isHovered ? 'px-3 rounded-[12px]' : 'justify-center mx-0.5 rounded-[12px]'
                  } ${
                    isEarnActive && (!earnOpen || !isHovered)
                      ? 'bg-[#E5E4E1] text-[#1F1F1F] font-medium'
                      : 'text-[#5F5F5F] hover:bg-[#EAE9E6] hover:text-[#1F1F1F]'
                  }`}
                >
                  <div className="w-6 min-w-[24px] max-w-[24px] h-6 flex items-center justify-center shrink-0">
                    <Wallet className={`h-[21px] w-[21px] stroke-[1.8] shrink-0 ${
                      isEarnActive && (!earnOpen || !isHovered) ? 'text-[#1F1F1F]' : 'text-[#5F5F5F] group-hover:text-[#1F1F1F]'
                    }`} />
                  </div>

                  {isHovered ? (
                    <>
                      <span className={`ml-3.5 text-[16px] leading-none whitespace-nowrap tracking-[-0.01em] ${
                        isEarnActive && (!earnOpen || !isHovered) ? 'font-medium text-[#1F1F1F]' : 'font-[450] text-[#5F5F5F] group-hover:text-[#1F1F1F]'
                      }`}>
                        Earn
                      </span>
                      <button
                        type="button"
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setEarnOpen(!earnOpen) }}
                        className="ml-auto p-1 text-[#999995] hover:text-[#1F1F1F] cursor-pointer outline-none focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1F1F1F]/20 rounded-md"
                        aria-label="Toggle Earn submenu"
                      >
                        <ChevronRight className={`h-4.5 w-4.5 transition-transform duration-200 ${earnOpen ? 'rotate-90 text-[#1F1F1F]' : ''}`} />
                      </button>
                    </>
                  ) : (
                    <NavTooltip label="Earn" visible={!isHovered} />
                  )}
                </Link>
              </div>

              {/* EARN Child Items */}
              {isHovered && earnOpen && (
                <div className="ml-[23px] pl-3 border-l border-[#E5E5E3] space-y-1 my-1">
                  {EARN_CHILDREN.map((child) => {
                    let active = false
                    if (child.label === 'Insights') active = pathname === '/dashboard'
                    else if (child.label === 'Orders') active = pathname === '/dashboard/orders' || pathname.startsWith('/dashboard/earn/orders')
                    else if (child.label === 'Earnings') active = pathname === '/dashboard/earn/earnings' || pathname === '/dashboard/earn'

                    const Icon = child.icon
                    return (
                      <Link
                        key={child.href}
                        href={child.href}
                        onClick={handleNavClick}
                        className={`group flex items-center justify-between px-3 h-[40px] rounded-[10px] text-[14.5px] transition-colors duration-150 outline-none focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1F1F1F]/20 ${
                          active
                            ? 'bg-[#E5E4E1] text-[#1F1F1F] font-medium'
                            : 'text-[#5F5F5F] hover:text-[#1F1F1F] hover:bg-[#EAE9E6] font-[420]'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          {Icon && (
                            <Icon className={`h-4 w-4 shrink-0 ${active ? 'text-[#1F1F1F]' : 'text-[#5F5F5F] group-hover:text-[#1F1F1F]'}`} />
                          )}
                          <span className="whitespace-nowrap truncate">{child.label}</span>
                        </div>
                        {child.label === 'Earnings' && (
                          <span className="ml-auto text-[12px] font-medium text-[#4A4A48] bg-[#E0DFDC] px-2.5 py-0.5 rounded-full shrink-0">
                            {formatMoney(availableEarnings ?? 0)}
                          </span>
                        )}
                      </Link>
                    )
                  })}
                </div>
              )}
            </div>

            {/* SECTION LABEL: TOOLS */}
            {isHovered ? (
              <div className="pt-[18px] pb-1 px-3 text-[13px] font-medium text-[#7A7A75] select-none tracking-normal">
                Tools
              </div>
            ) : (
              <div className="h-3" />
            )}

            {/* OTHER PRIMARY NAVIGATION ITEMS */}
            <div className="space-y-1.5">
              {OTHER_PRIMARY_NAV.map((item) => {
                const active = pathname === item.href || pathname.startsWith(item.href)
                const Icon = item.icon
                const isAutomations = item.label === 'Automations'

                return (
                  <div key={item.href} className="relative">
                    <Link
                      href={item.href}
                      onClick={handleNavClick}
                      className={`group relative flex items-center h-[48px] transition-colors duration-150 outline-none focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1F1F1F]/20 ${
                        isHovered ? 'px-3 rounded-[12px]' : 'justify-center mx-0.5 rounded-[12px]'
                      } ${
                        active
                          ? 'bg-[#E5E4E1] text-[#1F1F1F] font-medium'
                          : 'text-[#5F5F5F] hover:bg-[#EAE9E6] hover:text-[#1F1F1F]'
                      }`}
                    >
                      <div className="w-6 min-w-[24px] max-w-[24px] h-6 flex items-center justify-center shrink-0">
                        <Icon className={`h-[21px] w-[21px] stroke-[1.8] shrink-0 ${active ? 'text-[#1F1F1F]' : 'text-[#5F5F5F] group-hover:text-[#1F1F1F]'}`} />
                      </div>

                      {isHovered && (
                        <>
                          <span className={`ml-3.5 text-[16px] leading-none whitespace-nowrap tracking-[-0.01em] truncate min-w-0 pr-2 ${active ? 'font-medium text-[#1F1F1F]' : 'font-[450] text-[#5F5F5F] group-hover:text-[#1F1F1F]'}`}>
                            {item.label}
                          </span>
                          {isAutomations && (
                            <span className="ml-auto text-[11px] font-semibold text-[#194DF5] border border-[#194DF5]/40 bg-[#194DF5]/5 rounded-full px-2 py-0.5 shrink-0">
                              NEW
                            </span>
                          )}
                        </>
                      )}
                      {!isHovered && <NavTooltip label={item.label} visible={!isHovered} />}
                    </Link>
                  </div>
                )
              })}
            </div>

          </nav>

          {/* BOTTOM SETUP AREA */}
          <SidebarTaskProgress collapsed={!isHovered} onNavClick={handleNavClick} />
        </aside>

        {/* MAIN CONTENT CANVAS */}
        <div className="flex-1 flex flex-col min-w-0 min-h-0 overflow-y-auto bg-[#FBFAF9] text-[#1F1F1F] no-scrollbar rounded-tr-[20px] md:rounded-tr-[24px]">

          {/* MAIN PAGE VIEW CANVAS */}
          <main className="flex-1 px-3.5 sm:px-6 md:px-8 pb-28 sm:pb-32 md:pb-20 pt-4 sm:pt-6 bg-[#FBFAF9] text-[#1F1F1F] w-full max-w-full min-w-0">
            <div className={pathname === '/dashboard' || pathname.startsWith('/dashboard/store') ? 'mx-auto max-w-[1440px] w-full min-w-0' : 'mx-auto max-w-5xl space-y-8 min-w-0'}>
              <DashboardPageTransition transitionKey={pathname}>
                {children}
              </DashboardPageTransition>
            </div>
          </main>

          <OnboardingWelcomeModal me={me} />

          {/* FIXED MOBILE BOTTOM NAVIGATION */}
          <MobileBottomNavigation
            onOpenMore={() => setMoreDrawerOpen(true)}
            isMoreOpen={moreDrawerOpen}
          />

          {/* MOBILE MORE MENU / SECONDARY TOOLS DRAWER */}
          <MobileMoreDrawer
            isOpen={moreDrawerOpen}
            onClose={() => setMoreDrawerOpen(false)}
            me={me}
            onLogout={logout}
          />

        </div>

      </div>

      <PricingModal isOpen={pricingModalOpen} onClose={() => setPricingModalOpen(false)} />
    </div>
  )
}



function getRouteTitle(pathname, title) {
  if (title) return title
  if (!pathname) return 'Store'
  if (pathname.startsWith('/dashboard/store')) return 'Store'
  if (pathname.startsWith('/dashboard/products')) return 'Products'
  if (pathname.startsWith('/dashboard/orders') || pathname === '/dashboard/earn/orders') return 'Orders'
  if (pathname.startsWith('/dashboard/earn/earnings')) return 'Earnings'
  if (pathname === '/dashboard/earn') return 'Earn'
  if (pathname === '/dashboard' || pathname.startsWith('/dashboard/analytics')) return 'Insights'
  if (pathname.startsWith('/dashboard/calendar')) return 'Calendar'
  if (pathname.startsWith('/dashboard/automations')) return 'Automations'
  if (pathname.startsWith('/dashboard/payments')) return 'Payments'
  if (pathname.startsWith('/dashboard/customers') || pathname.startsWith('/dashboard/leads')) return 'Audience'
  if (pathname.startsWith('/dashboard/marketing')) return 'Marketing'
  if (pathname.startsWith('/dashboard/settings')) return 'Settings'
  return 'Store'
}

function GlobalTopBar({ me, onOpenPricing }) {
  const sub = me?.subscription
  const isPaid = Boolean(sub?.status === 'ACTIVE' && !sub?.isTrial && sub?.planId !== 'UNSUBSCRIBED' && sub?.plan !== 'UNSUBSCRIBED')

  const isTrialExpired = Boolean(
    sub?.isTrialExpired ||
    sub?.trialStatus === 'EXPIRED' ||
    sub?.status === 'EXPIRED' ||
    (sub?.isTrial && sub?.trialEndsAt && new Date(sub.trialEndsAt).getTime() <= Date.now()) ||
    (!isPaid && sub?.status === 'INACTIVE' && sub?.trialStatus !== 'ACTIVE')
  )

  const isTrialActive = Boolean(
    !isPaid &&
    !isTrialExpired &&
    (sub?.isTrial || sub?.status === 'TRIALING' || sub?.trialStatus === 'ACTIVE') &&
    sub?.trialEndsAt &&
    new Date(sub.trialEndsAt).getTime() > Date.now()
  )

  let trialText = ''
  let ctaText = 'Keep Pro access'
  let showCta = false

  if (isPaid) {
    // STATE D — Paid subscription active
    const planName = sub?.plan || 'Pro'
    trialText = `${planName} Plan Active`
    showCta = false
  } else if (isTrialActive) {
    const diffMs = new Date(sub.trialEndsAt).getTime() - Date.now()
    const oneDayMs = 24 * 60 * 60 * 1000
    const daysLeft = Math.max(1, Math.ceil(diffMs / oneDayMs))

    if (diffMs <= oneDayMs || daysLeft <= 1) {
      // STATE B — Trial expires today
      trialText = 'Your Pro trial ends today'
    } else {
      // STATE A — Active trial
      trialText = `${daysLeft} days left in Pro trial`
    }
    ctaText = 'Keep Pro access'
    showCta = true
  } else {
    // STATE C — Trial expired / No active subscription
    trialText = 'Pro trial ended'
    ctaText = 'Upgrade Plan'
    showCta = true
  }

  return (
    <header className="h-13 sm:h-14 w-full bg-[#0D0D0D] text-white flex items-center justify-between px-4 sm:px-6 z-50 shrink-0 select-none border-b border-[#242424]">

      {/* Left: CreatorStore Logo */}
      <div className="flex items-center gap-2.5">
        <CreatorStoreLogo
          size="sm"
          theme="dark"
          href="/dashboard"
          ariaLabel="CreatorStore Dashboard"
        />
      </div>

      {/* Center: Trial Countdown + Keep Pro Access Pill CTA */}
      <div className="flex items-center gap-2.5 sm:gap-3.5">
        <span className="text-xs sm:text-[13px] font-bold text-white tracking-tight">
          {trialText}
        </span>

        {showCta && (
          <button
            type="button"
            onClick={onOpenPricing}
            className="group inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-transparent border border-[#194DF5] text-[#194DF5] hover:bg-[#194DF5] hover:text-[#FFFFFF] text-xs sm:text-[13px] font-bold transition-all duration-150 cursor-pointer shadow-xs active:scale-[0.98]"
          >
            <Zap className="h-3.5 w-3.5 fill-[#194DF5] group-hover:fill-[#FFFFFF] stroke-none shrink-0 transition-colors" />
            <span>{ctaText}</span>
          </button>
        )}
      </div>

      {/* Right: Balance / Empty for balanced symmetry */}
      <div className="w-6 sm:w-7" />
    </header>
  )
}

function DashboardBootFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#FBFAF9] text-[#1F1F1F]">
      <Loader2 className="h-8 w-8 animate-spin text-[#1F1F1F]" />
    </div>
  )
}

export default function DashboardLayout({ children }) {
  return (
    <DashboardProvider>
      <HeaderProvider>
        <Suspense fallback={<DashboardBootFallback />}>
          <DashboardContent>{children}</DashboardContent>
        </Suspense>
      </HeaderProvider>
    </DashboardProvider>
  )
}





