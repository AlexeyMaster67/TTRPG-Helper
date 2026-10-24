import React, { useState, useEffect, useRef } from 'react';
import { useSettingsStore, resolveEffectiveTheme } from '../../store/settingsStore';
import { campaignPackService, CampaignPack, CampaignImportSummary } from '../../services/campaignPackService';
import { backupService, BackupEntry } from '../../services/backupService';
import { SystemSelectionPanel } from './SystemSelectionPanel';
import { useTranslation } from '../../i18n';
import { openExternal } from '../../utils/openExternal';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import {
  CURRENT_APP_VERSION,
  fetchLatestRelease,
  isAutoCheckEnabled,
  setAutoCheckEnabled,
  UpdateInfo,
  ignoreVersion,
} from '../../services/updateService';
import { UpdateNotificationModal } from '../common/UpdateNotificationModal';
import {
  X,
  Sliders,
  Download,
  Upload,
  Database,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Package,
  Layers,
  HardDrive,
  FileText,
  Dices,
  Monitor,
  Keyboard,
  Blocks,
  Check,
  Palette,
  Sparkles,
  Globe,
  ExternalLink,
  RefreshCw,
} from 'lucide-react';
import clsx from 'clsx';

export type SettingsTabId = 'system' | 'general' | 'interface' | 'hotkeys' | 'plugins';

