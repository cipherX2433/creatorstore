'use client'

// Tiny client-side fetch helper. Cookies are sent automatically (same-origin).
async function req(method, path, body, isForm = false) {
  const opts = { method, headers: {}, credentials: 'same-origin', cache: 'no-store' }
  if (body !== undefined) {
    if (isForm) opts.body = body
    else { opts.headers['Content-Type'] = 'application/json'; opts.body = JSON.stringify(body) }
  }
  const res = await fetch(`/api${path}`, opts)
  let data = null
  try { data = await res.json() } catch { /* non-json (e.g. downloads) */ }
  if (!res.ok) {
    const err = new Error(data?.message || data?.error || 'Something went wrong. Please try again.')
    err.status = res.status
    err.code = data?.code
    err.data = data
    throw err
  }
  return data
}

export const api = {
  get: (p) => req('GET', p),
  post: (p, b) => req('POST', p, b),
  put: (p, b) => req('PUT', p, b),
  patch: (p, b) => req('PATCH', p, b),
  delete: (p, b) => req('DELETE', p, b),
  del: (p, b) => req('DELETE', p, b),
  upload: (p, formData) => req('POST', p, formData, true),
}

export function formatMoney(amount, currency = 'usd') {
  try {
    return new Intl.NumberFormat('en', { style: 'currency', currency: (currency || 'usd').toUpperCase(), maximumFractionDigits: 2 }).format(Number(amount || 0))
  } catch { return `${amount} ${String(currency).toUpperCase()}` }
}
