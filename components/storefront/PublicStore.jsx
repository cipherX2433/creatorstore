'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { toast } from 'sonner'
import { Share2, Sparkles, Mail } from 'lucide-react'
import PublicStoreRenderer, { WallpaperBackdrop } from '@/components/storefront/PublicStoreRenderer'
import PublicContactModal from '@/components/storefront/PublicContactModal'
import StoreTracker from '@/components/storefront/StoreTracker'
import { getThemeTokens } from '@/lib/themePresets'
import { useImageContrastTheme } from '@/lib/imageContrast'
import { trackStoreViewed } from '@/lib/analytics'

const QRCodeCanvas = dynamic(() => import('qrcode.react').then((m) => m.QRCodeCanvas), { ssr: false })

export default function PublicStore({ data, currentPageSlug: initialPageSlug }) {
  const slug = data?.username || ''
  const [shareUrl, setShareUrl] = useState('')
  const [activePageSlug, setActivePageSlug] = useState(initialPageSlug || 'home')
  const [contactModalOpen, setContactModalOpen] = useState(false)

  const card = data?.theme?.businessCard || data?.store?.theme?.businessCard || {}
  const hasContactDetails = Boolean(
    card.contactDetails?.fullName ||
    card.contactDetails?.email ||
    card.contactDetails?.phone ||
    card.contactDetails?.website
  )
  const allowContactShare = Boolean(card.allowContactShare)

  const isImmersive = (data?.theme?.headerLayout || data?.store?.theme?.headerLayout) === 'immersive'
  const avatarUrl = data?.theme?.avatarUrl || data?.store?.theme?.avatarUrl || data?.profile?.avatarUrl || ''
  const contrastTheme = useImageContrastTheme(isImmersive ? avatarUrl : null)

  const tokens = useMemo(
    () => getThemeTokens({ ...(data?.theme || {}), avatarUrl: data?.profile?.avatarUrl || '' }),
    [data?.theme, data?.profile?.avatarUrl],
  )

  useEffect(() => {
    trackStoreViewed({ store_id: data?.store?.id || data?.id })
  }, [data?.store?.id, data?.id])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const canonicalUrl = `${window.location.origin}/${slug}`
      setShareUrl(canonicalUrl)

      // Backward compatibility: If visitor landed on ?page=..., normalize URL to /[username]
      const searchParams = new URLSearchParams(window.location.search)
      const pageQuery = searchParams.get('page')
      const targetInitial = pageQuery || initialPageSlug || 'home'

      if (pageQuery) {
        setActivePageSlug(targetInitial)
        // Clean URL to /[username] using replaceState
        window.history.replaceState({ pageSlug: targetInitial }, '', window.location.pathname)
      } else {
        // Initialize base history state if not already set
        if (!window.history.state || !window.history.state.pageSlug) {
          window.history.replaceState({ pageSlug: targetInitial }, '', window.location.pathname)
        }
      }

      // Handle browser Back / Forward buttons without exposing page slug in URL
      const handlePopState = (e) => {
        const targetSlug = e.state?.pageSlug || 'home'
        setActivePageSlug(targetSlug)
      }

      window.addEventListener('popstate', handlePopState)
      return () => window.removeEventListener('popstate', handlePopState)
    }
  }, [slug, initialPageSlug])

  function handleSelectPage(targetSlug) {
    if (!targetSlug || targetSlug === activePageSlug) return
    setActivePageSlug(targetSlug)
    if (typeof window !== 'undefined') {
      // Keep URL as window.location.pathname (e.g. /ruhan) in browser address bar
      window.history.pushState({ pageSlug: targetSlug }, '', window.location.pathname)
    }
  }

  async function handleShare() {
    const url = shareUrl || (typeof window !== 'undefined' ? `${window.location.origin}/${slug}` : `/${slug}`)
    try {
      if (navigator.share) {
        await navigator.share({
          title: data?.profile?.name || slug,
          url,
        })
        return
      }
    } catch (err) {
      if (err?.name === 'AbortError') return
    }
    try {
      await navigator.clipboard.writeText(url)
      toast.success('Link copied')
    } catch {
      toast.error('Could not copy link')
    }
  }

  const pages = Array.isArray(data?.pages) ? data.pages : []

  return (
    <div className="relative min-h-screen w-full overflow-x-hidden">
      <StoreTracker creatorId={data.creatorId} type="store_view" />

      <div className="fixed inset-0 z-0">
        <WallpaperBackdrop
          wallpaper={isImmersive ? { ...tokens.wallpaper, bgType: 'solid' } : tokens.wallpaper}
          colors={isImmersive ? { ...tokens.colors, background: contrastTheme?.bg || tokens.colors.background } : tokens.colors}
        />
      </div>

      <div className="relative z-10 flex justify-center min-h-screen px-4 py-6 sm:px-6 sm:py-10">
        <article
          className="relative w-full max-w-[510px] rounded-[32px] overflow-hidden shadow-[0_24px_64px_rgba(0,0,0,0.45)] ring-1 ring-black/20 shrink-0"
          style={{ backgroundColor: isImmersive ? (contrastTheme?.bg || '#1E2532') : undefined }}
        >
          <div className="absolute inset-x-0 top-0 z-20 flex items-center justify-between p-card pointer-events-none">
            <Link
              href="/"
              aria-label="CreatorStore"
              className="pointer-events-auto flex h-9 w-9 items-center justify-center rounded-full bg-[#1A1A1A] text-[#D4D4D8] hover:bg-[#242424] transition-colors"
              style={
                isImmersive
                  ? {
                      backgroundColor: contrastTheme.controlBg,
                      color: contrastTheme.controlFg,
                      border: `1px solid ${contrastTheme.controlBorder}`,
                      backdropFilter: 'blur(8px)',
                    }
                  : undefined
              }
            >
              <Sparkles className="h-4 w-4" />
            </Link>
            <div className="flex items-center gap-2 pointer-events-auto">
              {(hasContactDetails || allowContactShare) && (
                <button
                  type="button"
                  onClick={() => setContactModalOpen(true)}
                  aria-label="Contact creator"
                  className="flex items-center gap-1.5 px-3 h-9 rounded-full bg-[#1A1A1A] text-[#D4D4D8] hover:bg-[#242424] text-xs font-semibold transition-colors cursor-pointer"
                  style={
                    isImmersive
                      ? {
                          backgroundColor: contrastTheme.controlBg,
                          color: contrastTheme.controlFg,
                          border: `1px solid ${contrastTheme.controlBorder}`,
                          backdropFilter: 'blur(8px)',
                        }
                      : undefined
                  }
                >
                  <Mail className="h-3.5 w-3.5" />
                  <span>Contact</span>
                </button>
              )}
              <button
                type="button"
                onClick={handleShare}
                aria-label="Share store"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-[#1A1A1A] text-[#D4D4D8] hover:bg-[#242424] transition-colors cursor-pointer"
                style={
                  isImmersive
                    ? {
                        backgroundColor: contrastTheme.controlBg,
                        color: contrastTheme.controlFg,
                        border: `1px solid ${contrastTheme.controlBorder}`,
                        backdropFilter: 'blur(8px)',
                      }
                    : undefined
                }
              >
                <Share2 className="h-4 w-4" />
              </button>
            </div>
          </div>

          <PublicStoreRenderer
            store={{
              ...(data?.store || {}),
              theme: data.theme || data?.store?.theme,
              sections: data.sections || data?.store?.sections,
              storeName: data.storeName || data.store?.storeName,
              username: data.username || data.store?.username,
              slug: data.slug || data.store?.slug,
            }}
            profile={data.profile}
            products={data.products}
            username={data.username}
            pages={pages}
            currentPageSlug={activePageSlug}
            onSelectPage={handleSelectPage}
            editor={false}
            className="min-h-[calc(100dvh-3rem)] sm:min-h-[800px]"
          />
        </article>
      </div>

      {shareUrl ? (
        <aside className="hidden lg:flex flex-col items-center gap-2.5 fixed bottom-8 right-8 z-20 p-3.5 rounded-card bg-[#1A1A1A] border border-[#2E2E2E] shadow-modal">
          <p className="text-meta font-medium text-content-secondary text-center">View on mobile</p>
          <div className="bg-white rounded-control p-2 shadow-raised flex items-center justify-center">
            <QRCodeCanvas value={shareUrl} size={112} fgColor="#000000" bgColor="#ffffff" level="M" />
          </div>
          <p className="text-micro text-content-muted text-center">Scan to open on phone</p>
        </aside>
      ) : null}

      <PublicContactModal
        isOpen={contactModalOpen}
        onClose={() => setContactModalOpen(false)}
        store={data?.store}
        profile={data?.profile}
        username={slug}
      />
    </div>
  )
}

