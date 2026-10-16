'use client'

import { AnimatePresence, motion } from 'framer-motion'

const ENTER = { duration: 0.18, ease: [0.16, 1, 0.3, 1] }
const EXIT = { duration: 0.08, ease: 'easeOut' }

export default function DashboardPageTransition({ transitionKey, children }) {
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={transitionKey}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, transition: EXIT }}
        transition={ENTER}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  )
}
