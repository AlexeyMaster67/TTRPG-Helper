import React, { useState } from 'react';
import {
  Sparkles,
  Swords,
  X,
  UserPlus,
} from 'lucide-react';
import { useCombatStore } from '../../store/combatStore';
import { CombatantCard } from './CombatantCard';
import { CombatHeader } from './CombatHeader';
import { cleanRussianText } from '../../utils/textUtils';
import { CombatQuickInputHud } from '../combat/CombatQuickInputHud';

export function CombatRoster() {
  const {
    combatants,
    currentTurnIndex,
    inspectedCombatantId,
    setInspectedCombatantId,
    nextTurn,
    populateDefaultEncounter,
    addCombatant,
  } = useCombatStore();

  const [showAddPlayerModal, setShowAddPlayerModal] = useState(false);
  const [playerName, setPlayerName] = useState('');
  const [playerHp, setPlayerHp] = useState('30');
  const [playerAc, setPlayerAc] = useState('15');
  const [playerInit, setPlayerInit] = useState('15');

  const handleCreatePlayer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!playerName.trim()) return;

    const hpNum = parseInt(playerHp, 10) || 20;
    const acNum = parseInt(playerAc, 10) || 10;
    const initNum = parseInt(playerInit, 10) || 10;

    addCombatant({
      name: playerName.trim(),
      nameRu: playerName.trim(),
      isPlayer: true,
      hp: hpNum,
      maxHp: hpNum,
      ac: acNum,
      initiative: initNum,
      initBonus: 2,
      speed: '30 фт.',
      color: '#10B981',
    });

    setPlayerName('');
    setShowAddPlayerModal(false);
  };

  return (
    <div className="h-full flex flex-col select-none overflow-hidden min-w-0">
      {/* Верхняя строка с раундом, бойцами, опытом и кнопками */}
      <CombatHeader onAddPlayer={() => setShowAddPlayerModal(true)} />

      {/* Уведомление об активном ходе игрока за столом */}
      {(() => {
        const activeCombatant = combatants[currentTurnIndex];
        if (!activeCombatant?.isPlayer) return null;

        return (
          <div className="bg-emerald-950/60 border-b border-emerald-600/50 px-3 sm:px-4 py-2 flex items-center justify-between gap-2 sm:gap-3 text-xs select-none backdrop-blur-md">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <span className="relative flex h-2.5 w-2.5 flex-shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500 shadow-[0_0_8px_#10b981]" />
              </span>
              <div className="truncate min-w-0 flex items-center gap-1">
                <span className="text-gray-300 whitespace-nowrap flex-shrink-0">Ходит игрок: </span>
                <strong className="text-emerald-300 font-bold truncate inline-block max-w-[140px] sm:max-w-[200px] md:max-w-[280px]">
                  {cleanRussianText(activeCombatant.nameRu || activeCombatant.name)}
                </strong>
                <span className="text-xs text-gray-400 hidden lg:inline whitespace-nowrap flex-shrink-0">
                  (броски за столом)
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={() => setInspectedCombatantId(activeCombatant.id)}
                className="min-h-[32px] px-3 py-1 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all whitespace-nowrap cursor-pointer"
                title="Внести результат действия игрока"
              >
                <span>✍️ Внести результат</span>
              </button>
              <button
                onClick={nextTurn}
                className="min-h-[32px] px-3.5 py-1 rounded-full bg-[#f5b920] hover:bg-[#fac742] active:bg-[#e0a312] text-[#0c0d12] font-black text-xs flex items-center gap-1.5 shadow-[0_0_14px_rgba(245,185,32,0.3)] transition-all whitespace-nowrap cursor-pointer"
                title="Передать ход дальше (Пробел)"
              >
                <span>След. ход ⏭️</span>
              </button>
            </div>
          </div>
        );
      })()}

      {/* Список карточек очереди боя с воздушными отступами */}
      <div className="flex-1 overflow-y-auto scroll-smooth p-3 space-y-2.5">
        {combatants.length === 0 ? (
          /* Пустое состояние очереди */
          <div className="h-full flex flex-col items-center justify-center text-center p-8 border border-dashed border-[rgba(255,255,255,0.1)] rounded-glass-xl bg-[rgba(18,22,30,0.4)] backdrop-blur-sm">
            <Swords className="h-12 w-12 text-[#f5b920]/60 mb-3 animate-pulse" />
            <h3 className="text-base font-bold text-white mb-1">Очередь боя пуста</h3>
            <p className="text-xs text-gray-400 max-w-sm mb-5 leading-relaxed">
              Добавьте существ из левой колонки Бестиария с автоматическим броском инициативы или начните тренировочный бой.
            </p>
            <button
              onClick={populateDefaultEncounter}
              className="min-h-[36px] flex items-center gap-2 px-5 py-2 rounded-full bg-[#f5b920] hover:bg-[#fac742] active:bg-[#e0a312] text-[#0c0d12] font-extrabold text-xs shadow-[0_0_18px_rgba(245,185,32,0.35)] transition-all cursor-pointer"
            >
              <Sparkles className="h-4 w-4" />
              <span>Загрузить тренировочный бой (Вампир, Стражники, Игрок)</span>
            </button>
          </div>
        ) : (
          /* Список бойцов с аккуратным зазором между карточками */
          <div className="flex flex-col gap-2.5">
            {combatants.map((combatant, idx) => (
              <CombatantCard
                key={combatant.id}
                combatant={combatant}
                isActiveTurn={idx === currentTurnIndex}
                isInspected={combatant.id === inspectedCombatantId}
              />
            ))}
          </div>
        )}
      </div>

      {/* Индикатор быстрого ввода с цифрового блока (Numpad HUD) */}
      <CombatQuickInputHud />

      {/* Модальное окно: Быстрое добавление игрока */}
      {showAddPlayerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md max-h-[90vh] overflow-y-auto bg-[rgba(24,30,42,0.95)] backdrop-blur-xl border border-[#f5b920]/50 rounded-glass-xl shadow-2xl p-5 flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-[rgba(255,255,255,0.08)] pb-3">
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm min-w-0">
                <UserPlus className="h-4 w-4 flex-shrink-0" />
                <span className="truncate">Добавить персонажа игрока</span>
              </div>
              <button
                onClick={() => setShowAddPlayerModal(false)}
                className="text-gray-400 hover:text-white p-1 rounded-full hover:bg-white/10 flex-shrink-0 transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreatePlayer} className="flex flex-col gap-3.5 text-xs">
              <div>
                <label className="block text-gray-300 font-medium mb-1.5 leading-tight">Имя персонажа</label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  placeholder="Например: Дриззт, Торин..."
                  className="w-full min-h-[34px] px-3 bg-[rgba(20,25,35,0.7)] border border-[rgba(255,255,255,0.08)] focus:border-[#f5b920]/70 rounded-glass text-gray-100 focus:outline-none focus:ring-1 focus:ring-[#f5b920]/40 transition-all"
                />
              </div>

              <div className="grid grid-cols-3 gap-2 sm:gap-3">
                <div>
                  <label className="block text-gray-300 font-medium mb-1.5 leading-tight truncate" title="Максимальные очки здоровья">Макс. ОЗ</label>
                  <input
                    type="number"
                    value={playerHp}
                    onChange={(e) => setPlayerHp(e.target.value)}
                    className="w-full min-h-[34px] px-2 bg-[rgba(20,25,35,0.7)] border border-[rgba(255,255,255,0.08)] focus:border-[#f5b920]/70 rounded-glass text-gray-100 font-mono text-center"
                  />
                </div>
                <div>
                  <label className="block text-gray-300 font-medium mb-1.5 leading-tight truncate" title="Класс доспеха">КД</label>
                  <input
                    type="number"
                    value={playerAc}
                    onChange={(e) => setPlayerAc(e.target.value)}
                    className="w-full min-h-[34px] px-2 bg-[rgba(20,25,35,0.7)] border border-[rgba(255,255,255,0.08)] focus:border-[#f5b920]/70 rounded-glass text-gray-100 font-mono text-center"
                  />
                </div>
                <div>
                  <label className="block text-gray-300 font-medium mb-1.5 leading-tight truncate" title="Инициатива">Инициатива</label>
                  <input
                    type="number"
                    value={playerInit}
                    onChange={(e) => setPlayerInit(e.target.value)}
                    className="w-full min-h-[34px] px-2 bg-[rgba(20,25,35,0.7)] border border-[rgba(255,255,255,0.08)] focus:border-[#f5b920]/70 rounded-glass text-gray-100 font-mono text-center"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[rgba(255,255,255,0.08)]">
                <button
                  type="button"
                  onClick={() => setShowAddPlayerModal(false)}
                  className="min-h-[32px] px-3.5 py-1 rounded-full bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] text-gray-300 hover:text-white whitespace-nowrap transition-colors cursor-pointer"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="min-h-[32px] px-4 py-1 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-sm whitespace-nowrap transition-colors cursor-pointer"
                >
                  Добавить в бой
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
