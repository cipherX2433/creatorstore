'use client'

import React from 'react'
import LinktreeBookingWizardModal, {
  INITIAL_WIZARD_STATE,
  DAYS_OF_WEEK,
  TIMEZONE_LIST,
  formatTime12,
  formatTimezoneLabel,
} from './LinktreeBookingWizardModal'

export const STEPS = [
  { num: 1, label: 'Information' },
  { num: 2, label: 'Availability' },
  { num: 3, label: 'Details' },
  { num: 4, label: 'Customer' },
]

export const INITIAL_FORM_STATE = INITIAL_WIZARD_STATE

export function CoachingBookingWizardContent({
  editProductId = null,
  onClose,
  onSuccess,
  creatorProfile = null,
  currentPlan = 'FREE',
}) {
  return (
    <LinktreeBookingWizardModal
      open={true}
      editProductId={editProductId}
      onClose={onClose}
      onSuccess={onSuccess}
      creatorProfile={creatorProfile}
      currentPlan={currentPlan}
    />
  )
}

export default function CoachingBookingWizardModal({
  open,
  onClose,
  onSuccess,
  editProductId = null,
  creatorProfile = null,
  currentPlan = 'FREE',
}) {
  if (!open) return null

  return (
    <LinktreeBookingWizardModal
      open={open}
      onClose={onClose}
      onSuccess={onSuccess}
      editProductId={editProductId}
      creatorProfile={creatorProfile}
      currentPlan={currentPlan}
    />
  )
}
