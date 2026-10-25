'use client'

import { useState, useRef, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Search, X, BookOpen, ChevronRight, Sparkles } from 'lucide-react'
import { HELP_ARTICLES, HELP_CATEGORIES } from '@/lib/helpContent'

export default function HelpSearch({
  placeholder = 'Search for articles',
  variant = 'hero', // 'hero' | 'compact'
  autoFocus = false,
  className = '',
}) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const containerRef = useRef(null)
  const inputRef = useRef(null)

  // Map category names by id for quick label lookup
  const categoryMap = useMemo(() => {
    const map = {}
    HELP_CATEGORIES.forEach((cat) => {
      map[cat.id] = cat.title
    })
    return map
  }, [])

  // Filtered search results
  const results = useMemo(() => {
    const trimmed = query.trim().toLowerCase()
    if (!trimmed) return []

    return HELP_ARTICLES.filter((article) => {
      const matchTitle = article.title.toLowerCase().includes(trimmed)
      const matchSummary = article.summary.toLowerCase().includes(trimmed)
      const matchKeywords = article.keywords?.some((k) => k.toLowerCase().includes(trimmed))
      const matchContent = article.content?.toLowerCase().includes(trimmed)
      const catName = categoryMap[article.categoryId] || ''
      const matchCategory = catName.toLowerCase().includes(trimmed)
      return matchTitle || matchSummary || matchKeywords || matchContent || matchCategory
    }).slice(0, 6)
  }, [query, categoryMap])

  // Handle outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Handle keyboard navigation
  const handleKeyDown = (e) => {
    if (!isOpen && results.length > 0 && e.key === 'ArrowDown') {
      setIsOpen(true)
      return
    }

    if (e.key === 'Escape') {
      setIsOpen(false)
      inputRef.current?.blur()
      return
    }

    if (results.length === 0) return

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex((prev) => (prev < results.length - 1 ? prev + 1 : 0))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : results.length - 1))
    } else if (e.key === 'Enter') {
      if (selectedIndex >= 0 && selectedIndex < results.length) {
        e.preventDefault()
        const selected = results[selectedIndex]
        router.push(`/help/${selected.categoryId}/${selected.slug}`)
        setIsOpen(false)
      }
    }
  }

  const handleSelectResult = () => {
    setIsOpen(false)
  }

  const isHero = variant === 'hero'

  return (
    <div
      ref={containerRef}
      className={`relative w-full ${isHero ? 'max-w-2xl mx-auto' : 'max-w-xl'} ${className}`}
    >
      {/* Input container */}
      <div
        className={`relative flex items-center transition-all duration-200 ${
          isHero
            ? 'bg-white rounded-full shadow-[0_4px_20px_rgba(0,0,0,0.06)] border border-transparent focus-within:border-black/20 focus-within:shadow-[0_8px_30px_rgba(0,0,0,0.1)]'
            : 'bg-white rounded-full border border-[#E2E3DD] focus-within:border-[#202432] shadow-sm'
        }`}
      >
        <div className={`pointer-events-none flex items-center text-[#777A83] ${isHero ? 'pl-6 pr-2' : 'pl-4 pr-1'}`}>
          <Search className={isHero ? 'w-5 h-5 text-[#202432]' : 'w-4 h-4 text-[#777A83]'} />
        </div>

        <input
          ref={inputRef}
          type="text"
          value={query}
          autoFocus={autoFocus}
          onChange={(e) => {
            setQuery(e.target.value)
            setIsOpen(true)
            setSelectedIndex(-1)
          }}
          onFocus={() => {
            if (query.trim()) setIsOpen(true)
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          aria-label={placeholder}
          aria-autocomplete="list"
          aria-expanded={isOpen}
          className={`w-full bg-transparent text-[#202432] placeholder:text-[#777A83] focus:outline-none font-medium ${
            isHero
              ? 'py-4 sm:py-4.5 pr-12 text-base sm:text-lg'
              : 'py-2.5 sm:py-3 pr-10 text-sm sm:text-base'
          }`}
        />

        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery('')
              setIsOpen(false)
              inputRef.current?.focus()
            }}
            className={`absolute right-4 p-1 rounded-full text-gray-400 hover:text-black hover:bg-gray-100 transition-colors`}
            aria-label="Clear search"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Dropdown Results */}
      {isOpen && query.trim().length > 0 && (
        <div
          role="listbox"
          className="absolute left-0 right-0 top-full mt-2 bg-white rounded-3xl shadow-2xl border border-[#E2E3DD] py-2 z-50 overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150"
        >
          {results.length > 0 ? (
            <div>
              <div className="px-5 py-2 text-xs font-bold uppercase tracking-wider text-[#777A83] border-b border-[#E2E3DD]/60 flex items-center justify-between">
                <span>Matching Articles</span>
                <span className="text-[11px] font-semibold text-[#5B347C] bg-[#EBC1EB]/40 px-2 py-0.5 rounded-full">
                  {results.length} found
                </span>
              </div>
              <div className="divide-y divide-[#E2E3DD]/50 max-h-[380px] overflow-y-auto">
                {results.map((article, index) => {
                  const isSelected = index === selectedIndex
                  const catTitle = categoryMap[article.categoryId] || article.categoryId
                  return (
                    <Link
                      key={article.id}
                      href={`/help/${article.categoryId}/${article.slug}`}
                      onClick={handleSelectResult}
                      onMouseEnter={() => setSelectedIndex(index)}
                      className={`block px-5 py-3.5 transition-colors group ${
                        isSelected ? 'bg-[#F3F3F0]' : 'hover:bg-[#F8F8F6]'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[11px] font-semibold text-[#5B347C] bg-[#EBC1EB]/30 px-2 py-0.5 rounded-full">
                              {catTitle}
                            </span>
                            <span className="text-xs text-[#777A83]">{article.readTime}</span>
                          </div>
                          <h4 className="text-sm sm:text-base font-bold text-[#202432] group-hover:text-[#5B347C] transition-colors truncate">
                            {article.title}
                          </h4>
                          <p className="text-xs text-[#777A83] line-clamp-1 mt-0.5">
                            {article.summary}
                          </p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-[#5B347C] group-hover:translate-x-0.5 transition-all shrink-0 mt-2" />
                      </div>
                    </Link>
                  )
                })}
              </div>
            </div>
          ) : (
            <div className="px-6 py-8 text-center">
              <div className="w-12 h-12 rounded-2xl bg-[#EBC1EB]/40 text-[#5B347C] flex items-center justify-center mx-auto mb-3">
                <Search className="w-5 h-5" />
              </div>
              <p className="text-base font-bold text-[#202432]">No matching articles found</p>
              <p className="text-sm text-[#777A83] mt-1 max-w-sm mx-auto">
                We couldn&apos;t find any articles matching &ldquo;{query}&rdquo;. Try different keywords or browse our categories below.
              </p>
              <div className="mt-4">
                <Link
                  href="/contact"
                  onClick={() => setIsOpen(false)}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-[#5B347C] hover:underline"
                >
                  Still need assistance? Contact support
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
