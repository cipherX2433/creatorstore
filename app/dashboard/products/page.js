import ProductsClient from './ProductsClient'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Products | CreatorStore',
  description: 'Manage and monitor your digital products, coaching bookings, and memberships.',
}

export default async function ProductsPage() {
  return <ProductsClient />
}
