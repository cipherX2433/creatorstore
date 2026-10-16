'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { api, formatMoney } from '@/lib/clientApi'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { BaseModal } from '@/components/ui/base-modal'
import { IconBadge, ICON_BADGE_COLORS } from '@/components/ui/icon-badge'
import ProductManagementModal from '@/components/products/ProductManagementModal'
import AddToStoreModal from '@/components/dashboard/AddToStoreModal'
import {
  Plus, Package, MoreVertical, Pencil, Trash2, Eye, EyeOff, Loader2, Copy,
  ExternalLink, Search, Bot, AlertTriangle, Store,
  GraduationCap, Video, Users, Radio, Briefcase, BookOpen,
  Calendar, Layers, Sparkles, Clock
} from 'lucide-react'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'

import { useDashboardHeader } from '@/components/dashboard/HeaderContext'
import { useDashboard } from '@/components/dashboard/DashboardContext'
import { trackProductCreated, trackProductPublished } from '@/lib/analytics'

const TABS = [
  { id: 'all', label: 'All' },
  { id: 'PUBLISHED', label: 'Published' },
  { id: 'DRAFT', label: 'Draft' },
]

function normalizeProductType(type) {
  const t = String(type || '').toUpperCase().trim()
  if (t === 'COURSE' || t.includes('COURSE')) return 'COURSE'
  if (t === 'COACHING' || t === 'BOOKING' || t.includes('COACH') || t.includes('BOOK')) return 'COACHING'
  if (t === 'MEMBERSHIP' || t === 'COMMUNITY' || t.includes('MEMBER') || t.includes('COMMUN')) return 'MEMBERSHIP'
  if (t === 'EBOOK' || t === 'PDF') return 'EBOOK'
  if (t === 'WEBINAR' || t.includes('WEBINAR')) return 'WEBINAR'
  if (t === 'CUSTOM_SERVICE' || t === 'CUSTOM_PRODUCT' || t === 'SERVICE') return 'CUSTOM_SERVICE'
  if (t === 'EXTERNAL_LINK' || t.includes('LINK')) return 'EXTERNAL_LINK'
  return 'DIGITAL'
}

function getProductTypeLabel(rawType) {
  const type = normalizeProductType(rawType)
  switch (type) {
    case 'COURSE': return 'Course'
    case 'COACHING': return 'Coaching'
    case 'MEMBERSHIP': return 'Membership'
    case 'EBOOK': return 'E-Book / Guide'
    case 'WEBINAR': return 'Webinar'
    case 'CUSTOM_SERVICE': return 'Custom Service'
    case 'EXTERNAL_LINK': return 'External Link'
    default: return 'Digital Product'
  }
}

function getProductTypeMeta(rawType) {
  const type = normalizeProductType(rawType)
  switch (type) {
    case 'COURSE':
      return { icon: GraduationCap, color: ICON_BADGE_COLORS.courses }
    case 'MEMBERSHIP':
      return { icon: Users, color: ICON_BADGE_COLORS.membership }
    case 'COACHING':
      return { icon: Video, color: ICON_BADGE_COLORS.coaching }
    case 'WEBINAR':
      return { icon: Radio, color: ICON_BADGE_COLORS.webinar }
    case 'CUSTOM_SERVICE':
      return { icon: Briefcase, color: ICON_BADGE_COLORS.services }
    case 'EBOOK':
      return { icon: BookOpen, color: ICON_BADGE_COLORS.pdf }
    default:
      return { icon: Package, color: ICON_BADGE_COLORS.product }
  }
}

function ProductThumbnail({ product }) {
  const meta = getProductTypeMeta(product.type)
  const TypeIcon = meta.icon

  if (product.thumbnail) {
    return (
      <img
        src={product.thumbnail}
        alt=""
        className="h-11 w-11 rounded-[10px] object-cover shrink-0 bg-[#F2F1EF] border border-[#E5E5E3]"
      />
    )
  }

  return (
    <IconBadge color={meta.color}>
      <TypeIcon className="h-5 w-5" />
    </IconBadge>
  )
}

