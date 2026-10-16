'use client'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

const BUFFER_BEFORE_OPTIONS = [
  { label: 'No buffer', value: 0 },
  { label: '5 min', value: 5 },
  { label: '10 min', value: 10 },
  { label: '15 min', value: 15 },
  { label: '30 min', value: 30 },
  { label: '60 min', value: 60 },
]

const BUFFER_AFTER_OPTIONS = [
  { label: 'No buffer', value: 0 },
  { label: '5 min', value: 5 },
  { label: '10 min', value: 10 },
  { label: '15 min', value: 15 },
  { label: '30 min', value: 30 },
  { label: '60 min', value: 60 },
]

const NOTICE_OPTIONS = [
  { label: 'Immediately (no minimum)', value: 0 },
  { label: '1 hour', value: 60 },
  { label: '2 hours', value: 120 },
  { label: '4 hours', value: 240 },
  { label: '12 hours', value: 720 },
  { label: '24 hours', value: 1440 },
  { label: '48 hours', value: 2880 },
  { label: '1 week', value: 10080 },
]

const ADVANCE_WINDOW_OPTIONS = [
  { label: '7 days', value: 7 },
  { label: '14 days', value: 14 },
  { label: '30 days', value: 30 },
  { label: '60 days', value: 60 },
  { label: '90 days', value: 90 },
  { label: '180 days (6 months)', value: 180 },
  { label: '365 days (1 year)', value: 365 },
]

const CANCELLATION_DEADLINES = [
  { label: 'No cancellation', value: 0 },
  { label: '1 hour before', value: 1 },
  { label: '12 hours before', value: 12 },
  { label: '24 hours before', value: 24 },
  { label: '48 hours before', value: 48 },
]

const RESCHEDULE_DEADLINES = [
  { label: '1 hour before', value: 1 },
  { label: '6 hours before', value: 6 },
  { label: '12 hours before', value: 12 },
  { label: '24 hours before', value: 24 },
  { label: '48 hours before', value: 48 },
]

