import React from 'react';
import clsx from 'clsx';
import {
  Dices,
  Shield,
  Swords,
  X,
  Zap,
  Sparkles,
} from 'lucide-react';
import { useCombatStore } from '../../store/combatStore';
import { usePartyStore } from '../../store/partyStore';
import { MASTERY_SPECS } from '../ui/MasteryBadge';
import { broadcastService } from '../../services/broadcastService';
import { audioService } from '../../services/audioService';
import { useDice3dStore } from '../../store/dice3dStore';
import { useDiceAnimationStore } from '../../store/diceAnimationStore';
import { cleanRussianText, localizeStat } from '../../utils/textUtils';
import { useTranslation } from '../../i18n';
import { PlayerActionResultPanel } from './PlayerActionResultPanel';
import { dbService } from '../../services/dbService';
import { ParsedSpell } from '../../types/database';
import { CreatureSize, CREATURE_SIZE_SCALE } from '../../types/dnd5e';
import {
  StatblockHeader,
  StatblockSurvival,
  StatblockAbilities,
  StatblockSavingThrows,
  StatblockDefenses,
  StatblockActions,
  StatblockSpells,
  SpellDetailsModal,
  renderTextWithSpellBadges,
  AbilityStat,
  SaveStat,
} from './statblock';

export function TaperedRule({ className }: { className?: string }) {
  return (
    <div className={clsx("relative flex items-center justify-center my-2", className)}>
      <div className="ddb-tapered-rule w-full opacity-90" />
      <span className="absolute px-1 bg-surface text-gold flex items-center justify-center select-none">
        <Sparkles className="h-2.5 w-2.5 text-gold inline" />
      </span>
    </div>
  );
}

