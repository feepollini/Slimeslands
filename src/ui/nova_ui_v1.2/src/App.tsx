import React, { useState } from 'react';
import { OrnateSvgDefs, RoyalButton, PearlButton } from './components/OrnateWindowFrame';
import { Screen01Loja } from './components/Screen01Loja';
import { Screen02Arsenal } from './components/Screen02Arsenal';
import { Screen03Exploracao } from './components/Screen03Exploracao';
import { Screen04PerfilAcademiaAjustes } from './components/Screen04PerfilAcademiaAjustes';
import { Screen05InventarioMenu } from './components/Screen05InventarioMenu';

type ScreenId = 'ALL' | 'LOJA' | 'ARSENAL' | 'PERFIL' | 'EXPLORACAO' | 'INVENTARIO';

const NAV_ITEMS: { id: ScreenId; label: string }[] = [
  { id: 'LOJA', label: '01 · LOJA CENTRAL' },
  { id: 'ARSENAL', label: '02 · ARSENAL' },
  { id: 'PERFIL', label: '03 · PERFIL · ACADEMIA · AJUSTES' },
  { id: 'EXPLORACAO', label: '04 · EXPLORAÇÃO E JORNADA' },
  { id: 'INVENTARIO', label: '05 · INVENTÁRIO & MENU' },
  { id: 'ALL', label: 'VER TODAS AS TELAS' },
];

export default function App() {
  const [activeScreen, setActiveScreen] = useState<ScreenId>('LOJA');

  return (
    <div className="navy-backdrop min-h-screen w-full flex flex-col items-center p-3 sm:p-5 lg:p-6 overflow-x-hidden">
      <OrnateSvgDefs />

      {/* Top Screen Switcher Bar */}
      <header className="w-full max-w-[1400px] mb-5 rounded-full p-[2px] bg-gradient-to-r from-[#8f681e] via-[#f2d68b] to-[#8f681e] shadow-lg">
        <div className="w-full rounded-full bg-[#04152b]/95 px-3 py-2 flex flex-wrap items-center justify-center gap-2">
          {NAV_ITEMS.map((item) =>
            activeScreen === item.id ? (
              <RoyalButton
                key={item.id}
                onClick={() => setActiveScreen(item.id)}
                innerClassName="py-1.5 px-4 text-[11px] tracking-[0.1em] uppercase"
              >
                {item.label}
              </RoyalButton>
            ) : (
              <PearlButton
                key={item.id}
                onClick={() => setActiveScreen(item.id)}
                innerClassName="py-1.5 px-4 text-[11px] tracking-[0.1em] uppercase"
              >
                {item.label}
              </PearlButton>
            )
          )}
        </div>
      </header>

      {/* Main Content Container */}
      <main className="w-full max-w-[1400px] flex flex-col gap-12 pb-10">
        {(activeScreen === 'LOJA' || activeScreen === 'ALL') && <Screen01Loja />}
        {(activeScreen === 'ARSENAL' || activeScreen === 'ALL') && <Screen02Arsenal />}
        {(activeScreen === 'PERFIL' || activeScreen === 'ALL') && (
          <Screen04PerfilAcademiaAjustes />
        )}
        {(activeScreen === 'EXPLORACAO' || activeScreen === 'ALL') && (
          <Screen03Exploracao />
        )}
        {(activeScreen === 'INVENTARIO' || activeScreen === 'ALL') && (
          <Screen05InventarioMenu />
        )}
      </main>
    </div>
  );
}
