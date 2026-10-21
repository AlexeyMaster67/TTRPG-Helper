import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';
import {
  parseSaveDetails,
  getCombatantSaveModifier,
  computeDamageWithDefenses,
} from '../utils/attackParser';
import { Combatant, createDefaultCombatant } from '../types/combat';
import { PartyMember } from '../types/party';
import {
  CONDITIONS_2024,
  ACTIONS_2024,
  WEAPON_MASTERIES_2024,
  CLASSES_2024,
  SPECIES_2024,
  REST_DAMAGE_2024,
  RulesCheatSheetModal,
} from '../components/tools/RulesCheatSheetModal';

describe('D&D 2024 Automated Saving Throws & AoE (attackParser)', () => {
  it('correctly auto-detects English DC save with half damage on success (e.g. Dragon Fire Breath / Fireball)', () => {
    const action = {
      name: 'Fire Breath (Recharge 5–6)',
      desc: 'The dragon exhales fire in a 30-foot cone. Each creature in that area must make a DC 15 Dexterity saving throw, taking 28 (8d6) fire damage on a failed save, or half as much damage on a successful one.',
    };

    const details = parseSaveDetails(action);
    expect(details.isSave).toBe(true);
    expect(details.saveAbility).toBe('dex');
    expect(details.dc).toBe(15);
    expect(details.saveOutcome).toBe('half');
    expect(details.damageFormula).toBe('8d6');
    expect(details.damageType).toBe('fire');
    expect(details.isAoE).toBe(true);
  });

  it('correctly auto-detects Russian DC save with half damage on success', () => {
    const action = {
      name: 'Огненное дыхание',
      desc: 'Дракон выдыхает пламя в конусе 30 футов. Каждое существо должно преуспеть в спасброске Ловкости со СЛ 14, получая 24 (7d6) урона огнем при провале, или половину этого урона при успехе.',
    };

    const details = parseSaveDetails(action);
    expect(details.isSave).toBe(true);
    expect(details.saveAbility).toBe('dex');
    expect(details.dc).toBe(14);
    expect(details.saveOutcome).toBe('half');
    expect(details.damageFormula).toBe('7d6');
    expect(details.damageType).toBe('fire');
    expect(details.isAoE).toBe(true);
  });

  it('correctly detects saves with no damage on success (outcome: none, e.g. Poison Spray / Vicious Mockery)', () => {
    const action = {
      name: 'Vicious Mockery',
      desc: 'You unleash a string of insults. The target must succeed on a DC 13 Wisdom saving throw or take 1d4 psychic damage.',
    };

    const details = parseSaveDetails(action);
    expect(details.isSave).toBe(true);
    expect(details.saveAbility).toBe('wis');
    expect(details.dc).toBe(13);
    expect(details.saveOutcome).toBe('none');
    expect(details.damageFormula).toBe('1d4');
    expect(details.damageType).toBe('psychic');
    expect(details.isAoE).toBe(false);
  });

  it('correctly flags isSave as false for standard melee weapon attacks without saving throws', () => {
    const action = {
      name: 'Bite',
      desc: 'Melee Weapon Attack: +4 to hit, reach 5 ft., one target. Hit: 5 (1d6 + 2) piercing damage.',
    };

    const details = parseSaveDetails(action);
    expect(details.isSave).toBe(false);
  });

  describe('getCombatantSaveModifier', () => {
    it('extracts save modifier from monster explicit saves record (both English and Russian keys)', () => {
      const monster: Combatant = createDefaultCombatant({
        id: 'dragon-1',
        name: 'Young Red Dragon',
        isPlayer: false,
        hp: 178,
        maxHp: 178,
        ac: 18,
        statblock: {
          id: 'dragon-1',
          name_en: 'Young Red Dragon',
          name_ru: 'Молодой красный дракон',
          saves: {
            DEX: 4,
            CON: 8,
            WIS: 4,
            CHA: 6,
          },
        } as any,
      });

      expect(getCombatantSaveModifier(monster, 'dex').modifier).toBe(4);
      expect(getCombatantSaveModifier(monster, 'con').modifier).toBe(8);
      expect(getCombatantSaveModifier(monster, 'wis').modifier).toBe(4);
      expect(getCombatantSaveModifier(monster, 'dex').isProficient).toBe(true);
    });

    it('falls back to ability score modifier when monster lacks explicit save', () => {
      const monster: Combatant = createDefaultCombatant({
        id: 'goblin-1',
        name: 'Goblin',
        isPlayer: false,
        hp: 7,
        maxHp: 7,
        ac: 15,
        statblock: {
          id: 'goblin-1',
          name_en: 'Goblin',
          name_ru: 'Гоблин',
          str: 8,  // -1
          dex: 14, // +2
          con: 10, // 0
          intellect: 10, // 0
          wis: 8,  // -1
          cha: 8,  // -1
        } as any,
      });

      expect(getCombatantSaveModifier(monster, 'dex').modifier).toBe(2);
      expect(getCombatantSaveModifier(monster, 'str').modifier).toBe(-1);
      expect(getCombatantSaveModifier(monster, 'dex').isProficient).toBe(false);
    });

    it('calculates player save modifier including proficiency bonus if proficient', () => {
      const player: Combatant = createDefaultCombatant({
        id: 'player-wizard',
        name: 'Gale',
        isPlayer: true,
        hp: 28,
        maxHp: 28,
        ac: 12,
      });

      const partyMember: PartyMember = {
        id: 'gale-party',
        name: 'Gale',
        characterClass: 'Волшебник',
        ac: 12,
        maxHp: 30,
        initBonus: 2,
        level: 5,
        proficiencyBonus: 3,
        stats: {
          str: 8,
          dex: 14, // mod +2
          con: 14, // mod +2
          int: 18, // mod +4
          wis: 12, // mod +1
          cha: 10,
        },
        savingThrowProficiencies: ['int', 'wis'],
      };

      // INT is proficient: +4 (ability) + 3 (PB) = +7
      expect(getCombatantSaveModifier(player, 'int', partyMember).modifier).toBe(7);
      expect(getCombatantSaveModifier(player, 'int', partyMember).isProficient).toBe(true);
      // WIS is proficient: +1 (ability) + 3 (PB) = +4
      expect(getCombatantSaveModifier(player, 'wis', partyMember).modifier).toBe(4);
      expect(getCombatantSaveModifier(player, 'wis', partyMember).isProficient).toBe(true);
      // DEX is NOT proficient: +2 (ability) + 0 = +2
      expect(getCombatantSaveModifier(player, 'dex', partyMember).modifier).toBe(2);
      expect(getCombatantSaveModifier(player, 'dex', partyMember).isProficient).toBe(false);
      // STR is NOT proficient: -1 (ability) = -1
      expect(getCombatantSaveModifier(player, 'str', partyMember).modifier).toBe(-1);
    });
  });

  describe('computeDamageWithDefenses', () => {
    const targetWithDefenses: Combatant = createDefaultCombatant({
      id: 'target-1',
      name: 'Demon',
      isPlayer: false,
      hp: 50,
      maxHp: 50,
      ac: 15,
      statblock: {
        id: 'demon-1',
        name_en: 'Demon',
        name_ru: 'Демон',
        damage_immunities: 'Огонь, Яд',
        damage_resistances: 'Холод, Электричество',
        damage_vulnerabilities: 'Лучистый',
      } as any,
    });

    it('reduces damage to 0 on immunity', () => {
      const res = computeDamageWithDefenses(20, 'Огонь', targetWithDefenses);
      expect(res.finalDmg).toBe(0);
      expect(res.modifierReason).toBe('immune');
      expect(res.notice).toContain('ИММУНИТЕТ');
    });

    it('halves damage on resistance', () => {
      const res = computeDamageWithDefenses(21, 'Холод', targetWithDefenses);
      expect(res.finalDmg).toBe(10); // Math.floor(21 / 2)
      expect(res.modifierReason).toBe('resistant');
      expect(res.notice).toContain('СОПРОТИВЛЕНИЕ');
    });

    it('doubles damage on vulnerability', () => {
      const res = computeDamageWithDefenses(15, 'Лучистый', targetWithDefenses);
      expect(res.finalDmg).toBe(30);
      expect(res.modifierReason).toBe('vulnerable');
      expect(res.notice).toContain('УЯЗВИМОСТЬ');
    });

    it('leaves damage unchanged for neutral types', () => {
      const res = computeDamageWithDefenses(14, 'Дробящий', targetWithDefenses);
      expect(res.finalDmg).toBe(14);
      expect(res.modifierReason).toBe('normal');
      expect(res.notice).toBe('');
    });
  });
});

