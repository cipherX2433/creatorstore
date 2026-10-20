import React from 'react'
import {
  Instagram,
  Youtube,
  Facebook,
  Twitter,
  Linkedin,
  Twitch,
  MessageCircle,
  Send,
  Ghost,
  Music2,
  Link2,
  Globe,
  Share2,
} from 'lucide-react'

/**
 * Custom clean brand SVGs for platforms not in standard Lucide sets or requiring official logos
 */
export function PinterestIcon({ className = 'h-5 w-5', ...props } = {}) {
  return React.createElement(
    'svg',
    { viewBox: '0 0 24 24', fill: 'currentColor', className, ...props },
    React.createElement('path', {
      d: 'M12 0a12 12 0 0 0-4.37 23.18c-.07-.63-.13-1.6.03-2.28l1-4.24s-.25-.5-.25-1.24c0-1.16.67-2.03 1.51-2.03.71 0 1.05.53 1.05 1.17 0 .72-.46 1.79-.7 2.78-.2 1.01.4 1.83 1.4 1.83 1.68 0 2.97-1.77 2.97-4.32 0-2.26-1.63-3.84-3.95-3.84-2.69 0-4.27 2.02-4.27 4.1 0 .81.31 1.68.7 2.16a.3.3 0 0 1 .07.28c-.08.32-.25 1.03-.29 1.18-.05.19-.16.23-.37.14-1.38-.64-2.24-2.66-2.24-4.28 0-3.48 2.53-6.68 7.3-6.68 3.83 0 6.81 2.73 6.81 6.38 0 3.8-2.4 6.86-5.73 6.86-1.12 0-2.17-.58-2.53-1.26l-.69 2.63c-.25.96-.92 2.16-1.37 2.89A12 12 0 1 0 12 0z',
    })
  )
}

export function DiscordIcon({ className = 'h-5 w-5', ...props } = {}) {
  return React.createElement(
    'svg',
    { viewBox: '0 0 24 24', fill: 'currentColor', className, ...props },
    React.createElement('path', {
      d: 'M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.894.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z',
    })
  )
}

export function XTwitterIcon({ className = 'h-5 w-5', ...props } = {}) {
  return React.createElement(
    'svg',
    { viewBox: '0 0 24 24', fill: 'currentColor', className, ...props },
    React.createElement('path', {
      d: 'M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z',
    })
  )
}

/**
 * All supported social platforms in CreatorStore
 */
