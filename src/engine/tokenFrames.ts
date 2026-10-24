/**
 * Token Forge Frame Engine
 * High-quality vector & procedural frames for TTRPG tokens.
 * Supports 8 distinct themes, faction glow/ring integration, and 100% offline Canvas2D rendering.
 */

export type TokenFrameId =
  | 'gold-runic'
  | 'dwarf-stone'
  | 'fire-arcane'
  | 'rose-thorn'
  | 'bone-skulls'
  | 'cyber-neon'
  | 'knight-steel'
  | 'frameless';

export type TokenFaction =
  | 'ally-green'
  | 'ally-blue'
  | 'enemy'
  | 'neutral'
  | 'boss'
  | 'custom'
  | 'none';

export interface FrameDefinition {
  id: TokenFrameId;
  name: string;
  nameEn: string;
  description: string;
  descriptionEn?: string;
  category: 'classic' | 'dwarven' | 'magic' | 'druid' | 'necro' | 'scifi' | 'martial' | 'minimal';
  icon: string;
  innerRadiusRatio: number; // Inner portrait clipping radius as ratio of size / 2 (e.g. 0.82)
}

export const FACTION_COLORS: Record<TokenFaction, { name: string; nameEn: string; hex: string; desc: string; descEn: string }> = {
  'ally-green': {
    name: 'Союзник (Зелёный)',
    nameEn: 'Ally (Green)',
    hex: '#22c55e',
    desc: 'Доброжелательные NPC, союзные существа, питомцы',
    descEn: 'Friendly NPCs, allied creatures, companions',
  },
  'ally-blue': {
    name: 'Союзник (Синий)',
    nameEn: 'Ally (Blue)',
    hex: '#3b82f6',
    desc: 'Персонажи игроков (PC), ключевые союзники отряда',
    descEn: 'Player Characters (PCs), key party allies',
  },
  'enemy': {
    name: 'Враг / Монстр',
    nameEn: 'Enemy / Monster',
    hex: '#ef4444',
    desc: 'Враждебные монстры, бандиты, нежить, противники',
    descEn: 'Hostile monsters, bandits, undead, opponents',
  },
  'neutral': {
    name: 'Нейтрал',
    nameEn: 'Neutral',
    hex: '#f59e0b',
    desc: 'Нейтральные обыватели, торговцы, дикие звери',
    descEn: 'Neutral townsfolk, merchants, beasts',
  },
  'boss': {
    name: 'Босс / Элита',
    nameEn: 'Boss / Elite',
    hex: '#a855f7',
    desc: 'Легендарные главари, архимаги, драконы, элитные враги',
    descEn: 'Legendary bosses, archmages, dragons, elite foes',
  },
  'custom': {
    name: 'Свой цвет',
    nameEn: 'Custom Color',
    hex: '#06b6d4',
    desc: 'Индивидуальная настройка цвета фракции через палитру',
    descEn: 'Custom faction color via palette picker',
  },
  'none': {
    name: 'Без фракции',
    nameEn: 'No Faction',
    hex: 'transparent',
    desc: 'Стандартный вид рамки без цветного ореола',
    descEn: 'Standard frame without colored aura glow',
  },
};

export const TOKEN_FRAMES: FrameDefinition[] = [
  {
    id: 'gold-runic',
    name: 'Золотое руническое кольцо',
    nameEn: 'Classic Gold & Runes',
    description: 'D&D Classic Gold с выгравированными древними рунами и самоцветами',
    category: 'classic',
    icon: 'sparkles',
    innerRadiusRatio: 0.83,
  },
  {
    id: 'dwarf-stone',
    name: 'Дворфийский рунический камень',
    nameEn: 'Dwarven Runestone',
    description: 'Тяжелая гранитная кладка, каменные блоки и угловатые руны подгорных цитаделей',
    category: 'dwarven',
    icon: 'stone',
    innerRadiusRatio: 0.81,
  },
  {
    id: 'fire-arcane',
    name: 'Огненное / Арканное кольцо',
    nameEn: 'Arcane Flame',
    description: 'Пылающее кольцо пламени, сполохи огня и искры арканной магии',
    category: 'magic',
    icon: 'flame',
    innerRadiusRatio: 0.82,
  },
  {
    id: 'rose-thorn',
    name: 'Венок из роз и терновника',
    nameEn: 'Briar & Rose Garland',
    description: 'Друидический венок из шипастых ветвей, алых роз и свежих листьев',
    category: 'druid',
    icon: 'rose',
    innerRadiusRatio: 0.82,
  },
  {
    id: 'bone-skulls',
    name: 'Костяной венец / Черепа',
    nameEn: 'Ossuary & Skulls',
    description: 'Темные культы, некромантия, оскверненные черепа и костяная филигрань',
    category: 'necro',
    icon: 'skull',
    innerRadiusRatio: 0.82,
  },
  {
    id: 'cyber-neon',
    name: 'Киберпанк / Неоновый контур',
    nameEn: 'Cyber Neon Reticle',
    description: 'Футуристический тактический HUD, угловые прицелы и неоновая подсветка',
    category: 'scifi',
    icon: 'zap',
    innerRadiusRatio: 0.84,
  },
  {
    id: 'knight-steel',
    name: 'Серебро / Рыцарская сталь',
    nameEn: 'Polished Knight Steel',
    description: 'Рыцарский безель из полированной стали с заклёпками и зеркальным отблеском',
    category: 'martial',
    icon: 'shield',
    innerRadiusRatio: 0.83,
  },
  {
    id: 'frameless',
    name: 'Без рамки (Срез)',
    nameEn: 'Clean Frameless',
    description: 'Аккуратный круглый срез с легкой объемной внутренней тенью и глубиной',
    category: 'minimal',
    icon: 'circle',
    innerRadiusRatio: 0.96,
  },
];

