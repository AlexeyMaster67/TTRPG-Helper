import React from 'react';
import clsx from 'clsx';
import { Crosshair, Dices, Shield, Sparkles, X, Zap } from 'lucide-react';
import { Combatant } from '../../../types/combat';
import { MasteryBadge } from '../../ui/MasteryBadge';
import { cleanRussianText } from '../../../utils/textUtils';
import { parseActionDetails, parseMultiattackPlan } from '../../../utils/attackParser';
import { resolveTokenUrl } from '../../../services/tokenResolver';
import { renderTextWithSpellBadges } from './statblockUtils';
import { useTranslation } from '../../../i18n';

export interface StatblockActionsProps {
  combatant: Combatant;
  currentTarget: Combatant | null;
  livingTargets: Combatant[];
  activeTargetingActionKey: string | null;
  attackAdvantageMode: 'normal' | 'advantage' | 'disadvantage';
  setAttackAdvantageMode: (mode: 'normal' | 'advantage' | 'disadvantage') => void;
  onPerformAttack: (action: any, actionKey?: string, e?: React.MouseEvent) => void;
  onExecuteActionRoll: (action: any, actionKey?: string, e?: React.MouseEvent) => void;
  onExecuteMultiattack: (e?: React.MouseEvent) => void;
  onSelectInlineTarget: (targetId: string, action: any, e?: React.MouseEvent) => void;
  onCloseInlineTargetPicker: () => void;
  onInspectSpell: (spellName: string) => void;
}

