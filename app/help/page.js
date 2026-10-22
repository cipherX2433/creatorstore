import { HELP_CATEGORIES, HELP_ARTICLES } from '@/lib/helpContent'
import HelpHero from '@/components/help/HelpHero'
import HelpCategoryCard from '@/components/help/HelpCategoryCard'
import PopularArticles from '@/components/help/PopularArticles'
import ContactSupportSection from '@/components/help/ContactSupportSection'
import HelpFooter from '@/components/help/HelpFooter'

export const metadata = {
  title: 'CreatorStore Help Center — Guides, Tutorials, and Answers',
  description: 'Explore step-by-step guides, FAQs, and resources for building your storefront, selling digital products, managing bookings, and growing your creator business on CreatorStore.',
}

export default function HelpCenterHomePage() {
  // Compute real article count per category
  const articleCounts = {}
  HELP_CATEGORIES.forEach((cat) => {
    articleCounts[cat.id] = HELP_ARTICLES.filter((a) => a.categoryId === cat.id).length
  })

  // Curated popular articles from real data
  const popularArticles = [
    HELP_ARTICLES.find((a) => a.slug === 'how-to-set-up-storefront'),
    HELP_ARTICLES.find((a) => a.slug === 'how-to-add-and-publish-product'),
    HELP_ARTICLES.find((a) => a.slug === 'how-to-add-social-media-links'),
    HELP_ARTICLES.find((a) => a.slug === 'how-to-configure-booking-items'),
    HELP_ARTICLES.find((a) => a.slug === 'how-to-customize-digital-business-card'),
    HELP_ARTICLES.find((a) => a.slug === 'understanding-payment-statuses'),
  ].filter(Boolean)

  return (
    <div className="min-h-screen bg-[#F3F3F0] text-[#202432] selection:bg-[#D8F21F] selection:text-black font-sans antialiased">
      {/* Lime Hero Banner */}
      <HelpHero />

      {/* Main Content Area */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-12 sm:py-16 space-y-16 sm:space-y-20">
        {/* Category Cards Section */}
        <section aria-labelledby="help-categories-heading">
          <h2 id="help-categories-heading" className="sr-only">
            Help Categories
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
            {HELP_CATEGORIES.map((category) => (
              <HelpCategoryCard
                key={category.id}
                category={category}
                articleCount={articleCounts[category.id] || 0}
              />
            ))}
          </div>
        </section>

        {/* Popular Articles Section */}
        <PopularArticles
          articles={popularArticles}
          title="Popular articles"
        />

        {/* Support CTA Section */}
        <ContactSupportSection />
      </main>

      {/* Footer */}
      <HelpFooter />
    </div>
  )
}
