'use client'

import { useState } from 'react'
import { TextInput } from '@/components/ui/text-input'
import { ModalFooterActions } from '@/components/ui/base-modal'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import {
  Mail, Star, Send, HelpCircle, Check, Info, ShieldCheck,
} from 'lucide-react'

export const FORM_TYPES = [
  {
    id: 'contact',
    label: 'Contact Form',
    title: 'Contact Form',
    defaultTitle: 'Get in Touch',
    defaultSubtitle: 'Have a question, collaboration idea, or inquiry? Send me a direct message.',
    defaultButtonText: 'Send Message',
    defaultSuccessMessage: 'Thank you! Your message has been sent successfully.',
    icon: Mail,
    iconColor: 'text-[#0D9488]',
    iconBg: 'bg-[#0D9488]/10 border-[#0D9488]/20',
    description: 'Let visitors send you direct, private messages',
  },
  {
    id: 'feedback',
    label: 'Feedback Form',
    title: 'Feedback Form',
    defaultTitle: 'Share Your Feedback',
    defaultSubtitle: 'Help me improve by rating your experience and sharing quick feedback.',
    defaultButtonText: 'Submit Feedback',
    defaultSuccessMessage: 'Thank you for your valuable feedback!',
    icon: Star,
    iconColor: 'text-[#D97706]',
    iconBg: 'bg-[#D97706]/10 border-[#D97706]/20',
    description: 'Collect 5-star ratings and testimonials from your audience',
  },
  {
    id: 'newsletter',
    label: 'Newsletter Signup',
    title: 'Newsletter Signup',
    defaultTitle: 'Join My Newsletter',
    defaultSubtitle: 'Get weekly updates, curated insights, and exclusive content directly to your inbox.',
    defaultButtonText: 'Subscribe Now',
    defaultSuccessMessage: "You're subscribed! Check your inbox for updates.",
    icon: Send,
    iconColor: 'text-[#DB2777]',
    iconBg: 'bg-[#DB2777]/10 border-[#DB2777]/20',
    description: 'Grow your subscriber list with GDPR/consent-ready signup',
  },
  {
    id: 'qa',
    label: 'Q&A / Ask Me Anything',
    title: 'Q&A / Ask Me Anything',
    defaultTitle: 'Ask Me Anything',
    defaultSubtitle: 'Submit your questions below — I will answer the most interesting ones soon!',
    defaultButtonText: 'Submit Question',
    defaultSuccessMessage: 'Your question has been submitted! Stay tuned.',
    icon: HelpCircle,
    iconColor: 'text-[#2563EB]',
    iconBg: 'bg-[#2563EB]/10 border-[#2563EB]/20',
    description: 'Let followers submit questions privately or for moderation',
  },
]

