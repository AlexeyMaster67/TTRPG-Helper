import { useState } from 'react';
import {
  Swords,
  Zap,
  Plus,
  Trash2,
  X,
  Dices,
} from 'lucide-react';
import { PartyMember, CharacterWeapon } from '../../../types/party';
import { usePartyStore } from '../../../store/partyStore';
import { useCombatStore } from '../../../store/combatStore';
import { audioService } from '../../../services/audioService';
import { rollDie, rollDiceFormula } from '../../../engine/rolls';

interface MobileCombatTabProps {
  member: PartyMember;
}

const WEAPON_MASTERY_RU: Record<string, string> = {
  sap: 'Ошеломление (Sap)',
  slow: 'Замедление (Slow)',
  vex: 'Досаждение (Vex)',
  nick: 'Укол (Nick)',
  push: 'Толчок (Push)',
  topple: 'Опрокидывание (Topple)',
  graze: 'Задевание (Graze)',
  cleave: 'Рассечение (Cleave)',
};

export function MobileCombatTab({ member }: MobileCombatTabProps) {
  const { updateMember, showToast } = usePartyStore();
  const addDiceLog = useCombatStore((s) => s.addDiceLog);

  const [isAddWeaponOpen, setIsAddWeaponOpen] = useState(false);
  const [newWeaponName, setNewWeaponName] = useState('');
  const [newWeaponBonus, setNewWeaponBonus] = useState('+5');
  const [newWeaponDamage, setNewWeaponDamage] = useState('1d8+3');
  const [newWeaponType, setNewWeaponType] = useState('Рубящий');
  const [newWeaponMastery, setNewWeaponMastery] = useState('');

  const [recentAttackResult, setRecentAttackResult] = useState<{
    weaponName: string;
    attackTotal: number;
    d20: number;
    bonus: number;
    damageTotal: number;
    damageType: string;
    isNat20: boolean;
    isNat1: boolean;
  } | null>(null);

  const weapons = member.weapons || [];
  const resources = member.resources || [];

  const handleRollAttack = (weapon: CharacterWeapon) => {
    audioService.playDiceRoll();

    const pb = member.proficiencyBonus || 2;
    const strMod = Math.floor(((member.stats?.str ?? 10) - 10) / 2);
    const dexMod = Math.floor(((member.stats?.dex ?? 10) - 10) / 2);

    let bonus = 0;
    if (weapon.attackBonus) {
      bonus = parseInt(weapon.attackBonus.replace('+', '')) || 0;
    } else {
      bonus = Math.max(strMod, dexMod) + pb;
    }

    const d20 = rollDie(20);
    const attackTotal = d20 + bonus;
    const isNat20 = d20 === 20;
    const isNat1 = d20 === 1;

    if (isNat20) {
      audioService.playCriticalHit();
    } else if (isNat1) {
      audioService.playSadHorn();
    } else {
      audioService.playSwordStrike();
    }

    let damageResult: { formula: string; rolls: any[]; modifier: number; total: number } = {
      formula: weapon.damage || '1d8',
      rolls: [],
      modifier: 0,
      total: 0,
    };
    if (weapon.damage) {
      try {
        damageResult = rollDiceFormula(weapon.damage);
      } catch {
        damageResult = { formula: weapon.damage, rolls: [], modifier: 0, total: 5 };
      }
    }

    const timeStr = new Date().toTimeString().split(' ')[0];

    addDiceLog({
      id: `dice-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: timeStr,
      combatantName: member.name,
      actionName: `Атака: ${weapon.name}`,
      attackRoll: {
        d20,
        modifier: bonus,
        total: attackTotal,
        isNat20,
        isNat1,
      },
      damageRoll: {
        formula: weapon.damage || '1d8',
        total: damageResult.total,
        damageType: weapon.damageType || 'Оружие',
        details: `${damageResult.total}`,
      },
      weaponMastery: weapon.mastery,
      note: isNat20 ? 'КРИТИЧЕСКИЙ УДАР!' : isNat1 ? 'КРИТИЧЕСКИЙ ПРОМАХ!' : undefined,
    });

    setRecentAttackResult({
      weaponName: weapon.name,
      attackTotal,
      d20,
      bonus,
      damageTotal: damageResult.total,
      damageType: weapon.damageType || 'Оружие',
      isNat20,
      isNat1,
    });

    showToast(
      `${weapon.name}: Атака ${attackTotal} (d20: ${d20}), Урон ${damageResult.total} (${weapon.damageType || 'урон'})`
    );
  };

  const handleAddWeapon = () => {
    if (!newWeaponName.trim()) return;

    const newW: CharacterWeapon = {
      id: `w-${Date.now()}`,
      name: newWeaponName.trim(),
      attackBonus: newWeaponBonus.trim(),
      damage: newWeaponDamage.trim(),
      damageType: newWeaponType.trim(),
      mastery: newWeaponMastery.trim() || undefined,
    };

    updateMember(member.id, {
      weapons: [...weapons, newW],
    });

    setNewWeaponName('');
    setIsAddWeaponOpen(false);
    showToast(`Оружие "${newW.name}" добавлено.`);
  };

  const handleDeleteWeapon = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    updateMember(member.id, {
      weapons: weapons.filter((w) => w.id !== id),
    });
  };

  const handleAdjustResource = (id: string, delta: number) => {
    const updated = resources.map((r) => {
      if (r.id !== id) return r;
      const nextVal = Math.max(0, Math.min(r.max, r.current + delta));
      return { ...r, current: nextVal };
    });
    updateMember(member.id, { resources: updated });
  };

  return (
    <div className="space-y-4 pb-24">
      {/* Recent Attack Result Banner */}
      {recentAttackResult && (
        <div
          className={`p-3.5 rounded-2xl border text-center transition-all ${
            recentAttackResult.isNat20
              ? 'bg-amber-950/40 border-amber-500/80 text-amber-200'
              : recentAttackResult.isNat1
              ? 'bg-red-950/40 border-red-500/80 text-red-200'
              : 'bg-stone-900 border-stone-700 text-stone-100'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-stone-400 mb-1">
            <span className="font-semibold">{recentAttackResult.weaponName}</span>
            <button
              onClick={() => setRecentAttackResult(null)}
              className="text-stone-500 hover:text-stone-300"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex items-center justify-center gap-6 my-1">
            <div>
              <div className="text-[11px] uppercase tracking-wider text-stone-400">
                Бросок атаки
              </div>
              <div className="text-3xl font-black font-mono">
                {recentAttackResult.attackTotal}
              </div>
              <div className="text-[10px] text-stone-400">
                (d20: {recentAttackResult.d20} + {recentAttackResult.bonus})
              </div>
            </div>

            <div className="w-px h-10 bg-stone-700" />

            <div>
              <div className="text-[11px] uppercase tracking-wider text-stone-400">
                Урон ({recentAttackResult.damageType})
              </div>
              <div className="text-3xl font-black font-mono text-red-400">
                {recentAttackResult.damageTotal}
              </div>
            </div>
          </div>

          {recentAttackResult.isNat20 && (
            <div className="mt-2 text-xs font-bold text-amber-400">
              КРИТИЧЕСКИЙ УСПЕХ (НАТ 20)
            </div>
          )}
          {recentAttackResult.isNat1 && (
            <div className="mt-2 text-xs font-bold text-red-400">
              КРИТИЧЕСКИЙ ПРОМАХ (НАТ 1)
            </div>
          )}
        </div>
      )}

      {/* Weapons Section Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Swords className="w-5 h-5 text-amber-400 shrink-0" />
          <h3 className="text-sm font-bold text-stone-200 uppercase tracking-wider truncate">
            Оружие и атаки
          </h3>
        </div>

        <button
          onClick={() => setIsAddWeaponOpen(true)}
          className="h-8 px-2.5 rounded-xl bg-amber-600/20 hover:bg-amber-600/30 border border-amber-500/40 text-amber-300 text-xs font-semibold flex items-center gap-1 active:scale-95 transition-all touch-manipulation shrink-0 whitespace-nowrap"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Добавить</span>
        </button>
      </div>

      {/* Weapons List */}
      <div className="space-y-2.5">
        {weapons.length === 0 ? (
          <div className="bg-stone-900 border border-stone-800 rounded-xl p-6 text-center text-stone-400 text-sm">
            Нет экипированного оружия. Нажмите «Добавить», чтобы создать оружие или атаку.
          </div>
        ) : (
          weapons.map((w) => (
            <div
              key={w.id}
              onClick={() => handleRollAttack(w)}
              className="w-full bg-stone-900 hover:bg-stone-850 active:scale-[0.99] border border-stone-800 hover:border-amber-500/40 rounded-2xl p-4 transition-all text-left cursor-pointer shadow-md touch-manipulation group"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-bold text-stone-100 text-base group-hover:text-amber-300 transition-colors">
                    {w.name}
                  </h4>
                  {w.mastery && (
                    <span className="inline-block mt-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-950/60 text-amber-300 border border-amber-700/50">
                      Свойство мастерства: {WEAPON_MASTERY_RU[w.mastery.toLowerCase()] || w.mastery}
                    </span>
                  )}
                </div>

                <button
                  onClick={(e) => handleDeleteWeapon(w.id, e)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-stone-500 hover:text-red-400 hover:bg-stone-800 active:scale-95 transition-colors"
                  aria-label="Удалить оружие"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {/* Weapon Stats Pill & Roll Button Prompt */}
              <div className="mt-3 flex items-center justify-between gap-2 pt-2 border-t border-stone-800/80">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1 text-xs text-stone-300">
                    <span className="text-stone-500">Атака:</span>
                    <span className="font-mono font-bold text-amber-400">
                      {w.attackBonus || '+5'}
                    </span>
                  </div>

                  <div className="flex items-center gap-1 text-xs text-stone-300">
                    <span className="text-stone-500">Урон:</span>
                    <span className="font-mono font-bold text-stone-200">
                      {w.damage || '1d8'}
                    </span>
                    <span className="text-stone-400 text-[11px]">
                      {w.damageType || ''}
                    </span>
                  </div>
                </div>

                <div className="min-h-[38px] px-3.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs flex items-center gap-1 shadow-md shadow-amber-950/40">
                  <Dices className="w-4 h-4" />
                  <span>Бросок</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Class Resources (Rage, Action Surge, Second Wind, Ki, etc.) */}
      {resources.length > 0 && (
        <div className="mt-6 pt-4 border-t border-stone-800 space-y-3">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-amber-400" />
            <h3 className="text-sm font-bold text-stone-200 uppercase tracking-wider">
              Классовые ресурсы и действия
            </h3>
          </div>

          <div className="space-y-2">
            {resources.map((res) => (
              <div
                key={res.id}
                className="bg-stone-900 border border-stone-800 rounded-xl p-3 flex items-center justify-between"
              >
                <div>
                  <div className="text-sm font-semibold text-stone-200">{res.name}</div>
                  <div className="text-[11px] text-stone-400">
                    Восстановление: {res.resetOn === 'short' ? 'Короткий отдых' : 'Долгий отдых'}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleAdjustResource(res.id, -1)}
                    disabled={res.current <= 0}
                    className="w-10 h-10 rounded-lg bg-stone-800 hover:bg-stone-750 disabled:opacity-30 text-stone-300 flex items-center justify-center font-bold text-base active:scale-95 transition-all touch-manipulation"
                    aria-label="Потратить заряд ресурса"
                  >
                    -
                  </button>

                  <span className="font-mono font-black text-lg text-amber-400 min-w-[42px] text-center">
                    {res.current} / {res.max}
                  </span>

                  <button
                    onClick={() => handleAdjustResource(res.id, 1)}
                    disabled={res.current >= res.max}
                    className="w-10 h-10 rounded-lg bg-stone-800 hover:bg-stone-750 disabled:opacity-30 text-stone-300 flex items-center justify-center font-bold text-base active:scale-95 transition-all touch-manipulation"
                    aria-label="Восстановить заряд ресурса"
                  >
                    +
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add Weapon Modal / Bottom Sheet */}
      {isAddWeaponOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4">
          <div className="w-full max-w-md bg-stone-900 border-t sm:border border-stone-700 sm:rounded-2xl rounded-t-2xl shadow-2xl p-4 space-y-4 max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom duration-200">
            <div className="flex items-center justify-between border-b border-stone-800 pb-2">
              <h3 className="font-bold text-stone-100 text-base">
                Новое оружие / атака
              </h3>
              <button
                onClick={() => setIsAddWeaponOpen(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-stone-400 hover:text-stone-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs text-stone-400 mb-1">
                  Название оружия
                </label>
                <input
                  type="text"
                  value={newWeaponName}
                  onChange={(e) => setNewWeaponName(e.target.value)}
                  placeholder="Например: Длинный меч +1"
                  className="w-full min-h-[44px] px-3 rounded-lg bg-stone-800 border border-stone-700 text-stone-100 text-sm focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-stone-400 mb-1">
                    Бонус атаки
                  </label>
                  <input
                    type="text"
                    value={newWeaponBonus}
                    onChange={(e) => setNewWeaponBonus(e.target.value)}
                    placeholder="+5"
                    className="w-full min-h-[44px] px-3 rounded-lg bg-stone-800 border border-stone-700 text-stone-100 text-sm focus:border-amber-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs text-stone-400 mb-1">
                    Формула урона
                  </label>
                  <input
                    type="text"
                    value={newWeaponDamage}
                    onChange={(e) => setNewWeaponDamage(e.target.value)}
                    placeholder="1d8+3"
                    className="w-full min-h-[44px] px-3 rounded-lg bg-stone-800 border border-stone-700 text-stone-100 text-sm focus:border-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-stone-400 mb-1">
                    Тип урона
                  </label>
                  <input
                    type="text"
                    value={newWeaponType}
                    onChange={(e) => setNewWeaponType(e.target.value)}
                    placeholder="Рубящий"
                    className="w-full min-h-[44px] px-3 rounded-lg bg-stone-800 border border-stone-700 text-stone-100 text-sm focus:border-amber-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs text-stone-400 mb-1">
                    Свойство мастерства
                  </label>
                  <input
                    type="text"
                    value={newWeaponMastery}
                    onChange={(e) => setNewWeaponMastery(e.target.value)}
                    placeholder="Задевание / Сбивание"
                    className="w-full min-h-[44px] px-3 rounded-lg bg-stone-800 border border-stone-700 text-stone-100 text-sm focus:border-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              <button
                onClick={handleAddWeapon}
                className="w-full min-h-[48px] rounded-xl bg-amber-600 hover:bg-amber-500 active:scale-95 text-white font-bold text-sm shadow-md transition-all touch-manipulation mt-2"
              >
                Сохранить оружие
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
