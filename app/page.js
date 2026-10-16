import Navbar from '@/components/landing/Navbar'
import HeroSection from '@/components/landing/HeroSection'
import CarouselVideoSection from '@/components/landing/CarouselVideoSection'
import FeatureIntroSection from '@/components/landing/FeatureIntroSection'
import EditorialFeatureShowcase from '@/components/landing/EditorialFeatureShowcase'
import TestimonialsSection from '@/components/landing/TestimonialsSection'
import SimplerSolutionSection from '@/components/landing/SimplerSolutionSection'
import ComparePlatformsSection from '@/components/landing/ComparePlatformsSection'
import FaqSection from '@/components/landing/FaqSection'
import Footer from '@/components/landing/Footer'

export default function LandingPage() {
  return (
    <div className="min-h-screen w-full max-w-full bg-[#000000] font-sans antialiased text-[#F5F5F5] selection:bg-[#FF4B1F] selection:text-white relative overflow-x-hidden">
      {/* 1. Top Floating Navigation Pill */}
      <Navbar />

      <main className="relative z-10">
        {/* 2. Existing Hero Layout with Updated Copy */}
        <HeroSection />

        {/* 3. Carousel Video Section */}
        <CarouselVideoSection />

        {/* 3.5. Feature Intro Section (Editorial typography + Editor UI & Mobile Preview) */}
        <FeatureIntroSection />

        {/* 3.6. Editorial Feature Showcase Section */}
        <EditorialFeatureShowcase />

        {/* 5. Real Creator Testimonials Tonal Marquee */}
        <TestimonialsSection />

        {/* 7. Black Environment Transparent Pricing */}
        <SimplerSolutionSection />

        {/* 8. Compare Creator Platforms Section */}
        <ComparePlatformsSection />

        {/* 9. Clean White FAQ Accordion */}
        <FaqSection />
      </main>

      {/* 10. Black Minimal Brand Footer */}
      <Footer />
    </div>
  )
}
