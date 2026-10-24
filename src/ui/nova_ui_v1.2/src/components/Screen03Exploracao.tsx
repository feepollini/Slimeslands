import React, { useState } from 'react';
import {
  OrnateWindow,
  WireSlot,
  RoyalButton,
  PearlButton,
  CarouselArrowButton,
  GoldDividerH,
  GoldDividerV,
  DiamondAccentSvg,
  SheetTitleHeader,
} from './OrnateWindowFrame';

export const Screen03Exploracao: React.FC = () => {
  const [activeNav, setActiveNav] = useState<'MAPA' | 'MOCHILA' | 'MISSÕES' | 'AJUSTES'>('MAPA');
  const [activeBagTab, setActiveBagTab] = useState('CONSUMÍVEIS');
  const [activeJourneyTab, setActiveJourneyTab] = useState<'PRINCIPAIS' | 'SECUNDÁRIAS'>('PRINCIPAIS');
  const [selectedQuest, setSelectedQuest] = useState(0);

  return (
    <div className="w-full flex flex-col">
      <SheetTitleHeader title="05 · EXPLORAÇÃO E JORNADA — ESTRUTURA" />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* ==================== LEFT COLUMN: EXPLORAÇÃO + MASCOTE MODAL (8 cols) ==================== */}
        <div className="lg:col-span-8 flex flex-col items-end gap-3">
          {/* Main EXPLORAÇÃO Window */}
          <OrnateWindow
            title="EXPLORAÇÃO"
            onClose={() => {}}
            className="w-full"
            bodyClassName="px-4 sm:px-5 pt-2 pb-4 gap-3"
          >
            {/* Top HUD Row: Avatar + Status Bars (Left) & Navigation Pills (Right) */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              {/* Avatar + VIDA / MANA / VIGOR */}
              <div className="flex items-center gap-3 flex-1 min-w-[260px]">
                <WireSlot
                  circle
                  label="AVATAR"
                  className="w-[68px] h-[68px] shrink-0"
                />
                <div className="flex flex-col gap-1.5 flex-1 max-w-[210px]">
                  {(['VIDA', 'MANA', 'VIGOR'] as const).map((stat) => (
                    <div key={stat} className="flex items-center gap-2">
                      <span
                        className="text-[9.5px] tracking-[0.08em] text-[#142230] w-11 uppercase font-medium"
                        style={{ fontFamily: 'var(--font-display)' }}
                      >
                        {stat}
                      </span>
                      <div className="wire-slot flex-1 h-3.5 rounded-[4px]" />
                    </div>
                  ))}
                </div>
              </div>

              {/* 4 Nav Pills: MAPA | MOCHILA | MISSÕES | AJUSTES */}
              <div className="flex items-center gap-1.5">
                {(['MAPA', 'MOCHILA', 'MISSÕES', 'AJUSTES'] as const).map((nav) =>
                  activeNav === nav ? (
                    <RoyalButton
                      key={nav}
                      onClick={() => setActiveNav(nav)}
                      innerClassName="py-1.5 px-4 text-[10.5px]"
                    >
                      {nav}
                    </RoyalButton>
                  ) : (
                    <button
                      key={nav}
                      type="button"
                      onClick={() => setActiveNav(nav)}
                      className="pearl-pill rounded-full py-1.5 px-4 text-[10.5px] tracking-[0.06em] text-[#142230] uppercase cursor-pointer"
                    >
                      {nav}
                    </button>
                  )
                )}
              </div>
            </div>

            {/* Middle Area: Left Mascote Sidebar + Center Map Asset + Right Active Mission */}
            <div className="flex flex-col md:flex-row items-stretch gap-2.5">
              {/* Left Collapsible Mascote Sidebar */}
              <div className="flex md:flex-col items-center gap-1.5">
                <div className="self-start">
                  <CarouselArrowButton dir="left" size="sm" />
                </div>
                <div className="pearl-subcard rounded-[12px] p-2 flex md:flex-col items-center justify-between gap-2.5 flex-1">
                  <span
                    className="text-[8.5px] tracking-[0.08em] text-[#142230] uppercase font-semibold"
                    style={{ fontFamily: 'var(--font-display)' }}
                  >
                    MASCOTE
                  </span>
                  {[0, 1, 2].map((petIdx) => (
                    <WireSlot
                      key={petIdx}
                      circle
                      label="PET"
                      className="w-[46px] h-[46px] shrink-0"
                    />
                  ))}
                </div>
              </div>

              {/* Center Large Map Area */}
              <WireSlot className="flex-1 min-h-[290px] sm:min-h-[325px]">
                <span
                  className="text-[18px] sm:text-[21px] tracking-[0.12em] text-[#283542] uppercase font-medium leading-relaxed"
                  style={{ fontFamily: 'var(--font-display)' }}
                >
                  ÁREA DO MAPA
                  <br />
                  ASSET REAL
                </span>
              </WireSlot>

              {/* Right Panel: MISSÃO ATIVA */}
              <div className="pearl-subcard rounded-[14px] p-3 w-full md:w-[195px] shrink-0 relative flex flex-col gap-2.5">
                <div className="pointer-events-none absolute -top-2 left-1/2 -translate-x-1/2">
                  <DiamondAccentSvg className="w-3.5 h-3.5" />
                </div>
                <h4
                  className="text-[11px] font-semibold tracking-[0.1em] text-[#0c1e33] uppercase text-center pt-1"
                  style={{ fontFamily: 'var(--font-display)' }}
                >
                  MISSÃO ATIVA
                </h4>
                <WireSlot
                  label="TÍTULO DA MISSÃO"
                  className="w-full h-[54px]"
                />
                <div className="flex flex-col gap-2 mt-0.5">
                  {Array.from({ length: 6 }).map((_, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <div className="wire-slot w-4 h-4 rounded-[3px] shrink-0" />
                      <div className="wire-bar flex-1 h-3" />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <GoldDividerH className="my-0.5" />

            {/* Bottom Dialogue Bar: NPC Portrait + Dialogue Box + 2 Dialogue Options */}
            <div className="flex flex-col sm:flex-row items-center gap-3">
              {/* Circular NPC Portrait in Gold Ring */}
              <div className="rounded-full p-[2.5px] bg-gradient-to-b from-[#f0d384] via-[#b88c32] to-[#7d5814] shrink-0">
                <WireSlot
                  circle
                  label="RETRATO"
                  sublabel="NPC"
                  className="w-[88px] h-[88px]"
                />
              </div>

              {/* Center Dialogue Text Box with NOME Tab */}
              <div className="flex-1 w-full relative pt-3">
                <div className="pearl-pill rounded-full px-4 py-0.5 text-[10px] tracking-[0.08em] text-[#0c1e33] uppercase font-semibold absolute top-0 left-3 z-10">
                  NOME
                </div>
                <div className="pearl-subcard rounded-[12px] px-4 pt-5 pb-3.5 flex flex-col gap-2">
                  <div className="wire-bar w-full h-3" />
                  <div className="wire-bar w-full h-3" />
                  <div className="wire-bar w-3/5 h-3" />
                </div>
              </div>

              {/* Right 2 Dialogue Option Buttons */}
              <div className="flex flex-col gap-2 w-full sm:w-[195px] shrink-0">
                <PearlButton
                  className="w-full"
                  innerClassName="py-2.5 px-3 text-[10px] tracking-[0.08em] uppercase"
                >
                  OPÇÃO DE DIÁLOGO
                </PearlButton>
                <PearlButton
                  className="w-full"
                  innerClassName="py-2.5 px-3 text-[10px] tracking-[0.08em] uppercase"
                >
                  OPÇÃO DE DIÁLOGO
                </PearlButton>
              </div>
            </div>
          </OrnateWindow>

          {/* Bottom-Right Mini Modal under EXPLORAÇÃO: MASCOTE */}
          <OrnateWindow
            title="MASCOTE"
            onClose={() => {}}
            compactHeader
            className="w-full sm:w-[320px]"
            bodyClassName="px-3.5 pt-2 pb-3"
          >
            <div className="flex items-center gap-3">
              <WireSlot label="RETRATO" className="w-[68px] h-[68px] shrink-0" />
              <div className="flex-1 flex flex-col gap-1.5">
                <span
                  className="text-[9.5px] tracking-[0.08em] text-[#0c1e33] uppercase font-semibold"
                  style={{ fontFamily: 'var(--font-display)' }}
                >
                  CARINHO
                </span>
                <div className="pearl-pill rounded-full h-3.5 p-0.5 overflow-hidden">
                  <div className="wire-bar w-2/3 h-full" />
                </div>
                <RoyalButton
                  className="w-full mt-0.5"
                  innerClassName="py-1.5 px-3 text-[10px] tracking-[0.1em] uppercase"
                >
                  ALIMENTAR
                </RoyalButton>
              </div>
            </div>
          </OrnateWindow>
        </div>

        {/* ==================== RIGHT COLUMN: MOCHILA + JORNADA (4 cols) ==================== */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          {/* Top-Right Window: MOCHILA */}
          <OrnateWindow
            title="MOCHILA"
            onClose={() => {}}
            compactHeader
            bodyClassName="px-4 pt-2 pb-4 gap-2.5"
          >
            {/* 4 Tabs */}
            <div className="grid grid-cols-4 gap-1">
              {['CONSUMÍVEIS', 'MATERIAIS', 'CARTAS E ORBES', 'ITENS CHAVE'].map((tab) =>
                activeBagTab === tab ? (
                  <RoyalButton
                    key={tab}
                    onClick={() => setActiveBagTab(tab)}
                    innerClassName="py-1.5 px-1.5 text-[8.5px]"
                  >
                    {tab}
                  </RoyalButton>
                ) : (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActiveBagTab(tab)}
                    className="pearl-pill rounded-full py-1.5 px-1.5 text-[8.5px] text-[#142230] uppercase cursor-pointer truncate"
                  >
                    {tab}
                  </button>
                )
              )}
            </div>

            {/* 3x2 Item Grid (Left) + Item Inspector (Right) */}
            <div className="grid grid-cols-12 gap-2.5 items-stretch pt-1">
              <div className="col-span-7 grid grid-cols-3 gap-2">
                {Array.from({ length: 6 }).map((_, idx) => (
                  <WireSlot
                    key={idx}
                    plus
                    label="ITEM"
                    className="h-[92px]"
                  />
                ))}
              </div>

              <div className="col-span-5 flex items-stretch gap-2">
                <GoldDividerV className="mx-0" />
                <div className="flex-1 flex flex-col justify-between gap-2">
                  <WireSlot label="ÍCONE" className="w-[66px] h-[66px] self-center" />

                  <div>
                    <span
                      className="text-[9px] tracking-[0.08em] text-[#0c1e33] uppercase font-semibold block mb-1"
                      style={{ fontFamily: 'var(--font-display)' }}
                    >
                      NOME
                    </span>
                    <div className="wire-bar w-full h-2.5" />
                  </div>

                  <div>
                    <span
                      className="text-[9px] tracking-[0.08em] text-[#0c1e33] uppercase font-semibold block mb-1"
                      style={{ fontFamily: 'var(--font-display)' }}
                    >
                      DESCRIÇÃO
                    </span>
                    <div className="flex flex-col gap-1">
                      <div className="wire-bar w-full h-2.5" />
                      <div className="wire-bar w-full h-2.5" />
                      <div className="wire-bar w-4/5 h-2.5" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-1.5 pt-1">
                    <RoyalButton innerClassName="py-1.5 px-2 text-[9px] uppercase">
                      USAR
                    </RoyalButton>
                    <PearlButton innerClassName="py-1.5 px-2 text-[9px] uppercase">
                      DESCARTAR
                    </PearlButton>
                  </div>
                </div>
              </div>
            </div>
          </OrnateWindow>

          {/* Bottom-Right Window: JORNADA */}
          <OrnateWindow
            title="JORNADA"
            onClose={() => {}}
            compactHeader
            bodyClassName="px-4 pt-2 pb-4 gap-2.5"
          >
            {/* 2 Tabs: PRINCIPAIS | SECUNDÁRIAS */}
            <div className="flex items-center gap-1.5">
              {(['PRINCIPAIS', 'SECUNDÁRIAS'] as const).map((tab) =>
                activeJourneyTab === tab ? (
                  <RoyalButton
                    key={tab}
                    onClick={() => setActiveJourneyTab(tab)}
                    innerClassName="py-1.5 px-5 text-[10px]"
                  >
                    {tab}
                  </RoyalButton>
                ) : (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActiveJourneyTab(tab)}
                    className="pearl-pill rounded-full py-1.5 px-5 text-[10px] text-[#142230] uppercase cursor-pointer"
                  >
                    {tab}
                  </button>
                )
              )}
            </div>

            {/* Quest List (Left) + Quest Details & Rewards (Right) */}
            <div className="grid grid-cols-12 gap-2.5 items-stretch pt-1">
              {/* Left 4 Quest Cards */}
              <div className="col-span-6 flex flex-col gap-2">
                {[0, 1, 2, 3].map((qIdx) => (
                  <button
                    key={qIdx}
                    type="button"
                    onClick={() => setSelectedQuest(qIdx)}
                    className={`rounded-[9px] p-2 flex items-center gap-2 text-left cursor-pointer border transition-colors ${
                      selectedQuest === qIdx
                        ? 'bg-[#faeac6] border-[#d4a548]'
                        : 'pearl-subcard'
                    }`}
                  >
                    <div className="wire-slot w-8 h-8 rounded-[5px] shrink-0" />
                    <div className="flex-1 flex flex-col gap-1">
                      <span
                        className="text-[9px] tracking-[0.06em] text-[#0c1e33] uppercase font-semibold"
                        style={{ fontFamily: 'var(--font-display)' }}
                      >
                        MISSÃO
                      </span>
                      <div className="wire-bar w-full h-2.5" />
                    </div>
                  </button>
                ))}
              </div>

              {/* Right Quest Detail */}
              <div className="col-span-6 flex items-stretch gap-2">
                <GoldDividerV className="mx-0" />
                <div className="flex-1 flex flex-col justify-between gap-2">
                  <WireSlot label="TÍTULO DA MISSÃO" className="w-full h-[34px]" />

                  <div>
                    <span
                      className="text-[9px] tracking-[0.08em] text-[#0c1e33] uppercase font-semibold block mb-1"
                      style={{ fontFamily: 'var(--font-display)' }}
                    >
                      DESCRIÇÃO
                    </span>
                    <div className="flex flex-col gap-1">
                      <div className="wire-bar w-full h-2.5" />
                      <div className="wire-bar w-full h-2.5" />
                      <div className="wire-bar w-4/5 h-2.5" />
                    </div>
                  </div>

                  <div>
                    <span
                      className="text-[9px] tracking-[0.08em] text-[#0c1e33] uppercase font-semibold block mb-1"
                      style={{ fontFamily: 'var(--font-display)' }}
                    >
                      RECOMPENSAS
                    </span>
                    <div className="grid grid-cols-3 gap-1.5">
                      {[0, 1, 2].map((rIdx) => (
                        <div key={rIdx} className="flex flex-col items-center gap-0.5">
                          <WireSlot className="w-full aspect-square" />
                          <span className="text-[7px] tracking-wider text-[#142230] uppercase">
                            RECOMPENSA
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <RoyalButton
                    className="w-full"
                    innerClassName="py-2 px-3 text-[10.5px] tracking-[0.1em] uppercase"
                  >
                    RESGATAR
                  </RoyalButton>
                </div>
              </div>
            </div>
          </OrnateWindow>
        </div>
      </div>
    </div>
  );
};
