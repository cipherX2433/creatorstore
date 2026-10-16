'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import AvailabilityWindow from './AvailabilityWindow'
import { Globe, Plus, Copy, AlertCircle, Check, Sparkles } from 'lucide-react'

const TIMEZONES = [
  { code: 'Asia/Kolkata', label: 'Asia/Kolkata (GMT +5:30)' },
  { code: 'America/New_York', label: 'America/New_York (Eastern Time - GMT -5:00 / -4:00)' },
  { code: 'America/Chicago', label: 'America/Chicago (Central Time - GMT -6:00 / -5:00)' },
  { code: 'America/Denver', label: 'America/Denver (Mountain Time - GMT -7:00 / -6:00)' },
  { code: 'America/Los_Angeles', label: 'America/Los_Angeles (Pacific Time - GMT -8:00 / -7:00)' },
  { code: 'Europe/London', label: 'Europe/London (GMT / BST - GMT +0:00 / +1:00)' },
  { code: 'Europe/Paris', label: 'Europe/Paris (Central European Time - GMT +1:00 / +2:00)' },
  { code: 'Asia/Dubai', label: 'Asia/Dubai (Gulf Standard Time - GMT +4:00)' },
  { code: 'Asia/Singapore', label: 'Asia/Singapore (Singapore Time - GMT +8:00)' },
  { code: 'Asia/Tokyo', label: 'Asia/Tokyo (Japan Standard Time - GMT +9:00)' },
  { code: 'Australia/Sydney', label: 'Australia/Sydney (AEST - GMT +10:00 / +11:00)' },
  { code: 'UTC', label: 'UTC (Universal Coordinated Time)' },
]

const DAYS_OF_WEEK = [
  { dayOfWeek: 1, name: 'Monday' },
  { dayOfWeek: 2, name: 'Tuesday' },
  { dayOfWeek: 3, name: 'Wednesday' },
  { dayOfWeek: 4, name: 'Thursday' },
  { dayOfWeek: 5, name: 'Friday' },
  { dayOfWeek: 6, name: 'Saturday' },
  { dayOfWeek: 0, name: 'Sunday' },
]

