import Navbar from '@/components/landing/Navbar'
import Footer from '@/components/landing/Footer'
import Link from 'next/link'
import { Shield, Lock, FileText, CheckCircle2, Mail, ExternalLink } from 'lucide-react'
import { SUPPORT_EMAIL } from '@/config/site'

export const metadata = {
  title: 'Privacy Policy | CreatorStore',
  description: 'Privacy Policy for CreatorStore and its creator commerce and Instagram integration services.',
}

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-black font-sans antialiased text-white selection:bg-primary selection:text-black">
      {/* Top Navigation */}
      <Navbar />

      <main className="max-w-4xl mx-auto px-6 py-16 sm:py-24">
        {/* Header Badge & Title */}
        <div className="space-y-4 text-center sm:text-left border-b border-white/10 pb-10 mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/30 text-primary text-xs font-bold uppercase tracking-wider">
            <Shield className="h-3.5 w-3.5" /> Legal & Transparency
          </div>
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-white">
            Privacy Policy
          </h1>
          <p className="text-sm font-semibold text-[rgba(244,242,236,0.68)]">
            Last updated: <span className="text-white">September 8, 2026</span>
          </p>
        </div>

        {/* Intro Banner */}
        <div className="bg-[#121212] border border-white/10 rounded-xl p-6 sm:p-8 mb-12 shadow-lg space-y-4">
          <p className="text-base text-slate-300 leading-relaxed font-medium">
            <strong className="text-white font-black">CreatorStore</strong> (&quot;CreatorStore&quot;, &quot;we&quot;, &quot;us&quot;, or &quot;our&quot;) provides tools that allow creators to create storefronts, sell digital products, and connect supported third-party platforms such as Instagram.
          </p>
          <p className="text-base text-slate-300 leading-relaxed font-medium">
            This Privacy Policy explains what information we collect, how we use it, how we protect it, and how users can request deletion of their information.
          </p>
        </div>

        {/* Sections Grid / Stack */}
        <div className="space-y-12 text-slate-300 leading-relaxed font-normal">

          {/* Section 1 */}
          <section className="space-y-4">
            <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2.5">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-[#000000] font-black text-sm">1</span>
              Information We Collect
            </h2>

            <div className="space-y-4 pl-0 sm:pl-9">
              <div className="bg-[#121212] border border-white/10 p-5 rounded-lg space-y-2">
                <h3 className="font-bold text-white text-base">Account Information</h3>
                <ul className="list-disc list-inside text-sm text-[rgba(244,242,236,0.68)] space-y-1 font-medium">
                  <li>Name</li>
                  <li>Email address</li>
                  <li>Authentication information</li>
                  <li>Creator profile information</li>
                </ul>
              </div>

              <div className="bg-[#121212] border border-white/10 p-5 rounded-lg space-y-2">
                <h3 className="font-bold text-white text-base">Store and Product Information</h3>
                <ul className="list-disc list-inside text-sm text-[rgba(244,242,236,0.68)] space-y-1 font-medium">
                  <li>Store information</li>
                  <li>Digital product information</li>
                  <li>Product descriptions</li>
                  <li>Product files uploaded by creators</li>
                  <li>Pricing and storefront configuration</li>
                </ul>
              </div>

              <div className="bg-[#121212] border border-white/10 p-5 rounded-lg space-y-2">
                <h3 className="font-bold text-white text-base">Payment Information</h3>
                <p className="text-sm text-[rgba(244,242,236,0.68)] leading-relaxed">
                  CreatorStore uses third-party payment providers to process payments. CreatorStore does not store complete payment card information.
                </p>
                <p className="text-xs font-bold text-white pt-1">
                  Depending on the payment provider, transaction information may include:
                </p>
                <ul className="list-disc list-inside text-sm text-[rgba(244,242,236,0.68)] space-y-1 font-medium">
                  <li>Transaction ID</li>
                  <li>Payment status</li>
                  <li>Amount</li>
                  <li>Order information</li>
                  <li>Relevant customer information required to complete the transaction</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Section 2 */}
          <section className="space-y-4">
            <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2.5">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-[#000000] font-black text-sm">2</span>
              Instagram and Third-Party Platform Data
            </h2>

            <div className="pl-0 sm:pl-9 space-y-4">
              <p className="text-sm text-slate-300">
                If a creator chooses to connect an Instagram account to CreatorStore, we may receive information provided through Meta&apos;s official APIs, such as:
              </p>

              <ul className="list-disc list-inside text-sm text-[rgba(244,242,236,0.68)] space-y-1.5 font-medium bg-[#121212] border border-white/10 p-5 rounded-lg">
                <li>Instagram account ID</li>
                <li>Instagram username</li>
                <li>Account-related information made available through the authorized API</li>
                <li>Comments and comment-related information required for automation</li>
                <li>Messaging information required to provide requested automation functionality</li>
                <li>Instagram media/post identifiers</li>
                <li>Information related to CreatorStore automation activity</li>
              </ul>

              <div className="p-4 bg-[#CBE957]/10 border border-[#CBE957]/30 rounded-lg text-xs text-[#CBE957] font-semibold space-y-1">
                <p>✓ CreatorStore only accesses Instagram information that is necessary for the functionality explicitly enabled by the creator.</p>
                <p>✓ CreatorStore does not ask users for or store their Instagram password.</p>
                <p>✓ Instagram authentication is performed strictly through Meta&apos;s official OAuth/API authorization flow.</p>
              </div>
            </div>
          </section>

          {/* Section 3 */}
          <section className="space-y-4">
            <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2.5">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-[#000000] font-black text-sm">3</span>
              How We Use Information
            </h2>

            <div className="pl-0 sm:pl-9">
              <div className="bg-[#121212] border border-white/10 p-5 rounded-lg">
                <p className="text-sm text-slate-300 font-medium mb-3">We may use collected information to:</p>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-[rgba(244,242,236,0.68)] font-medium">
                  <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-primary shrink-0" /> Create and manage accounts</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-primary shrink-0" /> Provide creator storefronts</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-primary shrink-0" /> Deliver digital products</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-primary shrink-0" /> Process and track orders</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-primary shrink-0" /> Provide Instagram integrations</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-primary shrink-0" /> Execute Instagram automations</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-primary shrink-0" /> Send authorized API messages</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-primary shrink-0" /> Maintain security & reliability</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-primary shrink-0" /> Provide customer support</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-primary shrink-0" /> Prevent fraud & abuse</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Section 4 */}
          <section className="space-y-4">
            <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2.5">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-[#000000] font-black text-sm">4</span>
              Instagram Automation
            </h2>

            <div className="pl-0 sm:pl-9 space-y-3">
              <p className="text-sm text-slate-300 leading-relaxed">
                Creators may configure Instagram automations such as comment-triggered responses.
              </p>
              <p className="text-sm text-slate-300 leading-relaxed">
                When an automation is enabled, CreatorStore may process relevant Instagram events, including comments on supported Instagram media, in order to execute the automation configured by the creator.
              </p>
              <p className="text-sm text-slate-300 leading-relaxed">
                CreatorStore only performs actions that the creator has explicitly configured and authorized. Creators can disable or remove an Instagram automation at any time.
              </p>
            </div>
          </section>

          {/* Section 5 */}
          <section className="space-y-4">
            <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2.5">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-[#000000] font-black text-sm">5</span>
              Data Sharing
            </h2>

            <div className="pl-0 sm:pl-9 space-y-3">
              <p className="text-sm font-bold text-white">We do not sell personal information.</p>
              <p className="text-sm text-slate-300 leading-relaxed">
                We may share or transmit information with trusted third-party service providers when necessary to provide CreatorStore functionality, including:
              </p>
              <ul className="list-disc list-inside text-sm text-[rgba(244,242,236,0.68)] space-y-1 font-medium bg-[#121212] border border-white/10 p-4 rounded-lg">
                <li>Payment processing providers</li>
                <li>Hosting and infrastructure providers</li>
                <li>Database and storage providers (e.g. Supabase, PostgreSQL)</li>
                <li>Authentication providers</li>
                <li>Meta / Instagram APIs</li>
                <li>Other services explicitly required to provide features requested by the user</li>
              </ul>
              <p className="text-xs text-[rgba(244,242,236,0.68)]">
                Third-party services process information according to their own privacy policies and applicable requirements.
              </p>
            </div>
          </section>

          {/* Section 6 */}
          <section className="space-y-4">
            <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2.5">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-[#000000] font-black text-sm">6</span>
              Data Security
            </h2>

            <div className="pl-0 sm:pl-9 space-y-3">
              <p className="text-sm text-slate-300 leading-relaxed">
                We use reasonable technical and organizational measures to protect information against unauthorized access, alteration, disclosure, or destruction.
              </p>
              <p className="text-sm text-slate-300 leading-relaxed">
                Authentication credentials, API credentials, and third-party access tokens are handled using appropriate server-side security practices. Sensitive credentials and access tokens are never exposed to client applications.
              </p>
              <p className="text-xs text-[rgba(244,242,236,0.68)] italic">
                However, no internet-based service can guarantee absolute security.
              </p>
            </div>
          </section>

          {/* Section 7 */}
          <section className="space-y-4">
            <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2.5">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-[#000000] font-black text-sm">7</span>
              Data Retention
            </h2>

            <div className="pl-0 sm:pl-9 space-y-3">
              <p className="text-sm text-slate-300 leading-relaxed">
                We retain information only for as long as reasonably necessary to provide CreatorStore services, maintain account functionality, comply with legal obligations, resolve disputes, and enforce agreements.
              </p>
              <p className="text-sm text-slate-300 leading-relaxed">
                Creators may disconnect third-party integrations and request deletion of their associated data at any time.
              </p>
            </div>
          </section>

          {/* Section 8 */}
          <section className="space-y-4">
            <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2.5">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-[#000000] font-black text-sm">8</span>
              Data Deletion
            </h2>

            <div className="pl-0 sm:pl-9 space-y-4">
              <p className="text-sm text-slate-300 leading-relaxed">
                Users may request deletion of their CreatorStore account and associated personal information. Users may also disconnect their Instagram account from CreatorStore via Settings → Connected Accounts.
              </p>

              <div className="bg-[#121212] border border-white/10 p-5 rounded-lg space-y-2">
                <p className="text-xs font-bold text-[rgba(244,242,236,0.68)] uppercase tracking-wider">For Data Deletion Requests, Contact:</p>
                <a href={`mailto:${SUPPORT_EMAIL}`} className="text-base font-black text-primary hover:underline flex items-center gap-2">
                  <Mail className="h-4 w-4" /> {SUPPORT_EMAIL}
                </a>
              </div>

              <p className="text-xs text-[rgba(244,242,236,0.68)]">
                When legally and technically possible, we will delete or anonymize information that is no longer required.
              </p>
            </div>
          </section>

          {/* Section 9 */}
          <section className="space-y-4">
            <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2.5">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-[#000000] font-black text-sm">9</span>
              Third-Party Services
            </h2>

            <div className="pl-0 sm:pl-9 space-y-3">
              <p className="text-sm text-slate-300 leading-relaxed">
                CreatorStore integrates with third-party services including Meta/Instagram and payment providers. These services may independently collect or process information according to their own policies.
              </p>
              <p className="text-xs text-[rgba(244,242,236,0.68)]">
                CreatorStore is not responsible for the privacy practices of third-party services outside CreatorStore&apos;s control.
              </p>
            </div>
          </section>

          {/* Section 10 */}
          <section className="space-y-4">
            <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2.5">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-[#000000] font-black text-sm">10</span>
              Children&apos;s Privacy
            </h2>

            <div className="pl-0 sm:pl-9 space-y-3">
              <p className="text-sm text-slate-300 leading-relaxed">
                CreatorStore is not intended for children under the applicable minimum age required to use the service. We do not knowingly collect personal information from children in violation of applicable law.
              </p>
            </div>
          </section>

          {/* Section 11 */}
          <section className="space-y-4">
            <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2.5">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-[#000000] font-black text-sm">11</span>
              Changes to This Privacy Policy
            </h2>

            <div className="pl-0 sm:pl-9 space-y-3">
              <p className="text-sm text-slate-300 leading-relaxed">
                We may update this Privacy Policy from time to time. When changes are made, the &quot;Last updated&quot; date will be updated accordingly.
              </p>
            </div>
          </section>

          {/* Section 12 */}
          <section className="space-y-4">
            <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2.5">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-[#000000] font-black text-sm">12</span>
              Contact Us &amp; Privacy Requests
            </h2>

            <div className="pl-0 sm:pl-9 space-y-4">
              <p className="text-sm text-slate-300">
                For questions, privacy requests, or data deletion requests, contact our dedicated privacy and data handling team:
              </p>
              <div className="bg-[#121212] border border-white/10 p-5 rounded-lg inline-block">
                <a href={`mailto:${SUPPORT_EMAIL}`} className="text-base font-black text-primary hover:underline flex items-center gap-2">
                  <Mail className="h-4 w-4" /> {SUPPORT_EMAIL}
                </a>
              </div>
            </div>
          </section>

          {/* Section 13 Notice Banner for Meta App Compliance */}
          <section className="border-t border-white/10 pt-10 mt-12">
            <div className="bg-[#121212] border border-primary/40 p-6 sm:p-8 rounded-xl space-y-4">
              <div className="flex items-center gap-2 text-primary font-black text-base">
                <Lock className="h-5 w-5" /> Meta & Instagram Platform Compliance Statement
              </div>
              <ul className="space-y-2 text-xs sm:text-sm text-[rgba(244,242,236,0.68)] font-medium leading-relaxed">
                <li className="flex items-start gap-2">
                  <span className="text-primary font-bold">•</span>
                  <span>Instagram authentication is performed strictly through Meta&apos;s official authorization/API flow.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary font-bold">•</span>
                  <span>CreatorStore does not collect or store user Instagram passwords.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary font-bold">•</span>
                  <span>Instagram data is accessed strictly after explicit creator authorization.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary font-bold">•</span>
                  <span>Instagram data is used solely to provide creator-enabled storefront and comment automation functionality.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary font-bold">•</span>
                  <span>Users can disconnect Instagram at any time via Settings → Connected Accounts and request deletion of associated data.</span>
                </li>
              </ul>
            </div>
          </section>

        </div>
      </main>

      {/* Footer */}
      <Footer />
    </div>
  )
}