export const SOCIAL_PLATFORMS = {
  instagram: {
    id: 'instagram',
    name: 'Instagram',
    title: 'Instagram',
    description: 'Display your posts, reels, and profile',
    icon: Instagram,
    color: '#E1306C',
    bgLight: 'bg-[#FDF2F8]',
    textLight: 'text-[#DB2777]',
    borderLight: 'border-[#FCE7F3]',
    urlPlaceholder: 'https://instagram.com/username',
    prefix: 'https://instagram.com/',
    supportsOAuth: true,
    keywords: 'instagram social reels posts ig feed',
  },
  tiktok: {
    id: 'tiktok',
    name: 'TikTok',
    title: 'TikTok',
    description: 'Share your TikTok profile and videos',
    icon: Music2,
    color: '#000000',
    bgLight: 'bg-[#F4F4F5]',
    textLight: 'text-[#18181B]',
    borderLight: 'border-[#E4E4E7]',
    urlPlaceholder: 'https://tiktok.com/@username',
    prefix: 'https://tiktok.com/@',
    supportsOAuth: false,
    keywords: 'tiktok social video reels short',
  },
  youtube: {
    id: 'youtube',
    name: 'YouTube',
    title: 'YouTube Channel',
    description: 'Share your YouTube channel and videos',
    icon: Youtube,
    color: '#EF4444',
    bgLight: 'bg-[#FEF2F2]',
    textLight: 'text-[#DC2626]',
    borderLight: 'border-[#FEE2E2]',
    urlPlaceholder: 'https://youtube.com/@channel',
    prefix: 'https://youtube.com/',
    supportsOAuth: false,
    keywords: 'youtube video channel stream yt',
  },
  facebook: {
    id: 'facebook',
    name: 'Facebook',
    title: 'Facebook',
    description: 'Connect with your audience on Facebook',
    icon: Facebook,
    color: '#1877F2',
    bgLight: 'bg-[#EFF6FF]',
    textLight: 'text-[#2563EB]',
    borderLight: 'border-[#DBEAFE]',
    urlPlaceholder: 'https://facebook.com/username',
    prefix: 'https://facebook.com/',
    supportsOAuth: false,
    keywords: 'facebook fb page community meta',
  },
  x: {
    id: 'x',
    name: 'X',
    title: 'X',
    description: 'Share your X (Twitter) profile and thoughts',
    icon: XTwitterIcon,
    color: '#000000',
    bgLight: 'bg-[#F4F4F5]',
    textLight: 'text-[#18181B]',
    borderLight: 'border-[#E4E4E7]',
    urlPlaceholder: 'https://x.com/username',
    prefix: 'https://x.com/',
    supportsOAuth: false,
    keywords: 'x twitter tweets microblog social',
  },
  linkedin: {
    id: 'linkedin',
    name: 'LinkedIn',
    title: 'LinkedIn',
    description: 'Showcase your professional network and career',
    icon: Linkedin,
    color: '#0A66C2',
    bgLight: 'bg-[#EFF6FF]',
    textLight: 'text-[#0284C7]',
    borderLight: 'border-[#E0F2FE]',
    urlPlaceholder: 'https://linkedin.com/in/username',
    prefix: 'https://linkedin.com/in/',
    supportsOAuth: false,
    keywords: 'linkedin professional resume network business',
  },
  pinterest: {
    id: 'pinterest',
    name: 'Pinterest',
    title: 'Pinterest',
    description: 'Share your boards, pins, and creative ideas',
    icon: PinterestIcon,
    color: '#BD081C',
    bgLight: 'bg-[#FEF2F2]',
    textLight: 'text-[#B91C1C]',
    borderLight: 'border-[#FEE2E2]',
    urlPlaceholder: 'https://pinterest.com/username',
    prefix: 'https://pinterest.com/',
    supportsOAuth: false,
    keywords: 'pinterest boards pins inspiration ideas',
  },
  snapchat: {
    id: 'snapchat',
    name: 'Snapchat',
    title: 'Snapchat',
    description: 'Connect with friends and share your snaps',
    icon: Ghost,
    color: '#EAB308',
    bgLight: 'bg-[#FEFCE8]',
    textLight: 'text-[#CA8A04]',
    borderLight: 'border-[#FEF08A]',
    urlPlaceholder: 'https://snapchat.com/add/username',
    prefix: 'https://snapchat.com/add/',
    supportsOAuth: false,
    keywords: 'snapchat snap stories friends camera',
  },
  twitch: {
    id: 'twitch',
    name: 'Twitch',
    title: 'Twitch',
    description: 'Stream live to your community on Twitch',
    icon: Twitch,
    color: '#9146FF',
    bgLight: 'bg-[#FAF5FF]',
    textLight: 'text-[#7C3AED]',
    borderLight: 'border-[#EDE9FE]',
    urlPlaceholder: 'https://twitch.tv/username',
    prefix: 'https://twitch.tv/',
    supportsOAuth: false,
    keywords: 'twitch gaming stream live broadcasting',
  },
  discord: {
    id: 'discord',
    name: 'Discord',
    title: 'Discord Server',
    description: 'Invite creators and fans to your Discord community',
    icon: DiscordIcon,
    color: '#5865F2',
    bgLight: 'bg-[#EEF2FF]',
    textLight: 'text-[#4F46E5]',
    borderLight: 'border-[#E0E7FF]',
    urlPlaceholder: 'https://discord.gg/invitecode',
    prefix: 'https://discord.gg/',
    supportsOAuth: false,
    keywords: 'discord server community chat voice gaming',
  },
  whatsapp: {
    id: 'whatsapp',
    name: 'WhatsApp',
    title: 'WhatsApp',
    description: 'Chat directly with your audience on WhatsApp',
    icon: MessageCircle,
    color: '#25D366',
    bgLight: 'bg-[#F0FDF4]',
    textLight: 'text-[#16A34A]',
    borderLight: 'border-[#DCFCE7]',
    urlPlaceholder: 'https://wa.me/1234567890',
    prefix: 'https://wa.me/',
    supportsOAuth: false,
    keywords: 'whatsapp chat messaging direct contact phone',
  },
  telegram: {
    id: 'telegram',
    name: 'Telegram',
    title: 'Telegram Channel',
    description: 'Broadcast updates and chat on Telegram',
    icon: Send,
    color: '#229ED9',
    bgLight: 'bg-[#F0F9FF]',
    textLight: 'text-[#0284C7]',
    borderLight: 'border-[#E0F2FE]',
    urlPlaceholder: 'https://t.me/username',
    prefix: 'https://t.me/',
    supportsOAuth: false,
    keywords: 'telegram channel group broadcast chat bot',
  },
  generic: {
    id: 'generic',
    name: 'Social Link',
    title: 'Social Link',
    description: 'Link to any social network or profile',
    icon: Link2,
    color: '#3B82F6',
    bgLight: 'bg-[#EFF6FF]',
    textLight: 'text-[#2563EB]',
    borderLight: 'border-[#DBEAFE]',
    urlPlaceholder: 'https://',
    prefix: 'https://',
    supportsOAuth: false,
    keywords: 'social link url custom web page',
  },
}

