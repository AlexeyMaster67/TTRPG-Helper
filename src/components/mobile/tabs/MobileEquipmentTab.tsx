import { useState } from 'react';
import {
  Coins,
  Backpack,
  Plus,
  Minus,
  Trash2,
  Sparkles,
  X,
} from 'lucide-react';
import { PartyMember, EquipmentItem, AttunementSlot } from '../../../types/party';
import { usePartyStore } from '../../../store/partyStore';
import { audioService } from '../../../services/audioService';

interface MobileEquipmentTabProps {
  member: PartyMember;
}

export function MobileEquipmentTab({ member }: MobileEquipmentTabProps) {
  const { treasury, setTreasury, updateMember, showToast } = usePartyStore();

  const [isAddItemOpen, setIsAddItemOpen] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [newItemQty, setNewItemQty] = useState(1);
  const [newItemNotes, setNewItemNotes] = useState('');

  const [isAttuneModalOpen, setIsAttuneModalOpen] = useState(false);
  const [editingAttuneSlotIndex, setEditingAttuneSlotIndex] = useState<number | null>(null);
  const [attuneItemName, setAttuneItemName] = useState('');

  const equipment = member.equipment || [];
  const attunementSlots: AttunementSlot[] = member.attunementSlots || [
    { id: 'attune-1', name: '', attuned: false },
    { id: 'attune-2', name: '', attuned: false },
    { id: 'attune-3', name: '', attuned: false },
  ];

  // Adjust coins in treasury
  const handleAdjustCoins = (type: 'gp' | 'sp' | 'cp', delta: number) => {
    audioService.playCoins();
    const current = treasury[type] || 0;
    const nextVal = Math.max(0, current + delta);
    setTreasury(
      type === 'gp' ? nextVal : treasury.gp,
      type === 'sp' ? nextVal : treasury.sp,
      type === 'cp' ? nextVal : treasury.cp
    );
  };

  // Attunement slot management
  const handleOpenAttuneSlot = (index: number) => {
    setEditingAttuneSlotIndex(index);
    setAttuneItemName(attunementSlots[index]?.name || '');
    setIsAttuneModalOpen(true);
  };

  const handleSaveAttunement = () => {
    if (editingAttuneSlotIndex === null) return;

    const updated = [...attunementSlots];
    const name = attuneItemName.trim();
    updated[editingAttuneSlotIndex] = {
      id: updated[editingAttuneSlotIndex]?.id || `attune-${editingAttuneSlotIndex + 1}`,
      name,
      attuned: !!name,
    };

    updateMember(member.id, { attunementSlots: updated });
    setIsAttuneModalOpen(false);
    setEditingAttuneSlotIndex(null);
    setAttuneItemName('');
    showToast(name ? `Предмет "${name}" настроен.` : 'Слот настройки очищен.');
  };

  const handleClearAttunement = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = [...attunementSlots];
    updated[index] = {
      id: updated[index]?.id || `attune-${index + 1}`,
      name: '',
      attuned: false,
    };
    updateMember(member.id, { attunementSlots: updated });
    showToast('Слот настройки освобожден.');
  };

  // Equipment Item management
  const handleAdjustQuantity = (id: string, delta: number) => {
    const updated = equipment.map((item) => {
      if (item.id !== id) return item;
      return { ...item, quantity: Math.max(1, item.quantity + delta) };
    });
    updateMember(member.id, { equipment: updated });
  };

  const handleDeleteItem = (id: string) => {
    const updated = equipment.filter((item) => item.id !== id);
    updateMember(member.id, { equipment: updated });
  };

  const handleAddItem = () => {
    if (!newItemName.trim()) return;

    const newItem: EquipmentItem = {
      id: `eq-${Date.now()}`,
      name: newItemName.trim(),
      quantity: Math.max(1, newItemQty),
      notes: newItemNotes.trim() || undefined,
    };

    updateMember(member.id, {
      equipment: [...equipment, newItem],
    });

    setNewItemName('');
    setNewItemQty(1);
    setNewItemNotes('');
    setIsAddItemOpen(false);
    showToast(`Предмет "${newItem.name}" добавлен в инвентарь.`);
  };

  const attunedCount = attunementSlots.filter((s) => s.attuned && s.name).length;

  return (
    <div className="space-y-4 pb-24">
      {/* Treasury Card */}
      <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4 shadow-lg space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Coins className="w-5 h-5 text-amber-400" />
            <h3 className="text-sm font-bold text-stone-200 uppercase tracking-wider">
              Казна отряда
            </h3>
          </div>
          <span className="text-xs text-stone-400 font-mono">
            Общая казна
          </span>
        </div>

        {/* Coins Grid */}
        <div className="grid grid-cols-3 gap-2">
          {/* Gold */}
          <div className="bg-stone-850 border border-amber-500/30 rounded-xl p-2.5 flex flex-col items-center">
            <div className="text-[11px] font-bold text-amber-400 mb-0.5 text-center truncate w-full">
              Золото (зм)
            </div>
            <div className="text-xl sm:text-2xl font-black font-mono text-amber-300 my-0.5">
              {treasury.gp}
            </div>
            <div className="w-full flex flex-col gap-1 mt-1">
              <div className="flex items-center gap-1 w-full">
                <button
                  onClick={() => handleAdjustCoins('gp', -1)}
                  className="flex-1 h-7 rounded bg-stone-800 hover:bg-stone-750 text-stone-300 font-bold text-xs active:scale-95 transition-all flex items-center justify-center"
                  aria-label="Минус 1 зм"
                >
                  -1
                </button>
                <button
                  onClick={() => handleAdjustCoins('gp', 1)}
                  className="flex-1 h-7 rounded bg-stone-800 hover:bg-stone-750 text-amber-400 font-bold text-xs active:scale-95 transition-all flex items-center justify-center"
                  aria-label="Плюс 1 зм"
                >
                  +1
                </button>
              </div>
              <button
                onClick={() => handleAdjustCoins('gp', 10)}
                className="w-full h-6 rounded bg-amber-950/60 hover:bg-amber-900/60 text-amber-300 font-bold text-[10px] active:scale-95 border border-amber-800/40 transition-all flex items-center justify-center"
                aria-label="Плюс 10 зм"
              >
                +10
              </button>
            </div>
          </div>

          {/* Silver */}
          <div className="bg-stone-850 border border-slate-500/30 rounded-xl p-2.5 flex flex-col items-center">
            <div className="text-[11px] font-bold text-slate-300 mb-0.5 text-center truncate w-full">
              Серебро (см)
            </div>
            <div className="text-xl sm:text-2xl font-black font-mono text-slate-200 my-0.5">
              {treasury.sp}
            </div>
            <div className="w-full flex flex-col gap-1 mt-1">
              <div className="flex items-center gap-1 w-full">
                <button
                  onClick={() => handleAdjustCoins('sp', -1)}
                  className="flex-1 h-7 rounded bg-stone-800 hover:bg-stone-750 text-stone-300 font-bold text-xs active:scale-95 transition-all flex items-center justify-center"
                  aria-label="Минус 1 см"
                >
                  -1
                </button>
                <button
                  onClick={() => handleAdjustCoins('sp', 1)}
                  className="flex-1 h-7 rounded bg-stone-800 hover:bg-stone-750 text-slate-200 font-bold text-xs active:scale-95 transition-all flex items-center justify-center"
                  aria-label="Плюс 1 см"
                >
                  +1
                </button>
              </div>
              <button
                onClick={() => handleAdjustCoins('sp', 10)}
                className="w-full h-6 rounded bg-slate-800 hover:bg-slate-750 text-slate-200 font-bold text-[10px] active:scale-95 border border-slate-700 transition-all flex items-center justify-center"
                aria-label="Плюс 10 см"
              >
                +10
              </button>
            </div>
          </div>

          {/* Copper */}
          <div className="bg-stone-850 border border-orange-600/30 rounded-xl p-2.5 flex flex-col items-center">
            <div className="text-[11px] font-bold text-orange-400 mb-0.5 text-center truncate w-full">
              Медь (мм)
            </div>
            <div className="text-xl sm:text-2xl font-black font-mono text-orange-300 my-0.5">
              {treasury.cp}
            </div>
            <div className="w-full flex flex-col gap-1 mt-1">
              <div className="flex items-center gap-1 w-full">
                <button
                  onClick={() => handleAdjustCoins('cp', -1)}
                  className="flex-1 h-7 rounded bg-stone-800 hover:bg-stone-750 text-stone-300 font-bold text-xs active:scale-95 transition-all flex items-center justify-center"
                  aria-label="Минус 1 мм"
                >
                  -1
                </button>
                <button
                  onClick={() => handleAdjustCoins('cp', 1)}
                  className="flex-1 h-7 rounded bg-stone-800 hover:bg-stone-750 text-orange-400 font-bold text-xs active:scale-95 transition-all flex items-center justify-center"
                  aria-label="Плюс 1 мм"
                >
                  +1
                </button>
              </div>
              <button
                onClick={() => handleAdjustCoins('cp', 10)}
                className="w-full h-6 rounded bg-orange-950/60 hover:bg-orange-900/60 text-orange-300 font-bold text-[10px] active:scale-95 border border-orange-800/40 transition-all flex items-center justify-center"
                aria-label="Плюс 10 мм"
              >
                +10
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Attunement Slots (3 dedicated slots) */}
      <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4 shadow-lg space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-400" />
            <h3 className="text-sm font-bold text-stone-200 uppercase tracking-wider">
              Магическая настройка ({attunedCount}/3)
            </h3>
          </div>

          <span className="text-[11px] font-mono text-purple-400">
            Макс. 3 предмета
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {[0, 1, 2].map((slotIndex) => {
            const slot = attunementSlots[slotIndex];
            const isAttuned = slot && slot.attuned && slot.name.trim().length > 0;

            return (
              <div
                key={slotIndex}
                onClick={() => handleOpenAttuneSlot(slotIndex)}
                className={`min-h-[56px] p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all touch-manipulation active:scale-[0.98] ${
                  isAttuned
                    ? 'bg-purple-950/30 border-purple-500/50 text-purple-200'
                    : 'bg-stone-850 border-stone-800 text-stone-500 hover:border-stone-700'
                }`}
              >
                <div className="overflow-hidden">
                  <div className="text-[10px] uppercase font-bold text-stone-400">
                    Слот {slotIndex + 1}
                  </div>
                  <div className="text-sm font-semibold truncate">
                    {isAttuned ? slot.name : 'Пустой слот настройки'}
                  </div>
                </div>

                {isAttuned && (
                  <button
                    onClick={(e) => handleClearAttunement(slotIndex, e)}
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-stone-400 hover:text-red-400 hover:bg-stone-800 transition-colors"
                    aria-label="Снять настройку"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Equipment Inventory List */}
      <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4 shadow-lg space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Backpack className="w-5 h-5 text-amber-400 shrink-0" />
            <h3 className="text-xs sm:text-sm font-bold text-stone-200 uppercase tracking-wider truncate">
              Снаряжение и предметы ({equipment.length})
            </h3>
          </div>

          <button
            onClick={() => setIsAddItemOpen(true)}
            className="h-8 px-2.5 rounded-xl bg-amber-600/20 hover:bg-amber-600/30 border border-amber-500/40 text-amber-300 text-xs font-semibold flex items-center gap-1 active:scale-95 transition-all touch-manipulation shrink-0 whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Добавить</span>
          </button>
        </div>

        {/* Items List */}
        <div className="space-y-2">
          {equipment.length === 0 ? (
            <div className="p-6 text-center text-stone-400 text-xs bg-stone-850 rounded-xl border border-stone-800">
              Рюкзак пуст. Нажмите «Добавить», чтобы занести походное снаряжение, зелья или реликвии.
            </div>
          ) : (
            equipment.map((item) => (
              <div
                key={item.id}
                className="bg-stone-850 border border-stone-800 rounded-xl p-3 flex items-center justify-between gap-2"
              >
                <div>
                  <div className="font-semibold text-stone-100 text-sm">
                    {item.name}
                  </div>
                  {item.notes && (
                    <div className="text-[11px] text-stone-400 mt-0.5">
                      {item.notes}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 bg-stone-800 border border-stone-700 rounded-lg p-0.5">
                    <button
                      onClick={() => handleAdjustQuantity(item.id, -1)}
                      className="w-8 h-8 rounded flex items-center justify-center text-stone-300 hover:text-white active:scale-95 text-xs font-bold"
                      aria-label="Уменьшить количество"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>

                    <span className="font-mono font-bold text-xs text-stone-200 min-w-[24px] text-center">
                      x{item.quantity}
                    </span>

                    <button
                      onClick={() => handleAdjustQuantity(item.id, 1)}
                      className="w-8 h-8 rounded flex items-center justify-center text-stone-300 hover:text-white active:scale-95 text-xs font-bold"
                      aria-label="Увеличить количество"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <button
                    onClick={() => handleDeleteItem(item.id)}
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-stone-500 hover:text-red-400 hover:bg-stone-800 active:scale-95 transition-colors"
                    aria-label="Удалить предмет"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Attunement Modal */}
      {isAttuneModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4">
          <div className="w-full max-w-md bg-stone-900 border-t sm:border border-stone-700 sm:rounded-2xl rounded-t-2xl shadow-2xl p-4 space-y-4">
            <div className="flex items-center justify-between border-b border-stone-800 pb-2">
              <h3 className="font-bold text-stone-100 text-base">
                Настройка магического предмета
              </h3>
              <button
                onClick={() => setIsAttuneModalOpen(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-stone-400 hover:text-stone-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs text-stone-400 mb-1">
                  Название магического предмета
                </label>
                <input
                  type="text"
                  value={attuneItemName}
                  onChange={(e) => setAttuneItemName(e.target.value)}
                  placeholder="Например: Плащ защиты, Кольцо тепла"
                  className="w-full min-h-[44px] px-3 rounded-lg bg-stone-800 border border-stone-700 text-stone-100 text-sm focus:border-purple-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  onClick={handleSaveAttunement}
                  className="flex-1 min-h-[48px] rounded-xl bg-purple-600 hover:bg-purple-500 active:scale-95 text-white font-bold text-sm shadow-md transition-all touch-manipulation"
                >
                  Сохранить настройку
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Item Modal */}
      {isAddItemOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4">
          <div className="w-full max-w-md bg-stone-900 border-t sm:border border-stone-700 sm:rounded-2xl rounded-t-2xl shadow-2xl p-4 space-y-4">
            <div className="flex items-center justify-between border-b border-stone-800 pb-2">
              <h3 className="font-bold text-stone-100 text-base">
                Добавить предмет в инвентарь
              </h3>
              <button
                onClick={() => setIsAddItemOpen(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-stone-400 hover:text-stone-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs text-stone-400 mb-1">
                  Название предмета
                </label>
                <input
                  type="text"
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  placeholder="Например: Зелье лечения, Веревка 50 фт."
                  className="w-full min-h-[44px] px-3 rounded-lg bg-stone-800 border border-stone-700 text-stone-100 text-sm focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs text-stone-400 mb-1">
                  Количество
                </label>
                <input
                  type="number"
                  min={1}
                  value={newItemQty}
                  onChange={(e) => setNewItemQty(Math.max(1, parseInt(e.target.value, 10) || 1))}
                  className="w-full min-h-[44px] px-3 rounded-lg bg-stone-800 border border-stone-700 text-stone-100 text-sm focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs text-stone-400 mb-1">
                  Заметки / Свойства (необязательно)
                </label>
                <input
                  type="text"
                  value={newItemNotes}
                  onChange={(e) => setNewItemNotes(e.target.value)}
                  placeholder="Восстанавливает 2d4+2 ХП"
                  className="w-full min-h-[44px] px-3 rounded-lg bg-stone-800 border border-stone-700 text-stone-100 text-sm focus:border-amber-500 focus:outline-none"
                />
              </div>

              <button
                onClick={handleAddItem}
                className="w-full min-h-[48px] rounded-xl bg-amber-600 hover:bg-amber-500 active:scale-95 text-white font-bold text-sm shadow-md transition-all touch-manipulation mt-2"
              >
                Сохранить предмет
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
