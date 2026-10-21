import { StateCreator } from 'zustand';
import { cleanRussianText, localizeDamageType } from '../../utils/textUtils';
import { rollD20, rollDiceFormula } from '../../engine/rolls';
import { processDamagePipeline } from '../../engine';
import {
  parseActionDetails,
  parseMultiattackPlan,
  computeDamageWithDefenses,
  formatDamageFormula,
} from '../../utils/attackParser';
import { DiceRollLogEntry } from '../../types/combat';
import { DamageType } from '../../types/dnd5e';
import { CombatState, TargetingSlice } from './types';
import { getCombatantConMod } from './sliceUtils';
import { useDice3dStore } from '../dice3dStore';
import { useDiceAnimationStore } from '../diceAnimationStore';

export const createTargetingSlice: StateCreator<
  CombatState,
  [],
  [],
  TargetingSlice
> = (set, get) => ({
  targetedAttackModalOpen: false,
  targetedAttackAttackerId: null,
  targetedAttackActionName: null,

  currentTargetId: null,
  isTargetingMode: false,
  targetingPrompt: null,
  pendingAttackAction: null,
  pendingAttackerId: null,
  attackAdvantageMode: 'normal',

  setCurrentTargetId: (id) => {
    set({ currentTargetId: id });
  },

  toggleCurrentTargetId: (id) => {
    const { currentTargetId } = get();
    set({ currentTargetId: currentTargetId === id ? null : id });
  },

  startTargetingMode: (attackerId, action, prompt) => {
    set({
      isTargetingMode: true,
      pendingAttackerId: attackerId,
      pendingAttackAction: action,
      targetingPrompt: prompt || null,
    });
  },

  cancelTargetingMode: () => {
    set({
      isTargetingMode: false,
      pendingAttackerId: null,
      pendingAttackAction: null,
      targetingPrompt: null,
    });
  },

  setAttackAdvantageMode: (attackAdvantageMode) => {
    set({ attackAdvantageMode });
  },

  executeTargetedStrike: (attackerId, targetId, action, advantageMode) => {
    if (action?._isMultiattack) {
      get().executeMultiattackSeries(attackerId, targetId);
      return;
    }

    const { combatants, attackAdvantageMode, addDiceLog } = get();
    const attacker = combatants.find((c) => c.id === attackerId);
    const target = combatants.find((c) => c.id === targetId);
    if (!attacker || !target) return;
    if (attacker.isPlayer) {
      console.warn('Player actions are resolved physically at the table. Enter the result manually.');
      return;
    }

    const attackerName = cleanRussianText(attacker.nameRu || attacker.name);
    const targetName = cleanRussianText(target.nameRu || target.name);
    const actionName = cleanRussianText(action?.name || 'Атака');
    const desc = action?.desc || '';

    // 1. Parse attack bonus
    let attackBonus = action?.attack_bonus ?? null;
    if (attackBonus === null) {
      const hitMatch = desc.match(/(?:\+|Attack Roll:\s*\+|к попаданию:\s*\+)(\d+)/i);
      if (hitMatch) attackBonus = parseInt(hitMatch[1], 10);
    }
    const bonus = attackBonus ?? 0;

    // 2. Parse damage formula & damage type
    let damageFormula = formatDamageFormula(action?.damage_dice, action?.damage_bonus);
    if (!damageFormula) {
      const diceMatch = desc.match(/(\d+d\d+(?:\s*[+-]\s*\d+)?)/i);
      if (diceMatch) damageFormula = formatDamageFormula(diceMatch[1]);
    }
    const dmgFormula = damageFormula || '1d8';
    const rawDamageType = (action?.damage_type || 'slashing').toLowerCase();
    const dmgType = rawDamageType as any;

    // 3. Detect weapon mastery
    const masteries = ['Slow', 'Topple', 'Vex', 'Sap', 'Nick', 'Push', 'Graze', 'Cleave'];
    let weaponMastery: string | undefined = action?.weapon_mastery;
    if (!weaponMastery) {
      for (const m of masteries) {
        if (new RegExp(`\\b${m}\\b`, 'i').test(desc) || new RegExp(`\\b${m}\\b`, 'i').test(action?.name || '')) {
          weaponMastery = m;
          break;
        }
      }
    }

    // 4. Roll d20 vs target AC
    const advMode = advantageMode || attackAdvantageMode || 'normal';
    const d20Result = rollD20(advMode, bonus);
    const isNat20 = d20Result.isNatural20;
    const isNat1 = d20Result.isNatural1;
    const isHit = isNat20 || (!isNat1 && d20Result.total >= target.ac);

    let effectiveDamage = 0;
    let concPrompt: { dc: number; targetId: string } | undefined;
    let topplePrompt: { dc: number; targetId: string } | undefined;
    let note = '';
    let dmgRollResult: ReturnType<typeof rollDiceFormula> | undefined;

    if (!isHit) {
      // MISS
      if (weaponMastery === 'Graze') {
        const abilityMod = Math.max(1, Math.floor(((attacker.statblock?.str || 10) - 10) / 2));
        const pipeResult = processDamagePipeline([{ type: dmgType, amount: abilityMod }], target);
        effectiveDamage = pipeResult.totalEffectiveDamage;
        note = `Задевание (Graze): нанесён гарантированный урон ${effectiveDamage}`;
        // Apply damage to target
        set((state) => ({
          combatants: state.combatants.map((c) =>
            c.id === target.id
              ? {
                  ...c,
                  hp: pipeResult.newHp,
                  tempHp: pipeResult.newTempHp,
                  isDying: pipeResult.isDying,
                  isDead: pipeResult.isDead,
                }
              : c
          ),
        }));
      } else {
        note = `${attackerName} бьет ${targetName}: Промах (${d20Result.total} против КД ${target.ac})`;
      }
    } else {
      // HIT
      const dmgRoll = rollDiceFormula(dmgFormula);
      dmgRollResult = dmgRoll;
      let rawAmount = dmgRoll.total;
      let dmgDetails = `${dmgRoll.formula} = ${dmgRoll.total}`;
      if (isNat20) {
        const critDmg = rollDiceFormula(dmgFormula);
        rawAmount += critDmg.total;
        dmgDetails = `КРИТ! (${dmgRoll.formula} + ${critDmg.formula}) = ${rawAmount}`;
      }

      const pipeResult = processDamagePipeline([{ type: dmgType, amount: rawAmount }], target, { isCritical: isNat20 });
      effectiveDamage = pipeResult.totalEffectiveDamage;

      // Apply damage to target
      set((state) => ({
        combatants: state.combatants.map((c) =>
          c.id === target.id
            ? {
                ...c,
                hp: pipeResult.newHp,
                tempHp: pipeResult.newTempHp,
                isDying: pipeResult.isDying,
                isDead: pipeResult.isDead,
              }
            : c
        ),
      }));

      // Concentration check (DC = max(10, damage / 2))
      const hasConcCondition = Array.isArray(target.conditions) && target.conditions.some((c: any) => {
        const t = String(c?.type || c?.name || c || '').toLowerCase();
        const s = String(c?.source || '').toLowerCase();
        return t.includes('concentration') || t.includes('концентрация') || s.includes('concentration') || s.includes('концентрация');
      });
      const isTargetConcentrating = Boolean(target.isConcentrating) || hasConcCondition;
      if (isTargetConcentrating && effectiveDamage > 0) {
        const dc = Math.max(10, Math.floor(effectiveDamage / 2));
        concPrompt = { dc, targetId: target.id };
        const conMod = getCombatantConMod(target);
        set({
          concentrationAlert: {
            combatantId: target.id,
            combatantName: targetName,
            damage: effectiveDamage,
            dc,
            conMod,
          },
        });
      }

      // Mastery checks
      let masteryNote = '';
      if (weaponMastery === 'Topple') {
        const toppleDc = 8 + (attacker.statblock?.pb || 2) + Math.max(0, Math.floor(((attacker.statblock?.str || attacker.statblock?.dex || 10) - 10) / 2));
        topplePrompt = { dc: toppleDc, targetId: target.id };
        masteryNote = `Опрокидывание (Topple Сл ${toppleDc})`;
      } else if (weaponMastery === 'Push') {
        masteryNote = 'Толчок (Push 10 фт)';
      } else if (weaponMastery === 'Slow') {
        masteryNote = 'Замедление (Slow -10 фт)';
      }

      note = `${attackerName} бьет ${targetName}: Попадание ${d20Result.total} против КД ${target.ac}! Списано ${effectiveDamage} урона (${dmgDetails})`;
      if (masteryNote) note += ` • ${masteryNote}`;
    }

    // 5. Add to diceLog
    const isSecret = useDice3dStore.getState().isSecretRoll;
    const is3d = useDice3dStore.getState().is3dEnabled;

    const logEntry: DiceRollLogEntry = {
      id: crypto.randomUUID(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      combatantName: isSecret ? `[Скрытно] ${attackerName}` : attackerName,
      actionName: isSecret ? `[Скрытно] ${actionName}` : actionName,
      targetName,
      targetId: target.id,
      isHit,
      effectiveDamage,
      attackRoll: {
        d20: d20Result.keptRoll,
        modifier: d20Result.modifier,
        total: d20Result.total,
        isNat20,
        isNat1,
      },
      damageRoll: isHit || effectiveDamage > 0 ? {
        formula: dmgFormula,
        total: effectiveDamage,
        damageType: localizeDamageType(dmgType),
        details: isHit ? `${effectiveDamage} ${localizeDamageType(dmgType)} урона` : `Гарантированный урон: ${effectiveDamage}`,
      } : undefined,
      weaponMastery,
      note,
      concentrationPrompt: concPrompt,
      topplePrompt,
    };
    addDiceLog(logEntry);

    // Collect dice to animate (d20 attack + damage dice pool if hit)
    const diceToAnimate: Array<{ sides: number; result: number }> = [];
    if (d20Result.d20_2 !== undefined) {
      diceToAnimate.push({ sides: 20, result: d20Result.d20_1 });
      diceToAnimate.push({ sides: 20, result: d20Result.d20_2 });
    } else {
      diceToAnimate.push({ sides: 20, result: d20Result.keptRoll });
    }

    const damagePoolDice: Array<{ id: string; sides: number; value: number }> = [];
    if (isHit && dmgRollResult && dmgRollResult.rolls) {
      let dIdx = 0;
      for (const r of dmgRollResult.rolls) {
        for (const v of r.values) {
          diceToAnimate.push({ sides: r.sides, result: v });
          damagePoolDice.push({ id: `dmg-${r.sides}-${dIdx++}`, sides: r.sides, value: v });
        }
      }
    }

    // 6. Trigger 2D Animated Dice for DM & Players (with multi-dice pool on hit!)
    if (isHit) {
      if (damagePoolDice.length === 0) {
        damagePoolDice.push({ id: 'dmg-static', sides: 6, value: effectiveDamage });
      }
      useDiceAnimationStore.getState().triggerRoll({
        id: crypto.randomUUID(),
        title: `${attackerName}: ${actionName} (${isNat20 ? 'КРИТ!' : 'Попадание!'})`,
        subtitle: `По цели: ${targetName} [КД ${target.ac}]`,
        dice: damagePoolDice,
        modifier: dmgRollResult?.modifier || 0,
        total: effectiveDamage,
        damageType: localizeDamageType(dmgType),
        isNat20,
        rollerName: attackerName,
        targetName,
      });
    } else {
      useDiceAnimationStore.getState().triggerRoll({
        id: crypto.randomUUID(),
        title: `${attackerName}: ${actionName} (Промах)`,
        subtitle: `Промах по ${targetName} [${d20Result.total} против КД ${target.ac}]`,
        sides: 20,
        r1: d20Result.d20_1,
        r2: d20Result.d20_2,
        kept: d20Result.keptRoll,
        modifier: d20Result.modifier,
        total: d20Result.total,
        mode: advMode,
        isNat1,
        isNat20: false,
        rollerName: attackerName,
        targetName,
      });
    }

    if (is3d) {
      useDice3dStore.getState().rollDice3d({
        dice: diceToAnimate,
        title: `${attackerName}: ${actionName}`,
        total: isHit ? effectiveDamage : d20Result.total,
        isSecret,
        rollMode: advMode,
      });
    }

    // 7. Reset targeting mode
    set({
      isTargetingMode: false,
      pendingAttackAction: null,
      pendingAttackerId: null,
      targetingPrompt: null,
    });

    get().triggerAutosave();
  },

  executeMultiattackSeries: (attackerId, targetId) => {
    const { combatants, attackAdvantageMode, addDiceLog, applyDamage } = get();
    const attacker = combatants.find((c) => c.id === attackerId);
    const target = combatants.find((c) => c.id === targetId);
    if (!attacker || !target || attacker.isPlayer) return;

    const attackerName = cleanRussianText(attacker.nameRu || attacker.name);
    const targetName = cleanRussianText(target.nameRu || target.name);

    const multiattackAction = attacker.statblock?.actions?.find((a: any) =>
      /мультиатака|multiattack/i.test(a.name)
    );
    const attackSeries = parseMultiattackPlan(multiattackAction, attacker.statblock?.actions || []);

    if (attackSeries.length === 0) return;

    let totalEffectiveDamage = 0;
    let highestHitDamage = 0;
    let hitsCount = 0;
    let anyCrit = false;
    let concPrompt: { dc: number; targetId: string } | undefined;
    let topplePrompt: { dc: number; targetId: string } | undefined;
    const stepLogs: string[] = [];
    let primaryDamageType: DamageType = 'slashing';
    const seriesDice: Array<{ id: string; sides: number; value: number }> = [];

    for (let i = 0; i < attackSeries.length; i++) {
      const act = attackSeries[i];
      const actName = cleanRussianText(act.name);
      const { attackBonus, damageFormula, damageType, weaponMastery } = parseActionDetails(act);
      const bonus = attackBonus ?? 0;
      const formula = damageFormula || '1d8';
      const dmgType = (damageType || 'slashing') as DamageType;
      if (i === 0) primaryDamageType = dmgType;

      const d20 = rollD20(attackAdvantageMode, bonus);
      const isNat20 = d20.isNatural20;
      const isNat1 = d20.isNatural1;
      const isHit = isNat20 || (!isNat1 && d20.total >= target.ac);
      const rollLog = `[d20: ${d20.keptRoll}${bonus >= 0 ? `+${bonus}` : bonus} = ${d20.total}]`;

      if (!isHit) {
        if (weaponMastery === 'Graze') {
          const abilityMod = Math.max(1, Math.floor(((attacker.statblock?.str || 10) - 10) / 2));
          const { finalDmg } = computeDamageWithDefenses(abilityMod, dmgType, target);
          totalEffectiveDamage += finalDmg;
          if (finalDmg > highestHitDamage) highestHitDamage = finalDmg;
          stepLogs.push(`#${i + 1} ${actName}: ${rollLog} vs КД ${target.ac} -> ПРОМАХ (Graze: ${finalDmg} ур.)`);
        } else {
          stepLogs.push(`#${i + 1} ${actName}: ${rollLog} vs КД ${target.ac} -> ПРОМАХ`);
        }
        continue;
      }

      hitsCount++;
      if (isNat20) anyCrit = true;

      let rollFormula = formula;
      if (isNat20) {
        rollFormula = formula.replace(/(\d+)d(\d+)/g, (_m, count, sides) => `${parseInt(count, 10) * 2}d${sides}`);
      }

      const dmgRoll = rollDiceFormula(rollFormula);
      if (dmgRoll.rolls) {
        for (const r of dmgRoll.rolls) {
          for (const v of r.values) {
            seriesDice.push({
              id: `m-${r.sides}-${seriesDice.length}`,
              sides: r.sides,
              value: v,
            });
          }
        }
      }
      const { finalDmg, notice } = computeDamageWithDefenses(dmgRoll.total, dmgType, target);
      totalEffectiveDamage += finalDmg;
      if (finalDmg > highestHitDamage) highestHitDamage = finalDmg;

      if (weaponMastery === 'Topple') {
        const toppleDc =
          8 +
          (attacker.statblock?.pb || 2) +
          Math.max(0, Math.floor(((attacker.statblock?.str || attacker.statblock?.dex || 10) - 10) / 2));
        topplePrompt = { dc: toppleDc, targetId: target.id };
      }

      stepLogs.push(
        `#${i + 1} ${actName}: ${rollLog} vs КД ${target.ac} -> ${isNat20 ? 'КРИТ! ' : 'ХИТ! '}${finalDmg} ур. (${dmgRoll.formula}${notice ? `, ${notice}` : ''})`
      );
    }

    // Apply combined damage with defenses already calculated (skipDefenses: true to avoid double deduction)
    if (totalEffectiveDamage > 0) {
      applyDamage(target.id, [{ amount: totalEffectiveDamage, type: primaryDamageType }], anyCrit, true);
    }

    // Concentration DC check (D&D 2024: max(10, highestHitDamage / 2))
    if (target.isConcentrating && totalEffectiveDamage > 0) {
      const concDc = Math.max(10, Math.floor(highestHitDamage / 2));
      concPrompt = { dc: concDc, targetId: target.id };
    }

    const seriesSummary = `Серия мультиатаки (${attackSeries.length} атак): ${hitsCount}/${attackSeries.length} попаданий. Нанесено ${totalEffectiveDamage} урона.`;

    // Add to diceLog
    const isSecret = useDice3dStore.getState().isSecretRoll;
    const logCombatantName = isSecret ? `[Скрытно] ${attackerName}` : attackerName;
    const logActionName = isSecret ? `[Скрытно] Мультиатака (${attackSeries.length} атак)` : `Мультиатака (${attackSeries.length} атак)`;

    addDiceLog({
      id: crypto.randomUUID(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      combatantName: logCombatantName,
      actionName: logActionName,
      targetName,
      targetId: target.id,
      isHit: hitsCount > 0,
      effectiveDamage: totalEffectiveDamage,
      attackRoll: {
        d20: 0,
        modifier: 0,
        total: 0,
        isNat20: anyCrit,
        isNat1: false,
      },
      damageRoll: totalEffectiveDamage > 0 ? {
        formula: attackSeries.map((a: any) => a.damage_dice || '1d8').join(' + '),
        total: totalEffectiveDamage,
        damageType: localizeDamageType(primaryDamageType),
        details: stepLogs.join(' | '),
      } : undefined,
      note: `${seriesSummary} ${stepLogs.join(' | ')}`,
      concentrationPrompt: concPrompt,
      topplePrompt,
    });

    // Trigger 2D Animated Dice for DM & Players (multi-dice damage pool)
    if (hitsCount > 0) {
      useDiceAnimationStore.getState().triggerRoll({
        id: crypto.randomUUID(),
        title: cleanRussianText(`${attackerName}: Мультиатака (${hitsCount}/${attackSeries.length} хитов)`),
        subtitle: `По цели: ${targetName} • Нанесено ${totalEffectiveDamage} урона`,
        dice: seriesDice.length > 0 ? seriesDice : [{ id: 'm-dmg-static', sides: 6, value: totalEffectiveDamage }],
        total: totalEffectiveDamage,
        damageType: localizeDamageType(primaryDamageType),
        isNat20: anyCrit,
        rollerName: attackerName,
        targetName,
      });
    } else {
      useDiceAnimationStore.getState().triggerRoll({
        id: crypto.randomUUID(),
        title: cleanRussianText(`${attackerName}: Мультиатака (Все мимо)`),
        subtitle: `Серия по цели: ${targetName} [0/${attackSeries.length} попаданий]`,
        sides: 20,
        kept: 0,
        modifier: 0,
        total: 0,
        rollerName: attackerName,
        targetName,
      });
    }

    // Reset targeting mode and set current target
    set({
      isTargetingMode: false,
      pendingAttackAction: null,
      pendingAttackerId: null,
      targetingPrompt: null,
      currentTargetId: target.id,
    });

    get().triggerAutosave();
  },

  openTargetedAttack: (attackerId, actionName) => {
    const { activeCombatantId, inspectedCombatantId } = get();
    set({
      targetedAttackModalOpen: true,
      targetedAttackAttackerId: attackerId || inspectedCombatantId || activeCombatantId,
      targetedAttackActionName: actionName || null,
    });
  },

  closeTargetedAttack: () => {
    set({
      targetedAttackModalOpen: false,
      targetedAttackAttackerId: null,
      targetedAttackActionName: null,
    });
  },
});
