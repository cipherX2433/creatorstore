'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { api } from '@/lib/clientApi'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { GraduationCap, Play, Award } from 'lucide-react'

export default function StudentCoursesPage() {
  const [courses, setCourses] = useState(null)

  useEffect(() => {
    api.get('/learning/my-courses')
      .then((r) => setCourses(r.courses || []))
      .catch(() => setCourses([]))
  }, [])

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">My Purchased Courses</h1>
        <p className="text-sm text-muted-foreground">Access all the courses you have purchased and track your progress.</p>
      </div>

      {courses === null ? (
        <div className="grid gap-4 sm:grid-cols-2">{Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-48 w-full rounded-2xl" />)}</div>
      ) : courses.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border py-20 text-center">
          <GraduationCap className="h-10 w-10 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">You haven’t enrolled in any courses yet.</p>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2">
          {courses.map((c) => (
            <div key={c.id} className="flex flex-col justify-between rounded-2xl border border-border bg-card p-5 shadow-sm space-y-4">
              <div className="space-y-3">
                <div className="aspect-video w-full overflow-hidden rounded-xl bg-muted">
                  {c.thumbnail ? (
                    <img src={c.thumbnail} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-indigo-50 text-indigo-600">
                      <GraduationCap className="h-8 w-8" />
                    </div>
                  )}
                </div>
                <div>
                  <h2 className="font-semibold text-base">{c.title}</h2>
                  <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{c.description || 'Interactive course'}</p>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between border-t border-border">
                <span className="text-xs text-muted-foreground">{c.completedLessons} lessons completed</span>
                <Link href={`/learn/${c.id}`}>
                  <Button size="sm" className="gap-1.5">
                    <Play className="h-3.5 w-3.5" /> Continue Learning
                  </Button>
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
