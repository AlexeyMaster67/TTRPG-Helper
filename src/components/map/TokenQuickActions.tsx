import { useState, useRef, useEffect } from 'react';
import {
  Heart,
  Zap,
  Eye,
  EyeOff,
  Trash2,
  Plus,
  Minus,
  Shield,
  X,
  Check,
  Swords,
  Sparkles,
  Radio,
} from 'lucide-react';
import { Combatant } from '../../types/combat';
import { ConditionType } from '../../types/dnd5e';
import { StandaloneToken } from '../../types/map';
import { useCombatStore } from '../../store/combatStore';
import { useMapStore } from '../../store/mapStore';
import { useTokenForgeStore } from '../../store/tokenForgeStore';
import { getTokenScale } from './TacticalBattleMap';

interface TokenQuickActionsProps {
  combatant?: Combatant | null;
  standaloneToken?: StandaloneToken | null;
  scale: number;
  panX: number;
  panY: number;
  gridCellSize: number;
  containerWidth: number;
  containerHeight: number;
  onClose: () => void;
  onSendToCombat?: (tokenId: string) => void;
}

const COMMON_CONDITIONS: { type: ConditionType; nameRu: string; color: string }[] = [
  { type: 'Prone', nameRu: 'Сбит с ног', color: '#B45309' },
  { type: 'Blinded', nameRu: 'Ослеплён', color: '#6B7280' },
  { type: 'Unconscious', nameRu: 'Без сознания', color: '#DC2626' },
  { type: 'Restrained', nameRu: 'Опутан', color: '#9333EA' },
  { type: 'Paralyzed', nameRu: 'Парализован', color: '#E11D48' },
  { type: 'Poisoned', nameRu: 'Отравлен', color: '#16A34A' },
  { type: 'Dazed', nameRu: 'Ошеломлён', color: '#8B5CF6' },
  { type: 'Frightened', nameRu: 'Испуган', color: '#D97706' },
  { type: 'Charmed', nameRu: 'Очарован', color: '#F43F5E' },
  { type: 'Invisible', nameRu: 'Невидимый', color: '#0EA5E9' },
  { type: 'Grappled', nameRu: 'Захвачен', color: '#EA580C' },
  { type: 'Incapacitated', nameRu: 'Недееспособен', color: '#991B1B' },
  { type: 'Deafened', nameRu: 'Оглохший', color: '#4B5563' },
  { type: 'Petrified', nameRu: 'Окаменевший', color: '#78716C' },
];

