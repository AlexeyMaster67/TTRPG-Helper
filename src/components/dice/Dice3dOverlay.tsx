import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { useDice3dStore } from '../../store/dice3dStore';
import { DicePhysicsWorld } from '../../engine/dice3d/dicePhysicsWorld';
import { DiceType } from '../../engine/dice3d/types';
import { audioService } from '../../services/audioService';
import { Dices, EyeOff } from 'lucide-react';

interface Dice3dOverlayProps {
  isPlayerDisplay?: boolean;
}

interface SettleDisplayInfo {
  title: string;
  total: number;
  diceResults: Array<{ sides: number; value: number }>;
  isSecret?: boolean;
}

export function isWebGLSupported(): boolean {
  if (typeof window === 'undefined' || typeof document === 'undefined') return false;
  try {
    const canvas = document.createElement('canvas');
    return !!(
      window.WebGLRenderingContext &&
      (canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))
    );
  } catch {
    return false;
  }
}

function getDiceTypeFromSides(sides: number): DiceType {
  switch (sides) {
    case 4:
      return 'd4';
    case 6:
      return 'd6';
    case 8:
      return 'd8';
    case 10:
      return 'd10';
    case 12:
      return 'd12';
    case 20:
      return 'd20';
    case 100:
      return 'd100';
    default:
      return 'd20';
  }
}

