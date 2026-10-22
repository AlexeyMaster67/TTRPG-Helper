import { useState, useEffect, useMemo, useRef } from 'react';
import {
  Search,
  Plus,
  X,
  Sparkles,
  BookOpen,
  FileText,
  Shield,
  Trash2,
  Copy,
  Folder,
  FolderPlus,
  Check,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
} from 'lucide-react';
import { DatabaseService } from '../../services/dbService';
import { ParsedMonster } from '../../types/database';
import { useCombatStore } from '../../store/combatStore';
import { lssImportService } from '../../services/lssImportService';
import {
  cleanRussianText,
  localizeCreatureType,
  localizeMonsterName,
  formatSpeed,
  localizeSenses,
} from '../../utils/textUtils';
import { useTranslation } from '../../i18n';
import { homebrewService } from '../../services/homebrewService';
import { HomebrewMonsterModal } from './HomebrewMonsterModal';
import { CreatureSize, CREATURE_SIZE_SCALE } from '../../types/dnd5e';

// Fallback sample monsters when offline or DB not yet connected
const FALLBACK_MONSTERS: Partial<ParsedMonster>[] = [
  {
    id: 'vampire',
    name_ru: 'Вампир',
    name_en: 'Vampire',
    cr: '13',
    creature_type_ru: 'нежить',
    ac: 16,
    hp_average: 195,
    init_bonus: 14,
    speed: '30 фт., лазание 30 фт.',
    size: 'Medium',
    size_ru: 'Средний',
  },
  {
    id: 'guard',
    name_ru: 'Стражник',
    name_en: 'Guard',
    cr: '1/8',
    creature_type_ru: 'гуманоид',
    ac: 16,
    hp_average: 11,
    init_bonus: 1,
    speed: '30 фт.',
    size: 'Medium',
    size_ru: 'Средний',
  },
  {
    id: 'goblin',
    name_ru: 'Гоблин',
    name_en: 'Goblin',
    cr: '1/4',
    creature_type_ru: 'гуманоид',
    ac: 15,
    hp_average: 7,
    init_bonus: 2,
    speed: '30 фт.',
    size: 'Small',
    size_ru: 'Маленький',
  },
  {
    id: 'skeleton',
    name_ru: 'Скелет',
    name_en: 'Skeleton',
    cr: '1/4',
    creature_type_ru: 'нежить',
    ac: 13,
    hp_average: 13,
    init_bonus: 2,
    speed: '30 фт.',
    size: 'Medium',
    size_ru: 'Средний',
  },
  {
    id: 'zombie',
    name_ru: 'Зомби',
    name_en: 'Zombie',
    cr: '1/4',
    creature_type_ru: 'нежить',
    ac: 8,
    hp_average: 22,
    init_bonus: -2,
    speed: '20 фт.',
    size: 'Medium',
    size_ru: 'Средний',
  },
  {
    id: 'ogre',
    name_ru: 'Огр',
    name_en: 'Ogre',
    cr: '2',
    creature_type_ru: 'великан',
    ac: 11,
    hp_average: 59,
    init_bonus: -1,
    speed: '40 фт.',
    size: 'Large',
    size_ru: 'Большой',
  },
  {
    id: 'red-dragon-adult',
    name_ru: 'Взрослый красный дракон',
    name_en: 'Adult Red Dragon',
    cr: '17',
    creature_type_ru: 'дракон',
    ac: 19,
    hp_average: 256,
    init_bonus: 10,
    speed: '40 фт., полёт 80 фт.',
    size: 'Huge',
    size_ru: 'Огромный',
  },
];

