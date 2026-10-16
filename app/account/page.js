'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { api } from '@/lib/clientApi'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  GraduationCap, Play, Video, Sparkles, Calendar, ArrowRight,
  CheckCircle2, Clock, ShoppingBag, Award, Compass, RefreshCw
} from 'lucide-react'
import { getSubscriptionPricing } from '@/lib/plans'

export default function CustomerDashboardPage() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/account/overview')
      .then((res) => setData(res))
      .catch(() => setData(null))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64 rounded-xl" />
          <Skeleton className="h-4 w-96 rounded-xl" />
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full rounded-2xl" />
          ))}
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-64 w-full rounded-2xl" />
          <Skeleton className="h-64 w-full rounded-2xl" />
        </div>
      </div>
    )
  }

  const { summary, continueLearning, upcomingBookings, upcomingWebinars, activeMemberships, recentOrders, activityTimeline } = data || {}
  const totalPurchases = summary?.totalPurchases || 0

  return (
    <div className="space-y-8">
      {/* Header Greeting */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-primary/20 via-surface-card to-surface-card border border-primary/20 p-6 sm:p-8 rounded-3xl text-white shadow-xl">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-[#1A1A1A] px-3 py-1 text-xs font-semibold text-white/90">
            <Sparkles className="h-3.5 w-3.5 text-[#00F090]" /> Customer Dashboard
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
            Welcome back 👋
          </h1>
          <p className="text-sm text-white/80 font-medium">
            Continue learning and manage all your purchased products.
          </p>
        </div>
        <Link href="/account/library">
          <Button variant="accent" size="lg" className="w-full sm:w-auto font-extrabold shadow-lg">
            Explore My Library <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        </Link>
      </div>

      {/* Become a Creator Banner CTA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#0A0B13] border border-primary/30 p-5 rounded-2xl text-[#F4F2EC]">
        <div>
          <h3 className="font-extrabold text-sm text-[#F4F2EC]">Want to sell your own digital products?</h3>
          <p className="text-xs text-[#A1A1AA] font-medium mt-0.5">Start selling with Creator mode for just {getSubscriptionPricing().CREATOR.priceFormatted}/month and keep 100% of your earnings.</p>
        </div>
        <Link href="/account/settings">
          <Button variant="outline" size="sm" className="text-xs font-bold rounded-xl border-primary text-primary hover:bg-primary hover:text-[#000000] shrink-0">
            Become a Creator →
          </Button>
        </Link>
      </div>

      {/* Summary KPI Badges */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-[#12141c] p-4 sm:p-5 rounded-2xl border border-white/10 shadow-sm space-y-1">
          <p className="text-xs font-bold text-[rgba(244,242,236,0.68)]">Purchases</p>
          <p className="text-2xl font-black text-[#F4F2EC]">{summary?.totalPurchases || 0}</p>
        </div>
        <div className="bg-[#12141c] p-4 sm:p-5 rounded-2xl border border-white/10 shadow-sm space-y-1">
          <p className="text-xs font-bold text-[rgba(244,242,236,0.68)]">Active Courses</p>
          <p className="text-2xl font-black text-[#F4F2EC]">{summary?.activeCourses || 0}</p>
        </div>
        <div className="bg-[#12141c] p-4 sm:p-5 rounded-2xl border border-white/10 shadow-sm space-y-1">
          <p className="text-xs font-bold text-[rgba(244,242,236,0.68)]">Upcoming Sessions</p>
          <p className="text-2xl font-black text-[#F4F2EC]">{summary?.upcomingBookingsCount || 0}</p>
        </div>
        <div className="bg-[#12141c] p-4 sm:p-5 rounded-2xl border border-white/10 shadow-sm space-y-1">
          <p className="text-xs font-bold text-[rgba(244,242,236,0.68)]">Active Memberships</p>
          <p className="text-2xl font-black text-primary">{summary?.activeMembershipsCount || 0}</p>
        </div>
      </div>

      {/* Empty State if customer has no purchases */}
      {totalPurchases === 0 && (
        <div className="flex flex-col items-center justify-center p-12 text-center bg-[#12141c] rounded-3xl border border-dashed border-white/10 space-y-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Compass className="h-8 w-8" />
          </div>
          <div className="space-y-1 max-w-sm">
            <h3 className="text-lg font-bold text-[#F4F2EC]">Welcome to your library</h3>
            <p className="text-xs text-[rgba(244,242,236,0.68)] font-medium leading-relaxed">
              Your purchased courses, digital downloads, coaching sessions, communities, and other products will appear here.
            </p>
          </div>
          <Link href="/account/library">
            <Button className="bg-primary hover:bg-primary-hover text-white font-extrabold text-xs rounded-xl">
              Browse Library
            </Button>
          </Link>
        </div>
      )}

      {/* Main Grid Section */}
      <div className="grid gap-8 lg:grid-cols-3">
        {/* Left Column (2 Cols wide) */}
        <div className="lg:col-span-2 space-y-8">
          {/* Continue Learning */}
          {continueLearning && continueLearning.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <GraduationCap className="h-5 w-5 text-primary" />
                  <h2 className="font-extrabold text-lg text-[#F4F2EC]">Continue Learning</h2>
                </div>
                <Link href="/account/courses" className="text-xs font-bold text-primary hover:underline">
                  View All Courses →
                </Link>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {continueLearning.map((c) => (
                  <div key={c.courseId} className="flex flex-col justify-between rounded-2xl border border-white/10 bg-[#12141c] p-5 shadow-sm space-y-4 hover:shadow-md transition-shadow">
                    <div className="space-y-3">
                      <div className="aspect-video w-full overflow-hidden rounded-xl bg-slate-100 relative">
                        {c.thumbnail ? (
                          <img src={c.thumbnail} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center bg-primary/10 text-primary">
                            <GraduationCap className="h-8 w-8" />
                          </div>
                        )}
                      </div>
                      <div>
                        <h3 className="font-bold text-sm text-[#F4F2EC] line-clamp-1">{c.title}</h3>
                        <p className="text-xs font-semibold text-[rgba(244,242,236,0.68)] mt-0.5">{c.percentage}% complete ({c.completedLessons}/{c.totalLessons} lessons)</p>
                      </div>
                      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                        <div className="bg-primary h-full rounded-full transition-all duration-500" style={{ width: `${c.percentage}%` }} />
                      </div>
                    </div>

                    <Link href={`/learn/${c.courseId}`}>
                      <Button size="sm" className="w-full bg-primary hover:bg-primary-hover text-white font-bold gap-1.5 text-xs rounded-xl">
                        <Play className="h-3.5 w-3.5 fill-current" /> Continue Course
                      </Button>
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Upcoming Coaching & Webinars */}
          {((upcomingBookings && upcomingBookings.length > 0) || (upcomingWebinars && upcomingWebinars.length > 0)) && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                <h2 className="font-extrabold text-lg text-[#F4F2EC]">Upcoming Events & Sessions</h2>
              </div>

              <div className="space-y-3">
                {upcomingBookings?.map((b) => (
                  <div key={b.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl border border-white/10 bg-[#12141c] shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
                        <Video className="h-5 w-5" />
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-[#F4F2EC]">{b.sessionTitle}</h4>
                        <p className="text-xs text-[rgba(244,242,236,0.68)] font-medium">With {b.creatorName} • {b.startTime}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {b.meetingLink ? (
                        <a href={b.meetingLink} target="_blank" rel="noreferrer">
                          <Button size="sm" className="bg-primary hover:bg-primary-hover text-white text-xs font-bold rounded-xl">
                            Join Call ↗
                          </Button>
                        </a>
                      ) : (
                        <Link href="/account/coaching">
                          <Button variant="outline" size="sm" className="text-xs font-bold rounded-xl">
                            View Booking
                          </Button>
                        </Link>
                      )}
                    </div>
                  </div>
                ))}

                {upcomingWebinars?.map((w) => (
                  <div key={w.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl border border-white/10 bg-[#12141c] shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600">
                        <Calendar className="h-5 w-5" />
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-[#F4F2EC]">{w.title}</h4>
                        <p className="text-xs text-[rgba(244,242,236,0.68)] font-medium">Webinar • {new Date(w.scheduledAt).toLocaleString()}</p>
                      </div>
                    </div>
                    <Link href="/account/webinars">
                      <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl">
                        View Event
                      </Button>
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent Purchases */}
          {recentOrders && recentOrders.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShoppingBag className="h-5 w-5 text-primary" />
                  <h2 className="font-extrabold text-lg text-[#F4F2EC]">Recent Purchases</h2>
                </div>
                <Link href="/account/orders" className="text-xs font-bold text-primary hover:underline">
                  View All Orders →
                </Link>
              </div>

              <div className="bg-[#12141c] rounded-2xl border border-white/10 shadow-sm overflow-hidden divide-y divide-slate-100">
                {recentOrders.map((o) => (
                  <div key={o.id} className="flex items-center justify-between p-4 hover:bg-[#1e222d] transition-colors">
                    <div>
                      <h4 className="font-bold text-sm text-[#F4F2EC]">{o.productTitle}</h4>
                      <p className="text-xs text-[rgba(244,242,236,0.68)] font-medium">By {o.creatorName} • {new Date(o.createdAt).toLocaleDateString()}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-extrabold text-sm text-[#F4F2EC]">₹{o.amount}</span>
                      <Link href={`/account/orders/${o.id}`}>
                        <Button variant="outline" size="sm" className="text-xs font-bold rounded-xl">
                          View
                        </Button>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column (1 Col wide) */}
        <div className="space-y-8">
          {/* Active Memberships */}
          {activeMemberships && activeMemberships.length > 0 && (
            <div className="bg-[#12141c] p-6 rounded-3xl border border-white/10 shadow-sm space-y-4">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                <h3 className="font-extrabold text-base text-[#F4F2EC]">Your Memberships</h3>
              </div>
              <div className="space-y-3">
                {activeMemberships.map((m) => (
                  <div key={m.id} className="p-4 rounded-2xl bg-primary/10 border border-primary/20 space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="font-extrabold text-sm text-[#F4F2EC]">{m.planTitle}</h4>
                      <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                        {m.status}
                      </span>
                    </div>
                    <p className="text-xs text-[rgba(244,242,236,0.68)] font-medium">Active subscription • ₹{m.price}/mo</p>
                    <Link href="/account/memberships">
                      <Button variant="outline" size="sm" className="w-full mt-1 text-xs font-bold rounded-xl bg-[#12141c]">
                        Manage
                      </Button>
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Activity Timeline */}
          <div className="bg-[#12141c] p-6 rounded-3xl border border-white/10 shadow-sm space-y-4">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              <h3 className="font-extrabold text-base text-[#F4F2EC]">Activity Timeline</h3>
            </div>

            {!activityTimeline || activityTimeline.length === 0 ? (
              <p className="text-xs text-[rgba(244,242,236,0.5)] font-medium">No recent activity.</p>
            ) : (
              <div className="space-y-4 relative before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-100">
                {activityTimeline.map((act) => (
                  <div key={act.id} className="flex gap-3 relative z-10 items-start">
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    </div>
                    <div className="flex-1 space-y-0.5">
                      <p className="text-xs font-bold text-[#F4F2EC] line-clamp-1">{act.title}</p>
                      <p className="text-[10px] text-[rgba(244,242,236,0.5)] font-medium">{new Date(act.date).toLocaleDateString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
