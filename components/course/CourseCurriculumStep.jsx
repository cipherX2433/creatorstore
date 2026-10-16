'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Plus, Trash2, Video, FileText, File, Sparkles, Layers,
  ChevronDown, ChevronUp, AlertCircle, PlayCircle, Info
} from 'lucide-react'

const LESSON_TYPES = [
  { type: 'VIDEO', label: 'Video Lesson', icon: Video },
  { type: 'TEXT', label: 'Rich Text / Article', icon: FileText },
  { type: 'PDF', label: 'PDF Document', icon: File },
]

export default function CourseCurriculumStep({
  formState,
  onChange,
  errors = {},
}) {
  const modules = formState.modules || [
    {
      id: 'mod_1',
      title: 'Module 1: Getting Started',
      lessons: [
        { id: 'les_1', title: '1. Welcome & Course Overview', type: 'VIDEO', duration: '5 min', isFreePreview: true },
        { id: 'les_2', title: '2. Tools & Prerequisites Setup', type: 'TEXT', duration: '10 min', isFreePreview: false },
      ],
    },
  ]

  function updateModules(nextModules) {
    onChange({ modules: nextModules })
  }

  function addModule() {
    const newMod = {
      id: `mod_${Date.now()}`,
      title: `Module ${modules.length + 1}: New Section`,
      lessons: [
        { id: `les_${Date.now()}_1`, title: 'Lesson 1', type: 'VIDEO', duration: '', isFreePreview: false },
      ],
    }
    updateModules([...modules, newMod])
  }

  function updateModuleTitle(modIdx, title) {
    const copy = [...modules]
    copy[modIdx] = { ...copy[modIdx], title }
    updateModules(copy)
  }

  function deleteModule(modIdx) {
    if (modules.length <= 1) {
      // Don't delete last module entirely, but clear lessons or let user re-edit
      const copy = [{ ...modules[0], title: '', lessons: [] }]
      updateModules(copy)
      return
    }
    const copy = modules.filter((_, i) => i !== modIdx)
    updateModules(copy)
  }

  function addLesson(modIdx) {
    const copy = [...modules]
    const currentLessons = copy[modIdx].lessons || []
    const newLesson = {
      id: `les_${Date.now()}`,
      title: `Lesson ${currentLessons.length + 1}`,
      type: 'VIDEO',
      duration: '',
      isFreePreview: false,
    }
    copy[modIdx] = {
      ...copy[modIdx],
      lessons: [...currentLessons, newLesson],
    }
    updateModules(copy)
  }

  function updateLesson(modIdx, lesIdx, patch) {
    const copy = [...modules]
    const lessons = [...(copy[modIdx].lessons || [])]
    lessons[lesIdx] = { ...lessons[lesIdx], ...patch }
    copy[modIdx] = { ...copy[modIdx], lessons }
    updateModules(copy)
  }

  function deleteLesson(modIdx, lesIdx) {
    const copy = [...modules]
    const lessons = [...(copy[modIdx].lessons || [])]
    lessons.splice(lesIdx, 1)
    copy[modIdx] = { ...copy[modIdx], lessons }
    updateModules(copy)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#D8DFFA] pb-4">
        <div>
          <h2 className="text-lg font-bold text-[#010619]">Curriculum Structure</h2>
          <p className="text-xs text-[#666666] mt-0.5 font-medium">
            Organize your course into structured modules and lessons.
          </p>
        </div>

        <Button
          type="button"
          size="sm"
          onClick={addModule}
          className="rounded-full bg-[#194DF5] hover:bg-[#1441D9] text-white text-xs font-bold px-3.5 h-8 gap-1.5 cursor-pointer shadow-sm"
        >
          <Plus className="h-3.5 w-3.5" /> Add Module
        </Button>
      </div>

      {errors.curriculum && (
        <div className="p-3 bg-[#EF4444]/10 border border-[#EF4444]/30 rounded-xl text-xs text-[#EF4444] flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{errors.curriculum}</span>
        </div>
      )}

      {/* Modules List */}
      <div className="space-y-4">
        {modules.map((mod, modIdx) => (
          <div
            key={mod.id || modIdx}
            className="p-4 rounded-xl border border-[#D8DFFA] bg-[#EEF1FB] space-y-3"
          >
            {/* Module Header */}
            <div className="flex items-center justify-between gap-3">
              <div className="flex-1 flex items-center gap-2">
                <Layers className="h-4 w-4 text-[#194DF5] shrink-0" />
                <Input
                  value={mod.title}
                  onChange={(e) => updateModuleTitle(modIdx, e.target.value)}
                  placeholder={`Module ${modIdx + 1} Title`}
                  className={`h-9 text-xs font-bold bg-[#FFFFFF] text-[#010619] transition-colors ${
                    errors[`module_${modIdx}_title`] || (!mod.title.trim() && errors.curriculum)
                      ? 'border-[#EF4444]'
                      : 'border-[#D8DFFA] focus:border-[#194DF5]'
                  }`}
                />
              </div>

              <div className="flex items-center gap-1.5">
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => addLesson(modIdx)}
                  className="h-8 text-xs font-semibold text-[#194DF5] hover:bg-[#EAEAE8] rounded-lg px-2.5 gap-1"
                >
                  <Plus className="h-3 w-3" /> Add Lesson
                </Button>

                <button
                  type="button"
                  onClick={() => deleteModule(modIdx)}
                  className="text-[#6B7399] hover:text-[#EF4444] transition-colors p-1.5 cursor-pointer"
                  title="Delete module"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Lessons List within Module */}
            <div className="pl-3 sm:pl-6 space-y-2 border-l-2 border-[#D8DFFA]">
              {(!mod.lessons || mod.lessons.length === 0) ? (
                <p className="text-xs text-[#6B7399] italic py-1">
                  No lessons in this module yet. Click &quot;Add Lesson&quot; above.
                </p>
              ) : (
                mod.lessons.map((les, lesIdx) => (
                  <div
                    key={les.id || lesIdx}
                    className="p-3 rounded-lg bg-[#FFFFFF] border border-[#D8DFFA] flex flex-wrap sm:flex-nowrap items-center justify-between gap-2.5 shadow-xs"
                  >
                    <div className="flex-1 min-w-[200px] flex items-center gap-2">
                      <PlayCircle className="h-3.5 w-3.5 text-[#194DF5] shrink-0" />
                      <Input
                        value={les.title}
                        onChange={(e) => updateLesson(modIdx, lesIdx, { title: e.target.value })}
                        placeholder="Lesson title"
                        className={`h-8 text-xs bg-[#FFFFFF] text-[#010619] font-medium transition-colors ${
                          errors[`lesson_${modIdx}_${lesIdx}_title`] ? 'border-[#EF4444]' : 'border-[#D8DFFA]'
                        }`}
                      />
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <select
                        value={les.type || 'VIDEO'}
                        onChange={(e) => updateLesson(modIdx, lesIdx, { type: e.target.value })}
                        className="h-8 rounded-lg bg-[#F5F5F3] border border-[#D8DFFA] text-[11px] font-semibold text-[#010619] px-2"
                      >
                        <option value="VIDEO">Video</option>
                        <option value="TEXT">Article</option>
                        <option value="PDF">PDF</option>
                      </select>

                      <label className="flex items-center gap-1.5 text-[11px] text-[#666666] cursor-pointer">
                        <input
                          type="checkbox"
                          checked={!!les.isFreePreview}
                          onChange={(e) => updateLesson(modIdx, lesIdx, { isFreePreview: e.target.checked })}
                          className="h-3.5 w-3.5 rounded bg-[#FFFFFF] border-[#D8DFFA] text-[#194DF5]"
                        />
                        <span>Preview</span>
                      </label>

                      <button
                        type="button"
                        onClick={() => deleteLesson(modIdx, lesIdx)}
                        className="text-[#6B7399] hover:text-[#EF4444] p-1 transition-colors cursor-pointer"
                        title="Delete lesson"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
