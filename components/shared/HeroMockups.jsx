'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, useMotionValue, useSpring, useTransform, useReducedMotion } from 'framer-motion'
import {
  Lock,
  Instagram,
  Youtube,
  Sparkles,
  ShieldCheck,
  Check,
  Flame,
  Camera,
  Utensils,
} from 'lucide-react'

/* --------------------------------------------------------------------------
   REAL CREATOR DATA — AUTHENTIC PROFILES & PRODUCTS
   -------------------------------------------------------------------------- */
const CREATORS = [
  {
    id: 'fitness',
    name: 'Alex Rivera',
    handle: 'alexfit',
    niche: 'Fitness Coach',
    icon: Flame,
    roleTitle: 'Fitness Coach • Online Trainer',
    bio: 'Helping busy people build strength without spending 2 hours in the gym.',
    avatar: '/assets/creators/alex.jpg?v=2',
    avatarFallback: 'https://images.unsplash.com/photo-1548690312-e3b507d8c110?w=500&q=85&auto=format&fit=crop&crop=faces',
    accentColor: 'var(--color-primary-hex, #194DF5)',
    accentClass: 'text-brand',
    badgeBg: 'bg-brand/10 border-brand/30 text-brand',
    buttonBg: 'bg-brand text-black hover:bg-brand/90',
    themeGlow: 'rgba(255, 144, 232, 0.14)',
    stats: '12.4k community members',
    socials: [
      { name: 'Instagram', icon: Instagram, count: '84k' },
      { name: 'YouTube', icon: Youtube, count: '42k' },
      { name: 'TikTok', icon: Sparkles, count: '110k' },
    ],
    products: [
      {
        id: 'p-alex-1',
        title: '12-Week Transformation Program',
        subtitle: 'Video modules, workout logs & form guides',
        price: '$49',
        type: 'Digital Guide + Video',
        image: '/assets/products/fitness-12week.jpg',
        imageFallback: 'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=500&q=85&auto=format&fit=crop',
        featured: true,
        tag: 'Bestseller',
      },
      {
        id: 'p-alex-2',
        title: 'Beginner Dumbbell Strength Guide',
        subtitle: 'Structured 3-day home workout split',
        price: '$19',
        type: 'Instant PDF Guide',
        image: '/assets/products/fitness-guide.jpg',
        imageFallback: 'https://images.unsplash.com/photo-1584735935682-2f2b69dff9d2?w=500&q=85&auto=format&fit=crop',
      },
      {
        id: 'p-alex-3',
        title: 'High-Protein Meal Prep Plan',
        subtitle: '30 quick recipes with macro breakdowns',
        price: 'FREE',
        type: 'Free Starter Guide',
        image: '/assets/products/fitness-meal.jpg',
        imageFallback: 'https://images.unsplash.com/photo-1547496502-affa22d38842?w=500&q=85&auto=format&fit=crop',
        isFree: true,
      },
    ],
    recentSale: {
      customer: 'Marcus T.',
      product: '12-Week Program',
      amount: '$49',
      time: '2m ago',
    },
  },
  {
    id: 'photography',
    name: 'Sam Miller',
    handle: 'samshoots',
    niche: 'Photographer',
    icon: Camera,
    roleTitle: 'Photographer • Educator',
    bio: 'Helping creators take better photos with natural light and intentional framing.',
    avatar: '/assets/creators/sam.jpg?v=2',
    avatarFallback: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=500&q=85&auto=format&fit=crop&crop=faces',
    accentColor: '#38BDF8',
    accentClass: 'text-sky-400',
    badgeBg: 'bg-sky-400/10 border-sky-400/30 text-sky-400',
    buttonBg: 'bg-sky-400 text-black hover:bg-sky-300',
    themeGlow: 'rgba(56, 189, 248, 0.12)',
    stats: 'Over 8,000 preset downloads',
    socials: [
      { name: 'Instagram', icon: Instagram, count: '128k' },
      { name: 'YouTube', icon: Youtube, count: '65k' },
      { name: 'TikTok', icon: Sparkles, count: '92k' },
    ],
    products: [
      {
        id: 'p-sam-1',
        title: 'Moody Film Lightroom Presets',
        subtitle: '16 Desktop & Mobile DNG presets',
        price: '$15',
        type: 'Lightroom Pack',
        image: '/assets/products/photo-presets.jpg',
        imageFallback: 'https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?w=500&q=85&auto=format&fit=crop',
        featured: true,
        tag: 'Popular',
      },
      {
        id: 'p-sam-2',
        title: 'Portrait Photography Toolkit',
        subtitle: 'Production templates & editing guides',
        price: '$79',
        type: 'Digital Toolkit',
        image: '/assets/products/photo-masterclass.jpg',
        imageFallback: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=500&q=85&auto=format&fit=crop',
      },
      {
        id: 'p-sam-3',
        title: 'Creator Camera & Lens Field Guide',
        subtitle: 'Gear checklist for beginner to pro',
        price: 'FREE',
        type: 'Free PDF Guide',
        image: '/assets/products/photo-gear.jpg',
        imageFallback: 'https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=500&q=85&auto=format&fit=crop',
        isFree: true,
      },
    ],
    recentSale: {
      customer: 'Elena R.',
      product: 'Moody Film Presets',
      amount: '$15',
      time: 'Just now',
    },
  },
  {
    id: 'food',
    name: 'Mia Chen',
    handle: 'cookwithmia',
    niche: 'Recipe Creator',
    icon: Utensils,
    roleTitle: 'Recipe Creator • Food Writer',
    bio: 'Easy, wholesome recipes for busy people. Wholesome meals from scratch.',
    avatar: '/assets/creators/mia.jpg?v=2',
    avatarFallback: 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?w=500&q=85&auto=format&fit=crop&crop=faces',
    accentColor: '#F59E0B',
    accentClass: 'text-amber-400',
    badgeBg: 'bg-amber-400/10 border-amber-400/30 text-amber-400',
    buttonBg: 'bg-amber-400 text-black hover:bg-amber-300',
    themeGlow: 'rgba(245, 158, 11, 0.12)',
    stats: 'Over 250,000 cooks inspired',
    socials: [
      { name: 'Instagram', icon: Instagram, count: '190k' },
      { name: 'YouTube', icon: Youtube, count: '88k' },
      { name: 'TikTok', icon: Sparkles, count: '340k' },
    ],
    products: [
      {
        id: 'p-mia-1',
        title: '50 Easy 20-Minute Weeknight Dinners',
        subtitle: 'Digital cookbook with grocery checklists',
        price: '$12',
        type: 'Digital Cookbook',
        image: '/assets/products/food-recipes.jpg',
        imageFallback: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&q=85&auto=format&fit=crop',
        featured: true,
        tag: 'Best Value',
      },
      {
        id: 'p-mia-2',
        title: 'Sunday Meal Prep Blueprint',
        subtitle: 'Cook once, eat clean all week long',
        price: '$9',
        type: 'Step-by-Step Planner',
        image: '/assets/products/food-mealprep.jpg',
        imageFallback: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=500&q=85&auto=format&fit=crop',
      },
      {
        id: 'p-mia-3',
        title: 'Artisan Sourdough for Beginners',
        subtitle: '4-ingredient beginner loaf guide',
        price: 'FREE',
        type: 'Free Starter Guide',
        image: '/assets/products/food-sourdough.jpg',
        imageFallback: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=500&q=85&auto=format&fit=crop',
        isFree: true,
      },
    ],
    recentSale: {
      customer: 'Sarah K.',
      product: '50 Easy Dinners',
      amount: '$12',
      time: '4m ago',
    },
  },
  {
    id: 'artist',
    name: 'Elena Rostova',
    handle: 'elenadraws',
    niche: 'Digital Artist',
    icon: Sparkles,
    roleTitle: 'Digital Illustrator • Procreate Creator',
    bio: 'Custom digital brushes, texture packs, and painting masterclasses for iPad artists.',
    avatar: '/assets/creators/elena.jpg',
    avatarFallback: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&q=85&auto=format&fit=crop&crop=faces',
    accentColor: 'var(--color-primary-hex, #194DF5)',
    accentClass: 'text-primary',
    badgeBg: 'bg-primary/10 border-primary/30 text-primary',
    buttonBg: 'bg-primary text-black hover:bg-primary/90',
    themeGlow: 'rgba(25, 77, 245, 0.14)',
    stats: '15,000+ brush packs downloaded',
    socials: [
      { name: 'Instagram', icon: Instagram, count: '142k' },
      { name: 'YouTube', icon: Youtube, count: '56k' },
      { name: 'TikTok', icon: Sparkles, count: '210k' },
    ],
    products: [
      {
        id: 'p-elena-1',
        title: 'Master Oil & Gouache Procreate Brush Set',
        subtitle: '45 handcrafted texture brushes & canvases',
        price: '$24',
        type: 'Procreate Brush Pack',
        image: '/assets/products/art-brushes.jpg',
        imageFallback: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=500&q=85&auto=format&fit=crop',
        featured: true,
        tag: 'Bestseller',
      },
      {
        id: 'p-elena-2',
        title: 'Color Palette & Lighting Handbook',
        subtitle: 'Practical color theory for digital artists',
        price: '$14',
        type: 'Digital PDF Handbook',
        image: '/assets/products/art-guide.jpg',
        imageFallback: 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=500&q=85&auto=format&fit=crop',
      },
      {
        id: 'p-elena-3',
        title: 'Free Line Art & Inking Starter Kit',
        subtitle: '5 essential inking pens for Procreate',
        price: 'FREE',
        type: 'Free Starter Pack',
        image: '/assets/products/art-free.jpg',
        imageFallback: 'https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=500&q=85&auto=format&fit=crop',
        isFree: true,
      },
    ],
    recentSale: {
      customer: 'Chloe M.',
      product: 'Master Gouache Brushes',
      amount: '$24',
      time: '1m ago',
    },
  },
  {
    id: 'coach',
    name: 'Jordan Hayes',
    handle: 'jordancoaches',
    niche: 'Creator Coach',
    icon: Flame,
    roleTitle: 'Creator Business Coach • Strategist',
    bio: 'Helping full-time creators monetize their audience and build $10k/mo digital product businesses.',
    avatar: '/assets/creators/jordan.jpg',
    avatarFallback: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=500&q=85&auto=format&fit=crop&crop=faces',
    accentColor: '#CBE957',
    accentClass: 'text-[#CBE957]',
    badgeBg: 'bg-[#CBE957]/10 border-[#CBE957]/30 text-[#CBE957]',
    buttonBg: 'bg-[#CBE957] text-black hover:bg-[#CBE957]/90',
    themeGlow: 'rgba(203, 233, 87, 0.14)',
    stats: 'Over 400 creators coached',
    socials: [
      { name: 'Instagram', icon: Instagram, count: '98k' },
      { name: 'YouTube', icon: Youtube, count: '45k' },
      { name: 'TikTok', icon: Sparkles, count: '130k' },
    ],
    products: [
      {
        id: 'p-jordan-1',
        title: 'The Creator Monetization Playbook',
        subtitle: 'Complete step-by-step digital product launch system',
        price: '$39',
        type: 'Comprehensive Guide',
        image: '/assets/products/coach-playbook.jpg',
        imageFallback: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=500&q=85&auto=format&fit=crop',
        featured: true,
        tag: 'Featured',
      },
      {
        id: 'p-jordan-2',
        title: 'High-Converting Notion Sales Funnel Template',
        subtitle: 'Copy-paste launch dashboard & email swipe copy',
        price: '$19',
        type: 'Notion Template',
        image: '/assets/products/coach-template.jpg',
        imageFallback: 'https://images.unsplash.com/photo-1484480974693-6ca0a78fb36b?w=500&q=85&auto=format&fit=crop',
      },
      {
        id: 'p-jordan-3',
        title: 'Free 7-Day Audience Growth Roadmap',
        subtitle: 'Actionable daily roadmap for organic growth',
        price: 'FREE',
        type: 'Free Roadmap Guide',
        image: '/assets/products/coach-roadmap.jpg',
        imageFallback: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=500&q=85&auto=format&fit=crop',
        isFree: true,
      },
    ],
    recentSale: {
      customer: 'David W.',
      product: 'Monetization Playbook',
      amount: '$39',
      time: '3m ago',
    },
  },
]

