"use client"

import { useRef } from 'react'
import dynamic from 'next/dynamic'

const Scene = dynamic(() => import('@/components/canvas/scene'), { ssr: false })

type Props = {
  children: React.ReactNode
}

export default function R3FRoot({ children }: Props) {
  const eventRef = useRef<HTMLDivElement>(null)

  return (
    <div ref={eventRef} style={{ position: 'relative', width: '100%', height: '100%' }}>
      {/* Canvas behind all app UI */}
      <Scene
        style={{ position: 'fixed', inset: 0, width: '100vw', height: '100vh', pointerEvents: 'none', zIndex: 0 }}
        // @ts-ignore - r3f Canvas prop
        eventSource={eventRef}
        // @ts-ignore - r3f Canvas prop
        eventPrefix="client"
      />
      {/* Foreground app content */}
      <div style={{ position: 'relative', zIndex: 1 }}>
        {children}
      </div>
    </div>
  )
}


