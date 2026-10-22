import Navbar from '@/components/landing/Navbar'
import Footer from '@/components/landing/Footer'
import HowItWorksHero from '@/components/how-it-works/HowItWorksHero'
import ThreeStepsSection from '@/components/how-it-works/ThreeStepsSection'
import ExploreFeaturesSection from '@/components/how-it-works/ExploreFeaturesSection'
import WorkflowSection from '@/components/how-it-works/WorkflowSection'
import HowItWorksFaqSection from '@/components/how-it-works/HowItWorksFaqSection'
import HowItWorksCtaSection from '@/components/how-it-works/HowItWorksCtaSection'

export const metadata = {
  title: 'How It Works | CreatorStore — Simple, Powerful Creator Commerce',
  description:
    'Discover how CreatorStore works: set up your mobile-first storefront in 3 simple steps, add digital products and booking links, automate Instagram replies, and receive secure payouts.',
  openGraph: {
    title: 'How It Works | CreatorStore — Simple, Powerful Creator Commerce',
    description:
      'Discover how CreatorStore works: set up your mobile-first storefront in 3 simple steps, add digital products and booking links, automate Instagram replies, and receive secure payouts.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'How It Works | CreatorStore — Simple, Powerful Creator Commerce',
    description:
      'Discover how CreatorStore works: set up your mobile-first storefront in 3 simple steps, add digital products and booking links, automate Instagram replies, and receive secure payouts.',
  },
}

export default function HowItWorksPage() {
  return (
    <div className="min-h-screen bg-[#000000] font-sans antialiased text-[#1C1C1C] selection:bg-[#FF4D24] selection:text-white relative overflow-x-hidden">
      {/* 1. Shared Public Navbar with active indicator for How It Works */}
      <Navbar />

      <main className="w-full">
        {/* 2. Linktree-inspired Centered Hero Section */}
        <HowItWorksHero />

        {/* 3. Three Simple Steps Section (White Cards on Neutral Surface) */}
        <ThreeStepsSection />

        {/* 4. Full-width Orange Background Explore Features Showcase */}
        <ExploreFeaturesSection />

        {/* 5. End-to-End Creator Workflow (4 Connected Steps) */}
        <WorkflowSection />

        {/* 6. Frequently Asked Questions (Large Rounded Accordions) */}
        <HowItWorksFaqSection />

        {/* 7. Final Conversion Call-to-Action */}
        <HowItWorksCtaSection />
      </main>

      {/* 8. Shared Minimal Editorial Brand Footer */}
      <Footer />
    </div>
  )
}
