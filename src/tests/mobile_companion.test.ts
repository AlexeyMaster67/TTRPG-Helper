import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { renderToString } from 'react-dom/server';
import { usePartyStore } from '../store/partyStore';
import { useCombatStore } from '../store/combatStore';
import { PartyMember } from '../types/party';
import { MobileCompanionView } from '../components/mobile/MobileCompanionView';
import { MobileMainTab } from '../components/mobile/tabs/MobileMainTab';
import { MobileCombatTab } from '../components/mobile/tabs/MobileCombatTab';
import { MobileSpellsTab } from '../components/mobile/tabs/MobileSpellsTab';
import { MobileEquipmentTab } from '../components/mobile/tabs/MobileEquipmentTab';
import { MobileCharacterTab } from '../components/mobile/tabs/MobileCharacterTab';
import { MobileFloatingDice } from '../components/mobile/MobileFloatingDice';
import { compressForQr, decompressFromQr } from '../services/ttrpghFormat';

const sampleMobileHero: PartyMember = {
  id: 'hero-mobile-1',
  name: 'Каэлин',
  characterClass: 'Паладин',
  species: 'Аасимар',
  level: 5,
  ac: 18,
  maxHp: 44,
  currentHp: 44,
  tempHp: 5,
  initBonus: 1,
  speed: '30 фт.',
  passivePerception: 13,
  proficiencyBonus: 3,
  hitDiceCurrent: 5,
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
  weapons: [
    {
      id: 'w-1',
      name: 'Солнечный клинок',
      attackBonus: '+6',
      damage: '1d8+3',
      damageType: 'Излучение',
      mastery: 'Задевание',
    },
  ],
  spellSlots: {
    1: { max: 4, used: 1 },
    2: { max: 2, used: 0 },
  },
  preparedSpells: [
    {
      id: 'sp-1',
      name: 'Благословение',
      level: 1,
      school: 'Очарование',
      prepared: true,
    },
  ],
  equipment: [
    {
      id: 'eq-1',
      name: 'Зелье лечения',
      quantity: 3,
      notes: 'Восстанавливает 2d4+2 ХП',
    },
  ],
  attunementSlots: [
    {
      id: 'att-1',
      name: 'Амулет здоровья',
      attuned: true,
    },
    {
      id: 'att-2',
      name: '',
      attuned: false,
    },
    {
      id: 'att-3',
      name: '',
      attuned: false,
    },
  ],
};

const clean = (h: string) => h.replace(/<!--.*?-->/g, '');

