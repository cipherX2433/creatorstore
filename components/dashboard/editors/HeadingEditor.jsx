'use client'

import React, { useState, useEffect } from 'react'
import {
  Type,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Loader2,
  Check,
  Eye,
  EyeOff,
  Sparkles,
  AlertCircle,
} from 'lucide-react'
import { toast } from 'sonner'
import StoreItemEditorShell from '@/components/dashboard/StoreItemEditorShell'

export default function HeadingEditor({
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

  const [text, setText] = useState(initialProps.text || initialProps.title || '')
  const [subtitle, setSubtitle] = useState(initialProps.subtitle || '')
  const [align, setAlign] = useState(initialProps.align || 'center')

  const [isDirty, setIsDirty] = useState(false)
  const [saveState, setSaveState] = useState('saved') // 'saved' | 'saving' | 'dirty' | 'idle'
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  // Sync state if section props change externally (and not dirty)
  useEffect(() => {
    if (section?.props && !isDirty) {
      const currentText = section.props.text || section.props.title || ''
      if (currentText !== text) setText(currentText)
      if (section.props.subtitle !== undefined && section.props.subtitle !== subtitle) {
        setSubtitle(section.props.subtitle)
      }
      if (section.props.align !== undefined && section.props.align !== align) {
        setAlign(section.props.align)
      }
    }
  }, [section?.props, isDirty])

  const handleTextChange = (e) => {
    setText(e.target.value)
    setIsDirty(true)
    if (error) setError('')
  }

  const handleSubtitleChange = (e) => {
    setSubtitle(e.target.value)
    setIsDirty(true)
  }

  const handleAlignChange = (newAlign) => {
    setAlign(newAlign)
    setIsDirty(true)
  }

  const handleSave = async () => {
    const trimmedText = text.trim()
    if (!trimmedText) {
      setError('Heading text is required')
      toast.error('Please enter heading text')
      return
    }

    if (trimmedText.length > 120) {
      setError('Heading text must be 120 characters or fewer')
      toast.error('Heading text exceeds 120 characters')
      return
    }

    if (subtitle.length > 250) {
      setError('Supporting text must be 250 characters or fewer')
      toast.error('Supporting text exceeds 250 characters')
      return
    }

    setError('')
    setIsSubmitting(true)
    setSaveState('saving')

    const patch = {
      text: trimmedText,
      title: trimmedText,
      subtitle: subtitle.trim(),
      align,
    }

    try {
      if (typeof onSave === 'function') {
        await onSave(patch)
      } else if (typeof onUpdateProps === 'function') {
        onUpdateProps(patch)
      }
      setSaveState('saved')
      setIsDirty(false)
      toast.success('Heading saved successfully')
    } catch (err) {
      setSaveState('dirty')
      toast.error(err?.message || 'Failed to save heading')
    } finally {
      setIsSubmitting(false)
    }
  }

  const isHidden = Boolean(section?.hidden)

  return (
    <StoreItemEditorShell
      itemTypeLabel="Heading"
      title={text.trim() || 'Heading'}
      onBack={onBack}
      saveState={saveState}
      isHidden={isHidden}
      onToggleHidden={onToggleHidden}
      onDuplicate={onDuplicate}
      onDelete={onDelete}
      onOpenMobilePreview={onOpenMobilePreview}
    >
      <div className="space-y-7 sm:space-y-8">
        {/* HEADING TEXT INPUT */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-base sm:text-[17px] font-bold text-[#1F1F1F]">
              Heading text <span className="text-[#DC2626]">*</span>
            </label>
            <span
              className={`text-xs font-mono ${
                text.length > 120 ? 'text-[#DC2626] font-bold' : 'text-[#6F6F6B]'
              }`}
            >
              {text.length}/120
            </span>
          </div>
          <div className="relative">
            <input
              type="text"
              value={text}
              maxLength={120}
              onChange={handleTextChange}
              placeholder="e.g. Featured Products, About Me, Recommended"
              className={`w-full h-12 sm:h-[50px] px-4 rounded-[12px] bg-[#FFFFFF] border text-[15px] font-medium text-[#1F1F1F] focus:outline-none focus:ring-1 transition-all pr-10 ${
                error
                  ? 'border-[#DC2626] focus:border-[#DC2626] focus:ring-[#DC2626]'
                  : 'border-[#D9D9D9] focus:border-[#1F1F1F] focus:ring-[#1F1F1F]'
              }`}
            />
            <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#999995] pointer-events-none">
              <Type className="h-4 w-4" />
            </div>
          </div>
          {error ? (
            <p className="text-xs text-[#DC2626] flex items-center gap-1 mt-1 font-medium">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              {error}
            </p>
          ) : (
            <p className="text-xs text-[#6F6F6B]">
              This header text will be displayed prominently to organize sections of your storefront.
            </p>
          )}
        </div>

        {/* OPTIONAL SUPPORTING TEXT / SUBTITLE */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-base sm:text-[17px] font-bold text-[#1F1F1F]">
              Supporting text <span className="text-xs font-normal text-[#6F6F6B]">(optional)</span>
            </label>
            <span
              className={`text-xs font-mono ${
                subtitle.length > 250 ? 'text-[#DC2626] font-bold' : 'text-[#6F6F6B]'
              }`}
            >
              {subtitle.length}/250
            </span>
          </div>
          <textarea
            rows={2}
            value={subtitle}
            maxLength={250}
            onChange={handleSubtitleChange}
            placeholder="e.g. Hand-picked resources and guides to help you build your business"
            className="w-full rounded-[12px] bg-[#FFFFFF] border border-[#D9D9D9] p-4 text-[14px] leading-relaxed text-[#1F1F1F] resize-y focus:outline-none focus:border-[#1F1F1F] focus:ring-1 focus:ring-[#1F1F1F] transition-all"
          />
          <p className="text-xs text-[#6F6F6B]">
            A subtle description or subtext displayed directly below the heading.
          </p>
        </div>

        {/* TEXT ALIGNMENT */}
        <div className="space-y-2.5">
          <label className="text-base sm:text-[17px] font-bold text-[#1F1F1F]">
            Text alignment
          </label>
          <div className="grid grid-cols-3 gap-2 p-1 bg-[#F5F5F3] rounded-[14px] border border-[#E5E5E3]">
            {[
              { value: 'left', label: 'Left', icon: AlignLeft },
              { value: 'center', label: 'Center', icon: AlignCenter },
              { value: 'right', label: 'Right', icon: AlignRight },
            ].map((opt) => {
              const Icon = opt.icon
              const isSelected = align === opt.value
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => handleAlignChange(opt.value)}
                  className={`flex items-center justify-center gap-2 py-2 px-3 rounded-[10px] text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[#FFFFFF] text-[#1F1F1F] shadow-xs font-bold'
                      : 'text-[#6F6F6B] hover:text-[#1F1F1F]'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{opt.label}</span>
                </button>
              )
            })}
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
                  ? 'This heading is currently hidden from visitors.'
                  : 'This heading is visible to everyone visiting your store.'}
              </p>
            </div>
            {onToggleHidden && (
              <button
                type="button"
                onClick={onToggleHidden}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer shrink-0 ${
                  !isHidden ? 'bg-[#1F1F1F]' : 'bg-[#D9D9D9]'
                }`}
                title={isHidden ? 'Show heading' : 'Hide heading'}
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
    </StoreItemEditorShell>
  )
}