export default function AddFormConfig({
  formType = 'contact',
  initialProps = null,
  creatorEmail = '',
  onSubmit,
  onCancel,
  isEditing = false,
  isSubmitting = false,
}) {
  const meta = FORM_TYPES.find((f) => f.id === formType) || FORM_TYPES[0]
  const Icon = meta.icon

  // Common configuration fields
  const [title, setTitle] = useState(initialProps?.title || meta.defaultTitle)
  const [subtitle, setSubtitle] = useState(initialProps?.subtitle || initialProps?.description || meta.defaultSubtitle)
  const [buttonText, setButtonText] = useState(initialProps?.buttonText || meta.defaultButtonText)
  const [notificationEmail, setNotificationEmail] = useState(initialProps?.notificationEmail || creatorEmail || '')
  const [successMessage, setSuccessMessage] = useState(initialProps?.successMessage || meta.defaultSuccessMessage)

  // Form-specific settings
  const existingSettings = initialProps?.settings || {}
  
  // Contact settings
  const [requireName, setRequireName] = useState(
    existingSettings.requireName !== undefined ? Boolean(existingSettings.requireName) : true
  )
  const [includePhone, setIncludePhone] = useState(
    existingSettings.includePhone !== undefined ? Boolean(existingSettings.includePhone) : false
  )

  // Feedback settings
  const [requireComment, setRequireComment] = useState(
    existingSettings.requireComment !== undefined ? Boolean(existingSettings.requireComment) : true
  )
  const [includeNameFeedback, setIncludeNameFeedback] = useState(
    existingSettings.includeName !== undefined ? Boolean(existingSettings.includeName) : true
  )
  const [includeEmailFeedback, setIncludeEmailFeedback] = useState(
    existingSettings.includeEmail !== undefined ? Boolean(existingSettings.includeEmail) : true
  )

  // Newsletter settings
  const [includeNameNewsletter, setIncludeNameNewsletter] = useState(
    existingSettings.includeName !== undefined ? Boolean(existingSettings.includeName) : true
  )
  const [requireConsent, setRequireConsent] = useState(
    existingSettings.requireConsent !== undefined ? Boolean(existingSettings.requireConsent) : true
  )
  const [consentText, setConsentText] = useState(
    existingSettings.consentText || 'I agree to receive email updates and understand I can unsubscribe anytime.'
  )

  // Q&A settings
  const [allowAnonymous, setAllowAnonymous] = useState(
    existingSettings.allowAnonymous !== undefined ? Boolean(existingSettings.allowAnonymous) : true
  )
  const [includeEmailQA, setIncludeEmailQA] = useState(
    existingSettings.includeEmail !== undefined ? Boolean(existingSettings.includeEmail) : true
  )
  const [requireApproval, setRequireApproval] = useState(
    existingSettings.requireApproval !== undefined ? Boolean(existingSettings.requireApproval) : true
  )

  const [validationError, setValidationError] = useState('')

  function handleSubmit(e) {
    e.preventDefault()
    setValidationError('')

    if (!title.trim()) {
      setValidationError('Please enter a form title.')
      return
    }

    if (notificationEmail.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(notificationEmail.trim())) {
        setValidationError('Please enter a valid notification email address.')
        return
      }
    }

    let settings = {}
    if (meta.id === 'contact') {
      settings = { requireName, includePhone }
    } else if (meta.id === 'feedback') {
      settings = { ratingStyle: 'five_star', requireComment, includeName: includeNameFeedback, includeEmail: includeEmailFeedback }
    } else if (meta.id === 'newsletter') {
      settings = { includeName: includeNameNewsletter, requireConsent, consentText: consentText.trim() }
    } else if (meta.id === 'qa') {
      settings = { allowAnonymous, includeEmail: includeEmailQA, requireApproval }
    }

    onSubmit({
      formId: initialProps?.formId || initialProps?.id,
      formType: meta.id,
      title: title.trim(),
      subtitle: subtitle.trim(),
      description: subtitle.trim(),
      buttonText: buttonText.trim() || meta.defaultButtonText,
      notificationEmail: notificationEmail.trim(),
      successMessage: successMessage.trim() || meta.defaultSuccessMessage,
      settings,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* 1. Header Information Banner (Clean, light surface) */}
      <div className="flex items-center gap-3.5 p-4 rounded-2xl bg-[var(--bg-surface-secondary,#F9F9F8)] dark:bg-[#1C1C1E] border border-[var(--border-subtle,#EAE9E6)] dark:border-[#2C2C2E]">
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border ${meta.iconBg}`}>
          <Icon className={`h-5 w-5 ${meta.iconColor}`} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-semibold text-[var(--text-heading,#111827)] dark:text-white">
              {meta.label}
            </h4>
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              Active Form
            </span>
          </div>
          <p className="text-xs text-[var(--text-muted,#6B7280)] dark:text-[#9CA3AF] mt-0.5">
            {meta.description}
          </p>
        </div>
      </div>

      {validationError && (
        <div className="p-3 text-xs rounded-xl bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400 border border-red-200 dark:border-red-900/50">
          {validationError}
        </div>
      )}

      {/* 2. Primary Configuration Fields */}
      <div className="space-y-4">
        <TextInput
          label="Form title"
          placeholder="e.g. Get in Touch"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
        <TextInput
          as="textarea"
          label="Description / prompt"
          placeholder="Short message guiding the visitor..."
          value={subtitle}
          onChange={(e) => setSubtitle(e.target.value)}
          rows={2}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <TextInput
            label="Submit button label"
            placeholder={meta.defaultButtonText}
            value={buttonText}
            onChange={(e) => setButtonText(e.target.value)}
          />
          <div>
            <TextInput
              type="email"
              label="Notification email (optional)"
              placeholder="alerts@yourdomain.com"
              value={notificationEmail}
              onChange={(e) => setNotificationEmail(e.target.value)}
            />
            <p className="text-[11px] text-[var(--text-muted,#6B7280)] dark:text-[#9CA3AF] mt-1 flex items-center gap-1">
              <Info className="h-3 w-3 shrink-0" />
              Creator alert email only. Visitors never see this address.
            </p>
          </div>
        </div>

        <TextInput
          label="Success message"
          placeholder={meta.defaultSuccessMessage}
          value={successMessage}
          onChange={(e) => setSuccessMessage(e.target.value)}
        />
      </div>

      {/* 3. Form-Specific Behavior Settings */}
      <div className="p-4 rounded-2xl bg-[var(--bg-surface-secondary,#F9F9F8)] dark:bg-[#1C1C1E] border border-[var(--border-subtle,#EAE9E6)] dark:border-[#2C2C2E] space-y-3.5">
        <div className="flex items-center justify-between pb-1 border-b border-[var(--border-subtle,#EAE9E6)] dark:border-[#2C2C2E]">
          <span className="text-xs font-semibold text-[var(--text-heading,#111827)] dark:text-white uppercase tracking-wider">
            Behavior & Field Options
          </span>
          <span className="text-[11px] text-[var(--text-muted,#6B7280)] dark:text-[#9CA3AF]">
            Customize form controls
          </span>
        </div>

        {meta.id === 'contact' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-xs font-medium text-[var(--text-heading,#111827)] dark:text-white">Require Visitor Name</Label>
                <p className="text-[11px] text-[var(--text-muted,#6B7280)] dark:text-[#9CA3AF]">When disabled, name is optional</p>
              </div>
              <Switch checked={requireName} onCheckedChange={setRequireName} />
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-[var(--border-subtle,#EAE9E6)] dark:border-[#2C2C2E]">
              <div>
                <Label className="text-xs font-medium text-[var(--text-heading,#111827)] dark:text-white">Include Phone Number</Label>
                <p className="text-[11px] text-[var(--text-muted,#6B7280)] dark:text-[#9CA3AF]">Adds an optional phone field for callbacks</p>
              </div>
              <Switch checked={includePhone} onCheckedChange={setIncludePhone} />
            </div>
          </div>
        )}

        {meta.id === 'feedback' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-xs font-medium text-[var(--text-heading,#111827)] dark:text-white">Require Written Feedback</Label>
                <p className="text-[11px] text-[var(--text-muted,#6B7280)] dark:text-[#9CA3AF]">Requires comments in addition to star rating</p>
              </div>
              <Switch checked={requireComment} onCheckedChange={setRequireComment} />
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-[var(--border-subtle,#EAE9E6)] dark:border-[#2C2C2E]">
              <div>
                <Label className="text-xs font-medium text-[var(--text-heading,#111827)] dark:text-white">Collect Visitor Name</Label>
                <p className="text-[11px] text-[var(--text-muted,#6B7280)] dark:text-[#9CA3AF]">Let visitors share their name with the review</p>
              </div>
              <Switch checked={includeNameFeedback} onCheckedChange={setIncludeNameFeedback} />
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-[var(--border-subtle,#EAE9E6)] dark:border-[#2C2C2E]">
              <div>
                <Label className="text-xs font-medium text-[var(--text-heading,#111827)] dark:text-white">Collect Visitor Email</Label>
                <p className="text-[11px] text-[var(--text-muted,#6B7280)] dark:text-[#9CA3AF]">Allows you to follow up on feedback privately</p>
              </div>
              <Switch checked={includeEmailFeedback} onCheckedChange={setIncludeEmailFeedback} />
            </div>
          </div>
        )}

        {meta.id === 'newsletter' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-xs font-medium text-[var(--text-heading,#111827)] dark:text-white">Ask for First Name</Label>
                <p className="text-[11px] text-[var(--text-muted,#6B7280)] dark:text-[#9CA3AF]">Enables personalized email newsletters</p>
              </div>
              <Switch checked={includeNameNewsletter} onCheckedChange={setIncludeNameNewsletter} />
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-[var(--border-subtle,#EAE9E6)] dark:border-[#2C2C2E]">
              <div>
                <Label className="text-xs font-medium text-[var(--text-heading,#111827)] dark:text-white">Require Marketing Consent Checkbox</Label>
                <p className="text-[11px] text-[var(--text-muted,#6B7280)] dark:text-[#9CA3AF]">Enforces explicit GDPR / privacy agreement</p>
              </div>
              <Switch checked={requireConsent} onCheckedChange={setRequireConsent} />
            </div>
            {requireConsent && (
              <div className="pt-2 border-t border-[var(--border-subtle,#EAE9E6)] dark:border-[#2C2C2E]">
                <TextInput
                  label="Consent Statement"
                  value={consentText}
                  onChange={(e) => setConsentText(e.target.value)}
                  placeholder="I agree to receive updates..."
                />
              </div>
            )}
          </div>
        )}

        {meta.id === 'qa' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-xs font-medium text-[var(--text-heading,#111827)] dark:text-white">Allow Anonymous Submissions</Label>
                <p className="text-[11px] text-[var(--text-muted,#6B7280)] dark:text-[#9CA3AF]">Visitors can ask without sharing name or email</p>
              </div>
              <Switch checked={allowAnonymous} onCheckedChange={setAllowAnonymous} />
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-[var(--border-subtle,#EAE9E6)] dark:border-[#2C2C2E]">
              <div>
                <Label className="text-xs font-medium text-[var(--text-heading,#111827)] dark:text-white">Collect Email for Direct Answers</Label>
                <p className="text-[11px] text-[var(--text-muted,#6B7280)] dark:text-[#9CA3AF]">Allows you to email your reply to the questioner</p>
              </div>
              <Switch checked={includeEmailQA} onCheckedChange={setIncludeEmailQA} />
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-[var(--border-subtle,#EAE9E6)] dark:border-[#2C2C2E]">
              <div>
                <Label className="text-xs font-medium text-[var(--text-heading,#111827)] dark:text-white flex items-center gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5 text-blue-500" />
                  Creator Moderation Required
                </Label>
                <p className="text-[11px] text-[var(--text-muted,#6B7280)] dark:text-[#9CA3AF]">Questions remain private in inbox until approved</p>
              </div>
              <Switch checked={requireApproval} onCheckedChange={setRequireApproval} />
            </div>
          </div>
        )}
      </div>

      {/* 4. Included Fields Summary (Lightweight neutral chips) */}
      <div className="p-4 rounded-2xl bg-[var(--bg-surface-secondary,#F9F9F8)] dark:bg-[#1C1C1E] border border-[var(--border-subtle,#EAE9E6)] dark:border-[#2C2C2E] space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-[var(--text-heading,#111827)] dark:text-white">
            Included Form Fields
          </span>
          <span className="text-[11px] text-[var(--text-muted,#6B7280)] dark:text-[#9CA3AF]">
            Auto-configured for visitor
          </span>
        </div>
        <div className="flex flex-wrap gap-2 pt-0.5">
          {meta.id === 'contact' && (
            <>
              <span className="text-xs px-3 py-1 rounded-full bg-white dark:bg-[#252525] border border-[var(--border-subtle,#EAE9E6)] dark:border-[#383838] text-[var(--text-body,#374151)] dark:text-[#D1D5DB] font-medium flex items-center gap-1">
                <Check className="h-3 w-3 text-emerald-500" />
                {requireName ? 'Name (Required)' : 'Name (Optional)'}
              </span>
              <span className="text-xs px-3 py-1 rounded-full bg-white dark:bg-[#252525] border border-[var(--border-subtle,#EAE9E6)] dark:border-[#383838] text-[var(--text-body,#374151)] dark:text-[#D1D5DB] font-medium flex items-center gap-1">
                <Check className="h-3 w-3 text-emerald-500" />
                Email (Required)
              </span>
              <span className="text-xs px-3 py-1 rounded-full bg-white dark:bg-[#252525] border border-[var(--border-subtle,#EAE9E6)] dark:border-[#383838] text-[var(--text-body,#374151)] dark:text-[#D1D5DB] font-medium flex items-center gap-1">
                <Check className="h-3 w-3 text-emerald-500" />
                Message (Required)
              </span>
              {includePhone && (
                <span className="text-xs px-3 py-1 rounded-full bg-white dark:bg-[#252525] border border-[var(--border-subtle,#EAE9E6)] dark:border-[#383838] text-[var(--text-body,#374151)] dark:text-[#D1D5DB] font-medium flex items-center gap-1">
                  <Check className="h-3 w-3 text-blue-500" />
                  Phone Number (Optional)
                </span>
              )}
            </>
          )}

          {meta.id === 'feedback' && (
            <>
              <span className="text-xs px-3 py-1 rounded-full bg-white dark:bg-[#252525] border border-[var(--border-subtle,#EAE9E6)] dark:border-[#383838] text-[var(--text-body,#374151)] dark:text-[#D1D5DB] font-medium flex items-center gap-1">
                <Check className="h-3 w-3 text-amber-500" />
                5-Star Rating (Required)
              </span>
              <span className="text-xs px-3 py-1 rounded-full bg-white dark:bg-[#252525] border border-[var(--border-subtle,#EAE9E6)] dark:border-[#383838] text-[var(--text-body,#374151)] dark:text-[#D1D5DB] font-medium flex items-center gap-1">
                <Check className="h-3 w-3 text-emerald-500" />
                {requireComment ? 'Feedback Comment (Required)' : 'Feedback Comment (Optional)'}
              </span>
              {includeNameFeedback && (
                <span className="text-xs px-3 py-1 rounded-full bg-white dark:bg-[#252525] border border-[var(--border-subtle,#EAE9E6)] dark:border-[#383838] text-[var(--text-body,#374151)] dark:text-[#D1D5DB] font-medium flex items-center gap-1">
                  <Check className="h-3 w-3 text-emerald-500" />
                  Name (Optional)
                </span>
              )}
              {includeEmailFeedback && (
                <span className="text-xs px-3 py-1 rounded-full bg-white dark:bg-[#252525] border border-[var(--border-subtle,#EAE9E6)] dark:border-[#383838] text-[var(--text-body,#374151)] dark:text-[#D1D5DB] font-medium flex items-center gap-1">
                  <Check className="h-3 w-3 text-emerald-500" />
                  Email (Optional)
                </span>
              )}
            </>
          )}

          {meta.id === 'newsletter' && (
            <>
              {includeNameNewsletter && (
                <span className="text-xs px-3 py-1 rounded-full bg-white dark:bg-[#252525] border border-[var(--border-subtle,#EAE9E6)] dark:border-[#383838] text-[var(--text-body,#374151)] dark:text-[#D1D5DB] font-medium flex items-center gap-1">
                  <Check className="h-3 w-3 text-emerald-500" />
                  First Name (Optional)
                </span>
              )}
              <span className="text-xs px-3 py-1 rounded-full bg-white dark:bg-[#252525] border border-[var(--border-subtle,#EAE9E6)] dark:border-[#383838] text-[var(--text-body,#374151)] dark:text-[#D1D5DB] font-medium flex items-center gap-1">
                <Check className="h-3 w-3 text-emerald-500" />
                Email Address (Required)
              </span>
              {requireConsent && (
                <span className="text-xs px-3 py-1 rounded-full bg-white dark:bg-[#252525] border border-[var(--border-subtle,#EAE9E6)] dark:border-[#383838] text-[var(--text-body,#374151)] dark:text-[#D1D5DB] font-medium flex items-center gap-1">
                  <Check className="h-3 w-3 text-pink-500" />
                  Marketing Consent Checkbox
                </span>
              )}
            </>
          )}

          {meta.id === 'qa' && (
            <>
              <span className="text-xs px-3 py-1 rounded-full bg-white dark:bg-[#252525] border border-[var(--border-subtle,#EAE9E6)] dark:border-[#383838] text-[var(--text-body,#374151)] dark:text-[#D1D5DB] font-medium flex items-center gap-1">
                <Check className="h-3 w-3 text-blue-500" />
                Question (Required)
              </span>
              <span className="text-xs px-3 py-1 rounded-full bg-white dark:bg-[#252525] border border-[var(--border-subtle,#EAE9E6)] dark:border-[#383838] text-[var(--text-body,#374151)] dark:text-[#D1D5DB] font-medium flex items-center gap-1">
                <Check className="h-3 w-3 text-blue-500" />
                {allowAnonymous ? 'Name (Optional / Anonymous)' : 'Name (Required)'}
              </span>
              {includeEmailQA && (
                <span className="text-xs px-3 py-1 rounded-full bg-white dark:bg-[#252525] border border-[var(--border-subtle,#EAE9E6)] dark:border-[#383838] text-[var(--text-body,#374151)] dark:text-[#D1D5DB] font-medium flex items-center gap-1">
                  <Check className="h-3 w-3 text-blue-500" />
                  Email (Optional)
                </span>
              )}
            </>
          )}
        </div>
      </div>

      {/* 5. Footer Actions */}
      <div className="pt-2">
        <ModalFooterActions
          secondaryLabel={isEditing ? 'Cancel' : 'Back'}
          onSecondary={onCancel}
          hideSecondary={!onCancel}
          primaryLabel={isSubmitting ? 'Saving...' : (isEditing ? 'Save Form Changes' : 'Add Form to Store')}
          primaryType="submit"
        />
      </div>
    </form>
  )
}
