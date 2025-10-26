"use client"

import { forwardRef, Suspense, useImperativeHandle, useRef } from 'react'
import { OrbitControls, PerspectiveCamera, View as ViewImpl } from '@react-three/drei'
import { r3f } from '@/lib/r3f-tunnel'

export const Three = ({ children }: { children: React.ReactNode }) => {
  // @ts-ignore
  return <r3f.In>{children}</r3f.In>
}

export const Common = ({ color }: { color?: string }) => (
  <Suspense fallback={null}>
    {color && <color attach='background' args={[color]} />}
    <ambientLight />
    <pointLight position={[20, 30, 10]} intensity={3} decay={0.2} />
    <pointLight position={[-10, -10, -10]} color='blue' decay={0.2} />
    <PerspectiveCamera makeDefault fov={40} position={[0, 0, 6]} />
  </Suspense>
)

const View = forwardRef<HTMLDivElement, { children?: React.ReactNode; orbit?: boolean } & React.HTMLAttributes<HTMLDivElement>>(
  ({ children, orbit, ...props }, ref) => {
    const localRef = useRef<HTMLDivElement>(null)
    useImperativeHandle(ref, () => localRef.current as HTMLDivElement)

    return (
      <>
        <div
          ref={localRef}
          {...props}
          style={{ ...(props.style as React.CSSProperties || {}), touchAction: 'none', userSelect: 'none', WebkitUserSelect: 'none' }}
          onDragStart={(e) => e.preventDefault()}
          onContextMenu={(e) => e.preventDefault()}
        />
        <Three>
          {/* @ts-ignore */}
          <ViewImpl track={localRef}>
            {children}
            {orbit && <OrbitControls />}
          </ViewImpl>
        </Three>
      </>
    )
  },
)

View.displayName = 'View'

export { View }




