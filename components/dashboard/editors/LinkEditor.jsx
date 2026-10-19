'use client'

import React, { useState, useRef, useEffect, useCallback } from 'react'
import {
  Link2, Plus, Trash2, Upload, Loader2, Sparkles, ExternalLink,
  Image as ImageIcon
} from 'lucide-react'
import { toast } from 'sonner'
import { api } from '@/lib/clientApi'
import StoreItemEditorShell from '@/components/dashboard/StoreItemEditorShell'
import StoreItemDisplaySelector from '@/components/dashboard/editors/StoreItemDisplaySelector'

export default function LinkEditor({
  section,
  onBack,
  onUpdateProps,
  onDelete,
  onToggleHidden,
  onDuplicate,
  onOpenMobilePreview,
}) {
  const initialProps = section?.props || {}

  const [label, setLabel] = useState(initialProps.label || initialProps.title || initialProps.text || 'My Link')
  const [url, setUrl] = useState(initialProps.url || '')
  const [description, setDescription] = useState(initialProps.description || '')
  const [thumbnail, setThumbnail] = useState(initialProps.thumbnail || '')
  const [displayMode, setDisplayMode] = useState(initialProps.layout || initialProps.displayMode || 'classic')

  const [activeTab, setActiveTab] = useState('details')
  const [saveState, setSaveState] = useState('saved')
  const [uploadingThumb, setUploadingThumb] = useState(false)

  const thumbInputRef = useRef(null)
  const saveTimerRef = useRef(null)

  // Keep state in sync if section props change externally
  useEffect(() => {
    if (section?.props) {
      const currentLabel = section.props.label || section.props.title || section.props.text
      if (currentLabel !== undefined && currentLabel !== label) setLabel(currentLabel)
      if (section.props.url !== undefined && section.props.url !== url) setUrl(section.props.url)
      if (section.props.description !== undefined && section.props.description !== description) setDescription(section.props.description)
      if (section.props.thumbnail !== undefined && section.props.thumbnail !== thumbnail) setThumbnail(section.props.thumbnail)
      const mode = section.props.layout || section.props.displayMode || 'classic'
      if (mode !== displayMode) setDisplayMode(mode)
    }
  }, [section?.props])

  const triggerSave = useCallback((updates = {}) => {
    setSaveState('saving')
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)

    saveTimerRef.current = setTimeout(() => {
      const nextProps = {
        label: updates.label !== undefined ? updates.label : label,
        title: updates.label !== undefined ? updates.label : label,
        url: updates.url !== undefined ? updates.url : url,
        description: updates.description !== undefined ? updates.description : description,
        thumbnail: updates.thumbnail !== undefined ? updates.thumbnail : thumbnail,
        layout: updates.displayMode !== undefined ? updates.displayMode : displayMode,
        displayMode: updates.displayMode !== undefined ? updates.displayMode : displayMode,
      }
      onUpdateProps?.(nextProps)
      setSaveState('saved')
    }, 150)
  }, [label, url, description, thumbnail, displayMode, onUpdateProps])

  const handleLabelChange = (e) => {
    const nextVal = e.target.value
    setLabel(nextVal)
    triggerSave({ label: nextVal })
  }

  const handleUrlChange = (e) => {
    const nextVal = e.target.value
    setUrl(nextVal)
    triggerSave({ url: nextVal })
  }

  const handleDescriptionChange = (e) => {
    const nextVal = e.target.value
    setDescription(nextVal)
    triggerSave({ description: nextVal })
  }

  const handleDisplayModeChange = (mode) => {
    setDisplayMode(mode)
    triggerSave({ displayMode: mode })
  }

  const handleThumbnailUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingThumb(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await api.upload('/upload', fd)
      const thumbUrl = res?.url || URL.createObjectURL(file)
      setThumbnail(thumbUrl)
      triggerSave({ thumbnail: thumbUrl })
      toast.success('Thumbnail uploaded')
    } catch {
      const localUrl = URL.createObjectURL(file)
      setThumbnail(localUrl)
      triggerSave({ thumbnail: localUrl })
      toast.success('Thumbnail updated')
    } finally {
      setUploadingThumb(false)
      if (thumbInputRef.current) thumbInputRef.current.value = ''
    }
  }

  const handleRemoveThumbnail = () => {
    setThumbnail('')
    triggerSave({ thumbnail: '' })
    toast.success('Thumbnail removed')
  }

  return (
    <StoreItemEditorShell
      itemTypeLabel="External link"
      title={label || 'My Link'}
      onBack={onBack}
      tabs={[
        { id: 'details', label: 'Details' },
        { id: 'display', label: 'Display' },
      ]}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      saveState={saveState}
      isHidden={section?.hidden}
      onToggleHidden={onToggleHidden}
      onDuplicate={onDuplicate}
      onDelete={onDelete}
      onOpenMobilePreview={onOpenMobilePreview}
    >
      {/* TAB 1: DETAILS */}
      {activeTab === 'details' && (
        <div className="space-y-8 sm:space-y-9">
          {/* SECTION A: THUMBNAIL */}
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <h3 className="text-base sm:text-[17px] font-bold text-[#1F1F1F]">Thumbnail</h3>
              <p className="text-xs sm:text-[13px] text-[#6F6F6B]">
                Square images work best. Use 1080 × 1080px or larger.
              </p>
              {thumbnail && (
                <button
                  type="button"
                  onClick={handleRemoveThumbnail}
                  className="text-xs font-semibold text-[#DC2626] hover:underline pt-1 block cursor-pointer"
                >
                  Remove image
                </button>
              )}
            </div>

            <input
              ref={thumbInputRef}
              type="file"
              accept="image/*"
              onChange={handleThumbnailUpload}
              className="hidden"
            />

            <div
              onClick={() => thumbInputRef.current?.click()}
              className="relative h-[68px] w-[68px] sm:h-20 sm:w-20 rounded-[14px] border border-[#D9D9D9] bg-[#F5F5F3] overflow-hidden flex items-center justify-center cursor-pointer group hover:border-[#1F1F1F] transition-all shrink-0"
            >
              {thumbnail ? (
                <img src={thumbnail} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="relative w-full h-full flex items-center justify-center text-[#999995] group-hover:text-[#1F1F1F]">
                  <ImageIcon className="h-7 w-7 opacity-60" />
                  <div className="absolute bottom-1.5 right-1.5 h-4 w-4 rounded-full bg-white border border-[#D9D9D9] flex items-center justify-center shadow-xs">
                    <Plus className="h-2.5 w-2.5 text-[#1F1F1F]" />
                  </div>
                </div>
              )}
              {uploadingThumb && (
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                  <Loader2 className="h-5 w-5 animate-spin text-white" />
                </div>
              )}
            </div>
          </div>

          {/* SECTION B: DESTINATION URL */}
          <div className="space-y-2">
            <label className="text-base sm:text-[17px] font-bold text-[#1F1F1F]">
              Destination URL
            </label>
            <div className="relative">
              <input
                type="url"
                value={url}
                onChange={handleUrlChange}
                placeholder="https://instagram.com/yourhandle"
                className="w-full h-12 sm:h-[50px] px-4 rounded-[12px] bg-[#FFFFFF] border border-[#D9D9D9] text-[15px] font-medium text-[#1F1F1F] focus:outline-none focus:border-[#1F1F1F] focus:ring-1 focus:ring-[#1F1F1F] transition-all pr-10"
              />
              <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#999995] pointer-events-none">
                <Link2 className="h-4 w-4" />
              </div>
            </div>
            <p className="text-xs text-[#6F6F6B]">
              Visitors will be redirected to this web address when clicking this link.
            </p>
          </div>

          {/* SECTION C: LINK TITLE */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-base sm:text-[17px] font-bold text-[#1F1F1F]">
                Link title
              </label>
              <span className="text-xs text-[#6F6F6B] font-mono">
                {label.length}/120
              </span>
            </div>
            <div className="relative">
              <input
                type="text"
                value={label}
                maxLength={120}
                onChange={handleLabelChange}
                placeholder="e.g. Follow me on Instagram"
                className="w-full h-12 sm:h-[50px] px-4 rounded-[12px] bg-[#FFFFFF] border border-[#D9D9D9] text-[15px] font-medium text-[#1F1F1F] focus:outline-none focus:border-[#1F1F1F] focus:ring-1 focus:ring-[#1F1F1F] transition-all pr-10"
              />
              <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#999995] pointer-events-none">
                <Sparkles className="h-4 w-4" />
              </div>
            </div>
          </div>

          {/* SECTION D: DESCRIPTION (OPTIONAL) */}
          <div className="space-y-2">
            <label className="text-base sm:text-[17px] font-bold text-[#1F1F1F]">
              Description (optional)
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={handleDescriptionChange}
              placeholder="Short supporting description or subtitle for this link..."
              className="w-full rounded-[12px] bg-[#FFFFFF] border border-[#D9D9D9] p-4 text-[14px] leading-relaxed text-[#1F1F1F] resize-y focus:outline-none focus:border-[#1F1F1F] focus:ring-1 focus:ring-[#1F1F1F] transition-all"
            />
          </div>
        </div>
      )}

      {/* TAB 2: DISPLAY */}
      {activeTab === 'display' && (
        <div className="space-y-8 sm:space-y-9">
          <StoreItemDisplaySelector
            value={displayMode}
            onChange={handleDisplayModeChange}
            thumbnail={thumbnail}
            itemType="link"
            title="Display mode"
            subtitle="Choose how this link appears on your storefront."
          />
        </div>
      )}
    </StoreItemEditorShell>
  )
}
