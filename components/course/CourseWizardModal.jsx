'use client'

import { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { api, formatMoney } from '@/lib/clientApi'
import { Button } from '@/components/ui/button'
import {
  X, Check, ChevronRight, ArrowLeft, Loader2, AlertCircle
} from 'lucide-react'
import { toast } from 'sonner'

import CourseDetailsStep from './CourseDetailsStep'
import CourseCurriculumStep from './CourseCurriculumStep'
import CoursePricingStep from './CoursePricingStep'
import CourseInstructorStep from './CourseInstructorStep'
import CourseOutcomesStep from './CourseOutcomesStep'
import CourseSettingsStep from './CourseSettingsStep'
import CourseReviewStep from './CourseReviewStep'
import { validateCourseStep, validateAllCourseSteps } from '@/lib/wizardValidators'

export const COURSE_STEPS = [
  { num: 1, label: 'Details' },
  { num: 2, label: 'Curriculum' },
  { num: 3, label: 'Pricing' },
  { num: 4, label: 'Instructor' },
  { num: 5, label: 'Outcomes' },
  { num: 6, label: 'Settings' },
  { num: 7, label: 'Review' },
]

export const INITIAL_COURSE_STATE = {
  title: 'Complete Full-Stack Web Development Bootcamp',
  shortDescription: 'Master React, Next.js, Node, and database architecture from scratch.',
  description: 'Comprehensive step-by-step masterclass with real-world production projects.',
  thumbnail: '',
  category: 'Development & Tech',
  difficulty: 'Beginner',
  duration: '10 hours',
  language: 'English',
  modules: [
    {
      id: 'mod_1',
      title: 'Module 1: Introduction & Environment Setup',
      lessons: [
        { id: 'les_1', title: '1. Welcome to the Course', type: 'VIDEO', duration: '5 min', isFreePreview: true },
        { id: 'les_2', title: '2. Setting Up Your Development Environment', type: 'TEXT', duration: '10 min', isFreePreview: false },
      ],
    },
    {
      id: 'mod_2',
      title: 'Module 2: Core Concepts & Architecture',
      lessons: [
        { id: 'les_3', title: '1. Component Driven Design', type: 'VIDEO', duration: '15 min', isFreePreview: false },
        { id: 'les_4', title: '2. State Management Best Practices', type: 'VIDEO', duration: '20 min', isFreePreview: false },
      ],
    },
  ],
  isFree: false,
  price: 999,
  basePrice: 999,
  currency: 'inr',
  offerDiscount: false,
  discountType: 'PERCENTAGE',
  discountValue: 15,
  accessMode: 'LIFETIME',
  accessExpirationDays: 365,
  instructor: 'Mohit Sharma',
  targetAudience: 'Aspiring software engineers, designers, and creators looking to level up.',
  requirements: ['Basic computer literacy', 'A computer with internet access'],
  learningOutcomes: [
    'Build production-ready applications from scratch',
    'Master advanced architecture and full-stack patterns',
    'Deploy and monetize modern web applications',
  ],
  sequentialLearning: true,
  allowDiscussions: true,
  enableCertificate: true,
  certificateTitle: 'Certificate of Full-Stack Completion',
  certificateIssuer: 'CreatorStore Academy',
  certificateMinProgress: 100,
}

export function CourseWizardContent({
  editCourseId = null,
  onClose,
  onSuccess,
  hideHeader = false,
}) {
  const [step, setStep] = useState(1)
  const [completedSteps, setCompletedSteps] = useState(() => new Set())
  const [formState, setFormState] = useState(INITIAL_COURSE_STATE)
  const [errors, setErrors] = useState({})
  const [isDirty, setIsDirty] = useState(false)
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [loadingCourse, setLoadingCourse] = useState(false)

  useEffect(() => {
    if (editCourseId) {
      setLoadingCourse(true)
      api.get(`/courses/${editCourseId}`)
        .then((res) => {
          const c = res?.course || {}
          const p = res?.product || {}
          const mods = res?.modules || []
          const less = res?.lessons || []

          // Combine modules with their lessons
          const fullModules = mods.map((m) => ({
            id: m.id,
            title: m.title || '',
            lessons: less.filter((l) => l.moduleId === m.id).map((l) => ({
              id: l.id,
              title: l.title || '',
              type: l.type || 'VIDEO',
              isFreePreview: !!l.isFreePreview,
              duration: l.duration || '',
            })),
          }))

          const loadedState = {
            ...INITIAL_COURSE_STATE,
            title: c.title || INITIAL_COURSE_STATE.title,
            shortDescription: c.shortDescription || INITIAL_COURSE_STATE.shortDescription,
            description: c.description || INITIAL_COURSE_STATE.description,
            thumbnail: c.thumbnail || c.coverImage || '',
            instructor: c.instructor || INITIAL_COURSE_STATE.instructor,
            difficulty: c.difficulty || 'Beginner',
            duration: c.duration || '',
            price: p.price !== undefined ? p.price : 999,
            basePrice: p.price !== undefined ? p.price : 999,
            currency: p.currency || 'inr',
            isFree: Number(p.price) === 0,
            modules: fullModules.length > 0 ? fullModules : INITIAL_COURSE_STATE.modules,
          }
          setFormState(loadedState)
          const validSteps = new Set()
          for (let k = 1; k <= 7; k++) {
            if (validateCourseStep(k, loadedState).valid) {
              validSteps.add(k)
            }
          }
          setCompletedSteps(validSteps)
          setLoadingCourse(false)
        })
        .catch(() => {
          setLoadingCourse(false)
        })
    } else {
      setFormState(INITIAL_COURSE_STATE)
      setCompletedSteps(new Set())
    }
  }, [editCourseId])

  const updateFormState = useCallback((patch) => {
    setFormState((prev) => ({ ...prev, ...patch }))
    setErrors((prev) => {
      const next = { ...prev }
      Object.keys(patch).forEach((k) => {
        delete next[k]
      })
      return next
    })
    setIsDirty(true)
  }, [])

  function handleCloseRequest() {
    if (isDirty) {
      setShowDiscardConfirm(true)
    } else {
      onClose?.()
    }
  }

  function validateCurrentStep() {
    const res = validateCourseStep(step, formState)
    setErrors(res.errors)
    if (!res.valid) {
      const firstErr = Object.values(res.errors)[0]
      if (firstErr) toast.error(firstErr)
      return false
    }
    return true
  }

  function handleStepClick(targetStep) {
    if (targetStep === step) return

    // Backward navigation is always permitted
    if (targetStep < step) {
      setErrors({})
      setStep(targetStep)
      return
    }

    // Forward navigation: validate all steps between 1 and targetStep - 1
    for (let s = 1; s < targetStep; s++) {
      const res = validateCourseStep(s, formState)
      if (!res.valid) {
        setStep(s)
        setErrors(res.errors)
        const firstErr = Object.values(res.errors)[0]
        toast.error(`Please complete Step ${s} (${COURSE_STEPS[s - 1].label}) first: ${firstErr}`)
        return
      }
    }

    setErrors({})
    setCompletedSteps((prev) => {
      const next = new Set(prev)
      for (let k = 1; k < targetStep; k++) {
        next.add(k)
      }
      return next
    })
    setStep(targetStep)
  }

  function handleContinue() {
    const res = validateCourseStep(step, formState)
    if (!res.valid) {
      setErrors(res.errors)
      const firstErr = Object.values(res.errors)[0]
      if (firstErr) toast.error(firstErr)
      return
    }
    setErrors({})
    setCompletedSteps((prev) => new Set([...prev, step]))
    setStep((s) => Math.min(7, s + 1))
  }

  function handleBack() {
    setErrors({})
    setStep((s) => Math.max(1, s - 1))
  }

  async function handlePublishOrSave(publish = false) {
    if (publish) {
      const fullCheck = validateAllCourseSteps(formState)
      if (!fullCheck.valid) {
        setStep(fullCheck.firstInvalidStep)
        setErrors(fullCheck.errors)
        const firstErr = Object.values(fullCheck.errors)[0]
        toast.error(`Cannot publish: Fix Step ${fullCheck.firstInvalidStep} (${COURSE_STEPS[fullCheck.firstInvalidStep - 1].label}) – ${firstErr}`)
        return
      }
    }

    setSubmitting(true)
    try {
      let targetCourseId = editCourseId
      let targetProductId = null

      const numericBase = formState.isFree ? 0 : Math.max(0, parseFloat(formState.basePrice !== undefined ? formState.basePrice : formState.price) || 0)
      let finalCalculatedPrice = numericBase

      if (!formState.isFree && formState.offerDiscount) {
        const val = Math.max(0, parseFloat(formState.discountValue || 0))
        if (formState.discountType === 'PERCENTAGE') {
          const clampedPct = Math.min(100, val)
          finalCalculatedPrice = Math.max(0, Math.round(numericBase * (1 - clampedPct / 100)))
        } else {
          finalCalculatedPrice = Math.max(0, numericBase - Math.min(numericBase, val))
        }
      }

      // 1. Create or update Course
      if (!targetCourseId) {
        const courseRes = await api.post('/courses', {
          title: formState.title?.trim() || 'Untitled Course',
          shortDescription: formState.shortDescription?.trim(),
          description: formState.description?.trim(),
          thumbnail: formState.thumbnail,
          price: finalCalculatedPrice,
          currency: formState.currency || 'inr',
          instructor: formState.instructor?.trim(),
          difficulty: formState.difficulty || 'Beginner',
          duration: formState.duration || '',
        })
        targetCourseId = courseRes.course?.id || courseRes.id
        targetProductId = courseRes.product?.id || courseRes.course?.productId
      } else {
        await api.patch(`/courses/${targetCourseId}`, {
          title: formState.title?.trim(),
          shortDescription: formState.shortDescription?.trim(),
          description: formState.description?.trim(),
          thumbnail: formState.thumbnail,
          price: finalCalculatedPrice,
          currency: formState.currency || 'inr',
          instructor: formState.instructor?.trim(),
          difficulty: formState.difficulty,
          duration: formState.duration,
        })
      }

      // 2. Sync Modules & Lessons if newly created
      if (Array.isArray(formState.modules) && formState.modules.length > 0 && targetCourseId) {
        for (const mod of formState.modules) {
          if (!mod.id || mod.id.startsWith('mod_')) {
            const newModRes = await api.post(`/courses/${targetCourseId}/modules`, {
              title: mod.title?.trim() || 'New Module',
            }).catch(() => null)

            const newModId = newModRes?.module?.id
            if (newModId && Array.isArray(mod.lessons)) {
              for (const les of mod.lessons) {
                await api.post(`/modules/${newModId}/lessons`, {
                  title: les.title?.trim() || 'Lesson',
                  type: les.type || 'VIDEO',
                }).catch(() => null)
              }
            }
          }
        }
      }

      if (publish && targetCourseId) {
        await api.post(`/courses/${targetCourseId}/publish`).catch(() => {})
        toast.success('Course published successfully.')
      } else {
        toast.success('Course draft saved successfully.')
      }

      setCompletedSteps(new Set([1, 2, 3, 4, 5, 6, 7]))
      setIsDirty(false)
      onSuccess?.({
        id: targetProductId || targetCourseId,
        courseId: targetCourseId,
        title: formState.title,
        price: finalCalculatedPrice,
        currency: formState.currency,
        type: 'COURSE',
        status: publish ? 'PUBLISHED' : 'DRAFT',
      })
      onClose?.()
    } catch (err) {
      if (err.code === 'PLAN_UPGRADE_REQUIRED' || err.status === 403 || err.message?.includes('trial has ended')) {
        toast.error('Your Pro trial has ended. Upgrade your plan to create courses and continue selling.')
        window.dispatchEvent(new CustomEvent('creatorstore:open-pricing'))
        onClose?.()
        return
      }
      toast.error(err.message || 'Failed to save course')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex flex-col h-full w-full bg-[#FFFFFF] text-[#010619] overflow-hidden">
      {/* 1. FIXED HEADER */}
      {!hideHeader && (
        <div className="px-6 py-5 border-b border-[#D8DFFA] flex items-center justify-between shrink-0 bg-[#FFFFFF]">
          <div>
            <h2 className="text-xl font-bold text-[#010619] tracking-tight">
              {editCourseId ? 'Edit Course' : 'Create an Online Course'}
            </h2>
            <p className="text-xs text-[#666666] mt-0.5 font-medium">
              Set up curriculum, modules, pricing, and student learning rules.
            </p>
          </div>

          <button
            type="button"
            onClick={handleCloseRequest}
            className="p-2 rounded-full text-[#666666] hover:text-[#010619] hover:bg-[#E8EDFB] transition-colors cursor-pointer"
            title="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      )}

      {/* 2. HORIZONTAL STEP INDICATOR */}
      <div className="px-6 py-3 border-b border-[#D8DFFA] bg-[#F2F5FE] flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0">
        {COURSE_STEPS.map((s) => {
          const isActive = step === s.num
          const wasCompleted = completedSteps.has(s.num)
          const isValid = validateCourseStep(s.num, formState).valid
          // Step is complete ONLY if it was previously completed, is currently valid, and is NOT the current active step
          const isComplete = !isActive && wasCompleted && isValid
          
          let isLocked = false
          for (let k = 1; k < s.num; k++) {
            if (!validateCourseStep(k, formState).valid) {
              isLocked = true
              break
            }
          }

          return (
            <button
              key={s.num}
              type="button"
              onClick={() => handleStepClick(s.num)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold transition-all shrink-0 cursor-pointer ${
                isActive
                  ? 'bg-[#194DF5] text-[#FFFFFF] shadow-sm'
                  : isComplete
                  ? 'bg-[#EAF8EF] text-[#22C55E] border border-[#BBF7D0] hover:bg-[#DCFCE7]'
                  : isLocked
                  ? 'bg-[#F5F5F3] text-[#A5A5A5] border border-[#D8DFFA] opacity-60 cursor-not-allowed'
                  : 'bg-[#F5F5F3] text-[#666666] border border-[#D8DFFA] hover:bg-[#EAEAE8] hover:text-[#010619]'
              }`}
            >
              <span
                className={`h-4.5 w-4.5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                  isActive
                    ? 'bg-white text-[#194DF5]'
                    : isComplete
                    ? 'bg-[#22C55E] text-white'
                    : 'bg-[#D8DFFA] text-[#666666]'
                }`}
              >
                {isComplete ? <Check className="h-3 w-3 stroke-[3]" /> : s.num}
              </span>
              <span>{s.label}</span>
            </button>
          )
        })}
      </div>

      {/* 3. SCROLLABLE FORM CONTENT */}
      <div className="p-6 sm:p-8 overflow-y-auto flex-1 bg-[#FFFFFF] no-scrollbar max-h-[58vh]">
        {loadingCourse ? (
          <div className="flex min-h-[300px] items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-[#194DF5]" />
          </div>
        ) : (
          <>
            {step === 1 && (
              <CourseDetailsStep
                formState={formState}
                onChange={updateFormState}
                errors={errors}
              />
            )}
            {step === 2 && (
              <CourseCurriculumStep
                formState={formState}
                onChange={updateFormState}
                errors={errors}
              />
            )}
            {step === 3 && (
              <CoursePricingStep
                formState={formState}
                onChange={updateFormState}
                errors={errors}
              />
            )}
            {step === 4 && (
              <CourseInstructorStep
                formState={formState}
                onChange={updateFormState}
                errors={errors}
              />
            )}
            {step === 5 && (
              <CourseOutcomesStep
                formState={formState}
                onChange={updateFormState}
                errors={errors}
              />
            )}
            {step === 6 && (
              <CourseSettingsStep
                formState={formState}
                onChange={updateFormState}
                errors={errors}
              />
            )}
            {step === 7 && (
              <CourseReviewStep
                formState={formState}
                onGoToStep={setStep}
              />
            )}
          </>
        )}
      </div>

      {/* 4. FIXED FOOTER CONTROLS */}
      <div className="px-6 py-4 border-t border-[#D8DFFA] bg-[#FFFFFF] flex items-center justify-between shrink-0">
        <div>
          {step === 1 ? (
            <Button
              type="button"
              variant="outline"
              onClick={handleCloseRequest}
              className="rounded-full border border-[#D8DFFA] bg-[#F5F5F3] text-[#333333] hover:text-[#010619] hover:bg-[#EAEAE8] text-xs font-semibold px-5 h-9 cursor-pointer"
            >
              Cancel
            </Button>
          ) : (
            <Button
              type="button"
              variant="outline"
              onClick={handleBack}
              className="rounded-full border border-[#D8DFFA] bg-[#F5F5F3] text-[#333333] hover:text-[#010619] hover:bg-[#EAEAE8] text-xs font-semibold px-5 h-9 gap-1.5 cursor-pointer"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Back
            </Button>
          )}
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            type="button"
            variant="outline"
            onClick={() => handlePublishOrSave(false)}
            disabled={submitting}
            className="rounded-full border border-[#D8DFFA] bg-[#FFFFFF] text-[#333333] hover:text-[#010619] hover:bg-[#E8EDFB] text-xs font-semibold px-5 h-9 cursor-pointer"
          >
            {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Save Draft'}
          </Button>

          {step === 7 ? (
            <Button
              type="button"
              onClick={() => handlePublishOrSave(true)}
              disabled={submitting}
              className="rounded-full bg-[#194DF5] hover:bg-[#1441D9] text-white text-xs font-bold px-6 h-9 shadow-sm cursor-pointer"
            >
              {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Publish Course'}
            </Button>
          ) : (
            <Button
              type="button"
              onClick={handleContinue}
              className="rounded-full bg-[#194DF5] hover:bg-[#1441D9] text-white text-xs font-bold px-6 h-9 gap-1 shadow-sm cursor-pointer"
            >
              Continue <ChevronRight className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Discard Changes Confirmation Modal */}
      {showDiscardConfirm && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="fixed inset-0 z-[10000] bg-black/45 flex items-center justify-center p-4"
        >
          <div className="bg-[#FFFFFF] border border-[#D8DFFA] rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-2xl">
            <div className="space-y-1">
              <h3 className="text-base font-bold text-[#010619]">Discard changes?</h3>
              <p className="text-xs text-[#666666]">
                You have unsaved changes in this course setup. Are you sure you want to discard them?
              </p>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-[#D8DFFA]">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowDiscardConfirm(false)}
                className="rounded-full border border-[#D8DFFA] bg-[#F5F5F3] text-[#333333] hover:text-[#010619] hover:bg-[#EAEAE8] text-xs font-semibold px-4 cursor-pointer"
              >
                Keep Editing
              </Button>
              <Button
                type="button"
                onClick={() => {
                  setShowDiscardConfirm(false)
                  onClose?.()
                }}
                className="rounded-full bg-[#EF4444] hover:bg-[#DC2626] text-white text-xs font-bold px-4 cursor-pointer"
              >
                Discard
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function CourseWizardModal({
  open,
  onClose,
  onSuccess,
  editCourseId = null,
}) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!open || !mounted) return null

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6">
      <div
        className="fixed inset-0 bg-black/45 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-[#FFFFFF] border border-[#D8DFFA] rounded-[20px] shadow-2xl overflow-hidden z-10 flex flex-col">
        <CourseWizardContent
          editCourseId={editCourseId}
          onClose={onClose}
          onSuccess={onSuccess}
        />
      </div>
    </div>,
    document.body
  )
}