export const Dice3dOverlay: React.FC<Dice3dOverlayProps> = ({ isPlayerDisplay = false }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const activeBatch = useDice3dStore((s) => s.activeBatch);
  const is3dEnabled = useDice3dStore((s) => s.is3dEnabled);
  const clearActiveBatch = useDice3dStore((s) => s.clearActiveBatch);

  const [isVisible, setIsVisible] = useState(false);
  const [settledInfo, setSettledInfo] = useState<SettleDisplayInfo | null>(null);

  // References for Three.js & Cannon
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const physicsWorldRef = useRef<DicePhysicsWorld | null>(null);
  const animFrameIdRef = useRef<number | null>(null);
  const fadeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTimeRef = useRef<number>(0);

  // Initialize Three.js scene once
  useEffect(() => {
    if (!isWebGLSupported()) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        canvas,
        alpha: true,
        antialias: true,
        powerPreference: 'high-performance',
      });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      rendererRef.current = renderer;
    } catch {
      return;
    }

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(42, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.set(0, 24, 18);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    // Lighting: Ambient + Key + Fill
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0xfff5e6, 2.2);
    dirLight1.position.set(12, 28, 14);
    dirLight1.castShadow = true;
    dirLight1.shadow.mapSize.width = 1024;
    dirLight1.shadow.mapSize.height = 1024;
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0xb0d4ff, 1.0);
    dirLight2.position.set(-14, 20, -10);
    scene.add(dirLight2);

    const physics = new DicePhysicsWorld(scene);
    physicsWorldRef.current = physics;

    const handleResize = () => {
      if (!rendererRef.current || !cameraRef.current) return;
      const width = window.innerWidth;
      const height = window.innerHeight;
      rendererRef.current.setSize(width, height, false);
      cameraRef.current.aspect = width / height;
      cameraRef.current.updateProjectionMatrix();
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current);
      if (physicsWorldRef.current) physicsWorldRef.current.destroy();
      if (rendererRef.current) rendererRef.current.dispose();
    };
  }, []);

  // Handle new incoming batch
  useEffect(() => {
    if (!activeBatch || !is3dEnabled) return;

    // Secret roll isolation: if this instance is Player Display and the roll is secret, do NOT show it!
    if (isPlayerDisplay && activeBatch.isSecret) {
      return;
    }

    if (!isWebGLSupported() || !physicsWorldRef.current || !sceneRef.current) {
      return;
    }

    // Clear any previous fade timeout
    if (fadeTimeoutRef.current) {
      clearTimeout(fadeTimeoutRef.current);
      fadeTimeoutRef.current = null;
    }

    setSettledInfo(null);
    setIsVisible(true);

    const physics = physicsWorldRef.current;
    physics.clear();

    // Sound effect
    audioService.playDiceRoll();

    // Spawn dice
    const diceList = activeBatch.dice;
    diceList.forEach((d, idx) => {
      const type = getDiceTypeFromSides(d.sides);
      physics.spawnDie(
        d.id,
        type,
        d.targetValue,
        activeBatch.theme || 'classic',
        idx,
        diceList.length
      );
    });

    // Start animation loop
    lastTimeRef.current = performance.now();

    let settledSoundPlayed = false;

    const animate = (currentTime: number) => {
      const dt = (currentTime - lastTimeRef.current) / 1000;
      lastTimeRef.current = currentTime;

      physics.step(dt);

      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }

      if (physics.isAllSettled()) {
        if (!settledSoundPlayed) {
          settledSoundPlayed = true;
          const results = physics.getResults();

          const diceResults = results.map((r, i) => ({
            sides: diceList[i]?.sides || 20,
            value: r.value,
          }));

          const calculatedTotal =
            activeBatch.total !== undefined
              ? activeBatch.total
              : diceResults.reduce((acc, curr) => acc + curr.value, 0);

          setSettledInfo({
            title: activeBatch.title || 'Результат броска',
            total: calculatedTotal,
            diceResults,
            isSecret: activeBatch.isSecret,
          });

          // Schedule smooth dismiss
          fadeTimeoutRef.current = setTimeout(() => {
            setIsVisible(false);
            setSettledInfo(null);
            physics.clear();
            clearActiveBatch();
          }, 3200);
        }
      }

      animFrameIdRef.current = requestAnimationFrame(animate);
    };

    if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current);
    animFrameIdRef.current = requestAnimationFrame(animate);

    return () => {
      if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current);
    };
  }, [activeBatch, is3dEnabled, isPlayerDisplay, clearActiveBatch]);

  if (!is3dEnabled || !isVisible) {
    return null;
  }

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-50 pointer-events-none select-none flex flex-col items-center justify-start overflow-hidden transition-opacity duration-300"
    >
      {/* 3D WebGL Canvas */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full block" />

      {/* Floating Summary Banner upon stopping */}
      {settledInfo && (
        <div className="relative mt-8 z-50 pointer-events-auto max-w-md w-full mx-4 rounded-glass-xl border-2 border-gold/70 bg-surface/95 backdrop-blur-md p-4 shadow-[0_0_40px_rgba(245,185,32,0.35),0_15px_35px_rgba(0,0,0,0.85)] text-center animate-in zoom-in-95 duration-200">
          <div className="flex items-center justify-between border-b border-glass-border pb-2 mb-2 gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <Dices className="h-5 w-5 text-gold flex-shrink-0 animate-pulse" />
              <h3 className="text-xs sm:text-sm font-bold font-serif tracking-wide text-gold-light truncate">
                {settledInfo.title}
              </h3>
            </div>
            {settledInfo.isSecret && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-rose-950/80 text-rose-300 border border-rose-500/60 uppercase tracking-wider flex-shrink-0">
                <EyeOff className="h-3 w-3" />
                Скрытно
              </span>
            )}
          </div>

          <div className="flex items-center justify-center gap-4 my-2">
            {/* Total value */}
            <div className="text-5xl font-extrabold font-mono tabular-nums text-gold drop-shadow-[0_0_20px_rgba(245,185,32,0.65)]">
              {settledInfo.total}
            </div>

            {/* Individual dice pills */}
            {settledInfo.diceResults.length > 0 && (
              <div className="flex flex-wrap gap-1.5 max-w-[200px] justify-start">
                {settledInfo.diceResults.map((dr, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded bg-black/60 border border-glass-border text-xs font-mono font-bold text-text-primary"
                  >
                    <span className="text-text-muted text-[10px]">d{dr.sides}:</span>
                    <span className="text-gold-light">{dr.value}</span>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
