import { describe, it, expect, beforeEach } from 'vitest';
import { renderToString } from 'react-dom/server';
import React from 'react';
import {
  TOKEN_FRAMES,
  FACTION_COLORS,
  TokenFrameId,
  getFrameDefinition,
  getEffectiveFactionColor,
  drawTokenFrame,
  drawBackgroundFill,
  drawGridOverlay,
  renderTokenComposite,
} from '../engine/tokenFrames';
import { useTokenForgeStore } from '../store/tokenForgeStore';
import { useCombatStore } from '../store/combatStore';
import { useMapStore } from '../store/mapStore';
import { TokenForgeModal } from '../components/tokens/TokenForgeModal';
import { createDefaultCombatant } from '../types/combat';

/**
 * Lightweight mock for CanvasRenderingContext2D and HTMLCanvasElement
 * for deterministic headless testing in Node/Vitest.
 */
function createMockCanvas(width = 512, height = 512) {
  const operations: string[] = [];

  const ctx = {
    save: () => operations.push('save'),
    restore: () => operations.push('restore'),
    beginPath: () => operations.push('beginPath'),
    closePath: () => operations.push('closePath'),
    arc: (...args: any[]) => operations.push(`arc(${args[0]},${args[1]},${args[2]})`),
    rect: (...args: any[]) => operations.push(`rect(${args.join(',')})`),
    strokeRect: (...args: any[]) => operations.push(`strokeRect(${args.join(',')})`),
    fill: () => operations.push('fill'),
    stroke: () => operations.push('stroke'),
    clip: () => operations.push('clip'),
    clearRect: () => operations.push('clearRect'),
    moveTo: (...args: any[]) => operations.push(`moveTo(${args.join(',')})`),
    lineTo: (...args: any[]) => operations.push(`lineTo(${args.join(',')})`),
    quadraticCurveTo: () => operations.push('quadraticCurveTo'),
    ellipse: () => operations.push('ellipse'),
    translate: (...args: any[]) => operations.push(`translate(${args.join(',')})`),
    rotate: (...args: any[]) => operations.push(`rotate(${args.join(',')})`),
    scale: (...args: any[]) => operations.push(`scale(${args.join(',')})`),
    drawImage: () => operations.push('drawImage'),
    fillText: (...args: any[]) => operations.push(`fillText(${args[0]})`),
    setLineDash: () => {},
    createLinearGradient: () => ({ addColorStop: () => {} }),
    createRadialGradient: () => ({ addColorStop: () => {} }),
    shadowColor: '',
    shadowBlur: 0,
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    font: '',
    textAlign: '',
    textBaseline: '',
  } as unknown as CanvasRenderingContext2D;

  const canvas = {
    width,
    height,
    getContext: (type: string) => (type === '2d' ? ctx : null),
    toDataURL: (type = 'image/png') => `data:${type};base64,mockedToken512x512`,
  } as unknown as HTMLCanvasElement;

  return { canvas, ctx, operations };
}

