import { useState, useMemo } from 'react';
import { useCombatStore } from '../../store/combatStore';
import {
  ScrollText,
  X,
  Copy,
  Download,
  Trash2,
  Check,
  Search,
  Flame,
  Heart,
  Shield,
  Skull,
  RotateCcw,
  Sparkles,
  ArrowRight,
} from 'lucide-react';

export function CombatLogDrawer() {
  const { isCombatLogOpen, setCombatLogOpen, combatLog, clearCombatLog, roundCounter } = useCombatStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'damage_heal' | 'rounds' | 'saves' | 'conditions'>('all');
  const [copied, setCopied] = useState(false);

  // Filtered log entries
  const filteredLogs = useMemo(() => {
    return combatLog.filter((entry) => {
      // Type category filter
      if (filterType === 'damage_heal' && !['damage', 'heal', 'temp_hp', 'knockout', 'death'].includes(entry.type)) {
        return false;
      }
      if (filterType === 'rounds' && !['round', 'turn'].includes(entry.type)) {
        return false;
      }
      if (filterType === 'saves' && entry.type !== 'death_save') {
        return false;
      }
      if (filterType === 'conditions' && !['condition_add', 'condition_remove'].includes(entry.type)) {
        return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const textMatch = entry.text.toLowerCase().includes(q);
        const actorMatch = entry.actorName?.toLowerCase().includes(q);
        const targetMatch = entry.targetName?.toLowerCase().includes(q);
        const detailsMatch = entry.details?.toLowerCase().includes(q);
        return textMatch || actorMatch || targetMatch || detailsMatch;
      }

      return true;
    });
  }, [combatLog, filterType, searchQuery]);

  // Format log into readable plain text for clipboard / file export
  const formatLogToText = (): string => {
    const lines = [
      '=============================================================',
      '              ЖУРНАЛ СОБЫТИЙ БОЯ — TTRPG HELPER 2.0          ',
      ` Дата выгрузки: ${new Date().toLocaleString('ru-RU')}         `,
      ` Текущий раунд: ${roundCounter}                              `,
      ` Всего записей: ${combatLog.length}                          `,
      '=============================================================',
      '',
    ];

    combatLog.forEach((entry) => {
      const ts = entry.timestamp ? `[${entry.timestamp}]` : '';
      const rd = entry.round ? `[Р${entry.round}]` : '';
      lines.push(`${ts} ${rd} ${entry.text}${entry.details ? ` (${entry.details})` : ''}`);
    });

    lines.push('', '======================= КОНЕЦ ЖУРНАЛА =======================');
    return lines.join('\r\n');
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(formatLogToText());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error('Failed to copy log:', e);
    }
  };

  const handleExportTxt = () => {
    const text = formatLogToText();
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dnd_combat_log_round_${roundCounter}_${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!isCombatLogOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      {/* Drawer Container (Width 420px, Glass Dark Background) */}
      <div className="w-full max-w-[440px] h-full bg-[rgba(18,22,30,0.95)] backdrop-blur-xl border-l border-[rgba(255,255,255,0.08)] shadow-[0_0_40px_rgba(0,0,0,0.8)] flex flex-col overflow-hidden animate-in slide-in-from-right duration-250">
        {/* Хедер панели */}
        <header className="p-3.5 border-b border-[rgba(255,255,255,0.08)] bg-[rgba(14,18,25,0.7)] flex flex-col gap-2.5 flex-shrink-0">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-white">
              <ScrollText className="h-5 w-5 text-[#f5b920] flex-shrink-0" />
              <div>
                <h2 className="text-sm font-bold tracking-tight">Журнал событий боя</h2>
                <p className="text-[11px] text-gray-400">
                  Хронология раундов, урона, атак и спасов ({combatLog.length} записей)
                </p>
              </div>
            </div>

            <button
              onClick={() => setCombatLogOpen(false)}
              className="p-1.5 rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition-colors cursor-pointer"
              title="Закрыть журнал"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Панель действий: Копировать, Экспорт .txt, Очистить */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 min-h-[32px] px-3 py-1 rounded-full bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.08)] hover:bg-[rgba(255,255,255,0.1)] text-xs font-semibold text-gray-200 hover:text-white transition-all cursor-pointer"
              title="Скопировать весь лог в буфер обмена"
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Скопировано!</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5 text-[#f5b920]" />
                  <span>Копировать</span>
                </>
              )}
            </button>

            <button
              onClick={handleExportTxt}
              className="flex items-center gap-1.5 min-h-[32px] px-3 py-1 rounded-full bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.08)] hover:bg-[rgba(255,255,255,0.1)] text-xs font-semibold text-gray-200 hover:text-white transition-all cursor-pointer"
              title="Экспортировать лог в текстовый файл .txt"
            >
              <Download className="h-3.5 w-3.5 text-blue-400" />
              <span>Экспорт .txt</span>
            </button>

            {combatLog.length > 0 && (
              <button
                onClick={() => {
                  if (window.confirm('Очистить историю событий боя?')) {
                    clearCombatLog();
                  }
                }}
                className="flex items-center gap-1.5 min-h-[32px] px-2.5 py-1 rounded-full bg-red-950/40 border border-red-800/40 hover:bg-red-900/60 text-xs font-semibold text-red-300 hover:text-red-100 transition-all cursor-pointer ml-auto"
                title="Очистить все записи журнала"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Очистить</span>
              </button>
            )}
          </div>

          {/* Строка поиска и фильтрации */}
          <div className="flex flex-col gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
              <input
                type="text"
                placeholder="Поиск по имени, действию, урону..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 rounded-full bg-black/40 border border-[rgba(255,255,255,0.08)] focus:border-[#f5b920]/60 text-xs text-white placeholder-gray-500 focus:outline-none transition-colors"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Быстрые фильтры */}
            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5">
              {[
                { id: 'all', label: 'Все' },
                { id: 'damage_heal', label: 'Урон/Лечение' },
                { id: 'rounds', label: 'Раунды' },
                { id: 'saves', label: 'Спасброски' },
                { id: 'conditions', label: 'Состояния' },
              ].map((pill) => (
                <button
                  key={pill.id}
                  onClick={() => setFilterType(pill.id as any)}
                  className={`min-h-[26px] px-2.5 py-0.5 rounded-full text-[11px] font-medium whitespace-nowrap transition-all cursor-pointer ${
                    filterType === pill.id
                      ? 'bg-[#f5b920] text-[#0c0d12] font-bold shadow-[0_0_10px_rgba(245,185,32,0.3)]'
                      : 'bg-[rgba(255,255,255,0.04)] text-gray-400 hover:text-white hover:bg-[rgba(255,255,255,0.08)]'
                  }`}
                >
                  {pill.label}
                </button>
              ))}
            </div>
          </div>
        </header>

        {/* Список событий журнала */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2 select-text">
          {filteredLogs.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-center p-6 text-gray-400">
              <ScrollText className="h-10 w-10 text-gray-600 mb-2 stroke-1" />
              <p className="text-xs font-semibold text-gray-300 mb-1">Записей не найдено</p>
              <p className="text-[11px] text-gray-500 max-w-xs">
                {combatLog.length === 0
                  ? 'События урона, исцеления, бросков и смены раундов будут появляться здесь автоматически.'
                  : 'Попробуйте изменить поисковый запрос или фильтр.'}
              </p>
            </div>
          ) : (
            filteredLogs.map((entry) => {
              // Different cards depending on event type
              if (entry.type === 'round') {
                return (
                  <div
                    key={entry.id}
                    className="flex items-center justify-center gap-2 py-1.5 my-1 text-center"
                  >
                    <div className="h-px bg-gradient-to-r from-transparent via-[#f5b920]/40 to-transparent flex-1" />
                    <span className="text-[11px] font-mono font-extrabold text-[#f5b920] uppercase tracking-wider bg-black/60 px-3 py-0.5 rounded-full border border-[#f5b920]/30 shadow-sm">
                      {entry.text}
                    </span>
                    <div className="h-px bg-gradient-to-r from-transparent via-[#f5b920]/40 to-transparent flex-1" />
                  </div>
                );
              }

              let borderAccent = 'border-[rgba(255,255,255,0.08)]';
              let icon = <Flame className="h-3.5 w-3.5 text-gray-400" />;

              if (entry.type === 'damage') {
                borderAccent = 'border-red-900/40 bg-red-950/20';
                icon = <Flame className="h-3.5 w-3.5 text-red-400" />;
              } else if (entry.type === 'heal') {
                borderAccent = 'border-emerald-900/40 bg-emerald-950/20';
                icon = <Heart className="h-3.5 w-3.5 text-emerald-400" />;
              } else if (entry.type === 'temp_hp') {
                borderAccent = 'border-blue-900/40 bg-blue-950/20';
                icon = <Shield className="h-3.5 w-3.5 text-blue-400" />;
              } else if (entry.type === 'death' || entry.type === 'knockout') {
                borderAccent = 'border-purple-900/50 bg-purple-950/30';
                icon = <Skull className="h-3.5 w-3.5 text-purple-400" />;
              } else if (entry.type === 'turn') {
                borderAccent = 'border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.02)]';
                icon = <Sparkles className="h-3.5 w-3.5 text-[#f5b920]" />;
              } else if (entry.type === 'death_save') {
                borderAccent = 'border-amber-900/40 bg-amber-950/20';
                icon = <RotateCcw className="h-3.5 w-3.5 text-amber-400" />;
              }

              return (
                <div
                  key={entry.id}
                  className={`p-2.5 rounded-glass border ${borderAccent} flex flex-col gap-1 transition-all hover:border-[rgba(255,255,255,0.18)]`}
                >
                  <div className="flex items-center justify-between gap-1.5 text-[10px] text-gray-400">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="flex-shrink-0">{icon}</span>
                      {entry.actorName && (
                        <span className="font-bold text-gray-300 truncate">
                          {entry.actorName}
                        </span>
                      )}
                      {entry.targetName && entry.actorName && (
                        <ArrowRight className="h-3 w-3 text-gray-500 inline flex-shrink-0" />
                      )}
                      {entry.targetName && (
                        <span className="font-bold text-gray-200 truncate">
                          {entry.targetName}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0 font-mono tabular-nums">
                      {entry.round && (
                        <span className="px-1 py-0.2 rounded bg-black/40 text-[#f5b920] border border-white/5 text-[9px]">
                          Р{entry.round}
                        </span>
                      )}
                      <span className="text-gray-500">{entry.timestamp}</span>
                    </div>
                  </div>

                  <div className="text-xs text-gray-200 font-medium leading-relaxed">
                    {entry.text}
                  </div>

                  {entry.details && (
                    <div className="text-[11px] text-gray-400 font-mono bg-black/30 px-2 py-0.5 rounded border border-white/5">
                      {entry.details}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
