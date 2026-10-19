'use client'

import React, { useState, useRef, useEffect, useCallback } from 'react'
import {
  Folder, Plus, Trash2, ArrowUp, ArrowDown, Package,
  GripVertical, X, Sparkles, Pencil
} from 'lucide-react'
import { toast } from 'sonner'
import { formatMoney } from '@/lib/clientApi'
import StoreItemEditorShell from '@/components/dashboard/StoreItemEditorShell'

const COLLECTION_LAYOUTS = [
  {
    id: 'list',
    label: 'List',
    description: 'Clean vertical list of items',
    diagram: (
      <div className="w-full h-10 px-2 flex flex-col justify-center gap-1.5 bg-[#F5F5F3] rounded-lg border border-[#E5E5E3]">
        <div className="h-2 w-full bg-white rounded border border-[#E5E5E3]" />
        <div className="h-2 w-full bg-white rounded border border-[#E5E5E3]" />
      </div>
    ),
  },
  {
    id: 'grid',
    label: 'Grid',
    description: 'Two-column card grid',
    diagram: (
      <div className="w-full h-10 px-2 flex items-center justify-center gap-2 bg-[#F5F5F3] rounded-lg border border-[#E5E5E3]">
        <div className="h-7 w-1/2 bg-white rounded border border-[#E5E5E3]" />
        <div className="h-7 w-1/2 bg-white rounded border border-[#E5E5E3]" />
      </div>
    ),
  },
  {
    id: 'carousel',
    label: 'Carousel',
    description: 'Horizontal swipeable cards',
    diagram: (
      <div className="w-full h-10 px-2 flex items-center justify-center gap-1.5 bg-[#F5F5F3] rounded-lg border border-[#E5E5E3] overflow-hidden">
        <div className="h-7 w-1/4 bg-white/60 rounded border border-[#E5E5E3]" />
        <div className="h-8 w-1/2 bg-white rounded border border-[#E5E5E3] shadow-xs" />
        <div className="h-7 w-1/4 bg-white/60 rounded border border-[#E5E5E3]" />
      </div>
    ),
  },
  {
    id: 'showcase',
    label: 'Showcase',
    description: 'Hero feature item with thumbnail row',
    diagram: (
      <div className="w-full h-10 px-2 flex flex-col justify-center gap-1 bg-[#F5F5F3] rounded-lg border border-[#E5E5E3]">
        <div className="h-4 w-full bg-white rounded border border-[#E5E5E3]" />
        <div className="flex gap-1">
          <div className="h-2 w-1/3 bg-white rounded" />
          <div className="h-2 w-1/3 bg-white rounded" />
          <div className="h-2 w-1/3 bg-white rounded" />
        </div>
      </div>
    ),
  },
]

