'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { api } from '@/lib/clientApi'
import {
  Users, Tag, Mail, ArrowRight, Sparkles, Loader2, AlertCircle, RefreshCw
} from 'lucide-react'
import { useDashboardHeader } from '@/components/dashboard/HeaderContext'

export default function CreatorMarketingHubPage() {
  const { setHeaderConfig } = useDashboardHeader()
  const [stats, setStats] = useState({ totalLeads: 0, activeCoupons: 0, totalCampaigns: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    setHeaderConfig({
      title: 'Marketing Center',
      actions: null,
    })
  }, [setHeaderConfig])

  useEffect(() => {
    loadMarketingOverview()
  }, [])

  function loadMarketingOverview() {
    setLoading(true)
    setError(null)
    api.get('/marketing/overview')
      .then((res) => {
        setStats({
          totalLeads: res?.totalLeads || 0,
          activeCoupons: res?.activeCoupons || 0,
          totalCampaigns: res?.totalCampaigns || 0,
        })
      })
      .catch((err) => {
        console.error('Failed to load marketing overview:', err)
        setError(err.message || 'Unable to load marketing overview.')
      })
      .finally(() => setLoading(false))
  }

  const features = [
    {
      id: 'leads',
      title: 'Leads & Lead Magnets',
      desc: 'Capture visitor contact info and build an audience you can reach anytime.',
      href: '/dashboard/leads',
      icon: Users,
      badge: 'Audience',
      metricLabel: 'Total Leads',
      metricValue: stats.totalLeads,
      actionText: 'Open Leads',
    },
    {
      id: 'coupons',
      title: 'Coupons & Discounts',
      desc: 'Create percentage or fixed discounts and manage active promotional codes.',
      href: '/dashboard/marketing/coupons',
      icon: Tag,
      badge: 'Promotions',
      metricLabel: 'Active Coupons',
      metricValue: stats.activeCoupons,
      actionText: 'Manage Coupons',
    },
    {
      id: 'email',
      title: 'Email Broadcasts',
      desc: 'Send newsletters, product announcements, and updates to your audience.',
      href: '/dashboard/marketing/email',
      icon: Mail,
      badge: 'Reach',
      metricLabel: 'Campaigns Sent',
      metricValue: stats.totalCampaigns,
      actionText: 'Create Campaign',
    },
  ]

  return (
    <div className="max-w-6xl mx-auto space-y-6 text-[#1F1F1F]">
      
      {/* HEADER BANNER */}
      <div className="bg-[#FFFFFF] p-6 sm:p-8 rounded-[24px] border border-[#E5E5E3] shadow-[0_8px_30px_rgba(0,0,0,0.04)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 text-xs font-bold text-[#1F1F1F] bg-[#F2F1EF] px-3.5 py-1 rounded-full border border-[#E5E5E3] mb-2">
            <Sparkles className="h-3.5 w-3.5" /> Marketing Center
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#1F1F1F] tracking-tight">
            Marketing Center
          </h1>
          <p className="text-xs sm:text-sm text-[#6F6F6B] font-medium">
            Grow your audience, create offers, and stay connected with your customers.
          </p>
        </div>

        <button
          type="button"
          onClick={loadMarketingOverview}
          title="Refresh metrics"
          className="p-2.5 self-start sm:self-center rounded-full bg-[#FFFFFF] border border-[#E5E5E3] text-[#6F6F6B] hover:text-[#1F1F1F] hover:bg-[#F5F5F3] transition-colors cursor-pointer"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin text-[#1F1F1F]' : ''}`} />
        </button>
      </div>

      {/* ERROR BANNER */}
      {error && (
        <div className="p-4 rounded-[18px] bg-[#DC2626]/10 border border-[#DC2626]/30 text-xs text-[#DC2626] flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={loadMarketingOverview}
            className="px-3.5 py-1 rounded-full bg-[#1F1F1F] text-[#FFFFFF] font-bold text-xs hover:bg-[#000000] transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {/* 3 BALANCED FEATURE CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {features.map((f) => {
          const IconComponent = f.icon

          return (
            <Link key={f.id} href={f.href} className="group flex">
              <div className="flex flex-col justify-between p-6 sm:p-7 rounded-[24px] bg-[#FFFFFF] border border-[#E5E5E3] hover:border-[#1F1F1F]/40 hover:bg-[#F5F5F3] transition-all duration-150 w-full shadow-[0_8px_30px_rgba(0,0,0,0.04)] space-y-6">
                
                {/* Top Section */}
                <div className="space-y-4">
                  {/* Icon & Category Badge */}
                  <div className="flex items-center justify-between">
                    <div className="h-12 w-12 rounded-[14px] bg-[#F2F1EF] text-[#1F1F1F] border border-[#E5E5E3] flex items-center justify-center shrink-0">
                      <IconComponent className="h-6 w-6 stroke-[2.2]" />
                    </div>
                    <span className="text-[10px] font-extrabold uppercase tracking-wider bg-[#FBFBFB] text-[#6F6F6B] px-3 py-1 rounded-full border border-[#E5E5E3]">
                      {f.badge}
                    </span>
                  </div>

                  {/* Title & Description */}
                  <div>
                    <h2 className="font-extrabold text-lg text-[#1F1F1F] transition-colors">
                      {f.title}
                    </h2>
                    <p className="text-xs text-[#6F6F6B] font-medium leading-relaxed mt-1.5">
                      {f.desc}
                    </p>
                  </div>
                </div>

                {/* Bottom Section: Real Metric & Action */}
                <div className="pt-4 border-t border-[#E5E5E3] flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-[10px] uppercase font-bold text-[#6F6F6B]">
                      {f.metricLabel}
                    </span>
                    <span className="text-base font-extrabold text-[#1F1F1F]">
                      {loading ? (
                        <span className="inline-block w-8 h-4 bg-[#F2F1EF] rounded animate-pulse" />
                      ) : (
                        f.metricValue
                      )}
                    </span>
                  </div>

                  <div className="flex items-center text-xs font-bold text-[#1F1F1F] gap-1 group-hover:translate-x-1 transition-transform">
                    <span>{f.actionText}</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </div>
                </div>

              </div>
            </Link>
          )
        })}
      </div>

    </div>
  )
}
