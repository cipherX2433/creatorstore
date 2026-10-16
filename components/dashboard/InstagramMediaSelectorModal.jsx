'use client'

import { useState, useEffect } from 'react'
import { api } from '@/lib/clientApi'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { BaseModal } from '@/components/ui/base-modal'
import { IconBadge, ICON_BADGE_COLORS } from '@/components/ui/icon-badge'
import { Search, Image as ImageIcon, Video, Calendar, Loader2, AlertTriangle, CheckCircle2 } from 'lucide-react'

export default function InstagramMediaSelectorModal({ isOpen, onClose, selectedMediaId, onSelectMedia }) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [mediaList, setMediaList] = useState([])
  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState('ALL') // ALL | POSTS | REELS

  useEffect(() => {
    if (isOpen) {
      fetchMedia()
    }
  }, [isOpen])

  async function fetchMedia() {
    setLoading(true)
    setError(null)
    try {
      const res = await api.get('/integrations/instagram/media')
      const items = Array.isArray(res) ? res : (res?.media || res?.items || [])
      setMediaList(items)
    } catch (err) {
      console.error('Failed to fetch Instagram media:', err)
      setError(err.message || 'Couldn\'t load your Instagram posts.')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  const filteredMedia = mediaList.filter((item) => {
    if (activeTab === 'POSTS' && item.mediaType !== 'POST') return false
    if (activeTab === 'REELS' && item.mediaType !== 'REEL') return false

    if (search.trim()) {
      const q = search.toLowerCase().trim()
      return (item.caption || '').toLowerCase().includes(q) || (item.mediaType || '').toLowerCase().includes(q)
    }
    return true
  })

  return (
    <BaseModal
      open={isOpen}
      onOpenChange={(next) => { if (!next) onClose?.() }}
      title="Select a Post or Reel"
      description="Choose the Instagram content where comments will trigger your DM automation."
      secondaryLabel="Close"
      onSecondary={onClose}
      className="sm:max-w-3xl"
    >

      {/* Filters & Search */}
      <div className="p-4 border-b border-[#E5E5E3] bg-[#FFFFFF] flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-[#F5F5F3] border border-[#E5E5E3] rounded-xl shrink-0">
          {['ALL', 'POSTS', 'REELS'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === tab
                  ? 'bg-[#1F1F1F] text-white shadow-xs'
                  : 'text-[#6F6F6B] hover:text-[#1F1F1F]'
              }`}
            >
              {tab === 'ALL' ? 'All Content' : tab === 'POSTS' ? 'Posts' : 'Reels'}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#999995]" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search captions..."
            className="pl-9 bg-[#FFFFFF] border-[#E5E5E3] text-xs text-[#1F1F1F] placeholder:text-[#999995] focus:border-[#1F1F1F]"
          />
        </div>
      </div>

      {/* Media Grid */}
      <div className="p-6 overflow-y-auto max-h-[60vh] bg-[#FFFFFF]">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 space-y-3">
            <Loader2 className="h-8 w-8 animate-spin text-[#1F1F1F]" />
            <p className="text-xs font-semibold text-[#6F6F6B]">Loading your Instagram posts...</p>
          </div>
        ) : error ? (
          <div className="bg-[#FEF2F2] border border-[#FCA5A5] p-6 rounded-2xl text-center space-y-3">
            <AlertTriangle className="h-8 w-8 text-[#DC2626] mx-auto" />
            <h4 className="text-sm font-bold text-[#991B1B]">Couldn't load your Instagram posts</h4>
            <p className="text-xs text-[#B91C1C]">{error}</p>
            <Button onClick={fetchMedia} variant="outline" className="border-[#E5E5E3] text-xs text-[#1F1F1F] hover:bg-[#F5F5F3]">
              Try Again
            </Button>
          </div>
        ) : filteredMedia.length === 0 ? (
          <div className="text-center py-12 space-y-3">
            <ImageIcon className="h-10 w-10 text-[#999995]/40 mx-auto" />
            <h4 className="text-sm font-bold text-[#1F1F1F]">No posts or reels found</h4>
            <p className="text-xs text-[#6F6F6B]">
              Post content on your connected Instagram account to attach specific automations.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">

            {/* Any Post or Reel option */}
            <div
              onClick={() => {
                onSelectMedia({ id: 'ALL', caption: 'All Posts & Reels', mediaType: 'ALL', mediaUrl: '' })
                onClose()
              }}
              className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex flex-col items-center justify-center text-center space-y-2 ${
                selectedMediaId === 'ALL' || !selectedMediaId
                  ? 'bg-[#F5F5F3] border-[#1F1F1F]'
                  : 'bg-[#FFFFFF] border-[#E5E5E3] hover:border-[#1F1F1F]'
              }`}
            >
              <div className="h-10 w-10 rounded-full bg-[#F2F1EF] flex items-center justify-center text-[#1F1F1F]">
                <ImageIcon className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-[#1F1F1F]">Any Post or Reel</h4>
                <p className="text-[10px] text-[#6F6F6B]">Triggers whenever keyword is commented on any content</p>
              </div>
            </div>

            {filteredMedia.map((item) => {
              const isSelected = selectedMediaId === item.id
              const isReel = item.mediaType === 'REEL'

              return (
                <div
                  key={item.id}
                  onClick={() => {
                    onSelectMedia(item)
                    onClose()
                  }}
                  className={`group relative rounded-xl border-2 overflow-hidden cursor-pointer transition-all flex flex-col justify-between ${
                    isSelected
                      ? 'bg-[#F5F5F3] border-[#1F1F1F]'
                      : 'bg-[#FFFFFF] border-[#E5E5E3] hover:border-[#1F1F1F]'
                  }`}
                >
                  {/* Media Image / Thumbnail */}
                  <div className="relative aspect-video sm:aspect-square bg-[#F2F1EF] overflow-hidden border-b border-[#E5E5E3]">
                    {item.mediaUrl ? (
                      <img
                        src={item.mediaUrl}
                        alt={item.caption}
                        className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center text-[#999995]">
                        {isReel ? <Video className="h-8 w-8" /> : <ImageIcon className="h-8 w-8" />}
                      </div>
                    )}

                    {/* Type Badge */}
                    <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase flex items-center gap-1 bg-[#1F1F1F] text-white">
                      {isReel ? <Video className="h-3 w-3" /> : <ImageIcon className="h-3 w-3" />}
                      {isReel ? 'Reel' : 'Post'}
                    </span>

                    {isSelected && (
                      <div className="absolute top-2 right-2 p-1 rounded-full bg-[#1F1F1F] text-white shadow-xs">
                        <CheckCircle2 className="h-4 w-4 stroke-[3]" />
                      </div>
                    )}
                  </div>

                  {/* Caption Preview */}
                  <div className="p-3 space-y-1">
                    <p className="text-xs font-bold text-[#1F1F1F] line-clamp-2">
                      {item.caption || 'Untitled Post'}
                    </p>
                    <span className="text-[10px] text-[#6F6F6B] flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {new Date(item.timestamp).toLocaleDateString()}
                    </span>
                  </div>

                  {/* Select Action Footer */}
                  <div className="px-3 pb-3">
                    <Button
                      size="sm"
                      className={`w-full text-xs font-bold ${
                        isSelected
                          ? 'bg-[#1F1F1F] text-white hover:bg-[#000000]'
                          : 'bg-[#FFFFFF] text-[#1F1F1F] hover:bg-[#F5F5F3] border border-[#E5E5E3]'
                      }`}
                    >
                      {isSelected ? 'Selected' : 'Select'}
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

    </BaseModal>
  )
}