export function TokenQuickActions({
  combatant,
  standaloneToken,
  scale,
  panX,
  panY,
  gridCellSize,
  containerWidth,
  containerHeight,
  onClose,
  onSendToCombat,
}: TokenQuickActionsProps) {
  const {
    applyDamage,
    applyHealing,
    applyTempHp,
    addCondition,
    removeCondition,
    updateCombatant,
    removeCombatant,
    activeEffects,
    addEffectToCombatant,
    removeEffectFromCombatant,
  } = useCombatStore();

  const { updateMapToken, removeMapToken, sendTokenToCombat } = useMapStore();

  const [activePopover, setActivePopover] = useState<'hp' | 'condition' | 'aura' | null>(null);
  const [hpAmount, setHpAmount] = useState<number>(5);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close popover when clicking outside
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setActivePopover(null);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const isStandalone = !!standaloneToken;
  const target = standaloneToken || combatant;
  if (!target) return null;

  // Calculate screen position following token center and top edge
  const scaleMod = getTokenScale(target);
  const tokenRadiusScreen = ((gridCellSize / 2) * scaleMod) * scale;
  const tokenX = isStandalone ? standaloneToken!.x : (combatant!.tokenX ?? 100);
  const tokenY = isStandalone ? standaloneToken!.y : (combatant!.tokenY ?? 100);
  const screenX = tokenX * scale + panX;
  const screenY = tokenY * scale + panY;

  // Floating pill positioned above or below the token
  const pillY = screenY - tokenRadiusScreen - 12;
  const isNearTop = pillY < 180;

  // Horizontal boundary clamping: pill width ~440-460px (half-width ~230px + 12px margin)
  const halfPillWidth = 230;
  const minX = halfPillWidth + 12;
  const maxX = Math.max(minX, containerWidth - halfPillWidth - 12);
  const clampedX = Math.max(minX, Math.min(maxX, screenX));

  // Vertical boundary clamping: if near top edge (< 180), place pill below token
  const rawY = isNearTop ? screenY + tokenRadiusScreen + 24 : pillY;
  const clampedY = Math.max(40, Math.min(containerHeight - 60, rawY));

  const isHidden = isStandalone
    ? !standaloneToken!.isVisibleToPlayers
    : combatant!.tokenVisibleToPlayers === false;
  const activeConditionCount = !isStandalone && combatant?.conditions ? combatant.conditions.length : 0;

  const combatantEffects = (!isStandalone && combatant) ? (activeEffects[combatant.id] || []) : [];
  const auraEffect = combatantEffects.find((e) => e.aura && e.aura.enabled);
  const currentAura = isStandalone
    ? standaloneToken?.aura || { enabled: false, radiusFeet: 10, color: '#3B82F6' }
    : auraEffect?.aura || { enabled: false, radiusFeet: 10, color: '#3B82F6' };
  const isAuraActive = isStandalone ? !!standaloneToken?.aura?.enabled : !!auraEffect;

  const handleToggleAura = () => {
    if (isStandalone && standaloneToken) {
      updateMapToken(standaloneToken.id, {
        aura: {
          enabled: !standaloneToken.aura?.enabled,
          radiusFeet: standaloneToken.aura?.radiusFeet || 10,
          color: standaloneToken.aura?.color || '#3B82F6',
          opacity: 0.22,
          pulsing: true,
        },
      });
    } else if (combatant) {
      if (auraEffect) {
        removeEffectFromCombatant(combatant.id, auraEffect.id);
      } else {
        addEffectToCombatant(combatant.id, {
          id: `aura_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          name: 'Аура (10 фт.)',
          iconTag: 'Radio',
          durationRounds: 'permanent',
          aura: {
            enabled: true,
            radiusFeet: currentAura.radiusFeet || 10,
            color: currentAura.color || '#3B82F6',
            opacity: 0.22,
            pulsing: true,
          },
        });
      }
    }
  };

  const handleSetAuraRadius = (radiusFeet: number) => {
    if (isStandalone && standaloneToken) {
      updateMapToken(standaloneToken.id, {
        aura: {
          enabled: true,
          radiusFeet,
          color: standaloneToken.aura?.color || '#3B82F6',
          opacity: 0.22,
          pulsing: true,
        },
      });
    } else if (combatant) {
      const color = auraEffect?.aura?.color || currentAura.color || '#3B82F6';
      if (auraEffect) {
        removeEffectFromCombatant(combatant.id, auraEffect.id);
      }
      addEffectToCombatant(combatant.id, {
        id: `aura_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        name: `Аура (${radiusFeet} фт.)`,
        iconTag: 'Radio',
        durationRounds: 'permanent',
        aura: {
          enabled: true,
          radiusFeet,
          color,
          opacity: 0.22,
          pulsing: true,
        },
      });
    }
  };

  const handleSetAuraColor = (color: string) => {
    if (isStandalone && standaloneToken) {
      updateMapToken(standaloneToken.id, {
        aura: {
          enabled: true,
          radiusFeet: standaloneToken.aura?.radiusFeet || 10,
          color,
          opacity: 0.22,
          pulsing: true,
        },
      });
    } else if (combatant) {
      const radiusFeet = auraEffect?.aura?.radiusFeet || currentAura.radiusFeet || 10;
      if (auraEffect) {
        removeEffectFromCombatant(combatant.id, auraEffect.id);
      }
      addEffectToCombatant(combatant.id, {
        id: `aura_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        name: `Аура (${radiusFeet} фт.)`,
        iconTag: 'Radio',
        durationRounds: 'permanent',
        aura: {
          enabled: true,
          radiusFeet,
          color,
          opacity: 0.22,
          pulsing: true,
        },
      });
    }
  };

  const handleToggleCondition = (type: ConditionType) => {
    if (isStandalone || !combatant) return;
    const isAlreadyActive = combatant.conditions?.some((c) => c.type === type);
    if (isAlreadyActive) {
      removeCondition(combatant.id, type);
    } else {
      addCondition(combatant.id, { type });
    }
  };

  const handleDamage = () => {
    if (hpAmount <= 0) return;
    if (isStandalone) {
      const curHp = standaloneToken?.hp ?? 10;
      updateMapToken(standaloneToken!.id, { hp: Math.max(0, curHp - hpAmount) });
      setActivePopover(null);
    } else if (combatant) {
      applyDamage(combatant.id, hpAmount);
      setActivePopover(null);
    }
  };

  const handleHeal = () => {
    if (hpAmount <= 0) return;
    if (isStandalone) {
      const curHp = standaloneToken?.hp ?? 10;
      const maxHp = standaloneToken?.maxHp ?? curHp;
      updateMapToken(standaloneToken!.id, { hp: Math.min(maxHp, curHp + hpAmount) });
      setActivePopover(null);
    } else if (combatant) {
      applyHealing(combatant.id, hpAmount);
      setActivePopover(null);
    }
  };

  const handleTempHp = () => {
    if (hpAmount <= 0) return;
    if (!isStandalone && combatant) {
      applyTempHp(combatant.id, hpAmount);
      setActivePopover(null);
    }
  };

  const handleToggleHidden = () => {
    if (isStandalone) {
      updateMapToken(standaloneToken!.id, {
        isVisibleToPlayers: !standaloneToken!.isVisibleToPlayers,
      });
    } else if (combatant) {
      updateCombatant(combatant.id, {
        tokenVisibleToPlayers: isHidden ? true : false,
      });
    }
  };

  const handleDelete = () => {
    if (isStandalone) {
      removeMapToken(standaloneToken!.id);
      onClose();
    } else if (combatant) {
      removeCombatant(combatant.id);
      onClose();
    }
  };

  const handleSendToCombatAction = () => {
    if (!isStandalone) return;
    if (onSendToCombat) {
      onSendToCombat(standaloneToken!.id);
    } else {
      sendTokenToCombat(standaloneToken!.id);
    }
    onClose();
  };


  return (
    <div
      ref={containerRef}
      className="absolute z-40 select-none animate-in fade-in zoom-in-95 duration-100"
      style={{
        left: clampedX,
        top: clampedY,
        transform: isNearTop ? 'translate(-50%, 0)' : 'translate(-50%, -100%)',
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Mini Popover: Damage / Healing / Temp HP */}
      {activePopover === 'hp' && (
        <div className={`absolute ${isNearTop ? 'top-[calc(100%+8px)]' : 'bottom-[calc(100%+8px)]'} left-1/2 -translate-x-1/2 bg-[#121620]/95 border border-gold/50 rounded-lg p-2.5 shadow-2xl backdrop-blur-md w-60 text-xs space-y-2 ring-1 ring-gold/20 animate-in fade-in duration-100`}>
          <div className="flex items-center justify-between border-b border-slate-700/60 pb-1.5">
            <span className="font-semibold text-gray-200 flex items-center gap-1.5">
              <Heart className="h-3.5 w-3.5 text-red-400" />
              <span>Здоровье: {isStandalone ? (standaloneToken?.hp ?? 10) : combatant?.hp}/{isStandalone ? (standaloneToken?.maxHp ?? standaloneToken?.hp ?? 10) : combatant?.maxHp}</span>
            </span>
            {!isStandalone && combatant?.tempHp ? (
              <span className="text-[10px] text-cyan-400 font-mono">+{combatant.tempHp} вр.</span>
            ) : null}
            <button
              onClick={() => setActivePopover(null)}
              className="text-gray-400 hover:text-white p-0.5"
            >
              <X className="h-3 w-3" />
            </button>
          </div>

          {/* Quick presets */}
          <div className="flex items-center gap-1 justify-between">
            {[1, 5, 10, 15, 20, 30].map((val) => (
              <button
                key={val}
                type="button"
                onClick={() => setHpAmount(val)}
                className={`flex-1 py-0.5 rounded text-[11px] font-mono border transition-colors ${
                  hpAmount === val
                    ? 'bg-gold text-slate-950 font-bold border-gold'
                    : 'bg-[#1a202c] border-slate-700 text-gray-300 hover:text-white hover:border-gold/40'
                }`}
              >
                {val}
              </button>
            ))}
          </div>

          {/* Custom amount input */}
          <div className="flex items-center gap-1.5">
            <span className="text-gray-400 text-[11px]">Значение:</span>
            <input
              type="number"
              min="1"
              max="999"
              value={hpAmount}
              onChange={(e) => setHpAmount(Math.max(1, Number(e.target.value) || 1))}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleDamage();
              }}
              className="flex-1 bg-[#0b0e14] border border-slate-700 rounded px-2 py-1 text-center font-mono text-gray-100 text-xs focus:outline-none focus:border-gold"
              autoFocus
            />
          </div>

          {/* Action buttons */}
          <div className={`grid ${isStandalone ? 'grid-cols-2' : 'grid-cols-3'} gap-1 pt-1`}>
            <button
              type="button"
              onClick={handleDamage}
              className="py-1 px-1.5 bg-red-950/80 hover:bg-red-900 border border-red-600/70 text-red-200 rounded font-bold text-[11px] flex items-center justify-center gap-1 transition-colors"
              title="Нанести урон"
            >
              <Minus className="h-3 w-3 text-red-400" />
              <span>Урон</span>
            </button>
            <button
              type="button"
              onClick={handleHeal}
              className="py-1 px-1.5 bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-600/70 text-emerald-200 rounded font-bold text-[11px] flex items-center justify-center gap-1 transition-colors"
              title="Восстановить здоровье"
            >
              <Plus className="h-3 w-3 text-emerald-400" />
              <span>Лечить</span>
            </button>
            {!isStandalone && (
              <button
                type="button"
                onClick={handleTempHp}
                className="py-1 px-1.5 bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-600/70 text-cyan-200 rounded font-bold text-[11px] flex items-center justify-center gap-1 transition-colors"
                title="Добавить временные ОЗ"
              >
                <Shield className="h-3 w-3 text-cyan-400" />
                <span>Вр. ОЗ</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Mini Popover: Condition Toggler (combatants only) */}
      {!isStandalone && combatant && activePopover === 'condition' && (
        <div className={`absolute ${isNearTop ? 'top-[calc(100%+8px)]' : 'bottom-[calc(100%+8px)]'} left-1/2 -translate-x-1/2 bg-[#121620]/95 border border-gold/50 rounded-lg p-2.5 shadow-2xl backdrop-blur-md w-72 text-xs space-y-2 ring-1 ring-gold/20 animate-in fade-in duration-100`}>
          <div className="flex items-center justify-between border-b border-slate-700/60 pb-1.5">
            <span className="font-semibold text-gold-light flex items-center gap-1.5">
              <Zap className="h-3.5 w-3.5 text-amber-400" />
              <span>Состояния существа</span>
            </span>
            <button
              onClick={() => setActivePopover(null)}
              className="text-gray-400 hover:text-white p-0.5"
            >
              <X className="h-3 w-3" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-1 max-h-52 overflow-y-auto pr-0.5">
            {COMMON_CONDITIONS.map((cond) => {
              const isActive = combatant.conditions?.some((c) => c.type === cond.type);
              return (
                <button
                  key={cond.type}
                  type="button"
                  onClick={() => handleToggleCondition(cond.type)}
                  className={`px-2 py-1 rounded text-left flex items-center justify-between transition-colors border text-[11px] ${
                    isActive
                      ? 'bg-amber-950/70 border-amber-500/80 text-amber-200 font-semibold shadow-sm'
                      : 'bg-[#1a202c]/70 border-slate-700/60 text-gray-300 hover:text-white hover:border-gold/40'
                  }`}
                >
                  <span className="truncate">{cond.nameRu}</span>
                  {isActive ? (
                    <Check className="h-3 w-3 text-amber-400 flex-shrink-0 ml-1" />
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Mini Popover: Aura Toggler */}
      {activePopover === 'aura' && (
        <div className={`absolute ${isNearTop ? 'top-[calc(100%+8px)]' : 'bottom-[calc(100%+8px)]'} left-1/2 -translate-x-1/2 bg-[#121620]/95 border border-gold/50 rounded-lg p-2.5 shadow-2xl backdrop-blur-md w-64 text-xs space-y-2.5 ring-1 ring-gold/20 animate-in fade-in duration-100`}>
          <div className="flex items-center justify-between border-b border-slate-700/60 pb-1.5">
            <span className="font-semibold text-gray-200 flex items-center gap-1.5">
              <Radio className="h-3.5 w-3.5 text-blue-400" />
              <span>Аура токена</span>
            </span>
            <button
              onClick={() => setActivePopover(null)}
              className="text-gray-400 hover:text-white p-0.5"
            >
              <X className="h-3 w-3" />
            </button>
          </div>

          {/* Toggle Aura Active state */}
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-gray-300">Состояние:</span>
            <button
              type="button"
              onClick={handleToggleAura}
              className={`px-2.5 py-0.5 rounded text-[11px] font-bold border transition-colors ${
                isAuraActive
                  ? 'bg-blue-600 text-white border-blue-400 shadow-sm'
                  : 'bg-[#1a202c] border-slate-700 text-gray-400 hover:text-gray-200'
              }`}
            >
              {isAuraActive ? 'Включена' : 'Выключена'}
            </button>
          </div>

          {/* Radius selector */}
          <div className="space-y-1">
            <span className="text-[11px] text-gray-400">Радиус (футы):</span>
            <div className="grid grid-cols-4 gap-1">
              {[10, 20, 30, 60].map((ft) => (
                <button
                  key={ft}
                  type="button"
                  onClick={() => handleSetAuraRadius(ft)}
                  className={`py-1 rounded text-[11px] font-mono border transition-colors ${
                    (currentAura.radiusFeet || 10) === ft && isAuraActive
                      ? 'bg-gold text-slate-950 font-bold border-gold'
                      : 'bg-[#1a202c] border-slate-700 text-gray-300 hover:text-white hover:border-gold/40'
                  }`}
                >
                  {ft} фт.
                </button>
              ))}
            </div>
          </div>

          {/* Color palette */}
          <div className="space-y-1">
            <span className="text-[11px] text-gray-400">Цвет ауры:</span>
            <div className="flex items-center justify-between gap-1 pt-0.5">
              {[
                { hex: '#3B82F6', label: 'Синий' },
                { hex: '#F59E0B', label: 'Золотой' },
                { hex: '#10B981', label: 'Изумрудный' },
                { hex: '#8B5CF6', label: 'Фиолетовый' },
                { hex: '#EF4444', label: 'Красный' },
                { hex: '#06B6D4', label: 'Бирюзовый' },
              ].map((c) => (
                <button
                  key={c.hex}
                  type="button"
                  onClick={() => handleSetAuraColor(c.hex)}
                  className={`w-6 h-6 rounded-full border-2 transition-transform ${
                    (currentAura.color || '#3B82F6') === c.hex
                      ? 'scale-110 border-white ring-2 ring-gold/40'
                      : 'border-transparent opacity-70 hover:opacity-100'
                  }`}
                  style={{ backgroundColor: c.hex }}
                  title={c.label}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Main Floating Micro-Action Pill Bar */}
      <div className="flex items-center gap-1 bg-[#0c1017]/95 border border-slate-700/80 shadow-2xl rounded-full p-1 backdrop-blur-md ring-1 ring-gold/30 hover:border-gold/60 transition-colors">
        {/* Token Mode & Name Tag */}
        {isStandalone && (
          <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-blue-950/80 text-blue-300 border border-blue-700/60 flex-shrink-0 ml-1">
            Вне боя
          </span>
        )}
        <span
          className="text-[11px] font-bold text-gold-light px-2 truncate max-w-[150px]"
          title={target.nameRu || target.name}
        >
          {target.nameRu || target.name}
        </span>

        <div className="h-3.5 w-px bg-slate-700/60" />

        {/* STANDALONE ACTION: Send To Combat ("В бой!") */}
        {isStandalone && (
          <button
            type="button"
            onClick={handleSendToCombatAction}
            className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white shadow-gold-glow flex items-center gap-1 border border-amber-400 transition-all cursor-pointer"
            title="Отправить токен в бой (бросок инициативы и добавление в трекер боя)"
          >
            <Swords className="h-3.5 w-3.5 text-amber-200" />
            <span>В бой!</span>
          </button>
        )}

        {/* 1. Quick Damage / Heal Pill [ -/+ ОЗ ] */}
        {(!isStandalone || standaloneToken?.hp !== undefined) && (
          <button
            type="button"
            onClick={() => setActivePopover((prev) => (prev === 'hp' ? null : 'hp'))}
            className={`px-2 py-1 rounded-full text-[11px] font-semibold flex items-center gap-1 transition-all ${
              activePopover === 'hp'
                ? 'bg-red-950 border border-red-500 text-red-200 shadow-sm'
                : 'bg-[#18202a] border border-slate-700/60 text-gray-200 hover:text-white hover:border-red-400/60 hover:bg-red-950/40'
            }`}
            title="Быстрый ввод урона или лечения (ОЗ)"
          >
            <Heart className="h-3 w-3 text-red-400" />
            <span>-/+ ОЗ</span>
          </button>
        )}

        {/* 2. Quick Condition Toggler Pill (combatants only) */}
        {!isStandalone && combatant && (
          <button
            type="button"
            onClick={() => setActivePopover((prev) => (prev === 'condition' ? null : 'condition'))}
            className={`px-2 py-1 rounded-full text-[11px] font-semibold flex items-center gap-1 transition-all ${
              activePopover === 'condition' || activeConditionCount > 0
                ? 'bg-amber-950 border border-amber-500 text-amber-200 shadow-sm'
                : 'bg-[#18202a] border border-slate-700/60 text-gray-200 hover:text-white hover:border-amber-400/60 hover:bg-amber-950/40'
            }`}
            title="Быстрое добавление и снятие состояний"
          >
            <Zap className="h-3 w-3 text-amber-400" />
            <span>Состояние</span>
            {activeConditionCount > 0 && (
              <span className="ml-0.5 px-1 py-0.2 bg-amber-500/20 text-amber-300 rounded text-[10px] font-mono">
                {activeConditionCount}
              </span>
            )}
          </button>
        )}

        {/* Quick Aura Pill */}
        <button
          type="button"
          onClick={() => setActivePopover((prev) => (prev === 'aura' ? null : 'aura'))}
          className={`px-2 py-1 rounded-full text-[11px] font-semibold flex items-center gap-1 transition-all cursor-pointer ${
            activePopover === 'aura' || isAuraActive
              ? 'bg-blue-950 border border-blue-500 text-blue-200 shadow-sm'
              : 'bg-[#18202a] border border-slate-700/60 text-gray-200 hover:text-white hover:border-blue-400/60 hover:bg-blue-950/40'
          }`}
          title="Быстрый переключатель ауры токена (10 фт., 30 фт., цвет)"
        >
          <Radio className="h-3 w-3 text-blue-400" />
          <span>Аура</span>
          {isAuraActive && (
            <span className="ml-0.5 px-1 py-0.2 bg-blue-500/20 text-blue-300 rounded text-[10px] font-mono">
              {currentAura.radiusFeet || 10} фт.
            </span>
          )}
        </button>

        {/* 3. Quick Hide / Reveal Pill */}
        <button
          type="button"
          onClick={handleToggleHidden}
          className={`px-2 py-1 rounded-full text-[11px] font-semibold flex items-center gap-1 transition-all ${
            isHidden
              ? 'bg-orange-950/80 border border-orange-500 text-orange-200'
              : 'bg-[#18202a] border border-slate-700/60 text-gray-200 hover:text-white hover:border-gold/50 hover:bg-gold/10'
          }`}
          title={isHidden ? 'Токен скрыт от игроков (кликните, чтобы показать)' : 'Токен виден игрокам (кликните, чтобы скрыть)'}
        >
          {isHidden ? (
            <>
              <EyeOff className="h-3 w-3 text-orange-400" />
              <span>Скрыт</span>
            </>
          ) : (
            <>
              <Eye className="h-3 w-3 text-emerald-400" />
              <span>Виден</span>
            </>
          )}
        </button>

        {/* 4. Token Forge Pill [ Кузница ] */}
        <button
          type="button"
          onClick={() => {
            const img = isStandalone
              ? standaloneToken?.avatarUrl || standaloneToken?.tokenUrl || null
              : combatant?.avatarUrl || combatant?.tokenUrl || null;
            const targetName = isStandalone
              ? standaloneToken?.nameRu || standaloneToken?.name || 'Токен'
              : combatant?.nameRu || combatant?.name || 'Боец';
            const faction = isStandalone
              ? 'none'
              : combatant?.isPlayer
              ? 'ally-blue'
              : 'enemy';

            useTokenForgeStore.getState().openForge({
              initialImage: img,
              name: targetName,
              targetCombatantId: !isStandalone && combatant ? combatant.id : null,
              targetTokenId: isStandalone && standaloneToken ? standaloneToken.id : null,
              faction,
            });
          }}
          className="px-2 py-1 rounded-full text-[11px] font-semibold flex items-center gap-1 transition-all bg-[#18202a] border border-slate-700/60 text-amber-300 hover:text-amber-100 hover:border-amber-400/60 hover:bg-amber-950/40 cursor-pointer"
          title="Открыть в Кузнице токенов для кадрирования и смены рамки"
        >
          <Sparkles className="h-3 w-3 text-amber-400" />
          <span>Кузница</span>
        </button>

        {/* 5. Delete Token Pill [ Удалить с карты ] */}
        <button
          type="button"
          onClick={handleDelete}
          className="p-1 rounded-full text-gray-400 hover:text-red-300 hover:bg-red-950/60 hover:border-red-500 border border-transparent transition-colors"
          title="Удалить токен с карты"
        >
          <Trash2 className="h-3 w-3 text-red-400" />
        </button>

        {/* Deselect / Close */}
        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded-full text-gray-400 hover:text-white hover:bg-slate-800 transition-colors"
          title="Снять выбор"
        >
          <X className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}
