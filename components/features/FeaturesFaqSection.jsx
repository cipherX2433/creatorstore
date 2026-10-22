'use client'

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { FEATURES_FAQS } from '@/lib/featuresData'

export default function FeaturesFaqSection() {
  return (
    <section
      id="features-faq"
      className="w-full bg-[#F3F3F0] py-16 sm:py-24 px-4 sm:px-6 lg:px-8 border-b border-black/5"
    >
      <div className="max-w-4xl mx-auto">
        {/* Section Heading */}
        <h2
          className="text-4xl sm:text-5xl lg:text-6xl font-black text-[#1C1C1C] text-center mb-12 sm:mb-16 tracking-tight"
          style={{ fontFamily: "'Plus Jakarta Sans', var(--font-brand), sans-serif" }}
        >
          Frequently asked questions
        </h2>

        {/* Accordion List */}
        <Accordion type="single" collapsible className="w-full space-y-4">
          {FEATURES_FAQS.map((faq) => (
            <AccordionItem
              key={faq.id}
              value={faq.id}
              className="bg-white rounded-[22px] border border-[#E2E3DD] shadow-[0_4px_20px_rgba(0,0,0,0.02)] overflow-hidden px-6 sm:px-8 border-b-0"
            >
              <AccordionTrigger
                className="py-5 sm:py-6 text-left hover:no-underline font-bold text-lg sm:text-xl text-[#1C1C1C] group"
                style={{ fontFamily: "'Plus Jakarta Sans', var(--font-brand), sans-serif" }}
              >
                <span className="pr-4">{faq.question}</span>
              </AccordionTrigger>
              <AccordionContent className="pb-6 pt-1 text-sm sm:text-base text-[#555555] leading-relaxed">
                {faq.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  )
}
