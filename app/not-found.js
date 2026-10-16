import Link from 'next/link'
import { Button } from '@/components/ui/button'
import CreatorStoreBrand from '@/components/brand/CreatorStoreBrand'

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-black text-white p-6 text-center space-y-4 font-sans">
      <div className="mb-4">
        <CreatorStoreBrand href="/" theme="dark" size="lg" />
      </div>
      <h1 className="text-7xl font-extrabold text-primary">404</h1>
      <h2 className="text-2xl font-extrabold text-white">Page Not Found</h2>
      <p className="text-[rgba(244,242,236,0.68)] max-w-sm text-sm font-medium">
        The page you are looking for does not exist or has been moved.
      </p>
      <Link href="/dashboard/store">
        <Button className="font-black h-12 px-6 text-sm">
          Return to Dashboard
        </Button>
      </Link>
    </div>
  )
}
