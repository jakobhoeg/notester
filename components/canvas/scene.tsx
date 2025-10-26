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
      gl={{ alpha: true }}
      onCreated={(state) => {
        state.gl.outputColorSpace = THREE.SRGBColorSpace
        state.gl.toneMapping = THREE.ACESFilmicToneMapping
        state.gl.setClearColor(0x000000, 0) // transparent background
      }}
    >
      {/* @ts-ignore */}
      <r3f.Out />
      <Preload all />
    </Canvas>
  )
}