export interface SettingsModalProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const { t, language, setLanguage } = useTranslation();
  const {
    uiScale,
    isModalOpen: storeModalOpen,
    currentSystemId,
    themeBySystem,
    fallbackTheme,
    setUiScale,
    resetUiScale,
    setThemeBySystem,
    setFallbackTheme,
    closeModal: storeCloseModal,
  } = useSettingsStore();

  const isModalOpen = isOpen !== undefined ? isOpen : storeModalOpen;
  const closeModal = onClose || storeCloseModal;

  const [activeTab, setActiveTab] = useState<SettingsTabId>('system');

  // General tab states (Campaign Pack & Backups)
  const isRu = language === 'ru';
  const [campaignName, setCampaignName] = useState(language === 'ru' ? 'Кампания D&D' : 'D&D Campaign');
  const [isExporting, setIsExporting] = useState(false);
  const [importPendingPack, setImportPendingPack] = useState<CampaignPack | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState<CampaignImportSummary | null>(null);

  const [backups, setBackups] = useState<BackupEntry[]>([]);
  const [isCreatingBackup, setIsCreatingBackup] = useState(false);
  const [backupStatusMessage, setBackupStatusMessage] = useState<string | null>(null);

  const isOnline = useNetworkStatus();
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);
  const [updateCheckStatus, setUpdateCheckStatus] = useState<'idle' | 'checking' | 'latest' | 'available' | 'error'>('idle');
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [isModalNotificationOpen, setIsModalNotificationOpen] = useState(false);
  const [autoCheck, setAutoCheck] = useState<boolean>(() => isAutoCheckEnabled());

  const handleCheckUpdatesManual = async () => {
    setIsCheckingUpdate(true);
    setUpdateCheckStatus('checking');
    try {
      const res = await fetchLatestRelease({ force: true });
      if (!res.success) {
        setUpdateCheckStatus('error');
      } else if (res.info?.hasUpdate) {
        setUpdateInfo(res.info);
        setUpdateCheckStatus('available');
      } else {
        setUpdateCheckStatus('latest');
      }
    } catch {
      setUpdateCheckStatus('error');
    } finally {
      setIsCheckingUpdate(false);
    }
  };

  const handleToggleAutoCheck = (enabled: boolean) => {
    setAutoCheck(enabled);
    setAutoCheckEnabled(enabled);
  };

  const handleDownloadUpdate = () => {
    if (updateInfo?.downloadUrl) {
      openExternal(updateInfo.downloadUrl);
    }
    setIsModalNotificationOpen(false);
  };

  const handleSkipVersion = () => {
    if (updateInfo?.latestVersion) {
      ignoreVersion(updateInfo.latestVersion);
    }
    setIsModalNotificationOpen(false);
  };

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load backups when modal opens
  useEffect(() => {
    if (isModalOpen) {
      loadBackupsList();
    }
  }, [isModalOpen]);

  const loadBackupsList = async () => {
    try {
      const list = await backupService.listBackups();
      setBackups(list);
    } catch (e) {
      console.warn('Failed to load backup list:', e);
    }
  };

  if (!isModalOpen) return null;

  const handleExportPack = async () => {
    setIsExporting(true);
    try {
      await campaignPackService.downloadCampaignPack(campaignName);
    } catch (e) {
      console.error('Export pack error:', e);
    } finally {
      setIsExporting(false);
    }
  };

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setImportError(null);
    setImportSuccess(null);
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    try {
      const text = await file.text();
      const validation = campaignPackService.validateCampaignPack(text);
      if (!validation.valid || !validation.pack) {
        setImportError(validation.error || (isRu ? 'Неверный формат пакета кампании' : 'Invalid campaign pack format'));
        setImportPendingPack(null);
      } else {
        setImportPendingPack(validation.pack);
      }
    } catch (err) {
      setImportError(isRu ? `Ошибка чтения файла: ${err instanceof Error ? err.message : String(err)}` : `File read error: ${err instanceof Error ? err.message : String(err)}`);
    }
    e.target.value = '';
  };

  const executeImport = async (mode: 'merge' | 'replace') => {
    if (!importPendingPack) return;
    try {
      const summary = await campaignPackService.importCampaignPack(importPendingPack, mode);
      setImportSuccess(summary);
      setImportPendingPack(null);
    } catch (err) {
      setImportError(isRu ? `Ошибка при импорте: ${err instanceof Error ? err.message : String(err)}` : `Import error: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const handleCreateManualBackup = async () => {
    setIsCreatingBackup(true);
    setBackupStatusMessage(null);
    try {
      const res = await backupService.createBackup(true);
      setBackupStatusMessage(isRu ? (res.message || 'Резервная копия успешно создана') : 'Database backup created successfully');
      await loadBackupsList();
    } catch {
      setBackupStatusMessage(isRu ? 'Ошибка создания копии базы данных' : 'Error creating database backup');
    } finally {
      setIsCreatingBackup(false);
    }
  };

  const scalePresets = [80, 90, 100, 110, 125, 150];

  const effectiveTheme = resolveEffectiveTheme(currentSystemId, themeBySystem, fallbackTheme);

  const navItems: { id: SettingsTabId; label: string; icon: React.ReactNode; badge?: string }[] = [
    {
      id: 'general',
      label: isRu ? 'Общие' : 'General',
      icon: <Sliders className="w-4 h-4" />,
    },
    {
      id: 'system',
      label: isRu ? 'Система НРИ' : 'TTRPG System',
      icon: <Dices className="w-4 h-4" />,
    },
    {
      id: 'interface',
      label: isRu ? 'Интерфейс' : 'Interface',
      icon: <Monitor className="w-4 h-4" />,
    },
    {
      id: 'hotkeys',
      label: isRu ? 'Горячие клавиши' : 'Hotkeys',
      icon: <Keyboard className="w-4 h-4" />,
    },
    {
      id: 'plugins',
      label: isRu ? 'Плагины · скоро' : 'Plugins · soon',
      icon: <Blocks className="w-4 h-4" />,
      badge: isRu ? 'скоро' : 'soon',
    },
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={isRu ? 'Параметры и настройки' : 'Settings and preferences'}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-5 select-none animate-in fade-in duration-200"
      onClick={closeModal}
    >
      <div
        className="relative w-full max-w-6xl max-h-[92vh] rounded-[24px] border border-white/[0.08] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.85)] flex flex-col md:flex-row overflow-hidden text-[#ececf1]"
        style={{
          fontFamily: "'Manrope', system-ui, sans-serif",
          background:
            'radial-gradient(900px 500px at 75% -10%, rgba(245,185,32,0.16), transparent 60%), radial-gradient(700px 500px at 0% 100%, rgba(229,72,77,0.12), transparent 60%), #0a0a0d',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ================= LEFT SIDEBAR NAVIGATION ================= */}
        <nav
          aria-label={isRu ? 'Разделы настроек' : 'Settings sections'}
          className="w-full md:w-[230px] md:flex-shrink-0 p-3 md:p-4 bg-white/[0.04] border-b md:border-b-0 md:border-r border-white/[0.08] backdrop-blur-[14px] flex flex-col gap-1.5"
        >
          <div className="flex items-center justify-between px-3 py-2 md:pb-4">
            <span className="font-extrabold text-lg text-white tracking-tight">
              {isRu ? 'Настройки' : 'Settings'}
            </span>
            <button
              type="button"
              onClick={closeModal}
              title={isRu ? 'Закрыть настройки' : 'Close settings'}
              className="md:hidden p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex md:flex-col gap-1 overflow-x-auto md:overflow-x-visible no-scrollbar pb-1 md:pb-0">
            {navItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  aria-current={isActive ? 'page' : undefined}
                  onClick={() => setActiveTab(item.id)}
                  className={clsx(
                    'box-border text-left font-sans cursor-pointer px-3.5 py-2.5 rounded-[12px] text-sm min-h-[44px] transition-all flex items-center justify-between gap-2.5 outline-none whitespace-nowrap shrink-0 md:shrink',
                    isActive
                      ? 'bg-[#f5b920] text-[#0a0a0d] font-bold shadow-[0_0_16px_rgba(245,185,32,0.3)]'
                      : 'text-[#a0a0b0] font-semibold hover:bg-white/[0.06] hover:text-white'
                  )}
                >
                  <div className="flex items-center gap-2.5">
                    <span className={clsx(isActive ? 'text-[#0a0a0d]' : 'text-[#a0a0b0]')}>
                      {item.icon}
                    </span>
                    <span>{item.label}</span>
                  </div>

                  {item.badge && (
                    <span
                      className={clsx(
                        'text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full border',
                        isActive
                          ? 'border-[#0a0a0d]/30 text-[#0a0a0d] bg-black/10'
                          : 'border-white/10 text-gray-400 bg-white/5'
                      )}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Quick System Badge at Bottom of Sidebar */}
          <div className="hidden md:flex flex-col mt-auto pt-4 border-t border-white/[0.08] text-[11px] text-gray-400 px-2 space-y-1">
            <span className="text-[10px] text-gray-500 uppercase tracking-wider font-bold">
              {isRu ? 'Текущая тема:' : 'Current Theme:'}
            </span>
            <div className="flex items-center gap-1.5 text-gray-300 font-mono text-xs">
              <span className="w-2 h-2 rounded-full bg-[#f5b920] shadow-[0_0_8px_rgba(245,185,32,0.5)]" />
              <span className="truncate">{effectiveTheme}</span>
            </div>
          </div>
        </nav>

        {/* ================= MAIN CONTENT AREA ================= */}
        <main
          className="flex-1 max-w-full overflow-y-auto p-5 sm:p-8 bg-white/[0.04] backdrop-blur-[14px] shadow-[0_8px_30px_rgba(0,0,0,0.45)] relative flex flex-col"
          style={{ minHeight: '600px' }}
        >
          {/* Top-right close button for desktop */}
          <div className="hidden md:block absolute top-6 right-6 z-10">
            <button
              type="button"
              onClick={closeModal}
              title={isRu ? 'Закрыть настройки (Esc)' : 'Close settings (Esc)'}
              className="p-2 rounded-[12px] bg-white/[0.05] hover:bg-white/[0.12] border border-white/[0.1] text-gray-300 hover:text-white transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* ================= TAB 1: СИСТЕМА НРИ ================= */}
          {activeTab === 'system' && (
            <SystemSelectionPanel
              onSave={() => {
                // Keep modal open or show save feedback
              }}
              onCancel={closeModal}
              showFooter={true}
            />
          )}

          {/* ================= TAB 2: ОБЩИЕ ================= */}
          {activeTab === 'general' && (
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl sm:text-[28px] font-extrabold tracking-tight text-white m-0">
                  {isRu ? 'Общие настройки' : 'General Settings'}
                </h1>
                <p className="mt-2 text-sm text-[#a0a0b0] leading-relaxed max-w-2xl m-0">
                  {isRu
                    ? 'Масштаб интерфейса, язык, портативные пакеты кампаний и резервные копии базы данных.'
                    : 'Language preferences, UI scaling, campaign packs and database backups.'}
                </p>
              </div>

              {/* Language Selection */}
              <section className="p-5 rounded-[16px] bg-white/[0.04] border border-white/[0.08] space-y-3.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4 text-[#f5b920]" />
                    <h3 className="text-sm font-bold text-white m-0">
                      {isRu ? 'Язык интерфейса / Language' : 'Language / Язык интерфейса'}
                    </h3>
                  </div>
                  <span className="font-mono text-xs font-bold text-[#fce79f] px-2.5 py-0.5 rounded-full bg-[#f5b920]/15 border border-[#f5b920]/40">
                    {isRu ? 'Русский (D&D 2024)' : 'English (SRD 5.2.1)'}
                  </span>
                </div>

                <p className="text-xs text-[#a0a0b0] leading-relaxed m-0">
                  {isRu
                    ? 'Выберите предпочитаемый язык. Английский язык является международным стандартом по умолчанию и строго следует SRD 5.2.1 и официальным книгам правил.'
                    : 'Choose your preferred language. English is the default international standard adhering strictly to SRD 5.2.1 and official rulebooks.'}
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => setLanguage('en')}
                    className={clsx(
                      'p-3.5 rounded-[12px] border text-left transition-all cursor-pointer flex items-center justify-between gap-3',
                      language === 'en'
                        ? 'bg-[#f5b920]/15 border-[#f5b920] shadow-[0_0_16px_rgba(245,185,32,0.25)]'
                        : 'bg-[#121620] border-white/[0.08] hover:border-white/20 hover:bg-[#18202c]'
                    )}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-white">English</span>
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">DEFAULT</span>
                      </div>
                      <div className="text-xs text-gray-400 mt-1">
                        {isRu ? 'Официальный SRD 5.2.1 и западный релиз' : 'Official SRD 5.2.1 & Western Release'}
                      </div>
                    </div>
                    {language === 'en' && <Check className="w-5 h-5 text-[#f5b920] flex-shrink-0" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => setLanguage('ru')}
                    className={clsx(
                      'p-3.5 rounded-[12px] border text-left transition-all cursor-pointer flex items-center justify-between gap-3',
                      language === 'ru'
                        ? 'bg-[#f5b920]/15 border-[#f5b920] shadow-[0_0_16px_rgba(245,185,32,0.25)]'
                        : 'bg-[#121620] border-white/[0.08] hover:border-white/20 hover:bg-[#18202c]'
                    )}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-white">Русский</span>
                      </div>
                      <div className="text-xs text-gray-400 mt-1">
                        {isRu ? 'Полный перевод правил и бестиария' : 'Full translation of rules and bestiary'}
                      </div>
                    </div>
                    {language === 'ru' && <Check className="w-5 h-5 text-[#f5b920] flex-shrink-0" />}
                  </button>
                </div>
              </section>

              {/* UI Scaling */}
              <section className="p-5 rounded-[16px] bg-white/[0.04] border border-white/[0.08] space-y-3.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-[#f5b920]" />
                    <h3 className="text-sm font-bold text-white m-0">
                      {isRu ? 'Масштабирование всего интерфейса (UI Scale)' : 'Interface Scaling (UI Scale)'}
                    </h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-bold text-[#fce79f] px-2.5 py-0.5 rounded-full bg-[#f5b920]/15 border border-[#f5b920]/40">
                      {uiScale}%
                    </span>
                    {uiScale !== 100 && (
                      <button
                        type="button"
                        onClick={resetUiScale}
                        title={isRu ? 'Сбросить масштаб на 100%' : 'Reset scale to 100%'}
                        className="p-1 rounded text-gray-400 hover:text-white hover:bg-white/10 transition-colors text-xs flex items-center gap-1 cursor-pointer"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span className="text-[11px]">100%</span>
                      </button>
                    )}
                  </div>
                </div>

                <p className="text-xs text-[#a0a0b0] leading-relaxed m-0">
                  {isRu
                    ? 'Мгновенно масштабирует боевой трекер, тактическую карту, шрифты и панели под ваш экран — комфортно как на ноутбуке (80–90%), так и на 2K/4K мониторах (125–150%).'
                    : 'Instantly scales the combat tracker, tactical battlemap, fonts, and panels for your display — comfortable on laptops (80–90%) and 2K/4K displays (125–150%).'}
                </p>

                <div className="space-y-2 pt-1">
                  <input
                    type="range"
                    min="80"
                    max="150"
                    step="1"
                    value={uiScale}
                    aria-label={isRu ? 'Масштаб интерфейса' : 'UI Scale'}
                    onChange={(e) => setUiScale(Number(e.target.value))}
                    className="w-full h-2 bg-[#121620] rounded-lg appearance-none cursor-pointer accent-[#f5b920]"
                  />
                  <div className="flex justify-between text-[10px] font-mono text-gray-500">
                    <span>{isRu ? '80% (Компактный)' : '80% (Compact)'}</span>
                    <span>{isRu ? '100% (Стандарт)' : '100% (Standard)'}</span>
                    <span>{isRu ? '150% (Крупный)' : '150% (Large)'}</span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-[11px] text-[#a0a0b0] font-medium mr-1">
                    {isRu ? 'Быстрый выбор:' : 'Presets:'}
                  </span>
                  {scalePresets.map((scale) => (
                    <button
                      key={scale}
                      type="button"
                      onClick={() => setUiScale(scale)}
                      className={clsx(
                        'px-2.5 py-1 rounded-[8px] text-xs font-mono font-medium transition-all cursor-pointer min-h-[32px]',
                        uiScale === scale
                          ? 'bg-[#f5b920] text-black font-bold shadow-[0_0_10px_rgba(245,185,32,0.3)]'
                          : 'bg-[#18202c] text-gray-300 hover:text-white hover:bg-[#222b3b] border border-white/[0.06]'
                      )}
                    >
                      {scale}%
                    </button>
                  ))}
                </div>
              </section>

              {/* Campaign Pack */}
              <section className="p-5 rounded-[16px] bg-white/[0.04] border border-white/[0.08] space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Package className="w-4 h-4 text-emerald-400" />
                    <h3 className="text-sm font-bold text-white m-0">
                      {isRu ? 'Единый пакет кампании (.ait-pack)' : 'Unified Campaign Pack (.ait-pack)'}
                    </h3>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-950/80 text-emerald-300 border border-emerald-700/60">
                    {isRu ? 'Полный перенос' : 'Full Transfer'}
                  </span>
                </div>

                <p className="text-xs text-[#a0a0b0] leading-relaxed m-0">
                  {isRu
                    ? 'Упаковывает героев отряда, кастомных монстров из бестиария, бои и метки карты в единый архив.'
                    : 'Packs party heroes, custom bestiary monsters, encounters, and map pins into a single archive.'}
                </p>

                {importError && (
                  <div className="p-3 rounded-[12px] bg-rose-950/70 border border-rose-600/60 flex items-start gap-2.5 text-xs text-rose-200">
                    <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <span className="font-bold">{isRu ? 'Ошибка: ' : 'Error: '}</span>
                      {importError}
                    </div>
                    <button
                      type="button"
                      onClick={() => setImportError(null)}
                      title={isRu ? 'Скрыть ошибку' : 'Dismiss error'}
                      className="text-rose-400 hover:text-white text-xs font-bold p-0.5 flex items-center justify-center cursor-pointer"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}

                {importSuccess && (
                  <div className="p-3 rounded-[12px] bg-emerald-950/70 border border-emerald-600/60 flex items-start gap-2.5 text-xs text-emerald-200">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <div className="font-bold mb-0.5">
                        {isRu ? 'Импорт успешно завершён!' : 'Import completed successfully!'}
                      </div>
                      <p className="text-gray-300 m-0">{importSuccess.message}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setImportSuccess(null)}
                      title={isRu ? 'Скрыть уведомление' : 'Dismiss notice'}
                      className="text-emerald-400 hover:text-white text-xs font-bold p-0.5 flex items-center justify-center cursor-pointer"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}

                {importPendingPack && (
                  <div className="p-4 rounded-[14px] bg-[#121620] border border-emerald-500/50 shadow-lg space-y-3">
                    <div className="flex items-center justify-between border-b border-white/10 pb-2">
                      <div className="flex items-center gap-2 text-emerald-300 font-bold text-xs">
                        <FileText className="w-4 h-4" />
                        <span>{isRu ? `Файл: «${importPendingPack.metadata.campaignName}»` : `File: "${importPendingPack.metadata.campaignName}"`}</span>
                      </div>
                      <span className="text-[10px] font-mono text-gray-400">
                        v{importPendingPack.metadata.version}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                      <div className="p-2 rounded bg-white/5 border border-white/5">
                        <span className="text-gray-400 block text-[10px]">{isRu ? 'Героев:' : 'Heroes:'}</span>
                        <span className="font-bold text-white text-sm">
                          {importPendingPack.metadata.counts.partyMembers}
                        </span>
                      </div>
                      <div className="p-2 rounded bg-white/5 border border-white/5">
                        <span className="text-gray-400 block text-[10px]">{isRu ? 'Монстров:' : 'Monsters:'}</span>
                        <span className="font-bold text-white text-sm">
                          {importPendingPack.metadata.counts.customMonsters}
                        </span>
                      </div>
                      <div className="p-2 rounded bg-white/5 border border-white/5">
                        <span className="text-gray-400 block text-[10px]">{isRu ? 'Боёв:' : 'Encounters:'}</span>
                        <span className="font-bold text-white text-sm">
                          {importPendingPack.metadata.counts.encounters}
                        </span>
                      </div>
                      <div className="p-2 rounded bg-white/5 border border-white/5">
                        <span className="text-gray-400 block text-[10px]">{isRu ? 'Меток:' : 'Pins:'}</span>
                        <span className="font-bold text-white text-sm">
                          {importPendingPack.metadata.counts.pins}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => executeImport('merge')}
                        className="flex-1 min-w-[140px] py-2 px-3 rounded-[10px] bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer min-h-[36px]"
                      >
                        <Layers className="w-3.5 h-3.5" />
                        <span>{isRu ? 'Объединить' : 'Merge'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => executeImport('replace')}
                        className="flex-1 min-w-[140px] py-2 px-3 rounded-[10px] bg-rose-700 hover:bg-rose-600 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer min-h-[36px]"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>{isRu ? 'Заменить полностью' : 'Replace All'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setImportPendingPack(null)}
                        className="py-2 px-3 rounded-[10px] bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-medium cursor-pointer min-h-[36px]"
                      >
                        {isRu ? 'Отмена' : 'Cancel'}
                      </button>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div className="p-3.5 rounded-[12px] bg-white/[0.02] border border-white/5 space-y-2.5">
                    <span className="text-xs font-bold text-gray-200 block">
                      {isRu ? 'Экспорт кампании:' : 'Export Campaign:'}
                    </span>
                    <input
                      type="text"
                      value={campaignName}
                      onChange={(e) => setCampaignName(e.target.value)}
                      placeholder={isRu ? 'Название кампании...' : 'Campaign name...'}
                      className="w-full px-3 py-2 rounded-[8px] bg-[#10141d] border border-white/10 text-xs text-white focus:outline-none focus:border-[#f5b920] min-h-[36px]"
                    />
                    <button
                      type="button"
                      onClick={handleExportPack}
                      disabled={isExporting}
                      className="w-full py-2 px-3 rounded-[10px] bg-[#f5b920] hover:bg-[#fac742] text-black font-bold text-xs shadow-[0_0_12px_rgba(245,185,32,0.25)] transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 min-h-[36px]"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>{isExporting ? (isRu ? 'Сохранение...' : 'Saving...') : (isRu ? 'Скачать пакет (.ait-pack)' : 'Download Pack (.ait-pack)')}</span>
                    </button>
                  </div>

                  <div className="p-3.5 rounded-[12px] bg-white/[0.02] border border-white/5 flex flex-col justify-between space-y-2.5">
                    <div>
                      <span className="text-xs font-bold text-gray-200 block mb-1">
                        {isRu ? 'Импорт кампании:' : 'Import Campaign:'}
                      </span>
                      <p className="text-[11px] text-[#a0a0b0] m-0">
                        {isRu
                          ? 'Загрузить файл .ait-pack или .json с другого компьютера.'
                          : 'Load a .ait-pack or .json file from another computer.'}
                      </p>
                    </div>

                    <div>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".ait-pack,.json"
                        onChange={handleFileSelected}
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full py-2 px-3 rounded-[10px] bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 hover:border-[#f5b920]/50 text-white font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer min-h-[36px]"
                      >
                        <Upload className="w-3.5 h-3.5 text-[#f5b920]" />
                        <span>{isRu ? 'Выбрать файл кампании...' : 'Choose Campaign File...'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              </section>

              {/* Database Auto-Backup */}
              <section className="p-5 rounded-[16px] bg-white/[0.04] border border-white/[0.08] space-y-3.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Database className="w-4 h-4 text-blue-400" />
                    <h3 className="text-sm font-bold text-white m-0">
                      {isRu ? 'Резервные копии базы данных (SQLite)' : 'Database Backups (SQLite)'}
                    </h3>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-950/80 text-blue-300 border border-blue-700/60">
                    {isRu ? 'Ротация 7 копий' : '7-day rotation'}
                  </span>
                </div>

                <p className="text-xs text-[#a0a0b0] leading-relaxed m-0">
                  {isRu
                    ? 'Автоматическое создание копий при запуске приложения в подпапке backups.'
                    : 'Automatic backup creation upon application startup in the backups directory.'}
                </p>

                {backupStatusMessage && (
                  <div className="p-2.5 rounded-[10px] bg-blue-950/60 border border-blue-600/50 text-xs text-blue-200 flex items-center justify-between">
                    <span>{backupStatusMessage}</span>
                    <button
                      type="button"
                      onClick={() => setBackupStatusMessage(null)}
                      title={isRu ? 'Скрыть сообщение' : 'Dismiss message'}
                      className="text-blue-400 hover:text-white text-xs font-bold ml-2 cursor-pointer p-0.5 flex items-center justify-center"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}

                <div className="flex items-center justify-between pt-1">
                  <div className="text-xs text-gray-300">
                    {isRu ? 'Копий на диске:' : 'Backups on disk:'}{' '}
                    <span className="font-mono font-bold text-white">{backups.length}</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleCreateManualBackup}
                    disabled={isCreatingBackup}
                    className="py-1.5 px-3 rounded-[10px] bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 min-h-[36px]"
                  >
                    <HardDrive className="w-3.5 h-3.5" />
                    <span>{isCreatingBackup ? (isRu ? 'Создание...' : 'Creating...') : (isRu ? 'Создать копию сейчас' : 'Create Backup Now')}</span>
                  </button>
                </div>

                {backups.length > 0 && (
                  <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                    {backups.map((b) => (
                      <div
                        key={b.path}
                        className="px-3 py-1.5 rounded-[8px] bg-[#10141d]/70 border border-white/5 flex items-center justify-between text-xs font-mono"
                      >
                        <div className="flex items-center gap-2 truncate pr-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                          <span className="text-gray-200 truncate">{b.name}</span>
                        </div>
                        <div className="flex items-center gap-3 text-gray-400 shrink-0 text-[11px]">
                          <span>{(b.size_bytes / (1024 * 1024)).toFixed(2)} {isRu ? 'МБ' : 'MB'}</span>
                          <span>{new Date(b.modified_ms).toLocaleDateString(isRu ? 'ru-RU' : 'en-US')}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              {/* Official Discord Community */}
              <section className="p-5 rounded-[16px] bg-gradient-to-r from-[#5865F2]/15 via-white/[0.04] to-[#5865F2]/15 border border-[#5865F2]/30 space-y-3.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-[#5865F2]" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.894.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
                    </svg>
                    <h3 className="text-sm font-bold text-white m-0">
                      {isRu ? 'Официальное Discord сообщество' : 'Official Discord Community'}
                    </h3>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#5865F2]/20 text-[#a3b1fa] border border-[#5865F2]/40">
                    {isRu ? 'Онлайн-сообщество' : 'Online Community'}
                  </span>
                </div>

                <p className="text-xs text-[#a0a0b0] leading-relaxed m-0">
                  {isRu
                    ? 'Присоединяйтесь к нашему сообществу: хоумбрю-пакеты, обсуждения, обновления, обратная связь и помощь.'
                    : 'Join our tabletop community for homebrew packs, updates, discussion, feedback, and technical support.'}
                </p>

                <div className="pt-1">
                  <button
                    type="button"
                    disabled={!isOnline}
                    onClick={() => {
                      if (!isOnline) return;
                      openExternal('https://discord.gg/MGnjS3ceEh');
                    }}
                    title={
                      !isOnline
                        ? (isRu ? 'Требуется подключение к интернету' : 'Internet connection required')
                        : (isRu ? 'Перейти в наш Дискорд' : 'Open Discord Channel')
                    }
                    className={clsx(
                      "inline-flex items-center gap-2 px-4 py-2 rounded-[10px] text-white font-bold text-xs transition-all shadow-md",
                      isOnline
                        ? "bg-[#5865F2] hover:bg-[#4752C4] cursor-pointer"
                        : "bg-[#5865F2] opacity-50 cursor-not-allowed"
                    )}
                  >
                    <span>{isRu ? 'Перейти в наш Дискорд' : 'Open Discord Channel'}</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                </div>
              </section>

              {/* Updates Section */}
              <section className="p-5 rounded-[16px] bg-white/[0.04] border border-white/[0.08] space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <RefreshCw className={clsx("w-4 h-4 text-[#f5b920]", isCheckingUpdate && "animate-spin")} />
                    <h3 className="text-sm font-bold text-white m-0">
                      {isRu ? 'Обновления программы' : 'Application Updates'}
                    </h3>
                  </div>
                  <span className="font-mono text-xs font-bold text-emerald-400 px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30">
                    v{CURRENT_APP_VERSION}
                  </span>
                </div>

                <p className="text-xs text-[#a0a0b0] leading-relaxed m-0">
                  {isRu
                    ? 'Проверка наличия новых версий TTRPG Helper через официальный репозиторий GitHub. Все локальные базы данных и данные сохраняются.'
                    : 'Check for new TTRPG Helper versions via the official GitHub repository. All local databases and content are preserved.'}
                </p>

                {/* Auto-check switch */}
                <div className="flex items-center justify-between py-2 border-t border-b border-white/[0.06]">
                  <div className="space-y-0.5">
                    <div className="text-xs font-semibold text-gray-200">
                      {t('updates.autoCheckLabel')}
                    </div>
                    <div className="text-[11px] text-gray-400">
                      {isRu ? 'Проверка выполняется 1 раз в 4 часа при наличии подключения к интернету' : 'Checks once every 4 hours when connected to the internet'}
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={autoCheck}
                      onChange={(e) => handleToggleAutoCheck(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-[#1b2230] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
                  </label>
                </div>

                {/* Actions and Status */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-1">
                  <button
                    type="button"
                    disabled={isCheckingUpdate || !isOnline}
                    onClick={handleCheckUpdatesManual}
                    title={!isOnline ? (isRu ? 'Требуется подключение к интернету' : 'Internet connection required') : undefined}
                    className={clsx(
                      "inline-flex items-center gap-2 px-4 py-2 rounded-[10px] text-xs font-bold transition-all shadow-md",
                      !isOnline
                        ? "bg-white/10 text-gray-400 opacity-50 cursor-not-allowed"
                        : isCheckingUpdate
                        ? "bg-[#1b2230] text-gray-400 cursor-wait"
                        : "bg-[#f5b920] hover:bg-[#d9a21b] text-black cursor-pointer"
                    )}
                  >
                    <RefreshCw className={clsx("w-3.5 h-3.5", isCheckingUpdate && "animate-spin")} />
                    <span>
                      {isCheckingUpdate ? t('updates.statusChecking') : t('updates.btnCheckManual')}
                    </span>
                  </button>

                  {/* Status display */}
                  {updateCheckStatus === 'latest' && (
                    <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400">
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      <span>{t('updates.statusLatest')}</span>
                    </div>
                  )}

                  {updateCheckStatus === 'available' && updateInfo && (
                    <div className="flex items-center gap-2 text-xs">
                      <span className="font-semibold text-amber-400">
                        {t('updates.statusNewAvailable', { version: updateInfo.latestVersion })}
                      </span>
                      <button
                        type="button"
                        onClick={() => setIsModalNotificationOpen(true)}
                        className="px-2.5 py-1 rounded-md bg-amber-500 hover:bg-amber-400 text-black font-bold text-[11px] transition-colors cursor-pointer"
                      >
                        {isRu ? 'Подробнее' : 'Details'}
                      </button>
                    </div>
                  )}

                  {updateCheckStatus === 'error' && (
                    <div className="flex items-center gap-2 text-xs font-semibold text-rose-400">
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      <span>{t('updates.statusServerError')}</span>
                    </div>
                  )}
                </div>
              </section>
            </div>
          )}

          {/* ================= TAB 3: ИНТЕРФЕЙС ================= */}
          {activeTab === 'interface' && (
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl sm:text-[28px] font-extrabold tracking-tight text-white m-0">
                  {isRu ? 'Интерфейс и оформление' : 'Interface & Appearance'}
                </h1>
                <p className="mt-2 text-sm text-[#a0a0b0] leading-relaxed max-w-2xl m-0">
                  {isRu
                    ? 'Настройки динамических визуальных тем оформления, адаптации шрифтов и контрастности.'
                    : 'Settings for dynamic visual themes, font adaptation, and contrast.'}
                </p>
              </div>

              {/* Theme switching preferences */}
              <section className="p-5 rounded-[16px] bg-white/[0.04] border border-white/[0.08] space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Palette className="w-4 h-4 text-[#f5b920]" />
                    <h3 className="text-sm font-bold text-white m-0">
                      {isRu ? 'Автоматическая тема по системе НРИ' : 'Automatic theme based on game system'}
                    </h3>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={themeBySystem}
                      aria-label={isRu ? 'Автоматическая тема по системе НРИ' : 'Automatic theme based on game system'}
                      onChange={(e) => {
                        const val = e.target.checked;
                        setThemeBySystem(val);
                        const nextTheme = resolveEffectiveTheme(currentSystemId, val, fallbackTheme);
                        if (typeof document !== 'undefined') {
                          document.documentElement.setAttribute('data-system', nextTheme);
                        }
                      }}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#f5b920]" />
                  </label>
                </div>

                <p className="text-xs text-[#a0a0b0] leading-relaxed m-0">
                  {isRu
                    ? 'При включении тема оформления автоматически переключается между Warm Fantasy (D&D 5e), Neon Cyber (Cyberpunk RED) и Stately Slate (Pathfinder 2e) в зависимости от выбранных правил кампании.'
                    : 'When enabled, the visual theme automatically switches between Warm Fantasy (D&D 5e), Neon Cyber (Cyberpunk RED), and Stately Slate (Pathfinder 2e) depending on the active campaign rules.'}
                </p>

                {/* Theme Selector */}
                <div className="pt-2 border-t border-white/[0.06] space-y-2">
                  <label className="text-xs font-semibold text-gray-300 block">
                    {themeBySystem
                      ? (isRu ? 'Запасная тема (если система не задана):' : 'Fallback theme (if no system selected):')
                      : (isRu ? 'Фиксированная тема:' : 'Fixed theme:')}
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {[
                      { id: 'dnd5e', name: isRu ? 'D&D 5e (Золотое фэнтези)' : 'D&D 5e (Warm Gold)', color: '#f5b920' },
                      { id: 'cyberpunk-red', name: isRu ? 'Cyberpunk RED (Неоновый кибер)' : 'Cyberpunk RED (Neon Cyber)', color: '#fcee0a' },
                      { id: 'pathfinder2e', name: isRu ? 'Pathfinder 2e (Благородный сланец)' : 'Pathfinder 2e (Stately Slate)', color: '#c28f47' },
                    ].map((th) => {
                      const isSelected = (!themeBySystem && effectiveTheme === th.id) || (themeBySystem && fallbackTheme === th.id);
                      return (
                        <button
                          key={th.id}
                          type="button"
                          onClick={() => {
                            setFallbackTheme(th.id);
                            if (!themeBySystem && typeof document !== 'undefined') {
                              document.documentElement.setAttribute('data-system', th.id);
                            }
                          }}
                          className={clsx(
                            'p-3 rounded-[12px] text-left border flex items-center justify-between gap-2 transition-all cursor-pointer min-h-[44px]',
                            isSelected
                              ? 'border-[#f5b920] bg-[#f5b920]/10 shadow-[0_0_12px_rgba(245,185,32,0.2)]'
                              : 'border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.06]'
                          )}
                        >
                          <div className="flex items-center gap-2">
                            <span
                              className="w-3 h-3 rounded-full shrink-0"
                              style={{ backgroundColor: th.color }}
                            />
                            <span className="text-xs font-bold text-white">{th.name}</span>
                          </div>
                          {isSelected && <Check className="w-4 h-4 text-[#f5b920] shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </section>
            </div>
          )}

          {/* ================= TAB 4: ГОРЯЧИЕ КЛАВИШИ ================= */}
          {activeTab === 'hotkeys' && (
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl sm:text-[28px] font-extrabold tracking-tight text-white m-0">
                  {isRu ? 'Горячие клавиши' : 'Hotkeys'}
                </h1>
                <p className="mt-2 text-sm text-[#a0a0b0] leading-relaxed max-w-2xl m-0">
                  {isRu
                    ? 'Быстрое управление инициативой, ходами и бросками без отрыва от клавиатуры.'
                    : 'Quickly manage initiative, turns, and rolls without leaving your keyboard.'}
                </p>
              </div>

              <section className="p-5 rounded-[16px] bg-white/[0.04] border border-white/[0.08] space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-[12px] bg-white/[0.02] border border-white/5 flex items-center justify-between">
                    <span className="text-gray-300">
                      {isRu ? 'Следующий ход в трекере инициативы' : 'Next turn in initiative tracker'}
                    </span>
                    <kbd className="px-2 py-1 rounded bg-[#10141d] border border-white/20 font-mono font-bold text-[#fce79f]">
                      {isRu ? 'Пробел (Space)' : 'Space'}
                    </kbd>
                  </div>

                  <div className="p-3 rounded-[12px] bg-white/[0.02] border border-white/5 flex items-center justify-between">
                    <span className="text-gray-300">
                      {isRu ? 'Глобальный поиск (Spotlight Search)' : 'Global search (Spotlight)'}
                    </span>
                    <kbd className="px-2 py-1 rounded bg-[#10141d] border border-white/20 font-mono font-bold text-[#fce79f]">
                      Ctrl + K
                    </kbd>
                  </div>

                  <div className="p-3 rounded-[12px] bg-white/[0.02] border border-white/5 flex items-center justify-between">
                    <span className="text-gray-300">
                      {isRu ? 'Отмена последнего боевого действия' : 'Undo last combat action'}
                    </span>
                    <kbd className="px-2 py-1 rounded bg-[#10141d] border border-white/20 font-mono font-bold text-[#fce79f]">
                      Ctrl + Z
                    </kbd>
                  </div>

                  <div className="p-3 rounded-[12px] bg-white/[0.02] border border-white/5 flex items-center justify-between">
                    <span className="text-gray-300">
                      {isRu ? 'Повтор отменённого действия (Redo)' : 'Redo last action'}
                    </span>
                    <kbd className="px-2 py-1 rounded bg-[#10141d] border border-white/20 font-mono font-bold text-[#fce79f]">
                      Ctrl + Y
                    </kbd>
                  </div>

                  <div className="p-3 rounded-[12px] bg-white/[0.02] border border-white/5 flex items-center justify-between sm:col-span-2">
                    <span className="text-gray-300">
                      {isRu ? 'Цифровой блок Numpad для быстрых действий урона / бросков' : 'Numpad numeric keys for quick damage / dice rolls'}
                    </span>
                    <div className="flex gap-1">
                      <kbd className="px-1.5 py-1 rounded bg-[#10141d] border border-white/20 font-mono font-bold text-[#fce79f]">
                        Num 1-9
                      </kbd>
                    </div>
                  </div>
                </div>
              </section>
            </div>
          )}

          {/* ================= TAB 5: ПЛАГИНЫ · СКОРО ================= */}
          {activeTab === 'plugins' && (
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl sm:text-[28px] font-extrabold tracking-tight text-white m-0">
                  {isRu ? 'Плагины и расширения' : 'Plugins & Extensions'}
                </h1>
                <p className="mt-2 text-sm text-[#a0a0b0] leading-relaxed max-w-2xl m-0">
                  {isRu
                    ? 'Модульная экосистема для подключения кастомных систем, скриптов автоматизации и конвертеров.'
                    : 'Modular ecosystem for custom game systems, automation scripts, and converters.'}
                </p>
              </div>

              <section className="p-8 rounded-[16px] bg-white/[0.04] border border-white/[0.08] text-center space-y-4">
                <div className="w-12 h-12 rounded-full bg-[#f5b920]/15 border border-[#f5b920]/30 text-[#f5b920] mx-auto flex items-center justify-center">
                  <Sparkles className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white m-0">
                    {isRu ? 'Поддержка плагинов в разработке' : 'Plugin support under development'}
                  </h3>
                  <p className="text-xs text-[#a0a0b0] max-w-md mx-auto mt-2 leading-relaxed">
                    {isRu
                      ? 'Скоро появится возможность подключать собственные модули правил, пакеты правил Foundry VTT, пользовательские таблицы лута и кастомные темы интерфейса.'
                      : 'Coming soon: connect custom rulesets, Foundry VTT rule packages, custom loot tables, and UI themes.'}
                  </p>
                </div>
                <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-white/5 text-gray-400 border border-white/10">
                  {isRu ? 'Запланировано в версии 2.1' : 'Planned for version 2.1'}
                </span>
              </section>
            </div>
          )}
        </main>
      </div>

      {/* Program Update Notification Modal */}
      <UpdateNotificationModal
        isOpen={isModalNotificationOpen}
        updateInfo={updateInfo}
        onClose={() => setIsModalNotificationOpen(false)}
        onDownload={handleDownloadUpdate}
        onSkipVersion={handleSkipVersion}
      />
    </div>
  );
}
