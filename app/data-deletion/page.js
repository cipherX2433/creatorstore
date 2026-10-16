import Navbar from '@/components/landing/Navbar'
import Footer from '@/components/landing/Footer'
import Link from 'next/link'
import { Trash2, Shield, Mail, CheckCircle2, Lock, Info, ExternalLink } from 'lucide-react'
import { SUPPORT_EMAIL } from '@/config/site'

export const metadata = {
  title: 'Data Deletion | CreatorStore',
  description: 'Instructions for requesting deletion of CreatorStore and connected Instagram data.',
}

export default function DataDeletionPage() {
  return (
    <div className="min-h-screen bg-black font-sans antialiased text-white selection:bg-primary selection:text-black">
      {/* Top Navigation */}
      <Navbar />

      <main className="max-w-4xl mx-auto px-6 py-16 sm:py-24">
        {/* Header Badge & Title */}
        <div className="space-y-4 text-center sm:text-left border-b border-white/10 pb-10 mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/30 text-primary text-xs font-bold uppercase tracking-wider">
            <Trash2 className="h-3.5 w-3.5" /> User Rights & Privacy
          </div>
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-white">
            Data Deletion Instructions
          </h1>
          <p className="text-sm font-semibold text-[rgba(244,242,236,0.68)]">
            Last updated: <span className="text-white">September 8, 2026</span>
          </p>
        </div>

        {/* Intro Banner */}
        <div className="bg-[#121212] border border-white/10 rounded-xl p-6 sm:p-8 mb-12 shadow-lg space-y-4">
          <p className="text-base text-slate-300 leading-relaxed font-medium">
            At <strong className="text-white font-black">CreatorStore</strong>, we respect your data privacy and give you full control over your personal information and connected third-party integrations (including Instagram).
          </p>
          <p className="text-base text-slate-300 leading-relaxed font-medium">
            You can request the deletion of your CreatorStore personal data and/or data associated with your connected Instagram account at any time by following the instructions below.
          </p>
        </div>

        {/* Deletion Process Steps */}
        <div className="space-y-12 text-slate-300 leading-relaxed font-normal">

          {/* Section 1: How to Request Deletion */}
          <section className="space-y-6">
            <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2.5">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-[#000000] font-black text-sm">1</span>
              Step-by-Step Data Deletion Request Process
            </h2>

            <div className="pl-0 sm:pl-9 space-y-4">
              <p className="text-sm text-slate-300">
                To request the deletion of your CreatorStore account data and/or connected Meta/Instagram integration data:
              </p>

              <div className="space-y-3">
                <div className="bg-[#121212] border border-white/10 p-5 rounded-lg flex items-start gap-4">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/20 border border-primary/40 text-primary font-bold text-xs">1</span>
                  <div>
                    <h3 className="font-bold text-white text-base">Submit Request via Email</h3>
                    <p className="text-sm text-[rgba(244,242,236,0.68)] mt-1">
                      Send an email to our official support address: <a href={`mailto:${SUPPORT_EMAIL}`} className="text-primary hover:underline font-bold">{SUPPORT_EMAIL}</a> with the subject line <strong className="text-white">&quot;Data Deletion Request&quot;</strong>.
                    </p>
                  </div>
                </div>

                <div className="bg-[#121212] border border-white/10 p-5 rounded-lg flex items-start gap-4">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/20 border border-primary/40 text-primary font-bold text-xs">2</span>
                  <div>
                    <h3 className="font-bold text-white text-base">Provide CreatorStore Account Email</h3>
                    <p className="text-sm text-[rgba(244,242,236,0.68)] mt-1">
                      Include the exact email address associated with your registered CreatorStore account so we can locate your record.
                    </p>
                  </div>
                </div>

                <div className="bg-[#121212] border border-white/10 p-5 rounded-lg flex items-start gap-4">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/20 border border-primary/40 text-primary font-bold text-xs">3</span>
                  <div>
                    <h3 className="font-bold text-white text-base">Specify Connected Instagram Account (If Applicable)</h3>
                    <p className="text-sm text-[rgba(244,242,236,0.68)] mt-1">
                      If you are requesting deletion of connected Meta/Instagram data, please specify your Instagram username or Account ID.
                    </p>
                  </div>
                </div>

                <div className="bg-[#121212] border border-white/10 p-5 rounded-lg flex items-start gap-4">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/20 border border-primary/40 text-primary font-bold text-xs">4</span>
                  <div>
                    <h3 className="font-bold text-white text-base">Verification</h3>
                    <p className="text-sm text-[rgba(244,242,236,0.68)] mt-1">
                      CreatorStore will verify the identity of the requestor to prevent unauthorized deletion of accounts.
                    </p>
                  </div>
                </div>

                <div className="bg-[#121212] border border-white/10 p-5 rounded-lg flex items-start gap-4">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/20 border border-primary/40 text-primary font-bold text-xs">5</span>
                  <div>
                    <h3 className="font-bold text-white text-base">Data Deletion & Anonymization</h3>
                    <p className="text-sm text-[rgba(244,242,236,0.68)] mt-1">
                      Upon verification, CreatorStore will permanently delete or anonymize eligible personal information, Instagram OAuth access tokens, cached account data, and automation configurations.
                    </p>
                  </div>
                </div>

                <div className="bg-[#121212] border border-white/10 p-5 rounded-lg flex items-start gap-4">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/20 border border-primary/40 text-primary font-bold text-xs">6</span>
                  <div>
                    <h3 className="font-bold text-white text-base">Legal & Financial Retention Exceptions</h3>
                    <p className="text-sm text-[rgba(244,242,236,0.68)] mt-1">
                      Certain transaction details (such as payment purchase records and tax invoices) may be retained where required by applicable laws and tax regulations.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Section 2: Disconnecting Instagram without deleting CreatorStore Account */}
          <section className="space-y-4">
            <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2.5">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-[#000000] font-black text-sm">2</span>
              Disconnecting Instagram Integration Only
            </h2>

            <div className="pl-0 sm:pl-9 space-y-4">
              <p className="text-sm text-slate-300 leading-relaxed">
                If you wish to remove CreatorStore&apos;s access to your Instagram account without deleting your main CreatorStore storefront or account, you can easily disconnect your account at any time:
              </p>

              <div className="bg-[#121212] border border-white/10 p-5 rounded-lg space-y-3">
                <h3 className="font-bold text-white text-base flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary" /> How to Revoke Access in CreatorStore Dashboard:
                </h3>
                <ol className="list-decimal list-inside text-sm text-[rgba(244,242,236,0.68)] space-y-1.5 font-medium">
                  <li>Log in to your CreatorStore account.</li>
                  <li>Navigate to <strong className="text-white">Settings → Connected Accounts / Integrations</strong>.</li>
                  <li>Locate Instagram and click <strong className="text-white">Disconnect Account</strong>.</li>
                </ol>
                <p className="text-xs text-[rgba(244,242,236,0.68)] pt-2 border-t border-white/10">
                  Disconnecting immediately revokes stored access tokens and halts all active Instagram comment automations.
                </p>
              </div>

              <div className="bg-[#121212] border border-white/10 p-5 rounded-lg space-y-3">
                <h3 className="font-bold text-white text-base flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary" /> How to Revoke Access via Instagram / Facebook:
                </h3>
                <ol className="list-decimal list-inside text-sm text-[rgba(244,242,236,0.68)] space-y-1.5 font-medium">
                  <li>Open Instagram or Facebook and navigate to <strong className="text-white">Settings & Privacy</strong>.</li>
                  <li>Go to <strong className="text-white">Website Permissions / Business Apps</strong>.</li>
                  <li>Find <strong className="text-white">CreatorStore</strong> and click <strong className="text-white">Remove / Revoke Access</strong>.</li>
                </ol>
              </div>
            </div>
          </section>

          {/* Section 3: Contact Box */}
          <section className="space-y-4 border-t border-white/10 pt-10 mt-12">
            <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2.5">
              <Mail className="h-6 w-6 text-primary" />
              Support & Inquiries
            </h2>

            <div className="pl-0 sm:pl-9 space-y-4">
              <p className="text-sm text-slate-300">
                If you have any questions regarding data deletion, your personal information, or third-party integrations, contact us at:
              </p>
              <div className="bg-[#121212] border border-white/10 p-6 rounded-xl inline-block space-y-2">
                <p className="text-xs font-bold text-[rgba(244,242,236,0.68)] uppercase tracking-wider">Official Contact Email:</p>
                <a href={`mailto:${SUPPORT_EMAIL}`} className="text-lg font-black text-primary hover:underline flex items-center gap-2">
                  <Mail className="h-5 w-5" /> {SUPPORT_EMAIL}
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
