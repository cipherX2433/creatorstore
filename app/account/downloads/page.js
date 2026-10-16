'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { api } from '@/lib/clientApi'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Download, FileText, Lock, ArrowRight, HardDrive } from 'lucide-react'
import {
  trackDownloadStarted,
  trackDownloadCompleted,
  trackDownloadFailed,
} from '@/lib/analytics'

export default function CustomerDownloadsPage() {
  const [downloads, setDownloads] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/account/downloads')
      .then((res) => setDownloads(res.downloads || []))
      .catch(() => setDownloads([]))
      .finally(() => setLoading(false))
  }, [])

  function formatBytes(bytes) {
    if (!bytes) return ''
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl sm:text-3xl font-black text-[#F4F2EC] tracking-tight">My Digital Downloads</h1>
        <p className="text-xs sm:text-sm text-[rgba(244,242,236,0.68)] font-medium mt-1">
          Access and download your purchased digital products securely.
        </p>
      </div>

      {loading ? (
        <div className="grid gap-6 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-48 w-full rounded-3xl" />
          ))}
        </div>
      ) : !downloads || downloads.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-16 text-center bg-[#12141c] rounded-3xl border border-dashed border-white/10 space-y-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
            <Download className="h-8 w-8" />
          </div>
          <div className="space-y-1 max-w-sm">
            <h3 className="text-lg font-extrabold text-[#F4F2EC]">No downloads available</h3>
            <p className="text-xs text-[rgba(244,242,236,0.68)] font-medium leading-relaxed">
              You haven’t purchased any digital downloads yet.
            </p>
          </div>
          <Link href="/account/library">
            <Button variant="outline" className="text-xs font-bold rounded-xl">
              Browse Library
            </Button>
          </Link>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2">
          {downloads.map((item) => (
            <div
              key={item.id}
              className="flex flex-col justify-between rounded-3xl border border-white/10 bg-[#12141c] p-6 shadow-sm hover:shadow-md transition-all space-y-5"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                    <FileText className="h-5 w-5" />
                  </div>
                  <span className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full bg-slate-100 text-[rgba(244,242,236,0.68)]">
                    <Lock className="h-3 w-3" /> Secure Token Gated
                  </span>
                </div>

                <div className="space-y-1">
                  <h3 className="font-extrabold text-base text-[#F4F2EC]">{item.title}</h3>
                  <p className="text-xs text-[rgba(244,242,236,0.68)] font-medium line-clamp-2 leading-relaxed">
                    {item.description || 'Digital download asset.'}
                  </p>
                </div>

                <div className="pt-2 flex items-center justify-between text-xs text-[rgba(244,242,236,0.68)] font-semibold border-t border-white/10">
                  <span>Creator: {item.creatorName}</span>
                  {item.fileSize && <span>{formatBytes(item.fileSize)}</span>}
                </div>
              </div>

              {/* DOWNLOAD ASSET BUTTON */}
              <Button
                onClick={async () => {
                  trackDownloadStarted({ product_id: item.id })
                  try {
                    const response = await fetch('/api/download', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      credentials: 'same-origin',
                      body: JSON.stringify({ productId: item.id }),
                    })
                    if (!response.ok) {
                      throw new Error('Download failed. Please try again.')
                    }
                    let fileName = item.fileName || 'download'
                    const disposition = response.headers.get('content-disposition')
                    if (disposition && disposition.includes('filename')) {
                      const match = disposition.match(/filename\*?=['"]?(?:UTF-\d['"]*)?([^;\r\n"']*)['"]?/i)
                      if (match && match[1]) fileName = decodeURIComponent(match[1].trim())
                    }
                    const blob = await response.blob()
                    const blobUrl = window.URL.createObjectURL(blob)
                    const link = document.createElement('a')
                    link.href = blobUrl
                    link.setAttribute('download', fileName)
                    document.body.appendChild(link)
                    link.click()
                    document.body.removeChild(link)
                    window.URL.revokeObjectURL(blobUrl)
                    trackDownloadCompleted({ product_id: item.id })
                  } catch (err) {
                    console.error('Download failed:', err)
                    trackDownloadFailed({ product_id: item.id, reason: err.message })
                  }
                }}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl gap-2 shadow-md shadow-blue-500/20 cursor-pointer"
              >
                <Download className="h-4 w-4" /> Download Asset
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
