import { useState, useEffect, useRef } from 'react';
import { useCombatStore } from './store/combatStore';
import { useSpaceHotkey } from './hooks/useSpaceHotkey';
import { BestiaryLibrary, CombatRoster, StatblockInspector, ConcentrationAlertModal } from './components/tracker';
import { QuickDiceBar } from './components/dice/QuickDiceBar';
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
import { SoundboardDrawer } from './components/audio/SoundboardDrawer';
import { SpotlightSearchModal } from './components/search/SpotlightSearchModal';
import { HandoutsModal } from './components/handouts/HandoutsModal';
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
import { MasterToolsDropdown } from './components/navigation/MasterToolsDropdown';
import { runAppDataMigration } from './services/appMigrationService';
import { runSaveMigration } from './services/saveMigrationService';
import { importCharacterFromTtrpgh } from './services/ttrpghFormat';
import { useTranslation } from './i18n';
import { openExternal } from './utils/openExternal';
import { WBWorkspace } from './components/worldbuilding';
import { useNetworkStatus } from './hooks/useNetworkStatus';
import {
  UpdateInfo,
  fetchLatestRelease,
  isAutoCheckEnabled,
  isVersionIgnored,
  ignoreVersion,
} from './services/updateService';
import { UpdateNotificationModal } from './components/common/UpdateNotificationModal';
import clsx from 'clsx';

function DiscordIcon({ className = "h-3.5 w-3.5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.894.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
    </svg>
  );
}

// Early synchronization of system theme attribute before first paint
if (typeof document !== 'undefined') {
  const initialTheme = useSettingsStore.getState().getEffectiveTheme();
  document.documentElement.setAttribute('data-system', initialTheme);
}
import {
  Sword,
  Layers,
  Map,
  Radio,
  Users,
  Layout,
  Search,
  Settings,
  AlertTriangle,
  Globe,
  BookOpen,
} from 'lucide-react';

