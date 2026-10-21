/**
 * Procedural Token Generator Engine (No AI Dependency)
 * 100% Offline Canvas2D Paper-Doll & Heraldry Compositor
 *
 * Provides:
 * - Multi-layer Paper-Doll system: Background, Silhouette/Body, Armor, Weapon, Head Feature, Effect, Frame
 * - Heraldry & Mob Pack Generator: Faction emblems, faction colors, and large sequence badges (1..10 / I..X)
 * - 1-Click dice roll randomizer
 */

import { TokenFrameId, drawTokenFrame, getFrameDefinition } from './tokenFrames';

export type SilhouetteType =
  | 'humanoid'
  | 'skeleton'
  | 'beast_wolf'
  | 'dragon'
  | 'orc'
  | 'goblin'
  | 'robot'
  | 'slime';

export type ArmorType =
  | 'none'
  | 'plate'
  | 'leather'
  | 'mage_robes'
  | 'rags';

export type WeaponType =
  | 'none'
  | 'sword'
  | 'mage_staff'
  | 'bow'
  | 'shield'
  | 'spellbook'
  | 'dagger';

export type HeadFeatureType =
  | 'none'
  | 'tiefling_horns'
  | 'dwarf_beard'
  | 'orc_tusks'
  | 'hood'
  | 'helm';

export type EffectType =
  | 'none'
  | 'magic_glow'
  | 'flames'
  | 'lightning';

export type BackgroundPattern =
  | 'radial_gradient'
  | 'runic_circle'
  | 'faction_solid'
  | 'cross_hatch';

export interface PaperDollConfig {
  backgroundPattern: BackgroundPattern;
  backgroundColor: string;
  accentColor: string;
  silhouette: SilhouetteType;
  silhouetteColor: string;
  armor: ArmorType;
  armorColor: string;
  weapon: WeaponType;
  weaponColor: string;
  headFeature: HeadFeatureType;
  headFeatureColor: string;
  effect: EffectType;
  effectColor: string;
  frameId: TokenFrameId;
  glowIntensity?: number;
}

export type HeraldrySign =
  | 'skull'
  | 'wolf_paw'
  | 'crossed_swords'
  | 'dragon'
  | 'eye'
  | 'shield'
  | 'flame';

export type HeraldryNumberFormat = 'arabic' | 'roman' | 'none';

export interface HeraldryConfig {
  sign: HeraldrySign;
  factionColor: string;
  backgroundColor: string;
  badgeNumber?: number; // 1..10
  numberFormat: HeraldryNumberFormat;
  frameId: TokenFrameId;
  glowIntensity?: number;
}

export const FACTION_COLOR_PALETTE = [
  { id: 'red', name: 'Красный (Враг)', hex: '#ef4444' },
  { id: 'blue', name: 'Синий (Союзник)', hex: '#3b82f6' },
  { id: 'green', name: 'Зелёный (Природа)', hex: '#22c55e' },
  { id: 'amber', name: 'Янтарный (Нейтрал)', hex: '#f59e0b' },
  { id: 'purple', name: 'Фиолетовый (Босс)', hex: '#a855f7' },
  { id: 'cyan', name: 'Бирюзовый (Магия)', hex: '#06b6d4' },
];

export const SILHOUETTE_OPTIONS: Array<{ id: SilhouetteType; name: string }> = [
  { id: 'humanoid', name: 'Гуманоид / Воин' },
  { id: 'skeleton', name: 'Скелет / Нежить' },
  { id: 'beast_wolf', name: 'Зверь / Волк' },
  { id: 'dragon', name: 'Дракон / Виверна' },
  { id: 'orc', name: 'Орк / Громила' },
  { id: 'goblin', name: 'Гоблин / Плут' },
  { id: 'robot', name: 'Кованый / Голем' },
  { id: 'slime', name: 'Слизь / Аморф' },
];

export const ARMOR_OPTIONS: Array<{ id: ArmorType; name: string }> = [
  { id: 'none', name: 'Без доспеха' },
  { id: 'plate', name: 'Латный доспех' },
  { id: 'leather', name: 'Кожаный доспех' },
  { id: 'mage_robes', name: 'Мантия мага' },
  { id: 'rags', name: 'Лохмотья' },
];

export const WEAPON_OPTIONS: Array<{ id: WeaponType; name: string }> = [
  { id: 'none', name: 'Без оружия' },
  { id: 'sword', name: 'Меч' },
  { id: 'mage_staff', name: 'Посох мага' },
  { id: 'bow', name: 'Лук' },
  { id: 'shield', name: 'Щит' },
  { id: 'spellbook', name: 'Книга заклинаний' },
  { id: 'dagger', name: 'Кинжал' },
];

export const HEAD_FEATURE_OPTIONS: Array<{ id: HeadFeatureType; name: string }> = [
  { id: 'none', name: 'Без черт' },
  { id: 'tiefling_horns', name: 'Рога тифлинга' },
  { id: 'dwarf_beard', name: 'Борода дварфа' },
  { id: 'orc_tusks', name: 'Клыки орка' },
  { id: 'hood', name: 'Капюшон' },
  { id: 'helm', name: 'Шлем' },
];

export const EFFECT_OPTIONS: Array<{ id: EffectType; name: string }> = [
  { id: 'none', name: 'Без эффекта' },
  { id: 'magic_glow', name: 'Магическое свечение' },
  { id: 'flames', name: 'Языки пламени' },
  { id: 'lightning', name: 'Молнии' },
];

export const HERALDRY_SIGN_OPTIONS: Array<{ id: HeraldrySign; name: string }> = [
  { id: 'skull', name: 'Череп' },
  { id: 'wolf_paw', name: 'Волчья лапа' },
  { id: 'crossed_swords', name: 'Скрещенные клинки' },
  { id: 'dragon', name: 'Дракон' },
  { id: 'eye', name: 'Всевидящее око' },
  { id: 'shield', name: 'Геральдический щит' },
  { id: 'flame', name: 'Пламя' },
];

const ROMAN_NUMERALS: Record<number, string> = {
  1: 'I',
  2: 'II',
  3: 'III',
  4: 'IV',
  5: 'V',
  6: 'VI',
  7: 'VII',
  8: 'VIII',
  9: 'IX',
  10: 'X',
};

/**
 * 1-Click Random Paper-Doll Configuration
 */
