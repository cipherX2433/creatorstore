'use client'

import React, { useState, useEffect } from 'react'
import { api } from '@/lib/clientApi'
import { toast } from 'sonner'
import {
  X, Plus, Trash2, Clock, Globe, Shield, Loader2, CheckCircle2, AlertCircle, Save
} from 'lucide-react'

const TIMEZONES = [
  { code: 'Asia/Kolkata', label: 'Asia/Kolkata (IST - GMT +5:30)' },
  { code: 'America/New_York', label: 'America/New_York (Eastern Time - GMT -5:00 / -4:00)' },
  { code: 'America/Chicago', label: 'America/Chicago (Central Time - GMT -6:00 / -5:00)' },
  { code: 'America/Denver', label: 'America/Denver (Mountain Time - GMT -7:00 / -6:00)' },
  { code: 'America/Los_Angeles', label: 'America/Los_Angeles (Pacific Time - GMT -8:00 / -7:00)' },
  { code: 'Europe/London', label: 'Europe/London (GMT / BST - GMT +0:00 / +1:00)' },
  { code: 'Europe/Paris', label: 'Europe/Paris (CET - GMT +1:00 / +2:00)' },
  { code: 'Asia/Dubai', label: 'Asia/Dubai (GST - GMT +4:00)' },
  { code: 'Asia/Singapore', label: 'Asia/Singapore (SGT - GMT +8:00)' },
  { code: 'Asia/Tokyo', label: 'Asia/Tokyo (JST - GMT +9:00)' },
  { code: 'Australia/Sydney', label: 'Australia/Sydney (AEST - GMT +10:00 / +11:00)' },
  { code: 'UTC', label: 'UTC (Universal Coordinated Time)' },
]

const DAYS = [
  { dayOfWeek: 1, name: 'Monday' },
  { dayOfWeek: 2, name: 'Tuesday' },
  { dayOfWeek: 3, name: 'Wednesday' },
  { dayOfWeek: 4, name: 'Thursday' },
  { dayOfWeek: 5, name: 'Friday' },
  { dayOfWeek: 6, name: 'Saturday' },
  { dayOfWeek: 0, name: 'Sunday' },
]

