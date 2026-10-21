import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { useDice3dStore } from '../../store/dice3dStore';
import { DicePhysicsWorld } from '../../engine/dice3d/dicePhysicsWorld';
import { DiceType } from '../../engine/dice3d/types';
import { audioService } from '../../services/audioService';
import { Dices, Maximize2, X, EyeOff, Sparkles, AlertTriangle } from 'lucide-react';
import { isWebGLSupported } from './Dice3dOverlay';

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

export const DiceTrayDock: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const activeBatch = useDice3dStore((s) => s.activeBatch);
  const is3dEnabled = useDice3dStore((s) => s.is3dEnabled);
  const displayMode = useDice3dStore((s) => s.displayMode);
  const setDisplayMode = useDice3dStore((s) => s.setDisplayMode);
  const clearActiveBatch = useDice3dStore((s) => s.clearActiveBatch);

  const [isVisible, setIsVisible] = useState(false);
  const [isSettled, setIsSettled] = useState(false);
  const [settledInfo, setSettledInfo] = useState<SettleDisplayInfo | null>(null);

  // References for Three.js & Cannon
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const physicsWorldRef = useRef<DicePhysicsWorld | null>(null);
  const animFrameIdRef = useRef<number | null>(null);
  const fadeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTimeRef = useRef<number>(0);

  // Initialize Three.js scene tuned for compact tray dock
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

    // Tactical Tray Dimensions: width: 16, depth: 11, height: 14
    const camera = new THREE.PerspectiveCamera(44, 420 / 240, 0.1, 100);
    camera.position.set(0, 18, 13);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    // Ambient + Rim Lighting for Tray
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.4);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0xfff3db, 2.4);
    dirLight1.position.set(8, 22, 10);
    dirLight1.castShadow = true;
    dirLight1.shadow.mapSize.width = 1024;
    dirLight1.shadow.mapSize.height = 1024;
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0xa5c9ff, 1.1);
    dirLight2.position.set(-10, 16, -8);
    scene.add(dirLight2);

    const physics = new DicePhysicsWorld(scene, { width: 16, depth: 11, height: 14 });
    physicsWorldRef.current = physics;

    const handleResize = () => {
      if (!rendererRef.current || !cameraRef.current || !containerRef.current) return;
      const rect = canvas.getBoundingClientRect();
      const width = rect.width || 420;
      const height = rect.height || 240;
      rendererRef.current.setSize(width, height, false);
      cameraRef.current.aspect = width / height;
      cameraRef.current.updateProjectionMatrix();
    };

    handleResize();

    return () => {
      if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current);
      if (physicsWorldRef.current) physicsWorldRef.current.destroy();
      if (rendererRef.current) rendererRef.current.dispose();
    };
  }, []);

  // Handle new incoming batch for Tray mode
  useEffect(() => {
    if (!activeBatch || !is3dEnabled || displayMode !== 'tray') {
      setIsVisible(false);
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
    setIsSettled(false);
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
        diceList.length,
        {
          isDiscarded: d.isDiscarded,
          isHighlighted: d.isHighlighted,
        }
      );
    });

    // Start animation loop
    lastTimeRef.current = performance.now();
    let settledProcessed = false;

    const handleSettledState = () => {
      if (settledProcessed) return;
      settledProcessed = true;
      setIsSettled(true);

      const results = physics.getResults();
      let hasNat20 = false;
      let hasNat1 = false;

      const diceResults = results.map((r, i) => {
        const item = diceList[i];
        const is20 = item?.sides === 20;
        if (is20 && r.value === 20 && !item?.isDiscarded) hasNat20 = true;
        if (is20 && r.value === 1 && !item?.isDiscarded) hasNat1 = true;

        return {
          sides: item?.sides || 20,
          value: r.value,
          isDiscarded: item?.isDiscarded,
          isHighlighted: item?.isHighlighted,
        };
      });

      // Sound triggers for Crits
      if (hasNat20) {
        audioService.playCriticalHit();
      } else if (hasNat1) {
        audioService.playSadHorn();
      }

      // Calculate total: prioritize non-discarded dice if advantage/disadvantage
      let calculatedTotal = activeBatch.total;
      if (calculatedTotal === undefined) {
        const keptDice = diceResults.filter((d) => !d.isDiscarded);
        const sourceList = keptDice.length > 0 ? keptDice : diceResults;
        calculatedTotal = sourceList.reduce((acc, curr) => acc + curr.value, 0);
      }

      setSettledInfo({
        title: activeBatch.title || 'Результат броска',
        total: calculatedTotal,
        diceResults,
        isSecret: activeBatch.isSecret,
        isNat20: hasNat20,
        isNat1: hasNat1,
      });

      // Auto dismiss after 3.5 seconds
      fadeTimeoutRef.current = setTimeout(() => {
        handleDismiss();
      }, 3500);
    };

    const animate = (currentTime: number) => {
      const dt = (currentTime - lastTimeRef.current) / 1000;
      lastTimeRef.current = currentTime;

      physics.step(dt);

      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }

      if (physics.isAllSettled()) {
        handleSettledState();
      }

      animFrameIdRef.current = requestAnimationFrame(animate);
    };

    if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current);
    animFrameIdRef.current = requestAnimationFrame(animate);

    return () => {
      if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current);
    };
  }, [activeBatch, is3dEnabled, displayMode]);

  const handleDismiss = () => {
    if (fadeTimeoutRef.current) {
      clearTimeout(fadeTimeoutRef.current);
      fadeTimeoutRef.current = null;
    }
    setIsVisible(false);
    setSettledInfo(null);
    setIsSettled(false);
    if (physicsWorldRef.current) {
      physicsWorldRef.current.clear();
    }
    clearActiveBatch();
  };

  const handleTrayClick = () => {
    // If dice are still rolling, instant skip to settle!
    if (!isSettled && physicsWorldRef.current) {
      physicsWorldRef.current.forceSettle();
    } else {
      // If already settled, click immediately closes tray
      handleDismiss();
    }
  };

  const handleSwitchToFullscreen = (e: React.MouseEvent) => {
    e.stopPropagation();
    setDisplayMode('fullscreen');
  };

  if (!is3dEnabled || !isVisible || displayMode !== 'tray') {
    return null;
  }

  return (
    <div
      ref={containerRef}
      className="fixed bottom-4 right-4 z-50 w-[420px] max-w-[calc(100vw-2rem)] h-[300px] rounded-2xl border-2 border-[#8c6d3b]/80 bg-[#0d0c11]/95 shadow-[0_20px_50px_rgba(0,0,0,0.85),0_0_25px_rgba(197,160,89,0.2)] ring-1 ring-[#c5a059]/40 backdrop-blur-xl flex flex-col overflow-hidden select-none animate-in slide-in-from-bottom-6 fade-in duration-200"
    >
      {/* Ornate Header with Wooden & Gold filigree */}
      <div className="flex items-center justify-between px-3 py-2 bg-gradient-to-r from-[#211a14] via-[#2d2218] to-[#211a14] border-b border-[#8c6d3b]/50 text-xs">
        <div className="flex items-center gap-2 min-w-0">
          <Dices className="h-4 w-4 text-[#e5c158] flex-shrink-0 animate-pulse" />
          <span className="font-serif font-bold text-[#fef08a] truncate drop-shadow-sm">
            {settledInfo?.title || activeBatch?.title || 'Дайс-трей'}
          </span>
        </div>

        {/* Status badges */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {activeBatch?.rollMode === 'advantage' && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-950/80 text-amber-300 border border-amber-500/60 uppercase tracking-wider">
              Преимущество
            </span>
          )}
          {activeBatch?.rollMode === 'disadvantage' && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-purple-950/80 text-purple-300 border border-purple-500/60 uppercase tracking-wider">
              Помеха
            </span>
          )}
          {activeBatch?.isSecret && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-950/80 text-rose-300 border border-rose-500/60 uppercase tracking-wider">
              <EyeOff className="h-3 w-3" />
              Скрытно
            </span>
          )}

          {/* Switch to Fullscreen */}
          <button
            onClick={handleSwitchToFullscreen}
            className="p-1 rounded text-zinc-400 hover:text-amber-300 hover:bg-black/40 transition-colors"
            title="Развернуть на весь экран"
          >
            <Maximize2 className="h-3.5 w-3.5" />
          </button>

          {/* Close / Dismiss button */}
          <button
            onClick={handleDismiss}
            className="p-1 rounded text-zinc-400 hover:text-rose-400 hover:bg-black/40 transition-colors"
            title="Закрыть (пропустить)"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* 3D WebGL Canvas Tray Arena */}
      <div
        onClick={handleTrayClick}
        className="relative flex-1 w-full bg-gradient-to-b from-[#141215] to-[#0a090d] shadow-[inset_0_4px_16px_rgba(0,0,0,0.9),inset_0_0_24px_rgba(20,12,6,0.6)] cursor-pointer group overflow-hidden"
        title={!isSettled ? 'Кликните, чтобы мгновенно завершить бросок' : 'Кликните, чтобы закрыть'}
      >
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full block" />

        {/* Subtle click prompt hint */}
        {!isSettled && (
          <div className="absolute top-2 right-2 text-[10px] text-zinc-400/80 bg-black/60 px-2 py-0.5 rounded-md pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
            Клик: пропустить
          </div>
        )}

        {/* Nat 20 / Nat 1 Overlay Banner */}
        {settledInfo?.isNat20 && (
          <div className="absolute top-2 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-400/80 text-amber-200 text-xs font-bold font-serif shadow-[0_0_15px_rgba(245,185,32,0.6)] animate-bounce pointer-events-none">
            <Sparkles className="h-3.5 w-3.5 text-amber-300 animate-spin" />
            <span>КРИТИЧЕСКИЙ УСПЕХ! (NAT 20)</span>
          </div>
        )}

        {settledInfo?.isNat1 && (
          <div className="absolute top-2 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-950/80 border border-rose-500/80 text-rose-300 text-xs font-bold font-serif shadow-[0_0_15px_rgba(244,63,94,0.6)] animate-pulse pointer-events-none">
            <AlertTriangle className="h-3.5 w-3.5 text-rose-400" />
            <span>КРИТИЧЕСКИЙ ПРОВАЛ! (NAT 1)</span>
          </div>
        )}

        {/* Bottom Settled Strip */}
        {settledInfo && (
          <div className="absolute bottom-0 inset-x-0 z-20 bg-gradient-to-t from-black/95 via-black/85 to-transparent px-4 py-2.5 flex items-center justify-between border-t border-[#8c6d3b]/30 animate-in slide-in-from-bottom-2 fade-in duration-200">
            {/* Total value */}
            <div className="flex items-baseline gap-2">
              <span className="text-xs uppercase text-zinc-400 font-bold tracking-wider">Итог:</span>
              <span className="text-3xl font-extrabold font-mono text-[#f5b920] drop-shadow-[0_0_10px_rgba(245,185,32,0.7)]">
                {settledInfo.total}
              </span>
            </div>

            {/* Individual dice pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto max-w-[240px] py-1">
              {settledInfo.diceResults.map((dr, idx) => (
                <span
                  key={idx}
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-mono font-bold transition-all ${
                    dr.isDiscarded
                      ? 'line-through opacity-35 bg-zinc-900 border border-zinc-800 text-zinc-500'
                      : dr.isHighlighted
                      ? 'bg-amber-500/25 border border-amber-400 text-amber-200 shadow-[0_0_8px_rgba(245,185,32,0.5)] scale-105'
                      : 'bg-black/60 border border-[#8c6d3b]/40 text-text-primary'
                  }`}
                >
                  <span className="text-[10px] text-zinc-400">d{dr.sides}:</span>
                  <span className={dr.isHighlighted ? 'text-amber-300' : 'text-zinc-200'}>
                    {dr.value}
                  </span>
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