export function randomProceduralTokenConfig(): PaperDollConfig {
  const silhouettes: SilhouetteType[] = [
    'humanoid',
    'skeleton',
    'beast_wolf',
    'dragon',
    'orc',
    'goblin',
    'robot',
    'slime',
  ];
  const armors: ArmorType[] = ['none', 'plate', 'leather', 'mage_robes', 'rags'];
  const weapons: WeaponType[] = ['none', 'sword', 'mage_staff', 'bow', 'shield', 'spellbook', 'dagger'];
  const heads: HeadFeatureType[] = ['none', 'tiefling_horns', 'dwarf_beard', 'orc_tusks', 'hood', 'helm'];
  const effects: EffectType[] = ['none', 'magic_glow', 'flames', 'lightning'];
  const patterns: BackgroundPattern[] = ['radial_gradient', 'runic_circle', 'cross_hatch'];
  const frames: TokenFrameId[] = [
    'gold-runic',
    'dwarf-stone',
    'fire-arcane',
    'rose-thorn',
    'bone-skulls',
    'cyber-neon',
    'knight-steel',
  ];

  const colors = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4', '#ec4899'];
  const bgDarks = ['#0f172a', '#18181b', '#1c1917', '#082f49', '#142a1f', '#2a1420'];

  const pick = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

  return {
    backgroundPattern: pick(patterns),
    backgroundColor: pick(bgDarks),
    accentColor: pick(colors),
    silhouette: pick(silhouettes),
    silhouetteColor: '#cbd5e1',
    armor: pick(armors),
    armorColor: '#94a3b8',
    weapon: pick(weapons),
    weaponColor: '#e2e8f0',
    headFeature: pick(heads),
    headFeatureColor: '#cbd5e1',
    effect: pick(effects),
    effectColor: pick(colors),
    frameId: pick(frames),
    glowIntensity: 60,
  };
}

/**
 * 1-Click Random Heraldry Configuration
 */
export function randomHeraldryConfig(): HeraldryConfig {
  const signs: HeraldrySign[] = [
    'skull',
    'wolf_paw',
    'crossed_swords',
    'dragon',
    'eye',
    'shield',
    'flame',
  ];
  const factionColors = ['#ef4444', '#3b82f6', '#22c55e', '#f59e0b', '#a855f7'];
  const frames: TokenFrameId[] = [
    'gold-runic',
    'knight-steel',
    'bone-skulls',
    'fire-arcane',
    'dwarf-stone',
  ];

  const pick = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

  return {
    sign: pick(signs),
    factionColor: pick(factionColors),
    backgroundColor: '#0c0e14',
    badgeNumber: Math.floor(Math.random() * 5) + 1,
    numberFormat: Math.random() > 0.5 ? 'arabic' : 'roman',
    frameId: pick(frames),
    glowIntensity: 50,
  };
}

/**
 * Renders a full Paper-Doll procedural token onto a canvas.
 */
export function renderProceduralToken(canvas: HTMLCanvasElement, config: PaperDollConfig): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const size = canvas.width;
  const s = size / 512;
  const cx = size / 2;
  const cy = size / 2;

  ctx.clearRect(0, 0, size, size);

  const frameDef = getFrameDefinition(config.frameId);
  const innerRadius = (size / 2) * frameDef.innerRadiusRatio;

  // Clip content inside the frame ring
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, innerRadius, 0, Math.PI * 2);
  ctx.clip();

  // 1. Background Layer
  drawBackgroundLayer(ctx, cx, cy, innerRadius, config, s);

  // 2. Effect Underlay (e.g. ambient aura behind body)
  if (config.effect === 'magic_glow') {
    drawMagicGlowUnderlay(ctx, cx, cy, innerRadius, config.effectColor, s);
  }

  // 3. Silhouette / Body Layer
  drawSilhouetteLayer(ctx, cx, cy, config.silhouette, config.silhouetteColor, s);

  // 4. Armor Layer
  if (config.armor !== 'none') {
    drawArmorLayer(ctx, cx, cy, config.armor, config.armorColor, s);
  }

  // 5. Head Feature Layer
  if (config.headFeature !== 'none') {
    drawHeadFeatureLayer(ctx, cx, cy, config.headFeature, config.headFeatureColor, s);
  }

  // 6. Weapon Layer
  if (config.weapon !== 'none') {
    drawWeaponLayer(ctx, cx, cy, config.weapon, config.weaponColor, s);
  }

  // 7. Foreground Effect Overlay (flames, lightning, magic sparks)
  if (config.effect !== 'none') {
    drawEffectOverlay(ctx, cx, cy, innerRadius, config.effect, config.effectColor, s);
  }

  ctx.restore();

  // 8. Final Frame Layer
  drawTokenFrame(ctx, size, config.frameId, {
    factionColor: config.accentColor,
    glowIntensity: config.glowIntensity ?? 50,
  });
}

/**
 * Renders a Heraldry & Mob Pack token onto a canvas.
 */
export function renderHeraldryToken(canvas: HTMLCanvasElement, config: HeraldryConfig): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const size = canvas.width;
  const s = size / 512;
  const cx = size / 2;
  const cy = size / 2;

  ctx.clearRect(0, 0, size, size);

  const frameDef = getFrameDefinition(config.frameId);
  const innerRadius = (size / 2) * frameDef.innerRadiusRatio;

  // Clip content inside the frame ring
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, innerRadius, 0, Math.PI * 2);
  ctx.clip();

  // Background
  const grad = ctx.createRadialGradient(cx, cy, 10 * s, cx, cy, innerRadius);
  grad.addColorStop(0, '#1a2230');
  grad.addColorStop(0.7, config.backgroundColor || '#0c0e14');
  grad.addColorStop(1, '#05070a');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  // Heraldic Shield / Crest Backing
  ctx.save();
  ctx.strokeStyle = config.factionColor;
  ctx.lineWidth = 3 * s;
  ctx.shadowColor = config.factionColor;
  ctx.shadowBlur = 14 * s;
  ctx.beginPath();
  ctx.arc(cx, cy, innerRadius * 0.88, 0, Math.PI * 2);
  ctx.stroke();

  // Subtle runic ticks
  ctx.lineWidth = 1.5 * s;
  ctx.setLineDash([4 * s, 8 * s]);
  ctx.beginPath();
  ctx.arc(cx, cy, innerRadius * 0.78, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();

  // Draw the selected Heraldic Sign at center
  drawHeraldrySign(ctx, cx, cy, config.sign, config.factionColor, s);

  ctx.restore();

  // Final Frame Layer
  drawTokenFrame(ctx, size, config.frameId, {
    factionColor: config.factionColor,
    glowIntensity: config.glowIntensity ?? 50,
  });

  // Large Sequence Number Badge (1..10 / I..X) in the corner
  if (config.badgeNumber && config.badgeNumber > 0 && config.numberFormat !== 'none') {
    drawMobBadge(
      ctx,
      size,
      config.badgeNumber,
      config.numberFormat,
      config.factionColor,
      s
    );
  }
}

