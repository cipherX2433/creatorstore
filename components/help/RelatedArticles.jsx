'use client'

import Link from 'next/link'
import { ChevronRight, ArrowRight } from 'lucide-react'

export default function RelatedArticles({
  articles = [],
  currentArticleId,
  categoryTitle = 'Related Articles',
}) {
  const filtered = articles.filter((a) => a.id !== currentArticleId).slice(0, 4)

  if (filtered.length === 0) return null

  return (
    <section className="w-full mt-12 pt-8 border-t border-[#E2E3DD]">
      <div className="flex items-center justify-between mb-4">
        <h3
          className="text-xl sm:text-2xl font-black text-[#202432] tracking-tight"
          style={{ fontFamily: "'Plus Jakarta Sans', var(--font-brand), sans-serif" }}
        >
          {categoryTitle}
        </h3>
      </div>

      <div className="bg-white rounded-2xl border border-[#E2E3DD] overflow-hidden shadow-sm divide-y divide-[#E2E3DD]">
        {filtered.map((art) => (
          <Link
            key={art.id}
            href={`/help/${art.categoryId}/${art.slug}`}
            className="group flex items-center justify-between gap-4 p-4 sm:p-5 hover:bg-[#FBFBFA] focus:outline-none focus:bg-[#F3F3F0] transition-colors"
          >
            <div className="min-w-0 flex-1 pr-2">
              <h4 className="text-sm sm:text-base font-bold text-[#202432] group-hover:text-[#5B347C] transition-colors">
                {art.title}
              </h4>
              {art.summary && (
                <p className="text-xs text-[#777A83] mt-1 line-clamp-1 leading-relaxed">
                  {art.summary}
                </p>
              )}
            </div>
            <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-[#5B347C] group-hover:translate-x-1 transition-all shrink-0" />
          </Link>
        ))}
      </div>
    </section>
  )
}
