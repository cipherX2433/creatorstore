'use client'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Award, Lock, MessageSquare, Clock, ShieldCheck, Info } from 'lucide-react'

export default function CourseSettingsStep({
  formState,
  onChange,
  errors = {},
}) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-[#010619]">Course Settings & Rules</h2>
        <p className="text-xs text-[#666666] mt-0.5">
          Configure lesson progression, content delivery, discussions, and completion certificates.
        </p>
      </div>

      <div className="space-y-4">
        {/* Sequential Learning */}
        <div className="p-4 rounded-xl border border-[#D8DFFA] bg-[#FFFFFF] flex items-center justify-between gap-4">
          <div className="space-y-0.5">
            <span className="text-xs font-bold text-[#010619] flex items-center gap-2">
              <Lock className="h-4 w-4 text-[#194DF5]" /> Sequential Learning Flow
            </span>
            <p className="text-[11px] text-[#666666]">
              Require students to complete previous lessons before unlocking subsequent lessons.
            </p>
          </div>

          <input
            type="checkbox"
            checked={formState.sequentialLearning !== false}
            onChange={(e) => onChange({ sequentialLearning: e.target.checked })}
            className="h-4 w-4 rounded bg-[#FFFFFF] border-[#D8DFFA] text-[#194DF5] cursor-pointer accent-[#194DF5]"
          />
        </div>

        {/* Discussions & Comments */}
        <div className="p-4 rounded-xl border border-[#D8DFFA] bg-[#FFFFFF] flex items-center justify-between gap-4">
          <div className="space-y-0.5">
            <span className="text-xs font-bold text-[#010619] flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-[#194DF5]" /> Enable Student Discussions
            </span>
            <p className="text-[11px] text-[#666666]">
              Allow enrolled students to ask questions and discuss lessons with you.
            </p>
          </div>

          <input
            type="checkbox"
            checked={formState.allowDiscussions !== false}
            onChange={(e) => onChange({ allowDiscussions: e.target.checked })}
            className="h-4 w-4 rounded bg-[#FFFFFF] border-[#D8DFFA] text-[#194DF5] cursor-pointer accent-[#194DF5]"
          />
        </div>

        {/* Certificate Section */}
        <div className="p-4 rounded-xl border border-[#D8DFFA] bg-[#FFFFFF] space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-0.5">
              <span className="text-xs font-bold text-[#010619] flex items-center gap-2">
                <Award className="h-4 w-4 text-[#F9B67D]" /> Issue Completion Certificate
              </span>
              <p className="text-[11px] text-[#666666]">
                Automatically generate a verified certificate of completion when students finish the course.
              </p>
            </div>

            <input
              type="checkbox"
              checked={!!formState.enableCertificate}
              onChange={(e) => onChange({ enableCertificate: e.target.checked })}
              className="h-4 w-4 rounded bg-[#FFFFFF] border-[#D8DFFA] text-[#194DF5] cursor-pointer accent-[#194DF5]"
            />
          </div>

          {formState.enableCertificate && (
            <div className="pt-3 border-t border-[#D8DFFA] space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-[#333333]">
                    Certificate Title <span className="text-[#EF4444]">*</span>
                  </Label>
                  <Input
                    value={formState.certificateTitle || 'Certificate of Completion'}
                    onChange={(e) => onChange({ certificateTitle: e.target.value })}
                    className={`h-9 rounded-xl bg-[#FFFFFF] text-xs font-semibold text-[#010619] ${
                      errors.certificateTitle ? 'border-[#EF4444]' : 'border-[#D8DFFA]'
                    }`}
                  />
                  {errors.certificateTitle && (
                    <p className="text-xs text-[#EF4444]">{errors.certificateTitle}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-[#333333]">
                    Certificate Issuer <span className="text-[#EF4444]">*</span>
                  </Label>
                  <Input
                    value={formState.certificateIssuer || 'Creator Academy'}
                    onChange={(e) => onChange({ certificateIssuer: e.target.value })}
                    className={`h-9 rounded-xl bg-[#FFFFFF] text-xs font-semibold text-[#010619] ${
                      errors.certificateIssuer ? 'border-[#EF4444]' : 'border-[#D8DFFA]'
                    }`}
                  />
                  {errors.certificateIssuer && (
                    <p className="text-xs text-[#EF4444]">{errors.certificateIssuer}</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

