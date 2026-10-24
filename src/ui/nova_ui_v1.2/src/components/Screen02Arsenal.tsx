import React, { useState } from 'react';
import {
  OrnateWindow,
  WireSlot,
  RoyalButton,
  PearlButton,
  GoldDividerH,
  GoldDividerV,
  SheetTitleHeader,
} from './OrnateWindowFrame';

export const Screen02Arsenal: React.FC = () => {
  const [activeDeck, setActiveDeck] = useState<'Deck 1' | 'Deck 2' | 'Deck 3'>('Deck 1');
  const [activeColTab, setActiveColTab] = useState<'CARTAS' | 'ARTEFATOS' | 'TABULEIROS'>('CARTAS');
  const [copyFilter, setCopyFilter] = useState<'2x' | '3x' | '4x'>('2x');
  const [groupCopies, setGroupCopies] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <div className="w-full flex flex-col">
      <SheetTitleHeader title="02 · ARSENAL — ESTRUTURA" />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* ==================== LEFT DESKTOP COLUMN (8 cols) ==================== */}
        <div className="lg:col-span-8 flex flex-col gap-3">
          {/* Top Window: ARSENAL Deck Preparation */}
          <OrnateWindow
            title="ARSENAL"
            onClose={() => {}}
            bodyClassName="px-5 pt-2 pb-4 gap-3"
          >
            {/* Deck Tabs Header */}
            <div className="flex flex-col gap-1.5">
              <span
                className="text-[12px] font-semibold tracking-[0.1em] text-[#0c1e33] uppercase"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                PREPARAÇÃO DO DECK
              </span>
              <div className="flex items-center gap-2">
                {(['Deck 1', 'Deck 2', 'Deck 3'] as const).map((deck) =>
                  activeDeck === deck ? (
                    <RoyalButton
                      key={deck}
                      onClick={() => setActiveDeck(deck)}
                      innerClassName="py-1.5 px-5 text-[11px]"
                    >
                      {deck}
                    </RoyalButton>
                  ) : (
                    <button
                      key={deck}
                      type="button"
                      onClick={() => setActiveDeck(deck)}
                      className="pearl-pill rounded-full py-1.5 px-5 text-[11px] text-[#172536] cursor-pointer"
                    >
                      {deck}
                    </button>
                  )
                )}
              </div>
            </div>

            {/* Main Deck Grid (6x2 = 12 Cards) + Right Artifacts/Cosmetics */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-stretch my-1">
              {/* 6x2 Card Slots */}
              <div className="md:col-span-8 grid grid-cols-6 gap-2">
                {Array.from({ length: 12 }).map((_, idx) => (
                  <WireSlot
                    key={idx}
                    plus
                    label="CARTA"
                    className="h-[104px] sm:h-[114px]"
                  />
                ))}
              </div>

              {/* Vertical Divider + Right Artifacts & Board/Card-Back */}
              <div className="md:col-span-4 flex items-stretch gap-2.5">
                <div className="hidden md:block">
                  <GoldDividerV />
                </div>
                <div className="flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <span className="h-[1px] flex-1 bg-gradient-to-r from-transparent to-[#c49a45]" />
                      <span
                        className="text-[10.5px] tracking-[0.1em] text-[#0c1e33] uppercase"
                        style={{ fontFamily: 'var(--font-display)' }}
                      >
                        ARTEFATOS
                      </span>
                      <span className="h-[1px] flex-1 bg-gradient-to-l from-transparent to-[#c49a45]" />
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      {[0, 1, 2].map((i) => (
                        <div key={i} className="flex flex-col items-center gap-1">
                          <WireSlot plus circle className="w-[58px] h-[58px]" />
                          <span
                            className="text-[8.5px] tracking-[0.08em] text-[#172536] uppercase"
                            style={{ fontFamily: 'var(--font-display)' }}
                          >
                            ARTEFATO
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <GoldDividerH className="my-1.5" />

                  <div className="grid grid-cols-2 gap-2.5">
                    <WireSlot plus label="TABULEIRO" className="h-[98px]" />
                    <WireSlot plus label="VERSO" className="h-[98px]" />
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Buttons: SALVAR DECK & AUTO-PREENCHER */}
            <div className="flex items-center justify-center gap-4 pt-1">
              <RoyalButton
                className="min-w-[200px] sm:min-w-[240px]"
                innerClassName="py-2.5 px-6 text-[12px] tracking-[0.12em] uppercase"
              >
                SALVAR DECK
              </RoyalButton>
              <PearlButton
                className="min-w-[165px] sm:min-w-[195px]"
                innerClassName="py-2.5 px-6 text-[11.5px] tracking-[0.1em] uppercase"
              >
                AUTO-PREENCHER
              </PearlButton>
            </div>
          </OrnateWindow>

          {/* Bottom Connected Window: Collection Browser (8 Card Slots) */}
          <OrnateWindow
            hideTopArch
            className="pt-0"
            bodyClassName="px-5 py-4 gap-3"
          >
            {/* Filter Controls Bar */}
            <div className="flex flex-wrap items-center justify-between gap-2">
              {/* Segmented Tabs: CARTAS | ARTEFATOS | TABULEIROS */}
              <div className="pearl-pill rounded-full p-0.5 flex items-center">
                {(['CARTAS', 'ARTEFATOS', 'TABULEIROS'] as const).map((tab) =>
                  activeColTab === tab ? (
                    <RoyalButton
                      key={tab}
                      onClick={() => setActiveColTab(tab)}
                      innerClassName="py-1.5 px-4 text-[10.5px]"
                    >
                      {tab}
                    </RoyalButton>
                  ) : (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => setActiveColTab(tab)}
                      className="px-4 py-1.5 text-[10.5px] tracking-[0.08em] text-[#172536] uppercase cursor-pointer"
                    >
                      {tab}
                    </button>
                  )
                )}
              </div>

              {/* Search Input */}
              <div className="pearl-pill rounded-full px-3 py-1.5 flex items-center gap-2 flex-1 min-w-[140px] max-w-[195px]">
                <span className="text-[11px] text-[#45505c]">🔍</span>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar carta"
                  className="bg-transparent text-[11px] text-[#142230] placeholder-[#6c7580] focus:outline-none w-full"
                />
              </div>

              {/* Raridade Dropdown */}
              <button
                type="button"
                className="pearl-pill rounded-full px-3.5 py-1.5 text-[11px] text-[#142230] flex items-center gap-2 cursor-pointer"
              >
                <span>Raridade</span>
                <span className="text-[9px]">⌄</span>
              </button>

              {/* 2x | 3x | 4x */}
              <div className="pearl-pill rounded-[8px] p-0.5 flex items-center">
                {(['2x', '3x', '4x'] as const).map((cnt) => (
                  <button
                    key={cnt}
                    type="button"
                    onClick={() => setCopyFilter(cnt)}
                    className={`px-2.5 py-1 rounded-[6px] text-[10.5px] cursor-pointer ${
                      copyFilter === cnt
                        ? 'bg-[#062356] text-white font-medium'
                        : 'text-[#172536]'
                    }`}
                  >
                    {cnt}
                  </button>
                ))}
              </div>

              {/* Agrupar cópias Toggle */}
              <div className="flex items-center gap-2">
                <span className="text-[10.5px] text-[#172536]">Agrupar cópias</span>
                <button
                  type="button"
                  onClick={() => setGroupCopies((v) => !v)}
                  className={`w-10 h-5 rounded-full p-0.5 transition-colors cursor-pointer ${
                    groupCopies ? 'bg-[#082b66]' : 'bg-[#9ea4ab]'
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full bg-white shadow transition-transform ${
                      groupCopies ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* 8 Vertical Card Slots */}
            <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
              {Array.from({ length: 8 }).map((_, idx) => (
                <WireSlot
                  key={idx}
                  plus
                  label="CARTA"
                  className="h-[125px] sm:h-[138px]"
                />
              ))}
            </div>
          </OrnateWindow>
        </div>

        {/* ==================== RIGHT MOBILE WINDOW: ARSENAL (4 cols) ==================== */}
        <OrnateWindow
          title="ARSENAL"
          onClose={() => {}}
          compactHeader
          className="lg:col-span-4"
          bodyClassName="px-4 pt-2 pb-4 gap-2.5"
        >
          <div className="pearl-subcard rounded-[14px] p-3 flex flex-col gap-2">
            <span
              className="text-[11px] font-semibold tracking-[0.1em] text-[#0c1e33] uppercase"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              PREPARAÇÃO DO DECK
            </span>
            <div className="flex items-center justify-between gap-1">
              <div className="flex items-center gap-1">
                {(['Deck 1', 'Deck 2', 'Deck 3'] as const).map((deck) =>
                  activeDeck === deck ? (
                    <RoyalButton
                      key={deck}
                      onClick={() => setActiveDeck(deck)}
                      innerClassName="py-1 px-3 text-[10px]"
                    >
                      {deck}
                    </RoyalButton>
                  ) : (
                    <button
                      key={deck}
                      type="button"
                      onClick={() => setActiveDeck(deck)}
                      className="pearl-pill rounded-full py-1 px-3 text-[10px] text-[#172536] cursor-pointer"
                    >
                      {deck}
                    </button>
                  )
                )}
              </div>
              <button
                type="button"
                className="text-[10px] text-[#172536] flex items-center gap-1 cursor-pointer"
              >
                <span>Expandir</span>
                <span>⌄</span>
              </button>
            </div>
          </div>

          <GoldDividerH className="my-0.5" />

          {/* Mobile Collection Tabs */}
          <div className="pearl-pill rounded-full p-0.5 grid grid-cols-3">
            {(['CARTAS', 'ARTEFATOS', 'TABULEIROS'] as const).map((tab) =>
              activeColTab === tab ? (
                <RoyalButton
                  key={tab}
                  onClick={() => setActiveColTab(tab)}
                  innerClassName="py-1.5 px-2 text-[10px]"
                >
                  {tab}
                </RoyalButton>
              ) : (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveColTab(tab)}
                  className="py-1.5 px-2 text-[10px] tracking-[0.06em] text-[#172536] uppercase cursor-pointer"
                >
                  {tab}
                </button>
              )
            )}
          </div>

          {/* Mobile Search Input */}
          <div className="pearl-pill rounded-full px-3.5 py-1.5 flex items-center gap-2">
            <span className="text-[11px] text-[#45505c]">🔍</span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar carta"
              className="bg-transparent text-[11px] text-[#142230] placeholder-[#6c7580] focus:outline-none w-full"
            />
          </div>

          {/* Mobile Filter Row */}
          <div className="flex items-center justify-between gap-1.5">
            <button
              type="button"
              className="pearl-pill rounded-full px-3 py-1 text-[10px] text-[#142230] flex items-center gap-1.5"
            >
              <span>Raridade</span>
              <span>⌄</span>
            </button>

            <div className="pearl-pill rounded-[7px] p-0.5 flex items-center">
              {(['2x', '3x', '4x'] as const).map((cnt) => (
                <button
                  key={cnt}
                  type="button"
                  onClick={() => setCopyFilter(cnt)}
                  className={`px-2 py-0.5 rounded-[5px] text-[10px] cursor-pointer ${
                    copyFilter === cnt ? 'bg-[#062356] text-white' : 'text-[#172536]'
                  }`}
                >
                  {cnt}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1">
              <span className="text-[9.5px] text-[#172536]">Agrupar cópias</span>
              <button
                type="button"
                onClick={() => setGroupCopies((v) => !v)}
                className={`w-8 h-4 rounded-full p-0.5 transition-colors cursor-pointer ${
                  groupCopies ? 'bg-[#082b66]' : 'bg-[#9ea4ab]'
                }`}
              >
                <div
                  className={`w-3 h-3 rounded-full bg-white transition-transform ${
                    groupCopies ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Mobile 2x3 Card Grid */}
          <div className="grid grid-cols-2 gap-2.5 flex-1 pt-1">
            {Array.from({ length: 6 }).map((_, idx) => (
              <WireSlot
                key={idx}
                plus
                label="CARTA"
                className="min-h-[125px] h-full"
              />
            ))}
          </div>
        </OrnateWindow>
      </div>
    </div>
  );
};
