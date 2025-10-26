"use client"

import { Canvas } from '@react-three/fiber'
import { Preload } from '@react-three/drei'
import * as THREE from 'three'
import { r3f } from '@/lib/r3f-tunnel'
import type { ComponentProps } from 'react'

export default function Scene(props: ComponentProps<typeof Canvas>) {
  return (
    <Canvas
      {...props}
      style={{ ...(props.style as React.CSSProperties || {}), touchAction: 'none', userSelect: 'none', WebkitUserSelect: 'none' }}
      gl={{ alpha: true }}
      onCreated={(state) => {
        state.gl.outputColorSpace = THREE.SRGBColorSpace
        state.gl.toneMapping = THREE.ACESFilmicToneMapping
        state.gl.setClearColor(0x000000, 0) // transparent background
        // Prevent native drag/drop and gestures from interfering with controls
        state.gl.domElement.style.touchAction = 'none'
        state.gl.domElement.style.userSelect = 'none'
        // @ts-ignore vendor prefix for Safari
        state.gl.domElement.style.WebkitUserSelect = 'none'
        state.gl.domElement.setAttribute('draggable', 'false')
        state.gl.domElement.ondragstart = (e) => { e.preventDefault() }
        state.gl.domElement.oncontextmenu = (e) => { e.preventDefault() }
      }}
    >
      {/* @ts-ignore */}
      <r3f.Out />
      <Preload all />
    </Canvas>
  )
}


