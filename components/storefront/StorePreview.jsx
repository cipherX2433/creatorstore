'use client'

import PublicStoreRenderer from './PublicStoreRenderer'

export default function StorePreview({ device = 'mobile', ...props }) {
  return <PublicStoreRenderer device={device} {...props} />
}

