'use client'

import React, { useState, useEffect, useRef } from 'react'
import {
  Youtube,
  Music2,
  PlayCircle,
  Play,
  Video,
  X,
  ChevronRight,
  Loader2,
  AlertCircle,
  Upload,
  FileVideo,
} from 'lucide-react'
import { api } from '@/lib/clientApi'
import {
  MEDIA_PLATFORMS,
  extractYouTubeId,
  extractTikTokId,
  extractVimeoId,
  extractDirectVideo,
  getHostname,
  VALID_HOSTS,
} from '@/lib/mediaUtils'
import { toast } from 'sonner'

export { extractYouTubeId, extractTikTokId, extractVimeoId, extractDirectVideo }

export default function AddMediaModalView({ mediaType = 'youtube', onSelectVideo, onCancel }) {
  const config = MEDIA_PLATFORMS[mediaType] || MEDIA_PLATFORMS.youtube

  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)

  const debounceTimerRef = useRef(null)
  const inputRef = useRef(null)
  const fileInputRef = useRef(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  // Icon component resolution
  const PlatformIcon =
    mediaType === 'youtube'
      ? Youtube
      : mediaType === 'tiktok'
        ? Music2
        : mediaType === 'vimeo'
          ? PlayCircle
          : Play

  // Validate URL based on platform
  const validateUrl = (raw) => {
    const trimmed = (raw || '').trim()
    if (!trimmed) return null

    if (mediaType === 'youtube') {
      const yId = extractYouTubeId(trimmed)
      if (!yId) return { valid: false, error: 'Please enter a valid YouTube video or Shorts URL' }
      return { valid: true, id: yId, canonical: `https://www.youtube.com/watch?v=${yId}` }
    }

    if (mediaType === 'tiktok') {
      const host = getHostname(trimmed)
      if (!host || !VALID_HOSTS.tiktok.includes(host)) {
        return { valid: false, error: 'Please enter a valid TikTok video URL (tiktok.com/@user/video/...)' }
      }
      const tId = extractTikTokId(trimmed)
      const canonical = trimmed.startsWith('http') ? trimmed : `https://${trimmed}`
      return { valid: true, id: tId, canonical }
    }

    if (mediaType === 'vimeo') {
      const vId = extractVimeoId(trimmed)
      if (!vId) return { valid: false, error: 'Please enter a valid Vimeo video URL (vimeo.com/...)' }
      return { valid: true, id: vId, canonical: `https://vimeo.com/${vId}` }
    }

    if (mediaType === 'video') {
      const direct = extractDirectVideo(trimmed)
      if (!direct) {
        // Check if generic valid http link
        try {
          new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`)
        } catch {
          return { valid: false, error: 'Please enter a valid video link (.mp4, Loom) or upload a file' }
        }
      }
      const canonical = trimmed.startsWith('http') ? trimmed : `https://${trimmed}`
      return { valid: true, id: 'direct_video', canonical }
    }

    return { valid: true, canonical: trimmed }
  }

  // Handle URL changes with debounce
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

    const valResult = validateUrl(trimmed)
    if (!valResult || !valResult.valid) {
      if (trimmed.length > 15) {
        setError(valResult?.error || 'Invalid video URL')
      }
      setLoading(false)
      return
    }

    // Fetch metadata from backend API
    const fetchMetadata = async (targetVal) => {
      try {
        const canonical = targetVal.canonical
        const res = await api.get(`${config.apiRoute}?url=${encodeURIComponent(canonical)}`)

        if (res && res.success) {
          setResult({
            mediaType,
            videoId: res.videoId || targetVal.id || null,
            canonicalUrl: res.canonicalUrl || canonical,
            url: res.canonicalUrl || canonical,
            title: res.title || `${config.title} Video`,
            thumbnailUrl: res.thumbnailUrl || (mediaType === 'youtube' ? `https://img.youtube.com/vi/${targetVal.id}/hqdefault.jpg` : null),
            authorName: res.authorName || config.title,
            isDirect: Boolean(res.isDirect),
          })
          setError('')
        } else {
          // Fallback
          setResult({
            mediaType,
            videoId: targetVal.id || null,
            canonicalUrl: canonical,
            url: canonical,
            title: `${config.title} Video`,
            thumbnailUrl: mediaType === 'youtube' ? `https://img.youtube.com/vi/${targetVal.id}/hqdefault.jpg` : null,
            authorName: config.title,
          })
        }
      } catch (err) {
        // Fallback for private / restricted videos
        setResult({
          mediaType,
          videoId: targetVal.id || null,
          canonicalUrl: targetVal.canonical,
          url: targetVal.canonical,
          title: `${config.title} Video`,
          thumbnailUrl: mediaType === 'youtube' ? `https://img.youtube.com/vi/${targetVal.id}/hqdefault.jpg` : null,
          authorName: config.title,
        })
      } finally {
        setLoading(false)
      }
    }

    setLoading(true)
    debounceTimerRef.current = setTimeout(() => {
      fetchMetadata(valResult)
    }, 350)
  }

  // Handle File Upload for Direct Video
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('video/')) {
      toast.error('Please upload a valid video file (MP4, WebM, MOV)')
      return
    }

    if (file.size > 50 * 1024 * 1024) {
      toast.error('Video file size must be 50MB or smaller')
      return
    }

    setUploading(true)
    setError('')
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await api.upload('/upload', fd)
      const uploadedUrl = res?.url || URL.createObjectURL(file)

      const cleanTitle = file.name
        .replace(/\.[a-zA-Z0-9]+$/, '')
        .replace(/[-_]/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase())

      setResult({
        mediaType: 'video',
        videoId: 'uploaded_video',
        canonicalUrl: uploadedUrl,
        url: uploadedUrl,
        title: cleanTitle || 'Uploaded Video',
        thumbnailUrl: null,
        authorName: 'Upload',
        isUpload: true,
        fileName: file.name,
        fileSize: file.size,
      })
      toast.success('Video uploaded successfully!')
    } catch (err) {
      setError('Failed to upload video file. Please try again.')
      toast.error('Failed to upload video')
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
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
          <div
            className="h-6 w-6 rounded-full flex items-center justify-center shrink-0"
            style={{ backgroundColor: `${config.color}15`, color: config.color }}
          >
            <PlatformIcon className="h-4 w-4" />
          </div>
          <input
            id="media-url-input"
            ref={inputRef}
            type="text"
            value={url}
            onChange={handleUrlChange}
            placeholder={config.placeholder}
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
      <div className="flex-1 flex flex-col justify-center items-center py-6">
        {/* STATE A: LOADING (Fetching video metadata or uploading) */}
        {(loading || uploading) && (
          <div className="flex flex-col items-center justify-center py-10 space-y-4 animate-in fade-in duration-200">
            <div
              className="relative h-16 w-16 rounded-full flex items-center justify-center"
              style={{ backgroundColor: `${config.color}15`, color: config.color }}
            >
              <PlatformIcon className="h-8 w-8" />
              <div
                className="absolute inset-0 rounded-full border-2 border-t-transparent animate-spin"
                style={{ borderColor: config.color, borderTopColor: 'transparent' }}
              />
            </div>
            <p className="text-sm font-medium text-[#6F6F6B]">
              {uploading ? 'Uploading video file...' : 'Fetching URL information...'}
            </p>
          </div>
        )}

        {/* STATE B: RESULT (Selectable video item) */}
        {!loading && !uploading && result && (
          <div className="w-full space-y-3 self-start animate-in fade-in slide-in-from-bottom-2 duration-200">
            <h4 className="text-xs font-bold text-[#6F6F6B] uppercase tracking-wider px-1">
              Results
            </h4>

            <div
              id="media-result-card"
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
                    <div
                      className="h-full w-full flex items-center justify-center"
                      style={{ backgroundColor: `${config.color}25`, color: config.color }}
                    >
                      <PlatformIcon className="h-6 w-6" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/20 flex items-center justify-center group-hover:bg-black/10 transition-colors">
                    <div
                      className="h-5 w-5 rounded-full flex items-center justify-center shadow-xs"
                      style={{ backgroundColor: config.color }}
                    >
                      <div className="w-0 h-0 border-t-[3.5px] border-t-transparent border-b-[3.5px] border-b-transparent border-l-[6px] border-l-white ml-0.5" />
                    </div>
                  </div>
                </div>

                {/* Details */}
                <div className="min-w-0 text-left">
                  <p className="text-sm font-bold text-[#1F1F1F] leading-tight">
                    {config.title} Video
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

        {/* STATE C: EMPTY (Paste prompt with curved arrow, plus upload zone for video) */}
        {!loading && !uploading && !result && (
          <div className="flex flex-col items-center justify-center text-center max-w-sm mx-auto py-8 space-y-4">
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
                {config.emptyTitle}
              </h3>
              <p className="text-xs sm:text-[13px] text-[#6F6F6B] leading-relaxed">
                {config.emptyDesc}
              </p>
            </div>

            {/* VIDEO FILE UPLOAD OPTION (FOR VIDEO MEDIA TYPE) */}
            {mediaType === 'video' && (
              <div className="w-full pt-4 border-t border-[#E5E5E3] mt-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="video/mp4,video/webm,video/quicktime"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-full border border-[#D9D9D9] bg-white hover:bg-[#F5F5F3] text-xs font-semibold text-[#1F1F1F] transition-all cursor-pointer shadow-xs"
                >
                  <Upload className="h-4 w-4 text-[#84CC16]" />
                  <span>Or upload a video file (.mp4, max 50MB)</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