/* --------------------------------------------------------------------------
   REAL STOREFRONT CARD COMPONENT
   -------------------------------------------------------------------------- */
function StorefrontCard({ creator, isHero = false }) {
  return (
    <div className="w-[315px] sm:w-[340px] h-[530px] sm:h-[550px] rounded-[32px] bg-[#12141c] border border-white/12 shadow-[0_20px_50px_-10px_rgba(0,0,0,0.85)] flex flex-col overflow-hidden relative select-none">
      {/* Top Phone Frame Accents */}
      <div className="pt-2.5 pb-2 px-4 shrink-0 flex items-center justify-between border-b border-white/10 bg-[#0a0c10]">
        {/* URL Pill */}
        <div className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1 rounded-full bg-[#000000] border border-white/10 text-[11px] font-mono text-[#F4F2EC]/68 truncate">
          <Lock className="h-3 w-3 text-[#CBE957] shrink-0" />
          <span className="truncate">creatorstore.store/{creator.handle}</span>
        </div>
      </div>

      {/* Storefront Content Scroll Area */}
      <div className="flex-1 px-4 py-3.5 flex flex-col justify-between overflow-hidden">
        {/* Creator Profile Header */}
        <div className="text-center space-y-2">
          {/* Avatar Photo */}
          <div className="relative inline-block mx-auto">
            <div className="h-16 w-16 sm:h-[70px] sm:w-[70px] rounded-full overflow-hidden p-0.5 border-2 border-white/20 bg-[#000000] shadow-md">
              <img
                src={creator.avatar}
                alt={creator.name}
                onError={(e) => {
                  e.currentTarget.src = creator.avatarFallback
                }}
                className="h-full w-full object-cover rounded-full"
              />
            </div>
            <div className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-[#CBE957] border-2 border-[#12141c] flex items-center justify-center">
              <Check className="h-3 w-3 text-[#000000] stroke-[3]" />
            </div>
          </div>

          {/* Name & Handle */}
          <div className="space-y-0.5">
            <div className="flex items-center justify-center gap-1.5">
              <h3 className="text-sm sm:text-base font-black text-white tracking-tight">
                {creator.name}
              </h3>
            </div>
            <p className="text-[11px] font-semibold text-zinc-400">
              @{creator.handle} • {creator.roleTitle}
            </p>
          </div>

          {/* Authentic Bio */}
          <p className="text-[11px] text-zinc-300 leading-relaxed max-w-[270px] mx-auto line-clamp-2">
            {creator.bio}
          </p>

          {/* Social Links Row */}
          <div className="flex items-center justify-center gap-2 pt-0.5">
            {creator.socials.map((social) => {
              const Icon = social.icon
              return (
                <div
                  key={social.name}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-[10px] text-zinc-300"
                >
                  <Icon className="h-3 w-3 text-zinc-400" />
                  <span className="font-semibold">{social.count}</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Real Products List */}
        <div className="space-y-2 my-auto pt-1">
          {creator.products.map((prod) => (
            <div
              key={prod.id}
              className={`p-2 rounded-xl bg-[#1E232B] border transition-all flex items-center gap-2.5 ${prod.featured
                ? 'border-white/20 shadow-sm'
                : 'border-white/8 hover:border-white/16'
                }`}
            >
              {/* Product Real Image Thumbnail */}
              <div className="h-11 w-11 sm:h-12 sm:w-12 rounded-lg overflow-hidden shrink-0 bg-[#15191F] border border-white/8 relative">
                <img
                  src={prod.image}
                  alt={prod.title}
                  onError={(e) => {
                    e.currentTarget.src = prod.imageFallback
                  }}
                  className="h-full w-full object-cover"
                />
              </div>

              {/* Product Info */}
              <div className="flex-1 min-w-0 pr-1 text-left">
                <div className="flex items-center gap-1.5">
                  <p className="text-xs font-bold text-[#F4F2EC] truncate leading-snug">
                    {prod.title}
                  </p>
                  {prod.tag && (
                    <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-primary/15 text-primary border border-primary/30 shrink-0">
                      {prod.tag}
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-[#F4F2EC]/68 truncate mt-0.5">
                  {prod.subtitle}
                </p>
              </div>

              {/* Price Tag */}
              <div className="shrink-0 text-right">
                <span
                  className={`inline-block px-2.5 py-1 rounded-lg text-xs font-bold tracking-tight ${prod.isFree
                    ? 'bg-[#CBE957]/20 text-[#CBE957] border border-[#CBE957]/30'
                    : 'bg-primary text-[#000000] shadow-sm'
                    }`}
                >
                  {prod.price}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Storefront Footer CTA */}
        <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[11px]">
          <span className="text-[#F4F2EC]/50 text-[10px] flex items-center gap-1 font-medium">
            <ShieldCheck className="h-3 w-3 text-[#CBE957]" /> Instant digital delivery
          </span>
          <span className="font-bold text-[#F4F2EC]/68 text-[10px]">
            Powered by <span className="text-[#F4F2EC]">CreatorStore</span>
          </span>
        </div>
      </div>
    </div>
  )
}

/* --------------------------------------------------------------------------
   SHARED 3D HERO SHOWCASE: REAL CREATOR ROTATING STACK
   -------------------------------------------------------------------------- */
export default function HeroMockups({ className = '' }) {
  const containerRef = useRef(null)
  const shouldReduceMotion = useReducedMotion()
  const [activeIndex, setActiveIndex] = useState(0)
  const [isHovered, setIsHovered] = useState(false)

  // Mouse Parallax Motion Values
  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)

  const springConfig = { damping: 25, stiffness: 160 }
  const rotateX = useSpring(useTransform(mouseY, [-0.5, 0.5], [5, -5]), springConfig)
  const rotateY = useSpring(useTransform(mouseX, [-0.5, 0.5], [-7, 7]), springConfig)

  // Auto-cycle through creators smoothly every 6.5 seconds (paused when user hovers)
  useEffect(() => {
    if (shouldReduceMotion || isHovered) return
    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % CREATORS.length)
    }, 6500)
    return () => clearInterval(interval)
  }, [shouldReduceMotion, isHovered])

  function handleMouseMove(e) {
    if (shouldReduceMotion || !containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const xPct = (e.clientX - rect.left) / rect.width - 0.5
    const yPct = (e.clientY - rect.top) / rect.height - 0.5
    mouseX.set(xPct)
    mouseY.set(yPct)
  }

  function handleMouseLeave() {
    mouseX.set(0)
    mouseY.set(0)
    setIsHovered(false)
  }

  const activeCreator = CREATORS[activeIndex]

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={handleMouseLeave}
      className={`relative w-full flex flex-col items-center justify-center select-none overflow-hidden py-2 ${className}`}
      style={{ perspective: 1200 }}
    >
      {/* Background Soft Natural Ambient Glow */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden transition-colors duration-1000">
        <div
          className="absolute top-1/4 left-1/3 w-[360px] sm:w-[460px] h-[360px] sm:h-[460px] rounded-full blur-[130px] pointer-events-none transition-all duration-700 opacity-60"
          style={{ background: activeCreator.themeGlow }}
        />
        <div className="absolute bottom-1/4 right-1/4 w-[280px] sm:w-[340px] h-[280px] sm:h-[340px] rounded-full bg-primary/10 blur-[120px] pointer-events-none" />
      </div>

      {/* Subtle Live Order Pill & Floating Badge Chip */}
      <div className="mb-3 sm:mb-4 z-40 flex items-center gap-2 sm:gap-2.5 flex-wrap justify-center">
        <motion.div
          key={activeCreator.recentSale.customer + activeCreator.id}
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="inline-flex items-center gap-1.5 sm:gap-2 px-3 py-1 sm:py-1.5 rounded-full bg-[#1A1A1A] border border-[#2E2E2E] text-[10px] sm:text-[11px] text-[#F5F5F5] shadow-xl"
        >
          <span className="h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full bg-[#CBE957] animate-pulse shrink-0" />
          <span className="font-bold text-[#F4F2EC]">{activeCreator.recentSale.customer}</span>
          <span className="text-[#F4F2EC]/68">purchased {activeCreator.recentSale.product}</span>
          <span className="font-mono font-bold text-[#CBE957]">{activeCreator.recentSale.amount}</span>
        </motion.div>

        {/* Floating Brand Badge Pill */}
        <div className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-white/10 bg-[#CBE957] text-[#000000] font-bold text-[10px] shadow-sm">
          <span>⚡ Live Store</span>
        </div>
      </div>

      {/* 3D Stack Stage */}
      <motion.div
        className="relative flex items-center justify-center w-full max-w-[650px] h-[510px] sm:h-[570px] scale-[0.84] xs:scale-[0.90] sm:scale-100 origin-center"
        style={{
          transformStyle: 'preserve-3d',
          rotateX: shouldReduceMotion ? 0 : rotateX,
          rotateY: shouldReduceMotion ? 0 : rotateY,
        }}
      >
        {CREATORS.map((creator, i) => {
          // Compute relative position in the carousel: 0 = front, 1 = right, 2 = left
          const pos = (i - activeIndex + CREATORS.length) % CREATORS.length
          const isFront = pos === 0
          const isRight = pos === 1
          const isLeft = pos === 2

          let targetX = '0%'
          let targetY = '0%'
          let targetRotate = 0
          let targetScale = 1
          let zIndex = 30
          let opacity = 1

          if (isRight) {
            targetX = '48%'
            targetY = '3%'
            targetRotate = 7
            targetScale = 0.88
            zIndex = 15
            opacity = 0.72
          } else if (isLeft) {
            targetX = '-48%'
            targetY = '2%'
            targetRotate = -7
            targetScale = 0.88
            zIndex = 10
            opacity = 0.72
          }

          return (
            <motion.div
              key={creator.id}
              onClick={() => setActiveIndex(i)}
              className={`absolute cursor-pointer transition-shadow duration-300 ${isFront ? 'cursor-default' : 'hover:opacity-95'
                }`}
              initial={false}
              animate={
                shouldReduceMotion
                  ? {
                    x: targetX,
                    y: targetY,
                    scale: targetScale,
                    rotate: targetRotate,
                    opacity,
                  }
                  : {
                    x: targetX,
                    y: isFront ? ['0%', '-1.5%', '0%'] : targetY,
                    scale: targetScale,
                    rotate: targetRotate,
                    opacity,
                    transition: {
                      x: { duration: 0.5, ease: [0.16, 1, 0.3, 1] },
                      scale: { duration: 0.5, ease: [0.16, 1, 0.3, 1] },
                      rotate: { duration: 0.5, ease: [0.16, 1, 0.3, 1] },
                      opacity: { duration: 0.4 },
                      y: isFront
                        ? { duration: 5, repeat: Infinity, ease: 'easeInOut' }
                        : { duration: 0.5, ease: [0.16, 1, 0.3, 1] },
                    },
                  }
              }
              style={{
                zIndex: isFront ? 30 : zIndex,
              }}
            >
              <StorefrontCard creator={creator} isHero={isFront} />
            </motion.div>
          )
        })}
      </motion.div>

      {/* Tactile Creator Switcher Pills */}
      <div className="mt-3 sm:mt-5 z-40 flex items-center gap-1.5 sm:gap-2 flex-wrap justify-center">
        {CREATORS.map((c, idx) => {
          const isActive = idx === activeIndex
          const Icon = c.icon
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => setActiveIndex(idx)}
              className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full text-[11px] sm:text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${isActive
                ? 'bg-zinc-100 text-black shadow-raised scale-105'
                : 'bg-zinc-900/80 text-zinc-400 border border-zinc-800 hover:text-white hover:border-zinc-700'
                }`}
            >
              <Icon className={`h-3 w-3 ${isActive ? 'text-black' : c.accentClass}`} />
              <span>{c.name}</span>
              <span className="text-[10px] opacity-60">({c.niche})</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

export { HeroMockups, HeroMockups as SignupMockups }