export default function CollectionEditor({
  section,
  products = [],
  onBack,
  onUpdateProps,
  onAddItem,
  onRemoveItem,
  onMoveItem,
  onDelete,
  onToggleHidden,
  onDuplicate,
  onOpenMobilePreview,
  setAddContentModalOpen,
  setAddContentType,
}) {
  const initialProps = section?.props || {}

  const [title, setTitle] = useState(initialProps.title || 'New Collection')
  const [layout, setLayout] = useState(initialProps.displayMode || initialProps.layout || 'list')
  const items = Array.isArray(initialProps.items) ? initialProps.items : []

  const [activeTab, setActiveTab] = useState('items')
  const [saveState, setSaveState] = useState('saved')
  const saveTimerRef = useRef(null)

  useEffect(() => {
    if (section?.props) {
      if (section.props.title !== undefined && section.props.title !== title) {
        setTitle(section.props.title)
      }
      const rawLayout = section.props.displayMode || section.props.layout || 'list'
      const activeLayout = (rawLayout === 'stack' || !rawLayout) ? 'list' : rawLayout
      if (activeLayout !== layout) {
        setLayout(activeLayout)
      }
    }
  }, [section?.props])

  const triggerSave = useCallback((updates = {}) => {
    setSaveState('saving')
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)

    saveTimerRef.current = setTimeout(() => {
      const nextProps = {
        title: updates.title !== undefined ? updates.title : title,
        layout: updates.layout !== undefined ? updates.layout : layout,
        displayMode: updates.layout !== undefined ? updates.layout : layout,
      }
      onUpdateProps?.(nextProps)
      setSaveState('saved')
    }, 150)
  }, [title, layout, onUpdateProps])

  const handleTitleChange = (e) => {
    const nextVal = e.target.value
    setTitle(nextVal)
    triggerSave({ title: nextVal })
  }

  const handleLayoutChange = (newLayout) => {
    setLayout(newLayout)
    triggerSave({ layout: newLayout })
  }

  // Resolve item details
  const getItemDetails = (item) => {
    if (item.type === 'product' || item.productId) {
      const prod = products.find((p) => String(p.id) === String(item.productId || item.id))
      return {
        title: prod?.title || item.title || item.label || 'Product',
        subtitle: prod ? (Number(prod.price) === 0 ? 'Free' : formatMoney(prod.price, prod.currency)) : 'Product',
        thumbnail: prod?.thumbnail || item.thumbnail || null,
        type: 'product',
      }
    }
    return {
      title: item.title || item.label || 'Item',
      subtitle: item.type ? item.type.toUpperCase() : 'Link',
      thumbnail: item.thumbnail || null,
      type: item.type || 'link',
    }
  }

  return (
    <StoreItemEditorShell
      itemTypeLabel="Collection"
      title={title || 'New Collection'}
      onBack={onBack}
      tabs={[
        { id: 'items', label: `Items (${items.length})` },
        { id: 'display', label: 'Display & Layout' },
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
      {/* TAB 1: ITEMS */}
      {activeTab === 'items' && (
        <div className="space-y-6 sm:space-y-7">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base sm:text-[17px] font-bold text-[#1F1F1F]">
                Collection Content
              </h3>
              <p className="text-xs sm:text-[13px] text-[#6F6F6B] mt-0.5">
                Organize products and links inside this collection.
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                if (typeof setAddContentType === 'function') setAddContentType('selector')
                if (typeof setAddContentModalOpen === 'function') setAddContentModalOpen(true)
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#1F1F1F] text-white text-xs font-semibold hover:bg-black transition-colors cursor-pointer shadow-xs shrink-0"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add items</span>
            </button>
          </div>

          {items.length > 0 ? (
            <div className="space-y-2.5">
              {items.map((it, idx) => {
                const details = getItemDetails(it)
                const isFirst = idx === 0
                const isLast = idx === items.length - 1

                return (
                  <div
                    key={it.id || it.productId || idx}
                    className="flex items-center justify-between gap-3 p-3 rounded-[14px] border border-[#E5E5E3] bg-[#FFFFFF] hover:border-[#D9D9D9] transition-all shadow-2xs"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      {/* Thumbnail */}
                      <div className="h-10 w-10 rounded-xl bg-[#F5F5F3] border border-[#E5E5E3] overflow-hidden flex items-center justify-center shrink-0">
                        {details.thumbnail ? (
                          <img src={details.thumbnail} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <Package className="h-4 w-4 text-[#6F6F6B]" />
                        )}
                      </div>

                      {/* Title & subtitle */}
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-[#1F1F1F] truncate leading-tight">
                          {details.title}
                        </p>
                        <p className="text-xs font-medium text-[#6F6F6B] truncate mt-0.5">
                          {details.subtitle}
                        </p>
                      </div>
                    </div>

                    {/* Actions: Reorder & Remove */}
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        disabled={isFirst}
                        onClick={() => onMoveItem?.(idx, idx - 1)}
                        className={`p-1.5 rounded-lg text-[#1F1F1F] hover:bg-[#F5F5F3] transition-colors cursor-pointer ${
                          isFirst ? 'opacity-25 cursor-not-allowed' : ''
                        }`}
                        title="Move up"
                      >
                        <ArrowUp className="h-3.5 w-3.5" />
                      </button>

                      <button
                        type="button"
                        disabled={isLast}
                        onClick={() => onMoveItem?.(idx, idx + 1)}
                        className={`p-1.5 rounded-lg text-[#1F1F1F] hover:bg-[#F5F5F3] transition-colors cursor-pointer ${
                          isLast ? 'opacity-25 cursor-not-allowed' : ''
                        }`}
                        title="Move down"
                      >
                        <ArrowDown className="h-3.5 w-3.5" />
                      </button>

                      <div className="w-px h-4 bg-[#E5E5E3] mx-1" />

                      <button
                        type="button"
                        onClick={() => onRemoveItem?.(it.id || it.productId)}
                        className="p-1.5 rounded-lg text-[#6F6F6B] hover:text-[#DC2626] hover:bg-[#FEF2F2] transition-colors cursor-pointer"
                        title="Remove from collection"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="p-8 border-2 border-dashed border-[#D9D9D9] rounded-[16px] text-center space-y-3 bg-[#FAFAFA]">
              <div className="h-12 w-12 rounded-full bg-[#FFFFFF] border border-[#E5E5E3] flex items-center justify-center mx-auto text-[#6F6F6B]">
                <Folder className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-[#1F1F1F]">Collection is empty</p>
                <p className="text-xs text-[#6F6F6B] mt-0.5">
                  Add products or links to display them together in this collection.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (typeof setAddContentType === 'function') setAddContentType('selector')
                  if (typeof setAddContentModalOpen === 'function') setAddContentModalOpen(true)
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#1F1F1F] text-white text-xs font-semibold hover:bg-black transition-colors cursor-pointer shadow-xs"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add first item</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: DISPLAY */}
      {activeTab === 'display' && (
        <div className="space-y-8 sm:space-y-9">
          {/* SECTION A: TITLE */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-base sm:text-[17px] font-bold text-[#1F1F1F]">
                Collection title
              </label>
              <span className="text-xs text-[#6F6F6B] font-mono">
                {title.length}/100
              </span>
            </div>
            <div className="relative">
              <input
                type="text"
                value={title}
                maxLength={100}
                onChange={handleTitleChange}
                placeholder="e.g. Recommended Reading"
                className="w-full h-12 sm:h-[50px] px-4 rounded-[12px] bg-[#FFFFFF] border border-[#D9D9D9] text-[15px] font-medium text-[#1F1F1F] focus:outline-none focus:border-[#1F1F1F] focus:ring-1 focus:ring-[#1F1F1F] transition-all pr-10"
              />
              <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#999995] pointer-events-none">
                <Pencil className="h-4 w-4" />
              </div>
            </div>
          </div>

          {/* SECTION B: LAYOUT OPTIONS */}
          <div className="space-y-3">
            <div>
              <h3 className="text-base sm:text-[17px] font-bold text-[#1F1F1F]">
                Display layout
              </h3>
              <p className="text-xs sm:text-[13px] text-[#6F6F6B] mt-0.5">
                Choose how items inside this collection are displayed to storefront visitors.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {COLLECTION_LAYOUTS.map((opt) => {
                const isSelected = layout === opt.id

                return (
                  <div
                    key={opt.id}
                    onClick={() => handleLayoutChange(opt.id)}
                    className={`rounded-[12px] p-4 transition-all cursor-pointer flex flex-col justify-between gap-3 ${
                      isSelected
                        ? 'border-2 border-[#1F1F1F] bg-[#FFFFFF] shadow-sm'
                        : 'border border-[#D9D9D9] bg-[#FFFFFF] hover:border-[#999995]'
                    }`}
                  >
                    {/* Visual diagram */}
                    {opt.diagram}

                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-bold text-[#1F1F1F]">{opt.label}</p>
                        <p className="text-xs text-[#6F6F6B]">{opt.description}</p>
                      </div>
                      <div
                        className={`h-4 w-4 rounded-full border flex items-center justify-center ${
                          isSelected
                            ? 'border-[#1F1F1F] bg-[#1F1F1F]'
                            : 'border-[#999995]'
                        }`}
                      >
                        {isSelected && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </StoreItemEditorShell>
  )
}
