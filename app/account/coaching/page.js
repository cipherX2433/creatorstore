'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { api } from '@/lib/clientApi'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import {
  Video, Calendar, Clock, ArrowRight, CheckCircle2, XCircle, RefreshCw, Loader2
} from 'lucide-react'

export default function CustomerCoachingPage() {
  const [email, setEmail] = useState('')
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)

  const [rescheduleBooking, setRescheduleBooking] = useState(null)
  const [newDate, setNewDate] = useState('')
  const [newStartTime, setNewStartTime] = useState('')
  const [newEndTime, setNewEndTime] = useState('')
  const [rescheduling, setRescheduling] = useState(false)

  const [cancelBooking, setCancelBooking] = useState(null)
  const [cancelReason, setCancelReason] = useState('')
  const [cancelling, setCancelling] = useState(false)

  useEffect(() => {
    api.get('/me')
      .then((res) => {
        if (res.user && res.user.email) {
          setEmail(res.user.email)
          fetchBookings(res.user.email)
        } else {
          const savedEmail = typeof window !== 'undefined' ? (localStorage.getItem('creatorzero_customer_email') || '') : ''
          setEmail(savedEmail)
          if (savedEmail) fetchBookings(savedEmail)
          else setLoading(false)
        }
      })
      .catch(() => {
        const savedEmail = typeof window !== 'undefined' ? (localStorage.getItem('creatorzero_customer_email') || '') : ''
        setEmail(savedEmail)
        if (savedEmail) fetchBookings(savedEmail)
        else setLoading(false)
      })
  }, [])

  function fetchBookings(custEmail) {
    setLoading(true)
    api.get(`/coaching/student/bookings?email=${encodeURIComponent(custEmail)}`)
      .then((res) => {
        setBookings(res.bookings || [])
        setLoading(false)
      })
      .catch(() => {
        setBookings([])
        setLoading(false)
      })
  }

  function handleSearchByEmail(e) {
    e.preventDefault()
    if (!email) return
    if (typeof window !== 'undefined') {
      localStorage.setItem('creatorzero_customer_email', email)
    }
    fetchBookings(email)
  }

  async function handleConfirmReschedule(e) {
    e.preventDefault()
    if (!rescheduleBooking || !newStartTime || !newEndTime) return
    setRescheduling(true)
    try {
      await api.post(`/coaching/bookings/${rescheduleBooking.id}/reschedule`, {
        customerEmail: email,
        newStartTime,
        newEndTime,
      })
      toast.success('Session rescheduled successfully!')
      setRescheduleBooking(null)
      fetchBookings(email)
    } catch (err) {
      toast.error(err.message || 'Failed to reschedule session')
    } finally {
      setRescheduling(false)
    }
  }

  async function handleConfirmCancel(e) {
    e.preventDefault()
    if (!cancelBooking) return
    setCancelling(true)
    try {
      await api.post(`/coaching/bookings/${cancelBooking.id}/cancel`, {
        customerEmail: email,
        reason: cancelReason,
      })
      toast.success('Session cancelled.')
      setCancelBooking(null)
      fetchBookings(email)
    } catch (err) {
      toast.error(err.message || 'Failed to cancel session')
    } finally {
      setCancelling(false)
    }
  }

  const upcomingBookings = bookings.filter(b => b.status === 'CONFIRMED' || b.status === 'PENDING' || b.status === 'RESCHEDULED')
  const pastBookings = bookings.filter(b => b.status === 'COMPLETED' || b.status === 'CANCELLED')

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-5">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-[#F4F2EC]">My Coaching Sessions</h1>
          <p className="text-xs text-[rgba(244,242,236,0.68)] font-medium">Manage all your booked 1:1 coaching calls, join video calls, reschedule or cancel.</p>
        </div>

        {/* Email Lookup Filter */}
        <form onSubmit={handleSearchByEmail} className="flex items-center gap-2">
          <Input
            type="email"
            placeholder="Your Email Address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-10 text-xs font-medium rounded-xl border-white/10 w-56"
          />
          <Button size="sm" type="submit" className="bg-primary hover:bg-primary text-white text-xs font-bold rounded-xl">
            Lookup Bookings
          </Button>
        </form>
      </div>

      {loading ? (
        <div className="space-y-4">{Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-44 w-full rounded-3xl" />)}</div>
      ) : !email ? (
        <div className="rounded-3xl border border-dashed border-white/10 bg-[#12141c] p-12 text-center space-y-3">
          <Video className="h-10 w-10 text-slate-300 mx-auto" />
          <h3 className="text-base font-extrabold text-[#F4F2EC]">Enter Your Customer Email</h3>
          <p className="text-xs text-[rgba(244,242,236,0.68)] max-w-sm mx-auto">Enter the email address you used during purchase to view your upcoming 1:1 coaching sessions.</p>
        </div>
      ) : (
        <div className="space-y-8">
          
          {/* UPCOMING SESSIONS */}
          <div className="space-y-4">
            <h2 className="text-base font-black text-[#F4F2EC] flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" /> Upcoming Sessions
            </h2>

            {upcomingBookings.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-white/10 bg-[#12141c] p-8 text-center space-y-2">
                <p className="text-xs text-[rgba(244,242,236,0.68)] font-medium">No upcoming sessions found for {email}.</p>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-1">
                {upcomingBookings.map((b) => {
                  const dateStr = new Date(b.startTime).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
                  const timeStr = `${new Date(b.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${new Date(b.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`

                  return (
                    <div key={b.id} className="bg-[#12141c] rounded-3xl p-6 border border-white/10/90 shadow-sm flex flex-wrap items-center justify-between gap-4">
                      <div className="space-y-2 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-primary/15 text-primary">{b.status}</span>
                          <span className="text-xs font-bold text-[rgba(244,242,236,0.5)]">{b.timezone}</span>
                        </div>
                        <h3 className="font-extrabold text-lg text-[#F4F2EC]">1:1 Coaching Call</h3>
                        <p className="text-xs font-bold text-[#F4F2EC] flex items-center gap-1.5">
                          <Calendar className="h-4 w-4 text-primary" /> {dateStr} • {timeStr}
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        {b.meetingUrl && (
                          <a href={b.meetingUrl} target="_blank" rel="noreferrer">
                            <Button size="sm" className="bg-primary hover:bg-primary text-white font-extrabold text-xs rounded-xl shadow-xs gap-1">
                              <Video className="h-3.5 w-3.5" /> Join Session
                            </Button>
                          </a>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setRescheduleBooking(b)
                            const startIso = new Date(b.startTime).toISOString().slice(0, 16)
                            const endIso = new Date(b.endTime).toISOString().slice(0, 16)
                            setNewStartTime(startIso)
                            setNewEndTime(endIso)
                          }}
                          className="font-bold text-xs rounded-xl"
                        >
                          Reschedule
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCancelBooking(b)}
                          className="font-bold text-xs rounded-xl text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* PAST SESSIONS */}
          {pastBookings.length > 0 && (
            <div className="space-y-4 pt-4 border-t border-white/10">
              <h2 className="text-base font-black text-[rgba(244,242,236,0.68)]">Past & Cancelled Sessions</h2>
              <div className="divide-y divide-slate-100 bg-[#12141c] rounded-3xl border border-white/10 overflow-hidden">
                {pastBookings.map((b) => (
                  <div key={b.id} className="p-4 flex items-center justify-between text-xs">
                    <div className="space-y-0.5">
                      <div className="font-bold text-[#F4F2EC]">1:1 Coaching Call</div>
                      <div className="text-[rgba(244,242,236,0.5)]">{new Date(b.startTime).toLocaleString()}</div>
                    </div>
                    <span className={`px-2.5 py-1 rounded-full font-extrabold text-[10px] ${b.status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                      {b.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      )}

      {/* RESCHEDULE MODAL */}
      {rescheduleBooking && (
        <div className="fixed inset-0 z-50 bg-[#0A0A0A] flex items-center justify-center p-4">
          <form onSubmit={handleConfirmReschedule} className="bg-[#12141c] rounded-3xl max-w-md w-full p-6 sm:p-8 space-y-5 shadow-2xl">
            <h2 className="text-xl font-black text-[#F4F2EC]">Reschedule Session</h2>
            <p className="text-xs text-[rgba(244,242,236,0.68)] font-medium">Select a new date & time slot for your coaching session.</p>

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-[#F4F2EC]">New Start Time</label>
                <Input
                  type="datetime-local"
                  required
                  value={newStartTime}
                  onChange={(e) => setNewStartTime(e.target.value)}
                  className="h-11 rounded-xl text-xs font-bold"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-[#F4F2EC]">New End Time</label>
                <Input
                  type="datetime-local"
                  required
                  value={newEndTime}
                  onChange={(e) => setNewEndTime(e.target.value)}
                  className="h-11 rounded-xl text-xs font-bold"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setRescheduleBooking(null)} className="rounded-xl font-bold text-xs">
                Cancel
              </Button>
              <Button type="submit" disabled={rescheduling} className="bg-primary hover:bg-primary text-white font-extrabold text-xs rounded-xl shadow-xs">
                {rescheduling ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Confirm Reschedule'}
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* CANCEL MODAL */}
      {cancelBooking && (
        <div className="fixed inset-0 z-50 bg-[#0A0A0A] flex items-center justify-center p-4">
          <form onSubmit={handleConfirmCancel} className="bg-[#12141c] rounded-3xl max-w-md w-full p-6 sm:p-8 space-y-5 shadow-2xl">
            <h2 className="text-xl font-black text-[#F4F2EC]">Cancel Session</h2>
            <p className="text-xs text-[rgba(244,242,236,0.68)] font-medium">Are you sure you want to cancel this session? You can cancel up to 24 hours before start time.</p>

            <div className="space-y-1">
              <label className="text-xs font-bold text-[#F4F2EC]">Reason for cancellation (optional)</label>
              <Input
                placeholder="Reason..."
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="h-11 rounded-xl text-xs font-medium"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setCancelBooking(null)} className="rounded-xl font-bold text-xs">
                Back
              </Button>
              <Button type="submit" disabled={cancelling} className="bg-red-600 hover:bg-red-700 text-white font-extrabold text-xs rounded-xl shadow-xs">
                {cancelling ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Confirm Cancellation'}
              </Button>
            </div>
          </form>
        </div>
      )}

    </div>
  )
}
