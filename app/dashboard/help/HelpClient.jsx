'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { api } from '@/lib/clientApi'
import {
  Search,
  X,
  Compass,
  Package,
  Wallet,
  Calendar,
  Sparkles,
  ShieldCheck,
  ChevronRight,
  ArrowLeft,
  LifeBuoy,
  MessageSquare,
  CheckCircle2,
  AlertCircle,
  Clock,
  BookOpen,
  Send,
  Loader2,
  ExternalLink,
  ThumbsUp,
  ThumbsDown,
  Inbox,
  HelpCircle,
  Tag,
  FileQuestion
} from 'lucide-react'
import { HELP_CATEGORIES, HELP_ARTICLES } from '@/lib/helpContent'

const CATEGORY_ICONS = {
  Compass,
  Package,
  Wallet,
  Calendar,
  Sparkles,
  ShieldCheck,
}

const TICKET_CATEGORIES = [
  'Storefront',
  'Products & Content',
  'Payments & Earnings',
  'Bookings',
  'Subscription & Billing',
  'Account & Security',
  'Bug Report',
  'Other',
]

function getCategoryIcon(iconName) {
  return CATEGORY_ICONS[iconName] || HelpCircle
}

function formatDate(dateString) {
  if (!dateString) return 'Just now'
  try {
    const d = new Date(dateString)
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  } catch {
    return dateString
  }
}

function StatusBadge({ status }) {
  const norm = String(status || 'OPEN').toUpperCase()
  if (norm === 'RESOLVED') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#143324] text-[#4ADE80] border border-[#235836]">
        <CheckCircle2 className="w-3 h-3" /> Resolved
      </span>
    )
  }
  if (norm === 'IN_PROGRESS') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#132A4A] text-[#60A5FA] border border-[#1E4578]">
        <Clock className="w-3 h-3" /> In Progress
      </span>
    )
  }
  if (norm === 'CLOSED') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#2A2A2A] text-[#A3A3A3] border border-[#3A3A3A]">
        Closed
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#3D2C12] text-[#FBBF24] border border-[#614519]">
      <AlertCircle className="w-3 h-3" /> Open
    </span>
  )
}

