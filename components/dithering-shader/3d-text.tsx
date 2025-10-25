"use client"

import { Canvas } from '@react-three/fiber';
import { Center, Float, Text3D } from '@react-three/drei';
import { useState, FC, memo, JSX } from 'react';
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

function ChromeText(): JSX.Element {
  return (
    <Text3D
      font="https://threejs.org/examples/fonts/helvetiker_bold.typeface.json"
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
}
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

  return (
    <div style={{ width: '75%' }}>
      <Leva hidden={process.env.NODE_ENV === 'production'} />
      <Canvas
        shadows
        camera={{ position: [0, 0, 17], fov: 65 }}
        gl={{ alpha: true }}
      >
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
      </Canvas>
    </div>
  );
}

const Effects: FC = memo(() => (
  <PostProcessing />
))