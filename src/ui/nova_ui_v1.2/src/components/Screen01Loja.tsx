import React, { useState } from 'react';
import {
  OrnateWindow,
  WireSlot,
  RoyalButton,
  CarouselArrowButton,
  GoldDividerH,
  GoldDividerV,
  SheetTitleHeader,
} from './OrnateWindowFrame';

const LOJA_TABS = [
  'Boosters',
  'Split',
  'Decks',
  'Diárias',
  'Raras',
  'Moedas',
  'Gemas',
  'Artefatos',
];

const RARITIES = [
  { name: 'Comum', bg: 'bg-[#f0ede6]', border: 'border-[#c9c3b8]' },
  { name: 'Rara', bg: 'bg-[#e6f0fa]', border: 'border-[#8ebce6]' },
  { name: 'Épica', bg: 'bg-[#efe6f7]', border: 'border-[#bd96e0]' },
  { name: 'Lendária', bg: 'bg-[#faf2de]', border: 'border-[#e0bc68]' },
  { name: 'Mítica', bg: 'bg-[#fae6ec]', border: 'border-[#e698ad]' },
];

export const Screen01Loja: React.FC = () => {
  const [activeTab, setActiveTab] = useState('Boosters');
  const [bannerDot, setBannerDot] = useState(0);
  const [packQty, setPackQty] = useState('x1');

  return (
    <div className="w-full flex flex-col">
      <SheetTitleHeader title="01 · LOJA CENTRAL — ESTRUTURA" />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* ==================== LEFT DESKTOP WINDOW: LOJA (8 cols) ==================== */}
        <OrnateWindow
          title="LOJA"
          onClose={() => {}}
          headerRight={
            <div className="hidden sm:flex items-center gap-2 mr-1">
              <div className="pearl-pill rounded-full px-3.5 py-1 text-[10px] tracking-[0.08em] text-[#172536] uppercase whitespace-nowrap">
                SALDO OURO
              </div>
              <div className="pearl-pill rounded-full px-3.5 py-1 text-[10px] tracking-[0.08em] text-[#172536] uppercase whitespace-nowrap">
                SALDO GEMAS
              </div>
            </div>
          }
          className="lg:col-span-8"
          bodyClassName="px-4 sm:px-6 pt-2 pb-5 gap-3"
        >
          {/* 8 Tabs Row */}
          <div className="grid grid-cols-4 sm:grid-cols-8 gap-1.5">
            {LOJA_TABS.map((tab) => {
              const isSelected = activeTab === tab;
              return isSelected ? (
                <RoyalButton
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  innerClassName="py-1.5 px-2 text-[11px]"
                >
                  {tab}
                </RoyalButton>
              ) : (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className="pearl-pill rounded-full py-1.5 px-2 text-[11px] text-[#172536] hover:brightness-105 cursor-pointer whitespace-nowrap truncate"
                >
                  {tab}
                </button>
              );
            })}
          </div>

          {/* Top Banner Carousel */}
          <div className="flex items-center gap-2.5">
            <CarouselArrowButton
              dir="left"
              onClick={() => setBannerDot((d) => (d + 2) % 3)}
            />
            <WireSlot label="BANNER" className="flex-1 h-[108px] relative">
              <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 flex items-center gap-1.5">
                {[0, 1, 2].map((idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setBannerDot(idx)}
                    className={`w-2 h-2 rounded-full cursor-pointer ${
                      bannerDot === idx ? 'bg-[#082454]' : 'bg-[#adb3ba]'
                    }`}
                  />
                ))}
              </div>
            </WireSlot>
            <CarouselArrowButton
              dir="right"
              onClick={() => setBannerDot((d) => (d + 1) % 3)}
            />
          </div>

          {/* Middle Section: 3 Tilted Envelopes (Left) + Pack Details (Right) */}
          <div className="pearl-subcard rounded-[16px] p-3.5 grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
            {/* Left: 3 Envelopes Carousel */}
            <div className="md:col-span-6 flex items-center justify-between gap-2">
              <CarouselArrowButton dir="left" />
              <div className="flex items-center justify-center gap-2.5 py-2 flex-1">
                <WireSlot
                  label="ENVELOPE"
                  className="w-[78px] h-[126px] -rotate-[8deg] shrink-0 shadow-sm"
                />
                <WireSlot
                  label="ENVELOPE"
                  className="w-[98px] h-[156px] z-10 shrink-0 shadow-md"
                />
                <WireSlot
                  label="ENVELOPE"
                  className="w-[78px] h-[126px] rotate-[8deg] shrink-0 shadow-sm"
                />
              </div>
              <CarouselArrowButton dir="right" />
            </div>

            {/* Vertical Divider + Right Pack Info */}
            <div className="md:col-span-6 flex items-stretch gap-3">
              <div className="hidden md:block">
                <GoldDividerV />
              </div>
              <div className="flex-1 flex flex-col justify-between gap-2.5">
                <h3
                  className="text-[14px] font-semibold tracking-[0.1em] text-[#0c1e33] uppercase"
                  style={{ fontFamily: 'var(--font-display)' }}
                >
                  NOME DO PACOTE
                </h3>

                <WireSlot label="DESCRIÇÃO" className="w-full h-[52px]" />

                {/* 5 Rarity Rate Boxes */}
                <div className="grid grid-cols-5 gap-1.5">
                  {RARITIES.map((rar) => (
                    <div
                      key={rar.name}
                      className={`${rar.bg} border ${rar.border} rounded-[8px] p-1.5 flex flex-col items-center gap-1`}
                    >
                      <span className="text-[10px] text-[#172536] font-medium">
                        {rar.name}
                      </span>
                      <div className="wire-slot w-full py-1 rounded-[5px] text-[8.5px] tracking-wider uppercase text-center">
                        TAXA
                      </div>
                    </div>
                  ))}
                </div>

                {/* Quantity Dropdown + ABRIR · PREÇO Button */}
                <div className="flex items-center gap-2.5 pt-0.5">
                  <button
                    type="button"
                    onClick={() =>
                      setPackQty((q) => (q === 'x1' ? 'x3' : q === 'x3' ? 'x10' : 'x1'))
                    }
                    className="pearl-pill rounded-full px-3.5 py-2 text-[12px] text-[#142230] flex items-center gap-2 cursor-pointer"
                  >
                    <span>{packQty}</span>
                    <span className="text-[10px]">⌄</span>
                  </button>

                  <RoyalButton
                    className="flex-1"
                    innerClassName="py-2.5 px-4 text-[12px] tracking-[0.12em]"
                  >
                    ABRIR · PREÇO
                  </RoyalButton>
                </div>
              </div>
            </div>
          </div>

          <GoldDividerH className="my-0.5" />

          {/* Bottom Section: OFERTAS DIÁRIAS (2x3 Grid) */}
          <div className="flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <h3
                className="text-[14px] font-semibold tracking-[0.12em] text-[#0c1e33] uppercase"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                OFERTAS DIÁRIAS
              </h3>
              <div className="flex items-center gap-2">
                <span
                  className="text-[10px] tracking-[0.08em] text-[#172536] uppercase"
                  style={{ fontFamily: 'var(--font-display)' }}
                >
                  RENOVAÇÃO
                </span>
                <div className="wire-bar w-20 h-4" />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {Array.from({ length: 6 }).map((_, idx) => (
                <div
                  key={idx}
                  className="pearl-subcard rounded-[11px] p-2.5 flex items-center gap-2.5"
                >
                  <WireSlot label="CARTA" className="w-[62px] h-[68px] shrink-0" />
                  <div className="flex-1 flex flex-col justify-between gap-1.5">
                    <div className="wire-bar w-full h-3" />
                    <div className="wire-bar w-4/5 h-3" />
                    <RoyalButton
                      className="w-full mt-0.5"
                      innerClassName="py-1 px-2 text-[9.5px] tracking-[0.1em]"
                    >
                      PREÇO
                    </RoyalButton>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </OrnateWindow>

        {/* ==================== RIGHT MOBILE WINDOW: LOJA (4 cols) ==================== */}
        <OrnateWindow
          title="LOJA"
          onClose={() => {}}
          compactHeader
          className="lg:col-span-4"
          bodyClassName="px-4 pt-2 pb-4 gap-2.5"
        >
          {/* Mobile Balances Row */}
          <div className="grid grid-cols-2 gap-2">
            <div className="pearl-pill rounded-full py-1.5 px-3 text-center text-[10px] tracking-[0.08em] text-[#172536] uppercase">
              SALDO OURO
            </div>
            <div className="pearl-pill rounded-full py-1.5 px-3 text-center text-[10px] tracking-[0.08em] text-[#172536] uppercase">
              SALDO GEMAS
            </div>
          </div>

          {/* Mobile Tabs Row */}
          <div className="flex items-center gap-1 overflow-hidden">
            {['Boosters', 'Split', 'Decks', 'Diárias', 'Raras'].map((tab) => {
              const isSelected = activeTab === tab;
              return isSelected ? (
                <RoyalButton
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  innerClassName="py-1 px-2.5 text-[10px]"
                >
                  {tab}
                </RoyalButton>
              ) : (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className="pearl-pill rounded-full py-1 px-2.5 text-[10px] text-[#172536] cursor-pointer whitespace-nowrap"
                >
                  {tab}
                </button>
              );
            })}
            <CarouselArrowButton dir="right" size="sm" />
          </div>

          {/* Mobile Banner */}
          <WireSlot label="BANNER" className="w-full h-[82px] relative px-2">
            <div className="w-full flex items-center justify-between px-1">
              <CarouselArrowButton dir="left" size="sm" />
              <CarouselArrowButton dir="right" size="sm" />
            </div>
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#082454]" />
              <span className="w-1.5 h-1.5 rounded-full bg-[#adb3ba]" />
              <span className="w-1.5 h-1.5 rounded-full bg-[#adb3ba]" />
            </div>
          </WireSlot>

          {/* Mobile Envelopes + Pack Info */}
          <div className="pearl-subcard rounded-[14px] p-3 flex flex-col gap-2.5">
            <div className="flex items-center justify-between gap-1">
              <CarouselArrowButton dir="left" size="sm" />
              <div className="flex items-center justify-center gap-2 py-1">
                <WireSlot
                  label="ENVELOPE"
                  className="w-[58px] h-[92px] -rotate-[8deg] shrink-0"
                />
                <WireSlot
                  label="ENVELOPE"
                  className="w-[74px] h-[112px] z-10 shrink-0"
                />
                <WireSlot
                  label="ENVELOPE"
                  className="w-[58px] h-[92px] rotate-[8deg] shrink-0"
                />
              </div>
              <CarouselArrowButton dir="right" size="sm" />
            </div>

            <h4
              className="text-[12px] font-semibold tracking-[0.1em] text-[#0c1e33] uppercase"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              NOME DO PACOTE
            </h4>

            <WireSlot label="DESCRIÇÃO" className="w-full h-[42px]" />

            <div className="grid grid-cols-5 gap-1">
              {RARITIES.map((rar) => (
                <div
                  key={rar.name}
                  className={`${rar.bg} border ${rar.border} rounded-[6px] p-1 flex flex-col items-center gap-1`}
                >
                  <span className="text-[8.5px] text-[#172536] font-medium">
                    {rar.name}
                  </span>
                  <div className="wire-slot w-full py-0.5 rounded-[4px] text-[7.5px] uppercase text-center">
                    TAXA
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <div className="pearl-pill rounded-full px-3 py-1.5 text-[11px] text-[#142230] flex items-center gap-1.5">
                <span>{packQty}</span>
                <span className="text-[9px]">⌄</span>
              </div>
              <RoyalButton
                className="flex-1"
                innerClassName="py-2 px-3 text-[11px] tracking-[0.1em]"
              >
                ABRIR · PREÇO
              </RoyalButton>
            </div>
          </div>

          <GoldDividerH className="my-0" />

          {/* Mobile Daily Offers */}
          <div className="flex items-center justify-between">
            <span
              className="text-[12px] font-semibold tracking-[0.1em] text-[#0c1e33] uppercase"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              OFERTAS DIÁRIAS
            </span>
            <div className="flex items-center gap-1.5">
              <span className="text-[8.5px] tracking-wider uppercase text-[#172536]">
                RENOVAÇÃO
              </span>
              <div className="wire-bar w-10 h-3.5" />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            {[0, 1].map((idx) => (
              <div
                key={idx}
                className="pearl-subcard rounded-[10px] p-2 flex items-center gap-2.5"
              >
                <WireSlot label="CARTA" className="w-[64px] h-[58px] shrink-0" />
                <div className="flex-1 flex flex-col gap-1.5">
                  <div className="wire-bar w-full h-2.5" />
                  <div className="wire-bar w-4/5 h-2.5" />
                  <RoyalButton
                    className="w-full"
                    innerClassName="py-1 px-2 text-[9px] tracking-[0.1em]"
                  >
                    PREÇO
                  </RoyalButton>
                </div>
              </div>
            ))}
          </div>
        </OrnateWindow>
      </div>
    </div>
  );
};
