import Navbar from '@/components/landing/Navbar'
import Footer from '@/components/landing/Footer'
import Link from 'next/link'
import { RotateCcw, ShieldCheck, Mail, CheckCircle2, AlertCircle, HelpCircle, FileText } from 'lucide-react'
import { SUPPORT_EMAIL } from '@/config/site'

export const metadata = {
  title: 'Cancellation & Refund Policy | CreatorStore',
  description: 'Cancellation and Refund Policy for CreatorStore platform subscriptions and creator digital products.',
}

export default function RefundPolicyPage() {
  return (
    <div className="min-h-screen bg-black font-sans antialiased text-white selection:bg-primary selection:text-black">
      {/* Top Navigation */}
      <Navbar />

      <main className="max-w-4xl mx-auto px-6 py-16 sm:py-24">
        {/* Header Badge & Title */}
        <div className="space-y-4 text-center sm:text-left border-b border-white/10 pb-10 mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/30 text-primary text-xs font-bold uppercase tracking-wider">
            <RotateCcw className="h-3.5 w-3.5" /> Customer Protection &amp; Terms
          </div>
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-white">
            Cancellation &amp; Refund Policy
          </h1>
          <p className="text-sm font-semibold text-[rgba(244,242,236,0.68)]">
            Last updated: <span className="text-white">September 13, 2026</span>
          </p>
        </div>

        {/* Intro Banner */}
        <div className="bg-[#121212] border border-white/10 rounded-xl p-6 sm:p-8 mb-12 shadow-lg space-y-4">
          <p className="text-base text-slate-300 leading-relaxed font-medium">
            At <strong className="text-white font-black">CreatorStore</strong>, we strive to maintain complete transparency with our creators and their customers.
          </p>
          <p className="text-base text-slate-300 leading-relaxed font-medium">
            This Cancellation and Refund Policy outlines the terms governing:
          </p>
          <ol className="list-decimal list-inside text-sm text-[rgba(244,242,236,0.68)] space-y-1 font-semibold pl-2">
            <li>CreatorStore Platform Subscriptions (Creator &amp; Pro Plans)</li>
            <li>Customer Purchases of Creator Digital Products &amp; Services</li>
          </ol>
        </div>

        {/* Policy Sections */}
        <div className="space-y-12 text-slate-300 leading-relaxed font-normal">

          {/* Section 1: CreatorStore Subscription Plans */}
          <section className="space-y-4">
            <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2.5">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-[#000000] font-black text-sm">1</span>
              CreatorStore Platform Subscriptions
            </h2>

            <div className="pl-0 sm:pl-9 space-y-4">
              <p className="text-sm text-slate-300 leading-relaxed">
                CreatorStore provides two paid subscription plans for creators to build, publish, and scale their online storefronts:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-[#121212] border border-white/10 p-5 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-black uppercase text-primary bg-primary/15 px-2.5 py-0.5 rounded-full">CREATOR</span>
                    <span className="text-lg font-black text-white">₹499 <span className="text-xs font-normal text-slate-400">/ month</span></span>
                  </div>
                  <p className="text-xs text-[rgba(244,242,236,0.68)]">
                    For creators launching a professional storefront with digital products and Instagram AutoDM.
                  </p>
                </div>

                <div className="bg-[#121212] border border-primary/40 p-5 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-black uppercase text-[#000000] bg-primary px-2.5 py-0.5 rounded-full">PRO</span>
                    <span className="text-lg font-black text-white">₹999 <span className="text-xs font-normal text-slate-400">/ month</span></span>
                  </div>
                  <p className="text-xs text-[rgba(244,242,236,0.68)]">
                    For creators seeking advanced growth, lead export, and unlimited automation campaigns.
                  </p>
                </div>
              </div>

              <div className="bg-[#121212] border border-white/10 p-5 rounded-xl space-y-3">
                <h3 className="font-bold text-white text-base">Subscription Cancellation Process</h3>
                <ul className="list-disc list-inside text-sm text-[rgba(244,242,236,0.68)] space-y-2 font-medium">
                  <li>
                    <strong className="text-white">Cancel Anytime:</strong> Creators may cancel their subscription at any time directly through their CreatorStore account dashboard (<strong className="text-white">Settings &rarr; Billing</strong>).
                  </li>
                  <li>
                    <strong className="text-white">Stopping Recurring Charges:</strong> Once cancelled, recurring automated billing will stop immediately for future billing cycles.
                  </li>
                  <li>
                    <strong className="text-white">Active Access Period:</strong> Following cancellation, you will retain access to your paid tier features until the conclusion of your current paid billing period.
                  </li>
                  <li>
                    <strong className="text-white">Subscription Refund Requests:</strong> Subscription fee payments are generally non-refundable once the billing cycle begins. However, if you experienced technical issues or were charged in error, please contact support within 7 days of the charge for review.
                  </li>
                </ul>
              </div>
            </div>
          </section>

          {/* Section 2: Creator Digital Products */}
          <section className="space-y-4">
            <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2.5">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-[#000000] font-black text-sm">2</span>
              Customer Refunds for Creator Digital Products
            </h2>

            <div className="pl-0 sm:pl-9 space-y-4">
              <p className="text-sm text-slate-300 leading-relaxed">
                CreatorStore provides storefront infrastructure and payment tools that allow independent creators to market and deliver digital products, courses, guides, files, and consultation services to buyers.
              </p>

              <div className="bg-[#121212] border border-white/10 p-5 rounded-xl space-y-3">
                <h3 className="font-bold text-white text-base">Digital Product Refund Considerations</h3>
                <p className="text-sm text-[rgba(244,242,236,0.68)] leading-relaxed">
                  Because digital products (such as downloadable files, PDFs, presets, and digital links) are delivered immediately upon payment, refund eligibility is evaluated on a case-by-case basis depending on:
                </p>
                <ul className="list-disc list-inside text-sm text-[rgba(244,242,236,0.68)] space-y-1.5 font-medium">
                  <li>The specific creator&apos;s published store refund policy.</li>
                  <li>Whether the digital product or download link has already been accessed or downloaded.</li>
                  <li>Whether the digital file is corrupted, incomplete, or materially distinct from its description.</li>
                  <li>Applicable consumer protection and e-commerce regulations.</li>
                </ul>
              </div>

              <div className="p-4 bg-[#CBE957]/10 border border-[#CBE957]/30 rounded-xl text-xs sm:text-sm text-[rgba(244,242,236,0.85)] space-y-1.5">
                <p className="font-bold text-[#CBE957]">Our Commitment to Fair Resolution:</p>
                <p>
                  CreatorStore does not enforce a rigid &quot;no refunds under any circumstances&quot; policy. If you have purchased a digital product that was not delivered, is technically defective, or was purchased fraudulently, we encourage you to contact both the creator and CreatorStore support for prompt assistance.
                </p>
              </div>
            </div>
          </section>

          {/* Section 3: How to Request Assistance or Refund */}
          <section className="space-y-4">
            <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2.5">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-[#000000] font-black text-sm">3</span>
              How to Request Support or a Refund
            </h2>

            <div className="pl-0 sm:pl-9 space-y-4">
              <p className="text-sm text-slate-300 leading-relaxed">
                If you need assistance with a subscription cancellation or a transaction refund, please follow these steps:
              </p>

              <div className="bg-[#121212] border border-white/10 p-5 rounded-xl space-y-3">
                <ol className="list-decimal list-inside text-sm text-[rgba(244,242,236,0.68)] space-y-2 font-medium">
                  <li>Send an email to <a href={`mailto:${SUPPORT_EMAIL}`} className="text-primary hover:underline font-bold">{SUPPORT_EMAIL}</a>.</li>
                  <li>Use the subject line: <strong className="text-white">&quot;Refund Request - [Your Order ID / Account Email]&quot;</strong>.</li>
                  <li>Include your purchase date, payment reference (payment transaction ID or invoice number), and the specific reason for your request.</li>
                </ol>
                <p className="text-xs text-[rgba(244,242,236,0.68)] pt-2 border-t border-white/10">
                  Our team reviews all refund and cancellation inquiries within 24–48 business hours. Approved refunds will be credited back to the original payment method within 5–7 business days.
                </p>
              </div>
            </div>
          </section>

          {/* Section 4: Contact Box */}
          <section className="border-t border-white/10 pt-10 mt-12">
            <div className="bg-[#121212] border border-white/10 p-6 sm:p-8 rounded-xl space-y-4">
              <div className="flex items-center gap-2 text-primary font-black text-base">
                <Mail className="h-5 w-5" /> Need Assistance?
              </div>
              <p className="text-sm text-slate-300">
                For questions regarding subscriptions, cancellations, or store policies, contact us directly:
              </p>
              <div>
                <a
                  href={`mailto:${SUPPORT_EMAIL}`}
                  className="inline-flex items-center gap-2 text-base font-black text-primary hover:underline"
                >
                  <Mail className="h-4 w-4" /> {SUPPORT_EMAIL}
                </a>
              </div>
            </div>
          </section>

        </div>
      </main>

      {/* Footer */}
      <Footer />
    </div>
  )
}
