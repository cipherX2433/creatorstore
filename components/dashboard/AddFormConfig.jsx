'use client'

import { useState } from 'react'
import { TextInput } from '@/components/ui/text-input'
import { ModalFooterActions } from '@/components/ui/base-modal'
import { IconBadge, ICON_BADGE_COLORS } from '@/components/ui/icon-badge'
import {
  Mail, Star, Send, HelpCircle,
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
    iconHex: ICON_BADGE_COLORS.contact,
    iconColor: 'text-white',
    iconBg: 'bg-[#14B8A6]',
    description: 'Let visitors send you a direct message',
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
    iconHex: ICON_BADGE_COLORS.feedback,
    iconColor: 'text-[#0F172A]',
    iconBg: 'bg-[#F59E0B]',
    description: 'Collect ratings and feedback from your audience',
  },
  {
    id: 'newsletter',
    label: 'Newsletter Signup',
    title: 'Newsletter Signup',
    defaultTitle: 'Join My Newsletter',
    defaultSubtitle: 'Get weekly tips, curated resources, and exclusive drops directly to your inbox.',
    defaultButtonText: 'Subscribe Now',
    defaultSuccessMessage: "You're subscribed! Check your inbox for updates.",
    icon: Send,
    iconHex: ICON_BADGE_COLORS.newsletter,
    iconColor: 'text-[#0F172A]',
    iconBg: 'bg-[#F472B6]',
    description: 'Grow your email list with a signup form',
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
    iconHex: ICON_BADGE_COLORS.qa,
    iconColor: 'text-white',
    iconBg: 'bg-primary',
    description: 'Let followers submit questions for you to answer',
  },
]

export default function AddFormConfig({
  formType = 'contact',
  initialProps = null,
  creatorEmail = '',
  onSubmit,
  onCancel,
  isEditing = false,
}) {
  const meta = FORM_TYPES.find((f) => f.id === formType) || FORM_TYPES[0]
  const Icon = meta.icon

  const [title, setTitle] = useState(initialProps?.title || meta.defaultTitle)
  const [subtitle, setSubtitle] = useState(initialProps?.subtitle || meta.defaultSubtitle)
  const [buttonText, setButtonText] = useState(initialProps?.buttonText || meta.defaultButtonText)
  const [notificationEmail, setNotificationEmail] = useState(initialProps?.notificationEmail || creatorEmail || '')
  const [successMessage, setSuccessMessage] = useState(initialProps?.successMessage || meta.defaultSuccessMessage)

  function handleSubmit(e) {
    e.preventDefault()
    onSubmit({
      formType: meta.id,
      title: title.trim() || meta.defaultTitle,
      subtitle: subtitle.trim() || meta.defaultSubtitle,
      buttonText: buttonText.trim() || meta.defaultButtonText,
      notificationEmail: notificationEmail.trim(),
      successMessage: successMessage.trim() || meta.defaultSuccessMessage,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="flex items-center gap-3 p-4 rounded-[24px] bg-[#1A1A1A] border border-[#2E2E2E]">
        <IconBadge color={meta.iconHex}>
          <Icon className="h-5 w-5" />
        </IconBadge>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-white">{meta.label}</p>
          <p className="text-sm text-[#96969D] truncate">{meta.description}</p>
        </div>
      </div>

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
        <TextInput
          type="email"
          label="Notification email"
          placeholder="you@example.com"
          value={notificationEmail}
          onChange={(e) => setNotificationEmail(e.target.value)}
        />
      </div>
      <TextInput
        label="Success message"
        placeholder={meta.defaultSuccessMessage}
        value={successMessage}
        onChange={(e) => setSuccessMessage(e.target.value)}
      />

      <div className="p-4 rounded-2xl bg-[#232323] border border-white/[0.08] space-y-2">
        <div className="flex items-center justify-between text-sm text-[#96969D]">
          <span className="font-semibold text-white">Included fields</span>
          <span className="text-xs">Automated fields</span>
        </div>
        <div className="flex flex-wrap gap-2 pt-1">
          {formType === 'contact' && (
            <>
              <span className="text-xs px-3 py-1.5 rounded-full bg-[#2A2A2A] text-white">Name (Required)</span>
              <span className="text-xs px-3 py-1.5 rounded-full bg-[#2A2A2A] text-white">Email (Required)</span>
              <span className="text-xs px-3 py-1.5 rounded-full bg-[#2A2A2A] text-white">Message (Required)</span>
            </>
          )}
          {formType === 'feedback' && (
            <>
              <span className="text-xs px-3 py-1.5 rounded-full bg-[#2A2A2A] text-white">5-Star Rating</span>
              <span className="text-xs px-3 py-1.5 rounded-full bg-[#2A2A2A] text-white">Name (Optional)</span>
              <span className="text-xs px-3 py-1.5 rounded-full bg-[#2A2A2A] text-white">Feedback Comments</span>
            </>
          )}
          {formType === 'newsletter' && (
            <>
              <span className="text-xs px-3 py-1.5 rounded-full bg-[#2A2A2A] text-white">First Name (Optional)</span>
              <span className="text-xs px-3 py-1.5 rounded-full bg-[#2A2A2A] text-white">Email Address (Required)</span>
            </>
          )}
          {formType === 'qa' && (
            <>
              <span className="text-xs px-3 py-1.5 rounded-full bg-[#2A2A2A] text-white">Name / Handle (Optional)</span>
              <span className="text-xs px-3 py-1.5 rounded-full bg-[#2A2A2A] text-white">Email (Optional)</span>
              <span className="text-xs px-3 py-1.5 rounded-full bg-[#2A2A2A] text-white">Question (Required)</span>
            </>
          )}
        </div>
      </div>

      <div className="pt-1">
        <ModalFooterActions
          secondaryLabel={isEditing ? 'Cancel' : 'Back'}
          onSecondary={onCancel}
          hideSecondary={!onCancel}
          primaryLabel={isEditing ? 'Save Form Changes' : 'Add Form to Store'}
          primaryType="submit"
        />
      </div>
    </form>
  )
}
