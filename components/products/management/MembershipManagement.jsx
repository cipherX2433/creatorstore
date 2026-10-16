'use client'

import { useState } from 'react'
import { formatMoney } from '@/lib/clientApi'
import {
  Users, DollarSign, UserPlus, TrendingDown, Search,
  FileText, CheckCircle2, Clock, XCircle, ChevronRight,
  Shield, Save, Loader2, Sparkles, X, Mail, Calendar
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { api } from '@/lib/clientApi'

function formatDate(dateString) {
  if (!dateString) return '—'
  try {
    const d = new Date(dateString)
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  } catch (e) {
    return '—'
  }
}

export default function MembershipManagement({ data, onProductUpdated, activeTab, onTabChange }) {
  const { product, summary = {}, overview = {}, members = [], content = { posts: [] }, tiers = [], config = {} } = data
  const currency = product?.currency || 'INR'

  const [memberSearch, setMemberSearch] = useState('')
  const [selectedMember, setSelectedMember] = useState(null)

  // Settings edit state
  const [savingSettings, setSavingSettings] = useState(false)
  const [formData, setFormData] = useState({
    title: config?.name || product?.title || '',
    price: config?.price !== undefined ? config.price : (product?.price || 0),
    billingType: config?.billingType || 'MONTHLY',
    shortDescription: config?.shortDescription || product?.shortDescription || '',
    description: config?.description || product?.description || '',
    status: product?.status || 'DRAFT',
  })

  const filteredMembers = members.filter(m =>
    (m.customerName && m.customerName.toLowerCase().includes(memberSearch.toLowerCase())) ||
    (m.customerEmail && m.customerEmail.toLowerCase().includes(memberSearch.toLowerCase()))
  )

  async function handleSaveSettings(e) {
    e?.preventDefault()
    setSavingSettings(true)
    try {
      await api.post(`/membership/config/${product.id}`, {
        name: formData.title,
        price: Number(formData.price),
        billingType: formData.billingType,
        shortDescription: formData.shortDescription,
        description: formData.description,
        status: formData.status,
      })
      await api.patch(`/products/${product.id}`, {
        title: formData.title,
        price: Number(formData.price),
        status: formData.status,
      })
      toast.success('Membership settings saved')
      onProductUpdated?.()
    } catch (err) {
      toast.error(err.message || 'Failed to update settings')
    } finally {
      setSavingSettings(false)
    }
  }

  return (
    <div className="space-y-6 text-[#010619]">
      {/* 4 Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-[#FFFFFF] border border-[#D8DFFA] rounded-xl p-4 flex flex-col justify-between shadow-xs">
          <div className="flex items-center justify-between text-[#666666] text-xs font-semibold">
            <span>Members</span>
            <Users className="h-4 w-4 text-[#194DF5]" />
          </div>
          <div className="mt-2 text-xl font-bold text-[#010619]">
            {summary.members || 0}
          </div>
          <div className="mt-1 text-[11px] text-[#6B7399]">
            Active subscribers
          </div>
        </div>

        <div className="bg-[#FFFFFF] border border-[#D8DFFA] rounded-xl p-4 flex flex-col justify-between shadow-xs">
          <div className="flex items-center justify-between text-[#666666] text-xs font-semibold">
            <span>Monthly Recurring</span>
            <DollarSign className="h-4 w-4 text-[#22C55E]" />
          </div>
          <div className="mt-2 text-xl font-bold text-[#010619]">
            {formatMoney(summary.mrr || 0, currency)}
          </div>
          <div className="mt-1 text-[11px] text-[#6B7399]">
            MRR from active plans
          </div>
        </div>

        <div className="bg-[#FFFFFF] border border-[#D8DFFA] rounded-xl p-4 flex flex-col justify-between shadow-xs">
          <div className="flex items-center justify-between text-[#666666] text-xs font-semibold">
            <span>New Members</span>
            <UserPlus className="h-4 w-4 text-[#F59E0B]" />
          </div>
          <div className="mt-2 text-xl font-bold text-[#010619]">
            {summary.newMembers || 0}
          </div>
          <div className="mt-1 text-[11px] text-[#6B7399]">
            Joined in last 30 days
          </div>
        </div>

        <div className="bg-[#FFFFFF] border border-[#D8DFFA] rounded-xl p-4 flex flex-col justify-between shadow-xs">
          <div className="flex items-center justify-between text-[#666666] text-xs font-semibold">
            <span>Churn Rate</span>
            <TrendingDown className="h-4 w-4 text-[#6B7399]" />
          </div>
          <div className="mt-2 text-xl font-bold text-[#010619]">
            {summary.churn || '0%'}
          </div>
          <div className="mt-1 text-[11px] text-[#6B7399]">
            Cancelled subscriptions
          </div>
        </div>
      </div>

      {/* Tab: Overview */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Membership Details */}
            <div className="bg-[#FFFFFF] border border-[#D8DFFA] rounded-xl p-5 space-y-4 shadow-xs">
              <h3 className="text-sm font-bold text-[#010619] uppercase tracking-wider text-[11px]">Membership Details</h3>
              <div className="space-y-2 text-xs">
                <div>
                  <span className="text-[#666666]">Plan Name: </span>
                  <span className="font-semibold text-[#010619]">{overview.membershipName || product.title}</span>
                </div>
                <div>
                  <span className="text-[#666666]">Price: </span>
                  <span className="font-semibold text-[#010619]">
                    {Number(overview.price) === 0 ? 'Free' : `${formatMoney(overview.price, currency)} / ${overview.billingInterval || 'month'}`}
                  </span>
                </div>
                <div>
                  <span className="text-[#666666]">Active Members: </span>
                  <span className="font-semibold text-[#22C55E]">{overview.activeMembers || 0}</span>
                </div>
                <div>
                  <span className="text-[#666666]">Status: </span>
                  <span className={`inline-flex items-center gap-1 font-semibold ${product.status === 'PUBLISHED' ? 'text-[#22C55E]' : 'text-[#6B7399]'}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${product.status === 'PUBLISHED' ? 'bg-[#22C55E]' : 'bg-[#6B7399]'}`} />
                    {product.status === 'PUBLISHED' ? 'Published' : 'Draft'}
                  </span>
                </div>
              </div>
            </div>

            {/* Benefits & Posts Summary */}
            <div className="bg-[#FFFFFF] border border-[#D8DFFA] rounded-xl p-5 space-y-4 shadow-xs">
              <h3 className="text-sm font-bold text-[#010619] uppercase tracking-wider text-[11px]">Content & Benefits</h3>
              <div className="grid grid-cols-2 gap-3 text-center">
                <div className="bg-[#EEF1FB] border border-[#D8DFFA] rounded-lg p-3">
                  <div className="text-xl font-bold text-[#010619]">{content.posts?.length || 0}</div>
                  <div className="text-[11px] text-[#666666] mt-0.5">Exclusive Posts</div>
                </div>
                <div className="bg-[#EEF1FB] border border-[#D8DFFA] rounded-lg p-3">
                  <div className="text-xl font-bold text-[#010619]">{tiers.length || 1}</div>
                  <div className="text-[11px] text-[#666666] mt-0.5">Membership Tiers</div>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Members */}
          <div className="bg-[#FFFFFF] border border-[#D8DFFA] rounded-xl p-5 space-y-4 shadow-xs">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-[#010619] uppercase tracking-wider text-[11px]">Recent Members</h3>
              {members.length > 0 && (
                <button
                  onClick={() => onTabChange?.('members')}
                  className="text-xs text-[#194DF5] hover:underline cursor-pointer font-semibold"
                >
                  View all ({members.length})
                </button>
              )}
            </div>

            {members.length === 0 ? (
              <div className="text-center py-8 text-[#666666] text-xs">
                <p>No members subscribed yet.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="border-b border-[#D8DFFA] text-[#6B7399]">
                      <th className="pb-2.5 font-semibold">Member</th>
                      <th className="pb-2.5 font-semibold">Joined</th>
                      <th className="pb-2.5 font-semibold">Plan</th>
                      <th className="pb-2.5 font-semibold text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {members.slice(0, 5).map(m => (
                      <tr
                        key={m.id}
                        onClick={() => setSelectedMember(m)}
                        className="border-b border-[#D8DFFA] last:border-0 hover:bg-[#EEF1FB] transition-colors cursor-pointer"
                      >
                        <td className="py-3">
                          <div className="font-semibold text-[#010619]">{m.customerName || 'Member'}</div>
                          <div className="text-[11px] text-[#666666]">{m.customerEmail}</div>
                        </td>
                        <td className="py-3 text-[#666666]">{formatDate(m.createdAt || m.joinedAt)}</td>
                        <td className="py-3 text-[#010619] font-semibold">
                          {formatMoney(m.price !== undefined ? m.price : (config?.price || product.price || 0), currency)} / {m.billingInterval === 'YEAR' ? 'year' : 'mo'}
                        </td>
                        <td className="py-3 text-right">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            m.status === 'ACTIVE' || m.status === 'TRIALING'
                              ? 'bg-[#22C55E]/10 text-[#22C55E]'
                              : 'bg-[#EF4444]/10 text-[#EF4444]'
                          }`}>
                            {m.status || 'Active'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab: Members */}
      {activeTab === 'members' && (
        <div className="bg-[#FFFFFF] border border-[#D8DFFA] rounded-xl p-5 space-y-4 shadow-xs">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <h3 className="text-sm font-bold text-[#010619]">Members ({members.length})</h3>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#6B7399]" />
              <input
                type="text"
                placeholder="Search members..."
                value={memberSearch}
                onChange={e => setMemberSearch(e.target.value)}
                className="w-full bg-[#FFFFFF] border border-[#D8DFFA] text-[#010619] placeholder-[#6B7399] text-xs pl-8 pr-3 py-1.5 rounded-full focus:outline-none focus:border-[#194DF5]"
              />
            </div>
          </div>

          {members.length === 0 ? (
            <div className="text-center py-12 text-[#666666] space-y-2">
              <Users className="h-8 w-8 mx-auto opacity-50 text-[#6B7399]" />
              <p className="text-sm font-semibold text-[#010619]">No members yet</p>
              <p className="text-xs">Members will appear here after they subscribe.</p>
            </div>
          ) : filteredMembers.length === 0 ? (
            <div className="text-center py-8 text-[#666666] text-xs">
              No members match &quot;{memberSearch}&quot;
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-[#D8DFFA] text-[#6B7399] text-[11px] uppercase tracking-wider">
                    <th className="pb-3 font-bold">Member</th>
                    <th className="pb-3 font-bold">Email</th>
                    <th className="pb-3 font-bold">Joined</th>
                    <th className="pb-3 font-bold">Billing</th>
                    <th className="pb-3 font-bold text-right">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMembers.map(m => (
                    <tr
                      key={m.id}
                      onClick={() => setSelectedMember(m)}
                      className="border-b border-[#D8DFFA] last:border-0 hover:bg-[#EEF1FB] transition-colors cursor-pointer"
                    >
                      <td className="py-3 font-bold text-[#010619]">{m.customerName || 'Member'}</td>
                      <td className="py-3 text-[#666666]">{m.customerEmail}</td>
                      <td className="py-3 text-[#666666]">{formatDate(m.createdAt || m.joinedAt)}</td>
                      <td className="py-3 font-semibold text-[#010619]">
                        {formatMoney(m.price !== undefined ? m.price : (config?.price || product.price || 0), currency)} / {m.billingInterval === 'YEAR' ? 'year' : 'mo'}
                      </td>
                      <td className="py-3 text-right">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          m.status === 'ACTIVE' || m.status === 'TRIALING'
                            ? 'bg-[#22C55E]/10 text-[#22C55E]'
                            : 'bg-[#EF4444]/10 text-[#EF4444]'
                        }`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${m.status === 'ACTIVE' || m.status === 'TRIALING' ? 'bg-[#22C55E]' : 'bg-[#EF4444]'}`} />
                          {m.status || 'Active'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab: Content */}
      {activeTab === 'content' && (
        <div className="bg-[#FFFFFF] border border-[#D8DFFA] rounded-xl p-5 space-y-4 shadow-xs">
          <h3 className="text-sm font-bold text-[#010619]">Membership Content & Posts</h3>

          {(!content.posts || content.posts.length === 0) ? (
            <div className="text-center py-12 text-[#666666] space-y-2">
              <FileText className="h-8 w-8 mx-auto opacity-50 text-[#6B7399]" />
              <p className="text-sm font-semibold text-[#010619]">No exclusive posts created yet</p>
              <p className="text-xs">Publish member-only posts, guides, and perks for your subscribers.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {content.posts.map(p => (
                <div key={p.id} className="bg-[#EEF1FB] border border-[#D8DFFA] rounded-xl p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-xs text-[#010619]">{p.title}</h4>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#22C55E]/10 text-[#22C55E]">
                      {p.status || 'Published'}
                    </span>
                  </div>
                  {p.content && (
                    <p className="text-xs text-[#666666] line-clamp-2">{p.content.replace(/<[^>]*>?/gm, '')}</p>
                  )}
                  <div className="text-[11px] text-[#6B7399] pt-1">
                    Published on {formatDate(p.createdAt || p.publishedAt)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab: Analytics */}
      {activeTab === 'analytics' && (
        <div className="bg-[#FFFFFF] border border-[#D8DFFA] rounded-xl p-5 space-y-4 shadow-xs">
          <h3 className="text-sm font-bold text-[#010619]">Membership Analytics</h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-[#EEF1FB] border border-[#D8DFFA] rounded-xl p-4">
              <div className="text-xs text-[#666666] font-semibold">Total Subscribed</div>
              <div className="text-2xl font-bold text-[#010619] mt-1">{members.length}</div>
            </div>
            <div className="bg-[#EEF1FB] border border-[#D8DFFA] rounded-xl p-4">
              <div className="text-xs text-[#666666] font-semibold">Active Members</div>
              <div className="text-2xl font-bold text-[#22C55E] mt-1">{summary.members || 0}</div>
            </div>
            <div className="bg-[#EEF1FB] border border-[#D8DFFA] rounded-xl p-4">
              <div className="text-xs text-[#666666] font-semibold">Current MRR</div>
              <div className="text-2xl font-bold text-[#194DF5] mt-1">
                {formatMoney(summary.mrr || 0, currency)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Settings */}
      {activeTab === 'settings' && (
        <form onSubmit={handleSaveSettings} className="bg-[#FFFFFF] border border-[#D8DFFA] rounded-xl p-5 space-y-4 shadow-xs">
          <h3 className="text-sm font-bold text-[#010619]">Membership Configuration</h3>
          
          <div className="space-y-3 text-xs">
            <div>
              <label className="block text-[#333333] mb-1 font-semibold">Plan Name</label>
              <Input
                value={formData.title}
                onChange={e => setFormData({ ...formData, title: e.target.value })}
                className="bg-[#FFFFFF] border-[#D8DFFA] text-[#010619]"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[#333333] mb-1 font-semibold">Price ({currency})</label>
                <Input
                  type="number"
                  min="0"
                  value={formData.price}
                  onChange={e => setFormData({ ...formData, price: e.target.value })}
                  className="bg-[#FFFFFF] border-[#D8DFFA] text-[#010619]"
                />
              </div>
              <div>
                <label className="block text-[#333333] mb-1 font-semibold">Billing Interval</label>
                <select
                  value={formData.billingType}
                  onChange={e => setFormData({ ...formData, billingType: e.target.value })}
                  className="w-full h-10 px-3 rounded-md bg-[#FFFFFF] border border-[#D8DFFA] text-[#010619] focus:outline-none focus:border-[#194DF5]"
                >
                  <option value="MONTHLY">Monthly</option>
                  <option value="YEARLY">Yearly</option>
                </select>
              </div>
              <div>
                <label className="block text-[#333333] mb-1 font-semibold">Status</label>
                <select
                  value={formData.status}
                  onChange={e => setFormData({ ...formData, status: e.target.value })}
                  className="w-full h-10 px-3 rounded-md bg-[#FFFFFF] border border-[#D8DFFA] text-[#010619] focus:outline-none focus:border-[#194DF5]"
                >
                  <option value="DRAFT">Draft</option>
                  <option value="PUBLISHED">Published</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[#333333] mb-1 font-semibold">Short Description</label>
              <Input
                value={formData.shortDescription}
                onChange={e => setFormData({ ...formData, shortDescription: e.target.value })}
                placeholder="What members get with this tier..."
                className="bg-[#FFFFFF] border-[#D8DFFA] text-[#010619]"
              />
            </div>
          </div>

          <div className="pt-3 border-t border-[#D8DFFA] flex justify-end">
            <Button
              type="submit"
              disabled={savingSettings}
              className="bg-[#194DF5] hover:bg-[#1441D9] text-white text-xs font-bold rounded-full px-5 h-9 flex items-center gap-2 cursor-pointer"
            >
              {savingSettings ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              Save Changes
            </Button>
          </div>
        </form>
      )}

      {/* Member Details Modal */}
      {selectedMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/45">
          <div className="bg-[#FFFFFF] border border-[#D8DFFA] rounded-2xl p-6 max-w-sm w-full space-y-4 shadow-2xl text-[#010619]">
            <div className="flex items-center justify-between border-b border-[#D8DFFA] pb-3">
              <h4 className="text-sm font-bold text-[#010619]">Member Details</h4>
              <button
                onClick={() => setSelectedMember(null)}
                className="text-[#6B7399] hover:text-[#010619] hover:bg-[#E8EDFB] rounded-full p-1 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between py-1 border-b border-[#D8DFFA]">
                <span className="text-[#666666]">Name:</span>
                <span className="font-bold text-[#010619]">{selectedMember.customerName || 'Member'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#D8DFFA]">
                <span className="text-[#666666]">Email:</span>
                <span className="font-medium text-[#010619]">{selectedMember.customerEmail}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#D8DFFA]">
                <span className="text-[#666666]">Joined Date:</span>
                <span className="font-medium text-[#010619]">{formatDate(selectedMember.createdAt || selectedMember.joinedAt)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#D8DFFA]">
                <span className="text-[#666666]">Plan Rate:</span>
                <span className="font-bold text-[#194DF5]">
                  {formatMoney(selectedMember.price !== undefined ? selectedMember.price : (config?.price || product.price || 0), currency)} / {selectedMember.billingInterval === 'YEAR' ? 'year' : 'mo'}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#D8DFFA]">
                <span className="text-[#666666]">Status:</span>
                <span className="font-bold text-[#22C55E]">{selectedMember.status || 'Active'}</span>
              </div>
              {selectedMember.currentPeriodEnd && (
                <div className="flex justify-between py-1 border-b border-[#D8DFFA]">
                  <span className="text-[#666666]">Next Billing Date:</span>
                  <span className="text-[#010619]">{formatDate(selectedMember.currentPeriodEnd)}</span>
                </div>
              )}
            </div>

            <div className="pt-2 flex justify-end">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setSelectedMember(null)}
                className="text-xs text-[#666666] hover:text-[#010619]"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
