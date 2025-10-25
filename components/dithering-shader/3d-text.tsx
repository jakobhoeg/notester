"use client"

import { Canvas } from '@react-three/fiber';
import { Center, Float, Text3D, useGLTF } from '@react-three/drei';
import { Suspense, useEffect, useState, useCallback, FC, memo, JSX } from 'react';
import { PostProcessing } from './post-processing';
import { EnvironmentWrapper } from './environment';
import { useControls, folder, Leva } from 'leva';

interface Chrome3DTextProps {
  text?: string;
  bgColor?: string;
  gridSize?: number;
  pixelSizeRatio?: number;
  grayscaleOnly?: boolean;
  className?: string;
}

// Font URL constant to ensure consistency
const FONT_URL = "https://threejs.org/examples/fonts/helvetiker_bold.typeface.json";

// Preload the font to avoid blocking the main thread later
// This happens once when the module is loaded
if (typeof window !== 'undefined') {
  useGLTF.preload(FONT_URL);
}

/**
 * 3D Chrome Text component
 * Memoized to prevent unnecessary re-renders
 */
const ChromeText = memo(function ChromeText(): JSX.Element {
  return (
    <Text3D
      font={FONT_URL}
      size={0.56}
      height={0.2}
      curveSegments={12}
      bevelEnabled
      bevelThickness={0.02}
      bevelSize={0.02}
      bevelOffset={0}
      bevelSegments={5}
    >
      Built-in AI
      <meshStandardMaterial
        color="#e8e8e8"
        metalness={0.75}
        roughness={0.2}
      />
    </Text3D>
  )
});

export default function Chrome3DText({ }: Chrome3DTextProps) {
  const [modelScale, setModelScale] = useState(3);

  const { intensity, highlight } = useControls({
    'Environment Settings': folder({
      intensity: {
        value: 0.6,
        min: 0,
        max: 5,
        step: 0.1,
        label: 'Environment Intensity'
      },
      highlight: {
        value: '#066aff',
        label: 'Highlight Color'
      }
    })
  });

  // Responsive adjustment handler for model scale
  const handleResize = useCallback(() => {
    const isSmallScreen = window.innerWidth <= 768;
    setModelScale(isSmallScreen ? 2.4 : 3); // 20% reduction on small screens
  }, []);

  // Set up resize handling
  useEffect(() => {
    // Initial check
    handleResize();

    // Add listener
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [handleResize]);

  return (
    <div style={{ width: '85%' }}>
      <Leva hidden={process.env.NODE_ENV === 'production'} />
      <Canvas
        shadows
        camera={{ position: [0, 0, 17], fov: 65 }}
        gl={{ alpha: true, preserveDrawingBuffer: true }}
      >
        <Suspense fallback={null}>
          <group position={[0, -0.5, 0]}>
            <Float
              floatIntensity={2}
              rotationIntensity={0.2}
              speed={2}
            >
              <Center scale={modelScale} position={[0, 0, 0]} rotation={[0, 0, 0]}>
                <ChromeText />
              </Center>
            </Float>
          </group>
          {/* <OrbitControls /> */}
          <EnvironmentWrapper intensity={intensity} highlight={highlight} />
          <Effects />
        </Suspense>
      </Canvas>
    </div>
  );
}

/**
 * Post-processing effects wrapper component
 * Memoized to prevent unnecessary re-renders
 */
const Effects: FC = memo(() => (
  <PostProcessing />
))
