'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { api } from '@/lib/clientApi'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  BookOpen, Search, GraduationCap, Download, Video, Users, Calendar, Sparkles,
  ExternalLink, Play, ShoppingBag, ArrowUpRight, CheckCircle2
} from 'lucide-react'

export default function MyLibraryPage() {
  const [items, setItems] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('ALL')
  const [search, setSearch] = useState('')

  useEffect(() => {
    fetchLibrary(activeTab, search)
  }, [activeTab])

  function fetchLibrary(tab, query) {
    setLoading(true)
    const typeParam = tab === 'ALL' ? '' : `type=${tab}`
    const searchParam = query ? `&search=${encodeURIComponent(query)}` : ''
    api.get(`/account/library?${typeParam}${searchParam}`)
      .then((res) => setItems(res.items || []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false))
  }

  function handleSearchSubmit(e) {
    e.preventDefault()
    fetchLibrary(activeTab, search)
  }

  const tabs = [
    { label: 'All Products', value: 'ALL' },
    { label: 'Courses', value: 'COURSE' },
    { label: 'Downloads', value: 'DIGITAL_DOWNLOAD' },
    { label: 'Coaching', value: 'COACHING' },
    { label: 'Communities', value: 'COMMUNITY' },
    { label: 'Webinars', value: 'WEBINAR' },
    { label: 'Memberships', value: 'MEMBERSHIP' },
    { label: 'Services', value: 'CUSTOM_SERVICE' },
    { label: 'External Links', value: 'EXTERNAL_LINK' },
  ]

  const getProductBadge = (type) => {
    switch (type) {
      case 'COURSE': return { label: 'Course', icon: GraduationCap, color: 'bg-primary/15 text-primary' }
      case 'DIGITAL_DOWNLOAD': return { label: 'Download', icon: Download, color: 'bg-blue-100 text-blue-700' }
      case 'COACHING': return { label: 'Coaching', icon: Video, color: 'bg-indigo-100 text-indigo-700' }
      case 'COMMUNITY': return { label: 'Community', icon: Users, color: 'bg-[#00F090]/20 text-emerald-800' }
      case 'WEBINAR': return { label: 'Webinar', icon: Calendar, color: 'bg-amber-100 text-amber-800' }
      case 'MEMBERSHIP': return { label: 'Membership', icon: Sparkles, color: 'bg-rose-100 text-rose-700' }
      case 'CUSTOM_SERVICE': return { label: 'Service', icon: ShoppingBag, color: 'bg-teal-100 text-teal-800' }
      case 'EXTERNAL_LINK': return { label: 'Resource', icon: ExternalLink, color: 'bg-sky-100 text-sky-800' }
      default: return { label: 'Product', icon: BookOpen, color: 'bg-slate-100 text-[#F4F2EC]' }
    }
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-[#F4F2EC] tracking-tight">My Library</h1>
          <p className="text-xs sm:text-sm text-[rgba(244,242,236,0.68)] font-medium mt-1">
            Access all your purchased courses, downloads, coaching, and subscriptions in one place.
          </p>
        </div>

        {/* Search Bar */}
        <form onSubmit={handleSearchSubmit} className="flex gap-2 w-full sm:w-72">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[rgba(244,242,236,0.5)]" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search library..."
              className="pl-9 text-xs rounded-xl bg-[#12141c] border-white/10"
            />
          </div>
          <Button type="submit" variant="outline" size="sm" className="text-xs font-bold rounded-xl">
            Search
          </Button>
        </form>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {tabs.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setActiveTab(tab.value)}
            className={`whitespace-nowrap px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === tab.value
                ? 'bg-primary text-[#000000] shadow-md shadow-primary/20'
                : 'bg-[#12141c] text-[rgba(244,242,236,0.68)] border border-white/10 hover:bg-[#12141c]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Loading Skeleton */}
      {loading ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-64 w-full rounded-3xl" />
          ))}
        </div>
      ) : !items || items.length === 0 ? (
        /* Empty State */
        <div className="flex flex-col items-center justify-center p-16 text-center bg-[#12141c] rounded-3xl border border-dashed border-white/10 space-y-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <BookOpen className="h-8 w-8" />
          </div>
          <div className="space-y-1 max-w-md">
            <h3 className="text-lg font-extrabold text-[#F4F2EC]">No items found</h3>
            <p className="text-xs text-[rgba(244,242,236,0.68)] font-medium leading-relaxed">
              {search
                ? `No products matching "${search}" were found in your library.`
                : 'You have not purchased any products under this category yet.'}
            </p>
          </div>
          <Button onClick={() => { setActiveTab('ALL'); setSearch('') }} variant="outline" className="text-xs font-bold rounded-xl">
            Reset Filters
          </Button>
        </div>
      ) : (
        /* Product Cards Grid */
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => {
            const badge = getProductBadge(item.type)
            const BadgeIcon = badge.icon

            return (
              <div
                key={item.id}
                className="flex flex-col justify-between rounded-3xl border border-white/10 bg-[#12141c] p-6 shadow-sm hover:shadow-md transition-all space-y-4"
              >
                <div className="space-y-4">
                  {/* Top Thumbnail & Badge */}
                  <div className="aspect-video w-full overflow-hidden rounded-2xl bg-slate-100 relative">
                    {item.thumbnail ? (
                      <img src={item.thumbnail} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-primary/10 text-primary">
                        <BadgeIcon className="h-10 w-10" />
                      </div>
                    )}
                    <div className="absolute top-3 left-3">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${badge.color}`}>
                        <BadgeIcon className="h-3 w-3" /> {badge.label}
                      </span>
                    </div>
                  </div>

                  {/* Title & Creator Info */}
                  <div className="space-y-1.5">
                    <h3 className="font-extrabold text-base text-[#F4F2EC] line-clamp-1">{item.title}</h3>
                    <p className="text-xs text-[rgba(244,242,236,0.68)] font-medium line-clamp-2 leading-relaxed">
                      {item.description || 'Access your product content and details.'}
                    </p>
                    <div className="pt-1 flex items-center gap-2 text-xs font-bold text-[rgba(244,242,236,0.68)]">
                      <span>By {item.creatorName}</span>
                    </div>
                  </div>

                  {/* Specific Type Details */}
                  {item.type === 'COURSE' && item.extra?.totalLessons && (
                    <div className="space-y-1.5 pt-1">
                      <div className="flex justify-between text-xs font-semibold text-[rgba(244,242,236,0.68)]">
                        <span>Course Progress</span>
                        <span>{item.extra.completedLessons} / {item.extra.totalLessons} lessons</span>
                      </div>
                      <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                        <div className="bg-primary h-full rounded-full" style={{ width: `${Math.round((item.extra.completedLessons / item.extra.totalLessons) * 100)}%` }} />
                      </div>
                    </div>
                  )}

                  {item.type === 'COACHING' && item.extra?.startTime && (
                    <div className="p-3 rounded-xl bg-indigo-50/60 border border-indigo-100 text-xs font-semibold text-indigo-900">
                      Session: {item.extra.startTime}
                    </div>
                  )}

                  {item.type === 'WEBINAR' && item.extra?.scheduledAt && (
                    <div className="p-3 rounded-xl bg-amber-50/60 border border-amber-100 text-xs font-semibold text-amber-900">
                      Event Date: {new Date(item.extra.scheduledAt).toLocaleString()}
                    </div>
                  )}

                  {item.type === 'CUSTOM_SERVICE' && item.extra?.serviceStatus && (
                    <div className="p-3 rounded-xl bg-teal-50/60 border border-teal-100 text-xs font-semibold text-teal-900 flex justify-between items-center">
                      <span>Status:</span>
                      <span className="font-extrabold uppercase">{item.extra.serviceStatus}</span>
                    </div>
                  )}
                </div>

                {/* Bottom Action Button */}
                <div className="pt-2 border-t border-white/10">
                  {item.type === 'COURSE' && (
                    <Link href={`/learn/${item.extra?.courseId || item.id}`}>
                      <Button className="w-full bg-primary hover:bg-primary-hover text-white font-extrabold text-xs rounded-xl gap-1.5">
                        <Play className="h-3.5 w-3.5 fill-current" /> Continue Course
                      </Button>
                    </Link>
                  )}

                  {item.type === 'DIGITAL_DOWNLOAD' && (
                    <Link href="/account/downloads">
                      <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl gap-1.5">
                        <Download className="h-3.5 w-3.5" /> Download File
                      </Button>
                    </Link>
                  )}

                  {item.type === 'COACHING' && (
                    <Link href="/account/coaching">
                      <Button className="w-full bg-primary hover:bg-primary-hover text-white font-extrabold text-xs rounded-xl gap-1.5">
                        <Video className="h-3.5 w-3.5" /> View Session
                      </Button>
                    </Link>
                  )}

                  {item.type === 'COMMUNITY' && (
                    <Link href={`/account/community/${item.extra?.communityId || item.id}`}>
                      <Button className="w-full bg-[#00F090] text-[#F4F2EC] hover:bg-emerald-400 font-extrabold text-xs rounded-xl gap-1.5">
                        <Users className="h-3.5 w-3.5" /> Access Community
                      </Button>
                    </Link>
                  )}

                  {item.type === 'WEBINAR' && (
                    <Link href="/account/webinars">
                      <Button className="w-full bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs rounded-xl gap-1.5">
                        <Calendar className="h-3.5 w-3.5" /> View Event
                      </Button>
                    </Link>
                  )}

                  {item.type === 'MEMBERSHIP' && (
                    <Link href="/account/memberships">
                      <Button className="w-full bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs rounded-xl gap-1.5">
                        <Sparkles className="h-3.5 w-3.5" /> Manage Membership
                      </Button>
                    </Link>
                  )}

                  {item.type === 'CUSTOM_SERVICE' && (
                    <Link href="/account/services">
                      <Button className="w-full bg-teal-600 hover:bg-teal-700 text-white font-extrabold text-xs rounded-xl gap-1.5">
                        <ShoppingBag className="h-3.5 w-3.5" /> View Request
                      </Button>
                    </Link>
                  )}

                  {item.type === 'EXTERNAL_LINK' && (
                    <Link href="/account/external-links">
                      <Button className="w-full bg-sky-600 hover:bg-sky-700 text-white font-extrabold text-xs rounded-xl gap-1.5">
                        Open Resource <ArrowUpRight className="h-3.5 w-3.5" />
                      </Button>
                    </Link>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
