import { Instagram, Youtube, Facebook, Globe, Music2, Twitter, MessageCircle, AtSign } from 'lucide-react'

export const ONBOARDING_PLATFORMS = [
  { id: 'instagram', label: 'Instagram', Icon: Instagram, prefix: 'https://instagram.com/' },
  { id: 'whatsapp', label: 'WhatsApp', Icon: MessageCircle, prefix: 'https://wa.me/' },
  { id: 'tiktok', label: 'TikTok', Icon: Music2, prefix: 'https://tiktok.com/@' },
  { id: 'youtube', label: 'YouTube', Icon: Youtube, prefix: 'https://youtube.com/' },
  { id: 'website', label: 'Website', Icon: Globe, prefix: 'https://' },
  { id: 'spotify', label: 'Spotify', Icon: Music2, prefix: 'https://open.spotify.com/' },
  { id: 'threads', label: 'Threads', Icon: AtSign, prefix: 'https://threads.net/@' },
  { id: 'facebook', label: 'Facebook', Icon: Facebook, prefix: 'https://facebook.com/' },
  { id: 'x', label: 'X', Icon: Twitter, prefix: 'https://x.com/' },
]

export function platformHref(id, raw) {
  const value = String(raw || '').trim()
  if (!value) return ''
  if (/^https?:\/\//i.test(value)) return value
  const p = ONBOARDING_PLATFORMS.find((x) => x.id === id)
  const handle = value.replace(/^@/, '')
  return `${p?.prefix || 'https://'}${handle}`
}
