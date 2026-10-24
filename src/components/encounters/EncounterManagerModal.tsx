import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Folder,
  Swords,
  Plus,
  Trash2,
  X,
  Search,
  Download,
  Upload,
  Layers,
  Sparkles,
  CheckCircle2,
  Skull,
  Shield,
  Users,
} from 'lucide-react';
import { useEncounterStore } from '../../store/encounterStore';
import { useCombatStore } from '../../store/combatStore';
import { usePartyStore } from '../../store/partyStore';
import { EncounterDifficulty, EncounterCombatantPreset } from '../../types/encounter';
import {
  LEVEL_THRESHOLDS,
  getXpForCr,
  getMonsterMultiplier,
  getDifficultyLabel,
} from '../../services/encounterService';
import { DatabaseService } from '../../services/dbService';
import { useTranslation } from '../../i18n';

interface QuickMonster {
  name: string;
  nameRu: string;
  cr: string;
  ac: number;
  hp: number;
  initBonus: number;
  speed: string;
}

const FALLBACK_MONSTERS: QuickMonster[] = [
  { name: 'Goblin', nameRu: 'Гоблин', cr: '1/4', ac: 15, hp: 7, initBonus: 2, speed: '30 ft.' },
  { name: 'Skeleton', nameRu: 'Скелет', cr: '1/4', ac: 13, hp: 13, initBonus: 2, speed: '30 ft.' },
  { name: 'Zombie', nameRu: 'Зомби', cr: '1/4', ac: 8, hp: 22, initBonus: -2, speed: '20 ft.' },
  { name: 'Kobold', nameRu: 'Кобольд', cr: '1/8', ac: 12, hp: 5, initBonus: 2, speed: '30 ft.' },
  { name: 'Cultist', nameRu: 'Культист', cr: '1/8', ac: 12, hp: 9, initBonus: 1, speed: '30 ft.' },
  { name: 'Bandit', nameRu: 'Бандит', cr: '1/8', ac: 12, hp: 11, initBonus: 1, speed: '30 ft.' },
  { name: 'Orc', nameRu: 'Орк', cr: '1/2', ac: 13, hp: 15, initBonus: 1, speed: '30 ft.' },
  { name: 'Dire Wolf', nameRu: 'Лютоволк', cr: '1', ac: 14, hp: 37, initBonus: 2, speed: '50 ft.' },
  { name: 'Ghoul', nameRu: 'Вурдалак', cr: '1', ac: 12, hp: 22, initBonus: 2, speed: '30 ft.' },
  { name: 'Bugbear', nameRu: 'Медвежатник', cr: '1', ac: 16, hp: 27, initBonus: 2, speed: '30 ft.' },
  { name: 'Ogre', nameRu: 'Огр', cr: '2', ac: 11, hp: 59, initBonus: -1, speed: '40 ft.' },
  { name: 'Gargoyle', nameRu: 'Гаргулья', cr: '2', ac: 15, hp: 52, initBonus: 0, speed: '30 ft., fly 60 ft.' },
  { name: 'Cult Fanatic', nameRu: 'Фанатик культа', cr: '2', ac: 13, hp: 33, initBonus: 2, speed: '30 ft.' },
  { name: 'Basilisk', nameRu: 'Василиск', cr: '3', ac: 15, hp: 52, initBonus: -1, speed: '20 ft.' },
  { name: 'Minotaur', nameRu: 'Минотавр', cr: '3', ac: 14, hp: 76, initBonus: 0, speed: '40 ft.' },
  { name: 'Ghost', nameRu: 'Призрак', cr: '4', ac: 11, hp: 45, initBonus: 1, speed: '0 ft., fly 40 ft.' },
  { name: 'Troll', nameRu: 'Тролль', cr: '5', ac: 15, hp: 84, initBonus: 1, speed: '30 ft.' },
  { name: 'Mage', nameRu: 'Маг', cr: '6', ac: 12, hp: 40, initBonus: 2, speed: '30 ft.' },
  { name: 'Young Green Dragon', nameRu: 'Молодой зелёный дракон', cr: '8', ac: 18, hp: 136, initBonus: 1, speed: '40 ft., fly 80 ft.' },
  { name: 'Vampire', nameRu: 'Вампир', cr: '13', ac: 16, hp: 144, initBonus: 4, speed: '30 ft.' },
];

interface BuilderItem {
  id: string;
  name: string;
  nameRu?: string;
  cr: string;
  hp: number;
  ac: number;
  initBonus: number;
  speed: string;
  count: number;
}