function MainApp() {
  const { t, language, toggleLanguage } = useTranslation();
  // Global Space hotkey listener with strict input isolation
  useSpaceHotkey();
  // Global Numpad and Undo/Redo keyboard controls
  useCombatNumpadHotkeys();

  const { uiScale, openModal: openSettingsModal } = useSettingsStore();
  const [isNpcModalOpen, setIsNpcModalOpen] = useState(false);
  const [isRulesModalOpen, setIsRulesModalOpen] = useState(false);

  const isOnline = useNetworkStatus();
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);

  // Background check for updates with 3.5s delay
  useEffect(() => {
    if (!isAutoCheckEnabled() || !isOnline) return;

    const timer = setTimeout(async () => {
      try {
        const result = await fetchLatestRelease({ force: false });
        if (result.success && result.info?.hasUpdate) {
          if (!isVersionIgnored(result.info.latestVersion)) {
            setUpdateInfo(result.info);
            setIsUpdateModalOpen(true);
          }
        }
      } catch {
        // Silent exit
      }
    }, 3500);

    return () => clearTimeout(timer);
  }, [isOnline]);

  const handleDownloadUpdate = () => {
    if (updateInfo?.downloadUrl) {
      openExternal(updateInfo.downloadUrl);
    }
    setIsUpdateModalOpen(false);
  };

  const handleSkipUpdateVersion = () => {
    if (updateInfo?.latestVersion) {
      ignoreVersion(updateInfo.latestVersion);
    }
    setIsUpdateModalOpen(false);
  };

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

  // Navigation tab: 'combat' | 'map' | 'split' | 'worldbuilding' | 'tokens'
  const [activeTab, setActiveTab] = useState<'combat' | 'map' | 'split' | 'worldbuilding' | 'tokens'>('combat');
  const [isLootOpen, setIsLootOpen] = useState(false);
  const [isSoundboardOpen, setIsSoundboardOpen] = useState(false);
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
                .showToast(
                  language === 'en'
                    ? `Character "${member.name}" successfully added to party from .ttrpgh!`
                    : `Персонаж "${member.name}" успешно добавлен в отряд из .ttrpgh!`
                );
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
      {/* Верхняя панель: Плавающий стеклянный остров управления (min-h-14, rounded-glass-xl) */}
      <header className="min-h-[52px] h-auto py-1.5 sm:py-0 sm:h-14 bg-[rgba(18,22,30,0.78)] backdrop-blur-md border border-[rgba(255,255,255,0.08)] rounded-glass-xl px-2.5 sm:px-3 lg:px-4 flex items-center justify-between flex-wrap gap-y-2 gap-x-1.5 sm:gap-x-2 flex-shrink-0 z-30 shadow-[0_12px_32px_-4px_rgba(0,0,0,0.65)] select-none">
        {/* ЛЕВАЯ ЧАСТЬ: Логотип + Название + Золотой бейдж + Переключатель режимов */}
        <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0 min-w-0">
          <BrandLogo />

          <div className="h-5 w-px bg-[rgba(255,255,255,0.08)] hidden md:block" />

          {/* Переключатель режимов (Pill-табы) */}
          <nav
            role="tablist"
            aria-label={language === 'en' ? 'Interface Modes' : 'Режимы интерфейса'}
            className="flex items-center p-1 rounded-full bg-[rgba(14,18,25,0.7)] border border-[rgba(255,255,255,0.08)] shadow-inner gap-0.5 sm:gap-1"
          >
            <button
              onClick={() => setActiveTab('combat')}
              role="tab"
              aria-selected={activeTab === 'combat'}
              title={t('header.combat')}
              aria-label={t('header.combat')}
              className={`relative flex items-center gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full text-xs font-medium transition-all duration-200 cursor-pointer ${
                activeTab === 'combat'
                  ? 'bg-[#1e2634] text-white font-semibold border border-[#f5b920]/60 shadow-[0_0_14px_rgba(245,185,32,0.25)]'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-[rgba(255,255,255,0.05)] border border-transparent'
              }`}
            >
              <Sword className={`h-3.5 w-3.5 ${activeTab === 'combat' ? 'text-[#f5b920]' : 'text-gray-400'}`} />
              <span className="hidden sm:inline">{t('header.combat')}</span>
              {activeTab === 'combat' && (
                <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-3 h-0.5 bg-[#f5b920] rounded-full shadow-[0_0_6px_#f5b920]" />
              )}
            </button>

            <button
              onClick={() => setActiveTab('map')}
              role="tab"
              aria-selected={activeTab === 'map'}
              title={t('header.map')}
              aria-label={t('header.map')}
              className={`relative flex items-center gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full text-xs font-medium transition-all duration-200 cursor-pointer ${
                activeTab === 'map'
                  ? 'bg-[#1e2634] text-white font-semibold border border-[#f5b920]/60 shadow-[0_0_14px_rgba(245,185,32,0.25)]'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-[rgba(255,255,255,0.05)] border border-transparent'
              }`}
            >
              <Map className={`h-3.5 w-3.5 ${activeTab === 'map' ? 'text-blue-400' : 'text-gray-400'}`} />
              <span className="hidden sm:inline">{t('header.map')}</span>
              {activeTab === 'map' && (
                <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-3 h-0.5 bg-[#f5b920] rounded-full shadow-[0_0_6px_#f5b920]" />
              )}
            </button>

            <button
              onClick={() => setActiveTab('split')}
              role="tab"
              aria-selected={activeTab === 'split'}
              title={t('header.splitDescription')}
              aria-label={t('header.split')}
              className={`relative flex items-center gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full text-xs font-medium transition-all duration-200 cursor-pointer ${
                activeTab === 'split'
                  ? 'bg-[#1e2634] text-white font-semibold border border-[#f5b920]/60 shadow-[0_0_14px_rgba(245,185,32,0.25)]'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-[rgba(255,255,255,0.05)] border border-transparent'
              }`}
            >
              <Layout className={`h-3.5 w-3.5 ${activeTab === 'split' ? 'text-amber-400' : 'text-gray-400'}`} />
              <span className="hidden sm:inline">{t('header.split')}</span>
              {activeTab === 'split' && (
                <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-3 h-0.5 bg-[#f5b920] rounded-full shadow-[0_0_6px_#f5b920]" />
              )}
            </button>

            <button
              onClick={() => setActiveTab('worldbuilding')}
              role="tab"
              aria-selected={activeTab === 'worldbuilding'}
              title={t('header.worldbuilding')}
              aria-label={t('header.worldbuilding')}
              className={`relative flex items-center gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full text-xs font-medium transition-all duration-200 cursor-pointer ${
                activeTab === 'worldbuilding'
                  ? 'bg-[#1e2634] text-white font-semibold border border-[#f5b920]/60 shadow-[0_0_14px_rgba(245,185,32,0.25)]'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-[rgba(255,255,255,0.05)] border border-transparent'
              }`}
            >
              <BookOpen className={`h-3.5 w-3.5 ${activeTab === 'worldbuilding' ? 'text-amber-400' : 'text-gray-400'}`} />
              <span className="hidden sm:inline">{t('header.worldbuilding')}</span>
              {activeTab === 'worldbuilding' && (
                <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-3 h-0.5 bg-[#f5b920] rounded-full shadow-[0_0_6px_#f5b920]" />
              )}
            </button>
          </nav>
        </div>

        {/* ЦЕНТР: Стеклянная строка глобального поиска (видима на экранах >= xl) */}
        <div className="hidden xl:flex flex-1 max-w-[240px] 2xl:max-w-[280px] min-w-[80px] mx-1 sm:mx-2 shrink">
          <button
            type="button"
            onClick={() => setIsSpotlightOpen(true)}
            title={t('header.searchPlaceholder')}
            aria-label={t('header.searchPlaceholder')}
            className="w-full flex items-center justify-between px-3 py-1.5 rounded-glass bg-[rgba(14,18,25,0.7)] hover:bg-[rgba(24,30,42,0.85)] border border-[rgba(255,255,255,0.08)] hover:border-[#f5b920]/50 text-xs text-gray-300 transition-all duration-200 group shadow-inner cursor-pointer hover:shadow-[0_0_16px_rgba(245,185,32,0.2)]"
          >
            <div className="flex items-center gap-2 min-w-0 pr-2">
              <Search className="h-3.5 w-3.5 text-[#f5b920] shrink-0 group-hover:scale-110 transition-transform duration-200" />
              <span className="truncate text-gray-400 group-hover:text-gray-200 font-normal select-none">
                {t('header.searchPlaceholder')}
              </span>
            </div>
            <kbd className="flex items-center gap-0.5 px-2 py-0.5 rounded-md bg-black/40 border border-[rgba(255,255,255,0.12)] font-mono text-[10px] text-gray-400 group-hover:text-gold-light group-hover:border-[#f5b920]/40 shadow-sm shrink-0">
              Ctrl+K
            </kbd>
          </button>
        </div>

        {/* ПРАВАЯ ЧАСТЬ: Набор инструментов мастера, смена языка и статус */}
        <div className="flex items-center gap-1 sm:gap-1.5 2xl:gap-2 flex-shrink-0 flex-wrap sm:flex-nowrap">
          {/* Компактная кнопка поиска для экранов < xl */}
          <button
            type="button"
            onClick={() => setIsSpotlightOpen(true)}
            title={t('header.searchPlaceholder')}
            aria-label={t('header.searchPlaceholder')}
            className="flex xl:hidden items-center justify-center h-8 w-8 rounded-full text-gray-300 hover:text-white bg-[rgba(14,18,25,0.7)] hover:bg-[rgba(24,30,42,0.85)] border border-[rgba(255,255,255,0.08)] hover:border-[#f5b920]/50 transition-all cursor-pointer shadow-sm"
          >
            <Search className="h-3.5 w-3.5 text-[#f5b920]" />
          </button>

          {/* Отряд героев */}
          <button
            onClick={openPartyModal}
            title={t('header.party')}
            aria-label={t('header.party')}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-full text-xs text-gray-200 hover:text-white bg-[rgba(14,18,25,0.7)] hover:bg-[rgba(24,30,42,0.85)] border border-[rgba(255,255,255,0.08)] hover:border-emerald-500/50 transition-all cursor-pointer shadow-sm"
          >
            <Users className="h-3.5 w-3.5 text-emerald-400" />
            <span className="font-medium hidden md:inline">{t('header.party')}</span>
            {partyMembers.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-emerald-950/80 text-emerald-300 font-mono text-[10px] border border-emerald-600/50 shadow-sm">
                {partyMembers.length}
              </span>
            )}
          </button>

          {/* Единое меню инструментов мастера */}
          <MasterToolsDropdown
            onOpenLoot={() => setIsLootOpen(true)}
            onOpenHandouts={() => setIsHandoutsOpen(true)}
            onOpenEncounters={openEncounterModal}
            onOpenSoundboard={() => setIsSoundboardOpen(true)}
            onOpenTokenForge={() => useTokenForgeStore.getState().openForge()}
            onOpenProceduralMap={() => useMapStore.getState().openProceduralModal()}
            onOpenNpcGenerator={() => setIsNpcModalOpen(true)}
            onOpenRules={() => setIsRulesModalOpen(true)}
            onExportSession={handleExportSession}
            onImportSession={() => sessionFileRef.current?.click()}
          />
          <input
            ref={sessionFileRef}
            type="file"
            accept=".json"
            onChange={handleImportSession}
            className="hidden"
          />

          {/* Кнопка Discord сообщества */}
          <button
            type="button"
            disabled={!isOnline}
            onClick={() => {
              if (!isOnline) return;
              openExternal('https://discord.gg/MGnjS3ceEh');
            }}
            title={
              !isOnline
                ? (language === 'en' ? 'Internet connection required' : 'Требуется подключение к интернету')
                : (language === 'en' ? 'Join Discord Community' : 'Присоединиться к Discord сообществу')
            }
            aria-label={
              !isOnline
                ? (language === 'en' ? 'Internet connection required' : 'Требуется подключение к интернету')
                : (language === 'en' ? 'Join Discord Community' : 'Присоединиться к Discord сообществу')
            }
            className={clsx(
              "flex items-center gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-full text-xs font-semibold border transition-all shadow-sm group select-none",
              isOnline
                ? "bg-[#5865F2]/15 hover:bg-[#5865F2]/30 border-[#5865F2]/40 hover:border-[#5865F2] text-[#93a1f8] hover:text-white cursor-pointer"
                : "bg-[#5865F2]/15 border-[#5865F2]/40 text-[#93a1f8] opacity-50 cursor-not-allowed"
            )}
          >
            <DiscordIcon className="h-3.5 w-3.5 text-[#7988f5] group-hover:scale-110 group-hover:text-white transition-all" />
            <span className="hidden 2xl:inline font-bold">Discord</span>
          </button>

          {/* Переключатель языка ENG/RU */}
          <button
            onClick={toggleLanguage}
            type="button"
            title={language === 'en' ? 'Switch to Russian' : 'Переключить на английский'}
            aria-label={language === 'en' ? 'Switch to Russian' : 'Переключить на английский'}
            className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-full text-xs font-semibold bg-[rgba(14,18,25,0.7)] hover:bg-[rgba(24,30,42,0.85)] border border-[rgba(255,255,255,0.08)] hover:border-[#f5b920]/50 transition-all cursor-pointer shadow-sm group select-none"
          >
            <Globe className="h-3.5 w-3.5 text-[#f5b920] group-hover:scale-110 transition-transform" />
            <span className={language === 'en' ? 'text-[#f5b920] font-bold' : 'text-gray-400'}>EN</span>
            <span className="text-gray-600 font-mono text-[10px]">/</span>
            <span className={language === 'ru' ? 'text-[#f5b920] font-bold' : 'text-gray-400'}>RU</span>
          </button>

          {/* Настройки */}
          <button
            onClick={openSettingsModal}
            title={t('header.settings')}
            aria-label={t('header.settings')}
            className="flex items-center justify-center h-8 w-8 rounded-full text-gray-300 hover:text-white bg-[rgba(14,18,25,0.7)] hover:bg-[rgba(24,30,42,0.85)] border border-[rgba(255,255,255,0.08)] hover:border-gold/50 transition-all cursor-pointer shadow-sm"
          >
            <Settings className="h-3.5 w-3.5 text-gray-400 hover:text-gold transition-colors" />
          </button>

          {/* Статус экрана игроков */}
          <button
            onClick={handleOpenPlayerDisplay}
            title={
              isPlayerScreenActive
                ? t('header.playerDisplay') + ' (' + t('header.broadcasting') + ')'
                : t('header.playerDisplay') + ' (' + t('header.off') + ')'
            }
            aria-label={t('header.playerDisplay')}
            className={`flex items-center gap-1.5 sm:gap-2 px-2 sm:px-2.5 py-1.5 rounded-full border text-xs font-semibold transition-all duration-200 shadow-sm group cursor-pointer flex-shrink-0 whitespace-nowrap ${
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
            <span className="hidden 2xl:inline font-medium">{t('header.playerDisplay')}</span>
            {isPlayerScreenActive ? (
              <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold text-emerald-300">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                {t('header.broadcasting')}
              </span>
            ) : (
              <span className="hidden sm:inline text-[10px] font-mono text-gray-500">
                {t('header.off')}
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
      ) : activeTab === 'worldbuilding' ? (
        /* WORLDBUILDING (WBmd) */
        <div className="flex flex-1 min-h-0 overflow-hidden rounded-glass-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(18,22,30,0.78)] backdrop-blur-md shadow-[0_12px_32px_-4px_rgba(0,0,0,0.65)]">
          <WBWorkspace />
        </div>
      ) : (
        /* ВИТРИНА ДИЗАЙН-ТОКЕНОВ */
        <main className="flex-1 overflow-y-auto p-6 space-y-6 max-w-6xl mx-auto w-full min-h-0 rounded-glass-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(18,22,30,0.78)] backdrop-blur-md shadow-glass">
          <div>
            <h1 className="text-xl font-bold text-gray-100 mb-1 flex items-center gap-2">
              <Layers className="h-5 w-5 text-gold" />{' '}
              {language === 'en' ? 'Design Tokens Showcase: D&D 2024' : 'Витрина дизайн-токенов: D&D 2024'}
            </h1>
            <p className="text-xs text-gray-400">
              {language === 'en'
                ? 'Dark Swiss style, blurred glass panels, 14–20px radiuses, 100% offline local Inter and JetBrains Mono fonts.'
                : 'Тёмный швейцарский стиль, glass-панели с размытием, радиусы 14–20px, 100% автономные локальные шрифты Inter и JetBrains Mono.'}
            </p>
          </div>

          {/* Palette */}
          <section className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400 border-b border-border-subtle pb-1">
              {language === 'en' ? '1. Color Tokens' : '1. Цветовые токены'}
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              <div className="p-3 rounded-sm border border-border-subtle bg-canvas space-y-1">
                <div className="h-8 rounded-sm bg-canvas border border-white/20" />
                <div className="text-xs font-semibold">{language === 'en' ? 'Canvas (Background)' : 'Холст (Фон)'}</div>
                <div className="font-mono text-[10px] text-gray-400">#090A0D</div>
              </div>

              <div className="p-3 rounded-sm border border-border-subtle bg-surface space-y-1">
                <div className="h-8 rounded-sm bg-surface border border-white/20" />
                <div className="text-xs font-semibold">{language === 'en' ? 'Surface' : 'Поверхность'}</div>
                <div className="font-mono text-[10px] text-gray-400">#12141A</div>
              </div>

              <div className="p-3 rounded-sm border border-border-subtle bg-card space-y-1">
                <div className="h-8 rounded-sm bg-card border border-white/20" />
                <div className="text-xs font-semibold">{language === 'en' ? 'Card' : 'Карточка'}</div>
                <div className="font-mono text-[10px] text-gray-400">#16181F</div>
              </div>

              <div className="p-3 rounded-sm border border-border-subtle bg-card space-y-1">
                <div className="h-8 rounded-sm bg-gold" />
                <div className="text-xs font-semibold text-gold-light">{language === 'en' ? 'Gold (Accent)' : 'Золото (Акцент)'}</div>
                <div className="font-mono text-[10px] text-gold">#C5A059</div>
              </div>

              <div className="p-3 rounded-sm border border-border-subtle bg-card space-y-1">
                <div className="h-8 rounded-sm bg-crimson" />
                <div className="text-xs font-semibold text-red-300">{language === 'en' ? 'Crimson (Damage)' : 'Багрянец (Урон)'}</div>
                <div className="font-mono text-[10px] text-red-400">#8B2626</div>
              </div>

              <div className="p-3 rounded-sm border border-border-subtle bg-card space-y-1">
                <div className="h-8 rounded-sm bg-emerald" />
                <div className="text-xs font-semibold text-emerald-300">{language === 'en' ? 'Emerald (Heal)' : 'Изумруд (Лечение)'}</div>
                <div className="font-mono text-[10px] text-emerald-400">#10B981</div>
              </div>
            </div>
          </section>

          {/* Weapon Mastery */}
          <section className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400 border-b border-border-subtle pb-1">
              {language === 'en' ? '2. Weapon Mastery (D&D 2024)' : '2. Свойства оружия (Мастерство оружия 2024)'}
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
              {language === 'en' ? '3. Health Bar (HealthBar)' : '3. Шкала здоровья (HealthBar)'}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-5 rounded-sm border border-border-subtle bg-card">
              <div className="space-y-1.5">
                <span className="text-[11px] text-gray-400">{language === 'en' ? 'Full Health (> 50%):' : 'Полное здоровье (> 50%):'}</span>
                <HealthBar current={85} max={100} temp={0} size="md" />
              </div>
              <div className="space-y-1.5">
                <span className="text-[11px] text-gray-400">{language === 'en' ? 'Bloodied + Temp HP:' : 'Ранение + Врем. ХП:'}</span>
                <HealthBar current={28} max={65} temp={12} size="md" />
              </div>
              <div className="space-y-1.5">
                <span className="text-[11px] text-gray-400">{language === 'en' ? 'Critical Health (<= 20%):' : 'Критический статус (<= 20%):'}</span>
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
                {language === 'en' ? 'Saved Combat Session Found!' : 'Найдена сохранённая сессия боя!'}
              </h3>
            </div>

            <p className="text-xs text-gray-300 leading-relaxed mb-5">
              {language === 'en'
                ? `Auto-save found from a previous session (${savedSessionData.combatants?.length || 0} combatants, round ${savedSessionData.roundCounter || 1}). Would you like to restore combat state?`
                : `Обнаружено автосохранение от предыдущей сессии (${savedSessionData.combatants?.length || 0} бойцов, раунд ${savedSessionData.roundCounter || 1}). Хотите восстановить состояние боя?`}
            </p>

            <div className="flex justify-end gap-3">
              <button
                onClick={dismissSavedSession}
                className="min-h-[34px] px-4 py-1.5 rounded-glass border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.04)] hover:bg-[rgba(255,255,255,0.08)] text-xs font-semibold text-gray-300 hover:text-white transition-all cursor-pointer"
              >
                {language === 'en' ? 'Start Fresh' : 'Начать заново'}
              </button>
              <button
                onClick={restoreSavedSession}
                className="min-h-[34px] px-5 py-1.5 rounded-glass bg-[#f5b920] hover:bg-[#fac742] active:bg-[#e0a312] text-xs font-bold text-[#0c0d12] shadow-[0_0_16px_rgba(245,185,32,0.35)] transition-all cursor-pointer"
              >
                {language === 'en' ? 'Restore Combat' : 'Восстановить бой'}
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

      {/* Floating Quick Dice Roller Bar with 2D Animated Dice */}
      <QuickDiceBar />

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

      {/* Program Update Notification Modal */}
      <UpdateNotificationModal
        isOpen={isUpdateModalOpen}
        updateInfo={updateInfo}
        onClose={() => setIsUpdateModalOpen(false)}
        onDownload={handleDownloadUpdate}
        onSkipVersion={handleSkipUpdateVersion}
      />
    </div>
  );
}

export function App() {
  const currentSystemId = useSettingsStore((s) => s.currentSystemId);
  const themeBySystem = useSettingsStore((s) => s.themeBySystem);
  const fallbackTheme = useSettingsStore((s) => s.fallbackTheme);

  useEffect(() => {
    const effectiveTheme = resolveEffectiveTheme(currentSystemId, themeBySystem, fallbackTheme);
    document.documentElement.setAttribute('data-system', effectiveTheme);
  }, [currentSystemId, themeBySystem, fallbackTheme]);

  const isPlayerView =
    typeof window !== 'undefined' && window.location.search.includes('view=player');

  if (isPlayerView) {
    return <PlayerDisplayView />;
  }

  // Desktop DM Cockpit application
  return <MainApp />;
}

export default App;
