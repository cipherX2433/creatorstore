'use client'

export default function CarouselVideoSection() {
  return (
    <section aria-label="Creator Carousel" className="w-full bg-black overflow-hidden select-none">
      <video
        src="/carousel.mp4"
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        className="block w-full h-auto pointer-events-none"
      />
    </section>
  )
}
