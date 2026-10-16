'use client'

import { Instagram, CreditCard, ShieldCheck, Mail, HardDrive, Lock } from 'lucide-react'

export default function IntegrationsSection() {
  const tools = [
    { name: 'Instagram Graph API', icon: Instagram, note: 'Official API' },
    { name: 'Razorpay', icon: CreditCard, note: 'Direct Settlement' },
    { name: 'UPI & Cards', icon: Lock, note: 'Instant Checkout' },
    { name: 'Resend', icon: Mail, note: 'Automated Email' },
    { name: 'Cloud Storage', icon: HardDrive, note: 'Encrypted Delivery' },
  ]

  return (
    <section className="w-full px-4 sm:px-6 lg:px-8 py-12 sm:py-16 bg-[#171717] border-y border-white/10 text-white">
      <div className="max-w-7xl mx-auto space-y-6 text-center">
        <p className="text-xs font-mono uppercase tracking-widest text-[#A3A3A3]">
          BUILT AROUND THE TOOLS CREATORS ALREADY USE
        </p>

        <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4">
          {tools.map((t) => {
            const Icon = t.icon
            return (
              <div
                key={t.name}
                className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-[#222222] border border-white/10 text-xs font-semibold text-white shadow-xs hover:border-[#FF4B1F]/40 transition-colors"
              >
                <Icon className="w-4 h-4 text-[#FF4B1F]" />
                <span>{t.name}</span>
                <span className="text-[10px] text-[#A3A3A3] bg-white/5 border border-white/10 px-2 py-0.5 rounded font-mono">
                  {t.note}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
