import { useState, useEffect } from 'react';
import clsx from 'clsx';
import { useCombatStore } from '../../store/combatStore';
import { useMapStore } from '../../store/mapStore';
import { broadcastService } from '../../services/broadcastService';
import { PublicRollNotification, NpcShowcaseData, HandoutData } from '../../types/broadcast';
import { TacticalBattleMap } from '../map/TacticalBattleMap';
import { Maximize2, Minimize2, Eye } from 'lucide-react';
import { cleanRussianText } from '../../utils/textUtils';
import { resolveTokenUrl } from '../../services/tokenResolver';
import { Dice2dRollCard } from '../dice/Dice2dRollCard';

function sanitizePlayerVisibleName(name?: string | null): string {
  if (!name) return 'Существо';
  const withoutMeta = String(name).replace(/\s*\((?:босс|boss|миньон|minion|лидер|leader|элита|elite|свита)\)/gi, '');
  return cleanRussianText(withoutMeta);
}

export function PlayerDisplayView() {
  const {
    combatants,
    currentTurnIndex,
    roundCounter,
    activeCombatantId,
  } = useCombatStore();

  const { isWhiteBackground } = useMapStore();

  const [activeRoll, setActiveRoll] = useState<PublicRollNotification | null>(null);
  const [activeShowcase, setActiveShowcase] = useState<NpcShowcaseData | null>(null);
  const [activeHandout, setActiveHandout] = useState<HandoutData | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Active combatant
  const activeCombatant = combatants.find((c) => c.id === activeCombatantId) || combatants[currentTurnIndex];

  // Subscribe to BroadcastChannel messages & request initial state
  useEffect(() => {
    // Request initial sync from Master and announce active presence
    broadcastService.send({ type: 'REQUEST_SYNC' });
    broadcastService.send({ type: 'PLAYER_DISPLAY_PONG' });

    // Periodic heartbeat every 3 seconds to keep live status in DM command center
    const heartbeatInterval = setInterval(() => {
      broadcastService.send({ type: 'PLAYER_DISPLAY_PONG' });
    }, 3000);

    const handleBeforeUnload = () => {
      broadcastService.send({ type: 'PLAYER_DISPLAY_CLOSED' });
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    const unsubscribe = broadcastService.subscribe((msg) => {
      if (msg.type === 'PLAYER_DISPLAY_PING') {
        broadcastService.send({ type: 'PLAYER_DISPLAY_PONG' });
      } else if (msg.type === 'SYNC_COMBAT_STATE') {
        useCombatStore.setState({
          combatants: msg.payload.combatants,
          currentTurnIndex: msg.payload.currentTurnIndex,
          roundCounter: msg.payload.roundCounter,
          activeCombatantId: msg.payload.activeCombatantId,
          activeEffects: (msg.payload.activeEffects as any) || {},
        });
      } else if (msg.type === 'SYNC_VIEWPORT') {
        useMapStore.setState({
          panX: msg.payload.panX,
          panY: msg.payload.panY,
          scale: msg.payload.scale,
        });
      } else if (msg.type === 'SYNC_MAP_STATE') {
        useMapStore.setState({
          imageUrl: msg.payload.mapImageUrl,
          imageWidth: msg.payload.imageWidth ?? 1600,
          imageHeight: msg.payload.imageHeight ?? 1200,
          gridCellSize: msg.payload.gridCellSize,
          isGridVisible: msg.payload.isGridVisible,
          gridType: msg.payload.gridType ?? 'square',
          isVideoMap: msg.payload.isVideoMap ?? false,
          aoeTemplates: msg.payload.aoeTemplates || [],
          ruler: msg.payload.ruler || null,
          drawingLines: msg.payload.drawingLines || [],
          isWhiteBackground: msg.payload.isWhiteBackground ?? false,
          weatherEffect: msg.payload.weatherEffect ?? 'none',
          pins: msg.payload.pins || [],
          walls: msg.payload.walls || [],
          isFogEnabled: msg.payload.isFogEnabled ?? false,
          fogShapes: msg.payload.fogShapes || [],
          mapTokens: (msg.payload.mapTokens || []).filter((t) => t.isVisibleToPlayers),
          lights: msg.payload.lights || [],
          isLightingEnabled: msg.payload.isLightingEnabled ?? false,
          ambientLightMode: msg.payload.ambientLightMode ?? 'daylight',
          ambientDarkness: msg.payload.ambientDarkness ?? 0.0,
        });
      } else if (msg.type === 'BROADCAST_ROLL') {
        setActiveRoll(msg.payload);
      } else if (msg.type === 'BROADCAST_NPC_SHOWCASE') {
        setActiveShowcase(msg.payload);
      } else if (msg.type === 'DISMISS_NPC_SHOWCASE') {
        setActiveShowcase(null);
      } else if (msg.type === 'BROADCAST_HANDOUT') {
        setActiveHandout(msg.payload);
      } else if (msg.type === 'DISMISS_HANDOUT') {
        setActiveHandout(null);
      }
    });

    return () => {
      clearInterval(heartbeatInterval);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      broadcastService.send({ type: 'PLAYER_DISPLAY_CLOSED' });
      unsubscribe();
    };
  }, []);

  // Auto-dismiss roll notification after 6 seconds
  useEffect(() => {
    if (!activeRoll) return;
    const timer = setTimeout(() => {
      setActiveRoll(null);
    }, 6000);
    return () => clearTimeout(timer);
  }, [activeRoll]);

  // Fullscreen toggle (F11)
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F11') {
        e.preventDefault();
        toggleFullscreen();
      } else if (e.key === 'Escape') {
        if (activeHandout) setActiveHandout(null);
        if (activeShowcase) setActiveShowcase(null);
        if (activeRoll) setActiveRoll(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeShowcase, activeRoll, activeHandout]);

  return (
    <div className="flex flex-col h-screen w-screen bg-canvas text-gray-100 select-none overflow-hidden font-sans">
      {/* ================= 1. TOP TURN RIBBON ================= */}
      <header className="relative p-2.5 sm:p-3 bg-gradient-to-b from-[#141b21] via-[#1a232b] to-[#12181d] border-b border-[#c5a059]/40 shadow-xl flex-shrink-0 space-y-2">
        {/* Subtle top gold highlight */}
        <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-gold to-transparent opacity-80" />

        <div className="flex items-center justify-between gap-2 sm:gap-4">
          {/* Round Badge: DDB Medallion */}
          <div className="flex items-center gap-2 sm:gap-3 bg-gradient-to-b from-[#261f14] to-[#16120b] border border-gold/70 rounded px-3 sm:px-4 py-1 sm:py-1.5 shadow-gold-glow flex-shrink-0">
            <div className="flex flex-col items-center">
              <span className="text-[9px] sm:text-[10px] font-bold text-gray-300 uppercase tracking-wider font-serif flex items-center gap-1 whitespace-nowrap">
                <span className="text-gold text-[8px]">✦</span>
                РАУНД
                <span className="text-gold text-[8px]">✦</span>
              </span>
              <span className="text-xl sm:text-2xl font-black font-serif text-gold leading-none drop-shadow">
                {roundCounter}
              </span>
            </div>
          </div>

          {/* Active Creature Hero Banner */}
          <div className="flex-1 min-w-0 px-2 flex flex-col items-center justify-center text-center">
            <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider sm:tracking-widest text-gold-light/90 font-serif flex items-center gap-1.5 flex-shrink-0 whitespace-nowrap">
              <span className="text-gold text-[8px]">✦</span>
              СЕЙЧАС ХОДИТ
              <span className="text-gold text-[8px]">✦</span>
            </span>
            <h1
              className="text-base sm:text-xl md:text-2xl font-black font-serif tracking-wide text-white truncate max-w-full drop-shadow-md leading-tight mt-0.5"
              title={activeCombatant ? sanitizePlayerVisibleName(activeCombatant.nameRu || activeCombatant.name) : 'Бой не начат'}
            >
              {activeCombatant
                ? sanitizePlayerVisibleName(activeCombatant.nameRu || activeCombatant.name)
                : 'Бой не начат'}
            </h1>
          </div>

          {/* Symmetrical spacer for balance */}
          <div className="w-[72px] sm:w-[96px] flex-shrink-0" />
        </div>

        {/* Turn Queue Chips Ribbon (Horizontal scroll) */}
        <div className="flex items-center gap-2.5 overflow-x-auto py-2.5 px-3 min-h-[64px] no-scrollbar border-t border-[#303e4b]/60">
          {combatants.map((c, idx) => {
            const isActive = idx === currentTurnIndex;
            const hpPercent = Math.max(0, Math.min(1, c.hp / (c.maxHp || 1)));
            const tokenUrl = resolveTokenUrl(c.name, c.nameRu, c.tokenUrl || c.avatarUrl);
            const displayName = sanitizePlayerVisibleName(c.nameRu || c.name);

            // Sanitized HP status for players: exact for players, qualitative for monsters
            let statusBadge = null;
            if (c.isPlayer) {
              statusBadge = (
                <span className="text-[10px] font-mono font-bold text-emerald-300 bg-emerald-950/70 border border-emerald-700/60 px-2 py-0.5 rounded-full inline-flex items-center whitespace-nowrap leading-none">
                  {c.hp}/{c.maxHp} ОЗ
                </span>
              );
            } else {
              if (c.isDead) {
                statusBadge = (
                  <span className="text-[10px] font-bold text-red-400 bg-gray-900 border border-red-900 px-2 py-0.5 rounded-full inline-flex items-center whitespace-nowrap leading-none">
                    Мёртв
                  </span>
                );
              } else if (c.hp <= 0) {
                statusBadge = (
                  <span className="text-[10px] font-bold text-purple-300 bg-purple-950/70 border border-purple-800/60 px-2 py-0.5 rounded-full inline-flex items-center whitespace-nowrap leading-none">
                    Без сознания
                  </span>
                );
              } else if (hpPercent <= 0.25) {
                statusBadge = (
                  <span className="text-[10px] font-bold text-rose-300 bg-rose-950/70 border border-rose-800/60 px-2 py-0.5 rounded-full inline-flex items-center whitespace-nowrap leading-none animate-pulse">
                    При смерти
                  </span>
                );
              } else if (hpPercent <= 0.5) {
                statusBadge = (
                  <span className="text-[10px] font-bold text-amber-300 bg-amber-950/70 border border-amber-800/60 px-2 py-0.5 rounded-full inline-flex items-center whitespace-nowrap leading-none">
                    Ранен
                  </span>
                );
              } else {
                statusBadge = (
                  <span className="text-[10px] font-bold text-emerald-300 bg-emerald-950/70 border border-emerald-800/60 px-2 py-0.5 rounded-full inline-flex items-center whitespace-nowrap leading-none">
                    Здоров
                  </span>
                );
              }
            }

            return (
              <div
                key={c.id}
                className={clsx(
                  "flex items-center gap-2.5 px-3 py-2 rounded border transition-all flex-shrink-0 shadow-sm my-0.5",
                  isActive
                    ? 'bg-gradient-to-r from-[#5a140d] via-[#7a2016] to-[#5a140d] border-red-500 ring-2 ring-red-500/50 shadow-md shadow-red-950/50 z-10 text-white'
                    : 'bg-[#172027]/90 border-[#2d3a46] hover:border-gold/50 opacity-80 hover:opacity-100 text-gray-200'
                )}
              >
                {/* Circular Token Portrait with Faction Border */}
                <div className={clsx(
                  "w-8 h-8 rounded-full overflow-hidden border-2 flex-shrink-0 bg-canvas flex items-center justify-center shadow-sm",
                  c.isPlayer
                    ? "border-gold shadow-[0_0_8px_rgba(197,160,89,0.3)] ring-1 ring-gold/40"
                    : "border-[#8c251a] shadow-[0_0_8px_rgba(140,37,26,0.3)] ring-1 ring-red-700/40"
                )}>
                  {tokenUrl ? (
                    <img src={tokenUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div
                      className="w-full h-full flex items-center justify-center font-mono text-[10px] font-bold text-white"
                      style={{ backgroundColor: c.color || '#C5A059' }}
                    >
                      {(c.nameRu || c.name).slice(0, 2).toUpperCase()}
                    </div>
                  )}
                </div>

                <div className="flex flex-col min-w-0 justify-center leading-tight">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span
                      className={clsx(
                        "text-xs font-bold truncate max-w-[130px] sm:max-w-[160px] leading-tight",
                        isActive ? "text-white drop-shadow-sm font-serif" : "text-gray-200",
                        c.isPlayer && !isActive && "text-emerald-300"
                      )}
                      title={displayName}
                    >
                      {displayName}
                    </span>
                    {c.isPlayer && (
                      <span className="text-[8px] font-black px-1.5 py-0.5 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-700/60 flex-shrink-0 leading-none whitespace-nowrap">
                        ИГРОК
                      </span>
                    )}
                    {isActive && (
                      <span className="text-[8px] font-black px-1.5 py-0.5 rounded bg-red-950 text-red-200 border border-red-600 flex-shrink-0 leading-none whitespace-nowrap">
                        ХОД
                      </span>
                    )}
                  </div>
                  <div className="mt-1 flex items-center min-w-0">
                    {statusBadge}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </header>

      {/* ================= 2. MAIN TACTICAL MAP ================= */}
      <main className={clsx("flex-1 relative overflow-hidden", isWhiteBackground ? "bg-[#f8fafc]" : "bg-canvas")}>
        <TacticalBattleMap isMasterView={false} />

        {/* ================= 3. FLOATING 2D ANIMATED DICE ROLL ================= */}
        {activeRoll && (
          <div className="absolute inset-0 z-40 pointer-events-none flex items-center justify-center p-4">
            <div className="pointer-events-auto">
              <Dice2dRollCard
                data={
                  activeRoll.dice2d || {
                    dice: activeRoll.dice3d && activeRoll.dice3d.length > 0
                      ? activeRoll.dice3d.map((d, idx) => ({
                          id: `${d.sides}-${d.result}-${idx}`,
                          sides: d.sides,
                          value: d.result,
                        }))
                      : undefined,
                    sides: activeRoll.dice3d?.[0]?.sides || 20,
                    r1: activeRoll.total,
                    kept: activeRoll.total,
                    modifier: 0,
                    total: activeRoll.total,
                    mode: 'normal',
                    isNat20: !!activeRoll.isCritical,
                    isNat1: !!activeRoll.isCriticalMiss,
                    title: cleanRussianText(activeRoll.title),
                    damageType: activeRoll.damageType,
                  }
                }
                onClose={() => setActiveRoll(null)}
                isPlayerView={true}
              />
            </div>
          </div>
        )}

        {/* ================= 4. FLOATING MONSTER ART SHOWCASE ================= */}
        {activeShowcase && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 sm:p-6 animate-in zoom-in-95 fade-in duration-300">
            <div className="relative max-w-lg w-full max-h-[90vh] overflow-y-auto bg-gradient-to-b from-[#182128] via-[#141b21] to-[#10151a] border-2 border-gold/80 rounded shadow-[0_12px_40px_rgba(0,0,0,0.9)] p-5 sm:p-6 text-center space-y-4 ring-1 ring-gold/30">
              <button
                onClick={() => setActiveShowcase(null)}
                className="absolute top-3 right-3 text-gray-300 hover:text-white p-1 rounded hover:bg-[#202b35]"
              >
                ✕
              </button>

              {/* Portrait */}
              <div className="mx-auto w-36 h-36 sm:w-44 sm:h-44 rounded-full border-4 border-gold/80 overflow-hidden shadow-gold-glow bg-[#10151a] flex items-center justify-center ring-2 ring-gold/40 flex-shrink-0">
                {activeShowcase.avatarUrl ? (
                  <img
                    src={activeShowcase.avatarUrl}
                    alt={activeShowcase.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex items-center justify-center w-full h-full bg-[#10151a] text-gold">
                    <Eye className="h-14 w-14 sm:h-16 sm:w-16 opacity-60" />
                  </div>
                )}
              </div>

              {/* Name & Subtitle */}
              <div className="px-2">
                <h2 className="text-xl sm:text-2xl font-bold font-serif text-gold-light tracking-wide break-words drop-shadow leading-tight">
                  {cleanRussianText(activeShowcase.nameRu || activeShowcase.name)}
                </h2>
                {activeShowcase.creatureType && (
                  <p className="text-xs text-gray-300 uppercase tracking-widest mt-1 font-serif break-words">
                    ✦ {cleanRussianText(activeShowcase.creatureType)} ✦
                  </p>
                )}
              </div>

              {/* Public Lore / Description Notes */}
              {activeShowcase.notes && (
                <div className="max-h-40 overflow-y-auto bg-[#10151a]/80 p-3 rounded border border-[#2d3a46]">
                  <p className="text-xs text-gray-200 italic max-w-md mx-auto leading-relaxed break-words">
                    «{cleanRussianText(activeShowcase.notes)}»
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ================= 4.1. FANTASY PARCHMENT HANDOUT OVERLAY ================= */}
        {activeHandout && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 sm:p-8 animate-in zoom-in-95 fade-in duration-300">
            <div
              className={clsx(
                "relative max-w-2xl w-full max-h-[90vh] overflow-y-auto rounded-sm p-6 sm:p-8 text-center space-y-4 shadow-[0_20px_60px_rgba(0,0,0,0.95)] border-4",
                activeHandout.type === 'decree'
                  ? 'bg-[#f4ebd9] text-[#1f170f] border-[#8a2b1f]'
                  : activeHandout.type === 'bounty'
                  ? 'bg-[#efe5cd] text-[#2c1d11] border-[#5a3a22]'
                  : activeHandout.type === 'clue'
                  ? 'bg-[#211815] text-[#d6c4b2] border-[#7a2016]'
                  : 'bg-[#fbf4e6] text-[#2a1d13] border-[#8c6b38]'
              )}
              style={{
                boxShadow: '0 20px 60px rgba(0,0,0,0.9), inset 0 0 50px rgba(0,0,0,0.06)',
              }}
            >
              <button
                onClick={() => setActiveHandout(null)}
                className="absolute top-3 right-3 text-current/60 hover:text-current p-1.5 rounded hover:bg-black/10 transition-colors text-base font-bold"
                title="Закрыть раздатку"
              >
                ✕
              </button>

              {/* Decorative Top Heraldry */}
              <div className="flex items-center justify-center gap-2 text-center opacity-70">
                <span>✦</span>
                <span className="text-xs sm:text-sm font-serif font-black tracking-widest uppercase">
                  {activeHandout.type === 'decree'
                    ? 'КОРОЛЕВСКИЙ УКАЗ'
                    : activeHandout.type === 'bounty'
                    ? 'РОЗЫСК И НАГРАДА'
                    : activeHandout.type === 'clue'
                    ? 'ТАЙНАЯ УЛИКА'
                    : activeHandout.type === 'riddle'
                    ? 'ДРЕВНЯЯ ЗАГАДКА'
                    : 'СТАРИННОЕ ПОСЛАНИЕ'}
                </span>
                <span>✦</span>
              </div>

              {/* Title */}
              <h2 className="text-2xl sm:text-3xl font-serif font-black tracking-wide drop-shadow-sm border-b pb-3 border-current/25">
                {cleanRussianText(activeHandout.title)}
              </h2>

              {/* Optional Attached Image */}
              {activeHandout.imageUrl && (
                <div className="my-4 rounded overflow-hidden border-2 border-current/30 shadow-md max-h-64 sm:max-h-80 flex items-center justify-center bg-black/15">
                  <img
                    src={activeHandout.imageUrl}
                    alt={activeHandout.title}
                    className="w-full h-full object-contain"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                </div>
              )}

              {/* Text Body */}
              <div className="font-serif text-sm sm:text-base leading-relaxed whitespace-pre-line text-left px-2 sm:px-4">
                {cleanRussianText(activeHandout.content)}
              </div>

              {/* Decorative Bottom Flourish */}
              <div className="pt-4 border-t border-current/20 flex items-center justify-between text-xs opacity-60 font-serif italic">
                <span>✦ Древние тайны Забытых Королевств</span>
                <span>Нажмите Esc или ✕, чтобы свернуть</span>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ================= 5. FOOTER CONTROL BAR ================= */}
      <footer className="h-8 bg-surface border-t border-border-subtle px-4 flex items-center justify-between text-xs text-gray-300 flex-shrink-0">
        <span className="text-[11px] text-gray-300">
          DnD Assistant In Tension — Экран игроков v2.0
        </span>

        <button
          onClick={toggleFullscreen}
          className="flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-card border border-border-subtle hover:text-white text-xs text-gray-200 transition-colors"
        >
          {isFullscreen ? <Minimize2 className="h-3 w-3" /> : <Maximize2 className="h-3 w-3" />}
          <span>{isFullscreen ? 'Выйти (F11)' : 'Полный экран (F11)'}</span>
        </button>
      </footer>
    </div>
  );
}
