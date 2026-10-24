import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  X,
  Upload,
  Download,
  RotateCcw,
  RotateCw,
  FlipHorizontal,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Bookmark,
  Check,
  Grid,
  Sparkles,
  Trash2,
  Palette,
  Shield,
  Layers,
  Search,
  Dices,
  Flame,
  Zap,
  Skull,
  FileDown,
  Crop,
  Crown,
} from 'lucide-react';
import {
  TOKEN_FRAMES,
  FACTION_COLORS,
  TokenFaction,
  getFrameDefinition,
  renderTokenComposite,
} from '../../engine/tokenFrames';
import {
  ArmorType,
  WeaponType,
  HeadFeatureType,
  EffectType,
  SILHOUETTE_OPTIONS,
  ARMOR_OPTIONS,
  WEAPON_OPTIONS,
  HEAD_FEATURE_OPTIONS,
  EFFECT_OPTIONS,
  HERALDRY_SIGN_OPTIONS,
  FACTION_COLOR_PALETTE,
  renderProceduralToken,
  renderHeraldryToken,
} from '../../engine/proceduralTokens';
import {
  useTokenForgeStore,
  SavedForgeToken,
  TokenForgeTab,
} from '../../store/tokenForgeStore';
import { useCombatStore } from '../../store/combatStore';
import { useMapStore } from '../../store/mapStore';
import { usePartyStore } from '../../store/partyStore';
import { useSettingsStore } from '../../store/settingsStore';
import { PartyMember } from '../../types/party';
import { downloadTtrpghFile } from '../../services/ttrpghFormat';

export interface TokenForgeModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  activeTab?: TokenForgeTab;
  initialImage?: string | null;
  targetCombatantId?: string | null;
  targetTokenId?: string | null;
  onApply?: (dataUrl: string, name?: string) => void;
}