export default function AvailabilityStep({
  formState,
  onChange,
  errors = {},
}) {
  const [copyModalDay, setCopyModalDay] = useState(null)
  const [copyTargetDays, setCopyTargetDays] = useState([])

  const availability = formState.availability || [
    { dayOfWeek: 1, enabled: true, windows: [{ startTime: '09:00', endTime: '11:00' }, { startTime: '14:00', endTime: '17:00' }] },
    { dayOfWeek: 2, enabled: true, windows: [{ startTime: '09:00', endTime: '11:00' }] },
    { dayOfWeek: 3, enabled: false, windows: [{ startTime: '09:00', endTime: '17:00' }] },
    { dayOfWeek: 4, enabled: false, windows: [{ startTime: '09:00', endTime: '17:00' }] },
    { dayOfWeek: 5, enabled: true, windows: [{ startTime: '11:00', endTime: '12:00' }] },
    { dayOfWeek: 6, enabled: true, windows: [{ startTime: '11:00', endTime: '12:00' }] },
    { dayOfWeek: 0, enabled: true, windows: [{ startTime: '10:00', endTime: '16:00' }] },
  ]

  function updateDay(dayOfWeek, patch) {
    const next = availability.map((a) =>
      a.dayOfWeek === dayOfWeek ? { ...a, ...patch } : a
    )
    onChange({ availability: next })
  }

  function addWindow(dayOfWeek) {
    const dayRule = availability.find((a) => a.dayOfWeek === dayOfWeek) || {
      dayOfWeek,
      windows: [],
    }
    const existing = dayRule.windows || []
    const newWin = { startTime: '14:00', endTime: '17:00' }
    updateDay(dayOfWeek, { windows: [...existing, newWin], enabled: true })
  }

  function removeWindow(dayOfWeek, index) {
    const dayRule = availability.find((a) => a.dayOfWeek === dayOfWeek)
    if (!dayRule) return
    const existing = [...(dayRule.windows || [])]
    existing.splice(index, 1)
    if (existing.length === 0) {
      updateDay(dayOfWeek, { enabled: false, windows: [{ startTime: '09:00', endTime: '17:00' }] })
    } else {
      updateDay(dayOfWeek, { windows: existing })
    }
  }

  function updateWindowVal(dayOfWeek, index, field, val) {
    const dayRule = availability.find((a) => a.dayOfWeek === dayOfWeek)
    if (!dayRule) return
    const existing = [...(dayRule.windows || [])]
    existing[index] = { ...existing[index], [field]: val }
    updateDay(dayOfWeek, { windows: existing })
  }

  function applyCopy() {
    if (copyModalDay === null || copyTargetDays.length === 0) {
      setCopyModalDay(null)
      return
    }
    const sourceDay = availability.find((a) => a.dayOfWeek === copyModalDay)
    if (!sourceDay) return

    const next = availability.map((a) => {
      if (copyTargetDays.includes(a.dayOfWeek)) {
        return {
          ...a,
          enabled: sourceDay.enabled,
          windows: JSON.parse(JSON.stringify(sourceDay.windows || [])),
        }
      }
      return a
    })
    onChange({ availability: next })
    setCopyModalDay(null)
    setCopyTargetDays([])
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#D8DFFA] pb-4">
        <div>
          <h2 className="text-lg font-bold text-[#010619]">Weekly Availability</h2>
          <p className="text-xs text-[#666666] mt-0.5">
            Set recurring windows when clients can book calls with you.
          </p>
        </div>

        {/* Timezone Selector */}
        <div className="flex items-center gap-2 bg-[#FFFFFF] border border-[#D8DFFA] px-3 py-1.5 rounded-full text-xs shadow-sm">
          <Globe className="h-3.5 w-3.5 text-[#194DF5]" />
          <select
            value={formState.timezone || 'Asia/Kolkata'}
            onChange={(e) => onChange({ timezone: e.target.value })}
            className="bg-transparent text-[#010619] font-semibold outline-none cursor-pointer text-xs"
          >
            {TIMEZONES.map((tz) => (
              <option key={tz.code} value={tz.code} className="bg-[#FFFFFF] text-[#010619]">
                {tz.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {errors.availability && (
        <div className="p-3 bg-[#FEF2F2] border border-[#FCA5A5] rounded-xl text-xs text-[#DC2626] flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{errors.availability}</span>
        </div>
      )}

      {/* Days List */}
      <div className="space-y-3.5">
        {DAYS_OF_WEEK.map((d) => {
          const dayRule = availability.find((a) => a.dayOfWeek === d.dayOfWeek) || {
            dayOfWeek: d.dayOfWeek,
            enabled: false,
            windows: [{ startTime: '09:00', endTime: '17:00' }],
          }

          return (
            <div
              key={d.dayOfWeek}
              className="p-4 rounded-xl border border-[#D8DFFA] bg-[#FFFFFF] space-y-3 shadow-sm"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id={`day-toggle-${d.dayOfWeek}`}
                    checked={dayRule.enabled}
                    onChange={(e) => updateDay(d.dayOfWeek, { enabled: e.target.checked })}
                    className="h-4 w-4 rounded bg-[#FFFFFF] border-[#D8DFFA] text-[#194DF5] focus:ring-[#194DF5] accent-[#194DF5] cursor-pointer"
                  />
                  <label
                    htmlFor={`day-toggle-${d.dayOfWeek}`}
                    className={`text-sm font-bold cursor-pointer ${
                      dayRule.enabled ? 'text-[#010619]' : 'text-[#6B7399]'
                    }`}
                  >
                    {d.name}
                  </label>
                </div>

                <div className="flex items-center gap-2">
                  {dayRule.enabled && (
                    <>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setCopyModalDay(d.dayOfWeek)
                          setCopyTargetDays(
                            DAYS_OF_WEEK.filter((x) => x.dayOfWeek !== d.dayOfWeek).map(
                              (x) => x.dayOfWeek
                            )
                          )
                        }}
                        className="h-7 text-[11px] font-semibold text-[#666666] hover:text-[#010619] hover:bg-[#E8EDFB] rounded-full px-2.5 gap-1 cursor-pointer"
                      >
                        <Copy className="h-3 w-3" /> Copy
                      </Button>

                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => addWindow(d.dayOfWeek)}
                        className="h-7 text-[11px] font-semibold text-[#194DF5] border-[#194DF5]/30 bg-[#194DF5]/10 hover:bg-[#194DF5]/20 rounded-full px-2.5 gap-1 cursor-pointer"
                      >
                        <Plus className="h-3 w-3" /> Add availability
                      </Button>
                    </>
                  )}
                </div>
              </div>

              {/* Windows Stack */}
              {dayRule.enabled ? (
                <div className="space-y-2 pt-1">
                  {(dayRule.windows || []).map((win, wIdx) => (
                    <AvailabilityWindow
                      key={wIdx}
                      window={win}
                      index={wIdx}
                      totalWindows={(dayRule.windows || []).length}
                      onChange={(idx, field, val) => updateWindowVal(d.dayOfWeek, idx, field, val)}
                      onRemove={(idx) => removeWindow(d.dayOfWeek, idx)}
                    />
                  ))}
                </div>
              ) : (
                <span className="text-[11px] font-semibold text-[#6B7399] bg-[#EEF1FB] px-3 py-1 rounded-full inline-block border border-[#D8DFFA]">
                  Unavailable
                </span>
              )}
            </div>
          )
        })}
      </div>

      {/* Copy Availability Modal Dialog */}
      {copyModalDay !== null && (
        <div className="fixed inset-0 z-50 bg-black/45 flex items-center justify-center p-4">
          <div className="bg-[#FFFFFF] rounded-2xl border border-[#D8DFFA] max-w-sm w-full p-5 space-y-4 shadow-2xl">
            <div>
              <h3 className="text-sm font-bold text-[#010619]">
                Copy {DAYS_OF_WEEK.find((d) => d.dayOfWeek === copyModalDay)?.name} Schedule
              </h3>
              <p className="text-xs text-[#666666] mt-0.5">
                Duplicate this day’s availability windows to:
              </p>
            </div>

            <div className="space-y-2">
              {DAYS_OF_WEEK.filter((d) => d.dayOfWeek !== copyModalDay).map((d) => (
                <label
                  key={d.dayOfWeek}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-[#F5F5F3] cursor-pointer text-xs font-semibold text-[#010619]"
                >
                  <input
                    type="checkbox"
                    checked={copyTargetDays.includes(d.dayOfWeek)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setCopyTargetDays([...copyTargetDays, d.dayOfWeek])
                      } else {
                        setCopyTargetDays(copyTargetDays.filter((x) => x !== d.dayOfWeek))
                      }
                    }}
                    className="h-4 w-4 rounded bg-[#FFFFFF] border-[#D8DFFA] text-[#194DF5] accent-[#194DF5]"
                  />
                  <span>{d.name}</span>
                </label>
              ))}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#D8DFFA]">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCopyModalDay(null)}
                className="rounded-full border-[#D8DFFA] bg-[#F5F5F3] text-[#333333] hover:bg-[#EAEAE8] text-xs"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={applyCopy}
                className="rounded-full bg-[#194DF5] hover:bg-[#1441D9] text-white text-xs font-bold px-4"
              >
                Apply Copy
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
