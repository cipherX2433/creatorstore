'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import {
  ShieldCheck, Zap, Layers, Shuffle, Send, AlertTriangle,
  CheckCircle2, Play, Pause, RefreshCw, MessageSquare, Clock, ArrowRight, Shield
} from 'lucide-react'

/**
 * ==============================================================================
 * CREATORSTORE DELIVERY GUARD — ANIMATED PRODUCT DEMO TILE
 * ==============================================================================
 * An interactive, stateful product demonstration component showcasing how
 * CreatorStore intelligently buffers, paces, and protects Instagram comment
 * automations during viral traffic spikes and normal operation.
 *
 * Isolated Demo Data Architecture:
 * - DEMO_STATES contains simulation metrics and copy.
 * - Supports mode="demo" (default) or future mode="live" with real metrics prop.
 * ==============================================================================
 */

export const DEMO_STATES = [
  {
    id: 'normal',
    label: 'Normal Flow',
    statusLabel: 'All systems normal',
    statusType: 'success', // green
    headline: 'All systems normal',
    description: 'Messages are being delivered at a steady, uninterrupted pace.',
    incomingDemandPercent: 18,
    incomingDemandValue: '18 / min',
    deliveryPacePercent: 18,
    deliveryPaceValue: '18 / min (Direct)',
    queueCount: 12,
    deliveredPercent: '100%',
    rateBreaches: 0,
    activePipelineNode: 0, // 0: Trigger, 1: Queue, 2: Guard, 3: Variant, 4: Delivered
    duration: 4000,
    queueBadge: '12 in queue',
    liveEvents: [
      { id: 'ev-1', handle: '@emily.vibe', action: 'Comment: "GUIDE"', step: 'Dispatched directly', time: 'Just now', status: 'delivered' },
      { id: 'ev-2', handle: '@marcus_run', action: 'Comment: "LINK"', step: 'Variant #1 sent', time: '2s ago', status: 'delivered' },
    ]
  },
  {
    id: 'spike',
    label: 'Viral Spike',
    statusLabel: 'Traffic spike detected',
    statusType: 'warning', // orange
    headline: '⚡ Traffic spike detected',
    description: 'Message volume has surged. Delivery is being paced automatically.',
    incomingDemandPercent: 92,
    incomingDemandValue: '480 / min (Viral Reel)',
    deliveryPacePercent: 42,
    deliveryPaceValue: '60 / min (Safe Cap)',
    queueCount: 284,
    deliveredPercent: '99.9%',
    rateBreaches: 0,
    activePipelineNode: 1, // Queue buffering
    duration: 3500,
    queueBadge: 'Buffering +284',
    liveEvents: [
      { id: 'ev-3', handle: '@growth_dan', action: 'Comment: "ACCESS"', step: 'Buffered in Smart Queue', time: 'Just now', status: 'queued' },
      { id: 'ev-4', handle: '@sarah_designs', action: 'Comment: "GUIDE"', step: 'Buffered in Smart Queue', time: '1s ago', status: 'queued' },
      { id: 'ev-5', handle: '@kyle.reel', action: 'Comment: "LINK"', step: 'Rate Pacer applied (3s)', time: '2s ago', status: 'processing' },
    ]
  },
  {
    id: 'protected',
    label: 'Protected Pacing',
    statusLabel: 'Protected delivery active',
    statusType: 'accent', // blue
    headline: '🛡️ Protected delivery active',
    description: 'CreatorStore is pacing delivery while the queue is safely processed.',
    incomingDemandPercent: 86,
    incomingDemandValue: '420 / min (High volume)',
    deliveryPacePercent: 48,
    deliveryPaceValue: '60 / min (Protected rate)',
    queueCount: 420,
    deliveredPercent: '99.8%',
    rateBreaches: 0,
    activePipelineNode: 2, // Delivery Guard
    duration: 4000,
    queueBadge: 'Pacing 420 queued',
    liveEvents: [
      { id: 'ev-6', handle: '@maya.coach', action: 'Comment: "START"', step: 'Variant #3 rotated', time: 'Just now', status: 'processing' },
      { id: 'ev-7', handle: '@jake_photo', action: 'Comment: "LINK"', step: 'Sent via Graph API', time: '1s ago', status: 'delivered' },
      { id: 'ev-8', handle: '@art_by_leo', action: 'Comment: "GUIDE"', step: 'Anti-spam interval (4s)', time: '2s ago', status: 'processing' },
    ]
  },
  {
    id: 'recovering',
    label: 'Queue Recovery',
    statusLabel: 'Queue recovering',
    statusType: 'success', // green
    headline: '✓ Queue recovering',
    description: 'Traffic is returning to normal. Backlog is clearing smoothly.',
    incomingDemandPercent: 32,
    incomingDemandValue: '45 / min',
    deliveryPacePercent: 52,
    deliveryPaceValue: '60 / min (Clearing backlog)',
    queueCount: 64,
    deliveredPercent: '100%',
    rateBreaches: 0,
    activePipelineNode: 4, // Delivered
    duration: 3500,
    queueBadge: 'Draining: 64 left',
    liveEvents: [
      { id: 'ev-9', handle: '@olivia.creator', action: 'Comment: "GUIDE"', step: 'Delivered to inbox ✓', time: 'Just now', status: 'delivered' },
      { id: 'ev-10', handle: '@david_tech', action: 'Comment: "LINK"', step: 'Delivered to inbox ✓', time: '1s ago', status: 'delivered' },
    ]
  }
]

