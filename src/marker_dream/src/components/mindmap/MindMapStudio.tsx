import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
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
  Share2,
  Undo2,
  Redo2,
  Copy,
  FolderKanban,
  X,
  Layers,
  Calendar,
  Clock,
  Check,
  Link2,
  Unlink,
  Search,
  SlidersHorizontal,
  Compass,
  ExternalLink
} from 'lucide-react';
import {
  EDITOR_CONTENT_CATALOG,
  getEditorMeta,
  NodeEditorLink,
  EditorCatalogItem
} from './editorContentCatalog';

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
  editorLink?: NodeEditorLink | null;
}

export interface MindMapConnection {
  id: string;
  from: string;
  to: string;
  fromSide?: 'top' | 'bottom' | 'left' | 'right';
  toSide?: 'top' | 'bottom' | 'left' | 'right';
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
      editorLink: {
        editorId: 'levels',
        subCategory: 'campaign',
        itemId: 'lvl-01',
        itemLabel: 'Fase 01 - Floresta de Gosma',
        actionTrigger: 'Ponto focal da campanha principal',
      },
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
      editorLink: {
        editorId: 'maps',
        subCategory: 'biomes',
        itemId: 'map-plains',
        itemLabel: 'Bioma: Planície Verdejante',
        actionTrigger: 'Gera vegetação e paralaxe',
      },
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
      editorLink: {
        editorId: 'npcs',
        subCategory: 'enemies',
        itemId: 'npc-titan',
        itemLabel: 'Titã de Gosma (Chefe)',
        actionTrigger: 'Gatilho de batalha de chefe',
      },
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
      editorLink: {
        editorId: 'quests',
        subCategory: 'main_quests',
        itemId: 'qst-01',
        itemLabel: 'Capítulo 1: O Despertar da Matriz',
        actionTrigger: 'Inicia ao falar com Mestre Glub',
      },
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
      editorLink: {
        editorId: 'cards',
        subCategory: 'card_types',
        itemId: 'card-art-heart',
        itemLabel: 'Artefato: Coração do Titã Antigo',
        actionTrigger: 'Recompensa ao completar fase',
      },
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
      editorLink: {
        editorId: 'motion',
        subCategory: 'jelly_physics',
        itemId: 'mot-wobble',
        itemLabel: 'Motion: Oscilação Jelly Harmônica',
        actionTrigger: 'Física aplicada nos impactos',
      },
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

export interface SavedMapRecord {
  id: string;
  title: string;
  nodeCount: number;
  connectionCount: number;
  updatedAt: number;
  data: MindMapData;
}

const STORAGE_KEY = 'marker_dream_mindmap_data';
const GALLERY_STORAGE_KEY = 'marker_dream_mindmap_gallery';

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

  // Undo / Redo History
  const [history, setHistory] = useState<MindMapData[]>([data]);
  const [historyIdx, setHistoryIdx] = useState<number>(0);

  const updateDataWithHistory = useCallback((updater: MindMapData | ((prev: MindMapData) => MindMapData)) => {
    setData((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      setHistory((hPrev) => {
        const sliced = hPrev.slice(0, historyIdx + 1);
        return [...sliced, next];
      });
      setHistoryIdx((i) => i + 1);
      return next;
    });
  }, [historyIdx]);

  const handleUndo = useCallback(() => {
    if (historyIdx > 0) {
      const target = history[historyIdx - 1];
      setHistoryIdx((i) => i - 1);
      setData(target);
      showToast('Desfazer executado');
    }
  }, [historyIdx, history, showToast]);

  const handleRedo = useCallback(() => {
    if (historyIdx < history.length - 1) {
      const target = history[historyIdx + 1];
      setHistoryIdx((i) => i + 1);
      setData(target);
      showToast('Refazer executado');
    }
  }, [historyIdx, history, showToast]);

