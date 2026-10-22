import React from 'react';
import { MapRoute, MapMarker, RouteStyle } from '../types/map';
import { calculateRouteDistance } from '../utils/mapMath';
import {
  Route,
  Play,
  Pause,
  Trash2,
  Plus,
  Footprints,
  Check,
} from 'lucide-react';

interface Props {
  routes: MapRoute[];
  markers: MapMarker[];
  selectedRouteId: string | null;
  onSelectRoute: (id: string | null) => void;
  onUpdateRoute: (id: string, updates: Partial<MapRoute>) => void;
  onAddRoute: () => void;
  onDeleteRoute: (id: string) => void;
  isSimulatingCaravan: boolean;
  onToggleCaravanSimulation: () => void;
}

const ROUTE_STYLES: { style: RouteStyle; label: string }[] = [
  { style: 'dashed', label: 'Tracejada' },
  { style: 'solid', label: 'Contínua' },
  { style: 'dotted', label: 'Pontilhada' },
  { style: 'footprints', label: 'Pegadas' },
];

const ROUTE_COLORS = ['#38bdf8', '#ef4444', '#f59e0b', '#10b981', '#a855f7', '#ec4899'];

export const RouteStudio: React.FC<Props> = ({
  routes,
  markers,
  selectedRouteId,
  onSelectRoute,
  onUpdateRoute,
  onAddRoute,
  onDeleteRoute,
  isSimulatingCaravan,
  onToggleCaravanSimulation,
}) => {
  const selectedRoute = routes.find((r) => r.id === selectedRouteId);

  const toggleMarkerInRoute = (route: MapRoute, markerId: string) => {
    let updated: string[];
    if (route.markerIds.includes(markerId)) {
      updated = route.markerIds.filter((id) => id !== markerId);
    } else {
      updated = [...route.markerIds, markerId];
    }
    onUpdateRoute(route.id, { markerIds: updated });
  };

  return (
    <div className="space-y-4">
      {/* Top action: New Route & Caravan Simulation */}
      <div className="flex items-center gap-2">
        <button
          onClick={onAddRoute}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-medium text-xs shadow-md transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Criar Nova Rota</span>
        </button>

        <button
          onClick={onToggleCaravanSimulation}
          className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-semibold shadow-md transition-colors ${
            isSimulatingCaravan
              ? 'bg-rose-500 text-white hover:bg-rose-600'
              : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
          }`}
          title="Animar expedição ao longo da rota"
        >
          {isSimulatingCaravan ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          <span>Expedição</span>
        </button>
      </div>

      {/* Selected Route Inspector */}
      {selectedRoute && (
        <div className="p-3.5 bg-slate-900 border-2 border-amber-500/60 rounded-xl space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-400 uppercase tracking-wide">
              Editar Rota
            </span>
            <button
              onClick={() => onDeleteRoute(selectedRoute.id)}
              className="text-slate-400 hover:text-rose-400 p-1"
              title="Excluir Rota"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>

          <div>
            <input
              type="text"
              value={selectedRoute.name}
              onChange={(e) => onUpdateRoute(selectedRoute.id, { name: e.target.value })}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 font-semibold focus:outline-none focus:border-amber-400"
              placeholder="Nome da rota"
            />
          </div>

          {/* Color & Style */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1">
              {ROUTE_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => onUpdateRoute(selectedRoute.id, { color: c })}
                  className={`w-5 h-5 rounded-full border-2 transition-transform ${
                    selectedRoute.color === c ? 'border-white scale-110' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>

            <select
              value={selectedRoute.style}
              onChange={(e) =>
                onUpdateRoute(selectedRoute.id, { style: e.target.value as RouteStyle })
              }
              className="bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded-lg px-2 py-1 outline-none"
            >
              {ROUTE_STYLES.map((st) => (
                <option key={st.style} value={st.style}>
                  {st.label}
                </option>
              ))}
            </select>
          </div>

          {/* Markers sequence toggle list */}
          <div>
            <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1.5">
              <span>Marcos Conectados:</span>
              <span className="font-mono-data text-amber-400">
                {
                  calculateRouteDistance(selectedRoute.markerIds, markers).kmDistance
                }{' '}
                km
              </span>
            </div>
            <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
              {markers.map((marker) => {
                const isConnected = selectedRoute.markerIds.includes(marker.id);
                const orderIndex = selectedRoute.markerIds.indexOf(marker.id);

                return (
                  <button
                    key={marker.id}
                    onClick={() => toggleMarkerInRoute(selectedRoute, marker.id)}
                    className={`w-full flex items-center justify-between p-1.5 rounded-lg border text-xs text-left transition-colors ${
                      isConnected
                        ? 'bg-amber-500/15 border-amber-500/60 text-amber-200'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: marker.color }}
                      />
                      <span className="truncate">{marker.name}</span>
                    </div>

                    {isConnected && (
                      <span className="w-5 h-5 rounded-full bg-amber-500 text-slate-950 font-bold text-[10px] flex items-center justify-center shrink-0">
                        {orderIndex + 1}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Routes List */}
      <div className="space-y-1.5">
        {routes.map((r) => {
          const isSelected = r.id === selectedRouteId;
          const { kmDistance } = calculateRouteDistance(r.markerIds, markers);

          return (
            <div
              key={r.id}
              onClick={() => onSelectRoute(r.id)}
              className={`flex items-center justify-between p-2 rounded-xl border cursor-pointer transition-colors ${
                isSelected
                  ? 'bg-slate-800/90 border-amber-400 text-white'
                  : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className="w-3.5 h-3.5 rounded-full shrink-0 border"
                  style={{ backgroundColor: r.color, borderColor: '#ffffff40' }}
                />
                <span className="text-xs font-medium truncate">{r.name}</span>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span className="font-mono-data text-[11px] text-amber-400">
                  {kmDistance} km
                </span>
                <span className="text-[11px] text-slate-400">
                  ({r.markerIds.length} nós)
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
