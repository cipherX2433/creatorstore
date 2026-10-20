'use client'

import React, { useState, useEffect, useRef } from 'react'
import {
  Youtube,
  ArrowLeft,
  X,
  ChevronRight,
  Loader2,
  AlertCircle,
  ExternalLink,
} from 'lucide-react'
import { api } from '@/lib/clientApi'

export function extractYouTubeId(url) {
  if (!url || typeof url !== 'string') return null
  const trimmed = url.trim()
  try {
    const parsed = new URL(trimmed.startsWith('http://') || trimmed.startsWith('https://') ? trimmed : `https://${trimmed}`)
    const validHosts = ['youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtu.be', 'music.youtube.com']
    if (!validHosts.includes(parsed.hostname.toLowerCase())) {
      return null
    }
  } catch {
    return null
  }
  const match = trimmed.match(
    /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([\w-]{11})/
  )
  return match && match[1] ? match[1] : null
}

export default function AddYouTubeModalView({ onSelectVideo, onCancel }) {
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)

  const debounceTimerRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const handleUrlChange = (e) => {
    const val = e.target.value
    setUrl(val)
    setError('')
    setResult(null)

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    const trimmed = val.trim()
    if (!trimmed) {
      setLoading(false)
      return
    }

    const videoId = extractYouTubeId(trimmed)
    if (!videoId) {
      // If user typed something that is definitely not a YouTube URL
      if (trimmed.length > 10 && !trimmed.includes('youtu')) {
        setError('Please enter a valid YouTube video or Shorts URL (e.g. youtube.com/watch?v=...)')
      }
      setLoading(false)
      return
    }

    // Debounce fetching metadata by 350ms
    setLoading(true)
    debounceTimerRef.current = setTimeout(async () => {
      try {
        const canonicalUrl = `https://www.youtube.com/watch?v=${videoId}`
        const res = await api.get(`/media/youtube/metadata?url=${encodeURIComponent(canonicalUrl)}`)
        if (res && res.success) {
          setResult({
            videoId: res.videoId || videoId,
            canonicalUrl: res.canonicalUrl || canonicalUrl,
            title: res.title || 'YouTube Video',
            thumbnailUrl: res.thumbnailUrl || `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
            authorName: res.authorName || 'YouTube',
          })
          setError('')
        } else {
          // Fallback
          setResult({
            videoId,
            canonicalUrl,
            title: 'YouTube Video',
            thumbnailUrl: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
            authorName: 'YouTube',
          })
        }
      } catch (err) {
        // Fallback with video ID
        setResult({
          videoId,
          canonicalUrl: `https://www.youtube.com/watch?v=${videoId}`,
          title: 'YouTube Video',
          thumbnailUrl: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
          authorName: 'YouTube',
        })
      } finally {
        setLoading(false)
      }
    }, 350)
  }

  const handleClear = () => {
    setUrl('')
    setResult(null)
    setError('')
    setLoading(false)
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
    inputRef.current?.focus()
  }

  return (
    <div className="flex flex-col flex-1 min-h-[420px] max-h-[82vh] overflow-y-auto no-scrollbar p-4 sm:p-7">
      {/* 1. TOP URL INPUT */}
      <div className="relative w-full">
        <div
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-full bg-white border transition-all ${
            error
              ? 'border-[#DC2626] ring-1 ring-[#DC2626]'
              : 'border-[#D9D9D9] hover:border-[#999995] focus-within:border-[#1F1F1F] focus-within:ring-1 focus-within:ring-[#1F1F1F]'
          }`}
        >
          <div className="h-6 w-6 rounded-full bg-[#EF4444]/10 flex items-center justify-center shrink-0">
            <Youtube className="h-4 w-4 text-[#EF4444]" />
          </div>
          <input
            ref={inputRef}
            type="text"
            value={url}
            onChange={handleUrlChange}
            placeholder="Paste a video, short, channel, or playlist URL"
            className="w-full text-sm font-medium text-[#1F1F1F] placeholder:text-[#999995] bg-transparent focus:outline-none"
          />
          {url && (
            <button
              type="button"
              onClick={handleClear}
              className="h-5 w-5 rounded-full bg-[#E5E5E3] hover:bg-[#D9D9D9] flex items-center justify-center text-[#6F6F6B] transition-colors shrink-0 cursor-pointer"
              title="Clear input"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>

        {error && (
          <p className="text-xs text-[#DC2626] flex items-center gap-1.5 mt-2 px-2 font-medium">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            {error}
          </p>
        )}
      </div>

      {/* 2. BODY CONTENT */}
      <div className="flex-1 flex flex-col justify-center items-center py-8">
        {/* STATE A: LOADING (Fetching video metadata) */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-12 space-y-4 animate-in fade-in duration-200">
            <div className="relative h-16 w-16 rounded-full bg-[#FEF2F2] flex items-center justify-center">
              <Youtube className="h-8 w-8 text-[#EF4444]" />
              <div className="absolute inset-0 rounded-full border-2 border-[#EF4444] border-t-transparent animate-spin" />
            </div>
            <p className="text-sm font-medium text-[#6F6F6B]">
              Fetching URL information...
            </p>
          </div>
        )}

        {/* STATE B: RESULT (Selectable YouTube item) */}
        {!loading && result && (
          <div className="w-full space-y-3 self-start animate-in fade-in slide-in-from-bottom-2 duration-200">
            <h4 className="text-xs font-bold text-[#6F6F6B] uppercase tracking-wider px-1">
              Results
            </h4>

            <div
              onClick={() => onSelectVideo(result)}
              className="w-full flex items-center justify-between gap-3 p-3.5 rounded-[16px] border border-[#E5E5E3] bg-[#FFFFFF] hover:bg-[#F5F5F3] hover:border-[#1F1F1F] transition-all cursor-pointer group shadow-xs"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                {/* Thumbnail / Icon Badge */}
                <div className="relative h-12 w-16 rounded-[10px] overflow-hidden bg-[#1F1F1F] shrink-0 border border-black/10 flex items-center justify-center">
                  {result.thumbnailUrl ? (
                    <img
                      src={result.thumbnailUrl}
                      alt=""
                      className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-200"
                    />
                  ) : (
                    <Youtube className="h-6 w-6 text-[#EF4444]" />
                  )}
                  <div className="absolute inset-0 bg-black/20 flex items-center justify-center group-hover:bg-black/10 transition-colors">
                    <div className="h-5 w-5 rounded-full bg-red-600/90 flex items-center justify-center shadow-xs">
                      <div className="w-0 h-0 border-t-[3.5px] border-t-transparent border-b-[3.5px] border-b-transparent border-l-[6px] border-l-white ml-0.5" />
                    </div>
                  </div>
                </div>

                {/* Details */}
                <div className="min-w-0 text-left">
                  <p className="text-sm font-bold text-[#1F1F1F] leading-tight">
                    YouTube Video
                  </p>
                  <p className="text-xs text-[#6F6F6B] truncate mt-0.5 font-medium leading-snug">
                    {result.title}
                  </p>
                </div>
              </div>

              {/* Action Chevron */}
              <div className="h-8 w-8 rounded-full flex items-center justify-center text-[#999995] group-hover:text-[#1F1F1F] transition-colors shrink-0">
                <ChevronRight className="h-5 w-5" />
              </div>
            </div>
          </div>
        )}

        {/* STATE C: EMPTY (Paste prompt with curved arrow) */}
        {!loading && !result && (
          <div className="flex flex-col items-center justify-center text-center max-w-sm mx-auto py-10 space-y-4">
            {/* Curved Arrow SVG pointing to input above */}
            <div className="text-[#999995] opacity-60">
              <svg
                width="48"
                height="72"
                viewBox="0 0 48 72"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="transform -rotate-6"
              >
                <path
                  d="M24 68C24 68 12 52 14 32C16 12 34 8 34 8"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeDasharray="4 4"
                />
                <path
                  d="M26 14L34 8L36 18"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>

            <div className="space-y-1.5">
              <h3 className="text-base sm:text-[17px] font-bold text-[#1F1F1F]">
                Paste a URL or connect to YouTube
              </h3>
              <p className="text-xs sm:text-[13px] text-[#6F6F6B] leading-relaxed">
                Add content by pasting a URL to display YouTube videos or Shorts on your storefront.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
