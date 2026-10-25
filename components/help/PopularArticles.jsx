'use client'

import Link from 'next/link'
import { ChevronRight } from 'lucide-react'

export default function PopularArticles({ articles = [], title = 'Popular articles' }) {
  if (!articles || articles.length === 0) return null

  return (
    <section className="w-full">
      <h2
        className="text-2xl sm:text-3xl font-black text-[#202432] tracking-tight mb-5 sm:mb-6"
        style={{ fontFamily: "'Plus Jakarta Sans', var(--font-brand), sans-serif" }}
      >
        {title}
      </h2>

      <div className="bg-white rounded-[24px] border border-[#E2E3DD] overflow-hidden shadow-sm divide-y divide-[#E2E3DD]">
        {articles.map((article) => (
          <Link
            key={article.id}
            href={`/help/${article.categoryId}/${article.slug}`}
            className="group flex items-center justify-between gap-4 p-5 sm:p-6 hover:bg-[#FBFBFA] focus:outline-none focus:bg-[#F3F3F0] transition-colors"
          >
            <div className="min-w-0 flex-1 pr-2">
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
    </section>
  )
}
