'use client'

import { useState, useRef, useEffect, useMemo } from 'react'
import { ChevronDown, Search, Check, Globe } from 'lucide-react'
import { COUNTRIES, POPULAR_COUNTRY_CODES, getCountryName } from '@/lib/countries'

export default function CountrySelect({
  value,
  onChange,
  label = 'Country',
  error,
  disabled = false,
  required = true,
  placeholder = 'Select your country...',
  className = '',
  id = 'cs-country-select',
  theme = 'dark', // 'dark' | 'light'
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const containerRef = useRef(null)
  const searchInputRef = useRef(null)

  const selectedName = useMemo(() => {
    return value ? getCountryName(value) : null
  }, [value])

  // Filter countries based on search term
  const filteredCountries = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return COUNTRIES
    return COUNTRIES.filter(
      c => c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q)
    )
  }, [search])

  const popularCountries = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (q) return []
    return COUNTRIES.filter(c => POPULAR_COUNTRY_CODES.includes(c.code))
  }, [search])

  // Handle clicking outside to close
  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  // Focus search input when opened
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      setTimeout(() => {
        searchInputRef.current?.focus()
      }, 50)
    }
  }, [isOpen])

  function handleSelect(code) {
    onChange(code)
    setIsOpen(false)
    setSearch('')
  }

  const isLight = theme === 'light'

  const labelClasses = isLight
    ? 'block text-xs font-semibold text-zinc-700'
    : 'block text-xs font-medium text-[#D4D4D8]'

  const buttonClasses = isLight
    ? `w-full h-10 px-3.5 rounded-xl text-sm flex items-center justify-between text-left transition-all cursor-pointer ${
        disabled ? 'opacity-50 cursor-not-allowed' : ''
      } ${
        error
          ? 'border-red-400 bg-red-50/20 text-red-900 focus:border-red-500'
          : 'border-transparent bg-[#F4F4F5] hover:bg-[#ECECED] focus:bg-white text-zinc-900 hover:border-zinc-200 focus:border-zinc-300'
      } border focus:outline-none focus:ring-1 focus:ring-zinc-400/20`
    : `w-full h-11 px-3.5 rounded-xl text-sm flex items-center justify-between text-left transition-all cursor-pointer ${
        disabled ? 'opacity-50 cursor-not-allowed' : ''
      } ${
        error ? 'border-[#EF4444] bg-[#141416]' : 'border-[#2E2E33] bg-[#141416] hover:border-[#4B4B53]'
      } border focus:outline-none focus:border-white focus:ring-1 focus:ring-white/20`

  const menuContainerClasses = isLight
    ? 'absolute left-0 right-0 top-full mt-1.5 z-50 bg-white border border-zinc-200 rounded-2xl shadow-[0_16px_40px_rgba(0,0,0,0.12)] overflow-hidden animate-in fade-in zoom-in-95 duration-100 flex flex-col max-h-[280px]'
    : 'absolute left-0 right-0 top-full mt-1.5 z-50 bg-[#161619] border border-[#2E2E33] rounded-2xl shadow-[0_16px_40px_rgba(0,0,0,0.8)] overflow-hidden animate-in fade-in zoom-in-95 duration-100 flex flex-col max-h-[320px]'

  const searchBoxClasses = isLight
    ? 'p-2.5 border-b border-zinc-100 relative bg-zinc-50/50'
    : 'p-2.5 border-b border-[#242428] relative'

  const searchInputClasses = isLight
    ? 'w-full h-8 pl-9 pr-3 rounded-lg bg-white border border-zinc-200 text-xs text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-zinc-400'
    : 'w-full h-9 pl-9 pr-3 rounded-lg bg-[#0E0E10] border border-[#2A2A2E] text-xs text-white placeholder:text-[#52525B] focus:outline-none focus:border-[#4B4B53]'

  const listDividerClasses = isLight
    ? 'overflow-y-auto flex-1 divide-y divide-zinc-100 py-1'
    : 'overflow-y-auto flex-1 divide-y divide-[#202024]/40 py-1'

  const sectionHeaderClasses = isLight
    ? 'px-3.5 py-1 text-[10px] font-mono uppercase tracking-wider text-zinc-400'
    : 'px-3.5 py-1 text-[10px] font-mono uppercase tracking-wider text-[#71717A]'

  const itemButtonClasses = (isSelected) => isLight
    ? `w-full px-3.5 py-2 text-xs flex items-center justify-between text-left transition-colors cursor-pointer ${
        isSelected
          ? 'bg-zinc-900 text-white font-medium'
          : 'text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900'
      }`
    : `w-full px-3.5 py-2 text-xs flex items-center justify-between text-left transition-colors cursor-pointer ${
        isSelected
          ? 'bg-[#FF4B1F]/15 text-white font-medium'
          : 'text-[#D4D4D8] hover:bg-[#202024] hover:text-white'
      }`

  return (
    <div className={`space-y-1.5 relative ${className}`} ref={containerRef}>
      {label && (
        <label htmlFor={id} className={labelClasses}>
          {label} {required && <span className="text-[#EF4444]">*</span>}
        </label>
      )}

      {/* Trigger Button */}
      <button
        id={id}
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={buttonClasses}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className="flex items-center gap-2 truncate">
          <Globe className={`w-4 h-4 ${isLight ? 'text-zinc-500' : 'text-[#71717A]'} shrink-0`} />
          {value && selectedName ? (
            <span className={`${isLight ? 'text-zinc-900' : 'text-white'} font-medium truncate`}>
              {selectedName} <span className={`${isLight ? 'text-zinc-500' : 'text-[#71717A]'} text-xs font-mono ml-1`}>({value})</span>
            </span>
          ) : (
            <span className={`${isLight ? 'text-zinc-400' : 'text-[#52525B]'} truncate`}>{placeholder}</span>
          )}
        </span>
        <ChevronDown className={`w-4 h-4 ${isLight ? 'text-zinc-500' : 'text-[#71717A]'} shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Error text */}
      {error && (
        <p className="text-[11px] text-[#EF4444] font-medium leading-tight pt-0.5">
          {error}
        </p>
      )}

      {/* Dropdown Menu */}
      {isOpen && (
        <div className={menuContainerClasses}>
          {/* Search Input Bar */}
          <div className={searchBoxClasses}>
            <Search className={`w-4 h-4 ${isLight ? 'text-zinc-400' : 'text-[#71717A]'} absolute left-5 top-1/2 -translate-y-1/2`} />
            <input
              ref={searchInputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search country or code..."
              className={searchInputClasses}
            />
          </div>

          {/* List of Countries */}
          <div className={listDividerClasses}>
            {/* Popular Section */}
            {popularCountries.length > 0 && (
              <div className="pb-1">
                <div className={sectionHeaderClasses}>
                  Suggested Countries
                </div>
                {popularCountries.map((c) => {
                  const isSelected = value === c.code
                  return (
                    <button
                      key={`pop-${c.code}`}
                      type="button"
                      onClick={() => handleSelect(c.code)}
                      className={itemButtonClasses(isSelected)}
                    >
                      <span className="truncate">
                        {c.name} <span className={`${isSelected ? (isLight ? 'text-zinc-300' : 'text-[#FF4B1F]') : (isLight ? 'text-zinc-400' : 'text-[#71717A]')} font-mono ml-1`}>({c.code})</span>
                      </span>
                      {isSelected && <Check className={`w-3.5 h-3.5 ${isLight ? 'text-white' : 'text-[#FF4B1F]'} shrink-0`} />}
                    </button>
                  )
                })}
              </div>
            )}

            {/* Full Country List */}
            <div>
              {popularCountries.length > 0 && (
                <div className={sectionHeaderClasses}>
                  All Countries
                </div>
              )}
              {filteredCountries.length === 0 ? (
                <div className={`p-4 text-center text-xs ${isLight ? 'text-zinc-400' : 'text-[#71717A]'}`}>
                  No countries match &ldquo;{search}&rdquo;
                </div>
              ) : (
                filteredCountries.map((c) => {
                  const isSelected = value === c.code
                  return (
                    <button
                      key={c.code}
                      type="button"
                      onClick={() => handleSelect(c.code)}
                      className={itemButtonClasses(isSelected)}
                    >
                      <span className="truncate">
                        {c.name} <span className={`${isSelected ? (isLight ? 'text-zinc-300' : 'text-[#FF4B1F]') : (isLight ? 'text-zinc-400' : 'text-[#71717A]')} font-mono ml-1`}>({c.code})</span>
                      </span>
                      {isSelected && <Check className={`w-3.5 h-3.5 ${isLight ? 'text-white' : 'text-[#FF4B1F]'} shrink-0`} />}
                    </button>
                  )
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
