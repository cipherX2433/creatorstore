'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'
import { api } from '@/lib/clientApi'
import { CourseWizardContent } from '@/components/course/CourseWizardModal'

export default function NewCoursePage() {
  const router = useRouter()

  useEffect(() => {
    api.get('/creator/subscription/status').then((subStatus) => {
      if (subStatus && !subStatus.canCreateCourses && (subStatus.isTrialExpired && !subStatus.hasPaidPlan)) {
        toast.error('Your Pro trial has ended. Upgrade your plan to create courses and continue selling.')
        window.dispatchEvent(new CustomEvent('creatorstore:open-pricing'))
        router.push('/dashboard/courses')
      }
    }).catch(() => {})
  }, [router])

  return (
    <div className="space-y-4">
      <div>
        <Link href="/dashboard/courses" className="inline-flex items-center text-xs text-[#A3A3A3] hover:text-white transition-colors mb-2">
          <ArrowLeft className="mr-1 h-3.5 w-3.5" /> Back to courses
        </Link>
      </div>

      <div className="w-full max-w-4xl mx-auto rounded-2xl border border-[#303030] bg-[#242424] overflow-hidden shadow-2xl">
        <CourseWizardContent
          onClose={() => router.push('/dashboard/courses')}
          onSuccess={(res) => {
            if (res?.courseId) {
              router.push(`/dashboard/courses/${res.courseId}`)
            } else {
              router.push('/dashboard/courses')
            }
          }}
        />
      </div>
    </div>
  )
}
