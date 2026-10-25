'use client'

import { Send, CreditCard, ShieldCheck, Mail, BookOpen, Sparkles } from 'lucide-react'

const INTEGRATION_ITEMS = [
  {
    icon: Send,
    title: 'Instagram AutoDM',
    desc: 'Native Graph API automation for automated reel comment triggers and DM product links.',
  },
  {
    icon: CreditCard,
    title: '0% Platform Fee Payouts',
    desc: 'Keep 100% of your earnings minus standard payment gateway processing.',
  },
  {
    icon: ShieldCheck,
    title: 'Delivery Guard',
    desc: 'Intelligent message queue pacing and surge protection for Instagram account health.',
  },
  {
    icon: BookOpen,
    title: 'Hosted Digital Files',
    desc: 'Private encrypted digital downloads, PDF guides, templates, and asset bundles with instant delivery.',
  },
]

export default function CompareIntegrations() {
  return (
    <section className="w-full max-w-5xl mx-auto py-12 px-4 sm:px-6">
      <div className="rounded-[24px] bg-[#F7F9FB] border border-[#E1E4E8] p-8 sm:p-12 space-y-8">
        <div className="text-center space-y-3 max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-[#E1E4E8] text-xs font-bold text-[#5F6873]">
            <Sparkles className="w-3.5 h-3.5 text-[#194DF5]" />
            <span>AUTHENTIC CREATOR ARCHITECTURE</span>
          </div>
          <h3 className="text-2xl sm:text-3xl font-extrabold text-[#0D0D0D] tracking-tight">
            Built for the modern creator workflow.
          </h3>
          <p className="text-xs sm:text-sm text-[#5F6873] leading-relaxed">
            No complex zapier connections or third-party add-on fees. Every core commerce and automation capability is natively engineered into CreatorStore.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 pt-2">
          {INTEGRATION_ITEMS.map((item) => {
            const Icon = item.icon
            return (
              <div 
                key={item.title}
                className="bg-white rounded-2xl border border-[#E1E4E8] p-5 space-y-3 shadow-xs hover:border-[#194DF5]/40 transition-colors"
              >
                <div className="w-10 h-10 rounded-xl bg-[#F4F7FF] text-[#194DF5] flex items-center justify-center">
                  <Icon className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-[#0D0D0D]">{item.title}</h4>
                  <p className="text-xs text-[#5F6873] leading-relaxed">{item.desc}</p>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
