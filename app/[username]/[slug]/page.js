'use client'

import { use } from 'react'
import ProductPurchasePage from '@/components/storefront/ProductPurchasePage'

export default function PublicSlugPage({ params: paramsPromise }) {
  const params = use(paramsPromise)
  const { username, slug } = params
  return <ProductPurchasePage username={username} slug={slug} />
}
