import crypto from 'crypto'
import { v4 as uuidv4 } from 'uuid'
import { prisma } from './prisma.js'
import { supabase, supabaseAdmin, ensureBucket, resolveDigitalProductStoragePath } from './supabase.js'
import {
  hashPassword, verifyPassword, validatePassword, signToken, verifyToken, signPurpose, verifyPurpose,
  generateSecureToken, generateOtp, hashToken,
} from './auth.js'
import { sanitizeText, sanitizeUrl, sanitizeHtml, getAppUrl } from './utils.js'
import { getPaymentProvider, getRazorpayMode, isPlaceholderRazorpayId, allowRazorpayMockFallbacks } from './payments.js'
import { generateUniqueStoreSlug, slugify as generateSlug, normalizeSlug, isReservedSlug } from './slug.js'
import {
  emailService, getEmailService, purchaseConfirmationEmail, productDeliveryEmail,
  passwordResetEmail, emailVerificationEmail, coachingBookingConfirmationEmail,
  webinarRegistrationEmail, webinarCancellationEmail,
  membershipActivatedEmail, membershipCancelledEmail,
  customServiceRequestEmail, customServiceDeliveredEmail,
} from './email.js'
export { emailService, getEmailService }
import {
  usersRepo, profilesRepo, storesRepo, storeSectionsRepo, productsRepo, customersRepo,

  ordersRepo, entitlementsRepo, productAccessTokensRepo, analyticsRepo, razorpayEventsRepo, razorpayAccountRepo,
  payoutProfilesRepo, payoutAuditRepo, paymentsRepo, transfersRepo, refundsRepo, webhookEventsRepo,
  earningsLedgerRepo, creatorSubscriptionsRepo, checkoutFieldsRepo,
  coursesRepo, modulesRepo, lessonsRepo, courseProgressRepo, certificatesRepo, coachingRepo, communityRepo, communityResourcesRepo, webinarRepo, membershipRepo, membershipPostsRepo, membershipTiersRepo, customServiceRepo, externalLinkRepo,

  leadsRepo, couponsRepo, emailRepo, customerTagsRepo, onboardingRepo,
  instagramRepo, automationsRepo, automationEventsRepo, otpVerificationsRepo,
} from './repos.js'
import {
  PLAN_IDS, PLAN_FEATURES, SUBSCRIPTION_PRICING, getSubscriptionPricing, validatePricingConfig, normalizePlanId, getPlanConfig, hasEntitlement, getEntitlementLimit,
} from './plans.js'
import {
  BILLING_REGIONS, BILLING_PROVIDERS, normalizeRegion, resolveBillingConfig,
} from './billing/config.js'
import { dodoProvider, isDodoConfigured } from './dodo.js'

const RESERVED = new Set(['admin', 'api', 'dashboard', 'login', 'signup', 'settings', 'support', 'help', 'pricing', 'checkout', 'blog', 'about', 'terms', 'privacy', 'community', 'account', 'learn', 'onboarding', '_next', 'favicon.ico', 'robots.txt', 'sitemap.xml', 'www', 'app', 'static'])

export function validateUsername(username) {
  const u = normalizeSlug(username)
  if (!/^[a-z0-9_-]{3,30}$/.test(u)) return { ok: false, error: 'Username must be 3-30 chars: letters, numbers, - or _' }
  if (RESERVED.has(u) || isReservedSlug(u)) return { ok: false, error: 'This username is reserved' }
  return { ok: true, username: u }
}

export function slugify(str) {
  return String(str || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'product'
}

const DEFAULT_THEME = { primaryColor: '#4D7CFF', buttonRadius: 12, buttonStyle: 'solid', font: 'Manrope', background: '#ffffff', cardStyle: 'shadow' }
function defaultSections() {
  return []
}

function validateCustomUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string') return null
  const trimmed = rawUrl.trim()
  try {
    const parsed = new URL(trimmed)
    const protocol = parsed.protocol.toLowerCase()
    if (protocol !== 'https:' && protocol !== 'http:') return null

    const hostname = parsed.hostname.toLowerCase()
    if (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '0.0.0.0' ||
      hostname.endsWith('.local') ||
      hostname.endsWith('.internal') ||
      hostname === '::1'
    ) {
      return null
    }

    if (/^(10\.|172\.(1[6-9]|2[0-9]|3[01])\.|192\.168\.)/.test(hostname)) {
      return null
    }

    return parsed.toString()
  } catch (e) {
    return null
  }
}

export const attributionService = {
  generateAttributionToken({ creatorId, automationId, productId, customUrl }) {
    if (!creatorId || !automationId) return null
    try {
      const payload = { c: creatorId, a: automationId }
      if (productId) payload.p = productId
      if (customUrl) payload.u = customUrl
      const jsonStr = JSON.stringify(payload)
      const b64 = Buffer.from(jsonStr).toString('base64url')
      return `ref_${b64}`
    } catch {
      return signPurpose({ creatorId, automationId, productId: productId || null, customUrl: customUrl || null }, 'automation_attribution', 30 * 24 * 60 * 60)
    }
  },
  verifyAttributionToken(token) {
    if (!token) return null
    if (token.startsWith('ref_')) {
      try {
        const jsonStr = Buffer.from(token.slice(4), 'base64url').toString('utf8')
        const p = JSON.parse(jsonStr)
        if (p && p.c && p.a) {
          return { creatorId: p.c, automationId: p.a, productId: p.p || null, customUrl: p.u || null }
        }
      } catch (e) {
        // Fall through to legacy JWT check
      }
    }
    const payload = verifyPurpose(token, 'automation_attribution')
    if (!payload || !payload.creatorId || !payload.automationId) return null
    return payload
  }
}

// Track OTP attempts & rate limits in memory
const failedOtpAttempts = new Map() // email -> { count: number, lastAttempt: number }
const resendTimestamps = new Map() // email -> number (timestamp)

// ---------------- Auth ----------------
export const authService = {
  async signup({ email, password, name, storeName, accountType, role, username, slug, phone }) {
    const lower = String(email || '').toLowerCase().trim()
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(lower)) throw httpError(400, 'Enter a valid email')
    const pwdError = validatePassword(password)
    if (pwdError) throw httpError(400, pwdError)
    const existing = await usersRepo.findByEmail(lower)
    if (existing) throw httpError(409, 'An account with this email already exists')

    const rawRole = String(accountType || role || '').toUpperCase()
    const userRole = rawRole === 'CUSTOMER' ? 'CUSTOMER' : 'CREATOR'

    const cleanName = sanitizeText(name || '')
    const cleanPhone = sanitizeText(phone || '')
    const cleanStoreName = sanitizeText(storeName || name || '')

    const userId = uuidv4()
    const passwordHash = hashPassword(password)

    const rawOtp = generateOtp()
    const verifyHash = hashToken(rawOtp)
    const verifyExpires = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes

    const user = {
      id: userId,
      email: lower,
      passwordHash: passwordHash,
      role: userRole,
      emailVerified: false,
      verificationTokenHash: verifyHash,
      verificationTokenExpires: verifyExpires,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    await usersRepo.create(user)
    await otpVerificationsRepo.upsert({
      identifier: lower,
      purpose: 'EMAIL_VERIFICATION',
      otpHash: verifyHash,
      expiresAt: verifyExpires,
      resendAvailableAt: new Date(Date.now() + 60 * 1000),
      maxAttempts: 5,
    }).catch(e => console.error('otpVerificationsRepo.upsert error on signup:', e))

    const initialStatus = userRole === 'CREATOR' ? 'USERNAME' : 'COMPLETED'

    await profilesRepo.upsert(user.id, {
      name: cleanName,
      phone: cleanPhone,
      bio: '',
      category: '',
      avatarUrl: '',
      socialLinks: {},
      onboardingStatus: initialStatus,
      onboardingComplete: userRole === 'CUSTOMER',
    })

    if (userRole === 'CREATOR') {
      const storeSlug = await generateUniqueStoreSlug(
        slug || username || cleanStoreName || cleanName,
        user.id,
        (candidate, uid) => storesRepo.usernameTaken(candidate, uid)
      )

      await storesRepo.upsertStore(user.id, {
        id: uuidv4(),
        creatorId: user.id,
        storeName: cleanStoreName || cleanName || 'Creator Store',
        username: storeSlug,
        slug: storeSlug,
        published: false,
        theme: DEFAULT_THEME,
        sections: defaultSections(),
        seo: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      await creatorSubscriptionsRepo.upsert(user.id, {
        status: 'INACTIVE',
        plan: 'UNSUBSCRIBED',
        billingCycle: 'MONTHLY',
        price: 0,
        currency: 'USD',
      })
    }

    try {
      await emailService.sendVerificationEmail({ to: lower, name: cleanName, otp: rawOtp })
    } catch (e) { console.error('Verification email error', e) }

    return {
      ok: true,
      requiresVerification: true,
      email: lower,
      message: 'Account created. Please check your email for your 6-digit verification code.',
      user: publicUser(user),
    }
  },
  async login({ email, password }) {
    const lower = String(email || '').toLowerCase().trim()
    if (!lower || !password) throw httpError(401, 'Invalid email or password')

    let dbUser = await usersRepo.findByEmail(lower)
    if (!dbUser) {
      const cleanSlug = lower.replace(/^@/, '')
      const store = await storesRepo.getBySlug(cleanSlug)
      if (store?.creatorId) {
        dbUser = await usersRepo.findById(store.creatorId)
      }
    }
    if (!dbUser) {
      throw httpError(401, 'Invalid email or password')
    }

    if (dbUser.passwordHash === '[SUPABASE_AUTH]') {
      throw httpError(401, 'Your account was previously authenticated with Supabase Auth. Please use "Forgot Password" to set a new password.')
    }

    if (!verifyPassword(password, dbUser.passwordHash)) {
      throw httpError(401, 'Invalid email or password')
    }

    if (dbUser.emailVerified === false) {
      throw httpError(403, 'Please verify your email address before logging in.', 'EMAIL_NOT_VERIFIED')
    }

    const token = signToken({ userId: dbUser.id, role: dbUser.role })
    return { token, user: publicUser(dbUser) }
  },
  async userFromToken(token) {
    const payload = verifyToken(token)
    if (!payload) return null
    const user = await usersRepo.findById(payload.userId)
    if (!user) return null
    return publicUser(user)
  },
  async resendVerification({ email }) {
    const lower = String(email || '').toLowerCase().trim()
    if (!lower || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(lower)) throw httpError(400, 'Enter a valid email')
    const user = await usersRepo.findByEmail(lower)
    if (!user) {
      return { ok: true, message: 'If an account exists with that email, a verification code has been sent.' }
    }
    if (user.emailVerified === true) {
      return { ok: true, alreadyVerified: true, message: 'Your email is already verified. Please log in.' }
    }

    // Rate limiting: 60-second cooldown via persistent shared storage
    const now = new Date()
    const existingOtp = await otpVerificationsRepo.get(lower, 'EMAIL_VERIFICATION').catch(() => null)
    if (existingOtp?.resendAvailableAt && new Date(existingOtp.resendAvailableAt) > now) {
      const remainingSeconds = Math.max(1, Math.ceil((new Date(existingOtp.resendAvailableAt).getTime() - now.getTime()) / 1000))
      throw httpError(429, `Please wait ${remainingSeconds}s before requesting another code.`)
    }

    const rawOtp = generateOtp()
    const verifyHash = hashToken(rawOtp)
    const verifyExpires = new Date(now.getTime() + 10 * 60 * 1000) // 10 minutes
    const resendAvailableAt = new Date(now.getTime() + 60 * 1000) // 60 seconds

    await usersRepo.setVerificationToken(user.id, verifyHash, verifyExpires)
    await otpVerificationsRepo.upsert({
      identifier: lower,
      purpose: 'EMAIL_VERIFICATION',
      otpHash: verifyHash,
      expiresAt: verifyExpires,
      resendAvailableAt,
      maxAttempts: 5,
    })

    try {
      const profile = await profilesRepo.getByCreator(user.id).catch(() => null)
      await emailService.sendVerificationEmail({ to: lower, name: profile?.name || '', otp: rawOtp })
    } catch (e) { console.error('Resend verification email error', e) }
    return { ok: true, message: 'Verification code sent.' }
  },
  async forgotPassword({ email }) {
    const lower = String(email || '').toLowerCase().trim()
    const user = await usersRepo.findByEmail(lower)
    if (user) {
      const rawToken = generateSecureToken()
      const tokenHash = hashToken(rawToken)
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000) // 1 hour
      await usersRepo.setResetToken(user.id, tokenHash, expiresAt)
      try {
        const resetUrl = getAppUrl(`/reset-password?token=${rawToken}`)
        const profile = await profilesRepo.getByCreator(user.id).catch(() => null)
        await emailService.sendPasswordResetEmail({ to: lower, name: profile?.name || '', resetUrl })
      } catch (e) { console.error('Forgot password email error', e) }
    }
    return { ok: true, message: 'If an account exists with that email, a password reset link has been sent.' }
  },
  async resetPassword({ token, newPassword }) {
    if (!token) throw httpError(400, 'Reset token is required')
    const pwdError = validatePassword(newPassword)
    if (pwdError) throw httpError(400, pwdError)
    const tokenHash = hashToken(token)
    const user = await usersRepo.findByResetToken(tokenHash)
    if (!user) throw httpError(400, 'Invalid or expired password reset token')
    const newHash = hashPassword(newPassword)
    await usersRepo.updatePasswordAndClearReset(user.id, newHash)
    try {
      const profile = await profilesRepo.getByCreator(user.id).catch(() => null)
      await emailService.sendPasswordChangedEmail({ to: user.email, name: profile?.name || '' })
    } catch (e) { console.error('Password changed email error', e) }
    return { ok: true, message: 'Password has been reset successfully.' }
  },
  async verifyEmail({ email, otp, token }) {
    const lower = String(email || '').toLowerCase().trim()
    const rawOtp = String(otp || token || '').trim()

    if (!lower) {
      throw httpError(400, 'Email address is required')
    }

    const user = await usersRepo.findByEmail(lower)
    if (!user) {
      throw httpError(400, 'Invalid verification code. Please check the code and try again.')
    }

    // SEC-001: For an already-verified account:
    // Return a safe informational response, NEVER issue a session token or set a session cookie.
    // Require standard password-based login to establish an authenticated session.
    if (user.emailVerified === true) {
      return {
        ok: true,
        alreadyVerified: true,
        user: publicUser(user),
        message: 'Your email is already verified. Please log in with your password.',
      }
    }

    if (!rawOtp || !/^\d{6}$/.test(rawOtp)) {
      throw httpError(400, 'Invalid verification code. Please check the code and try again.')
    }

    const now = new Date()
    const otpRecord = await otpVerificationsRepo.get(lower, 'EMAIL_VERIFICATION').catch(() => null)
    const tokenHashInDb = otpRecord?.otpHash || user.verificationTokenHash
    const tokenExpiresInDb = otpRecord?.expiresAt || user.verificationTokenExpires

    if (!tokenHashInDb || (otpRecord && otpRecord.consumedAt)) {
      throw httpError(400, 'Invalid verification code. Please check the code and try again.')
    }

    if (!tokenExpiresInDb || new Date(tokenExpiresInDb).getTime() < now.getTime()) {
      throw httpError(400, 'This verification code has expired. Please request a new code.')
    }

    // SEC-002: Check attempt limits (max 5 failed attempts) using atomic shared storage
    const currentAttempts = otpRecord ? otpRecord.attempts : 0
    if (currentAttempts >= 5) {
      await usersRepo.setVerificationToken(user.id, null, null)
      await otpVerificationsRepo.invalidate(lower, 'EMAIL_VERIFICATION').catch(() => null)
      throw httpError(400, 'Too many incorrect attempts. Please request a new code.')
    }

    const submittedHash = hashToken(rawOtp)
    const bufSubmitted = Buffer.from(submittedHash)
    const bufExpected = Buffer.from(tokenHashInDb)
    const isMatch = (bufSubmitted.length === bufExpected.length && crypto.timingSafeEqual(bufSubmitted, bufExpected))

    if (!isMatch) {
      let updatedAttempts = currentAttempts + 1
      try {
        const res = await otpVerificationsRepo.recordFailedAttempt(lower, 'EMAIL_VERIFICATION')
        if (res) updatedAttempts = res.attempts
      } catch (e) {
        throw httpError(500, 'Verification attempt could not be processed securely. Please try again.')
      }

      if (updatedAttempts >= 5) {
        await usersRepo.setVerificationToken(user.id, null, null)
        await otpVerificationsRepo.invalidate(lower, 'EMAIL_VERIFICATION').catch(() => null)
        throw httpError(400, 'Too many incorrect attempts. Please request a new code.')
      }
      throw httpError(400, 'Invalid verification code. Please check the code and try again.')
    }

    // Valid OTP: invalidate token and verify email
    await otpVerificationsRepo.consume(lower, 'EMAIL_VERIFICATION').catch(() => null)
    await usersRepo.verifyEmail(user.id)
    const updatedUser = await usersRepo.findById(user.id)
    const sessionToken = signToken({ userId: user.id, role: user.role })

    return {
      ok: true,
      token: sessionToken,
      user: publicUser(updatedUser || user),
      message: 'Email verified successfully!',
    }
  },
}
function publicUser(u) { return { id: u.id, email: u.email, role: u.role, emailVerified: !!u.emailVerified } }

// ---------------- Me / Profile / Store ----------------
export const meService = {
  async getCreatorSetupStatus(creatorId) {
    if (!creatorId) return null

    const [profile, store, productsCount] = await Promise.all([
      profilesRepo.getByCreator(creatorId).catch(() => null),
      storesRepo.getByCreator(creatorId).catch(() => null),
      prisma.product.count({ where: { creatorId, NOT: { status: 'ARCHIVED' } } }).catch(() => 0),
    ])

    const theme = store?.theme || {}
    const avatar = String(theme.avatarUrl || store?.avatarUrl || profile?.avatarUrl || '').trim()
    const isProfileImageDone = avatar.length > 0

    const isProductDone = (productsCount || 0) > 0 || (store?.sections || []).some((s) => s.type === 'product' || s.props?.productId)

    const bio = String(theme.headerBio || store?.bio || profile?.bio || '').trim()
    const isStoreProfileDone = bio.length > 0

    const items = [
      {
        id: 'profile-image',
        title: 'Add profile image',
        label: 'Add profile image',
        description: 'A photo helps people recognize you.',
        completed: isProfileImageDone,
        actionType: 'navigate',
        route: '/dashboard/settings?focus=avatar',
      },
      {
        id: 'first-product',
        title: 'Add your first product',
        label: 'Add your first product',
        description: 'Create a digital product, course, or service to sell.',
        completed: isProductDone,
        actionType: 'product-wizard',
        route: isProductDone ? '/dashboard/products' : '/dashboard/products?create=true',
      },
      {
        id: 'store-profile',
        title: 'Complete your store profile',
        label: 'Complete your store profile',
        description: 'Add your store name, bio, and brand details.',
        completed: isStoreProfileDone,
        actionType: 'navigate',
        route: '/dashboard/store',
      },
    ]

    const completed = items.filter((t) => t.completed).length
    const total = items.length
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0
    const allDone = completed === total
    const nextIncomplete = items.find((t) => !t.completed) || null

    return {
      items,
      completed,
      total,
      percentage,
      allDone,
      nextRoute: nextIncomplete?.route || '/dashboard/store',
      storeSlug: store?.slug || store?.username || profile?.username || '',
    }
  },
  async getMe(creatorId) {
    const profile = await profilesRepo.getByCreator(creatorId)
    const store = await storesRepo.getByCreator(creatorId)
    const subscription = await creatorSubscriptionService.getStatus(creatorId).catch(() => null)
    if (profile && store) {
      profile.username = store.username || store.slug || profile.username || null
    }
    if (store) {
      store.username = store.username || store.slug || null
    }
    const setupStatus = await this.getCreatorSetupStatus(creatorId).catch(() => null)
    return { profile, store, subscription, setupStatus }
  },
  async updateProfile(creatorId, patch) {
    const allowed = pick(patch, ['name', 'phone', 'bio', 'category', 'avatarUrl', 'socialLinks', 'onboardingComplete', 'onboardingStatus'])
    if (allowed.name !== undefined) allowed.name = sanitizeText(allowed.name)
    if (allowed.phone !== undefined) allowed.phone = sanitizeText(allowed.phone)
    if (allowed.bio !== undefined) allowed.bio = sanitizeText(allowed.bio)
    if (allowed.category !== undefined) allowed.category = sanitizeText(allowed.category)
    if (allowed.avatarUrl !== undefined) allowed.avatarUrl = sanitizeUrl(allowed.avatarUrl)
    if (allowed.onboardingStatus !== undefined) allowed.onboardingStatus = sanitizeText(allowed.onboardingStatus)
    if (allowed.socialLinks && typeof allowed.socialLinks === 'object') {
      const cleanLinks = {}
      for (const [k, v] of Object.entries(allowed.socialLinks)) {
        if (v) cleanLinks[sanitizeText(k)] = sanitizeText(v)
      }
      allowed.socialLinks = cleanLinks
    }
    const updated = await profilesRepo.upsert(creatorId, allowed)

    const storePatch = {}
    if (allowed.avatarUrl !== undefined) storePatch.avatarUrl = allowed.avatarUrl
    if (allowed.bio !== undefined) storePatch.bio = allowed.bio
    if (allowed.socialLinks !== undefined) storePatch.socialLinks = allowed.socialLinks

    if (patch.username !== undefined || patch.slug !== undefined) {
      const requestedSlug = String(patch.slug || patch.username).toLowerCase().replace(/[^a-z0-9_-]/g, '').trim()
      if (requestedSlug) {
        const existing = await storesRepo.getByCreator(creatorId)
        if (existing && (requestedSlug !== existing.username && requestedSlug !== existing.slug)) {
          const v = validateUsername(requestedSlug)
          if (!v.ok) throw httpError(400, v.error)
          const taken = await storesRepo.usernameTaken(requestedSlug, creatorId)
          if (taken) throw httpError(409, 'Username is taken')
          storePatch.username = requestedSlug
          storePatch.slug = requestedSlug
        }
      }
    }

    if (Object.keys(storePatch).length > 0) {
      const updatedStore = await storesRepo.update(creatorId, storePatch).catch(() => null)
      if (updatedStore && updated) {
        updated.username = updatedStore.username || updatedStore.slug || updated.username
      }
    }

    if (allowed.onboardingComplete === true) {
      await storeService.publish(creatorId).catch((e) => {
        console.error('Failed to publish store after onboarding complete:', e)
      })
    }

    return updated
  },
}

export const storeService = {
  async getOrCreate(creatorId, defaultStoreName) {
    let store = await storesRepo.getByCreator(creatorId)
    if (!store) {
      const profile = await profilesRepo.getByCreator(creatorId).catch(() => null)
      const user = await usersRepo.findById(creatorId).catch(() => null)
      const baseName = defaultStoreName || profile?.name || user?.email?.split('@')[0] || 'Creator Store'
      const storeSlug = await generateUniqueStoreSlug(baseName, creatorId, (c, id) => storesRepo.usernameTaken(c, id))
      store = await storesRepo.upsertStore(creatorId, {
        id: uuidv4(),
        creatorId,
        storeName: baseName,
        username: storeSlug,
        slug: storeSlug,
        published: false,
        theme: DEFAULT_THEME,
        seo: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      })
    }
    const sections = await storeSectionsRepo.getForCreator(creatorId)
    const pages = Array.isArray(store.pages) ? store.pages : []

    // Enforce automatic store turn off when trial is expired without active paid subscription
    if (store && store.published) {
      const sub = await creatorSubscriptionService.getStatus(creatorId).catch(() => null)
      const isPaid = sub && sub.status === 'ACTIVE' && !sub.isTrial
      const isTrialActive = Boolean(sub && sub.isTrial && !sub.isTrialExpired && (sub.status === 'TRIALING' || sub.trialStatus === 'ACTIVE'))
      const isEntitled = (isPaid || isTrialActive) && Boolean(sub?.entitlements?.storefront ?? sub?.entitlements?.canPublish)
      if (!isEntitled) {
        await storesRepo.setPublished(creatorId, false).catch(() => null)
        store.published = false
      }
    }

    return { ...store, sections, pages }
  },

  async checkUsername(creatorId, username) {
    const v = validateUsername(username)
    if (!v.ok) return { available: false, error: v.error }
    const taken = await storesRepo.usernameTaken(v.username, creatorId)
    return { available: !taken, username: v.username, error: taken ? 'Username is taken' : null }
  },

  async setUsername(creatorId, username) {
    const v = validateUsername(username)
    if (!v.ok) throw httpError(400, v.error)
    const taken = await storesRepo.usernameTaken(v.username, creatorId)
    if (taken) throw httpError(409, 'Username is taken')
    await this.getOrCreate(creatorId)
    return storesRepo.update(creatorId, { username: v.username, slug: v.username })
  },

  async update(creatorId, patch) {
    const existing = await this.getOrCreate(creatorId)
    const updatePayload = {}

    if (patch.storeName !== undefined) {
      const cleanName = sanitizeText(patch.storeName)
      updatePayload.storeName = cleanName
      if (!existing.published && !existing.username && !existing.slug) {
        const newSlug = await generateUniqueStoreSlug(cleanName, creatorId, (c, id) => storesRepo.usernameTaken(c, id))
        updatePayload.slug = newSlug
        updatePayload.username = newSlug
      }
    }

    if (patch.username !== undefined || patch.slug !== undefined) {
      const requestedSlug = String(patch.slug || patch.username).toLowerCase().replace(/[^a-z0-9_-]/g, '').trim()
      if (requestedSlug && requestedSlug !== existing.slug && requestedSlug !== existing.username) {
        const v = validateUsername(requestedSlug)
        if (!v.ok) throw httpError(400, v.error)
        const taken = await storesRepo.usernameTaken(requestedSlug, creatorId)
        if (taken) throw httpError(409, 'Store URL / username is taken')
        updatePayload.username = requestedSlug
        updatePayload.slug = requestedSlug
      }
    }

    if (patch.avatarUrl !== undefined) {
      updatePayload.avatarUrl = patch.avatarUrl ? sanitizeUrl(patch.avatarUrl) : null
    }
    if (patch.bio !== undefined) {
      updatePayload.bio = sanitizeText(patch.bio)
    }

    if (patch.theme && typeof patch.theme === 'object') {
      updatePayload.theme = { ...(existing?.theme || DEFAULT_THEME), ...patch.theme }
    } else if (patch.storeName !== undefined) {
      updatePayload.theme = { ...(existing?.theme || DEFAULT_THEME), headerTitle: sanitizeText(patch.storeName) }
    }

    if (patch.sections && Array.isArray(patch.sections)) {
      if (patch.sections.length > (existing?.sections?.length || 0)) {
        await creatorSubscriptionService.assertActiveEntitlement(creatorId, 'store_sections')
      }

      // Enforce product ownership & deduplication for collection items
      const creatorProds = await productsRepo.listByCreator(creatorId).catch(() => [])
      const validProductIds = new Set(creatorProds.map((p) => p.id))

      updatePayload.sections = patch.sections.map((sec) => {
        const cleanProps = {}
        if (sec.props && typeof sec.props === 'object') {
          for (const [k, v] of Object.entries(sec.props)) {
            if (typeof v === 'string') {
              cleanProps[k] = k.toLowerCase().includes('url') ? sanitizeUrl(v) : sanitizeText(v)
            } else if (k === 'items' && Array.isArray(v) && (sec.type === 'collection' || sec.type === 'product_collection')) {
              const seenProductIds = new Set()
              cleanProps[k] = v.filter((item) => {
                if (!item) return false
                if (item.type === 'product' && item.productId) {
                  if (!validProductIds.has(item.productId)) return false
                  if (seenProductIds.has(item.productId)) return false
                  seenProductIds.add(item.productId)
                }
                return true
              })
            } else {
              cleanProps[k] = v
            }
          }
        }
        return { ...sec, props: cleanProps }
      })
    }

    if (patch.pages !== undefined && Array.isArray(patch.pages)) {
      updatePayload.pages = patch.pages
    }

    if (patch.seo && typeof patch.seo === 'object') {
      updatePayload.seo = { ...(existing?.seo || {}), ...patch.seo }
    }

    return storesRepo.update(creatorId, updatePayload)
  },

  // ---------- Page management ----------

  async assertCanCreateStorePage(creatorId) {
    if (!creatorId) throw httpError(401, 'Unauthorized')
    await creatorSubscriptionService.assertActiveEntitlement(creatorId, 'store_pages')
    const sub = await creatorSubscriptionService.getStatus(creatorId)
    const planConfig = getPlanConfig(sub.planId, sub.status)
    const maxPages = planConfig.entitlements?.storePagesLimit ?? (sub.planId === 'PRO' ? Infinity : 3)

    if (maxPages === Infinity) {
      return { allowed: true, limit: Infinity, currentCount: 0, plan: sub.planId }
    }

    const store = await this.getOrCreate(creatorId)
    const pages = Array.isArray(store.pages) ? store.pages : []
    const hasHome = pages.some(p => p.isDefault)
    const currentCount = pages.length === 0 ? 1 : (hasHome ? pages.length : pages.length + 1)

    if (currentCount >= maxPages) {
      const err = httpError(403, `Your Creator plan allows up to ${maxPages} storefront pages. Upgrade to Pro to create unlimited storefront pages.`)
      err.code = 'PAGE_LIMIT_REACHED'
      err.currentCount = currentCount
      err.limit = maxPages
      err.plan = sub.planId
      throw err
    }

    return { allowed: true, limit: maxPages, currentCount, plan: sub.planId }
  },

  async listPages(creatorId) {
    const store = await this.getOrCreate(creatorId)
    const pages = Array.isArray(store.pages) ? store.pages : []
    // Always ensure the default Home page is present
    if (pages.length === 0 || !pages.some(p => p.isDefault)) {
      const homePage = { id: 'home', name: 'Home', slug: 'home', isDefault: true, position: 0 }
      const merged = [homePage, ...pages.filter(p => !p.isDefault)]
      await storesRepo.update(creatorId, { pages: merged })
      return merged
    }
    return [...pages].sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
  },

  async createPage(creatorId, nameOrPayload) {
    const payload = typeof nameOrPayload === 'string' ? { name: nameOrPayload } : nameOrPayload
    return this.addPage(creatorId, payload)
  },

  async addPage(creatorId, { name }) {
    if (!name || !name.trim()) throw httpError(400, 'Page name is required')

    // 1. Enforce page limit based on subscription plan
    await this.assertCanCreateStorePage(creatorId)

    const cleanName = sanitizeText(name.trim()).slice(0, 50)
    const store = await this.getOrCreate(creatorId)
    const pages = Array.isArray(store.pages) ? store.pages : []
    const hasHome = pages.some(p => p.isDefault)
    const basePages = hasHome ? pages : [{ id: 'home', name: 'Home', slug: 'home', isDefault: true, position: 0 }, ...pages]

    // 2. Re-verify after read to protect against race conditions
    const plan = await creatorSubscriptionService.getStatus(creatorId)
    const planConfig = getPlanConfig(plan.planId, plan.status)
    const maxPages = planConfig.entitlements?.storePagesLimit ?? (plan.planId === 'PRO' ? Infinity : 3)
    if (maxPages !== Infinity && basePages.length >= maxPages) {
      const err = httpError(403, `Your Creator plan allows up to ${maxPages} storefront pages. Upgrade to Pro to create unlimited storefront pages.`)
      err.code = 'PAGE_LIMIT_REACHED'
      err.currentCount = basePages.length
      err.limit = maxPages
      err.plan = plan.planId
      throw err
    }

    // Generate unique slug from name
    let slug = cleanName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'page'
    const existingSlugs = new Set(basePages.map(p => p.slug))
    let candidateSlug = slug
    let counter = 2
    while (existingSlugs.has(candidateSlug)) candidateSlug = `${slug}-${counter++}`

    const nameLower = cleanName.toLowerCase()
    if (basePages.some(p => p.name.toLowerCase() === nameLower)) throw httpError(409, 'A page with this name already exists')

    const newPage = { id: uuidv4(), name: cleanName, slug: candidateSlug, isDefault: false, position: basePages.length }
    const updatedPages = [...basePages, newPage]
    await storesRepo.update(creatorId, { pages: updatedPages })
    return { page: newPage, pages: updatedPages }
  },

  async duplicatePage(creatorId, pageId) {
    if (!pageId) throw httpError(400, 'Page ID is required')

    // 1. Enforce page limit based on subscription plan
    await this.assertCanCreateStorePage(creatorId)

    const store = await this.getOrCreate(creatorId)
    const pages = Array.isArray(store.pages) ? store.pages : []
    const hasHome = pages.some(p => p.isDefault)
    const basePages = hasHome ? pages : [{ id: 'home', name: 'Home', slug: 'home', isDefault: true, position: 0 }, ...pages]

    const targetPage = basePages.find(p => p.id === pageId)
    if (!targetPage) throw httpError(404, 'Page not found')

    // 2. Re-verify limit after read
    const plan = await creatorSubscriptionService.getStatus(creatorId)
    const planConfig = getPlanConfig(plan.planId, plan.status)
    const maxPages = planConfig.entitlements?.storePagesLimit ?? (plan.planId === 'PRO' ? Infinity : 3)
    if (maxPages !== Infinity && basePages.length >= maxPages) {
      const err = httpError(403, `Your Creator plan allows up to ${maxPages} storefront pages. Upgrade to Pro to create unlimited storefront pages.`)
      err.code = 'PAGE_LIMIT_REACHED'
      err.currentCount = basePages.length
      err.limit = maxPages
      err.plan = plan.planId
      throw err
    }

    const cleanName = `${targetPage.name} (Copy)`.slice(0, 50)
    let slug = cleanName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'page-copy'
    const existingSlugs = new Set(basePages.map(p => p.slug))
    let counter = 2
    let candidateSlug = slug
    while (existingSlugs.has(candidateSlug)) candidateSlug = `${slug}-${counter++}`

    const newPageId = uuidv4()
    const newPage = { id: newPageId, name: cleanName, slug: candidateSlug, isDefault: false, position: basePages.length }
    const updatedPages = [...basePages, newPage]

    // Duplicate sections for this page
    const existingSections = await storeSectionsRepo.getForCreator(creatorId)
    const pageSections = existingSections.filter(s => s.pageId === pageId || (!s.pageId && targetPage.isDefault))
    for (const s of pageSections) {
      await storeSectionsRepo.create(creatorId, {
        type: s.type,
        pageId: newPageId,
        position: s.position,
        props: s.props,
        visible: s.visible,
      })
    }

    await storesRepo.update(creatorId, { pages: updatedPages })
    return { page: newPage, pages: updatedPages }
  },

  async renamePage(creatorId, pageId, { name }) {
    if (!name || !name.trim()) throw httpError(400, 'Page name is required')
    const cleanName = sanitizeText(name.trim()).slice(0, 50)
    const store = await this.getOrCreate(creatorId)
    const pages = Array.isArray(store.pages) ? store.pages : []
    const idx = pages.findIndex(p => p.id === pageId)
    if (idx === -1) throw httpError(404, 'Page not found')
    if (pages[idx].isDefault) throw httpError(400, 'Cannot rename the default Home page')
    const nameLower = cleanName.toLowerCase()
    if (pages.some((p, i) => i !== idx && p.name.toLowerCase() === nameLower)) throw httpError(409, 'A page with this name already exists')
    pages[idx] = { ...pages[idx], name: cleanName }
    await storesRepo.update(creatorId, { pages })
    return { page: pages[idx], pages }
  },

  async deletePage(creatorId, pageId) {
    const store = await this.getOrCreate(creatorId)
    const pages = Array.isArray(store.pages) ? store.pages : []
    const page = pages.find(p => p.id === pageId)
    if (!page) throw httpError(404, 'Page not found')
    if (page.isDefault) throw httpError(400, 'Cannot delete the default Home page')
    await storeSectionsRepo.deleteSectionsForPage(creatorId, pageId)
    const updatedPages = pages.filter(p => p.id !== pageId).map((p, i) => ({ ...p, position: i }))
    await storesRepo.update(creatorId, { pages: updatedPages })
    return { ok: true, pages: updatedPages }
  },

  async reorderPages(creatorId, orderedPageIds) {
    if (!Array.isArray(orderedPageIds)) throw httpError(400, 'orderedPageIds must be an array')
    const store = await this.getOrCreate(creatorId)
    const pages = Array.isArray(store.pages) ? store.pages : []
    const map = new Map(pages.map(p => [p.id, p]))
    const reordered = []
    orderedPageIds.forEach(id => { if (map.has(id)) { reordered.push({ ...map.get(id) }); map.delete(id) } })
    map.forEach(p => reordered.push(p))
    const final = reordered.map((p, i) => ({ ...p, position: i }))
    await storesRepo.update(creatorId, { pages: final })
    return { pages: final }
  },

  async publish(creatorId) {
    if (!creatorId) throw httpError(400, 'Creator ID required')

    // 1. Verify user's paid subscription or active trial status from server-side database
    const sub = await creatorSubscriptionService.getStatus(creatorId).catch(() => null)
    const isPaid = sub && sub.status === 'ACTIVE' && !sub.isTrial
    const isTrialActive = Boolean(sub && sub.isTrial && !sub.isTrialExpired && (sub.status === 'TRIALING' || sub.trialStatus === 'ACTIVE'))
    const isEntitled = (isPaid || isTrialActive) && Boolean(sub?.entitlements?.canPublish ?? sub?.entitlements?.storefront)

    if (!isEntitled) {
      const err = httpError(403, 'Your Pro trial has ended. An active paid plan is required to turn on your storefront.')
      err.code = 'PLAN_UPGRADE_REQUIRED'
      err.status = 403
      throw err
    }

    const store = await this.getOrCreate(creatorId)
    let finalSlug = store.slug || store.username
    if (!finalSlug) {
      finalSlug = await generateUniqueStoreSlug(store.storeName || 'Creator Store', creatorId, (c, id) => storesRepo.usernameTaken(c, id))
    }
    const updatedStore = await storesRepo.update(creatorId, { published: true, slug: finalSlug, username: finalSlug })
    return {
      success: true,
      storefrontEnabled: true,
      published: true,
      store: updatedStore,
      slug: finalSlug,
      username: finalSlug,
      publicUrl: `/${finalSlug}`,
    }
  },

  async unpublish(creatorId) {
    if (!creatorId) throw httpError(400, 'Creator ID required')
    const updatedStore = await storesRepo.update(creatorId, { published: false })
    return {
      success: true,
      storefrontEnabled: false,
      published: false,
      store: updatedStore,
    }
  },

  async getSettings(creatorId) {
    const store = await this.getOrCreate(creatorId)
    const profile = await profilesRepo.getByCreator(creatorId)
    const storeSlug = store.slug || store.username
    const sub = await creatorSubscriptionService.getStatus(creatorId).catch(() => null)
    const isPaid = sub && sub.status === 'ACTIVE' && !sub.isTrial
    const isTrialActive = Boolean(sub && sub.isTrial && !sub.isTrialExpired && (sub.status === 'TRIALING' || sub.trialStatus === 'ACTIVE'))
    const isEntitled = (isPaid || isTrialActive) && Boolean(sub?.entitlements?.storefront ?? sub?.entitlements?.canPublish)
    if (!isEntitled && store.published) {
      await storesRepo.setPublished(creatorId, false).catch(() => null)
      store.published = false
    }
    return {
      settings: {
        id: store.id,
        creatorId: store.creatorId,
        storeName: store.storeName || profile?.name || 'Creator Store',
        username: storeSlug,
        slug: storeSlug,
        publicUrl: `/${storeSlug}`,
        supportEmail: store.supportEmail || profile?.email || '',
        socialLinks: store.socialLinks || profile?.socialLinks || {},
        policies: store.policies || {
          termsOfService: 'Standard terms of service apply to all purchases.',
          privacyPolicy: 'We respect customer data privacy and do not sell information.',
          refundPolicy: 'Refunds are subject to product terms and creator approval.',
        },
        theme: store.theme || DEFAULT_THEME,
        seo: store.seo || { title: '', description: '', favicon: '', ogImage: '' },
        published: !!store.published,
      }
    }
  },

  async updateSettings(creatorId, patch) {
    const existing = await this.getOrCreate(creatorId)
    const updatePayload = {}
    if (patch.storeName !== undefined) updatePayload.storeName = sanitizeText(patch.storeName)
    if (patch.username !== undefined || patch.slug !== undefined) {
      const requestedSlug = String(patch.slug || patch.username).toLowerCase().replace(/[^a-z0-9_-]/g, '').trim()
      if (requestedSlug && requestedSlug !== existing.slug && requestedSlug !== existing.username) {
        const v = validateUsername(requestedSlug)
        if (!v.ok) throw httpError(400, v.error)
        const taken = await storesRepo.usernameTaken(requestedSlug, creatorId)
        if (taken) throw httpError(409, 'Store handle is taken')
        updatePayload.username = requestedSlug
        updatePayload.slug = requestedSlug
      }
    }
    if (patch.supportEmail !== undefined) updatePayload.supportEmail = sanitizeText(patch.supportEmail)
    if (patch.socialLinks && typeof patch.socialLinks === 'object') {
      updatePayload.socialLinks = { ...(existing.socialLinks || {}), ...patch.socialLinks }
    }
    if (patch.policies && typeof patch.policies === 'object') {
      updatePayload.policies = { ...(existing.policies || {}), ...patch.policies }
    }
    if (patch.theme && typeof patch.theme === 'object') {
      updatePayload.theme = { ...(existing.theme || DEFAULT_THEME), ...patch.theme }
    }
    if (patch.seo && typeof patch.seo === 'object') {
      updatePayload.seo = { ...(existing.seo || {}), ...patch.seo }
    }
    await storesRepo.update(creatorId, updatePayload)
    return this.getSettings(creatorId)
  },

  async getPublicPolicies(username) {
    const store = await storesRepo.getBySlug(username)
    if (!store) throw httpError(404, 'Store not found')
    const profile = await profilesRepo.getByCreator(store.creatorId)
    return {
      username: store.slug || store.username,
      supportEmail: store.supportEmail || profile?.email || '',
      policies: store.policies || {
        termsOfService: 'Standard terms of service apply to all purchases.',
        privacyPolicy: 'We respect customer data privacy and do not sell information.',
        refundPolicy: 'Refunds are subject to product terms and creator approval.',
      }
    }
  }
}


// ---------------- Store Sections Service ----------------
export const storeSectionsService = {
  async getSections(creatorId) {
    return storeSectionsRepo.getForCreator(creatorId)
  },
  async createSection(creatorId, data) {
    await creatorSubscriptionService.assertActiveEntitlement(creatorId, 'store_sections')
    const validTypes = ['HERO', 'FEATURED_PRODUCTS', 'PRODUCT_COLLECTION', 'PRODUCT_GRID', 'LEAD_MAGNET', 'COACHING', 'COMMUNITY', 'WEBINAR', 'MEMBERSHIP', 'TESTIMONIALS', 'FAQ', 'TEXT_CONTENT', 'SOCIAL_LINKS', 'CTA', 'COLLECTION']
    const type = (data.type || 'HERO').toUpperCase()
    if (!validTypes.includes(type)) throw httpError(400, 'Invalid section type')

    const section = {
      id: uuidv4(),
      type,
      title: data.title ? sanitizeText(data.title) : 'Section Title',
      subtitle: data.subtitle ? sanitizeText(data.subtitle) : '',
      content: data.content ? sanitizeHtml(data.content) : '',
      visible: data.visible !== false,
      config: data.config && typeof data.config === 'object' ? data.config : {},
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    return storeSectionsRepo.addSection(creatorId, section)
  },
  async updateSection(creatorId, sectionId, data) {
    const patch = {}
    if (data.type) {
      const validTypes = ['HERO', 'FEATURED_PRODUCTS', 'PRODUCT_COLLECTION', 'PRODUCT_GRID', 'LEAD_MAGNET', 'COACHING', 'COMMUNITY', 'WEBINAR', 'MEMBERSHIP', 'TESTIMONIALS', 'FAQ', 'TEXT_CONTENT', 'SOCIAL_LINKS', 'CTA', 'COLLECTION']
      const type = data.type.toUpperCase()
      if (validTypes.includes(type)) patch.type = type
    }
    if (data.title !== undefined) patch.title = sanitizeText(data.title)
    if (data.subtitle !== undefined) patch.subtitle = sanitizeText(data.subtitle)
    if (data.content !== undefined) patch.content = sanitizeHtml(data.content)
    if (data.visible !== undefined) patch.visible = !!data.visible
    if (data.order !== undefined) patch.order = parseInt(data.order, 10)
    if (data.config && typeof data.config === 'object') patch.config = data.config

    const updated = await storeSectionsRepo.updateSection(creatorId, sectionId, patch)
    if (!updated) throw httpError(404, 'Store section not found')
    return updated
  },
  async deleteSection(creatorId, sectionId) {
    await storeSectionsRepo.deleteSection(creatorId, sectionId)
    return { success: true, deleted: true, ok: true }
  },
  async deleteManySections(creatorId, sectionIds) {
    if (!creatorId || !Array.isArray(sectionIds) || sectionIds.length === 0) {
      return { success: true, deleted: true, ok: true, count: 0 }
    }
    const res = await storeSectionsRepo.deleteMany(creatorId, sectionIds)
    return { success: true, deleted: true, ok: true, count: res.count }
  },
  async reorderSections(creatorId, orderedSectionIds) {
    if (!Array.isArray(orderedSectionIds)) throw httpError(400, 'orderedSectionIds must be an array')
    return storeSectionsRepo.reorderSections(creatorId, orderedSectionIds)
  }
}


// ---------------- Products ----------------
export const productService = {
  async list(creatorId, options = {}) {
    const res = await productsRepo.list(creatorId, options)
    const items = Array.isArray(res) ? res : (res?.items || [])
    if (!items.length) return res

    try {
      const orders = await ordersRepo.list(creatorId).catch(() => [])
      const bookings = await coachingRepo.listBookingsForCreator(creatorId, {}).catch(() => [])

      const enriched = await Promise.all(items.map(async (p) => {
        let count = 0
        let label = ''
        if (p.type === 'COURSE') {
          const paidCourseOrders = orders.filter(o => o.productId === p.id && o.status === 'PAID')
          count = paidCourseOrders.length
          label = `${count} ${count === 1 ? 'student' : 'students'}`
        } else if (p.type === 'COACHING') {
          const productBookings = bookings.filter(b => b.productId === p.id)
          count = productBookings.length
          label = `${count} ${count === 1 ? 'booking' : 'bookings'}`
        } else if (p.type === 'MEMBERSHIP') {
          let memCount = 0
          try {
            const conf = await membershipRepo.getConfigByProductId(p.id)
            const subs = await membershipRepo.listSubscriptionsForMembership(conf?.id || p.id).catch(() => ({ items: [] }))
            const subItems = Array.isArray(subs) ? subs : (subs?.items || [])
            memCount = subItems.filter(s => s.status === 'ACTIVE' || s.status === 'TRIALING').length
          } catch (e) { }
          const paidMemOrders = orders.filter(o => o.productId === p.id && (o.status === 'PAID' || o.status === 'ACTIVE'))
          count = Math.max(memCount, paidMemOrders.length)
          label = `${count} ${count === 1 ? 'member' : 'members'}`
        } else {
          const paidSales = orders.filter(o => o.productId === p.id && o.status === 'PAID')
          count = paidSales.length
          label = `${count} ${count === 1 ? 'sale' : 'sales'}`
        }
        return {
          ...p,
          performanceCount: count,
          performanceLabel: label,
        }
      }))

      if (Array.isArray(res)) return enriched
      return { ...res, items: enriched }
    } catch (e) {
      return res
    }
  },
  async get(creatorId, id) {
    const p = await productsRepo.getForCreator(id, creatorId)
    if (!p) throw httpError(404, 'Product not found')
    return p
  },
  async getManagementData(creatorId, id) {
    const product = await productsRepo.getForCreator(id, creatorId)
    if (!product) throw httpError(404, 'Product not found')

    const type = product.type || 'DIGITAL_DOWNLOAD'
    const managementData = {
      product,
      type,
      summary: {},
      overview: {},
      customers: [],
      orders: [],
      students: [],
      curriculum: { modules: [] },
      bookings: [],
      config: {},
      members: [],
      content: { posts: [] },
      tiers: [],
      analytics: {},
    }

    if (type === 'COURSE') {
      let course = await coursesRepo.getByProduct(id).catch(() => null)
      if (!course) {
        const courses = await coursesRepo.list(creatorId).catch(() => [])
        course = courses.find(c => c.productId === id) || null
      }
      const courseId = course?.id
      let students = []
      let modules = []
      let lessons = []
      let analytics = { totalStudents: 0, revenue: 0, completionRate: 0, averageProgress: 0 }

      if (courseId) {
        students = await courseService.getStudents(creatorId, courseId).catch(() => [])
        modules = await modulesRepo.listByCourse(courseId).catch(() => [])
        lessons = await lessonsRepo.listByCourse(courseId).catch(() => [])
        analytics = await courseService.getAnalytics(creatorId, courseId).catch(() => ({
          totalStudents: students.length,
          revenue: students.reduce((sum, s) => sum + Number(s.amountPaid || 0), 0),
          completionRate: 0,
          averageProgress: 0,
        }))
      }

      const curriculumModules = modules.map(m => ({
        id: m.id,
        title: m.title,
        description: m.description,
        position: m.position,
        lessons: lessons.filter(l => l.moduleId === m.id).sort((a, b) => (a.position || 0) - (b.position || 0))
      })).sort((a, b) => (a.position || 0) - (b.position || 0))

      managementData.course = course
      managementData.summary = {
        students: analytics.totalStudents || students.length,
        revenue: analytics.revenue || 0,
        completionRate: analytics.completionRate || 0,
        averageProgress: analytics.averageProgress || 0,
      }
      managementData.overview = {
        title: product.title,
        description: product.description || product.shortDescription || '',
        price: Number(product.price || 0),
        currency: product.currency || 'INR',
        published: product.status === 'PUBLISHED',
        totalStudents: analytics.totalStudents || students.length,
        revenue: analytics.revenue || 0,
        completionRate: analytics.completionRate || 0,
        averageProgress: analytics.averageProgress || 0,
        recentEnrollments: students.slice(0, 10),
      }
      managementData.students = students
      managementData.curriculum = { modules: curriculumModules }
      managementData.analytics = analytics
      managementData.config = course || {}

    } else if (type === 'COACHING') {
      const config = await coachingService.getConfig(creatorId, id)
      const bookings = await coachingRepo.listBookingsForCreator(creatorId, { productId: id }).catch(() => [])

      const now = new Date()
      const upcoming = bookings.filter(b => b.status === 'CONFIRMED' && new Date(b.startTime) > now)
      const completed = bookings.filter(b => b.status === 'COMPLETED' || (b.status === 'CONFIRMED' && new Date(b.endTime) <= now))

      const orders = await ordersRepo.list(creatorId).catch(() => [])
      const paidOrders = orders.filter(o => o.productId === id && o.status === 'PAID')
      const orderRevenue = paidOrders.reduce((sum, o) => sum + Number(o.amount || 0), 0)
      const bookingRevenue = bookings.filter(b => b.paymentStatus === 'PAID').reduce((sum, b) => sum + Number(product.price || 0), 0)
      const revenue = Math.max(orderRevenue, bookingRevenue)

      const sortedUpcoming = [...upcoming].sort((a, b) => new Date(a.startTime) - new Date(b.startTime))
      const nextBooking = sortedUpcoming[0] || null

      managementData.summary = {
        totalBookings: bookings.length,
        upcoming: upcoming.length,
        completed: completed.length,
        revenue,
      }
      managementData.overview = {
        serviceName: product.title,
        price: Number(product.price || 0),
        currency: product.currency || 'INR',
        duration: config.durationMinutes || 60,
        totalBookings: bookings.length,
        upcomingBookings: upcoming.length,
        completedBookings: completed.length,
        revenue,
        nextBooking,
      }
      managementData.bookings = bookings
      managementData.config = config

    } else if (type === 'MEMBERSHIP') {
      const config = await membershipService.getConfig(id)
      const memSubs = await membershipRepo.listSubscriptionsForMembership(config?.id || id).catch(() => ({ items: [], total: 0 }))
      const subscriptions = Array.isArray(memSubs) ? memSubs : (memSubs?.items || [])

      const posts = await membershipPostsRepo.list(id).catch(() => [])
      const tiers = await membershipTiersRepo.list(id).catch(() => [])

      const activeSubs = subscriptions.filter(s => s.status === 'ACTIVE' || s.status === 'TRIALING')
      const cancelledSubs = subscriptions.filter(s => s.status === 'CANCELLED')

      const mrr = activeSubs.reduce((sum, s) => {
        const p = Number(s.price !== undefined ? s.price : (config?.price || product.price || 0))
        return sum + (s.billingInterval === 'YEAR' ? Math.round(p / 12) : p)
      }, 0)

      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      const newMembers = subscriptions.filter(s => new Date(s.createdAt) >= thirtyDaysAgo).length
      const churnRate = subscriptions.length > 0 ? Math.round((cancelledSubs.length / subscriptions.length) * 100) : 0

      managementData.summary = {
        members: activeSubs.length,
        mrr,
        newMembers,
        churn: `${churnRate}%`,
      }
      managementData.overview = {
        membershipName: config?.name || product.title,
        price: Number(config?.price || product.price || 0),
        currency: config?.currency || product.currency || 'INR',
        billingInterval: config?.billingType === 'YEARLY' ? 'year' : 'month',
        activeMembers: activeSubs.length,
        mrr,
        recentMembers: subscriptions.slice(0, 10),
        status: product.status,
      }
      managementData.members = subscriptions
      managementData.content = { posts }
      managementData.tiers = tiers
      managementData.config = config

    } else {
      const orders = await ordersRepo.list(creatorId).catch(() => [])
      const productOrders = orders.filter(o => o.productId === id)
      const paidOrders = productOrders.filter(o => o.status === 'PAID')

      const revenue = paidOrders.reduce((sum, o) => sum + Number(o.amount || 0), 0)
      const totalSales = paidOrders.length

      const customerMap = new Map()
      for (const order of productOrders) {
        const email = String(order.customerEmail || '').toLowerCase().trim()
        if (!email) continue
        if (!customerMap.has(email)) {
          customerMap.set(email, {
            id: order.customerId || order.id,
            name: order.customerName || email.split('@')[0],
            email,
            purchasedAt: order.paidAt || order.createdAt,
            amount: Number(order.amount || 0),
            currency: order.currency || product.currency || 'INR',
            status: order.status,
            ordersCount: 1,
            totalSpent: Number(order.amount || 0),
          })
        } else {
          const existing = customerMap.get(email)
          existing.ordersCount += 1
          existing.totalSpent += Number(order.amount || 0)
          if (order.status === 'PAID') existing.status = 'PAID'
        }
      }
      const customers = Array.from(customerMap.values())
      const downloadsCount = product.fileId ? totalSales : (product.files?.length ? totalSales * product.files.length : totalSales)

      managementData.summary = {
        revenue,
        totalSales,
        customers: customers.length,
        downloads: downloadsCount,
      }
      managementData.overview = {
        description: product.description || product.shortDescription || '',
        price: Number(product.price || 0),
        currency: product.currency || 'INR',
        status: product.status,
        file: {
          fileId: product.fileId,
          fileName: product.fileName,
          fileSize: product.fileSize,
          fileMime: product.fileMime,
          files: product.files || [],
        },
        totalSales,
        revenue,
        recentPurchases: paidOrders.slice(0, 10),
      }
      managementData.customers = customers
      managementData.orders = productOrders
      managementData.config = product
    }

    return managementData
  },
  async create(creatorId, data) {
    await creatorSubscriptionService.assertActiveEntitlement(creatorId, 'products')

    const cleanTitle = sanitizeText(data.title || 'Untitled product').slice(0, 120)
    let slug = slugify(data.slug || cleanTitle)
    let n = 1
    while (await productsRepo.slugExists(creatorId, slug)) { slug = `${slugify(cleanTitle)}-${n++}` }
    const product = {
      id: uuidv4(), creatorId,
      type: data.type || 'DIGITAL_DOWNLOAD',
      title: cleanTitle, slug,
      description: sanitizeHtml(data.description || ''),
      shortDescription: sanitizeText(data.shortDescription || ''),
      thumbnail: sanitizeUrl(data.thumbnail || ''),
      price: clampPrice(data.price),
      currency: (data.currency || 'usd').toLowerCase(),
      status: data.status ? String(data.status).toUpperCase() : 'DRAFT',
      storePublished: data.storePublished !== undefined ? Boolean(data.storePublished) : true,
      fileId: data.fileId || null, fileName: data.fileName || null, fileSize: data.fileSize ? Number(data.fileSize) : null, fileMime: data.fileMime || null,
      benefits: Array.isArray(data.benefits) ? data.benefits.map(sanitizeText).slice(0, 8) : [],
      isLimitedQuantity: !!data.isLimitedQuantity,
      quantityLimit: data.quantityLimit !== undefined && data.quantityLimit !== null ? Math.max(0, parseInt(data.quantityLimit, 10)) : null,
      quantitySold: 0,
      soldOut: false,
      displayMode: data.displayMode === 'featured' ? 'featured' : 'classic',
      redirectUrl: data.redirectUrl ? sanitizeUrl(data.redirectUrl) : null,
      createdAt: new Date(), updatedAt: new Date(),
    }
    const created = await productsRepo.create(product)
    if (data.pageId !== undefined || data.addToStore) {
      try {
        await storeSectionsRepo.addSection(creatorId, {
          type: 'product',
          pageId: data.pageId || null,
          hidden: false,
          props: { productId: created.id, layout: created.displayMode || 'classic' },
        })
      } catch (err) {
        console.error('Failed to auto-create store section for product:', err)
      }
    }
    return created
  },
  async update(creatorId, id, data) {
    await this.get(creatorId, id)
    const patch = pick(data, [
      'title', 'description', 'shortDescription', 'thumbnail', 'cover', 'cta', 'currency', 'benefits',
      'integrations', 'settings', 'pricingOptions', 'receiptMessage',
      'details', 'versions', 'curriculum', 'memberBenefits',
      'bookingSchedule', 'webinarEvent', 'tipPresets', 'externalUrl',
      'contentType', 'redirectUrl', 'contentNotes', 'generateLicenseKeys', 'stampPdf', 'disableDownload', 'files',
      'storePublished', 'status', 'fileId', 'fileName', 'fileSize', 'fileMime', 'displayMode'
    ])
    if (patch.displayMode !== undefined) {
      patch.displayMode = patch.displayMode === 'featured' ? 'featured' : 'classic'
    }
    if (patch.redirectUrl !== undefined) {
      patch.redirectUrl = patch.redirectUrl ? sanitizeUrl(patch.redirectUrl) : null
    }
    if (patch.title !== undefined) patch.title = sanitizeText(patch.title).slice(0, 120)
    if (patch.shortDescription !== undefined) patch.shortDescription = sanitizeText(patch.shortDescription)
    if (patch.description !== undefined) patch.description = sanitizeHtml(patch.description)
    if (patch.thumbnail !== undefined) patch.thumbnail = sanitizeUrl(patch.thumbnail)
    if (patch.cover !== undefined) patch.cover = sanitizeUrl(patch.cover)
    if (patch.benefits && Array.isArray(patch.benefits)) patch.benefits = patch.benefits.map(sanitizeText).slice(0, 8)
    if (data.price !== undefined) patch.price = clampPrice(data.price)
    if (data.isLimitedQuantity !== undefined) patch.isLimitedQuantity = !!data.isLimitedQuantity
    if (data.quantityLimit !== undefined) {
      patch.quantityLimit = data.quantityLimit !== null ? Math.max(0, parseInt(data.quantityLimit, 10)) : null
    }
    if (data.quantitySold !== undefined) patch.quantitySold = Math.max(0, parseInt(data.quantitySold, 10))
    if (data.soldOut !== undefined) patch.soldOut = !!data.soldOut
    if (data.slug) {
      let slug = slugify(data.slug)
      const exists = await productsRepo.slugExists(creatorId, slug)
      const current = await productsRepo.getForCreator(id, creatorId)
      if (exists && current.slug !== slug) throw httpError(409, 'Slug already in use')
      patch.slug = slug
    }
    const updatedProduct = await productsRepo.update(id, creatorId, patch)
    if (patch.displayMode) {
      try {
        const sections = await storeSectionsRepo.getForCreator(creatorId)
        for (const sec of sections) {
          if (sec.type === 'product' && sec.props?.productId === id) {
            await storeSectionsRepo.updateSection(creatorId, sec.id, {
              props: { ...sec.props, layout: patch.displayMode }
            })
          }
        }
      } catch (err) {
        console.warn('Failed to sync store_sections layout with product displayMode:', err)
      }
    }
    return updatedProduct
  },

  async publish(creatorId, id) {
    const subStatus = await creatorSubscriptionService.getStatus(creatorId)
    if (subStatus.status !== 'ACTIVE' && subStatus.status !== 'TRIALING') {
      const pricing = getSubscriptionPricing()
      throw httpError(402, `A paid subscription (Creator ${pricing.CREATOR.priceFormatted}/mo or Pro ${pricing.PRO.priceFormatted}/mo) is required to publish products and start selling.`)
    }
    const p = await this.get(creatorId, id)
    if (p.type === 'COURSE') {
      const course = await coursesRepo.getByProduct(id)
      if (course) {
        const lessons = await lessonsRepo.listByCourse(course.id)
        if (!lessons.length) throw httpError(400, 'Add at least one lesson to your course before publishing.')
        await coursesRepo.update(course.id, creatorId, { status: 'PUBLISHED', publishedAt: new Date() })
      }
    }
    if (p.type === 'DIGITAL_DOWNLOAD' && !p.fileId && (!p.files || p.files.length === 0) && (!p.contentBlocks || p.contentBlocks.length === 0)) {
      throw httpError(400, 'Add at least one downloadable file or resource before publishing.')
    }
    if (p.type === 'COACHING') {
      const config = await coachingRepo.getConfigByProductId(id)
      if (!config || !config.availability || !config.availability.some(a => a.enabled)) {
        throw httpError(400, 'Configure at least one availability window before publishing your coaching product.')
      }
    }
    if (p.type === 'COMMUNITY') {
      const config = await communityRepo.getConfigByProductId(id)
      if (!config || !config.name || !config.slug) {
        throw httpError(400, 'Configure your community name and slug before publishing.')
      }
    }
    if (p.type === 'WEBINAR') {
      const config = await webinarRepo.getConfigByProductId(id)
      if (!config || !config.title || !config.startAtUTC || !config.meetingUrl) {
        throw httpError(400, 'Configure webinar schedule, timezone, and meeting URL before publishing.')
      }
      if (new Date(config.startAtUTC).getTime() <= Date.now()) {
        throw httpError(400, 'Webinar start time must be in the future.')
      }
    }
    if (p.type === 'MEMBERSHIP') {
      const config = await membershipRepo.getConfigByProductId(id)
      if (!config || !config.name || (!config.isFree && !(Number(config.price) > 0))) {
        throw httpError(400, 'Configure membership name and valid price before publishing.')
      }
      if (!Array.isArray(config.benefits) || config.benefits.length === 0) {
        throw httpError(400, 'Add at least 1 benefit to your membership before publishing.')
      }
    }
    if (p.type === 'CUSTOM_PRODUCT' || p.type === 'CUSTOM_SERVICE') {
      const config = await customServiceRepo.getConfigByProductId(id)
      if (!config || !config.name || (!config.isFree && !(Number(config.price) > 0))) {
        throw httpError(400, 'Configure service name and valid price before publishing.')
      }
      if (!config.deliveryDays || Number(config.deliveryDays) <= 0) {
        throw httpError(400, 'Configure delivery turnaround days before publishing.')
      }
      if (!Array.isArray(config.requirements) || config.requirements.length === 0) {
        throw httpError(400, 'Add at least 1 requirement intake field before publishing.')
      }
    }
    if (p.type === 'EXTERNAL_LINK') {
      const config = await externalLinkRepo.getConfigByProductId(id)
      if (!config || !config.name || (!config.isFree && !(Number(config.price) > 0))) {
        throw httpError(400, 'Configure product name and valid price before publishing.')
      }
      if (!config.destinationUrl || !config.destinationUrl.trim()) {
        throw httpError(400, 'Configure a valid destination URL before publishing.')
      }
      const check = externalLink.normalizeAndValidateUrl(config.destinationUrl)
      if (!check.valid) {
        throw httpError(400, check.error || 'Invalid destination URL format.')
      }
    }
    if (!(Number(p.price) >= 0)) throw httpError(400, 'Set a valid price before publishing')
    if (Number(p.price) > 0) {
      const payoutStatus = await payoutService.getStatus(creatorId)
      if (!payoutStatus.canSellPaidProducts) {
        throw httpError(400, 'Complete payout setup before selling paid products.')
      }
    }
    return productsRepo.update(id, creatorId, { status: 'PUBLISHED' })
  },
  async archive(creatorId, id) {
    await this.get(creatorId, id)
    return productsRepo.update(id, creatorId, { status: 'ARCHIVED' })
  },
  async remove(creatorId, id) {
    await this.get(creatorId, id)
    try {
      await supabaseAdmin.from('coaching_configs').delete().eq('productId', id)
    } catch { }
    try {
      await supabaseAdmin.from('webinar_configs').delete().eq('productId', id)
    } catch { }
    try {
      await supabaseAdmin.from('custom_service_configs').delete().eq('productId', id)
    } catch { }
    try {
      await supabaseAdmin.from('community_configs').delete().eq('productId', id)
    } catch { }
    try {
      await supabaseAdmin.from('membership_configs').delete().eq('productId', id)
    } catch { }
    await productsRepo.remove(id, creatorId)
    return { ok: true }
  },
  async attachFile(creatorId, id, { fileId, fileName, fileSize, fileMime }) {
    await this.get(creatorId, id)
    return productsRepo.update(id, creatorId, { fileId, fileName, fileSize, fileMime })
  },
}
function clampPrice(p) {
  const n = Number(p)
  if (!isFinite(n) || n < 0) return 0
  return Math.round(n * 100) / 100
}

// ---------------- Public ----------------
function withPublicInstagramProfile(profile, igAccount) {
  const base = profile ? { ...profile } : {}
  const socialLinks = { ...(base.socialLinks || {}) }
  const handle = igAccount?.status === 'CONNECTED' && igAccount?.username
    ? String(igAccount.username).replace(/^@/, '')
    : ''
  if (handle) {
    if (!socialLinks.instagram) socialLinks.instagram = `https://instagram.com/${handle}`
    base.instagramUsername = handle
  }
  base.socialLinks = socialLinks
  return base
}

function toPublicStorePayload(store, profile, products, activeSections, allPages) {
  const storeSlug = store.slug || store.username
  const storeName = store.storeName || profile?.name || storeSlug
  const publicProfile = profile
    ? {
      name: profile.name,
      bio: profile.bio,
      category: profile.category,
      avatarUrl: store.avatarUrl || profile.avatarUrl,
      socialLinks: profile.socialLinks || {},
      instagramUsername: profile.instagramUsername || null,
    }
    : {}
  const collectionProductIds = new Set()
  for (const s of (activeSections || [])) {
    if (s.type === 'collection' || s.type === 'product_collection') {
      const items = s.props?.items
      if (Array.isArray(items)) {
        for (const it of items) {
          if (!it) continue
          if (it.productId) collectionProductIds.add(String(it.productId))
          if (it.courseId) collectionProductIds.add(String(it.courseId))
          if (it.type === 'product' && it.id) collectionProductIds.add(String(it.id))
        }
      }
    }
  }

  const visibleSections = activeSections.filter(s => {
    if (s.visible === false || s.hidden) return false
    if (s.type === 'product' || s.type === 'course') {
      const pid = s.props?.productId || s.props?.courseId || s.props?.id || (!s.props?.productId && products?.[0]?.id ? products[0].id : null)
      if (pid && collectionProductIds.has(String(pid))) return false
    }
    return true
  })
  const pages = Array.isArray(allPages) ? allPages : []
  return {
    store: {
      id: store.id,
      storeName: storeName,
      username: storeSlug,
      slug: storeSlug,
      published: Boolean(store.published),
      theme: store.theme,
      sections: visibleSections,
      seo: store.seo,
      pages,
    },
    username: storeSlug,
    slug: storeSlug,
    storeName: storeName,
    theme: store.theme,
    sections: visibleSections,
    pages,
    profile: publicProfile,
    products: products.map(publicProduct),
    creatorId: store.creatorId,
  }
}

export const publicService = {
  async resolveStorefront(username, options = {}) {
    const slug = normalizeSlug(username)
    if (!slug) return { status: 'not_found', slug: '' }

    let store
    try {
      store = await storesRepo.getBySlug(slug)
    } catch (error) {
      console.error('Public storefront lookup failed:', error)
      return { status: 'error', slug }
    }

    if (!store) return { status: 'not_found', slug }

    const publicSlug = store.slug || store.username || slug

    // Server-side entitlement check: automatically OFF if trial expired with no active paid plan
    const sub = await creatorSubscriptionService.getStatus(store.creatorId).catch(() => null)
    const isPaid = sub && sub.status === 'ACTIVE' && !sub.isTrial
    const isTrialActive = Boolean(sub && sub.isTrial && !sub.isTrialExpired && (sub.status === 'TRIALING' || sub.trialStatus === 'ACTIVE'))
    const isEntitled = (isPaid || isTrialActive) && Boolean(sub?.entitlements?.storefront ?? sub?.entitlements?.canPublish)

    if (!isEntitled) {
      if (store.published) {
        await storesRepo.setPublished(store.creatorId, false).catch(() => null)
        store.published = false
      }
      return { status: 'unpublished', slug: publicSlug, reason: 'trial_expired' }
    }

    if (!store.published && !options.allowDraft) {
      return { status: 'unpublished', slug: publicSlug }
    }

    try {
      const profile = await profilesRepo.getByCreator(store.creatorId)
      const products = await productsRepo.listPublished(store.creatorId)

      // Get all sections (with pageId) for multi-page support
      const allSections = await storeSectionsRepo.getForCreator(store.creatorId)
      const storedSections = allSections.length ? allSections : (store.sections || [])

      // Get pages array from store
      const storePages = Array.isArray(store.pages) ? store.pages : []
      // Always ensure Home page exists
      const pages = (storePages.length === 0 || !storePages.some(p => p.isDefault))
        ? [{ id: 'home', name: 'Home', slug: 'home', isDefault: true, position: 0 }, ...storePages.filter(p => !p.isDefault)]
        : [...storePages].sort((a, b) => (a.position ?? 0) - (b.position ?? 0))

      // Filter sections to the requested page
      // pageSlug=null or 'home' → show home page sections (pageId === null)
      const requestedPageSlug = options.pageSlug || null
      let activeSections
      if (!requestedPageSlug || requestedPageSlug === 'home') {
        // Home page: sections where pageId is null/undefined
        activeSections = storedSections.filter(s => !s.pageId)
      } else {
        // Find the page by slug
        const targetPage = pages.find(p => p.slug === requestedPageSlug)
        if (targetPage) {
          activeSections = storedSections.filter(s => s.pageId === targetPage.id)
        } else {
          // Page slug not found — fall back to home
          activeSections = storedSections.filter(s => !s.pageId)
        }
      }

      // If only one page (home), show all sections regardless of pageId
      if (pages.length <= 1) {
        activeSections = storedSections
      }

      let igAccount = null
      try {
        igAccount = await instagramRepo.getByCreatorId(store.creatorId)
      } catch { }
      const publicProfile = withPublicInstagramProfile(profile, igAccount)
      return { status: 'ok', slug: publicSlug, data: toPublicStorePayload(store, publicProfile, products, storedSections, pages) }
    } catch (error) {
      console.error('Public storefront lookup failed:', error)
      return { status: 'error', slug: publicSlug }
    }
  },

  async getStore(username, options = {}) {
    const result = await this.resolveStorefront(username, options)
    if (result.status !== 'ok') return null
    return result.data
  },

  async getProduct(username, slug) {
    const store = await storesRepo.getByUsername(username)
    if (!store || !store.published) return null
    const product = await productsRepo.getPublishedBySlug(store.creatorId, slug)
    if (!product) return null
    const profile = await profilesRepo.getByCreator(store.creatorId)
    return { product: publicProduct(product), creator: profile ? { name: profile.name, avatarUrl: profile.avatarUrl, username: store.username || store.slug } : { username: store.username || store.slug } }
  },
  async getCheckoutProduct(productId) {
    const product = await productsRepo.getById(productId)
    if (!product || product.status !== 'PUBLISHED') return null
    const profile = await profilesRepo.getByCreator(product.creatorId)
    const store = await storesRepo.getByCreator(product.creatorId)
    return { product: publicProduct(product), creator: { name: profile?.name || '', avatarUrl: profile?.avatarUrl || '', username: store?.username || store?.slug } }
  },

  async getPublicStats() {
    if (global.__publicStatsCache && (Date.now() - global.__publicStatsCache.timestamp < 300000)) {
      return global.__publicStatsCache.data
    }

    try {
      let creatorsCount = 0
      let productsCount = 0
      let ordersCount = 0

      if (typeof supabaseAdmin !== 'undefined' && supabaseAdmin) {
        try {
          const { count: cCount } = await supabaseAdmin.from('profiles').select('*', { count: 'exact', head: true })
          if (typeof cCount === 'number') creatorsCount = cCount
        } catch { }

        try {
          const { count: pCount } = await supabaseAdmin.from('products').select('*', { count: 'exact', head: true }).eq('published', true)
          if (typeof pCount === 'number') productsCount = pCount
        } catch { }

        try {
          const { count: oCount } = await supabaseAdmin.from('orders').select('*', { count: 'exact', head: true }).in('status', ['PAID', 'COMPLETED', 'DELIVERED'])
          if (typeof oCount === 'number') ordersCount = oCount
        } catch { }
      }

      const data = {
        creatorsCount: creatorsCount || 0,
        productsCount: productsCount || 0,
        ordersCount: ordersCount || 0,
        hasSufficientData: (creatorsCount >= 5 && (productsCount >= 5 || ordersCount >= 5)),
        updatedAt: new Date().toISOString(),
      }

      global.__publicStatsCache = {
        timestamp: Date.now(),
        data,
      }
      return data
    } catch (err) {
      console.error('getPublicStats error:', err)
      return {
        creatorsCount: 0,
        productsCount: 0,
        ordersCount: 0,
        hasSufficientData: false,
        updatedAt: new Date().toISOString(),
      }
    }
  },
}
function publicProduct(p) {
  const isLimited = !!p.isLimitedQuantity
  const limit = p.quantityLimit !== undefined && p.quantityLimit !== null ? Number(p.quantityLimit) : null
  const sold = Number(p.quantitySold || 0)
  const soldOut = isLimited && limit !== null && sold >= limit
  const remaining = isLimited && limit !== null ? Math.max(0, limit - sold) : null

  return {
    id: p.id, creatorId: p.creatorId, type: p.type, title: p.title, slug: p.slug, description: p.description, shortDescription: p.shortDescription, thumbnail: p.thumbnail, coverImage: p.coverImage || p.cover_image || null, price: Number(p.price), currency: p.currency, benefits: p.benefits || [], hasFile: !!p.fileId,
    checkoutFields: (p.checkoutFields || []).filter(f => f.active !== false),
    isLimitedQuantity: isLimited,
    quantityLimit: limit,
    quantitySold: sold,
    quantityRemaining: remaining,
    soldOut: soldOut || !!p.soldOut,
  }
}

// ---------------- Custom Checkout Fields Service ----------------
export const checkoutFieldsService = {
  async getForCreator(creatorId, productId) {
    const p = await productsRepo.getForCreator(productId, creatorId)
    if (!p) throw httpError(404, 'Product not found')
    const fields = await checkoutFieldsRepo.getForCreator(productId, creatorId)
    return fields || []
  },
  async addField(creatorId, productId, data) {
    const p = await productsRepo.getForCreator(productId, creatorId)
    if (!p) throw httpError(404, 'Product not found')
    if (!data.label || !data.label.trim()) throw httpError(400, 'Field label is required')
    const validTypes = ['SHORT_TEXT', 'LONG_TEXT', 'NUMBER', 'EMAIL', 'PHONE', 'DROPDOWN', 'MULTIPLE_CHOICE', 'CHECKBOX', 'DATE', 'FILE_UPLOAD']
    const type = (data.type || 'SHORT_TEXT').toUpperCase()
    if (!validTypes.includes(type)) throw httpError(400, 'Invalid field type')

    const field = {
      id: uuidv4(),
      label: sanitizeText(data.label).slice(0, 150),
      description: sanitizeText(data.description || ''),
      type,
      required: !!data.required,
      placeholder: sanitizeText(data.placeholder || ''),
      options: Array.isArray(data.options) ? data.options.map(o => sanitizeText(o)).filter(Boolean) : [],
      order: parseInt(data.order || 1, 10),
      active: data.active !== false,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    return checkoutFieldsRepo.addField(creatorId, productId, field)
  },
  async updateField(creatorId, productId, fieldId, data) {
    const p = await productsRepo.getForCreator(productId, creatorId)
    if (!p) throw httpError(404, 'Product not found')
    const patch = {}
    if (data.label !== undefined) patch.label = sanitizeText(data.label).slice(0, 150)
    if (data.description !== undefined) patch.description = sanitizeText(data.description)
    if (data.placeholder !== undefined) patch.placeholder = sanitizeText(data.placeholder)
    if (data.required !== undefined) patch.required = !!data.required
    if (data.active !== undefined) patch.active = !!data.active
    if (data.order !== undefined) patch.order = parseInt(data.order, 10)
    if (data.options && Array.isArray(data.options)) patch.options = data.options.map(o => sanitizeText(o)).filter(Boolean)
    if (data.type) {
      const validTypes = ['SHORT_TEXT', 'LONG_TEXT', 'NUMBER', 'EMAIL', 'PHONE', 'DROPDOWN', 'MULTIPLE_CHOICE', 'CHECKBOX', 'DATE', 'FILE_UPLOAD']
      const type = data.type.toUpperCase()
      if (validTypes.includes(type)) patch.type = type
    }
    const updated = await checkoutFieldsRepo.updateField(creatorId, productId, fieldId, patch)
    if (!updated) throw httpError(404, 'Checkout field not found')
    return updated
  },
  async deleteField(creatorId, productId, fieldId) {
    const p = await productsRepo.getForCreator(productId, creatorId)
    if (!p) throw httpError(404, 'Product not found')
    const ok = await checkoutFieldsRepo.deleteField(creatorId, productId, fieldId)
    if (!ok) throw httpError(404, 'Checkout field not found')
    return { ok: true }
  },
  async reorderFields(creatorId, productId, orderedFieldIds) {
    const p = await productsRepo.getForCreator(productId, creatorId)
    if (!p) throw httpError(404, 'Product not found')
    if (!Array.isArray(orderedFieldIds)) throw httpError(400, 'orderedFieldIds must be an array')
    return checkoutFieldsRepo.reorderFields(creatorId, productId, orderedFieldIds)
  },
  validateResponses(productFields, customResponses) {
    const activeFields = (productFields || []).filter(f => f.active !== false)
    if (activeFields.length === 0) return []
    const responsesMap = new Map()
    if (Array.isArray(customResponses)) {
      customResponses.forEach(r => {
        if (r.fieldId) responsesMap.set(r.fieldId, r.value)
        else if (r.label) responsesMap.set(r.label, r.value)
      })
    } else if (customResponses && typeof customResponses === 'object') {
      Object.entries(customResponses).forEach(([k, v]) => responsesMap.set(k, v))
    }

    const sanitizedResponses = []
    for (const field of activeFields) {
      const val = responsesMap.get(field.id) ?? responsesMap.get(field.label)
      const isEmpty = val === undefined || val === null || val === '' || (Array.isArray(val) && val.length === 0)
      if (field.required && isEmpty) {
        throw httpError(400, `Checkout field "${field.label}" is required.`)
      }
      if (!isEmpty) {
        if (field.type === 'FILE_UPLOAD' && typeof val === 'object' && val.fileSize) {
          if (val.fileSize > 10 * 1024 * 1024) {
            throw httpError(400, `Uploaded file for "${field.label}" exceeds maximum limit of 10MB.`)
          }
        }
        sanitizedResponses.push({
          fieldId: field.id,
          label: field.label,
          type: field.type,
          value: typeof val === 'string' ? sanitizeText(val) : val
        })
      }
    }
    return sanitizedResponses
  }
}

// ---------------- Checkout ----------------
export const checkoutService = {
  async createSession({ productId, email, name, customerName, bookingId, bookingDetails, customResponses, ref, couponCode }) {
    const product = await productsRepo.getById(productId)
    if (!product) throw httpError(404, 'Product not found')

    let attributedAutomationId = null
    if (ref) {
      const attr = attributionService.verifyAttributionToken(ref)
      if (attr && attr.productId === productId) {
        const auto = await automationsRepo.getForCreator(attr.automationId, product.creatorId)
        if (auto && auto.productId === productId) {
          attributedAutomationId = auto.id
        }
      }
    }

    if (product.isLimitedQuantity && product.quantityLimit !== undefined && product.quantityLimit !== null) {
      const isSoldOut = (product.quantitySold || 0) >= product.quantityLimit
      if (isSoldOut || product.soldOut) {
        throw httpError(409, 'This product is SOLD OUT. No additional purchases are allowed.')
      }
      const reservation = await productsRepo.atomicallyReserveQuantity(productId)
      if (!reservation.success) {
        throw httpError(409, 'This product is SOLD OUT. No additional purchases are allowed.')
      }
    }

    const productFields = await checkoutFieldsRepo.getForProduct(productId)
    const sanitizedCustomResponses = checkoutFieldsService.validateResponses(productFields, customResponses)

    const cleanEmail = email ? String(email).toLowerCase().trim() : null
    const cleanName = (customerName || name || (bookingDetails && bookingDetails.customerName) || '').toString().trim()

    // Handle coaching booking association or creation
    let targetBookingId = bookingId
    if (product.type === 'COACHING' && !targetBookingId && bookingDetails) {
      const hold = await coachingService.createBookingHold({
        productId: product.id,
        startTime: bookingDetails.startTime,
        endTime: bookingDetails.endTime,
        customerEmail: cleanEmail,
        customerName: cleanName || bookingDetails.customerName,
        answers: bookingDetails.answers,
      })
      targetBookingId = hold.id
    }

    const rawPrice = Number(product.price || 0)
    let payablePrice = rawPrice
    let appliedCoupon = null
    let discountAmount = 0

    if (couponCode && rawPrice > 0) {
      const couponValidation = await couponService.validate(product.creatorId, couponCode, product.id, rawPrice)
      if (couponValidation && couponValidation.valid) {
        appliedCoupon = couponValidation.coupon
        discountAmount = couponValidation.discountAmount
        payablePrice = couponValidation.finalAmount
      }
    }

    const isPaid = payablePrice > 0

    // Duplicate payment protection: check if customer already owns an active entitlement for this product
    if (cleanEmail) {
      const alreadyEntitled = await entitlementsRepo.has(null, product.id, cleanEmail)
      if (alreadyEntitled) {
        return {
          alreadyPurchased: true,
          success: true,
          productId: product.id,
          productTitle: product.title,
          message: 'An existing purchase was found with this email address.',
        }
      }
    }

    // Free Product or 100% Coupon Discount Flow (No Razorpay transaction needed)
    if (!isPaid) {
      if (!cleanEmail) throw httpError(400, 'Customer email is required to access product')

      const customer = await customersRepo.upsert(product.creatorId, cleanEmail, cleanName).catch(() => null)

      const orderId = uuidv4()
      const order = {
        id: orderId,
        creatorId: product.creatorId,
        productId: product.id,
        automationId: attributedAutomationId,
        customerId: customer?.id || null,
        customerName: cleanName || null,
        amount: 0,
        currency: product.currency || 'INR',
        status: 'PAID',
        paymentMode: 'FREE',
        customerEmail: cleanEmail,
        customResponses: sanitizedCustomResponses,
        razorpayOrderId: `free_${orderId.substring(0, 12)}`,
        razorpayPaymentId: `free_pay_${orderId.substring(0, 12)}`,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      await ordersRepo.create(order)

      if (attributedAutomationId) {
        await automationEventsRepo.recordEvent({
          creatorId: product.creatorId,
          automationId: attributedAutomationId,
          productId: product.id,
          eventType: 'PURCHASE_COMPLETED',
          metadata: { orderId: order.id, amount: 0, isFree: true }
        })
      }

      await entitlementsRepo.create({
        id: uuidv4(),
        orderId: order.id,
        customerId: customer?.id || null,
        customerEmail: cleanEmail,
        productId: product.id,
        status: 'ACTIVE',
        startsAt: new Date(),
      }).catch((e) => console.warn('Free product entitlement creation note:', e.message))

      if (targetBookingId) {
        await coachingRepo.updateBooking(targetBookingId, { orderId: order.id, customerEmail: cleanEmail })
      }

      await analyticsService.track({ creatorId: product.creatorId, productId: product.id, type: 'order_completed' })

      // Generate secure guest access token & send purchase confirmation email for free checkout
      try {
        const guestAccess = await guestAccessService.createAccessToken({
          orderId: order.id,
          entitlementId: null,
          productId: product.id,
          customerEmail: cleanEmail,
        })
        const profile = await profilesRepo.getByCreator(product.creatorId).catch(() => null)
        const creatorName = profile?.name || profile?.displayName || 'Creator'
        if (guestAccess?.accessUrl) {
          await emailService.sendPurchaseConfirmation({
            to: cleanEmail,
            customerName: cleanName || cleanEmail.split('@')[0],
            creatorName,
            productTitle: product.title,
            amount: 0,
            currency: product.currency || 'INR',
            orderId: order.id,
            accessUrl: guestAccess.accessUrl,
          })
        }
      } catch (emErr) {
        console.error('[FreeOrder] Email confirmation note:', emErr.message)
      }

      return {
        isFree: true,
        success: true,
        orderId: order.id,
        productTitle: product.title,
        productDescription: product.shortDescription || '',
        bookingId: targetBookingId || null,
        order,
      }
    }

    // Dodo Payments Checkout for Paid Products
    const orderId = uuidv4()
    const customer = cleanEmail ? await customersRepo.upsert(product.creatorId, cleanEmail, cleanName).catch(() => null) : null

    const dodoSession = await dodoProvider.createProductCheckoutSession({
      orderId,
      productId: product.id,
      productTitle: product.title,
      amount: payablePrice,
      currency: product.currency || 'USD',
      customerEmail: cleanEmail,
      customerName: cleanName,
      metadata: {
        creatorId: product.creatorId,
        productId: product.id,
        orderId,
        productSlug: product.slug,
      },
    })

    if (appliedCoupon && appliedCoupon.id) {
      await couponsRepo.incrementUsedCount(appliedCoupon.id).catch(() => { })
    }

    const order = {
      id: orderId,
      creatorId: product.creatorId,
      productId: product.id,
      automationId: attributedAutomationId,
      customerId: customer?.id || null,
      customerName: cleanName || null,
      amount: payablePrice,
      currency: product.currency || 'USD',
      status: 'PENDING',
      paymentProvider: 'dodo',
      dodoSessionId: dodoSession.sessionId,
      dodoPaymentId: null,
      customerEmail: cleanEmail,
      customResponses: sanitizedCustomResponses,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    await ordersRepo.create(order)

    if (attributedAutomationId) {
      await automationEventsRepo.recordEvent({
        creatorId: product.creatorId,
        automationId: attributedAutomationId,
        productId: product.id,
        eventType: 'CHECKOUT_STARTED',
        metadata: { orderId: order.id, amount: payablePrice }
      })
    }

    if (targetBookingId) {
      await coachingRepo.updateBooking(targetBookingId, { orderId: order.id, customerEmail: email ? String(email).toLowerCase() : '' })
    }

    await paymentsRepo.create({
      id: uuidv4(),
      orderId: order.id,
      creatorId: product.creatorId,
      productId: product.id,
      amount: payablePrice,
      currency: product.currency || 'USD',
      paymentMode: dodoSession.isMock ? 'TEST' : 'LIVE',
      status: 'CREATED',
      createdAt: new Date(),
      updatedAt: new Date()
    })

    await analyticsService.track({ creatorId: product.creatorId, productId: product.id, type: 'checkout_started' })
    return {
      orderId: order.id,
      sessionId: dodoSession.sessionId,
      checkoutUrl: dodoSession.checkoutUrl,
      provider: 'dodo',
      amount: payablePrice,
      currency: product.currency || 'USD',
      productTitle: product.title,
      productDescription: product.shortDescription || '',
      bookingId: targetBookingId || null,
      order,
    }
  },

  async verifyPayment({ orderId, sessionId, paymentId, razorpayOrderId, razorpayPaymentId, razorpaySignature } = {}) {
    const targetOrderId = orderId || razorpayOrderId
    let order = targetOrderId ? await ordersRepo.getById(targetOrderId) : null
    if (!order && sessionId) {
      order = await ordersRepo.getByDodoSessionId(sessionId)
    }
    if (!order && targetOrderId) {
      order = await ordersRepo.getByRazorpayOrderId(targetOrderId)
    }
    if (!order) throw httpError(404, 'Order not found')

    if (order.status === 'PAID') {
      return { success: true, orderId: order.id, order }
    }

    const effectiveSessionId = sessionId || order.dodoSessionId
    const effectivePaymentId = paymentId || order.dodoPaymentId
    let verifiedPaymentId = null

    if (effectiveSessionId && effectiveSessionId.startsWith('cks_')) {
      const session = await dodoProvider.getCheckoutSession(effectiveSessionId).catch(() => null)
      if (!session) {
        throw httpError(404, 'Checkout session not found on Dodo Payments')
      }
      const payStatus = String(session.payment_status || '').toLowerCase()
      const isPaid = payStatus === 'paid' || payStatus === 'succeeded' || Boolean(session.payment_id)
      if (!isPaid) {
        throw httpError(400, `Payment not completed (status: ${session.payment_status || 'unpaid'})`)
      }
      verifiedPaymentId = session.payment_id || `pay_${effectiveSessionId}`
    } else if (effectivePaymentId && effectivePaymentId.startsWith('pay_')) {
      const pay = await dodoProvider.getPayment(effectivePaymentId).catch(() => null)
      if (!pay || String(pay.status || '').toLowerCase() !== 'succeeded') {
        throw httpError(400, `Payment not successful (status: ${pay?.status || 'failed'})`)
      }
      verifiedPaymentId = pay.payment_id || effectivePaymentId
    } else {
      throw httpError(400, 'Authoritative payment verification required. Unverified payments cannot be finalized.')
    }

    await webhookService.finalizeOrder(order.id, verifiedPaymentId, order.customerEmail)
    const updated = await ordersRepo.getById(order.id)
    return { success: true, orderId: order.id, order: updated }
  },

  async getStatus(orderId, email) {
    let order = await ordersRepo.getById(orderId)
    if (!order) order = await ordersRepo.getByRazorpayOrderId(orderId)
    if (!order && email) {
      order = await ordersRepo.getLatestPaidByProductAndEmail(orderId, email)
    }
    if (!order) return null
    const product = await productsRepo.getById(order.productId)
    const result = {
      orderId: order.id,
      status: order.status,
      amount: order.amount,
      currency: order.currency,
      paymentMode: order.paymentMode || 'TEST',
      customerEmail: order.customerEmail || email || null,
      customerName: order.customerName || null,
      razorpayOrderId: order.razorpayOrderId,
      razorpayPaymentId: order.razorpayPaymentId,
      product: product ? { id: product.id, title: product.title, thumbnail: product.thumbnail, type: product.type, hasFile: !!product.fileId, creatorId: product.creatorId } : null,
    }
    if (product && product.type === 'COACHING') {
      const booking = await coachingRepo.getBookingByOrderId(order.id)
      if (booking) result.booking = booking
    }
    if (product && product.type === 'WEBINAR') {
      const config = await webinarRepo.getConfigByProductId(product.id)
      const webinarId = config?.id || product.id
      const reg = await webinarRepo.getRegistration(webinarId, order.email)
      if (reg) result.webinarRegistration = reg
    }
    if (product && product.type === 'MEMBERSHIP') {
      const config = await membershipRepo.getConfigByProductId(product.id)
      const memId = config?.id || product.id
      const sub = await membershipRepo.getSubscription(memId, order.email)
      if (sub) result.membershipSubscription = sub
    }
    if (product && (product.type === 'CUSTOM_PRODUCT' || product.type === 'CUSTOM_SERVICE')) {
      const req = await customServiceRepo.getRequestByOrderId(order.id)
      if (req) result.customServiceRequest = req
    }
    return result
  },
}

// ---------------- Webhook / Fulfillment ----------------
export const webhookService = {
  verifySignature(rawBody, signature) {
    if (!signature) return false
    try {
      const provider = getPaymentProvider()
      provider.verifyWebhook(rawBody, signature)
      return true
    } catch (e) {
      return false
    }
  },

  verifyDodoSignature(rawBody, headers) {
    return dodoProvider.verifyWebhook({ rawBody, headers })
  },

  async processDodoEvent(event) {
    const res = await this.handle(event)
    return {
      processed: Boolean(res?.ok),
      duplicate: Boolean(res?.duplicate),
      ...res,
    }
  },

  async handle(event) {
    const eventId = event.event_id || event.id || uuidv4()
    const eventType = event.event || event.event_type || event.type
    console.log(`[Webhook] Webhook received: ${eventType} (ID: ${eventId})`)

    const claimed = await webhookEventsRepo.claim(eventId, eventType)
    if (!claimed) {
      console.log(`[Webhook] Webhook already claimed/processed: ${eventId}`)
      return { duplicate: true }
    }

    try {
      // ===== DODO PAYMENTS WEBHOOK EVENTS =====
      // Subscription created or pending - record pending state only, NEVER grant active access
      if (eventType === 'subscription.created' || eventType === 'subscription.pending') {
        const data = event.data || {}
        const subscriptionId = data.subscription_id || data.id
        const creatorIdFromMetadata = data.metadata?.creatorId || data.metadata?.creator_id
        console.log(`[Dodo Payments Webhook] Subscription created/pending: ${subscriptionId} (Creator: ${creatorIdFromMetadata}) - Recording PENDING state only`)

        let sub = null
        if (subscriptionId) {
          sub = await creatorSubscriptionsRepo.getByDodoSubscriptionId(subscriptionId)
        }
        if (!sub && creatorIdFromMetadata) {
          sub = await creatorSubscriptionsRepo.getByCreator(creatorIdFromMetadata)
        }

        const targetCreatorId = sub?.creatorId || creatorIdFromMetadata
        if (targetCreatorId) {
          await creatorSubscriptionsRepo.updateStatus(targetCreatorId, 'PENDING', {
            provider: 'DODO',
            providerSubscriptionId: subscriptionId || sub?.providerSubscriptionId,
            dodoSubscriptionId: subscriptionId || sub?.dodoSubscriptionId,
          })
        }
        await webhookEventsRepo.markProcessed(eventId)
        return { ok: true, pending: true }
      }

      if (
        eventType === 'subscription.active' ||
        eventType === 'subscription.renewed' ||
        eventType === 'subscription.plan_changed' ||
        eventType === 'subscription.updated'
      ) {
        const data = event.data || {}
        const rawStatus = String(data.status || 'active').toLowerCase()
        if (eventType === 'subscription.updated' && rawStatus !== 'active') {
          console.log(`[Dodo Payments Webhook] Subscription update received with non-active status: ${rawStatus}. Not granting active access.`)
          await webhookEventsRepo.markProcessed(eventId)
          return { ok: true, ignored: true }
        }

        const subscriptionId = data.subscription_id || data.id
        const creatorIdFromMetadata = data.metadata?.creatorId || data.metadata?.creator_id
        console.log(`[Dodo Payments Webhook] Subscription active/renewed: ${subscriptionId} (Creator: ${creatorIdFromMetadata})`)

        let sub = null
        if (subscriptionId) {
          sub = await creatorSubscriptionsRepo.getByDodoSubscriptionId(subscriptionId)
        }
        if (!sub && creatorIdFromMetadata) {
          sub = await creatorSubscriptionsRepo.getByCreator(creatorIdFromMetadata)
        }

        // Validate account association
        if (sub && creatorIdFromMetadata && sub.creatorId !== creatorIdFromMetadata) {
          console.error(`[Dodo Payments Webhook] Account mismatch: sub belongs to ${sub.creatorId}, event metadata has ${creatorIdFromMetadata}`)
          await webhookEventsRepo.markProcessed(eventId)
          return { error: 'account_mismatch' }
        }

        const targetCreatorId = sub?.creatorId || creatorIdFromMetadata
        if (targetCreatorId) {
          const isAnnual = String(sub?.billingInterval || data.metadata?.billingInterval || '').toUpperCase() === 'ANNUAL'
          const durationDays = isAnnual ? 365 : 30
          let currentEnd = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000)
          if (data.next_billing_date) {
            const parsed = new Date(data.next_billing_date)
            if (!isNaN(parsed.getTime())) currentEnd = parsed
          }
          const currentStart = data.previous_billing_date ? new Date(data.previous_billing_date) : new Date()

          const targetPlan = data.metadata?.plan ? String(data.metadata.plan).toUpperCase() : sub?.plan
          const updatePayload = {
            provider: 'DODO',
            providerSubscriptionId: subscriptionId || sub?.providerSubscriptionId,
            dodoSubscriptionId: subscriptionId || sub?.dodoSubscriptionId,
            dodoCustomerId: data.customer?.customer_id || sub?.dodoCustomerId,
            currentPeriodStart: currentStart,
            currentPeriodEnd: currentEnd,
            trialStatus: 'EXPIRED',
          }
          if (targetPlan) updatePayload.plan = targetPlan
          if (data.metadata?.billingInterval || data.metadata?.interval) {
            updatePayload.billingInterval = String(data.metadata.billingInterval || data.metadata.interval).toUpperCase()
          }

          await creatorSubscriptionsRepo.updateStatus(targetCreatorId, 'ACTIVE', updatePayload)
          await profilesRepo.upsert(targetCreatorId, { onboardingStatus: 'COMPLETED', onboardingComplete: true })
          console.log(`[Dodo Payments Webhook] Creator subscription marked ACTIVE for ${targetCreatorId} (${targetPlan})`)
        }
        await webhookEventsRepo.markProcessed(eventId)
        return { ok: true }
      }

      if (eventType === 'subscription.cancelled' || eventType === 'subscription.expired') {
        const data = event.data || {}
        const subscriptionId = data.subscription_id || data.id
        const creatorIdFromMetadata = data.metadata?.creatorId || data.metadata?.creator_id

        let sub = null
        if (subscriptionId) {
          sub = await creatorSubscriptionsRepo.getByDodoSubscriptionId(subscriptionId)
        }
        if (!sub && creatorIdFromMetadata) {
          sub = await creatorSubscriptionsRepo.getByCreator(creatorIdFromMetadata)
        }

        const targetCreatorId = sub?.creatorId || creatorIdFromMetadata
        if (targetCreatorId) {
          const status = eventType === 'subscription.expired' ? 'EXPIRED' : 'CANCELLED'
          await creatorSubscriptionsRepo.updateStatus(targetCreatorId, status, {
            canceledAt: new Date(),
          })
          console.log(`[Dodo Payments Webhook] Creator subscription marked ${status} for ${targetCreatorId}`)
        }
        await webhookEventsRepo.markProcessed(eventId)
        return { ok: true }
      }

      if (eventType === 'subscription.failed' || eventType === 'subscription.past_due' || eventType === 'subscription.on_hold') {
        const data = event.data || {}
        const subscriptionId = data.subscription_id || data.id
        const creatorIdFromMetadata = data.metadata?.creatorId || data.metadata?.creator_id

        let sub = null
        if (subscriptionId) {
          sub = await creatorSubscriptionsRepo.getByDodoSubscriptionId(subscriptionId)
        }
        if (!sub && creatorIdFromMetadata) {
          sub = await creatorSubscriptionsRepo.getByCreator(creatorIdFromMetadata)
        }

        const targetCreatorId = sub?.creatorId || creatorIdFromMetadata
        if (targetCreatorId) {
          await creatorSubscriptionsRepo.updateStatus(targetCreatorId, 'HALTED')
          console.log(`[Dodo Payments Webhook] Creator subscription marked HALTED for ${targetCreatorId}`)
        }
        await webhookEventsRepo.markProcessed(eventId)
        return { ok: true }
      }

      if (eventType === 'payment.succeeded') {
        const data = event.data || {}
        const paymentId = data.payment_id || data.id
        const orderId = data.metadata?.orderId || data.metadata?.order_id
        const subscriptionId = data.subscription_id

        if (orderId) {
          const order = await ordersRepo.getById(orderId)
          if (order) {
            await this.finalizeOrder(order.id, paymentId, order.customerEmail || data.customer?.email)
          }
        }

        if (subscriptionId) {
          const sub = await creatorSubscriptionsRepo.getByDodoSubscriptionId(subscriptionId)
          if (sub) {
            await creatorSubscriptionsRepo.updateStatus(sub.creatorId, 'ACTIVE', {
              dodoPaymentId: paymentId,
            })
          }
        }
        await webhookEventsRepo.markProcessed(eventId)
        return { ok: true }
      }

      if (eventType === 'payment.failed' || eventType === 'payment.cancelled') {
        const data = event.data || {}
        const orderId = data.metadata?.orderId || data.metadata?.order_id
        if (orderId) {
          const order = await ordersRepo.getById(orderId)
          if (order) {
            await ordersRepo.update(order.id, { status: 'FAILED' })
          }
        }
        await webhookEventsRepo.markProcessed(eventId)
        return { ok: true }
      }

      if (eventType === 'refund.succeeded') {
        const data = event.data || {}
        const orderId = data.metadata?.orderId || data.metadata?.order_id
        const paymentId = data.payment_id
        let order = null
        if (orderId) order = await ordersRepo.getById(orderId)
        if (!order && paymentId) order = await ordersRepo.getByDodoPaymentId(paymentId)
        if (order) {
          await ordersRepo.markRefunded(order.id)
          await entitlementsRepo.revokeForOrder(order.id)
        }
        await webhookEventsRepo.markProcessed(eventId)
        return { ok: true }
      }

      // ===== PAYPAL WEBHOOK EVENTS =====
      if (event.event_type) {
        const ppType = event.event_type
        console.log(`[PayPal] Processing webhook event: ${ppType} (ID: ${eventId})`)
        const resource = event.resource || {}

        if (
          ppType === 'BILLING.SUBSCRIPTION.ACTIVATED' ||
          ppType === 'BILLING.SUBSCRIPTION.CREATED' ||
          ppType === 'PAYMENT.SALE.COMPLETED' ||
          ppType === 'PAYMENT.CAPTURE.COMPLETED'
        ) {
          let subscriptionId = null
          let captureId = resource.id
          let customId = resource.custom_id

          if (ppType.startsWith('BILLING.SUBSCRIPTION.')) {
            subscriptionId = resource.id
            customId = resource.custom_id
          } else if (ppType === 'PAYMENT.SALE.COMPLETED') {
            subscriptionId = resource.billing_agreement_id
            customId = resource.custom_id
          } else if (ppType === 'PAYMENT.CAPTURE.COMPLETED') {
            subscriptionId = resource.supplementary_data?.related_ids?.order_id
          }

          let sub = null
          if (subscriptionId) {
            sub = await creatorSubscriptionsRepo.getByProviderSubscriptionId(subscriptionId)
          }
          if (!sub && customId) {
            sub = await creatorSubscriptionsRepo.getByCreator(customId)
          }

          if (sub) {
            const isAnnual = String(sub.billingInterval || sub.billingCycle || '').toUpperCase() === 'ANNUAL'
            const periodDays = isAnnual ? 365 : 30
            let nextBilling = new Date(Date.now() + periodDays * 24 * 60 * 60 * 1000)
            if (resource.billing_info?.next_billing_time) {
              const parsedDate = new Date(resource.billing_info.next_billing_time)
              if (!isNaN(parsedDate.getTime())) nextBilling = parsedDate
            }
            await creatorSubscriptionsRepo.updateStatus(sub.creatorId, 'ACTIVE', {
              provider: 'PAYPAL',
              providerSubscriptionId: subscriptionId || sub.providerSubscriptionId,
              razorpayPaymentId: captureId,
              currentPeriodStart: new Date(),
              currentPeriodEnd: nextBilling,
            })
            await profilesRepo.upsert(sub.creatorId, { onboardingStatus: 'COMPLETED', onboardingComplete: true })
            console.log(`[PayPal Webhook] Activated / renewed creator subscription for ${sub.creatorId} via ${ppType}`)
          }
        } else if (ppType === 'CHECKOUT.ORDER.APPROVED') {
          const orderId = resource.id
          const sub = await creatorSubscriptionsRepo.getByProviderSubscriptionId(orderId)
          if (sub && sub.status !== 'ACTIVE') {
            await creatorSubscriptionService.verifySubscriptionPayment(sub.creatorId, {
              provider: 'paypal',
              orderId,
            }).catch(e => console.warn('[PayPal Webhook] Auto-capture error:', e.message))
          }
        } else if (
          ppType === 'BILLING.SUBSCRIPTION.CANCELLED' ||
          ppType === 'BILLING.SUBSCRIPTION.SUSPENDED' ||
          ppType === 'BILLING.SUBSCRIPTION.EXPIRED' ||
          ppType === 'PAYMENT.CAPTURE.DENIED'
        ) {
          const subscriptionId = resource.id || resource.billing_agreement_id || resource.supplementary_data?.related_ids?.order_id
          let sub = null
          if (subscriptionId) {
            sub = await creatorSubscriptionsRepo.getByProviderSubscriptionId(subscriptionId)
          }
          if (!sub && resource.custom_id) {
            sub = await creatorSubscriptionsRepo.getByCreator(resource.custom_id)
          }
          if (sub) {
            const targetStatus = (ppType === 'PAYMENT.CAPTURE.DENIED' || ppType === 'BILLING.SUBSCRIPTION.SUSPENDED') ? 'HALTED' : 'CANCELLED'
            await creatorSubscriptionsRepo.updateStatus(sub.creatorId, targetStatus, {
              canceledAt: new Date(),
            })
            console.log(`[PayPal Webhook] Subscription marked ${targetStatus} for ${sub.creatorId}`)
          }
        }
        await webhookEventsRepo.markProcessed(eventId)
        return { ok: true }
      }

      // ===== SUBSCRIPTION EVENTS =====
      if (eventType.startsWith('subscription.')) {
        const subEntity = event.payload?.subscription?.entity
        const paymentEntity = event.payload?.payment?.entity
        const razorpaySubscriptionId = subEntity?.id
        const razorpayPaymentId = paymentEntity?.id
        const creatorIdFromNotes = subEntity?.notes?.creatorId

        if (razorpaySubscriptionId || creatorIdFromNotes) {
          let sub = null
          if (razorpaySubscriptionId) {
            sub = await creatorSubscriptionsRepo.getByRazorpaySubscriptionId(razorpaySubscriptionId)
          }
          if (!sub && creatorIdFromNotes) {
            sub = await creatorSubscriptionsRepo.getByCreator(creatorIdFromNotes)
          }

          const targetCreatorId = sub?.creatorId || creatorIdFromNotes

          if (targetCreatorId) {
            const isAnnual = String(sub?.billingInterval || '').toUpperCase() === 'ANNUAL' || subEntity?.period === 'yearly' || subEntity?.period === 'annual'
            const durationDays = isAnnual ? 365 : 30
            const currentStart = subEntity?.current_start ? new Date(subEntity.current_start * 1000) : new Date()
            const currentEnd = subEntity?.current_end ? new Date(subEntity.current_end * 1000) : new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000)

            if (eventType === 'subscription.authenticated' || eventType === 'subscription.activated') {
              console.log(`[Razorpay] Subscription status: ACTIVE for ${targetCreatorId} (${razorpaySubscriptionId})`)
              await creatorSubscriptionsRepo.updateStatus(targetCreatorId, 'ACTIVE', {
                providerSubscriptionId: razorpaySubscriptionId || sub?.providerSubscriptionId,
                razorpayPaymentId: razorpayPaymentId || sub?.razorpayPaymentId,
                currentPeriodStart: currentStart,
                currentPeriodEnd: currentEnd,
              })
              await profilesRepo.upsert(targetCreatorId, { onboardingStatus: 'COMPLETED', onboardingComplete: true })
              console.log(`[Razorpay] Database subscription updated: ACTIVE for creator ${targetCreatorId}`)
            } else if (eventType === 'subscription.charged') {
              console.log(`[Razorpay] Subscription status: CHARGED for ${targetCreatorId} (${razorpaySubscriptionId})`)
              await creatorSubscriptionsRepo.updateStatus(targetCreatorId, 'ACTIVE', {
                providerSubscriptionId: razorpaySubscriptionId || sub?.providerSubscriptionId,
                razorpayPaymentId: razorpayPaymentId || sub?.razorpayPaymentId,
                currentPeriodStart: currentStart,
                currentPeriodEnd: currentEnd,
              })
              await profilesRepo.upsert(targetCreatorId, { onboardingStatus: 'COMPLETED', onboardingComplete: true })
              console.log(`[Razorpay] Database subscription updated: CHARGED (active) for creator ${targetCreatorId}`)
            } else if (eventType === 'subscription.pending') {
              console.log(`[Razorpay] Subscription status: PENDING for ${targetCreatorId}`)
              await creatorSubscriptionsRepo.updateStatus(targetCreatorId, 'PENDING', {
                providerSubscriptionId: razorpaySubscriptionId || sub?.providerSubscriptionId,
              })
              console.log(`[Razorpay] Database subscription updated: PENDING for creator ${targetCreatorId}`)
            } else if (eventType === 'subscription.halted') {
              console.log(`[Razorpay] Subscription status: HALTED for ${targetCreatorId}`)
              await creatorSubscriptionsRepo.updateStatus(targetCreatorId, 'HALTED', {
                providerSubscriptionId: razorpaySubscriptionId || sub?.providerSubscriptionId,
              })
              console.log(`[Razorpay] Database subscription updated: HALTED for creator ${targetCreatorId}`)
            } else if (eventType === 'subscription.cancelled') {
              console.log(`[Razorpay] Subscription status: CANCELLED for ${targetCreatorId}`)
              await creatorSubscriptionsRepo.updateStatus(targetCreatorId, 'CANCELLED', {
                providerSubscriptionId: razorpaySubscriptionId || sub?.providerSubscriptionId,
                canceledAt: subEntity?.ended_at ? new Date(subEntity.ended_at * 1000) : new Date(),
              })
              console.log(`[Razorpay] Database subscription updated: CANCELLED for creator ${targetCreatorId}`)
            } else if (eventType === 'subscription.paused') {
              console.log(`[Razorpay] Subscription status: PAUSED for ${targetCreatorId}`)
              await creatorSubscriptionsRepo.updateStatus(targetCreatorId, 'PAUSED', {
                providerSubscriptionId: razorpaySubscriptionId || sub?.providerSubscriptionId,
              })
              console.log(`[Razorpay] Database subscription updated: PAUSED for creator ${targetCreatorId}`)
            } else if (eventType === 'subscription.resumed') {
              console.log(`[Razorpay] Subscription status: RESUMED for ${targetCreatorId}`)
              await creatorSubscriptionsRepo.updateStatus(targetCreatorId, 'ACTIVE', {
                providerSubscriptionId: razorpaySubscriptionId || sub?.providerSubscriptionId,
              })
              console.log(`[Razorpay] Database subscription updated: RESUMED (ACTIVE) for creator ${targetCreatorId}`)
            } else if (eventType === 'subscription.updated') {
              console.log(`[Razorpay] Subscription status: UPDATED for ${targetCreatorId}`)
              await creatorSubscriptionsRepo.updateStatus(targetCreatorId, sub?.status || 'ACTIVE', {
                providerSubscriptionId: razorpaySubscriptionId || sub?.providerSubscriptionId,
                currentPeriodStart: currentStart,
                currentPeriodEnd: currentEnd,
              })
            }
          } else {
            console.warn(`[Razorpay] Subscription webhook received but no matching creator found: ${razorpaySubscriptionId}`)
          }
        }
      }
      // ===== ORDER & PAYMENT EVENTS =====
      else if (eventType === 'order.paid' || eventType === 'payment.captured') {
        const payload = event.payload?.payment?.entity || event.payload?.order?.entity
        const razorpayOrderId = payload?.order_id || payload?.id
        const razorpayPaymentId = payload?.id
        const email = payload?.email
        if (razorpayOrderId) {
          const order = await ordersRepo.getByRazorpayOrderId(razorpayOrderId)
          if (order) {
            await this.finalizeOrder(order.id, razorpayPaymentId, email)
          }
          const sub = await creatorSubscriptionsRepo.getByRazorpayOrderId(razorpayOrderId)
          if (sub) {
            const isAnnual = String(sub.billingInterval || sub.billingCycle || '').toUpperCase() === 'ANNUAL' || sub.plan === 'YEARLY'
            const periodDays = isAnnual ? 365 : 30
            await creatorSubscriptionsRepo.updateStatus(sub.creatorId, 'ACTIVE', {
              razorpayOrderId,
              razorpayPaymentId: razorpayPaymentId || sub.razorpayPaymentId,
              currency: sub.currency || payload?.currency || 'INR',
              price: sub.price,
              currentPeriodStart: sub.currentPeriodStart || new Date(),
              currentPeriodEnd: new Date(Date.now() + periodDays * 24 * 60 * 60 * 1000),
              trialStatus: 'EXPIRED',
            })
            await profilesRepo.upsert(sub.creatorId, { onboardingStatus: 'COMPLETED', onboardingComplete: true })
            console.log(`[Razorpay] Database subscription updated from order payment: ACTIVE for creator ${sub.creatorId} (${sub.currency || 'INR'})`)
          }
        }
      } else if (eventType === 'payment.failed') {
        const payload = event.payload?.payment?.entity
        const razorpayOrderId = payload?.order_id
        const razorpaySubscriptionId = payload?.subscription_id
        const creatorIdFromNotes = payload?.notes?.creatorId || payload?.notes?.creator_id
        if (razorpayOrderId) {
          const order = await ordersRepo.getByRazorpayOrderId(razorpayOrderId)
          if (order) {
            await ordersRepo.update(order.id, { status: 'FAILED' })
            if (order.customerEmail) {
              const product = await productsRepo.getById(order.productId).catch(() => null)
              await emailService.sendPaymentFailureEmail({
                to: order.customerEmail,
                customerName: order.customerName,
                productTitle: product?.title || 'Product Order',
                reason: payload?.error_description || 'Payment was declined or cancelled',
                retryUrl: getAppUrl(`/checkout/${product?.slug || product?.id || order.productId}`),
              }).catch(() => { })
            }
          }
          const sub = await creatorSubscriptionsRepo.getByRazorpayOrderId(razorpayOrderId)
          if (sub) await creatorSubscriptionsRepo.updateStatus(sub.creatorId, 'FAILED')
        }
        if (razorpaySubscriptionId) {
          const sub = await creatorSubscriptionsRepo.getByRazorpaySubscriptionId(razorpaySubscriptionId)
          if (sub) await creatorSubscriptionsRepo.updateStatus(sub.creatorId, 'FAILED')
        }
        if (creatorIdFromNotes) {
          const sub = await creatorSubscriptionsRepo.getByCreator(creatorIdFromNotes)
          if (sub && sub.status !== 'ACTIVE') await creatorSubscriptionsRepo.updateStatus(sub.creatorId, 'FAILED')
        }
      } else if (eventType === 'refund.created' || eventType === 'refund.processed') {
        const payload = event.payload?.refund?.entity
        const razorpayPaymentId = payload?.payment_id
        if (razorpayPaymentId) {
          const order = await ordersRepo.getByRazorpayPaymentId(razorpayPaymentId)
          if (order) {
            await ordersRepo.markRefunded(order.id)
            await entitlementsRepo.revokeForOrder(order.id)
          }
        }
      } else if (eventType === 'fund_account.validation.completed' || eventType === 'fund_account.validation.failed') {
        await this.handleFundAccountValidationWebhook(event)
      } else if (eventType.startsWith('account.')) {
        await this.handleAccountWebhook(event)
      }
      await webhookEventsRepo.markProcessed(eventId)
      return { ok: true }
    } catch (e) {
      console.error('[Razorpay] Webhook handling error:', e)
      await webhookEventsRepo.markFailed(eventId, String(e))
      throw e
    }
  },

  async finalizeOrder(orderId, paymentId, customerEmail, extraFields = {}) {
    const order = await ordersRepo.getById(orderId)
    if (!order) return
    const email = customerEmail || order.customerEmail

    const customer = await customersRepo.upsert(order.creatorId, email || `unknown+${orderId}@creatorzero.local`, '')

    const dodoPaymentId = extraFields.dodoPaymentId || (String(paymentId || '').startsWith('pay_dodo') ? paymentId : null)
    const isDodo = extraFields.paymentProvider === 'dodo' || Boolean(dodoPaymentId) || order.paymentProvider === 'dodo'

    // Atomic: only the first successful transition performs fulfillment
    const didTransition = await ordersRepo.markPaidOnce(orderId, {
      customerId: customer.id,
      paymentProvider: isDodo ? 'dodo' : (order.paymentProvider || 'razorpay'),
      dodoPaymentId: dodoPaymentId || order.dodoPaymentId || null,
      razorpayPaymentId: (!isDodo ? paymentId : null) || order.razorpayPaymentId || null,
      paidAt: new Date(),
    })
    if (!didTransition) return // already fulfilled

    // Record purchase attribution if automation originated this order
    if (order.automationId) {
      await automationEventsRepo.recordEvent({
        creatorId: order.creatorId,
        automationId: order.automationId,
        productId: order.productId,
        eventType: 'PURCHASE_COMPLETED',
        metadata: { orderId: order.id, amount: Number(order.amount) }
      })
    }

    // Update payment record
    const existingPayment = await paymentsRepo.getByOrderId(orderId)
    if (existingPayment) {
      await paymentsRepo.update(existingPayment.id, {
        status: 'PAID',
        razorpayPaymentId: !isDodo ? paymentId : (existingPayment.razorpayPaymentId || null),
        capturedAt: new Date()
      })
    } else {
      await paymentsRepo.create({
        id: uuidv4(),
        orderId: order.id,
        creatorId: order.creatorId,
        productId: order.productId,
        paymentMode: isDodo ? 'DODO' : 'RAZORPAY',
        razorpayOrderId: order.razorpayOrderId || null,
        razorpayPaymentId: !isDodo ? paymentId : null,
        amount: order.amount,
        currency: order.currency || 'USD',
        status: 'PAID',
        capturedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      })
    }

    // Trigger Route Transfer if creator has legacy razorpay payout profile
    const payout = await payoutProfilesRepo.getByCreator(order.creatorId)
    if (!isDodo && payout && payout.razorpayAccountId && Number(order.amount) > 0) {
      try {
        const transferRes = await getPaymentProvider().createDirectTransfer({
          razorpayPaymentId: paymentId, accountId: payout.razorpayAccountId, amount: order.amount, currency: order.currency
        })
        await transfersRepo.create({
          id: uuidv4(), paymentId, orderId: order.id, creatorId: order.creatorId,
          razorpayTransferId: transferRes.id || `trf_${order.id}`, amount: order.amount, currency: order.currency || 'INR',
          status: 'SUCCESS', createdAt: new Date()
        })
      } catch (e) {
        console.error('[Route Transfer Error]', e.message)
      }
    }

    // entitlement (idempotent by orderId unique index)
    await entitlementsRepo.createForOrder({
      id: uuidv4(), customerId: customer.id, creatorId: order.creatorId,
      productId: order.productId, orderId, source: 'PURCHASE', status: 'ACTIVE',
      startsAt: new Date(), expiresAt: null, createdAt: new Date(),
    })

    const product = await productsRepo.getById(order.productId)

    if (product && product.type === 'BUNDLE' && Array.isArray(product.bundleProducts)) {
      for (const item of product.bundleProducts) {
        if (item && item.id) {
          const hasEnt = await entitlementsRepo.has(customer.id, item.id)
          if (!hasEnt) {
            await entitlementsRepo.create({
              id: uuidv4(), customerId: customer.id, creatorId: order.creatorId,
              productId: item.id, orderId, source: 'BUNDLE_PURCHASE', bundleProductId: product.id, status: 'ACTIVE',
              startsAt: new Date(), expiresAt: null, createdAt: new Date(),
            })
          }
        }
      }
    }

    if (product && product.type === 'COACHING') {
      const booking = await coachingRepo.getBookingByOrderId(orderId)
      if (booking) {
        await coachingRepo.updateBooking(booking.id, { status: 'CONFIRMED', customerId: customer.id, customerEmail: email || booking.customerEmail })
      }
    }
    if (product && product.type === 'COMMUNITY') {
      const config = await communityRepo.getConfigByProductId(product.id)
      const commId = config?.id || product.id
      await communityRepo.upsertMembership({
        communityId: commId,
        productId: product.id,
        creatorId: product.creatorId,
        customerId: customer.id,
        customerEmail: email,
        customerName: customer.name || email.split('@')[0],
        role: 'MEMBER',
        status: 'ACTIVE',
      })
    }
    if (product && product.type === 'WEBINAR') {
      const config = await webinarRepo.getConfigByProductId(product.id)
      const webinarId = config?.id || product.id
      let reg = await webinarRepo.getRegistration(webinarId, email)
      if (reg) {
        await webinarRepo.updateRegistrationStatus(reg.id, 'REGISTERED', {
          orderId: order.id,
          customerId: customer.id,
          customerName: customer.name || email.split('@')[0],
        })
      } else {
        await webinarRepo.upsertRegistration({
          webinarId,
          productId: product.id,
          creatorId: product.creatorId,
          customerId: customer.id,
          customerEmail: email,
          customerName: customer.name || email.split('@')[0],
          orderId: order.id,
          status: 'REGISTERED',
          answers: [],
        })
      }
    }
    if (product && product.type === 'MEMBERSHIP') {
      const config = await membershipRepo.getConfigByProductId(product.id)
      const memId = config?.id || product.id
      const sub = await membershipRepo.upsertSubscription({
        membershipId: memId,
        productId: product.id,
        creatorId: product.creatorId,
        customerId: customer.id,
        customerEmail: email,
        customerName: customer.name || email.split('@')[0],
        orderId: order.id,
        billingInterval: config?.billingType === 'YEARLY' ? 'YEAR' : 'MONTH',
        price: order.amount,
        currency: order.currency,
        status: 'ACTIVE',
        cancelAtPeriodEnd: false,
      })
      await membershipService.cascadeEntitlements(sub, config)
    }
    if (product && (product.type === 'CUSTOM_PRODUCT' || product.type === 'CUSTOM_SERVICE')) {
      const config = await customServiceRepo.getConfigByProductId(product.id)
      const serviceId = config?.id || product.id
      const existingReq = await customServiceRepo.getRequestByOrderId(order.id)
      if (!existingReq) {
        const answers = order.metadata?.answers || []
        await customServiceRepo.upsertRequest({
          serviceId,
          productId: product.id,
          creatorId: product.creatorId,
          customerId: customer.id,
          customerEmail: email,
          customerName: customer.name || email.split('@')[0],
          orderId: order.id,
          deliveryDays: config?.deliveryDays || 3,
          status: 'SUBMITTED',
          answers,
        })
      }
    }

    // Record Earnings Ledger entry
    await earningsService.recordSale({ order, product })

    await analyticsService.track({ creatorId: order.creatorId, productId: order.productId, type: 'purchase', metadata: { amount: order.amount, currency: order.currency } })

    // Email (real if configured, isolated non-blocking delivery)
    try {
      const profile = await profilesRepo.getByCreator(order.creatorId).catch(() => null)
      const creatorUser = await usersRepo.findById(order.creatorId).catch(() => null)
      const creatorName = profile?.name || profile?.displayName || 'Creator'

      if (email && product) {
        // Generate cryptographically secure product access token for guest customer
        try {
          const guestAccess = await guestAccessService.createAccessToken({
            orderId: order.id,
            entitlementId: null,
            productId: product.id,
            customerEmail: email,
          })
          if (guestAccess?.accessUrl) {
            // 1. Customer purchase success email with [ Download Product ]
            await emailService.sendPurchaseSuccessEmail({
              to: email,
              customerName: customer.name || email.split('@')[0],
              productTitle: product.title,
              accessUrl: guestAccess.accessUrl,
            })
          }
        } catch (tokErr) {
          console.error('[GuestAccess] Error creating access token or sending confirmation email:', tokErr.message)
        }

        if (product.type === 'COURSE') {
          await emailService.sendCourseEnrollmentEmail({
            to: email,
            customerName: customer.name || email.split('@')[0],
            creatorName,
            courseTitle: product.title,
            accessUrl: getAppUrl(`/learn/${product.id}`),
          })
        }

        if (product.type === 'COACHING') {
          const booking = await coachingRepo.getBookingByOrderId(orderId)
          if (booking) {
            const timeStr = `${new Date(booking.startTime).toUTCString()}`
            await emailService.sendBookingConfirmationEmail({
              to: email,
              customerName: customer.name || email.split('@')[0],
              creatorName,
              productTitle: product.title,
              sessionTime: timeStr,
              meetingUrl: booking.meetingUrl,
            })
          }
        }

        if (product.type === 'WEBINAR') {
          const config = await webinarRepo.getConfigByProductId(product.id)
          const timeStr = config?.startAtUTC ? `${new Date(config.startAtUTC).toUTCString()} (${config.timezone || 'UTC'})` : 'Scheduled time'
          await emailService.sendWebinarConfirmationEmail({
            to: email,
            customerName: customer.name || email.split('@')[0],
            creatorName,
            productTitle: product.title,
            webinarTime: timeStr,
            meetingUrl: config?.meetingUrl,
          })
        }

        if (product.type === 'MEMBERSHIP') {
          const config = await membershipRepo.getConfigByProductId(product.id)
          await emailService.sendMembershipActivatedEmail({
            to: email,
            customerName: customer.name || email.split('@')[0],
            creatorName,
            productTitle: product.title,
            priceDisplay: `₹${order.amount}`,
            billingInterval: config?.billingType === 'YEARLY' ? 'year' : 'month',
          })
        }

        if (product.type === 'COMMUNITY') {
          await emailService.sendCommunityAccessEmail({
            to: email,
            customerName: customer.name || email.split('@')[0],
            creatorName,
            communityTitle: product.title,
            accessUrl: `${appUrl}/community/${product.id}`,
          })
        }
      }

      // 3. Creator notification email
      if (creatorUser?.email) {
        await emailService.sendNewOrderCreatorEmail({
          to: creatorUser.email,
          creatorName,
          customerName: customer?.name || email?.split('@')[0] || 'Customer',
          customerEmail: email,
          productTitle: product?.title || 'Product',
          amount: order.amount,
          currency: order.currency || 'INR',
          orderId: order.id,
        })
      }
    } catch (e) { console.error('[EmailService] Order fulfillment email dispatch failed:', e?.message || e) }

    return await ordersRepo.getById(orderId)
  },

  async handleAccountWebhook(event) {
    const eventType = event.event || event.type || ''
    const payload = event.payload || {}
    const accountObj = payload.account?.entity || payload.entity || {}
    const razorpayAccountId = accountObj.id || event.account_id

    if (!razorpayAccountId) return { success: false, reason: 'no_account_id' }

    const profile = await payoutProfilesRepo.getByRazorpayAccountId(razorpayAccountId)
    if (!profile) return { success: false, reason: 'profile_not_found' }

    let status = profile.status
    let verificationStatus = profile.verificationStatus

    if (eventType === 'account.activated' || accountObj.status === 'activated') {
      status = 'ACTIVE'
      verificationStatus = 'VERIFIED'
    } else if (eventType === 'account.under_review' || accountObj.status === 'under_review') {
      status = 'UNDER_REVIEW'
      verificationStatus = 'PENDING'
    } else if (eventType === 'account.suspended' || accountObj.status === 'suspended') {
      status = 'SUSPENDED'
      verificationStatus = 'FAILED'
    }

    await payoutProfilesRepo.updateStatus(profile.creatorId, status, { verificationStatus })
    await payoutAuditRepo.logEvent({
      creatorId: profile.creatorId,
      event: status === 'ACTIVE' ? 'VERIFICATION_SUCCESS' : (status === 'SUSPENDED' ? 'PAYOUT_ACCOUNT_SUSPENDED' : 'VERIFICATION_PENDING'),
      metadata: { razorpayAccountId, status, verificationStatus, eventType }
    })

    return { success: true, creatorId: profile.creatorId, status }
  },

  async handleFundAccountValidationWebhook(event) {
    const entity = event.payload?.fund_account_validation?.entity
    if (!entity) return { success: false, reason: 'missing_entity' }
    const fundAccountId = entity.fund_account_id
    const validationId = entity.id
    const valStatus = entity.status
    const accountStatus = entity.results?.account_status
    const registeredName = entity.results?.registered_name

    let profile = await payoutProfilesRepo.getByRazorpayFundAccountId(fundAccountId)
    if (!profile && validationId) {
      profile = await payoutProfilesRepo.getByRazorpayValidationId(validationId)
    }
    if (!profile) return { success: false, reason: 'profile_not_found' }

    if ((valStatus === 'completed' || accountStatus === 'active') && registeredName) {
      const nameMatch = isAccountHolderNameMatch(profile.accountHolderName, registeredName)
      if (nameMatch) {
        await payoutProfilesRepo.updateStatus(profile.creatorId, 'ACTIVE', {
          verificationStatus: 'VERIFIED',
          verifiedAccountHolderName: registeredName,
          verificationMessage: 'Your bank account has been verified successfully and your payout setup is active.',
          verificationCompletedAt: new Date()
        })
        await payoutAuditRepo.logEvent({
          creatorId: profile.creatorId,
          event: 'VERIFICATION_SUCCESS',
          metadata: { fundAccountId, validationId, registeredName }
        })
      } else {
        await payoutProfilesRepo.updateStatus(profile.creatorId, 'ACTION_REQUIRED', {
          verificationStatus: 'FAILED',
          verificationMessage: "Account holder name doesn't match bank records."
        })
        await payoutAuditRepo.logEvent({
          creatorId: profile.creatorId,
          event: 'VERIFICATION_FAILED',
          metadata: { reason: 'NAME_MISMATCH', registeredName }
        })
      }
    } else {
      await payoutProfilesRepo.updateStatus(profile.creatorId, 'ACTION_REQUIRED', {
        verificationStatus: 'FAILED',
        verificationMessage: entity.error?.description || 'Bank account verification failed with Razorpay.'
      })
      await payoutAuditRepo.logEvent({
        creatorId: profile.creatorId,
        event: 'VERIFICATION_FAILED',
        metadata: { reason: entity.error?.description || 'BANK_VALIDATION_REJECTED' }
      })
    }
    return { success: true, creatorId: profile.creatorId }
  },
}

// ---------------- Download (Cookie Session & Entitlement-gated) ----------------
export const downloadService = {
  async authorizeAndGetDownloadFile({ productId, guestEmail, guestCustomerId, creatorUserId = null }) {
    if (!productId) throw httpError(400, 'Product ID is required')

    const product = await productsRepo.getById(productId)
    if (!product) throw httpError(404, 'Product not found')
    if (!product.fileId) throw httpError(404, 'Digital resource file not found on product')

    const rawPrice = Number(product.price || 0)
    const isPaidProduct = rawPrice > 0

    // 1. Creator user accessing their own product
    if (creatorUserId && product.creatorId === creatorUserId) {
      return this._fetchStorageFile(product)
    }

    // 2. Identify caller's email and customer ID
    let userEmail = guestEmail ? String(guestEmail).toLowerCase().trim() : null
    let customerId = guestCustomerId || null

    if (!userEmail && creatorUserId) {
      const loggedUser = await prisma.user.findUnique({ where: { id: creatorUserId }, select: { email: true } }).catch(() => null)
      if (loggedUser?.email) userEmail = loggedUser.email.toLowerCase().trim()
    }

    if (!userEmail && !customerId) {
      throw httpError(401, 'Unauthorized. Please access using your purchase link from your email or verify your email.')
    }

    // 3. Verify active entitlement and corresponding order
    const entitlement = await prisma.entitlement.findFirst({
      where: {
        productId,
        status: 'ACTIVE',
        OR: [
          ...(customerId ? [{ customerId }] : []),
          ...(userEmail ? [
            { customerEmail: { equals: userEmail, mode: 'insensitive' } },
            { order: { customerEmail: { equals: userEmail, mode: 'insensitive' }, status: 'PAID' } },
            { customer: { email: { equals: userEmail, mode: 'insensitive' } } }
          ] : [])
        ]
      },
      include: {
        order: true
      }
    })

    if (!entitlement) {
      throw httpError(403, 'No active purchase found for this product')
    }

    // 4. If the entitlement has an order, verify the order is in a completed paid status
    if (entitlement.order && entitlement.order.status !== 'PAID') {
      throw httpError(403, 'Payment required. This order has not been completed.')
    }

    return this._fetchStorageFile(product)
  },

  async _fetchStorageFile(product) {
    await ensureBucket('product-files', false)
    const storageInfo = await resolveDigitalProductStoragePath(product)
    if (!storageInfo) {
      throw httpError(404, 'File resource unavailable on storage')
    }

    const { bucket: storageBucket, path: storagePath } = storageInfo
    const safeFileName = (product.fileName || product.title || 'download')
      .replace(/[\/\\:\*\?"<>\|\r\n]/g, '_')
      .trim() || 'download'

    const { data: blobData, error: dlErr } = await supabaseAdmin.storage
      .from(storageBucket)
      .download(storagePath)

    if (dlErr || !blobData) {
      console.error('[DownloadService] Failed to download storage object:', dlErr?.message)
      throw httpError(404, 'File resource unavailable on storage')
    }

    const arrayBuffer = await blobData.arrayBuffer()
    const fileBuffer = Buffer.from(arrayBuffer)
    const fileSize = fileBuffer.length || blobData.size || product.fileSize || 0
    const fileMime = product.fileMime || blobData.type || 'application/octet-stream'

    return {
      fileBuffer,
      fileStream: typeof blobData.stream === 'function' ? blobData.stream() : null,
      blob: blobData,
      fileName: safeFileName,
      fileSize,
      fileMime,
      storageBucket,
      storagePath,
      async getSignedUrl(expiresIn = 120) {
        const { data: signedData, error: signErr } = await supabaseAdmin.storage
          .from(storageBucket)
          .createSignedUrl(storagePath, expiresIn, { download: safeFileName })
        if (signErr || !signedData?.signedUrl) {
          console.error('[DownloadService] Failed to create signed URL:', signErr?.message)
          throw httpError(500, 'Failed to generate secure download link')
        }
        return signedData.signedUrl
      },
    }
  },

  async getDownloadSignedUrl(product, expiresIn = 120) {
    await ensureBucket('product-files', false)
    const storageInfo = await resolveDigitalProductStoragePath(product)
    if (!storageInfo) {
      throw httpError(404, 'File resource unavailable on storage')
    }
    const { bucket: storageBucket, path: storagePath } = storageInfo
    const safeFileName = (product.fileName || product.title || 'download')
      .replace(/[\/\\:\*\?"<>\|\r\n]/g, '_')
      .trim() || 'download'

    const { data: signedData, error: signErr } = await supabaseAdmin.storage
      .from(storageBucket)
      .createSignedUrl(storagePath, expiresIn, { download: safeFileName })

    if (signErr || !signedData?.signedUrl) {
      console.error('[DownloadService] Failed to create signed URL:', signErr?.message)
      throw httpError(500, 'Failed to generate secure download link')
    }
    return {
      signedUrl: signedData.signedUrl,
      fileName: safeFileName,
      fileSize: product.fileSize || null,
      fileMime: product.fileMime || 'application/octet-stream',
      expiresIn,
    }
  },
}

// ---------------- Guest Customer Access Service ----------------
export const guestAccessService = {
  async createAccessToken({ orderId, entitlementId, productId, customerEmail, expiresInDays = 30 }) {
    if (!orderId || !productId || !customerEmail) {
      throw new Error('Missing required fields for access token generation')
    }
    const cleanEmail = String(customerEmail).toLowerCase().trim()

    const rawToken = generateSecureToken()
    const tokenHash = hashToken(rawToken)
    const expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)

    await productAccessTokensRepo.create({
      orderId,
      entitlementId: entitlementId || null,
      productId,
      customerEmail: cleanEmail,
      tokenHash,
      expiresAt,
    })

    const accessUrl = getAppUrl(`/api/purchases/email-access/${rawToken}`)
    return { rawToken, tokenHash, accessUrl, expiresAt }
  },

  async validateTokenAndResolve(rawToken) {
    if (!rawToken || typeof rawToken !== 'string') {
      return { success: false, error: 'INVALID_TOKEN', message: 'This access link is invalid or has expired.' }
    }

    const tokenHash = hashToken(rawToken.trim())
    const record = await productAccessTokensRepo.getByTokenHash(tokenHash)
    if (!record) {
      return { success: false, error: 'NOT_FOUND', message: 'This access link is invalid or has expired.' }
    }

    if (new Date(record.expiresAt) < new Date()) {
      return { success: false, error: 'EXPIRED', message: 'This access link has expired.' }
    }

    if (!record.order || record.order.status !== 'PAID') {
      return { success: false, error: 'UNPAID', message: 'Payment for this order has not been completed.' }
    }

    if (record.entitlement && record.entitlement.status !== 'ACTIVE') {
      return { success: false, error: 'REVOKED', message: 'Access to this product is no longer active.' }
    }

    const hasEnt = await entitlementsRepo.has(record.order.customerId, record.productId, record.customerEmail)
    if (!hasEnt) {
      return { success: false, error: 'NO_ENTITLEMENT', message: 'No active entitlement found for this product.' }
    }

    // Mark used
    await productAccessTokensRepo.markUsed(record.id).catch(() => { })

    // Establish signed guest session cookie payload
    const sessionCookieValue = signPurpose(
      {
        email: record.customerEmail,
        customerId: record.order.customerId || null,
        productId: record.productId,
      },
      'guest_access',
      60 * 60 * 24 * 30
    )

    const creatorStore = record.product?.creator?.store
    const creatorUser = record.product?.creator
    const creatorSlug = creatorStore?.username || creatorStore?.slug || creatorUser?.username || 'creator'
    const productSlug = record.product?.slug || record.product?.id || 'product'
    const redirectUrl = `/${creatorSlug}/${productSlug}`

    return {
      success: true,
      sessionCookieValue,
      redirectUrl,
      customerEmail: record.customerEmail,
      product: record.product,
      order: record.order,
    }
  },

  createGuestSessionToken({ email, customerId = null, productId = null }) {
    if (!email) return null
    return signPurpose(
      {
        email: String(email).toLowerCase().trim(),
        customerId: customerId || null,
        productId: productId || null,
      },
      'guest_access',
      60 * 60 * 24 * 30 // 30 days
    )
  },

  verifyGuestSession(cookieValue) {
    if (!cookieValue) return null
    return verifyPurpose(cookieValue, 'guest_access')
  },
}

export function normalizeAccountHolderName(name) {
  if (!name) return ''
  return name.toLowerCase().replace(/[^a-z0-9]/g, ' ').replace(/\s+/g, ' ').trim()
}

export function isAccountHolderNameMatch(providedName, registeredName) {
  if (!providedName || !registeredName) return false
  const p = normalizeAccountHolderName(providedName)
  const r = normalizeAccountHolderName(registeredName)
  if (!p || !r) return false
  if (p === r) return true
  const pTokens = p.split(' ').filter(Boolean)
  const rTokens = r.split(' ').filter(Boolean)
  const matchCount = pTokens.filter(t => rTokens.includes(t)).length
  return matchCount >= Math.min(pTokens.length, 2)
}

// ---------------- Creator Payout Service ----------------
export const PAYOUT_PROCESSING_DAYS = 3

export function maskUpiId(upiId) {
  if (!upiId) return ''
  const trimmed = String(upiId).trim()
  const parts = trimmed.split('@')
  if (parts.length !== 2) return trimmed
  const [handle, bank] = parts
  if (handle.length <= 2) {
    return `${handle[0] || ''}••@${bank}`
  }
  if (handle.length <= 4) {
    return `${handle.slice(0, 2)}•••@${bank}`
  }
  return `${handle.slice(0, 3)}••••@${bank}`
}

export function maskBankAccount(accountNumber) {
  if (!accountNumber) return ''
  const clean = String(accountNumber).trim()
  const last4 = clean.slice(-4)
  return `•••• ${last4}`
}

export function maskIfsc(ifsc) {
  if (!ifsc) return ''
  const clean = String(ifsc).trim().toUpperCase()
  if (clean.length < 11) return clean
  return `${clean.slice(0, 4)}••••${clean.slice(-3)}`
}

export const payoutService = {
  getGatewayConfig() {
    const razorpayMode = getRazorpayMode()
    return {
      razorpayMode,
      razorpayIsLive: razorpayMode === 'live',
      currency: 'INR',
      processingDays: PAYOUT_PROCESSING_DAYS,
    }
  },

  async getStatus(creatorId) {
    const profile = await payoutProfilesRepo.getByCreator(creatorId)
    const isUpi = profile?.payoutMethod === 'UPI' || profile?.businessType === 'UPI' || profile?.provider === 'MANUAL_UPI' || (profile?.upiId && !profile?.accountNumber) || (profile?.razorpayAccountId && String(profile.razorpayAccountId).includes('@'))
    const payoutMethod = isUpi ? 'UPI' : (profile?.payoutMethod === 'ACCOUNT' ? 'ACCOUNT' : 'BANK_ACCOUNT')

    const hasDetails = payoutMethod === 'UPI'
      ? !!(profile?.upiId || (profile?.razorpayAccountId && String(profile.razorpayAccountId).includes('@')))
      : !!(profile?.accountHolderName && profile?.bankName && (profile?.accountNumber || profile?.bankLast4 || profile?.razorpayAccountId) && (profile?.ifsc || profile?.ifscCode))

    const rawAccountId = profile?.razorpayAccountId || ''
    const upiIdRaw = isUpi ? (profile?.upiId || (rawAccountId.includes('@') ? rawAccountId : '')) : (profile?.upiId || '')
    const upiIdMasked = (isUpi && upiIdRaw) ? maskUpiId(upiIdRaw) : ''

    const bankAccountRaw = (!isUpi && !rawAccountId.includes('@')) ? (profile?.accountNumber || rawAccountId) : (profile?.accountNumber || '')
    const bankLast4 = !isUpi ? (profile?.bankLast4 || (bankAccountRaw ? bankAccountRaw.slice(-4) : '')) : ''
    const bankAccountMasked = bankLast4 ? `•••• ${bankLast4}` : ''
    const ifsc = !isUpi ? (profile?.ifsc || profile?.ifscCode || '') : ''
    const bankIfscMasked = ifsc ? maskIfsc(ifsc) : ''
    const bankName = !isUpi ? (profile?.bankName || '') : ''
    const accountHolderName = !isUpi ? (profile?.accountHolderName || profile?.legalName || '') : (profile?.accountHolderName || profile?.legalName || '')

    const payoutSchedule = profile?.payoutSchedule === 'monthly' ? 'monthly' : 'weekly'
    const minimumPayoutThreshold = Number(profile?.minimumPayoutThreshold || 100)
    const isPayoutPaused = Boolean(profile?.isPayoutPaused)

    // Calculate real earnings & eligibility
    const summary = await earningsLedgerRepo.getSummary(creatorId).catch(() => ({ availableEarnings: 0 }))
    const availableEarnings = Number(summary?.availableEarnings || 0)

    let currentStatus = 'NOT_CONFIGURED'
    if (hasDetails) {
      if (profile?.status === 'ACTIVE' || profile?.status === 'VERIFIED') {
        currentStatus = profile.status === 'VERIFIED' ? 'VERIFIED' : 'ACTIVE'
      } else if (profile?.status === 'ACTION_REQUIRED' || profile?.status === 'FAILED') {
        currentStatus = profile.status
      } else {
        currentStatus = 'PENDING'
      }
    }

    const isVerifiedOrActive = currentStatus === 'ACTIVE' || currentStatus === 'VERIFIED'
    const isEligible = isVerifiedOrActive && !isPayoutPaused && availableEarnings >= minimumPayoutThreshold

    let eligibilityReason = 'Your payout account has been verified and is ready for payouts.'
    if (!hasDetails || currentStatus === 'NOT_CONFIGURED') {
      eligibilityReason = 'Setup payout method to receive transfers'
    } else if (currentStatus === 'PENDING') {
      eligibilityReason = 'Verification usually completes within 12–24 hours.'
    } else if (isPayoutPaused) {
      eligibilityReason = 'Payouts are currently paused by creator'
    } else if (availableEarnings < minimumPayoutThreshold) {
      eligibilityReason = `Available balance (₹${availableEarnings}) is below minimum threshold (₹${minimumPayoutThreshold})`
    }

    return {
      status: currentStatus,
      onboardingStatus: currentStatus,
      verificationStatus: isVerifiedOrActive ? 'VERIFIED' : (currentStatus === 'PENDING' ? 'PENDING' : 'NOT_APPLICABLE'),
      verificationMessage: currentStatus === 'PENDING'
        ? 'Verification usually completes within 12–24 hours.'
        : (isVerifiedOrActive ? 'Your payout account has been verified and is ready for payouts.' : 'No payout account configured.'),
      payoutMethod,
      payoutSchedule,
      minimumPayoutThreshold,
      isPayoutPaused,
      availableEarnings,
      isEligibleForPayout: isEligible,
      eligibilityReason,
      platformFee: 0,
      accountHolderName,
      bankName,
      upiId: isUpi ? (upiIdMasked || upiIdRaw) : '',
      upiIdMasked,
      upiIdRaw,
      bankAccount: bankAccountMasked,
      bankAccountMasked,
      bankAccountRaw,
      bankLast4,
      ifsc,
      bankIfscMasked,
      processingDays: PAYOUT_PROCESSING_DAYS,
      canSellPaidProducts: true,
      payoutsEnabled: isEligible,
      updatedAt: profile?.updatedAt || profile?.createdAt || null,
    }
  },

  async canReceivePayout(creatorId) {
    const status = await this.getStatus(creatorId)
    return status.status === 'ACTIVE' || status.status === 'VERIFIED'
  },

  async onboard(creatorId, body = {}) {
    const rawMethod = String(body.payoutMethod || (body.upiId ? 'UPI' : 'ACCOUNT')).toUpperCase()
    const isAccount = (rawMethod === 'ACCOUNT' || rawMethod === 'BANK_ACCOUNT' || rawMethod === 'BANK')
    const payoutMethod = isAccount ? (rawMethod === 'BANK_ACCOUNT' ? 'BANK_ACCOUNT' : 'ACCOUNT') : 'UPI'

    const payoutSchedule = String(body.payoutSchedule || 'weekly').toLowerCase() === 'monthly' ? 'monthly' : 'weekly'
    const numThreshold = body.minimumPayoutThreshold !== undefined ? Number(body.minimumPayoutThreshold) : 100
    if (isNaN(numThreshold) || numThreshold <= 0) {
      throw httpError(400, 'Minimum payout threshold must be a positive amount greater than zero.')
    }
    const minimumPayoutThreshold = numThreshold
    const isPayoutPaused = Boolean(body.isPayoutPaused)

    let accountHolderName = ''
    let bankName = ''
    let accountNumber = ''
    let ifscCode = ''
    let bankLast4 = ''
    let bankIfscMasked = ''
    let upiId = ''
    let upiIdMasked = ''

    if (isAccount) {
      accountHolderName = String(body.accountHolderName || body.legalName || '').trim()
      bankName = String(body.bankName || '').trim()
      accountNumber = String(body.accountNumber || '').trim()
      const confirmAccountNumber = String(body.confirmAccountNumber || '').trim()
      ifscCode = String(body.ifscCode || body.ifsc || '').trim().toUpperCase()

      if (!accountHolderName || accountHolderName.length < 2) {
        throw httpError(400, 'Account holder name is required.')
      }
      if (!bankName || bankName.length < 2) {
        throw httpError(400, 'Bank name is required.')
      }
      if (!accountNumber) {
        throw httpError(400, 'Bank account number is required.')
      }
      if (!/^\d{8,20}$/.test(accountNumber)) {
        throw httpError(400, 'Bank account number must be 8–20 numeric digits.')
      }
      if (confirmAccountNumber && confirmAccountNumber !== accountNumber) {
        throw httpError(400, "Account numbers don't match.")
      }
      if (!ifscCode) {
        throw httpError(400, 'IFSC code is required.')
      }
      const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/
      if (!ifscRegex.test(ifscCode)) {
        throw httpError(400, 'Invalid IFSC code format (e.g. SBIN0001234).')
      }

      bankLast4 = accountNumber.slice(-4)
      bankIfscMasked = maskIfsc(ifscCode)
    } else {
      // UPI
      upiId = String(body.upiId || '').trim()
      if (!upiId || !upiId.includes('@')) {
        throw httpError(400, 'Enter a valid UPI ID (e.g. name@bank).')
      }
      const upiRegex = /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z0-9.\-_]{2,64}$/
      if (!upiRegex.test(upiId)) {
        throw httpError(400, 'Enter a valid UPI ID format (e.g. yourname@okhdfcbank).')
      }
      upiIdMasked = maskUpiId(upiId)
      accountHolderName = String(body.accountHolderName || body.legalName || '').trim()
    }

    const payload = {
      creatorId,
      payoutMethod,
      legalName: accountHolderName,
      accountHolderName: accountHolderName,
      bankName: isAccount ? bankName : null,
      accountNumber: isAccount ? accountNumber : null,
      ifscCode: isAccount ? ifscCode : null,
      ifsc: isAccount ? ifscCode : null,
      bankLast4: isAccount ? bankLast4 : null,
      bankIfscMasked: isAccount ? bankIfscMasked : null,
      upiId: !isAccount ? upiId : null,
      businessType: payoutMethod,
      provider: !isAccount ? 'MANUAL_UPI' : 'MANUAL_BANK',
      phone: String(body.phone || '').trim(),
      email: String(body.email || '').trim(),
      payoutSchedule,
      minimumPayoutThreshold,
      isPayoutPaused,
      razorpayAccountId: !isAccount ? upiId : accountNumber,
      status: 'PENDING',
      onboardingStatus: 'PENDING',
      verificationStatus: 'PENDING',
      verificationMessage: 'Verification usually completes within 12–24 hours.',
      currentStep: 3,
      verificationStartedAt: new Date().toISOString(),
      verificationCompletedAt: null,
    }

    const profile = await payoutProfilesRepo.upsert(creatorId, payload)

    try {
      await payoutAuditRepo.logEvent({
        creatorId,
        event: 'PAYOUT_DETAILS_SAVED',
        metadata: {
          payoutMethod,
          payoutSchedule,
          minimumPayoutThreshold,
          isPayoutPaused,
          accountHolderName: isAccount ? accountHolderName : undefined,
          bankName: isAccount ? bankName : undefined,
          bankLast4: isAccount ? bankLast4 : undefined,
          upiIdMasked: !isAccount ? upiIdMasked : undefined,
          status: 'PENDING',
        },
      })
    } catch { }

    return this.getStatus(creatorId)
  },

  async resumeOnboarding(creatorId) {
    return this.getStatus(creatorId)
  },

  async requestWithdrawal(creatorId, { amount }) {
    const status = await this.getStatus(creatorId)
    if (status.status !== 'ACTIVE' && status.status !== 'VERIFIED') {
      if (status.status === 'PENDING') {
        throw httpError(400, 'Your payout account is pending verification. Payouts will be available once verification completes (usually within 12–24 hours).')
      }
      throw httpError(400, 'Please set up and verify your payout account before requesting withdrawal.')
    }

    const summary = await earningsLedgerRepo.getSummary(creatorId)
    const available = Number(summary.availableEarnings || 0)
    if (available <= 0) {
      throw httpError(400, 'No available earnings eligible for payout.')
    }

    const withdrawAmount = amount ? Math.min(Number(amount), available) : available

    // Log withdrawal request for manual processing
    try {
      await payoutAuditRepo.logEvent({
        creatorId,
        event: 'PAYOUT_WITHDRAWAL_REQUESTED',
        metadata: {
          amount: withdrawAmount,
          currency: 'INR',
          payoutMethod: status.payoutMethod,
          accountHolderName: status.accountHolderName,
          details: status.payoutMethod === 'UPI' ? status.upiIdMasked : `${status.bankAccount} (${status.bankIfscMasked})`,
        }
      })
    } catch (e) { }

    return {
      success: true,
      amount: withdrawAmount,
      currency: 'INR',
      message: `Payout request of ₹${withdrawAmount.toLocaleString('en-IN')} submitted! Our team will process it within ${PAYOUT_PROCESSING_DAYS} business days.`,
    }
  },

  async getAdminPayoutAccounts() {
    const profiles = await payoutProfilesRepo.listAll()
    const users = await usersRepo.list()
    const stores = await storesRepo.list()

    const usersMap = new Map((users || []).map(u => [u.id, u]))
    const storesMap = new Map((stores || []).map(s => [s.creatorId, s]))

    const results = []
    for (const p of profiles) {
      const u = usersMap.get(p.creatorId)
      const s = storesMap.get(p.creatorId)
      const isUpi = p.provider === 'MANUAL_UPI' || p.businessType === 'UPI' || (p.razorpayAccountId && String(p.razorpayAccountId).includes('@'))
      const rawId = p.razorpayAccountId || ''

      let summary = { availableEarnings: 0, totalSales: 0, paidOut: 0 }
      try {
        summary = await earningsLedgerRepo.getSummary(p.creatorId)
      } catch { }

      results.push({
        id: p.id,
        creatorId: p.creatorId,
        creatorName: s?.storeName || s?.username || u?.email?.split('@')[0] || 'Creator',
        creatorEmail: u?.email || p.email || 'N/A',
        storeUsername: s?.username || '',
        payoutMethod: isUpi ? 'UPI' : 'BANK_ACCOUNT',
        accountHolderName: p.accountHolderName || p.legalName || 'N/A',
        upiIdMasked: (isUpi && rawId.includes('@')) ? maskUpiId(rawId) : '',
        upiIdRaw: (isUpi && rawId.includes('@')) ? rawId : '',
        bankAccountMasked: p.bankLast4 ? `•••• ${p.bankLast4}` : (!rawId.includes('@') && rawId ? `•••• ${rawId.slice(-4)}` : ''),
        bankAccountRaw: (!rawId.includes('@') && rawId) ? rawId : '',
        ifsc: p.ifsc || '',
        bankIfscMasked: p.bankIfscMasked || (p.ifsc ? maskIfsc(p.ifsc) : ''),
        status: p.status || 'PENDING',
        availableBalance: Number(summary?.availableEarnings || 0),
        totalSales: Number(summary?.totalSales || 0),
        totalPaidOut: Number(summary?.paidOut || 0),
        updatedAt: p.updatedAt || p.createdAt,
      })
    }

    return results
  },

  async adminMarkAsPaid(creatorId, { amount, referenceId, notes }) {
    if (!creatorId) throw httpError(400, 'Creator ID is required.')
    const numAmount = Number(amount)
    if (!numAmount || numAmount <= 0) {
      throw httpError(400, 'Please enter a valid payout amount greater than 0.')
    }

    const ref = String(referenceId || '').trim() || `UTR-${Date.now()}`
    const profile = await payoutProfilesRepo.getByCreator(creatorId)

    // Create a transfer record
    const transfer = await transfersRepo.create({
      creatorId,
      amount: numAmount,
      currency: 'INR',
      razorpayTransferId: ref,
      status: 'PROCESSED',
      notes: notes || 'Manual transfer processed by admin',
      createdAt: new Date().toISOString(),
      processedAt: new Date().toISOString(),
    })

    // Log in audit logs
    await payoutAuditRepo.logEvent({
      creatorId,
      event: 'ADMIN_MANUAL_PAYOUT_PROCESSED',
      metadata: {
        amount: numAmount,
        referenceId: ref,
        notes: notes || '',
        payoutMethod: profile?.businessType || profile?.provider || 'MANUAL',
        timestamp: new Date().toISOString(),
      }
    })

    // Notify creator via email
    try {
      const creatorUser = await usersRepo.findById(creatorId).catch(() => null)
      if (creatorUser?.email) {
        await emailService.sendPayoutStatusEmail({
          to: creatorUser.email,
          creatorName: profile?.accountHolderName || profile?.name || 'Creator',
          status: 'PROCESSED',
          amount: numAmount,
          currency: 'INR',
          payoutId: ref,
          note: notes || 'Manual transfer processed by admin',
        })
      }
    } catch (e) { console.error('[EmailService] Payout status email error:', e?.message || e) }

    return {
      success: true,
      transfer,
      message: `Successfully recorded payout of ₹${numAmount.toLocaleString('en-IN')} with reference ${ref}.`,
    }
  },

  async getDashboard(creatorId) {
    const summary = await earningsLedgerRepo.getSummary(creatorId)
    const status = await this.getStatus(creatorId)
    const ledger = await earningsLedgerRepo.listByCreator(creatorId, { limit: 20 })
    const transfers = await transfersRepo.listByCreator(creatorId)

    const ledgerList = Array.isArray(ledger) ? ledger : (ledger.items || [])

    return {
      overview: {
        totalSales: summary.totalSales,
        creatorEarnings: summary.netCreatorEarnings,
        pendingEarnings: summary.pendingEarnings,
        availableEarnings: summary.availableEarnings,
        paidOut: summary.paidOut,
        refunds: summary.totalRefunds,
        totalPlatformFees: summary.totalPlatformFees || 0,
      },
      status,
      ledger: ledgerList,
      recentTransactions: ledgerList.map((item) => ({
        id: item.id,
        orderId: item.orderId,
        productId: item.productId,
        productTitle: item.productTitle,
        customerEmail: item.customerEmail,
        type: item.type,
        amount: item.grossAmount,
        currency: item.currency || 'INR',
        platformFee: item.platformFee,
        creatorEarnings: item.netAmount,
        status: item.type === 'REFUND' ? 'REFUNDED' : 'PAID',
        payoutStatus: item.status,
        date: item.createdAt,
      })),
      payoutHistory: transfers.map((t) => ({
        id: t.id,
        amount: t.amount,
        currency: t.currency || 'INR',
        status: t.status,
        transferId: t.razorpayTransferId,
        date: t.processedAt || t.createdAt,
      })),
    }
  },

  async createRefund(creatorId, { orderId, amount, reason }) {
    const order = await ordersRepo.getById(orderId)
    if (!order || order.creatorId !== creatorId) throw httpError(404, 'Order not found')
    if (order.status !== 'PAID') throw httpError(400, 'Only paid orders can be refunded')

    let refundId = `rfnd_${orderId}`
    if (order.dodoPaymentId || order.paymentProvider === 'dodo') {
      const dodoRes = await dodoProvider.createRefund({
        paymentId: order.dodoPaymentId,
        amount: amount || order.amount,
        reason,
      })
      refundId = dodoRes?.refund_id || dodoRes?.id || refundId
    } else if (order.razorpayPaymentId) {
      const provider = getPaymentProvider()
      const refundRes = await provider.createRefund(order.razorpayPaymentId, amount || order.amount)
      refundId = refundRes.id || refundId
    }

    await ordersRepo.markRefunded(orderId)
    await entitlementsRepo.revokeForOrder(orderId)
    await earningsService.recordRefund({ order, amount: amount || order.amount, reason })

    const refundDoc = await refundsRepo.create({
      id: uuidv4(),
      orderId,
      creatorId,
      razorpayRefundId: refundId,
      amount: amount || order.amount,
      status: 'PROCESSED',
      reason: reason || 'Customer request',
      createdAt: new Date(),
      processedAt: new Date(),
    })

    return { success: true, refund: refundDoc }
  },

  async getAdminPaymentsOverview() {
    const { supabaseAdmin } = require('./supabase')
    const { data: ordersData } = await supabaseAdmin.from('orders').select('*').eq('status', 'PAID')
    const { data: transfersData } = await supabaseAdmin.from('transfers').select('*')
    const { data: refundsData } = await supabaseAdmin.from('refunds').select('*')
    const orders = ordersData || []
    const transfers = transfersData || []
    const refunds = refundsData || []

    const totalGmv = orders.reduce((sum, o) => sum + Number(o.amount || 0), 0)
    const platformCommissionPercent = 0 // Configurable platform commission
    const platformRevenue = Math.round(totalGmv * (platformCommissionPercent / 100))
    const creatorPayouts = transfers.filter(t => t.status === 'PROCESSED').reduce((sum, t) => sum + Number(t.amount || 0), 0)
    const totalRefunds = refunds.reduce((sum, r) => sum + Number(r.amount || 0), 0)

    return {
      stats: {
        totalGmv,
        platformCommissionPercent,
        platformRevenue,
        creatorPayouts,
        totalRefunds,
        totalOrdersCount: orders.length,
        totalTransfersCount: transfers.length,
      },
      transfers: transfers.slice(0, 20).map(t => ({
        id: t.id,
        creatorId: t.creatorId,
        orderId: t.orderId,
        amount: t.amount,
        status: t.status,
        transferId: t.razorpayTransferId,
        date: t.processedAt || t.createdAt,
      })),
    }
  },
}

// ---------------- Earnings Ledger Service ----------------
export const earningsService = {
  async recordSale({ order, product }) {
    const gross = Number(order.amount || 0)
    const feePct = Number(process.env.PLATFORM_FEE_PERCENTAGE || 0)
    const platformFee = feePct > 0 ? Math.round(gross * (feePct / 100) * 100) / 100 : 0
    const processingFee = 0
    const netAmount = gross - platformFee - processingFee

    return earningsLedgerRepo.createEntry({
      id: uuidv4(),
      creatorId: order.creatorId,
      orderId: order.id,
      productId: order.productId,
      productTitle: product?.title || 'Product Sale',
      customerEmail: order.customerEmail || '',
      type: 'SALE',
      grossAmount: gross,
      platformFee,
      processingFee,
      netAmount,
      status: 'AVAILABLE',
      currency: order.currency || 'INR',
      paymentMode: order.paymentMode || 'TEST',
    })
  },

  async recordRefund({ order, amount, reason }) {
    const refAmt = Number(amount || order.amount || 0)
    return earningsLedgerRepo.createEntry({
      id: uuidv4(),
      creatorId: order.creatorId,
      orderId: order.id,
      productId: order.productId,
      productTitle: `Refund: Order #${order.id.slice(0, 8)}`,
      customerEmail: order.customerEmail || '',
      type: 'REFUND',
      grossAmount: refAmt,
      refundAmount: refAmt,
      netAmount: -refAmt,
      status: 'AVAILABLE',
      currency: order.currency || 'INR',
      paymentMode: order.paymentMode || 'TEST',
    })
  },

  async getSummary(creatorId) {
    return earningsLedgerRepo.getSummary(creatorId)
  },

  async getLedger(creatorId, options = {}) {
    return earningsLedgerRepo.listByCreator(creatorId, options)
  },
}

// Backward compatible alias
export const razorpayAccountService = {
  getStatus: (creatorId) => payoutService.getStatus(creatorId),
  connectAccount: (creatorId) => payoutService.onboard(creatorId, { legalName: 'Creator Account', accountNumber: '000000004521', ifscCode: 'SBIN000123' }),
}

// ---------------- Video Provider Abstraction ----------------
export class VideoProvider {
  static getProvider(videoUrl) {
    if (!videoUrl || typeof videoUrl !== 'string') return 'DIRECT'
    const u = videoUrl.toLowerCase()
    if (u.includes('youtube.com') || u.includes('youtu.be')) return 'YOUTUBE'
    if (u.includes('vimeo.com')) return 'VIMEO'
    return 'DIRECT'
  }

  static getPlaybackUrl(videoUrl) {
    if (!videoUrl || typeof videoUrl !== 'string') return ''
    const url = videoUrl.trim()
    const provider = this.getProvider(url)

    if (provider === 'YOUTUBE') {
      const match = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/)
      if (match && match[1]) {
        return `https://www.youtube.com/embed/${match[1]}`
      }
    } else if (provider === 'VIMEO') {
      const match = url.match(/vimeo\.com\/(?:channels\/(?:\w+\/)?|groups\/([^\/]*)\/videos\/|album\/(\d+)\/video\/|)(\d+)/)
      if (match && match[3]) {
        return `https://player.vimeo.com/video/${match[3]}`
      }
    }
    return sanitizeUrl(url)
  }
}

export function validateExternalUrl(url) {
  if (!url) return ''
  const trimmed = String(url).trim()
  if (!trimmed) return ''
  if (/^(javascript:|data:|vbscript:)/i.test(trimmed)) {
    throw httpError(400, 'Unsafe URL protocol not allowed')
  }
  if (trimmed.startsWith('/')) {
    return trimmed
  }
  if (!/^https?:\/\//i.test(trimmed)) {
    throw httpError(400, 'Only https:// or http:// URLs are allowed')
  }
  return sanitizeUrl(trimmed)
}

// ---------------- Course Service (Creator) ----------------
export const courseService = {
  async list(creatorId, options = {}) {
    return coursesRepo.list(creatorId, options)
  },
  async get(creatorId, id) {
    const course = await coursesRepo.getForCreator(id, creatorId)
    if (!course) throw httpError(404, 'Course not found')
    const modules = await modulesRepo.listByCourse(course.id)
    const lessons = await lessonsRepo.listByCourse(course.id)
    const product = await productsRepo.getForCreator(course.productId, creatorId)
    return { course, modules, lessons, product }
  },
  async create(creatorId, data) {
    await creatorSubscriptionService.assertActiveEntitlement(creatorId, 'courses')
    const title = sanitizeText(data.title || 'Untitled Course').slice(0, 120)
    let slug = slugify(data.slug || title)
    let n = 1
    while (await coursesRepo.getBySlug(creatorId, slug)) { slug = `${slugify(title)}-${n++}` }

    const product = await productService.create(creatorId, {
      type: 'COURSE',
      title,
      slug,
      shortDescription: sanitizeText(data.shortDescription || ''),
      description: sanitizeHtml(data.description || ''),
      thumbnail: sanitizeUrl(data.thumbnail || ''),
      price: data.price || 0,
      currency: data.currency || 'usd',
    })

    const course = {
      id: uuidv4(),
      creatorId,
      productId: product.id,
      title,
      slug,
      description: sanitizeHtml(data.description || ''),
      shortDescription: sanitizeText(data.shortDescription || ''),
      thumbnail: sanitizeUrl(data.thumbnail || ''),
      instructor: sanitizeText(data.instructor || ''),
      difficulty: sanitizeText(data.difficulty || 'Beginner'),
      duration: sanitizeText(data.duration || ''),
      status: 'DRAFT',
      publishedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    const createdCourse = await coursesRepo.create(course)

    const defaultMod = await modulesRepo.create({
      id: uuidv4(),
      creatorId,
      courseId: createdCourse.id,
      title: 'Module 1: Introduction',
      description: '',
      position: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    return { course: createdCourse, product, defaultModule: defaultMod }
  },

  async update(creatorId, id, data) {
    const existing = await coursesRepo.getForCreator(id, creatorId)
    if (!existing) throw httpError(404, 'Course not found')
    const patch = {}
    if (data.title !== undefined) patch.title = sanitizeText(data.title).slice(0, 120)
    if (data.shortDescription !== undefined) patch.shortDescription = sanitizeText(data.shortDescription)
    if (data.description !== undefined) patch.description = sanitizeHtml(data.description)
    if (data.thumbnail !== undefined) patch.thumbnail = sanitizeUrl(data.thumbnail)
    if (data.instructor !== undefined) patch.instructor = sanitizeText(data.instructor)
    if (data.difficulty !== undefined) patch.difficulty = sanitizeText(data.difficulty)
    if (data.duration !== undefined) patch.duration = sanitizeText(data.duration)

    const updated = await coursesRepo.update(id, creatorId, patch)
    if (existing.productId) {
      await productService.update(creatorId, existing.productId, {
        title: patch.title,
        shortDescription: patch.shortDescription,
        thumbnail: patch.thumbnail,
        price: data.price !== undefined ? data.price : undefined,
        currency: data.currency !== undefined ? data.currency : undefined,
      })
    }
    return updated
  },

  async publish(creatorId, id) {
    const course = await coursesRepo.getForCreator(id, creatorId)
    if (!course) throw httpError(404, 'Course not found')
    if (!course.title || !course.title.trim()) throw httpError(400, 'Course title is required before publishing')
    const lessons = await lessonsRepo.listByCourse(id)
    if (!lessons.length) throw httpError(400, 'Add at least one lesson before publishing')
    const product = await productsRepo.getForCreator(course.productId, creatorId)
    if (!product || Number(product.price) < 0) throw httpError(400, 'Course must have a valid price (>= 0)')

    const updated = await coursesRepo.update(id, creatorId, { status: 'PUBLISHED', publishedAt: new Date() })
    if (course.productId) await productService.publish(creatorId, course.productId)
    return updated
  },

  async archive(creatorId, id) {
    const course = await coursesRepo.getForCreator(id, creatorId)
    if (!course) throw httpError(404, 'Course not found')
    const updated = await coursesRepo.update(id, creatorId, { status: 'ARCHIVED' })
    if (course.productId) await productService.archive(creatorId, course.productId)
    return updated
  },

  async remove(creatorId, id) {
    const course = await coursesRepo.getForCreator(id, creatorId)
    if (!course) throw httpError(404, 'Course not found')
    await coursesRepo.remove(id, creatorId)
    if (course.productId) await productService.remove(creatorId, course.productId)
    return { ok: true }
  },

  // Modules
  async addModule(creatorId, courseId, data) {
    await coursesRepo.getForCreator(courseId, creatorId)
    const existing = await modulesRepo.listByCourse(courseId)
    const mod = {
      id: uuidv4(),
      creatorId,
      courseId,
      title: sanitizeText(data.title || 'New Module'),
      description: sanitizeText(data.description || ''),
      position: existing.length + 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    return modulesRepo.create(mod)
  },
  async updateModule(creatorId, id, data) {
    await modulesRepo.getForCreator(id, creatorId)
    const patch = {}
    if (data.title !== undefined) patch.title = sanitizeText(data.title)
    if (data.description !== undefined) patch.description = sanitizeText(data.description)
    return modulesRepo.update(id, creatorId, patch)
  },
  async deleteModule(creatorId, id) {
    const mod = await modulesRepo.getForCreator(id, creatorId)
    if (!mod) throw httpError(404, 'Module not found')
    await modulesRepo.remove(id, creatorId)
    return { ok: true }
  },
  async reorderModules(creatorId, courseId, moduleIds) {
    await coursesRepo.getForCreator(courseId, creatorId)
    return modulesRepo.updatePositions(courseId, creatorId, moduleIds)
  },

  // Lessons
  async addLesson(creatorId, moduleId, data) {
    const mod = await modulesRepo.getForCreator(moduleId, creatorId)
    if (!mod) throw httpError(404, 'Module not found')
    const existing = await lessonsRepo.listByModule(moduleId)

    let type = ['VIDEO', 'TEXT', 'PDF', 'LINK', 'EXTERNAL_RESOURCE'].includes(data.contentType) ? data.contentType : 'VIDEO'
    if (type === 'LINK') type = 'EXTERNAL_RESOURCE'

    let videoUrl = data.videoUrl ? sanitizeUrl(data.videoUrl) : ''
    let resourceUrl = data.resourceUrl ? validateExternalUrl(data.resourceUrl) : ''

    const lesson = {
      id: uuidv4(),
      creatorId,
      courseId: mod.courseId,
      moduleId,
      title: sanitizeText(data.title || 'New Lesson'),
      description: sanitizeText(data.description || ''),
      contentType: type,
      content: sanitizeHtml(data.content || ''),
      videoUrl,
      videoProvider: VideoProvider.getProvider(videoUrl),
      resourceUrl,
      pdfFileId: data.pdfFileId || null,
      pdfFileName: data.pdfFileName || null,
      pdfFileSize: data.pdfFileSize || null,
      duration: sanitizeText(data.duration || ''),
      position: existing.length + 1,
      isPreview: !!data.isPreview,
      status: 'PUBLISHED',
      dripType: ['IMMEDIATE', 'DAYS_AFTER_PURCHASE', 'SPECIFIC_DATE'].includes(data.dripType) ? data.dripType : 'IMMEDIATE',
      dripDays: Number(data.dripDays || 0),
      dripDate: data.dripDate ? new Date(data.dripDate) : null,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    return lessonsRepo.create(lesson)
  },
  async updateLesson(creatorId, id, data) {
    const existing = await lessonsRepo.getForCreator(id, creatorId)
    if (!existing) throw httpError(404, 'Lesson not found')
    const patch = {}
    if (data.title !== undefined) patch.title = sanitizeText(data.title)
    if (data.description !== undefined) patch.description = sanitizeText(data.description)
    if (data.contentType !== undefined) {
      let type = data.contentType
      if (type === 'LINK') type = 'EXTERNAL_RESOURCE'
      patch.contentType = type
    }
    if (data.content !== undefined) patch.content = sanitizeHtml(data.content)
    if (data.videoUrl !== undefined) {
      patch.videoUrl = sanitizeUrl(data.videoUrl)
      patch.videoProvider = VideoProvider.getProvider(data.videoUrl)
    }
    if (data.resourceUrl !== undefined) patch.resourceUrl = validateExternalUrl(data.resourceUrl)
    if (data.pdfFileId !== undefined) patch.pdfFileId = data.pdfFileId
    if (data.pdfFileName !== undefined) patch.pdfFileName = data.pdfFileName
    if (data.pdfFileSize !== undefined) patch.pdfFileSize = data.pdfFileSize
    if (data.duration !== undefined) patch.duration = sanitizeText(data.duration)
    if (data.isPreview !== undefined) patch.isPreview = !!data.isPreview
    if (data.status !== undefined) patch.status = data.status
    if (data.dripType !== undefined) patch.dripType = data.dripType
    if (data.dripDays !== undefined) patch.dripDays = Number(data.dripDays)
    if (data.dripDate !== undefined) patch.dripDate = data.dripDate ? new Date(data.dripDate) : null
    return lessonsRepo.update(id, creatorId, patch)
  },
  async attachLessonPdf(creatorId, id, { fileId, fileName, fileSize, fileMime }) {
    const lesson = await lessonsRepo.getForCreator(id, creatorId)
    if (!lesson) throw httpError(404, 'Lesson not found')
    return lessonsRepo.update(id, creatorId, {
      contentType: 'PDF',
      pdfFileId: fileId,
      pdfFileName: fileName,
      pdfFileSize: fileSize,
      pdfFileMime: fileMime || 'application/pdf',
      resourceUrl: `/api/learning/courses/${lesson.courseId}/lessons/${id}/pdf`,
    })
  },
  async deleteLesson(creatorId, id) {
    const lesson = await lessonsRepo.getForCreator(id, creatorId)
    if (!lesson) throw httpError(404, 'Lesson not found')
    await lessonsRepo.remove(id, creatorId)
    return { ok: true }
  },
  async reorderLessons(creatorId, moduleId, lessonIds) {
    const mod = await modulesRepo.getForCreator(moduleId, creatorId)
    if (!mod) throw httpError(404, 'Module not found')
    return lessonsRepo.updatePositions(moduleId, creatorId, lessonIds)
  },
  async getStudents(creatorId, courseId) {
    const course = await coursesRepo.getForCreator(courseId, creatorId)
    if (!course) throw httpError(404, 'Course not found')
    const orders = await ordersRepo.list(creatorId)
    const paidOrders = orders.filter((o) => o.productId === course.productId && o.status === 'PAID')
    const customers = await customersRepo.list(creatorId)
    const lessons = await lessonsRepo.listByCourse(courseId)
    const publishedLessons = lessons.filter((l) => l.status === 'PUBLISHED')

    const studentList = []
    for (const order of paidOrders) {
      const cust = customers.find((c) => c.id === order.customerId || c.email === order.customerEmail)
      if (cust) {
        const progressList = await courseProgressRepo.listByCourse(cust.id, courseId)
        const completedCount = progressList.filter((p) => p.completed).length
        const total = publishedLessons.length
        const progressPct = total > 0 ? Math.round((completedCount / total) * 100) : 0
        studentList.push({
          id: cust.id,
          name: cust.name || cust.email.split('@')[0],
          email: cust.email,
          purchasedAt: order.paidAt || order.createdAt,
          amountPaid: order.amount,
          currency: order.currency,
          completedLessons: completedCount,
          totalLessons: total,
          progressPercentage: progressPct,
          isCompleted: total > 0 && completedCount >= total,
        })
      }
    }
    return studentList
  },
  async getAnalytics(creatorId, courseId) {
    const course = await coursesRepo.getForCreator(courseId, creatorId)
    if (!course) throw httpError(404, 'Course not found')
    const students = await this.getStudents(creatorId, courseId)
    const totalSales = students.length
    const revenue = students.reduce((acc, s) => acc + Number(s.amountPaid || 0), 0)
    const completedCount = students.filter((s) => s.isCompleted).length
    const completionRate = totalSales > 0 ? Math.round((completedCount / totalSales) * 100) : 0
    const avgProgress = totalSales > 0 ? Math.round(students.reduce((acc, s) => acc + s.progressPercentage, 0) / totalSales) : 0
    return {
      courseId,
      totalSales,
      revenue,
      totalStudents: totalSales,
      completionRate,
      averageProgress: avgProgress,
    }
  },
}

// ---------------- Public Course Service ----------------
export const publicCourseService = {
  async getCourseBySlug(username, slug) {
    const store = await storesRepo.getByUsername(username)
    if (!store || !store.published) return null
    const course = await coursesRepo.getBySlug(store.creatorId, slug)
    if (!course || course.status !== 'PUBLISHED') return null
    const product = await productsRepo.getById(course.productId)
    const profile = await profilesRepo.getByCreator(store.creatorId)
    const modules = await modulesRepo.listByCourse(course.id)
    const lessons = await lessonsRepo.listByCourse(course.id)

    const publicModules = modules.map((m) => {
      const modLessons = lessons.filter((l) => l.moduleId === m.id && l.status === 'PUBLISHED').map((l) => ({
        id: l.id,
        title: l.title,
        duration: l.duration,
        isPreview: l.isPreview,
        contentType: l.contentType,
      }))
      return { id: m.id, title: m.title, description: m.description, lessons: modLessons }
    })

    return {
      course: {
        id: course.id,
        productId: course.productId,
        title: course.title,
        slug: course.slug,
        description: course.description,
        shortDescription: course.shortDescription,
        thumbnail: course.thumbnail,
        instructor: course.instructor,
        difficulty: course.difficulty,
        duration: course.duration,
        totalModules: modules.length,
        totalLessons: lessons.filter((l) => l.status === 'PUBLISHED').length,
      },
      product: product ? { id: product.id, price: product.price, currency: product.currency } : null,
      creator: profile ? { name: profile.name, avatarUrl: profile.avatarUrl, username: store.username } : { username: store.username },
      curriculum: publicModules,
    }
  },
}

// ---------------- Learning Service ----------------
export const learningService = {
  async verifyCourseAccess(userOrCustomerEmail, courseId) {
    const course = await coursesRepo.getById(courseId)
    if (!course) throw httpError(404, 'Course not found')
    const product = await productsRepo.getById(course.productId)
    if (!product) throw httpError(404, 'Linked product not found')

    if (Number(product.price) === 0) return { course, product, hasAccess: true, customerId: userOrCustomerEmail }

    // 1. Check if user is the creator of the course
    const creatorUser = await usersRepo.getById(course.creatorId)
    if (creatorUser && creatorUser.email.toLowerCase() === String(userOrCustomerEmail).toLowerCase()) {
      return { course, product, customerId: course.creatorId, hasAccess: true }
    }

    // 2. Check if customer exists in tenant database
    let cust = (await customersRepo.list(course.creatorId)).find((c) => c.email.toLowerCase() === String(userOrCustomerEmail).toLowerCase())

    // 3. Fallback: check if paid order exists for this email & product, and auto-grant entitlement if needed
    if (!cust) {
      const orders = await ordersRepo.list(course.creatorId)
      const paidOrder = orders.find(
        (o) => o.customerEmail && o.customerEmail.toLowerCase() === String(userOrCustomerEmail).toLowerCase() && o.productId === course.productId && o.status === 'PAID'
      )
      if (paidOrder) {
        cust = await customersRepo.upsert(course.creatorId, userOrCustomerEmail, '')
        await entitlementsRepo.createForOrder({
          id: uuidv4(), customerId: cust.id, creatorId: course.creatorId,
          productId: course.productId, orderId: paidOrder.id, source: 'PURCHASE', status: 'ACTIVE',
          startsAt: new Date(), expiresAt: null, createdAt: new Date(),
        })
      }
    }

    if (!cust) return { course, product, hasAccess: false }

    const hasEnt = await entitlementsRepo.has(cust.id, course.productId)
    return { course, product, customerId: cust.id, hasAccess: hasEnt || Number(product.price) === 0 }
  },

  async getCoursePlayer(userEmail, courseId) {
    const { course, product, customerId, hasAccess } = await this.verifyCourseAccess(userEmail, courseId)
    if (!hasAccess) throw httpError(403, 'Course access required. Please purchase this course.')

    const modules = await modulesRepo.listByCourse(courseId)
    const lessons = await lessonsRepo.listByCourse(courseId)
    const progressList = await courseProgressRepo.listByCourse(customerId, courseId)

    const completedLessonIds = new Set(progressList.filter((p) => p.completed).map((p) => p.lessonId))

    let entitlementStartDate = new Date()
    const ent = await entitlementsRepo.getByOrder(courseId)
    if (ent?.startsAt) entitlementStartDate = new Date(ent.startsAt)

    const now = new Date()

    const playerModules = modules.map((m) => {
      const modLessons = lessons.filter((l) => l.moduleId === m.id && l.status === 'PUBLISHED').map((l) => {
        let isLocked = false
        if (l.dripType === 'DAYS_AFTER_PURCHASE' && l.dripDays > 0) {
          const unlockDate = new Date(entitlementStartDate.getTime() + l.dripDays * 24 * 60 * 60 * 1000)
          if (now < unlockDate) isLocked = true
        } else if (l.dripType === 'SPECIFIC_DATE' && l.dripDate) {
          if (now < new Date(l.dripDate)) isLocked = true
        }

        return {
          id: l.id,
          title: l.title,
          description: l.description,
          contentType: l.contentType,
          duration: l.duration,
          isPreview: l.isPreview,
          completed: completedLessonIds.has(l.id),
          isLocked,
        }
      })
      return { id: m.id, title: m.title, lessons: modLessons }
    })

    const publishedLessons = lessons.filter((l) => l.status === 'PUBLISHED')
    const percentComplete = publishedLessons.length > 0 ? Math.round((completedLessonIds.size / publishedLessons.length) * 100) : 0

    return {
      course: { id: course.id, title: course.title, thumbnail: course.thumbnail },
      curriculum: playerModules,
      progress: {
        percentComplete,
        completedCount: completedLessonIds.size,
        totalCount: publishedLessons.length,
        isCompleted: percentComplete === 100,
      },
    }
  },

  async getLesson(userEmail, courseId, lessonId) {
    const { course, hasAccess } = await this.verifyCourseAccess(userEmail, courseId)
    const lesson = await lessonsRepo.getById(lessonId)
    if (!lesson || lesson.courseId !== courseId) throw httpError(404, 'Lesson not found')

    if (!hasAccess && !lesson.isPreview) {
      throw httpError(403, 'Course access required to view this lesson')
    }

    return {
      lesson: {
        id: lesson.id,
        courseId: lesson.courseId,
        moduleId: lesson.moduleId,
        title: lesson.title,
        description: lesson.description,
        contentType: lesson.contentType,
        content: lesson.content,
        videoUrl: VideoProvider.getPlaybackUrl(lesson.videoUrl),
        videoProvider: lesson.videoProvider || VideoProvider.getProvider(lesson.videoUrl),
        resourceUrl: lesson.resourceUrl,
        pdfFileId: lesson.pdfFileId,
        pdfFileName: lesson.pdfFileName,
        pdfFileSize: lesson.pdfFileSize,
        duration: lesson.duration,
        isPreview: lesson.isPreview,
      },
    }
  },

  async trackProgress(userEmail, courseId, lessonId, completed = true, lastPosition = 0) {
    const { course, customerId, hasAccess } = await this.verifyCourseAccess(userEmail, courseId)
    if (!hasAccess) throw httpError(403, 'Course access required')

    const progress = await courseProgressRepo.upsert({
      customerId,
      creatorId: course.creatorId,
      courseId,
      lessonId,
      completed: !!completed,
      lastPosition,
      completedAt: completed ? new Date() : null,
    })

    const lessons = await lessonsRepo.listByCourse(courseId)
    const published = lessons.filter((l) => l.status === 'PUBLISHED')
    const allProgress = await courseProgressRepo.listByCourse(customerId, courseId)
    const completedSet = new Set(allProgress.filter((p) => p.completed).map((p) => p.lessonId))

    let cert = null
    if (published.length > 0 && completedSet.size >= published.length) {
      cert = await certificateService.issueCertificate(customerId, course.creatorId, courseId)
    }

    return { progress, isCourseCompleted: completedSet.size >= published.length, certificate: cert }
  },

  async getStudentCourses(userEmail) {
    const { supabaseAdmin } = require('./supabase')
    const email = String(userEmail).toLowerCase()
    const { data: customers } = await supabaseAdmin.from('customers').select('*').eq('email', email)
    const customerIds = (customers || []).map((c) => c.id)
    if (!customerIds.length) return []

    const { data: ents } = await supabaseAdmin.from('entitlements').select('*').in('customerId', customerIds).eq('status', 'ACTIVE')
    const productIds = (ents || []).map((e) => e.productId)

    const { data: coursesData } = await supabaseAdmin.from('courses').select('*').in('productId', productIds)
    const courses = coursesData || []
    const progressDocs = customerIds.length > 0 ? await courseProgressRepo.getProgress(customerIds[0], courses[0]?.id) : []

    return courses.map((c) => {
      const courseProg = progressDocs.filter((p) => p.courseId === c.id && p.completed)
      return {
        id: c.id,
        title: c.title,
        thumbnail: c.thumbnail,
        description: c.shortDescription,
        completedLessons: courseProg.length,
      }
    })
  },
}

// ---------------- Certificate Service ----------------
export const certificateService = {
  async issueCertificate(customerId, creatorId, courseId) {
    const existing = await certificatesRepo.get(customerId, courseId)
    if (existing) return existing

    const course = await coursesRepo.getById(courseId)
    const profile = await profilesRepo.getByCreator(creatorId)
    const customer = await customersRepo.get(customerId, creatorId)

    const cert = {
      id: uuidv4(),
      certificateId: `CERT-${uuidv4().slice(0, 8).toUpperCase()}`,
      customerId,
      creatorId,
      courseId,
      studentName: customer?.name || customer?.email || 'Student',
      courseTitle: course?.title || 'Course',
      creatorName: profile?.name || 'Instructor',
      completedAt: new Date(),
      createdAt: new Date(),
    }
    return certificatesRepo.create(cert)
  },
  async getCertificate(certificateId) {
    const cert = await certificatesRepo.getById(certificateId)
    if (!cert) throw httpError(404, 'Certificate not found')
    return cert
  },
}



// ---------------- Analytics ----------------
export const analyticsService = {
  async track({ creatorId, productId = null, type, sessionId = null, metadata = {} }) {
    if (!creatorId || !type) return
    await analyticsRepo.track({ id: uuidv4(), creatorId, productId, type, sessionId, metadata, createdAt: new Date() })
  },
  async overview(creatorId, days = 30) {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
    const orders = await ordersRepo.list(creatorId)
    const paid = orders.filter((o) => o.status === 'PAID')
    const revenue = paid.reduce((s, o) => s + Number(o.amount || 0), 0)
    const customers = await customersRepo.list(creatorId)
    const products = await productsRepo.list(creatorId)
    const storeViews = await analyticsRepo.countByType(creatorId, 'store_view', since)
    const productViews = await analyticsRepo.countByType(creatorId, 'product_view', since)
    const checkoutStarted = await analyticsRepo.countByType(creatorId, 'checkout_started', since)
    const conversion = storeViews > 0 ? (paid.length / storeViews) * 100 : 0
    const currency = paid[0]?.currency || products[0]?.currency || 'usd'

    // revenue by day
    const byDay = {}
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000)
      byDay[d.toISOString().slice(0, 10)] = 0
    }
    paid.forEach((o) => {
      const key = new Date(o.paidAt || o.createdAt).toISOString().slice(0, 10)
      if (key in byDay) byDay[key] += Number(o.amount || 0)
    })
    const revenueSeries = Object.entries(byDay).map(([date, value]) => ({ date, value: Math.round(value * 100) / 100 }))

    // top products
    const salesByProduct = {}
    paid.forEach((o) => { salesByProduct[o.productId] = (salesByProduct[o.productId] || 0) + Number(o.amount || 0) })
    const topProducts = products.map((p) => ({ id: p.id, title: p.title, revenue: Math.round((salesByProduct[p.id] || 0) * 100) / 100, thumbnail: p.thumbnail }))
      .sort((a, b) => b.revenue - a.revenue).slice(0, 5)

    const recentOrders = await Promise.all(paid.slice(0, 8).map(async (o) => {
      const p = products.find((x) => x.id === o.productId)
      const c = customers.find((x) => x.id === o.customerId)
      return { id: o.id, amount: o.amount, currency: o.currency, productTitle: p?.title || 'Product', customerEmail: c?.email || '—', createdAt: o.paidAt || o.createdAt }
    }))

    const instagramMetrics = await automationEventsRepo.getMetricsForCreator(creatorId, since)

    return {
      currency,
      revenue: Math.round(revenue * 100) / 100,
      orders: paid.length,
      customers: customers.length,
      storeViews, productViews, checkoutStarted,
      conversion: Math.round(conversion * 10) / 10,
      revenueSeries, topProducts, recentOrders,
      instagram: instagramMetrics,
    }
  },
}

// ---------------- Coaching Service ----------------
export const coachingService = {
  async getConfig(creatorId, productId) {
    let config = await coachingRepo.getConfigByProductId(productId)
    if (!config) {
      config = {
        productId,
        creatorId: creatorId || null,
        durationMinutes: 30,
        timezone: 'Asia/Kolkata',
        sessionType: '1:1 Consultation',
        deliveryMethod: 'GOOGLE_MEET',
        meetingType: 'GOOGLE_MEET',
        meetingUrl: '',
        locationText: '',
        calendarProvider: 'GOOGLE_CALENDAR',
        calendarConnected: true,
        calendarId: 'primary',
        minimumNoticeMinutes: 1440, // 24 hours
        maximumAdvanceDays: 60, // 60 days
        bufferMinutes: 15,
        bufferBeforeMinutes: 0,
        bufferAfterMinutes: 15,
        maxSessionsPerDay: null,
        allowRescheduling: true,
        reschedulingDeadlineNoticeHours: 24,
        allowCancellation: true,
        cancellationPolicyNoticeHours: 24,
        cancellationPolicy: 'Cancellations made less than 24 hours before the session are not eligible for a refund.',
        discountType: null,
        discountValue: 0,
        blockedDates: [],
        blockedTimeRanges: [],
        dateOverrides: [],
        customerFields: {
          phone: { enabled: true, required: false },
          instagram: { enabled: false, required: false },
          message: { enabled: true, required: false },
        },
        availability: [
          { dayOfWeek: 1, dayName: 'Monday', enabled: true, windows: [{ startTime: '09:00', endTime: '11:00' }, { startTime: '14:00', endTime: '17:00' }] },
          { dayOfWeek: 2, dayName: 'Tuesday', enabled: true, windows: [{ startTime: '09:00', endTime: '11:00' }] },
          { dayOfWeek: 3, dayName: 'Wednesday', enabled: false, windows: [{ startTime: '09:00', endTime: '17:00' }] },
          { dayOfWeek: 4, dayName: 'Thursday', enabled: false, windows: [{ startTime: '09:00', endTime: '17:00' }] },
          { dayOfWeek: 5, dayName: 'Friday', enabled: true, windows: [{ startTime: '11:00', endTime: '12:00' }] },
          { dayOfWeek: 6, dayName: 'Saturday', enabled: true, windows: [{ startTime: '11:00', endTime: '12:00' }] },
          { dayOfWeek: 0, dayName: 'Sunday', enabled: true, windows: [{ startTime: '10:00', endTime: '16:00' }] },
        ],
        questions: [
          { id: 'q1', question: 'What would you like help with?', type: 'LONG_TEXT', required: true, order: 1 }
        ]
      }
    }

    // Attach product title, description, price, coverImage if available
    if (productId) {
      try {
        const product = await productsRepo.getById(productId)
        if (product) {
          config.title = product.title || config.title || '1:1 Consultation'
          config.description = product.description || product.shortDescription || config.description || ''
          config.price = Number(product.price || 0)
          config.currency = product.currency || 'INR'
          config.coverImage = product.coverImage || product.thumbnail || ''
          config.thumbnail = product.thumbnail || product.coverImage || ''
          config.status = product.status || 'DRAFT'
          config.creatorId = config.creatorId || product.creatorId
        }
      } catch (e) { }
    }

    return config
  },

  async saveConfig(creatorId, productId, data) {
    const product = await productsRepo.getForCreator(productId, creatorId)
    if (!product) throw httpError(404, 'Product not found')

    const basePrice = Math.max(0, parseFloat(data.price !== undefined ? data.price : (data.basePrice !== undefined ? data.basePrice : product.price || 0)))
    const discountType = data.discountType === 'PERCENTAGE' || data.discountType === 'FIXED' ? data.discountType : null
    let discountVal = Math.max(0, parseFloat(data.discountValue || 0))
    if (discountType === 'PERCENTAGE') {
      discountVal = Math.min(100, discountVal)
    } else if (discountType === 'FIXED') {
      discountVal = Math.min(basePrice, discountVal)
    }

    let finalPrice = basePrice
    if (discountType === 'PERCENTAGE') {
      finalPrice = Math.max(0, Math.round(basePrice * (1 - discountVal / 100)))
    } else if (discountType === 'FIXED') {
      finalPrice = Math.max(0, basePrice - discountVal)
    }

    // Sync updates to Product table
    const productPatch = {}
    if (data.title || data.name) productPatch.title = String(data.title || data.name).trim()
    if (data.description !== undefined) productPatch.description = String(data.description).trim()
    if (data.shortDescription !== undefined) productPatch.shortDescription = String(data.shortDescription).trim()
    if (data.thumbnail || data.coverImage) {
      productPatch.thumbnail = data.thumbnail || data.coverImage
      productPatch.coverImage = data.coverImage || data.thumbnail
    }
    if (data.price !== undefined || data.basePrice !== undefined) {
      productPatch.price = finalPrice
    }
    if (data.status) {
      productPatch.status = data.status
    }
    if (Object.keys(productPatch).length > 0) {
      await productsRepo.update(productId, creatorId, productPatch)
    }

    const patch = {
      durationMinutes: Math.max(1, parseInt(data.durationMinutes || 30, 10)),
      timezone: data.timezone || 'Asia/Kolkata',
      sessionType: data.sessionType || '1:1 Consultation',
      deliveryMethod: data.meetingType || data.deliveryMethod || 'GOOGLE_MEET',
      meetingType: data.meetingType || data.deliveryMethod || 'GOOGLE_MEET',
      meetingUrl: sanitizeUrl(data.meetingUrl || ''),
      locationText: sanitizeText(data.locationText || ''),
      calendarProvider: data.calendarProvider || 'GOOGLE_CALENDAR',
      calendarId: data.calendarId || 'primary',
      minimumNoticeMinutes: parseInt(data.minimumNoticeMinutes !== undefined ? data.minimumNoticeMinutes : 1440, 10),
      maximumAdvanceDays: parseInt(data.maximumAdvanceDays !== undefined ? data.maximumAdvanceDays : 60, 10),
      bufferMinutes: parseInt(data.bufferMinutes !== undefined ? data.bufferMinutes : 15, 10),
      bufferBeforeMinutes: parseInt(data.bufferBeforeMinutes !== undefined ? data.bufferBeforeMinutes : 0, 10),
      bufferAfterMinutes: parseInt(data.bufferAfterMinutes !== undefined ? data.bufferAfterMinutes : 15, 10),
      maxSessionsPerDay: data.maxSessionsPerDay ? parseInt(data.maxSessionsPerDay, 10) : null,
      allowRescheduling: data.allowRescheduling !== false,
      reschedulingDeadlineNoticeHours: parseInt(data.reschedulingDeadlineNoticeHours !== undefined ? data.reschedulingDeadlineNoticeHours : 24, 10),
      allowCancellation: data.allowCancellation !== false,
      cancellationPolicyNoticeHours: parseInt(data.cancellationPolicyNoticeHours !== undefined ? data.cancellationPolicyNoticeHours : 24, 10),
      cancellationPolicy: sanitizeText(data.cancellationPolicy || ''),
      discountType: discountType,
      discountValue: discountVal,
      blockedDates: Array.isArray(data.blockedDates) ? data.blockedDates : [],
      blockedTimeRanges: Array.isArray(data.blockedTimeRanges) ? data.blockedTimeRanges : [],
      dateOverrides: Array.isArray(data.dateOverrides) ? data.dateOverrides : [],
      availability: Array.isArray(data.availability) ? data.availability : [],
      questions: Array.isArray(data.questions) ? data.questions : [],
      customerFields: data.customerFields || { phone: { enabled: true, required: false }, message: { enabled: true, required: false } },
    }

    const savedConfig = await coachingRepo.upsertConfig(creatorId, productId, patch)
    return {
      ...savedConfig,
      title: productPatch.title || product.title,
      description: productPatch.description !== undefined ? productPatch.description : product.description,
      price: productPatch.price !== undefined ? productPatch.price : product.price,
      status: productPatch.status || product.status,
      thumbnail: productPatch.thumbnail || product.thumbnail,
      coverImage: productPatch.coverImage || product.coverImage
    }
  },

  async getAvailableSlots({ productId, date, timezone }) {
    const product = await productsRepo.getById(productId)
    if (!product || product.status !== 'PUBLISHED') return { slots: [], timezone: 'UTC' }

    const config = await this.getConfig(product.creatorId, productId)
    if (!config) {
      return { slots: [], timezone: 'UTC' }
    }

    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      throw httpError(400, 'Invalid date format (expected YYYY-MM-DD)')
    }

    // Check blocked dates
    if (Array.isArray(config.blockedDates) && config.blockedDates.includes(date)) {
      return { slots: [], timezone: config.timezone, date }
    }

    const duration = config.durationMinutes || 30
    const bufferBefore = parseInt(config.bufferBeforeMinutes || 0, 10)
    const bufferAfter = parseInt(config.bufferAfterMinutes !== undefined ? config.bufferAfterMinutes : (config.bufferMinutes || 15), 10)
    const totalBuffer = bufferBefore + bufferAfter
    const minNotice = config.minimumNoticeMinutes !== undefined ? config.minimumNoticeMinutes : 1440
    const maxAdvanceDays = config.maximumAdvanceDays || 60
    const maxPerDay = config.maxSessionsPerDay

    if (maxPerDay) {
      const count = await coachingRepo.countBookingsOnDate(product.creatorId, date, config.timezone)
      if (count >= maxPerDay) return { slots: [], timezone: config.timezone, date }
    }

    // Determine time windows for date (Date Overrides take precedence)
    const timeWindows = []
    const dateOverride = (config.dateOverrides || []).find((o) => o.date === date)

    if (dateOverride) {
      if (!dateOverride.enabled) {
        return { slots: [], timezone: config.timezone, date }
      }
      if (Array.isArray(dateOverride.windows)) {
        timeWindows.push(...dateOverride.windows.filter((w) => w.startTime && w.endTime))
      }
    } else {
      const dateObj = new Date(date + 'T00:00:00.000Z')
      const dayOfWeek = dateObj.getUTCDay() // 0 = Sun, 1 = Mon, ..., 6 = Sat
      for (const a of (config.availability || [])) {
        if (a.enabled && Number(a.dayOfWeek) === dayOfWeek) {
          if (Array.isArray(a.windows) && a.windows.length > 0) {
            timeWindows.push(...a.windows)
          } else if (a.startTime && a.endTime) {
            timeWindows.push({ startTime: a.startTime, endTime: a.endTime })
          }
        }
      }
    }

    if (timeWindows.length === 0) {
      return { slots: [], timezone: config.timezone, date }
    }

    const rangeStart = new Date(date + 'T00:00:00.000Z')
    rangeStart.setHours(rangeStart.getHours() - 24)
    const rangeEnd = new Date(date + 'T23:59:59.999Z')
    rangeEnd.setHours(rangeEnd.getHours() + 24)

    const existingBookings = await coachingRepo.listBookingsForCreator(product.creatorId, {
      fromDate: rangeStart.toISOString(),
      toDate: rangeEnd.toISOString(),
      status: ['CONFIRMED', 'PENDING', 'RESCHEDULED'],
    })

    const nowMs = Date.now()
    const minNoticeMs = minNotice * 60 * 1000
    const maxAdvanceMs = maxAdvanceDays * 24 * 60 * 60 * 1000

    const slots = []

    for (const win of timeWindows) {
      if (!win.startTime || !win.endTime) continue
      const [startH, startM] = win.startTime.split(':').map(Number)
      const [endH, endM] = win.endTime.split(':').map(Number)

      const winStartMin = startH * 60 + startM
      const winEndMin = endH * 60 + endM

      let currentMin = winStartMin
      while (currentMin + duration <= winEndMin) {
        const slotStartH = Math.floor(currentMin / 60)
        const slotStartM = currentMin % 60
        const slotEndMinTotal = currentMin + duration
        const slotEndH = Math.floor(slotEndMinTotal / 60)
        const slotEndM = slotEndMinTotal % 60

        // Check blocked time ranges
        const isBlockedByTimeRange = (config.blockedTimeRanges || []).some(b => {
          if (b.date && b.date !== date) return false
          const [bStartH, bStartM] = b.startTime.split(':').map(Number)
          const [bEndH, bEndM] = b.endTime.split(':').map(Number)
          const bStartMin = bStartH * 60 + bStartM
          const bEndMin = bEndH * 60 + bEndM
          return currentMin < bEndMin && slotEndMinTotal > bStartMin
        })

        if (!isBlockedByTimeRange) {
          const slotStartIso = `${date}T${String(slotStartH).padStart(2, '0')}:${String(slotStartM).padStart(2, '0')}:00.000Z`
          const slotEndIso = `${date}T${String(slotEndH).padStart(2, '0')}:${String(slotEndM).padStart(2, '0')}:00.000Z`

          const startMs = new Date(slotStartIso).getTime()
          const endMs = new Date(slotEndIso).getTime()

          if (startMs >= nowMs + minNoticeMs && startMs <= nowMs + maxAdvanceMs) {
            const isOverlapping = existingBookings.some(b => {
              const bStart = new Date(b.startTime).getTime() - (bufferBefore * 60 * 1000)
              const bEnd = new Date(b.endTime).getTime() + (bufferAfter * 60 * 1000)
              return startMs < bEnd && endMs > bStart
            })

            if (!isOverlapping) {
              const format12h = (h, m) => {
                const period = h >= 12 ? 'PM' : 'AM'
                const displayH = h % 12 === 0 ? 12 : h % 12
                return `${String(displayH).padStart(2, '0')}:${String(m).padStart(2, '0')} ${period}`
              }
              slots.push({
                startTime: slotStartIso,
                endTime: slotEndIso,
                durationMinutes: duration,
                formattedTime: `${format12h(slotStartH, slotStartM)} - ${format12h(slotEndH, slotEndM)}`,
                displayStart: format12h(slotStartH, slotStartM),
                displayEnd: format12h(slotEndH, slotEndM),
              })
            }
          }
        }

        currentMin += duration + totalBuffer
      }
    }

    return { slots, timezone: config.timezone, date }
  },

  async createBookingHold({ productId, startTime, endTime, customerEmail, customerName, customerPhone, answers }) {
    const product = await productsRepo.getById(productId)
    if (!product || product.status !== 'PUBLISHED') throw httpError(404, 'Product not found or not published')

    if (!customerEmail) throw httpError(400, 'Customer email is required')
    if (!startTime || !endTime) throw httpError(400, 'Session start and end time are required')

    const config = await this.getConfig(product.creatorId, productId)

    const startMs = new Date(startTime).getTime()
    const endMs = new Date(endTime).getTime()
    const nowMs = Date.now()
    const dateStr = new Date(startTime).toISOString().slice(0, 10)

    // Check blocked dates & blocked time ranges
    if (Array.isArray(config.blockedDates) && config.blockedDates.includes(dateStr)) {
      throw httpError(409, 'Selected date is blocked by the creator.')
    }
    const isBlockedRange = (config.blockedTimeRanges || []).some(b => {
      if (b.date && b.date !== dateStr) return false
      const [bStartH, bStartM] = b.startTime.split(':').map(Number)
      const [bEndH, bEndM] = b.endTime.split(':').map(Number)
      const bStartMs = new Date(`${dateStr}T${String(bStartH).padStart(2, '0')}:${String(bStartM).padStart(2, '0')}:00.000Z`).getTime()
      const bEndMs = new Date(`${dateStr}T${String(bEndH).padStart(2, '0')}:${String(bEndM).padStart(2, '0')}:00.000Z`).getTime()
      return startMs < bEndMs && endMs > bStartMs
    })
    if (isBlockedRange) {
      throw httpError(409, 'Selected time slot falls within a blocked time range.')
    }

    if (startMs <= nowMs) throw httpError(400, 'Cannot book a session in the past')
    const minNotice = config.minimumNoticeMinutes !== undefined ? config.minimumNoticeMinutes : 1440
    if (startMs < nowMs + minNotice * 60 * 1000) {
      throw httpError(400, `Minimum notice of ${Math.round(minNotice / 60)} hour(s) is required for booking`)
    }

    const bufferBefore = parseInt(config.bufferBeforeMinutes || 0, 10)
    const bufferAfter = parseInt(config.bufferAfterMinutes !== undefined ? config.bufferAfterMinutes : (config.bufferMinutes || 15), 10)
    const overlapping = await coachingRepo.findOverlappingBookings(
      product.creatorId,
      new Date(startMs - bufferBefore * 60 * 1000).toISOString(),
      new Date(endMs + bufferAfter * 60 * 1000).toISOString()
    )

    if (overlapping.length > 0) {
      throw httpError(409, 'This time slot is no longer available. Please choose another time.')
    }

    // Auto-generate Google Meet URL if GOOGLE_MEET type
    let meetingUrl = config.meetingUrl || ''
    if ((config.meetingType === 'GOOGLE_MEET' || config.deliveryMethod === 'GOOGLE_MEET') && !meetingUrl) {
      const meetCode = `${Math.random().toString(36).substring(2, 5)}-${Math.random().toString(36).substring(2, 6)}-${Math.random().toString(36).substring(2, 5)}`
      meetingUrl = `https://meet.google.com/${meetCode}`
    }

    const isFree = Number(product.price) === 0
    const booking = {
      id: uuidv4(),
      productId: product.id,
      creatorId: product.creatorId,
      orderId: null,
      customerId: null,
      customerEmail: String(customerEmail).toLowerCase(),
      customerName: customerName || '',
      customerPhone: customerPhone || '',
      startTime: new Date(startTime),
      endTime: new Date(endTime),
      timezone: config.timezone || 'Asia/Kolkata',
      status: isFree ? 'CONFIRMED' : 'PENDING',
      paymentStatus: isFree ? 'PAID' : 'PENDING',
      meetingType: config.meetingType || 'GOOGLE_MEET',
      meetingUrl: meetingUrl,
      locationText: config.locationText || '',
      answers: answers || [],
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    return coachingRepo.createBooking(booking)
  },

  async getBooking(bookingId, reqEmail, reqCreatorId) {
    const booking = await coachingRepo.getBookingById(bookingId)
    if (!booking) throw httpError(404, 'Booking not found')

    if (reqCreatorId && booking.creatorId === reqCreatorId) return booking
    if (reqEmail && booking.customerEmail === String(reqEmail).toLowerCase()) return booking

    if (booking.orderId) {
      const order = await ordersRepo.getById(booking.orderId)
      if (order && order.customerEmail === String(reqEmail).toLowerCase()) return booking
    }

    throw httpError(403, 'Access denied to this booking')
  },

  async rescheduleBooking({ bookingId, customerEmail, creatorId, newStartTime, newEndTime }) {
    const booking = await coachingRepo.getBookingById(bookingId)
    if (!booking) throw httpError(404, 'Booking not found')

    if (creatorId && booking.creatorId !== creatorId && customerEmail && booking.customerEmail !== String(customerEmail).toLowerCase()) {
      throw httpError(403, 'Access denied')
    }

    const config = await this.getConfig(booking.creatorId, booking.productId)
    if (!creatorId && !config.allowRescheduling) {
      throw httpError(400, 'Rescheduling is not allowed for this coaching product.')
    }

    const buffer = config.bufferMinutes !== undefined ? config.bufferMinutes : 15
    const overlapping = await coachingRepo.findOverlappingBookings(
      booking.creatorId,
      new Date(new Date(newStartTime).getTime() - buffer * 60 * 1000).toISOString(),
      new Date(new Date(newEndTime).getTime() + buffer * 60 * 1000).toISOString(),
      bookingId
    )

    if (overlapping.length > 0) {
      throw httpError(409, 'The requested new slot is not available. Please pick another time.')
    }

    const patch = {
      startTime: new Date(newStartTime),
      endTime: new Date(newEndTime),
      status: 'CONFIRMED',
      rescheduledFrom: {
        oldStartTime: booking.startTime,
        oldEndTime: booking.endTime,
        rescheduledAt: new Date(),
      },
    }

    const updated = await coachingRepo.updateBooking(bookingId, patch)
    try {
      const profile = await profilesRepo.getByCreator(booking.creatorId).catch(() => null)
      const prod = await productsRepo.getById(booking.productId).catch(() => null)
      if (booking.customerEmail) {
        await emailService.sendBookingRescheduledEmail({
          to: booking.customerEmail,
          customerName: booking.customerName || booking.customerEmail.split('@')[0],
          creatorName: profile?.name || 'Creator',
          productTitle: prod?.title || 'Coaching Session',
          newSessionTime: `${new Date(newStartTime).toUTCString()}`,
          meetingUrl: booking.meetingUrl,
        })
      }
    } catch (e) { console.error('Coaching reschedule email error:', e) }
    return updated
  },

  async cancelBooking({ bookingId, customerEmail, creatorId, reason }) {
    const booking = await coachingRepo.getBookingById(bookingId)
    if (!booking) throw httpError(404, 'Booking not found')

    const isCreator = creatorId && booking.creatorId === creatorId
    const isCustomer = customerEmail && booking.customerEmail === String(customerEmail).toLowerCase()

    if (!isCreator && !isCustomer) throw httpError(403, 'Access denied')

    if (!isCreator) {
      const config = await this.getConfig(booking.creatorId, booking.productId)
      const noticeHours = config.cancellationPolicyNoticeHours || 24
      const startMs = new Date(booking.startTime).getTime()
      if (Date.now() > startMs - noticeHours * 3600 * 1000) {
        throw httpError(400, `Sessions can only be cancelled at least ${noticeHours} hours before the start time.`)
      }
    }

    const updated = await coachingRepo.updateBooking(bookingId, {
      status: 'CANCELLED',
      cancelledAt: new Date(),
      cancellationReason: reason || '',
    })

    try {
      const profile = await profilesRepo.getByCreator(booking.creatorId).catch(() => null)
      const prod = await productsRepo.getById(booking.productId).catch(() => null)
      if (booking.customerEmail) {
        await emailService.sendBookingCancellationEmail({
          to: booking.customerEmail,
          customerName: booking.customerName || booking.customerEmail.split('@')[0],
          creatorName: profile?.name || 'Creator',
          productTitle: prod?.title || 'Coaching Session',
          sessionTime: `${new Date(booking.startTime).toUTCString()}`,
          reason: reason || '',
        })
      }
    } catch (e) { console.error('Coaching cancellation email error:', e) }

    if (booking.orderId) {
      try {
        const order = await ordersRepo.getById(booking.orderId)
        if (order && order.status === 'PAID' && Number(order.amount) > 0) {
          await payoutService.createRefund(booking.creatorId, { orderId: order.id, reason: 'Coaching booking cancelled' }).catch(() => { })
        }
      } catch (e) { console.error('Coaching refund trigger error:', e) }
    }

    return updated
  },

  async listCreatorBookings(creatorId, options = {}) {
    const bookings = await coachingRepo.listBookingsForCreator(creatorId, options)
    const productIds = [...new Set(bookings.map(b => b.productId || b.product_id).filter(Boolean))]
    const productMap = {}
    for (const pid of productIds) {
      try {
        const prod = await productsRepo.getById(pid)
        if (prod) {
          productMap[pid] = {
            id: prod.id,
            title: prod.title || '1:1 Coaching',
            thumbnail: prod.thumbnail || prod.coverImage || '',
            price: Number(prod.price || 0),
            currency: prod.currency || 'INR',
            status: prod.status || 'PUBLISHED',
          }
        }
      } catch (e) { }
    }

    return bookings.map(b => {
      const pid = b.productId || b.product_id
      const prod = productMap[pid] || {}
      return {
        ...b,
        productId: pid,
        productTitle: prod.title || '1:1 Coaching Session',
        product: prod,
      }
    })
  },

  async getCreatorAvailability(creatorId) {
    const profile = await profilesRepo.getByCreator(creatorId).catch(() => null)
    const creatorTz = profile?.timezone || 'Asia/Kolkata'

    const products = await productsRepo.list(creatorId).catch(() => [])
    const coachingProducts = (products || []).filter(p => p.type === 'COACHING')

    let activeConfig = null
    for (const cp of coachingProducts) {
      const cfg = await coachingRepo.getConfigByProductId(cp.id)
      if (cfg) {
        activeConfig = cfg
        break
      }
    }

    if (!activeConfig) {
      activeConfig = await this.getConfig(creatorId, coachingProducts[0]?.id || null)
    }

    return {
      timezone: activeConfig.timezone || creatorTz,
      durationMinutes: activeConfig.durationMinutes || 60,
      bufferMinutes: activeConfig.bufferMinutes !== undefined ? activeConfig.bufferMinutes : 15,
      bufferBeforeMinutes: activeConfig.bufferBeforeMinutes || 0,
      bufferAfterMinutes: activeConfig.bufferAfterMinutes !== undefined ? activeConfig.bufferAfterMinutes : 15,
      minimumNoticeMinutes: activeConfig.minimumNoticeMinutes !== undefined ? activeConfig.minimumNoticeMinutes : 1440,
      maximumAdvanceDays: activeConfig.maximumAdvanceDays || 60,
      availability: activeConfig.availability || [
        { dayOfWeek: 1, dayName: 'Monday', enabled: true, windows: [{ startTime: '09:00', endTime: '17:00' }] },
        { dayOfWeek: 2, dayName: 'Tuesday', enabled: true, windows: [{ startTime: '09:00', endTime: '17:00' }] },
        { dayOfWeek: 3, dayName: 'Wednesday', enabled: true, windows: [{ startTime: '09:00', endTime: '17:00' }] },
        { dayOfWeek: 4, dayName: 'Thursday', enabled: true, windows: [{ startTime: '09:00', endTime: '17:00' }] },
        { dayOfWeek: 5, dayName: 'Friday', enabled: true, windows: [{ startTime: '09:00', endTime: '17:00' }] },
        { dayOfWeek: 6, dayName: 'Saturday', enabled: false, windows: [{ startTime: '10:00', endTime: '14:00' }] },
        { dayOfWeek: 0, dayName: 'Sunday', enabled: false, windows: [{ startTime: '10:00', endTime: '14:00' }] },
      ],
      products: coachingProducts.map(p => ({
        id: p.id,
        title: p.title,
        price: Number(p.price || 0),
        currency: p.currency || 'INR',
        status: p.status,
      }))
    }
  },

  async saveCreatorAvailability(creatorId, data) {
    const products = await productsRepo.list(creatorId).catch(() => [])
    const coachingProducts = (products || []).filter(p => p.type === 'COACHING')

    const patch = {
      timezone: data.timezone || 'Asia/Kolkata',
      bufferMinutes: parseInt(data.bufferMinutes !== undefined ? data.bufferMinutes : 15, 10),
      bufferBeforeMinutes: parseInt(data.bufferBeforeMinutes || 0, 10),
      bufferAfterMinutes: parseInt(data.bufferAfterMinutes !== undefined ? data.bufferAfterMinutes : (data.bufferMinutes || 15), 10),
      minimumNoticeMinutes: parseInt(data.minimumNoticeMinutes !== undefined ? data.minimumNoticeMinutes : 1440, 10),
      maximumAdvanceDays: parseInt(data.maximumAdvanceDays !== undefined ? data.maximumAdvanceDays : 60, 10),
      availability: Array.isArray(data.availability) ? data.availability : [],
    }

    if (data.productId && data.productId !== 'ALL') {
      await coachingRepo.upsertConfig(creatorId, data.productId, patch)
    } else if (coachingProducts.length > 0) {
      for (const cp of coachingProducts) {
        await coachingRepo.upsertConfig(creatorId, cp.id, patch)
      }
    } else {
      // If no coaching products yet, we can store in a general creator config
      await coachingRepo.upsertConfig(creatorId, 'default', patch)
    }

    return this.getCreatorAvailability(creatorId)
  },

  async listStudentBookings(customerEmail, options) {
    return coachingRepo.listBookingsForCustomer(customerEmail, options)
  },
}

// ---------------- Community Service ----------------
export const communityService = {
  async getConfig(creatorId, productId) {
    let config = await communityRepo.getConfigByProductId(productId)
    if (!config) {
      const product = await productsRepo.getById(productId)
      config = {
        productId,
        creatorId,
        name: product?.title || 'Community Group',
        slug: product?.slug || `community-${productId.slice(0, 8)}`,
        shortDescription: product?.shortDescription || '',
        description: product?.description || '',
        category: 'Technology',
        tags: ['#developers', '#startups'],
        coverImage: product?.thumbnail || '',
        accessType: 'ONE_TIME',
        allowNewMembers: true,
        rules: [
          { id: 'r1', title: 'Be respectful', description: 'Treat all community members with empathy and respect.' },
          { id: 'r2', title: 'No spam', description: 'Self-promotion and spam will be removed immediately.' },
          { id: 'r3', title: 'Keep discussions relevant', description: 'Stay on topic and contribute meaningfully.' },
        ],
        benefits: [
          'Direct access to group discussions',
          'Networking with fellow members',
          'Exclusive announcements and updates',
        ],
        status: 'DRAFT',
      }
    }
    return config
  },

  async saveConfig(creatorId, productId, data) {
    const product = await productsRepo.getById(productId)
    if (!product || product.creatorId !== creatorId) throw httpError(404, 'Product not found')

    if (data.slug) {
      const existing = await communityRepo.getConfigBySlug(data.slug)
      if (existing && existing.productId !== productId) {
        throw httpError(409, 'Community slug is already taken')
      }
    }

    const updated = await communityRepo.upsertConfig(creatorId, productId, data)
    if (data.name || data.slug || data.shortDescription || data.coverImage) {
      await productsRepo.update(productId, creatorId, {
        title: data.name || product.title,
        slug: data.slug || product.slug,
        shortDescription: data.shortDescription || product.shortDescription,
        thumbnail: data.coverImage || product.thumbnail,
      })
    }
    return updated
  },

  async getPublicDetails(productIdOrSlug) {
    let config = await communityRepo.getConfigByProductId(productIdOrSlug)
    if (!config) config = await communityRepo.getConfigBySlug(productIdOrSlug)
    if (!config) {
      const product = await productsRepo.getById(productIdOrSlug)
      if (product && product.type === 'COMMUNITY') {
        config = await this.getConfig(product.creatorId, product.id)
      }
    }
    if (!config) throw httpError(404, 'Community not found')

    const product = await productsRepo.getById(config.productId)
    const creator = await profilesRepo.getByCreator(config.creatorId)
    const memberCount = await communityRepo.countMembers(config.id || config.productId, 'ACTIVE')

    return {
      config,
      product: product ? { id: product.id, title: product.title, price: product.price, currency: product.currency, status: product.status } : null,
      creator: creator ? { name: creator.name, username: creator.username, avatar: creator.avatar } : null,
      memberCount: memberCount + 1,
    }
  },

  async verifyAccess(communityId, customerEmail, creatorId = null) {
    let config = await communityRepo.getConfigByProductId(communityId)
    if (!config) config = await communityRepo.getConfigBySlug(communityId)
    const actualCommunityId = config ? (config.id || config.productId) : communityId
    const targetCreatorId = config ? config.creatorId : creatorId

    if (creatorId && targetCreatorId && creatorId === targetCreatorId) {
      return { hasAccess: true, role: 'OWNER', communityId: actualCommunityId, config }
    }

    if (!customerEmail) throw httpError(401, 'Authentication or customer email is required')

    if (targetCreatorId) {
      const creatorUser = await usersRepo.getById(targetCreatorId)
      if (creatorUser && creatorUser.email.toLowerCase() === customerEmail.toLowerCase()) {
        return { hasAccess: true, role: 'OWNER', communityId: actualCommunityId, config }
      }
    }

    const membership = await communityRepo.getMembership(actualCommunityId, customerEmail)
    if (!membership || membership.status !== 'ACTIVE') {
      throw httpError(403, 'You do not have an active membership to this community.')
    }

    return { hasAccess: true, role: membership.role || 'MEMBER', membership, communityId: actualCommunityId, config }
  },

  async createPost(communityId, customerEmail, userDetails, postData) {
    const creatorId = userDetails?.creatorId || userDetails?.id
    const access = await this.verifyAccess(communityId, customerEmail, creatorId)


    if (postData.isAnnouncement && access.role !== 'OWNER' && access.role !== 'ADMIN') {
      throw httpError(403, 'Only owners and admins can create announcements.')
    }

    if (!postData.content || !postData.content.trim()) {
      throw httpError(400, 'Post content cannot be empty.')
    }

    const post = await communityRepo.createPost({
      communityId: access.communityId,
      authorEmail: customerEmail,
      authorName: userDetails?.name || customerEmail.split('@')[0],
      authorRole: access.role,
      title: postData.title ? sanitizeText(postData.title) : '',
      content: postData.content,
      isAnnouncement: postData.isAnnouncement || false,
      attachments: postData.attachments || [],
      referencedProduct: postData.referencedProduct || null,
      category: postData.category ? sanitizeText(postData.category) : '',
    })

    return post
  },

  async pinPost(communityId, postId, customerEmail, creatorId, isPinned = true) {
    const access = await this.verifyAccess(communityId, customerEmail, creatorId)
    if (access.role !== 'OWNER' && access.role !== 'ADMIN') {
      throw httpError(403, 'Only community owners and admins can pin posts.')
    }
    const updated = await communityRepo.updatePost(postId, { isAnnouncement: !!isPinned, isPinned: !!isPinned })
    return updated
  },

  async hidePost(communityId, postId, customerEmail, creatorId, isHidden = true) {
    const access = await this.verifyAccess(communityId, customerEmail, creatorId)
    if (access.role !== 'OWNER' && access.role !== 'ADMIN') {
      throw httpError(403, 'Only community owners and admins can hide posts.')
    }
    const updated = await communityRepo.updatePost(postId, { isHidden: !!isHidden })
    return updated
  },

  async createResource(communityId, customerEmail, creatorId, data) {
    const access = await this.verifyAccess(communityId, customerEmail, creatorId)
    if (access.role !== 'OWNER' && access.role !== 'ADMIN') {
      throw httpError(403, 'Only community owners and admins can create resources.')
    }
    if (!data.title || !data.title.trim()) throw httpError(400, 'Resource title is required')

    const resource = {
      id: uuidv4(),
      communityId: access.communityId,
      creatorId: access.config?.creatorId || creatorId,
      title: sanitizeText(data.title),
      description: sanitizeText(data.description || ''),
      fileUrl: sanitizeUrl(data.fileUrl || ''),
      fileId: data.fileId || null,
      externalUrl: sanitizeUrl(data.externalUrl || ''),
      category: sanitizeText(data.category || 'General'),
      visibility: data.visibility || 'MEMBERS_ONLY',
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    return communityResourcesRepo.createResource(resource)
  },

  async listResources(communityId, customerEmail, creatorId = null) {
    const access = await this.verifyAccess(communityId, customerEmail, creatorId)
    const resources = await communityResourcesRepo.listResources(access.communityId)
    return resources
  },

  async deleteResource(communityId, resourceId, customerEmail, creatorId = null) {
    const access = await this.verifyAccess(communityId, customerEmail, creatorId)
    if (access.role !== 'OWNER' && access.role !== 'ADMIN') {
      throw httpError(403, 'Only community owners and admins can delete resources.')
    }
    await communityResourcesRepo.deleteResource(resourceId)
    return { ok: true }
  },


  async listPosts(communityId, customerEmail, creatorId = null, { limit = 30, skip = 0 } = {}) {
    const access = await this.verifyAccess(communityId, customerEmail, creatorId)
    const { items, total } = await communityRepo.listPosts(access.communityId, { limit, skip })

    const postIds = items.map((p) => p.id)
    const userLikes = await communityRepo.getUserReactionsForPosts(postIds, customerEmail)
    const userLikesSet = new Set(userLikes)

    const postsWithLikes = items.map((p) => ({
      ...p,
      hasLiked: userLikesSet.has(p.id),
    }))

    return { posts: postsWithLikes, total, role: access.role, config: access.config }
  },

  async deletePost(postId, customerEmail, creatorId = null) {
    const post = await communityRepo.getPost(postId)
    if (!post) throw httpError(404, 'Post not found')

    const access = await this.verifyAccess(post.communityId, customerEmail, creatorId)
    const isAuthor = post.authorEmail?.toLowerCase() === customerEmail?.toLowerCase()
    const isMod = access.role === 'OWNER' || access.role === 'ADMIN'

    if (!isAuthor && !isMod) {
      throw httpError(403, 'You do not have permission to delete this post.')
    }

    return communityRepo.deletePost(postId)
  },

  async createComment(postId, customerEmail, userDetails, content) {
    const post = await communityRepo.getPost(postId)
    if (!post) throw httpError(404, 'Post not found')

    const access = await this.verifyAccess(post.communityId, customerEmail, userDetails?.creatorId)

    if (!content || !content.trim()) throw httpError(400, 'Comment content cannot be empty.')

    const comment = await communityRepo.createComment({
      postId,
      communityId: post.communityId,
      authorEmail: customerEmail,
      authorName: userDetails?.name || customerEmail.split('@')[0],
      content,
    })

    if (post.authorEmail && post.authorEmail.toLowerCase() !== customerEmail.toLowerCase()) {
      await communityRepo.createNotification({
        communityId: post.communityId,
        recipientEmail: post.authorEmail,
        actorEmail: customerEmail,
        type: 'NEW_COMMENT',
        title: 'New comment on your post',
        message: `${userDetails?.name || customerEmail.split('@')[0]} commented: "${content.slice(0, 50)}..."`,
        link: `/community/${post.communityId}`,
      })
    }

    return comment
  },

  async listComments(postId, customerEmail, creatorId = null) {
    const post = await communityRepo.getPost(postId)
    if (!post) throw httpError(404, 'Post not found')

    await this.verifyAccess(post.communityId, customerEmail, creatorId)
    return communityRepo.listComments(postId)
  },

  async deleteComment(commentId, customerEmail, creatorId = null) {
    const db = await getDb()
    const comment = await db.collection('community_comments').findOne({ id: commentId })
    if (!comment) throw httpError(404, 'Comment not found')

    const access = await this.verifyAccess(comment.communityId, customerEmail, creatorId)
    const isAuthor = comment.authorEmail?.toLowerCase() === customerEmail?.toLowerCase()
    const isMod = access.role === 'OWNER' || access.role === 'ADMIN'

    if (!isAuthor && !isMod) {
      throw httpError(403, 'You do not have permission to delete this comment.')
    }

    return communityRepo.deleteComment(commentId)
  },

  async toggleReaction(postId, customerEmail) {
    const post = await communityRepo.getPost(postId)
    if (!post) throw httpError(404, 'Post not found')

    await this.verifyAccess(post.communityId, customerEmail)
    return communityRepo.toggleReaction({
      postId,
      communityId: post.communityId,
      customerEmail,
      type: 'LIKE',
    })
  },

  async listMembers(communityId, customerEmail, creatorId = null, params = {}) {
    const access = await this.verifyAccess(communityId, customerEmail, creatorId)
    return communityRepo.listMembers(access.communityId, params)
  },

  async manageMember(creatorId, communityId, { targetEmail, role, status }) {
    const config = await communityRepo.getConfigByProductId(communityId) || await communityRepo.getConfigBySlug(communityId)
    if (!config || config.creatorId !== creatorId) throw httpError(403, 'Unauthorized')

    const membership = await communityRepo.getMembership(config.id || config.productId, targetEmail)
    if (!membership) throw httpError(404, 'Member not found')

    const updates = {}
    if (role && ['ADMIN', 'MODERATOR', 'MEMBER'].includes(role)) updates.role = role
    if (status && ['ACTIVE', 'SUSPENDED', 'BANNED', 'LEFT'].includes(status)) updates.status = status

    return communityRepo.upsertMembership({
      ...membership,
      ...updates,
    })
  },

  async getStats(creatorId, productId) {
    const config = await communityRepo.getConfigByProductId(productId)
    if (!config || config.creatorId !== creatorId) throw httpError(403, 'Unauthorized')
    const commId = config.id || config.productId
    const totalMembers = await communityRepo.countMembers(commId, 'ACTIVE')
    const { total: totalPosts } = await communityRepo.listPosts(commId, { limit: 1 })
    return {
      totalMembers: totalMembers + 1,
      totalPosts,
      activeToday: Math.max(1, Math.round(totalMembers * 0.4)),
    }
  },
}

// ---------------- Webinar Service ----------------
export const webinarService = {
  async getConfig(creatorId, productId) {
    let config = await webinarRepo.getConfigByProductId(productId)
    if (!config) {
      const product = await productsRepo.getById(productId)
      config = {
        productId,
        creatorId,
        title: product?.title || 'Live Webinar',
        shortDescription: product?.shortDescription || '',
        description: product?.description || '',
        category: 'Technology',
        tags: ['#webinar', '#live'],
        coverImage: product?.thumbnail || '',
        startAtUTC: new Date(Date.now() + 86400000 * 3).toISOString(),
        endAtUTC: new Date(Date.now() + 86400000 * 3 + 3600000 * 1.5).toISOString(),
        timezone: 'Asia/Kolkata',
        durationMinutes: 90,
        price: product?.price || 0,
        currency: product?.currency || 'inr',
        isFree: (product?.price || 0) === 0,
        capacity: 100,
        meetingType: 'VIDEO_CALL',
        meetingUrl: 'https://meet.google.com/abc-defg-hij',
        meetingInstructions: 'Please join 5 minutes before the webinar starts.',
        registrationRequired: true,
        registrationCutoffMinutes: 15,
        allowCancellation: true,
        cancellationCutoffHours: 2,
        questions: [
          { id: 'q1', question: 'What is your current role?', type: 'SHORT_TEXT', required: true, order: 1 },
          { id: 'q2', question: 'What do you hope to learn from this session?', type: 'LONG_TEXT', required: false, order: 2 },
        ],
        agenda: [
          { id: 'a1', time: '06:00 PM', title: 'Welcome & Introduction', description: 'Opening remarks and session overview.', order: 1 },
          { id: 'a2', time: '06:15 PM', title: 'Main Masterclass Presentation', description: 'Core presentation and framework breakdown.', order: 2 },
          { id: 'a3', time: '07:15 PM', title: 'Live Audience Q&A', description: 'Open Q&A with live answers.', order: 3 },
        ],
        speakers: [
          { id: 's1', name: 'Primary Host', role: 'Creator & Lead Instructor', bio: 'Building digital product experiences and helping creators grow.', image: '', website: '', twitter: '', linkedin: '', order: 1 },
        ],
        resources: [],
        replay: { enabled: false, title: 'Webinar Recording Replay', url: '', availability: 'LIFETIME', expiresAt: null },
        whatYouWillLearn: [
          'Validate product ideas before building',
          'Build and launch step-by-step',
          'Drive customer engagement and sales',
        ],
        whoIsThisFor: 'Creators, developers, and professionals who want to master digital products and live events.',
        locationType: 'ONLINE',
        inPersonLocation: '',
        backupMeetingUrl: '',
        waitlistEnabled: false,
        waitlistMessage: 'Join the waitlist to receive an instant notification if a seat opens up.',
        status: 'DRAFT',
      }
      config = await webinarRepo.upsertConfig(creatorId, productId, config)
    }
    return config
  },

  async saveConfig(creatorId, productId, body) {
    const existing = await this.getConfig(creatorId, productId)

    let startAtUTC = body.startAtUTC || existing.startAtUTC
    const durationMinutes = Number(body.durationMinutes || existing.durationMinutes || 90)
    const endAtUTC = new Date(new Date(startAtUTC).getTime() + durationMinutes * 60000).toISOString()
    const isFree = Number(body.price !== undefined ? body.price : existing.price) === 0

    const updated = {
      ...existing,
      ...body,
      durationMinutes,
      startAtUTC,
      endAtUTC,
      isFree,
      price: Number(body.price !== undefined ? body.price : existing.price),
      currency: (body.currency || existing.currency || 'inr').toLowerCase(),
    }

    if (body.title || body.shortDescription || body.price !== undefined) {
      await productsRepo.update(productId, {
        ...(body.title ? { title: body.title } : {}),
        ...(body.shortDescription ? { shortDescription: body.shortDescription } : {}),
        ...(body.price !== undefined ? { price: Number(body.price) } : {}),
      })
    }

    return webinarRepo.upsertConfig(creatorId, productId, updated)
  },

  async getPublicDetails(productIdOrSlug) {
    let config = await webinarRepo.getConfigByProductId(productIdOrSlug)
    let product = await productsRepo.getById(productIdOrSlug)
    if (!product && config) {
      product = await productsRepo.getById(config.productId)
    }
    if (!config && product) {
      config = await webinarRepo.getConfigByProductId(product.id)
    }
    if (!config) throw httpError(404, 'Webinar not found')

    const webinarId = config.id || config.productId
    const totalRegistrations = await webinarRepo.countRegistrations(webinarId, ['REGISTERED', 'ATTENDED'])

    const capacity = config.capacity ? Number(config.capacity) : null
    const isFull = capacity !== null && totalRegistrations >= capacity

    const startMs = new Date(config.startAtUTC).getTime()
    const cutoffMinutes = Number(config.registrationCutoffMinutes || 0)
    const cutoffMs = startMs - cutoffMinutes * 60000
    const isRegistrationClosed = Date.now() >= cutoffMs
    const hasEnded = Date.now() >= new Date(config.endAtUTC).getTime()

    const publicConfig = {
      id: config.id || config.productId,
      productId: config.productId,
      creatorId: config.creatorId,
      title: config.title,
      shortDescription: config.shortDescription,
      description: config.description,
      category: config.category,
      tags: config.tags || [],
      coverImage: config.coverImage,
      startAtUTC: config.startAtUTC,
      endAtUTC: config.endAtUTC,
      timezone: config.timezone,
      durationMinutes: config.durationMinutes,
      price: config.price,
      currency: config.currency,
      isFree: config.isFree,
      capacity: config.capacity,
      locationType: config.locationType || 'ONLINE',
      inPersonLocation: config.inPersonLocation || '',
      backupMeetingUrl: config.backupMeetingUrl || '',
      questions: config.questions || [],
      agenda: config.agenda || [],
      speakers: config.speakers || [],
      resources: (config.resources || []).filter(r => r.visibility === 'PUBLIC' || r.visibility === 'BEFORE_EVENT'),
      replay: config.replay || { enabled: false },
      whatYouWillLearn: config.whatYouWillLearn || [],
      whoIsThisFor: config.whoIsThisFor || '',
      waitlistEnabled: config.waitlistEnabled || false,
      waitlistMessage: config.waitlistMessage || '',
      status: config.status,
    }

    const creatorProfile = await profilesRepo.getByCreator(config.creatorId)

    return {
      config: publicConfig,
      product: product ? { id: product.id, title: product.title, price: product.price, currency: product.currency, type: product.type, thumbnail: product.thumbnail } : null,
      creator: creatorProfile ? { name: creatorProfile.name, avatar: creatorProfile.avatar, bio: creatorProfile.bio } : null,
      totalRegistrations,
      isFull,
      isRegistrationClosed,
      hasEnded,
    }
  },

  async registerFree(productId, customerData, answers = []) {
    const config = await webinarRepo.getConfigByProductId(productId)
    if (!config) throw httpError(404, 'Webinar configuration not found')

    const webinarId = config.id || config.productId
    const email = customerData.email ? customerData.email.toLowerCase().trim() : ''
    if (!email) throw httpError(400, 'Email address is required')

    const existing = await webinarRepo.getRegistration(webinarId, email)
    if (existing && existing.status === 'REGISTERED') {
      return existing
    }

    const currentCount = await webinarRepo.countRegistrations(webinarId, ['REGISTERED', 'ATTENDED'])
    if (config.capacity && currentCount >= Number(config.capacity)) {
      throw httpError(409, 'This webinar has reached maximum attendee capacity.')
    }

    const startMs = new Date(config.startAtUTC).getTime()
    const cutoffMinutes = Number(config.registrationCutoffMinutes || 0)
    if (Date.now() >= startMs - cutoffMinutes * 60000) {
      throw httpError(400, 'Registration for this webinar has closed.')
    }

    const customer = await customersRepo.upsert(config.creatorId, email, customerData.name || email.split('@')[0])

    const registration = await webinarRepo.upsertRegistration({
      webinarId,
      productId,
      creatorId: config.creatorId,
      customerId: customer.id,
      customerEmail: email,
      customerName: customerData.name || customer.name || email.split('@')[0],
      orderId: null,
      status: 'REGISTERED',
      answers: answers || [],
    })

    await entitlementsRepo.createForOrder({
      id: `ent_reg_${registration.id}`,
      customerId: customer.id,
      productId,
      orderId: `free_reg_${registration.id}`,
      status: 'ACTIVE',
      createdAt: new Date(),
    }).catch(() => { })

    try {
      const profile = await profilesRepo.getByCreator(config.creatorId)
      const emailService = getEmailService()
      if (emailService.isConfigured()) {
        const timeStr = `${new Date(config.startAtUTC).toUTCString()} (${config.timezone})`
        const emailContent = webinarRegistrationEmail({
          productTitle: config.title,
          creatorName: profile?.name || 'Creator',
          webinarTime: timeStr,
          meetingUrl: config.meetingUrl,
        })
        await emailService.send({ to: email, ...emailContent })
      }
    } catch (e) {
      console.error('Failed to send webinar registration email:', e)
    }

    return registration
  },

  async verifyAccess(productId, customerEmail, creatorId = null) {
    const config = await webinarRepo.getConfigByProductId(productId)
    if (!config) throw httpError(404, 'Webinar not found')

    const webinarId = config.id || config.productId

    if (creatorId && creatorId === config.creatorId) {
      return {
        authorized: true,
        role: 'CREATOR',
        meetingUrl: config.meetingUrl,
        meetingInstructions: config.meetingInstructions,
        config,
      }
    }

    if (!customerEmail) throw httpError(401, 'Email authentication required for meeting access')

    const creatorUser = await usersRepo.getById(config.creatorId)
    if (creatorUser && creatorUser.email.toLowerCase() === customerEmail.toLowerCase()) {
      return {
        authorized: true,
        role: 'CREATOR',
        meetingUrl: config.meetingUrl,
        meetingInstructions: config.meetingInstructions,
        config,
      }
    }

    const reg = await webinarRepo.getRegistration(webinarId, customerEmail)
    if (!reg || (reg.status !== 'REGISTERED' && reg.status !== 'ATTENDED')) {
      throw httpError(403, 'Access denied. You do not have a confirmed registration for this webinar.')
    }

    return {
      authorized: true,
      role: 'ATTENDEE',
      registration: reg,
      meetingUrl: config.meetingUrl,
      meetingInstructions: config.meetingInstructions,
      config,
    }
  },

  async listRegistrationsForCreator(creatorId, productId, options = {}) {
    const config = await webinarRepo.getConfigByProductId(productId)
    if (!config || config.creatorId !== creatorId) throw httpError(403, 'Unauthorized')

    const webinarId = config.id || config.productId
    return webinarRepo.listRegistrationsForWebinar(webinarId, options)
  },

  async updateAttendance(creatorId, registrationId, status) {
    const reg = await webinarRepo.getRegistrationById(registrationId)
    if (!reg) throw httpError(404, 'Registration not found')

    if (reg.creatorId !== creatorId) throw httpError(403, 'Unauthorized')

    if (!['ATTENDED', 'NO_SHOW', 'REGISTERED'].includes(status)) {
      throw httpError(400, 'Invalid status')
    }

    return webinarRepo.updateRegistrationStatus(registrationId, status)
  },

  async cancelWebinar(creatorId, productId, reason = '') {
    const config = await webinarRepo.getConfigByProductId(productId)
    if (!config || config.creatorId !== creatorId) throw httpError(403, 'Unauthorized')

    const webinarId = config.id || config.productId

    await webinarRepo.upsertConfig(creatorId, productId, { ...config, status: 'CANCELLED' })

    const { items: registrants } = await webinarRepo.listRegistrationsForWebinar(webinarId, { limit: 1000 })

    for (const reg of registrants) {
      if (reg.status === 'REGISTERED') {
        await webinarRepo.updateRegistrationStatus(reg.id, 'CANCELLED', { cancelReason: reason })

        try {
          const profile = await profilesRepo.getByCreator(creatorId)
          const emailService = getEmailService()
          if (emailService.isConfigured()) {
            const timeStr = `${new Date(config.startAtUTC).toUTCString()} (${config.timezone})`
            const emailContent = webinarCancellationEmail({
              productTitle: config.title,
              creatorName: profile?.name || 'Creator',
              webinarTime: timeStr,
              reason,
            })
            await emailService.send({ to: reg.customerEmail, ...emailContent })
          }
        } catch (e) {
          console.error('Failed to send webinar cancellation email:', e)
        }
      }
    }

    return { success: true, count: registrants.length }
  },

  async cancelRegistration(customerEmail, registrationId) {
    const reg = await webinarRepo.getRegistrationById(registrationId)
    if (!reg) throw httpError(404, 'Registration not found')

    if (reg.customerEmail.toLowerCase() !== customerEmail.toLowerCase().trim()) {
      throw httpError(403, 'Unauthorized')
    }

    const config = await webinarRepo.getConfigByProductId(reg.productId)
    if (!config) throw httpError(404, 'Webinar not found')

    const startMs = new Date(config.startAtUTC).getTime()
    const cutoffHours = Number(config.cancellationCutoffHours || 1)
    if (Date.now() >= startMs - cutoffHours * 3600000) {
      throw httpError(400, `Cancellations are only allowed up to ${cutoffHours} hour(s) before start time.`)
    }

    return webinarRepo.updateRegistrationStatus(registrationId, 'CANCELLED')
  },

  async listCustomerWebinars(customerEmail) {
    if (!customerEmail) return []
    const regs = await webinarRepo.listRegistrationsForCustomer(customerEmail)
    const out = []
    for (const reg of regs) {
      const config = await webinarRepo.getConfigByProductId(reg.productId)
      const product = await productsRepo.getById(reg.productId)
      if (config && product) {
        out.push({
          registration: reg,
          config: {
            id: config.id || config.productId,
            title: config.title,
            startAtUTC: config.startAtUTC,
            endAtUTC: config.endAtUTC,
            timezone: config.timezone,
            durationMinutes: config.durationMinutes,
            status: config.status,
          },
          product: { id: product.id, title: product.title, thumbnail: product.thumbnail },
        })
      }
    }
    return out
  },
}

// ---------------- Memberships (Recurring Monthly Access) ----------------
export const membershipService = {
  async getConfig(productId) {
    if (!productId) throw httpError(400, 'Product ID is required')
    let config = await membershipRepo.getConfigByProductId(productId)
    if (!config) {
      const prod = await productsRepo.getById(productId)
      if (!prod) throw httpError(404, 'Product not found')
      config = await membershipRepo.upsertConfig({
        productId,
        creatorId: prod.creatorId,
        name: prod.title || 'Pro Membership',
        shortDescription: prod.shortDescription || '',
        price: prod.price || 499,
        currency: prod.currency || 'inr',
        status: 'DRAFT',
      })
    }
    return config
  },

  async saveConfig(productId, creatorId, configData) {
    const prod = await productsRepo.getById(productId)
    if (!prod) throw httpError(404, 'Product not found')
    if (prod.creatorId !== creatorId) throw httpError(403, 'Unauthorized')

    if (configData.isFree) {
      configData.price = 0
    } else if (configData.price !== undefined) {
      configData.price = Math.max(0, Number(configData.price))
    }

    const config = await membershipRepo.upsertConfig({
      ...configData,
      productId,
      creatorId,
    })

    // Sync title/price to Product model
    await productsRepo.update(productId, {
      title: config.name || prod.title,
      price: config.isFree ? 0 : config.price,
      currency: config.currency,
      shortDescription: config.shortDescription || prod.shortDescription,
    })

    return config
  },

  async getPublicDetails(productIdOrSlug) {
    let prod = await productsRepo.getById(productIdOrSlug)
    if (!prod) prod = await productsRepo.getBySlug(productIdOrSlug)
    if (!prod || prod.type !== 'MEMBERSHIP') throw httpError(404, 'Membership product not found')

    const config = await membershipRepo.getConfigByProductId(prod.id)
    if (!config) throw httpError(404, 'Membership configuration not found')

    const activeMembersCount = await membershipRepo.countSubscriptions(config.id || prod.id, ['ACTIVE', 'TRIALING'])

    return {
      product: {
        id: prod.id,
        title: prod.title,
        slug: prod.slug,
        thumbnail: prod.thumbnail,
        creatorId: prod.creatorId,
      },
      config: {
        id: config.id,
        productId: prod.id,
        name: config.name || prod.title,
        shortDescription: config.shortDescription,
        description: config.description,
        category: config.category,
        tags: config.tags,
        coverImage: config.coverImage,
        billingType: config.billingType,
        price: config.isFree ? 0 : config.price,
        currency: config.currency,
        isFree: config.isFree,
        trialDays: config.trialDays,
        benefits: config.benefits || [],
        unlockedResources: config.unlockedResources || [],
        status: config.status,
      },
      activeMembersCount,
    }
  },

  async subscribeFree(productId, customerData) {
    const config = await this.getConfig(productId)
    if (!config) throw httpError(404, 'Membership not found')
    if (!config.isFree && Number(config.price) > 0) {
      throw httpError(400, 'This membership requires payment.')
    }

    const email = customerData.email ? customerData.email.toLowerCase().trim() : ''
    if (!email) throw httpError(400, 'Email address is required')

    const customer = await customersRepo.upsert(config.creatorId, email, customerData.name || email.split('@')[0])
    const membershipId = config.id || productId

    const existing = await membershipRepo.getSubscription(membershipId, email)
    if (existing && (existing.status === 'ACTIVE' || existing.status === 'TRIALING')) {
      return existing
    }

    const sub = await membershipRepo.upsertSubscription({
      membershipId,
      productId,
      creatorId: config.creatorId,
      customerId: customer.id,
      customerEmail: email,
      customerName: customerData.name || customer.name || email.split('@')[0],
      orderId: null,
      billingInterval: config.billingType === 'YEARLY' ? 'YEAR' : 'MONTH',
      price: 0,
      currency: config.currency,
      status: 'ACTIVE',
      cancelAtPeriodEnd: false,
    })

    // Create main entitlement
    await entitlementsRepo.createForOrder({
      id: `ent_sub_${sub.id}`,
      customerId: customer.id,
      productId,
      orderId: `free_sub_${sub.id}`,
      status: 'ACTIVE',
      createdAt: new Date(),
    }).catch(() => { })

    // Cascade entitlements to linked resources
    await this.cascadeEntitlements(sub, config)

    try {
      const profile = await profilesRepo.getByCreator(config.creatorId)
      const emailService = getEmailService()
      const tmpl = membershipActivatedEmail({
        productTitle: config.name || 'Pro Membership',
        creatorName: profile?.displayName || 'Creator',
        priceDisplay: 'FREE',
        billingInterval: config.billingType === 'YEARLY' ? 'year' : 'month',
      })
      await emailService.sendEmail({ to: email, ...tmpl })
    } catch (e) { }

    return sub
  },

  async cascadeEntitlements(subscription, config) {
    if (!subscription || !config || !Array.isArray(config.unlockedResources)) return
    const customerId = subscription.customerId
    const email = subscription.customerEmail
    const name = subscription.customerName || email.split('@')[0]

    for (const resource of config.unlockedResources) {
      try {
        if (resource.type === 'COMMUNITY' && resource.resourceId) {
          const commConfig = await communityRepo.getConfigByProductId(resource.resourceId)
          const actualCommId = commConfig?.id || resource.resourceId
          await communityRepo.upsertMembership({
            communityId: actualCommId,
            productId: resource.resourceId,
            creatorId: subscription.creatorId,
            customerId,
            customerEmail: email,
            customerName: name,
            role: 'MEMBER',
            status: 'ACTIVE',
          })
        } else if (resource.type === 'COURSE' && resource.resourceId) {
          await entitlementsRepo.createForOrder({
            id: `ent_mem_course_${subscription.id}_${resource.resourceId}`,
            customerId,
            productId: resource.resourceId,
            orderId: `membership_${subscription.id}`,
            status: 'ACTIVE',
            createdAt: new Date(),
          }).catch(() => { })
        } else if (resource.type === 'DIGITAL_DOWNLOAD' && resource.resourceId) {
          await entitlementsRepo.createForOrder({
            id: `ent_mem_dd_${subscription.id}_${resource.resourceId}`,
            customerId,
            productId: resource.resourceId,
            orderId: `membership_${subscription.id}`,
            status: 'ACTIVE',
            createdAt: new Date(),
          }).catch(() => { })
        } else if (resource.type === 'WEBINAR' && resource.resourceId) {
          await webinarRepo.upsertRegistration({
            webinarId: resource.resourceId,
            productId: resource.resourceId,
            creatorId: subscription.creatorId,
            customerId,
            customerEmail: email,
            customerName: name,
            orderId: `membership_${subscription.id}`,
            status: 'REGISTERED',
            answers: [],
          }).catch(() => { })
        }
      } catch (e) {
        console.error('cascadeEntitlements error for resource:', resource, e)
      }
    }
  },

  async verifyAccess(productId, customerEmail, targetCreatorId = null) {
    if (!productId) throw httpError(400, 'Product ID is required')
    const config = await this.getConfig(productId)
    const membershipId = config.id || productId

    if (targetCreatorId && targetCreatorId === config.creatorId) {
      return { authorized: true, role: 'OWNER', subscription: null, config }
    }

    if (!customerEmail) throw httpError(401, 'Authentication or customer email is required')

    const sub = await membershipRepo.getSubscription(membershipId, customerEmail)
    if (!sub || (sub.status !== 'ACTIVE' && sub.status !== 'TRIALING')) {
      throw httpError(403, 'Active membership subscription required.')
    }

    return { authorized: true, role: 'MEMBER', subscription: sub, config }
  },

  async cancelSubscription(subscriptionId, customerEmail) {
    const sub = await membershipRepo.getSubscriptionById(subscriptionId)
    if (!sub) throw httpError(404, 'Subscription not found')
    if (sub.customerEmail.toLowerCase() !== customerEmail.toLowerCase().trim()) {
      throw httpError(403, 'Unauthorized to cancel this subscription')
    }

    const config = await membershipRepo.getConfigByProductId(sub.productId)
    const immediate = config?.cancellationPolicy === 'IMMEDIATE'

    const updated = await membershipRepo.updateSubscriptionStatus(
      subscriptionId,
      immediate ? 'CANCELLED' : sub.status,
      {
        cancelAtPeriodEnd: true,
        cancelledAt: new Date(),
      }
    )

    try {
      const profile = await profilesRepo.getByCreator(sub.creatorId)
      const emailService = getEmailService()
      const endStr = new Date(sub.currentPeriodEnd).toLocaleDateString()
      const tmpl = membershipCancelledEmail({
        productTitle: config?.name || 'Pro Membership',
        creatorName: profile?.displayName || 'Creator',
        currentPeriodEnd: endStr,
      })
      await emailService.sendEmail({ to: customerEmail, ...tmpl })
    } catch (e) { }

    return updated
  },

  async resumeSubscription(subscriptionId, customerEmail) {
    const sub = await membershipRepo.getSubscriptionById(subscriptionId)
    if (!sub) throw httpError(404, 'Subscription not found')
    if (sub.customerEmail.toLowerCase() !== customerEmail.toLowerCase().trim()) {
      throw httpError(403, 'Unauthorized to resume this subscription')
    }

    const updated = await membershipRepo.updateSubscriptionStatus(
      subscriptionId,
      'ACTIVE',
      {
        cancelAtPeriodEnd: false,
        cancelledAt: null,
      }
    )
    return updated
  },

  async listSubscriptionsForCreator(creatorId, options = {}) {
    if (!options.productId) {
      const prods = await productsRepo.list(creatorId)
      const memProd = prods.find(p => p.type === 'MEMBERSHIP')
      if (!memProd) return { items: [], total: 0 }
      const conf = await membershipRepo.getConfigByProductId(memProd.id)
      if (!conf) return { items: [], total: 0 }
      return await membershipRepo.listSubscriptionsForMembership(conf.id || memProd.id, options)
    }
    const conf = await membershipRepo.getConfigByProductId(options.productId)
    if (!conf) return { items: [], total: 0 }
    return await membershipRepo.listSubscriptionsForMembership(conf.id || options.productId, options)
  },

  async getCreatorAnalytics(creatorId) {
    return await membershipRepo.getCreatorAnalytics(creatorId)
  },

  async listSubscriptionsForCustomer(customerEmail) {
    if (!customerEmail) return []
    const subs = await membershipRepo.listSubscriptionsForCustomer(customerEmail)
    const results = []
    for (const sub of subs) {
      const config = await membershipRepo.getConfigByProductId(sub.productId)
      const product = await productsRepo.getById(sub.productId)
      results.push({
        subscription: sub,
        config: config || {},
        product: product || {},
      })
    }
    return results
  },

  // ---- Membership Posts ----

  async listPosts(productId, creatorId, options = {}) {
    const prod = await productsRepo.getById(productId)
    if (!prod) throw httpError(404, 'Product not found')
    if (prod.creatorId !== creatorId) throw httpError(403, 'Unauthorized')
    return await membershipPostsRepo.list(productId, options)
  },

  async createPost(productId, creatorId, data) {
    const prod = await productsRepo.getById(productId)
    if (!prod) throw httpError(404, 'Product not found')
    if (prod.creatorId !== creatorId) throw httpError(403, 'Unauthorized')
    if (!data.title?.trim()) throw httpError(400, 'Post title is required')
    return await membershipPostsRepo.create({
      ...data,
      productId,
      creatorId,
    })
  },

  async updatePost(productId, creatorId, postId, data) {
    const prod = await productsRepo.getById(productId)
    if (!prod) throw httpError(404, 'Product not found')
    if (prod.creatorId !== creatorId) throw httpError(403, 'Unauthorized')
    const post = await membershipPostsRepo.getById(postId)
    if (!post || post.productId !== productId) throw httpError(404, 'Post not found')
    return await membershipPostsRepo.update(postId, data)
  },

  async deletePost(productId, creatorId, postId) {
    const prod = await productsRepo.getById(productId)
    if (!prod) throw httpError(404, 'Product not found')
    if (prod.creatorId !== creatorId) throw httpError(403, 'Unauthorized')
    const post = await membershipPostsRepo.getById(postId)
    if (!post || post.productId !== productId) throw httpError(404, 'Post not found')
    await membershipPostsRepo.delete(postId)
    return { deleted: true }
  },

  async publishPost(productId, creatorId, postId) {
    return await this.updatePost(productId, creatorId, postId, {
      status: 'PUBLISHED',
      publishedAt: new Date().toISOString(),
    })
  },

  async duplicatePost(productId, creatorId, postId) {
    const prod = await productsRepo.getById(productId)
    if (!prod) throw httpError(404, 'Product not found')
    if (prod.creatorId !== creatorId) throw httpError(403, 'Unauthorized')
    const post = await membershipPostsRepo.getById(postId)
    if (!post || post.productId !== productId) throw httpError(404, 'Post not found')
    return await membershipPostsRepo.create({
      productId,
      creatorId,
      title: `${post.title} (Copy)`,
      content: post.content,
      coverImage: post.coverImage,
      status: 'DRAFT',
      visibility: post.visibility,
      tierAccess: post.tierAccess,
      categoryId: post.categoryId,
      attachments: post.attachments,
      externalLinks: post.externalLinks,
    })
  },

  // ---- Membership Tiers ----

  async listTiers(productId) {
    return await membershipTiersRepo.listByProduct(productId)
  },

  async saveTier(productId, creatorId, data) {
    const prod = await productsRepo.getById(productId)
    if (!prod) throw httpError(404, 'Product not found')
    if (prod.creatorId !== creatorId) throw httpError(403, 'Unauthorized')
    if (!data.name?.trim()) throw httpError(400, 'Tier name is required')
    return await membershipTiersRepo.upsert({
      ...data,
      productId,
      creatorId,
    })
  },

  async deleteTier(productId, creatorId, tierId) {
    const prod = await productsRepo.getById(productId)
    if (!prod) throw httpError(404, 'Product not found')
    if (prod.creatorId !== creatorId) throw httpError(403, 'Unauthorized')
    const tier = await membershipTiersRepo.getById(tierId)
    if (!tier || tier.productId !== productId) throw httpError(404, 'Tier not found')
    await membershipTiersRepo.delete(tierId)
    return { deleted: true }
  },

  async reorderTiers(productId, creatorId, orderedIds) {
    const prod = await productsRepo.getById(productId)
    if (!prod) throw httpError(404, 'Product not found')
    if (prod.creatorId !== creatorId) throw httpError(403, 'Unauthorized')
    await membershipTiersRepo.reorder(productId, orderedIds)
    return await membershipTiersRepo.listByProduct(productId)
  },

  // ---- Member Management ----

  async updateMember(creatorId, subscriptionId, action, tierId) {
    const sub = await membershipRepo.getSubscriptionById(subscriptionId)
    if (!sub) throw httpError(404, 'Subscription not found')
    if (sub.creatorId !== creatorId) throw httpError(403, 'Unauthorized')

    if (action === 'cancel') {
      return await membershipRepo.updateSubscriptionStatus(subscriptionId, sub.status, {
        cancelAtPeriodEnd: true,
        cancelledAt: new Date(),
      })
    } else if (action === 'restore') {
      return await membershipRepo.updateSubscriptionStatus(subscriptionId, 'ACTIVE', {
        cancelAtPeriodEnd: false,
        cancelledAt: null,
      })
    } else if (action === 'changeTier' && tierId) {
      return await membershipRepo.updateSubscriptionStatus(subscriptionId, sub.status, { tierId })
    }
    throw httpError(400, 'Invalid action')
  },
}

// ---------------- Custom Service (Bespoke Deliverables) ----------------
export const customService = {
  async getConfig(productId) {
    if (!productId) throw httpError(400, 'Product ID is required')
    let config = await customServiceRepo.getConfigByProductId(productId)
    if (!config) {
      const prod = await productsRepo.getById(productId)
      if (!prod) throw httpError(404, 'Product not found')
      config = await customServiceRepo.upsertConfig({
        productId,
        creatorId: prod.creatorId,
        name: prod.title || 'Resume Review',
        shortDescription: prod.shortDescription || '',
        price: prod.price || 1499,
        currency: prod.currency || 'inr',
        deliveryDays: 3,
        revisionLimit: 2,
        status: 'DRAFT',
      })
    }
    return config
  },

  async saveConfig(productId, creatorId, configData) {
    const prod = await productsRepo.getById(productId)
    if (!prod) throw httpError(404, 'Product not found')
    if (prod.creatorId !== creatorId) throw httpError(403, 'Unauthorized')

    if (configData.isFree) {
      configData.price = 0
    } else if (configData.price !== undefined) {
      configData.price = Math.max(0, Number(configData.price))
    }

    const config = await customServiceRepo.upsertConfig({
      ...configData,
      productId,
      creatorId,
    })

    // Sync title/price to Product model
    await productsRepo.update(productId, {
      title: config.name || prod.title,
      price: config.isFree ? 0 : config.price,
      currency: config.currency,
      shortDescription: config.shortDescription || prod.shortDescription,
    })

    return config
  },

  async getPublicDetails(productIdOrSlug) {
    let prod = await productsRepo.getById(productIdOrSlug)
    if (!prod) prod = await productsRepo.getBySlug(productIdOrSlug)
    if (!prod || (prod.type !== 'CUSTOM_PRODUCT' && prod.type !== 'CUSTOM_SERVICE')) throw httpError(404, 'Custom service product not found')

    const config = await customServiceRepo.getConfigByProductId(prod.id)
    if (!config) throw httpError(404, 'Custom service configuration not found')

    const activeRequestsCount = await customServiceRepo.countActiveRequests(config.id || prod.id)
    const isFull = config.maxActiveRequests ? activeRequestsCount >= Number(config.maxActiveRequests) : false

    return {
      product: {
        id: prod.id,
        title: prod.title,
        slug: prod.slug,
        thumbnail: prod.thumbnail,
        creatorId: prod.creatorId,
      },
      config: {
        id: config.id,
        productId: prod.id,
        name: config.name || prod.title,
        shortDescription: config.shortDescription,
        description: config.description,
        category: config.category,
        tags: config.tags,
        coverImage: config.coverImage,
        price: config.isFree ? 0 : config.price,
        currency: config.currency,
        isFree: config.isFree,
        deliveryDays: config.deliveryDays,
        serviceType: config.serviceType || 'Consulting',
        turnaroundValue: config.turnaroundValue || 3,
        turnaroundUnit: config.turnaroundUnit || 'days',
        revisionLimit: config.revisionLimit,
        packagesEnabled: config.packagesEnabled || false,
        packages: config.packages || [],
        deliverables: config.deliverables || [],
        scopeIncluded: config.scopeIncluded || '',
        scopeExcluded: config.scopeExcluded || '',
        targetAudience: config.targetAudience || '',
        communicationMethod: config.communicationMethod || 'In-app & Email',
        requirements: config.requirements || [],
        workflowStages: config.workflowStages || [],
        callEnabled: config.callEnabled || false,
        meetingUrl: config.meetingUrl || '',
        meetingPlatform: config.meetingPlatform || 'Google Meet',
        meetingInstructions: config.meetingInstructions || '',
        requireRequirementsBeforeStart: config.requireRequirementsBeforeStart !== undefined ? config.requireRequirementsBeforeStart : true,
        allowRevision: config.allowRevision !== undefined ? config.allowRevision : true,
        supportInstructions: config.supportInstructions || '',
        maxActiveRequests: config.maxActiveRequests,
        status: config.status,
      },
      activeRequestsCount,
      isFull,
    }
  },

  async submitFreeRequest(productId, customerData, answers = []) {
    const config = await this.getConfig(productId)
    if (!config) throw httpError(404, 'Custom service not found')
    if (!config.isFree && Number(config.price) > 0) {
      throw httpError(400, 'This custom service requires payment.')
    }

    const activeCount = await customServiceRepo.countActiveRequests(config.id || productId)
    if (config.maxActiveRequests && activeCount >= Number(config.maxActiveRequests)) {
      throw httpError(409, 'This creator has reached maximum active requests for this service.')
    }

    const email = customerData.email ? customerData.email.toLowerCase().trim() : ''
    if (!email) throw httpError(400, 'Email address is required')

    const customer = await customersRepo.upsert(config.creatorId, email, customerData.name || email.split('@')[0])
    const serviceId = config.id || productId

    const req = await customServiceRepo.upsertRequest({
      serviceId,
      productId,
      creatorId: config.creatorId,
      customerId: customer.id,
      customerEmail: email,
      customerName: customerData.name || customer.name || email.split('@')[0],
      orderId: null,
      deliveryDays: config.deliveryDays || 3,
      status: 'SUBMITTED',
      answers: answers || [],
    })

    // Create main entitlement
    await entitlementsRepo.createForOrder({
      id: `ent_req_${req.id}`,
      customerId: customer.id,
      productId,
      orderId: `free_req_${req.id}`,
      status: 'ACTIVE',
      createdAt: new Date(),
    }).catch(() => { })

    try {
      const profile = await profilesRepo.getByCreator(config.creatorId)
      const emailService = getEmailService()
      const dueStr = new Date(req.dueAt).toLocaleDateString()
      const tmpl = customServiceRequestEmail({
        productTitle: config.name || 'Custom Service',
        creatorName: profile?.displayName || 'Creator',
        dueAt: dueStr,
      })
      await emailService.sendEmail({ to: email, ...tmpl })
    } catch (e) { }

    return req
  },

  async verifyAccess(requestId, customerEmail, targetCreatorId = null) {
    if (!requestId) throw httpError(400, 'Request ID is required')
    const req = await customServiceRepo.getRequest(requestId)
    if (!req) throw httpError(404, 'Service request not found')

    if (targetCreatorId && targetCreatorId === req.creatorId) {
      return { authorized: true, role: 'OWNER', request: req }
    }

    if (!customerEmail) throw httpError(401, 'Authentication or customer email is required')

    if (req.customerEmail.toLowerCase() !== customerEmail.toLowerCase().trim()) {
      throw httpError(403, 'Unauthorized access to this service request.')
    }

    // Sanitize out private creator internal notes for customer view
    const sanitized = { ...req, internalNotes: undefined }
    return { authorized: true, role: 'CUSTOMER', request: sanitized }
  },

  async requestClarification(creatorId, requestId, message) {
    const req = await customServiceRepo.getRequest(requestId)
    if (!req) throw httpError(404, 'Service request not found')
    if (req.creatorId !== creatorId) throw httpError(403, 'Unauthorized')

    if (!message || !message.trim()) throw httpError(400, 'Clarification request message is required')

    const updated = await customServiceRepo.updateRequestStatus(requestId, 'CLARIFICATION_REQUIRED', {
      clarificationRequest: {
        message,
        requestedAt: new Date(),
      },
    })
    return updated
  },

  async respondClarification(customerEmail, requestId, message, files = []) {
    const access = await this.verifyAccess(requestId, customerEmail)
    const req = access.request

    const updatedAnswers = [...(req.answers || [])]
    if (message) {
      updatedAnswers.push({
        questionId: 'clarification_response',
        questionText: 'Clarification Response',
        answer: message,
        files: files || [],
        createdAt: new Date(),
      })
    }

    const updated = await customServiceRepo.updateRequestStatus(requestId, 'IN_PROGRESS', {
      answers: updatedAnswers,
      clarificationRequest: null,
    })
    return updated
  },

  async submitDelivery(creatorId, requestId, message, files = []) {
    const req = await customServiceRepo.getRequest(requestId)
    if (!req) throw httpError(404, 'Service request not found')
    if (req.creatorId !== creatorId) throw httpError(403, 'Unauthorized')

    if ((!files || files.length === 0) && (!message || !message.trim())) {
      throw httpError(400, 'Please provide deliverable files or a response message.')
    }

    const revisionNumber = (req.deliveries?.length || 0) + 1
    const newDelivery = {
      id: uuidv4(),
      revisionNumber,
      message: message || '',
      files: files || [],
      deliveredAt: new Date(),
    }

    const updatedDeliveries = [...(req.deliveries || []), newDelivery]

    const updated = await customServiceRepo.updateRequestStatus(requestId, 'DELIVERED', {
      deliveries: updatedDeliveries,
      revisionRequest: null,
    })

    try {
      const config = await customServiceRepo.getConfigByProductId(req.productId)
      const profile = await profilesRepo.getByCreator(creatorId)
      const emailService = getEmailService()
      const tmpl = customServiceDeliveredEmail({
        productTitle: config?.name || 'Custom Service',
        creatorName: profile?.displayName || 'Creator',
      })
      await emailService.sendEmail({ to: req.customerEmail, ...tmpl })
    } catch (e) { }

    return updated
  },

  async requestRevision(customerEmail, requestId, message) {
    const access = await this.verifyAccess(requestId, customerEmail)
    const req = access.request

    if (req.status !== 'DELIVERED') {
      throw httpError(400, 'Revisions can only be requested after a delivery has been submitted.')
    }

    const config = await customServiceRepo.getConfigByProductId(req.productId)
    const limit = config?.revisionLimit !== undefined ? Number(config.revisionLimit) : 2

    if (limit >= 0 && (req.usedRevisions || 0) >= limit) {
      throw httpError(400, `You have reached the limit of ${limit} included revision(s) for this service.`)
    }

    if (!message || !message.trim()) throw httpError(400, 'Please describe what you would like revised.')

    const usedRevisions = (req.usedRevisions || 0) + 1

    const updated = await customServiceRepo.updateRequestStatus(requestId, 'REVISION_REQUESTED', {
      usedRevisions,
      revisionRequest: {
        message,
        requestedAt: new Date(),
      },
    })
    return updated
  },

  async acceptDelivery(customerEmail, requestId) {
    const access = await this.verifyAccess(requestId, customerEmail)
    const req = access.request

    if (req.status !== 'DELIVERED') {
      throw httpError(400, 'Only delivered service requests can be completed.')
    }

    const updated = await customServiceRepo.updateRequestStatus(requestId, 'COMPLETED', {
      completedAt: new Date(),
    })
    return updated
  },

  async updateInternalNotes(creatorId, requestId, internalNotes) {
    const req = await customServiceRepo.getRequest(requestId)
    if (!req) throw httpError(404, 'Service request not found')
    if (req.creatorId !== creatorId) throw httpError(403, 'Unauthorized')

    const updated = await customServiceRepo.updateRequestStatus(requestId, req.status, {
      internalNotes,
    })
    return updated
  },

  async updateStatus(creatorId, requestId, status) {
    const req = await customServiceRepo.getRequest(requestId)
    if (!req) throw httpError(404, 'Service request not found')
    if (req.creatorId !== creatorId) throw httpError(403, 'Unauthorized')
    return await customServiceRepo.updateRequestStatus(requestId, status)
  },

  async listRequestsForCreator(creatorId, options = {}) {
    return await customServiceRepo.listRequestsForCreator(creatorId, options)
  },

  async getCreatorAnalytics(creatorId) {
    return await customServiceRepo.getCreatorAnalytics(creatorId)
  },

  async listRequestsForCustomer(customerEmail) {
    if (!customerEmail) return []
    const reqs = await customServiceRepo.listRequestsForCustomer(customerEmail)
    const results = []
    for (const req of reqs) {
      const config = await customServiceRepo.getConfigByProductId(req.productId)
      const product = await productsRepo.getById(req.productId)
      // Sanitize out creator internal notes
      const sanitizedReq = { ...req, internalNotes: undefined }
      results.push({
        request: sanitizedReq,
        config: config || {},
        product: product || {},
      })
    }
    return results
  },
}

// ---------------- External Link (Link to Anywhere) ----------------
export const externalLink = {
  normalizeAndValidateUrl(rawUrl) {
    if (!rawUrl || typeof rawUrl !== 'string' || !rawUrl.trim()) {
      return { valid: false, error: 'Destination URL is required.' }
    }
    const trimmed = rawUrl.trim()
    const lower = trimmed.toLowerCase()

    if (lower.startsWith('javascript:') || lower.startsWith('data:') || lower.startsWith('file:') || lower.startsWith('vbscript:')) {
      return { valid: false, error: 'Unsafe URL protocol rejected. Only HTTP/HTTPS URLs are allowed.' }
    }

    let normalized = trimmed
    if (!lower.startsWith('http://') && !lower.startsWith('https://')) {
      normalized = `https://${trimmed}`
    }

    try {
      const parsed = new URL(normalized)
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        return { valid: false, error: 'Only HTTP and HTTPS protocols are allowed.' }
      }
      return { valid: true, url: normalized }
    } catch (e) {
      return { valid: false, error: 'Invalid URL format.' }
    }
  },

  async getConfig(productId) {
    if (!productId) throw httpError(400, 'Product ID is required')
    let config = await externalLinkRepo.getConfigByProductId(productId)
    if (!config) {
      const prod = await productsRepo.getById(productId)
      if (!prod) throw httpError(404, 'Product not found')
      config = await externalLinkRepo.upsertConfig({
        productId,
        creatorId: prod.creatorId,
        name: prod.title || 'YouTube Masterclass',
        shortDescription: prod.shortDescription || '',
        price: prod.price || 299,
        currency: prod.currency || 'inr',
        destinationUrl: '',
        destinationType: 'YOUTUBE',
        status: 'DRAFT',
      })
    }
    return config
  },

  async saveConfig(productId, creatorId, configData) {
    const prod = await productsRepo.getById(productId)
    if (!prod) throw httpError(404, 'Product not found')
    if (prod.creatorId !== creatorId) throw httpError(403, 'Unauthorized')

    if (configData.destinationUrl) {
      const check = this.normalizeAndValidateUrl(configData.destinationUrl)
      if (!check.valid) throw httpError(400, check.error || 'Invalid destination URL.')
      configData.destinationUrl = check.url
    }

    if (configData.isFree) {
      configData.price = 0
    } else if (configData.price !== undefined) {
      configData.price = Math.max(0, Number(configData.price))
    }

    const config = await externalLinkRepo.upsertConfig({
      ...configData,
      productId,
      creatorId,
    })

    // Sync title/price to Product model
    await productsRepo.update(productId, {
      title: config.name || prod.title,
      price: config.isFree ? 0 : config.price,
      currency: config.currency,
      shortDescription: config.shortDescription || prod.shortDescription,
    })

    return config
  },

  async getPublicDetails(productIdOrSlug) {
    let prod = await productsRepo.getById(productIdOrSlug)
    if (!prod) prod = await productsRepo.getBySlug(productIdOrSlug)
    if (!prod || prod.type !== 'EXTERNAL_LINK') throw httpError(404, 'External link product not found')

    const config = await externalLinkRepo.getConfigByProductId(prod.id)
    if (!config) throw httpError(404, 'External link configuration not found')

    const openCount = await externalLinkRepo.getLinkOpenCount(prod.id)
    const isPaid = !config.isFree && Number(config.price) > 0

    return {
      product: {
        id: prod.id,
        title: prod.title,
        slug: prod.slug,
        thumbnail: prod.thumbnail,
        creatorId: prod.creatorId,
      },
      config: {
        id: config.id,
        productId: prod.id,
        name: config.name || prod.title,
        shortDescription: config.shortDescription,
        description: config.description,
        category: config.category,
        tags: config.tags,
        coverImage: config.coverImage,
        price: config.isFree ? 0 : config.price,
        currency: config.currency,
        isFree: config.isFree,
        destinationType: config.destinationType,
        accessInstructions: config.accessInstructions,
        status: config.status,
        // SECURITY: Omit protected destinationUrl for paid products on public API
        destinationUrl: isPaid ? undefined : config.destinationUrl,
      },
      openCount,
    }
  },

  async getAuthorizedAccess(productId, customerEmail, creatorId = null) {
    if (!productId) throw httpError(400, 'Product ID is required')
    const prod = await productsRepo.getById(productId)
    if (!prod || prod.type !== 'EXTERNAL_LINK') throw httpError(404, 'External link product not found')

    const config = await externalLinkRepo.getConfigByProductId(productId)
    if (!config) throw httpError(404, 'External link configuration not found')

    // Creator / Owner bypass
    if (creatorId && creatorId === prod.creatorId) {
      return { authorized: true, destinationUrl: config.destinationUrl, config }
    }

    // Free product bypass
    if (config.isFree || Number(config.price) === 0) {
      if (customerEmail) {
        await externalLinkRepo.recordLinkOpen(productId, prod.creatorId, customerEmail)
      }
      return { authorized: true, destinationUrl: config.destinationUrl, config }
    }

    // Paid product: Verify customer purchase entitlement
    if (!customerEmail) throw httpError(401, 'Authentication or customer email is required.')

    const email = customerEmail.toLowerCase().trim()
    const customer = await customersRepo.getByEmail(prod.creatorId, email)
    if (!customer) throw httpError(403, 'You have not purchased access to this external resource.')

    const hasEntitlement = await entitlementsRepo.has(customer.id, productId)
    if (!hasEntitlement) {
      throw httpError(403, 'Purchase required to access this external link resource.')
    }

    // Record open analytics event
    await externalLinkRepo.recordLinkOpen(productId, prod.creatorId, email)

    return {
      authorized: true,
      destinationUrl: config.destinationUrl,
      config,
    }
  },

  async submitFreeAccess(productId, customerData) {
    const config = await this.getConfig(productId)
    if (!config) throw httpError(404, 'External link product not found')

    const email = customerData.email ? customerData.email.toLowerCase().trim() : ''
    if (!email) throw httpError(400, 'Email address is required')

    const customer = await customersRepo.upsert(config.creatorId, email, customerData.name || email.split('@')[0])
    await entitlementsRepo.createForOrder({
      id: `ent_ext_${productId}_${customer.id}`,
      customerId: customer.id,
      productId,
      orderId: `free_ext_${productId}`,
      status: 'ACTIVE',
      createdAt: new Date(),
    }).catch(() => { })

    await externalLinkRepo.recordLinkOpen(productId, config.creatorId, email)
    return { authorized: true, destinationUrl: config.destinationUrl, config }
  },

  async listPurchasesForCustomer(customerEmail) {
    if (!customerEmail) return []
    const email = customerEmail.toLowerCase().trim()
    const customerList = await customersRepo.listByEmail(email)
    if (!customerList || customerList.length === 0) return []

    const customerIds = customerList.map(c => c.id)
    const { supabaseAdmin } = await import('./supabase')
    const { data: entsData } = await supabaseAdmin.from('entitlements').select('*').in('customerId', customerIds).eq('status', 'ACTIVE')
    const ents = entsData || []

    const productIds = Array.from(new Set(ents.map(e => e.productId)))
    const results = []

    for (const pid of productIds) {
      const prod = await productsRepo.getById(pid)
      if (prod && prod.type === 'EXTERNAL_LINK') {
        const config = await externalLinkRepo.getConfigByProductId(prod.id)
        results.push({
          product: prod,
          config: config || {},
          hasAccess: true,
        })
      }
    }
    return results
  },

  async getCreatorAnalytics(creatorId) {
    return await externalLinkRepo.getCreatorAnalytics(creatorId)
  },
}

// ---------------- Customer Account Unified Service ----------------
export const customerAccountService = {
  async getOverview(userEmail) {
    const email = String(userEmail || '').toLowerCase().trim()
    const { supabaseAdmin } = await import('./supabase')

    const { data: customersData } = await supabaseAdmin.from('customers').select('*').eq('email', email)
    const customers = customersData || []
    const customerIds = customers.map((c) => c.id)

    const { data: allEnts } = await supabaseAdmin.from('entitlements').select('*').eq('status', 'ACTIVE').order('createdAt', { ascending: false })
    const entitlements = (allEnts || []).filter(e => customerIds.includes(e.customerId) || e.customerEmail === email)

    const productIds = Array.from(new Set(entitlements.map((e) => e.productId)))
    const { data: productsData } = await supabaseAdmin.from('products').select('*').in('id', productIds)
    const products = productsData || []
    const productMap = new Map(products.map((p) => [p.id, p]))

    const creatorIds = Array.from(new Set(products.map((p) => p.creatorId)))
    const { data: creatorProfilesData } = await supabaseAdmin.from('creator_profiles').select('*').in('creatorId', creatorIds)
    const creatorProfiles = creatorProfilesData || []
    const creatorMap = new Map(creatorProfiles.map((cp) => [cp.creatorId, cp]))

    const { data: coursesData } = await supabaseAdmin.from('courses').select('*').in('productId', productIds)
    const courses = coursesData || []
    let continueLearning = []
    if (courses.length > 0 && customerIds.length > 0) {
      const { data: progressDocsData } = await supabaseAdmin.from('course_progress').select('*').in('customerId', customerIds)
      const progressDocs = progressDocsData || []
      continueLearning = courses.map((c) => {
        const completedLessons = progressDocs.filter((p) => p.courseId === c.id && p.completed).length
        const totalLessons = c.lessonsCount || 10
        const percentage = Math.min(100, Math.round((completedLessons / Math.max(1, totalLessons)) * 100))
        return {
          courseId: c.id,
          title: c.title,
          thumbnail: c.thumbnail,
          completedLessons,
          totalLessons,
          percentage,
          updatedAt: c.updatedAt || new Date(),
        }
      }).sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)).slice(0, 3)
    }

    const upcomingBookings = await db.collection('coaching_bookings').find({
      customerEmail: email,
      status: { $in: ['CONFIRMED', 'PENDING'] },
      startTime: { $gte: new Date().toISOString().slice(0, 10) },
    }).sort({ startTime: 1 }).limit(3).toArray()

    const webinarRegistrations = await db.collection('webinar_attendees').find({ customerEmail: email }).toArray()
    const webinarIds = webinarRegistrations.map((w) => w.webinarId)
    const upcomingWebinars = await db.collection('webinars').find({
      id: { $in: webinarIds },
      scheduledAt: { $gte: new Date().toISOString() },
    }).sort({ scheduledAt: 1 }).limit(3).toArray()

    const activeMemberships = await db.collection('membership_subscriptions').find({
      customerEmail: email,
      status: { $in: ['ACTIVE', 'CANCELS_AT_PERIOD_END'] },
    }).toArray()

    const recentOrders = await db.collection('orders').find({
      $or: [
        { customerId: { $in: customerIds } },
        { customerEmail: email },
      ],
      status: 'PAID',
    }).sort({ createdAt: -1 }).limit(5).toArray()

    const formattedOrders = recentOrders.map((o) => {
      const prod = productMap.get(o.productId)
      const creator = creatorMap.get(o.creatorId)
      return {
        id: o.id,
        productTitle: prod?.title || 'Digital Product',
        productType: prod?.type || 'PRODUCT',
        creatorName: creator?.name || 'Creator',
        amount: o.amount,
        createdAt: o.createdAt,
      }
    })

    const activityTimeline = []
    recentOrders.forEach((o) => {
      const prod = productMap.get(o.productId)
      activityTimeline.push({
        id: `act_order_${o.id}`,
        title: `Purchased ${prod?.title || 'Product'}`,
        type: 'PURCHASE',
        date: o.createdAt,
      })
    })
    upcomingBookings.forEach((b) => {
      activityTimeline.push({
        id: `act_book_${b.id}`,
        title: `Booked coaching session: ${b.sessionTitle || 'Coaching'}`,
        type: 'COACHING',
        date: b.createdAt || b.startTime,
      })
    })

    activityTimeline.sort((a, b) => new Date(b.date) - new Date(a.date))

    return {
      summary: {
        totalPurchases: recentOrders.length,
        activeEntitlements: entitlements.length,
        activeCourses: courses.length,
        upcomingBookingsCount: upcomingBookings.length + upcomingWebinars.length,
        activeMembershipsCount: activeMemberships.length,
      },
      continueLearning,
      upcomingBookings: upcomingBookings.map((b) => {
        const creator = creatorMap.get(b.creatorId)
        return {
          id: b.id,
          sessionTitle: b.sessionTitle || 'Coaching Session',
          creatorName: creator?.name || 'Creator',
          startTime: b.startTime,
          endTime: b.endTime,
          meetingLink: b.meetingLink,
          status: b.status,
        }
      }),
      upcomingWebinars: upcomingWebinars.map((w) => ({
        id: w.id,
        title: w.title,
        scheduledAt: w.scheduledAt,
        joinUrl: w.joinUrl,
      })),
      activeMemberships: activeMemberships.map((m) => ({
        id: m.id,
        planTitle: m.planTitle || 'Membership Plan',
        status: m.status,
        renewsAt: m.currentPeriodEnd,
        price: m.price,
      })),
      recentOrders: formattedOrders,
      activityTimeline: activityTimeline.slice(0, 10),
    }
  },

  async getLibrary(userEmail, { type, search } = {}) {
    const email = String(userEmail || '').toLowerCase().trim()
    const { supabaseAdmin } = await import('./supabase')

    const { data: customersData } = await supabaseAdmin.from('customers').select('*').eq('email', email)
    const customerIds = (customersData || []).map((c) => c.id)

    const { data: allEnts } = await supabaseAdmin.from('entitlements').select('*').eq('status', 'ACTIVE').order('createdAt', { ascending: false })
    const entitlements = (allEnts || []).filter(e => customerIds.includes(e.customerId) || e.customerEmail === email)

    const productIds = Array.from(new Set(entitlements.map((e) => e.productId)))
    if (productIds.length === 0) return []

    let query = supabaseAdmin.from('products').select('*').in('id', productIds)
    if (type && type !== 'ALL') query = query.eq('type', type)
    const { data: productsData } = await query
    let products = productsData || []

    if (search && search.trim()) {
      const q = search.trim().toLowerCase()
      products = products.filter((p) => p.title?.toLowerCase().includes(q) || p.description?.toLowerCase().includes(q))
    }

    const creatorIds = Array.from(new Set(products.map((p) => p.creatorId)))
    const { data: creatorProfilesData } = await supabaseAdmin.from('creator_profiles').select('*').in('creatorId', creatorIds)
    const creatorMap = new Map((creatorProfilesData || []).map((cp) => [cp.creatorId, cp]))

    const items = await Promise.all(products.map(async (p) => {
      const entitlement = entitlements.find((e) => e.productId === p.id)
      const creator = creatorMap.get(p.creatorId)

      let extra = {}
      if (p.type === 'COURSE') {
        const { data: course } = await supabaseAdmin.from('courses').select('*').eq('productId', p.id).maybeSingle()
        if (course) {
          const { data: progressDocs } = customerIds.length > 0 ? await supabaseAdmin.from('course_progress').select('*').in('customerId', customerIds).eq('courseId', course.id).eq('completed', true) : { data: [] }
          extra = { courseId: course.id, completedLessons: (progressDocs || []).length, totalLessons: course.lessonsCount || 10 }
        }
      } else if (p.type === 'COACHING') {
        const { data: booking } = await supabaseAdmin.from('coaching_bookings').select('*').eq('customerEmail', email).eq('productId', p.id).neq('status', 'CANCELLED').maybeSingle()
        if (booking) {
          extra = { bookingId: booking.id, startTime: booking.startTime, endTime: booking.endTime, meetingLink: booking.meetingLink, status: booking.status }
        }
      } else if (p.type === 'WEBINAR') {
        const { data: webinar } = await supabaseAdmin.from('webinar_configs').select('*').eq('productId', p.id).maybeSingle()
        if (webinar) {
          extra = { webinarId: webinar.id, scheduledAt: webinar.scheduledAt, joinUrl: webinar.joinUrl }
        }
      } else if (p.type === 'COMMUNITY') {
        const { data: config } = await supabaseAdmin.from('community_configs').select('*').eq('productId', p.id).maybeSingle()
        if (config) {
          extra = { communityId: config.id, name: config.name, memberCount: config.memberCount || 1 }
        }
      } else if (p.type === 'CUSTOM_SERVICE') {
        const { data: req } = await supabaseAdmin.from('custom_service_requests').select('*').eq('customerEmail', email).eq('productId', p.id).maybeSingle()
        if (req) {
          extra = { requestId: req.id, serviceStatus: req.status, deliveryDate: req.deliveryDate }
        }
      } else if (p.type === 'EXTERNAL_LINK') {
        const { data: config } = await supabaseAdmin.from('external_link_configs').select('*').eq('productId', p.id).maybeSingle()
        if (config) {
          extra = { configId: config.id }
        }
      } else if (p.type === 'MEMBERSHIP') {
        const { data: sub } = await supabaseAdmin.from('membership_subscriptions').select('*').eq('customerEmail', email).eq('productId', p.id).maybeSingle()
        if (sub) {
          extra = { subscriptionId: sub.id, subStatus: sub.status, renewsAt: sub.currentPeriodEnd }
        }
      }

      return {
        id: p.id,
        title: p.title,
        type: p.type,
        thumbnail: p.coverImage || p.thumbnail,
        description: p.shortDescription || p.description,
        creatorName: creator?.name || 'Creator',
        creatorAvatar: creator?.avatarUrl || '',
        purchasedAt: entitlement?.createdAt || p.createdAt,
        fileInfo: p.fileId ? { fileName: p.fileName, fileSize: p.fileSize } : null,
        extra,
      }
    }))

    return items
  },

  async getOrders(userEmail) {
    const email = String(userEmail || '').toLowerCase().trim()
    const { supabaseAdmin } = await import('./supabase')

    const { data: customersData } = await supabaseAdmin.from('customers').select('*').eq('email', email)
    const customerIds = (customersData || []).map((c) => c.id)

    const { data: allOrders } = await supabaseAdmin.from('orders').select('*').order('createdAt', { ascending: false })
    const orders = (allOrders || []).filter(o => customerIds.includes(o.customerId) || o.customerEmail?.toLowerCase() === email)

    const productIds = Array.from(new Set(orders.map((o) => o.productId)))
    const { data: productsData } = await supabaseAdmin.from('products').select('*').in('id', productIds)
    const productMap = new Map((productsData || []).map((p) => [p.id, p]))

    const creatorIds = Array.from(new Set(orders.map((o) => o.creatorId)))
    const { data: creatorProfilesData } = await supabaseAdmin.from('creator_profiles').select('*').in('creatorId', creatorIds)
    const creatorMap = new Map((creatorProfilesData || []).map((cp) => [cp.creatorId, cp]))

    return orders.map((o) => {
      const prod = productMap.get(o.productId)
      const creator = creatorMap.get(o.creatorId)
      return {
        id: o.id,
        orderNumber: o.id.slice(0, 8).toUpperCase(),
        productId: o.productId,
        productTitle: prod?.title || 'Product',
        productType: prod?.type || 'PRODUCT',
        creatorName: creator?.name || 'Creator',
        amount: o.amount,
        currency: o.currency || 'INR',
        status: o.status,
        createdAt: o.createdAt,
      }
    })
  },

  async getOrderById(userEmail, orderId) {
    const email = String(userEmail || '').toLowerCase().trim()
    const { supabaseAdmin } = await import('./supabase')

    const { data: order } = await supabaseAdmin.from('orders').select('*').eq('id', orderId).maybeSingle()
    if (!order) throw httpError(404, 'Order not found')

    const { data: customersData } = await supabaseAdmin.from('customers').select('*').eq('email', email)
    const customerIds = (customersData || []).map((c) => c.id)

    const isOwner = order.customerEmail?.toLowerCase() === email || customerIds.includes(order.customerId)
    if (!isOwner) throw httpError(403, 'You do not have permission to view this order')

    const { data: product } = await supabaseAdmin.from('products').select('*').eq('id', order.productId).maybeSingle()
    const { data: creatorProfile } = await supabaseAdmin.from('creator_profiles').select('*').eq('creatorId', order.creatorId).maybeSingle()
    const { data: entitlement } = await supabaseAdmin.from('entitlements').select('*').eq('orderId', order.id).maybeSingle()

    return {
      id: order.id,
      orderNumber: order.id.slice(0, 8).toUpperCase(),
      productId: order.productId,
      productTitle: product?.title || 'Product',
      productType: product?.type || 'PRODUCT',
      creatorName: creatorProfile?.name || 'Creator',
      amount: order.amount,
      currency: order.currency || 'INR',
      status: order.status,
      razorpayOrderId: order.razorpayOrderId,
      createdAt: order.createdAt,
      entitlementStatus: entitlement?.status || (order.status === 'PAID' ? 'ACTIVE' : 'INACTIVE'),
    }
  },

  async getDownloads(userEmail) {
    const email = String(userEmail || '').toLowerCase().trim()
    const { supabaseAdmin } = await import('./supabase')

    const { data: customersData } = await supabaseAdmin.from('customers').select('*').eq('email', email)
    const customerIds = (customersData || []).map((c) => c.id)

    const { data: allEnts } = await supabaseAdmin.from('entitlements').select('*').eq('status', 'ACTIVE')
    const entitlements = (allEnts || []).filter(e => customerIds.includes(e.customerId) || e.customerEmail?.toLowerCase() === email)

    const productIds = Array.from(new Set(entitlements.map((e) => e.productId)))
    const { data: productsData } = await supabaseAdmin.from('products').select('*').in('id', productIds).eq('type', 'DIGITAL_DOWNLOAD')
    const products = productsData || []

    const creatorIds = Array.from(new Set(products.map((p) => p.creatorId)))
    const { data: creatorProfilesData } = await supabaseAdmin.from('creator_profiles').select('*').in('creatorId', creatorIds)
    const creatorMap = new Map((creatorProfilesData || []).map((cp) => [cp.creatorId, cp]))

    return products.map((p) => {
      const ent = entitlements.find((e) => e.productId === p.id)
      const creator = creatorMap.get(p.creatorId)

      return {
        id: p.id,
        productId: p.id,
        title: p.title,
        description: p.description,
        creatorName: creator?.name || 'Creator',
        fileName: p.fileName || 'download',
        fileSize: p.fileSize,
        fileMime: p.fileMime,
        purchasedAt: ent?.createdAt || p.createdAt,
      }
    })
  },

  async getNotifications(userEmail) {
    const email = String(userEmail || '').toLowerCase().trim()
    const { supabaseAdmin } = await import('./supabase')

    const { data: ordersData } = await supabaseAdmin.from('orders').select('*').eq('customerEmail', email).eq('status', 'PAID').order('createdAt', { ascending: false }).limit(5)
    const { data: bookingsData } = await supabaseAdmin.from('coaching_bookings').select('*').eq('customerEmail', email).eq('status', 'CONFIRMED').order('startTime', { ascending: true }).limit(5)
    const { data: serviceRequestsData } = await supabaseAdmin.from('custom_service_requests').select('*').eq('customerEmail', email).order('updatedAt', { ascending: false }).limit(5)

    const orders = ordersData || []
    const bookings = bookingsData || []
    const serviceRequests = serviceRequestsData || []

    orders.forEach((o) => {
      notifications.push({
        id: `notif_order_${o.id}`,
        title: 'Payment Successful',
        message: `Your payment of ₹${o.amount} for order #${o.id.slice(0, 6)} was successful.`,
        type: 'ORDER',
        createdAt: o.createdAt,
        read: true,
        link: `/account/orders/${o.id}`,
      })
    })

    bookings.forEach((b) => {
      notifications.push({
        id: `notif_book_${b.id}`,
        title: 'Upcoming Coaching Session',
        message: `Your session "${b.sessionTitle || 'Coaching'}" is confirmed for ${b.startTime}.`,
        type: 'COACHING',
        createdAt: b.createdAt || new Date(),
        read: false,
        link: '/account/coaching',
      })
    })

    serviceRequests.forEach((s) => {
      notifications.push({
        id: `notif_svc_${s.id}`,
        title: `Service Status: ${s.status}`,
        message: `Your service request for "${s.title || 'Custom Service'}" is currently ${s.status}.`,
        type: 'SERVICE',
        createdAt: s.updatedAt || new Date(),
        read: false,
        link: '/account/services',
      })
    })

    notifications.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))

    return {
      unreadCount: notifications.filter((n) => !n.read).length,
      notifications: notifications.slice(0, 10),
    }
  },
}

// ---------------- Creator Platform Subscriptions ----------------
export const creatorSubscriptionService = {
  async assertActiveEntitlement(creatorId, feature = 'mutation') {
    if (!creatorId) throw httpError(401, 'Unauthorized')
    const sub = await this.getStatus(creatorId)

    const isPaid = sub.status === 'ACTIVE' && !sub.isTrial
    const isTrialActive = Boolean(sub.isTrial && !sub.isTrialExpired && (sub.status === 'TRIALING' || sub.trialStatus === 'ACTIVE'))
    const hasActiveEntitlement = isPaid || isTrialActive

    if (!hasActiveEntitlement) {
      const err = httpError(403, 'Your Pro trial has ended. Upgrade your plan to continue selling and creating content.')
      err.code = 'PLAN_UPGRADE_REQUIRED'
      err.planId = sub.planId
      err.trialStatus = sub.trialStatus
      err.status = 403
      throw err
    }

    return { allowed: true, sub }
  },
  async get(creatorId) {
    return this.getStatus(creatorId)
  },
  async getStatus(creatorId) {
    if (!creatorId) throw httpError(400, 'Creator ID required')
    const user = await usersRepo.findById(creatorId)
    if (!user) throw httpError(404, 'User not found')

    let sub = await creatorSubscriptionsRepo.getByCreator(creatorId).catch(() => null)
    if (!sub) {
      sub = {
        status: 'INACTIVE',
        plan: 'UNSUBSCRIBED',
        billingCycle: 'MONTHLY',
        price: 0,
        currency: 'INR',
        trialStatus: 'NOT_STARTED',
      }
    }

    const now = new Date()
    let effectiveStatus = sub.status || 'INACTIVE'
    let currentPeriodEnd = sub.currentPeriodEnd ? new Date(sub.currentPeriodEnd) : null
    let trialEndsAt = sub.trialEndsAt ? new Date(sub.trialEndsAt) : null
    let trialStartedAt = sub.trialStartedAt ? new Date(sub.trialStartedAt) : null
    let trialStatus = sub.trialStatus || 'NOT_STARTED'
    let isTrial = false
    let isTrialExpired = false
    let daysRemaining = 0

    // 1. Check if Paid Subscription is active
    const isPaidSub = (sub.razorpayPaymentId || sub.providerSubscriptionId || (sub.price && sub.price > 0)) && sub.status === 'ACTIVE'

    if (isPaidSub && currentPeriodEnd && currentPeriodEnd > now) {
      effectiveStatus = 'ACTIVE'
      isTrial = false
      daysRemaining = Math.max(0, Math.ceil((currentPeriodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
    } else if (isPaidSub && currentPeriodEnd && now >= currentPeriodEnd) {
      effectiveStatus = 'EXPIRED'
      isTrial = false
      daysRemaining = 0
    } else if (trialStartedAt || trialStatus === 'ACTIVE' || sub.status === 'TRIALING') {
      // 2. Evaluate Trial state
      if (trialEndsAt && now >= trialEndsAt) {
        // Trial expired!
        trialStatus = 'EXPIRED'
        effectiveStatus = 'EXPIRED'
        isTrial = false
        isTrialExpired = true
        daysRemaining = 0
      } else if (trialEndsAt && now < trialEndsAt && (trialStatus === 'ACTIVE' || sub.status === 'TRIALING')) {
        // Trial is ACTIVE! Full Pro access
        trialStatus = 'ACTIVE'
        effectiveStatus = 'TRIALING'
        isTrial = true
        isTrialExpired = false
        daysRemaining = Math.max(0, Math.ceil((trialEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
      } else {
        effectiveStatus = 'INACTIVE'
        isTrial = false
      }
    } else {
      if (effectiveStatus === 'ACTIVE' && currentPeriodEnd && now > currentPeriodEnd) {
        effectiveStatus = 'EXPIRED'
      } else if (effectiveStatus !== 'ACTIVE' && effectiveStatus !== 'TRIALING') {
        effectiveStatus = 'INACTIVE'
      }
    }

    // Resolve planId
    let planId = PLAN_IDS.UNSUBSCRIBED
    if (isTrial) {
      planId = PLAN_IDS.PRO
    } else if (effectiveStatus === 'ACTIVE') {
      planId = normalizePlanId(sub.plan, 'ACTIVE')
    } else {
      planId = PLAN_IDS.UNSUBSCRIBED
    }

    const isAnnual = String(sub.billingInterval || sub.billingCycle || '').toUpperCase().trim() === 'ANNUAL' || String(sub.billingInterval || '').toLowerCase().trim() === 'yearly'
    const billingInterval = isAnnual ? 'ANNUAL' : 'MONTHLY'
    const billingCycle = isAnnual ? 'ANNUAL' : 'MONTHLY'

    const subCurrency = (sub.currency || 'USD').toUpperCase()
    const currencySymbol = subCurrency === 'USD' ? '$' : '₹'
    const region = subCurrency === 'USD' ? BILLING_REGIONS.INTERNATIONAL : BILLING_REGIONS.INDIA

    const planConfig = getPlanConfig(planId, isTrial ? 'TRIALING' : effectiveStatus, isAnnual ? 'annual' : 'monthly')
    const planDisplay = isTrial ? 'Pro' : planConfig.name
    const fullPlanTitle = isTrial ? 'CreatorStore Pro (7-Day Free Trial)' : `CreatorStore ${planDisplay} Plan (${isAnnual ? 'Annual' : 'Monthly'})`
    const storedPrice = (sub.price !== undefined && sub.price !== null && sub.price !== '')
      ? Number(sub.price)
      : (sub.amount !== undefined && sub.amount !== null && sub.amount !== '' ? Number(sub.amount) : null)
    const price = isTrial
      ? 0
      : (storedPrice !== null && storedPrice > 0
        ? storedPrice
        : (subCurrency === 'USD' ? (planId === 'CREATOR' ? (isAnnual ? 58 : 6) : (isAnnual ? 115 : 12)) : planConfig.price))
    const startDate = sub.createdAt || sub.startDate || trialStartedAt || null

    const latestPayment = (sub.razorpayPaymentId || sub.razorpayOrderId) ? {
      razorpayPaymentId: sub.razorpayPaymentId || 'pay_active_sub',
      razorpayOrderId: sub.razorpayOrderId || sub.pendingOrderId || 'order_active_sub',
      amount: price,
      currency: subCurrency,
      currencySymbol,
      status: 'Successful',
      createdAt: sub.updatedAt || sub.createdAt || now,
    } : null

    const paymentHistory = latestPayment ? [
      {
        id: sub.razorpayPaymentId || sub.id || 'pay_1',
        paymentId: sub.razorpayPaymentId || 'pay_active_sub',
        orderId: sub.razorpayOrderId || 'order_active_sub',
        amount: price,
        currency: subCurrency,
        currencySymbol,
        date: sub.updatedAt || sub.createdAt || now,
        status: 'Successful',
        plan: fullPlanTitle,
      }
    ] : []

    return {
      status: effectiveStatus,
      rawStatus: sub.status || 'PENDING',
      trialStatus,
      trialStartedAt: trialStartedAt ? trialStartedAt.toISOString() : null,
      trialEndsAt: trialEndsAt ? trialEndsAt.toISOString() : null,
      isTrial,
      isTrialExpired,
      planId,
      plan: planDisplay,
      fullPlanTitle,
      billingInterval,
      billingCycle,
      isAnnual,
      price,
      currency: subCurrency,
      currencySymbol,
      region,
      priceFormatted: subCurrency === 'USD' ? `$${price}` : `₹${Number(price).toLocaleString('en-IN')}`,
      entitlements: planConfig.entitlements,
      startDate: startDate ? new Date(startDate).toISOString() : null,
      currentPeriodStart: sub.currentPeriodStart ? new Date(sub.currentPeriodStart).toISOString() : (startDate ? new Date(startDate).toISOString() : null),
      currentPeriodEnd: isTrial && trialEndsAt ? trialEndsAt.toISOString() : (currentPeriodEnd ? currentPeriodEnd.toISOString() : null),
      nextBillingDate: isPaidSub && currentPeriodEnd ? currentPeriodEnd.toISOString() : null,
      daysRemaining,
      cancelAtPeriodEnd: Boolean(sub.cancelAtPeriodEnd),
      canSell: user.role === 'CREATOR' && (effectiveStatus === 'ACTIVE' || effectiveStatus === 'TRIALING'),
      provider: (sub.provider || 'DODO').toUpperCase(),
      paymentProvider: (sub.provider || 'DODO').toLowerCase(),
      isRecurring: true,
      renewalType: 'AUTO_RENEWING',
      dodoSubscriptionId: sub.dodoSubscriptionId || sub.providerSubscriptionId || null,
      dodoPaymentId: sub.dodoPaymentId || null,
      providerSubscriptionId: sub.dodoSubscriptionId || sub.providerSubscriptionId || null,
      razorpaySubscriptionId: sub.providerSubscriptionId || null,
      razorpayOrderId: sub.razorpayOrderId || sub.pendingOrderId || null,
      razorpayPaymentId: sub.razorpayPaymentId || null,
      latestPayment,
      paymentHistory,
    }
  },

  async createCheckoutSession(creatorId, body = {}) {
    if (!creatorId) throw httpError(400, 'Creator ID required')
    const user = await usersRepo.findById(creatorId)
    if (!user) throw httpError(404, 'User not found')

    // 1. Prevent duplicate active subscriptions for the exact same plan and billing cycle
    const existingSub = await creatorSubscriptionsRepo.getByCreator(creatorId).catch(() => null)
    const now = new Date()
    const isCurrentlyActivePaid = (
      existingSub &&
      existingSub.status === 'ACTIVE' &&
      existingSub.currentPeriodEnd &&
      new Date(existingSub.currentPeriodEnd) > now &&
      (existingSub.dodoSubscriptionId || existingSub.providerSubscriptionId || existingSub.razorpayPaymentId)
    )

    const rawPlan = body?.plan || 'PRO'
    const validPlans = ['CREATOR', 'CREATOR_MONTHLY', 'PRO', 'CREATOR_PRO']
    if (body?.plan && !validPlans.includes(String(body.plan).toUpperCase().trim())) {
      throw httpError(400, `Invalid subscription plan: '${body.plan}'. Allowed plans are CREATOR or PRO.`)
    }

    const rawInterval = body?.interval || body?.billingInterval || body?.billingCycle || 'monthly'
    const validIntervals = ['monthly', 'annual', 'yearly']
    if (body?.interval && !validIntervals.includes(String(body.interval).toLowerCase().trim())) {
      throw httpError(400, `Invalid billing interval: '${body.interval}'. Allowed intervals are monthly or annual.`)
    }
    const rawRegion = body?.region || 'INTERNATIONAL'

    // 2. Centralized server-authoritative billing resolution
    const billingConfig = resolveBillingConfig({
      plan: rawPlan,
      interval: rawInterval,
      region: rawRegion,
    })

    const selectedPlanId = billingConfig.planId
    const isAnnual = billingConfig.isAnnual
    const intervalKey = billingConfig.intervalKey
    const currency = billingConfig.currency
    const chargeAmount = billingConfig.amount

    if (isCurrentlyActivePaid) {
      const activePlanId = normalizePlanId(existingSub.plan, 'ACTIVE')
      const activeInterval = String(existingSub.billingInterval || existingSub.billingCycle || 'MONTHLY').toUpperCase()
      const requestedInterval = billingConfig.billingInterval

      if (activePlanId === selectedPlanId && activeInterval === requestedInterval) {
        return {
          alreadyActive: true,
          status: 'ACTIVE',
          message: `You already have an active ${billingConfig.planName} (${billingConfig.billingInterval.toLowerCase()}) subscription.`,
          subscription: existingSub,
        }
      }
    }

    const profile = await profilesRepo.getByCreator(creatorId).catch(() => null)
    const customerName = profile?.name || profile?.displayName || user.name || 'Creator'

    console.log(`[Dodo Payments] Creating ${intervalKey} checkout session for creator ${creatorId} on ${selectedPlanId} plan (${currency} ${chargeAmount})`)

    const dodoSession = await dodoProvider.createSubscriptionCheckoutSession({
      creatorId,
      productId: billingConfig.dodoProductId,
      planId: selectedPlanId,
      billingInterval: billingConfig.billingInterval,
      customerEmail: user.email,
      customerName,
      metadata: {
        creatorId,
        planId: selectedPlanId,
        billingInterval: billingConfig.billingInterval,
        region: billingConfig.region,
      },
    })

    const sessionId = dodoSession.sessionId

    await creatorSubscriptionsRepo.upsert(creatorId, {
      status: 'PENDING',
      plan: selectedPlanId,
      billingInterval: billingConfig.billingInterval,
      billingCycle: billingConfig.billingInterval,
      price: chargeAmount,
      currency,
      provider: 'DODO',
      providerSubscriptionId: sessionId,
      dodoSubscriptionId: sessionId,
      pendingOrderId: sessionId,
    })

    await profilesRepo.upsert(creatorId, { onboardingStatus: 'PAYMENT_PENDING' })

    return {
      provider: 'dodo',
      checkoutUrl: dodoSession.checkoutUrl,
      sessionId: sessionId,
      subscriptionId: sessionId,
      orderId: sessionId,
      amount: chargeAmount,
      currency,
      currencySymbol: billingConfig.currencySymbol,
      planId: selectedPlanId,
      interval: intervalKey,
      billingInterval: billingConfig.billingInterval,
      price: chargeAmount,
      priceFormatted: billingConfig.priceFormatted,
      region: billingConfig.region,
      paymentMethodsDescription: billingConfig.paymentMethodsDescription,
      flowType: 'subscription',
      isRecurring: true,
      renewalType: 'AUTO_RENEWING',
    }
  },

  async verifySubscriptionPayment(creatorId, {
    sessionId, subscriptionId, paymentId, dodoSubscriptionId, dodoPaymentId,
    razorpayOrderId, razorpaySubscriptionId, razorpayPaymentId, razorpaySignature,
    interval, billingInterval, region, provider, orderId,
  } = {}) {
    if (!creatorId) throw httpError(400, 'Creator ID required')

    const sub = await creatorSubscriptionsRepo.getByCreator(creatorId)
    const targetSessionId = dodoSubscriptionId || subscriptionId || sessionId || orderId || razorpaySubscriptionId || razorpayOrderId || sub?.dodoSubscriptionId || sub?.providerSubscriptionId || sub?.pendingOrderId
    const targetPaymentId = dodoPaymentId || paymentId || razorpayPaymentId || sub?.dodoPaymentId || sub?.razorpayPaymentId

    console.log(`[Dodo Payments] Verifying subscription for creator ${creatorId} (Session/Sub: ${targetSessionId}, Payment: ${targetPaymentId})`)

    // 1. Strict rejection of mock identifiers
    if (
      (targetSessionId && (targetSessionId.startsWith('cks_mock_') || targetSessionId.startsWith('sub_mock_') || targetSessionId.startsWith('sub_dodo_mock_'))) ||
      (targetPaymentId && targetPaymentId.startsWith('pay_mock_'))
    ) {
      throw httpError(400, 'Mock payment identifiers are strictly prohibited.')
    }

    // 2. Idempotency check: If subscription is ALREADY active with this verified subscription/session ID, return current
    if (sub && sub.status === 'ACTIVE' && (
      (targetSessionId && (sub.dodoSubscriptionId === targetSessionId || sub.providerSubscriptionId === targetSessionId)) ||
      (targetPaymentId && sub.dodoPaymentId === targetPaymentId)
    )) {
      console.log(`[Dodo Payments] Subscription already verified and active for creator ${creatorId}`)
      await profilesRepo.upsert(creatorId, { onboardingStatus: 'COMPLETED', onboardingComplete: true })
      return {
        status: 'ACTIVE',
        provider: 'DODO',
        message: 'Creator subscription already active',
        subscription: sub,
      }
    }

    if (!isDodoConfigured()) {
      throw httpError(500, 'Dodo Payments provider is not configured')
    }

    if (!targetSessionId && !targetPaymentId) {
      throw httpError(400, 'Missing payment or checkout session identifier')
    }

    let calculatedNextBilling = null
    let activeDodoSubId = null
    let capturePaymentId = targetPaymentId || null
    let verified = false

    // A. Check by Dodo Subscription ID (sub_...)
    if (targetSessionId && targetSessionId.startsWith('sub_')) {
      const subDetails = await dodoProvider.getSubscription(targetSessionId).catch((err) => {
        console.error(`[Dodo Payments] Subscription retrieve error for ${targetSessionId}:`, err.message)
        return null
      })
      if (!subDetails) {
        throw httpError(404, `Subscription ${targetSessionId} not found on Dodo Payments`)
      }
      if (subDetails.metadata?.creatorId && subDetails.metadata.creatorId !== creatorId) {
        throw httpError(403, 'Subscription account association mismatch')
      }
      const rawStatus = String(subDetails.status || '').toLowerCase()
      if (rawStatus !== 'active') {
        throw httpError(400, `Dodo subscription is not active (current status: ${subDetails.status})`)
      }
      activeDodoSubId = subDetails.subscription_id || targetSessionId
      if (subDetails.next_billing_date) {
        const nextTime = new Date(subDetails.next_billing_date)
        if (!isNaN(nextTime.getTime())) calculatedNextBilling = nextTime
      }
      verified = true
    }

    // B. Check by Dodo Checkout Session ID (cks_...)
    if (!verified && targetSessionId && targetSessionId.startsWith('cks_')) {
      const sessionDetails = await dodoProvider.getCheckoutSession(targetSessionId).catch((err) => {
        console.error(`[Dodo Payments] Checkout session retrieve error for ${targetSessionId}:`, err.message)
        return null
      })
      if (!sessionDetails) {
        throw httpError(404, `Checkout session ${targetSessionId} not found on Dodo Payments`)
      }
      if (sessionDetails.metadata?.creatorId && sessionDetails.metadata.creatorId !== creatorId) {
        throw httpError(403, 'Checkout session account association mismatch')
      }

      const payStatus = String(sessionDetails.payment_status || '').toLowerCase()
      const isPaid = payStatus === 'paid' || payStatus === 'succeeded' || Boolean(sessionDetails.payment_id)

      if (!isPaid && !sessionDetails.subscription_id) {
        throw httpError(400, `Dodo checkout session has not completed payment (status: ${sessionDetails.payment_status || 'unpaid'})`)
      }

      if (sessionDetails.payment_id) {
        capturePaymentId = sessionDetails.payment_id
      }

      if (sessionDetails.subscription_id) {
        const subDetails = await dodoProvider.getSubscription(sessionDetails.subscription_id).catch(() => null)
        if (subDetails && String(subDetails.status || '').toLowerCase() === 'active') {
          activeDodoSubId = subDetails.subscription_id
          if (subDetails.next_billing_date) {
            const nextTime = new Date(subDetails.next_billing_date)
            if (!isNaN(nextTime.getTime())) calculatedNextBilling = nextTime
          }
        }
      }

      activeDodoSubId = activeDodoSubId || targetSessionId
      verified = true
    }

    // C. Check by Dodo Payment ID (pay_...)
    if (!verified && targetPaymentId && targetPaymentId.startsWith('pay_')) {
      const paymentDetails = await dodoProvider.getPayment(targetPaymentId).catch((err) => {
        console.error(`[Dodo Payments] Payment retrieve error for ${targetPaymentId}:`, err.message)
        return null
      })
      if (!paymentDetails) {
        throw httpError(404, `Payment ${targetPaymentId} not found on Dodo Payments`)
      }
      if (paymentDetails.metadata?.creatorId && paymentDetails.metadata.creatorId !== creatorId) {
        throw httpError(403, 'Payment account association mismatch')
      }
      const payStatus = String(paymentDetails.status || '').toLowerCase()
      if (payStatus !== 'succeeded') {
        throw httpError(400, `Dodo payment was not successful (status: ${paymentDetails.status})`)
      }
      capturePaymentId = paymentDetails.payment_id || targetPaymentId
      activeDodoSubId = paymentDetails.subscription_id || targetSessionId || `sub_${capturePaymentId}`
      verified = true
    }

    if (!verified) {
      throw httpError(400, 'Unable to verify payment with Dodo Payments. Subscription remains inactive.')
    }

    const targetPlanId = normalizePlanId(sub?.plan || 'PRO', 'ACTIVE')
    const isAnnual = String(interval || billingInterval || sub?.billingInterval || sub?.billingCycle || '').toLowerCase().trim() === 'annual'
    const targetRegion = region ? normalizeRegion(region) : (sub?.currency === 'USD' ? BILLING_REGIONS.INTERNATIONAL : BILLING_REGIONS.INDIA)

    const billingConfig = resolveBillingConfig({
      plan: targetPlanId,
      interval: isAnnual ? 'annual' : 'monthly',
      region: targetRegion,
    })

    const periodDays = isAnnual ? 365 : 30
    const currentPeriodEnd = calculatedNextBilling || new Date(Date.now() + periodDays * 24 * 60 * 60 * 1000)
    const price = billingConfig.amount
    const currency = billingConfig.currency

    const updatedSub = await creatorSubscriptionsRepo.updateStatus(creatorId, 'ACTIVE', {
      plan: targetPlanId,
      billingInterval: isAnnual ? 'ANNUAL' : 'MONTHLY',
      billingCycle: isAnnual ? 'ANNUAL' : 'MONTHLY',
      price,
      currency,
      provider: 'DODO',
      providerSubscriptionId: activeDodoSubId,
      dodoSubscriptionId: activeDodoSubId,
      dodoPaymentId: capturePaymentId,
      currentPeriodStart: new Date(),
      currentPeriodEnd,
      trialStatus: 'EXPIRED',
    })

    await profilesRepo.upsert(creatorId, { onboardingStatus: 'COMPLETED', onboardingComplete: true })
    console.log(`[Dodo Payments] Database subscription updated: ACTIVE for creator ${creatorId} (${targetPlanId} - ${isAnnual ? 'ANNUAL' : 'MONTHLY'} - ${currency})`)

    // Email notification
    try {
      const creatorUser = await usersRepo.findById(creatorId).catch(() => null)
      const profile = await profilesRepo.getByCreator(creatorId).catch(() => null)
      if (creatorUser?.email) {
        await emailService.sendSubscriptionStatusEmail({
          to: creatorUser.email,
          creatorName: profile?.name || 'Creator',
          planName: `${billingConfig.planName} (${isAnnual ? 'Annual' : 'Monthly'})`,
          status: 'ACTIVE',
          priceDisplay: `${billingConfig.priceFormatted}${isAnnual ? '/year' : '/month'}`,
          currentPeriodEnd: currentPeriodEnd.toLocaleDateString(),
        })
      }
    } catch (e) {
      console.error('[EmailService] Subscription status email error:', e?.message || e)
    }

    return {
      success: true,
      status: 'ACTIVE',
      plan: targetPlanId,
      provider: 'DODO',
      message: `${billingConfig.planName} (${isAnnual ? 'Annual' : 'Monthly'}) subscription activated successfully via Dodo Payments`,
      subscription: updatedSub,
      planId: targetPlanId,
      billingInterval: isAnnual ? 'ANNUAL' : 'MONTHLY',
      currency,
      region: targetRegion,
    }
  },

  async cancelSubscription(creatorId) {
    if (!creatorId) throw httpError(400, 'Creator ID required')
    const sub = await creatorSubscriptionsRepo.getByCreator(creatorId)
    if (!sub) throw httpError(404, 'Subscription not found')

    const targetSubId = sub.dodoSubscriptionId || sub.providerSubscriptionId
    if (targetSubId) {
      try {
        await dodoProvider.cancelSubscription(targetSubId, { cancelAtNextBillingDate: true })
      } catch (e) {
        console.warn(`[Dodo Payments] Cancel API call warning for ${targetSubId}:`, e.message)
      }
    }

    const updated = await creatorSubscriptionsRepo.updateStatus(creatorId, 'CANCELLED', {
      canceledAt: new Date(),
    })

    return {
      success: true,
      status: 'CANCELLED',
      message: 'Subscription cancelled successfully.',
      subscription: updated,
    }
  },

  async selectPlan(creatorId, { plan }) {
    if (!creatorId) throw httpError(400, 'Creator ID required')
    const selectedPlanId = normalizePlanId(plan, 'ACTIVE')
    const planConfig = getPlanConfig(selectedPlanId)
    const sub = await creatorSubscriptionsRepo.upsert(creatorId, {
      plan: selectedPlanId,
      billingCycle: 'MONTHLY',
      price: planConfig.price,
      currency: 'INR',
    })
    await profilesRepo.upsert(creatorId, { onboardingStatus: 'PLAN_SELECTION' })
    return { subscription: sub, planId: selectedPlanId }
  },

  async startTrial(creatorId, body = {}) {
    if (!creatorId) throw httpError(400, 'Creator ID required')
    const user = await usersRepo.findById(creatorId)
    if (!user) throw httpError(404, 'User not found')

    const sub = await creatorSubscriptionsRepo.getByCreator(creatorId).catch(() => null)
    const now = new Date()

    // 1. If paid active subscription exists, return status (paid takes precedence)
    if (sub && sub.status === 'ACTIVE' && sub.currentPeriodEnd && new Date(sub.currentPeriodEnd) > now && (sub.razorpayPaymentId || sub.providerSubscriptionId)) {
      return this.getStatus(creatorId)
    }

    // 2. Idempotency & Single-Trial Eligibility:
    // If trial was already started or currently active/expired, return current status without extending
    if (sub && (sub.trialStartedAt || sub.trialStatus === 'ACTIVE' || sub.trialStatus === 'EXPIRED' || sub.status === 'TRIALING')) {
      return this.getStatus(creatorId)
    }

    // 3. Start 7-Day Free Pro Trial
    const trialDurationDays = 7
    const trialEndsAt = new Date(now.getTime() + trialDurationDays * 24 * 60 * 60 * 1000)

    const updatedSub = await creatorSubscriptionsRepo.upsert(creatorId, {
      status: 'TRIALING',
      plan: 'PRO',
      billingCycle: 'MONTHLY',
      price: 0,
      currency: 'INR',
      trialStartedAt: now,
      trialEndsAt: trialEndsAt,
      trialStatus: 'ACTIVE',
      currentPeriodStart: now,
      currentPeriodEnd: trialEndsAt,
    })

    await profilesRepo.upsert(creatorId, { onboardingStatus: 'COMPLETED', onboardingComplete: true })

    // Send trial started transactional email (non-blocking)
    try {
      const profile = await profilesRepo.getByCreator(creatorId).catch(() => null)
      if (user.email) {
        await emailService.sendTrialStartedEmail({
          to: user.email,
          creatorName: profile?.name || 'Creator',
          trialEndsAt,
        })
      }
    } catch (e) {
      console.error('[EmailService] Trial started email error:', e?.message || e)
    }

    return {
      status: 'TRIALING',
      trialStatus: 'ACTIVE',
      isTrial: true,
      isTrialExpired: false,
      planId: 'PRO',
      plan: 'Pro',
      fullPlanTitle: 'CreatorStore Pro (7-Day Free Trial)',
      trialStartedAt: now.toISOString(),
      trialEndsAt: trialEndsAt.toISOString(),
      daysRemaining: trialDurationDays,
      message: '7-day Pro trial started successfully',
      subscription: updatedSub,
    }
  },

  async updateSubscriptionStatus(creatorId, status) {
    if (!['ACTIVE', 'EXPIRED', 'CANCELLED', 'PENDING', 'TRIALING'].includes(status)) {
      throw httpError(400, 'Invalid subscription status')
    }
    if (status === 'ACTIVE') {
      throw httpError(403, 'Subscription can only be activated via verified Dodo payment provider flow')
    }
    const sub = await creatorSubscriptionsRepo.updateStatus(creatorId, status)
    if (status === 'TRIALING') {
      await profilesRepo.upsert(creatorId, { onboardingStatus: 'COMPLETED', onboardingComplete: true })
    }
    return { status: sub.status, subscription: sub }
  },
}

// ---------------- Customer Upgrade to Creator ----------------
export const accountUpgradeService = {
  async upgradeToCreator(userId) {
    if (!userId) throw httpError(400, 'User ID required')
    const user = await usersRepo.findById(userId)
    if (!user) throw httpError(404, 'User not found')

    if (user.role !== 'CREATOR') {
      await usersRepo.update(userId, { role: 'CREATOR' })
    }

    let sub = await creatorSubscriptionsRepo.getByCreator(userId)
    if (!sub) {
      sub = await creatorSubscriptionsRepo.upsert(userId, {
        status: 'PENDING',
        plan: 'CREATOR_MONTHLY',
        price: 999,
        currency: 'INR',
      })
    }

    const profile = await profilesRepo.getByCreator(userId)
    if (!profile) {
      await profilesRepo.upsert(userId, { name: user.name || user.email.split('@')[0], bio: '', category: '', avatarUrl: '', socialLinks: {}, onboardingComplete: false })
    }

    return {
      user: { ...user, role: 'CREATOR' },
      subscriptionStatus: sub.status,
      message: 'Account upgraded to Creator successfully',
    }
  },
}

// ---------- Marketing Engine Services ----------

export const leadService = {
  async capture(creatorId, data) {
    if (!creatorId) throw httpError(400, 'Creator ID required')
    if (!data.email) throw httpError(400, 'Email address required')
    const lead = await leadsRepo.capture(creatorId, data)
    await customerTagsRepo.addTag(creatorId, data.email, 'Lead')

    // Non-blocking creator notification email
    try {
      const creatorUser = await usersRepo.findById(creatorId).catch(() => null)
      const profile = await profilesRepo.getByCreator(creatorId).catch(() => null)
      if (creatorUser?.email) {
        await emailService.sendNewLeadCreatorEmail({
          to: creatorUser.email,
          creatorName: profile?.name || 'Creator',
          leadName: data.name || '',
          leadEmail: data.email,
          leadPhone: data.phone || '',
          formName: data.formName || 'Lead Capture',
          submittedAt: new Date().toLocaleString(),
          dashboardUrl: getAppUrl('/dashboard/leads'),
        })
      }
    } catch (e) { console.error('[EmailService] Lead capture creator notification error:', e?.message || e) }

    return lead
  },

  async list(creatorId, options) {
    if (!creatorId) throw httpError(400, 'Creator ID required')
    return leadsRepo.list(creatorId, options)
  },
}

export const couponService = {
  async create(creatorId, data) {
    if (!creatorId) throw httpError(400, 'Creator ID required')
    await creatorSubscriptionService.assertActiveEntitlement(creatorId, 'coupons')
    if (!data.code || data.discount === undefined || data.discount === null) {
      throw httpError(400, 'Coupon code and discount value required')
    }

    const subStatus = await creatorSubscriptionService.getStatus(creatorId).catch(() => null)
    const planId = (subStatus?.status === 'ACTIVE' || subStatus?.status === 'TRIALING') ? subStatus.planId : 'UNSUBSCRIBED'
    if (!hasEntitlement(planId, 'couponCodes')) {
      const pricing = getSubscriptionPricing()
      throw httpError(403, `Discount and coupon codes require the Pro plan (${pricing.PRO.priceFormatted}/month). Upgrade to unlock coupons.`)
    }

    const rawCode = String(data.code).toUpperCase().trim()
    if (!/^[A-Z0-9_-]{2,30}$/.test(rawCode)) {
      throw httpError(400, 'Coupon code must be 2-30 characters (letters, numbers, hyphen, underscore).')
    }

    const discountType = data.type === 'FIXED' ? 'FIXED' : 'PERCENTAGE'
    const discountVal = Number(data.discount)
    if (isNaN(discountVal) || discountVal <= 0) {
      throw httpError(400, 'Discount value must be greater than 0.')
    }
    if (discountType === 'PERCENTAGE' && discountVal > 100) {
      throw httpError(400, 'Percentage discount cannot exceed 100%.')
    }

    const scope = data.scope === 'SPECIFIC' ? 'SPECIFIC' : 'ALL'
    let productIds = null
    if (scope === 'SPECIFIC') {
      const rawIds = Array.isArray(data.productIds) ? data.productIds : (data.productId ? [data.productId] : [])
      const creatorProds = await productsRepo.list(creatorId)
      const validOwnedIds = new Set((creatorProds || []).map((p) => p.id))
      productIds = rawIds.filter((id) => validOwnedIds.has(id))
      if (!productIds || productIds.length === 0) {
        throw httpError(400, 'Please select at least one valid product for this coupon.')
      }
    }

    const minOrderPrice = Math.max(0, Number(data.minOrderPrice || 0))

    let expiresAt = null
    if (data.validityHours && Number(data.validityHours) > 0) {
      expiresAt = new Date(Date.now() + Number(data.validityHours) * 3600 * 1000).toISOString()
    } else if (data.expiresAt || data.expiryDate) {
      expiresAt = new Date(data.expiresAt || data.expiryDate).toISOString()
    } else {
      // Default validity 24 hours
      expiresAt = new Date(Date.now() + 24 * 3600 * 1000).toISOString()
    }

    // Check for existing active coupon with same code
    const existing = await couponsRepo.getByCode(creatorId, rawCode)
    if (existing) {
      const now = new Date()
      const existingExp = existing.expiresAt ? new Date(existing.expiresAt) : (existing.expiryDate ? new Date(existing.expiryDate) : null)
      if (existingExp && existingExp <= now) {
        // Expired duplicate: delete it
        await couponsRepo.delete(creatorId, existing.id)
      } else {
        throw httpError(409, `Coupon '${rawCode}' already exists and is active.`)
      }
    }

    const createdCoupon = await couponsRepo.create({
      creatorId,
      code: rawCode,
      type: discountType,
      discount: discountVal,
      scope,
      productIds,
      productId: productIds && productIds.length === 1 ? productIds[0] : null,
      minOrderPrice,
      validityHours: Number(data.validityHours || 24),
      expiresAt,
      expiryDate: expiresAt,
      usageLimit: Number(data.usageLimit || 0),
      usedCount: 0,
      status: 'ACTIVE',
    })

    let productTitles = []
    if (createdCoupon.scope === 'SPECIFIC' && Array.isArray(createdCoupon.productIds)) {
      const products = await productsRepo.list(creatorId).catch(() => [])
      const prodMap = new Map((products || []).map((p) => [p.id, p.title]))
      productTitles = createdCoupon.productIds.map((id) => prodMap.get(id) || 'Product').filter(Boolean)
    }
    return {
      ...createdCoupon,
      productTitles,
    }
  },

  async validate(creatorId, code, productId, basePrice) {
    const baseNum = Number(basePrice || 0)
    if (!code) return { valid: false, discountAmount: 0, finalPrice: baseNum }
    if (!creatorId) throw httpError(400, 'Creator ID required')

    const cleanCode = String(code).toUpperCase().trim()
    const coupon = await couponsRepo.getByCode(creatorId, cleanCode)
    if (!coupon || coupon.status !== 'ACTIVE') {
      throw httpError(400, 'Invalid coupon code.')
    }

    const now = new Date()
    const expDate = coupon.expiresAt ? new Date(coupon.expiresAt) : (coupon.expiryDate ? new Date(coupon.expiryDate) : null)
    if (expDate && expDate <= now) {
      // Layer 1 runtime check + immediate background deletion
      couponsRepo.delete(creatorId, coupon.id).catch(() => { })
      throw httpError(400, 'This coupon has expired.')
    }

    // Product scope verification
    if (coupon.scope === 'SPECIFIC' || (Array.isArray(coupon.productIds) && coupon.productIds.length > 0)) {
      const allowed = Array.isArray(coupon.productIds) ? coupon.productIds : (coupon.productId ? [coupon.productId] : [])
      if (!allowed.includes(productId)) {
        throw httpError(400, 'This coupon is not valid for this product.')
      }
    } else if (coupon.productId && coupon.productId !== productId) {
      throw httpError(400, 'This coupon is not valid for this product.')
    }

    // Minimum order price verification
    const minOrder = Number(coupon.minOrderPrice || 0)
    if (minOrder > 0 && baseNum < minOrder) {
      throw httpError(400, `Minimum order value for this coupon is ₹${minOrder}.`)
    }

    // Usage limit verification
    if (coupon.usageLimit > 0 && Number(coupon.usedCount || 0) >= Number(coupon.usageLimit)) {
      throw httpError(400, 'Coupon usage limit reached.')
    }

    // Calculate discount
    let discountAmount = 0
    if (coupon.type === 'PERCENTAGE') {
      discountAmount = Math.round(((baseNum * Number(coupon.discount)) / 100) * 100) / 100
    } else {
      discountAmount = Math.min(baseNum, Number(coupon.discount))
    }
    const finalPrice = Math.max(0, baseNum - discountAmount)

    return {
      valid: true,
      couponCode: coupon.code,
      couponId: coupon.id,
      discountType: coupon.type,
      discountValue: Number(coupon.discount),
      discountAmount,
      originalAmount: baseNum,
      finalAmount: finalPrice,
      coupon,
    }
  },

  async delete(creatorId, id) {
    if (!creatorId || !id) throw httpError(400, 'Creator ID and Coupon ID required')
    const success = await couponsRepo.delete(creatorId, id)
    return { success, id }
  },

  async cleanupExpired(creatorId = null) {
    const success = await couponsRepo.deleteExpired(creatorId)
    return { success }
  },

  async list(creatorId) {
    if (!creatorId) throw httpError(400, 'Creator ID required')
    await couponsRepo.deleteExpired(creatorId).catch(() => { })
    const items = await couponsRepo.listByCreator(creatorId)
    const products = await productsRepo.list(creatorId).catch(() => [])
    const prodMap = new Map((products || []).map((p) => [p.id, p.title]))

    return items.map((c) => {
      let productTitles = []
      if (c.scope === 'SPECIFIC' && Array.isArray(c.productIds)) {
        productTitles = c.productIds.map((id) => prodMap.get(id) || 'Product').filter(Boolean)
      } else if (c.productId) {
        const t = prodMap.get(c.productId)
        if (t) productTitles = [t]
      }
      return {
        ...c,
        productTitles,
      }
    })
  },
}

export const marketingService = {
  async getOverview(creatorId) {
    if (!creatorId) throw httpError(400, 'Creator ID required')
    const [leadsRes, couponsRes, broadcastsRes] = await Promise.all([
      leadsRepo.list(creatorId).catch(() => ({ items: [], total: 0 })),
      couponService.list(creatorId).catch(() => []),
      emailRepo.listBroadcasts(creatorId).catch(() => []),
    ])

    const totalLeads = leadsRes?.total !== undefined ? leadsRes.total : (Array.isArray(leadsRes) ? leadsRes.length : (leadsRes?.items?.length || 0))
    const couponsList = Array.isArray(couponsRes) ? couponsRes : []
    const now = Date.now()
    const activeCoupons = couponsList.filter(c => {
      if (c.status && c.status !== 'ACTIVE') return false
      if (c.expiresAt && new Date(c.expiresAt).getTime() < now) return false
      return true
    }).length

    const broadcastsList = Array.isArray(broadcastsRes) ? broadcastsRes : []
    const totalCampaigns = broadcastsList.length

    return {
      totalLeads,
      activeCoupons,
      totalCampaigns,
      recentCampaigns: broadcastsList.slice(0, 5),
    }
  }
}

export const emailMarketingService = {
  async getAudienceEstimate(creatorId, segment = 'ALL_CUSTOMERS') {
    if (!creatorId) throw httpError(400, 'Creator ID required')

    let recipientEmails = new Set()

    if (segment === 'ALL_CUSTOMERS' || segment === 'CUSTOMERS') {
      const customersRes = await customersRepo.list(creatorId).catch(() => [])
      const customers = Array.isArray(customersRes) ? customersRes : (customersRes?.items || [])
      for (const c of customers) {
        if (c.email) recipientEmails.add(c.email.toLowerCase().trim())
      }
    }

    if (segment === 'ALL_CUSTOMERS' || segment === 'LEADS') {
      const leadsRes = await leadsRepo.list(creatorId).catch(() => [])
      const leads = Array.isArray(leadsRes) ? leadsRes : (leadsRes?.items || [])
      for (const l of leads) {
        if (l.email) recipientEmails.add(l.email.toLowerCase().trim())
      }
    }

    if (segment === 'COURSE_BUYERS') {
      const customersRes = await customersRepo.list(creatorId).catch(() => [])
      const customers = Array.isArray(customersRes) ? customersRes : (customersRes?.items || [])
      for (const c of customers) {
        if (c.email && (c.coursesEnrolled || c.productType === 'COURSE' || c.tags?.includes('course'))) {
          recipientEmails.add(c.email.toLowerCase().trim())
        }
      }
      if (recipientEmails.size === 0) {
        for (const c of customers) {
          if (c.email) recipientEmails.add(c.email.toLowerCase().trim())
        }
      }
    }

    return {
      count: recipientEmails.size,
      recipients: Array.from(recipientEmails),
    }
  },

  async sendTestEmail(creatorId, { testEmail, subject, content }) {
    if (!creatorId) throw httpError(400, 'Creator ID required')
    if (!testEmail) throw httpError(400, 'Test email address required')
    if (!subject || !content) throw httpError(400, 'Subject and content required')

    const subStatus = await creatorSubscriptionService.getStatus(creatorId).catch(() => null)
    const planId = (subStatus?.status === 'ACTIVE' || subStatus?.status === 'TRIALING') ? subStatus.planId : 'UNSUBSCRIBED'
    if (!hasEntitlement(planId, 'emailBroadcasts')) {
      throw httpError(403, 'Email broadcasts require an active subscription. Upgrade to unlock.')
    }

    const profile = await profilesRepo.getByCreator(creatorId).catch(() => null)
    const creatorName = profile?.name || 'Creator'

    const sendRes = await emailService.sendMarketingBroadcastEmail({
      to: testEmail,
      creatorName,
      subject: `[TEST] ${subject}`,
      content,
    })

    return { success: true, delivered: sendRes?.delivered !== false, testEmail }
  },

  async sendBroadcast(creatorId, data) {
    if (!creatorId) throw httpError(400, 'Creator ID required')
    await creatorSubscriptionService.assertActiveEntitlement(creatorId, 'emailBroadcasts')
    if (!data.subject || !data.content) throw httpError(400, 'Subject and content required')

    const subStatus = await creatorSubscriptionService.getStatus(creatorId).catch(() => null)
    const planId = (subStatus?.status === 'ACTIVE' || subStatus?.status === 'TRIALING') ? subStatus.planId : 'UNSUBSCRIBED'
    if (!hasEntitlement(planId, 'emailBroadcasts')) {
      throw httpError(403, 'Email broadcasts require an active subscription. Upgrade to unlock.')
    }

    const audience = data.audience || 'ALL_CUSTOMERS'
    const { count, recipients } = await this.getAudienceEstimate(creatorId, audience)

    const profile = await profilesRepo.getByCreator(creatorId).catch(() => null)
    const creatorName = profile?.name || 'Creator'

    // Create broadcast record
    const broadcastRecord = await emailRepo.createBroadcast(creatorId, {
      name: data.name || data.subject,
      subject: data.subject,
      content: data.content,
      audience,
      sentCount: count,
      status: 'SENT',
    })

    // Dispatch emails to audience
    if (recipients.length > 0) {
      for (const email of recipients) {
        try {
          await emailService.sendMarketingBroadcastEmail({
            to: email,
            creatorName,
            subject: data.subject,
            content: data.content,
          })
        } catch (err) {
          console.error(`[Broadcast] Error sending to ${email}:`, err?.message || err)
        }
      }
    }

    return broadcastRecord
  },

  async listBroadcasts(creatorId) {
    return emailRepo.listBroadcasts(creatorId)
  },
}

// ---------------- Creator Onboarding Service ----------------
export const onboardingService = {
  async getStatus(creatorId) {
    const store = await storesRepo.getByCreator(creatorId)
    const products = await productsRepo.list(creatorId)
    const payout = await payoutProfilesRepo.getByCreator(creatorId)
    const dbRecord = await onboardingRepo.get(creatorId)
    const manualCompleted = dbRecord.completedSteps || []

    const completed = new Set(manualCompleted)

    // Auto-detect completed steps based on real DB status
    if (store && store.username) completed.add('ACCOUNT_SETUP')
    if (payout && (payout.status === 'ACTIVE' || payout.onboardingStatus === 'ACTIVE' || payout.accountNumber || payout.bankAccount)) completed.add('CONNECT_PAYOUT')
    if (products && products.length > 0) completed.add('CREATE_PRODUCT')
    if (store && store.published) completed.add('PUBLISH_STORE')


    const checklist = [
      { id: 'ACCOUNT_SETUP', title: 'Set up store username and profile', completed: completed.has('ACCOUNT_SETUP') },
      { id: 'CONNECT_PAYOUT', title: 'Connect Razorpay payout account', completed: completed.has('CONNECT_PAYOUT') },
      { id: 'CREATE_PRODUCT', title: 'Create your first product', completed: completed.has('CREATE_PRODUCT') },
      { id: 'PUBLISH_STORE', title: 'Publish your storefront', completed: completed.has('PUBLISH_STORE') },
      { id: 'SHARE_STORE', title: 'Share your store link with audience', completed: completed.has('SHARE_STORE') },
    ]

    const completedCount = checklist.filter(item => item.completed).length
    const progressPercentage = Math.round((completedCount / checklist.length) * 100)

    let nextStep = null
    if (!completed.has('ACCOUNT_SETUP')) nextStep = { id: 'ACCOUNT_SETUP', title: 'Set up your store username', link: '/settings' }
    else if (!completed.has('CONNECT_PAYOUT')) nextStep = { id: 'CONNECT_PAYOUT', title: 'Connect Razorpay payout account to accept payments', link: '/payouts' }
    else if (!completed.has('CREATE_PRODUCT')) nextStep = { id: 'CREATE_PRODUCT', title: 'Create your first digital download, course, or coaching session', link: '/products/new' }
    else if (!completed.has('PUBLISH_STORE')) nextStep = { id: 'PUBLISH_STORE', title: 'Publish your store to go live', link: '/store/edit' }
    else if (!completed.has('SHARE_STORE')) nextStep = { id: 'SHARE_STORE', title: 'Share your store link on social media', link: '/dashboard/store' }

    return {
      checklist,
      completedSteps: Array.from(completed),
      completedCount,
      totalSteps: checklist.length,
      progressPercentage,
      nextStep,
    }
  },

  async completeStep(creatorId, stepId) {
    await onboardingRepo.completeStep(creatorId, stepId)
    return this.getStatus(creatorId)
  }
}

// ---------------- Creator Success Center ----------------
export const successCenterService = {
  async getResources() {
    return {
      playbooks: [
        {
          id: 'pb-1',
          title: 'First 10 Sales Playbook',
          category: 'GROWTH',
          description: 'A 7-day step-by-step roadmap to get your first 10 paying customers without paid ads.',
          estimatedTime: '15 min read',
        },
        {
          id: 'pb-2',
          title: 'Pricing Strategy & Elasticity Guide',
          category: 'MONETIZATION',
          description: 'How to price digital downloads, coaching, and courses for maximum conversion in INR/USD.',
          estimatedTime: '10 min read',
        },
        {
          id: 'pb-3',
          title: 'High-Converting Checkout Funnel Checklist',
          category: 'CONVERSION',
          description: 'Optimize order bumps, checkout custom fields, and email follow-ups to increase average order value by 35%.',
          estimatedTime: '12 min read',
        },
      ],
      templates: [
        {
          id: 'tpl-1',
          title: 'High-Converting Product Launch Sequence',
          type: 'EMAIL_TEMPLATES',
          description: '4 pre-written email broadcast templates for launch week.',
        },
        {
          id: 'tpl-2',
          title: '1:1 Coaching Intake Questionnaire',
          type: 'CHECKOUT_FIELDS',
          description: 'Ready-to-use checkout custom fields template for coaching clients.',
        },
      ],
      tools: [
        { id: 'tool-1', title: 'Digital Product Earnings Calculator', type: 'CALCULATOR' },
        { id: 'tool-2', title: 'Course Pricing Estimator', type: 'CALCULATOR' },
      ]
    }
  }
}

// ---------------- Instagram Integration & Automations Service ----------------

export const instagramService = {
  async getStatus(creatorId) {
    if (!creatorId) return { connected: false }
    const acc = await instagramRepo.getByCreatorId(creatorId)
    if (!acc || acc.status !== 'CONNECTED' || !acc.accessToken) {
      return { connected: false }
    }
    const isExpired = acc.tokenExpiresAt && new Date(acc.tokenExpiresAt) < new Date()
    if (isExpired) {
      return { connected: false, error: 'TOKEN_EXPIRED', status: 'EXPIRED' }
    }
    const rawUsername = acc.username || ''
    const cleanUsername = rawUsername ? (rawUsername.startsWith('@') ? rawUsername : `@${rawUsername}`) : ''
    return {
      connected: true,
      instagramUsername: cleanUsername,
      username: rawUsername,
      platformUserId: acc.platformUserId || '',
      platform: acc.platform || 'INSTAGRAM',
      status: 'CONNECTED',
      tokenExpiresAt: acc.tokenExpiresAt,
      updatedAt: acc.updatedAt,
    }
  },

  async getAccount(creatorId) {
    return this.getStatus(creatorId)
  },

  async getMedia(creatorId) {
    if (!creatorId) throw httpError(401, 'Unauthorized')
    const acc = await instagramRepo.getByCreatorId(creatorId)
    if (!acc || acc.status !== 'CONNECTED') {
      throw httpError(400, 'Instagram account not connected')
    }

    const accessToken = acc.accessToken
    const platformUserId = acc.platformUserId

    if (accessToken && !accessToken.startsWith('meta_tok_')) {
      try {
        const fields = 'id,caption,media_type,media_url,thumbnail_url,permalink,timestamp'
        const url = `https://graph.instagram.com/v19.0/${platformUserId || 'me'}/media?fields=${fields}&access_token=${accessToken}&limit=25`
        const res = await fetch(url)
        const data = await res.json()
        if (data.data && Array.isArray(data.data)) {
          return {
            media: data.data.map(item => ({
              id: item.id,
              caption: item.caption || '',
              mediaType: item.media_type === 'VIDEO' || item.media_type === 'REEL' ? 'REEL' : 'POST',
              mediaUrl: item.media_url || item.thumbnail_url || item.permalink || '',
              timestamp: item.timestamp || new Date().toISOString(),
            }))
          }
        }
      } catch (err) {
        console.error('Failed to fetch Instagram media from Meta API:', err)
      }
    }

    // Dev/Demo fallback media for testing & mock accounts
    return {
      media: [
        {
          id: `media_reel_1_${creatorId.substring(0, 8)}`,
          caption: 'New AI tools I use for freelancing 🔥 Comment GUIDE to get my free template!',
          mediaType: 'REEL',
          mediaUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=500&auto=format&fit=crop&q=60',
          timestamp: new Date(Date.now() - 3600000 * 24).toISOString(),
        },
        {
          id: `media_post_2_${creatorId.substring(0, 8)}`,
          caption: 'Top 5 mistakes creators make in 2026 💡 Comment HELP for the complete breakdown',
          mediaType: 'POST',
          mediaUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=500&auto=format&fit=crop&q=60',
          timestamp: new Date(Date.now() - 3600000 * 72).toISOString(),
        },
        {
          id: `media_reel_3_${creatorId.substring(0, 8)}`,
          caption: 'How to automate your DMs in 60 seconds 🚀 Comment START below!',
          mediaType: 'REEL',
          mediaUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=500&auto=format&fit=crop&q=60',
          timestamp: new Date(Date.now() - 3600000 * 120).toISOString(),
        }
      ]
    }
  },

  getOAuthUrl(creatorId, returnUrl) {
    if (!creatorId) throw httpError(401, 'Creator ID required to generate OAuth state')

    const appId = process.env.META_INSTAGRAM_APP_ID || process.env.META_APP_ID || process.env.NEXT_PUBLIC_META_APP_ID || 'MOCK_META_APP_ID'
    const redirectUri = process.env.META_INSTAGRAM_REDIRECT_URI || process.env.META_REDIRECT_URI || getAppUrl('/api/integrations/instagram/callback')
    const scope = 'instagram_business_basic,instagram_business_manage_comments,instagram_business_manage_messages'

    // Cryptographically signed state token bound to creatorId with 10-minute expiry
    const stateToken = signPurpose({ creatorId, returnUrl: returnUrl || null, nonce: generateSecureToken() }, 'instagram_oauth_state', 600)

    return `https://www.instagram.com/oauth/authorize?client_id=${encodeURIComponent(appId)}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scope)}&response_type=code&state=${encodeURIComponent(stateToken)}`
  },

  async handleCallback(code, stateToken) {
    if (!code) throw httpError(400, 'Authorization code missing')
    if (!stateToken) throw httpError(400, 'OAuth state parameter missing')

    // Verify cryptographic OAuth state token before processing anything
    const verifiedState = verifyPurpose(stateToken, 'instagram_oauth_state')
    if (!verifiedState || !verifiedState.creatorId) {
      throw httpError(400, 'Invalid or expired OAuth state token')
    }

    const creatorId = verifiedState.creatorId
    const returnUrl = verifiedState.returnUrl || null

    const appId = process.env.META_INSTAGRAM_APP_ID || process.env.META_APP_ID || process.env.NEXT_PUBLIC_META_APP_ID
    const appSecret = process.env.META_INSTAGRAM_APP_SECRET || process.env.META_APP_SECRET
    const redirectUri = process.env.META_INSTAGRAM_REDIRECT_URI || process.env.META_REDIRECT_URI || getAppUrl('/api/integrations/instagram/callback')

    let accessToken = null
    let platformUserId = null
    let username = null
    let tokenExpiresAt = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000)

    const isTestCode = code.startsWith('mock_') || code.startsWith('test_') || process.env.META_TEST_MODE === 'true'

    if (appId && appSecret && !isTestCode) {
      try {
        // 1. Exchange short-lived token (tries api.instagram.com first, falls back to graph.facebook.com)
        let shortToken = null
        let igUserId = null

        try {
          const igFormData = new URLSearchParams({
            client_id: appId,
            client_secret: appSecret,
            grant_type: 'authorization_code',
            redirect_uri: redirectUri,
            code: code,
          })
          const igTokenRes = await fetch('https://api.instagram.com/oauth/access_token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: igFormData.toString(),
          })
          const igTokenData = await igTokenRes.json()
          if (igTokenData.access_token) {
            shortToken = igTokenData.access_token
            igUserId = igTokenData.user_id || igTokenData.user?.id
          }
        } catch (e) {
          console.warn('Instagram API short token exchange fallback:', e.message)
        }

        if (!shortToken) {
          const tokenRes = await fetch(`https://graph.facebook.com/v19.0/oauth/access_token?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&client_secret=${appSecret}&code=${code}`)
          const tokenData = await tokenRes.json()
          if (tokenData.error) {
            throw httpError(400, tokenData.error.message || 'Meta OAuth code exchange failed')
          }
          shortToken = tokenData.access_token
        }

        // 2. Exchange long-lived token
        try {
          const longRes = await fetch(`https://graph.instagram.com/access_token?grant_type=ig_exchange_token&client_secret=${appSecret}&access_token=${shortToken}`)
          const longData = await longRes.json()
          accessToken = longData.access_token || shortToken
        } catch (e) {
          const longRes = await fetch(`https://graph.facebook.com/v19.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${shortToken}`)
          const longData = await longRes.json()
          accessToken = longData.access_token || shortToken
        }

        // 3. Get user profile / Instagram business account
        try {
          const meIgRes = await fetch(`https://graph.instagram.com/v19.0/me?fields=id,username,user_id,account_type&access_token=${accessToken}`)
          const meIgData = await meIgRes.json()
          if (meIgData.username) {
            username = meIgData.username
            // Prioritize user_id (the canonical Instagram Professional User ID sent in webhook entry.id) over id (App-Scoped ID)
            platformUserId = meIgData.user_id || meIgData.id || igUserId
          }
        } catch (e) { }

        if (!username) {
          const meRes = await fetch(`https://graph.facebook.com/v19.0/me/accounts?access_token=${accessToken}`)
          const meData = await meRes.json()
          if (meData.data && meData.data.length > 0) {
            const pageId = meData.data[0].id
            const pageRes = await fetch(`https://graph.facebook.com/v19.0/${pageId}?fields=instagram_business_account,username&access_token=${accessToken}`)
            const pageData = await pageRes.json()
            if (pageData.instagram_business_account) {
              platformUserId = pageData.instagram_business_account.id
              const igRes = await fetch(`https://graph.facebook.com/v19.0/${platformUserId}?fields=username&access_token=${accessToken}`)
              const igData = await igRes.json()
              username = igData.username || pageData.username || 'creator_instagram'
            }
          }
          if (!username) username = meData.data?.[0]?.name?.toLowerCase().replace(/\s+/g, '_') || 'creator_instagram'
        }

        // 4. Subscribe connected Instagram account to Meta App webhooks via graph.instagram.com/{ig_user_id}/subscribed_apps
        const targetUserId = platformUserId || 'me'
        const subRes = await fetch(`https://graph.instagram.com/v19.0/${targetUserId}/subscribed_apps`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ access_token: accessToken, subscribed_fields: 'comments,messages' }),
        })
        const subData = await subRes.json()

        const subSuccess = subRes.ok && (subData.success === true || (Array.isArray(subData.data) && subData.data.length > 0))

        if (!subSuccess) {
          const errCode = subData?.error?.code || subRes.status
          const errMsg = subData?.error?.message || 'Webhook subscription rejected by Instagram Graph API'
          console.error(`[INSTAGRAM_OAUTH_SUBSCRIBE_FAILED] HTTP Status: ${subRes.status}, Code: ${errCode}, Message: "${errMsg}"`)
          throw httpError(400, `Instagram webhook subscription failed: ${errMsg} (Meta Error Code: ${errCode})`)
        }

        console.log(`[INSTAGRAM_OAUTH_SUBSCRIBE_SUCCESS] Webhook subscription verified for ${username} (${platformUserId}). Fields: comments,messages`)
      } catch (err) {
        if (err.status) throw err
        console.error('Meta OAuth API call error:', err.message)
        throw httpError(400, err.message || 'Failed to exchange Meta OAuth token')
      }
    } else {
      // Development/test fallback mode
      accessToken = `meta_tok_${generateSecureToken()}`
      username = `creator_${creatorId.slice(0, 8)}`
      platformUserId = `ig_id_${generateSecureToken().slice(0, 10)}`
    }

    const saved = await instagramRepo.upsert(creatorId, {
      platform: 'INSTAGRAM',
      platformUserId,
      username,
      accessToken,
      tokenExpiresAt,
      status: 'CONNECTED',
    })

    return {
      connected: true,
      username: saved.username,
      platform: saved.platform,
      status: saved.status,
      returnUrl,
    }
  },

  async disconnectAccount(creatorId) {
    if (!creatorId) throw httpError(401, 'Unauthorized')
    await instagramRepo.deleteByCreatorId(creatorId)
    return { success: true }
  }
}

function getAutomationHealth(auto, igAcc) {
  if (auto.status === 'PAUSED') return 'PAUSED'
  if (!igAcc || igAcc.status !== 'CONNECTED') return 'INSTAGRAM_DISCONNECTED'
  if (igAcc.tokenExpiresAt && new Date(igAcc.tokenExpiresAt) < new Date()) return 'TOKEN_EXPIRED'
  return 'ACTIVE'
}

export const automationService = {
  async listAutomations(creatorId) {
    if (!creatorId) return []
    const items = await automationsRepo.list(creatorId)
    const igAcc = await instagramRepo.getByCreatorId(creatorId)

    return await Promise.all(items.map(async (item) => {
      const metrics = await automationEventsRepo.getMetricsForAutomation(item.id)
      const healthStatus = getAutomationHealth(item, igAcc)
      return {
        ...item,
        healthStatus,
        metrics,
      }
    }))
  },

  async getAutomation(id, creatorId) {
    if (!id || !creatorId) throw httpError(400, 'Automation ID and Creator ID required')
    const item = await automationsRepo.getForCreator(id, creatorId)
    if (!item) throw httpError(404, 'Automation not found')

    const igAcc = await instagramRepo.getByCreatorId(creatorId)
    const metrics = await automationEventsRepo.getMetricsForAutomation(item.id)
    const healthStatus = getAutomationHealth(item, igAcc)
    return {
      ...item,
      healthStatus,
      metrics,
    }
  },

  async getAutomationEvents(id, creatorId, { limit = 20, offset = 0 } = {}) {
    if (!id || !creatorId) throw httpError(400, 'Automation ID and Creator ID required')
    const item = await automationsRepo.getForCreator(id, creatorId)
    if (!item) throw httpError(404, 'Automation not found')
    return await automationEventsRepo.listEventsForAutomation(id, creatorId, { limit, offset })
  },

  async createAutomation(creatorId, data) {
    if (!creatorId) throw httpError(401, 'Unauthorized')
    await creatorSubscriptionService.assertActiveEntitlement(creatorId, 'automations')

    // Check Instagram connection status
    const igAcc = await instagramRepo.getByCreatorId(creatorId)
    const isConnected = igAcc && igAcc.status === 'CONNECTED' && Boolean(igAcc.accessToken) && (!igAcc.tokenExpiresAt || new Date(igAcc.tokenExpiresAt) > new Date())
    if (!isConnected) {
      throw httpError(403, 'Connect your Instagram account before creating an automation.', 'INSTAGRAM_NOT_CONNECTED')
    }

    // Plan Entitlement Check: AutoDM Campaign limits
    const subStatus = await creatorSubscriptionService.getStatus(creatorId).catch(() => null)
    const planId = subStatus?.planId || 'UNSUBSCRIBED'
    if (planId === 'UNSUBSCRIBED' || (subStatus?.status !== 'ACTIVE' && subStatus?.status !== 'TRIALING')) {
      const pricing = getSubscriptionPricing()
      throw httpError(403, `A paid plan (Creator ${pricing.CREATOR.priceFormatted}/mo or Pro ${pricing.PRO.priceFormatted}/mo) is required to activate live Instagram AutoDM campaigns.`)
    }
    const limit = getEntitlementLimit(planId, 'autoDmCampaignsLimit')
    const currentAutomations = await automationsRepo.list(creatorId)
    if (currentAutomations && currentAutomations.length >= limit) {
      const pricing = getSubscriptionPricing()
      throw httpError(403, `Creator plan is limited to 3 AutoDM campaigns. Upgrade to Pro (${pricing.PRO.priceFormatted}/mo) for unlimited campaigns.`)
    }

    const name = sanitizeText(data.name || '').trim()
    const rawKeywords = Array.isArray(data.keywords) && data.keywords.length > 0
      ? data.keywords.map(k => String(k).trim()).filter(Boolean)
      : (data.triggerValue ? String(data.triggerValue).split(',').map(k => k.trim()).filter(Boolean) : [])

    const triggerValue = rawKeywords.length > 0 ? rawKeywords.join(', ') : sanitizeText(data.triggerValue || '').trim()
    const destinationType = (data.destinationType || 'PRODUCT').toUpperCase()
    const isCustomLink = destinationType === 'CUSTOM_LINK'

    if (!name) throw httpError(400, 'Automation name is required')
    if (rawKeywords.length === 0 && !triggerValue) throw httpError(400, 'Trigger keyword cannot be empty')

    let productId = null
    let customUrl = null

    if (isCustomLink) {
      const validated = validateCustomUrl(data.customUrl)
      if (!validated) throw httpError(400, 'Please enter a valid custom HTTPS URL')
      customUrl = validated
    } else {
      productId = data.productId
      if (!productId) throw httpError(400, 'Product selection is required')
      const product = await productsRepo.getForCreator(productId, creatorId)
      if (!product) {
        throw httpError(403, 'Selected product was not found or does not belong to you')
      }
    }

    const message = sanitizeText(data.message || '').trim()

    return await automationsRepo.create({
      creatorId,
      name,
      platform: 'INSTAGRAM',
      triggerType: 'COMMENT_KEYWORD',
      triggerValue,
      actionType: 'SEND_DM',
      productId: productId || null,
      customUrl: customUrl || null,
      destinationType: isCustomLink ? 'CUSTOM_LINK' : 'PRODUCT',
      message: message || (isCustomLink ? "Here's the link you requested 👇" : "Here's the resource you requested 👇"),
      mediaId: data.mediaId || null,
      mediaType: data.mediaType || 'ALL',
      mediaUrl: data.mediaUrl || null,
      mediaCaption: data.mediaCaption || null,
      keywords: rawKeywords,
      commentReply: data.commentReply ? sanitizeText(data.commentReply).trim() : null,
      openingMessageEnabled: Boolean(data.openingMessageEnabled),
      openingMessage: data.openingMessage ? sanitizeText(data.openingMessage).trim() : null,
      openingButtonText: data.openingButtonText ? sanitizeText(data.openingButtonText).trim() : 'Send me the link',
      buttonText: data.buttonText ? sanitizeText(data.buttonText).trim() : (isCustomLink ? 'Get it here' : 'Get access'),
      responses: Array.isArray(data.responses) ? data.responses : [],
      status: data.status === 'PAUSED' ? 'PAUSED' : 'ACTIVE',
    })
  },

  async updateAutomation(id, creatorId, data) {
    if (!id || !creatorId) throw httpError(400, 'Missing automation ID')
    const existing = await automationsRepo.getForCreator(id, creatorId)
    if (!existing) throw httpError(404, 'Automation not found')

    const updateData = {}
    if (data.name !== undefined) {
      const name = sanitizeText(data.name || '').trim()
      if (!name) throw httpError(400, 'Automation name cannot be empty')
      updateData.name = name
    }
    if (data.keywords !== undefined || data.triggerValue !== undefined) {
      const rawKeywords = Array.isArray(data.keywords) && data.keywords.length > 0
        ? data.keywords.map(k => String(k).trim()).filter(Boolean)
        : (data.triggerValue ? String(data.triggerValue).split(',').map(k => k.trim()).filter(Boolean) : [])

      const keyword = rawKeywords.length > 0 ? rawKeywords.join(', ') : sanitizeText(data.triggerValue || '').trim()
      if (rawKeywords.length === 0 && !keyword) throw httpError(400, 'Trigger keyword cannot be empty')
      updateData.keywords = rawKeywords
      updateData.triggerValue = keyword
    }

    if (data.destinationType !== undefined) {
      const dest = String(data.destinationType).toUpperCase()
      updateData.destinationType = dest === 'CUSTOM_LINK' ? 'CUSTOM_LINK' : 'PRODUCT'
    }

    const effectiveDest = updateData.destinationType || existing.destinationType || 'PRODUCT'

    if (effectiveDest === 'CUSTOM_LINK') {
      if (data.customUrl !== undefined) {
        const validated = validateCustomUrl(data.customUrl)
        if (!validated) throw httpError(400, 'Please enter a valid custom HTTPS URL')
        updateData.customUrl = validated
      }
      if (data.productId !== undefined) {
        updateData.productId = null
      }
    } else {
      if (data.productId !== undefined) {
        if (!data.productId) throw httpError(400, 'Product selection is required')
        const product = await productsRepo.getForCreator(data.productId, creatorId)
        if (!product) throw httpError(403, 'Selected product does not belong to you')
        updateData.productId = data.productId
      }
      if (data.customUrl !== undefined) {
        updateData.customUrl = null
      }
    }

    if (data.message !== undefined) {
      updateData.message = sanitizeText(data.message || '').trim()
    }
    if (data.mediaId !== undefined) updateData.mediaId = data.mediaId
    if (data.mediaType !== undefined) updateData.mediaType = data.mediaType
    if (data.mediaUrl !== undefined) updateData.mediaUrl = data.mediaUrl
    if (data.mediaCaption !== undefined) updateData.mediaCaption = data.mediaCaption
    if (data.commentReply !== undefined) updateData.commentReply = data.commentReply ? sanitizeText(data.commentReply).trim() : null
    if (data.openingMessageEnabled !== undefined) updateData.openingMessageEnabled = Boolean(data.openingMessageEnabled)
    if (data.openingMessage !== undefined) updateData.openingMessage = data.openingMessage ? sanitizeText(data.openingMessage).trim() : null
    if (data.openingButtonText !== undefined) updateData.openingButtonText = data.openingButtonText ? sanitizeText(data.openingButtonText).trim() : 'Send me the link'
    if (data.buttonText !== undefined) updateData.buttonText = data.buttonText ? sanitizeText(data.buttonText).trim() : 'Get access'
    if (data.responses !== undefined) updateData.responses = Array.isArray(data.responses) ? data.responses : []

    if (data.status !== undefined && !data.statusOnly) {
      updateData.status = data.status === 'PAUSED' ? 'PAUSED' : 'ACTIVE'
    } else if (data.statusOnly && data.status) {
      updateData.status = data.status === 'PAUSED' ? 'PAUSED' : 'ACTIVE'
    }

    if (updateData.status === 'ACTIVE') {
      const igAcc = await instagramRepo.getByCreatorId(creatorId)
      const isConnected = igAcc && igAcc.status === 'CONNECTED' && Boolean(igAcc.accessToken) && (!igAcc.tokenExpiresAt || new Date(igAcc.tokenExpiresAt) > new Date())
      if (!isConnected) {
        throw httpError(403, 'Connect your Instagram account before creating an automation.', 'INSTAGRAM_NOT_CONNECTED')
      }
    }

    return await automationsRepo.update(id, creatorId, updateData)
  },

  async toggleStatus(id, creatorId, newStatus) {
    if (!id || !creatorId) throw httpError(400, 'Automation ID required')
    const status = String(newStatus || '').toUpperCase()
    if (!['ACTIVE', 'PAUSED'].includes(status)) throw httpError(400, 'Invalid status')

    // Check IG account if activating
    if (status === 'ACTIVE') {
      const igAcc = await instagramRepo.getByCreatorId(creatorId)
      const isConnected = igAcc && igAcc.status === 'CONNECTED' && Boolean(igAcc.accessToken) && (!igAcc.tokenExpiresAt || new Date(igAcc.tokenExpiresAt) > new Date())
      if (!isConnected) {
        throw httpError(403, 'Connect your Instagram account before creating an automation.', 'INSTAGRAM_NOT_CONNECTED')
      }
    }

    return await automationsRepo.update(id, creatorId, { status })
  },

  async deleteAutomation(id, creatorId) {
    if (!id || !creatorId) throw httpError(400, 'Automation ID required')
    const existing = await automationsRepo.getForCreator(id, creatorId)
    if (!existing) throw httpError(404, 'Automation not found')
    return await automationsRepo.delete(id, creatorId)
  }
}

export function matchKeyword(commentText, keyword) {
  if (!commentText || !keyword) return false
  const cleanComment = String(commentText).toLowerCase().trim()
  const cleanKeyword = String(keyword).toLowerCase().trim()
  if (!cleanComment || !cleanKeyword) return false

  const escaped = cleanKeyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const boundaryRegex = new RegExp(`\\b${escaped}\\b`, 'i')
  return boundaryRegex.test(cleanComment)
}

export const instagramMessagingService = {
  async processWebhookEvent(payload) {
    console.log('[INSTAGRAM_WEBHOOK] Received Webhook Payload:', JSON.stringify(payload, null, 2))
    if (!payload || !payload.entry) return { processed: false, reason: 'Invalid payload' }

    let processedCount = 0
    let skippedCount = 0

    for (const entry of payload.entry || []) {
      const platformUserId = entry.id || entry.uid
      console.log('[INSTAGRAM_WEBHOOK] Processing entry for platformUserId:', platformUserId)

      // 1. Resolve Creator from Instagram Account ID (platformUserId)
      let igAcc = null
      if (platformUserId) {
        igAcc = await instagramRepo.getByPlatformUserId(platformUserId)
      }

      for (const change of entry.changes || []) {
        if (change.field === 'comments' && change.value) {
          const commentVal = change.value
          const commentText = (commentVal.text || '').trim()
          const senderId = commentVal.from?.id || commentVal.from_id
          const commentId = commentVal.id || commentVal.comment_id
          const mediaId = commentVal.media?.id || commentVal.post_id || commentVal.media_id

          console.log('[INSTAGRAM_WEBHOOK_PARSED_COMMENT]', {
            platformUserId,
            commentId,
            commentText,
            senderId,
            mediaId
          })

          if (!commentText || !commentId) continue

          // Fallback if platformUserId was on comment value
          const targetPlatformId = platformUserId || commentVal.recipient_id
          if (!igAcc && targetPlatformId) {
            igAcc = await instagramRepo.getByPlatformUserId(targetPlatformId)
          }

          const isMatched = !!igAcc && igAcc.status === 'CONNECTED'
          console.log('[INSTAGRAM_WEBHOOK_ACCOUNT_MATCH]', {
            incomingPlatformUserId: platformUserId,
            matched: isMatched,
            matchedAccountId: igAcc ? igAcc.id : null,
            matchedUsername: igAcc ? igAcc.username : null,
            ACCOUNT_MATCH: isMatched ? 'YES' : 'NO'
          })

          // If no connected Instagram account found or status is not CONNECTED, ignore safely
          if (!igAcc || igAcc.status !== 'CONNECTED') {
            console.log(`[INSTAGRAM_WEBHOOK] Ignored comment ${commentId}: Instagram account not connected`)
            skippedCount++
            continue
          }

          const creatorId = igAcc.creatorId

          // 2. Fetch active automations belonging strictly to THIS creator
          const activeAutomations = await automationsRepo.findActiveByCreatorId(creatorId)
          console.log(`[INSTAGRAM_WEBHOOK_AUTOMATIONS_FOUND] Total active automations for creator ${creatorId}: ${activeAutomations.length}`)

          // 3. Filter automations matching keyword and mediaId
          const matchingAutomations = activeAutomations.filter(auto => {
            const rawKw = Array.isArray(auto.keywords) && auto.keywords.length > 0
              ? auto.keywords
              : (auto.triggerValue ? String(auto.triggerValue).split(',').map(k => k.trim()).filter(Boolean) : [])

            const matchesKeyword = rawKw.some(kw => {
              const cleanKw = String(kw).trim().toLowerCase()
              return cleanKw && commentText.toLowerCase().includes(cleanKw)
            })

            if (!matchesKeyword) return false

            if (auto.mediaId && auto.mediaId !== 'ALL' && mediaId && auto.mediaId !== mediaId) {
              return false
            }

            return true
          })

          if (matchingAutomations.length === 0) {
            console.log(`[INSTAGRAM_WEBHOOK_NO_MATCH] Comment ${commentId} "${commentText}" did not match any active automation keywords/media.`)
            skippedCount++
            continue
          }

          // Sort matching automations: prioritize specific mediaId match over 'ALL'
          matchingAutomations.sort((a, b) => {
            const aSpecific = a.mediaId && a.mediaId !== 'ALL' ? 1 : 0
            const bSpecific = b.mediaId && b.mediaId !== 'ALL' ? 1 : 0
            return bSpecific - aSpecific
          })

          // Execute ONLY ONE automation for the comment
          const auto = matchingAutomations[0]

          const isCustomLink = auto.destinationType === 'CUSTOM_LINK' || auto.destinationType === 'CUSTOM_URL'
          const product = auto.product
          const store = auto.creator?.store
          const creatorProfile = auto.creator?.creatorProfile

          let destinationUrl = ''
          let defaultButtonLabel = ''
          let productTitle = ''
          let targetProductId = null

          const appUrl = getAppUrl()

          if (isCustomLink) {
            const validatedUrl = validateCustomUrl(auto.customUrl)
            if (!validatedUrl) {
              console.error(`[INSTAGRAM_WEBHOOK_INVALID_CUSTOM_URL] Automation ${auto.id} has invalid customUrl: "${auto.customUrl}"`)
              skippedCount++
              continue
            }

            // CUSTOM URL DESTINATION RULE:
            // Use the creator's validated customUrl directly on the DM button target
            destinationUrl = validatedUrl
            defaultButtonLabel = 'Get it here'
            productTitle = 'Resource'
          } else {
            if (!product || product.creatorId !== creatorId) {
              console.log(`[INSTAGRAM_WEBHOOK_PRODUCT_MISMATCH] Product missing or does not belong to creator`)
              skippedCount++
              continue
            }
            targetProductId = product.id
            productTitle = product.title || 'Product'

            const refToken = attributionService.generateAttributionToken({ creatorId, automationId: auto.id, productId: product.id })
            destinationUrl = `${appUrl}/r/${refToken}`

            const isFree = Number(product.price || 0) === 0
            defaultButtonLabel = isFree ? `Get ${productTitle}`.slice(0, 20) : `Get ${productTitle}`.slice(0, 20)
          }

          // 4. ATOMIC IDEMPOTENCY CHECK BEFORE ANY SIDE EFFECTS (PUBLIC REPLY OR PRIVATE DM)
          const claimResult = await automationEventsRepo.claimCommentEvent({
            creatorId,
            automationId: auto.id,
            instagramAccountId: igAcc.id,
            productId: targetProductId,
            commentId,
          })

          if (!claimResult.claimed) {
            console.log('[INSTAGRAM_WEBHOOK_DEDUP]', {
              commentId,
              automationId: auto.id,
              action: 'SKIP_DUPLICATE'
            })
            skippedCount++
            continue
          }

          const creatorName = creatorProfile?.name || store?.storeName || 'Creator'
          const buttonTitle = (auto.buttonText || defaultButtonLabel).trim().slice(0, 20)

          let dmText = ''
          if (auto.openingMessageEnabled && auto.openingMessage) {
            dmText = auto.openingMessage.trim()
              .replace(/\{\{\s*product_name\s*\}\}/g, productTitle)
              .replace(/\{\{\s*creator_name\s*\}\}/g, creatorName)
              .replace(/\{\{\s*link\s*\}\}/g, '')
              .replace(/\{\{\s*product_link\s*\}\}/g, '')
              .trim()
          } else {
            const defaultTemplate = `Here's the {{product_name}} you requested 👇`
            const template = (auto.message || defaultTemplate).trim()
            dmText = template
              .replace(/\{\{\s*product_name\s*\}\}/g, productTitle)
              .replace(/\{\{\s*creator_name\s*\}\}/g, creatorName)
              .replace(/\{\{\s*link\s*\}\}/g, '')
              .replace(/\{\{\s*product_link\s*\}\}/g, '')
              .trim()
          }

          if (!dmText) {
            dmText = `Here's the ${productTitle} you requested 👇`
          }

          // Send Public Comment Reply ONCE after idempotency claim
          let replySuccess = false
          let replyHttpStatus = null
          if (auto.commentReply && auto.commentReply.trim()) {
            const replyMsg = auto.commentReply.trim()
            console.log(`[INSTAGRAM_WEBHOOK_PUBLIC_REPLY_ATTEMPT] Comment ${commentId}: "${replyMsg}"`)
            const replyRes = await this.sendPublicCommentReply({
              commentId,
              message: replyMsg,
              accessToken: igAcc.accessToken,
            })
            replySuccess = !!replyRes.sent
            replyHttpStatus = replyRes.httpStatus || (replySuccess ? 200 : 500)
            console.log('[INSTAGRAM_COMMENT_REPLY]', {
              commentId,
              automationId: auto.id,
              success: replySuccess,
              httpStatus: replyHttpStatus
            })
          }

          // Send Private Reply via Meta Graph API
          console.log(`[INSTAGRAM_WEBHOOK_DM_ATTEMPT] Comment ${commentId} -> Recipient ${senderId}: Text: "${dmText}", Button: "${buttonTitle}", URL: "${destinationUrl}"`)
          const res = await this.sendDirectMessage({
            commentId,
            recipientId: senderId,
            text: dmText,
            buttonTitle,
            buttonUrl: destinationUrl,
            accessToken: igAcc.accessToken,
            platformUserId: igAcc.platformUserId,
            instagramAccountId: igAcc.id,
          })

          console.log(`[INSTAGRAM_WEBHOOK_DM_RESULT]`, res)

          if (res.sent) {
            processedCount++
            await automationEventsRepo.recordEvent({
              creatorId,
              automationId: auto.id,
              instagramAccountId: igAcc.id,
              productId: targetProductId,
              commentId,
              eventType: 'DM_SENT',
              metadata: { messageId: res.messageId, format: res.format, destinationUrl },
            })
          } else {
            console.error(`[INSTAGRAM_WEBHOOK] Failed to send private reply for comment ${commentId}:`, res.error || res.reason)
            await automationEventsRepo.recordEvent({
              creatorId,
              automationId: auto.id,
              instagramAccountId: igAcc.id,
              productId: targetProductId,
              commentId,
              eventType: 'DM_FAILED',
              status: 'FAILED',
              metadata: { error: res.error || res.reason },
            })
          }
        }
      }
    }

    return { processed: true, count: processedCount, skipped: skippedCount }
  },

  async sendPublicCommentReply({ commentId, message, accessToken }) {
    if (!commentId || !message) return { sent: false, reason: 'Missing commentId or message' }
    if (accessToken && !accessToken.startsWith('meta_tok_')) {
      try {
        const apiVersion = process.env.META_API_VERSION || 'v21.0'
        const endpoint = `https://graph.instagram.com/${apiVersion}/${commentId}/replies`
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ message }),
        })
        const data = await res.json()
        const httpStatus = res.status

        if (res.ok && data.id) {
          console.log('[INSTAGRAM_COMMENT_REPLY]', {
            commentId,
            success: true,
            httpStatus,
            replyId: data.id,
          })
          return { sent: true, id: data.id, httpStatus }
        } else {
          const err = data.error || {}
          console.error('[INSTAGRAM_COMMENT_REPLY]', {
            commentId,
            success: false,
            httpStatus,
            code: err.code || null,
            type: err.type || null,
            message: err.message || 'Unknown Meta API error',
          })
          return { sent: false, httpStatus, error: err.message || 'Meta API error', code: err.code, type: err.type }
        }
      } catch (err) {
        console.error('[INSTAGRAM_COMMENT_REPLY]', {
          commentId,
          success: false,
          httpStatus: 500,
          error: err.message,
        })
        return { sent: false, httpStatus: 500, error: err.message }
      }
    } else {
      console.log('[INSTAGRAM_COMMENT_REPLY]', {
        commentId,
        success: true,
        httpStatus: 200,
        devMode: true,
      })
      return { sent: true, devMode: true, httpStatus: 200 }
    }
  },

  async sendDirectMessage({ commentId, recipientId, text, buttonTitle, buttonUrl, message, accessToken, platformUserId, instagramAccountId }) {
    const messageText = text || message
    if (!messageText && !buttonUrl) return { sent: false, reason: 'Missing message content' }

    if (accessToken && !accessToken.startsWith('meta_tok_')) {
      const apiVersion = process.env.META_API_VERSION || 'v21.0'
      const igUserId = platformUserId || 'me'
      const endpoint = `https://graph.instagram.com/${apiVersion}/${igUserId}/messages`

      const cleanButtonTitle = (buttonTitle || 'Get Access').trim().slice(0, 20)

      // Define recipient formats to attempt: comment_id first (for 7-day private reply window), then id (IGSID)
      const recipientOptions = []
      if (commentId) recipientOptions.push({ type: 'comment_id', recipient: { comment_id: commentId } })
      if (recipientId) recipientOptions.push({ type: 'user_id', recipient: { id: recipientId } })

      // Attempt 1 & 2: Structured Templates (Generic & Button)
      if (buttonUrl && cleanButtonTitle) {
        for (const opt of recipientOptions) {
          // A. Generic Template
          try {
            const genericPayload = {
              recipient: opt.recipient,
              message: {
                attachment: {
                  type: 'template',
                  payload: {
                    template_type: 'generic',
                    elements: [
                      {
                        title: (messageText || 'Here is your requested resource 👇').trim().slice(0, 80),
                        buttons: [
                          {
                            type: 'web_url',
                            url: buttonUrl,
                            title: cleanButtonTitle,
                          },
                        ],
                      },
                    ],
                  },
                },
              },
            }

            const res = await fetch(endpoint, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`,
              },
              body: JSON.stringify(genericPayload),
            })

            const data = await res.json()
            if (res.ok && (data.message_id || data.id)) {
              console.log(`[INSTAGRAM_DM_SUCCESS] Format: generic_template, RecipientType: ${opt.type}, MessageId: ${data.message_id || data.id}`)
              return { sent: true, messageId: data.message_id || data.id, format: `generic_template_${opt.type}` }
            } else {
              const err = data.error || {}
              console.warn(`[INSTAGRAM_DM_ATTEMPT_FAILED] Format: generic_template, RecipientType: ${opt.type}, Status: ${res.status}`, {
                code: err.code,
                type: err.type,
                message: err.message,
                subcode: err.error_subcode,
              })
            }
          } catch (e) {
            console.warn(`[INSTAGRAM_DM_GENERIC_TEMPLATE_ERROR] RecipientType: ${opt.type}`, e.message)
          }

          // B. Button Template
          try {
            const buttonPayload = {
              recipient: opt.recipient,
              message: {
                attachment: {
                  type: 'template',
                  payload: {
                    template_type: 'button',
                    text: (messageText || 'Here is your requested resource 👇').trim().slice(0, 640),
                    buttons: [
                      {
                        type: 'web_url',
                        url: buttonUrl,
                        title: cleanButtonTitle,
                      },
                    ],
                  },
                },
              },
            }

            const res = await fetch(endpoint, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`,
              },
              body: JSON.stringify(buttonPayload),
            })

            const data = await res.json()
            if (res.ok && (data.message_id || data.id)) {
              console.log(`[INSTAGRAM_DM_SUCCESS] Format: button_template, RecipientType: ${opt.type}, MessageId: ${data.message_id || data.id}`)
              return { sent: true, messageId: data.message_id || data.id, format: `button_template_${opt.type}` }
            } else {
              const err = data.error || {}
              console.warn(`[INSTAGRAM_DM_ATTEMPT_FAILED] Format: button_template, RecipientType: ${opt.type}, Status: ${res.status}`, {
                code: err.code,
                type: err.type,
                message: err.message,
                subcode: err.error_subcode,
              })
            }
          } catch (e) {
            console.warn(`[INSTAGRAM_DM_BUTTON_TEMPLATE_ERROR] RecipientType: ${opt.type}`, e.message)
          }
        }
      }

      // Attempt 3: Standard Text Message via comment_id (Meta's guaranteed private reply format)
      try {
        const primaryRecipient = commentId ? { comment_id: commentId } : { id: recipientId }
        const formattedMessage = buttonUrl
          ? `${messageText}\n\n[ ${cleanButtonTitle} ]\n${buttonUrl}`
          : messageText

        const textPayload = {
          recipient: primaryRecipient,
          message: { text: formattedMessage },
        }

        const res = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
          },
          body: JSON.stringify(textPayload),
        })

        const data = await res.json()
        if (res.ok && (data.message_id || data.id)) {
          console.log(`[INSTAGRAM_DM_SUCCESS] Format: text, MessageId: ${data.message_id || data.id}`)
          return { sent: true, messageId: data.message_id || data.id, format: 'text' }
        }

        const err = data.error || {}
        console.error('[INSTAGRAM_PRIVATE_REPLY_FAILED]', {
          httpStatus: res.status,
          metaErrorCode: err.code || null,
          metaErrorType: err.type || null,
          metaErrorMessage: err.message || 'Unknown Meta API error',
          commentId: commentId || null,
          instagramAccountId: instagramAccountId || platformUserId || null,
        })

        return {
          sent: false,
          error: err.message || `HTTP ${res.status} Meta API error`,
          code: err.code,
          status: res.status,
        }
      } catch (err) {
        console.error('[INSTAGRAM_PRIVATE_REPLY_NETWORK_ERROR]', {
          message: err.message,
          commentId: commentId || null,
          instagramAccountId: instagramAccountId || platformUserId || null,
        })
        return { sent: false, error: err.message }
      }
    } else {
      console.log(`[INSTAGRAM_DM_DEV_MODE] Private reply posted for comment ${commentId}: "${messageText}"`)
      return { sent: true, devMode: true, messageId: `dev_msg_${Date.now()}` }
    }
  }
}

// ---------------- helpers ----------------

function pick(obj, keys) {
  const out = {}
  keys.forEach((k) => { if (obj[k] !== undefined) out[k] = obj[k] })
  return out
}
export function httpError(status, message, code) {
  const e = new Error(message)
  e.status = status
  if (code) e.code = code
  return e
}

