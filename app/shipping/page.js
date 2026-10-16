import Navbar from '@/components/landing/Navbar'
import Footer from '@/components/landing/Footer'
import { Package, Download, Mail, Zap, CheckCircle2, ShieldCheck } from 'lucide-react'
import { SUPPORT_EMAIL } from '@/config/site'

export const metadata = {
  title: 'Shipping Policy | CreatorStore',
  description: 'Electronic delivery and shipping policy for CreatorStore and creator digital products.',
}

export default function ShippingPolicyPage() {
  return (
    <div className="min-h-screen bg-black font-sans antialiased text-white selection:bg-primary selection:text-black">
      {/* Top Navigation */}
      <Navbar />

      <main className="max-w-4xl mx-auto px-6 py-16 sm:py-24">
        {/* Header Badge & Title */}
        <div className="space-y-4 text-center sm:text-left border-b border-white/10 pb-10 mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/30 text-primary text-xs font-bold uppercase tracking-wider">
            <Package className="h-3.5 w-3.5" /> Electronic Fulfillment
          </div>
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-white">
            Shipping &amp; Delivery Policy
          </h1>
          <p className="text-sm font-semibold text-[rgba(244,242,236,0.68)]">
            Last updated: <span className="text-white">September 13, 2026</span>
          </p>
        </div>

        {/* Intro Banner */}
        <div className="bg-[#121212] border border-white/10 rounded-xl p-6 sm:p-8 mb-12 shadow-lg space-y-4">
          <p className="text-base text-slate-300 leading-relaxed font-medium">
            <strong className="text-white font-black">CreatorStore</strong> is a digital creator commerce platform. CreatorStore primarily delivers digital products electronically. We do not currently operate a physical-product shipping service.
          </p>
        </div>

        {/* Policy Sections */}
        <div className="space-y-12 text-slate-300 leading-relaxed font-normal">

          {/* Section 1: Electronic Delivery */}
          <section className="space-y-4">
            <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2.5">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-[#000000] font-black text-sm">1</span>
              Instant Digital Delivery
            </h2>

            <div className="pl-0 sm:pl-9 space-y-4">
              <p className="text-sm text-slate-300 leading-relaxed">
                All digital items purchased on CreatorStore storefronts (including downloadable files, templates, guides, presets, digital resources, and online content) are delivered electronically:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-[#121212] border border-white/10 p-5 rounded-xl space-y-2">
                  <div className="flex items-center gap-2 text-primary font-bold text-sm">
                    <Zap className="h-4 w-4" /> Checkout Screen Delivery
                  </div>
                  <p className="text-xs text-[rgba(244,242,236,0.68)] leading-relaxed">
                    Immediate access and download links appear directly on the order confirmation screen as soon as your payment is processed.
                  </p>
                </div>

                <div className="bg-[#121212] border border-white/10 p-5 rounded-xl space-y-2">
                  <div className="flex items-center gap-2 text-[#CBE957] font-bold text-sm">
                    <Mail className="h-4 w-4" /> Email Confirmation
                  </div>
                  <p className="text-xs text-[rgba(244,242,236,0.68)] leading-relaxed">
                    A purchase receipt and digital download access link are simultaneously sent to the buyer&apos;s provided email address.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Section 2: Shipping Rates & Fees */}
          <section className="space-y-4">
            <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2.5">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-[#000000] font-black text-sm">2</span>
              Shipping Rates &amp; Costs
            </h2>

            <div className="pl-0 sm:pl-9 space-y-3">
              <div className="bg-[#121212] border border-white/10 p-5 rounded-xl space-y-2">
                <p className="text-sm text-white font-bold">
                  ₹0 Shipping Fee for All Digital Products
                </p>
                <p className="text-xs text-[rgba(244,242,236,0.68)] leading-relaxed">
                  Because all products are delivered electronically via the internet, no physical shipping fees, freight charges, customs duties, or postal handling charges are applied to digital transactions.
                </p>
              </div>
            </div>
          </section>

          {/* Section 3: Delivery Issues & Support */}
          <section className="space-y-4">
            <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2.5">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-[#000000] font-black text-sm">3</span>
              Delivery Troubleshooting &amp; Assistance
            </h2>

            <div className="pl-0 sm:pl-9 space-y-3">
              <p className="text-sm text-slate-300 leading-relaxed">
                If you completed a purchase but did not receive your download link or confirmation email:
              </p>
              <ul className="list-disc list-inside text-sm text-[rgba(244,242,236,0.68)] space-y-1.5 font-medium bg-[#121212] border border-white/10 p-5 rounded-xl">
                <li>Check your email spam, promotions, or junk folder for messages from CreatorStore.</li>
                <li>Verify that the email address entered during checkout was accurate and active.</li>
                <li>Contact CreatorStore support directly at <a href={`mailto:${SUPPORT_EMAIL}`} className="text-primary hover:underline font-bold">{SUPPORT_EMAIL}</a> with your payment transaction receipt or order confirmation, and our team will re-send your download access link immediately.</li>
              </ul>
            </div>
          </section>

          {/* Section 4: Contact Box */}
          <section className="border-t border-white/10 pt-10 mt-12">
            <div className="bg-[#121212] border border-white/10 p-6 sm:p-8 rounded-xl space-y-4">
              <div className="flex items-center gap-2 text-primary font-black text-base">
                <Mail className="h-5 w-5" /> Delivery Support Contact
              </div>
              <p className="text-sm text-slate-300">
                For questions regarding digital product access, download links, or delivery verification:
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
