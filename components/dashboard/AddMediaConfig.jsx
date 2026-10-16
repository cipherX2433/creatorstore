'use client'

import { useState, useRef } from 'react'
import {
  Play, Video, Images, Headphones, FileText, Upload,
  X, Trash2, GripVertical, CheckCircle2, AlertCircle,
  Loader2, Music, ExternalLink, Sparkles
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ModalFooterActions } from '@/components/ui/base-modal'
import { IconBadge, ICON_BADGE_COLORS } from '@/components/ui/icon-badge'
import { toast } from 'sonner'
import { api } from '@/lib/clientApi'

const MAX_PDF_SIZE_BYTES = 25 * 1024 * 1024 // 25 MB

export function extractVideoEmbed(url) {
  if (!url || typeof url !== 'string') return null
  const trimmed = url.trim()

  // YouTube match: youtube.com/watch?v=ID or youtu.be/ID or youtube.com/embed/ID or shorts
  const ytMatch = trimmed.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([\w-]{11})/)
  if (ytMatch && ytMatch[1]) {
    return {
      type: 'youtube',
      embedUrl: `https://www.youtube-nocookie.com/embed/${ytMatch[1]}`,
      thumbnail: `https://img.youtube.com/vi/${ytMatch[1]}/hqdefault.jpg`,
    }
  }

  // Vimeo match
  const vimeoMatch = trimmed.match(/(?:vimeo\.com\/(?:channels\/(?:\w+\/)?|groups\/(?:[^\/]*)\/videos\/|video\/|album\/(?:\d+)\/video\/|))(\d+)/)
  if (vimeoMatch && vimeoMatch[1]) {
    return {
      type: 'vimeo',
      embedUrl: `https://player.vimeo.com/video/${vimeoMatch[1]}`,
      thumbnail: null,
    }
  }

  // Loom match
  const loomMatch = trimmed.match(/loom\.com\/(?:share|embed)\/([a-zA-Z0-9]+)/)
  if (loomMatch && loomMatch[1]) {
    return {
      type: 'loom',
      embedUrl: `https://www.loom.com/embed/${loomMatch[1]}`,
      thumbnail: null,
    }
  }

  // Direct video file (.mp4, .webm, .mov)
  if (/\.(mp4|webm|mov)(\?.*)?$/i.test(trimmed)) {
    return {
      type: 'direct',
      videoUrl: trimmed,
      thumbnail: null,
    }
  }

  return {
    type: 'generic',
    url: trimmed,
    thumbnail: null,
  }
}

export function extractAudioEmbed(url) {
  if (!url || typeof url !== 'string') return null
  const trimmed = url.trim()

  // Spotify track / episode / playlist
  const spotifyMatch = trimmed.match(/spotify\.com\/(track|episode|playlist|album)\/([a-zA-Z0-9]+)/)
  if (spotifyMatch) {
    return {
      type: 'spotify',
      embedUrl: `https://open.spotify.com/embed/${spotifyMatch[1]}/${spotifyMatch[2]}`,
    }
  }

  // SoundCloud
  if (trimmed.includes('soundcloud.com')) {
    return {
      type: 'soundcloud',
      url: trimmed,
    }
  }

  // Direct Audio file (.mp3, .wav, .m4a, .aac, .ogg)
  if (/\.(mp3|wav|m4a|aac|ogg)(\?.*)?$/i.test(trimmed)) {
    return {
      type: 'direct',
      audioUrl: trimmed,
    }
  }

  return {
    type: 'generic',
    url: trimmed,
  }
}

