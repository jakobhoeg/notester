"use client"

import { useEffect, useRef, useCallback } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { EffectComposer, RenderPass, BloomEffect, EffectPass } from 'postprocessing';
import { useControls, folder } from 'leva';
import { DitheringEffect } from './DitheringEffect';


/**
 * Component that manages all post-processing effects
 * Configures and applies various effects to the rendered scene
 */
export const PostProcessing = () => {
  // References
  const composerRef = useRef<EffectComposer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.Camera | null>(null);
  const needsUpdate = useRef(true);
  const isInitialized = useRef(false);
  const { gl, scene, camera } = useThree();

  // Effect controls
  const {
    bloom1Enabled,
    bloom1Threshold,
    bloom1Intensity,
    bloom1Radius,
  } = useControls({
    'Bloom 1': folder({
      bloom1Enabled: { value: false, label: 'Enable Bloom 1 (Pre-Dithering)' },
      bloom1Threshold: { value: 0.0, min: 0, max: 2, step: 0.01, label: 'Threshold' },
      bloom1Intensity: { value: 2.0, min: 0, max: 50, step: 0.1, label: 'Intensity' },
      bloom1Radius: { value: 0.6, min: 0, max: 1, step: 0.1, label: 'Radius' },
    })
  });

  const {
    ditheringGridSize,
    pixelSizeRatio,
    grayscaleOnly
  } = useControls({
    'Dithering': folder({
      ditheringGridSize: { value: 3, min: 0.5, max: 20, step: 0.5, label: 'Effect Resolution' },
      pixelSizeRatio: { value: 1, min: 1, max: 10, step: 1, label: 'Pixelation Strength' },
      grayscaleOnly: { value: true, label: 'Grayscale Only' }
    })
  });

  const {
    bloom2Enabled,
    bloom2Threshold,
    bloom2Intensity,
    bloom2Radius,
    bloom2Smoothing,
  } = useControls({
    'Bloom 2': folder({
      bloom2Enabled: { value: true, label: 'Enable Bloom 2 (Post-Dithering)' },
      bloom2Threshold: { value: 0.0, min: 0, max: 2, step: 0.01, label: 'Threshold' },
      bloom2Intensity: { value: 0.2, min: 0, max: 2, step: 0.01, label: 'Intensity' },
      bloom2Radius: { value: 0.5, min: 0, max: 1, step: 0.01, label: 'Radius' },
      bloom2Smoothing: { value: 0.22, min: 0, max: 1, step: 0.01, label: 'Smoothing' },
    })
  });

  // Memoized resize handler
  const handleResize = useCallback(() => {
    if (composerRef.current) {
      try {
        const size = gl.getSize(new THREE.Vector2());
        composerRef.current.setSize(size.x, size.y);
      } catch {
        // Fallback to window size if renderer size is unavailable
        composerRef.current.setSize(window.innerWidth, window.innerHeight);
      }
    }
  }, [gl]);

  // Handle window resize
  useEffect(() => {
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [handleResize]);

  // Initialize on mount and cleanup on unmount
  useEffect(() => {
    // Force composer recreation on mount by disposing any existing one
    if (composerRef.current) {
      try {
        composerRef.current.removeAllPasses();
        // @ts-ignore EffectComposer has dispose in postprocessing
        composerRef.current.dispose?.();
      } catch { }
      composerRef.current = null;
    }

    // Reset initialization flag on mount
    isInitialized.current = false;
    needsUpdate.current = true;

    return () => {
      isInitialized.current = false;
      if (composerRef.current) {
        try {
          composerRef.current.removeAllPasses();
          // @ts-ignore EffectComposer has dispose in postprocessing
          composerRef.current.dispose?.();
        } catch { }
        composerRef.current = null;
      }
      // Ensure the default framebuffer is cleared so no stale frame remains
      try {
        gl.setRenderTarget(null);
        gl.setClearColor(0x000000, 0); // fully transparent
        gl.clear(true, true, true);
      } catch { }
    };
  }, [gl]);

  // Configure post-processing effects
  useEffect(() => {
    needsUpdate.current = true;
  }, [
    bloom1Enabled,
    bloom1Threshold,
    bloom1Intensity,
    bloom1Radius,
    bloom2Enabled,
    bloom2Threshold,
    bloom2Intensity,
    bloom2Radius,
    bloom2Smoothing,
    ditheringGridSize,
    pixelSizeRatio,
    grayscaleOnly
  ]);

  // Handle rendering
  useFrame((state) => {
    const { gl, scene: currentScene, camera: currentCamera } = state;

    // Initialize composer if not yet created
    if (!composerRef.current) {
      composerRef.current = new EffectComposer(gl, {
        multisampling: 0, // Disable MSAA for better performance
      });
      handleResize(); // Initial sizing
      isInitialized.current = false;
      needsUpdate.current = true;
    }

    // Update scene and camera references if changed
    if (sceneRef.current !== currentScene) {
      sceneRef.current = currentScene;
      needsUpdate.current = true;
    }
    if (cameraRef.current !== currentCamera) {
      cameraRef.current = currentCamera;
      needsUpdate.current = true;
    }

    // Rebuild passes if needed or if not yet initialized
    if ((needsUpdate.current || !isInitialized.current) && sceneRef.current && cameraRef.current && composerRef.current) {
      const composer = composerRef.current;
      const scene = sceneRef.current;
      const camera = cameraRef.current;

      composer.removeAllPasses();

      // Add required passes in order
      const renderPass = new RenderPass(scene, camera);
      renderPass.renderToScreen = false;
      composer.addPass(renderPass);

      if (bloom1Enabled) {
        const bloomPass = new EffectPass(camera, new BloomEffect({
          luminanceThreshold: bloom1Threshold,
          intensity: bloom1Intensity,
          radius: bloom1Radius,
          mipmapBlur: true,
        }));
        bloomPass.renderToScreen = false;
        composer.addPass(bloomPass);
      }

      // Dithering effect - always active
      const ditheringPass = new EffectPass(camera, new DitheringEffect({
        gridSize: ditheringGridSize,
        pixelSizeRatio,
        grayscaleOnly
      }));

      if (bloom2Enabled) {
        ditheringPass.renderToScreen = false;
        composer.addPass(ditheringPass);

        const bloom2Pass = new EffectPass(camera, new BloomEffect({
          luminanceThreshold: bloom2Threshold,
          intensity: bloom2Intensity,
          luminanceSmoothing: bloom2Smoothing,
          radius: bloom2Radius,
        }));
        bloom2Pass.renderToScreen = true; // Final pass renders to screen
        composer.addPass(bloom2Pass);
      } else {
        ditheringPass.renderToScreen = true; // Final pass renders to screen
        composer.addPass(ditheringPass);
      }

      needsUpdate.current = false;
      isInitialized.current = true;
    }

    // Render the composer only if properly initialized
    if (composerRef.current && isInitialized.current) {
      // Render composer as the final stage for this view
      gl.autoClear = false;
      composerRef.current.render();
    }
  }, 1000);

  return null;
};