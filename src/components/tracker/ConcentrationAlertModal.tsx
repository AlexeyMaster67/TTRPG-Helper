import React, { useState, useEffect } from 'react';
import { useCombatStore } from '../../store/combatStore';
import { audioService } from '../../services/audioService';
import { broadcastService } from '../../services/broadcastService';
import { rollDie } from '../../engine/rolls';
import { Zap, ShieldCheck, ShieldAlert, X, Dices, Check, AlertOctagon } from 'lucide-react';

export const ConcentrationAlertModal: React.FC = () => {
  const alert = useCombatStore((s) => s.concentrationAlert);
  const clearConcentrationAlert = useCombatStore((s) => s.clearConcentrationAlert);
  const removeConcentration = useCombatStore((s) => s.removeConcentration);
  const addDiceLog = useCombatStore((s) => s.addDiceLog);

  const [rollResult, setRollResult] = useState<{
    d20: number;
    modifier: number;
    total: number;
    success: boolean;
  } | null>(null);

  // Reset roll outcome when a new alert arrives or modal closes
  useEffect(() => {
    setRollResult(null);
  }, [alert?.combatantId, alert?.damage, alert?.dc]);

  if (!alert) return null;

  const { combatantId, combatantName, damage, dc, conMod } = alert;

  const handleRollSave = () => {
    audioService.playDiceRoll();
    const d20 = rollDie(20);
    const total = d20 + conMod;
    const success = total >= dc;

    setRollResult({
      d20,
      modifier: conMod,
      total,
      success,
    });

    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const sign = conMod >= 0 ? `+${conMod}` : `${conMod}`;
    const resultText = success ? 'Концентрация удержана!' : 'Концентрация нарушена!';

    // 1. Log to combat store diceLog / diceHistory
    addDiceLog({
      id: crypto.randomUUID(),
      timestamp: timeStr,
      combatantName,
      actionName: 'Спасбросок концентрации (ТЕЛ)',
      attackRoll: {
        d20,
        modifier: conMod,
        total,
        isNat20: d20 === 20,
        isNat1: d20 === 1,
      },
      note: `⚡ Спасбросок Телосложения против СЛ ${dc}: d20(${d20}) ${sign} = ${total} -> ${resultText}`,
    });

    // 2. Broadcast roll to players screen
    broadcastService.send({
      type: 'BROADCAST_ROLL',
      payload: {
        id: crypto.randomUUID(),
        title: `${combatantName}: Спасбросок концентрации`,
        formula: `1d20 ${sign} против СЛ ${dc}`,
        resultDisplay: `⚡ ${total} против СЛ ${dc} [d20: ${d20}] -> ${resultText}`,
        total,
        isCritical: d20 === 20,
        isCriticalMiss: d20 === 1,
        timestamp: Date.now(),
      },
    });

    if (success) {
      audioService.playSfx('magic');
    }
  };

  const handleManualSuccess = () => {
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    addDiceLog({
      id: crypto.randomUUID(),
      timestamp: timeStr,
      combatantName,
      actionName: 'Концентрация удержана (вручную)',
      note: `⚡ ${combatantName} успешно удерживает концентрацию (вручную)`,
    });
    clearConcentrationAlert();
  };

  const handleManualFailure = () => {
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    addDiceLog({
      id: crypto.randomUUID(),
      timestamp: timeStr,
      combatantName,
      actionName: 'Концентрация потеряна',
      note: `⚡ ${combatantName} теряет концентрацию`,
    });
    removeConcentration(combatantId);
    clearConcentrationAlert();
  };

  const handleDropConcentration = () => {
    removeConcentration(combatantId);
    clearConcentrationAlert();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-md rounded-lg border-2 border-amber-500/80 bg-[#16171d] p-6 shadow-[0_0_35px_rgba(245,158,11,0.35)] text-gray-100 flex flex-col gap-4 overflow-hidden">
        {/* Animated amber top glow strip */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-600 via-amber-400 to-amber-600 animate-pulse" />

        {/* Header */}
        <div className="flex items-center justify-between gap-3 border-b border-amber-500/30 pb-3">
          <div className="flex items-center gap-2.5 text-amber-400">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-950/80 border border-amber-500/60 shadow-[0_0_12px_rgba(245,158,11,0.4)]">
              <Zap className="h-5 w-5 text-amber-300 animate-bounce" />
            </span>
            <div>
              <h3 className="text-base font-bold font-serif tracking-wide text-amber-300">
                Проверка концентрации!
              </h3>
              <p className="text-[11px] text-amber-200/70">D&D 5e / 2024 Правило урона</p>
            </div>
          </div>
          <button
            onClick={clearConcentrationAlert}
            className="text-gray-400 hover:text-white transition-colors p-1 rounded hover:bg-white/5"
            title="Пропустить"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Event description */}
        <div className="bg-[#1f2129] border border-amber-500/20 rounded-md p-3.5 space-y-2">
          <div className="text-sm font-semibold text-gray-200">
            <span className="text-amber-300">{combatantName}</span> получил{' '}
            <span className="font-mono text-red-400 font-bold">{damage}</span> урона.
          </div>
          <div className="flex items-center justify-between text-xs text-gray-300 bg-black/40 px-3 py-2 rounded border border-white/5">
            <span>Спасбросок Телосложения:</span>
            <span className="font-mono font-bold text-amber-300 text-sm">СЛ {dc}</span>
          </div>
          <div className="flex items-center justify-between text-xs text-gray-400 px-1">
            <span>Модификатор Телосложения:</span>
            <span className="font-mono font-bold text-gray-200">
              {conMod >= 0 ? `+${conMod}` : conMod}
            </span>
          </div>
        </div>

        {/* Dice roll section */}
        {!rollResult ? (
          <button
            onClick={handleRollSave}
            className="group relative flex items-center justify-center gap-3 w-full py-3 px-4 rounded-md font-bold text-sm bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 hover:from-amber-500 hover:to-amber-500 text-zinc-950 shadow-[0_0_20px_rgba(245,158,11,0.4)] hover:shadow-[0_0_25px_rgba(245,158,11,0.6)] transition-all active:scale-[0.98] cursor-pointer"
          >
            <Dices className="h-5 w-5 transition-transform group-hover:rotate-12" />
            <span>
              Бросить спасбросок (d20 {conMod >= 0 ? `+ ${conMod}` : `- ${Math.abs(conMod)}`})
            </span>
          </button>
        ) : (
          <div className="flex flex-col gap-3">
            {/* Roll Breakdown Card */}
            <div
              className={`p-3.5 rounded-md border flex flex-col gap-2 ${
                rollResult.success
                  ? 'bg-emerald-950/40 border-emerald-500/60 shadow-[0_0_20px_rgba(16,185,129,0.25)]'
                  : 'bg-red-950/40 border-red-500/60 shadow-[0_0_20px_rgba(239,68,68,0.25)]'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {rollResult.success ? (
                    <ShieldCheck className="h-5 w-5 text-emerald-400" />
                  ) : (
                    <ShieldAlert className="h-5 w-5 text-red-400" />
                  )}
                  <span
                    className={`font-bold text-sm ${
                      rollResult.success ? 'text-emerald-300' : 'text-red-300'
                    }`}
                  >
                    {rollResult.success ? 'Концентрация удержана!' : 'Концентрация нарушена!'}
                  </span>
                </div>
                <div className="font-mono text-xs text-gray-400">
                  СЛ {dc}
                </div>
              </div>

              {/* Math formula */}
              <div className="flex items-center justify-between text-xs bg-black/40 px-3 py-2 rounded">
                <span className="text-gray-400">
                  Бросок: d20 (<strong className="text-white">{rollResult.d20}</strong>){' '}
                  {rollResult.modifier >= 0 ? `+ ${rollResult.modifier}` : `- ${Math.abs(rollResult.modifier)}`}
                </span>
                <span className="font-mono font-bold text-base text-white">
                  = {rollResult.total}
                </span>
              </div>
            </div>

            {/* Quick action button based on roll */}
            {rollResult.success ? (
              <button
                onClick={clearConcentrationAlert}
                className="w-full py-2.5 px-4 rounded-md font-bold text-xs bg-emerald-700 hover:bg-emerald-600 text-white transition-colors cursor-pointer flex items-center justify-center gap-2"
              >
                <Check className="h-4 w-4" />
                <span>Отлично (Закрыть)</span>
              </button>
            ) : (
              <button
                onClick={handleDropConcentration}
                className="w-full py-2.5 px-4 rounded-md font-bold text-xs bg-red-700 hover:bg-red-600 text-white transition-colors shadow-[0_0_15px_rgba(239,68,68,0.4)] cursor-pointer flex items-center justify-center gap-2"
              >
                <AlertOctagon className="h-4 w-4" />
                <span>Снять концентрацию в 1 клик</span>
              </button>
            )}
          </div>
        )}

        {/* Manual Fallbacks and Controls */}
        <div className="border-t border-white/10 pt-3 flex items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <button
              onClick={handleManualSuccess}
              className="px-2.5 py-1.5 rounded bg-card hover:bg-emerald-950/60 border border-border-subtle hover:border-emerald-500/50 text-gray-300 hover:text-emerald-300 transition-colors cursor-pointer"
              title="Засчитать успешный бросок вручную"
            >
              Успех (вручную)
            </button>
            <button
              onClick={handleManualFailure}
              className="px-2.5 py-1.5 rounded bg-card hover:bg-red-950/60 border border-border-subtle hover:border-red-500/50 text-gray-300 hover:text-red-300 transition-colors cursor-pointer"
              title="Снять концентрацию вручную"
            >
              Провал (снять)
            </button>
          </div>

          <button
            onClick={clearConcentrationAlert}
            className="px-3 py-1.5 rounded text-gray-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
          >
            Пропустить
          </button>
        </div>
      </div>
    </div>
  );
};
