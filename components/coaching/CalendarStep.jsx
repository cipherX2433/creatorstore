'use client'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Calendar, Video, Phone, MapPin, Check, CheckCircle2, Globe, Sparkles } from 'lucide-react'

const MEETING_LOCATIONS = [
  { id: 'GOOGLE_MEET', title: 'Google Meet', desc: 'Automatically generates a unique Google Meet link for each booking', icon: Video },
  { id: 'ZOOM', title: 'Zoom', desc: 'Use your personal Zoom room or static meeting link', icon: Video },
  { id: 'MS_TEAMS', title: 'Microsoft Teams', desc: 'Conferencing via Microsoft Teams meeting link', icon: Video },
  { id: 'PHONE', title: 'Phone Call', desc: 'Session takes place over direct phone call', icon: Phone },
  { id: 'CUSTOM', title: 'Custom Location', desc: 'Physical studio address or custom conferencing tool', icon: MapPin },
  { id: 'NO_LOCATION', title: 'No Location', desc: 'Meeting details coordinated separately with client', icon: Globe },
]

export default function CalendarStep({
  formState,
  onChange,
  errors = {},
}) {
  const isGoogleConnected = formState.calendarConnected !== false

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-[#010619]">Calendar & Meeting Location</h2>
        <p className="text-xs text-[#666666] mt-0.5">
          Connect your calendar to prevent double bookings and configure where your sessions will take place.
        </p>
      </div>

      <div className="space-y-6">
        {/* Calendar Integration Card */}
        <div className="p-4 rounded-xl border border-[#D8DFFA] bg-[#FFFFFF] space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-[#194DF5]/10 text-[#194DF5] flex items-center justify-center font-bold">
                <Calendar className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-[#010619]">Google Calendar</h3>
                <p className="text-[11px] text-[#666666]">
                  Your calendar will be checked for conflicts before showing available booking slots to clients.
                </p>
              </div>
            </div>

            <div>
              {isGoogleConnected ? (
                <div className="flex items-center gap-2">
                  <span className="flex items-center gap-1.5 text-xs font-semibold text-[#16A34A] bg-[#F0FDF4] px-3 py-1 rounded-full border border-[#BBF7D0]">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Google Calendar Connected
                  </span>
                  <button
                    type="button"
                    onClick={() => onChange({ calendarConnected: false })}
                    className="text-[11px] font-semibold text-[#6B7399] hover:text-[#EF4444] px-2.5 py-1 rounded-full hover:bg-[#E8EDFB] transition-colors cursor-pointer"
                  >
                    Disconnect
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => onChange({ calendarConnected: true })}
                  className="rounded-full bg-[#194DF5] text-white text-xs font-bold px-3.5 py-1.5 hover:bg-[#1441D9] transition-colors cursor-pointer"
                >
                  Connect Google Calendar
                </button>
              )}
            </div>
          </div>

          {isGoogleConnected && (
            <div className="pt-2 border-t border-[#D8DFFA] flex items-center justify-between text-xs">
              <span className="text-[#666666]">Active Calendar:</span>
              <select
                value={formState.calendarId || 'primary'}
                onChange={(e) => onChange({ calendarId: e.target.value })}
                className="bg-[#FFFFFF] border border-[#D8DFFA] text-[#010619] rounded-lg px-2.5 py-1 text-xs font-semibold cursor-pointer"
              >
                <option value="primary">Primary Calendar (creator@store.com)</option>
                <option value="coaching_cal">Coaching & Consultations</option>
              </select>
            </div>
          )}
        </div>

        {/* Meeting Location */}
        <div className="space-y-3">
          <Label className="text-xs font-semibold text-[#333333]">Where will the meeting happen?</Label>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {MEETING_LOCATIONS.map((loc) => {
              const Icon = loc.icon
              const isSelected = formState.meetingType === loc.id
              return (
                <div
                  key={loc.id}
                  onClick={() => onChange({ meetingType: loc.id })}
                  className={`p-3.5 rounded-xl border text-left cursor-pointer transition-all ${
                    isSelected
                      ? 'border-[#194DF5] bg-[#194DF5]/10 ring-1 ring-[#194DF5]'
                      : 'border-[#D8DFFA] bg-[#FFFFFF] hover:bg-[#EEF1FB]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4 text-[#194DF5]" />
                      <span className="text-xs font-bold text-[#010619]">{loc.title}</span>
                    </div>
                    {isSelected && <Check className="h-4 w-4 text-[#194DF5]" />}
                  </div>
                  <p className="text-[11px] text-[#666666] mt-1.5 leading-relaxed">{loc.desc}</p>
                </div>
              )
            })}
          </div>

          {/* Conditional location fields */}
          {formState.meetingType === 'ZOOM' && (
            <div className="pt-2 space-y-1.5">
              <Label className="text-xs font-semibold text-[#333333]">
                Zoom Meeting URL <span className="text-[#EF4444]">*</span>
              </Label>
              <Input
                value={formState.meetingUrl || ''}
                onChange={(e) => onChange({ meetingUrl: e.target.value })}
                placeholder="https://zoom.us/j/1234567890"
                className={`h-10 rounded-xl bg-[#FFFFFF] text-xs text-[#010619] transition-colors ${
                  errors.meetingUrl ? 'border-[#EF4444] focus:border-[#EF4444]' : 'border-[#D8DFFA] focus:border-[#194DF5]'
                }`}
              />
              {errors.meetingUrl && (
                <p className="text-xs font-semibold text-[#EF4444]">{errors.meetingUrl}</p>
              )}
            </div>
          )}

          {formState.meetingType === 'MS_TEAMS' && (
            <div className="pt-2 space-y-1.5">
              <Label className="text-xs font-semibold text-[#333333]">
                Microsoft Teams Meeting Link <span className="text-[#EF4444]">*</span>
              </Label>
              <Input
                value={formState.meetingUrl || ''}
                onChange={(e) => onChange({ meetingUrl: e.target.value })}
                placeholder="https://teams.microsoft.com/l/meetup-join/..."
                className={`h-10 rounded-xl bg-[#FFFFFF] text-xs text-[#010619] transition-colors ${
                  errors.meetingUrl ? 'border-[#EF4444] focus:border-[#EF4444]' : 'border-[#D8DFFA] focus:border-[#194DF5]'
                }`}
              />
              {errors.meetingUrl && (
                <p className="text-xs font-semibold text-[#EF4444]">{errors.meetingUrl}</p>
              )}
            </div>
          )}

          {formState.meetingType === 'PHONE' && (
            <div className="pt-2 space-y-1.5">
              <Label className="text-xs font-semibold text-[#333333]">
                Phone Call Instructions / Number <span className="text-[#EF4444]">*</span>
              </Label>
              <Input
                value={formState.locationText || ''}
                onChange={(e) => onChange({ locationText: e.target.value })}
                placeholder="e.g. Creator will call the customer at the scheduled phone number"
                className={`h-10 rounded-xl bg-[#FFFFFF] text-xs text-[#010619] transition-colors ${
                  errors.locationText ? 'border-[#EF4444] focus:border-[#EF4444]' : 'border-[#D8DFFA] focus:border-[#194DF5]'
                }`}
              />
              {errors.locationText && (
                <p className="text-xs font-semibold text-[#EF4444]">{errors.locationText}</p>
              )}
            </div>
          )}

          {formState.meetingType === 'CUSTOM' && (
            <div className="pt-2 space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-[#333333]">
                  Meeting Link / Physical Address <span className="text-[#EF4444]">*</span>
                </Label>
                <Input
                  value={formState.meetingUrl || formState.locationText || ''}
                  onChange={(e) => onChange({ meetingUrl: e.target.value, locationText: e.target.value })}
                  placeholder="e.g. 100 Main Street, Suite 400 or https://conferencing.com/room"
                  className={`h-10 rounded-xl bg-[#FFFFFF] text-xs text-[#010619] transition-colors ${
                    errors.locationText || errors.meetingUrl ? 'border-[#EF4444] focus:border-[#EF4444]' : 'border-[#D8DFFA] focus:border-[#194DF5]'
                  }`}
                />
                {(errors.locationText || errors.meetingUrl) && (
                  <p className="text-xs font-semibold text-[#EF4444]">{errors.locationText || errors.meetingUrl}</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
