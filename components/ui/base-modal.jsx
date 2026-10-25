'use client'

import { Loader2, X } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { MODAL_ACCENT, modalAccentTextColor } from '@/lib/modalTheme'

export function ModalFooterActions({
  secondaryLabel = 'Cancel',
  onSecondary,
  hideSecondary = false,
  primaryLabel = 'Continue',
  onPrimary,
  primaryType = 'button',
  primaryDisabled = false,
  primaryLoading = false,
  primaryDanger = false,
  className,
}) {
  return (
    <div className={cn('flex items-center justify-between gap-3', className)}>
      {!hideSecondary && (secondaryLabel || onSecondary) ? (
        <button
          type="button"
          onClick={onSecondary}
          className="h-11 px-6 rounded-full bg-[#FFFFFF] border border-[#E8E8E8] text-[#222222] text-sm font-semibold hover:bg-[#F2F2F2] hover:border-[#D0D0CE] transition-colors cursor-pointer disabled:opacity-50"
        >
          {secondaryLabel}
        </button>
      ) : (
        <span />
      )}
      {primaryLabel ? (
        <button
          type={primaryType}
          onClick={onPrimary}
          disabled={primaryDisabled || primaryLoading}
          className={cn(
            'h-11 px-6 rounded-full text-sm font-bold transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2',
            primaryDanger
              ? 'bg-[#DC2626] text-[#FFFFFF] hover:bg-[#B91C1C]'
              : 'bg-[#1F1F1F] text-[#FFFFFF] hover:bg-[#2A2A2A] active:bg-[#111111]'
          )}
        >
          {primaryLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {primaryLabel}
        </button>
      ) : null}
    </div>
  )
}

export function BaseModal({
  open,
  onOpenChange,
  title,
  description,
  children,
  headerLeft,
  headerRight,
  hideClose = false,
  hideFooter = false,
  footer,
  secondaryLabel,
  onSecondary,
  hideSecondary,
  primaryLabel,
  onPrimary,
  primaryType = 'button',
  primaryDisabled = false,
  primaryLoading = false,
  primaryDanger = false,
  className,
  bodyClassName,
}) {
  function handleClose() {
    onOpenChange?.(false)
  }

  const showFooter = !hideFooter && (footer || primaryLabel || secondaryLabel)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        hideClose
        aria-label={typeof title === 'string' ? title : 'Dialog'}
        className={cn(
          'flex flex-col gap-0 w-[calc(100vw-20px)] sm:w-full sm:max-w-[560px] max-h-[calc(100vh-20px)] sm:max-h-[calc(100vh-48px)] p-4 sm:p-6 md:p-8 rounded-[20px] sm:rounded-[24px] bg-[#FFFFFF] border border-[#E8E8E8] text-[#222222] shadow-[0_20px_60px_rgba(0,0,0,0.12)] overflow-hidden',
          className
        )}
      >
        <div className="flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            {headerLeft}
            {title ? (
              <DialogTitle className="text-base sm:text-lg font-bold text-[#222222] truncate">
                {title}
              </DialogTitle>
            ) : (
              <DialogTitle className="sr-only">Dialog</DialogTitle>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {headerRight}
            {!hideClose && (
              <button
                type="button"
                onClick={handleClose}
                className="p-1.5 rounded-full text-[#777777] hover:text-[#222222] hover:bg-[#F2F2F2] transition-colors cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>
        </div>

        {description ? (
          <DialogDescription className="mt-1 text-xs sm:text-sm text-[#777777]">
            {description}
          </DialogDescription>
        ) : null}

        <div className={cn('flex-1 min-h-0 overflow-y-auto no-scrollbar pt-4 sm:pt-6', bodyClassName)}>
          {children}
        </div>

        {showFooter ? (
          <>
            <div className="mt-4 sm:mt-6 h-px w-full bg-[#E8E8E8] shrink-0" />
            <div className="pt-3.5 sm:pt-5 shrink-0">
              {footer || (
                <ModalFooterActions
                  secondaryLabel={secondaryLabel}
                  onSecondary={onSecondary ?? handleClose}
                  hideSecondary={hideSecondary}
                  primaryLabel={primaryLabel}
                  onPrimary={onPrimary}
                  primaryType={primaryType}
                  primaryDisabled={primaryDisabled}
                  primaryLoading={primaryLoading}
                  primaryDanger={primaryDanger}
                />
              )}
            </div>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
