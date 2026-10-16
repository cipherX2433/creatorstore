export const SETUP_TASKS = [
  {
    id: 'nameBio',
    title: 'Add your name and bio',
    description: 'Tell visitors who you are in a few words.',
    action: 'Add name and bio',
  },
  {
    id: 'profileImage',
    title: 'Add your profile image',
    description: 'A photo helps people recognize you.',
    action: 'Add profile image',
  },
  {
    id: 'socials',
    title: 'Connect your socials',
    description: 'Add the platforms your audience already follows.',
    action: 'Add social links',
  },
  {
    id: 'firstItem',
    title: 'Add your first product or link',
    description: 'Put something on your page for people to tap.',
    action: 'Add your first product',
  },
  {
    id: 'design',
    title: 'Customize your design',
    description: 'Pick a theme or tweak wallpaper, text, or colors.',
    action: 'Customize your design',
  },
  {
    id: 'share',
    title: 'Share your store',
    description: 'Copy your link and share it with your audience.',
    action: 'Share your store',
  },
]

function hasContentItem(store, products) {
  if ((products || []).length > 0) return true
  return (store?.sections || []).some((s) => {
    if (s.hidden) return false
    if (s.type === 'button' && s.props?.url) return true
    if ((s.type === 'product' || s.type === 'link') && (s.props?.productId || s.props?.url)) return true
    return false
  })
}

export function isDesignComplete(theme = {}) {
  if (theme.setupDesignComplete) return true
  if (theme.galleryThemeId && theme.galleryThemeId !== 'custom') return true
  const bg = theme.bgType
  if (bg && bg !== 'solid' && bg !== 'fill') return true
  if (theme.backgroundImage || theme.backgroundVideo || theme.wallpaperPattern) return true
  return false
}

export function deriveSetupProgress({ profile, store, products, igConnected }) {
  const theme = store?.theme || {}
  const name = String(theme.headerTitle || profile?.name || '').trim()
  const bio = String(theme.headerBio || profile?.bio || '').trim()
  const avatar = theme.avatarUrl || store?.avatarUrl || profile?.avatarUrl
  const socials = { ...(store?.socialLinks || {}), ...(profile?.socialLinks || {}) }
  const hasSocial = Object.values(socials).some(Boolean) || !!igConnected

  const done = {
    nameBio: !!(name && bio),
    profileImage: !!avatar,
    socials: hasSocial,
    firstItem: hasContentItem(store, products),
    design: isDesignComplete(theme),
    share: !!(profile?.setupShareComplete || theme.setupShareComplete),
  }
  const completedCount = SETUP_TASKS.filter((t) => done[t.id]).length
  return { done, completedCount, total: SETUP_TASKS.length, allDone: completedCount === SETUP_TASKS.length }
}
