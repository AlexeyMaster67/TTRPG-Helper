import {
  Heart,
  Shield,
  Zap,
  Eye,
  Wind,
  Plus,
  Minus,
  Dices,
  Sparkles,
  Award,
} from 'lucide-react';
import { PartyMember, CharacterStats, DND_SKILLS_RU } from '../../../types/party';
import { usePartyStore } from '../../../store/partyStore';
import { useCombatStore } from '../../../store/combatStore';
import { audioService } from '../../../services/audioService';
import { rollDie } from '../../../engine/rolls';
import { calculateEffectiveStats } from '../../../engine/effectStackEngine';

interface MobileMainTabProps {
  member: PartyMember;
}

export function MobileMainTab({ member }: MobileMainTabProps) {
  const { updateMember, showToast } = usePartyStore();
  const addDiceLog = useCombatStore((s) => s.addDiceLog);
  const combatants = useCombatStore((s) => s.combatants);
  const activeEffectsMap = useCombatStore((s) => s.activeEffects);
  const matchedCombatant = combatants.find(
    (c) =>
      c.id === member.id ||
      c.name.toLowerCase() === member.name.toLowerCase() ||
      (c.nameRu && c.nameRu.toLowerCase() === member.name.toLowerCase())
  );
  const characterEffects = matchedCombatant ? activeEffectsMap[matchedCombatant.id] || [] : [];
  const effectiveStats = calculateEffectiveStats(
    { ac: member.ac, speed: member.speed },
    characterEffects
  );

  const stats: CharacterStats = member.stats || {
    str: 10,
    dex: 10,
    con: 10,
    int: 10,
    wis: 10,
    cha: 10,
  };

  const pb = member.proficiencyBonus || 2 + Math.floor(((member.level || 1) - 1) / 4);
  const currentHp = member.currentHp !== undefined ? member.currentHp : member.maxHp;
  const maxHp = member.maxHp || 10;
  const tempHp = member.tempHp || 0;
  const hpRatio = Math.max(0, Math.min(1, currentHp / Math.max(1, maxHp)));
  const hpPercent = Math.round(hpRatio * 100);

  const hpBarBg =
    hpRatio > 0.5 ? 'bg-emerald-500' : hpRatio > 0.25 ? 'bg-amber-500' : 'bg-red-500';

  const hitDiceCurrent =
    member.hitDiceCurrent !== undefined
      ? member.hitDiceCurrent
      : member.hitDiceMax || member.level || 1;
  const hitDiceMax = member.hitDiceMax || member.level || 1;
  const hitDiceType = member.hitDiceType || 'd8';
  const exhaustion = member.exhaustion || 0;

  // Death saves from member or fallback to local representation
  const deathSaves = (member as any).deathSaves || { successes: 0, failures: 0 };

  const handleAdjustHp = (delta: number) => {
    if (delta < 0) {
      audioService.playSwordStrike();
    } else if (delta > 0) {
      audioService.playMagicCast();
    }
    const nextHp = Math.max(0, Math.min(maxHp, currentHp + delta));
    updateMember(member.id, { currentHp: nextHp });
  };

  const handleSetTempHp = (val: number) => {
    updateMember(member.id, { tempHp: Math.max(0, val) });
    showToast(`Временные ХП: ${Math.max(0, val)}`);
  };

  const handleToggleDeathSave = (type: 'successes' | 'failures', index: number) => {
    const currentVal = deathSaves[type] || 0;
    const nextVal = currentVal === index + 1 ? index : index + 1;
    const updated = { ...deathSaves, [type]: nextVal };
    updateMember(member.id, { ...({ deathSaves: updated } as any) });
  };

  const handleSetExhaustion = (delta: number) => {
    const next = Math.max(0, Math.min(6, exhaustion + delta));
    updateMember(member.id, { exhaustion: next });
  };

  const handleRollInitiative = () => {
    const d20 = rollDie(20);
    const total = d20 + member.initBonus;
    audioService.playDiceRoll();
    if (d20 === 20) audioService.playCriticalHit();
    if (d20 === 1) audioService.playSadHorn();

    addDiceLog({
      id: `dice-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toTimeString().split(' ')[0],
      combatantName: member.name,
      actionName: 'Бросок инициативы',
      attackRoll: {
        d20,
        modifier: member.initBonus,
        total,
        isNat20: d20 === 20,
        isNat1: d20 === 1,
      },
    });

    showToast(`Инициатива ${member.name}: ${total} (кость: ${d20})`);
  };

  const handleRollSave = (statKey: keyof CharacterStats, statNameRu: string) => {
    const score = stats[statKey] ?? 10;
    const mod = Math.floor((score - 10) / 2);
    const isProf = (member.savingThrowProficiencies || []).includes(statKey);
    const bonus = isProf ? mod + pb : mod;

    const d20 = rollDie(20);
    const total = d20 + bonus;
    audioService.playDiceRoll();
    if (d20 === 20) audioService.playCriticalHit();
    if (d20 === 1) audioService.playSadHorn();

    addDiceLog({
      id: `dice-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toTimeString().split(' ')[0],
      combatantName: member.name,
      actionName: `Спасбросок (${statNameRu})`,
      attackRoll: {
        d20,
        modifier: bonus,
        total,
        isNat20: d20 === 20,
        isNat1: d20 === 1,
      },
    });

    showToast(`Спасбросок ${statNameRu}: ${total} (кость: ${d20}, модификатор: ${bonus >= 0 ? `+${bonus}` : bonus})`);
  };

  const handleSpendHitDie = () => {
    if (hitDiceCurrent <= 0) {
      showToast('Нет доступных костей хитов!');
      return;
    }
    const sides = parseInt(hitDiceType.replace(/\D/g, '')) || 8;
    const roll = rollDie(sides);
    const conMod = Math.floor(((stats.con ?? 10) - 10) / 2);
    const recovered = Math.max(1, roll + conMod);
    audioService.playMagicCast();

    const newHp = Math.min(maxHp, currentHp + recovered);
    updateMember(member.id, {
      hitDiceCurrent: hitDiceCurrent - 1,
      currentHp: newHp,
    });

    showToast(`Потрачена кость ${hitDiceType}: результат ${roll} + ${conMod} (ТЕЛ) = +${recovered} ХП`);
  };

  const saveStatsList: Array<{ key: keyof CharacterStats; label: string }> = [
    { key: 'str', label: 'СИЛ' },
    { key: 'dex', label: 'ЛОВ' },
    { key: 'con', label: 'ТЕЛ' },
    { key: 'int', label: 'ИНТ' },
    { key: 'wis', label: 'МУД' },
    { key: 'cha', label: 'ХАР' },
  ];

  const handleRollAbilityCheck = (label: string, statKey: keyof CharacterStats) => {
    const score = stats[statKey] ?? 10;
    const mod = Math.floor((score - 10) / 2);
    const d20 = rollDie(20);
    const total = d20 + mod;
    audioService.playDiceRoll();
    if (d20 === 20) audioService.playCriticalHit();
    if (d20 === 1) audioService.playSadHorn();

    addDiceLog({
      id: `dice-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toTimeString().split(' ')[0],
      combatantName: member.name,
      actionName: `Проверка: ${label}`,
      attackRoll: { d20, modifier: mod, total, isNat20: d20 === 20, isNat1: d20 === 1 },
    });
    showToast(`${member.name}: ${label} = ${total} (кость: ${d20})`);
  };

  const handleRollSkill = (nameRu: string, abilityKey: keyof CharacterStats, skillKey: string) => {
    const profState = member.skillProficiencies?.[skillKey];
    const abilityMod = Math.floor(((stats[abilityKey] ?? 10) - 10) / 2);
    let bonus = abilityMod;
    if (profState === 'proficient') bonus += pb;
    if (profState === 'expertise') bonus += pb * 2;

    const d20 = rollDie(20);
    const total = d20 + bonus;
    audioService.playDiceRoll();
    if (d20 === 20) audioService.playCriticalHit();
    if (d20 === 1) audioService.playSadHorn();

    addDiceLog({
      id: `dice-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toTimeString().split(' ')[0],
      combatantName: member.name,
      actionName: `Навык: ${nameRu}`,
      attackRoll: { d20, modifier: bonus, total, isNat20: d20 === 20, isNat1: d20 === 1 },
    });
    showToast(`${member.name}: ${nameRu} = ${total} (кость: ${d20})`);
  };

  const handleToggleSkill = (skillKey: string) => {
    const profs = { ...(member.skillProficiencies || {}) };
    const current = profs[skillKey];
    if (!current) profs[skillKey] = 'proficient';
    else if (current === 'proficient') profs[skillKey] = 'expertise';
    else delete profs[skillKey];
    updateMember(member.id, { skillProficiencies: profs });
  };

  const handleToggleInspiration = () => {
    audioService.playMagicCast();
    updateMember(member.id, { inspiration: !member.inspiration });
  };

  return (
    <div className="space-y-4 pb-24">
      {/* Interactive Health Widget */}
      <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4 shadow-lg">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Heart className="w-5 h-5 text-red-500 fill-red-500/20" />
            <h3 className="text-sm font-bold text-stone-200 uppercase tracking-wider">
              Здоровье персонажа
            </h3>
          </div>
          <span className="text-xs font-mono text-stone-400">
            {hpPercent}% ХП
          </span>
        </div>

        {/* Central HP Counter & Gauge */}
        <div className="flex flex-col items-center justify-center py-2">
          <div className="flex items-baseline gap-2">
            <span className="text-5xl font-black font-mono tracking-tight text-stone-100">
              {currentHp}
            </span>
            <span className="text-2xl font-bold font-mono text-stone-500">
              / {maxHp}
            </span>
            {tempHp > 0 && (
              <span className="ml-1 px-2.5 py-0.5 rounded-full text-sm font-bold font-mono bg-cyan-950 text-cyan-300 border border-cyan-700/60">
                +{tempHp} вр.
              </span>
            )}
          </div>

          {/* Color-changing Health Progress Bar */}
          <div className="w-full bg-stone-950 h-3.5 rounded-full overflow-hidden border border-stone-800 mt-3 p-0.5">
            <div
              className={`h-full rounded-full transition-all duration-300 ${hpBarBg}`}
              style={{ width: `${hpPercent}%` }}
            />
          </div>
        </div>

        {/* Quick Health Buttons */}
        <div className="mt-4 pt-3 border-t border-stone-800 space-y-2.5">
          <div className="grid grid-cols-3 gap-2">
            {/* Quick Damage Buttons */}
            <button
              onClick={() => handleAdjustHp(-1)}
              className="min-h-[44px] rounded-xl bg-red-950/40 hover:bg-red-900/60 active:scale-95 border border-red-800/60 text-red-300 font-mono font-bold text-sm flex items-center justify-center transition-all touch-manipulation"
              aria-label="Получить 1 урона"
            >
              -1 урон
            </button>
            <button
              onClick={() => handleAdjustHp(-5)}
              className="min-h-[44px] rounded-xl bg-red-950/40 hover:bg-red-900/60 active:scale-95 border border-red-800/60 text-red-300 font-mono font-bold text-sm flex items-center justify-center transition-all touch-manipulation"
              aria-label="Получить 5 урона"
            >
              -5 урон
            </button>
            <button
              onClick={() => handleAdjustHp(-10)}
              className="min-h-[44px] rounded-xl bg-red-950/50 hover:bg-red-900/70 active:scale-95 border border-red-700 text-red-200 font-mono font-bold text-sm flex items-center justify-center transition-all touch-manipulation"
              aria-label="Получить 10 урона"
            >
              -10 урон
            </button>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {/* Quick Heal Buttons */}
            <button
              onClick={() => handleAdjustHp(1)}
              className="min-h-[44px] rounded-xl bg-emerald-950/40 hover:bg-emerald-900/60 active:scale-95 border border-emerald-800/60 text-emerald-300 font-mono font-bold text-sm flex items-center justify-center transition-all touch-manipulation"
              aria-label="Восстановить 1 ХП"
            >
              +1 хил
            </button>
            <button
              onClick={() => handleAdjustHp(5)}
              className="min-h-[44px] rounded-xl bg-emerald-950/40 hover:bg-emerald-900/60 active:scale-95 border border-emerald-800/60 text-emerald-300 font-mono font-bold text-sm flex items-center justify-center transition-all touch-manipulation"
              aria-label="Восстановить 5 ХП"
            >
              +5 хил
            </button>
            <button
              onClick={() => handleAdjustHp(10)}
              className="min-h-[44px] rounded-xl bg-emerald-950/50 hover:bg-emerald-900/70 active:scale-95 border border-emerald-700 text-emerald-200 font-mono font-bold text-sm flex items-center justify-center transition-all touch-manipulation"
              aria-label="Восстановить 10 ХП"
            >
              +10 хил
            </button>
          </div>

          {/* Temp HP Controls */}
          <div className="flex items-center justify-between gap-2 pt-1">
            <button
              onClick={() => handleSetTempHp(tempHp + 5)}
              className="flex-1 min-h-[44px] rounded-xl bg-cyan-950/40 hover:bg-cyan-900/50 border border-cyan-800/50 text-cyan-300 text-xs font-semibold flex items-center justify-center gap-1 active:scale-95 transition-all touch-manipulation"
            >
              <Plus className="w-4 h-4" />
              <span>+5 Временных ХП</span>
            </button>

            {tempHp > 0 && (
              <button
                onClick={() => handleSetTempHp(0)}
                className="min-h-[44px] px-3 rounded-xl bg-stone-800 hover:bg-stone-700 border border-stone-700 text-stone-400 hover:text-stone-200 text-xs font-medium active:scale-95 transition-all touch-manipulation"
              >
                Сброс вр. ХП
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Core Combat Parameters Bar */}
      <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
        {/* Armor Class */}
        <div className="bg-stone-900 border border-stone-800 rounded-xl p-2 sm:p-2.5 text-center flex flex-col items-center justify-center">
          <div className="flex items-center gap-1 text-stone-400 text-[10px] sm:text-[11px] font-medium mb-1 truncate">
            <Shield className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>КД</span>
          </div>
          <div className="flex items-baseline gap-0.5">
            <span
              className={`text-xl sm:text-2xl font-black font-mono ${
                effectiveStats.acBonus > 0
                  ? 'text-emerald-400'
                  : effectiveStats.acBonus < 0
                  ? 'text-red-400'
                  : 'text-stone-100'
              }`}
            >
              {effectiveStats.effectiveAc}
            </span>
            {effectiveStats.acBonus !== 0 && (
              <span className="text-[10px] font-mono text-emerald-300">
                ({effectiveStats.acBonus > 0 ? `+${effectiveStats.acBonus}` : effectiveStats.acBonus})
              </span>
            )}
          </div>
        </div>

        {/* Speed */}
        <div className="bg-stone-900 border border-stone-800 rounded-xl p-2 sm:p-2.5 text-center flex flex-col items-center justify-center">
          <div className="flex items-center gap-1 text-stone-400 text-[10px] sm:text-[11px] font-medium mb-1 truncate">
            <Wind className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span>Скорость</span>
          </div>
          <span className="text-[11px] sm:text-xs font-bold font-mono text-stone-100 truncate max-w-full">
            {effectiveStats.effectiveSpeed}
          </span>
        </div>

        {/* Initiative (Clickable to roll!) */}
        <button
          onClick={handleRollInitiative}
          className="bg-stone-900 hover:bg-stone-850 active:scale-95 border border-stone-800 hover:border-amber-500/50 rounded-xl p-2 sm:p-2.5 text-center flex flex-col items-center justify-center transition-all touch-manipulation group"
        >
          <div className="flex items-center gap-1 text-stone-400 group-hover:text-amber-400 text-[10px] sm:text-[11px] font-medium mb-1 truncate">
            <Zap className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span className="truncate">Инициатива</span>
          </div>
          <span className="text-xl sm:text-2xl font-black font-mono text-amber-300">
            {member.initBonus >= 0 ? `+${member.initBonus}` : member.initBonus}
          </span>
        </button>

        {/* Passive Perception */}
        <div className="bg-stone-900 border border-stone-800 rounded-xl p-2 sm:p-2.5 text-center flex flex-col items-center justify-center">
          <div className="flex items-center gap-1 text-stone-400 text-[10px] sm:text-[11px] font-medium mb-1 truncate">
            <Eye className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>Внимание</span>
          </div>
          <span className="text-xl sm:text-2xl font-black font-mono text-stone-100">
            {member.passivePerception || 10 + Math.floor(((stats.wis ?? 10) - 10) / 2)}
          </span>
        </div>
      </div>

      {/* Active Effects & Auras Stack Section with Round Timer */}
      {characterEffects.length > 0 && (
        <div className="bg-stone-900 border border-purple-800/60 rounded-2xl p-3.5 shadow-lg space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-400" />
              <h3 className="text-xs font-bold text-purple-200 uppercase tracking-wider">
                Активные эффекты и ауры ({characterEffects.length})
              </h3>
            </div>
          </div>

          <div className="space-y-1.5">
            {characterEffects.map((eff) => (
              <div
                key={eff.id}
                className="flex items-center justify-between gap-2 p-2 rounded-xl bg-purple-950/40 border border-purple-800/50 text-xs"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-2 h-2 rounded-full bg-purple-400 flex-shrink-0" />
                  <div className="min-w-0">
                    <span className="font-bold text-stone-100 truncate block">
                      {eff.name}
                    </span>
                    <div className="flex items-center gap-1.5 text-[10px] text-stone-400 flex-wrap">
                      {eff.modifiers?.acBonus && (
                        <span className="text-emerald-400 font-bold font-mono">
                          {eff.modifiers.acBonus > 0 ? `+${eff.modifiers.acBonus}` : eff.modifiers.acBonus} КД
                        </span>
                      )}
                      {eff.modifiers?.speedBonus && (
                        <span className="text-cyan-400 font-mono">
                          {eff.modifiers.speedBonus > 0 ? `+${eff.modifiers.speedBonus}` : eff.modifiers.speedBonus} фт.
                        </span>
                      )}
                      {eff.modifiers?.attackBonus && (
                        <span className="text-amber-300 font-mono">
                          {eff.modifiers.attackBonus} атака
                        </span>
                      )}
                      {eff.modifiers?.saveBonus && (
                        <span className="text-blue-300 font-mono">
                          {eff.modifiers.saveBonus} спас
                        </span>
                      )}
                      {eff.aura?.enabled && (
                        <span
                          className="px-1 py-0.2 rounded font-mono font-bold text-[9px] border"
                          style={{
                            backgroundColor: `${eff.aura.color}22`,
                            borderColor: eff.aura.color,
                            color: eff.aura.color,
                          }}
                        >
                          Аура {eff.aura.radiusFeet} фт.
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="text-right flex-shrink-0">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-stone-950 border border-stone-800 text-purple-300">
                    {eff.durationRounds === 'permanent'
                      ? 'Постоянный'
                      : `Осталось: ${eff.durationRounds} р.`}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Hit Dice & Rest Section */}
      <div className="bg-stone-900 border border-stone-800 rounded-xl p-3 flex items-center justify-between">
        <div>
          <div className="text-xs text-stone-400 font-medium">Кости хитов ({hitDiceType})</div>
          <div className="text-lg font-black font-mono text-stone-100">
            {hitDiceCurrent} / {hitDiceMax}
          </div>
        </div>

        <button
          onClick={handleSpendHitDie}
          disabled={hitDiceCurrent <= 0}
          className="min-h-[44px] px-4 rounded-xl bg-amber-700/80 hover:bg-amber-600 disabled:opacity-40 disabled:pointer-events-none active:scale-95 text-white font-semibold text-xs flex items-center gap-1.5 transition-all touch-manipulation border border-amber-500/40"
        >
          <Dices className="w-4 h-4" />
          <span>Потратить кость</span>
        </button>
      </div>

      {/* Death Saves & Exhaustion */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Death Saves */}
        <div className="bg-stone-900 border border-stone-800 rounded-xl p-3">
          <div className="text-xs font-bold text-stone-300 uppercase tracking-wider mb-2">
            Спасброски от смерти
          </div>
          <div className="space-y-2">
            {/* Successes */}
            <div className="flex items-center justify-between">
              <span className="text-xs text-emerald-400 font-medium">Успехи</span>
              <div className="flex items-center gap-2">
                {[0, 1, 2].map((idx) => {
                  const isChecked = (deathSaves.successes || 0) > idx;
                  return (
                    <button
                      key={idx}
                      onClick={() => handleToggleDeathSave('successes', idx)}
                      className={`w-9 h-9 rounded-lg border flex items-center justify-center transition-all active:scale-95 touch-manipulation ${
                        isChecked
                          ? 'bg-emerald-600 border-emerald-400 text-white'
                          : 'bg-stone-800 border-stone-700 text-stone-500'
                      }`}
                      aria-label={`Успех ${idx + 1}`}
                    >
                      <span className="w-2.5 h-2.5 rounded-full bg-current" />
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Failures */}
            <div className="flex items-center justify-between">
              <span className="text-xs text-red-400 font-medium">Провалы</span>
              <div className="flex items-center gap-2">
                {[0, 1, 2].map((idx) => {
                  const isChecked = (deathSaves.failures || 0) > idx;
                  return (
                    <button
                      key={idx}
                      onClick={() => handleToggleDeathSave('failures', idx)}
                      className={`w-9 h-9 rounded-lg border flex items-center justify-center transition-all active:scale-95 touch-manipulation ${
                        isChecked
                          ? 'bg-red-600 border-red-400 text-white'
                          : 'bg-stone-800 border-stone-700 text-stone-500'
                      }`}
                      aria-label={`Провал ${idx + 1}`}
                    >
                      <span className="w-2.5 h-2.5 rounded-full bg-current" />
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Exhaustion Counter */}
        <div className="bg-stone-900 border border-stone-800 rounded-xl p-3 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-stone-300 uppercase tracking-wider">
              Истощение (0 - 6)
            </span>
            {exhaustion > 0 && (
              <span className="text-xs font-mono text-amber-400 font-bold">
                Штраф: -{exhaustion * 2} ко всем броскам
              </span>
            )}
          </div>

          <div className="flex items-center justify-between gap-2 bg-stone-950 border border-stone-800 rounded-lg p-1">
            <button
              onClick={() => handleSetExhaustion(-1)}
              disabled={exhaustion <= 0}
              className="min-h-[44px] min-w-[44px] rounded-md bg-stone-850 hover:bg-stone-800 disabled:opacity-30 text-stone-200 flex items-center justify-center font-bold text-lg active:scale-95 transition-all"
              aria-label="Уменьшить истощение"
            >
              <Minus className="w-5 h-5" />
            </button>

            <span className="font-mono font-black text-2xl text-stone-100">
              {exhaustion}
            </span>

            <button
              onClick={() => handleSetExhaustion(1)}
              disabled={exhaustion >= 6}
              className="min-h-[44px] min-w-[44px] rounded-md bg-stone-850 hover:bg-stone-800 disabled:opacity-30 text-stone-200 flex items-center justify-center font-bold text-lg active:scale-95 transition-all"
              aria-label="Увеличить истощение"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Saving Throws (Interactive Cards) */}
      <div className="bg-stone-900 border border-stone-800 rounded-xl p-3">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-xs font-bold text-stone-300 uppercase tracking-wider">
            Спасброски (нажмите для броска)
          </h4>
          <span className="text-[11px] font-mono text-stone-500">
            ПБ: +{pb}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {saveStatsList.map(({ key, label }) => {
            const score = stats[key] ?? 10;
            const mod = Math.floor((score - 10) / 2);
            const isProf = (member.savingThrowProficiencies || []).includes(key);
            const bonus = isProf ? mod + pb : mod;

            return (
              <button
                key={key}
                onClick={() => handleRollSave(key, label)}
                className={`min-h-[50px] p-2 rounded-xl border flex flex-col items-center justify-center active:scale-95 transition-all touch-manipulation ${
                  isProf
                    ? 'bg-amber-950/25 border-amber-500/50 text-amber-200 hover:bg-amber-900/30'
                    : 'bg-stone-800/80 border-stone-700/80 text-stone-300 hover:bg-stone-750'
                }`}
              >
                <div className="flex items-center gap-1 text-[11px] font-semibold text-stone-400">
                  {isProf && <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />}
                  <span>{label}</span>
                </div>
                <div className="text-base font-black font-mono">
                  {bonus >= 0 ? `+${bonus}` : bonus}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 6 Core Ability Scores (Interactive Cards with Check Rolls) */}
      <div className="bg-stone-900 border border-stone-800 rounded-xl p-3">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-xs font-bold text-stone-300 uppercase tracking-wider flex items-center gap-1.5">
            <Zap className="w-4 h-4 text-amber-400" />
            <span>Основные характеристики (проверка)</span>
          </h4>
        </div>

        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          {[
            { key: 'str' as keyof CharacterStats, label: 'СИЛА' },
            { key: 'dex' as keyof CharacterStats, label: 'ЛОВКОСТЬ' },
            { key: 'con' as keyof CharacterStats, label: 'ТЕЛОСЛОЖЕНИЕ' },
            { key: 'int' as keyof CharacterStats, label: 'ИНТЕЛЛЕКТ' },
            { key: 'wis' as keyof CharacterStats, label: 'МУДРОСТЬ' },
            { key: 'cha' as keyof CharacterStats, label: 'ХАРИЗМА' },
          ].map(({ key, label }) => {
            const score = stats[key] ?? 10;
            const mod = Math.floor((score - 10) / 2);

            return (
              <button
                key={key}
                type="button"
                onClick={() => handleRollAbilityCheck(label, key)}
                className="bg-stone-950/80 border border-stone-800 hover:border-amber-500/50 rounded-xl p-2.5 flex flex-col items-center justify-between shadow-sm active:scale-95 transition-all group touch-manipulation"
                title={`Проверка ${label}`}
              >
                <div className="flex items-center gap-1">
                  <span className="text-[10px] font-bold tracking-wider text-stone-400 group-hover:text-amber-300">
                    {label.slice(0, 3)}
                  </span>
                  <Dices className="w-3 h-3 text-amber-500/40 group-hover:text-amber-400" />
                </div>
                <span className="font-mono text-xl font-black text-stone-100 group-hover:text-amber-300 my-0.5">
                  {mod >= 0 ? `+${mod}` : mod}
                </span>
                <div className="bg-stone-900 px-2 py-0.2 rounded-full border border-stone-700 font-mono text-[10px] text-stone-400">
                  {score}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Hero Inspiration Banner */}
      <div
        onClick={handleToggleInspiration}
        className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all active:scale-95 touch-manipulation ${
          member.inspiration
            ? 'bg-amber-950/30 border-amber-500/60 shadow-[0_0_12px_rgba(245,158,11,0.25)]'
            : 'bg-stone-900 border-stone-800 text-stone-400 hover:text-stone-200'
        }`}
      >
        <div className="flex items-center gap-2.5">
          <Sparkles className={`w-5 h-5 ${member.inspiration ? 'text-amber-400 fill-amber-400/20' : 'text-stone-500'}`} />
          <div>
            <span className="text-xs font-bold uppercase tracking-wider block text-stone-200">
              Героическое вдохновение
            </span>
            <span className="text-[10px] text-stone-400">
              {member.inspiration ? 'Активно (клик для сброса)' : 'Неактивно (клик для включения)'}
            </span>
          </div>
        </div>

        <span
          className={`px-3 py-1 rounded-full text-xs font-bold font-mono border ${
            member.inspiration
              ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
              : 'bg-stone-800 border-stone-700 text-stone-500'
          }`}
        >
          {member.inspiration ? 'ДА' : 'НЕТ'}
        </span>
      </div>

      {/* 18 Canonical Skills List */}
      <div className="bg-stone-900 border border-stone-800 rounded-xl p-3">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-xs font-bold text-stone-300 uppercase tracking-wider flex items-center gap-1.5">
            <Award className="w-4 h-4 text-emerald-400" />
            <span>18 навыков (Владение и Экспертиза)</span>
          </h4>
        </div>

        <div className="space-y-1.5">
          {DND_SKILLS_RU.map((sk) => {
            const profState = member.skillProficiencies?.[sk.key];
            const abilityMod = Math.floor(((stats[sk.ability] ?? 10) - 10) / 2);
            let bonus = abilityMod;
            if (profState === 'proficient') bonus += pb;
            if (profState === 'expertise') bonus += pb * 2;

            return (
              <div
                key={sk.key}
                className="p-2 rounded-xl bg-stone-950/80 border border-stone-800 hover:border-amber-500/40 flex items-center justify-between gap-2 transition-all"
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <button
                    type="button"
                    onClick={() => handleToggleSkill(sk.key)}
                    className={`w-8 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold font-mono transition-all shrink-0 ${
                      profState === 'expertise'
                        ? 'bg-purple-900/60 border border-purple-500 text-purple-300'
                        : profState === 'proficient'
                        ? 'bg-amber-950/60 border border-amber-500/60 text-amber-300'
                        : 'bg-stone-900 border border-stone-800 text-stone-600'
                    }`}
                    title={`Статус: ${profState || 'нет'}. Нажмите для смены.`}
                  >
                    {profState === 'expertise' ? 'EXP' : profState === 'proficient' ? 'PRF' : '-'}
                  </button>

                  <div className="min-w-0">
                    <span className="text-xs font-medium text-stone-100 truncate block">
                      {sk.nameRu}
                    </span>
                    <span className="text-[10px] text-stone-500 font-mono">
                      {sk.ability.toUpperCase()}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleRollSkill(sk.nameRu, sk.ability, sk.key)}
                  className="min-h-[36px] px-3 rounded-lg bg-stone-900 hover:bg-amber-950/30 text-amber-300 border border-amber-500/40 font-mono text-xs font-bold flex items-center gap-1 active:scale-95 transition-all"
                  title={`Бросок: 1d20${bonus >= 0 ? `+${bonus}` : bonus}`}
                >
                  <Dices className="w-3.5 h-3.5 text-amber-400" />
                  <span>{bonus >= 0 ? `+${bonus}` : bonus}</span>
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