  // Gallery of Mind Maps
  const [isGalleryOpen, setIsGalleryOpen] = useState<boolean>(false);
  const [galleryList, setGalleryList] = useState<SavedMapRecord[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(GALLERY_STORAGE_KEY);
        if (saved) return JSON.parse(saved);
      } catch {}
    }
    return [
      {
        id: 'map-default',
        title: DEFAULT_MAP_DATA.title,
        nodeCount: DEFAULT_MAP_DATA.nodes.length,
        connectionCount: DEFAULT_MAP_DATA.connections.length,
        updatedAt: Date.now(),
        data: DEFAULT_MAP_DATA,
      },
    ];
  });
  const [activeMapId, setActiveMapId] = useState<string>('map-default');

  // Sync Gallery to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(GALLERY_STORAGE_KEY, JSON.stringify(galleryList));
    } catch {}
  }, [galleryList]);

  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState<number>(1.0);
  const [isPanning, setIsPanning] = useState<boolean>(false);
  const [startPan, setStartPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedConnId, setSelectedConnId] = useState<string | null>(null);
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [connectingFromId, setConnectingFromId] = useState<string | null>(null);

  // Drag-to-connect state from any (+) handle
  const [dragConnection, setDragConnection] = useState<{
    fromNodeId: string;
    fromSide: 'top' | 'bottom' | 'left' | 'right';
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
  } | null>(null);
  const dragStartClientPos = useRef<{ x: number; y: number } | null>(null);

  // Clipboard & Mouse Tracking for Ctrl+C / Ctrl+V
  const clipboardNodeRef = useRef<MindMapNode | null>(null);
  const mouseCanvasPosRef = useRef<{ x: number; y: number }>({ x: 500, y: 350 });

  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Editor Module Linking Modal & Search States
  const [searchModalNodeId, setSearchModalNodeId] = useState<string | null>(null);
  const [catalogSearchQuery, setCatalogSearchQuery] = useState<string>('');
  const [catalogFilterEditorId, setCatalogFilterEditorId] = useState<string>('all');

  // Attach an editor catalog item to a node
  const handleAttachEditorItem = (
    nodeId: string,
    item: EditorCatalogItem,
    editorId: string,
    subCatId: string,
    actionTrigger?: string
  ) => {
    updateDataWithHistory((prev) => ({
      ...prev,
      nodes: prev.nodes.map((n) =>
        n.id === nodeId
          ? {
              ...n,
              editorLink: {
                editorId,
                subCategory: subCatId,
                itemId: item.id,
                itemLabel: item.label,
                actionTrigger: actionTrigger || n.editorLink?.actionTrigger || '',
              },
            }
          : n
      ),
    }));
    setSearchModalNodeId(null);
    showToast(`Módulo "${item.label}" vinculado ao card!`);
  };

  // Detach editor module from a node
  const handleDetachEditorItem = (nodeId: string) => {
    updateDataWithHistory((prev) => ({
      ...prev,
      nodes: prev.nodes.map((n) => (n.id === nodeId ? { ...n, editorLink: null } : n)),
    }));
    showToast('Vínculo de módulo removido!');
  };

  // Update action trigger note
  const handleUpdateTrigger = (nodeId: string, trigger: string) => {
    setData((prev) => ({
      ...prev,
      nodes: prev.nodes.map((n) =>
        n.id === nodeId && n.editorLink
          ? { ...n, editorLink: { ...n.editorLink, actionTrigger: trigger } }
          : n
      ),
    }));
  };

  // Sync node title with the linked editor item label
  const handleSyncTitleWithEditorItem = (nodeId: string) => {
    const target = data.nodes.find((n) => n.id === nodeId);
    if (!target?.editorLink) return;
    updateDataWithHistory((prev) => ({
      ...prev,
      nodes: prev.nodes.map((n) =>
        n.id === nodeId ? { ...n, title: target.editorLink!.itemLabel } : n
      ),
    }));
    showToast('Título do card atualizado com o nome do módulo!');
  };

  // Filtered Catalog Items for the Search Modal
  const filteredCatalogItems = useMemo(() => {
    const q = catalogSearchQuery.trim().toLowerCase();
    const results: Array<{
      editorId: string;
      editorName: string;
      editorIcon: string;
      editorColor: string;
      subCatId: string;
      subCatName: string;
      item: EditorCatalogItem;
    }> = [];

    EDITOR_CONTENT_CATALOG.forEach((editor) => {
      if (catalogFilterEditorId !== 'all' && editor.id !== catalogFilterEditorId) return;

      editor.subCategories.forEach((sub) => {
        sub.items.forEach((item) => {
          if (!q) {
            results.push({
              editorId: editor.id,
              editorName: editor.name,
              editorIcon: editor.icon,
              editorColor: editor.color,
              subCatId: sub.id,
              subCatName: sub.name,
              item,
            });
            return;
          }

          const matchLabel = item.label.toLowerCase().includes(q);
          const matchDesc = item.description.toLowerCase().includes(q);
          const matchBadge = item.badge.toLowerCase().includes(q);
          const matchSub = sub.name.toLowerCase().includes(q);
          const matchEd = editor.name.toLowerCase().includes(q);

          if (matchLabel || matchDesc || matchBadge || matchSub || matchEd) {
            results.push({
              editorId: editor.id,
              editorName: editor.name,
              editorIcon: editor.icon,
              editorColor: editor.color,
              subCatId: sub.id,
              subCatName: sub.name,
              item,
            });
          }
        });
      });
    });

    return results;
  }, [catalogSearchQuery, catalogFilterEditorId]);

  // Auto-save active map to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      setGalleryList((prev) =>
        prev.map((item) =>
          item.id === activeMapId
            ? {
                ...item,
                title: data.title,
                nodeCount: data.nodes.length,
                connectionCount: data.connections.length,
                updatedAt: Date.now(),
                data,
              }
            : item
        )
      );
    } catch {}
  }, [data, activeMapId]);

  const selectedNode = data.nodes.find((n) => n.id === selectedNodeId);

  // Gallery Actions
  const handleOpenGalleryMap = (record: SavedMapRecord) => {
    setActiveMapId(record.id);
    setData(record.data);
    setHistory([record.data]);
    setHistoryIdx(0);
    setIsGalleryOpen(false);
    showToast(`Mapa "${record.title}" carregado!`);
  };

  const handleCreateNewGalleryMap = () => {
    const newId = `map-${Date.now()}`;
    const newMap: MindMapData = {
      title: `Novo Mapa Mental #${galleryList.length + 1}`,
      nodes: [
        {
          id: `node-${Date.now()}`,
          title: 'Conceito Central',
          description: 'Pilar inicial do novo mapa mental',
          category: 'core',
          x: 450,
          y: 300,
          color: '#a855f7',
          status: 'idea',
          tags: ['Core'],
          parentId: null,
        },
      ],
      connections: [],
    };
    const newRecord: SavedMapRecord = {
      id: newId,
      title: newMap.title,
      nodeCount: 1,
      connectionCount: 0,
      updatedAt: Date.now(),
      data: newMap,
    };
    setGalleryList((prev) => [newRecord, ...prev]);
    setActiveMapId(newId);
    setData(newMap);
    setHistory([newMap]);
    setHistoryIdx(0);
    setIsGalleryOpen(false);
    showToast('Novo mapa mental criado!');
  };

  const handleDuplicateGalleryMap = (record: SavedMapRecord) => {
    const newId = `map-${Date.now()}`;
    const dupMap: MindMapData = JSON.parse(JSON.stringify(record.data));
    dupMap.title = `${record.title} (Cópia)`;
    const newRecord: SavedMapRecord = {
      id: newId,
      title: dupMap.title,
      nodeCount: dupMap.nodes.length,
      connectionCount: dupMap.connections.length,
      updatedAt: Date.now(),
      data: dupMap,
    };
    setGalleryList((prev) => [newRecord, ...prev]);
    showToast(`Mapa duplicado com sucesso!`);
  };

  const handleDeleteGalleryMap = (id: string) => {
    if (galleryList.length <= 1) {
      showToast('Você deve manter pelo menos um mapa salvo!');
      return;
    }
    const filtered = galleryList.filter((m) => m.id !== id);
    setGalleryList(filtered);
    if (activeMapId === id) {
      handleOpenGalleryMap(filtered[0]);
    }
    showToast('Mapa mental excluído da galeria!');
  };

  // Delete Node
  const handleDeleteNode = useCallback(
    (id: string) => {
      updateDataWithHistory((prev) => ({
        ...prev,
        nodes: prev.nodes.filter((n) => n.id !== id),
        connections: prev.connections.filter((c) => c.from !== id && c.to !== id),
      }));
      if (selectedNodeId === id) setSelectedNodeId(null);
      showToast('Nó removido!');
    },
    [selectedNodeId, updateDataWithHistory, showToast]
  );

  // Delete Connection
  const handleDeleteConnection = useCallback(
    (id: string) => {
      updateDataWithHistory((prev) => ({
        ...prev,
        connections: prev.connections.filter((c) => c.id !== id),
      }));
      if (selectedConnId === id) setSelectedConnId(null);
      showToast('Conexão removida!');
    },
    [selectedConnId, updateDataWithHistory, showToast]
  );

  // Split connection into two by inserting an intersection node
  const handleSplitConnection = (conn: MindMapConnection, midX: number, midY: number) => {
    const fromNode = data.nodes.find((n) => n.id === conn.from);
    const newId = `node-${Date.now()}`;
    const newNode: MindMapNode = {
      id: newId,
      title: 'Intersecção / Decisão',
      description: 'Nó intermediário inserido no fluxo',
      category: fromNode?.category || 'mechanics',
      x: Math.round(midX - 112),
      y: Math.round(midY - 46),
      color: fromNode?.color || '#ec4899',
      status: 'progress',
      tags: ['Intersecção'],
      parentId: conn.from,
    };

    const conn1: MindMapConnection = {
      id: `conn-${Date.now()}-1`,
      from: conn.from,
      to: newId,
      fromSide: conn.fromSide,
      color: newNode.color,
      style: 'solid',
    };

    const conn2: MindMapConnection = {
      id: `conn-${Date.now()}-2`,
      from: newId,
      to: conn.to,
      toSide: conn.toSide,
      color: newNode.color,
      style: 'solid',
    };

    updateDataWithHistory((prev) => ({
      ...prev,
      nodes: [...prev.nodes, newNode],
      connections: [...prev.connections.filter((c) => c.id !== conn.id), conn1, conn2],
    }));

    setSelectedNodeId(newId);
    showToast('Nó de intersecção inserido no traçado!');
  };

  // Global Keyboard Shortcuts (Delete, Ctrl+C, Ctrl+V, Ctrl+Z, Ctrl+Y)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      const isInput =
        activeEl?.tagName === 'INPUT' ||
        activeEl?.tagName === 'TEXTAREA' ||
        (activeEl as HTMLElement)?.isContentEditable;

      if (isInput) return;

      // Ctrl+Z: Undo
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        handleUndo();
        return;
      }

      // Ctrl+Y or Ctrl+Shift+Z: Redo
      if (
        ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') ||
        ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'z')
      ) {
        e.preventDefault();
        handleRedo();
        return;
      }

      // Ctrl+C: Copy Selected Node
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c') {
        if (selectedNodeId) {
          const target = data.nodes.find((n) => n.id === selectedNodeId);
          if (target) {
            e.preventDefault();
            clipboardNodeRef.current = JSON.parse(JSON.stringify(target));
            showToast(`Nó "${target.title}" copiado (Ctrl+C)!`);
          }
        }
        return;
      }

      // Ctrl+V: Paste Copied Node
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'v') {
        if (clipboardNodeRef.current) {
          e.preventDefault();
          const orig = clipboardNodeRef.current;
          const pastedNode: MindMapNode = {
            ...orig,
            id: `node-${Date.now()}`,
            title: `${orig.title} (Cópia)`,
            x: Math.round(mouseCanvasPosRef.current.x - 112),
            y: Math.round(mouseCanvasPosRef.current.y - 46),
            parentId: null,
          };
          updateDataWithHistory((prev) => ({
            ...prev,
            nodes: [...prev.nodes, pastedNode],
          }));
          setSelectedNodeId(pastedNode.id);
          showToast('Nó colado (Ctrl+V)!');
        }
        return;
      }

      // Delete or Backspace: Delete selected node or selected connection
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedNodeId) {
          e.preventDefault();
          handleDeleteNode(selectedNodeId);
        } else if (selectedConnId) {
          e.preventDefault();
          handleDeleteConnection(selectedConnId);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    selectedNodeId,
    selectedConnId,
    data.nodes,
    handleUndo,
    handleRedo,
    handleDeleteNode,
    handleDeleteConnection,
    updateDataWithHistory,
    showToast,
  ]);

  // Pan controls with Mouse
  const handleMouseDownCanvas = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.mind-map-node') || (e.target as HTMLElement).closest('.studio-inspector')) {
      return;
    }
    setIsPanning(true);
    setStartPan({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMoveCanvas = (e: React.MouseEvent) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (rect) {
      const mouseCanvasX = (e.clientX - rect.left - pan.x) / zoom;
      const mouseCanvasY = (e.clientY - rect.top - pan.y) / zoom;
      mouseCanvasPosRef.current = { x: mouseCanvasX, y: mouseCanvasY };

      if (dragConnection) {
        setDragConnection((prev) =>
          prev ? { ...prev, currentX: mouseCanvasX, currentY: mouseCanvasY } : null
        );
      } else if (isPanning) {
        setPan({ x: e.clientX - startPan.x, y: e.clientY - startPan.y });
      } else if (draggingNodeId) {
        const newX = Math.round(mouseCanvasX - dragOffset.x);
        const newY = Math.round(mouseCanvasY - dragOffset.y);

        setData((prev) => ({
          ...prev,
          nodes: prev.nodes.map((node) =>
            node.id === draggingNodeId ? { ...node, x: newX, y: newY } : node
          ),
        }));
      }
    }
  };

  const handleMouseUpCanvas = () => {
    if (draggingNodeId) {
      setHistory((hPrev) => {
        const sliced = hPrev.slice(0, historyIdx + 1);
        return [...sliced, data];
      });
      setHistoryIdx((i) => i + 1);
    }
    setIsPanning(false);
    setDraggingNodeId(null);
    if (dragConnection) {
      setDragConnection(null);
    }
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

  const NODE_WIDTH = 224;
  const NODE_HEIGHT = 92;

  // Calculate best connection ports (Top, Bottom, Left, Right) between two nodes with optional explicit sides
  const getBestConnectionPorts = (
    fromNode: MindMapNode,
    toNode: MindMapNode,
    explicitFromSide?: 'top' | 'bottom' | 'left' | 'right',
    explicitToSide?: 'top' | 'bottom' | 'left' | 'right'
  ) => {
    const portsFrom: Record<string, { name: string; x: number; y: number; dirX: number; dirY: number }> = {
      right: { name: 'right', x: fromNode.x + NODE_WIDTH, y: fromNode.y + NODE_HEIGHT / 2, dirX: 1, dirY: 0 },
      left: { name: 'left', x: fromNode.x, y: fromNode.y + NODE_HEIGHT / 2, dirX: -1, dirY: 0 },
      bottom: { name: 'bottom', x: fromNode.x + NODE_WIDTH / 2, y: fromNode.y + NODE_HEIGHT, dirX: 0, dirY: 1 },
      top: { name: 'top', x: fromNode.x + NODE_WIDTH / 2, y: fromNode.y, dirX: 0, dirY: -1 },
    };

    const portsTo: Record<string, { name: string; x: number; y: number; dirX: number; dirY: number }> = {
      left: { name: 'left', x: toNode.x, y: toNode.y + NODE_HEIGHT / 2, dirX: -1, dirY: 0 },
      right: { name: 'right', x: toNode.x + NODE_WIDTH, y: toNode.y + NODE_HEIGHT / 2, dirX: 1, dirY: 0 },
      top: { name: 'top', x: toNode.x + NODE_WIDTH / 2, y: toNode.y, dirX: 0, dirY: -1 },
      bottom: { name: 'bottom', x: toNode.x + NODE_WIDTH / 2, y: toNode.y + NODE_HEIGHT, dirX: 0, dirY: 1 },
    };

    if (explicitFromSide && explicitToSide && portsFrom[explicitFromSide] && portsTo[explicitToSide]) {
      const p1 = portsFrom[explicitFromSide];
      const p2 = portsTo[explicitToSide];
      return { p1, p2, dist: Math.hypot(p2.x - p1.x, p2.y - p1.y) };
    }

    if (explicitFromSide && portsFrom[explicitFromSide]) {
      const p1 = portsFrom[explicitFromSide];
      let bestTo = Object.values(portsTo)[0];
      let bestDist = Infinity;
      for (const p2 of Object.values(portsTo)) {
        const d = Math.hypot(p2.x - p1.x, p2.y - p1.y);
        if (d < bestDist) {
          bestTo = p2;
          bestDist = d;
        }
      }
      return { p1, p2: bestTo, dist: bestDist };
    }

    let bestPair = { p1: portsFrom.right, p2: portsTo.left, dist: Infinity };

    for (const p1 of Object.values(portsFrom)) {
      for (const p2 of Object.values(portsTo)) {
        const d = Math.hypot(p2.x - p1.x, p2.y - p1.y);
        if (d < bestPair.dist) {
          bestPair = { p1, p2, dist: d };
        }
      }
    }

    return bestPair;
  };

  // Create new Node in a specific direction (right, left, top, bottom)
  const handleAddNodeDirectional = (
    category: MindMapNode['category'] = 'core',
    parentNodeId: string,
    direction: 'top' | 'bottom' | 'left' | 'right'
  ) => {
    const parentNode = data.nodes.find((n) => n.id === parentNodeId);
    if (!parentNode) return;

    let posX = parentNode.x;
    let posY = parentNode.y;
    const offset = 260;

    if (direction === 'right') {
      posX += offset;
      posY += (Math.random() * 40 - 20);
    } else if (direction === 'left') {
      posX -= offset;
      posY += (Math.random() * 40 - 20);
    } else if (direction === 'top') {
      posY -= 140;
      posX += (Math.random() * 40 - 20);
    } else if (direction === 'bottom') {
      posY += 140;
      posX += (Math.random() * 40 - 20);
    }

    const id = `node-${Date.now()}`;
    const newNode: MindMapNode = {
      id,
      title: 'Nova Ideia / Conceito',
      description: 'Detalhes da mecânica ou elemento do jogo',
      category,
      x: Math.round(posX),
      y: Math.round(posY),
      color: parentNode.color || '#a855f7',
      status: 'idea',
      tags: ['Ideia'],
      parentId: parentNode.id,
    };

    const newConnection: MindMapConnection = {
      id: `conn-${Date.now()}`,
      from: parentNode.id,
      to: id,
      color: newNode.color,
      style: 'solid',
    };

    updateDataWithHistory((prev) => ({
      ...prev,
      nodes: [...prev.nodes, newNode],
      connections: [...prev.connections, newConnection],
    }));
    setSelectedNodeId(id);
    showToast(`Nó conectado criado (${direction})!`);
  };

  // Start dragging connection from a (+) handle
  const handleStartHandleDrag = (
    e: React.MouseEvent,
    node: MindMapNode,
    side: 'top' | 'bottom' | 'left' | 'right'
  ) => {
    e.stopPropagation();
    dragStartClientPos.current = { x: e.clientX, y: e.clientY };

    let startX = node.x + NODE_WIDTH / 2;
    let startY = node.y + NODE_HEIGHT / 2;
    if (side === 'top') startY = node.y;
    else if (side === 'bottom') startY = node.y + NODE_HEIGHT;
    else if (side === 'left') startX = node.x;
    else if (side === 'right') startX = node.x + NODE_WIDTH;

    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const currentX = (e.clientX - rect.left - pan.x) / zoom;
    const currentY = (e.clientY - rect.top - pan.y) / zoom;

    setDragConnection({
      fromNodeId: node.id,
      fromSide: side,
      startX,
      startY,
      currentX,
      currentY,
    });
  };

  // Drop connection on a target node (allows return paths and multi-paths)
  const handleEndConnectionOnTarget = (
    targetNodeId: string,
    toSide?: 'top' | 'bottom' | 'left' | 'right'
  ) => {
    if (dragConnection && dragConnection.fromNodeId !== targetNodeId) {
      const fromId = dragConnection.fromNodeId;
      const toId = targetNodeId;
      const fromSide = dragConnection.fromSide;

      // Only reject if an EXACT duplicate connection in the same direction and same sides already exists
      const isExactDuplicate = data.connections.some(
        (c) =>
          c.from === fromId &&
          c.to === toId &&
          c.fromSide === fromSide &&
          c.toSide === toSide
      );

      if (!isExactDuplicate) {
        const fromNode = data.nodes.find((n) => n.id === fromId);
        const newConn: MindMapConnection = {
          id: `conn-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          from: fromId,
          to: toId,
          fromSide,
          toSide,
          color: fromNode?.color || '#a855f7',
          style: 'solid',
        };
        updateDataWithHistory((prev) => ({
          ...prev,
          connections: [...prev.connections, newConn],
        }));
        showToast('Caminho conectado com direção!');
      }
    }
    setDragConnection(null);
  };

  // Handle release on a handle (either click-to-create or drop-to-connect)
  const handleMouseUpOnHandle = (
    e: React.MouseEvent,
    node: MindMapNode,
    side: 'top' | 'bottom' | 'left' | 'right'
  ) => {
    e.stopPropagation();
    if (dragConnection) {
      if (dragConnection.fromNodeId !== node.id) {
        handleEndConnectionOnTarget(node.id, side);
        return;
      }
      const dist = dragStartClientPos.current
        ? Math.hypot(e.clientX - dragStartClientPos.current.x, e.clientY - dragStartClientPos.current.y)
        : 0;

      if (dist < 6) {
        handleAddNodeDirectional(node.category, node.id, side);
      }
      setDragConnection(null);
    }
  };

  // Create new Node (Default or selected)
  const handleAddNode = (category: MindMapNode['category'] = 'core', parentId?: string | null) => {
    const parentNode = parentId ? data.nodes.find((n) => n.id === parentId) : selectedNode;
    if (parentNode) {
      handleAddNodeDirectional(category, parentNode.id, 'right');
      return;
    }

    const posX = 400 + Math.random() * 80;
    const posY = 300 + Math.random() * 80;

    const id = `node-${Date.now()}`;
    const newNode: MindMapNode = {
      id,
      title: 'Novo Conceito Base',
      description: 'Ponto focal ou nova mecânica de jogo',
      category,
      x: posX,
      y: posY,
      color: '#a855f7',
      status: 'idea',
      tags: ['Ideia'],
      parentId: null,
    };

    updateDataWithHistory((prev) => ({
      ...prev,
      nodes: [...prev.nodes, newNode],
    }));
    setSelectedNodeId(id);
    showToast('Nó adicionado ao mapa mental!');
  };

  // Intelligent Tree Layout Algorithm (Horizontal L->R or Vertical Top->Down)
  const handleAutoArrangeTree = (direction: 'horizontal' | 'vertical' = 'horizontal') => {
    if (data.nodes.length === 0) return;

    const NODE_W = NODE_WIDTH; // 224
    const NODE_H = NODE_HEIGHT; // 92
    const GAP_LEVEL = direction === 'horizontal' ? 320 : 190;
    const GAP_SIBLING = direction === 'horizontal' ? 36 : 48;

    // 1. Build forward adjacency list and calculate in-degree
    const inDegree: Record<string, number> = {};
    const adj: Record<string, string[]> = {};
    data.nodes.forEach((n) => {
      inDegree[n.id] = 0;
      adj[n.id] = [];
    });

    data.connections.forEach((c) => {
      if (adj[c.from] && inDegree[c.to] !== undefined) {
        adj[c.from].push(c.to);
        inDegree[c.to] = (inDegree[c.to] || 0) + 1;
      }
    });

    // 2. Identify root nodes
    let roots = data.nodes.filter((n) => inDegree[n.id] === 0);
    if (roots.length === 0) {
      const coreNode = data.nodes.find((n) => n.category === 'core');
      roots = coreNode ? [coreNode] : [data.nodes[0]];
    }

    // Sort roots so 'core' comes first
    roots.sort((a, b) => (a.category === 'core' ? -1 : b.category === 'core' ? 1 : 0));

    // 3. Build spanning tree forest avoiding cycles
    const visited = new Set<string>();
    const treeChildren: Record<string, string[]> = {};
    data.nodes.forEach((n) => {
      treeChildren[n.id] = [];
    });

    const buildTree = (nodeId: string) => {
      visited.add(nodeId);
      const candidates = adj[nodeId] || [];
      for (const childId of candidates) {
        if (!visited.has(childId)) {
          treeChildren[nodeId].push(childId);
          buildTree(childId);
        }
      }
    };

    roots.forEach((r) => buildTree(r.id));

    // Include any disconnected components
    data.nodes.forEach((n) => {
      if (!visited.has(n.id)) {
        roots.push(n);
        buildTree(n.id);
      }
    });

    // 4. Calculate Subtree Span (Height for horizontal, Width for vertical)
    const subtreeSpan: Record<string, number> = {};
    const computeSpan = (nodeId: string): number => {
      const children = treeChildren[nodeId];
      if (children.length === 0) {
        subtreeSpan[nodeId] = (direction === 'horizontal' ? NODE_H : NODE_W) + GAP_SIBLING;
        return subtreeSpan[nodeId];
      }
      let sum = 0;
      for (const c of children) {
        sum += computeSpan(c);
      }
      subtreeSpan[nodeId] = Math.max(
        (direction === 'horizontal' ? NODE_H : NODE_W) + GAP_SIBLING,
        sum
      );
      return subtreeSpan[nodeId];
    };

    roots.forEach((r) => computeSpan(r.id));

    // 5. Position nodes recursively with center-aligned parents
    const positions: Record<string, { x: number; y: number }> = {};
    let currentTreeCrossOffset = 80;

    const assignPositions = (nodeId: string, level: number, crossStart: number) => {
      const span = subtreeSpan[nodeId];
      const children = treeChildren[nodeId];

      if (direction === 'horizontal') {
        const x = 80 + level * GAP_LEVEL;
        let y: number;

        if (children.length === 0) {
          y = crossStart + (span - NODE_H) / 2;
        } else {
          let childCross = crossStart;
          const childYs: number[] = [];
          for (const c of children) {
            assignPositions(c, level + 1, childCross);
            childYs.push(positions[c].y);
            childCross += subtreeSpan[c];
          }
          y = (childYs[0] + childYs[childYs.length - 1]) / 2;
        }
        positions[nodeId] = { x, y: Math.round(y) };
      } else {
        const y = 80 + level * GAP_LEVEL;
        let x: number;

        if (children.length === 0) {
          x = crossStart + (span - NODE_W) / 2;
        } else {
          let childCross = crossStart;
          const childXs: number[] = [];
          for (const c of children) {
            assignPositions(c, level + 1, childCross);
            childXs.push(positions[c].x);
            childCross += subtreeSpan[c];
          }
          x = (childXs[0] + childXs[childXs.length - 1]) / 2;
        }
        positions[nodeId] = { x: Math.round(x), y };
      }
    };

    roots.forEach((r) => {
      assignPositions(r.id, 0, currentTreeCrossOffset);
      currentTreeCrossOffset += subtreeSpan[r.id] + GAP_SIBLING * 1.5;
    });

    // 6. Update node coordinates
    const newNodes = data.nodes.map((node) => {
      const pos = positions[node.id] || { x: node.x, y: node.y };
      return { ...node, x: pos.x, y: pos.y };
    });

    // 7. Auto-adjust Camera (Bounding Box & Fit to Screen with margins)
    let minX = Infinity,
      maxX = -Infinity,
      minY = Infinity,
      maxY = -Infinity;
    newNodes.forEach((n) => {
      minX = Math.min(minX, n.x);
      maxX = Math.max(maxX, n.x + NODE_W);
      minY = Math.min(minY, n.y);
      maxY = Math.max(maxY, n.y + NODE_H);
    });

    const graphW = maxX - minX;
    const graphH = maxY - minY;
    const containerW = containerRef.current?.clientWidth || 1000;
    const containerH = containerRef.current?.clientHeight || 700;

    const zoomX = (containerW - 140) / (graphW || 1);
    const zoomY = (containerH - 140) / (graphH || 1);
    const targetZoom = Math.min(Math.max(0.4, Math.min(zoomX, zoomY, 1.05)), 1.25);

    const targetPanX = (containerW - graphW * targetZoom) / 2 - minX * targetZoom;
    const targetPanY = (containerH - graphH * targetZoom) / 2 - minY * targetZoom;

    updateDataWithHistory((prev) => ({ ...prev, nodes: newNodes }));
    setZoom(Number(targetZoom.toFixed(2)));
    setPan({ x: Math.round(targetPanX), y: Math.round(targetPanY) });
    showToast(
      `Árvore organizada com auto-ajuste (${direction === 'horizontal' ? 'Horizontal' : 'Vertical'})!`
    );
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

          {/* Undo / Redo Buttons */}
          <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-lg bg-zinc-950/60 border border-zinc-800">
            <button
              onClick={handleUndo}
              disabled={historyIdx <= 0}
              className="p-1 rounded hover:bg-zinc-800 disabled:opacity-30 disabled:hover:bg-transparent text-zinc-300 hover:text-white transition-colors"
              title="Desfazer (Ctrl+Z)"
            >
              <Undo2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleRedo}
              disabled={historyIdx >= history.length - 1}
              className="p-1 rounded hover:bg-zinc-800 disabled:opacity-30 disabled:hover:bg-transparent text-zinc-300 hover:text-white transition-colors"
              title="Refazer (Ctrl+Y)"
            >
              <Redo2 className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Galeria de Mapas Mentais */}
          <button
            onClick={() => setIsGalleryOpen(true)}
            className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-amber-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border border-amber-500/30"
            title="Abrir Galeria de Mapas Mentais"
          >
            <FolderKanban className="w-3.5 h-3.5 text-amber-400" />
            <span>Galeria</span>
            <span className="px-1.5 py-0.2 rounded-full bg-amber-500/20 text-[10px] text-amber-300 font-mono">
              {galleryList.length}
            </span>
          </button>

          <button
            onClick={() => handleAutoArrangeTree('horizontal')}
            className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-cyan-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border border-cyan-500/30"
            title="Auto-organizar em Árvore Inteligente Horizontal com Auto-Ajuste de Câmera"
          >
            <GitFork className="w-3.5 h-3.5 text-cyan-400 rotate-90" />
            <span>Árvore L➔R</span>
          </button>

          <button
            onClick={() => handleAutoArrangeTree('vertical')}
            className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Auto-organizar em Árvore Inteligente Vertical (Top-Down)"
          >
            <GitFork className="w-3.5 h-3.5 text-purple-400" />
            <span>Árvore Top➔Down</span>
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

        {/* SVG Bezier Connections Layer (Unbounded with overflow visible so lines never clip) */}
        <svg
          className="absolute inset-0 pointer-events-none"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: '0 0',
            width: '100%',
            height: '100%',
            overflow: 'visible',
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

            // Find overlapping or bidirectional connections between this pair
            const samePairConns = data.connections.filter(
              (c) =>
                (c.from === conn.from && c.to === conn.to) ||
                (c.from === conn.to && c.to === conn.from)
            );
            const pairIndex = samePairConns.findIndex((c) => c.id === conn.id);

            const { p1, p2, dist } = getBestConnectionPorts(fromNode, toNode, conn.fromSide, conn.toSide);
            const baseCurvature = Math.max(45, Math.min(220, dist * 0.42));

            // Separate overlapping or bidirectional curves
            const curveShift = samePairConns.length > 1 ? (pairIndex - (samePairConns.length - 1) / 2) * 36 : 0;
            const perpX = dist > 0 ? (-(p2.y - p1.y) / dist) * curveShift : 0;
            const perpY = dist > 0 ? ((p2.x - p1.x) / dist) * curveShift : 0;

            const cx1 = p1.x + p1.dirX * baseCurvature + perpX;
            const cy1 = p1.y + p1.dirY * baseCurvature + perpY;
            const cx2 = p2.x + p2.dirX * baseCurvature + perpX;
            const cy2 = p2.y + p2.dirY * baseCurvature + perpY;

            const pathD = `M ${p1.x} ${p1.y} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${p2.x} ${p2.y}`;

            // Midpoint of Cubic Bézier curve at t = 0.5
            const midX = 0.125 * p1.x + 0.375 * cx1 + 0.375 * cx2 + 0.125 * p2.x;
            const midY = 0.125 * p1.y + 0.375 * cy1 + 0.375 * cy2 + 0.125 * p2.y;
            const isConnSelected = selectedConnId === conn.id;

            // Arrow polygon at destination p2 pointing into toNode
            const arrowAngle = Math.atan2(p2.y - cy2, p2.x - cx2);
            const arrowLen = 13;
            const arrowWidth = 7;
            const ax1 = p2.x;
            const ay1 = p2.y;
            const ax2 = p2.x - arrowLen * Math.cos(arrowAngle) + arrowWidth * Math.sin(arrowAngle);
            const ay2 = p2.y - arrowLen * Math.sin(arrowAngle) - arrowWidth * Math.cos(arrowAngle);
            const ax3 = p2.x - arrowLen * Math.cos(arrowAngle) - arrowWidth * Math.sin(arrowAngle);
            const ay3 = p2.y - arrowLen * Math.sin(arrowAngle) + arrowWidth * Math.cos(arrowAngle);
            const arrowPoints = `${ax1},${ay1} ${ax2},${ay2} ${ax3},${ay3}`;

            return (
              <g key={conn.id} className="group/conn">
                {/* Glow outline */}
                <path
                  d={pathD}
                  fill="none"
                  stroke={isConnSelected ? '#ffffff' : conn.color || '#a855f7'}
                  strokeWidth={isConnSelected ? '8' : '6'}
                  strokeOpacity={isConnSelected ? '0.5' : '0.25'}
                  filter="url(#glow)"
                />
                {/* Solid main line */}
                <path
                  d={pathD}
                  fill="none"
                  stroke={isConnSelected ? '#ffffff' : conn.color || '#a855f7'}
                  strokeWidth={isConnSelected ? '3.5' : '2.5'}
                  strokeDasharray={conn.style === 'dashed' ? '5,5' : 'none'}
                  strokeLinecap="round"
                />
                {/* Directional Arrow Head pointing INTO the destination port */}
                <polygon
                  points={arrowPoints}
                  fill={isConnSelected ? '#ffffff' : conn.color || '#a855f7'}
                  stroke="#ffffff"
                  strokeWidth="1.2"
                />
                {/* Origin port anchor dot */}
                <circle cx={p1.x} cy={p1.y} r="3" fill="#fff" />

                {/* Animated Directional Flow Particle from p1 to p2 */}
                <circle r="3.5" fill="#ffffff" filter="url(#glow)">
                  <animateMotion
                    path={pathD}
                    dur="2.5s"
                    repeatCount="indefinite"
                  />
                </circle>

                {/* Wide invisible path along the curve for easy selection & click-to-split */}
                <path
                  d={pathD}
                  fill="none"
                  stroke="transparent"
                  strokeWidth="22"
                  className="pointer-events-auto cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedConnId(conn.id);
                    setSelectedNodeId(null);
                  }}
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    handleSplitConnection(conn, midX, midY);
                  }}
                />

                {/* Midpoint Split Button - Click to create an intersection card right in the middle */}
                <g
                  className="pointer-events-auto cursor-pointer group/mid"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSplitConnection(conn, midX, midY);
                  }}
                >
                  <title>Clique para criar um card de intersecção no meio deste caminho</title>
                  <circle
                    cx={midX}
                    cy={midY}
                    r="12"
                    fill="#0c0e15"
                    stroke={conn.color || '#ec4899'}
                    strokeWidth="2"
                    className="transition-transform group-hover/mid:scale-135 drop-shadow-md"
                  />
                  <path
                    d={`M ${midX - 4} ${midY} L ${midX + 4} ${midY} M ${midX} ${midY - 4} L ${midX} ${midY + 4}`}
                    stroke="#ffffff"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
                </g>
              </g>
            );
          })}

          {/* Active Dragging Connection Live Line */}
          {dragConnection && (
            <g>
              <path
                d={`M ${dragConnection.startX} ${dragConnection.startY} C ${
                  dragConnection.startX + (dragConnection.fromSide === 'right' ? 80 : dragConnection.fromSide === 'left' ? -80 : 0)
                } ${
                  dragConnection.startY + (dragConnection.fromSide === 'bottom' ? 80 : dragConnection.fromSide === 'top' ? -80 : 0)
                }, ${dragConnection.currentX} ${dragConnection.currentY}, ${dragConnection.currentX} ${dragConnection.currentY}`}
                fill="none"
                stroke="#ec4899"
                strokeWidth="3.5"
                strokeDasharray="6,6"
                strokeLinecap="round"
                filter="url(#glow)"
              />
              <circle cx={dragConnection.startX} cy={dragConnection.startY} r="5" fill="#ec4899" />
              <circle cx={dragConnection.currentX} cy={dragConnection.currentY} r="6" fill="#fff" stroke="#ec4899" strokeWidth="2.5" />
            </g>
          )}
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
            const isConnecting = connectingFromId === node.id || (dragConnection && dragConnection.fromNodeId !== node.id);
            const catInfo = CATEGORY_COLORS[node.category] || CATEGORY_COLORS.core;

            return (
              <div
                key={node.id}
                onMouseDown={(e) => handleStartDragNode(e, node.id)}
                onMouseUp={() => {
                  if (dragConnection && dragConnection.fromNodeId !== node.id) {
                    handleEndConnectionOnTarget(node.id);
                  }
                }}
                className={`mind-map-node group pointer-events-auto absolute w-[224px] rounded-xl border p-3.5 transition-shadow cursor-pointer select-none ${
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
                {/* Top (+) Button */}
                <button
                  type="button"
                  onMouseDown={(e) => handleStartHandleDrag(e, node, 'top')}
                  onMouseUp={(e) => handleMouseUpOnHandle(e, node, 'top')}
                  title="Arraste até outro nó para conectar, ou clique para criar acima"
                  className="absolute -top-3 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-zinc-950 hover:bg-pink-600 text-zinc-300 hover:text-white flex items-center justify-center shadow-xl border border-pink-500/70 hover:border-white text-xs transition-all hover:scale-125 cursor-crosshair z-30 group/btn"
                >
                  <Plus className="w-3.5 h-3.5 group-hover/btn:rotate-90 transition-transform" />
                </button>

                {/* Bottom (+) Button */}
                <button
                  type="button"
                  onMouseDown={(e) => handleStartHandleDrag(e, node, 'bottom')}
                  onMouseUp={(e) => handleMouseUpOnHandle(e, node, 'bottom')}
                  title="Arraste até outro nó para conectar, ou clique para criar abaixo"
                  className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-zinc-950 hover:bg-pink-600 text-zinc-300 hover:text-white flex items-center justify-center shadow-xl border border-pink-500/70 hover:border-white text-xs transition-all hover:scale-125 cursor-crosshair z-30 group/btn"
                >
                  <Plus className="w-3.5 h-3.5 group-hover/btn:rotate-90 transition-transform" />
                </button>

                {/* Left (+) Button */}
                <button
                  type="button"
                  onMouseDown={(e) => handleStartHandleDrag(e, node, 'left')}
                  onMouseUp={(e) => handleMouseUpOnHandle(e, node, 'left')}
                  title="Arraste até outro nó para conectar, ou clique para criar à esquerda"
                  className="absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-zinc-950 hover:bg-pink-600 text-zinc-300 hover:text-white flex items-center justify-center shadow-xl border border-pink-500/70 hover:border-white text-xs transition-all hover:scale-125 cursor-crosshair z-30 group/btn"
                >
                  <Plus className="w-3.5 h-3.5 group-hover/btn:rotate-90 transition-transform" />
                </button>

                {/* Right (+) Button */}
                <button
                  type="button"
                  onMouseDown={(e) => handleStartHandleDrag(e, node, 'right')}
                  onMouseUp={(e) => handleMouseUpOnHandle(e, node, 'right')}
                  title="Arraste até outro nó para conectar, ou clique para criar à direita"
                  className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-zinc-950 hover:bg-pink-600 text-zinc-300 hover:text-white flex items-center justify-center shadow-xl border border-pink-500/70 hover:border-white text-xs transition-all hover:scale-125 cursor-crosshair z-30 group/btn"
                >
                  <Plus className="w-3.5 h-3.5 group-hover/btn:rotate-90 transition-transform" />
                </button>

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

                {/* Linked Editor Module Badge */}
                {node.editorLink ? (
                  (() => {
                    const meta = getEditorMeta(node.editorLink.editorId);
                    return (
                      <div
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedNodeId(node.id);
                          setSearchModalNodeId(node.id);
                          setCatalogFilterEditorId(node.editorLink?.editorId || 'all');
                        }}
                        className={`mt-2 px-2 py-1 rounded-lg border ${meta.bgColor} ${meta.borderColor} flex items-center justify-between gap-1 transition-all hover:scale-[1.02] cursor-pointer group/badge shadow-sm`}
                        title="Módulo vinculado. Clique para alterar ou ver detalhes."
                      >
                        <div className="flex items-center gap-1.5 truncate">
                          <span className="text-xs">{meta.icon}</span>
                          <div className="truncate">
                            <span className="text-[10px] font-bold text-white block truncate leading-tight">
                              {node.editorLink.itemLabel}
                            </span>
                            {node.editorLink.actionTrigger && (
                              <span className="text-[8px] text-zinc-400 block truncate leading-tight">
                                ⚡ {node.editorLink.actionTrigger}
                              </span>
                            )}
                          </div>
                        </div>
                        <span className="text-[9px] text-zinc-400 group-hover/badge:text-white shrink-0">▾</span>
                      </div>
                    );
                  })()
                ) : (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedNodeId(node.id);
                      setSearchModalNodeId(node.id);
                      setCatalogFilterEditorId('all');
                    }}
                    className="mt-2 w-full py-1 px-2 rounded-lg border border-dashed border-zinc-700 hover:border-pink-500/70 bg-black/30 hover:bg-pink-950/20 text-zinc-400 hover:text-pink-300 text-[9px] font-medium flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                    title="Vincular conteúdo de outros editores (Fases, Eventos, NPCs, Cenários, Mobbys, Cards...)"
                  >
                    <Link2 className="w-2.5 h-2.5" />
                    <span>+ Vincular Módulo</span>
                  </button>
                )}
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

              {/* Linked Editor Module Section (Cascading Selectors) */}
              <div className="p-3 rounded-xl bg-zinc-900/90 border border-zinc-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Link2 className="w-3.5 h-3.5 text-pink-400" />
                    <span className="text-[11px] font-bold text-white uppercase tracking-wider">
                      Módulo & Conteúdo Integrado
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSearchModalNodeId(selectedNode.id);
                      setCatalogFilterEditorId(selectedNode.editorLink?.editorId || 'all');
                    }}
                    className="px-2 py-0.5 rounded bg-pink-600/20 hover:bg-pink-600/40 text-pink-300 text-[10px] font-medium flex items-center gap-1 transition-colors cursor-pointer"
                    title="Abrir Catálogo de Busca Rápida com Todos os Editores"
                  >
                    <Search className="w-3 h-3" />
                    <span>Explorar</span>
                  </button>
                </div>

                {/* Sub-selector 1: Editor Principal */}
                <div>
                  <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">
                    1. Editor / Sistema
                  </label>
                  <select
                    value={selectedNode.editorLink?.editorId || ''}
                    onChange={(e) => {
                      const editorId = e.target.value;
                      if (!editorId) {
                        handleDetachEditorItem(selectedNode.id);
                        return;
                      }
                      const cat = EDITOR_CONTENT_CATALOG.find((c) => c.id === editorId);
                      if (cat && cat.subCategories.length > 0) {
                        const firstSub = cat.subCategories[0];
                        if (firstSub.items.length > 0) {
                          handleAttachEditorItem(
                            selectedNode.id,
                            firstSub.items[0],
                            cat.id,
                            firstSub.id,
                            selectedNode.editorLink?.actionTrigger
                          );
                        }
                      }
                    }}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-white focus:outline-none focus:border-pink-500 cursor-pointer"
                  >
                    <option value="">(Nenhum vínculo)</option>
                    {EDITOR_CONTENT_CATALOG.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.icon} {cat.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Sub-selector 2: Sub-Categoria (se houver editor selecionado) */}
                {selectedNode.editorLink && (
                  (() => {
                    const currentEditor = EDITOR_CONTENT_CATALOG.find(
                      (c) => c.id === selectedNode.editorLink?.editorId
                    );
                    if (!currentEditor) return null;

                    const currentSub = currentEditor.subCategories.find(
                      (s) => s.id === selectedNode.editorLink?.subCategory
                    ) || currentEditor.subCategories[0];

                    return (
                      <>
                        <div>
                          <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">
                            2. Categoria / Seção
                          </label>
                          <select
                            value={currentSub?.id || ''}
                            onChange={(e) => {
                              const subId = e.target.value;
                              const targetSub = currentEditor.subCategories.find((s) => s.id === subId);
                              if (targetSub && targetSub.items.length > 0) {
                                handleAttachEditorItem(
                                  selectedNode.id,
                                  targetSub.items[0],
                                  currentEditor.id,
                                  targetSub.id,
                                  selectedNode.editorLink?.actionTrigger
                                );
                              }
                            }}
                            className="w-full px-2.5 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-white focus:outline-none focus:border-pink-500 cursor-pointer"
                          >
                            {currentEditor.subCategories.map((sub) => (
                              <option key={sub.id} value={sub.id}>
                                {sub.icon} {sub.name}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Sub-selector 3: Item Específico */}
                        <div>
                          <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">
                            3. Item / Entidade Vinculada
                          </label>
                          <select
                            value={selectedNode.editorLink?.itemId || ''}
                            onChange={(e) => {
                              const itemId = e.target.value;
                              const targetItem = currentSub.items.find((it) => it.id === itemId);
                              if (targetItem) {
                                handleAttachEditorItem(
                                  selectedNode.id,
                                  targetItem,
                                  currentEditor.id,
                                  currentSub.id,
                                  selectedNode.editorLink?.actionTrigger
                                );
                              }
                            }}
                            className="w-full px-2.5 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-white focus:outline-none focus:border-pink-500 cursor-pointer font-medium"
                          >
                            {currentSub.items.map((it) => (
                              <option key={it.id} value={it.id}>
                                {it.icon} {it.label} [{it.badge}]
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Trigger / Condição de Ação */}
                        <div>
                          <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">
                            Gatilho / Ação no Fluxo (Opcional)
                          </label>
                          <input
                            type="text"
                            value={selectedNode.editorLink?.actionTrigger || ''}
                            onChange={(e) => handleUpdateTrigger(selectedNode.id, e.target.value)}
                            placeholder="Ex: Inicia ao vencer nó anterior, Recompensa 100g..."
                            className="w-full px-2.5 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-[11px] text-zinc-200 focus:outline-none focus:border-pink-500"
                          />
                        </div>

                        {/* Botões de Ação do Vínculo */}
                        <div className="flex items-center gap-1.5 pt-1">
                          <button
                            type="button"
                            onClick={() => handleSyncTitleWithEditorItem(selectedNode.id)}
                            className="flex-1 py-1 px-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 hover:text-white text-[10px] font-medium flex items-center justify-center gap-1 transition-colors cursor-pointer"
                            title="Atualizar título do card com o nome deste módulo"
                          >
                            <Sparkles className="w-3 h-3 text-amber-400" />
                            <span>Usar Como Título</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDetachEditorItem(selectedNode.id)}
                            className="py-1 px-2 rounded-lg bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 text-[10px] font-medium flex items-center gap-1 transition-colors cursor-pointer"
                            title="Remover vínculo deste card"
                          >
                            <Unlink className="w-3 h-3" />
                            <span>Desvincular</span>
                          </button>
                        </div>
                      </>
                    );
                  })()
                )}
              </div>
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

      {/* Galeria de Mapas Mentais Modal */}
      {isGalleryOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fadeIn">
          <div className="relative w-full max-w-4xl max-h-[85vh] bg-[#0c0e16] border border-zinc-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/60">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <FolderKanban className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white tracking-wide">Galeria de Mapas Mentais</h2>
                  <p className="text-xs text-zinc-400">Crie, alterne e gerencie diferentes diagramas e mapas conceituais do Slimeslands</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCreateNewGalleryMap}
                  className="px-3.5 py-1.5 rounded-lg bg-pink-600 hover:bg-pink-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-lg shadow-pink-600/20 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Novo Mapa Mental</span>
                </button>
                <button
                  onClick={() => setIsGalleryOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Content - Grid of Maps */}
            <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {galleryList.map((mapRecord) => {
                const isActive = mapRecord.id === activeMapId;
                const dateStr = new Date(mapRecord.updatedAt).toLocaleDateString('pt-BR', {
                  day: '2-digit',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit',
                });

                return (
                  <div
                    key={mapRecord.id}
                    className={`relative rounded-xl border p-4 flex flex-col justify-between transition-all group ${
                      isActive
                        ? 'bg-zinc-900/90 border-pink-500 ring-1 ring-pink-500/50 shadow-xl shadow-pink-950/20'
                        : 'bg-zinc-900/40 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900/70'
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <h4 className="text-sm font-bold text-white group-hover:text-pink-300 transition-colors line-clamp-1">
                          {mapRecord.title}
                        </h4>
                        {isActive && (
                          <span className="px-2 py-0.5 rounded-full bg-pink-500/20 border border-pink-500/40 text-pink-300 text-[10px] font-bold shrink-0">
                            Ativo
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3 text-xs text-zinc-400 mb-4">
                        <span className="flex items-center gap-1">
                          <Layers className="w-3.5 h-3.5 text-zinc-500" />
                          {mapRecord.nodeCount} nós
                        </span>
                        <span className="flex items-center gap-1">
                          <Share2 className="w-3.5 h-3.5 text-zinc-500" />
                          {mapRecord.connectionCount} conexões
                        </span>
                      </div>

                      <div className="flex items-center gap-1 text-[11px] text-zinc-500 mb-4">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{dateStr}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-3 border-t border-zinc-800/80">
                      <button
                        onClick={() => handleOpenGalleryMap(mapRecord)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                          isActive
                            ? 'bg-pink-600/30 text-pink-200 border border-pink-500/30'
                            : 'bg-zinc-800 hover:bg-pink-600 text-zinc-200 hover:text-white'
                        }`}
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>{isActive ? 'Ativo' : 'Carregar'}</span>
                      </button>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleDuplicateGalleryMap(mapRecord)}
                          className="p-1.5 rounded-lg bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-colors cursor-pointer"
                          title="Duplicar Mapa"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        {galleryList.length > 1 && (
                          <button
                            onClick={() => handleDeleteGalleryMap(mapRecord.id)}
                            className="p-1.5 rounded-lg bg-zinc-800/80 hover:bg-rose-950/60 text-zinc-400 hover:text-rose-300 transition-colors cursor-pointer"
                            title="Excluir Mapa"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3 border-t border-zinc-800 bg-zinc-900/40 flex items-center justify-between text-xs text-zinc-400">
              <span>{galleryList.length} mapa(s) sincronizados no armazenamento local</span>
              <button
                onClick={() => {
                  const newRecord: SavedMapRecord = {
                    id: `map-${Date.now()}`,
                    title: `${data.title} (Cópia Nova)`,
                    nodeCount: data.nodes.length,
                    connectionCount: data.connections.length,
                    updatedAt: Date.now(),
                    data: JSON.parse(JSON.stringify(data)),
                  };
                  setGalleryList((prev) => [newRecord, ...prev]);
                  showToast('Mapa atual salvo como nova entrada na galeria!');
                }}
                className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white font-medium transition-colors cursor-pointer border border-zinc-700"
              >
                Salvar Cópia do Mapa Atual
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Seleção Rápida & Catálogo Completo de Módulos (Todos os Editores) */}
      {searchModalNodeId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fadeIn">
          <div className="relative w-full max-w-4xl max-h-[85vh] bg-[#0c0e16] border border-zinc-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-zinc-800 bg-zinc-900/70 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-pink-500/10 border border-pink-500/30 flex items-center justify-center text-pink-400">
                  <Compass className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white tracking-wide">
                    Catálogo de Módulos & Editores do Slimeslands
                  </h2>
                  <p className="text-xs text-zinc-400">
                    Selecione qualquer elemento de fases, mobbys, arsenal, loja, som ou cenários para vincular a{' '}
                    <span className="text-pink-300 font-semibold">
                      "{data.nodes.find((n) => n.id === searchModalNodeId)?.title}"
                    </span>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSearchModalNodeId(null)}
                className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Search Bar & Filter Tabs */}
            <div className="p-4 border-b border-zinc-800 bg-zinc-950/60 space-y-3">
              <div className="relative">
                <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={catalogSearchQuery}
                  onChange={(e) => setCatalogSearchQuery(e.target.value)}
                  placeholder="Pesquise por nome, mobby, boss, booster, poção, cenário, som, arma, evento..."
                  className="w-full pl-10 pr-16 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-pink-500"
                />
                {catalogSearchQuery && (
                  <button
                    onClick={() => setCatalogSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white text-xs px-1.5 py-0.5 rounded bg-zinc-800"
                  >
                    Limpar
                  </button>
                )}
              </div>

              {/* Category Filter Pills (All 17 Modules) */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
                <button
                  type="button"
                  onClick={() => setCatalogFilterEditorId('all')}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                    catalogFilterEditorId === 'all'
                      ? 'bg-pink-600 text-white'
                      : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  🌐 Todos ({filteredCatalogItems.length})
                </button>
                {EDITOR_CONTENT_CATALOG.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCatalogFilterEditorId(cat.id)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1.5 cursor-pointer ${
                      catalogFilterEditorId === cat.id
                        ? `${cat.bgColor} ${cat.borderColor} border ${cat.textColor}`
                        : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    <span>{cat.icon}</span>
                    <span>{cat.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Results Grid */}
            <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredCatalogItems.length === 0 ? (
                <div className="col-span-full py-16 text-center text-zinc-500 space-y-2">
                  <Search className="w-8 h-8 mx-auto text-zinc-600" />
                  <p className="text-sm font-semibold">Nenhum módulo encontrado</p>
                  <p className="text-xs">Tente pesquisar com outro termo ou selecione a categoria "Todos".</p>
                </div>
              ) : (
                filteredCatalogItems.map(({ editorId, editorName, editorIcon, editorColor, subCatId, subCatName, item }) => (
                  <div
                    key={`${editorId}-${subCatId}-${item.id}`}
                    className="p-3.5 rounded-xl border border-zinc-800 bg-zinc-900/50 hover:bg-zinc-900 hover:border-zinc-700 transition-all flex flex-col justify-between group"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1">
                          <span>{editorIcon}</span>
                          <span>{subCatName}</span>
                        </span>
                        <span className="px-1.5 py-0.5 rounded text-[8px] bg-white/5 border border-white/10 text-zinc-300 font-mono">
                          {item.badge}
                        </span>
                      </div>

                      <h4 className="text-xs font-bold text-white group-hover:text-pink-300 transition-colors flex items-center gap-1.5 mb-1">
                        <span>{item.icon}</span>
                        <span className="line-clamp-1">{item.label}</span>
                      </h4>

                      <p className="text-[10px] text-zinc-400 line-clamp-2 leading-relaxed mb-3">
                        {item.description}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleAttachEditorItem(searchModalNodeId, item, editorId, subCatId)}
                      className="w-full py-1.5 rounded-lg bg-zinc-800 hover:bg-pink-600 text-zinc-200 hover:text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-sm"
                    >
                      <Link2 className="w-3.5 h-3.5" />
                      <span>Vincular a este Card</span>
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3 border-t border-zinc-800 bg-zinc-900/40 flex items-center justify-between text-xs text-zinc-400">
              <span>{filteredCatalogItems.length} item(ns) disponíveis no catálogo do jogo</span>
              <button
                type="button"
                onClick={() => setSearchModalNodeId(null)}
                className="px-3 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white font-medium transition-colors cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
