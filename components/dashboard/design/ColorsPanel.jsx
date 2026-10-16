'use client'

import ColorField from './ColorField'

export default function ColorsPanel({ theme, onChange }) {
  const rows = [
    { key: 'background', label: 'Background', fallback: '#000000' },
    { key: 'buttonColor', label: 'Buttons', fallback: '#194DF5' },
    { key: 'buttonShadowColor', label: 'Button shadows', fallback: '#000000' },
    { key: 'buttonTextColor', label: 'Button text', fallback: '#000000' },
    { key: 'textColor', label: 'Page text', fallback: '#FFFFFF' },
    { key: 'titleColor', label: 'Title', fallback: theme.textColor || '#FFFFFF' },
  ]

  return (
    <div className="bg-surface-card border border-edge rounded-card px-4 divide-y divide-edge-subtle">
      {rows.map((row) => (
        <ColorField
          key={row.key}
          label={row.label}
          value={theme[row.key]}
          fallback={row.fallback}
          onChange={(v) => onChange({ [row.key]: v })}
        />
      ))}
    </div>
  )
}
