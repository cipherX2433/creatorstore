'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { CheckCircle2, Plus, Trash2, AlertCircle } from 'lucide-react'

export default function CourseOutcomesStep({
  formState,
  onChange,
  errors = {},
}) {
  const [newOutcome, setNewOutcome] = useState('')
  const outcomes = formState.learningOutcomes || [
    'Build production-ready applications from scratch',
    'Master advanced patterns and architectural best practices',
    'Deploy and monetize your software projects',
  ]

  function addOutcome() {
    if (!newOutcome.trim()) return
    onChange({ learningOutcomes: [...outcomes, newOutcome.trim()] })
    setNewOutcome('')
  }

  function removeOutcome(idx) {
    onChange({ learningOutcomes: outcomes.filter((_, i) => i !== idx) })
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#D8DFFA] pb-4">
        <div>
          <h2 className="text-lg font-bold text-[#010619]">Learning Outcomes</h2>
          <p className="text-xs text-[#666666] mt-0.5 font-medium">
            Key skills and takeaways students will master after completing this course.
          </p>
        </div>
      </div>

      {errors.learningOutcomes && (
        <div className="p-3 bg-[#EF4444]/10 border border-[#EF4444]/30 rounded-xl text-xs text-[#EF4444] flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{errors.learningOutcomes}</span>
        </div>
      )}

      <div className="space-y-4">
        {/* Add Outcome Input */}
        <div className="flex gap-2">
          <Input
            value={newOutcome}
            onChange={(e) => setNewOutcome(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                addOutcome()
              }
            }}
            placeholder="e.g. Build and launch a full-stack Next.js app to production"
            className="h-10 rounded-xl bg-[#FFFFFF] border-[#D8DFFA] text-xs text-[#010619] placeholder:text-[#6B7399] focus:border-[#194DF5]"
          />
          <Button
            type="button"
            onClick={addOutcome}
            className="h-10 rounded-xl bg-[#194DF5] hover:bg-[#1441D9] text-white text-xs font-bold px-4 shrink-0 cursor-pointer shadow-sm"
          >
            <Plus className="h-3.5 w-3.5 mr-1" /> Add Outcome
          </Button>
        </div>

        {/* Outcomes List */}
        <div className="space-y-2.5">
          {outcomes.length === 0 ? (
            <p className="text-xs text-[#6B7399] italic py-2">
              No learning outcomes added yet. Add at least one outcome above.
            </p>
          ) : (
            outcomes.map((item, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-3.5 rounded-xl bg-[#FFFFFF] border border-[#D8DFFA] text-xs text-[#010619] shadow-xs"
              >
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-4 w-4 text-[#22C55E] shrink-0" />
                  <span className="font-semibold">{item}</span>
                </div>

                <button
                  type="button"
                  onClick={() => removeOutcome(idx)}
                  className="text-[#6B7399] hover:text-[#EF4444] p-1 transition-colors cursor-pointer"
                  title="Remove outcome"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
