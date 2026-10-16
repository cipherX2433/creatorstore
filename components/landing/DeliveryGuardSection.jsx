'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import {
  ShieldCheck,
  Instagram,
  ArrowRight,
  Layers,
  Zap,
  Check,
  AlertTriangle,
  Send,
  Sliders,
  MessageSquare,
  TrendingUp,
  BarChart3,
  Clock,
  Activity
} from 'lucide-react'

/**
 * 4 Living States of the Delivery Guard Engine:
 * 1. Normal Activity (steady, direct dispatch)
 * 2. Activity Spike (sudden incoming volume surge)
 * 3. Protected Pacing (queue absorbs surge, meters delivery safely)
 * 4. Queue Recovery (backlog clears, returning to normal)
 */
const GUARD_STATES = [
  {
    id: 'normal',
    label: 'Normal',
    statusTitle: 'Normal activity',
    statusDesc: 'Messages are flowing normally at standard configured intervals.',
    statusType: 'success',
    demandPercent: 28,
    demandLabel: 'Moderate flow',
    deliveryPercent: 28,
    deliveryLabel: 'Direct delivery',
    queueState: 'Empty / Low',
    deliveryPace: 'Standard',
    activePipelineStep: 0,
    duration: 4500,
  },
  {
    id: 'spike',
    label: 'Spike',
    statusTitle: 'Traffic surge detected',
    statusDesc: 'Incoming activity is rising rapidly from viral engagement.',
    statusType: 'warning',
    demandPercent: 92,
    demandLabel: 'Surge detected',
    deliveryPercent: 44,
    deliveryLabel: 'Pacing initiated',
    queueState: 'Buffering surge',
    deliveryPace: 'Regulating',
    activePipelineStep: 1,
    duration: 3800,
  },
  {
    id: 'protected',
    label: 'Protected',
    statusTitle: 'Protected pacing active',
    statusDesc: 'CreatorStore is pacing automated delivery safely under rate limits.',
    statusType: 'accent',
    demandPercent: 88,
    demandLabel: 'High volume',
    deliveryPercent: 48,
    deliveryLabel: 'Safe controlled rate',
    queueState: 'Paced & buffered',
    deliveryPace: 'Controlled',
    activePipelineStep: 2,
    duration: 4800,
  },
  {
    id: 'recovery',
    label: 'Recovery',
    statusTitle: 'Queue recovering',
    statusDesc: 'Activity is returning to normal. Backlog clearing smoothly.',
    statusType: 'recovery',
    demandPercent: 36,
    demandLabel: 'Stabilizing',
    deliveryPercent: 50,
    deliveryLabel: 'Clearing backlog',
    queueState: 'Draining smoothly',
    deliveryPace: 'Steady',
    activePipelineStep: 3,
    duration: 4400,
  }
]

const PIPELINE_STEPS = [
  { id: 'trigger', label: 'Trigger', icon: MessageSquare },
  { id: 'queue', label: 'Smart Queue', icon: Layers },
  { id: 'pace', label: 'Controlled Pace', icon: Sliders },
  { id: 'delivered', label: 'Delivered', icon: Send }
]

