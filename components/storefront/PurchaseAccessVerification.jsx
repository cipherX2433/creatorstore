'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Loader2, ArrowLeft, AlertCircle, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'

export default function PurchaseAccessVerification({
  initialEmail = '',
  initialName = '',
  onSuccess,
  onCancel,
  variant = 'modal', // 'modal' | 'page'
}) {
  const [step, setStep] = useState('email') // 'email' | 'otp'
  const [name, setName] = useState(initialName)
  const [email, setEmail] = useState(initialEmail)
  const [nameError, setNameError] = useState('')
  const [emailError, setEmailError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // OTP state
  const [otpValues, setOtpValues] = useState(['', '', '', '', '', ''])
  const [otpError, setOtpError] = useState('')
  const [isVerifying, setIsVerifying] = useState(false)
  const [cooldownSeconds, setCooldownSeconds] = useState(0)

  const otpInputsRef = useRef([])
  const emailInputRef = useRef(null)
  const nameInputRef = useRef(null)

  // Focus name or email input on mount if on email step
  useEffect(() => {
    if (step === 'email') {
      if (!name) {
        nameInputRef.current?.focus()
      } else {
        emailInputRef.current?.focus()
      }
    }
  }, [step])

  // Focus first OTP input on step change
  useEffect(() => {
    if (step === 'otp') {
      setTimeout(() => {
        otpInputsRef.current[0]?.focus()
      }, 100)
    }
  }, [step])

  // Cooldown countdown timer
  useEffect(() => {
    if (cooldownSeconds <= 0) return
    const timer = setInterval(() => {
      setCooldownSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [cooldownSeconds])

  // Validate form
  const validateForm = () => {
    let isValid = true
    const trimmedName = (name || '').trim()
    if (!trimmedName) {
      setNameError('Please enter your name')
      isValid = false
    } else {
      setNameError('')
    }

    const trimmedEmail = (email || '').trim()
    if (!trimmedEmail) {
      setEmailError('Please enter an email address')
      isValid = false
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setEmailError('Please enter a valid email address')
      isValid = false
    } else {
      setEmailError('')
    }
    return isValid
  }

  // Handle Request OTP submission
  const handleEmailSubmit = async (e) => {
    e?.preventDefault()
    setNameError('')
    setEmailError('')

    if (!validateForm()) {
      return
    }

    const cleanEmail = email.trim().toLowerCase()
    const cleanName = name.trim()

    setIsSubmitting(true)
    try {
      const res = await fetch('/api/purchases/access/request-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: cleanName, email: cleanEmail }),
      })
      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        if (res.status === 429 && data.cooldownSeconds) {
          setCooldownSeconds(data.cooldownSeconds)
          setStep('otp')
          toast.info(data.error || 'Please wait before requesting another code.')
          return
        }
        throw new Error(data.error || 'Unable to send verification code. Please try again.')
      }

      // Success
      toast.success('Verification code sent to your email.')
      setCooldownSeconds(data.cooldownSeconds || 60)
      setOtpValues(['', '', '', '', '', ''])
      setOtpError('')
      setStep('otp')
    } catch (error) {
      setEmailError(error.message)
      toast.error(error.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handle OTP digit change
  const handleOtpChange = (index, value) => {
    // Only accept numeric digits
    const cleaned = value.replace(/\D/g, '')
    setOtpError('')

    if (cleaned.length > 1) {
      // User pasted or multi-char input in single field
      handleOtpPasteString(cleaned)
      return
    }

    const nextValues = [...otpValues]
    nextValues[index] = cleaned
    setOtpValues(nextValues)

    // Advance to next box if digit entered
    if (cleaned && index < 5) {
      otpInputsRef.current[index + 1]?.focus()
    }
  }

  // Handle backspace / keyboard navigation
  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace') {
      if (!otpValues[index] && index > 0) {
        otpInputsRef.current[index - 1]?.focus()
      } else {
        const nextValues = [...otpValues]
        nextValues[index] = ''
        setOtpValues(nextValues)
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      e.preventDefault()
      otpInputsRef.current[index - 1]?.focus()
    } else if (e.key === 'ArrowRight' && index < 5) {
      e.preventDefault()
      otpInputsRef.current[index + 1]?.focus()
    }
  }

  // Handle Paste
  const handleOtpPaste = (e) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text')
    handleOtpPasteString(pasted)
  }

  const handleOtpPasteString = (str) => {
    const digits = str.replace(/\D/g, '').slice(0, 6).split('')
    if (digits.length === 0) return

    const nextValues = ['', '', '', '', '', '']
    digits.forEach((d, i) => {
      if (i < 6) nextValues[i] = d
    })
    setOtpValues(nextValues)
    setOtpError('')

    // Focus last filled index or next empty
    const nextFocusIndex = Math.min(digits.length, 5)
    otpInputsRef.current[nextFocusIndex]?.focus()
  }

  const isOtpComplete = otpValues.every((v) => v !== '')

  // Handle Verify OTP submission
  const handleVerifyOtp = async (e) => {
    e?.preventDefault()
    if (!isOtpComplete) return

    const otpCode = otpValues.join('')
    setIsVerifying(true)
    setOtpError('')

    try {
      const res = await fetch('/api/purchases/access/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), otp: otpCode }),
      })
      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        if (data.expired) {
          throw new Error('Your code has expired. Request a new one.')
        }
        if (data.maxAttemptsExceeded) {
          throw new Error('Too many incorrect attempts. Please request a new code.')
        }
        throw new Error(data.error || 'Incorrect verification code. Please try again.')
      }

      // Success!
      toast.success('Email confirmed!')
      if (onSuccess) {
        onSuccess({ email: data.email || email.trim() })
      }
    } catch (error) {
      setOtpError(error.message)
      toast.error(error.message)
    } finally {
      setIsVerifying(false)
    }
  }

  // Handle Resend OTP
  const handleResendOtp = async () => {
    if (cooldownSeconds > 0 || isSubmitting) return

    setIsSubmitting(true)
    setOtpError('')
    try {
      const res = await fetch('/api/purchases/access/request-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      })
      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        throw new Error(data.error || 'Failed to resend code.')
      }

      toast.success('A new verification code has been sent.')
      setCooldownSeconds(data.cooldownSeconds || 60)
      setOtpValues(['', '', '', '', '', ''])
      otpInputsRef.current[0]?.focus()
    } catch (err) {
      toast.error(err.message)
      setOtpError(err.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const containerClasses =
    variant === 'modal'
      ? 'w-full flex flex-col items-center animate-in fade-in duration-200'
      : 'w-full max-w-[430px] mx-auto px-4 py-8 flex flex-col items-center animate-in fade-in duration-200'

  return (
    <div className={containerClasses}>
      {/* Brand Icon (Asterisk / Star) at top */}
      <div className="mb-6 flex items-center justify-center">
        <div className="h-9 w-9 rounded-full bg-zinc-950 text-white flex items-center justify-center font-bold text-base shadow-2xs">
          ✦
        </div>
      </div>

      {/* ============================================================ */}
      {/* SCREEN 1: ACCESS YOUR DOWNLOADS FORM                         */}
      {/* ============================================================ */}
      {step === 'email' && (
        <div className="w-full flex flex-col items-center">
          <h2 className="text-xl sm:text-2xl font-extrabold text-zinc-950 text-center tracking-tight leading-snug">
            Access your downloads
          </h2>

          <p className="text-xs sm:text-sm text-zinc-600 text-center mt-2 max-w-[340px] leading-relaxed">
            Enter your email to view products you&apos;ve previously purchased or downloaded.
          </p>

          <form onSubmit={handleEmailSubmit} className="w-full mt-6 space-y-4">
            {/* Name Input */}
            <div className="space-y-1.5 text-left">
              <label htmlFor="recovery-name" className="block text-xs font-bold text-zinc-800">
                Name<span className="text-red-500">*</span>
              </label>
              <input
                id="recovery-name"
                ref={nameInputRef}
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value)
                  if (nameError) setNameError('')
                }}
                placeholder="Your full name"
                disabled={isSubmitting}
                className={`w-full h-12 px-4 rounded-xl text-sm border bg-white transition-all outline-none ${
                  nameError
                    ? 'border-red-500 ring-2 ring-red-500/10'
                    : 'border-zinc-300 focus:border-zinc-950 focus:ring-2 focus:ring-zinc-950/10'
                }`}
                autoComplete="name"
              />
              {nameError && (
                <p className="text-xs text-red-600 font-medium mt-1 flex items-center gap-1 animate-in fade-in">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  <span>{nameError}</span>
                </p>
              )}
            </div>

            {/* Email Input */}
            <div className="space-y-1.5 text-left">
              <label htmlFor="recovery-email" className="block text-xs font-bold text-zinc-800">
                Email<span className="text-red-500">*</span>
              </label>
              <input
                id="recovery-email"
                ref={emailInputRef}
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  if (emailError) setEmailError('')
                }}
                placeholder="name@example.com"
                disabled={isSubmitting}
                className={`w-full h-12 px-4 rounded-xl text-sm border bg-white transition-all outline-none ${
                  emailError
                    ? 'border-red-500 ring-2 ring-red-500/10'
                    : 'border-zinc-300 focus:border-zinc-950 focus:ring-2 focus:ring-zinc-950/10'
                }`}
                autoComplete="email"
                autoCapitalize="none"
              />
              {emailError && (
                <p className="text-xs text-red-600 font-medium mt-1 flex items-center gap-1 animate-in fade-in">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  <span>{emailError}</span>
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting || !name.trim() || !email.trim()}
              className={`w-full rounded-full py-3.5 px-6 font-semibold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs ${
                !name.trim() || !email.trim()
                  ? 'bg-zinc-200 text-zinc-400 cursor-not-allowed'
                  : 'bg-zinc-950 hover:bg-black text-white active:scale-[0.99]'
              }`}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Sending code...</span>
                </>
              ) : (
                <span>Continue</span>
              )}
            </button>
          </form>

          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="mt-4 text-xs font-semibold text-zinc-500 hover:text-zinc-900 transition-colors cursor-pointer"
            >
              Cancel
            </button>
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/* SCREEN 2: 6-DIGIT OTP VERIFICATION                            */}
      {/* ============================================================ */}
      {step === 'otp' && (
        <div className="w-full flex flex-col items-center animate-in fade-in duration-200">
          <div className="w-full flex items-center justify-between mb-2">
            <button
              type="button"
              onClick={() => {
                setStep('email')
                setOtpError('')
              }}
              className="p-1 -ml-1 text-zinc-500 hover:text-zinc-900 transition-colors flex items-center gap-1 text-xs font-medium cursor-pointer"
              title="Change email"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back</span>
            </button>
            <span className="text-[11px] font-semibold text-zinc-500 truncate max-w-[200px]">
              {email}
            </span>
          </div>

          <h2 className="text-xl sm:text-2xl font-extrabold text-zinc-950 text-center tracking-tight leading-snug">
            Check your email
          </h2>

          <p className="text-xs sm:text-sm text-zinc-600 text-center mt-2 max-w-[340px] leading-relaxed">
            We sent a verification code to your email.
          </p>
          <p className="text-xs font-bold text-zinc-900 text-center mt-1">
            {email}
          </p>

          <form onSubmit={handleVerifyOtp} className="w-full mt-6 space-y-5">
            {/* 6 OTP Inputs */}
            <div className="flex items-center justify-center gap-2 sm:gap-2.5">
              {otpValues.map((digit, index) => (
                <input
                  key={index}
                  ref={(el) => (otpInputsRef.current[index] = el)}
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOtpChange(index, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(index, e)}
                  onPaste={handleOtpPaste}
                  disabled={isVerifying}
                  className={`w-10 h-13 sm:w-12 sm:h-14 text-center font-bold text-lg sm:text-xl rounded-xl border bg-white outline-none transition-all ${
                    otpError
                      ? 'border-red-500 ring-2 ring-red-500/10'
                      : digit
                      ? 'border-zinc-950 ring-1 ring-zinc-950/10 bg-zinc-50/50'
                      : 'border-zinc-300 focus:border-zinc-950 focus:ring-2 focus:ring-zinc-950/10'
                  }`}
                  aria-label={`Digit ${index + 1} of verification code`}
                />
              ))}
            </div>

            {otpError && (
              <p className="text-xs text-red-600 font-medium text-center flex items-center justify-center gap-1 animate-in fade-in">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                <span>{otpError}</span>
              </p>
            )}

            <button
              type="submit"
              disabled={!isOtpComplete || isVerifying}
              className={`w-full rounded-full py-3.5 px-6 font-semibold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs ${
                !isOtpComplete
                  ? 'bg-zinc-200 text-zinc-400 cursor-not-allowed'
                  : 'bg-zinc-950 hover:bg-black text-white active:scale-[0.99]'
              }`}
            >
              {isVerifying ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Verifying...</span>
                </>
              ) : (
                <span>Verify</span>
              )}
            </button>

            {/* Resend Cooldown Section & Change Email */}
            <div className="pt-2 text-center space-y-2 flex flex-col items-center">
              {cooldownSeconds > 0 ? (
                <p className="text-xs text-zinc-500 font-medium">
                  Resend code in {cooldownSeconds}s
                </p>
              ) : (
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={isSubmitting}
                  className="text-xs text-zinc-900 underline underline-offset-2 hover:text-black font-semibold transition-colors cursor-pointer"
                >
                  Resend code
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setStep('email')
                  setOtpError('')
                }}
                className="text-xs text-zinc-500 hover:text-zinc-900 transition-colors cursor-pointer"
              >
                Change email
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
