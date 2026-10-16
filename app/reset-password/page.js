'use client'

import { Suspense, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { api } from '@/lib/clientApi'
import { Loader2, CheckCircle2, Circle } from 'lucide-react'

function AuthShell({ children, title, subtitle }) {
  return (
    <div className="min-h-screen bg-[#FFFFFF] flex flex-col items-center justify-center p-4 sm:p-6 text-[#0D0D0D]">
      <div className="w-full max-w-[420px] space-y-6">
        <div className="text-center space-y-1.5">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#0D0D0D]">{title}</h1>
          {subtitle && <p className="text-sm text-[#737373]">{subtitle}</p>}
        </div>
        {children}
      </div>
    </div>
  )
}

function ResetForm() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  const pwdChecks = [
    { label: 'At least 6 characters', valid: password.length >= 6 },
    { label: 'At least 1 letter', valid: /[a-zA-Z]/.test(password) },
    { label: 'At least 1 number', valid: /[0-9]/.test(password) },
    { label: 'At least 1 special character (!@#$...)', valid: /[^a-zA-Z0-9]/.test(password) },
  ]

  async function onSubmit(e) {
    e.preventDefault()
    if (password !== confirmPassword) {
      toast.error('Passwords do not match')
      return
    }
    const pwdErr = validatePassword(password)
    if (pwdErr) {
      toast.error(pwdErr)
      return
    }
    setLoading(true)
    try {
      await api.post('/auth/reset-password', { token, newPassword: password })
      setDone(true)
      toast.success('Password reset successfully!')
    } catch (err) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (!token) {
    return (
      <div className="space-y-4 text-center py-4">
        <p className="text-sm text-destructive">Invalid or missing reset token.</p>
        <Link href="/forgot-password"><Button variant="outline" className="w-full">Request new reset link</Button></Link>
      </div>
    )
  }

  return done ? (
    <div className="space-y-4 text-center py-4">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
        <CheckCircle2 className="h-6 w-6" />
      </div>
      <p className="text-sm font-medium">Your password has been updated!</p>
      <Button onClick={() => router.push('/login')} className="w-full">Log in with new password</Button>
    </div>
  ) : (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="password">New Password</Label>
        <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Min 6 chars, 1 letter, 1 number, 1 symbol" required />
        {password.length > 0 && (
          <div className="grid grid-cols-2 gap-1.5 pt-1.5 text-xs">
            {pwdChecks.map((check, idx) => (
              <div key={idx} className={`flex items-center gap-1.5 ${check.valid ? 'text-emerald-600 font-medium' : 'text-slate-400'}`}>
                {check.valid ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" /> : <Circle className="h-3.5 w-3.5 text-slate-300 shrink-0" />}
                <span className="text-[11px] leading-tight">{check.label}</span>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="confirmPassword">Confirm New Password</Label>
        <Input id="confirmPassword" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Confirm password" required />
      </div>
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Set new password'}
      </Button>
    </form>
  )
}

export default function ResetPasswordPage() {
  return (
    <AuthShell title="Set new password" subtitle="Choose a strong password for your account.">
      <Suspense fallback={<div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>}>
        <ResetForm />
      </Suspense>
    </AuthShell>
  )
}
