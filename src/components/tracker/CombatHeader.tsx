import {
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  ArrowDownUp,
  UserPlus,
  Users,
  Undo2,
  Redo2,
  Flame,
  Moon,
  Sparkles,
  ScrollText,
  Swords,
} from 'lucide-react';
import { useCombatStore } from '../../store/combatStore';
import { usePartyStore } from '../../store/partyStore';
import { Combatant } from '../../types/combat';
import { TurnTimer } from '../combat/TurnTimer';

export const CR_TO_XP: Record<string, number> = {
  '0': 10,
  '1/8': 25,
  '0.125': 25,
  '1/4': 50,
  '0.25': 50,
  '1/2': 100,
  '0.5': 100,
  '1': 200,
  '2': 450,
  '3': 700,
  '4': 1100,
  '5': 1800,
  '6': 2300,
  '7': 2900,
  '8': 3900,
  '9': 5000,
  '10': 5900,
  '11': 7200,
  '12': 8400,
  '13': 10000,
  '14': 11500,
  '15': 13000,
  '16': 15000,
  '17': 18000,
  '18': 20000,
  '19': 22000,
  '20': 25000,
  '21': 33000,
  '22': 41000,
  '23': 50000,
  '24': 62000,
  '25': 75000,
  '26': 90000,
  '27': 105000,
  '28': 120000,
  '29': 135000,
  '30': 155000,
};

export function calculateEncounterXp(combatants: Combatant[]): number {
  return combatants.reduce((sum, c) => {
    if (c.isPlayer) return sum;
    if (c.statblock?.xp && typeof c.statblock.xp === 'number') {
      return sum + c.statblock.xp;
    }
    const rawCr = (c.cr || c.statblock?.cr || '').trim();
    if (!rawCr) return sum;
    const cleanCr = rawCr.replace(/^cr\s*/i, '').trim();
    return sum + (CR_TO_XP[cleanCr] ?? CR_TO_XP[rawCr] ?? 0);
  }, 0);
}

export interface CombatHeaderProps {
  onAddPlayer?: () => void;
}

