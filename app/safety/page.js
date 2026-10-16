import Navbar from '@/components/landing/Navbar'
import DeliveryGuardSection from '@/components/landing/DeliveryGuardSection'
import IntegrationsSection from '@/components/landing/IntegrationsSection'
import FaqSection from '@/components/landing/FaqSection'
import Footer from '@/components/landing/Footer'

export const metadata = {
  title: 'Account Safety & Delivery Guard | CreatorStore',
  description:
    'Intelligent rate pacing & queue buffering engine built to protect your Instagram account during viral surges.',
}

export default function SafetyPage() {
  return (
    <div className="min-h-screen bg-[#000000] font-sans antialiased text-[#F5F5F5] selection:bg-[#FF4B1F] selection:text-white relative overflow-x-hidden">
      {/* 1. Top Navbar with active Safety indicator */}
      <Navbar />

      <main className="relative z-10">
        {/* 2. Account Safety / Delivery Guard Section */}
        <DeliveryGuardSection />

        {/* 3. Official Integrations & Trust */}
        <IntegrationsSection />

        {/* 4. Common Safety FAQs */}
        <FaqSection />
      </main>

      {/* 5. Minimal Editorial Brand Footer */}
      <Footer />
    </div>
  )
}
