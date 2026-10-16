'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { api } from '@/lib/clientApi'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ArrowLeft, Image as ImageIcon, Video, Instagram } from 'lucide-react'

export default function PostReelPicker({ selectedMediaId, onSelect, onBack }) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [mediaList, setMediaList] = useState([])

  useEffect(() => {
    fetchMedia()
  }, [])

  async function fetchMedia() {
    setLoading(true)
    setError(null)
    try {
      const res = await api.get('/integrations/instagram/media')
      const items = Array.isArray(res) ? res : (res?.media || res?.items || [])
      setMediaList(items)
    } catch (err) {
      console.error('Failed to fetch Instagram media:', err)
      setError(err.message || "Couldn't load your Instagram posts.")
    } finally {
      setLoading(false)
    }
  }

  function pickAny() {
    onSelect({ id: 'ALL', caption: 'All Posts & Reels', mediaType: 'ALL', mediaUrl: '' })
  }

  function pickItem(item) {
    onSelect({
      id: item.id,
      caption: item.caption,
      mediaType: item.mediaType,
      mediaUrl: item.mediaUrl,
    })
  }

  const anySelected = selectedMediaId === 'ALL' || !selectedMediaId

  return (
    <div className="flex flex-col gap-stack">
      <div className="flex items-center gap-inline">
        <button
          type="button"
          onClick={onBack}
          className="p-2 rounded-control text-content-muted hover:text-content-primary hover:bg-surface-hover"
          aria-label="Back to Trigger"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h2 className="text-section text-content-primary">Select a Post or Reel</h2>
          <p className="text-meta text-content-muted">Tap a thumbnail to use it as the trigger.</p>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-inline">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="aspect-square w-full rounded-control bg-surface-raised" />
          ))}
        </div>
      ) : error ? (
        <div className="bg-surface-raised border border-edge rounded-card p-card-lg text-center flex flex-col items-center gap-stack">
          <ImageIcon className="h-10 w-10 text-content-muted" />
          <div>
            <h4 className="text-card-title text-content-primary">Couldn&apos;t load your Instagram posts</h4>
            <p className="text-meta text-content-muted mt-1">{error}</p>
          </div>
          <Button type="button" variant="outline" onClick={fetchMedia} className="rounded-control border-edge text-content-primary">
            Try again
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-inline">
          <button
            type="button"
            onClick={pickAny}
            className={`aspect-square rounded-control border flex flex-col items-center justify-center gap-field p-card text-center ${
              anySelected ? 'border-edge-focus bg-surface-raised' : 'border-edge bg-surface-raised hover:bg-surface-hover'
            }`}
          >
            <ImageIcon className="h-6 w-6 text-brand" />
            <span className="text-label text-content-primary">Any Post or Reel</span>
            <span className="text-meta text-content-muted">Default for all content</span>
          </button>

          {mediaList.length === 0 ? (
            <div className="col-span-2 sm:col-span-2 flex flex-col items-center justify-center text-center gap-stack p-card-lg">
              <div className="h-16 w-16 rounded-full bg-surface-raised border border-edge flex items-center justify-center text-brand">
                <Instagram className="h-8 w-8" />
              </div>
              <div>
                <h4 className="text-card-title text-content-primary">No posts or reels found</h4>
                <p className="text-meta text-content-muted mt-1">
                  Post content on your connected Instagram account, or connect Instagram first.
                </p>
              </div>
              <Link href="/dashboard/settings/connected-accounts" className="text-meta text-brand hover:text-brand-hover">
                Connected accounts
              </Link>
            </div>
          ) : (
            mediaList.map((item) => {
              const isSelected = selectedMediaId === item.id
              const isReel = item.mediaType === 'REEL'
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => pickItem(item)}
                  className={`relative aspect-square rounded-control overflow-hidden border ${
                    isSelected ? 'border-edge-focus' : 'border-edge hover:border-edge-strong'
                  }`}
                >
                  {item.mediaUrl ? (
                    <img src={item.mediaUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="h-full w-full bg-surface-raised flex items-center justify-center text-content-muted">
                      {isReel ? <Video className="h-8 w-8" /> : <ImageIcon className="h-8 w-8" />}
                    </div>
                  )}
                  <span className="absolute bottom-2 left-2 text-micro bg-surface-overlay/80 text-content-primary px-2 py-0.5 rounded-chip">
                    {isReel ? 'Reel' : 'Post'}
                  </span>
                </button>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}
