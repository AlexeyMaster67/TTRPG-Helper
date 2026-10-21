import { useState } from 'react';
import { Dices, X, Plus, Minus, Sparkles } from 'lucide-react';
import { audioService } from '../../services/audioService';
import { useCombatStore } from '../../store/combatStore';
import { rollDie } from '../../engine/rolls';
import { RollMode } from '../../types/dnd5e';

interface MobileFloatingDiceProps {
  characterName?: string;
}

export function MobileFloatingDice({ characterName = 'Герой' }: MobileFloatingDiceProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedDie, setSelectedDie] = useState<number>(20);
  const [rollMode, setRollMode] = useState<RollMode>('normal');
  const [modifier, setModifier] = useState<number>(0);
  const [rollReason, setRollReason] = useState<string>('Бросок кости');
  const [lastResult, setLastResult] = useState<{
    total: number;
    dieRoll1: number;
    dieRoll2?: number;
    modifier: number;
    isNat20?: boolean;
    isNat1?: boolean;
    dieSides: number;
    mode: RollMode;
  } | null>(null);

  const addDiceLog = useCombatStore((s) => s.addDiceLog);

  const handleRoll = () => {
    audioService.playDiceRoll();

    const dieRoll1 = rollDie(selectedDie);
    let dieRoll2: number | undefined;
    let keptRoll = dieRoll1;

    if (selectedDie === 20) {
      if (rollMode === 'advantage') {
        dieRoll2 = rollDie(20);
        keptRoll = Math.max(dieRoll1, dieRoll2);
      } else if (rollMode === 'disadvantage') {
        dieRoll2 = rollDie(20);
        keptRoll = Math.min(dieRoll1, dieRoll2);
      }
    }

    const total = keptRoll + modifier;
    const isNat20 = selectedDie === 20 && keptRoll === 20;
    const isNat1 = selectedDie === 20 && keptRoll === 1;

    if (isNat20) {
      audioService.playCriticalHit();
    } else if (isNat1) {
      audioService.playSadHorn();
    }

    setLastResult({
      total,
      dieRoll1,
      dieRoll2,
      modifier,
      isNat20,
      isNat1,
      dieSides: selectedDie,
      mode: rollMode,
    });

    const now = new Date();
    const timeStr = now.toTimeString().split(' ')[0];

    addDiceLog({
      id: `dice-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: timeStr,
      combatantName: characterName,
      actionName: `${rollReason} (d${selectedDie})`,
      attackRoll: {
        d20: keptRoll,
        modifier,
        total,
        isNat20: !!isNat20,
        isNat1: !!isNat1,
      },
      note:
        selectedDie === 20 && rollMode !== 'normal'
          ? `Режим: ${rollMode === 'advantage' ? 'Преимущество' : 'Помеха'} [${dieRoll1}, ${dieRoll2}]`
          : undefined,
    });
  };

  const diceTypes = [4, 6, 8, 10, 12, 20, 100];

  return (
    <>
      {/* Floating Action Button */}
      <button
        onClick={() => setIsOpen(true)}
        aria-label="Бросить кубик"
        className="fixed bottom-20 right-3.5 z-40 w-12 h-12 rounded-full bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white shadow-xl shadow-amber-950/50 flex items-center justify-center border-2 border-amber-300/40 active:scale-95 transition-all touch-manipulation"
      >
        <Dices className="w-6 h-6" />
      </button>

      {/* Quick Roll Bottom Sheet Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4">
          <div className="w-full max-w-md bg-stone-900 border-t sm:border border-stone-700 sm:rounded-2xl rounded-t-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in slide-in-from-bottom duration-200">
            {/* Header */}
            <div className="px-4 py-3 bg-stone-850 border-b border-stone-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Dices className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-semibold text-stone-100">
                  Быстрый бросок костей
                </h3>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="w-9 h-9 rounded-lg flex items-center justify-center text-stone-400 hover:text-stone-200 hover:bg-stone-800 active:scale-95 transition-colors"
                aria-label="Закрыть"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content Body */}
            <div className="p-4 space-y-4 overflow-y-auto">
              {/* Last Result Showcase */}
              {lastResult && (
                <div
                  className={`p-3 rounded-xl border text-center transition-all ${
                    lastResult.isNat20
                      ? 'bg-amber-950/40 border-amber-500/80 text-amber-200'
                      : lastResult.isNat1
                      ? 'bg-red-950/40 border-red-500/80 text-red-200'
                      : 'bg-stone-800/80 border-stone-700 text-stone-100'
                  }`}
                >
                  <div className="text-xs uppercase tracking-wider text-stone-400 mb-1">
                    Результат броска d{lastResult.dieSides}
                    {lastResult.dieSides === 20 && lastResult.mode !== 'normal' && (
                      <span className="ml-1 text-amber-400">
                        ({lastResult.mode === 'advantage' ? 'Преимущество' : 'Помеха'})
                      </span>
                    )}
                  </div>
                  <div className="text-4xl font-black font-mono tracking-tight my-1">
                    {lastResult.total}
                  </div>
                  <div className="text-xs text-stone-400 flex items-center justify-center gap-2">
                    <span>
                      Кость: {lastResult.dieRoll1}
                      {lastResult.dieRoll2 !== undefined && ` / ${lastResult.dieRoll2}`}
                    </span>
                    <span>Модификатор: {lastResult.modifier >= 0 ? `+${lastResult.modifier}` : lastResult.modifier}</span>
                  </div>
                  {lastResult.isNat20 && (
                    <div className="mt-2 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                      <Sparkles className="w-3.5 h-3.5" />
                      Натуральная 20 - Критический триумф!
                    </div>
                  )}
                  {lastResult.isNat1 && (
                    <div className="mt-2 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-500/20 text-red-300 border border-red-500/40">
                      Натуральная 1 - Критический провал!
                    </div>
                  )}
                </div>
              )}

              {/* Dice Type Buttons */}
              <div>
                <label className="block text-xs font-medium text-stone-400 mb-2">
                  Тип кости
                </label>
                <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
                  {diceTypes.map((sides) => {
                    const isSelected = selectedDie === sides;
                    return (
                      <button
                        key={sides}
                        onClick={() => setSelectedDie(sides)}
                        className={`min-h-[44px] rounded-lg font-mono font-bold text-sm transition-all border ${
                          isSelected
                            ? 'bg-amber-600 text-white border-amber-400 shadow-md shadow-amber-900/40'
                            : 'bg-stone-800 text-stone-300 border-stone-700 hover:bg-stone-750 active:bg-stone-700'
                        }`}
                      >
                        d{sides}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* D20 Mode (Advantage / Normal / Disadvantage) */}
              {selectedDie === 20 && (
                <div>
                  <label className="block text-xs font-medium text-stone-400 mb-2">
                    Режим броска d20
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      onClick={() => setRollMode('advantage')}
                      className={`min-h-[44px] rounded-lg text-xs font-semibold transition-all border ${
                        rollMode === 'advantage'
                          ? 'bg-emerald-700 text-white border-emerald-400'
                          : 'bg-stone-800 text-stone-400 border-stone-700 hover:bg-stone-750'
                      }`}
                    >
                      Преимущество
                    </button>
                    <button
                      onClick={() => setRollMode('normal')}
                      className={`min-h-[44px] rounded-lg text-xs font-semibold transition-all border ${
                        rollMode === 'normal'
                          ? 'bg-stone-700 text-white border-stone-400'
                          : 'bg-stone-800 text-stone-400 border-stone-700 hover:bg-stone-750'
                      }`}
                    >
                      Обычный
                    </button>
                    <button
                      onClick={() => setRollMode('disadvantage')}
                      className={`min-h-[44px] rounded-lg text-xs font-semibold transition-all border ${
                        rollMode === 'disadvantage'
                          ? 'bg-red-800 text-white border-red-400'
                          : 'bg-stone-800 text-stone-400 border-stone-700 hover:bg-stone-750'
                      }`}
                    >
                      Помеха
                    </button>
                  </div>
                </div>
              )}

              {/* Modifier adjustment */}
              <div>
                <label className="block text-xs font-medium text-stone-400 mb-2">
                  Модификатор к броску
                </label>
                <div className="flex items-center justify-between gap-2 bg-stone-800 border border-stone-700 rounded-lg p-1.5">
                  <button
                    onClick={() => setModifier((m) => m - 1)}
                    className="min-h-[44px] min-w-[44px] rounded-md bg-stone-750 hover:bg-stone-700 text-stone-200 flex items-center justify-center font-bold text-lg active:scale-95 transition-all"
                    aria-label="Уменьшить модификатор"
                  >
                    <Minus className="w-5 h-5" />
                  </button>

                  <div className="text-center font-mono font-bold text-xl text-amber-300">
                    {modifier >= 0 ? `+${modifier}` : modifier}
                  </div>

                  <button
                    onClick={() => setModifier((m) => m + 1)}
                    className="min-h-[44px] min-w-[44px] rounded-md bg-stone-750 hover:bg-stone-700 text-stone-200 flex items-center justify-center font-bold text-lg active:scale-95 transition-all"
                    aria-label="Увеличить модификатор"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Reason / Context */}
              <div>
                <label className="block text-xs font-medium text-stone-400 mb-1.5">
                  Название действия / Проверка
                </label>
                <input
                  type="text"
                  value={rollReason}
                  onChange={(e) => setRollReason(e.target.value)}
                  placeholder="Например: Проверка Силы, Атака"
                  className="w-full min-h-[44px] px-3 rounded-lg bg-stone-800 border border-stone-700 text-stone-100 text-sm focus:border-amber-500 focus:outline-none"
                />
              </div>

              {/* Big Roll Action Button */}
              <button
                onClick={handleRoll}
                className="w-full min-h-[50px] rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 active:scale-[0.98] text-white font-bold text-base shadow-lg shadow-amber-950/60 border border-amber-400/50 flex items-center justify-center gap-2 transition-all touch-manipulation"
              >
                <Dices className="w-6 h-6" />
                <span>Бросить d{selectedDie} {modifier >= 0 ? `+ ${modifier}` : `- ${Math.abs(modifier)}`}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
