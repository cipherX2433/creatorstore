'use client'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { GraduationCap, Image as ImageIcon, X, Info } from 'lucide-react'

const CATEGORIES = [
  'Development & Tech',
  'Design & Creative',
  'Business & Marketing',
  'Finance & Investing',
  'Productivity',
  'Health & Fitness',
  'Music & Audio',
  'General',
]

const DIFFICULTIES = ['Beginner', 'Intermediate', 'Advanced', 'All levels']

const LANGUAGES = ['English', 'Spanish', 'French', 'German', 'Hindi', 'Portuguese', 'Japanese', 'Other']

export default function CourseDetailsStep({
  formState,
  onChange,
  errors = {},
}) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-[#010619]">Course Details</h2>
        <p className="text-xs text-[#666666] mt-0.5 font-medium">
          Basic information students will see on your storefront and landing page.
        </p>
      </div>

      <div className="space-y-5">
        {/* Course Thumbnail */}
        <div className="space-y-2">
          <Label className="text-xs font-semibold text-[#333333]">
            Cover Image / Thumbnail (1200 × 630 recommended)
          </Label>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            {formState.thumbnail ? (
              <div className="relative h-28 w-48 rounded-xl overflow-hidden border border-[#D8DFFA] bg-[#EEF1FB] shrink-0">
                <img
                  src={formState.thumbnail}
                  alt="Course cover preview"
                  className="h-full w-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => onChange({ thumbnail: '' })}
                  className="absolute top-1.5 right-1.5 h-6 w-6 rounded-full bg-black/80 text-white flex items-center justify-center hover:bg-[#EF4444] transition-colors cursor-pointer"
                  title="Remove cover"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <div className="h-28 w-48 rounded-xl border border-dashed border-[#D8DFFA] bg-[#EEF1FB] flex flex-col items-center justify-center gap-1.5 text-[#6B7399] shrink-0">
                <ImageIcon className="h-6 w-6 opacity-60" />
                <span className="text-[10px] font-semibold">No cover image</span>
              </div>
            )}

            <div className="flex-1 space-y-2 w-full">
              <Input
                type="url"
                value={formState.thumbnail || ''}
                onChange={(e) => onChange({ thumbnail: e.target.value })}
                placeholder="https://images.unsplash.com/photo-..."
                className="h-10 rounded-xl bg-[#FFFFFF] border-[#D8DFFA] text-xs text-[#010619] placeholder:text-[#6B7399] focus:border-[#194DF5]"
              />
              <p className="text-[11px] text-[#6B7399]">
                Paste an image URL to display as the course banner across your store.
              </p>
            </div>
          </div>
        </div>

        {/* Course Title */}
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-[#333333]">
            Course Title <span className="text-[#EF4444]">*</span>
          </Label>
          <Input
            value={formState.title || ''}
            onChange={(e) => onChange({ title: e.target.value })}
            placeholder="e.g. Full-Stack Web Development Bootcamp 2026"
            className={`h-11 rounded-xl bg-[#FFFFFF] text-sm font-semibold text-[#010619] placeholder:text-[#6B7399] transition-colors ${
              errors.title ? 'border-[#EF4444] focus:border-[#EF4444]' : 'border-[#D8DFFA] focus:border-[#194DF5]'
            }`}
          />
          {errors.title && (
            <p className="text-xs font-semibold text-[#EF4444] flex items-center gap-1">
              <Info className="h-3.5 w-3.5" /> {errors.title}
            </p>
          )}
        </div>

        {/* Short Subtitle / Summary */}
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-[#333333]">
            Short Subtitle <span className="text-[#EF4444]">*</span>
          </Label>
          <Input
            value={formState.shortDescription || ''}
            onChange={(e) => onChange({ shortDescription: e.target.value })}
            placeholder="e.g. Master React, Node.js, and Cloud Deployment from scratch."
            className={`h-10 rounded-xl bg-[#FFFFFF] text-xs text-[#010619] placeholder:text-[#6B7399] transition-colors ${
              errors.description ? 'border-[#EF4444] focus:border-[#EF4444]' : 'border-[#D8DFFA] focus:border-[#194DF5]'
            }`}
          />
          {errors.description && (
            <p className="text-xs font-semibold text-[#EF4444] flex items-center gap-1">
              <Info className="h-3.5 w-3.5" /> {errors.description}
            </p>
          )}
        </div>

        {/* Full Description */}
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-[#333333]">
            Full Course Description
          </Label>
          <Textarea
            rows={4}
            value={formState.description || ''}
            onChange={(e) => onChange({ description: e.target.value })}
            placeholder="Provide an overview of the curriculum, what students will build, and expectations..."
            className="rounded-xl bg-[#FFFFFF] border-[#D8DFFA] text-xs text-[#010619] placeholder:text-[#6B7399] resize-none focus:border-[#194DF5]"
          />
        </div>

        {/* Category, Difficulty & Language Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-[#333333]">
              Category <span className="text-[#EF4444]">*</span>
            </Label>
            <select
              value={formState.category || 'General'}
              onChange={(e) => onChange({ category: e.target.value })}
              className={`w-full h-10 rounded-xl bg-[#FFFFFF] text-xs font-semibold text-[#010619] px-3 cursor-pointer transition-colors ${
                errors.category ? 'border border-[#EF4444]' : 'border border-[#D8DFFA] focus:border-[#194DF5]'
              }`}
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c} className="bg-[#FFFFFF] text-[#010619]">
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-[#333333]">
              Difficulty <span className="text-[#EF4444]">*</span>
            </Label>
            <select
              value={formState.difficulty || 'All levels'}
              onChange={(e) => onChange({ difficulty: e.target.value })}
              className={`w-full h-10 rounded-xl bg-[#FFFFFF] text-xs font-semibold text-[#010619] px-3 cursor-pointer transition-colors ${
                errors.difficulty ? 'border border-[#EF4444]' : 'border border-[#D8DFFA] focus:border-[#194DF5]'
              }`}
            >
              {DIFFICULTIES.map((d) => (
                <option key={d} value={d} className="bg-[#FFFFFF] text-[#010619]">
                  {d}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-[#333333]">Estimated Duration</Label>
            <Input
              value={formState.duration || ''}
              onChange={(e) => onChange({ duration: e.target.value })}
              placeholder="e.g. 6 hours / 4 weeks"
              className="h-10 rounded-xl bg-[#FFFFFF] border-[#D8DFFA] text-xs text-[#010619] focus:border-[#194DF5]"
            />
          </div>
        </div>
      </div>
    </div>
  )
}
