import { GeneratedLoot, LootCoins, LootMagicItem, LootValuable, PartyCoinSplit } from '../types/loot';
import { dbService } from './dbService';
import rawLootTables from '../data/loot_tables.json';
import {
  DMG_MAGIC_TABLES_META,
  DmgMagicTableId,
  lookupMagicTableItem,
} from '../data/dmgMagicTables';
import { localizeItemType, localizeRarity } from '../utils/textUtils';

interface LootTableSchema {
  currency_tables: {
    individual: Record<string, Array<{ roll_min: number; roll_max: number; formula: string; coin: string; bonus_formula?: string; bonus_coin?: string }>>;
    hoard: Record<string, Record<string, string>>;
  };
  trinkets: string[];
  valuables: Record<string, string[]>;
  magic_items: Record<string, Array<{ name: string; type: string; desc: string }>>;
}

const lootTables = rawLootTables as unknown as LootTableSchema;

export function rollSimpleDice(count: number, sides: number): number {
  let sum = 0;
  for (let i = 0; i < count; i++) {
    sum += Math.floor(Math.random() * sides) + 1;
  }
  return sum;
}

export function evaluateDiceFormula(formula: string): number {
  if (!formula) return 0;
  const clean = formula.replace(/\s+/g, '').toLowerCase();

  // Handle multiplier like 4d6*100 or 1d6*10
  if (clean.includes('*')) {
    const [dicePart, multPart] = clean.split('*');
    const mult = parseInt(multPart, 10) || 1;
    return evaluateBaseFormula(dicePart) * mult;
  }

  return evaluateBaseFormula(clean);
}

function evaluateBaseFormula(expr: string): number {
  if (expr.includes('+')) {
    const [left, right] = expr.split('+');
    return evaluateBaseFormula(left) + (parseInt(right, 10) || 0);
  }
  if (expr.includes('-')) {
    const [left, right] = expr.split('-');
    return Math.max(0, evaluateBaseFormula(left) - (parseInt(right, 10) || 0));
  }
  const match = expr.match(/^(\d+)d(\d+)$/);
  if (match) {
    const count = parseInt(match[1], 10);
    const sides = parseInt(match[2], 10);
    return rollSimpleDice(count, sides);
  }
  return parseInt(expr, 10) || 0;
}

export function calculatePartySplit(coins: LootCoins, playerCount: number): PartyCoinSplit {
  const count = Math.max(1, playerCount);
  const each = {
    gp: Math.floor(coins.gp / count),
    sp: Math.floor(coins.sp / count),
    cp: Math.floor(coins.cp / count),
    ep: Math.floor(coins.ep / count),
    pp: Math.floor(coins.pp / count),
  };

  const remainder = {
    gp: coins.gp % count,
    sp: coins.sp % count,
    cp: coins.cp % count,
    ep: coins.ep % count,
    pp: coins.pp % count,
  };

  const eachParts: string[] = [];
  if (each.pp > 0) eachParts.push(`${each.pp} пм`);
  if (each.gp > 0) eachParts.push(`${each.gp} зм`);
  if (each.ep > 0) eachParts.push(`${each.ep} эм`);
  if (each.sp > 0) eachParts.push(`${each.sp} см`);
  if (each.cp > 0) eachParts.push(`${each.cp} мм`);

  const remParts: string[] = [];
  if (remainder.pp > 0) remParts.push(`${remainder.pp} пм`);
  if (remainder.gp > 0) remParts.push(`${remainder.gp} зм`);
  if (remainder.ep > 0) remParts.push(`${remainder.ep} эм`);
  if (remainder.sp > 0) remParts.push(`${remainder.sp} см`);
  if (remainder.cp > 0) remParts.push(`${remainder.cp} мм`);

  const eachText = eachParts.length > 0 ? eachParts.join(', ') : '0 зм';
  const remText = remParts.length > 0 ? ` (в казну отряда: ${remParts.join(', ')})` : '';

  return {
    playerCount: count,
    each,
    remainder,
    summaryRu: `Каждому (${count} игр.): ${eachText}${remText}`,
  };
}

export function calculateTotalGpEquivalent(coins: LootCoins, valuables: LootValuable[]): number {
  const coinGp =
    coins.pp * 10 +
    coins.gp * 1 +
    coins.ep * 0.5 +
    coins.sp * 0.1 +
    coins.cp * 0.01;
  const valGp = valuables.reduce((sum, v) => sum + v.valueGp, 0);
  return Math.round((coinGp + valGp) * 100) / 100;
}

export class LootService {
  private static instance: LootService;

  public static getInstance(): LootService {
    if (!LootService.instance) {
      LootService.instance = new LootService();
    }
    return LootService.instance;
  }

