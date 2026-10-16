import Navbar from '@/components/landing/Navbar'
import Footer from '@/components/landing/Footer'
import { Mail, Clock, ShieldCheck, Send, MessageSquare } from 'lucide-react'
import { SUPPORT_EMAIL } from '@/config/site'

export const metadata = {
  title: 'Contact CreatorStore',
  description: 'Get in touch with the CreatorStore support and business team. Have questions, need help, or want to report an issue? We are here to help.',
}

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-black font-sans antialiased text-white selection:bg-primary selection:text-black">
      {/* Top Navigation */}
      <Navbar />

      <main className="max-w-5xl mx-auto px-6 py-16 sm:py-24">
        {/* Header Badge & Title */}
        <div className="space-y-4 text-center sm:text-left border-b border-white/10 pb-10 mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/30 text-primary text-xs font-bold uppercase tracking-wider">
            <Mail className="h-3.5 w-3.5" /> Support &amp; Inquiries
          </div>
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-white">
            Contact CreatorStore
          </h1>
          <p className="text-base sm:text-lg text-[rgba(244,242,236,0.68)] font-medium max-w-2xl">
            Have questions, need help, or want to report an issue? We&apos;re here to help. Reach out to our team directly.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Direct Contact & Information Cards */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* Primary Email Card */}
            <div className="bg-[#121212] border border-primary/40 rounded-2xl p-6 sm:p-8 space-y-4 shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-2xl pointer-events-none" />
              
              <div className="w-12 h-12 rounded-xl bg-primary text-black flex items-center justify-center font-black">
                <Mail className="h-6 w-6" />
              </div>

              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-[rgba(244,242,236,0.68)]">
                  Official Support Email
                </span>
                <h3 className="text-xl font-black text-white mt-1">
                  Email Us Directly
                </h3>
              </div>

              <p className="text-sm text-slate-300 leading-relaxed font-normal">
                For customer support, business verification, subscription inquiries, billing, or general questions, email:
              </p>

              <div className="pt-2">
                <a
                  href={`mailto:${SUPPORT_EMAIL}`}
                  className="inline-flex items-center gap-2 px-4 py-3 rounded-xl bg-white/5 border border-white/15 text-primary font-bold text-base hover:bg-white/10 hover:border-primary/40 transition-all group"
                >
                  <Mail className="h-4 w-4 shrink-0 group-hover:scale-110 transition-transform" />
                  <span className="break-all">{SUPPORT_EMAIL}</span>
                </a>
              </div>
            </div>

            {/* Operating Hours & Response Time */}
            <div className="bg-[#121212] border border-white/10 rounded-2xl p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-[#CBE957]">
                  <Clock className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-bold text-white text-sm">Response Time</h4>
                  <p className="text-xs text-[rgba(244,242,236,0.68)]">Within 24 to 48 business hours</p>
                </div>
              </div>

              <div className="flex items-center gap-3 pt-3 border-t border-white/10">
                <div className="w-9 h-9 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-primary">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-bold text-white text-sm">Security &amp; Privacy</h4>
                  <p className="text-xs text-[rgba(244,242,236,0.68)]">Your inquiries are confidential</p>
                </div>
              </div>
            </div>

          </div>

          {/* Right Column: Direct Contact CTA Box & Quick Guidance */}
          <div className="lg:col-span-7 bg-[#121212] border border-white/10 rounded-2xl p-6 sm:p-10 space-y-8 shadow-xl">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 text-xs font-bold text-[#CBE957] uppercase tracking-wider">
                <MessageSquare className="h-4 w-4" /> Quick Inquiry
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                How Can We Help You?
              </h2>
              <p className="text-sm text-slate-300 leading-relaxed font-normal">
                Click below to send an email with your query, or select the subject that best describes your inquiry:
              </p>
            </div>

            {/* Category Quick Links to Email */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <a
                href={`mailto:${SUPPORT_EMAIL}?subject=CreatorStore%20Billing%20%26%20Subscription%20Inquiry`}
                className="p-4 rounded-xl bg-white/5 border border-white/10 hover:border-primary/40 hover:bg-white/[0.08] transition-all text-left space-y-1 group"
              >
                <div className="font-bold text-sm text-white group-hover:text-primary flex items-center justify-between">
                  <span>Billing &amp; Subscriptions</span>
                  <Send className="h-3.5 w-3.5 opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
                </div>
                <p className="text-xs text-[rgba(244,242,236,0.68)]">Plan upgrades, invoices, and payment queries</p>
              </a>

              <a
                href={`mailto:${SUPPORT_EMAIL}?subject=CreatorStore%20Technical%20Support`}
                className="p-4 rounded-xl bg-white/5 border border-white/10 hover:border-primary/40 hover:bg-white/[0.08] transition-all text-left space-y-1 group"
              >
                <div className="font-bold text-sm text-white group-hover:text-primary flex items-center justify-between">
                  <span>Technical Support</span>
                  <Send className="h-3.5 w-3.5 opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
                </div>
                <p className="text-xs text-[rgba(244,242,236,0.68)]">Storefront setup, products, or Instagram AutoDM</p>
              </a>

              <a
                href={`mailto:${SUPPORT_EMAIL}?subject=CreatorStore%20Privacy%20or%20Data%20Request`}
                className="p-4 rounded-xl bg-white/5 border border-white/10 hover:border-primary/40 hover:bg-white/[0.08] transition-all text-left space-y-1 group"
              >
                <div className="font-bold text-sm text-white group-hover:text-primary flex items-center justify-between">
                  <span>Privacy &amp; Data Deletion</span>
                  <Send className="h-3.5 w-3.5 opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
                </div>
                <p className="text-xs text-[rgba(244,242,236,0.68)]">Data deletion and account privacy requests</p>
              </a>

              <a
                href={`mailto:${SUPPORT_EMAIL}?subject=CreatorStore%20General%20Inquiry`}
                className="p-4 rounded-xl bg-white/5 border border-white/10 hover:border-primary/40 hover:bg-white/[0.08] transition-all text-left space-y-1 group"
              >
                <div className="font-bold text-sm text-white group-hover:text-primary flex items-center justify-between">
                  <span>General Inquiries</span>
                  <Send className="h-3.5 w-3.5 opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
                </div>
                <p className="text-xs text-[rgba(244,242,236,0.68)]">Partnerships, verification, and feedback</p>
              </a>
            </div>

            {/* Email CTA Button */}
            <div className="pt-4 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-xs text-[rgba(244,242,236,0.68)] text-center sm:text-left">
                Direct mailto link opens in your preferred email client.
              </div>
              <a
                href={`mailto:${SUPPORT_EMAIL}`}
                className="w-full sm:w-auto px-7 py-3.5 rounded-full bg-primary hover:bg-primary-hover text-black font-black text-sm flex items-center justify-center gap-2 shadow-lg transition-all"
              >
                <Mail className="h-4 w-4" />
                <span>Send an Email</span>
              </a>
            </div>

          </div>
        </div>
      </main>

      {/* Footer */}
      <Footer />
    </div>
  )
}
