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
import { useTranslation } from '../../i18n';
import { useSettingsStore } from '../../store/settingsStore';
import { openExternal } from '../../utils/openExternal';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import clsx from 'clsx';

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
  const { t } = useTranslation();
  const language = useSettingsStore((s) => s.language);
  const isRu = language === 'ru';
  const isOnline = useNetworkStatus();
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
        title={isRu ? 'Инструменты Мастера' : 'DM Tools'}
        aria-label={isRu ? 'Инструменты Мастера' : 'DM Tools'}
        className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 cursor-pointer shadow-sm border ${
          isOpen
            ? 'bg-[#1e2634] text-gold border-gold/70 shadow-[0_0_12px_rgba(245,185,32,0.25)]'
            : 'bg-[rgba(14,18,25,0.7)] hover:bg-[rgba(24,30,42,0.85)] border-[rgba(255,255,255,0.08)] hover:border-gold/50 text-gray-200 hover:text-white'
        }`}
      >
        <Wrench className="h-3.5 w-3.5 text-gold flex-shrink-0" />
        <span className="font-medium hidden sm:inline">{t('header.masterTools') || (isRu ? 'Инструменты' : 'DM Tools')}</span>
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
              {isRu ? 'Сюжет и генерация' : 'Campaign & Generators'}
            </div>
            <div className="space-y-0.5">
              <button
                type="button"
                onClick={() => handleAction(onOpenLoot)}
                title={isRu ? 'Генератор сокровищ и добычи по таблицам d100' : 'Generate random loot and treasures using d100 tables'}
                className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs text-gray-300 hover:text-gold hover:bg-white/5 transition-colors text-left cursor-pointer"
              >
                <Coins className="h-3.5 w-3.5 text-amber-400" />
                <span>{t('masterTools.lootGenerator') || (isRu ? 'Добыча и сокровища d100' : 'Loot & Treasures d100')}</span>
              </button>

              <button
                type="button"
                onClick={() => handleAction(onOpenNpcGenerator)}
                title={isRu ? 'Мгновенная генерация случайного неигрового персонажа' : 'Instant on-the-fly random NPC generator'}
                className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs text-gray-300 hover:text-gold hover:bg-white/5 transition-colors text-left cursor-pointer"
              >
                <User className="h-3.5 w-3.5 text-emerald-400" />
                <span>{t('masterTools.npcGenerator') || (isRu ? 'Генератор NPC' : 'NPC Generator')}</span>
              </button>

              <button
                type="button"
                onClick={() => handleAction(onOpenHandouts)}
                title={isRu ? 'Раздаточные материалы и заметки для игроков' : 'Handouts, letters, and illustrations for players'}
                className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs text-gray-300 hover:text-gold hover:bg-white/5 transition-colors text-left cursor-pointer"
              >
                <Scroll className="h-3.5 w-3.5 text-gold" />
                <span>{t('masterTools.handouts') || (isRu ? 'Раздаточные материалы' : 'Player Handouts')}</span>
              </button>

              <button
                type="button"
                onClick={() => handleAction(onOpenEncounters)}
                title={isRu ? 'Планировщик и менеджер боевых сцен' : 'Combat encounters and difficulty calculator'}
                className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs text-gray-300 hover:text-gold hover:bg-white/5 transition-colors text-left cursor-pointer"
              >
                <Swords className="h-3.5 w-3.5 text-blue-400" />
                <span>{t('masterTools.encounters') || (isRu ? 'Менеджер энкаунтеров' : 'Encounter Manager')}</span>
              </button>
            </div>
          </div>

          <div className="h-px bg-white/10" />

          {/* Секция 2: Аудио и визуал */}
          <div>
            <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-gray-400">
              {isRu ? 'Тактика и звук' : 'Tactics & Audio'}
            </div>
            <div className="space-y-0.5">
              <button
                type="button"
                onClick={() => handleAction(onOpenSoundboard)}
                title={isRu ? 'Саундборд, фоновая музыка и эмбиент' : 'Soundboard, ambience, and sound effects'}
                className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs text-gray-300 hover:text-gold hover:bg-white/5 transition-colors text-left cursor-pointer"
              >
                <Volume2 className="h-3.5 w-3.5 text-purple-400" />
                <span>{t('masterTools.soundboard') || (isRu ? 'Саундборд и атмосфера' : 'Soundboard & Ambience')}</span>
              </button>

              <button
                type="button"
                onClick={() => handleAction(onOpenTokenForge)}
                title={isRu ? 'Создание и кастомизация круглых боевых токенов' : 'Create and customize circular battle tokens'}
                className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs text-gray-300 hover:text-gold hover:bg-white/5 transition-colors text-left cursor-pointer"
              >
                <Sparkles className="h-3.5 w-3.5 text-gold-light" />
                <span>{t('masterTools.tokenForge') || (isRu ? 'Кузница токенов' : 'Token Forge')}</span>
              </button>

              <button
                type="button"
                onClick={() => handleAction(onOpenProceduralMap)}
                title={isRu ? 'Процедурный генератор сеток подземелий' : 'Procedural dungeon and maze generator'}
                className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs text-gray-300 hover:text-gold hover:bg-white/5 transition-colors text-left cursor-pointer"
              >
                <MapPin className="h-3.5 w-3.5 text-teal-400" />
                <span>{t('masterTools.proceduralMap') || (isRu ? 'Генератор подземелий' : 'Procedural Dungeon')}</span>
              </button>
            </div>
          </div>

          <div className="h-px bg-white/10" />

          {/* Секция 3: Правила и сессия */}
          <div>
            <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-gray-400">
              {isRu ? 'Правила и данные' : 'Rules & Data'}
            </div>
            <div className="space-y-0.5">
              <button
                type="button"
                onClick={() => handleAction(onOpenRules)}
                title={isRu ? 'Шпаргалка базовых правил D&D 2024' : 'D&D 2024 quick rules reference cheat sheet'}
                className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs text-gray-300 hover:text-gold hover:bg-white/5 transition-colors text-left cursor-pointer"
              >
                <BookOpen className="h-3.5 w-3.5 text-amber-300" />
                <span>{t('masterTools.rulesCheatSheet') || (isRu ? 'Шпаргалка правил' : 'Rules Reference')}</span>
              </button>

              <button
                type="button"
                onClick={() => handleAction(onExportSession)}
                title={isRu ? 'Экспорт данных сессии в файл JSON' : 'Export session data to a JSON file'}
                className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs text-gray-300 hover:text-emerald-400 hover:bg-white/5 transition-colors text-left cursor-pointer"
              >
                <Download className="h-3.5 w-3.5 text-emerald-400" />
                <span>{t('masterTools.exportSession') || (isRu ? 'Экспорт сессии (.json)' : 'Export Session (.json)')}</span>
              </button>

              <button
                type="button"
                onClick={() => handleAction(onImportSession)}
                title={isRu ? 'Импорт сохраненной сессии из файла JSON' : 'Import session from a JSON file'}
                className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs text-gray-300 hover:text-blue-400 hover:bg-white/5 transition-colors text-left cursor-pointer"
              >
                <Upload className="h-3.5 w-3.5 text-blue-400" />
                <span>{t('masterTools.importSession') || (isRu ? 'Импорт сессии (.json)' : 'Import Session (.json)')}</span>
              </button>
            </div>
          </div>

          <div className="h-px bg-white/10" />

          {/* Секция 4: Сообщество / Discord */}
          <div>
            <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-gray-400">
              {isRu ? 'Сообщество' : 'Community'}
            </div>
            <button
              type="button"
              disabled={!isOnline}
              onClick={() => {
                if (!isOnline) return;
                openExternal('https://discord.gg/MGnjS3ceEh');
                setIsOpen(false);
              }}
              title={
                !isOnline
                  ? (isRu ? 'Требуется подключение к интернету' : 'Internet connection required')
                  : (isRu ? 'Присоединиться к нашему Discord-сообществу' : 'Join our Discord community')
              }
              className={clsx(
                "w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs transition-colors text-left",
                isOnline
                  ? "text-[#93a1f8] hover:text-white hover:bg-[#5865F2]/20 cursor-pointer"
                  : "text-[#93a1f8] opacity-50 cursor-not-allowed"
              )}
            >
              <svg className="h-3.5 w-3.5 text-[#5865F2] flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.894.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
              </svg>
              <span>{isRu ? 'Дискорд сообщество' : 'Discord Community'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
