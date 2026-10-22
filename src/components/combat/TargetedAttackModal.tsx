import { useState, useMemo, useEffect } from 'react';
import { useCombatStore } from '../../store/combatStore';
import { usePartyStore } from '../../store/partyStore';
import { useDice3dStore } from '../../store/dice3dStore';
import { useDiceAnimationStore } from '../../store/diceAnimationStore';
import { DamageType, RollMode } from '../../types/dnd5e';
import { rollD20, rollDiceFormula } from '../../engine/rolls';
import { broadcastService } from '../../services/broadcastService';
import { Crosshair, Sparkles, Send, Swords, Dices, X, Edit3, Zap } from 'lucide-react';
import { cleanRussianText, localizeDamageType } from '../../utils/textUtils';
import { useTranslation } from '../../i18n';
import { Combatant } from '../../types/combat';
import {
  parseActionDetails,
  parseMultiattackPlan,
  computeDamageWithDefenses,
  formatDamageFormula,
  parseSaveDetails,
  getCombatantSaveModifier,
  AbilityKey,
  SaveOutcome,
  ABILITY_LABELS,
} from '../../utils/attackParser';
import {
  TargetSelector,
  AdvantageToggle,
  DamagePreview,
  HitOutcomeBanner,
  MultiattackStepLog,
} from './targeted';

function formatFormulaBreakdown(dmg: {
  formula: string;
  rolls: { count: number; sides: number; values: number[] }[];
  modifier: number;
  total: number;
}): string {
  const diceParts = dmg.rolls.flatMap((r) => r.values).join(' + ');
  const modPart = dmg.modifier > 0 ? ` + ${dmg.modifier}` : dmg.modifier < 0 ? ` - ${Math.abs(dmg.modifier)}` : '';
  return `${diceParts || dmg.total}${modPart} = ${dmg.total}`;
}

