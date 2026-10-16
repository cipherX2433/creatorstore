'use client'

import Link from 'next/link'

export default function AuthShell({ title, subtitle, children }) {
  return (
    <div className="min-h-screen bg-surface-base text-content-primary flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md bg-surface-card border border-edge rounded-modal p-6 sm:p-8 space-y-6">
        <div className="text-center space-y-2">
          <Link href="/" className="inline-block text-xl font-black tracking-tight text-content-primary mb-2">
            Creator<span className="text-brand">Store</span>
          </Link>
          <h1 className="text-page-title text-content-primary">{title}</h1>
          {subtitle && <p className="text-meta text-content-muted">{subtitle}</p>}
        </div>
        {children}
      </div>
    </div>
  )
}
