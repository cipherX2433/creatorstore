'use client'

import { useState, useEffect } from 'react'

// In-memory cache to prevent re-processing the same image
const paletteCache = new Map()

/* ---------------- Color Utility Helpers ---------------- */

export function rgbToHsl(r, g, b) {
  r /= 255
  g /= 255
  b /= 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  let h = 0
  let s = 0
  const l = (max + min) / 2

  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0)
        break
      case g:
        h = (b - r) / d + 2
        break
      case b:
        h = (r - g) / d + 4
        break
    }
    h /= 6
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  }
}

export function hslToHex(h, s, l) {
  h = (h % 360 + 360) % 360
  s = Math.max(0, Math.min(100, s)) / 100
  l = Math.max(0, Math.min(100, l)) / 100

  const c = (1 - Math.abs(2 * l - 1)) * s
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = l - c / 2
  let r = 0
  let g = 0
  let b = 0

  if (h >= 0 && h < 60) {
    r = c; g = x; b = 0
  } else if (h >= 60 && h < 120) {
    r = x; g = c; b = 0
  } else if (h >= 120 && h < 180) {
    r = 0; g = c; b = x
  } else if (h >= 180 && h < 240) {
    r = 0; g = x; b = c
  } else if (h >= 240 && h < 300) {
    r = x; g = 0; b = c
  } else {
    r = c; g = 0; b = x
  }

  const toHex = (n) => {
    const hex = Math.round((n + m) * 255).toString(16)
    return hex.length === 1 ? '0' + hex : hex
  }

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase()
}

/**
 * Extracts a refined, accessible color palette from an image URL using HTML5 Canvas.
 * Analyzes overall luminance, bottom-edge tones (for seamless gradient dissolution),
 * and dominant hue to derive cohesive tokens.
 */
export async function extractImagePalette(imageUrl) {
  if (!imageUrl || typeof window === 'undefined') {
    return buildDefaultPalette('dark')
  }

  if (paletteCache.has(imageUrl)) {
    return paletteCache.get(imageUrl)
  }

  return new Promise((resolve) => {
    try {
      const img = new Image()
      img.crossOrigin = 'Anonymous'

      let timedOut = false
      const timeout = setTimeout(() => {
        timedOut = true
        const fallback = buildDefaultPalette('dark')
        paletteCache.set(imageUrl, fallback)
        resolve(fallback)
      }, 3500)

      img.onload = () => {
        if (timedOut) return
        clearTimeout(timeout)

        try {
          const canvas = document.createElement('canvas')
          const size = 48
          canvas.width = size
          canvas.height = size
          const ctx = canvas.getContext('2d', { willReadFrequently: true })

          if (!ctx) {
            const fallback = buildDefaultPalette('dark')
            paletteCache.set(imageUrl, fallback)
            resolve(fallback)
            return
          }

          ctx.drawImage(img, 0, 0, size, size)
          const imgData = ctx.getImageData(0, 0, size, size)
          const data = imgData.data

          let totalLum = 0
          let totalR = 0
          let totalG = 0
          let totalB = 0

          let bottomR = 0
          let bottomG = 0
          let bottomB = 0
          let bottomPixels = 0

          // Sample bottom 30% for seamless background dissolution
          const bottomStartY = Math.floor(size * 0.7)

          // Color bucket map (quantized into 16 hue bins)
          const buckets = {}

          for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x++) {
              const idx = (y * size + x) * 4
              const r = data[idx]
              const g = data[idx + 1]
              const b = data[idx + 2]
              const a = data[idx + 3] / 255

              if (a < 0.25) continue

              const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b
              totalLum += lum
              totalR += r
              totalG += g
              totalB += b

              if (y >= bottomStartY) {
                bottomR += r
                bottomG += g
                bottomB += b
                bottomPixels++
              }

              // Quantize into 16 hue bins
              const hsl = rgbToHsl(r, g, b)
              if (hsl.s > 10 && hsl.l > 12 && hsl.l < 88) {
                const bin = Math.floor(hsl.h / 24)
                if (!buckets[bin]) {
                  buckets[bin] = { count: 0, sumH: 0, sumS: 0, sumL: 0 }
                }
                buckets[bin].count++
                buckets[bin].sumH += hsl.h
                buckets[bin].sumS += hsl.s
                buckets[bin].sumL += hsl.l
              }
            }
          }

          const count = size * size
          const avgLum = totalLum / count
          const isDark = avgLum < 140

          // Determine bottom-edge color or fallback to overall average
          const bR = bottomPixels > 0 ? bottomR / bottomPixels : totalR / count
          const bG = bottomPixels > 0 ? bottomG / bottomPixels : totalG / count
          const bB = bottomPixels > 0 ? bottomB / bottomPixels : totalB / count
          const bottomHsl = rgbToHsl(bR, bG, bB)

          // Find dominant colorful bucket
          let dominantHsl = bottomHsl
          let maxCount = 0
          for (const bin in buckets) {
            if (buckets[bin].count > maxCount) {
              maxCount = buckets[bin].count
              dominantHsl = {
                h: Math.round(buckets[bin].sumH / buckets[bin].count),
                s: Math.round(buckets[bin].sumS / buckets[bin].count),
                l: Math.round(buckets[bin].sumL / buckets[bin].count),
              }
            }
          }

          // Use bottom hue if it has reasonable saturation, else dominant hue
          const baseHue = bottomHsl.s >= 14 ? bottomHsl.h : dominantHsl.h
          const baseSat = Math.max(12, Math.min(38, Math.round(dominantHsl.s * 0.75)))

          // Generate cohesive accessible palette
          const palette = derivePalette(baseHue, baseSat, isDark)
          paletteCache.set(imageUrl, palette)
          resolve(palette)
        } catch (err) {
          const fallback = buildDefaultPalette('dark')
          paletteCache.set(imageUrl, fallback)
          resolve(fallback)
        }
      }

      img.onerror = () => {
        if (timedOut) return
        clearTimeout(timeout)
        const fallback = buildDefaultPalette('dark')
        paletteCache.set(imageUrl, fallback)
        resolve(fallback)
      }

      img.src = imageUrl
    } catch {
      const fallback = buildDefaultPalette('dark')
      paletteCache.set(imageUrl, fallback)
      resolve(fallback)
    }
  })
}

