import React, { useState, useRef, useEffect } from 'react';
import {
  Wrench,
  ChevronDown,
  Scroll,
  Swords,
  Coins,
  Sparkles,
  Volume2,
  BookOpen,
  User,
  Download,
  Upload,
  MapPin,
} from 'lucide-react';

interface MasterToolsDropdownProps {
  onOpenLoot: () => void;
  onOpenHandouts: () => void;
  onOpenEncounters: () => void;
  onOpenSoundboard: () => void;
  onOpenTokenForge: () => void;
  onOpenProceduralMap: () => void;
  onOpenNpcGenerator: () => void;
  onOpenRules: () => void;
  onExportSession: () => void;
  onImportSession: () => void;
}

export const MasterToolsDropdown: React.FC<MasterToolsDropdownProps> = ({
  onOpenLoot,
  onOpenHandouts,
  onOpenEncounters,
  onOpenSoundboard,
  onOpenTokenForge,
  onOpenProceduralMap,
  onOpenNpcGenerator,
  onOpenRules,
  onExportSession,
  onImportSession,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleAction = (cb: () => void) => {
    cb();
    setIsOpen(false);
  };

  return (
    <div ref={dropdownRef} className="relative inline-block text-left">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        title="Все вспомогательные генераторы, свитки и инструменты мастера"
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 cursor-pointer shadow-sm border ${
          isOpen
            ? 'bg-[#1e2634] text-gold border-gold/70 shadow-[0_0_12px_rgba(245,185,32,0.25)]'
            : 'bg-[rgba(14,18,25,0.7)] hover:bg-[rgba(24,30,42,0.85)] border-[rgba(255,255,255,0.08)] hover:border-gold/50 text-gray-200 hover:text-white'
        }`}
      >
        <Wrench className="h-3.5 w-3.5 text-gold flex-shrink-0" />
        <span className="font-medium">Инструменты</span>
        <ChevronDown
          className={`h-3 w-3 text-gray-400 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-gold' : ''
          }`}
        />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-72 origin-top-right rounded-glass-xl border border-[rgba(255,255,255,0.12)] bg-[#0d1117]/95 backdrop-blur-xl shadow-[0_16px_40px_rgba(0,0,0,0.85),0_0_20px_rgba(245,185,32,0.15)] z-50 p-2 space-y-2 animate-in fade-in zoom-in-95 duration-150 select-none">
          {/* Секция 1: Сюжет и генераторы */}
          <div>
            <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-gray-400">
              Сюжет и генерация
            </div>
            <div className="space-y-0.5">
              <button
                onClick={() => handleAction(onOpenLoot)}
                className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs text-gray-300 hover:text-gold hover:bg-white/5 transition-colors text-left cursor-pointer"
              >
                <Coins className="h-3.5 w-3.5 text-amber-400" />
                <span>Добыча и сокровища d100</span>
              </button>

              <button
                onClick={() => handleAction(onOpenNpcGenerator)}
                className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs text-gray-300 hover:text-gold hover:bg-white/5 transition-colors text-left cursor-pointer"
              >
                <User className="h-3.5 w-3.5 text-emerald-400" />
                <span>Генератор NPC</span>
              </button>

              <button
                onClick={() => handleAction(onOpenHandouts)}
                className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs text-gray-300 hover:text-gold hover:bg-white/5 transition-colors text-left cursor-pointer"
              >
                <Scroll className="h-3.5 w-3.5 text-gold" />
                <span>Раздатки и тайны на экран</span>
              </button>

              <button
                onClick={() => handleAction(onOpenEncounters)}
                className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs text-gray-300 hover:text-gold hover:bg-white/5 transition-colors text-left cursor-pointer"
              >
                <Swords className="h-3.5 w-3.5 text-blue-400" />
                <span>Менеджер энкаунтеров</span>
              </button>
            </div>
          </div>

          <div className="h-px bg-white/10" />

          {/* Секция 2: Аудио и визуал */}
          <div>
            <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-gray-400">
              Медиа и карты
            </div>
            <div className="space-y-0.5">
              <button
                onClick={() => handleAction(onOpenSoundboard)}
                className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs text-gray-300 hover:text-gold hover:bg-white/5 transition-colors text-left cursor-pointer"
              >
                <Volume2 className="h-3.5 w-3.5 text-purple-400" />
                <span>Саундборд и звуки боя</span>
              </button>

              <button
                onClick={() => handleAction(onOpenTokenForge)}
                className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs text-gray-300 hover:text-gold hover:bg-white/5 transition-colors text-left cursor-pointer"
              >
                <Sparkles className="h-3.5 w-3.5 text-gold-light" />
                <span>Кузница круглых токенов</span>
              </button>

              <button
                onClick={() => handleAction(onOpenProceduralMap)}
                className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs text-gray-300 hover:text-gold hover:bg-white/5 transition-colors text-left cursor-pointer"
              >
                <MapPin className="h-3.5 w-3.5 text-teal-400" />
                <span>Процедурные подземелья</span>
              </button>
            </div>
          </div>

          <div className="h-px bg-white/10" />

          {/* Секция 3: Правила и сессия */}
          <div>
            <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-gray-400">
              Справочник и сессия
            </div>
            <div className="space-y-0.5">
              <button
                onClick={() => handleAction(onOpenRules)}
                className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs text-gray-300 hover:text-gold hover:bg-white/5 transition-colors text-left cursor-pointer"
              >
                <BookOpen className="h-3.5 w-3.5 text-amber-300" />
                <span>Шпаргалка правил D&D 2024</span>
              </button>

              <button
                onClick={() => handleAction(onExportSession)}
                className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs text-gray-300 hover:text-emerald-400 hover:bg-white/5 transition-colors text-left cursor-pointer"
              >
                <Download className="h-3.5 w-3.5 text-emerald-400" />
                <span>Сохранить сессию в JSON</span>
              </button>

              <button
                onClick={() => handleAction(onImportSession)}
                className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs text-gray-300 hover:text-blue-400 hover:bg-white/5 transition-colors text-left cursor-pointer"
              >
                <Upload className="h-3.5 w-3.5 text-blue-400" />
                <span>Загрузить сессию из JSON</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
