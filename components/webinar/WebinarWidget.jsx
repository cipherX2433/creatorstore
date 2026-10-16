'use client'

import { useEffect, useState } from 'react'
import { api, formatMoney } from '@/lib/clientApi'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import {
  Radio, Calendar, Clock, Globe, Users, Check, Lock, Video, Download,
  CheckCircle2, ArrowRight, MapPin, Sparkles, FileText, UserCheck, Play,
  Share2, ChevronDown, ExternalLink
} from 'lucide-react'

const COMMON_TIMEZONES = [
  { value: 'Asia/Kolkata', label: 'India Standard Time (IST)' },
  { value: 'UTC', label: 'Coordinated Universal Time (UTC)' },
  { value: 'America/New_York', label: 'Eastern Time (EST/EDT)' },
  { value: 'America/Chicago', label: 'Central Time (CST/CDT)' },
  { value: 'America/Denver', label: 'Mountain Time (MST/MDT)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PST/PDT)' },
  { value: 'Europe/London', label: 'UK Time (GMT/BST)' },
  { value: 'Europe/Paris', label: 'Central European Time (CET)' },
  { value: 'Asia/Dubai', label: 'Gulf Standard Time (GST)' },
  { value: 'Asia/Singapore', label: 'Singapore Time (SGT)' },
  { value: 'Australia/Sydney', label: 'Australian Eastern Time (AEST)' },
]