export function StatblockInspector() {
  const {
    combatants,
    inspectedCombatantId,
    diceLog,
    clearDiceLog,
    openTargetedAttack,
    currentTargetId,
    setCurrentTargetId,
    startTargetingMode,
    cancelTargetingMode,
    executeTargetedStrike,
    executeMultiattackSeries,
    attackAdvantageMode,
    setAttackAdvantageMode,
    toggleConcentration,
    addCondition,
    updateCombatant,
    addDiceLog,
  } = useCombatStore();
  const { language } = useTranslation();
  const isEn = language === 'en';

  const combatant = combatants.find((c) => c.id === inspectedCombatantId) || null;
  const currentTarget = combatants.find((c) => c.id === currentTargetId) || null;
  const sb = combatant?.statblock;

  // Active inline target picker state
  const [activeTargetingActionKey, setActiveTargetingActionKey] = React.useState<string | null>(null);

  // Active roll toast notification state
  interface RollToast {
    id: string;
    title: string;
    details: string;
    total: number;
    isNat20?: boolean;
    isNat1?: boolean;
  }
  const [activeRollToast, setActiveRollToast] = React.useState<RollToast | null>(null);

  React.useEffect(() => {
    if (!activeRollToast) return;
    const timer = setTimeout(() => {
      setActiveRollToast(null);
    }, 4000);
    return () => clearTimeout(timer);
  }, [activeRollToast]);

  // Spell popup viewer state
  const [inspectedSpell, setInspectedSpell] = React.useState<ParsedSpell | null>(null);
  const [, setIsLoadingSpell] = React.useState(false);

  const handleInspectSpell = async (spellName: string) => {
    setIsLoadingSpell(true);
    try {
      const results = await dbService.searchSpells(spellName, undefined, undefined, 5);
      if (results && results.length > 0) {
        const match =
          results.find(
            (s) =>
              s.name_ru?.toLowerCase() === spellName.toLowerCase() ||
              s.name_en?.toLowerCase() === spellName.toLowerCase()
          ) || results[0];
        setInspectedSpell(match);
      } else {
        setInspectedSpell({
          id: `spell-${spellName}`,
          name_ru: spellName,
          name_en: spellName,
          level: 1,
          school: 'Evocation',
          school_ru: 'Воплощение',
          casting_time: '1 действие',
          range: '60 фт.',
          duration: 'Мгновенная',
          description_ru: 'Информация о заклинании доступна в книге правил D&D 2024.',
        } as any);
      }
    } catch (err) {
      console.warn('Error searching spell:', err);
    } finally {
      setIsLoadingSpell(false);
    }
  };

  // Living targets from combatants
  const livingTargets = React.useMemo(() => {
    if (!combatant) return [];
    return combatants
      .filter((c) => c.id !== combatant.id && !c.isDead && c.hp > 0)
      .sort((a, b) => {
        // Priority: opposing faction first
        const aEnemy = combatant.isPlayer ? !a.isPlayer : a.isPlayer;
        const bEnemy = combatant.isPlayer ? !b.isPlayer : b.isPlayer;
        if (aEnemy && !bEnemy) return -1;
        if (!aEnemy && bEnemy) return 1;
        // Current locked target first
        if (a.id === currentTargetId) return -1;
        if (b.id === currentTargetId) return 1;
        return 0;
      });
  }, [combatants, combatant, currentTargetId]);

  const handleToggleTargetPicker = (actionKey: string, action: any, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!combatant) return;

    if (activeTargetingActionKey === actionKey) {
      setActiveTargetingActionKey(null);
      cancelTargetingMode();
    } else {
      setActiveTargetingActionKey(actionKey);
      const actionTitle = isEn ? (action?.name || 'Attack') : cleanRussianText(action?.name || 'Атака');
      startTargetingMode(combatant.id, action, isEn ? `Select target for "${actionTitle}"` : `Выберите цель для «${actionTitle}»`);
    }
  };

  const handleSelectInlineTarget = (targetId: string, action: any, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!combatant) return;

    if (action?._isMultiattack) {
      executeMultiattackSeries(combatant.id, targetId);
    } else {
      executeTargetedStrike(combatant.id, targetId, action, attackAdvantageMode);
    }

    setActiveTargetingActionKey(null);
    cancelTargetingMode();
  };

  // Attack execution: strikes locked target or toggles inline target picker
  const handlePerformAttack = (action: any, actionKey: string = 'action-default', e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!combatant) return;

    if (currentTargetId) {
      executeTargetedStrike(combatant.id, currentTargetId, action, attackAdvantageMode);
    } else {
      handleToggleTargetPicker(actionKey, action, e);
    }
  };

  // Roll / strike execution from attack buttons
  const executeActionRoll = (action: any, actionKey: string = 'action-default', e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!combatant) return;

    handlePerformAttack(action, actionKey, e);
  };

  // Characteristics scores (STR, DEX, CON, INT, WIS, CHA)
  const stats: AbilityStat[] = React.useMemo(() => [
    { label: localizeStat('str', false, language), key: 'str', fullRu: localizeStat('str', true, language), score: sb?.str ?? 10 },
    { label: localizeStat('dex', false, language), key: 'dex', fullRu: localizeStat('dex', true, language), score: sb?.dex ?? 10 },
    { label: localizeStat('con', false, language), key: 'con', fullRu: localizeStat('con', true, language), score: sb?.con ?? 10 },
    { label: localizeStat('intellect', false, language), key: 'intellect', fullRu: localizeStat('intellect', true, language), score: sb?.intellect ?? 10 },
    { label: localizeStat('wis', false, language), key: 'wis', fullRu: localizeStat('wis', true, language), score: sb?.wis ?? 10 },
    { label: localizeStat('cha', false, language), key: 'cha', fullRu: localizeStat('cha', true, language), score: sb?.cha ?? 10 },
  ], [sb, language]);

  const allSaves: SaveStat[] = React.useMemo(() => {
    return stats.map((st) => {
      const explicitSave =
        sb?.saves?.[st.key.toUpperCase()] ??
        sb?.saves?.[st.key] ??
        sb?.saves?.[st.label] ??
        sb?.saves?.[st.label.toUpperCase()] ??
        (st.key === 'wis' ? (sb?.saves?.['WIS'] ?? sb?.saves?.['МДР'] ?? sb?.saves?.['МУД']) : undefined);
      const mod = Math.floor((st.score - 10) / 2);
      const bonus = explicitSave !== undefined ? Number(explicitSave) : mod;
      const isProficient = explicitSave !== undefined;
      return {
        stat: st.key,
        nameRu: st.label,
        fullName: st.fullRu,
        bonus,
        isProficient,
      };
    });
  }, [sb, stats]);

  const handleRollAbilityScore = (st: AbilityStat) => {
    if (!combatant) return;
    const d20 = Math.floor(Math.random() * 20) + 1;
    const mod = Math.floor((st.score - 10) / 2);
    const total = d20 + mod;
    const isNat20 = d20 === 20;
    const isNat1 = d20 === 1;
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const isSecret = useDice3dStore.getState().isSecretRoll;
    const is3d = useDice3dStore.getState().is3dEnabled;

    audioService.playDiceRoll();

    const rollerName = isEn
      ? (combatant.name || combatant.nameRu)
      : cleanRussianText(combatant.nameRu || combatant.name);

    const secretPrefix = isSecret ? (isEn ? '[Secret] ' : '[Скрытно] ') : '';
    const checkActionName = `${secretPrefix}${isEn ? 'Check' : 'Проверка'}: ${st.fullRu} (${st.label})`;
    const critTag = isNat20 ? (isEn ? ' (CRIT 20!)' : ' (КРИТ 20!)') : isNat1 ? (isEn ? ' (FUMBLE 1!)' : ' (ПРОВАЛ 1!)') : '';

    addDiceLog({
      id: crypto.randomUUID(),
      timestamp: timeStr,
      combatantName: `${secretPrefix}${rollerName}`,
      actionName: checkActionName,
      attackRoll: {
        d20,
        modifier: mod,
        total,
        isNat20,
        isNat1,
      },
      note: `${isEn ? 'Check' : 'Проверка'}: ${st.fullRu} — d20(${d20}) ${mod >= 0 ? `+${mod}` : mod} = ${total}${critTag}`,
    });

    useDiceAnimationStore.getState().triggerRoll({
      title: isEn ? `${rollerName}: Check ${st.fullRu}` : `${rollerName}: Проверка ${st.fullRu}`,
      subtitle: isEn ? `Ability ${st.label}` : `Характеристика ${st.label}`,
      sides: 20,
      r1: d20,
      kept: d20,
      modifier: mod,
      total,
      mode: 'normal',
      isNat20,
      isNat1,
      rollerName,
    });

    if (is3d) {
      useDice3dStore.getState().rollDice3d({
        dice: [{ sides: 20, result: d20 }],
        title: isEn ? `${rollerName}: Check ${st.fullRu}` : `${rollerName}: Проверка ${st.fullRu}`,
        total,
        isSecret,
      });
    }

    if (!isSecret) {
      broadcastService.send({
        type: 'BROADCAST_ROLL',
        payload: {
          id: crypto.randomUUID(),
          title: isEn ? `${rollerName}: Check ${st.fullRu}` : `${rollerName}: Проверка ${st.fullRu}`,
          formula: `1d20 ${mod >= 0 ? `+ ${mod}` : `- ${Math.abs(mod)}`}`,
          resultDisplay: `${total} [d20: ${d20}]`,
          total,
          isCritical: isNat20,
          isCriticalMiss: isNat1,
          timestamp: Date.now(),
          dice3d: [{ sides: 20, result: d20 }],
        },
      });
    }

    setActiveRollToast({
      id: crypto.randomUUID(),
      title: isEn ? `Check: ${st.fullRu}` : `Проверка: ${st.fullRu}`,
      details: `1d20 (${d20}) ${mod >= 0 ? `+ ${mod}` : `- ${Math.abs(mod)}`} = ${total}`,
      total,
      isNat20,
      isNat1,
    });
  };

  const handleRollSavingThrow = (_saveStat: string, saveNameRu: string, saveBonus: number, fullName: string) => {
    if (!combatant) return;
    const d20 = Math.floor(Math.random() * 20) + 1;
    const total = d20 + saveBonus;
    const isNat20 = d20 === 20;
    const isNat1 = d20 === 1;
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const isSecret = useDice3dStore.getState().isSecretRoll;
    const is3d = useDice3dStore.getState().is3dEnabled;

    audioService.playDiceRoll();

    const rollerName = isEn
      ? (combatant.name || combatant.nameRu)
      : cleanRussianText(combatant.nameRu || combatant.name);

    const secretPrefix = isSecret ? (isEn ? '[Secret] ' : '[Скрытно] ') : '';
    const saveActionName = `${secretPrefix}${isEn ? 'Saving Throw' : 'Спасбросок'}: ${fullName} (${saveNameRu})`;
    const critTag = isNat20 ? (isEn ? ' (CRIT 20!)' : ' (КРИТ 20!)') : isNat1 ? (isEn ? ' (FUMBLE 1!)' : ' (ПРОВАЛ 1!)') : '';

    addDiceLog({
      id: crypto.randomUUID(),
      timestamp: timeStr,
      combatantName: `${secretPrefix}${rollerName}`,
      actionName: saveActionName,
      attackRoll: {
        d20,
        modifier: saveBonus,
        total,
        isNat20,
        isNat1,
      },
      note: `${isEn ? 'Saving Throw' : 'Спасбросок'}: ${fullName} — d20(${d20}) ${saveBonus >= 0 ? `+${saveBonus}` : saveBonus} = ${total}${critTag}`,
    });

    useDiceAnimationStore.getState().triggerRoll({
      title: isEn ? `${rollerName}: Save ${fullName}` : `${rollerName}: Спасбросок ${fullName}`,
      subtitle: isEn ? `Saving Throw (${saveNameRu})` : `Спасбросок (${saveNameRu})`,
      sides: 20,
      r1: d20,
      kept: d20,
      modifier: saveBonus,
      total,
      mode: 'normal',
      isNat20,
      isNat1,
      rollerName,
    });

    if (is3d) {
      useDice3dStore.getState().rollDice3d({
        dice: [{ sides: 20, result: d20 }],
        title: isEn ? `${rollerName}: Save ${fullName}` : `${rollerName}: Спасбросок ${fullName}`,
        total,
        isSecret,
      });
    }

    if (!isSecret) {
      broadcastService.send({
        type: 'BROADCAST_ROLL',
        payload: {
          id: crypto.randomUUID(),
          title: isEn ? `${rollerName}: Save ${fullName}` : `${rollerName}: Спасбросок ${fullName}`,
          formula: `1d20 ${saveBonus >= 0 ? `+ ${saveBonus}` : `- ${Math.abs(saveBonus)}`}`,
          resultDisplay: `${total} [d20: ${d20}]`,
          total,
          isCritical: isNat20,
          isCriticalMiss: isNat1,
          timestamp: Date.now(),
          dice3d: [{ sides: 20, result: d20 }],
        },
      });
    }

    setActiveRollToast({
      id: crypto.randomUUID(),
      title: isEn ? `Save: ${fullName}` : `Спасбросок: ${fullName}`,
      details: `1d20 (${d20}) ${saveBonus >= 0 ? `+ ${saveBonus}` : `- ${Math.abs(saveBonus)}`} = ${total}`,
      total,
      isNat20,
      isNat1,
    });
  };

  // Spell slots calculation and interaction
  const spellSlotsData: Record<number, { max: number; used: number }> | null = React.useMemo(() => {
    if (!combatant) return null;
    if (combatant.spellSlots && Object.keys(combatant.spellSlots).length > 0) {
      return combatant.spellSlots;
    }
    if (combatant.isPlayer) {
      const pMember = usePartyStore.getState().members.find(
        (m) => m.name.toLowerCase() === (combatant.nameRu || combatant.name).toLowerCase()
      );
      if (pMember?.spellSlots) {
        return pMember.spellSlots;
      }
    }
    if (sb?.spells && sb.spells.length > 0) {
      const slots: Record<number, { max: number; used: number }> = {};
      const traitText = sb.traits?.map((t) => `${t.name} ${t.desc}`).join(' ') || '';
      for (let lvl = 1; lvl <= 9; lvl++) {
        const regex = new RegExp(`${lvl}\\s*(?:круг|уровень)[^:]*:\\s*(\\d+)\\s*яче`, 'i');
        const match = traitText.match(regex);
        if (match) {
          slots[lvl] = { max: parseInt(match[1], 10), used: 0 };
        }
      }
      if (Object.keys(slots).length > 0) return slots;
      const maxSpellLvl = Math.max(...sb.spells.map((s: any) => typeof s === 'object' ? (s.level || 0) : 0), 0);
      if (maxSpellLvl > 0) {
        for (let l = 1; l <= Math.min(maxSpellLvl, 9); l++) {
          slots[l] = { max: l === 1 ? 4 : l <= 3 ? 3 : l <= 5 ? 2 : 1, used: 0 };
        }
        return slots;
      }
    }
    return null;
  }, [combatant, sb]);

  const handleToggleSpellSlot = (level: number, slotIndex: number) => {
    if (!combatant) return;
    const currentSlots = spellSlotsData ? { ...spellSlotsData } : {};
    const levelSlot = currentSlots[level] || { max: 1, used: 0 };
    const newUsed = slotIndex < levelSlot.used ? slotIndex : slotIndex + 1;
    currentSlots[level] = {
      ...levelSlot,
      used: Math.max(0, Math.min(levelSlot.max, newUsed)),
    };
    updateCombatant(combatant.id, { spellSlots: currentSlots });
    audioService.playSfx('magic');
  };

  const handleRestoreAllSpellSlots = () => {
    if (!combatant || !spellSlotsData) return;
    const restored: Record<number, { max: number; used: number }> = {};
    Object.entries(spellSlotsData).forEach(([lvl, data]) => {
      restored[Number(lvl)] = { ...data, used: 0 };
    });
    updateCombatant(combatant.id, { spellSlots: restored });
    audioService.playSfx('magic');
  };

  const executeMultiattack = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!combatant || !sb?.actions) return;

    const multiattackAction = sb?.actions?.find((a: any) =>
      /мультиатака|multiattack/i.test(a.name)
    );
    if (!multiattackAction) return;

    if (currentTargetId) {
      executeMultiattackSeries(combatant.id, currentTargetId);
    } else {
      const multiattackActionRef = {
        ...multiattackAction,
        _isMultiattack: true,
        name: isEn ? 'Multiattack Series' : 'Серия мультиатаки',
      };
      handleToggleTargetPicker('multiattack', multiattackActionRef, e);
    }
  };

  if (!combatant) {
    return (
      <aside className="w-full h-full flex flex-col bg-surface/80 backdrop-blur-md p-6 select-none overflow-y-auto items-center justify-center text-center flex-shrink-0">
        <div className="relative mb-3 flex items-center justify-center w-16 h-16 rounded-glass-xl bg-card border border-gold/40 shadow-gold-glow">
          <Shield className="h-8 w-8 text-crimson fill-crimson/20" />
          <Swords className="h-5 w-5 text-gold absolute" />
        </div>
        <h3 className="tracking-wider uppercase text-sm font-bold text-gray-200 mb-1.5 flex items-center gap-1.5">
          <Sparkles className="h-2.5 w-2.5 text-gold inline" />
          <span>{isEn ? 'Statblock Inspector' : 'Инспектор характеристик'}</span>
          <Sparkles className="h-2.5 w-2.5 text-gold inline" />
        </h3>
        <p className="text-xs text-gray-400 max-w-xs leading-relaxed font-sans">
          {isEn
            ? 'Select a creature or character in the turn order to view their stats, parameters, and execute instant attacks in one click.'
            : 'Выберите существо или персонажа в очереди боя, чтобы просмотреть его характеристики, параметры и проводить мгновенные атаки в один клик.'}
        </p>
      </aside>
    );
  }

  return (
    <aside className="w-full h-full flex flex-col bg-surface/80 backdrop-blur-md select-none overflow-hidden flex-shrink-0 relative">
      {/* Active Roll Result Popover / Toast */}
      {activeRollToast && (
        <div className="absolute top-3 left-3 right-3 z-50 animate-in slide-in-from-top-2 duration-200 bg-[rgba(18,22,30,0.92)] backdrop-blur-xl border border-gold/70 rounded-glass-lg p-3 shadow-glass flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className={clsx(
                'w-10 h-10 rounded-full flex items-center justify-center font-mono tabular-nums font-black text-sm flex-shrink-0 shadow-inner border',
                activeRollToast.isNat20
                  ? 'bg-emerald-950 border-emerald-500 text-emerald-300 shadow-[0_0_12px_rgba(168,85,247,0.5)]'
                  : activeRollToast.isNat1
                  ? 'bg-red-950 border-red-500 text-rose-300 shadow-[0_0_12px_rgba(244,63,94,0.5)]'
                  : 'bg-card border-gold/70 text-gold-light'
              )}
            >
              {activeRollToast.total}
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold text-white flex items-center gap-1.5">
                <span className="truncate">{activeRollToast.title}</span>
                {activeRollToast.isNat20 && (
                  <span className="text-xs px-1.5 py-0.2 rounded-glass-sm bg-emerald-900/80 text-emerald-200 border border-emerald-500 font-bold uppercase">
                    {isEn ? 'CRIT!' : 'КРИТ!'}
                  </span>
                )}
                {activeRollToast.isNat1 && (
                  <span className="text-xs px-1.5 py-0.2 rounded-glass-sm bg-red-900/80 text-rose-200 border border-red-500 font-bold uppercase">
                    {isEn ? 'FUMBLE!' : 'ПРОВАЛ!'}
                  </span>
                )}
              </div>
              <div className="text-xs font-mono tabular-nums text-gray-300 mt-0.5 truncate">
                {activeRollToast.details}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setActiveRollToast(null)}
            className="min-h-[32px] min-w-[32px] flex items-center justify-center text-gray-400 hover:text-white rounded-glass-sm hover:bg-white/10 flex-shrink-0 cursor-pointer transition-colors"
            title={isEn ? 'Close notification' : 'Закрыть уведомление'}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Top Statblock Header (Dark-Ruby Header with Gold Border & rounded-glass-lg) */}
      <div className="bg-gradient-to-r from-[#3b0b0b]/95 via-[#5e1313]/95 to-[#3b0b0b]/95 backdrop-blur-md p-3.5 m-2.5 rounded-glass-lg border border-gold/40 shadow-glass flex-shrink-0">
        <StatblockHeader
          combatant={combatant}
          currentTarget={currentTarget}
          onClearTarget={() => setCurrentTargetId(null)}
          onPerformAttack={handlePerformAttack}
          onOpenTargetedAttack={openTargetedAttack}
          onShowcase={() => {
            broadcastService.send({
              type: 'BROADCAST_NPC_SHOWCASE',
              payload: {
                id: combatant.id,
                name: combatant.nameRu || combatant.name,
                nameRu: combatant.nameRu,
                avatarUrl: combatant.tokenUrl,
                creatureType: combatant.creatureType,
                notes: combatant.statblock?.senses || combatant.speed,
                timestamp: Date.now(),
              },
            });
          }}
          onUpdateSize={(size: CreatureSize) => {
            updateCombatant(combatant.id, {
              size,
              tokenScale: CREATURE_SIZE_SCALE[size] || 1.0,
            });
          }}
        />

        <StatblockSurvival combatant={combatant} />

        <StatblockAbilities
          stats={stats}
          onRollAbilityScore={handleRollAbilityScore}
          variant="grid"
        />
      </div>

      {/* Scrollable Middle: Saves, Skills, Traits, Actions */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden p-2.5 space-y-3 text-xs select-none">
        {/* Attributes Island Card (Saves, Skills, Resistances, Immunities, Senses, Languages, CR) */}
        <div className="rounded-glass-lg bg-card/70 backdrop-blur-md border border-[rgba(255,255,255,0.08)] p-3 space-y-2.5 shadow-sm text-xs">
          <StatblockSavingThrows
            saves={allSaves}
            onRollSavingThrow={handleRollSavingThrow}
          />
          <StatblockDefenses combatant={combatant} />
        </div>

        {combatant.isPlayer ? (
          <PlayerActionResultPanel player={combatant} />
        ) : (
          <>
            {/* Traits (Особенности) */}
            {sb?.traits && sb.traits.length > 0 && (
              <div className="rounded-glass-lg bg-card/70 backdrop-blur-md border border-[rgba(255,255,255,0.08)] p-3.5 shadow-sm">
                <div className="flex items-center gap-2 pb-2 mb-2.5 border-b border-white/10 text-xs font-bold uppercase tracking-wider text-gold-light">
                  <Sparkles className="h-2.5 w-2.5 text-gold inline" />
                  <span>{isEn ? 'TRAITS' : 'ОСОБЕННОСТИ'}</span>
                  <Sparkles className="h-2.5 w-2.5 text-gold inline" />
                </div>
                <div className="space-y-2.5">
                  {sb.traits.map((trait: any, i: number) => (
                    <div key={i} className="text-xs text-gray-300 leading-relaxed break-words [overflow-wrap:anywhere]">
                      <span className="font-bold text-white tracking-wide">{cleanRussianText(trait.name)}: </span>
                      <span>{renderTextWithSpellBadges(cleanRussianText(trait.desc), handleInspectSpell)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <StatblockSpells
              combatant={combatant}
              spellSlotsData={spellSlotsData}
              onInspectSpell={handleInspectSpell}
              onToggleSpellSlot={handleToggleSpellSlot}
              onRestoreAllSpellSlots={handleRestoreAllSpellSlots}
            />

            <StatblockActions
              combatant={combatant}
              currentTarget={currentTarget}
              livingTargets={livingTargets}
              activeTargetingActionKey={activeTargetingActionKey}
              attackAdvantageMode={attackAdvantageMode}
              setAttackAdvantageMode={setAttackAdvantageMode}
              onPerformAttack={handlePerformAttack}
              onExecuteActionRoll={executeActionRoll}
              onExecuteMultiattack={executeMultiattack}
              onSelectInlineTarget={handleSelectInlineTarget}
              onCloseInlineTargetPicker={() => {
                setActiveTargetingActionKey(null);
                cancelTargetingMode();
              }}
              onInspectSpell={handleInspectSpell}
            />
          </>
        )}
      </div>

      {/* Bottom: Combat Dice Log Section */}
      <div className="h-44 border-t border-[rgba(255,255,255,0.08)] bg-black/50 backdrop-blur-md flex flex-col flex-shrink-0 shadow-glass">
        <div className="px-3 py-2 border-b border-white/10 bg-card/60 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Dices className="h-4 w-4 text-gold" />
            <span className="text-xs font-bold uppercase tracking-wider text-gray-200">
              {isEn ? 'Combat Dice Log' : 'Журнал бросков кубиков'}
            </span>
          </div>
          {diceLog.length > 0 && (
            <button
              onClick={clearDiceLog}
              title={isEn ? 'Clear log' : 'Очистить журнал'}
              className="min-h-[28px] px-2.5 py-0.5 rounded-glass-sm text-xs text-gray-400 hover:text-red-400 font-mono font-semibold transition-colors uppercase hover:bg-white/5 cursor-pointer"
            >
              {isEn ? 'Clear' : 'Очистить'}
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto overflow-x-hidden p-2.5 space-y-2">
          {diceLog.length === 0 ? (
            <div className="h-full flex items-center justify-center text-center text-xs text-gray-400 italic">
              {isEn ? 'Click an attack or action to roll hit and damage' : 'Кликните на атаку или действие для броска попадания и урона'}
            </div>
          ) : (
            diceLog.map((entry) => (
              <div
                key={entry.id}
                className="p-2 rounded-glass-sm bg-card/85 border border-white/10 text-xs flex flex-col gap-1 overflow-hidden shadow-sm"
              >
                <div className="flex items-center justify-between gap-1.5 text-gray-400 text-xs min-w-0">
                  <span className="font-semibold text-gray-200 truncate min-w-0" title={cleanRussianText(entry.combatantName)}>
                    {cleanRussianText(entry.combatantName)}
                  </span>
                  <span className="text-gray-400 truncate flex-shrink-0 text-right font-mono tabular-nums" title={`${entry.actionName} • ${entry.timestamp}`}>
                    {entry.actionName} • {entry.timestamp}
                  </span>
                </div>

                <div className="flex items-center flex-wrap gap-x-2 gap-y-1 font-mono tabular-nums min-w-0 text-xs">
                  {/* Attack roll */}
                  {entry.attackRoll && (
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <span className="text-gray-400">{isEn ? 'Attack:' : 'Атака:'}</span>
                      <span
                        className={clsx(
                          'font-bold tabular-nums',
                          entry.attackRoll.isNat20 && 'text-emerald-400',
                          entry.attackRoll.isNat1 && 'text-red-400',
                          !entry.attackRoll.isNat20 && !entry.attackRoll.isNat1 && 'text-gold-light'
                        )}
                      >
                        {entry.attackRoll.total}
                      </span>
                      <span className="text-xs text-gray-500 whitespace-nowrap">
                        (d20: {entry.attackRoll.d20}
                        {entry.attackRoll.modifier >= 0 ? `+${entry.attackRoll.modifier}` : entry.attackRoll.modifier})
                      </span>
                      {entry.attackRoll.isNat20 && (
                        <span className="text-xs px-1.5 py-0.2 rounded-glass-sm bg-emerald-950 text-emerald-300 font-bold border border-emerald-600 whitespace-nowrap">
                          {isEn ? 'CRIT!' : 'КРИТ!'}
                        </span>
                      )}
                      {entry.attackRoll.isNat1 && (
                        <span className="text-xs px-1.5 py-0.2 rounded-glass-sm bg-red-950 text-red-300 font-bold border border-red-600 whitespace-nowrap">
                          {isEn ? 'FUMBLE!' : 'ПРОВАЛ!'}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Damage roll */}
                  {entry.damageRoll && (
                    <div className="flex items-center gap-1 flex-shrink-0 min-w-0">
                      <span className="text-gray-400 flex-shrink-0">{isEn ? 'Damage:' : 'Урон:'}</span>
                      <span className="font-bold text-red-300 tabular-nums flex-shrink-0">
                        {entry.damageRoll.total}
                      </span>
                      <span
                        className="text-xs text-gray-500 truncate max-w-[140px]"
                        title={entry.damageRoll.details}
                      >
                        ({entry.damageRoll.details})
                      </span>
                    </div>
                  )}

                  {/* Weapon mastery trigger */}
                  {entry.weaponMastery && (
                    <span className="text-xs text-amber font-sans flex-shrink-0 whitespace-nowrap">
                      [{isEn ? (MASTERY_SPECS[entry.weaponMastery]?.nameEn || entry.weaponMastery) : (MASTERY_SPECS[entry.weaponMastery]?.nameRu || entry.weaponMastery)}]
                    </span>
                  )}
                </div>

                {/* Target info if targeted strike */}
                {entry.targetName && (
                  <div className="flex items-center flex-wrap gap-1.5 text-xs mt-0.5 min-w-0">
                    <span className="text-gray-400 flex-shrink-0">{isEn ? 'Target:' : 'Цель:'}</span>
                    <strong
                      className="text-gray-100 truncate max-w-[140px]"
                      title={cleanRussianText(entry.targetName)}
                    >
                      {cleanRussianText(entry.targetName)}
                    </strong>
                    {entry.isHit !== undefined && (
                      <span
                        className={clsx(
                          'px-1.5 py-0.2 rounded-glass-sm font-bold text-xs flex-shrink-0 whitespace-nowrap',
                          entry.isHit
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-600'
                            : 'bg-red-950 text-red-300 border border-red-600'
                        )}
                      >
                        {entry.isHit ? (isEn ? 'HIT' : 'ПОПАДАНИЕ') : (isEn ? 'MISS' : 'ПРОМАХ')}
                      </span>
                    )}
                    {entry.effectiveDamage !== undefined && entry.effectiveDamage > 0 && (
                      <span className="font-mono tabular-nums font-bold text-red-300 flex-shrink-0 whitespace-nowrap">
                        (-{entry.effectiveDamage} {isEn ? 'HP' : 'ОЗ'})
                      </span>
                    )}
                  </div>
                )}

                {/* Additional note or mastery log */}
                {entry.note && (
                  <div className="text-xs text-gray-400 italic break-words [overflow-wrap:anywhere]">
                    {entry.note}
                  </div>
                )}

                {/* Interactive Concentration Prompt Button */}
                {entry.concentrationPrompt && (
                  <div className="min-h-[32px] mt-1 flex items-center justify-between gap-1.5 bg-amber-950/40 border border-amber-500/40 rounded-glass-sm px-2.5 py-1 text-xs min-w-0">
                    <span className="text-amber-300 font-medium truncate min-w-0 flex items-center gap-1" title={isEn ? `Concentration: DC ${entry.concentrationPrompt.dc}` : `Концентрация: СЛ ${entry.concentrationPrompt.dc}`}>
                      <Zap className="h-3.5 w-3.5 flex-shrink-0" />
                      <span>{isEn ? 'Concentration:' : 'Концентрация:'} <strong>{isEn ? 'DC' : 'СЛ'} {entry.concentrationPrompt.dc}</strong></span>
                    </span>
                    <button
                      onClick={() => toggleConcentration(entry.concentrationPrompt!.targetId)}
                      className="min-h-[28px] bg-red-900/60 hover:bg-red-800 text-red-200 border border-red-500/40 px-2 py-0.5 rounded-glass-sm text-xs font-semibold transition-colors cursor-pointer flex-shrink-0 whitespace-nowrap"
                    >
                      {isEn ? 'Break' : 'Сбить'}
                    </button>
                  </div>
                )}

                {/* Interactive Topple Prone Prompt Button */}
                {entry.topplePrompt && (
                  <div className="min-h-[32px] mt-1 flex items-center justify-between gap-1.5 bg-purple-950/40 border border-purple-500/40 rounded-glass-sm px-2.5 py-1 text-xs min-w-0">
                    <span className="text-purple-300 font-medium truncate min-w-0 flex items-center gap-1" title={isEn ? `Topple: DC ${entry.topplePrompt.dc} CON` : `Опрокидывание: СЛ ${entry.topplePrompt.dc} ТЕЛ`}>
                      <Shield className="h-3.5 w-3.5 flex-shrink-0" />
                      <span>{isEn ? 'Topple:' : 'Опрокидывание:'} <strong>{isEn ? 'DC' : 'СЛ'} {entry.topplePrompt.dc} {isEn ? 'CON' : 'ТЕЛ'}</strong></span>
                    </span>
                    <button
                      onClick={() => addCondition(entry.topplePrompt!.targetId, { type: 'Prone' })}
                      className="min-h-[28px] bg-purple-900/60 hover:bg-purple-800 text-purple-200 border border-purple-500/40 px-2 py-0.5 rounded-glass-sm text-xs font-semibold transition-colors cursor-pointer flex-shrink-0 whitespace-nowrap"
                    >
                      {isEn ? 'Knock Prone' : 'Сбить с ног'}
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Popup: Spell Details Modal from SQLite dbService.searchSpells */}
      <SpellDetailsModal
        spell={inspectedSpell}
        onClose={() => setInspectedSpell(null)}
      />
    </aside>
  );
}
