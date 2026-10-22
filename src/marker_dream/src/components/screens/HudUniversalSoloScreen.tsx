import React, { useState, useRef } from 'react';
import {
  Smartphone,
  ArrowLeft,
  Play,
  Layers,
  Sparkles,
  CheckCircle2,
  Move,
  Globe,
  Sliders,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  ZoomIn,
  Columns,
  GripVertical,
  RotateCcw,
} from 'lucide-react';
import { MapProject, SavedLevel } from '../../types/map';
import {
  ScreensStudio,
  getOrCreateScreensConfig,
  saveUniversalScreensConfig,
} from './ScreensStudio';
import { PortraitEmulator } from '../PortraitEmulator';

interface HudUniversalSoloScreenProps {
  project: MapProject;
  setProject: React.Dispatch<React.SetStateAction<MapProject>>;
  savedLevels: SavedLevel[];
  onSyncHudToAllLevels?: (screensConfig: import('../../types/map').ProjectScreensConfig) => void;
  onGoToDashboard: () => void;
  onGoToEditor: () => void;
  onPlayLevel: () => void;
  showToast?: (msg: string) => void;
}

export const HudUniversalSoloScreen: React.FC<HudUniversalSoloScreenProps> = ({
  project,
  setProject,
  savedLevels,
  onSyncHudToAllLevels,
  onGoToDashboard,
  onGoToEditor,
  onPlayLevel,
  showToast,
}) => {
  const initialScreensConfig = getOrCreateScreensConfig(project);
  const [previewOrientation, setPreviewOrientation] = useState<'portrait' | 'landscape'>(() => {
    return initialScreensConfig.activeScreenId === 'screen_player_hud_landscape' ? 'landscape' : 'portrait';
  });
  React.useEffect(() => {
    const activeId = project.screensConfig?.activeScreenId;
    if (activeId === 'screen_player_hud_landscape') {
      setPreviewOrientation('landscape');
    } else if (activeId === 'screen_player_hud') {
      setPreviewOrientation('portrait');
    }
  }, [project.screensConfig?.activeScreenId]);
  const [testSpawnTriggerId, setTestSpawnTriggerId] = useState<number | undefined>(undefined);
  const [isPanelCollapsed, setIsPanelCollapsed] = useState(false);
  const [isEmulatorCollapsed, setIsEmulatorCollapsed] = useState(false);
  const [splitPercent, setSplitPercent] = useState<number>(62);
  const [emulatorZoom, setEmulatorZoom] = useState<'100' | '120' | '135' | '150'>('120');
  const isDraggingRef = useRef(false);

  const handleDragStart = (e: React.MouseEvent) => {
    e.preventDefault();
    isDraggingRef.current = true;
    const startX = e.clientX;
    const initialPercent = splitPercent;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!isDraggingRef.current) return;
      const deltaX = moveEvent.clientX - startX;
      const windowWidth = window.innerWidth;
      const deltaPercent = (deltaX / windowWidth) * 100;
      const nextPercent = Math.min(Math.max(initialPercent + deltaPercent, 25), 85);
      setSplitPercent(Math.round(nextPercent));
    };

    const handleMouseUp = () => {
      isDraggingRef.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const screensConfig = getOrCreateScreensConfig(project);
  const isInlineEditing = !!screensConfig.isInlineEditing;

  const handleToggleInlineDrag = () => {
    const cur = getOrCreateScreensConfig(project);
    const nextInline = !cur.isInlineEditing;
    const updated = {
      ...cur,
      isInlineEditing: nextInline,
    };
    saveUniversalScreensConfig(updated);
    setProject((prev) => ({
      ...prev,
      screensConfig: updated,
    }));
    showToast?.(
      nextInline
        ? '🖐️ Modo Posicionar no Emulador ATIVO! Arraste qualquer elemento do HUD na tela à direita.'
        : '✅ Posições do HUD Mestre salvas universalmente!'
    );
  };

  const handleApplyUniversalToAllPhases = () => {
    const cur = getOrCreateScreensConfig(project);
    saveUniversalScreensConfig(cur);
    onSyncHudToAllLevels?.(cur);
    showToast?.(
      `🌐 HUD Mestre Universal sincronizado em todas as ${savedLevels.length} fases do jogo!`
    );
  };

  return (
    <div className="h-screen w-screen bg-slate-950 text-white flex flex-col overflow-hidden select-none">
      {/* Barra Superior do Estúdio Universal de HUD & Telas Mestre */}
      <header className="px-5 py-2.5 bg-black/95 border-b border-slate-800 flex items-center justify-between gap-4 shrink-0 z-30">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onGoToDashboard}
            className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-bold text-slate-200 flex items-center gap-1.5 cursor-pointer transition-all"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-cyan-400" />
            <span>Dashboard</span>
          </button>

          <div className="h-5 w-[1px] bg-slate-800" />

          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500 via-indigo-600 to-purple-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
              <Smartphone className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-black text-white tracking-tight">
                  Editor Universal de HUD &amp; Telas Mestre
                </h1>
                <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 border border-cyan-500/40 text-[10px] font-mono font-bold text-cyan-300 flex items-center gap-1">
                  <Globe className="w-3 h-3" />
                  <span>Universal • Vale para Todas as Fases</span>
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Configure Joystick, Header PV/EXP, Barra Vidro (6 Ícones), Quests Retráteis (◀) e Barras Deslizantes Empilhadas de Coleta em um único lugar mestre.
              </p>
            </div>
          </div>
        </div>

        {/* Ações Rápidas do Editor Mestre */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => {
              const nextOrientation = previewOrientation === 'portrait' ? 'landscape' : 'portrait';
              setPreviewOrientation(nextOrientation);
              const cur = getOrCreateScreensConfig(project);
              const nextScreenId =
                nextOrientation === 'landscape'
                  ? 'screen_player_hud_landscape'
                  : 'screen_player_hud';
              const updated = { ...cur, activeScreenId: nextScreenId };
              saveUniversalScreensConfig(updated);
              setProject((prev) => ({ ...prev, screensConfig: updated }));
            }}
            className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-bold text-amber-300 flex items-center gap-1.5 cursor-pointer transition-all"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>
              Simulador: {previewOrientation === 'landscape' ? '▭ Paisagem (16:9)' : '📱 Retrato (9:16)'}
            </span>
          </button>

          <button
            type="button"
            onClick={handleToggleInlineDrag}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer transition-all border ${
              isInlineEditing
                ? 'bg-emerald-500 text-slate-950 border-emerald-300 shadow-lg shadow-emerald-500/25'
                : 'bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-200 border-indigo-500/40'
            }`}
          >
            <Move className="w-3.5 h-3.5" />
            <span>
              {isInlineEditing ? '✓ Concluir Posicionamento Inline' : 'Arrastar Elementos no Emulador'}
            </span>
          </button>

          <button
            type="button"
            onClick={handleApplyUniversalToAllPhases}
            className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white text-xs font-black flex items-center gap-1.5 cursor-pointer shadow-lg shadow-cyan-500/20 transition-all"
            title="Aplicar este HUD Mestre em todas as fases salvas do projeto"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Sincronizar em Todas as Fases ({savedLevels.length})</span>
          </button>

          <button
            type="button"
            onClick={onGoToEditor}
            className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-bold text-slate-200 flex items-center gap-1.5 cursor-pointer"
          >
            <Layers className="w-3.5 h-3.5 text-orange-400" />
            <span>Editor de Fase</span>
          </button>

          {/* Presets de Proporção da Tela (Menu vs Emulador) */}
          <div className="flex items-center gap-1 bg-slate-900/90 border border-slate-800 p-1 rounded-xl text-xs">
            <span className="text-[10.5px] font-bold text-slate-400 px-1.5 flex items-center gap-1 font-mono uppercase">
              <Columns className="w-3 h-3 text-cyan-400" /> Layout:
            </span>
            <button
              type="button"
              onClick={() => {
                setIsPanelCollapsed(false);
                setIsEmulatorCollapsed(false);
                setSplitPercent(65);
              }}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-black cursor-pointer transition-all ${
                splitPercent >= 62 && !isPanelCollapsed && !isEmulatorCollapsed
                  ? 'bg-cyan-500 text-slate-950 shadow-sm font-black'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
              title="Menu Amplo: 65% da tela para configurar o HUD com máxima folga em monitores wide"
            >
              🖥️ Menu Amplo (65%)
            </button>
            <button
              type="button"
              onClick={() => {
                setIsPanelCollapsed(false);
                setIsEmulatorCollapsed(false);
                setSplitPercent(50);
              }}
              className={`px-2 py-1 rounded-lg text-[11px] font-bold cursor-pointer transition-all ${
                splitPercent === 50 && !isPanelCollapsed && !isEmulatorCollapsed
                  ? 'bg-cyan-500 text-slate-950 shadow-sm font-black'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
              title="Equilibrado: 50% Menu e 50% Emulador"
            >
              ⚖️ 50 / 50
            </button>
            <button
              type="button"
              onClick={() => {
                setIsPanelCollapsed(false);
                setIsEmulatorCollapsed(false);
                setSplitPercent(38);
              }}
              className={`px-2 py-1 rounded-lg text-[11px] font-bold cursor-pointer transition-all ${
                splitPercent <= 40 && !isPanelCollapsed && !isEmulatorCollapsed
                  ? 'bg-cyan-500 text-slate-950 shadow-sm font-black'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
              title="Foco Emulador: 38% Menu e 62% Emulador"
            >
              📱 Foco Emulador
            </button>
            <button
              type="button"
              onClick={() => {
                setIsEmulatorCollapsed((prev) => !prev);
                setIsPanelCollapsed(false);
              }}
              className={`px-2 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-all border ${
                isEmulatorCollapsed
                  ? 'bg-amber-500 text-slate-950 border-amber-300 shadow-sm font-black'
                  : 'text-slate-400 hover:text-slate-200 border-transparent hover:bg-slate-800'
              }`}
              title={isEmulatorCollapsed ? 'Exibir Emulador' : 'Ocultar Emulador (100% de tela para o Menu de Edição)'}
            >
              {isEmulatorCollapsed ? <PanelRightOpen className="w-3.5 h-3.5" /> : <PanelRightClose className="w-3.5 h-3.5" />}
              <span>{isEmulatorCollapsed ? 'Exibir Emulador' : '100% Menu'}</span>
            </button>
          </div>

          <button
            type="button"
            onClick={onPlayLevel}
            className="px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black flex items-center gap-1.5 cursor-pointer shadow-md"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Testar no Play</span>
          </button>
        </div>
      </header>

      {/* Corpo Principal: Esquerda = Menu Amplo de Customização | Direita = Palco do Emulador */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Coluna Esquerda: Menu de Telas & HUD Mestre com Largura Ampla */}
        <div
          style={{
            width: isPanelCollapsed ? '0px' : isEmulatorCollapsed ? '100%' : `${splitPercent}%`,
          }}
          className={`${
            isPanelCollapsed ? 'w-0 hidden' : 'flex'
          } shrink-0 h-full overflow-hidden border-r border-slate-800 bg-slate-900/60 flex-col transition-all duration-75 z-10`}
        >
          <ScreensStudio
            project={project}
            onUpdateProject={(updates) => setProject((prev) => ({ ...prev, ...updates }))}
            onSaveLevel={handleApplyUniversalToAllPhases}
            showToast={showToast}
            galleryAssets={project.galleryAssets || []}
          />
        </div>

        {/* Divisor Interativo Arrastável (Drag & Drop para Ajuste Fino) */}
        {!isPanelCollapsed && !isEmulatorCollapsed && (
          <div
            onMouseDown={handleDragStart}
            onDoubleClick={() => setSplitPercent(62)}
            className="w-2.5 hover:w-3 bg-slate-900 hover:bg-cyan-500/80 active:bg-cyan-400 cursor-col-resize select-none flex items-center justify-center transition-all group z-20 border-x border-slate-800/80 hover:border-cyan-400 shrink-0"
            title="Arraste para ajustar a largura do menu ou dê duplo clique para restaurar 62%"
          >
            <div className="h-10 w-1 rounded-full bg-slate-700 group-hover:bg-white group-active:bg-slate-950 transition-colors" />
          </div>
        )}

        {/* Coluna Direita: Emulador em Tempo Real com Espaço Ampliado & Zoom */}
        <div
          style={{
            width: isEmulatorCollapsed ? '0px' : isPanelCollapsed ? '100%' : `${100 - splitPercent}%`,
          }}
          className={`${
            isEmulatorCollapsed ? 'w-0 hidden' : 'flex'
          } flex-1 min-w-0 h-full bg-slate-950 flex-col items-center justify-between p-3 relative overflow-hidden transition-all duration-75`}
        >
          <div className="mb-2 flex items-center justify-between w-full px-3 py-1.5 rounded-xl bg-slate-900/80 border border-slate-800 backdrop-blur-sm shrink-0 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsPanelCollapsed((prev) => !prev)}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1.5 border border-slate-700 cursor-pointer shadow-xs transition-all"
                title={isPanelCollapsed ? 'Exibir Menu de Edição' : 'Recolher Menu (100% Emulador)'}
              >
                {isPanelCollapsed ? (
                  <PanelLeftOpen className="w-3.5 h-3.5 text-cyan-400" />
                ) : (
                  <PanelLeftClose className="w-3.5 h-3.5 text-amber-400" />
                )}
                <span>{isPanelCollapsed ? 'Exibir Menu' : 'Ocultar Menu'}</span>
              </button>

              <span className="text-slate-600">|</span>

              <span className="text-[11px] font-bold text-cyan-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Palco do Emulador ({previewOrientation === 'landscape' ? '16:9' : '9:16'})</span>
              </span>

              <span className="px-2 py-0.5 rounded-md bg-slate-800 text-[10px] font-mono text-slate-400 border border-slate-700">
                Menu: {splitPercent}%
              </span>
            </div>

            {/* Controles de Escala / Zoom do Emulador */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] text-slate-400 font-mono uppercase font-bold mr-1 flex items-center gap-1">
                <ZoomIn className="w-3 h-3 text-cyan-400" /> Escala:
              </span>
              {(['100', '120', '135', '150'] as const).map((z) => (
                <button
                  key={z}
                  type="button"
                  onClick={() => setEmulatorZoom(z)}
                  className={`px-2 py-0.5 rounded-lg text-[10.5px] font-black transition-all cursor-pointer ${
                    emulatorZoom === z
                      ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20 ring-1 ring-cyan-300'
                      : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700 hover:text-white'
                  }`}
                >
                  {z === '100' ? '100%' : z === '120' ? '120% ★' : z === '135' ? '135%' : '150% 🔍'}
                </button>
              ))}

              <span className="text-slate-600 ml-1">|</span>

              <button
                type="button"
                onClick={handleToggleInlineDrag}
                className={`px-2.5 py-1 rounded-lg text-xs font-black flex items-center gap-1 cursor-pointer transition-all border ${
                  isInlineEditing
                    ? 'bg-emerald-500 text-slate-950 border-emerald-300 shadow-md shadow-emerald-500/20'
                    : 'bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-200 border-indigo-500/40'
                }`}
              >
                <Move className="w-3 h-3" />
                <span>{isInlineEditing ? '✓ Concluir Arraste' : 'Arrastar HUD'}</span>
              </button>
            </div>
          </div>

          <div className="flex-1 flex items-center justify-center w-full overflow-auto p-2">
            <div
              className="transition-transform duration-200 flex items-center justify-center origin-center"
              style={{
                transform:
                  emulatorZoom === '150'
                    ? 'scale(1.5)'
                    : emulatorZoom === '135'
                    ? 'scale(1.35)'
                    : emulatorZoom === '120'
                    ? 'scale(1.2)'
                    : 'scale(1)',
              }}
            >
              <PortraitEmulator
                project={project}
                savedLevels={savedLevels}
                activeTab="screens"
                canvasView={project.canvasKind === 'extended' ? 'extended' : 'vertical'}
                activeMarkerId={null}
                onSelectMarker={() => {}}
                onTriggerImportPNG={() => {}}
                scrollTargetY={null}
                testDialogueMarkerId={null}
                onCloseDialogue={() => {}}
                onUpdatePlayer={(updates) =>
                  setProject((prev) => ({
                    ...prev,
                    player: prev.player ? { ...prev.player, ...updates } : (updates as any),
                  }))
                }
                onUpdateMarker={(markerId, updates) =>
                  setProject((prev) => ({
                    ...prev,
                    markers: prev.markers.map((m) =>
                      m.id === markerId ? { ...m, ...updates } : m
                    ),
                  }))
                }
                onUpdateProject={(updates) => {
                  if (updates.screensConfig) {
                    saveUniversalScreensConfig(updates.screensConfig);
                  }
                  setProject((prev) => ({ ...prev, ...updates }));
                }}
                testSpawnTriggerId={testSpawnTriggerId}
                orientation={previewOrientation}
                onToggleOrientation={() =>
                  setPreviewOrientation((o) => (o === 'portrait' ? 'landscape' : 'portrait'))
                }
              />
            </div>
          </div>

          <div className="text-[10px] text-slate-500 font-mono py-0.5">
            Emulador Interativo: teste movimentação no joystick, toque nos botões de ação e na setinha ◀ de Jornada.
          </div>
        </div>
      </div>
    </div>
  );
};
