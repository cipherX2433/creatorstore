'use client'

import { COMPETITOR_TABS } from '@/lib/compareData'

export default function CompetitorTabs({ activeTab, onSelectTab }) {
  return (
    <div className="flex flex-col items-center justify-center space-y-3">
      {/* Segmented Pill Selector */}
      <div 
        role="tablist" 
        aria-label="Select competitor to compare"
        className="inline-flex items-center p-1.5 rounded-full bg-[#F5F7FA] border border-[#E1E4E8] shadow-inner max-w-full overflow-x-auto"
      >
        {COMPETITOR_TABS.map((tab) => {
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              role="tab"
              aria-selected={isActive}
              aria-controls={`panel-${tab.id}`}
              id={`tab-${tab.id}`}
              onClick={() => onSelectTab(tab.id)}
              className={`px-5 sm:px-7 py-2.5 rounded-full text-xs sm:text-sm font-bold transition-all duration-200 cursor-pointer shrink-0 ${
                isActive
                  ? 'bg-[#194DF5] text-white shadow-[0_2px_10px_rgba(25, 77, 245,0.3)] font-black scale-[1.02]'
                  : 'text-[#5F6873] hover:text-[#0D0D0D] hover:bg-black/5'
              }`}
            >
              <span>{tab.name}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
