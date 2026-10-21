'use client'

import React, { useState, useEffect, useRef } from 'react'
import {
  Sparkles,
  AlertCircle,
  Upload,
  Loader2,
  Check,
  Zap,
  ExternalLink,
  Image as ImageIcon,
  MoreVertical,
  Link2,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { toast } from 'sonner'
import { api } from '@/lib/clientApi'
import StoreItemEditorShell from '@/components/dashboard/StoreItemEditorShell'
import {
  getSocialPlatform,
  SOCIAL_DISPLAY_STYLES,
  resolveSocialStyle,
} from '@/lib/socialPlatforms'
import SocialStylePicker from '@/components/dashboard/SocialStylePicker'

export default function SocialItemEditor({
  section,
  igAccount,
  onConnectInstagram,
  onDisconnectInstagram,
  onBack,
  onUpdateProps,
  onSave,
  onDelete,
  onToggleHidden,
  onDuplicate,
  onOpenMobilePreview,
  isPro = false,
  onOpenPricing,
}) {
  const initialProps = section?.props || {}
  const platformId = initialProps.platform || (section?.type === 'instagram' ? 'instagram' : 'generic')
  const platform = getSocialPlatform(platformId)
  const PlatformIcon = platform.icon

  const [title, setTitle] = useState(initialProps.title || initialProps.label || platform.name)
  const [url, setUrl] = useState(initialProps.url || '')
  const [thumbnail, setThumbnail] = useState(initialProps.thumbnail || initialProps.customThumbnail || '')
  const [layout, setLayout] = useState(resolveSocialStyle(initialProps))

  const [activeTab, setActiveTab] = useState('details')
  const [saveState, setSaveState] = useState('saved')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDirty, setIsDirty] = useState(false)
  const [uploadingThumb, setUploadingThumb] = useState(false)
  const [urlError, setUrlError] = useState('')
  const [titleError, setTitleError] = useState('')

  // Authoritative Instagram live state & media
  const [liveIgAccount, setLiveIgAccount] = useState(igAccount || null)
  const [igProfile, setIgProfile] = useState(initialProps?.instagramData?.profile || null)
  const [igMedia, setIgMedia] = useState(Array.isArray(initialProps?.instagramData?.media) ? initialProps.instagramData.media : [])
  const [loadingIg, setLoadingIg] = useState(false)
  const [syncingIg, setSyncingIg] = useState(false)
  const [carouselIndex, setCarouselIndex] = useState(0)

  const fileInputRef = useRef(null)

  // Sync with prop igAccount changes
  useEffect(() => {
    if (igAccount) {
      setLiveIgAccount(igAccount)
    }
  }, [igAccount])

  // Fetch authoritative Instagram connection, profile, and media
  useEffect(() => {
    if (platform.id !== 'instagram') return
    let isMounted = true

    async function loadAuthoritativeInstagram() {
      try {
        setLoadingIg(true)
        const accRes = await api.get('/integrations/instagram/account').catch(() => null)
        const account = accRes?.account || accRes
        if (isMounted && account) {
          setLiveIgAccount(account)
          if (account.connected) {
            const [profileRes, mediaRes] = await Promise.all([
              api.get('/integrations/instagram/profile').catch(() => null),
              api.get('/integrations/instagram/media').catch(() => ({ media: [] })),
            ])
            if (isMounted) {
              if (profileRes && profileRes.connected) setIgProfile(profileRes)
              if (mediaRes && Array.isArray(mediaRes.media)) setIgMedia(mediaRes.media)
            }
          }
        }
      } catch (e) {
        console.warn('Could not load Instagram integration state in editor:', e)
      } finally {
        if (isMounted) setLoadingIg(false)
      }
    }

    loadAuthoritativeInstagram()
    return () => { isMounted = false }
  }, [platform.id])

  const handleManualSync = async () => {
    setSyncingIg(true)
    try {
      const res = await api.post('/integrations/instagram/sync', {})
      if (res?.profile) setIgProfile(res.profile)
      if (res?.media?.media) setIgMedia(res.media.media)
      toast.success('Instagram profile and posts synchronized!')
    } catch (err) {
      toast.error(err.message || 'Failed to refresh Instagram data')
    } finally {
      setSyncingIg(false)
    }
  }

  // Sync state if section props change externally (and not dirty)
  useEffect(() => {
    if (section?.props && !isDirty) {
      if (section.props.title !== undefined && section.props.title !== title) setTitle(section.props.title)
      if (section.props.url !== undefined && section.props.url !== url) setUrl(section.props.url)
      if (section.props.thumbnail !== undefined && section.props.thumbnail !== thumbnail) setThumbnail(section.props.thumbnail)
      const currentLayout = resolveSocialStyle(section.props)
      if (currentLayout !== layout) setLayout(currentLayout)
      if (section.props.instagramData?.profile && !igProfile) setIgProfile(section.props.instagramData.profile)
      if (Array.isArray(section.props.instagramData?.media) && igMedia.length === 0) setIgMedia(section.props.instagramData.media)
    }
  }, [section?.props])

  const validateUrl = (val) => {
    const trimmed = (val || '').trim()
    if (!trimmed) return true // can be empty initially
    if (/^javascript:/i.test(trimmed)) {
      setUrlError('Unsafe URL scheme is not allowed.')
      return false
    }
    try {
      const parsed = new URL(trimmed.startsWith('http://') || trimmed.startsWith('https://') ? trimmed : `https://${trimmed}`)
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        setUrlError('Please enter a valid web URL (https://...)')
        return false
      }
      setUrlError('')
      return true
    } catch {
      setUrlError('Please enter a valid web URL')
      return false
    }
  }

  const isInstagram = platform.id === 'instagram'
  const isIgConnected = Boolean(liveIgAccount?.connected || igAccount?.connected)
  const isTokenExpired = Boolean(
    liveIgAccount?.status === 'EXPIRED' ||
    liveIgAccount?.error === 'TOKEN_EXPIRED' ||
    igAccount?.status === 'EXPIRED' ||
    igAccount?.error === 'TOKEN_EXPIRED'
  )
  const isWebhookFailed = Boolean(
    liveIgAccount?.subscriptionStatus === 'FAILED' ||
    liveIgAccount?.status === 'SUBSCRIPTION_FAILED' ||
    igAccount?.subscriptionStatus === 'FAILED' ||
    igAccount?.status === 'SUBSCRIPTION_FAILED'
  )
  const currentUsername = liveIgAccount?.username || igAccount?.username || igProfile?.username || ''

  const handleSave = async () => {
    if (!title.trim()) {
      setTitleError('Title cannot be empty')
      toast.error('Please enter a title')
      return
    }
    if (url && !validateUrl(url)) {
      toast.error('Please fix the URL error before saving')
      return
    }

    setIsSubmitting(true)
    setSaveState('saving')
    try {
      const canonicalUrl = url.trim() ? (url.trim().startsWith('http') ? url.trim() : `https://${url.trim()}`) : ''
      const resolved = resolveSocialStyle(layout)
      const patch = {
        title: title.trim(),
        label: title.trim(),
        url: canonicalUrl,
        platform: platform.id,
        layout: resolved,
        displayMode: resolved,
        displayStyle: resolved,
        thumbnail: thumbnail || null,
        customThumbnail: thumbnail || null,
      }

      if (isInstagram && isIgConnected) {
        patch.instagramAccountId = liveIgAccount?.id || igAccount?.id || null
        patch.instagramUsername = currentUsername || null
        patch.instagramData = {
          connected: true,
          username: currentUsername,
          profile: igProfile || {
            username: currentUsername,
            name: currentUsername,
            profileUrl: `https://instagram.com/${currentUsername}`,
            profilePictureUrl: null,
            mediaCount: igMedia.length,
            followersCount: null,
            followerCount: null,
            followingCount: null,
            followsCount: null,
            followersCountUnavailable: true,
            followingCountUnavailable: true,
          },
          media: igMedia,
          lastSyncedAt: igProfile?.lastSyncedAt || new Date().toISOString(),
        }
      }

      onUpdateProps?.(patch)
      await onSave?.(patch)
      setSaveState('saved')
      setIsDirty(false)
      toast.success(`${platform.name} tile updated!`)
      onBack?.()
    } catch (err) {
      toast.error(err.message || 'Failed to save changes')
      setSaveState('saved')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCustomThumbnailUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file (PNG, JPG, WebP)')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Image must be under 10MB')
      return
    }

    setUploadingThumb(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await api.upload('/upload', fd)
      const uploadedUrl = res?.url || (res?.fileId ? `/api/files/${res.fileId}` : null)
      if (!uploadedUrl) throw new Error('Upload did not return an image URL')

      setThumbnail(uploadedUrl)
      setIsDirty(true)
      onUpdateProps?.({ thumbnail: uploadedUrl, customThumbnail: uploadedUrl })
      toast.success('Thumbnail uploaded!')
    } catch (err) {
      toast.error(err.message || 'Image upload failed')
    } finally {
      setUploadingThumb(false)
      if (e.target) e.target.value = ''
    }
  }

  const handleRemoveThumbnail = () => {
    setThumbnail(null)
    setIsDirty(true)
    onUpdateProps?.({ thumbnail: null, customThumbnail: null })
    toast.success('Thumbnail removed')
  }

  const handleLayoutChange = (newLayout) => {
    const resolved = resolveSocialStyle(newLayout)
    setLayout(resolved)
    setIsDirty(true)
    onUpdateProps?.({
      layout: resolved,
      displayMode: resolved,
      displayStyle: resolved,
    })
  }

  return (
    <StoreItemEditorShell
      title={platform.name}
      saveState={saveState}
      onBack={onBack}
      onDelete={onDelete}
      onToggleHidden={onToggleHidden}
      onDuplicate={onDuplicate}
      onOpenMobilePreview={onOpenMobilePreview}
      tabs={[
        { id: 'details', label: 'Details' },
        { id: 'powerups', label: 'Power-ups' },
        { id: 'insights', label: 'Insights' },
      ]}
      activeTab={activeTab}
      onTabChange={setActiveTab}
    >
      {/* TAB 1: DETAILS */}
      {activeTab === 'details' && (
        <div className="space-y-6">
          {/* 1. LIVE PREVIEW CARD */}
          <div className="w-full p-4 rounded-[20px] bg-[#F9F9F8] border border-[#E5E5E3] flex flex-col items-center justify-center">
            <span className="text-[11px] font-bold text-[#6F6F6B] uppercase tracking-wider mb-2 self-start px-1">
              Storefront Preview
            </span>

            {layout === 'classic' && (
              <div className="w-full max-w-[340px] p-3 rounded-full bg-white border border-[#E5E5E3] shadow-xs flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="h-10 w-10 rounded-full flex items-center justify-center shrink-0 overflow-hidden"
                    style={{ backgroundColor: `${platform.color}15`, color: platform.color }}
                  >
                    {isInstagram && isIgConnected && igProfile?.profilePictureUrl ? (
                      <img src={igProfile.profilePictureUrl} alt="" className="h-full w-full object-cover" />
                    ) : thumbnail ? (
                      <img src={thumbnail} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <PlatformIcon className="h-5 w-5" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="text-sm font-bold text-[#1F1F1F] truncate">
                      {title || platform.name}
                    </h4>
                    <p className="text-xs text-[#6F6F6B] truncate">
                      {isInstagram && isIgConnected ? `@${currentUsername}` : url ? url.replace(/^https?:\/\//, '') : 'Connect'}
                    </p>
                  </div>
                </div>
                <MoreVertical className="h-4 w-4 text-[#999995] shrink-0" />
              </div>
            )}

            {layout === 'cards' && (
              <div className="w-full max-w-[340px] p-4 rounded-[20px] bg-white border border-[#E5E5E3] shadow-sm space-y-3">
                <div className="h-44 w-full rounded-xl overflow-hidden bg-[#0A0A0A] flex items-center justify-center relative">
                  {isInstagram && isIgConnected && igMedia.length > 0 ? (
                    <img
                      src={igMedia[0].thumbnailUrl || igMedia[0].mediaUrl}
                      alt={igMedia[0].caption || 'Instagram Post'}
                      className="w-full h-full object-cover"
                    />
                  ) : thumbnail ? (
                    <img src={thumbnail} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="flex flex-col items-center justify-center gap-2">
                      <PlatformIcon className="h-10 w-10 text-white/70" />
                    </div>
                  )}
                  <div
                    className="absolute bottom-2.5 right-2.5 h-7 w-7 rounded-full flex items-center justify-center shadow"
                    style={{ backgroundColor: platform.color, color: '#FFFFFF' }}
                  >
                    <PlatformIcon className="h-4 w-4" />
                  </div>
                </div>
                <div className="text-center space-y-0.5">
                  <h4 className="text-sm font-bold text-[#1F1F1F] truncate">{title || platform.name}</h4>
                  <p className="text-xs text-[#6F6F6B] truncate">
                    {isInstagram && isIgConnected
                      ? (igMedia[0]?.caption ? igMedia[0].caption.slice(0, 48) + '...' : `@${currentUsername}`)
                      : url ? url.replace(/^https?:\/\//, '') : platform.name}
                  </p>
                </div>
                <button
                  type="button"
                  className="w-full py-2 px-3 rounded-full text-xs font-semibold text-white shadow-xs cursor-default"
                  style={{ backgroundColor: platform.color }}
                >
                  {isInstagram && isIgConnected ? 'View on Instagram' : `Follow on ${platform.name}`}
                </button>
              </div>
            )}

            {layout === 'grid' && (
              <div className="w-full max-w-[340px] p-4 rounded-[20px] bg-white border border-[#E5E5E3] shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <div
                      className="h-6 w-6 rounded-full flex items-center justify-center shrink-0 shadow-xs"
                      style={{ backgroundColor: platform.color, color: '#FFFFFF' }}
                    >
                      <PlatformIcon className="h-3.5 w-3.5" />
                    </div>
                    <h4 className="text-xs font-bold text-[#1F1F1F] truncate">
                      {isInstagram && isIgConnected ? `@${currentUsername}` : (title || platform.name)}
                    </h4>
                  </div>
                  <span className="text-[10px] font-semibold text-[#6F6F6B]">
                    {isInstagram && isIgConnected ? `${igMedia.length} posts` : 'Feed'}
                  </span>
                </div>

                {isInstagram && isIgConnected ? (
                  igMedia.length > 0 ? (
                    <div className="grid grid-cols-2 gap-1.5 aspect-[2/1] rounded-xl overflow-hidden bg-[#0A0A0A] p-1">
                      {igMedia.slice(0, 4).map((item, idx) => (
                        <div key={item.id || idx} className="rounded-lg overflow-hidden relative flex items-center justify-center bg-slate-800 aspect-square">
                          <img
                            src={item.thumbnailUrl || item.mediaUrl}
                            alt={item.caption || 'Instagram Post'}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="aspect-[2/1] rounded-xl border border-dashed border-[#E5E5E3] flex flex-col items-center justify-center p-3 text-center bg-[#FAFAF9]">
                      <PlatformIcon className="h-6 w-6 text-[#999995] mb-1" />
                      <p className="text-xs font-medium text-[#6F6F6B]">No Instagram posts found</p>
                    </div>
                  )
                ) : (
                  <div className="grid grid-cols-2 gap-2 aspect-[2/1] rounded-xl overflow-hidden bg-[#0A0A0A] p-1">
                    <div className="rounded-lg overflow-hidden relative flex items-center justify-center bg-slate-800">
                      {thumbnail ? (
                        <img src={thumbnail} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <PlatformIcon className="h-6 w-6 text-white/60" />
                      )}
                    </div>
                    <div className="flex flex-col items-center justify-center p-2 text-center bg-slate-900 rounded-lg">
                      <p className="text-[10px] text-white/70">Connect account to load posts</p>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <p className="text-xs text-[#6F6F6B] truncate">
                    {isInstagram && isIgConnected ? `@${currentUsername}` : url ? url.replace(/^https?:\/\//, '') : platform.name}
                  </p>
                  <button
                    type="button"
                    className="py-1 px-3 rounded-full text-xs font-semibold text-white shadow-xs shrink-0 cursor-default"
                    style={{ backgroundColor: platform.color }}
                  >
                    Follow
                  </button>
                </div>
              </div>
            )}

            {layout === 'carousel' && (
              <div className="w-full max-w-[340px] p-4 rounded-[20px] bg-white border border-[#E5E5E3] shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <div
                      className="h-6 w-6 rounded-full flex items-center justify-center shrink-0 shadow-xs"
                      style={{ backgroundColor: platform.color, color: '#FFFFFF' }}
                    >
                      <PlatformIcon className="h-3.5 w-3.5" />
                    </div>
                    <h4 className="text-xs font-bold text-[#1F1F1F] truncate">
                      {isInstagram && isIgConnected ? `@${currentUsername}` : (title || platform.name)}
                    </h4>
                  </div>
                  {isInstagram && isIgConnected && igMedia.length > 2 && (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setCarouselIndex(Math.max(0, carouselIndex - 1))}
                        disabled={carouselIndex === 0}
                        className="h-6 w-6 rounded-full bg-[#F5F5F3] hover:bg-[#E5E5E3] disabled:opacity-30 flex items-center justify-center text-[#1F1F1F]"
                      >
                        <ChevronLeft className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setCarouselIndex(Math.min(Math.max(0, igMedia.length - 2), carouselIndex + 1))}
                        disabled={carouselIndex >= igMedia.length - 2}
                        className="h-6 w-6 rounded-full bg-[#F5F5F3] hover:bg-[#E5E5E3] disabled:opacity-30 flex items-center justify-center text-[#1F1F1F]"
                      >
                        <ChevronRight className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                </div>

                {isInstagram && isIgConnected ? (
                  igMedia.length > 0 ? (
                    <div className="flex items-center gap-2 overflow-hidden py-1">
                      {igMedia.slice(carouselIndex, carouselIndex + 3).map((item, idx) => (
                        <div
                          key={item.id || idx}
                          className="h-32 w-24 rounded-xl overflow-hidden shrink-0 shadow-xs border border-[#E5E5E3] relative flex items-center justify-center bg-slate-900"
                        >
                          <img
                            src={item.thumbnailUrl || item.mediaUrl}
                            alt={item.caption || 'Instagram Post'}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="h-28 w-full rounded-xl border border-dashed border-[#E5E5E3] flex flex-col items-center justify-center p-3 text-center bg-[#FAFAF9]">
                      <PlatformIcon className="h-6 w-6 text-[#999995] mb-1" />
                      <p className="text-xs font-medium text-[#6F6F6B]">No Instagram posts found</p>
                    </div>
                  )
                ) : (
                  <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
                    <div className="h-28 w-24 rounded-xl overflow-hidden shrink-0 shadow-xs border border-[#E5E5E3] relative flex items-center justify-center bg-slate-900">
                      {thumbnail ? (
                        <img src={thumbnail} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <PlatformIcon className="h-8 w-8 text-white/60" />
                      )}
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <p className="text-xs text-[#6F6F6B] truncate">
                    {isInstagram && isIgConnected ? `@${currentUsername}` : url ? url.replace(/^https?:\/\//, '') : platform.name}
                  </p>
                  <button
                    type="button"
                    className="py-1 px-3 rounded-full text-xs font-semibold text-white shadow-xs shrink-0 cursor-default"
                    style={{ backgroundColor: platform.color }}
                  >
                    Follow
                  </button>
                </div>
              </div>
            )}

            {layout === 'profile' && (
              <div className="w-full max-w-[340px] p-4 rounded-[20px] bg-white border border-[#E5E5E3] shadow-sm space-y-3 text-center">
                <div className="relative inline-block mx-auto">
                  <div className="h-16 w-16 rounded-full overflow-hidden bg-slate-900 border-2 border-[#E5E5E3] flex items-center justify-center">
                    {isInstagram && isIgConnected && igProfile?.profilePictureUrl ? (
                      <img src={igProfile.profilePictureUrl} alt="" className="w-full h-full object-cover" />
                    ) : thumbnail ? (
                      <img src={thumbnail} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <PlatformIcon className="h-8 w-8 text-white/80" />
                    )}
                  </div>
                  <div
                    className="absolute bottom-0 right-0 h-5 w-5 rounded-full flex items-center justify-center shadow"
                    style={{ backgroundColor: platform.color, color: '#FFFFFF' }}
                  >
                    <PlatformIcon className="h-3 w-3" />
                  </div>
                </div>
                <div className="space-y-0.5">
                  <h4 className="text-sm font-bold text-[#1F1F1F] truncate">
                    {isInstagram && isIgConnected ? (igProfile?.name || `@${currentUsername}`) : (title || platform.name)}
                  </h4>
                  <p className="text-xs text-[#6F6F6B] truncate">
                    {isInstagram && isIgConnected ? `@${currentUsername}` : url ? url.replace(/^https?:\/\//, '') : platform.name}
                  </p>
                </div>
                <div className="grid grid-cols-3 gap-1 py-1 border-y border-[#E5E5E3] text-center">
                  <div>
                    <p className="text-xs font-bold text-[#1F1F1F]">
                      {isInstagram && isIgConnected
                        ? (typeof igProfile?.mediaCount === 'number' ? igProfile.mediaCount : igMedia.length || 0)
                        : 'Feed'}
                    </p>
                    <p className="text-[10px] text-[#6F6F6B]">Posts</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-[#1F1F1F]">
                      {isInstagram && isIgConnected
                        ? (igProfile?.followersCount != null
                            ? Number(igProfile.followersCount).toLocaleString()
                            : (igProfile?.followerCount != null
                                ? Number(igProfile.followerCount).toLocaleString()
                                : 'Unavailable'))
                        : platform.name}
                    </p>
                    <p className="text-[10px] text-[#6F6F6B]">Followers</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-[#1F1F1F]">
                      {isInstagram && isIgConnected
                        ? (igProfile?.followingCount != null
                            ? Number(igProfile.followingCount).toLocaleString()
                            : (igProfile?.followsCount != null
                                ? Number(igProfile.followsCount).toLocaleString()
                                : 'Unavailable'))
                        : 'Profile'}
                    </p>
                    <p className="text-[10px] text-[#6F6F6B]">Following</p>
                  </div>
                </div>
                <button
                  type="button"
                  className="w-full py-2 px-3 rounded-full text-xs font-semibold text-white shadow-xs cursor-default"
                  style={{ backgroundColor: platform.color }}
                >
                  Follow on {platform.name}
                </button>
              </div>
            )}

            {layout === 'single' && (
              <div className="w-full max-w-[340px] p-4 rounded-[20px] bg-white border border-[#E5E5E3] shadow-sm space-y-3">
                <div className="aspect-square w-full rounded-xl overflow-hidden bg-[#0A0A0A] relative flex items-center justify-center">
                  {isInstagram && isIgConnected && igMedia.length > 0 ? (
                    <img
                      src={igMedia[0].thumbnailUrl || igMedia[0].mediaUrl}
                      alt={igMedia[0].caption || 'Instagram Post'}
                      className="w-full h-full object-cover"
                    />
                  ) : thumbnail ? (
                    <img src={thumbnail} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <PlatformIcon className="h-12 w-12 text-white/70" />
                  )}
                  <div
                    className="absolute top-2.5 right-2.5 h-7 w-7 rounded-full flex items-center justify-center shadow"
                    style={{ backgroundColor: platform.color, color: '#FFFFFF' }}
                  >
                    <PlatformIcon className="h-4 w-4" />
                  </div>
                </div>
                <div className="text-center space-y-0.5">
                  <h4 className="text-sm font-bold text-[#1F1F1F] truncate">{title || platform.name}</h4>
                  <p className="text-xs text-[#6F6F6B] truncate">
                    {isInstagram && isIgConnected ? `@${currentUsername}` : url ? url.replace(/^https?:\/\//, '') : platform.name}
                  </p>
                </div>
                <button
                  type="button"
                  className="w-full py-2 px-3 rounded-full text-xs font-semibold text-white shadow-xs cursor-default"
                  style={{ backgroundColor: platform.color }}
                >
                  View on {platform.name}
                </button>
              </div>
            )}
          </div>

          {/* 2. SECTION: INFO (TITLE) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-base sm:text-[17px] font-bold text-[#1F1F1F]">
                Info <span className="text-[#DC2626]">*</span>
              </label>
              <span
                className={`text-xs font-mono ${
                  title.length > 255 ? 'text-[#DC2626] font-bold' : 'text-[#6F6F6B]'
                }`}
              >
                {title.length}/255
              </span>
            </div>

            <div className="relative">
              <input
                id="social-title-input"
                type="text"
                value={title}
                maxLength={255}
                onChange={(e) => {
                  setTitle(e.target.value)
                  setIsDirty(true)
                  if (titleError) setTitleError('')
                  onUpdateProps?.({ title: e.target.value, label: e.target.value })
                }}
                placeholder={platform.name}
                className={`w-full h-12 px-4 rounded-[12px] bg-[#FFFFFF] border text-[15px] font-medium text-[#1F1F1F] focus:outline-none focus:ring-1 transition-all pr-10 ${
                  titleError
                    ? 'border-[#DC2626] focus:border-[#DC2626] focus:ring-[#DC2626]'
                    : 'border-[#D9D9D9] focus:border-[#1F1F1F] focus:ring-[#1F1F1F]'
                }`}
              />
              <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#999995] pointer-events-none">
                <Sparkles className="h-4 w-4" />
              </div>
            </div>
            {titleError && (
              <p className="text-xs text-[#DC2626] flex items-center gap-1 font-medium">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                {titleError}
              </p>
            )}
          </div>

          {/* 3. SECTION: URL & CONNECTION */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-base sm:text-[17px] font-bold text-[#1F1F1F]">
                {platform.name} Destination URL
              </label>

              {/* Status indicator for Instagram */}
              {isInstagram && (
                <div className="flex items-center gap-1.5">
                  <div
                    className={`h-2 w-2 rounded-full ${
                      isIgConnected ? 'bg-[#16A34A]' : 'bg-[#DC2626]'
                    }`}
                  />
                  <span className="text-xs font-medium text-[#6F6F6B]">
                    {isIgConnected ? `@${currentUsername}` : isTokenExpired ? 'Expired' : 'Disconnected'}
                  </span>
                </div>
              )}
            </div>

            <div className="relative">
              <input
                id="social-url-input"
                type="text"
                value={url}
                onChange={(e) => {
                  setUrl(e.target.value)
                  setIsDirty(true)
                  validateUrl(e.target.value)
                  onUpdateProps?.({ url: e.target.value })
                }}
                placeholder={platform.urlPlaceholder}
                className={`w-full h-12 px-4 rounded-[12px] bg-[#FFFFFF] border text-sm font-medium text-[#1F1F1F] focus:outline-none focus:ring-1 transition-all ${
                  urlError
                    ? 'border-[#DC2626] focus:border-[#DC2626] focus:ring-[#DC2626]'
                    : 'border-[#D9D9D9] focus:border-[#1F1F1F] focus:ring-[#1F1F1F]'
                }`}
              />
            </div>
            {urlError && (
              <p className="text-xs text-[#DC2626] flex items-center gap-1 font-medium">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                {urlError}
              </p>
            )}

            {/* INSTAGRAM TOKEN EXPIRED BANNER (Shown ONLY when token is genuinely expired) */}
            {isInstagram && isTokenExpired && (
              <div className="p-4 rounded-[16px] bg-[#FEF2F2] border border-[#FEE2E2] flex items-start gap-3 mt-2">
                <div className="h-8 w-8 rounded-full bg-[#EF4444]/15 text-[#EF4444] flex items-center justify-center shrink-0 mt-0.5">
                  <AlertCircle className="h-5 w-5" />
                </div>
                <div className="flex-1 space-y-1">
                  <h5 className="text-sm font-bold text-[#991B1B]">
                    Instagram connection expired
                  </h5>
                  <p className="text-xs text-[#B91C1C]">
                    Your Instagram authorization has expired. Reconnect your account to continue syncing posts and profile stats automatically.
                  </p>
                  <div className="flex items-center gap-3 pt-2">
                    <button
                      id="instagram-reconnect-btn"
                      type="button"
                      onClick={() => onConnectInstagram?.()}
                      className="px-4 py-1.5 rounded-full bg-[#1F1F1F] hover:bg-black text-white text-xs font-semibold shadow-xs cursor-pointer"
                    >
                      Reconnect
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* INSTAGRAM NOT CONNECTED BANNER (Shown when no account is connected yet) */}
            {isInstagram && !isIgConnected && !isTokenExpired && (
              <div className="p-4 rounded-[16px] bg-[#F9F9F8] border border-[#E5E5E3] flex items-start gap-3 mt-2">
                <div className="h-8 w-8 rounded-full bg-[#1F1F1F]/10 text-[#1F1F1F] flex items-center justify-center shrink-0 mt-0.5">
                  <PlatformIcon className="h-4 w-4" />
                </div>
                <div className="flex-1 space-y-1">
                  <h5 className="text-sm font-bold text-[#1F1F1F]">
                    Connect Instagram
                  </h5>
                  <p className="text-xs text-[#6F6F6B]">
                    Connect your official Instagram account to automatically sync account information and display real Instagram posts. You can also save a manual profile link above without connecting.
                  </p>
                  <div className="flex items-center gap-3 pt-2">
                    <button
                      id="instagram-connect-btn"
                      type="button"
                      onClick={() => onConnectInstagram?.()}
                      className="px-4 py-1.5 rounded-full bg-[#1F1F1F] hover:bg-black text-white text-xs font-semibold shadow-xs cursor-pointer"
                    >
                      Connect Instagram
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* INSTAGRAM CONNECTED BANNER */}
            {isInstagram && isIgConnected && (
              <div className="p-4 rounded-[16px] bg-[#F0FDF4] border border-[#DCFCE7] flex flex-col gap-2 mt-2">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="h-7 w-7 rounded-full bg-[#16A34A]/15 text-[#16A34A] flex items-center justify-center">
                      <Check className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-[#166534]">
                        Connected as @{currentUsername}
                      </p>
                      <p className="text-[11px] text-[#15803D]">
                        Instagram account actively authenticated
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleManualSync}
                      disabled={syncingIg}
                      className="px-2.5 py-1 rounded-full text-xs font-medium text-[#166534] hover:bg-[#DCFCE7] border border-[#BBF7D0] cursor-pointer flex items-center gap-1"
                      title="Sync latest profile & posts"
                    >
                      <RefreshCw className={`h-3 w-3 ${syncingIg ? 'animate-spin' : ''}`} />
                      {syncingIg ? 'Syncing...' : 'Sync'}
                    </button>
                    <button
                      id="instagram-disconnect-btn"
                      type="button"
                      onClick={() => onDisconnectInstagram?.()}
                      className="px-3 py-1 rounded-full text-xs font-semibold text-[#DC2626] hover:bg-[#FEF2F2] border border-[#FCA5A5] cursor-pointer"
                    >
                      Disconnect
                    </button>
                  </div>
                </div>
                {isWebhookFailed && (
                  <p className="text-[11px] text-[#B45309] bg-[#FEF3C7] p-2 rounded-lg border border-[#FDE68A]">
                    Note: Webhook subscription is pending. Automated comment triggers are paused, but your storefront media display is active.
                  </p>
                )}
              </div>
            )}
          </div>

          {/* 4. SECTION: DISPLAY LAYOUT */}
          <div className="space-y-3">
            <div>
              <label className="text-base sm:text-[17px] font-bold text-[#1F1F1F]">
                Display
              </label>
              <p className="text-xs text-[#6F6F6B] mt-0.5">
                How you display your content on your storefront.
              </p>
            </div>

            <SocialStylePicker
              selectedStyle={layout}
              onSelectStyle={handleLayoutChange}
              platform={platform}
              isPro={isPro}
              onOpenPricing={onOpenPricing}
            />
          </div>

          {/* 5. SECTION: THUMBNAIL CUSTOMIZATION */}
          <div className="space-y-3">
            <div>
              <label className="text-base sm:text-[17px] font-bold text-[#1F1F1F]">
                Thumbnail
              </label>
              <p className="text-xs text-[#6F6F6B] mt-0.5">
                Customize the image displayed on your storefront tile.
              </p>
            </div>

            <div className="flex items-center gap-4 p-4 rounded-[16px] bg-[#F9F9F8] border border-[#E5E5E3]">
              <div className="relative h-16 w-24 rounded-[10px] overflow-hidden bg-black/10 shrink-0 border border-black/10 flex items-center justify-center">
                {thumbnail ? (
                  <img src={thumbnail} alt="" className="h-full w-full object-cover" />
                ) : (
                  <ImageIcon className="h-6 w-6 text-[#999995]" />
                )}
              </div>

              <div className="flex-1 flex flex-wrap items-center gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleCustomThumbnailUpload}
                  className="hidden"
                />

                <button
                  id="social-custom-thumbnail-btn"
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingThumb}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full border border-[#D9D9D9] bg-white hover:bg-[#F5F5F3] text-xs font-semibold text-[#1F1F1F] transition-all cursor-pointer shadow-xs disabled:opacity-50"
                >
                  {uploadingThumb ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Uploading...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="h-3.5 w-3.5" />
                      <span>{thumbnail ? 'Change image' : 'Upload custom thumbnail'}</span>
                    </>
                  )}
                </button>

                {thumbnail && (
                  <button
                    type="button"
                    onClick={handleRemoveThumbnail}
                    className="inline-flex items-center gap-1 px-3 py-2 rounded-full text-xs font-semibold text-[#DC2626] hover:bg-[#FEF2F2] transition-colors cursor-pointer"
                  >
                    <span>Remove thumbnail</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* 6. BOTTOM ACTIONS (SAVE / CANCEL) */}
          <div className="pt-4 border-t border-[#E5E5E3] flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onBack}
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-full border border-[#D9D9D9] bg-white hover:bg-[#F5F5F3] text-sm font-semibold text-[#1F1F1F] transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              id="social-editor-save-btn"
              type="button"
              onClick={handleSave}
              disabled={isSubmitting}
              className="px-6 py-2.5 rounded-full bg-[#1F1F1F] hover:bg-black text-white text-sm font-semibold transition-all cursor-pointer shadow-xs inline-flex items-center gap-2 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <span>Save Changes</span>
              )}
            </button>
          </div>
        </div>
      )}

      {/* TAB 2: POWER-UPS */}
      {activeTab === 'powerups' && (
        <div className="p-6 rounded-[20px] bg-[#F9F9F8] border border-[#E5E5E3] text-center space-y-2">
          <Zap className="h-8 w-8 text-[#7C3AED] mx-auto" />
          <h4 className="text-sm font-bold text-[#1F1F1F]">Social Power-ups</h4>
          <p className="text-xs text-[#6F6F6B] max-w-sm mx-auto">
            Schedule social links, add animation effects, and prioritize your profile tiles on storefront.
          </p>
        </div>
      )}

      {/* TAB 3: INSIGHTS */}
      {activeTab === 'insights' && (
        <div className="p-6 rounded-[20px] bg-[#F9F9F8] border border-[#E5E5E3] text-center space-y-2">
          <h4 className="text-sm font-bold text-[#1F1F1F]">Engagement Analytics</h4>
          <p className="text-xs text-[#6F6F6B]">
            Track outbound click-through rates and follower conversions for this tile.
          </p>
        </div>
      )}
    </StoreItemEditorShell>
  )
}
