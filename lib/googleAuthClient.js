'use client'

import { createClient } from '@supabase/supabase-js'

export async function startGoogleOAuth() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key || String(key).includes('mock')) {
    throw new Error('Google sign-in is not configured')
  }
  const supabase = createClient(url, key)
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/onboarding/username`,
    },
  })
  if (error) throw error
  if (data?.url) {
    window.location.href = data.url
    return
  }
  throw new Error('Google sign-in is not available')
}
