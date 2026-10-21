'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import {
  Youtube,
  Play,
  Upload,
  RefreshCw,
  Loader2,
  Check,
  AlertCircle,
  ExternalLink,
  Image as ImageIcon,
  Sparkles,
  Zap,
} from 'lucide-react'
import { toast } from 'sonner'
import { api } from '@/lib/clientApi'
import StoreItemEditorShell from '@/components/dashboard/StoreItemEditorShell'
import { extractYouTubeId } from '@/components/dashboard/AddYouTubeModalView'

export default function YouTubeEditor({
  section,
  onBack,
  onUpdateProps,
  onSave,
  onDelete,
  onToggleHidden,
  onDuplicate,
  onOpenMobilePreview,
}) {
  const initialProps = section?.props || {}

  const [title, setTitle] = useState(initialProps.title || 'YouTube Video')
  const [url, setUrl] = useState(initialProps.url || '')
  const [thumbnail, setThumbnail] = useState(initialProps.thumbnail || '')
  const [customThumbnail, setCustomThumbnail] = useState(initialProps.customThumbnail || null)
  const [layout, setLayout] = useState(
    initialProps.layout === 'image' || initialProps.layout === 'featured' || initialProps.displayMode === 'image' || initialProps.displayMode === 'featured'
      ? 'image'
      : 'classic'
  )

  const [activeTab, setActiveTab] = useState('details')
  const [saveState, setSaveState] = useState('saved')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDirty, setIsDirty] = useState(false)
  const [uploadingThumb, setUploadingThumb] = useState(false)
  const [refreshingMeta, setRefreshingMeta] = useState(false)
  const [urlError, setUrlError] = useState('')
  const [titleError, setTitleError] = useState('')

  const fileInputRef = useRef(null)

  // Sync state if section props change externally (and not dirty)
  useEffect(() => {
    if (section?.props && !isDirty) {
      if (section.props.title !== undefined && section.props.title !== title) {
        setTitle(section.props.title)
      }
      if (section.props.url !== undefined && section.props.url !== url) {
        setUrl(section.props.url)
      }
      if (section.props.thumbnail !== undefined && section.props.thumbnail !== thumbnail) {
        setThumbnail(section.props.thumbnail)
      }
      if (section.props.customThumbnail !== undefined && section.props.customThumbnail !== customThumbnail) {
        setCustomThumbnail(section.props.customThumbnail)
      }
      const currentLayout =
        section.props.layout === 'image' || section.props.layout === 'featured' || section.props.displayMode === 'image' || section.props.displayMode === 'featured'
          ? 'image'
          : 'classic'
      if (currentLayout !== layout) {
        setLayout(currentLayout)
      }
    }
  }, [section?.props, isDirty])

  // Active thumbnail resolution (custom takes precedence over fetched)
  const videoId = extractYouTubeId(url)
  const defaultYouTubeThumb = videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : ''
  const activeThumbnail = customThumbnail || thumbnail || defaultYouTubeThumb

  // Fetch / refresh video metadata from server
  const handleRefreshMetadata = async (targetUrl = url) => {
    const trimmed = (targetUrl || '').trim()
    const extractedId = extractYouTubeId(trimmed)
    if (!extractedId) {
      setUrlError('Please enter a valid YouTube video URL')
      return
    }

    setUrlError('')
    setRefreshingMeta(true)
    try {
      const canonical = `https://www.youtube.com/watch?v=${extractedId}`
      const res = await api.get(`/media/youtube/metadata?url=${encodeURIComponent(canonical)}`)
      if (res && res.success) {
        if (res.title) setTitle(res.title)
        if (res.thumbnailUrl) setThumbnail(res.thumbnailUrl)
        setUrl(res.canonicalUrl || canonical)
        setIsDirty(true)
        toast.success('YouTube video details refreshed!')
      } else {
        const fallbackThumb = `https://img.youtube.com/vi/${extractedId}/hqdefault.jpg`
        setThumbnail(fallbackThumb)
        setUrl(canonical)
        setIsDirty(true)
      }
    } catch (err) {
      toast.error('Could not refresh YouTube details')
    } finally {
      setRefreshingMeta(false)
    }
  }

  // Handle URL change
  const handleUrlChange = (e) => {
    const val = e.target.value
    setUrl(val)
    setIsDirty(true)
    if (urlError) setUrlError('')

    const extracted = extractYouTubeId(val)
    if (extracted) {
      setUrlError('')
      // Set default fallback thumbnail immediately
      if (!customThumbnail && !thumbnail) {
        setThumbnail(`https://img.youtube.com/vi/${extracted}/hqdefault.jpg`)
      }
    }
  }

  // Custom thumbnail upload
  const handleCustomThumbnailUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload a valid image file (PNG, JPG, WebP)')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size must be 5MB or smaller')
      return
    }

    setUploadingThumb(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await api.upload('/upload', fd)
      const uploadedUrl = res?.url || URL.createObjectURL(file)
      setCustomThumbnail(uploadedUrl)
      setIsDirty(true)
      toast.success('Custom thumbnail uploaded!')
    } catch (err) {
      toast.error('Failed to upload thumbnail image')
    } finally {
      setUploadingThumb(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleRemoveCustomThumbnail = () => {
    setCustomThumbnail(null)
    setIsDirty(true)
    toast.success('Reverted to YouTube thumbnail')
  }

  // Layout change
  const handleLayoutChange = (newLayout) => {
    setLayout(newLayout)
    setIsDirty(true)
  }

  // Save changes
  const handleSave = async () => {
    const trimmedTitle = title.trim()
    if (!trimmedTitle) {
      setTitleError('Video title is required')
      toast.error('Please enter a video title')
      return
    }

    const trimmedUrl = url.trim()
    const extractedId = extractYouTubeId(trimmedUrl)
    if (!extractedId) {
      setUrlError('Please enter a valid YouTube video URL')
      toast.error('Invalid YouTube URL')
      return
    }

    const canonicalUrl = `https://www.youtube.com/watch?v=${extractedId}`
    const finalThumbnail = thumbnail || `https://img.youtube.com/vi/${extractedId}/hqdefault.jpg`

    setTitleError('')
    setUrlError('')
    setIsSubmitting(true)
    setSaveState('saving')

    const patch = {
      title: trimmedTitle,
      url: canonicalUrl,
      videoId: extractedId,
      thumbnail: finalThumbnail,
      customThumbnail: customThumbnail || null,
      layout,
      displayMode: layout === 'image' ? 'featured' : 'classic',
      mediaType: 'youtube',
      embedType: 'youtube',
    }

    try {
      if (typeof onSave === 'function') {
        await onSave(patch)
      } else if (typeof onUpdateProps === 'function') {
        onUpdateProps(patch)
      }
      setSaveState('saved')
      setIsDirty(false)
      toast.success('YouTube video saved successfully!')
    } catch (err) {
      setSaveState('dirty')
      toast.error(err?.message || 'Failed to save YouTube video')
    } finally {
      setIsSubmitting(false)
    }
  }

  const isHidden = Boolean(section?.hidden)

  return (
    <StoreItemEditorShell
      itemTypeLabel="YouTube"
      title={title.trim() || 'YouTube Video'}
      onBack={onBack}
      tabs={[
        { id: 'details', label: 'Details' },
        { id: 'display', label: 'Display' },
      ]}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      saveState={saveState}
      isHidden={isHidden}
      onToggleHidden={onToggleHidden}
      onDuplicate={onDuplicate}
      onDelete={onDelete}
      onOpenMobilePreview={onOpenMobilePreview}
    >
      {/* ========================================================================= */}
      {/* TAB 1: DETAILS                                                            */}
      {/* ========================================================================= */}
      {activeTab === 'details' && (
        <div className="space-y-7 sm:space-y-8">
          {/* VIDEO LIVE PREVIEW CARD */}
          <div className="space-y-2">
            <label className="text-base sm:text-[17px] font-bold text-[#1F1F1F]">
              Video preview
            </label>
            <div className="relative rounded-[16px] overflow-hidden border border-[#E5E5E3] bg-[#0A0A0A] shadow-xs group">
              <div className="relative aspect-video w-full overflow-hidden bg-[#1F1F1F] flex items-center justify-center">
                {activeThumbnail ? (
                  <img
                    src={activeThumbnail}
                    alt={title}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center text-[#6F6F6B] p-4 text-center">
                    <Youtube className="h-10 w-10 text-[#EF4444] mb-2" />
                    <p className="text-xs font-semibold text-white">No thumbnail available</p>
                  </div>
                )}
                {/* Play Button Badge */}
                <div className="absolute inset-0 bg-black/30 flex items-center justify-center group-hover:bg-black/20 transition-colors">
                  <div className="h-12 w-12 rounded-full bg-red-600 flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform">
                    <Play className="h-6 w-6 text-white fill-current ml-0.5" />
                  </div>
                </div>
              </div>

              {/* Card Footer Info */}
              <div className="p-3.5 bg-white border-t border-[#E5E5E3] flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-[#1F1F1F] truncate leading-tight">
                    {title || 'YouTube Video'}
                  </p>
                  <p className="text-xs text-[#6F6F6B] truncate mt-0.5 flex items-center gap-1.5">
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-red-500" />
                    <span>Watch on YouTube</span>
                  </p>
                </div>
                {url && (
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="h-8 w-8 rounded-full border border-[#D9D9D9] hover:bg-[#F5F5F3] flex items-center justify-center text-[#1F1F1F] shrink-0 transition-colors"
                    title="Open on YouTube"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* TITLE INPUT */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-base sm:text-[17px] font-bold text-[#1F1F1F]">
                Title <span className="text-[#DC2626]">*</span>
              </label>
              <span
                className={`text-xs font-mono ${
                  title.length > 120 ? 'text-[#DC2626] font-bold' : 'text-[#6F6F6B]'
                }`}
              >
                {title.length}/120
              </span>
            </div>
            <div className="relative">
              <input
                type="text"
                value={title}
                maxLength={120}
                onChange={(e) => {
                  setTitle(e.target.value)
                  setIsDirty(true)
                  if (titleError) setTitleError('')
                }}
                placeholder="e.g. My Latest Vlog, Podcast Episode, Tutorial"
                className={`w-full h-12 sm:h-[50px] px-4 rounded-[12px] bg-[#FFFFFF] border text-[15px] font-medium text-[#1F1F1F] focus:outline-none focus:ring-1 transition-all pr-10 ${
                  titleError
                    ? 'border-[#DC2626] focus:border-[#DC2626] focus:ring-[#DC2626]'
                    : 'border-[#D9D9D9] focus:border-[#1F1F1F] focus:ring-[#1F1F1F]'
                }`}
              />
              <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#999995] pointer-events-none">
                <Sparkles className="h-4 w-4" />
              </div>
            </div>
            {titleError && (
              <p className="text-xs text-[#DC2626] flex items-center gap-1 font-medium">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                {titleError}
              </p>
            )}
          </div>

          {/* YOUTUBE URL INPUT */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-base sm:text-[17px] font-bold text-[#1F1F1F]">
                YouTube URL <span className="text-[#DC2626]">*</span>
              </label>
              <button
                type="button"
                onClick={() => handleRefreshMetadata()}
                disabled={refreshingMeta || !url}
                className="text-xs font-semibold text-[#1F1F1F] hover:underline flex items-center gap-1 cursor-pointer disabled:opacity-50"
              >
                <RefreshCw
                  className={`h-3 w-3 ${refreshingMeta ? 'animate-spin' : ''}`}
                />
                <span>Refresh info</span>
              </button>
            </div>
            <div className="relative">
              <input
                type="text"
                value={url}
                onChange={handleUrlChange}
                placeholder="https://www.youtube.com/watch?v=..."
                className={`w-full h-12 sm:h-[50px] pl-11 pr-4 rounded-[12px] bg-[#FFFFFF] border text-[15px] font-medium text-[#1F1F1F] focus:outline-none focus:ring-1 transition-all ${
                  urlError
                    ? 'border-[#DC2626] focus:border-[#DC2626] focus:ring-[#DC2626]'
                    : 'border-[#D9D9D9] focus:border-[#1F1F1F] focus:ring-[#1F1F1F]'
                }`}
              />
              <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#EF4444] pointer-events-none">
                <Youtube className="h-5 w-5" />
              </div>
            </div>
            {urlError ? (
              <p className="text-xs text-[#DC2626] flex items-center gap-1 font-medium">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                {urlError}
              </p>
            ) : (
              <p className="text-xs text-[#6F6F6B]">
                Supports standard watch links, youtu.be short links, and YouTube Shorts.
              </p>
            )}
          </div>

          {/* THUMBNAIL MANAGEMENT */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-base sm:text-[17px] font-bold text-[#1F1F1F]">
                  Thumbnail
                </label>
                <p className="text-xs text-[#6F6F6B] mt-0.5">
                  {customThumbnail
                    ? 'Using custom uploaded thumbnail.'
                    : 'Using default thumbnail retrieved from YouTube.'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4 p-4 rounded-[16px] bg-[#F9F9F8] border border-[#E5E5E3]">
              {/* Thumbnail Preview Box */}
              <div className="relative h-16 w-24 rounded-[10px] overflow-hidden bg-black/10 shrink-0 border border-black/10 flex items-center justify-center">
                {activeThumbnail ? (
                  <img src={activeThumbnail} alt="" className="h-full w-full object-cover" />
                ) : (
                  <ImageIcon className="h-6 w-6 text-[#999995]" />
                )}
              </div>

              {/* Actions */}
              <div className="flex-1 flex flex-wrap items-center gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleCustomThumbnailUpload}
                  className="hidden"
                />

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingThumb}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full border border-[#D9D9D9] bg-white hover:bg-[#F5F5F3] text-xs font-semibold text-[#1F1F1F] transition-all cursor-pointer shadow-xs disabled:opacity-50"
                >
                  {uploadingThumb ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Uploading...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="h-3.5 w-3.5" />
                      <span>{customThumbnail ? 'Change custom image' : 'Upload custom thumbnail'}</span>
                    </>
                  )}
                </button>

                {customThumbnail && (
                  <button
                    type="button"
                    onClick={handleRemoveCustomThumbnail}
                    className="px-3.5 py-2 rounded-full border border-transparent text-xs font-semibold text-[#DC2626] hover:bg-[#FEF2F2] transition-colors cursor-pointer"
                  >
                    Revert to YouTube
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* VISIBILITY CONTROLS */}
          <div className="pt-2">
            <div className="flex items-center justify-between p-4 rounded-[16px] bg-[#F9F9F8] border border-[#E5E5E3]">
              <div className="space-y-0.5 pr-4">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-bold text-[#1F1F1F]">Visible on storefront</p>
                  {isHidden ? (
                    <span className="text-[11px] font-semibold text-[#DC2626] bg-[#FEF2F2] px-2 py-0.5 rounded-full border border-[#FEE2E2]">
                      Hidden
                    </span>
                  ) : (
                    <span className="text-[11px] font-semibold text-[#16A34A] bg-[#F0FDF4] px-2 py-0.5 rounded-full border border-[#DCFCE7]">
                      Live
                    </span>
                  )}
                </div>
                <p className="text-xs text-[#6F6F6B]">
                  {isHidden
                    ? 'This video is currently hidden from visitors.'
                    : 'This video is visible to everyone visiting your store.'}
                </p>
              </div>
              {onToggleHidden && (
                <button
                  type="button"
                  onClick={onToggleHidden}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer shrink-0 ${
                    !isHidden ? 'bg-[#1F1F1F]' : 'bg-[#D9D9D9]'
                  }`}
                  title={isHidden ? 'Show video' : 'Hide video'}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      !isHidden ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              )}
            </div>
          </div>

          {/* BOTTOM ACTIONS: SAVE & CANCEL */}
          <div className="pt-6 border-t border-[#E5E5E3] flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={onBack}
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-full border border-[#D9D9D9] bg-[#FFFFFF] hover:bg-[#F5F5F3] text-sm font-semibold text-[#1F1F1F] transition-all cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleSave}
              disabled={isSubmitting || (!isDirty && saveState === 'saved')}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-[#1F1F1F] hover:bg-black text-white text-sm font-semibold transition-all shadow-xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : saveState === 'saved' && !isDirty ? (
                <>
                  <Check className="h-4 w-4 text-[#16A34A]" />
                  <span>Saved</span>
                </>
              ) : (
                <span>Save changes</span>
              )}
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: DISPLAY (Classic vs Image)                                         */}
      {/* ========================================================================= */}
      {activeTab === 'display' && (
        <div className="space-y-7 sm:space-y-8">
          <div>
            <h3 className="text-base sm:text-[17px] font-bold text-[#1F1F1F]">
              Display layout
            </h3>
            <p className="text-xs sm:text-[13px] text-[#6F6F6B] mt-0.5">
              Choose how your YouTube video appears on your storefront.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* OPTION A: CLASSIC */}
            <div
              onClick={() => handleLayoutChange('classic')}
              className={`rounded-[16px] p-4 transition-all cursor-pointer flex flex-col justify-between gap-3.5 ${
                layout === 'classic'
                  ? 'border-2 border-[#1F1F1F] bg-[#FFFFFF] shadow-sm'
                  : 'border border-[#D9D9D9] bg-[#FFFFFF] hover:border-[#999995]'
              }`}
            >
              {/* Diagram for Classic */}
              <div className="h-24 w-full rounded-[12px] bg-[#F5F5F3] border border-[#E5E5E3] flex items-center justify-center px-4">
                <div className="w-full h-11 rounded-full bg-white border border-[#E5E5E3] px-3 flex items-center gap-2.5 shadow-xs">
                  <div className="h-6 w-6 rounded-full bg-red-100 flex items-center justify-center shrink-0 overflow-hidden">
                    {activeThumbnail ? (
                      <img src={activeThumbnail} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <Youtube className="h-3.5 w-3.5 text-red-600" />
                    )}
                  </div>
                  <div className="h-2.5 w-24 rounded-full bg-[#1F1F1F]/40" />
                  <div className="ml-auto h-2 w-8 rounded-full bg-[#1F1F1F]/20" />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-[#1F1F1F]">Classic</p>
                  <p className="text-xs text-[#6F6F6B]">Compact link-style pill</p>
                </div>
                <div
                  className={`h-4 w-4 rounded-full border flex items-center justify-center ${
                    layout === 'classic' ? 'border-[#1F1F1F] bg-[#1F1F1F]' : 'border-[#999995]'
                  }`}
                >
                  {layout === 'classic' && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
                </div>
              </div>
            </div>

            {/* OPTION B: IMAGE */}
            <div
              onClick={() => handleLayoutChange('image')}
              className={`rounded-[16px] p-4 transition-all cursor-pointer flex flex-col justify-between gap-3.5 ${
                layout === 'image'
                  ? 'border-2 border-[#1F1F1F] bg-[#FFFFFF] shadow-sm'
                  : 'border border-[#D9D9D9] bg-[#FFFFFF] hover:border-[#999995]'
              }`}
            >
              {/* Diagram for Image */}
              <div className="h-24 w-full rounded-[12px] bg-[#F5F5F3] border border-[#E5E5E3] flex flex-col overflow-hidden shadow-xs">
                <div className="h-14 w-full bg-[#1F1F1F] relative overflow-hidden flex items-center justify-center">
                  {activeThumbnail ? (
                    <img src={activeThumbnail} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <Youtube className="h-5 w-5 text-red-500" />
                  )}
                  <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                    <div className="h-4 w-4 rounded-full bg-red-600 flex items-center justify-center shadow-xs">
                      <Play className="h-2 w-2 text-white fill-current ml-0.5" />
                    </div>
                  </div>
                </div>
                <div className="h-10 w-full bg-white px-3 flex items-center">
                  <div className="h-2.5 w-20 rounded-full bg-[#1F1F1F]/40" />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-[#1F1F1F]">Image</p>
                  <p className="text-xs text-[#6F6F6B]">Prominent video thumbnail card</p>
                </div>
                <div
                  className={`h-4 w-4 rounded-full border flex items-center justify-center ${
                    layout === 'image' ? 'border-[#1F1F1F] bg-[#1F1F1F]' : 'border-[#999995]'
                  }`}
                >
                  {layout === 'image' && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
                </div>
              </div>
            </div>
          </div>

          {/* BOTTOM ACTIONS: SAVE & CANCEL */}
          <div className="pt-6 border-t border-[#E5E5E3] flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={onBack}
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-full border border-[#D9D9D9] bg-[#FFFFFF] hover:bg-[#F5F5F3] text-sm font-semibold text-[#1F1F1F] transition-all cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleSave}
              disabled={isSubmitting || (!isDirty && saveState === 'saved')}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-[#1F1F1F] hover:bg-black text-white text-sm font-semibold transition-all shadow-xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : saveState === 'saved' && !isDirty ? (
                <>
                  <Check className="h-4 w-4 text-[#16A34A]" />
                  <span>Saved</span>
                </>
              ) : (
                <span>Save changes</span>
              )}
            </button>
          </div>
        </div>
      )}
    </StoreItemEditorShell>
  )
}