export default function BookingRulesStep({
  formState,
  onChange,
  errors = {},
}) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-[#010619]">Booking Rules</h2>
        <p className="text-xs text-[#666666] mt-0.5">
          Control session buffers, notice periods, booking windows, and cancellation rules.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {/* A. Buffer Before */}
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-[#333333]">Buffer before</Label>
          <select
            value={formState.bufferBeforeMinutes !== undefined ? formState.bufferBeforeMinutes : 0}
            onChange={(e) => onChange({ bufferBeforeMinutes: Number(e.target.value) })}
            className="w-full h-11 rounded-xl bg-[#FFFFFF] border border-[#D8DFFA] text-xs font-semibold text-[#010619] px-3 cursor-pointer focus:border-[#194DF5]"
          >
            {BUFFER_BEFORE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value} className="bg-[#FFFFFF] text-[#010619]">
                {o.label}
              </option>
            ))}
          </select>
        </div>

        {/* B. Buffer After */}
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-[#333333]">Buffer after</Label>
          <select
            value={formState.bufferAfterMinutes !== undefined ? formState.bufferAfterMinutes : 15}
            onChange={(e) => onChange({ bufferAfterMinutes: Number(e.target.value) })}
            className="w-full h-11 rounded-xl bg-[#FFFFFF] border border-[#D8DFFA] text-xs font-semibold text-[#010619] px-3 cursor-pointer focus:border-[#194DF5]"
          >
            {BUFFER_AFTER_OPTIONS.map((o) => (
              <option key={o.value} value={o.value} className="bg-[#FFFFFF] text-[#010619]">
                {o.label}
              </option>
            ))}
          </select>
        </div>

        {/* C. Minimum Booking Notice */}
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-[#333333]">Minimum booking notice</Label>
          <select
            value={formState.minimumNoticeMinutes !== undefined ? formState.minimumNoticeMinutes : 1440}
            onChange={(e) => onChange({ minimumNoticeMinutes: Number(e.target.value) })}
            className="w-full h-11 rounded-xl bg-[#FFFFFF] border border-[#D8DFFA] text-xs font-semibold text-[#010619] px-3 cursor-pointer focus:border-[#194DF5]"
          >
            {NOTICE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value} className="bg-[#FFFFFF] text-[#010619]">
                {o.label}
              </option>
            ))}
          </select>
        </div>

        {/* D. Allow Booking Up To */}
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-[#333333]">Allow booking up to</Label>
          <select
            value={formState.maximumAdvanceDays !== undefined ? formState.maximumAdvanceDays : 60}
            onChange={(e) => onChange({ maximumAdvanceDays: Number(e.target.value) })}
            className="w-full h-11 rounded-xl bg-[#FFFFFF] border border-[#D8DFFA] text-xs font-semibold text-[#010619] px-3 cursor-pointer focus:border-[#194DF5]"
          >
            {ADVANCE_WINDOW_OPTIONS.map((o) => (
              <option key={o.value} value={o.value} className="bg-[#FFFFFF] text-[#010619]">
                {o.label}
              </option>
            ))}
          </select>
        </div>

        {/* E. Maximum Bookings Per Day */}
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-[#333333]">Max sessions per day (optional)</Label>
          <Input
            type="number"
            min="1"
            max="24"
            value={formState.maxSessionsPerDay || ''}
            onChange={(e) => onChange({ maxSessionsPerDay: e.target.value ? Number(e.target.value) : null })}
            placeholder="e.g. 5"
            className="h-11 rounded-xl bg-[#FFFFFF] border-[#D8DFFA] text-xs font-semibold text-[#010619] focus:border-[#194DF5]"
          />
        </div>
      </div>

      {/* Cancellation & Rescheduling Policies */}
      <div className="pt-4 border-t border-[#D8DFFA] space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-[#666666]">
          Cancellation & Rescheduling
        </h3>

        <div className="p-4 rounded-xl border border-[#D8DFFA] bg-[#FFFFFF] space-y-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-bold text-[#010619]">Allow customers to cancel</div>
              <div className="text-[11px] text-[#666666]">
                Permit buyers to cancel sessions before the deadline
              </div>
            </div>
            <input
              type="checkbox"
              checked={formState.allowCancellation !== false}
              onChange={(e) => onChange({ allowCancellation: e.target.checked })}
              className="h-4 w-4 rounded bg-[#FFFFFF] border-[#D8DFFA] text-[#194DF5] accent-[#194DF5] cursor-pointer"
            />
          </div>

          {formState.allowCancellation !== false && (
            <div className="space-y-1.5 pt-1">
              <Label className="text-xs font-semibold text-[#333333]">Cancellation deadline</Label>
              <select
                value={formState.cancellationPolicyNoticeHours !== undefined ? formState.cancellationPolicyNoticeHours : 24}
                onChange={(e) => onChange({ cancellationPolicyNoticeHours: Number(e.target.value) })}
                className="w-full h-10 rounded-xl bg-[#FFFFFF] border border-[#D8DFFA] text-xs font-semibold text-[#010619] px-3 cursor-pointer"
              >
                {CANCELLATION_DEADLINES.map((o) => (
                  <option key={o.value} value={o.value} className="bg-[#FFFFFF] text-[#010619]">
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="pt-2 border-t border-[#D8DFFA] flex items-center justify-between">
            <div>
              <div className="text-xs font-bold text-[#010619]">Allow customers to reschedule</div>
              <div className="text-[11px] text-[#666666]">
                Permit buyers to move their session to another available date
              </div>
            </div>
            <input
              type="checkbox"
              checked={formState.allowRescheduling !== false}
              onChange={(e) => onChange({ allowRescheduling: e.target.checked })}
              className="h-4 w-4 rounded bg-[#FFFFFF] border-[#D8DFFA] text-[#194DF5] accent-[#194DF5] cursor-pointer"
            />
          </div>

          {formState.allowRescheduling !== false && (
            <div className="space-y-1.5 pt-1">
              <Label className="text-xs font-semibold text-[#333333]">Rescheduling deadline</Label>
              <select
                value={formState.reschedulingDeadlineNoticeHours !== undefined ? formState.reschedulingDeadlineNoticeHours : 24}
                onChange={(e) => onChange({ reschedulingDeadlineNoticeHours: Number(e.target.value) })}
                className="w-full h-10 rounded-xl bg-[#FFFFFF] border border-[#D8DFFA] text-xs font-semibold text-[#010619] px-3 cursor-pointer"
              >
                {RESCHEDULE_DEADLINES.map((o) => (
                  <option key={o.value} value={o.value} className="bg-[#FFFFFF] text-[#010619]">
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="space-y-1.5 pt-2 border-t border-[#D8DFFA]">
            <Label className="text-xs font-semibold text-[#333333]">Cancellation Policy Text</Label>
            <Textarea
              rows={2}
              value={formState.cancellationPolicy || ''}
              onChange={(e) => onChange({ cancellationPolicy: e.target.value })}
              placeholder="Cancellations made less than 24 hours before the session are not eligible for a refund."
              className="rounded-xl bg-[#FFFFFF] border-[#D8DFFA] text-xs text-[#010619] resize-none focus:border-[#194DF5]"
            />
          </div>
        </div>
      </div>
    </div>
  )
}
