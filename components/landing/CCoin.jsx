'use client'

import React from 'react'

/**
 * CreatorCoin — Clean, minimal, flat 2D illustrated Electric Blue coin inspired by Gumroad.
 * 
 * Design Characteristics:
 * - Coin Body: Electric Blue #194DF5 (solid, no gradients)
 * - Outline & Details: #0D0D0D (clean black outlines & inner contour rim)
 * - Lettermark: Centered uppercase "C" in solid #0D0D0D (bold, highly legible)
 * - Flat 2D vector geometry with visible cylindrical thickness rim
 * - Zero 3D lighting, zero metallic shine, zero glow, zero shadows
 */
export function CreatorCoin({
  size = 120,
  rotation = -28,
  color = 'var(--color-primary-hex, #194DF5)',
  floatDuration = '6s',
  floatDelay = '0s',
  floatDistance = '10px',
  className = '',
  style = {},
}) {
  return (
    <div
      className={`floating-creator-coin select-none pointer-events-none inline-block ${className}`}
      style={{
        width: size,
        height: size,
        ...style,
      }}
      aria-hidden="true"
    >
      <div
        className="coin-motion-wrapper w-full h-full"
        style={{
          transform: `rotate(${rotation}deg)`,
          animationDuration: floatDuration,
          animationDelay: floatDelay,
          '--float-dist': floatDistance,
          '--base-rotate': `${rotation}deg`,
        }}
      >
        <svg
          viewBox="0 0 200 200"
          width="100%"
          height="100%"
          className="w-full h-full block"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* 1. Coin Extruded Rim (Bottom / Side Thickness) */}
          <path
            d="M 22 88 L 22 112 A 78 48 0 0 0 178 112 L 178 88 A 78 48 0 0 1 22 88 Z"
            fill={color}
            stroke="#0D0D0D"
            strokeWidth="5"
            strokeLinejoin="round"
          />

          {/* 2. Coin Front Face Ellipse */}
          <ellipse
            cx="100"
            cy="88"
            rx="78"
            ry="48"
            fill={color}
            stroke="#0D0D0D"
            strokeWidth="5"
          />

          {/* 3. Inner Concentric Contour / Rim Detail */}
          <ellipse
            cx="100"
            cy="88"
            rx="64"
            ry="36"
            fill="none"
            stroke="#0D0D0D"
            strokeWidth="3.5"
          />

          {/* 4. Bold Centered Black "C" Symbol */}
          <g transform="translate(100, 88) scale(1, 0.62) translate(-100, -88)">
            <text
              x="100"
              y="114"
              textAnchor="middle"
              fontFamily="Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
              fontWeight="900"
              fontSize="78"
              fill="#0D0D0D"
              letterSpacing="-0.04em"
            >
              C
            </text>
          </g>
        </svg>
      </div>

      <style jsx>{`
        .coin-motion-wrapper {
          animation: gumroadCoinFloat ease-in-out infinite alternate;
          will-change: transform;
        }

        @keyframes gumroadCoinFloat {
          0% {
            transform: translateY(0px) rotate(var(--base-rotate, -28deg));
          }
          100% {
            transform: translateY(calc(-1 * var(--float-dist, 10px))) rotate(calc(var(--base-rotate, -28deg) + 2deg));
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .coin-motion-wrapper {
            animation: none !important;
            transform: rotate(var(--base-rotate, -28deg)) !important;
          }
        }
      `}</style>
    </div>
  )
}

// Named aliases
export { CreatorCoin as CCoin, CreatorCoin as FloatingCoin }
