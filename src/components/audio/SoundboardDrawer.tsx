import React, { useState, useEffect, useRef } from 'react';
import {
  audioService,
  AMBIENT_TRACKS,
  AmbientTrackId,
  CustomAudioTrack,
  TrackCategory,
} from '../../services/audioService';

export type LocalAudioTrack = CustomAudioTrack;
import {
  Volume2,
  VolumeX,
  X,
  Play,
  Pause,
  Square,
  Sparkles,
  Swords,
  Award,
  Zap,
  Music,
  FolderOpen,
  SkipForward,
  SkipBack,
  Repeat,
  Search,
  Trash2,
  Upload,
  Flame,
  Coins,
  Bell,
  Clock,
  ShieldAlert,
  SlidersHorizontal,
  Key,
  Trees,
  CloudRain,
  Lightbulb,
  Folder,
} from 'lucide-react';
import clsx from 'clsx';

interface SoundboardDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

type FilterCategory = 'all' | 'combat' | 'town' | 'dungeon' | 'nature' | 'sfx';

interface CategoryOption {
  id: FilterCategory;
  label: string;
  category: TrackCategory;
  subcategory?: string;
  icon: React.ReactNode;
  color: string;
}

const CATEGORY_OPTIONS: CategoryOption[] = [
  {
    id: 'combat',
    label: 'Бой',
    category: 'combat',
    icon: <Swords className="h-3.5 w-3.5" />,
    color: 'text-red-400 border-red-500/40 bg-red-950/40',
  },
  {
    id: 'town',
    label: 'Таверна / Город',
    category: 'music',
    subcategory: 'town',
    icon: <Music className="h-3.5 w-3.5" />,
    color: 'text-amber-300 border-amber-500/40 bg-amber-950/40',
  },
  {
    id: 'dungeon',
    label: 'Исследование / Подземелье',
    category: 'ambient',
    subcategory: 'dungeon',
    icon: <Key className="h-3.5 w-3.5" />,
    color: 'text-cyan-300 border-cyan-500/40 bg-cyan-950/40',
  },
  {
    id: 'nature',
    label: 'Природа / Амбиент',
    category: 'ambient',
    subcategory: 'nature',
    icon: <Trees className="h-3.5 w-3.5" />,
    color: 'text-emerald-300 border-emerald-500/40 bg-emerald-950/40',
  },
  {
    id: 'sfx',
    label: 'Спецэффекты (SFX)',
    category: 'sfx',
    icon: <Zap className="h-3.5 w-3.5" />,
    color: 'text-purple-300 border-purple-500/40 bg-purple-950/40',
  },
];

function formatTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return '00:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export function SoundboardDrawer({ isOpen, onClose }: SoundboardDrawerProps) {
  const [activeTab, setActiveTab] = useState<'player' | 'sfx'>('player');

  // AudioService synced state
  const [volume, setVolume] = useState<number>(audioService.getVolume());
  const [isMuted, setIsMuted] = useState<boolean>(audioService.getIsMuted());
  const [currentAmbient, setCurrentAmbient] = useState<AmbientTrackId | null>(
    audioService.getCurrentTrack()
  );
  const [customTracks, setCustomTracks] = useState<CustomAudioTrack[]>(
    audioService.getCustomTracks()
  );
  const [currentCustomTrack, setCurrentCustomTrack] = useState<CustomAudioTrack | null>(
    audioService.getCurrentCustomTrack()
  );
  const [isCustomPlaying, setIsCustomPlaying] = useState<boolean>(
    audioService.isCustomPlaying()
  );
  const [currentTime, setCurrentTime] = useState<number>(
    audioService.getCustomCurrentTime()
  );
  const [duration, setDuration] = useState<number>(audioService.getCustomDuration());
  const [categoryVolumes, setCategoryVolumes] = useState<Record<string, number>>(
    audioService.getAllCategoryVolumes()
  );

  // UI state
  const [selectedFilter, setSelectedFilter] = useState<FilterCategory>('all');
  const [uploadCategory, setUploadCategory] = useState<FilterCategory>('combat');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [showVolumeMixer, setShowVolumeMixer] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Subscribe to audioService updates
  useEffect(() => {
    const unsub = audioService.subscribe(() => {
      setVolume(audioService.getVolume());
      setIsMuted(audioService.getIsMuted());
      setCurrentAmbient(audioService.getCurrentTrack());
      setCustomTracks([...audioService.getCustomTracks()]);
      setCurrentCustomTrack(audioService.getCurrentCustomTrack());
      setIsCustomPlaying(audioService.isCustomPlaying());
      setCurrentTime(audioService.getCustomCurrentTime());
      setDuration(audioService.getCustomDuration());
      setCategoryVolumes(audioService.getAllCategoryVolumes());
    });
    return unsub;
  }, []);

  if (!isOpen) return null;

  // Master Volume Controls
  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    audioService.setVolume(parseFloat(e.target.value));
  };

  const handleToggleMute = () => {
    audioService.toggleMute();
  };

  const handleStopAll = () => {
    audioService.stopAll();
  };

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragging(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const option = CATEGORY_OPTIONS.find((c) => c.id === uploadCategory);
      const targetCategory = option?.category || 'music';
      await audioService.addTracks(e.dataTransfer.files, targetCategory);
    }
  };

  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const option = CATEGORY_OPTIONS.find((c) => c.id === uploadCategory);
      const targetCategory = option?.category || 'music';
      await audioService.addTracks(e.target.files, targetCategory);
      e.target.value = '';
    }
  };

  // Filtered tracks
  const filteredTracks = customTracks.filter((track) => {
    const query = searchQuery.trim().toLowerCase();
    const matchesSearch =
      !query ||
      track.name.toLowerCase().includes(query) ||
      track.category.toLowerCase().includes(query) ||
      (track.subcategory && track.subcategory.toLowerCase().includes(query));

    if (!matchesSearch) return false;

    if (selectedFilter === 'all') return true;
    if (selectedFilter === 'combat') return track.category === 'combat';
    if (selectedFilter === 'town') {
      return (
        track.category === 'music' ||
        track.subcategory === 'town' ||
        /таверна|город|tavern|town/i.test(track.name)
      );
    }
    if (selectedFilter === 'dungeon') {
      return (
        track.subcategory === 'dungeon' ||
        (track.category === 'ambient' &&
          /подземелье|пещера|dungeon|cave/i.test(track.name))
      );
    }
    if (selectedFilter === 'nature') {
      return (
        track.subcategory === 'nature' ||
        (track.category === 'ambient' &&
          track.subcategory !== 'dungeon' &&
          !/подземелье|dungeon/i.test(track.name))
      );
    }
    if (selectedFilter === 'sfx') return track.category === 'sfx';

    return true;
  });

  // Calculate track counts per category
  const counts = {
    all: customTracks.length,
    combat: customTracks.filter((t) => t.category === 'combat').length,
    town: customTracks.filter(
      (t) =>
        t.category === 'music' ||
        t.subcategory === 'town' ||
        /таверна|город|tavern|town/i.test(t.name)
    ).length,
    dungeon: customTracks.filter(
      (t) =>
        t.subcategory === 'dungeon' ||
        (t.category === 'ambient' && /подземелье|пещера|dungeon|cave/i.test(t.name))
    ).length,
    nature: customTracks.filter(
      (t) =>
        t.subcategory === 'nature' ||
        (t.category === 'ambient' &&
          t.subcategory !== 'dungeon' &&
          !/подземелье|dungeon/i.test(t.name))
    ).length,
    sfx: customTracks.filter((t) => t.category === 'sfx').length,
  };

  const getTrackBadge = (track: CustomAudioTrack) => {
    if (track.category === 'combat') {
      return { label: 'Бой', icon: <Swords className="h-3.5 w-3.5" />, color: 'text-red-400 bg-red-950/60 border-red-800/60' };
    }
    if (track.category === 'sfx') {
      return { label: 'SFX', icon: <Zap className="h-3.5 w-3.5" />, color: 'text-purple-300 bg-purple-950/60 border-purple-800/60' };
    }
    if (track.subcategory === 'dungeon' || /подземелье|dungeon|cave/i.test(track.name)) {
      return { label: 'Подземелье', icon: <Key className="h-3.5 w-3.5" />, color: 'text-cyan-300 bg-cyan-950/60 border-cyan-800/60' };
    }
    if (track.category === 'ambient' || track.subcategory === 'nature') {
      return { label: 'Природа', icon: <Trees className="h-3.5 w-3.5" />, color: 'text-emerald-300 bg-emerald-950/60 border-emerald-800/60' };
    }
    return { label: 'Таверна / Город', icon: <Music className="h-3.5 w-3.5" />, color: 'text-amber-300 bg-amber-950/60 border-amber-800/60' };
  };

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/75 backdrop-blur-md select-none animate-in fade-in duration-150"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Drag & drop overlay indicator */}
      {isDragging && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/85 backdrop-blur-xl border-4 border-dashed border-[#f5b920] animate-pulse pointer-events-none">
          <Upload className="w-16 h-16 text-[#f5b920] mb-4" />
          <h3 className="text-xl font-bold text-white mb-2">Отпустите аудиофайлы здесь</h3>
          <p className="text-sm text-gold-light">
            Файлы добавятся в категорию: «{CATEGORY_OPTIONS.find((c) => c.id === uploadCategory)?.label}»
          </p>
        </div>
      )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*,.mp3,.wav,.ogg,.webm,.flac,.m4a"
        multiple
        onChange={handleFileInputChange}
        className="hidden"
      />

      <div
        className="w-full max-w-md sm:max-w-xl h-full bg-[rgba(18,22,30,0.96)] backdrop-blur-2xl border-l border-[rgba(255,255,255,0.08)] shadow-[0_0_50px_rgba(0,0,0,0.85)] flex flex-col overflow-hidden text-gray-100 animate-in slide-in-from-right duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 bg-[rgba(14,18,25,0.85)] border-b border-[rgba(255,255,255,0.08)] flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-glass bg-purple-500/15 border border-purple-500/30 text-purple-300 shadow-[0_0_12px_rgba(168,85,247,0.25)]">
              <Music className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-1.5">
                <span>Звуковая панель & Плеер</span>
                <span
                  className={clsx(
                    'text-[10px] font-mono px-2 py-0.5 rounded-full border',
                    isCustomPlaying
                      ? 'bg-amber-950/80 text-amber-300 border-amber-700/60 animate-pulse'
                      : currentAmbient
                      ? 'bg-purple-950/80 text-purple-300 border-purple-700/60'
                      : 'bg-gray-800 text-gray-400 border-gray-700'
                  )}
                >
                  {isCustomPlaying
                    ? `Трек: ${currentCustomTrack?.name.slice(0, 15)}...`
                    : currentAmbient
                    ? 'Эмбиент'
                    : 'Готов'}
                </span>
              </h2>
              <p className="text-[11px] text-gray-400">
                100% оффлайн локальный аудиоплеер, плейлисты и Web Audio SFX
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-glass text-gray-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="Закрыть панель (Ctrl+B)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Master Controls: Volume, Mute & Stop All */}
        <div className="p-3 bg-[rgba(24,29,40,0.7)] border-b border-[rgba(255,255,255,0.08)] flex flex-col gap-2 shrink-0">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="text-gray-400 font-bold uppercase tracking-wider text-[10px]">
                Общая громкость
              </span>
              <button
                type="button"
                onClick={() => setShowVolumeMixer(!showVolumeMixer)}
                className={clsx(
                  'text-[10px] px-1.5 py-0.5 rounded border transition-colors flex items-center gap-1 cursor-pointer',
                  showVolumeMixer
                    ? 'bg-gold/20 text-gold border-gold/40'
                    : 'bg-black/30 text-gray-400 border-white/5 hover:text-white'
                )}
                title="Настроить баланс громкости по категориям"
              >
                <SlidersHorizontal className="w-3 h-3" />
                <span>Микшер</span>
              </button>
            </div>
            <span className="font-mono text-gold-light font-bold">
              {isMuted ? 'Выключен' : `${Math.round(volume * 100)}%`}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleToggleMute}
              className={clsx(
                'p-1.5 rounded transition-colors cursor-pointer',
                isMuted
                  ? 'bg-red-950/70 text-red-400 border border-red-700/60 shadow-[0_0_8px_rgba(239,68,68,0.3)]'
                  : 'bg-card text-gray-300 hover:text-white border border-border-subtle'
              )}
              title={isMuted ? 'Включить звук' : 'Заглушить'}
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>

            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={isMuted ? 0 : volume}
              onChange={handleVolumeChange}
              className="flex-1 accent-[#f5b920] h-1.5 bg-[#252f3a] rounded-lg cursor-pointer"
            />

            {(currentAmbient || isCustomPlaying) && (
              <button
                type="button"
                onClick={handleStopAll}
                className="px-2.5 py-1 rounded bg-red-950/80 border border-red-700/60 text-red-300 text-xs font-bold hover:bg-red-900 flex items-center gap-1.5 transition-all shadow-sm active:scale-95 cursor-pointer"
                title="Остановить все воспроизведения"
              >
                <Square className="w-3 h-3 fill-current" />
                <span className="text-[10px]">СТОП ВСЁ</span>
              </button>
            )}
          </div>

          {/* Expandable Category Volume Mixer */}
          {showVolumeMixer && (
            <div className="mt-2 pt-2 border-t border-white/10 grid grid-cols-2 sm:grid-cols-4 gap-2 animate-in fade-in duration-150">
              {(
                [
                  { id: 'combat', label: 'Бой' },
                  { id: 'music', label: 'Таверна' },
                  { id: 'ambient', label: 'Амбиент' },
                  { id: 'sfx', label: 'SFX' },
                ] as const
              ).map((cat) => (
                <div key={cat.id} className="p-2 rounded bg-black/40 border border-white/5 space-y-1">
                  <div className="flex justify-between text-[10px] text-gray-400 font-bold">
                    <span>{cat.label}</span>
                    <span className="font-mono text-gold-light">
                      {Math.round((categoryVolumes[cat.id] ?? 0.8) * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={categoryVolumes[cat.id] ?? 0.8}
                    onChange={(e) =>
                      audioService.setCategoryVolume(cat.id, parseFloat(e.target.value))
                    }
                    className="w-full accent-gold h-1 bg-[#222a36] rounded cursor-pointer"
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center border-b border-[rgba(255,255,255,0.08)] bg-[rgba(14,18,25,0.6)] px-4 pt-2 gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('player')}
            className={clsx(
              'flex items-center gap-1.5 pb-2 px-3 text-xs font-bold border-b-2 transition-all cursor-pointer',
              activeTab === 'player'
                ? 'border-[#f5b920] text-gold-light'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            )}
          >
            <FolderOpen className="w-3.5 h-3.5 text-gold" />
            <span>Плеер и Музыка ({customTracks.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('sfx')}
            className={clsx(
              'flex items-center gap-1.5 pb-2 px-3 text-xs font-bold border-b-2 transition-all cursor-pointer',
              activeTab === 'sfx'
                ? 'border-purple-400 text-purple-200'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            )}
          >
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            <span>Быстрые SFX и Эффекты</span>
          </button>
        </div>

        {/* Drawer Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {activeTab === 'player' ? (
            /* ================= TAB 1: PLAYER & PLAYLIST ================= */
            <div className="space-y-4">
              {/* Add Tracks Drop Zone & Controls */}
              <div className="p-3.5 rounded-glass bg-[rgba(24,30,42,0.65)] border border-white/10 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div>
                    <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
                      <Upload className="w-4 h-4 text-gold" />
                      <span>Добавить локальные треки</span>
                    </h3>
                    <p className="text-[11px] text-gray-400 mt-0.5">
                      MP3, WAV, OGG, WebM, FLAC, M4A — сохраняются в память IndexedDB
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3.5 py-1.5 rounded bg-[#f5b920] hover:bg-[#fac742] active:bg-[#e0a312] text-black font-bold text-xs shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
                  >
                    <FolderOpen className="w-4 h-4" />
                    <span>Выбрать файлы на ПК</span>
                  </button>
                </div>

                {/* Upload Category Selector */}
                <div className="pt-2 border-t border-white/5">
                  <span className="text-[10px] text-gray-400 uppercase tracking-wider font-bold block mb-1.5">
                    Категория для новых треков:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {CATEGORY_OPTIONS.map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setUploadCategory(opt.id)}
                        className={clsx(
                          'px-2 py-1 rounded text-[11px] font-medium transition-all cursor-pointer flex items-center gap-1 border',
                          uploadCategory === opt.id
                            ? `${opt.color} font-bold shadow-sm ring-1 ring-gold/40`
                            : 'bg-[#141922] text-gray-400 border-white/5 hover:text-white hover:bg-white/5'
                        )}
                      >
                        <span>{opt.icon}</span>
                        <span>{opt.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Drag hint */}
                <div className="p-2 rounded bg-black/30 border border-dashed border-white/10 text-center">
                  <span className="text-[11px] text-gray-400 flex items-center justify-center gap-1.5">
                    <Lightbulb className="h-3.5 w-3.5 text-amber-400 flex-shrink-0" />
                    <span>Или просто перетащите аудиофайлы мышью прямо в это окно</span>
                  </span>
                </div>
              </div>

              {/* Playlist Filters & Search */}
              <div className="space-y-2">
                {/* Search Bar */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Поиск по названию трека или тегу..."
                    className="w-full pl-8 pr-7 py-1.5 rounded bg-[#10141d] border border-white/10 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-gold"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white text-xs cursor-pointer flex items-center justify-center"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                {/* Category Filter Pills: Бой, Таверна/Город, Исследование/Подземелье, Природа/Амбиент */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                  <button
                    type="button"
                    onClick={() => setSelectedFilter('all')}
                    className={clsx(
                      'px-2.5 py-1 rounded-full text-[11px] font-medium whitespace-nowrap transition-all cursor-pointer flex items-center gap-1 border',
                      selectedFilter === 'all'
                        ? 'bg-[#f5b920] text-black font-bold border-gold shadow-sm'
                        : 'bg-[#18202b] text-gray-300 hover:bg-[#202937] hover:text-white border-white/5'
                    )}
                  >
                    <span>Все</span>
                    <span className="opacity-75 text-[10px]">({counts.all})</span>
                  </button>

                  {CATEGORY_OPTIONS.map((opt) => {
                    const count = counts[opt.id] ?? 0;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setSelectedFilter(opt.id)}
                        className={clsx(
                          'px-2.5 py-1 rounded-full text-[11px] font-medium whitespace-nowrap transition-all cursor-pointer flex items-center gap-1 border',
                          selectedFilter === opt.id
                            ? `${opt.color} font-bold shadow-sm ring-1 ring-gold/40`
                            : 'bg-[#18202b] text-gray-300 hover:bg-[#202937] hover:text-white border-white/5'
                        )}
                      >
                        <span>{opt.icon}</span>
                        <span>{opt.label}</span>
                        <span className="opacity-75 text-[10px]">({count})</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Tracks List */}
              <div className="space-y-1.5">
                {filteredTracks.length === 0 ? (
                  <div className="p-8 text-center rounded-glass bg-black/20 border border-white/5 space-y-2">
                    <Music className="w-8 h-8 text-gray-500 mx-auto" />
                    <p className="text-xs text-gray-400">
                      {customTracks.length === 0
                        ? 'Саундборд пуст. Добавьте локальные треки с ПК через кнопку выше.'
                        : 'Нет треков в выбранной категории или по запросу.'}
                    </p>
                  </div>
                ) : (
                  filteredTracks.map((track) => {
                    const isActive = currentCustomTrack?.id === track.id;
                    const badge = getTrackBadge(track);

                    return (
                      <div
                        key={track.id}
                        onClick={() => audioService.playTrack(track.id)}
                        className={clsx(
                          'p-2.5 rounded border flex items-center justify-between gap-3 cursor-pointer transition-all group',
                          isActive
                            ? 'bg-gradient-to-r from-[#2c2214] to-[#18202f] border-[#f5b920] shadow-[0_0_15px_rgba(245,185,32,0.25)] text-white'
                            : 'bg-[#141922] border-white/5 hover:border-gold/40 hover:bg-[#1a202c] text-gray-200'
                        )}
                      >
                        {/* Play button & Title */}
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              audioService.playTrack(track.id);
                            }}
                            className={clsx(
                              'w-7 h-7 rounded-full flex items-center justify-center shrink-0 transition-transform active:scale-90 cursor-pointer',
                              isActive && isCustomPlaying
                                ? 'bg-[#f5b920] text-black shadow-md'
                                : 'bg-white/10 hover:bg-white/20 text-white'
                            )}
                            title={isActive && isCustomPlaying ? 'Пауза' : 'Воспроизвести'}
                          >
                            {isActive && isCustomPlaying ? (
                              <Pause className="w-3.5 h-3.5 fill-current" />
                            ) : (
                              <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                            )}
                          </button>

                          <div className="min-w-0 flex-1">
                            <h4
                              className={clsx(
                                'text-xs font-bold truncate',
                                isActive ? 'text-gold-light' : 'text-gray-200'
                              )}
                            >
                              {track.name}
                            </h4>

                            <div className="flex items-center gap-2 mt-0.5">
                              <span
                                className={clsx(
                                  'text-[9px] font-mono px-1.5 py-0.2 rounded border flex items-center gap-1',
                                  badge.color
                                )}
                              >
                                <span>{badge.icon}</span>
                                <span>{badge.label}</span>
                              </span>

                              {track.duration ? (
                                <span className="text-[10px] text-gray-500 font-mono">
                                  {formatTime(track.duration)}
                                </span>
                              ) : null}
                            </div>
                          </div>
                        </div>

                        {/* Actions: Loop toggle & Delete */}
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              audioService.toggleLoop(track.id);
                            }}
                            className={clsx(
                              'p-1.5 rounded transition-colors cursor-pointer',
                              track.isLooping
                                ? 'bg-gold/20 text-gold-light'
                                : 'text-gray-500 hover:text-gray-300'
                            )}
                            title={track.isLooping ? 'Повтор включен' : 'Повтор выключен'}
                          >
                            <Repeat className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              audioService.deleteTrack(track.id);
                            }}
                            className="p-1.5 rounded text-gray-500 hover:text-red-400 hover:bg-red-950/40 transition-colors cursor-pointer"
                            title="Удалить трек из саундборда"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          ) : (
            /* ================= TAB 2: PROCEDURAL SFX & AMBIENTS ================= */
            <div className="space-y-5">
              {/* Section 1: Quick Tabletop SFX */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2.5 flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-gold" />
                  <span>Быстрые звуки за столом (SFX)</span>
                </h3>

                <div className="grid grid-cols-2 gap-2">
                  {/* 1. Крит (Natural 20 fanfare) */}
                  <button
                    type="button"
                    onClick={() => audioService.playCriticalHit()}
                    className="p-3 rounded bg-[#1c222b] hover:bg-[#252d3a] border border-red-500/40 hover:border-red-400 text-left transition-all active:scale-95 group flex flex-col gap-1 shadow-sm cursor-pointer"
                  >
                    <div className="flex items-center gap-1.5 text-red-400 font-bold text-xs">
                      <Award className="w-4 h-4 text-red-400 group-hover:scale-110 transition-transform" />
                      <span>Крит (Нат 20)</span>
                    </div>
                    <span className="text-[10px] text-gray-400">Победные фанфары</span>
                  </button>

                  {/* 2. Провал (Natural 1 sad horn) */}
                  <button
                    type="button"
                    onClick={() => audioService.playSadHorn()}
                    className="p-3 rounded bg-[#1c222b] hover:bg-[#252d3a] border border-amber-600/40 hover:border-amber-500 text-left transition-all active:scale-95 group flex flex-col gap-1 shadow-sm cursor-pointer"
                  >
                    <div className="flex items-center gap-1.5 text-amber-400 font-bold text-xs">
                      <ShieldAlert className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
                      <span>Провал (Нат 1)</span>
                    </div>
                    <span className="text-[10px] text-gray-400">Печальная труба</span>
                  </button>

                  {/* 3. Удар меча */}
                  <button
                    type="button"
                    onClick={() => audioService.playSwordStrike()}
                    className="p-3 rounded bg-[#1c222b] hover:bg-[#252d3a] border border-blue-500/40 hover:border-blue-400 text-left transition-all active:scale-95 group flex flex-col gap-1 shadow-sm cursor-pointer"
                  >
                    <div className="flex items-center gap-1.5 text-blue-300 font-bold text-xs">
                      <Swords className="w-4 h-4 text-blue-400 group-hover:scale-110 transition-transform" />
                      <span>Удар меча</span>
                    </div>
                    <span className="text-[10px] text-gray-400">Звон стали и лязг</span>
                  </button>

                  {/* 4. Магический взрыв */}
                  <button
                    type="button"
                    onClick={() => audioService.playMagicBurst()}
                    className="p-3 rounded bg-[#1c222b] hover:bg-[#252d3a] border border-purple-500/40 hover:border-purple-400 text-left transition-all active:scale-95 group flex flex-col gap-1 shadow-sm cursor-pointer"
                  >
                    <div className="flex items-center gap-1.5 text-purple-300 font-bold text-xs">
                      <Sparkles className="w-4 h-4 text-purple-400 group-hover:scale-110 transition-transform" />
                      <span>Магич. взрыв</span>
                    </div>
                    <span className="text-[10px] text-gray-400">Грохот и искры</span>
                  </button>

                  {/* 5. Драконий рык */}
                  <button
                    type="button"
                    onClick={() => audioService.playDragonRoar()}
                    className="p-3 rounded bg-[#1c222b] hover:bg-[#252d3a] border border-orange-500/40 hover:border-orange-400 text-left transition-all active:scale-95 group flex flex-col gap-1 shadow-sm cursor-pointer"
                  >
                    <div className="flex items-center gap-1.5 text-orange-400 font-bold text-xs">
                      <Flame className="w-4 h-4 text-orange-400 group-hover:scale-110 transition-transform" />
                      <span>Драконий рык</span>
                    </div>
                    <span className="text-[10px] text-gray-400">Грозный утробный рев</span>
                  </button>

                  {/* 6. Монеты */}
                  <button
                    type="button"
                    onClick={() => audioService.playCoins()}
                    className="p-3 rounded bg-[#1c222b] hover:bg-[#252d3a] border border-yellow-500/40 hover:border-yellow-400 text-left transition-all active:scale-95 group flex flex-col gap-1 shadow-sm cursor-pointer"
                  >
                    <div className="flex items-center gap-1.5 text-yellow-300 font-bold text-xs">
                      <Coins className="w-4 h-4 text-yellow-400 group-hover:scale-110 transition-transform" />
                      <span>Монеты</span>
                    </div>
                    <span className="text-[10px] text-gray-400">Звон золота в мешочке</span>
                  </button>

                  {/* 7. Уведомление */}
                  <button
                    type="button"
                    onClick={() => audioService.playNotification()}
                    className="p-3 rounded bg-[#1c222b] hover:bg-[#252d3a] border border-cyan-500/40 hover:border-cyan-400 text-left transition-all active:scale-95 group flex flex-col gap-1 shadow-sm cursor-pointer"
                  >
                    <div className="flex items-center gap-1.5 text-cyan-300 font-bold text-xs">
                      <Bell className="w-4 h-4 text-cyan-400 group-hover:scale-110 transition-transform" />
                      <span>Уведомление</span>
                    </div>
                    <span className="text-[10px] text-gray-400">Кристальный звон</span>
                  </button>

                  {/* 8. Таймер */}
                  <button
                    type="button"
                    onClick={() => audioService.playTimer()}
                    className="p-3 rounded bg-[#1c222b] hover:bg-[#252d3a] border border-emerald-500/40 hover:border-emerald-400 text-left transition-all active:scale-95 group flex flex-col gap-1 shadow-sm cursor-pointer"
                  >
                    <div className="flex items-center gap-1.5 text-emerald-300 font-bold text-xs">
                      <Clock className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
                      <span>Таймер</span>
                    </div>
                    <span className="text-[10px] text-gray-400">Тиканье и гонг</span>
                  </button>
                </div>
              </div>

              {/* Section 2: Procedural Ambient Generators */}
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                    <Music className="w-3.5 h-3.5 text-purple-400" />
                    <span>Процедурные эмбиенты (Синтез)</span>
                  </h3>
                  {currentAmbient && (
                    <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-mono">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      Играет
                    </span>
                  )}
                </div>

                <div className="space-y-2">
                  {AMBIENT_TRACKS.map((t) => {
                    const isActive = currentAmbient === t.id;
                    return (
                      <div
                        key={t.id}
                        onClick={() => audioService.toggleAmbientTrack(t.id)}
                        className={clsx(
                          'p-3 rounded border flex items-center justify-between gap-3 cursor-pointer transition-all',
                          isActive
                            ? 'bg-gradient-to-r from-[#201728] to-[#171c26] border-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.25)]'
                            : 'bg-[#171c23] border-border-subtle hover:border-gold/40 hover:bg-[#1a2029]'
                        )}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="shrink-0">
                            {t.id === 'tavern' ? (
                              <Music className="h-6 w-6 text-amber-400" />
                            ) : t.id === 'dungeon' ? (
                              <Key className="h-6 w-6 text-cyan-400" />
                            ) : t.id === 'rain' ? (
                              <CloudRain className="h-6 w-6 text-sky-400" />
                            ) : t.id === 'campfire' ? (
                              <Flame className="h-6 w-6 text-orange-400" />
                            ) : t.id === 'drums' ? (
                              <Swords className="h-6 w-6 text-red-400" />
                            ) : (
                              <Music className="h-6 w-6 text-gold" />
                            )}
                          </span>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <h4
                                className={clsx(
                                  'text-xs font-bold truncate',
                                  isActive ? 'text-purple-200' : 'text-gray-200'
                                )}
                              >
                                {t.name}
                              </h4>
                              {isActive && (
                                <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-purple-950 text-purple-300 border border-purple-700">
                                  АКТИВЕН
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] text-gray-400 truncate mt-0.5">
                              {t.desc}
                            </p>
                          </div>
                        </div>

                        <button
                          type="button"
                          className={clsx(
                            'p-2 rounded-full border transition-all shrink-0 cursor-pointer',
                            isActive
                              ? 'bg-purple-600 border-purple-400 text-white shadow-md'
                              : 'bg-card border-border-subtle text-gray-400 hover:text-white'
                          )}
                        >
                          {isActive ? (
                            <Square className="w-3.5 h-3.5 fill-current" />
                          ) : (
                            <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ================= FIXED BOTTOM NOW PLAYING BAR ================= */}
        {currentCustomTrack && (
          <div className="p-3 bg-[rgba(14,18,25,0.98)] border-t border-[rgba(255,255,255,0.1)] flex flex-col gap-2 shrink-0">
            {/* Track Info & Scrubber */}
            <div className="flex items-center justify-between text-xs">
              <div className="truncate pr-2">
                <span className="font-bold text-white text-xs truncate block">
                  {currentCustomTrack.name}
                </span>
                <span className="text-[10px] text-gray-400 flex items-center gap-1">
                  <Folder className="h-3 w-3 inline text-text-muted" />
                  <span>{getTrackBadge(currentCustomTrack).label}</span>
                </span>
              </div>
              <div className="font-mono text-[11px] text-gray-400 shrink-0">
                <span className="text-white">{formatTime(currentTime)}</span> /{' '}
                <span>{formatTime(duration)}</span>
              </div>
            </div>

            {/* Scrubber slider */}
            <input
              type="range"
              min="0"
              max={duration || 100}
              step="0.5"
              value={currentTime}
              onChange={(e) => audioService.seek(parseFloat(e.target.value))}
              className="w-full h-1.5 bg-[#252f3a] rounded-lg appearance-none cursor-pointer accent-[#f5b920]"
            />

            {/* Player Controls */}
            <div className="flex items-center justify-between pt-1">
              <button
                type="button"
                onClick={() => audioService.toggleLoop(currentCustomTrack.id)}
                title={currentCustomTrack.isLooping ? 'Повтор включен' : 'Повтор выключен'}
                className={clsx(
                  'p-1.5 rounded transition-colors cursor-pointer',
                  currentCustomTrack.isLooping
                    ? 'bg-gold/20 text-gold-light'
                    : 'text-gray-400 hover:text-white'
                )}
              >
                <Repeat className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => audioService.playPrevTrack()}
                  className="p-1.5 rounded-full hover:bg-white/10 text-gray-300 hover:text-white transition-all cursor-pointer"
                  title="Предыдущий трек"
                >
                  <SkipBack className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={() =>
                    isCustomPlaying
                      ? audioService.pauseTrack()
                      : audioService.resumeTrack()
                  }
                  className="w-8 h-8 rounded-full bg-[#f5b920] hover:bg-[#fac742] text-black font-bold flex items-center justify-center shadow-md transition-transform active:scale-95 cursor-pointer"
                  title={isCustomPlaying ? 'Пауза' : 'Воспроизведение'}
                >
                  {isCustomPlaying ? (
                    <Pause className="w-4 h-4 fill-current" />
                  ) : (
                    <Play className="w-4 h-4 fill-current ml-0.5" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => audioService.playNextTrack()}
                  className="p-1.5 rounded-full hover:bg-white/10 text-gray-300 hover:text-white transition-all cursor-pointer"
                  title="Следующий трек"
                >
                  <SkipForward className="w-4 h-4" />
                </button>
              </div>

              <button
                type="button"
                onClick={() => audioService.stopTrack()}
                title="Остановить трек"
                className="p-1.5 rounded text-gray-400 hover:text-rose-400 transition-colors cursor-pointer"
              >
                <Square className="w-4 h-4 fill-current" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
