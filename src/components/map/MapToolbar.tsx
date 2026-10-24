import React, { useRef, useState, useEffect } from 'react';
import { useMapStore } from '../../store/mapStore';
import { broadcastService } from '../../services/broadcastService';
import { AoeShape, WeatherEffect } from '../../types/map';
import {
  MousePointer,
  Monitor,
  Ruler,
  Hand,
  Sparkles,
  Grid,
  ZoomIn,
  ZoomOut,
  Maximize2,
  RotateCcw,
  Upload,
  Trash2,
  Users,
  Pencil,
  Eraser,
  Undo2,
  Sun,
  Moon,
  ChevronDown,
  MapPin,
  Crosshair,
  ToyBrick,
  DoorClosed,
  AppWindow,
  Eye,
  EyeOff,
  CloudFog,
  Circle,
  Square,
  Plus,
  Flame,
  Wand2,
  Check,
} from 'lucide-react';
import { useCombatStore } from '../../store/combatStore';
import { useTokenForgeStore } from '../../store/tokenForgeStore';
import { useSettingsStore } from '../../store/settingsStore';
import {
  DND_LIGHT_PRESETS,
  AMBIENT_LIGHT_CONFIG,
  AmbientLightMode,
} from '../../engine/lightingEngine';

interface MapToolbarProps {
  onFitToViewport: () => void;
  isMasterView?: boolean;
}

const PALETTE_COLORS = [
  { name: 'Черный', nameEn: 'Black', value: '#000000', border: 'border-gray-500' },
  { name: 'Белый', nameEn: 'White', value: '#FFFFFF', border: 'border-gray-400' },
  { name: 'Красный', nameEn: 'Red', value: '#EF4444', border: 'border-red-400' },
  { name: 'Синий', nameEn: 'Blue', value: '#3B82F6', border: 'border-blue-400' },
  { name: 'Зеленый', nameEn: 'Green', value: '#10B981', border: 'border-emerald-400' },
  { name: 'Золотой', nameEn: 'Gold', value: '#EAB308', border: 'border-yellow-400' },
  { name: 'Фиолетовый', nameEn: 'Purple', value: '#A855F7', border: 'border-purple-400' },
  { name: 'Оранжевый', nameEn: 'Orange', value: '#F97316', border: 'border-orange-400' },
];

export const AOE_DAMAGE_COLORS = [
  { name: 'Огонь', nameEn: 'Fire', value: '#EF4444' },
  { name: 'Холод', nameEn: 'Cold', value: '#3B82F6' },
  { name: 'Излучение', nameEn: 'Radiant', value: '#F59E0B' },
  { name: 'Силовое поле', nameEn: 'Force', value: '#8B5CF6' },
  { name: 'Кислота', nameEn: 'Acid', value: '#10B981' },
  { name: 'Молния', nameEn: 'Lightning', value: '#EAB308' },
  { name: 'Ожог', nameEn: 'Burn', value: '#F97316' },
  { name: 'Некротика', nameEn: 'Necrotic', value: '#6366F1' },
];

export const QUICK_PRESETS = [
  {
    name: 'Огненный шар (20 фт)',
    nameEn: 'Fireball (20 ft.)',
    icon: '',
    shape: 'circle' as AoeShape,
    sizeFeet: 20,
    color: '#EF4444',
    desc: 'Сфера 20 фт (4 кл.) [Огонь]',
    descEn: 'Sphere 20 ft. (4 cells) [Fire]',
  },
  {
    name: 'Аура / Стражи (15 фт)',
    nameEn: 'Spirit Guardians / Aura (15 ft.)',
    icon: '',
    shape: 'circle' as AoeShape,
    sizeFeet: 15,
    color: '#F59E0B',
    desc: 'Сфера 15 фт (3 кл.) [Излучение]',
    descEn: 'Sphere 15 ft. (3 cells) [Radiant]',
  },
  {
    name: 'Конус холода (60 фт)',
    nameEn: 'Cone of Cold (60 ft.)',
    icon: '',
    shape: 'cone' as AoeShape,
    sizeFeet: 60,
    color: '#3B82F6',
    desc: 'Конус 60 фт (12 кл.) [Холод]',
    descEn: 'Cone 60 ft. (12 cells) [Cold]',
  },
  {
    name: 'Руки возгорания (15 фт)',
    nameEn: 'Burning Hands (15 ft.)',
    icon: '',
    shape: 'cone' as AoeShape,
    sizeFeet: 15,
    color: '#F97316',
    desc: 'Конус 15 фт (3 кл.) [Огонь]',
    descEn: 'Cone 15 ft. (3 cells) [Fire]',
  },
  {
    name: 'Молния (100x5 фт)',
    nameEn: 'Lightning Bolt (100x5 ft.)',
    icon: '',
    shape: 'line' as AoeShape,
    sizeFeet: 100,
    color: '#EAB308',
    desc: 'Линия 100x5 фт (20 кл.) [Молния]',
    descEn: 'Line 100x5 ft. (20 cells) [Lightning]',
  },
  {
    name: 'Паутина / Куб (20 фт)',
    nameEn: 'Web / Cube (20 ft.)',
    icon: '',
    shape: 'cube' as AoeShape,
    sizeFeet: 20,
    color: '#10B981',
    desc: 'Куб 20 фт (4x4 кл.) [Контроль]',
    descEn: 'Cube 20 ft. (4x4 cells) [Control]',
  },
  {
    name: 'Громовая волна (15 фт)',
    nameEn: 'Thunderwave (15 ft.)',
    icon: '',
    shape: 'cube' as AoeShape,
    sizeFeet: 15,
    color: '#8B5CF6',
    desc: 'Куб 15 фт (3x3 кл.) [Звук / Сила]',
    descEn: 'Cube 15 ft. (3x3 cells) [Thunder / Force]',
  },
];

export const WEATHER_OPTIONS: { id: WeatherEffect; label: string; labelEn: string; icon: string; name: string }[] = [
  { id: 'none', label: 'Ясно', labelEn: 'Clear', icon: '', name: 'Ясно' },
  { id: 'rain', label: 'Дождь', labelEn: 'Rain', icon: '', name: 'Дождь' },
  { id: 'snow', label: 'Снегопад', labelEn: 'Snow', icon: '', name: 'Снегопад' },
  { id: 'fog', label: 'Туман', labelEn: 'Fog', icon: '', name: 'Туман' },
  { id: 'embers', label: 'Угли и искры', labelEn: 'Embers & Sparks', icon: '', name: 'Угли и искры' },
];

