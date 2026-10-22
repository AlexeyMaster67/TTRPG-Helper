import React, { useState, useEffect, useRef } from 'react';
import { useSettingsStore, resolveEffectiveTheme } from '../../store/settingsStore';
import { campaignPackService, CampaignPack, CampaignImportSummary } from '../../services/campaignPackService';
import { backupService, BackupEntry } from '../../services/backupService';
import { SystemSelectionPanel } from './SystemSelectionPanel';
import { useTranslation } from '../../i18n';
import { openExternal } from '../../utils/openExternal';
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
} from 'lucide-react';
import clsx from 'clsx';

export type SettingsTabId = 'system' | 'general' | 'interface' | 'hotkeys' | 'plugins';

export interface SettingsModalProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const { language, setLanguage } = useTranslation();
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
  const isEn = language === 'en';
  const [campaignName, setCampaignName] = useState(language === 'en' ? 'D&D Campaign' : 'Кампания D&D');
  const [isExporting, setIsExporting] = useState(false);
  const [importPendingPack, setImportPendingPack] = useState<CampaignPack | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState<CampaignImportSummary | null>(null);

  const [backups, setBackups] = useState<BackupEntry[]>([]);
  const [isCreatingBackup, setIsCreatingBackup] = useState(false);
  const [backupStatusMessage, setBackupStatusMessage] = useState<string | null>(null);

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
        setImportError(validation.error || (isEn ? 'Invalid campaign pack format' : 'Неверный формат пакета кампании'));
        setImportPendingPack(null);
      } else {
        setImportPendingPack(validation.pack);
      }
    } catch (err) {
      setImportError(isEn ? `File read error: ${err instanceof Error ? err.message : String(err)}` : `Ошибка чтения файла: ${err instanceof Error ? err.message : String(err)}`);
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
      setImportError(isEn ? `Import error: ${err instanceof Error ? err.message : String(err)}` : `Ошибка при импорте: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const handleCreateManualBackup = async () => {
    setIsCreatingBackup(true);
    setBackupStatusMessage(null);
    try {
      const res = await backupService.createBackup(true);
      setBackupStatusMessage(res.message);
      await loadBackupsList();
    } catch {
      setBackupStatusMessage(isEn ? 'Error creating database backup' : 'Ошибка создания копии базы данных');
    } finally {
      setIsCreatingBackup(false);
    }
  };

  const scalePresets = [80, 90, 100, 110, 125, 150];

  const effectiveTheme = resolveEffectiveTheme(currentSystemId, themeBySystem, fallbackTheme);

  const navItems: { id: SettingsTabId; label: string; icon: React.ReactNode; badge?: string }[] = [
    {
      id: 'general',
      label: language === 'en' ? 'General' : 'Общие',
      icon: <Sliders className="w-4 h-4" />,
    },
    {
      id: 'system',
      label: language === 'en' ? 'TTRPG System' : 'Система НРИ',
      icon: <Dices className="w-4 h-4" />,
    },
    {
      id: 'interface',
      label: language === 'en' ? 'Interface' : 'Интерфейс',
      icon: <Monitor className="w-4 h-4" />,
    },
    {
      id: 'hotkeys',
      label: language === 'en' ? 'Hotkeys' : 'Горячие клавиши',
      icon: <Keyboard className="w-4 h-4" />,
    },
    {
      id: 'plugins',
      label: language === 'en' ? 'Plugins · soon' : 'Плагины · скоро',
      icon: <Blocks className="w-4 h-4" />,
      badge: language === 'en' ? 'soon' : 'скоро',
    },
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Параметры и настройки"
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
          aria-label="Разделы настроек"
          className="w-full md:w-[230px] md:flex-shrink-0 p-3 md:p-4 bg-white/[0.04] border-b md:border-b-0 md:border-r border-white/[0.08] backdrop-blur-[14px] flex flex-col gap-1.5"
        >
          <div className="flex items-center justify-between px-3 py-2 md:pb-4">
            <span className="font-extrabold text-lg text-white tracking-tight">
              {language === 'en' ? 'Settings' : 'Настройки'}
            </span>
            <button
              type="button"
              onClick={closeModal}
              title="Закрыть настройки"
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
              {language === 'en' ? 'Current Theme:' : 'Текущая тема:'}
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
              title="Закрыть настройки (Esc)"
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
                  {language === 'en' ? 'General Settings' : 'Общие настройки'}
                </h1>
                <p className="mt-2 text-sm text-[#a0a0b0] leading-relaxed max-w-2xl m-0">
                  {language === 'en'
                    ? 'Language preferences, UI scaling, campaign packs and database backups.'
                    : 'Масштаб интерфейса, язык, портативные пакеты кампаний и резервные копии базы данных.'}
                </p>
              </div>

              {/* Language Selection */}
              <section className="p-5 rounded-[16px] bg-white/[0.04] border border-white/[0.08] space-y-3.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4 text-[#f5b920]" />
                    <h3 className="text-sm font-bold text-white m-0">
                      {language === 'en' ? 'Language / Язык интерфейса' : 'Язык интерфейса / Language'}
                    </h3>
                  </div>
                  <span className="font-mono text-xs font-bold text-[#fce79f] px-2.5 py-0.5 rounded-full bg-[#f5b920]/15 border border-[#f5b920]/40">
                    {language === 'en' ? 'English (SRD 5.2.1)' : 'Русский (D&D 2024)'}
                  </span>
                </div>

                <p className="text-xs text-[#a0a0b0] leading-relaxed m-0">
                  {language === 'en'
                    ? 'Choose your preferred language. English is the default international standard adhering strictly to SRD 5.2.1 and official rulebooks.'
                    : 'Выберите предпочитаемый язык. Английский язык является международным стандартом по умолчанию и строго следует SRD 5.2.1 и официальным книгам правил.'}
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
                      <div className="text-xs text-gray-400 mt-1">Official SRD 5.2.1 & Western Release</div>
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
                      <div className="text-xs text-gray-400 mt-1">Полный официальный перевод правил и бестиария</div>
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
                      Масштабирование всего интерфейса (UI Scale)
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
                        title="Сбросить масштаб на 100%"
                        className="p-1 rounded text-gray-400 hover:text-white hover:bg-white/10 transition-colors text-xs flex items-center gap-1 cursor-pointer"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span className="text-[11px]">100%</span>
                      </button>
                    )}
                  </div>
                </div>

                <p className="text-xs text-[#a0a0b0] leading-relaxed m-0">
                  Мгновенно масштабирует боевой трекер, тактическую карту, шрифты и панели под ваш экран — комфортно как на ноутбуке (80–90%), так и на 2K/4K мониторах (125–150%).
                </p>

                <div className="space-y-2 pt-1">
                  <input
                    type="range"
                    min="80"
                    max="150"
                    step="1"
                    value={uiScale}
                    onChange={(e) => setUiScale(Number(e.target.value))}
                    className="w-full h-2 bg-[#121620] rounded-lg appearance-none cursor-pointer accent-[#f5b920]"
                  />
                  <div className="flex justify-between text-[10px] font-mono text-gray-500">
                    <span>80% (Компактный)</span>
                    <span>100% (Стандарт)</span>
                    <span>150% (Крупный)</span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-[11px] text-[#a0a0b0] font-medium mr-1">Быстрый выбор:</span>
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
                      Единый пакет кампании (.ait-pack)
                    </h3>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-950/80 text-emerald-300 border border-emerald-700/60">
                    Полный перенос
                  </span>
                </div>

                <p className="text-xs text-[#a0a0b0] leading-relaxed m-0">
                  Упаковывает героев отряда, кастомных монстров из бестиария, бои и метки карты в единый архив.
                </p>

                {importError && (
                  <div className="p-3 rounded-[12px] bg-rose-950/70 border border-rose-600/60 flex items-start gap-2.5 text-xs text-rose-200">
                    <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <span className="font-bold">Ошибка: </span>
                      {importError}
                    </div>
                    <button
                      type="button"
                      onClick={() => setImportError(null)}
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
                      <div className="font-bold mb-0.5">Импорт успешно завершён!</div>
                      <p className="text-gray-300 m-0">{importSuccess.message}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setImportSuccess(null)}
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
                        <span>Файл: «{importPendingPack.metadata.campaignName}»</span>
                      </div>
                      <span className="text-[10px] font-mono text-gray-400">
                        v{importPendingPack.metadata.version}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                      <div className="p-2 rounded bg-white/5 border border-white/5">
                        <span className="text-gray-400 block text-[10px]">Героев:</span>
                        <span className="font-bold text-white text-sm">
                          {importPendingPack.metadata.counts.partyMembers}
                        </span>
                      </div>
                      <div className="p-2 rounded bg-white/5 border border-white/5">
                        <span className="text-gray-400 block text-[10px]">Монстров:</span>
                        <span className="font-bold text-white text-sm">
                          {importPendingPack.metadata.counts.customMonsters}
                        </span>
                      </div>
                      <div className="p-2 rounded bg-white/5 border border-white/5">
                        <span className="text-gray-400 block text-[10px]">Боёв:</span>
                        <span className="font-bold text-white text-sm">
                          {importPendingPack.metadata.counts.encounters}
                        </span>
                      </div>
                      <div className="p-2 rounded bg-white/5 border border-white/5">
                        <span className="text-gray-400 block text-[10px]">Меток:</span>
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
                        <span>Объединить</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => executeImport('replace')}
                        className="flex-1 min-w-[140px] py-2 px-3 rounded-[10px] bg-rose-700 hover:bg-rose-600 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer min-h-[36px]"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Заменить полностью</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setImportPendingPack(null)}
                        className="py-2 px-3 rounded-[10px] bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-medium cursor-pointer min-h-[36px]"
                      >
                        Отмена
                      </button>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div className="p-3.5 rounded-[12px] bg-white/[0.02] border border-white/5 space-y-2.5">
                    <span className="text-xs font-bold text-gray-200 block">Экспорт кампании:</span>
                    <input
                      type="text"
                      value={campaignName}
                      onChange={(e) => setCampaignName(e.target.value)}
                      placeholder="Название кампании..."
                      className="w-full px-3 py-2 rounded-[8px] bg-[#10141d] border border-white/10 text-xs text-white focus:outline-none focus:border-[#f5b920] min-h-[36px]"
                    />
                    <button
                      type="button"
                      onClick={handleExportPack}
                      disabled={isExporting}
                      className="w-full py-2 px-3 rounded-[10px] bg-[#f5b920] hover:bg-[#fac742] text-black font-bold text-xs shadow-[0_0_12px_rgba(245,185,32,0.25)] transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 min-h-[36px]"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>{isExporting ? 'Сохранение...' : 'Скачать пакет (.ait-pack)'}</span>
                    </button>
                  </div>

                  <div className="p-3.5 rounded-[12px] bg-white/[0.02] border border-white/5 flex flex-col justify-between space-y-2.5">
                    <div>
                      <span className="text-xs font-bold text-gray-200 block mb-1">Импорт кампании:</span>
                      <p className="text-[11px] text-[#a0a0b0] m-0">
                        Загрузить файл .ait-pack или .json с другого компьютера.
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
                        <span>Выбрать файл кампании...</span>
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
                      Резервные копии базы данных (SQLite)
                    </h3>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-950/80 text-blue-300 border border-blue-700/60">
                    Ротация 7 копий
                  </span>
                </div>

                <p className="text-xs text-[#a0a0b0] leading-relaxed m-0">
                  Автоматическое создание копий при запуске приложения в подпапке backups.
                </p>

                {backupStatusMessage && (
                  <div className="p-2.5 rounded-[10px] bg-blue-950/60 border border-blue-600/50 text-xs text-blue-200 flex items-center justify-between">
                    <span>{backupStatusMessage}</span>
                    <button
                      type="button"
                      onClick={() => setBackupStatusMessage(null)}
                      className="text-blue-400 hover:text-white text-xs font-bold ml-2 cursor-pointer p-0.5 flex items-center justify-center"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}

                <div className="flex items-center justify-between pt-1">
                  <div className="text-xs text-gray-300">
                    Копий на диске:{' '}
                    <span className="font-mono font-bold text-white">{backups.length}</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleCreateManualBackup}
                    disabled={isCreatingBackup}
                    className="py-1.5 px-3 rounded-[10px] bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 min-h-[36px]"
                  >
                    <HardDrive className="w-3.5 h-3.5" />
                    <span>{isCreatingBackup ? 'Создание...' : 'Создать копию сейчас'}</span>
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
                          <span>{(b.size_bytes / (1024 * 1024)).toFixed(2)} МБ</span>
                          <span>{new Date(b.modified_ms).toLocaleDateString('ru-RU')}</span>
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
                      {language === 'en' ? 'Official Discord Community' : 'Официальное Discord сообщество'}
                    </h3>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#5865F2]/20 text-[#a3b1fa] border border-[#5865F2]/40">
                    Online Community
                  </span>
                </div>

                <p className="text-xs text-[#a0a0b0] leading-relaxed m-0">
                  {language === 'en'
                    ? 'Join our tabletop community for homebrew packs, updates, discussion, feedback, and technical support.'
                    : 'Присоединяйтесь к нашему сообществу: хоумбрю-пакеты, обсуждения, обновления, обратная связь и помощь.'}
                </p>

                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => openExternal('https://discord.com/invite/XYQSHWVAuE')}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-[10px] bg-[#5865F2] hover:bg-[#4752C4] text-white font-bold text-xs transition-all shadow-md cursor-pointer"
                  >
                    <span>{language === 'en' ? 'Open Discord Channel' : 'Перейти в наш Дискорд'}</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                </div>
              </section>
            </div>
          )}

          {/* ================= TAB 3: ИНТЕРФЕЙС ================= */}
          {activeTab === 'interface' && (
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl sm:text-[28px] font-extrabold tracking-tight text-white m-0">
                  Интерфейс и оформление
                </h1>
                <p className="mt-2 text-sm text-[#a0a0b0] leading-relaxed max-w-2xl m-0">
                  Настройки динамических визуальных тем оформления, адаптации шрифтов и контрастности.
                </p>
              </div>

              {/* Theme switching preferences */}
              <section className="p-5 rounded-[16px] bg-white/[0.04] border border-white/[0.08] space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Palette className="w-4 h-4 text-[#f5b920]" />
                    <h3 className="text-sm font-bold text-white m-0">
                      Автоматическая тема по системе НРИ
                    </h3>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={themeBySystem}
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
                  При включении тема оформления автоматически переключается между Warm Fantasy (D&D 5e), Neon Cyber (Cyberpunk RED) и Stately Slate (Pathfinder 2e) в зависимости от выбранных правил кампании.
                </p>

                {/* Theme Selector */}
                <div className="pt-2 border-t border-white/[0.06] space-y-2">
                  <label className="text-xs font-semibold text-gray-300 block">
                    {themeBySystem ? 'Запасная тема (если система не задана):' : 'Фиксированная тема:'}
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {[
                      { id: 'dnd5e', name: 'D&D 5e (Warm Gold)', color: '#f5b920' },
                      { id: 'cyberpunk-red', name: 'Cyberpunk RED (Neon Cyber)', color: '#fcee0a' },
                      { id: 'pathfinder2e', name: 'Pathfinder 2e (Stately Slate)', color: '#c28f47' },
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
                  Горячие клавиши
                </h1>
                <p className="mt-2 text-sm text-[#a0a0b0] leading-relaxed max-w-2xl m-0">
                  Быстрое управление инициативой, ходами и бросками без отрыва от клавиатуры.
                </p>
              </div>

              <section className="p-5 rounded-[16px] bg-white/[0.04] border border-white/[0.08] space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-[12px] bg-white/[0.02] border border-white/5 flex items-center justify-between">
                    <span className="text-gray-300">Следующий ход в трекере инициативы</span>
                    <kbd className="px-2 py-1 rounded bg-[#10141d] border border-white/20 font-mono font-bold text-[#fce79f]">
                      Пробел (Space)
                    </kbd>
                  </div>

                  <div className="p-3 rounded-[12px] bg-white/[0.02] border border-white/5 flex items-center justify-between">
                    <span className="text-gray-300">Глобальный поиск (Spotlight Search)</span>
                    <kbd className="px-2 py-1 rounded bg-[#10141d] border border-white/20 font-mono font-bold text-[#fce79f]">
                      Ctrl + K
                    </kbd>
                  </div>

                  <div className="p-3 rounded-[12px] bg-white/[0.02] border border-white/5 flex items-center justify-between">
                    <span className="text-gray-300">Отмена последнего боевого действия</span>
                    <kbd className="px-2 py-1 rounded bg-[#10141d] border border-white/20 font-mono font-bold text-[#fce79f]">
                      Ctrl + Z
                    </kbd>
                  </div>

                  <div className="p-3 rounded-[12px] bg-white/[0.02] border border-white/5 flex items-center justify-between">
                    <span className="text-gray-300">Повтор отменённого действия (Redo)</span>
                    <kbd className="px-2 py-1 rounded bg-[#10141d] border border-white/20 font-mono font-bold text-[#fce79f]">
                      Ctrl + Y
                    </kbd>
                  </div>

                  <div className="p-3 rounded-[12px] bg-white/[0.02] border border-white/5 flex items-center justify-between sm:col-span-2">
                    <span className="text-gray-300">Цифровой блок Numpad для быстрых действий урона / бросков</span>
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
                  Плагины и расширения
                </h1>
                <p className="mt-2 text-sm text-[#a0a0b0] leading-relaxed max-w-2xl m-0">
                  Модульная экосистема для подключения кастомных систем, скриптов автоматизации и конвертеров.
                </p>
              </div>

              <section className="p-8 rounded-[16px] bg-white/[0.04] border border-white/[0.08] text-center space-y-4">
                <div className="w-12 h-12 rounded-full bg-[#f5b920]/15 border border-[#f5b920]/30 text-[#f5b920] mx-auto flex items-center justify-center">
                  <Sparkles className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white m-0">
                    Поддержка плагинов в разработке
                  </h3>
                  <p className="text-xs text-[#a0a0b0] max-w-md mx-auto mt-2 leading-relaxed">
                    Скоро появится возможность подключать собственные модули правил, пакеты правил Foundry VTT, пользовательские таблицы лута и кастомные темы интерфейса.
                  </p>
                </div>
                <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-white/5 text-gray-400 border border-white/10">
                  Запланировано в версии 2.1
                </span>
              </section>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
