import React, { useState, useRef, useEffect } from 'react';
import {
  Brain,
  Plus,
  Trash2,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Download,
  Upload,
  Sparkles,
  GitFork,
  Share2
} from 'lucide-react';

export interface MindMapNode {
  id: string;
  title: string;
  description?: string;
  category: 'core' | 'world' | 'combat' | 'lore' | 'economy' | 'mechanics' | 'audio';
  x: number;
  y: number;
  color: string;
  status: 'idea' | 'progress' | 'done' | 'blocked';
  tags: string[];
  parentId?: string | null;
}

export interface MindMapConnection {
  id: string;
  from: string;
  to: string;
  label?: string;
  style?: 'solid' | 'dashed';
  color?: string;
}

export interface MindMapData {
  title: string;
  nodes: MindMapNode[];
  connections: MindMapConnection[];
}

const CATEGORY_COLORS: Record<MindMapNode['category'], { bg: string; border: string; text: string; glow: string; label: string }> = {
  core: { bg: 'bg-purple-950/80', border: 'border-purple-500', text: 'text-purple-300', glow: 'rgba(168, 85, 247, 0.4)', label: '🌟 Conceito Central' },
  world: { bg: 'bg-emerald-950/80', border: 'border-emerald-500', text: 'text-emerald-300', glow: 'rgba(16, 185, 129, 0.4)', label: '🗺️ Mundo & Biomas' },
  combat: { bg: 'bg-rose-950/80', border: 'border-rose-500', text: 'text-rose-300', glow: 'rgba(244, 63, 94, 0.4)', label: '⚔️ Combate & Bosses' },
  lore: { bg: 'bg-amber-950/80', border: 'border-amber-500', text: 'text-amber-300', glow: 'rgba(245, 158, 11, 0.4)', label: '📜 Lore & Quests' },
  economy: { bg: 'bg-yellow-950/80', border: 'border-yellow-500', text: 'text-yellow-300', glow: 'rgba(234, 179, 8, 0.4)', label: '🎒 Economia & Itens' },
  mechanics: { bg: 'bg-cyan-950/80', border: 'border-cyan-500', text: 'text-cyan-300', glow: 'rgba(6, 182, 212, 0.4)', label: '⚙️ Mecânicas de Jogo' },
  audio: { bg: 'bg-pink-950/80', border: 'border-pink-500', text: 'text-pink-300', glow: 'rgba(236, 72, 153, 0.4)', label: '🎵 Áudio & VFX' },
};

const DEFAULT_MAP_DATA: MindMapData = {
  title: 'Mapa Mental - Slimeslands Engine',
  nodes: [
    {
      id: 'node-root',
      title: 'Slimeslands: Forja & Fases',
      description: 'Eixo condutor das mecânicas, mundos e jornadas de jogo',
      category: 'core',
      x: 500,
      y: 350,
      color: '#a855f7',
      status: 'progress',
      tags: ['Core', 'GDD'],
      parentId: null,
    },
    {
      id: 'node-biomes',
      title: 'Biomas & Atmosfera',
      description: 'Camadas de paralaxe, nuvens volumétricas e terrenos dinâmicos',
      category: 'world',
      x: 180,
      y: 200,
      color: '#10b981',
      status: 'done',
      tags: ['Biomas', 'VFX'],
      parentId: 'node-root',
    },
    {
      id: 'node-combat',
      title: 'Bosses & Duelo Mobby',
      description: 'IA procedural de monstros, projéteis elementais e fases de fúria',
      category: 'combat',
      x: 820,
      y: 200,
      color: '#f43f5e',
      status: 'progress',
      tags: ['Boss', 'Mobbys'],
      parentId: 'node-root',
    },
    {
      id: 'node-quests',
      title: 'Sistema de Quests & NPCs',
      description: 'Diálogos ramificados, condições de gatilho e estações no mapa',
      category: 'lore',
      x: 180,
      y: 500,
      color: '#f59e0b',
      status: 'progress',
      tags: ['Quests', 'História'],
      parentId: 'node-root',
    },
    {
      id: 'node-cards',
      title: 'Deck & Forja Matriz',
      description: 'Geração procedural de cartas colecionáveis e boosters 3D',
      category: 'economy',
      x: 820,
      y: 500,
      color: '#eab308',
      status: 'done',
      tags: ['Cards', 'Booster'],
      parentId: 'node-root',
    },
    {
      id: 'node-motion',
      title: 'Motion Canvas & Jelly',
      description: 'Pincel cinético de geléia, deformação suave e física de sprites',
      category: 'mechanics',
      x: 500,
      y: 120,
      color: '#06b6d4',
      status: 'done',
      tags: ['Física', 'Sprites'],
      parentId: 'node-root',
    },
  ],
  connections: [
    { id: 'conn-1', from: 'node-root', to: 'node-biomes', style: 'solid', color: '#10b981' },
    { id: 'conn-2', from: 'node-root', to: 'node-combat', style: 'solid', color: '#f43f5e' },
    { id: 'conn-3', from: 'node-root', to: 'node-quests', style: 'solid', color: '#f59e0b' },
    { id: 'conn-4', from: 'node-root', to: 'node-cards', style: 'solid', color: '#eab308' },
    { id: 'conn-5', from: 'node-root', to: 'node-motion', style: 'solid', color: '#06b6d4' },
  ],
};

