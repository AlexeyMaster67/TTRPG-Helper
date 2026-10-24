import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { useDice3dStore } from '../../store/dice3dStore';
import { useSettingsStore } from '../../store/settingsStore';
import { DicePhysicsWorld } from '../../engine/dice3d/dicePhysicsWorld';
import { DiceType } from '../../engine/dice3d/types';
import { audioService } from '../../services/audioService';
import {
  Dices,
  EyeOff,
  Maximize2,
  Minimize2,
  X,
  Sparkles,
} from 'lucide-react';

interface Dice3dOverlayProps {
  isPlayerDisplay?: boolean;
}

interface SettleDisplayInfo {
  title: string;
  total: number;
  diceResults: Array<{
    sides: number;
    value: number;
    isDiscarded?: boolean;
    isHighlighted?: boolean;
  }>;
  isSecret?: boolean;
  isNat20?: boolean;
  isNat1?: boolean;
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
  const globalDisplayMode = useDice3dStore((s) => s.displayMode);
  const toggleDisplayMode = useDice3dStore((s) => s.toggleDisplayMode);
  const clearActiveBatch = useDice3dStore((s) => s.clearActiveBatch);
  const shouldSkipAnimation = useDice3dStore((s) => s.shouldSkipAnimation);

  const isEn = useSettingsStore((s) => s.language === 'en');
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

  // Effective display mode: Player Display is always fullscreen, DM uses store setting
  const effectiveDisplayMode = isPlayerDisplay
    ? 'fullscreen'
    : activeBatch?.displayMode || globalDisplayMode;

  const handleResize = useCallback(() => {
    if (!rendererRef.current || !cameraRef.current) return;
    const isTray = effectiveDisplayMode === 'tray';
    const width = isTray ? 420 : window.innerWidth;
    const height = isTray ? 250 : window.innerHeight;

    rendererRef.current.setSize(width, height, false);
    cameraRef.current.aspect = width / height;
    cameraRef.current.updateProjectionMatrix();

    if (physicsWorldRef.current) {
      if (isTray) {
        physicsWorldRef.current.reconfigureTray({ width: 18, depth: 13, height: 16 });
        cameraRef.current.position.set(0, 19, 14);
      } else {
        physicsWorldRef.current.reconfigureTray({ width: 26, depth: 18, height: 20 });
        cameraRef.current.position.set(0, 24, 18);
      }
      cameraRef.current.lookAt(0, 0, 0);
    }
  }, [effectiveDisplayMode]);

  // Initializer function for Three.js and Cannon physics
  const initThree = useCallback(() => {
    if (!isWebGLSupported()) return;
    const canvas = canvasRef.current;
    if (!canvas || rendererRef.current) return;

    try {
      const renderer = new THREE.WebGLRenderer({
        canvas,
        alpha: true,
        antialias: true,
        powerPreference: 'high-performance',
      });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      rendererRef.current = renderer;

      const scene = new THREE.Scene();
      sceneRef.current = scene;

      const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
      camera.position.set(0, 20, 15);
      camera.lookAt(0, 0, 0);
      cameraRef.current = camera;

      // Lighting
      const ambientLight = new THREE.AmbientLight(0xffffff, 1.4);
      scene.add(ambientLight);

      const dirLight1 = new THREE.DirectionalLight(0xfff5e6, 2.4);
      dirLight1.position.set(12, 28, 14);
      dirLight1.castShadow = true;
      dirLight1.shadow.mapSize.width = 1024;
      dirLight1.shadow.mapSize.height = 1024;
      scene.add(dirLight1);

      const dirLight2 = new THREE.DirectionalLight(0xb0d4ff, 1.2);
      dirLight2.position.set(-14, 20, -10);
      scene.add(dirLight2);

      const physics = new DicePhysicsWorld(scene);
      physicsWorldRef.current = physics;

      handleResize();
    } catch (e) {
      console.error('Failed to initialize 3D Dice Three.js renderer:', e);
    }
  }, [handleResize]);