function DeliveryGuardDashboard({
  currentState,
  stateIndex,
  onSelectState,
  prefersReducedMotion
}) {
  const statusTheme = useMemo(() => {
    switch (currentState.statusType) {
      case 'warning':
        return {
          dotBg: 'bg-[#EF6820]',
          border: 'border-[#EF6820]/40',
          bg: 'bg-[#231710]',
          text: 'text-[#EF6820]',
          demandBar: 'bg-[#EF6820]',
          icon: AlertTriangle,
          iconColor: 'text-[#EF6820]'
        }
      case 'accent':
        return {
          dotBg: 'bg-[#FF4B1F]',
          border: 'border-[#FF4B1F]/40',
          bg: 'bg-[#231512]',
          text: 'text-[#FF4B1F]',
          demandBar: 'bg-[#FF4B1F]',
          icon: ShieldCheck,
          iconColor: 'text-[#FF4B1F]'
        }
      case 'recovery':
        return {
          dotBg: 'bg-[#A3FF2F]',
          border: 'border-[#A3FF2F]/40',
          bg: 'bg-[#121E16]',
          text: 'text-[#A3FF2F]',
          demandBar: 'bg-[#FF4B1F]',
          icon: TrendingUp,
          iconColor: 'text-[#A3FF2F]'
        }
      case 'success':
      default:
        return {
          dotBg: 'bg-[#22C55E]',
          border: 'border-[#22C55E]/40',
          bg: 'bg-[#121A15]',
          text: 'text-[#22C55E]',
          demandBar: 'bg-[#FF4B1F]',
          icon: Activity,
          iconColor: 'text-[#22C55E]'
        }
    }
  }, [currentState.statusType])

  const StatusIcon = statusTheme.icon

  return (
    <div
      className="bg-[#16171B] border border-white/12 rounded-2xl sm:rounded-3xl p-4 sm:p-6 text-white shadow-2xl relative"
      role="region"
      aria-label="CreatorStore Delivery Guard Live Simulation"
    >
      {/* 1. Header */}
      <div className="flex items-center justify-between pb-4 border-b border-white/10 gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-[#FF4B1F]/15 border border-[#FF4B1F]/40 flex items-center justify-center text-[#FF4B1F] shrink-0">
            <ShieldCheck className="w-5 h-5 text-[#FF4B1F]" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm sm:text-base font-bold tracking-tight text-white truncate">
              CreatorStore Delivery Guard
            </h3>
            <p className="text-[11px] sm:text-xs text-[#8E929E] font-medium truncate">
              Intelligent rate pacing &amp; queue buffer engine
            </p>
          </div>
        </div>

        {/* Pulsing Live Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#142318] border border-[#A3FF2F]/40 shrink-0">
          <span className="relative flex h-2 w-2">
            {!prefersReducedMotion && (
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#A3FF2F] opacity-75" />
            )}
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#A3FF2F]" />
          </span>
          <span className="text-[11px] font-mono tracking-wider font-extrabold text-[#A3FF2F]">
            LIVE
          </span>
        </div>
      </div>

      {/* 2. State Stepper Pills */}
      <div className="flex items-center gap-2 pt-3.5 pb-1 overflow-x-auto no-scrollbar">
        {GUARD_STATES.map((st, idx) => {
          const isActive = idx === stateIndex
          return (
            <button
              key={st.id}
              onClick={() => onSelectState(idx)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${isActive
                  ? 'bg-[#28292E] text-white border border-white/30 shadow-xs'
                  : 'bg-[#1C1D22] text-[#8E929E] border border-white/5 hover:text-white hover:border-white/15'
                }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${st.id === 'spike'
                    ? 'bg-[#EF6820]'
                    : st.id === 'protected'
                      ? 'bg-[#FF4B1F]'
                      : st.id === 'recovery'
                        ? 'bg-[#A3FF2F]'
                        : 'bg-[#9CA3AF]'
                  } ${isActive ? 'scale-125' : 'opacity-70'}`}
              />
              <span>{st.label}</span>
            </button>
          )
        })}
      </div>

      {/* 3. Recovery / Status Card */}
      <div
        className={`my-3.5 p-3.5 sm:p-4 rounded-xl border ${statusTheme.border} ${statusTheme.bg} min-h-[68px] flex items-center justify-between gap-3 transition-colors duration-300`}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={currentState.id}
            initial={prefersReducedMotion ? false : { opacity: 0, y: 3 }}
            animate={{ opacity: 1, y: 0 }}
            exit={prefersReducedMotion ? false : { opacity: 0, y: -3 }}
            transition={{ duration: 0.2 }}
            className="space-y-1 min-w-0"
          >
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full shrink-0 ${statusTheme.dotBg}`} />
              <h4 className="text-xs sm:text-sm font-bold text-white tracking-tight">
                {currentState.statusTitle}
              </h4>
            </div>
            <p className="text-[11px] sm:text-xs text-[#9CA3AF] pl-4 leading-snug">
              {currentState.statusDesc}
            </p>
          </motion.div>
        </AnimatePresence>

        <div className="shrink-0 pl-2">
          <StatusIcon className={`w-5 h-5 ${statusTheme.iconColor}`} />
        </div>
      </div>

      {/* 4. Activity Regulation with Safe Limit */}
      <div className="my-3.5 p-4 rounded-xl bg-[#121316] border border-white/10 space-y-3">
        <div className="flex items-center justify-between text-xs font-bold text-[#8E929E]">
          <span className="font-mono text-[10px] sm:text-[11px] uppercase tracking-wider">
            ACTIVITY REGULATION
          </span>
          <span className="font-mono text-[10px] sm:text-[11px] text-[#FF4B1F] font-medium">
            Safe rate pacing
          </span>
        </div>

        <div className="space-y-3 relative pt-3">
          {/* SAFE LIMIT VERTICAL MARKER */}
          <div
            className="absolute top-0 bottom-0 left-[62%] w-px border-r border-dashed border-[#EF4444] z-10 pointer-events-none"
            title="Safe Rate Pacing Limit"
          >
            <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-[9px] font-mono font-bold text-[#EF4444] uppercase tracking-wider bg-[#121316] px-1 rounded">
              SAFE LIMIT
            </span>
          </div>

          {/* Bar 1: Incoming Demand */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-xs text-[#9CA3AF] flex items-center gap-1.5 font-medium">
                <Zap className="w-3.5 h-3.5 text-[#EF6820]" />
                <span>Incoming Demand:</span>
              </span>
              <span className="font-mono text-xs font-bold text-white">
                {currentState.demandLabel}
              </span>
            </div>
            <div className="h-3 w-full bg-[#24252B] rounded-full overflow-hidden border border-white/5">
              <motion.div
                className={`h-full rounded-full transition-all ${currentState.id === 'spike' ? 'bg-[#EF6820]' : 'bg-[#FF4B1F]'
                  }`}
                initial={false}
                animate={{ width: `${currentState.demandPercent}%` }}
                transition={
                  prefersReducedMotion
                    ? { duration: 0 }
                    : { duration: 0.5, ease: 'easeOut' }
                }
              />
            </div>
          </div>

          {/* Bar 2: Controlled Delivery */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-xs text-[#9CA3AF] flex items-center gap-1.5 font-medium">
                <ShieldCheck className="w-3.5 h-3.5 text-[#A3FF2F]" />
                <span>Controlled Delivery:</span>
              </span>
              <span className="font-mono text-xs font-bold text-[#A3FF2F]">
                {currentState.deliveryLabel}
              </span>
            </div>
            <div className="h-3 w-full bg-[#24252B] rounded-full overflow-hidden border border-white/5">
              <motion.div
                className="h-full rounded-full bg-[#A3FF2F]"
                initial={false}
                animate={{ width: `${currentState.deliveryPercent}%` }}
                transition={
                  prefersReducedMotion
                    ? { duration: 0 }
                    : { duration: 0.5, ease: 'easeOut' }
                }
              />
            </div>
          </div>
        </div>
      </div>

      {/* 5. Message Flow Pipeline with Connecting Arrows */}
      <div className="my-3.5 p-4 rounded-xl bg-[#121316] border border-white/10 space-y-2.5">
        <div className="text-[10px] sm:text-[11px] font-mono font-bold text-[#8E929E] uppercase tracking-wider">
          MESSAGE FLOW PIPELINE
        </div>

        <div className="flex items-center justify-between gap-1 sm:gap-2">
          {PIPELINE_STEPS.map((step, idx) => {
            const Icon = step.icon
            const isCurrent = currentState.activePipelineStep === idx
            const isPassed = currentState.activePipelineStep >= idx

            return (
              <div key={step.id} className="contents">
                <div
                  className={`flex-1 min-w-0 p-2 sm:p-2.5 rounded-xl border transition-all flex flex-col items-center justify-center text-center ${isCurrent
                      ? 'border-[#FF4B1F] bg-[#FF4B1F]/15 text-white shadow-xs'
                      : isPassed
                        ? 'border-white/20 bg-white/5 text-[#E5E7EB]'
                        : 'border-white/10 bg-[#17181D] text-[#6B7280]'
                    }`}
                >
                  <div
                    className={`w-6 h-6 sm:w-7 sm:h-7 rounded-lg flex items-center justify-center mb-1 ${isCurrent
                        ? 'bg-[#FF4B1F] text-white'
                        : isPassed
                          ? 'bg-[#FF4B1F]/20 text-[#FF4B1F]'
                          : 'bg-white/5 text-[#6B7280]'
                      }`}
                  >
                    <Icon className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                  </div>
                  <span className="text-[9px] sm:text-[11px] font-bold truncate max-w-full">
                    {step.label}
                  </span>
                </div>

                {idx < PIPELINE_STEPS.length - 1 && (
                  <ArrowRight
                    className={`w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0 ${currentState.activePipelineStep > idx
                        ? 'text-[#FF4B1F]'
                        : 'text-white/20'
                      }`}
                  />
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* 6. Dynamic Bottom Metrics */}
      <div className="pt-2 grid grid-cols-3 gap-2">
        <div className="p-2.5 sm:p-3 rounded-xl bg-[#121316] border border-white/10 flex items-center gap-2.5">
          <BarChart3 className="w-4 h-4 text-[#FF4B1F] shrink-0" />
          <div className="min-w-0">
            <div className="text-[8px] sm:text-[10px] font-mono font-bold text-[#8E929E] uppercase tracking-wider truncate">
              QUEUE BUFFER
            </div>
            <div className="text-xs sm:text-[13px] font-bold text-white truncate">
              {currentState.queueState}
            </div>
          </div>
        </div>

        <div className="p-2.5 sm:p-3 rounded-xl bg-[#121316] border border-white/10 flex items-center gap-2.5">
          <Clock className="w-4 h-4 text-[#A3FF2F] shrink-0" />
          <div className="min-w-0">
            <div className="text-[8px] sm:text-[10px] font-mono font-bold text-[#8E929E] uppercase tracking-wider truncate">
              DELIVERY PACE
            </div>
            <div className="text-xs sm:text-[13px] font-bold text-[#A3FF2F] truncate">
              {currentState.deliveryPace}
            </div>
          </div>
        </div>

        <div className="p-2.5 sm:p-3 rounded-xl bg-[#121316] border border-white/10 flex items-center gap-2.5">
          <ShieldCheck className="w-4 h-4 text-[#FF4B1F] shrink-0" />
          <div className="min-w-0">
            <div className="text-[8px] sm:text-[10px] font-mono font-bold text-[#8E929E] uppercase tracking-wider truncate">
              PROTECTION
            </div>
            <div className="text-xs sm:text-[13px] font-bold text-[#FF4B1F] truncate">
              Active
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function DeliveryGuardSection() {
  const prefersReducedMotion = useReducedMotion()
  const [stateIndex, setStateIndex] = useState(3) // Default to 'Recovery' to closely match reference preview

  const currentState = GUARD_STATES[stateIndex] || GUARD_STATES[0]

  useEffect(() => {
    if (prefersReducedMotion) return

    const timer = setTimeout(() => {
      setStateIndex((prev) => (prev + 1) % GUARD_STATES.length)
    }, currentState.duration)

    return () => clearTimeout(timer)
  }, [stateIndex, prefersReducedMotion, currentState.duration])

  return (
    <section
      id="safety"
      className="py-16 sm:py-24 px-4 sm:px-6 lg:px-8 relative overflow-hidden bg-[#232323]"
      style={{
        backgroundImage: `
          linear-gradient(to right, rgba(255, 255, 255, 0.025) 1px, transparent 1px),
          linear-gradient(to bottom, rgba(255, 255, 255, 0.025) 1px, transparent 1px)
        `,
        backgroundSize: '48px 48px',
      }}
    >
      <div className="max-w-6xl mx-auto relative">
        {/* CreatorStore Orange Accent Doodle Strokes above Top-Right Chamfered Edge */}
        <svg
          className="absolute -top-7 sm:-top-8 -right-1 sm:right-3 w-14 h-14 sm:w-16 sm:h-16 pointer-events-none text-[#FF4B1F] z-20"
          viewBox="0 0 64 64"
          fill="none"
          stroke="currentColor"
          strokeWidth="3.5"
          strokeLinecap="round"
          aria-hidden="true"
        >
          <path d="M 12 52 L 6 28" />
          <path d="M 26 46 L 26 14" />
          <path d="M 38 48 L 48 18" />
          <path d="M 46 56 L 60 36" />
        </svg>

        {/* 1. Large Chamfered Outer Outlined Container */}
        <motion.div
          initial={prefersReducedMotion ? false : { opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="relative p-[1px] bg-white/15"
          style={{
            clipPath:
              'polygon(16px 0%, calc(100% - 68px) 0%, 100% 68px, 100% calc(100% - 16px), calc(100% - 16px) 100%, 16px 100%, 0% calc(100% - 16px), 0% 16px)',
          }}
        >
          <div
            className="relative bg-[#131417] p-5 sm:p-8 lg:p-11 w-full h-full"
            style={{
              clipPath:
                'polygon(16px 0%, calc(100% - 68px) 0%, 100% 68px, 100% calc(100% - 16px), calc(100% - 16px) 100%, 16px 100%, 0% calc(100% - 16px), 0% 16px)',
            }}
          >
            {/* 2-Column Composition on Desktop; Stacked on Mobile: (1) Content (2) Dashboard (3) CTA */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">

              {/* LEFT / DESKTOP-LEFT: Delivery Guard Product UI */}
              <div className="order-2 lg:order-1 lg:col-span-7">
                <motion.div
                  initial={prefersReducedMotion ? false : { opacity: 0, scale: 0.98 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: 0.1 }}
                >
                  <DeliveryGuardDashboard
                    currentState={currentState}
                    stateIndex={stateIndex}
                    onSelectState={setStateIndex}
                    prefersReducedMotion={prefersReducedMotion}
                  />
                </motion.div>
              </div>

              {/* RIGHT / DESKTOP-RIGHT: Account Safety Content */}
              <div className="order-1 lg:order-2 lg:col-span-5 space-y-5 sm:space-y-6 text-left">
                {/* Outlined Eyebrow Pill */}
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#18191D] border border-white/15 text-xs font-bold text-[#E5E7EB] tracking-wide">
                  <span className="w-2 h-2 rounded-full bg-[#FF4B1F]" />
                  <span>ACCOUNT SAFETY</span>
                </div>

                {/* Editorial Headline */}
                <h2 className="text-3xl sm:text-4xl lg:text-[44px] font-black text-white tracking-tight leading-[1.1]">
                  Built to protect
                  <br />
                  your <span className="text-[#FF4B1F]">Instagram</span>
                  <br />
                  automation.
                </h2>

                {/* Supporting Text */}
                <p className="text-sm sm:text-base text-[#9CA3AF] font-normal leading-relaxed">
                  When activity spikes, CreatorStore buffers and meters automated direct messages so delivery flows safely within configured limits.
                </p>

                {/* Orange Outlined Information Card */}
                <div className="border border-[#FF4B1F]/35 bg-[#181311] rounded-2xl p-4 sm:p-4.5 flex items-start gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-[#FF4B1F]/15 border border-[#FF4B1F]/35 flex items-center justify-center text-[#FF4B1F] shrink-0 mt-0.5">
                    <Instagram className="w-5 h-5 text-[#FF4B1F]" />
                  </div>
                  <div className="space-y-1 text-left min-w-0">
                    <h3 className="text-sm sm:text-base font-bold text-white tracking-tight">
                      Instagram Automation Safety
                    </h3>
                    <p className="text-xs sm:text-[13px] text-[#9CA3AF] leading-relaxed">
                      Direct account authorization and controlled message pacing designed around platform limits.
                    </p>
                  </div>
                </div>

                {/* 3 Checkmark Rows */}
                <div className="space-y-2.5 pt-1">
                  <div className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-[#FF4B1F]/15 border border-[#FF4B1F]/40 flex items-center justify-center text-[#FF4B1F] shrink-0 mt-0.5">
                      <Check className="w-3 h-3 stroke-[3]" />
                    </div>
                    <span className="text-xs sm:text-sm text-[#D1D5DB] font-medium leading-snug">
                      Smart rate-limiting dynamically paces high-volume surges
                    </span>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-[#FF4B1F]/15 border border-[#FF4B1F]/40 flex items-center justify-center text-[#FF4B1F] shrink-0 mt-0.5">
                      <Check className="w-3 h-3 stroke-[3]" />
                    </div>
                    <span className="text-xs sm:text-sm text-[#D1D5DB] font-medium leading-snug">
                      Queue buffering helps prevent message drop-offs during spikes
                    </span>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-[#FF4B1F]/15 border border-[#FF4B1F]/40 flex items-center justify-center text-[#FF4B1F] shrink-0 mt-0.5">
                      <Check className="w-3 h-3 stroke-[3]" />
                    </div>
                    <span className="text-xs sm:text-sm text-[#D1D5DB] font-medium leading-snug">
                      Message rotation reduces repetitive automated triggers
                    </span>
                  </div>
                </div>

                {/* CTA Area (Desktop) */}
                <div className="pt-2 hidden lg:flex items-center gap-5">
                  <Link href="/signup">
                    <Button className="h-11 sm:h-12 px-6 sm:px-7 rounded-xl bg-white hover:bg-[#F3F4F6] text-[#0D0D0D] font-bold text-sm flex items-center gap-2 cursor-pointer shadow-md transition-all hover:translate-x-0.5">
                      <span>Get Started Safely</span>
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  </Link>

                  <Link
                    href="/safety"
                    className="text-xs sm:text-sm font-semibold text-[#8E929E] hover:text-white flex items-center gap-1.5 transition-colors"
                  >
                    <span>View Full Safety Specs</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>

              {/* Mobile CTA (Appears below Dashboard on Mobile, per ordering specification) */}
              <div className="order-3 lg:hidden pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <Link href="/signup" className="w-full sm:w-auto">
                  <Button className="w-full h-12 px-6 rounded-xl bg-white hover:bg-[#F3F4F6] text-[#0D0D0D] font-bold text-sm flex items-center justify-center gap-2 cursor-pointer shadow-md">
                    <span>Get Started Safely</span>
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>

                <Link
                  href="/safety"
                  className="text-xs font-semibold text-[#8E929E] hover:text-white flex items-center justify-center gap-1.5 py-2 transition-colors"
                >
                  <span>View Full Safety Specs</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>

            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
