'use client'

import { useEffect } from 'react'
import { STOREFRONT_FONTS, ensureGoogleFonts } from '@/lib/storefrontFonts'
import { BaseModal } from '@/components/ui/base-modal'
import { SelectableCard, SelectableCardGrid } from '@/components/ui/selectable-card'

export default function FontPickerModal({ open, title, value, onSelect, onClose, onUpgrade }) {
  useEffect(() => {
    if (open) ensureGoogleFonts(STOREFRONT_FONTS.map((f) => f.id))
  }, [open])

  return (
    <BaseModal
      open={open}
      onOpenChange={(next) => { if (!next) onClose?.() }}
      title={title || 'Choose a font'}
      hideFooter
    >
      <SelectableCardGrid>
        {STOREFRONT_FONTS.map((font) => (
          <SelectableCard
            key={font.id}
            selected={value === font.id}
            onSelect={() => {
              if (font.pro && value !== font.id) onUpgrade?.()
              onSelect(font.id)
              onClose()
            }}
            title={font.id}
            description={font.pro ? 'Pro font' : 'Included'}
            className="min-h-[88px]"
          />
        ))}
      </SelectableCardGrid>
    </BaseModal>
  )
}