export default function AddMediaConfig({
  mediaType = 'video', // 'video' | 'youtube' | 'gallery' | 'audio' | 'pdf'
  initialProps = null,
  onSubmit,
  onCancel,
  isEditing = false,
}) {
  // Common states
  const [title, setTitle] = useState(initialProps?.title || '')
  const [caption, setCaption] = useState(initialProps?.caption || '')
  const [url, setUrl] = useState(initialProps?.url || '')
  
  // Gallery states
  const [images, setImages] = useState(initialProps?.images || [])
  const [uploadingImage, setUploadingImage] = useState(false)
  const imageInputRef = useRef(null)

  // PDF states
  const [pdfFile, setPdfFile] = useState(initialProps?.fileName ? { name: initialProps.fileName, size: initialProps.fileSize, url: initialProps.url } : null)
  const [pdfError, setPdfError] = useState('')
  const [uploadingPdf, setUploadingPdf] = useState(false)
  const pdfInputRef = useRef(null)

  // Handlers for Gallery Images
  async function handleImageFiles(files) {
    if (!files || !files.length) return
    setUploadingImage(true)
    try {
      const newImages = [...images]
      for (const file of Array.from(files)) {
        if (!file.type.startsWith('image/')) continue
        const fd = new FormData()
        fd.append('file', file)
        try {
          const res = await api.upload('/upload', fd)
          if (res?.url) {
            newImages.push({ id: Math.random().toString(36).substring(2, 9), url: res.url, name: file.name })
          }
        } catch {
          // Fallback to local object URL if offline/dev upload fails
          const localUrl = URL.createObjectURL(file)
          newImages.push({ id: Math.random().toString(36).substring(2, 9), url: localUrl, name: file.name })
        }
      }
      setImages(newImages)
      toast.success(`${files.length} image(s) added`)
    } catch (err) {
      toast.error('Image upload failed')
    } finally {
      setUploadingImage(false)
    }
  }

  function removeImage(indexToRemove) {
    setImages(images.filter((_, idx) => idx !== indexToRemove))
  }

  function moveImage(fromIdx, toIdx) {
    if (toIdx < 0 || toIdx >= images.length) return
    const updated = [...images]
    const [moved] = updated.splice(fromIdx, 1)
    updated.splice(toIdx, 0, moved)
    setImages(updated)
  }

  // Handlers for PDF Upload
  async function handlePdfFile(file) {
    if (!file) return
    setPdfError('')

    // Validate type
    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
    if (!isPdf) {
      setPdfError('Please select a valid PDF document (.pdf)')
      return
    }

    // Validate size (25MB limit)
    if (file.size > MAX_PDF_SIZE_BYTES) {
      setPdfError(`File exceeds maximum size of 25MB (${(file.size / (1024 * 1024)).toFixed(1)}MB)`)
      return
    }

    setUploadingPdf(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      let fileUrl = ''
      try {
        const res = await api.upload('/upload', fd)
        fileUrl = res?.url || ''
      } catch {
        fileUrl = URL.createObjectURL(file)
      }

      const formattedSize = file.size > 1024 * 1024
        ? `${(file.size / (1024 * 1024)).toFixed(1)} MB`
        : `${Math.round(file.size / 1024)} KB`

      setPdfFile({
        name: file.name,
        size: formattedSize,
        url: fileUrl,
      })
      if (!title) {
        setTitle(file.name.replace(/\.pdf$/i, ''))
      }
      toast.success('PDF document attached!')
    } catch (err) {
      setPdfError('Failed to upload PDF. Please try again.')
    } finally {
      setUploadingPdf(false)
    }
  }

  function handleSubmit(e) {
    e.preventDefault()

    if (mediaType === 'video' || mediaType === 'youtube') {
      if (!url.trim()) {
        toast.error('Please enter a video URL')
        return
      }
      const parsed = extractVideoEmbed(url)
      onSubmit({
        mediaType,
        url: url.trim(),
        title: title.trim() || (mediaType === 'youtube' ? 'YouTube Video' : 'Featured Video'),
        caption: caption.trim(),
        embedType: parsed.type,
        embedUrl: parsed.embedUrl || null,
        thumbnail: parsed.thumbnail || null,
      })
    } else if (mediaType === 'gallery') {
      if (!images.length) {
        toast.error('Please upload at least one image for the gallery')
        return
      }
      onSubmit({
        mediaType: 'gallery',
        title: title.trim() || 'Image Gallery',
        caption: caption.trim(),
        images,
      })
    } else if (mediaType === 'audio') {
      if (!url.trim()) {
        toast.error('Please enter an audio or podcast URL')
        return
      }
      const parsed = extractAudioEmbed(url)
      onSubmit({
        mediaType: 'audio',
        url: url.trim(),
        title: title.trim() || 'Audio Track',
        caption: caption.trim(),
        embedType: parsed.type,
        embedUrl: parsed.embedUrl || null,
      })
    } else if (mediaType === 'pdf') {
      if (!pdfFile?.url) {
        toast.error('Please upload a PDF document')
        return
      }
      onSubmit({
        mediaType: 'pdf',
        url: pdfFile.url,
        fileName: pdfFile.name,
        fileSize: pdfFile.size,
        title: title.trim() || pdfFile.name.replace(/\.pdf$/i, ''),
        caption: caption.trim(),
      })
    }
  }

  // Previews
  const videoPreview = (mediaType === 'video' || mediaType === 'youtube') && url.trim() ? extractVideoEmbed(url) : null
  const audioPreview = mediaType === 'audio' && url.trim() ? extractAudioEmbed(url) : null

  return (
    <form onSubmit={handleSubmit} className="space-y-5 py-2">
      {/* Header Info Box */}
      <div className="flex items-center gap-3 p-3.5 rounded-[24px] bg-[#1A1A1A] border border-[#2E2E2E]">
        <IconBadge
          color={
            mediaType === 'video' ? ICON_BADGE_COLORS.video
              : mediaType === 'youtube' ? ICON_BADGE_COLORS.youtube
                : mediaType === 'gallery' ? ICON_BADGE_COLORS.gallery
                  : mediaType === 'audio' ? ICON_BADGE_COLORS.audio
                    : ICON_BADGE_COLORS.pdf
          }
        >
          {mediaType === 'video' && <Play className="h-5 w-5 fill-current" />}
          {mediaType === 'youtube' && <Video className="h-5 w-5" />}
          {mediaType === 'gallery' && <Images className="h-5 w-5" />}
          {mediaType === 'audio' && <Headphones className="h-5 w-5" />}
          {mediaType === 'pdf' && <FileText className="h-5 w-5" />}
        </IconBadge>
        <div className="min-w-0 flex-1">
          <p className="text-card-title text-content-primary font-bold capitalize">
            {mediaType === 'video' ? 'Video Block' : mediaType === 'youtube' ? 'YouTube Video' : mediaType === 'gallery' ? 'Image Gallery' : mediaType === 'audio' ? 'Audio Player' : 'PDF Document'}
          </p>
          <p className="text-meta text-content-muted truncate">
            {mediaType === 'video' && 'Embed video from YouTube, Vimeo, Loom, or direct link'}
            {mediaType === 'youtube' && 'Add your YouTube channel or video link'}
            {mediaType === 'gallery' && 'Add and reorder multiple portfolio or showcase images'}
            {mediaType === 'audio' && 'Embed audio from Spotify, SoundCloud, or direct file'}
            {mediaType === 'pdf' && 'Upload a downloadable or viewable PDF document'}
          </p>
        </div>
      </div>

      {/* VIDEO / YOUTUBE CONFIG */}
      {(mediaType === 'video' || mediaType === 'youtube') && (
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-meta font-bold text-content-primary uppercase tracking-wider">
              Video URL <span className="text-brand">*</span>
            </Label>
            <Input
              placeholder={mediaType === 'youtube' ? 'https://www.youtube.com/watch?v=...' : 'https://youtube.com/..., vimeo.com/..., or .mp4 link'}
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="bg-surface-card border-edge text-content-primary text-body rounded-control focus:border-edge-focus"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-meta font-bold text-content-primary uppercase tracking-wider">
              Title (Optional)
            </Label>
            <Input
              placeholder="e.g. My Latest Course Preview"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="bg-surface-card border-edge text-content-primary text-body rounded-control focus:border-edge-focus"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-meta font-bold text-content-primary uppercase tracking-wider">
              Caption / Description (Optional)
            </Label>
            <Textarea
              rows={2}
              placeholder="Short description of this video..."
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              className="bg-surface-card border-edge text-content-primary text-body rounded-control focus:border-edge-focus resize-none"
            />
          </div>

          {/* Live Video Preview */}
          {videoPreview && (
            <div className="space-y-1.5">
              <Label className="text-meta font-bold text-content-muted uppercase tracking-wider">
                Live Video Preview
              </Label>
              <div className="rounded-card overflow-hidden border border-edge bg-black aspect-video max-h-56 relative flex items-center justify-center">
                {videoPreview.embedUrl ? (
                  <iframe
                    src={videoPreview.embedUrl}
                    title="Video Preview"
                    className="w-full h-full border-0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                ) : videoPreview.type === 'direct' ? (
                  <video src={videoPreview.videoUrl} controls className="w-full h-full object-contain" />
                ) : (
                  <div className="text-center p-4 space-y-1">
                    <Play className="h-8 w-8 text-blue-400 mx-auto" />
                    <p className="text-xs text-content-muted truncate max-w-xs">{url}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* IMAGE GALLERY CONFIG */}
      {mediaType === 'gallery' && (
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-meta font-bold text-content-primary uppercase tracking-wider">
              Gallery Title (Optional)
            </Label>
            <Input
              placeholder="e.g. Photography Portfolio"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="bg-surface-card border-edge text-content-primary text-body rounded-control focus:border-edge-focus"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-meta font-bold text-content-primary uppercase tracking-wider">
              Caption (Optional)
            </Label>
            <Input
              placeholder="Short subtitle or description..."
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              className="bg-surface-card border-edge text-content-primary text-body rounded-control focus:border-edge-focus"
            />
          </div>

          {/* Upload Dropzone */}
          <div className="space-y-2">
            <Label className="text-meta font-bold text-content-primary uppercase tracking-wider">
              Images ({images.length}) <span className="text-brand">*</span>
            </Label>

            <div
              onClick={() => imageInputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault()
                handleImageFiles(e.dataTransfer.files)
              }}
              className="border-2 border-dashed border-edge hover:border-brand rounded-card p-6 text-center cursor-pointer bg-surface-card hover:bg-surface-hover transition-colors"
            >
              <input
                ref={imageInputRef}
                type="file"
                multiple
                accept="image/*"
                onChange={(e) => handleImageFiles(e.target.files)}
                className="hidden"
              />
              {uploadingImage ? (
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="h-6 w-6 animate-spin text-brand" />
                  <p className="text-meta text-content-muted font-medium">Uploading images...</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <IconBadge color={ICON_BADGE_COLORS.gallery}>
                    <Upload className="h-5 w-5" />
                  </IconBadge>
                  <div>
                    <p className="text-card-title text-content-primary font-bold">Click or drag images to upload</p>
                    <p className="text-meta text-content-muted">Supports PNG, JPG, WEBP, GIF (Upload multiple)</p>
                  </div>
                </div>
              )}
            </div>

            {/* Uploaded Images List with Reorder and Delete */}
            {images.length > 0 && (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5 pt-2 max-h-56 overflow-y-auto no-scrollbar">
                {images.map((img, idx) => (
                  <div
                    key={img.id || idx}
                    className="relative group rounded-control overflow-hidden border border-edge bg-surface-card aspect-square"
                  >
                    <img src={img.url} alt="" className="w-full h-full object-cover" />
                    
                    {/* Overlay controls */}
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                      {idx > 0 && (
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); moveImage(idx, idx - 1) }}
                          className="p-1 rounded bg-surface-overlay text-white hover:bg-white/20 text-micro"
                          title="Move left"
                        >
                          ←
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); removeImage(idx) }}
                        className="p-1.5 rounded-full bg-red-600/80 hover:bg-red-600 text-white"
                        title="Remove image"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                      {idx < images.length - 1 && (
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); moveImage(idx, idx + 1) }}
                          className="p-1 rounded bg-surface-overlay text-white hover:bg-white/20 text-micro"
                          title="Move right"
                        >
                          →
                        </button>
                      )}
                    </div>
                    <span className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded bg-black/70 text-[9px] font-bold text-white">
                      #{idx + 1}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* AUDIO CONFIG */}
      {mediaType === 'audio' && (
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-meta font-bold text-content-primary uppercase tracking-wider">
              Audio / Podcast URL <span className="text-brand">*</span>
            </Label>
            <Input
              placeholder="Spotify link, SoundCloud URL, or direct audio link (.mp3)..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="bg-surface-card border-edge text-content-primary text-body rounded-control focus:border-edge-focus"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-meta font-bold text-content-primary uppercase tracking-wider">
              Track / Episode Title (Optional)
            </Label>
            <Input
              placeholder="e.g. Episode 42: Building Creator Businesses"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="bg-surface-card border-edge text-content-primary text-body rounded-control focus:border-edge-focus"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-meta font-bold text-content-primary uppercase tracking-wider">
              Caption / Description (Optional)
            </Label>
            <Textarea
              rows={2}
              placeholder="Listen to the full episode on your favorite player..."
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              className="bg-surface-card border-edge text-content-primary text-body rounded-control focus:border-edge-focus resize-none"
            />
          </div>

          {/* Audio Live Preview */}
          {audioPreview && (
            <div className="space-y-1.5">
              <Label className="text-meta font-bold text-content-muted uppercase tracking-wider">
                Live Audio Preview
              </Label>
              <div className="p-3.5 rounded-card bg-surface-card border border-edge flex items-center gap-3">
                <IconBadge color={ICON_BADGE_COLORS.audio}>
                  <Music className="h-5 w-5" />
                </IconBadge>
                <div className="min-w-0 flex-1">
                  {audioPreview.type === 'spotify' && (
                    <iframe
                      src={audioPreview.embedUrl}
                      width="100%"
                      height="80"
                      frameBorder="0"
                      allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                      loading="lazy"
                      className="rounded-lg"
                    />
                  )}
                  {audioPreview.type === 'direct' && (
                    <audio src={audioPreview.audioUrl} controls className="w-full h-8" />
                  )}
                  {audioPreview.type === 'generic' || audioPreview.type === 'soundcloud' ? (
                    <div className="space-y-0.5">
                      <p className="text-xs font-bold text-content-primary truncate">{title || 'Audio Link'}</p>
                      <p className="text-[11px] text-content-muted truncate">{url}</p>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* PDF DISPLAY CONFIG */}
      {mediaType === 'pdf' && (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-meta font-bold text-content-primary uppercase tracking-wider">
              Upload PDF File <span className="text-brand">*</span>
            </Label>

            <div
              onClick={() => pdfInputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault()
                const file = e.dataTransfer.files?.[0]
                if (file) handlePdfFile(file)
              }}
              className={`border-2 border-dashed rounded-card p-6 text-center cursor-pointer transition-colors ${
                pdfError ? 'border-red-500 bg-red-950/20' : 'border-edge hover:border-brand bg-surface-card hover:bg-surface-hover'
              }`}
            >
              <input
                ref={pdfInputRef}
                type="file"
                accept=".pdf,application/pdf"
                onChange={(e) => handlePdfFile(e.target.files?.[0])}
                className="hidden"
              />
              {uploadingPdf ? (
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="h-6 w-6 animate-spin text-brand" />
                  <p className="text-meta text-content-muted font-medium">Uploading document...</p>
                </div>
              ) : pdfFile ? (
                <div className="flex items-center justify-between gap-3 text-left">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <IconBadge color={ICON_BADGE_COLORS.pdf}>
                      <FileText className="h-5 w-5" />
                    </IconBadge>
                    <div className="min-w-0 flex-1">
                      <p className="text-card-title text-content-primary font-bold truncate">{pdfFile.name}</p>
                      <p className="text-meta text-content-muted">{pdfFile.size}</p>
                    </div>
                  </div>
                  <span className="text-micro px-2 py-0.5 rounded-full bg-teal-500/15 text-teal-400 border border-teal-500/30 shrink-0">
                    Ready
                  </span>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <IconBadge color={ICON_BADGE_COLORS.pdf}>
                    <Upload className="h-5 w-5" />
                  </IconBadge>
                  <div>
                    <p className="text-card-title text-content-primary font-bold">Click or drag PDF document here</p>
                    <p className="text-meta text-content-muted">Maximum file size: 25MB (.pdf only)</p>
                  </div>
                </div>
              )}
            </div>

            {pdfError && (
              <div className="flex items-center gap-1.5 text-xs text-red-400 font-medium pt-1">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                <span>{pdfError}</span>
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <Label className="text-meta font-bold text-content-primary uppercase tracking-wider">
              Document Display Title
            </Label>
            <Input
              placeholder="e.g. Free 2026 Creator Playbook"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="bg-surface-card border-edge text-content-primary text-body rounded-control focus:border-edge-focus"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-meta font-bold text-content-primary uppercase tracking-wider">
              Description / Instructions (Optional)
            </Label>
            <Textarea
              rows={2}
              placeholder="Download or read this document directly..."
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              className="bg-surface-card border-edge text-content-primary text-body rounded-control focus:border-edge-focus resize-none"
            />
          </div>
        </div>
      )}

      <ModalFooterActions
        secondaryLabel={isEditing ? 'Cancel' : 'Back'}
        onSecondary={onCancel}
        hideSecondary={!onCancel}
        primaryLabel={isEditing ? 'Save Changes' : 'Add to Store'}
        primaryType="submit"
      />
    </form>
  )
}
