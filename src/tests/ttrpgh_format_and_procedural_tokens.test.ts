import { describe, it, expect } from 'vitest';
import {
  exportCharacterToTtrpgh,
  importCharacterFromTtrpgh,
  serializeTtrpgh,
  deserializeTtrpgh,
  compressForQr,
  decompressFromQr,
  TTRPGH_FORMAT_VERSION,
  TTRPGH_APP_VERSION,
} from '../services/ttrpghFormat';
import {
  SilhouetteType,
  ArmorType,
  WeaponType,
  HeraldrySign,
  randomProceduralTokenConfig,
  randomHeraldryConfig,
  renderProceduralToken,
  renderHeraldryToken,
  SILHOUETTE_OPTIONS,
  ARMOR_OPTIONS,
  WEAPON_OPTIONS,
  HEAD_FEATURE_OPTIONS,
  EFFECT_OPTIONS,
  HERALDRY_SIGN_OPTIONS,
  FACTION_COLOR_PALETTE,
} from '../engine/proceduralTokens';
import { PartyMember } from '../types/party';

/**
 * Headless Canvas Mock for deterministic testing in Node/Vitest
 */
function createMockCanvas(width = 512, height = 512) {
  const operations: string[] = [];
  const textDrawn: string[] = [];

  const ctx = {
    save: () => operations.push('save'),
    restore: () => operations.push('restore'),
    beginPath: () => operations.push('beginPath'),
    closePath: () => operations.push('closePath'),
    arc: (...args: any[]) => operations.push(`arc(${args[0]},${args[1]},${args[2]})`),
    rect: (...args: any[]) => operations.push(`rect(${args.join(',')})`),
    strokeRect: (...args: any[]) => operations.push(`strokeRect(${args.join(',')})`),
    fillRect: (...args: any[]) => operations.push(`fillRect(${args.join(',')})`),
    fill: () => operations.push('fill'),
    stroke: () => operations.push('stroke'),
    clip: () => operations.push('clip'),
    clearRect: () => operations.push('clearRect'),
    moveTo: (...args: any[]) => operations.push(`moveTo(${args.join(',')})`),
    lineTo: (...args: any[]) => operations.push(`lineTo(${args.join(',')})`),
    quadraticCurveTo: () => operations.push('quadraticCurveTo'),
    bezierCurveTo: () => operations.push('bezierCurveTo'),
    ellipse: () => operations.push('ellipse'),
    translate: (...args: any[]) => operations.push(`translate(${args.join(',')})`),
    rotate: (...args: any[]) => operations.push(`rotate(${args.join(',')})`),
    scale: (...args: any[]) => operations.push(`scale(${args.join(',')})`),
    drawImage: () => operations.push('drawImage'),
    fillText: (text: string) => {
      operations.push(`fillText(${text})`);
      textDrawn.push(String(text));
    },
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
    globalAlpha: 1.0,
  } as unknown as CanvasRenderingContext2D;

  const canvas = {
    width,
    height,
    getContext: (type: string) => (type === '2d' ? ctx : null),
    toDataURL: (type = 'image/png') => `data:${type};base64,mockedTokenDataUrl`,
  } as unknown as HTMLCanvasElement;

  return { canvas, ctx, operations, textDrawn };
}

const SAMPLE_PALADIN: PartyMember = {
  id: 'member-paladin-1',
  name: 'Эльдрих Светоносный',
  characterClass: 'Паладин (Клятва Преданности)',
  species: 'Человек',
  level: 5,
  ac: 18,
  maxHp: 44,
  currentHp: 40,
  tempHp: 5,
  initBonus: 1,
  speed: '30 фт.',
  color: '#3B82F6',
  avatarUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  hitDiceCurrent: 4,
  hitDiceMax: 5,
  hitDiceType: 'd10',
  exhaustion: 0,
  stats: {
    str: 16,
    dex: 12,
    con: 14,
    int: 10,
    wis: 12,
    cha: 16,
  },
  savingThrowProficiencies: ['wis', 'cha'],
  skillProficiencies: {
    Athletics: 'proficient',
    Persuasion: 'expertise',
    Religion: 'proficient',
  },
  weapons: [
    {
      id: 'w-1',
      name: 'Длинный меч',
      attackBonus: '+6',
      damage: '1d8+3',
      damageType: 'Рубящий',
      mastery: 'Sap',
    },
  ],
  resources: [
    {
      id: 'res-1',
      name: 'Наложение рук',
      current: 25,
      max: 25,
      resetOn: 'long',
    },
  ],
  spellcastingAbility: 'cha',
  spellAttackBonus: 6,
  spellSaveDc: 14,
  spellSlots: {
    1: { max: 4, used: 1 },
    2: { max: 2, used: 0 },
  },
  preparedSpells: [
    {
      name: 'Благословение',
      level: 1,
      school: 'Enchantment',
      prepared: true,
      concentration: true,
    },
  ],
};

