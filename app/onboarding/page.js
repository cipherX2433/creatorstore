'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import {
  Loader2,
  ArrowRight,
  ArrowLeft,
  Check,
  CheckCircle2,
  Sparkles,
  Camera,
  GraduationCap,
  Users,
  Briefcase,
  Palette,
  Code,
  Flame,
  Brush,
  Layers,
  ShoppingBag,
  BookOpen,
  Award,
  Video,
  ExternalLink,
  Lock,
  Link2,
  Globe,
  Share2,
  Copy,
} from 'lucide-react'
import { api } from '@/lib/clientApi'
import { useAuth } from '@/components/auth/AuthContext'
import CreatorStoreBrand from '@/components/brand/CreatorStoreBrand'
import { normalizeSlug, isReservedSlug } from '@/lib/slug'
import {
  trackOnboardingStarted,
  trackOnboardingStepCompleted,
  trackOnboardingCompleted,
  trackStoreCreated,
} from '@/lib/analytics'

// Local storage key for draft resilience (client-only, NO partial DB writes)
const STORAGE_KEY = 'creatorstore_onboarding_draft_v3'

// 1. Creator Categories (What do you create?)
const CREATOR_TYPES = [
  { id: 'Content Creator', title: 'Content Creator', desc: 'Videos, reels, podcasts & social media', icon: '📹' },
  { id: 'Educator', title: 'Educator / Teacher', desc: 'Courses, workshops, guides & tutorials', icon: '🎓' },
  { id: 'Coach', title: 'Coach / Mentor', desc: '1:1 coaching, personal calls & advisory', icon: '👥' },
  { id: 'Consultant', title: 'Consultant', desc: 'Strategy, business audits & consulting', icon: '💼' },
  { id: 'Designer', title: 'Designer / Creative', desc: 'UI kits, templates, graphics & design assets', icon: '🎨' },
  { id: 'Developer', title: 'Developer / Builder', desc: 'Code, boilerplates, APIs & dev tools', icon: '💻' },
  { id: 'Influencer', title: 'Influencer', desc: 'Lifestyle, fitness, beauty, fashion & tech', icon: '🔥' },
  { id: 'Artist', title: 'Artist / Musician', desc: 'Digital art, beats, illustrations & sound', icon: '🖌️' },
  { id: 'Freelancer', title: 'Freelancer / Agency', desc: 'Bespoke client deliverables & custom services', icon: '📁' },
  { id: 'Other', title: 'Other Entrepreneur', desc: 'Digital goods, links, community & tools', icon: '✨' },
]

// 2. Offerings / Products to sell
const OFFERING_TYPES = [
  { id: 'digital_products', title: 'Digital Downloads & Guides', desc: 'Ebooks, PDFs, presets & templates', icon: '📘' },
  { id: 'courses', title: 'Online Courses', desc: 'Video lessons, masterclasses & modules', icon: '🎓' },
  { id: 'coaching', title: '1:1 Coaching & Calls', desc: 'Personal video sessions & consultations', icon: '👥' },
  { id: 'memberships', title: 'Memberships & Subscriptions', desc: 'Recurring subscriber content & access', icon: '🏆' },
  { id: 'communities', title: 'Exclusive Community', desc: 'Member groups, discussions & chats', icon: '💬' },
  { id: 'webinars', title: 'Live Webinars & Events', desc: 'Interactive live workshops & ticketed events', icon: '🎥' },
  { id: 'services', title: 'Custom Services', desc: 'Tailored work, design, writing or auditing', icon: '🛠️' },
  { id: 'external_links', title: 'Curated Links & Affiliates', desc: 'Monetized link-in-bio & resource hub', icon: '🔗' },
]

// 3. Target Audience
const AUDIENCE_TYPES = [
  { id: 'Beginners & Students', title: 'Beginners & Students', desc: 'Learners seeking guided knowledge', icon: '🎒' },
  { id: 'Fellow Creators', title: 'Fellow Creators & Builders', desc: 'Peers looking for tools and resources', icon: '🎨' },
  { id: 'Working Professionals', title: 'Working Professionals', desc: 'Career-focused individuals and experts', icon: '💼' },
  { id: 'Businesses & Founders', title: 'Businesses & Founders', desc: 'Teams, startups and commercial clients', icon: '🚀' },
  { id: 'General Community', title: 'General Followers & Fans', desc: 'Dedicated audience across social media', icon: '🌍' },
]

