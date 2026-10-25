'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { api } from '@/lib/clientApi'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Plus, GraduationCap, MoreVertical, Pencil, Trash2, Eye, EyeOff, Loader2, Sparkles, Settings } from 'lucide-react'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import CourseWizardModal from '@/components/course/CourseWizardModal'

const STATUS = {
  DRAFT: { label: 'Draft', cls: 'bg-[#EEF1FB] text-[#010619] font-semibold border border-[#D8DFFA]' },
  PUBLISHED: { label: 'Published', cls: 'bg-emerald-50 text-emerald-700 font-bold border border-emerald-200' },
  ARCHIVED: { label: 'Archived', cls: 'bg-amber-50 text-amber-700 font-semibold border border-amber-200' },
}

export default function CoursesDashboardPage() {
  const router = useRouter()
  const [courses, setCourses] = useState(null)
  const [busy, setBusy] = useState(null)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [wizardOpen, setWizardOpen] = useState(false)
  const [editingCourseId, setEditingCourseId] = useState(null)

  const load = (p = page) => {
    api.get(`/courses?page=${p}&limit=20`)
      .then((r) => {
        setCourses(r.courses || r.items || [])
        if (r.totalPages) setTotalPages(r.totalPages)
      })
      .catch(() => setCourses([]))
  }

  useEffect(() => { load(page) }, [page])

  async function togglePublish(c) {
    setBusy(c.id)
    try {
      if (c.status === 'PUBLISHED') {
        await api.post(`/courses/${c.id}/archive`)
        toast.success('Unpublished course')
      } else {
        await api.post(`/courses/${c.id}/publish`)
        toast.success('Published course')
      }
      await load()
    } catch (e) {
      toast.error(e.message)
    } finally {
      setBusy(null)
    }
  }

  async function remove(c) {
    if (!confirm('Delete this course? All modules and lessons will be removed.')) return
    setBusy(c.id)
    try {
      await api.del(`/courses/${c.id}`)
      toast.success('Course deleted')
      await load()
    } catch (e) {
      toast.error(e.message)
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="space-y-6 text-[#010619]">

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-6 sm:p-8 rounded-2xl border border-[#D8DFFA] shadow-xs">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary bg-primary/10 px-3 py-1 rounded-full border border-primary/20 mb-1">
            <Sparkles className="h-3.5 w-3.5" /> Learning Platform
          </div>
          <h1 className="text-3xl font-bold text-[#010619] tracking-tight">Online Courses</h1>
          <p className="text-sm text-[#666666] font-medium">Manage and view your existing courses.</p>
        </div>
      </div>

      {courses === null ? (
        <div className="space-y-4">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-2xl" />)}</div>
      ) : courses.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed border-[#D8DFFA] bg-white py-20 text-center shadow-xs">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary border border-primary/20">
            <GraduationCap className="h-8 w-8" />
          </div>
          <div className="space-y-1 max-w-sm">
            <p className="text-xl font-bold text-[#010619]">No active courses</p>
            <p className="text-xs text-[#666666] font-medium leading-relaxed">The Courses feature has been retired and new courses cannot be created. You can manage products, coaching, and services from your products dashboard.</p>
          </div>
          <Link
            href="/dashboard/products"
            className="font-bold bg-primary hover:bg-primary/90 text-white rounded-xl h-11 px-5 shadow-xs inline-flex items-center gap-1.5 mt-2 cursor-pointer transition-all text-sm"
          >
            Go to Products
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="space-y-3">
            {courses.map((c) => {
              const st = STATUS[c.status] || STATUS.DRAFT
              return (
                <div key={c.id} className="flex items-center gap-4 rounded-2xl border border-[#D8DFFA] bg-white p-5 shadow-xs hover:border-[#CCCCCC] transition-all">
                  <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-[#EEF1FB] text-primary border border-[#D8DFFA] flex items-center justify-center font-bold">
                    {c.thumbnail ? (
                      <img src={c.thumbnail} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <GraduationCap className="h-7 w-7" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center gap-2.5">
                      <p className="truncate font-bold text-base text-[#010619]">{c.title}</p>
                      <Badge className={`${st.cls}`}>{st.label}</Badge>
                    </div>
                    <p className="truncate text-xs text-[#666666] font-medium">{c.shortDescription || 'Course Program'}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditingCourseId(c.id)
                        setWizardOpen(true)
                      }}
                      className="font-medium text-xs border-[#D8DFFA] bg-white text-[#010619] hover:bg-[#E8EDFB] cursor-pointer rounded-xl"
                    >
                      <Settings className="h-3.5 w-3.5 mr-1" /> Setup
                    </Button>
                    <Link href={`/dashboard/courses/${c.id}`}>
                      <Button size="sm" variant="outline" className="font-medium text-xs border-[#D8DFFA] bg-white text-[#010619] hover:bg-[#E8EDFB] rounded-xl cursor-pointer">
                        <Pencil className="h-3.5 w-3.5 mr-1" /> Curriculum
                      </Button>
                    </Link>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="sm" variant="ghost" disabled={busy === c.id} className="text-[#666666] hover:text-[#010619] hover:bg-[#E8EDFB] rounded-xl cursor-pointer">
                          {busy === c.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <MoreVertical className="h-4 w-4" />}
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="rounded-xl p-2 bg-white border-[#D8DFFA] text-[#010619] shadow-lg">
                        <DropdownMenuItem onClick={() => { setEditingCourseId(c.id); setWizardOpen(true) }} className="font-medium text-xs cursor-pointer">
                          <Settings className="mr-2 h-4 w-4 text-primary" />Edit Setup Wizard
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => togglePublish(c)} className="font-medium text-xs cursor-pointer">
                          {c.status === 'PUBLISHED' ? <><EyeOff className="mr-2 h-4 w-4 text-[#666666]" />Unpublish</> : <><Eye className="mr-2 h-4 w-4 text-primary" />Publish</>}
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-red-600 font-medium text-xs hover:bg-red-50 cursor-pointer" onClick={() => remove(c)}>
                          <Trash2 className="mr-2 h-4 w-4" />Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              )
            })}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4 text-xs font-semibold text-[#666666]">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="rounded-xl border-[#D8DFFA] bg-white hover:bg-[#E8EDFB] text-[#010619]">Previous</Button>
              <span>Page {page} of {totalPages}</span>
              <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="rounded-xl border-[#D8DFFA] bg-white hover:bg-[#E8EDFB] text-[#010619]">Next</Button>
            </div>
          )}
        </div>
      )}

      {/* Course 7-Step Setup Wizard Modal */}
      <CourseWizardModal
        open={wizardOpen}
        onClose={() => {
          setWizardOpen(false)
          setEditingCourseId(null)
        }}
        onSuccess={async () => {
          await load()
          setWizardOpen(false)
          setEditingCourseId(null)
        }}
        editCourseId={editingCourseId}
      />
    </div>
  )
}