export function BestiaryLibrary() {
  const { language } = useTranslation();
  const isEn = language === 'en';
  const [query, setQuery] = useState('');
  const [monsters, setMonsters] = useState<ParsedMonster[]>([]);
  const [customMonsters, setCustomMonsters] = useState<ParsedMonster[]>(() =>
    homebrewService.getCustomMonstersSync()
  );
  const [isHomebrewModalOpen, setIsHomebrewModalOpen] = useState(false);
  const [editingMonsterData, setEditingMonsterData] = useState<Partial<ParsedMonster> | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [isDbReady, setIsDbReady] = useState(false);
  const addCombatant = useCombatStore((s) => s.addCombatant);

  // User folders & creature assignments
  const [selectedFolder, setSelectedFolder] = useState<string>('all');
  const [customFolders, setCustomFolders] = useState<{ id: string; label: string }[]>(() => {
    try {
      const saved = localStorage.getItem('bestiary_user_folders');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [creatureFolderMap, setCreatureFolderMap] = useState<Record<string, string[]>>(() => {
    try {
      const saved = localStorage.getItem('bestiary_creature_folders');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const [isNewFolderOpen, setIsNewFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [folderAssignMonster, setFolderAssignMonster] = useState<ParsedMonster | null>(null);
  const foldersRef = useRef<HTMLDivElement>(null);
  const categoriesRef = useRef<HTMLDivElement>(null);
  const [isCategoriesExpanded, setIsCategoriesExpanded] = useState(false);

  const handleCreateFolder = () => {
    const clean = newFolderName.trim();
    if (!clean) return;
    const newId = `folder-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const updated = [...customFolders, { id: newId, label: clean }];
    setCustomFolders(updated);
    localStorage.setItem('bestiary_user_folders', JSON.stringify(updated));
    setSelectedFolder(newId);
    setNewFolderName('');
    setIsNewFolderOpen(false);
  };

  const handleToggleMonsterFolder = (monsterId: string, folderId: string) => {
    setCreatureFolderMap((prev) => {
      const current = prev[monsterId] || [];
      const next = current.includes(folderId)
        ? current.filter((f) => f !== folderId)
        : [...current, folderId];
      const updated = { ...prev, [monsterId]: next };
      localStorage.setItem('bestiary_creature_folders', JSON.stringify(updated));
      return updated;
    });
  };

  const handleCloneMonster = (monster: ParsedMonster, e: React.MouseEvent) => {
    e.stopPropagation();
    const rawName = cleanRussianText(localizeMonsterName(monster.name_ru || monster.name_en));
    setEditingMonsterData({
      ...monster,
      id: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name_ru: `${rawName} (Копия)`,
      name_en: monster.name_en ? `${monster.name_en} (Copy)` : `${rawName} (Копия)`,
      is_custom: true,
    });
    setIsHomebrewModalOpen(true);
  };

  const FOLDERS: { id: string; label: string }[] = useMemo(() => [
    { id: 'all', label: isEn ? 'All Folders' : 'Все папки' },
    { id: 'dungeon', label: isEn ? 'Dungeon' : 'Подземелье' },
    { id: 'forest', label: isEn ? 'Forest' : 'Лес' },
    { id: 'bosses', label: isEn ? 'Bosses' : 'Боссы' },
    { id: 'custom', label: isEn ? 'Custom' : 'Пользовательские' },
    ...customFolders,
  ], [customFolders, isEn]);

  useEffect(() => {
    let isMounted = true;
    homebrewService.getCustomMonsters().then((list) => {
      if (isMounted) setCustomMonsters(list);
    });

    const handleUpdate = (e: any) => {
      if (e.detail && Array.isArray(e.detail)) {
        setCustomMonsters(e.detail);
      } else {
        setCustomMonsters(homebrewService.getCustomMonstersSync());
      }
    };

    window.addEventListener('custom-monsters-updated', handleUpdate);
    return () => {
      isMounted = false;
      window.removeEventListener('custom-monsters-updated', handleUpdate);
    };
  }, []);

  useEffect(() => {
    let isMounted = true;
    async function initMonsters() {
      setLoading(true);
      try {
        const dbService = DatabaseService.getInstance();
        const results = await dbService.searchMonsters('', 100);
        if (isMounted) {
          if (results && results.length > 0) {
            setMonsters(results);
            setIsDbReady(true);
          } else {
            setMonsters(FALLBACK_MONSTERS as ParsedMonster[]);
          }
        }
      } catch (err) {
        console.warn('Could not query monsters from SQLite:', err);
        if (isMounted) {
          setMonsters(FALLBACK_MONSTERS as ParsedMonster[]);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    initMonsters();
    return () => {
      isMounted = false;
    };
  }, []);

  // Live filter when search query changes
  useEffect(() => {
    let isMounted = true;
    const timer = setTimeout(async () => {
      if (!isDbReady) return;
      try {
        const results = await DatabaseService.getInstance().searchMonsters(query, 100);
        if (isMounted && results) {
          setMonsters(results);
        }
      } catch (e) {
        console.warn('Search query failed:', e);
      }
    }, 150);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [query, isDbReady]);

  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedCrRange, setSelectedCrRange] = useState<string>('all');

  const CATEGORIES: { id: string; label: string; keywords: string[] }[] = useMemo(() => [
    { id: 'all', label: isEn ? 'All Types' : 'Все', keywords: [] },
    { id: 'humanoid', label: isEn ? 'Humanoids' : 'Гуманоиды', keywords: ['гуманоид', 'humanoid'] },
    { id: 'undead', label: isEn ? 'Undead' : 'Нежить', keywords: ['нежить', 'undead'] },
    { id: 'beast', label: isEn ? 'Beasts' : 'Звери', keywords: ['зверь', 'beast'] },
    { id: 'dragon', label: isEn ? 'Dragons' : 'Драконы', keywords: ['дракон', 'dragon'] },
    { id: 'giant', label: isEn ? 'Giants' : 'Великаны', keywords: ['великан', 'giant'] },
    { id: 'fiend', label: isEn ? 'Fiends' : 'Исчадия', keywords: ['исчадие', 'fiend'] },
    { id: 'aberration', label: isEn ? 'Aberrations' : 'Аберрации', keywords: ['аберрация', 'aberration'] },
    { id: 'elemental', label: isEn ? 'Elementals' : 'Элементали', keywords: ['элементаль', 'elemental'] },
    { id: 'fey', label: isEn ? 'Fey' : 'Феи', keywords: ['фея', 'fey'] },
    { id: 'construct', label: isEn ? 'Constructs' : 'Конструкты', keywords: ['конструкт', 'construct'] },
    { id: 'monstrosity', label: isEn ? 'Monstrosities' : 'Чудовища', keywords: ['чудовище', 'монстр', 'monstrosity', 'monster'] },
    { id: 'celestial', label: isEn ? 'Celestials' : 'Небожители', keywords: ['небожитель', 'celestial'] },
    { id: 'ooze', label: isEn ? 'Oozes' : 'Слизи', keywords: ['слизь', 'ooze'] },
    { id: 'plant', label: isEn ? 'Plants' : 'Растения', keywords: ['растение', 'plant'] },
  ], [isEn]);

  const CR_RANGES = useMemo(() => [
    { id: 'all', label: isEn ? 'All CR' : 'Все КО' },
    { id: '0-1', label: isEn ? 'CR 0–1' : 'КО 0–1' },
    { id: '2-4', label: isEn ? 'CR 2–4' : 'КО 2–4' },
    { id: '5-10', label: isEn ? 'CR 5–10' : 'КО 5–10' },
    { id: '11+', label: isEn ? 'CR 11+' : 'КО 11+' },
  ], [isEn]);

  const parseCr = (crStr?: string | number): number => {
    if (crStr === undefined || crStr === null) return 0;
    const clean = String(crStr).trim().replace(/\s+/g, '');
    if (clean === '1/8') return 0.125;
    if (clean === '1/4') return 0.25;
    if (clean === '1/2') return 0.5;
    const match = clean.match(/^(\d+)\/(\d+)$/);
    if (match) {
      return parseInt(match[1], 10) / parseInt(match[2], 10);
    }
    const n = parseFloat(clean);
    return isNaN(n) ? 0 : n;
  };

  // Merge custom monsters with DB monsters, prioritizing custom creatures
  const combinedMonsters = useMemo(() => {
    const customIds = new Set(customMonsters.map((c) => c.id));
    const filteredDb = monsters.filter((m) => !customIds.has(m.id));
    return [...customMonsters, ...filteredDb];
  }, [customMonsters, monsters]);

  // Filter with query, folder, category, and CR range
  const filteredList = useMemo(() => {
    let list = combinedMonsters;
    const lower = query.trim().toLowerCase();
    if (lower) {
      list = list.filter(
        (m) =>
          m.name_ru?.toLowerCase().includes(lower) ||
          m.name_en?.toLowerCase().includes(lower) ||
          m.cr?.toLowerCase().includes(lower) ||
          m.creature_type_ru?.toLowerCase().includes(lower) ||
          m.creature_type?.toLowerCase().includes(lower)
      );
    }

    // Filter by campaign folder
    if (selectedFolder !== 'all') {
      list = list.filter((m) => {
        // Explicit assignment in user map
        const assigned = creatureFolderMap[m.id];
        if (assigned && assigned.includes(selectedFolder)) return true;

        // Fallback heuristics for default folders
        if (selectedFolder === 'custom') {
          return !!m.is_custom;
        }
        if (selectedFolder === 'bosses') {
          return parseCr(m.cr) >= 10 || (m.legendary_actions && m.legendary_actions.length > 0);
        }
        if (selectedFolder === 'dungeon') {
          const type = (m.creature_type_ru || m.creature_type || '').toLowerCase();
          const name = (m.name_ru || m.name_en || '').toLowerCase();
          return (
            type.includes('аберрация') ||
            type.includes('слизь') ||
            type.includes('конструкт') ||
            type.includes('нежить') ||
            type.includes('чудовище') ||
            name.includes('гоблин') ||
            name.includes('скелет') ||
            name.includes('паук') ||
            name.includes('зомби') ||
            name.includes('кобольд') ||
            name.includes('мимик')
          );
        }
        if (selectedFolder === 'forest') {
          const type = (m.creature_type_ru || m.creature_type || '').toLowerCase();
          const name = (m.name_ru || m.name_en || '').toLowerCase();
          return (
            type.includes('зверь') ||
            type.includes('фея') ||
            type.includes('растение') ||
            name.includes('волк') ||
            name.includes('медведь') ||
            name.includes('друид') ||
            name.includes('эльф')
          );
        }
        return false;
      });
    }

    if (selectedType !== 'all') {
      const cat = CATEGORIES.find((c) => c.id === selectedType);
      const keywords = cat ? cat.keywords : [selectedType];
      list = list.filter((m) => {
        const typeRu = (m.creature_type_ru || '').toLowerCase();
        const typeEn = (m.creature_type || '').toLowerCase();
        return keywords.some((k) => typeRu.includes(k) || typeEn.includes(k));
      });
    }

    if (selectedCrRange !== 'all') {
      list = list.filter((m) => {
        const crVal = parseCr(m.cr);
        if (selectedCrRange === '0-1') return crVal <= 1;
        if (selectedCrRange === '2-4') return crVal >= 2 && crVal <= 4;
        if (selectedCrRange === '5-10') return crVal >= 5 && crVal <= 10;
        if (selectedCrRange === '11+') return crVal >= 11;
        return true;
      });
    }

    return list;
  }, [combinedMonsters, query, selectedFolder, selectedType, selectedCrRange, creatureFolderMap]);

  const handleAddMonster = (monster: ParsedMonster) => {
    // Automated initiative roll: d20 + init_bonus
    const d20 = Math.floor(Math.random() * 20) + 1;
    const initBonus = monster.init_bonus || 0;
    const rolledInitiative = d20 + initBonus;
    const mSize = (monster.size as CreatureSize) || 'Medium';

    const monsterNameEn = monster.name_en || localizeMonsterName(monster.name_ru, 'en') || monster.name_ru || '';
    const monsterNameRu = cleanRussianText(monster.name_ru || localizeMonsterName(monster.name_en, 'ru') || monster.name_en || '');
    const activeName = isEn ? monsterNameEn : monsterNameRu;
    const activeType = localizeCreatureType(isEn ? (monster.creature_type || monster.creature_type_ru) : (monster.creature_type_ru || monster.creature_type), language);
    const speed = formatSpeed(monster.speed, language);

    addCombatant({
      name: activeName,
      nameRu: monsterNameRu,
      cr: monster.cr,
      creatureType: activeType,
      size: mSize,
      tokenScale: CREATURE_SIZE_SCALE[mSize] || 1.0,
      tokenUrl: (monster as any).token_url,
      avatarUrl: (monster as any).token_url,
      hp: monster.hp_average || 10,
      maxHp: monster.hp_average || 10,
      ac: monster.ac || 10,
      initiative: rolledInitiative,
      initBonus: initBonus,
      speed: speed,
      color: '#C5A059',
      statblock: monster,
    });
  };

  const lssFileRef = useRef<HTMLInputElement>(null);

  const handleImportLss = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    for (let i = 0; i < e.target.files.length; i++) {
      const file = e.target.files[i];
      try {
        const text = await file.text();
        const fallbackName = file.name.replace(/\.json$/i, '');
        const parsed = lssImportService.parseLssJson(text, fallbackName);
        addCombatant(lssImportService.toCombatant(parsed));
      } catch (err) {
        console.error('Error importing LSS into combat:', err);
      }
    }
    e.target.value = '';
  };

  return (
    <div className="h-full flex flex-col select-none overflow-hidden">
      {/* Верхний заголовок панели Бестиария */}
      <div className="p-3 border-b border-[rgba(255,255,255,0.08)] bg-[rgba(14,18,25,0.5)] flex flex-col gap-2.5">
        <div className="flex items-center justify-between gap-1.5">
          <div className="flex items-center gap-1.5 min-w-0">
            <BookOpen className="h-4 w-4 text-[#f5b920] shrink-0" />
            <span className="text-xs font-bold uppercase tracking-wider text-white whitespace-nowrap">
              {isEn ? 'Bestiary' : 'Бестиарий'}
            </span>
            <span className="text-[10px] font-mono font-bold text-amber-300/90 bg-amber-950/50 px-1.5 py-0.5 rounded-full border border-amber-500/30 shrink-0">
              {filteredList.length}
            </span>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => setIsHomebrewModalOpen(true)}
              title={isEn ? 'Create custom creature' : 'Создать своё существо'}
              className="min-h-[28px] px-2 py-0.5 rounded-full bg-gradient-to-r from-[#7a2016] to-[#991b1b] hover:from-[#94271c] hover:to-[#b91c1c] border border-red-500/50 text-white font-sans text-xs font-semibold flex items-center gap-1 transition-all shadow-sm active:scale-95 cursor-pointer whitespace-nowrap"
            >
              <Sparkles className="h-3.5 w-3.5 text-[#f5b920]" />
              <span>{isEn ? '+ Custom' : '+ Своё'}</span>
            </button>
            <button
              onClick={() => lssFileRef.current?.click()}
              title={isEn ? 'Import character from Long Story Short (.json) directly into combat' : 'Импортировать персонажа из Long Story Short (.json) прямо в бой'}
              className="min-h-[28px] px-2 py-0.5 rounded-full bg-emerald-950/70 hover:bg-emerald-900/80 border border-emerald-600/60 hover:border-emerald-500 text-emerald-200 font-sans text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer whitespace-nowrap"
            >
              <FileText className="h-3.5 w-3.5 text-emerald-400" />
              <span>{isEn ? '+ LSS' : '+ Файл'}</span>
            </button>
            <input
              ref={lssFileRef}
              type="file"
              accept=".json"
              multiple
              onChange={handleImportLss}
              className="hidden"
            />
          </div>
        </div>

        {/* Поисковая строка с изоляцией фокуса */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={isEn ? "Search bestiary (name, type, CR)..." : "Поиск существа в бестиарии..."}
            className="w-full min-h-[34px] pl-9 pr-8 bg-[rgba(20,25,35,0.7)] hover:bg-[rgba(24,30,42,0.85)] border border-[rgba(255,255,255,0.08)] focus:border-[#f5b920]/70 rounded-glass text-xs text-gray-100 placeholder:text-gray-500 focus:outline-none focus:ring-1 focus:ring-[#f5b920]/40 focus:shadow-[0_0_12px_rgba(245,185,32,0.2)] transition-all font-sans"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200 p-1 cursor-pointer"
              title={isEn ? "Clear search" : "Очистить поиск"}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Папки кампании (Кастомные папки Бестиария) */}
        <div className="relative group/folders w-full min-w-0 flex items-center">
          <button
            type="button"
            onClick={() => foldersRef.current?.scrollBy({ left: -140, behavior: 'smooth' })}
            className="w-5 h-6 rounded flex items-center justify-center text-gray-400 hover:text-amber-300 hover:bg-white/5 shrink-0 transition-colors cursor-pointer mr-0.5"
            title={isEn ? "Scroll folders left" : "Прокрутить папки назад"}
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>

          <div
            ref={foldersRef}
            onWheel={(e) => {
              if (e.deltaY !== 0) {
                e.currentTarget.scrollLeft += e.deltaY;
              }
            }}
            className="flex-1 flex items-center gap-1.5 overflow-x-auto scrollbar-thin scrollbar-thumb-white/10 hover:scrollbar-thumb-amber-500/30 scrollbar-track-transparent scroll-smooth py-1 px-0.5"
          >
            <div className="flex items-center gap-1 text-[11px] font-bold text-amber-400 uppercase tracking-wider shrink-0 mr-0.5">
              <Folder className="h-3.5 w-3.5 text-[#f5b920]" />
              <span>{isEn ? "Folders:" : "Папки:"}</span>
            </div>
            {FOLDERS.map((folder) => {
              const isSelected = selectedFolder === folder.id;
              return (
                <button
                  key={folder.id}
                  onClick={() => setSelectedFolder(folder.id)}
                  className={`min-h-[26px] px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap transition-all border cursor-pointer shrink-0 flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-amber-500/25 text-amber-200 border-amber-400/80 shadow-[0_0_12px_rgba(245,185,32,0.3)] font-semibold'
                      : 'bg-[rgba(255,255,255,0.03)] border-[rgba(255,255,255,0.08)] text-gray-400 hover:text-gray-200 hover:bg-[rgba(255,255,255,0.06)]'
                  }`}
                >
                  <span>{folder.label}</span>
                </button>
              );
            })}
            <button
              onClick={() => setIsNewFolderOpen(true)}
              title={isEn ? "Create new bestiary folder" : "Создать новую папку для монстров"}
              className="min-h-[26px] px-2 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all border border-dashed border-amber-500/40 text-amber-300 hover:bg-amber-950/40 hover:border-amber-400 cursor-pointer shrink-0 flex items-center gap-1"
            >
              <FolderPlus className="h-3 w-3" />
              <span>{isEn ? "+ Folder" : "+ Папка"}</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => foldersRef.current?.scrollBy({ left: 140, behavior: 'smooth' })}
            className="w-5 h-6 rounded flex items-center justify-center text-gray-400 hover:text-amber-300 hover:bg-white/5 shrink-0 transition-colors cursor-pointer ml-0.5"
            title={isEn ? "Scroll folders right" : "Прокрутить папки вперёд"}
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Чипы категорий (Pill-табы) с поддержкой разворачивания в сетку */}
        <div className="relative group/pills w-full min-w-0">
          <div className="flex items-center">
            {!isCategoriesExpanded && (
              <button
                type="button"
                onClick={() => categoriesRef.current?.scrollBy({ left: -140, behavior: 'smooth' })}
                className="w-5 h-6 rounded flex items-center justify-center text-gray-400 hover:text-[#fce79f] hover:bg-white/5 shrink-0 transition-colors cursor-pointer mr-0.5"
                title="Прокрутить назад"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
            )}

            <div
              ref={categoriesRef}
              onWheel={(e) => {
                if (!isCategoriesExpanded && e.deltaY !== 0) {
                  e.currentTarget.scrollLeft += e.deltaY;
                }
              }}
              className={`flex-1 ${
                isCategoriesExpanded
                  ? 'flex flex-wrap gap-1.5 py-1 px-0.5 max-h-[140px] overflow-y-auto scrollbar-thin'
                  : 'flex items-center gap-1.5 overflow-x-auto scrollbar-thin scrollbar-thumb-white/10 hover:scrollbar-thumb-amber-500/30 scrollbar-track-transparent scroll-smooth py-1 px-0.5'
              }`}
            >
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedType(cat.id)}
                  className={`min-h-[26px] px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap transition-all border cursor-pointer shrink-0 ${
                    selectedType === cat.id
                      ? 'bg-[#f5b920]/20 text-[#fce79f] border-[#f5b920]/60 shadow-[0_0_10px_rgba(245,185,32,0.25)] font-semibold'
                      : 'bg-[rgba(255,255,255,0.03)] border-[rgba(255,255,255,0.08)] text-gray-400 hover:text-gray-200 hover:bg-[rgba(255,255,255,0.06)]'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {!isCategoriesExpanded && (
              <button
                type="button"
                onClick={() => categoriesRef.current?.scrollBy({ left: 140, behavior: 'smooth' })}
                className="w-5 h-6 rounded flex items-center justify-center text-gray-400 hover:text-[#fce79f] hover:bg-white/5 shrink-0 transition-colors cursor-pointer ml-0.5"
                title="Прокрутить вперёд"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            )}

            <button
              type="button"
              onClick={() => setIsCategoriesExpanded((prev) => !prev)}
              className={`w-6 h-6 rounded flex items-center justify-center transition-colors cursor-pointer ml-1 shrink-0 ${
                isCategoriesExpanded
                  ? 'bg-amber-500/25 text-amber-300 border border-amber-500/50 shadow-[0_0_8px_rgba(245,185,32,0.3)]'
                  : 'text-gray-400 hover:text-amber-300 hover:bg-white/5'
              }`}
              title={isCategoriesExpanded ? 'Свернуть категории в одну строку' : 'Развернуть все категории'}
            >
              <LayoutGrid className="h-3 w-3" />
            </button>
          </div>
        </div>

        {/* Фильтры класса опасности (КО) */}
        <div className="relative group/cr w-full min-w-0">
          <div
            onWheel={(e) => {
              if (e.deltaY !== 0) {
                e.currentTarget.scrollLeft += e.deltaY;
              }
            }}
            className="flex items-center gap-1 overflow-x-auto scrollbar-thin scrollbar-thumb-white/10 hover:scrollbar-thumb-amber-500/30 scroll-smooth py-0.5 px-0.5"
          >
            {CR_RANGES.map((cr) => (
              <button
                key={cr.id}
                onClick={() => setSelectedCrRange(cr.id)}
                className={`min-h-[24px] px-2 py-0.5 rounded-full font-mono text-xs font-bold whitespace-nowrap transition-all border cursor-pointer shrink-0 ${
                  selectedCrRange === cr.id
                    ? 'bg-amber-950/70 text-amber-300 border-amber-500/60 shadow-[0_0_8px_rgba(245,158,11,0.25)]'
                    : 'bg-[rgba(255,255,255,0.03)] border-[rgba(255,255,255,0.06)] text-gray-400 hover:text-gray-200'
                }`}
              >
                {cr.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Список существ в виде аккуратных glass-карточек */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden p-2 space-y-1.5">
        {loading && monsters.length === 0 ? (
          <div className="p-6 text-center text-xs text-gray-400">
            {isEn ? 'Loading creatures catalog...' : 'Загрузка каталога существ...'}
          </div>
        ) : filteredList.length === 0 ? (
          <div className="p-6 text-center text-xs text-gray-400">
            {isEn ? 'No creatures found' : 'Существ не найдено'}
          </div>
        ) : (
          filteredList.map((monster) => {
            const monsterNameEn = monster.name_en || localizeMonsterName(monster.name_ru, 'en') || monster.name_ru || '';
            const monsterNameRu = cleanRussianText(monster.name_ru || localizeMonsterName(monster.name_en, 'ru') || monster.name_en || '');
            const activeDisplayName = isEn ? monsterNameEn : monsterNameRu;
            const creatureType = localizeCreatureType(isEn ? (monster.creature_type || monster.creature_type_ru) : (monster.creature_type_ru || monster.creature_type), language);
            const senses = localizeSenses(monster.senses, language);
            const speed = formatSpeed(monster.speed, language);
            const crLabel = isEn ? `CR ${monster.cr}` : `КО ${monster.cr}`;
            const acLabel = isEn ? `${monster.ac} AC` : `${monster.ac} КД`;
            const hpLabel = isEn ? `${monster.hp_average} HP` : `${monster.hp_average} ОЗ`;
            const assignedFolders = creatureFolderMap[monster.id] || [];

            return (
              <div
                key={monster.id}
                className="group flex items-center justify-between p-2 rounded-glass bg-[rgba(255,255,255,0.02)] hover:bg-[rgba(255,255,255,0.07)] border border-[rgba(255,255,255,0.06)] hover:border-[#f5b920]/40 transition-all duration-200 shadow-sm"
              >
                {/* Информация о существе - гарантированная изоляция от кнопок действий */}
                <div className="flex flex-col justify-center min-w-0 flex-1 pr-1.5 overflow-hidden">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span
                      className="text-xs font-bold text-gray-100 truncate group-hover:text-gold-light transition-colors min-w-0 flex-1"
                      title={activeDisplayName}
                    >
                      {activeDisplayName}
                    </span>
                    {monster.is_custom && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-950/80 text-amber-300 border border-[#f5b920]/60 shrink-0 whitespace-nowrap shadow-sm inline-flex items-center gap-1">
                        <Sparkles className="h-2.5 w-2.5 inline" />
                        <span>{isEn ? 'Custom' : 'Своё'}</span>
                      </span>
                    )}
                    {assignedFolders.length > 0 && (
                      <span
                        className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 shrink-0 whitespace-nowrap inline-flex items-center gap-1"
                        title={isEn ? `Folders: ${assignedFolders.map((fId) => FOLDERS.find((f) => f.id === fId)?.label || fId).join(', ')}` : `Папки: ${assignedFolders.map((fId) => FOLDERS.find((f) => f.id === fId)?.label || fId).join(', ')}`}
                      >
                        <Folder className="h-2.5 w-2.5 inline" />
                        <span>{assignedFolders.length}</span>
                      </span>
                    )}
                    {monster.cr && (
                      <span className="text-[11px] font-mono font-bold px-1.5 py-0.5 rounded-full bg-black/50 border border-[#f5b920]/30 text-amber-300 shrink-0 whitespace-nowrap leading-none">
                        {crLabel}
                      </span>
                    )}
                  </div>
                  
                  {/* Строка 2: Тип существа (плавно сжимается с многоточием), КД и ОЗ (никогда не перекрывают кнопки) */}
                  <div className="flex items-center gap-1 text-[11px] text-gray-400 font-sans min-w-0 mt-1 overflow-hidden">
                    <span
                      className="truncate flex-1 min-w-0 text-gray-300 text-[11px]"
                      title={isEn ? `Type: ${creatureType}` : `Тип: ${creatureType}`}
                    >
                      {creatureType}
                    </span>
                    <span className="text-gray-600 shrink-0 text-[10px]">•</span>
                    <span
                      className="inline-flex items-center gap-0.5 text-[10.5px] font-mono font-bold text-gray-200 shrink-0 whitespace-nowrap bg-black/50 px-1.5 py-0.5 rounded border border-[rgba(255,255,255,0.08)] leading-none"
                      title={isEn ? `Armor Class: ${acLabel}` : `Класс доспеха: ${acLabel}`}
                    >
                      <Shield className="h-2.5 w-2.5 text-[#f5b920] shrink-0" />
                      <span>{acLabel}</span>
                    </span>
                    <span className="text-gray-600 shrink-0 text-[10px]">•</span>
                    <span
                      className="inline-flex items-center gap-0.5 text-[10.5px] font-mono font-bold text-emerald-300 shrink-0 whitespace-nowrap bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-800/60 leading-none"
                      title={isEn ? `Hit Points: ${hpLabel} • Speed: ${speed}${monster.senses ? ` • Senses: ${senses}` : ''}` : `Хиты: ${hpLabel} • Скорость: ${speed}${monster.senses ? ` • Чувства: ${senses}` : ''}`}
                    >
                      <span>{hpLabel}</span>
                    </span>
                  </div>
                </div>

                {/* Кнопки действий: Папка, Клонировать, Удалить (если своё), Добавить в бой */}
                <div className="flex items-center gap-1 flex-shrink-0 z-10 pl-1">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setFolderAssignMonster(monster);
                    }}
                    title={isEn ? `Assign folder for "${activeDisplayName}"` : `Назначить папку для «${activeDisplayName}»`}
                    className="flex items-center justify-center w-6 h-6 rounded-full bg-[rgba(255,255,255,0.04)] hover:bg-amber-500/20 border border-[rgba(255,255,255,0.08)] hover:border-amber-400 text-gray-400 hover:text-amber-300 opacity-60 group-hover:opacity-100 transition-all cursor-pointer"
                  >
                    <Folder className="h-3 w-3" />
                  </button>

                  <button
                    type="button"
                    onClick={(e) => handleCloneMonster(monster, e)}
                    title={isEn ? `Clone and edit "${activeDisplayName}"` : `Клонировать и изменить «${activeDisplayName}»`}
                    className="flex items-center justify-center w-6 h-6 rounded-full bg-[rgba(255,255,255,0.04)] hover:bg-[#f5b920]/20 border border-[rgba(255,255,255,0.08)] hover:border-[#f5b920] text-gray-400 hover:text-[#f5b920] opacity-60 group-hover:opacity-100 transition-all cursor-pointer"
                  >
                    <Copy className="h-3 w-3" />
                  </button>

                  {monster.is_custom && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        homebrewService.deleteCustomMonster(monster.id);
                      }}
                      title={isEn ? `Delete "${activeDisplayName}"` : `Удалить «${activeDisplayName}»`}
                      className="flex items-center justify-center w-6 h-6 rounded-full bg-red-950/40 border border-red-800/50 hover:border-red-500 hover:bg-red-900 text-gray-300 hover:text-white transition-all opacity-0 group-hover:opacity-100 cursor-pointer"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => handleAddMonster(monster)}
                    title={isEn ? `Add "${activeDisplayName}" to combat (auto-rolls initiative)` : `Добавить «${activeDisplayName}» в бой (автобросок инициативы)`}
                    className="flex items-center justify-center w-6.5 h-6.5 rounded-full bg-[rgba(255,255,255,0.06)] hover:bg-[#f5b920] border border-[rgba(255,255,255,0.12)] hover:border-[#f5b920] text-gray-200 hover:text-[#0c0d12] hover:shadow-[0_0_12px_rgba(245,185,32,0.4)] transition-all flex-shrink-0 group/btn cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5 group-hover/btn:scale-110 transition-transform flex-shrink-0" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Нижняя информационная строка */}
      <div className="p-2.5 border-t border-[rgba(255,255,255,0.08)] bg-[rgba(14,18,25,0.6)] text-xs text-gray-400 flex items-center justify-between font-sans">
        <span className="flex items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5 text-[#f5b920]" />
          <span>{isEn ? 'Click [+] rolls initiative (d20)' : 'Клик [+] бросает инициативу (d20)'}</span>
        </span>
      </div>

      {/* Диалог создания новой папки */}
      {isNewFolderOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in select-none">
          <div className="w-full max-w-sm bg-[rgba(18,22,30,0.95)] border border-[#f5b920]/60 rounded-glass-xl p-4 shadow-glass space-y-3">
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <FolderPlus className="h-4 w-4 text-[#f5b920]" />
                <span>Новая папка бестиария</span>
              </span>
              <button
                onClick={() => setIsNewFolderOpen(false)}
                className="text-gray-400 hover:text-white p-1"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <input
              type="text"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="Название (напр. «Замок», «Глава 1»)..."
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreateFolder();
                if (e.key === 'Escape') setIsNewFolderOpen(false);
              }}
              className="w-full px-3 py-2 bg-black/60 border border-white/15 focus:border-[#f5b920] rounded-glass-sm text-xs text-white outline-none"
            />
            <div className="flex justify-end gap-2 pt-1">
              <button
                onClick={() => setIsNewFolderOpen(false)}
                className="px-3 py-1.5 rounded-glass-sm text-xs text-gray-300 hover:bg-white/10"
              >
                Отмена
              </button>
              <button
                onClick={handleCreateFolder}
                className="px-3.5 py-1.5 rounded-glass-sm bg-[#f5b920] hover:bg-[#fac742] text-black font-bold text-xs shadow-sm"
              >
                Создать
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Диалог назначения существа в папки */}
      {folderAssignMonster && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in select-none">
          <div className="w-full max-w-sm bg-[rgba(18,22,30,0.95)] border border-amber-500/50 rounded-glass-xl p-4 shadow-glass space-y-3">
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <span className="text-xs font-bold text-white flex items-center gap-1.5 truncate">
                <Folder className="h-4 w-4 text-[#f5b920]" />
                <span className="truncate">Папки для «{cleanRussianText(folderAssignMonster.name_ru || folderAssignMonster.name_en)}»</span>
              </span>
              <button
                onClick={() => setFolderAssignMonster(null)}
                className="text-gray-400 hover:text-white p-1"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
              {FOLDERS.filter((f) => f.id !== 'all').map((folder) => {
                const assigned = (creatureFolderMap[folderAssignMonster.id] || []).includes(folder.id);
                return (
                  <button
                    key={folder.id}
                    onClick={() => handleToggleMonsterFolder(folderAssignMonster.id, folder.id)}
                    className={`w-full flex items-center justify-between p-2 rounded-glass-sm border text-xs transition-colors cursor-pointer ${
                      assigned
                        ? 'bg-amber-500/20 border-amber-400 text-amber-200'
                        : 'bg-black/30 border-white/10 text-gray-300 hover:bg-white/5'
                    }`}
                  >
                    <span>{folder.label}</span>
                    {assigned && <Check className="h-3.5 w-3.5 text-amber-400" />}
                  </button>
                );
              })}
            </div>

            <div className="flex justify-end pt-2 border-t border-white/10">
              <button
                onClick={() => setFolderAssignMonster(null)}
                className="px-4 py-1.5 rounded-glass-sm bg-[#f5b920] hover:bg-[#fac742] text-black font-bold text-xs"
              >
                Готово
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Модальное окно создания своего существа */}
      <HomebrewMonsterModal
        isOpen={isHomebrewModalOpen}
        onClose={() => {
          setIsHomebrewModalOpen(false);
          setEditingMonsterData(undefined);
        }}
        initialData={editingMonsterData}
        onCreated={(newM) => {
          setCustomMonsters((prev) => [newM, ...prev.filter((c) => c.id !== newM.id)]);
        }}
      />
    </div>
  );
}
