import React, { useState, useRef, useEffect } from 'react';
import clsx from 'clsx';
import { Shield, Sparkles, X } from 'lucide-react';
import { Combatant } from '../../types/combat';
import { DamageType, CreatureSize, CREATURE_SIZE_SCALE } from '../../types/dnd5e';
import { useCombatStore } from '../../store/combatStore';
import { broadcastService } from '../../services/broadcastService';
import { audioService } from '../../services/audioService';
import { cleanRussianText } from '../../utils/textUtils';
import { parseActionDetails } from '../../utils/attackParser';
import { usePartyStore } from '../../store/partyStore';
import { useDice3dStore } from '../../store/dice3dStore';
import { useDiceAnimationStore } from '../../store/diceAnimationStore';
import { calculateEffectiveStats } from '../../engine/effectStackEngine';
import {
  CombatantHeader,
  CombatantHealthControls,
  CombatantConditionToggles,
  CombatantConditions,
  CombatantQuickActions,
  CombatantEffectsModal,
} from './combatant';

export interface CombatantCardProps {
  combatant: Combatant;
  isActiveTurn: boolean;
  isInspected: boolean;
}

export function CombatantCard({ combatant, isActiveTurn, isInspected }: CombatantCardProps) {
  const {
    applyDamage,
    applyHealing,
    rollDeathSave,
    removeCondition,
    addCondition,
    toggleReaction,
    toggleConcentration,
    removeCombatant,
    updateCombatant,
    setInspectedCombatantId,
    currentTargetId,
    toggleCurrentTargetId,
    isTargetingMode,
    pendingAttackerId,
    pendingAttackAction,
    executeTargetedStrike,
    nextTurn,
    openTargetedAttack,
    startTargetingMode,
    addDiceLog,
  } = useCombatStore();

  const roundCounter = useCombatStore((s) => s.roundCounter);
  const combatantEffects = useCombatStore((s) => s.activeEffects[combatant.id]) || [];
  const removeEffectFromCombatant = useCombatStore((s) => s.removeEffectFromCombatant);
  const [isEffectsModalOpen, setIsEffectsModalOpen] = useState(false);

  const effectiveStats = calculateEffectiveStats(
    { ac: combatant.ac, speed: combatant.speed },
    combatantEffects
  );

  const [isEditingInit, setIsEditingInit] = useState(false);
  const [tempInit, setTempInit] = useState(String(combatant.initiative));

  // Floating HP Popover state
  const [isHpPopoverOpen, setIsHpPopoverOpen] = useState(false);

  // Floating Combat Numbers (Damage / Heal badge animation)
  interface FloatingCombatNumber {
    id: string;
    text: string;
    isHeal: boolean;
  }
  const [floatingNumbers, setFloatingNumbers] = useState<FloatingCombatNumber[]>([]);
  const prevHpRef = useRef<number>(combatant.hp);
  const isFirstHpMount = useRef<boolean>(true);

  useEffect(() => {
    if (isFirstHpMount.current) {
      isFirstHpMount.current = false;
      prevHpRef.current = combatant.hp;
      return;
    }
    const prev = prevHpRef.current;
    const current = combatant.hp;
    prevHpRef.current = current;

    if (current !== prev) {
      const diff = current - prev;
      const isHeal = diff > 0;
      const newBadge: FloatingCombatNumber = {
        id: crypto.randomUUID(),
        text: isHeal ? `+${diff}` : `-${Math.abs(diff)}`,
        isHeal,
      };
      setFloatingNumbers((prevBadges) => [...prevBadges, newBadge]);

      const timer = setTimeout(() => {
        setFloatingNumbers((prevBadges) => prevBadges.filter((b) => b.id !== newBadge.id));
      }, 1200);

      return () => clearTimeout(timer);
    }
  }, [combatant.hp]);

  const handleSaveInit = () => {
    const val = parseInt(tempInit, 10);
    if (!isNaN(val)) {
      updateCombatant(combatant.id, { initiative: val });
    }
    setIsEditingInit(false);
  };

  const isDead = combatant.isDead;
  const isDying = combatant.hp <= 0 && !isDead;
  const isTarget = currentTargetId === combatant.id;
  const deathSaves = combatant.deathSaves || { successes: 0, failures: 0 };

  // HP actions
  const handleDamage = (e: React.MouseEvent, amount: number) => {
    e.stopPropagation();
    applyDamage(combatant.id, [{ amount, type: 'Slashing' as DamageType }]);
  };

  const handleHeal = (e: React.MouseEvent, amount: number) => {
    e.stopPropagation();
    applyHealing(combatant.id, amount);
  };

  const handleApplyCustom = (mode?: 'damage' | 'heal', customVal?: string) => {
    const raw = (customVal || '').trim();
    if (!raw) return;
    const val = parseInt(raw, 10);
    if (isNaN(val) || val === 0) return;

    if (mode === 'heal' || (!mode && raw.startsWith('+'))) {
      applyHealing(combatant.id, Math.abs(val));
    } else {
      applyDamage(combatant.id, [{ amount: Math.abs(val), type: 'Slashing' as DamageType }]);
    }
  };

  const handleRollDeathSave = (e: React.MouseEvent) => {
    e.stopPropagation();
    const res = rollDeathSave(combatant.id);
    if (res) {
      const isSecret = useDice3dStore.getState().isSecretRoll;
      useDiceAnimationStore.getState().triggerRoll({
        title: `${cleanRussianText(combatant.nameRu || combatant.name)}: Спасбросок от смерти`,
        subtitle: res.revived ? 'Встал с 1 ОЗ!' : res.isDead ? 'Смерть персонажа' : res.successesAdded > 0 ? 'Успех' : 'Провал',
        sides: 20,
        r1: res.roll,
        kept: res.roll,
        modifier: 0,
        total: res.roll,
        mode: 'normal',
        isNat20: res.roll === 20,
        isNat1: res.roll === 1,
        rollerName: cleanRussianText(combatant.nameRu || combatant.name),
      });

      if (useDice3dStore.getState().is3dEnabled) {
        useDice3dStore.getState().rollDice3d({
          dice: [{ sides: 20, result: res.roll }],
          title: `${cleanRussianText(combatant.nameRu || combatant.name)}: Спасбросок от смерти`,
          total: res.roll,
          isSecret,
        });
      }
      if (!isSecret) {
        broadcastService.send({
          type: 'BROADCAST_ROLL',
          payload: {
            id: crypto.randomUUID(),
            title: `${cleanRussianText(combatant.nameRu || combatant.name)}: Спасбросок от смерти`,
            formula: '1d20',
            resultDisplay: `d20: ${res.roll} (${res.revived ? 'Встал с 1 ОЗ!' : res.isDead ? 'Смерть' : res.successesAdded > 0 ? 'Успех' : 'Провал'})`,
            total: res.roll,
            isCritical: res.roll === 20,
            isCriticalMiss: res.roll === 1,
            timestamp: Date.now(),
            dice3d: [{ sides: 20, result: res.roll }],
          },
        });
      }
    }
  };

  const handleQuickSaveRoll = (_statName: string, nameRu: string, bonus: number) => {
    const d20 = Math.floor(Math.random() * 20) + 1;
    const total = d20 + bonus;
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const isSecret = useDice3dStore.getState().isSecretRoll;

    audioService.playDiceRoll();

    addDiceLog({
      id: crypto.randomUUID(),
      timestamp: timeStr,
      combatantName: isSecret ? `[Скрытно] ${cleanRussianText(combatant.nameRu || combatant.name)}` : cleanRussianText(combatant.nameRu || combatant.name),
      actionName: `${isSecret ? '[Скрытно] ' : ''}Спасбросок (${nameRu})`,
      attackRoll: {
        d20,
        modifier: bonus,
        total,
        isNat20: d20 === 20,
        isNat1: d20 === 1,
      },
      note: `Спасбросок ${nameRu}: d20(${d20}) ${bonus >= 0 ? `+${bonus}` : bonus} = ${total}`,
    });

    useDiceAnimationStore.getState().triggerRoll({
      title: `${cleanRussianText(combatant.nameRu || combatant.name)}: Спасбросок ${nameRu}`,
      subtitle: `Спасбросок (${nameRu})`,
      sides: 20,
      r1: d20,
      kept: d20,
      modifier: bonus,
      total,
      mode: 'normal',
      isNat20: d20 === 20,
      isNat1: d20 === 1,
      rollerName: cleanRussianText(combatant.nameRu || combatant.name),
    });

    if (useDice3dStore.getState().is3dEnabled) {
      useDice3dStore.getState().rollDice3d({
        dice: [{ sides: 20, result: d20 }],
        title: `${cleanRussianText(combatant.nameRu || combatant.name)}: Спасбросок ${nameRu}`,
        total,
        isSecret,
      });
    }

    if (!isSecret) {
      broadcastService.send({
        type: 'BROADCAST_ROLL',
        payload: {
          id: crypto.randomUUID(),
          title: `${cleanRussianText(combatant.nameRu || combatant.name)}: Спасбросок ${nameRu}`,
          formula: `1d20 ${bonus >= 0 ? `+ ${bonus}` : `- ${Math.abs(bonus)}`}`,
          resultDisplay: `${total} [d20: ${d20}]`,
          total,
          isCritical: d20 === 20,
          isCriticalMiss: d20 === 1,
          timestamp: Date.now(),
          dice3d: [{ sides: 20, result: d20 }],
        },
      });
    }
  };

  // Clean subtitle for combatant (CR / Level) - Never display English "Player (Lvl...)"
  const getCombatantSubtitle = () => {
    if (combatant.isPlayer) {
      const raw = (combatant.cr || combatant.statblock?.cr || '').trim();
      const lvlMatch = raw.match(/(?:lvl|ур\.?|уровень)\s*(\d+)/i);
      if (lvlMatch) {
        return `Игрок (Ур. ${lvlMatch[1]})`;
      }
      const party = usePartyStore.getState();
      const pMember = party.members.find(
        (m) =>
          m.name.toLowerCase() === (combatant.nameRu || combatant.name).toLowerCase() ||
          m.name.toLowerCase() === combatant.name.toLowerCase()
      );
      if (pMember?.level) {
        return `Игрок (Ур. ${pMember.level})`;
      }
      return 'Игрок (Ур. 5)';
    }
    const rawCr = (combatant.cr || combatant.statblock?.cr || '').trim();
    if (rawCr) {
      if (/player/i.test(rawCr)) {
        const lvlMatch = rawCr.match(/(?:lvl|ур\.?|уровень)\s*(\d+)/i);
        return lvlMatch ? `Игрок (Ур. ${lvlMatch[1]})` : 'Игрок';
      }
      const cleanCr = rawCr.replace(/^cr\s*/i, '').trim();
      return `КО ${cleanCr}`;
    }
    return null;
  };

  const subtitle = getCombatantSubtitle();

  return (
    <div
      onClick={() => {
        if (isTargetingMode && pendingAttackerId && pendingAttackAction) {
          executeTargetedStrike(pendingAttackerId, combatant.id, pendingAttackAction);
          return;
        }
        setInspectedCombatantId(combatant.id);
      }}
      onContextMenu={(e) => {
        e.preventDefault();
        toggleCurrentTargetId(combatant.id);
      }}
      className={clsx(
        'group relative flex flex-col justify-center rounded-glass-lg border transition-all select-none cursor-pointer mb-2 px-3 py-2 min-h-[50px]',
        isHpPopoverOpen && 'z-50 relative',
        isActiveTurn
          ? 'border-[#f5b920] bg-[rgba(26,32,45,0.95)] ring-2 ring-[#f5b920]/70 shadow-[0_0_24px_rgba(245,185,32,0.35)] animate-cinematic-gold-pulse'
          : isTarget
          ? 'border-red-500 border-l-4 border-l-red-500 bg-red-950/40 ring-1 ring-red-500/60 shadow-lg'
          : isInspected
          ? 'border-[#f5b920]/60 border-l-4 border-l-[#f5b920] bg-[rgba(26,32,46,0.9)] ring-1 ring-[#f5b920]/30'
          : 'border-[rgba(255,255,255,0.08)] bg-[rgba(20,24,34,0.7)] backdrop-blur-md hover:bg-[rgba(26,32,46,0.85)] hover:border-[rgba(255,255,255,0.18)] shadow-md',
        isTargetingMode && 'hover:border-red-500/80 hover:bg-red-950/20 cursor-crosshair',
        isDying && 'border-red-500/60 bg-red-950/30',
        isDead && 'opacity-60 border-gray-800 bg-black/60'
      )}
    >
      {/* Анимация всплывающих боевых чисел (+8 зелёный, -14 красный) */}
      {floatingNumbers.map((fn) => (
        <div
          key={fn.id}
          className={clsx(
            'animate-floating-combat-number pointer-events-none absolute right-24 -top-2.5 font-mono font-black text-xs sm:text-sm z-50 select-none px-2.5 py-0.5 rounded-full border shadow-2xl tracking-wide',
            fn.isHeal
              ? 'bg-emerald-950 text-emerald-400 border-emerald-500 shadow-[0_0_14px_rgba(16,185,129,0.7)]'
              : 'bg-red-950 text-rose-300 border-rose-500 shadow-[0_0_14px_rgba(244,63,94,0.7)]'
          )}
        >
          {fn.text}
        </div>
      ))}

      {/* 2-Tier Responsive Layout for Cards: Eliminates Overlapping in Split view (360px-500px) */}
      <div className="flex flex-col gap-1.5 w-full min-w-0">
        <CombatantHeader
          combatant={combatant}
          isActiveTurn={isActiveTurn}
          isTarget={isTarget}
          isEditingInit={isEditingInit}
          tempInit={tempInit}
          setTempInit={setTempInit}
          onSaveInit={handleSaveInit}
          onStartEditingInit={() => {
            setIsEditingInit(true);
            setTempInit(String(combatant.initiative));
          }}
          onCancelEditingInit={() => setIsEditingInit(false)}
          onToggleTarget={() => toggleCurrentTargetId(combatant.id)}
          onShowcase={() => {
            broadcastService.send({
              type: 'BROADCAST_NPC_SHOWCASE',
              payload: {
                id: combatant.id,
                name: cleanRussianText(combatant.nameRu || combatant.name),
                nameRu: combatant.nameRu ? cleanRussianText(combatant.nameRu) : undefined,
                avatarUrl: combatant.tokenUrl,
                creatureType: cleanRussianText(combatant.creatureType),
                notes: combatant.statblock?.senses || combatant.speed,
                timestamp: Date.now(),
              },
            });
          }}
          onRemove={() => removeCombatant(combatant.id)}
        />

        {/* Tier 2 (Bottom Tier): [КО / Игрок] [🛡️ КД] [1×1 Сетка] [Скорость] ... [HealthBar with ОЗ] [🛡️ Реакция] [⚡ Концентрация] [+ Состояние] */}
        <div className="pt-1 border-t border-[rgba(255,255,255,0.06)] flex items-center justify-between gap-2 min-w-0">
          {/* Слева: Защита и параметры (КО/Игрок, КД, Размер, Скорость) */}
          <div className="flex items-center gap-1.5 text-[10px] text-gray-400 font-mono min-w-0 flex-1 overflow-hidden">
            {subtitle && (
              <span
                className={clsx(
                  'font-bold flex-shrink-0 whitespace-nowrap',
                  combatant.isPlayer ? 'text-emerald-400/90 font-sans' : 'text-amber-300/90'
                )}
                title={combatant.isPlayer ? 'Персонаж игрока' : 'Класс Опасности (CR)'}
              >
                {subtitle}
              </span>
            )}

            {/* КД со значком щита (неразрушающий динамический расчет) */}
            <span
              className="inline-flex items-center gap-1 text-gray-200 bg-[#161d22] px-1.5 py-0.5 rounded border border-[#374450]/80 shadow-sm flex-shrink-0 leading-none whitespace-nowrap"
              title={`Класс Доспеха (КД): ${effectiveStats.effectiveAc}${effectiveStats.acBonus !== 0 ? ` (Базовый: ${combatant.ac}, Модификатор: ${effectiveStats.acBonus > 0 ? `+${effectiveStats.acBonus}` : effectiveStats.acBonus})` : ''}`}
            >
              <Shield className="h-2.5 w-2.5 text-gold flex-shrink-0" />
              <strong
                className={clsx(
                  'leading-none',
                  effectiveStats.acBonus > 0
                    ? 'text-emerald-400 font-bold'
                    : effectiveStats.acBonus < 0
                    ? 'text-red-400 font-bold'
                    : 'text-white'
                )}
              >
                {effectiveStats.effectiveAc}
              </strong>
              {effectiveStats.acBonus !== 0 && (
                <span
                  className={clsx(
                    'text-[9px] font-mono leading-none',
                    effectiveStats.acBonus > 0 ? 'text-emerald-300' : 'text-red-300'
                  )}
                >
                  ({effectiveStats.acBonus > 0 ? `+${effectiveStats.acBonus}` : effectiveStats.acBonus})
                </span>
              )}
            </span>

            {/* Кнопка стека эффектов и аур */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsEffectsModalOpen(true);
              }}
              className={clsx(
                'inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[9px] font-mono transition-colors flex-shrink-0 leading-none cursor-pointer',
                combatantEffects.length > 0
                  ? 'bg-purple-950/80 border-purple-500/80 text-purple-200 font-bold shadow-sm'
                  : 'bg-[#161d22] border-[#374450]/80 text-gray-300 hover:text-white hover:border-gold/60'
              )}
              title="Эффекты и ауры: кликните для наложения пресетов или создания эффекта"
            >
              <Sparkles className="h-2.5 w-2.5 text-purple-400 flex-shrink-0" />
              <span>Эффекты</span>
              {combatantEffects.length > 0 && (
                <span className="px-1 py-0.2 rounded-full bg-purple-500/30 text-purple-200 text-[8px] font-bold">
                  {combatantEffects.length}
                </span>
              )}
            </button>

            {/* Выбор размера сетки (1x1, 2x2, ...) */}
            <div
              className="relative inline-flex items-center flex-shrink-0"
              onClick={(e) => e.stopPropagation()}
            >
              <select
                value={combatant.size || 'Medium'}
                onChange={(e) => {
                  const newSize = e.target.value as CreatureSize;
                  updateCombatant(combatant.id, {
                    size: newSize,
                    tokenScale: CREATURE_SIZE_SCALE[newSize] || 1.0,
                  });
                }}
                title="Размер существа и сетка токена: Medium (1x1), Large (2x2), Huge (3x3), Gargantuan (4x4)"
                className="bg-[#161d22] text-gold-light hover:text-white border border-[#374450]/80 hover:border-gold/60 rounded px-1 py-0.5 text-[9px] font-mono font-bold cursor-pointer outline-none transition-colors leading-none"
              >
                <option value="Medium" className="bg-[#141b21] text-gray-200">1×1</option>
                <option value="Large" className="bg-[#141b21] text-gray-200">2×2</option>
                <option value="Huge" className="bg-[#141b21] text-gray-200">3×3</option>
                <option value="Gargantuan" className="bg-[#141b21] text-gray-200">4×4</option>
              </select>
            </div>

            {/* Скорость */}
            {combatant.speed && (
              <span
                className="text-gray-400 truncate font-sans max-w-[70px] sm:max-w-[100px] leading-tight flex-shrink min-w-0"
                title={`Скорость: ${combatant.speed}`}
              >
                {combatant.speed}
              </span>
            )}
          </div>

          {/* Справа: HealthBar (80-96px) + Реакция + Концентрация + Добавить состояние */}
          <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
            <CombatantHealthControls
              combatant={combatant}
              isDying={isDying}
              deathSaves={deathSaves}
              onRollDeathSave={handleRollDeathSave}
              onDamage={handleDamage}
              onHeal={handleHeal}
              onApplyCustom={handleApplyCustom}
              isHpPopoverOpen={isHpPopoverOpen}
              setIsHpPopoverOpen={setIsHpPopoverOpen}
            />

            <CombatantConditionToggles
              combatant={combatant}
              roundCounter={roundCounter}
              onToggleReaction={() => toggleReaction(combatant.id)}
              onToggleConcentration={() => toggleConcentration(combatant.id)}
              onAddCondition={(cond) => addCondition(combatant.id, cond)}
            />
          </div>
        </div>
      </div>

      {/* Активные быстрые действия в текущий ход («Ход» - primary, остальные - ghost) */}
      {isActiveTurn && (
        <CombatantQuickActions
          combatant={combatant}
          onAttack={() => {
            setInspectedCombatantId(combatant.id);
            const actions = combatant.statblock?.actions;
            if (actions && actions.length > 0) {
              const firstAtk = actions.find((a: any) => {
                const details = parseActionDetails(a);
                return details.attackBonus !== null || details.damageFormula !== null;
              }) || actions[0];
              if (currentTargetId) {
                executeTargetedStrike(combatant.id, currentTargetId, firstAtk);
              } else {
                startTargetingMode(combatant.id, firstAtk, `Выберите цель для «${cleanRussianText(firstAtk.name)}»`);
              }
            } else {
              openTargetedAttack(combatant.id);
            }
          }}
          onToggleHpPopover={() => setIsHpPopoverOpen((prev) => !prev)}
          onRollSave={handleQuickSaveRoll}
          onNextTurn={nextTurn}
        />
      )}

      {/* Conditions Row: ONLY rendered if conditions exist (0px if empty) */}
      <CombatantConditions
        combatant={combatant}
        onRemoveCondition={(type) => removeCondition(combatant.id, type)}
      />

      {/* Active Effects Badges Row */}
      {combatantEffects.length > 0 && (
        <div className="flex flex-wrap items-center gap-1 mt-1 pt-1 border-t border-[rgba(255,255,255,0.06)]">
          {combatantEffects.map((eff) => (
            <div
              key={eff.id}
              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-purple-950/60 border border-purple-700/60 text-purple-200 text-[10px] font-mono shadow-sm"
              onClick={(e) => {
                e.stopPropagation();
                setIsEffectsModalOpen(true);
              }}
              title={eff.description || eff.name}
            >
              <Sparkles className="h-2.5 w-2.5 text-purple-400 flex-shrink-0" />
              <span className="font-semibold font-sans truncate max-w-[110px]">{eff.name}</span>
              {eff.modifiers?.acBonus && (
                <span className="text-emerald-400 font-bold">
                  {eff.modifiers.acBonus > 0 ? `+${eff.modifiers.acBonus}` : eff.modifiers.acBonus} КД
                </span>
              )}
              {eff.aura?.enabled && (
                <span className="text-amber-300">
                  Аура {eff.aura.radiusFeet} фт.
                </span>
              )}
              <span className="text-gray-400 text-[9px]">
                {eff.durationRounds === 'permanent' ? 'Пост.' : `${eff.durationRounds} р.`}
              </span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  removeEffectFromCombatant(combatant.id, eff.id);
                }}
                className="text-gray-400 hover:text-white p-0.5 ml-0.5"
                title="Снять эффект"
              >
                <X className="h-2.5 w-2.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Effects & Auras Modal */}
      <CombatantEffectsModal
        combatant={combatant}
        isOpen={isEffectsModalOpen}
        onClose={() => setIsEffectsModalOpen(false)}
      />
    </div>
  );
}
