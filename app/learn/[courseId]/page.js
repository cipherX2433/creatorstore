'use client'

import { use, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { api } from '@/lib/clientApi'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  GraduationCap, CheckCircle2, Lock, Play, ChevronLeft, ChevronRight, Award,
  ExternalLink, FileText, File, AlertCircle, Loader2, Sparkles, Download, Music, Video
} from 'lucide-react'

export default function CoursePlayerPage({ params: paramsPromise }) {
  const params = use(paramsPromise)
  const courseId = params.id || params.courseId
  const router = useRouter()

  const [playerData, setPlayerData] = useState(null)
  const [activeLesson, setActiveLesson] = useState(null)
  const [lessonContent, setLessonContent] = useState(null)
  const [loadingLesson, setLoadingLesson] = useState(false)
  const [tracking, setTracking] = useState(false)
  const [cert, setCert] = useState(null)

  const loadPlayer = () => {
    const savedEmail = typeof window !== 'undefined' ? localStorage.getItem('creatorzero_customer_email') : null
    const queryEmail = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('email') : null
    const emailToUse = queryEmail || savedEmail
    const url = emailToUse ? `/learning/courses/${courseId}?email=${encodeURIComponent(emailToUse)}` : `/learning/courses/${courseId}`

    api.get(url)
      .then((res) => {
        setPlayerData(res)
        if (!activeLesson) {
          for (const m of res.curriculum || []) {
            for (const l of m.lessons || []) {
              if (!l.isLocked) {
                setActiveLesson(l)
                return
              }
            }
          }
        }
      })
      .catch((e) => {
        toast.error(e.message || 'Course access required')
      })
  }

  useEffect(() => { loadPlayer() }, [courseId])

  useEffect(() => {
    if (!activeLesson) return
    setLoadingLesson(true)
    const savedEmail = typeof window !== 'undefined' ? localStorage.getItem('creatorzero_customer_email') : null
    const queryEmail = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('email') : null
    const emailToUse = queryEmail || savedEmail
    const url = emailToUse ? `/learning/courses/${courseId}/lessons/${activeLesson.id}?email=${encodeURIComponent(emailToUse)}` : `/learning/courses/${courseId}/lessons/${activeLesson.id}`

    api.get(url)
      .then((res) => setLessonContent(res.lesson))
      .catch((e) => toast.error(e.message))
      .finally(() => setLoadingLesson(false))
  }, [activeLesson, courseId])

  if (!playerData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center bg-[#000000] text-[#F4F2EC]">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
        <p className="text-[rgba(244,242,236,0.68)] text-sm font-medium">Verifying course access…</p>
      </div>
    )
  }

  const { course, curriculum, progress } = playerData

  const allLessons = []
  curriculum.forEach((m) => {
    (m.lessons || []).forEach((l) => allLessons.push(l))
  })

  const currentIndex = allLessons.findIndex((l) => l.id === activeLesson?.id)
  const prevLesson = currentIndex > 0 ? allLessons[currentIndex - 1] : null
  const nextLesson = currentIndex < allLessons.length - 1 ? allLessons[currentIndex + 1] : null

  async function handleMarkComplete() {
    if (!activeLesson) return
    setTracking(true)
    try {
      const res = await api.post(`/learning/courses/${courseId}/lessons/${activeLesson.id}/complete`, {
        completed: true,
      })
      toast.success('Lesson completed!')
      if (res.certificate) setCert(res.certificate)
      await loadPlayer()
      if (nextLesson && !nextLesson.isLocked) setActiveLesson(nextLesson)
    } catch (e) {
      toast.error(e.message)
    } finally {
      setTracking(false)
    }
  }

  return (
    <div className="flex flex-col h-screen bg-[#000000] text-[#F4F2EC] overflow-hidden font-sans">
      {/* Top Header */}
      <header className="h-14 shrink-0 border-b border-white/10 bg-[#000000] px-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <Link href="/account/courses" className="text-xs text-[rgba(244,242,236,0.68)] hover:text-white flex items-center font-semibold transition-colors">
            <ChevronLeft className="h-4 w-4 mr-0.5" /> My Courses
          </Link>
          <span className="text-white/20">|</span>
          <h1 className="font-extrabold text-sm truncate max-w-md text-[#F4F2EC]">{course.title}</h1>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center gap-2 text-xs">
            <Progress value={progress.percentComplete} className="w-28 h-2 bg-[#12141c] text-primary" />
            <span className="font-extrabold text-[#CBE957]">{progress.percentComplete}% Complete</span>
          </div>

          {progress.isCompleted && (
            <Badge className="bg-primary/20 text-primary border border-primary/40 font-extrabold">
              <Sparkles className="h-3 w-3 mr-1" /> Course Completed 🎉
            </Badge>
          )}

          {cert && (
            <Link href={`/certificate/${cert.certificateId}`} target="_blank">
              <Button size="sm" variant="outline" className="gap-1.5 text-xs text-[#CBE957] border-[#CBE957] bg-[#000000] hover:bg-[#12141c] font-bold">
                <Award className="h-3.5 w-3.5" /> Certificate
              </Button>
            </Link>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar Curriculum */}
        <aside className="w-80 shrink-0 border-r border-white/10 bg-[#000000] overflow-y-auto hidden md:block">
          <div className="p-4 border-b border-white/10">
            <h2 className="font-bold text-xs uppercase tracking-wider text-[rgba(244,242,236,0.68)]">Course Curriculum</h2>
          </div>
          <div className="p-3 space-y-4">
            {curriculum.map((m) => (
              <div key={m.id} className="space-y-1">
                <p className="px-2 py-1 text-xs font-extrabold text-[#CBE957] uppercase tracking-wider">{m.title}</p>
                {m.lessons.map((l) => {
                  const isActive = activeLesson?.id === l.id
                  return (
                    <button
                      key={l.id}
                      disabled={l.isLocked}
                      onClick={() => setActiveLesson(l)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left text-xs transition-all ${isActive
                          ? 'bg-primary text-[#000000] font-black shadow-sm'
                          : l.isLocked
                            ? 'opacity-40 cursor-not-allowed text-[rgba(244,242,236,0.68)]'
                            : 'hover:bg-[#12141c] text-[#F4F2EC] font-medium'
                        }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {l.completed ? (
                          <CheckCircle2 className={`h-4 w-4 shrink-0 ${isActive ? 'text-[#000000]' : 'text-emerald-400'}`} />
                        ) : l.isLocked ? (
                          <Lock className="h-3.5 w-3.5 shrink-0 text-[rgba(244,242,236,0.68)]" />
                        ) : (
                          <Play className="h-3.5 w-3.5 shrink-0" />
                        )}
                        <span className="truncate">{l.title}</span>
                      </div>
                      {l.isPreview && !isActive && (
                        <span className="text-[9px] font-bold text-primary bg-primary/10 px-1 rounded">FREE</span>
                      )}
                    </button>
                  )
                })}
              </div>
            ))}
          </div>
        </aside>

        {/* Center Lesson Content View */}
        <main className="flex-1 flex flex-col overflow-y-auto bg-[#000000] p-4 md:p-8 space-y-6">
          {activeLesson && lessonContent ? (
            <div className="max-w-4xl mx-auto w-full space-y-6">
              {/* VIDEO LESSON */}
              {lessonContent.contentType === 'VIDEO' && lessonContent.videoUrl && (
                <div className="aspect-video w-full rounded-2xl overflow-hidden bg-[#12141c] border border-white/10 shadow-2xl">
                  {lessonContent.videoUrl.includes('youtube.com') || lessonContent.videoUrl.includes('vimeo.com') ? (
                    <iframe
                      src={lessonContent.videoUrl}
                      className="w-full h-full border-0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  ) : (
                    <video src={lessonContent.videoUrl} controls className="w-full h-full" />
                  )}
                </div>
              )}

              {/* AUDIO LESSON */}
              {lessonContent.contentType === 'AUDIO' && (
                <div className="rounded-2xl border border-white/10 bg-[#12141c] p-6 shadow-sm space-y-4 text-center">
                  <Music className="h-12 w-12 text-[#60A5FA] mx-auto" />
                  <div>
                    <h3 className="font-bold text-lg text-[#F4F2EC]">{lessonContent.audioFileName || lessonContent.title}</h3>
                    <p className="text-xs text-[rgba(244,242,236,0.68)] mt-1">Audio Track / Lesson</p>
                  </div>
                  {lessonContent.resourceUrl && (
                    <div className="pt-2 max-w-md mx-auto">
                      <audio src={lessonContent.resourceUrl} controls className="w-full" />
                    </div>
                  )}
                </div>
              )}

              {/* PDF LESSON */}
              {lessonContent.contentType === 'PDF' && (
                <div className="rounded-2xl border border-white/10 bg-[#12141c] p-6 shadow-sm space-y-4 text-center">
                  <File className="h-12 w-12 text-[#F0441E] mx-auto" />
                  <div>
                    <h3 className="font-bold text-lg text-[#F4F2EC]">{lessonContent.pdfFileName || lessonContent.title}</h3>
                    <p className="text-xs text-[rgba(244,242,236,0.68)] mt-1">PDF Resource Document</p>
                  </div>
                  <div className="pt-2">
                    <a
                      href={`/api/learning/courses/${courseId}/lessons/${activeLesson.id}/pdf${(typeof window !== 'undefined' && (new URLSearchParams(window.location.search).get('email') || localStorage.getItem('creatorzero_customer_email'))) ? '?email=' + encodeURIComponent(new URLSearchParams(window.location.search).get('email') || localStorage.getItem('creatorzero_customer_email')) : ''}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <Button className="font-bold bg-primary text-[#000000] hover:bg-primary/90 gap-2 border border-black shadow-[2px_2px_0px_0px_#000]">
                        <Download className="h-4 w-4" /> Download / View PDF
                      </Button>
                    </a>
                  </div>
                </div>
              )}

              {/* DOWNLOADABLE FILE LESSON */}
              {lessonContent.contentType === 'FILE' && (
                <div className="rounded-2xl border border-white/10 bg-[#12141c] p-6 shadow-sm space-y-4">
                  <div className="flex items-center gap-3 border-b border-white/10 pb-3">
                    <Download className="h-6 w-6 text-[#34D399]" />
                    <h3 className="font-bold text-base text-[#F4F2EC]">{lessonContent.title} — Resource Files</h3>
                  </div>
                  <div className="space-y-2">
                    {(lessonContent.fileAttachments || []).map((f, i) => (
                      <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-[#12141c] border border-white/10">
                        <div className="flex items-center gap-2">
                          <Download className="h-4 w-4 text-[#34D399]" />
                          <span className="text-xs font-bold text-white">{f.name}</span>
                          <span className="text-[10px] text-[rgba(244,242,236,0.68)]">({f.size})</span>
                        </div>
                        <a href={f.url} download target="_blank" rel="noreferrer">
                          <Button size="sm" className="bg-[#34D399] text-[#000000] font-bold text-xs">
                            Download
                          </Button>
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* EXTERNAL RESOURCE LESSON */}
              {(lessonContent.contentType === 'LINK' || lessonContent.contentType === 'EXTERNAL_RESOURCE') && lessonContent.resourceUrl && (
                <div className="rounded-2xl border border-white/10 bg-[#000000] p-6 shadow-sm space-y-4 text-center">
                  <ExternalLink className="h-12 w-12 text-primary mx-auto" />
                  <div>
                    <h3 className="font-bold text-lg text-white">{lessonContent.title}</h3>
                    <p className="text-xs text-[rgba(244,242,236,0.68)] mt-1">External Resource Link</p>
                  </div>
                  <div className="pt-2">
                    <a href={lessonContent.resourceUrl} target="_blank" rel="noreferrer">
                      <Button className="font-bold bg-primary text-[#000000] hover:bg-primary/90 gap-2 border border-black">
                        <ExternalLink className="h-4 w-4" /> Open Resource Link
                      </Button>
                    </a>
                  </div>
                </div>
              )}

              {/* TEXT / Details Card */}
              <div className="rounded-2xl border border-white/10 bg-[#000000] p-6 md:p-8 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-white/10 pb-4">
                  <h2 className="text-2xl font-black text-white">{lessonContent.title}</h2>
                  <Badge variant="outline" className="text-xs font-bold border-white/10 text-[#CBE957] bg-[#12141c]">
                    {lessonContent.contentType}
                  </Badge>
                </div>

                {lessonContent.content ? (
                  <div className="prose prose-invert prose-sm max-w-none text-[rgba(244,242,236,0.68)] leading-relaxed pt-2" dangerouslySetInnerHTML={{ __html: lessonContent.content }} />
                ) : (
                  <p className="text-sm text-[rgba(244,242,236,0.68)] font-medium">{lessonContent.description}</p>
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center flex-1 py-20 text-[rgba(244,242,236,0.68)]">
              <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
              <p className="text-sm font-medium">Loading lesson content…</p>
            </div>
          )}
        </main>
      </div>

      {/* Footer Controls */}
      <footer className="h-16 shrink-0 border-t border-white/10 bg-[#000000] px-4 flex items-center justify-between">
        <Button
          variant="outline"
          size="sm"
          disabled={!prevLesson || prevLesson.isLocked}
          onClick={() => prevLesson && setActiveLesson(prevLesson)}
          className="font-bold text-xs border-white/10 text-white hover:bg-[#12141c]"
        >
          <ChevronLeft className="h-4 w-4 mr-1" /> Previous
        </Button>

        <Button
          onClick={handleMarkComplete}
          disabled={tracking || !activeLesson}
          className="gap-2 font-black bg-primary text-[#000000] hover:bg-primary/90 border border-black shadow-[2px_2px_0px_0px_#000]"
        >
          {tracking ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
          Mark Complete & Next
        </Button>

        <Button
          variant="outline"
          size="sm"
          disabled={!nextLesson || nextLesson.isLocked}
          onClick={() => nextLesson && setActiveLesson(nextLesson)}
          className="font-bold text-xs border-white/10 text-white hover:bg-[#12141c]"
        >
          Next <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </footer>
    </div>
  )
}
