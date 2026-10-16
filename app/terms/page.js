import Navbar from '@/components/landing/Navbar'
import Footer from '@/components/landing/Footer'
import Link from 'next/link'
import { FileText, Shield, Scale, AlertCircle, Mail, CheckCircle2 } from 'lucide-react'
import { SUPPORT_EMAIL } from '@/config/site'

export const metadata = {
  title: 'Terms & Conditions | CreatorStore',
  description: 'Terms & Conditions for using CreatorStore.',
}

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-black font-sans antialiased text-white selection:bg-primary selection:text-black">
      {/* Top Navigation */}
      <Navbar />

      <main className="max-w-4xl mx-auto px-6 py-16 sm:py-24">
        {/* Header Badge & Title */}
        <div className="space-y-4 text-center sm:text-left border-b border-white/10 pb-10 mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/30 text-primary text-xs font-bold uppercase tracking-wider">
            <Scale className="h-3.5 w-3.5" /> Legal Agreement
          </div>
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-white">
            Terms of Service
          </h1>
          <p className="text-sm font-semibold text-[rgba(244,242,236,0.68)]">
            Last updated: <span className="text-white">September 8, 2026</span>
          </p>
        </div>

        {/* Intro Banner */}
        <div className="bg-[#121212] border border-white/10 rounded-xl p-6 sm:p-8 mb-12 shadow-lg space-y-4">
          <p className="text-base text-slate-300 leading-relaxed font-medium">
            Welcome to <strong className="text-white font-black">CreatorStore</strong> (&quot;CreatorStore&quot;, &quot;we&quot;, &quot;us&quot;, or &quot;our&quot;). These Terms of Service (&quot;Terms&quot;) govern your access to and use of CreatorStore&apos;s platform, website, storefront tools, digital product hosting, and third-party integrations (including Instagram integration features).
          </p>
          <p className="text-base text-slate-300 leading-relaxed font-medium">
            By creating an account, publishing a storefront, purchasing digital products, or connecting third-party accounts to CreatorStore, you agree to be bound by these Terms.
          </p>
        </div>

        {/* Terms Sections */}
        <div className="space-y-12 text-slate-300 leading-relaxed font-normal">

          {/* Section 1 */}
          <section className="space-y-4">
            <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2.5">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-[#000000] font-black text-sm">1</span>
              Acceptance of Terms
            </h2>
            <div className="pl-0 sm:pl-9 space-y-3">
              <p className="text-sm text-slate-300 leading-relaxed">
                By accessing or using CreatorStore, you confirm that you are at least the legal age of majority in your jurisdiction and have full legal capacity to enter into a binding agreement. If you use CreatorStore on behalf of an organization or business entity, you represent that you are authorized to bind that entity to these Terms.
              </p>
            </div>
          </section>

          {/* Section 2 */}
          <section className="space-y-4">
            <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2.5">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-[#000000] font-black text-sm">2</span>
              Creator Accounts & Account Security
            </h2>
            <div className="pl-0 sm:pl-9 space-y-3">
              <p className="text-sm text-slate-300 leading-relaxed">
                To access creator features, build a storefront, or upload digital products, you must register for a CreatorStore account.
              </p>
              <ul className="list-disc list-inside text-sm text-[rgba(244,242,236,0.68)] space-y-1.5 font-medium bg-[#121212] border border-white/10 p-5 rounded-lg">
                <li>You must provide accurate, complete, and updated registration information.</li>
                <li>You are solely responsible for maintaining the confidentiality of your account login credentials.</li>
                <li>You are responsible for all activities and transactions occurring under your account.</li>
                <li>You must immediately notify us of any unauthorized use or security breach involving your account.</li>
              </ul>
            </div>
          </section>

          {/* Section 3 */}
          <section className="space-y-4">
            <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2.5">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-[#000000] font-black text-sm">3</span>
              Creator Responsibilities & Digital Products
            </h2>
            <div className="pl-0 sm:pl-9 space-y-3">
              <p className="text-sm text-slate-300 leading-relaxed">
                Creators use CreatorStore to host, display, offer, and deliver digital products, courses, downloadable files, and related services to customers.
              </p>
              <div className="bg-[#121212] border border-white/10 p-5 rounded-lg space-y-2">
                <h3 className="font-bold text-white text-base">Content Ownership & Compliance</h3>
                <p className="text-sm text-[rgba(244,242,236,0.68)] leading-relaxed">
                  You represent and warrant that you own or possess all necessary intellectual property rights, licenses, and permissions for any digital product, image, video, document, or text uploaded to your CreatorStore storefront.
                </p>
              </div>
            </div>
          </section>

          {/* Section 4 */}
          <section className="space-y-4">
            <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2.5">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-[#000000] font-black text-sm">4</span>
              Payments, Subscriptions &amp; Fees
            </h2>
            <div className="pl-0 sm:pl-9 space-y-4">
              <p className="text-sm text-slate-300 leading-relaxed">
                CreatorStore partners with authorized payment gateway providers to process platform subscriptions and buyer orders securely.
              </p>

              <div className="bg-[#121212] border border-white/10 p-5 rounded-lg space-y-3">
                <h3 className="font-bold text-white text-base">CreatorStore Platform Subscriptions</h3>
                <p className="text-sm text-[rgba(244,242,236,0.68)] leading-relaxed">
                  CreatorStore offers paid subscription plans for creators to launch, publish, and scale their storefronts:
                </p>
                <ul className="list-disc list-inside text-sm text-[rgba(244,242,236,0.68)] space-y-1 font-medium">
                  <li><strong className="text-white">Creator Plan:</strong> ₹499 per month</li>
                  <li><strong className="text-white">Pro Plan:</strong> ₹999 per month</li>
                </ul>
                <p className="text-xs text-[rgba(244,242,236,0.68)]">
                  Subscriptions are billed on a recurring monthly basis. Creators may cancel their subscription at any time via Account Settings &rarr; Billing. Upon cancellation, access remains active until the end of the current paid billing cycle.
                </p>
              </div>

              <div className="bg-[#121212] border border-white/10 p-5 rounded-lg space-y-2">
                <h3 className="font-bold text-white text-base">Storefront Orders &amp; Buyer Payments</h3>
                <ul className="list-disc list-inside text-sm text-[rgba(244,242,236,0.68)] space-y-1.5 font-medium">
                  <li>All product prices listed on storefronts are determined directly by the respective creators.</li>
                  <li>Buyers agree to pay all applicable fees, taxes, and prices associated with their orders.</li>
                  <li>All payment processing is handled by certified payment gateways. CreatorStore does not store card numbers or sensitive banking credentials.</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Section 5 */}
          <section className="space-y-4">
            <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2.5">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-[#000000] font-black text-sm">5</span>
              Refunds &amp; Digital Delivery
            </h2>
            <div className="pl-0 sm:pl-9 space-y-3">
              <p className="text-sm text-slate-300 leading-relaxed">
                CreatorStore facilitates the sale and electronic delivery of digital products, resources, and creator services.
              </p>
              <ul className="list-disc list-inside text-sm text-[rgba(244,242,236,0.68)] space-y-1.5 font-medium bg-[#121212] border border-white/10 p-5 rounded-lg">
                <li><strong className="text-white">Digital Delivery:</strong> Upon successful payment, digital products and download links are delivered electronically and instantly on the confirmation screen and/or via email.</li>
                <li><strong className="text-white">Platform Subscriptions:</strong> Subscriptions can be cancelled at any time to avoid future recurring charges. Refund requests for subscription fees are evaluated in accordance with our Cancellation &amp; Refund Policy.</li>
                <li><strong className="text-white">Creator Digital Products:</strong> Refunds for digital goods purchased on creator storefronts are governed by the creator&apos;s posted refund policy, product delivery status, and applicable consumer laws.</li>
              </ul>
              <p className="text-xs text-[rgba(244,242,236,0.68)]">
                For detailed terms, please review our dedicated <Link href="/refund" className="text-primary hover:underline font-bold">Cancellation &amp; Refund Policy</Link> and <Link href="/shipping" className="text-primary hover:underline font-bold">Shipping Policy</Link>.
              </p>
            </div>
          </section>

          {/* Section 6 */}
          <section className="space-y-4">
            <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2.5">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-[#000000] font-black text-sm">6</span>
              Instagram &amp; Meta Platform Integrations
            </h2>
            <div className="pl-0 sm:pl-9 space-y-4">
              <p className="text-sm text-slate-300 leading-relaxed">
                CreatorStore provides opt-in features allowing creators to connect their official Instagram business/creator accounts via Meta&apos;s authorization APIs to run comment-to-DM and storefront link automations.
              </p>
              <div className="bg-[#121212] border border-white/10 p-5 rounded-lg space-y-3">
                <div className="flex items-center gap-2 text-primary font-bold text-sm">
                  <Shield className="h-4 w-4" /> Integration Scope &amp; Control
                </div>
                <ul className="list-disc list-inside text-xs sm:text-sm text-[rgba(244,242,236,0.68)] space-y-1 font-medium">
                  <li>CreatorStore connects strictly through official Meta OAuth permission prompts.</li>
                  <li>CreatorStore never asks for or stores Instagram passwords.</li>
                  <li>Automations run strictly based on triggers and templates configured by the creator.</li>
                  <li>Creators can disconnect their Instagram account at any time via Account Settings.</li>
                </ul>
              </div>

              <div className="p-4 bg-[#121212] border border-[#CBE957]/40 rounded-lg text-xs text-[rgba(244,242,236,0.68)] space-y-1.5 font-medium">
                <p className="text-[#CBE957] font-bold">Important Disclaimer regarding Meta/Instagram Services:</p>
                <p>
                  CreatorStore is an independent service platform. CreatorStore is not responsible for Meta or Instagram platform downtime, API outages, rate limits, algorithm changes, or account restrictions enforced by Meta Platforms, Inc. outside CreatorStore&apos;s control.
                </p>
              </div>
            </div>
          </section>

          {/* Section 7 */}
          <section className="space-y-4">
            <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2.5">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-[#000000] font-black text-sm">7</span>
              Prohibited Activities
            </h2>
            <div className="pl-0 sm:pl-9 space-y-3">
              <p className="text-sm text-slate-300 leading-relaxed">
                You agree not to use CreatorStore for any unlawful or prohibited purpose. Prohibited activities include, but are not limited to:
              </p>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-[rgba(244,242,236,0.68)] font-medium bg-[#121212] border border-white/10 p-5 rounded-lg">
                <li className="flex items-center gap-2"><AlertCircle className="h-4 w-4 text-red-400 shrink-0" /> Selling fraudulent or counterfeit items</li>
                <li className="flex items-center gap-2"><AlertCircle className="h-4 w-4 text-red-400 shrink-0" /> Violating third-party copyright or trademark</li>
                <li className="flex items-center gap-2"><AlertCircle className="h-4 w-4 text-red-400 shrink-0" /> Uploading malware or malicious code</li>
                <li className="flex items-center gap-2"><AlertCircle className="h-4 w-4 text-red-400 shrink-0" /> Sending unsolicited DM spam via Instagram</li>
                <li className="flex items-center gap-2"><AlertCircle className="h-4 w-4 text-red-400 shrink-0" /> Attempting unauthorized platform access</li>
                <li className="flex items-center gap-2"><AlertCircle className="h-4 w-4 text-red-400 shrink-0" /> Circumventing platform fee mechanisms</li>
              </ul>
            </div>
          </section>

          {/* Section 8 */}
          <section className="space-y-4">
            <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2.5">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-[#000000] font-black text-sm">8</span>
              Intellectual Property
            </h2>
            <div className="pl-0 sm:pl-9 space-y-3">
              <p className="text-sm text-slate-300 leading-relaxed">
                CreatorStore and its original logos, brand assets, design system, code, and documentation remain the exclusive intellectual property of CreatorStore. Creators retain full ownership of their uploaded digital products and store branding content.
              </p>
            </div>
          </section>

          {/* Section 9 */}
          <section className="space-y-4">
            <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2.5">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-[#000000] font-black text-sm">9</span>
              Account Suspension &amp; Termination
            </h2>
            <div className="pl-0 sm:pl-9 space-y-3">
              <p className="text-sm text-slate-300 leading-relaxed">
                We reserve the right to suspend or terminate accounts that violate these Terms, engage in fraudulent activity, upload illegal content, or abuse platform resources. Creators may close their account at any time by contacting support.
              </p>
            </div>
          </section>

          {/* Section 10 */}
          <section className="space-y-4">
            <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2.5">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-[#000000] font-black text-sm">10</span>
              Service Availability &amp; Limitation of Liability
            </h2>
            <div className="pl-0 sm:pl-9 space-y-3">
              <p className="text-sm text-slate-300 leading-relaxed">
                CreatorStore is provided on an &quot;AS IS&quot; and &quot;AS AVAILABLE&quot; basis without warranties of any kind, whether express or implied.
              </p>
              <p className="text-sm text-slate-300 leading-relaxed">
                To the maximum extent permitted by law, CreatorStore shall not be liable for any indirect, incidental, special, consequential, or punitive damages, or loss of profits, revenue, data, or goodwill arising out of or related to your use of the service.
              </p>
            </div>
          </section>

          {/* Section 11 */}
          <section className="space-y-4">
            <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2.5">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-[#000000] font-black text-sm">11</span>
              Changes to Terms &amp; Service
            </h2>
            <div className="pl-0 sm:pl-9 space-y-3">
              <p className="text-sm text-slate-300 leading-relaxed">
                We may modify these Terms or update platform features from time to time. Continued use of CreatorStore after updated Terms are published constitutes your acceptance of the revised Terms.
              </p>
            </div>
          </section>

          {/* Section 12 */}
          <section className="space-y-4">
            <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2.5">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-[#000000] font-black text-sm">12</span>
              Contact Information
            </h2>
            <div className="pl-0 sm:pl-9 space-y-4">
              <p className="text-sm text-slate-300">
                If you have any questions or inquiries regarding these Terms of Service, please contact us at:
              </p>
              <div className="bg-[#121212] border border-white/10 p-5 rounded-lg inline-block">
                <a href={`mailto:${SUPPORT_EMAIL}`} className="text-base font-black text-primary hover:underline flex items-center gap-2">
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
