import { useState, useMemo, useEffect } from 'react';
import { useCombatStore } from '../../store/combatStore';
import { usePartyStore } from '../../store/partyStore';
import { useDice3dStore } from '../../store/dice3dStore';
import { DamageType, RollMode } from '../../types/dnd5e';
import { rollD20, rollDiceFormula } from '../../engine/rolls';
import { broadcastService } from '../../services/broadcastService';
import { Crosshair, Shield, Sparkles, Send, Swords, Dices } from 'lucide-react';
import { cleanRussianText, DAMAGE_NAMES_RU, localizeDamageType } from '../../utils/textUtils';
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
  DamagePreview,
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
  const [customName, setCustomName] = useState('Атака оружием');
  const [customToHit, setCustomToHit] = useState(5);
  const [customFormula, setCustomFormula] = useState('1d8+3');
  const [customDamageType, setCustomDamageType] = useState<DamageType>('slashing');

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
      actName = currentAction.name;
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
  }, [currentAction, customName, customToHit, customFormula, customDamageType]);

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
    const targetAc = target.ac;

    if (isNaN(num) || num < 1 || num > 20) {
      setHasCalculated(true);
      setIsHit(false);
      setIsCrit(false);
      setHitOutcomeText('⚠️ Введите значение броска d20 от 1 до 20');
      setDamageDetailText('');
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
        `💥 КРИТИЧЕСКОЕ ПОПАДАНИЕ (КРИТ!) ИТОГ: 20 + ${modStr} = ${sum} против КД Цели (${targetAc}) -> ПОПАДАНИЕ!`
      );
    } else if (num === 1) {
      hit = false;
      crit = false;
      const sum = 1 + mod;
      setHitOutcomeText(
        `❌ АВТОМАТИЧЕСКИЙ ПРОМАХ! ИТОГ: 1 + ${modStr} = ${sum} против КД Цели (${targetAc}) -> ПРОМАХ!`
      );
      setDamageDetailText('Бросок 1 на кости d20 — автоматический промах независимо от бонуса к атаке.');
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
        `${hit ? '🎯 ПОПАДАНИЕ!' : '❌ ПРОМАХ!'} ИТОГ: ${num} + ${modStr} = ${sum} против КД Цели (${targetAc}) -> ${hit ? 'ПОПАДАНИЕ!' : 'ПРОМАХ!'}`
      );
    }

    setIsHit(hit);
    setIsCrit(crit);

    if (!hit) {
      const sum = num + mod;
      setDamageDetailText(`Сумма атаки (${sum}) не пробивает защиту цели (КД ${targetAc}).`);
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
      detailText = `Итоговый суммарный урон задан вручную: ${finalDmg} (${localizeDamageType(dmgType)})`;
      noticeText = 'Урон введён вручную мастером (без модификаторов).';
    } else {
      const effectiveRawStr = rawDmgStr !== undefined ? rawDmgStr : physicalRawDamage;
      if (effectiveRawStr && effectiveRawStr.trim() !== '') {
        const rawDmg = Math.max(0, parseInt(effectiveRawStr, 10) || 0);
        const def = computeDamageWithDefenses(rawDmg, dmgType, target);
        finalDmg = def.finalDmg;
        detailText = `Чистый урон со стола: ${rawDmg} (${localizeDamageType(dmgType)})`;
        noticeText = def.notice;
      } else {
        detailText = `Нажмите «Бросить формулу урона» или введите урон со стола.`;
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
    const def = computeDamageWithDefenses(raw, dmgType, target);

    setFinalCalculatedDamage(def.finalDmg);
    setDamageDetailText(
      `Бросок формулы (${isCrit ? 'КРИТ x2 кубы' : 'обычный'}): ${formatFormulaBreakdown(dmgRoll)} (${localizeDamageType(dmgType)})`
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

    // Roll d20 with advantage mode
    const d20 = rollD20(advMode, toHitMod);
    const attackTotal = d20.total;
    const isNat20 = d20.isNatural20;
    const isNat1 = d20.isNatural1;
    const targetAc = target.ac;
    const rollLog = `[d20: ${d20.keptRoll} + ${d20.modifier} = ${d20.total}]`;

    const hit = !isNat1 && (isNat20 || attackTotal >= targetAc);
    setIsHit(hit);
    setIsCrit(isNat20);
    const diceToRoll: Array<{ sides: number; result: number }> = [
      { sides: 20, result: d20.keptRoll },
    ];

    if (!hit) {
      setHitOutcomeText(
        `ПРОМАХ! ${rollLog} против КД ${targetAc}`
      );
      setDamageDetailText('Атака прошла мимо цели или отражена бронёй.');
      setDefenseNoticeText('');
      setFinalCalculatedDamage(0);
      setConcentrationCheckDc(null);

      if (useDice3dStore.getState().is3dEnabled) {
        useDice3dStore.getState().rollDice3d({
          dice: diceToRoll,
          title: `${attacker?.nameRu || attacker?.name}: ${actName} (Промах)`,
          total: attackTotal,
          isSecret: useDice3dStore.getState().isSecretRoll,
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
    const { finalDmg, notice } = computeDamageWithDefenses(rawDamage, dmgType, target);
    const breakdown = formatFormulaBreakdown(dmgRoll);

    // Collect damage dice for 3D animation
    if (dmgRoll.rolls) {
      for (const r of dmgRoll.rolls) {
        for (const val of r.values) {
          diceToRoll.push({ sides: r.sides, result: val });
        }
      }
    }

    if (useDice3dStore.getState().is3dEnabled) {
      useDice3dStore.getState().rollDice3d({
        dice: diceToRoll,
        title: `${attacker?.nameRu || attacker?.name}: ${actName}`,
        total: rawDamage,
        isSecret: useDice3dStore.getState().isSecretRoll,
      });
    }

    setFinalCalculatedDamage(finalDmg);
    setHitOutcomeText(
      `${isNat20 ? 'КРИТИЧЕСКОЕ ' : ''}ПОПАДАНИЕ! ${rollLog} против КД ${targetAc}`
    );
    setDamageDetailText(`Бросок урона: ${breakdown} (${localizeDamageType(dmgType)})`);
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

    for (const act of attacks) {
      const parsed = parseActionDetails(act);
      const toHitMod = parsed.attackBonus ?? 5;
      const formula = parsed.damageFormula || '1d8+3';
      const dmgType: DamageType = (parsed.damageType?.toLowerCase() || 'slashing') as DamageType;

      const d20 = rollD20(advMode, toHitMod);
      const isNat20 = d20.isNatural20;
      const isNat1 = d20.isNatural1;
      const hit = !isNat1 && (isNat20 || d20.total >= target.ac);
      const rollLog = `[d20: ${d20.keptRoll} + ${d20.modifier} = ${d20.total}]`;

      if (!hit) {
        logs.push({
          actionName: act.name,
          d20Log: `${rollLog} против КД ${target.ac}`,
          isHit: false,
          isCrit: false,
          damage: 0,
          damageType: dmgType,
          notes: 'ПРОМАХ',
        });
        continue;
      }

      let rollFormula = formula;
      if (isNat20) {
        rollFormula = formula.replace(/(\d+)d(\d+)/g, (_m, count, sides) => `${parseInt(count, 10) * 2}d${sides}`);
      }

      const dmgResult = rollDiceFormula(rollFormula);
      const { finalDmg, notice } = computeDamageWithDefenses(dmgResult.total, dmgType, target);
      totalDmg += finalDmg;
      if (finalDmg > highestDmg) highestDmg = finalDmg;

      logs.push({
        actionName: act.name,
        d20Log: `${rollLog} против КД ${target.ac}`,
        isHit: true,
        isCrit: isNat20,
        damage: finalDmg,
        damageType: dmgType,
        notes: isNat20 ? `КРИТ! ${notice}` : notice || 'ПОПАДАНИЕ',
      });
    }

    setMultiattackLogs(logs);
    setFinalCalculatedDamage(totalDmg);
    setIsHit(totalDmg > 0);
    setIsCrit(logs.some((l) => l.isCrit));
    setHasCalculated(true);
    setHitOutcomeText(`⚔️ Серия из ${attacks.length} атак по «${target.nameRu || target.name}»!`);
    setDamageDetailText(`Суммарно нанесено: ${totalDmg} урона.`);
    setDefenseNoticeText(`Удары: ${logs.filter((l) => l.isHit).length} попало, ${logs.filter((l) => !l.isHit).length} промахов.`);

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

      if (!hit) {
        logs.push({
          actionName: t.nameRu || t.name,
          d20Log: `${rollLog} против КД ${t.ac}`,
          isHit: false,
          isCrit: false,
          damage: 0,
          damageType: dmgType,
          notes: 'ПРОМАХ',
        });
        continue;
      }

      let raw = baseDmgRoll.total;
      if (isNat20) raw = Math.round(raw * 1.5);
      const { finalDmg, notice } = computeDamageWithDefenses(raw, dmgType, t);
      totalDmg += finalDmg;

      logs.push({
        actionName: t.nameRu || t.name,
        d20Log: `${rollLog} против КД ${t.ac}`,
        isHit: true,
        isCrit: isNat20,
        damage: finalDmg,
        damageType: dmgType,
        notes: isNat20 ? `КРИТ! ${notice}` : notice || 'ПОПАДАНИЕ',
      });
    }

    setMultiattackLogs(logs);
    setFinalCalculatedDamage(totalDmg);
    setIsHit(totalDmg > 0);
    setHasCalculated(true);
    setHitOutcomeText(`Атака/заклинание «${actName}» по ${targets.length} целям!`);
    setDamageDetailText(`Базовый урон: ${formatFormulaBreakdown(baseDmgRoll)} (${localizeDamageType(dmgType)}) | Суммарно: ${totalDmg} урона`);
    setDefenseNoticeText('Сопротивления каждой цели рассчитаны индивидуально.');
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
    const partyMembers = usePartyStore.getState().members;

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
          title: `${attacker?.nameRu || attacker?.name}: Спасбросок ${abilityInfo.ru}`,
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
      const total = d20 + mod;
      const isSuccess = total >= saveDc;
      const modStr = mod >= 0 ? `+${mod}` : `${mod}`;

      // Damage calculation before defenses
      let rawDamage = 0;
      if (isSuccess) {
        rawDamage = saveOutcome === 'half' ? Math.floor(baseDamage / 2) : 0;
      } else {
        rawDamage = baseDamage;
      }

      // Defenses (Immunities, Resistances, Vulnerabilities)
      const { finalDmg, notice } = computeDamageWithDefenses(rawDamage, saveDamageType, t);
      totalAppliedDamage += finalDmg;
      if (finalDmg > highestDmg) highestDmg = finalDmg;

      const outcomeLabel = isSuccess ? 'УСПЕХ' : 'ПРОВАЛ';
      const outcomeNote = notice ? `${outcomeLabel}! ${notice}` : outcomeLabel;

      logs.push({
        actionName: cleanRussianText(t.nameRu || t.name),
        d20Log: `d20 (${d20}) ${modStr} = ${total} против СЛ ${saveDc} [${abilityInfo.shortRu}] -> ${outcomeLabel}`,
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

    const actionTitle = currentAction?.name || customName || 'Спасбросок';
    if (targets.length === 1) {
      const singleLog = logs[0];
      setHitOutcomeText(
        `🛡️ Спасбросок ${abilityInfo.ru} против СЛ ${saveDc}: ${singleLog.d20Log}`
      );
      setDamageDetailText(`Бросок формулы: ${formulaBreakdown} (${localizeDamageType(saveDamageType)}) | Итог: ${singleLog.damage} урона`);
      setDefenseNoticeText(singleLog.notes);
    } else {
      const successes = logs.filter((l) => l.d20Log.includes('УСПЕХ')).length;
      const fails = logs.filter((l) => l.d20Log.includes('ПРОВАЛ')).length;
      setHitOutcomeText(
        `🛡️ Спасбросок ${abilityInfo.ru} СЛ ${saveDc} («${actionTitle}») по ${targets.length} целям!`
      );
      setDamageDetailText(
        `Базовый урон: ${formulaBreakdown} (${localizeDamageType(saveDamageType)}) | Суммарно: ${totalAppliedDamage} урона`
      );
      setDefenseNoticeText(`Успехов: ${successes}, Провалов: ${fails}. Защита целей учтена.`);
    }

    // Concentration Check
    if (totalAppliedDamage > 0 && targets.some((t) => t.isConcentrating && logs.find((l) => l.actionName === cleanRussianText(t.nameRu || t.name))?.damage! > 0)) {
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

    // If Save Mode: apply damage per target and add dice logs & concentration checks
    if (attackOrSaveMode === 'save') {
      const targets = isAoEMode
        ? combatants.filter((c) => selectedAoETargetIds.includes(c.id))
        : target ? [target] : [];

      for (const log of multiattackLogs) {
        if (log.damage > 0) {
          const tgt = targets.find((c) => cleanRussianText(c.nameRu || c.name) === log.actionName);
          if (tgt) {
            applyDamage(tgt.id, [{ amount: log.damage, type: log.damageType as DamageType }], false, true);
          }
        }
      }

      const isSecret = useDice3dStore.getState().isSecretRoll;

      // Add dice logs for targets
      for (const t of targets) {
        const log = multiattackLogs.find((l) => l.actionName === cleanRussianText(t.nameRu || t.name));
        const effectiveDamage = log?.damage || 0;
        const rollerName = cleanRussianText(attacker?.nameRu || attacker?.name || 'Атакующий');
        const actName = `${cleanRussianText(currentAction?.name || customName || 'Спасбросок')} (СЛ ${saveDc} ${ABILITY_LABELS[saveAbility].shortRu})`;

        addDiceLog({
          id: crypto.randomUUID(),
          timestamp: new Date().toLocaleTimeString(),
          combatantName: isSecret ? `[Скрытно] ${rollerName}` : rollerName,
          actionName: isSecret ? `[Скрытно] ${actName}` : actName,
          targetName: cleanRussianText(t.nameRu || t.name),
          targetId: t.id,
          isHit: effectiveDamage > 0,
          effectiveDamage,
          damageRoll: effectiveDamage > 0 ? {
            formula: saveDamageFormula,
            total: effectiveDamage,
            damageType: localizeDamageType(saveDamageType),
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
            title: cleanRussianText(`${attacker?.nameRu || attacker?.name}: ${currentAction?.name || customName || 'Спасбросок'}`),
            formula: cleanRussianText(`Спасбросок ${ABILITY_LABELS[saveAbility].ru} СЛ ${saveDc} | ${saveDamageFormula}`),
            resultDisplay: cleanRussianText(
              targets.length === 1
                ? `${multiattackLogs[0]?.d20Log} -> ${multiattackLogs[0]?.damage} урона (${localizeDamageType(saveDamageType)})`
                : `AoE по ${targets.length} целям: ${finalCalculatedDamage} суммарного урона (${localizeDamageType(saveDamageType)})`
            ),
            total: finalCalculatedDamage,
            damageType: localizeDamageType(saveDamageType),
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

    // Multi-target or Single Target application (skipDefenses: true to prevent double deduction)
    if (isAoEMode && multiattackLogs.length > 0) {
      for (const log of multiattackLogs) {
        if (log.isHit && log.damage > 0) {
          const tgt = combatants.find((c) => (c.nameRu || c.name) === log.actionName);
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
    const directRollerName = cleanRussianText(attacker?.nameRu || attacker?.name || 'Атакующий');

    addDiceLog({
      id: crypto.randomUUID(),
      timestamp: new Date().toLocaleTimeString(),
      combatantName: isSecretDirect ? `[Скрытно] ${directRollerName}` : directRollerName,
      actionName: isSecretDirect ? `[Скрытно] ${actionTitle}` : actionTitle,
      targetName: target ? cleanRussianText(target.nameRu || target.name) : undefined,
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
        damageType: localizeDamageType(dmgType),
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
          title: cleanRussianText(`${attacker?.nameRu || attacker?.name}: ${actionTitle}`),
          formula: isAoEMode ? 'AoE / Мультиатака' : cleanRussianText(damageDetailText || currentActionDetails.damageFormula),
          resultDisplay: cleanRussianText(
            isHit
              ? `${hitOutcomeText} -> Нанесено ${finalCalculatedDamage} ${localizeDamageType(dmgType)} урона по ${target?.nameRu || target?.name}`
              : hitOutcomeText
          ),
          total: finalCalculatedDamage,
          damageType: localizeDamageType(dmgType),
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
                <span>Таргетированная атака и расчёт КД</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-gold/15 text-gold-light border border-gold/40">
                  D&D 2024
                </span>
              </h2>
              <p className="text-xs text-gray-400">
                Атакует: <strong className="text-gold-light">{attacker?.nameRu || attacker?.name}</strong> (КД: {attacker?.ac ?? 10}, Иниц: {attackerInit})
              </p>
            </div>
          </div>
          <button
            onClick={closeTargetedAttack}
            className="p-1.5 rounded-glass hover:bg-white/10 text-gray-400 hover:text-white transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* SECTION 1: Target Selection */}
        <div className="space-y-2 bg-card p-3.5 rounded-sm border border-border-subtle">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-gray-300 flex items-center gap-1.5">
              <Shield className="h-3.5 w-3.5 text-blue-400" />
              1. Выбор цели атаки:
            </label>
            <label className="flex items-center gap-1.5 text-xs text-gray-400 cursor-pointer hover:text-gray-200">
              <input
                type="checkbox"
                checked={isAoEMode}
                onChange={(e) => {
                  setIsAoEMode(e.target.checked);
                  resetResults();
                }}
                className="rounded border-border-subtle text-gold focus:ring-0 bg-surface"
              />
              <span>Несколько целей / AoE</span>
            </label>
          </div>

          {!isAoEMode ? (
            <div className="flex items-center gap-2 sm:gap-3 flex-wrap sm:flex-nowrap">
              <select
                value={selectedTargetId}
                onChange={(e) => {
                  setSelectedTargetId(e.target.value);
                  resetResults();
                }}
                className="flex-1 min-w-0 max-w-full bg-surface border border-border-subtle text-xs rounded-sm px-3 py-2 text-gray-100 focus:border-gold outline-none"
              >
                {availableTargets.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.isPlayer ? '🛡️ [Игрок] ' : '👾 [Монстр] '}
                    {t.nameRu || t.name} — КД: {t.ac} | ОЗ: {t.hp}/{t.maxHp}
                  </option>
                ))}
              </select>
              {target && (
                <div className="text-[11px] font-mono px-3 py-1.5 bg-surface border border-border-subtle rounded-sm text-gray-300 shrink-0">
                  КД цели: <strong className="text-gold font-bold text-sm">{target.ac}</strong>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-[11px] text-gray-400 flex-wrap">
                <span className="text-[10px] text-gray-500 mr-1">Быстрый выбор:</span>
                <button
                  type="button"
                  onClick={() =>
                    setSelectedAoETargetIds(
                      availableTargets
                        .filter((t) => (attacker.isPlayer ? !t.isPlayer : t.isPlayer))
                        .map((t) => t.id)
                    )
                  }
                  className="px-2 py-0.5 rounded bg-surface border border-border-subtle hover:text-white hover:border-gold/40 transition-colors"
                >
                  ⚔️ Все враги
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setSelectedAoETargetIds(availableTargets.filter((t) => t.isPlayer).map((t) => t.id))
                  }
                  className="px-2 py-0.5 rounded bg-surface border border-border-subtle hover:text-white hover:border-gold/40 transition-colors"
                >
                  🛡️ Все игроки
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setSelectedAoETargetIds(availableTargets.filter((t) => !t.isPlayer).map((t) => t.id))
                  }
                  className="px-2 py-0.5 rounded bg-surface border border-border-subtle hover:text-white hover:border-gold/40 transition-colors"
                >
                  👾 Все монстры
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedAoETargetIds(availableTargets.map((t) => t.id))}
                  className="px-2 py-0.5 rounded bg-surface border border-border-subtle hover:text-white hover:border-gold/40 transition-colors"
                >
                  Все ({availableTargets.length})
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedAoETargetIds([])}
                  className="px-2 py-0.5 rounded bg-surface border border-border-subtle hover:text-white transition-colors text-red-400 hover:text-red-300"
                >
                  Сбросить
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto p-1 bg-surface rounded-sm border border-border-subtle">
                {availableTargets.map((t) => {
                  const isChecked = selectedAoETargetIds.includes(t.id);
                  return (
                    <label
                      key={t.id}
                      className={`flex items-center gap-2 p-1.5 rounded text-xs cursor-pointer border transition-all ${
                        isChecked
                          ? 'bg-gold/10 border-gold/40 text-gold-light'
                          : 'border-transparent text-gray-400 hover:bg-card'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedAoETargetIds([...selectedAoETargetIds, t.id]);
                          } else {
                            setSelectedAoETargetIds(
                              selectedAoETargetIds.filter((id) => id !== t.id)
                            );
                          }
                          resetResults();
                        }}
                        className="rounded border-border-subtle text-gold focus:ring-0 bg-canvas"
                      />
                      <span className="truncate">
                        {t.nameRu || t.name} (КД {t.ac})
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* SECTION 2: Action Selection */}
        <div className="space-y-2 bg-card p-3.5 rounded-sm border border-border-subtle">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-gray-300 flex items-center gap-1.5">
              <Swords className="h-3.5 w-3.5 text-gold" />
              2. Действие атакующего:
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
                Действие монстра
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
                Своя атака
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
                    {cleanRussianText(act.name)} {act.attack_bonus ? `(+${act.attack_bonus})` : ''} — {formatDamageFormula(act.damage_dice, act.damage_bonus) || act.damage_dice || 'Урон'} {localizeDamageType(act.damage_type)}
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
                <span className="text-[10px] text-gray-400">Название:</span>
                <input
                  type="text"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  className="w-full bg-surface border border-border-subtle text-xs rounded-sm px-2.5 py-1.5 text-gray-100 outline-none"
                />
              </div>
              <div>
                <span className="text-[10px] text-gray-400">Бонус атаки (+X):</span>
                <input
                  type="number"
                  value={customToHit}
                  onChange={(e) => setCustomToHit(parseInt(e.target.value, 10) || 0)}
                  className="w-full bg-surface border border-border-subtle text-xs rounded-sm px-2.5 py-1.5 text-gray-100 outline-none"
                />
              </div>
              <div>
                <span className="text-[10px] text-gray-400">Кубы урона (1d8+3):</span>
                <input
                  type="text"
                  value={customFormula}
                  onChange={(e) => setCustomFormula(e.target.value)}
                  className="w-full bg-surface border border-border-subtle text-xs rounded-sm px-2.5 py-1.5 text-gray-100 outline-none"
                />
              </div>
              <div>
                <span className="text-[10px] text-gray-400">Тип урона:</span>
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
                      {DAMAGE_NAMES_RU[dt] || dt}
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
                3. БРОСОК СПАСБРОСКОВ:
              </label>
              <span className="text-[11px] font-mono text-purple-300 bg-purple-950/60 px-2 py-0.5 rounded border border-purple-800">
                СЛ {saveDc} {ABILITY_LABELS[saveAbility].ru} ({saveOutcome === 'half' ? '1/2 при успехе' : '0 при успехе'})
              </span>
            </div>

            <button
              type="button"
              onClick={handleRollSave}
              className="w-full py-2.5 px-4 rounded-sm bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs transition-all shadow-[0_0_15px_rgba(147,51,234,0.3)] flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>🎲</span>
              <span>
                {isAoEMode
                  ? `Бросить спасброски за всех (${selectedAoETargetIds.length} целей)`
                  : `Бросить спасбросок цели (${target?.nameRu || target?.name || 'Цель'})`}
              </span>
            </button>
          </div>
        ) : (
        <div className="space-y-3 bg-card p-3.5 rounded-sm border border-border-subtle">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-gray-300 flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
              3. РЕЖИМ БРОСКА:
            </label>
            {attacker?.isPlayer ? (
              <div className="px-2.5 py-1 rounded-sm bg-emerald-950/80 border border-emerald-700/60 text-emerald-300 font-bold text-[11px] flex items-center gap-1.5 shadow-sm">
                <span>✍️ Игрок ходит за столом — только ручной ввод результата</span>
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
                  <span>🎲</span>
                  <span>Цифровой бросок (d20)</span>
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
                  <span>✍️</span>
                  <span>Бросок за столом (кости)</span>
                </button>
              </div>
            )}
          </div>

          {rollMode === 'digital' ? (
            <div className="space-y-3">
              {/* Advantage / Normal / Disadvantage */}
              <div className="flex items-center gap-3">
                <span className="text-[11px] text-gray-400">Модификатор броска:</span>
                <div className="flex items-center gap-2 text-xs">
                  <label className="flex items-center gap-1 cursor-pointer">
                    <input
                      type="radio"
                      name="advMode"
                      checked={advMode === 'normal'}
                      onChange={() => {
                        setAdvMode('normal');
                        resetResults();
                      }}
                      className="text-gold focus:ring-0 bg-surface"
                    />
                    <span>Обычный (1d20)</span>
                  </label>
                  <label className="flex items-center gap-1 cursor-pointer text-emerald-400">
                    <input
                      type="radio"
                      name="advMode"
                      checked={advMode === 'advantage'}
                      onChange={() => {
                        setAdvMode('advantage');
                        resetResults();
                      }}
                      className="text-emerald-500 focus:ring-0 bg-surface"
                    />
                    <span>Преимущество (2d20kh1)</span>
                  </label>
                  <label className="flex items-center gap-1 cursor-pointer text-red-400">
                    <input
                      type="radio"
                      name="advMode"
                      checked={advMode === 'disadvantage'}
                      onChange={() => {
                        setAdvMode('disadvantage');
                        resetResults();
                      }}
                      className="text-red-500 focus:ring-0 bg-surface"
                    />
                    <span>Помеха (2d20kl1)</span>
                  </label>
                </div>
              </div>

              {/* Action Trigger Buttons */}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleAutoRoll}
                  className="flex-1 py-2 px-4 rounded-sm bg-gold text-canvas font-bold text-xs hover:bg-gold-light transition-all shadow-gold-glow flex items-center justify-center gap-2"
                >
                  <span>🎲</span>
                  <span>{isAoEMode ? 'Бросить атаку по площади' : 'Бросить атаку против КД'}</span>
                </button>

                {!isAoEMode && attacker?.statblock?.actions && attacker.statblock.actions.length > 1 && (
                  <button
                    type="button"
                    onClick={handleMultiattackSeries}
                    className="py-2 px-4 rounded-sm bg-card border border-gold/50 text-gold-light font-bold text-xs hover:bg-surface transition-all flex items-center gap-1.5"
                  >
                    <span>⚔️</span>
                    <span>Серия мультиатак</span>
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
                    Число на реальной кости d20 (от 1 до 20):
                  </span>
                  <span className="text-xs font-mono text-gold-light bg-gold/10 px-2 py-0.5 rounded border border-gold/30">
                    Модификатор атаки: <strong>{currentActionDetails.attackBonus >= 0 ? `+${currentActionDetails.attackBonus}` : currentActionDetails.attackBonus}</strong>
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
                    <span className="text-gray-500 text-[10px] mr-1">Быстрый выбор:</span>
                    <button
                      type="button"
                      onClick={() => {
                        setPhysicalD20('1');
                        calculatePhysicalOutcome('1', physicalRawDamage, physicalTotalOverride);
                      }}
                      className="px-2 py-1 rounded bg-red-950/50 border border-red-800/60 text-red-300 hover:bg-red-900 font-bold"
                      title="Критический промах"
                    >
                      1 (Промах)
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
                      title="Критическое попадание (Крит)"
                    >
                      20 (КРИТ!)
                    </button>
                  </div>
                </div>

                {/* Real-time calculated status line */}
                {physicalD20 ? (
                  <div
                    className={`p-2 rounded text-xs font-mono font-medium border flex flex-wrap items-center justify-between gap-2 min-w-0 ${
                      isCrit
                        ? 'bg-emerald-950/40 border-emerald-500/70 text-emerald-200'
                        : isHit
                        ? 'bg-gold/10 border-gold/40 text-gold-light'
                        : 'bg-red-950/30 border-red-900/50 text-red-300'
                    }`}
                  >
                    <span className="break-words min-w-0 flex-1 leading-snug">{hitOutcomeText}</span>
                    <span className="font-bold text-[10px] uppercase px-1.5 py-0.5 rounded bg-surface border border-border-subtle shrink-0">
                      {isCrit ? 'КРИТ!' : isHit ? 'ПОПАДАНИЕ' : 'ПРОМАХ'}
                    </span>
                  </div>
                ) : (
                  <div className="text-[11px] text-gray-500 italic">
                    Введите выпавшее на реальной кости d20 число (1–20). Итог против КД цели ({target?.ac ?? 10}) рассчитается мгновенно.
                  </div>
                )}
              </div>

              {/* Step B: Damage Calculation (When Hit) */}
              {isHit && (
                <div className="p-3 bg-surface rounded-sm border border-border-subtle space-y-3 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-gray-200 flex items-center gap-1.5">
                      💥 Расчёт урона ({localizeDamageType(physicalDamageType || currentActionDetails.damageType)}):
                    </span>
                    {isCrit && (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-600 font-bold">
                        ⚡ КРИТ: кубы формулы удвоены ({critFormula})
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 items-end">
                    {/* Option 1: Roll Formula Button */}
                    <div>
                      <span className="text-[10px] text-gray-400 block mb-1 truncate" title={isCrit ? critFormula : currentActionDetails.damageFormula}>
                        Формула: <strong className="text-gold-light break-words">{isCrit ? critFormula : currentActionDetails.damageFormula}</strong>
                      </span>
                      <button
                        type="button"
                        onClick={handleRollFormulaInPhysicalMode}
                        className="w-full py-1.5 px-2 rounded-sm bg-gold/15 border border-gold/40 hover:bg-gold hover:text-black text-gold-light font-bold text-xs transition-all flex items-center justify-center gap-1 shadow-sm"
                      >
                        <span>🎲</span>
                        <span>Бросить формулу</span>
                      </button>
                    </div>

                    {/* Option 2: Enter Raw Damage from table */}
                    <div>
                      <span className="text-[10px] text-gray-400 block mb-1 truncate">
                        Чистый урон со стола (кости):
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
                        placeholder="Например, 11"
                        className="w-full bg-canvas border border-border-subtle text-xs rounded-sm px-2.5 py-1.5 text-gray-100 outline-none focus:border-gold [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                    </div>

                    {/* Option 3: Override Final Damage */}
                    <div>
                      <span className="text-[10px] text-gray-400 block mb-1 truncate">
                        Или суммарный урон:
                      </span>
                      <input
                        type="number"
                        min={0}
                        value={physicalTotalOverride || (finalCalculatedDamage > 0 ? String(finalCalculatedDamage) : '')}
                        onChange={(e) => {
                          setPhysicalTotalOverride(e.target.value);
                          calculatePhysicalOutcome(physicalD20, physicalRawDamage, e.target.value);
                        }}
                        placeholder="Итоговый урон"
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
                          ОЗ цели: <strong className="text-emerald-300">{target.hp}/{target.maxHp}</strong>
                          {target.tempHp > 0 && <span className="text-cyan-300 ml-1">(+{target.tempHp} врем. ОЗ)</span>}
                        </span>
                        {finalCalculatedDamage > 0 && (
                          <span className="text-gold-light">
                            После удара: {Math.max(0, target.hp - Math.max(0, finalCalculatedDamage - target.tempHp))} ОЗ
                            {target.tempHp > 0 && ` | ${Math.max(0, target.tempHp - finalCalculatedDamage)} врем. ОЗ`}
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
              Транслировать бросок на экран игроков
            </span>
          </label>

          <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap justify-end w-full sm:w-auto">
            <button
              type="button"
              onClick={closeTargetedAttack}
              className="min-h-[34px] px-4 py-2 rounded-glass border border-[rgba(255,255,255,0.08)] text-xs font-semibold text-gray-300 hover:text-white bg-white/5 hover:bg-white/10 transition-colors cursor-pointer"
            >
              Отмена
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
              💥 {isAoEMode && (attackOrSaveMode === 'save' || multiattackLogs.length > 0)
                ? 'Применить урон всем целям'
                : 'Применить урон к цели'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