describe('Open Character Format .ttrpgh Engine', () => {
  it('correctly exports PartyMember to typed TtrpghFile schema', () => {
    const ttrpgh = exportCharacterToTtrpgh(SAMPLE_PALADIN);

    expect(ttrpgh.format).toBe('ttrpgh');
    expect(ttrpgh.version).toBe(TTRPGH_FORMAT_VERSION);
    expect(ttrpgh.system).toBe('dnd2024');

    expect(ttrpgh.meta.appVersion).toBe(TTRPGH_APP_VERSION);
    expect(ttrpgh.meta.createdAt).toBeTypeOf('string');
    expect(ttrpgh.meta.updatedAt).toBeTypeOf('string');

    // Identity
    expect(ttrpgh.identity.name).toBe('Эльдрих Светоносный');
    expect(ttrpgh.identity.class).toBe('Паладин');
    expect(ttrpgh.identity.subclass).toBe('Клятва Преданности');
    expect(ttrpgh.identity.level).toBe(5);
    expect(ttrpgh.identity.speciesName).toBe('Человек');

    // Token
    expect(ttrpgh.token.hasCustomToken).toBe(true);
    expect(ttrpgh.token.base64).toBe(SAMPLE_PALADIN.avatarUrl);
    expect(ttrpgh.token.ringColor).toBe('#3B82F6');

    // Attributes
    expect(ttrpgh.attributes.str).toBe(16);
    expect(ttrpgh.attributes.dex).toBe(12);
    expect(ttrpgh.attributes.con).toBe(14);
    expect(ttrpgh.attributes.int).toBe(10);
    expect(ttrpgh.attributes.wis).toBe(12);
    expect(ttrpgh.attributes.cha).toBe(16);

    // Vitals
    expect(ttrpgh.vitals.hpCurrent).toBe(40);
    expect(ttrpgh.vitals.hpMax).toBe(44);
    expect(ttrpgh.vitals.hpTemp).toBe(5);
    expect(ttrpgh.vitals.hitDice.current).toBe(4);
    expect(ttrpgh.vitals.hitDice.max).toBe(5);
    expect(ttrpgh.vitals.hitDice.type).toBe('d10');
    expect(ttrpgh.vitals.exhaustion).toBe(0);

    // Combat
    expect(ttrpgh.combat.ac).toBe(18);
    expect(ttrpgh.combat.speed).toBe('30 фт.');
    expect(ttrpgh.combat.initiativeBonus).toBe(1);
    expect(ttrpgh.combat.masteries).toEqual(['Длинный меч: Sap']);

    // Skills & Spells & Resources
    expect(ttrpgh.savingThrows.proficiencies).toEqual(['wis', 'cha']);
    expect(ttrpgh.skills.Athletics).toBe('proficient');
    expect(ttrpgh.skills.Persuasion).toBe('expertise');
    expect(ttrpgh.classResources).toHaveLength(1);
    expect(ttrpgh.classResources[0].name).toBe('Наложение рук');
    expect(ttrpgh.spells.spellSaveDc).toBe(14);
    expect(ttrpgh.spells.preparedSpells).toHaveLength(1);
    expect(ttrpgh.spells.preparedSpells?.[0].name).toBe('Благословение');
  });

  it('serializes and deserializes .ttrpgh file with full round-trip fidelity', () => {
    const exported = exportCharacterToTtrpgh(SAMPLE_PALADIN);
    const jsonStr = serializeTtrpgh(exported);

    expect(typeof jsonStr).toBe('string');
    expect(jsonStr).toContain('"format": "ttrpgh"');
    expect(jsonStr).toContain('"version": 1');
    expect(jsonStr).toContain('"system": "dnd2024"');

    const deserialized = deserializeTtrpgh(jsonStr);
    expect(deserialized.format).toBe('ttrpgh');
    expect(deserialized.version).toBe(1);
    expect(deserialized.identity.name).toBe(SAMPLE_PALADIN.name);
    expect(deserialized.attributes).toEqual(exported.attributes);
    expect(deserialized.vitals).toEqual(exported.vitals);
  });

  it('throws helpful errors when deserializing invalid .ttrpgh data', () => {
    expect(() => deserializeTtrpgh('')).toThrow('Некорректные данные');
    expect(() => deserializeTtrpgh('{"not":"json"')).toThrow('Ошибка разбора JSON');
    expect(() => deserializeTtrpgh(JSON.stringify({ format: 'other' }))).toThrow(
      'Неподдерживаемый формат'
    );
    expect(() => deserializeTtrpgh(JSON.stringify({ format: 'ttrpgh', version: 99 }))).toThrow(
      'Неподдерживаемая версия'
    );
  });

  it('imports .ttrpgh data into a functional PartyMember entity', () => {
    const exported = exportCharacterToTtrpgh(SAMPLE_PALADIN);
    const imported = importCharacterFromTtrpgh(exported);

    expect(imported.id).toBeTruthy();
    expect(imported.name).toBe(SAMPLE_PALADIN.name);
    expect(imported.characterClass).toBe('Паладин (Клятва Преданности)');
    expect(imported.level).toBe(5);
    expect(imported.species).toBe('Человек');
    expect(imported.ac).toBe(18);
    expect(imported.maxHp).toBe(44);
    expect(imported.currentHp).toBe(40);
    expect(imported.tempHp).toBe(5);
    expect(imported.stats?.str).toBe(16);
    expect(imported.stats?.cha).toBe(16);
    expect(imported.savingThrowProficiencies).toEqual(['wis', 'cha']);
    expect(imported.avatarUrl).toBe(SAMPLE_PALADIN.avatarUrl);
    expect(imported.color).toBe('#3B82F6');
  });

  it('embeds custom token Base64 directly into .ttrpgh and extracts on import', () => {
    const customTokenBase64 = 'data:image/png;base64,proceduralTokenBase64Sample';
    const exported = exportCharacterToTtrpgh(SAMPLE_PALADIN, customTokenBase64, 'knight-steel');

    expect(exported.token.hasCustomToken).toBe(true);
    expect(exported.token.base64).toBe(customTokenBase64);
    expect(exported.token.frameStyle).toBe('knight-steel');

    const imported = importCharacterFromTtrpgh(exported);
    expect(imported.avatarUrl).toBe(customTokenBase64);
  });
});

