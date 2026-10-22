import { notFound } from 'next/navigation'
import Link from 'next/link'
import {
  Compass,
  Package,
  Wallet,
  Calendar,
  Sparkles,
  ShieldCheck,
  Folder,
  ChevronRight,
} from 'lucide-react'
import { HELP_CATEGORIES, HELP_ARTICLES } from '@/lib/helpContent'
import HelpCenterHeader from '@/components/help/HelpCenterHeader'
import HelpSearch from '@/components/help/HelpSearch'
import HelpBreadcrumbs from '@/components/help/HelpBreadcrumbs'
import ContactSupportSection from '@/components/help/ContactSupportSection'
import HelpFooter from '@/components/help/HelpFooter'

const ICON_MAP = {
  Compass,
  Package,
  Wallet,
  Calendar,
  Sparkles,
  ShieldCheck,
}

export async function generateMetadata({ params }) {
  const { categorySlug } = await params
  const category = HELP_CATEGORIES.find((c) => c.id === categorySlug)
  if (!category) return { title: 'Category Not Found — CreatorStore Help Center' }

  return {
    title: `${category.title} — CreatorStore Help Center`,
    description: category.description,
  }
}

export default async function HelpCategoryPage({ params }) {
  const { categorySlug } = await params
  const category = HELP_CATEGORIES.find((c) => c.id === categorySlug)

  if (!category) {
    notFound()
  }

  // Articles in this category
  const articles = HELP_ARTICLES.filter((a) => a.categoryId === category.id)
  const IconComponent = ICON_MAP[category.iconName] || Folder

  return (
    <div className="min-h-screen bg-[#F3F3F0] text-[#202432] selection:bg-[#D8F21F] selection:text-black font-sans antialiased">
      {/* Top Header */}
      <HelpCenterHeader />

      {/* Search Header Banner */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-6 sm:pt-10">
        <div className="w-full max-w-xl">
          <HelpSearch variant="compact" placeholder="Search for articles" />
        </div>
      </div>

      {/* Main Container */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-10 sm:space-y-14">
        {/* Breadcrumb Navigation */}
        <HelpBreadcrumbs items={[{ label: category.title }]} />

        {/* Category Header (Icon Tile, Title, Description, Count) */}
        <div className="space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-[#EBC1EB]/60 text-[#5B347C] flex items-center justify-center shadow-sm">
            <IconComponent className="w-7 h-7 stroke-[1.8]" />
          </div>

          <h1
            className="text-3xl sm:text-5xl font-black text-[#202432] tracking-tight leading-tight"
            style={{ fontFamily: "'Plus Jakarta Sans', var(--font-brand), sans-serif" }}
          >
            {category.title}
          </h1>

          <p className="text-base sm:text-xl font-bold text-[#202432]/90 max-w-2xl leading-relaxed">
            {category.description}
          </p>

          <p className="text-sm font-semibold text-[#777A83]">
            {articles.length} {articles.length === 1 ? 'article' : 'articles'}
          </p>
        </div>

        {/* Articles Section */}
        <div className="space-y-8">
          {/* Subheading / Topics header */}
          <div>
            <h2
              className="text-2xl sm:text-3xl font-black text-[#202432] tracking-tight"
              style={{ fontFamily: "'Plus Jakarta Sans', var(--font-brand), sans-serif" }}
            >
              Guides &amp; Articles
            </h2>
            <p className="text-sm text-[#777A83] mt-1">
              Browse step-by-step instructions and best practices for {category.title.toLowerCase()}.
            </p>
          </div>

          {/* White Divided List Container */}
          {articles.length > 0 ? (
            <div className="bg-white rounded-[24px] border border-[#E2E3DD] overflow-hidden shadow-sm divide-y divide-[#E2E3DD]">
              {articles.map((article) => (
                <Link
                  key={article.id}
                  href={`/help/${category.id}/${article.slug}`}
                  className="group flex items-center justify-between gap-4 p-5 sm:p-6 hover:bg-[#FBFBFA] focus:outline-none focus:bg-[#F3F3F0] transition-colors"
                >
                  <div className="min-w-0 flex-1 pr-2">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-semibold text-[#5B347C]">
                        {article.readTime}
                      </span>
                    </div>
                    <h3 className="text-base sm:text-lg font-bold text-[#202432] group-hover:text-[#5B347C] transition-colors">
                      {article.title}
                    </h3>
                    {article.summary && (
                      <p className="text-xs sm:text-sm text-[#777A83] mt-1 line-clamp-1 leading-relaxed">
                        {article.summary}
                      </p>
                    )}
                  </div>

                  <ChevronRight className="w-5 h-5 text-[#777A83]/70 group-hover:text-[#5B347C] group-hover:translate-x-1 transition-all shrink-0" />
                </Link>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-3xl p-8 border border-[#E2E3DD] text-center">
              <p className="text-[#777A83]">No articles available in this category yet.</p>
            </div>
          )}

          {/* Key Topics Covered Chips */}
          {category.topics && category.topics.length > 0 && (
            <div className="pt-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#777A83] mb-3">
                Key Topics Covered
              </h3>
              <div className="flex flex-wrap gap-2">
                {category.topics.map((topic, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center px-3 py-1.5 rounded-full bg-white border border-[#E2E3DD] text-xs font-medium text-[#202432]"
                  >
                    {topic}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Support CTA */}
        <ContactSupportSection />
      </main>

      {/* Footer */}
      <HelpFooter />
    </div>
  )
}
