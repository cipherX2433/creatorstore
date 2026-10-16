'use client'

import { useParams, useRouter } from 'next/navigation'
import ProductEditor from '@/components/products/ProductEditor'

export default function ProductCustomizePage() {
  const { id } = useParams()
  const router = useRouter()

  return (
    <div className="flex-1 flex flex-col min-h-0 w-full overflow-hidden bg-[#FBFAF9]">
      <ProductEditor
        productId={id}
        onBack={() => router.push('/dashboard/products')}
      />
    </div>
  )
}
