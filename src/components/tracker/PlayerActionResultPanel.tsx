import React, { useState, useMemo, useEffect } from 'react';
import clsx from 'clsx';
import {
  Swords,
  Heart,
  Zap,
  Check,
  Crosshair,
  ChevronRight,
  Sparkles,
  BookOpen,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';
import { useCombatStore } from '../../store/combatStore';
import { Combatant } from '../../types/combat';
import { DamageType, ConditionType } from '../../types/dnd5e';
import { CONDITIONS_2024_DATA } from '../../engine/conditions';
import {
  cleanRussianText,
  cleanEnglishText,
  localizeDamageType,
  localizeMonsterName,
  localizeActionName,
} from '../../utils/textUtils';
import { computeDamageWithDefenses } from '../../utils/attackParser';
import { broadcastService } from '../../services/broadcastService';
import { resolveTokenUrl } from '../../services/tokenResolver';
import { useTranslation } from '../../i18n';

interface PlayerActionResultPanelProps {
  player: Combatant;
}

const COMMON_DAMAGE_TYPES: DamageType[] = [
  'slashing',
  'piercing',
  'bludgeoning',
  'fire',
  'radiant',
  'force',
  'lightning',
  'necrotic',
  'cold',
  'poison',
  'acid',
  'psychic',
  'thunder',
];

export function PlayerActionResultPanel({ player }: PlayerActionResultPanelProps) {
  const { language } = useTranslation();
  const isEn = language === 'en';

  const {
    combatants,
    currentTargetId,
    setCurrentTargetId,
    applyDamage,
    applyHealing,
    addCondition,
    addDiceLog,
    nextTurn,
  } = useCombatStore();

  const [activeTab, setActiveTab] = useState<'damage' | 'heal' | 'condition'>('damage');
  const [feedback, setFeedback] = useState<string | null>(null);

  const getCombatantDisplayName = (c?: Combatant | null) => {
    if (!c) return '';
    if (isEn) {
      return c.name_en || localizeMonsterName(c.name, 'en') || c.name;
    }
    return cleanRussianText(c.nameRu || c.name);
  };

  // Living enemies (non-players)
  const livingEnemies = useMemo(() => {
    return combatants.filter((c) => !c.isPlayer && !c.isDead && c.hp > 0);
  }, [combatants]);

  // Living allies (including self)
  const livingAllies = useMemo(() => {
    return combatants.filter((c) => c.isPlayer && !c.isDead);
  }, [combatants]);

  // Target for damage
  const [selectedTargetId, setSelectedTargetId] = useState<string>(() => {
    if (currentTargetId && livingEnemies.some((e) => e.id === currentTargetId)) {
      return currentTargetId;
    }
    return livingEnemies[0]?.id || '';
  });

  // Keep target in sync if currentTargetId changes from map or roster
  useEffect(() => {
    if (currentTargetId && livingEnemies.some((e) => e.id === currentTargetId)) {
      setSelectedTargetId(currentTargetId);
    } else if (!selectedTargetId && livingEnemies.length > 0) {
      setSelectedTargetId(livingEnemies[0].id);
    }
  }, [currentTargetId, livingEnemies, selectedTargetId]);

  // Damage form state
  const [damageInput, setDamageInput] = useState<string>('0');
  const [damageType, setDamageType] = useState<DamageType>('slashing');
  const [isCrit, setIsCrit] = useState<boolean>(false);
  const [attackRollNote, setAttackRollNote] = useState<string>('');

  // Heal form state
  const [healingTargetId, setHealingTargetId] = useState<string>(() => player.id);
  const [healInput, setHealInput] = useState<string>('8');

  // Condition form state
  const [conditionTargetId, setConditionTargetId] = useState<string>(() => {
    return selectedTargetId || livingEnemies[0]?.id || '';
  });
  const [selectedCondition, setSelectedCondition] = useState<ConditionType>('Prone');

  // Expandable character reference sheet
  const [isRefExpanded, setIsRefExpanded] = useState<boolean>(false);

  const selectedTarget = combatants.find((c) => c.id === selectedTargetId);
  const selectedAlly = combatants.find((c) => c.id === healingTargetId);

  // Quick increment helper
  const addDamageDelta = (delta: number) => {
    const current = parseInt(damageInput, 10) || 0;
    const next = Math.max(0, current + delta);
    setDamageInput(String(next));
  };

  const halveDamage = () => {
    const current = parseInt(damageInput, 10) || 0;
    setDamageInput(String(Math.floor(current / 2)));
  };

  // 1. Submit Damage
  const handleApplyDamage = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedTarget) {
      setFeedback(isEn ? 'Select a target (monster) to deal damage to' : 'Выберите цель (монстра) для нанесения урона');
      return;
    }

    const dmgAmount = parseInt(damageInput, 10);
    if (isNaN(dmgAmount) || dmgAmount <= 0) {
      setFeedback(isEn ? 'Enter damage dealt (greater than 0)' : 'Введите количество нанесённого урона (больше 0)');
      return;
    }

    // Check target defenses (resistance/immunity/vulnerability)
    const defense = computeDamageWithDefenses(dmgAmount, damageType, selectedTarget);
    const effectiveDmg = defense.finalDmg;

    // Apply damage to target
    applyDamage(selectedTarget.id, [{ amount: effectiveDmg, type: damageType }], isCrit, true);

    // Concentration check prompt if target was concentrating
    let concPrompt: any = undefined;
    if (selectedTarget.isConcentrating) {
      const dc = Math.max(10, Math.floor(effectiveDmg / 2));
      concPrompt = {
        targetId: selectedTarget.id,
        targetName: getCombatantDisplayName(selectedTarget),
        dc,
      };
    }

    const playerName = getCombatantDisplayName(player);
    const targetName = getCombatantDisplayName(selectedTarget);
    const dmgTypeLocalized = localizeDamageType(damageType, language);

    // Log action
    addDiceLog({
      id: crypto.randomUUID(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      combatantName: playerName,
      actionName: isCrit
        ? (isEn ? 'Player Critical Hit (Table)' : 'Критический удар игрока (за столом)')
        : (isEn ? 'Player Attack (Table)' : 'Атака игрока (за столом)'),
      targetName: targetName,
      targetId: selectedTarget.id,
      isHit: true,
      effectiveDamage: effectiveDmg,
      attackRoll: attackRollNote.trim() ? {
        d20: isCrit ? 20 : 10,
        modifier: 0,
        total: parseInt(attackRollNote, 10) || 20,
        isNat20: isCrit,
        isNat1: false,
      } : undefined,
      damageRoll: {
        formula: isEn ? `${dmgAmount} (table entry)` : `${dmgAmount} (ввод со стола)`,
        total: effectiveDmg,
        damageType: dmgTypeLocalized,
        details: isEn ? `${effectiveDmg} ${dmgTypeLocalized} damage` : `${effectiveDmg} ${dmgTypeLocalized} урона`,
      },
      note: defense.notice || (isCrit ? (isEn ? 'TABLE CRITICAL HIT!' : 'КРИТ ЗА СТОЛОМ!') : undefined),
      concentrationPrompt: concPrompt,
    });

    // Broadcast to players screen
    broadcastService.send({
      type: 'BROADCAST_ROLL',
      payload: {
        id: crypto.randomUUID(),
        title: isEn ? `${playerName}: Table Strike` : `${playerName}: Удар за столом`,
        formula: `${effectiveDmg} ${dmgTypeLocalized}`,
        total: effectiveDmg,
        resultDisplay: isEn
          ? `${playerName} deals ${effectiveDmg} ${dmgTypeLocalized} damage to ${targetName}!${isCrit ? ' [CRIT!]' : ''}`
          : `${playerName} наносит ${effectiveDmg} ${dmgTypeLocalized} урона по ${targetName}!${isCrit ? ' [КРИТ!]' : ''}`,
        isCritical: isCrit,
        timestamp: Date.now(),
      },
    });

    setFeedback(
      isEn
        ? `Dealt ${effectiveDmg} ${dmgTypeLocalized} damage to ${targetName}!`
        : `Нанесено ${effectiveDmg} ${dmgTypeLocalized} урона по ${targetName}!`
    );
    setDamageInput('0');
    setIsCrit(false);
    setAttackRollNote('');

    setTimeout(() => setFeedback(null), 3500);
  };

  // 2. Submit Healing
  const handleApplyHealing = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedAlly) {
      setFeedback(isEn ? 'Select a healing recipient' : 'Выберите получателя лечения');
      return;
    }

    const amount = parseInt(healInput, 10);
    if (isNaN(amount) || amount <= 0) {
      setFeedback(isEn ? 'Enter healing amount' : 'Введите значение лечения');
      return;
    }

    applyHealing(selectedAlly.id, amount);

    const playerName = getCombatantDisplayName(player);
    const allyName = getCombatantDisplayName(selectedAlly);
    const hpUnit = isEn ? 'HP' : 'ОЗ';

    addDiceLog({
      id: crypto.randomUUID(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      combatantName: playerName,
      actionName: isEn ? 'Healing (Table)' : 'Лечение (за столом)',
      targetName: allyName,
      targetId: selectedAlly.id,
      isHit: true,
      effectiveDamage: -amount,
      damageRoll: {
        formula: `${amount} ${hpUnit}`,
        total: amount,
        damageType: isEn ? 'Healing' : 'Лечение',
        details: isEn ? `Restored ${amount} HP` : `Восстановлено ${amount} ОЗ`,
      },
    });

    broadcastService.send({
      type: 'BROADCAST_ROLL',
      payload: {
        id: crypto.randomUUID(),
        title: isEn ? `${playerName}: Healing` : `${playerName}: Лечение`,
        formula: `+${amount} ${hpUnit}`,
        total: amount,
        resultDisplay: isEn
          ? `${playerName} restores ${amount} HP to ${allyName}!`
          : `${playerName} восстанавливает ${amount} ОЗ для ${allyName}!`,
        timestamp: Date.now(),
      },
    });

    setFeedback(
      isEn
        ? `Restored ${amount} HP to ${allyName}!`
        : `Восстановлено ${amount} ОЗ для ${allyName}!`
    );
    setTimeout(() => setFeedback(null), 3500);
  };

  // 3. Submit Condition
  const handleApplyCondition = () => {
    const tgt = combatants.find((c) => c.id === conditionTargetId);
    if (!tgt) {
      setFeedback(isEn ? 'Select a target for condition' : 'Выберите цель для наложения эффекта');
      return;
    }

    addCondition(tgt.id, { type: selectedCondition });

    const playerName = getCombatantDisplayName(player);
    const tgtName = getCombatantDisplayName(tgt);
    const condName = isEn
      ? (CONDITIONS_2024_DATA[selectedCondition]?.nameEn || selectedCondition)
      : (CONDITIONS_2024_DATA[selectedCondition]?.nameRu || selectedCondition);

    addDiceLog({
      id: crypto.randomUUID(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      combatantName: playerName,
      actionName: isEn ? 'Apply Condition (Table)' : 'Наложение эффекта (за столом)',
      targetName: tgtName,
      targetId: tgt.id,
      isHit: true,
      effectiveDamage: 0,
      note: isEn ? `Applied condition: ${condName}` : `Наложено состояние: ${condName}`,
    });

    broadcastService.send({
      type: 'BROADCAST_ROLL',
      payload: {
        id: crypto.randomUUID(),
        title: isEn ? `${playerName}: Apply Condition` : `${playerName}: Наложение эффекта`,
        formula: condName,
        total: 0,
        resultDisplay: isEn
          ? `${playerName} applies [${condName}] to ${tgtName}!`
          : `${playerName} накладывает [${condName}] на ${tgtName}!`,
        timestamp: Date.now(),
      },
    });

    setFeedback(
      isEn
        ? `Condition "${condName}" applied to ${tgtName}!`
        : `Состояние «${condName}» наложено на ${tgtName}!`
    );
    setTimeout(() => setFeedback(null), 3500);
  };

  const playerNameDisplay = getCombatantDisplayName(player);

  return (
    <div className="flex flex-col space-y-4 pt-3">
      {/* Informative Header Banner */}
      <div className="bg-emerald-950/30 border border-emerald-700/40 rounded-sm p-3 flex flex-col gap-1.5">
        <div className="flex items-center justify-between gap-1.5 min-w-0">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <span className="p-1 rounded bg-emerald-500/20 text-emerald-300 flex-shrink-0">
              <Sparkles className="h-4 w-4" />
            </span>
            <span
              className="text-xs font-bold text-emerald-200 truncate min-w-0"
              title={isEn ? `Player Turn: ${playerNameDisplay}` : `Ход игрока: ${playerNameDisplay}`}
            >
              {isEn ? `Player Turn: ${playerNameDisplay}` : `Ход игрока: ${playerNameDisplay}`}
            </span>
          </div>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 flex-shrink-0 whitespace-nowrap">
            {isEn ? 'Table Rolls' : 'Броски за столом'}
          </span>
        </div>
        <p className="text-[11px] text-gray-300 leading-snug break-words [overflow-wrap:anywhere]">
          {isEn
            ? 'The player rolls dice at the table. Enter their dealt damage, healing, or apply a condition to a target.'
            : 'Игрок совершает броски самостоятельно. Внесите нанесённый им урон, лечение или наложите состояние на цель.'}
        </p>
      </div>

      {/* Success / Warning Feedback Alert */}
      {feedback && (
        <div className="p-2.5 rounded-sm bg-emerald-900/40 border border-emerald-500 text-emerald-200 text-xs flex items-center gap-2 animate-in fade-in duration-150">
          <Check className="h-4 w-4 text-emerald-400 flex-shrink-0" />
          <span className="break-words [overflow-wrap:anywhere]">{feedback}</span>
        </div>
      )}

      {/* Action Sub-Tabs - Equal 3-Column Grid for Zero Overflow */}
      <div className="grid grid-cols-3 border-b border-border-subtle gap-1 text-xs">
        <button
          type="button"
          onClick={() => setActiveTab('damage')}
          className={clsx(
            'flex items-center justify-center gap-1.5 px-1 py-1.5 font-bold transition-all border-b-2 text-center min-w-0 cursor-pointer',
            activeTab === 'damage'
              ? 'border-gold text-gold-light bg-card'
              : 'border-transparent text-gray-400 hover:text-gray-200 hover:bg-card/50'
          )}
          title={isEn ? "Deal damage to target" : "Нанести урон цели"}
        >
          <Swords className="h-3.5 w-3.5 text-crimson flex-shrink-0" />
          <span className="truncate">{isEn ? 'Damage' : 'Урон'}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('heal')}
          className={clsx(
            'flex items-center justify-center gap-1.5 px-1 py-1.5 font-bold transition-all border-b-2 text-center min-w-0 cursor-pointer',
            activeTab === 'heal'
              ? 'border-emerald-500 text-emerald-300 bg-card'
              : 'border-transparent text-gray-400 hover:text-gray-200 hover:bg-card/50'
          )}
          title={isEn ? "Restore health to ally" : "Восстановить здоровье союзнику"}
        >
          <Heart className="h-3.5 w-3.5 text-emerald-400 flex-shrink-0" />
          <span className="truncate">{isEn ? 'Healing' : 'Лечение'}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('condition')}
          className={clsx(
            'flex items-center justify-center gap-1.5 px-1 py-1.5 font-bold transition-all border-b-2 text-center min-w-0 cursor-pointer',
            activeTab === 'condition'
              ? 'border-sapphire text-blue-300 bg-card'
              : 'border-transparent text-gray-400 hover:text-gray-200 hover:bg-card/50'
          )}
          title={isEn ? "Apply D&D 2024 condition" : "Наложить состояние D&D 2024"}
        >
          <Zap className="h-3.5 w-3.5 text-sapphire flex-shrink-0" />
          <span className="truncate">{isEn ? 'Condition' : 'Состояние'}</span>
        </button>
      </div>

      {/* TAB 1: DAMAGE ENTRY */}
      {activeTab === 'damage' && (
        <form onSubmit={handleApplyDamage} className="space-y-3.5">
          {/* 1. Target Selector */}
          <div>
            <label className="block text-[11px] font-semibold text-gray-300 mb-1.5 flex items-center justify-between gap-1 min-w-0">
              <span className="flex items-center gap-1 min-w-0 truncate">
                <Crosshair className="h-3.5 w-3.5 text-gold flex-shrink-0" />
                <span className="truncate">{isEn ? '1. Select target (monster):' : '1. Выберите цель (монстра):'}</span>
              </span>
              {selectedTarget && (
                <span className="text-[10px] font-mono text-gold-light flex-shrink-0 whitespace-nowrap">
                  {isEn ? `AC ${selectedTarget.ac} • ${selectedTarget.hp}/${selectedTarget.maxHp} HP` : `КД ${selectedTarget.ac} • ${selectedTarget.hp}/${selectedTarget.maxHp} ОЗ`}
                </span>
              )}
            </label>

            {livingEnemies.length === 0 ? (
              <div className="p-3 text-center text-xs text-gray-500 border border-dashed border-border-subtle rounded-sm">
                {isEn ? 'No active enemies in combat' : 'В бою нет активных противников'}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-36 overflow-y-auto p-1 bg-canvas/60 rounded border border-border-subtle">
                {livingEnemies.map((enemy) => {
                  const isSelected = enemy.id === selectedTargetId;
                  const token = resolveTokenUrl(enemy.name, enemy.nameRu, enemy.tokenUrl);
                  const enemyDisplayName = getCombatantDisplayName(enemy);

                  return (
                    <button
                      key={enemy.id}
                      type="button"
                      onClick={() => {
                        setSelectedTargetId(enemy.id);
                        setCurrentTargetId(enemy.id);
                      }}
                      className={clsx(
                        'flex items-center gap-2 p-1.5 rounded text-left transition-all border select-none min-w-0 cursor-pointer',
                        isSelected
                          ? 'bg-red-950/60 border-red-500 text-white shadow-sm ring-1 ring-red-500/40'
                          : 'bg-card border-border-subtle/80 text-gray-300 hover:border-gold/50'
                      )}
                      title={enemyDisplayName}
                    >
                      <div className="w-5 h-5 rounded-full overflow-hidden bg-surface flex-shrink-0 flex items-center justify-center border border-border-subtle">
                        {token ? (
                          <img src={token} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-[9px] font-bold">
                            {(enemy.nameRu || enemy.name).slice(0, 2).toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div
                          className="text-xs font-semibold truncate leading-tight"
                          title={enemyDisplayName}
                        >
                          {enemyDisplayName}
                        </div>
                        <div className="text-[10px] text-gray-400 font-mono truncate">
                          {isEn ? `AC ${enemy.ac} • ${enemy.hp} HP` : `КД ${enemy.ac} • ${enemy.hp} ОЗ`}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* 2. Damage Value & Quick Modifiers */}
          <div className="bg-card p-3 rounded-sm border border-border-subtle space-y-2.5">
            <div className="flex items-center justify-between gap-1">
              <label className="text-xs font-semibold text-gray-200 truncate">
                {isEn ? '2. Damage dealt according to player:' : '2. Нанесённый урон со слов игрока:'}
              </label>
              <label className="flex items-center gap-1.5 text-xs text-amber-300 cursor-pointer font-bold select-none flex-shrink-0 whitespace-nowrap">
                <input
                  type="checkbox"
                  checked={isCrit}
                  onChange={(e) => setIsCrit(e.target.checked)}
                  className="rounded border-border-subtle text-amber-500 focus:ring-0 bg-surface"
                />
                <span className="inline-flex items-center gap-1">
                  <Zap className="h-3 w-3 text-amber-400 inline" />
                  <span>{isEn ? 'Nat 20 (Crit)' : 'Нат. 20 (Крит)'}</span>
                </span>
              </label>
            </div>

            <div className="flex items-center gap-2 min-w-0">
              <div className="relative flex-1 min-w-0">
                <input
                  type="number"
                  min="0"
                  value={damageInput}
                  onChange={(e) => setDamageInput(e.target.value)}
                  placeholder="0"
                  className="w-full bg-surface border-2 border-gold/40 focus:border-gold text-lg font-bold font-mono px-3 pr-9 py-1.5 rounded-sm text-gold-light outline-none"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold font-mono text-gray-400 pointer-events-none">
                  {isEn ? 'HP' : 'ОЗ'}
                </span>
              </div>

              {/* Quick increment buttons */}
              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => addDamageDelta(1)}
                  className="min-w-[28px] px-2 py-1.5 bg-surface border border-border-subtle hover:border-gold rounded font-mono text-xs text-gray-200 font-bold text-center cursor-pointer"
                  title={isEn ? "+1 damage" : "+1 к урону"}
                >
                  +1
                </button>
                <button
                  type="button"
                  onClick={() => addDamageDelta(5)}
                  className="min-w-[28px] px-2 py-1.5 bg-surface border border-border-subtle hover:border-gold rounded font-mono text-xs text-gray-200 font-bold text-center cursor-pointer"
                  title={isEn ? "+5 damage" : "+5 к урону"}
                >
                  +5
                </button>
                <button
                  type="button"
                  onClick={() => addDamageDelta(10)}
                  className="min-w-[28px] px-2 py-1.5 bg-surface border border-border-subtle hover:border-gold rounded font-mono text-xs text-gray-200 font-bold text-center cursor-pointer"
                  title={isEn ? "+10 damage" : "+10 к урону"}
                >
                  +10
                </button>
                <button
                  type="button"
                  onClick={halveDamage}
                  className="min-w-[28px] px-2 py-1.5 bg-surface border border-border-subtle hover:border-amber rounded font-mono text-xs text-amber-300 font-bold text-center cursor-pointer"
                  title={isEn ? "Half damage (on successful save)" : "Половина урона (при успешном спасброске)"}
                >
                  ½
                </button>
                <button
                  type="button"
                  onClick={() => setDamageInput('0')}
                  className="min-w-[28px] px-2 py-1.5 bg-surface border border-border-subtle hover:border-red-500 rounded font-mono text-xs text-gray-400 hover:text-red-300 text-center cursor-pointer"
                  title={isEn ? "Reset damage to 0" : "Сбросить урон в 0"}
                >
                  C
                </button>
              </div>
            </div>

            {/* Damage Type & Optional Roll Note */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <div>
                <span className="text-[10px] text-gray-400 block mb-1 leading-none">{isEn ? 'Damage type:' : 'Тип урона:'}</span>
                <select
                  value={damageType}
                  onChange={(e) => setDamageType(e.target.value as DamageType)}
                  className="w-full bg-surface border border-border-subtle text-xs rounded-sm px-2 py-1 text-gray-200 outline-none truncate"
                >
                  {COMMON_DAMAGE_TYPES.map((dt) => (
                    <option key={dt} value={dt}>
                      {localizeDamageType(dt, language)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <span className="text-[10px] text-gray-400 block mb-1 leading-none">{isEn ? 'Attack total (for log):' : 'Итог атаки (для лога):'}</span>
                <input
                  type="text"
                  value={attackRollNote}
                  onChange={(e) => setAttackRollNote(e.target.value)}
                  placeholder={isEn ? "e.g. 21" : "напр. 21"}
                  className="w-full bg-surface border border-border-subtle text-xs rounded-sm px-2 py-1 text-gray-200 outline-none font-mono"
                />
              </div>
            </div>
          </div>

          {/* Action CTA Button */}
          <button
            type="submit"
            disabled={!selectedTarget || (parseInt(damageInput, 10) || 0) <= 0}
            className="w-full py-2.5 px-3 rounded-sm bg-crimson hover:bg-red-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 group min-w-0 cursor-pointer"
            title={
              selectedTarget
                ? (isEn
                    ? `Deduct ${damageInput} damage from ${getCombatantDisplayName(selectedTarget)}`
                    : `Списать ${damageInput} урона с ${getCombatantDisplayName(selectedTarget)}`)
                : (isEn ? 'Select target and enter damage' : 'Выберите цель и введите урон')
            }
          >
            <Crosshair className="h-4 w-4 group-hover:scale-110 transition-transform flex-shrink-0" />
            <span className="truncate min-w-0">
              {selectedTarget
                ? (isEn
                    ? `Deduct ${damageInput} damage from ${getCombatantDisplayName(selectedTarget)}`
                    : `Списать ${damageInput} урона с ${getCombatantDisplayName(selectedTarget)}`)
                : (isEn ? 'Select target and enter damage' : 'Выберите цель и введите урон')}
            </span>
          </button>
        </form>
      )}

      {/* TAB 2: HEALING ENTRY */}
      {activeTab === 'heal' && (
        <form onSubmit={handleApplyHealing} className="space-y-3.5">
          <div>
            <label className="block text-[11px] font-semibold text-gray-300 mb-1.5 flex items-center justify-between gap-1 min-w-0">
              <span className="truncate">{isEn ? 'Healing recipient (Ally):' : 'Получатель лечения (Союзник):'}</span>
              {selectedAlly && (
                <span className="text-[10px] font-mono text-emerald-400 flex-shrink-0 whitespace-nowrap">
                  {selectedAlly.hp}/{selectedAlly.maxHp} {isEn ? 'HP' : 'ОЗ'}
                </span>
              )}
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-36 overflow-y-auto p-1 bg-canvas/60 rounded border border-border-subtle">
              {livingAllies.map((ally) => {
                const isSelected = ally.id === healingTargetId;
                const allyDisplayName = getCombatantDisplayName(ally);
                return (
                  <button
                    key={ally.id}
                    type="button"
                    onClick={() => setHealingTargetId(ally.id)}
                    className={clsx(
                      'flex items-center justify-between p-1.5 rounded text-left transition-all border select-none min-w-0 cursor-pointer',
                      isSelected
                        ? 'bg-emerald-950/70 border-emerald-500 text-emerald-200 font-bold shadow-sm'
                        : 'bg-card border-border-subtle text-gray-300 hover:border-emerald-700/50'
                    )}
                    title={allyDisplayName}
                  >
                    <span className="text-xs truncate min-w-0 flex-1">{allyDisplayName}</span>
                    <span className="text-[10px] font-mono text-gray-400 flex-shrink-0 whitespace-nowrap ml-1">{ally.hp}/{ally.maxHp}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="bg-card p-3 rounded-sm border border-border-subtle space-y-2">
            <label className="text-xs font-semibold text-gray-200 block truncate">
              {isEn ? 'Health to restore:' : 'Восстанавливаемое здоровье:'}
            </label>
            <div className="flex items-center gap-2 min-w-0">
              <div className="relative flex-1 min-w-0">
                <input
                  type="number"
                  min="1"
                  value={healInput}
                  onChange={(e) => setHealInput(e.target.value)}
                  className="w-full bg-surface border-2 border-emerald-600/50 focus:border-emerald-500 text-lg font-bold font-mono px-3 pr-9 py-1.5 rounded-sm text-emerald-300 outline-none"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold font-mono text-gray-400 pointer-events-none">
                  {isEn ? 'HP' : 'ОЗ'}
                </span>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => setHealInput(String((parseInt(healInput, 10) || 0) + 5))}
                  className="min-w-[28px] px-2.5 py-1.5 bg-surface border border-border-subtle hover:border-emerald-500 rounded font-mono text-xs text-emerald-300 font-bold flex-shrink-0 whitespace-nowrap text-center cursor-pointer"
                  title={isEn ? "+5 HP" : "+5 ОЗ"}
                >
                  +5
                </button>
                <button
                  type="button"
                  onClick={() => setHealInput(String((parseInt(healInput, 10) || 0) + 10))}
                  className="min-w-[28px] px-2.5 py-1.5 bg-surface border border-border-subtle hover:border-emerald-500 rounded font-mono text-xs text-emerald-300 font-bold flex-shrink-0 whitespace-nowrap text-center cursor-pointer"
                  title={isEn ? "+10 HP" : "+10 ОЗ"}
                >
                  +10
                </button>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={!selectedAlly || (parseInt(healInput, 10) || 0) <= 0}
            className="w-full py-2.5 px-3 rounded-sm bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 min-w-0 cursor-pointer"
            title={
              selectedAlly
                ? (isEn
                    ? `Restore ${healInput} HP to ${getCombatantDisplayName(selectedAlly)}`
                    : `Восстановить ${healInput} ОЗ для ${getCombatantDisplayName(selectedAlly)}`)
                : (isEn ? `Restore ${healInput} HP` : `Восстановить ${healInput} ОЗ`)
            }
          >
            <Heart className="h-4 w-4 flex-shrink-0" />
            <span className="truncate min-w-0">
              {selectedAlly
                ? (isEn
                    ? `Restore ${healInput} HP to ${getCombatantDisplayName(selectedAlly)}`
                    : `Восстановить ${healInput} ОЗ для ${getCombatantDisplayName(selectedAlly)}`)
                : (isEn ? `Restore ${healInput} HP` : `Восстановить ${healInput} ОЗ`)}
            </span>
          </button>
        </form>
      )}

      {/* TAB 3: CONDITION ENTRY */}
      {activeTab === 'condition' && (
        <div className="space-y-3.5">
          <div>
            <label className="block text-[11px] font-semibold text-gray-300 mb-1.5 truncate">
              {isEn ? 'Target for condition:' : 'Цель для наложения эффекта:'}
            </label>
            <select
              value={conditionTargetId}
              onChange={(e) => setConditionTargetId(e.target.value)}
              className="w-full bg-surface border border-border-subtle text-xs rounded-sm px-2.5 py-1.5 text-gray-100 outline-none truncate"
            >
              <optgroup label={isEn ? "Monsters / Enemies" : "Монстры / Противники"}>
                {livingEnemies.map((e) => (
                  <option key={e.id} value={e.id}>
                    {getCombatantDisplayName(e)} ({isEn ? 'AC' : 'КД'} {e.ac})
                  </option>
                ))}
              </optgroup>
              <optgroup label={isEn ? "Player Characters" : "Персонажи игроков"}>
                {livingAllies.map((a) => (
                  <option key={a.id} value={a.id}>
                    {getCombatantDisplayName(a)}
                  </option>
                ))}
              </optgroup>
            </select>
          </div>

          <div className="bg-card p-3 rounded-sm border border-border-subtle space-y-2">
            <label className="text-xs font-semibold text-gray-200 block truncate">
              {isEn ? 'D&D 2024 Condition:' : 'Состояние D&D 2024:'}
            </label>
            <select
              value={selectedCondition}
              onChange={(e) => setSelectedCondition(e.target.value as ConditionType)}
              className="w-full bg-surface border border-border-subtle text-xs rounded-sm px-2.5 py-1.5 text-gray-100 outline-none truncate"
            >
              {Object.entries(CONDITIONS_2024_DATA).map(([key, info]) => (
                <option key={key} value={key}>
                  {isEn ? `${info.nameEn} (${info.nameRu})` : `${info.nameRu} (${info.nameEn})`}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-gray-400 mt-1 leading-relaxed break-words [overflow-wrap:anywhere]">
              {isEn
                ? (CONDITIONS_2024_DATA[selectedCondition]?.descriptionEn || CONDITIONS_2024_DATA[selectedCondition]?.descriptionRu)
                : CONDITIONS_2024_DATA[selectedCondition]?.descriptionRu}
            </p>
          </div>

          <button
            type="button"
            onClick={handleApplyCondition}
            className="w-full py-2.5 px-3 rounded-sm bg-sapphire hover:bg-blue-600 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 min-w-0 cursor-pointer"
            title={
              isEn
                ? `Apply "${CONDITIONS_2024_DATA[selectedCondition]?.nameEn || selectedCondition}"`
                : `Наложить «${CONDITIONS_2024_DATA[selectedCondition]?.nameRu || selectedCondition}»`
            }
          >
            <Zap className="h-4 w-4 flex-shrink-0" />
            <span className="truncate min-w-0">
              {isEn
                ? `Apply "${CONDITIONS_2024_DATA[selectedCondition]?.nameEn || selectedCondition}"`
                : `Наложить «${CONDITIONS_2024_DATA[selectedCondition]?.nameRu || selectedCondition}»`}
            </span>
          </button>
        </div>
      )}

      {/* End Player Turn Button */}
      <div className="pt-2 border-t border-border-subtle flex items-center justify-between gap-2">
        <span className="text-[11px] text-gray-400 truncate">
          {isEn ? 'Finished action?' : 'Закончил действие?'}
        </span>
        <button
          type="button"
          onClick={() => nextTurn()}
          className="px-3.5 py-1.5 rounded-sm bg-gold/15 hover:bg-gold hover:text-black border border-gold/40 text-gold-light text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 flex-shrink-0 whitespace-nowrap cursor-pointer"
          title={
            isEn
              ? "End current player turn and pass to next combatant (Space)"
              : "Завершить ход текущего игрока и передать очередь следующему (Space)"
          }
        >
          <span>{isEn ? 'End player turn' : 'Завершить ход игрока'}</span>
          <ChevronRight className="h-3.5 w-3.5 flex-shrink-0" />
        </button>
      </div>

      {/* Expandable Character Reference Sheet (Read-Only) */}
      {(player.statblock?.traits || player.statblock?.actions) && (
        <div className="pt-2 border-t border-border-subtle/50">
          <button
            type="button"
            onClick={() => setIsRefExpanded(!isRefExpanded)}
            className="w-full flex items-center justify-between text-[11px] text-gray-400 hover:text-gray-200 py-1 cursor-pointer"
          >
            <span className="flex items-center gap-1 font-semibold truncate min-w-0">
              <BookOpen className="h-3.5 w-3.5 text-gold/70 flex-shrink-0" />
              <span className="truncate">
                {isEn ? 'Ability Reference (rolls made by player)' : 'Справочник способностей (броски выполняет игрок)'}
              </span>
            </span>
            <span className="flex-shrink-0 ml-1 text-gray-400">
              {isRefExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </span>
          </button>

          {isRefExpanded && (
            <div className="space-y-2 mt-2 p-2 bg-canvas/40 rounded border border-border-subtle/60 text-xs">
              {player.statblock?.actions?.map((act: any, i: number) => {
                const actionTitle = isEn
                  ? (act.name_en || localizeActionName(act.name, 'en'))
                  : cleanRussianText(act.name);
                const actionDesc = isEn
                  ? (act.desc_en || cleanEnglishText(act.desc))
                  : cleanRussianText(act.desc);
                return (
                  <div key={i} className="text-gray-300 border-b border-border-subtle/30 pb-1.5 last:border-b-0">
                    <div className="font-bold text-gray-100 flex items-center justify-between gap-1.5 min-w-0">
                      <span className="truncate min-w-0 flex-1" title={actionTitle}>{actionTitle}</span>
                      {act.damage_type && (
                        <span className="text-[10px] font-mono text-gray-400 flex-shrink-0 whitespace-nowrap">
                          {localizeDamageType(act.damage_type, language)}
                        </span>
                      )}
                    </div>
                    {actionDesc && (
                      <div className="text-[11px] text-gray-400 mt-0.5 leading-relaxed break-words [overflow-wrap:anywhere]">
                        {actionDesc}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
