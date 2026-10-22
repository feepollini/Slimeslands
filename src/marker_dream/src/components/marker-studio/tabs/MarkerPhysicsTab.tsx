import React from 'react';
import { MapMarker } from '../../../types/map';
import { Shield } from 'lucide-react';

interface MarkerPhysicsTabProps {
  selectedMarker: MapMarker;
  onUpdateMarker: (id: string, updates: Partial<MapMarker>) => void;
}

export const MarkerPhysicsTab: React.FC<MarkerPhysicsTabProps> = ({
  selectedMarker,
  onUpdateMarker,
}) => {
  return (
    <div className="space-y-3">
      {/* Colisão física sólida com o herói */}
      <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-xs text-slate-200 font-bold flex items-center gap-1.5">
              <Shield className="w-4 h-4 text-emerald-400" />
              <span>Colisão Física Sólida</span>
            </span>
            <span className="text-[10px] text-slate-400">
              {selectedMarker.markerOff
                ? 'Desativada pelo modo Marcador OFF'
                : selectedMarker.solidCollision !== false
                ? 'Bloqueio ativo nos pés: o herói não atravessa'
                : 'Passagem livre: o herói pode passar por cima'}
            </span>
          </div>
          <button
            type="button"
            onClick={() =>
              onUpdateMarker(selectedMarker.id, {
                solidCollision: selectedMarker.solidCollision === false ? true : false,
              })
            }
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              selectedMarker.solidCollision !== false && !selectedMarker.markerOff
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                : 'bg-slate-850 text-slate-400 border border-slate-700'
            }`}
          >
            {selectedMarker.solidCollision !== false && !selectedMarker.markerOff ? '🛡️ Sólido' : 'Passável'}
          </button>
        </div>

        {selectedMarker.solidCollision !== false && !selectedMarker.markerOff && (
          <div className="space-y-2 pt-2 border-t border-slate-900">
            {/* Raio nos pés */}
            <div>
              <div className="flex items-center justify-between text-[10px] text-slate-300 mb-1">
                <span>Raio de Colisão na Base (Pés):</span>
                <span className="font-mono text-emerald-300 font-bold">
                  {Math.round((selectedMarker.collisionRadiusScale ?? 0.25) * 100)}% ({Math.round((selectedMarker.size || 44) * (selectedMarker.collisionRadiusScale ?? 0.25))}px)
                </span>
              </div>
              <input
                type="range"
                min={0.1}
                max={0.5}
                step={0.02}
                value={selectedMarker.collisionRadiusScale ?? 0.25}
                onChange={(e) =>
                  onUpdateMarker(selectedMarker.id, {
                    collisionRadiusScale: parseFloat(e.target.value),
                  })
                }
                className="w-full accent-emerald-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
              />
              <div className="flex justify-between text-[8px] text-slate-500 mt-0.5">
                <span>10% (Justo)</span>
                <span>25% (Padrão)</span>
                <span>50% (Amplo)</span>
              </div>
            </div>

            {/* Offset vertical da colisão */}
            <div>
              <div className="flex items-center justify-between text-[10px] text-slate-300 mb-1">
                <span>Ajuste Vertical da Colisão (Y):</span>
                <span className="font-mono text-emerald-300 font-bold">
                  {(selectedMarker.collisionBaseOffsetY || 0) > 0 ? `+${selectedMarker.collisionBaseOffsetY}px` : `${selectedMarker.collisionBaseOffsetY || 0}px`}
                </span>
              </div>
              <input
                type="range"
                min={-40}
                max={40}
                step={2}
                value={selectedMarker.collisionBaseOffsetY || 0}
                onChange={(e) =>
                  onUpdateMarker(selectedMarker.id, {
                    collisionBaseOffsetY: Number(e.target.value),
                  })
                }
                className="w-full accent-emerald-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
              />
              <div className="flex justify-between text-[8px] text-slate-500 mt-0.5">
                <span>-40px (Mais acima)</span>
                <span>0px (Na base)</span>
                <span>+40px (Mais abaixo)</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