  // Initialize Three.js scene on component mount
  useEffect(() => {
    initThree();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current);
      if (physicsWorldRef.current) physicsWorldRef.current.destroy();
      if (rendererRef.current) rendererRef.current.dispose();
      rendererRef.current = null;
      physicsWorldRef.current = null;
    };
  }, [initThree, handleResize]);

  // Update layout when display mode toggles
  useEffect(() => {
    handleResize();
  }, [effectiveDisplayMode, handleResize]);

  // Handle skip action
  useEffect(() => {
    if (shouldSkipAnimation && physicsWorldRef.current) {
      physicsWorldRef.current.forceSettle();
    }
  }, [shouldSkipAnimation]);

  const handleClose = useCallback(() => {
    if (fadeTimeoutRef.current) {
      clearTimeout(fadeTimeoutRef.current);
      fadeTimeoutRef.current = null;
    }
    if (animFrameIdRef.current) {
      cancelAnimationFrame(animFrameIdRef.current);
      animFrameIdRef.current = null;
    }
    setIsVisible(false);
    setSettledInfo(null);
    if (physicsWorldRef.current) physicsWorldRef.current.clear();
    clearActiveBatch();
  }, [clearActiveBatch]);

  // Handle incoming batch
  useEffect(() => {
    if (!activeBatch || !is3dEnabled) return;

    if (isPlayerDisplay && activeBatch.isSecret) {
      return;
    }

    if (!isWebGLSupported()) {
      return;
    }

    // Lazy init if not yet created
    if (!physicsWorldRef.current || !sceneRef.current) {
      initThree();
    }

    if (!physicsWorldRef.current || !sceneRef.current) {
      return;
    }

    if (fadeTimeoutRef.current) {
      clearTimeout(fadeTimeoutRef.current);
      fadeTimeoutRef.current = null;
    }

    setSettledInfo(null);
    setIsVisible(true);
    handleResize();

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
        activeBatch.theme || 'obsidian',
        idx,
        diceList.length,
        d.isDiscarded,
        d.isHighlighted
      );
    });

    lastTimeRef.current = performance.now();
    let settledHandled = false;

    const animate = (currentTime: number) => {
      const dt = (currentTime - lastTimeRef.current) / 1000;
      lastTimeRef.current = currentTime;

      physics.step(dt);

      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }

      if (physics.isAllSettled()) {
        if (!settledHandled) {
          settledHandled = true;
          const results = physics.getResults();

          let hasNat20 = false;
          let hasNat1 = false;

          const diceResults = results.map((r, i) => {
            const sides = diceList[i]?.sides || 20;
            const isDiscarded = diceList[i]?.isDiscarded || r.isDiscarded;
            const isHighlighted = diceList[i]?.isHighlighted || r.isHighlighted;

            if (sides === 20 && !isDiscarded) {
              if (r.value === 20) hasNat20 = true;
              if (r.value === 1) hasNat1 = true;
            }

            return {
              sides,
              value: r.value,
              isDiscarded,
              isHighlighted,
            };
          });

          const activeCountValues = diceResults
            .filter((d) => !d.isDiscarded)
            .reduce((acc, curr) => acc + curr.value, 0);

          const calculatedTotal =
            activeBatch.total !== undefined ? activeBatch.total : activeCountValues;

          setSettledInfo({
            title: activeBatch.title || (isEn ? 'Roll Result' : 'Результат броска'),
            total: calculatedTotal,
            diceResults,
            isSecret: activeBatch.isSecret,
            isNat20: hasNat20,
            isNat1: hasNat1,
          });

          // Auto-fade dismiss after 3.8s
          fadeTimeoutRef.current = setTimeout(() => {
            handleClose();
          }, 3800);
        }
      }

      animFrameIdRef.current = requestAnimationFrame(animate);
    };

    if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current);
    animFrameIdRef.current = requestAnimationFrame(animate);

    return () => {
      if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current);
    };
  }, [activeBatch, is3dEnabled, isPlayerDisplay, handleResize, initThree, handleClose]);

  const handleContainerClick = () => {
    if (!settledInfo) {
      // If dice are still rolling, instant settle!
      if (physicsWorldRef.current) physicsWorldRef.current.forceSettle();
    } else {
      // If already settled, close immediately!
      handleClose();
    }
  };

  const isTray = effectiveDisplayMode === 'tray';

  return (
    <div
      ref={containerRef}
      onClick={handleContainerClick}
      title={isEn ? "Click to instantly settle roll or close" : "Кликните для мгновенной фиксации результата или закрытия"}
      className={`fixed z-50 select-none transition-all duration-200 ${
        !isVisible
          ? 'pointer-events-none opacity-0 invisible scale-95'
          : 'pointer-events-auto opacity-100 visible scale-100'
      } ${
        isTray
          ? 'bottom-5 right-5 w-[420px] h-[300px] rounded-glass-xl border-2 border-gold/70 bg-[#090b10]/95 backdrop-blur-md shadow-[0_12px_45px_rgba(0,0,0,0.88),0_0_24px_rgba(245,185,32,0.25)] flex flex-col overflow-hidden cursor-pointer'
          : 'inset-0 bg-black/45 backdrop-blur-[2px] flex flex-col items-center justify-start overflow-hidden cursor-pointer'
      }`}
    >
      {/* 3D WebGL Canvas Layer - Always mounted to preserve WebGL context */}
      <div
        className={
          isTray
            ? 'relative flex-1 w-full overflow-hidden order-2 bg-gradient-to-b from-transparent to-black/40'
            : 'absolute inset-0 w-full h-full'
        }
      >
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full block" />
      </div>

      {/* ------------------------------------------------------------- */}
      {/* TRAY DOCK MODE UI */}
      {/* ------------------------------------------------------------- */}
      {isTray && (
        <>
          {/* Tray Header Bar */}
          <div
            onClick={(e) => e.stopPropagation()}
            className="order-1 h-9 px-3 border-b border-glass-border bg-surface/90 flex items-center justify-between gap-2 flex-shrink-0 z-10"
          >
            <div className="flex items-center gap-1.5 min-w-0">
              <Dices className="h-4 w-4 text-gold flex-shrink-0 animate-pulse" />
              <span className="text-xs font-serif font-bold text-gold-light truncate">
                {activeBatch?.title || (isEn ? 'Dice Tray' : 'Дайс-трей')}
              </span>
            </div>

            <div className="flex items-center gap-1 flex-shrink-0">
              {activeBatch?.isSecret && (
                <span className="inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded bg-rose-950/80 text-rose-300 border border-rose-500/50 uppercase">
                  <EyeOff className="h-2.5 w-2.5" /> {isEn ? 'Secret' : 'Скрытно'}
                </span>
              )}
              <button
                onClick={toggleDisplayMode}
                title={isEn ? "Expand to fullscreen" : "Развернуть на весь экран"}
                className="p-1 rounded text-gray-400 hover:text-gold transition-colors"
              >
                <Maximize2 className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={handleClose}
                title={isEn ? "Close" : "Закрыть"}
                className="p-1 rounded text-gray-400 hover:text-rose-400 transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Tray Result Footer */}
          {settledInfo && (
            <div className="order-3 px-3 py-2 border-t border-glass-border bg-[#0e1219]/95 flex items-center justify-between gap-2 flex-shrink-0 z-10 animate-in fade-in duration-150">
              <div className="flex items-center gap-2">
                <span className="text-2xl font-extrabold font-mono text-gold drop-shadow-[0_0_12px_rgba(245,185,32,0.65)]">
                  {settledInfo.total}
                </span>
                {settledInfo.isNat20 && (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px] font-bold border border-gold/60 uppercase">
                    <Sparkles className="h-3 w-3 text-gold" /> {isEn ? 'Crit!' : 'Крит!'}
                  </span>
                )}
                {settledInfo.isNat1 && (
                  <span className="px-1.5 py-0.5 rounded bg-rose-950/80 text-rose-400 text-[10px] font-bold border border-rose-600/60 uppercase">
                    {isEn ? 'Fumble 1' : 'Провал 1'}
                  </span>
                )}
              </div>

              <div className="flex flex-wrap gap-1 max-w-[220px] justify-end">
                {settledInfo.diceResults.map((dr, idx) => (
                  <span
                    key={idx}
                    className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-mono font-bold border ${
                      dr.isDiscarded
                        ? 'bg-black/30 border-gray-800 text-gray-500 line-through opacity-50'
                        : dr.isHighlighted
                        ? 'bg-gold/20 border-gold/70 text-gold shadow-[0_0_8px_rgba(245,185,32,0.4)]'
                        : 'bg-black/60 border-glass-border text-gray-200'
                    }`}
                  >
                    <span className="text-[9px] opacity-70">d{dr.sides}:</span>
                    <span>{dr.value}</span>
                  </span>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* ------------------------------------------------------------- */}
      {/* FULLSCREEN CINEMATIC MODE UI */}
      {/* ------------------------------------------------------------- */}
      {!isTray && (
        <div className="relative z-10 w-full flex flex-col items-center">
          {/* Top Controls Toolbar */}
          <div
            onClick={(e) => e.stopPropagation()}
            className="mt-3 flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/60 border border-glass-border backdrop-blur-md"
          >
            <Dices className="h-4 w-4 text-gold animate-pulse" />
            <span className="text-xs font-semibold text-gold-light">
              {activeBatch?.title || (isEn ? '3D Roll' : '3D Бросок')}
            </span>
            {activeBatch?.isSecret && (
              <span className="inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded bg-rose-950/80 text-rose-300 border border-rose-500/50 uppercase">
                <EyeOff className="h-2.5 w-2.5" /> {isEn ? 'Secret' : 'Скрытно'}
              </span>
            )}
            {!isPlayerDisplay && (
              <button
                onClick={toggleDisplayMode}
                title={isEn ? "Minimize to tray" : "Свернуть в лоток"}
                className="p-1 rounded text-gray-400 hover:text-gold transition-colors ml-1"
              >
                <Minimize2 className="h-3.5 w-3.5" />
              </button>
            )}
            <button
              onClick={handleClose}
              title={isEn ? "Close" : "Закрыть"}
              className="p-1 rounded text-gray-400 hover:text-rose-400 transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Fullscreen Settle Banner */}
          {settledInfo && (
            <div
              onClick={(e) => e.stopPropagation()}
              className="mt-6 pointer-events-auto max-w-md w-full mx-4 rounded-glass-xl border-2 border-gold/70 bg-surface/95 backdrop-blur-md p-4 shadow-[0_0_40px_rgba(245,185,32,0.35),0_15px_35px_rgba(0,0,0,0.85)] text-center animate-in zoom-in-95 duration-200"
            >
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
                    {isEn ? 'Secret' : 'Скрытно'}
                  </span>
                )}
              </div>

              <div className="flex items-center justify-center gap-4 my-2">
                <div className="text-5xl font-extrabold font-mono tabular-nums text-gold drop-shadow-[0_0_20px_rgba(245,185,32,0.65)]">
                  {settledInfo.total}
                </div>

                {settledInfo.diceResults.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 max-w-[220px] justify-start">
                    {settledInfo.diceResults.map((dr, idx) => (
                      <span
                        key={idx}
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-mono font-bold border ${
                          dr.isDiscarded
                            ? 'bg-black/30 border-gray-800 text-gray-500 line-through opacity-50'
                            : dr.isHighlighted
                            ? 'bg-gold/20 border-gold text-gold shadow-[0_0_10px_rgba(245,185,32,0.5)]'
                            : 'bg-black/60 border-glass-border text-text-primary'
                        }`}
                      >
                        <span className="text-text-muted text-[10px]">d{dr.sides}:</span>
                        <span className="text-gold-light">{dr.value}</span>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {settledInfo.isNat20 && (
                <div className="mt-2 text-xs font-bold text-amber-300 flex items-center justify-center gap-1 animate-pulse">
                  <Sparkles className="h-4 w-4 text-gold" /> {isEn ? "CRITICAL SUCCESS!" : "КРИТИЧЕСКИЙ УСПЕХ!"}
                </div>
              )}
              {settledInfo.isNat1 && (
                <div className="mt-2 text-xs font-bold text-rose-400 flex items-center justify-center gap-1">
                  {isEn ? "CRITICAL FAILURE!" : "КРИТИЧЕСКИЙ ПРОВАЛ!"}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
