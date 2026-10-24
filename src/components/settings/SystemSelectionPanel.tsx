import { useState } from 'react';
import { useSettingsStore, resolveEffectiveTheme } from '../../store/settingsStore';
import { useCombatStore } from '../../store/combatStore';
import { SYSTEM_REGISTRY, getAllSystems } from '../../systems/registry';
import { SystemMetadata, SystemFamily, SystemStatus } from '../../types/system';
import {
  CheckCircle2,
  Copy,
  ShieldAlert,
  Sparkles,
  X,
  AlertTriangle,
  Lightbulb,
} from 'lucide-react';
import clsx from 'clsx';

export interface SystemSelectionPanelProps {
  onSave?: (systemId: string) => void;
  onCancel?: () => void;
  showFooter?: boolean;
}

const FAMILY_CONFIG: Record<SystemFamily, { title: string; order: number }> = {
  dnd5e: { title: 'D&D 5e', order: 1 },
  pathfinder: { title: 'Pathfinder', order: 2 },
  cyberpunk: { title: 'Киберпанк', order: 3 },
  custom: { title: 'Другое', order: 4 },
};

const STATUS_CONFIG: Record<
  SystemStatus,
  {
    label: string;
    isSelectable: boolean;
    badgeStyle: { color: string; border: string; backgroundColor: string };
  }
> = {
  stable: {
    label: 'Готово',
    isSelectable: true,
    badgeStyle: {
      color: '#3dd68c',
      border: '1px solid #3dd68c',
      backgroundColor: 'rgba(61, 214, 140, 0.1)',
    },
  },
  beta: {
    label: 'Бета',
    isSelectable: true,
    badgeStyle: {
      color: '#f5b920',
      border: '1px solid #f5b920',
      backgroundColor: 'rgba(245, 185, 32, 0.1)',
    },
  },
  wip: {
    label: 'В разработке',
    isSelectable: true,
    badgeStyle: {
      color: '#ef4444',
      border: '1px solid #ef4444',
      backgroundColor: 'rgba(239, 68, 68, 0.1)',
    },
  },
  planned: {
    label: 'Скоро',
    isSelectable: false,
    badgeStyle: {
      color: '#a0a0b0',
      border: '1px solid #a0a0b0',
      backgroundColor: 'rgba(160, 160, 176, 0.1)',
    },
  },
};

