'use client'

import React, { useState, useEffect, useRef } from 'react'
import {
  Youtube,
  Music2,
  PlayCircle,
  Play,
  Video,
  Upload,
  RefreshCw,
  Loader2,
  Check,
  AlertCircle,
  ExternalLink,
  Image as ImageIcon,
  Sparkles,
  FileVideo,
} from 'lucide-react'
import { toast } from 'sonner'
import { api } from '@/lib/clientApi'
import StoreItemEditorShell from '@/components/dashboard/StoreItemEditorShell'
import {
  MEDIA_PLATFORMS,
  extractYouTubeId,
  extractTikTokId,
  extractVimeoId,
  extractDirectVideo,
  VALID_HOSTS,
  getHostname,
} from '@/lib/mediaUtils'

export default function MediaContentEditor({
  section,
  mediaType: propMediaType,
  onBack,
  onUpdateProps,
  onSave,
  onDelete,
  onToggleHidden,
  onDuplicate,
  onOpenMobilePreview,
}) {
  const initialProps = section?.props || {}
  const rawType = propMediaType || section?.type || initialProps.mediaType || 'video'
  const mediaType = ['youtube', 'tiktok', 'vimeo', 'video'].includes(rawType) ? rawType : 'video'
  const config = MEDIA_PLATFORMS[mediaType] || MEDIA_PLATFORMS.video

  const [title, setTitle] = useState(initialProps.title || `${config.title} Video`)
  const [url, setUrl] = useState(initialProps.url || '')
  const [thumbnail, setThumbnail] = useState(initialProps.thumbnail || '')
  const [customThumbnail, setCustomThumbnail] = useState(initialProps.customThumbnail || null)
  const [isUpload, setIsUpload] = useState(Boolean(initialProps.isUpload))
  const [fileName, setFileName] = useState(initialProps.fileName || '')
  const [fileSize, setFileSize] = useState(initialProps.fileSize || null)

  const [layout, setLayout] = useState(
    initialProps.layout === 'image' ||
      initialProps.layout === 'featured' ||
      initialProps.displayMode === 'image' ||
      initialProps.displayMode === 'featured'
      ? 'image'
      : 'classic'
  )

  const [activeTab, setActiveTab] = useState('details')
  const [saveState, setSaveState] = useState('saved')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDirty, setIsDirty] = useState(false)
  const [uploadingThumb, setUploadingThumb] = useState(false)
  const [uploadingVideo, setUploadingVideo] = useState(false)
  const [refreshingMeta, setRefreshingMeta] = useState(false)
  const [urlError, setUrlError] = useState('')
  const [titleError, setTitleError] = useState('')

  const fileInputRef = useRef(null)
  const videoFileInputRef = useRef(null)

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
      if (section.props.isUpload !== undefined) {
        setIsUpload(Boolean(section.props.isUpload))
      }
      if (section.props.fileName) {
        setFileName(section.props.fileName)
      }
      const currentLayout =
        section.props.layout === 'image' ||
        section.props.layout === 'featured' ||
        section.props.displayMode === 'image' ||
        section.props.displayMode === 'featured'
          ? 'image'
          : 'classic'
      if (currentLayout !== layout) {
        setLayout(currentLayout)
      }
    }
  }, [section?.props, isDirty])

  // Active thumbnail resolution (custom takes precedence over fetched)
  const fallbackThumb =
    mediaType === 'youtube' && extractYouTubeId(url)
      ? `https://img.youtube.com/vi/${extractYouTubeId(url)}/hqdefault.jpg`
      : null

  const activeThumbnail = customThumbnail || thumbnail || fallbackThumb

  // Platform icon resolution
  const PlatformIcon =
    mediaType === 'youtube'
      ? Youtube
      : mediaType === 'tiktok'
        ? Music2
        : mediaType === 'vimeo'
          ? PlayCircle
          : Play

  // Fetch / refresh video metadata from server
  const handleRefreshMetadata = async (targetUrl = url) => {
    const trimmed = (targetUrl || '').trim()
    if (!trimmed) {
      setUrlError('Please enter a video URL')
      return
    }

    setUrlError('')
    setRefreshingMeta(true)
    try {
      const res = await api.get(`${config.apiRoute}?url=${encodeURIComponent(trimmed)}`)
      if (res && res.success) {
        if (res.title) setTitle(res.title)
        if (res.thumbnailUrl) setThumbnail(res.thumbnailUrl)
        if (res.canonicalUrl) setUrl(res.canonicalUrl)
        setIsDirty(true)
        toast.success(`${config.name} details refreshed!`)
      } else {
        toast.error(`Could not refresh ${config.name} details`)
      }
    } catch (err) {
      toast.error(`Could not refresh ${config.name} details`)
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
    toast.success('Reverted to source thumbnail')
  }

  // Replace video file upload (for Video type)
  const handleReplaceVideoUpload = async (e) => {
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

    setUploadingVideo(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await api.upload('/upload', fd)
      const uploadedUrl = res?.url || URL.createObjectURL(file)
      setUrl(uploadedUrl)
      setIsUpload(true)
      setFileName(file.name)
      setFileSize(file.size)
      setIsDirty(true)
      toast.success('Video file uploaded!')
    } catch (err) {
      toast.error('Failed to upload video file')
    } finally {
      setUploadingVideo(false)
      if (videoFileInputRef.current) videoFileInputRef.current.value = ''
    }
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
    if (!trimmedUrl) {
      setUrlError('Video URL is required')
      toast.error('Please enter a video URL')
      return
    }

    setTitleError('')
    setUrlError('')
    setIsSubmitting(true)
    setSaveState('saving')

    let videoId = null
    if (mediaType === 'youtube') {
      videoId = extractYouTubeId(trimmedUrl)
    } else if (mediaType === 'tiktok') {
      videoId = extractTikTokId(trimmedUrl)
    } else if (mediaType === 'vimeo') {
      videoId = extractVimeoId(trimmedUrl)
    }

    const patch = {
      title: trimmedTitle,
      url: trimmedUrl,
      videoId: videoId || section?.props?.videoId || null,
      thumbnail: thumbnail || null,
      customThumbnail: customThumbnail || null,
      layout,
      displayMode: layout === 'image' ? 'featured' : 'classic',
      mediaType,
      embedType: mediaType,
      isUpload: Boolean(isUpload),
      fileName: fileName || null,
      fileSize: fileSize || null,
    }

    try {
      if (typeof onSave === 'function') {
        await onSave(patch)
      } else if (typeof onUpdateProps === 'function') {
        onUpdateProps(patch)
      }
      setSaveState('saved')
      setIsDirty(false)
      toast.success(`${config.name} saved successfully!`)
    } catch (err) {
      setSaveState('dirty')
      toast.error(err?.message || `Failed to save ${config.name}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  const isHidden = Boolean(section?.hidden)

  return (
    <StoreItemEditorShell
      itemTypeLabel={config.name}
      title={title.trim() || `${config.name} Video`}
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
                    <PlatformIcon
                      className="h-10 w-10 mb-2"
                      style={{ color: config.color }}
                    />
                    <p className="text-xs font-semibold text-white">No thumbnail available</p>
                  </div>
                )}
                {/* Play Button Badge */}
                <div className="absolute inset-0 bg-black/30 flex items-center justify-center group-hover:bg-black/20 transition-colors">
                  <div
                    className="h-12 w-12 rounded-full flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform"
                    style={{ backgroundColor: config.color }}
                  >
                    <Play className="h-6 w-6 text-white fill-current ml-0.5" />
                  </div>
                </div>
              </div>

              {/* Card Footer Info */}
              <div className="p-3.5 bg-white border-t border-[#E5E5E3] flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-[#1F1F1F] truncate leading-tight">
                    {title || `${config.title} Video`}
                  </p>
                  <p className="text-xs text-[#6F6F6B] truncate mt-0.5 flex items-center gap-1.5">
                    <span
                      className="inline-block h-1.5 w-1.5 rounded-full"
                      style={{ backgroundColor: config.color }}
                    />
                    <span>Watch on {config.name}</span>
                  </p>
                </div>
                {url && (
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="h-8 w-8 rounded-full border border-[#D9D9D9] hover:bg-[#F5F5F3] flex items-center justify-center text-[#1F1F1F] shrink-0 transition-colors"
                    title={`Open on ${config.name}`}
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
                id="media-title-input"
                type="text"
                value={title}
                maxLength={120}
                onChange={(e) => {
                  setTitle(e.target.value)
                  setIsDirty(true)
                  if (titleError) setTitleError('')
                }}
                placeholder="e.g. My Latest Video, Tutorial, or Clip"
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

          {/* URL / SOURCE INPUT */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-base sm:text-[17px] font-bold text-[#1F1F1F]">
                {isUpload ? 'Video File' : `${config.title} URL`} <span className="text-[#DC2626]">*</span>
              </label>
              {!isUpload && (
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
              )}
            </div>

            {isUpload ? (
              <div className="flex items-center justify-between p-3.5 rounded-[12px] bg-[#F9F9F8] border border-[#E5E5E3]">
                <div className="flex items-center gap-2.5 min-w-0">
                  <FileVideo className="h-5 w-5 text-[#84CC16] shrink-0" />
                  <span className="text-sm font-medium text-[#1F1F1F] truncate">
                    {fileName || 'Uploaded video file'}
                  </span>
                </div>
                <input
                  ref={videoFileInputRef}
                  type="file"
                  accept="video/mp4,video/webm,video/quicktime"
                  onChange={handleReplaceVideoUpload}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => videoFileInputRef.current?.click()}
                  disabled={uploadingVideo}
                  className="text-xs font-semibold text-[#1F1F1F] hover:underline shrink-0"
                >
                  {uploadingVideo ? 'Uploading...' : 'Replace file'}
                </button>
              </div>
            ) : (
              <div className="relative">
                <input
                  type="text"
                  value={url}
                  onChange={handleUrlChange}
                  placeholder={config.placeholder}
                  className={`w-full h-12 sm:h-[50px] pl-11 pr-4 rounded-[12px] bg-[#FFFFFF] border text-[15px] font-medium text-[#1F1F1F] focus:outline-none focus:ring-1 transition-all ${
                    urlError
                      ? 'border-[#DC2626] focus:border-[#DC2626] focus:ring-[#DC2626]'
                      : 'border-[#D9D9D9] focus:border-[#1F1F1F] focus:ring-[#1F1F1F]'
                  }`}
                />
                <div
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                  style={{ color: config.color }}
                >
                  <PlatformIcon className="h-5 w-5" />
                </div>
              </div>
            )}

            {urlError && (
              <p className="text-xs text-[#DC2626] flex items-center gap-1 font-medium">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                {urlError}
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
                    : thumbnail
                      ? `Using default thumbnail retrieved from ${config.name}.`
                      : 'No default thumbnail. You can upload a custom thumbnail below.'}
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
                  id="media-custom-thumbnail-btn"
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
                    className="inline-flex items-center gap-1 px-3 py-2 rounded-full text-xs font-semibold text-[#DC2626] hover:bg-[#FEF2F2] transition-colors cursor-pointer"
                  >
                    <span>Revert to source thumbnail</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* ACTION BUTTONS (SAVE / CANCEL) */}
          <div className="pt-4 border-t border-[#E5E5E3] flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onBack}
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-full border border-[#D9D9D9] bg-white hover:bg-[#F5F5F3] text-sm font-semibold text-[#1F1F1F] transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSubmitting}
              className="px-6 py-2.5 rounded-full bg-[#1F1F1F] hover:bg-black text-white text-sm font-semibold transition-all cursor-pointer shadow-xs inline-flex items-center gap-2 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <span>Save Changes</span>
              )}
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: DISPLAY (Classic vs Image)                                         */}
      {/* ========================================================================= */}
      {activeTab === 'display' && (
        <div className="space-y-6">
          <div>
            <label className="text-base sm:text-[17px] font-bold text-[#1F1F1F]">
              Display layout
            </label>
            <p className="text-xs sm:text-[13px] text-[#6F6F6B] mt-0.5">
              Choose how this video is presented on your public storefront.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* OPTION 1: CLASSIC */}
            <div
              id="media-layout-classic-btn"
              onClick={() => handleLayoutChange('classic')}
              className={`p-4 rounded-[18px] border-2 transition-all cursor-pointer flex flex-col justify-between gap-4 ${
                layout === 'classic'
                  ? 'border-[#1F1F1F] bg-[#FFFFFF] shadow-md'
                  : 'border-[#E5E5E3] bg-[#F9F9F8] hover:border-[#999995]'
              }`}
            >
              {/* Graphic Mockup */}
              <div className="h-28 rounded-[12px] bg-[#EFEFEF] p-3 flex items-center justify-center">
                <div className="w-full bg-white rounded-[10px] p-2.5 shadow-xs flex items-center gap-2.5 border border-[#E5E5E3]">
                  <div
                    className="h-7 w-7 rounded-[6px] flex items-center justify-center shrink-0"
                    style={{ backgroundColor: `${config.color}20`, color: config.color }}
                  >
                    <PlatformIcon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="h-2 w-3/4 bg-[#1F1F1F] rounded-full" />
                    <div className="h-1.5 w-1/3 bg-[#999995] rounded-full" />
                  </div>
                </div>
              </div>

              {/* Title & Radio */}
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-[#1F1F1F]">Classic</h4>
                  <p className="text-xs text-[#6F6F6B]">Compact link pill with small thumbnail</p>
                </div>
                <div
                  className={`h-5 w-5 rounded-full border flex items-center justify-center ${
                    layout === 'classic'
                      ? 'border-[#1F1F1F] bg-[#1F1F1F] text-white'
                      : 'border-[#D9D9D9] bg-white'
                  }`}
                >
                  {layout === 'classic' && <Check className="h-3 w-3" />}
                </div>
              </div>
            </div>

            {/* OPTION 2: IMAGE */}
            <div
              id="media-layout-image-btn"
              onClick={() => handleLayoutChange('image')}
              className={`p-4 rounded-[18px] border-2 transition-all cursor-pointer flex flex-col justify-between gap-4 ${
                layout === 'image'
                  ? 'border-[#1F1F1F] bg-[#FFFFFF] shadow-md'
                  : 'border-[#E5E5E3] bg-[#F9F9F8] hover:border-[#999995]'
              }`}
            >
              {/* Graphic Mockup */}
              <div className="h-28 rounded-[12px] bg-[#EFEFEF] p-2 flex items-center justify-center">
                <div className="w-full h-full bg-white rounded-[10px] overflow-hidden shadow-xs flex flex-col border border-[#E5E5E3]">
                  <div className="flex-1 bg-[#1F1F1F] flex items-center justify-center relative">
                    <div
                      className="h-5 w-5 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: config.color }}
                    >
                      <Play className="h-2.5 w-2.5 text-white fill-current ml-0.5" />
                    </div>
                  </div>
                  <div className="p-1.5 bg-white">
                    <div className="h-2 w-3/4 bg-[#1F1F1F] rounded-full mb-1" />
                  </div>
                </div>
              </div>

              {/* Title & Radio */}
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-[#1F1F1F]">Image</h4>
                  <p className="text-xs text-[#6F6F6B]">Visual 16:9 thumbnail showcase card</p>
                </div>
                <div
                  className={`h-5 w-5 rounded-full border flex items-center justify-center ${
                    layout === 'image'
                      ? 'border-[#1F1F1F] bg-[#1F1F1F] text-white'
                      : 'border-[#D9D9D9] bg-white'
                  }`}
                >
                  {layout === 'image' && <Check className="h-3 w-3" />}
                </div>
              </div>
            </div>
          </div>

          {/* ACTION BUTTONS (SAVE / CANCEL) */}
          <div className="pt-4 border-t border-[#E5E5E3] flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onBack}
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-full border border-[#D9D9D9] bg-white hover:bg-[#F5F5F3] text-sm font-semibold text-[#1F1F1F] transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSubmitting}
              className="px-6 py-2.5 rounded-full bg-[#1F1F1F] hover:bg-black text-white text-sm font-semibold transition-all cursor-pointer shadow-xs inline-flex items-center gap-2 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <span>Save Changes</span>
              )}
            </button>
          </div>
        </div>
      )}
    </StoreItemEditorShell>
  )
}
