'use client'

import { cn } from '@/lib/utils'

const fieldClass =
  'w-full bg-[#FFFFFF] border border-[#E5E4E2] rounded-xl px-4 py-2.5 text-sm text-[#010619] placeholder:text-[#6B7399] outline-none transition-all hover:border-[#D5D4D2] focus:border-[#194DF5] focus:ring-2 focus:ring-[#194DF5]/15 disabled:cursor-not-allowed disabled:bg-[#F2F1EF] disabled:text-[#6B7399] disabled:opacity-60'

export function TextInput({
  label,
  hint,
  error,
  as = 'input',
  className,
  id,
  ...props
}) {
  const Comp = as === 'textarea' ? 'textarea' : 'input'
  const inputId = id || props.name

  return (
    <div className="flex flex-col gap-1.5 w-full">
      {label ? (
        <label htmlFor={inputId} className="text-xs font-semibold text-[#010619]">
          {label}
        </label>
      ) : null}
      <Comp
        id={inputId}
        className={cn(
          fieldClass,
          error && 'border-[#EF4444] focus:border-[#EF4444] focus:ring-[#EF4444]/15',
          as === 'textarea' && 'resize-none min-h-[88px]',
          className
        )}
        {...props}
      />
      {error ? <p className="text-xs font-medium text-[#EF4444]">{error}</p> : null}
      {hint && !error ? <p className="text-xs text-[#3A4060]">{hint}</p> : null}
    </div>
  )
}

export const textInputClassName = fieldClass
