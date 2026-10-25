import Navbar from '@/components/landing/Navbar'
import Footer from '@/components/landing/Footer'
import CompareView from '@/components/compare/CompareView'

export const metadata = {
  title: 'CreatorStore vs Stan Store, Linktree & Beacons — Full Comparison',
  description:
    'Compare CreatorStore with popular creator platforms across digital products, coaching, memberships, Instagram AutoDM, and 0% platform fee pricing.',
  openGraph: {
    title: 'CreatorStore vs Stan Store, Linktree & Beacons — Full Comparison',
    description:
      '0% fees on every plan. Sell digital products, coaching, services, and automate Instagram conversations with CreatorStore.',
    url: 'https://creatorstore.store/compare',
  },
}

export default function ComparePage() {
  return (
    <div className="min-h-screen bg-white font-sans antialiased text-[#0D0D0D] selection:bg-[#194DF5] selection:text-white relative overflow-x-hidden">
      {/* 1. Global Navigation Bar */}
      <Navbar />

      {/* 2. Main Compare Experience */}
      <main className="relative z-10">
        <CompareView />
      </main>

      {/* 3. Global Footer */}
      <Footer />
    </div>
  )
}