export function getFrameDefinition(frameId: TokenFrameId): FrameDefinition {
  return TOKEN_FRAMES.find((f) => f.id === frameId) || TOKEN_FRAMES[0];
}

export function getEffectiveFactionColor(
  faction: TokenFaction,
  customColor?: string
): string | null {
  if (faction === 'none') return null;
  if (faction === 'custom') return customColor || '#06b6d4';
  return FACTION_COLORS[faction]?.hex || null;
}

/**
 * Futhark & Arcane runes for procedurally engraving frames
 */
const RUNES = ['ᚠ', 'ᚢ', 'ᚦ', 'ᚨ', 'ᚱ', 'ᚲ', 'ᚷ', 'ᚹ', 'ᚺ', 'ᚾ', 'ᛁ', 'ᛃ', 'ᛇ', 'ᛈ', 'ᛉ', 'ᛊ'];

/**
 * Procedural Canvas Drawing: 1. Gold Runic Frame
 */
function drawGoldRunicFrame(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  rOut: number,
  rIn: number,
  s: number
) {
  const rMid = (rOut + rIn) / 2;
  const bezel = rOut - rIn;

  // 1. Outer rim gold gradient ring
  const goldGrad = ctx.createLinearGradient(cx - rOut, cy - rOut, cx + rOut, cy + rOut);
  goldGrad.addColorStop(0.0, '#fff4b8');
  goldGrad.addColorStop(0.2, '#f5b920');
  goldGrad.addColorStop(0.4, '#b48316');
  goldGrad.addColorStop(0.6, '#fef08a');
  goldGrad.addColorStop(0.8, '#92610d');
  goldGrad.addColorStop(1.0, '#f5b920');

  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, rOut, 0, Math.PI * 2);
  ctx.arc(cx, cy, rIn, 0, Math.PI * 2, true);
  ctx.fillStyle = goldGrad;
  ctx.fill();

  // Subtle metallic texture grooves
  ctx.beginPath();
  ctx.arc(cx, cy, rMid, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(113, 63, 18, 0.4)';
  ctx.lineWidth = 1 * s;
  ctx.stroke();

  // 2. Engraved Runes
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `bold ${Math.round(13 * s)}px "Segoe UI Historic", "JetBrains Mono", sans-serif`;

  const runeCount = 16;
  for (let i = 0; i < runeCount; i++) {
    // Skip 4 cardinal points where gems will be placed
    if (i % 4 === 0) continue;
    const angle = (i / runeCount) * Math.PI * 2;
    const rx = cx + Math.cos(angle) * rMid;
    const ry = cy + Math.sin(angle) * rMid;

    ctx.save();
    ctx.translate(rx, ry);
    ctx.rotate(angle + Math.PI / 2);

    // Engraved dark shadow
    ctx.fillStyle = 'rgba(69, 26, 3, 0.85)';
    ctx.fillText(RUNES[i % RUNES.length], 0.7 * s, 0.7 * s);

    // Gold highlight
    ctx.fillStyle = '#fef08a';
    ctx.fillText(RUNES[i % RUNES.length], 0, 0);
    ctx.restore();
  }

  // 3. Four Ornate Cardinal Studs / Gems (Rubies in gold prongs)
  for (let i = 0; i < 4; i++) {
    const angle = (i * Math.PI) / 2;
    const gx = cx + Math.cos(angle) * rMid;
    const gy = cy + Math.sin(angle) * rMid;
    const gemR = Math.max(3, bezel * 0.28);

    // Gold bezel around gem
    ctx.beginPath();
    ctx.arc(gx, gy, gemR + 1.5 * s, 0, Math.PI * 2);
    ctx.fillStyle = '#78350f';
    ctx.fill();

    // Gemstone (Ruby red / Amber gold)
    const gemGrad = ctx.createRadialGradient(
      gx - gemR * 0.3,
      gy - gemR * 0.3,
      gemR * 0.1,
      gx,
      gy,
      gemR
    );
    gemGrad.addColorStop(0, '#fca5a5');
    gemGrad.addColorStop(0.3, '#dc2626');
    gemGrad.addColorStop(0.8, '#7f1d1d');
    gemGrad.addColorStop(1, '#450a0a');

    ctx.beginPath();
    ctx.arc(gx, gy, gemR, 0, Math.PI * 2);
    ctx.fillStyle = gemGrad;
    ctx.fill();

    // Specular shine dot
    ctx.beginPath();
    ctx.arc(gx - gemR * 0.35, gy - gemR * 0.35, gemR * 0.25, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.fill();
  }

  // 4. Outer and Inner Edge Bevels
  ctx.beginPath();
  ctx.arc(cx, cy, rOut, 0, Math.PI * 2);
  ctx.strokeStyle = '#fff4b8';
  ctx.lineWidth = 1.5 * s;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(cx, cy, rIn, 0, Math.PI * 2);
  ctx.strokeStyle = '#78350f';
  ctx.lineWidth = 1.5 * s;
  ctx.stroke();

  ctx.restore();
}

/**
 * Procedural Canvas Drawing: 2. Dwarven Stone Frame
 */
function drawDwarfStoneFrame(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  rOut: number,
  rIn: number,
  s: number
) {
  const rMid = (rOut + rIn) / 2;
  const segments = 12;

  ctx.save();

  // Granite stone base ring
  const stoneGrad = ctx.createLinearGradient(cx - rOut, cy - rOut, cx + rOut, cy + rOut);
  stoneGrad.addColorStop(0.0, '#64748b');
  stoneGrad.addColorStop(0.3, '#334155');
  stoneGrad.addColorStop(0.7, '#1e293b');
  stoneGrad.addColorStop(1.0, '#475569');

  ctx.beginPath();
  ctx.arc(cx, cy, rOut, 0, Math.PI * 2);
  ctx.arc(cx, cy, rIn, 0, Math.PI * 2, true);
  ctx.fillStyle = stoneGrad;
  ctx.fill();

  // Masonry mortar grooves
  for (let i = 0; i < segments; i++) {
    const angle = (i / segments) * Math.PI * 2;
    const x1 = cx + Math.cos(angle) * rIn;
    const y1 = cy + Math.sin(angle) * rIn;
    const x2 = cx + Math.cos(angle) * rOut;
    const y2 = cy + Math.sin(angle) * rOut;

    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.strokeStyle = '#090d14';
    ctx.lineWidth = 2 * s;
    ctx.stroke();

    // Chiseled stone block highlight
    const hAngle = angle + 0.04;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(hAngle) * rIn, cy + Math.sin(hAngle) * rIn);
    ctx.lineTo(cx + Math.cos(hAngle) * rOut, cy + Math.sin(hAngle) * rOut);
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.4)';
    ctx.lineWidth = 1 * s;
    ctx.stroke();
  }

  // 4 Dwarven Keystones with geometric runes
  const dwarvenRunes = ['ᚦ', 'ᛏ', 'ᛞ', 'ᛟ'];
  for (let i = 0; i < 4; i++) {
    const angle = (i * Math.PI) / 2;
    const kx = cx + Math.cos(angle) * rMid;
    const ky = cy + Math.sin(angle) * rMid;

    ctx.save();
    ctx.translate(kx, ky);
    ctx.rotate(angle);

    // Heavy iron/stone plate
    ctx.beginPath();
    ctx.rect(-10 * s, -12 * s, 20 * s, 24 * s);
    ctx.fillStyle = '#1e293b';
    ctx.fill();
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 1.5 * s;
    ctx.stroke();

    // Carved rune
    ctx.fillStyle = '#f59e0b';
    ctx.font = `bold ${Math.round(14 * s)}px "Segoe UI Historic", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(dwarvenRunes[i], 0, 0);

    ctx.restore();
  }

  // Stone inner & outer borders
  ctx.beginPath();
  ctx.arc(cx, cy, rOut, 0, Math.PI * 2);
  ctx.strokeStyle = '#94a3b8';
  ctx.lineWidth = 2 * s;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(cx, cy, rIn, 0, Math.PI * 2);
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 2 * s;
  ctx.stroke();

  ctx.restore();
}

/**
 * Procedural Canvas Drawing: 3. Arcane Flame Frame
 */
function drawFireArcaneFrame(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  rOut: number,
  rIn: number,
  s: number
) {
  const flameCount = 28;

  ctx.save();

  // Outer radiant fiery aura
  ctx.shadowColor = '#ea580c';
  ctx.shadowBlur = 14 * s;

  // Base molten ring
  const fireGrad = ctx.createLinearGradient(cx - rOut, cy - rOut, cx + rOut, cy + rOut);
  fireGrad.addColorStop(0.0, '#fef08a');
  fireGrad.addColorStop(0.3, '#f97316');
  fireGrad.addColorStop(0.7, '#dc2626');
  fireGrad.addColorStop(1.0, '#7f1d1d');

  ctx.beginPath();
  ctx.arc(cx, cy, rOut, 0, Math.PI * 2);
  ctx.arc(cx, cy, rIn, 0, Math.PI * 2, true);
  ctx.fillStyle = fireGrad;
  ctx.fill();

  // Procedural flame spires dancing along the outer rim
  for (let i = 0; i < flameCount; i++) {
    const angle = (i / flameCount) * Math.PI * 2;
    const wave = Math.sin(i * 1.8) * 0.5 + 0.5;
    const flameHeight = (10 + wave * 16) * s;

    const baseAngle1 = angle - 0.08;
    const baseAngle2 = angle + 0.08;

    const x1 = cx + Math.cos(baseAngle1) * rOut;
    const y1 = cy + Math.sin(baseAngle1) * rOut;

    const x2 = cx + Math.cos(baseAngle2) * rOut;
    const y2 = cy + Math.sin(baseAngle2) * rOut;

    const tipX = cx + Math.cos(angle) * (rOut + flameHeight);
    const tipY = cy + Math.sin(angle) * (rOut + flameHeight);

    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.quadraticCurveTo(
      cx + Math.cos(angle - 0.04) * (rOut + flameHeight * 0.6),
      cy + Math.sin(angle - 0.04) * (rOut + flameHeight * 0.6),
      tipX,
      tipY
    );
    ctx.quadraticCurveTo(
      cx + Math.cos(angle + 0.04) * (rOut + flameHeight * 0.6),
      cy + Math.sin(angle + 0.04) * (rOut + flameHeight * 0.6),
      x2,
      y2
    );
    ctx.closePath();

    const tipGrad = ctx.createRadialGradient(cx, cy, rOut, tipX, tipY, flameHeight);
    tipGrad.addColorStop(0, '#fef08a');
    tipGrad.addColorStop(0.4, '#f97316');
    tipGrad.addColorStop(0.8, '#dc2626');
    tipGrad.addColorStop(1, 'transparent');

    ctx.fillStyle = tipGrad;
    ctx.fill();
  }

  // Floating arcane embers / sparks
  for (let i = 0; i < 16; i++) {
    const sparkAngle = (i / 16) * Math.PI * 2 + 0.12;
    const dist = rOut + (4 + (i % 5) * 4) * s;
    const sx = cx + Math.cos(sparkAngle) * dist;
    const sy = cy + Math.sin(sparkAngle) * dist;

    ctx.beginPath();
    ctx.arc(sx, sy, (1.5 + (i % 3) * 0.8) * s, 0, Math.PI * 2);
    ctx.fillStyle = i % 2 === 0 ? '#fef08a' : '#fdba74';
    ctx.fill();
  }

  // Inner searing golden edge
  ctx.beginPath();
  ctx.arc(cx, cy, rIn, 0, Math.PI * 2);
  ctx.strokeStyle = '#fef08a';
  ctx.lineWidth = 2 * s;
  ctx.stroke();

  ctx.restore();
}

/**
 * Procedural Canvas Drawing: 4. Briar & Rose Druidic Frame
 */
function drawRoseThornFrame(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  rOut: number,
  rIn: number,
  s: number
) {
  const rMid = (rOut + rIn) / 2;

  ctx.save();

  // Entwined vines: Primary forest wood vine
  ctx.beginPath();
  ctx.arc(cx, cy, rMid - 2 * s, 0, Math.PI * 2);
  ctx.strokeStyle = '#271b12';
  ctx.lineWidth = 7 * s;
  ctx.stroke();

  // Secondary moss green vine overlapping
  ctx.beginPath();
  ctx.arc(cx, cy, rMid + 2 * s, 0, Math.PI * 2);
  ctx.strokeStyle = '#14532d';
  ctx.lineWidth = 5 * s;
  ctx.stroke();

  // Sharp Thorns (projecting outward and inward)
  const thornCount = 20;
  for (let i = 0; i < thornCount; i++) {
    const angle = (i / thornCount) * Math.PI * 2;
    const isOutward = i % 2 === 0;
    const dir = isOutward ? 1 : -1;
    const thornLen = (8 + (i % 3) * 3) * s;

    const bx = cx + Math.cos(angle) * rMid;
    const by = cy + Math.sin(angle) * rMid;

    const tx = cx + Math.cos(angle + 0.05 * dir) * (rMid + thornLen * dir);
    const ty = cy + Math.sin(angle + 0.05 * dir) * (rMid + thornLen * dir);

    ctx.beginPath();
    ctx.moveTo(bx - Math.sin(angle) * 3 * s, by + Math.cos(angle) * 3 * s);
    ctx.lineTo(tx, ty);
    ctx.lineTo(bx + Math.sin(angle) * 3 * s, by - Math.cos(angle) * 3 * s);
    ctx.closePath();
    ctx.fillStyle = '#3f2817';
    ctx.fill();
    ctx.strokeStyle = '#15803d';
    ctx.lineWidth = 0.5 * s;
    ctx.stroke();
  }

  // 8 Sculpted Blooming Roses with Emerald Leaves
  const roseCount = 8;
  for (let i = 0; i < roseCount; i++) {
    const angle = (i / roseCount) * Math.PI * 2 + Math.PI / 8;
    const rx = cx + Math.cos(angle) * rMid;
    const ry = cy + Math.sin(angle) * rMid;
    const roseR = 8.5 * s;

    // Leaves beside the rose
    const leafAngle = angle + 0.18;
    const lx = cx + Math.cos(leafAngle) * rMid;
    const ly = cy + Math.sin(leafAngle) * rMid;
    ctx.beginPath();
    ctx.ellipse(lx, ly, 6 * s, 3.5 * s, leafAngle, 0, Math.PI * 2);
    ctx.fillStyle = '#16a34a';
    ctx.fill();
    ctx.strokeStyle = '#14532d';
    ctx.lineWidth = 1 * s;
    ctx.stroke();

    // Rose Outer Petals
    ctx.beginPath();
    ctx.arc(rx, ry, roseR, 0, Math.PI * 2);
    ctx.fillStyle = '#9f1239';
    ctx.fill();

    // Rose Mid Petals
    ctx.beginPath();
    ctx.arc(rx, ry, roseR * 0.72, 0, Math.PI * 2);
    ctx.fillStyle = '#e11d48';
    ctx.fill();

    // Rose Inner Core
    ctx.beginPath();
    ctx.arc(rx, ry, roseR * 0.42, 0, Math.PI * 2);
    ctx.fillStyle = '#fda4af';
    ctx.fill();

    // Golden pistil center
    ctx.beginPath();
    ctx.arc(rx, ry, roseR * 0.18, 0, Math.PI * 2);
    ctx.fillStyle = '#fef08a';
    ctx.fill();
  }

  // Inner clean organic rim
  ctx.beginPath();
  ctx.arc(cx, cy, rIn, 0, Math.PI * 2);
  ctx.strokeStyle = '#166534';
  ctx.lineWidth = 1.5 * s;
  ctx.stroke();

  ctx.restore();
}

/**
 * Procedural Canvas Drawing: 5. Necromancy Bone & Skulls Frame
 */
function drawBoneSkullsFrame(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  rOut: number,
  rIn: number,
  s: number
) {
  const rMid = (rOut + rIn) / 2;

  ctx.save();

  // Weathered ivory bone base ring
  const boneGrad = ctx.createLinearGradient(cx - rOut, cy - rOut, cx + rOut, cy + rOut);
  boneGrad.addColorStop(0.0, '#f5f5f4');
  boneGrad.addColorStop(0.3, '#d6d3d1');
  boneGrad.addColorStop(0.7, '#78716c');
  boneGrad.addColorStop(1.0, '#e7e5e4');

  ctx.beginPath();
  ctx.arc(cx, cy, rOut, 0, Math.PI * 2);
  ctx.arc(cx, cy, rIn, 0, Math.PI * 2, true);
  ctx.fillStyle = boneGrad;
  ctx.fill();

  // Vertebrae grooves along the ring
  const vertCount = 32;
  for (let i = 0; i < vertCount; i++) {
    const angle = (i / vertCount) * Math.PI * 2;
    const x1 = cx + Math.cos(angle) * (rIn + 1 * s);
    const y1 = cy + Math.sin(angle) * (rIn + 1 * s);
    const x2 = cx + Math.cos(angle) * (rOut - 1 * s);
    const y2 = cy + Math.sin(angle) * (rOut - 1 * s);

    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.strokeStyle = 'rgba(41, 37, 36, 0.45)';
    ctx.lineWidth = 1 * s;
    ctx.stroke();
  }

  // 8 Carved Ivory Skulls along the circumference
  const skullCount = 8;
  for (let i = 0; i < skullCount; i++) {
    const angle = (i / skullCount) * Math.PI * 2;
    const sx = cx + Math.cos(angle) * rMid;
    const sy = cy + Math.sin(angle) * rMid;
    const craniumR = 7.5 * s;

    ctx.save();
    ctx.translate(sx, sy);
    ctx.rotate(angle + Math.PI / 2);

    // Cranium
    ctx.beginPath();
    ctx.arc(0, -2 * s, craniumR, 0, Math.PI * 2);
    ctx.fillStyle = '#fafaf9';
    ctx.fill();
    ctx.strokeStyle = '#44403c';
    ctx.lineWidth = 1 * s;
    ctx.stroke();

    // Jaw / maxilla
    ctx.beginPath();
    ctx.rect(-craniumR * 0.55, craniumR * 0.35, craniumR * 1.1, craniumR * 0.6);
    ctx.fillStyle = '#e7e5e4';
    ctx.fill();
    ctx.stroke();

    // Dark eye sockets
    ctx.beginPath();
    ctx.arc(-craniumR * 0.35, -craniumR * 0.1, craniumR * 0.26, 0, Math.PI * 2);
    ctx.arc(craniumR * 0.35, -craniumR * 0.1, craniumR * 0.26, 0, Math.PI * 2);
    ctx.fillStyle = '#1c1917';
    ctx.fill();

    // Nasal cavity
    ctx.beginPath();
    ctx.moveTo(0, craniumR * 0.15);
    ctx.lineTo(-craniumR * 0.12, craniumR * 0.38);
    ctx.lineTo(craniumR * 0.12, craniumR * 0.38);
    ctx.closePath();
    ctx.fillStyle = '#292524';
    ctx.fill();

    // Teeth slits
    ctx.beginPath();
    ctx.moveTo(-craniumR * 0.2, craniumR * 0.6);
    ctx.lineTo(-craniumR * 0.2, craniumR * 0.9);
    ctx.moveTo(0, craniumR * 0.6);
    ctx.lineTo(0, craniumR * 0.9);
    ctx.moveTo(craniumR * 0.2, craniumR * 0.6);
    ctx.lineTo(craniumR * 0.2, craniumR * 0.9);
    ctx.strokeStyle = '#57534e';
    ctx.lineWidth = 0.8 * s;
    ctx.stroke();

    ctx.restore();
  }

  // Dark sepia edge borders
  ctx.beginPath();
  ctx.arc(cx, cy, rOut, 0, Math.PI * 2);
  ctx.strokeStyle = '#44403c';
  ctx.lineWidth = 1.5 * s;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(cx, cy, rIn, 0, Math.PI * 2);
  ctx.strokeStyle = '#292524';
  ctx.lineWidth = 2 * s;
  ctx.stroke();

  ctx.restore();
}

/**
 * Procedural Canvas Drawing: 6. Cyberpunk Neon Reticle Frame
 */
function drawCyberNeonFrame(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  rOut: number,
  rIn: number,
  s: number,
  neonColor = '#06b6d4'
) {
  const rMid = (rOut + rIn) / 2;

  ctx.save();

  // Neon Glow setup
  ctx.shadowColor = neonColor;
  ctx.shadowBlur = 12 * s;

  // 1. Dark semi-transparent high-tech bezel backing
  ctx.beginPath();
  ctx.arc(cx, cy, rOut, 0, Math.PI * 2);
  ctx.arc(cx, cy, rIn, 0, Math.PI * 2, true);
  ctx.fillStyle = 'rgba(10, 15, 26, 0.88)';
  ctx.fill();

  // 2. Segmented quadrant glowing arcs
  const quarters = 4;
  for (let i = 0; i < quarters; i++) {
    const startAngle = (i * Math.PI) / 2 + 0.15;
    const endAngle = ((i + 1) * Math.PI) / 2 - 0.15;

    ctx.beginPath();
    ctx.arc(cx, cy, rOut - 2 * s, startAngle, endAngle);
    ctx.strokeStyle = neonColor;
    ctx.lineWidth = 3 * s;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(cx, cy, rIn + 2 * s, startAngle + 0.08, endAngle - 0.08);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.lineWidth = 1.5 * s;
    ctx.stroke();
  }

  // 3. Four Corner Tactical Target Brackets (at 45°, 135°, 225°, 315°)
  for (let i = 0; i < 4; i++) {
    const angle = (i * Math.PI) / 2 + Math.PI / 4;
    const bx = cx + Math.cos(angle) * rMid;
    const by = cy + Math.sin(angle) * rMid;

    ctx.save();
    ctx.translate(bx, by);
    ctx.rotate(angle);

    // Tactical Reticle cross notch
    ctx.beginPath();
    ctx.moveTo(-6 * s, 0);
    ctx.lineTo(6 * s, 0);
    ctx.moveTo(0, -6 * s);
    ctx.lineTo(0, 6 * s);
    ctx.strokeStyle = '#ec4899';
    ctx.lineWidth = 2 * s;
    ctx.stroke();

    ctx.restore();
  }

  // 4. Millimeter HUD tick marks
  const tickCount = 48;
  for (let i = 0; i < tickCount; i++) {
    if (i % 6 === 0) continue; // gap for brackets
    const angle = (i / tickCount) * Math.PI * 2;
    const isLong = i % 3 === 0;
    const len = isLong ? 5 * s : 2.5 * s;

    const x1 = cx + Math.cos(angle) * (rOut - 2 * s);
    const y1 = cy + Math.sin(angle) * (rOut - 2 * s);
    const x2 = cx + Math.cos(angle) * (rOut - 2 * s - len);
    const y2 = cy + Math.sin(angle) * (rOut - 2 * s - len);

    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.strokeStyle = isLong ? neonColor : 'rgba(255, 255, 255, 0.4)';
    ctx.lineWidth = 1 * s;
    ctx.stroke();
  }

  // 5. Digital Status Tag
  ctx.fillStyle = neonColor;
  ctx.font = `bold ${Math.round(8 * s)}px "JetBrains Mono", monospace`;
  ctx.textAlign = 'center';
  ctx.fillText('TRG-LOCK', cx, cy - rIn + 14 * s);

  ctx.restore();
}

/**
 * Procedural Canvas Drawing: 7. Knight Steel Frame with Rivets
 */
function drawKnightSteelFrame(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  rOut: number,
  rIn: number,
  s: number
) {
  const rMid = (rOut + rIn) / 2;
  const rivetCount = 16;

  ctx.save();

  // Tempered polished steel gradient
  const steelGrad = ctx.createLinearGradient(cx - rOut, cy - rOut, cx + rOut, cy + rOut);
  steelGrad.addColorStop(0.0, '#f8fafc');
  steelGrad.addColorStop(0.2, '#cbd5e1');
  steelGrad.addColorStop(0.5, '#475569');
  steelGrad.addColorStop(0.8, '#94a3b8');
  steelGrad.addColorStop(1.0, '#1e293b');

  ctx.beginPath();
  ctx.arc(cx, cy, rOut, 0, Math.PI * 2);
  ctx.arc(cx, cy, rIn, 0, Math.PI * 2, true);
  ctx.fillStyle = steelGrad;
  ctx.fill();

  // Concentric steel groove
  ctx.beginPath();
  ctx.arc(cx, cy, rMid, 0, Math.PI * 2);
  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 1.2 * s;
  ctx.stroke();

  // 16 3D Spherical Chrome Rivets
  for (let i = 0; i < rivetCount; i++) {
    const angle = (i / rivetCount) * Math.PI * 2;
    const rx = cx + Math.cos(angle) * rMid;
    const ry = cy + Math.sin(angle) * rMid;
    const rivetR = 3.8 * s;

    // Drop shadow
    ctx.beginPath();
    ctx.arc(rx + 0.6 * s, ry + 0.6 * s, rivetR, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(15, 23, 42, 0.7)';
    ctx.fill();

    // Rivet sphere
    const rGrad = ctx.createRadialGradient(
      rx - rivetR * 0.35,
      ry - rivetR * 0.35,
      rivetR * 0.1,
      rx,
      ry,
      rivetR
    );
    rGrad.addColorStop(0, '#ffffff');
    rGrad.addColorStop(0.3, '#cbd5e1');
    rGrad.addColorStop(0.7, '#64748b');
    rGrad.addColorStop(1, '#1e293b');

    ctx.beginPath();
    ctx.arc(rx, ry, rivetR, 0, Math.PI * 2);
    ctx.fillStyle = rGrad;
    ctx.fill();
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 0.6 * s;
    ctx.stroke();
  }

  // Steel Outer and Inner Bevel Highlights
  ctx.beginPath();
  ctx.arc(cx, cy, rOut, 0, Math.PI * 2);
  ctx.strokeStyle = '#f8fafc';
  ctx.lineWidth = 1.8 * s;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(cx, cy, rIn, 0, Math.PI * 2);
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 1.8 * s;
  ctx.stroke();

  ctx.restore();
}

/**
 * Procedural Canvas Drawing: 8. Frameless Clean Cut
 */
function drawFramelessCut(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  rOut: number,
  s: number
) {
  ctx.save();

  // Soft subtle drop shadow ring
  ctx.beginPath();
  ctx.arc(cx, cy, rOut - 1 * s, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
  ctx.lineWidth = 2 * s;
  ctx.stroke();

  // Thin highlight rim
  ctx.beginPath();
  ctx.arc(cx, cy, rOut - 0.5 * s, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.28)';
  ctx.lineWidth = 1 * s;
  ctx.stroke();

  // Inner soft vignette depth
  const vigGrad = ctx.createRadialGradient(cx, cy, rOut * 0.88, cx, cy, rOut);
  vigGrad.addColorStop(0, 'transparent');
  vigGrad.addColorStop(1, 'rgba(0, 0, 0, 0.45)');

  ctx.beginPath();
  ctx.arc(cx, cy, rOut, 0, Math.PI * 2);
  ctx.fillStyle = vigGrad;
  ctx.fill();

  ctx.restore();
}

/**
 * Main Frame Drawing Dispatcher
 */
export function drawTokenFrame(
  ctx: CanvasRenderingContext2D,
  size: number,
  frameId: TokenFrameId,
  options?: {
    factionColor?: string | null;
    glowIntensity?: number;
  }
) {
  const s = size / 512;
  const cx = size / 2;
  const cy = size / 2;

  const def = getFrameDefinition(frameId);
  const rOut = (size / 2) * 0.97;
  const rIn = (size / 2) * def.innerRadiusRatio;

  const factionColor = options?.factionColor;
  const glow = options?.glowIntensity ?? 50;

  // Optional Faction Aura Glow under the frame
  if (factionColor && factionColor !== 'transparent' && glow > 0) {
    ctx.save();
    ctx.shadowColor = factionColor;
    ctx.shadowBlur = (glow / 100) * 26 * s;
    ctx.beginPath();
    ctx.arc(cx, cy, rOut, 0, Math.PI * 2);
    ctx.strokeStyle = factionColor;
    ctx.lineWidth = Math.max(2, (glow / 100) * 4.5 * s);
    ctx.stroke();
    ctx.restore();
  }

  // Draw specific frame
  switch (frameId) {
    case 'gold-runic':
      drawGoldRunicFrame(ctx, cx, cy, rOut, rIn, s);
      break;
    case 'dwarf-stone':
      drawDwarfStoneFrame(ctx, cx, cy, rOut, rIn, s);
      break;
    case 'fire-arcane':
      drawFireArcaneFrame(ctx, cx, cy, rOut, rIn, s);
      break;
    case 'rose-thorn':
      drawRoseThornFrame(ctx, cx, cy, rOut, rIn, s);
      break;
    case 'bone-skulls':
      drawBoneSkullsFrame(ctx, cx, cy, rOut, rIn, s);
      break;
    case 'cyber-neon':
      drawCyberNeonFrame(ctx, cx, cy, rOut, rIn, s, factionColor || '#06b6d4');
      break;
    case 'knight-steel':
      drawKnightSteelFrame(ctx, cx, cy, rOut, rIn, s);
      break;
    case 'frameless':
      drawFramelessCut(ctx, cx, cy, rOut, s);
      break;
  }

  // Optional Faction Pip / Accent Ring if faction is active
  if (factionColor && factionColor !== 'transparent') {
    ctx.save();
    // Inner faction indicator ring
    ctx.beginPath();
    ctx.arc(cx, cy, rIn + 1.5 * s, 0, Math.PI * 2);
    ctx.strokeStyle = factionColor;
    ctx.lineWidth = 1.5 * s;
    ctx.stroke();

    // 6 o'clock faction shield jewel
    const py = cy + rOut - 4 * s;
    ctx.beginPath();
    ctx.arc(cx, py, 4 * s, 0, Math.PI * 2);
    ctx.fillStyle = factionColor;
    ctx.shadowColor = factionColor;
    ctx.shadowBlur = 8 * s;
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1 * s;
    ctx.stroke();
    ctx.restore();
  }
}

/**
 * Draw background fill behind the portrait
 */
export function drawBackgroundFill(
  ctx: CanvasRenderingContext2D,
  size: number,
  mode: 'transparent' | 'dark' | 'faction',
  factionColor?: string | null
) {
  if (mode === 'transparent') return;

  const cx = size / 2;
  const cy = size / 2;
  const radius = size / 2;

  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);

  if (mode === 'dark') {
    const darkGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
    darkGrad.addColorStop(0, '#1a2230');
    darkGrad.addColorStop(1, '#090d14');
    ctx.fillStyle = darkGrad;
    ctx.fill();
  } else if (mode === 'faction') {
    const col = factionColor || '#3b82f6';
    const factGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
    factGrad.addColorStop(0, `${col}44`);
    factGrad.addColorStop(0.7, `${col}15`);
    factGrad.addColorStop(1, '#090d14');
    ctx.fillStyle = factGrad;
    ctx.fill();
  }
  ctx.restore();
}

/**
 * Tactical Cell Grid Overlay for previewing how token sits in a battle square
 */
export function drawGridOverlay(ctx: CanvasRenderingContext2D, size: number) {
  ctx.save();
  const cells = 8;
  const step = size / cells;

  ctx.strokeStyle = 'rgba(245, 185, 32, 0.4)';
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 4]);

  for (let i = 0; i <= cells; i++) {
    const pos = i * step;
    // Vertical
    ctx.beginPath();
    ctx.moveTo(pos, 0);
    ctx.lineTo(pos, size);
    ctx.stroke();

    // Horizontal
    ctx.beginPath();
    ctx.moveTo(0, pos);
    ctx.lineTo(size, pos);
    ctx.stroke();
  }

  // Tactical Cell bounding square
  ctx.setLineDash([]);
  ctx.strokeStyle = '#f5b920';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(2, 2, size - 4, size - 4);

  // Center crosshair
  const c = size / 2;
  ctx.strokeStyle = '#ef4444';
  ctx.beginPath();
  ctx.moveTo(c - 8, c);
  ctx.lineTo(c + 8, c);
  ctx.moveTo(c, c - 8);
  ctx.lineTo(c, c + 8);
  ctx.stroke();

  ctx.restore();
}

export interface RenderCompositeOptions {
  size?: number;
  image: HTMLImageElement | HTMLCanvasElement | null;
  frameId: TokenFrameId;
  faction: TokenFaction;
  customColor?: string;
  glowIntensity?: number;
  backgroundMode?: 'transparent' | 'dark' | 'faction';
  zoom: number;
  panX: number;
  panY: number;
  rotation: number;
  flipH: boolean;
  showGridOverlay?: boolean;
}

/**
 * Composite the entire token (background, transformed portrait, frame, and grid overlay)
 * onto a 2D canvas context.
 */
export function renderTokenComposite(
  canvas: HTMLCanvasElement,
  options: RenderCompositeOptions
) {
  const size = options.size || 512;
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // Clear canvas
  ctx.clearRect(0, 0, size, size);

  const cx = size / 2;
  const cy = size / 2;
  const def = getFrameDefinition(options.frameId);
  const clipRadius = (size / 2) * def.innerRadiusRatio + 1.5; // Slight overlap to prevent seam
  const factionColor = getEffectiveFactionColor(options.faction, options.customColor);

  // 1. Background fill inside circle
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, clipRadius, 0, Math.PI * 2);
  ctx.clip();
  drawBackgroundFill(ctx, size, options.backgroundMode || 'transparent', factionColor);

  // 2. Transformed Portrait Image
  if (options.image) {
    ctx.save();
    // Move to center + pan offset
    ctx.translate(cx + options.panX, cy + options.panY);
    ctx.rotate((options.rotation * Math.PI) / 180);
    if (options.flipH) {
      ctx.scale(-1, 1);
    }
    const z = options.zoom || 1.0;
    ctx.scale(z, z);

    const img = options.image;
    // Scale image so that its smallest dimension fits the token diameter (512) at zoom 1.0
    const imgMin = Math.min(img.width, img.height) || 512;
    const baseScale = size / imgMin;
    const w = img.width * baseScale;
    const h = img.height * baseScale;

    ctx.drawImage(img, -w / 2, -h / 2, w, h);
    ctx.restore();
  }
  ctx.restore();

  // 3. Frame Overlay
  drawTokenFrame(ctx, size, options.frameId, {
    factionColor,
    glowIntensity: options.glowIntensity ?? 50,
  });

  // 4. Grid Overlay (preview only)
  if (options.showGridOverlay) {
    drawGridOverlay(ctx, size);
  }
}
