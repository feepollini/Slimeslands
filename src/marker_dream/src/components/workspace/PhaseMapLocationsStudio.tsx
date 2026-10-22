import React, { useState } from 'react';
import type { MapProject, SavedLevel, WorldMapPOI } from '../../types/map';
import {
  Compass,
  MapPin,
  ExternalLink,
  Plus,
  Link,
  CheckCircle2,
  Lock,
  ArrowRight,
  Sparkles,
  ShieldAlert,
  Layers,
} from 'lucide-react';
import { getOrCreateWorldMapConfig } from './WorldMapCanvasEditor';

interface PhaseMapLocationsStudioProps {
  project: MapProject;
  setProject: React.Dispatch<React.SetStateAction<MapProject>>;
  activeLevelId: string | null;
  savedLevels: SavedLevel[];
  onOpenSoloMapEditor?: () => void;
  onAddMarkerAt?: (x: number, y: number, biomeId?: string) => void;
  showToast?: (msg: string) => void;
}

export const PhaseMapLocationsStudio: React.FC<PhaseMapLocationsStudioProps> = ({
  project,
  setProject,
  activeLevelId,
  savedLevels,
  onOpenSoloMapEditor,
  onAddMarkerAt,
  showToast,
}) => {
  const worldMap = getOrCreateWorldMapConfig(project);
  const activeLevel = savedLevels.find((l) => l.id === activeLevelId);
  const activePhaseName = project.title || activeLevel?.name || 'Fase Atual';

  // Verifica se há algum POI no mapa múndi vinculado a esta fase
  const linkedPoi = worldMap.pointsOfInterest.find(
    (poi) => poi.targetLevelId === activeLevelId || poi.targetLevelName === activePhaseName
  );

  // Vincula esta fase a um POI existente
  const handleLinkToPoi = (poiId: string) => {
    const updatedList = worldMap.pointsOfInterest.map((p) => {
      if (p.id === poiId) {
        return {
          ...p,
          targetLevelId: activeLevelId || undefined,
          targetLevelName: activePhaseName,
        };
      }
      // Se outro POI estava vinculado a esta mesma fase, desvincula
      if (p.targetLevelId === activeLevelId) {
        return { ...p, targetLevelId: undefined, targetLevelName: undefined };
      }
      return p;
    });

    setProject((prev) => ({
      ...prev,
      worldMap: {
        ...worldMap,
        pointsOfInterest: updatedList,
      },
    }));
    showToast?.('✓ Fase vinculada à localização no Mapa!');
  };

  // Cria um novo POI no Mapa Múndi para esta fase
  const handleCreatePoiForPhase = () => {
    const newId = `poi-level-${Date.now()}`;
    const newPoi: WorldMapPOI = {
      id: newId,
      name: activePhaseName,
      description: `Localização correspondente à fase "${activePhaseName}".`,
      x: Math.round((worldMap.mapWidth || 1600) / 2 + (Math.random() - 0.5) * 400),
      y: Math.round((worldMap.mapHeight || 667) / 2 + (Math.random() - 0.5) * 200),
      iconEmoji: '🏰',
      iconType: 'castle',
      status: 'unlocked',
      badgeText: `Fase ${worldMap.pointsOfInterest.length + 1}`,
      targetLevelId: activeLevelId || undefined,
      targetLevelName: activePhaseName,
      scale: 1.1,
    };

    setProject((prev) => ({
      ...prev,
      worldMap: {
        ...worldMap,
        pointsOfInterest: [...worldMap.pointsOfInterest, newPoi],
      },
    }));
    showToast?.('✨ Nova localização criada no Mapa Múndi para esta fase!');
  };

  return (
    <div className="space-y-6 text-zinc-300">
      {/* Banner de Introdução da Aba Mapa na Fase */}
      <div className="p-4 rounded-xl bg-gradient-to-br from-amber-500/10 via-zinc-900 to-zinc-950 border border-amber-500/30 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-amber-400">
            <Compass className="w-5 h-5" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-white">
              Localização & Destinos no Mapa
            </h4>
          </div>
          {onOpenSoloMapEditor && (
            <button
              type="button"
              onClick={onOpenSoloMapEditor}
              className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-black text-[11px] font-extrabold flex items-center gap-1 transition-colors cursor-pointer shadow-sm active:scale-95"
              title="Abrir o Editor Solo do Mapa Múndi Completo"
            >
              <span>Abrir Editor Solo</span>
              <ExternalLink className="w-3 h-3" />
            </button>
          )}
        </div>
        <p className="text-xs text-zinc-400 leading-relaxed">
          Esta tela/fase pode ser associada a um ponto no mapa global do jogo e definir quais destinos os jogadores desbloqueiam ao completar ou encontrar portais aqui.
        </p>
      </div>

      {/* 1. Localização no Mapa que Representa Esta Fase */}
      <div className="space-y-3 p-4 bg-zinc-900/80 rounded-xl border border-zinc-800">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-amber-400" />
            <span>Ponto no Mapa Desta Fase</span>
          </span>
          {linkedPoi && (
            <span className="text-[10px] text-emerald-400 font-mono font-bold">
              ✓ Vinculado
            </span>
          )}
        </div>

        {linkedPoi ? (
          <div className="p-3 bg-zinc-850 rounded-xl border border-emerald-500/40 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-700 flex items-center justify-center shrink-0">
                {linkedPoi.iconPng ? (
                  <img src={linkedPoi.iconPng} alt="" className="w-6 h-6 object-contain" />
                ) : (
                  <span className="text-xl">{linkedPoi.iconEmoji || '📍'}</span>
                )}
              </div>
              <div>
                <span className="text-xs font-bold text-white block">{linkedPoi.name}</span>
                <span className="text-[10px] text-zinc-400">
                  {linkedPoi.badgeText ? `${linkedPoi.badgeText} • ` : ''}Coordenadas ({linkedPoi.x}, {linkedPoi.y})
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => handleLinkToPoi('')}
              className="text-[11px] text-zinc-400 hover:text-rose-400 underline cursor-pointer"
            >
              Desvincular
            </button>
          </div>
        ) : (
          <div className="p-3 bg-zinc-850 rounded-xl border border-dashed border-zinc-750 text-center space-y-2">
            <p className="text-xs text-zinc-400">
              Esta fase ainda não está vinculada a nenhum local do mapa múndi.
            </p>
            <div className="flex items-center justify-center gap-2 pt-1">
              <button
                type="button"
                onClick={handleCreatePoiForPhase}
                className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-sm transition-colors"
              >
                <Plus className="w-3.5 h-3.5 stroke-[3]" />
                <span>Criar Ponto no Mapa para Esta Fase</span>
              </button>
            </div>
          </div>
        )}

        {/* Selecionar de POIs Existentes */}
        <div className="space-y-1.5 pt-2">
          <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
            Ou associar a um local existente do mapa:
          </label>
          <select
            value={linkedPoi?.id || ''}
            onChange={(e) => handleLinkToPoi(e.target.value)}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-amber-400"
          >
            <option value="">-- Escolha um local do mapa --</option>
            {worldMap.pointsOfInterest.map((p) => (
              <option key={p.id} value={p.id}>
                📍 {p.name} {p.targetLevelName ? `(Já vinculado a ${p.targetLevelName})` : ''}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 2. Destinos e Rotas que esta Fase Conecta */}
      <div className="space-y-3 p-4 bg-zinc-900/80 rounded-xl border border-zinc-800">
        <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
          <ArrowRight className="w-3.5 h-3.5 text-cyan-400" />
          <span>Destinos de Viagem e Eventos</span>
        </span>
        <p className="text-xs text-zinc-400 leading-relaxed">
          Locais disponíveis no mapa múndi para onde o herói pode viajar ao concluir os objetivos desta tela ou interagir com portais.
        </p>

        <div className="space-y-2">
          {worldMap.pointsOfInterest
            .filter((p) => p.id !== linkedPoi?.id)
            .map((poi) => (
              <div
                key={poi.id}
                className="p-2.5 rounded-xl bg-zinc-850 border border-zinc-750 flex items-center justify-between gap-3 text-xs"
              >
                <div className="flex items-center gap-2.5 truncate">
                  <div className="w-7 h-7 rounded-lg bg-zinc-800 flex items-center justify-center shrink-0">
                    {poi.iconPng ? (
                      <img src={poi.iconPng} alt="" className="w-4 h-4 object-contain" />
                    ) : (
                      <span>{poi.iconEmoji || '📍'}</span>
                    )}
                  </div>
                  <div className="truncate">
                    <span className="font-semibold text-white block truncate">{poi.name}</span>
                    <span className="text-[10px] text-zinc-400 font-mono">
                      {poi.badgeText || 'Destino'} • ({poi.x}, {poi.y})
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <span
                    className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                      poi.status === 'locked'
                        ? 'bg-zinc-800 text-zinc-400'
                        : poi.status === 'completed'
                        ? 'bg-amber-500/20 text-amber-300'
                        : 'bg-emerald-500/20 text-emerald-400'
                    }`}
                  >
                    {poi.status === 'locked' ? 'Bloqueado' : poi.status === 'completed' ? 'Concluído' : 'Aberto'}
                  </span>

                  <button
                    type="button"
                    onClick={() => {
                      const spawnX = project.player?.x || 384;
                      const spawnY = (project.player?.y || 100) + 120;
                      const newMarker: any = {
                        id: `portal-${Date.now()}`,
                        name: `Portal para ${poi.name}`,
                        description: `Gatilho de teleporte / viagem para o local "${poi.name}" no Mapa Múndi.`,
                        type: 'travel',
                        color: '#a855f7',
                        status: 'active',
                        x: spawnX,
                        y: spawnY,
                        size: 90,
                        travelAuto: true,
                        travelTargetType: 'level',
                      };
                      setProject((prev) => ({
                        ...prev,
                        markers: [...prev.markers, newMarker],
                      }));
                      showToast?.(`✨ Marcador de Portal para "${poi.name}" adicionado na tela!`);
                    }}
                    className="px-2 py-1 rounded-md bg-purple-600/30 hover:bg-purple-600/50 border border-purple-500/50 text-[10px] font-bold text-purple-200 transition-colors cursor-pointer flex items-center gap-1 active:scale-95"
                    title="Adicionar marcador de portal/destino para este local na fase"
                  >
                    <Plus className="w-2.5 h-2.5 stroke-[3]" />
                    <span>Inserir Portal</span>
                  </button>
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
};