describe('Token Forge: Frame Engine (tokenFrames.ts)', () => {
  it('registers all 8 required frames with valid specifications', () => {
    expect(TOKEN_FRAMES).toHaveLength(8);

    const expectedIds: TokenFrameId[] = [
      'gold-runic',
      'dwarf-stone',
      'fire-arcane',
      'rose-thorn',
      'bone-skulls',
      'cyber-neon',
      'knight-steel',
      'frameless',
    ];

    const frameIds = TOKEN_FRAMES.map((f) => f.id);
    for (const id of expectedIds) {
      expect(frameIds).toContain(id);
    }

    for (const frame of TOKEN_FRAMES) {
      expect(frame.name).toBeTruthy();
      expect(frame.nameEn).toBeTruthy();
      expect(frame.description).toBeTruthy();
      expect(frame.icon).toBeTruthy();
      expect(frame.innerRadiusRatio).toBeGreaterThanOrEqual(0.75);
      expect(frame.innerRadiusRatio).toBeLessThanOrEqual(1.0);
    }
  });

  it('retrieves frame definitions safely with fallback', () => {
    const gold = getFrameDefinition('gold-runic');
    expect(gold.id).toBe('gold-runic');
    expect(gold.name).toBe('Золотое руническое кольцо');

    const stone = getFrameDefinition('dwarf-stone');
    expect(stone.id).toBe('dwarf-stone');
    expect(stone.name).toBe('Дворфийский рунический камень');

    const frameless = getFrameDefinition('frameless');
    expect(frameless.id).toBe('frameless');

    // Unknown fallback
    const fallback = getFrameDefinition('unknown-frame-id' as any);
    expect(fallback.id).toBe('gold-runic');
  });

  it('supports all required factions and color resolutions', () => {
    expect(FACTION_COLORS['ally-green'].hex).toBe('#22c55e');
    expect(FACTION_COLORS['ally-blue'].hex).toBe('#3b82f6');
    expect(FACTION_COLORS['enemy'].hex).toBe('#ef4444');
    expect(FACTION_COLORS['neutral'].hex).toBe('#f59e0b');
    expect(FACTION_COLORS['boss'].hex).toBe('#a855f7');
    expect(FACTION_COLORS['none'].hex).toBe('transparent');

    expect(getEffectiveFactionColor('ally-green')).toBe('#22c55e');
    expect(getEffectiveFactionColor('ally-blue')).toBe('#3b82f6');
    expect(getEffectiveFactionColor('enemy')).toBe('#ef4444');
    expect(getEffectiveFactionColor('neutral')).toBe('#f59e0b');
    expect(getEffectiveFactionColor('boss')).toBe('#a855f7');
    expect(getEffectiveFactionColor('none')).toBeNull();
    expect(getEffectiveFactionColor('custom', '#e11d48')).toBe('#e11d48');
  });

  it('renders all 8 frames procedurally onto a canvas context without throwing', () => {
    const frames: TokenFrameId[] = [
      'gold-runic',
      'dwarf-stone',
      'fire-arcane',
      'rose-thorn',
      'bone-skulls',
      'cyber-neon',
      'knight-steel',
      'frameless',
    ];

    for (const frameId of frames) {
      const { ctx, operations } = createMockCanvas(512, 512);
      expect(() => {
        drawTokenFrame(ctx, 512, frameId, {
          factionColor: '#ef4444',
          glowIntensity: 80,
        });
      }).not.toThrow();

      expect(operations.length).toBeGreaterThan(5);
    }
  });

  it('draws background fill modes: transparent, dark, and faction', () => {
    const { ctx: ctxTrans, operations: opTrans } = createMockCanvas();
    drawBackgroundFill(ctxTrans, 512, 'transparent');
    expect(opTrans).toHaveLength(0);

    const { ctx: ctxDark, operations: opDark } = createMockCanvas();
    drawBackgroundFill(ctxDark, 512, 'dark');
    expect(opDark).toContain('fill');

    const { ctx: ctxFact, operations: opFact } = createMockCanvas();
    drawBackgroundFill(ctxFact, 512, 'faction', '#22c55e');
    expect(opFact).toContain('fill');
  });

  it('draws tactical cell grid overlay with bounding square and crosshair', () => {
    const { ctx, operations } = createMockCanvas();
    drawGridOverlay(ctx, 512);

    expect(operations).toContain('strokeRect(2,2,508,508)');
    expect(operations).toContain('stroke');
  });

  it('composites portrait, frame, and grid overlay via renderTokenComposite', () => {
    const { canvas, operations } = createMockCanvas(512, 512);

    expect(() => {
      renderTokenComposite(canvas, {
        size: 512,
        image: null,
        frameId: 'fire-arcane',
        faction: 'boss',
        glowIntensity: 60,
        zoom: 1.5,
        panX: 20,
        panY: -10,
        rotation: 45,
        flipH: true,
        showGridOverlay: true,
      });
    }).not.toThrow();

    expect(operations).toContain('clearRect');
    expect(operations).toContain('strokeRect(2,2,508,508)');
  });
});

