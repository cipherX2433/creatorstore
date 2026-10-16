'use client'

import { useState } from 'react'
import CompareHero from './CompareHero'
import CompetitorTabs from './CompetitorTabs'
import ComparisonTable from './ComparisonTable'
import CompareIntegrations from './CompareIntegrations'
import CompareCTA from './CompareCTA'
import { COMPETITOR_TABS, COMPARISON_DATA } from '@/lib/compareData'

export default function CompareView() {
  const [activeTab, setActiveTab] = useState('stan') // Default tab: 'stan'

  const activeData = COMPARISON_DATA[activeTab] || COMPARISON_DATA.stan
  const activeCompetitor = COMPETITOR_TABS.find((t) => t.id === activeTab) || COMPETITOR_TABS[0]

  return (
    <div className="space-y-12 sm:space-y-16 py-12 sm:py-16">
      {/* 1. Compare Hero */}
      <CompareHero />

      {/* 2. Competitor Tabs */}
      <CompetitorTabs activeTab={activeTab} onSelectTab={setActiveTab} />

      {/* 3. Comparison Table */}
      <ComparisonTable 
        data={activeData} 
        competitorName={activeCompetitor.name} 
      />

      {/* 4. Trust & Real Integrations Section */}
      <CompareIntegrations />

      {/* 5. Strong Bottom CTA */}
      <CompareCTA />
    </div>
  )
}