function StatusPill({ published }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold ${published
          ? 'bg-[#16A34A]/10 text-[#16A34A]'
          : 'bg-[#F2F1EF] text-[#6F6F6B]'
        }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${published ? 'bg-[#16A34A]' : 'bg-[#999995]'}`} />
      {published ? 'Published' : 'Draft'}
    </span>
  )
}

function ProductActionsMenu({
  product,
  busy,
  onOpenModal,
  onEdit,
  onView,
  onToggleStore,
  onPromote,
  onTogglePublish,
  onDuplicate,
  onDelete,
}) {
  const isPublished = product.status === 'PUBLISHED'
  const inStore = product.storePublished !== false
  const normType = normalizeProductType(product.type)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
        <Button
          size="sm"
          variant="ghost"
          disabled={busy === product.id}
          aria-label="Product actions"
          className="h-8 w-8 p-0 text-[#6F6F6B] hover:text-[#1F1F1F] hover:bg-[#F5F5F3] rounded-full cursor-pointer"
        >
          {busy === product.id ? (
            <Loader2 className="h-4 w-4 animate-spin text-[#1F1F1F]" />
          ) : (
            <MoreVertical className="h-4 w-4" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="rounded-xl p-1 bg-[#FFFFFF] border-[#E5E5E3] text-[#1F1F1F] min-w-[180px] shadow-[0_8px_30px_rgba(0,0,0,0.04)]"
      >
        <DropdownMenuItem
          onSelect={() => onOpenModal?.(product, 'overview')}
          className="font-semibold text-xs cursor-pointer focus:bg-[#F5F5F3] focus:text-[#1F1F1F]"
        >
          <Eye className="mr-2 h-3.5 w-3.5 text-[#1F1F1F]" /> Open
        </DropdownMenuItem>

        <DropdownMenuItem
          onSelect={() => onEdit?.()}
          className="font-semibold text-xs cursor-pointer focus:bg-[#F5F5F3] focus:text-[#1F1F1F]"
        >
          <Pencil className="mr-2 h-3.5 w-3.5 text-[#1F1F1F]" />
          {normType === 'COURSE' ? 'Edit Course' : (normType === 'COACHING' ? 'Edit Booking' : (normType === 'MEMBERSHIP' ? 'Edit Membership' : 'Edit Product'))}
        </DropdownMenuItem>

        {/* Type-Specific Navigation Actions */}
        {normType === 'COURSE' ? (
          <>
            <DropdownMenuItem
              onSelect={() => onOpenModal?.(product, 'students')}
              className="font-semibold text-xs cursor-pointer focus:bg-[#F5F5F3] focus:text-[#1F1F1F]"
            >
              <GraduationCap className="mr-2 h-3.5 w-3.5 text-[#1F1F1F]" /> View Students
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() => onOpenModal?.(product, 'curriculum')}
              className="font-semibold text-xs cursor-pointer focus:bg-[#F5F5F3] focus:text-[#1F1F1F]"
            >
              <BookOpen className="mr-2 h-3.5 w-3.5 text-[#1F1F1F]" /> Curriculum
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() => onOpenModal?.(product, 'analytics')}
              className="font-semibold text-xs cursor-pointer focus:bg-[#F5F5F3] focus:text-[#1F1F1F]"
            >
              <Sparkles className="mr-2 h-3.5 w-3.5 text-[#1F1F1F]" /> Analytics
            </DropdownMenuItem>
          </>
        ) : normType === 'COACHING' ? (
          <>
            <DropdownMenuItem
              onSelect={() => onOpenModal?.(product, 'bookings')}
              className="font-semibold text-xs cursor-pointer focus:bg-[#F5F5F3] focus:text-[#1F1F1F]"
            >
              <Calendar className="mr-2 h-3.5 w-3.5 text-[#1F1F1F]" /> View Bookings
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() => onOpenModal?.(product, 'calendar')}
              className="font-semibold text-xs cursor-pointer focus:bg-[#F5F5F3] focus:text-[#1F1F1F]"
            >
              <Clock className="mr-2 h-3.5 w-3.5 text-[#1F1F1F]" /> Calendar
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() => onOpenModal?.(product, 'availability')}
              className="font-semibold text-xs cursor-pointer focus:bg-[#F5F5F3] focus:text-[#1F1F1F]"
            >
              <Layers className="mr-2 h-3.5 w-3.5 text-[#1F1F1F]" /> Availability
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() => onOpenModal?.(product, 'overview')}
              className="font-semibold text-xs cursor-pointer focus:bg-[#F5F5F3] focus:text-[#1F1F1F]"
            >
              <Sparkles className="mr-2 h-3.5 w-3.5 text-[#1F1F1F]" /> Analytics
            </DropdownMenuItem>
          </>
        ) : normType === 'MEMBERSHIP' ? (
          <>
            <DropdownMenuItem
              onSelect={() => onOpenModal?.(product, 'members')}
              className="font-semibold text-xs cursor-pointer focus:bg-[#F5F5F3] focus:text-[#1F1F1F]"
            >
              <Users className="mr-2 h-3.5 w-3.5 text-[#1F1F1F]" /> View Members
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() => onOpenModal?.(product, 'content')}
              className="font-semibold text-xs cursor-pointer focus:bg-[#F5F5F3] focus:text-[#1F1F1F]"
            >
              <BookOpen className="mr-2 h-3.5 w-3.5 text-[#1F1F1F]" /> Content
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() => onOpenModal?.(product, 'analytics')}
              className="font-semibold text-xs cursor-pointer focus:bg-[#F5F5F3] focus:text-[#1F1F1F]"
            >
              <Sparkles className="mr-2 h-3.5 w-3.5 text-[#1F1F1F]" /> Analytics
            </DropdownMenuItem>
          </>
        ) : (
          <>
            <DropdownMenuItem
              onSelect={() => onOpenModal?.(product, 'customers')}
              className="font-semibold text-xs cursor-pointer focus:bg-[#F5F5F3] focus:text-[#1F1F1F]"
            >
              <Users className="mr-2 h-3.5 w-3.5 text-[#1F1F1F]" /> View Customers
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() => onOpenModal?.(product, 'orders')}
              className="font-semibold text-xs cursor-pointer focus:bg-[#F5F5F3] focus:text-[#1F1F1F]"
            >
              <Package className="mr-2 h-3.5 w-3.5 text-[#1F1F1F]" /> View Orders
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() => onOpenModal?.(product, 'overview')}
              className="font-semibold text-xs cursor-pointer focus:bg-[#F5F5F3] focus:text-[#1F1F1F]"
            >
              <Sparkles className="mr-2 h-3.5 w-3.5 text-[#1F1F1F]" /> Analytics
            </DropdownMenuItem>
          </>
        )}

        {isPublished && (
          <DropdownMenuItem
            onSelect={() => onView?.()}
            className="font-semibold text-xs cursor-pointer focus:bg-[#F5F5F3] focus:text-[#1F1F1F]"
          >
            <ExternalLink className="mr-2 h-3.5 w-3.5 text-[#1F1F1F]" /> View
          </DropdownMenuItem>
        )}
        <DropdownMenuItem
          onSelect={() => onToggleStore?.()}
          className="font-semibold text-xs cursor-pointer focus:bg-[#F5F5F3] focus:text-[#1F1F1F]"
        >
          <Store className="mr-2 h-3.5 w-3.5 text-[#1F1F1F]" />
          {inStore ? 'Remove from Store' : 'Add to Store'}
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={() => onPromote?.()}
          className="font-semibold text-xs cursor-pointer focus:bg-[#F5F5F3] focus:text-[#1F1F1F]"
        >
          <Bot className="mr-2 h-3.5 w-3.5 text-[#1F1F1F]" /> Promote on IG
        </DropdownMenuItem>
        <DropdownMenuSeparator className="bg-[#E5E5E3]" />
        <DropdownMenuItem
          onSelect={() => onTogglePublish?.()}
          className="font-semibold text-xs cursor-pointer focus:bg-[#F5F5F3] focus:text-[#1F1F1F]"
        >
          {isPublished ? (
            <>
              <EyeOff className="mr-2 h-3.5 w-3.5 text-[#6F6F6B]" /> Unpublish
            </>
          ) : (
            <>
              <Eye className="mr-2 h-3.5 w-3.5 text-[#22C55E]" /> Publish
            </>
          )}
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={() => onDuplicate?.()}
          className="font-semibold text-xs cursor-pointer focus:bg-[#EEF1FB] focus:text-[#010619]"
        >
          <Copy className="mr-2 h-3.5 w-3.5 text-[#6B7399]" /> Duplicate
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={() => onDelete?.()}
          className="font-semibold text-xs text-[#EF4444] focus:bg-[#EF4444]/10 focus:text-[#EF4444] cursor-pointer"
        >
          <Trash2 className="mr-2 h-3.5 w-3.5" /> Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export default function ProductsClient() {
  const router = useRouter()
  const { me } = useDashboard()
  const { setPricingModalOpen } = useDashboardHeader()

  const sub = me?.subscription
  const isPaid = Boolean(sub?.status === 'ACTIVE' && !sub?.isTrial && sub?.planId !== 'UNSUBSCRIBED' && sub?.plan !== 'UNSUBSCRIBED')
  const isTrialActive = Boolean(
    !isPaid &&
    (sub?.isTrial || sub?.status === 'TRIALING' || sub?.trialStatus === 'ACTIVE') &&
    !sub?.isTrialExpired &&
    sub?.trialStatus !== 'EXPIRED' &&
    sub?.status !== 'EXPIRED' &&
    (!sub?.trialEndsAt || new Date(sub.trialEndsAt).getTime() > Date.now())
  )
  const canCreate = isPaid || isTrialActive

  const [products, setProducts] = useState(null)
  const [automations, setAutomations] = useState([])
  const [activeTab, setActiveTab] = useState('all')
  const [search, setSearch] = useState('')
  const [busy, setBusy] = useState(null)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [depModal, setDepModal] = useState({ open: false, product: null, action: null, activeAutoName: '' })
  const [deleteModal, setDeleteModal] = useState({ open: false, product: null })

  // Modals state
  const [managementModal, setManagementModal] = useState({ open: false, product: null, tab: 'overview' })
  const [wizardModalOpen, setWizardModalOpen] = useState(false)
  const searchParams = useSearchParams()

  function handleOpenCreateWizard() {
    if (!canCreate) {
      toast.error('Your Pro trial has ended. Upgrade your plan to create products and continue selling.')
      setPricingModalOpen(true)
      return
    }
    setWizardModalOpen(true)
  }

  useEffect(() => {
    const create = searchParams?.get('create')
    const intent = searchParams?.get('intent')
    const wizard = searchParams?.get('wizard')
    if (create === 'true' || intent === 'add_product' || intent === 'new_product' || wizard === 'true') {
      if (!canCreate) {
        toast.error('Your Pro trial has ended. Upgrade your plan to create products and continue selling.')
        setPricingModalOpen(true)
      } else {
        setWizardModalOpen(true)
      }
    }
  }, [searchParams, canCreate, setPricingModalOpen])

  const username = me?.username || me?.store?.slug || 'store'

  const load = (p = page) => {
    Promise.all([
      api.get(`/products?page=${p}&limit=20`),
      api.get('/automations').catch(() => []),
    ])
      .then(([r, autos]) => {
        setProducts(r.products || r.items || [])
        if (r.totalPages) setTotalPages(r.totalPages)
        setAutomations(Array.isArray(autos) ? autos : (autos?.automations || []))
      })
      .catch(() => {
        setProducts([])
        setAutomations([])
      })
  }

  useEffect(() => {
    load(page)
  }, [page])

  function checkAutomationDependency(product) {
    const activeAuto = automations.find(
      (a) => a.productId === product.id && a.status === 'ACTIVE'
    )
    return activeAuto ? activeAuto.name || 'Instagram Auto-DM' : null
  }

  async function handleTogglePublish(p) {
    if (p.status === 'PUBLISHED') {
      const activeAutoName = checkAutomationDependency(p)
      if (activeAutoName) {
        setDepModal({
          open: true,
          product: p,
          action: 'archive',
          activeAutoName,
        })
        return
      }
    }
    await executeTogglePublish(p)
  }

  async function executeTogglePublish(p) {
    setBusy(p.id)
    try {
      if (p.status === 'PUBLISHED') {
        await api.post(`/products/${p.id}/archive`)
        toast.success('Product saved as draft')
      } else {
        await api.post(`/products/${p.id}/publish`)
        trackProductPublished({ product_type: p.type })
        toast.success('Product published')
      }
      await load()
    } catch (e) {
      toast.error(e.message || 'Failed to update product status')
    } finally {
      setBusy(null)
      setDepModal({ open: false, product: null, action: null, activeAutoName: '' })
    }
  }

  function handleRemove(p) {
    const activeAutoName = checkAutomationDependency(p)
    if (activeAutoName) {
      setDepModal({
        open: true,
        product: p,
        action: 'delete',
        activeAutoName,
      })
      return
    }
    setDeleteModal({
      open: true,
      product: p,
    })
  }

  async function executeRemove(p) {
    if (!p?.id) return
    setBusy(p.id)
    try {
      await api.del(`/products/${p.id}`)
      toast.success('Product deleted')
      setDeleteModal({ open: false, product: null })
      setDepModal({ open: false, product: null, action: null, activeAutoName: '' })
      if (managementModal.product?.id === p.id) {
        setManagementModal({ open: false, product: null, tab: 'overview' })
      }
      await load()
    } catch (e) {
      toast.error(e.message || 'Failed to delete product')
    } finally {
      setBusy(null)
    }
  }

  async function toggleStorefront(p) {
    setBusy(p.id)
    try {
      const nextStoreState = !(p.storePublished !== false)
      await api.patch(`/products/${p.id}`, { storePublished: nextStoreState })
      toast.success(nextStoreState ? 'Product added to store' : 'Product removed from store')
      await load()
    } catch (e) {
      toast.error(e.message || 'Failed to update store status')
    } finally {
      setBusy(null)
    }
  }

  async function duplicateProduct(p) {
    if (!canCreate) {
      toast.error('Your Pro trial has ended. Upgrade your plan to create products and continue selling.')
      setPricingModalOpen(true)
      return
    }
    setBusy(p.id)
    try {
      const payload = {
        title: `${p.title} (Copy)`,
        type: p.type || 'DIGITAL_DOWNLOAD',
        price: p.price,
        currency: p.currency || 'INR',
        shortDescription: p.shortDescription,
        description: p.description,
        thumbnail: p.thumbnail,
        status: 'DRAFT',
      }
      await api.post('/products', payload)
      trackProductCreated({ product_type: p.type })
      toast.success('Product duplicated as draft')
      await load()
    } catch (e) {
      toast.error(e.message || 'Failed to duplicate product')
    } finally {
      setBusy(null)
    }
  }

  const { setHeaderConfig } = useDashboardHeader()

  useEffect(() => {
    setHeaderConfig({
      title: 'Products',
      actions: (
        <Button
          onClick={handleOpenCreateWizard}
          className="font-semibold text-xs h-10 px-5 rounded-full text-white bg-[#1F1F1F] hover:bg-[#000000] active:bg-[#111111] flex items-center gap-1.5 cursor-pointer shadow-xs"
        >
          <Plus className="h-4 w-4 stroke-[3]" /> Create Product
        </Button>
      )
    })
  }, [setHeaderConfig, canCreate])

  const filteredProducts = (products || []).filter((p) => {
    const matchesTab = activeTab === 'all' ? true : p.status === activeTab
    const matchesSearch =
      !search || p.title.toLowerCase().includes(search.toLowerCase())
    return matchesTab && matchesSearch
  })

  function productPublicPath(p) {
    return `/${username}/${p.slug || p.id}`
  }

  function productPublicLabel(p) {
    return `creatorstore.store/${username}/${p.slug || p.id}`
  }

  function getPerformanceText(p) {
    if (p.performanceLabel) return p.performanceLabel
    const norm = normalizeProductType(p.type)
    switch (norm) {
      case 'COURSE': return '0 students'
      case 'COACHING': return '0 bookings'
      case 'MEMBERSHIP': return '0 members'
      default: return '0 sales'
    }
  }

  function handleOpenModal(product, tab = 'overview') {
    setManagementModal({
      open: true,
      product,
      tab,
    })
  }

  function rowActions(p) {
    return (
      <ProductActionsMenu
        product={p}
        busy={busy}
        onOpenModal={(prod, tab) => handleOpenModal(prod, tab)}
        onEdit={() => router.push(`/dashboard/products/${p.id}`)}
        onView={() => window.open(productPublicPath(p), '_blank')}
        onToggleStore={() => toggleStorefront(p)}
        onPromote={() => router.push(`/dashboard/automations/new?productId=${p.id}`)}
        onTogglePublish={() => handleTogglePublish(p)}
        onDuplicate={() => duplicateProduct(p)}
        onDelete={() => handleRemove(p)}
      />
    )
  }

  return (
    <div className="space-y-5 max-w-6xl mx-auto text-[#1F1F1F]">
      {/* Mobile Page Header & Quick Add Action */}
      <div className="flex items-center justify-between gap-3 sm:hidden pb-1">
        <div className="min-w-0">
          <h1 className="text-xl font-extrabold text-[#1F1F1F] tracking-tight">Products</h1>
          <p className="text-xs text-[#6F6F6B] truncate">Digital products, courses & downloads</p>
        </div>
        <Button
          onClick={handleOpenCreateWizard}
          className="font-bold text-xs h-9 px-3.5 rounded-full text-[#FFFFFF] bg-[#1F1F1F] hover:bg-[#000000] active:bg-[#111111] flex items-center gap-1.5 shrink-0 cursor-pointer shadow-xs"
        >
          <Plus className="h-3.5 w-3.5 stroke-[3]" /> Add
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#FFFFFF] p-3 rounded-2xl border border-[#E5E5E3] shadow-[0_8px_30px_rgba(0,0,0,0.04)]">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 sm:pb-0 max-w-full">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3.5 py-1.5 sm:px-4 rounded-full text-xs font-semibold transition-all cursor-pointer whitespace-nowrap min-h-[34px] ${
                  isActive
                    ? 'bg-[#1F1F1F] text-white shadow-xs'
                    : 'bg-transparent text-[#6F6F6B] hover:text-[#1F1F1F] hover:bg-[#F5F5F3]'
                }`}
              >
                {tab.label}
              </button>
            )
          })}
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#999995] pointer-events-none" />
          <input
            type="text"
            placeholder="Search products..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-[#FFFFFF] border border-[#E5E5E3] text-[#1F1F1F] placeholder-[#999995] text-xs pl-9 pr-3 py-2 rounded-full w-full min-h-[38px] hover:border-[#DADAD7] focus:outline-none focus:border-[#1F1F1F] focus:ring-1 focus:ring-[#1F1F1F] shadow-xs"
          />
        </div>
      </div>

      {products === null ? (
        <div className="overflow-hidden rounded-2xl border border-[#E5E5E3] bg-[#FFFFFF] shadow-[0_8px_30px_rgba(0,0,0,0.04)]">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-4 border-b border-[#E5E5E3] last:border-b-0">
              <Skeleton className="h-11 w-11 rounded-full bg-[#F5F5F3]" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-40 bg-[#F5F5F3]" />
                <Skeleton className="h-3 w-56 bg-[#F5F5F3]" />
              </div>
            </div>
          ))}
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="rounded-2xl border border-[#E5E5E3] bg-[#FFFFFF] p-8 sm:p-12 text-center flex flex-col items-center justify-center space-y-4 shadow-[0_8px_30px_rgba(0,0,0,0.04)]">
          <IconBadge color={ICON_BADGE_COLORS.product} size="lg">
            <Package className="h-6 w-6" />
          </IconBadge>
          <div className="max-w-md space-y-1">
            <h3 className="text-lg font-bold text-[#1F1F1F]">You haven&apos;t created a product yet</h3>
            <p className="text-xs sm:text-sm text-[#6F6F6B]">
              Create your first digital product, course, booking, or membership and start selling on CreatorStore.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
            <Button
              onClick={handleOpenCreateWizard}
              className="h-10 px-6 font-semibold text-xs bg-[#1F1F1F] text-white hover:bg-[#000000] active:bg-[#111111] rounded-full flex items-center gap-2 cursor-pointer shadow-xs"
            >
              <Plus className="h-4 w-4 stroke-[3]" /> Create product
            </Button>
            <a
              href="https://creatorstore.app/help/products"
              target="_blank"
              rel="noreferrer"
              className="text-xs font-semibold text-[#6F6F6B] hover:text-[#1F1F1F] underline transition-colors"
            >
              Learn how it works
            </a>
          </div>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-[#E5E5E3] bg-[#FFFFFF] shadow-[0_8px_30px_rgba(0,0,0,0.04)]">
          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#E5E5E3] text-[11px] font-bold uppercase tracking-wider text-[#6F6F6B] bg-[#FBFBFB]">
                  <th className="py-3 px-4">Name</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Price</th>
                  <th className="py-3 px-4">Performance</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">⋮</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E5E3]">
                {filteredProducts.map((p) => {
                  const isPublished = p.status === 'PUBLISHED'
                  return (
                    <tr
                      key={p.id}
                      onClick={() => handleOpenModal(p)}
                      className="group hover:bg-[#F5F5F3] transition-colors cursor-pointer"
                    >
                      {/* Name & Thumbnail */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3 min-w-[200px]">
                          <ProductThumbnail product={p} />
                          <div className="min-w-0">
                            <span className="font-bold text-sm text-[#1F1F1F] group-hover:text-[#1F1F1F] transition-colors line-clamp-1">
                              {p.title}
                            </span>
                            <span className="text-[11px] text-[#6F6F6B] line-clamp-1 block">
                              {productPublicLabel(p)}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Type */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="text-xs font-semibold text-[#6F6F6B]">
                          {getProductTypeLabel(p.type)}
                        </span>
                      </td>

                      {/* Price */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="text-xs font-bold text-[#1F1F1F]">
                          {p.price > 0 ? formatMoney(p.price, p.currency) : (p.price === 0 ? 'Free' : 'Custom')}
                        </span>
                      </td>

                      {/* Dynamic Performance Column */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="text-xs font-semibold text-[#1F1F1F] bg-[#F5F5F3] px-2.5 py-1 rounded-full border border-[#E5E5E3]">
                          {getPerformanceText(p)}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <StatusPill published={isPublished} />
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        {rowActions(p)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Card List View */}
          <div className="md:hidden divide-y divide-[#E5E5E3]">
            {filteredProducts.map((p) => {
              const isPublished = p.status === 'PUBLISHED'
              return (
                <div
                  key={p.id}
                  onClick={() => handleOpenModal(p)}
                  className="p-4 flex items-center justify-between gap-3 hover:bg-[#F5F5F3] transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <ProductThumbnail product={p} />
                    <div className="min-w-0 space-y-1">
                      <span className="font-bold text-xs text-[#1F1F1F] line-clamp-1 block">
                        {p.title}
                      </span>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] text-[#6F6F6B]">
                          {getProductTypeLabel(p.type)}
                        </span>
                        <span className="text-[10px] text-[#999995]">·</span>
                        <span className="text-[10px] font-bold text-[#1F1F1F]">
                          {p.price > 0 ? formatMoney(p.price, p.currency) : (p.price === 0 ? 'Free' : 'Custom')}
                        </span>
                        <span className="text-[10px] text-[#999995]">·</span>
                        <span className="text-[10px] text-[#1F1F1F] font-semibold">
                          {getPerformanceText(p)}
                        </span>
                      </div>
                      <StatusPill published={isPublished} />
                    </div>
                  </div>

                  <div onClick={(e) => e.stopPropagation()}>
                    {rowActions(p)}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2 px-1 text-xs text-[#6F6F6B]">
          <span>Page {page} of {totalPages}</span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="rounded-full h-8 px-3 border-[#E5E5E3] bg-[#FFFFFF] hover:bg-[#F5F5F3] text-[#1F1F1F]"
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="rounded-full h-8 px-3 border-[#E5E5E3] bg-[#FFFFFF] hover:bg-[#F5F5F3] text-[#1F1F1F]"
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Dependency Warning Modal */}
      <BaseModal
        open={depModal.open}
        onOpenChange={(open) => !open && setDepModal({ open: false, product: null, action: null, activeAutoName: '' })}
        title="Active Automation Warning"
        description={`"${depModal.product?.title || 'This product'}" is currently connected to the active Instagram automation "${depModal.activeAutoName}".`}
      >
        <div className="space-y-4 pt-2">
          <div className="flex items-start gap-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[#D97706] text-xs">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-[#F59E0B]" />
            <p>
              {depModal.action === 'delete'
                ? 'Deleting this product will permanently stop the automation from sending links to your followers.'
                : 'Unpublishing this product will cause followers receiving this link to see an unavailable product.'}
            </p>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDepModal({ open: false, product: null, action: null, activeAutoName: '' })}
              className="rounded-full bg-[#FFFFFF] border-[#D8DFFA] hover:bg-[#E8EDFB] text-[#010619]"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              variant={depModal.action === 'delete' ? 'destructive' : 'default'}
              onClick={() => {
                if (depModal.action === 'delete') {
                  executeRemove(depModal.product)
                } else {
                  executeTogglePublish(depModal.product)
                }
              }}
              className="rounded-full"
            >
              {depModal.action === 'delete' ? 'Delete Anyway' : 'Unpublish Anyway'}
            </Button>
          </div>
        </div>
      </BaseModal>

      {/* Delete Confirmation Modal */}
      <BaseModal
        open={deleteModal.open}
        onOpenChange={(open) => !open && setDeleteModal({ open: false, product: null })}
        title="Delete Product"
        description={`Are you sure you want to delete "${deleteModal.product?.title}"? This action cannot be undone.`}
      >
        <div className="flex items-center justify-end gap-2 pt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setDeleteModal({ open: false, product: null })}
            className="rounded-full bg-[#FFFFFF] border-[#D8DFFA] hover:bg-[#E8EDFB] text-[#010619]"
          >
            Cancel
          </Button>
          <Button
            size="sm"
            variant="destructive"
            onClick={() => executeRemove(deleteModal.product)}
            className="rounded-full"
          >
            Delete Product
          </Button>
        </div>
      </BaseModal>

      {/* Unified Product Management Modal */}
      <ProductManagementModal
        isOpen={managementModal.open}
        product={managementModal.product}
        initialTab={managementModal.tab}
        onClose={() => setManagementModal({ open: false, product: null, tab: 'overview' })}
        onProductUpdated={() => load()}
      />

      {/* Reusable Add to Store / Product Creation Wizard Modal */}
      <AddToStoreModal
        open={wizardModalOpen}
        onClose={() => setWizardModalOpen(false)}
        context="products"
        products={products || []}
        creatorEmail={me?.email || ''}
        onSuccess={(newProduct) => {
          load()
          if (newProduct?.id) {
            handleOpenModal(newProduct, 'overview')
          }
        }}
      />
    </div>
  )
}