  /**
   * Generates individual loot by Challenge Rating (CR) with deterministic or rolled d100
   */
  public async generateIndividualLoot(
    cr: number,
    playerCount: number = 4,
    manualD100?: number
  ): Promise<GeneratedLoot> {
    const coins: LootCoins = { cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 };
    const trinkets: string[] = [];
    const valuables: LootValuable[] = [];
    const magicItems: LootMagicItem[] = [];

    const tierKey =
      cr <= 4
        ? 'tier_1_cr_0_4'
        : cr <= 10
        ? 'tier_2_cr_5_10'
        : cr <= 16
        ? 'tier_3_cr_11_16'
        : 'tier_4_cr_17_plus';

    const roll = manualD100 !== undefined ? Math.max(1, Math.min(100, Math.floor(manualD100))) : Math.floor(Math.random() * 100) + 1;
    const tableRows = lootTables.currency_tables.individual[tierKey] || [];
    let bracketInfo = `d100: ${roll}`;

    for (const row of tableRows) {
      if (roll >= row.roll_min && roll <= row.roll_max) {
        bracketInfo = `Диапазон [${row.roll_min < 10 ? '0' + row.roll_min : row.roll_min}–${row.roll_max}]: ${row.formula} ${row.coin}${
          row.bonus_formula ? ` + ${row.bonus_formula} ${row.bonus_coin}` : ''
        }`;
        const coinType = row.coin as keyof LootCoins;
        if (coins[coinType] !== undefined) {
          coins[coinType] += evaluateDiceFormula(row.formula);
        }
        if (row.bonus_formula && row.bonus_coin) {
          const bonusType = row.bonus_coin as keyof LootCoins;
          if (coins[bonusType] !== undefined) {
            coins[bonusType] += evaluateDiceFormula(row.bonus_formula);
          }
        }
        break;
      }
    }

    // Trinket chance (higher roll = higher chance)
    if ((roll >= 60 || Math.random() < 0.45) && lootTables.trinkets?.length) {
      const idx = Math.floor(Math.random() * lootTables.trinkets.length);
      trinkets.push(lootTables.trinkets[idx]);
    }

    // Magic drop scaling by CR and d100 roll
    let targetRarity = 'Common';
    let magicChance = 0;
    if (cr < 1) {
      magicChance = roll >= 85 ? 0.9 : 0.1;
      targetRarity = 'Common';
    } else if (cr <= 4) {
      magicChance = roll >= 80 ? 0.9 : 0.2;
      targetRarity = 'Common';
    } else if (cr <= 10) {
      magicChance = roll >= 75 ? 0.9 : 0.35;
      targetRarity = 'Uncommon';
    } else if (cr <= 16) {
      magicChance = roll >= 70 ? 0.9 : 0.45;
      targetRarity = 'Rare';
    } else {
      magicChance = roll >= 65 ? 0.95 : 0.6;
      targetRarity = 'Very Rare';
    }

    if (Math.random() < magicChance || roll >= 95) {
      const item = await this.pickMagicItem(targetRarity);
      if (item) {
        item.rollResult = roll;
        magicItems.push(item);
      }
    }

    const partySplit = calculatePartySplit(coins, playerCount);
    const totalGpEquivalent = calculateTotalGpEquivalent(coins, valuables);

    return {
      id: `loot_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      timestamp: Date.now(),
      mode: 'individual',
      tierOrCr: `КО ${cr}`,
      d100Roll: roll,
      bracketInfo,
      coins,
      totalGpEquivalent,
      trinkets,
      valuables,
      magicItems,
      partySplit,
    };
  }

  /**
   * Generates hoard loot by Tier (1-4) with deterministic or rolled d100
   */
  public async generateHoardLoot(
    tier: number,
    category: string = 'Any',
    playerCount: number = 4,
    manualD100?: number
  ): Promise<GeneratedLoot> {
    const clampedTier = Math.min(4, Math.max(1, tier));
    const coins: LootCoins = { cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 };
    const trinkets: string[] = [];
    const valuables: LootValuable[] = [];
    const magicItems: LootMagicItem[] = [];

    const roll = manualD100 !== undefined ? Math.max(1, Math.min(100, Math.floor(manualD100))) : Math.floor(Math.random() * 100) + 1;
    const addMagic = (tableId: DmgMagicTableId, count: number) =>
      this.addMagicFromTable(magicItems, tableId, count, category);

    const tierKey = `tier_${clampedTier}_${
      clampedTier === 1
        ? 'cr_0_4'
        : clampedTier === 2
        ? 'cr_5_10'
        : clampedTier === 3
        ? 'cr_11_16'
        : 'cr_17_plus'
    }`;

    // 1. Guaranteed Hoard Coins
    const hoardDef = lootTables.currency_tables.hoard[tierKey] || {};
    for (const [coin, formula] of Object.entries(hoardDef)) {
      const coinKey = coin as keyof LootCoins;
      if (coins[coinKey] !== undefined) {
        coins[coinKey] += evaluateDiceFormula(formula);
      }
    }

    let bracketInfo = `Тир ${clampedTier} (d100 = ${roll})`;

    // 2. Resolve DMG Hoard Brackets based on d100
    if (clampedTier === 1) {
      if (roll <= 6) {
        bracketInfo = `[01–06]: Только монеты сокровищницы`;
      } else if (roll <= 16) {
        bracketInfo = `[07–16]: Монеты + 2d6 самоцветов по 10 зм`;
        this.addGems(valuables, 'gems_10gp', 10, rollSimpleDice(2, 6));
      } else if (roll <= 26) {
        bracketInfo = `[17–26]: Монеты + 2d4 предметов искусства по 25 зм`;
        this.addArt(valuables, 'art_25gp', 25, rollSimpleDice(2, 4));
      } else if (roll <= 36) {
        bracketInfo = `[27–36]: Монеты + 2d6 самоцветов по 50 зм`;
        this.addGems(valuables, 'gems_50gp', 50, rollSimpleDice(2, 6));
      } else if (roll <= 44) {
        bracketInfo = `[37–44]: Монеты + 2d6 самоцветов (10 зм) + 1d6 бросков по Таблице A`;
        this.addGems(valuables, 'gems_10gp', 10, rollSimpleDice(2, 6));
        await addMagic('A', rollSimpleDice(1, 6));
      } else if (roll <= 52) {
        bracketInfo = `[45–52]: Монеты + 2d4 искусства (25 зм) + 1d6 бросков по Таблице A`;
        this.addArt(valuables, 'art_25gp', 25, rollSimpleDice(2, 4));
        await addMagic('A', rollSimpleDice(1, 6));
      } else if (roll <= 60) {
        bracketInfo = `[53–60]: Монеты + 2d6 самоцветов (50 зм) + 1d6 бросков по Таблице A`;
        this.addGems(valuables, 'gems_50gp', 50, rollSimpleDice(2, 6));
        await addMagic('A', rollSimpleDice(1, 6));
      } else if (roll <= 65) {
        bracketInfo = `[61–65]: Монеты + 2d6 самоцветов (10 зм) + 1d4 бросков по Таблице B`;
        this.addGems(valuables, 'gems_10gp', 10, rollSimpleDice(2, 6));
        await addMagic('B', rollSimpleDice(1, 4));
      } else if (roll <= 70) {
        bracketInfo = `[66–70]: Монеты + 2d4 искусства (25 зм) + 1d4 бросков по Таблице B`;
        this.addArt(valuables, 'art_25gp', 25, rollSimpleDice(2, 4));
        await addMagic('B', rollSimpleDice(1, 4));
      } else if (roll <= 75) {
        bracketInfo = `[71–75]: Монеты + 2d6 самоцветов (50 зм) + 1d4 бросков по Таблице B`;
        this.addGems(valuables, 'gems_50gp', 50, rollSimpleDice(2, 6));
        await addMagic('B', rollSimpleDice(1, 4));
      } else if (roll <= 78) {
        bracketInfo = `[76–78]: Монеты + 2d6 самоцветов (10 зм) + 1d4 бросков по Таблице C`;
        this.addGems(valuables, 'gems_10gp', 10, rollSimpleDice(2, 6));
        await addMagic('C', rollSimpleDice(1, 4));
      } else if (roll <= 80) {
        bracketInfo = `[79–80]: Монеты + 2d4 искусства (25 зм) + 1d4 бросков по Таблице C`;
        this.addArt(valuables, 'art_25gp', 25, rollSimpleDice(2, 4));
        await addMagic('C', rollSimpleDice(1, 4));
      } else if (roll <= 85) {
        bracketInfo = `[81–85]: Монеты + 2d6 самоцветов (50 зм) + 1d4 бросков по Таблице C`;
        this.addGems(valuables, 'gems_50gp', 50, rollSimpleDice(2, 6));
        await addMagic('C', rollSimpleDice(1, 4));
      } else if (roll <= 92) {
        bracketInfo = `[86–92]: Монеты + 2d4 искусства (25 зм) + 1d4 постоянных предметов из Таблицы F!`;
        this.addArt(valuables, 'art_25gp', 25, rollSimpleDice(2, 4));
        await addMagic('F', rollSimpleDice(1, 4));
      } else if (roll <= 97) {
        bracketInfo = `[93–97]: Монеты + 2d6 самоцветов (50 зм) + 1d4 постоянных предметов из Таблицы F!`;
        this.addGems(valuables, 'gems_50gp', 50, rollSimpleDice(2, 6));
        await addMagic('F', rollSimpleDice(1, 4));
      } else {
        bracketInfo = `[98–100]: КУШ! Монеты + 2d6 самоцветов (50 зм) + 1d4 редких предметов из Таблицы G!`;
        this.addGems(valuables, 'gems_50gp', 50, rollSimpleDice(2, 6));
        await addMagic('G', rollSimpleDice(1, 4));
      }
    } else if (clampedTier === 2) {
      if (roll <= 4) {
        bracketInfo = `[01–04]: Только монеты сокровищницы`;
      } else if (roll <= 10) {
        bracketInfo = `[05–10]: Монеты + 2d4 искусства по 25 зм`;
        this.addArt(valuables, 'art_25gp', 25, rollSimpleDice(2, 4));
      } else if (roll <= 16) {
        bracketInfo = `[11–16]: Монеты + 3d6 самоцветов по 50 зм`;
        this.addGems(valuables, 'gems_50gp', 50, rollSimpleDice(3, 6));
      } else if (roll <= 22) {
        bracketInfo = `[17–22]: Монеты + 3d6 самоцветов по 100 зм`;
        this.addGems(valuables, 'gems_100gp', 100, rollSimpleDice(3, 6));
      } else if (roll <= 28) {
        bracketInfo = `[23–28]: Монеты + 2d4 искусства по 250 зм`;
        this.addArt(valuables, 'art_250gp', 250, rollSimpleDice(2, 4));
      } else if (roll <= 44) {
        bracketInfo = `[29–44]: Монеты + самоцветы/искусство + 1d6 бросков по Таблице A`;
        this.addGems(valuables, 'gems_50gp', 50, rollSimpleDice(3, 6));
        await addMagic('A', rollSimpleDice(1, 6));
      } else if (roll <= 63) {
        bracketInfo = `[45–63]: Монеты + искусство (250 зм) + 1d4 бросков по Таблице B`;
        this.addArt(valuables, 'art_250gp', 250, rollSimpleDice(2, 4));
        await addMagic('B', rollSimpleDice(1, 4));
      } else if (roll <= 74) {
        bracketInfo = `[64–74]: Монеты + самоцветы (100 зм) + 1d4 бросков по Таблице C`;
        this.addGems(valuables, 'gems_100gp', 100, rollSimpleDice(3, 6));
        await addMagic('C', rollSimpleDice(1, 4));
      } else if (roll <= 80) {
        bracketInfo = `[75–80]: Монеты + искусство (250 зм) + 1d4 бросков по Таблице D`;
        this.addArt(valuables, 'art_250gp', 250, rollSimpleDice(2, 4));
        await addMagic('D', rollSimpleDice(1, 4));
      } else if (roll <= 94) {
        bracketInfo = `[81–94]: Монеты + самоцветы (100 зм) + 1d4 постоянных предметов из Таблицы F!`;
        this.addGems(valuables, 'gems_100gp', 100, rollSimpleDice(3, 6));
        await addMagic('F', rollSimpleDice(1, 4));
      } else if (roll <= 98) {
        bracketInfo = `[95–98]: Монеты + искусство (250 зм) + 1d4 редких предметов из Таблицы G!`;
        this.addArt(valuables, 'art_250gp', 250, rollSimpleDice(2, 4));
        await addMagic('G', rollSimpleDice(1, 4));
      } else {
        bracketInfo = `[99–100]: КУШ! Монеты + искусство (250 зм) + 1d4 очень редких предметов из Таблицы H!`;
        this.addArt(valuables, 'art_250gp', 250, rollSimpleDice(2, 4));
        await addMagic('H', rollSimpleDice(1, 4));
      }
    } else if (clampedTier === 3) {
      if (roll <= 15) {
        bracketInfo = `[01–15]: Монеты + 3d6 самоцветов по 500 зм`;
        this.addGems(valuables, 'gems_500gp', 500, rollSimpleDice(3, 6));
      } else if (roll <= 35) {
        bracketInfo = `[16–35]: Монеты + 1d10 искусства по 750 зм`;
        this.addArt(valuables, 'art_750gp', 750, rollSimpleDice(1, 10));
      } else if (roll <= 60) {
        bracketInfo = `[36–60]: Монеты + самоцветы (500 зм) + 1d4 предметов из Таблицы C`;
        this.addGems(valuables, 'gems_500gp', 500, rollSimpleDice(3, 6));
        await addMagic('C', rollSimpleDice(1, 4));
      } else if (roll <= 80) {
        bracketInfo = `[61–80]: Монеты + искусство (750 зм) + 1d4 предметов из Таблицы D`;
        this.addArt(valuables, 'art_750gp', 750, rollSimpleDice(1, 10));
        await addMagic('D', rollSimpleDice(1, 4));
      } else if (roll <= 92) {
        bracketInfo = `[81–92]: Монеты + самоцветы (500 зм) + 1d4 редких предметов из Таблицы G`;
        this.addGems(valuables, 'gems_500gp', 500, rollSimpleDice(3, 6));
        await addMagic('G', rollSimpleDice(1, 4));
      } else {
        bracketInfo = `[93–100]: КУШ! Монеты + искусство (750 зм) + 1d4 очень редких предметов из Таблицы H!`;
        this.addArt(valuables, 'art_750gp', 750, rollSimpleDice(1, 10));
        await addMagic('H', rollSimpleDice(1, 4));
      }
    } else {
      // Tier 4
      if (roll <= 20) {
        bracketInfo = `[01–20]: Монеты + 3d6 самоцветов по 1000 зм`;
        this.addGems(valuables, 'gems_1000gp', 1000, rollSimpleDice(3, 6));
      } else if (roll <= 50) {
        bracketInfo = `[21–50]: Монеты + искусство (750 зм) + 1d8 предметов из Таблицы C`;
        this.addArt(valuables, 'art_750gp', 750, rollSimpleDice(3, 6));
        await addMagic('C', rollSimpleDice(1, 8));
      } else if (roll <= 75) {
        bracketInfo = `[51–75]: Монеты + самоцветы (1000 зм) + 1d6 предметов из Таблицы D`;
        this.addGems(valuables, 'gems_1000gp', 1000, rollSimpleDice(3, 6));
        await addMagic('D', rollSimpleDice(1, 6));
      } else if (roll <= 90) {
        bracketInfo = `[76–90]: Монеты + искусство (750 зм) + 1d6 предметов из Таблицы H!`;
        this.addArt(valuables, 'art_750gp', 750, rollSimpleDice(3, 6));
        await addMagic('H', rollSimpleDice(1, 6));
      } else {
        bracketInfo = `[91–100]: ЛЕГЕНДАРНЫЙ КУШ! Монеты + 3d6 самоцветов (1000 зм) + 1d4 легендарных артефактов из Таблицы I!`;
        this.addGems(valuables, 'gems_1000gp', 1000, rollSimpleDice(3, 6));
        await addMagic('I', rollSimpleDice(1, 4));
      }
    }

    // Trinket bonus
    if (lootTables.trinkets?.length) {
      const idx = Math.floor(Math.random() * lootTables.trinkets.length);
      trinkets.push(lootTables.trinkets[idx]);
    }

    const partySplit = calculatePartySplit(coins, playerCount);
    const totalGpEquivalent = calculateTotalGpEquivalent(coins, valuables);

    return {
      id: `hoard_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      timestamp: Date.now(),
      mode: 'hoard',
      tierOrCr: `Тир ${clampedTier} (КО ${
        clampedTier === 1
          ? '0–4'
          : clampedTier === 2
          ? '5–10'
          : clampedTier === 3
          ? '11–16'
          : '17+'
      })`,
      d100Roll: roll,
      bracketInfo,
      coins,
      totalGpEquivalent,
      trinkets,
      valuables,
      magicItems,
      partySplit,
    };
  }