export default function WebinarWidget({ productId, onRegistered }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  // Customer selected timezone
  const [selectedTimezone, setSelectedTimezone] = useState('Asia/Kolkata')

  // Registration Form State
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [answers, setAnswers] = useState({})
  const [registering, setRegistering] = useState(false)
  const [isRegistered, setIsRegistered] = useState(false)
  const [accessData, setAccessData] = useState(null)

  // Countdown timer state
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0, expired: false, isLive: false })

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedEmail = localStorage.getItem('creatorzero_customer_email') || ''
      if (savedEmail) setEmail(savedEmail)
      const userTz = Intl.DateTimeFormat().resolvedOptions().timeZone
      if (userTz) setSelectedTimezone(userTz)
    }
  }, [])

  useEffect(() => {
    if (!productId) return
    let mounted = true
    api.get(`/webinar/public/${productId}`)
      .then((res) => {
        if (mounted) {
          setData(res)
          if (res.config?.timezone) {
            // Keep user detected timezone or fall back to event timezone
          }
          setLoading(false)
        }
      })
      .catch(() => { if (mounted) setLoading(false) })
    return () => { mounted = false }
  }, [productId])

  useEffect(() => {
    if (!productId || !email) return
    api.get(`/webinar/access/${productId}?email=${encodeURIComponent(email)}`)
      .then((res) => {
        if (res.authorized) {
          setIsRegistered(true)
          setAccessData(res)
        }
      })
      .catch(() => {})
  }, [productId, email])

  // Realtime Countdown Timer Effect
  useEffect(() => {
    if (!data?.config?.startAtUTC) return

    const updateTimer = () => {
      const now = Date.now()
      const start = new Date(data.config.startAtUTC).getTime()
      const end = new Date(data.config.endAtUTC || (start + (data.config.durationMinutes || 90) * 60000)).getTime()

      if (now >= start && now <= end) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, expired: false, isLive: true })
        return
      }

      const diff = start - now
      if (diff <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, expired: true, isLive: false })
        return
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24))
      const hours = Math.floor((diff / (1000 * 60 * 60)) % 24)
      const minutes = Math.floor((diff / 1000 / 60) % 60)
      const seconds = Math.floor((diff / 1000) % 60)

      setTimeLeft({ days, hours, minutes, seconds, expired: false, isLive: false })
    }

    updateTimer()
    const timer = setInterval(updateTimer, 1000)
    return () => clearInterval(timer)
  }, [data])

  if (loading || !data?.config) return null

  const { config, totalRegistrations, isFull, isRegistrationClosed, hasEnded, creator } = data

  // Format date & time according to customer's selected timezone
  const getFormattedDateTime = () => {
    try {
      const d = new Date(config.startAtUTC)
      const dateStr = d.toLocaleDateString('en-US', {
        timeZone: selectedTimezone,
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      })
      const timeStr = d.toLocaleTimeString('en-US', {
        timeZone: selectedTimezone,
        hour: '2-digit',
        minute: '2-digit'
      })
      return { dateStr, timeStr }
    } catch (e) {
      const d = new Date(config.startAtUTC)
      return {
        dateStr: d.toLocaleDateString(),
        timeStr: d.toLocaleTimeString()
      }
    }
  }

  const { dateStr, timeStr } = getFormattedDateTime()

  // Calendar Export Helpers
  const startObj = new Date(config.startAtUTC)
  const endObj = new Date(config.endAtUTC || (startObj.getTime() + (config.durationMinutes || 90) * 60000))
  const formatCalTime = (d) => d.toISOString().replace(/-|:|\.\d+/g, '')
  const gcalUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(config.title)}&dates=${formatCalTime(startObj)}/${formatCalTime(endObj)}&details=${encodeURIComponent(config.shortDescription || config.title)}`
  
  const icsData = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'BEGIN:VEVENT',
    `SUMMARY:${config.title}`,
    `DESCRIPTION:${config.shortDescription || config.title}`,
    `DTSTART:${formatCalTime(startObj)}`,
    `DTEND:${formatCalTime(endObj)}`,
    'END:VCALENDAR'
  ].join('\r\n')
  const icsDataUrl = `data:text/calendar;charset=utf8,${encodeURIComponent(icsData)}`

  async function handleFreeRegistration(e) {
    e.preventDefault()
    if (!email) {
      toast.error('Please enter your email address.')
      return
    }

    const answerPayload = (config.questions || []).map(q => ({
      questionId: q.id,
      questionText: q.question,
      answer: answers[q.id] || '',
    }))

    setRegistering(true)
    try {
      const res = await api.post('/webinar/register-free', {
        productId,
        name: name || email.split('@')[0],
        email,
        answers: answerPayload,
      })
      if (typeof window !== 'undefined') {
        localStorage.setItem('creatorzero_customer_email', email)
      }
      toast.success("You're registered for this live webinar! 🎉")
      setIsRegistered(true)
      const acc = await api.get(`/webinar/access/${productId}?email=${encodeURIComponent(email)}`)
      setAccessData(acc)
      if (onRegistered) onRegistered(res.registration)
    } catch (err) {
      toast.error(err.message || 'Registration failed')
    } finally {
      setRegistering(false)
    }
  }

  return (
    <div className="bg-[#12141c] text-white rounded-3xl p-6 sm:p-8 border border-white/10 shadow-2xl space-y-8 font-sans">
      
      {/* Event Header & Badges */}
      <div className="space-y-4 border-b border-white/10 pb-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {timeLeft.isLive ? (
              <span className="text-xs font-black uppercase bg-[#F0441E] text-white px-3 py-1 rounded-full flex items-center gap-1.5 animate-pulse">
                <Radio className="h-4 w-4" /> LIVE NOW
              </span>
            ) : (
              <span className="text-xs font-black uppercase bg-primary text-[#000000] px-3 py-1 rounded-full flex items-center gap-1.5">
                <Radio className="h-3.5 w-3.5" /> LIVE ONLINE WEBINAR
              </span>
            )}
            <span className="text-xs text-[rgba(244,242,236,0.68)] font-bold border-l border-white/10 pl-3">
              {config.category || 'Masterclass'}
            </span>
          </div>

          <div className="flex items-center gap-2 bg-[#000000] px-3.5 py-1.5 rounded-full border border-white/10 text-xs font-bold text-white">
            <Users className="h-4 w-4 text-[#CBE957]" />
            <span>{totalRegistrations} / {config.capacity || '∞'} Registrations</span>
          </div>
        </div>

        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight leading-tight">
          {config.title}
        </h1>

        {config.shortDescription && (
          <p className="text-sm text-[rgba(244,242,236,0.68)] leading-relaxed max-w-3xl">
            {config.shortDescription}
          </p>
        )}
      </div>

      {/* Countdown Timer Banner (Only if event is in the future) */}
      {!timeLeft.expired && !timeLeft.isLive && (
        <div className="bg-[#000000] border border-white/10 rounded-2xl p-5 text-center space-y-3">
          <div className="text-xs font-bold text-[rgba(244,242,236,0.68)] uppercase tracking-wider flex items-center justify-center gap-1.5">
            <Clock className="w-4 h-4 text-primary" /> Event Starts In
          </div>
          <div className="grid grid-cols-4 gap-2 max-w-sm mx-auto">
            <div className="bg-[#12141c] border border-white/10 p-2.5 rounded-xl">
              <div className="text-xl sm:text-2xl font-black text-primary">{timeLeft.days}</div>
              <div className="text-[10px] text-[rgba(244,242,236,0.68)] font-bold uppercase">Days</div>
            </div>
            <div className="bg-[#12141c] border border-white/10 p-2.5 rounded-xl">
              <div className="text-xl sm:text-2xl font-black text-[#CBE957]">{timeLeft.hours}</div>
              <div className="text-[10px] text-[rgba(244,242,236,0.68)] font-bold uppercase">Hours</div>
            </div>
            <div className="bg-[#12141c] border border-white/10 p-2.5 rounded-xl">
              <div className="text-xl sm:text-2xl font-black text-[#60A5FA]">{timeLeft.minutes}</div>
              <div className="text-[10px] text-[rgba(244,242,236,0.68)] font-bold uppercase">Mins</div>
            </div>
            <div className="bg-[#12141c] border border-white/10 p-2.5 rounded-xl">
              <div className="text-xl sm:text-2xl font-black text-[#F0441E]">{timeLeft.seconds}</div>
              <div className="text-[10px] text-[rgba(244,242,236,0.68)] font-bold uppercase">Secs</div>
            </div>
          </div>
        </div>
      )}

      {/* Schedule Info & Timezone Selector */}
      <div className="bg-[#000000] p-5 rounded-2xl border border-white/10 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div className="space-y-1">
            <div className="text-[rgba(244,242,236,0.68)] font-semibold flex items-center gap-1.5">
              <Calendar className="h-4 w-4 text-primary" /> Event Date
            </div>
            <div className="font-bold text-white text-sm">{dateStr}</div>
          </div>

          <div className="space-y-1">
            <div className="text-[rgba(244,242,236,0.68)] font-semibold flex items-center gap-1.5">
              <Clock className="h-4 w-4 text-[#CBE957]" /> Time & Duration
            </div>
            <div className="font-bold text-white text-sm">{timeStr} ({config.durationMinutes || 90} mins)</div>
          </div>

          <div className="space-y-1">
            <div className="text-[rgba(244,242,236,0.68)] font-semibold flex items-center gap-1.5">
              <Globe className="h-4 w-4 text-[#60A5FA]" /> Access Fee
            </div>
            <div className="font-bold text-primary text-sm uppercase">
              {config.isFree ? 'FREE REGISTRATION' : formatMoney(config.price, config.currency)}
            </div>
          </div>
        </div>

        {/* Customer Timezone Picker */}
        <div className="pt-3 border-t border-white/10/60 flex items-center justify-between gap-4 text-xs">
          <span className="text-[rgba(244,242,236,0.68)] font-semibold flex items-center gap-1.5">
            <Globe className="w-3.5 h-3.5 text-[#CBE957]" /> Times displayed in:
          </span>
          <select
            value={selectedTimezone}
            onChange={(e) => setSelectedTimezone(e.target.value)}
            className="bg-[#12141c] border border-white/10 text-white text-xs py-1 px-3 rounded-xl outline-none focus:border-primary"
          >
            {COMMON_TIMEZONES.map((tz) => (
              <option key={tz.value} value={tz.value}>{tz.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Confirmed Registered Customer Screen */}
      {isRegistered && accessData ? (
        <div className="bg-[#000000] p-6 rounded-2xl border border-emerald-500/40 text-center space-y-5">
          <div className="h-14 w-14 bg-emerald-500/10 text-emerald-400 rounded-full flex items-center justify-center mx-auto border border-emerald-500/30">
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <div>
            <h4 className="text-xl font-bold text-white">You're Registered for this Live Event!</h4>
            <p className="text-xs text-[rgba(244,242,236,0.68)] mt-1">
              Your registration is confirmed. Access details and meeting link are provided below.
            </p>
          </div>

          {/* Private Join Button */}
          {accessData.meetingUrl && (
            <a href={accessData.meetingUrl} target="_blank" rel="noreferrer" className="block">
              <Button className="w-full h-12 bg-primary hover:bg-primary-hover text-[#000000] font-extrabold text-xs rounded-xl shadow-lg gap-2 border border-black transition-all">
                <Video className="h-4 w-4" /> Join Live Webinar Meeting
              </Button>
            </a>
          )}

          {/* Calendar Sync Buttons */}
          <div className="grid grid-cols-2 gap-3">
            <a href={gcalUrl} target="_blank" rel="noreferrer">
              <Button variant="outline" size="sm" className="w-full border-white/10 bg-[#12141c] hover:bg-white/10 text-white text-xs font-bold rounded-xl gap-1.5">
                <Calendar className="h-4 w-4 text-[#CBE957]" /> Google Calendar
              </Button>
            </a>
            <a href={icsDataUrl} download="webinar-event.ics">
              <Button variant="outline" size="sm" className="w-full border-white/10 bg-[#12141c] hover:bg-white/10 text-white text-xs font-bold rounded-xl gap-1.5">
                <Download className="h-4 w-4 text-primary" /> Download .ICS
              </Button>
            </a>
          </div>

          {/* Materials & Resources */}
          {config.resources && config.resources.length > 0 && (
            <div className="pt-4 border-t border-white/10 text-left space-y-3">
              <div className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#CBE957]" /> Event Downloads & Materials
              </div>
              <div className="space-y-2">
                {config.resources.map((res) => (
                  <div key={res.id} className="bg-[#12141c] border border-white/10 p-3 rounded-xl flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-white">{res.title}</div>
                      {res.description && <div className="text-[11px] text-[rgba(244,242,236,0.68)]">{res.description}</div>}
                    </div>
                    {res.url && (
                      <a href={res.url} target="_blank" rel="noreferrer">
                        <Button size="sm" className="bg-[#39414D] hover:bg-white/20 text-white text-xs font-bold h-8 px-3 rounded-lg gap-1">
                          <Download className="w-3.5 h-3.5" /> Download
                        </Button>
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Video Replay if available */}
          {config.replay?.enabled && config.replay?.url && (
            <div className="pt-4 border-t border-white/10 text-left space-y-3">
              <div className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Play className="w-4 h-4 text-primary" /> {config.replay.title || 'Webinar Recording Replay'}
              </div>
              <a href={config.replay.url} target="_blank" rel="noreferrer">
                <Button className="w-full h-11 bg-[#60A5FA] hover:bg-[#3B82F6] text-black font-bold text-xs rounded-xl gap-2">
                  <Play className="w-4 h-4" /> Watch Recorded Replay
                </Button>
              </a>
            </div>
          )}
        </div>
      ) : isFull ? (
        <div className="bg-[#000000] p-6 rounded-2xl border border-amber-500/40 text-center space-y-2">
          <h4 className="text-base font-extrabold text-amber-400">Registration Full</h4>
          <p className="text-xs text-[rgba(244,242,236,0.68)]">
            This live webinar has reached its maximum capacity of {config.capacity} attendees.
          </p>
          {config.waitlistEnabled && (
            <p className="text-xs text-[#CBE957] font-semibold mt-1">
              {config.waitlistMessage || 'Waitlist is open.'}
            </p>
          )}
        </div>
      ) : isRegistrationClosed || hasEnded ? (
        <div className="bg-[#000000] p-6 rounded-2xl border border-white/10 text-center space-y-2">
          <h4 className="text-base font-extrabold text-white">Registration Closed</h4>
          <p className="text-xs text-[rgba(244,242,236,0.68)]">
            Registration for this live webinar is currently closed or the session has ended.
          </p>
        </div>
      ) : config.isFree ? (
        /* FREE REGISTRATION INTAKE FORM */
        <form onSubmit={handleFreeRegistration} className="space-y-4 pt-2 border-t border-white/10">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase text-[rgba(244,242,236,0.68)] tracking-wider">
              Reserve Your Free Spot
            </h4>
            <span className="text-[11px] text-[#CBE957] font-bold">100% Free Access</span>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-[rgba(244,242,236,0.68)]">Full Name</Label>
              <Input
                placeholder="Jane Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="bg-[#000000] border-white/10 text-white text-xs h-11 rounded-xl focus:border-primary"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-[rgba(244,242,236,0.68)]">Email Address *</Label>
              <Input
                type="email"
                required
                placeholder="jane@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-[#000000] border-white/10 text-white text-xs h-11 rounded-xl focus:border-primary"
              />
            </div>
          </div>

          {/* Registration Custom Questions */}
          {config.questions?.map((q) => (
            <div key={q.id} className="space-y-1.5">
              <Label className="text-xs font-semibold text-[rgba(244,242,236,0.68)]">
                {q.question} {q.required && <span className="text-[#F0441E]">*</span>}
              </Label>
              {q.type === 'LONG_TEXT' ? (
                <Textarea
                  rows={2}
                  required={q.required}
                  value={answers[q.id] || ''}
                  onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
                  className="bg-[#000000] border-white/10 text-white text-xs rounded-xl focus:border-primary"
                />
              ) : (
                <Input
                  required={q.required}
                  value={answers[q.id] || ''}
                  onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
                  className="bg-[#000000] border-white/10 text-white text-xs h-11 rounded-xl focus:border-primary"
                />
              )}
            </div>
          ))}

          <Button
            type="submit"
            disabled={registering}
            className="w-full h-12 bg-primary hover:bg-primary-hover text-[#000000] font-extrabold text-xs rounded-xl shadow-lg gap-2 border border-black transition-all"
          >
            {registering ? 'Registering...' : <>Reserve Free Spot Now <ArrowRight className="h-4 w-4" /></>}
          </Button>
        </form>
      ) : null}

      {/* What You'll Learn Section */}
      {config.whatYouWillLearn && config.whatYouWillLearn.length > 0 && (
        <div className="space-y-3 pt-4 border-t border-white/10">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#CBE957]" /> What You'll Learn
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {config.whatYouWillLearn.map((item, idx) => (
              <div key={idx} className="bg-[#000000] border border-white/10 p-3 rounded-xl flex items-start gap-2.5 text-xs text-[rgba(244,242,236,0.68)]">
                <Check className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <span className="font-medium text-white">{typeof item === 'string' ? item : item.text || item.title}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Agenda Timeline Section */}
      {config.agenda && config.agenda.length > 0 && (
        <div className="space-y-3 pt-4 border-t border-white/10">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#60A5FA]" /> Event Schedule & Agenda
          </h3>
          <div className="space-y-3">
            {config.agenda.map((ag, idx) => (
              <div key={ag.id || idx} className="bg-[#000000] border border-white/10 p-4 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <span className="text-xs font-bold text-black bg-[#60A5FA] px-3 py-1 rounded-full shrink-0">
                  {ag.time}
                </span>
                <div>
                  <h4 className="font-bold text-sm text-white">{ag.title}</h4>
                  {ag.description && <p className="text-xs text-[rgba(244,242,236,0.68)] mt-0.5">{ag.description}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Speakers Section */}
      {config.speakers && config.speakers.length > 0 && (
        <div className="space-y-4 pt-4 border-t border-white/10">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-primary" /> Featured Presenters & Speakers
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {config.speakers.map((spk, idx) => (
              <div key={spk.id || idx} className="bg-[#000000] border border-white/10 p-4 rounded-2xl space-y-2">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-xl bg-[#12141c] border border-white/10 text-primary font-black flex items-center justify-center text-base uppercase shrink-0 overflow-hidden">
                    {spk.image ? (
                      <img src={spk.image} alt={spk.name} className="h-full w-full object-cover" />
                    ) : (
                      (spk.name || 'S')[0]
                    )}
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-white">{spk.name || 'Featured Speaker'}</h4>
                    <p className="text-xs text-[#CBE957] font-medium">{spk.role}</p>
                  </div>
                </div>
                {spk.bio && <p className="text-xs text-[rgba(244,242,236,0.68)] leading-relaxed">{spk.bio}</p>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