// 4. Discovery Sources
const DISCOVERY_SOURCES = [
  { id: 'Instagram', title: 'Instagram', icon: '📸' },
  { id: 'YouTube', title: 'YouTube', icon: '📹' },
  { id: 'Twitter / X', title: 'Twitter / X', icon: '🐦' },
  { id: 'LinkedIn', title: 'LinkedIn', icon: '💼' },
  { id: 'Friend / Referral', title: 'Friend / Creator Referral', icon: '👥' },
  { id: 'Google / Search', title: 'Google / Web Search', icon: '🔍' },
  { id: 'Other', title: 'Other', icon: '✨' },
]

// Accent Themes
const ACCENT_COLORS = [
  { hex: '#194DF5', name: 'CreatorStore Blue' },
  { hex: '#22C55E', name: 'Emerald' },
  { hex: '#F9B67D', name: 'Amber' },
  { hex: '#EF4444', name: 'Coral' },
  { hex: '#8B5CF6', name: 'Purple' },
  { hex: '#06B6D4', name: 'Cyan' },
  { hex: '#EC4899', name: 'Rose' },
  { hex: '#0D0D0D', name: 'Obsidian' },
]

const TOTAL_STEPS = 5

export default function OnboardingWizardPage() {
  const router = useRouter()
  const { user, isAuthenticated, loading: authLoading, profile, store, refresh } = useAuth()

  const [currentStep, setCurrentStep] = useState(1)
  const [booted, setBooted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [stepError, setStepError] = useState('')
  const [completed, setCompleted] = useState(false)
  const [copiedLink, setCopiedLink] = useState(false)

  // Local Client State (NO DB writes until final step)
  const [onboardingData, setOnboardingData] = useState({
    creatorType: '',
    offerings: ['digital_products'],
    audience: [],
    displayName: '',
    username: '',
    bio: '',
    accentColor: '#194DF5',
    discoverySource: '',
  })

  // Username availability state
  const [usernameStatus, setUsernameStatus] = useState('idle') // 'idle' | 'checking' | 'available' | 'taken'
  const [usernameError, setUsernameError] = useState('')
  const [isCurrentUsername, setIsCurrentUsername] = useState(false)
  const usernameCheckTimer = useRef(null)

  // 1. Initial boot and draft restoration
  useEffect(() => {
    if (authLoading) return
    if (!isAuthenticated || !user) {
      router.replace('/login')
      return
    }
    if (user.role === 'CUSTOMER') {
      router.replace('/account')
      return
    }
    if (profile?.onboardingComplete || profile?.onboardingStatus === 'COMPLETED') {
      router.replace('/dashboard')
      return
    }

    let draft = {}
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY)
      if (raw) draft = JSON.parse(raw)
    } catch { }

    const initialUsername = normalizeSlug(
      draft.username ||
      store?.username ||
      store?.slug ||
      (typeof window !== 'undefined' ? sessionStorage.getItem('creatorstore_pending_username') || '' : '') ||
      user?.name ||
      ''
    )

    const initialDisplayName =
      draft.displayName ||
      profile?.name ||
      user?.name ||
      (initialUsername ? initialUsername.charAt(0).toUpperCase() + initialUsername.slice(1) : '')

    setOnboardingData((prev) => ({
      ...prev,
      ...draft,
      displayName: initialDisplayName,
      username: initialUsername,
    }))

    if (initialUsername && initialUsername.length >= 3) {
      checkUsername(initialUsername)
    }

    setBooted(true)
    trackOnboardingStarted()
  }, [authLoading, isAuthenticated, user, profile, store, router])

  // 2. Persist local client draft in sessionStorage (safe client memory, zero DB calls)
  useEffect(() => {
    if (!booted) return
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(onboardingData))
    } catch { }
  }, [onboardingData, booted])

  // Debounced username availability checker
  function checkUsername(slug) {
    if (usernameCheckTimer.current) clearTimeout(usernameCheckTimer.current)

    if (!slug || slug.length < 3) {
      setUsernameStatus('idle')
      setUsernameError('')
      setIsCurrentUsername(false)
      return
    }

    if (isReservedSlug(slug)) {
      setUsernameStatus('taken')
      setIsCurrentUsername(false)
      setUsernameError('This username is reserved. Please pick another.')
      return
    }

    setUsernameStatus('checking')
    usernameCheckTimer.current = setTimeout(async () => {
      try {
        const res = await api.get(`/store/username/check?u=${encodeURIComponent(slug)}`)
        if (res?.available) {
          setUsernameStatus('available')
          setIsCurrentUsername(Boolean(res?.isCurrent))
          setUsernameError('')
          setStepError((prev) => (prev && prev.includes('username') ? '' : prev))
        } else {
          setUsernameStatus('taken')
          setIsCurrentUsername(false)
          setUsernameError(res?.error || 'This username is already taken. Please pick another.')
        }
      } catch {
        setUsernameStatus('idle')
      }
    }, 300)
  }

  function handleUsernameInput(e) {
    const clean = normalizeSlug(e.target.value)
    setOnboardingData((prev) => ({ ...prev, username: clean }))
    setStepError((prev) => (prev && prev.includes('username') ? '' : prev))
    checkUsername(clean)
  }

  // Toggle multi-select offerings
  function toggleOffering(id) {
    setStepError('')
    setOnboardingData((prev) => {
      const exists = prev.offerings.includes(id)
      const next = exists ? prev.offerings.filter((x) => x !== id) : [...prev.offerings, id]
      return { ...prev, offerings: next }
    })
  }

  // Toggle multi-select audience
  function toggleAudience(id) {
    setStepError('')
    setOnboardingData((prev) => {
      const exists = prev.audience.includes(id)
      const next = exists ? prev.audience.filter((x) => x !== id) : [...prev.audience, id]
      return { ...prev, audience: next }
    })
  }

  // Validation per step (Frontend-only validation)
  function validateCurrentStep() {
    setStepError('')
    if (currentStep === 1) {
      if (!onboardingData.creatorType) {
        setStepError('Please select what best describes your creator journey.')
        return false
      }
    }
    if (currentStep === 2) {
      if (!onboardingData.offerings || onboardingData.offerings.length === 0) {
        setStepError('Please select at least one product or offering type.')
        return false
      }
    }
    if (currentStep === 3) {
      if (!onboardingData.audience || onboardingData.audience.length === 0) {
        setStepError('Please choose at least one target audience group.')
        return false
      }
    }
    if (currentStep === 4) {
      if (!onboardingData.displayName.trim() || onboardingData.displayName.trim().length < 2) {
        setStepError('Please enter your creator or display name.')
        return false
      }
      if (!onboardingData.username || onboardingData.username.length < 3) {
        setStepError('Username must be at least 3 characters.')
        return false
      }
      if (usernameStatus === 'taken') {
        setStepError(usernameError || 'This username is already taken. Please pick another.')
        return false
      }
      if (usernameStatus === 'checking') {
        setStepError('Checking username availability...')
        return false
      }
    }
    if (currentStep === 5) {
      if (!onboardingData.discoverySource) {
        setStepError('Please select how you discovered CreatorStore.')
        return false
      }
    }
    return true
  }

  async function handleNext() {
    if (currentStep === 4 && (usernameStatus === 'checking' || usernameStatus === 'idle')) {
      const cleanU = normalizeSlug(onboardingData.username)
      if (cleanU && cleanU.length >= 3) {
        try {
          setUsernameStatus('checking')
          const res = await api.get(`/store/username/check?u=${encodeURIComponent(cleanU)}`)
          if (res?.available) {
            setUsernameStatus('available')
            setIsCurrentUsername(Boolean(res?.isCurrent))
            setUsernameError('')
            setStepError((prev) => (prev && prev.includes('username') ? '' : prev))
          } else {
            setUsernameStatus('taken')
            setIsCurrentUsername(false)
            const err = res?.error || 'This username is already taken. Please pick another.'
            setUsernameError(err)
            setStepError(err)
            return
          }
        } catch {
          // Fallback to validateCurrentStep
        }
      }
    }

    if (!validateCurrentStep()) return
    trackOnboardingStepCompleted(currentStep)
    setCurrentStep((s) => Math.min(s + 1, TOTAL_STEPS))
  }

  function handleBack() {
    setStepError('')
    if (currentStep > 1) {
      setCurrentStep((s) => s - 1)
    }
  }

  // =========================================================================
  // CRITICAL FINAL SUBMISSION: Single unified database write at the very end
  // =========================================================================
  async function handleFinalSubmit() {
    if (!validateCurrentStep() || submitting) return

    setSubmitting(true)
    setStepError('')

    try {
      const cleanU = normalizeSlug(onboardingData.username)
      const cleanName = onboardingData.displayName.trim()
      const cleanBio = onboardingData.bio.trim()
      const primaryCategory = onboardingData.creatorType || 'Content Creator'

      // 1. Set verified custom username (fails safely if conflict occurs)
      if (cleanU && cleanU.length >= 3) {
        await api.post('/store/username', { username: cleanU })
      }

      // 2. Persist store details & theme
      const themePayload = {
        primaryColor: onboardingData.accentColor || '#194DF5',
        buttonStyle: 'pill',
        cardStyle: 'solid',
        headerTitle: cleanName || 'Creator Store',
        headerBio: cleanBio,
      }

      await api.patch('/store', {
        storeName: `${cleanName}'s Store`,
        bio: cleanBio,
        theme: themePayload,
      }).catch(() => null)

      // 3. Mark profile onboarding complete
      await api.patch('/me/profile', {
        name: cleanName,
        bio: cleanBio,
        category: primaryCategory,
        onboardingComplete: true,
        onboardingStatus: 'COMPLETED',
      })

      // 4. Start 7-day trial automatically
      try {
        await api.post('/creator/subscription/start-trial')
      } catch (trialErr) {
        console.warn('Trial activation notice:', trialErr?.message || trialErr)
      }

      // 5. Clean local draft
      try {
        sessionStorage.removeItem(STORAGE_KEY)
        sessionStorage.removeItem('creatorstore_pending_username')
      } catch { }

      // 6. Refresh auth context and show success
      await refresh()
      trackOnboardingStepCompleted(5)
      trackOnboardingCompleted()
      trackStoreCreated({ store_type: primaryCategory })
      setCompleted(true)
      toast.success('Your CreatorStore is ready!')

      // Redirect smoothly to dashboard
      setTimeout(() => {
        router.replace('/dashboard/store')
      }, 1500)
    } catch (err) {
      const msg = err.message || 'Something went wrong while saving your setup. Please try again.'
      setStepError(msg)
      toast.error(msg)
    } finally {
      setSubmitting(false)
    }
  }

  function copyStoreUrl() {
    const url = `https://creatorstore.store/${onboardingData.username || 'yourname'}`
    navigator.clipboard?.writeText(url)
    setCopiedLink(true)
    toast.success('Storefront link copied!')
    setTimeout(() => setCopiedLink(false), 2000)
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#F2F5FE] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#194DF5]" />
      </div>
    )
  }

  // Completion / Celebration Screen
  if (completed) {
    return (
      <main className="min-h-screen w-full bg-[#F2F5FE] text-[#010619] flex flex-col items-center justify-center px-4 sm:px-6 py-10 sm:py-16 selection:bg-[#194DF5] selection:text-white">
        <div className="w-full max-w-[460px] mx-auto flex flex-col items-center">
          <div className="mb-6 sm:mb-8 flex justify-center">
            <CreatorStoreBrand href="/" theme="light" size="md" wordmarkClassName="text-lg sm:text-xl font-extrabold text-[#010619]" />
          </div>

          <div className="w-full bg-[#FFFFFF] border border-[#D8DFFA] rounded-[20px] shadow-[0_4px_20px_rgba(23,23,23,0.04)] p-6 sm:p-8 text-center space-y-6">
            <div className="w-16 h-16 rounded-full bg-[#EAF8EF] text-[#22C55E] mx-auto flex items-center justify-center text-3xl">
              🎉
            </div>

            <div className="space-y-1.5">
              <h1 className="text-2xl sm:text-[26px] font-extrabold text-[#010619] tracking-tight">
                Your CreatorStore is ready!
              </h1>
              <p className="text-sm text-[#3A4060] font-medium">
                We&apos;ve configured your storefront and activated your 7-day free trial.
              </p>
            </div>

            {/* Storefront Link Card */}
            <div className="w-full p-4 rounded-[14px] bg-[#E8EEFF] border border-[#194DF5]/30 flex items-center justify-between gap-3">
              <div className="text-left min-w-0">
                <span className="text-[11px] font-bold text-[#194DF5] uppercase tracking-wider">Your Live Store URL</span>
                <p className="text-sm font-extrabold text-[#010619] truncate">
                  creatorstore.store/{onboardingData.username || 'creator'}
                </p>
              </div>
              <button
                type="button"
                onClick={copyStoreUrl}
                className="px-3.5 py-2 rounded-full bg-[#FFFFFF] border border-[#D8DFFA] text-xs font-bold text-[#010619] hover:bg-[#EEF1FB] shrink-0 flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                {copiedLink ? <Check className="w-3.5 h-3.5 text-[#22C55E]" /> : <Copy className="w-3.5 h-3.5 text-[#3A4060]" />}
                <span>{copiedLink ? 'Copied' : 'Copy'}</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => router.replace('/dashboard/store')}
              className="w-full h-[48px] rounded-full bg-[#194DF5] hover:bg-[#1441D9] text-white font-bold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Enter Dashboard</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen w-full bg-[#F2F5FE] text-[#010619] flex flex-col items-center justify-center px-4 sm:px-6 py-10 sm:py-16 selection:bg-[#194DF5] selection:text-white">
      <div className="w-full max-w-[560px] mx-auto flex flex-col items-center">
        
        {/* 1. CreatorStore Logo / Brand */}
        <div className="mb-6 sm:mb-8 flex justify-center">
          <CreatorStoreBrand
            href="/"
            theme="light"
            size="md"
            wordmarkClassName="text-lg sm:text-xl tracking-tight font-extrabold text-[#010619]"
          />
        </div>

        {/* 2. Unified #FFFFFF Card Container */}
        <div className="w-full bg-[#FFFFFF] border border-[#D8DFFA] rounded-[20px] shadow-[0_4px_20px_rgba(23,23,23,0.04)] p-6 sm:p-8">

          {/* Top Segmented Progress Bar */}
          <div className="mb-6 flex items-center justify-center gap-1.5" aria-label={`Step ${currentStep} of ${TOTAL_STEPS}`}>
            {Array.from({ length: TOTAL_STEPS }).map((_, idx) => (
              <div
                key={idx}
                className={`w-8 sm:w-10 h-1 rounded-full transition-all duration-300 ${
                  idx + 1 <= currentStep ? 'bg-[#194DF5]' : 'bg-[#D8DFFA]'
                }`}
              />
            ))}
          </div>

          {/* Step Header */}
          <div className="text-center mb-6 space-y-1 w-full">
            {currentStep === 1 && (
              <>
                <h1 className="text-2xl sm:text-[26px] font-extrabold tracking-tight text-[#010619]">
                  What describes you best?
                </h1>
                <p className="text-sm font-medium text-[#3A4060]">
                  Tell us what you create so we can tailor your store.
                </p>
              </>
            )}

            {currentStep === 2 && (
              <>
                <h1 className="text-2xl sm:text-[26px] font-extrabold tracking-tight text-[#010619]">
                  What do you want to sell?
                </h1>
                <p className="text-sm font-medium text-[#3A4060]">
                  Select all the offerings you plan to add to your storefront.
                </p>
              </>
            )}

            {currentStep === 3 && (
              <>
                <h1 className="text-2xl sm:text-[26px] font-extrabold tracking-tight text-[#010619]">
                  Who is your audience?
                </h1>
                <p className="text-sm font-medium text-[#3A4060]">
                  Choose the main communities you create content and products for.
                </p>
              </>
            )}

            {currentStep === 4 && (
              <>
                <h1 className="text-2xl sm:text-[26px] font-extrabold tracking-tight text-[#010619]">
                  Let&apos;s personalize your store
                </h1>
                <p className="text-sm font-medium text-[#3A4060]">
                  Confirm your creator name, custom URL, and accent color.
                </p>
              </>
            )}

            {currentStep === 5 && (
              <>
                <h1 className="text-2xl sm:text-[26px] font-extrabold tracking-tight text-[#010619]">
                  How did you hear about us?
                </h1>
                <p className="text-sm font-medium text-[#3A4060]">
                  Help us understand where you discovered CreatorStore.
                </p>
              </>
            )}
          </div>

          {/* Error Notification */}
          {stepError && (
            <div className="w-full mb-5 p-3 rounded-[12px] bg-[#FDECEC] border border-[#EF4444]/20 text-[#EF4444] text-xs sm:text-sm flex items-center gap-2 font-medium">
              <span>✕</span>
              <span>{stepError}</span>
            </div>
          )}

          {/* =========================================================================
              STEP 1: Creator Type Selection (Single Select Cards)
             ========================================================================= */}
          {currentStep === 1 && (
            <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {CREATOR_TYPES.map((type) => {
                const isSelected = onboardingData.creatorType === type.id
                return (
                  <button
                    key={type.id}
                    type="button"
                    onClick={() => {
                      setStepError('')
                      setOnboardingData((prev) => ({ ...prev, creatorType: type.id }))
                    }}
                    className={`p-3.5 rounded-[14px] border text-left transition-all duration-150 flex items-start gap-3 cursor-pointer ${
                      isSelected
                        ? 'bg-[#E8EEFF] border-[#194DF5] ring-1 ring-[#194DF5]/30'
                        : 'bg-[#FFFFFF] border-[#D8DFFA] hover:border-[#C4CFFB] hover:bg-[#EEF1FB]'
                    }`}
                  >
                    <span className="text-2xl shrink-0">{type.icon}</span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <p className={`text-sm font-bold truncate ${isSelected ? 'text-[#194DF5]' : 'text-[#010619]'}`}>
                          {type.title}
                        </p>
                        {isSelected && <Check className="w-4 h-4 text-[#194DF5] stroke-[3] shrink-0" />}
                      </div>
                      <p className="text-xs text-[#3A4060] font-normal leading-tight mt-0.5 line-clamp-2">
                        {type.desc}
                      </p>
                    </div>
                  </button>
                )
              })}
            </div>
          )}

          {/* =========================================================================
              STEP 2: Offerings Selection (Multi-Select Cards)
             ========================================================================= */}
          {currentStep === 2 && (
            <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {OFFERING_TYPES.map((offering) => {
                const isSelected = onboardingData.offerings.includes(offering.id)
                return (
                  <button
                    key={offering.id}
                    type="button"
                    onClick={() => toggleOffering(offering.id)}
                    className={`p-3.5 rounded-[14px] border text-left transition-all duration-150 flex items-start gap-3 cursor-pointer ${
                      isSelected
                        ? 'bg-[#E8EEFF] border-[#194DF5] ring-1 ring-[#194DF5]/30'
                        : 'bg-[#FFFFFF] border-[#D8DFFA] hover:border-[#C4CFFB] hover:bg-[#EEF1FB]'
                    }`}
                  >
                    <span className="text-2xl shrink-0">{offering.icon}</span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <p className={`text-sm font-bold truncate ${isSelected ? 'text-[#194DF5]' : 'text-[#010619]'}`}>
                          {offering.title}
                        </p>
                        {isSelected && <Check className="w-4 h-4 text-[#194DF5] stroke-[3] shrink-0" />}
                      </div>
                      <p className="text-xs text-[#3A4060] font-normal leading-tight mt-0.5 line-clamp-2">
                        {offering.desc}
                      </p>
                    </div>
                  </button>
                )
              })}
            </div>
          )}

          {/* =========================================================================
              STEP 3: Audience Selection (Multi-Select Cards)
             ========================================================================= */}
          {currentStep === 3 && (
            <div className="w-full space-y-2.5">
              {AUDIENCE_TYPES.map((aud) => {
                const isSelected = onboardingData.audience.includes(aud.id)
                return (
                  <button
                    key={aud.id}
                    type="button"
                    onClick={() => toggleAudience(aud.id)}
                    className={`w-full p-3.5 rounded-[14px] border text-left transition-all duration-150 flex items-center justify-between gap-3 cursor-pointer ${
                      isSelected
                        ? 'bg-[#E8EEFF] border-[#194DF5] ring-1 ring-[#194DF5]/30'
                        : 'bg-[#FFFFFF] border-[#D8DFFA] hover:border-[#C4CFFB] hover:bg-[#EEF1FB]'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-2xl shrink-0">{aud.icon}</span>
                      <div className="min-w-0">
                        <p className={`text-sm font-bold truncate ${isSelected ? 'text-[#194DF5]' : 'text-[#010619]'}`}>
                          {aud.title}
                        </p>
                        <p className="text-xs text-[#3A4060] font-normal mt-0.5 truncate">
                          {aud.desc}
                        </p>
                      </div>
                    </div>
                    <div className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${
                      isSelected ? 'bg-[#194DF5] border-[#194DF5] text-white' : 'border-[#D8DFFA] bg-[#FFFFFF]'
                    }`}>
                      {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </div>
                  </button>
                )
              })}
            </div>
          )}

          {/* =========================================================================
              STEP 4: Store Details & Customization (Input + Color Swatches)
             ========================================================================= */}
          {currentStep === 4 && (
            <div className="w-full space-y-3.5">
              {/* Display Name Input */}
              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-[#010619] uppercase tracking-wider text-left">
                  Creator Display Name
                </label>
                <input
                  type="text"
                  value={onboardingData.displayName}
                  onChange={(e) => {
                    setStepError('')
                    setOnboardingData((prev) => ({ ...prev, displayName: e.target.value }))
                  }}
                  placeholder="e.g. Maya Sharma"
                  className="w-full h-[48px] px-3.5 rounded-[12px] bg-[#FFFFFF] border border-[#D8DFFA] text-sm font-medium text-[#010619] placeholder:text-[#6B7399] outline-none focus:border-[#194DF5] focus:ring-2 focus:ring-[#E8EEFF] transition-all"
                />
              </div>

              {/* Custom URL Input with Live Availability */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold text-[#010619] uppercase tracking-wider text-left">
                  Your Custom Storefront URL
                </label>
                <div
                  className={`relative flex items-center h-[48px] px-3.5 rounded-[12px] bg-[#FFFFFF] border transition-all ${
                    usernameStatus === 'taken'
                      ? 'border-[#EF4444]'
                      : usernameStatus === 'available'
                      ? 'border-[#22C55E]/50'
                      : 'border-[#D8DFFA] focus-within:border-[#194DF5] focus-within:ring-2 focus-within:ring-[#E8EEFF]'
                  }`}
                >
                  <Link2 className="h-4 w-4 text-[#194DF5] mr-2 shrink-0" />
                  <span className="text-xs sm:text-sm font-semibold text-[#6B7399] select-none shrink-0">
                    creatorstore.store/
                  </span>
                  <input
                    type="text"
                    value={onboardingData.username}
                    onChange={handleUsernameInput}
                    placeholder="yourname"
                    className="min-w-0 flex-1 h-full bg-transparent outline-none text-xs sm:text-sm font-bold text-[#010619] placeholder:text-[#6B7399] ml-0.5"
                  />
                  <div className="ml-2 shrink-0 flex items-center">
                    {usernameStatus === 'checking' && (
                      <Loader2 className="h-4 w-4 animate-spin text-[#194DF5]" />
                    )}
                    {usernameStatus === 'available' && (
                      <span className="text-xs text-[#22C55E] font-bold flex items-center gap-1 select-none">
                        <Check className="h-4 w-4 text-[#22C55E] stroke-[3]" />
                        <span>{isCurrentUsername ? 'Current' : 'Available'}</span>
                      </span>
                    )}
                    {usernameStatus === 'taken' && (
                      <span className="text-xs text-[#EF4444] font-bold select-none">Taken</span>
                    )}
                  </div>
                </div>

                {/* Live Availability Status Message */}
                {usernameStatus === 'available' && isCurrentUsername && (
                  <p className="text-[11px] text-[#16A34A] font-medium text-left">
                    Your current username
                  </p>
                )}
                {usernameStatus === 'available' && !isCurrentUsername && (
                  <p className="text-[11px] text-[#16A34A] font-medium text-left">
                    Username is available
                  </p>
                )}
                {usernameStatus === 'taken' && (
                  <p className="text-[11px] text-[#EF4444] font-medium text-left">
                    {usernameError || 'This username is already taken. Please pick another.'}
                  </p>
                )}
              </div>

              {/* Short Bio / Tagline */}
              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-[#010619] uppercase tracking-wider text-left">
                  Short Bio / Headline (Optional)
                </label>
                <input
                  type="text"
                  value={onboardingData.bio}
                  onChange={(e) => setOnboardingData((prev) => ({ ...prev, bio: e.target.value }))}
                  placeholder="e.g. Digital product creator & educator sharing practical templates."
                  className="w-full h-[48px] px-3.5 rounded-[12px] bg-[#FFFFFF] border border-[#D8DFFA] text-sm font-medium text-[#010619] placeholder:text-[#6B7399] outline-none focus:border-[#194DF5] focus:ring-2 focus:ring-[#E8EEFF] transition-all"
                />
              </div>

              {/* Accent Color Theme */}
              <div className="space-y-1.5 pt-1">
                <label className="block text-[11px] font-bold text-[#010619] uppercase tracking-wider text-left">
                  Store Theme Accent
                </label>
                <div className="flex items-center gap-2.5 flex-wrap">
                  {ACCENT_COLORS.map((color) => {
                    const isSelected = onboardingData.accentColor === color.hex
                    return (
                      <button
                        key={color.hex}
                        type="button"
                        onClick={() => setOnboardingData((prev) => ({ ...prev, accentColor: color.hex }))}
                        className={`w-8 h-8 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                          isSelected ? 'ring-2 ring-offset-2 ring-[#194DF5] scale-110' : 'hover:scale-105'
                        }`}
                        style={{ backgroundColor: color.hex }}
                        aria-label={`Select ${color.name}`}
                      >
                        {isSelected && <Check className="w-3.5 h-3.5 text-white stroke-[3]" />}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          {/* =========================================================================
              STEP 5: Discovery Source (Single Select)
             ========================================================================= */}
          {currentStep === 5 && (
            <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {DISCOVERY_SOURCES.map((src) => {
                const isSelected = onboardingData.discoverySource === src.id
                return (
                  <button
                    key={src.id}
                    type="button"
                    onClick={() => {
                      setStepError('')
                      setOnboardingData((prev) => ({ ...prev, discoverySource: src.id }))
                    }}
                    className={`p-3.5 rounded-[14px] border text-left transition-all duration-150 flex items-center justify-between gap-3 cursor-pointer ${
                      isSelected
                        ? 'bg-[#E8EEFF] border-[#194DF5] ring-1 ring-[#194DF5]/30'
                        : 'bg-[#FFFFFF] border-[#D8DFFA] hover:border-[#C4CFFB] hover:bg-[#EEF1FB]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="text-xl">{src.icon}</span>
                      <span className={`text-sm font-bold ${isSelected ? 'text-[#194DF5]' : 'text-[#010619]'}`}>
                        {src.title}
                      </span>
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-[#194DF5] stroke-[3]" />}
                  </button>
                )
              })}
            </div>
          )}

          {/* =========================================================================
              NAVIGATION CONTROLS: Next / Back / Complete Setup
             ========================================================================= */}
          <div className="w-full pt-6 flex items-center justify-between gap-3">
            {currentStep > 1 ? (
              <button
                type="button"
                onClick={handleBack}
                disabled={submitting}
                className="h-[48px] px-5 rounded-full border border-[#D8DFFA] bg-[#EEF1FB] text-xs sm:text-sm font-bold text-[#010619] hover:bg-[#EEF1FB] transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </button>
            ) : (
              <div />
            )}

            {currentStep < TOTAL_STEPS ? (
              <button
                type="button"
                onClick={handleNext}
                className="flex-1 sm:flex-initial sm:min-w-[180px] h-[48px] px-6 rounded-full bg-[#194DF5] hover:bg-[#1441D9] text-white font-bold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99]"
              >
                <span>Next</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleFinalSubmit}
                disabled={submitting}
                className="flex-1 sm:flex-initial sm:min-w-[200px] h-[48px] px-6 rounded-full bg-[#194DF5] hover:bg-[#1441D9] text-white font-bold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-75 disabled:cursor-not-allowed active:scale-[0.99]"
              >
                {submitting ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>Creating store...</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-2">
                    <span>Complete Setup</span>
                    <Sparkles className="w-4 h-4" />
                  </span>
                )}
              </button>
            )}
          </div>
        </div>

      </div>
    </main>
  )
}