export function TokenForgeModal({
  isOpen: propIsOpen,
  onClose: propOnClose,
  activeTab: propActiveTab,
  initialImage,
  targetCombatantId: propTargetCombatantId,
  targetTokenId: propTargetTokenId,
  onApply,
}: TokenForgeModalProps) {
  const storeIsOpen = useTokenForgeStore((s) => s.isOpen);
  const storeActiveTab = useTokenForgeStore((s) => s.activeTab);
  const storeCloseForge = useTokenForgeStore((s) => s.closeForge);

  const isOpen = propIsOpen !== undefined ? propIsOpen : storeIsOpen;
  const activeTab: TokenForgeTab = propActiveTab !== undefined ? propActiveTab : storeActiveTab;
  const effectiveTab: 'crop' | 'procedural' | 'heraldry' | 'library' =
    activeTab === 'forge' ? 'crop' : activeTab;
  const closeForge = propOnClose || storeCloseForge;

  const language = useSettingsStore((s) => s.language);
  const isEn = language === 'en';

  const storeTargetCombatantId = useTokenForgeStore((s) => s.targetCombatantId);
  const storeTargetTokenId = useTokenForgeStore((s) => s.targetTokenId);
  const imageSrc = useTokenForgeStore((s) => s.imageSrc);
  const name = useTokenForgeStore((s) => s.name);
  const currentFrame = useTokenForgeStore((s) => s.currentFrame);
  const currentFaction = useTokenForgeStore((s) => s.currentFaction);
  const customColor = useTokenForgeStore((s) => s.customColor);
  const glowIntensity = useTokenForgeStore((s) => s.glowIntensity);
  const showGridOverlay = useTokenForgeStore((s) => s.showGridOverlay);
  const backgroundMode = useTokenForgeStore((s) => s.backgroundMode);
  const zoom = useTokenForgeStore((s) => s.zoom);
  const panX = useTokenForgeStore((s) => s.panX);
  const panY = useTokenForgeStore((s) => s.panY);
  const rotation = useTokenForgeStore((s) => s.rotation);
  const flipH = useTokenForgeStore((s) => s.flipH);
  const savedTokens = useTokenForgeStore((s) => s.savedTokens);

  const paperDollConfig = useTokenForgeStore((s) => s.paperDollConfig);
  const heraldryConfig = useTokenForgeStore((s) => s.heraldryConfig);

  const setActiveTab = useTokenForgeStore((s) => s.setActiveTab);
  const setImageSrc = useTokenForgeStore((s) => s.setImageSrc);
  const setName = useTokenForgeStore((s) => s.setName);
  const setFrame = useTokenForgeStore((s) => s.setFrame);
  const setFaction = useTokenForgeStore((s) => s.setFaction);
  const toggleGridOverlay = useTokenForgeStore((s) => s.toggleGridOverlay);
  const setZoom = useTokenForgeStore((s) => s.setZoom);
  const setPan = useTokenForgeStore((s) => s.setPan);
  const rotateBy = useTokenForgeStore((s) => s.rotateBy);
  const toggleFlipH = useTokenForgeStore((s) => s.toggleFlipH);
  const resetTransform = useTokenForgeStore((s) => s.resetTransform);
  const saveTokenToLibrary = useTokenForgeStore((s) => s.saveTokenToLibrary);
  const deleteTokenFromLibrary = useTokenForgeStore((s) => s.deleteTokenFromLibrary);

  const setPaperDollConfig = useTokenForgeStore((s) => s.setPaperDollConfig);
  const setHeraldryConfig = useTokenForgeStore((s) => s.setHeraldryConfig);
  const randomizePaperDoll = useTokenForgeStore((s) => s.randomizePaperDoll);
  const randomizeHeraldry = useTokenForgeStore((s) => s.randomizeHeraldry);

  const effectiveCombatantId = propTargetCombatantId || storeTargetCombatantId;
  const effectiveTokenId = propTargetTokenId || storeTargetTokenId;

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const loadedImageRef = useRef<HTMLImageElement | null>(null);

  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [exportNotice, setExportNotice] = useState<string | null>(null);
  const [librarySearch, setLibrarySearch] = useState('');

  // Synchronize initialImage prop when provided
  useEffect(() => {
    if (initialImage) {
      setImageSrc(initialImage);
    }
  }, [initialImage, setImageSrc]);

  // Load Image Element whenever imageSrc changes in crop mode
  useEffect(() => {
    if (effectiveTab !== 'crop') return;
    if (!imageSrc) {
      loadedImageRef.current = null;
      renderCurrentCanvas();
      return;
    }
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      loadedImageRef.current = img;
      renderCurrentCanvas();
    };
    img.onerror = () => {
      console.warn('[TokenForge] Failed to load image source:', imageSrc);
      loadedImageRef.current = null;
      renderCurrentCanvas();
    };
    img.src = imageSrc;
  }, [imageSrc, effectiveTab]);

  // Main Canvas Compositing Dispatcher
  const renderCurrentCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (effectiveTab === 'crop') {
      renderTokenComposite(canvas, {
        size: 512,
        image: loadedImageRef.current,
        frameId: currentFrame,
        faction: currentFaction,
        customColor,
        glowIntensity,
        backgroundMode,
        zoom,
        panX,
        panY,
        rotation,
        flipH,
        showGridOverlay,
      });
    } else if (effectiveTab === 'procedural') {
      renderProceduralToken(canvas, {
        ...paperDollConfig,
        frameId: currentFrame,
        glowIntensity,
      });
    } else if (effectiveTab === 'heraldry') {
      renderHeraldryToken(canvas, {
        ...heraldryConfig,
        frameId: currentFrame,
        glowIntensity,
      });
    }
  }, [
    effectiveTab,
    currentFrame,
    currentFaction,
    customColor,
    glowIntensity,
    backgroundMode,
    zoom,
    panX,
    panY,
    rotation,
    flipH,
    showGridOverlay,
    paperDollConfig,
    heraldryConfig,
  ]);

  useEffect(() => {
    renderCurrentCanvas();
  }, [renderCurrentCanvas]);

  // Global Clipboard Paste Listener (Ctrl+V) for Crop mode
  useEffect(() => {
    if (!isOpen || effectiveTab !== 'crop') return;

    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.indexOf('image') !== -1) {
          const file = item.getAsFile();
          if (file) {
            const reader = new FileReader();
            reader.onload = (ev) => {
              const res = ev.target?.result as string;
              if (res) {
                setImageSrc(res);
                resetTransform();
              }
            };
            reader.readAsDataURL(file);
            e.preventDefault();
            break;
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [isOpen, effectiveTab, setImageSrc, resetTransform]);

  if (!isOpen) return null;

  // File Upload Handler
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const res = ev.target?.result as string;
      if (res) {
        setImageSrc(res);
        resetTransform();
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Drag & Drop image files
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (effectiveTab === 'crop') setIsDraggingOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);
    if (effectiveTab !== 'crop') return;

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (ev) => {
          const res = ev.target?.result as string;
          if (res) {
            setImageSrc(res);
            resetTransform();
          }
        };
        reader.readAsDataURL(file);
      }
    }
  };

  // Mouse Pan & Drag on Canvas
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (effectiveTab !== 'crop' || !imageSrc) return;
    setIsPanning(true);
    setDragStart({ x: e.clientX - panX, y: e.clientY - panY });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isPanning || effectiveTab !== 'crop') return;
    const newPanX = Math.round(e.clientX - dragStart.x);
    const newPanY = Math.round(e.clientY - dragStart.y);
    setPan(newPanX, newPanY);
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  // Wheel Zoom
  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    if (effectiveTab !== 'crop' || !imageSrc) return;
    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.1 : -0.1;
    setZoom(zoom + delta);
  };

  // Apply Token
  const handleApplyToken = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dataUrl = canvas.toDataURL('image/png');

    if (onApply) {
      onApply(dataUrl, name);
      closeForge();
      return;
    }

    if (effectiveCombatantId) {
      useCombatStore.getState().updateCombatant(effectiveCombatantId, {
        tokenUrl: dataUrl,
        avatarUrl: dataUrl,
      });
      usePartyStore.getState().showToast(
        isEn ? 'Token successfully applied to combatant!' : 'Токен успешно применен к бойцу!'
      );
    }

    if (effectiveTokenId) {
      useMapStore.getState().updateMapToken(effectiveTokenId, {
        avatarUrl: dataUrl,
        tokenUrl: dataUrl,
      });
    }

    closeForge();
  };

  // Save to Local Library
  const handleSaveToLibrary = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dataUrl = canvas.toDataURL('image/png');
    saveTokenToLibrary({
      name: name || (isEn ? 'New Token' : 'Новый токен'),
      dataUrl,
      frameId: currentFrame,
      faction: currentFaction,
    });

    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  // Export PNG (512x512)
  const handleDownloadPng = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const link = document.createElement('a');
    link.download = `${(name || 'token').replace(/[^a-zA-Zа-яА-Я0-9_-]/g, '_')}.png`;
    link.href = canvas.toDataURL('image/png');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export .ttrpgh Character File with embedded token
  const handleExportTtrpgh = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dataUrl = canvas.toDataURL('image/png');

    let targetMember: PartyMember | undefined;
    if (effectiveCombatantId) {
      targetMember = usePartyStore.getState().members.find(
        (m) => m.id === effectiveCombatantId || m.name.toLowerCase() === name.toLowerCase()
      );
    }

    if (!targetMember) {
      targetMember = {
        id: crypto.randomUUID(),
        name: name || (isEn ? 'New Hero' : 'Новый герой'),
        characterClass: isEn ? 'Adventurer 1' : 'Искатель приключений 1',
        level: 1,
        species: isEn ? 'Human' : 'Человек',
        ac: 14,
        maxHp: 25,
        currentHp: 25,
        initBonus: 1,
        speed: isEn ? '30 ft.' : '30 фт.',
        color: currentFaction !== 'none' ? FACTION_COLORS[currentFaction]?.hex : '#10B981',
        avatarUrl: dataUrl,
      };
    }

    downloadTtrpghFile(targetMember, dataUrl, currentFrame);
    setExportNotice(
      isEn
        ? `.ttrpgh file for "${targetMember.name}" downloaded!`
        : `Файл .ttrpgh для "${targetMember.name}" скачан!`
    );
    setTimeout(() => setExportNotice(null), 3500);
  };

  const filteredSavedTokens = savedTokens.filter((t) =>
    t.name.toLowerCase().includes(librarySearch.toLowerCase())
  );

  const renderFrameIcon = (icon: string) => {
    switch (icon) {
      case 'sparkles':
        return <Sparkles className="h-5 w-5 text-amber-400" />;
      case 'stone':
        return <Layers className="h-5 w-5 text-stone-400" />;
      case 'flame':
        return <Flame className="h-5 w-5 text-orange-400" />;
      case 'rose':
        return <Sparkles className="h-5 w-5 text-rose-400" />;
      case 'skull':
        return <Skull className="h-5 w-5 text-purple-400" />;
      case 'zap':
        return <Zap className="h-5 w-5 text-cyan-400" />;
      case 'shield':
        return <Shield className="h-5 w-5 text-slate-300" />;
      case 'circle':
        return <Palette className="h-5 w-5 text-gray-400" />;
      default:
        return <Sparkles className="h-5 w-5 text-amber-400" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-2 sm:p-4 select-none font-sans animate-in fade-in duration-150">
      <div className="w-full max-w-5xl bg-[rgba(14,18,25,0.96)] border border-slate-700/80 rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden text-gray-100">
        {/* Top Header & Navigation Tabs */}
        <header className="px-4 py-3 bg-[#0d121c] border-b border-slate-800 flex items-center justify-between gap-3 shrink-0 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="p-1.5 rounded-lg bg-gradient-to-br from-amber-500/20 to-yellow-600/30 border border-[#f5b920]/40 text-[#f5b920] shadow-sm">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-gray-100 flex items-center gap-2">
                <span>{isEn ? 'Token Forge' : 'Кузница токенов'}</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-gold/20 text-gold-light border border-gold/40 font-mono font-medium">
                  512×512 HD
                </span>
              </h2>
              <p className="text-[11px] text-gray-400 hidden sm:block">
                {isEn
                  ? 'Art cropping, Paper-Doll procedural builder, mob heraldry, and .ttrpgh format'
                  : 'Кадрирование арта, процедурный конструктор Paper-Doll, геральдика мобов и формат .ttrpgh'}
              </p>
            </div>
          </div>

          {/* 4 Mode Tabs */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <div className="flex items-center bg-[#070a10] p-0.5 rounded-full border border-slate-800">
              <button
                type="button"
                onClick={() => setActiveTab('crop')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                  effectiveTab === 'crop'
                    ? 'bg-gold/20 text-gold-light border border-gold/50 shadow-sm'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
                title={
                  isEn
                    ? 'Crop custom artwork (Ctrl+V, zoom, rotate)'
                    : 'Кадрирование пользовательского арта (Ctrl+V, зум, вращение)'
                }
              >
                <Crop className="h-3.5 w-3.5" />
                <span>{isEn ? 'Art Cropping' : 'Кадрирование арта'}</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('procedural')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                  effectiveTab === 'procedural'
                    ? 'bg-gold/20 text-gold-light border border-gold/50 shadow-sm'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
                title={
                  isEn
                    ? 'Procedural Paper-Doll builder: silhouette, armor, weapon, features, and effects'
                    : 'Процедурный конструктор Paper-Doll: силуэт, доспех, оружие, черты и эффекты'
                }
              >
                <Layers className="h-3.5 w-3.5" />
                <span>{isEn ? 'Procedural Builder' : 'Процедурный конструктор'}</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('heraldry')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                  effectiveTab === 'heraldry'
                    ? 'bg-gold/20 text-gold-light border border-gold/50 shadow-sm'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
                title={
                  isEn
                    ? 'Mob heraldry & packs: emblems, factions, and numbering (1..10 / I..X)'
                    : 'Геральдика и пачки мобов: эмблемы, фракции и нумерация (1..10 / I..X)'
                }
              >
                <Crown className="h-3.5 w-3.5" />
                <span>{isEn ? 'Mob Heraldry' : 'Геральдика мобов'}</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('library')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                  effectiveTab === 'library'
                    ? 'bg-gold/20 text-gold-light border border-gold/50 shadow-sm'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
                title={isEn ? 'Saved token library' : 'Библиотека сохраненных токенов'}
              >
                <Bookmark className="h-3.5 w-3.5" />
                <span>{isEn ? 'Library' : 'Библиотека'}</span>
                {savedTokens.length > 0 && (
                  <span className="ml-1 px-1.5 py-0.2 rounded-full bg-amber-500/30 text-amber-300 font-mono text-[10px]">
                    {savedTokens.length}
                  </span>
                )}
              </button>
            </div>

            <button
              type="button"
              onClick={closeForge}
              className="p-1.5 rounded-full text-gray-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              title={isEn ? 'Close Token Forge (Esc)' : 'Закрыть кузницу (Esc)'}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </header>

        {/* Export notice alert */}
        {exportNotice && (
          <div className="bg-emerald-950/80 border-b border-emerald-600/60 px-4 py-2 flex items-center gap-2 text-xs text-emerald-200 animate-in fade-in">
            <Check className="h-4 w-4 text-emerald-400 shrink-0" />
            <span>{exportNotice}</span>
          </div>
        )}

        {/* Main Body */}
        {effectiveTab !== 'library' ? (
          <div className="flex-1 min-h-0 overflow-y-auto p-3 sm:p-5 grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* LEFT COLUMN: Canvas + Viewport Controls */}
            <div className="lg:col-span-5 flex flex-col items-center gap-3.5">
              <div
                className={`relative w-full max-w-[380px] aspect-square rounded-2xl border-2 flex items-center justify-center overflow-hidden transition-all shadow-2xl ${
                  isDraggingOver
                    ? 'border-[#f5b920] bg-amber-950/30 scale-[1.01]'
                    : 'border-slate-700/80 bg-[#090d14]'
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                {/* Checkerboard Pattern for Transparency */}
                <div
                  className="absolute inset-0 opacity-15 pointer-events-none"
                  style={{
                    backgroundImage: `linear-gradient(45deg, #222 25%, transparent 25%), linear-gradient(-45deg, #222 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #222 75%), linear-gradient(-45deg, transparent 75%, #222 75%)`,
                    backgroundSize: '16px 16px',
                    backgroundPosition: '0 0, 0 8px, 8px -8px, -8px 0px',
                  }}
                />

                {/* Main 512x512 Canvas */}
                <canvas
                  ref={canvasRef}
                  width={512}
                  height={512}
                  className={`w-full h-full object-contain z-10 ${
                    effectiveTab === 'crop'
                      ? 'cursor-grab active:cursor-grabbing'
                      : 'cursor-default'
                  }`}
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseUp}
                  onWheel={handleWheel}
                  title={
                    effectiveTab === 'crop'
                      ? (isEn
                          ? 'LMB: Pan image • Mouse wheel: Zoom'
                          : 'ЛКМ: Панорамирование изображения • Колесико мыши: Масштаб (Zoom)')
                      : (isEn ? 'Live 512x512 HD Token Render' : 'Живой рендер токена 512x512 HD')
                  }
                />

                {/* Empty State Overlay for Crop Mode */}
                {effectiveTab === 'crop' && !imageSrc && (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute inset-0 z-20 flex flex-col items-center justify-center p-6 text-center bg-black/70 backdrop-blur-sm cursor-pointer hover:bg-black/60 transition-colors"
                  >
                    <div className="w-12 h-12 rounded-full bg-[#18202c] border border-amber-500/50 flex items-center justify-center text-amber-400 mb-3 animate-pulse">
                      <Upload className="h-6 w-6" />
                    </div>
                    <p className="text-xs font-semibold text-gray-200">
                      {isEn
                        ? 'Click to select art or paste via Ctrl+V'
                        : 'Нажмите для выбора арта или вставьте через Ctrl+V'}
                    </p>
                    <p className="text-[11px] text-gray-400 mt-1">
                      {isEn
                        ? 'Supports PNG, JPG, WEBP, GIF'
                        : 'Поддерживаются PNG, JPG, WEBP, GIF'}
                    </p>
                  </div>
                )}
              </div>

              {/* Toolbar beneath canvas */}
              {effectiveTab === 'crop' && (
                <div className="flex items-center gap-1.5 p-1.5 rounded-xl bg-[#0d121c] border border-slate-800 text-xs text-gray-300">
                  <button
                    type="button"
                    onClick={() => setZoom(zoom - 0.1)}
                    className="p-1.5 rounded hover:bg-white/10"
                    title={isEn ? 'Zoom out' : 'Уменьшить масштаб'}
                  >
                    <ZoomOut className="h-4 w-4" />
                  </button>
                  <span className="font-mono text-[11px] px-1 text-amber-300">
                    {Math.round(zoom * 100)}%
                  </span>
                  <button
                    type="button"
                    onClick={() => setZoom(zoom + 0.1)}
                    className="p-1.5 rounded hover:bg-white/10"
                    title={isEn ? 'Zoom in' : 'Увеличить масштаб'}
                  >
                    <ZoomIn className="h-4 w-4" />
                  </button>
                  <div className="h-4 w-px bg-slate-700 mx-1" />
                  <button
                    type="button"
                    onClick={() => rotateBy(-90)}
                    className="p-1.5 rounded hover:bg-white/10"
                    title={isEn ? 'Rotate counter-clockwise' : 'Повернуть влево'}
                  >
                    <RotateCcw className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => rotateBy(90)}
                    className="p-1.5 rounded hover:bg-white/10"
                    title={isEn ? 'Rotate clockwise' : 'Повернуть вправо'}
                  >
                    <RotateCw className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={toggleFlipH}
                    className="p-1.5 rounded hover:bg-white/10"
                    title={isEn ? 'Flip horizontally' : 'Отразить по горизонтали'}
                  >
                    <FlipHorizontal className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={resetTransform}
                    className="p-1.5 rounded hover:bg-white/10 text-gray-400 hover:text-white"
                    title={isEn ? 'Reset transformation' : 'Сбросить трансформацию'}
                  >
                    <Maximize2 className="h-4 w-4" />
                  </button>
                  <div className="h-4 w-px bg-slate-700 mx-1" />
                  <button
                    type="button"
                    onClick={toggleGridOverlay}
                    className={`p-1.5 rounded ${
                      showGridOverlay ? 'bg-amber-500/20 text-amber-300' : 'hover:bg-white/10'
                    }`}
                    title={isEn ? 'Calibration grid' : 'Сетка калибровки'}
                  >
                    <Grid className="h-4 w-4" />
                  </button>
                </div>
              )}

              {/* Quick Dice Roll for Procedural & Heraldry */}
              {(effectiveTab === 'procedural' || effectiveTab === 'heraldry') && (
                <button
                  type="button"
                  onClick={effectiveTab === 'procedural' ? randomizePaperDoll : randomizeHeraldry}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/50 text-amber-300 font-bold text-xs shadow-sm transition-all cursor-pointer"
                  title={
                    isEn
                      ? 'Random layer combination (1 click)'
                      : 'Случайная комбинация слоев (1 клик)'
                  }
                >
                  <Dices className="h-4 w-4 text-amber-400" />
                  <span>{isEn ? 'Random Token (Roll Dice)' : 'Случайный жетон (Бросок костей)'}</span>
                </button>
              )}
            </div>

            {/* RIGHT COLUMN: Settings & Customization Controls */}
            <div className="lg:col-span-7 flex flex-col gap-4">
              {/* Name & Title */}
              <div className="bg-[#10141e] p-3 rounded-xl border border-slate-800">
                <label className="text-[11px] font-bold uppercase tracking-wider text-gray-400 block mb-1">
                  {isEn ? 'Character / Creature Name:' : 'Имя персонажа / существа:'}
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={isEn ? 'Enter name...' : 'Введите имя...'}
                  className="w-full bg-[#0a0d14] border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:border-amber-400"
                />
              </div>

              {/* ======================================================= */}
              {/* TAB 1: CROP ART CONTROLS                                */}
              {/* ======================================================= */}
              {effectiveTab === 'crop' && (
                <div className="space-y-4">
                  {/* Upload button */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-3 py-1.5 rounded-lg bg-surface hover:bg-slate-800 border border-slate-700 text-xs text-gray-200 flex items-center gap-2 transition-colors cursor-pointer"
                    >
                      <Upload className="h-3.5 w-3.5 text-amber-400" />
                      <span>{isEn ? 'Upload Image...' : 'Загрузить изображение...'}</span>
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </div>

                  {/* Faction Aura & Glow */}
                  <div className="bg-[#10141e] p-3 rounded-xl border border-slate-800 space-y-2">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-gray-400 block">
                      {isEn ? 'Faction & Aura Glow:' : 'Фракция и свечение ореола:'}
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {(Object.keys(FACTION_COLORS) as TokenFaction[]).map((fId) => {
                        const fac = FACTION_COLORS[fId];
                        const isSelected = currentFaction === fId;
                        return (
                          <button
                            key={fId}
                            type="button"
                            onClick={() => setFaction(fId)}
                            className={`px-2.5 py-1 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-amber-950/40 border-[#f5b920] text-amber-200'
                                : 'bg-[#18202c]/60 border-slate-700/60 text-gray-300 hover:bg-[#1f2937]'
                            }`}
                          >
                            <span
                              className="w-2.5 h-2.5 rounded-full border border-black/40 shrink-0"
                              style={{ backgroundColor: fac.hex }}
                            />
                            <span>{isEn ? (fac.nameEn || fac.name) : fac.name}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* ======================================================= */}
              {/* TAB 2: PROCEDURAL PAPER-DOLL CONTROLS                   */}
              {/* ======================================================= */}
              {effectiveTab === 'procedural' && (
                <div className="space-y-3.5">
                  {/* Silhouette selection */}
                  <div className="bg-[#10141e] p-3 rounded-xl border border-slate-800 space-y-2">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-gray-400 block">
                      {isEn ? 'Silhouette / Body:' : 'Силуэт / Тело:'}
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                      {SILHOUETTE_OPTIONS.map((sil) => {
                        const isSelected = paperDollConfig.silhouette === sil.id;
                        return (
                          <button
                            key={sil.id}
                            type="button"
                            onClick={() => setPaperDollConfig({ silhouette: sil.id })}
                            className={`p-2 rounded-lg border text-[11px] font-medium text-center transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-amber-950/50 border-[#f5b920] text-amber-200 shadow-sm'
                                : 'bg-[#18202c]/60 border-slate-700/60 text-gray-300 hover:bg-[#1f2937]'
                            }`}
                          >
                            {isEn ? (sil.nameEn || sil.name) : sil.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Armor, Weapon, Head Feature in 3 Columns */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {/* Armor */}
                    <div className="bg-[#10141e] p-3 rounded-xl border border-slate-800 space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">
                        {isEn ? 'Armor / Outfit:' : 'Доспех / Одеяние:'}
                      </label>
                      <select
                        value={paperDollConfig.armor}
                        onChange={(e) =>
                          setPaperDollConfig({ armor: e.target.value as ArmorType })
                        }
                        className="w-full bg-[#0a0d14] border border-slate-700 rounded px-2 py-1.5 text-xs text-white outline-none focus:border-amber-400"
                      >
                        {ARMOR_OPTIONS.map((o) => (
                          <option key={o.id} value={o.id}>
                            {isEn ? (o.nameEn || o.name) : o.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Weapon */}
                    <div className="bg-[#10141e] p-3 rounded-xl border border-slate-800 space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">
                        {isEn ? 'Weapon / Item:' : 'Оружие / Предмет:'}
                      </label>
                      <select
                        value={paperDollConfig.weapon}
                        onChange={(e) =>
                          setPaperDollConfig({ weapon: e.target.value as WeaponType })
                        }
                        className="w-full bg-[#0a0d14] border border-slate-700 rounded px-2 py-1.5 text-xs text-white outline-none focus:border-amber-400"
                      >
                        {WEAPON_OPTIONS.map((o) => (
                          <option key={o.id} value={o.id}>
                            {isEn ? (o.nameEn || o.name) : o.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Head Feature */}
                    <div className="bg-[#10141e] p-3 rounded-xl border border-slate-800 space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">
                        {isEn ? 'Head / Features:' : 'Голова / Черты:'}
                      </label>
                      <select
                        value={paperDollConfig.headFeature}
                        onChange={(e) =>
                          setPaperDollConfig({ headFeature: e.target.value as HeadFeatureType })
                        }
                        className="w-full bg-[#0a0d14] border border-slate-700 rounded px-2 py-1.5 text-xs text-white outline-none focus:border-amber-400"
                      >
                        {HEAD_FEATURE_OPTIONS.map((o) => (
                          <option key={o.id} value={o.id}>
                            {isEn ? (o.nameEn || o.name) : o.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Effect & Accent Color */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="bg-[#10141e] p-3 rounded-xl border border-slate-800 space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">
                        {isEn ? 'Magical Effect:' : 'Магический эффект:'}
                      </label>
                      <select
                        value={paperDollConfig.effect}
                        onChange={(e) =>
                          setPaperDollConfig({ effect: e.target.value as EffectType })
                        }
                        className="w-full bg-[#0a0d14] border border-slate-700 rounded px-2 py-1.5 text-xs text-white outline-none focus:border-amber-400"
                      >
                        {EFFECT_OPTIONS.map((o) => (
                          <option key={o.id} value={o.id}>
                            {isEn ? (o.nameEn || o.name) : o.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="bg-[#10141e] p-3 rounded-xl border border-slate-800 space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">
                        {isEn ? 'Accent / Energy Color:' : 'Цвет акцента / энергии:'}
                      </label>
                      <div className="flex items-center gap-1.5">
                        {FACTION_COLOR_PALETTE.map((c) => (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() =>
                              setPaperDollConfig({
                                accentColor: c.hex,
                                effectColor: c.hex,
                              })
                            }
                            className={`w-6 h-6 rounded-full border transition-all ${
                              paperDollConfig.accentColor === c.hex
                                ? 'border-white scale-110 shadow-[0_0_8px_#f5b920]'
                                : 'border-black/50'
                            }`}
                            style={{ backgroundColor: c.hex }}
                            title={isEn ? (c.nameEn || c.name) : c.name}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ======================================================= */}
              {/* TAB 3: HERALDRY & MOB PACKS CONTROLS                    */}
              {/* ======================================================= */}
              {effectiveTab === 'heraldry' && (
                <div className="space-y-3.5">
                  {/* Mob Sign Picker */}
                  <div className="bg-[#10141e] p-3 rounded-xl border border-slate-800 space-y-2">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-gray-400 block">
                      {isEn ? 'Mob Sign / Emblem:' : 'Знак / Эмблема моба:'}
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                      {HERALDRY_SIGN_OPTIONS.map((sgn) => {
                        const isSelected = heraldryConfig.sign === sgn.id;
                        return (
                          <button
                            key={sgn.id}
                            type="button"
                            onClick={() => setHeraldryConfig({ sign: sgn.id })}
                            className={`p-2 rounded-lg border text-[11px] font-medium text-center transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-amber-950/50 border-[#f5b920] text-amber-200 shadow-sm'
                                : 'bg-[#18202c]/60 border-slate-700/60 text-gray-300 hover:bg-[#1f2937]'
                            }`}
                          >
                            {isEn ? (sgn.nameEn || sgn.name) : sgn.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Faction Color */}
                  <div className="bg-[#10141e] p-3 rounded-xl border border-slate-800 space-y-2">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-gray-400 block">
                      {isEn ? 'Squad Faction Color:' : 'Цвет фракции отряда:'}
                    </label>
                    <div className="flex items-center gap-2 flex-wrap">
                      {FACTION_COLOR_PALETTE.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => setHeraldryConfig({ factionColor: c.hex })}
                          className={`px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
                            heraldryConfig.factionColor === c.hex
                              ? 'bg-amber-950/40 border-[#f5b920] text-white shadow-sm'
                              : 'bg-[#18202c]/60 border-slate-700/60 text-gray-300 hover:bg-[#1f2937]'
                          }`}
                        >
                          <span
                            className="w-3 h-3 rounded-full border border-black/40"
                            style={{ backgroundColor: c.hex }}
                          />
                          <span>{isEn ? (c.nameEn || c.name) : c.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Sequence Numbering (1..10 / I..X) */}
                  <div className="bg-[#10141e] p-3 rounded-xl border border-slate-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
                        {isEn ? 'Squad Numbering:' : 'Порядковый номер в отряде:'}
                      </label>
                      <div className="flex items-center bg-[#070a10] rounded border border-slate-700 p-0.5 text-[11px]">
                        <button
                          type="button"
                          onClick={() => setHeraldryConfig({ numberFormat: 'arabic' })}
                          className={`px-2 py-0.5 rounded ${
                            heraldryConfig.numberFormat === 'arabic'
                              ? 'bg-amber-500/20 text-amber-300 font-bold'
                              : 'text-gray-400'
                          }`}
                        >
                          {isEn ? '1..10 (Arabic)' : '1..10 (Арабские)'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setHeraldryConfig({ numberFormat: 'roman' })}
                          className={`px-2 py-0.5 rounded ${
                            heraldryConfig.numberFormat === 'roman'
                              ? 'bg-amber-500/20 text-amber-300 font-bold'
                              : 'text-gray-400'
                          }`}
                        >
                          {isEn ? 'I..X (Roman)' : 'I..X (Римские)'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setHeraldryConfig({ numberFormat: 'none' })}
                          className={`px-2 py-0.5 rounded ${
                            heraldryConfig.numberFormat === 'none'
                              ? 'bg-amber-500/20 text-amber-300 font-bold'
                              : 'text-gray-400'
                          }`}
                        >
                          {isEn ? 'No number' : 'Без номера'}
                        </button>
                      </div>
                    </div>

                    {heraldryConfig.numberFormat !== 'none' && (
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                          <button
                            key={num}
                            type="button"
                            onClick={() => {
                              setHeraldryConfig({ badgeNumber: num });
                              const basePrefix = name.replace(/\s*#\s*\d+.*$/i, '').trim();
                              if (basePrefix) {
                                setName(`${basePrefix} #${num}`);
                              }
                            }}
                            className={`w-8 h-8 rounded-lg font-mono font-bold text-xs flex items-center justify-center border transition-all cursor-pointer ${
                              heraldryConfig.badgeNumber === num
                                ? 'bg-amber-500 text-black border-amber-400 font-black shadow-[0_0_10px_#f5b920]'
                                : 'bg-[#18202c] border-slate-700 text-gray-300 hover:bg-slate-700'
                            }`}
                          >
                            {num}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 8 Vector Frame Selector (Common to all 3 modes) */}
              <div className="bg-[#10141e] p-3 rounded-xl border border-slate-800 space-y-2">
                <label className="text-[11px] font-bold uppercase tracking-wider text-gray-400 block">
                  {isEn ? 'Border Frame (8 Styles):' : 'Окантовка рамки (8 стилей):'}
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {TOKEN_FRAMES.map((f) => {
                    const isSelected = currentFrame === f.id;
                    return (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => setFrame(f.id)}
                        className={`flex flex-col items-center justify-center p-2 rounded-xl border text-center transition-all cursor-pointer relative group ${
                          isSelected
                            ? 'bg-amber-950/40 border-[#f5b920] shadow-[0_0_12px_rgba(245,185,32,0.25)] ring-1 ring-[#f5b920]/50'
                            : 'bg-[#18202c]/60 border-slate-700/60 hover:bg-[#1f2937] hover:border-slate-500'
                        }`}
                        title={isEn ? (f.descriptionEn || f.description) : f.description}
                      >
                        <div className="mb-1 group-hover:scale-110 transition-transform">
                          {renderFrameIcon(f.icon)}
                        </div>
                        <span
                          className={`text-[11px] font-semibold leading-tight ${
                            isSelected ? 'text-amber-200' : 'text-gray-300'
                          }`}
                        >
                          {isEn ? (f.nameEn || f.name) : f.name}
                        </span>
                        {isSelected && (
                          <div className="absolute top-1 right-1 w-2 h-2 rounded-full bg-[#f5b920] shadow-[0_0_6px_#f5b920]" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Bottom Actions Banner */}
              <div className="mt-auto pt-2 flex flex-col gap-2">
                {/* Primary Action Button */}
                {(effectiveCombatantId || effectiveTokenId || onApply) && (
                  <button
                    type="button"
                    onClick={handleApplyToken}
                    className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 hover:from-amber-400 hover:to-yellow-300 text-[#0c0d12] font-black text-sm shadow-[0_0_20px_rgba(245,185,32,0.35)] transition-all cursor-pointer group"
                  >
                    <Sparkles className="h-4 w-4 fill-[#0c0d12] group-hover:rotate-12 transition-transform" />
                    <span>
                      {effectiveCombatantId
                        ? (isEn ? 'Apply to Combatant' : 'Применить к участнику боя')
                        : effectiveTokenId
                        ? (isEn ? 'Apply to Map Token' : 'Применить к токену на карте')
                        : (isEn ? 'Apply Token' : 'Применить токен')}
                    </span>
                  </button>
                )}

                {/* Secondary Actions: Export .ttrpgh, Export PNG, Save to Library */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={handleExportTtrpgh}
                    className="flex items-center justify-center gap-1.5 py-2 rounded-xl bg-gold/15 hover:bg-gold/25 border border-gold/40 text-gold-light font-semibold text-xs transition-all cursor-pointer shadow-sm"
                    title={
                      isEn
                        ? 'Export open character file .ttrpgh with embedded Base64 token'
                        : 'Выгрузить открытый файл персонажа .ttrpgh с внедренным Base64 токеном'
                    }
                  >
                    <FileDown className="h-3.5 w-3.5 text-gold" />
                    <span>{isEn ? 'Export to .ttrpgh' : 'Экспорт в .ttrpgh'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleDownloadPng}
                    className="flex items-center justify-center gap-1.5 py-2 rounded-xl bg-[rgba(255,255,255,0.06)] hover:bg-[rgba(255,255,255,0.12)] border border-[rgba(255,255,255,0.1)] text-gray-200 font-semibold text-xs transition-all cursor-pointer"
                    title={
                      isEn
                        ? 'Download transparent circular PNG token 512x512'
                        : 'Скачать прозрачный круглый PNG токен 512x512'
                    }
                  >
                    <Download className="h-3.5 w-3.5 text-amber-400" />
                    <span>{isEn ? 'Export PNG (512×512)' : 'Экспорт PNG (512×512)'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleSaveToLibrary}
                    className={`flex items-center justify-center gap-1.5 py-2 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                      saveSuccess
                        ? 'bg-emerald-950/80 border-emerald-500 text-emerald-200'
                        : 'bg-[rgba(255,255,255,0.06)] hover:bg-[rgba(255,255,255,0.12)] border-[rgba(255,255,255,0.1)] text-gray-200'
                    }`}
                  >
                    {saveSuccess ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-emerald-400" />
                        <span>{isEn ? 'Saved!' : 'Сохранено!'}</span>
                      </>
                    ) : (
                      <>
                        <Bookmark className="h-3.5 w-3.5 text-amber-400" />
                        <span>{isEn ? 'To Library' : 'В библиотеку'}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Tab 4: Library Drawer */
          <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-5 flex flex-col gap-4">
            <div className="flex items-center justify-between gap-3 border-b border-slate-800 pb-3">
              <div className="relative flex-1 max-w-sm">
                <Search className="h-4 w-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={librarySearch}
                  onChange={(e) => setLibrarySearch(e.target.value)}
                  placeholder={
                    isEn
                      ? 'Search saved tokens...'
                      : 'Поиск по сохраненным токенам...'
                  }
                  className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-[#0d1117] border border-slate-700 text-xs text-gray-200 placeholder-gray-500 outline-none focus:border-amber-400"
                />
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400 font-mono">
                  {isEn
                    ? `Total: ${savedTokens.length} tokens`
                    : `Всего: ${savedTokens.length} токенов`}
                </span>
                <button
                  type="button"
                  onClick={() => setActiveTab('crop')}
                  className="px-3 py-1 rounded-lg bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-500/40 text-xs font-semibold transition-colors cursor-pointer"
                >
                  {isEn ? '+ Create New' : '+ Создать новый'}
                </button>
              </div>
            </div>

            {filteredSavedTokens.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-gray-400">
                <Bookmark className="h-10 w-10 text-slate-600 mb-2" />
                <p className="text-sm font-semibold text-gray-300">
                  {isEn ? 'No tokens in library yet' : 'В библиотеке пока нет токенов'}
                </p>
                <p className="text-xs text-gray-500 max-w-sm mt-1 mb-4">
                  {isEn
                    ? 'Forge a token and click "To Library" to save it for future battles.'
                    : 'Сделайте красивый токен в Кузнице и нажмите «В библиотеку», чтобы сохранить его для будущих сражений.'}
                </p>
                <button
                  type="button"
                  onClick={() => setActiveTab('crop')}
                  className="px-4 py-1.5 rounded-full bg-gold/20 hover:bg-gold/30 text-gold-light border border-gold/40 text-xs font-semibold cursor-pointer"
                >
                  {isEn ? 'Go to Forge' : 'Перейти в Кузницу'}
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5">
                {filteredSavedTokens.map((item: SavedForgeToken) => {
                  const frameDef = getFrameDefinition(item.frameId);
                  const factionInfo = FACTION_COLORS[item.faction];
                  return (
                    <div
                      key={item.id}
                      className="group flex flex-col bg-[#121620] border border-slate-800 hover:border-amber-500/50 rounded-xl p-2.5 transition-all shadow-sm"
                    >
                      <div className="w-full aspect-square rounded-lg bg-[#090d14] border border-slate-700/60 overflow-hidden flex items-center justify-center relative mb-2">
                        <img
                          src={item.dataUrl}
                          alt={item.name}
                          className="w-full h-full object-contain"
                        />
                        {item.faction !== 'none' && (
                          <div
                            className="absolute top-1.5 right-1.5 w-3 h-3 rounded-full border border-black/50 shadow-sm"
                            style={{ backgroundColor: factionInfo?.hex || '#f59e0b' }}
                            title={isEn ? (factionInfo?.nameEn || factionInfo?.name) : factionInfo?.name}
                          />
                        )}
                      </div>

                      <div className="min-w-0 flex-1 mb-2">
                        <h4 className="text-xs font-bold text-gray-200 truncate" title={item.name}>
                          {item.name}
                        </h4>
                        <div className="flex items-center gap-1 text-[10px] text-gray-400">
                          <span>{isEn ? (frameDef.nameEn || frameDef.name) : frameDef.name}</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-1 pt-2 border-t border-slate-800">
                        <button
                          type="button"
                          onClick={() => {
                            setImageSrc(item.dataUrl);
                            setName(item.name);
                            setFrame(item.frameId);
                            setFaction(item.faction);
                            setActiveTab('crop');
                          }}
                          className="flex-1 py-1 rounded bg-[#1e2634] hover:bg-gold/20 hover:text-gold-light text-gray-300 text-[11px] font-semibold transition-colors flex items-center justify-center gap-1 cursor-pointer"
                          title={isEn ? 'Load token into Forge' : 'Загрузить токен в кузницу'}
                        >
                          <span>{isEn ? 'Select' : 'Выбрать'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            const a = document.createElement('a');
                            a.href = item.dataUrl;
                            a.download = `${item.name.replace(/\s+/g, '_')}.png`;
                            document.body.appendChild(a);
                            a.click();
                            document.body.removeChild(a);
                          }}
                          className="p-1 rounded bg-[#1e2634] hover:bg-slate-700 text-gray-300 hover:text-white transition-colors cursor-pointer"
                          title={isEn ? 'Download PNG' : 'Скачать PNG'}
                        >
                          <Download className="h-3 w-3 text-amber-400" />
                        </button>

                        <button
                          type="button"
                          onClick={() => deleteTokenFromLibrary(item.id)}
                          className="p-1 rounded hover:bg-red-950/60 text-gray-400 hover:text-red-300 transition-colors cursor-pointer"
                          title={isEn ? 'Delete from library' : 'Удалить из библиотеки'}
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