describe('Token Forge: Zustand Store (tokenForgeStore.ts)', () => {
  beforeEach(() => {
    useTokenForgeStore.setState({
      isOpen: false,
      activeTab: 'forge',
      targetCombatantId: null,
      targetTokenId: null,
      imageSrc: null,
      name: 'Новый токен',
      currentFrame: 'gold-runic',
      currentFaction: 'none',
      customColor: '#06b6d4',
      glowIntensity: 50,
      showGridOverlay: false,
      backgroundMode: 'transparent',
      zoom: 1.0,
      panX: 0,
      panY: 0,
      rotation: 0,
      flipH: false,
      savedTokens: [],
    });
  });

  it('opens forge with configuration and resets transforms', () => {
    const store = useTokenForgeStore.getState();
    expect(store.isOpen).toBe(false);

    store.openForge({
      initialImage: 'data:image/png;base64,sample',
      name: 'Орк-вождь',
      targetCombatantId: 'combatant-123',
      frameId: 'bone-skulls',
      faction: 'enemy',
      glowIntensity: 75,
    });

    const updated = useTokenForgeStore.getState();
    expect(updated.isOpen).toBe(true);
    expect(updated.imageSrc).toBe('data:image/png;base64,sample');
    expect(updated.name).toBe('Орк-вождь');
    expect(updated.targetCombatantId).toBe('combatant-123');
    expect(updated.currentFrame).toBe('bone-skulls');
    expect(updated.currentFaction).toBe('enemy');
    expect(updated.glowIntensity).toBe(75);
    expect(updated.zoom).toBe(1.0);
    expect(updated.panX).toBe(0);
    expect(updated.panY).toBe(0);
    expect(updated.rotation).toBe(0);
    expect(updated.flipH).toBe(false);
  });

  it('closes forge properly', () => {
    useTokenForgeStore.getState().openForge();
    expect(useTokenForgeStore.getState().isOpen).toBe(true);

    useTokenForgeStore.getState().closeForge();
    expect(useTokenForgeStore.getState().isOpen).toBe(false);
  });

  it('updates frame, faction, custom color and glow intensity', () => {
    const store = useTokenForgeStore.getState();

    store.setFrame('knight-steel');
    expect(useTokenForgeStore.getState().currentFrame).toBe('knight-steel');

    store.setFaction('boss');
    expect(useTokenForgeStore.getState().currentFaction).toBe('boss');

    store.setCustomColor('#ff00aa');
    expect(useTokenForgeStore.getState().customColor).toBe('#ff00aa');

    store.setGlowIntensity(150); // should clamp to 100
    expect(useTokenForgeStore.getState().glowIntensity).toBe(100);

    store.setGlowIntensity(-20); // should clamp to 0
    expect(useTokenForgeStore.getState().glowIntensity).toBe(0);
  });

  it('controls zoom with min/max clamping (0.1 to 5.0)', () => {
    const store = useTokenForgeStore.getState();

    store.setZoom(2.5);
    expect(useTokenForgeStore.getState().zoom).toBe(2.5);

    store.setZoom(0.01);
    expect(useTokenForgeStore.getState().zoom).toBe(0.1);

    store.setZoom(10.0);
    expect(useTokenForgeStore.getState().zoom).toBe(5.0);
  });

  it('controls pan and rotation correctly with 360-degree normalization', () => {
    const store = useTokenForgeStore.getState();

    store.setPan(120, -85);
    expect(useTokenForgeStore.getState().panX).toBe(120);
    expect(useTokenForgeStore.getState().panY).toBe(-85);

    store.setRotation(90);
    expect(useTokenForgeStore.getState().rotation).toBe(90);

    // rotateBy +90
    store.rotateBy(90);
    expect(useTokenForgeStore.getState().rotation).toBe(180);

    // rotateBy +90 wraps around to -90
    store.rotateBy(90);
    expect(useTokenForgeStore.getState().rotation).toBe(-90);

    // flip horizontal toggle
    expect(useTokenForgeStore.getState().flipH).toBe(false);
    store.toggleFlipH();
    expect(useTokenForgeStore.getState().flipH).toBe(true);

    // reset transforms
    store.resetTransform();
    const reset = useTokenForgeStore.getState();
    expect(reset.zoom).toBe(1.0);
    expect(reset.panX).toBe(0);
    expect(reset.panY).toBe(0);
    expect(reset.rotation).toBe(0);
    expect(reset.flipH).toBe(false);
  });

  it('manages token library: saving, deleting, and clearing', () => {
    const store = useTokenForgeStore.getState();

    const saved = store.saveTokenToLibrary({
      name: 'Эльфийский следопыт',
      dataUrl: 'data:image/png;base64,elfdata',
      frameId: 'rose-thorn',
      faction: 'ally-green',
    });

    expect(saved.id).toBeTruthy();
    expect(saved.name).toBe('Эльфийский следопыт');
    expect(saved.frameId).toBe('rose-thorn');
    expect(useTokenForgeStore.getState().savedTokens).toHaveLength(1);

    // Save another token
    const saved2 = store.saveTokenToLibrary({
      name: 'Тёмный культист',
      dataUrl: 'data:image/png;base64,cultistdata',
      frameId: 'bone-skulls',
      faction: 'enemy',
    });
    expect(useTokenForgeStore.getState().savedTokens).toHaveLength(2);

    // Delete first token
    store.deleteTokenFromLibrary(saved.id);
    expect(useTokenForgeStore.getState().savedTokens).toHaveLength(1);
    expect(useTokenForgeStore.getState().savedTokens[0].id).toBe(saved2.id);

    // Clear library
    store.clearLibrary();
    expect(useTokenForgeStore.getState().savedTokens).toHaveLength(0);
  });
});

