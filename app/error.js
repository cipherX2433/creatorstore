'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'

export default function Error({ error, reset }) {
  useEffect(() => {
    console.error('Unhandled app error:', error)
  }, [error])

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-black text-white p-6 text-center space-y-4 font-sans">
      <div className="h-16 w-16 rounded-2xl bg-[#12141c] border border-white/10 flex items-center justify-center text-rose-400 font-black text-2xl shadow-xl">
        ⚠️
      </div>
      <h1 className="text-3xl sm:text-4xl font-extrabold text-white">Something went wrong</h1>
      <p className="text-[rgba(244,242,236,0.68)] max-w-md text-sm font-medium">An unexpected error occurred. Please try again.</p>
      <button
        onClick={() => reset()}
        className="font-extrabold bg-primary hover:bg-white text-black border-2 border-black shadow-[3px_3px_0px_0px_#CBE957] rounded-2xl h-12 px-6 transition-all duration-200 active:translate-x-[1px] active:translate-y-[1px]"
      >
        Try Again
      </button>
    </div>
  )
}
