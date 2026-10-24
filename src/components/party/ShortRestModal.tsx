import React, { useState, useEffect, useMemo } from 'react';
import { usePartyStore } from '../../store/partyStore';
import { useCombatStore } from '../../store/combatStore';
import { useSettingsStore } from '../../store/settingsStore';
import { rollDie } from '../../engine/rolls';
import { Flame, X, Sparkles, Check, RotateCcw, HeartPulse, Zap } from 'lucide-react';
import { HealthBar } from '../ui';

interface RestParticipant {
  id: string;
  partyMemberId?: string;
  combatantId?: string;
  name: string;
  color: string;
  characterClass: string;
  currentHp: number;
  maxHp: number;
  tempHp: number;
  hitDiceCurrent: number;
  hitDiceMax: number;
  hitDiceType: string;
  conScore: number;
  conMod: number;
  isWarlock: boolean;
  shortRestResources: Array<{ name: string; current: number; max: number }>;
}

export const ShortRestModal: React.FC = () => {
  const language = useSettingsStore((s) => s.language);
  const isRu = language === 'ru';
  const isEn = !isRu;

  const {
    members,
    isShortRestModalOpen,
    shortRestTargetId,
    closeShortRestModal,
    shortRest,
    showToast,
  } = usePartyStore();

  const combatants = useCombatStore((s) => s.combatants);
  const updateCombatant = useCombatStore((s) => s.updateCombatant);

  // Tracking hit dice spent and hp rolled per participant
  const [spentDiceMap, setSpentDiceMap] = useState<Record<string, number>>({});
  const [recoveredHpMap, setRecoveredHpMap] = useState<Record<string, number>>({});
  const [rollHistoryMap, setRollHistoryMap] = useState<Record<string, number[]>>({});

  useEffect(() => {
    if (isShortRestModalOpen) {
      setSpentDiceMap({});
      setRecoveredHpMap({});
      setRollHistoryMap({});
    }
  }, [isShortRestModalOpen]);

  // Combine party members and active player combatants into a unified list
  const participants = useMemo<RestParticipant[]>(() => {
    const list: RestParticipant[] = [];
    const playerCombatants = combatants.filter((c) => c.isPlayer);
    const matchedCombatantIds = new Set<string>();

    // 1. Process Party Members
    members.forEach((m) => {
      // Find matching player combatant if exists in combat roster
      const matched = playerCombatants.find(
        (c) =>
          c.id === m.id ||
          c.name.trim().toLowerCase() === m.name.trim().toLowerCase()
      );
      if (matched) {
        matchedCombatantIds.add(matched.id);
      }

      const conScore = m.stats?.con ?? 10;
      const conMod = Math.floor((conScore - 10) / 2);
      const isWarlock =
        (m.characterClass || '').toLowerCase().includes('колдун') ||
        (m.characterClass || '').toLowerCase().includes('warlock');

      const currentHp =
        matched !== undefined ? matched.hp : m.currentHp !== undefined ? m.currentHp : m.maxHp;
      const maxHp = matched !== undefined ? matched.maxHp : m.maxHp;
      const tempHp = matched !== undefined ? matched.tempHp : m.tempHp || 0;

      list.push({
        id: m.id,
        partyMemberId: m.id,
        combatantId: matched?.id,
        name: m.name,
        color: m.color || '#10B981',
        characterClass: m.characterClass || (isEn ? 'Hero' : 'Герой'),
        currentHp,
        maxHp,
        tempHp,
        hitDiceCurrent: m.hitDiceCurrent ?? (m.hitDiceMax || m.level || 5),
        hitDiceMax: m.hitDiceMax || m.level || 5,
        hitDiceType: m.hitDiceType || 'd8',
        conScore,
        conMod,
        isWarlock,
        shortRestResources: (m.resources || []).filter((r) => r.resetOn === 'short'),
      });
    });

    // 2. Add player combatants that were added directly in combat without being in partyStore
    playerCombatants.forEach((c) => {
      if (!matchedCombatantIds.has(c.id)) {
        const conMod = c.statblock?.con ? Math.floor((c.statblock.con - 10) / 2) : 1;
        const conScore = c.statblock?.con || 12;
        const isWarlock =
          (c.creatureType || '').toLowerCase().includes('колдун') ||
          (c.creatureType || '').toLowerCase().includes('warlock') ||
          c.name.toLowerCase().includes('колдун') ||
          c.name.toLowerCase().includes('warlock');

        list.push({
          id: c.id,
          combatantId: c.id,
          name: isEn ? (c.name || c.nameRu || '') : (c.nameRu || c.name || ''),
          color: c.color || '#3b82f6',
          characterClass: c.creatureType || (isEn ? 'Player Character' : 'Персонаж игрока'),
          currentHp: c.hp,
          maxHp: c.maxHp,
          tempHp: c.tempHp || 0,
          hitDiceCurrent: 5,
          hitDiceMax: 5,
          hitDiceType: 'd8',
          conScore,
          conMod,
          isWarlock,
          shortRestResources: [],
        });
      }
    });

    if (shortRestTargetId) {
      return list.filter(
        (p) =>
          p.id === shortRestTargetId ||
          p.partyMemberId === shortRestTargetId ||
          p.combatantId === shortRestTargetId
      );
    }

    return list;
  }, [members, combatants, shortRestTargetId, isEn]);

  if (!isShortRestModalOpen) return null;

  const handleRollHitDie = (participant: RestParticipant) => {
    const currentDice = participant.hitDiceCurrent;
    const spentSoFar = spentDiceMap[participant.id] || 0;
    if (spentSoFar >= currentDice) return;

    // Parse die type e.g. "d10" -> 10, default 8
    const dieMatch = participant.hitDiceType.match(/\d+/);
    const dieSides = dieMatch ? parseInt(dieMatch[0], 10) : 8;

    const roll = rollDie(dieSides);
    const totalRecovered = Math.max(1, roll + participant.conMod);

    setSpentDiceMap((prev) => ({
      ...prev,
      [participant.id]: (prev[participant.id] || 0) + 1,
    }));

    setRecoveredHpMap((prev) => ({
      ...prev,
      [participant.id]: (prev[participant.id] || 0) + totalRecovered,
    }));

    setRollHistoryMap((prev) => ({
      ...prev,
      [participant.id]: [...(prev[participant.id] || []), roll],
    }));
  };

  // Auto-recover HP spending hit dice until max HP is reached or dice are depleted
  const handleAutoRecover = (participant: RestParticipant) => {
    const currentDice = participant.hitDiceCurrent;
    let spentSoFar = spentDiceMap[participant.id] || 0;
    let totalRecovered = recoveredHpMap[participant.id] || 0;
    const currentHp = participant.currentHp;
    const maxHp = participant.maxHp;

    const dieMatch = participant.hitDiceType.match(/\d+/);
    const dieSides = dieMatch ? parseInt(dieMatch[0], 10) : 8;

    const rolls: number[] = [...(rollHistoryMap[participant.id] || [])];

    while (spentSoFar < currentDice && currentHp + totalRecovered < maxHp) {
      const roll = rollDie(dieSides);
      const gain = Math.max(1, roll + participant.conMod);
      spentSoFar += 1;
      totalRecovered += gain;
      rolls.push(roll);
    }

    setSpentDiceMap((prev) => ({ ...prev, [participant.id]: spentSoFar }));
    setRecoveredHpMap((prev) => ({ ...prev, [participant.id]: totalRecovered }));
    setRollHistoryMap((prev) => ({ ...prev, [participant.id]: rolls }));
  };

  const handleResetParticipant = (id: string) => {
    setSpentDiceMap((prev) => ({ ...prev, [id]: 0 }));
    setRecoveredHpMap((prev) => ({ ...prev, [id]: 0 }));
    setRollHistoryMap((prev) => ({ ...prev, [id]: [] }));
  };

  const handleCompleteRest = () => {
    participants.forEach((p) => {
      const spent = spentDiceMap[p.id] || 0;
      const recovered = recoveredHpMap[p.id] || 0;

      // 1. Update party store member if linked
      if (p.partyMemberId) {
        shortRest(p.partyMemberId, spent, recovered);
      }

      // 2. Update combatant in combatStore if active in combat
      if (p.combatantId) {
        const combatant = combatants.find((c) => c.id === p.combatantId);
        if (combatant) {
          const newHp = Math.min(combatant.maxHp, combatant.hp + recovered);
          const updates: any = { hp: newHp };

          // If was dying or 0 hp, reset death saves
          if (combatant.hp === 0 && newHp > 0) {
            updates.isDying = false;
            updates.isDead = false;
            updates.deathSaves = { successes: 0, failures: 0 };
          }

          // Reset warlock pact magic spell slots if present on combatant
          if (p.isWarlock && combatant.spellSlots) {
            const resetSlots = { ...combatant.spellSlots };
            Object.keys(resetSlots).forEach((lvl) => {
              const numLvl = Number(lvl);
              if (resetSlots[numLvl]) {
                resetSlots[numLvl] = { ...resetSlots[numLvl], used: 0 };
              }
            });
            updates.spellSlots = resetSlots;
          }

          updateCombatant(combatant.id, updates);
        }
      }
    });

    showToast(
      isEn
        ? 'Short rest (1 hr) completed: HP, warlock spell slots, and tactical abilities restored'
        : 'Короткий отдых (1ч) завершён: здоровье, ячейки колдунов и тактические умения восстановлены'
    );
    closeShortRestModal();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={isEn ? 'Short Rest' : 'Короткий отдых'}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-3 sm:p-4 select-none animate-in fade-in duration-200"
    >
      <div className="w-full max-w-2xl bg-[rgba(18,22,30,0.88)] backdrop-blur-xl border border-[rgba(255,255,255,0.08)] rounded-glass-xl shadow-[0_20px_50px_rgba(0,0,0,0.7)] p-5 sm:p-6 text-gray-100 flex flex-col max-h-[90vh] overflow-hidden gap-4 font-sans">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[rgba(255,255,255,0.08)] pb-3.5">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2.5 rounded-glass-lg bg-amber-500/15 border border-amber-500/30 text-amber-400 shrink-0 shadow-[0_0_14px_rgba(245,158,11,0.25)]">
              <Flame className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                  {isEn ? 'Short Rest (1 Hour)' : 'Короткий отдых (1 час)'}
                </h2>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-amber-950/80 text-amber-300 border border-amber-600/40">
                  {isEn ? '1 hour rest' : '1 час отдыха'}
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-0.5">
                {isEn
                  ? 'Heroes roll Hit Dice (HD) to heal wounds and regain short rest resources.'
                  : 'Герои бросают кости хитов (КХ) для исцеления ран и восполняют ресурсы короткого отдыха.'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={closeShortRestModal}
            className="p-1.5 rounded-glass text-gray-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title={isEn ? 'Close' : 'Закрыть'}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Participants Cards List */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-1">
          {participants.length === 0 ? (
            <div className="p-8 text-center text-gray-400 text-xs">
              {isEn ? 'No characters available for rest.' : 'Нет доступных персонажей для отдыха.'}
            </div>
          ) : (
            participants.map((p) => {
              const currentDice = p.hitDiceCurrent;
              const maxDice = p.hitDiceMax;
              const diceType = p.hitDiceType;
              const spent = spentDiceMap[p.id] || 0;
              const recovered = recoveredHpMap[p.id] || 0;
              const rolls = rollHistoryMap[p.id] || [];

              const currentHp = p.currentHp;
              const projectedHp = Math.min(p.maxHp, currentHp + recovered);
              const remainingDice = Math.max(0, currentDice - spent);
              const isFullHp = projectedHp >= p.maxHp;

              return (
                <div
                  key={p.id}
                  className="p-4 rounded-glass-lg bg-[rgba(24,29,40,0.65)] border border-[rgba(255,255,255,0.08)] hover:border-[rgba(255,255,255,0.14)] transition-all flex flex-col gap-3 shadow-sm"
                >
                  {/* Top: Avatar, Name, Class & HP Counter */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="w-9 h-9 rounded-full flex items-center justify-center font-black text-xs text-white shrink-0 shadow-[0_0_10px_rgba(0,0,0,0.5)] border border-white/20"
                        style={{ backgroundColor: p.color }}
                      >
                        {p.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-white truncate">{p.name}</h4>
                          {p.combatantId && (
                            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-blue-950/70 text-blue-300 border border-blue-600/40">
                              {isEn ? 'In combat' : 'В бою'}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-gray-400 truncate">
                          {p.characterClass} • {isEn ? 'Constitution' : 'Телосложение'} {p.conScore} ({p.conMod >= 0 ? `+${p.conMod}` : p.conMod})
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-xs font-mono font-bold text-emerald-400 flex items-center justify-end gap-1">
                        <span>{projectedHp}</span>
                        <span className="text-gray-500 font-normal">/</span>
                        <span>{p.maxHp} {isEn ? 'HP' : 'ОЗ'}</span>
                        {recovered > 0 && (
                          <span className="text-[11px] text-emerald-300 font-bold ml-1">
                            (+{recovered})
                          </span>
                        )}
                      </div>
                      {p.tempHp > 0 && (
                        <span className="text-[10px] font-mono text-cyan-300">
                          +{p.tempHp} {isEn ? 'temp HP' : 'врем. ОЗ'}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* HP Progress Bar */}
                  <div>
                    <HealthBar
                      current={projectedHp}
                      max={p.maxHp}
                      temp={p.tempHp}
                      size="sm"
                    />
                  </div>

                  {/* Hit Dice Controls */}
                  <div className="flex items-center justify-between bg-[rgba(14,18,25,0.7)] p-2.5 rounded-glass border border-[rgba(255,255,255,0.06)] gap-2 flex-wrap text-xs">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400 text-xs font-medium">
                        {isEn ? 'Hit Dice:' : 'Кости хитов:'}
                      </span>
                      <span className="font-mono font-bold text-[#fce79f] bg-black/40 px-2 py-0.5 rounded-glass border border-[#f5b920]/30 shadow-inner">
                        [{diceType}] {remainingDice} / {maxDice}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Manual Roll Button >= 32px */}
                      <button
                        type="button"
                        onClick={() => handleRollHitDie(p)}
                        disabled={remainingDice <= 0 || isFullHp}
                        className="min-h-[34px] px-3.5 py-1.5 rounded-glass bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-500/40 text-xs font-bold flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-[0_0_10px_rgba(245,158,11,0.15)] cursor-pointer"
                        title={isEn ? `Roll 1${diceType} ${p.conMod >= 0 ? `+ ${p.conMod}` : `- ${Math.abs(p.conMod)}`}` : `Бросить 1${diceType} ${p.conMod >= 0 ? `+ ${p.conMod}` : `- ${Math.abs(p.conMod)}`}`}
                      >
                        <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                        <span>
                          {isEn ? `Roll 1${diceType}` : `Бросить 1${diceType}`}
                          {p.conMod >= 0 ? `+${p.conMod}` : p.conMod}
                        </span>
                      </button>

                      {/* Auto-recover button >= 32px */}
                      <button
                        type="button"
                        onClick={() => handleAutoRecover(p)}
                        disabled={remainingDice <= 0 || isFullHp}
                        className="min-h-[34px] px-3 py-1.5 rounded-glass bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/35 text-xs font-bold flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-[0_0_10px_rgba(16,185,129,0.15)] cursor-pointer"
                        title={isEn ? 'Automatically spend hit dice up to max HP' : 'Автоматически потратить кости хитов до максимума ОЗ'}
                      >
                        <HeartPulse className="w-3.5 h-3.5 text-emerald-400" />
                        <span>{isEn ? 'Auto-Heal' : 'Авто-лечение'}</span>
                      </button>

                      {spent > 0 && (
                        <button
                          type="button"
                          onClick={() => handleResetParticipant(p.id)}
                          className="min-h-[34px] min-w-[34px] flex items-center justify-center rounded-glass text-gray-400 hover:text-white hover:bg-white/10 border border-transparent hover:border-white/10 transition-colors cursor-pointer"
                          title={isEn ? 'Reset rolls' : 'Сбросить броски'}
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Rolls info & Abilities recovered notice */}
                  <div className="flex items-center justify-between text-xs text-gray-400 flex-wrap gap-2 pt-0.5">
                    <div>
                      {rolls.length > 0 && (
                        <span className="font-mono text-gray-300 text-[11px]">
                          {isEn ? 'Rolls: ' : 'Броски: '}
                          {rolls
                            .map((r) => `${r}${p.conMod >= 0 ? `+${p.conMod}` : p.conMod}`)
                            .join(', ')}
                        </span>
                      )}
                    </div>

                    {(p.shortRestResources.length > 0 || p.isWarlock) && (
                      <div className="flex items-center gap-1.5 text-[11px] text-emerald-400 font-mono">
                        <Zap className="w-3 h-3 text-emerald-400" />
                        <span>{isEn ? 'Will restore: ' : 'Восстановит: '}</span>
                        <span className="font-semibold text-emerald-300">
                          {[
                            ...p.shortRestResources.map((r) => r.name),
                            ...(p.isWarlock ? [isEn ? 'Pact Magic spell slots' : 'Ячейки магии договора'] : []),
                          ].join(', ')}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between border-t border-[rgba(255,255,255,0.08)] pt-3.5 gap-2">
          <button
            type="button"
            onClick={closeShortRestModal}
            className="min-h-[34px] px-4 py-2 rounded-glass border border-[rgba(255,255,255,0.08)] bg-white/5 hover:bg-white/10 text-xs font-semibold text-gray-300 hover:text-white transition-all cursor-pointer"
          >
            {isEn ? 'Cancel' : 'Отмена'}
          </button>

          <button
            type="button"
            onClick={handleCompleteRest}
            className="min-h-[34px] px-5 py-2 rounded-glass bg-[#f5b920] hover:bg-[#fac742] active:bg-[#e0a312] text-[#0c0d12] font-black text-xs shadow-[0_0_18px_rgba(245,185,32,0.35)] flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Check className="w-4 h-4" />
            <span>{isEn ? 'Finish Short Rest' : 'Завершить короткий отдых'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
export default ShortRestModal;
