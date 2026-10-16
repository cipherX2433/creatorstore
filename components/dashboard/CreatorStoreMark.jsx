'use client'

import CreatorStoreBrand, {
  CreatorStoreMark as BaseCreatorStoreMark,
  CreatorStoreLogo as BaseCreatorStoreLogo,
  CreatorStoreLogoCompact as BaseCreatorStoreLogoCompact,
} from '@/components/brand/CreatorStoreBrand'

export {
  BaseCreatorStoreMark as CreatorStoreMark,
  BaseCreatorStoreLogo as CreatorStoreLogo,
  BaseCreatorStoreLogoCompact as CreatorStoreLogoCompact,
}

export default function CreatorStoreMarkComponent({
  href = '/dashboard',
  wordmarkClass = '',
  markSize = '',
  className = '',
  showWordmark = true,
  theme = 'dark',
  size = 'md',
  collapsed = false,
}) {
  return (
    <CreatorStoreBrand
      href={href}
      variant={showWordmark && !collapsed ? 'full' : 'compact'}
      theme={theme}
      size={size}
      collapsed={collapsed || !showWordmark}
      className={className}
      wordmarkClassName={wordmarkClass}
      logoClassName={markSize}
    />
  )
}