/**
 * Derives a full design token palette from a base hue, saturation, and dark/light mode.
 */
export function derivePalette(h, s, isDark) {
  const mode = isDark ? 'dark' : 'light'

  if (isDark) {
    // Atmospheric deep background (16-20% lightness)
    const bg = hslToHex(h, Math.min(s, 32), 17)
    // Tonal surface cards (26-32% lightness)
    const surface = hslToHex(h, Math.min(s + 4, 36), 28)
    const surfaceHover = hslToHex(h, Math.min(s + 6, 40), 34)
    // High contrast text
    const text = '#FFFFFF'
    const textSecondary = 'rgba(255, 255, 255, 0.72)'
    const muted = 'rgba(255, 255, 255, 0.52)'
    // Vibrant accent
    const accent = hslToHex(h, Math.max(60, s + 35), 62)
    // High-contrast action button
    const buttonBg = '#FFFFFF'
    const buttonText = hslToHex(h, 30, 16)
    const border = 'rgba(255, 255, 255, 0.12)'

    return {
      mode,
      isDark: true,
      isLight: false,
      h,
      s,
      bg,
      surface,
      surfaceHover,
      text,
      textSecondary,
      muted,
      accent,
      buttonBg,
      buttonText,
      border,
      controlBg: 'rgba(20, 20, 20, 0.72)',
      controlFg: '#FFFFFF',
      controlBorder: 'rgba(255, 255, 255, 0.18)',
      badgeBg: 'rgba(255, 255, 255, 0.15)',
      badgeFg: '#FFFFFF',
      badgeBorder: 'rgba(255, 255, 255, 0.22)',
      socialBg: 'rgba(255, 255, 255, 0.14)',
      socialFg: '#FFFFFF',
      socialBorder: 'rgba(255, 255, 255, 0.20)',
    }
  }

  // Light Mode: Clean, airy palette
  const bg = hslToHex(h, Math.min(s, 22), 94)
  const surface = '#FFFFFF'
  const surfaceHover = hslToHex(h, 15, 98)
  const text = '#0F172A'
  const textSecondary = 'rgba(15, 23, 42, 0.70)'
  const muted = 'rgba(15, 23, 42, 0.50)'
  const accent = hslToHex(h, Math.max(65, s + 30), 45)
  const buttonBg = '#0F172A'
  const buttonText = '#FFFFFF'
  const border = 'rgba(0, 0, 0, 0.08)'

  return {
    mode,
    isDark: false,
    isLight: true,
    h,
    s,
    bg,
    surface,
    surfaceHover,
    text,
    textSecondary,
    muted,
    accent,
    buttonBg,
    buttonText,
    border,
    controlBg: 'rgba(255, 255, 255, 0.88)',
    controlFg: '#0F172A',
    controlBorder: 'rgba(0, 0, 0, 0.12)',
    badgeBg: 'rgba(0, 0, 0, 0.08)',
    badgeFg: '#0F172A',
    badgeBorder: 'rgba(0, 0, 0, 0.12)',
    socialBg: 'rgba(0, 0, 0, 0.08)',
    socialFg: '#0F172A',
    socialBorder: 'rgba(0, 0, 0, 0.12)',
  }
}

export function buildDefaultPalette(mode = 'dark') {
  // Neutral slate fallback (h: 215, s: 28)
  return derivePalette(215, 28, mode === 'dark')
}

// Backward compatibility alias for prior hook consumers
export const buildContrastTheme = (mode = 'dark') => buildDefaultPalette(mode)
export const calculateImageLuminance = (url) => extractImagePalette(url).then(p => ({ mode: p.mode, luminance: p.isDark ? 60 : 180 }))

/**
 * Hook to retrieve the extracted image palette.
 * SSR-safe: returns default dark palette during SSR and resolves cleanly after mount.
 */
export function useImageContrastTheme(imageUrl) {
  const [palette, setPalette] = useState(() => {
    if (imageUrl && paletteCache.has(imageUrl)) {
      return { ...paletteCache.get(imageUrl), isReady: true }
    }
    return { ...buildDefaultPalette('dark'), isReady: false }
  })

  useEffect(() => {
    let isCancelled = false

    if (!imageUrl) {
      setPalette({ ...buildDefaultPalette('dark'), isReady: true })
      return
    }

    if (paletteCache.has(imageUrl)) {
      setPalette({ ...paletteCache.get(imageUrl), isReady: true })
      return
    }

    extractImagePalette(imageUrl).then((res) => {
      if (!isCancelled) {
        setPalette({ ...res, isReady: true })
      }
    })

    return () => {
      isCancelled = true
    }
  }, [imageUrl])

  return palette
}
