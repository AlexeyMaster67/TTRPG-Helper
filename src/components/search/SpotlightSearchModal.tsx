import { useState, useEffect, useRef } from 'react';
import { dbService } from '../../services/dbService';
import { ParsedMonster, ParsedSpell, ParsedItem } from '../../types/database';
import { CONDITIONS_2024_DATA, ConditionInfo } from '../../engine/conditions';
import { DND_2024_RULES, Dnd2024RuleItem } from '../../data/dnd2024Rules';
import { useCombatStore } from '../../store/combatStore';
import { cleanRussianText, localizeMonsterName } from '../../utils/textUtils';
import {
  Search,
  Sparkles,
  Zap,
  Package,
  AlertCircle,
  BookOpen,
  Plus,
  Copy,
  Check,
  FileText,
  Swords,
  X,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import clsx from 'clsx';
import { useSettingsStore } from '../../store/settingsStore';

export type SpotlightCategory = 'all' | 'monster' | 'spell' | 'item' | 'condition' | 'rule';

export interface SpotlightSearchResult {
  id: string;
  type: 'monster' | 'spell' | 'item' | 'condition' | 'rule';
  titleRu: string;
  titleEn: string;
  subtitle: string;
  badge: string;
  badgeClass: string;
  data: ParsedMonster | ParsedSpell | ParsedItem | ConditionInfo | Dnd2024RuleItem;
}

interface SpotlightSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

function formatMod(score: number): string {
  const mod = Math.floor((score - 10) / 2);
  return mod >= 0 ? `+${mod}` : `${mod}`;
}

export function SpotlightSearchModal({ isOpen, onClose }: SpotlightSearchModalProps) {
  const isEn = useSettingsStore((s) => s.language === 'en');
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<SpotlightCategory>('all');
  const [results, setResults] = useState<SpotlightSearchResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [addedToNotes, setAddedToNotes] = useState(false);
  const [addedToCombat, setAddedToCombat] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const resultsContainerRef = useRef<HTMLDivElement>(null);

  const addCombatant = useCombatStore((s) => s.addCombatant);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 50);
    } else {
      setQuery('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // Global hotkey handler for Escape inside modal
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (results.length > 0 ? (prev + 1) % results.length : 0));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (results.length > 0 ? (prev - 1 + results.length) % results.length : 0));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, results.length]);

  // Scroll active item into view
  useEffect(() => {
    if (!resultsContainerRef.current) return;
    const activeEl = resultsContainerRef.current.querySelector(`[data-index="${selectedIndex}"]`);
    if (activeEl) {
      activeEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [selectedIndex]);

  // Search execution debounced
  useEffect(() => {
    if (!isOpen) return;

    let isCancelled = false;
    setIsLoading(true);

    const timer = setTimeout(async () => {
      const q = query.trim().toLowerCase();
      const newResults: SpotlightSearchResult[] = [];

      try {
        // 1. MONSTERS
        if (activeCategory === 'all' || activeCategory === 'monster') {
          const monsters = await dbService.searchMonsters(q, activeCategory === 'monster' ? 30 : 10);
          if (!isCancelled) {
            monsters.forEach((m) => {
              newResults.push({
                id: `monster-${m.id}`,
                type: 'monster',
                titleRu: cleanRussianText(m.name_ru || m.name_en),
                titleEn: m.name_en,
                subtitle: `CR ${m.cr} • КД ${m.ac} • HP ${m.hp_average} • ${cleanRussianText(m.creature_type_ru || m.creature_type)}`,
                badge: isEn ? 'Monster' : 'Монстр',
                badgeClass: 'bg-red-950/70 text-red-300 border-red-500/40',
                data: m,
              });
            });
          }
        }

        // 2. SPELLS
        if (activeCategory === 'all' || activeCategory === 'spell') {
          const spells = await dbService.searchSpells(q, undefined, undefined, activeCategory === 'spell' ? 30 : 10);
          if (!isCancelled) {
            spells.forEach((s) => {
              const lvl = s.level === 0 ? 'Заговор' : `${s.level} круг`;
              newResults.push({
                id: `spell-${s.id}`,
                type: 'spell',
                titleRu: cleanRussianText(s.name_ru || s.name_en),
                titleEn: s.name_en,
                subtitle: `${lvl} • ${cleanRussianText(s.school_ru || s.school)} • ${s.casting_time}`,
                badge: isEn ? 'Spell' : 'Заклинание',
                badgeClass: 'bg-blue-950/70 text-blue-300 border-blue-500/40',
                data: s,
              });
            });
          }
        }

        // 3. MAGIC ITEMS
        if (activeCategory === 'all' || activeCategory === 'item') {
          const items = await dbService.searchItems(q, undefined, activeCategory === 'item' ? 30 : 10);
          if (!isCancelled) {
            items.forEach((it) => {
              newResults.push({
                id: `item-${it.id}`,
                type: 'item',
                titleRu: cleanRussianText(it.name_ru || it.name_en),
                titleEn: it.name_en,
                subtitle: `${cleanRussianText(it.rarity || 'Обычный')} • ${cleanRussianText(it.category || 'Предмет')}`,
                badge: isEn ? 'Item' : 'Предмет',
                badgeClass: 'bg-amber-950/70 text-amber-300 border-amber-500/40',
                data: it,
              });
            });
          }
        }

        // 4. CONDITIONS (D&D 2024)
        if (activeCategory === 'all' || activeCategory === 'condition') {
          const allConditions = Object.values(CONDITIONS_2024_DATA);
          const matchedConditions = q
            ? allConditions.filter(
                (c) =>
                  c.nameRu.toLowerCase().includes(q) ||
                  c.nameEn.toLowerCase().includes(q) ||
                  c.descriptionRu.toLowerCase().includes(q)
              )
            : allConditions;

          matchedConditions.forEach((c) => {
            newResults.push({
              id: `condition-${c.type}`,
              type: 'condition',
              titleRu: c.nameRu,
              titleEn: c.nameEn,
              subtitle: c.descriptionRu.slice(0, 80) + '...',
              badge: isEn ? 'Condition' : 'Состояние',
              badgeClass: 'bg-purple-950/70 text-purple-300 border-purple-500/40',
              data: c,
            });
          });
        }

        // 5. D&D 2024 RULES & WEAPON MASTERIES
        if (activeCategory === 'all' || activeCategory === 'rule') {
          const matchedRules = q
            ? DND_2024_RULES.filter(
                (r) =>
                  r.nameRu.toLowerCase().includes(q) ||
                  r.nameEn.toLowerCase().includes(q) ||
                  r.summaryRu.toLowerCase().includes(q) ||
                  r.descriptionRu.toLowerCase().includes(q) ||
                  r.tags.some((t) => t.toLowerCase().includes(q))
              )
            : DND_2024_RULES;

          matchedRules.forEach((r) => {
            newResults.push({
              id: `rule-${r.id}`,
              type: 'rule',
              titleRu: r.nameRu,
              titleEn: r.nameEn,
              subtitle: r.summaryRu,
              badge: r.categoryRu,
              badgeClass: 'bg-emerald-950/70 text-emerald-300 border-emerald-500/40',
              data: r,
            });
          });
        }

        if (!isCancelled) {
          setResults(newResults);
          setSelectedIndex(0);
        }
      } catch (err) {
        console.warn('[SpotlightSearchModal] search error:', err);
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    }, 150);

    return () => {
      isCancelled = true;
      clearTimeout(timer);
    };
  }, [query, activeCategory, isOpen]);

  const activeResult: SpotlightSearchResult | undefined = results[selectedIndex];

  // Action: Add monster to combat
  const handleAddToCombat = () => {
    if (!activeResult || activeResult.type !== 'monster') return;
    const m = activeResult.data as ParsedMonster;
    const mNameEn = m.name_en || localizeMonsterName(m.name_ru, 'en') || m.name_ru || '';
    const mNameRu = cleanRussianText(m.name_ru || localizeMonsterName(m.name_en, 'ru') || m.name_en || '');
    addCombatant({
      name: mNameEn || mNameRu,
      nameRu: mNameRu,
      maxHp: m.hp_average || 10,
      hp: m.hp_average || 10,
      ac: m.ac || 10,
      speed: m.speed || '30 фт.',
      initiative: 0,
      initBonus: m.init_bonus || 0,
      statblock: m,
    });
    setAddedToCombat(true);
    setTimeout(() => setAddedToCombat(false), 2000);
  };

  // Action: Copy formatted Markdown
  const handleCopyMarkdown = () => {
    if (!activeResult) return;
    let md = '';

    if (activeResult.type === 'monster') {
      const m = activeResult.data as ParsedMonster;
      md = `### ${m.name_ru || m.name_en} (${m.name_en})\n` +
        `*${m.size_ru || m.size} ${m.creature_type_ru || m.creature_type}, Опасность: ${m.cr}*\n` +
        `- **КД:** ${m.ac} | **Хиты:** ${m.hp_average} (${m.hp_formula || ''}) | **Скорость:** ${m.speed}\n` +
        `- **СИЛ:** ${m.str} (${formatMod(m.str)}) | **ЛОВ:** ${m.dex} (${formatMod(m.dex)}) | **ТЕЛ:** ${m.con} (${formatMod(m.con)})\n` +
        `- **ИНТ:** ${m.intellect} (${formatMod(m.intellect)}) | **МДР:** ${m.wis} (${formatMod(m.wis)}) | **ХАР:** ${m.cha} (${formatMod(m.cha)})\n\n` +
        (m.actions?.length ? `**Действия:**\n${m.actions.map((a: any) => `- **${a.name}:** ${a.desc || ''}`).join('\n')}` : '');
    } else if (activeResult.type === 'spell') {
      const s = activeResult.data as ParsedSpell;
      md = `### ${s.name_ru || s.name_en} (${s.name_en})\n` +
        `*${s.level === 0 ? 'Заговор' : `${s.level} круг`}, ${s.school_ru || s.school}*\n` +
        `- **Время накладывания:** ${s.casting_time}\n` +
        `- **Дистанция:** ${s.range}\n` +
        `- **Длительность:** ${s.duration}${s.concentration ? ' (Концентрация)' : ''}\n\n` +
        `${s.description_ru || ''}`;
    } else if (activeResult.type === 'item') {
      const it = activeResult.data as ParsedItem;
      md = `### ${it.name_ru || it.name_en} (${it.name_en})\n` +
        `*${it.category}, ${it.rarity}${it.attunement ? ' (требуется настройка)' : ''}*\n\n` +
        `${it.description_ru || it.description_en || ''}`;
    } else if (activeResult.type === 'condition') {
      const c = activeResult.data as ConditionInfo;
      md = `### Состояние: ${c.nameRu} (${c.nameEn})\n\n${c.descriptionRu}`;
    } else if (activeResult.type === 'rule') {
      const r = activeResult.data as Dnd2024RuleItem;
      md = `### Правило: ${r.nameRu}\n*${r.categoryRu}*\n\n${r.descriptionRu}`;
    }

    navigator.clipboard.writeText(md).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Action: Add to Session Notes
  const handleAddToNotes = () => {
    if (!activeResult) return;
    try {
      const existing = JSON.parse(localStorage.getItem('dnd_master_notes') || '[]');
      existing.unshift({
        id: `note-${Date.now()}`,
        title: `${activeResult.titleRu} (${activeResult.badge})`,
        subtitle: activeResult.subtitle,
        timestamp: Date.now(),
      });
      localStorage.setItem('dnd_master_notes', JSON.stringify(existing));
      setAddedToNotes(true);
      setTimeout(() => setAddedToNotes(false), 2000);
    } catch (e) {
      console.warn(e);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-10 sm:pt-14 p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-150 select-none font-sans"
      onClick={onClose}
    >
      <div
        className="relative flex flex-col w-full max-w-5xl h-[85vh] max-h-[800px] bg-[rgba(18,22,30,0.92)] backdrop-blur-2xl border border-[rgba(255,255,255,0.08)] rounded-glass-xl shadow-[0_25px_60px_rgba(0,0,0,0.85)] overflow-hidden font-sans"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Header Bar */}
        <div className="flex items-center gap-3 px-4 py-3 bg-[rgba(14,18,25,0.7)] border-b border-[rgba(255,255,255,0.08)] flex-shrink-0">
          <Search className="h-5 w-5 text-gold flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={isEn ? "Quick search: goblin, fireball, battleaxe, slow, cover..." : "Быстрый поиск по D&D 2024: гоблин, огненный шар, топор, замедление, укрытие..."}
            className="flex-1 bg-transparent text-sm sm:text-base text-gray-100 placeholder-gray-500 outline-none font-sans"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="text-xs text-gray-400 hover:text-white px-1.5 py-0.5 rounded-glass hover:bg-white/10 transition-colors cursor-pointer flex items-center justify-center"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
          <kbd className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-black/40 border border-[rgba(255,255,255,0.12)] text-[10px] text-gray-400 font-mono">
            {isEn ? 'ESC to close' : 'ESC закрыть'}
          </kbd>
        </div>

        {/* Filter Category Tabs */}
        <div className="flex items-center gap-1.5 px-4 py-2 bg-[rgba(14,18,25,0.5)] border-b border-[rgba(255,255,255,0.08)] overflow-x-auto flex-shrink-0 scrollbar-none">
          {(
            [
              { id: 'all', label: isEn ? 'All Categories' : 'Все категории', icon: Sparkles },
              { id: 'monster', label: isEn ? 'Monsters' : 'Монстры', icon: Swords },
              { id: 'spell', label: isEn ? 'Spells' : 'Заклинания', icon: Zap },
              { id: 'item', label: isEn ? 'Items' : 'Предметы', icon: Package },
              { id: 'condition', label: isEn ? 'Conditions' : 'Состояния', icon: AlertCircle },
              { id: 'rule', label: isEn ? 'Rules' : 'Правила 2024', icon: BookOpen },
            ] as const
          ).map((tab) => {
            const Icon = tab.icon;
            const isActive = activeCategory === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveCategory(tab.id)}
                className={clsx(
                  'flex items-center gap-1.5 px-3 py-1 rounded text-xs font-medium whitespace-nowrap transition-all',
                  isActive
                    ? 'bg-gold text-black font-bold shadow-sm'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-[#1a232b]'
                )}
              >
                <Icon className={clsx('h-3.5 w-3.5', isActive ? 'text-black' : 'text-gold')} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Split Body: Left List + Right Rich Preview */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden divide-y md:divide-y-0 md:divide-x divide-[#2e3b46]">
          {/* LEFT: Results List */}
          <div
            ref={resultsContainerRef}
            className="w-full md:w-[420px] flex-shrink-0 overflow-y-auto bg-[#12181e] p-2 space-y-1 divide-y divide-[#1e2832]"
          >
            {isLoading && results.length === 0 ? (
              <div className="p-8 text-center text-xs text-gray-400 italic">
                {isEn ? 'Searching database...' : 'Поиск по базе данных...'}
              </div>
            ) : results.length === 0 ? (
              <div className="p-8 text-center space-y-2">
                <Search className="h-8 w-8 text-gray-600 mx-auto" />
                <p className="text-xs text-gray-400">{isEn ? `No results found for "${query}"` : `Ничего не найдено по запросу «${query}»`}</p>
                <p className="text-[11px] text-gray-500">{isEn ? "Try changing category or search terms" : "Попробуйте изменить категорию или формулировку"}</p>
              </div>
            ) : (
              results.map((res, idx) => {
                const isSelected = idx === selectedIndex;
                return (
                  <div
                    key={res.id}
                    data-index={idx}
                    onClick={() => setSelectedIndex(idx)}
                    className={clsx(
                      'p-2.5 rounded-sm cursor-pointer transition-all flex flex-col gap-1',
                      isSelected
                        ? 'bg-[#202b35] border-l-4 border-gold shadow-sm'
                        : 'hover:bg-[#172027] border-l-4 border-transparent'
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-gray-100 truncate font-serif">
                        {res.titleRu}
                      </span>
                      <span
                        className={clsx(
                          'px-1.5 py-0.2 rounded text-[10px] font-mono font-medium border flex-shrink-0',
                          res.badgeClass
                        )}
                      >
                        {res.badge}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-2 text-[11px]">
                      <span className="text-gray-400 truncate">{res.subtitle}</span>
                      {res.titleEn && res.titleEn !== res.titleRu && (
                        <span className="text-gray-500 italic text-[10px] truncate max-w-[120px]">
                          {res.titleEn}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* RIGHT: Rich Preview Card */}
          <div className="flex-1 flex flex-col overflow-y-auto bg-[#151d24] p-4 sm:p-6">
            {activeResult ? (
              <div className="flex flex-col h-full space-y-4">
                {/* Top Action Bar */}
                <div className="flex items-center justify-between gap-2 pb-3 border-b border-[#2e3b46] flex-wrap">
                  <div className="flex items-center gap-2">
                    <span
                      className={clsx(
                        'px-2 py-0.5 rounded text-xs font-mono font-bold border',
                        activeResult.badgeClass
                      )}
                    >
                      {activeResult.badge}
                    </span>
                    <span className="text-xs text-gray-400 italic">
                      {activeResult.titleEn}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {/* Monster Add to Combat Button */}
                    {activeResult.type === 'monster' && (
                      <button
                        type="button"
                        onClick={handleAddToCombat}
                        className="flex items-center gap-1 px-3 py-1 rounded bg-crimson/80 hover:bg-crimson text-white font-bold text-xs transition-all shadow-sm active:scale-95"
                        title={isEn ? "Add this creature to combat tracker" : "Добавить это существо в боевой трекер"}
                      >
                        {addedToCombat ? (
                          <>
                            <Check className="h-3.5 w-3.5 text-emerald-300" />
                            <span>{isEn ? "Added!" : "Добавлено!"}</span>
                          </>
                        ) : (
                          <>
                            <Plus className="h-3.5 w-3.5" />
                            <span>{isEn ? "To Combat" : "В бой"}</span>
                          </>
                        )}
                      </button>
                    )}

                    {/* Add to Notes Button */}
                    <button
                      type="button"
                      onClick={handleAddToNotes}
                      className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#1f2933] border border-[#2e3b46] hover:border-gold text-xs text-gray-200 transition-colors"
                      title={isEn ? "Save to GM notes" : "Сохранить в заметки Мастера"}
                    >
                      {addedToNotes ? (
                        <>
                          <Check className="h-3.5 w-3.5 text-emerald-400" />
                          <span className="text-emerald-400">{isEn ? "In Notes" : "В заметках"}</span>
                        </>
                      ) : (
                        <>
                          <FileText className="h-3.5 w-3.5 text-gold" />
                          <span>{isEn ? "To Notes" : "В заметки"}</span>
                        </>
                      )}
                    </button>

                    {/* Copy Markdown Button */}
                    <button
                      type="button"
                      onClick={handleCopyMarkdown}
                      className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#1f2933] border border-[#2e3b46] hover:border-gold text-xs text-gray-200 transition-colors"
                      title={isEn ? "Copy description to clipboard" : "Скопировать описание в буфер обмена"}
                    >
                      {copied ? (
                        <>
                          <Check className="h-3.5 w-3.5 text-emerald-400" />
                          <span className="text-emerald-400">{isEn ? "Copied" : "Скопировано"}</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-3.5 w-3.5" />
                          <span>{isEn ? "Copy" : "Скопировать"}</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Content Renderer by Type */}
                <div className="flex-1 space-y-3">
                  {/* Type 1: Monster Preview */}
                  {activeResult.type === 'monster' && (
                    <MonsterPreview monster={activeResult.data as ParsedMonster} />
                  )}

                  {/* Type 2: Spell Preview */}
                  {activeResult.type === 'spell' && (
                    <SpellPreview spell={activeResult.data as ParsedSpell} />
                  )}

                  {/* Type 3: Item Preview */}
                  {activeResult.type === 'item' && (
                    <ItemPreview item={activeResult.data as ParsedItem} />
                  )}

                  {/* Type 4: Condition Preview */}
                  {activeResult.type === 'condition' && (
                    <ConditionPreview condition={activeResult.data as ConditionInfo} />
                  )}

                  {/* Type 5: Rule Preview */}
                  {activeResult.type === 'rule' && (
                    <RulePreview rule={activeResult.data as Dnd2024RuleItem} />
                  )}
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-gray-500">
                <Search className="h-12 w-12 stroke-[1.5] mb-2 opacity-50 text-gold" />
                <p className="text-sm font-serif">{isEn ? "Select an item from the list on the left to preview" : "Выберите элемент из списка слева для предпросмотра"}</p>
                <p className="text-xs text-gray-500 mt-1">{isEn ? "Use navigation arrows" : "Используйте стрелки навигации"}</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer Navigation Bar */}
        <div className="flex items-center justify-between px-4 py-2 bg-[#0e1419] border-t border-[#2e3b46] text-[11px] text-gray-400 flex-shrink-0">
          <div className="flex items-center gap-3">
            <span>
              {isEn ? "Found results: " : "Найдено результатов: "}<strong className="text-gold-light">{results.length}</strong>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="hidden sm:inline">{isEn ? "Navigation:" : "Навигация:"}</span>
            <kbd className="px-1.5 py-0.5 rounded bg-[#1c262f] border border-[#2e3b46] font-mono text-[10px] text-gray-300 inline-flex items-center">
              <ArrowUp className="h-3 w-3" />
            </kbd>
            <kbd className="px-1.5 py-0.5 rounded bg-[#1c262f] border border-[#2e3b46] font-mono text-[10px] text-gray-300 inline-flex items-center">
              <ArrowDown className="h-3 w-3" />
            </kbd>
            <kbd className="px-1.5 py-0.5 rounded bg-[#1c262f] border border-[#2e3b46] font-mono text-[10px] text-gray-300">
              ESC
            </kbd>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ================= SUB-RENDERERS FOR RICH PREVIEW ================= */

function MonsterPreview({ monster: m }: { monster: ParsedMonster }) {
  const isEn = useSettingsStore((s) => s.language === 'en');
  const stats = [
    { label: isEn ? 'STR' : 'СИЛ', score: m.str },
    { label: isEn ? 'DEX' : 'ЛОВ', score: m.dex },
    { label: isEn ? 'CON' : 'ТЕЛ', score: m.con },
    { label: isEn ? 'INT' : 'ИНТ', score: m.intellect },
    { label: isEn ? 'WIS' : 'МДР', score: m.wis },
    { label: isEn ? 'CHA' : 'ХАР', score: m.cha },
  ];

  return (
    <div className="space-y-3 font-sans">
      <div>
        <h2 className="text-xl font-bold font-serif text-white tracking-wide">
          {cleanRussianText(m.name_ru || m.name_en)}
        </h2>
        <p className="text-xs text-gray-400 italic font-serif">
          {cleanRussianText(m.size_ru || m.size)} {cleanRussianText(m.creature_type_ru || m.creature_type)}, {cleanRussianText(m.alignment || 'без мировоззрения')}
        </p>
      </div>

      {/* Quick 4-box stat strip */}
      <div className="grid grid-cols-4 gap-2 bg-[#10171d] p-2.5 rounded border border-[#2e3b46] text-center">
        <div>
          <span className="text-[10px] text-gray-400 uppercase font-bold block">{isEn ? "Armor Class" : "Класс брони"}</span>
          <span className="text-sm font-bold text-gold-light font-mono">{m.ac}</span>
        </div>
        <div>
          <span className="text-[10px] text-gray-400 uppercase font-bold block">{isEn ? "Hit Points" : "Хиты"}</span>
          <span className="text-sm font-bold text-red-300 font-mono">
            {m.hp_average} <span className="text-[10px] text-gray-500">({m.hp_formula || ''})</span>
          </span>
        </div>
        <div>
          <span className="text-[10px] text-gray-400 uppercase font-bold block">{isEn ? "Speed" : "Скорость"}</span>
          <span className="text-sm font-bold text-gray-200 font-mono">{cleanRussianText(m.speed || '30 фт.')}</span>
        </div>
        <div>
          <span className="text-[10px] text-gray-400 uppercase font-bold block">{isEn ? "Challenge (CR)" : "Опасность (CR)"}</span>
          <span className="text-sm font-bold text-amber-300 font-mono">{m.cr}</span>
        </div>
      </div>

      {/* Ability Score Boxes */}
      <div className="grid grid-cols-6 gap-1 text-center">
        {stats.map((st) => (
          <div key={st.label} className="bg-[#121920] p-1.5 rounded border border-[#283540]">
            <span className="text-[9px] font-bold text-gray-400 block">{st.label}</span>
            <span className="text-xs font-bold text-gold-light font-mono">{formatMod(st.score)}</span>
            <span className="text-[10px] text-gray-400 font-mono block">({st.score})</span>
          </div>
        ))}
      </div>

      {/* Traits */}
      {m.traits && m.traits.length > 0 && (
        <div className="space-y-1.5 pt-2 border-t border-[#2e3b46]">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">{isEn ? "Traits" : "Особенности"}</span>
          {m.traits.map((t, idx) => (
            <div key={idx} className="text-xs leading-relaxed">
              <strong className="text-gold-light font-serif">{cleanRussianText(t.name)}. </strong>
              <span className="text-gray-300">{cleanRussianText(t.desc)}</span>
            </div>
          ))}
        </div>
      )}

      {/* Actions */}
      {m.actions && m.actions.length > 0 && (
        <div className="space-y-2 pt-2 border-t border-[#2e3b46]">
          <span className="text-[10px] font-bold text-red-400 uppercase tracking-wider block">{isEn ? "Actions" : "Действия"}</span>
          {m.actions.map((act, idx) => (
            <div key={idx} className="p-2 rounded bg-[#10161b] border border-[#283540] space-y-1 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-serif font-bold text-white text-xs">{cleanRussianText(act.name)}</span>
                {act.damage_dice && (
                  <span className="px-1.5 py-0.2 rounded bg-red-950/60 border border-red-500/40 text-red-200 text-[10px] font-mono">
                    {act.damage_dice}
                  </span>
                )}
              </div>
              {act.desc && <p className="text-gray-300 leading-relaxed text-[11px]">{cleanRussianText(act.desc)}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SpellPreview({ spell: s }: { spell: ParsedSpell }) {
  const isEn = useSettingsStore((s) => s.language === 'en');
  const lvl = s.level === 0 ? 'Заговор' : `${s.level} круг`;

  return (
    <div className="space-y-3 font-sans">
      <div>
        <h2 className="text-xl font-bold font-serif text-white tracking-wide">
          {cleanRussianText(s.name_ru || s.name_en)}
        </h2>
        <p className="text-xs text-blue-300 font-serif italic">
          {lvl}, школа {cleanRussianText(s.school_ru || s.school)}
        </p>
      </div>

      {/* Metadata strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-[#10171d] p-2.5 rounded border border-[#2e3b46] text-xs">
        <div>
          <span className="text-[10px] text-gray-400 font-bold block">{isEn ? "Casting Time" : "Время накладывания"}</span>
          <span className="text-gray-200 font-medium">{s.casting_time}</span>
        </div>
        <div>
          <span className="text-[10px] text-gray-400 font-bold block">{isEn ? "Range" : "Дистанция"}</span>
          <span className="text-gray-200 font-medium">{s.range}</span>
        </div>
        <div>
          <span className="text-[10px] text-gray-400 font-bold block">{isEn ? "Duration" : "Длительность"}</span>
          <span className="text-gray-200 font-medium">
            {s.duration}
            {s.concentration && <span className="text-amber-400 ml-1">(Конц.)</span>}
          </span>
        </div>
        <div>
          <span className="text-[10px] text-gray-400 font-bold block">{isEn ? "Components" : "Компоненты"}</span>
          <span className="text-gray-200 font-mono text-[11px]">
            {[s.components_v && 'В', s.components_s && 'С', s.components_m && 'М'].filter(Boolean).join(', ')}
          </span>
        </div>
      </div>

      {s.materials_ru && (
        <div className="text-[11px] text-gray-400 bg-[#10151a] p-2 rounded border border-[#283540] italic">
          Материалы: {cleanRussianText(s.materials_ru)}
        </div>
      )}

      {/* Description */}
      <div className="text-xs text-gray-200 leading-relaxed font-serif whitespace-pre-line space-y-2 pt-2 border-t border-[#2e3b46]">
        <p>{cleanRussianText(s.description_ru)}</p>
      </div>

      {/* Higher levels */}
      {s.higher_levels_ru && (
        <div className="pt-2 border-t border-[#2e3b46] text-xs">
          <strong className="text-gold-light font-serif">На более высоких кругах: </strong>
          <span className="text-gray-300 font-serif leading-relaxed">{cleanRussianText(s.higher_levels_ru)}</span>
        </div>
      )}
    </div>
  );
}

function ItemPreview({ item: it }: { item: ParsedItem }) {
  const isEn = useSettingsStore((s) => s.language === 'en');
  return (
    <div className="space-y-3 font-sans">
      <div>
        <h2 className="text-xl font-bold font-serif text-white tracking-wide">
          {cleanRussianText(it.name_ru || it.name_en)}
        </h2>
        <p className="text-xs text-amber-300 font-serif italic">
          {cleanRussianText(it.category || 'Предмет')}, {cleanRussianText(it.rarity || 'Обычный')}
          {it.attunement ? ' (требуется настройка)' : ''}
        </p>
      </div>

      {/* Details Box */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-[#10171d] p-2.5 rounded border border-[#2e3b46] text-xs">
        <div>
          <span className="text-[10px] text-gray-400 font-bold block">{isEn ? "Cost" : "Стоимость"}</span>
          <span className="text-gold-light font-bold font-mono">
            {it.cost_gp !== null ? `${it.cost_gp} зм` : '—'}
          </span>
        </div>
        <div>
          <span className="text-[10px] text-gray-400 font-bold block">{isEn ? "Weight" : "Вес"}</span>
          <span className="text-gray-200 font-medium">
            {it.weight_lb !== null ? `${it.weight_lb} фнт` : '—'}
          </span>
        </div>
        <div>
          <span className="text-[10px] text-gray-400 font-bold block">{isEn ? "Damage / AC" : "Урон / КД"}</span>
          <span className="text-gray-200 font-mono">
            {it.damage_formula || it.ac || '—'}
          </span>
        </div>
        <div>
          <span className="text-[10px] text-gray-400 font-bold block">{isEn ? "Mastery" : "Мастерство"}</span>
          <span className="text-emerald-300 font-medium">
            {cleanRussianText(it.weapon_mastery_ru || it.weapon_mastery || '—')}
          </span>
        </div>
      </div>

      {/* Description */}
      <div className="text-xs text-gray-200 leading-relaxed font-serif whitespace-pre-line space-y-2 pt-2 border-t border-[#2e3b46]">
        <p>{isEn ? (it.description_en || it.description_ru || "No description") : cleanRussianText(it.description_ru || it.description_en || "Нет описания")}</p>
      </div>
    </div>
  );
}

function ConditionPreview({ condition: c }: { condition: ConditionInfo }) {
  const isEn = useSettingsStore((s) => s.language === 'en');
  return (
    <div className="space-y-3 font-sans">
      <div className="flex items-center gap-2">
        <h2 className="text-xl font-bold font-serif text-white tracking-wide">
          {c.nameRu}
        </h2>
        <span className="text-xs text-gray-400 font-mono">({c.nameEn})</span>
      </div>

      <div className="p-4 rounded bg-[#10171d] border border-[#2e3b46] space-y-3">
        <div className="flex items-center gap-2">
          <span
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: c.badgeColor }}
          />
          <span className="text-xs font-bold uppercase tracking-wider text-gray-300">
            {isEn ? "Condition Rules" : "Механика состояния D&D 2024"}
          </span>
        </div>

        <p className="text-xs text-gray-200 leading-relaxed font-serif whitespace-pre-line">
          {c.descriptionRu}
        </p>

        {c.descriptionEn && (
          <p className="text-[11px] text-gray-400 leading-relaxed italic border-t border-[#283540] pt-2">
            {c.descriptionEn}
          </p>
        )}
      </div>
    </div>
  );
}

function RulePreview({ rule: r }: { rule: Dnd2024RuleItem }) {
  const isEn = useSettingsStore((s) => s.language === 'en');
  return (
    <div className="space-y-3 font-sans">
      <div>
        <h2 className="text-xl font-bold font-serif text-white tracking-wide">
          {r.nameRu}
        </h2>
        <p className="text-xs text-emerald-300 font-serif italic">
          {r.categoryRu} • {r.source || "Player's Handbook 2024"}
        </p>
      </div>

      {r.triggerRu && (
        <div className="text-xs bg-[#10171d] p-2.5 rounded border border-[#2e3b46] flex items-center gap-2">
          <span className="text-gold font-bold">{isEn ? "Trigger:" : "Срабатывание:"}</span>
          <span className="text-gray-200">{r.triggerRu}</span>
        </div>
      )}

      {/* Summary */}
      <div className="p-3 rounded bg-emerald-950/30 border border-emerald-500/40 text-xs text-emerald-200 font-medium">
        {r.summaryRu}
      </div>

      {/* Detailed Description */}
      <div className="text-xs text-gray-200 leading-relaxed font-serif whitespace-pre-line space-y-2 pt-2 border-t border-[#2e3b46]">
        <p>{r.descriptionRu}</p>
      </div>
    </div>
  );
}
