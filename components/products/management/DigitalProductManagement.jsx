'use client'

import { useState } from 'react'
import { formatMoney } from '@/lib/clientApi'
import {
  DollarSign, ShoppingBag, Users, Download, Search, FileText,
  Calendar, CheckCircle2, AlertCircle, Clock, ExternalLink, Save, Loader2
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { api } from '@/lib/clientApi'

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

function formatDate(dateString) {
  if (!dateString) return '—'
  try {
    const d = new Date(dateString)
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  } catch (e) {
    return '—'
  }
}

export default function DigitalProductManagement({ data, onProductUpdated, activeTab, onTabChange }) {
  const { product, summary = {}, overview = {}, customers = [], orders = [] } = data
  const currency = product?.currency || 'INR'

  const [customerSearch, setCustomerSearch] = useState('')
  const [orderSearch, setOrderSearch] = useState('')
  
  // Settings edit state
  const [savingSettings, setSavingSettings] = useState(false)
  const [formData, setFormData] = useState({
    title: product?.title || '',
    price: product?.price !== undefined ? product?.price : 0,
    shortDescription: product?.shortDescription || '',
    description: product?.description || '',
    status: product?.status || 'DRAFT',
  })

  const filteredCustomers = customers.filter(c =>
    (c.name && c.name.toLowerCase().includes(customerSearch.toLowerCase())) ||
    (c.email && c.email.toLowerCase().includes(customerSearch.toLowerCase()))
  )

  const filteredOrders = orders.filter(o =>
    (o.id && o.id.toLowerCase().includes(orderSearch.toLowerCase())) ||
    (o.customerName && o.customerName.toLowerCase().includes(orderSearch.toLowerCase())) ||
    (o.customerEmail && o.customerEmail.toLowerCase().includes(orderSearch.toLowerCase()))
  )

  async function handleSaveSettings(e) {
    e?.preventDefault()
    setSavingSettings(true)
    try {
      await api.patch(`/products/${product.id}`, {
        title: formData.title,
        price: Number(formData.price),
        shortDescription: formData.shortDescription,
        description: formData.description,
        status: formData.status,
      })
      toast.success('Product settings saved')
      onProductUpdated?.()
    } catch (err) {
      toast.error(err.message || 'Failed to update settings')
    } finally {
      setSavingSettings(false)
    }
  }

  return (
    <div className="space-y-6 text-[#010619]">
      {/* 4 Summary Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-[#FFFFFF] border border-[#D8DFFA] rounded-xl p-4 flex flex-col justify-between shadow-xs">
          <div className="flex items-center justify-between text-[#666666] text-xs font-semibold">
            <span>Revenue</span>
            <DollarSign className="h-4 w-4 text-[#194DF5]" />
          </div>
          <div className="mt-2 text-xl font-bold text-[#010619]">
            {formatMoney(summary.revenue || 0, currency)}
          </div>
          <div className="mt-1 text-[11px] text-[#6B7399]">
            Lifetime revenue
          </div>
        </div>

        <div className="bg-[#FFFFFF] border border-[#D8DFFA] rounded-xl p-4 flex flex-col justify-between shadow-xs">
          <div className="flex items-center justify-between text-[#666666] text-xs font-semibold">
            <span>Total Sales</span>
            <ShoppingBag className="h-4 w-4 text-[#22C55E]" />
          </div>
          <div className="mt-2 text-xl font-bold text-[#010619]">
            {summary.totalSales || 0}
          </div>
          <div className="mt-1 text-[11px] text-[#6B7399]">
            Successful checkouts
          </div>
        </div>

        <div className="bg-[#FFFFFF] border border-[#D8DFFA] rounded-xl p-4 flex flex-col justify-between shadow-xs">
          <div className="flex items-center justify-between text-[#666666] text-xs font-semibold">
            <span>Customers</span>
            <Users className="h-4 w-4 text-[#F59E0B]" />
          </div>
          <div className="mt-2 text-xl font-bold text-[#010619]">
            {summary.customers || 0}
          </div>
          <div className="mt-1 text-[11px] text-[#6B7399]">
            Unique buyers
          </div>
        </div>

        <div className="bg-[#FFFFFF] border border-[#D8DFFA] rounded-xl p-4 flex flex-col justify-between shadow-xs">
          <div className="flex items-center justify-between text-[#666666] text-xs font-semibold">
            <span>Downloads</span>
            <Download className="h-4 w-4 text-[#6B7399]" />
          </div>
          <div className="mt-2 text-xl font-bold text-[#010619]">
            {summary.downloads || 0}
          </div>
          <div className="mt-1 text-[11px] text-[#6B7399]">
            File deliveries
          </div>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Description & Specs */}
            <div className="bg-[#FFFFFF] border border-[#D8DFFA] rounded-xl p-5 space-y-4 shadow-xs">
              <h3 className="text-sm font-bold text-[#010619] uppercase tracking-wider text-[11px]">Product Details</h3>
              <div className="space-y-2 text-xs">
                <div>
                  <span className="text-[#666666]">Price: </span>
                  <span className="font-semibold text-[#010619]">
                    {Number(product.price) === 0 ? 'Free' : formatMoney(product.price, currency)}
                  </span>
                </div>
                <div>
                  <span className="text-[#666666]">Status: </span>
                  <span className={`inline-flex items-center gap-1 font-semibold ${product.status === 'PUBLISHED' ? 'text-[#22C55E]' : 'text-[#6B7399]'}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${product.status === 'PUBLISHED' ? 'bg-[#22C55E]' : 'bg-[#6B7399]'}`} />
                    {product.status === 'PUBLISHED' ? 'Published' : 'Draft'}
                  </span>
                </div>
                {product.shortDescription && (
                  <div>
                    <span className="text-[#666666]">Summary: </span>
                    <span className="text-[#010619]">{product.shortDescription}</span>
                  </div>
                )}
                {product.description && (
                  <div className="pt-2 border-t border-[#D8DFFA]">
                    <span className="text-[#666666] block mb-1">Description:</span>
                    <p className="text-[#666666] line-clamp-3 leading-relaxed">{product.description}</p>
                  </div>
                )}
              </div>
            </div>

            {/* File Info */}
            <div className="bg-[#FFFFFF] border border-[#D8DFFA] rounded-xl p-5 space-y-4 shadow-xs">
              <h3 className="text-sm font-bold text-[#010619] uppercase tracking-wider text-[11px]">File Information</h3>
              {overview.file?.fileName ? (
                <div className="bg-[#EEF1FB] border border-[#D8DFFA] rounded-lg p-3 flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-[#F0F5FF] flex items-center justify-center text-[#194DF5] shrink-0 border border-[#D0E2FF]">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-[#010619] truncate">{overview.file.fileName}</p>
                    <p className="text-[11px] text-[#666666]">
                      {formatBytes(overview.file.fileSize)} · {overview.file.fileMime || 'application/octet-stream'}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-6 text-[#666666] text-xs">
                  <FileText className="h-8 w-8 mx-auto mb-2 opacity-50 text-[#6B7399]" />
                  <p>No downloadable file attached yet.</p>
                </div>
              )}
            </div>
          </div>

          {/* Recent Purchases */}
          <div className="bg-[#FFFFFF] border border-[#D8DFFA] rounded-xl p-5 space-y-4 shadow-xs">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-[#010619] uppercase tracking-wider text-[11px]">Recent Purchases</h3>
              {orders.length > 0 && (
                <button
                  onClick={() => onTabChange?.('orders')}
                  className="text-xs text-[#194DF5] hover:underline cursor-pointer font-semibold"
                >
                  View all ({orders.length})
                </button>
              )}
            </div>

            {orders.length === 0 ? (
              <div className="text-center py-8 text-[#666666] text-xs">
                <p>No recent purchases yet.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="border-b border-[#D8DFFA] text-[#6B7399]">
                      <th className="pb-2.5 font-semibold">Customer</th>
                      <th className="pb-2.5 font-semibold">Date</th>
                      <th className="pb-2.5 font-semibold text-right">Amount</th>
                      <th className="pb-2.5 font-semibold text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.slice(0, 5).map(o => (
                      <tr key={o.id} className="border-b border-[#D8DFFA] last:border-0">
                        <td className="py-3">
                          <div className="font-semibold text-[#010619]">{o.customerName || 'Customer'}</div>
                          <div className="text-[11px] text-[#666666]">{o.customerEmail}</div>
                        </td>
                        <td className="py-3 text-[#666666]">{formatDate(o.createdAt)}</td>
                        <td className="py-3 text-right font-semibold text-[#010619]">
                          {formatMoney(o.amount, o.currency || currency)}
                        </td>
                        <td className="py-3 text-right">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            o.status === 'PAID' ? 'bg-[#22C55E]/10 text-[#22C55E]' : 'bg-[#6B7399]/10 text-[#666666]'
                          }`}>
                            {o.status}
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

      {/* Customers Tab */}
      {activeTab === 'customers' && (
        <div className="bg-[#FFFFFF] border border-[#D8DFFA] rounded-xl p-5 space-y-4 shadow-xs">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <h3 className="text-sm font-bold text-[#010619]">Customers ({customers.length})</h3>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#6B7399]" />
              <input
                type="text"
                placeholder="Search customers..."
                value={customerSearch}
                onChange={e => setCustomerSearch(e.target.value)}
                className="w-full bg-[#FFFFFF] border border-[#D8DFFA] text-[#010619] placeholder-[#6B7399] text-xs pl-8 pr-3 py-1.5 rounded-full focus:outline-none focus:border-[#194DF5]"
              />
            </div>
          </div>

          {customers.length === 0 ? (
            <div className="text-center py-12 text-[#666666] space-y-2">
              <Users className="h-8 w-8 mx-auto opacity-50 text-[#6B7399]" />
              <p className="text-sm font-semibold text-[#010619]">No customers yet</p>
              <p className="text-xs">When someone purchases this digital product, they will appear here.</p>
            </div>
          ) : filteredCustomers.length === 0 ? (
            <div className="text-center py-8 text-[#666666] text-xs">
              No customers match &quot;{customerSearch}&quot;
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-[#D8DFFA] text-[#6B7399] text-[11px] uppercase tracking-wider">
                    <th className="pb-3 font-bold">Customer</th>
                    <th className="pb-3 font-bold">Email</th>
                    <th className="pb-3 font-bold">Purchase Date</th>
                    <th className="pb-3 font-bold text-right">Total Spent</th>
                    <th className="pb-3 font-bold text-right">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCustomers.map(c => (
                    <tr key={c.id || c.email} className="border-b border-[#D8DFFA] last:border-0 hover:bg-[#EEF1FB] transition-colors">
                      <td className="py-3 font-bold text-[#010619]">{c.name || c.email.split('@')[0]}</td>
                      <td className="py-3 text-[#666666]">{c.email}</td>
                      <td className="py-3 text-[#666666]">{formatDate(c.purchasedAt)}</td>
                      <td className="py-3 text-right font-semibold text-[#010619]">
                        {formatMoney(c.totalSpent || c.amount || 0, currency)}
                      </td>
                      <td className="py-3 text-right">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#22C55E]/10 text-[#22C55E]">
                          <span className="h-1.5 w-1.5 rounded-full bg-[#22C55E]" />
                          Active
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

      {/* Orders Tab */}
      {activeTab === 'orders' && (
        <div className="bg-[#FFFFFF] border border-[#D8DFFA] rounded-xl p-5 space-y-4 shadow-xs">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <h3 className="text-sm font-bold text-[#010619]">Orders ({orders.length})</h3>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#6B7399]" />
              <input
                type="text"
                placeholder="Search orders..."
                value={orderSearch}
                onChange={e => setOrderSearch(e.target.value)}
                className="w-full bg-[#FFFFFF] border border-[#D8DFFA] text-[#010619] placeholder-[#6B7399] text-xs pl-8 pr-3 py-1.5 rounded-full focus:outline-none focus:border-[#194DF5]"
              />
            </div>
          </div>

          {orders.length === 0 ? (
            <div className="text-center py-12 text-[#666666] space-y-2">
              <ShoppingBag className="h-8 w-8 mx-auto opacity-50 text-[#6B7399]" />
              <p className="text-sm font-semibold text-[#010619]">No orders yet</p>
              <p className="text-xs">When customers complete checkout, orders will appear here.</p>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="text-center py-8 text-[#666666] text-xs">
              No orders match &quot;{orderSearch}&quot;
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-[#D8DFFA] text-[#6B7399] text-[11px] uppercase tracking-wider">
                    <th className="pb-3 font-bold">Order ID</th>
                    <th className="pb-3 font-bold">Customer</th>
                    <th className="pb-3 font-bold">Date</th>
                    <th className="pb-3 font-bold text-right">Amount</th>
                    <th className="pb-3 font-bold text-right">Payment Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.map(o => (
                    <tr key={o.id} className="border-b border-[#D8DFFA] last:border-0 hover:bg-[#EEF1FB] transition-colors">
                      <td className="py-3 font-mono text-[11px] text-[#666666]">{o.id.slice(0, 8)}...</td>
                      <td className="py-3">
                        <div className="font-bold text-[#010619]">{o.customerName || 'Customer'}</div>
                        <div className="text-[11px] text-[#666666]">{o.customerEmail}</div>
                      </td>
                      <td className="py-3 text-[#666666]">{formatDate(o.createdAt)}</td>
                      <td className="py-3 text-right font-semibold text-[#010619]">
                        {formatMoney(o.amount, o.currency || currency)}
                      </td>
                      <td className="py-3 text-right">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          o.status === 'PAID'
                            ? 'bg-[#22C55E]/10 text-[#22C55E]'
                            : o.status === 'REFUNDED'
                            ? 'bg-[#EF4444]/10 text-[#EF4444]'
                            : 'bg-[#F59E0B]/10 text-[#D97706]'
                        }`}>
                          {o.status}
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

      {/* Settings Tab */}
      {activeTab === 'settings' && (
        <form onSubmit={handleSaveSettings} className="bg-[#FFFFFF] border border-[#D8DFFA] rounded-xl p-5 space-y-4 shadow-xs">
          <h3 className="text-sm font-bold text-[#010619]">Product Settings</h3>
          
          <div className="space-y-3 text-xs">
            <div>
              <label className="block text-[#333333] mb-1 font-semibold">Title</label>
              <Input
                value={formData.title}
                onChange={e => setFormData({ ...formData, title: e.target.value })}
                className="bg-[#FFFFFF] border-[#D8DFFA] text-[#010619]"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[#333333] mb-1 font-semibold">Price ({currency})</label>
                <Input
                  type="number"
                  min="0"
                  step="any"
                  value={formData.price}
                  onChange={e => setFormData({ ...formData, price: e.target.value })}
                  className="bg-[#FFFFFF] border-[#D8DFFA] text-[#010619]"
                />
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
                placeholder="Brief summary for listings..."
                className="bg-[#FFFFFF] border-[#D8DFFA] text-[#010619]"
              />
            </div>

            <div>
              <label className="block text-[#333333] mb-1 font-semibold">Full Description</label>
              <Textarea
                rows={4}
                value={formData.description}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
                placeholder="Full details about this digital product..."
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
    </div>
  )
}