describe('QR Code Offline Compact Transport', () => {
  it('compresses key character stats into a compact QR payload with TTRPGH:1: prefix', () => {
    const qrString = compressForQr(SAMPLE_PALADIN);

    expect(qrString.startsWith('TTRPGH:1:')).toBe(true);
    // Must be compact for high QR scannability (< 500 chars)
    expect(qrString.length).toBeLessThan(500);
  });

  it('accurately decompresses key character stats from QR payload including Cyrillic UTF-8', () => {
    const qrString = compressForQr(SAMPLE_PALADIN);
    const unpacked = decompressFromQr(qrString);

    expect(unpacked.format).toBe('ttrpgh');
    expect(unpacked.identity.name).toBe(SAMPLE_PALADIN.name);
    expect(unpacked.identity.class).toBe('Паладин');
    expect(unpacked.identity.subclass).toBe('Клятва Преданности');
    expect(unpacked.identity.level).toBe(5);
    expect(unpacked.identity.speciesName).toBe('Человек');

    expect(unpacked.combat.ac).toBe(18);
    expect(unpacked.combat.speed).toBe('30 фт.');
    expect(unpacked.combat.initiativeBonus).toBe(1);

    expect(unpacked.vitals.hpCurrent).toBe(40);
    expect(unpacked.vitals.hpMax).toBe(44);

    expect(unpacked.attributes.str).toBe(16);
    expect(unpacked.attributes.dex).toBe(12);
    expect(unpacked.attributes.con).toBe(14);
    expect(unpacked.attributes.int).toBe(10);
    expect(unpacked.attributes.wis).toBe(12);
    expect(unpacked.attributes.cha).toBe(16);

    expect(unpacked.savingThrows.proficiencies).toEqual(['wis', 'cha']);
  });

  it('rejects invalid QR payload missing the TTRPGH:1: prefix', () => {
    expect(() => decompressFromQr('INVALID:DATA')).toThrow('Некорректный QR код');
  });
});

