import * as THREE from 'three';
import { DiceTheme } from './types';

interface ThemeVisuals {
  bgBase: string;
  bgGradInner: string;
  borderColor: string;
  textColor: string;
  textShadow: string;
  roughness: number;
  metalness: number;
}

export const THEME_VISUALS: Record<DiceTheme, ThemeVisuals> = {
  classic: {
    bgBase: '#18181b',
    bgGradInner: '#27272a',
    borderColor: '#ca8a04',
    textColor: '#f5b920',
    textShadow: 'rgba(0, 0, 0, 0.9)',
    roughness: 0.25,
    metalness: 0.35,
  },
  obsidian: {
    bgBase: '#090a0f',
    bgGradInner: '#181e2b',
    borderColor: '#f5b920',
    textColor: '#fce79f',
    textShadow: 'rgba(245, 185, 32, 0.4)',
    roughness: 0.12,
    metalness: 0.65,
  },
  ruby: {
    bgBase: '#7f1d1d',
    bgGradInner: '#991b1b',
    borderColor: '#ef4444',
    textColor: '#fef08a',
    textShadow: 'rgba(0, 0, 0, 0.95)',
    roughness: 0.18,
    metalness: 0.2,
  },
  bone: {
    bgBase: '#ded5be',
    bgGradInner: '#e8dfc8',
    borderColor: '#85633e',
    textColor: '#291e13',
    textShadow: 'rgba(0, 0, 0, 0.3)',
    roughness: 0.45,
    metalness: 0.05,
  },
};

const textureCache = new Map<string, THREE.CanvasTexture>();

export function isCanvasSupported(): boolean {
  if (typeof document === 'undefined') return false;
  try {
    const testCanvas = document.createElement('canvas');
    return !!testCanvas.getContext('2d');
  } catch {
    return false;
  }
}

export function createFaceTexture(
  label: string,
  theme: DiceTheme = 'classic',
  shape: 'square' | 'triangle' | 'pentagon' | 'kite' = 'triangle'
): THREE.CanvasTexture {
  const cacheKey = `${theme}_${shape}_${label}`;
  const existing = textureCache.get(cacheKey);
  if (existing) {
    return existing;
  }

  // Headless environment fallback (Node / Vitest)
  if (!isCanvasSupported()) {
    const dummyTexture = new THREE.CanvasTexture({} as HTMLCanvasElement);
    textureCache.set(cacheKey, dummyTexture);
    return dummyTexture;
  }

  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    const dummy = new THREE.CanvasTexture(canvas);
    return dummy;
  }

  const visuals = THEME_VISUALS[theme] || THEME_VISUALS.classic;

  // 1. Background Radial Gradient
  const grad = ctx.createRadialGradient(128, 128, 10, 128, 128, 140);
  grad.addColorStop(0, visuals.bgGradInner);
  grad.addColorStop(1, visuals.bgBase);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 256);

  // Subtle marble / obsidian reflection lines if obsidian
  if (theme === 'obsidian') {
    ctx.strokeStyle = 'rgba(245, 185, 32, 0.12)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(20, 40);
    ctx.bezierCurveTo(80, 110, 140, 70, 230, 220);
    ctx.stroke();
  }

  // 2. Beveled Inset Geometric Border
  ctx.strokeStyle = visuals.borderColor;
  ctx.lineWidth = 6;
  ctx.beginPath();

  if (shape === 'triangle') {
    // Equilateral triangle pointing up
    ctx.moveTo(128, 20);
    ctx.lineTo(236, 226);
    ctx.lineTo(20, 226);
    ctx.closePath();
  } else if (shape === 'pentagon') {
    // Regular pentagon
    const r = 106;
    for (let i = 0; i < 5; i++) {
      const angle = (i * 2 * Math.PI) / 5 - Math.PI / 2;
      const x = 128 + r * Math.cos(angle);
      const y = 128 + r * Math.sin(angle);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
  } else if (shape === 'kite') {
    ctx.moveTo(128, 18);
    ctx.lineTo(238, 118);
    ctx.lineTo(128, 238);
    ctx.lineTo(18, 118);
    ctx.closePath();
  } else {
    // square
    ctx.strokeRect(14, 14, 228, 228);
  }
  ctx.stroke();

  // 3. Number Label
  ctx.fillStyle = visuals.textColor;
  ctx.shadowColor = visuals.textShadow;
  ctx.shadowBlur = 8;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Position label depending on shape
  let centerY = 128;
  if (shape === 'triangle') {
    // Triangles have centroid lower
    centerY = 146;
  } else if (shape === 'kite') {
    centerY = 132;
  }

  const fontSize = label.length > 2 ? 64 : label.length === 2 ? 80 : 96;
  ctx.font = `bold ${fontSize}px "JetBrains Mono", Inter, sans-serif`;

  ctx.fillText(label, 128, centerY);

  // Add dot under 6 and 9 to prevent ambiguity
  if (label === '6' || label === '9') {
    ctx.beginPath();
    ctx.arc(128, centerY + (fontSize / 2) + 8, 5, 0, Math.PI * 2);
    ctx.fillStyle = visuals.textColor;
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  textureCache.set(cacheKey, texture);
  return texture;
}

export function createFaceMaterials(
  labels: string[],
  theme: DiceTheme = 'classic',
  shape: 'square' | 'triangle' | 'pentagon' | 'kite' = 'triangle'
): THREE.MeshStandardMaterial[] {
  const visuals = THEME_VISUALS[theme] || THEME_VISUALS.classic;

  return labels.map((label) => {
    const map = createFaceTexture(label, theme, shape);
    return new THREE.MeshStandardMaterial({
      map,
      roughness: visuals.roughness,
      metalness: visuals.metalness,
      color: 0xffffff,
    });
  });
}
