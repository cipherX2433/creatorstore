'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { api } from '@/lib/clientApi'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import {
  Radio, Calendar, Clock, Video, Download, Globe, CheckCircle2, XCircle, ArrowLeft, Loader2
} from 'lucide-react'

export default function CustomerWebinarsPage() {
  const [email, setEmail] = useState('')
  const [webinars, setWebinars] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('upcoming') // 'upcoming' | 'past'

  // Access state map { [productId]: { meetingUrl, instructions } }
  const [accessMap, setAccessMap] = useState({})

  useEffect(() => {
    api.get('/me')
      .then((res) => {
        if (res.user && res.user.email) {
          setEmail(res.user.email)
        } else {
          const saved = typeof window !== 'undefined' ? (localStorage.getItem('creatorzero_customer_email') || '') : ''
          setEmail(saved)
        }
      })
      .catch(() => {
        const saved = typeof window !== 'undefined' ? (localStorage.getItem('creatorzero_customer_email') || '') : ''
        setEmail(saved)
      })
  }, [])

  useEffect(() => {
    if (!email) {
      setLoading(false)
      return
    }
    fetchCustomerWebinars(email)
  }, [email])

  function fetchCustomerWebinars(custEmail) {
    setLoading(true)
    api.get(`/webinar/student/registrations?email=${encodeURIComponent(custEmail)}`)
      .then((res) => {
        const items = res.items || []
        setWebinars(items)
        setLoading(false)

        // Fetch secure meeting access for registered items
        items.forEach((item) => {
          if (item.registration?.status === 'REGISTERED' || item.registration?.status === 'ATTENDED') {
            api.get(`/webinar/registrations/${item.config.id}/access?email=${encodeURIComponent(custEmail)}`)
              .then((accRes) => {
                if (accRes.authorized) {
                  setAccessMap(prev => ({ ...prev, [item.config.id]: accRes }))
                }
              })
              .catch(() => {})
          }
        })
      })
      .catch((err) => {
        toast.error(err.message || 'Failed to load your webinars')
        setLoading(false)
      })
  }

  function handleEmailSubmit(e) {
    e.preventDefault()
    if (!email) return
    if (typeof window !== 'undefined') {
      localStorage.setItem('creatorzero_customer_email', email)
    }
    fetchCustomerWebinars(email)
  }

  async function handleCancelRegistration(registrationId) {
    if (!confirm('Are you sure you want to cancel your registration for this webinar?')) return
    try {
      await api.post(`/webinar/registrations/${registrationId}/cancel?email=${encodeURIComponent(email)}`)
      toast.success('Registration cancelled.')
      fetchCustomerWebinars(email)
    } catch (err) {
      toast.error(err.message || 'Failed to cancel registration')
    }
  }

  const nowMs = Date.now()

  const upcoming = webinars.filter((w) => {
    const endMs = new Date(w.config.endAtUTC || w.config.startAtUTC).getTime()
    return endMs > nowMs && w.registration?.status !== 'CANCELLED'
  })

  const past = webinars.filter((w) => {
    const endMs = new Date(w.config.endAtUTC || w.config.startAtUTC).getTime()
    return endMs <= nowMs || w.registration?.status === 'CANCELLED'
  })

  const displayed = activeTab === 'upcoming' ? upcoming : past

  if (!email && !loading) {
    return (
      <div className="min-h-screen bg-[#000000] flex items-center justify-center p-6 text-[#F4F2EC] font-sans">
        <div className="max-w-md w-full bg-[#12141c] p-8 rounded-3xl border border-white/10 shadow-xl space-y-5 text-center">
          <div className="h-14 w-14 bg-primary/15 text-primary rounded-2xl flex items-center justify-center mx-auto shadow-xs">
            <Radio className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-[#F4F2EC]">My Webinars & Live Events</h1>
            <p className="text-xs text-[rgba(244,242,236,0.68)] font-medium mt-1">Enter your registration email address to access your upcoming live video call links and calendar invites.</p>
          </div>

          <form onSubmit={handleEmailSubmit} className="space-y-3 pt-2 text-left">
            <div className="space-y-1">
              <label className="text-xs font-bold text-[#F4F2EC]">Registration Email</label>
              <Input
                type="email"
                required
                placeholder="your.email@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-11 text-xs rounded-xl"
              />
            </div>
            <Button type="submit" className="w-full h-11 bg-primary hover:bg-primary text-white text-xs font-extrabold rounded-xl">
              Access My Webinars
            </Button>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-6 font-sans text-[#F4F2EC]">
      
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-5">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-2xl bg-primary/15 text-primary flex items-center justify-center font-black shrink-0">
            <Radio className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-[#F4F2EC] tracking-tight">My Registered Webinars</h1>
            <p className="text-xs text-[rgba(244,242,236,0.68)] font-medium">Access live video call links, export calendar events, or manage your registrations.</p>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-[#12141c] px-3 py-1.5 rounded-full border border-white/10 text-xs font-bold text-[rgba(244,242,236,0.68)]">
          <span>Registered as: {email}</span>
        </div>
      </div>

      {/* TABS */}
      <div className="flex items-center gap-2 border-b border-white/10 pb-2">
        <button
          onClick={() => setActiveTab('upcoming')}
          className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center gap-1.5 ${
            activeTab === 'upcoming' ? 'bg-primary text-[#000000] shadow-xs' : 'text-[rgba(244,242,236,0.68)] hover:bg-[#12141c]'
          }`}
        >
          Upcoming Events ({upcoming.length})
        </button>
        <button
          onClick={() => setActiveTab('past')}
          className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center gap-1.5 ${
            activeTab === 'past' ? 'bg-primary text-[#000000] shadow-xs' : 'text-[rgba(244,242,236,0.68)] hover:bg-[#12141c]'
          }`}
        >
          Past & Cancelled ({past.length})
        </button>
      </div>

      {/* WEBINARS LIST */}
      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-48 w-full rounded-3xl" />
          <Skeleton className="h-48 w-full rounded-3xl" />
        </div>
      ) : displayed.length === 0 ? (
        <div className="bg-[#12141c] rounded-3xl p-12 border border-dashed border-white/10 text-center space-y-2">
          <Radio className="h-10 w-10 text-slate-300 mx-auto" />
          <h3 className="text-base font-extrabold text-[#F4F2EC]">No {activeTab} webinars found</h3>
          <p className="text-xs text-[rgba(244,242,236,0.68)] font-medium">When you register for live webinars, your event passes and call links will appear here.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {displayed.map((item) => {
            const { registration, config, product } = item
            const access = accessMap[config.id]
            const startObj = new Date(config.startAtUTC)
            const endObj = new Date(config.endAtUTC || (startObj.getTime() + (config.durationMinutes || 90) * 60000))
            const formattedDate = startObj.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
            const formattedTime = startObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

            const formatCalTime = (d) => d.toISOString().replace(/-|:|\.\d+/g, '')
            const gcalUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(config.title)}&dates=${formatCalTime(startObj)}/${formatCalTime(endObj)}&details=${encodeURIComponent(config.title)}`
            const icsData = `BEGIN:VCALENDAR\r\nVERSION:2.0\r\nBEGIN:VEVENT\r\nSUMMARY:${config.title}\r\nDTSTART:${formatCalTime(startObj)}\r\nDTEND:${formatCalTime(endObj)}\r\nEND:VEVENT\r\nEND:VCALENDAR`
            const icsDataUrl = `data:text/calendar;charset=utf8,${encodeURIComponent(icsData)}`

            return (
              <div key={registration.id} className="bg-[#12141c] rounded-3xl p-6 border border-white/10 shadow-sm space-y-4">
                
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
                  <div className="flex items-center gap-3">
                    {product.thumbnail ? (
                      <img src={product.thumbnail} alt="" className="h-12 w-12 rounded-2xl object-cover shrink-0" />
                    ) : (
                      <div className="h-12 w-12 rounded-2xl bg-primary/15 text-primary flex items-center justify-center font-black text-lg shrink-0">
                        <Radio className="h-6 w-6" />
                      </div>
                    )}
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                          registration.status === 'ATTENDED' ? 'bg-emerald-100 text-emerald-800' : registration.status === 'REGISTERED' ? 'bg-primary/15 text-primary' : 'bg-red-100 text-red-800'
                        }`}>
                          {registration.status}
                        </span>
                      </div>
                      <h3 className="font-extrabold text-base text-[#F4F2EC] mt-0.5">{config.title}</h3>
                    </div>
                  </div>

                  {registration.status === 'REGISTERED' && activeTab === 'upcoming' && (
                    <button
                      onClick={() => handleCancelRegistration(registration.id)}
                      className="text-xs font-bold text-red-500 hover:text-red-700"
                    >
                      Cancel Registration
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-[#12141c] p-4 rounded-2xl border border-white/10">
                  <div className="space-y-0.5">
                    <span className="text-[rgba(244,242,236,0.5)] font-bold flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5 text-primary" /> Date & Time
                    </span>
                    <div className="font-extrabold text-[#F4F2EC]">{formattedDate} • {formattedTime} ({config.timezone})</div>
                  </div>

                  <div className="space-y-0.5">
                    <span className="text-[rgba(244,242,236,0.5)] font-bold flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5 text-primary" /> Duration
                    </span>
                    <div className="font-extrabold text-[#F4F2EC]">{config.durationMinutes} Minutes</div>
                  </div>
                </div>

                {/* Meeting Access & Links */}
                {access?.meetingUrl && (
                  <div className="pt-2 space-y-3">
                    <a href={access.meetingUrl} target="_blank" rel="noreferrer">
                      <Button className="w-full h-12 bg-primary hover:bg-primary text-white font-extrabold text-xs rounded-xl shadow-md gap-2">
                        <Video className="h-4 w-4" /> Join Live Video Call Now
                      </Button>
                    </a>

                    {access.meetingInstructions && (
                      <p className="text-xs text-[rgba(244,242,236,0.68)] font-medium italic bg-primary/10 p-3 rounded-xl border border-primary/20">
                        "{access.meetingInstructions}"
                      </p>
                    )}
                  </div>
                )}

                {/* Calendar Exports */}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <a href={gcalUrl} target="_blank" rel="noreferrer">
                    <Button variant="outline" size="sm" className="w-full text-xs font-bold rounded-xl gap-1">
                      <Calendar className="h-3.5 w-3.5 text-primary" /> Google Calendar
                    </Button>
                  </a>
                  <a href={icsDataUrl} download="webinar-event.ics">
                    <Button variant="outline" size="sm" className="w-full text-xs font-bold rounded-xl gap-1">
                      <Download className="h-3.5 w-3.5" /> Download .ICS
                    </Button>
                  </a>
                </div>

              </div>
            )
          })}
        </div>
      )}

    </div>
  )
}
