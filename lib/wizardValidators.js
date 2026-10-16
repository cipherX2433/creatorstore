/**
 * Centralized Validation Logic for Multi-Step Setup Wizards
 * Supports:
 * - Coaching & Bookings (7 steps)
 * - Courses (7 steps)
 */

/**
 * -----------------------------------------------------------------------------
 * COACHING & BOOKINGS VALIDATION
 * -----------------------------------------------------------------------------
 */

/**
 * Validates a single Coaching & Bookings step.
 * Returns { valid: boolean, errors: Record<string, string> }
 */
export function validateCoachingStep(step, formState = {}) {
  const errors = {}

  switch (Number(step)) {
    case 1: {
      // Step 1: Booking Details
      // Required: Name, Description, Duration
      const name = formState.name || formState.title || ''
      if (!name || !name.trim()) {
        errors.name = 'Booking name is required'
      } else if (name.trim().length < 2) {
        errors.name = 'Booking name must be at least 2 characters'
      }

      const desc = formState.description || formState.shortDescription || ''
      if (!desc || !desc.trim()) {
        errors.description = 'Description is required'
      }

      if (formState.isCustomDuration) {
        const customVal = parseInt(formState.customDuration, 10)
        if (!customVal || isNaN(customVal) || customVal <= 0) {
          errors.duration = 'Duration must be a positive number greater than 0 minutes'
        }
      } else {
        const dur = parseInt(formState.durationMinutes || formState.durationPreset || formState.duration, 10)
        if (!dur || isNaN(dur) || dur <= 0) {
          errors.duration = 'Please select a valid session duration'
        }
      }
      break
    }

    case 2: {
      // Step 2: Calendar & Location
      // Required: Meeting type selection and specific location fields if applicable
      const meetingType = formState.meetingType || formState.meetingLocation || 'GOOGLE_MEET'
      
      if (meetingType === 'ZOOM') {
        if (!formState.meetingUrl || !formState.meetingUrl.trim()) {
          errors.meetingUrl = 'Zoom meeting URL is required'
        }
      } else if (meetingType === 'MS_TEAMS') {
        if (!formState.meetingUrl || !formState.meetingUrl.trim()) {
          errors.meetingUrl = 'Microsoft Teams meeting link is required'
        }
      } else if (meetingType === 'PHONE') {
        const phone = formState.locationText || formState.locationInstructions || formState.phoneNumber || ''
        if (!phone || !phone.trim()) {
          errors.locationText = 'Phone call instructions or number are required'
        }
      } else if (meetingType === 'CUSTOM') {
        const hasUrl = formState.meetingUrl && formState.meetingUrl.trim()
        const hasLoc = (formState.locationText && formState.locationText.trim()) || (formState.locationInstructions && formState.locationInstructions.trim())
        if (!hasUrl && !hasLoc) {
          errors.locationText = 'Please provide meeting location details or address'
        }
      }
      break
    }

    case 3: {
      // Step 3: Weekly Availability
      // Required: At least one active day with valid, non-overlapping windows
      const availability = formState.availability || []
      const activeDays = availability.filter((a) => a.enabled)

      if (activeDays.length === 0) {
        errors.availability = 'Please enable at least one day with available time windows'
      } else {
        for (const day of activeDays) {
          if (!day.windows || !Array.isArray(day.windows) || day.windows.length === 0) {
            errors.availability = 'Each enabled day must have at least one availability window'
            break
          }
          for (let i = 0; i < day.windows.length; i++) {
            const w = day.windows[i]
            if (!w.startTime || !w.endTime || !w.startTime.trim() || !w.endTime.trim()) {
              errors.availability = 'All time windows must have valid start and end times'
              break
            }
            if (w.startTime >= w.endTime) {
              errors.availability = 'Start time must be strictly before end time in all windows'
              break
            }
            // Check overlapping windows
            for (let j = i + 1; j < day.windows.length; j++) {
              const w2 = day.windows[j]
              if (w.startTime < w2.endTime && w.endTime > w2.startTime) {
                errors.availability = 'Overlapping time windows detected on the same day'
                break
              }
            }
            if (errors.availability) break
          }
          if (errors.availability) break
        }
      }
      break
    }

    case 4: {
      // Step 4: Booking Rules
      // Validate buffer and notice times
      if (formState.bufferBeforeMinutes !== undefined && formState.bufferBeforeMinutes < 0) {
        errors.bufferBefore = 'Buffer before cannot be negative'
      }
      if (formState.bufferAfterMinutes !== undefined && formState.bufferAfterMinutes < 0) {
        errors.bufferAfter = 'Buffer after cannot be negative'
      }
      if (formState.maximumAdvanceDays !== undefined && formState.maximumAdvanceDays <= 0) {
        errors.advanceDays = 'Booking window must be at least 1 day'
      }
      break
    }

    case 5: {
      // Step 5: Pricing
      // Required: Price >= 0 if paid, valid discount if enabled
      const isFree = Boolean(formState.isFree) || Number(formState.price) === 0 && Number(formState.basePrice) === 0
      if (!isFree) {
        const rawPrice = formState.basePrice !== undefined ? formState.basePrice : formState.price
        const p = parseFloat(rawPrice)
        if (rawPrice === '' || rawPrice === null || isNaN(p) || p <= 0) {
          errors.price = 'Please enter a valid price greater than 0'
        }

        if (formState.offerDiscount) {
          const dVal = parseFloat(formState.discountValue || 0)
          if (isNaN(dVal) || dVal <= 0) {
            errors.discountValue = 'Please enter a valid discount amount greater than 0'
          } else if (formState.discountType === 'PERCENTAGE' && (dVal <= 0 || dVal > 100)) {
            errors.discountValue = 'Discount percentage must be between 1% and 100%'
          } else if (formState.discountType === 'FIXED' && p && dVal >= p) {
            errors.discountValue = 'Fixed discount cannot exceed the base price'
          }
        }
      }
      break
    }

    case 6: {
      // Step 6: Customer Information
      // Questions: if questions exist, question text must not be empty
      if (Array.isArray(formState.questions)) {
        for (let i = 0; i < formState.questions.length; i++) {
          const q = formState.questions[i]
          if (!q.question || !q.question.trim()) {
            errors[`question_${i}`] = 'Question prompt cannot be empty'
            errors.questions = 'All intake questions must have a question prompt'
            break
          }
        }
      }
      break
    }

    case 7: {
      // Step 7: Review & Publish
      // Review step is valid if steps 1-6 are valid
      break
    }

    default:
      break
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  }
}

