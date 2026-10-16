/**
 * CreatorStore Central Analytics Utility
 * Google Analytics 4 (GA4) + Google Tag Manager (GTM)
 *
 * Production-ready, privacy-first analytics abstraction.
 * Compliant with GDPR/CCPA - NEVER collects PII (passwords, emails, phone numbers, tokens).
 */

declare global {
  interface Window {
    dataLayer?: any[];
    gtag?: (...args: any[]) => void;
  }
}

declare const process: {
  env: Record<string, string | undefined>;
};

export const GA_MEASUREMENT_ID = (process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || '').trim();
export const GTM_ID = (process.env.NEXT_PUBLIC_GTM_ID || '').trim();
export const IS_ANALYTICS_DEBUG = process.env.NEXT_PUBLIC_ANALYTICS_DEBUG === 'true';

// Determine if analytics is active
export function isAnalyticsEnabled(): boolean {
  // Explicit override via environment variable
  if (process.env.NEXT_PUBLIC_ANALYTICS_ENABLED === 'false') {
    return false;
  }
  if (process.env.NEXT_PUBLIC_ANALYTICS_ENABLED === 'true') {
    return true;
  }

  // Enabled by default if either GA4 or GTM is provided
  return Boolean(GA_MEASUREMENT_ID || GTM_ID);
}

// Blocklist of sensitive parameter keys that must never be sent to analytics
const SENSITIVE_KEYS = new Set([
  'password',
  'passwd',
  'secret',
  'token',
  'key',
  'email',
  'customeremail',
  'customer_email',
  'user_email',
  'phone',
  'customerphone',
  'phonenumber',
  'customer_phone',
  'contact',
  'authorization',
  'cookie',
  'session',
  'jwt',
  'card',
  'cvv',
  'upi',
  'bank',
  'downloadurl',
  'download_url',
  'signedurl',
  'fileurl',
  'file_url',
]);

// Helper to sanitize parameter values and remove any accidental PII
export function sanitizeParams(params?: Record<string, any>): Record<string, any> {
  if (!params || typeof params !== 'object') return {};

  const clean: Record<string, any> = {};

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) continue;

    const cleanKey = key.toLowerCase().replace(/[^a-z0-9_]/g, '');
    const normalizedKey = cleanKey.replace(/_/g, '');

    // Check against sensitive keywords or pattern matches
    const isSensitive =
      SENSITIVE_KEYS.has(normalizedKey) ||
      SENSITIVE_KEYS.has(cleanKey) ||
      normalizedKey.includes('password') ||
      normalizedKey.includes('secret') ||
      normalizedKey.includes('token') ||
      normalizedKey.includes('email') ||
      normalizedKey.includes('phone') ||
      normalizedKey.includes('auth') ||
      normalizedKey.includes('cookie') ||
      normalizedKey.includes('session') ||
      normalizedKey.includes('card') ||
      normalizedKey.includes('cvv') ||
      normalizedKey.includes('upi') ||
      normalizedKey.includes('downloadurl') ||
      normalizedKey.includes('fileurl') ||
      normalizedKey.includes('privatekey');

    if (isSensitive) {
      continue; // Drop sensitive field entirely
    }

    // Check for string values that look like email addresses or tokens
    if (typeof value === 'string') {
      const trimmed = value.trim();
      // Drop if looks like email
      if (trimmed.includes('@') && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
        continue;
      }
      // Drop if looks like JWT
      if (trimmed.startsWith('eyJh') && trimmed.length > 50) {
        continue;
      }
      // Limit length to prevent arbitrary text leakage
      clean[cleanKey] = trimmed.slice(0, 100);
    } else if (typeof value === 'number' || typeof value === 'boolean') {
      clean[cleanKey] = value;
    } else if (Array.isArray(value)) {
      // If array of items (like GA4 ecommerce items), sanitize each item
      clean[cleanKey] = value.slice(0, 20).map((item) => {
        if (item && typeof item === 'object') {
          return sanitizeParams(item);
        }
        return typeof item === 'string' ? item.slice(0, 50) : item;
      });
    }
  }

  return clean;
}

