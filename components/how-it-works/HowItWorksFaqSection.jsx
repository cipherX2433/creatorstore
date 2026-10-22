'use client'

import React from 'react'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { HOW_IT_WORKS_FAQS } from '@/lib/howItWorksData'

export default function HowItWorksFaqSection() {
  return (
    <section
      id="how-it-works-faq"
      className="w-full bg-[#F4F4F2] text-[#1C1C1C] py-20 sm:py-28 lg:py-32 px-4 sm:px-6 lg:px-8 border-b border-black/5"
    >
      <div className="max-w-4xl mx-auto">
        {/* Section Heading */}
        <div className="text-center mb-14 sm:mb-20">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white border border-[#E5E5E3] text-xs font-bold tracking-widest uppercase text-[#FF4D24] mb-4">
            FAQS
          </div>
          <h2
            className="text-3xl sm:text-5xl lg:text-6xl font-black text-[#1C1C1C] tracking-tight leading-[1.12]"
            style={{ fontFamily: "'Plus Jakarta Sans', var(--font-brand), sans-serif" }}
          >
            Frequently asked questions
          </h2>
          <p className="mt-4 text-base sm:text-lg text-[#6F6F6B] max-w-xl mx-auto font-normal">
            Everything you need to know about setting up, selling, and getting paid.
          </p>
        </div>

        {/* Accordion Rows */}
        <Accordion type="single" collapsible defaultValue="faq-01" className="w-full space-y-4">
          {HOW_IT_WORKS_FAQS.map((faq) => (
            <AccordionItem
              key={faq.id}
              value={faq.id}
              className="bg-white rounded-[24px] sm:rounded-[30px] border border-[#E2E3DD] shadow-[0_4px_20px_rgba(0,0,0,0.02)] overflow-hidden px-6 sm:px-8 border-b-0 transition-all hover:border-[#D5D6D0]"
            >
              <AccordionTrigger
                className="py-5 sm:py-6 text-left hover:no-underline font-bold text-lg sm:text-xl text-[#1C1C1C] group"
                style={{ fontFamily: "'Plus Jakarta Sans', var(--font-brand), sans-serif" }}
              >
                <div className="flex items-center gap-4 pr-4">
                  <span className="font-mono text-sm sm:text-base font-bold text-[#FF4D24] shrink-0">
                    {faq.num}
                  </span>
                  <span>{faq.question}</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pb-6 pt-1 text-sm sm:text-base text-[#6F6F6B] leading-relaxed pl-8 sm:pl-9">
                {faq.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  )
}
