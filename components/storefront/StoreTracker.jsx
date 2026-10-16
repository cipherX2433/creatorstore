'use client'

import { useEffect, useRef } from 'react'

export default function StoreTracker({ creatorId, productId = null, type }) {
  const done = useRef(false)
  useEffect(() => {
    if (done.current || !creatorId) return
    done.current = true
    fetch('/api/track', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ creatorId, productId, type }),
    }).catch(() => {})
  }, [creatorId, productId, type])
  return null
}