export default function HelpClient() {
  const [activeTab, setActiveTab] = useState('browse') // 'browse' | 'my-tickets' | 'contact'
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState(null)
  const [activeArticle, setActiveArticle] = useState(null)
  const [articleFeedback, setArticleFeedback] = useState({}) // { [slug]: 'helpful' | 'not-helpful' }

  // My Tickets State
  const [tickets, setTickets] = useState([])
  const [loadingTickets, setLoadingTickets] = useState(false)
  const [selectedTicket, setSelectedTicket] = useState(null)

  // Ticket Form State
  const [formData, setFormData] = useState({
    subject: '',
    category: 'Storefront',
    relatedPage: '',
    description: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState(null)
  const [createdTicket, setCreatedTicket] = useState(null)

  // Fetch tickets for creator
  const fetchTickets = useCallback(async () => {
    setLoadingTickets(true)
    try {
      const res = await api.get('/support/tickets')
      if (res && res.tickets) {
        setTickets(res.tickets)
      }
    } catch (err) {
      console.warn('Could not load tickets:', err)
    } finally {
      setLoadingTickets(false)
    }
  }, [])

  useEffect(() => {
    fetchTickets()
  }, [fetchTickets])

  // Filtered Articles calculation
  const filteredArticles = useMemo(() => {
    let list = HELP_ARTICLES

    if (selectedCategory) {
      list = list.filter((art) => art.categoryId === selectedCategory)
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      list = list.filter((art) => {
        const titleMatch = art.title.toLowerCase().includes(q)
        const summaryMatch = art.summary.toLowerCase().includes(q)
        const keywordMatch = Array.isArray(art.keywords) && art.keywords.some((k) => k.toLowerCase().includes(q))
        const contentMatch = art.content.toLowerCase().includes(q)
        return titleMatch || summaryMatch || keywordMatch || contentMatch
      })
    }

    return list
  }, [searchQuery, selectedCategory])

  // Selected Category Info
  const activeCategoryObj = useMemo(() => {
    if (!selectedCategory) return null
    return HELP_CATEGORIES.find((c) => c.id === selectedCategory) || null
  }, [selectedCategory])

  // Handle Form Change
  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    if (formError) setFormError(null)
  }

  // Handle Form Submit
  const handleFormSubmit = async (e) => {
    e.preventDefault()
    setFormError(null)

    // Validation
    if (!formData.subject.trim()) {
      setFormError('Please enter a subject for your request.')
      return
    }
    if (!formData.category) {
      setFormError('Please select a category.')
      return
    }
    if (!formData.description.trim() || formData.description.trim().length < 10) {
      setFormError('Please provide a detailed description (at least 10 characters).')
      return
    }

    setSubmitting(true)
    try {
      const res = await api.post('/support/tickets', {
        subject: formData.subject.trim(),
        category: formData.category,
        relatedPage: formData.relatedPage.trim() || undefined,
        description: formData.description.trim(),
      })

      if (res && res.ticket) {
        setCreatedTicket(res.ticket)
        toast.success(`Support ticket ${res.ticket.ticketNumber} created!`)
        // Reset form
        setFormData({
          subject: '',
          category: 'Storefront',
          relatedPage: '',
          description: '',
        })
        // Refresh ticket list
        fetchTickets()
      } else {
        throw new Error('Failed to create ticket: unexpected response')
      }
    } catch (err) {
      console.error('Submit ticket error:', err)
      setFormError(err.message || 'Failed to submit support request. Your description has been preserved.')
      toast.error(err.message || 'Submission failed')
    } finally {
      setSubmitting(false)
    }
  }

  // Handle article feedback
  const handleArticleFeedback = (slug, type) => {
    setArticleFeedback((prev) => ({ ...prev, [slug]: type }))
    toast.success('Thank you for your feedback!')
  }

  // Pre-fill ticket form from article
  const openTicketFromArticle = (article) => {
    setActiveArticle(null)
    setActiveTab('contact')
    setCreatedTicket(null)
    setFormError(null)

    // Map category ID to ticket category
    let mappedCat = 'Storefront'
    if (article.categoryId === 'products-content') mappedCat = 'Products & Content'
    if (article.categoryId === 'payments-earnings') mappedCat = 'Payments & Earnings'
    if (article.categoryId === 'bookings') mappedCat = 'Bookings'
    if (article.categoryId === 'plans-billing') mappedCat = 'Subscription & Billing'
    if (article.categoryId === 'account-security') mappedCat = 'Account & Security'

    setFormData((prev) => ({
      ...prev,
      category: mappedCat,
      subject: `Question regarding: ${article.title}`,
      relatedPage: `/dashboard/help?article=${article.slug}`,
    }))
  }

  return (
    <div className="min-h-screen bg-[#1C1C1C] text-[#F5F5F5] pb-24">
      {/* Top Header */}
      <div className="border-b border-[#303030] bg-[#1C1C1C]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-[#242424] border border-[#303030] flex items-center justify-center text-[#4D7CFF]">
                  <LifeBuoy className="w-5 h-5" />
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#F5F5F5]">
                  Help & Support
                </h1>
              </div>
              <p className="text-sm sm:text-base text-[#A3A3A3] max-w-2xl">
                Find answers, troubleshoot issues, or get help from the CreatorStore team.
              </p>
            </div>

            {/* Navigation Tabs */}
            <div className="flex items-center gap-2 bg-[#242424] p-1.5 rounded-xl border border-[#303030] self-start md:self-auto">
              <button
                type="button"
                id="tab-knowledge-base"
                onClick={() => {
                  setActiveTab('browse')
                  setActiveArticle(null)
                }}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === 'browse'
                    ? 'bg-[#303030] text-[#F5F5F5] shadow-sm'
                    : 'text-[#A3A3A3] hover:text-[#F5F5F5] hover:bg-[#2A2A2A]'
                }`}
              >
                <BookOpen className="w-4 h-4" />
                Knowledge Base
              </button>
              <button
                type="button"
                id="tab-my-requests"
                onClick={() => {
                  setActiveTab('my-tickets')
                  setActiveArticle(null)
                  fetchTickets()
                }}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === 'my-tickets'
                    ? 'bg-[#303030] text-[#F5F5F5] shadow-sm'
                    : 'text-[#A3A3A3] hover:text-[#F5F5F5] hover:bg-[#2A2A2A]'
                }`}
              >
                <Inbox className="w-4 h-4" />
                My Requests
                {tickets.length > 0 && (
                  <span className="ml-1 px-1.5 py-0.2 rounded-full text-xs font-semibold bg-[#4D7CFF] text-white">
                    {tickets.length}
                  </span>
                )}
              </button>
              <button
                type="button"
                id="tab-contact-support"
                onClick={() => {
                  setActiveTab('contact')
                  setActiveArticle(null)
                  setCreatedTicket(null)
                  setFormError(null)
                }}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === 'contact'
                    ? 'bg-[#4D7CFF] text-white shadow-sm'
                    : 'text-[#A3A3A3] hover:text-[#F5F5F5] hover:bg-[#2A2A2A]'
                }`}
              >
                <MessageSquare className="w-4 h-4" />
                Contact Support
              </button>
            </div>
          </div>

          {/* Search bar (when in browse tab) */}
          {activeTab === 'browse' && (
            <div className="mt-8 max-w-2xl relative">
              <Search className="w-5 h-5 text-[#A3A3A3] absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id="help-search-input"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search for help..."
                className="w-full pl-11 pr-10 py-3.5 bg-[#242424] border border-[#303030] rounded-xl text-[#F5F5F5] placeholder-[#666] text-sm sm:text-base focus:outline-none focus:border-[#4D7CFF] focus:ring-1 focus:ring-[#4D7CFF] transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#A3A3A3] hover:text-[#F5F5F5] p-1 rounded-md transition-colors"
                  aria-label="Clear search"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {/* ================= TAB 1: BROWSE KNOWLEDGE BASE ================= */}
        {activeTab === 'browse' && (
          <div className="space-y-12">
            {/* Active search or category banner */}
            {(selectedCategory || searchQuery) && (
              <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-[#242424] border border-[#303030] rounded-xl">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-[#A3A3A3]">Filtering by:</span>
                  {selectedCategory && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium bg-[#303030] text-[#F5F5F5] border border-[#3E3E3E]">
                      Category: {activeCategoryObj?.title || selectedCategory}
                      <button
                        type="button"
                        onClick={() => setSelectedCategory(null)}
                        className="text-[#A3A3A3] hover:text-[#F5F5F5]"
                        aria-label="Remove category filter"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </span>
                  )}
                  {searchQuery && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium bg-[#303030] text-[#F5F5F5] border border-[#3E3E3E]">
                      Query: &quot;{searchQuery}&quot;
                      <button
                        type="button"
                        onClick={() => setSearchQuery('')}
                        className="text-[#A3A3A3] hover:text-[#F5F5F5]"
                        aria-label="Remove query filter"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCategory(null)
                    setSearchQuery('')
                  }}
                  className="text-xs text-[#4D7CFF] hover:underline"
                >
                  Reset all filters
                </button>
              </div>
            )}

            {/* Quick Help Categories */}
            {!searchQuery && (
              <section aria-labelledby="categories-heading">
                <div className="flex items-center justify-between mb-5">
                  <h2 id="categories-heading" className="text-lg sm:text-xl font-semibold text-[#F5F5F5]">
                    Quick help categories
                  </h2>
                  {selectedCategory && (
                    <button
                      type="button"
                      onClick={() => setSelectedCategory(null)}
                      className="text-xs text-[#4D7CFF] hover:underline"
                    >
                      Show all categories
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
                  {HELP_CATEGORIES.map((cat) => {
                    const Icon = getCategoryIcon(cat.iconName)
                    const isSelected = selectedCategory === cat.id
                    return (
                      <div
                        key={cat.id}
                        onClick={() => {
                          setSelectedCategory(isSelected ? null : cat.id)
                        }}
                        className={`group cursor-pointer rounded-xl p-5 border transition-all text-left flex flex-col justify-between ${
                          isSelected
                            ? 'bg-[#2A2A2A] border-[#4D7CFF] ring-1 ring-[#4D7CFF]'
                            : 'bg-[#242424] border-[#303030] hover:bg-[#282828] hover:border-[#404040]'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between mb-3">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
                              isSelected ? 'bg-[#4D7CFF] text-white' : 'bg-[#1C1C1C] text-[#4D7CFF] group-hover:bg-[#303030]'
                            }`}>
                              <Icon className="w-5 h-5" />
                            </div>
                            <span className="text-xs text-[#A3A3A3]">
                              {HELP_ARTICLES.filter((a) => a.categoryId === cat.id).length} articles
                            </span>
                          </div>

                          <h3 className="text-base font-semibold text-[#F5F5F5] mb-1 group-hover:text-[#4D7CFF] transition-colors">
                            {cat.title}
                          </h3>
                          <p className="text-xs text-[#A3A3A3] mb-4 line-clamp-2">
                            {cat.description}
                          </p>
                        </div>

                        {/* Topics bullet list */}
                        <div className="pt-3 border-t border-[#303030]/80">
                          <p className="text-[11px] uppercase tracking-wider font-semibold text-[#888] mb-2">
                            Topics covered:
                          </p>
                          <ul className="space-y-1 text-xs text-[#C5C5C5]">
                            {cat.topics.map((t, idx) => (
                              <li key={idx} className="flex items-center gap-1.5 truncate">
                                <span className="w-1 h-1 rounded-full bg-[#4D7CFF] flex-shrink-0" />
                                <span className="truncate">{t}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </section>
            )}

            {/* Popular Help Articles */}
            <section aria-labelledby="articles-heading">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 id="articles-heading" className="text-lg sm:text-xl font-semibold text-[#F5F5F5]">
                    {searchQuery
                      ? `Search Results (${filteredArticles.length})`
                      : selectedCategory
                      ? `${activeCategoryObj?.title || 'Category'} Articles (${filteredArticles.length})`
                      : 'Popular help articles'}
                  </h2>
                  <p className="text-xs text-[#A3A3A3] mt-0.5">
                    Step-by-step guides and answers for CreatorStore
                  </p>
                </div>
              </div>

              {filteredArticles.length === 0 ? (
                <div className="bg-[#242424] border border-[#303030] rounded-xl p-8 text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-[#1C1C1C] border border-[#303030] text-[#A3A3A3] flex items-center justify-center mx-auto">
                    <FileQuestion className="w-6 h-6" />
                  </div>
                  <h3 className="text-base font-semibold text-[#F5F5F5]">
                    No help articles found
                  </h3>
                  <p className="text-xs sm:text-sm text-[#A3A3A3] max-w-md mx-auto">
                    We couldn&apos;t find any articles matching your search. Try using different keywords or contact our support team.
                  </p>
                  <div className="flex items-center justify-center gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuery('')
                        setSelectedCategory(null)
                      }}
                      className="px-4 py-2 rounded-lg bg-[#303030] hover:bg-[#3A3A3A] text-xs font-medium text-[#F5F5F5] transition-colors"
                    >
                      Clear search
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('contact')}
                      className="px-4 py-2 rounded-lg bg-[#4D7CFF] hover:bg-[#3b6ae8] text-xs font-medium text-white transition-colors"
                    >
                      Contact support
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredArticles.map((article) => {
                    const catObj = HELP_CATEGORIES.find((c) => c.id === article.categoryId)
                    return (
                      <div
                        key={article.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => setActiveArticle(article)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault()
                            setActiveArticle(article)
                          }
                        }}
                        className="group bg-[#242424] hover:bg-[#282828] border border-[#303030] hover:border-[#404040] rounded-xl p-5 text-left transition-all cursor-pointer flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-center justify-between gap-2 mb-2.5">
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-[#1C1C1C] text-[#A3A3A3] border border-[#303030]">
                              {catObj?.title || 'Help'}
                            </span>
                            <span className="text-xs text-[#888] flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {article.readTime}
                            </span>
                          </div>
                          <h3 className="text-sm sm:text-base font-semibold text-[#F5F5F5] group-hover:text-[#4D7CFF] transition-colors mb-2 line-clamp-2">
                            {article.title}
                          </h3>
                          <p className="text-xs text-[#A3A3A3] line-clamp-2 leading-relaxed">
                            {article.summary}
                          </p>
                        </div>
                        <div className="mt-4 pt-3 border-t border-[#303030]/60 flex items-center justify-between text-xs text-[#4D7CFF] font-medium">
                          <span>Read full guide</span>
                          <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </section>

            {/* Still Need Help Section */}
            <section className="bg-[#242424] border border-[#303030] rounded-2xl p-6 sm:p-8 relative overflow-hidden">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                <div className="space-y-2 max-w-xl">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-[#4D7CFF]/10 text-[#4D7CFF] border border-[#4D7CFF]/20">
                    <LifeBuoy className="w-3.5 h-3.5" />
                    Dedicated Support
                  </div>
                  <h3 className="text-xl sm:text-2xl font-bold text-[#F5F5F5]">
                    Still need help?
                  </h3>
                  <p className="text-sm text-[#A3A3A3] leading-relaxed">
                    Tell us what is happening, and our support team can help you investigate. We review inquiries quickly and notify you by email.
                  </p>
                </div>
                <button
                  type="button"
                  id="btn-contact-support-banner"
                  onClick={() => {
                    setActiveTab('contact')
                    setCreatedTicket(null)
                    setFormError(null)
                  }}
                  className="px-6 py-3 rounded-xl bg-[#4D7CFF] hover:bg-[#3b6ae8] text-white text-sm font-semibold transition-colors flex items-center justify-center gap-2 whitespace-nowrap self-start sm:self-auto shadow-sm"
                >
                  <MessageSquare className="w-4 h-4" />
                  Contact Support
                </button>
              </div>
            </section>
          </div>
        )}

        {/* ================= TAB 2: MY SUPPORT REQUESTS ================= */}
        {activeTab === 'my-tickets' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-[#F5F5F5]">
                  My Support Requests
                </h2>
                <p className="text-xs sm:text-sm text-[#A3A3A3] mt-1">
                  Track tickets you have submitted to the CreatorStore support team.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('contact')
                  setCreatedTicket(null)
                  setFormError(null)
                }}
                className="px-4 py-2 rounded-xl bg-[#4D7CFF] hover:bg-[#3b6ae8] text-white text-xs font-semibold transition-colors flex items-center gap-2 self-start sm:self-auto"
              >
                <MessageSquare className="w-4 h-4" />
                Submit New Request
              </button>
            </div>

            {loadingTickets ? (
              <div className="p-12 text-center text-[#A3A3A3] bg-[#242424] border border-[#303030] rounded-xl flex items-center justify-center gap-3">
                <Loader2 className="w-5 h-5 animate-spin text-[#4D7CFF]" />
                Loading your support requests...
              </div>
            ) : tickets.length === 0 ? (
              <div className="p-12 text-center bg-[#242424] border border-[#303030] rounded-xl space-y-4">
                <div className="w-12 h-12 rounded-full bg-[#1C1C1C] border border-[#303030] text-[#A3A3A3] flex items-center justify-center mx-auto">
                  <Inbox className="w-6 h-6" />
                </div>
                <h3 className="text-base font-semibold text-[#F5F5F5]">
                  No support requests yet
                </h3>
                <p className="text-xs sm:text-sm text-[#A3A3A3] max-w-md mx-auto">
                  Whenever you submit a ticket to our support team, you can review its status, ticket reference, and details right here.
                </p>
                <button
                  type="button"
                  onClick={() => setActiveTab('contact')}
                  className="px-4 py-2 rounded-lg bg-[#4D7CFF] hover:bg-[#3b6ae8] text-xs font-medium text-white transition-colors"
                >
                  Contact Support
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {tickets.map((t) => (
                  <div
                    key={t.id}
                    onClick={() => setSelectedTicket(t)}
                    className="p-5 bg-[#242424] hover:bg-[#282828] border border-[#303030] hover:border-[#404040] rounded-xl transition-all cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs font-bold text-[#4D7CFF] bg-[#1C1C1C] px-2 py-0.5 rounded border border-[#303030]">
                          {t.ticketNumber}
                        </span>
                        <StatusBadge status={t.status} />
                        <span className="text-xs text-[#A3A3A3] px-2 py-0.5 rounded bg-[#1C1C1C] border border-[#303030]">
                          {t.category}
                        </span>
                      </div>
                      <h4 className="text-sm sm:text-base font-semibold text-[#F5F5F5] truncate">
                        {t.subject}
                      </h4>
                      <p className="text-xs text-[#A3A3A3] line-clamp-1">
                        {t.description}
                      </p>
                    </div>

                    <div className="flex items-center justify-between md:justify-end gap-4 text-xs text-[#A3A3A3] border-t md:border-t-0 pt-2 md:pt-0 border-[#303030]">
                      <div>
                        Submitted {formatDate(t.createdAt)}
                      </div>
                      <button
                        type="button"
                        className="text-[#4D7CFF] hover:underline font-medium flex items-center gap-1"
                      >
                        View details <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ================= TAB 3: CONTACT SUPPORT FORM ================= */}
        {activeTab === 'contact' && (
          <div className="max-w-2xl mx-auto space-y-6">
            <div>
              <button
                type="button"
                onClick={() => setActiveTab('browse')}
                className="inline-flex items-center gap-1.5 text-xs text-[#A3A3A3] hover:text-[#F5F5F5] mb-4 transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back to Knowledge Base
              </button>
              <h2 className="text-xl sm:text-2xl font-bold text-[#F5F5F5]">
                Submit a Support Request
              </h2>
              <p className="text-xs sm:text-sm text-[#A3A3A3] mt-1">
                Please describe your inquiry. Your ticket will be automatically linked to your authenticated creator account.
              </p>
            </div>

            {/* Created Ticket Confirmation State */}
            {createdTicket ? (
              <div className="bg-[#242424] border border-[#303030] rounded-2xl p-6 sm:p-8 space-y-6 text-center">
                <div className="w-14 h-14 rounded-full bg-[#143324] border border-[#235836] text-[#4ADE80] flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-8 h-8" />
                </div>

                <div className="space-y-2">
                  <h3 className="text-xl font-bold text-[#F5F5F5]">
                    Support Request Submitted
                  </h3>
                  <p className="text-sm text-[#A3A3A3] max-w-md mx-auto">
                    We have logged your ticket and our team has been notified. We will investigate and follow up with you.
                  </p>
                </div>

                <div className="p-4 bg-[#1C1C1C] border border-[#303030] rounded-xl max-w-sm mx-auto space-y-1">
                  <div className="text-xs text-[#A3A3A3]">Your Ticket Reference</div>
                  <div className="text-lg font-mono font-bold text-[#4D7CFF] select-all">
                    {createdTicket.ticketNumber}
                  </div>
                  <div className="text-xs text-[#888]">
                    Category: {createdTicket.category} • Status: {createdTicket.status}
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('my-tickets')
                      setCreatedTicket(null)
                    }}
                    className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[#4D7CFF] hover:bg-[#3b6ae8] text-white text-xs font-semibold transition-colors"
                  >
                    View in My Requests
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCreatedTicket(null)
                      setFormData({
                        subject: '',
                        category: 'Storefront',
                        relatedPage: '',
                        description: '',
                      })
                    }}
                    className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[#303030] hover:bg-[#3A3A3A] text-[#F5F5F5] text-xs font-semibold transition-colors"
                  >
                    Submit Another Request
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleFormSubmit} className="bg-[#242424] border border-[#303030] rounded-2xl p-6 sm:p-8 space-y-5">
                {formError && (
                  <div className="p-4 bg-[#3D1414] border border-[#5E2222] rounded-xl flex items-start gap-3 text-xs sm:text-sm text-[#FCA5A5]">
                    <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold">Error submitting ticket</p>
                      <p>{formError}</p>
                    </div>
                  </div>
                )}

                {/* Subject */}
                <div className="space-y-1.5">
                  <label htmlFor="ticket-subject" className="block text-xs font-medium text-[#F5F5F5]">
                    Subject <span className="text-red-400">*</span>
                  </label>
                  <input
                    id="ticket-subject"
                    name="subject"
                    type="text"
                    required
                    maxLength={150}
                    value={formData.subject}
                    onChange={handleInputChange}
                    placeholder="Brief summary of the issue (e.g. Issue connecting Stripe payout)"
                    className="w-full px-4 py-2.5 bg-[#1C1C1C] border border-[#303030] rounded-xl text-sm text-[#F5F5F5] placeholder-[#666] focus:outline-none focus:border-[#4D7CFF] focus:ring-1 focus:ring-[#4D7CFF] transition-all"
                  />
                </div>

                {/* Category & Related Page Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label htmlFor="ticket-category" className="block text-xs font-medium text-[#F5F5F5]">
                      Category <span className="text-red-400">*</span>
                    </label>
                    <select
                      id="ticket-category"
                      name="category"
                      required
                      value={formData.category}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2.5 bg-[#1C1C1C] border border-[#303030] rounded-xl text-sm text-[#F5F5F5] focus:outline-none focus:border-[#4D7CFF] focus:ring-1 focus:ring-[#4D7CFF] transition-all"
                    >
                      {TICKET_CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="ticket-related-page" className="block text-xs font-medium text-[#A3A3A3]">
                      Related page or feature <span className="text-xs text-[#666]">(optional)</span>
                    </label>
                    <input
                      id="ticket-related-page"
                      name="relatedPage"
                      type="text"
                      maxLength={100}
                      value={formData.relatedPage}
                      onChange={handleInputChange}
                      placeholder="e.g. /dashboard/products or Checkout"
                      className="w-full px-4 py-2.5 bg-[#1C1C1C] border border-[#303030] rounded-xl text-sm text-[#F5F5F5] placeholder-[#666] focus:outline-none focus:border-[#4D7CFF] focus:ring-1 focus:ring-[#4D7CFF] transition-all"
                    />
                  </div>
                </div>

                {/* Description */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label htmlFor="ticket-description" className="block text-xs font-medium text-[#F5F5F5]">
                      Description <span className="text-red-400">*</span>
                    </label>
                    <span className="text-[11px] text-[#888]">
                      {formData.description.length} characters (min 10)
                    </span>
                  </div>
                  <textarea
                    id="ticket-description"
                    name="description"
                    required
                    rows={6}
                    value={formData.description}
                    onChange={handleInputChange}
                    placeholder="Please explain what is happening, what you expected, and any error messages you received..."
                    className="w-full px-4 py-3 bg-[#1C1C1C] border border-[#303030] rounded-xl text-sm text-[#F5F5F5] placeholder-[#666] focus:outline-none focus:border-[#4D7CFF] focus:ring-1 focus:ring-[#4D7CFF] transition-all resize-y"
                  />
                </div>

                <div className="p-3.5 bg-[#1C1C1C] border border-[#303030] rounded-xl text-xs text-[#A3A3A3] flex items-start gap-2.5">
                  <ShieldCheck className="w-4 h-4 text-[#4D7CFF] flex-shrink-0 mt-0.5" />
                  <span>
                    Your support inquiry is securely linked to your creator identity. We never share your account details or credentials.
                  </span>
                </div>

                {/* Form Actions */}
                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setActiveTab('browse')}
                    className="px-5 py-2.5 rounded-xl bg-[#303030] hover:bg-[#3A3A3A] text-xs font-semibold text-[#F5F5F5] transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    id="btn-submit-support-ticket"
                    disabled={submitting}
                    className="px-6 py-2.5 rounded-xl bg-[#4D7CFF] hover:bg-[#3b6ae8] disabled:opacity-50 disabled:cursor-not-allowed text-xs font-semibold text-white transition-colors flex items-center gap-2 shadow-sm"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Submitting ticket...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        Submit Request
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </main>

      {/* ================= MODAL: READ ARTICLE ================= */}
      {activeArticle && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-none"
          role="dialog"
          aria-modal="true"
          aria-labelledby="article-modal-title"
        >
          <div className="relative w-full max-w-3xl max-h-[90vh] bg-[#242424] border border-[#303030] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="p-5 sm:p-6 border-b border-[#303030] flex items-start justify-between gap-4 bg-[#242424]">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-[#1C1C1C] text-[#4D7CFF] border border-[#303030]">
                    {HELP_CATEGORIES.find((c) => c.id === activeArticle.categoryId)?.title || 'Guide'}
                  </span>
                  <span className="text-xs text-[#888]">• {activeArticle.readTime}</span>
                </div>
                <h2 id="article-modal-title" className="text-lg sm:text-xl font-bold text-[#F5F5F5]">
                  {activeArticle.title}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setActiveArticle(null)}
                className="p-1.5 rounded-lg text-[#A3A3A3] hover:text-[#F5F5F5] hover:bg-[#303030] transition-colors"
                aria-label="Close guide"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 sm:p-6 overflow-y-auto space-y-6 text-sm leading-relaxed text-[#D5D5D5]">
              {/* Summary box */}
              <div className="p-4 bg-[#1C1C1C] border-l-4 border-[#4D7CFF] rounded-r-xl text-xs sm:text-sm text-[#E0E0E0]">
                <strong className="text-white block mb-1">Key Takeaway</strong>
                {activeArticle.summary}
              </div>

              {/* Formatted Guide Content */}
              <div className="space-y-4 whitespace-pre-line font-sans text-xs sm:text-sm text-[#D5D5D5]">
                {activeArticle.content.trim()}
              </div>

              {/* Feedback question */}
              <div className="pt-6 border-t border-[#303030] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="text-xs text-[#A3A3A3]">
                  Was this article helpful?
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleArticleFeedback(activeArticle.slug, 'helpful')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border flex items-center gap-1.5 transition-colors ${
                      articleFeedback[activeArticle.slug] === 'helpful'
                        ? 'bg-[#143324] text-[#4ADE80] border-[#235836]'
                        : 'bg-[#1C1C1C] text-[#A3A3A3] border-[#303030] hover:text-[#F5F5F5]'
                    }`}
                  >
                    <ThumbsUp className="w-3.5 h-3.5" /> Yes
                  </button>
                  <button
                    type="button"
                    onClick={() => handleArticleFeedback(activeArticle.slug, 'not-helpful')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border flex items-center gap-1.5 transition-colors ${
                      articleFeedback[activeArticle.slug] === 'not-helpful'
                        ? 'bg-[#3D1414] text-[#FCA5A5] border-[#5E2222]'
                        : 'bg-[#1C1C1C] text-[#A3A3A3] border-[#303030] hover:text-[#F5F5F5]'
                    }`}
                  >
                    <ThumbsDown className="w-3.5 h-3.5" /> No
                  </button>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 sm:p-5 border-t border-[#303030] bg-[#1C1C1C] flex items-center justify-between gap-3">
              <span className="text-xs text-[#A3A3A3] hidden sm:inline">
                Need more help with this?
              </span>
              <div className="flex items-center gap-2 ml-auto">
                <button
                  type="button"
                  onClick={() => openTicketFromArticle(activeArticle)}
                  className="px-4 py-2 rounded-xl bg-[#303030] hover:bg-[#3A3A3A] text-xs font-medium text-[#F5F5F5] transition-colors flex items-center gap-1.5"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  Contact Support About This
                </button>
                <button
                  type="button"
                  onClick={() => setActiveArticle(null)}
                  className="px-4 py-2 rounded-xl bg-[#4D7CFF] hover:bg-[#3b6ae8] text-xs font-medium text-white transition-colors"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: TICKET DETAILS ================= */}
      {selectedTicket && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-none"
          role="dialog"
          aria-modal="true"
          aria-labelledby="ticket-modal-title"
        >
          <div className="relative w-full max-w-2xl bg-[#242424] border border-[#303030] rounded-2xl shadow-2xl flex flex-col overflow-hidden max-h-[90vh]">
            {/* Header */}
            <div className="p-5 sm:p-6 border-b border-[#303030] flex items-start justify-between gap-4 bg-[#242424]">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-mono text-xs font-bold text-[#4D7CFF] bg-[#1C1C1C] px-2 py-0.5 rounded border border-[#303030]">
                    {selectedTicket.ticketNumber}
                  </span>
                  <StatusBadge status={selectedTicket.status} />
                  <span className="text-xs text-[#A3A3A3] px-2 py-0.5 rounded bg-[#1C1C1C] border border-[#303030]">
                    {selectedTicket.category}
                  </span>
                </div>
                <h2 id="ticket-modal-title" className="text-lg sm:text-xl font-bold text-[#F5F5F5]">
                  {selectedTicket.subject}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTicket(null)}
                className="p-1.5 rounded-lg text-[#A3A3A3] hover:text-[#F5F5F5] hover:bg-[#303030] transition-colors"
                aria-label="Close ticket details"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 sm:p-6 overflow-y-auto space-y-5 text-sm">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3.5 bg-[#1C1C1C] border border-[#303030] rounded-xl text-xs">
                <div>
                  <span className="text-[#888] block mb-0.5">Submitted</span>
                  <span className="text-[#F5F5F5] font-medium">{formatDate(selectedTicket.createdAt)}</span>
                </div>
                <div>
                  <span className="text-[#888] block mb-0.5">Priority</span>
                  <span className="text-[#F5F5F5] font-medium">{selectedTicket.priority || 'NORMAL'}</span>
                </div>
                {selectedTicket.relatedPage && (
                  <div className="col-span-2 sm:col-span-1">
                    <span className="text-[#888] block mb-0.5">Related Page</span>
                    <span className="text-[#4D7CFF] font-medium truncate block">{selectedTicket.relatedPage}</span>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#A3A3A3] mb-2">
                  Original Description
                </label>
                <div className="p-4 bg-[#1C1C1C] border border-[#303030] rounded-xl text-xs sm:text-sm text-[#D5D5D5] whitespace-pre-line leading-relaxed">
                  {selectedTicket.description}
                </div>
              </div>

              <div className="p-4 bg-[#132A4A]/40 border border-[#1E4578] rounded-xl text-xs text-[#93C5FD] flex items-start gap-2.5">
                <Clock className="w-4 h-4 flex-shrink-0 mt-0.5 text-[#60A5FA]" />
                <div>
                  <strong className="block text-white mb-0.5">Status: {selectedTicket.status}</strong>
                  <span>
                    Our support team reviews tickets in the order they are submitted. Replies and status updates are sent directly to your registered account email address.
                  </span>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-[#303030] bg-[#1C1C1C] flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedTicket(null)}
                className="px-5 py-2 rounded-xl bg-[#303030] hover:bg-[#3A3A3A] text-xs font-medium text-[#F5F5F5] transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
