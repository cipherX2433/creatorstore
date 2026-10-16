import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Store, Clock, AlertTriangle } from 'lucide-react'

function Shell({ icon: Icon, title, children, iconClass = 'bg-primary/10 text-primary' }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-surface-base text-content-primary p-6 text-center">
      <div className="max-w-md w-full bg-surface-card p-8 rounded-modal border border-edge shadow-modal space-y-4">
        <div className={`h-16 w-16 ${iconClass} rounded-2xl flex items-center justify-center mx-auto`}>
          <Icon className="h-8 w-8" />
        </div>
        <h1 className="text-2xl font-black tracking-tight">{title}</h1>
        <div className="text-sm text-content-secondary leading-relaxed space-y-2">{children}</div>
        <div className="pt-2">
          <Link href="/">
            <Button className="w-full font-bold bg-brand text-brand-fg hover:bg-brand-hover rounded-full">
              Go to CreatorStore Home
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}

export function StoreNotFound({ username }) {
  return (
    <Shell icon={Store} title="Store Not Found">
      <p>
        The storefront <span className="font-bold text-content-primary">@{username}</span> does not exist or has been removed.
      </p>
    </Shell>
  )
}

export function StoreUnpublished({ username }) {
  return (
    <Shell icon={Clock} title="This storefront isn’t live yet." iconClass="bg-amber-50 text-amber-700">
      <p>
        <span className="font-bold text-content-primary">@{username}</span> exists, but the creator hasn’t published it.
      </p>
    </Shell>
  )
}

export function StoreInactive({ username }) {
  return (
    <Shell icon={Store} title="Storefront unavailable" iconClass="bg-zinc-100 text-zinc-600">
      <p>
        This storefront is currently inactive.
      </p>
    </Shell>
  )
}

export function StoreLookupError() {
  return (
    <Shell icon={AlertTriangle} title="Something went wrong" iconClass="bg-red-50 text-red-700">
      <p>We couldn’t load this storefront right now. Please try again in a moment.</p>
    </Shell>
  )
}
