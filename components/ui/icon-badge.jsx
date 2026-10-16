'use client'

import { cn } from '@/lib/utils'
import { getAccessibleTextColor } from '@/lib/colorContrast'

export const ICON_BADGE_COLORS = {
  theme: '#194DF5',
  header: '#3B82F6',
  wallpaper: '#F59E0B',
  buttons: '#C8FF2C',
  text: '#194DF5',
  colors: '#EC4899',
  footer: '#14B8A6',
  product: '#F97316', // orange (Digital Products)
  link: '#22C55E', // green
  instagram: '#E1306C', // pink
  tiktok: '#000000', // black
  form: '#14B8A6', // teal
  video: '#84CC16', // lime
  youtube: '#EF4444', // red
  audio: '#8B5CF6', // purple
  pdf: '#F59E0B', // amber
  gallery: '#38BDF8', // sky blue
  coaching: '#A855F7', // lavender/purple
  collection: '#194DF5',
  contact: '#14B8A6',
  feedback: '#F59E0B',
  newsletter: '#EC4899',
  qa: '#6366F1',
  courses: '#6366F1', // indigo/purple
  bundles: '#4F46E5', // deep purple
  affiliate: '#84CC16', // lime
  membership: '#3B82F6', // blue
  webinar: '#EC4899', // pink
  community: '#EC4899', // pink
  services: '#EF4444', // red
}

export function IconBadge({
  color = '#194DF5',
  children,
  className,
  size = 'md',
  shape = 'circle',
}) {
  const dim = size === 'sm' ? 'h-8 w-8' : size === 'lg' ? 'h-14 w-14' : 'h-12 w-12'
  const radius = shape === 'rounded' ? 'rounded-[12px]' : 'rounded-full'

  return (
    <div
      className={cn(dim, radius, 'flex items-center justify-center shrink-0 text-white', className)}
      style={{ backgroundColor: color, color: '#FFFFFF' }}
    >
      {children}
    </div>
  )
}
