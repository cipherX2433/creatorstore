'use client'

import { ArrowLeft, CreditCard, MessageSquare, Image as ImageIcon, UserPlus, FileText, Lock } from 'lucide-react'
import { AddOptionRow, SettingsValuePill } from '@/components/ui/settings-row'
import { ICON_BADGE_COLORS } from '@/components/ui/icon-badge'

const OPTIONS = [
  {
    id: 'CARD',
    title: 'Card Message',
    description: 'Send a rich card with image, title, description, and action button.',
    icon: CreditCard,
    iconColor: ICON_BADGE_COLORS.header,
    supported: true,
  },
  {
    id: 'TEXT',
    title: 'Text Message',
    description: 'Send an additional follow-up text message to your recipient.',
    icon: MessageSquare,
    iconColor: ICON_BADGE_COLORS.text,
    supported: true,
  },
  {
    id: 'IMAGE',
    title: 'Image Message',
    description: 'Send a visual image response in your Instagram DM.',
    icon: ImageIcon,
    iconColor: ICON_BADGE_COLORS.instagram,
    supported: true,
  },
  {
    id: 'ASK_FOLLOW',
    title: 'Ask For Follow',
    description: 'Encourage users to follow your Instagram account before receiving resources.',
    icon: UserPlus,
    iconColor: ICON_BADGE_COLORS.footer,
    supported: false,
  },
  {
    id: 'LEAD_FORM',
    title: 'Lead Forms',
    description: 'Request users to enter their email or phone number in Instagram DMs.',
    icon: FileText,
    iconColor: ICON_BADGE_COLORS.form,
    supported: false,
  },
]

export default function AddResponsePicker({ onBack, onAdd }) {
  return (
    <div className="flex flex-col gap-stack">
      <div className="flex items-center gap-inline">
        <button
          type="button"
          onClick={onBack}
          className="p-2 rounded-control text-content-muted hover:text-content-primary hover:bg-surface-hover"
          aria-label="Back to DM Sequence"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h2 className="text-section text-content-primary">Add Response Step</h2>
          <p className="text-meta text-content-muted">Choose a block to append to your DM sequence.</p>
        </div>
      </div>

      <div className="flex flex-col gap-stack">
        {OPTIONS.map((opt) => (
          <AddOptionRow
            key={opt.id}
            icon={opt.icon}
            iconColor={opt.iconColor}
            title={opt.title}
            description={opt.description}
            disabled={!opt.supported}
            onClick={opt.supported ? () => onAdd(opt.id) : undefined}
            trailing={!opt.supported ? (
              <SettingsValuePill className="flex items-center gap-1">
                <Lock className="h-3.5 w-3.5" /> Soon
              </SettingsValuePill>
            ) : null}
          />
        ))}
      </div>
    </div>
  )
}
