'use client'

import { use, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { api, formatMoney } from '@/lib/clientApi'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import {
  ArrowLeft, Plus, Trash2, Eye, EyeOff, Loader2, Video, FileText, File, Link as LinkIcon,
  MoveUp, MoveDown, Check, Upload, AlertCircle, Users, BarChart3, Settings, PlayCircle, ExternalLink
} from 'lucide-react'

export default function CourseBuilderPage({ params: paramsPromise }) {
  const params = use(paramsPromise)
  const courseId = params.id
  const router = useRouter()

  const [data, setData] = useState(null)
  const [selectedLesson, setSelectedLesson] = useState(null)
  const [loading, setLoading] = useState(false)
  const [savingLesson, setSavingLesson] = useState(false)
  const [savingCourse, setSavingCourse] = useState(false)
  const [uploadingPdf, setUploadingPdf] = useState(false)
  const [activeTab, setActiveTab] = useState('curriculum') // 'curriculum' | 'details' | 'students'

  const [students, setStudents] = useState([])
  const [analytics, setAnalytics] = useState(null)
  const [courseForm, setCourseForm] = useState({})

  const load = () => {
    api.get(`/courses/${courseId}`)
      .then((r) => {
        setData(r)
        if (r.course) {
          setCourseForm({
            title: r.course.title || '',
            shortDescription: r.course.shortDescription || '',
            description: r.course.description || '',
            thumbnail: r.course.thumbnail || '',
            instructor: r.course.instructor || '',
            difficulty: r.course.difficulty || 'Beginner',
            duration: r.course.duration || '',
            price: r.product?.price || 0,
            currency: r.product?.currency || 'usd',
          })
        }
        if (selectedLesson) {
          const fresh = r.lessons.find((l) => l.id === selectedLesson.id)
          if (fresh) setSelectedLesson(fresh)
        } else if (r.lessons.length > 0) {
          setSelectedLesson(r.lessons[0])
        }
      })
      .catch((e) => toast.error(e.message))
  }

  const loadStudentsAndAnalytics = () => {
    api.get(`/courses/${courseId}/students`)
      .then((r) => setStudents(r.students || []))
      .catch(() => setStudents([]))

    api.get(`/courses/${courseId}/analytics`)
      .then((r) => setAnalytics(r))
      .catch(() => setAnalytics(null))
  }

  useEffect(() => { load() }, [courseId])
  useEffect(() => {
    if (activeTab === 'students') loadStudentsAndAnalytics()
  }, [activeTab, courseId])

  if (!data) {
    return <div className="space-y-4"><Skeleton className="h-10 w-48" /><Skeleton className="h-96 w-full rounded-2xl" /></div>
  }

  const { course, modules, lessons, product } = data

  // Module actions
  async function handleAddModule() {
    try {
      await api.post(`/courses/${courseId}/modules`, { title: `Module ${modules.length + 1}` })
      toast.success('Module added')
      await load()
    } catch (e) { toast.error(e.message) }
  }

  async function handleDeleteModule(moduleId) {
    if (!confirm('Delete this module and all its lessons?')) return
    try {
      await api.del(`/modules/${moduleId}`)
      toast.success('Module deleted')
      await load()
    } catch (e) { toast.error(e.message) }
  }

  async function handleMoveModule(index, direction) {
    const targetIdx = index + direction
    if (targetIdx < 0 || targetIdx >= modules.length) return
    const reordered = [...modules]
    const [moved] = reordered.splice(index, 1)
    reordered.splice(targetIdx, 0, moved)
    const moduleIds = reordered.map((m) => m.id)
    try {
      await api.post(`/courses/${courseId}/modules/reorder`, { moduleIds })
      toast.success('Module reordered')
      await load()
    } catch (e) { toast.error(e.message) }
  }

  // Lesson actions
  async function handleAddLesson(moduleId) {
    try {
      const res = await api.post(`/modules/${moduleId}/lessons`, { title: 'New Lesson', contentType: 'VIDEO' })
      toast.success('Lesson added')
      await load()
      setSelectedLesson(res.lesson)
    } catch (e) { toast.error(e.message) }
  }

  async function handleMoveLesson(modLessons, index, direction, moduleId) {
    const targetIdx = index + direction
    if (targetIdx < 0 || targetIdx >= modLessons.length) return
    const reordered = [...modLessons]
    const [moved] = reordered.splice(index, 1)
    reordered.splice(targetIdx, 0, moved)
    const lessonIds = reordered.map((l) => l.id)
    try {
      await api.post(`/modules/${moduleId}/lessons/reorder`, { lessonIds })
      toast.success('Lesson reordered')
      await load()
    } catch (e) { toast.error(e.message) }
  }

  async function handleSaveLesson(e) {
    if (e) e.preventDefault()
    if (!selectedLesson) return
    setSavingLesson(true)
    try {
      await api.patch(`/lessons/${selectedLesson.id}`, selectedLesson)
      toast.success('Lesson saved')
      await load()
    } catch (e) { toast.error(e.message) }
    finally { setSavingLesson(false) }
  }

  async function handleDeleteLesson(lessonId) {
    if (!confirm('Delete this lesson?')) return
    try {
      await api.del(`/lessons/${lessonId}`)
      toast.success('Lesson deleted')
      setSelectedLesson(null)
      await load()
    } catch (e) { toast.error(e.message) }
  }

  async function handleUploadPdf(e) {
    const file = e.target.files?.[0]
    if (!file || !selectedLesson) return
    if (!file.type.includes('pdf')) { toast.error('Only PDF files are allowed'); return }
    
    setUploadingPdf(true)
    const formData = new FormData()
    formData.append('file', file)
    try {
      const res = await api.upload(`/lessons/${selectedLesson.id}/file`, formData)
      toast.success('PDF uploaded successfully')
      setSelectedLesson(res.lesson)
      await load()
    } catch (err) { toast.error(err.message) }
    finally { setUploadingPdf(false) }
  }

  // Course Details Save
  async function handleSaveCourse(e) {
    if (e) e.preventDefault()
    setSavingCourse(true)
    try {
      await api.patch(`/courses/${courseId}`, courseForm)
      toast.success('Course details updated')
      await load()
    } catch (err) { toast.error(err.message) }
    finally { setSavingCourse(false) }
  }

  // Publish / Archive
  async function handleTogglePublish() {
    setLoading(true)
    try {
      if (course.status === 'PUBLISHED') {
        await api.post(`/courses/${courseId}/unpublish`)
        toast.success('Course unpublished')
      } else {
        await api.post(`/courses/${courseId}/publish`)
        toast.success('Course published!')
      }
      await load()
    } catch (e) { toast.error(e.message) }
    finally { setLoading(false) }
  }

  // Publish validation checks
  const validationErrors = []
  if (!course.title || !course.title.trim()) validationErrors.push('Course title is required.')
  if (!lessons || lessons.length === 0) validationErrors.push('Add at least one lesson to publish.')
  if (product && Number(product.price) < 0) validationErrors.push('Product price must be non-negative.')

  return (
    <div className="space-y-6">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <Link href="/dashboard/courses" className="inline-flex items-center text-xs text-muted-foreground hover:text-foreground mb-1">
            <ArrowLeft className="mr-1 h-3.5 w-3.5" /> Back to courses
          </Link>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight">{course.title}</h1>
            <Badge className={course.status === 'PUBLISHED' ? 'bg-emerald-100 text-emerald-800 font-bold border-0' : 'bg-primary/10 text-primary font-bold border-0'}>
              {course.status}
            </Badge>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {product && (
            <span className="text-sm font-bold text-[#F4F2EC]">
              {Number(product.price) === 0 ? 'Free' : formatMoney(product.price, product.currency)}
            </span>
          )}
          <Button onClick={handleTogglePublish} disabled={loading} variant={course.status === 'PUBLISHED' ? 'outline' : 'default'} className="font-bold">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : course.status === 'PUBLISHED' ? <><EyeOff className="mr-1.5 h-4 w-4" /> Unpublish</> : <><Eye className="mr-1.5 h-4 w-4" /> Publish Course</>}
          </Button>
        </div>
      </div>

      {/* Validation Banner if errors present and unpublished */}
      {course.status !== 'PUBLISHED' && validationErrors.length > 0 && (
        <div className="flex items-start gap-3 rounded-2xl bg-amber-50 border border-amber-200 p-4 text-amber-900 text-xs">
          <AlertCircle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
          <div className="space-y-1">
            <p className="font-bold">Publishing Requirements Checklist:</p>
            <ul className="list-disc list-inside space-y-0.5">
              {validationErrors.map((err, idx) => <li key={idx}>{err}</li>)}
            </ul>
          </div>
        </div>
      )}

      {/* Guided Navigation Tabs */}
      <div className="flex border-b border-border text-sm font-semibold gap-6">
        <button
          onClick={() => setActiveTab('curriculum')}
          className={`pb-3 transition-colors ${activeTab === 'curriculum' ? 'border-b-2 border-primary text-primary font-bold' : 'text-muted-foreground hover:text-foreground'}`}
        >
          Curriculum Builder
        </button>
        <button
          onClick={() => setActiveTab('details')}
          className={`pb-3 transition-colors ${activeTab === 'details' ? 'border-b-2 border-primary text-primary font-bold' : 'text-muted-foreground hover:text-foreground'}`}
        >
          Course Details & Pricing
        </button>
        <button
          onClick={() => setActiveTab('students')}
          className={`pb-3 transition-colors ${activeTab === 'students' ? 'border-b-2 border-primary text-primary font-bold' : 'text-muted-foreground hover:text-foreground'}`}
        >
          Students & Analytics
        </button>
      </div>

      {/* TAB 1: CURRICULUM BUILDER (3-COLUMN LAYOUT) */}
      {activeTab === 'curriculum' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* LEFT: CURRICULUM SIDEBAR (4 cols) */}
          <div className="lg:col-span-4 rounded-2xl border border-border bg-card p-4 space-y-4 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-xs uppercase tracking-wider text-muted-foreground">Curriculum Tree</h2>
              <Button size="sm" variant="outline" onClick={handleAddModule} className="font-bold text-xs">
                <Plus className="h-3.5 w-3.5 mr-1" /> Module
              </Button>
            </div>

            <div className="space-y-4">
              {modules.map((m, mIdx) => {
                const modLessons = lessons.filter((l) => l.moduleId === m.id)
                return (
                  <div key={m.id} className="rounded-xl border border-border bg-secondary/30 p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-sm text-foreground">{m.title}</span>
                      </div>
                      <div className="flex items-center gap-0.5">
                        <Button size="icon" variant="ghost" className="h-6 w-6 text-muted-foreground" disabled={mIdx === 0} onClick={() => handleMoveModule(mIdx, -1)}>
                          <MoveUp className="h-3 w-3" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-6 w-6 text-muted-foreground" disabled={mIdx === modules.length - 1} onClick={() => handleMoveModule(mIdx, 1)}>
                          <MoveDown className="h-3 w-3" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-6 w-6 text-muted-foreground hover:text-destructive" onClick={() => handleDeleteModule(m.id)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>

                    {/* Lesson Items */}
                    <div className="space-y-1 pl-1">
                      {modLessons.map((l, lIdx) => {
                        const isSel = selectedLesson?.id === l.id
                        return (
                          <div key={l.id} className="flex items-center justify-between gap-1">
                            <button
                              type="button"
                              onClick={() => setSelectedLesson(l)}
                              className={`flex items-center justify-between flex-1 text-left px-2.5 py-1.5 rounded-lg text-xs transition-colors ${
                                isSel ? 'bg-primary text-primary-foreground font-bold' : 'hover:bg-accent text-foreground'
                              }`}
                            >
                              <span className="truncate">{l.title}</span>
                              <div className="flex items-center gap-1">
                                {l.contentType === 'VIDEO' && <Video className="h-3 w-3 opacity-70" />}
                                {l.contentType === 'TEXT' && <FileText className="h-3 w-3 opacity-70" />}
                                {l.contentType === 'PDF' && <File className="h-3 w-3 opacity-70" />}
                                {(l.contentType === 'LINK' || l.contentType === 'EXTERNAL_RESOURCE') && <LinkIcon className="h-3 w-3 opacity-70" />}
                                {l.isPreview && <Badge className="text-[9px] px-1 py-0 bg-amber-200 text-amber-900 border-0">Preview</Badge>}
                              </div>
                            </button>

                            <div className="flex items-center opacity-60 hover:opacity-100">
                              <button disabled={lIdx === 0} onClick={() => handleMoveLesson(modLessons, lIdx, -1, m.id)} className="p-1 hover:text-primary disabled:opacity-30">
                                <MoveUp className="h-2.5 w-2.5" />
                              </button>
                              <button disabled={lIdx === modLessons.length - 1} onClick={() => handleMoveLesson(modLessons, lIdx, 1, m.id)} className="p-1 hover:text-primary disabled:opacity-30">
                                <MoveDown className="h-2.5 w-2.5" />
                              </button>
                            </div>
                          </div>
                        )
                      })}
                    </div>

                    <Button size="sm" variant="ghost" className="w-full text-xs text-muted-foreground justify-start h-7 mt-1 font-semibold" onClick={() => handleAddLesson(m.id)}>
                      <Plus className="h-3 w-3 mr-1" /> Add Lesson
                    </Button>
                  </div>
                )
              })}
            </div>
          </div>

          {/* CENTER: LESSON EDITOR (5 cols) */}
          <div className="lg:col-span-5 rounded-2xl border border-border bg-card p-6 space-y-4 shadow-sm">
            {selectedLesson ? (
              <form onSubmit={handleSaveLesson} className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="font-bold text-base">Lesson Editor</h2>
                  <Button size="sm" type="submit" disabled={savingLesson} className="font-bold">
                    {savingLesson ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <><Check className="h-3.5 w-3.5 mr-1" /> Save Lesson</>}
                  </Button>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="l-title">Lesson Title</Label>
                  <Input
                    id="l-title"
                    value={selectedLesson.title || ''}
                    onChange={(e) => setSelectedLesson({ ...selectedLesson, title: e.target.value })}
                    placeholder="e.g. Introduction & Setup"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="l-type">Content Type</Label>
                  <Select
                    value={selectedLesson.contentType === 'EXTERNAL_RESOURCE' ? 'LINK' : (selectedLesson.contentType || 'VIDEO')}
                    onValueChange={(val) => setSelectedLesson({ ...selectedLesson, contentType: val === 'LINK' ? 'EXTERNAL_RESOURCE' : val })}
                  >
                    <SelectTrigger id="l-type"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="VIDEO">Video Lesson</SelectItem>
                      <SelectItem value="TEXT">Text Article / HTML</SelectItem>
                      <SelectItem value="PDF">PDF Resource</SelectItem>
                      <SelectItem value="LINK">External Resource Link</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* VIDEO EDITOR */}
                {selectedLesson.contentType === 'VIDEO' && (
                  <div className="space-y-3 p-3 rounded-xl border border-border bg-muted/20">
                    <div className="space-y-1.5">
                      <Label htmlFor="l-video">Video URL (YouTube, Vimeo, or Direct MP4)</Label>
                      <Input
                        id="l-video"
                        type="url"
                        value={selectedLesson.videoUrl || ''}
                        onChange={(e) => setSelectedLesson({ ...selectedLesson, videoUrl: e.target.value })}
                        placeholder="https://www.youtube.com/watch?v=..."
                      />
                    </div>
                    {selectedLesson.videoUrl && (
                      <div className="aspect-video w-full rounded-lg overflow-hidden bg-black flex items-center justify-center">
                        {selectedLesson.videoUrl.includes('youtube.com') || selectedLesson.videoUrl.includes('youtu.be') ? (
                          <iframe src={selectedLesson.videoUrl.replace('watch?v=', 'embed/')} className="w-full h-full border-0" />
                        ) : (
                          <p className="text-xs text-slate-300 flex items-center gap-1"><PlayCircle className="h-4 w-4 text-primary" /> Video URL configured</p>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* TEXT EDITOR */}
                {selectedLesson.contentType === 'TEXT' && (
                  <div className="space-y-1.5">
                    <Label htmlFor="l-content">Lesson Content (HTML / Text)</Label>
                    <Textarea
                      id="l-content"
                      rows={8}
                      value={selectedLesson.content || ''}
                      onChange={(e) => setSelectedLesson({ ...selectedLesson, content: e.target.value })}
                      placeholder="Write instructions, code snippets, or notes..."
                    />
                  </div>
                )}

                {/* PDF EDITOR */}
                {selectedLesson.contentType === 'PDF' && (
                  <div className="space-y-3 p-3 rounded-xl border border-border bg-muted/20">
                    <Label>PDF File Attachment</Label>
                    {selectedLesson.pdfFileName ? (
                      <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-background text-xs">
                        <div className="flex items-center gap-2 truncate">
                          <File className="h-4 w-4 text-red-500 shrink-0" />
                          <span className="truncate font-semibold">{selectedLesson.pdfFileName}</span>
                        </div>
                        <Button size="xs" variant="outline" type="button" onClick={() => setSelectedLesson({ ...selectedLesson, pdfFileId: null, pdfFileName: null })}>
                          Remove
                        </Button>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center border-2 border-dashed border-border p-4 rounded-xl text-center bg-background">
                        <Upload className="h-6 w-6 text-muted-foreground mb-1" />
                        <p className="text-xs text-muted-foreground">Upload lesson PDF file</p>
                        <input type="file" accept="application/pdf" onChange={handleUploadPdf} disabled={uploadingPdf} className="mt-2 text-xs" />
                        {uploadingPdf && <Loader2 className="h-4 w-4 animate-spin text-primary mt-2" />}
                      </div>
                    )}
                  </div>
                )}

                {/* LINK EDITOR */}
                {(selectedLesson.contentType === 'LINK' || selectedLesson.contentType === 'EXTERNAL_RESOURCE') && (
                  <div className="space-y-1.5 p-3 rounded-xl border border-border bg-muted/20">
                    <Label htmlFor="l-res">Resource URL (Must begin with https://)</Label>
                    <Input
                      id="l-res"
                      type="url"
                      value={selectedLesson.resourceUrl || ''}
                      onChange={(e) => setSelectedLesson({ ...selectedLesson, resourceUrl: e.target.value })}
                      placeholder="https://github.com/..."
                    />
                  </div>
                )}

                <div className="space-y-1.5">
                  <Label htmlFor="l-desc">Short Summary</Label>
                  <Input
                    id="l-desc"
                    value={selectedLesson.description || ''}
                    onChange={(e) => setSelectedLesson({ ...selectedLesson, description: e.target.value })}
                    placeholder="Brief lesson overview"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="l-dur">Duration (optional)</Label>
                  <Input
                    id="l-dur"
                    value={selectedLesson.duration || ''}
                    onChange={(e) => setSelectedLesson({ ...selectedLesson, duration: e.target.value })}
                    placeholder="e.g. 12 mins"
                  />
                </div>
              </form>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
                <p className="text-sm">Select a lesson from the curriculum sidebar to edit.</p>
              </div>
            )}
          </div>

          {/* RIGHT: LESSON SETTINGS PANEL (3 cols) */}
          <div className="lg:col-span-3 rounded-2xl border border-border bg-card p-4 space-y-4 shadow-sm">
            <h2 className="font-bold text-xs uppercase tracking-wider text-muted-foreground">Lesson Settings</h2>

            {selectedLesson ? (
              <div className="space-y-4 text-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-bold text-xs">Free Preview</p>
                    <p className="text-[11px] text-muted-foreground">Allow unpaid users to view this lesson</p>
                  </div>
                  <Switch
                    checked={!!selectedLesson.isPreview}
                    onCheckedChange={(chk) => setSelectedLesson({ ...selectedLesson, isPreview: chk })}
                  />
                </div>

                <div className="pt-4 border-t border-border">
                  <Button variant="destructive" size="sm" className="w-full font-bold" onClick={() => handleDeleteLesson(selectedLesson.id)}>
                    <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete Lesson
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">Select a lesson to configure preview settings.</p>
            )}
          </div>

        </div>
      )}

      {/* TAB 2: COURSE DETAILS & PRICING */}
      {activeTab === 'details' && (
        <form onSubmit={handleSaveCourse} className="max-w-3xl rounded-2xl border border-border bg-card p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <h2 className="font-bold text-lg">Course Configuration & Pricing</h2>
            <Button type="submit" disabled={savingCourse} className="font-bold">
              {savingCourse ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save Changes'}
            </Button>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="c-title">Course Title</Label>
            <Input id="c-title" value={courseForm.title || ''} onChange={(e) => setCourseForm({ ...courseForm, title: e.target.value })} required />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="c-short">Short Subtitle / Description</Label>
            <Input id="c-short" value={courseForm.shortDescription || ''} onChange={(e) => setCourseForm({ ...courseForm, shortDescription: e.target.value })} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="c-price">Price (₹ or $)</Label>
              <Input id="c-price" type="number" min="0" step="0.01" value={courseForm.price || 0} onChange={(e) => setCourseForm({ ...courseForm, price: parseFloat(e.target.value) || 0 })} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="c-currency">Currency</Label>
              <Select value={courseForm.currency || 'usd'} onValueChange={(val) => setCourseForm({ ...courseForm, currency: val })}>
                <SelectTrigger id="c-currency"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="inr">INR (₹)</SelectItem>
                  <SelectItem value="usd">USD ($)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="c-inst">Instructor Name</Label>
              <Input id="c-inst" value={courseForm.instructor || ''} onChange={(e) => setCourseForm({ ...courseForm, instructor: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="c-diff">Difficulty Level</Label>
              <Select value={courseForm.difficulty || 'Beginner'} onValueChange={(val) => setCourseForm({ ...courseForm, difficulty: val })}>
                <SelectTrigger id="c-diff"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Beginner">Beginner</SelectItem>
                  <SelectItem value="Intermediate">Intermediate</SelectItem>
                  <SelectItem value="Advanced">Advanced</SelectItem>
                  <SelectItem value="All Levels">All Levels</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="c-thumb">Thumbnail Image URL</Label>
            <Input id="c-thumb" type="url" value={courseForm.thumbnail || ''} onChange={(e) => setCourseForm({ ...courseForm, thumbnail: e.target.value })} placeholder="https://..." />
            {courseForm.thumbnail && <img src={courseForm.thumbnail} alt="Preview" className="h-20 w-32 object-cover rounded-lg border mt-2" />}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="c-desc">Detailed Course Description (HTML supported)</Label>
            <Textarea id="c-desc" rows={6} value={courseForm.description || ''} onChange={(e) => setCourseForm({ ...courseForm, description: e.target.value })} />
          </div>
        </form>
      )}

      {/* TAB 3: STUDENTS & ANALYTICS */}
      {activeTab === 'students' && (
        <div className="space-y-6 max-w-4xl">
          {/* Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="rounded-2xl border border-border bg-card p-4 space-y-1 shadow-sm">
              <p className="text-xs font-semibold text-muted-foreground">Total Students</p>
              <p className="text-2xl font-black text-foreground">{analytics?.totalStudents || students.length}</p>
            </div>
            <div className="rounded-2xl border border-border bg-card p-4 space-y-1 shadow-sm">
              <p className="text-xs font-semibold text-muted-foreground">Course Revenue</p>
              <p className="text-2xl font-black text-foreground">{formatMoney(analytics?.revenue || 0, product?.currency)}</p>
            </div>
            <div className="rounded-2xl border border-border bg-card p-4 space-y-1 shadow-sm">
              <p className="text-xs font-semibold text-muted-foreground">Completion Rate</p>
              <p className="text-2xl font-black text-foreground">{analytics?.completionRate || 0}%</p>
            </div>
            <div className="rounded-2xl border border-border bg-card p-4 space-y-1 shadow-sm">
              <p className="text-xs font-semibold text-muted-foreground">Avg Progress</p>
              <p className="text-2xl font-black text-foreground">{analytics?.averageProgress || 0}%</p>
            </div>
          </div>

          {/* Student Roster Table */}
          <div className="rounded-2xl border border-border bg-card p-5 space-y-4 shadow-sm">
            <h2 className="font-bold text-base">Enrolled Students</h2>
            {students.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">No students have enrolled in this course yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-border text-muted-foreground font-bold uppercase">
                    <tr>
                      <th className="pb-3">Student</th>
                      <th className="pb-3">Enrolled On</th>
                      <th className="pb-3">Progress</th>
                      <th className="pb-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {students.map((s) => (
                      <tr key={s.id}>
                        <td className="py-3 font-semibold text-foreground">
                          {s.name} <span className="text-muted-foreground font-normal">({s.email})</span>
                        </td>
                        <td className="py-3 text-muted-foreground">{new Date(s.purchasedAt).toLocaleDateString()}</td>
                        <td className="py-3 font-bold">{s.completedLessons}/{s.totalLessons} ({s.progressPercentage}%)</td>
                        <td className="py-3">
                          <Badge className={s.isCompleted ? 'bg-emerald-100 text-emerald-800 border-0' : 'bg-slate-100 text-[#F4F2EC] border-0'}>
                            {s.isCompleted ? 'Completed' : 'In Progress'}
                          </Badge>
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

    </div>
  )
}