const PIPELINE_STEPS = [
  { id: 'trigger', label: 'Comment Trigger', shortLabel: 'Trigger', icon: MessageSquare, desc: 'Public comment detected' },
  { id: 'queue', label: 'Smart Queue', shortLabel: 'Smart Queue', icon: Layers, desc: 'Intelligent buffer pool' },
  { id: 'guard', label: 'Delivery Guard', shortLabel: 'Delivery Guard', icon: Shield, desc: 'Rate & interval pacer' },
  { id: 'variant', label: 'Message Variant', shortLabel: 'Variant', icon: Shuffle, desc: 'Anti-spam text rotation' },
  { id: 'delivered', label: 'Delivered', shortLabel: 'Delivered', icon: Send, desc: 'Instagram inbox DM' },
]

/**
 * Animated number counter component for smooth numerical transitions.
 */
function AnimatedNumber({ value, duration = 0.8 }) {
  const prefersReducedMotion = useReducedMotion()
  const [displayValue, setDisplayValue] = useState(value)
  const prevValueRef = useRef(value)

  useEffect(() => {
    if (prefersReducedMotion) {
      setDisplayValue(value)
      prevValueRef.current = value
      return
    }

    const startVal = prevValueRef.current
    const endVal = value
    const startTime = performance.now()
    const animDuration = duration * 1000

    let animFrame
    const step = (now) => {
      const elapsed = now - startTime
      const progress = Math.min(elapsed / animDuration, 1)
      // Ease out cubic
      const easedProgress = 1 - Math.pow(1 - progress, 3)
      const currentVal = Math.round(startVal + (endVal - startVal) * easedProgress)
      setDisplayValue(currentVal)

      if (progress < 1) {
        animFrame = requestAnimationFrame(step)
      } else {
        prevValueRef.current = endVal
      }
    }

    animFrame = requestAnimationFrame(step)
    return () => cancelAnimationFrame(animFrame)
  }, [value, duration, prefersReducedMotion])

  return <span>{displayValue.toLocaleString()}</span>
}