  /**
   * Generates loot strictly from a designated DMG Magic Table (A through I) using d100
   */
  public async generateFromMagicTable(
    tableId: DmgMagicTableId,
    d100: number,
    playerCount: number = 4
  ): Promise<GeneratedLoot> {
    const roll = Math.max(1, Math.min(100, Math.floor(d100)));
    const { entry, bracketDesc } = lookupMagicTableItem(tableId, roll);
    const meta = DMG_MAGIC_TABLES_META[tableId];

    const magicItems: LootMagicItem[] = [
      {
        name: entry.nameRu,
        name_en: entry.nameEn,
        rarity: entry.rarity,
        type: entry.category,
        desc: entry.descRu,
        cost_gp: entry.costGp,
        attunement: entry.attunement,
        tableSource: bracketDesc,
        rollResult: roll,
      },
    ];

    const coins: LootCoins = { cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 };
    const partySplit = calculatePartySplit(coins, playerCount);

    return {
      id: `magictable_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      timestamp: Date.now(),
      mode: 'magic_table',
      tierOrCr: meta.nameRu,
      d100Roll: roll,
      bracketInfo: `Результат: ${bracketDesc} -> ${entry.nameRu}`,
      coins,
      totalGpEquivalent: entry.costGp || 0,
      trinkets: [],
      valuables: [],
      magicItems,
      partySplit,
    };
  }

  /**
   * Generates an item matching custom filters (category, rarity, attunement)
   * where d100 deterministically acts as a percentile ranking picker.
   */
  public async generateFromCustomFilter(
    category: string,
    rarity: string,
    attunementOption: 'all' | 'required' | 'not_required',
    d100: number,
    playerCount: number = 4
  ): Promise<GeneratedLoot> {
    const roll = Math.max(1, Math.min(100, Math.floor(d100)));
    const attunement = attunementOption === 'required' ? true : attunementOption === 'not_required' ? false : undefined;

    const filter = {
      category: category === 'Any' || category === 'all' ? undefined : category,
      rarity: rarity === 'Any' || rarity === 'all' ? undefined : rarity,
      attunement,
    };

    const dbItems = await dbService.getItemsByFilter(filter, 120);
    const magicItems: LootMagicItem[] = [];
    let bracketInfo = `d100: ${roll}`;

    if (dbItems.length > 0) {
      // Map d100 (1..100) to index in sorted array
      const idx = Math.min(dbItems.length - 1, Math.floor(((roll - 1) / 99) * dbItems.length));
      const chosen = dbItems[idx];
      magicItems.push({
        id: chosen.id,
        name: chosen.name_ru || chosen.name_en,
        name_en: chosen.name_en,
        rarity: chosen.rarity,
        type: chosen.category || chosen.item_type,
        desc: chosen.description_ru || chosen.description_en || undefined,
        cost_gp: chosen.cost_gp || undefined,
        attunement: chosen.attunement,
        tableSource: `Позиция ${idx + 1} из ${dbItems.length} по рангу броска d100`,
        rollResult: roll,
      });
      bracketInfo = `d100 = ${roll} (Выбран предмет #${idx + 1} из ${dbItems.length} подходящих)`;
    } else {
      // Fallback to table lookup
      const targetTable: DmgMagicTableId = rarity.toLowerCase().includes('legendary')
        ? 'I'
        : rarity.toLowerCase().includes('very')
        ? 'H'
        : rarity.toLowerCase().includes('rare')
        ? 'G'
        : 'F';
      const { entry, bracketDesc } = lookupMagicTableItem(targetTable, roll);
      magicItems.push({
        name: entry.nameRu,
        name_en: entry.nameEn,
        rarity: entry.rarity,
        type: entry.category,
        desc: entry.descRu,
        cost_gp: entry.costGp,
        attunement: entry.attunement,
        tableSource: bracketDesc,
        rollResult: roll,
      });
      bracketInfo = `d100 = ${roll} (${bracketDesc})`;
    }

    const coins: LootCoins = { cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 };
    const partySplit = calculatePartySplit(coins, playerCount);
    const totalVal = magicItems.reduce((acc, m) => acc + (m.cost_gp || 0), 0);

    return {
      id: `custom_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      timestamp: Date.now(),
      mode: 'custom_filter',
      tierOrCr: `${category !== 'Any' ? localizeItemType(category) || category : 'Все категории'} • ${rarity !== 'Any' ? localizeRarity(rarity) || rarity : 'Все редкости'}`,
      d100Roll: roll,
      bracketInfo,
      coins,
      totalGpEquivalent: totalVal,
      trinkets: [],
      valuables: [],
      magicItems,
      partySplit,
    };
  }

  /**
   * Generates loot based on combat encounter with d100 luck modifier
   */
  public async generateLootFromCombat(
    enemies: Array<{ name: string; maxHp: number; type?: string }>,
    playerCount: number = 4,
    manualD100?: number
  ): Promise<GeneratedLoot> {
    const validEnemies = enemies.filter((e) => e.type !== 'player');
    const count = Math.max(1, validEnemies.length);
    const roll = manualD100 !== undefined ? Math.max(1, Math.min(100, Math.floor(manualD100))) : Math.floor(Math.random() * 100) + 1;

    const coins: LootCoins = { cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 };
    const trinkets: string[] = [];
    const valuables: LootValuable[] = [];
    const magicItems: LootMagicItem[] = [];

    // d100 modifier multiplier: 0.5x on bad roll, 1.0x on avg, 1.5x on good, 2.0x on top
    const luckMultiplier = roll < 25 ? 0.6 : roll <= 70 ? 1.0 : roll <= 90 ? 1.5 : 2.2;

    let totalMaxHp = 0;
    for (const enemy of validEnemies) {
      const hp = Math.max(10, enemy.maxHp || 15);
      totalMaxHp += hp;
      const power = Math.max(1, Math.floor(hp / 15));
      coins.gp += Math.floor(rollSimpleDice(power, 8) * luckMultiplier);
      coins.sp += Math.floor(rollSimpleDice(power, 15) * luckMultiplier);
      coins.cp += Math.floor(rollSimpleDice(power, 25) * luckMultiplier);
    }

    if (coins.gp === 0) coins.gp = Math.floor(rollSimpleDice(3, 8) * luckMultiplier);
    if (coins.sp === 0) coins.sp = Math.floor(rollSimpleDice(5, 10) * luckMultiplier);
    if (coins.cp === 0) coins.cp = Math.floor(rollSimpleDice(8, 12) * luckMultiplier);

    // Gems on good search check
    if (roll >= 60) {
      const gemCount = roll >= 90 ? rollSimpleDice(2, 4) : rollSimpleDice(1, 3);
      this.addGems(valuables, roll >= 90 ? 'gems_100gp' : 'gems_50gp', roll >= 90 ? 100 : 50, gemCount);
    }

    // Trinkets
    const trinketCount = Math.min(3, Math.max(1, Math.floor(count / 2)));
    if (lootTables.trinkets?.length) {
      for (let i = 0; i < trinketCount; i++) {
        const idx = Math.floor(Math.random() * lootTables.trinkets.length);
        trinkets.push(lootTables.trinkets[idx]);
      }
    }

    // Magic drop calculation
    const magicThreshold = roll >= 95 ? 0.99 : roll >= 75 ? 0.7 : 0.35 + count * 0.05;
    if (Math.random() < magicThreshold || roll >= 90) {
      const avgHp = totalMaxHp / count;
      const rarity = avgHp > 100 || roll >= 95 ? 'Rare' : avgHp > 45 || roll >= 75 ? 'Uncommon' : 'Common';
      const item = await this.pickMagicItem(rarity);
      if (item) {
        item.rollResult = roll;
        item.tableSource = `Лут боя (d100 = ${roll})`;
        magicItems.push(item);
      }
    }

    let bracketInfo = `Бросок обыска d100 = ${roll}: `;
    if (roll < 25) {
      bracketInfo += `Скудная добыча (разбитые кошели, мелочь)`;
    } else if (roll <= 70) {
      bracketInfo += `Стандартная полевая добыча`;
    } else if (roll <= 90) {
      bracketInfo += `Богатая добыча офицеров (+самоцветы)`;
    } else {
      bracketInfo += `ДЖЕКПОТ! Потайной тайник командира с сокровищами!`;
    }

    const partySplit = calculatePartySplit(coins, playerCount);
    const totalGpEquivalent = calculateTotalGpEquivalent(coins, valuables);

    return {
      id: `combat_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      timestamp: Date.now(),
      mode: 'combat',
      tierOrCr: `${count} противников`,
      d100Roll: roll,
      bracketInfo,
      coins,
      totalGpEquivalent,
      trinkets,
      valuables,
      magicItems,
      partySplit,
    };
  }

  // Helpers
  private addGems(valuables: LootValuable[], gemKey: string, valueGp: number, count: number) {
    const list = lootTables.valuables[gemKey] || lootTables.valuables['gems_10gp'] || [];
    for (let i = 0; i < count; i++) {
      if (list.length > 0) {
        const idx = Math.floor(Math.random() * list.length);
        valuables.push({
          name: list[idx],
          valueGp,
          category: 'gem',
        });
      }
    }
  }

  private addArt(valuables: LootValuable[], artKey: string, valueGp: number, count: number) {
    const list = lootTables.valuables[artKey] || lootTables.valuables['art_25gp'] || [];
    for (let i = 0; i < count; i++) {
      if (list.length > 0) {
        const idx = Math.floor(Math.random() * list.length);
        valuables.push({
          name: list[idx],
          valueGp,
          category: 'art',
        });
      }
    }
  }

  private async addMagicFromTable(
    magicItems: LootMagicItem[],
    tableId: DmgMagicTableId,
    count: number,
    preferredCategory?: string
  ) {
    for (let i = 0; i < count; i++) {
      const subRoll = Math.floor(Math.random() * 100) + 1;
      const { entry, bracketDesc } = lookupMagicTableItem(tableId, subRoll);

      if (preferredCategory && preferredCategory !== 'Any') {
        const catItem = await this.pickMagicItem(entry.rarity, preferredCategory);
        if (catItem) {
          catItem.tableSource = `${bracketDesc} [фильтр: ${preferredCategory}]`;
          catItem.rollResult = subRoll;
          magicItems.push(catItem);
          continue;
        }
      }

      magicItems.push({
        name: entry.nameRu,
        name_en: entry.nameEn,
        rarity: entry.rarity,
        type: entry.category,
        desc: entry.descRu,
        cost_gp: entry.costGp,
        attunement: entry.attunement,
        tableSource: bracketDesc,
        rollResult: subRoll,
      });
    }
  }

  public async pickMagicItem(rarity: string, category?: string): Promise<LootMagicItem | null> {
    try {
      const dbItems = await dbService.getRandomItems(rarity, category, 1);
      if (dbItems && dbItems.length > 0) {
        const it = dbItems[0];
        return {
          id: it.id,
          name: it.name_ru || it.name_en,
          name_en: it.name_en,
          rarity: localizeRarity(it.rarity),
          type: localizeItemType(it.category || it.item_type),
          desc: it.description_ru || it.description_en || undefined,
          cost_gp: it.cost_gp || undefined,
          attunement: it.attunement,
        };
      }
    } catch {
      // fallback
    }

    // JSON fallback
    const key = rarity.toLowerCase().replace(/\s+/g, '_') as keyof typeof lootTables.magic_items;
    const fallbackList = lootTables.magic_items?.[key] || lootTables.magic_items?.['common'] || [];
    if (fallbackList.length > 0) {
      const idx = Math.floor(Math.random() * fallbackList.length);
      const chosen = fallbackList[idx];
      return {
        name: chosen.name,
        rarity: localizeRarity(rarity),
        type: localizeItemType(chosen.type),
        desc: chosen.desc,
      };
    }

    return {
      name: 'Зелье лечения (2d4+2)',
      rarity: 'Common',
      type: 'Potion',
      desc: 'Восстанавливает 2d4+2 хитов при употреблении.',
    };
  }

  /**
   * Formats a clean, beautiful Markdown for export to Discord, Telegram or Obsidian
   */
  public formatToMarkdown(loot: GeneratedLoot): string {
    const lines: string[] = [];
    const modeLabel =
      loot.mode === 'hoard'
        ? '🏛️ СОКРОВИЩНИЦА'
        : loot.mode === 'combat'
        ? '⚔️ ДОБЫЧА ПОСЛЕ БОЯ'
        : loot.mode === 'magic_table'
        ? '🔮 ТАБЛИЦА МАГИИ DMG'
        : loot.mode === 'custom_filter'
        ? '✨ МАГИЧЕСКИЙ ПРЕДМЕТ'
        : '💰 ИНДИВИДУАЛЬНАЯ ДОБЫЧА';

    lines.push(`### ${modeLabel} (${loot.tierOrCr})`);
    if (loot.d100Roll !== undefined) {
      lines.push(`🎲 **Бросок кубика d100**: \`${loot.d100Roll}\`${loot.bracketInfo ? ` (${loot.bracketInfo})` : ''}`);
    }
    lines.push(`*Сгенерировано в DnD AI Tracker* • Общая ценность: **~${loot.totalGpEquivalent} зм**\n`);

    const coinParts: string[] = [];
    if (loot.coins.pp > 0) coinParts.push(`${loot.coins.pp} пм`);
    if (loot.coins.gp > 0) coinParts.push(`${loot.coins.gp} зм`);
    if (loot.coins.ep > 0) coinParts.push(`${loot.coins.ep} эм`);
    if (loot.coins.sp > 0) coinParts.push(`${loot.coins.sp} см`);
    if (loot.coins.cp > 0) coinParts.push(`${loot.coins.cp} мм`);

    if (coinParts.length > 0) {
      lines.push(`💰 **Монеты**: ${coinParts.join(', ')}`);
      lines.push(`👥 **${loot.partySplit.summaryRu}**\n`);
    }

    if (loot.valuables.length > 0) {
      lines.push(`💎 **Драгоценности и искусство**:`);
      for (const val of loot.valuables) {
        lines.push(`  • ${val.name} (*${val.valueGp} зм*)`);
      }
      lines.push('');
    }

    if (loot.magicItems.length > 0) {
      lines.push(`✨ **Магические предметы**:`);
      for (const item of loot.magicItems) {
        const details = [
          localizeRarity(item.rarity),
          localizeItemType(item.type),
          item.tableSource,
        ].filter(Boolean).join(' • ');
        lines.push(`  • **${item.name}** [${details}]${item.desc ? ` — ${item.desc}` : ''}`);
      }
      lines.push('');
    }

    if (loot.trinkets.length > 0) {
      lines.push(`🎒 **Безделушки и карманные вещи**:`);
      for (const t of loot.trinkets) {
        lines.push(`  • ${t}`);
      }
      lines.push('');
    }

    return lines.join('\n');
  }
}

export const lootService = LootService.getInstance();