const STORAGE_KEY = 'marker_dream_mindmap_data';

export const MindMapStudio: React.FC<{ showToast: (msg: string) => void }> = ({ showToast }) => {
  const [data, setData] = useState<MindMapData>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) return JSON.parse(saved);
      } catch (e) {
        console.warn('Erro ao carregar mindmap do localStorage:', e);
      }
    }
    return DEFAULT_MAP_DATA;
  });

  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState<number>(1.0);
  const [isPanning, setIsPanning] = useState<boolean>(false);
  const [startPan, setStartPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [connectingFromId, setConnectingFromId] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-save to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {}
  }, [data]);

  const selectedNode = data.nodes.find((n) => n.id === selectedNodeId);

  // Pan controls with Mouse
  const handleMouseDownCanvas = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.mind-map-node') || (e.target as HTMLElement).closest('.studio-inspector')) {
      return;
    }
    setIsPanning(true);
    setStartPan({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMoveCanvas = (e: React.MouseEvent) => {
    if (isPanning) {
      setPan({ x: e.clientX - startPan.x, y: e.clientY - startPan.y });
    } else if (draggingNodeId) {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const mouseCanvasX = (e.clientX - rect.left - pan.x) / zoom;
      const mouseCanvasY = (e.clientY - rect.top - pan.y) / zoom;
      const newX = Math.round(mouseCanvasX - dragOffset.x);
      const newY = Math.round(mouseCanvasY - dragOffset.y);

      setData((prev) => ({
        ...prev,
        nodes: prev.nodes.map((node) =>
          node.id === draggingNodeId ? { ...node, x: newX, y: newY } : node
        ),
      }));
    }
  };

  const handleMouseUpCanvas = () => {
    setIsPanning(false);
    setDraggingNodeId(null);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.08 : 0.92;
    setZoom((prev) => Math.min(Math.max(0.3, prev * zoomFactor), 2.5));
  };

  // Node Dragging Start
  const handleStartDragNode = (e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation();
    if (connectingFromId) {
      if (connectingFromId !== nodeId) {
        const exists = data.connections.some(
          (c) => (c.from === connectingFromId && c.to === nodeId) || (c.from === nodeId && c.to === connectingFromId)
        );
        if (!exists) {
          const fromNode = data.nodes.find((n) => n.id === connectingFromId);
          const newConn: MindMapConnection = {
            id: `conn-${Date.now()}`,
            from: connectingFromId,
            to: nodeId,
            color: fromNode?.color || '#a855f7',
            style: 'solid',
          };
          setData((prev) => ({ ...prev, connections: [...prev.connections, newConn] }));
          showToast('Conexão criada!');
        }
      }
      setConnectingFromId(null);
      return;
    }

    setSelectedNodeId(nodeId);
    setDraggingNodeId(nodeId);
    const node = data.nodes.find((n) => n.id === nodeId);
    if (!node || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const mouseCanvasX = (e.clientX - rect.left - pan.x) / zoom;
    const mouseCanvasY = (e.clientY - rect.top - pan.y) / zoom;
    setDragOffset({ x: mouseCanvasX - node.x, y: mouseCanvasY - node.y });
  };

  // Create new Node
  const handleAddNode = (category: MindMapNode['category'] = 'core', parentId?: string | null) => {
    const parentNode = parentId ? data.nodes.find((n) => n.id === parentId) : selectedNode;
    const posX = parentNode ? parentNode.x + (Math.random() * 180 - 90) + 160 : 400 + Math.random() * 100;
    const posY = parentNode ? parentNode.y + (Math.random() * 180 - 90) : 300 + Math.random() * 100;

    const id = `node-${Date.now()}`;
    const newNode: MindMapNode = {
      id,
      title: 'Nova Ideia / Conceito',
      description: 'Detalhes da mecânica ou elemento do jogo',
      category,
      x: posX,
      y: posY,
      color: category === 'core' ? '#a855f7' : category === 'world' ? '#10b981' : category === 'combat' ? '#f43f5e' : category === 'lore' ? '#f59e0b' : '#06b6d4',
      status: 'idea',
      tags: ['Ideia'],
      parentId: parentNode ? parentNode.id : null,
    };

    let newConnections = [...data.connections];
    if (parentNode) {
      newConnections.push({
        id: `conn-${Date.now()}`,
        from: parentNode.id,
        to: id,
        color: newNode.color,
        style: 'solid',
      });
    }

    setData((prev) => ({
      ...prev,
      nodes: [...prev.nodes, newNode],
      connections: newConnections,
    }));
    setSelectedNodeId(id);
    showToast('Nó adicionado ao mapa mental!');
  };

  // Delete Node
  const handleDeleteNode = (id: string) => {
    setData((prev) => ({
      ...prev,
      nodes: prev.nodes.filter((n) => n.id !== id),
      connections: prev.connections.filter((c) => c.from !== id && c.to !== id),
    }));
    if (selectedNodeId === id) setSelectedNodeId(null);
    showToast('Nó removido!');
  };

  // Auto-arrange in tree/radial layout
  const handleAutoArrange = () => {
    const root = data.nodes.find((n) => !n.parentId) || data.nodes[0];
    if (!root) return;

    const children = data.nodes.filter((n) => n.id !== root.id);
    const radius = 280;
    const total = children.length;

    const newNodes = data.nodes.map((node) => {
      if (node.id === root.id) {
        return { ...node, x: 500, y: 350 };
      }
      const idx = children.findIndex((c) => c.id === node.id);
      const angle = (idx / (total || 1)) * 2 * Math.PI;
      return {
        ...node,
        x: Math.round(500 + radius * Math.cos(angle)),
        y: Math.round(350 + radius * Math.sin(angle)),
      };
    });

    setData((prev) => ({ ...prev, nodes: newNodes }));
    setPan({ x: 0, y: 0 });
    setZoom(1.0);
    showToast('Nós organizados em layout radial!');
  };

  // Export JSON
  const handleExportJSON = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `slimeslands_mapa_mental_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Mapa Mental exportado em JSON!');
  };

  // Import JSON
  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed.nodes && Array.isArray(parsed.nodes)) {
          setData(parsed);
          showToast('Mapa mental importado com sucesso!');
        }
      } catch (err) {
        showToast('Erro ao importar arquivo JSON!');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Reset to Template
  const handleResetTemplate = () => {
    if (confirm('Deseja resetar para o modelo mestre do Slimeslands?')) {
      setData(DEFAULT_MAP_DATA);
      setPan({ x: 0, y: 0 });
      setZoom(1.0);
      showToast('Modelo restaurado!');
    }
  };

  return (
    <div className="relative w-full h-full flex overflow-hidden bg-[#090b10] text-zinc-100 select-none">
      {/* Hidden File Input */}
      <input ref={fileInputRef} type="file" accept=".json" onChange={handleImportJSON} className="hidden" />

      {/* Main Canvas Area */}
      <div
        ref={containerRef}
        onMouseDown={handleMouseDownCanvas}
        onMouseMove={handleMouseMoveCanvas}
        onMouseUp={handleMouseUpCanvas}
        onWheel={handleWheel}
        className="relative flex-1 h-full overflow-hidden cursor-grab active:cursor-grabbing"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255,255,255,0.07) 1px, transparent 0)`,
          backgroundSize: '24px 24px',
        }}
      >
        {/* Top Floating Control Bar */}
        <div className="absolute top-3 left-4 z-20 flex flex-wrap items-center gap-2 bg-zinc-900/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-zinc-800 shadow-xl">
          <div className="flex items-center gap-2 pr-2 border-r border-zinc-800">
            <Brain className="w-4 h-4 text-pink-400" />
            <span className="text-xs font-bold text-white tracking-wide">MAPA MENTAL</span>
          </div>

          <button
            onClick={() => handleAddNode('core')}
            className="px-2.5 py-1 rounded-lg bg-pink-600 hover:bg-pink-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-md"
            title="Criar novo nó"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Nó</span>
          </button>

          <button
            onClick={handleAutoArrange}
            className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs flex items-center gap-1.5 transition-colors"
            title="Auto-organizar nós em radial"
          >
            <GitFork className="w-3.5 h-3.5 text-cyan-400" />
            <span>Organizar</span>
          </button>

          <button
            onClick={handleExportJSON}
            className="px-2 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white text-xs flex items-center gap-1 transition-colors"
            title="Exportar JSON"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Exportar</span>
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-2 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white text-xs flex items-center gap-1 transition-colors"
            title="Importar JSON"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Importar</span>
          </button>

          <button
            onClick={handleResetTemplate}
            className="px-2 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white text-xs flex items-center gap-1 transition-colors"
            title="Restaurar Modelo Base"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Modelo</span>
          </button>
        </div>

        {/* Floating Zoom Bar */}
        <div className="absolute bottom-4 left-4 z-20 flex items-center gap-1 bg-zinc-900/90 backdrop-blur-md px-2 py-1.5 rounded-xl border border-zinc-800 shadow-xl">
          <button
            onClick={() => setZoom((z) => Math.min(2.5, z + 0.15))}
            className="p-1 rounded-lg hover:bg-zinc-800 text-zinc-300 hover:text-white"
            title="Aumentar Zoom"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <span className="text-[11px] font-mono text-zinc-400 w-12 text-center">
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={() => setZoom((z) => Math.max(0.3, z - 0.15))}
            className="p-1 rounded-lg hover:bg-zinc-800 text-zinc-300 hover:text-white"
            title="Diminuir Zoom"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            onClick={() => { setPan({ x: 0, y: 0 }); setZoom(1.0); }}
            className="p-1 rounded-lg hover:bg-zinc-800 text-zinc-300 hover:text-white"
            title="Resetar Câmera"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Connecting Banner Mode */}
        {connectingFromId && (
          <div className="absolute top-16 left-1/2 -translate-x-1/2 z-30 bg-purple-900/90 border border-purple-400 text-white px-4 py-1.5 rounded-full text-xs font-semibold shadow-2xl flex items-center gap-2 animate-pulse">
            <Share2 className="w-4 h-4" />
            <span>Clique no nó de destino para concluir a conexão</span>
            <button
              onClick={() => setConnectingFromId(null)}
              className="ml-2 px-2 py-0.5 rounded bg-black/40 hover:bg-black/60 text-[10px]"
            >
              Cancelar
            </button>
          </div>
        )}

        {/* SVG Bezier Connections Layer */}
        <svg
          className="absolute inset-0 pointer-events-none"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: '0 0',
            width: '4000px',
            height: '4000px',
          }}
        >
          <defs>
            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="glow" />
              <feComposite in="SourceGraphic" in2="glow" operator="over" />
            </filter>
          </defs>

          {data.connections.map((conn) => {
            const fromNode = data.nodes.find((n) => n.id === conn.from);
            const toNode = data.nodes.find((n) => n.id === conn.to);
            if (!fromNode || !toNode) return null;

            // Centers
            const x1 = fromNode.x + 110;
            const y1 = fromNode.y + 40;
            const x2 = toNode.x + 110;
            const y2 = toNode.y + 40;

            const dx = Math.abs(x2 - x1) * 0.5;
            const pathD = `M ${x1} ${y1} C ${x1 + (x2 > x1 ? dx : -dx)} ${y1}, ${x2 - (x2 > x1 ? dx : -dx)} ${y2}, ${x2} ${y2}`;

            return (
              <g key={conn.id}>
                {/* Glow outline */}
                <path
                  d={pathD}
                  fill="none"
                  stroke={conn.color || '#a855f7'}
                  strokeWidth="6"
                  strokeOpacity="0.25"
                  filter="url(#glow)"
                />
                {/* Solid main line */}
                <path
                  d={pathD}
                  fill="none"
                  stroke={conn.color || '#a855f7'}
                  strokeWidth="2.5"
                  strokeDasharray={conn.style === 'dashed' ? '5,5' : 'none'}
                  strokeLinecap="round"
                />
              </g>
            );
          })}
        </svg>

        {/* Graph Nodes Layer */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: '0 0',
          }}
        >
          {data.nodes.map((node) => {
            const isSelected = selectedNodeId === node.id;
            const isConnecting = connectingFromId === node.id;
            const catInfo = CATEGORY_COLORS[node.category] || CATEGORY_COLORS.core;

            return (
              <div
                key={node.id}
                onMouseDown={(e) => handleStartDragNode(e, node.id)}
                className={`mind-map-node pointer-events-auto absolute w-56 rounded-xl border p-3.5 transition-shadow cursor-pointer select-none ${
                  catInfo.bg
                } ${catInfo.border} ${
                  isSelected
                    ? 'ring-2 ring-white shadow-2xl z-30'
                    : isConnecting
                    ? 'ring-2 ring-purple-400 shadow-2xl z-20'
                    : 'shadow-lg hover:border-white/80 z-10'
                }`}
                style={{
                  left: `${node.x}px`,
                  top: `${node.y}px`,
                  boxShadow: isSelected ? `0 0 25px ${catInfo.glow}` : undefined,
                }}
              >
                {/* Header: Category Badge & Status */}
                <div className="flex items-center justify-between gap-1 mb-1.5">
                  <span className={`text-[9px] font-bold uppercase tracking-wider ${catInfo.text}`}>
                    {catInfo.label}
                  </span>
                  <span className="text-[11px]">
                    {node.status === 'done' && '✅'}
                    {node.status === 'progress' && '⏳'}
                    {node.status === 'idea' && '💡'}
                    {node.status === 'blocked' && '🔒'}
                  </span>
                </div>

                {/* Title */}
                <h4 className="text-xs font-bold text-white line-clamp-1 leading-snug">
                  {node.title}
                </h4>

                {/* Description */}
                {node.description && (
                  <p className="text-[10px] text-zinc-300 mt-1 line-clamp-2 leading-relaxed">
                    {node.description}
                  </p>
                )}

                {/* Tags */}
                {node.tags && node.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {node.tags.map((t, i) => (
                      <span
                        key={i}
                        className="px-1.5 py-0.5 rounded text-[8px] bg-black/40 border border-white/10 text-zinc-300"
                      >
                        #{t}
                      </span>
                    ))}
                  </div>
                )}

                {/* Quick Add Child Connection Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleAddNode(node.category, node.id);
                  }}
                  title="Criar nó conectado"
                  className="absolute -right-2.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-pink-600 hover:bg-pink-500 text-white flex items-center justify-center shadow-lg border border-white/40 text-xs transition-transform hover:scale-110 cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Right Side Inspector & Details Panel */}
      <aside className="studio-inspector w-80 h-full bg-[#0c0e15] border-l border-zinc-800 flex flex-col z-20 shrink-0">
        <div className="px-4 py-3 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className="w-4 h-4 text-pink-400" />
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              {selectedNode ? 'Inspetor de Nó' : 'Propriedades do Mapa'}
            </h3>
          </div>
          {selectedNode && (
            <button
              onClick={() => handleDeleteNode(selectedNode.id)}
              className="text-rose-400 hover:text-rose-300 p-1 rounded hover:bg-rose-950/40"
              title="Excluir nó"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {selectedNode ? (
            <>
              {/* Title Input */}
              <div>
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">
                  Título do Conceito
                </label>
                <input
                  type="text"
                  value={selectedNode.title}
                  onChange={(e) => {
                    const val = e.target.value;
                    setData((prev) => ({
                      ...prev,
                      nodes: prev.nodes.map((n) => (n.id === selectedNode.id ? { ...n, title: val } : n)),
                    }));
                  }}
                  className="w-full px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-750 text-xs text-white focus:outline-none focus:border-pink-500"
                />
              </div>

              {/* Category Select */}
              <div>
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">
                  Categoria & Pilar
                </label>
                <select
                  value={selectedNode.category}
                  onChange={(e) => {
                    const cat = e.target.value as MindMapNode['category'];
                    setData((prev) => ({
                      ...prev,
                      nodes: prev.nodes.map((n) => (n.id === selectedNode.id ? { ...n, category: cat } : n)),
                    }));
                  }}
                  className="w-full px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-750 text-xs text-white focus:outline-none focus:border-pink-500"
                >
                  <option value="core">🌟 Conceito Central</option>
                  <option value="world">🗺️ Mundo & Biomas</option>
                  <option value="combat">⚔️ Combate & Bosses</option>
                  <option value="lore">📜 Lore & Quests</option>
                  <option value="economy">🎒 Economia & Itens</option>
                  <option value="mechanics">⚙️ Mecânicas de Jogo</option>
                  <option value="audio">🎵 Áudio & VFX</option>
                </select>
              </div>

              {/* Status Select */}
              <div>
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">
                  Status de Execução
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  {(['idea', 'progress', 'done', 'blocked'] as const).map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => {
                        setData((prev) => ({
                          ...prev,
                          nodes: prev.nodes.map((n) => (n.id === selectedNode.id ? { ...n, status: st } : n)),
                        }));
                      }}
                      className={`px-2 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 border transition-colors ${
                        selectedNode.status === st
                          ? 'bg-zinc-800 border-white text-white'
                          : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      <span>
                        {st === 'idea' && '💡 Ideia'}
                        {st === 'progress' && '⏳ Em Progresso'}
                        {st === 'done' && '✅ Concluído'}
                        {st === 'blocked' && '🔒 Bloqueado'}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Description Input */}
              <div>
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">
                  Notas & Descrição
                </label>
                <textarea
                  rows={4}
                  value={selectedNode.description || ''}
                  onChange={(e) => {
                    const desc = e.target.value;
                    setData((prev) => ({
                      ...prev,
                      nodes: prev.nodes.map((n) => (n.id === selectedNode.id ? { ...n, description: desc } : n)),
                    }));
                  }}
                  placeholder="Escreva detalhes sobre o funcionamento, regras, dependências..."
                  className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-750 text-xs text-white focus:outline-none focus:border-pink-500 resize-none"
                />
              </div>

              {/* Tags Input */}
              <div>
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">
                  Tags (separadas por vírgula)
                </label>
                <input
                  type="text"
                  value={(selectedNode.tags || []).join(', ')}
                  onChange={(e) => {
                    const tags = e.target.value.split(',').map((t) => t.trim()).filter(Boolean);
                    setData((prev) => ({
                      ...prev,
                      nodes: prev.nodes.map((n) => (n.id === selectedNode.id ? { ...n, tags } : n)),
                    }));
                  }}
                  placeholder="Ex: Fogo, Boss, Fase 2"
                  className="w-full px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-750 text-xs text-white focus:outline-none focus:border-pink-500"
                />
              </div>

              {/* Action Buttons */}
              <div className="pt-2 space-y-2 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setConnectingFromId(selectedNode.id)}
                  className="w-full py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>Conectar a Outro Nó</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleAddNode(selectedNode.category, selectedNode.id)}
                  className="w-full py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Criar Nó Filho Conectado</span>
                </button>
              </div>
            </>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">
                  Título do Mapa Mental
                </label>
                <input
                  type="text"
                  value={data.title}
                  onChange={(e) => setData((prev) => ({ ...prev, title: e.target.value }))}
                  className="w-full px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-750 text-xs text-white focus:outline-none focus:border-pink-500"
                />
              </div>

              <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800">
                <span className="text-[11px] font-bold text-white block mb-2">Estatísticas do Projeto</span>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2 rounded-lg bg-black/40 border border-white/5">
                    <span className="text-zinc-500 text-[10px] block">Nós Ativos</span>
                    <span className="text-white font-bold text-sm">{data.nodes.length}</span>
                  </div>
                  <div className="p-2 rounded-lg bg-black/40 border border-white/5">
                    <span className="text-zinc-500 text-[10px] block">Conexões</span>
                    <span className="text-white font-bold text-sm">{data.connections.length}</span>
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-purple-950/20 border border-purple-500/30">
                <span className="text-[11px] font-bold text-purple-300 block mb-1">💡 Dica Rápida</span>
                <p className="text-[10px] text-zinc-400 leading-relaxed">
                  Arraste os nós para reposicioná-los livremente. Clique no botão "+" ao lado de qualquer nó para criar ramificações imediatas com curvas automáticas.
                </p>
              </div>
            </div>
          )}
        </div>
      </aside>
    </div>
  );
};