/**
 * Converts a PaperDoll or Heraldry config directly to a Base64 data:image/png URL.
 */
export function proceduralToDataUrl(
  config: PaperDollConfig | HeraldryConfig,
  size = 512
): string {
  if (typeof document === 'undefined') {
    return 'data:image/png;base64,';
  }

  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;

  if ('silhouette' in config) {
    renderProceduralToken(canvas, config as PaperDollConfig);
  } else {
    renderHeraldryToken(canvas, config as HeraldryConfig);
  }

  return canvas.toDataURL('image/png');
}

/* ========================================================================= */
/* DRAWING LAYERS: BACKGROUND                                                */
/* ========================================================================= */

function drawBackgroundLayer(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  config: PaperDollConfig,
  s: number
) {
  // Base background fill
  const grad = ctx.createRadialGradient(cx, cy, 20 * s, cx, cy, r);
  grad.addColorStop(0, config.accentColor + '33');
  grad.addColorStop(0.5, config.backgroundColor);
  grad.addColorStop(1, '#05070b');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, cx * 2, cy * 2);

  if (config.backgroundPattern === 'runic_circle') {
    ctx.save();
    ctx.strokeStyle = config.accentColor;
    ctx.lineWidth = 1.5 * s;
    ctx.globalAlpha = 0.35;
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.72, 0, Math.PI * 2);
    ctx.arc(cx, cy, r * 0.52, 0, Math.PI * 2);
    ctx.stroke();

    // 8 radial lines
    for (let i = 0; i < 8; i++) {
      const angle = (i * Math.PI) / 4;
      const x1 = cx + Math.cos(angle) * (r * 0.52);
      const y1 = cy + Math.sin(angle) * (r * 0.52);
      const x2 = cx + Math.cos(angle) * (r * 0.72);
      const y2 = cy + Math.sin(angle) * (r * 0.72);
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }
    ctx.restore();
  } else if (config.backgroundPattern === 'cross_hatch') {
    ctx.save();
    ctx.strokeStyle = config.accentColor;
    ctx.lineWidth = 1 * s;
    ctx.globalAlpha = 0.12;
    for (let x = -r; x <= r; x += 32 * s) {
      ctx.beginPath();
      ctx.moveTo(cx + x, cy - r);
      ctx.lineTo(cx + x + r, cy + r);
      ctx.stroke();
    }
    ctx.restore();
  }
}

/* ========================================================================= */
/* DRAWING LAYERS: SILHOUETTES / BODIES                                      */
/* ========================================================================= */

function drawSilhouetteLayer(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  type: SilhouetteType,
  color: string,
  s: number
) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 3 * s;

  switch (type) {
    case 'humanoid':
      drawHumanoidBody(ctx, cx, cy, s);
      break;
    case 'skeleton':
      drawSkeletonBody(ctx, cx, cy, s);
      break;
    case 'beast_wolf':
      drawWolfBody(ctx, cx, cy, s);
      break;
    case 'dragon':
      drawDragonBody(ctx, cx, cy, s);
      break;
    case 'orc':
      drawOrcBody(ctx, cx, cy, s);
      break;
    case 'goblin':
      drawGoblinBody(ctx, cx, cy, s);
      break;
    case 'robot':
      drawRobotBody(ctx, cx, cy, s);
      break;
    case 'slime':
      drawSlimeBody(ctx, cx, cy, s);
      break;
  }

  ctx.restore();
}

