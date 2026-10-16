import { clsx } from "clsx";
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function sanitizeUrl(url) {
  if (!url || typeof url !== 'string') return ''
  const trimmed = url.trim()
  if (/^(javascript|vbscript|data:text\/html):/i.test(trimmed)) return ''
  return trimmed
}

export function sanitizeText(str) {
  if (str == null) return ''
  let s = String(str)
  // Strip tags and dangerous URI schemes / scripts
  s = s.replace(/<[^>]*>/g, '')
  s = s.replace(/javascript:/gi, '')
  s = s.replace(/on\w+\s*=/gi, '')
  return s.trim()
}

export function sanitizeHtml(html) {
  if (html == null) return ''
  let s = String(html)
  // Remove script, iframe, object, embed, style tags with contents
  s = s.replace(/<(script|iframe|object|embed|style)[\s\S]*?<\/\1>/gi, '')
  // Remove event handlers like onload, onclick, onerror
  s = s.replace(/on\w+\s*=\s*(["'])[\s\S]*?\1/gi, '')
  s = s.replace(/on\w+\s*=\s*[^>\s]+/gi, '')
  // Neutralize javascript: hrefs/srcs
  s = s.replace(/(href|src)\s*=\s*(["'])\s*javascript:[\s\S]*?\2/gi, '$1="#"')
  s = s.replace(/(href|src)\s*=\s*javascript:[^>\s]+/gi, '$1="#"')
  return s
}
export { getAppUrl } from '../config/site.js'
