import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Calendar, Clock, ThumbsUp, ThumbsDown } from 'lucide-react'
import { HELP_CATEGORIES, HELP_ARTICLES } from '@/lib/helpContent'
import HelpCenterHeader from '@/components/help/HelpCenterHeader'
import HelpSearch from '@/components/help/HelpSearch'
import HelpBreadcrumbs from '@/components/help/HelpBreadcrumbs'
import ArticleContent from '@/components/help/ArticleContent'
import RelatedArticles from '@/components/help/RelatedArticles'
import ContactSupportSection from '@/components/help/ContactSupportSection'
import HelpFooter from '@/components/help/HelpFooter'

export async function generateMetadata({ params }) {
  const { categorySlug, articleSlug } = await params
  const article = HELP_ARTICLES.find(
    (a) => a.slug === articleSlug && a.categoryId === categorySlug
  )
  if (!article) return { title: 'Article Not Found — CreatorStore Help Center' }

  return {
    title: `${article.title} — CreatorStore Help Center`,
    description: article.summary,
  }
}

export default async function HelpArticlePage({ params }) {
  const { categorySlug, articleSlug } = await params
  const category = HELP_CATEGORIES.find((c) => c.id === categorySlug)
  const article = HELP_ARTICLES.find(
    (a) => a.slug === articleSlug && a.categoryId === categorySlug
  )

  if (!category || !article) {
    notFound()
  }

  // Sibling articles for "Related Articles"
  const siblingArticles = HELP_ARTICLES.filter((a) => a.categoryId === category.id)

  return (
    <div className="min-h-screen bg-[#F3F3F0] text-[#202432] selection:bg-[#D8F21F] selection:text-black font-sans antialiased">
      {/* Top Header */}
      <HelpCenterHeader />

      {/* Search Header Bar */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-6 sm:pt-10">
        <div className="w-full max-w-xl">
          <HelpSearch variant="compact" placeholder="Search for articles" />
        </div>
      </div>

      {/* Main Container */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <div className="max-w-3xl">
          {/* Breadcrumbs */}
          <HelpBreadcrumbs
            items={[
              { label: category.title, href: `/help/${category.id}` },
              { label: article.title },
            ]}
          />

          {/* Article Title */}
          <h1
            className="text-3xl sm:text-5xl md:text-[52px] font-black text-[#202432] tracking-tight leading-[1.1] mb-4 sm:mb-5"
            style={{ fontFamily: "'Plus Jakarta Sans', var(--font-brand), sans-serif" }}
          >
            {article.title}
          </h1>

          {/* Article Metadata (Read Time, Date) */}
          <div className="flex items-center gap-4 text-xs sm:text-sm text-[#777A83] font-medium pb-6 border-b border-[#E2E3DD]">
            <span>Updated October 14, 2026</span>
            <span className="text-[#E2E3DD]">•</span>
            <span>{article.readTime}</span>
          </div>

          {/* Article Summary Intro */}
          {article.summary && (
            <div className="pt-6 pb-2">
              <p className="text-lg sm:text-xl font-medium text-[#202432] leading-relaxed">
                {article.summary}
              </p>
            </div>
          )}

          {/* Formatted Article Body */}
          <div className="pt-4">
            <ArticleContent content={article.content} />
          </div>

          {/* Article Feedback Banner */}
          <div className="mt-12 p-6 bg-white rounded-2xl border border-[#E2E3DD] flex flex-col sm:flex-row items-center justify-between gap-4">
            <span className="text-sm font-semibold text-[#202432]">
              Did this article help solve your problem?
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-[#E2E3DD] hover:bg-[#F3F3F0] hover:border-[#5B347C] text-xs font-semibold text-[#202432] transition-colors"
              >
                <ThumbsUp className="w-3.5 h-3.5 text-[#5B347C]" />
                <span>Yes</span>
              </button>
              <button
                type="button"
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-[#E2E3DD] hover:bg-[#F3F3F0] text-xs font-semibold text-[#777A83] transition-colors"
              >
                <ThumbsDown className="w-3.5 h-3.5 text-gray-400" />
                <span>No</span>
              </button>
            </div>
          </div>

          {/* Related Articles */}
          <RelatedArticles
            articles={siblingArticles}
            currentArticleId={article.id}
            categoryTitle={`More in ${category.title}`}
          />

          {/* Contact Support Section */}
          <ContactSupportSection />
        </div>
      </main>

      {/* Footer */}
      <HelpFooter />
    </div>
  )
}
