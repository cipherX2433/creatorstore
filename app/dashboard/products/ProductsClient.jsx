'use client'

import React, { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { api, formatMoney } from '@/lib/clientApi'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { BaseModal } from '@/components/ui/base-modal'
import ProductManagementModal from '@/components/products/ProductManagementModal'
import AddToStoreModal from '@/components/dashboard/AddToStoreModal'
import {
  Plus,
  Package,
  MoreVertical,
  Pencil,
  Trash2,
  Eye,
  EyeOff,
  Loader2,
  Copy,
  ExternalLink,
  Search,
  Bot,
  AlertTriangle,
  Store,
  GraduationCap,
  Video,
  Users,
  Radio,
  Briefcase,
  BookOpen,
  Calendar,
  Layers,
  Sparkles,
  Clock,
  Settings,
  ChevronDown,
  ArrowUp,
  ArrowDown,
  X,
  RefreshCw,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

import { useDashboardHeader } from '@/components/dashboard/HeaderContext'
import { useDashboard } from '@/components/dashboard/DashboardContext'
import { trackProductCreated, trackProductPublished } from '@/lib/analytics'

// Helper: normalize raw product type strings to consistent canonical keys
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

// UI configuration per product type matching Linktree Earn -> Products reference
function getProductTypeConfig(rawType) {
  const norm = normalizeProductType(rawType)
  switch (norm) {
    case 'COACHING':
      return {
        label: 'Booking',
        filterId: 'booking',
        icon: Calendar,
        bg: 'bg-[#EDE9FE]',
        color: 'text-[#7C3AED]',
      }
    case 'DIGITAL':
    case 'EBOOK':
      return {
        label: 'Digital Download',
        filterId: 'digital',
        icon: Package,
        bg: 'bg-[#FFEDD5]',
        color: 'text-[#F97316]',
      }
    case 'COURSE':
      return {
        label: 'Course',
        filterId: 'course',
        icon: GraduationCap,
        bg: 'bg-[#DBEAFE]',
        color: 'text-[#2563EB]',
      }
    case 'MEMBERSHIP':
      return {
        label: 'Membership',
        filterId: 'membership',
        icon: Users,
        bg: 'bg-[#DCFCE7]',
        color: 'text-[#16A34A]',
      }
    case 'WEBINAR':
      return {
        label: 'Webinar',
        filterId: 'webinar',
        icon: Radio,
        bg: 'bg-[#FCE7F3]',
        color: 'text-[#EC4899]',
      }
    case 'CUSTOM_SERVICE':
      return {
        label: 'Custom Service',
        filterId: 'service',
        icon: Briefcase,
        bg: 'bg-[#FEF3C7]',
        color: 'text-[#D97706]',
      }
    case 'EXTERNAL_LINK':
      return {
        label: 'External Link',
        filterId: 'link',
        icon: ExternalLink,
        bg: 'bg-[#F1F5F9]',
        color: 'text-[#64748B]',
      }
    default:
      return {
        label: 'Digital Download',
        filterId: 'digital',
        icon: Package,
        bg: 'bg-[#FFEDD5]',
        color: 'text-[#F97316]',
      }
  }
}

// Derive true publication & setup state
function getProductStatus(p) {
  if (p.status === 'PUBLISHED') return 'PUBLISHED'
  if (p.setupIncomplete || p.status === 'SETUP_INCOMPLETE') return 'SETUP_INCOMPLETE'
  const norm = normalizeProductType(p.type)
  if ((norm === 'DIGITAL' || norm === 'EBOOK') && !p.fileId && !p.fileName && !p.redirectUrl) {
    return 'SETUP_INCOMPLETE'
  }
  if (p.price === null || p.price === undefined) {
    return 'SETUP_INCOMPLETE'
  }
  return 'DRAFT'
}

// Format creation date e.g. "Oct 19, 2026"
function formatProductDate(dateStr) {
  if (!dateStr) return '—'
  try {
    const d = new Date(dateStr)
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(d)
  } catch {
    return String(dateStr).slice(0, 10)
  }
}

// Format price with graceful fallback for unconfigured price
function formatProductPrice(price, currency = 'usd') {
  if (price === null || price === undefined || price === '' || isNaN(Number(price))) {
    return '—'
  }
  return formatMoney(Number(price), currency)
}

const DATE_RANGES = [
  { label: 'Last 7 days', days: 7 },
  { label: 'Last 30 days', days: 30 },
  { label: 'Last 90 days', days: 90 },
  { label: 'All time', days: 3650 },
]

const TYPE_FILTERS = [
  { id: 'all', label: 'All types' },
  { id: 'booking', label: 'Booking' },
  { id: 'digital', label: 'Digital Download' },
  { id: 'membership', label: 'Membership' },
  { id: 'webinar', label: 'Webinar' },
  { id: 'service', label: 'Custom Service' },
  { id: 'link', label: 'External Link' },
]

const STATUS_FILTERS = [
  { id: 'all', label: 'All statuses' },
  { id: 'PUBLISHED', label: 'Published' },
  { id: 'SETUP_INCOMPLETE', label: 'Setup incomplete' },
  { id: 'DRAFT', label: 'Draft' },
]

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
        className="rounded-xl p-1 bg-[#FFFFFF] border-[#E5E5E3] text-[#1F1F1F] min-w-[180px] shadow-[0_8px_30px_rgba(0,0,0,0.06)]"
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
          {normType === 'COURSE' ? 'Edit Course' : normType === 'COACHING' ? 'Edit Booking' : normType === 'MEMBERSHIP' ? 'Edit Membership' : 'Edit Product'}
        </DropdownMenuItem>

        {isPublished && (
          <DropdownMenuItem
            onSelect={() => onView?.()}
            className="font-semibold text-xs cursor-pointer focus:bg-[#F5F5F3] focus:text-[#1F1F1F]"
          >
            <ExternalLink className="mr-2 h-3.5 w-3.5 text-[#1F1F1F]" /> View on Store
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
              <Eye className="mr-2 h-3.5 w-3.5 text-[#16A34A]" /> Publish
            </>
          )}
        </DropdownMenuItem>

        <DropdownMenuItem
          onSelect={() => onDuplicate?.()}
          className="font-semibold text-xs cursor-pointer focus:bg-[#F5F5F3] focus:text-[#1F1F1F]"
        >
          <Copy className="mr-2 h-3.5 w-3.5 text-[#6F6F6B]" /> Duplicate
        </DropdownMenuItem>

        <DropdownMenuItem
          onSelect={() => onDelete?.()}
          className="font-semibold text-xs text-[#DC2626] focus:bg-[#DC2626]/10 focus:text-[#DC2626] cursor-pointer"
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
  const { setPricingModalOpen, setHeaderConfig } = useDashboardHeader()

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

  // Data states
  const [products, setProducts] = useState(null)
  const [automations, setAutomations] = useState([])
  const [busy, setBusy] = useState(null)
  const [loading, setLoading] = useState(true)

  // Analytics summary banner state
  const [dateRange, setDateRange] = useState(DATE_RANGES[1]) // Default "Last 30 days"
  const [analyticsData, setAnalyticsData] = useState(null)
  const [analyticsLoading, setAnalyticsLoading] = useState(true)

  // Search & Filter state
  const [search, setSearch] = useState('')
  const [selectedType, setSelectedType] = useState(TYPE_FILTERS[0])
  const [selectedStatus, setSelectedStatus] = useState(STATUS_FILTERS[0])

  // Sorting state (default: created descending)
  const [sortColumn, setSortColumn] = useState('createdAt')
  const [sortDirection, setSortDirection] = useState('desc')

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 15

  // Modals state
  const [depModal, setDepModal] = useState({ open: false, product: null, action: null, activeAutoName: '' })
  const [deleteModal, setDeleteModal] = useState({ open: false, product: null })
  const [managementModal, setManagementModal] = useState({ open: false, product: null, tab: 'overview' })
  const [wizardModalOpen, setWizardModalOpen] = useState(false)

  const searchParams = useSearchParams()

  // Configure header title & actions
  useEffect(() => {
    setHeaderConfig({
      title: 'Products',
      actions: null,
    })
  }, [setHeaderConfig])

  function handleOpenCreateWizard() {
    if (!canCreate) {
      toast.error('Your Pro trial has ended. Upgrade your plan to create products and continue selling.')
      setPricingModalOpen(true)
      return
    }
    setWizardModalOpen(true)
  }

  // URL query intents (create=true, wizard=true, etc.)
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

  // Load products & automations
  const loadProducts = () => {
    setLoading(true)
    Promise.all([
      api.get('/products?limit=100').catch(() => ({ products: [] })),
      api.get('/automations').catch(() => []),
    ])
      .then(([r, autos]) => {
        setProducts(r.products || r.items || [])
        setAutomations(Array.isArray(autos) ? autos : (autos?.automations || []))
        setLoading(false)
      })
      .catch(() => {
        setProducts([])
        setAutomations([])
        setLoading(false)
      })
  }

  useEffect(() => {
    loadProducts()
  }, [])

  // Load analytics overview whenever dateRange changes
  useEffect(() => {
    let active = true
    setAnalyticsLoading(true)
    api.get(`/analytics/overview?days=${dateRange.days}`)
      .then((data) => {
        if (active) {
          setAnalyticsData(data)
          setAnalyticsLoading(false)
        }
      })
      .catch(() => {
        if (active) {
          setAnalyticsData(null)
          setAnalyticsLoading(false)
        }
      })
    return () => { active = false }
  }, [dateRange])

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
      loadProducts()
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
      loadProducts()
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
      loadProducts()
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
      loadProducts()
    } catch (e) {
      toast.error(e.message || 'Failed to duplicate product')
    } finally {
      setBusy(null)
    }
  }

  const username = me?.username || me?.store?.slug || 'store'

  function productPublicPath(p) {
    return `/${username}/${p.slug || p.id}`
  }

  function handleOpenModal(product, tab = 'overview') {
    setManagementModal({
      open: true,
      product,
      tab,
    })
  }

  // Handle column sorting
  function handleSort(column) {
    if (sortColumn === column) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortColumn(column)
      setSortDirection(column === 'title' ? 'asc' : 'desc')
    }
  }

  // Filter & Search computation
  const filteredProducts = useMemo(() => {
    return (products || []).filter((p) => {
      // Search
      if (search.trim()) {
        const query = search.trim().toLowerCase()
        const matchesTitle = String(p.title || '').toLowerCase().includes(query)
        if (!matchesTitle) return false
      }

      // Type Filter
      if (selectedType.id !== 'all') {
        const typeConfig = getProductTypeConfig(p.type)
        if (typeConfig.filterId !== selectedType.id) return false
      }

      // Status Filter
      if (selectedStatus.id !== 'all') {
        const computedStatus = getProductStatus(p)
        if (computedStatus !== selectedStatus.id) return false
      }

      return true
    })
  }, [products, search, selectedType, selectedStatus])

  // Sorted list computation
  const sortedProducts = useMemo(() => {
    const list = [...filteredProducts]
    list.sort((a, b) => {
      let valA
      let valB

      switch (sortColumn) {
        case 'title':
          valA = (a.title || '').toLowerCase()
          valB = (b.title || '').toLowerCase()
          return sortDirection === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA)

        case 'createdAt':
          valA = new Date(a.createdAt || 0).getTime()
          valB = new Date(b.createdAt || 0).getTime()
          return sortDirection === 'asc' ? valA - valB : valB - valA

        case 'clicks':
          valA = Number(a.allTimeClicks || 0)
          valB = Number(b.allTimeClicks || 0)
          return sortDirection === 'asc' ? valA - valB : valB - valA

        case 'orders':
          valA = Number(a.allTimeOrders || 0)
          valB = Number(b.allTimeOrders || 0)
          return sortDirection === 'asc' ? valA - valB : valB - valA

        case 'price':
          valA = a.price !== null && a.price !== undefined ? Number(a.price) : -1
          valB = b.price !== null && b.price !== undefined ? Number(b.price) : -1
          return sortDirection === 'asc' ? valA - valB : valB - valA

        default:
          return 0
      }
    })
    return list
  }, [filteredProducts, sortColumn, sortDirection])

  // Reset page to 1 on filter or search change
  useEffect(() => {
    setCurrentPage(1)
  }, [search, selectedType, selectedStatus])

  // Paginated list
  const totalPages = Math.max(1, Math.ceil(sortedProducts.length / pageSize))
  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return sortedProducts.slice(start, start + pageSize)
  }, [sortedProducts, currentPage, pageSize])

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
    <div className="space-y-6 max-w-6xl mx-auto text-[#1F1F1F] pb-10">
      {/* 1. PAGE HEADER: Title & Settings Link */}
      <div className="flex items-center justify-between pb-1 pt-1">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#1F1F1F] tracking-tight">
            Products
          </h1>
        </div>
        <Link
          href="/dashboard/settings"
          className="h-10 w-10 rounded-full border border-[#E5E5E3] bg-white hover:bg-[#F5F5F3] active:bg-[#EAEAEA] flex items-center justify-center text-[#1F1F1F] transition-all cursor-pointer shadow-xs"
          aria-label="Settings"
          title="Settings"
        >
          <Settings className="h-4 w-4 text-[#1F1F1F]" />
        </Link>
      </div>

      {/* 2. EARNINGS SUMMARY BANNER (Dark card inspired by Linktree Earn -> Products reference) */}
      <div className="w-full rounded-[20px] sm:rounded-[22px] bg-[#0A0A0A] text-white p-5 sm:p-6 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-6 border border-black/10">
        {/* Left Section: Dynamic Headline & Period Comparison */}
        <div className="space-y-1 max-w-md">
          <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
            {analyticsLoading ? (
              <span className="inline-block h-6 w-56 bg-white/10 rounded animate-pulse" />
            ) : (
              analyticsData?.headline || `Your earnings are steady over the last ${dateRange.days} days`
            )}
          </h3>
          <p className="text-xs text-[#999995]">
            {analyticsData?.comparisonText || `Compared to the previous ${dateRange.days} days`}
          </p>
        </div>

        {/* Right Section: Views, Clicks, Orders, Earnings & Date Selector */}
        <div className="flex flex-wrap items-center gap-6 sm:gap-8 justify-between md:justify-end">
          {/* Views */}
          <div className="text-left md:text-center min-w-[50px]">
            <p className="text-lg sm:text-xl font-bold text-white tracking-tight">
              {analyticsLoading ? '...' : (analyticsData?.views ?? 0)}
            </p>
            <p className="text-[11px] font-medium text-[#999995]">Views</p>
          </div>

          {/* Clicks */}
          <div className="text-left md:text-center min-w-[50px]">
            <p className="text-lg sm:text-xl font-bold text-white tracking-tight">
              {analyticsLoading ? '...' : (analyticsData?.clicks ?? 0)}
            </p>
            <p className="text-[11px] font-medium text-[#999995]">Clicks</p>
          </div>

          {/* Orders */}
          <div className="text-left md:text-center min-w-[50px]">
            <p className="text-lg sm:text-xl font-bold text-white tracking-tight">
              {analyticsLoading ? '...' : (analyticsData?.orders ?? 0)}
            </p>
            <p className="text-[11px] font-medium text-[#999995]">Orders</p>
          </div>

          {/* Earnings */}
          <div className="text-left md:text-center min-w-[70px]">
            <p className="text-lg sm:text-xl font-bold text-white tracking-tight">
              {analyticsLoading ? '...' : formatMoney(analyticsData?.revenue ?? 0, analyticsData?.currency || 'usd')}
            </p>
            <p className="text-[11px] font-medium text-[#999995]">Earnings</p>
          </div>

          {/* Date Selector Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-semibold text-white transition-colors cursor-pointer border border-white/10 shadow-xs"
              >
                <span>{dateRange.label}</span>
                <ChevronDown className="h-3.5 w-3.5 opacity-70" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-[#1A1A1A] border-white/10 text-white rounded-xl p-1 shadow-xl min-w-[140px]">
              {DATE_RANGES.map((r) => (
                <DropdownMenuItem
                  key={r.days}
                  onSelect={() => setDateRange(r)}
                  className={`text-xs font-medium cursor-pointer rounded-lg px-3 py-2 ${
                    dateRange.days === r.days ? 'bg-white/20 text-white font-bold' : 'hover:bg-white/10 text-white/80'
                  }`}
                >
                  {r.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* 3. PRODUCTS MANAGEMENT PANEL (Rounded white card with toolbar & table) */}
      <div className="rounded-[20px] sm:rounded-[24px] bg-white border border-[#E5E5E3] shadow-[0_8px_30px_rgba(0,0,0,0.04)] overflow-hidden">
        {/* Top Toolbar */}
        <div className="p-4 sm:p-5 border-b border-[#E5E5E3] flex flex-col md:flex-row md:items-center justify-between gap-3.5 bg-white">
          {/* Left: Search & Filter Controls */}
          <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-0">
            {/* Search Input */}
            <div className="relative w-full sm:w-64 md:w-72">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#999995] pointer-events-none" />
              <input
                id="products-search-input"
                type="text"
                placeholder="Search products"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full h-10 pl-9 pr-8 rounded-xl bg-white border border-[#E5E5E3] text-xs font-medium text-[#1F1F1F] placeholder-[#999995] hover:border-[#DADAD7] focus:outline-none focus:border-[#1F1F1F] focus:ring-1 focus:ring-[#1F1F1F] transition-all"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#999995] hover:text-[#1F1F1F] p-0.5 rounded-full cursor-pointer"
                  title="Clear search"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Type Filter Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  id="products-type-filter-btn"
                  type="button"
                  className="h-10 px-3.5 rounded-xl bg-white border border-[#E5E5E3] hover:border-[#DADAD7] hover:bg-[#F9F9F8] text-xs font-semibold text-[#1F1F1F] inline-flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap"
                >
                  <span>{selectedType.label}</span>
                  <ChevronDown className="h-3.5 w-3.5 text-[#6F6F6B]" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="bg-white border-[#E5E5E3] text-[#1F1F1F] rounded-xl p-1 shadow-lg min-w-[170px]">
                {TYPE_FILTERS.map((tf) => (
                  <DropdownMenuItem
                    key={tf.id}
                    onSelect={() => setSelectedType(tf)}
                    className={`text-xs font-medium cursor-pointer rounded-lg px-3 py-2 ${
                      selectedType.id === tf.id ? 'bg-[#F2F1EF] font-bold text-[#1F1F1F]' : 'hover:bg-[#F9F9F8]'
                    }`}
                  >
                    {tf.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Status Filter Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  id="products-status-filter-btn"
                  type="button"
                  className="h-10 px-3.5 rounded-xl bg-white border border-[#E5E5E3] hover:border-[#DADAD7] hover:bg-[#F9F9F8] text-xs font-semibold text-[#1F1F1F] inline-flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap"
                >
                  <span>
                    {selectedStatus.id === 'all'
                      ? `All statuses${filteredProducts.length > 0 ? ` (${filteredProducts.length})` : ''}`
                      : selectedStatus.label}
                  </span>
                  <ChevronDown className="h-3.5 w-3.5 text-[#6F6F6B]" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="bg-white border-[#E5E5E3] text-[#1F1F1F] rounded-xl p-1 shadow-lg min-w-[170px]">
                {STATUS_FILTERS.map((sf) => (
                  <DropdownMenuItem
                    key={sf.id}
                    onSelect={() => setSelectedStatus(sf)}
                    className={`text-xs font-medium cursor-pointer rounded-lg px-3 py-2 ${
                      selectedStatus.id === sf.id ? 'bg-[#F2F1EF] font-bold text-[#1F1F1F]' : 'hover:bg-[#F9F9F8]'
                    }`}
                  >
                    {sf.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Clear Filters (if active) */}
            {(search || selectedType.id !== 'all' || selectedStatus.id !== 'all') && (
              <button
                type="button"
                onClick={() => {
                  setSearch('')
                  setSelectedType(TYPE_FILTERS[0])
                  setSelectedStatus(STATUS_FILTERS[0])
                }}
                className="text-xs font-semibold text-[#DC2626] hover:underline px-2 py-1 cursor-pointer"
              >
                Reset
              </button>
            )}
          </div>

          {/* Right: + Add Product Button */}
          <button
            id="products-add-btn"
            type="button"
            onClick={handleOpenCreateWizard}
            className="h-10 px-5 rounded-xl bg-[#1F1F1F] hover:bg-black text-white text-xs sm:text-sm font-semibold inline-flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs shrink-0 self-stretch sm:self-auto"
          >
            <Plus className="h-4 w-4 stroke-[2.5]" />
            <span>Add product</span>
          </button>
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="p-6 space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 py-3 border-b border-[#E5E5E3] last:border-b-0">
                <Skeleton className="h-10 w-10 rounded-xl bg-[#F5F5F3] shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-4 w-48 bg-[#F5F5F3]" />
                  <Skeleton className="h-3 w-28 bg-[#F5F5F3]" />
                </div>
                <Skeleton className="h-6 w-20 rounded-full bg-[#F5F5F3]" />
                <Skeleton className="h-4 w-24 bg-[#F5F5F3]" />
                <Skeleton className="h-4 w-12 bg-[#F5F5F3]" />
              </div>
            ))}
          </div>
        ) : products && products.length === 0 ? (
          /* Empty Initial State */
          <div className="p-10 sm:p-14 text-center flex flex-col items-center justify-center space-y-4">
            <div className="h-14 w-14 rounded-2xl bg-[#F5F5F3] border border-[#E5E5E3] flex items-center justify-center text-[#1F1F1F]">
              <Package className="h-7 w-7" />
            </div>
            <div className="max-w-md space-y-1.5">
              <h3 className="text-lg font-bold text-[#1F1F1F]">You haven&apos;t created a product yet</h3>
              <p className="text-xs sm:text-sm text-[#6F6F6B]">
                Create your first digital product, booking, or membership and start selling on CreatorStore.
              </p>
            </div>
            <button
              type="button"
              onClick={handleOpenCreateWizard}
              className="h-10 px-6 font-semibold text-xs bg-[#1F1F1F] text-white hover:bg-black rounded-xl inline-flex items-center gap-2 cursor-pointer shadow-xs"
            >
              <Plus className="h-4 w-4 stroke-[2.5]" /> Create product
            </button>
          </div>
        ) : filteredProducts.length === 0 ? (
          /* Filtered No Results State */
          <div className="p-10 sm:p-14 text-center flex flex-col items-center justify-center space-y-3">
            <Search className="h-8 w-8 text-[#999995]" />
            <h4 className="text-sm font-bold text-[#1F1F1F]">No products match your filters</h4>
            <p className="text-xs text-[#6F6F6B] max-w-sm">
              Try adjusting your search keywords, type filter, or status filter.
            </p>
            <button
              type="button"
              onClick={() => {
                setSearch('')
                setSelectedType(TYPE_FILTERS[0])
                setSelectedStatus(STATUS_FILTERS[0])
              }}
              className="mt-2 px-4 py-2 rounded-xl text-xs font-semibold bg-[#F5F5F3] hover:bg-[#EAEAE8] text-[#1F1F1F] cursor-pointer"
            >
              Clear all filters
            </button>
          </div>
        ) : (
          /* Structured Table View */
          <>
            {/* Desktop / Tablet Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-[#FAFAFA] border-b border-[#E5E5E3] text-[11px] font-bold uppercase tracking-wider text-[#6F6F6B] select-none">
                  <tr>
                    <th
                      scope="col"
                      onClick={() => handleSort('title')}
                      className="py-3 px-5 text-left cursor-pointer hover:text-[#1F1F1F] transition-colors"
                    >
                      <div className="flex items-center gap-1.5">
                        <span>Product name</span>
                        {sortColumn === 'title' && (
                          sortDirection === 'asc' ? <ArrowUp className="h-3.5 w-3.5 text-[#1F1F1F]" /> : <ArrowDown className="h-3.5 w-3.5 text-[#1F1F1F]" />
                        )}
                      </div>
                    </th>
                    <th scope="col" className="py-3 px-4 text-left">
                      Status
                    </th>
                    <th
                      scope="col"
                      onClick={() => handleSort('createdAt')}
                      className="py-3 px-4 text-left cursor-pointer hover:text-[#1F1F1F] transition-colors"
                    >
                      <div className="flex items-center gap-1.5">
                        <span>Created</span>
                        {sortColumn === 'createdAt' && (
                          sortDirection === 'asc' ? <ArrowUp className="h-3.5 w-3.5 text-[#1F1F1F]" /> : <ArrowDown className="h-3.5 w-3.5 text-[#1F1F1F]" />
                        )}
                      </div>
                    </th>
                    <th
                      scope="col"
                      onClick={() => handleSort('clicks')}
                      className="py-3 px-4 text-left cursor-pointer hover:text-[#1F1F1F] transition-colors"
                    >
                      <div className="flex items-center gap-1.5">
                        <span>All-time clicks</span>
                        {sortColumn === 'clicks' && (
                          sortDirection === 'asc' ? <ArrowUp className="h-3.5 w-3.5 text-[#1F1F1F]" /> : <ArrowDown className="h-3.5 w-3.5 text-[#1F1F1F]" />
                        )}
                      </div>
                    </th>
                    <th
                      scope="col"
                      onClick={() => handleSort('orders')}
                      className="py-3 px-4 text-left cursor-pointer hover:text-[#1F1F1F] transition-colors"
                    >
                      <div className="flex items-center gap-1.5">
                        <span>All-time orders</span>
                        {sortColumn === 'orders' && (
                          sortDirection === 'asc' ? <ArrowUp className="h-3.5 w-3.5 text-[#1F1F1F]" /> : <ArrowDown className="h-3.5 w-3.5 text-[#1F1F1F]" />
                        )}
                      </div>
                    </th>
                    <th
                      scope="col"
                      onClick={() => handleSort('price')}
                      className="py-3 px-4 text-left cursor-pointer hover:text-[#1F1F1F] transition-colors"
                    >
                      <div className="flex items-center gap-1.5">
                        <span>Price</span>
                        {sortColumn === 'price' && (
                          sortDirection === 'asc' ? <ArrowUp className="h-3.5 w-3.5 text-[#1F1F1F]" /> : <ArrowDown className="h-3.5 w-3.5 text-[#1F1F1F]" />
                        )}
                      </div>
                    </th>
                    <th scope="col" className="py-3 px-5 text-right">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E5E3]">
                  {paginatedProducts.map((p) => {
                    const typeConfig = getProductTypeConfig(p.type)
                    const TypeIcon = typeConfig.icon
                    const computedStatus = getProductStatus(p)
                    const normType = normalizeProductType(p.type)

                    return (
                      <tr
                        key={p.id}
                        onClick={() => handleOpenModal(p)}
                        className="group hover:bg-[#F9F9F8] transition-colors cursor-pointer"
                      >
                        {/* 1. Product Name & Type Icon */}
                        <td className="py-4 px-5">
                          <div className="flex items-center gap-3.5 min-w-[220px]">
                            <div className={`h-10 w-10 rounded-xl ${typeConfig.bg} ${typeConfig.color} flex items-center justify-center shrink-0`}>
                              <TypeIcon className="h-5 w-5" />
                            </div>
                            <div className="min-w-0">
                              <h4 className="text-sm font-bold text-[#1F1F1F] group-hover:text-[#1F1F1F] truncate leading-snug">
                                {p.title}
                              </h4>
                              <p className="text-xs text-[#6F6F6B] truncate">
                                {typeConfig.label}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* 2. Status */}
                        <td className="py-4 px-4 whitespace-nowrap">
                          {computedStatus === 'PUBLISHED' && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#7C3AED] text-white">
                              Published
                            </span>
                          )}
                          {computedStatus === 'SETUP_INCOMPLETE' && (
                            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#D97706]">
                              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                              <span>Setup incomplete</span>
                            </span>
                          )}
                          {computedStatus === 'DRAFT' && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#F2F1EF] text-[#6F6F6B]">
                              Draft
                            </span>
                          )}
                        </td>

                        {/* 3. Created */}
                        <td className="py-4 px-4 whitespace-nowrap text-xs font-medium text-[#1F1F1F]">
                          {formatProductDate(p.createdAt)}
                        </td>

                        {/* 4. All-time clicks */}
                        <td className="py-4 px-4 whitespace-nowrap text-xs font-bold text-[#1F1F1F]">
                          {p.allTimeClicks ?? 0}
                        </td>

                        {/* 5. All-time orders */}
                        <td className="py-4 px-4 whitespace-nowrap text-xs">
                          {p.allTimeOrders > 0 ? (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleOpenModal(
                                  p,
                                  normType === 'COACHING' ? 'bookings' : (normType === 'COURSE' ? 'students' : 'orders')
                                )
                              }}
                              className="font-bold text-[#7C3AED] hover:underline cursor-pointer"
                            >
                              {p.allTimeOrders}
                            </button>
                          ) : (
                            <span className="font-bold text-[#1F1F1F]">0</span>
                          )}
                        </td>

                        {/* 6. Price */}
                        <td className="py-4 px-4 whitespace-nowrap text-xs font-bold text-[#1F1F1F]">
                          {formatProductPrice(p.price, p.currency)}
                        </td>

                        {/* 7. Actions */}
                        <td className="py-4 px-5 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                          {rowActions(p)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Responsive Cards */}
            <div className="md:hidden divide-y divide-[#E5E5E3]">
              {paginatedProducts.map((p) => {
                const typeConfig = getProductTypeConfig(p.type)
                const TypeIcon = typeConfig.icon
                const computedStatus = getProductStatus(p)
                const normType = normalizeProductType(p.type)

                return (
                  <div
                    key={p.id}
                    onClick={() => handleOpenModal(p)}
                    className="p-4 flex flex-col gap-3 hover:bg-[#F9F9F8] transition-colors cursor-pointer"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`h-10 w-10 rounded-xl ${typeConfig.bg} ${typeConfig.color} flex items-center justify-center shrink-0`}>
                          <TypeIcon className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-sm font-bold text-[#1F1F1F] truncate leading-snug">
                            {p.title}
                          </h4>
                          <p className="text-xs text-[#6F6F6B] truncate">
                            {typeConfig.label}
                          </p>
                        </div>
                      </div>

                      <div onClick={(e) => e.stopPropagation()} className="shrink-0">
                        {rowActions(p)}
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-1 text-xs">
                      <div className="flex items-center gap-2">
                        {computedStatus === 'PUBLISHED' && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#7C3AED] text-white">
                            Published
                          </span>
                        )}
                        {computedStatus === 'SETUP_INCOMPLETE' && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#D97706]">
                            <AlertTriangle className="h-3 w-3 shrink-0" />
                            <span>Setup incomplete</span>
                          </span>
                        )}
                        {computedStatus === 'DRAFT' && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#F2F1EF] text-[#6F6F6B]">
                            Draft
                          </span>
                        )}
                        <span className="text-[#999995] text-[11px]">·</span>
                        <span className="text-[11px] font-medium text-[#6F6F6B]">
                          {formatProductDate(p.createdAt)}
                        </span>
                      </div>

                      <div className="font-bold text-xs text-[#1F1F1F]">
                        {formatProductPrice(p.price, p.currency)}
                      </div>
                    </div>

                    <div className="flex items-center gap-4 pt-1 text-[11px] text-[#6F6F6B] border-t border-[#F2F1EF]">
                      <div>
                        Clicks: <span className="font-bold text-[#1F1F1F]">{p.allTimeClicks ?? 0}</span>
                      </div>
                      <div>
                        Orders:{' '}
                        {p.allTimeOrders > 0 ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleOpenModal(
                                p,
                                normType === 'COACHING' ? 'bookings' : (normType === 'COURSE' ? 'students' : 'orders')
                              )
                            }}
                            className="font-bold text-[#7C3AED] hover:underline"
                          >
                            {p.allTimeOrders}
                          </button>
                        ) : (
                          <span className="font-bold text-[#1F1F1F]">0</span>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="p-4 border-t border-[#E5E5E3] flex items-center justify-between gap-3 text-xs text-[#6F6F6B] bg-[#FAFAFA]">
                <div>
                  Showing{' '}
                  <span className="font-semibold text-[#1F1F1F]">
                    {(currentPage - 1) * pageSize + 1}
                  </span>{' '}
                  to{' '}
                  <span className="font-semibold text-[#1F1F1F]">
                    {Math.min(currentPage * pageSize, sortedProducts.length)}
                  </span>{' '}
                  of <span className="font-semibold text-[#1F1F1F]">{sortedProducts.length}</span> products
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage <= 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    className="rounded-xl h-8 px-3 border-[#E5E5E3] bg-white hover:bg-[#F5F5F3] text-[#1F1F1F] text-xs font-semibold cursor-pointer disabled:opacity-50"
                  >
                    Previous
                  </Button>
                  <span className="text-xs font-medium text-[#1F1F1F] px-1">
                    {currentPage} / {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage >= totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    className="rounded-xl h-8 px-3 border-[#E5E5E3] bg-white hover:bg-[#F5F5F3] text-[#1F1F1F] text-xs font-semibold cursor-pointer disabled:opacity-50"
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

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
        onProductUpdated={() => loadProducts()}
      />

      {/* Reusable Add to Store / Product Creation Wizard Modal */}
      <AddToStoreModal
        open={wizardModalOpen}
        onClose={() => setWizardModalOpen(false)}
        context="products"
        products={products || []}
        creatorEmail={me?.email || ''}
        onSuccess={(newProduct) => {
          loadProducts()
          if (newProduct?.id) {
            handleOpenModal(newProduct, 'overview')
          }
        }}
      />
    </div>
  )
}
