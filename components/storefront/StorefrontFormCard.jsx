'use client'

import { useState, useMemo } from 'react'
import {
  Mail, Star, Send, HelpCircle, CheckCircle2,
  Loader2
} from 'lucide-react'
import { toast } from 'sonner'
import { getContrastColor } from '@/lib/colorContrast'

export default function StorefrontFormCard({ section, tokens = {}, editor = false, username = '' }) {
  const props = section.props || {}
  const formType = props.formType || 'contact'
  const title = props.title || (formType === 'contact' ? 'Get in Touch' : formType === 'feedback' ? 'Share Your Feedback' : formType === 'newsletter' ? 'Join My Newsletter' : 'Ask Me Anything')
  const subtitle = props.subtitle || (formType === 'contact' ? 'Have a question or proposal? Send me a direct message.' : formType === 'feedback' ? 'Help me improve by rating your experience.' : formType === 'newsletter' ? 'Get weekly updates and exclusive resources.' : 'Drop your questions below and I will answer soon.')
  const buttonText = props.buttonText || (formType === 'contact' ? 'Send Message' : formType === 'feedback' ? 'Submit Feedback' : formType === 'newsletter' ? 'Subscribe' : 'Submit Question')
  const successMessage = props.successMessage || 'Thank you! Your submission has been received.'

  const { colors = {}, buttons = {} } = tokens
  const bgHex = colors.background || colors.bg || '#0A0A0A'
  
  const surfaceTheme = useMemo(() => getContrastColor(bgHex), [bgHex])

  // Form state
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [rating, setRating] = useState(5)
  const [hoverRating, setHoverRating] = useState(0)
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)

  // Subtype icons
  const typeIcon = formType === 'newsletter'
    ? Send
    : formType === 'feedback'
      ? Star
      : formType === 'qa'
        ? HelpCircle
        : Mail

  const Icon = typeIcon

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)

    setTimeout(() => {
      setLoading(false)
      setSubmitted(true)
      toast.success(successMessage)
    }, 450)
  }

  function handleReset() {
    setName('')
    setEmail('')
    setMessage('')
    setRating(5)
    setSubmitted(false)
  }

  // Primary CTA Button Style (Pink accent with high contrast, pill shape, proper padding)
  const primaryButtonColor = buttons.color || colors.buttonColor || colors.primaryColor || '#194DF5'

  return (
    <div className="w-full max-w-md mx-auto my-2">
      <div
        className="p-6 sm:p-7 transition-all duration-300 relative overflow-hidden"
        style={{
          backgroundColor: surfaceTheme.cardBg,
          borderRadius: '28px',
          border: `1px solid ${surfaceTheme.cardBorder}`,
          boxShadow: surfaceTheme.cardShadow,
        }}
      >
        {submitted ? (
          <div className="py-8 text-center space-y-3.5">
            <div className="h-14 w-14 rounded-full bg-teal-500/20 text-teal-400 border border-teal-500/30 flex items-center justify-center mx-auto animate-in zoom-in-75 duration-200">
              <CheckCircle2 className="h-7 w-7" />
            </div>
            <h4 className="text-xl font-black tracking-tight" style={{ color: surfaceTheme.heading }}>
              {successMessage}
            </h4>
            <p className="text-xs max-w-xs mx-auto leading-relaxed" style={{ color: surfaceTheme.muted }}>
              Your response has been delivered to @{username || 'creator'}.
            </p>
            <button
              type="button"
              onClick={handleReset}
              className="mt-3 text-xs font-bold underline transition-opacity hover:opacity-80 cursor-pointer"
              style={{ color: primaryButtonColor }}
            >
              Submit another response
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Form Header */}
            <div className="flex items-start gap-3.5 pb-2" style={{ borderBottom: `1px solid ${surfaceTheme.divider}` }}>
              <div
                className="h-10 w-10 rounded-full flex items-center justify-center shrink-0 transition-transform"
                style={{
                  backgroundColor: surfaceTheme.iconBg,
                  color: surfaceTheme.iconColor,
                }}
              >
                <Icon className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1 pt-0.5">
                <h3 className="text-lg font-black tracking-tight leading-snug" style={{ color: surfaceTheme.heading }}>
                  {title}
                </h3>
                {subtitle && (
                  <p className="text-xs leading-relaxed mt-0.5" style={{ color: surfaceTheme.muted }}>
                    {subtitle}
                  </p>
                )}
              </div>
            </div>

            {/* Form Fields */}
            <div className="space-y-3.5 pt-1">
              {/* Star Rating for Feedback Form */}
              {formType === 'feedback' && (
                <div className="space-y-1.5 text-center py-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider block" style={{ color: surfaceTheme.label }}>
                    Your Rating
                  </span>
                  <div className="flex items-center justify-center gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setRating(star)}
                        onMouseEnter={() => setHoverRating(star)}
                        onMouseLeave={() => setHoverRating(0)}
                        className="p-1 transition-transform hover:scale-125 focus:outline-none cursor-pointer"
                      >
                        <Star
                          className={`h-7 w-7 transition-colors ${
                            star <= (hoverRating || rating)
                              ? 'fill-amber-400 text-amber-400'
                              : 'text-zinc-500/50'
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Name field */}
              {formType !== 'newsletter' && (
                <div className="space-y-1">
                  <label className="text-[11px] font-bold uppercase tracking-wider block" style={{ color: surfaceTheme.label }}>
                    {formType === 'qa' ? 'Your Name / Handle' : 'Name'} {formType === 'contact' ? '*' : '(Optional)'}
                  </label>
                  <input
                    type="text"
                    required={formType === 'contact'}
                    placeholder={formType === 'qa' ? 'e.g. @alex' : 'Your name'}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-4 py-3 rounded-[12px] text-xs font-medium outline-none transition-all placeholder:opacity-60 focus:ring-1"
                    style={{
                      backgroundColor: surfaceTheme.inputBg,
                      color: surfaceTheme.inputText,
                      border: `1px solid ${surfaceTheme.inputBorder}`,
                    }}
                  />
                </div>
              )}

              {/* Email field */}
              {formType !== 'qa' && (
                <div className="space-y-1">
                  <label className="text-[11px] font-bold uppercase tracking-wider block" style={{ color: surfaceTheme.label }}>
                    Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-3 rounded-[12px] text-xs font-medium outline-none transition-all placeholder:opacity-60 focus:ring-1"
                    style={{
                      backgroundColor: surfaceTheme.inputBg,
                      color: surfaceTheme.inputText,
                      border: `1px solid ${surfaceTheme.inputBorder}`,
                    }}
                  />
                </div>
              )}

              {/* Message / Question field */}
              {(formType === 'contact' || formType === 'feedback' || formType === 'qa') && (
                <div className="space-y-1">
                  <label className="text-[11px] font-bold uppercase tracking-wider block" style={{ color: surfaceTheme.label }}>
                    {formType === 'qa' ? 'Your Question *' : formType === 'feedback' ? 'Feedback Comments *' : 'Message *'}
                  </label>
                  <textarea
                    required
                    rows={3}
                    placeholder={
                      formType === 'qa'
                        ? 'Type your question here...'
                        : formType === 'feedback'
                          ? 'What did you like or how can I improve?'
                          : 'How can I help you?'
                    }
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="w-full px-4 py-3 rounded-[12px] text-xs font-medium outline-none transition-all resize-none placeholder:opacity-60 focus:ring-1"
                    style={{
                      backgroundColor: surfaceTheme.inputBg,
                      color: surfaceTheme.inputText,
                      border: `1px solid ${surfaceTheme.inputBorder}`,
                    }}
                  />
                </div>
              )}
            </div>

            {/* Prominent Primary Pill Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 px-6 font-black text-sm rounded-full transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer shadow-md hover:opacity-95 hover:scale-[1.01] active:scale-[0.99]"
                style={{
                  backgroundColor: primaryButtonColor,
                  color: '#000000',
                  borderRadius: '9999px',
                }}
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <span>{buttonText}</span>
                    <Icon className="h-4 w-4 stroke-[2.5]" />
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