export function TargetedAttackModal() {
  const { language } = useTranslation();
  const isEn = language === 'en';

  const {
    combatants,
    targetedAttackModalOpen,
    targetedAttackAttackerId,
    targetedAttackActionName,
    closeTargetedAttack,
    applyDamage,
    addDiceLog,
  } = useCombatStore();

  const attacker = combatants.find((c) => c.id === targetedAttackAttackerId) || combatants[0];

  const getName = (c?: Combatant | null): string => {
    if (!c) return '';
    return (isEn ? (c.name || c.nameRu) : (c.nameRu || c.name)) || '';
  };

  const formatLogText = (text: string) => (isEn ? text : cleanRussianText(text));

  // Possible targets: exclude attacker and dead creatures
  const availableTargets = useMemo(() => {
    return combatants.filter((c) => c.id !== attacker?.id && !c.isDead);
  }, [combatants, attacker]);

  // Default target: preferred enemy faction
  const defaultTargetId = useMemo(() => {
    if (!attacker) return '';
    const enemy = availableTargets.find((t) =>
      attacker.isPlayer ? !t.isPlayer : t.isPlayer
    );
    return enemy ? enemy.id : availableTargets[0]?.id || '';
  }, [availableTargets, attacker]);

  const [selectedTargetId, setSelectedTargetId] = useState<string>(defaultTargetId);
  const [isAoEMode, setIsAoEMode] = useState(false);
  const [selectedAoETargetIds, setSelectedAoETargetIds] = useState<string[]>([]);

  // Cover state: 'none' | 'half' | 'threeQuarters' | 'total'
  const [cover, setCover] = useState<'none' | 'half' | 'threeQuarters' | 'total'>('none');

  // First-class mode: Attack vs DC Save
  const [attackOrSaveMode, setAttackOrSaveMode] = useState<'attack' | 'save'>('attack');

  // DC Save fields
  const [saveAbility, setSaveAbility] = useState<AbilityKey>('dex');
  const [saveDc, setSaveDc] = useState<number>(15);
  const [saveOutcome, setSaveOutcome] = useState<SaveOutcome>('half');
  const [saveDamageFormula, setSaveDamageFormula] = useState<string>('8d6');
  const [saveDamageType, setSaveDamageType] = useState<DamageType>('fire');

  // Roll Mode: 'digital' | 'physical'
  const [rollMode, setRollMode] = useState<'digital' | 'physical'>('digital');
  const [advMode, setAdvMode] = useState<RollMode>('normal');

  // Action Mode: 'action' | 'spell' | 'custom'
  const [actionMode, setActionMode] = useState<'action' | 'spell' | 'custom'>('action');
  const [selectedActionIndex, setSelectedActionIndex] = useState<number>(0);

  // Custom Action fields
  const [customName, setCustomName] = useState(isEn ? 'Weapon Attack' : 'Атака оружием');
  const [customToHit, setCustomToHit] = useState(5);
  const [customFormula, setCustomFormula] = useState('1d8+3');
  const [customDamageType, setCustomDamageType] = useState<DamageType>('slashing');

  // Sync customName default on language change if user hasn't modified it
  useEffect(() => {
    if (actionMode === 'custom') {
      if (isEn && customName === 'Атака оружием') {
        setCustomName('Weapon Attack');
      } else if (!isEn && customName === 'Weapon Attack') {
        setCustomName('Атака оружием');
      }
    }
  }, [isEn, actionMode, customName]);

  // Physical Dice Inputs
  const [physicalD20, setPhysicalD20] = useState('');
  const [physicalRawDamage, setPhysicalRawDamage] = useState('');
  const [physicalTotalOverride, setPhysicalTotalOverride] = useState('');
  const [physicalDamageType, setPhysicalDamageType] = useState<DamageType>('slashing');

  // Calculation Results
  const [hasCalculated, setHasCalculated] = useState(false);
  const [isHit, setIsHit] = useState(false);
  const [isCrit, setIsCrit] = useState(false);
  const [hitOutcomeText, setHitOutcomeText] = useState('');
  const [damageDetailText, setDamageDetailText] = useState('');
  const [defenseNoticeText, setDefenseNoticeText] = useState('');
  const [finalCalculatedDamage, setFinalCalculatedDamage] = useState(0);
  const [multiattackLogs, setMultiattackLogs] = useState<MultiattackStepLog[]>([]);
  const [concentrationCheckDc, setConcentrationCheckDc] = useState<number | null>(null);

  // Option to broadcast to players
  const [broadcastToPlayers, setBroadcastToPlayers] = useState(true);

  // Sync pre-selected action name from props
  useEffect(() => {
    if (targetedAttackActionName && attacker?.statblock?.actions) {
      const idx = attacker.statblock.actions.findIndex(
        (a) => a.name.toLowerCase() === targetedAttackActionName.toLowerCase()
      );
      if (idx >= 0) {
        setSelectedActionIndex(idx);
        setActionMode('action');
      }
    }
  }, [targetedAttackActionName, attacker]);

  useEffect(() => {
    if (attacker?.isPlayer) {
      setRollMode('physical');
    }
  }, [attacker?.isPlayer]);

  useEffect(() => {
    if (!selectedTargetId && defaultTargetId) {
      setSelectedTargetId(defaultTargetId);
    }
  }, [defaultTargetId, selectedTargetId]);

  const target = combatants.find((c) => c.id === selectedTargetId);

  // Cover AC bonus: Half Cover (+2 AC), Three-Quarters Cover (+5 AC)
  const coverAcBonus = cover === 'half' ? 2 : cover === 'threeQuarters' ? 5 : 0;
  const effectiveTargetAc = (target?.ac ?? 10) + coverAcBonus;

  // Current selected action details parsed
  const currentAction = actionMode === 'action' && attacker?.statblock?.actions?.[selectedActionIndex]
    ? attacker.statblock.actions[selectedActionIndex]
    : null;

  const currentActionDetails = useMemo(() => {
    let actName = customName;
    let toHitMod = customToHit;
    let formula = customFormula;
    let dmgType: DamageType = customDamageType;

    if (currentAction) {
      const parsed = parseActionDetails(currentAction);
      actName = isEn ? currentAction.name : cleanRussianText(currentAction.name);
      toHitMod = parsed.attackBonus ?? 5;
      formula = parsed.damageFormula || '1d8+3';
      dmgType = (parsed.damageType?.toLowerCase() || 'slashing') as DamageType;
    }

    return {
      name: actName,
      attackBonus: toHitMod,
      damageFormula: formula,
      damageType: dmgType,
    };
  }, [currentAction, customName, customToHit, customFormula, customDamageType, isEn]);

  // Reset calculated result when parameters change
  const resetResults = () => {
    setHasCalculated(false);
    setIsHit(false);
    setIsCrit(false);
    setHitOutcomeText('');
    setDamageDetailText('');
    setDefenseNoticeText('');
    setFinalCalculatedDamage(0);
    setMultiattackLogs([]);
    setConcentrationCheckDc(null);
  };

  // Auto-detect DC Save from selected monster action
  useEffect(() => {
    if (actionMode === 'action' && currentAction) {
      const parsedSave = parseSaveDetails(currentAction);
      if (parsedSave.isSave) {
        setAttackOrSaveMode('save');
        setSaveAbility(parsedSave.saveAbility);
        setSaveDc(parsedSave.dc);
        setSaveOutcome(parsedSave.saveOutcome);
        setSaveDamageFormula(parsedSave.damageFormula);
        setSaveDamageType(parsedSave.damageType);
        if (parsedSave.isAoE) {
          setIsAoEMode(true);
        }
      } else {
        setAttackOrSaveMode('attack');
      }
      resetResults();
    }
  }, [currentAction, actionMode]);

  // Sync damage type for physical mode when action changes
  useEffect(() => {
    setPhysicalDamageType(currentActionDetails.damageType);
  }, [currentActionDetails.damageType]);

  const critFormula = useMemo(() => {
    return currentActionDetails.damageFormula.replace(/(\d+)d(\d+)/g, (_m, count, sides) => {
      return `${parseInt(count, 10) * 2}d${sides}`;
    });
  }, [currentActionDetails.damageFormula]);

  // Re-calculate physical mode outcome immediately upon input
  const calculatePhysicalOutcome = (
    d20ValStr: string,
    rawDmgStr?: string,
    totalOverrideStr?: string
  ) => {
    if (!target) return;

    if (!d20ValStr || d20ValStr.trim() === '') {
      resetResults();
      return;
    }

    const num = parseInt(d20ValStr, 10);
    const mod = currentActionDetails.attackBonus;
    const targetAc = effectiveTargetAc;

    if (isNaN(num) || num < 1 || num > 20) {
      setHasCalculated(true);
      setIsHit(false);
      setIsCrit(false);
      setHitOutcomeText(
        isEn
          ? 'Enter a d20 roll value between 1 and 20'
          : 'Введите значение броска d20 от 1 до 20'
      );
      setDamageDetailText('');
      setDefenseNoticeText('');
      setFinalCalculatedDamage(0);
      setConcentrationCheckDc(null);
      return;
    }

    if (cover === 'total') {
      setHasCalculated(true);
      setIsHit(false);
      setIsCrit(false);
      setHitOutcomeText(
        isEn
          ? 'TOTAL COVER! Target cannot be targeted directly by attacks.'
          : 'ПОЛНОЕ УКРЫТИЕ! Цель за сплошным укрытием и не может быть атакована напрямую.'
      );
      setDamageDetailText(
        isEn
          ? 'Total cover provides full obstruction from attacks and spells.'
          : 'Полное укрытие полностью защищает от прямых атак и направленных заклинаний.'
      );
      setDefenseNoticeText('');
      setFinalCalculatedDamage(0);
      setConcentrationCheckDc(null);
      return;
    }

    setHasCalculated(true);

    let hit = false;
    let crit = false;
    const modStr = mod >= 0 ? `+${mod}` : `${mod}`;

    if (num === 20) {
      hit = true;
      crit = true;
      const sum = 20 + mod;
      setHitOutcomeText(
        isEn
          ? `CRITICAL HIT! TOTAL: 20 + ${modStr} = ${sum} vs Target AC (${targetAc}) -> HIT!`
          : `КРИТИЧЕСКОЕ ПОПАДАНИЕ (КРИТ!) ИТОГ: 20 + ${modStr} = ${sum} против КД Цели (${targetAc}) -> ПОПАДАНИЕ!`
      );
    } else if (num === 1) {
      hit = false;
      crit = false;
      const sum = 1 + mod;
      setHitOutcomeText(
        isEn
          ? `AUTOMATIC MISS! TOTAL: 1 + ${modStr} = ${sum} vs Target AC (${targetAc}) -> MISS!`
          : `АВТОМАТИЧЕСКИЙ ПРОМАХ! ИТОГ: 1 + ${modStr} = ${sum} против КД Цели (${targetAc}) -> ПРОМАХ!`
      );
      setDamageDetailText(
        isEn
          ? 'Natural 1 on d20 is an automatic miss regardless of attack bonus.'
          : 'Бросок 1 на кости d20 — автоматический промах независимо от бонуса к атаке.'
      );
      setDefenseNoticeText('');
      setFinalCalculatedDamage(0);
      setConcentrationCheckDc(null);
      setIsHit(false);
      setIsCrit(false);
      return;
    } else {
      const sum = num + mod;
      hit = sum >= targetAc;
      crit = false;
      setHitOutcomeText(
        isEn
          ? `${hit ? 'HIT!' : 'MISS!'} TOTAL: ${num} + ${modStr} = ${sum} vs Target AC (${targetAc}) -> ${hit ? 'HIT!' : 'MISS!'}`
          : `${hit ? 'ПОПАДАНИЕ!' : 'ПРОМАХ!'} ИТОГ: ${num} + ${modStr} = ${sum} против КД Цели (${targetAc}) -> ${hit ? 'ПОПАДАНИЕ!' : 'ПРОМАХ!'}`
      );
    }

    setIsHit(hit);
    setIsCrit(crit);

    if (!hit) {
      const sum = num + mod;
      setDamageDetailText(
        isEn
          ? `Attack total (${sum}) does not meet target defense (Target AC ${targetAc}).`
          : `Сумма атаки (${sum}) не пробивает защиту цели (КД ${targetAc}).`
      );
      setDefenseNoticeText('');
      setFinalCalculatedDamage(0);
      setConcentrationCheckDc(null);
      return;
    }

    // HIT: Calculate damage
    const dmgType = physicalDamageType || currentActionDetails.damageType;
    let finalDmg = 0;
    let detailText = '';
    let noticeText = '';

    if (totalOverrideStr !== undefined && totalOverrideStr.trim() !== '') {
      finalDmg = Math.max(0, parseInt(totalOverrideStr, 10) || 0);
      detailText = isEn
        ? `Total damage set manually: ${finalDmg} (${localizeDamageType(dmgType, language)})`
        : `Итоговый суммарный урон задан вручную: ${finalDmg} (${localizeDamageType(dmgType, language)})`;
      noticeText = isEn
        ? 'Damage entered manually by DM (unmodified).'
        : 'Урон введён вручную мастером (без модификаторов).';
    } else {
      const effectiveRawStr = rawDmgStr !== undefined ? rawDmgStr : physicalRawDamage;
      if (effectiveRawStr && effectiveRawStr.trim() !== '') {
        const rawDmg = Math.max(0, parseInt(effectiveRawStr, 10) || 0);
        const def = computeDamageWithDefenses(rawDmg, dmgType, target, language);
        finalDmg = def.finalDmg;
        detailText = isEn
          ? `Raw table damage: ${rawDmg} (${localizeDamageType(dmgType, language)})`
          : `Чистый урон со стола: ${rawDmg} (${localizeDamageType(dmgType, language)})`;
        noticeText = def.notice;
      } else {
        detailText = isEn
          ? 'Click "Roll Formula" or enter raw damage from table.'
          : 'Нажмите «Бросить формулу урона» или введите урон со стола.';
      }
    }

    setFinalCalculatedDamage(finalDmg);
    setDamageDetailText(detailText);
    setDefenseNoticeText(noticeText);

    if (finalDmg > 0 && target.isConcentrating) {
      setConcentrationCheckDc(Math.max(10, Math.floor(finalDmg / 2)));
    } else {
      setConcentrationCheckDc(null);
    }
  };

  // Roll formula in physical mode
  const handleRollFormulaInPhysicalMode = () => {
    if (!target) return;
    const formulaToRoll = isCrit ? critFormula : currentActionDetails.damageFormula;
    const dmgRoll = rollDiceFormula(formulaToRoll);
    const raw = dmgRoll.total;

    setPhysicalRawDamage(String(raw));
    setPhysicalTotalOverride('');

    const dmgType = physicalDamageType || currentActionDetails.damageType;
    const def = computeDamageWithDefenses(raw, dmgType, target, language);

    setFinalCalculatedDamage(def.finalDmg);
    setDamageDetailText(
      isEn
        ? `Formula roll (${isCrit ? 'CRIT x2 dice' : 'normal'}): ${formatFormulaBreakdown(dmgRoll)} (${localizeDamageType(dmgType, language)})`
        : `Бросок формулы (${isCrit ? 'КРИТ x2 кубы' : 'обычный'}): ${formatFormulaBreakdown(dmgRoll)} (${localizeDamageType(dmgType, language)})`
    );
    setDefenseNoticeText(def.notice);

    if (def.finalDmg > 0 && target.isConcentrating) {
      setConcentrationCheckDc(Math.max(10, Math.floor(def.finalDmg / 2)));
    } else {
      setConcentrationCheckDc(null);
    }
  };

  // 1. AUTO ROLL SINGLE ATTACK (DIGITAL D20)
  const handleAutoRoll = () => {
    if (!target && !isAoEMode) return;

    const actName = currentActionDetails.name;
    const toHitMod = currentActionDetails.attackBonus;
    const formula = currentActionDetails.damageFormula;
    const dmgType: DamageType = currentActionDetails.damageType;

    if (isAoEMode) {
      handleAoEAutoRoll(actName, toHitMod, formula, dmgType);
      return;
    }

    if (!target) return;

    if (cover === 'total') {
      setHasCalculated(true);
      setIsHit(false);
      setIsCrit(false);
      setHitOutcomeText(
        isEn
          ? 'TOTAL COVER! Target cannot be targeted directly by attacks.'
          : 'ПОЛНОЕ УКРЫТИЕ! Цель за сплошным укрытием и не может быть атакована напрямую.'
      );
      setDamageDetailText(
        isEn
          ? 'Total cover provides full obstruction from attacks and spells.'
          : 'Полное укрытие полностью защищает от прямых атак и направленных заклинаний.'
      );
      setDefenseNoticeText('');
      setFinalCalculatedDamage(0);
      setConcentrationCheckDc(null);
      return;
    }

    // Roll d20 with advantage mode
    const d20 = rollD20(advMode, toHitMod);
    const attackTotal = d20.total;
    const isNat20 = d20.isNatural20;
    const isNat1 = d20.isNatural1;
    const targetAc = effectiveTargetAc;
    const rollLog = `[d20: ${d20.keptRoll} + ${d20.modifier} = ${d20.total}]`;

    const hit = !isNat1 && (isNat20 || attackTotal >= targetAc);
    setIsHit(hit);
    setIsCrit(isNat20);
    const diceToRoll: Array<{ sides: number; result: number }> =
      d20.d20_2 !== undefined
        ? [
            { sides: 20, result: d20.d20_1 },
            { sides: 20, result: d20.d20_2 },
          ]
        : [{ sides: 20, result: d20.keptRoll }];

    const attackerName = getName(attacker);
    const targetName = getName(target);

    if (!hit) {
      setHitOutcomeText(
        isEn
          ? `MISS! ${rollLog} vs Target AC ${targetAc}`
          : `ПРОМАХ! ${rollLog} против КД ${targetAc}`
      );
      setDamageDetailText(
        isEn
          ? 'The attack missed or was deflected by armor.'
          : 'Атака прошла мимо цели или отражена бронёй.'
      );
      setDefenseNoticeText('');
      setFinalCalculatedDamage(0);
      setConcentrationCheckDc(null);

      useDiceAnimationStore.getState().triggerRoll({
        title: isEn
          ? `${attackerName}: ${actName} (Miss)`
          : `${attackerName}: ${actName} (Промах)`,
        subtitle: isEn
          ? `Miss vs ${targetName} [${attackTotal} vs Target AC ${targetAc}]`
          : `Промах по ${targetName} [${attackTotal} против КД ${targetAc}]`,
        sides: 20,
        r1: d20.d20_1,
        r2: d20.d20_2,
        kept: d20.keptRoll,
        modifier: toHitMod,
        total: attackTotal,
        mode: advMode,
        isNat1: d20.isNatural1,
        isNat20: false,
        rollerName: attackerName,
        targetName: targetName,
      });

      if (useDice3dStore.getState().is3dEnabled) {
        useDice3dStore.getState().rollDice3d({
          dice: diceToRoll,
          title: isEn
            ? `${attackerName}: ${actName} (Miss)`
            : `${attackerName}: ${actName} (Промах)`,
          total: attackTotal,
          isSecret: useDice3dStore.getState().isSecretRoll,
          rollMode: advMode,
        });
      }
      return;
    }

    // Double dice formula on critical hit
    let damageFormulaToRoll = formula;
    if (isNat20) {
      damageFormulaToRoll = formula.replace(/(\d+)d(\d+)/g, (_m, count, sides) => {
        return `${parseInt(count, 10) * 2}d${sides}`;
      });
    }

    const dmgRoll = rollDiceFormula(damageFormulaToRoll);
    const rawDamage = dmgRoll.total;
    const { finalDmg, notice } = computeDamageWithDefenses(rawDamage, dmgType, target, language);
    const breakdown = formatFormulaBreakdown(dmgRoll);

    // Collect damage dice for 2D/3D animation
    const poolDice: Array<{ id: string; sides: number; value: number }> = [];
    if (dmgRoll.rolls) {
      let dIdx = 0;
      for (const r of dmgRoll.rolls) {
        for (const val of r.values) {
          diceToRoll.push({ sides: r.sides, result: val });
          poolDice.push({ id: `dmg-${r.sides}-${dIdx++}`, sides: r.sides, value: val });
        }
      }
    }

    useDiceAnimationStore.getState().triggerRoll({
      title: isEn
        ? `${attackerName}: ${actName} (${isNat20 ? 'CRITICAL HIT!' : 'HIT!'})`
        : `${attackerName}: ${actName} (${isNat20 ? 'КРИТ!' : 'Хит!'})`,
      subtitle: isEn
        ? `Target: ${targetName} [Target AC ${targetAc}]`
        : `По цели: ${targetName} [КД ${targetAc}]`,
      dice: poolDice.length > 0 ? poolDice : [{ id: 'dmg-static', sides: 6, value: finalDmg }],
      modifier: dmgRoll.modifier || 0,
      total: rawDamage,
      damageType: localizeDamageType(dmgType, language),
      isNat20,
      rollerName: attackerName,
      targetName: targetName,
    });

    if (useDice3dStore.getState().is3dEnabled) {
      useDice3dStore.getState().rollDice3d({
        dice: diceToRoll,
        title: `${attackerName}: ${actName}`,
        total: rawDamage,
        isSecret: useDice3dStore.getState().isSecretRoll,
        rollMode: advMode,
      });
    }

    setFinalCalculatedDamage(finalDmg);
    setHitOutcomeText(
      isEn
        ? `${isNat20 ? 'CRITICAL HIT!' : 'HIT!'} ${rollLog} vs Target AC ${targetAc}`
        : `${isNat20 ? 'КРИТИЧЕСКОЕ ' : ''}ПОПАДАНИЕ! ${rollLog} против КД ${targetAc}`
    );
    setDamageDetailText(
      isEn
        ? `Damage roll: ${breakdown} (${localizeDamageType(dmgType, language)})`
        : `Бросок урона: ${breakdown} (${localizeDamageType(dmgType, language)})`
    );
    setDefenseNoticeText(notice);

    if (finalDmg > 0 && target.isConcentrating) {
      setConcentrationCheckDc(Math.max(10, Math.floor(finalDmg / 2)));
    } else {
      setConcentrationCheckDc(null);
    }
  };

  // 2. MULTIATTACK SERIES (DIGITAL)
  const handleMultiattackSeries = () => {
    if (!target || !attacker?.statblock?.actions) return;
    const multiattackAction = attacker.statblock.actions.find((a: any) =>
      /мультиатака|multiattack/i.test(a.name)
    );
    const attacks = parseMultiattackPlan(multiattackAction, attacker.statblock.actions);

    if (attacks.length === 0) {
      handleAutoRoll();
      return;
    }

    const logs: MultiattackStepLog[] = [];
    let totalDmg = 0;
    let highestDmg = 0;
    const multiDice: Array<{ id: string; sides: number; value: number }> = [];
    const attackerName = getName(attacker);
    const targetName = getName(target);
    const targetAc = effectiveTargetAc;

    for (const act of attacks) {
      const parsed = parseActionDetails(act);
      const toHitMod = parsed.attackBonus ?? 5;
      const formula = parsed.damageFormula || '1d8+3';
      const dmgType: DamageType = (parsed.damageType?.toLowerCase() || 'slashing') as DamageType;

      const d20 = rollD20(advMode, toHitMod);
      const isNat20 = d20.isNatural20;
      const isNat1 = d20.isNatural1;
      const hit = !isNat1 && (isNat20 || d20.total >= targetAc) && cover !== 'total';
      const rollLog = `[d20: ${d20.keptRoll} + ${d20.modifier} = ${d20.total}]`;

      if (!hit) {
        logs.push({
          actionName: act.name,
          d20Log: isEn ? `${rollLog} vs Target AC ${targetAc}` : `${rollLog} против КД ${targetAc}`,
          isHit: false,
          isCrit: false,
          damage: 0,
          damageType: dmgType,
          notes: isEn ? 'MISS!' : 'ПРОМАХ',
        });
        continue;
      }

      let rollFormula = formula;
      if (isNat20) {
        rollFormula = formula.replace(/(\d+)d(\d+)/g, (_m, count, sides) => `${parseInt(count, 10) * 2}d${sides}`);
      }

      const dmgResult = rollDiceFormula(rollFormula);
      if (dmgResult.rolls) {
        for (const r of dmgResult.rolls) {
          for (const v of r.values) {
            multiDice.push({
              id: `m-${r.sides}-${multiDice.length}`,
              sides: r.sides,
              value: v,
            });
          }
        }
      }
      const { finalDmg, notice } = computeDamageWithDefenses(dmgResult.total, dmgType, target, language);
      totalDmg += finalDmg;
      if (finalDmg > highestDmg) highestDmg = finalDmg;

      logs.push({
        actionName: act.name,
        d20Log: isEn ? `${rollLog} vs Target AC ${targetAc}` : `${rollLog} против КД ${targetAc}`,
        isHit: true,
        isCrit: isNat20,
        damage: finalDmg,
        damageType: dmgType,
        notes: isNat20
          ? (isEn ? `CRITICAL HIT! ${notice}` : `КРИТ! ${notice}`)
          : notice || (isEn ? 'HIT!' : 'ПОПАДАНИЕ'),
      });
    }

    setMultiattackLogs(logs);
    setFinalCalculatedDamage(totalDmg);
    setIsHit(totalDmg > 0);
    setIsCrit(logs.some((l) => l.isCrit));
    setHasCalculated(true);

    const hitsCount = logs.filter((l) => l.isHit).length;
    const missCount = logs.filter((l) => !l.isHit).length;

    setHitOutcomeText(
      isEn
        ? `Multiattack Series: ${attacks.length} attacks against "${targetName}"!`
        : `Серия из ${attacks.length} атак по «${targetName}»!`
    );
    setDamageDetailText(
      isEn
        ? `Total damage dealt: ${totalDmg}.`
        : `Суммарно нанесено: ${totalDmg} урона.`
    );
    setDefenseNoticeText(
      isEn
        ? `Attacks: ${hitsCount} hit, ${missCount} missed.`
        : `Удары: ${hitsCount} попало, ${missCount} промахов.`
    );

    if (totalDmg > 0) {
      useDiceAnimationStore.getState().triggerRoll({
        title: isEn
          ? `${attackerName}: Multiattack Series (${hitsCount}/${attacks.length} hits)`
          : `${attackerName}: Мультиатака (${hitsCount}/${attacks.length} хитов)`,
        subtitle: isEn
          ? `Target: ${targetName} • Dealt ${totalDmg} damage`
          : `По цели: ${targetName} • Нанесено ${totalDmg} урона`,
        dice: multiDice.length > 0 ? multiDice : [{ id: 'm-static', sides: 6, value: totalDmg }],
        total: totalDmg,
        isNat20: logs.some((l) => l.isCrit),
        rollerName: attackerName,
        targetName: targetName,
      });
    } else {
      useDiceAnimationStore.getState().triggerRoll({
        title: isEn
          ? `${attackerName}: Multiattack Series (All missed)`
          : `${attackerName}: Мультиатака (Все мимо)`,
        subtitle: isEn
          ? `Series vs ${targetName} [0/${attacks.length} hits]`
          : `Серия по цели: ${targetName} [0/${attacks.length} попаданий]`,
        sides: 20,
        kept: 0,
        modifier: 0,
        total: 0,
        rollerName: attackerName,
        targetName: targetName,
      });
    }

    if (totalDmg > 0 && target.isConcentrating) {
      setConcentrationCheckDc(Math.max(10, Math.floor(highestDmg / 2)));
    } else {
      setConcentrationCheckDc(null);
    }
  };

  // 3. AOE AUTO ROLL
  const handleAoEAutoRoll = (
    actName: string,
    toHitMod: number,
    formula: string,
    dmgType: DamageType
  ) => {
    const targets = combatants.filter((c) => selectedAoETargetIds.includes(c.id));
    if (targets.length === 0) return;

    const baseDmgRoll = rollDiceFormula(formula);
    let totalDmg = 0;
    const logs: MultiattackStepLog[] = [];

    for (const t of targets) {
      const d20 = rollD20(advMode, toHitMod);
      const isNat20 = d20.isNatural20;
      const isNat1 = d20.isNatural1;
      const hit = !isNat1 && (isNat20 || d20.total >= t.ac);
      const rollLog = `[d20: ${d20.keptRoll} + ${d20.modifier} = ${d20.total}]`;
      const tName = getName(t);

      if (!hit) {
        logs.push({
          actionName: tName,
          d20Log: isEn ? `${rollLog} vs Target AC ${t.ac}` : `${rollLog} против КД ${t.ac}`,
          isHit: false,
          isCrit: false,
          damage: 0,
          damageType: dmgType,
          notes: isEn ? 'MISS!' : 'ПРОМАХ',
        });
        continue;
      }

      let raw = baseDmgRoll.total;
      if (isNat20) raw = Math.round(raw * 1.5);
      const { finalDmg, notice } = computeDamageWithDefenses(raw, dmgType, t, language);
      totalDmg += finalDmg;

      logs.push({
        actionName: tName,
        d20Log: isEn ? `${rollLog} vs Target AC ${t.ac}` : `${rollLog} против КД ${t.ac}`,
        isHit: true,
        isCrit: isNat20,
        damage: finalDmg,
        damageType: dmgType,
        notes: isNat20
          ? (isEn ? `CRITICAL HIT! ${notice}` : `КРИТ! ${notice}`)
          : notice || (isEn ? 'HIT!' : 'ПОПАДАНИЕ'),
      });
    }

    setMultiattackLogs(logs);
    setFinalCalculatedDamage(totalDmg);
    setIsHit(totalDmg > 0);
    setHasCalculated(true);
    setHitOutcomeText(
      isEn
        ? `Attack/Spell "${actName}" against ${targets.length} targets!`
        : `Атака/заклинание «${actName}» по ${targets.length} целям!`
    );
    setDamageDetailText(
      isEn
        ? `Base damage: ${formatFormulaBreakdown(baseDmgRoll)} (${localizeDamageType(dmgType, language)}) | Total: ${totalDmg} damage`
        : `Базовый урон: ${formatFormulaBreakdown(baseDmgRoll)} (${localizeDamageType(dmgType, language)}) | Суммарно: ${totalDmg} урона`
    );
    setDefenseNoticeText(
      isEn
        ? 'Defenses for each target calculated individually.'
        : 'Сопротивления каждой цели рассчитаны индивидуально.'
    );
  };

  // 4. ROLL SAVING THROWS (SINGLE TARGET OR AOE)
  const handleRollSave = () => {
    const targets = isAoEMode
      ? combatants.filter((c) => selectedAoETargetIds.includes(c.id))
      : target ? [target] : [];

    if (targets.length === 0) return;

    // Roll base damage once for the saving throw / spell
    const dmgRoll = rollDiceFormula(saveDamageFormula || '1d8');
    const baseDamage = Math.max(0, dmgRoll.total);
    const formulaBreakdown = formatFormulaBreakdown(dmgRoll);
    const abilityInfo = ABILITY_LABELS[saveAbility];
    const abilityName = isEn ? abilityInfo.en : abilityInfo.ru;
    const abilityShort = isEn ? abilityInfo.en : abilityInfo.shortRu;
    const partyMembers = usePartyStore.getState().members;
    const attackerName = getName(attacker);

    const savePoolDice: Array<{ id: string; sides: number; value: number }> = [];
    if (dmgRoll.rolls) {
      let sIdx = 0;
      for (const r of dmgRoll.rolls) {
        for (const val of r.values) {
          savePoolDice.push({ id: `save-dmg-${r.sides}-${sIdx++}`, sides: r.sides, value: val });
        }
      }
    }
    useDiceAnimationStore.getState().triggerRoll({
      title: isEn
        ? `${attackerName}: Damage (${abilityName} Saving Throw DC ${saveDc})`
        : `${attackerName}: Урон (Спасбросок ${abilityName} Сл ${saveDc})`,
      subtitle: isEn
        ? `Damage roll: ${formulaBreakdown}`
        : `Бросок урона: ${formulaBreakdown}`,
      dice: savePoolDice.length > 0 ? savePoolDice : [{ id: 'save-static', sides: 6, value: baseDamage }],
      modifier: dmgRoll.modifier || 0,
      total: baseDamage,
      damageType: localizeDamageType(saveDamageType, language),
      rollerName: attackerName,
    });

    if (useDice3dStore.getState().is3dEnabled) {
      const diceToRoll: Array<{ sides: number; result: number }> = [];
      if (dmgRoll.rolls) {
        for (const r of dmgRoll.rolls) {
          for (const val of r.values) {
            diceToRoll.push({ sides: r.sides, result: val });
          }
        }
      }
      if (diceToRoll.length > 0) {
        useDice3dStore.getState().rollDice3d({
          dice: diceToRoll,
          title: isEn
            ? `${attackerName}: ${abilityName} Saving Throw`
            : `${attackerName}: Спасбросок ${abilityName}`,
          total: baseDamage,
          isSecret: useDice3dStore.getState().isSecretRoll,
        });
      }
    }

    const logs: MultiattackStepLog[] = [];
    let totalAppliedDamage = 0;
    let highestDmg = 0;

    for (const t of targets) {
      const d20 = Math.floor(Math.random() * 20) + 1;
      const partyMember = t.isPlayer ? partyMembers.find((m) => m.id === t.id || m.name === t.name) : undefined;
      const { modifier: mod } = getCombatantSaveModifier(t, saveAbility, partyMember);
      // Dexterity saves gain bonus from cover (+2 for half, +5 for 3/4)
      const coverBonus = saveAbility === 'dex' ? (cover === 'half' ? 2 : cover === 'threeQuarters' ? 5 : 0) : 0;
      const totalMod = mod + coverBonus;
      const total = d20 + totalMod;
      const isSuccess = total >= saveDc;
      const modStr = totalMod >= 0 ? `+${totalMod}` : `${totalMod}`;

      // Damage calculation before defenses
      let rawDamage = 0;
      if (isSuccess) {
        rawDamage = saveOutcome === 'half' ? Math.floor(baseDamage / 2) : 0;
      } else {
        rawDamage = baseDamage;
      }

      // Defenses (Immunities, Resistances, Vulnerabilities)
      const { finalDmg, notice } = computeDamageWithDefenses(rawDamage, saveDamageType, t, language);
      totalAppliedDamage += finalDmg;
      if (finalDmg > highestDmg) highestDmg = finalDmg;

      const outcomeLabel = isEn
        ? (isSuccess ? 'SUCCESS' : 'FAILURE')
        : (isSuccess ? 'УСПЕХ' : 'ПРОВАЛ');
      const outcomeNote = notice ? `${outcomeLabel}! ${notice}` : outcomeLabel;
      const tName = getName(t);

      logs.push({
        actionName: tName,
        d20Log: isEn
          ? `d20 (${d20}) ${modStr} = ${total} vs DC ${saveDc} [${abilityShort}] -> ${outcomeLabel}`
          : `d20 (${d20}) ${modStr} = ${total} против СЛ ${saveDc} [${abilityShort}] -> ${outcomeLabel}`,
        isHit: !isSuccess || finalDmg > 0,
        isCrit: false,
        damage: finalDmg,
        damageType: saveDamageType,
        notes: outcomeNote,
      });
    }

    setMultiattackLogs(logs);
    setFinalCalculatedDamage(totalAppliedDamage);
    setIsHit(totalAppliedDamage > 0);
    setHasCalculated(true);

    const actionTitle = currentAction?.name || customName || (isEn ? 'Saving Throw (DC Save)' : 'Спасбросок');
    if (targets.length === 1) {
      const singleLog = logs[0];
      setHitOutcomeText(
        isEn
          ? `${abilityName} Saving Throw (DC Save) vs DC ${saveDc}: ${singleLog.d20Log}`
          : `Спасбросок ${abilityName} против СЛ ${saveDc}: ${singleLog.d20Log}`
      );
      setDamageDetailText(
        isEn
          ? `Formula roll: ${formulaBreakdown} (${localizeDamageType(saveDamageType, language)}) | Total: ${singleLog.damage} damage`
          : `Бросок формулы: ${formulaBreakdown} (${localizeDamageType(saveDamageType, language)}) | Итог: ${singleLog.damage} урона`
      );
      setDefenseNoticeText(singleLog.notes);
    } else {
      const successes = logs.filter((l) => l.d20Log.includes(isEn ? 'SUCCESS' : 'УСПЕХ')).length;
      const fails = logs.filter((l) => l.d20Log.includes(isEn ? 'FAILURE' : 'ПРОВАЛ')).length;
      setHitOutcomeText(
        isEn
          ? `${abilityName} Saving Throw (DC Save) DC ${saveDc} ("${actionTitle}") against ${targets.length} targets!`
          : `Спасбросок ${abilityName} СЛ ${saveDc} («${actionTitle}») по ${targets.length} целям!`
      );
      setDamageDetailText(
        isEn
          ? `Base damage: ${formulaBreakdown} (${localizeDamageType(saveDamageType, language)}) | Total: ${totalAppliedDamage} damage`
          : `Базовый урон: ${formulaBreakdown} (${localizeDamageType(saveDamageType, language)}) | Суммарно: ${totalAppliedDamage} урона`
      );
      setDefenseNoticeText(
        isEn
          ? `Successes: ${successes}, Failures: ${fails}. Target defenses applied.`
          : `Успехов: ${successes}, Провалов: ${fails}. Защита целей учтена.`
      );
    }

    // Concentration DC Check
    if (totalAppliedDamage > 0 && targets.some((t) => t.isConcentrating && logs.find((l) => l.actionName === getName(t))?.damage! > 0)) {
      setConcentrationCheckDc(Math.max(10, Math.floor(highestDmg / 2)));
    } else {
      setConcentrationCheckDc(null);
    }
  };

  // 5. APPLY DAMAGE & BROADCAST
  const handleApplyDamage = () => {
    if (!hasCalculated || finalCalculatedDamage <= 0) {
      closeTargetedAttack();
      return;
    }

    const attackerName = getName(attacker);

    // If Save Mode: apply damage per target and add dice logs & concentration checks
    if (attackOrSaveMode === 'save') {
      const targets = isAoEMode
        ? combatants.filter((c) => selectedAoETargetIds.includes(c.id))
        : target ? [target] : [];

      for (const log of multiattackLogs) {
        if (log.damage > 0) {
          const tgt = targets.find((c) => getName(c) === log.actionName);
          if (tgt) {
            applyDamage(tgt.id, [{ amount: log.damage, type: log.damageType as DamageType }], false, true);
          }
        }
      }

      const isSecret = useDice3dStore.getState().isSecretRoll;
      const abilityInfo = ABILITY_LABELS[saveAbility];

      // Add dice logs for targets
      for (const t of targets) {
        const tName = getName(t);
        const log = multiattackLogs.find((l) => l.actionName === tName);
        const effectiveDamage = log?.damage || 0;
        const rollerName = attackerName || (isEn ? 'Attacker' : 'Атакующий');
        const actName = isEn
          ? `${currentAction?.name || customName || 'Saving Throw'} (DC ${saveDc} ${abilityInfo.en})`
          : `${cleanRussianText(currentAction?.name || customName || 'Спасбросок')} (СЛ ${saveDc} ${abilityInfo.shortRu})`;

        addDiceLog({
          id: crypto.randomUUID(),
          timestamp: new Date().toLocaleTimeString(),
          combatantName: isSecret ? `${isEn ? '[Secret] ' : '[Скрытно] '}${rollerName}` : rollerName,
          actionName: isSecret ? `${isEn ? '[Secret] ' : '[Скрытно] '}${actName}` : actName,
          targetName: tName,
          targetId: t.id,
          isHit: effectiveDamage > 0,
          effectiveDamage,
          damageRoll: effectiveDamage > 0 ? {
            formula: saveDamageFormula,
            total: effectiveDamage,
            damageType: localizeDamageType(saveDamageType, language),
            details: log?.d20Log || '',
          } : undefined,
          note: log?.notes || '',
          concentrationPrompt: t.isConcentrating && effectiveDamage > 0 ? {
            dc: Math.max(10, Math.floor(effectiveDamage / 2)),
            targetId: t.id,
          } : undefined,
        });
      }

      // Broadcast to players only if not secret
      if (broadcastToPlayers && !isSecret) {
        broadcastService.send({
          type: 'BROADCAST_ROLL',
          payload: {
            id: crypto.randomUUID(),
            title: formatLogText(`${attackerName}: ${currentAction?.name || customName || (isEn ? 'Saving Throw' : 'Спасбросок')}`),
            formula: isEn
              ? `${abilityInfo.en} Saving Throw DC ${saveDc} | ${saveDamageFormula}`
              : cleanRussianText(`Спасбросок ${abilityInfo.ru} СЛ ${saveDc} | ${saveDamageFormula}`),
            resultDisplay: isEn
              ? (targets.length === 1
                  ? `${multiattackLogs[0]?.d20Log} -> ${multiattackLogs[0]?.damage} damage (${localizeDamageType(saveDamageType, language)})`
                  : `AoE against ${targets.length} targets: ${finalCalculatedDamage} total damage (${localizeDamageType(saveDamageType, language)})`)
              : cleanRussianText(
                  targets.length === 1
                    ? `${multiattackLogs[0]?.d20Log} -> ${multiattackLogs[0]?.damage} урона (${localizeDamageType(saveDamageType, language)})`
                    : `AoE по ${targets.length} целям: ${finalCalculatedDamage} суммарного урона (${localizeDamageType(saveDamageType, language)})`
                ),
            total: finalCalculatedDamage,
            damageType: localizeDamageType(saveDamageType, language),
            isCritical: false,
            timestamp: Date.now(),
          },
        });
      }

      closeTargetedAttack();
      return;
    }

    const actionTitle = currentActionDetails.name;
    const dmgType = rollMode === 'physical'
      ? (physicalDamageType || currentActionDetails.damageType)
      : currentActionDetails.damageType;

    // Multi-target or Single Target application
    if (isAoEMode && multiattackLogs.length > 0) {
      for (const log of multiattackLogs) {
        if (log.isHit && log.damage > 0) {
          const tgt = combatants.find((c) => getName(c) === log.actionName);
          if (tgt) {
            applyDamage(tgt.id, [{ amount: log.damage, type: log.damageType as DamageType }], log.isCrit, true);
          }
        }
      }
    } else if (multiattackLogs.length > 0 && target) {
      // Multiattack against single target
      for (const log of multiattackLogs) {
        if (log.isHit && log.damage > 0) {
          applyDamage(target.id, [{ amount: log.damage, type: log.damageType as DamageType }], log.isCrit, true);
        }
      }
    } else if (target) {
      applyDamage(target.id, [{ amount: finalCalculatedDamage, type: dmgType }], isCrit, true);
    }

    // Add to Dice Log
    const isSecretDirect = useDice3dStore.getState().isSecretRoll;
    const directRollerName = attackerName || (isEn ? 'Attacker' : 'Атакующий');

    addDiceLog({
      id: crypto.randomUUID(),
      timestamp: new Date().toLocaleTimeString(),
      combatantName: isSecretDirect ? `${isEn ? '[Secret] ' : '[Скрытно] '}${directRollerName}` : directRollerName,
      actionName: isSecretDirect ? `${isEn ? '[Secret] ' : '[Скрытно] '}${actionTitle}` : actionTitle,
      targetName: target ? getName(target) : undefined,
      targetId: target?.id,
      isHit,
      effectiveDamage: finalCalculatedDamage,
      attackRoll: {
        d20: rollMode === 'physical' ? (parseInt(physicalD20, 10) || 0) : 0,
        modifier: currentActionDetails.attackBonus,
        total: rollMode === 'physical'
          ? (parseInt(physicalD20, 10) || 0) + currentActionDetails.attackBonus
          : 0,
        isNat20: isCrit,
        isNat1: rollMode === 'physical' ? physicalD20 === '1' : false,
      },
      damageRoll: finalCalculatedDamage > 0 ? {
        formula: damageDetailText || currentActionDetails.damageFormula,
        total: finalCalculatedDamage,
        damageType: localizeDamageType(dmgType, language),
        details: hitOutcomeText,
      } : undefined,
      note: defenseNoticeText ? `${hitOutcomeText} | ${defenseNoticeText}` : hitOutcomeText,
      concentrationPrompt: target?.isConcentrating && finalCalculatedDamage > 0 ? {
        dc: Math.max(10, Math.floor(finalCalculatedDamage / 2)),
        targetId: target.id,
      } : undefined,
    });

    // Broadcast to Players screen only if NOT secret
    if (broadcastToPlayers && !isSecretDirect) {
      broadcastService.send({
        type: 'BROADCAST_ROLL',
        payload: {
          id: crypto.randomUUID(),
          title: formatLogText(`${attackerName}: ${actionTitle}`),
          formula: isAoEMode
            ? (isEn ? 'AoE / Multiattack' : 'AoE / Мультиатака')
            : (isEn ? (damageDetailText || currentActionDetails.damageFormula) : cleanRussianText(damageDetailText || currentActionDetails.damageFormula)),
          resultDisplay: isEn
            ? (isHit
                ? `${hitOutcomeText} -> Dealt ${finalCalculatedDamage} ${localizeDamageType(dmgType, language)} damage to ${target ? getName(target) : ''}`
                : hitOutcomeText)
            : cleanRussianText(
                isHit
                  ? `${hitOutcomeText} -> Нанесено ${finalCalculatedDamage} ${localizeDamageType(dmgType, language)} урона по ${target ? getName(target) : ''}`
                  : hitOutcomeText
              ),
          total: finalCalculatedDamage,
          damageType: localizeDamageType(dmgType, language),
          isCritical: isCrit,
          timestamp: Date.now(),
        },
      });
    }

    closeTargetedAttack();
  };

  if (!targetedAttackModalOpen) return null;

  const attackerInit = attacker?.initBonus !== undefined
    ? (attacker.initBonus >= 0 ? `+${attacker.initBonus}` : `${attacker.initBonus}`)
    : '+0';

  const attackerName = getName(attacker);
  const targetName = getName(target);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-3 sm:p-4 animate-in fade-in duration-200 select-none font-sans">
      <div className="w-full max-w-2xl bg-[rgba(18,22,30,0.88)] backdrop-blur-xl border border-[rgba(255,255,255,0.08)] rounded-glass-xl shadow-[0_20px_50px_rgba(0,0,0,0.7)] p-5 sm:p-6 text-gray-100 flex flex-col max-h-[90vh] overflow-y-auto space-y-4">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-[rgba(255,255,255,0.08)] pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-glass bg-gold/10 border border-gold/30 text-gold shadow-[0_0_12px_rgba(245,185,32,0.2)]">
              <Crosshair className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>
                  {isEn ? 'Targeted Attack & Spell Resolution' : 'Таргетированная атака и расчёт КД'}
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-gold/15 text-gold-light border border-gold/40">
                  D&D 2024
                </span>
              </h2>
              <p className="text-xs text-gray-400">
                {isEn ? 'Attacker: ' : 'Атакует: '}
                <strong className="text-gold-light">{attackerName}</strong> ({isEn ? 'Target AC' : 'КД'}: {attacker?.ac ?? 10}, {isEn ? 'Init' : 'Иниц'}: {attackerInit})
              </p>
            </div>
          </div>
          <button
            onClick={closeTargetedAttack}
            className="p-1.5 rounded-glass hover:bg-white/10 text-gray-400 hover:text-white transition-colors cursor-pointer flex items-center justify-center"
            title={isEn ? 'Cancel' : 'Отмена'}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* SECTION 1: Target Selection */}
        <TargetSelector
          availableTargets={availableTargets}
          attacker={attacker}
          selectedTargetId={selectedTargetId}
          onSelectTarget={(id) => {
            setSelectedTargetId(id);
            resetResults();
          }}
          target={target}
          isAoEMode={isAoEMode}
          onToggleAoEMode={(aoe) => {
            setIsAoEMode(aoe);
            resetResults();
          }}
          selectedAoETargetIds={selectedAoETargetIds}
          onSelectAoETargetIds={(ids) => {
            setSelectedAoETargetIds(ids);
            resetResults();
          }}
          cover={cover}
          onCoverChange={(cov) => {
            setCover(cov);
            resetResults();
          }}
        />

        {/* SECTION 2: Action Selection */}
        <div className="space-y-2 bg-card p-3.5 rounded-sm border border-border-subtle">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-gray-300 flex items-center gap-1.5">
              <Swords className="h-3.5 w-3.5 text-gold" />
              {isEn ? '2. Attacker Action:' : '2. Действие атакующего:'}
            </label>
            <div className="flex items-center gap-1 bg-surface p-0.5 rounded-sm border border-border-subtle text-[11px]">
              <button
                type="button"
                onClick={() => {
                  setActionMode('action');
                  resetResults();
                }}
                className={`px-2 py-0.5 rounded-sm ${
                  actionMode === 'action' ? 'bg-card text-gold-light font-bold' : 'text-gray-400'
                }`}
              >
                {isEn ? 'Monster Action' : 'Действие монстра'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setActionMode('custom');
                  resetResults();
                }}
                className={`px-2 py-0.5 rounded-sm ${
                  actionMode === 'custom' ? 'bg-card text-gold-light font-bold' : 'text-gray-400'
                }`}
              >
                {isEn ? 'Custom Attack' : 'Своя атака'}
              </button>
            </div>
          </div>

          {actionMode === 'action' && attacker?.statblock?.actions && attacker.statblock.actions.length > 0 ? (
            <div className="space-y-2">
              <select
                value={selectedActionIndex}
                onChange={(e) => {
                  setSelectedActionIndex(parseInt(e.target.value, 10));
                  resetResults();
                }}
                className="w-full bg-surface border border-border-subtle text-xs rounded-sm px-3 py-2 text-gray-100 focus:border-gold outline-none"
              >
                {attacker.statblock.actions.map((act, idx) => (
                  <option key={idx} value={idx}>
                    {isEn ? act.name : cleanRussianText(act.name)} {act.attack_bonus ? `(+${act.attack_bonus})` : ''} — {formatDamageFormula(act.damage_dice, act.damage_bonus) || act.damage_dice || (isEn ? 'Damage' : 'Урон')} {localizeDamageType(act.damage_type, language)}
                  </option>
                ))}
              </select>
              {attacker.statblock.actions[selectedActionIndex]?.desc && (
                <p className="text-[11px] text-gray-400 italic bg-surface/50 p-2 rounded border border-border-subtle/50">
                  {attacker.statblock.actions[selectedActionIndex].desc}
                </p>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div>
                <span className="text-[10px] text-gray-400">{isEn ? 'Name:' : 'Название:'}</span>
                <input
                  type="text"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  className="w-full bg-surface border border-border-subtle text-xs rounded-sm px-2.5 py-1.5 text-gray-100 outline-none"
                />
              </div>
              <div>
                <span className="text-[10px] text-gray-400">{isEn ? 'Attack Bonus (+X):' : 'Бонус атаки (+X):'}</span>
                <input
                  type="number"
                  value={customToHit}
                  onChange={(e) => setCustomToHit(parseInt(e.target.value, 10) || 0)}
                  className="w-full bg-surface border border-border-subtle text-xs rounded-sm px-2.5 py-1.5 text-gray-100 outline-none"
                />
              </div>
              <div>
                <span className="text-[10px] text-gray-400">{isEn ? 'Damage Formula:' : 'Кубы урона (1d8+3):'}</span>
                <input
                  type="text"
                  value={customFormula}
                  onChange={(e) => setCustomFormula(e.target.value)}
                  className="w-full bg-surface border border-border-subtle text-xs rounded-sm px-2.5 py-1.5 text-gray-100 outline-none"
                />
              </div>
              <div>
                <span className="text-[10px] text-gray-400">{isEn ? 'Damage Type:' : 'Тип урона:'}</span>
                <select
                  value={customDamageType}
                  onChange={(e) => setCustomDamageType(e.target.value as DamageType)}
                  className="w-full bg-surface border border-border-subtle text-xs rounded-sm px-2 py-1.5 text-gray-100 outline-none"
                >
                  {[
                    'slashing',
                    'piercing',
                    'bludgeoning',
                    'fire',
                    'cold',
                    'lightning',
                    'necrotic',
                    'radiant',
                    'force',
                    'poison',
                    'acid',
                    'psychic',
                    'thunder',
                  ].map((dt) => (
                    <option key={dt} value={dt}>
                      {localizeDamageType(dt, language)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>

        {/* SECTION 3: Roll Mode & Buttons */}
        {attackOrSaveMode === 'save' ? (
          <div className="space-y-3 bg-card p-3.5 rounded-sm border border-purple-900/40">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-gray-300 flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-purple-400" />
                {isEn ? '3. Saving Throw (DC Save):' : '3. БРОСОК СПАСБРОСКОВ:'}
              </label>
              <span className="text-[11px] font-mono text-purple-300 bg-purple-950/60 px-2 py-0.5 rounded border border-purple-800">
                {isEn
                  ? `DC ${saveDc} ${ABILITY_LABELS[saveAbility].en} (${saveOutcome === 'half' ? 'half on save' : 'none on save'})`
                  : `СЛ ${saveDc} ${ABILITY_LABELS[saveAbility].ru} (${saveOutcome === 'half' ? '1/2 при успехе' : '0 при успехе'})`}
              </span>
            </div>

            <button
              type="button"
              onClick={handleRollSave}
              className="w-full py-2.5 px-4 rounded-sm bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs transition-all shadow-[0_0_15px_rgba(147,51,234,0.3)] flex items-center justify-center gap-2 cursor-pointer"
            >
              <Dices className="h-4 w-4" />
              <span>
                {isAoEMode
                  ? (isEn
                      ? `Roll saving throws for all (${selectedAoETargetIds.length} targets)`
                      : `Бросить спасброски за всех (${selectedAoETargetIds.length} целей)`)
                  : (isEn
                      ? `Roll saving throw for target (${targetName || 'Target'})`
                      : `Бросить спасбросок цели (${targetName || 'Цель'})`)}
              </span>
            </button>
          </div>
        ) : (
          <div className="space-y-3 bg-card p-3.5 rounded-sm border border-border-subtle">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-gray-300 flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
                {isEn ? '3. ROLL MODE:' : '3. РЕЖИМ БРОСКА:'}
              </label>
              {attacker?.isPlayer ? (
                <div className="px-2.5 py-1 rounded-sm bg-emerald-950/80 border border-emerald-700/60 text-emerald-300 font-bold text-[11px] flex items-center gap-1.5 shadow-sm">
                  <Edit3 className="h-3.5 w-3.5 text-emerald-400" />
                  <span>
                    {isEn
                      ? 'Player rolls at table — manual result entry only'
                      : 'Игрок ходит за столом — только ручной ввод результата'}
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-1 bg-surface p-0.5 rounded-sm border border-border-subtle text-[11px]">
                  <button
                    type="button"
                    onClick={() => {
                      setRollMode('digital');
                      resetResults();
                      setPhysicalD20('');
                      setPhysicalRawDamage('');
                      setPhysicalTotalOverride('');
                    }}
                    className={`px-2.5 py-1 rounded-sm transition-colors flex items-center gap-1.5 font-bold ${
                      rollMode === 'digital'
                        ? 'bg-gold text-canvas shadow-sm'
                        : 'text-gray-400 hover:text-gray-200'
                    }`}
                  >
                    <Dices className="h-3.5 w-3.5" />
                    <span>{isEn ? 'Digital Dice (3D)' : 'Цифровой бросок (d20)'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setRollMode('physical');
                      resetResults();
                    }}
                    className={`px-2.5 py-1 rounded-sm transition-colors flex items-center gap-1.5 font-bold ${
                      rollMode === 'physical'
                        ? 'bg-gold text-canvas shadow-sm'
                        : 'text-gray-400 hover:text-gray-200'
                    }`}
                  >
                    <Edit3 className="h-3.5 w-3.5" />
                    <span>{isEn ? 'Physical Dice (Table)' : 'Бросок за столом (кости)'}</span>
                  </button>
                </div>
              )}
            </div>

            {rollMode === 'digital' ? (
              <div className="space-y-3">
                <AdvantageToggle
                  advMode={advMode}
                  onAdvModeChange={(mode) => {
                    setAdvMode(mode);
                    resetResults();
                  }}
                />

                {/* Action Trigger Buttons */}
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleAutoRoll}
                    className="flex-1 py-2 px-4 rounded-sm bg-gold text-canvas font-bold text-xs hover:bg-gold-light transition-all shadow-gold-glow flex items-center justify-center gap-2"
                  >
                    <Dices className="h-4 w-4" />
                    <span>
                      {isAoEMode
                        ? (isEn ? 'Roll AoE Attack' : 'Бросить атаку по площади')
                        : (isEn ? 'Roll Attack vs AC' : 'Бросить атаку против КД')}
                    </span>
                  </button>

                  {!isAoEMode && attacker?.statblock?.actions && attacker.statblock.actions.length > 1 && (
                    <button
                      type="button"
                      onClick={handleMultiattackSeries}
                      className="py-2 px-4 rounded-sm bg-card border border-gold/50 text-gold-light font-bold text-xs hover:bg-surface transition-all flex items-center gap-1.5"
                    >
                      <Swords className="h-4 w-4" />
                      <span>{isEn ? 'Multiattack Series' : 'Серия мультиатак'}</span>
                    </button>
                  )}
                </div>
              </div>
            ) : (
              /* PHYSICAL DICE MODE INPUTS */
              <div className="space-y-3.5">
                {/* Step A: D20 Input */}
                <div className="p-3 bg-surface rounded-sm border border-gold/40 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-gray-200 flex items-center gap-1.5">
                      <Dices className="h-4 w-4 text-gold" />
                      {isEn ? 'Value on actual d20 (1 to 20):' : 'Число на реальной кости d20 (от 1 до 20):'}
                    </span>
                    <span className="text-xs font-mono text-gold-light bg-gold/10 px-2 py-0.5 rounded border border-gold/30">
                      {isEn ? 'Attack modifier: ' : 'Модификатор атаки: '}
                      <strong>{currentActionDetails.attackBonus >= 0 ? `+${currentActionDetails.attackBonus}` : currentActionDetails.attackBonus}</strong>
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      min={1}
                      max={20}
                      value={physicalD20}
                      onChange={(e) => {
                        setPhysicalD20(e.target.value);
                        calculatePhysicalOutcome(e.target.value, physicalRawDamage, physicalTotalOverride);
                      }}
                      placeholder="1-20"
                      className="w-24 text-center text-lg font-mono font-bold bg-canvas border border-gold/60 text-gold rounded-sm px-2 py-1 outline-none focus:ring-1 focus:ring-gold"
                    />

                    {/* Quick buttons */}
                    <div className="flex items-center gap-1 text-[11px] font-mono flex-wrap">
                      <span className="text-gray-500 text-[10px] mr-1">
                        {isEn ? 'Quick pick:' : 'Быстрый выбор:'}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setPhysicalD20('1');
                          calculatePhysicalOutcome('1', physicalRawDamage, physicalTotalOverride);
                        }}
                        className="px-2 py-1 rounded bg-red-950/50 border border-red-800/60 text-red-300 hover:bg-red-900 font-bold"
                        title={isEn ? 'Automatic Miss' : 'Критический промах'}
                      >
                        {isEn ? '1 (AUTOMATIC MISS!)' : '1 (Промах)'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setPhysicalD20('10');
                          calculatePhysicalOutcome('10', physicalRawDamage, physicalTotalOverride);
                        }}
                        className="px-2 py-1 rounded bg-card border border-border-subtle hover:text-white"
                      >
                        10
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setPhysicalD20('15');
                          calculatePhysicalOutcome('15', physicalRawDamage, physicalTotalOverride);
                        }}
                        className="px-2 py-1 rounded bg-card border border-border-subtle hover:text-white"
                      >
                        15
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setPhysicalD20('18');
                          calculatePhysicalOutcome('18', physicalRawDamage, physicalTotalOverride);
                        }}
                        className="px-2 py-1 rounded bg-card border border-border-subtle hover:text-white"
                      >
                        18
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setPhysicalD20('20');
                          calculatePhysicalOutcome('20', physicalRawDamage, physicalTotalOverride);
                        }}
                        className="px-2 py-1 rounded bg-emerald-950/50 border border-emerald-700/60 text-emerald-300 hover:bg-emerald-900 font-bold"
                        title={isEn ? 'Critical Hit' : 'Критическое попадание (Крит)'}
                      >
                        {isEn ? '20 (CRITICAL HIT!)' : '20 (КРИТ!)'}
                      </button>
                    </div>
                  </div>

                  {/* Real-time calculated status line */}
                  {physicalD20 ? (
                    <HitOutcomeBanner
                      isHit={isHit}
                      isCrit={isCrit}
                      hitOutcomeText={hitOutcomeText}
                    />
                  ) : (
                    <div className="text-[11px] text-gray-500 italic">
                      {isEn
                        ? `Enter the roll from the physical d20 (1–20). Total vs Target AC (${effectiveTargetAc}) calculates instantly.`
                        : `Введите выпавшее на реальной кости d20 число (1–20). Итог против КД цели (${effectiveTargetAc}) рассчитается мгновенно.`}
                    </div>
                  )}
                </div>

                {/* Step B: Damage Calculation (When Hit) */}
                {isHit && (
                  <div className="p-3 bg-surface rounded-sm border border-border-subtle space-y-3 animate-in fade-in duration-150">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-gray-200 flex items-center gap-1.5">
                        <Zap className="h-3.5 w-3.5 text-amber-400" />
                        <span>
                          {isEn
                            ? `Damage Calculation (${localizeDamageType(physicalDamageType || currentActionDetails.damageType, language)}):`
                            : `Расчёт урона (${localizeDamageType(physicalDamageType || currentActionDetails.damageType, language)}):`}
                        </span>
                      </span>
                      {isCrit && (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-600 font-bold flex items-center gap-1">
                          <Zap className="h-3 w-3 text-emerald-400" />
                          <span>
                            {isEn
                              ? `CRITICAL HIT! Dice doubled (${critFormula})`
                              : `КРИТ: кубы формулы удвоены (${critFormula})`}
                          </span>
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 items-end">
                      {/* Option 1: Roll Formula Button */}
                      <div>
                        <span className="text-[10px] text-gray-400 block mb-1 truncate" title={isCrit ? critFormula : currentActionDetails.damageFormula}>
                          {isEn ? 'Damage Formula: ' : 'Формула: '}
                          <strong className="text-gold-light break-words">{isCrit ? critFormula : currentActionDetails.damageFormula}</strong>
                        </span>
                        <button
                          type="button"
                          onClick={handleRollFormulaInPhysicalMode}
                          className="w-full py-1.5 px-2 rounded-sm bg-gold/15 border border-gold/40 hover:bg-gold hover:text-black text-gold-light font-bold text-xs transition-all flex items-center justify-center gap-1 shadow-sm"
                        >
                          <Dices className="h-3.5 w-3.5" />
                          <span>{isEn ? 'Roll Formula' : 'Бросить формулу'}</span>
                        </button>
                      </div>

                      {/* Option 2: Enter Raw Damage from table */}
                      <div>
                        <span className="text-[10px] text-gray-400 block mb-1 truncate">
                          {isEn ? 'Raw damage from dice:' : 'Чистый урон со стола (кости):'}
                        </span>
                        <input
                          type="number"
                          min={0}
                          value={physicalRawDamage}
                          onChange={(e) => {
                            setPhysicalRawDamage(e.target.value);
                            setPhysicalTotalOverride('');
                            calculatePhysicalOutcome(physicalD20, e.target.value, '');
                          }}
                          placeholder={isEn ? 'e.g. 11' : 'Например, 11'}
                          className="w-full bg-canvas border border-border-subtle text-xs rounded-sm px-2.5 py-1.5 text-gray-100 outline-none focus:border-gold [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                      </div>

                      {/* Option 3: Override Final Damage */}
                      <div>
                        <span className="text-[10px] text-gray-400 block mb-1 truncate">
                          {isEn ? 'Or total damage override:' : 'Или суммарный урон:'}
                        </span>
                        <input
                          type="number"
                          min={0}
                          value={physicalTotalOverride || (finalCalculatedDamage > 0 ? String(finalCalculatedDamage) : '')}
                          onChange={(e) => {
                            setPhysicalTotalOverride(e.target.value);
                            calculatePhysicalOutcome(physicalD20, physicalRawDamage, e.target.value);
                          }}
                          placeholder={isEn ? 'Final damage' : 'Итоговый урон'}
                          className="w-full bg-canvas border border-border-subtle text-xs rounded-sm px-2.5 py-1.5 text-gold font-mono font-bold outline-none focus:border-gold [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                      </div>
                    </div>

                    {/* Target defenses and Temp HP preview */}
                    {target && (
                      <div className="p-2 rounded bg-canvas/60 border border-border-subtle/60 text-[11px] font-mono space-y-1">
                        {defenseNoticeText && (
                          <div className="text-yellow-300 font-semibold break-words leading-tight">{defenseNoticeText}</div>
                        )}
                        <div className="flex flex-wrap items-center justify-between gap-1 text-gray-400">
                          <span>
                            {isEn ? 'Target HP: ' : 'ОЗ цели: '}
                            <strong className="text-emerald-300">{target.hp}/{target.maxHp}</strong>
                            {target.tempHp > 0 && (
                              <span className="text-cyan-300 ml-1">
                                {isEn ? `(+${target.tempHp} Temp HP)` : `(+${target.tempHp} врем. ОЗ)`}
                              </span>
                            )}
                          </span>
                          {finalCalculatedDamage > 0 && (
                            <span className="text-gold-light">
                              {isEn ? 'After hit: ' : 'После удара: '}
                              {Math.max(0, target.hp - Math.max(0, finalCalculatedDamage - target.tempHp))} {isEn ? 'HP' : 'ОЗ'}
                              {target.tempHp > 0 && ` | ${Math.max(0, target.tempHp - finalCalculatedDamage)} ${isEn ? 'Temp HP' : 'врем. ОЗ'}`}
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* SECTION 4: Result Display */}
        <DamagePreview
          hasCalculated={hasCalculated}
          isHit={isHit}
          finalCalculatedDamage={finalCalculatedDamage}
          hitOutcomeText={hitOutcomeText}
          damageDetailText={damageDetailText}
          defenseNoticeText={defenseNoticeText}
          concentrationCheckDc={concentrationCheckDc}
          multiattackLogs={multiattackLogs}
        />

        {/* SECTION 5: Footer Actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[rgba(255,255,255,0.08)]">
          <label className="flex items-center gap-2 text-xs text-gray-300 cursor-pointer hover:text-white shrink-0">
            <input
              type="checkbox"
              checked={broadcastToPlayers}
              onChange={(e) => setBroadcastToPlayers(e.target.checked)}
              className="rounded border-[rgba(255,255,255,0.2)] text-gold focus:ring-0 bg-surface"
            />
            <span className="flex items-center gap-1.5 font-medium">
              <Send className="h-3.5 w-3.5 text-gold" />
              {isEn ? 'Broadcast roll to player screen' : 'Транслировать бросок на экран игроков'}
            </span>
          </label>

          <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap justify-end w-full sm:w-auto">
            <button
              type="button"
              onClick={closeTargetedAttack}
              className="min-h-[34px] px-4 py-2 rounded-glass border border-[rgba(255,255,255,0.08)] text-xs font-semibold text-gray-300 hover:text-white bg-white/5 hover:bg-white/10 transition-colors cursor-pointer"
            >
              {isEn ? 'Cancel' : 'Отмена'}
            </button>
            <button
              type="button"
              disabled={!hasCalculated || (finalCalculatedDamage <= 0 && !isHit)}
              onClick={handleApplyDamage}
              className={`min-h-[34px] px-5 py-2 rounded-glass text-xs font-black transition-all shadow-md text-center max-w-full ${
                hasCalculated && (finalCalculatedDamage > 0 || isHit)
                  ? 'bg-crimson text-white hover:bg-red-600 shadow-[0_0_16px_rgba(239,68,68,0.4)] cursor-pointer'
                  : 'bg-white/5 text-gray-600 border border-[rgba(255,255,255,0.08)] cursor-not-allowed'
              }`}
            >
              <span className="inline-flex items-center gap-1.5 justify-center">
                <Zap className="h-3.5 w-3.5" />
                <span>
                  {isAoEMode && (attackOrSaveMode === 'save' || multiattackLogs.length > 0)
                    ? (isEn ? 'Apply Damage to All Targets' : 'Применить урон всем целям')
                    : (isEn ? 'Apply Damage' : 'Применить урон к цели')}
                </span>
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