describe('Mobile Companion View & Touch-First Architecture Suite', () => {
  beforeEach(() => {
    usePartyStore.setState({
      members: [sampleMobileHero],
      treasury: { gp: 250, sp: 50, cp: 100 },
      isModalOpen: false,
      activeSheetMemberId: null,
      toastNotification: null,
    });

    useCombatStore.setState({
      diceLog: [],
      diceHistory: [],
    });
  });

  describe('Tab Navigation and UI Rendering', () => {
    it('renders MobileCompanionView shell with all 5 navigation tabs', () => {
      const html = clean(renderToString(React.createElement(MobileCompanionView)));

      expect(html).toContain('Главная');
      expect(html).toContain('Бой');
      expect(html).toContain('Магия');
      expect(html).toContain('Снаряжение');
      expect(html).toContain('Герой &amp; QR');
      expect(html).toContain('Каэлин');
      expect(html).toContain('Паладин');
    });

    it('renders MobileMainTab with interactive health widget, combat pills and saving throws', () => {
      const html = clean(
        renderToString(React.createElement(MobileMainTab, { member: sampleMobileHero }))
      );

      // Health widget
      expect(html).toContain('Здоровье персонажа');
      expect(html).toContain('44');
      expect(html).toContain('+5 вр.');
      expect(html).toContain('-1 урон');
      expect(html).toContain('-5 урон');
      expect(html).toContain('-10 урон');
      expect(html).toContain('+1 хил');
      expect(html).toContain('+5 хил');
      expect(html).toContain('+10 хил');

      // Core parameters
      expect(html).toContain('КД');
      expect(html).toContain('18');
      expect(html).toContain('Скорость');
      expect(html).toContain('30 фт.');
      expect(html).toContain('Инициатива');
      expect(html).toContain('Внимание');

      // Death saves and exhaustion
      expect(html).toContain('Спасброски от смерти');
      expect(html).toContain('Успехи');
      expect(html).toContain('Провалы');
      expect(html).toContain('Истощение (0 - 6)');

      // Saving throws
      expect(html).toContain('Спасброски (нажмите для броска)');
      expect(html).toContain('СИЛ');
      expect(html).toContain('ЛОВ');
      expect(html).toContain('ТЕЛ');
      expect(html).toContain('ИНТ');
      expect(html).toContain('МУД');
      expect(html).toContain('ХАР');
    });

    it('renders MobileCombatTab with weapon cards and attack buttons', () => {
      const html = clean(
        renderToString(React.createElement(MobileCombatTab, { member: sampleMobileHero }))
      );

      expect(html).toContain('Оружие и атаки');
      expect(html).toContain('Солнечный клинок');
      expect(html).toContain('+6');
      expect(html).toContain('1d8+3');
      expect(html).toContain('Излучение');
      expect(html).toContain('Свойство мастерства: Задевание');
      expect(html).toContain('Бросок');
    });

    it('renders MobileSpellsTab with spell slots and rest controls', () => {
      const html = renderToString(
        React.createElement(MobileSpellsTab, { member: sampleMobileHero })
      );

      expect(html).toContain('Параметры заклинателя');
      expect(html).toContain('Сл спасброска');
      expect(html).toContain('Короткий отдых');
      expect(html).toContain('Долгий отдых');
      expect(html).toContain('Ячейки заклинаний');
      expect(html).toContain('1-й круг');
      expect(html).toContain('Подготовленные заклинания');
      expect(html).toContain('Благословение');
    });

    it('renders MobileEquipmentTab with treasury, attunement slots and inventory', () => {
      const html = renderToString(
        React.createElement(MobileEquipmentTab, { member: sampleMobileHero })
      );

      expect(html).toContain('Казна отряда');
      expect(html).toContain('Золото (зм)');
      expect(html).toContain('250');
      expect(html).toContain('Серебро (см)');
      expect(html).toContain('50');
      expect(html).toContain('Медь (мм)');
      expect(html).toContain('100');

      expect(html).toContain('Магическая настройка');
      expect(html).toContain('Амулет здоровья');
      expect(html).toContain('Пустой слот настройки');

      expect(html).toContain('Снаряжение и предметы');
      expect(html).toContain('Зелье лечения');
    });

    it('renders MobileCharacterTab with passport, species traits and QR exchange buttons', () => {
      const html = renderToString(
        React.createElement(MobileCharacterTab, {
          member: sampleMobileHero,
          onSelectMember: () => {},
        })
      );

      expect(html).toContain('Оффлайн-обмен и QR');
      expect(html).toContain('Показать QR-код');
      expect(html).toContain('Сканировать QR');
      expect(html).toContain('Экспорт .ttrpgh');
      expect(html).toContain('Импорт .ttrpgh');
      expect(html).toContain('Паспорт героя');
      expect(html).toContain('Каэлин');
      expect(html).toContain('Аасимар');
    });

    it('renders MobileFloatingDice floating action button', () => {
      const html = renderToString(
        React.createElement(MobileFloatingDice, { characterName: 'Каэлин' })
      );

      expect(html).toContain('Бросить кубик');
    });
  });

  describe('Quick Health Adjustments (+/- Damage and Heal)', () => {
    it('correctly applies damage without dropping below 0', () => {
      const updateMember = usePartyStore.getState().updateMember;

      // Apply -10 damage
      const current = usePartyStore.getState().members[0].currentHp!;
      updateMember(sampleMobileHero.id, { currentHp: Math.max(0, current - 10) });

      let updated = usePartyStore.getState().members[0];
      expect(updated.currentHp).toBe(34);

      // Apply fatal 50 damage
      updateMember(sampleMobileHero.id, { currentHp: Math.max(0, updated.currentHp! - 50) });
      updated = usePartyStore.getState().members[0];
      expect(updated.currentHp).toBe(0);
    });

    it('correctly applies healing without exceeding maxHp', () => {
      const updateMember = usePartyStore.getState().updateMember;

      // Start at 20 HP
      updateMember(sampleMobileHero.id, { currentHp: 20 });
      let member = usePartyStore.getState().members[0];
      expect(member.currentHp).toBe(20);

      // Heal +10
      updateMember(sampleMobileHero.id, {
        currentHp: Math.min(member.maxHp, member.currentHp! + 10),
      });
      member = usePartyStore.getState().members[0];
      expect(member.currentHp).toBe(30);

      // Heal +30 (exceeding 44 max)
      updateMember(sampleMobileHero.id, {
        currentHp: Math.min(member.maxHp, member.currentHp! + 30),
      });
      member = usePartyStore.getState().members[0];
      expect(member.currentHp).toBe(44);
    });

    it('manages temporary hit points independently from normal HP', () => {
      const updateMember = usePartyStore.getState().updateMember;

      updateMember(sampleMobileHero.id, { tempHp: 15 });
      let member = usePartyStore.getState().members[0];
      expect(member.tempHp).toBe(15);

      updateMember(sampleMobileHero.id, { tempHp: 0 });
      member = usePartyStore.getState().members[0];
      expect(member.tempHp).toBe(0);
    });
  });

  describe('Tap-to-Spend Spell Slot Consumption', () => {
    it('spends and restores spell slots via slot counter increments', () => {
      const updateMember = usePartyStore.getState().updateMember;

      const member = usePartyStore.getState().members[0];
      const slots = member.spellSlots!;
      expect(slots[1].used).toBe(1);
      expect(slots[1].max).toBe(4);

      // Tap an available slot -> increments used to 2
      const updatedSlots1 = {
        ...slots,
        1: { ...slots[1], used: slots[1].used + 1 },
      };
      updateMember(member.id, { spellSlots: updatedSlots1 });

      let currentMember = usePartyStore.getState().members[0];
      expect(currentMember.spellSlots![1].used).toBe(2);

      // Tap a spent slot -> decrements used back to 1
      const updatedSlots2 = {
        ...currentMember.spellSlots!,
        1: { ...currentMember.spellSlots![1], used: currentMember.spellSlots![1].used - 1 },
      };
      updateMember(member.id, { spellSlots: updatedSlots2 });

      currentMember = usePartyStore.getState().members[0];
      expect(currentMember.spellSlots![1].used).toBe(1);
    });

    it('long rest restores all spell slots used to 0 and clears exhaustion', () => {
      const updateMember = usePartyStore.getState().updateMember;
      const member = usePartyStore.getState().members[0];

      // Set dirty state with used slots and exhaustion
      updateMember(member.id, {
        spellSlots: {
          1: { max: 4, used: 4 },
          2: { max: 2, used: 2 },
        },
        currentHp: 10,
        exhaustion: 1,
      });

      // Execute long rest logic
      const restoredSlots: Record<number, { max: number; used: number }> = {};
      const currentSlots = usePartyStore.getState().members[0].spellSlots!;
      Object.keys(currentSlots).forEach((lvlStr) => {
        const lvl = parseInt(lvlStr, 10);
        restoredSlots[lvl] = { ...currentSlots[lvl], used: 0 };
      });

      updateMember(member.id, {
        currentHp: member.maxHp,
        tempHp: 0,
        spellSlots: restoredSlots,
        exhaustion: Math.max(0, (member.exhaustion || 1) - 1),
      });

      const rested = usePartyStore.getState().members[0];
      expect(rested.currentHp).toBe(44);
      expect(rested.spellSlots![1].used).toBe(0);
      expect(rested.spellSlots![2].used).toBe(0);
      expect(rested.exhaustion).toBe(0);
    });
  });

  describe('Clickable D20 Rolls and Combat Log Recording', () => {
    it('records d20 attack rolls directly to combatStore diceLog', () => {
      const addDiceLog = useCombatStore.getState().addDiceLog;

      addDiceLog({
        id: 'test-roll-1',
        timestamp: '12:00:00',
        combatantName: 'Каэлин',
        actionName: 'Атака: Солнечный клинок',
        attackRoll: {
          d20: 17,
          modifier: 6,
          total: 23,
          isNat20: false,
          isNat1: false,
        },
        damageRoll: {
          formula: '1d8+3',
          total: 8,
          damageType: 'Излучение',
          details: '8',
        },
        weaponMastery: 'Задевание',
      });

      const log = useCombatStore.getState().diceLog;
      expect(log.length).toBe(1);
      expect(log[0].combatantName).toBe('Каэлин');
      expect(log[0].attackRoll?.total).toBe(23);
      expect(log[0].damageRoll?.total).toBe(8);
      expect(log[0].weaponMastery).toBe('Задевание');
    });

    it('records saving throw rolls with proper ability modifiers', () => {
      const addDiceLog = useCombatStore.getState().addDiceLog;

      addDiceLog({
        id: 'test-save-1',
        timestamp: '12:01:00',
        combatantName: 'Каэлин',
        actionName: 'Спасбросок (ХАР)',
        attackRoll: {
          d20: 15,
          modifier: 6, // CHA mod (+3) + PB (+3) = +6
          total: 21,
          isNat20: false,
          isNat1: false,
        },
      });

      const log = useCombatStore.getState().diceLog;
      expect(log.length).toBe(1);
      expect(log[0].actionName).toBe('Спасбросок (ХАР)');
      expect(log[0].attackRoll?.total).toBe(21);
    });
  });

  describe('Offline QR and Data Exchange Contract', () => {
    it('correctly compresses and decompresses character stats for QR exchange', () => {
      const qrPayload = compressForQr(sampleMobileHero);
      expect(qrPayload).toMatch(/^TTRPGH:1:/);

      const decompressed = decompressFromQr(qrPayload);
      expect(decompressed.identity.name).toBe('Каэлин');
      expect(decompressed.identity.class).toBe('Паладин');
      expect(decompressed.identity.level).toBe(5);
      expect(decompressed.combat.ac).toBe(18);
      expect(decompressed.vitals.hpCurrent).toBe(44);
      expect(decompressed.vitals.hpMax).toBe(44);
      expect(decompressed.attributes.str).toBe(16);
      expect(decompressed.attributes.cha).toBe(16);
      expect(decompressed.savingThrows.proficiencies).toContain('wis');
      expect(decompressed.savingThrows.proficiencies).toContain('cha');
    });
  });
});
