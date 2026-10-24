import React from 'react';
import clsx from 'clsx';
import {
  Shield,
  Swords,
  X,
  Sparkles,
} from 'lucide-react';
import { useCombatStore } from '../../store/combatStore';
import { usePartyStore } from '../../store/partyStore';
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
  CombatDiceLog,
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
        (st.key === 'str'
          ? (sb?.saves?.['STR'] ?? sb?.saves?.['str'] ?? sb?.saves?.['СИЛ'] ?? sb?.saves?.['сил'])
          : st.key === 'dex'
          ? (sb?.saves?.['DEX'] ?? sb?.saves?.['dex'] ?? sb?.saves?.['ЛОВ'] ?? sb?.saves?.['лов'])
          : st.key === 'con'
          ? (sb?.saves?.['CON'] ?? sb?.saves?.['con'] ?? sb?.saves?.['ТЕЛ'] ?? sb?.saves?.['тел'])
          : st.key === 'intellect' || st.key === 'int'
          ? (sb?.saves?.['INT'] ?? sb?.saves?.['int'] ?? sb?.saves?.['ИНТ'] ?? sb?.saves?.['инт'] ?? sb?.saves?.['intellect'])
          : st.key === 'wis'
          ? (sb?.saves?.['WIS'] ?? sb?.saves?.['wis'] ?? sb?.saves?.['МДР'] ?? sb?.saves?.['мдр'] ?? sb?.saves?.['МУД'] ?? sb?.saves?.['муд'])
          : st.key === 'cha'
          ? (sb?.saves?.['CHA'] ?? sb?.saves?.['cha'] ?? sb?.saves?.['ХАР'] ?? sb?.saves?.['хар'])
          : undefined);
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
      <CombatDiceLog
        diceLog={diceLog}
        onClearLog={clearDiceLog}
        onToggleConcentration={toggleConcentration}
        onAddCondition={(targetId, cond) => addCondition(targetId, cond as any)}
      />

      {/* Popup: Spell Details Modal from SQLite dbService.searchSpells */}
      <SpellDetailsModal
        spell={inspectedSpell}
        onClose={() => setInspectedSpell(null)}
      />
    </aside>
  );
}
