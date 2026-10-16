'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import Script from 'next/script'
import {
  GA_MEASUREMENT_ID,
  GTM_ID,
  isAnalyticsEnabled,
  trackPageView,
} from '@/lib/analytics'

/**
 * Route Tracker for Next.js SPA Navigation
 * Automatically tracks page views on client-side route transitions without reloading.
 * Uses usePathname() so no Suspense boundary is needed.
 */
function RouteTracker() {
  const pathname = usePathname()

  useEffect(() => {
    if (!pathname) return
    const search = typeof window !== 'undefined' ? window.location.search : ''
    const fullPath = search ? `${pathname}${search}` : pathname
    trackPageView(fullPath)
  }, [pathname])

  return null
}

/**
 * Analytics Provider
 *
 * Target Architecture:
 *   Application -> dataLayer -> Google Tag Manager (GTM) -> Google Tag -> GA4
 *
 * When GTM_ID is provided (Primary Mode):
 *   ONLY the GTM container is loaded. GTM is the single orchestration layer.
 *   Direct GA4 gtag.js is NOT loaded on the page to prevent duplicate events
 *   (e.g., duplicate events from 'On-page gtag(config)').
 *
 * Fallback Mode (only when GTM_ID is missing, but GA_MEASUREMENT_ID is present):
 *   Loads gtag.js directly as a standalone fallback.
 *
 * Note: GTM <noscript> is rendered statically in app/layout.js for clean SSR hydration.
 */
export default function AnalyticsProvider({ children }) {
  const enabled = isAnalyticsEnabled()
  const hasGtm = Boolean(GTM_ID)
  const hasGa = Boolean(GA_MEASUREMENT_ID)

  // Primary: GTM orchestration layer
  const loadGtm = enabled && hasGtm
  // Fallback: Direct GA4 only when GTM is not configured
  const loadDirectGa = enabled && !hasGtm && hasGa

  return (
    <>
      {/* 1. Google Tag Manager Container Script (Primary Orchestrator) */}
      {loadGtm && (
        <Script
          id="gtm-base"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${GTM_ID}');`,
          }}
        />
      )}

      {/* 2. Direct GA4 gtag.js — Fallback ONLY when GTM is NOT present */}
      {loadDirectGa && (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
            strategy="afterInteractive"
          />
          <Script
            id="ga4-init"
            strategy="afterInteractive"
            dangerouslySetInnerHTML={{
              __html: `
window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${GA_MEASUREMENT_ID}', {
  page_path: window.location.pathname,
  send_page_view: false
});`,
            }}
          />
        </>
      )}

      {/* 3. Client-side SPA Route Tracker */}
      {enabled && <RouteTracker />}

      {children}
    </>
  )
}
