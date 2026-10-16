'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Plus, Trash2 } from 'lucide-react'

const OPTIONAL_FIELDS = [
  { id: 'phone', label: 'Phone number' },
  { id: 'instagram', label: 'Instagram username' },
  { id: 'company', label: 'Company' },
  { id: 'website', label: 'Website URL' },
  { id: 'message', label: 'Note / Message' },
]

export default function CustomerStep({
  formState,
  onChange,
  errors = {},
}) {
  const customerFields = formState.customerFields || {
    phone: { enabled: true, required: false },
    instagram: { enabled: false, required: false },
    company: { enabled: false, required: false },
    website: { enabled: false, required: false },
    message: { enabled: true, required: false },
  }

  const customQuestions = formState.questions || [
    { id: 'q1', question: 'What would you like help with in this session?', type: 'LONG_TEXT', required: true },
  ]

  function updateFieldToggle(fieldId, patch) {
    const updated = {
      ...customerFields,
      [fieldId]: {
        ...(customerFields[fieldId] || { enabled: false, required: false }),
        ...patch,
      },
    }
    onChange({ customerFields: updated })
  }

  function addQuestion() {
    const newQ = {
      id: `q_${Date.now()}`,
      question: 'What would you like to discuss?',
      type: 'LONG_TEXT',
      required: false,
    }
    onChange({ questions: [...customQuestions, newQ] })
  }

  function updateQuestion(idx, patch) {
    const copy = [...customQuestions]
    copy[idx] = { ...copy[idx], ...patch }
    onChange({ questions: copy })
  }

  function removeQuestion(idx) {
    const copy = [...customQuestions]
    copy.splice(idx, 1)
    onChange({ questions: copy })
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#D8DFFA] pb-4">
        <div>
          <h2 className="text-lg font-bold text-[#010619]">Customer Information</h2>
          <p className="text-xs text-[#666666] mt-0.5">
            Choose what details clients must provide when booking an appointment.
          </p>
        </div>

        <Button
          type="button"
          size="sm"
          onClick={addQuestion}
          className="rounded-full bg-[#194DF5] hover:bg-[#1441D9] text-white text-xs font-bold px-3.5 h-8 gap-1.5 cursor-pointer shadow-sm"
        >
          <Plus className="h-3.5 w-3.5" /> Add Question
        </Button>
      </div>

      <div className="space-y-5">
        {/* Default Standard Fields */}
        <div className="p-4 rounded-xl border border-[#D8DFFA] bg-[#FFFFFF] space-y-2.5 shadow-sm">
          <h3 className="text-xs font-bold text-[#010619]">Standard Contact Fields</h3>
          <div className="space-y-2 text-xs text-[#666666]">
            <div className="flex items-center justify-between">
              <span>Full Name</span>
              <span className="font-semibold text-[#16A34A]">Required</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Email Address</span>
              <span className="font-semibold text-[#16A34A]">Required</span>
            </div>
          </div>
        </div>

        {/* Optional Fields List */}
        <div className="p-4 rounded-xl border border-[#D8DFFA] bg-[#FFFFFF] space-y-3.5 shadow-sm">
          <h3 className="text-xs font-bold text-[#010619]">Optional Contact Fields</h3>

          <div className="space-y-3 divide-y divide-[#D8DFFA]">
            {OPTIONAL_FIELDS.map((f) => {
              const fieldConfig = customerFields[f.id] || { enabled: false, required: false }
              return (
                <div key={f.id} className="pt-3 first:pt-0 flex items-center justify-between text-xs">
                  <label className="flex items-center gap-2.5 text-[#010619] font-semibold cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!!fieldConfig.enabled}
                      onChange={(e) => updateFieldToggle(f.id, { enabled: e.target.checked })}
                      className="h-4 w-4 rounded bg-[#FFFFFF] border-[#D8DFFA] text-[#194DF5] accent-[#194DF5]"
                    />
                    <span>{f.label}</span>
                  </label>

                  {fieldConfig.enabled && (
                    <label className="flex items-center gap-1.5 text-[11px] text-[#666666] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={!!fieldConfig.required}
                        onChange={(e) => updateFieldToggle(f.id, { required: e.target.checked })}
                        className="h-3.5 w-3.5 rounded bg-[#FFFFFF] border-[#D8DFFA] text-[#194DF5] accent-[#194DF5]"
                      />
                      <span>Required</span>
                    </label>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Custom Questions List */}
        {customQuestions.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#666666]">
              Custom Intake Questions
            </h3>

            {customQuestions.map((q, idx) => (
              <div
                key={q.id || idx}
                className="p-4 rounded-xl border border-[#D8DFFA] bg-[#FFFFFF] space-y-3 shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#666666]">
                    Question #{idx + 1}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeQuestion(idx)}
                    className="text-[#6B7399] hover:text-[#EF4444] transition-colors p-1 cursor-pointer"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>

                <Input
                  value={q.question || ''}
                  onChange={(e) => updateQuestion(idx, { question: e.target.value })}
                  placeholder="e.g. What would you like help with?"
                  className={`h-10 rounded-xl bg-[#FFFFFF] text-xs font-semibold text-[#010619] transition-colors ${
                    errors[`question_${idx}`] || errors.questions ? 'border-[#EF4444] focus:border-[#EF4444]' : 'border-[#D8DFFA] focus:border-[#194DF5]'
                  }`}
                />
                {errors[`question_${idx}`] && (
                  <p className="text-xs font-semibold text-[#EF4444]">{errors[`question_${idx}`]}</p>
                )}

                <div className="flex items-center justify-between text-xs pt-1">
                  <select
                    value={q.type || 'LONG_TEXT'}
                    onChange={(e) => updateQuestion(idx, { type: e.target.value })}
                    className="h-8 rounded-lg bg-[#FFFFFF] border border-[#D8DFFA] px-2 text-xs font-semibold text-[#010619] focus:border-[#194DF5]"
                  >
                    <option value="SHORT_TEXT">Short Text</option>
                    <option value="LONG_TEXT">Long Text (Textarea)</option>
                    <option value="CHOICE">Multiple Choice</option>
                    <option value="CHECKBOX">Checkbox</option>
                  </select>

                  <label className="flex items-center gap-2 text-xs font-semibold text-[#010619] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!!q.required}
                      onChange={(e) => updateQuestion(idx, { required: e.target.checked })}
                      className="h-3.5 w-3.5 rounded bg-[#FFFFFF] border-[#D8DFFA] text-[#194DF5] accent-[#194DF5]"
                    />
                    Required
                  </label>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