export function MapToolbar({ onFitToViewport, isMasterView = true }: MapToolbarProps) {
  const { language } = useSettingsStore();
  const isEn = language === 'en';
  const {
    scale,
    gridCellSize,
    isGridVisible,
    activeTool,
    aoeTemplates,
    drawingLines,
    currentBrushColor,
    currentBrushWidth,
    isWhiteBackground,
    weatherEffect,
    gridType,
    pins,
    walls,
    setImageUrl,
    setGridCellSize,
    toggleGrid,
    setGridType,
    setActiveTool,
    addAoeTemplate,
    clearAoeTemplates,
    setSelectedAoeId,
    setPendingAoe,
    zoomIn,
    zoomOut,
    resetView,
    clearAllDrawings,
    undoLastDrawing,
    setBrushColor,
    setBrushWidth,
    toggleWhiteBackground,
    setWeatherEffect,
    clearPins,
    clearWalls,
    isFogEnabled,
    fogShapes,
    fogBrushSize,
    fogToolMode,
    fogShapeType,
    toggleFog,
    revealAllFog,
    concealAllFog,
    undoLastFog,
    setFogBrushSize,
    setFogToolMode,
    setFogShapeType,
    mapTokens,
    addMapToken,
    lights,
    isLightingEnabled,
    ambientLightMode,
    activeLightPresetId,
    setActiveLightPresetId,
    setLightingEnabled,
    toggleLighting,
    setAmbientLightMode,
    clearLights,
    addLight,
    openProceduralModal,
  } = useMapStore();

  const [isWeatherOpen, setIsWeatherOpen] = useState(false);
  const weatherDropdownRef = useRef<HTMLDivElement>(null);

  const [isLightOpen, setIsLightOpen] = useState(false);
  const lightDropdownRef = useRef<HTMLDivElement>(null);

  const [isAoeOpen, setIsAoeOpen] = useState(false);
  const aoeDropdownRef = useRef<HTMLDivElement>(null);
  const [activeAoeTab, setActiveAoeTab] = useState<'presets' | 'custom'>('presets');
  const [customShape, setCustomShape] = useState<AoeShape>('circle');
  const [customSize, setCustomSize] = useState<number>(20);
  const [customColor, setCustomColor] = useState<string>('#EF4444');
  const [customLabel, setCustomLabel] = useState<string>('');

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (weatherDropdownRef.current && !weatherDropdownRef.current.contains(e.target as Node)) {
        setIsWeatherOpen(false);
      }
      if (aoeDropdownRef.current && !aoeDropdownRef.current.contains(e.target as Node)) {
        setIsAoeOpen(false);
      }
      if (lightDropdownRef.current && !lightDropdownRef.current.contains(e.target as Node)) {
        setIsLightOpen(false);
      }
    };
    if (isWeatherOpen || isAoeOpen || isLightOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [isWeatherOpen, isAoeOpen, isLightOpen]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isVideo = file.type.startsWith('video/') || /\.(mp4|webm)$/i.test(file.name);
    if (isVideo) {
      const videoUrl = URL.createObjectURL(file);
      const tempVideo = document.createElement('video');
      tempVideo.preload = 'metadata';
      tempVideo.src = videoUrl;
      tempVideo.onloadedmetadata = () => {
        setImageUrl(videoUrl, tempVideo.videoWidth || 1920, tempVideo.videoHeight || 1080, true);
      };
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result as string;
      if (result) {
        const img = new Image();
        img.onload = () => {
          setImageUrl(result, img.width, img.height, false);
        };
        img.src = result;
      }
    };
    reader.readAsDataURL(file);
  };

  const getViewportCenter = () => {
    const state = useMapStore.getState();
    const safeScale = Math.max(state.scale, 0.1);
    const viewW = window.innerWidth || 1200;
    const viewH = window.innerHeight || 800;
    let cx = (-state.panX + viewW / 2) / safeScale;
    let cy = (-state.panY + viewH / 2) / safeScale;
    const cellSize = state.gridCellSize || 50;
    cx = Math.round(cx / cellSize) * cellSize;
    cy = Math.round(cy / cellSize) * cellSize;
    cx = Math.max(cellSize, Math.min(state.imageWidth - cellSize, cx));
    cy = Math.max(cellSize, Math.min(state.imageHeight - cellSize, cy));
    return { x: cx, y: cy };
  };

  const handleApplyTemplate = (
    template: { shape: AoeShape; sizeFeet: number; color: string; label?: string },
    mode: 'center' | 'placement' = 'center'
  ) => {
    if (mode === 'center') {
      const { x, y } = getViewportCenter();
      const id = addAoeTemplate({
        shape: template.shape,
        sizeFeet: template.sizeFeet,
        x,
        y,
        rotation: 0,
        color: template.color,
        label: template.label,
      });
      setSelectedAoeId(id);
      setActiveTool('select');
      setIsAoeOpen(false);
    } else {
      setActiveTool('aoe');
      setPendingAoe({
        shape: template.shape,
        sizeFeet: template.sizeFeet,
        rotation: 0,
        color: template.color,
        label: template.label,
      });
      setIsAoeOpen(false);
    }
  };

  return (
    <div className="flex flex-col w-full flex-shrink-0 relative z-30">
      <div className="flex flex-wrap items-center justify-between gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1 bg-surface/85 border-b border-[rgba(255,255,255,0.08)] backdrop-blur-md text-xs select-none w-full shadow-glass">
        {/* Left Side: Groups 1, 2, 3 */}
        <div className={`flex flex-wrap items-center gap-1 sm:gap-1.5 relative ${isAoeOpen ? 'z-40' : 'z-30'}`}>
          {!isMasterView && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gold/15 border border-gold/40 text-gold-light text-xs font-semibold select-none shadow-sm">
              <Hand className="h-3.5 w-3.5 text-gold animate-pulse flex-shrink-0" />
              <span>{isEn ? 'Pan mode active (drag to move)' : 'Режим обзора активен (перемещайте зажатой мышью)'}</span>
            </div>
          )}
          {isMasterView && (
            <>
              {/* Group 1: Navigation & Mode */}
              <div className="flex items-center gap-0.5 bg-surface/85 border border-[rgba(255,255,255,0.08)] hover:border-[#f5b920]/40 shadow-md backdrop-blur-md rounded-glass-lg p-0.5 sm:p-1 transition-all">
                {/* [ Загрузить карту / Load Map ] */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  title={isEn ? "Load map from device (.png, .jpg, .webp, .mp4, .webm)" : "Загрузить карту с устройства (.png, .jpg, .webp, .mp4, .webm)"}
                  className="px-2 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 bg-[#f5b920]/20 text-[#f5b920] border border-[#f5b920]/50 hover:bg-[#f5b920]/30 hover:border-[#f5b920] shadow-sm transition-all cursor-pointer whitespace-nowrap"
                >
                  <Upload className="h-3.5 w-3.5 text-[#f5b920] flex-shrink-0" />
                  <span>{isEn ? 'Load Map' : 'Загрузить карту'}</span>
                </button>

                <div className="h-4 w-px bg-[rgba(255,255,255,0.08)] mx-0.5" />

                {/* [ Выбор ] */}
                <button
                  type="button"
                  onClick={() => setActiveTool('select')}
                  title={isEn ? "Select and move tokens (V)" : "Выбор и перемещение токенов (V)"}
                  className={`px-1.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                    activeTool === 'select'
                      ? 'bg-gold/20 text-gold-light border border-gold/60 shadow-sm'
                      : 'text-gray-300 hover:text-gold-light hover:bg-gold/10 hover:border-gold/30 border border-transparent'
                  }`}
                >
                  <MousePointer className="h-3.5 w-3.5" />
                  <span>{isEn ? 'Select' : 'Выбор'}</span>
                </button>

                {/* [ Рука/Панорама ] */}
                <button
                  type="button"
                  onClick={() => setActiveTool('pan')}
                  title={isEn ? "Pan map (H or hold Space)" : "Обзор / перемещение карты (H или зажать пробел)"}
                  className={`px-1.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                    activeTool === 'pan'
                      ? 'bg-gold/20 text-gold-light border border-gold/60 shadow-sm'
                      : 'text-gray-300 hover:text-gold-light hover:bg-gold/10 hover:border-gold/30 border border-transparent'
                  }`}
                >
                  <Hand className="h-3.5 w-3.5" />
                  <span>{isEn ? 'Pan' : 'Обзор'}</span>
                </button>

                <div className="h-4 w-px bg-[rgba(255,255,255,0.08)] mx-0.5" />

                {/* [ Расставить бойцов ] */}
                <button
                  type="button"
                  onClick={() => useCombatStore.getState().autoArrangeCombatantsOnMap()}
                  title={isEn ? "Automatically arrange combatants on map (players left, enemies right)" : "Автоматическое размещение участников боя на карте (игроки слева, враги справа)"}
                  className="px-1.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all text-gray-300 hover:text-gold-light hover:bg-gold/10 hover:border-gold/30 border border-transparent"
                >
                  <Users className="h-3.5 w-3.5 text-emerald-400" />
                  <span className="hidden xl:inline">{isEn ? 'Deploy' : 'Размещение'}</span>
                </button>

                {/* [ Добавить независимый токен ] */}
                <button
                  type="button"
                  onClick={() => {
                    const { x, y } = getViewportCenter();
                    addMapToken({
                      id: crypto.randomUUID(),
                      name: isEn ? 'New Token' : 'Новый токен',
                      x,
                      y,
                      size: 'medium',
                      hp: 20,
                      maxHp: 20,
                      ac: 12,
                      speed: isEn ? '30 ft.' : '30 фт.',
                      isVisibleToPlayers: true,
                    });
                  }}
                  title={isEn ? "Add independent token to map" : "Добавить независимый токен на карту (не участвует в инициативе пока не нажать 'В бой!')"}
                  className="px-1.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all text-gray-300 hover:text-emerald-300 hover:bg-emerald-950/30 hover:border-emerald-500/30 border border-transparent"
                >
                  <Plus className="h-3.5 w-3.5 text-emerald-400" />
                  <span className="hidden xl:inline">{isEn ? '+ Token' : '+ Токен'}</span>
                  {mapTokens.length > 0 && (
                    <span className="font-mono text-[10px] text-emerald-400/80">({mapTokens.length})</span>
                  )}
                </button>

                {/* [ Кузница токенов ] */}
                <button
                  type="button"
                  onClick={() => useTokenForgeStore.getState().openForge()}
                  title={isEn ? "Token Forge: vector rings, faction glows, and HD export" : "Кузница токенов: кадрирование, векторные окантовки, свечение фракций и HD-экспорт токенов"}
                  className="px-1.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all text-amber-300 hover:text-amber-200 hover:bg-amber-950/30 hover:border-amber-500/40 border border-transparent cursor-pointer"
                >
                  <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                  <span className="hidden xl:inline">{isEn ? 'Forge' : 'Кузница'}</span>
                </button>
              </div>

              {/* Group 2: Tactical Measurements */}
              <div className={`flex items-center gap-0.5 bg-surface/85 border border-[rgba(255,255,255,0.08)] hover:border-[#f5b920]/40 shadow-md backdrop-blur-md rounded-glass-lg p-0.5 sm:p-1 flex-shrink-0 transition-all relative ${isAoeOpen ? 'z-50' : 'z-10'}`}>
                {/* [ Линейка ] */}
                <button
                  type="button"
                  onClick={() => setActiveTool('ruler')}
                  title={isEn ? "Distance ruler: grid snapping (R or hold Shift)" : "Линейка дистанций: точный подсчёт клеток и привязка к сетке (R или зажать Shift)"}
                  className={`px-1.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                    activeTool === 'ruler'
                      ? 'bg-gold/20 text-gold-light border border-gold/60 shadow-sm'
                      : 'text-gray-300 hover:text-gold-light hover:bg-gold/10 hover:border-gold/30 border border-transparent'
                  }`}
                >
                  <Ruler className="h-3.5 w-3.5" />
                  <span>{isEn ? "Ruler" : "Линейка"}</span>
                </button>

                <div className="h-4 w-px bg-[rgba(255,255,255,0.08)] mx-0.5" />

                {/* [ Шаблоны заклинаний (AoE) ] */}
                <div className="relative z-50" ref={aoeDropdownRef}>
                  <button
                    type="button"
                    onClick={() => setIsAoeOpen((prev) => !prev)}
                    title={isEn ? "Spell templates (AoE): Fireball, Cone of Cold, Lightning, Cubes" : "Шаблоны заклинаний (AoE): Огненный шар, Конус холода, Молния, Кубы и настраиваемые зоны"}
                    className={`px-1.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                      isAoeOpen || activeTool === 'aoe'
                        ? 'bg-purple-950/80 border border-purple-500/80 text-purple-200 shadow-sm'
                        : 'text-gray-300 hover:text-gold-light hover:bg-gold/10 hover:border-gold/30 border border-transparent'
                    }`}
                  >
                    <Sparkles className="h-3.5 w-3.5 text-purple-400" />
                    <span><span className="hidden sm:inline">{isEn ? "Templates " : "Шаблоны "}</span>AoE</span>
                    <ChevronDown className={`h-3 w-3 text-gray-400 transition-transform ${isAoeOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {/* AoE Dropdown Menu */}
                  {isAoeOpen && (
                    <div className="absolute left-0 top-full mt-2 bg-[rgba(18,22,30,0.96)] border border-[#f5b920]/50 backdrop-blur-xl rounded-glass-xl shadow-2xl p-3 z-[100] w-[350px] max-w-[calc(100vw-2rem)] max-h-[85vh] overflow-y-auto space-y-3 font-sans ring-1 ring-[#f5b920]/20">
                      {/* Tabs Header */}
                      <div className="flex items-center justify-between border-b border-slate-700/60 pb-2">
                        <span className="text-xs font-serif font-bold text-gold-light uppercase tracking-wider flex items-center gap-1">
                          <Sparkles className="h-3 w-3 text-gold" />
                          {isEn ? "Spell Templates" : "Шаблоны заклинаний"}
                        </span>
                        <div className="flex items-center bg-[#090d14] p-0.5 rounded-lg border border-slate-700/60">
                          <button
                            type="button"
                            onClick={() => setActiveAoeTab('presets')}
                            className={`px-2 py-0.5 rounded-md text-[11px] font-medium transition-colors ${
                              activeAoeTab === 'presets'
                                ? 'bg-gold/20 text-gold-light font-bold'
                                : 'text-gray-400 hover:text-gray-200'
                            }`}
                          >
                            {isEn ? "Presets" : "Пресеты"}
                          </button>
                          <button
                            type="button"
                            onClick={() => setActiveAoeTab('custom')}
                            className={`px-2 py-0.5 rounded-md text-[11px] font-medium transition-colors ${
                              activeAoeTab === 'custom'
                                ? 'bg-gold/20 text-gold-light font-bold'
                                : 'text-gray-400 hover:text-gray-200'
                            }`}
                          >
                            {isEn ? "Custom" : "Конструктор"}
                          </button>
                        </div>
                      </div>

                      {/* Tab 1: Presets */}
                      {activeAoeTab === 'presets' && (
                        <div className="space-y-1.5">
                          <div className="text-[10px] text-gray-400 font-mono mb-1">
                            {isEn ? "Click to add to center or select manual placement:" : "Кликните для добавления в центр или выберите ручное размещение:"}
                          </div>
                          <div className="space-y-1 max-h-[300px] overflow-y-auto pr-1">
                            {QUICK_PRESETS.map((preset) => (
                              <div
                                key={preset.name}
                                className="group flex items-center justify-between p-1.5 rounded-lg bg-[#18202c]/80 hover:bg-[#1f2937] border border-slate-700/60 hover:border-gold/50 transition-colors"
                              >
                                <button
                                  type="button"
                                  onClick={() => handleApplyTemplate({ ...preset, label: isEn ? preset.nameEn : preset.name }, 'center')}
                                  className="flex items-center gap-2 flex-1 text-left min-w-0"
                                  title={isEn ? "Add to viewport center" : "Добавить в центр экрана"}
                                >
                                  <span className="text-base flex-shrink-0">{preset.icon}</span>
                                  <div className="min-w-0">
                                    <div className="text-xs font-semibold text-gray-200 group-hover:text-gold-light truncate">
                                      {isEn ? (preset.nameEn || preset.name) : preset.name}
                                    </div>
                                    <div className="text-[10px] text-gray-400">{isEn ? (preset.descEn || preset.desc) : preset.desc}</div>
                                  </div>
                                </button>
                                <div className="flex items-center gap-1 flex-shrink-0">
                                  <span
                                    className="w-2.5 h-2.5 rounded-full border border-black/40 mr-1"
                                    style={{ backgroundColor: preset.color }}
                                  />
                                  <button
                                    type="button"
                                    onClick={() => handleApplyTemplate(preset, 'center')}
                                    title={isEn ? "Place in center of visible area" : "Поместить в центр видимой области"}
                                    className="p-1 rounded bg-[#1e293b] hover:bg-[#334155] text-gold-light border border-gold/30 text-[10px] font-medium flex items-center gap-0.5"
                                  >
                                    <MapPin className="h-3 w-3" />
                                    <span className="hidden sm:inline">{isEn ? "Center" : "Центр"}</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleApplyTemplate(preset, 'placement')}
                                    title={isEn ? "Place with click on map" : "Разместить кликом на карте"}
                                    className="p-1 rounded bg-[#1e293b] hover:bg-[#334155] text-purple-300 border border-purple-500/30 text-[10px] font-medium flex items-center gap-0.5"
                                  >
                                    <Crosshair className="h-3 w-3" />
                                    <span className="hidden sm:inline">{isEn ? "Click" : "Клик"}</span>
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Tab 2: Custom Creator */}
                      {activeAoeTab === 'custom' && (
                        <div className="space-y-3">
                          <div>
                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
                              {isEn ? "Area Shape" : "Форма области"}
                            </label>
                            <div className="grid grid-cols-4 gap-1">
                              {[
                                { shape: 'circle' as AoeShape, label: isEn ? 'Circle' : 'Круг' },
                                { shape: 'cone' as AoeShape, label: isEn ? 'Cone' : 'Конус' },
                                { shape: 'line' as AoeShape, label: isEn ? 'Line' : 'Линия' },
                                { shape: 'cube' as AoeShape, label: isEn ? 'Cube' : 'Куб' },
                              ].map((s) => (
                                <button
                                  key={s.shape}
                                  type="button"
                                  onClick={() => setCustomShape(s.shape)}
                                  className={`py-1.5 px-1 rounded-lg text-xs flex flex-col items-center gap-0.5 border transition-colors ${
                                    customShape === s.shape
                                      ? 'bg-gold/20 border-gold/70 text-gold-light font-bold'
                                      : 'bg-[#18202c] border-slate-700/60 text-gray-300 hover:text-white'
                                  }`}
                                >
                                  <span>{s.label}</span>
                                </button>
                              ))}
                            </div>
                          </div>

                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                                {isEn ? (customShape === 'line' ? 'Length (feet)' : 'Radius / Size (feet)') : (customShape === 'line' ? 'Длина' : 'Радиус / Размер') + ' (футы)'}
                              </label>
                              <span className="text-xs font-mono font-bold text-gold">{customSize} {isEn ? "ft." : "фт."}</span>
                            </div>
                            <div className="flex flex-wrap gap-1 mb-1.5">
                              {[5, 10, 15, 20, 30, 40, 60, 100].map((ft) => (
                                <button
                                  key={ft}
                                  type="button"
                                  onClick={() => setCustomSize(ft)}
                                  className={`px-1.5 py-0.5 rounded text-[11px] font-mono border transition-colors ${
                                    customSize === ft
                                      ? 'bg-gold text-canvas font-bold border-gold'
                                      : 'bg-[#18202c] border-slate-700/60 text-gray-300 hover:text-white'
                                  }`}
                                >
                                  {ft}
                                </button>
                              ))}
                            </div>
                            <div className="flex items-center gap-2">
                              <input
                                type="range"
                                min="5"
                                max="120"
                                step="5"
                                value={customSize}
                                onChange={(e) => setCustomSize(Number(e.target.value))}
                                className="flex-1 accent-gold h-1.5 bg-gray-700 rounded cursor-pointer"
                              />
                              <input
                                type="number"
                                min="5"
                                max="300"
                                step="5"
                                value={customSize}
                                onChange={(e) => setCustomSize(Math.max(5, Number(e.target.value) || 5))}
                                className="w-14 px-1.5 py-0.5 bg-[#090d14] border border-slate-700/60 rounded text-xs text-center font-mono text-gray-100"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
                              {isEn ? "Color / Energy Type" : "Цвет / Тип энергии"}
                            </label>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {AOE_DAMAGE_COLORS.map((c) => (
                                <button
                                  key={c.value}
                                  type="button"
                                  onClick={() => setCustomColor(c.value)}
                                  title={isEn ? (c.nameEn || c.name) : c.name}
                                  className={`w-6 h-6 rounded-full border-2 transition-transform ${
                                    customColor === c.value ? 'scale-110 border-white shadow-md' : 'border-transparent hover:scale-105'
                                  }`}
                                  style={{ backgroundColor: c.value }}
                                />
                              ))}
                              <div className="relative flex items-center ml-1">
                                <input
                                  type="color"
                                  value={customColor}
                                  onChange={(e) => setCustomColor(e.target.value)}
                                  title={isEn ? "Choose custom color" : "Выбрать свой цвет"}
                                  className="w-6 h-6 rounded cursor-pointer border border-slate-700 bg-transparent p-0"
                                />
                              </div>
                            </div>
                          </div>

                          <div>
                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
                              {isEn ? "Label / Name (optional)" : "Подпись / Название (опционально)"}
                            </label>
                            <input
                              type="text"
                              value={customLabel}
                              onChange={(e) => setCustomLabel(e.target.value)}
                              placeholder={`${customShape === 'circle' ? (isEn ? "Circle" : "Круг") : customShape === 'cone' ? (isEn ? "Cone" : "Конус") : customShape === 'line' ? (isEn ? "Line" : "Линия") : (isEn ? "Cube" : "Куб")} (${customSize} ${isEn ? "ft." : "фт."})`}
                              className="w-full px-2 py-1 bg-[#090d14] border border-slate-700/60 rounded-lg text-xs text-gray-100 placeholder-gray-500 focus:outline-none focus:border-gold/60"
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-700/60">
                            <button
                              type="button"
                              onClick={() => {
                                const label = customLabel.trim() || `${customShape === 'circle' ? 'Круг' : customShape === 'cone' ? 'Конус' : customShape === 'line' ? 'Линия' : 'Куб'} (${customSize} фт.)`;
                                handleApplyTemplate(
                                  { shape: customShape, sizeFeet: customSize, color: customColor, label },
                                  'center'
                                );
                              }}
                              className="py-1.5 px-2 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 shadow transition-all"
                            >
                              <MapPin className="h-3.5 w-3.5" />
                              <span>{isEn ? "To Map Center" : "В центр карты"}</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                const label = customLabel.trim() || `${customShape === 'circle' ? 'Круг' : customShape === 'cone' ? 'Конус' : customShape === 'line' ? 'Линия' : 'Куб'} (${customSize} фт.)`;
                                handleApplyTemplate(
                                  { shape: customShape, sizeFeet: customSize, color: customColor, label },
                                  'placement'
                                );
                              }}
                              className="py-1.5 px-2 bg-[#2e1065] hover:bg-[#3b0764] text-purple-200 border border-purple-500/60 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 shadow transition-all"
                            >
                              <Crosshair className="h-3.5 w-3.5 text-purple-300" />
                              <span>{isEn ? "Place with Click" : "Разместить кликом"}</span>
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Clear all templates if any */}
                      {aoeTemplates.length > 0 && (
                        <div className="pt-2 border-t border-slate-700/60 flex justify-end">
                          <button
                            type="button"
                            onClick={() => {
                              clearAoeTemplates();
                              setIsAoeOpen(false);
                            }}
                            className="text-[11px] text-red-400 hover:text-red-300 flex items-center gap-1 px-2 py-0.5 rounded-lg hover:bg-red-950/40 border border-red-900/40 transition-colors"
                          >
                            <Trash2 className="h-3 w-3" />
                            <span>{isEn ? "Clear all templates" : "Удалить все шаблоны"} ({aoeTemplates.length})</span>
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Clear AoE button if any exist */}
                {aoeTemplates.length > 0 && (
                  <button
                    onClick={clearAoeTemplates}
                    title={isEn ? "Clear all spell templates" : "Очистить все шаблоны заклинаний"}
                    className="p-1 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-950/50 flex items-center gap-0.5 transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span className="text-[10px] font-mono">({aoeTemplates.length})</span>
                  </button>
                )}
              </div>

              {/* Group 3: Paint Engine (Draw, Eraser, Quick Palette, Width, Undo, Clear) */}
              <div className="flex items-center gap-0.5 sm:gap-1 bg-surface/85 border border-[rgba(255,255,255,0.08)] hover:border-[#f5b920]/40 shadow-md backdrop-blur-md rounded-glass-lg p-0.5 sm:p-1 transition-all">
                {/* [ Рисовать ] */}
                <button
                  type="button"
                  onClick={() => setActiveTool(activeTool === 'draw' ? 'select' : 'draw')}
                  title={isEn ? "Brush drawing (D)" : "Рисование кистью (D)"}
                  className={`px-1.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
                    activeTool === 'draw'
                      ? 'bg-gold/20 text-gold-light border border-gold/60 shadow-sm'
                      : 'text-gray-300 hover:text-gold-light hover:bg-gold/10 hover:border-gold/30 border border-transparent'
                  }`}
                >
                  <Pencil className="h-3.5 w-3.5 text-gold" />
                  <span>{isEn ? 'Draw' : 'Рисование'}</span>
                </button>

                {/* [ ⌫ Ластик ] */}
                <button
                  type="button"
                  onClick={() => setActiveTool(activeTool === 'eraser' ? 'select' : 'eraser')}
                  title={isEn ? "Drawing eraser (E)" : "Ластик рисунков (E)"}
                  className={`px-1.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
                    activeTool === 'eraser'
                      ? 'bg-red-950/70 border border-red-500/70 text-red-200 shadow-sm'
                      : 'text-gray-300 hover:text-red-400 hover:bg-red-950/30 hover:border-red-500/30 border border-transparent'
                  }`}
                >
                  <Eraser className="h-3.5 w-3.5 text-red-400" />
                  <span>{isEn ? 'Eraser' : 'Ластик'}</span>
                </button>

                {/* Conditional Palette & Widths when Draw or Eraser is active */}
                {(activeTool === 'draw' || activeTool === 'eraser') && (
                  <>
                    <div className="h-4 w-px bg-[rgba(255,255,255,0.08)] mx-0.5" />

                    {/* Quick Palette (8 colors) */}
                    <div className="flex items-center gap-0.5 px-0.5">
                      {PALETTE_COLORS.map((c) => {
                        const isSelected = activeTool === 'draw' && currentBrushColor.toLowerCase() === c.value.toLowerCase();
                        return (
                          <button
                            key={c.value}
                            type="button"
                            onClick={() => {
                              setBrushColor(c.value);
                              if (activeTool !== 'draw') setActiveTool('draw');
                            }}
                            title={`${isEn ? 'Color: ' : 'Цвет: '}${isEn ? c.nameEn : c.name}`}
                            className={`w-3 h-3 rounded-full border transition-all ${c.border} ${
                              isSelected
                                ? 'ring-2 ring-gold scale-125 border-white shadow-sm'
                                : 'opacity-80 hover:opacity-100 hover:scale-110'
                            }`}
                            style={{ backgroundColor: c.value }}
                          />
                        );
                      })}
                    </div>

                    <div className="h-4 w-px bg-[rgba(255,255,255,0.08)] mx-0.5" />

                    {/* Brush Width (Thin, Medium, Thick, Marker) */}
                    <div className="flex items-center gap-0.5">
                      {[
                        { label: '2px', title: isEn ? 'Thin (2px)' : 'Тонкая (2px)', width: 2 },
                        { label: '5px', title: isEn ? 'Medium (5px)' : 'Средняя (5px)', width: 5 },
                        { label: '12px', title: isEn ? 'Thick (12px)' : 'Толстая (12px)', width: 12 },
                        { label: '24px', title: isEn ? 'Marker (24px)' : 'Маркер (24px)', width: 24 },
                      ].map((sw) => (
                        <button
                          key={sw.width}
                          type="button"
                          onClick={() => {
                            setBrushWidth(sw.width);
                            if (activeTool !== 'draw' && activeTool !== 'eraser') setActiveTool('draw');
                          }}
                          title={sw.title}
                          className={`px-1 py-0.5 rounded text-[10px] font-mono transition-colors ${
                            currentBrushWidth === sw.width
                              ? 'bg-gold/25 text-gold-light font-bold border border-gold/60 shadow-xs'
                              : 'text-gray-400 hover:text-gray-200 border border-transparent'
                          }`}
                        >
                          {sw.label}
                        </button>
                      ))}
                    </div>
                  </>
                )}

                <div className="h-4 w-px bg-[rgba(255,255,255,0.08)] mx-0.5" />

                {/* [ ↶ Undo ] */}
                <button
                  type="button"
                  onClick={undoLastDrawing}
                  disabled={drawingLines.length === 0}
                  title={isEn ? "Undo last stroke (Ctrl+Z)" : "Отменить последний штрих (Ctrl+Z)"}
                  className="px-1.5 py-1 rounded-lg text-gray-300 hover:text-gold-light hover:bg-gold/10 hover:border-gold/30 border border-transparent disabled:opacity-35 disabled:pointer-events-none flex items-center gap-1 transition-all"
                >
                  <Undo2 className="h-3.5 w-3.5 text-gold" />
                  <span className="hidden 2xl:inline">{isEn ? 'Undo' : 'Отмена'}</span>
                  {drawingLines.length > 0 && (
                    <span className="font-mono text-[10px] text-gray-400">({drawingLines.length})</span>
                  )}
                </button>

                {/* [ Очистить ] */}
                <button
                  type="button"
                  onClick={clearAllDrawings}
                  disabled={drawingLines.length === 0}
                  title={isEn ? "Clear all drawings" : "Очистить все рисунки"}
                  className="p-1 rounded-lg text-gray-400 hover:text-red-300 hover:bg-red-950/40 border border-transparent disabled:opacity-35 disabled:pointer-events-none transition-colors"
                >
                  <Trash2 className="h-3.5 w-3.5 text-red-400" />
                </button>
              </div>

              {/* Group 3.5: Master Interactive Objects & Physics (Pins, Walls, Doors) */}
              <div className="flex items-center gap-0.5 sm:gap-1 bg-surface/85 border border-[rgba(255,255,255,0.08)] hover:border-[#f5b920]/40 shadow-md backdrop-blur-md rounded-glass-lg p-0.5 sm:p-1 flex-shrink-0 transition-all">
                {/* [ Булавка / Заметка ] */}
                <button
                  type="button"
                  onClick={() => setActiveTool(activeTool === 'pin' ? 'select' : 'pin')}
                  title={isEn ? "GM Pin: interactive note or trap (P)" : "Метка Мастера: кликните по карте для размещения интерактивной заметки/ловушки (P)"}
                  className={`px-1.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
                    activeTool === 'pin'
                      ? 'bg-amber-500/25 text-amber-300 border border-amber-500/60 shadow-sm'
                      : 'text-gray-300 hover:text-amber-300 hover:bg-amber-500/10 hover:border-amber-500/30 border border-transparent'
                  }`}
                >
                  <MapPin className="h-3.5 w-3.5 text-amber-400" />
                  <span>{isEn ? "Pin" : "Метка"}</span>
                  {pins.length > 0 && (
                    <span className="font-mono text-[10px] text-amber-300/80">({pins.length})</span>
                  )}
                </button>
                {pins.length > 0 && (
                  <button
                    type="button"
                    onClick={clearPins}
                    title={isEn ? "Delete all pins from map" : "Удалить все метки с карты"}
                    className="p-1 rounded-lg text-gray-400 hover:text-red-300 hover:bg-red-950/40 border border-transparent transition-colors"
                  >
                    <Trash2 className="h-3 w-3 text-red-400" />
                  </button>
                )}

                <div className="h-4 w-px bg-[rgba(255,255,255,0.08)] mx-0.5" />

                {/* [ Стена ] */}
                <button
                  type="button"
                  onClick={() => setActiveTool(activeTool === 'wall' ? 'select' : 'wall')}
                  title={isEn ? "Wall: blocks token movement and line of sight (W)" : "Стена: протяните отрезок стены, блокирующий передвижение токенов и обзор (W)"}
                  className={`px-1.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
                    activeTool === 'wall'
                      ? 'bg-blue-500/25 text-blue-300 border border-blue-500/60 shadow-sm'
                      : 'text-gray-300 hover:text-blue-300 hover:bg-blue-500/10 hover:border-blue-500/30 border border-transparent'
                  }`}
                >
                  <ToyBrick className="h-3.5 w-3.5 text-blue-400" />
                  <span>{isEn ? "Wall" : "Стена"}</span>
                </button>

                {/* [ Дверь ] */}
                <button
                  type="button"
                  onClick={() => setActiveTool(activeTool === 'door' ? 'select' : 'door')}
                  title={isEn ? "Door: click to toggle (Open/Closed), Shift-click to lock" : "Дверь: отрезок двери. Клик переключает (Открыта/Закрыта), Shift-клик запирает"}
                  className={`px-1.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
                    activeTool === 'door'
                      ? 'bg-amber-600/30 text-amber-200 border border-amber-500/60 shadow-sm'
                      : 'text-gray-300 hover:text-amber-300 hover:bg-amber-600/10 hover:border-amber-500/30 border border-transparent'
                  }`}
                >
                  <DoorClosed className="h-3.5 w-3.5 text-amber-400" />
                  <span>{isEn ? "Door" : "Дверь"}</span>
                </button>

                {/* [ Тайная дверь ] */}
                <button
                  type="button"
                  onClick={() => setActiveTool(activeTool === 'secret_door' ? 'select' : 'secret_door')}
                  title={isEn ? "Secret door: visible to GM, hidden as normal wall to players" : "Тайник: виден Мастеру фиолетовым пунктиром с символом 'S', на экране игроков скрыт как обычная стена"}
                  className={`px-1.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
                    activeTool === 'secret_door'
                      ? 'bg-purple-600/30 text-purple-200 border border-purple-500/60 shadow-sm'
                      : 'text-gray-300 hover:text-purple-300 hover:bg-purple-600/10 hover:border-purple-500/30 border border-transparent'
                  }`}
                >
                  <EyeOff className="h-3.5 w-3.5 text-purple-400" />
                  <span>{isEn ? "Secret" : "Тайник"}</span>
                </button>

                {/* [ Окно ] */}
                <button
                  type="button"
                  onClick={() => setActiveTool(activeTool === 'window' ? 'select' : 'window')}
                  title={isEn ? "Window: transparent barrier, blocks movement, allows vision and light" : "Окно: полупрозрачная стеклянная преграда. Блокирует шаг токенов, но пропускает свет и обзор"}
                  className={`px-1.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
                    activeTool === 'window'
                      ? 'bg-cyan-600/30 text-cyan-200 border border-cyan-500/60 shadow-sm'
                      : 'text-gray-300 hover:text-cyan-300 hover:bg-cyan-600/10 hover:border-cyan-500/30 border border-transparent'
                  }`}
                >
                  <AppWindow className="h-3.5 w-3.5 text-cyan-400" />
                  <span>{isEn ? "Window" : "Окно"}</span>
                  {walls.length > 0 && (
                    <span className="font-mono text-[10px] text-gray-400">({walls.length})</span>
                  )}
                </button>

                {walls.length > 0 && (
                  <button
                    type="button"
                    onClick={clearWalls}
                    title={isEn ? "Delete all barriers and doors" : "Удалить все барьеры и двери"}
                    className="p-1 rounded-lg text-gray-400 hover:text-red-300 hover:bg-red-950/40 border border-transparent transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5 text-red-400" />
                  </button>
                )}
              </div>

              {/* Group: Dynamic Lighting & Vision */}
              <div
                className={`flex items-center gap-0.5 sm:gap-1 bg-surface/85 border border-[rgba(255,255,255,0.08)] hover:border-[#f5b920]/40 shadow-md backdrop-blur-md rounded-glass-lg p-0.5 sm:p-1 flex-shrink-0 transition-all relative ${
                  isLightOpen ? 'z-50' : 'z-10'
                }`}
              >
                {/* [ Tool: Light ] with Dropdown */}
                <div className="relative z-50" ref={lightDropdownRef}>
                  <div className="flex items-center">
                    <button
                      type="button"
                      onClick={() => setActiveTool(activeTool === 'light' ? 'select' : 'light')}
                      title={isEn ? "Light Tool: click on map to place a light source (L)" : "Освещение: клик по карте ставит светильник (L)"}
                      className={`px-1.5 py-1 rounded-l-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                        activeTool === 'light'
                          ? 'bg-amber-950/90 border border-amber-500 text-amber-200 shadow-sm'
                          : 'text-gray-300 hover:text-amber-300 hover:bg-amber-950/20 border border-transparent'
                      }`}
                    >
                      <Flame className={`h-3.5 w-3.5 ${isLightingEnabled ? 'text-amber-400' : 'text-gray-400'}`} />
                      <span>{isEn ? "Light" : "Освещение"}</span>
                      {lights.length > 0 && (
                        <span className="font-mono text-[10px] text-amber-400/90">({lights.length})</span>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsLightOpen((prev) => !prev)}
                      title={isEn ? "Dynamic lighting settings, ambient light, and presets" : "Настройки динамического света, глобальное освещение и пресеты"}
                      className={`px-1 py-1 rounded-r-lg text-xs transition-all border ${
                        isLightOpen || activeTool === 'light'
                          ? 'bg-amber-950/90 border-amber-500 text-amber-200 shadow-sm border-l-0'
                          : 'text-gray-400 hover:text-amber-200 hover:bg-amber-950/20 border-transparent border-l-0'
                      }`}
                    >
                      <ChevronDown className={`h-3 w-3 transition-transform ${isLightOpen ? 'rotate-180' : ''}`} />
                    </button>
                  </div>

                  {/* Dropdown Popover */}
                  {isLightOpen && (
                    <div className="absolute left-0 top-full mt-2 bg-[rgba(18,22,30,0.96)] border border-amber-500/50 backdrop-blur-xl rounded-glass-xl shadow-2xl p-3 z-[100] w-[320px] max-w-[calc(100vw-2rem)] max-h-[85vh] overflow-y-auto space-y-3 font-sans ring-1 ring-amber-500/20">
                      {/* Header */}
                      <div className="flex items-center justify-between border-b border-slate-700/60 pb-2">
                        <span className="text-xs font-serif font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                          <Flame className="h-3.5 w-3.5 text-amber-400" />
                          {isEn ? "Dynamic Light & Vision" : "Динамический свет и зрение"}
                        </span>
                        <button
                          type="button"
                          onClick={toggleLighting}
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase transition-colors ${
                            isLightingEnabled
                              ? 'bg-amber-500 text-black shadow-sm'
                              : 'bg-surface-subtle text-gray-400 hover:text-gray-200'
                          }`}
                        >
                          {isEn ? (isLightingEnabled ? 'Enabled' : 'Disabled') : (isLightingEnabled ? 'Включен' : 'Выключен')}
                        </button>
                      </div>

                      {/* Ambient Light Mode Selector */}
                      <div className="space-y-1.5">
                        <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider block">
                          {isEn ? "Global Map Lighting" : "Глобальное освещение карты"}
                        </span>
                        <div className="grid grid-cols-2 gap-1">
                          {(Object.keys(AMBIENT_LIGHT_CONFIG) as AmbientLightMode[]).map((mode) => {
                            const conf = AMBIENT_LIGHT_CONFIG[mode];
                            const isCurrent = ambientLightMode === mode;
                            return (
                              <button
                                key={mode}
                                type="button"
                                onClick={() => setAmbientLightMode(mode)}
                                className={`px-2 py-1.5 rounded-lg text-left text-[11px] transition-colors border ${
                                  isCurrent
                                    ? 'bg-amber-950/70 text-amber-200 border-amber-500/80 font-bold'
                                    : 'bg-[#18202c]/60 text-gray-300 border-slate-700/50 hover:bg-[#1f2937]'
                                }`}
                              >
                                <div className="font-semibold">{isEn ? (conf.nameEn || conf.name) : conf.name}</div>
                                <div className="text-[9px] text-gray-400 truncate">{isEn ? (conf.descriptionEn || conf.description) : conf.description}</div>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Presets List */}
                      <div className="space-y-1.5 pt-1 border-t border-slate-700/60">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">
                            {isEn ? "D&D Light Presets" : "Пресеты светильников D&D"}
                          </span>
                          <span className="text-[10px] text-amber-400/80 font-mono">
                            {isEn ? "Click = active" : "Клик = активный"}
                          </span>
                        </div>

                        <div className="space-y-1">
                          {DND_LIGHT_PRESETS.map((preset) => {
                            const isActive = activeLightPresetId === preset.id;
                            return (
                              <div
                                key={preset.id}
                                className={`flex items-center justify-between p-1.5 rounded-lg border transition-colors ${
                                  isActive
                                    ? 'bg-amber-950/50 border-amber-500/70 text-amber-100'
                                    : 'bg-[#18202c]/60 border-slate-700/50 text-gray-300 hover:bg-[#1f2937]'
                                }`}
                              >
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveLightPresetId(preset.id);
                                    setActiveTool('light');
                                  }}
                                  className="flex items-center gap-2 min-w-0 flex-1 text-left"
                                >
                                  <div
                                    className="w-3 h-3 rounded-full flex-shrink-0 border border-black/40"
                                    style={{ backgroundColor: preset.color }}
                                  />
                                  <div className="min-w-0">
                                    <div className="text-xs font-semibold truncate">{isEn ? (preset.nameEn || preset.name) : preset.name}</div>
                                    <div className="text-[10px] text-gray-400 truncate">{isEn ? (preset.descriptionEn || preset.description) : preset.description}</div>
                                  </div>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => {
                                    const { x, y } = getViewportCenter();
                                    const newLight = {
                                      id: crypto.randomUUID(),
                                      x,
                                      y,
                                      brightRadiusFeet: preset.brightRadiusFeet,
                                      dimRadiusFeet: preset.dimRadiusFeet,
                                      color: preset.color,
                                      intensity: preset.intensity,
                                      flicker: preset.flicker,
                                      enabled: true,
                                    };
                                    addLight(newLight);
                                    if (!isLightingEnabled) {
                                      setLightingEnabled(true);
                                    }
                                  }}
                                  title={isEn ? "Place in map center" : "Разместить в центр карты"}
                                  className="ml-2 px-1.5 py-0.5 rounded text-[10px] text-amber-300 bg-amber-950/60 border border-amber-500/40 hover:bg-amber-900/60 transition-colors flex-shrink-0"
                                >
                                  {isEn ? "To Center" : "В центр"}
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Footer Actions */}
                      {lights.length > 0 && (
                        <div className="pt-2 border-t border-slate-700/60 flex items-center justify-between text-[11px]">
                          <span className="text-gray-400">{isEn ? "Total lights: " : "Всего светильников: "}{lights.length}</span>
                          <button
                            type="button"
                            onClick={clearLights}
                            className="text-red-400 hover:text-red-300 hover:bg-red-950/40 px-2 py-0.5 rounded flex items-center gap-1 transition-colors"
                          >
                            <Trash2 className="h-3 w-3" />
                            <span>{isEn ? "Clear All" : "Очистить все"}</span>
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Quick Toggle Light Master button */}
                <button
                  type="button"
                  onClick={toggleLighting}
                  title={isEn ? (isLightingEnabled ? 'Dynamic light active: click to disable' : 'Dynamic light disabled: click to enable') : (isLightingEnabled ? 'Динамический свет активен: кликните чтобы выключить' : 'Динамический свет выключен: кликните чтобы включить')}
                  className={`p-1 rounded-lg text-xs transition-colors border ${
                    isLightingEnabled
                      ? 'bg-amber-950/60 border-amber-500/70 text-amber-300'
                      : 'text-gray-400 border-transparent hover:text-gray-200 hover:bg-white/5'
                  }`}
                >
                  <Sun className={`h-3.5 w-3.5 ${isLightingEnabled ? 'text-amber-400' : 'text-gray-400'}`} />
                </button>
              </div>

              {/* Group: Fog of War */}
              <div className="flex items-center gap-0.5 sm:gap-1 bg-surface/85 border border-[rgba(255,255,255,0.08)] hover:border-[#f5b920]/40 shadow-md backdrop-blur-md rounded-glass-lg p-0.5 sm:p-1 flex-shrink-0 transition-all">
                {/* [ Вкл/выкл Туман Войны ] */}
                <button
                  type="button"
                  onClick={toggleFog}
                  title={isEn ? (isFogEnabled ? "Disable Fog of War (map fully revealed)" : "Enable Fog of War (hide unexplored areas from players)") : (isFogEnabled ? "Выключить туман войны (карта полностью открыта)" : "Включить туман войны (скрыть неисследованные области от игроков)")}
                  className={`px-1.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
                    isFogEnabled
                      ? 'bg-purple-900/40 text-purple-200 border border-purple-500/60 shadow-sm'
                      : 'text-gray-400 hover:text-gray-200 hover:bg-white/5 border border-transparent'
                  }`}
                >
                  <CloudFog className={`h-3.5 w-3.5 ${isFogEnabled ? 'text-purple-400' : 'text-gray-400'}`} />
                  <span>{isEn ? 'Fog' : 'Туман'}</span>
                  {isFogEnabled && (
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse ml-0.5" />
                  )}
                </button>

                {isFogEnabled && (
                  <>
                    <div className="h-4 w-px bg-[rgba(255,255,255,0.08)] mx-0.5" />

                    {/* [ Инструмент Тумана: Активировать ] */}
                    <button
                      type="button"
                      onClick={() => setActiveTool(activeTool === 'fog' ? 'select' : 'fog')}
                      title={isEn ? "Fog editor tool: click or drag across map" : "Инструмент редактирования тумана: кликайте или тяните по карте"}
                      className={`px-1.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
                        activeTool === 'fog'
                          ? 'bg-gold/20 text-gold-light border border-gold/60 shadow-sm'
                          : 'text-gray-300 hover:text-gold-light hover:bg-gold/10 hover:border-gold/30 border border-transparent'
                      }`}
                    >
                      <span>{isEn ? "Editor" : "Редактор"}</span>
                    </button>

                    {/* Mode Toggle: Reveal (Открыть) vs Conceal (Скрыть) */}
                    <div className="flex items-center bg-[#0d1117] rounded-md p-0.5 border border-slate-700/60">
                      <button
                        type="button"
                        onClick={() => {
                          setFogToolMode('reveal');
                          if (activeTool !== 'fog') setActiveTool('fog');
                        }}
                        title={isEn ? "Reveal area to players (Reveal)" : "Открыть область для игроков (Reveal)"}
                        className={`px-1.5 py-0.5 rounded text-[11px] font-semibold flex items-center gap-1 transition-all ${
                          fogToolMode === 'reveal' && activeTool === 'fog'
                            ? 'bg-sky-600/40 text-sky-200 border border-sky-400/60'
                            : 'text-gray-400 hover:text-sky-300 border border-transparent'
                        }`}
                      >
                        <Eye className="h-3 w-3 text-sky-400" />
                        <span className="hidden lg:inline">{isEn ? "Reveal" : "Открыть"}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setFogToolMode('conceal');
                          if (activeTool !== 'fog') setActiveTool('fog');
                        }}
                        title={isEn ? "Conceal area with fog (Conceal)" : "Скрыть область туманом (Conceal)"}
                        className={`px-1.5 py-0.5 rounded text-[11px] font-semibold flex items-center gap-1 transition-all ${
                          fogToolMode === 'conceal' && activeTool === 'fog'
                            ? 'bg-purple-900/50 text-purple-200 border border-purple-500/60'
                            : 'text-gray-400 hover:text-purple-300 border border-transparent'
                        }`}
                      >
                        <EyeOff className="h-3 w-3 text-purple-400" />
                        <span className="hidden lg:inline">{isEn ? "Conceal" : "Скрыть"}</span>
                      </button>
                    </div>

                    {/* Shape Toggle: Brush vs Rect */}
                    <div className="flex items-center bg-[#0d1117] rounded-md p-0.5 border border-slate-700/60">
                      <button
                        type="button"
                        onClick={() => {
                          setFogShapeType('brush');
                          if (activeTool !== 'fog') setActiveTool('fog');
                        }}
                        title={isEn ? "Circular fog brush" : "Круглая кисть тумана"}
                        className={`p-1 rounded text-[11px] transition-all ${
                          fogShapeType === 'brush'
                            ? 'bg-slate-700 text-gold'
                            : 'text-gray-400 hover:text-gray-200'
                        }`}
                      >
                        <Circle className="h-3 w-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setFogShapeType('rect');
                          if (activeTool !== 'fog') setActiveTool('fog');
                        }}
                        title={isEn ? "Rectangular fog area" : "Прямоугольная область тумана"}
                        className={`p-1 rounded text-[11px] transition-all ${
                          fogShapeType === 'rect'
                            ? 'bg-slate-700 text-gold'
                            : 'text-gray-400 hover:text-gray-200'
                        }`}
                      >
                        <Square className="h-3 w-3" />
                      </button>
                    </div>

                    {/* Brush Size Pills (when shape is brush) */}
                    {fogShapeType === 'brush' && (
                      <div className="flex items-center gap-0.5">
                        {[30, 60, 100].map((size) => (
                          <button
                            key={size}
                            type="button"
                            onClick={() => setFogBrushSize(size)}
                            title={`${isEn ? "Brush size: " : "Размер кисти: "}${size}px`}
                            className={`px-1 py-0.5 rounded text-[10px] font-mono transition-all ${
                              fogBrushSize === size
                                ? 'bg-gold/30 text-gold-light border border-gold/60 font-bold'
                                : 'text-gray-400 hover:text-gray-200 bg-[#0d1117] border border-slate-700/50'
                            }`}
                          >
                            {size === 30 ? 'S' : size === 60 ? 'M' : 'L'}
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Undo last fog stroke */}
                    {fogShapes.length > 0 && (
                      <button
                        type="button"
                        onClick={undoLastFog}
                        title={isEn ? "Undo last fog action (Ctrl+Z)" : "Отменить последнее действие тумана (Ctrl+Z)"}
                        className="p-1 rounded-lg text-gray-400 hover:text-gold hover:bg-gold/10 transition-colors"
                      >
                        <Undo2 className="h-3 w-3" />
                      </button>
                    )}

                    {/* Quick Global Actions: Reveal All & Conceal All */}
                    <button
                      type="button"
                      onClick={revealAllFog}
                      title={isEn ? "Reveal entire map to players (clear all fog)" : "Открыть всю карту для игроков (убрать весь туман)"}
                      className="px-1.5 py-0.5 rounded text-[10px] text-sky-400 hover:text-sky-300 hover:bg-sky-950/40 border border-sky-800/40 transition-colors"
                    >
                      {isEn ? "Reveal All" : "Открыть всё"}
                    </button>
                    <button
                      type="button"
                      onClick={concealAllFog}
                      title={isEn ? "Conceal entire map with dense fog" : "Затянуть всю карту сплошным туманом"}
                      className="px-1.5 py-0.5 rounded text-[10px] text-purple-400 hover:text-purple-300 hover:bg-purple-950/40 border border-purple-800/40 transition-colors"
                    >
                      {isEn ? "Conceal All" : "Скрыть всё"}
                    </button>
                  </>
                )}
              </div>
            </>
          )}
        </div>

        {/* Right Side: Groups 4, 5 */}
        <div className={`flex items-center gap-1.5 flex-shrink-0 relative ${isWeatherOpen ? 'z-40' : 'z-20'}`}>
          {/* Group 4: Environment & FX */}
          {isMasterView && (
            <div className={`flex items-center gap-0.5 sm:gap-1 bg-surface/85 border border-[rgba(255,255,255,0.08)] hover:border-[#f5b920]/40 shadow-md backdrop-blur-md rounded-glass-lg p-0.5 sm:p-1 flex-shrink-0 transition-all relative ${isWeatherOpen ? 'z-50' : 'z-10'}`}>
              {/* [ Белый/Тёмный фон ] */}
              <button
                type="button"
                onClick={toggleWhiteBackground}
                title={isEn ? "Toggle map background (light background is ideal for projectors and TV)" : "Переключить фон карты (светлый фон идеален для проекторов и ТВ)"}
                className={`px-1.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
                  isWhiteBackground
                    ? 'bg-amber-100 border border-amber-300 text-amber-950 hover:bg-amber-200 shadow-sm'
                    : 'text-gray-300 hover:text-white hover:bg-gold/10 hover:border-gold/30 border border-transparent'
                }`}
              >
                {isWhiteBackground ? (
                  <>
                    <Moon className="h-3.5 w-3.5 text-slate-800" />
                    <span>{isEn ? "Dark" : "Тёмный"}</span>
                  </>
                ) : (
                  <>
                    <Sun className="h-3.5 w-3.5 text-amber-400" />
                    <span>{isEn ? "Light" : "Светлый"}</span>
                  </>
                )}
              </button>

              <div className="h-4 w-px bg-[rgba(255,255,255,0.08)] mx-0.5" />

              {/* [ Погода: Ясно / Дождь / Снег / Туман / Искры ] */}
              <div className="relative z-50" ref={weatherDropdownRef}>
                <button
                  type="button"
                  onClick={() => setIsWeatherOpen((prev) => !prev)}
                  title={isEn ? "Atmospheric weather & particle effects (60 FPS)" : "Атмосферная погода и эффекты частиц (60 кадров/сек)"}
                  className={`px-1.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
                    weatherEffect !== 'none'
                      ? 'bg-gold/20 text-gold-light border border-gold/60 shadow-sm'
                      : 'text-gray-300 hover:text-white hover:bg-gold/10 hover:border-gold/30 border border-transparent'
                  }`}
                >
                  <Sparkles className="h-3.5 w-3.5 text-gold/80" />
                  <span className="hidden sm:inline">{WEATHER_OPTIONS.find((w) => w.id === weatherEffect)?.[isEn ? 'labelEn' : 'name'] || (isEn ? 'Clear' : 'Ясно')}</span>
                  <ChevronDown className={`h-3 w-3 text-gold/70 transition-transform duration-150 ${isWeatherOpen ? 'rotate-180' : ''}`} />
                </button>

                {isWeatherOpen && (
                  <div
                    className="absolute right-0 top-full mt-2 z-[100] min-w-[210px] rounded-glass-xl border border-[#f5b920]/50 bg-[rgba(18,22,30,0.96)] shadow-2xl p-1.5 flex flex-col gap-1 text-xs backdrop-blur-xl ring-1 ring-[#f5b920]/20 animate-in fade-in zoom-in-95 duration-100"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="text-[10px] font-bold text-gray-400 uppercase px-2.5 pt-1 pb-1 tracking-wider border-b border-slate-700/60 flex items-center justify-between font-serif">
                      <span className="text-gold-light">{isEn ? "Map Weather" : "Погода карты"}</span>
                      <span className="text-gold/80 text-[9px] font-mono">{isEn ? "60 FPS" : "60 кадров/сек"}</span>
                    </div>
                    {WEATHER_OPTIONS.map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => {
                          setWeatherEffect(opt.id);
                          setIsWeatherOpen(false);
                        }}
                        className={`w-full px-2.5 py-1.5 rounded-lg text-left flex items-center justify-between transition-colors ${
                          weatherEffect === opt.id
                            ? 'bg-gold/20 text-gold-light font-bold border border-gold/50 shadow-sm'
                            : 'text-gray-300 hover:text-white hover:bg-[#1a202c]'
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          <span>{isEn ? opt.labelEn : opt.label}</span>
                        </span>
                        {weatherEffect === opt.id && <Check className="h-3 w-3 text-gold" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Group 5: Grid & Viewport */}
          <div className="flex items-center gap-0.5 sm:gap-1 bg-surface/85 border border-[rgba(255,255,255,0.08)] hover:border-[#f5b920]/40 shadow-md backdrop-blur-md rounded-glass-lg p-0.5 sm:p-1 flex-shrink-0 transition-all">
            {isMasterView && (
              <>
                {/* [ ⊞ Сетка ] */}
                <button
                  type="button"
                  onClick={toggleGrid}
                  title={isEn ? "Toggle tactical grid" : "Отображение тактической сетки"}
                  className={`px-1.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
                    isGridVisible
                      ? 'bg-gold/20 text-gold-light border border-gold/60 shadow-sm'
                      : 'text-gray-400 hover:text-white hover:bg-gold/10 hover:border-gold/30 border border-transparent'
                  }`}
                >
                  <Grid className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">{isEn ? "Grid" : "Сетка"}</span>
                </button>

                <div className="flex items-center gap-0.5 text-xs font-mono">
                  <button
                    type="button"
                    onClick={() => setGridCellSize(gridCellSize - 5)}
                    title={isEn ? "Decrease grid step (-5px)" : "Уменьшить шаг сетки (-5px)"}
                    className="w-5 h-5 flex items-center justify-center rounded bg-[#1a202c] border border-slate-700 text-gray-300 hover:text-white hover:border-gold/40"
                  >
                    -
                  </button>
                  <span className="text-[11px] text-gray-300 px-1 font-mono">{gridCellSize}px</span>
                  <button
                    type="button"
                    onClick={() => setGridCellSize(gridCellSize + 5)}
                    title={isEn ? "Increase grid step (+5px)" : "Увеличить шаг сетки (+5px)"}
                    className="w-5 h-5 flex items-center justify-center rounded bg-[#1a202c] border border-slate-700 text-gray-300 hover:text-white hover:border-gold/40"
                  >
                    +
                  </button>
                </div>

                {/* Grid Type Selector (Square / Hex Pointy / Hex Flat) */}
                <div className="flex items-center gap-0.5 bg-[#090d14] border border-slate-700/60 rounded-md p-0.5">
                  <button
                    type="button"
                    onClick={() => setGridType('square')}
                    title={isEn ? "Square grid (Square 5 ft.)" : "Квадратная сетка (Square 5 ft)"}
                    className={`px-1 py-0.5 rounded text-[10px] font-semibold transition-colors ${
                      gridType === 'square'
                        ? 'bg-gold/25 text-gold-light font-bold border border-gold/60 shadow-xs'
                        : 'text-gray-400 hover:text-gray-200 border border-transparent'
                    }`}
                  >
                    {isEn ? "■ Square" : "■ Квадрат"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setGridType('hex-pointy')}
                    title={isEn ? "Hexagonal vertical grid (Pointy-topped hex)" : "Гексагональная вертикальная сетка (Pointy-topped hex)"}
                    className={`px-1 py-0.5 rounded text-[10px] font-semibold transition-colors ${
                      gridType === 'hex-pointy'
                        ? 'bg-gold/25 text-gold-light font-bold border border-gold/60 shadow-xs'
                        : 'text-gray-400 hover:text-gray-200 border border-transparent'
                    }`}
                  >
                    {isEn ? "⬡ Hex V" : "⬡ Гекс В"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setGridType('hex-flat')}
                    title={isEn ? "Hexagonal horizontal grid (Flat-topped hex)" : "Гексагональная горизонтальная сетка (Flat-topped hex)"}
                    className={`px-1 py-0.5 rounded text-[10px] font-semibold transition-colors ${
                      gridType === 'hex-flat'
                        ? 'bg-gold/25 text-gold-light font-bold border border-gold/60 shadow-xs'
                        : 'text-gray-400 hover:text-gray-200 border border-transparent'
                    }`}
                  >
                    {isEn ? "⬢ Hex H" : "⬢ Гекс Г"}
                  </button>
                </div>

                <div className="h-4 w-px bg-[rgba(255,255,255,0.08)] mx-0.5" />
              </>
            )}

            {/* [ Масштаб: - / + / Сброс / Вписать ] */}
            <div className="flex items-center gap-0.5 font-mono text-xs">
              <button
                type="button"
                onClick={zoomOut}
                title={isEn ? "Zoom out (-)" : "Отдалить карту (-)"}
                className="p-1 rounded-lg text-gray-300 hover:text-white hover:bg-[#1a202c] transition-colors"
              >
                <ZoomOut className="h-3.5 w-3.5" />
              </button>

              <span className="text-[11px] text-gold font-bold px-1 min-w-[36px] text-center">
                {Math.round(scale * 100)}%
              </span>

              <button
                type="button"
                onClick={zoomIn}
                title={isEn ? "Zoom in (+)" : "Приблизить карту (+)"}
                className="p-1 rounded-lg text-gray-300 hover:text-white hover:bg-[#1a202c] transition-colors"
              >
                <ZoomIn className="h-3.5 w-3.5" />
              </button>

              <button
                type="button"
                onClick={onFitToViewport}
                title={isEn ? "Fit map to viewport" : "Вписать карту в окно"}
                className="p-1 rounded-lg text-gray-300 hover:text-gold-light hover:bg-[#1a202c] transition-colors"
              >
                <Maximize2 className="h-3.5 w-3.5" />
              </button>

              <button
                type="button"
                onClick={resetView}
                title={isEn ? "Reset zoom (100%)" : "Сброс масштаба (100%)"}
                className="p-1 rounded-lg text-gray-300 hover:text-white hover:bg-[#1a202c] transition-colors"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </button>

              {isMasterView && (
                <button
                  type="button"
                  onClick={() => {
                    const { panX, panY, scale } = useMapStore.getState();
                    broadcastService.send({
                      type: 'SYNC_VIEWPORT',
                      payload: { panX, panY, scale },
                    });
                  }}
                  title={isEn ? "Send current view and zoom to player display" : "Отправить текущий ракурс и масштаб карты на экран игроков"}
                  className="px-2 py-1 rounded-lg text-emerald-400 hover:text-emerald-300 bg-emerald-950/40 hover:bg-emerald-900/60 border border-emerald-600/60 transition-colors flex items-center gap-1 shadow-sm cursor-pointer"
                >
                  <Monitor className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline font-sans text-[11px] font-bold">{isEn ? 'Players' : 'Игроки'}</span>
                </button>
              )}
            </div>

            {/* Map Management: Procedural Generator and Upload */}
            {isMasterView && (
              <>
                <div className="h-4 w-px bg-[rgba(255,255,255,0.08)] mx-0.5" />
                <button
                  type="button"
                  onClick={openProceduralModal}
                  title={isEn ? "Procedural map & dungeon generator" : "Процедурный генератор карт и подземелий (BSP и пещеры)"}
                  className="px-1.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 text-gold hover:text-gold-light hover:bg-gold/15 hover:border-gold/40 border border-gold/30 transition-all shadow-sm"
                >
                  <Wand2 className="h-3.5 w-3.5 text-gold" />
                  <span className="hidden xl:inline">{isEn ? 'Map Generator' : 'Генератор карт'}</span>
                  <span className="hidden sm:inline xl:hidden">{isEn ? 'Generator' : 'Генератор'}</span>
                </button>

                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept="image/*,video/mp4,video/webm"
                  className="hidden"
                />
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
