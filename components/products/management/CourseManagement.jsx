'use client'

import { useState } from 'react'
import { formatMoney } from '@/lib/clientApi'
import {
  GraduationCap, DollarSign, Percent, TrendingUp, Search,
  BookOpen, Video, FileText, CheckCircle2, Clock, ChevronDown, ChevronRight,
  Sparkles, Save, Loader2, PlayCircle, Eye
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

export default function CourseManagement({ data, onProductUpdated, activeTab, onTabChange }) {
  const { product, course, summary = {}, overview = {}, students = [], curriculum = { modules: [] }, analytics = {} } = data
  const currency = product?.currency || 'INR'

  const [studentSearch, setStudentSearch] = useState('')
  const [expandedModules, setExpandedModules] = useState(() => {
    // Default open all modules
    const init = {}
    curriculum.modules?.forEach(m => { init[m.id] = true })
    return init
  })

  // Settings edit state
  const [savingSettings, setSavingSettings] = useState(false)
  const [formData, setFormData] = useState({
    title: course?.title || product?.title || '',
    price: product?.price !== undefined ? product?.price : 0,
    shortDescription: course?.shortDescription || product?.shortDescription || '',
    description: course?.description || product?.description || '',
    status: product?.status || 'DRAFT',
  })

  const filteredStudents = students.filter(s =>
    (s.name && s.name.toLowerCase().includes(studentSearch.toLowerCase())) ||
    (s.email && s.email.toLowerCase().includes(studentSearch.toLowerCase()))
  )

  const toggleModule = (moduleId) => {
    setExpandedModules(prev => ({ ...prev, [moduleId]: !prev[moduleId] }))
  }

  async function handleSaveSettings(e) {
    e?.preventDefault()
    setSavingSettings(true)
    try {
      if (course?.id) {
        await api.patch(`/courses/${course.id}`, {
          title: formData.title,
          price: Number(formData.price),
          shortDescription: formData.shortDescription,
          description: formData.description,
        })
      }
      await api.patch(`/products/${product.id}`, {
        title: formData.title,
        price: Number(formData.price),
        shortDescription: formData.shortDescription,
        description: formData.description,
        status: formData.status,
      })
      toast.success('Course settings saved')
      onProductUpdated?.()
    } catch (err) {
      toast.error(err.message || 'Failed to update course settings')
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
            <span>Students</span>
            <GraduationCap className="h-4 w-4 text-[#194DF5]" />
          </div>
          <div className="mt-2 text-xl font-bold text-[#010619]">
            {summary.students || 0}
          </div>
          <div className="mt-1 text-[11px] text-[#6B7399]">
            Enrolled students
          </div>
        </div>

        <div className="bg-[#FFFFFF] border border-[#D8DFFA] rounded-xl p-4 flex flex-col justify-between shadow-xs">
          <div className="flex items-center justify-between text-[#666666] text-xs font-semibold">
            <span>Revenue</span>
            <DollarSign className="h-4 w-4 text-[#22C55E]" />
          </div>
          <div className="mt-2 text-xl font-bold text-[#010619]">
            {formatMoney(summary.revenue || 0, currency)}
          </div>
          <div className="mt-1 text-[11px] text-[#6B7399]">
            Course earnings
          </div>
        </div>

        <div className="bg-[#FFFFFF] border border-[#D8DFFA] rounded-xl p-4 flex flex-col justify-between shadow-xs">
          <div className="flex items-center justify-between text-[#666666] text-xs font-semibold">
            <span>Completion Rate</span>
            <Percent className="h-4 w-4 text-[#F59E0B]" />
          </div>
          <div className="mt-2 text-xl font-bold text-[#010619]">
            {summary.completionRate !== undefined ? `${summary.completionRate}%` : '0%'}
          </div>
          <div className="mt-1 text-[11px] text-[#6B7399]">
            Finished all lessons
          </div>
        </div>

        <div className="bg-[#FFFFFF] border border-[#D8DFFA] rounded-xl p-4 flex flex-col justify-between shadow-xs">
          <div className="flex items-center justify-between text-[#666666] text-xs font-semibold">
            <span>Avg Progress</span>
            <TrendingUp className="h-4 w-4 text-[#6B7399]" />
          </div>
          <div className="mt-2 text-xl font-bold text-[#010619]">
            {summary.averageProgress !== undefined ? `${summary.averageProgress}%` : '0%'}
          </div>
          <div className="mt-1 text-[11px] text-[#6B7399]">
            Across all students
          </div>
        </div>
      </div>

      {/* Tab: Overview */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Course Summary */}
            <div className="bg-[#FFFFFF] border border-[#D8DFFA] rounded-xl p-5 space-y-4 shadow-xs">
              <h3 className="text-sm font-bold text-[#010619] uppercase tracking-wider text-[11px]">Course Overview</h3>
              <div className="space-y-2 text-xs">
                <div>
                  <span className="text-[#666666]">Title: </span>
                  <span className="font-semibold text-[#010619]">{product.title}</span>
                </div>
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

            {/* Curriculum Stats */}
            <div className="bg-[#FFFFFF] border border-[#D8DFFA] rounded-xl p-5 space-y-4 shadow-xs">
              <h3 className="text-sm font-bold text-[#010619] uppercase tracking-wider text-[11px]">Curriculum Breakdown</h3>
              <div className="grid grid-cols-2 gap-3 text-center">
                <div className="bg-[#EEF1FB] border border-[#D8DFFA] rounded-lg p-3">
                  <div className="text-xl font-bold text-[#010619]">{curriculum.modules?.length || 0}</div>
                  <div className="text-[11px] text-[#666666] mt-0.5">Total Modules</div>
                </div>
                <div className="bg-[#EEF1FB] border border-[#D8DFFA] rounded-lg p-3">
                  <div className="text-xl font-bold text-[#010619]">
                    {curriculum.modules?.reduce((acc, m) => acc + (m.lessons?.length || 0), 0) || 0}
                  </div>
                  <div className="text-[11px] text-[#666666] mt-0.5">Total Lessons</div>
                </div>
              </div>
              <div className="pt-2 flex justify-center">
                <Button
                  onClick={() => onTabChange?.('curriculum')}
                  variant="outline"
                  size="sm"
                  className="bg-[#FFFFFF] border-[#D8DFFA] text-[#010619] hover:bg-[#E8EDFB] text-xs rounded-full px-4"
                >
                  View Full Curriculum
                </Button>
              </div>
            </div>
          </div>

          {/* Recent Enrollments */}
          <div className="bg-[#FFFFFF] border border-[#D8DFFA] rounded-xl p-5 space-y-4 shadow-xs">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-[#010619] uppercase tracking-wider text-[11px]">Recent Enrollments</h3>
              {students.length > 0 && (
                <button
                  onClick={() => onTabChange?.('students')}
                  className="text-xs text-[#194DF5] hover:underline cursor-pointer font-semibold"
                >
                  View all ({students.length})
                </button>
              )}
            </div>

            {students.length === 0 ? (
              <div className="text-center py-8 text-[#666666] text-xs">
                <p>No students enrolled yet.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="border-b border-[#D8DFFA] text-[#6B7399]">
                      <th className="pb-2.5 font-semibold">Student</th>
                      <th className="pb-2.5 font-semibold">Enrolled</th>
                      <th className="pb-2.5 font-semibold">Progress</th>
                      <th className="pb-2.5 font-semibold text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.slice(0, 5).map(s => (
                      <tr key={s.id || s.email} className="border-b border-[#D8DFFA] last:border-0">
                        <td className="py-3">
                          <div className="font-semibold text-[#010619]">{s.name || s.email.split('@')[0]}</div>
                          <div className="text-[11px] text-[#666666]">{s.email}</div>
                        </td>
                        <td className="py-3 text-[#666666]">{formatDate(s.purchasedAt || s.enrolledAt)}</td>
                        <td className="py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-20 bg-[#EEF1FB] border border-[#D8DFFA] rounded-full h-1.5 overflow-hidden">
                              <div
                                className="bg-[#194DF5] h-full rounded-full transition-all"
                                style={{ width: `${Math.min(100, s.progressPercentage || 0)}%` }}
                              />
                            </div>
                            <span className="text-[11px] font-semibold text-[#010619]">{s.progressPercentage || 0}%</span>
                          </div>
                        </td>
                        <td className="py-3 text-right">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            s.isCompleted || s.progressPercentage === 100
                              ? 'bg-[#22C55E]/10 text-[#22C55E]'
                              : 'bg-[#194DF5]/10 text-[#194DF5]'
                          }`}>
                            {s.isCompleted || s.progressPercentage === 100 ? 'Completed' : 'Active'}
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

      {/* Tab: Students */}
      {activeTab === 'students' && (
        <div className="bg-[#FFFFFF] border border-[#D8DFFA] rounded-xl p-5 space-y-4 shadow-xs">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <h3 className="text-sm font-bold text-[#010619]">Students ({students.length})</h3>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#6B7399]" />
              <input
                type="text"
                placeholder="Search students..."
                value={studentSearch}
                onChange={e => setStudentSearch(e.target.value)}
                className="w-full bg-[#FFFFFF] border border-[#D8DFFA] text-[#010619] placeholder-[#6B7399] text-xs pl-8 pr-3 py-1.5 rounded-full focus:outline-none focus:border-[#194DF5]"
              />
            </div>
          </div>

          {students.length === 0 ? (
            <div className="text-center py-12 text-[#666666] space-y-2">
              <GraduationCap className="h-8 w-8 mx-auto opacity-50 text-[#6B7399]" />
              <p className="text-sm font-semibold text-[#010619]">No students yet</p>
              <p className="text-xs">When someone purchases this course, they will appear here.</p>
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="text-center py-8 text-[#666666] text-xs">
              No students match &quot;{studentSearch}&quot;
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-[#D8DFFA] text-[#6B7399] text-[11px] uppercase tracking-wider">
                    <th className="pb-3 font-bold">Student</th>
                    <th className="pb-3 font-bold">Email</th>
                    <th className="pb-3 font-bold">Enrolled Date</th>
                    <th className="pb-3 font-bold">Progress</th>
                    <th className="pb-3 font-bold text-right">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStudents.map(s => (
                    <tr key={s.id || s.email} className="border-b border-[#D8DFFA] last:border-0 hover:bg-[#EEF1FB] transition-colors">
                      <td className="py-3 font-bold text-[#010619]">{s.name || s.email.split('@')[0]}</td>
                      <td className="py-3 text-[#666666]">{s.email}</td>
                      <td className="py-3 text-[#666666]">{formatDate(s.purchasedAt || s.enrolledAt)}</td>
                      <td className="py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-24 bg-[#EEF1FB] border border-[#D8DFFA] rounded-full h-2 overflow-hidden">
                            <div
                              className="bg-[#194DF5] h-full rounded-full transition-all"
                              style={{ width: `${Math.min(100, s.progressPercentage || 0)}%` }}
                            />
                          </div>
                          <span className="text-[11px] font-semibold text-[#010619]">
                            {s.progressPercentage || 0}%
                          </span>
                        </div>
                      </td>
                      <td className="py-3 text-right">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          s.isCompleted || s.progressPercentage === 100
                            ? 'bg-[#22C55E]/10 text-[#22C55E]'
                            : 'bg-[#194DF5]/10 text-[#194DF5]'
                        }`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${s.isCompleted || s.progressPercentage === 100 ? 'bg-[#22C55E]' : 'bg-[#194DF5]'}`} />
                          {s.isCompleted || s.progressPercentage === 100 ? 'Completed' : 'Active'}
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

      {/* Tab: Curriculum */}
      {activeTab === 'curriculum' && (
        <div className="bg-[#FFFFFF] border border-[#D8DFFA] rounded-xl p-5 space-y-4 shadow-xs">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-[#010619]">Course Curriculum</h3>
            <span className="text-xs text-[#666666]">
              {curriculum.modules?.length || 0} Modules · {curriculum.modules?.reduce((acc, m) => acc + (m.lessons?.length || 0), 0) || 0} Lessons
            </span>
          </div>

          {(!curriculum.modules || curriculum.modules.length === 0) ? (
            <div className="text-center py-12 text-[#666666] space-y-2">
              <BookOpen className="h-8 w-8 mx-auto opacity-50 text-[#6B7399]" />
              <p className="text-sm font-semibold text-[#010619]">No curriculum modules created yet</p>
              <p className="text-xs">Add modules and lessons in the course editor to structure your content.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {curriculum.modules.map((mod, idx) => {
                const isExpanded = expandedModules[mod.id] !== false
                return (
                  <div key={mod.id} className="border border-[#D8DFFA] rounded-xl overflow-hidden bg-[#FFFFFF]">
                    <button
                      type="button"
                      onClick={() => toggleModule(mod.id)}
                      className="w-full flex items-center justify-between p-3.5 hover:bg-[#EEF1FB] transition-colors text-left cursor-pointer"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4 text-[#666666] shrink-0" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-[#666666] shrink-0" />
                        )}
                        <span className="font-bold text-xs text-[#010619] truncate">
                          Module {idx + 1}: {mod.title}
                        </span>
                      </div>
                      <span className="text-[11px] text-[#666666] shrink-0 ml-2">
                        {mod.lessons?.length || 0} {(mod.lessons?.length || 0) === 1 ? 'lesson' : 'lessons'}
                      </span>
                    </button>

                    {isExpanded && (
                      <div className="border-t border-[#D8DFFA] divide-y divide-[#D8DFFA]">
                        {(!mod.lessons || mod.lessons.length === 0) ? (
                          <div className="p-3 text-[11px] text-[#666666] text-center">
                            No lessons in this module.
                          </div>
                        ) : (
                          mod.lessons.map((lesson, lIdx) => (
                            <div key={lesson.id} className="p-3 flex items-center justify-between gap-3 text-xs hover:bg-[#EEF1FB]">
                              <div className="flex items-center gap-2.5 min-w-0">
                                <span className="text-[11px] text-[#6B7399] font-mono">{idx + 1}.{lIdx + 1}</span>
                                {lesson.contentType === 'VIDEO' ? (
                                  <Video className="h-3.5 w-3.5 text-[#194DF5] shrink-0" />
                                ) : lesson.contentType === 'PDF' ? (
                                  <FileText className="h-3.5 w-3.5 text-[#F59E0B] shrink-0" />
                                ) : (
                                  <BookOpen className="h-3.5 w-3.5 text-[#22C55E] shrink-0" />
                                )}
                                <span className="font-medium text-[#010619] truncate">{lesson.title}</span>
                              </div>
                              <div className="flex items-center gap-2 shrink-0 text-[11px]">
                                {lesson.isPreview && (
                                  <span className="px-1.5 py-0.5 rounded bg-[#F0F5FF] text-[#194DF5] font-semibold text-[10px]">
                                    Free Preview
                                  </span>
                                )}
                                {lesson.duration && (
                                  <span className="text-[#666666]">{lesson.duration}</span>
                                )}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab: Analytics */}
      {activeTab === 'analytics' && (
        <div className="bg-[#FFFFFF] border border-[#D8DFFA] rounded-xl p-5 space-y-4 shadow-xs">
          <h3 className="text-sm font-bold text-[#010619]">Course Analytics</h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-[#EEF1FB] border border-[#D8DFFA] rounded-xl p-4">
              <div className="text-xs text-[#666666] font-semibold">Total Revenue</div>
              <div className="text-2xl font-bold text-[#010619] mt-1">
                {formatMoney(analytics.revenue || 0, currency)}
              </div>
            </div>
            <div className="bg-[#EEF1FB] border border-[#D8DFFA] rounded-xl p-4">
              <div className="text-xs text-[#666666] font-semibold">Enrolled Students</div>
              <div className="text-2xl font-bold text-[#010619] mt-1">
                {analytics.totalStudents || students.length}
              </div>
            </div>
            <div className="bg-[#EEF1FB] border border-[#D8DFFA] rounded-xl p-4">
              <div className="text-xs text-[#666666] font-semibold">Avg Completion Rate</div>
              <div className="text-2xl font-bold text-[#22C55E] mt-1">
                {analytics.completionRate || 0}%
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Settings */}
      {activeTab === 'settings' && (
        <form onSubmit={handleSaveSettings} className="bg-[#FFFFFF] border border-[#D8DFFA] rounded-xl p-5 space-y-4 shadow-xs">
          <h3 className="text-sm font-bold text-[#010619]">Course Settings</h3>
          
          <div className="space-y-3 text-xs">
            <div>
              <label className="block text-[#333333] mb-1 font-semibold">Course Title</label>
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
                placeholder="Brief summary for storefront cards..."
                className="bg-[#FFFFFF] border-[#D8DFFA] text-[#010619]"
              />
            </div>

            <div>
              <label className="block text-[#333333] mb-1 font-semibold">Full Description</label>
              <Textarea
                rows={4}
                value={formData.description}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
                placeholder="Course curriculum, prerequisites, what students will learn..."
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