describe('Token Forge: Modal Rendering & Integration', () => {
  beforeEach(() => {
    useTokenForgeStore.setState({
      isOpen: false,
      activeTab: 'forge',
      targetCombatantId: null,
      targetTokenId: null,
      imageSrc: null,
      name: 'Паладин Рассвета',
      currentFrame: 'gold-runic',
      currentFaction: 'ally-blue',
      zoom: 1.0,
      rotation: 0,
      flipH: false,
      savedTokens: [],
    });
  });

  it('renders nothing when closed', () => {
    const html = renderToString(React.createElement(TokenForgeModal, { isOpen: false }));
    expect(html).toBe('');
  });

  it('renders complete Token Forge modal when opened', () => {
    const html = renderToString(React.createElement(TokenForgeModal, { isOpen: true }));

    expect(html).toContain('Кузница токенов');
    expect(html).toContain('512×512 HD');
    expect(html).toContain('Золотое руническое кольцо');
    expect(html).toContain('Дворфийский рунический камень');
    expect(html).toContain('Огненное / Арканное кольцо');
    expect(html).toContain('Венок из роз и терновника');
    expect(html).toContain('Костяной венец / Черепа');
    expect(html).toContain('Киберпанк / Неоновый контур');
    expect(html).toContain('Серебро / Рыцарская сталь');
    expect(html).toContain('Без рамки (Срез)');
    expect(html).toContain('Экспорт PNG (512×512)');
    expect(html).toContain('В библиотеку');
  });

  it('renders library tab with empty message when no tokens exist', () => {
    const html = renderToString(
      React.createElement(TokenForgeModal, { isOpen: true, activeTab: 'library' })
    );

    expect(html).toContain('В библиотеке пока нет токенов');
  });

  it('integrates with combatStore: updates combatant avatar when targetCombatantId is set', () => {
    const combatant = createDefaultCombatant({
      id: 'paladin-42',
      name: 'Паладин',
    });
    useCombatStore.setState({ combatants: [combatant] });

    useTokenForgeStore.getState().openForge({
      targetCombatantId: 'paladin-42',
      name: 'Паладин Рассвета',
    });

    // Simulate applying token
    const testDataUrl = 'data:image/png;base64,newPaladinToken512';
    useCombatStore.getState().updateCombatant('paladin-42', {
      avatarUrl: testDataUrl,
      tokenUrl: testDataUrl,
    });

    const updated = useCombatStore.getState().combatants.find((c) => c.id === 'paladin-42');
    expect(updated?.avatarUrl).toBe(testDataUrl);
    expect(updated?.tokenUrl).toBe(testDataUrl);
  });

  it('integrates with mapStore: updates standalone map token avatar when targetTokenId is set', () => {
    const mapToken = {
      id: 'token-99',
      name: 'Гоблин',
      x: 200,
      y: 200,
      size: 'medium' as const,
      isVisibleToPlayers: true,
    };
    useMapStore.setState({ mapTokens: [mapToken] });

    useTokenForgeStore.getState().openForge({
      targetTokenId: 'token-99',
      name: 'Гоблин Снайпер',
    });

    const testDataUrl = 'data:image/png;base64,newGoblinToken512';
    useMapStore.getState().updateMapToken('token-99', {
      avatarUrl: testDataUrl,
      tokenUrl: testDataUrl,
    });

    const updated = useMapStore.getState().mapTokens.find((t) => t.id === 'token-99');
    expect(updated?.avatarUrl).toBe(testDataUrl);
    expect(updated?.tokenUrl).toBe(testDataUrl);
  });
});
