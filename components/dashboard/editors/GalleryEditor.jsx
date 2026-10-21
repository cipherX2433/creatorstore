'use client'

import React, { useState, useRef, useEffect, useCallback } from 'react'
import {
  Images, Plus, Trash2, ArrowLeft, ArrowRight, Upload,
  Loader2, Pencil, Sparkles, AlertCircle
} from 'lucide-react'
import { toast } from 'sonner'
import { api } from '@/lib/clientApi'
import StoreItemEditorShell from '@/components/dashboard/StoreItemEditorShell'
import StoreItemDisplaySelector from '@/components/dashboard/editors/StoreItemDisplaySelector'

export default function GalleryEditor({
  section,
  onBack,
  onUpdateProps,
  onDelete,
  onToggleHidden,
  onDuplicate,
  onOpenMobilePreview,
}) {
  const initialProps = section?.props || {}

  // Gallery state
  const [title, setTitle] = useState(initialProps.title || 'gallery')
  const [caption, setCaption] = useState(initialProps.caption || '')
  const [images, setImages] = useState(Array.isArray(initialProps.images) ? initialProps.images : [])
  const [displayMode, setDisplayMode] = useState(initialProps.layout || initialProps.displayMode || 'classic')

  // Tabs: 'details' | 'display'
  const [activeTab, setActiveTab] = useState('details')
  const [saveState, setSaveState] = useState('saved')
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [dragOver, setDragOver] = useState(false)

  const fileInputRef = useRef(null)
  const saveTimerRef = useRef(null)

  // Keep internal state synced if props change externally
  useEffect(() => {
    if (section?.props) {
      if (section.props.title !== undefined && section.props.title !== title) {
        setTitle(section.props.title)
      }
      if (section.props.images && JSON.stringify(section.props.images) !== JSON.stringify(images)) {
        setImages(section.props.images)
      }
      const mode = section.props.layout || section.props.displayMode || 'classic'
      if (mode !== displayMode) {
        setDisplayMode(mode)
      }
    }
  }, [section?.props])

  // Trigger auto-save to parent
  const triggerSave = useCallback((updates = {}) => {
    setSaveState('saving')
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)

    saveTimerRef.current = setTimeout(() => {
      const nextProps = {
        title: updates.title !== undefined ? updates.title : title,
        caption: updates.caption !== undefined ? updates.caption : caption,
        images: updates.images !== undefined ? updates.images : images,
        layout: updates.displayMode !== undefined ? updates.displayMode : displayMode,
        displayMode: updates.displayMode !== undefined ? updates.displayMode : displayMode,
      }
      onUpdateProps?.(nextProps)
      setSaveState('saved')
    }, 150)
  }, [title, caption, images, displayMode, onUpdateProps])

  // Title change
  const handleTitleChange = (e) => {
    const nextVal = e.target.value
    setTitle(nextVal)
    triggerSave({ title: nextVal })
  }

  // Caption change
  const handleCaptionChange = (e) => {
    const nextVal = e.target.value
    setCaption(nextVal)
    triggerSave({ caption: nextVal })
  }

  // Display mode change
  const handleDisplayModeChange = (mode) => {
    setDisplayMode(mode)
    triggerSave({ displayMode: mode })
  }

  // File Upload handling
  const handleFiles = async (files) => {
    if (!files || !files.length) return
    setUploading(true)
    setUploadProgress(10)

    try {
      const newImages = [...images]
      const total = files.length
      let count = 0

      for (const file of Array.from(files)) {
        if (!file.type.startsWith('image/')) continue
        const fd = new FormData()
        fd.append('file', file)

        try {
          const res = await api.upload('/upload', fd)
          if (res?.url) {
            newImages.push({
              id: Math.random().toString(36).substring(2, 9),
              url: res.url,
              name: file.name,
            })
          }
        } catch {
          // Local fallback
          const localUrl = URL.createObjectURL(file)
          newImages.push({
            id: Math.random().toString(36).substring(2, 9),
            url: localUrl,
            name: file.name,
          })
        }
        count++
        setUploadProgress(Math.round((count / total) * 100))
      }

      setImages(newImages)
      triggerSave({ images: newImages })
      toast.success(`${count} image(s) added to gallery`)
    } catch {
      toast.error('Image upload failed. Please try again.')
    } finally {
      setUploading(false)
      setUploadProgress(0)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  // Remove image
  const handleRemoveImage = (indexToRemove) => {
    const nextImages = images.filter((_, idx) => idx !== indexToRemove)
    setImages(nextImages)
    triggerSave({ images: nextImages })
    toast.success('Image removed')
  }

  // Reorder image
  const handleMoveImage = (fromIdx, toIdx) => {
    if (toIdx < 0 || toIdx >= images.length) return
    const nextImages = [...images]
    const [moved] = nextImages.splice(fromIdx, 1)
    nextImages.splice(toIdx, 0, moved)
    setImages(nextImages)
    triggerSave({ images: nextImages })
  }

  // Drag and drop handlers
  const onDragOver = (e) => {
    e.preventDefault()
    setDragOver(true)
  }
  const onDragLeave = () => setDragOver(false)
  const onDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    if (e.dataTransfer.files && e.dataTransfer.files.length) {
      handleFiles(e.dataTransfer.files)
    }
  }

  const firstImageUrl = images[0]?.url || null

  return (
    <StoreItemEditorShell
      itemTypeLabel="Gallery"
      title={title || 'gallery'}
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
      {/* ========================================================================= */}
      {/* TAB 1: DETAILS                                                            */}
      {/* ========================================================================= */}
      {activeTab === 'details' && (
        <div className="space-y-8 sm:space-y-9">
          {/* SECTION A: GALLERY INFO */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-base sm:text-[17px] font-bold text-[#1F1F1F]">
                Gallery title
              </label>
              <span className="text-xs text-[#6F6F6B] font-mono">
                {title.length}/266
              </span>
            </div>
            <div className="relative">
              <input
                type="text"
                value={title}
                maxLength={266}
                onChange={handleTitleChange}
                placeholder="e.g. Behind the scenes"
                className="w-full h-12 sm:h-[50px] px-4 rounded-[12px] bg-[#FFFFFF] border border-[#D9D9D9] text-[15px] font-medium text-[#1F1F1F] focus:outline-none focus:border-[#1F1F1F] focus:ring-1 focus:ring-[#1F1F1F] transition-all pr-10"
              />
              <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#999995] pointer-events-none">
                <Pencil className="h-4 w-4" />
              </div>
            </div>
            <p className="text-xs text-[#6F6F6B]">
              This title appears on your public storefront and in photo previews.
            </p>
          </div>

          {/* SECTION B: IMAGES MANAGEMENT */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base sm:text-[17px] font-bold text-[#1F1F1F]">
                  Images ({images.length})
                </h3>
                <p className="text-xs sm:text-[13px] text-[#6F6F6B] mt-0.5">
                  Manage your images. Drag & drop or upload high-resolution photos.
                </p>
              </div>

              {images.length > 0 && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[#D9D9D9] bg-[#FFFFFF] hover:bg-[#F5F5F3] text-xs font-semibold text-[#1F1F1F] transition-colors cursor-pointer shrink-0"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Add photos</span>
                </button>
              )}
            </div>

            {/* Hidden native file input */}
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*"
              onChange={(e) => handleFiles(e.target.files)}
              className="hidden"
            />

            {/* Uploading progress bar */}
            {uploading && (
              <div className="p-4 rounded-[12px] bg-[#F5F5F3] border border-[#E5E5E3] space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-[#1F1F1F]">
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-[#1F1F1F]" />
                    Uploading photos...
                  </span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="h-1.5 w-full bg-[#E5E5E3] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#1F1F1F] transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Images Grid / List */}
            {images.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {images.map((img, idx) => {
                  const isFirst = idx === 0
                  const isLast = idx === images.length - 1

                  return (
                    <div
                      key={img.id || idx}
                      className="group relative rounded-[14px] border border-[#E5E5E3] bg-[#FAFAFA] overflow-hidden shadow-2xs hover:border-[#1F1F1F] transition-all flex flex-col"
                    >
                      {/* Image Thumbnail Aspect */}
                      <div className="relative aspect-square w-full overflow-hidden bg-[#ECECE9]">
                        <img
                          src={img.url}
                          alt={img.name || `Photo ${idx + 1}`}
                          className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        {/* Number badge */}
                        <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded-md bg-black/60 text-white text-[10px] font-bold backdrop-blur-xs">
                          #{idx + 1}
                        </div>

                        {/* Top right quick remove button */}
                        <button
                          type="button"
                          onClick={() => handleRemoveImage(idx)}
                          className="absolute top-2 right-2 h-7 w-7 rounded-full bg-white/90 hover:bg-[#DC2626] text-[#1F1F1F] hover:text-white flex items-center justify-center transition-colors shadow-xs cursor-pointer"
                          title="Remove image"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      {/* Bottom Reorder Controls */}
                      <div className="p-2 bg-white flex items-center justify-between border-t border-[#E5E5E3]">
                        <span className="text-[11px] font-medium text-[#6F6F6B] truncate max-w-[80px]">
                          {img.name || `Photo ${idx + 1}`}
                        </span>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            disabled={isFirst}
                            onClick={() => handleMoveImage(idx, idx - 1)}
                            className={`p-1 rounded-md text-[#1F1F1F] hover:bg-[#F5F5F3] transition-colors cursor-pointer ${
                              isFirst ? 'opacity-25 cursor-not-allowed' : ''
                            }`}
                            title="Move left"
                          >
                            <ArrowLeft className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            disabled={isLast}
                            onClick={() => handleMoveImage(idx, idx + 1)}
                            className={`p-1 rounded-md text-[#1F1F1F] hover:bg-[#F5F5F3] transition-colors cursor-pointer ${
                              isLast ? 'opacity-25 cursor-not-allowed' : ''
                            }`}
                            title="Move right"
                          >
                            <ArrowRight className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}

                {/* Add more box in grid */}
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="aspect-square rounded-[14px] border-2 border-dashed border-[#D9D9D9] hover:border-[#1F1F1F] bg-[#FFFFFF] hover:bg-[#FBFBFA] flex flex-col items-center justify-center p-3 text-center cursor-pointer transition-colors group"
                >
                  <div className="h-9 w-9 rounded-full bg-[#F5F5F3] group-hover:bg-[#E5E5E3] flex items-center justify-center text-[#1F1F1F] transition-colors mb-1.5">
                    <Plus className="h-4 w-4" />
                  </div>
                  <span className="text-xs font-bold text-[#1F1F1F]">Add photo</span>
                  <span className="text-[11px] text-[#6F6F6B]">JPG, PNG, WebP</span>
                </div>
              </div>
            ) : (
              /* Empty state drag & drop upload zone */
              <div
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                onDrop={onDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-[14px] p-8 sm:p-10 text-center cursor-pointer transition-all space-y-3 ${
                  dragOver
                    ? 'border-[#1F1F1F] bg-[#F5F5F3]'
                    : 'border-[#D9D9D9] hover:border-[#1F1F1F] bg-[#FFFFFF]'
                }`}
              >
                <div className="h-12 w-12 rounded-full bg-[#F5F5F3] flex items-center justify-center mx-auto text-[#1F1F1F]">
                  <Upload className="h-5 w-5 opacity-70" />
                </div>
                <div>
                  <p className="text-sm font-bold text-[#1F1F1F]">Upload photos</p>
                  <p className="text-xs text-[#6F6F6B] mt-0.5">
                    Drag and drop your photos here, or click to browse files
                  </p>
                </div>
                <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#1F1F1F] text-white text-xs font-semibold shadow-xs">
                  <Plus className="h-3.5 w-3.5" />
                  <span>Select photos</span>
                </div>
              </div>
            )}
          </div>

          {/* SECTION C: CAPTION (OPTIONAL) */}
          <div className="space-y-2">
            <label className="text-base sm:text-[17px] font-bold text-[#1F1F1F]">
              Caption (optional)
            </label>
            <textarea
              rows={3}
              value={caption}
              onChange={handleCaptionChange}
              placeholder="Add an optional description or story behind these photos..."
              className="w-full rounded-[12px] bg-[#FFFFFF] border border-[#D9D9D9] p-4 text-[14px] leading-relaxed text-[#1F1F1F] resize-y focus:outline-none focus:border-[#1F1F1F] focus:ring-1 focus:ring-[#1F1F1F] transition-all"
            />
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: DISPLAY                                                            */}
      {/* ========================================================================= */}
      {activeTab === 'display' && (
        <div className="space-y-8 sm:space-y-9">
          <StoreItemDisplaySelector
            value={displayMode}
            onChange={handleDisplayModeChange}
            thumbnail={firstImageUrl}
            itemType="gallery"
            title="Display mode"
            subtitle="Choose how this gallery looks to visitors on your storefront."
          />
        </div>
      )}
    </StoreItemEditorShell>
  )
}
