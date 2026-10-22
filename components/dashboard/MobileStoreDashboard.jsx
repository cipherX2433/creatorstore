'use client'

import React, { useState, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  Share2,
  MoreHorizontal,
  MoreVertical,
  Plus,
  Folder,
  FolderPlus,
  Camera,
  Instagram,
  Youtube,
  ExternalLink,
  Eye,
  Palette,
  Sparkles,
  Wrench,
  Pencil,
  Copy,
  Trash2,
  Check,
  CheckCircle2,
  FileDown,
  Video,
  GraduationCap,
  Package,
  Layers,
  MessageSquare,
  Link2,
  FileText,
  Clock,
  Images,
  Headphones,
  ShoppingBag,
  Power
} from 'lucide-react'
import { toast } from 'sonner'
import { formatMoney } from '@/lib/clientApi'
import { BRAND_COLOR } from '@/components/brand/CreatorStoreBrand'
import { getSocialPlatform } from '@/lib/socialPlatforms'
import MobileAddBottomSheet from '@/components/dashboard/MobileAddBottomSheet'
import MobileProductWizard from '@/components/products/MobileProductWizard'
import MobileStorePreviewModal from '@/components/dashboard/MobileStorePreviewModal'

/**
 * MobileStoreDashboard — Mobile Store content view strictly following Linktree reference Screenshot 2.
 * 
 * Includes:
 * - Header: Back arrow, handle @username, overflow menu (...), share button
 * - Profile Section: Compact avatar (72px) with upload trigger, handle @username, connected social icons, status badge
 * - Primary Tab: Store with CreatorStore orange active indicator
 * - Action Buttons: [ 📁 Add collection ] [ + Add ]
 * - Content List: Compact cards with thumbnail, title, metadata (clicks, price), setup badge, 3-dot overflow menu
 * - Floating Bottom Action Pill: Add | Preview | Design
 * - Mobile Add Bottom Sheet, Mobile Product Wizard & Mobile Store Preview Modal
 */
