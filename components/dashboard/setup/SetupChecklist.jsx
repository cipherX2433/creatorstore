'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Check, ChevronDown, X } from 'lucide-react'
import { api } from '@/lib/clientApi'
import { useDashboard } from '@/components/dashboard/DashboardContext'
import { SETUP_TASKS, deriveSetupProgress } from '@/lib/setupChecklist'
import NameBioModal from './NameBioModal'
import ProfileImageModal from './ProfileImageModal'
import SocialIconPickerModal from './SocialIconPickerModal'
import AddFirstItemModal from './AddFirstItemModal'
import CustomizeDesignModal from './CustomizeDesignModal'
import ShareStoreModal from '@/components/dashboard/ShareStoreModal'

function ProgressRing({ pct, size = 44 }) {
  const r = 16
  const c = 2 * Math.PI * r
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox="0 0 40 40" className="-rotate-90">
        <circle cx="20" cy="20" r={r} fill="none" className="stroke-edge" strokeWidth="3.5" />
        <circle
          cx="20"
          cy="20"
          r={r}
          fill="none"
          className="stroke-brand"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct / 100)}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-content-primary">
        {pct}%
      </span>
    </div>
  )
}

export default function SetupChecklist({ compact = false, variant = 'standard', collapsed = false }) {
  const { me, refreshMe, updateProfile, updateStore } = useDashboard()
  const wrapRef = useRef(null)
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState({ left: 248, bottom: 96 })
  const [expanded, setExpanded] = useState([])
  const [storeFull, setStoreFull] = useState(me?.store || null)
  const [products, setProducts] = useState([])
  const [igConnected, setIgConnected] = useState(false)
  const [modal, setModal] = useState(null)

  const load = useCallback(async () => {
    try {
      const [s, p, ig] = await Promise.all([
        api.get('/store').catch(() => null),
        api.get('/products').catch(() => null),
        api.get('/integrations/instagram/account').catch(() => null),
      ])
      if (s?.store) setStoreFull(s.store)
      const list = p?.products || p || []
      setProducts(Array.isArray(list) ? list : [])
      setIgConnected(!!(ig?.account?.connected || ig?.connected))
    } catch { /* ignore */ }
  }, [])

  useEffect(() => { load() }, [load])

  const progress = deriveSetupProgress({
    profile: me?.profile,
    store: storeFull || me?.store,
    products,
    igConnected,
  })

  useEffect(() => {
    if (!open) return
    const first = SETUP_TASKS.find((t) => !progress.done[t.id])
    if (first) setExpanded((e) => (e.length ? e : [first.id]))
  }, [open, progress.done])

  function openPanel() {
    const el = wrapRef.current
    if (el) {
      const r = el.getBoundingClientRect()
      setPos({
        left: Math.min(r.right + 10, window.innerWidth - 360),
        bottom: Math.max(16, window.innerHeight - r.bottom),
      })
    }
    setOpen(true)
  }

  async function afterSave(patch = {}) {
    if (patch.profile) updateProfile(patch.profile)
    if (patch.store) updateStore(patch.store)
    await Promise.all([refreshMe(), load()])
  }

  if (progress.allDone) return null

  const pct = Math.round((progress.completedCount / progress.total) * 100)

  return (
    <div ref={wrapRef} className="relative shrink-0">
      {variant === 'card' ? (
        collapsed ? (
          <div className="h-12 flex items-center justify-center group relative">
            <button
              type="button"
              onClick={openPanel}
              className="p-2 text-content-muted hover:text-content-primary rounded-[8px] hover:bg-surface-elevated cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              aria-label="Setup checklist"
              title="Finish your setup"
            >
              <ProgressRing pct={pct} size={32} />
            </button>
          </div>
        ) : (
          <div className="p-3">
            <div className="rounded-[18px] bg-secondary text-secondary-foreground p-4 space-y-2 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-xs font-black uppercase tracking-wider text-secondary-foreground">
                  Finish your setup
                </p>
                <span className="text-[10px] font-bold bg-secondary-foreground/15 px-2 py-0.5 rounded-full text-secondary-foreground">
                  {progress.completedCount} of {progress.total}
                </span>
              </div>
              <p className="text-xs font-medium text-secondary-foreground/85 leading-snug">
                Complete a few steps to start growing your audience.
              </p>
              <button
                type="button"
                onClick={openPanel}
                className="w-full py-2 px-3 rounded-full bg-sidebar text-sidebar-foreground hover:bg-surface-elevated text-xs font-bold transition-colors cursor-pointer text-center block mt-2 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              >
                Finish setup →
              </button>
            </div>
          </div>
        )
      ) : (
        <div className={`${compact ? 'px-2 py-2' : 'px-4 py-3'} border-t border-edge`}>
          <div className="flex items-start gap-3">
            <ProgressRing pct={pct} size={compact ? 40 : 44} />
            <div className="min-w-0 flex-1">
              <p className="text-label text-content-primary">Your setup checklist</p>
              <p className="text-micro text-content-muted">{progress.completedCount} of {progress.total} complete</p>
              <button
                type="button"
                onClick={openPanel}
                className="mt-2 h-8 px-3 rounded-control bg-brand text-brand-fg text-micro font-semibold hover:bg-brand-hover cursor-pointer"
              >
                Finish setup
              </button>
            </div>
          </div>
        </div>
      )}

      {open && (
        <>
          {!modal && (
            <button type="button" className="fixed inset-0 z-40 cursor-default bg-transparent" aria-label="Close checklist" onClick={() => setOpen(false)} />
          )}
          <div
            className="fixed z-40 w-[min(340px,calc(100vw-24px))] max-h-[min(520px,70vh)] overflow-y-auto rounded-modal border border-edge bg-surface-overlay shadow-modal"
            style={{ left: compact ? 12 : pos.left, bottom: pos.bottom }}
          >
            <div className="sticky top-0 bg-surface-overlay px-4 pt-4 pb-3 border-b border-edge">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-label text-content-primary">Your setup checklist</p>
                  <span className="text-micro text-content-muted">{progress.completedCount}/{progress.total}</span>
                </div>
                <button type="button" onClick={() => setOpen(false)} className="p-1 text-content-muted hover:text-content-primary cursor-pointer">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="mt-3 h-1 rounded-full bg-edge overflow-hidden">
                <div className="h-full bg-brand" style={{ width: `${pct}%` }} />
              </div>
            </div>

            <div className="p-2">
              {SETUP_TASKS.map((task) => {
                const done = progress.done[task.id]
                const isOpen = expanded.includes(task.id)
                return (
                  <div key={task.id} className={`rounded-control ${done ? 'opacity-70' : ''}`}>
                    <button
                      type="button"
                      onClick={() => setExpanded((ids) => (ids.includes(task.id) ? ids.filter((i) => i !== task.id) : [...ids, task.id]))}
                      className="w-full flex items-center gap-2.5 px-2 py-2.5 text-left cursor-pointer"
                    >
                      <span className={`h-5 w-5 rounded-full border flex items-center justify-center shrink-0 ${done ? 'bg-success border-success' : 'border-edge'}`}>
                        {done && <Check className="h-3 w-3 text-brand-fg" />}
                      </span>
                      <span className={`flex-1 text-label ${done ? 'text-content-muted font-normal' : 'text-content-primary'}`}>{task.title}</span>
                      <ChevronDown className={`h-4 w-4 text-content-muted transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                    </button>
                    {isOpen && !done && (
                      <div className="px-9 pb-3 space-y-2">
                        <p className="text-meta text-content-muted">{task.description}</p>
                        <button
                          type="button"
                          onClick={() => setModal(task.id)}
                          className="h-9 px-3 rounded-control bg-brand text-brand-fg text-micro font-semibold hover:bg-brand-hover cursor-pointer"
                        >
                          {task.action}
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </>
      )}

      <NameBioModal
        open={modal === 'nameBio'}
        onOpenChange={(v) => !v && setModal(null)}
        profile={me?.profile}
        store={storeFull || me?.store}
        onSaved={async ({ title, bio }) => {
          updateProfile({ name: title, bio })
          updateStore({ theme: { ...(storeFull?.theme || me?.store?.theme || {}), headerTitle: title, headerBio: bio } })
          await afterSave()
        }}
      />
      <ProfileImageModal
        open={modal === 'profileImage'}
        onOpenChange={(v) => !v && setModal(null)}
        avatarUrl={storeFull?.theme?.avatarUrl || storeFull?.avatarUrl || me?.profile?.avatarUrl}
        store={storeFull || me?.store}
        onSaved={async (url) => {
          updateProfile({ avatarUrl: url })
          await afterSave()
        }}
      />
      <SocialIconPickerModal
        open={modal === 'socials'}
        onOpenChange={(v) => !v && setModal(null)}
        profile={me?.profile}
        onSaved={async (socialLinks) => {
          updateProfile({ socialLinks })
          await afterSave()
        }}
      />
      <AddFirstItemModal
        open={modal === 'firstItem'}
        onOpenChange={(v) => !v && setModal(null)}
        store={storeFull || me?.store}
        onSaved={async (sections) => {
          setStoreFull((s) => ({ ...(s || {}), sections }))
          await afterSave()
        }}
      />
      <CustomizeDesignModal
        open={modal === 'design'}
        onOpenChange={(v) => !v && setModal(null)}
        store={storeFull || me?.store}
        onSaved={async (theme) => {
          setStoreFull((s) => ({ ...(s || {}), theme }))
          updateStore({ theme })
          await afterSave()
        }}
      />
      <ShareStoreModal
        open={modal === 'share'}
        onOpenChange={(v) => !v && setModal(null)}
        username={me?.store?.username || me?.store?.slug}
        onShared={async () => {
          const theme = { ...(storeFull?.theme || me?.store?.theme || {}), setupShareComplete: true }
          await api.patch('/store', { theme })
          setStoreFull((s) => ({ ...(s || {}), theme }))
          updateStore({ theme })
          await afterSave()
          setModal(null)
        }}
      />
    </div>
  )
}