export function CombatHeader({ onAddPlayer }: CombatHeaderProps) {
  const {
    combatants,
    roundCounter,
    nextTurn,
    prevTurn,
    undoStack,
    redoStack,
    undoLastAction,
    redoLastAction,
    sortByInitiative,
    resetCombat,
    setRound,
    combatLog,
    setCombatLogOpen,
    setMobModalOpen,
  } = useCombatStore();

  const aliveCombatants = combatants.filter((c) => !c.isDead && c.hp > 0).length;
  const totalXp = calculateEncounterXp(combatants);

  return (
    <header className="relative z-30 p-2 sm:p-2.5 border-b border-[rgba(255,255,255,0.08)] bg-[rgba(14,18,25,0.65)] backdrop-blur-md flex flex-col gap-2 flex-shrink-0 select-none">
      {/* Верхний ярус (Ряд 1): Счётчик раунда, бойцы, опыт + Таймер хода, Сортировка, Сброс */}
      <div className="flex items-center justify-between gap-1.5 flex-wrap relative z-20">
        {/* Слева: Счётчик раунда, В строю, Опыт */}
        <div className="flex items-center gap-1.5 flex-wrap relative z-10">
          {/* Счётчик раунда */}
          <div className="flex items-center gap-1.5 bg-black/40 px-2 py-1 rounded-full border border-[rgba(255,255,255,0.08)] flex-shrink-0 shadow-sm">
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider font-sans">
              Раунд
            </span>
            <div className="flex items-center gap-1 bg-[rgba(20,25,35,0.8)] px-1.5 py-0.5 rounded-full border border-[rgba(255,255,255,0.08)]">
              <button
                type="button"
                onClick={() => setRound(Math.max(1, roundCounter - 1))}
                title="Уменьшить номер раунда"
                className="w-5 h-5 flex items-center justify-center text-gray-400 hover:text-white rounded-full hover:bg-white/10 font-bold text-xs leading-none transition-colors cursor-pointer"
              >
                -
              </button>
              <span className="font-mono text-xs sm:text-sm font-extrabold text-[#f5b920] tabular-nums px-1 leading-none">
                {roundCounter}
              </span>
              <button
                type="button"
                onClick={() => setRound(roundCounter + 1)}
                title="Увеличить номер раунда"
                className="w-5 h-5 flex items-center justify-center text-gray-400 hover:text-white rounded-full hover:bg-white/10 font-bold text-xs leading-none transition-colors cursor-pointer"
              >
                +
              </button>
            </div>
          </div>

          {/* Счётчик бойцов: живые / всего */}
          <div
            className="flex items-center gap-1.5 bg-black/40 px-2.5 py-1 rounded-full border border-[rgba(255,255,255,0.08)] text-xs font-medium text-gray-300 flex-shrink-0 shadow-sm"
            title={`Живых участников: ${aliveCombatants} из ${combatants.length}`}
          >
            <span
              className={`w-2 h-2 rounded-full flex-shrink-0 ${
                aliveCombatants > 0 ? 'bg-emerald-400 animate-pulse shadow-[0_0_8px_#10b981]' : 'bg-gray-600'
              }`}
            />
            <span className="text-gray-400 font-sans text-[11px]">В строю:</span>
            <span className="font-mono font-bold text-white">{aliveCombatants}</span>
            <span className="text-gray-500 font-mono">/{combatants.length}</span>
          </div>

          {/* Суммарный опыт (XP) */}
          <div
            className="flex items-center gap-1.5 bg-black/40 px-2.5 py-1 rounded-full border border-[rgba(255,255,255,0.08)] text-xs font-medium text-[#fce79f] flex-shrink-0 shadow-sm"
            title={`Суммарный опыт за побежденных противников: ${totalXp.toLocaleString()} XP`}
          >
            <Sparkles className="w-3.5 h-3.5 text-[#f5b920] flex-shrink-0" />
            <span className="text-gray-400 font-sans text-[11px]">Опыт:</span>
            <span className="font-mono font-bold text-[#f5b920]">
              {totalXp.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Справа: Таймер хода + Сортировка + Сброс боя */}
        <div className="flex items-center gap-1.5 flex-shrink-0 ml-auto">
          {/* Настраиваемый таймер хода с обратным отсчетом */}
          <TurnTimer />

          <button
            type="button"
            onClick={sortByInitiative}
            disabled={combatants.length === 0}
            title="Сортировать участников по убыванию инициативы"
            className="flex items-center gap-1 min-h-[32px] px-2.5 py-1 text-xs font-medium rounded-full bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] hover:border-[#f5b920]/40 text-gray-300 hover:text-[#f5b920] transition-all disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap cursor-pointer flex-shrink-0"
          >
            <ArrowDownUp className="h-3.5 w-3.5 flex-shrink-0" />
            <span>Сортировка</span>
          </button>

          <button
            type="button"
            onClick={resetCombat}
            disabled={combatants.length === 0}
            title="Очистить очередь боя и сбросить раунды"
            className="flex items-center justify-center min-w-[32px] w-8 h-8 rounded-full bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] hover:border-red-500 hover:bg-red-950/40 text-gray-400 hover:text-red-300 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0 cursor-pointer"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Нижний ярус (Ряд 2): Ход (Пробел), Пред., Undo, Redo, + Игрок, Отряд, Орда, Журнал, Отдых 1ч, Отдых 8ч */}
      <div className="flex items-center gap-1.5 flex-wrap relative z-10">
        {/* Основная кнопка переключения хода (Primary с золотым свечением) */}
        <button
          type="button"
          onClick={nextTurn}
          disabled={combatants.length === 0}
          title="Следующий ход (Горячая клавиша: Пробел)"
          className="flex items-center gap-1.5 min-h-[32px] px-3.5 py-1 text-xs font-black rounded-full bg-[#f5b920] hover:bg-[#fac742] active:bg-[#e0a312] text-[#0c0d12] shadow-[0_0_16px_rgba(245,185,32,0.35)] hover:shadow-[0_0_22px_rgba(245,185,32,0.5)] disabled:opacity-40 disabled:cursor-not-allowed transition-all whitespace-nowrap cursor-pointer flex-shrink-0"
        >
          <span>Ход</span>
          <kbd className="text-[10px] px-1 py-0.2 rounded-full bg-black/30 font-mono text-black font-extrabold leading-none border border-black/20">
            Пробел
          </kbd>
          <ChevronRight className="h-3.5 w-3.5 flex-shrink-0" />
        </button>

        {/* Предыдущий ход */}
        <button
          type="button"
          onClick={prevTurn}
          disabled={combatants.length === 0}
          title="Предыдущий ход в очереди"
          className="flex items-center gap-1 min-h-[32px] px-2.5 py-1 text-xs font-semibold rounded-full bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] hover:bg-[rgba(255,255,255,0.08)] text-gray-300 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all whitespace-nowrap cursor-pointer flex-shrink-0"
        >
          <ChevronLeft className="h-3.5 w-3.5 flex-shrink-0" />
          <span>Пред.</span>
        </button>

        {/* Undo последнего действия (Ctrl+Z) */}
        {undoStack.length > 0 && (
          <button
            type="button"
            onClick={undoLastAction}
            title="Отменить последнее действие (Ctrl+Z)"
            className="flex items-center justify-center min-w-[32px] w-8 h-8 rounded-full bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] hover:border-[#f5b920]/60 text-gray-400 hover:text-[#f5b920] transition-all flex-shrink-0 cursor-pointer"
          >
            <Undo2 className="h-3.5 w-3.5" />
          </button>
        )}

        {/* Redo отмененного действия (Ctrl+Y) */}
        {redoStack.length > 0 && (
          <button
            type="button"
            onClick={redoLastAction}
            title="Повторить отменённое действие (Ctrl+Y)"
            className="flex items-center justify-center min-w-[32px] w-8 h-8 rounded-full bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] hover:border-[#f5b920]/60 text-gray-400 hover:text-[#f5b920] transition-all flex-shrink-0 cursor-pointer"
          >
            <Redo2 className="h-3.5 w-3.5" />
          </button>
        )}

        {/* Добавить персонажа игрока */}
        {onAddPlayer && (
          <button
            type="button"
            onClick={onAddPlayer}
            title="Добавить нового персонажа игрока в бой"
            className="flex items-center gap-1 min-h-[32px] px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-950/50 border border-emerald-600/60 text-emerald-300 hover:bg-emerald-900/60 hover:text-emerald-100 transition-all whitespace-nowrap cursor-pointer flex-shrink-0"
          >
            <UserPlus className="h-3.5 w-3.5 flex-shrink-0" />
            <span>+ Игрок</span>
          </button>
        )}

        {/* Высадить отряд */}
        <button
          type="button"
          onClick={() => usePartyStore.getState().deployPartyToCombat(true)}
          title="Высадить всех персонажей постоянного отряда в бой"
          className="flex items-center gap-1 min-h-[32px] px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-900/40 border border-emerald-500/50 text-emerald-200 hover:bg-emerald-800/60 hover:text-white transition-all whitespace-nowrap cursor-pointer flex-shrink-0"
        >
          <Users className="h-3.5 w-3.5 text-emerald-400 flex-shrink-0" />
          <span>Отряд</span>
        </button>

        {/* Движок орд и толп */}
        <button
          type="button"
          onClick={() => setMobModalOpen(true)}
          title="Движок орд и толп: расчёт атак толпы по правилам DMG (Chapter 8)"
          className="flex items-center gap-1.5 min-h-[32px] px-3 py-1 text-xs font-semibold rounded-full bg-purple-950/40 border border-purple-500/50 text-purple-200 hover:bg-purple-900/60 hover:border-purple-400 hover:text-white transition-all whitespace-nowrap cursor-pointer flex-shrink-0"
        >
          <Swords className="h-3.5 w-3.5 text-purple-400 flex-shrink-0" />
          <span>Орда</span>
        </button>

        {/* Журнал событий боя */}
        <button
          type="button"
          onClick={() => setCombatLogOpen(true)}
          title="Журнал событий боя: хронология, урон, криты, спасы и экспорт в .txt"
          className="flex items-center gap-1.5 min-h-[32px] px-3 py-1 text-xs font-semibold rounded-full bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.1)] hover:border-[#f5b920]/60 text-gray-300 hover:text-[#f5b920] transition-all whitespace-nowrap cursor-pointer flex-shrink-0"
        >
          <ScrollText className="h-3.5 w-3.5 text-[#f5b920] flex-shrink-0" />
          <span>Журнал</span>
          {combatLog.length > 0 && (
            <span className="font-mono text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-[#f5b920]/20 text-[#fce79f] border border-[#f5b920]/40 leading-none">
              {combatLog.length}
            </span>
          )}
        </button>

        {/* Короткий отдых (1 час) */}
        <button
          type="button"
          onClick={() => usePartyStore.getState().openShortRestModal()}
          title="Короткий отдых (1ч): бросить кости хитов, восстановить ячейки колдуна и способности"
          className="flex items-center gap-1.5 min-h-[32px] px-3 py-1 text-xs font-semibold rounded-full bg-amber-950/50 border border-amber-600/70 text-amber-300 hover:bg-amber-900/70 hover:border-amber-400 hover:shadow-[0_0_12px_rgba(245,158,11,0.25)] transition-all whitespace-nowrap cursor-pointer flex-shrink-0"
        >
          <Flame className="h-3.5 w-3.5 text-amber-400 flex-shrink-0" />
          <span>Отдых 1ч</span>
        </button>

        {/* Долгий отдых (8 часов) */}
        <button
          type="button"
          onClick={() => usePartyStore.getState().longRest()}
          title="Долгий отдых (8ч): 100% здоровье, ячейки заклинаний, сброс истощения"
          className="flex items-center gap-1.5 min-h-[32px] px-3 py-1 text-xs font-semibold rounded-full bg-blue-950/50 border border-blue-600/70 text-blue-300 hover:bg-blue-900/70 hover:border-blue-400 hover:shadow-[0_0_12px_rgba(59,130,246,0.25)] transition-all whitespace-nowrap cursor-pointer flex-shrink-0"
        >
          <Moon className="h-3.5 w-3.5 text-blue-400 flex-shrink-0" />
          <span>Отдых 8ч</span>
        </button>
      </div>
    </header>
  );
}

