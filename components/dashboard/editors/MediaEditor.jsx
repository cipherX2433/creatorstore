'use client'

import React, { useState, useRef, useEffect, useCallback } from 'react'
import {
  Video, Headphones, FileText, Upload, Loader2, Sparkles,
  Link2, Trash2, CheckCircle2, AlertCircle
} from 'lucide-react'
import { toast } from 'sonner'
import { api } from '@/lib/clientApi'
import StoreItemEditorShell from '@/components/dashboard/StoreItemEditorShell'
import { extractVideoEmbed, extractAudioEmbed } from '@/components/dashboard/AddMediaConfig'

export default function MediaEditor({
  section,
  onBack,
  onUpdateProps,
  onDelete,
  onToggleHidden,
  onDuplicate,
  onOpenMobilePreview,
}) {
  const initialProps = section?.props || {}
  const mediaType = section?.type || initialProps.mediaType || 'video'

  const [title, setTitle] = useState(initialProps.title || '')
  const [caption, setCaption] = useState(initialProps.caption || '')
  const [url, setUrl] = useState(initialProps.url || '')
  const [pdfFile, setPdfFile] = useState(
    initialProps.fileName
      ? { name: initialProps.fileName, size: initialProps.fileSize, url: initialProps.url }
      : null
  )
  const [uploadingPdf, setUploadingPdf] = useState(false)
  const [saveState, setSaveState] = useState('saved')

  const pdfInputRef = useRef(null)
  const saveTimerRef = useRef(null)

  const itemTypeLabel =
    mediaType === 'pdf'
      ? 'PDF Document'
      : mediaType === 'audio'
        ? 'Audio & Podcast'
        : 'Video'

  useEffect(() => {
    if (section?.props) {
      if (section.props.title !== undefined && section.props.title !== title) setTitle(section.props.title)
      if (section.props.caption !== undefined && section.props.caption !== caption) setCaption(section.props.caption)
      if (section.props.url !== undefined && section.props.url !== url) setUrl(section.props.url)
    }
  }, [section?.props])

  const triggerSave = useCallback((updates = {}) => {
    setSaveState('saving')
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)

    saveTimerRef.current = setTimeout(() => {
      const nextProps = {
        title: updates.title !== undefined ? updates.title : title,
        caption: updates.caption !== undefined ? updates.caption : caption,
        url: updates.url !== undefined ? updates.url : url,
        fileName: updates.fileName !== undefined ? updates.fileName : pdfFile?.name,
        fileSize: updates.fileSize !== undefined ? updates.fileSize : pdfFile?.size,
      }

      if (mediaType === 'video' || mediaType === 'youtube') {
        const parsed = extractVideoEmbed(nextProps.url)
        if (parsed) {
          nextProps.embedType = parsed.type
          nextProps.embedUrl = parsed.embedUrl || null
          nextProps.thumbnail = parsed.thumbnail || null
        }
      } else if (mediaType === 'audio') {
        const parsed = extractAudioEmbed(nextProps.url)
        if (parsed) {
          nextProps.embedType = parsed.type
          nextProps.embedUrl = parsed.embedUrl || null
        }
      }

      onUpdateProps?.(nextProps)
      setSaveState('saved')
    }, 150)
  }, [title, caption, url, pdfFile, mediaType, onUpdateProps])

  const handleTitleChange = (e) => {
    const nextVal = e.target.value
    setTitle(nextVal)
    triggerSave({ title: nextVal })
  }

  const handleCaptionChange = (e) => {
    const nextVal = e.target.value
    setCaption(nextVal)
    triggerSave({ caption: nextVal })
  }

  const handleUrlChange = (e) => {
    const nextVal = e.target.value
    setUrl(nextVal)
    triggerSave({ url: nextVal })
  }

  const handlePdfUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

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

      const newPdf = { name: file.name, size: formattedSize, url: fileUrl }
      setPdfFile(newPdf)
      const nextTitle = title || file.name.replace(/\.pdf$/i, '')
      setTitle(nextTitle)
      triggerSave({ url: fileUrl, fileName: file.name, fileSize: formattedSize, title: nextTitle })
      toast.success('PDF document attached!')
    } catch {
      toast.error('Failed to upload PDF')
    } finally {
      setUploadingPdf(false)
      if (pdfInputRef.current) pdfInputRef.current.value = ''
    }
  }

  return (
    <StoreItemEditorShell
      itemTypeLabel={itemTypeLabel}
      title={title || itemTypeLabel}
      onBack={onBack}
      saveState={saveState}
      isHidden={section?.hidden}
      onToggleHidden={onToggleHidden}
      onDuplicate={onDuplicate}
      onDelete={onDelete}
      onOpenMobilePreview={onOpenMobilePreview}
    >
      <div className="space-y-8 sm:space-y-9">
        {/* PDF UPLOAD OR URL INPUT */}
        {mediaType === 'pdf' ? (
          <div className="space-y-3">
            <h3 className="text-base sm:text-[17px] font-bold text-[#1F1F1F]">
              PDF Document
            </h3>
            <p className="text-xs sm:text-[13px] text-[#6F6F6B]">
              Upload a PDF document for visitors to view or read on your storefront.
            </p>

            <input
              ref={pdfInputRef}
              type="file"
              accept="application/pdf"
              onChange={handlePdfUpload}
              className="hidden"
            />

            {pdfFile ? (
              <div className="flex items-center justify-between p-4 rounded-[12px] border border-[#E5E5E3] bg-[#FAFAFA]">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-10 w-10 rounded-xl bg-[#FFF7ED] text-[#EA580C] flex items-center justify-center shrink-0">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-[#1F1F1F] truncate">{pdfFile.name}</p>
                    <p className="text-xs text-[#6F6F6B] mt-0.5">{pdfFile.size || 'PDF'}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => pdfInputRef.current?.click()}
                    className="text-xs font-semibold text-[#1F1F1F] hover:underline"
                  >
                    Replace
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPdfFile(null)
                      triggerSave({ url: '', fileName: '', fileSize: '' })
                    }}
                    className="p-1 rounded text-[#6F6F6B] hover:text-[#DC2626]"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ) : (
              <div
                onClick={() => pdfInputRef.current?.click()}
                className="border-2 border-dashed border-[#D9D9D9] hover:border-[#1F1F1F] rounded-[14px] p-6 sm:p-8 text-center cursor-pointer transition-colors bg-white space-y-2"
              >
                <FileText className="h-8 w-8 text-[#1F1F1F] mx-auto opacity-70" />
                <div>
                  <p className="text-sm font-bold text-[#1F1F1F]">Upload PDF</p>
                  <p className="text-xs text-[#6F6F6B] mt-0.5">Click to browse or drag and drop (.pdf up to 25MB)</p>
                </div>
                {uploadingPdf && (
                  <div className="flex items-center justify-center gap-2 text-xs font-semibold text-[#1F1F1F] pt-2">
                    <Loader2 className="h-4 w-4 animate-spin" /> Uploading PDF...
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            <label className="text-base sm:text-[17px] font-bold text-[#1F1F1F]">
              {mediaType === 'audio' ? 'Audio or Podcast URL' : 'Video URL'}
            </label>
            <div className="relative">
              <input
                type="url"
                value={url}
                onChange={handleUrlChange}
                placeholder={
                  mediaType === 'audio'
                    ? 'https://open.spotify.com/episode/...'
                    : 'https://youtube.com/watch?v=... or Loom / Vimeo link'
                }
                className="w-full h-12 sm:h-[50px] px-4 rounded-[12px] bg-[#FFFFFF] border border-[#D9D9D9] text-[15px] font-medium text-[#1F1F1F] focus:outline-none focus:border-[#1F1F1F] focus:ring-1 focus:ring-[#1F1F1F] transition-all pr-10"
              />
              <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#999995] pointer-events-none">
                <Link2 className="h-4 w-4" />
              </div>
            </div>
            <p className="text-xs text-[#6F6F6B]">
              {mediaType === 'audio'
                ? 'Supports Spotify, SoundCloud, or direct audio streams (.mp3, .wav).'
                : 'Supports YouTube, Vimeo, Loom, or direct video files (.mp4).'}
            </p>
          </div>
        )}

        {/* TITLE INPUT */}
        <div className="space-y-2">
          <label className="text-base sm:text-[17px] font-bold text-[#1F1F1F]">
            Title
          </label>
          <input
            type="text"
            value={title}
            onChange={handleTitleChange}
            placeholder={`e.g. My ${itemTypeLabel}`}
            className="w-full h-12 sm:h-[50px] px-4 rounded-[12px] bg-[#FFFFFF] border border-[#D9D9D9] text-[15px] font-medium text-[#1F1F1F] focus:outline-none focus:border-[#1F1F1F] focus:ring-1 focus:ring-[#1F1F1F] transition-all"
          />
        </div>

        {/* CAPTION / DESCRIPTION */}
        <div className="space-y-2">
          <label className="text-base sm:text-[17px] font-bold text-[#1F1F1F]">
            Caption (optional)
          </label>
          <textarea
            rows={3}
            value={caption}
            onChange={handleCaptionChange}
            placeholder="Add a short caption or note for storefront visitors..."
            className="w-full rounded-[12px] bg-[#FFFFFF] border border-[#D9D9D9] p-4 text-[14px] leading-relaxed text-[#1F1F1F] resize-y focus:outline-none focus:border-[#1F1F1F] focus:ring-1 focus:ring-[#1F1F1F] transition-all"
          />
        </div>
      </div>
    </StoreItemEditorShell>
  )
}
