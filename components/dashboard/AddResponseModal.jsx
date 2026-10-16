'use client'

import { UserPlus, CreditCard, MessageSquare, Image as ImageIcon, FileText } from 'lucide-react'
import { BaseModal } from '@/components/ui/base-modal'
import { SelectableCard, SelectableCardGrid } from '@/components/ui/selectable-card'

export default function AddResponseModal({ isOpen, onClose, onAddResponse }) {
  const responseOptions = [
    {
      id: 'CARD',
      title: 'Card Message',
      description: 'Send a rich card with image, title, description, and action button.',
      icon: CreditCard,
      supported: true,
    },
    {
      id: 'TEXT',
      title: 'Text Message',
      description: 'Send an additional follow-up text message to your recipient.',
      icon: MessageSquare,
      supported: true,
    },
    {
      id: 'IMAGE',
      title: 'Image Message',
      description: 'Send a visual image response in your Instagram DM.',
      icon: ImageIcon,
      supported: true,
    },
    {
      id: 'ASK_FOLLOW',
      title: 'Ask For Follow',
      description: 'Encourage users to follow your Instagram account before receiving resources.',
      icon: UserPlus,
      supported: false,
    },
    {
      id: 'LEAD_FORM',
      title: 'Lead Forms',
      description: 'Request users to enter their email or phone number in Instagram DMs.',
      icon: FileText,
      supported: false,
    },
  ]

  return (
    <BaseModal
      open={isOpen}
      onOpenChange={(next) => { if (!next) onClose?.() }}
      title="Add Response Step"
      description="Choose an additional response block to append to your automation flow."
      secondaryLabel="Cancel"
      onSecondary={onClose}
      hideSecondary={false}
      className="sm:max-w-xl"
    >
      <SelectableCardGrid>
        {responseOptions.map((opt) => {
          const Icon = opt.icon
          return (
            <SelectableCard
              key={opt.id}
              selected={false}
              disabled={!opt.supported}
              onSelect={() => {
                if (!opt.supported) return
                onAddResponse(opt.id)
                onClose()
              }}
              icon={<Icon className="h-5 w-5" />}
              title={opt.supported ? opt.title : `${opt.title} (Coming soon)`}
              description={opt.description}
            />
          )
        })}
      </SelectableCardGrid>
    </BaseModal>
  )
}
