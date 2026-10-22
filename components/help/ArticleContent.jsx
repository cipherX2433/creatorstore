'use client'

import { Info, Lightbulb, CheckCircle2 } from 'lucide-react'

export default function ArticleContent({ content = '' }) {
  if (!content) return null

  // Parse lines into structured blocks
  const lines = content.trim().split('\n')
  const blocks = []
  let currentList = null
  let currentBlockquote = null

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i]
    const trimmed = rawLine.trim()

    if (!trimmed) {
      if (currentList) {
        blocks.push(currentList)
        currentList = null
      }
      if (currentBlockquote) {
        blocks.push(currentBlockquote)
        currentBlockquote = null
      }
      continue
    }

    // Callout / Blockquote
    if (trimmed.startsWith('>')) {
      const text = trimmed.replace(/^>\s*/, '')
      if (currentList) {
        blocks.push(currentList)
        currentList = null
      }
      if (!currentBlockquote) {
        currentBlockquote = { type: 'blockquote', lines: [text] }
      } else {
        currentBlockquote.lines.push(text)
      }
      continue
    } else if (currentBlockquote) {
      blocks.push(currentBlockquote)
      currentBlockquote = null
    }

    // Headings (###)
    if (trimmed.startsWith('###')) {
      if (currentList) {
        blocks.push(currentList)
        currentList = null
      }
      blocks.push({
        type: 'heading',
        text: trimmed.replace(/^###\s*/, ''),
      })
      continue
    }

    // Numbered List (e.g. 1. or 2.)
    const numberedMatch = trimmed.match(/^(\d+)\.\s+(.*)$/)
    if (numberedMatch) {
      const number = numberedMatch[1]
      const text = numberedMatch[2]
      if (!currentList || currentList.type !== 'numbered') {
        if (currentList) blocks.push(currentList)
        currentList = { type: 'numbered', items: [] }
      }
      currentList.items.push({ number, text })
      continue
    }

    // Bullet List (e.g. - or *)
    const bulletMatch = trimmed.match(/^[-*]\s+(.*)$/)
    if (bulletMatch) {
      const text = bulletMatch[1]
      if (currentList && currentList.type === 'numbered') {
        // Nested bullet inside numbered item
        const lastItem = currentList.items[currentList.items.length - 1]
        if (lastItem) {
          if (!lastItem.subItems) lastItem.subItems = []
          lastItem.subItems.push(text)
          continue
        }
      }
      if (!currentList || currentList.type !== 'bullet') {
        if (currentList) blocks.push(currentList)
        currentList = { type: 'bullet', items: [] }
      }
      currentList.items.push({ text })
      continue
    }

    // Normal paragraph
    if (currentList) {
      blocks.push(currentList)
      currentList = null
    }
    blocks.push({
      type: 'paragraph',
      text: trimmed,
    })
  }

  if (currentList) blocks.push(currentList)
  if (currentBlockquote) blocks.push(currentBlockquote)

  // Helper to format inline markdown (bold, code, links)
  const formatInline = (text) => {
    // Split by tokens: code `...`, bold **...**
    const parts = []
    let remaining = text

    // Regex for bold **...** or inline code `...`
    const regex = /(\*\*.*?\*\*|`.*?`)/g
    let match
    let lastIndex = 0

    while ((match = regex.exec(remaining)) !== null) {
      if (match.index > lastIndex) {
        parts.push(remaining.substring(lastIndex, match.index))
      }
      const token = match[0]
      if (token.startsWith('**') && token.endsWith('**')) {
        parts.push(
          <strong key={match.index} className="font-bold text-[#202432]">
            {token.slice(2, -2)}
          </strong>
        )
      } else if (token.startsWith('`') && token.endsWith('`')) {
        parts.push(
          <code
            key={match.index}
            className="px-1.5 py-0.5 rounded bg-[#E2E3DD]/60 text-[#202432] font-mono text-[13px] font-medium"
          >
            {token.slice(1, -1)}
          </code>
        )
      }
      lastIndex = regex.lastIndex
    }

    if (lastIndex < remaining.length) {
      parts.push(remaining.substring(lastIndex))
    }

    return parts.length > 0 ? parts : text
  }

  return (
    <div className="article-body space-y-6 text-[#202432] text-base sm:text-lg leading-relaxed font-normal">
      {blocks.map((block, idx) => {
        if (block.type === 'heading') {
          return (
            <h2
              key={idx}
              className="text-2xl sm:text-3xl font-black text-[#202432] tracking-tight pt-4 pb-1 border-b border-[#E2E3DD]/60"
              style={{ fontFamily: "'Plus Jakarta Sans', var(--font-brand), sans-serif" }}
            >
              {block.text}
            </h2>
          )
        }

        if (block.type === 'paragraph') {
          return (
            <p key={idx} className="text-[#202432] leading-relaxed">
              {formatInline(block.text)}
            </p>
          )
        }

        if (block.type === 'numbered') {
          return (
            <ol key={idx} className="space-y-4 my-4">
              {block.items.map((item, itemIdx) => (
                <li key={itemIdx} className="flex items-start gap-3 sm:gap-4">
                  <span className="w-7 h-7 rounded-full bg-[#202432] text-white text-xs sm:text-sm font-bold flex items-center justify-center shrink-0 mt-0.5 select-none shadow-sm">
                    {item.number}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-[#202432] leading-relaxed">
                      {formatInline(item.text)}
                    </div>
                    {item.subItems && item.subItems.length > 0 && (
                      <ul className="mt-2.5 space-y-2 pl-2 border-l-2 border-[#E2E3DD]">
                        {item.subItems.map((sub, sIdx) => (
                          <li key={sIdx} className="text-sm sm:text-base text-[#777A83] flex items-start gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#5B347C] shrink-0 mt-2" />
                            <span>{formatInline(sub)}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          )
        }

        if (block.type === 'bullet') {
          return (
            <ul key={idx} className="space-y-2.5 my-4 pl-2">
              {block.items.map((item, itemIdx) => (
                <li key={itemIdx} className="flex items-start gap-3 text-[#202432]">
                  <span className="w-2 h-2 rounded-full bg-[#5B347C] shrink-0 mt-2.5" />
                  <span className="flex-1 leading-relaxed">{formatInline(item.text)}</span>
                </li>
              ))}
            </ul>
          )
        }

        if (block.type === 'blockquote') {
          const fullText = block.lines.join(' ')
          const isTip = fullText.toLowerCase().includes('tip:')
          return (
            <div
              key={idx}
              className={`rounded-2xl p-5 sm:p-6 my-6 border flex items-start gap-4 ${
                isTip
                  ? 'bg-[#EBC1EB]/20 border-[#EBC1EB] text-[#202432]'
                  : 'bg-[#F3F3F0] border-[#E2E3DD] text-[#202432]'
              }`}
            >
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                  isTip ? 'bg-[#5B347C] text-white' : 'bg-[#202432] text-white'
                }`}
              >
                {isTip ? <Lightbulb className="w-5 h-5" /> : <Info className="w-5 h-5" />}
              </div>
              <div className="flex-1 text-sm sm:text-base leading-relaxed">
                {formatInline(fullText)}
              </div>
            </div>
          )
        }

        return null
      })}
    </div>
  )
}
