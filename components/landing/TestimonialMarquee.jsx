'use client'

import { useRef } from 'react'
import { motion, useScroll, useVelocity, useSpring, useTransform } from 'framer-motion'
import TestimonialCard from './TestimonialCard'

export default function TestimonialMarquee({ row1 = [], row2 = [] }) {
  const containerRef = useRef(null)

  const { scrollY } = useScroll()
  const scrollVelocity = useVelocity(scrollY)
  const smoothVelocity = useSpring(scrollVelocity, {
    damping: 50,
    stiffness: 400,
  })

  const velocityOffset1 = useTransform(smoothVelocity, [-1000, 0, 1000], [-35, 0, 35])
  const velocityOffset2 = useTransform(smoothVelocity, [-1000, 0, 1000], [35, 0, -35])

  const row1Items = [...row1, ...row1, ...row1]
  const row2Items = [...row2, ...row2, ...row2]

  return (
    <div
      ref={containerRef}
      className="relative w-full overflow-hidden group-marquee py-2 select-none"
    >
      {/* Edge gradient masks for seamless fade out at the viewport boundaries (white) */}
      <div
        className="pointer-events-none absolute inset-y-0 left-0 w-12 sm:w-28 lg:w-40 bg-gradient-to-r from-white via-white/80 to-transparent z-20"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute inset-y-0 right-0 w-12 sm:w-28 lg:w-40 bg-gradient-to-l from-white via-white/80 to-transparent z-20"
        aria-hidden="true"
      />

      <div className="flex flex-col gap-4 sm:gap-6">
        {/* ROW 1: RIGHT → LEFT */}
        <div className="flex w-full overflow-hidden">
          <motion.div
            style={{ x: velocityOffset1 }}
            className="animate-marquee-left flex items-center gap-4 sm:gap-6"
          >
            {row1Items.map((item, idx) => (
              <TestimonialCard 
                key={`row1-${item.id || item.name}-${idx}`} 
                item={item} 
                index={idx} 
              />
            ))}
          </motion.div>
        </div>

        {/* ROW 2: LEFT → RIGHT */}
        <div className="flex w-full overflow-hidden">
          <motion.div
            style={{ x: velocityOffset2 }}
            className="animate-marquee-right flex items-center gap-4 sm:gap-6"
          >
            {row2Items.map((item, idx) => (
              <TestimonialCard 
                key={`row2-${item.id || item.name}-${idx}`} 
                item={item} 
                index={idx + 2} 
              />
            ))}
          </motion.div>
        </div>
      </div>
    </div>
  )
}