describe('Procedural Token Generator: Paper-Doll Engine', () => {
  it('registers all required silhouette, armor, weapon, head and effect options', () => {
    expect(SILHOUETTE_OPTIONS).toHaveLength(8);
    expect(ARMOR_OPTIONS).toHaveLength(5);
    expect(WEAPON_OPTIONS).toHaveLength(7);
    expect(HEAD_FEATURE_OPTIONS).toHaveLength(6);
    expect(EFFECT_OPTIONS).toHaveLength(4);
    expect(FACTION_COLOR_PALETTE.length).toBeGreaterThanOrEqual(6);
  });

  it('generates a valid randomized Paper-Doll configuration', () => {
    const config = randomProceduralTokenConfig();

    expect(config.silhouette).toBeTruthy();
    expect(config.armor).toBeTruthy();
    expect(config.weapon).toBeTruthy();
    expect(config.headFeature).toBeTruthy();
    expect(config.effect).toBeTruthy();
    expect(config.frameId).toBeTruthy();
    expect(config.backgroundColor).toBeTruthy();
    expect(config.accentColor).toBeTruthy();
  });

  it('renders Paper-Doll tokens onto canvas without errors for all 8 silhouettes', () => {
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

    for (const sil of silhouettes) {
      const { canvas, operations } = createMockCanvas(512, 512);
      renderProceduralToken(canvas, {
        silhouette: sil,
        silhouetteColor: '#cbd5e1',
        armor: 'plate',
        armorColor: '#94a3b8',
        weapon: 'sword',
        weaponColor: '#e2e8f0',
        headFeature: 'helm',
        headFeatureColor: '#64748b',
        effect: 'flames',
        effectColor: '#f97316',
        backgroundPattern: 'radial_gradient',
        backgroundColor: '#0f172a',
        accentColor: '#ef4444',
        frameId: 'gold-runic',
        glowIntensity: 50,
      });

      expect(operations).toContain('clip');
      expect(operations).toContain('fill');
      expect(operations).toContain('stroke');
      expect(operations.length).toBeGreaterThan(20);
    }
  });

  it('renders each armor type cleanly onto canvas', () => {
    const armors: ArmorType[] = ['none', 'plate', 'leather', 'mage_robes', 'rags'];

    for (const arm of armors) {
      const { canvas, operations } = createMockCanvas(512, 512);
      renderProceduralToken(canvas, {
        silhouette: 'humanoid',
        silhouetteColor: '#cbd5e1',
        armor: arm,
        armorColor: '#94a3b8',
        weapon: 'none',
        weaponColor: '#e2e8f0',
        headFeature: 'none',
        headFeatureColor: '#64748b',
        effect: 'none',
        effectColor: '#f97316',
        backgroundPattern: 'runic_circle',
        backgroundColor: '#0f172a',
        accentColor: '#3b82f6',
        frameId: 'knight-steel',
      });

      expect(operations.length).toBeGreaterThan(10);
    }
  });

  it('renders each weapon type cleanly onto canvas', () => {
    const weapons: WeaponType[] = [
      'none',
      'sword',
      'mage_staff',
      'bow',
      'shield',
      'spellbook',
      'dagger',
    ];

    for (const w of weapons) {
      const { canvas, operations } = createMockCanvas(512, 512);
      renderProceduralToken(canvas, {
        silhouette: 'humanoid',
        silhouetteColor: '#cbd5e1',
        armor: 'none',
        armorColor: '#94a3b8',
        weapon: w,
        weaponColor: '#e2e8f0',
        headFeature: 'none',
        headFeatureColor: '#64748b',
        effect: 'none',
        effectColor: '#f97316',
        backgroundPattern: 'cross_hatch',
        backgroundColor: '#0f172a',
        accentColor: '#3b82f6',
        frameId: 'fire-arcane',
      });

      expect(operations.length).toBeGreaterThan(10);
    }
  });
});