// Convert string to standard lowercase snake_case
function sanitizeEventName(name: string): string {
  return String(name || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

/**
 * Idempotency Protection for Purchases
 * Ensures an order ID only triggers one purchase event per browser session
 */
const inMemoryTrackedPurchases = new Set<string>();

export function isPurchaseTracked(orderId: string): boolean {
  if (!orderId) return true;
  const idStr = String(orderId).trim();
  if (inMemoryTrackedPurchases.has(idStr)) return true;

  if (typeof window !== 'undefined') {
    try {
      const stored = sessionStorage.getItem('creatorstore_tracked_purchases');
      if (stored) {
        const list: string[] = JSON.parse(stored);
        if (Array.isArray(list) && list.includes(idStr)) {
          inMemoryTrackedPurchases.add(idStr);
          return true;
        }
      }
    } catch {
      // Ignore sessionStorage parsing errors
    }
  }
  return false;
}

export function markPurchaseTracked(orderId: string): void {
  if (!orderId) return;
  const idStr = String(orderId).trim();
  inMemoryTrackedPurchases.add(idStr);

  if (typeof window !== 'undefined') {
    try {
      const stored = sessionStorage.getItem('creatorstore_tracked_purchases');
      const list: string[] = stored ? JSON.parse(stored) : [];
      if (!list.includes(idStr)) {
        list.push(idStr);
        sessionStorage.setItem('creatorstore_tracked_purchases', JSON.stringify(list));
      }
    } catch {
      // Ignore sessionStorage write errors
    }
  }
}

/**
 * Low-level Central Dispatcher
 *
 * Target Architecture:
 *   Application -> dataLayer -> Google Tag Manager (GTM) -> Google Tag -> GA4
 *
 * When GTM is configured (GTM_ID present):
 *   Events are pushed EXCLUSIVELY to window.dataLayer.
 *   gtag('event') is NOT called to prevent duplicate events in Tag Assistant and GA4.
 *
 * Fallback (GTM_ID missing, direct GA4 present):
 *   Calls window.gtag('event') directly.
 */
export function trackEvent(eventName: string, rawParams?: Record<string, any>): void {
  if (typeof window === 'undefined') return;
  if (!isAnalyticsEnabled()) return;

  const sanitizedEventName = sanitizeEventName(eventName);
  if (!sanitizedEventName) return;

  const safeParams = sanitizeParams(rawParams);

  if (IS_ANALYTICS_DEBUG) {
    console.log(`[Analytics] ${sanitizedEventName}`, safeParams);
  }

  // Ensure window.dataLayer array exists
  window.dataLayer = window.dataLayer || [];

  // 1. Primary Architecture: When GTM is configured, route exclusively via dataLayer
  if (GTM_ID) {
    window.dataLayer.push({
      event: sanitizedEventName,
      ...safeParams,
    });
    return;
  }

  // 2. Fallback: Direct GA4 gtag ONLY when GTM is not present
  if (GA_MEASUREMENT_ID && typeof window.gtag === 'function') {
    try {
      window.gtag('event', sanitizedEventName, safeParams);
    } catch (e) {
      if (IS_ANALYTICS_DEBUG) {
        console.warn('[Analytics] gtag error:', e);
      }
    }
  } else {
    // Default safe push to dataLayer
    window.dataLayer.push({
      event: sanitizedEventName,
      ...safeParams,
    });
  }
}

/**
 * Route / Page View Tracking
 * Guards against duplicate fires on the same route
 */
let lastTrackedPath: string | null = null;
const trackedRouteViewEvents = new Set<string>();

export function trackPageView(path?: string, title?: string): void {
  if (typeof window === 'undefined') return;
  if (!isAnalyticsEnabled()) return;

  const currentPath = path || window.location.pathname;

  // Avoid firing duplicate page_views for the same path
  if (lastTrackedPath === currentPath) {
    return;
  }
  lastTrackedPath = currentPath;

  // Reset route-scoped view events on route transition
  trackedRouteViewEvents.clear();

  const currentTitle = title || (typeof document !== 'undefined' ? document.title : '');
  trackEvent('page_view', {
    page_path: currentPath,
    page_title: currentTitle,
  });
}

// Reset page view cache (useful for testing)
export function resetPageViewCache(): void {
  lastTrackedPath = null;
  trackedRouteViewEvents.clear();
}

/**
 * Tracks a route-scoped view event at most once per route navigation.
 * Prevents duplicate events caused by React Strict Mode double-invoking useEffect,
 * fast refresh during development, or component re-renders.
 */
function trackViewEventOnce(eventKey: string, eventName: string, params?: Record<string, any>): void {
  const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
  const dedupeKey = `${eventKey}:${currentPath}`;

  if (trackedRouteViewEvents.has(dedupeKey)) {
    if (IS_ANALYTICS_DEBUG) {
      console.log(`[Analytics] Ignored duplicate view event on ${currentPath}:`, dedupeKey);
    }
    return;
  }

  trackedRouteViewEvents.add(dedupeKey);
  trackEvent(eventName, params);
}

// ============================================================================
// CONVENIENCE BUSINESS FUNNEL HELPERS
// ============================================================================

// 1. LANDING PAGE
export function trackLandingPageView(): void {
  trackViewEventOnce('landing_page_view', 'landing_page_view');
}

export function trackHeroCtaClicked(location: string = 'hero'): void {
  trackEvent('hero_cta_clicked', { location });
}

export function trackPricingViewed(location: string = 'pricing'): void {
  trackViewEventOnce(`pricing_viewed:${location}`, 'pricing_viewed', { location });
}

export function trackPricingPlanSelected(params: {
  plan_id?: string;
  plan?: string;
  interval?: string;
  currency?: string;
}): void {
  const planName = String(params?.plan_id || params?.plan || 'starter').toLowerCase();
  trackEvent('pricing_plan_selected', {
    plan_id: planName,
    interval: params?.interval || 'monthly',
    currency: params?.currency || 'INR',
  });
}

export function trackSignupCtaClicked(location: string = 'navbar'): void {
  trackEvent('signup_cta_clicked', { location });
}

export function trackLoginClicked(location: string = 'navbar'): void {
  trackEvent('login_clicked', { location });
}

// 2. SIGNUP FUNNEL
export function trackSignupStarted(): void {
  trackViewEventOnce('signup_started', 'signup_started');
}

export function trackUsernameChecked(available: boolean): void {
  // CRITICAL: NEVER send the username string itself
  trackEvent('username_checked', { available: Boolean(available) });
}

export function trackUsernameAvailable(): void {
  trackEvent('username_available');
}

export function trackSignUp(method: 'email' | 'google'): void {
  trackEvent('sign_up', { method });
}

export function trackSignupCompleted(method: 'email' | 'google' = 'email'): void {
  trackEvent('signup_completed', { method });
}

export function trackLogin(method: 'email' | 'google' = 'email'): void {
  trackEvent('login', { method });
}

// 3. CREATOR ONBOARDING
export function trackOnboardingStarted(): void {
  trackViewEventOnce('onboarding_started', 'onboarding_started');
}

export function trackOnboardingStepCompleted(step: number): void {
  trackEvent('onboarding_step_completed', { step: Number(step) });
}

export function trackOnboardingCompleted(): void {
  trackEvent('onboarding_completed');
}

// 4. STORE
export function trackStoreCreated(params?: { store_type?: string }): void {
  trackEvent('store_created', {
    store_type: params?.store_type || 'standard',
  });
}

export function trackStorePublished(): void {
  trackEvent('store_published');
}

export function trackStoreUpdated(): void {
  trackEvent('store_updated');
}

export function trackStoreDesignUpdated(): void {
  trackEvent('store_design_updated');
}

export function trackStoreLinkAdded(): void {
  trackEvent('store_link_added');
}

export function trackStoreViewed(params?: { store_id?: string }): void {
  const storeId = params?.store_id || 'unknown';
  trackViewEventOnce(`store_viewed:${storeId}`, 'store_viewed', {
    store_id: storeId,
  });
}

// 5. PRODUCT
export function trackProductCreated(params?: { product_type?: string }): void {
  trackEvent('product_created', {
    product_type: params?.product_type || 'digital',
  });
}

export function trackProductUpdated(params?: { product_type?: string }): void {
  trackEvent('product_updated', {
    product_type: params?.product_type || 'digital',
  });
}

export function trackProductPublished(params?: { product_type?: string }): void {
  trackEvent('product_published', {
    product_type: params?.product_type || 'digital',
  });
}

export function trackProductViewed(params: {
  product_id?: string;
  product_type?: string;
}): void {
  const productId = params?.product_id || 'unknown';
  trackViewEventOnce(`product_viewed:${productId}`, 'product_viewed', {
    product_id: productId,
    product_type: params?.product_type || 'digital',
  });
}

// 6. CHECKOUT & PURCHASES
export function trackCheckoutStarted(params?: {
  product_id?: string;
  product_type?: string;
  value?: number;
  currency?: string;
}): void {
  trackEvent('checkout_started', {
    product_id: params?.product_id,
    product_type: params?.product_type || 'digital',
    value: params?.value,
    currency: params?.currency || 'INR',
  });
}

export function trackPaymentInitiated(params?: {
  product_id?: string;
  product_type?: string;
  value?: number;
  currency?: string;
}): void {
  trackEvent('payment_initiated', {
    product_id: params?.product_id,
    product_type: params?.product_type || 'digital',
    value: params?.value,
    currency: params?.currency || 'INR',
  });
}

export function trackPaymentCompleted(params?: {
  transaction_id?: string;
  value?: number;
  currency?: string;
}): void {
  trackEvent('payment_completed', {
    transaction_id: params?.transaction_id,
    value: params?.value,
    currency: params?.currency || 'INR',
  });
}

export function trackPaymentFailed(params?: {
  product_id?: string;
  reason?: string;
}): void {
  trackEvent('payment_failed', {
    product_id: params?.product_id,
    reason: params?.reason ? params.reason.slice(0, 100) : 'declined',
  });
}

export interface PurchaseItem {
  item_id?: string;
  item_name?: string;
  price?: number;
  quantity?: number;
}

export interface PurchaseParams {
  transaction_id: string;
  value: number;
  currency?: string;
  items?: PurchaseItem[];
}

/**
 * GA4 / GTM Purchase Event with Strict Idempotency Guard
 * Only fires once per order transaction ID
 */
export function trackPurchase(params: PurchaseParams): boolean {
  if (!params || !params.transaction_id) return false;
  const orderId = String(params.transaction_id).trim();

  // Block duplicate purchase events
  if (isPurchaseTracked(orderId)) {
    if (IS_ANALYTICS_DEBUG) {
      console.log(`[Analytics] Duplicate purchase event blocked for transaction: ${orderId}`);
    }
    return false;
  }

  markPurchaseTracked(orderId);

  const payload: Record<string, any> = {
    transaction_id: orderId,
    value: Number(params.value) || 0,
    currency: params.currency || 'INR',
  };

  if (Array.isArray(params.items) && params.items.length > 0) {
    payload.items = params.items.map((it) => ({
      item_id: it.item_id ? String(it.item_id) : undefined,
      item_name: it.item_name ? String(it.item_name).slice(0, 100) : undefined,
      price: it.price !== undefined ? Number(it.price) : undefined,
      quantity: it.quantity || 1,
    }));
  }

  trackEvent('purchase', payload);
  return true;
}

// 7. DOWNLOAD
export function trackDownloadStarted(params?: {
  product_id?: string;
  product_type?: string;
}): void {
  trackEvent('download_started', {
    product_id: params?.product_id,
    product_type: params?.product_type || 'digital',
  });
}

export function trackDownloadCompleted(params?: {
  product_id?: string;
  product_type?: string;
}): void {
  trackEvent('download_completed', {
    product_id: params?.product_id,
    product_type: params?.product_type || 'digital',
  });
}

export function trackDownloadFailed(params?: {
  product_id?: string;
  reason?: string;
}): void {
  trackEvent('download_failed', {
    product_id: params?.product_id,
    reason: params?.reason ? params.reason.slice(0, 100) : 'download_error',
  });
}

export function trackFreeProductDownload(params?: {
  product_id?: string;
  product_type?: string;
}): void {
  trackEvent('free_product_download', {
    product_id: params?.product_id,
    product_type: params?.product_type || 'digital',
  });
}