export default function MobileStoreDashboard({
  store,
  storeSlug,
  profile,
  products = [],
  contentSections = [],
  pages = [],
  activePageId = null,
  setActivePageId,
  igAccount,
  me,
  onAddCollection,
  onOpenAddModal, // (type: string) => void
  onEditProduct, // (productId: string) => void
  onEditSection, // (section: any) => void
  onDeleteSection, // (sectionId: string) => void
  onDuplicateSection, // (sectionId: string) => void
  onToggleHidden, // (sectionId: string) => void
  onOpenShare,
  onOpenAvatar,
  onTabChange, // (tabName: 'design' | 'section') => void
  refreshStoreData,
  setProducts,
  setStore,
}) {
  const router = useRouter()

  // Modals & Bottom Sheets
  const [addSheetOpen, setAddSheetOpen] = useState(false)
  const [productWizardOpen, setProductWizardOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState(null)
  const [previewModalOpen, setPreviewModalOpen] = useState(false)

  // Header & Card dropdown menus
  const [headerMenuOpen, setHeaderMenuOpen] = useState(false)
  const [activeCardMenuId, setActiveCardMenuId] = useState(null)
  const [deleteConfirmSection, setDeleteConfirmSection] = useState(null)

  const rawUsername = storeSlug || store?.username || me?.store?.username || 'creator'
  const cleanUsername = rawUsername.replace(/^@/, '')
  const liveStoreUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/${cleanUsername}`
    : `/${cleanUsername}`

  // Unified store content sections list (links, digital products, coaching, courses, collections, forms)
  const filteredSections = contentSections

  function handleSelectAddOption(type, payload) {
    if (type === 'collection') {
      onAddCollection?.()
    } else if (type === 'product') {
      setEditingProduct(null)
      setProductWizardOpen(true)
    } else if (type === 'link') {
      onOpenAddModal?.('link')
    } else if (type === 'form' || type === 'form_contact' || type === 'form_newsletter') {
      onOpenAddModal?.(type)
    } else if (type === 'link_direct') {
      onOpenAddModal?.('link_direct', payload)
    } else if (type === 'coaching') {
      setEditingProduct(null)
      setProductWizardOpen(true)
    } else {
      onOpenAddModal?.(type, payload)
    }
  }

  function handleCardEdit(section) {
    setActiveCardMenuId(null)
    const prodId = section.props?.productId
    const targetProd = prodId ? products.find((p) => p.id === prodId) : null

    // 1. Form items
    if (section.type === 'form') {
      onEditSection?.(section)
      return
    }

    // 2. Bundle items (must open BundleEditor, never MobileProductWizard)
    const isBundle =
      section.type === 'bundle' ||
      targetProd?.type === 'BUNDLE' ||
      (Array.isArray(targetProd?.bundleProductIds) && targetProd.bundleProductIds.length > 0) ||
      (Array.isArray(section.props?.bundleProductIds) && section.props.bundleProductIds.length > 0) ||
      (Array.isArray(targetProd?.bundleItems) && targetProd.bundleItems.length > 0)

    if (isBundle) {
      onEditSection?.(section)
      return
    }

    // 3. Coaching items (must open BookingEditor)
    const isBooking =
      section.type === 'coaching' ||
      targetProd?.type === 'COACHING' ||
      section.props?.sessionDuration !== undefined

    if (isBooking) {
      onEditSection?.(section)
      return
    }

    // 4. Standard digital products / courses
    if (targetProd && targetProd.id) {
      onEditProduct?.(targetProd.id)
      return
    }
    if (section.type === 'product' && prodId) {
      onEditProduct?.(prodId)
      return
    }

    // 5. All other section types (link, social, collection, gallery, youtube, media, text, etc.)
    onEditSection?.(section)
  }

  function handleCopyStoreLink() {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(liveStoreUrl)
      toast.success('Storefront link copied to clipboard!')
    }
    setHeaderMenuOpen(false)
  }

  return (
    <div className="flex flex-col w-full min-h-screen bg-[#FBFAF9] text-[#1F1F1F]">

      {/* 1. TOP MOBILE HEADER (Matching Reference Image 3) */}
      <div className="flex items-center justify-between px-4 h-14 bg-[#FFFFFF] border-b border-[#E5E5E3] sticky top-0 z-30 shrink-0">
        <Link
          href="/dashboard"
          className="p-2 -ml-2 rounded-full text-[#1F1F1F] hover:bg-[#F2F1EF] transition-colors"
          aria-label="Back to dashboard"
        >
          <ArrowLeft className="h-5 w-5 stroke-[2.2]" />
        </Link>

        {/* Username in Center */}
        <span className="text-sm font-bold text-[#1F1F1F] truncate max-w-[180px]">
          @{cleanUsername}
        </span>

        {/* Right Header Controls: Overflow menu & Share button */}
        <div className="flex items-center gap-1.5 -mr-1 relative">
          <button
            type="button"
            onClick={() => setHeaderMenuOpen((v) => !v)}
            className="p-2 rounded-full text-[#71717A] hover:text-[#1F1F1F] hover:bg-[#F2F1EF] transition-colors cursor-pointer"
            aria-label="Store options"
          >
            <MoreHorizontal className="h-5 w-5 stroke-[2]" />
          </button>

          <button
            type="button"
            onClick={onOpenShare}
            className="p-2 rounded-full text-[#71717A] hover:text-[#1F1F1F] hover:bg-[#F2F1EF] transition-colors cursor-pointer"
            aria-label="Share store"
          >
            <Share2 className="h-5 w-5 stroke-[1.8]" />
          </button>

          {/* Header Dropdown Menu */}
          {headerMenuOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setHeaderMenuOpen(false)}
              />
              <div className="absolute right-0 top-11 z-50 w-48 rounded-2xl bg-[#FFFFFF] border border-[#E5E5E3] shadow-lg p-1 space-y-0.5">
                <a
                  href={liveStoreUrl}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => setHeaderMenuOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-[#1F1F1F] hover:bg-[#F5F5F3] transition-colors"
                >
                  <ExternalLink className="h-4 w-4 text-[#71717A]" />
                  <span>View live store</span>
                </a>
                <button
                  type="button"
                  onClick={handleCopyStoreLink}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-[#1F1F1F] hover:bg-[#F5F5F3] transition-colors text-left"
                >
                  <Copy className="h-4 w-4 text-[#71717A]" />
                  <span>Copy store link</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setHeaderMenuOpen(false)
                    onTabChange?.('design')
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-[#1F1F1F] hover:bg-[#F5F5F3] transition-colors text-left"
                >
                  <Palette className="h-4 w-4 text-[#71717A]" />
                  <span>Design theme</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* 2. STORE PROFILE SECTION (Matching Reference Image 3) */}
      <div className="px-4 pt-3.5 pb-3 bg-[#FFFFFF] border-b border-[#E5E5E3] flex flex-col items-center text-center">
        {/* Creator Avatar with camera trigger - Target 64–80px (72px) */}
        <div
          onClick={onOpenAvatar}
          className="relative w-[72px] h-[72px] min-w-[72px] min-h-[72px] max-w-[72px] max-h-[72px] rounded-full bg-[#E5E7EB] flex items-center justify-center overflow-hidden cursor-pointer group border border-[#E5E5E3] shadow-xs shrink-0"
          title="Upload profile picture"
        >
          {store?.theme?.avatarUrl || store?.avatarUrl || profile?.avatarUrl ? (
            <img
              src={store?.theme?.avatarUrl || store?.avatarUrl || profile?.avatarUrl}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            <span className="text-xl font-bold text-[#1F1F1F]">
              {(cleanUsername || 'C')[0].toUpperCase()}
            </span>
          )}
          <div className="absolute inset-0 bg-black/35 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
            <Camera className="h-5 w-5 text-white" />
          </div>
        </div>

        {/* Username */}
        <h2 className="text-sm font-bold text-[#1F1F1F] mt-2 tracking-tight truncate max-w-full">
          @{cleanUsername}
        </h2>

        {/* Social Links Row */}
        <div className="flex items-center gap-1.5 mt-1.5">
          {igAccount?.connected ? (
            <a
              href={`https://instagram.com/${String(igAccount.username).replace(/^@/, '')}`}
              target="_blank"
              rel="noreferrer"
              className="h-7 w-7 rounded-full bg-[#F2F1EF] hover:bg-[#EAE9E6] flex items-center justify-center text-[#1F1F1F] transition-colors"
              title={`@${igAccount.username}`}
            >
              <Instagram className="h-4 w-4" />
            </a>
          ) : (
            <button
              type="button"
              onClick={() => onOpenAddModal?.('social')}
              className="h-7 w-7 rounded-full bg-[#F2F1EF] hover:bg-[#EAE9E6] flex items-center justify-center text-[#71717A] hover:text-[#1F1F1F] transition-colors cursor-pointer"
              title="Connect Instagram"
            >
              <Instagram className="h-4 w-4" />
            </button>
          )}

          <button
            type="button"
            onClick={() => onOpenAddModal?.('social')}
            className="h-7 w-7 rounded-full border border-dashed border-[#D1D5DB] hover:border-[#1F1F1F] flex items-center justify-center text-[#71717A] hover:text-[#1F1F1F] transition-colors cursor-pointer"
            title="Add social icon"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Followers / Public Status Pill */}
        <div className="mt-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full border border-[#E5E5E3] bg-[#F9F9F8] text-[11px] font-semibold text-[#71717A]">
            <span className={`h-1.5 w-1.5 rounded-full ${store?.published ? 'bg-[#16A34A]' : 'bg-[#9CA3AF]'}`} />
            <span>{store?.published ? 'Storefront live' : 'Draft store'}</span>
          </span>
        </div>
      </div>

      {/* 3. STORE TAB (Consolidated single primary content tab with orange active indicator) */}
      <div className="bg-[#FFFFFF] border-b border-[#E5E5E3] px-5 flex items-center shrink-0">
        <div
          role="tab"
          aria-selected="true"
          className="py-3 text-sm font-bold text-[#1F1F1F] relative cursor-default"
        >
          <span>Store</span>
          <div
            className="absolute bottom-0 left-0 right-0 h-0.5"
            style={{ backgroundColor: BRAND_COLOR }}
          />
        </div>
      </div>

      {/* 4. MAIN ACTION BUTTONS: [ 📁 Add collection ] [ + Add ] (Screenshot 2) */}
      <div className="p-4 flex items-center gap-3 shrink-0">
        <button
          type="button"
          onClick={onAddCollection}
          className="flex-1 inline-flex items-center justify-center gap-2 h-11 px-4 rounded-full bg-[#FFFFFF] hover:bg-[#F9F9F8] border border-[#E5E5E3] text-xs font-bold text-[#1F1F1F] shadow-2xs transition-colors cursor-pointer"
        >
          <Folder className="h-4 w-4" />
          <span>Add collection</span>
        </button>

        <button
          type="button"
          onClick={() => setAddSheetOpen(true)}
          className="flex-1 inline-flex items-center justify-center gap-2 h-11 px-4 rounded-full bg-[#1F1F1F] hover:bg-black text-white text-xs font-bold shadow-2xs transition-colors cursor-pointer"
        >
          <Plus className="h-4 w-4 stroke-[2.5]" />
          <span>Add</span>
        </button>
      </div>

      {/* 5. CONTENT ITEMS LIST (Screenshot 2) */}
      <div className="flex-1 min-h-0 px-4 pb-36 space-y-2.5">
        {filteredSections.length > 0 ? (
          filteredSections.map((s) => {
            const isMenuOpen = activeCardMenuId === s.id
            const prod = s.type === 'product' || s.type === 'course'
              ? products.find((p) => p.id === s.props?.productId)
              : null

            const isDraft = prod ? prod.status === 'DRAFT' : s.hidden
            const isSetupIncomplete = prod ? (!prod.fileId && !prod.fileName && !prod.redirectUrl && prod.type === 'DIGITAL_DOWNLOAD') : false

            // Card title
            const title = prod?.title || s.props?.title || s.props?.label || s.props?.text || 'Untitled Item'

            // Thumbnail / Icon
            const thumbUrl = prod?.thumbnail || s.props?.thumbnail || s.props?.customThumbnail
            const isCollection = s.type === 'collection' || s.type === 'product_collection'

            // Metadata text
            let metaText = ''
            if (isCollection) {
              const count = s.props?.items?.length || 0
              metaText = `0 clicks · ${count} ${count === 1 ? 'item' : 'items'}`
            } else if (prod) {
              const priceLabel = Number(prod.price) === 0 ? 'Free' : formatMoney(prod.price, prod.currency)
              metaText = `0 clicks · ${priceLabel}`
            } else if (s.props?.url) {
              try {
                const host = new URL(s.props.url).hostname.replace('www.', '')
                metaText = `0 clicks · ${host}`
              } catch {
                metaText = '0 clicks'
              }
            } else {
              metaText = '0 clicks'
            }

            return (
              <div
                key={s.id}
                className="relative flex items-center justify-between p-3 rounded-2xl bg-[#FFFFFF] border border-[#E5E5E3] shadow-2xs hover:border-[#DADAD7] transition-all"
              >
                {/* Left: Thumbnail or Type Icon */}
                <div
                  onClick={() => handleCardEdit(s)}
                  className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer"
                >
                  <div className="h-12 w-12 rounded-[14px] bg-[#F2F1EF] border border-[#E5E5E3] overflow-hidden flex items-center justify-center shrink-0">
                    {thumbUrl ? (
                      <img src={thumbUrl} alt="" className="h-full w-full object-cover" />
                    ) : isCollection ? (
                      <Folder className="h-6 w-6 text-[#1F1F1F]" />
                    ) : s.type === 'youtube' ? (
                      <Youtube className="h-6 w-6 text-[#EF4444]" />
                    ) : s.type === 'instagram' ? (
                      <Instagram className="h-6 w-6 text-[#E1306C]" />
                    ) : s.type === 'form' ? (
                      <MessageSquare className="h-6 w-6 text-[#0D9488]" />
                    ) : s.type === 'coaching' ? (
                      <Video className="h-6 w-6 text-[#8B5CF6]" />
                    ) : (
                      <Package className="h-6 w-6 text-[#1F1F1F]" />
                    )}
                  </div>

                  {/* Middle: Title & Metadata */}
                  <div className="min-w-0 flex-1 pr-2">
                    <p className="text-sm font-bold text-[#1F1F1F] truncate leading-tight">
                      {title}
                    </p>
                    <p className="text-xs text-[#71717A] truncate mt-1">
                      {metaText}
                    </p>
                  </div>
                </div>

                {/* Right: Setup badge & 3-dot overflow menu */}
                <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                  {(isDraft || isSetupIncomplete) && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleCardEdit(s)
                      }}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#FEF3C7] text-[#D97706] text-[11px] font-bold cursor-pointer hover:bg-[#FDE68A] transition-colors"
                    >
                      <Wrench className="h-3 w-3" />
                      <span>Setup</span>
                    </button>
                  )}

                  <div className="relative">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        setActiveCardMenuId(isMenuOpen ? null : s.id)
                      }}
                      className="p-1.5 rounded-full text-[#71717A] hover:text-[#1F1F1F] hover:bg-[#F2F1EF] transition-colors cursor-pointer"
                      aria-label="Item options"
                    >
                      <MoreVertical className="h-4.5 w-4.5" />
                    </button>

                    {/* Card Overflow Menu */}
                    {isMenuOpen && (
                      <>
                        <div
                          className="fixed inset-0 z-40"
                          onClick={(e) => {
                            e.stopPropagation()
                            setActiveCardMenuId(null)
                          }}
                        />
                        <div
                          className="absolute right-0 top-8 z-50 w-44 rounded-2xl bg-[#FFFFFF] border border-[#E5E5E3] shadow-lg p-1 space-y-0.5 animate-in fade-in duration-150"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              setActiveCardMenuId(null)
                              handleCardEdit(s)
                            }}
                            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-[#1F1F1F] hover:bg-[#F5F5F3] transition-colors text-left"
                          >
                            <Pencil className="h-3.5 w-3.5 text-[#71717A]" />
                            <span>Edit item</span>
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              setActiveCardMenuId(null)
                              setPreviewModalOpen(true)
                            }}
                            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-[#1F1F1F] hover:bg-[#F5F5F3] transition-colors text-left"
                          >
                            <Eye className="h-3.5 w-3.5 text-[#71717A]" />
                            <span>Preview</span>
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              setActiveCardMenuId(null)
                              onDuplicateSection?.(s.id)
                            }}
                            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-[#1F1F1F] hover:bg-[#F5F5F3] transition-colors text-left"
                          >
                            <Copy className="h-3.5 w-3.5 text-[#71717A]" />
                            <span>Duplicate</span>
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              setActiveCardMenuId(null)
                              onToggleHidden?.(s.id)
                            }}
                            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-[#1F1F1F] hover:bg-[#F5F5F3] transition-colors text-left"
                          >
                            <Power className="h-3.5 w-3.5 text-[#71717A]" />
                            <span>{s.hidden ? 'Show on store' : 'Hide from store'}</span>
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              setActiveCardMenuId(null)
                              setDeleteConfirmSection(s)
                            }}
                            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-[#DC2626] hover:bg-rose-50 transition-colors text-left"
                          >
                            <Trash2 className="h-3.5 w-3.5 text-[#DC2626]" />
                            <span>Delete</span>
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )
          })
        ) : (
          /* Empty state for Store */
          <div className="py-12 px-4 text-center rounded-2xl border border-dashed border-[#E5E5E3] bg-[#FFFFFF] space-y-3">
            <div className="h-12 w-12 rounded-full bg-[#F2F1EF] mx-auto flex items-center justify-center text-[#71717A]">
              <Package className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-bold text-[#1F1F1F]">
                Your store is empty
              </p>
              <p className="text-xs text-[#71717A] max-w-xs mx-auto">
                Add links, products, courses, or forms to start sharing and earning.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setAddSheetOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#1F1F1F] text-white text-xs font-bold shadow-xs hover:bg-black transition-colors cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add to store</span>
            </button>
          </div>
        )}
      </div>

      {/* 6. FLOATING BOTTOM EDITOR ACTION PILL */}
      <div className="fixed bottom-[68px] left-1/2 -translate-x-1/2 z-30 select-none">
        <div className="flex items-center gap-5 px-6 py-2.5 rounded-full bg-[#FFFFFF] border border-[#E5E5E3] shadow-[0_8px_30px_rgba(0,0,0,0.12)]">
          <button
            type="button"
            onClick={() => setAddSheetOpen(true)}
            className="flex items-center gap-1.5 text-xs font-bold text-[#1F1F1F] hover:text-[#000000] cursor-pointer"
          >
            <Plus className="h-4 w-4 stroke-[2.5]" />
            <span>Add</span>
          </button>

          <div className="h-3.5 w-px bg-[#E5E5E3]" />

          <button
            type="button"
            onClick={() => setPreviewModalOpen(true)}
            className="flex items-center gap-1.5 text-xs font-bold text-[#1F1F1F] hover:text-[#000000] cursor-pointer"
          >
            <Eye className="h-4 w-4" />
            <span>Preview</span>
          </button>

          <div className="h-3.5 w-px bg-[#E5E5E3]" />

          <button
            type="button"
            onClick={() => onTabChange?.('design')}
            className="flex items-center gap-1.5 text-xs font-bold text-[#1F1F1F] hover:text-[#000000] cursor-pointer"
          >
            <Palette className="h-4 w-4" />
            <span>Design</span>
          </button>
        </div>
      </div>

      {/* 7. MOBILE ADD BOTTOM SHEET (Screenshot 3) */}
      <MobileAddBottomSheet
        isOpen={addSheetOpen}
        onClose={() => setAddSheetOpen(false)}
        onSelectOption={handleSelectAddOption}
      />

      {/* 8. COMPLETE MOBILE PRODUCT CREATION & EDIT WIZARD (Phase 4 & 5) */}
      <MobileProductWizard
        isOpen={productWizardOpen}
        onClose={() => {
          setProductWizardOpen(false)
          setEditingProduct(null)
        }}
        initialProduct={editingProduct}
        activePageId={activePageId}
        onSuccess={(savedProduct, isEditMode) => {
          if (isEditMode) {
            setProducts?.((prev) => prev.map((p) => p.id === savedProduct.id ? { ...p, ...savedProduct } : p))
          } else {
            setProducts?.((prev) => [savedProduct, ...prev])
          }
          refreshStoreData?.()
        }}
      />

      {/* 9. MOBILE STORE PREVIEW MODAL (Screenshot 4) */}
      <MobileStorePreviewModal
        isOpen={previewModalOpen}
        onClose={() => setPreviewModalOpen(false)}
        store={store}
        storeSlug={cleanUsername}
        profile={profile}
        products={products}
        pages={pages}
        activePageId={activePageId}
        onSelectPage={setActivePageId}
        onShare={onOpenShare}
      />

      {/* DELETE CONFIRMATION DIALOG */}
      {deleteConfirmSection && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/50">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 space-y-4 shadow-xl">
            <h3 className="text-base font-bold text-[#1F1F1F]">Delete this item?</h3>
            <p className="text-xs text-[#71717A]">
              Are you sure you want to delete this item? This action cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmSection(null)}
                className="px-4 py-2 rounded-full text-xs font-semibold text-[#1F1F1F] hover:bg-[#F2F1EF]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const targetId = deleteConfirmSection.id
                  setDeleteConfirmSection(null)
                  onDeleteSection?.(targetId)
                }}
                className="px-4 py-2 rounded-full text-xs font-bold text-white bg-rose-600 hover:bg-rose-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