describe('Procedural Token Generator: Heraldry & Mob Packs Engine', () => {
  it('registers all 7 heraldry signs', () => {
    expect(HERALDRY_SIGN_OPTIONS).toHaveLength(7);
    const signIds = HERALDRY_SIGN_OPTIONS.map((s) => s.id);
    expect(signIds).toContain('skull');
    expect(signIds).toContain('wolf_paw');
    expect(signIds).toContain('crossed_swords');
    expect(signIds).toContain('dragon');
    expect(signIds).toContain('eye');
    expect(signIds).toContain('shield');
    expect(signIds).toContain('flame');
  });

  it('generates a valid randomized Heraldry configuration', () => {
    const config = randomHeraldryConfig();
    expect(config.sign).toBeTruthy();
    expect(config.factionColor).toBeTruthy();
    expect(config.badgeNumber).toBeGreaterThanOrEqual(1);
    expect(config.badgeNumber).toBeLessThanOrEqual(10);
    expect(['arabic', 'roman']).toContain(config.numberFormat);
  });

  it('renders each heraldic sign onto canvas', () => {
    const signs: HeraldrySign[] = [
      'skull',
      'wolf_paw',
      'crossed_swords',
      'dragon',
      'eye',
      'shield',
      'flame',
    ];

    for (const s of signs) {
      const { canvas, operations } = createMockCanvas(512, 512);
      renderHeraldryToken(canvas, {
        sign: s,
        factionColor: '#ef4444',
        backgroundColor: '#0c0e14',
        badgeNumber: 3,
        numberFormat: 'arabic',
        frameId: 'bone-skulls',
        glowIntensity: 50,
      });

      expect(operations).toContain('clip');
      expect(operations).toContain('fill');
    }
  });

  it('renders large mob badge with Arabic numbers (1..10)', () => {
    const { canvas, textDrawn } = createMockCanvas(512, 512);
    renderHeraldryToken(canvas, {
      sign: 'wolf_paw',
      factionColor: '#ef4444',
      backgroundColor: '#0c0e14',
      badgeNumber: 7,
      numberFormat: 'arabic',
      frameId: 'gold-runic',
    });

    expect(textDrawn).toContain('7');
  });

  it('renders large mob badge with Roman numerals (I..X)', () => {
    const romanMappings: Array<{ num: number; expected: string }> = [
      { num: 1, expected: 'I' },
      { num: 4, expected: 'IV' },
      { num: 5, expected: 'V' },
      { num: 9, expected: 'IX' },
      { num: 10, expected: 'X' },
    ];

    for (const { num, expected } of romanMappings) {
      const { canvas, textDrawn } = createMockCanvas(512, 512);
      renderHeraldryToken(canvas, {
        sign: 'skull',
        factionColor: '#a855f7',
        backgroundColor: '#0c0e14',
        badgeNumber: num,
        numberFormat: 'roman',
        frameId: 'knight-steel',
      });

      expect(textDrawn).toContain(expected);
    }
  });

  it('does not render mob badge when numberFormat is none', () => {
    const { canvas, textDrawn } = createMockCanvas(512, 512);
    renderHeraldryToken(canvas, {
      sign: 'crossed_swords',
      factionColor: '#3b82f6',
      backgroundColor: '#0c0e14',
      badgeNumber: 1,
      numberFormat: 'none',
      frameId: 'frameless',
    });

    expect(textDrawn.some((t) => /^\d+$/.test(t) || /^[IVXLCDM]+$/.test(t))).toBe(false);
    expect(textDrawn).toHaveLength(0);
  });
});

describe('Party Store QR Modal Actions', () => {
  it('opens and closes QR modal with target member id', async () => {
    const { usePartyStore } = await import('../store/partyStore');
    const store = usePartyStore.getState();

    expect(store.isQrModalOpen).toBe(false);
    expect(store.qrTargetMemberId).toBe(null);

    store.openQrModal('member-123');
    expect(usePartyStore.getState().isQrModalOpen).toBe(true);
    expect(usePartyStore.getState().qrTargetMemberId).toBe('member-123');

    store.closeQrModal();
    expect(usePartyStore.getState().isQrModalOpen).toBe(false);
    expect(usePartyStore.getState().qrTargetMemberId).toBe(null);
  });
});

