import Navbar from '@/components/landing/Navbar'
import HowItWorksSection from '@/components/landing/HowItWorksSection'
import TestimonialsSection from '@/components/landing/TestimonialsSection'
import FaqSection from '@/components/landing/FaqSection'
import Footer from '@/components/landing/Footer'

export const metadata = {
  title: 'How It Works | CreatorStore',
  description:
    'Launch your creator store in 3 simple steps. Create your storefront, add products, and start selling.',
}

export default function HowItWorksPage() {
  return (
    <div className="min-h-screen bg-[#000000] font-sans antialiased text-[#F5F5F5] selection:bg-[#FF4B1F] selection:text-white relative overflow-x-hidden">
      {/* 1. Top Navbar with active How It Works indicator */}
      <Navbar />

      <main className="relative z-10">
        {/* 2. Step-by-Step Interactive Guide */}
        <HowItWorksSection />

        {/* 3. Creator Testimonials */}
        <TestimonialsSection />

        {/* 4. Common Questions */}
        <FaqSection />
      </main>

      {/* 5. Minimal Editorial Brand Footer */}
      <Footer />
    </div>
  )
}