/**
 * Validates all 7 steps for Coaching & Bookings.
 * Returns { valid: boolean, firstInvalidStep: number | null, errors: Record<string, string> }
 */
export function validateAllCoachingSteps(formState = {}) {
  for (let s = 1; s <= 6; s++) {
    const res = validateCoachingStep(s, formState)
    if (!res.valid) {
      return {
        valid: false,
        firstInvalidStep: s,
        errors: res.errors,
      }
    }
  }
  return {
    valid: true,
    firstInvalidStep: null,
    errors: {},
  }
}

/**
 * -----------------------------------------------------------------------------
 * COURSES VALIDATION
 * -----------------------------------------------------------------------------
 */

/**
 * Validates a single Course step.
 * Returns { valid: boolean, errors: Record<string, string> }
 */
export function validateCourseStep(step, formState = {}) {
  const errors = {}

  switch (Number(step)) {
    case 1: {
      // Step 1: Course Details & Basic Info
      // Required: Title, Description, Category, Difficulty, Language
      if (!formState.title || !formState.title.trim()) {
        errors.title = 'Course title is required'
      } else if (formState.title.trim().length < 2) {
        errors.title = 'Course title must be at least 2 characters'
      }

      const desc = (formState.description && formState.description.trim()) || (formState.shortDescription && formState.shortDescription.trim()) || ''
      if (!desc) {
        errors.description = 'Course description is required'
      }

      if (!formState.category || !formState.category.trim()) {
        errors.category = 'Please select a course category'
      }

      const diff = formState.difficulty || formState.level || ''
      if (!diff || !diff.trim()) {
        errors.difficulty = 'Please select difficulty level'
      }
      break
    }

    case 2: {
      // Step 2: Curriculum & Structure
      // Required: At least 1 module with a title, and each module must have valid lessons
      const modules = formState.modules || []
      if (!Array.isArray(modules) || modules.length === 0) {
        errors.curriculum = 'Please add at least one module to your course'
      } else {
        let hasAtLeastOneLesson = false
        for (let i = 0; i < modules.length; i++) {
          const mod = modules[i]
          if (!mod.title || !mod.title.trim()) {
            errors.curriculum = `Module ${i + 1} must have a title`
            errors[`module_${i}_title`] = 'Module title is required'
            break
          }
          if (Array.isArray(mod.lessons) && mod.lessons.length > 0) {
            hasAtLeastOneLesson = true
            for (let j = 0; j < mod.lessons.length; j++) {
              const les = mod.lessons[j]
              if (!les.title || !les.title.trim()) {
                errors.curriculum = `Lesson ${j + 1} in Module "${mod.title}" must have a title`
                errors[`lesson_${i}_${j}_title`] = 'Lesson title is required'
                break
              }
            }
            if (errors.curriculum) break
          }
        }
        if (!errors.curriculum && !hasAtLeastOneLesson) {
          errors.curriculum = 'Please add at least one lesson to your curriculum before proceeding'
        }
      }
      break
    }

    case 3: {
      // Step 3: Pricing & Access
      // Required: Price >= 0, valid discount if enabled, valid access expiration if fixed period
      const isFree = Boolean(formState.isFree) || formState.pricingType === 'FREE' || formState.pricingType === 'free' || Number(formState.price) === 0
      if (!isFree) {
        const rawPrice = formState.price
        const p = parseFloat(rawPrice)
        if (rawPrice === '' || rawPrice === null || isNaN(p) || p <= 0) {
          errors.price = 'Please enter a valid course price greater than 0'
        }

        if (formState.offerDiscount) {
          const dVal = parseFloat(formState.discountValue || 0)
          if (isNaN(dVal) || dVal <= 0) {
            errors.discountValue = 'Please enter a valid discount amount greater than 0'
          } else if (formState.discountType === 'PERCENTAGE' && (dVal <= 0 || dVal > 100)) {
            errors.discountValue = 'Discount percentage must be between 1% and 100%'
          } else if (formState.discountType === 'FIXED' && p && dVal >= p) {
            errors.discountValue = 'Fixed discount cannot exceed the base price'
          }
        }
      }

      if (formState.accessMode === 'FIXED_PERIOD') {
        const days = parseInt(formState.accessExpirationDays, 10)
        if (!days || isNaN(days) || days <= 0) {
          errors.accessExpirationDays = 'Access expiration must be greater than 0 days'
        }
      }
      break
    }

    case 4: {
      // Step 4: Instructor & Target Audience
      // Required: Instructor Name
      const inst = formState.instructor || formState.instructorName || ''
      if (!inst || !inst.trim()) {
        errors.instructor = 'Instructor name is required'
      }
      break
    }

    case 5: {
      // Step 5: Learning Outcomes & Requirements
      // Required: At least one learning outcome with non-empty text
      const outcomes = formState.learningOutcomes || []
      const validOutcomes = Array.isArray(outcomes) ? outcomes.filter((o) => typeof o === 'string' && o.trim().length > 0) : []
      if (validOutcomes.length === 0) {
        errors.learningOutcomes = 'Please add at least one learning outcome / takeaway for students'
      }
      break
    }

    case 6: {
      // Step 6: Course Settings & Rules
      // Certificate settings if enabled
      if (formState.enableCertificate) {
        if (!formState.certificateTitle || !formState.certificateTitle.trim()) {
          errors.certificateTitle = 'Certificate title is required when certificates are enabled'
        }
        const minProg = parseInt(formState.certificateMinProgress, 10)
        if (isNaN(minProg) || minProg < 1 || minProg > 100) {
          errors.certificateMinProgress = 'Minimum progress for certificate must be between 1% and 100%'
        }
        if (!formState.certificateIssuer || !formState.certificateIssuer.trim()) {
          errors.certificateIssuer = 'Certificate issuer name is required'
        }
      }
      break
    }

    case 7: {
      // Step 7: Review & Publish
      // Review step is valid if steps 1-6 are valid
      break
    }

    default:
      break
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  }
}

/**
 * Validates all 7 steps for Courses.
 * Returns { valid: boolean, firstInvalidStep: number | null, errors: Record<string, string> }
 */
export function validateAllCourseSteps(formState = {}) {
  for (let s = 1; s <= 6; s++) {
    const res = validateCourseStep(s, formState)
    if (!res.valid) {
      return {
        valid: false,
        firstInvalidStep: s,
        errors: res.errors,
      }
    }
  }
  return {
    valid: true,
    firstInvalidStep: null,
    errors: {},
  }
}