export default function DeliveryGuardAnimatedTile({
  mode = 'demo',
  className = '',
}) {
  const prefersReducedMotion = useReducedMotion()
  const [stateIndex, setStateIndex] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const [pipelinePulseIndex, setPipelinePulseIndex] = useState(0)

  const currentState = DEMO_STATES[stateIndex] || DEMO_STATES[0]

  // Continuous State Animation Cycle
  useEffect(() => {
    if (isPaused || prefersReducedMotion) return

    const timer = setTimeout(() => {
      setStateIndex((prev) => (prev + 1) % DEMO_STATES.length)
    }, currentState.duration)

    return () => clearTimeout(timer)
  }, [stateIndex, isPaused, prefersReducedMotion, currentState.duration])

  // Continuous Pipeline Traveling Dot Animation
  useEffect(() => {
    if (isPaused || prefersReducedMotion) return

    const pulseInterval = setInterval(() => {
      setPipelinePulseIndex((prev) => (prev + 1) % PIPELINE_STEPS.length)
    }, 900)

    return () => clearInterval(pulseInterval)
  }, [isPaused, prefersReducedMotion])

  // Status color styles mapping
  const statusColors = useMemo(() => {
    switch (currentState.statusType) {
      case 'warning':
        return {
          dotBg: 'bg-[#D97706]',
          badgeBorder: 'border-[#D97706]/20',
          badgeBg: 'bg-[#D97706]/10',
          badgeText: 'text-[#D97706]',
          accentText: 'text-[#D97706]',
          barColor: 'bg-[#D97706]',
        }
      case 'accent':
        return {
          dotBg: 'bg-[#1F1F1F]',
          badgeBorder: 'border-[#E5E5E3]',
          badgeBg: 'bg-[#F5F5F3]',
          badgeText: 'text-[#1F1F1F]',
          accentText: 'text-[#1F1F1F]',
          barColor: 'bg-[#1F1F1F]',
        }
      case 'success':
      default:
        return {
          dotBg: 'bg-[#16A34A]',
          badgeBorder: 'border-[#16A34A]/20',
          badgeBg: 'bg-[#16A34A]/10',
          badgeText: 'text-[#16A34A]',
          accentText: 'text-[#16A34A]',
          barColor: 'bg-[#16A34A]',
        }
    }
  }, [currentState.statusType])

  return (
    <div
      className={`bg-[#FFFFFF] border border-[#E5E5E3] rounded-2xl sm:rounded-3xl p-5 sm:p-6 text-[#1F1F1F] shadow-[0_8px_30px_rgba(0,0,0,0.04)] transition-all ${className}`}
      role="region"
      aria-label="CreatorStore Delivery Guard Product Demo"
    >
      {/* ==================================================================== */}
      {/* 1. HEADER: Brand Title, Architecture Tag & State Selector Controls  */}
      {/* ==================================================================== */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-[#E5E5E3]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#F5F5F3] border border-[#E5E5E3] flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5 text-[#1F1F1F]" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm sm:text-base font-bold tracking-tight text-[#1F1F1F]">
                CreatorStore Delivery Guard
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-[#F5F5F3] border border-[#E5E5E3] text-[#6F6F6B] tracking-wide uppercase">
                Product Demo
              </span>
            </div>
            <p className="text-xs text-[#6F6F6B] font-medium mt-0.5">
              Intelligent buffering, rate pacing, and anti-spam protection for Instagram Auto-DMs.
            </p>
          </div>
        </div>

        {/* Right side: Live Indicator & Interactive State Stepper */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Active Status Badge */}
          <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold border ${statusColors.badgeBorder} ${statusColors.badgeBg} ${statusColors.badgeText}`}>
            <span className="relative flex h-2 w-2">
              {!prefersReducedMotion && (
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${statusColors.dotBg}`} />
              )}
              <span className={`relative inline-flex rounded-full h-2 w-2 ${statusColors.dotBg}`} />
            </span>
            <span className="capitalize">{currentState.statusLabel}</span>
          </div>

          {/* Pause / Play Toggle for manual inspection */}
          <button
            onClick={() => setIsPaused(!isPaused)}
            className="p-1.5 rounded-lg bg-[#FFFFFF] hover:bg-[#F5F5F3] border border-[#E5E5E3] text-[#6F6F6B] hover:text-[#1F1F1F] transition-colors"
            title={isPaused ? 'Resume live simulation' : 'Pause simulation'}
            aria-label={isPaused ? 'Resume live simulation' : 'Pause simulation'}
          >
            {isPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* 2. STATE STEPPER PILLS (Interactive preview)                         */}
      {/* ==================================================================== */}
      <div className="flex items-center gap-1.5 pt-4 pb-2 overflow-x-auto no-scrollbar">
        {DEMO_STATES.map((st, idx) => {
          const isActive = idx === stateIndex
          return (
            <button
              key={st.id}
              onClick={() => {
                setStateIndex(idx)
              }}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                isActive
                  ? 'bg-[#1F1F1F] text-[#FFFFFF] shadow-xs'
                  : 'bg-[#FFFFFF] text-[#6F6F6B] hover:text-[#1F1F1F] hover:bg-[#F5F5F3] border border-[#E5E5E3]'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-white' : 'bg-[#999995]'}`} />
              {st.label}
            </button>
          )
        })}
      </div>

      {/* ==================================================================== */}
      {/* 3. STATUS HEADLINE & SUPPORTING TEXT (Crossfade transition)           */}
      {/* ==================================================================== */}
      <div className="my-4 p-4 rounded-xl bg-[#FBFBFB] border border-[#E5E5E3] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentState.id}
            initial={prefersReducedMotion ? false : { opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={prefersReducedMotion ? false : { opacity: 0, y: -4 }}
            transition={{ duration: 0.25 }}
            className="space-y-1"
          >
            <div className="flex items-center gap-2 font-bold text-sm sm:text-base text-[#1F1F1F]">
              {currentState.statusType === 'warning' && <AlertTriangle className="w-4 h-4 text-[#D97706] shrink-0" />}
              {currentState.statusType === 'accent' && <Shield className="w-4 h-4 text-[#1F1F1F] shrink-0" />}
              {currentState.statusType === 'success' && <CheckCircle2 className="w-4 h-4 text-[#16A34A] shrink-0" />}
              <span>{currentState.headline}</span>
            </div>
            <p className="text-xs text-[#6F6F6B]">
              {currentState.description}
            </p>
          </motion.div>
        </AnimatePresence>

        {/* Dynamic Queue Status Tag */}
        <div className="shrink-0 flex items-center gap-2">
          <div className="px-3 py-1.5 rounded-lg bg-[#FFFFFF] border border-[#E5E5E3] text-xs font-mono text-[#1F1F1F] flex items-center gap-2">
            <Layers className="w-3.5 h-3.5 text-[#1F1F1F]" />
            <span>{currentState.queueBadge}</span>
          </div>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* 4. DELIVERY ACTIVITY (Demand vs Controlled Delivery Pacing)           */}
      {/* ==================================================================== */}
      <div className="my-5 p-4 rounded-xl bg-[#FBFBFB] border border-[#E5E5E3] space-y-4">
        <div className="flex items-center justify-between text-xs font-bold text-[#6F6F6B] uppercase tracking-wider">
          <span>Delivery Activity Monitor</span>
          <span className="text-[10px] text-[#999995] lowercase font-normal">paced safe throughput</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Bar 1: Incoming Demand */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-[#6F6F6B] flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-[#D97706]" /> Incoming Demand:
              </span>
              <span className="font-mono font-bold text-[#1F1F1F]">
                {currentState.incomingDemandValue}
              </span>
            </div>
            <div className="h-2.5 w-full bg-[#FFFFFF] rounded-full overflow-hidden border border-[#E5E5E3]">
              <motion.div
                className={`h-full rounded-full ${
                  currentState.incomingDemandPercent > 70 ? 'bg-[#D97706]' : 'bg-[#1F1F1F]'
                }`}
                initial={false}
                animate={{ width: `${currentState.incomingDemandPercent}%` }}
                transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.6, ease: 'easeOut' }}
              />
            </div>
          </div>

          {/* Bar 2: CreatorStore Paced Delivery */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-[#6F6F6B] flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-[#16A34A]" /> CreatorStore Delivery:
              </span>
              <span className="font-mono font-bold text-[#16A34A]">
                {currentState.deliveryPaceValue}
              </span>
            </div>
            <div className="h-2.5 w-full bg-[#FFFFFF] rounded-full overflow-hidden border border-[#E5E5E3]">
              <motion.div
                className="h-full rounded-full bg-[#16A34A]"
                initial={false}
                animate={{ width: `${currentState.deliveryPacePercent}%` }}
                transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.6, ease: 'easeOut' }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* 5. VISUAL DELIVERY PIPELINE (Comment → Queue → Guard → Variant → DM) */}
      {/* ==================================================================== */}
      <div className="my-5 space-y-2">
        <div className="flex items-center justify-between text-xs font-bold text-[#6F6F6B] uppercase tracking-wider mb-2">
          <span>Delivery Pipeline</span>
          <span className="text-[10px] text-[#999995] font-normal">safe execution path</span>
        </div>

        {/* Pipeline Track */}
        <div className="p-4 rounded-xl bg-[#FBFBFB] border border-[#E5E5E3] relative overflow-hidden">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 sm:gap-2 relative z-10">
            {PIPELINE_STEPS.map((step, idx) => {
              const Icon = step.icon
              const isPulseActive = pipelinePulseIndex === idx
              const isStateActive = currentState.activePipelineNode === idx

              return (
                <div
                  key={step.id}
                  className={`p-2.5 rounded-lg border transition-all flex flex-col items-center text-center ${
                    isStateActive || isPulseActive
                      ? 'bg-[#FFFFFF] border-[#1F1F1F] text-[#1F1F1F] shadow-xs'
                      : 'bg-[#FFFFFF] border-[#E5E5E3] text-[#6F6F6B]'
                  }`}
                >
                  <div className="relative mb-1.5">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      isStateActive || isPulseActive
                        ? 'bg-[#1F1F1F] text-white'
                        : 'bg-[#F5F5F3] text-[#6F6F6B]'
                    }`}>
                      <Icon className="w-4 h-4" />
                    </div>

                    {/* Animated Pulse Dot */}
                    {isPulseActive && !prefersReducedMotion && (
                      <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#1F1F1F] opacity-75" />
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#1F1F1F]" />
                      </span>
                    )}
                  </div>

                  <span className="text-xs font-bold leading-tight">
                    {step.shortLabel}
                  </span>
                  <span className="text-[10px] text-[#6F6F6B] mt-0.5 hidden sm:block">
                    {step.desc}
                  </span>
                </div>
              )
            })}
          </div>

          {/* Background Track Line (hidden on very small screens) */}
          <div className="hidden sm:block absolute top-[38px] left-[10%] right-[10%] h-[2px] bg-[#E5E5E3] z-0" />
        </div>
      </div>

      {/* ==================================================================== */}
      {/* 6. LIVE MESSAGE ACTIVITY FEED (Micro-event ticker)                   */}
      {/* ==================================================================== */}
      <div className="my-5 p-3 sm:p-4 rounded-xl bg-[#FBFBFB] border border-[#E5E5E3] space-y-2">
        <div className="flex items-center justify-between text-xs font-bold text-[#6F6F6B] uppercase tracking-wider mb-1">
          <span className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-[#1F1F1F]" /> Live Delivery Activity
          </span>
          <span className="text-[10px] text-[#16A34A] font-semibold">Active Engine</span>
        </div>

        <div className="space-y-1.5">
          <AnimatePresence mode="popLayout">
            {currentState.liveEvents.map((ev) => (
              <motion.div
                key={ev.id}
                initial={prefersReducedMotion ? false : { opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={prefersReducedMotion ? false : { opacity: 0, x: 10 }}
                transition={{ duration: 0.3 }}
                className="p-2 rounded-lg bg-[#FFFFFF] border border-[#E5E5E3] flex items-center justify-between gap-2 text-xs"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-bold text-[#1F1F1F] truncate">{ev.handle}</span>
                  <span className="text-[#6F6F6B] text-[11px] hidden sm:inline">{ev.action}</span>
                  <ArrowRight className="w-3 h-3 text-[#999995] shrink-0" />
                  <span className={`text-[11px] font-medium truncate ${
                    ev.status === 'delivered' ? 'text-[#16A34A]' : ev.status === 'queued' ? 'text-[#D97706]' : 'text-[#1F1F1F]'
                  }`}>
                    {ev.step}
                  </span>
                </div>
                <span className="text-[10px] text-[#6F6F6B] shrink-0 font-mono">{ev.time}</span>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* 7. LIVE METRICS FOOTER (Queue, Delivered, Rate Breaches)              */}
      {/* ==================================================================== */}
      <div className="pt-4 border-t border-[#E5E5E3] grid grid-cols-3 gap-2 sm:gap-4 text-center">
        <div className="p-3 rounded-xl bg-[#FBFBFB] border border-[#E5E5E3]">
          <span className="text-[10px] sm:text-xs font-bold text-[#6F6F6B] uppercase tracking-wider block">
            In Queue
          </span>
          <span className="text-base sm:text-2xl font-black font-mono text-[#1F1F1F] mt-1 block">
            <AnimatedNumber value={currentState.queueCount} />
          </span>
        </div>

        <div className="p-3 rounded-xl bg-[#FBFBFB] border border-[#E5E5E3]">
          <span className="text-[10px] sm:text-xs font-bold text-[#6F6F6B] uppercase tracking-wider block">
            Delivered
          </span>
          <span className="text-base sm:text-2xl font-black font-mono text-[#16A34A] mt-1 block">
            {currentState.deliveredPercent}
          </span>
        </div>

        <div className="p-3 rounded-xl bg-[#FBFBFB] border border-[#E5E5E3]">
          <span className="text-[10px] sm:text-xs font-bold text-[#6F6F6B] uppercase tracking-wider block">
            Rate Breaches
          </span>
          <span className="text-base sm:text-2xl font-black font-mono text-[#1F1F1F] mt-1 block">
            {currentState.rateBreaches}
          </span>
        </div>
      </div>
    </div>
  )
}
