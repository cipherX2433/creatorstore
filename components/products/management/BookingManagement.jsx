'use client'

import { useState } from 'react'
import { formatMoney } from '@/lib/clientApi'
import {
  Video, DollarSign, Calendar, Clock, Search, CheckCircle2,
  AlertCircle, XCircle, ChevronRight, User, Mail, Phone,
  ExternalLink, CalendarCheck, Settings, Save, Loader2, RefreshCw, X
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { api } from '@/lib/clientApi'

function formatDate(dateString) {
  if (!dateString) return '—'
  try {
    const d = new Date(dateString)
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  } catch (e) {
    return '—'
  }
}

function formatTime(dateString) {
  if (!dateString) return '—'
  try {
    const d = new Date(dateString)
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
  } catch (e) {
    return '—'
  }
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export default function BookingManagement({ data, onProductUpdated, activeTab, onTabChange }) {
  const { product, summary = {}, overview = {}, bookings = [], config = {} } = data
  const currency = product?.currency || 'INR'

  const [bookingSearch, setBookingSearch] = useState('')
  const [selectedBooking, setSelectedBooking] = useState(null)
  const [actionBusy, setActionBusy] = useState(false)
  const [cancelModal, setCancelModal] = useState({ open: false, booking: null, reason: '' })
  const [rescheduleModal, setRescheduleModal] = useState({ open: false, booking: null, newDate: '', newTime: '' })

  // Settings edit state
  const [savingSettings, setSavingSettings] = useState(false)
  const [formData, setFormData] = useState({
    title: product?.title || '',
    price: product?.price !== undefined ? product?.price : 0,
    durationMinutes: config?.durationMinutes || 60,
    meetingType: config?.meetingType || 'GOOGLE_MEET',
    meetingUrl: config?.meetingUrl || '',
    minimumNoticeMinutes: config?.minimumNoticeMinutes !== undefined ? config.minimumNoticeMinutes : 1440,
    allowRescheduling: config?.allowRescheduling !== false,
    allowCancellation: config?.allowCancellation !== false,
    status: product?.status || 'DRAFT',
  })

  const filteredBookings = bookings.filter(b =>
    (b.customerName && b.customerName.toLowerCase().includes(bookingSearch.toLowerCase())) ||
    (b.customerEmail && b.customerEmail.toLowerCase().includes(bookingSearch.toLowerCase()))
  )

  async function handleCancelBooking() {
    if (!cancelModal.booking) return
    setActionBusy(true)
    try {
      await api.post(`/coaching/bookings/${cancelModal.booking.id}/cancel`, {
        reason: cancelModal.reason || 'Cancelled by creator'
      })
      toast.success('Booking cancelled successfully')
      setCancelModal({ open: false, booking: null, reason: '' })
      setSelectedBooking(null)
      onProductUpdated?.()
    } catch (err) {
      toast.error(err.message || 'Failed to cancel booking')
    } finally {
      setActionBusy(false)
    }
  }

  async function handleRescheduleBooking() {
    if (!rescheduleModal.booking || !rescheduleModal.newDate || !rescheduleModal.newTime) {
      toast.error('Please select both date and time')
      return
    }
    setActionBusy(true)
    try {
      const startDateTime = new Date(`${rescheduleModal.newDate}T${rescheduleModal.newTime}:00`)
      const duration = config?.durationMinutes || 60
      const endDateTime = new Date(startDateTime.getTime() + duration * 60 * 1000)

      await api.post(`/coaching/bookings/${rescheduleModal.booking.id}/reschedule`, {
        newStartTime: startDateTime.toISOString(),
        newEndTime: endDateTime.toISOString(),
      })
      toast.success('Booking rescheduled successfully')
      setRescheduleModal({ open: false, booking: null, newDate: '', newTime: '' })
      setSelectedBooking(null)
      onProductUpdated?.()
    } catch (err) {
      toast.error(err.message || 'Failed to reschedule booking')
    } finally {
      setActionBusy(false)
    }
  }

  async function handleSaveSettings(e) {
    e?.preventDefault()
    setSavingSettings(true)
    try {
      await api.post(`/coaching/config/${product.id}`, {
        title: formData.title,
        price: Number(formData.price),
        durationMinutes: Number(formData.durationMinutes),
        meetingType: formData.meetingType,
        meetingUrl: formData.meetingUrl,
        minimumNoticeMinutes: Number(formData.minimumNoticeMinutes),
        allowRescheduling: formData.allowRescheduling,
        allowCancellation: formData.allowCancellation,
        status: formData.status,
      })
      toast.success('Booking settings saved')
      onProductUpdated?.()
    } catch (err) {
      toast.error(err.message || 'Failed to update settings')
    } finally {
      setSavingSettings(false)
    }
  }

  return (
    <div className="space-y-6 text-[#010619]">
      {/* 4 Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-[#FFFFFF] border border-[#D8DFFA] rounded-xl p-4 flex flex-col justify-between shadow-xs">
          <div className="flex items-center justify-between text-[#666666] text-xs font-semibold">
            <span>Total Bookings</span>
            <Calendar className="h-4 w-4 text-[#194DF5]" />
          </div>
          <div className="mt-2 text-xl font-bold text-[#010619]">
            {summary.totalBookings || 0}
          </div>
          <div className="mt-1 text-[11px] text-[#6B7399]">
            Lifetime appointments
          </div>
        </div>

        <div className="bg-[#FFFFFF] border border-[#D8DFFA] rounded-xl p-4 flex flex-col justify-between shadow-xs">
          <div className="flex items-center justify-between text-[#666666] text-xs font-semibold">
            <span>Upcoming</span>
            <Clock className="h-4 w-4 text-[#F59E0B]" />
          </div>
          <div className="mt-2 text-xl font-bold text-[#010619]">
            {summary.upcoming || 0}
          </div>
          <div className="mt-1 text-[11px] text-[#6B7399]">
            Scheduled sessions
          </div>
        </div>

        <div className="bg-[#FFFFFF] border border-[#D8DFFA] rounded-xl p-4 flex flex-col justify-between shadow-xs">
          <div className="flex items-center justify-between text-[#666666] text-xs font-semibold">
            <span>Completed</span>
            <CheckCircle2 className="h-4 w-4 text-[#22C55E]" />
          </div>
          <div className="mt-2 text-xl font-bold text-[#010619]">
            {summary.completed || 0}
          </div>
          <div className="mt-1 text-[11px] text-[#6B7399]">
            Finished calls
          </div>
        </div>

        <div className="bg-[#FFFFFF] border border-[#D8DFFA] rounded-xl p-4 flex flex-col justify-between shadow-xs">
          <div className="flex items-center justify-between text-[#666666] text-xs font-semibold">
            <span>Revenue</span>
            <DollarSign className="h-4 w-4 text-[#22C55E]" />
          </div>
          <div className="mt-2 text-xl font-bold text-[#010619]">
            {formatMoney(summary.revenue || 0, currency)}
          </div>
          <div className="mt-1 text-[11px] text-[#6B7399]">
            Booking earnings
          </div>
        </div>
      </div>

      {/* Tab: Overview */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Service Specs */}
            <div className="bg-[#FFFFFF] border border-[#D8DFFA] rounded-xl p-5 space-y-4 shadow-xs">
              <h3 className="text-sm font-bold text-[#010619] uppercase tracking-wider text-[11px]">Service Details</h3>
              <div className="space-y-2 text-xs">
                <div>
                  <span className="text-[#666666]">Service Name: </span>
                  <span className="font-semibold text-[#010619]">{overview.serviceName || product.title}</span>
                </div>
                <div>
                  <span className="text-[#666666]">Price: </span>
                  <span className="font-semibold text-[#010619]">
                    {Number(overview.price) === 0 ? 'Free' : formatMoney(overview.price, currency)}
                  </span>
                </div>
                <div>
                  <span className="text-[#666666]">Duration: </span>
                  <span className="font-semibold text-[#010619]">{overview.duration || 60} minutes</span>
                </div>
                <div>
                  <span className="text-[#666666]">Meeting Type: </span>
                  <span className="font-semibold text-[#010619]">{config?.meetingType || 'Google Meet'}</span>
                </div>
              </div>
            </div>

            {/* Next Booking Card */}
            <div className="bg-[#FFFFFF] border border-[#D8DFFA] rounded-xl p-5 space-y-4 shadow-xs">
              <h3 className="text-sm font-bold text-[#010619] uppercase tracking-wider text-[11px]">Next Scheduled Booking</h3>
              {overview.nextBooking ? (
                <div className="bg-[#EEF1FB] border border-[#D8DFFA] rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#010619]">{overview.nextBooking.customerName || 'Customer'}</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#22C55E]/10 text-[#22C55E]">Confirmed</span>
                  </div>
                  <div className="text-xs text-[#666666] flex items-center gap-2">
                    <Calendar className="h-3.5 w-3.5 text-[#194DF5]" />
                    <span>{formatDate(overview.nextBooking.startTime)} at {formatTime(overview.nextBooking.startTime)}</span>
                  </div>
                  {overview.nextBooking.meetingUrl && (
                    <a
                      href={overview.nextBooking.meetingUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs text-[#194DF5] hover:underline pt-1 font-semibold"
                    >
                      <Video className="h-3.5 w-3.5" /> Join Meeting Link
                    </a>
                  )}
                </div>
              ) : (
                <div className="text-center py-6 text-[#666666] text-xs">
                  <CalendarCheck className="h-8 w-8 mx-auto mb-2 opacity-50 text-[#6B7399]" />
                  <p>No upcoming bookings scheduled.</p>
                </div>
              )}
            </div>
          </div>

          {/* Bookings Table Preview */}
          <div className="bg-[#FFFFFF] border border-[#D8DFFA] rounded-xl p-5 space-y-4 shadow-xs">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-[#010619] uppercase tracking-wider text-[11px]">Recent Bookings</h3>
              {bookings.length > 0 && (
                <button
                  onClick={() => onTabChange?.('bookings')}
                  className="text-xs text-[#194DF5] hover:underline cursor-pointer font-semibold"
                >
                  View all ({bookings.length})
                </button>
              )}
            </div>

            {bookings.length === 0 ? (
              <div className="text-center py-8 text-[#666666] text-xs">
                <p>No bookings yet.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="border-b border-[#D8DFFA] text-[#6B7399]">
                      <th className="pb-2.5 font-semibold">Customer</th>
                      <th className="pb-2.5 font-semibold">Date & Time</th>
                      <th className="pb-2.5 font-semibold text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bookings.slice(0, 5).map(b => (
                      <tr
                        key={b.id}
                        onClick={() => setSelectedBooking(b)}
                        className="border-b border-[#D8DFFA] last:border-0 hover:bg-[#EEF1FB] transition-colors cursor-pointer"
                      >
                        <td className="py-3">
                          <div className="font-semibold text-[#010619]">{b.customerName || 'Customer'}</div>
                          <div className="text-[11px] text-[#666666]">{b.customerEmail}</div>
                        </td>
                        <td className="py-3 text-[#666666]">
                          {formatDate(b.startTime)} at {formatTime(b.startTime)}
                        </td>
                        <td className="py-3 text-right">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            b.status === 'CONFIRMED'
                              ? 'bg-[#22C55E]/10 text-[#22C55E]'
                              : b.status === 'CANCELLED'
                              ? 'bg-[#EF4444]/10 text-[#EF4444]'
                              : 'bg-[#F59E0B]/10 text-[#D97706]'
                          }`}>
                            {b.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab: Bookings */}
      {activeTab === 'bookings' && (
        <div className="bg-[#FFFFFF] border border-[#D8DFFA] rounded-xl p-5 space-y-4 shadow-xs">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <h3 className="text-sm font-bold text-[#010619]">Bookings ({bookings.length})</h3>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#6B7399]" />
              <input
                type="text"
                placeholder="Search bookings..."
                value={bookingSearch}
                onChange={e => setBookingSearch(e.target.value)}
                className="w-full bg-[#FFFFFF] border border-[#D8DFFA] text-[#010619] placeholder-[#6B7399] text-xs pl-8 pr-3 py-1.5 rounded-full focus:outline-none focus:border-[#194DF5]"
              />
            </div>
          </div>

          {bookings.length === 0 ? (
            <div className="text-center py-12 text-[#666666] space-y-2">
              <Calendar className="h-8 w-8 mx-auto opacity-50 text-[#6B7399]" />
              <p className="text-sm font-semibold text-[#010619]">No bookings yet</p>
              <p className="text-xs">When customers book this service, their bookings will appear here.</p>
            </div>
          ) : filteredBookings.length === 0 ? (
            <div className="text-center py-8 text-[#666666] text-xs">
              No bookings match &quot;{bookingSearch}&quot;
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-[#D8DFFA] text-[#6B7399] text-[11px] uppercase tracking-wider">
                    <th className="pb-3 font-bold">Customer</th>
                    <th className="pb-3 font-bold">Email</th>
                    <th className="pb-3 font-bold">Date</th>
                    <th className="pb-3 font-bold">Time</th>
                    <th className="pb-3 font-bold text-right">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredBookings.map(b => (
                    <tr
                      key={b.id}
                      onClick={() => setSelectedBooking(b)}
                      className="border-b border-[#D8DFFA] last:border-0 hover:bg-[#EEF1FB] transition-colors cursor-pointer"
                    >
                      <td className="py-3 font-bold text-[#010619]">{b.customerName || 'Customer'}</td>
                      <td className="py-3 text-[#666666]">{b.customerEmail}</td>
                      <td className="py-3 text-[#666666]">{formatDate(b.startTime)}</td>
                      <td className="py-3 text-[#666666]">{formatTime(b.startTime)}</td>
                      <td className="py-3 text-right">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          b.status === 'CONFIRMED'
                            ? 'bg-[#22C55E]/10 text-[#22C55E]'
                            : b.status === 'CANCELLED'
                            ? 'bg-[#EF4444]/10 text-[#EF4444]'
                            : 'bg-[#F59E0B]/10 text-[#D97706]'
                        }`}>
                          {b.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab: Calendar */}
      {activeTab === 'calendar' && (
        <div className="bg-[#FFFFFF] border border-[#D8DFFA] rounded-xl p-5 space-y-4 shadow-xs">
          <h3 className="text-sm font-bold text-[#010619]">Scheduled Calendar Agenda</h3>
          {bookings.length === 0 ? (
            <div className="text-center py-12 text-[#666666] text-xs">
              <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50 text-[#6B7399]" />
              <p>No appointments booked on calendar yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {bookings.map(b => (
                <div key={b.id} className="bg-[#EEF1FB] border border-[#D8DFFA] rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-[#FFFFFF] border border-[#D8DFFA] flex flex-col items-center justify-center text-center shrink-0">
                      <span className="text-[10px] uppercase font-bold text-[#6B7399] leading-none">
                        {new Date(b.startTime).toLocaleDateString('en-US', { month: 'short' })}
                      </span>
                      <span className="text-sm font-extrabold text-[#010619] leading-none mt-0.5">
                        {new Date(b.startTime).getDate()}
                      </span>
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-[#010619]">{b.customerName || 'Customer'}</h4>
                      <p className="text-[11px] text-[#666666]">
                        {formatTime(b.startTime)} - {formatTime(b.endTime)} ({config?.durationMinutes || 60}m)
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 self-end sm:self-center">
                    {b.meetingUrl && (
                      <a
                        href={b.meetingUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-1 bg-[#F0F5FF] text-[#194DF5] hover:bg-[#E0ECFF] rounded-full text-xs font-semibold flex items-center gap-1.5 border border-[#D0E2FF]"
                      >
                        <Video className="h-3.5 w-3.5" /> Meeting Link
                      </a>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setSelectedBooking(b)}
                      className="text-xs text-[#666666] hover:text-[#010619]"
                    >
                      Details
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab: Availability */}
      {activeTab === 'availability' && (
        <div className="bg-[#FFFFFF] border border-[#D8DFFA] rounded-xl p-5 space-y-4 shadow-xs">
          <h3 className="text-sm font-bold text-[#010619]">Weekly Schedule & Availability Windows</h3>
          
          <div className="space-y-2 text-xs">
            {(config?.availability && Array.isArray(config.availability) && config.availability.length > 0) ? (
              config.availability.map((a, i) => {
                const dayName = a.dayName || DAY_NAMES[a.dayOfWeek] || `Day ${a.dayOfWeek}`
                return (
                  <div key={i} className="flex items-center justify-between py-2.5 px-3 rounded-lg bg-[#EEF1FB] border border-[#D8DFFA]">
                    <div className="flex items-center gap-2">
                      <span className={`h-2 w-2 rounded-full ${a.enabled ? 'bg-[#22C55E]' : 'bg-[#6B7399]'}`} />
                      <span className="font-semibold text-[#010619] w-24">{dayName}</span>
                    </div>
                    <div className="text-[#666666]">
                      {a.enabled ? (
                        Array.isArray(a.windows) && a.windows.length > 0 ? (
                          a.windows.map(w => `${w.startTime} - ${w.endTime}`).join(', ')
                        ) : a.startTime && a.endTime ? (
                          `${a.startTime} - ${a.endTime}`
                        ) : 'All Day Available'
                      ) : (
                        <span className="text-[#6B7399] italic">Unavailable</span>
                      )}
                    </div>
                  </div>
                )
              })
            ) : (
              <div className="text-center py-6 text-[#666666]">
                Default availability (Mon-Fri 9:00 AM - 5:00 PM) configured.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab: Settings */}
      {activeTab === 'settings' && (
        <form onSubmit={handleSaveSettings} className="bg-[#FFFFFF] border border-[#D8DFFA] rounded-xl p-5 space-y-4 shadow-xs">
          <h3 className="text-sm font-bold text-[#010619]">Booking Configuration</h3>
          
          <div className="space-y-3 text-xs">
            <div>
              <label className="block text-[#333333] mb-1 font-semibold">Service Name</label>
              <Input
                value={formData.title}
                onChange={e => setFormData({ ...formData, title: e.target.value })}
                className="bg-[#FFFFFF] border-[#D8DFFA] text-[#010619]"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[#333333] mb-1 font-semibold">Price ({currency})</label>
                <Input
                  type="number"
                  min="0"
                  value={formData.price}
                  onChange={e => setFormData({ ...formData, price: e.target.value })}
                  className="bg-[#FFFFFF] border-[#D8DFFA] text-[#010619]"
                />
              </div>
              <div>
                <label className="block text-[#333333] mb-1 font-semibold">Duration (Minutes)</label>
                <Input
                  type="number"
                  min="15"
                  step="15"
                  value={formData.durationMinutes}
                  onChange={e => setFormData({ ...formData, durationMinutes: e.target.value })}
                  className="bg-[#FFFFFF] border-[#D8DFFA] text-[#010619]"
                />
              </div>
              <div>
                <label className="block text-[#333333] mb-1 font-semibold">Status</label>
                <select
                  value={formData.status}
                  onChange={e => setFormData({ ...formData, status: e.target.value })}
                  className="w-full h-10 px-3 rounded-md bg-[#FFFFFF] border border-[#D8DFFA] text-[#010619] focus:outline-none focus:border-[#194DF5]"
                >
                  <option value="DRAFT">Draft</option>
                  <option value="PUBLISHED">Published</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[#333333] mb-1 font-semibold">Meeting Provider</label>
                <select
                  value={formData.meetingType}
                  onChange={e => setFormData({ ...formData, meetingType: e.target.value })}
                  className="w-full h-10 px-3 rounded-md bg-[#FFFFFF] border border-[#D8DFFA] text-[#010619] focus:outline-none focus:border-[#194DF5]"
                >
                  <option value="GOOGLE_MEET">Google Meet</option>
                  <option value="ZOOM">Zoom</option>
                  <option value="CUSTOM_URL">Custom Meeting Link</option>
                </select>
              </div>
              <div>
                <label className="block text-[#333333] mb-1 font-semibold">Default Meeting Link</label>
                <Input
                  value={formData.meetingUrl}
                  onChange={e => setFormData({ ...formData, meetingUrl: e.target.value })}
                  placeholder="https://meet.google.com/..."
                  className="bg-[#FFFFFF] border-[#D8DFFA] text-[#010619]"
                />
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-[#D8DFFA] flex justify-end">
            <Button
              type="submit"
              disabled={savingSettings}
              className="bg-[#194DF5] hover:bg-[#1441D9] text-white text-xs font-bold rounded-full px-5 h-9 flex items-center gap-2 cursor-pointer"
            >
              {savingSettings ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              Save Changes
            </Button>
          </div>
        </form>
      )}

      {/* Booking Detail Modal */}
      {selectedBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/45">
          <div className="bg-[#FFFFFF] border border-[#D8DFFA] rounded-2xl p-6 max-w-lg w-full space-y-4 shadow-2xl text-[#010619]">
            <div className="flex items-center justify-between border-b border-[#D8DFFA] pb-3">
              <h4 className="text-sm font-bold text-[#010619]">Booking Details</h4>
              <button
                onClick={() => setSelectedBooking(null)}
                className="text-[#6B7399] hover:text-[#010619] hover:bg-[#E8EDFB] rounded-full p-1 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between py-1 border-b border-[#D8DFFA]">
                <span className="text-[#666666]">Customer:</span>
                <span className="font-bold text-[#010619]">{selectedBooking.customerName || 'Customer'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#D8DFFA]">
                <span className="text-[#666666]">Email:</span>
                <span className="font-medium text-[#010619]">{selectedBooking.customerEmail}</span>
              </div>
              {selectedBooking.customerPhone && (
                <div className="flex justify-between py-1 border-b border-[#D8DFFA]">
                  <span className="text-[#666666]">Phone:</span>
                  <span className="font-medium text-[#010619]">{selectedBooking.customerPhone}</span>
                </div>
              )}
              <div className="flex justify-between py-1 border-b border-[#D8DFFA]">
                <span className="text-[#666666]">Scheduled Time:</span>
                <span className="font-bold text-[#194DF5]">
                  {formatDate(selectedBooking.startTime)} at {formatTime(selectedBooking.startTime)}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#D8DFFA]">
                <span className="text-[#666666]">Status:</span>
                <span className="font-bold text-[#22C55E]">{selectedBooking.status}</span>
              </div>
              {selectedBooking.meetingUrl && (
                <div className="py-2">
                  <span className="text-[#666666] block mb-1">Meeting Link:</span>
                  <a
                    href={selectedBooking.meetingUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[#194DF5] underline break-all inline-flex items-center gap-1"
                  >
                    <Video className="h-3.5 w-3.5 shrink-0" />
                    {selectedBooking.meetingUrl}
                  </a>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-[#D8DFFA] flex items-center justify-between gap-2">
              {selectedBooking.status !== 'CANCELLED' && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setCancelModal({ open: true, booking: selectedBooking, reason: '' })}
                  className="bg-transparent border-[#EF4444]/30 text-[#EF4444] hover:bg-[#EF4444]/10 text-xs rounded-full"
                >
                  Cancel Booking
                </Button>
              )}
              <div className="flex items-center gap-2 ml-auto">
                {selectedBooking.status !== 'CANCELLED' && (
                  <Button
                    size="sm"
                    onClick={() => setRescheduleModal({ open: true, booking: selectedBooking, newDate: '', newTime: '' })}
                    className="bg-[#194DF5] hover:bg-[#1441D9] text-white text-xs rounded-full"
                  >
                    Reschedule
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setSelectedBooking(null)}
                  className="text-xs text-[#666666] hover:text-[#010619]"
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reschedule Modal */}
      {rescheduleModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/45">
          <div className="bg-[#FFFFFF] border border-[#D8DFFA] rounded-2xl p-6 max-w-sm w-full space-y-4 shadow-2xl text-[#010619]">
            <h4 className="text-sm font-bold text-[#010619]">Reschedule Booking</h4>
            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-[#333333] mb-1">New Date</label>
                <Input
                  type="date"
                  value={rescheduleModal.newDate}
                  onChange={e => setRescheduleModal({ ...rescheduleModal, newDate: e.target.value })}
                  className="bg-[#FFFFFF] border-[#D8DFFA] text-[#010619]"
                />
              </div>
              <div>
                <label className="block text-[#333333] mb-1">New Start Time</label>
                <Input
                  type="time"
                  value={rescheduleModal.newTime}
                  onChange={e => setRescheduleModal({ ...rescheduleModal, newTime: e.target.value })}
                  className="bg-[#FFFFFF] border-[#D8DFFA] text-[#010619]"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-[#D8DFFA]">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setRescheduleModal({ open: false, booking: null, newDate: '', newTime: '' })}
                className="text-xs text-[#666666] hover:text-[#010619]"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                disabled={actionBusy}
                onClick={handleRescheduleBooking}
                className="bg-[#194DF5] hover:bg-[#1441D9] text-white text-xs rounded-full px-4"
              >
                {actionBusy ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
                Confirm Reschedule
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Modal */}
      {cancelModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/45">
          <div className="bg-[#FFFFFF] border border-[#D8DFFA] rounded-2xl p-6 max-w-sm w-full space-y-4 shadow-2xl text-[#010619]">
            <h4 className="text-sm font-bold text-[#EF4444]">Cancel Booking</h4>
            <p className="text-xs text-[#666666]">
              Are you sure you want to cancel the session with {cancelModal.booking?.customerName || 'customer'}?
            </p>
            <Textarea
              placeholder="Reason for cancellation (optional)..."
              value={cancelModal.reason}
              onChange={e => setCancelModal({ ...cancelModal, reason: e.target.value })}
              className="bg-[#FFFFFF] border-[#D8DFFA] text-[#010619] text-xs"
              rows={3}
            />
            <div className="flex justify-end gap-2 pt-2 border-t border-[#D8DFFA]">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCancelModal({ open: false, booking: null, reason: '' })}
                className="text-xs text-[#666666] hover:text-[#010619]"
              >
                Keep Booking
              </Button>
              <Button
                size="sm"
                disabled={actionBusy}
                onClick={handleCancelBooking}
                className="bg-[#EF4444] hover:bg-[#DC2626] text-white text-xs rounded-full px-4"
              >
                {actionBusy ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
                Confirm Cancellation
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
