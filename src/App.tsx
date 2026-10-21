import { useState, useEffect, useRef } from 'react';
import { useCombatStore } from './store/combatStore';
import { useSpaceHotkey } from './hooks/useSpaceHotkey';
import { BestiaryLibrary, CombatRoster, StatblockInspector, ConcentrationAlertModal } from './components/tracker';
import { QuickDiceBar } from './components/dice/QuickDiceBar';
import { Dice3dOverlay } from './components/dice/Dice3dOverlay';
import { MasteryBadge, HealthBar, ToastNotification } from './components/ui';
import { TargetedAttackModal } from './components/combat/TargetedAttackModal';
import { TacticalBattleMap } from './components/map/TacticalBattleMap';
import { PlayerDisplayView } from './components/player/PlayerDisplayView';
import { PartyManagerModal } from './components/party/PartyManagerModal';
import { LootGeneratorModal } from './components/loot/LootGeneratorModal';
import { EncounterManagerModal } from './components/encounters/EncounterManagerModal';
import { CharacterSheetModal } from './components/party/CharacterSheetModal';
import { CharacterBuilderModal } from './components/party/CharacterBuilderModal';
import { ShortRestModal } from './components/party/ShortRestModal';
import { QrCharacterModal } from './components/party/QrCharacterModal';
import { SoundboardDrawer } from './components/audio/SoundboardDrawer';
import { SpotlightSearchModal } from './components/search/SpotlightSearchModal';
import { HandoutsModal } from './components/handouts/HandoutsModal';
import { audioService } from './services/audioService';
import { usePartyStore } from './store/partyStore';
import { useEncounterStore } from './store/encounterStore';
import { useMapStore } from './store/mapStore';
import { broadcastService } from './services/broadcastService';
import { useCombatNumpadHotkeys } from './hooks/useCombatNumpadHotkeys';
import { CombatLogDrawer } from './components/combat/CombatLogDrawer';
import { MobCombatModal } from './components/combat/MobCombatModal';
import { SettingsModal } from './components/settings/SettingsModal';
import { NpcGeneratorModal } from './components/tools/NpcGeneratorModal';
import { RulesCheatSheetModal } from './components/tools/RulesCheatSheetModal';
import { TokenForgeModal } from './components/tokens/TokenForgeModal';
import { ProceduralMapModal } from './components/map/ProceduralMapModal';
import { useTokenForgeStore } from './store/tokenForgeStore';
import { useSettingsStore, resolveEffectiveTheme } from './store/settingsStore';
import { backupService } from './services/backupService';
import { BrandLogo } from './components/brand/BrandLogo';
import { runAppDataMigration } from './services/appMigrationService';
import { runSaveMigration } from './services/saveMigrationService';
import { importCharacterFromTtrpgh } from './services/ttrpghFormat';
import { MobileCompanionView } from './components/mobile/MobileCompanionView';

// Early synchronization of system theme attribute before first paint
if (typeof document !== 'undefined') {
  const initialTheme = useSettingsStore.getState().getEffectiveTheme();
  document.documentElement.setAttribute('data-system', initialTheme);
}
import {
  Sword,
  Swords,
  Layers,
  Map,
  Radio,
  AlertTriangle,
  Users,
  Dices,
  Download,
  Upload,
  Layout,
  Volume2,
  Search,
  Scroll,
  BookOpen,
  User,
  Settings,
  Sparkles,
} from 'lucide-react';