export function SystemSelectionPanel({
  onSave,
  onCancel,
  showFooter = true,
}: SystemSelectionPanelProps) {
  const language = useSettingsStore((s) => s.language);
  const isRu = language === 'ru';
  const currentSystemId = useSettingsStore((s) => s.currentSystemId);
  const themeBySystem = useSettingsStore((s) => s.themeBySystem);
  const fallbackTheme = useSettingsStore((s) => s.fallbackTheme);
  const setCurrentSystemId = useSettingsStore((s) => s.setCurrentSystemId);

  const combatSystemId = useCombatStore((s) => s.systemId);
  const combatants = useCombatStore((s) => s.combatants);
  const setCombatSystemId = useCombatStore((s) => s.setSystemId);
  const duplicateCampaignInSystem = useCombatStore((s) => s.duplicateCampaignInSystem);

  const activeSavedSystemId = currentSystemId || combatSystemId || 'srd_5_2_1';

  const [selectedSystemId, setSelectedSystemId] = useState<string>(activeSavedSystemId);
  const [pendingConfirmSystem, setPendingConfirmSystem] = useState<SystemMetadata | null>(null);
  const [isDuplicateModalOpen, setIsDuplicateModalOpen] = useState(false);
  const [duplicateTargetSystemId, setDuplicateTargetSystemId] = useState<string>(activeSavedSystemId);
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'warn'; text: string } | null>(null);

  // Group systems dynamically by family
  const allSystems = getAllSystems().filter((sys) => sys.id !== 'dnd5e_2014' && sys.id !== 'dnd5e_2024');
  const families: SystemFamily[] = ['dnd5e', 'pathfinder', 'cyberpunk', 'custom'];

  const familyTitles: Record<SystemFamily, string> = {
    dnd5e: isRu ? 'D&D 5e' : 'D&D 5e / SRD',
    pathfinder: 'Pathfinder',
    cyberpunk: isRu ? 'Киберпанк' : 'Cyberpunk',
    custom: isRu ? 'Другое' : 'Other',
  };

  const statusLabels: Record<SystemStatus, string> = {
    stable: isRu ? 'Готово' : 'Ready',
    beta: isRu ? 'Бета' : 'Beta',
    wip: isRu ? 'В разработке' : 'In Development',
    planned: isRu ? 'Скоро' : 'Coming Soon',
  };

  const getLocalizedSysName = (sys: SystemMetadata) => {
    if (sys.id === 'custom_system') return isRu ? 'Своя система' : 'Custom System';
    return sys.shortName || sys.name;
  };

  const getLocalizedSysDesc = (sys: SystemMetadata) => {
    if (isRu) {
      if (sys.id === 'srd_5_2_1') return 'Открытые правила D&D, редакция 2024 (лицензия CC-BY 4.0)';
      if (sys.id === 'pathfinder2e') return 'Тактическая глубина, 3 действия в ход и сотни черт';
      if (sys.id === 'pathfinder1e') return 'Классические правила d20 на базе редакции 3.5';
      if (sys.id === 'cyberpunk_red') return 'Мрачное будущее, перестрелки, киберимпланты и рок-н-ролл';
      if (sys.id === 'custom_system') return 'Настройте свои характеристики, навыки и формулы бросков';
      return sys.shortDescription || sys.description;
    }
    if (sys.id === 'srd_5_2_1') return 'Open game rules, 2024 edition (CC-BY 4.0)';
    if (sys.id === 'pathfinder2e') return 'Second edition tactical rules & action economy';
    if (sys.id === 'pathfinder1e') return 'Classic 3.5-based d20 fantasy system';
    if (sys.id === 'cyberpunk_red') return 'Night City tabletop roleplaying game';
    if (sys.id === 'custom_system') return 'Design your own skills, attributes & dice';
    return sys.description || sys.shortDescription;
  };

  const systemsByFamily = families.map((fam) => ({
    family: fam,
    config: { ...FAMILY_CONFIG[fam], title: familyTitles[fam] },
    systems: allSystems.filter((sys) => sys.family === fam),
  }));

  const handleCardClick = (sys: SystemMetadata) => {
    const statusCfg = STATUS_CONFIG[sys.status];
    if (!statusCfg.isSelectable) return;

    if (sys.id === selectedSystemId) return;

    // Beta and WIP trigger confirmation modal
    if (sys.status === 'beta' || sys.status === 'wip') {
      setPendingConfirmSystem(sys);
      return;
    }

    setSelectedSystemId(sys.id);
  };

  const handleConfirmSystem = () => {
    if (pendingConfirmSystem) {
      setSelectedSystemId(pendingConfirmSystem.id);
      setPendingConfirmSystem(null);
    }
  };

  const handleCancelConfirm = () => {
    setPendingConfirmSystem(null);
  };

  const handleSave = () => {
    // 1. Update SettingsStore
    setCurrentSystemId(selectedSystemId);

    // 2. Update CombatStore
    setCombatSystemId(selectedSystemId, true);

    // 3. Smoothly switch theme attribute on root document
    const effectiveTheme = resolveEffectiveTheme(selectedSystemId, themeBySystem, fallbackTheme);
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-system', effectiveTheme);
    }

    const savedSysMeta = SYSTEM_REGISTRY[selectedSystemId];
    setFeedbackMessage({
      type: 'success',
      text: isRu
        ? `Правила переключены на «${savedSysMeta?.name || selectedSystemId}». Тема оформления обновлена.`
        : `Rules switched to "${savedSysMeta?.name || selectedSystemId}". Visual theme updated.`,
    });

    if (onSave) {
      onSave(selectedSystemId);
    }
  };

  const handleCancel = () => {
    setSelectedSystemId(activeSavedSystemId);
    if (onCancel) {
      onCancel();
    }
  };

  const handleExecuteDuplicate = () => {
    const result = duplicateCampaignInSystem(duplicateTargetSystemId);
    setCurrentSystemId(duplicateTargetSystemId);

    const effectiveTheme = resolveEffectiveTheme(duplicateTargetSystemId, themeBySystem, fallbackTheme);
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-system', effectiveTheme);
    }

    setSelectedSystemId(duplicateTargetSystemId);
    setIsDuplicateModalOpen(false);

    setFeedbackMessage({
      type: 'success',
      text: result.warning,
    });
  };

  return (
    <div className="w-full flex flex-col font-sans text-[#ececf1] space-y-6">
      {/* Title & Subtitle */}
      <div>
        <h1 className="text-2xl sm:text-[28px] font-extrabold tracking-tight text-white m-0">
          {isRu ? 'Система НРИ' : 'TTRPG System'}
        </h1>
        <p className="mt-2 text-sm text-[#a0a0b0] leading-relaxed max-w-2xl m-0">
          {isRu
            ? 'Выберите правила для вашей кампании. Каждая система адаптирует карточки, броски и тему интерфейса. Выбор влияет на инициативу, броски, карточки существ и ресурсы. Эта система будет предлагаться по умолчанию при создании новой кампании.'
            : 'Choose rules for your campaign. Each system adapts cards, rolls, and interface theme. Selection affects initiative, rolls, creature cards, and resources. This system will be default for new campaigns.'}
        </p>
      </div>

      {/* Warning Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 sm:p-4 rounded-[14px] bg-[rgba(245,185,32,0.10)] border border-[rgba(245,185,32,0.35)] text-xs sm:text-[13px] leading-relaxed">
        <div className="flex items-start sm:items-center gap-2.5 flex-1">
          <span className="font-mono text-[#f5b920] font-bold text-sm shrink-0 flex items-center justify-center w-5 h-5 rounded-full border border-[#f5b920]/40 bg-[#f5b920]/15">
            i
          </span>
          <span className="text-[#ececf1] flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-[#f5b920] shrink-0 inline" />
            <span>
              {isRu ? (
                <><strong>Система фиксируется при создании кампании.</strong> Для смены системы в начатой игре используйте «Создать копию кампании»: данные разных систем не конвертируются вслепую.</>
              ) : (
                <><strong>The system is fixed upon campaign creation.</strong> To switch systems in an active game, use "Duplicate Campaign": data between different systems cannot be blindly converted.</>
              )}
            </span>
          </span>
        </div>
        <button
          type="button"
          onClick={() => {
            setDuplicateTargetSystemId(selectedSystemId);
            setIsDuplicateModalOpen(true);
          }}
          className="shrink-0 min-h-[32px] px-3 py-1.5 rounded-[10px] bg-[#f5b920]/20 hover:bg-[#f5b920]/30 active:bg-[#f5b920]/40 border border-[#f5b920]/50 text-[#fce79f] hover:text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <Copy className="w-3.5 h-3.5 text-[#f5b920]" />
          <span>{isRu ? 'Создать копию кампании' : 'Duplicate Campaign'}</span>
        </button>
      </div>

      {/* Feedback banner */}
      {feedbackMessage && (
        <div
          className={clsx(
            'p-3 rounded-[12px] flex items-center justify-between text-xs animate-in fade-in',
            feedbackMessage.type === 'success'
              ? 'bg-emerald-950/70 border border-emerald-500/60 text-emerald-200'
              : 'bg-amber-950/70 border border-amber-500/60 text-amber-200'
          )}
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{feedbackMessage.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedbackMessage(null)}
            className="text-gray-400 hover:text-white ml-2 text-xs font-bold p-0.5 flex items-center justify-center cursor-pointer"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Systems Grouped by Family */}
      <div className="space-y-6">
        {systemsByFamily.map(({ family, config, systems }) => {
          if (!systems.length) return null;
          return (
            <section key={family} className="space-y-3">
              <h3 className="m-0 text-xs font-bold uppercase tracking-wider text-[#a0a0b0]">
                {config.title}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {systems.map((sys) => {
                  const statusCfg = STATUS_CONFIG[sys.status];
                  const isSelected = sys.id === selectedSystemId;
                  const isSelectable = statusCfg.isSelectable;

                  return (
                    <button
                      key={sys.id}
                      type="button"
                      role="button"
                      aria-pressed={isSelected}
                      aria-disabled={!isSelectable}
                      disabled={!isSelectable}
                      onClick={() => handleCardClick(sys)}
                      className={clsx(
                        'text-left font-sans text-[#ececf1] flex flex-col justify-between gap-2 p-4 sm:p-[18px] min-h-[88px] rounded-[16px] transition-all cursor-pointer outline-none',
                        isSelected
                          ? 'border border-[#f5b920] border-gold bg-[rgba(245,185,32,0.10)] shadow-[0_0_24px_rgba(245,185,32,0.22)] shadow-gold-glow'
                          : isSelectable
                          ? 'border border-white/[0.08] bg-white/[0.04] hover:bg-white/[0.08] hover:border-white/[0.16] hover:-translate-y-0.5 shadow-none'
                          : 'border border-white/[0.05] bg-white/[0.02] opacity-50 cursor-not-allowed shadow-none'
                      )}
                      style={{
                        backdropFilter: 'blur(14px)',
                        WebkitBackdropFilter: 'blur(14px)',
                      }}
                    >
                      {/* Card Header: Title & Status Badge */}
                      <div className="flex items-center justify-between gap-2 w-full">
                        <span className="font-bold text-sm sm:text-base text-white tracking-tight flex items-center gap-1.5 truncate">
                          <span>{getLocalizedSysName(sys)}</span>
                          {isSelected && (
                            <Sparkles className="w-3.5 h-3.5 text-[#f5b920] shrink-0" />
                          )}
                        </span>
                        <span
                          className="text-[12px] font-semibold px-2.5 py-0.5 rounded-full shrink-0"
                          style={statusCfg.badgeStyle}
                        >
                          {statusLabels[sys.status]}
                        </span>
                      </div>

                      {/* Card Description */}
                      <p className="m-0 text-[13px] text-[#a0a0b0] leading-snug line-clamp-2">
                        {getLocalizedSysDesc(sys)}
                      </p>
                    </button>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>

      {/* Footer Buttons */}
      {showFooter && (
        <div className="pt-4 border-t border-white/[0.08] flex items-center justify-end gap-3 flex-wrap">
          <button
            type="button"
            onClick={handleCancel}
            className="min-h-[44px] min-w-[32px] px-5 rounded-[12px] text-sm font-semibold text-[#ececf1] bg-transparent border border-white/[0.16] hover:bg-white/10 active:bg-white/15 transition-all cursor-pointer"
          >
            {isRu ? 'Отмена' : 'Cancel'}
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="min-h-[44px] min-w-[32px] px-6 rounded-[12px] text-sm font-extrabold text-[#0a0a0d] bg-gradient-to-br from-[#ffd24d] to-[#f5b920] shadow-[0_0_24px_rgba(245,185,32,0.25)] shadow-gold-glow hover:brightness-105 active:scale-[0.98] transition-all cursor-pointer flex items-center gap-2"
          >
            <span>{isRu ? 'Сохранить' : 'Save'}</span>
          </button>
        </div>
      )}

      {/* Confirmation Modal for Beta / WIP systems */}
      {pendingConfirmSystem && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-150"
          onClick={handleCancelConfirm}
        >
          <div
            className="w-full max-w-md rounded-[20px] bg-[#121620] border border-[#f5b920]/40 p-6 shadow-[0_20px_50px_rgba(0,0,0,0.9)] space-y-4 text-[#ececf1]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              <div
                className={clsx(
                  'p-2 rounded-[12px] shrink-0',
                  pendingConfirmSystem.status === 'wip'
                    ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                    : 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                )}
              >
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <h3 id="confirm-modal-title" className="text-base font-bold text-white m-0">
                  {pendingConfirmSystem.status === 'wip'
                    ? (isRu ? 'Система в разработке' : 'System in Development')
                    : (isRu ? 'Система в стадии Бета' : 'System in Beta')}
                </h3>
                <span className="text-xs text-[#a0a0b0]">
                  {pendingConfirmSystem.name} ({statusLabels[pendingConfirmSystem.status]})
                </span>
              </div>
            </div>

            <p className="text-sm text-gray-300 leading-relaxed m-0">
              {pendingConfirmSystem.status === 'wip'
                ? isRu
                  ? `Система «${pendingConfirmSystem.name}» находится в активной разработке. Правила расчёта урона по зонам, SP брони и человечности (Humanity) функционируют в экспериментальном режиме.`
                  : `The system "${pendingConfirmSystem.name}" is in active development. Hit location damage, armor SP ablation, and Humanity mechanics operate in experimental mode.`
                : isRu
                  ? `Система «${pendingConfirmSystem.name}» находится на этапе открытого тестирования (Бета). Основные механики проверены, но отдельные модификаторы и свойства могут обновляться.`
                  : `The system "${pendingConfirmSystem.name}" is in open beta testing. Core mechanics are verified, but select modifiers and properties may receive updates.`}
            </p>

            <div className="p-3 rounded-[12px] bg-white/[0.04] border border-white/[0.08] text-xs text-[#a0a0b0] flex items-center gap-2">
              <Lightbulb className="w-3.5 h-3.5 text-amber-400 shrink-0 inline" />
              <span>
                {isRu
                  ? 'Вы всегда можете переключиться обратно на SRD 5.2.1 или D&D 5e (2014) в настройках.'
                  : 'You can always switch back to SRD 5.2.1 or D&D 5e (2014) in Settings at any time.'}
              </span>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={handleCancelConfirm}
                className="min-h-[36px] px-4 rounded-[10px] text-xs font-semibold text-gray-300 hover:text-white bg-white/[0.06] hover:bg-white/[0.12] transition-colors cursor-pointer"
              >
                {isRu ? 'Отмена' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={handleConfirmSystem}
                className="min-h-[36px] px-4 rounded-[10px] text-xs font-bold text-[#0a0a0d] bg-[#f5b920] hover:bg-[#fac742] shadow-[0_0_12px_rgba(245,185,32,0.3)] transition-all cursor-pointer"
              >
                {isRu
                  ? `Выбрать ${pendingConfirmSystem.shortName || pendingConfirmSystem.name}`
                  : `Select ${pendingConfirmSystem.shortName || pendingConfirmSystem.name}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Duplicate Campaign in New System Modal */}
      {isDuplicateModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="duplicate-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-150"
          onClick={() => setIsDuplicateModalOpen(false)}
        >
          <div
            className="w-full max-w-lg rounded-[20px] bg-[#121620] border border-white/[0.12] p-6 shadow-[0_20px_50px_rgba(0,0,0,0.9)] space-y-4 text-[#ececf1]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
              <div className="flex items-center gap-2">
                <Copy className="w-5 h-5 text-[#f5b920]" />
                <h3 id="duplicate-modal-title" className="text-base font-bold text-white m-0">
                  {isRu ? 'Создать копию кампании в другой системе' : 'Duplicate Campaign in Another System'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsDuplicateModalOpen(false)}
                title={isRu ? 'Закрыть' : 'Close'}
                className="text-gray-400 hover:text-white p-1 rounded hover:bg-white/10"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-gray-300 leading-relaxed m-0">
              {isRu
                ? 'Будет создана независимая копия текущей кампании и участников с преобразованием параметров в целевую систему. Исходная кампания останется нетронутой.'
                : 'An independent copy of current campaign and combatants will be created with parameters converted to target system. Original campaign remains untouched.'}
            </p>

            {combatants.length > 0 && (
              <div className="p-2.5 rounded-[10px] bg-blue-950/40 border border-blue-500/30 text-xs text-blue-200">
                {isRu ? (
                  <>В активном трекере находится <strong>{combatants.length}</strong> участников. Все они будут скопированы в новую редакцию правил.</>
                ) : (
                  <>Active tracker contains <strong>{combatants.length}</strong> participants. All will be copied to the new ruleset.</>
                )}
              </div>
            )}

            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-300 block">
                {isRu ? 'Выберите целевую систему НРИ:' : 'Select target TTRPG system:'}
              </label>
              <select
                value={duplicateTargetSystemId}
                onChange={(e) => setDuplicateTargetSystemId(e.target.value)}
                className="w-full p-2.5 rounded-[12px] bg-[#1a202c] border border-white/20 text-xs text-white outline-none focus:border-[#f5b920]"
              >
                {allSystems
                  .filter((sys) => sys.status !== 'planned')
                  .map((sys) => (
                    <option key={sys.id} value={sys.id}>
                      {sys.name} [{statusLabels[sys.status]}]
                    </option>
                  ))}
              </select>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-white/[0.08]">
              <button
                type="button"
                onClick={() => setIsDuplicateModalOpen(false)}
                className="min-h-[36px] px-4 rounded-[10px] text-xs font-semibold text-gray-300 hover:text-white bg-white/[0.06] hover:bg-white/[0.12] transition-colors cursor-pointer"
              >
                {isRu ? 'Отмена' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={handleExecuteDuplicate}
                className="min-h-[36px] px-4 rounded-[10px] text-xs font-bold text-[#0a0a0d] bg-gradient-to-r from-[#ffd24d] to-[#f5b920] shadow-[0_0_12px_rgba(245,185,32,0.3)] transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>{isRu ? 'Создать копию' : 'Create Copy'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
