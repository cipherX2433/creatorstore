'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import { api, formatMoney } from '@/lib/clientApi'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Users, MessageSquare, Heart, Lock, Shield, Pin, CheckCircle2, ArrowRight,
  Send, Trash2, Search, Image as ImageIcon, Loader2, Megaphone, AlertCircle, Info, FileText
} from 'lucide-react'

export default function CustomerCommunityDashboard() {
  const params = useParams()
  const router = useRouter()
  const communityId = params?.id

  const [email, setEmail] = useState('')
  const [activeTab, setActiveTab] = useState('feed') // 'feed' | 'members' | 'about' | 'rules'
  const [loading, setLoading] = useState(true)
  const [hasAccess, setHasAccess] = useState(true)
  const [role, setRole] = useState('MEMBER')
  const [publicData, setPublicData] = useState(null)
  const [config, setConfig] = useState(null)

  // Feed State
  const [posts, setPosts] = useState([])
  const [postContent, setPostContent] = useState('')
  const [isAnnouncement, setIsAnnouncement] = useState(false)
  const [attachmentUrl, setAttachmentUrl] = useState('')
  const [posting, setPosting] = useState(false)
  const [openCommentsPostId, setOpenCommentsPostId] = useState(null)
  const [commentsMap, setCommentsMap] = useState({})
  const [commentInputMap, setCommentInputMap] = useState({})
  const [submittingCommentId, setSubmittingCommentId] = useState(null)

  // Members State
  const [members, setMembers] = useState([])
  const [memberSearch, setMemberSearch] = useState('')
  const [loadingMembers, setLoadingMembers] = useState(false)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedEmail = localStorage.getItem('creatorzero_customer_email') || ''
      setEmail(savedEmail)
    }
  }, [])

  useEffect(() => {
    if (!communityId) return
    loadCommunityPublicData()
    if (email) {
      loadFeed(email)
    }
  }, [communityId, email])

  function loadCommunityPublicData() {
    api.get(`/community/public/${communityId}`)
      .then((res) => {
        setPublicData(res)
        if (res.config) setConfig(res.config)
      })
      .catch(() => {})
  }

  function loadFeed(custEmail) {
    setLoading(true)
    api.get(`/community/${communityId}/feed?email=${encodeURIComponent(custEmail)}`)
      .then((res) => {
        setPosts(res.posts || [])
        setRole(res.role || 'MEMBER')
        if (res.config) setConfig(res.config)
        setHasAccess(true)
        setLoading(false)
      })
      .catch((err) => {
        if (err.status === 403 || err.status === 401) {
          setHasAccess(false)
        } else {
          toast.error(err.message || 'Failed to load community feed')
        }
        setLoading(false)
      })
  }

  function handleEmailSubmit(e) {
    e.preventDefault()
    if (!email) return
    if (typeof window !== 'undefined') {
      localStorage.setItem('creatorzero_customer_email', email)
    }
    loadFeed(email)
  }

  async function handleCreatePost(e) {
    e.preventDefault()
    if (!postContent.trim()) {
      toast.error('Post content cannot be empty.')
      return
    }
    setPosting(true)
    try {
      const payload = {
        content: postContent,
        isAnnouncement,
        attachments: attachmentUrl ? [{ type: 'IMAGE', url: attachmentUrl }] : [],
      }
      const res = await api.post(`/community/${communityId}/posts?email=${encodeURIComponent(email)}`, payload)
      toast.success('Post published to feed!')
      setPostContent('')
      setIsAnnouncement(false)
      setAttachmentUrl('')
      loadFeed(email)
    } catch (err) {
      toast.error(err.message || 'Failed to create post')
    } finally {
      setPosting(false)
    }
  }

  async function handleDeletePost(postId) {
    try {
      await api.delete(`/community/posts/${postId}?email=${encodeURIComponent(email)}`)
      toast.success('Post deleted')
      setPosts(posts.filter(p => p.id !== postId))
    } catch (err) {
      toast.error(err.message || 'Failed to delete post')
    }
  }

  async function handleToggleReaction(postId) {
    try {
      const res = await api.post(`/community/posts/${postId}/react?email=${encodeURIComponent(email)}`)
      setPosts(posts.map(p => {
        if (p.id === postId) {
          const delta = res.reacted ? 1 : -1
          return { ...p, hasLiked: res.reacted, likesCount: Math.max(0, (p.likesCount || 0) + delta) }
        }
        return p
      }))
    } catch (err) {
      toast.error(err.message || 'Failed to react to post')
    }
  }

  async function toggleComments(postId) {
    if (openCommentsPostId === postId) {
      setOpenCommentsPostId(null)
      return
    }
    setOpenCommentsPostId(postId)
    if (!commentsMap[postId]) {
      try {
        const res = await api.get(`/community/posts/${postId}/comments?email=${encodeURIComponent(email)}`)
        setCommentsMap(prev => ({ ...prev, [postId]: res.comments || [] }))
      } catch (err) {
        toast.error('Failed to load comments')
      }
    }
  }

  async function handleAddComment(postId) {
    const text = commentInputMap[postId] || ''
    if (!text.trim()) return
    setSubmittingCommentId(postId)
    try {
      const res = await api.post(`/community/posts/${postId}/comments?email=${encodeURIComponent(email)}`, { content: text })
      setCommentsMap(prev => ({
        ...prev,
        [postId]: [...(prev[postId] || []), res.comment]
      }))
      setPosts(posts.map(p => p.id === postId ? { ...p, commentsCount: (p.commentsCount || 0) + 1 } : p))
      setCommentInputMap(prev => ({ ...prev, [postId]: '' }))
    } catch (err) {
      toast.error(err.message || 'Failed to post comment')
    } finally {
      setSubmittingCommentId(null)
    }
  }

  async function handleDeleteComment(commentId, postId) {
    try {
      await api.delete(`/community/comments/${commentId}?email=${encodeURIComponent(email)}`)
      setCommentsMap(prev => ({
        ...prev,
        [postId]: (prev[postId] || []).filter(c => c.id !== commentId)
      }))
      setPosts(posts.map(p => p.id === postId ? { ...p, commentsCount: Math.max(0, (p.commentsCount || 0) - 1) } : p))
    } catch (err) {
      toast.error('Failed to delete comment')
    }
  }

  function loadMembersTab() {
    setActiveTab('members')
    if (members.length === 0) {
      setLoadingMembers(true)
      api.get(`/community/${communityId}/members?email=${encodeURIComponent(email)}&search=${encodeURIComponent(memberSearch)}`)
        .then((res) => {
          setMembers(res.items || [])
          setLoadingMembers(false)
        })
        .catch(() => setLoadingMembers(false))
    }
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        <Skeleton className="h-48 w-full rounded-3xl" />
        <Skeleton className="h-64 w-full rounded-3xl" />
      </div>
    )
  }

  // PRIVACY ACCESS DENIED SCREEN
  if (!hasAccess) {
    return (
      <div className="min-h-screen bg-[#000000] flex items-center justify-center p-6 text-[#F4F2EC] font-sans">
        <div className="max-w-md w-full bg-[#12141c] p-8 rounded-3xl border border-white/10 shadow-xl space-y-5 text-center">
          <div className="h-16 w-16 bg-primary/15 text-primary rounded-2xl flex items-center justify-center mx-auto shadow-xs">
            <Lock className="h-8 w-8" />
          </div>
          <div className="space-y-1">
            <span className="text-xs font-black uppercase text-primary bg-primary/10 px-3 py-1 rounded-full">Private Group Space</span>
            <h1 className="text-2xl font-black text-[#F4F2EC] pt-2">{config?.name || 'Private Community'}</h1>
            <p className="text-xs text-[rgba(244,242,236,0.68)] font-medium">This community is private. You must have an active paid membership to access discussions, posts, and member lists.</p>
          </div>

          {/* Email verification input */}
          <form onSubmit={handleEmailSubmit} className="space-y-2 pt-2 text-left">
            <label className="text-xs font-bold text-[#F4F2EC]">Already purchased? Verify your email:</label>
            <div className="flex gap-2">
              <Input
                type="email"
                placeholder="your.email@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-11 text-xs rounded-xl"
              />
              <Button type="submit" size="sm" className="bg-primary hover:bg-primary text-white text-xs font-bold rounded-xl shrink-0">
                Verify
              </Button>
            </div>
          </form>

          {/* Storefront purchase CTA */}
          {publicData?.product && (
            <div className="pt-3 border-t border-white/10 space-y-3">
              <div className="flex items-center justify-between text-xs font-bold bg-[#12141c] p-3 rounded-xl border border-white/10">
                <span className="text-[rgba(244,242,236,0.68)]">Membership Fee:</span>
                <span className="text-primary font-black text-sm">{formatMoney(publicData.product.price, publicData.product.currency)}</span>
              </div>
              <Link href={`/checkout/product?productId=${publicData.product.id}`}>
                <Button className="w-full h-12 bg-primary hover:bg-primary text-white font-extrabold text-xs rounded-2xl shadow-md gap-1">
                  Join Community Now <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-6 font-sans text-[#F4F2EC]">
      
      {/* COMMUNITY HEADER BANNER */}
      <div className="bg-[#12141c] rounded-3xl border border-white/10 shadow-sm overflow-hidden">
        {config?.coverImage ? (
          <img src={config.coverImage} alt="" className="h-40 w-full object-cover" />
        ) : (
          <div className="h-32 w-full bg-gradient-to-r from-primary to-primary-hover flex items-center justify-center">
            <Users className="h-12 w-12 text-white/40" />
          </div>
        )}

        <div className="p-6 space-y-4 relative">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="h-14 w-14 rounded-2xl bg-primary/15 text-primary flex items-center justify-center font-black text-xl border-4 border-white shadow-md -mt-10 shrink-0">
                {(config?.name || 'C')[0]}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase bg-primary/10 text-primary px-2.5 py-0.5 rounded-full flex items-center gap-1">
                    <Lock className="h-3 w-3" /> PRIVATE COMMUNITY
                  </span>
                  <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full ${
                    role === 'OWNER' ? 'bg-amber-100 text-amber-800' : role === 'ADMIN' ? 'bg-primary/15 text-primary' : 'bg-slate-100 text-[#F4F2EC]'
                  }`}>
                    YOUR ROLE: {role}
                  </span>
                </div>
                <h1 className="text-2xl font-black text-[#F4F2EC] tracking-tight mt-0.5">{config?.name || 'Community'}</h1>
              </div>
            </div>

            <div className="flex items-center gap-2 bg-[#12141c] px-3 py-1.5 rounded-full border border-white/10 text-xs font-bold text-[#F4F2EC]">
              <Users className="h-4 w-4 text-primary" />
              <span>{publicData?.memberCount || 1} Members</span>
            </div>
          </div>

          <p className="text-xs text-[rgba(244,242,236,0.68)] font-medium">{config?.shortDescription}</p>

          {/* TAB NAVIGATION */}
          <div className="flex items-center gap-2 border-t border-white/10 pt-3">
            <button
              onClick={() => setActiveTab('feed')}
              className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center gap-1.5 ${
                activeTab === 'feed' ? 'bg-primary text-[#000000] shadow-xs' : 'text-[rgba(244,242,236,0.68)] hover:bg-[#12141c]'
              }`}
            >
              <MessageSquare className="h-3.5 w-3.5" /> Feed & Discussions
            </button>
            <button
              onClick={loadMembersTab}
              className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center gap-1.5 ${
                activeTab === 'members' ? 'bg-primary text-[#000000] shadow-xs' : 'text-[rgba(244,242,236,0.68)] hover:bg-[#12141c]'
              }`}
            >
              <Users className="h-3.5 w-3.5" /> Members
            </button>
            <button
              onClick={() => setActiveTab('about')}
              className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center gap-1.5 ${
                activeTab === 'about' ? 'bg-primary text-[#000000] shadow-xs' : 'text-[rgba(244,242,236,0.68)] hover:bg-[#12141c]'
              }`}
            >
              <Info className="h-3.5 w-3.5" /> About
            </button>
            <button
              onClick={() => setActiveTab('rules')}
              className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center gap-1.5 ${
                activeTab === 'rules' ? 'bg-primary text-[#000000] shadow-xs' : 'text-[rgba(244,242,236,0.68)] hover:bg-[#12141c]'
              }`}
            >
              <FileText className="h-3.5 w-3.5" /> Community Rules
            </button>
          </div>
        </div>
      </div>

      {/* TAB 1: FEED */}
      {activeTab === 'feed' && (
        <div className="space-y-6">
          
          {/* POST COMPOSER */}
          <form onSubmit={handleCreatePost} className="bg-[#12141c] rounded-3xl p-5 border border-white/10 shadow-sm space-y-4">
            <Textarea
              rows={3}
              value={postContent}
              onChange={(e) => setPostContent(e.target.value)}
              placeholder="What's on your mind? Share an update or ask a question..."
              className="rounded-2xl text-xs font-medium border-white/10"
            />

            {attachmentUrl && (
              <div className="relative inline-block">
                <img src={attachmentUrl} alt="" className="h-20 w-20 rounded-xl object-cover border border-white/10" />
                <button type="button" onClick={() => setAttachmentUrl('')} className="absolute -top-2 -right-2 bg-red-500 text-white h-5 w-5 rounded-full text-xs font-black">✕</button>
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <div className="flex items-center gap-3">
                <Input
                  type="url"
                  placeholder="Image URL (optional)"
                  value={attachmentUrl}
                  onChange={(e) => setAttachmentUrl(e.target.value)}
                  className="h-9 rounded-xl text-[11px] w-56"
                />

                {(role === 'OWNER' || role === 'ADMIN') && (
                  <label className="flex items-center gap-1.5 text-xs font-extrabold text-amber-700 bg-amber-50 px-3 py-1.5 rounded-xl border border-amber-200 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isAnnouncement}
                      onChange={(e) => setIsAnnouncement(e.target.checked)}
                      className="rounded"
                    />
                    <Megaphone className="h-3.5 w-3.5 text-amber-600" /> Announcement
                  </label>
                )}
              </div>

              <Button type="submit" disabled={posting} className="bg-primary hover:bg-primary text-white font-extrabold text-xs rounded-xl shadow-xs gap-1.5">
                {posting ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Send className="h-3.5 w-3.5" /> Post</>}
              </Button>
            </div>
          </form>

          {/* POSTS FEED */}
          {posts.length === 0 ? (
            <div className="bg-[#12141c] rounded-3xl p-12 border border-dashed border-white/10 text-center space-y-2">
              <MessageSquare className="h-10 w-10 text-slate-300 mx-auto" />
              <h3 className="text-base font-extrabold text-[#F4F2EC]">No Posts Yet</h3>
              <p className="text-xs text-[rgba(244,242,236,0.68)] font-medium">Be the first member to start a conversation in this community!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {posts.map((post) => {
                const isAuthor = post.authorEmail?.toLowerCase() === email.toLowerCase()
                const isMod = role === 'OWNER' || role === 'ADMIN'
                const canDelete = isAuthor || isMod

                return (
                  <div key={post.id} className={`bg-[#12141c] rounded-3xl p-6 border shadow-sm space-y-4 ${post.isAnnouncement ? 'border-amber-300 ring-2 ring-amber-400/20 bg-amber-50/10' : 'border-white/10'}`}>
                    
                    {/* Announcement Banner */}
                    {post.isAnnouncement && (
                      <div className="flex items-center gap-1.5 text-xs font-black uppercase text-amber-700 bg-amber-100 px-3 py-1 rounded-full w-max">
                        <Pin className="h-3.5 w-3.5" /> Pinned Announcement
                      </div>
                    )}

                    {/* Author Row */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-primary/15 text-primary flex items-center justify-center font-black uppercase shrink-0">
                          {(post.authorName || 'M')[0]}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-sm text-[#F4F2EC]">{post.authorName || 'Member'}</span>
                            <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                              post.authorRole === 'OWNER' ? 'bg-amber-100 text-amber-800' : post.authorRole === 'ADMIN' ? 'bg-primary/15 text-primary' : 'bg-slate-100 text-[rgba(244,242,236,0.68)]'
                            }`}>
                              {post.authorRole || 'MEMBER'}
                            </span>
                          </div>
                          <div className="text-[11px] font-medium text-[rgba(244,242,236,0.5)]">
                            {new Date(post.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} at {new Date(post.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                      </div>

                      {canDelete && (
                        <button onClick={() => handleDeletePost(post.id)} className="text-[rgba(244,242,236,0.5)] hover:text-red-600 p-1">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>

                    {/* Content */}
                    <div className="text-xs sm:text-sm text-[#F4F2EC] font-medium whitespace-pre-wrap leading-relaxed">
                      {post.content}
                    </div>

                    {/* Attachments */}
                    {post.attachments?.length > 0 && (
                      <div className="pt-2">
                        {post.attachments.map((att, i) => (
                          <img key={i} src={att.url} alt="" className="max-h-80 rounded-2xl object-cover border border-white/10" />
                        ))}
                      </div>
                    )}

                    {/* Actions Bar */}
                    <div className="flex items-center gap-4 pt-3 border-t border-white/10 text-xs font-bold">
                      <button
                        onClick={() => handleToggleReaction(post.id)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all ${
                          post.hasLiked ? 'bg-rose-50 text-rose-600 font-black' : 'text-[rgba(244,242,236,0.68)] hover:bg-[#12141c]'
                        }`}
                      >
                        <Heart className={`h-4 w-4 ${post.hasLiked ? 'fill-rose-600 text-rose-600' : ''}`} />
                        <span>{post.likesCount || 0} Likes</span>
                      </button>

                      <button
                        onClick={() => toggleComments(post.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[rgba(244,242,236,0.68)] hover:bg-[#12141c] transition-all"
                      >
                        <MessageSquare className="h-4 w-4 text-primary" />
                        <span>{post.commentsCount || 0} Comments</span>
                      </button>
                    </div>

                    {/* EXPANDABLE COMMENTS SECTION */}
                    {openCommentsPostId === post.id && (
                      <div className="pt-4 border-t border-white/10 space-y-3 bg-[#1e222d] p-4 rounded-2xl">
                        <div className="flex items-center gap-2">
                          <Input
                            placeholder="Write a comment..."
                            value={commentInputMap[post.id] || ''}
                            onChange={(e) => setCommentInputMap({ ...commentInputMap, [post.id]: e.target.value })}
                            className="h-9 text-xs rounded-xl bg-[#12141c]"
                          />
                          <Button
                            size="sm"
                            disabled={submittingCommentId === post.id}
                            onClick={() => handleAddComment(post.id)}
                            className="bg-primary hover:bg-primary text-white text-xs font-bold rounded-xl shrink-0"
                          >
                            Comment
                          </Button>
                        </div>

                        <div className="space-y-2 pt-1">
                          {(commentsMap[post.id] || []).map((c) => (
                            <div key={c.id} className="bg-[#12141c] p-3 rounded-xl border border-white/10 text-xs flex justify-between gap-2">
                              <div>
                                <span className="font-extrabold text-[#F4F2EC]">{c.authorName || 'Member'}: </span>
                                <span className="text-[#F4F2EC] font-medium">{c.content}</span>
                              </div>
                              {(c.authorEmail?.toLowerCase() === email.toLowerCase() || isMod) && (
                                <button onClick={() => handleDeleteComment(c.id, post.id)} className="text-slate-300 hover:text-red-500">
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: MEMBERS */}
      {activeTab === 'members' && (
        <div className="bg-[#12141c] rounded-3xl p-6 border border-white/10 shadow-sm space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
            <div>
              <h2 className="text-base font-extrabold text-[#F4F2EC]">Community Directory</h2>
              <p className="text-xs text-[rgba(244,242,236,0.68)] font-medium">Connect with fellow paid members in {config?.name}.</p>
            </div>
          </div>

          <div className="divide-y divide-slate-100">
            {members.map((m) => (
              <div key={m.id} className="py-3 flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full bg-primary/15 text-primary flex items-center justify-center font-black uppercase shrink-0">
                    {(m.customerName || m.customerEmail || 'M')[0]}
                  </div>
                  <div>
                    <div className="font-extrabold text-[#F4F2EC]">{m.customerName || 'Community Member'}</div>
                    <div className="text-[rgba(244,242,236,0.5)] text-[11px]">Joined {new Date(m.joinedAt || m.createdAt).toLocaleDateString()}</div>
                  </div>
                </div>

                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                  m.role === 'OWNER' ? 'bg-amber-100 text-amber-800' : m.role === 'ADMIN' ? 'bg-primary/15 text-primary' : 'bg-slate-100 text-[#F4F2EC]'
                }`}>
                  {m.role || 'MEMBER'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: ABOUT */}
      {activeTab === 'about' && (
        <div className="bg-[#12141c] rounded-3xl p-6 sm:p-8 border border-white/10 shadow-sm space-y-6">
          <h2 className="text-lg font-black text-[#F4F2EC]">About {config?.name}</h2>
          
          <div className="text-xs text-[#F4F2EC] font-medium leading-relaxed whitespace-pre-wrap">
            {config?.description}
          </div>

          {config?.benefits?.length > 0 && (
            <div className="space-y-3 pt-4 border-t border-white/10">
              <h3 className="text-xs font-black uppercase tracking-wider text-[rgba(244,242,236,0.5)]">Membership Benefits</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {config.benefits.map((b, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs font-bold text-[#F4F2EC] bg-primary/10 p-3 rounded-2xl border border-primary/20">
                    <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                    <span>{b}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: RULES */}
      {activeTab === 'rules' && (
        <div className="bg-[#12141c] rounded-3xl p-6 sm:p-8 border border-white/10 shadow-sm space-y-5">
          <h2 className="text-lg font-black text-[#F4F2EC]">Community Rules & Expectations</h2>
          
          <div className="space-y-3">
            {(config?.rules || []).map((r, i) => (
              <div key={r.id || i} className="p-4 rounded-2xl bg-[#12141c] border border-white/10 text-xs space-y-1">
                <div className="font-extrabold text-[#F4F2EC]">{i + 1}. {r.title}</div>
                <div className="text-[rgba(244,242,236,0.68)] font-medium">{r.description}</div>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  )
}
