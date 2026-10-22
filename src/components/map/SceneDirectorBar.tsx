import React, { useState, useRef, useEffect } from 'react';
import { useSceneStore, VttScene } from '../../store/sceneStore';
import { useSettingsStore } from '../../store/settingsStore';
import {
  Film,
  Map,
  Plus,
  Save,
  Check,
  MoreVertical,
  Edit2,
  Copy,
  Trash2,
  X,
  Video,
  Wand2,
} from 'lucide-react';
import { useMapStore } from '../../store/mapStore';

export function SceneDirectorBar() {
  const language = useSettingsStore((s) => s.language);
  const isEn = language === 'en';
  const {
    scenes,
    activeSceneId,
    createScene,
    updateScene,
    deleteScene,
    duplicateScene,
    switchScene,
    syncCurrentMapToActiveScene,
  } = useSceneStore();

  const [isSavedFeedback, setIsSavedFeedback] = useState(false);
  const [activeMenuSceneId, setActiveMenuSceneId] = useState<string | null>(null);
  const [menuPosition, setMenuPosition] = useState<{ x: number; y: number } | null>(null);

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newSceneName, setNewSceneName] = useState('');
  const [newSceneImageUrl, setNewSceneImageUrl] = useState('');
  const [newSceneIsVideo, setNewSceneIsVideo] = useState(false);

  const [renameSceneTarget, setRenameSceneTarget] = useState<VttScene | null>(null);
  const [renameText, setRenameText] = useState('');

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Close menus on outside click
  useEffect(() => {
    const handleOutsideClick = () => {
      setActiveMenuSceneId(null);
      setMenuPosition(null);
    };
    window.addEventListener('click', handleOutsideClick);
    return () => window.removeEventListener('click', handleOutsideClick);
  }, []);

  const handleSync = () => {
    syncCurrentMapToActiveScene();
    setIsSavedFeedback(true);
    setTimeout(() => {
      setIsSavedFeedback(false);
    }, 2000);
  };

  const handleOpenCreateModal = () => {
    setNewSceneName(isEn ? `Scene ${scenes.length + 1}` : `Сцена ${scenes.length + 1}`);
    setNewSceneImageUrl('');
    setNewSceneIsVideo(false);
    setIsCreateModalOpen(true);
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const id = createScene(
      newSceneName.trim() || undefined,
      newSceneImageUrl.trim() || undefined,
      newSceneIsVideo
    );
    setIsCreateModalOpen(false);
    switchScene(id);
  };

  const handleOpenRename = (scene: VttScene) => {
    setRenameSceneTarget(scene);
    setRenameText(scene.name);
    setActiveMenuSceneId(null);
  };

  const handleRenameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (renameSceneTarget && renameText.trim()) {
      updateScene(renameSceneTarget.id, { name: renameText.trim() });
    }
    setRenameSceneTarget(null);
  };

  const handleMenuClick = (e: React.MouseEvent, sceneId: string) => {
    e.stopPropagation();
    if (activeMenuSceneId === sceneId) {
      setActiveMenuSceneId(null);
      setMenuPosition(null);
    } else {
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      setMenuPosition({ x: rect.left, y: rect.bottom + 4 });
      setActiveMenuSceneId(sceneId);
    }
  };

  return (
    <>
      <div className="h-9 bg-[#111720]/95 border-b border-[rgba(255,255,255,0.08)] px-2.5 flex items-center justify-between gap-2 overflow-hidden flex-shrink-0 z-30 select-none">
        {/* Left: Brand badge */}
        <div className="flex items-center gap-1.5 flex-shrink-0 pr-1 border-r border-white/10">
          <Film className="h-3.5 w-3.5 text-gold" />
          <span className="text-[11px] font-bold uppercase tracking-wider text-gold-light font-serif hidden sm:inline">
            {isEn ? 'Scene Director' : 'Режиссёр сцен'}
          </span>
          <span className="text-[10px] font-mono text-gray-400 px-1 py-0.2 rounded bg-surface/70 border border-white/5">
            {scenes.length}
          </span>
        </div>

        {/* Center: Scrollable scene tabs */}
        <div
          ref={scrollContainerRef}
          className="flex-1 flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1"
        >
          {scenes.map((scene) => {
            const isActive = scene.id === activeSceneId;
            return (
              <div
                key={scene.id}
                onClick={() => switchScene(scene.id)}
                className={`group h-7 px-2 rounded-md flex items-center gap-1.5 cursor-pointer transition-all flex-shrink-0 text-xs font-medium border ${
                  isActive
                    ? 'bg-gold/20 text-gold-light border-gold/70 shadow-[0_0_10px_rgba(245,185,32,0.25)] ring-1 ring-gold/30'
                    : 'bg-[#18202b]/80 text-gray-300 border-[rgba(255,255,255,0.08)] hover:bg-[#1e2837] hover:border-gold/40 hover:text-white'
                }`}
                title={isEn ? `Scene: ${scene.name} (click to switch)` : `Сцена: ${scene.name} (клик для переключения)`}
              >
                {/* Thumbnail / Icon */}
                <div className="w-4 h-4 rounded overflow-hidden bg-black/40 flex items-center justify-center flex-shrink-0 border border-white/10">
                  {scene.imageUrl ? (
                    <img
                      src={scene.imageUrl}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : scene.isVideoMap ? (
                    <Video className="h-2.5 w-2.5 text-blue-400" />
                  ) : (
                    <Map className="h-2.5 w-2.5 text-gray-400" />
                  )}
                </div>

                {/* Scene Name */}
                <span className="truncate max-w-[120px] sm:max-w-[160px] text-[11px]">
                  {scene.name}
                </span>

                {/* Three-dots menu trigger */}
                <button
                  type="button"
                  onClick={(e) => handleMenuClick(e, scene.id)}
                  className={`p-0.5 rounded hover:bg-black/40 transition-colors ${
                    isActive ? 'text-gold-light/80 hover:text-gold-light' : 'text-gray-400 hover:text-white opacity-0 group-hover:opacity-100'
                  }`}
                  title={isEn ? 'Scene options' : 'Опции сцены'}
                >
                  <MoreVertical className="h-3 w-3" />
                </button>
              </div>
            );
          })}
        </div>

        {/* Right: Actions (Add scene & Quick sync) */}
        <div className="flex items-center gap-1 flex-shrink-0 pl-1 border-l border-white/10">
          {/* Procedural Dungeon Generator */}
          <button
            type="button"
            onClick={() => useMapStore.getState().openProceduralModal()}
            className="h-7 px-2 rounded-md text-[11px] font-semibold flex items-center gap-1 bg-gold/15 hover:bg-gold/25 text-gold-light border border-gold/40 transition-all shadow-sm"
            title={isEn ? 'Procedural map & dungeon generator' : 'Процедурный генератор карт и подземелий'}
          >
            <Wand2 className="h-3 w-3 text-gold" />
            <span className="hidden md:inline">{isEn ? 'Generator' : 'Генератор'}</span>
          </button>

          {/* Add Scene */}
          <button
            type="button"
            onClick={handleOpenCreateModal}
            className="h-7 px-2 rounded-md text-[11px] font-semibold flex items-center gap-1 bg-gold/15 hover:bg-gold/25 text-gold-light border border-gold/40 transition-all shadow-sm"
            title={isEn ? 'Create new scene' : 'Создать новую сцену'}
          >
            <Plus className="h-3 w-3 text-gold" />
            <span className="hidden sm:inline">{isEn ? 'Scene' : 'Сцена'}</span>
          </button>

          {/* Sync / Save map to active scene */}
          <button
            type="button"
            onClick={handleSync}
            className={`h-7 px-2 rounded-md text-[11px] font-semibold flex items-center gap-1 transition-all border ${
              isSavedFeedback
                ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/70 shadow-sm'
                : 'bg-surface/80 hover:bg-surface text-gray-300 hover:text-white border-[rgba(255,255,255,0.08)]'
            }`}
            title={isEn ? 'Sync current map state to active scene' : 'Синхронизировать текущее состояние карты в активную сцену'}
          >
            {isSavedFeedback ? (
              <>
                <Check className="h-3 w-3 text-emerald-400" />
                <span className="hidden sm:inline">{isEn ? 'Saved' : 'Сохранено'}</span>
              </>
            ) : (
              <>
                <Save className="h-3 w-3 text-gray-400" />
                <span className="hidden sm:inline">{isEn ? 'Sync' : 'Синхр'}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Dropdown Menu for Scene Options */}
      {activeMenuSceneId && menuPosition && (
        <div
          className="fixed z-50 w-44 bg-[#141b24] border border-gold/40 rounded-lg shadow-2xl p-1 text-xs space-y-0.5 animate-in fade-in zoom-in-95"
          style={{ left: menuPosition.x, top: menuPosition.y }}
          onClick={(e) => e.stopPropagation()}
        >
          {(() => {
            const targetScene = scenes.find((s) => s.id === activeMenuSceneId);
            if (!targetScene) return null;
            return (
              <>
                <button
                  type="button"
                  onClick={() => handleOpenRename(targetScene)}
                  className="w-full text-left px-2 py-1.5 rounded hover:bg-white/10 text-gray-200 flex items-center gap-2 transition-colors"
                >
                  <Edit2 className="h-3.5 w-3.5 text-blue-400" />
                  <span>{isEn ? 'Rename' : 'Переименовать'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    duplicateScene(targetScene.id);
                    setActiveMenuSceneId(null);
                  }}
                  className="w-full text-left px-2 py-1.5 rounded hover:bg-white/10 text-gray-200 flex items-center gap-2 transition-colors"
                >
                  <Copy className="h-3.5 w-3.5 text-amber-400" />
                  <span>{isEn ? 'Duplicate' : 'Дублировать'}</span>
                </button>
                <div className="h-px bg-white/10 my-1" />
                <button
                  type="button"
                  onClick={() => {
                    deleteScene(targetScene.id);
                    setActiveMenuSceneId(null);
                  }}
                  className="w-full text-left px-2 py-1.5 rounded hover:bg-red-950/60 text-red-300 flex items-center gap-2 transition-colors"
                >
                  <Trash2 className="h-3.5 w-3.5 text-red-400" />
                  <span>{isEn ? 'Delete Scene' : 'Удалить сцену'}</span>
                </button>
              </>
            );
          })()}
        </div>
      )}

      {/* Modal: Create Scene */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="w-full max-w-md bg-[#141a22] border border-gold/60 rounded-xl shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <Film className="h-4 w-4 text-gold" />
                <h3 className="text-sm font-bold font-serif text-gold-light uppercase tracking-wide">
                  {isEn ? 'New Scene' : 'Новая сцена'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="text-gray-400 hover:text-white p-1 rounded"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-gray-300 font-medium mb-1">
                  {isEn ? 'Scene Name' : 'Название сцены'}
                </label>
                <input
                  type="text"
                  value={newSceneName}
                  onChange={(e) => setNewSceneName(e.target.value)}
                  placeholder={isEn ? 'e.g. Tavern "Drunken Dragon", Dungeon' : "Например: Таверна 'Пьяный Дракон', Подземелье"}
                  required
                  autoFocus
                  className="w-full bg-[#0d1218] border border-white/15 focus:border-gold rounded-lg px-3 py-2 text-gray-100 placeholder-gray-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-gray-300 font-medium mb-1">
                  {isEn ? 'Image / Video URL (optional)' : 'URL изображения / видео (необязательно)'}
                </label>
                <input
                  type="text"
                  value={newSceneImageUrl}
                  onChange={(e) => setNewSceneImageUrl(e.target.value)}
                  placeholder={isEn ? 'https://... or data:image/...' : 'https://... или data:image/...'}
                  className="w-full bg-[#0d1218] border border-white/15 focus:border-gold rounded-lg px-3 py-2 text-gray-100 placeholder-gray-500 focus:outline-none font-mono text-[11px]"
                />
                <p className="text-[10px] text-gray-400 mt-1">
                  {isEn
                    ? 'If left empty, the current map or an empty canvas will be used.'
                    : 'Если оставить пустым, будет использована текущая карта или пустой холст.'}
                </p>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="newSceneIsVideo"
                  checked={newSceneIsVideo}
                  onChange={(e) => setNewSceneIsVideo(e.target.checked)}
                  className="rounded border-white/20 bg-[#0d1218] text-gold focus:ring-gold"
                />
                <label htmlFor="newSceneIsVideo" className="text-gray-300 cursor-pointer">
                  {isEn ? 'Live animated video map (MP4 / WebM)' : 'Живая анимированная видео-карта (MP4 / WebM)'}
                </label>
              </div>

              <div className="p-2.5 bg-[#161f2c]/70 border border-gold/30 rounded-lg flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Wand2 className="h-4 w-4 text-gold flex-shrink-0" />
                  <div>
                    <p className="text-xs font-bold text-gold-light">{isEn ? 'Procedural Generator' : 'Процедурный генератор'}</p>
                    <p className="text-[10px] text-gray-400">
                      {isEn ? 'BSP crypts or caves with auto-walls' : 'BSP-склепы или пещеры с авто-расстановкой стен'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsCreateModalOpen(false);
                    useMapStore.getState().openProceduralModal();
                  }}
                  className="px-2.5 py-1 rounded bg-gold/20 hover:bg-gold/30 text-gold-light border border-gold/50 text-[11px] font-semibold transition-all flex-shrink-0"
                >
                  {isEn ? 'Open' : 'Открыть'}
                </button>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
                >
                  {isEn ? 'Cancel' : 'Отмена'}
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-gold/20 hover:bg-gold/30 text-gold-light border border-gold/70 font-semibold transition-all shadow-sm"
                >
                  {isEn ? 'Create Scene' : 'Создать сцену'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Rename Scene */}
      {renameSceneTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="w-full max-w-sm bg-[#141a22] border border-gold/60 rounded-xl shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <Edit2 className="h-4 w-4 text-gold" />
                <h3 className="text-sm font-bold font-serif text-gold-light uppercase tracking-wide">
                  {isEn ? 'Rename Scene' : 'Переименовать сцену'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setRenameSceneTarget(null)}
                className="text-gray-400 hover:text-white p-1 rounded"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleRenameSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-gray-300 font-medium mb-1">
                  {isEn ? 'New Name' : 'Новое название'}
                </label>
                <input
                  type="text"
                  value={renameText}
                  onChange={(e) => setRenameText(e.target.value)}
                  required
                  autoFocus
                  className="w-full bg-[#0d1218] border border-white/15 focus:border-gold rounded-lg px-3 py-2 text-gray-100 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setRenameSceneTarget(null)}
                  className="px-3 py-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
                >
                  {isEn ? 'Cancel' : 'Отмена'}
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-gold/20 hover:bg-gold/30 text-gold-light border border-gold/70 font-semibold transition-all shadow-sm"
                >
                  {isEn ? 'Save' : 'Сохранить'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
