'use client'

import { useState } from 'react'
import { ArrowLeft, Undo2, Redo2, RotateCcw, Loader2 } from 'lucide-react'
import ColorField from './ColorField'

/**
 * Linktree-inspired Colors Customization Panel (#colors)
 * Reproduces the visual hierarchy, clean white container, top action controls,
 * and integrated swatch+hex pill design from the Linktree reference screenshot.
 */
export default function ColorsPanel({
  theme,
  onChange,
  onBack,
  onSave,
  onCancel,
  onReset,
  hasUnsavedChanges = false,
  isSaving = false,
}) {
  const [history, setHistory] = useState([theme])
  const [historyIndex, setHistoryIndex] = useState(0)

  const canUndo = historyIndex > 0
  const canRedo = historyIndex < history.length - 1

  const applyChange = (patch) => {
    const updated = { ...theme, ...patch }
    const newHistory = history.slice(0, historyIndex + 1)
    newHistory.push(updated)
    setHistory(newHistory)
    setHistoryIndex(newHistory.length - 1)
    onChange(patch)
  }

  const handleUndo = () => {
    if (!canUndo) return
    const prevTheme = history[historyIndex - 1]
    setHistoryIndex(historyIndex - 1)
    onChange(prevTheme)
  }

  const handleRedo = () => {
    if (!canRedo) return
    const nextTheme = history[historyIndex + 1]
    setHistoryIndex(historyIndex + 1)
    onChange(nextTheme)
  }

  const colorRows = [
    { key: 'background', label: 'Background', fallback: '#000000' },
    { key: 'buttonColor', label: 'Buttons', fallback: '#4D7CFF' },
    { key: 'buttonTextColor', label: 'Button text', fallback: '#FFFFFF' },
    { key: 'textColor', label: 'Page text', fallback: '#FFFFFF' },
    { key: 'titleColor', label: 'Title', fallback: theme.textColor || '#FFFFFF' },
    { key: 'buttonShadowColor', label: 'Button shadows', fallback: '#000000' },
  ]

  return (
    <div className="bg-white rounded-[24px] border border-[#E5E5E3] p-5 sm:p-6 shadow-xs space-y-6">
      {/* TOP HEADER: Back button + Undo/Redo + Cancel/Save */}
      <div className="flex items-center justify-between gap-3 pb-4 border-b border-[#F0EFEB]">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-2 text-base sm:text-lg font-bold text-[#1F1F1F] hover:text-[#000000] transition-colors cursor-pointer group"
        >
          <div className="h-8 w-8 rounded-full bg-[#F5F5F3] group-hover:bg-[#EAEAE8] flex items-center justify-center transition-colors">
            <ArrowLeft className="h-4 w-4 text-[#1F1F1F]" />
          </div>
          <span>Colors</span>
        </button>

        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Undo / Redo */}
          <div className="flex items-center gap-1 mr-1">
            <button
              type="button"
              onClick={handleUndo}
              disabled={!canUndo}
              className={`h-8 w-8 rounded-full flex items-center justify-center transition-colors cursor-pointer ${
                canUndo ? 'text-[#1F1F1F] hover:bg-[#F5F5F3]' : 'text-[#CCCCCC] cursor-not-allowed'
              }`}
              title="Undo"
              aria-label="Undo color change"
            >
              <Undo2 className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={handleRedo}
              disabled={!canRedo}
              className={`h-8 w-8 rounded-full flex items-center justify-center transition-colors cursor-pointer ${
                canRedo ? 'text-[#1F1F1F] hover:bg-[#F5F5F3]' : 'text-[#CCCCCC] cursor-not-allowed'
              }`}
              title="Redo"
              aria-label="Redo color change"
            >
              <Redo2 className="h-4 w-4" />
            </button>
          </div>

          {/* Cancel */}
          <button
            type="button"
            onClick={onCancel}
            disabled={!hasUnsavedChanges || isSaving}
            className={`h-8 sm:h-9 px-3.5 sm:px-4 rounded-full text-xs font-semibold border transition-all cursor-pointer ${
              hasUnsavedChanges && !isSaving
                ? 'border-[#E5E5E3] bg-white hover:bg-[#F5F5F3] text-[#1F1F1F]'
                : 'border-[#E5E5E3] bg-[#F7F7F6] text-[#A8A8A4] cursor-not-allowed'
            }`}
          >
            Cancel
          </button>

          {/* Save (Linktree-signature purple pill #8B3DFF) */}
          <button
            type="button"
            onClick={onSave}
            disabled={!hasUnsavedChanges || isSaving}
            className={`h-8 sm:h-9 px-4 sm:px-5 rounded-full text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer select-none ${
              hasUnsavedChanges && !isSaving
                ? 'bg-[#8B3DFF] hover:bg-[#7828E8] text-white hover:shadow-sm active:scale-95'
                : 'bg-[#D1D1CE] text-white cursor-not-allowed'
            }`}
          >
            {isSaving && <Loader2 className="h-3 w-3 animate-spin" />}
            <span>Save</span>
          </button>
        </div>
      </div>

      {/* COLOR ROWS LIST (Matches Linktree Screenshot 5) */}
      <div className="space-y-0.5 divide-y divide-[#F0EFEB]">
        {colorRows.map((row) => (
          <ColorField
            key={row.key}
            label={row.label}
            value={theme[row.key]}
            fallback={row.fallback}
            onChange={(v) => applyChange({ [row.key]: v })}
            showBorder={false}
          />
        ))}
      </div>

      {/* RESET TO DEFAULTS */}
      {onReset && (
        <div className="pt-2 flex justify-end border-t border-[#F0EFEB]">
          <button
            type="button"
            onClick={onReset}
            className="text-xs font-semibold text-[#6F6F6B] hover:text-[#1F1F1F] flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <RotateCcw className="h-3 w-3" />
            <span>Reset colors to defaults</span>
          </button>
        </div>
      )}
    </div>
  )
}
