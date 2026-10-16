'use client'

import { use, useEffect, useState } from 'react'
import { api } from '@/lib/clientApi'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Award, CheckCircle2, Download, Printer } from 'lucide-react'

export default function CertificatePage({ params: paramsPromise }) {
  const params = use(paramsPromise)
  const certificateId = params.certificateId
  const [cert, setCert] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    api.get(`/certificates/${certificateId}`)
      .then(setCert)
      .catch((e) => setError(e.message))
  }, [certificateId])

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center">
        <p className="text-destructive font-semibold">Certificate not found</p>
        <p className="text-sm text-muted-foreground mt-1">{error}</p>
      </div>
    )
  }

  if (!cert) {
    return <div className="max-w-3xl mx-auto p-12 space-y-6"><Skeleton className="h-96 w-full rounded-3xl" /></div>
  }

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 flex flex-col items-center justify-center">
      {/* Certificate Frame */}
      <div className="max-w-3xl w-full bg-white rounded-3xl border-8 border-indigo-100 p-8 md:p-12 shadow-xl text-center space-y-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          <Award className="h-64 w-64 text-indigo-600" />
        </div>

        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
          <Award className="h-8 w-8" />
        </div>

        <div className="space-y-1">
          <p className="text-xs uppercase tracking-widest text-indigo-600 font-bold">Certificate of Completion</p>
          <p className="text-xs text-muted-foreground">ID: {cert.certificateId}</p>
        </div>

        <div className="space-y-2 py-4">
          <p className="text-sm text-muted-foreground">This is to certify that</p>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-foreground">{cert.studentName}</h1>
          <p className="text-sm text-muted-foreground">has successfully completed the online course</p>
          <h2 className="text-xl md:text-2xl font-bold text-indigo-950 pt-1">{cert.courseTitle}</h2>
        </div>

        <div className="pt-6 border-t border-slate-100 flex items-center justify-between text-xs text-muted-foreground">
          <div>
            <p className="font-semibold text-foreground">{cert.creatorName}</p>
            <p>Course Instructor</p>
          </div>
          <div className="text-right">
            <p className="font-semibold text-foreground">{new Date(cert.completedAt).toLocaleDateString()}</p>
            <p>Date Issued</p>
          </div>
        </div>
      </div>

      <div className="mt-6 flex items-center gap-3">
        <Button onClick={() => window.print()} className="gap-2">
          <Printer className="h-4 w-4" /> Print / Save PDF
        </Button>
      </div>
    </div>
  )
}
