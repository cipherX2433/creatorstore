'use client'

import { useParams } from 'next/navigation'
import ProductPurchasePage from '@/components/storefront/ProductPurchasePage'

export default function CheckoutPage() {
  const { productId } = useParams()
  return <ProductPurchasePage productId={productId} />
}
