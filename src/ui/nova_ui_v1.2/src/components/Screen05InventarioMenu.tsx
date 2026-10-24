import React, { useState } from 'react';
import {
  OrnateWindow,
  WireSlot,
  RoyalButton,
  PearlButton,
  CloseCircleButton,
  GoldDividerV,
  DiamondAccentSvg,
  SheetTitleHeader,
} from './OrnateWindowFrame';

const INV_TABS = ['TODOS', 'CONSUMÍVEIS', 'MATERIAIS', 'EQUIPAMENTOS', 'OUTROS'];

export const Screen05InventarioMenu: React.FC = () => {
  const [activeTab, setActiveTab] = useState('TODOS');
  const [showcaseTab, setShowcaseTab] = useState<'left' | 'right'>('left');

  return (
    <div className="w-full flex flex-col gap-5">
      <SheetTitleHeader title="00 · INVENTÁRIO E MENU — ESTRUTURA" />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* LEFT WINDOW: INVENTÁRIO (8 cols) */}
        <OrnateWindow
          title="INVENTÁRIO"
          onClose={() => {}}
          className="lg:col-span-8"
          bodyClassName="px-5 pt-2 pb-5 gap-3.5 justify-between"
        >
          {/* 5 Tabs Pill Bar */}
          <div className="pearl-pill rounded-full p-1 flex items-center justify-between">
            {INV_TABS.map((tab) =>
              activeTab === tab ? (
                <RoyalButton
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className="flex-1"
                  innerClassName="py-2 px-3 text-[11px]"
                >
                  {tab}
                </RoyalButton>
              ) : (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className="flex-1 py-2 px-3 text-[11px] tracking-[0.08em] text-[#142230] uppercase cursor-pointer"
                >
                  {tab}
                </button>
              )
            )}
          </div>

          {/* 5x4 Empty Item Grid + 5 Empty Equipment Slots */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center flex-1">
            <div className="md:col-span-9 grid grid-cols-5 gap-2.5">
              {Array.from({ length: 20 }).map((_, idx) => (
                <WireSlot
                  key={idx}
                  plus={idx < 6}
                  label={idx < 6 ? 'ITEM' : undefined}
                  className="aspect-square w-full"
                />
              ))}
            </div>

            <div className="md:col-span-3 flex items-stretch gap-2.5 h-full">
              <div className="hidden md:block">
                <GoldDividerV />
              </div>
              <div className="flex-1 flex flex-col items-center justify-between gap-2">
                <span
                  className="text-[10.5px] tracking-[0.1em] text-[#0c1e33] uppercase font-semibold"
                  style={{ fontFamily: 'var(--font-display)' }}
                >
                  EQUIPAMENTOS
                </span>
                {['ARMA', 'ELMO', 'ARMADURA', 'ANEL', 'BOTAS'].map((eq) => (
                  <WireSlot
                    key={eq}
                    plus
                    label={eq}
                    className="w-[68px] h-[68px]"
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Footer: Currencies + CONFIRMAR */}
          <div className="flex items-center justify-between pt-2 border-t border-[#d8c398]">
            <div className="flex items-center gap-3">
              <div className="pearl-pill rounded-full px-4 py-1.5 text-[10.5px] tracking-[0.08em] text-[#142230] uppercase">
                SALDO OURO
              </div>
              <div className="pearl-pill rounded-full px-4 py-1.5 text-[10.5px] tracking-[0.08em] text-[#142230] uppercase">
                SALDO GEMAS
              </div>
            </div>

            <RoyalButton
              className="min-w-[190px]"
              innerClassName="py-2.5 px-6 text-[12px] tracking-[0.12em] uppercase"
            >
              CONFIRMAR
            </RoyalButton>
          </div>
        </OrnateWindow>

        {/* RIGHT COLUMN: MENU + MODAL (4 cols) */}
        <div className="lg:col-span-4 flex flex-col justify-between gap-5">
          <OrnateWindow
            title="MENU"
            onClose={() => {}}
            bodyClassName="px-6 pt-3 pb-6 gap-3 justify-center"
          >
            <RoyalButton
              className="w-full"
              innerClassName="py-3 px-6 text-[13px] tracking-[0.12em] uppercase"
            >
              CONTINUAR
            </RoyalButton>
            <PearlButton
              className="w-full"
              innerClassName="py-3 px-6 text-[13px] tracking-[0.1em] uppercase"
            >
              CONFIGURAÇÕES
            </PearlButton>
            <PearlButton
              className="w-full"
              innerClassName="py-3 px-6 text-[13px] tracking-[0.1em] uppercase"
            >
              SAIR
            </PearlButton>
          </OrnateWindow>

          <OrnateWindow
            title="CONFIRMAÇÃO"
            onClose={() => {}}
            bodyClassName="px-6 pt-3 pb-6 gap-4 justify-between"
          >
            <WireSlot label="MENSAGEM DO MODAL" className="w-full h-[110px]" />
            <div className="grid grid-cols-2 gap-3">
              <PearlButton innerClassName="py-2.5 px-4 text-[11.5px] tracking-[0.1em] uppercase">
                CANCELAR
              </PearlButton>
              <RoyalButton innerClassName="py-2.5 px-4 text-[11.5px] tracking-[0.1em] uppercase">
                CONFIRMAR
              </RoyalButton>
            </div>
          </OrnateWindow>
        </div>
      </div>

      {/* Bottom COMPONENTES DA INTERFACE Structural Bar */}
      <div className="w-full rounded-[20px] p-[2.5px] bg-gradient-to-b from-[#e5c77b] via-[#9e7628] to-[#d6b25e] shadow-xl">
        <div className="bg-[#051a33] rounded-[18px] px-5 py-4 border border-[#f7e29c]/30 flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <span
              className="text-[13px] tracking-[0.16em] text-[#f2ebd9] uppercase"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              COMPONENTES DA INTERFACE
            </span>
            <div className="h-[1px] flex-1 bg-gradient-to-r from-[#d4b062] to-transparent" />
            <DiamondAccentSvg className="w-3.5 h-3.5" />
            <div className="h-[1px] flex-1 bg-gradient-to-l from-[#d4b062] to-transparent" />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4">
            {/* ABAS */}
            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] tracking-[0.12em] text-[#d8ceb8] uppercase">
                ABAS
              </span>
              <div className="flex items-center gap-2">
                {showcaseTab === 'left' ? (
                  <RoyalButton
                    onClick={() => setShowcaseTab('left')}
                    innerClassName="py-1.5 px-4 text-[10.5px] uppercase"
                  >
                    SELECIONADA
                  </RoyalButton>
                ) : (
                  <PearlButton
                    onClick={() => setShowcaseTab('left')}
                    innerClassName="py-1.5 px-4 text-[10.5px] uppercase"
                  >
                    SELECIONADA
                  </PearlButton>
                )}
                {showcaseTab === 'right' ? (
                  <RoyalButton
                    onClick={() => setShowcaseTab('right')}
                    innerClassName="py-1.5 px-4 text-[10.5px] uppercase"
                  >
                    NÃO SELECIONADA
                  </RoyalButton>
                ) : (
                  <PearlButton
                    onClick={() => setShowcaseTab('right')}
                    innerClassName="py-1.5 px-4 text-[10.5px] uppercase"
                  >
                    NÃO SELECIONADA
                  </PearlButton>
                )}
              </div>
            </div>

            {/* BOTÕES */}
            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] tracking-[0.12em] text-[#d8ceb8] uppercase">
                BOTÕES
              </span>
              <div className="flex items-center gap-2">
                <RoyalButton innerClassName="py-1.5 px-4 text-[10.5px] uppercase">
                  PRIMÁRIO
                </RoyalButton>
                <PearlButton innerClassName="py-1.5 px-4 text-[10.5px] uppercase">
                  SECUNDÁRIO
                </PearlButton>
                <div className="rounded-full px-4 py-1.5 bg-[#4f565e] border border-[#6e7680] text-[10.5px] tracking-[0.08em] text-[#9aa2ab] uppercase">
                  DESABILITADO
                </div>
              </div>
            </div>

            {/* FECHAR */}
            <div className="flex flex-col items-center gap-1.5">
              <span className="text-[10px] tracking-[0.12em] text-[#d8ceb8] uppercase">
                FECHAR
              </span>
              <CloseCircleButton />
            </div>

            {/* SLOTS DE ITEM */}
            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] tracking-[0.12em] text-[#d8ceb8] uppercase">
                SLOTS DE ITEM
              </span>
              <div className="flex items-center gap-3">
                <div className="flex flex-col items-center gap-1">
                  <WireSlot className="w-12 h-12" />
                  <span className="text-[9px] tracking-[0.1em] text-[#d8ceb8] uppercase">
                    COMUM
                  </span>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <WireSlot className="w-12 h-12 border-[#6cc4ff] shadow-[0_0_12px_rgba(108,196,255,0.5)]" />
                  <span className="text-[9px] tracking-[0.1em] text-[#d8ceb8] uppercase">
                    RARO
                  </span>
                </div>
              </div>
            </div>

            {/* BARRAS DE STATUS */}
            <div className="flex flex-col gap-2 min-w-[210px]">
              <span className="text-[10px] tracking-[0.12em] text-[#d8ceb8] uppercase">
                BARRAS DE STATUS
              </span>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-[#f2ebd9] w-10">VIDA</span>
                <div className="wire-slot flex-1 h-3 rounded-full" />
                <span className="text-[11px] text-[#f2ebd9] tabular-nums">120 / 120</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-[#f2ebd9] w-10">MANA</span>
                <div className="wire-slot flex-1 h-3 rounded-full" />
                <span className="text-[11px] text-[#f2ebd9] tabular-nums">80 / 80</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