function MainApp() {
  // Global Space hotkey listener with strict input isolation
  useSpaceHotkey();
  // Global Numpad and Undo/Redo keyboard controls
  useCombatNumpadHotkeys();

  const { uiScale, openModal: openSettingsModal } = useSettingsStore();
  const [isNpcModalOpen, setIsNpcModalOpen] = useState(false);
  const [isRulesModalOpen, setIsRulesModalOpen] = useState(false);

  // Initialize auto-backup on mount
  useEffect(() => {
    backupService.initAutoBackup();
  }, []);

  const {
    hasSavedSessionPrompt,
    savedSessionData,
    checkForSavedSession,
    restoreSavedSession,
    dismissSavedSession,
  } = useCombatStore();

  // Navigation tab: 'combat' | 'map' | 'split' | 'tokens'
  const [activeTab, setActiveTab] = useState<'combat' | 'map' | 'split' | 'tokens'>('combat');
  const [isLootOpen, setIsLootOpen] = useState(false);
  const [isSoundboardOpen, setIsSoundboardOpen] = useState(false);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [isSpotlightOpen, setIsSpotlightOpen] = useState(false);
  const [isHandoutsOpen, setIsHandoutsOpen] = useState(false);

  // Global Ctrl+K / Cmd+K Spotlight search shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSpotlightOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Global Drag & Drop handler for .ttrpgh files
  useEffect(() => {
    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
    };

    const handleDrop = (e: DragEvent) => {
      const files = e.dataTransfer?.files;
      if (!files || files.length === 0) return;

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (file.name.toLowerCase().endsWith('.ttrpgh')) {
          e.preventDefault();
          const reader = new FileReader();
          reader.onload = (ev) => {
            try {
              const text = ev.target?.result as string;
              const member = importCharacterFromTtrpgh(text);
              usePartyStore.getState().addMember(member);
              usePartyStore
                .getState()
                .showToast(`Персонаж "${member.name}" успешно добавлен в отряд из .ttrpgh!`);
            } catch (err) {
              console.error('[App] Failed to import .ttrpgh file:', err);
            }
          };
          reader.readAsText(file);
        }
      }
    };

    window.addEventListener('dragover', handleDragOver);
    window.addEventListener('drop', handleDrop);
    return () => {
      window.removeEventListener('dragover', handleDragOver);
      window.removeEventListener('drop', handleDrop);
    };
  }, []);

  useEffect(() => {
    const unsub = audioService.subscribe(() => {
      setIsAudioPlaying(audioService.isPlaying());
    });
    return unsub;
  }, []);

  const openPartyModal = usePartyStore((s) => s.openModal);
  const partyMembers = usePartyStore((s) => s.members);
  const loadParty = usePartyStore((s) => s.loadParty);

  const openEncounterModal = useEncounterStore((s) => s.openModal);
  const loadEncounters = useEncounterStore((s) => s.loadEncounters);

  const exportSession = useCombatStore((s) => s.exportCombatSessionJson);
  const importSession = useCombatStore((s) => s.importCombatSessionJson);
  const sessionFileRef = useRef<HTMLInputElement>(null);

  // Run migration, check saved session and load party & encounters on mount
  useEffect(() => {
    runAppDataMigration()
      .then(() => runSaveMigration())
      .catch(console.error);
    checkForSavedSession();
    loadParty();
    loadEncounters();
  }, [checkForSavedSession, loadParty, loadEncounters]);

  // Player screen live connection status
  const [isPlayerScreenActive, setIsPlayerScreenActive] = useState(false);
  const playerHeartbeatTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Respond to Player Display state synchronization requests & presence heartbeats
  useEffect(() => {
    const markScreenActive = () => {
      setIsPlayerScreenActive(true);
      if (playerHeartbeatTimeoutRef.current) {
        clearTimeout(playerHeartbeatTimeoutRef.current);
      }
      playerHeartbeatTimeoutRef.current = setTimeout(() => {
        setIsPlayerScreenActive(false);
      }, 7000);
    };

    const unsubscribe = broadcastService.subscribe((msg) => {
      if (msg.type === 'REQUEST_SYNC') {
        useCombatStore.getState().broadcastCurrentState();
        useMapStore.getState().broadcastMapState();
        markScreenActive();
      } else if (msg.type === 'PLAYER_DISPLAY_PONG') {
        markScreenActive();
      } else if (msg.type === 'PLAYER_DISPLAY_CLOSED') {
        setIsPlayerScreenActive(false);
        if (playerHeartbeatTimeoutRef.current) {
          clearTimeout(playerHeartbeatTimeoutRef.current);
        }
      }
    });

    // Check if player display window is already active
    broadcastService.send({ type: 'PLAYER_DISPLAY_PING' });

    return () => {
      unsubscribe();
      if (playerHeartbeatTimeoutRef.current) {
        clearTimeout(playerHeartbeatTimeoutRef.current);
      }
    };
  }, []);

  const handleExportSession = () => {
    const json = exportSession();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dnd_combat_session_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportSession = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    try {
      const text = await file.text();
      importSession(text);
    } catch (err) {
      console.error('Error importing session:', err);
    }
    e.target.value = '';
  };

  const handleOpenPlayerDisplay = async () => {
    // Immediately mark as active while the window launches
    setIsPlayerScreenActive(true);
    if (playerHeartbeatTimeoutRef.current) {
      clearTimeout(playerHeartbeatTimeoutRef.current);
    }
    playerHeartbeatTimeoutRef.current = setTimeout(() => {
      setIsPlayerScreenActive(false);
    }, 8000);

    try {
      const { invoke } = await import('@tauri-apps/api/core');
      await invoke('open_player_window');
    } catch (e) {
      console.log('[App] Fallback opening player display in new window/tab:', e);
      window.open('?view=player', 'PlayerDisplay', 'width=1280,height=800');
    }
  };

  return (
    <div
      style={{ zoom: `${uiScale}%` }}
      className="flex h-screen w-screen flex-col bg-canvas text-gray-100 font-sans overflow-hidden select-none p-2 sm:p-2.5 gap-2.5"
    >
      {/* Верхняя панель: Плавающий стеклянный остров управления (h-14, rounded-glass-xl) */}
      <header className="h-14 bg-[rgba(18,22,30,0.78)] backdrop-blur-md border border-[rgba(255,255,255,0.08)] rounded-glass-xl px-3 sm:px-4 flex items-center justify-between flex-shrink-0 z-30 shadow-[0_12px_32px_-4px_rgba(0,0,0,0.65)] gap-2 lg:gap-4 select-none">
        {/* ЛЕВАЯ ЧАСТЬ: Логотип + Название + Золотой бейдж + Переключатель режимов */}
        <div className="flex items-center gap-2.5 sm:gap-3.5 flex-shrink-0">
          <BrandLogo />

          <div className="h-5 w-px bg-[rgba(255,255,255,0.08)] hidden sm:block" />

          {/* Переключатель режимов (Pill-табы) */}
          <nav
            role="tablist"
            aria-label="Режимы интерфейса"
            className="flex items-center p-1 rounded-full bg-[rgba(14,18,25,0.7)] border border-[rgba(255,255,255,0.08)] shadow-inner gap-1"
          >
            <button
              onClick={() => setActiveTab('combat')}
              role="tab"
              aria-selected={activeTab === 'combat'}
              title="Боевой трекер инициативы, очереди ходов и статблоков"
              className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 cursor-pointer ${
                activeTab === 'combat'
                  ? 'bg-[#1e2634] text-white font-semibold border border-[#f5b920]/60 shadow-[0_0_14px_rgba(245,185,32,0.25)]'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-[rgba(255,255,255,0.05)] border border-transparent'
              }`}
            >
              <Sword className={`h-3.5 w-3.5 ${activeTab === 'combat' ? 'text-[#f5b920]' : 'text-gray-400'}`} />
              <span className="hidden sm:inline">Бой</span>
              {activeTab === 'combat' && (
                <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-3 h-0.5 bg-[#f5b920] rounded-full shadow-[0_0_6px_#f5b920]" />
              )}
            </button>

            <button
              onClick={() => setActiveTab('map')}
              role="tab"
              aria-selected={activeTab === 'map'}
              title="Тактическая 2D боевая карта: сетка, туман войны, шаблоны AoE и токены"
              className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 cursor-pointer ${
                activeTab === 'map'
                  ? 'bg-[#1e2634] text-white font-semibold border border-[#f5b920]/60 shadow-[0_0_14px_rgba(245,185,32,0.25)]'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-[rgba(255,255,255,0.05)] border border-transparent'
              }`}
            >
              <Map className={`h-3.5 w-3.5 ${activeTab === 'map' ? 'text-blue-400' : 'text-gray-400'}`} />
              <span className="hidden sm:inline">Карта</span>
              {activeTab === 'map' && (
                <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-3 h-0.5 bg-[#f5b920] rounded-full shadow-[0_0_6px_#f5b920]" />
              )}
            </button>

            <button
              onClick={() => setActiveTab('split')}
              role="tab"
              aria-selected={activeTab === 'split'}
              title="Сплит-режим: Боевой ростер слева + Тактическая карта справа"
              className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 cursor-pointer ${
                activeTab === 'split'
                  ? 'bg-[#1e2634] text-white font-semibold border border-[#f5b920]/60 shadow-[0_0_14px_rgba(245,185,32,0.25)]'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-[rgba(255,255,255,0.05)] border border-transparent'
              }`}
            >
              <Layout className={`h-3.5 w-3.5 ${activeTab === 'split' ? 'text-amber-400' : 'text-gray-400'}`} />
              <span className="hidden sm:inline">Сплит</span>
              {activeTab === 'split' && (
                <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-3 h-0.5 bg-[#f5b920] rounded-full shadow-[0_0_6px_#f5b920]" />
              )}
            </button>
          </nav>
        </div>

        {/* ЦЕНТР: Стеклянная строка глобального поиска */}
        <div className="hidden lg:flex flex-1 max-w-[300px] min-w-[120px] mx-1 sm:mx-2 shrink">
          <button
            type="button"
            onClick={() => setIsSpotlightOpen(true)}
            title="Быстрый глобальный поиск по базе правил (Ctrl+K): монстры, заклинания, предметы"
            className="w-full flex items-center justify-between px-3 py-1.5 rounded-glass bg-[rgba(14,18,25,0.7)] hover:bg-[rgba(24,30,42,0.85)] border border-[rgba(255,255,255,0.08)] hover:border-[#f5b920]/50 text-xs text-gray-300 transition-all duration-200 group shadow-inner cursor-pointer hover:shadow-[0_0_16px_rgba(245,185,32,0.2)]"
          >
            <div className="flex items-center gap-2 min-w-0 pr-2">
              <Search className="h-3.5 w-3.5 text-[#f5b920] shrink-0 group-hover:scale-110 transition-transform duration-200" />
              <span className="truncate text-gray-400 group-hover:text-gray-200 font-normal select-none">
                Поиск (Ctrl+K)...
              </span>
            </div>
            <kbd className="flex items-center gap-0.5 px-2 py-0.5 rounded-md bg-black/40 border border-[rgba(255,255,255,0.12)] font-mono text-[10px] text-gray-400 group-hover:text-gold-light group-hover:border-[#f5b920]/40 shadow-sm shrink-0">
              Ctrl+K
            </kbd>
          </button>
        </div>

        {/* ПРАВАЯ ЧАСТЬ: Набор инструментов мастера и статус */}
        <div className="flex items-center gap-1.5 sm:gap-2 lg:gap-2.5 flex-shrink-0">
          {/* Группа кнопок мастера */}
          <div className="flex items-center p-0.5 rounded-full bg-[rgba(14,18,25,0.7)] border border-[rgba(255,255,255,0.08)] shadow-inner gap-0.5">
            {/* Партия */}
            <button
              onClick={openPartyModal}
              title="Постоянный отряд героев (статы, высадка в бой)"
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs text-gray-300 hover:text-white hover:bg-[rgba(255,255,255,0.08)] transition-all group cursor-pointer"
            >
              <Users className="h-3.5 w-3.5 text-emerald-400 group-hover:scale-105 transition-transform" />
              <span className="hidden xl:inline font-medium">Отряд</span>
              {partyMembers.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-emerald-950/80 text-emerald-300 font-mono text-[10px] border border-emerald-600/50 shadow-sm">
                  {partyMembers.length}
                </span>
              )}
            </button>

            {/* Добыча d100 */}
            <button
              onClick={() => setIsLootOpen(true)}
              title="Генератор добычи и бросок сокровищ d100"
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs text-amber-300/90 hover:text-amber-200 hover:bg-[rgba(255,255,255,0.08)] transition-all group cursor-pointer"
            >
              <Dices className="h-3.5 w-3.5 text-amber-400 group-hover:rotate-12 transition-transform" />
              <span className="hidden xl:inline font-medium">Добыча</span>
            </button>

            {/* Раздаточные материалы */}
            <button
              onClick={() => setIsHandoutsOpen(true)}
              title="Трансляция писем, свитков и тайн на экран игроков"
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs text-[#fce79f] hover:text-white hover:bg-[rgba(255,255,255,0.08)] transition-all group cursor-pointer"
            >
              <Scroll className="h-3.5 w-3.5 text-[#f5b920] group-hover:scale-105 transition-transform" />
              <span className="hidden 2xl:inline font-medium">Раздатки</span>
            </button>

            {/* Сражения (Энкаунтеры) */}
            <button
              onClick={openEncounterModal}
              title="Менеджер готовых сражений и расчет сложности опыта"
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs text-purple-300/90 hover:text-white hover:bg-[rgba(255,255,255,0.08)] transition-all group cursor-pointer"
            >
              <Swords className="h-3.5 w-3.5 text-purple-400 group-hover:scale-105 transition-transform" />
              <span className="hidden xl:inline font-medium">Сражения</span>
            </button>

            {/* Аудио и эмбиенты */}
            <button
              onClick={() => setIsSoundboardOpen(true)}
              title="Звуки и фоновые эмбиенты: таверна, подземелье, гроза, эффекты"
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs transition-all duration-200 group cursor-pointer ${
                isAudioPlaying
                  ? 'bg-purple-950/70 border border-purple-500/60 text-purple-200 shadow-[0_0_12px_rgba(168,85,247,0.35)] animate-pulse'
                  : 'text-gray-300 hover:text-white hover:bg-[rgba(255,255,255,0.08)]'
              }`}
            >
              <Volume2 className={`h-3.5 w-3.5 ${isAudioPlaying ? 'text-purple-300' : 'text-purple-400'} group-hover:scale-105 transition-transform`} />
              <span className="hidden xl:inline font-medium">Аудио</span>
              {isAudioPlaying && (
                <span className="flex items-end gap-[2px] h-3 ml-0.5">
                  <span className="w-[3px] bg-purple-400 rounded-full animate-pulse h-2" />
                  <span className="w-[3px] bg-purple-300 rounded-full animate-pulse h-3" style={{ animationDelay: '150ms' }} />
                  <span className="w-[3px] bg-purple-400 rounded-full animate-pulse h-1.5" style={{ animationDelay: '300ms' }} />
                </span>
              )}
            </button>

            {/* Шпаргалка правил D&D 2024 */}
            <button
              onClick={() => setIsRulesModalOpen(true)}
              title="Шпаргалка правил D&D 2024 в один клик (состояния, укрытия, прыжки, среда, отдых)"
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs text-amber-300/90 hover:text-white hover:bg-[rgba(255,255,255,0.08)] transition-all group cursor-pointer"
            >
              <BookOpen className="h-3.5 w-3.5 text-amber-400 group-hover:scale-105 transition-transform" />
              <span className="hidden xl:inline font-medium">Правила</span>
            </button>

            {/* Генератор случайных NPC */}
            <button
              onClick={() => setIsNpcModalOpen(true)}
              title="Оффлайн-генератор случайных NPC «на лету»"
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs text-blue-300/90 hover:text-white hover:bg-[rgba(255,255,255,0.08)] transition-all group cursor-pointer"
            >
              <User className="h-3.5 w-3.5 text-blue-400 group-hover:scale-105 transition-transform" />
              <span className="hidden 2xl:inline font-medium">NPC</span>
            </button>

            {/* Атака толпы / Орда по DMG */}
            <button
              onClick={() => useCombatStore.getState().setMobModalOpen(true)}
              title="Движок атак орд и толп по правилам DMG"
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs text-rose-300/90 hover:text-white hover:bg-[rgba(255,255,255,0.08)] transition-all group cursor-pointer"
            >
              <Users className="h-3.5 w-3.5 text-rose-400 group-hover:scale-105 transition-transform" />
              <span className="hidden 2xl:inline font-medium">Орда</span>
            </button>

            {/* Кузница токенов (Token Forge) */}
            <button
              onClick={() => useTokenForgeStore.getState().openForge()}
              title="Кузница токенов: создание и кадрирование круглых токенов с окантовками и свечением"
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs text-amber-300/90 hover:text-white hover:bg-[rgba(255,255,255,0.08)] transition-all group cursor-pointer"
            >
              <Sparkles className="h-3.5 w-3.5 text-amber-400 group-hover:scale-105 transition-transform" />
              <span className="hidden 2xl:inline font-medium">Кузница</span>
            </button>

            {/* Настройки, Бэкапы и Экспорт кампании */}
            <button
              onClick={openSettingsModal}
              title="Настройки: масштаб UI, экспорт/импорт кампании (.ait-pack), авто-бэкапы"
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs text-gray-300 hover:text-white hover:bg-[rgba(255,255,255,0.08)] transition-all group cursor-pointer"
            >
              <Settings className="h-3.5 w-3.5 text-gray-400 group-hover:rotate-45 transition-transform" />
              <span className="hidden 2xl:inline font-medium">Настройки</span>
            </button>
          </div>

          {/* Экспорт и импорт сессии */}
          <div className="flex items-center rounded-full bg-[rgba(14,18,25,0.7)] p-0.5 border border-[rgba(255,255,255,0.08)] shadow-inner gap-0.5">
            <button
              onClick={handleExportSession}
              title="Сохранить сессию боя в файл (резервная копия)"
              className="p-1.5 rounded-full hover:bg-[rgba(255,255,255,0.08)] text-gray-400 hover:text-emerald-400 transition-colors cursor-pointer"
            >
              <Download className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => sessionFileRef.current?.click()}
              title="Загрузить бой из файла сессии"
              className="p-1.5 rounded-full hover:bg-[rgba(255,255,255,0.08)] text-gray-400 hover:text-blue-400 transition-colors cursor-pointer"
            >
              <Upload className="h-3.5 w-3.5" />
            </button>
            <input
              ref={sessionFileRef}
              type="file"
              accept=".json"
              onChange={handleImportSession}
              className="hidden"
            />
          </div>

          {/* Статус экрана игроков */}
          <button
            onClick={handleOpenPlayerDisplay}
            title={
              isPlayerScreenActive
                ? 'Экран игроков транслируется (кликните, чтобы сфокусировать или переоткрыть окно)'
                : 'Открыть окно для экрана игроков (кликните для запуска)'
            }
            className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 rounded-full border text-xs font-semibold transition-all duration-200 shadow-sm group cursor-pointer flex-shrink-0 whitespace-nowrap ${
              isPlayerScreenActive
                ? 'bg-emerald-950/60 border-emerald-500/70 text-emerald-200 hover:bg-emerald-900/60 shadow-[0_0_14px_rgba(16,185,129,0.3)]'
                : 'bg-[rgba(14,18,25,0.7)] hover:bg-[rgba(24,30,42,0.85)] border-[rgba(255,255,255,0.08)] hover:border-gray-500 text-gray-300 hover:text-white'
            }`}
          >
            <div className="relative flex items-center justify-center flex-shrink-0">
              <Radio className={`h-3.5 w-3.5 ${isPlayerScreenActive ? 'text-emerald-400' : 'text-gray-400 group-hover:text-gray-200'}`} />
              {isPlayerScreenActive && (
                <span className="absolute -top-1 -right-1 flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500 shadow-[0_0_8px_#10b981]" />
                </span>
              )}
            </div>
            <span className="hidden xl:inline font-medium">Экран игроков</span>
            {isPlayerScreenActive ? (
              <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold text-emerald-300">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                В ЭФИРЕ
              </span>
            ) : (
              <span className="hidden sm:inline text-[10px] font-mono text-gray-500">
                ВЫКЛ
              </span>
            )}
          </button>
        </div>
      </header>

      {/* Основная рабочая область в виде независимых островов-панелей с зазорами */}
      {activeTab === 'combat' ? (
        /* Трёхколоночный боевой стол: Остров Бестиария + Остров Ростера + Остров Статблока */
        <div className="flex flex-1 min-h-0 overflow-hidden gap-2.5">
          {/* 1. ЛЕВАЯ КОЛОНКА (Ширина 320-360px): Остров Бестиария */}
          <div className="w-80 xl:w-[340px] 2xl:w-[360px] h-full flex flex-col flex-shrink-0 overflow-hidden rounded-glass-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(18,22,30,0.78)] backdrop-blur-md shadow-[0_12px_32px_-4px_rgba(0,0,0,0.65)]">
            <BestiaryLibrary />
          </div>

          {/* 2. ЦЕНТРАЛЬНАЯ КОЛОНКА (flex-1): Остров Очереди инициативы */}
          <div className="flex-1 h-full flex flex-col min-w-0 overflow-hidden rounded-glass-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(18,22,30,0.78)] backdrop-blur-md shadow-[0_12px_32px_-4px_rgba(0,0,0,0.65)]">
            <CombatRoster />
          </div>

          {/* 3. ПРАВАЯ КОЛОНКА (Ширина 420px): Остров Инспектора характеристик */}
          <div className="w-[420px] h-full flex flex-col flex-shrink-0 overflow-hidden rounded-glass-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(18,22,30,0.78)] backdrop-blur-md shadow-[0_12px_32px_-4px_rgba(0,0,0,0.65)]">
            <StatblockInspector />
          </div>
        </div>
      ) : activeTab === 'map' ? (
        /* ТАКТИЧЕСКАЯ БОЕВАЯ КАРТА */
        <div className="flex flex-1 min-h-0 overflow-hidden rounded-glass-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(18,22,30,0.78)] backdrop-blur-md shadow-[0_12px_32px_-4px_rgba(0,0,0,0.65)]">
          <TacticalBattleMap isMasterView={true} />
        </div>
      ) : activeTab === 'split' ? (
        /* СПЛИТ-РЕЖИМ: Остров ростера слева + Остров тактической карты справа */
        <div className="flex flex-1 min-h-0 overflow-hidden gap-2.5">
          <div className="w-[500px] min-w-[420px] max-w-[50vw] h-full flex flex-col flex-shrink-0 rounded-glass-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(18,22,30,0.78)] backdrop-blur-md shadow-[0_12px_32px_-4px_rgba(0,0,0,0.65)] overflow-hidden">
            <CombatRoster />
          </div>
          <div className="flex-1 min-w-0 h-full overflow-hidden rounded-glass-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(18,22,30,0.78)] backdrop-blur-md shadow-[0_12px_32px_-4px_rgba(0,0,0,0.65)]">
            <TacticalBattleMap isMasterView={true} />
          </div>
        </div>
      ) : (
        /* ВИТРИНА ДИЗАЙН-ТОКЕНОВ */
        <main className="flex-1 overflow-y-auto p-6 space-y-6 max-w-6xl mx-auto w-full min-h-0 rounded-glass-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(18,22,30,0.78)] backdrop-blur-md shadow-glass">
          <div>
            <h1 className="text-xl font-bold text-gray-100 mb-1 flex items-center gap-2">
              <Layers className="h-5 w-5 text-gold" /> Витрина дизайн-токенов: D&D 2024
            </h1>
            <p className="text-xs text-gray-400">
              Тёмный швейцарский стиль, glass-панели с размытием, радиусы 14–20px, 100% автономные локальные шрифты Inter и JetBrains Mono.
            </p>
          </div>

          {/* Palette */}
          <section className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400 border-b border-border-subtle pb-1">
              1. Цветовые токены
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              <div className="p-3 rounded-sm border border-border-subtle bg-canvas space-y-1">
                <div className="h-8 rounded-sm bg-canvas border border-white/20" />
                <div className="text-xs font-semibold">Холст (Фон)</div>
                <div className="font-mono text-[10px] text-gray-400">#090A0D</div>
              </div>

              <div className="p-3 rounded-sm border border-border-subtle bg-surface space-y-1">
                <div className="h-8 rounded-sm bg-surface border border-white/20" />
                <div className="text-xs font-semibold">Поверхность</div>
                <div className="font-mono text-[10px] text-gray-400">#12141A</div>
              </div>

              <div className="p-3 rounded-sm border border-border-subtle bg-card space-y-1">
                <div className="h-8 rounded-sm bg-card border border-white/20" />
                <div className="text-xs font-semibold">Карточка</div>
                <div className="font-mono text-[10px] text-gray-400">#16181F</div>
              </div>

              <div className="p-3 rounded-sm border border-border-subtle bg-card space-y-1">
                <div className="h-8 rounded-sm bg-gold" />
                <div className="text-xs font-semibold text-gold-light">Золото (Акцент)</div>
                <div className="font-mono text-[10px] text-gold">#C5A059</div>
              </div>

              <div className="p-3 rounded-sm border border-border-subtle bg-card space-y-1">
                <div className="h-8 rounded-sm bg-crimson" />
                <div className="text-xs font-semibold text-red-300">Багрянец (Урон)</div>
                <div className="font-mono text-[10px] text-red-400">#8B2626</div>
              </div>

              <div className="p-3 rounded-sm border border-border-subtle bg-card space-y-1">
                <div className="h-8 rounded-sm bg-emerald" />
                <div className="text-xs font-semibold text-emerald-300">Изумруд (Лечение)</div>
                <div className="font-mono text-[10px] text-emerald-400">#10B981</div>
              </div>
            </div>
          </section>

          {/* Weapon Mastery */}
          <section className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400 border-b border-border-subtle pb-1">
              2. Свойства оружия (Мастерство оружия 2024)
            </h2>
            <div className="flex flex-wrap gap-2.5 p-4 rounded-sm border border-border-subtle bg-card">
              <MasteryBadge property="Slow" showFullName />
              <MasteryBadge property="Topple" showFullName />
              <MasteryBadge property="Vex" showFullName />
              <MasteryBadge property="Sap" showFullName />
              <MasteryBadge property="Nick" showFullName />
              <MasteryBadge property="Push" showFullName />
              <MasteryBadge property="Graze" showFullName />
              <MasteryBadge property="Cleave" showFullName />
            </div>
          </section>

          {/* HealthBar Showcase */}
          <section className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400 border-b border-border-subtle pb-1">
              3. Шкала здоровья (HealthBar)
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-5 rounded-sm border border-border-subtle bg-card">
              <div className="space-y-1.5">
                <span className="text-[11px] text-gray-400">Полное здоровье (&gt; 50%):</span>
                <HealthBar current={85} max={100} temp={0} size="md" />
              </div>
              <div className="space-y-1.5">
                <span className="text-[11px] text-gray-400">Ранение + Врем. ХП:</span>
                <HealthBar current={28} max={65} temp={12} size="md" />
              </div>
              <div className="space-y-1.5">
                <span className="text-[11px] text-gray-400">Критический статус (&lt;= 20%):</span>
                <HealthBar current={6} max={50} temp={0} size="md" />
              </div>
            </div>
          </section>
        </main>
      )}

      {/* Окно восстановления сохранённой сессии боя */}
      {hasSavedSessionPrompt &&
        savedSessionData &&
        Array.isArray(savedSessionData.combatants) &&
        savedSessionData.combatants.length > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-glass-xl border border-[#f5b920]/50 bg-[rgba(24,30,42,0.92)] backdrop-blur-xl p-6 shadow-[0_16px_40px_-4px_rgba(0,0,0,0.85)]">
            <div className="flex items-center gap-3 text-[#f5b920] mb-3">
              <AlertTriangle className="h-6 w-6" />
              <h3 className="text-base font-bold text-gray-100">
                Найдена сохранённая сессия боя!
              </h3>
            </div>

            <p className="text-xs text-gray-300 leading-relaxed mb-5">
              Обнаружено автосохранение от предыдущей сессии ({savedSessionData.combatants?.length || 0} бойцов, раунд {savedSessionData.roundCounter || 1}).
              Хотите восстановить состояние боя?
            </p>

            <div className="flex justify-end gap-3">
              <button
                onClick={dismissSavedSession}
                className="min-h-[34px] px-4 py-1.5 rounded-glass border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.04)] hover:bg-[rgba(255,255,255,0.08)] text-xs font-semibold text-gray-300 hover:text-white transition-all cursor-pointer"
              >
                Начать заново
              </button>
              <button
                onClick={restoreSavedSession}
                className="min-h-[34px] px-5 py-1.5 rounded-glass bg-[#f5b920] hover:bg-[#fac742] active:bg-[#e0a312] text-xs font-bold text-[#0c0d12] shadow-[0_0_16px_rgba(245,185,32,0.35)] transition-all cursor-pointer"
              >
                Восстановить бой
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Targeted Attack and AC Math Modal */}
      <TargetedAttackModal />

      {/* Persistent Party Manager Modal */}
      <PartyManagerModal />

      {/* D&D 2024 Character Builder Wizard Modal */}
      <CharacterBuilderModal />

      {/* Interactive D&D Beyond Character Sheet Modal */}
      <CharacterSheetModal />

      {/* Short Rest Automation Modal */}
      <ShortRestModal />

      {/* Offline QR Exchange Modal */}
      <QrCharacterModal />

      {/* Procedural Ambient & SFX Soundboard Drawer */}
      <SoundboardDrawer
        isOpen={isSoundboardOpen}
        onClose={() => setIsSoundboardOpen(false)}
      />

      {/* Loot & Hoard Generator Modal */}
      <LootGeneratorModal isOpen={isLootOpen} onClose={() => setIsLootOpen(false)} />

      {/* Pre-made Encounter Manager Modal */}
      <EncounterManagerModal />

      {/* Global Spotlight Search Modal */}
      <SpotlightSearchModal
        isOpen={isSpotlightOpen}
        onClose={() => setIsSpotlightOpen(false)}
      />

      {/* Handouts & Secrets Broadcaster Modal */}
      <HandoutsModal
        isOpen={isHandoutsOpen}
        onClose={() => setIsHandoutsOpen(false)}
      />

      {/* D&D 5e / 2024 Concentration Check Automation Alert Modal */}
      <ConcentrationAlertModal />

      {/* Floating Quick Dice Roller Bar */}
      <QuickDiceBar />

      {/* Fullscreen 3D Dice Overlay */}
      <Dice3dOverlay />

      {/* Global In-App Visual Toast Notification */}
      <ToastNotification />

      {/* Mob Combat Engine Modal */}
      <MobCombatModal />

      {/* Combat Log Drawer */}
      <CombatLogDrawer />

      {/* Settings, Campaign Pack & Backup Modal */}
      <SettingsModal />

      {/* Instant Offline NPC Generator Modal */}
      <NpcGeneratorModal
        isOpen={isNpcModalOpen}
        onClose={() => setIsNpcModalOpen(false)}
      />

      {/* D&D 2024 Rules Cheat Sheet Modal */}
      <RulesCheatSheetModal
        isOpen={isRulesModalOpen}
        onClose={() => setIsRulesModalOpen(false)}
      />

      {/* Token Forge Modal */}
      <TokenForgeModal />

      {/* Procedural Scene and Dungeon Architect Modal */}
      <ProceduralMapModal />
    </div>
  );
}

export function App() {
  const currentSystemId = useSettingsStore((s) => s.currentSystemId);
  const themeBySystem = useSettingsStore((s) => s.themeBySystem);
  const fallbackTheme = useSettingsStore((s) => s.fallbackTheme);

  const [viewModeOverride] = useState<'desktop' | 'mobile' | null>(() => {
    if (typeof window !== 'undefined') {
      if (window.location.search.includes('view=mobile')) return 'mobile';
      if (window.location.search.includes('view=desktop')) return 'desktop';
    }
    return null;
  });

  const [isMobileScreen, setIsMobileScreen] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth < 768;
    }
    return false;
  });

  useEffect(() => {
    const handleResize = () => {
      setIsMobileScreen(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const effectiveTheme = resolveEffectiveTheme(currentSystemId, themeBySystem, fallbackTheme);
    document.documentElement.setAttribute('data-system', effectiveTheme);
  }, [currentSystemId, themeBySystem, fallbackTheme]);

  const isPlayerView =
    typeof window !== 'undefined' && window.location.search.includes('view=player');

  if (isPlayerView) {
    return <PlayerDisplayView />;
  }

  const isMobileView = viewModeOverride ? viewModeOverride === 'mobile' : isMobileScreen;

  if (isMobileView) {
    return (
      <MobileCompanionView />
    );
  }

  return <MainApp />;
}

export default App;