export function StatblockActions({
  combatant,
  currentTarget,
  livingTargets,
  activeTargetingActionKey,
  attackAdvantageMode,
  setAttackAdvantageMode,
  onPerformAttack,
  onExecuteActionRoll,
  onExecuteMultiattack,
  onSelectInlineTarget,
  onCloseInlineTargetPicker,
  onInspectSpell,
}: StatblockActionsProps) {
  const { language } = useTranslation();
  const isEn = language === 'en';
  const sb = combatant.statblock;
  const currentTargetId = currentTarget?.id;

  const multiattackAction = sb?.actions?.find((a: any) =>
    /мультиатака|multiattack/i.test(a.name)
  );

  const multiattackPlan = React.useMemo(() => {
    if (!multiattackAction || !sb?.actions) return [];
    return parseMultiattackPlan(multiattackAction, sb.actions);
  }, [multiattackAction, sb?.actions]);

  const attackSeriesCount = multiattackPlan.length;
  const hasMultiattack = Boolean(multiattackAction && attackSeriesCount > 0);

  const renderInlineTargetPicker = (actionKey: string, action: any) => {
    if (activeTargetingActionKey !== actionKey) return null;

    const actionTitle = isEn
      ? (action?.name || 'Attack')
      : cleanRussianText(action?.name || 'Атака');

    return (
      <div className="mt-2.5 p-2.5 rounded-glass-sm bg-black/85 backdrop-blur-md border border-gold/60 shadow-[0_0_16px_rgba(245,185,32,0.25)] flex flex-col gap-2 animate-in slide-in-from-top-1 duration-150">
        {/* Header with Mode toggles and close button */}
        <div className="flex items-center justify-between gap-1.5 pb-2 border-b border-white/10">
          <div className="flex items-center gap-1.5 text-xs text-gold-light font-bold truncate">
            <Crosshair className="h-4 w-4 text-red-400 animate-pulse flex-shrink-0" />
            <span className="truncate">
              {isEn ? `Target for "${actionTitle}":` : `Цель для «${actionTitle}»:`}
            </span>
          </div>

          <button
            type="button"
            onClick={onCloseInlineTargetPicker}
            className="min-h-[32px] min-w-[32px] flex items-center justify-center text-gray-400 hover:text-white rounded-glass-sm hover:bg-white/10 text-xs flex-shrink-0 transition-colors cursor-pointer"
            title={isEn ? "Close target picker" : "Закрыть выбор цели"}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Targets List */}
        <div className="max-h-40 overflow-y-auto space-y-1.5 pr-0.5">
          {livingTargets.length === 0 ? (
            <div className="text-gray-400 text-xs text-center py-3 italic">
              {isEn ? "No living targets available in combat" : "Нет живых доступных целей в бою"}
            </div>
          ) : (
            livingTargets.map((t) => {
              const tokenUrl = resolveTokenUrl(t.name, t.nameRu, t.tokenUrl);
              const initials = (t.nameRu || t.name).slice(0, 2).toUpperCase();
              const isLockedTarget = t.id === currentTargetId;
              const hpPct = Math.max(0, Math.min(100, Math.round((t.hp / (t.maxHp || 1)) * 100)));
              const targetDisplayName = isEn
                ? (t.name || t.nameRu)
                : cleanRussianText(t.nameRu || t.name);

              return (
                <div
                  key={t.id}
                  onClick={(e) => onSelectInlineTarget(t.id, action, e)}
                  className={clsx(
                    'min-h-[36px] flex items-center justify-between gap-2 p-2 rounded-glass-sm border cursor-pointer transition-all group/target select-none',
                    isLockedTarget
                      ? 'bg-red-950/50 border-red-500/70 hover:bg-red-900/60 shadow-[0_0_10px_rgba(239,68,68,0.2)]'
                      : 'bg-card/80 border-white/10 hover:border-gold/50 hover:bg-card-hover'
                  )}
                >
                  {/* Left: Avatar + Name + AC */}
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <div className="w-7 h-7 rounded-full overflow-hidden flex-shrink-0 bg-canvas flex items-center justify-center border border-white/15">
                      {tokenUrl ? (
                        <img src={tokenUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-[10px] font-mono tabular-nums font-bold text-gray-300">
                          {initials}
                        </span>
                      )}
                    </div>

                    <div className="flex flex-col min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span
                          className={clsx(
                            'text-xs font-semibold truncate',
                            t.isPlayer ? 'text-emerald-300' : 'text-gray-200'
                          )}
                          title={targetDisplayName}
                        >
                          {targetDisplayName}
                        </span>
                        {isLockedTarget && (
                          <span className="text-xs px-1.5 py-0.2 rounded-glass-sm bg-red-950 text-red-400 border border-red-800 font-mono tabular-nums flex-shrink-0 whitespace-nowrap">
                            {isEn ? "TARGET" : "ЦЕЛЬ"}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 text-xs text-gray-400 font-mono tabular-nums truncate">
                        <span className="flex items-center gap-1 flex-shrink-0 whitespace-nowrap">
                          <Shield className="h-3 w-3 text-gray-400" />
                          {isEn ? `AC ${t.ac}` : `КД ${t.ac}`}
                        </span>
                        <span className="text-gray-500 flex-shrink-0">•</span>
                        <span className={clsx(
                          'truncate whitespace-nowrap font-medium',
                          hpPct > 50 ? 'text-emerald-400' : hpPct > 20 ? 'text-amber' : 'text-red-400'
                        )}>
                          {t.hp}/{t.maxHp} {isEn ? "HP" : "ОЗ"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Strike Action Button */}
                  <button
                    type="button"
                    onClick={(e) => onSelectInlineTarget(t.id, action, e)}
                    className="min-h-[32px] flex items-center gap-1.5 px-3 py-1 rounded-glass-sm bg-crimson/30 hover:bg-crimson border border-crimson/60 hover:text-white text-red-200 font-mono tabular-nums text-xs font-bold transition-all shadow-sm flex-shrink-0 group-hover/target:scale-105 whitespace-nowrap active:scale-95 cursor-pointer"
                  >
                    <Crosshair className="h-3.5 w-3.5 text-red-400 group-hover/target:text-white flex-shrink-0" />
                    <span>{isEn ? "STRIKE" : "УДАР"}</span>
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Actions (Действия) */}
      <div className="rounded-glass-lg bg-card/70 backdrop-blur-md border border-[rgba(255,255,255,0.08)] p-3.5 shadow-sm">
        <div className="flex items-center justify-between gap-2 pb-2 mb-2.5 border-b border-white/10 text-xs font-bold uppercase tracking-wider text-gold">
          <span className="flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-gold flex-shrink-0" />
            <span>{isEn ? 'ACTIONS' : 'ДЕЙСТВИЯ'}</span>
            <Sparkles className="h-3.5 w-3.5 text-gold flex-shrink-0" />
          </span>

          {hasMultiattack && (
            <button
              type="button"
              onClick={onExecuteMultiattack}
              className="min-h-[32px] flex items-center gap-1.5 px-3 py-1 rounded-glass-sm bg-gold/20 hover:bg-gold text-gold-light hover:text-black border border-gold/50 font-bold text-xs font-mono uppercase tracking-wider transition-all shadow-[0_0_14px_rgba(245,185,32,0.25)] flex-shrink-0 whitespace-nowrap cursor-pointer active:scale-95"
              title={
                currentTarget
                  ? (isEn
                      ? `Execute series of ${attackSeriesCount} attacks on ${currentTarget.name || currentTarget.nameRu}`
                      : `Нанести серию из ${attackSeriesCount} атак по ${cleanRussianText(currentTarget.nameRu || currentTarget.name)}`)
                  : (isEn ? 'Select target for multiattack series' : 'Выбрать цель для серии мультиатаки')
              }
            >
              <Zap className="h-3.5 w-3.5 text-gold group-hover:text-black transition-colors flex-shrink-0" />
              <span>{isEn ? 'SERIES' : 'СЕРИЯ'} ({attackSeriesCount})</span>
            </button>
          )}
        </div>

        {/* Advantage / Disadvantage Selector */}
        <div className="flex items-center justify-between mb-3 p-1.5 rounded-glass-sm bg-black/40 border border-white/10">
          <span className="text-xs font-bold uppercase tracking-wider text-gray-400 font-sans flex-shrink-0">
            {isEn ? 'Attack Roll:' : 'Бросок атаки:'}
          </span>
          <div className="flex items-center gap-1 text-xs">
            <button
              type="button"
              onClick={() => setAttackAdvantageMode('disadvantage')}
              className={clsx(
                'min-h-[32px] px-3 py-1 rounded-glass-sm text-xs font-bold font-sans transition-all whitespace-nowrap flex-shrink-0 cursor-pointer',
                attackAdvantageMode === 'disadvantage'
                  ? 'bg-crimson-dark text-red-100 border border-crimson shadow-[0_0_10px_rgba(239,68,68,0.35)]'
                  : 'text-gray-400 hover:text-gray-200 border border-transparent hover:bg-white/5'
              )}
              title={isEn ? "Disadvantage on attack roll" : "Помеха на бросок атаки"}
            >
              {isEn ? "Disadv." : "Помеха"}
            </button>
            <button
              type="button"
              onClick={() => setAttackAdvantageMode('normal')}
              className={clsx(
                'min-h-[32px] px-3 py-1 rounded-glass-sm text-xs font-bold font-sans transition-all whitespace-nowrap flex-shrink-0 cursor-pointer',
                attackAdvantageMode === 'normal'
                  ? 'bg-card-hover text-gold-light border border-gold/60 shadow-[0_0_10px_rgba(245,185,32,0.25)]'
                  : 'text-gray-400 hover:text-gray-200 border border-transparent hover:bg-white/5'
              )}
              title={isEn ? "Normal attack roll" : "Обычный бросок атаки"}
            >
              {isEn ? "Normal" : "Обычно"}
            </button>
            <button
              type="button"
              onClick={() => setAttackAdvantageMode('advantage')}
              className={clsx(
                'min-h-[32px] px-3 py-1 rounded-glass-sm text-xs font-bold font-sans transition-all whitespace-nowrap flex-shrink-0 cursor-pointer',
                attackAdvantageMode === 'advantage'
                  ? 'bg-emerald-950 text-emerald-100 border border-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.35)]'
                  : 'text-gray-400 hover:text-gray-200 border border-transparent hover:bg-white/5'
              )}
              title={isEn ? "Advantage on attack roll" : "Преимущество на бросок атаки"}
            >
              {isEn ? "Adv." : "Преим."}
            </button>
          </div>
        </div>

        <div className="space-y-2.5">
          {sb?.actions && sb.actions.length > 0 ? (
            sb.actions.map((act: any, idx: number) => {
              const actionKey = `action-${idx}`;
              const isMultiattack = /мультиатака|multiattack/i.test(act.name);

              if (isMultiattack) {
                const isMultiPickerOpen = activeTargetingActionKey === 'multiattack' || activeTargetingActionKey === actionKey;
                return (
                  <div
                    key={idx}
                    className={clsx(
                      "p-3 rounded-glass bg-gradient-to-r from-amber-950/20 via-black/40 to-black/30 border transition-all flex flex-col gap-2 shadow-sm",
                      isMultiPickerOpen
                        ? "border-gold ring-1 ring-gold/50 shadow-gold-glow"
                        : "border-gold/30 hover:border-gold/60"
                    )}
                  >
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-gold-light text-xs tracking-wide">
                          {isEn ? (act.name_en || act.name) : cleanRussianText(act.name)}
                        </span>
                        <span className="px-2 py-0.5 rounded-glass-sm bg-gold/15 text-gold text-xs font-mono tabular-nums font-bold border border-gold/30">
                          {isEn
                            ? `${attackSeriesCount} ${attackSeriesCount === 1 ? 'attack' : 'attacks'}`
                            : `${attackSeriesCount} ${attackSeriesCount === 1 ? 'атака' : attackSeriesCount < 5 ? 'атаки' : 'атак'}`}
                        </span>
                      </div>

                      {/* Direct Action Button to Execute Series */}
                      <button
                        type="button"
                        onClick={onExecuteMultiattack}
                        title={
                          currentTarget
                            ? (isEn
                                ? `Execute series (${attackSeriesCount} attacks) on ${currentTarget.name || currentTarget.nameRu}`
                                : `Нанести серию (${attackSeriesCount} атак) по ${cleanRussianText(currentTarget.nameRu || currentTarget.name)}`)
                            : (isEn ? 'Select target and execute attack series' : 'Выбрать цель и нанести серию атак')
                        }
                        className={clsx(
                          "min-h-[32px] flex items-center gap-1.5 px-3 py-1 rounded-glass-sm text-xs font-mono font-bold transition-all shadow-sm whitespace-nowrap active:scale-95 cursor-pointer",
                          isMultiPickerOpen
                            ? "bg-gold text-black border border-gold shadow-[0_0_12px_rgba(245,185,32,0.4)]"
                            : "bg-gold/20 text-gold-light border border-gold/50 hover:bg-gold hover:text-black hover:shadow-[0_0_10px_rgba(245,185,32,0.3)]"
                        )}
                      >
                        <Zap className="h-3.5 w-3.5" />
                        <span>
                          {currentTarget
                            ? (isEn
                                ? `Series on ${(currentTarget.name || currentTarget.nameRu || '').split(' ')[0]}`
                                : `Серия по ${cleanRussianText(currentTarget.nameRu || currentTarget.name || '').split(' ')[0]}`)
                            : (isEn ? `Series (${attackSeriesCount})` : `Серия (${attackSeriesCount})`)}
                        </span>
                      </button>
                    </div>

                    {multiattackPlan.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 items-center">
                        <span className="text-xs text-gray-400 font-sans">{isEn ? 'Includes:' : 'Включает:'}</span>
                        {multiattackPlan.map((planAct, pIdx) => (
                          <span
                            key={pIdx}
                            className="px-2 py-0.5 rounded-glass-sm bg-black/50 border border-white/10 text-xs text-gray-300"
                          >
                            {pIdx + 1}. {isEn ? (planAct.name_en || planAct.name) : cleanRussianText(planAct.name)}
                          </span>
                        ))}
                      </div>
                    )}

                    {act.desc && (
                      <p className="text-xs text-gray-300 leading-relaxed break-words [overflow-wrap:anywhere]">
                        {renderTextWithSpellBadges(isEn ? (act.desc_en || act.desc) : cleanRussianText(act.desc), onInspectSpell)}
                      </p>
                    )}

                    {/* Direct Inline Target Selector for Multiattack */}
                    {renderInlineTargetPicker('multiattack', {
                      ...act,
                      _isMultiattack: true,
                      name: isEn ? `Multiattack Series (${attackSeriesCount})` : `Серия мультиатаки (${attackSeriesCount})`,
                    })}
                  </div>
                );
              }

              const { attackBonus, damageFormula, weaponMastery } = parseActionDetails(act);
              const isPickerOpen = activeTargetingActionKey === actionKey;
              const actionDisplayName = isEn ? (act.name_en || act.name) : cleanRussianText(act.name);

              return (
                <div
                  key={idx}
                  className={clsx(
                    "p-3 rounded-glass bg-black/35 hover:bg-black/50 border transition-all flex flex-col gap-2 shadow-sm",
                    isPickerOpen
                      ? "border-gold ring-1 ring-gold/50 shadow-gold-glow"
                      : "border-white/10 hover:border-gold/40"
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0 flex-1">
                      <span
                        onClick={(e) => onPerformAttack(act, actionKey, e)}
                        className="font-bold text-white text-xs truncate cursor-pointer hover:text-gold transition-colors tracking-wide min-w-0"
                        title={isEn ? `${actionDisplayName} • Click to select target and attack` : `${actionDisplayName} • Кликните для выбора цели и нанесения удара`}
                      >
                        {actionDisplayName}
                      </span>
                      {weaponMastery && <MasteryBadge property={weaponMastery} />}
                    </div>

                    {/* Interactive Attack and Damage Badges */}
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {/* Gold To-Hit Badge */}
                      {attackBonus !== null && (
                        <button
                          type="button"
                          onClick={(e) => onExecuteActionRoll(act, actionKey, e)}
                          title={isEn ? "Roll to hit and damage against target" : "Бросить попадание и урон по цели"}
                          className="min-h-[32px] flex items-center gap-1.5 px-2.5 py-1 rounded-glass-sm bg-gradient-to-r from-amber-600 via-amber-500 to-yellow-500 hover:from-amber-500 hover:to-yellow-400 border border-yellow-300 text-black font-mono tabular-nums text-xs font-black shadow-[0_0_12px_rgba(245,185,32,0.3)] active:scale-95 transition-all group/dice flex-shrink-0 whitespace-nowrap cursor-pointer leading-none"
                        >
                          <Dices className="h-3.5 w-3.5 text-black group-hover/dice:rotate-12 transition-transform flex-shrink-0" />
                          <span>+{attackBonus}</span>
                        </button>
                      )}

                      {/* Target Strike Trigger (Gold / Crimson Attack Button) */}
                      <button
                        type="button"
                        onClick={(e) => onPerformAttack(act, actionKey, e)}
                        title={
                          currentTarget
                            ? (isEn
                                ? `Strike ${currentTarget.name || currentTarget.nameRu}`
                                : `Нанести удар по ${cleanRussianText(currentTarget.nameRu || currentTarget.name)}`)
                            : (isEn ? "Select target for attack" : "Выбрать цель для атаки")
                        }
                        className={clsx(
                          "min-h-[32px] flex items-center gap-1.5 px-3 py-1 rounded-glass-sm font-mono text-xs font-bold transition-all shadow-sm flex-shrink-0 whitespace-nowrap cursor-pointer active:scale-95 leading-none",
                          isPickerOpen
                            ? "bg-gold text-black border-gold shadow-[0_0_12px_rgba(245,185,32,0.4)]"
                            : "bg-crimson/30 hover:bg-crimson border border-crimson/60 hover:text-white text-red-200"
                        )}
                      >
                        <Crosshair className="h-3.5 w-3.5 flex-shrink-0" />
                        <span>{isEn ? (currentTarget ? 'STRIKE' : 'TARGET') : (currentTarget ? 'УДАР' : 'ЦЕЛЬ')}</span>
                      </button>

                      {/* Interactive Dice Pill for Damage */}
                      {damageFormula && (
                        <button
                          type="button"
                          onClick={(e) => onExecuteActionRoll(act, actionKey, e)}
                          title={isEn ? `Damage: ${damageFormula} • Click to roll` : `Урон: ${damageFormula} • Нажмите для броска`}
                          className="min-h-[32px] px-2.5 py-1 rounded-glass-sm border border-red-500/30 bg-red-950/40 hover:bg-red-900/50 hover:border-red-400 text-red-200 font-mono tabular-nums text-xs font-semibold cursor-pointer transition-all flex items-center justify-center whitespace-nowrap flex-shrink-0"
                        >
                          {damageFormula}
                        </button>
                      )}
                    </div>
                  </div>

                  {act.desc && (
                    <p className="text-xs text-gray-300 leading-relaxed break-words [overflow-wrap:anywhere]">
                      {renderTextWithSpellBadges(isEn ? (act.desc_en || act.desc) : cleanRussianText(act.desc), onInspectSpell)}
                    </p>
                  )}

                  {/* Inline Target Selector */}
                  {renderInlineTargetPicker(actionKey, act)}
                </div>
              );
            })
          ) : (
            <div className="text-gray-400 italic text-xs py-1">{isEn ? 'No actions described' : 'Нет описанных действий'}</div>
          )}
        </div>
      </div>

      {/* Bonus Actions */}
      {sb?.bonus_actions && sb.bonus_actions.length > 0 && (
        <div className="rounded-glass-lg bg-card/70 backdrop-blur-md border border-[rgba(255,255,255,0.08)] p-3.5 shadow-sm">
          <div className="flex items-center gap-2 pb-2 mb-2.5 border-b border-white/10 text-xs font-bold uppercase tracking-wider text-amber-300">
            <Sparkles className="h-3.5 w-3.5 text-amber-400 flex-shrink-0" />
            <span>{isEn ? 'BONUS ACTIONS' : 'БОНУСНЫЕ ДЕЙСТВИЯ'}</span>
            <Sparkles className="h-3.5 w-3.5 text-amber-400 flex-shrink-0" />
          </div>
          <div className="space-y-2.5">
            {sb.bonus_actions.map((act: any, i: number) => {
              const bonusKey = `bonus-${i}`;
              const isPickerOpen = activeTargetingActionKey === bonusKey;
              const bonusTitle = isEn ? (act.name_en || act.name) : cleanRussianText(act.name);
              return (
                <div
                  key={i}
                  className={clsx(
                    "p-3 rounded-glass bg-black/35 hover:bg-black/50 border text-xs text-gray-300 transition-all flex flex-col gap-2 shadow-sm",
                    isPickerOpen ? "border-amber ring-1 ring-amber/40 shadow-sm" : "border-white/10 hover:border-amber/40"
                  )}
                >
                  <div className="flex items-center justify-between gap-2 min-w-0">
                    <span
                      className="font-bold text-white text-xs tracking-wide min-w-0 flex-1 truncate"
                      title={bonusTitle}
                    >
                      {bonusTitle}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => onPerformAttack(act, bonusKey, e)}
                      className="min-h-[32px] px-3 py-1 rounded-glass-sm bg-amber-500/20 hover:bg-amber-500 border border-amber-500/50 hover:text-black text-amber-200 font-mono text-xs font-bold transition-all shadow-sm uppercase flex-shrink-0 whitespace-nowrap cursor-pointer active:scale-95"
                    >
                      {isEn ? 'Use' : 'Применить'}
                    </button>
                  </div>
                  {act.desc && <p className="text-xs text-gray-300 leading-relaxed break-words [overflow-wrap:anywhere]">{renderTextWithSpellBadges(isEn ? (act.desc_en || act.desc) : cleanRussianText(act.desc), onInspectSpell)}</p>}
                  {renderInlineTargetPicker(bonusKey, act)}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Reactions */}
      {sb?.reactions && sb.reactions.length > 0 && (
        <div className="rounded-glass-lg bg-card/70 backdrop-blur-md border border-[rgba(255,255,255,0.08)] p-3.5 shadow-sm">
          <div className="flex items-center gap-2 pb-2 mb-2.5 border-b border-white/10 text-xs font-bold uppercase tracking-wider text-emerald-300">
            <Sparkles className="h-3.5 w-3.5 text-emerald-400 flex-shrink-0" />
            <span>{isEn ? 'REACTIONS' : 'РЕАКЦИИ'}</span>
            <Sparkles className="h-3.5 w-3.5 text-emerald-400 flex-shrink-0" />
          </div>
          <div className="space-y-2.5">
            {sb.reactions.map((act: any, i: number) => {
              const reactionKey = `reaction-${i}`;
              const isPickerOpen = activeTargetingActionKey === reactionKey;
              const reactionTitle = isEn ? (act.name_en || act.name) : cleanRussianText(act.name);
              return (
                <div
                  key={i}
                  className={clsx(
                    "p-3 rounded-glass bg-black/35 hover:bg-black/50 border text-xs text-gray-300 transition-all flex flex-col gap-2 shadow-sm",
                    isPickerOpen ? "border-emerald ring-1 ring-emerald/40 shadow-sm" : "border-white/10 hover:border-emerald/40"
                  )}
                >
                  <div className="flex items-center justify-between gap-2 min-w-0">
                    <span
                      className="font-bold text-white text-xs tracking-wide min-w-0 flex-1 truncate"
                      title={reactionTitle}
                    >
                      {reactionTitle}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => onPerformAttack(act, reactionKey, e)}
                      className="min-h-[32px] px-3 py-1 rounded-glass-sm bg-emerald-500/20 hover:bg-emerald-500 border border-emerald-500/50 hover:text-black text-emerald-200 font-mono text-xs font-bold transition-all shadow-sm uppercase flex-shrink-0 whitespace-nowrap cursor-pointer active:scale-95"
                    >
                      {isEn ? 'Reaction' : 'Реакция'}
                    </button>
                  </div>
                  {act.desc && <p className="text-xs text-gray-300 leading-relaxed break-words [overflow-wrap:anywhere]">{renderTextWithSpellBadges(isEn ? (act.desc_en || act.desc) : cleanRussianText(act.desc), onInspectSpell)}</p>}
                  {renderInlineTargetPicker(reactionKey, act)}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Legendary Actions */}
      {sb?.legendary_actions && sb.legendary_actions.length > 0 && (
        <div className="rounded-glass-lg bg-card/70 backdrop-blur-md border border-[rgba(255,255,255,0.08)] p-3.5 shadow-sm">
          <div className="flex items-center gap-2 pb-2 mb-2.5 border-b border-white/10 text-xs font-bold uppercase tracking-wider text-purple-300">
            <Sparkles className="h-3.5 w-3.5 text-purple-400 flex-shrink-0" />
            <span>{isEn ? 'LEGENDARY ACTIONS (3/round)' : 'ЛЕГЕНДАРНЫЕ ДЕЙСТВИЯ (3/раунд)'}</span>
            <Sparkles className="h-3.5 w-3.5 text-purple-400 flex-shrink-0" />
          </div>
          <div className="space-y-2.5">
            {sb.legendary_actions.map((act: any, i: number) => {
              const legKey = `legendary-${i}`;
              const isPickerOpen = activeTargetingActionKey === legKey;
              const legTitle = isEn ? (act.name_en || act.name) : cleanRussianText(act.name);
              return (
                <div
                  key={i}
                  className={clsx(
                    "p-3 rounded-glass bg-black/35 hover:bg-black/50 border text-xs text-gray-300 transition-all flex flex-col gap-2 shadow-sm",
                    isPickerOpen ? "border-violet ring-1 ring-violet/40 shadow-sm" : "border-white/10 hover:border-violet/40"
                  )}
                >
                  <div className="flex items-center justify-between gap-2 min-w-0">
                    <span
                      className="font-bold text-white text-xs tracking-wide min-w-0 flex-1 truncate"
                      title={legTitle}
                    >
                      {legTitle}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => onPerformAttack(act, legKey, e)}
                      className="min-h-[32px] px-3 py-1 rounded-glass-sm bg-violet/20 hover:bg-violet border border-violet/50 hover:text-white text-violet-300 font-mono text-xs font-bold transition-all shadow-sm uppercase flex-shrink-0 whitespace-nowrap cursor-pointer active:scale-95"
                    >
                      {isEn ? 'Use' : 'Применить'}
                    </button>
                  </div>
                  {act.desc && <p className="text-xs text-gray-300 leading-relaxed break-words [overflow-wrap:anywhere]">{renderTextWithSpellBadges(isEn ? (act.desc_en || act.desc) : cleanRussianText(act.desc), onInspectSpell)}</p>}
                  {renderInlineTargetPicker(legKey, act)}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}