export function EncounterManagerModal() {
  const { language } = useTranslation();
  const isEn = language === 'en';
  const {
    encounters,
    selectedFolder,
    isModalOpen,
    closeModal,
    setSelectedFolder,
    saveCurrentCombatAsEncounter,
    loadEncounterIntoCombat,
    deleteEncounter,
    addEncounter,
    exportEncountersJson,
    importEncountersJson,
  } = useEncounterStore();

  const combatants = useCombatStore((s) => s.combatants);
  const enemyCombatants = combatants.filter((c) => !c.isPlayer);

  const partyMembers = usePartyStore((s) => s.members);

  // Search & Filter state
  const [search, setSearch] = useState('');
  const [notice, setNotice] = useState<string | null>(null);

  // Quick save current combat drawer
  const [isSavingCurrent, setIsSavingCurrent] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [saveFolder, setSaveFolder] = useState(isEn ? 'General' : 'Общие');
  const [saveDesc, setSaveDesc] = useState('');

  // Interactive Encounter Builder drawer
  const [isBuildingNew, setIsBuildingNew] = useState(false);
  const [builderName, setBuilderName] = useState('');
  const [builderFolder, setBuilderFolder] = useState(isEn ? 'General' : 'Общие');
  const [builderDesc, setBuilderDesc] = useState('');
  const [builderMonsters, setBuilderMonsters] = useState<BuilderItem[]>([]);
  const [monsterQuery, setMonsterQuery] = useState('');
  const [searchResults, setSearchResults] = useState<QuickMonster[]>([]);

  // Party XP Budget interactive controls
  const [partyCount, setPartyCount] = useState<number>(4);
  const [partyLevel, setPartyLevel] = useState<number>(3);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Update party defaults from actual party store
  useEffect(() => {
    if (partyMembers.length > 0) {
      setPartyCount(partyMembers.length);
      // Attempt to extract level if present
      let totalLvl = 0;
      let countWithLvl = 0;
      partyMembers.forEach((m) => {
        const match = m.characterClass?.match(/\d+/);
        if (match) {
          totalLvl += parseInt(match[0], 10);
          countWithLvl++;
        }
      });
      if (countWithLvl > 0) {
        setPartyLevel(Math.min(20, Math.max(1, Math.round(totalLvl / countWithLvl))));
      }
    }
  }, [partyMembers]);

  // Compute party XP thresholds (D&D 2024 / 5e DMG)
  const partyThresholds = useMemo(() => {
    const pCount = Math.max(1, partyCount);
    const lvl = Math.min(20, Math.max(1, partyLevel));
    const [eTh, mTh, hTh, dTh] = LEVEL_THRESHOLDS[lvl] || [75, 150, 225, 400];
    return {
      easy: eTh * pCount,
      medium: mTh * pCount,
      hard: hTh * pCount,
      deadly: dTh * pCount,
    };
  }, [partyCount, partyLevel]);

  // Search monsters from SQLite or fallback
  useEffect(() => {
    let isCancelled = false;
    const searchMonstersAsync = async () => {
      const trimmed = monsterQuery.trim().toLowerCase();
      if (!trimmed) {
        setSearchResults(FALLBACK_MONSTERS.slice(0, 10));
        return;
      }
      try {
        const dbMonsters = await DatabaseService.getInstance().searchMonsters(trimmed, 15);
        if (isCancelled) return;
        if (dbMonsters.length > 0) {
          const mapped: QuickMonster[] = dbMonsters.map((m) => ({
            name: m.name_en || m.name_ru,
            nameRu: m.name_ru || m.name_en,
            cr: m.cr || '1/4',
            ac: m.ac || 10,
            hp: m.hp_average || 10,
            initBonus: m.init_bonus || 0,
            speed: m.speed || (isEn ? '30 ft.' : '30 фт.'),
          }));
          setSearchResults(mapped);
          return;
        }
      } catch (e) {
        console.warn('DB monster search failed, using fallback:', e);
      }

      // Fallback in-memory search
      const filtered = FALLBACK_MONSTERS.filter(
        (m) =>
          m.nameRu.toLowerCase().includes(trimmed) ||
          m.name.toLowerCase().includes(trimmed) ||
          m.cr.includes(trimmed)
      );
      setSearchResults(filtered);
    };

    searchMonstersAsync();
    return () => {
      isCancelled = true;
    };
  }, [monsterQuery]);

  // Builder Live Metrics
  const builderMetrics = useMemo(() => {
    const totalMonsters = builderMonsters.reduce((acc, m) => acc + m.count, 0);
    const rawXp = builderMonsters.reduce((acc, m) => acc + getXpForCr(m.cr) * m.count, 0);
    const mult = getMonsterMultiplier(totalMonsters);
    const adjustedXp = Math.round(rawXp * mult);

    let difficulty: EncounterDifficulty = 'Тривиально';
    if (adjustedXp >= partyThresholds.deadly) difficulty = 'Смертельно';
    else if (adjustedXp >= partyThresholds.hard) difficulty = 'Сложно';
    else if (adjustedXp >= partyThresholds.medium) difficulty = 'Средне';
    else if (adjustedXp >= partyThresholds.easy) difficulty = 'Легко';

    return { totalMonsters, rawXp, mult, adjustedXp, difficulty };
  }, [builderMonsters, partyThresholds]);

  const folders = useMemo(() => {
    const set = new Set<string>();
    set.add(isEn ? 'All' : 'Все');
    encounters.forEach((e) => {
      if (e.folder) set.add(e.folder);
    });
    return Array.from(set);
  }, [encounters, isEn]);

  const filteredEncounters = useMemo(() => {
    return encounters.filter((e) => {
      const isAll = selectedFolder === 'Все' || selectedFolder === 'All' || selectedFolder === '';
      const matchesFolder = isAll || e.folder === selectedFolder;
      const lower = search.toLowerCase().trim();
      const matchesSearch =
        !lower ||
        e.name.toLowerCase().includes(lower) ||
        (e.description && e.description.toLowerCase().includes(lower)) ||
        e.combatants.some((c) => c.name.toLowerCase().includes(lower) || (c.nameRu && c.nameRu.toLowerCase().includes(lower)));
      return matchesFolder && matchesSearch;
    });
  }, [encounters, selectedFolder, search]);

  if (!isModalOpen) return null;

  const handleStartSaveCurrent = () => {
    if (enemyCombatants.length === 0) {
      setNotice(isEn ? 'No enemies in current combat to save!' : 'В текущем бою нет противников для сохранения!');
      setTimeout(() => setNotice(null), 3000);
      return;
    }
    setSaveName(isEn ? `Encounter (${enemyCombatants.length} monsters)` : `Столкновение (${enemyCombatants.length} монстров)`);
    setSaveFolder(selectedFolder !== 'Все' && selectedFolder !== 'All' ? selectedFolder : (isEn ? 'General' : 'Общие'));
    setSaveDesc('');
    setIsSavingCurrent(true);
    setIsBuildingNew(false);
  };

  const handleConfirmSaveCurrent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!saveName.trim()) return;
    saveCurrentCombatAsEncounter(saveName, saveFolder, saveDesc);
    setIsSavingCurrent(false);
    setNotice(isEn ? `Encounter "${saveName}" saved successfully!` : `Энкаунтер "${saveName}" успешно сохранен!`);
    setTimeout(() => setNotice(null), 3000);
  };

  const handleStartBuilder = () => {
    setIsBuildingNew(true);
    setIsSavingCurrent(false);
    setBuilderName(isEn ? `Encounter ${encounters.length + 1}` : `Столкновение ${encounters.length + 1}`);
    setBuilderFolder(selectedFolder !== 'Все' && selectedFolder !== 'All' ? selectedFolder : (isEn ? 'General' : 'Общие'));
    setBuilderDesc('');
    setBuilderMonsters([]);
    setMonsterQuery('');
  };

  const handleAddMonsterToBuilder = (monster: QuickMonster) => {
    setBuilderMonsters((prev) => {
      const existing = prev.find((m) => m.name === monster.name && m.cr === monster.cr);
      if (existing) {
        return prev.map((m) => (m.id === existing.id ? { ...m, count: m.count + 1 } : m));
      }
      return [
        ...prev,
        {
          id: `bm_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
          name: monster.name,
          nameRu: monster.nameRu,
          cr: monster.cr,
          hp: monster.hp,
          ac: monster.ac,
          initBonus: monster.initBonus,
          speed: monster.speed,
          count: 1,
        },
      ];
    });
  };

  const handleUpdateMonsterCount = (id: string, delta: number) => {
    setBuilderMonsters((prev) =>
      prev
        .map((m) => {
          if (m.id === id) {
            const next = m.count + delta;
            return next > 0 ? { ...m, count: next } : null;
          }
          return m;
        })
        .filter((m): m is BuilderItem => m !== null)
    );
  };

  const handleSaveBuiltEncounter = (e: React.FormEvent) => {
    e.preventDefault();
    if (builderMonsters.length === 0) {
      setNotice(isEn ? 'Add at least one monster to the encounter!' : 'Добавьте хотя бы одного монстра в энкаунтер!');
      setTimeout(() => setNotice(null), 3000);
      return;
    }

    const presets: EncounterCombatantPreset[] = [];
    builderMonsters.forEach((bm) => {
      for (let i = 0; i < bm.count; i++) {
        const numSuffix = bm.count > 1 ? ` ${i + 1}` : '';
        const baseName = isEn ? (bm.name || bm.nameRu || 'Monster') : (bm.nameRu || bm.name || 'Монстр');
        const monsterName = `${baseName}${numSuffix}`;
        presets.push({
          name: monsterName,
          nameRu: monsterName,
          cr: bm.cr,
          isPlayer: false,
          hp: bm.hp,
          maxHp: bm.hp,
          ac: bm.ac,
          initBonus: bm.initBonus,
          speed: bm.speed,
          color: '#E01A22',
        });
      }
    });

    addEncounter({
      name: builderName.trim() || (isEn ? 'New Encounter' : 'Новый энкаунтер'),
      folder: builderFolder.trim() || (isEn ? 'General' : 'Общие'),
      description: builderDesc.trim() || undefined,
      combatants: presets,
      totalXp: builderMetrics.rawXp,
      adjustedXp: builderMetrics.adjustedXp,
      difficulty: builderMetrics.difficulty,
    });

    setIsBuildingNew(false);
    setBuilderMonsters([]);
    setNotice(isEn ? `Encounter "${builderName}" successfully saved to library!` : `Энкаунтер "${builderName}" успешно сохранен в библиотеку!`);
    setTimeout(() => setNotice(null), 3000);
  };

  const handleExport = () => {
    const json = exportEncountersJson();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dnd_encounters_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    try {
      const text = await file.text();
      const count = importEncountersJson(text);
      setNotice(isEn ? `Successfully imported encounters: ${count}` : `Успешно импортировано энкаунтеров: ${count}`);
      setTimeout(() => setNotice(null), 3000);
    } catch {
      setNotice(isEn ? 'Error reading encounters file.' : 'Ошибка при чтении файла энкаунтеров.');
      setTimeout(() => setNotice(null), 3000);
    }
    e.target.value = '';
  };

  const getDifficultyBadge = (diff?: EncounterDifficulty) => {
    const label = getDifficultyLabel(diff);
    switch (label) {
      case 'Легко':
        return 'bg-emerald-950/80 text-emerald-300 border-emerald-700/60 shadow-sm';
      case 'Средне':
        return 'bg-amber-950/80 text-amber-300 border-amber-700/60 shadow-sm';
      case 'Сложно':
        return 'bg-orange-950/80 text-orange-300 border-orange-700/60 shadow-sm';
      case 'Смертельно':
        return 'bg-rose-950/90 text-rose-300 border-rose-700/80 font-bold shadow-sm shadow-rose-950/40';
      default:
        return 'bg-zinc-800 text-zinc-400 border-zinc-700';
    }
  };

  // Group identical monsters on encounter cards for clean presentation
  const getGroupedMonsters = (combatants: EncounterCombatantPreset[]) => {
    const map = new Map<string, { name: string; cr?: string; count: number }>();
    for (const c of combatants) {
      const baseName = (c.nameRu || c.name).replace(/\s+\d+$/, '');
      const key = `${baseName}_${c.cr || ''}`;
      const existing = map.get(key);
      if (existing) {
        existing.count++;
      } else {
        map.set(key, { name: baseName, cr: c.cr, count: 1 });
      }
    }
    return Array.from(map.values());
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-2 sm:p-4 animate-in fade-in duration-150 select-none font-sans overflow-y-auto">
      <div className="w-full max-w-5xl bg-[rgba(18,22,30,0.88)] backdrop-blur-xl border border-[rgba(255,255,255,0.08)] rounded-glass-xl shadow-[0_20px_50px_rgba(0,0,0,0.7)] p-4 sm:p-6 text-gray-100 flex flex-col max-h-[92vh] overflow-hidden space-y-3.5">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-[rgba(255,255,255,0.08)] pb-3 gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 rounded-glass bg-gold/10 border border-gold/30 text-gold shadow-[0_0_12px_rgba(245,185,32,0.2)] shrink-0">
              <Layers className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-bold text-white flex items-center gap-2 flex-wrap">
                <span>{isEn ? 'Encounter Manager' : 'Менеджер готовых энкаунтеров'}</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[rgba(255,255,255,0.05)] text-gold-light border border-[rgba(255,255,255,0.08)] shrink-0">
                  {encounters.length} {isEn ? 'templates' : 'шаблонов'}
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-gold/10 text-gold border border-gold/30 shrink-0">
                  D&D 2024 / DMG
                </span>
              </h2>
              <p className="text-xs text-gray-400 truncate sm:whitespace-normal">
                {isEn ? 'Combat encounter library, difficulty threshold calculator, and tactical map deployment.' : 'Библиотека боевых столкновений, расчёт порогов сложности и высадка на тактическую карту.'}
              </p>
            </div>
          </div>
          <button
            onClick={closeModal}
            className="p-1.5 rounded-glass hover:bg-white/10 text-gray-400 hover:text-gray-100 text-sm transition-colors shrink-0 cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* PARTY XP BUDGET BANNER */}
        <div className="bg-[rgba(24,29,40,0.65)] border border-[rgba(255,255,255,0.08)] rounded-glass-lg p-2.5 px-3 flex flex-wrap items-center justify-between gap-2.5 text-xs max-w-full shadow-sm">
          {/* Party Configuration Steppers */}
          <div className="flex items-center gap-2.5 sm:gap-3 flex-wrap">
            <div className="flex items-center gap-1.5 text-gray-300 font-medium shrink-0">
              <Users className="h-3.5 w-3.5 text-gold shrink-0" />
              <span>{isEn ? 'Party:' : 'Отряд:'}</span>
              <div className="flex items-center bg-surface border border-border-subtle rounded px-1.5 py-0.5 gap-1">
                <button
                  type="button"
                  onClick={() => setPartyCount((c) => Math.max(1, c - 1))}
                  className="hover:text-gold text-gray-400 font-bold px-1"
                  title={isEn ? "Decrease heroes count" : "Уменьшить количество героев"}
                >
                  -
                </button>
                <span className="font-mono text-gold-light font-bold min-w-[20px] text-center">
                  {partyCount}
                </span>
                <button
                  type="button"
                  onClick={() => setPartyCount((c) => Math.min(12, c + 1))}
                  className="hover:text-gold text-gray-400 font-bold px-1"
                  title={isEn ? "Increase heroes count" : "Увеличить количество героев"}
                >
                  +
                </button>
                <span className="text-[10px] text-gray-400">{isEn ? "heroes" : "гер."}</span>
              </div>
            </div>

            <div className="flex items-center gap-1.5 text-gray-300 font-medium shrink-0">
              <Shield className="h-3.5 w-3.5 text-blue-400 shrink-0" />
              <span>{isEn ? 'Avg. Level:' : 'Ср. уровень:'}</span>
              <div className="flex items-center bg-surface border border-border-subtle rounded px-1.5 py-0.5 gap-1">
                <button
                  type="button"
                  onClick={() => setPartyLevel((l) => Math.max(1, l - 1))}
                  className="hover:text-blue-300 text-gray-400 font-bold px-1"
                  title={isEn ? "Decrease average level" : "Понизить средний уровень"}
                >
                  -
                </button>
                <span className="font-mono text-blue-300 font-bold min-w-[20px] text-center">
                  {partyLevel}
                </span>
                <button
                  type="button"
                  onClick={() => setPartyLevel((l) => Math.min(20, l + 1))}
                  className="hover:text-blue-300 text-gray-400 font-bold px-1"
                  title={isEn ? "Increase average level" : "Повысить средний уровень"}
                >
                  +
                </button>
                <span className="text-[10px] text-gray-400">{isEn ? "lvl" : "ур."}</span>
              </div>
            </div>
          </div>

          {/* 4 Difficulty Threshold Badges */}
          <div className="flex items-center gap-2 flex-wrap max-w-full">
            <span className="text-[11px] text-gray-400 hidden xl:inline mr-1">{isEn ? "XP Thresholds:" : "Пороги опыта:"}</span>
            <span
              className="px-2 py-0.5 rounded border text-[11px] font-mono bg-emerald-950/70 border-emerald-700/60 text-emerald-300 font-medium whitespace-nowrap shrink-0 leading-tight"
              title={isEn ? "Easy encounter: victory assured without critical resource loss" : "Легкое столкновение (Easy): победа гарантирована без критических потерь"}
            >
              {isEn ? "Easy:" : "Легко:"} <span className="font-bold">{partyThresholds.easy}</span> XP
            </span>
            <span
              className="px-2 py-0.5 rounded border text-[11px] font-mono bg-amber-950/70 border-amber-700/60 text-amber-300 font-medium whitespace-nowrap shrink-0 leading-tight"
              title={isEn ? "Medium encounter: moderate resource and spell slot consumption" : "Среднее столкновение (Medium): умеренные траты ресурсов и ячеек"}
            >
              {isEn ? "Medium:" : "Средне:"} <span className="font-bold">{partyThresholds.medium}</span> XP
            </span>
            <span
              className="px-2 py-0.5 rounded border text-[11px] font-mono bg-orange-950/70 border-orange-700/60 text-orange-300 font-medium whitespace-nowrap shrink-0 leading-tight"
              title={isEn ? "Hard encounter: high risk, sound tactical decisions required" : "Сложное столкновение (Hard): высокий риск, требуется тактика"}
            >
              {isEn ? "Hard:" : "Сложно:"} <span className="font-bold">{partyThresholds.hard}</span> XP
            </span>
            <span
              className="px-2 py-0.5 rounded border text-[11px] font-mono bg-rose-950/80 border-rose-700/80 text-rose-300 font-bold whitespace-nowrap shrink-0 leading-tight"
              title={isEn ? "Deadly encounter: lethal danger to one or more party members" : "Смертельное столкновение (Deadly): прямая угроза гибели персонажей"}
            >
              {isEn ? "Deadly:" : "Смертельно:"} <span className="font-bold">{partyThresholds.deadly}</span> XP
            </span>
          </div>
        </div>

        {/* Notice Banner */}
        {notice && (
          <div className="bg-emerald-950/80 border border-emerald-600/60 rounded-sm p-2 px-3 flex items-center gap-2 text-xs text-emerald-200 animate-in fade-in">
            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
            <span>{notice}</span>
          </div>
        )}

        {/* Action Controls Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 bg-card p-2.5 rounded-sm border border-border-subtle">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleStartBuilder}
              className={`px-3 py-1.5 rounded-sm font-bold text-xs flex items-center gap-1.5 transition-all ${
                isBuildingNew
                  ? 'bg-gold-light text-canvas shadow-gold-glow'
                  : 'bg-gold hover:bg-gold-light text-canvas shadow-gold-glow'
              }`}
              title={isEn ? "Open encounter builder with monster search and XP budget calculator" : "Открыть конструктор энкаунтеров с подбором монстров и расчётом бюджета XP"}
            >
              <Plus className="h-3.5 w-3.5" />
              <span>{isEn ? "Build Encounter" : "Собрать энкаунтер"}</span>
            </button>

            <button
              onClick={handleStartSaveCurrent}
              className="px-2.5 py-1.5 rounded-sm bg-surface hover:bg-card border border-border-subtle text-gray-300 hover:text-white text-xs flex items-center gap-1.5 transition-colors"
              title={isEn ? "Save current combatants from tactical battle map as encounter" : "Сохранить монстров из текущего боя на тактической карте"}
            >
              <Sparkles className="h-3.5 w-3.5 text-amber-400" />
              <span>{isEn ? `Save Current Combat (${enemyCombatants.length})` : `Сохранить текущий бой (${enemyCombatants.length})`}</span>
            </button>

            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-2.5 py-1.5 rounded-sm bg-surface hover:bg-card border border-border-subtle text-gray-300 hover:text-white text-xs flex items-center gap-1.5 transition-colors"
              title={isEn ? "Import encounter templates from JSON" : "Импортировать шаблоны энкаунтеров из JSON"}
            >
              <Upload className="h-3.5 w-3.5 text-blue-400" />
              <span>{isEn ? "Import" : "Импорт"}</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleImport}
              className="hidden"
            />

            <button
              onClick={handleExport}
              className="px-2.5 py-1.5 rounded-sm bg-surface hover:bg-card border border-border-subtle text-gray-300 hover:text-white text-xs flex items-center gap-1.5 transition-colors"
              title={isEn ? "Export encounter templates to JSON" : "Экспортировать шаблоны энкаунтеров в JSON"}
            >
              <Download className="h-3.5 w-3.5 text-emerald-400" />
              <span>{isEn ? "Export" : "Экспорт"}</span>
            </button>
          </div>

          {/* Search bar */}
          <div className="relative w-64">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-500 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={isEn ? "Search by title or monsters..." : "Поиск по названию / монстрам..."}
              className="w-full h-7 pl-8 pr-3 bg-surface border border-border-subtle rounded-sm text-xs text-gray-100 placeholder:text-gray-500 focus:outline-none focus:border-gold"
            />
          </div>
        </div>

        {/* INTERACTIVE ENCOUNTER BUILDER DRAWER */}
        {isBuildingNew && (
          <form
            onSubmit={handleSaveBuiltEncounter}
            className="p-3.5 rounded-sm bg-surface border border-gold/60 space-y-3 animate-in fade-in max-h-[46vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between border-b border-border-subtle pb-2">
              <span className="text-xs font-bold text-gold-light flex items-center gap-1.5">
                <Sparkles className="h-4 w-4 text-gold" />
                {isEn ? "Encounter Builder (Monster selection & XP budget calculator)" : "Конструктор энкаунтера (Подбор монстров и расчёт бюджета XP)"}
              </span>
              <button
                type="button"
                onClick={() => setIsBuildingNew(false)}
                className="text-gray-400 hover:text-white text-xs p-1"
              >
                ✕
              </button>
            </div>

            {/* Inputs: Name, Folder, Description */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
              <div>
                <label className="text-[10px] text-gray-400 block mb-1">{isEn ? "Encounter Name:" : "Название энкаунтера:"}</label>
                <input
                  type="text"
                  required
                  value={builderName}
                  onChange={(e) => setBuilderName(e.target.value)}
                  placeholder={isEn ? "e.g. Goblin Ambush on the Road" : "Например, Засада гоблинов у тракта"}
                  className="w-full bg-card border border-border-subtle rounded px-2.5 py-1 text-xs text-white outline-none focus:border-gold"
                />
              </div>

              <div>
                <label className="text-[10px] text-gray-400 block mb-1">{isEn ? "Category / Folder:" : "Категория / Папка:"}</label>
                <input
                  type="text"
                  value={builderFolder}
                  onChange={(e) => setBuilderFolder(e.target.value)}
                  placeholder={isEn ? "General, Forest, Dungeon, Bosses..." : "Общие, Лес, Подземелье, Боссы..."}
                  className="w-full bg-card border border-border-subtle rounded px-2.5 py-1 text-xs text-white outline-none focus:border-gold"
                />
              </div>

              <div>
                <label className="text-[10px] text-gray-400 block mb-1">{isEn ? "Short Description:" : "Краткое описание:"}</label>
                <input
                  type="text"
                  value={builderDesc}
                  onChange={(e) => setBuilderDesc(e.target.value)}
                  placeholder={isEn ? "Notes for the Dungeon Master..." : "Заметки для Мастера Подземелий..."}
                  className="w-full bg-card border border-border-subtle rounded px-2.5 py-1 text-xs text-white outline-none focus:border-gold"
                />
              </div>
            </div>

            {/* MONSTER SELECTOR & ADDED MONSTERS */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
              {/* Monster Search & Picker */}
              <div className="bg-card p-2.5 rounded border border-border-subtle flex flex-col space-y-2">
                <span className="text-[11px] font-bold text-gray-200 flex items-center justify-between">
                  <span>{isEn ? "Bestiary Monster Selection" : "Выбор монстров из бестиария"}</span>
                  <span className="text-[10px] text-gray-400 font-normal">
                    {searchResults.length} {isEn ? 'found' : 'найдено'}
                  </span>
                </span>
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-500 pointer-events-none" />
                  <input
                    type="text"
                    value={monsterQuery}
                    onChange={(e) => setMonsterQuery(e.target.value)}
                    placeholder={isEn ? "Search by name (Goblin, Ogre...) or CR..." : "Поиск по названию (Гоблин, Огр...) или КО..."}
                    className="w-full h-7 pl-8 pr-2 bg-surface border border-border-subtle rounded text-xs text-gray-100 placeholder:text-gray-500 focus:outline-none focus:border-gold"
                  />
                </div>

                {/* Monster Results List */}
                <div className="max-h-36 overflow-y-auto space-y-1 pr-1">
                  {searchResults.map((m, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-1.5 rounded bg-surface border border-border-subtle/70 hover:border-gold/50 text-xs transition-colors"
                    >
                      <div className="flex items-center gap-1.5 truncate">
                        <Skull className="h-3 w-3 text-red-400 shrink-0" />
                        <span className="font-semibold text-gray-200 truncate">{isEn ? (m.name || m.nameRu) : (m.nameRu || m.name)}</span>
                        <span className="text-[10px] font-mono px-1 rounded bg-card text-gold-light border border-border-subtle shrink-0">
                          {isEn ? `CR ${m.cr}` : `КО ${m.cr}`}
                        </span>
                        <span className="text-[10px] font-mono text-gray-400 shrink-0">
                          ~{getXpForCr(m.cr)} XP
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleAddMonsterToBuilder(m)}
                        className="px-2 py-0.5 rounded bg-gold/20 hover:bg-gold text-gold hover:text-canvas border border-gold/40 text-[10px] font-bold shrink-0 transition-colors"
                      >
                        {isEn ? '+ Add' : '+ Добавить'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Added Monsters Table */}
              <div className="bg-card p-2.5 rounded border border-border-subtle flex flex-col space-y-2 min-w-0">
                <span className="text-[11px] font-bold text-gray-200 flex items-center justify-between">
                  <span>{isEn ? `Enemies List (${builderMonsters.length} types)` : `Состав отряда противников (${builderMonsters.length} видов)`}</span>
                  <span className="text-[10px] font-mono text-gold-light">
                    {isEn ? `Total: ${builderMetrics.totalMonsters} monsters` : `Всего: ${builderMetrics.totalMonsters} монстров`}
                  </span>
                </span>

                {builderMonsters.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 text-xs italic">
                    {isEn ? "Select monsters from the left to build an encounter" : "Выберите монстров слева, чтобы сформировать столкновение"}
                  </div>
                ) : (
                  <div className="max-h-40 overflow-y-auto overflow-x-auto pr-1">
                    <table className="w-full min-w-[340px] text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-border-subtle text-[10px] text-gray-400 font-medium uppercase">
                          <th className="py-1 px-1.5 font-normal">{isEn ? "Name" : "Название"}</th>
                          <th className="py-1 px-1 font-normal text-center w-12 whitespace-nowrap">{isEn ? "CR" : "КО"}</th>
                          <th className="py-1 px-1 font-normal text-right w-16 whitespace-nowrap">{isEn ? "XP" : "Опыт"}</th>
                          <th className="py-1 px-1 font-normal text-center w-24 whitespace-nowrap">{isEn ? "Quantity" : "Количество"}</th>
                          <th className="py-1 px-1 font-normal text-right w-10 whitespace-nowrap">{isEn ? "Actions" : "Действия"}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border-subtle/40">
                        {builderMonsters.map((bm) => (
                          <tr key={bm.id} className="hover:bg-surface/50 transition-colors">
                            <td className="py-1.5 px-1.5 min-w-0 max-w-[130px] sm:max-w-none">
                              <span className="font-semibold text-gray-200 block truncate leading-snug" title={isEn ? (bm.name || bm.nameRu) : (bm.nameRu || bm.name)}>
                                {isEn ? (bm.name || bm.nameRu) : (bm.nameRu || bm.name)}
                              </span>
                            </td>
                            <td className="py-1.5 px-1 text-center font-mono text-[10px] text-gold-light whitespace-nowrap">
                              {bm.cr}
                            </td>
                            <td className="py-1.5 px-1 text-right font-mono text-[10px] text-gray-300 whitespace-nowrap">
                              {getXpForCr(bm.cr) * bm.count} XP
                            </td>
                            <td className="py-1.5 px-1">
                              <div className="flex items-center justify-center bg-surface border border-border-subtle rounded px-1 py-0.5 gap-1 shrink-0 w-max mx-auto">
                                <button
                                  type="button"
                                  onClick={() => handleUpdateMonsterCount(bm.id, -1)}
                                  className="px-0.5 text-gray-400 hover:text-red-400 font-bold"
                                >
                                  -
                                </button>
                                <span className="font-mono font-bold text-xs text-white min-w-[14px] text-center">
                                  {bm.count}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleUpdateMonsterCount(bm.id, 1)}
                                  className="px-0.5 text-gray-400 hover:text-emerald-400 font-bold"
                                >
                                  +
                                </button>
                              </div>
                            </td>
                            <td className="py-1.5 px-1 text-right">
                              <button
                                type="button"
                                onClick={() => handleUpdateMonsterCount(bm.id, -bm.count)}
                                className="p-1 hover:text-red-400 text-gray-500 rounded hover:bg-surface inline-flex shrink-0"
                                title={isEn ? "Remove monster" : "Удалить монстра"}
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            {/* LIVE XP BUDGET & DIFFICULTY METRICS */}
            <div className="bg-card p-2.5 rounded border border-border-subtle flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-4 flex-wrap">
                <div>
                  <span className="text-[10px] text-gray-400 block">{isEn ? "Base XP:" : "Базовый опыт:"}</span>
                  <span className="font-mono font-bold text-gray-200">{builderMetrics.rawXp} XP</span>
                </div>
                <div>
                  <span className="text-[10px] text-gray-400 block">{isEn ? "Group Multiplier:" : "Множитель группы:"}</span>
                  <span className="font-mono font-bold text-gold-light">
                    ×{builderMetrics.mult} ({builderMetrics.totalMonsters} {isEn ? 'monsters' : 'монстров'})
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-gray-400 block">{isEn ? "Adjusted XP:" : "Скорректированный опыт:"}</span>
                  <span className="font-mono font-bold text-gold-light">
                    {builderMetrics.adjustedXp} XP
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-gray-400 block">{isEn ? "Calculated Difficulty:" : "Расчётная сложность:"}</span>
                  <span
                    className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${getDifficultyBadge(
                      builderMetrics.difficulty
                    )}`}
                  >
                    {getDifficultyLabel(builderMetrics.difficulty, isEn ? 'en' : 'ru')}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsBuildingNew(false)}
                  className="px-3 py-1 rounded bg-surface hover:bg-card border border-border-subtle text-gray-400 hover:text-white text-xs"
                >
                  {isEn ? 'Cancel' : 'Отмена'}
                </button>
                <button
                  type="submit"
                  disabled={builderMonsters.length === 0}
                  className="px-4 py-1 rounded bg-gold hover:bg-gold-light disabled:opacity-50 text-canvas font-bold text-xs shadow-gold-glow flex items-center gap-1.5"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  {isEn ? 'Save Encounter' : 'Сохранить энкаунтер'}
                </button>
              </div>
            </div>
          </form>
        )}

        {/* Save Current Combat Drawer Form */}
        {isSavingCurrent && (
          <form
            onSubmit={handleConfirmSaveCurrent}
            className="p-3.5 rounded-sm bg-surface border border-gold/50 space-y-3 animate-in fade-in"
          >
            <div className="flex items-center justify-between border-b border-border-subtle pb-1.5">
              <span className="text-xs font-bold text-gold-light flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5" />
                {isEn ? `Save Current Combat (${enemyCombatants.length} monsters)` : `Сохранение текущего боя (${enemyCombatants.length} монстров)`}
              </span>
              <button
                type="button"
                onClick={() => setIsSavingCurrent(false)}
                className="text-gray-400 hover:text-white text-xs"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <label className="text-[10px] text-gray-400 block mb-1">{isEn ? "Encounter Name:" : "Название энкаунтера:"}</label>
                <input
                  type="text"
                  required
                  value={saveName}
                  onChange={(e) => setSaveName(e.target.value)}
                  placeholder={isEn ? "e.g. Bridge Ambush" : "Например, Засада у моста"}
                  className="w-full bg-card border border-border-subtle rounded px-2.5 py-1 text-xs text-white outline-none focus:border-gold"
                />
              </div>

              <div>
                <label className="text-[10px] text-gray-400 block mb-1">{isEn ? "Category / Folder:" : "Категория / Папка:"}</label>
                <input
                  type="text"
                  value={saveFolder}
                  onChange={(e) => setSaveFolder(e.target.value)}
                  placeholder={isEn ? "General, Forest, Bosses..." : "Общие, Лес, Боссы..."}
                  className="w-full bg-card border border-border-subtle rounded px-2.5 py-1 text-xs text-white outline-none focus:border-gold"
                />
              </div>

              <div>
                <label className="text-[10px] text-gray-400 block mb-1">{isEn ? "Short Description:" : "Краткое описание:"}</label>
                <input
                  type="text"
                  value={saveDesc}
                  onChange={(e) => setSaveDesc(e.target.value)}
                  placeholder={isEn ? "Notes for the GM..." : "Заметки для Мастера..."}
                  className="w-full bg-card border border-border-subtle rounded px-2.5 py-1 text-xs text-white outline-none focus:border-gold"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setIsSavingCurrent(false)}
                className="px-3 py-1 rounded bg-card hover:bg-surface border border-border-subtle text-gray-400 hover:text-white text-xs"
              >
                {isEn ? 'Cancel' : 'Отмена'}
              </button>
              <button
                type="submit"
                className="px-4 py-1 rounded bg-gold hover:bg-gold-light text-canvas font-bold text-xs"
              >
                {isEn ? 'Save' : 'Сохранить'}
              </button>
            </div>
          </form>
        )}

        {/* Folder Filter Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 border-b border-border-subtle">
          {folders.map((folder) => (
            <button
              key={folder}
              onClick={() => setSelectedFolder(folder)}
              className={`px-3 py-1 rounded-sm text-xs font-medium transition-all flex items-center gap-1.5 whitespace-nowrap ${
                selectedFolder === folder
                  ? 'bg-card text-gold-light border border-border-subtle font-semibold shadow-sm'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              <Folder className="h-3 w-3 text-gold/70" />
              <span>{(folder === 'Все' || folder === 'All') ? (isEn ? 'All' : 'Все') : folder}</span>
              <span className="text-[10px] opacity-60 font-mono">
                (
                {folder === 'Все' || folder === 'All'
                  ? encounters.length
                  : encounters.filter((e) => e.folder === folder).length}
                )
              </span>
            </button>
          ))}
        </div>

        {/* Encounters Cards Grid */}
        <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 max-h-[46vh]">
          {filteredEncounters.length === 0 ? (
            <div className="text-center py-12 text-gray-500 text-xs">
              {isEn ? "No encounter templates found in this category." : "Шаблонов энкаунтеров в этой категории не найдено."}
            </div>
          ) : (
            filteredEncounters.map((enc) => {
              const grouped = getGroupedMonsters(enc.combatants);
              return (
                <div
                  key={enc.id}
                  className="p-3.5 rounded-sm bg-card border border-border-subtle hover:border-gold/40 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-3 min-w-0"
                >
                  {/* Info */}
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-sm text-gray-100 break-words">{enc.name}</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-surface border border-border-subtle text-gray-400 shrink-0">
                        {enc.folder}
                      </span>
                      <span
                        className={`text-[10px] px-2 py-0.2 rounded border font-semibold shrink-0 ${getDifficultyBadge(
                          enc.difficulty
                        )}`}
                      >
                        {getDifficultyLabel(enc.difficulty, isEn ? 'en' : 'ru')}
                      </span>
                      <span className="text-[11px] font-mono text-gold-light shrink-0">
                        {isEn ? "Base XP: ~" : "Базовый XP: ~"}{enc.totalXp}
                      </span>
                      {enc.adjustedXp && enc.adjustedXp !== enc.totalXp && (
                        <span className="text-[10px] font-mono text-gray-400 shrink-0">
                          {isEn ? `(Adjusted: ${enc.adjustedXp} XP)` : `(Скорректированный: ${enc.adjustedXp} XP)`}
                        </span>
                      )}
                    </div>

                    {enc.description && (
                      <p className="text-xs text-gray-400 italic break-words line-clamp-2">{enc.description}</p>
                    )}

                    {/* Monsters breakdown */}
                    <div className="flex flex-wrap gap-1.5 pt-1 max-w-full">
                      {grouped.map((c, i) => (
                        <span
                          key={i}
                          className="text-[11px] px-2 py-0.5 rounded bg-surface border border-border-subtle text-gray-300 font-sans inline-flex items-center gap-1 max-w-full break-words leading-tight"
                        >
                          <Skull className="h-3 w-3 text-red-400 shrink-0" />
                          <span className="break-words leading-tight">{c.name}</span>
                          {c.count > 1 && (
                            <span className="text-gold font-bold font-mono text-[10px] shrink-0">
                              ×{c.count}
                            </span>
                          )}
                          <span className="text-gray-500 font-mono text-[10px] shrink-0 whitespace-nowrap">({isEn ? `CR ${c.cr}` : `КО ${c.cr}`})</span>
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0 flex-wrap sm:flex-nowrap">
                    <button
                      onClick={() => loadEncounterIntoCombat(enc.id, 'replace')}
                      className="px-3 py-1.5 rounded-sm bg-gold text-canvas font-bold text-xs hover:bg-gold-light shadow-gold-glow flex items-center gap-1.5 transition-all"
                      title={isEn ? "Deploy encounter (replaces current monsters, keeps players)" : "Загрузить энкаунтер в бой (заменяет текущих монстров, сохраняя игроков)"}
                    >
                      <Swords className="h-3.5 w-3.5" />
                      <span>{isEn ? "Deploy (Replace)" : "В бой (Заменить)"}</span>
                    </button>

                    <button
                      onClick={() => loadEncounterIntoCombat(enc.id, 'merge')}
                      className="px-2.5 py-1.5 rounded-sm bg-surface hover:bg-card border border-border-subtle text-gray-300 hover:text-white text-xs flex items-center gap-1 transition-colors"
                      title={isEn ? "Add monsters to active combat without resetting" : "Добавить монстров к текущему бою без сброса"}
                    >
                      <Plus className="h-3.5 w-3.5 text-gold" />
                      <span>{isEn ? "+ Deploy (Add)" : "+ В бой (Добавить)"}</span>
                    </button>

                    <button
                      onClick={() => deleteEncounter(enc.id)}
                      className="p-1.5 rounded-sm hover:bg-red-950/40 text-gray-500 hover:text-red-400 border border-transparent hover:border-red-800 transition-colors"
                      title={isEn ? "Delete encounter" : "Удалить энкаунтер"}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-border-subtle pt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-gray-400">
          <span className="break-words leading-relaxed flex-1 min-w-[200px]">
            {isEn ? 'Tip: When deploying an encounter, monster initiatives are rolled automatically!' : 'Подсказка: При загрузке энкаунтера инициатива монстров бросается автоматически!'}
          </span>
          <button
            onClick={closeModal}
            className="px-4 py-1.5 rounded-sm bg-card hover:bg-surface border border-border-subtle text-gray-300 text-xs transition-colors shrink-0"
          >
            {isEn ? 'Close' : 'Закрыть'}
          </button>
        </div>
      </div>
    </div>
  );
}
