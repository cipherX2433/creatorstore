import { notFound, redirect } from 'next/navigation'
import { HELP_ARTICLES } from '@/lib/helpContent'

export default async function HelpArticleSlugRedirect({ params }) {
  const { articleSlug } = await params
  const article = HELP_ARTICLES.find((a) => a.slug === articleSlug)

  if (!article) {
    notFound()
  }

  redirect(`/help/${article.categoryId}/${article.slug}`)
}
