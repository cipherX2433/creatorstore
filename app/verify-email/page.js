'use client'

import { Suspense, useEffect, useState, useRef } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import { Loader2, CheckCircle2, AlertCircle, Mail, ArrowRight, RefreshCw, Pencil } from 'lucide-react'
import { api } from '@/lib/clientApi'
import { useAuth } from '@/components/auth/AuthContext'
import CreatorStoreBrand from '@/components/brand/CreatorStoreBrand'
import { getRequestedReturnUrl, getPostAuthDestination } from '@/lib/redirectUtils'

function VerifyEmailContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { refresh } = useAuth()
  const emailParam = searchParams.get('email')
  const requestedDestination = getRequestedReturnUrl(searchParams)

  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [status, setStatus] = useState('input') // 'input' | 'success'
  const [errorMessage, setErrorMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [resending, setResending] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)
  const [isEditingEmail, setIsEditingEmail] = useState(false)
  const [tempEmail, setTempEmail] = useState('')
  const [redirectPath, setRedirectPath] = useState('/dashboard/store')

  const inputRefs = useRef([])

  // Load email from query param or session storage
  useEffect(() => {
    if (emailParam) {
      setEmail(emailParam)
      setTempEmail(emailParam)
    } else if (typeof window !== 'undefined') {
      const stored = sessionStorage.getItem('creatorstore_pending_email') || ''
      if (stored) {
        setEmail(stored)
        setTempEmail(stored)
      } else {
        setIsEditingEmail(true)
      }
    }
  }, [emailParam])

  // Auto-focus first OTP input on mount
  useEffect(() => {
    if (status === 'input' && !isEditingEmail) {
      inputRefs.current[0]?.focus()
    }
  }, [status, isEditingEmail])

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return
    const timer = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0))
    }, 1000)
    return () => clearInterval(timer)
  }, [resendCooldown])

  function handleDigitChange(index, value) {
    setErrorMessage('')
    // Keep only numeric characters
    const clean = value.replace(/\D/g, '')
    if (!clean) {
      const nextOtp = [...otp]
      nextOtp[index] = ''
      setOtp(nextOtp)
      return
    }

    const nextOtp = [...otp]
    // If multiple digits typed/autofilled into a single box
    if (clean.length > 1) {
      const digits = clean.slice(0, 6).split('')
      digits.forEach((d, i) => {
        if (index + i < 6) nextOtp[index + i] = d
      })
      setOtp(nextOtp)
      const nextFocus = Math.min(index + digits.length, 5)
      inputRefs.current[nextFocus]?.focus()
      return
    }

    nextOtp[index] = clean.slice(-1)
    setOtp(nextOtp)

    // Move to next field if a digit was entered
    if (index < 5 && clean) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  function handleKeyDown(index, e) {
    if (e.key === 'Backspace') {
      if (!otp[index] && index > 0) {
        const nextOtp = [...otp]
        nextOtp[index - 1] = ''
        setOtp(nextOtp)
        inputRefs.current[index - 1]?.focus()
      } else {
        const nextOtp = [...otp]
        nextOtp[index] = ''
        setOtp(nextOtp)
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      e.preventDefault()
      inputRefs.current[index - 1]?.focus()
    } else if (e.key === 'ArrowRight' && index < 5) {
      e.preventDefault()
      inputRefs.current[index + 1]?.focus()
    }
  }

  function handlePaste(e) {
    e.preventDefault()
    setErrorMessage('')
    const pasted = e.clipboardData.getData('text') || ''
    const digits = pasted.replace(/\D/g, '').slice(0, 6).split('')
    if (digits.length === 0) return

    const nextOtp = [...otp]
    digits.forEach((d, i) => {
      if (i < 6) nextOtp[i] = d
    })
    setOtp(nextOtp)

    const nextFocus = Math.min(digits.length, 5)
    inputRefs.current[nextFocus]?.focus()
  }

  async function onVerify(e) {
    if (e) e.preventDefault()
    const cleanEmail = String(email || '').trim()
    const code = otp.join('').trim()

    if (!cleanEmail) {
      toast.error('Please enter your email address')
      setIsEditingEmail(true)
      return
    }

    if (code.length !== 6) {
      setErrorMessage('Please enter all 6 digits of the verification code.')
      return
    }

    setLoading(true)
    setErrorMessage('')

    try {
      const res = await api.post('/auth/verify-email', {
        email: cleanEmail,
        otp: code,
      })

      // Immediately refresh authenticated context
      const me = await refresh().catch(() => null)
      const target = getPostAuthDestination({
        user: me?.user || res?.user,
        profile: me?.profile,
        requestedDestination,
      })
      setRedirectPath(target)
      setStatus('success')
      toast.success(res.message || 'Email verified successfully!')

      // Redirect smoothly
      setTimeout(() => {
        router.replace(target)
      }, 1000)
    } catch (err) {
      const msg = err.message || 'Verification failed. Please check the code and try again.'
      setErrorMessage(msg)
      toast.error(msg)
      inputRefs.current[0]?.focus()
    } finally {
      setLoading(false)
    }
  }

  async function onResend() {
    const cleanEmail = String(email || '').trim()
    if (!cleanEmail) {
      toast.error('Please enter your email address')
      setIsEditingEmail(true)
      return
    }

    if (resendCooldown > 0 || resending) return

    setResending(true)
    setErrorMessage('')

    try {
      const res = await api.post('/auth/resend-verification', { email: cleanEmail })
      setResendCooldown(60)
      if (res.alreadyVerified) {
        toast.success(res.message || 'Your email is already verified.')
        const me = await refresh().catch(() => null)
        const target = getPostAuthDestination({
          user: me?.user,
          profile: me?.profile,
          requestedDestination,
        })
        router.replace(target)
      } else {
        toast.success(res.message || 'New 6-digit code sent to your email.')
        setOtp(['', '', '', '', '', ''])
        inputRefs.current[0]?.focus()
      }
    } catch (err) {
      const msg = err.message || 'Failed to resend verification code'
      setErrorMessage(msg)
      toast.error(msg)
    } finally {
      setResending(false)
    }
  }

  function handleSaveCustomEmail(e) {
    e.preventDefault()
    const clean = String(tempEmail || '').trim()
    if (!clean || !clean.includes('@')) {
      toast.error('Please enter a valid email address')
      return
    }
    setEmail(clean)
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('creatorstore_pending_email', clean)
    }
    setIsEditingEmail(false)
    setOtp(['', '', '', '', '', ''])
  }

  const isOtpComplete = otp.every((d) => d.length === 1)

  // 1. Success State
  if (status === 'success') {
    const isToStoreOrDashboard = redirectPath === '/dashboard/store' || redirectPath.startsWith('/dashboard')
    const isToAccount = redirectPath.startsWith('/account')
    return (
      <main className="min-h-screen w-full bg-[#F2F5FE] text-[#010619] flex flex-col items-center justify-center px-4 sm:px-6 py-10 sm:py-16 selection:bg-[#194DF5] selection:text-white">
        <div className="w-full max-w-[440px] mx-auto flex flex-col items-center">
          
          <div className="mb-6 sm:mb-8 flex justify-center">
            <CreatorStoreBrand
              href="/"
              theme="light"
              size="md"
              wordmarkClassName="text-lg sm:text-xl tracking-tight font-extrabold text-[#010619]"
            />
          </div>

          <div className="w-full bg-[#FFFFFF] border border-[#D8DFFA] rounded-[20px] shadow-[0_4px_20px_rgba(23,23,23,0.04)] p-6 sm:p-8 text-center space-y-6">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#EAF8EF] text-[#22C55E]">
              <CheckCircle2 className="h-8 w-8 stroke-[2.5]" />
            </div>

            <div className="space-y-1.5">
              <h1 className="text-2xl sm:text-[26px] font-extrabold tracking-tight text-[#010619]">
                Email verified successfully!
              </h1>
              <p className="text-sm text-[#3A4060] font-medium leading-relaxed">
                {isToStoreOrDashboard
                  ? 'Your CreatorStore account is verified. Redirecting to your store...'
                  : (isToAccount
                      ? 'Your CreatorStore account is verified. Redirecting to your account...'
                      : 'Your CreatorStore account is verified. Redirecting to store setup...')}
              </p>
            </div>

            <button
              type="button"
              onClick={() => router.replace(redirectPath)}
              className="w-full h-[48px] rounded-full bg-[#194DF5] hover:bg-[#1441D9] text-white font-bold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>{isToStoreOrDashboard ? 'Go to Store' : (isToAccount ? 'Go to Account' : 'Continue to Onboarding')}</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </main>
    )
  }

  // 2. OTP Input State (Clean, White Card on #F2F5FE)
  return (
    <main className="min-h-screen w-full bg-[#F2F5FE] text-[#010619] flex flex-col items-center justify-center px-4 sm:px-6 py-10 sm:py-16 selection:bg-[#194DF5] selection:text-white">
      <div className="w-full max-w-[440px] mx-auto flex flex-col items-center">
        
        {/* 1. Subtle CreatorStore Logo / Brand */}
        <div className="mb-6 sm:mb-8 flex justify-center">
          <CreatorStoreBrand
            href="/"
            theme="light"
            size="md"
            wordmarkClassName="text-lg sm:text-xl tracking-tight font-extrabold text-[#010619]"
          />
        </div>

        {/* 2. Unified #FFFFFF Card Container */}
        <div className="w-full bg-[#FFFFFF] border border-[#D8DFFA] rounded-[20px] shadow-[0_4px_20px_rgba(23,23,23,0.04)] p-6 sm:p-8">

          {/* Horizontal Progress Indicator (Step 2: Completed Step 1 + Active Step 2) */}
          <div className="mb-6 flex items-center justify-center gap-1.5" aria-label="Onboarding Progress: Step 2 of 2">
            <div className="w-12 sm:w-14 h-1 rounded-full bg-[#194DF5] transition-all" />
            <div className="w-12 sm:w-14 h-1 rounded-full bg-[#194DF5] transition-all" />
          </div>

          {/* Small Centered Mail Icon in Subtle Blue Circle */}
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#E8EEFF] text-[#194DF5] mb-3.5">
            <Mail className="h-5 w-5" />
          </div>

          {/* Heading & Subtitle */}
          <div className="text-center mb-6 space-y-1.5 w-full">
            <h1 className="text-2xl sm:text-[26px] font-extrabold tracking-tight text-[#010619] leading-tight flex items-center justify-center gap-1.5 flex-wrap">
              <span>Verify your email</span>
              <span>✉️</span>
            </h1>
            <p className="text-sm font-medium text-[#3A4060]">
              We&apos;ve sent a 6-digit verification code to your email.
            </p>

            {/* Email Container Pill */}
            <div className="pt-2 flex justify-center">
              {isEditingEmail ? (
                <form onSubmit={handleSaveCustomEmail} className="w-full p-2.5 rounded-[12px] bg-[#EEF1FB] border border-[#D8DFFA] space-y-2">
                  <label htmlFor="custom-email-input" className="block text-[11px] font-bold text-[#3A4060] uppercase tracking-wider text-left">
                    Your Email Address
                  </label>
                  <div className="flex gap-2">
                    <input
                      id="custom-email-input"
                      type="email"
                      value={tempEmail}
                      onChange={(e) => setTempEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="flex-1 h-9 px-3 rounded-[8px] bg-[#FFFFFF] border border-[#D8DFFA] text-sm text-[#010619] placeholder:text-[#6B7399] outline-none focus:border-[#194DF5]"
                      required
                    />
                    <button
                      type="submit"
                      className="px-3.5 h-9 rounded-full bg-[#194DF5] text-white text-xs font-bold hover:bg-[#1441D9] cursor-pointer transition-colors shrink-0"
                    >
                      Save
                    </button>
                  </div>
                </form>
              ) : (
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#EEF1FB] border border-[#D8DFFA] text-xs font-medium text-[#010619] max-w-full">
                  <span className="truncate max-w-[220px] sm:max-w-[260px]">
                    {email || 'No email specified'}
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsEditingEmail(true)}
                    className="text-xs text-[#194DF5] hover:underline font-bold shrink-0 cursor-pointer inline-flex items-center gap-0.5"
                  >
                    <Pencil className="w-3 h-3" />
                    <span>Change</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Error Banner */}
          {errorMessage && (
            <div className="w-full mb-5 p-3 rounded-[12px] bg-[#FDECEC] border border-[#EF4444]/20 text-[#EF4444] text-xs flex items-center gap-2 font-medium">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* 6-Digit OTP Inputs Form */}
          <form onSubmit={onVerify} className="w-full space-y-5">
            <div className="flex justify-center gap-2 sm:gap-2.5" onPaste={handlePaste}>
              {otp.map((digit, index) => (
                <input
                  key={index}
                  ref={(el) => { inputRefs.current[index] = el }}
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={1}
                  autoComplete="one-time-code"
                  aria-label={`Digit ${index + 1} of 6`}
                  value={digit}
                  onChange={(e) => handleDigitChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  className={`w-11 h-12 sm:w-12 sm:h-13 text-center text-xl font-bold rounded-[12px] bg-[#FFFFFF] border text-[#010619] outline-none transition-all ${
                    digit
                      ? 'border-[#194DF5] bg-[#E8EEFF]/40 ring-2 ring-[#E8EEFF]'
                      : 'border-[#D8DFFA]'
                  } focus:border-[#194DF5] focus:ring-2 focus:ring-[#E8EEFF]`}
                />
              ))}
            </div>

            {/* Verify Button */}
            <div>
              <button
                type="submit"
                disabled={!isOtpComplete || loading}
                className={`w-full h-[48px] rounded-full font-bold text-sm transition-all duration-200 flex items-center justify-center ${
                  isOtpComplete && !loading
                    ? 'bg-[#194DF5] hover:bg-[#1441D9] text-white cursor-pointer active:scale-[0.99]'
                    : 'bg-[#EEF1FB] text-[#6B7399] border border-[#D8DFFA] cursor-not-allowed'
                }`}
              >
                {loading ? (
                  <Loader2 className="h-5 w-5 animate-spin text-white" />
                ) : (
                  <span className="inline-flex items-center gap-1.5">
                    <span>Verify Email</span>
                    <ArrowRight className="h-4 w-4" />
                  </span>
                )}
              </button>
            </div>
          </form>

          {/* Resend OTP Section */}
          <div className="mt-5 text-center text-xs sm:text-sm text-[#3A4060]">
            <span>Didn&apos;t receive the code? </span>
            <button
              type="button"
              onClick={onResend}
              disabled={resending || resendCooldown > 0 || !email}
              className="font-bold text-[#194DF5] hover:underline disabled:text-[#6B7399] disabled:cursor-not-allowed cursor-pointer inline-flex items-center gap-1 transition-colors"
            >
              {resending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : resendCooldown > 0 ? (
                `Resend in ${resendCooldown}s`
              ) : (
                'Resend code'
              )}
            </button>
          </div>

          {/* Secondary Actions */}
          <div className="mt-6 pt-5 border-t border-[#D8DFFA] w-full flex items-center justify-between text-xs font-medium text-[#3A4060]">
            <Link href="/signup" className="text-[#194DF5] hover:underline font-semibold">
              Change email
            </Link>
            <Link href="/login" className="text-[#194DF5] hover:underline font-semibold">
              Already verified? Log in
            </Link>
          </div>
        </div>

      </div>
    </main>
  )
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#F2F5FE] flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-[#194DF5]" />
        </div>
      }
    >
      <VerifyEmailContent />
    </Suspense>
  )
}