export default function AvailabilitySettingsModal({
  isOpen,
  onClose,
  onSaved,
}) {
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [timezone, setTimezone] = useState('Asia/Kolkata')
  const [bufferMinutes, setBufferMinutes] = useState(15)
  const [minimumNoticeMinutes, setMinimumNoticeMinutes] = useState(1440)
  const [maximumAdvanceDays, setMaximumAdvanceDays] = useState(60)
  const [availability, setAvailability] = useState([])
  const [products, setProducts] = useState([])
  const [selectedProductId, setSelectedProductId] = useState('ALL')

  useEffect(() => {
    if (isOpen) {
      fetchAvailability()
    }
  }, [isOpen])

  async function fetchAvailability() {
    setLoading(true)
    try {
      const res = await api.get('/calendar/availability')
      if (res) {
        setTimezone(res.timezone || 'Asia/Kolkata')
        setBufferMinutes(res.bufferMinutes !== undefined ? res.bufferMinutes : 15)
        setMinimumNoticeMinutes(res.minimumNoticeMinutes !== undefined ? res.minimumNoticeMinutes : 1440)
        setMaximumAdvanceDays(res.maximumAdvanceDays || 60)
        setProducts(res.products || [])

        // Initialize availability days
        const rawAvail = res.availability || []
        const merged = DAYS.map((d) => {
          const found = rawAvail.find((a) => Number(a.dayOfWeek) === d.dayOfWeek)
          if (found) {
            return {
              dayOfWeek: d.dayOfWeek,
              dayName: d.name,
              enabled: found.enabled !== false,
              windows: Array.isArray(found.windows) && found.windows.length > 0
                ? found.windows
                : [{ startTime: '09:00', endTime: '17:00' }],
            }
          }
          return {
            dayOfWeek: d.dayOfWeek,
            dayName: d.name,
            enabled: d.dayOfWeek >= 1 && d.dayOfWeek <= 5,
            windows: [{ startTime: '09:00', endTime: '17:00' }],
          }
        })
        setAvailability(merged)
      }
    } catch (err) {
      console.error('Failed to load availability:', err)
      toast.error('Failed to load availability settings')
    } finally {
      setLoading(false)
    }
  }

  function handleToggleDay(dayOfWeek) {
    setAvailability((prev) =>
      prev.map((d) => (d.dayOfWeek === dayOfWeek ? { ...d, enabled: !d.enabled } : d))
    )
  }

  function handleAddWindow(dayOfWeek) {
    setAvailability((prev) =>
      prev.map((d) => {
        if (d.dayOfWeek !== dayOfWeek) return d
        const windows = [...(d.windows || [])]
        windows.push({ startTime: '14:00', endTime: '17:00' })
        return { ...d, enabled: true, windows }
      })
    )
  }

  function handleRemoveWindow(dayOfWeek, windowIndex) {
    setAvailability((prev) =>
      prev.map((d) => {
        if (d.dayOfWeek !== dayOfWeek) return d
        const windows = [...(d.windows || [])]
        windows.splice(windowIndex, 1)
        return {
          ...d,
          enabled: windows.length > 0,
          windows: windows.length > 0 ? windows : [{ startTime: '09:00', endTime: '17:00' }],
        }
      })
    )
  }

  function handleUpdateWindow(dayOfWeek, windowIndex, field, value) {
    setAvailability((prev) =>
      prev.map((d) => {
        if (d.dayOfWeek !== dayOfWeek) return d
        const windows = [...(d.windows || [])]
        windows[windowIndex] = { ...windows[windowIndex], [field]: value }
        return { ...d, windows }
      })
    )
  }

  async function handleSave() {
    setSaving(true)
    try {
      await api.post('/calendar/availability', {
        productId: selectedProductId,
        timezone,
        bufferMinutes: Number(bufferMinutes),
        minimumNoticeMinutes: Number(minimumNoticeMinutes),
        maximumAdvanceDays: Number(maximumAdvanceDays),
        availability,
      })
      toast.success('Availability settings saved successfully')
      onSaved && onSaved()
      onClose()
    } catch (err) {
      console.error('Save availability error:', err)
      toast.error(err.message || 'Failed to save availability settings')
    } finally {
      setSaving(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/35 backdrop-blur-none animate-in fade-in duration-150">
      
      {/* SOLID OPAQUE DIALOG */}
      <div className="w-full max-w-2xl bg-[#FFFFFF] border border-[#E5E5E3] rounded-[24px] shadow-[0_20px_60px_rgba(0,0,0,0.12)] overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* HEADER */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E5E5E3] bg-[#FFFFFF]">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-[#1F1F1F]" />
            <div>
              <h2 className="text-base font-bold text-[#1F1F1F]">
                Manage Availability
              </h2>
              <span className="text-xs text-[#6F6F6B] block">
                Configure your weekly working hours, buffer times, and scheduling rules
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-[8px] text-[#6F6F6B] hover:text-[#1F1F1F] hover:bg-[#F5F5F3] transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* BODY */}
        <div className="p-6 space-y-6 overflow-y-auto no-scrollbar flex-1 text-sm text-[#1F1F1F]">
          
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-[#1F1F1F]" />
            </div>
          ) : (
            <>
              {/* TARGET SCOPE & TIMEZONE */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-[16px] bg-[#FBFBFB] border border-[#E5E5E3]">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-[#6F6F6B] mb-1.5 block">
                    Target Products
                  </label>
                  <select
                    value={selectedProductId}
                    onChange={(e) => setSelectedProductId(e.target.value)}
                    className="w-full text-xs bg-[#FFFFFF] border border-[#E5E5E3] rounded-[8px] px-3 py-2 text-[#1F1F1F] focus:outline-none focus:border-[#1F1F1F]"
                  >
                    <option value="ALL">All Coaching Products (Global)</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-[#6F6F6B] mb-1.5 block">
                    Creator Timezone
                  </label>
                  <select
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                    className="w-full text-xs bg-[#FFFFFF] border border-[#E5E5E3] rounded-[8px] px-3 py-2 text-[#1F1F1F] focus:outline-none focus:border-[#1F1F1F]"
                  >
                    {TIMEZONES.map((tz) => (
                      <option key={tz.code} value={tz.code}>
                        {tz.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* WEEKLY SCHEDULE */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-[#6F6F6B] mb-3 block">
                  Weekly Working Hours
                </label>

                <div className="space-y-2.5">
                  {availability.map((day) => {
                    return (
                      <div
                        key={day.dayOfWeek}
                        className={`p-3.5 rounded-[16px] border transition-colors ${
                          day.enabled
                            ? 'bg-[#FBFBFB] border-[#E5E5E3]'
                            : 'bg-[#FBFBFB]/50 border-[#E5E5E3]/40 opacity-70'
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                          
                          {/* Day Toggle */}
                          <div className="flex items-center gap-3 min-w-[120px]">
                            <button
                              type="button"
                              onClick={() => handleToggleDay(day.dayOfWeek)}
                              className={`w-9 h-5 rounded-full transition-colors relative p-0.5 cursor-pointer ${
                                day.enabled ? 'bg-[#1F1F1F]' : 'bg-[#ECECE9] border border-[#E5E5E3]'
                              }`}
                            >
                              <div
                                className={`w-4 h-4 rounded-full bg-[#FFFFFF] transition-transform ${
                                  day.enabled ? 'translate-x-4' : 'translate-x-0'
                                }`}
                              />
                            </button>
                            <span className="text-xs font-bold text-[#1F1F1F]">
                              {day.dayName}
                            </span>
                          </div>

                          {/* Time Windows / Unavailable */}
                          <div className="flex-1 space-y-2">
                            {day.enabled ? (
                              day.windows.map((win, wIdx) => (
                                <div key={wIdx} className="flex items-center gap-2 flex-wrap">
                                  <input
                                    type="time"
                                    value={win.startTime}
                                    onChange={(e) => handleUpdateWindow(day.dayOfWeek, wIdx, 'startTime', e.target.value)}
                                    className="text-xs font-mono bg-[#FFFFFF] border border-[#E5E5E3] rounded-[8px] px-2.5 py-1.5 text-[#1F1F1F] focus:outline-none focus:border-[#1F1F1F]"
                                  />
                                  <span className="text-xs text-[#6F6F6B]">–</span>
                                  <input
                                    type="time"
                                    value={win.endTime}
                                    onChange={(e) => handleUpdateWindow(day.dayOfWeek, wIdx, 'endTime', e.target.value)}
                                    className="text-xs font-mono bg-[#FFFFFF] border border-[#E5E5E3] rounded-[8px] px-2.5 py-1.5 text-[#1F1F1F] focus:outline-none focus:border-[#1F1F1F]"
                                  />

                                  {day.windows.length > 1 && (
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveWindow(day.dayOfWeek, wIdx)}
                                      className="p-1.5 rounded-[6px] text-[#6F6F6B] hover:text-[#DC2626] hover:bg-[#DC2626]/10 transition-colors cursor-pointer"
                                      title="Remove window"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                  )}
                                </div>
                              ))
                            ) : (
                              <span className="text-xs text-[#6F6F6B] italic">
                                Unavailable (Day Off)
                              </span>
                            )}
                          </div>

                          {/* Add Window Button */}
                          {day.enabled && (
                            <div className="shrink-0">
                              <button
                                type="button"
                                onClick={() => handleAddWindow(day.dayOfWeek)}
                                className="px-2.5 py-1 rounded-[8px] bg-[#FFFFFF] border border-[#E5E5E3] text-[#1F1F1F] hover:bg-[#F5F5F3] text-[11px] font-bold transition-colors flex items-center gap-1 cursor-pointer"
                              >
                                <Plus className="h-3 w-3" />
                                <span>Add Break/Window</span>
                              </button>
                            </div>
                          )}

                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* BUFFER & NOTICE RULES */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 rounded-[16px] bg-[#FBFBFB] border border-[#E5E5E3]">
                
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-[#6F6F6B] mb-1.5 block">
                    Buffer Time
                  </label>
                  <select
                    value={bufferMinutes}
                    onChange={(e) => setBufferMinutes(Number(e.target.value))}
                    className="w-full text-xs bg-[#FFFFFF] border border-[#E5E5E3] rounded-[8px] px-3 py-2 text-[#1F1F1F] focus:outline-none focus:border-[#1F1F1F]"
                  >
                    <option value={0}>0 minutes</option>
                    <option value={5}>5 minutes</option>
                    <option value={10}>10 minutes</option>
                    <option value={15}>15 minutes (Standard)</option>
                    <option value={30}>30 minutes</option>
                    <option value={45}>45 minutes</option>
                    <option value={60}>60 minutes</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-[#6F6F6B] mb-1.5 block">
                    Minimum Notice
                  </label>
                  <select
                    value={minimumNoticeMinutes}
                    onChange={(e) => setMinimumNoticeMinutes(Number(e.target.value))}
                    className="w-full text-xs bg-[#FFFFFF] border border-[#E5E5E3] rounded-[8px] px-3 py-2 text-[#1F1F1F] focus:outline-none focus:border-[#1F1F1F]"
                  >
                    <option value={60}>1 hour notice</option>
                    <option value={120}>2 hours notice</option>
                    <option value={360}>6 hours notice</option>
                    <option value={720}>12 hours notice</option>
                    <option value={1440}>24 hours notice (Recommended)</option>
                    <option value={2880}>48 hours notice</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-[#6F6F6B] mb-1.5 block">
                    Booking Window
                  </label>
                  <select
                    value={maximumAdvanceDays}
                    onChange={(e) => setMaximumAdvanceDays(Number(e.target.value))}
                    className="w-full text-xs bg-[#FFFFFF] border border-[#E5E5E3] rounded-[8px] px-3 py-2 text-[#1F1F1F] focus:outline-none focus:border-[#1F1F1F]"
                  >
                    <option value={14}>14 days in advance</option>
                    <option value={30}>30 days in advance</option>
                    <option value={60}>60 days in advance (Standard)</option>
                    <option value={90}>90 days in advance</option>
                    <option value={180}>180 days in advance</option>
                  </select>
                </div>

              </div>
            </>
          )}

        </div>

        {/* FOOTER */}
        <div className="flex items-center justify-end px-6 py-4 border-t border-[#E5E5E3] bg-[#FFFFFF] gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 rounded-[10px] bg-[#FFFFFF] border border-[#E5E5E3] text-[#1F1F1F] text-xs font-bold hover:bg-[#F5F5F3] transition-colors cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={saving || loading}
            className="px-5 py-2 rounded-[10px] bg-[#1F1F1F] text-[#FFFFFF] text-xs font-bold hover:bg-[#000000] active:bg-[#111111] disabled:opacity-50 transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            {saving ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Save className="h-3.5 w-3.5" />
                <span>Save Availability</span>
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  )
}