describe('RulesCheatSheetModal (D&D 2024 Offline Rules)', () => {
  it('contains complete 14 conditions plus Exhaustion 1-6', () => {
    expect(CONDITIONS_2024.length).toBeGreaterThanOrEqual(15);
    const names = CONDITIONS_2024.map((c) => c.nameEn);
    expect(names).toContain('Blinded');
    expect(names).toContain('Charmed');
    expect(names).toContain('Frightened');
    expect(names).toContain('Grappled');
    expect(names).toContain('Incapacitated');
    expect(names).toContain('Invisible');
    expect(names).toContain('Paralyzed');
    expect(names).toContain('Petrified');
    expect(names).toContain('Poisoned');
    expect(names).toContain('Prone');
    expect(names).toContain('Restrained');
    expect(names).toContain('Stunned');
    expect(names).toContain('Unconscious');
    expect(names).toContain('Exhaustion');
  });

  it('contains 14 combat actions including D&D 2024 updates', () => {
    expect(ACTIONS_2024.length).toBeGreaterThanOrEqual(14);
    const names = ACTIONS_2024.map((a) => a.nameEn);
    expect(names).toContain('Attack');
    expect(names).toContain('Cast a Spell');
    expect(names).toContain('Dash');
    expect(names).toContain('Disengage');
    expect(names).toContain('Dodge');
    expect(names).toContain('Help');
    expect(names).toContain('Hide');
    expect(names).toContain('Influence');
    expect(names).toContain('Ready');
    expect(names).toContain('Search');
    expect(names).toContain('Study');
    expect(names).toContain('Use an Object');
    expect(names).toContain('Bonus Action');
    expect(names).toContain('Reaction');
  });

  it('contains all 8 Weapon Masteries in D&D 2024', () => {
    expect(WEAPON_MASTERIES_2024).toHaveLength(8);
    const names = WEAPON_MASTERIES_2024.map((m) => m.nameEn);
    expect(names).toEqual([
      'Cleave',
      'Graze',
      'Nick',
      'Push',
      'Sap',
      'Slow',
      'Topple',
      'Vex',
    ]);
  });

  it('contains all 12 core D&D 2024 classes', () => {
    expect(CLASSES_2024).toHaveLength(12);
    const names = CLASSES_2024.map((c) => c.nameEn);
    expect(names).toContain('Barbarian');
    expect(names).toContain('Bard');
    expect(names).toContain('Cleric');
    expect(names).toContain('Druid');
    expect(names).toContain('Fighter');
    expect(names).toContain('Monk');
    expect(names).toContain('Paladin');
    expect(names).toContain('Ranger');
    expect(names).toContain('Rogue');
    expect(names).toContain('Sorcerer');
    expect(names).toContain('Warlock');
    expect(names).toContain('Wizard');
  });

  it('contains all 19 species (10 PHB 2024 & 9 expansion species)', () => {
    expect(SPECIES_2024).toHaveLength(19);
    const names = SPECIES_2024.map((s) => s.nameEn);
    expect(names).toContain('Human');
    expect(names).toContain('Elf');
    expect(names).toContain('Dwarf');
    expect(names).toContain('Halfling');
    expect(names).toContain('Gnome');
    expect(names).toContain('Dragonborn');
    expect(names).toContain('Tiefling');
    expect(names).toContain('Orc');
    expect(names).toContain('Goliath');
    expect(names).toContain('Aasimar');
    expect(names).toContain('Hexblood');
    expect(names).toContain('Reborn');
    expect(names).toContain('Lupin');
    expect(names).toContain('Dhampir');
    expect(names).toContain('Kalashtar');
    expect(names).toContain('Warforged');
    expect(names).toContain('Khoravar');
    expect(names).toContain('Changeling');
    expect(names).toContain('Shifter');
  });

  it('contains rest, death saves, 13 damage types, defenses, cover and environment', () => {
    const categories = REST_DAMAGE_2024.map((r) => r.category);
    expect(categories).toContain('rest');
    expect(categories).toContain('death');
    expect(categories).toContain('damage_types');
    expect(categories).toContain('defenses');
    expect(categories).toContain('cover');
    expect(categories).toContain('environment');
  });

  it('renders modal component when open', () => {
    const html = renderToString(
      <RulesCheatSheetModal isOpen={true} onClose={() => {}} />
    );
    expect(html).toContain('Шпаргалка правил');
    expect(html).toContain('SRD 5.2 Offline');
    expect(html).toContain('Ослеплён');
  });

  it('renders null when closed', () => {
    const html = renderToString(
      <RulesCheatSheetModal isOpen={false} onClose={() => {}} />
    );
    expect(html).toBe('');
  });
});
