import { useState, useEffect, useCallback, useRef } from 'react';
import { useMapStore } from '../../store/mapStore';
import { useSceneStore } from '../../store/sceneStore';
import { usePartyStore } from '../../store/partyStore';
import { useSettingsStore } from '../../store/settingsStore';
import {
  Wand2,
  Dices,
  Check,
  Plus,
  X,
  Grid,
  Layers,
  Eye,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import {
  generateProceduralDungeon,
  GeneratedDungeonResult,
  DungeonGeneratorStyle,
  DungeonPaletteId,
  DungeonTextureId,
  DUNGEON_PALETTES,
} from '../../engine/proceduralDungeon';

const GRID_PRESETS = [
  { label: '20x20', w: 20, h: 20 },
  { label: '30x30', w: 30, h: 30 },
  { label: '40x40', w: 40, h: 40 },
  { label: '40x22 (16:9)', w: 40, h: 22 },
  { label: '48x27 (FHD)', w: 48, h: 27 },
  { label: '60x60 (Mega)', w: 60, h: 60 },
];

export function ProceduralMapModal() {
  const isProceduralModalOpen = useMapStore((s) => s.isProceduralModalOpen);
  const closeProceduralModal = useMapStore((s) => s.closeProceduralModal);
  const setImageUrl = useMapStore((s) => s.setImageUrl);
  const setGridCellSize = useMapStore((s) => s.setGridCellSize);
  const setWalls = useMapStore((s) => s.setWalls);
  const setBackgroundTexture = useMapStore((s) => s.setBackgroundTexture);

  const createScene = useSceneStore((s) => s.createScene);
  const updateScene = useSceneStore((s) => s.updateScene);
  const switchScene = useSceneStore((s) => s.switchScene);
  const syncCurrentMapToActiveScene = useSceneStore((s) => s.syncCurrentMapToActiveScene);
  const showToast = usePartyStore((s) => s.showToast);
  const language = useSettingsStore((s) => s.language);
  const isEn = language === 'en';

  // Settings State
  const [style, setStyle] = useState<DungeonGeneratorStyle>('caves');
  const [gridWidth, setGridWidth] = useState<number>(30);
  const [gridHeight, setGridHeight] = useState<number>(30);
  const [palette, setPalette] = useState<DungeonPaletteId>('granite');
  const [texture, setTexture] = useState<DungeonTextureId>('none');
  const [roomDensity, setRoomDensity] = useState<'low' | 'medium' | 'high'>('medium');
  const [corridorWidth, setCorridorWidth] = useState<1 | 2>(2);
  const [caveWinding, setCaveWinding] = useState<number>(0.75);
  const [doorFrequency, setDoorFrequency] = useState<'none' | 'some' | 'all'>('none');
  const [includeSecretRooms, setIncludeSecretRooms] = useState<boolean>(true);
  const [initialFillRate, setInitialFillRate] = useState<number>(0.46);
  const [smoothIterations, setSmoothIterations] = useState<number>(4);
  const [seed, setSeed] = useState<number>(() => Math.floor(Math.random() * 1000000));
  const [sceneTitle, setSceneTitle] = useState<string>(isEn ? 'Underground Winding Caves' : 'Извилистые подземные пещеры');

  // Preview Generation State
  const [generationResult, setGenerationResult] = useState<GeneratedDungeonResult | null>(null);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const previewContainerRef = useRef<HTMLDivElement>(null);
  const debounceTimerRef = useRef<any>(null);

  const handleGenerate = useCallback((customSeed?: number) => {
    setIsGenerating(true);
    const activeSeed = customSeed !== undefined ? customSeed : seed;
    // Allow UI to update before synchronous generation
    setTimeout(() => {
      try {
        const result = generateProceduralDungeon({
          style,
          gridWidth,
          gridHeight,
          cellSize: 50,
          palette,
          texture,
          roomDensity,
          corridorWidth,
          caveWinding,
          doorFrequency,
          includeSecretRooms,
          initialFillRate,
          smoothIterations,
          seed: activeSeed,
        });
        setGenerationResult(result);
      } catch (err) {
        console.error('[ProceduralMapModal] Generation failed:', err);
      } finally {
        setIsGenerating(false);
      }
    }, 16);
  }, [
    style,
    gridWidth,
    gridHeight,
    palette,
    texture,
    roomDensity,
    corridorWidth,
    caveWinding,
    doorFrequency,
    includeSecretRooms,
    initialFillRate,
    smoothIterations,
    seed,
  ]);

  // Debounced auto-generation when parameters change
  useEffect(() => {
    if (!isProceduralModalOpen) return;
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(() => {
      handleGenerate();
    }, 90);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [
    isProceduralModalOpen,
    style,
    gridWidth,
    gridHeight,
    palette,
    texture,
    roomDensity,
    corridorWidth,
    caveWinding,
    doorFrequency,
    includeSecretRooms,
    initialFillRate,
    smoothIterations,
    seed,
    handleGenerate,
  ]);

  const handleRandomizeSeed = () => {
    const newSeed = Math.floor(Math.random() * 1000000);
    setSeed(newSeed);
    handleGenerate(newSeed);
  };

  // Update default scene title when style changes
  useEffect(() => {
    if (style === 'caves') {
      setSceneTitle(isEn ? 'Winding Caves' : 'Извилистые пещеры');
    } else if (style === 'bsp') {
      setSceneTitle(isEn ? 'Catacombs & Crypts' : 'Катакомбы и склепы');
    } else if (style === 'mixed') {
      setSceneTitle(isEn ? 'Cavern Fortress' : 'Пещерный комплекс');
    } else if (style === 'labyrinth') {
      setSceneTitle(isEn ? 'Ancient Labyrinth' : 'Древний лабиринт');
    } else {
      setSceneTitle(isEn ? 'Underground Caves' : 'Подземные пещеры');
    }
  }, [style, isEn]);

  if (!isProceduralModalOpen) {
    return null;
  }

  const handleApplyToCurrentMap = () => {
    if (!generationResult) return;
    setImageUrl(generationResult.backgroundDataUrl, generationResult.width, generationResult.height, false);
    setGridCellSize(generationResult.gridSize);
    setWalls(generationResult.walls);
    if (texture !== 'none' && texture !== 'transparent') {
      setBackgroundTexture(texture as any);
    }
    syncCurrentMapToActiveScene();
    closeProceduralModal();
    if (showToast) {
      showToast(
        isEn
          ? `Map "${sceneTitle}" and ${generationResult.walls.length} barriers applied to scene`
          : `Карта "${sceneTitle}" и ${generationResult.walls.length} барьеров применены к сцене`
      );
    }
  };

  const handleCreateNewScene = () => {
    if (!generationResult) return;
    const newName = sceneTitle.trim() || (isEn ? 'Procedural Dungeon' : 'Процедурное подземелье');
    const newSceneId = createScene(newName, generationResult.backgroundDataUrl, false);
    updateScene(newSceneId, {
      imageWidth: generationResult.width,
      imageHeight: generationResult.height,
      gridCellSize: generationResult.gridSize,
      walls: generationResult.walls,
    });
    if (texture !== 'none' && texture !== 'transparent') {
      setBackgroundTexture(texture as any);
    }
    switchScene(newSceneId);
    closeProceduralModal();
    if (showToast) {
      showToast(
        isEn
          ? `Created scene "${newName}" with ${generationResult.walls.length} barriers`
          : `Создана сцена "${newName}" с ${generationResult.walls.length} барьерами`
      );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-2 sm:p-4 animate-in fade-in">
      <div className="w-full max-w-5xl max-h-[94vh] bg-[#10151d] border border-gold/50 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-gray-200">
        {/* Header */}
        <div className="h-12 px-4 sm:px-6 bg-[#161d27] border-b border-white/10 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-gold/20 border border-gold/50 flex items-center justify-center text-gold">
              <Wand2 className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold font-serif text-gold-light tracking-wide">
                {isEn ? 'Scene & Dungeon Architect' : 'Архитектор сцен и подземелий'}
              </h2>
              <p className="text-[10px] text-gray-400 hidden sm:block">
                {isEn
                  ? 'Procedural organic winding caves, BSP rooms and catacombs with auto barriers'
                  : 'Процедурная генерация извилистых пещер, комнат и данжей с авто-барьерами'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleRandomizeSeed}
              disabled={isGenerating}
              className="px-2.5 py-1 rounded-lg bg-gold/20 hover:bg-gold/30 text-gold-light border border-gold/60 text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm active:scale-95 disabled:opacity-50 cursor-pointer"
              title={isEn ? 'Regenerate map with random seed' : 'Перегенерировать карту со случайным зерном'}
            >
              <Dices className={`h-3.5 w-3.5 text-gold ${isGenerating ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">{isEn ? 'Randomize' : 'Случайный сид'}</span>
            </button>
            <button
              type="button"
              onClick={closeProceduralModal}
              className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              title={isEn ? 'Close' : 'Закрыть'}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Content body: Grid 2 Columns on desktop */}
        <div className="flex-1 overflow-y-auto grid grid-cols-1 lg:grid-cols-12 gap-4 p-3 sm:p-5">
          {/* Left Column: Settings (5 cols) */}
          <div className="lg:col-span-5 space-y-3.5">
            {/* Style Selector */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="h-3.5 w-3.5 text-gold" />
                <span>{isEn ? 'Generator Type' : 'Тип генератора'}</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                <button
                  type="button"
                  onClick={() => setStyle('caves')}
                  className={`p-2 rounded-xl border text-left flex flex-col gap-0.5 transition-all cursor-pointer ${
                    style === 'caves'
                      ? 'bg-gold/20 border-gold text-gold-light shadow-md ring-1 ring-gold/40'
                      : 'bg-[#151c27] border-white/10 text-gray-400 hover:text-gray-200 hover:border-white/20'
                  }`}
                >
                  <span className="text-xs font-bold font-serif">
                    {isEn ? 'Winding Caves' : 'Извилистые пещеры'}
                  </span>
                  <span className="text-[9px] text-gray-400">
                    {isEn ? 'Twisting organic tunnels' : 'Живые изгибы и ходы'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setStyle('bsp')}
                  className={`p-2 rounded-xl border text-left flex flex-col gap-0.5 transition-all cursor-pointer ${
                    style === 'bsp'
                      ? 'bg-gold/20 border-gold text-gold-light shadow-md ring-1 ring-gold/40'
                      : 'bg-[#151c27] border-white/10 text-gray-400 hover:text-gray-200 hover:border-white/20'
                  }`}
                >
                  <span className="text-xs font-bold font-serif">
                    {isEn ? 'Rooms & Halls' : 'Комнаты и залы'}
                  </span>
                  <span className="text-[9px] text-gray-400">
                    {isEn ? 'BSP dungeon layout' : 'Классический данж'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setStyle('mixed')}
                  className={`p-2 rounded-xl border text-left flex flex-col gap-0.5 transition-all cursor-pointer ${
                    style === 'mixed'
                      ? 'bg-gold/20 border-gold text-gold-light shadow-md ring-1 ring-gold/40'
                      : 'bg-[#151c27] border-white/10 text-gray-400 hover:text-gray-200 hover:border-white/20'
                  }`}
                >
                  <span className="text-xs font-bold font-serif">
                    {isEn ? 'Cavern Fortress' : 'Пещерный замок'}
                  </span>
                  <span className="text-[9px] text-gray-400">
                    {isEn ? 'Rooms inside caves' : 'Залы среди гротов'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setStyle('labyrinth')}
                  className={`p-2 rounded-xl border text-left flex flex-col gap-0.5 transition-all cursor-pointer ${
                    style === 'labyrinth'
                      ? 'bg-gold/20 border-gold text-gold-light shadow-md ring-1 ring-gold/40'
                      : 'bg-[#151c27] border-white/10 text-gray-400 hover:text-gray-200 hover:border-white/20'
                  }`}
                >
                  <span className="text-xs font-bold font-serif">
                    {isEn ? 'Catacombs' : 'Катакомбы'}
                  </span>
                  <span className="text-[9px] text-gray-400">
                    {isEn ? 'Dense labyrinth' : 'Лабиринт и гробницы'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setStyle('cellular')}
                  className={`p-2 rounded-xl border text-left flex flex-col gap-0.5 transition-all cursor-pointer ${
                    style === 'cellular'
                      ? 'bg-gold/20 border-gold text-gold-light shadow-md ring-1 ring-gold/40'
                      : 'bg-[#151c27] border-white/10 text-gray-400 hover:text-gray-200 hover:border-white/20'
                  }`}
                >
                  <span className="text-xs font-bold font-serif">
                    {isEn ? 'Grotto Pockets' : 'Клеточный грот'}
                  </span>
                  <span className="text-[9px] text-gray-400">
                    {isEn ? 'Cellular automata' : 'Природные полости'}
                  </span>
                </button>
              </div>
            </div>

            {/* Surface Texture Selector */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-gray-300 uppercase tracking-wider block">
                {isEn ? 'Floor Surface & Texture' : 'Поверхность и текстура пола'}
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { id: 'none', label: isEn ? 'Dungeon Palette' : 'Палитра' },
                  { id: 'wood', label: isEn ? '🪵 Dark Planks' : '🪵 Доски' },
                  { id: 'stone', label: isEn ? '🧱 Stone' : '🧱 Камень' },
                  { id: 'grass', label: isEn ? '🌿 Grass' : '🌿 Трава' },
                  { id: 'water', label: isEn ? '💧 Water' : '💧 Вода' },
                  { id: 'transparent', label: isEn ? '🪟 Transparent' : '🪟 Прозрачный' },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setTexture(item.id as DungeonTextureId)}
                    className={`px-2 py-1.5 rounded-lg border text-xs font-medium text-center transition-all cursor-pointer ${
                      texture === item.id
                        ? 'bg-gold/25 text-gold-light border-gold font-bold shadow-sm'
                        : 'bg-[#151c27] border-white/10 text-gray-400 hover:text-gray-200'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Grid Dimensions */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Grid className="h-3.5 w-3.5 text-gold" />
                  <span>{isEn ? 'Grid Size (cells)' : 'Размер сетки (клеток)'}</span>
                </label>
                <div className="flex items-center gap-1 flex-wrap justify-end">
                  {GRID_PRESETS.map((p) => (
                    <button
                      key={p.label}
                      type="button"
                      onClick={() => {
                        setGridWidth(p.w);
                        setGridHeight(p.h);
                      }}
                      className={`px-1.5 py-0.5 rounded text-[9px] font-mono border transition-all cursor-pointer ${
                        gridWidth === p.w && gridHeight === p.h
                          ? 'bg-gold text-black font-bold border-gold'
                          : 'bg-[#151c27] border-white/10 text-gray-300 hover:text-white'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-[10px] text-gray-400 block mb-0.5">
                    {isEn ? `Width: ${gridWidth} cells` : `Ширина: ${gridWidth} кл.`}
                  </span>
                  <input
                    type="range"
                    min="15"
                    max="60"
                    step="5"
                    value={gridWidth}
                    onChange={(e) => setGridWidth(Number(e.target.value))}
                    className="w-full accent-gold h-1.5 bg-gray-700 rounded cursor-pointer"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-gray-400 block mb-0.5">
                    {isEn ? `Height: ${gridHeight} cells` : `Высота: ${gridHeight} кл.`}
                  </span>
                  <input
                    type="range"
                    min="15"
                    max="60"
                    step="5"
                    value={gridHeight}
                    onChange={(e) => setGridHeight(Number(e.target.value))}
                    className="w-full accent-gold h-1.5 bg-gray-700 rounded cursor-pointer"
                  />
                </div>
              </div>
            </div>

            {/* Palette */}
            {texture === 'none' && (
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-gray-300 uppercase tracking-wider block">
                  {isEn ? 'Color Palette' : 'Цветовая палитра'}
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  {(Object.keys(DUNGEON_PALETTES) as DungeonPaletteId[]).map((pid) => {
                    const p = DUNGEON_PALETTES[pid];
                    const isSelected = palette === pid;
                    return (
                      <button
                        key={pid}
                        type="button"
                        onClick={() => setPalette(pid)}
                        className={`p-2 rounded-xl border flex items-center justify-between transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-gold/20 border-gold text-gold-light font-bold ring-1 ring-gold/40'
                            : 'bg-[#151c27] border-white/10 text-gray-300 hover:text-white'
                        }`}
                      >
                        <span className="text-xs">{isEn ? (p.nameEn || p.name) : p.name}</span>
                        <div className="flex items-center gap-1">
                          <div
                            className="w-3.5 h-3.5 rounded border border-white/20"
                            style={{ backgroundColor: p.wallFill }}
                            title={isEn ? 'Wall' : 'Стена'}
                          />
                          <div
                            className="w-3.5 h-3.5 rounded border border-white/20"
                            style={{ backgroundColor: p.floorBg }}
                            title={isEn ? 'Floor' : 'Пол'}
                          />
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Algorithm Specific Settings */}
            <div className="space-y-2.5 pt-2 border-t border-white/10">
              {style === 'caves' ? (
                <>
                  {/* Winding Caves Settings */}
                  <div className="space-y-2">
                    <div>
                      <div className="flex justify-between text-[10px] text-gray-400 mb-0.5">
                        <span className="uppercase font-semibold">
                          {isEn ? 'Winding & Twists' : 'Извилистость и изгибы'}
                        </span>
                        <span className="font-mono text-gold">{Math.round(caveWinding * 100)}%</span>
                      </div>
                      <input
                        type="range"
                        min="0.3"
                        max="0.95"
                        step="0.05"
                        value={caveWinding}
                        onChange={(e) => setCaveWinding(Number(e.target.value))}
                        className="w-full accent-gold h-1.5 bg-gray-700 rounded cursor-pointer"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] text-gray-400 block mb-1 uppercase font-semibold">
                          {isEn ? 'Tunnel Width' : 'Ширина проходов'}
                        </label>
                        <div className="grid grid-cols-2 gap-1">
                          {[1, 2].map((cw) => (
                            <button
                              key={cw}
                              type="button"
                              onClick={() => setCorridorWidth(cw as 1 | 2)}
                              className={`py-1 rounded text-[10px] border transition-all cursor-pointer ${
                                corridorWidth === cw
                                  ? 'bg-gold/25 text-gold-light border-gold font-bold'
                                  : 'bg-[#151c27] border-white/10 text-gray-300 hover:text-white'
                              }`}
                            >
                              {cw === 1 ? (isEn ? '1 cell' : '1 клетка') : (isEn ? '2 cells' : '2 клетки')}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="text-[10px] text-gray-400 block mb-1 uppercase font-semibold">
                          {isEn ? 'Gates & Barricades' : 'Ворота в проходах'}
                        </label>
                        <div className="grid grid-cols-2 gap-1">
                          {[
                            { id: 'none', label: isEn ? 'None' : 'Нет' },
                            { id: 'some', label: isEn ? 'Yes' : 'Есть' },
                          ].map((df) => (
                            <button
                              key={df.id}
                              type="button"
                              onClick={() => setDoorFrequency(df.id as 'none' | 'some')}
                              className={`py-1 rounded text-[10px] border transition-all cursor-pointer ${
                                doorFrequency === df.id
                                  ? 'bg-gold/25 text-gold-light border-gold font-bold'
                                  : 'bg-[#151c27] border-white/10 text-gray-300 hover:text-white'
                              }`}
                            >
                              {df.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              ) : style === 'bsp' ? (
                <>
                  {/* BSP Settings */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-gray-400 block mb-1 uppercase font-semibold">
                        {isEn ? 'Room Density' : 'Плотность комнат'}
                      </label>
                      <div className="grid grid-cols-3 gap-1">
                        {(['low', 'medium', 'high'] as const).map((density) => (
                          <button
                            key={density}
                            type="button"
                            onClick={() => setRoomDensity(density)}
                            className={`py-1 rounded text-[10px] border transition-all cursor-pointer ${
                              roomDensity === density
                                ? 'bg-gold/25 text-gold-light border-gold font-bold'
                                : 'bg-[#151c27] border-white/10 text-gray-300 hover:text-white'
                            }`}
                          >
                            {density === 'low'
                              ? (isEn ? 'Low' : 'Низкая')
                              : density === 'medium'
                              ? (isEn ? 'Med' : 'Сред.')
                              : (isEn ? 'High' : 'Высок.')}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] text-gray-400 block mb-1 uppercase font-semibold">
                        {isEn ? 'Corridor Width' : 'Ширина коридоров'}
                      </label>
                      <div className="grid grid-cols-2 gap-1">
                        {[1, 2].map((cw) => (
                          <button
                            key={cw}
                            type="button"
                            onClick={() => setCorridorWidth(cw as 1 | 2)}
                            className={`py-1 rounded text-[10px] border transition-all cursor-pointer ${
                              corridorWidth === cw
                                ? 'bg-gold/25 text-gold-light border-gold font-bold'
                                : 'bg-[#151c27] border-white/10 text-gray-300 hover:text-white'
                            }`}
                          >
                            {cw === 1 ? (isEn ? '1 cell' : '1 клетка') : (isEn ? '2 cells' : '2 клетки')}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] text-gray-400 block mb-1 uppercase font-semibold">
                      {isEn ? 'Door Frequency' : 'Частота дверей'}
                    </label>
                    <div className="grid grid-cols-3 gap-1">
                      {(['none', 'some', 'all'] as const).map((freq) => (
                        <button
                          key={freq}
                          type="button"
                          onClick={() => setDoorFrequency(freq)}
                          className={`py-1 rounded text-[10px] border transition-all cursor-pointer ${
                            doorFrequency === freq
                              ? 'bg-gold/25 text-gold-light border-gold font-bold'
                              : 'bg-[#151c27] border-white/10 text-gray-300 hover:text-white'
                          }`}
                        >
                          {freq === 'none'
                            ? (isEn ? 'No doors' : 'Без дверей')
                            : freq === 'some'
                            ? (isEn ? 'Normal' : 'Обычная')
                            : (isEn ? 'All entrances' : 'Все входы')}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="checkbox"
                      id="includeSecretRooms"
                      checked={includeSecretRooms}
                      onChange={(e) => setIncludeSecretRooms(e.target.checked)}
                      className="rounded border-white/20 bg-[#151c27] text-gold focus:ring-gold"
                    />
                    <label htmlFor="includeSecretRooms" className="text-xs text-gray-300 cursor-pointer select-none">
                      {isEn ? 'Secret rooms & hidden doors' : 'Тайники и секретные двери'}
                    </label>
                  </div>
                </>
              ) : style === 'mixed' ? (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-gray-400 block mb-1 uppercase font-semibold">
                        {isEn ? 'Passage Width' : 'Ширина проходов'}
                      </label>
                      <div className="grid grid-cols-2 gap-1">
                        {[1, 2].map((cw) => (
                          <button
                            key={cw}
                            type="button"
                            onClick={() => setCorridorWidth(cw as 1 | 2)}
                            className={`py-1 rounded text-[10px] border transition-all cursor-pointer ${
                              corridorWidth === cw
                                ? 'bg-gold/25 text-gold-light border-gold font-bold'
                                : 'bg-[#151c27] border-white/10 text-gray-300 hover:text-white'
                            }`}
                          >
                            {cw === 1 ? (isEn ? '1 cell' : '1 клетка') : (isEn ? '2 cells' : '2 клетки')}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] text-gray-400 block mb-1 uppercase font-semibold">
                        {isEn ? 'Doors' : 'Двери'}
                      </label>
                      <div className="grid grid-cols-2 gap-1">
                        {[
                          { id: 'none', label: isEn ? 'None' : 'Нет' },
                          { id: 'some', label: isEn ? 'Standard' : 'Обычные' },
                        ].map((df) => (
                          <button
                            key={df.id}
                            type="button"
                            onClick={() => setDoorFrequency(df.id as 'none' | 'some')}
                            className={`py-1 rounded text-[10px] border transition-all cursor-pointer ${
                              doorFrequency === df.id
                                ? 'bg-gold/25 text-gold-light border-gold font-bold'
                                : 'bg-[#151c27] border-white/10 text-gray-300 hover:text-white'
                            }`}
                          >
                            {df.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="checkbox"
                      id="mixedSecret"
                      checked={includeSecretRooms}
                      onChange={(e) => setIncludeSecretRooms(e.target.checked)}
                      className="rounded border-white/20 bg-[#151c27] text-gold focus:ring-gold"
                    />
                    <label htmlFor="mixedSecret" className="text-xs text-gray-300 cursor-pointer select-none">
                      {isEn ? 'Secret rooms & hidden passages' : 'Тайники и секретные проходы'}
                    </label>
                  </div>
                </>
              ) : style === 'labyrinth' ? (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-gray-400 block mb-1 uppercase font-semibold">
                        {isEn ? 'Corridor Width' : 'Ширина коридоров'}
                      </label>
                      <div className="grid grid-cols-2 gap-1">
                        {[1, 2].map((cw) => (
                          <button
                            key={cw}
                            type="button"
                            onClick={() => setCorridorWidth(cw as 1 | 2)}
                            className={`py-1 rounded text-[10px] border transition-all cursor-pointer ${
                              corridorWidth === cw
                                ? 'bg-gold/25 text-gold-light border-gold font-bold'
                                : 'bg-[#151c27] border-white/10 text-gray-300 hover:text-white'
                            }`}
                          >
                            {cw === 1 ? (isEn ? '1 cell' : '1 клетка') : (isEn ? '2 cells' : '2 клетки')}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] text-gray-400 block mb-1 uppercase font-semibold">
                        {isEn ? 'Portals & Gates' : 'Врата и решетки'}
                      </label>
                      <div className="grid grid-cols-2 gap-1">
                        {[
                          { id: 'none', label: isEn ? 'None' : 'Нет' },
                          { id: 'some', label: isEn ? 'Standard' : 'Обычные' },
                        ].map((df) => (
                          <button
                            key={df.id}
                            type="button"
                            onClick={() => setDoorFrequency(df.id as 'none' | 'some')}
                            className={`py-1 rounded text-[10px] border transition-all cursor-pointer ${
                              doorFrequency === df.id
                                ? 'bg-gold/25 text-gold-light border-gold font-bold'
                                : 'bg-[#151c27] border-white/10 text-gray-300 hover:text-white'
                            }`}
                          >
                            {df.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  {/* Cellular Cave Settings */}
                  <div className="space-y-2">
                    <div>
                      <div className="flex justify-between text-[10px] text-gray-400 mb-0.5">
                        <span className="uppercase font-semibold">
                          {isEn ? 'Initial Fill' : 'Начальное заполнение'}
                        </span>
                        <span className="font-mono text-gold">{Math.round(initialFillRate * 100)}%</span>
                      </div>
                      <input
                        type="range"
                        min="0.42"
                        max="0.52"
                        step="0.01"
                        value={initialFillRate}
                        onChange={(e) => setInitialFillRate(Number(e.target.value))}
                        className="w-full accent-gold h-1.5 bg-gray-700 rounded cursor-pointer"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between text-[10px] text-gray-400 mb-0.5">
                        <span className="uppercase font-semibold">
                          {isEn ? 'Smoothing Cycles' : 'Циклы сглаживания'}
                        </span>
                        <span className="font-mono text-gold">{smoothIterations}</span>
                      </div>
                      <input
                        type="range"
                        min="2"
                        max="6"
                        step="1"
                        value={smoothIterations}
                        onChange={(e) => setSmoothIterations(Number(e.target.value))}
                        className="w-full accent-gold h-1.5 bg-gray-700 rounded cursor-pointer"
                      />
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Scene Name Input */}
            <div className="pt-2 border-t border-white/10">
              <label className="text-[10px] text-gray-400 block mb-1 uppercase font-semibold">
                {isEn ? 'Created Scene Name' : 'Название создаваемой сцены'}
              </label>
              <input
                type="text"
                value={sceneTitle}
                onChange={(e) => setSceneTitle(e.target.value)}
                className="w-full px-3 py-1.5 bg-[#151c27] border border-white/15 focus:border-gold rounded-lg text-xs text-gray-100 placeholder-gray-500 focus:outline-none font-sans"
              />
            </div>
          </div>

          {/* Right Column: Preview & Stats (7 cols) */}
          <div className="lg:col-span-7 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
                <Eye className="h-3.5 w-3.5 text-gold" />
                <span>{isEn ? 'Interactive Preview' : 'Интерактивный предпросмотр'}</span>
              </span>

              {generationResult && (
                <div className="flex items-center gap-2 text-[10px] font-mono text-gray-400 flex-wrap justify-end">
                  <span className="bg-surface/70 px-1.5 py-0.5 rounded border border-white/10">
                    {gridWidth}x{gridHeight} {isEn ? 'cells' : 'кл.'}
                  </span>
                  {style === 'bsp' && (
                    <span className="bg-surface/70 px-1.5 py-0.5 rounded border border-white/10">
                      {isEn ? `Rooms: ${generationResult.roomCount}` : `Комнат: ${generationResult.roomCount}`}
                    </span>
                  )}
                  <span className="bg-surface/70 px-1.5 py-0.5 rounded border border-white/10">
                    {isEn ? `Doors: ${generationResult.doorCount}` : `Дверей: ${generationResult.doorCount}`}
                  </span>
                  <span className="bg-surface/70 px-1.5 py-0.5 rounded border border-white/10 text-gold-light font-bold">
                    {isEn ? `Walls: ${generationResult.walls.length}` : `Стен: ${generationResult.walls.length}`}
                  </span>
                </div>
              )}
            </div>

            {/* Preview Box */}
            <div
              ref={previewContainerRef}
              className="flex-1 min-h-[320px] lg:min-h-[400px] bg-[#090d13] border border-white/10 rounded-xl relative overflow-hidden flex items-center justify-center p-2 shadow-inner"
            >
              {isGenerating ? (
                <div className="flex flex-col items-center gap-2 text-gold">
                  <RefreshCw className="h-6 w-6 animate-spin" />
                  <span className="text-xs font-mono">
                    {isEn ? 'Generating geometry and barriers...' : 'Генерация геометрии и барьеров...'}
                  </span>
                </div>
              ) : generationResult ? (
                <div className="w-full h-full flex items-center justify-center">
                  <img
                    src={generationResult.backgroundDataUrl}
                    alt={isEn ? 'Dungeon preview' : 'Предпросмотр подземелья'}
                    className="max-w-full max-h-[390px] object-contain rounded border border-white/10 shadow-2xl"
                  />
                </div>
              ) : (
                <span className="text-xs text-gray-500">
                  {isEn ? 'Click "Randomize" to create a map' : 'Нажмите "Случайный сид" для создания карты'}
                </span>
              )}
            </div>

            <div className="text-[11px] text-gray-400 flex items-center gap-2 bg-[#141b24]/60 p-2 rounded-lg border border-white/5">
              <Sparkles className="h-4 w-4 text-gold flex-shrink-0" />
              <span>
                {isEn
                  ? 'Walls and doors are automatically vectorized and exported into the tactical engine. Dynamic vision blocking and interactive doors work out of the box.'
                  : 'Стены и двери автоматически векторизуются и экспортируются в тактическую систему. Динамический свет, блокировка зрения и двери работают сразу.'}
              </span>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="h-14 px-4 sm:px-6 bg-[#161d27] border-t border-white/10 flex items-center justify-between flex-shrink-0">
          <button
            type="button"
            onClick={closeProceduralModal}
            className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-gray-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
          >
            {isEn ? 'Cancel' : 'Отмена'}
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleApplyToCurrentMap}
              disabled={!generationResult || isGenerating}
              className="px-3.5 py-1.5 rounded-lg bg-surface hover:bg-surface/80 border border-white/15 text-gray-200 text-xs font-semibold flex items-center gap-1.5 transition-all disabled:opacity-50 cursor-pointer"
              title={
                isEn
                  ? 'Replace background and barriers on current active map'
                  : 'Заменить фон и барьеры на текущей активной карте'
              }
            >
              <Check className="h-3.5 w-3.5 text-emerald-400" />
              <span>{isEn ? 'Apply to Current Map' : 'Применить к текущей карте'}</span>
            </button>

            <button
              type="button"
              onClick={handleCreateNewScene}
              disabled={!generationResult || isGenerating}
              className="px-4 py-1.5 rounded-lg bg-gold/25 hover:bg-gold/35 border border-gold/70 text-gold-light text-xs font-bold flex items-center gap-1.5 transition-all shadow-md active:scale-95 disabled:opacity-50 cursor-pointer"
              title={
                isEn
                  ? 'Create a new separate scene with generated dungeon'
                  : 'Создать новую отдельную сцену со сгенерированным подземельем'
              }
            >
              <Plus className="h-3.5 w-3.5 text-gold" />
              <span>{isEn ? 'Create New Scene' : 'Создать новую сцену'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
