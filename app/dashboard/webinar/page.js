'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { api, formatMoney } from '@/lib/clientApi'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import {
  Radio, Users, Calendar as CalendarIcon, Clock, Plus, Search, CheckCircle2,
  XCircle, Video, Ban, AlertCircle, Eye, ExternalLink
} from 'lucide-react'

export default function CreatorWebinarDashboard() {
  const [products, setProducts] = useState([])
  const [selectedProductId, setSelectedProductId] = useState('')
  const [config, setConfig] = useState(null)
  const [attendees, setAttendees] = useState([])
  const [totalAttendees, setTotalAttendees] = useState(0)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')

  // Selected Attendee modal state
  const [selectedAttendee, setSelectedAttendee] = useState(null)

  useEffect(() => {
    loadWebinarProducts()
  }, [])

  function loadWebinarProducts() {
    setLoading(true)
    api.get('/products')
      .then((res) => {
        const webProds = (res.products || []).filter(p => p.type === 'WEBINAR')
        setProducts(webProds)
        if (webProds.length > 0) {
          setSelectedProductId(webProds[0].id)
          fetchWebinarData(webProds[0].id)
        } else {
          setLoading(false)
        }
      })
      .catch(() => setLoading(false))
  }

  function fetchWebinarData(prodId) {
    setLoading(true)
    Promise.all([
      api.get(`/webinar/config/${prodId}`),
      api.get(`/webinar/creator/attendees?productId=${prodId}`),
    ]).then(([confRes, attRes]) => {
      setConfig(confRes.config)
      setAttendees(attRes.items || [])
      setTotalAttendees(attRes.total || 0)
      setLoading(false)
    }).catch(() => setLoading(false))
  }

  async function handleMarkAttendance(registrationId, status) {
    try {
      await api.post('/webinar/creator/attendance', { registrationId, status })
      toast.success(`Attendance updated to ${status}`)
      fetchWebinarData(selectedProductId)
    } catch (err) {
      toast.error(err.message || 'Failed to update attendance')
    }
  }

  async function handleCancelWebinar() {
    if (!selectedProductId) return
    const reason = prompt('Reason for cancelling this webinar (sent to attendees):', 'Event rescheduled by host.')
    if (reason === null) return
    try {
      await api.post('/webinar/creator/cancel', { productId: selectedProductId, reason })
      toast.success('Webinar cancelled and attendees notified.')
      fetchWebinarData(selectedProductId)
    } catch (err) {
      toast.error(err.message || 'Failed to cancel webinar')
    }
  }

  const filteredAttendees = attendees.filter((a) => {
    const matchesStatus = statusFilter === 'ALL' || a.status === statusFilter
    const matchesSearch = (a.customerName || '').toLowerCase().includes(search.toLowerCase()) ||
                          (a.customerEmail || '').toLowerCase().includes(search.toLowerCase())
    return matchesStatus && matchesSearch
  })

  return (
    <div className="space-y-8 font-sans text-[#010619]">
      
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#D8DFFA] pb-5">
        <div>
          <h1 className="text-3xl font-bold text-[#010619] tracking-tight flex items-center gap-2">
            <Radio className="h-7 w-7 text-primary" /> Webinar Events & Attendees
          </h1>
          <p className="text-sm text-[#666666] font-medium">Manage live online events, view intake questions, export calendar invites, and track attendance.</p>
        </div>

        <div className="flex items-center gap-3">
          {products.length > 1 && (
            <select
              value={selectedProductId}
              onChange={(e) => { setSelectedProductId(e.target.value); fetchWebinarData(e.target.value) }}
              className="h-10 rounded-xl border border-[#D8DFFA] text-xs font-semibold px-3 bg-white text-[#010619] focus:outline-none focus:ring-1 focus:ring-primary"
            >
              {products.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
            </select>
          )}

          <Link href="/dashboard/products/new">
            <Button className="bg-primary hover:bg-primary/90 text-white font-bold text-xs rounded-xl shadow-xs gap-1.5 cursor-pointer">
              <Plus className="h-4 w-4" /> Create Webinar
            </Button>
          </Link>
        </div>
      </div>

      {products.length === 0 && !loading ? (
        <div className="rounded-2xl border border-dashed border-[#D8DFFA] bg-white p-12 text-center space-y-3 shadow-xs">
          <Radio className="h-10 w-10 text-[#666666] mx-auto" />
          <h3 className="text-base font-bold text-[#010619]">No Webinars Created Yet</h3>
          <p className="text-xs text-[#666666] max-w-sm mx-auto">Host live interactive online events, sell access, and collect attendee registration answers.</p>
          <div className="pt-2">
            <Link href="/dashboard/products/new">
              <Button className="bg-primary hover:bg-primary/90 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer">
                Create Webinar
              </Button>
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          
          {/* WEBINAR OVERVIEW CARD */}
          {config && (
            <div className="bg-white p-6 sm:p-8 rounded-2xl border border-[#D8DFFA] shadow-xs space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#D8DFFA] pb-5">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase bg-primary/10 text-primary px-2.5 py-0.5 rounded-full">
                      LIVE WEBINAR
                    </span>
                    <span className={`text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full ${
                      config.status === 'PUBLISHED' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : config.status === 'CANCELLED' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-[#EEF1FB] text-[#010619] border border-[#D8DFFA]'
                    }`}>
                      STATUS: {config.status}
                    </span>
                  </div>
                  <h2 className="text-xl font-bold text-[#010619] mt-1">{config.title}</h2>
                  <p className="text-xs text-[#666666] font-medium">{config.shortDescription}</p>
                </div>

                <div className="flex items-center gap-2">
                  {config.status !== 'CANCELLED' && (
                    <Button variant="outline" size="sm" onClick={handleCancelWebinar} className="text-red-600 hover:bg-red-50 text-xs font-semibold rounded-xl border-red-200 bg-white">
                      Cancel Webinar
                    </Button>
                  )}
                  {config.meetingUrl && (
                    <a href={config.meetingUrl} target="_blank" rel="noreferrer">
                      <Button className="bg-primary hover:bg-primary/90 text-white text-xs font-bold rounded-xl shadow-xs gap-1.5 cursor-pointer">
                        <Video className="h-4 w-4" /> Start Call
                      </Button>
                    </a>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                <div className="bg-[#EEF1FB] p-4 rounded-xl border border-[#D8DFFA]">
                  <span className="text-[#666666] font-semibold">Start Time</span>
                  <div className="font-bold text-[#010619] mt-1">
                    {new Date(config.startAtUTC).toLocaleDateString()} {new Date(config.startAtUTC).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                  <div className="text-[11px] text-[#666666] font-medium">{config.timezone}</div>
                </div>

                <div className="bg-[#EEF1FB] p-4 rounded-xl border border-[#D8DFFA]">
                  <span className="text-[#666666] font-semibold">Duration & Price</span>
                  <div className="font-bold text-primary mt-1 text-sm">
                    {config.isFree ? 'FREE' : formatMoney(config.price, config.currency)}
                  </div>
                  <div className="text-[11px] text-[#666666] font-medium">{config.durationMinutes} minutes</div>
                </div>

                <div className="bg-[#EEF1FB] p-4 rounded-xl border border-[#D8DFFA]">
                  <span className="text-[#666666] font-semibold">Registrations / Capacity</span>
                  <div className="font-bold text-[#010619] mt-1 text-sm">
                    {totalAttendees} / {config.capacity || '∞'}
                  </div>
                  <div className="text-[11px] text-[#666666] font-medium">Total Confirmed</div>
                </div>

                <div className="bg-[#EEF1FB] p-4 rounded-xl border border-[#D8DFFA]">
                  <span className="text-[#666666] font-semibold">Registration Questions</span>
                  <div className="font-bold text-[#010619] mt-1 text-sm">
                    {config.questions?.length || 0} Questions
                  </div>
                  <div className="text-[11px] text-[#666666] font-medium">Intake Required</div>
                </div>
              </div>
            </div>
          )}

          {/* ATTENDEE MANAGEMENT TABLE */}
          <div className="bg-white rounded-2xl p-6 border border-[#D8DFFA] shadow-xs space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#D8DFFA] pb-4">
              <div>
                <h2 className="text-base font-bold text-[#010619]">Attendee Roster</h2>
                <p className="text-xs text-[#666666] font-medium">Search registered attendees, view questionnaire responses, and mark attendance.</p>
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="h-10 rounded-xl border border-[#D8DFFA] text-xs font-semibold px-3 bg-white text-[#010619] focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="REGISTERED">Registered</option>
                  <option value="ATTENDED">Attended</option>
                  <option value="NO_SHOW">No Show</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>

                <div className="relative w-56">
                  <Search className="h-4 w-4 text-[#666666] absolute left-3 top-3" />
                  <Input
                    placeholder="Search attendee..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="h-10 pl-9 rounded-xl text-xs font-medium border-[#D8DFFA] bg-white text-[#010619]"
                  />
                </div>
              </div>
            </div>

            {loading ? (
              <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 w-full rounded-xl" />)}</div>
            ) : filteredAttendees.length === 0 ? (
              <div className="py-8 text-center text-xs text-[#666666] font-medium">No attendees found.</div>
            ) : (
              <div className="divide-y divide-[#D8DFFA] overflow-x-auto">
                {filteredAttendees.map((att) => (
                  <div key={att.id} className="py-3 flex items-center justify-between gap-4 text-xs">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold uppercase shrink-0">
                        {(att.customerName || att.customerEmail || 'A')[0]}
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-[#010619] truncate">{att.customerName}</div>
                        <div className="text-[#666666] text-[11px]">{att.customerEmail}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {att.answers?.length > 0 && (
                        <button
                          onClick={() => setSelectedAttendee(att)}
                          className="text-[11px] font-semibold text-primary hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <Eye className="h-3.5 w-3.5" /> View Answers ({att.answers.length})
                        </button>
                      )}

                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        att.status === 'ATTENDED' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : att.status === 'REGISTERED' ? 'bg-primary/10 text-primary border border-primary/20' : 'bg-red-50 text-red-700 border border-red-200'
                      }`}>
                        {att.status}
                      </span>

                      {att.status !== 'CANCELLED' && (
                        <div className="flex items-center gap-1">
                          {att.status !== 'ATTENDED' ? (
                            <Button size="sm" variant="outline" onClick={() => handleMarkAttendance(att.id, 'ATTENDED')} className="h-8 text-[11px] font-semibold rounded-lg text-emerald-700 border-emerald-200 bg-white hover:bg-emerald-50">
                              Mark Attended
                            </Button>
                          ) : (
                            <Button size="sm" variant="outline" onClick={() => handleMarkAttendance(att.id, 'NO_SHOW')} className="h-8 text-[11px] font-semibold rounded-lg text-amber-700 border-amber-200 bg-white hover:bg-amber-50">
                              Mark No-Show
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      )}

      {/* ATTENDEE ANSWERS MODAL */}
      {selectedAttendee && (
        <div className="fixed inset-0 bg-black/45 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 border border-[#D8DFFA] shadow-xl">
            <div className="flex items-center justify-between border-b border-[#D8DFFA] pb-3">
              <div>
                <h3 className="font-bold text-[#010619] text-base">{selectedAttendee.customerName}</h3>
                <p className="text-xs text-[#666666] font-medium">{selectedAttendee.customerEmail}</p>
              </div>
              <button onClick={() => setSelectedAttendee(null)} className="text-[#666666] hover:text-[#010619] text-lg font-bold cursor-pointer">✕</button>
            </div>

            <div className="space-y-3">
              <span className="text-xs font-bold uppercase text-[#666666]">Intake Questionnaire Responses</span>
              {selectedAttendee.answers?.map((ans, i) => (
                <div key={i} className="p-3 bg-[#EEF1FB] rounded-xl border border-[#D8DFFA] text-xs space-y-1">
                  <div className="font-bold text-[#010619]">{ans.questionText || `Question #${i + 1}`}</div>
                  <div className="text-[#010619] font-medium">{ans.answer || '(No response)'}</div>
                </div>
              ))}
            </div>

            <div className="pt-2 text-right">
              <Button size="sm" variant="outline" onClick={() => setSelectedAttendee(null)} className="rounded-xl text-xs font-medium border-[#D8DFFA] bg-white hover:bg-[#E8EDFB] text-[#010619]">
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
