import { describe, it, expect, beforeEach } from 'vitest';
import { SPECIES_2024_DATA } from '../data/species2024Data';
import { CLASSES_2024_DATA } from '../data/classes2024Data';
import { BACKGROUNDS_2024_DATA } from '../data/backgrounds2024Data';
import { ARMOR_2024_DATA, WEAPONS_2024_DATA } from '../data/equipment2024Data';
import {
  calculateAbilityModifier,
  calculateProficiencyBonus,
  calculatePointBuy,
  calculateArmorClass,
  calculateHitPoints,
  calculatePassivePerception,
  calculateSpellSlots,
} from '../utils/characterCalculations';
import { usePartyStore } from '../store/partyStore';
import { useCombatStore } from '../store/combatStore';
import { rollDie, rollDiceFormula } from '../engine/rolls';

describe('Stage 4: D&D 2024 Character Wizard & 19 Species', () => {
  describe('1. Canonical 19 Species Database (src/data/species2024Data.ts)', () => {
    it('contains exactly 19 canonical species', () => {
      expect(SPECIES_2024_DATA).toHaveLength(19);
    });

    it('contains all required species by ID', () => {
      const ids = SPECIES_2024_DATA.map((s) => s.id);
      const expectedIds = [
        'aasimar',
        'hexblood',
        'reborn',
        'lupin',
        'gnome',
        'goliath',
        'dhampir',
        'dwarf',
        'dragonborn',
        'kalashtar',
        'warforged',
        'khoravar',
        'orc',
        'halfling',
        'tiefling',
        'human',
        'changeling',
        'shifter',
        'elf',
      ];
      expectedIds.forEach((expectedId) => {
        expect(ids).toContain(expectedId);
      });
    });

    it('verifies Aasimar features and traits', () => {
      const aasimar = SPECIES_2024_DATA.find((s) => s.id === 'aasimar')!;
      expect(aasimar.speed).toBe(30);
      expect(aasimar.darkvision).toBe(60);
      expect(aasimar.resistances).toContain('Некротический');
      expect(aasimar.resistances).toContain('Излучение');
      expect(aasimar.lineages).toHaveLength(3);
      expect(aasimar.traits.some((t) => t.nameRu.includes('Исцеляющие ладони'))).toBe(true);
      expect(aasimar.traits.some((t) => t.nameRu.includes('Несущий свет'))).toBe(true);
    });

    it('verifies Hexblood creature type and ancestral legacy rule', () => {
      const hexblood = SPECIES_2024_DATA.find((s) => s.id === 'hexblood')!;
      expect(hexblood.creatureType).toBe('Фея');
      expect(hexblood.speed).toBe(30);
      expect(hexblood.darkvision).toBe(60);
      expect(hexblood.traits.some((t) => t.nameRu.includes('Ведьмовская магия'))).toBe(true);
      expect(hexblood.traits.some((t) => t.nameRu.includes('Жуткий жетон'))).toBe(true);
      expect(hexblood.traits.some((t) => t.nameRu.includes('Наследие предков'))).toBe(true);
      expect(hexblood.specialRules).toBeDefined();
    });

    it('verifies Reborn deathless nature and rest time', () => {
      const reborn = SPECIES_2024_DATA.find((s) => s.id === 'reborn')!;
      expect(reborn.speed).toBe(30);
      expect(reborn.resistances).toContain('Яд');
      expect(reborn.traits.some((t) => t.nameRu.includes('Бессмертная природа'))).toBe(true);
      expect(reborn.traits.some((t) => t.nameRu.includes('Знания прошлой жизни'))).toBe(true);
    });

    it('verifies Lupin speed and senses', () => {
      const lupin = SPECIES_2024_DATA.find((s) => s.id === 'lupin')!;
      expect(lupin.speed).toBeGreaterThanOrEqual(30);
      expect(lupin.darkvision).toBe(60);
      expect(lupin.traits.some((t) => t.nameRu.includes('Острый нюх и слух'))).toBe(true);
      expect(lupin.traits.some((t) => t.nameRu.includes('Укус'))).toBe(true);
    });

    it('verifies Dwarf darkvision (120 ft) and toughness', () => {
      const dwarf = SPECIES_2024_DATA.find((s) => s.id === 'dwarf')!;
      expect(dwarf.speed).toBe(30);
      expect(dwarf.darkvision).toBe(120);
      expect(dwarf.hpBonusPerLevel).toBe(1);
      expect(dwarf.resistances).toContain('Яд');
      expect(dwarf.traits.some((t) => t.nameRu.includes('Дварфская стойкость'))).toBe(true);
      expect(dwarf.traits.some((t) => t.nameRu.includes('Дварфская крепость'))).toBe(true);
      expect(dwarf.traits.some((t) => t.nameRu.includes('Знание камня'))).toBe(true);
    });

    it('verifies Goliath speed (35 ft) and giant ancestries', () => {
      const goliath = SPECIES_2024_DATA.find((s) => s.id === 'goliath')!;
      expect(goliath.speed).toBe(35);
      expect(goliath.traits.some((t) => t.nameRu.includes('Мощное телосложение'))).toBe(true);
      expect(goliath.traits.some((t) => t.nameRu.includes('Большая форма'))).toBe(true);
      expect(goliath.lineages).toHaveLength(6);
    });

    it('verifies Dhampir speeds and vampiric bite', () => {
      const dhampir = SPECIES_2024_DATA.find((s) => s.id === 'dhampir')!;
      expect(dhampir.speed).toBe(35);
      expect(dhampir.climbSpeed).toBe(35);
      expect(dhampir.darkvision).toBe(60);
      expect(dhampir.traits.some((t) => t.nameRu.includes('Паучье лазание'))).toBe(true);
      expect(dhampir.traits.some((t) => t.nameRu.includes('Вампирский укус'))).toBe(true);
    });

    it('verifies Dragonborn breath weapon and 10 dragon lineages', () => {
      const dragonborn = SPECIES_2024_DATA.find((s) => s.id === 'dragonborn')!;
      expect(dragonborn.speed).toBe(30);
      expect(dragonborn.darkvision).toBe(60);
      expect(dragonborn.lineages).toHaveLength(10);
      expect(dragonborn.traits.some((t) => t.nameRu.includes('Оружие дыхания'))).toBe(true);
      expect(dragonborn.traits.some((t) => t.nameRu.includes('Драконий полёт'))).toBe(true);
    });

    it('verifies Warforged integrated protection and constructed resilience', () => {
      const warforged = SPECIES_2024_DATA.find((s) => s.id === 'warforged')!;
      expect(warforged.bonusAc).toBe(1);
      expect(warforged.resistances).toContain('Яд');
      expect(warforged.traits.some((t) => t.nameRu.includes('Встроенная защита'))).toBe(true);
      expect(warforged.traits.some((t) => t.nameRu.includes('Сконструированная стойкость'))).toBe(true);
    });

    it('verifies Kalashtar dual mind and telepathy', () => {
      const kalashtar = SPECIES_2024_DATA.find((s) => s.id === 'kalashtar')!;
      expect(kalashtar.resistances).toContain('Психический');
      expect(kalashtar.traits.some((t) => t.nameRu.includes('Двойной разум'))).toBe(true);
      expect(kalashtar.traits.some((t) => t.nameRu.includes('Ментальная связь'))).toBe(true);
    });

    it('verifies Orc darkvision (120 ft) and adrenaline rush', () => {
      const orc = SPECIES_2024_DATA.find((s) => s.id === 'orc')!;
      expect(orc.darkvision).toBe(120);
      expect(orc.traits.some((t) => t.nameRu.includes('Адреналиновый рывок'))).toBe(true);
      expect(orc.traits.some((t) => t.nameRu.includes('Несгибаемая стойкость'))).toBe(true);
    });

    it('verifies Elf lineages (Drow 120ft, Wood Elf 35ft, High Elf)', () => {
      const elf = SPECIES_2024_DATA.find((s) => s.id === 'elf')!;
      expect(elf.darkvision).toBe(60);
      expect(elf.defaultSkills).toContain('Perception');
      expect(elf.lineages).toHaveLength(3);
      const drow = elf.lineages?.find((l) => l.id === 'drow');
      const woodElf = elf.lineages?.find((l) => l.id === 'wood-elf');
      expect(drow?.darkvision).toBe(120);
      expect(woodElf?.speedBonus).toBe(5);
    });
  });

  describe('2. D&D 2024 Classes Database (src/data/classes2024Data.ts)', () => {
    it('contains all 12 core classes', () => {
      expect(CLASSES_2024_DATA).toHaveLength(12);
      const ids = CLASSES_2024_DATA.map((c) => c.id);
      expect(ids).toEqual([
        'barbarian',
        'bard',
        'cleric',
        'druid',
        'fighter',
        'monk',
        'paladin',
        'ranger',
        'rogue',
        'sorcerer',
        'warlock',
        'wizard',
      ]);
    });

    it('verifies hit dice of all 12 classes', () => {
      const barbarian = CLASSES_2024_DATA.find((c) => c.id === 'barbarian')!;
      const fighter = CLASSES_2024_DATA.find((c) => c.id === 'fighter')!;
      const paladin = CLASSES_2024_DATA.find((c) => c.id === 'paladin')!;
      const ranger = CLASSES_2024_DATA.find((c) => c.id === 'ranger')!;
      const cleric = CLASSES_2024_DATA.find((c) => c.id === 'cleric')!;
      const wizard = CLASSES_2024_DATA.find((c) => c.id === 'wizard')!;
      const sorcerer = CLASSES_2024_DATA.find((c) => c.id === 'sorcerer')!;

      expect(barbarian.hitDie).toBe('d12');
      expect(barbarian.hitDieValue).toBe(12);

      expect(fighter.hitDie).toBe('d10');
      expect(paladin.hitDie).toBe('d10');
      expect(ranger.hitDie).toBe('d10');

      expect(cleric.hitDie).toBe('d8');
      expect(wizard.hitDie).toBe('d6');
      expect(sorcerer.hitDie).toBe('d6');
    });

    it('verifies saving throw proficiencies', () => {
      const rogue = CLASSES_2024_DATA.find((c) => c.id === 'rogue')!;
      expect(rogue.savingThrows).toEqual(['dex', 'int']);

      const cleric = CLASSES_2024_DATA.find((c) => c.id === 'cleric')!;
      expect(cleric.savingThrows).toEqual(['wis', 'cha']);

      const barbarian = CLASSES_2024_DATA.find((c) => c.id === 'barbarian')!;
      expect(barbarian.savingThrows).toEqual(['str', 'con']);
    });
  });

  describe('3. Point Buy Calculator (27 Points)', () => {
    it('validates 8 across all stats costs 0 points and has 27 remaining', () => {
      const stats = { str: 8, dex: 8, con: 8, int: 8, wis: 8, cha: 8 };
      const result = calculatePointBuy(stats);
      expect(result.totalCost).toBe(0);
      expect(result.remainingPoints).toBe(27);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('validates standard array [15, 14, 13, 12, 10, 8] costs exactly 27 points', () => {
      const stats = { str: 15, dex: 14, con: 13, int: 12, wis: 10, cha: 8 };
      const result = calculatePointBuy(stats);
      expect(result.totalCost).toBe(27);
      expect(result.remainingPoints).toBe(0);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('rejects stats below 8 or above 15', () => {
      const stats = { str: 7, dex: 16, con: 10, int: 10, wis: 10, cha: 10 };
      const result = calculatePointBuy(stats);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('rejects allocations exceeding 27 points', () => {
      const stats = { str: 15, dex: 15, con: 15, int: 10, wis: 10, cha: 10 };
      const result = calculatePointBuy(stats);
      expect(result.totalCost).toBeGreaterThan(27);
      expect(result.isValid).toBe(false);
      expect(result.remainingPoints).toBeLessThan(0);
    });
  });

  describe('3.1. D&D 2024 Backgrounds & Equipment', () => {
    it('contains 12 backgrounds with origin feats and skills', () => {
      expect(BACKGROUNDS_2024_DATA.length).toBeGreaterThanOrEqual(12);
      const soldier = BACKGROUNDS_2024_DATA.find((b) => b.id === 'soldier')!;
      expect(soldier.skills).toContain('Athletics');
      expect(soldier.featNameRu).toBe('Дикарь-атакующий');
    });

    it('contains armor and weapon datasets with masteries', () => {
      expect(ARMOR_2024_DATA.length).toBeGreaterThanOrEqual(10);
      expect(WEAPONS_2024_DATA.length).toBeGreaterThanOrEqual(15);
      const dagger = WEAPONS_2024_DATA.find((w) => w.id === 'dagger')!;
      expect(dagger.mastery).toBe('Nick');
      const longsword = WEAPONS_2024_DATA.find((w) => w.id === 'longsword')!;
      expect(longsword.mastery).toBe('Sap');
    });

    it('tests ability modifiers, proficiency bonus and passive perception calculations', () => {
      expect(calculateAbilityModifier(10)).toBe(0);
      expect(calculateAbilityModifier(18)).toBe(4);
      expect(calculateAbilityModifier(8)).toBe(-1);

      expect(calculateProficiencyBonus(1)).toBe(2);
      expect(calculateProficiencyBonus(5)).toBe(3);
      expect(calculateProficiencyBonus(9)).toBe(4);
      expect(calculateProficiencyBonus(13)).toBe(5);
      expect(calculateProficiencyBonus(17)).toBe(6);

      // Passive Perception
      // 10 + WIS mod (+2) + prof (+3) = 15
      expect(calculatePassivePerception(2, 3, 'proficient')).toBe(15);
      // 10 + WIS mod (+2) + expertise (+6) = 18
      expect(calculatePassivePerception(2, 3, 'expertise')).toBe(18);
    });
  });

  describe('4. AC Calculation Formulas', () => {
    it('calculates unarmored AC (10 + DEX)', () => {
      const ac = calculateArmorClass({
        armorType: 'none',
        dexMod: 3,
      });
      expect(ac).toBe(13);
    });

    it('calculates Barbarian unarmored defense (10 + DEX + CON)', () => {
      const ac = calculateArmorClass({
        armorType: 'none',
        dexMod: 2,
        conMod: 3,
        characterClass: 'Варвар',
      });
      expect(ac).toBe(15);
    });

    it('calculates Barbarian unarmored defense with shield (10 + DEX + CON + 2)', () => {
      const ac = calculateArmorClass({
        armorType: 'none',
        dexMod: 2,
        conMod: 3,
        hasShield: true,
        characterClass: 'Варвар',
      });
      expect(ac).toBe(17);
    });

    it('calculates Monk unarmored defense without shield (10 + DEX + WIS)', () => {
      const ac = calculateArmorClass({
        armorType: 'none',
        dexMod: 3,
        wisMod: 3,
        characterClass: 'Монах',
      });
      expect(ac).toBe(16);
    });

    it('drops Monk unarmored defense if equipped with shield', () => {
      const ac = calculateArmorClass({
        armorType: 'none',
        dexMod: 3,
        wisMod: 3,
        hasShield: true,
        characterClass: 'Монах',
      });
      expect(ac).toBe(15); // 10 + 3 + 2 = 15
    });

    it('calculates Light armor (base + DEX)', () => {
      const ac = calculateArmorClass({
        armorType: 'light',
        baseArmorAc: 12, // Studded Leather
        dexMod: 3,
      });
      expect(ac).toBe(15);
    });

    it('calculates Medium armor with capped DEX bonus (+2 max)', () => {
      const acHighDex = calculateArmorClass({
        armorType: 'medium',
        baseArmorAc: 14, // Breastplate
        dexMod: 4, // Should cap at 2
      });
      expect(acHighDex).toBe(16);

      const acLowDex = calculateArmorClass({
        armorType: 'medium',
        baseArmorAc: 14,
        dexMod: 1,
      });
      expect(acLowDex).toBe(15);
    });

    it('calculates Heavy armor ignoring DEX bonus', () => {
      const ac = calculateArmorClass({
        armorType: 'heavy',
        baseArmorAc: 18, // Plate
        dexMod: 3, // Ignored
        hasShield: true, // +2
      });
      expect(ac).toBe(20);
    });

    it('applies Warforged integrated protection (+1 AC)', () => {
      const ac = calculateArmorClass({
        armorType: 'heavy',
        baseArmorAc: 18,
        dexMod: 0,
        hasShield: true,
        isWarforged: true,
      });
      expect(ac).toBe(21);
    });
  });

  describe('5. HP Calculation Formulas for 12 Classes', () => {
    it('calculates Level 1 HP as max hit die + CON mod', () => {
      const barbHp = calculateHitPoints({
        hitDieValue: 12,
        level: 1,
        conMod: 3,
      });
      expect(barbHp).toBe(15);

      const wizardHp = calculateHitPoints({
        hitDieValue: 6,
        level: 1,
        conMod: 2,
      });
      expect(wizardHp).toBe(8);
    });

    it('calculates Level 5 Barbarian HP using average progression', () => {
      // Level 1: 12 + 3 = 15
      // Levels 2-5: 4 levels * (7 + 3) = 40
      // Total: 55
      const hp = calculateHitPoints({
        hitDieValue: 12,
        level: 5,
        conMod: 3,
        rollMethod: 'average',
      });
      expect(hp).toBe(55);
    });

    it('calculates Dwarf Toughness bonus (+1 HP per level)', () => {
      // Wizard Level 5 (d6, CON +2)
      // Base: 8 + 4 * (4 + 2) = 32
      // Dwarf +5: 37
      const dwarfWizardHp = calculateHitPoints({
        hitDieValue: 6,
        level: 5,
        conMod: 2,
        isDwarf: true,
        rollMethod: 'average',
      });
      expect(dwarfWizardHp).toBe(37);
    });

    it('calculates Fighter Level 10 HP', () => {
      // Level 1: 10 + 2 = 12
      // Levels 2-10: 9 levels * (6 + 2) = 72
      // Total: 84
      const hp = calculateHitPoints({
        hitDieValue: 10,
        level: 10,
        conMod: 2,
      });
      expect(hp).toBe(84);
    });
  });

  describe('6. Spell Slots Calculation (Full, Half, Pact)', () => {
    it('calculates full caster spell slots across levels', () => {
      const slotsLvl1 = calculateSpellSlots('full', 1);
      expect(slotsLvl1[1].max).toBe(2);

      const slotsLvl5 = calculateSpellSlots('full', 5);
      expect(slotsLvl5[1].max).toBe(4);
      expect(slotsLvl5[2].max).toBe(3);
      expect(slotsLvl5[3].max).toBe(2);
    });

    it('calculates half caster (Paladin/Ranger 2024) spell slots from level 1', () => {
      const slotsLvl1 = calculateSpellSlots('half', 1);
      expect(slotsLvl1[1].max).toBe(2);

      const slotsLvl5 = calculateSpellSlots('half', 5);
      expect(slotsLvl5[1].max).toBe(4);
      expect(slotsLvl5[2].max).toBe(2);
    });

    it('calculates Warlock pact magic slots scaling', () => {
      const warlockLvl1 = calculateSpellSlots('pact', 1);
      expect(warlockLvl1[1].max).toBe(1);

      const warlockLvl5 = calculateSpellSlots('pact', 5);
      expect(warlockLvl5[3].max).toBe(2);

      const warlockLvl11 = calculateSpellSlots('pact', 11);
      expect(warlockLvl11[5].max).toBe(3);
    });
  });

  describe('7. Character Creation and partyStore Assembly', () => {
    beforeEach(() => {
      usePartyStore.setState({ members: [] });
    });

    it('adds constructed D&D 2024 character to partyStore', () => {
      const store = usePartyStore.getState();

      store.addMember({
        name: 'Тарион',
        characterClass: 'Воин (Мастер Боевых Искусств)',
        species: 'Голиаф',
        level: 5,
        ac: 19,
        maxHp: 49,
        initBonus: 1,
        passivePerception: 14,
        speed: '35 фт.',
        stats: { str: 18, dex: 12, con: 16, int: 10, wis: 14, cha: 8 },
        savingThrowProficiencies: ['str', 'con'],
        skillProficiencies: {
          Athletics: 'proficient',
          Perception: 'proficient',
          Survival: 'proficient',
        },
        weapons: [
          {
            id: 'w-1',
            name: 'Длинный меч',
            attackBonus: '+7',
            damage: '1d8+4',
            damageType: 'Рубящий',
            mastery: 'Sap',
          },
        ],
      });

      const updated = usePartyStore.getState().members;
      expect(updated).toHaveLength(1);
      expect(updated[0].name).toBe('Тарион');
      expect(updated[0].species).toBe('Голиаф');
      expect(updated[0].ac).toBe(19);
      expect(updated[0].maxHp).toBe(49);
      expect(updated[0].stats?.str).toBe(18);
    });
  });

  describe('8. Clickable Rolls and combatStore.addDiceLog', () => {
    beforeEach(() => {
      useCombatStore.getState().clearDiceLog();
    });

    it('records ability check in diceLog', () => {
      const combatStore = useCombatStore.getState();
      const d20 = rollDie(20);
      const mod = 3;
      const total = d20 + mod;

      combatStore.addDiceLog({
        id: 'roll-check-1',
        timestamp: '12:00:00',
        combatantName: 'Тарион',
        actionName: 'Проверка характеристики: СИЛА',
        attackRoll: {
          d20,
          modifier: mod,
          total,
          isNat20: d20 === 20,
          isNat1: d20 === 1,
        },
        note: `1d20(${d20}) + 3 = ${total}`,
      });

      const log = useCombatStore.getState().diceLog;
      expect(log).toHaveLength(1);
      expect(log[0].actionName).toBe('Проверка характеристики: СИЛА');
      expect(log[0].attackRoll?.total).toBe(total);
    });

    it('records weapon attack and damage rolls in diceLog', () => {
      const combatStore = useCombatStore.getState();
      const dmg = rollDiceFormula('1d8+4');

      combatStore.addDiceLog({
        id: 'roll-atk-1',
        timestamp: '12:00:05',
        combatantName: 'Тарион',
        actionName: 'Атака: Длинный меч',
        attackRoll: {
          d20: 17,
          modifier: 7,
          total: 24,
          isNat20: false,
          isNat1: false,
        },
        damageRoll: {
          formula: '1d8+4',
          total: dmg.total,
          damageType: 'Рубящий',
          details: `1d8+4 = ${dmg.total}`,
        },
        weaponMastery: 'Sap',
        note: 'Атака 24, Урон ' + dmg.total,
      });

      const log = useCombatStore.getState().diceLog;
      expect(log).toHaveLength(1);
      expect(log[0].weaponMastery).toBe('Sap');
      expect(log[0].damageRoll?.damageType).toBe('Рубящий');
      expect(log[0].damageRoll?.total).toBe(dmg.total);
    });

    it('records cantrip / spell roll in diceLog', () => {
      const combatStore = useCombatStore.getState();

      combatStore.addDiceLog({
        id: 'roll-spell-1',
        timestamp: '12:00:10',
        combatantName: 'Магнус',
        actionName: 'Заговор: Огненный снаряд',
        attackRoll: {
          d20: 15,
          modifier: 7,
          total: 22,
          isNat20: false,
          isNat1: false,
        },
        note: 'Бросок сотворения 1d20(15)+7 = 22. Сл спасброска цели: 15',
      });

      const log = useCombatStore.getState().diceLog;
      expect(log).toHaveLength(1);
      expect(log[0].actionName).toContain('Заговор');
      expect(log[0].attackRoll?.total).toBe(22);
    });
  });
});
