import React, { useState, useRef, useEffect } from 'react';
import type { MapProject, SavedLevel, MapMarker, PlayerConfig } from '../../types/map';
import {
  Edit3,
  LayoutGrid,
  RotateCcw,
  Save,
  CheckCircle2,
  Smartphone,
  Globe,
  Sliders,
  Loader2,
  Gamepad2,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import { PortraitEmulator } from '../PortraitEmulator';
import { getOrCreateScreensConfig } from '../screens/ScreensStudio';

interface Props {
  project: MapProject;
  setProject: React.Dispatch<React.SetStateAction<MapProject>>;
  savedLevels: SavedLevel[];
  activeLevelId: string | null;
  activeLevelName: string;
  canvasView: 'vertical' | 'extended';
  hasUnsavedChanges: boolean;
  justSaved: boolean;
  isSavingLevel: boolean;
  testSpawnTriggerId: number | null;
  onTriggerSpawn: () => void;
  onUpdatePlayer: (updates: Partial<PlayerConfig>) => void;
  onUpdateMarker: (id: string, updates: Partial<MapMarker>) => void;
  onLoadLevel: (level: SavedLevel) => void;
  onQuickSaveLevel: () => void;
  onGoToEditor: () => void;
  onOpenLandscapeHudConfig: () => void;
  onGoToDashboard: () => void;
}

export const PhasePlayScreen: React.FC<Props> = ({
  project,
  setProject,
  savedLevels,
  activeLevelName,
  canvasView,
  hasUnsavedChanges,
  justSaved,
  isSavingLevel,
  testSpawnTriggerId,
  onTriggerSpawn,
  onUpdatePlayer,
  onUpdateMarker,
  onLoadLevel,
  onQuickSaveLevel,
  onGoToEditor,
  onOpenLandscapeHudConfig,
  onGoToDashboard,
}) => {
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('landscape');
  const [isWebMode, setIsWebMode] = useState<boolean>(false);
  const [isCinemaFull, setIsCinemaFull] = useState<boolean>(false);
  const [activeMarkerId, setActiveMarkerId] = useState<string | null>(null);

  const stageRef = useRef<HTMLElement>(null);
  const [stageSize, setStageSize] = useState<{ w: number; h: number }>({
    w: typeof window !== 'undefined' ? window.innerWidth : 1600,
    h: typeof window !== 'undefined' ? window.innerHeight - 48 : 900,
  });

  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const updateStageSize = () => {
      setStageSize({
        w: el.clientWidth || window.innerWidth,
        h: el.clientHeight || window.innerHeight - 48,
      });
    };
    updateStageSize();
    const ro = new ResizeObserver(updateStageSize);
    ro.observe(el);
    window.addEventListener('resize', updateStageSize);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', updateStageSize);
    };
  }, [isCinemaFull, orientation, isWebMode]);

  const screensConfig = getOrCreateScreensConfig(project);
  const landscapeScreen = screensConfig.screens.find(
    (s) => s.id === 'screen_player_hud_landscape'
  );
  const webCfg = landscapeScreen?.hudConfig?.webConfig || {
    enabled: true,
    hideJoystickInWeb: true,
    upKey: 'W',
    downKey: 'S',
    leftKey: 'A',
    rightKey: 'D',
    allowArrowKeys: true,
    showKeyBadges: true,
  };

  const handleSelectOrientation = (next: 'portrait' | 'landscape') => {
    setOrientation(next);
    if (next === 'portrait') {
      setIsWebMode(false);
    }
  };

  // Cálculo dinâmico de escala para ocupar o palco com máxima imersão
  const baseWidth = orientation === 'landscape' ? (isWebMode ? 780 : 804) : 399;
  const baseHeight = orientation === 'landscape' ? (isWebMode ? 440 : 476) : 703;
  const marginX = isWebMode ? (isCinemaFull ? 4 : 16) : 32;
  const marginY = isWebMode ? (isCinemaFull ? 4 : 16) : 24;

  const computedScale = Math.max(
    0.5,
    Math.min(
      (stageSize.w - marginX) / baseWidth,
      (stageSize.h - marginY) / baseHeight,
      3.5
    )
  );

  return (
    <div className="h-screen w-screen bg-black text-white flex flex-col select-none overflow-hidden font-sans relative">
      {/* Linha técnica superior em 4 cores */}
      {!isCinemaFull && (
        <div className="w-full h-[2px] flex shrink-0">
          <div className="h-full flex-1 bg-emerald-500" />
          <div className="h-full flex-1 bg-cyan-400" />
          <div className="h-full flex-1 bg-amber-500" />
          <div className="h-full flex-1 bg-indigo-500" />
        </div>
      )}

      {/* Barra Superior Compacta do Modo Play */}
      <header
        className={`px-4 py-1.5 bg-zinc-950/95 border-b border-zinc-850 flex items-center justify-between gap-3 shrink-0 z-40 transition-all ${
          isCinemaFull ? 'bg-zinc-950/80 backdrop-blur-md border-zinc-900/60 py-1' : ''
        }`}
      >
        {/* Esquerda: Identidade do Modo Play + Fase Ativa */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={onGoToDashboard}
            className="px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-semibold text-zinc-300 hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Voltar ao Dashboard de Fases"
          >
            <LayoutGrid className="w-3.5 h-3.5 text-orange-400" />
            <span>Dashboard</span>
          </button>

          <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-zinc-900 border border-emerald-500/40">
            <Gamepad2 className="w-3.5 h-3.5 text-emerald-400" />
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-400 font-bold">
                PLAY
              </span>
              <span className="text-xs font-bold text-white truncate max-w-[180px]">
                {activeLevelName}
              </span>
              {hasUnsavedChanges && (
                <span className="w-1.5 h-1.5 rounded-full bg-orange-400" title="Estado Modificado" />
              )}
            </div>
          </div>
        </div>

        {/* Centro: Seletor de Dispositivo (Retrato / Paisagem / Botão WEB + Imersão) */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 p-0.5 rounded-xl bg-zinc-900 border border-zinc-800">
            <button
              type="button"
              onClick={() => handleSelectOrientation('portrait')}
              className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                orientation === 'portrait'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
              title="Jogar em Dispositivo Retrato (Vertical)"
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>▯ Retrato</span>
            </button>

            <button
              type="button"
              onClick={() => {
                handleSelectOrientation('landscape');
                setIsWebMode(false);
              }}
              className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                orientation === 'landscape' && !isWebMode
                  ? 'bg-amber-500 text-slate-950 font-black shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
              title="Jogar em Dispositivo Paisagem (Horizontal com HUD Touch)"
            >
              <Smartphone className="w-3.5 h-3.5 -rotate-90" />
              <span>▭ Paisagem</span>
            </button>

            {/* Botão WEB exclusivo quando em Modo Paisagem */}
            {orientation === 'landscape' && webCfg.enabled !== false && (
              <button
                type="button"
                onClick={() => setIsWebMode((v) => !v)}
                className={`px-3.5 py-1 rounded-lg text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer ${
                  isWebMode
                    ? 'bg-cyan-400 text-slate-950 shadow-[0_0_16px_rgba(34,211,238,0.5)] ring-1 ring-cyan-200'
                    : 'bg-cyan-950/70 text-cyan-300 hover:bg-cyan-900 border border-cyan-500/40'
                }`}
                title="Ativar Modo WEB Imersivo: Remove bordas de celular, oculta o Joystick e ativa WASD + Teclas de Atalho"
              >
                <Globe className="w-3.5 h-3.5" />
                <span>
                  WEB ({webCfg.upKey || 'W'}
                  {webCfg.leftKey || 'A'}
                  {webCfg.downKey || 'S'}
                  {webCfg.rightKey || 'D'})
                </span>
              </button>
            )}
          </div>

          {orientation === 'landscape' && (
            <button
              type="button"
              onClick={onOpenLandscapeHudConfig}
              className="px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-cyan-500/30 text-[11px] font-semibold text-cyan-300 hover:text-cyan-200 flex items-center gap-1 transition-colors cursor-pointer"
              title="Abrir configuração de teclas do Modo WEB no painel de HUD da Tela Paisagem"
            >
              <Sliders className="w-3.5 h-3.5" />
              <span className="hidden xl:inline">Configurar Teclas WEB</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsCinemaFull((v) => !v)}
            className={`px-2.5 py-1 rounded-lg border text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer ${
              isCinemaFull
                ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
            }`}
            title="Alternar Imersão Máxima (Expandir até as bordas da tela)"
          >
            {isCinemaFull ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            <span className="hidden 2xl:inline">{Math.round(computedScale * 100)}%</span>
          </button>
        </div>

        {/* Direita: Reiniciar Spawn, Salvar Fase e Voltar ao Editor */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onTriggerSpawn}
            className="px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-semibold text-zinc-300 hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Reiniciar Spawn da Fase"
          >
            <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden md:inline">Reiniciar Spawn</span>
          </button>

          <button
            type="button"
            onClick={onQuickSaveLevel}
            disabled={isSavingLevel}
            className={`px-2.5 py-1 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
              justSaved
                ? 'bg-zinc-900 border-emerald-500 text-emerald-400'
                : hasUnsavedChanges
                ? 'bg-zinc-900 border-orange-500 text-orange-400 hover:bg-zinc-800'
                : 'bg-zinc-900 border-zinc-800 text-zinc-200 hover:bg-zinc-800'
            }`}
            title="Salvar estado/alterações na mesma fase ativa (Ctrl+S)"
          >
            {isSavingLevel ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-orange-400" />
            ) : justSaved ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <Save className="w-3.5 h-3.5 text-orange-400" />
            )}
            <span>{justSaved ? 'Salvo!' : 'Salvar Fase'}</span>
          </button>

          <button
            type="button"
            onClick={onGoToEditor}
            className="px-3.5 py-1 rounded-lg bg-orange-500 hover:bg-orange-400 text-black font-extrabold text-xs flex items-center gap-1.5 shadow-md transition-all cursor-pointer active:scale-95"
            title="Ir para o Editor em tempo real mantendo a mesma fase ativa"
          >
            <Edit3 className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Voltar ao Editor</span>
          </button>
        </div>
      </header>

      {/* Palco Principal do Jogo — Auto-escalado dinamicamente para preencher a tela com máxima imersão */}
      <main
        ref={stageRef}
        className="flex-1 relative flex items-center justify-center overflow-hidden bg-[radial-gradient(ellipse_at_center,_rgba(24,24,27,0.85)_0%,_rgba(0,0,0,1)_78%)]"
      >
        <div
          style={{
            transform: `scale(${computedScale})`,
            transformOrigin: 'center center',
          }}
          className="flex items-center justify-center transition-transform duration-150 will-change-transform"
        >
          <PortraitEmulator
            project={project}
            savedLevels={savedLevels}
            activeTab="editor"
            canvasView={canvasView}
            activeMarkerId={activeMarkerId}
            onSelectMarker={setActiveMarkerId}
            onUpdatePlayer={onUpdatePlayer}
            onLoadLevel={onLoadLevel}
            onUpdateMarker={onUpdateMarker}
            onUpdateProject={(updates) => setProject((prev) => ({ ...prev, ...updates }))}
            testSpawnTriggerId={testSpawnTriggerId}
            orientation={orientation}
            onToggleOrientation={handleSelectOrientation}
            isWebMode={isWebMode}
            onToggleWebMode={setIsWebMode}
            isPlayMode={true}
          />
        </div>

        {/* Botão Flutuante Rápido no Canto da Tela para Voltar ao Editor em Tempo Real */}
        <div className="fixed bottom-3 right-3 z-50 flex items-center gap-2">
          <button
            type="button"
            onClick={onGoToEditor}
            className="px-3.5 py-2 rounded-xl bg-zinc-950/85 hover:bg-zinc-950 border border-orange-500/80 text-white font-bold text-xs shadow-[0_8px_24px_rgba(0,0,0,0.85)] backdrop-blur-md flex items-center gap-1.5 cursor-pointer transition-all opacity-75 hover:opacity-100 hover:scale-105 active:scale-95"
            title="Alternar para o Editor da mesma fase em tempo real"
          >
            <Edit3 className="w-3.5 h-3.5 text-orange-400" />
            <span>Editar Fase em Tempo Real</span>
          </button>
        </div>
      </main>
    </div>
  );
};