/**
 * Display styles inspired by Linktree reference
 */
export const SOCIAL_DISPLAY_STYLES = [
  {
    id: 'classic',
    name: 'Classic',
    description: 'Compact link pill with platform icon',
    isPro: false,
  },
  {
    id: 'cards',
    name: 'Cards',
    description: 'Visual photo showcase cards',
    isPro: false,
  },
  {
    id: 'grid',
    name: 'Grid',
    description: 'Multi-column photo post grid',
    isPro: true,
  },
  {
    id: 'carousel',
    name: 'Carousel',
    description: 'Horizontal swipeable cards',
    isPro: true,
  },
  {
    id: 'profile',
    name: 'Profile',
    description: 'Full profile showcase with stats',
    isPro: true,
  },
  {
    id: 'single',
    name: 'Single',
    description: 'Prominent single featured post',
    isPro: true,
  },
]

/**
 * Resolve platform configuration from ID or URL
 */
export function getSocialPlatform(platformIdOrUrl) {
  if (!platformIdOrUrl) return SOCIAL_PLATFORMS.generic
  const key = String(platformIdOrUrl).toLowerCase().trim()
  if (SOCIAL_PLATFORMS[key]) return SOCIAL_PLATFORMS[key]

  if (key.includes('instagram.com')) return SOCIAL_PLATFORMS.instagram
  if (key.includes('tiktok.com')) return SOCIAL_PLATFORMS.tiktok
  if (key.includes('youtube.com') || key.includes('youtu.be')) return SOCIAL_PLATFORMS.youtube
  if (key.includes('facebook.com') || key.includes('fb.com')) return SOCIAL_PLATFORMS.facebook
  if (key.includes('twitter.com') || key.includes('x.com')) return SOCIAL_PLATFORMS.x
  if (key.includes('linkedin.com')) return SOCIAL_PLATFORMS.linkedin
  if (key.includes('pinterest.com')) return SOCIAL_PLATFORMS.pinterest
  if (key.includes('snapchat.com')) return SOCIAL_PLATFORMS.snapchat
  if (key.includes('twitch.tv')) return SOCIAL_PLATFORMS.twitch
  if (key.includes('discord.gg') || key.includes('discord.com')) return SOCIAL_PLATFORMS.discord
  if (key.includes('wa.me') || key.includes('whatsapp.com')) return SOCIAL_PLATFORMS.whatsapp
  if (key.includes('t.me') || key.includes('telegram.me')) return SOCIAL_PLATFORMS.telegram

  return SOCIAL_PLATFORMS.generic
}

SOCIAL_PLATFORMS.twitter = SOCIAL_PLATFORMS.x

/**
 * Detect social platform ID from a URL
 */
export function detectSocialPlatformFromUrl(url) {
  return getSocialPlatform(url)?.id || 'generic'
}

