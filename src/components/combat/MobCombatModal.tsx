import { useState, useMemo } from 'react';
import { useCombatStore } from '../../store/combatStore';
import { cleanRussianText, localizeDamageType } from '../../utils/textUtils';
import { rollDiceFormula } from '../../engine/rolls';
import { DamageType } from '../../types/dnd5e';
import { useTranslation } from '../../i18n';
import {
  Users,
  X,
  Swords,
  Shield,
  Sparkles,
  Copy,
  Check,
  Flame,
} from 'lucide-react';

/**
 * Official DMG Chapter 8 "Handling Mobs" table:
 * Maps required d20 roll to hit (Target AC - Attack Bonus) to number of attackers needed for 1 hit.
 */
export function getDmgAttackersNeeded(d20Needed: number): number {
  if (d20Needed <= 5) return 1;
  if (d20Needed <= 12) return 2;
  if (d20Needed <= 14) return 3;
  if (d20Needed <= 16) return 4;
  if (d20Needed <= 18) return 5;
  if (d20Needed === 19) return 10;
  return 20; // 20 or higher
}

export function MobCombatModal() {
  const { isMobModalOpen, setMobModalOpen, combatants, applyDamage, addCombatLog, roundCounter } = useCombatStore();
  const { language } = useTranslation();
  const isEn = language === 'en';

  const [mobName, setMobName] = useState(isEn ? 'Skeleton Horde' : 'Орда скелетов');
  const [mobCount, setMobCount] = useState(12);
  const [attackBonus, setAttackBonus] = useState(4);
  const [advantageMode, setAdvantageMode] = useState<'normal' | 'advantage' | 'disadvantage'>('normal');
  const [targetId, setTargetId] = useState<string>('');
  const [customAc, setCustomAc] = useState(15);
  const [damageFormula, setDamageFormula] = useState('1d6+2');
  const [avgDamage, setAvgDamage] = useState(5);
  const [useLiveDice] = useState(false);
  const [damageType, setDamageType] = useState<DamageType>('piercing');
  const [copied, setCopied] = useState(false);
  const [lastResult, setLastResult] = useState<{
    hits: number;
    totalDamage: number;
    details: string;
  } | null>(null);

  // Selected target
  const target = useMemo(() => {
    return combatants.find((c) => c.id === targetId) || null;
  }, [combatants, targetId]);

  // Target AC
  const effectiveAc = target ? target.ac : customAc;

  // Attacker bonus modified by advantage/disadvantage (+5 / -5 per DMG)
  const effectiveBonus = useMemo(() => {
    if (advantageMode === 'advantage') return attackBonus + 5;
    if (advantageMode === 'disadvantage') return attackBonus - 5;
    return attackBonus;
  }, [attackBonus, advantageMode]);

  // d20 roll needed to hit: Target AC - Attack Bonus
  const d20Needed = useMemo(() => {
    return Math.max(1, effectiveAc - effectiveBonus);
  }, [effectiveAc, effectiveBonus]);

  // Attackers required for 1 hit according to DMG
  const attackersNeeded = useMemo(() => {
    return getDmgAttackersNeeded(d20Needed);
  }, [d20Needed]);

  // Number of hits scored by the mob
  const hitsScored = useMemo(() => {
    return Math.floor(mobCount / attackersNeeded);
  }, [mobCount, attackersNeeded]);

  // Auto-fill from roster selection
  const handleSelectAttackerCombatant = (cid: string) => {
    const c = combatants.find((item) => item.id === cid);
    if (!c) return;
    const name = isEn ? (c.name || c.nameRu) : cleanRussianText(c.nameRu || c.name);
    setMobName(isEn ? `Horde: ${name}` : `Орда: ${name}`);

    // Parse attack bonus and damage from statblock
    const firstAction = c.statblock?.actions?.[0];
    if (firstAction) {
      if (firstAction.attack_bonus !== undefined && firstAction.attack_bonus !== null) {
        setAttackBonus(firstAction.attack_bonus);
      }
      if (firstAction.damage_dice) {
        const bonusPart = firstAction.damage_bonus ? `+${firstAction.damage_bonus}` : '';
        setDamageFormula(`${firstAction.damage_dice}${bonusPart}`);
      }
      if (firstAction.damage_type) {
        setDamageType(firstAction.damage_type.toLowerCase() as DamageType);
      }
    }
  };

  const handleApplyDamage = () => {
    if (hitsScored <= 0) {
      alert(isEn ? 'No horde attacks hit the target (0 hits).' : 'Ни одна атака толпы не пробила защиту цели (0 попаданий).');
      return;
    }

    let totalDmg = 0;
    let rollDetails = '';

    if (useLiveDice && damageFormula) {
      // Roll for each hit
      const rolledAmounts: number[] = [];
      for (let i = 0; i < hitsScored; i++) {
        const r = rollDiceFormula(damageFormula);
        rolledAmounts.push(r.total);
        totalDmg += r.total;
      }
      rollDetails = isEn
        ? `${hitsScored} rolls [${rolledAmounts.join(', ')}] = ${totalDmg} damage`
        : `${hitsScored} бросков [${rolledAmounts.join(', ')}] = ${totalDmg} урона`;
    } else {
      totalDmg = hitsScored * avgDamage;
      rollDetails = isEn
        ? `${hitsScored} hits × ${avgDamage} avg. damage = ${totalDmg} damage`
        : `${hitsScored} попаданий × ${avgDamage} сред. урона = ${totalDmg} урона`;
    }

    const targetName = target
      ? (isEn ? (target.name || target.nameRu) : cleanRussianText(target.nameRu || target.name))
      : (isEn ? `Target with AC ${effectiveAc}` : `Цель с КД ${effectiveAc}`);

    // Apply to combat store target if selected
    if (target) {
      applyDamage(target.id, [{ amount: totalDmg, type: damageType }], false, false);
    }

    // Add to combat log
    addCombatLog({
      type: 'mob_attack',
      round: roundCounter || 1,
      actorName: mobName,
      targetName,
      text: isEn
        ? `Mob Attack: [${mobName} ×${mobCount}] attacked [${targetName}] — ${hitsScored} hits, dealt ${totalDmg} ${localizeDamageType(damageType, 'en')} damage!`
        : `Атака толпы: [${mobName} ×${mobCount}] атаковала [${targetName}] — ${hitsScored} попаданий, нанесено ${totalDmg} ${localizeDamageType(damageType, 'ru')} урона!`,
      details: isEn
        ? `DMG Rule: AC ${effectiveAc}, bonus +${attackBonus}, d20 needed: ${d20Needed}+ (1 hit / ${attackersNeeded} mobs). ${rollDetails}`
        : `Правило DMG: КД ${effectiveAc}, бонус +${attackBonus}, нужно d20: ${d20Needed}+ (1 hit / ${attackersNeeded} мобов). ${rollDetails}`,
      value: totalDmg,
    });

    setLastResult({
      hits: hitsScored,
      totalDamage: totalDmg,
      details: rollDetails,
    });
  };

  const handleCopySummary = async () => {
    const targetName = target
      ? (isEn ? (target.name || target.nameRu) : cleanRussianText(target.nameRu || target.name))
      : (isEn ? `AC ${effectiveAc}` : `КД ${effectiveAc}`);
    const text = isEn
      ? [
          `MOB ATTACK CALCULATION (DMG 5e/2024)`,
          `Attackers: ${mobName} (${mobCount} creatures, to-hit bonus: +${attackBonus})`,
          `Target: ${targetName} (AC: ${effectiveAc})`,
          `Mode: ${advantageMode === 'advantage' ? 'Advantage (+5)' : advantageMode === 'disadvantage' ? 'Disadvantage (-5)' : 'Normal'}`,
          `d20 roll to hit: ${d20Needed}+`,
          `DMG Ratio: 1 hit per ${attackersNeeded} attackers`,
          `Successful hits: ${hitsScored} of ${mobCount}`,
          `Total damage: ${hitsScored * avgDamage} ${localizeDamageType(damageType, 'en')}`,
        ].join('\n')
      : [
          `РАСЧЁТ АТАКИ ОРДЫ (DMG 5e/2024)`,
          `Атакующие: ${mobName} (${mobCount} существ, бонус попадания: +${attackBonus})`,
          `Цель: ${targetName} (КД: ${effectiveAc})`,
          `Режим: ${advantageMode === 'advantage' ? 'Преимущество (+5)' : advantageMode === 'disadvantage' ? 'Помеха (-5)' : 'Обычный'}`,
          `Бросок d20 для попадания: ${d20Needed}+`,
          `Соотношение DMG: 1 попадание на каждые ${attackersNeeded} атакующих`,
          `Успешных попаданий: ${hitsScored} из ${mobCount}`,
          `Суммарный урон: ${hitsScored * avgDamage} ${localizeDamageType(damageType, 'ru')}`,
        ].join('\n');

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Ignore
    }
  };

  if (!isMobModalOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-xl max-h-[90vh] overflow-y-auto bg-[rgba(20,25,36,0.96)] backdrop-blur-xl border border-[#f5b920]/50 rounded-glass-xl shadow-2xl p-5 flex flex-col gap-4 text-xs select-none">
        {/* Modal Header */}
        <header className="flex items-center justify-between border-b border-[rgba(255,255,255,0.08)] pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-full bg-[#f5b920]/15 border border-[#f5b920]/40 text-[#f5b920]">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                <span>{isEn ? 'Mob Combat Engine' : 'Движок орд и толп (Mob Combat)'}</span>
                <span className="text-[10px] font-mono text-[#fce79f] bg-[#f5b920]/20 px-2 py-0.5 rounded-full border border-[#f5b920]/40">
                  {isEn ? 'DMG Rules' : 'DMG Правила'}
                </span>
              </h2>
              <p className="text-[11px] text-gray-400">
                {isEn
                  ? 'Mass attack resolution without rolling dozens of dice using DMG Chapter 8 tables'
                  : 'Расчёт массовых атак без спама десятками бросков по таблице DMG (Chapter 8)'}
              </p>
            </div>
          </div>

          <button
            onClick={() => setMobModalOpen(false)}
            className="p-1.5 rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition-colors cursor-pointer"
            title={isEn ? 'Close modal' : 'Закрыть окно'}
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        {/* 1. Attacking Mob Section */}
        <section className="bg-black/30 p-3.5 rounded-glass border border-[rgba(255,255,255,0.08)] flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <label className="font-bold text-gray-300 flex items-center gap-1.5 text-xs">
              <Swords className="h-3.5 w-3.5 text-[#f5b920]" />
              <span>{isEn ? 'Attacking Mob:' : 'Атакующая орда:'}</span>
            </label>

            {/* Quick Select from Roster */}
            {combatants.filter((c) => !c.isPlayer).length > 0 && (
              <select
                onChange={(e) => {
                  if (e.target.value) handleSelectAttackerCombatant(e.target.value);
                }}
                defaultValue=""
                className="bg-black/50 border border-white/10 rounded-full px-2.5 py-0.5 text-[11px] text-[#fce79f] focus:outline-none"
              >
                <option value="">{isEn ? 'Copy from combat roster...' : 'Скопировать из очереди боя...'}</option>
                {combatants
                  .filter((c) => !c.isPlayer)
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {isEn ? (c.name || c.nameRu) : cleanRussianText(c.nameRu || c.name)}
                    </option>
                  ))}
              </select>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div>
              <span className="text-[10px] text-gray-400 block mb-1">
                {isEn ? 'Mob Name:' : 'Название орды:'}
              </span>
              <input
                type="text"
                value={mobName}
                onChange={(e) => setMobName(e.target.value)}
                className="w-full bg-black/50 border border-white/10 rounded-full px-3 py-1 text-white text-xs focus:border-[#f5b920] focus:outline-none"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-[10px] text-gray-400">{isEn ? 'Mob Count:' : 'Кол-во атакующих:'}</span>
                <span className="font-mono font-bold text-[#f5b920]">{mobCount}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <input
                  type="range"
                  min="1"
                  max="40"
                  value={mobCount}
                  onChange={(e) => setMobCount(parseInt(e.target.value, 10))}
                  className="w-full accent-[#f5b920] cursor-pointer"
                />
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={mobCount}
                  onChange={(e) => setMobCount(Math.max(1, parseInt(e.target.value, 10) || 1))}
                  className="w-14 bg-black/50 border border-white/10 rounded px-1.5 py-0.5 text-center font-mono text-white text-xs"
                />
              </div>
            </div>

            <div>
              <span className="text-[10px] text-gray-400 block mb-1">
                {isEn ? 'Attack Bonus (+X):' : 'Бонус атаки (+X):'}
              </span>
              <input
                type="number"
                value={attackBonus}
                onChange={(e) => setAttackBonus(parseInt(e.target.value, 10) || 0)}
                className="w-full bg-black/50 border border-white/10 rounded-full px-3 py-1 text-white font-mono text-xs focus:border-[#f5b920] focus:outline-none"
              />
            </div>
          </div>

          {/* Advantage Selector */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-gray-400">{isEn ? 'Modifier:' : 'Модификатор:'}</span>
            <div className="flex items-center p-0.5 bg-black/40 rounded-full border border-white/10">
              <button
                type="button"
                onClick={() => setAdvantageMode('normal')}
                className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium transition-all ${
                  advantageMode === 'normal'
                    ? 'bg-gray-700 text-white font-bold'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {isEn ? 'Normal' : 'Обычный'}
              </button>
              <button
                type="button"
                onClick={() => setAdvantageMode('advantage')}
                className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium transition-all ${
                  advantageMode === 'advantage'
                    ? 'bg-emerald-600 text-white font-bold'
                    : 'text-gray-400 hover:text-emerald-300'
                }`}
              >
                {isEn ? 'Advantage (+5)' : 'Преимущество (+5)'}
              </button>
              <button
                type="button"
                onClick={() => setAdvantageMode('disadvantage')}
                className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium transition-all ${
                  advantageMode === 'disadvantage'
                    ? 'bg-red-700 text-white font-bold'
                    : 'text-gray-400 hover:text-red-300'
                }`}
              >
                {isEn ? 'Disadvantage (-5)' : 'Помеха (-5)'}
              </button>
            </div>
          </div>
        </section>

        {/* 2. Target and Damage Section */}
        <section className="bg-black/30 p-3.5 rounded-glass border border-[rgba(255,255,255,0.08)] flex flex-col gap-3">
          <div className="flex items-center gap-1.5 font-bold text-gray-300">
            <Shield className="h-3.5 w-3.5 text-blue-400" />
            <span>{isEn ? 'Attack Target:' : 'Цель атаки:'}</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div>
              <span className="text-[10px] text-gray-400 block mb-1">
                {isEn ? 'Select combatant target:' : 'Выбрать цель из боя:'}
              </span>
              <select
                value={targetId}
                onChange={(e) => setTargetId(e.target.value)}
                className="w-full bg-black/50 border border-white/10 rounded-full px-3 py-1.5 text-white text-xs focus:border-blue-400 focus:outline-none"
              >
                <option value="">{isEn ? '(Manual Target AC)' : '(Ручной ввод КД цели)'}</option>
                {combatants.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.isPlayer ? (isEn ? '[Player] ' : '[Игрок] ') : (isEn ? '[Monster] ' : '[Монстр] ')}
                    {isEn ? (c.name || c.nameRu) : cleanRussianText(c.nameRu || c.name)} — {isEn ? 'AC' : 'КД'} {c.ac} ({c.hp}/{c.maxHp} {isEn ? 'HP' : 'ОЗ'})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <span className="text-[10px] text-gray-400 block mb-1">
                {isEn ? 'Armor Class (Target AC):' : 'Класс Доспеха (КД цели):'}
              </span>
              <input
                type="number"
                min="1"
                max="35"
                value={effectiveAc}
                disabled={Boolean(target)}
                onChange={(e) => setCustomAc(parseInt(e.target.value, 10) || 10)}
                className="w-full bg-black/50 border border-white/10 rounded-full px-3 py-1 text-white font-mono text-xs focus:border-blue-400 focus:outline-none disabled:opacity-60"
              />
            </div>
          </div>

          {/* Damage parameters */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1 border-t border-white/5">
            <div>
              <span className="text-[10px] text-gray-400 block mb-1">
                {isEn ? 'Damage Formula (dice):' : 'Формула урона (кости):'}
              </span>
              <input
                type="text"
                value={damageFormula}
                onChange={(e) => setDamageFormula(e.target.value)}
                className="w-full bg-black/50 border border-white/10 rounded-full px-3 py-1 text-white font-mono text-xs focus:outline-none"
                placeholder="1d6+2"
              />
            </div>

            <div>
              <span className="text-[10px] text-gray-400 block mb-1">
                {isEn ? 'Avg Damage per Hit:' : 'Средний урон за удар:'}
              </span>
              <input
                type="number"
                min="1"
                value={avgDamage}
                onChange={(e) => setAvgDamage(parseInt(e.target.value, 10) || 1)}
                className="w-full bg-black/50 border border-white/10 rounded-full px-3 py-1 text-white font-mono text-xs focus:outline-none"
              />
            </div>

            <div>
              <span className="text-[10px] text-gray-400 block mb-1">
                {isEn ? 'Damage Type:' : 'Тип урона:'}
              </span>
              <select
                value={damageType}
                onChange={(e) => setDamageType(e.target.value as DamageType)}
                className="w-full bg-black/50 border border-white/10 rounded-full px-3 py-1 text-white text-xs focus:outline-none"
              >
                <option value="slashing">{localizeDamageType('slashing', language)}</option>
                <option value="piercing">{localizeDamageType('piercing', language)}</option>
                <option value="bludgeoning">{localizeDamageType('bludgeoning', language)}</option>
                <option value="fire">{localizeDamageType('fire', language)}</option>
                <option value="cold">{localizeDamageType('cold', language)}</option>
                <option value="necrotic">{localizeDamageType('necrotic', language)}</option>
                <option value="radiant">{localizeDamageType('radiant', language)}</option>
                <option value="poison">{localizeDamageType('poison', language)}</option>
                <option value="force">{localizeDamageType('force', language)}</option>
              </select>
            </div>
          </div>
        </section>

        {/* 3. DMG Table Calculation Summary */}
        <section className="bg-gradient-to-r from-amber-950/40 via-[rgba(24,30,42,0.8)] to-amber-950/40 border border-[#f5b920]/40 p-4 rounded-glass-xl flex flex-col gap-3 shadow-inner">
          <div className="flex items-center justify-between border-b border-white/10 pb-2">
            <span className="font-bold text-[#f5b920] uppercase tracking-wider text-[11px] flex items-center gap-1.5">
              <Sparkles className="h-4 w-4" />
              <span>{isEn ? 'DMG Rule Calculation:' : 'Расчёт по правилам DMG:'}</span>
            </span>
            <span className="text-[11px] font-mono text-gray-300">
              {isEn ? 'Needs d20: ' : 'Нужен d20: '}
              <strong className="text-white font-bold">{d20Needed}+</strong> ({isEn ? 'AC' : 'КД'} {effectiveAc} - {effectiveBonus})
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
            <div className="p-2 bg-black/40 rounded border border-white/5">
              <div className="text-[10px] text-gray-400">{isEn ? 'Ratio' : 'Соотношение'}</div>
              <div className="font-mono text-xs font-bold text-gray-200">
                {isEn ? `1 hit / ${attackersNeeded} mobs` : `1 hit / ${attackersNeeded} мобов`}
              </div>
            </div>

            <div className="p-2 bg-black/40 rounded border border-white/5">
              <div className="text-[10px] text-gray-400">{isEn ? 'Mob Attacks' : 'Атак в орде'}</div>
              <div className="font-mono text-sm font-black text-white">{mobCount}</div>
            </div>

            <div className="p-2 bg-black/40 rounded border border-emerald-500/30">
              <div className="text-[10px] text-emerald-400 font-bold">{isEn ? 'HITS' : 'ПОПАДАНИЙ'}</div>
              <div className="font-mono text-lg font-black text-emerald-300">
                {hitsScored}
              </div>
            </div>

            <div className="p-2 bg-black/40 rounded border border-red-500/30">
              <div className="text-[10px] text-red-400 font-bold">{isEn ? 'TOTAL DAMAGE' : 'ИТОГОВЫЙ УРОН'}</div>
              <div className="font-mono text-lg font-black text-red-400">
                {hitsScored * avgDamage}
              </div>
            </div>
          </div>

          {/* Last Strike Result */}
          {lastResult && (
            <div className="bg-black/50 p-2.5 rounded border border-emerald-500/40 text-[11px] text-emerald-200 flex items-center justify-between">
              <span>{lastResult.details}</span>
              <Check className="h-4 w-4 text-emerald-400 flex-shrink-0" />
            </div>
          )}
        </section>

        {/* Footer Actions */}
        <footer className="flex items-center justify-between gap-2 pt-2 border-t border-[rgba(255,255,255,0.08)]">
          <button
            type="button"
            onClick={handleCopySummary}
            className="flex items-center gap-1.5 min-h-[34px] px-3.5 py-1 rounded-full bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.08)] hover:bg-[rgba(255,255,255,0.1)] text-gray-300 hover:text-white transition-all cursor-pointer"
            title={isEn ? 'Copy text summary' : 'Скопировать текстовую сводку расчёта'}
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-400" />
                <span className="text-emerald-400 font-bold">{isEn ? 'Copied!' : 'Скопировано!'}</span>
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5 text-[#f5b920]" />
                <span>{isEn ? 'Copy Calculation' : 'Скопировать расчёт'}</span>
              </>
            )}
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setMobModalOpen(false)}
              className="min-h-[34px] px-4 py-1 rounded-full border border-white/10 hover:bg-white/10 text-gray-300 transition-all cursor-pointer"
            >
              {isEn ? 'Cancel' : 'Отмена'}
            </button>

            <button
              type="button"
              onClick={handleApplyDamage}
              disabled={hitsScored <= 0}
              className="flex items-center gap-1.5 min-h-[34px] px-5 py-1 rounded-full bg-[#f5b920] hover:bg-[#fac742] active:bg-[#e0a312] text-[#0c0d12] font-black shadow-[0_0_16px_rgba(245,185,32,0.35)] transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Flame className="h-4 w-4" />
              <span>{isEn ? `Apply Damage (${hitsScored * avgDamage} HP)` : `Нанести урон (${hitsScored * avgDamage} ОЗ)`}</span>
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