function drawHumanoidBody(ctx: CanvasRenderingContext2D, cx: number, cy: number, s: number) {
  // Head
  ctx.beginPath();
  ctx.arc(cx, cy - 80 * s, 42 * s, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Neck
  ctx.beginPath();
  ctx.moveTo(cx - 16 * s, cy - 45 * s);
  ctx.lineTo(cx + 16 * s, cy - 45 * s);
  ctx.lineTo(cx + 20 * s, cy - 20 * s);
  ctx.lineTo(cx - 20 * s, cy - 20 * s);
  ctx.closePath();
  ctx.fill();

  // Shoulders and Torso
  ctx.beginPath();
  ctx.moveTo(cx - 20 * s, cy - 20 * s);
  ctx.lineTo(cx - 95 * s, cy + 15 * s);
  ctx.lineTo(cx - 80 * s, cy + 150 * s);
  ctx.lineTo(cx + 80 * s, cy + 150 * s);
  ctx.lineTo(cx + 95 * s, cy + 15 * s);
  ctx.lineTo(cx + 20 * s, cy - 20 * s);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}

function drawSkeletonBody(ctx: CanvasRenderingContext2D, cx: number, cy: number, s: number) {
  // Skull
  ctx.beginPath();
  ctx.arc(cx, cy - 85 * s, 38 * s, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Jaw
  ctx.beginPath();
  ctx.rect(cx - 18 * s, cy - 55 * s, 36 * s, 22 * s);
  ctx.fill();
  ctx.stroke();

  // Eye Sockets
  ctx.save();
  ctx.fillStyle = '#090d16';
  ctx.beginPath();
  ctx.ellipse(cx - 14 * s, cy - 85 * s, 10 * s, 12 * s, 0, 0, Math.PI * 2);
  ctx.ellipse(cx + 14 * s, cy - 85 * s, 10 * s, 12 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  // Nose cavity
  ctx.beginPath();
  ctx.moveTo(cx, cy - 70 * s);
  ctx.lineTo(cx - 5 * s, cy - 60 * s);
  ctx.lineTo(cx + 5 * s, cy - 60 * s);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // Spine
  ctx.lineWidth = 14 * s;
  ctx.beginPath();
  ctx.moveTo(cx, cy - 30 * s);
  ctx.lineTo(cx, cy + 140 * s);
  ctx.stroke();

  // Ribs
  ctx.lineWidth = 6 * s;
  for (let i = 0; i < 4; i++) {
    const y = cy + (10 + i * 26) * s;
    const w = (65 - i * 8) * s;
    ctx.beginPath();
    ctx.moveTo(cx - w, y + 8 * s);
    ctx.quadraticCurveTo(cx, y - 6 * s, cx + w, y + 8 * s);
    ctx.stroke();
  }
}

function drawWolfBody(ctx: CanvasRenderingContext2D, cx: number, cy: number, s: number) {
  // Lupine head and ears
  ctx.beginPath();
  // Left ear
  ctx.moveTo(cx - 30 * s, cy - 70 * s);
  ctx.lineTo(cx - 65 * s, cy - 145 * s);
  ctx.lineTo(cx - 10 * s, cy - 100 * s);
  // Head top
  ctx.lineTo(cx + 10 * s, cy - 100 * s);
  // Right ear
  ctx.lineTo(cx + 65 * s, cy - 145 * s);
  ctx.lineTo(cx + 30 * s, cy - 70 * s);
  // Jaw and snout
  ctx.lineTo(cx + 55 * s, cy - 20 * s);
  ctx.lineTo(cx + 25 * s, cy + 15 * s);
  // Snout tip
  ctx.lineTo(cx, cy + 25 * s);
  ctx.lineTo(cx - 25 * s, cy + 15 * s);
  ctx.lineTo(cx - 55 * s, cy - 20 * s);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Neck ruff / shoulders
  ctx.beginPath();
  ctx.moveTo(cx - 55 * s, cy - 20 * s);
  ctx.lineTo(cx - 110 * s, cy + 60 * s);
  ctx.lineTo(cx - 90 * s, cy + 150 * s);
  ctx.lineTo(cx + 90 * s, cy + 150 * s);
  ctx.lineTo(cx + 110 * s, cy + 60 * s);
  ctx.lineTo(cx + 55 * s, cy - 20 * s);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Glowing eyes
  ctx.save();
  ctx.fillStyle = '#f59e0b';
  ctx.beginPath();
  ctx.ellipse(cx - 22 * s, cy - 60 * s, 8 * s, 5 * s, -0.2, 0, Math.PI * 2);
  ctx.ellipse(cx + 22 * s, cy - 60 * s, 8 * s, 5 * s, 0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawDragonBody(ctx: CanvasRenderingContext2D, cx: number, cy: number, s: number) {
  // Horns
  ctx.beginPath();
  ctx.moveTo(cx - 25 * s, cy - 90 * s);
  ctx.quadraticCurveTo(cx - 85 * s, cy - 150 * s, cx - 110 * s, cy - 140 * s);
  ctx.quadraticCurveTo(cx - 70 * s, cy - 100 * s, cx - 35 * s, cy - 70 * s);
  ctx.moveTo(cx + 25 * s, cy - 90 * s);
  ctx.quadraticCurveTo(cx + 85 * s, cy - 150 * s, cx + 110 * s, cy - 140 * s);
  ctx.quadraticCurveTo(cx + 70 * s, cy - 100 * s, cx + 35 * s, cy - 70 * s);
  ctx.fill();
  ctx.stroke();

  // Reptilian Head
  ctx.beginPath();
  ctx.moveTo(cx - 35 * s, cy - 70 * s);
  ctx.lineTo(cx + 35 * s, cy - 70 * s);
  ctx.lineTo(cx + 45 * s, cy - 20 * s);
  ctx.lineTo(cx + 20 * s, cy + 30 * s);
  ctx.lineTo(cx - 20 * s, cy + 30 * s);
  ctx.lineTo(cx - 45 * s, cy - 20 * s);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Neck with scales
  ctx.beginPath();
  ctx.moveTo(cx - 40 * s, cy + 10 * s);
  ctx.lineTo(cx - 90 * s, cy + 150 * s);
  ctx.lineTo(cx + 90 * s, cy + 150 * s);
  ctx.lineTo(cx + 40 * s, cy + 10 * s);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Slit eyes
  ctx.save();
  ctx.fillStyle = '#ef4444';
  ctx.beginPath();
  ctx.ellipse(cx - 20 * s, cy - 40 * s, 9 * s, 4 * s, -0.3, 0, Math.PI * 2);
  ctx.ellipse(cx + 20 * s, cy - 40 * s, 9 * s, 4 * s, 0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawOrcBody(ctx: CanvasRenderingContext2D, cx: number, cy: number, s: number) {
  // Heavy broad jaw head
  ctx.beginPath();
  ctx.arc(cx, cy - 75 * s, 46 * s, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Heavy square lower jaw
  ctx.beginPath();
  ctx.rect(cx - 32 * s, cy - 45 * s, 64 * s, 35 * s);
  ctx.fill();
  ctx.stroke();

  // Colossal Shoulders
  ctx.beginPath();
  ctx.moveTo(cx - 35 * s, cy - 25 * s);
  ctx.lineTo(cx - 125 * s, cy + 10 * s);
  ctx.lineTo(cx - 110 * s, cy + 150 * s);
  ctx.lineTo(cx + 110 * s, cy + 150 * s);
  ctx.lineTo(cx + 125 * s, cy + 10 * s);
  ctx.lineTo(cx + 35 * s, cy - 25 * s);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Tusks by default on base orc
  ctx.save();
  ctx.fillStyle = '#f8fafc';
  ctx.beginPath();
  ctx.moveTo(cx - 22 * s, cy - 10 * s);
  ctx.lineTo(cx - 18 * s, cy - 35 * s);
  ctx.lineTo(cx - 14 * s, cy - 10 * s);
  ctx.moveTo(cx + 14 * s, cy - 10 * s);
  ctx.lineTo(cx + 18 * s, cy - 35 * s);
  ctx.lineTo(cx + 22 * s, cy - 10 * s);
  ctx.fill();
  ctx.restore();
}

function drawGoblinBody(ctx: CanvasRenderingContext2D, cx: number, cy: number, s: number) {
  // Huge pointed lateral ears
  ctx.beginPath();
  ctx.moveTo(cx - 25 * s, cy - 70 * s);
  ctx.lineTo(cx - 115 * s, cy - 65 * s);
  ctx.lineTo(cx - 30 * s, cy - 45 * s);
  ctx.moveTo(cx + 25 * s, cy - 70 * s);
  ctx.lineTo(cx + 115 * s, cy - 65 * s);
  ctx.lineTo(cx + 30 * s, cy - 45 * s);
  ctx.fill();
  ctx.stroke();

  // Small angular head
  ctx.beginPath();
  ctx.arc(cx, cy - 70 * s, 35 * s, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Pointed chin
  ctx.beginPath();
  ctx.moveTo(cx - 20 * s, cy - 45 * s);
  ctx.lineTo(cx, cy - 20 * s);
  ctx.lineTo(cx + 20 * s, cy - 45 * s);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Slender shoulders
  ctx.beginPath();
  ctx.moveTo(cx - 15 * s, cy - 20 * s);
  ctx.lineTo(cx - 75 * s, cy + 20 * s);
  ctx.lineTo(cx - 65 * s, cy + 150 * s);
  ctx.lineTo(cx + 65 * s, cy + 150 * s);
  ctx.lineTo(cx + 75 * s, cy + 20 * s);
  ctx.lineTo(cx + 15 * s, cy - 20 * s);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Big mischievous yellow eyes
  ctx.save();
  ctx.fillStyle = '#eab308';
  ctx.beginPath();
  ctx.arc(cx - 15 * s, cy - 70 * s, 9 * s, 0, Math.PI * 2);
  ctx.arc(cx + 15 * s, cy - 70 * s, 9 * s, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawRobotBody(ctx: CanvasRenderingContext2D, cx: number, cy: number, s: number) {
  // Hexagonal forged head
  ctx.beginPath();
  ctx.moveTo(cx - 25 * s, cy - 115 * s);
  ctx.lineTo(cx + 25 * s, cy - 115 * s);
  ctx.lineTo(cx + 42 * s, cy - 80 * s);
  ctx.lineTo(cx + 25 * s, cy - 45 * s);
  ctx.lineTo(cx - 25 * s, cy - 45 * s);
  ctx.lineTo(cx - 42 * s, cy - 80 * s);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Optic visor
  ctx.save();
  ctx.fillStyle = '#06b6d4';
  ctx.shadowColor = '#06b6d4';
  ctx.shadowBlur = 10 * s;
  ctx.fillRect(cx - 28 * s, cy - 85 * s, 56 * s, 10 * s);
  ctx.restore();

  // Angular plate shoulders
  ctx.beginPath();
  ctx.moveTo(cx - 20 * s, cy - 40 * s);
  ctx.lineTo(cx - 105 * s, cy - 5 * s);
  ctx.lineTo(cx - 95 * s, cy + 150 * s);
  ctx.lineTo(cx + 95 * s, cy + 150 * s);
  ctx.lineTo(cx + 105 * s, cy - 5 * s);
  ctx.lineTo(cx + 20 * s, cy - 40 * s);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Chest panel line
  ctx.beginPath();
  ctx.moveTo(cx - 45 * s, cy + 40 * s);
  ctx.lineTo(cx + 45 * s, cy + 40 * s);
  ctx.lineTo(cx, cy + 85 * s);
  ctx.closePath();
  ctx.stroke();
}

function drawSlimeBody(ctx: CanvasRenderingContext2D, cx: number, cy: number, s: number) {
  // Wobbly translucent slime dome
  ctx.save();
  ctx.globalAlpha = 0.85;
  ctx.beginPath();
  ctx.moveTo(cx - 110 * s, cy + 140 * s);
  ctx.bezierCurveTo(cx - 120 * s, cy + 20 * s, cx - 80 * s, cy - 90 * s, cx, cy - 90 * s);
  ctx.bezierCurveTo(cx + 80 * s, cy - 90 * s, cx + 120 * s, cy + 20 * s, cx + 110 * s, cy + 140 * s);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Inner floating core orb
  ctx.fillStyle = '#f43f5e';
  ctx.shadowColor = '#f43f5e';
  ctx.shadowBlur = 16 * s;
  ctx.beginPath();
  ctx.arc(cx, cy + 20 * s, 26 * s, 0, Math.PI * 2);
  ctx.fill();

  // Shiny light reflection bubbles
  ctx.fillStyle = '#ffffff';
  ctx.globalAlpha = 0.6;
  ctx.beginPath();
  ctx.ellipse(cx - 40 * s, cy - 45 * s, 16 * s, 8 * s, -0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/* ========================================================================= */
/* DRAWING LAYERS: ARMOR / OUTFITS                                           */
/* ========================================================================= */

function drawArmorLayer(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  armor: ArmorType,
  color: string,
  s: number
) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 2.5 * s;

  if (armor === 'plate') {
    // Gorget collar
    ctx.beginPath();
    ctx.arc(cx, cy - 20 * s, 32 * s, 0, Math.PI);
    ctx.fill();
    ctx.stroke();

    // Heavy Pauldrons
    ctx.beginPath();
    ctx.arc(cx - 85 * s, cy + 15 * s, 28 * s, 0, Math.PI * 2);
    ctx.arc(cx + 85 * s, cy + 15 * s, 28 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Breastplate with center ridge
    ctx.beginPath();
    ctx.moveTo(cx - 65 * s, cy + 10 * s);
    ctx.lineTo(cx, cy + 90 * s);
    ctx.lineTo(cx + 65 * s, cy + 10 * s);
    ctx.lineTo(cx + 50 * s, cy + 145 * s);
    ctx.lineTo(cx - 50 * s, cy + 145 * s);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Steel highlight line down the middle
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2 * s;
    ctx.beginPath();
    ctx.moveTo(cx, cy + 10 * s);
    ctx.lineTo(cx, cy + 130 * s);
    ctx.stroke();
  } else if (armor === 'leather') {
    // Leather studded cuirass
    ctx.beginPath();
    ctx.moveTo(cx - 60 * s, cy + 10 * s);
    ctx.lineTo(cx + 60 * s, cy + 10 * s);
    ctx.lineTo(cx + 50 * s, cy + 140 * s);
    ctx.lineTo(cx - 50 * s, cy + 140 * s);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Diagonal harness belt
    ctx.strokeStyle = '#451a03';
    ctx.lineWidth = 14 * s;
    ctx.beginPath();
    ctx.moveTo(cx - 60 * s, cy + 10 * s);
    ctx.lineTo(cx + 45 * s, cy + 130 * s);
    ctx.stroke();

    // Brass buckle
    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(cx - 12 * s, cy + 60 * s, 24 * s, 18 * s);
  } else if (armor === 'mage_robes') {
    // Cowl neckline and draped mantle
    ctx.beginPath();
    ctx.moveTo(cx - 85 * s, cy + 20 * s);
    ctx.lineTo(cx - 25 * s, cy + 50 * s);
    ctx.lineTo(cx + 25 * s, cy + 50 * s);
    ctx.lineTo(cx + 85 * s, cy + 20 * s);
    ctx.lineTo(cx + 70 * s, cy + 145 * s);
    ctx.lineTo(cx - 70 * s, cy + 145 * s);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Golden runic trim
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 3 * s;
    ctx.beginPath();
    ctx.moveTo(cx - 30 * s, cy + 50 * s);
    ctx.lineTo(cx, cy + 90 * s);
    ctx.lineTo(cx + 30 * s, cy + 50 * s);
    ctx.stroke();

    // Arcane talisman
    ctx.fillStyle = '#38bdf8';
    ctx.beginPath();
    ctx.arc(cx, cy + 70 * s, 8 * s, 0, Math.PI * 2);
    ctx.fill();
  } else if (armor === 'rags') {
    // Torn asymmetrical rags
    ctx.beginPath();
    ctx.moveTo(cx - 70 * s, cy + 20 * s);
    ctx.lineTo(cx + 70 * s, cy + 15 * s);
    ctx.lineTo(cx + 55 * s, cy + 130 * s);
    ctx.lineTo(cx + 20 * s, cy + 145 * s);
    ctx.lineTo(cx - 15 * s, cy + 120 * s);
    ctx.lineTo(cx - 60 * s, cy + 140 * s);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  ctx.restore();
}

/* ========================================================================= */
/* DRAWING LAYERS: WEAPONS / ITEMS                                           */
/* ========================================================================= */

function drawWeaponLayer(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  weapon: WeaponType,
  color: string,
  s: number
) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 2.5 * s;

  if (weapon === 'sword') {
    // Diagonal longsword across right side
    const wx = cx + 60 * s;
    const wy = cy + 40 * s;

    // Crossguard
    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(wx - 25 * s, wy - 5 * s, 50 * s, 10 * s);

    // Blade
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(wx - 10 * s, wy - 5 * s);
    ctx.lineTo(wx - 7 * s, wy - 160 * s);
    ctx.lineTo(wx, wy - 180 * s);
    ctx.lineTo(wx + 7 * s, wy - 160 * s);
    ctx.lineTo(wx + 10 * s, wy - 5 * s);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Fuller line
    ctx.strokeStyle = '#475569';
    ctx.beginPath();
    ctx.moveTo(wx, wy - 5 * s);
    ctx.lineTo(wx, wy - 140 * s);
    ctx.stroke();

    // Pommel
    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.arc(wx, wy + 30 * s, 8 * s, 0, Math.PI * 2);
    ctx.fill();
  } else if (weapon === 'mage_staff') {
    // Tall arcane staff on right
    const sx = cx + 75 * s;

    // Staff shaft
    ctx.strokeStyle = '#78350f';
    ctx.lineWidth = 9 * s;
    ctx.beginPath();
    ctx.moveTo(sx, cy - 140 * s);
    ctx.lineTo(sx, cy + 145 * s);
    ctx.stroke();

    // Staff head prongs
    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.arc(sx, cy - 145 * s, 20 * s, Math.PI * 0.2, Math.PI * 0.8, true);
    ctx.fill();

    // Glowing crystal / orb
    ctx.fillStyle = '#38bdf8';
    ctx.shadowColor = '#38bdf8';
    ctx.shadowBlur = 18 * s;
    ctx.beginPath();
    ctx.arc(sx, cy - 150 * s, 14 * s, 0, Math.PI * 2);
    ctx.fill();
  } else if (weapon === 'bow') {
    // Recurve bow on left
    const bx = cx - 75 * s;
    ctx.strokeStyle = '#92400e';
    ctx.lineWidth = 6 * s;
    ctx.beginPath();
    ctx.moveTo(bx + 15 * s, cy - 150 * s);
    ctx.quadraticCurveTo(bx - 35 * s, cy, bx + 15 * s, cy + 150 * s);
    ctx.stroke();

    // Bowstring
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1.5 * s;
    ctx.beginPath();
    ctx.moveTo(bx + 15 * s, cy - 150 * s);
    ctx.lineTo(bx + 15 * s, cy + 150 * s);
    ctx.stroke();
  } else if (weapon === 'shield') {
    // Heater shield on left
    const shx = cx - 65 * s;
    const shy = cy + 40 * s;
    ctx.beginPath();
    ctx.moveTo(shx - 35 * s, shy - 50 * s);
    ctx.lineTo(shx + 35 * s, shy - 50 * s);
    ctx.lineTo(shx + 35 * s, shy + 15 * s);
    ctx.quadraticCurveTo(shx, shy + 60 * s, shx, shy + 75 * s);
    ctx.quadraticCurveTo(shx, shy + 60 * s, shx - 35 * s, shy + 15 * s);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Heraldic boss / cross
    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.arc(shx, shy, 12 * s, 0, Math.PI * 2);
    ctx.fill();
  } else if (weapon === 'spellbook') {
    // Open grimoire at chest
    ctx.fillStyle = '#7c2d12';
    ctx.fillRect(cx - 36 * s, cy + 40 * s, 72 * s, 48 * s);
    ctx.fillStyle = '#fef08a';
    ctx.fillRect(cx - 32 * s, cy + 44 * s, 30 * s, 40 * s);
    ctx.fillRect(cx + 2 * s, cy + 44 * s, 30 * s, 40 * s);
    // Arcane glyph
    ctx.strokeStyle = '#6366f1';
    ctx.beginPath();
    ctx.moveTo(cx - 18 * s, cy + 64 * s);
    ctx.lineTo(cx - 6 * s, cy + 64 * s);
    ctx.moveTo(cx + 6 * s, cy + 64 * s);
    ctx.lineTo(cx + 18 * s, cy + 64 * s);
    ctx.stroke();
  } else if (weapon === 'dagger') {
    // Sleek dagger held ready
    const dx = cx + 55 * s;
    const dy = cy + 50 * s;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(dx - 6 * s, dy);
    ctx.lineTo(dx, dy - 60 * s);
    ctx.lineTo(dx + 6 * s, dy);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  ctx.restore();
}

/* ========================================================================= */
/* DRAWING LAYERS: HEAD FEATURES                                             */
/* ========================================================================= */

function drawHeadFeatureLayer(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  feature: HeadFeatureType,
  color: string,
  s: number
) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 2.5 * s;

  if (feature === 'tiefling_horns') {
    // Curved ram horns sweeping up & back
    ctx.beginPath();
    ctx.moveTo(cx - 25 * s, cy - 90 * s);
    ctx.quadraticCurveTo(cx - 80 * s, cy - 145 * s, cx - 75 * s, cy - 175 * s);
    ctx.quadraticCurveTo(cx - 50 * s, cy - 130 * s, cx - 20 * s, cy - 80 * s);
    ctx.moveTo(cx + 25 * s, cy - 90 * s);
    ctx.quadraticCurveTo(cx + 80 * s, cy - 145 * s, cx + 75 * s, cy - 175 * s);
    ctx.quadraticCurveTo(cx + 50 * s, cy - 130 * s, cx + 20 * s, cy - 80 * s);
    ctx.fill();
    ctx.stroke();
  } else if (feature === 'dwarf_beard') {
    // Braided dwarven beard covering lower face
    ctx.fillStyle = '#b45309';
    ctx.beginPath();
    ctx.moveTo(cx - 35 * s, cy - 65 * s);
    ctx.lineTo(cx + 35 * s, cy - 65 * s);
    ctx.quadraticCurveTo(cx + 45 * s, cy + 20 * s, cx + 15 * s, cy + 65 * s);
    ctx.lineTo(cx, cy + 75 * s);
    ctx.lineTo(cx - 15 * s, cy + 65 * s);
    ctx.quadraticCurveTo(cx - 45 * s, cy + 20 * s, cx - 35 * s, cy - 65 * s);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Clasp ring
    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(cx - 8 * s, cy + 30 * s, 16 * s, 10 * s);
  } else if (feature === 'orc_tusks') {
    // Sharp tusks jutting up
    ctx.fillStyle = '#f8fafc';
    ctx.beginPath();
    ctx.moveTo(cx - 24 * s, cy - 40 * s);
    ctx.lineTo(cx - 20 * s, cy - 68 * s);
    ctx.lineTo(cx - 15 * s, cy - 40 * s);
    ctx.moveTo(cx + 15 * s, cy - 40 * s);
    ctx.lineTo(cx + 20 * s, cy - 68 * s);
    ctx.lineTo(cx + 24 * s, cy - 40 * s);
    ctx.fill();
    ctx.stroke();
  } else if (feature === 'hood') {
    // Shadow assassin hood over head
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.arc(cx, cy - 82 * s, 48 * s, Math.PI, 0);
    ctx.lineTo(cx + 45 * s, cy - 25 * s);
    ctx.lineTo(cx - 45 * s, cy - 25 * s);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Deep shadow interior
    ctx.fillStyle = '#050811';
    ctx.beginPath();
    ctx.ellipse(cx, cy - 75 * s, 26 * s, 32 * s, 0, 0, Math.PI * 2);
    ctx.fill();

    // Glowing eyes in the dark
    ctx.fillStyle = '#38bdf8';
    ctx.beginPath();
    ctx.arc(cx - 10 * s, cy - 75 * s, 3.5 * s, 0, Math.PI * 2);
    ctx.arc(cx + 10 * s, cy - 75 * s, 3.5 * s, 0, Math.PI * 2);
    ctx.fill();
  } else if (feature === 'helm') {
    // Knight steel greathelm
    ctx.fillStyle = '#64748b';
    ctx.beginPath();
    ctx.moveTo(cx - 38 * s, cy - 125 * s);
    ctx.lineTo(cx + 38 * s, cy - 125 * s);
    ctx.lineTo(cx + 42 * s, cy - 40 * s);
    ctx.lineTo(cx - 42 * s, cy - 40 * s);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Visor eye slits
    ctx.fillStyle = '#090d16';
    ctx.fillRect(cx - 30 * s, cy - 80 * s, 24 * s, 6 * s);
    ctx.fillRect(cx + 6 * s, cy - 80 * s, 24 * s, 6 * s);
  }

  ctx.restore();
}

/* ========================================================================= */
/* DRAWING LAYERS: EFFECTS                                                   */
/* ========================================================================= */

function drawMagicGlowUnderlay(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  _r: number,
  color: string,
  s: number
) {
  ctx.save();
  ctx.shadowColor = color;
  ctx.shadowBlur = 35 * s;
  ctx.fillStyle = color;
  ctx.globalAlpha = 0.45;
  ctx.beginPath();
  ctx.arc(cx, cy - 30 * s, 100 * s, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawEffectOverlay(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  _r: number,
  effect: EffectType,
  color: string,
  s: number
) {
  ctx.save();
  ctx.shadowColor = color;
  ctx.shadowBlur = 18 * s;

  if (effect === 'magic_glow') {
    // Arcane sparkle particles
    ctx.fillStyle = color;
    for (let i = 0; i < 16; i++) {
      const angle = (i * Math.PI) / 8 + 0.2;
      const dist = (70 + (i % 3) * 35) * s;
      const px = cx + Math.cos(angle) * dist;
      const py = cy + Math.sin(angle) * dist;
      ctx.beginPath();
      ctx.arc(px, py, (2.5 + (i % 2) * 2) * s, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (effect === 'flames') {
    // Rising tongues of fire
    ctx.fillStyle = '#f97316';
    for (let i = -3; i <= 3; i++) {
      const fx = cx + i * 28 * s;
      const fy = cy + 120 * s;
      const h = (60 + Math.abs(i) * -8 + ((i + 5) % 3) * 15) * s;
      ctx.beginPath();
      ctx.moveTo(fx - 14 * s, fy);
      ctx.quadraticCurveTo(fx - 6 * s, fy - h * 0.6, fx, fy - h);
      ctx.quadraticCurveTo(fx + 6 * s, fy - h * 0.6, fx + 14 * s, fy);
      ctx.closePath();
      ctx.fill();
    }
    // Inner yellow flame core
    ctx.fillStyle = '#fde047';
    for (let i = -2; i <= 2; i++) {
      const fx = cx + i * 26 * s;
      const fy = cy + 120 * s;
      const h = (40 + ((i + 4) % 2) * 10) * s;
      ctx.beginPath();
      ctx.moveTo(fx - 8 * s, fy);
      ctx.quadraticCurveTo(fx - 4 * s, fy - h * 0.6, fx, fy - h);
      ctx.quadraticCurveTo(fx + 4 * s, fy - h * 0.6, fx + 8 * s, fy);
      ctx.closePath();
      ctx.fill();
    }
  } else if (effect === 'lightning') {
    // Jagged electric arcs
    ctx.strokeStyle = color;
    ctx.lineWidth = 3 * s;
    for (let i = 0; i < 4; i++) {
      const startX = cx + (i % 2 === 0 ? -1 : 1) * 70 * s;
      const startY = cy - 100 * s + i * 50 * s;
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(startX + 20 * s, startY + 25 * s);
      ctx.lineTo(startX - 10 * s, startY + 45 * s);
      ctx.lineTo(startX + 25 * s, startY + 70 * s);
      ctx.stroke();
    }
  }

  ctx.restore();
}

/* ========================================================================= */
/* DRAWING LAYERS: HERALDRY SIGNS & MOB NUMBER BADGE                         */
/* ========================================================================= */

function drawHeraldrySign(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  sign: HeraldrySign,
  color: string,
  s: number
) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 4 * s;
  ctx.shadowColor = color;
  ctx.shadowBlur = 18 * s;

  switch (sign) {
    case 'skull':
      // Skull
      ctx.beginPath();
      ctx.arc(cx, cy - 25 * s, 65 * s, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.beginPath();
      ctx.rect(cx - 30 * s, cy + 25 * s, 60 * s, 40 * s);
      ctx.fill();
      ctx.stroke();

      // Hollow Eye Sockets
      ctx.fillStyle = '#090d16';
      ctx.beginPath();
      ctx.ellipse(cx - 24 * s, cy - 20 * s, 16 * s, 20 * s, 0, 0, Math.PI * 2);
      ctx.ellipse(cx + 24 * s, cy - 20 * s, 16 * s, 20 * s, 0, 0, Math.PI * 2);
      ctx.fill();

      // Teeth notches
      ctx.strokeStyle = '#090d16';
      ctx.lineWidth = 4 * s;
      for (let i = -2; i <= 2; i++) {
        ctx.beginPath();
        ctx.moveTo(cx + i * 12 * s, cy + 30 * s);
        ctx.lineTo(cx + i * 12 * s, cy + 60 * s);
        ctx.stroke();
      }
      break;

    case 'wolf_paw':
      // Central pad
      ctx.beginPath();
      ctx.ellipse(cx, cy + 20 * s, 45 * s, 35 * s, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // 4 Toe pads
      const toeOffsets = [
        { x: -50, y: -25 },
        { x: -20, y: -55 },
        { x: 20, y: -55 },
        { x: 50, y: -25 },
      ];
      for (const t of toeOffsets) {
        ctx.beginPath();
        ctx.ellipse(cx + t.x * s, cy + t.y * s, 16 * s, 22 * s, (t.x / 100) * 0.8, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
      break;

    case 'crossed_swords':
      // Crossed swords
      ctx.save();
      for (const angle of [-Math.PI / 4, Math.PI / 4]) {
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(angle);

        // Blade
        ctx.fillStyle = color;
        ctx.fillRect(-8 * s, -110 * s, 16 * s, 170 * s);

        // Crossguard
        ctx.fillStyle = '#f59e0b';
        ctx.fillRect(-30 * s, 60 * s, 60 * s, 12 * s);

        // Pommel
        ctx.beginPath();
        ctx.arc(0, 95 * s, 10 * s, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      ctx.restore();
      break;

    case 'dragon':
      // Dragon Wyrm Profile
      ctx.beginPath();
      ctx.arc(cx - 20 * s, cy - 20 * s, 55 * s, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Snout
      ctx.beginPath();
      ctx.moveTo(cx - 20 * s, cy - 40 * s);
      ctx.lineTo(cx + 60 * s, cy - 10 * s);
      ctx.lineTo(cx + 40 * s, cy + 30 * s);
      ctx.lineTo(cx - 20 * s, cy + 20 * s);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Horn
      ctx.beginPath();
      ctx.moveTo(cx - 50 * s, cy - 50 * s);
      ctx.lineTo(cx - 100 * s, cy - 100 * s);
      ctx.lineTo(cx - 30 * s, cy - 70 * s);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Slit Eye
      ctx.fillStyle = '#090d16';
      ctx.beginPath();
      ctx.ellipse(cx + 10 * s, cy - 15 * s, 10 * s, 4 * s, -0.3, 0, Math.PI * 2);
      ctx.fill();
      break;

    case 'eye':
      // All-seeing eye
      ctx.beginPath();
      ctx.moveTo(cx - 90 * s, cy);
      ctx.quadraticCurveTo(cx, cy - 65 * s, cx + 90 * s, cy);
      ctx.quadraticCurveTo(cx, cy + 65 * s, cx - 90 * s, cy);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Iris
      ctx.fillStyle = '#090d16';
      ctx.beginPath();
      ctx.arc(cx, cy, 32 * s, 0, Math.PI * 2);
      ctx.fill();

      // Cat pupil slit
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.ellipse(cx, cy, 7 * s, 26 * s, 0, 0, Math.PI * 2);
      ctx.fill();
      break;

    case 'shield':
      // Heraldic Shield
      ctx.beginPath();
      ctx.moveTo(cx - 65 * s, cy - 75 * s);
      ctx.lineTo(cx + 65 * s, cy - 75 * s);
      ctx.lineTo(cx + 65 * s, cy + 15 * s);
      ctx.quadraticCurveTo(cx, cy + 85 * s, cx, cy + 100 * s);
      ctx.quadraticCurveTo(cx, cy + 85 * s, cx - 65 * s, cy + 15 * s);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Inner chevron
      ctx.fillStyle = '#090d16';
      ctx.beginPath();
      ctx.moveTo(cx - 35 * s, cy - 45 * s);
      ctx.lineTo(cx, cy - 10 * s);
      ctx.lineTo(cx + 35 * s, cy - 45 * s);
      ctx.lineTo(cx, cy + 30 * s);
      ctx.closePath();
      ctx.fill();
      break;

    case 'flame':
      // Blazing flame
      ctx.beginPath();
      ctx.moveTo(cx, cy - 100 * s);
      ctx.quadraticCurveTo(cx + 50 * s, cy - 40 * s, cx + 60 * s, cy + 30 * s);
      ctx.quadraticCurveTo(cx + 40 * s, cy + 90 * s, cx, cy + 90 * s);
      ctx.quadraticCurveTo(cx - 40 * s, cy + 90 * s, cx - 60 * s, cy + 30 * s);
      ctx.quadraticCurveTo(cx - 50 * s, cy - 40 * s, cx, cy - 100 * s);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Inner flame
      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.moveTo(cx, cy - 40 * s);
      ctx.quadraticCurveTo(cx + 25 * s, cy, cx + 30 * s, cy + 50 * s);
      ctx.quadraticCurveTo(cx, cy + 75 * s, cx - 30 * s, cy + 50 * s);
      ctx.quadraticCurveTo(cx - 25 * s, cy, cx, cy - 40 * s);
      ctx.closePath();
      ctx.fill();
      break;
  }

  ctx.restore();
}

/**
 * Draws a clear high-contrast mob sequence number badge (1..10 or I..X).
 */
function drawMobBadge(
  ctx: CanvasRenderingContext2D,
  size: number,
  num: number,
  format: HeraldryNumberFormat,
  borderColor: string,
  s: number
) {
  const badgeX = size * 0.78;
  const badgeY = size * 0.78;
  const badgeR = 42 * s;

  const text = format === 'roman' ? ROMAN_NUMERALS[num] || String(num) : String(num);

  ctx.save();
  // Badge background shadow
  ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
  ctx.shadowBlur = 12 * s;

  // Badge body
  ctx.beginPath();
  ctx.arc(badgeX, badgeY, badgeR, 0, Math.PI * 2);
  ctx.fillStyle = '#090d16';
  ctx.fill();

  // Badge border
  ctx.lineWidth = 4 * s;
  ctx.strokeStyle = borderColor;
  ctx.shadowColor = borderColor;
  ctx.shadowBlur = 8 * s;
  ctx.stroke();

  // Number text
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#f8fafc';
  ctx.font = `900 ${Math.round(30 * s)}px "Cinzel", "Arial", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, badgeX, badgeY + 1 * s);

  ctx.restore();
}
