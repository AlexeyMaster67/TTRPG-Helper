import { describe, it, expect, beforeEach } from 'vitest';
import { useSettingsStore } from '../store/settingsStore';
import { t, getTranslation, interpolate, LOCALES } from '../i18n';
import {
  localizeDamageType,
  localizeSkill,
  localizeCondition,
  localizeCreatureType,
  localizeRarity,
  localizeItemType,
  localizeStat,
  formatSpeed,
  formatSpeedRu,
  localizeMonsterName,
  localizeSenses,
  resolveLanguage,
} from '../utils/textUtils';

describe('i18n & Localization Architecture Test Suite', () => {
  beforeEach(() => {
    if (typeof globalThis.localStorage === 'undefined') {
      const storage: Record<string, string> = {};
      (globalThis as any).localStorage = {
        getItem: (k: string) => storage[k] || null,
        setItem: (k: string, v: string) => {
          storage[k] = String(v);
        },
        removeItem: (k: string) => {
          delete storage[k];
        },
        clear: () => {
          for (const k in storage) delete storage[k];
        },
        length: 0,
        key: () => null,
      };
    }
    // Reset settings store to canonical English default
    useSettingsStore.setState({
      language: 'en',
    });
  });

  describe('1. SettingsStore Language Connection', () => {
    it('defaults language strictly to "en"', () => {
      const state = useSettingsStore.getState();
      expect(state.language).toBe('en');
    });

    it('sets language to "ru" and back to "en"', () => {
      const { setLanguage } = useSettingsStore.getState();

      setLanguage('ru');
      expect(useSettingsStore.getState().language).toBe('ru');

      setLanguage('en');
      expect(useSettingsStore.getState().language).toBe('en');
    });

    it('toggles language between "en" and "ru"', () => {
      const { toggleLanguage } = useSettingsStore.getState();

      expect(useSettingsStore.getState().language).toBe('en');

      toggleLanguage();
      expect(useSettingsStore.getState().language).toBe('ru');

      toggleLanguage();
      expect(useSettingsStore.getState().language).toBe('en');
    });

    it('persists language in localStorage', () => {
      const { setLanguage } = useSettingsStore.getState();

      setLanguage('ru');
      const raw = localStorage.getItem('dnd_ait_settings_v1');
      expect(raw).toBeTruthy();
      const parsed = JSON.parse(raw!);
      expect(parsed.language).toBe('ru');
    });
  });

  describe('2. i18n Translation Engine', () => {
    it('interpolates parameters using {{key}} and {key}', () => {
      expect(interpolate('Round {{round}}', { round: 3 })).toBe('Round 3');
      expect(interpolate('Hello {name}!', { name: 'Fighter' })).toBe('Hello Fighter!');
      expect(interpolate('DC {{dc}} save against {{type}}', { dc: 15, type: 'Poison' })).toBe(
        'DC 15 save against Poison'
      );
    });

    it('resolves canonical English and Russian translations for all application domains', () => {
      // Header & Navigation
      expect(getTranslation('en', 'header.combat')).toBe('Combat');
      expect(getTranslation('ru', 'header.combat')).toBe('Бой');
      expect(getTranslation('en', 'header.broadcasting')).toBe('ON AIR');
      expect(getTranslation('ru', 'header.broadcasting')).toBe('В ЭФИРЕ');

      // Master Tools
      expect(getTranslation('en', 'masterTools.lootGenerator')).toBe('Loot & Treasures d100');
      expect(getTranslation('ru', 'masterTools.lootGenerator')).toBe('Добыча и сокровища d100');
      expect(getTranslation('en', 'masterTools.soundboard')).toBe('Soundboard & Ambience');
      expect(getTranslation('ru', 'masterTools.soundboard')).toBe('Саундборд и атмосфера');

      // Combat Roster
      expect(getTranslation('en', 'combat.nextTurn')).toBe('Next Turn');
      expect(getTranslation('ru', 'combat.nextTurn')).toBe('Следующий ход');
      expect(getTranslation('en', 'combat.concentration')).toBe('Concentration');
      expect(getTranslation('ru', 'combat.concentration')).toBe('Концентрация');
      expect(getTranslation('en', 'combat.roundNumber', { round: 2 })).toBe('Round 2');
      expect(getTranslation('ru', 'combat.roundNumber', { round: 2 })).toBe('Раунд 2');

      // Bestiary
      expect(getTranslation('en', 'bestiary.filterCr')).toBe('Filter by CR');
      expect(getTranslation('ru', 'bestiary.filterCr')).toBe('Фильтр по КО');

      // Statblock
      expect(getTranslation('en', 'statblock.str')).toBe('STR');
      expect(getTranslation('ru', 'statblock.str')).toBe('СИЛ');
      expect(getTranslation('en', 'statblock.armorClass')).toBe('Armor Class');
      expect(getTranslation('ru', 'statblock.armorClass')).toBe('Класс доспеха');

      // Targeted Attack Modal
      expect(getTranslation('en', 'targetedAttack.advantage')).toBe('Advantage');
      expect(getTranslation('ru', 'targetedAttack.advantage')).toBe('Преимущество');
      expect(getTranslation('en', 'targetedAttack.coverHalf')).toBe('Half Cover (+2 AC / Dex)');
      expect(getTranslation('ru', 'targetedAttack.coverHalf')).toBe('Половинное (+2 КД / Лов)');

      // Mob Combat Modal
      expect(getTranslation('en', 'mobCombat.mobSize')).toBe('Number of Attackers (Mob Size)');
      expect(getTranslation('ru', 'mobCombat.mobSize')).toBe('Количество атакующих (размер толпы)');

      // Map
      expect(getTranslation('en', 'map.fogOfWar')).toBe('Fog of War');
      expect(getTranslation('ru', 'map.fogOfWar')).toBe('Туман войны');
      expect(getTranslation('en', 'map.measurementTool')).toBe('Distance Measurement');
      expect(getTranslation('ru', 'map.measurementTool')).toBe('Линейка (дистанция)');

      // Party Manager
      expect(getTranslation('en', 'party.shortRest')).toBe('Short Rest');
      expect(getTranslation('ru', 'party.shortRest')).toBe('Короткий отдых');

      // Character Builder & Sheet
      expect(getTranslation('en', 'characterBuilder.standardArray')).toContain('Standard Array');
      expect(getTranslation('ru', 'characterBuilder.standardArray')).toContain('Стандартный набор');

      // Encounters
      expect(getTranslation('en', 'encounters.deadly')).toBe('Deadly');
      expect(getTranslation('ru', 'encounters.deadly')).toBe('Смертельная');

      // Loot
      expect(getTranslation('en', 'loot.hoardLoot')).toBe('Treasure Hoard');
      expect(getTranslation('ru', 'loot.hoardLoot')).toBe('Сокровищница (клад)');

      // Soundboard
      expect(getTranslation('en', 'soundboard.stopAll')).toBe('Stop All Audio');
      expect(getTranslation('ru', 'soundboard.stopAll')).toBe('Остановить все звуки');

      // Token Forge
      expect(getTranslation('en', 'tokenForge.downloadToken')).toBe('Download Token (.png)');
      expect(getTranslation('ru', 'tokenForge.downloadToken')).toBe('Скачать токен (.png)');

      // Procedural Map
      expect(getTranslation('en', 'proceduralMap.apply')).toBe('Apply to Battlemap');
      expect(getTranslation('ru', 'proceduralMap.apply')).toBe('Применить на карту');

      // NPC Generator
      expect(getTranslation('en', 'npcGenerator.quirk')).toBe('Quirk & Mannerism');
      expect(getTranslation('ru', 'npcGenerator.quirk')).toBe('Особенность и манера');

      // Rules Cheat Sheet
      expect(getTranslation('en', 'rulesCheatSheet.actionsInCombat')).toBe('Actions in Combat');
      expect(getTranslation('ru', 'rulesCheatSheet.actionsInCombat')).toBe('Действия в бою');

      // Settings
      expect(getTranslation('en', 'settings.themeSelector')).toBe('Visual Theme');
      expect(getTranslation('ru', 'settings.themeSelector')).toBe('Тема оформления');

      // Toasts
      expect(getTranslation('en', 'toasts.monsterAdded', { name: 'Goblin' })).toBe(
        'Added to combat: Goblin'
      );
      expect(getTranslation('ru', 'toasts.monsterAdded', { name: 'Гоблин' })).toBe(
        'Добавлен в бой: Гоблин'
      );
    });

    it('falls back gracefully on unknown keys', () => {
      expect(t('unknown.nested.key')).toBe('unknown.nested.key');
    });

    it('exports LOCALES dictionary for all supported languages', () => {
      expect(LOCALES.en).toBeDefined();
      expect(LOCALES.ru).toBeDefined();
      expect(LOCALES.en.header.combat).toBe('Combat');
      expect(LOCALES.ru.header.combat).toBe('Бой');
    });

    it('resolves explicit and fallback languages via resolveLanguage', () => {
      expect(resolveLanguage('en')).toBe('en');
      expect(resolveLanguage('ru')).toBe('ru');
      expect(resolveLanguage(undefined)).toBe('en');
    });

    it('reactively uses current store language in standalone t()', () => {
      useSettingsStore.setState({ language: 'en' });
      expect(t('common.save')).toBe('Save');

      useSettingsStore.setState({ language: 'ru' });
      expect(t('common.save')).toBe('Сохранить');
    });
  });

  describe('3. Bilingual textUtils Terminology Functions', () => {
    it('localizes damage types canonically in en and ru', () => {
      expect(localizeDamageType('slashing', 'en')).toBe('Slashing');
      expect(localizeDamageType('slashing', 'ru')).toBe('Рубящий');
      expect(localizeDamageType('рубящий', 'en')).toBe('Slashing');
      expect(localizeDamageType('рубящий', 'ru')).toBe('Рубящий');

      expect(localizeDamageType('fire', 'en')).toBe('Fire');
      expect(localizeDamageType('fire', 'ru')).toBe('Огонь');
      expect(localizeDamageType('огонь', 'en')).toBe('Fire');
      expect(localizeDamageType('огонь', 'ru')).toBe('Огонь');

      expect(localizeDamageType('radiant', 'en')).toBe('Radiant');
      expect(localizeDamageType('radiant', 'ru')).toBe('Излучение');
    });

    it('localizes skills canonically in en and ru', () => {
      expect(localizeSkill('stealth', 'en')).toBe('Stealth');
      expect(localizeSkill('stealth', 'ru')).toBe('Скрытность');
      expect(localizeSkill('скрытность', 'en')).toBe('Stealth');
      expect(localizeSkill('скрытность', 'ru')).toBe('Скрытность');

      expect(localizeSkill('animal_handling', 'en')).toBe('Animal Handling');
      expect(localizeSkill('animal_handling', 'ru')).toBe('Уход за животными');
      expect(localizeSkill('sleight_of_hand', 'en')).toBe('Sleight of Hand');
      expect(localizeSkill('sleight_of_hand', 'ru')).toBe('Ловкость рук');
    });

    it('localizes conditions canonically in en and ru', () => {
      expect(localizeCondition('blinded', 'en')).toBe('Blinded');
      expect(localizeCondition('blinded', 'ru')).toBe('Ослеплённый');
      expect(localizeCondition('ослеплённый', 'en')).toBe('Blinded');
      expect(localizeCondition('ослеплённый', 'ru')).toBe('Ослеплённый');

      expect(localizeCondition('dazed', 'en')).toBe('Dazed');
      expect(localizeCondition('dazed', 'ru')).toBe('Ошеломлённый');
      expect(localizeCondition('prone', 'en')).toBe('Prone');
      expect(localizeCondition('prone', 'ru')).toBe('Сбит с ног');
    });

    it('localizes creature types canonically in en and ru including compound types', () => {
      expect(localizeCreatureType('dragon', 'en')).toBe('Dragon');
      expect(localizeCreatureType('dragon', 'ru')).toBe('Дракон');
      expect(localizeCreatureType('дракон', 'en')).toBe('Dragon');
      expect(localizeCreatureType('дракон', 'ru')).toBe('Дракон');

      expect(localizeCreatureType('undead', 'en')).toBe('Undead');
      expect(localizeCreatureType('undead', 'ru')).toBe('Нежить');

      expect(localizeCreatureType('swarm of tiny beasts', 'en')).toBe('Swarm of Tiny Beasts');
      expect(localizeCreatureType('swarm of tiny beasts', 'ru')).toBe('Рой крошечных зверей');
      expect(localizeCreatureType('рой крошечных зверей', 'en')).toBe('Swarm of Tiny Beasts');
    });

    it('localizes item rarities and types canonically in en and ru', () => {
      expect(localizeRarity('uncommon', 'en')).toBe('Uncommon');
      expect(localizeRarity('uncommon', 'ru')).toBe('Необычный');
      expect(localizeRarity('необычный', 'en')).toBe('Uncommon');
      expect(localizeRarity(null, 'en')).toBe('Magical');
      expect(localizeRarity(null, 'ru')).toBe('Магический');

      expect(localizeItemType('weapon', 'en')).toBe('Weapon');
      expect(localizeItemType('weapon', 'ru')).toBe('Оружие');
      expect(localizeItemType('оружие', 'en')).toBe('Weapon');
      expect(localizeItemType('wondrous item', 'en')).toBe('Wondrous Item');
      expect(localizeItemType('wondrous item', 'ru')).toBe('Чудесный предмет');
    });

    it('localizes stats (short & full) canonically in en and ru', () => {
      expect(localizeStat('str', false, 'en')).toBe('STR');
      expect(localizeStat('str', false, 'ru')).toBe('СИЛ');
      expect(localizeStat('str', true, 'en')).toBe('Strength');
      expect(localizeStat('str', true, 'ru')).toBe('Сила');

      expect(localizeStat('dex', false, 'en')).toBe('DEX');
      expect(localizeStat('dex', false, 'ru')).toBe('ЛОВ');
      expect(localizeStat('dex', true, 'en')).toBe('Dexterity');
      expect(localizeStat('dex', true, 'ru')).toBe('Ловкость');

      expect(localizeStat('интеллект', false, 'en')).toBe('INT');
      expect(localizeStat('интеллект', true, 'en')).toBe('Intelligence');
    });

    it('formats speed canonically in en and ru', () => {
      expect(formatSpeed('30 ft.', 'en')).toBe('30 ft.');
      expect(formatSpeed('30 ft.', 'ru')).toBe('30 фт.');
      expect(formatSpeed('30 фт.', 'en')).toBe('30 ft.');
      expect(formatSpeed('30 фт., полет 60 фт.', 'en')).toBe('30 ft., fly 60 ft.');
      expect(formatSpeed('30 ft., fly 60 ft.', 'ru')).toBe('30 фт., полёт 60 фт.');
      expect(formatSpeedRu('30 ft.')).toBe('30 фт.');
    });

    it('localizes senses canonically in en and ru', () => {
      expect(localizeSenses('darkvision 60 ft.', 'en')).toBe('darkvision 60 ft.');
      expect(localizeSenses('darkvision 60 ft.', 'ru')).toBe('тёмное зрение 60 фт.');
      expect(localizeSenses('тёмное зрение 60 фт.', 'en')).toBe('darkvision 60 ft.');
      expect(localizeSenses(null, 'en')).toBe('Normal senses');
      expect(localizeSenses(null, 'ru')).toBe('Обычные чувства');
    });

    it('localizes monster names bidirectionally in en and ru', () => {
      expect(localizeMonsterName('Aboleth', 'en')).toBe('Aboleth');
      expect(localizeMonsterName('Aboleth', 'ru')).toBe('Аболет');
      expect(localizeMonsterName('Аболет', 'en')).toBe('Aboleth');
      expect(localizeMonsterName('Аболет', 'ru')).toBe('Аболет');

      expect(localizeMonsterName('Air Elemental', 'en')).toBe('Air Elemental');
      expect(localizeMonsterName('Air Elemental', 'ru')).toBe('Элементаль воздуха');
      expect(localizeMonsterName('Элементаль воздуха', 'en')).toBe('Air Elemental');

      // Parentheticals
      expect(localizeMonsterName('Aboleth (Ancient)', 'en')).toBe('Aboleth (Ancient)');
      expect(localizeMonsterName('Aboleth (Ancient)', 'ru')).toBe('Аболет (Ancient)');
    });

    it('reactively falls back to store language when lang parameter is omitted', () => {
      useSettingsStore.setState({ language: 'en' });
      expect(localizeDamageType('fire')).toBe('Fire');
      expect(localizeStat('str')).toBe('STR');

      useSettingsStore.setState({ language: 'ru' });
      expect(localizeDamageType('fire')).toBe('Огонь');
      expect(localizeStat('str')).toBe('СИЛ');
    });
  });
});
