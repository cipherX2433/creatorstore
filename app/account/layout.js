'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { api } from '@/lib/clientApi'
import { useAuth } from '@/components/auth/AuthContext'
import CreatorStoreBrand from '@/components/brand/CreatorStoreBrand'
import { NotificationDropdown } from '@/components/account/NotificationDropdown'
import {
  LayoutDashboard, BookOpen, ShoppingBag, Download, Video, Users, Calendar, Sparkles,
  ExternalLink, User, Settings, LogOut, Menu, X, Loader2, Award
} from 'lucide-react'

export default function AccountLayout({ children }) {
  const pathname = usePathname()
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    api.get('/me')
      .then((res) => {
        if (res.user) {
          setUser(res.user)
        } else {
          router.push(`/login?redirect=${encodeURIComponent(pathname)}`)
        }
      })
      .catch(() => {
        router.push(`/login?redirect=${encodeURIComponent(pathname)}`)
      })
      .finally(() => setLoading(false))
  }, [pathname, router])

  async function handleLogout() {
    try {
      await api.post('/auth/logout')
    } catch {}
    window.location.href = '/login'
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-xs font-semibold text-[rgba(244,242,236,0.68)]">Loading your account...</p>
        </div>
      </div>
    )
  }

  const mainNav = [
    { label: 'Overview', href: '/account', icon: LayoutDashboard },
    { label: 'My Library', href: '/account/library', icon: BookOpen },
    { label: 'Orders', href: '/account/orders', icon: ShoppingBag },
  ]

  const productNav = [
    { label: 'Courses', href: '/account/courses', icon: Award },
    { label: 'Downloads', href: '/account/downloads', icon: Download },
    { label: 'Coaching', href: '/account/coaching', icon: Video },
    { label: 'Communities', href: '/account/community', icon: Users },
    { label: 'Webinars', href: '/account/webinars', icon: Calendar },
    { label: 'Memberships', href: '/account/memberships', icon: Sparkles },
    { label: 'Services', href: '/account/services', icon: ShoppingBag },
    { label: 'External Links', href: '/account/external-links', icon: ExternalLink },
  ]

  const accountNav = [
    { label: 'Profile', href: '/account/profile', icon: User },
    { label: 'Settings', href: '/account/settings', icon: Settings },
  ]

  const isActive = (path) => pathname === path

  return (
    <div className="flex min-h-screen bg-black font-sans text-[#F4F2EC]">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-64 flex-col justify-between bg-black border-r border-white/10 p-5 shrink-0 fixed inset-y-0 z-30">
        <div className="space-y-6 overflow-y-auto pr-1">
          {/* Logo */}
          <div className="px-2 py-1">
            <CreatorStoreBrand
              href="/"
              theme="dark"
              size="md"
            />
          </div>

          {/* Main Nav */}
          <div className="space-y-1">
            <p className="px-3 text-[10px] font-black uppercase tracking-wider text-[rgba(244,242,236,0.68)]">Main</p>
            {mainNav.map((item) => {
              const Icon = item.icon
              const active = isActive(item.href)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-extrabold transition-all ${
                    active
                      ? 'bg-[#12141c] text-primary border border-white/10'
                      : 'text-[rgba(244,242,236,0.68)] hover:bg-[#12141c] hover:text-[#F4F2EC]'
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span>{item.label}</span>
                </Link>
              )
            })}
          </div>

          {/* Products Nav */}
          <div className="space-y-1">
            <p className="px-3 text-[10px] font-black uppercase tracking-wider text-[rgba(244,242,236,0.68)]">Products</p>
            {productNav.map((item) => {
              const Icon = item.icon
              const active = isActive(item.href)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-extrabold transition-all ${
                    active
                      ? 'bg-[#12141c] text-primary border border-white/10'
                      : 'text-[rgba(244,242,236,0.68)] hover:bg-[#12141c] hover:text-[#F4F2EC]'
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span>{item.label}</span>
                </Link>
              )
            })}
          </div>

          {/* Account Nav */}
          <div className="space-y-1">
            <p className="px-3 text-[10px] font-black uppercase tracking-wider text-[rgba(244,242,236,0.68)]">Account</p>
            {accountNav.map((item) => {
              const Icon = item.icon
              const active = isActive(item.href)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-extrabold transition-all ${
                    active
                      ? 'bg-[#12141c] text-primary border border-white/10'
                      : 'text-[rgba(244,242,236,0.68)] hover:bg-[#12141c] hover:text-[#F4F2EC]'
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span>{item.label}</span>
                </Link>
              )
            })}
          </div>
        </div>

        {/* User Card & Logout */}
        <div className="border-t border-white/10 pt-4 space-y-3">
          <div className="flex items-center gap-3 px-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-[#000000] font-black text-xs uppercase border border-white/12">
              {user?.email?.[0] || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-[#F4F2EC] truncate">{user?.name || 'Customer'}</p>
              <p className="text-[11px] text-[rgba(244,242,236,0.68)] truncate">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-rose-400 hover:bg-[#12141c] transition-colors"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            <span>Log out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Container */}
      <div className="flex-1 lg:pl-64 flex flex-col min-h-screen">
        {/* Top Header */}
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-white/10 bg-[#0A0A0A] px-4 sm:px-8">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#12141c] text-[#F4F2EC] border border-white/10 lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>
            <span className="text-sm font-extrabold text-[#F4F2EC] hidden sm:inline">
              Customer Portal
            </span>
          </div>

          <div className="flex items-center gap-3">
            <NotificationDropdown />
            <Link href="/account/profile" className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-[#000000] font-extrabold text-xs border border-white/12">
                {user?.email?.[0]?.toUpperCase() || 'U'}
              </div>
            </Link>
          </div>
        </header>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div className="fixed inset-0 bg-[#0A0A0A]" onClick={() => setMobileMenuOpen(false)} />
            <div className="fixed inset-y-0 left-0 w-72 bg-black border-r border-white/10 p-5 shadow-2xl flex flex-col justify-between overflow-y-auto">
              <div className="space-y-5">
                <div className="flex items-center justify-between border-b border-white/10 pb-4">
                  <CreatorStoreBrand
                    href="/"
                    theme="dark"
                    size="md"
                    onClick={() => setMobileMenuOpen(false)}
                  />
                  <button onClick={() => setMobileMenuOpen(false)} className="p-1 text-[rgba(244,242,236,0.68)] hover:text-[#F4F2EC]">
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="space-y-1">
                    <p className="px-2 text-[10px] font-black uppercase tracking-wider text-[rgba(244,242,236,0.68)]">Main</p>
                    {mainNav.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setMobileMenuOpen(false)}
                        className={`flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-bold ${isActive(item.href) ? 'bg-[#12141c] text-primary' : 'text-[rgba(244,242,236,0.68)]'}`}
                      >
                        <item.icon className="h-4 w-4" />
                        <span>{item.label}</span>
                      </Link>
                    ))}
                  </div>

                  <div className="space-y-1">
                    <p className="px-2 text-[10px] font-black uppercase tracking-wider text-[rgba(244,242,236,0.68)]">Products</p>
                    {productNav.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setMobileMenuOpen(false)}
                        className={`flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-bold ${isActive(item.href) ? 'bg-[#12141c] text-primary' : 'text-[rgba(244,242,236,0.68)]'}`}
                      >
                        <item.icon className="h-4 w-4" />
                        <span>{item.label}</span>
                      </Link>
                    ))}
                  </div>

                  <div className="space-y-1">
                    <p className="px-2 text-[10px] font-black uppercase tracking-wider text-[rgba(244,242,236,0.68)]">Account</p>
                    {accountNav.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setMobileMenuOpen(false)}
                        className={`flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-bold ${isActive(item.href) ? 'bg-[#12141c] text-primary' : 'text-[rgba(244,242,236,0.68)]'}`}
                      >
                        <item.icon className="h-4 w-4" />
                        <span>{item.label}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              </div>

              <div className="border-t border-white/10 pt-4 space-y-2">
                <button
                  onClick={handleLogout}
                  className="flex w-full items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-rose-400 hover:bg-[#12141c]"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Log out</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Main Body */}
        <main className="flex-1 p-4 sm:p-8 max-w-7xl w-full mx-auto pb-20 lg:pb-8">
          {children}
        </main>

        {/* Mobile Bottom Navigation */}
        <nav className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-[#0A0A0A] border-t border-white/10 flex justify-around py-2 px-4 shadow-lg">
          {mainNav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-1 text-[10px] font-bold ${isActive(item.href) ? 'text-primary' : 'text-[rgba(244,242,236,0.68)]'}`}
            >
              <item.icon className="h-5 w-5" />
              <span>{item.label}</span>
            </Link>
          ))}
          <Link
            href="/account/library"
            className={`flex flex-col items-center gap-1 text-[10px] font-bold ${isActive('/account/library') ? 'text-primary' : 'text-[rgba(244,242,236,0.68)]'}`}
          >
            <BookOpen className="h-5 w-5" />
            <span>Library</span>
          </Link>
          <Link
            href="/account/profile"
            className={`flex flex-col items-center gap-1 text-[10px] font-bold ${isActive('/account/profile') ? 'text-primary' : 'text-[rgba(244,242,236,0.68)]'}`}
          >
            <User className="h-5 w-5" />
            <span>Profile</span>
          </Link>
        </nav>
      </div>
    </div>
  )
}
