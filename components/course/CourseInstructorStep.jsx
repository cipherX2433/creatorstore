'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { User, Plus, Trash2, Info } from 'lucide-react'

export default function CourseInstructorStep({
  formState,
  onChange,
  errors = {},
}) {
  const [newReq, setNewReq] = useState('')
  const requirements = formState.requirements || ['Basic computer and internet knowledge']

  function addRequirement() {
    if (!newReq.trim()) return
    onChange({ requirements: [...requirements, newReq.trim()] })
    setNewReq('')
  }

  function removeRequirement(idx) {
    onChange({ requirements: requirements.filter((_, i) => i !== idx) })
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-[#010619]">Instructor & Target Audience</h2>
        <p className="text-xs text-[#666666] mt-0.5 font-medium">
          Introduce yourself to students and define who will benefit most from this course.
        </p>
      </div>

      <div className="space-y-5">
        {/* Instructor Name */}
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-[#333333]">
            Instructor Name <span className="text-[#EF4444]">*</span>
          </Label>
          <Input
            value={formState.instructor || ''}
            onChange={(e) => onChange({ instructor: e.target.value })}
            placeholder="e.g. Mohit Sharma"
            className={`h-11 rounded-xl bg-[#FFFFFF] text-sm font-semibold text-[#010619] placeholder:text-[#6B7399] transition-colors ${
              errors.instructor ? 'border-[#EF4444] focus:border-[#EF4444]' : 'border-[#D8DFFA] focus:border-[#194DF5]'
            }`}
          />
          {errors.instructor && (
            <p className="text-xs font-semibold text-[#EF4444] flex items-center gap-1">
              <Info className="h-3.5 w-3.5" /> {errors.instructor}
            </p>
          )}
        </div>

        {/* Target Audience */}
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-[#333333]">
            Who Is This Course For? <span className="text-[#EF4444]">*</span>
          </Label>
          <Textarea
            rows={3}
            value={formState.targetAudience || ''}
            onChange={(e) => onChange({ targetAudience: e.target.value })}
            placeholder="e.g. Beginners, creators, developers, and professionals looking to master modern web application design."
            className={`rounded-xl bg-[#FFFFFF] text-xs text-[#010619] placeholder:text-[#6B7399] resize-none transition-colors ${
              errors.targetAudience ? 'border-[#EF4444] focus:border-[#EF4444]' : 'border-[#D8DFFA] focus:border-[#194DF5]'
            }`}
          />
          {errors.targetAudience && (
            <p className="text-xs font-semibold text-[#EF4444] flex items-center gap-1">
              <Info className="h-3.5 w-3.5" /> {errors.targetAudience}
            </p>
          )}
        </div>

        {/* Course Requirements / Prerequisites */}
        <div className="space-y-3 p-4 rounded-xl border border-[#D8DFFA] bg-[#EEF1FB]">
          <Label className="text-xs font-semibold text-[#333333]">
            Prerequisites & Requirements (Optional)
          </Label>
          <div className="flex gap-2">
            <Input
              value={newReq}
              onChange={(e) => setNewReq(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  addRequirement()
                }
              }}
              placeholder="e.g. Basic JavaScript knowledge"
              className="h-9 rounded-xl bg-[#FFFFFF] border-[#D8DFFA] text-xs text-[#010619] placeholder:text-[#6B7399]"
            />
            <Button
              type="button"
              size="sm"
              onClick={addRequirement}
              className="h-9 rounded-xl bg-[#194DF5] hover:bg-[#1441D9] text-white text-xs font-semibold px-3 shrink-0"
            >
              <Plus className="h-3.5 w-3.5 mr-1" /> Add
            </Button>
          </div>

          <div className="space-y-2 pt-1">
            {requirements.map((req, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-2.5 rounded-lg bg-[#FFFFFF] border border-[#D8DFFA] text-xs text-[#010619] shadow-xs"
              >
                <span>• {req}</span>
                <button
                  type="button"
                  onClick={() => removeRequirement(idx)}
                  className="text-[#6B7399] hover:text-[#EF4444] p-1 transition-colors cursor-pointer"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
