'use client'

import React, { useMemo } from 'react'
import {
  Search,
  X,
  Sparkles,
  Store,
  Heart,
  PlayCircle,
  Contact,
  Calendar,
  Type,
  MoreHorizontal,
  Folder,
  Link2,
  Tag,
  MessageSquare,
  Package,
  Video,
  Layers,
  FileText,
  Instagram,
  Play,
  Images,
  Headphones,
  Music2,
  Youtube,
  Mail,
  Send,
  MessageSquareQuote,
  HelpCircle,
  Radio,
  AlignLeft,
  Heading,
  ChevronRight,
  Plus,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { AddOptionRow } from '@/components/ui/settings-row'
import { getSocialPlatform } from '@/lib/socialPlatforms'

export const WIZARD_CATEGORIES = [
  { id: 'suggested', label: 'Suggested', icon: Sparkles },
  { id: 'ecommerce', label: 'Commerce', icon: Store },
  { id: 'social', label: 'Social', icon: Heart },
  { id: 'media', label: 'Media', icon: PlayCircle },
  { id: 'contact', label: 'Contact', icon: Contact },
  { id: 'events', label: 'Events', icon: Calendar },
  { id: 'text', label: 'Text', icon: Type },
  { id: 'all', label: 'View all', icon: MoreHorizontal },
]

export const WIZARD_OPTIONS = [
  // Suggested category
  {
    id: 'instagram_suggested',
    category: 'suggested',
    title: 'Instagram',
    description: 'Display your posts and reels',
    icon: Instagram,
    color: '#E1306C',
    type: 'instagram',
    keywords: 'instagram social reels posts ig feed',
  },
  {
    id: 'tiktok_suggested',
    category: 'suggested',
    title: 'TikTok',
    description: 'Share your TikToks on your store',
    icon: Music2,
    color: '#000000',
    type: 'link_preset',
    presetUrl: 'https://tiktok.com',
    keywords: 'tiktok social video reels short',
  },
  {
    id: 'youtube_suggested',
    category: 'suggested',
    title: 'YouTube',
    description: 'Share YouTube videos on your store',
    icon: Youtube,
    color: '#EF4444',
    type: 'youtube',
    keywords: 'youtube video channel stream yt',
  },
  {
    id: 'gallery_suggested',
    category: 'suggested',
    title: 'Image gallery',
    description: 'Share a gallery of images',
    icon: Images,
    color: '#38BDF8',
    type: 'gallery',
    keywords: 'image gallery photos pictures carousel portfolio',
  },
  {
    id: 'audio_suggested',
    category: 'suggested',
    title: 'Spotify & Music',
    description: 'Share your latest tracks, playlist, or podcast',
    icon: Headphones,
    color: '#22C55E',
    type: 'audio',
    keywords: 'spotify music podcast audio soundcloud track song playlist',
  },
  {
    id: 'digital_product_suggested',
    category: 'suggested',
    title: 'Digital products',
    description: 'Sell downloadable files, guides, templates, and ebooks',
    icon: Package,
    color: '#F97316',
    type: 'digital_product',
    keywords: 'digital product download files guide pdf template ebook',
  },
  {
    id: 'coaching_suggested',
    category: 'suggested',
    title: 'Coaching & bookings',
    description: 'Sell 1:1 sessions, consultations, and private coaching',
    icon: Video,
    color: '#A855F7',
    type: 'coaching',
    keywords: 'coaching bookings 1:1 consultation call meeting calendar session',
  },
  {
    id: 'link_suggested',
    category: 'suggested',
    title: 'Link',
    description: 'Add any URL link or website',
    icon: Link2,
    color: '#22C55E',
    type: 'link',
    keywords: 'link url website external web page blog',
  },

  // Commerce category
  {
    id: 'coaching_commerce',
    category: 'ecommerce',
    section: 'Digital products',
    title: 'Coaching & bookings',
    description: 'Sell 1:1 sessions, consultations, and private coaching',
    icon: Video,
    color: '#A855F7',
    type: 'coaching',
    keywords: 'coaching bookings 1:1 consultation call meeting calendar session',
  },
  {
    id: 'digital_product_commerce',
    category: 'ecommerce',
    section: 'Digital products',
    title: 'Digital products',
    description: 'Sell documents, PDFs, guides, templates, and other content',
    icon: Package,
    color: '#F97316',
    type: 'digital_product',
    keywords: 'digital product download files guide pdf template ebook',
  },
  {
    id: 'bundles_commerce',
    category: 'ecommerce',
    section: 'Digital products',
    title: 'Bundles & Packages',
    description: 'Sell multiple products together as a package',
    icon: Layers,
    color: '#4F46E5',
    type: 'digital_product',
    keywords: 'bundle package multi products collection discount',
  },
  {
    id: 'affiliate_commerce',
    category: 'ecommerce',
    section: 'Affiliate products',
    title: 'Affiliate products',
    description: 'Earn by sharing products and recommendations you love',
    icon: Tag,
    color: '#84CC16',
    type: 'link',
    keywords: 'affiliate products recommend amazon shop link referral commission store',
  },

  // Social category
  {
    id: 'instagram_social',
    category: 'social',
    title: 'Instagram',
    description: 'Display your posts, reels, and profile',
    icon: Instagram,
    color: '#E1306C',
    type: 'instagram',
    platform: 'instagram',
    keywords: 'instagram social reels posts ig feed',
  },
  {
    id: 'tiktok_social',
    category: 'social',
    title: 'TikTok',
    description: 'Share your TikTok profile and videos',
    icon: Music2,
    color: '#000000',
    type: 'social',
    platform: 'tiktok',
    keywords: 'tiktok social video reels short',
  },
  {
    id: 'youtube_social',
    category: 'social',
    title: 'YouTube',
    description: 'Share your YouTube videos or channel',
    icon: Youtube,
    color: '#EF4444',
    type: 'social',
    platform: 'youtube',
    keywords: 'youtube video channel stream yt',
  },
  {
    id: 'facebook_social',
    category: 'social',
    title: 'Facebook',
    description: 'Connect with your audience on Facebook',
    icon: Link2,
    color: '#1877F2',
    type: 'social',
    platform: 'facebook',
    keywords: 'facebook fb page community meta',
  },
  {
    id: 'x_social',
    category: 'social',
    title: 'X',
    description: 'Share your X (Twitter) profile and thoughts',
    icon: Send,
    color: '#000000',
    type: 'social',
    platform: 'x',
    keywords: 'x twitter tweets microblog social',
  },
  {
    id: 'linkedin_social',
    category: 'social',
    title: 'LinkedIn',
    description: 'Showcase your professional network and career',
    icon: Link2,
    color: '#0A66C2',
    type: 'social',
    platform: 'linkedin',
    keywords: 'linkedin professional resume network business',
  },
  {
    id: 'pinterest_social',
    category: 'social',
    title: 'Pinterest',
    description: 'Share your boards, pins, and creative ideas',
    icon: Tag,
    color: '#BD081C',
    type: 'social',
    platform: 'pinterest',
    keywords: 'pinterest boards pins inspiration ideas',
  },
  {
    id: 'snapchat_social',
    category: 'social',
    title: 'Snapchat',
    description: 'Connect with friends and share your snaps',
    icon: Sparkles,
    color: '#EAB308',
    type: 'social',
    platform: 'snapchat',
    keywords: 'snapchat snap stories friends camera',
  },
  {
    id: 'twitch_social',
    category: 'social',
    title: 'Twitch',
    description: 'Stream live to your community on Twitch',
    icon: Radio,
    color: '#9146FF',
    type: 'social',
    platform: 'twitch',
    keywords: 'twitch gaming stream live broadcasting',
  },
  {
    id: 'discord_social',
    category: 'social',
    title: 'Discord',
    description: 'Invite creators and fans to your Discord community',
    icon: MessageSquare,
    color: '#5865F2',
    type: 'social',
    platform: 'discord',
    keywords: 'discord server community chat voice gaming',
  },
  {
    id: 'whatsapp_social',
    category: 'social',
    title: 'WhatsApp',
    description: 'Chat directly with your audience on WhatsApp',
    icon: MessageSquare,
    color: '#25D366',
    type: 'social',
    platform: 'whatsapp',
    keywords: 'whatsapp chat messaging direct contact phone',
  },
  {
    id: 'telegram_social',
    category: 'social',
    title: 'Telegram',
    description: 'Broadcast updates and chat on Telegram',
    icon: Send,
    color: '#229ED9',
    type: 'social',
    platform: 'telegram',
    keywords: 'telegram channel group broadcast chat bot',
  },
  {
    id: 'social_link',
    category: 'social',
    title: 'Social Link',
    description: 'Link to any social profile or community',
    icon: Link2,
    color: '#3B82F6',
    type: 'social',
    platform: 'generic',
    keywords: 'social link discord twitter x linkedin telegram',
  },

  // Media category
  {
    id: 'video_media',
    category: 'media',
    section: 'Video',
    title: 'Video',
    description: 'Add videos right to your store',
    icon: Play,
    color: '#84CC16',
    type: 'video',
    keywords: 'video mp4 stream player clip',
  },
  {
    id: 'youtube_media',
    category: 'media',
    section: 'Video',
    title: 'YouTube',
    description: 'Share YouTube videos on your store',
    icon: Youtube,
    color: '#EF4444',
    type: 'youtube',
    keywords: 'youtube video channel stream yt',
  },
  {
    id: 'tiktok_media',
    category: 'media',
    section: 'Video',
    title: 'TikTok Video',
    description: 'Share a TikTok video on your store',
    icon: Music2,
    color: '#000000',
    type: 'tiktok',
    keywords: 'tiktok video reel short',
  },
  {
    id: 'vimeo_media',
    category: 'media',
    section: 'Video',
    title: 'Vimeo',
    description: 'Add Vimeo videos to your store',
    icon: PlayCircle,
    color: '#06B6D4',
    type: 'vimeo',
    keywords: 'vimeo video stream player',
  },
  {
    id: 'pdf_media',
    category: 'media',
    section: 'Document',
    title: 'PDF display',
    description: 'Upload a PDF to share with your visitors',
    icon: FileText,
    color: '#F59E0B',
    type: 'pdf',
    keywords: 'pdf document reader file viewer doc',
  },
  {
    id: 'gallery_media',
    category: 'media',
    section: 'Document',
    title: 'Image gallery',
    description: 'Share a gallery of images',
    icon: Images,
    color: '#38BDF8',
    type: 'gallery',
    keywords: 'image gallery photos pictures carousel',
  },
  {
    id: 'audio_media',
    category: 'media',
    section: 'Audio',
    title: 'Audio track',
    description: 'Share a song, podcast, or audio file by URL',
    icon: Headphones,
    color: '#8B5CF6',
    type: 'audio',
    keywords: 'audio music podcast sound song mp3 stream spotify',
  },


  // Contact & Forms category
  {
    id: 'contact_form',
    category: 'contact',
    title: 'Contact form',
    description: 'Let visitors send direct inquiries to your inbox',
    icon: Mail,
    color: '#14B8A6',
    type: 'form_contact',
    keywords: 'contact form email message inquiries inbox',
  },
  {
    id: 'newsletter_form',
    category: 'contact',
    title: 'Newsletter signup',
    description: 'Grow your audience with email list signups',
    icon: Send,
    color: '#EC4899',
    type: 'form_newsletter',
    keywords: 'newsletter signup email list subscribers lead capture',
  },
  {
    id: 'feedback_form',
    category: 'contact',
    title: 'Feedback form',
    description: 'Collect ratings, reviews, and testimonials',
    icon: MessageSquareQuote,
    color: '#F59E0B',
    type: 'form_feedback',
    keywords: 'feedback form review ratings testimonial questions',
  },
  {
    id: 'qa_form',
    category: 'contact',
    title: 'Ask Me Anything',
    description: 'Collect questions and prompts from fans',
    icon: HelpCircle,
    color: '#6366F1',
    type: 'form_qa',
    keywords: 'ask me anything qa question prompt fan',
  },


  // Events category
  {
    id: 'coaching_events',
    category: 'events',
    title: 'Coaching & bookings',
    description: 'Sell 1:1 sessions, consultations, and private coaching',
    icon: Calendar,
    color: '#A855F7',
    type: 'coaching',
    keywords: 'coaching bookings 1:1 consultation call meeting calendar session events',
  },
  {
    id: 'webinar_events',
    category: 'events',
    title: 'Live Webinar or Event',
    description: 'Host interactive group masterclasses and live workshops',
    icon: Radio,
    color: '#EC4899',
    type: 'webinar',
    keywords: 'webinar event live workshop masterclass cohort',
  },

  // Text category
  {
    id: 'heading_text',
    category: 'text',
    title: 'Heading',
    description: 'Add a section title or header text to organize links',
    icon: Heading,
    color: '#1F1F1F',
    type: 'heading',
    keywords: 'heading title text header label divider',
  },
  {
    id: 'paragraph_text',
    category: 'text',
    title: 'Text block',
    description: 'Share paragraphs, notes, bio updates, or announcements',
    icon: AlignLeft,
    color: '#64748B',
    type: 'text_block',
    keywords: 'text block paragraph note announcement bio description',
  },
]

export default function AddToStoreMenuView({
  search = '',
  onSearchChange,
  category = 'suggested',
  onCategoryChange,
  onSelectOption,
  onQuickAction,
  products = [],
  onSelectExistingProduct,
  igAccount = { connected: false, username: '' },
}) {
  const visibleCategories = useMemo(
    () => WIZARD_CATEGORIES.filter((c) => !c.hidden),
    []
  )

  const isSearching = Boolean(search?.trim())
  const searchQuery = search.trim().toLowerCase()

  // Detect if search string looks like a pasted URL
  const isUrlQuery = useMemo(() => {
    if (!isSearching) return false
    const q = searchQuery
    return (
      q.startsWith('http://') ||
      q.startsWith('https://') ||
      q.includes('www.') ||
      /\.(com|org|net|co|io|in|app|store|me|ai|link)(\/|$)/i.test(q)
    )
  }, [isSearching, searchQuery])

  // Filtered existing products for search
  const filteredProducts = useMemo(() => {
    if (!Array.isArray(products) || products.length === 0) return []
    if (!isSearching) return products
    return products.filter((p) =>
      p.title?.toLowerCase().includes(searchQuery)
    )
  }, [products, isSearching, searchQuery])

  // Filtered options based on search or active category (Courses strictly excluded)
  const filteredOptions = useMemo(() => {
    if (isSearching) {
      return WIZARD_OPTIONS.filter((opt) => {
        if (opt.category === 'suggested' || opt.type === 'course') return false
        return (
          opt.title.toLowerCase().includes(searchQuery) ||
          opt.description.toLowerCase().includes(searchQuery) ||
          (opt.keywords && opt.keywords.toLowerCase().includes(searchQuery))
        )
      })
    }

    if (category === 'all') {
      return WIZARD_OPTIONS.filter(
        (opt) => opt.category !== 'suggested' && opt.type !== 'course'
      )
    }

    return WIZARD_OPTIONS.filter(
      (opt) => opt.category === category && opt.type !== 'course'
    )
  }, [isSearching, searchQuery, category])

  // Group filtered options by category and section
  const groupedSections = useMemo(() => {
    if (isSearching) {
      return [{ title: 'Search results', items: filteredOptions }]
    }

    if (category === 'suggested') {
      return [{ title: 'Suggested', items: filteredOptions }]
    }

    // View all: Iterate through all canonical categories and their sub-sections
    if (category === 'all') {
      const categoryOrder = [
        { id: 'ecommerce', label: 'Commerce' },
        { id: 'social', label: 'Social' },
        { id: 'media', label: 'Media' },
        { id: 'contact', label: 'Contact & Forms' },
        { id: 'events', label: 'Events' },
        { id: 'text', label: 'Text' },
      ]

      const groups = []
      for (const { id: catId, label: catLabel } of categoryOrder) {
        const catOptions = filteredOptions.filter((opt) => opt.category === catId)
        if (catOptions.length === 0) continue

        const hasSubsections = catOptions.some((opt) => Boolean(opt.section))
        if (!hasSubsections) {
          groups.push({ title: catLabel, items: catOptions })
        } else {
          const subMap = new Map()
          for (const opt of catOptions) {
            const sName = opt.section ? `${catLabel} — ${opt.section}` : catLabel
            if (!subMap.has(sName)) {
              subMap.set(sName, [])
              groups.push({ title: sName, items: subMap.get(sName) })
            }
            subMap.get(sName).push(opt)
          }
        }
      }
      return groups
    }

    // Single category selected
    const hasSections = filteredOptions.some((opt) => Boolean(opt.section))
    if (!hasSections) {
      const catObj = WIZARD_CATEGORIES.find((c) => c.id === category)
      const title = category === 'contact' ? 'Contact & Forms' : catObj?.label || 'Options'
      return [{ title, items: filteredOptions }]
    }

    const groups = []
    const sectionMap = new Map()

    for (const opt of filteredOptions) {
      const sName = opt.section || 'General'
      if (!sectionMap.has(sName)) {
        sectionMap.set(sName, [])
        groups.push({ title: sName, items: sectionMap.get(sName) })
      }
      sectionMap.get(sName).push(opt)
    }

    return groups
  }, [isSearching, category, filteredOptions])

  return (
    <div className="flex flex-col flex-1 min-h-0 h-full bg-white select-none">
      {/* 1. TOP FULL-WIDTH PILL SEARCH BAR */}
      <div className="px-4 sm:px-8 pt-1 pb-4 shrink-0">
        <div className="relative flex items-center w-full h-12 rounded-full bg-[#F2F1EF] px-4.5 transition-all focus-within:ring-2 focus-within:ring-[#1F1F1F]/20">
          <Search className="h-4.5 w-4.5 text-[#6F6F6B] shrink-0 mr-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange?.(e.target.value)}
            placeholder="Paste a link or search..."
            className="w-full bg-transparent border-none outline-none text-[#1F1F1F] placeholder:text-[#6F6F6B] text-[15px] font-medium"
            autoFocus={false}
          />
          {search ? (
            <button
              type="button"
              onClick={() => onSearchChange?.('')}
              className="p-1 rounded-full text-[#6F6F6B] hover:text-[#1F1F1F] hover:bg-[#E5E5E3] transition-colors ml-1 cursor-pointer shrink-0"
              title="Clear"
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </div>
      </div>

      {/* 2. MAIN WIZARD BODY (LEFT CATEGORIES + RIGHT CONTENT) */}
      <div className="flex flex-col md:grid md:grid-cols-[176px_1fr] flex-1 min-h-0 overflow-hidden px-4 sm:px-8 pb-4 sm:pb-6 gap-0">
        {/* LEFT COLUMN: CATEGORY NAVIGATION (DESKTOP) & HORIZONTAL BAR (MOBILE) */}
        {!isSearching && (
          <>
            {/* Desktop Left Rail */}
            <div className="hidden md:flex flex-col space-y-1 pr-3 overflow-y-auto shrink-0 min-h-0 h-full overscroll-contain">
              {visibleCategories.map((cat) => {
                const Icon = cat.icon
                const isActive = category === cat.id

                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => {
                      onCategoryChange?.(cat.id)
                      onSearchChange?.('')
                    }}
                    className={cn(
                      'w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-full text-sm transition-all duration-150 text-left cursor-pointer border-none',
                      isActive
                        ? 'border-2 border-[#1F1F1F] text-[#1F1F1F] font-bold bg-transparent'
                        : 'text-[#6F6F6B] hover:text-[#1F1F1F] hover:bg-[#F2F1EF] font-medium'
                    )}
                  >
                    <Icon className="h-4.5 w-4.5 shrink-0 stroke-[2.2]" />
                    <span className="truncate">{cat.label}</span>
                  </button>
                )
              })}
            </div>

            {/* Mobile Top Horizontal Scrolling Bar */}
            <div className="flex md:hidden items-center gap-1.5 overflow-x-auto pb-3 mb-2 shrink-0">
              {visibleCategories.map((cat) => {
                const Icon = cat.icon
                const isActive = category === cat.id

                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => {
                      onCategoryChange?.(cat.id)
                      onSearchChange?.('')
                    }}
                    className={cn(
                      'whitespace-nowrap inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs transition-all duration-150 shrink-0 cursor-pointer border-none',
                      isActive
                        ? 'border-2 border-[#1F1F1F] text-[#1F1F1F] font-bold bg-transparent'
                        : 'text-[#6F6F6B] hover:text-[#1F1F1F] hover:bg-[#F2F1EF] font-medium'
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span>{cat.label}</span>
                  </button>
                )
              })}
            </div>
          </>
        )}

        {/* RIGHT COLUMN: CONTENT ROWS & QUICK ACTIONS */}
        <div
          tabIndex={0}
          className={cn(
            'overflow-y-auto flex-1 min-h-0 h-full space-y-4 pr-1 overscroll-contain focus:outline-none [-webkit-overflow-scrolling:touch]',
            !isSearching ? 'pl-0 md:pl-4' : 'pl-0'
          )}
        >
          {/* A. DIRECT LINK QUICK ACTION ON URL INPUT */}
          {isUrlQuery && (
            <div className="pb-1">
              <button
                type="button"
                onClick={() =>
                  onQuickAction?.('link_direct', { url: search.trim() })
                }
                className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-[#F2F1EF] hover:bg-[#EAE9E6] transition-colors cursor-pointer group text-left border-none"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="h-11 w-11 rounded-full bg-[#22C55E] flex items-center justify-center text-white shrink-0">
                    <Plus className="h-5 w-5 stroke-[2.5]" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[15px] font-bold text-[#1F1F1F] truncate">
                      Add link:{' '}
                      <span className="font-normal text-[#6F6F6B]">
                        {search.trim()}
                      </span>
                    </p>
                    <p className="text-xs text-[#6F6F6B]">
                      Press to add this URL directly to your store
                    </p>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-[#6F6F6B] group-hover:text-[#1F1F1F] group-hover:translate-x-0.5 transition-all shrink-0 ml-3" />
              </button>
            </div>
          )}

          {/* B. TOP 4 QUICK ACTION CARDS (ONLY ON SUGGESTED CATEGORY WITHOUT SEARCH) */}
          {!isSearching && category === 'suggested' && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {/* 1. Collection */}
              <button
                type="button"
                onClick={() => onQuickAction?.('collection')}
                className="flex flex-col justify-between h-[84px] p-3.5 rounded-2xl bg-[#F2F1EF] hover:bg-[#EAE9E6] active:scale-[0.98] transition-all text-left border-none cursor-pointer group"
              >
                <span className="text-[13px] font-bold text-[#1F1F1F]">
                  Collection
                </span>
                <Folder className="h-4.5 w-4.5 text-[#1F1F1F] stroke-[1.8]" />
              </button>

              {/* 2. Link */}
              <button
                type="button"
                onClick={() => onQuickAction?.('link')}
                className="flex flex-col justify-between h-[84px] p-3.5 rounded-2xl bg-[#F2F1EF] hover:bg-[#EAE9E6] active:scale-[0.98] transition-all text-left border-none cursor-pointer group"
              >
                <span className="text-[13px] font-bold text-[#1F1F1F]">
                  Link
                </span>
                <Link2 className="h-4.5 w-4.5 text-[#1F1F1F] stroke-[2]" />
              </button>

              {/* 3. Product */}
              <button
                type="button"
                onClick={() => onQuickAction?.('product')}
                className="flex flex-col justify-between h-[84px] p-3.5 rounded-2xl bg-[#F2F1EF] hover:bg-[#EAE9E6] active:scale-[0.98] transition-all text-left border-none cursor-pointer group"
              >
                <span className="text-[13px] font-bold text-[#1F1F1F]">
                  Product
                </span>
                <Tag className="h-4.5 w-4.5 text-[#1F1F1F] stroke-[2]" />
              </button>

              {/* 4. Form */}
              <button
                type="button"
                onClick={() => onQuickAction?.('form')}
                className="flex flex-col justify-between h-[84px] p-3.5 rounded-2xl bg-[#F2F1EF] hover:bg-[#EAE9E6] active:scale-[0.98] transition-all text-left border-none cursor-pointer group"
              >
                <span className="text-[13px] font-bold text-[#1F1F1F]">
                  Form
                </span>
                <MessageSquare className="h-4.5 w-4.5 text-[#1F1F1F] stroke-[2]" />
              </button>
            </div>
          )}

          {/* C. CATEGORY ITEM GROUPS (WITH INLINE EXISTING PRODUCTS) */}
          {groupedSections.map((group, gIdx) => (
            <React.Fragment key={gIdx}>
              <div className="space-y-1.5">
                {group.title && (
                  <p className="text-sm font-semibold text-[#6F6F6B] px-1 pt-1">
                    {group.title}
                  </p>
                )}

                <div className="flex flex-col space-y-0.5">
                  {group.items.map((opt) => {
                    let desc = opt.description
                    if (opt.type === 'instagram') {
                      desc = igAccount?.connected
                        ? `Connected as @${igAccount.username} — click to disconnect`
                        : 'Display your posts, reels, and profile'
                    }
                    const RowIcon = opt.platform ? (getSocialPlatform(opt.platform)?.icon || opt.icon) : opt.icon

                    return (
                      <AddOptionRow
                        key={opt.id}
                        icon={RowIcon}
                        iconColor={opt.color}
                        title={opt.title}
                        description={desc}
                        onClick={() => onSelectOption?.(opt)}
                      />
                    )
                  })}
                </div>
              </div>

              {/* Render Existing Products after Affiliate products in Commerce tab or View all tab */}
              {!isSearching &&
                (group.title === 'Affiliate products' ||
                  group.title === 'Commerce — Affiliate products') &&
                Array.isArray(products) &&
                products.length > 0 && (
                  <div className="space-y-1.5 pt-2">
                    <p className="text-xs font-semibold text-[#6F6F6B] px-1 uppercase tracking-wider">
                      Add Existing Products
                    </p>
                    <div className="flex flex-col space-y-0.5">
                      {products.slice(0, 10).map((prod) => (
                        <AddOptionRow
                          key={prod.id}
                          icon={Package}
                          iconColor="#F97316"
                          title={prod.title}
                          description={
                            prod.price != null
                              ? `${prod.currency ? prod.currency.toUpperCase() : 'INR'} ${prod.price}`
                              : 'Digital Product'
                          }
                          onClick={() => onSelectExistingProduct?.(prod.id)}
                        />
                      ))}
                    </div>
                  </div>
                )}
            </React.Fragment>
          ))}

          {/* D. SEARCH RESULTS FOR EXISTING PRODUCTS */}
          {isSearching &&
            Array.isArray(filteredProducts) &&
            filteredProducts.length > 0 && (
              <div className="space-y-1.5 pt-2">
                <p className="text-xs font-semibold text-[#6F6F6B] px-1 uppercase tracking-wider">
                  Add Existing Products
                </p>
                <div className="flex flex-col space-y-0.5">
                  {filteredProducts.map((prod) => (
                    <AddOptionRow
                      key={prod.id}
                      icon={Package}
                      iconColor="#F97316"
                      title={prod.title}
                      description={
                        prod.price != null
                          ? `${prod.currency ? prod.currency.toUpperCase() : 'INR'} ${prod.price}`
                          : 'Digital Product'
                      }
                      onClick={() => onSelectExistingProduct?.(prod.id)}
                    />
                  ))}
                </div>
              </div>
            )}

          {/* E. EMPTY SEARCH STATE */}
          {isSearching &&
            filteredOptions.length === 0 &&
            filteredProducts.length === 0 &&
            !isUrlQuery && (
              <div className="py-16 flex flex-col items-center justify-center text-center">
                <Search className="h-8 w-8 text-[#A8A8A4] mb-3 stroke-[1.5]" />
                <p className="text-base font-bold text-[#1F1F1F]">
                  No matching options
                </p>
                <p className="text-xs text-[#6F6F6B] mt-1 max-w-xs">
                  Try another search term or paste a link directly into the search bar.
                </p>
              </div>
            )}
        </div>
      </div>
    </div>
  )
}
