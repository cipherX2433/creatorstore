'use client'

import { useEffect, useState } from 'react'
import { api, formatMoney } from '@/lib/clientApi'
import { Button } from '@/components/ui/button'
import { Users, Lock, ShieldCheck, Check, Sparkles } from 'lucide-react'

export default function CommunityWidget({ productId }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!productId) return
    let mounted = true
    api.get(`/community/public/${productId}`)
      .then((res) => {
        if (mounted) {
          setData(res)
          setLoading(false)
        }
      })
      .catch(() => { if (mounted) setLoading(false) })
    return () => { mounted = false }
  }, [productId])

  if (loading || !data?.config) return null

  const { config, memberCount, product } = data

  return (
    <div className="bg-white rounded-3xl p-6 sm:p-8 border border-white/10 shadow-md space-y-6">
      
      {/* Cover / Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-5">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-2xl bg-primary/15 text-primary flex items-center justify-center font-black shrink-0">
            <Users className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase bg-primary/10 text-primary px-2.5 py-0.5 rounded-full flex items-center gap-1">
                <Lock className="h-3 w-3" /> Private Group Space
              </span>
              <span className="text-xs text-[rgba(244,242,236,0.5)] font-bold">{config.category || 'Technology'}</span>
            </div>
            <h3 className="font-extrabold text-xl text-[#F4F2EC] mt-0.5">{config.name}</h3>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-[#12141c] px-3 py-1.5 rounded-full border border-white/10 text-xs font-bold text-[#F4F2EC]">
          <Users className="h-4 w-4 text-primary" />
          <span>{memberCount || 1} Active Members</span>
        </div>
      </div>

      {/* Description */}
      <div className="text-xs text-[rgba(244,242,236,0.68)] font-medium leading-relaxed">
        {config.description || config.shortDescription}
      </div>

      {/* Rules */}
      {config.rules?.length > 0 && (
        <div className="space-y-3 pt-2">
          <h4 className="text-xs font-black uppercase tracking-wider text-[rgba(244,242,236,0.5)]">Community Rules</h4>
          <div className="grid gap-2">
            {config.rules.map((r, i) => (
              <div key={r.id || i} className="p-3 rounded-2xl bg-[#12141c] border border-white/10 text-xs space-y-0.5">
                <div className="font-bold text-[#F4F2EC]">{i + 1}. {r.title}</div>
                <div className="text-[rgba(244,242,236,0.68)] font-medium">{r.description}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* What Members Get */}
      {config.benefits?.length > 0 && (
        <div className="space-y-3 pt-2">
          <h4 className="text-xs font-black uppercase tracking-wider text-[rgba(244,242,236,0.5)]">What You'll Get Inside</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {config.benefits.map((b, i) => (
              <div key={i} className="flex items-center gap-2 text-xs font-bold text-[#F4F2EC] bg-primary/10 p-2.5 rounded-xl border border-primary/20">
                <Check className="h-4 w-4 text-primary shrink-0" />
                <span>{b}</span>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  )
}
