import React, { useRef, useEffect, useState } from 'react';
import { useTranslation } from '../../i18n';
import { useWBStore } from '../../store/wbStore';
import { WBGraphNode, WBEntityType } from '../../types/wbmd';
import { ZoomIn, ZoomOut, RotateCcw, ArrowLeft } from 'lucide-react';

const TYPE_COLORS: Record<WBEntityType, string> = {
  npc: '#a855f7', // Purple
  location: '#10b981', // Emerald
  faction: '#f59e0b', // Amber
  quest: '#3b82f6', // Blue
  item: '#2dd4bf', // Teal
  session: '#ec4899', // Pink
  lore: '#94a3b8', // Slate
  custom: '#e2e8f0', // White/Light
};

export const WBGraphView: React.FC = () => {
  const { t } = useTranslation();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const graphIndex = useWBStore((s) => s.graphIndex);
  const selectNote = useWBStore((s) => s.selectNote);
  const setViewMode = useWBStore((s) => s.setViewMode);
  const activeNoteId = useWBStore((s) => s.activeNoteId);

  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [hoveredNode, setHoveredNode] = useState<WBGraphNode | null>(null);

  const nodesRef = useRef<WBGraphNode[]>([]);
  const edgesRef = useRef<{ source: string; target: string }[]>([]);
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const draggedNodeRef = useRef<WBGraphNode | null>(null);

  // Initialize simulation positions
  useEffect(() => {
    if (!graphIndex) return;

    const count = graphIndex.graphNodes.length;
    const radius = Math.min(260, 60 + count * 15);

    nodesRef.current = graphIndex.graphNodes.map((n, i) => {
      const angle = (i / Math.max(1, count)) * 2 * Math.PI;
      return {
        ...n,
        x: n.x ?? Math.cos(angle) * radius + (Math.random() - 0.5) * 50,
        y: n.y ?? Math.sin(angle) * radius + (Math.random() - 0.5) * 50,
        vx: 0,
        vy: 0,
      };
    });

    edgesRef.current = graphIndex.graphEdges;
  }, [graphIndex]);

  // Main animation / rendering loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;

    const render = () => {
      // Resize canvas to display
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }

      ctx.clearRect(0, 0, width, height);

      // Background grid dots
      ctx.save();
      ctx.fillStyle = '#18181b';
      ctx.fillRect(0, 0, width, height);

      ctx.translate(width / 2 + pan.x, height / 2 + pan.y);
      ctx.scale(zoom, zoom);

      // Force layout step
      const nodes = nodesRef.current;
      const edges = edgesRef.current;
      const nodeMap = new Map<string, WBGraphNode>();
      for (const n of nodes) nodeMap.set(n.id, n);

      // 1. Repulsion between all nodes
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const n1 = nodes[i];
          const n2 = nodes[j];
          const dx = (n1.x || 0) - (n2.x || 0);
          const dy = (n1.y || 0) - (n2.y || 0);
          const distSq = dx * dx + dy * dy + 0.1;
          const dist = Math.sqrt(distSq);
          if (dist < 350) {
            const force = 1800 / distSq;
            const fx = (dx / dist) * force;
            const fy = (dy / dist) * force;
            n1.vx = (n1.vx || 0) + fx;
            n1.vy = (n1.vy || 0) + fy;
            n2.vx = (n2.vx || 0) - fx;
            n2.vy = (n2.vy || 0) - fy;
          }
        }
      }

      // 2. Attraction along edges
      for (const e of edges) {
        const s = nodeMap.get(e.source);
        const t = nodeMap.get(e.target);
        if (s && t) {
          const dx = (t.x || 0) - (s.x || 0);
          const dy = (t.y || 0) - (s.y || 0);
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const force = (dist - 110) * 0.04;
          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;
          s.vx = (s.vx || 0) + fx;
          s.vy = (s.vy || 0) + fy;
          t.vx = (t.vx || 0) - fx;
          t.vy = (t.vy || 0) - fy;
        }
      }

      // 3. Center gravity & friction
      for (const n of nodes) {
        if (n !== draggedNodeRef.current) {
          n.vx = ((n.vx || 0) - (n.x || 0) * 0.008) * 0.88;
          n.vy = ((n.vy || 0) - (n.y || 0) * 0.008) * 0.88;
          n.x = (n.x || 0) + n.vx;
          n.y = (n.y || 0) + n.vy;
        }
      }

      // Draw Edges
      ctx.lineWidth = 1.2;
      ctx.strokeStyle = 'rgba(113, 113, 122, 0.35)';
      for (const e of edges) {
        const s = nodeMap.get(e.source);
        const t = nodeMap.get(e.target);
        if (s && t) {
          ctx.beginPath();
          ctx.moveTo(s.x || 0, s.y || 0);
          ctx.lineTo(t.x || 0, t.y || 0);
          ctx.stroke();
        }
      }

      // Draw Nodes
      for (const n of nodes) {
        const isHovered = hoveredNode?.id === n.id;
        const isActive = activeNoteId === n.id;
        const nodeColor = TYPE_COLORS[n.type] || '#f59e0b';
        const nodeRadius = Math.max(6, Math.min(18, (n.val || 10) * 0.7));

        ctx.beginPath();
        ctx.arc(n.x || 0, n.y || 0, isHovered || isActive ? nodeRadius + 3 : nodeRadius, 0, 2 * Math.PI);
        ctx.fillStyle = nodeColor;
        ctx.fill();

        if (isActive) {
          ctx.lineWidth = 2.5;
          ctx.strokeStyle = '#ffffff';
          ctx.stroke();
        } else if (isHovered) {
          ctx.lineWidth = 2;
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
          ctx.stroke();
        }

        // Draw Labels
        ctx.font = `${isHovered ? 'bold 11px' : '10px'} system-ui, sans-serif`;
        ctx.fillStyle = isHovered ? '#ffffff' : '#d4d4d8';
        ctx.textAlign = 'center';
        ctx.fillText(n.title, n.x || 0, (n.y || 0) + nodeRadius + 12);
      }

      ctx.restore();
      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [pan, zoom, hoveredNode, activeNoteId]);

  // Mouse event handling
  const handleMouseDown = (e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left - canvas.clientWidth / 2 - pan.x) / zoom;
    const my = (e.clientY - rect.top - canvas.clientHeight / 2 - pan.y) / zoom;

    // Check hit node
    for (const n of nodesRef.current) {
      const dx = mx - (n.x || 0);
      const dy = my - (n.y || 0);
      const r = (n.val || 10) + 4;
      if (dx * dx + dy * dy <= r * r) {
        draggedNodeRef.current = n;
        return;
      }
    }

    isDraggingRef.current = true;
    dragStartRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left - canvas.clientWidth / 2 - pan.x) / zoom;
    const my = (e.clientY - rect.top - canvas.clientHeight / 2 - pan.y) / zoom;

    if (draggedNodeRef.current) {
      draggedNodeRef.current.x = mx;
      draggedNodeRef.current.y = my;
      return;
    }

    if (isDraggingRef.current) {
      setPan({
        x: e.clientX - dragStartRef.current.x,
        y: e.clientY - dragStartRef.current.y,
      });
      return;
    }

    // Hover detect
    let found: WBGraphNode | null = null;
    for (const n of nodesRef.current) {
      const dx = mx - (n.x || 0);
      const dy = my - (n.y || 0);
      const r = (n.val || 10) + 4;
      if (dx * dx + dy * dy <= r * r) {
        found = n;
        break;
      }
    }
    setHoveredNode(found);
  };

  const handleMouseUp = () => {
    if (draggedNodeRef.current) {
      draggedNodeRef.current = null;
    }
    isDraggingRef.current = false;
  };

  const handleClick = (e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left - canvas.clientWidth / 2 - pan.x) / zoom;
    const my = (e.clientY - rect.top - canvas.clientHeight / 2 - pan.y) / zoom;

    for (const n of nodesRef.current) {
      const dx = mx - (n.x || 0);
      const dy = my - (n.y || 0);
      const r = (n.val || 10) + 4;
      if (dx * dx + dy * dy <= r * r) {
        selectNote(n.id);
        setViewMode('workspace');
        return;
      }
    }
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.15 : 0.85;
    setZoom((z) => Math.max(0.3, Math.min(3.5, z * factor)));
  };

  return (
    <div className="relative w-full h-full bg-zinc-950 overflow-hidden flex flex-col">
      {/* Top Controls Toolbar */}
      <div className="absolute top-3 left-3 z-20 flex items-center gap-2 bg-zinc-900/90 backdrop-blur-md p-1.5 rounded-lg border border-zinc-700/80 shadow-xl">
        <button
          type="button"
          onClick={() => setViewMode('workspace')}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-xs font-medium text-zinc-200 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>{t('wb.backToNotes')}</span>
        </button>

        <div className="w-[1px] h-4 bg-zinc-700 mx-1" />

        <button
          type="button"
          onClick={() => setZoom((z) => Math.min(3.5, z * 1.2))}
          className="p-1 rounded hover:bg-zinc-800 text-zinc-300 hover:text-white"
          title={t('wb.zoomIn')}
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => setZoom((z) => Math.max(0.3, z * 0.8))}
          className="p-1 rounded hover:bg-zinc-800 text-zinc-300 hover:text-white"
          title={t('wb.zoomOut')}
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => {
            setZoom(1);
            setPan({ x: 0, y: 0 });
          }}
          className="p-1 rounded hover:bg-zinc-800 text-zinc-300 hover:text-white"
          title={t('wb.resetZoom')}
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      {/* Legend */}
      <div className="absolute bottom-3 left-3 z-20 flex flex-wrap gap-2 bg-zinc-900/90 backdrop-blur-md p-2 rounded-lg border border-zinc-700/80 text-[11px] text-zinc-300 select-none shadow-xl">
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full bg-purple-500" /> {t('wb.legendNpc')}
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> {t('wb.legendLocation')}
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> {t('wb.legendFaction')}
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-500" /> {t('wb.legendQuest')}
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full bg-slate-400" /> {t('wb.legendLore')}
        </span>
      </div>

      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onClick={handleClick}
        onWheel={handleWheel}
        className="w-full h-full cursor-grab active:cursor-grabbing block"
      />
    </div>
  );
};
