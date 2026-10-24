import React, { useState } from 'react';
import {
  OrnateWindow,
  WireSlot,
  RoyalButton,
  PearlButton,
  GoldDividerH,
  SheetTitleHeader,
} from './OrnateWindowFrame';

export const Screen04PerfilAcademiaAjustes: React.FC = () => {
  const [academiaTab, setAcademiaTab] = useState<'FUNDAMENTOS' | 'COMBOS' | 'CHEFES'>('FUNDAMENTOS');
  const [ajustesTab, setAjustesTab] = useState<'ÁUDIO' | 'IDIOMA' | 'GRÁFICOS'>('ÁUDIO');
  const [volGeral, setVolGeral] = useState(72);
  const [volMusica, setVolMusica] = useState(72);
  const [volEfeitos, setVolEfeitos] = useState(62);
  const [particulas, setParticulas] = useState(false);
  const [holografia, setHolografia] = useState(false);
  const [sombras, setSombras] = useState(false);

  return (
    <div className="w-full flex flex-col">
      <SheetTitleHeader title="PERFIL · ACADEMIA · AJUSTES" />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-stretch">
        {/* ==================== 1. LEFT WINDOW: PERFIL ==================== */}
        <OrnateWindow
          title="PERFIL"
          bodyClassName="px-5 pt-3 pb-5 gap-3 justify-between"
        >
          {/* Top Avatar + Player Info */}
          <div className="flex items-center gap-3.5">
            <div className="rounded-full p-1 border border-[#c9ab6c] bg-[#f7f1e3] shrink-0">
              <WireSlot
                plus
                circle
                label="AVATAR"
                className="w-[108px] h-[108px]"
              />
            </div>

            <div className="flex-1 flex flex-col gap-2">
              <div>
                <span
                  className="text-[10px] font-semibold tracking-[0.08em] text-[#0c1e33] uppercase block mb-1"
                  style={{ fontFamily: 'var(--font-display)' }}
                >
                  NOME DO JOGADOR
                </span>
                <div className="pearl-pill rounded-[7px] px-3 py-2 text-[10px] tracking-[0.06em] text-[#3a434d] uppercase">
                  NOME DO JOGADOR
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span
                  className="text-[10px] font-semibold tracking-[0.08em] text-[#0c1e33] uppercase"
                  style={{ fontFamily: 'var(--font-display)' }}
                >
                  NÍVEL
                </span>
                <div className="pearl-pill rounded-[7px] px-4 py-1.5 text-[10px] tracking-[0.06em] text-[#3a434d] uppercase">
                  NÍVEL
                </div>
              </div>

              <div>
                <span
                  className="text-[10px] font-semibold tracking-[0.08em] text-[#0c1e33] uppercase block mb-1"
                  style={{ fontFamily: 'var(--font-display)' }}
                >
                  EXP
                </span>
                <div className="w-full h-3 rounded-full bg-[#c9cdd2] overflow-hidden flex">
                  <div className="w-1/4 h-full bg-[#062356] rounded-full" />
                </div>
              </div>
            </div>
          </div>

          <GoldDividerH className="my-0.5" />

          {/* 2x2 Stats Cards Grid */}
          <div className="grid grid-cols-2 gap-2.5">
            {(['VITÓRIAS', 'DERROTAS', 'CARTAS', 'ARTEFATOS'] as const).map((stat) => (
              <div
                key={stat}
                className="pearl-subcard rounded-[11px] p-3 flex flex-col items-center gap-2"
              >
                <span
                  className="text-[10.5px] font-semibold tracking-[0.08em] text-[#0c1e33] uppercase"
                  style={{ fontFamily: 'var(--font-display)' }}
                >
                  {stat}
                </span>
                <div className="wire-slot w-full py-2 rounded-[6px] text-[13px] text-[#555d66]">
                  —
                </div>
              </div>
            ))}
          </div>

          <GoldDividerH className="my-0.5" />

          {/* 2 Buttons Row: CONQUISTAS | CONFIGURAÇÕES */}
          <div className="grid grid-cols-2 gap-2.5">
            <RoyalButton innerClassName="py-2.5 px-3 text-[11px] tracking-[0.1em] uppercase">
              CONQUISTAS
            </RoyalButton>
            <PearlButton innerClassName="py-2.5 px-3 text-[11px] tracking-[0.1em] uppercase">
              CONFIGURAÇÕES
            </PearlButton>
          </div>

          {/* Bottom CONQUISTAS Insignia Box */}
          <div className="pearl-subcard rounded-[13px] p-3 flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <span
                className="text-[10.5px] font-semibold tracking-[0.08em] text-[#0c1e33] uppercase"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                CONQUISTAS
              </span>
              <button
                type="button"
                className="text-[9.5px] tracking-[0.06em] text-[#172536] uppercase flex items-center gap-1 cursor-pointer"
              >
                <span>VER TODAS</span>
                <span>›</span>
              </button>
            </div>

            <div className="grid grid-cols-5 gap-2">
              {Array.from({ length: 5 }).map((_, idx) => (
                <div key={idx} className="flex flex-col items-center gap-1">
                  <WireSlot plus circle className="w-[50px] h-[50px]" />
                  <span
                    className="text-[8px] tracking-[0.06em] text-[#172536] uppercase"
                    style={{ fontFamily: 'var(--font-display)' }}
                  >
                    INSÍGNIA
                  </span>
                </div>
              ))}
            </div>
          </div>
        </OrnateWindow>

        {/* ==================== 2. MIDDLE WINDOW: ACADEMIA ==================== */}
        <OrnateWindow
          title="ACADEMIA"
          bodyClassName="px-5 pt-3 pb-5 gap-3 justify-between"
        >
          {/* 3 Segmented Tabs: FUNDAMENTOS | COMBOS | CHEFES */}
          <div className="pearl-pill rounded-full p-0.5 grid grid-cols-3">
            {(['FUNDAMENTOS', 'COMBOS', 'CHEFES'] as const).map((tab) =>
              academiaTab === tab ? (
                <RoyalButton
                  key={tab}
                  onClick={() => setAcademiaTab(tab)}
                  innerClassName="py-2 px-2 text-[10.5px]"
                >
                  {tab}
                </RoyalButton>
              ) : (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setAcademiaTab(tab)}
                  className="py-2 px-2 text-[10.5px] tracking-[0.06em] text-[#142230] uppercase cursor-pointer"
                >
                  {tab}
                </button>
              )
            )}
          </div>

          {/* 3 Lesson Cards */}
          <div className="flex flex-col gap-2.5">
            {[
              { title: 'INVOCAÇÃO', btn: 'INICIAR' },
              { title: 'MANA E VIGOR', btn: 'CONTINUAR' },
              { title: 'COMBATE', btn: 'INICIAR' },
            ].map((lesson) => (
              <div
                key={lesson.title}
                className="pearl-subcard rounded-[13px] p-2.5 flex items-center gap-3"
              >
                <WireSlot
                  plus
                  label="BANNER"
                  className="w-[88px] h-[88px] shrink-0"
                />
                <div className="flex-1 flex flex-col justify-between gap-2">
                  <h4
                    className="text-[13px] font-semibold tracking-[0.08em] text-[#0c1e33] uppercase"
                    style={{ fontFamily: 'var(--font-display)' }}
                  >
                    {lesson.title}
                  </h4>
                  <div className="wire-bar w-4/5 h-2.5" />
                  <div className="wire-bar w-3/5 h-2.5" />
                  <div className="flex items-center gap-2 pt-0.5">
                    <div className="flex-1 h-3 rounded-full bg-[#c9cdd2] overflow-hidden">
                      <div className="w-5/12 h-full bg-[#062356] rounded-full" />
                    </div>
                  </div>
                </div>
                <div className="self-end">
                  <RoyalButton innerClassName="py-2 px-5 text-[10.5px] tracking-[0.1em] uppercase">
                    {lesson.btn}
                  </RoyalButton>
                </div>
              </div>
            ))}
          </div>

          <GoldDividerH className="my-0.5" />

          {/* Bottom DETALHES DA LIÇÃO Box */}
          <div className="pearl-subcard rounded-[13px] p-3 flex flex-col gap-2">
            <span
              className="text-[10.5px] font-semibold tracking-[0.08em] text-[#0c1e33] uppercase"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              DETALHES DA LIÇÃO
            </span>
            <div className="flex items-center gap-3">
              <WireSlot
                plus
                label="BANNER"
                className="w-[104px] h-[78px] shrink-0"
              />
              <div className="flex-1 flex flex-col gap-2">
                <div className="wire-bar w-full h-2.5" />
                <div className="wire-bar w-4/5 h-2.5" />
                <div className="flex items-center justify-between gap-2 pt-1">
                  <div className="wire-bar w-1/2 h-2.5" />
                  <RoyalButton innerClassName="py-1.5 px-5 text-[10.5px] tracking-[0.1em] uppercase">
                    PRATICAR
                  </RoyalButton>
                </div>
              </div>
            </div>
          </div>
        </OrnateWindow>

        {/* ==================== 3. RIGHT WINDOW: AJUSTES ==================== */}
        <OrnateWindow
          title="AJUSTES"
          bodyClassName="px-5 pt-3 pb-5 gap-3 justify-between"
        >
          {/* 3 Segmented Tabs: ÁUDIO | IDIOMA | GRÁFICOS */}
          <div className="pearl-pill rounded-full p-0.5 grid grid-cols-3">
            {(['ÁUDIO', 'IDIOMA', 'GRÁFICOS'] as const).map((tab) =>
              ajustesTab === tab ? (
                <RoyalButton
                  key={tab}
                  onClick={() => setAjustesTab(tab)}
                  innerClassName="py-2 px-2 text-[10.5px]"
                >
                  {tab}
                </RoyalButton>
              ) : (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setAjustesTab(tab)}
                  className="py-2 px-2 text-[10.5px] tracking-[0.06em] text-[#142230] uppercase cursor-pointer"
                >
                  {tab}
                </button>
              )
            )}
          </div>

          {/* Audio Sliders Card */}
          <div className="pearl-subcard rounded-[13px] p-3.5 flex flex-col gap-3.5">
            {[
              { label: 'GERAL', val: volGeral, set: setVolGeral },
              { label: 'MÚSICA', val: volMusica, set: setVolMusica },
              { label: 'EFEITOS', val: volEfeitos, set: setVolEfeitos },
            ].map((row) => (
              <div key={row.label} className="flex items-center gap-3">
                <span
                  className="text-[11px] font-semibold tracking-[0.08em] text-[#0c1e33] uppercase w-16"
                  style={{ fontFamily: 'var(--font-display)' }}
                >
                  {row.label}
                </span>
                {/* Speaker Icon */}
                <svg
                  viewBox="0 0 24 24"
                  className="w-4 h-4 text-[#091e3a] shrink-0"
                  fill="currentColor"
                >
                  <path d="M11 5L6 9H2v6h4l5 4V5zM15.54 8.46a5 5 0 010 7.07l1.41 1.41a7 7 0 000-9.9l-1.41 1.42z" />
                </svg>
                {/* Interactive Custom Slider */}
                <div
                  onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const pct = Math.max(
                      10,
                      Math.min(95, Math.round(((e.clientX - rect.left) / rect.width) * 100))
                    );
                    row.set(pct);
                  }}
                  className="flex-1 h-2.5 rounded-full bg-[#c9cdd2] relative flex items-center cursor-pointer"
                >
                  <div
                    className="h-full rounded-full bg-[#062356]"
                    style={{ width: `${row.val}%` }}
                  />
                  <div
                    className="w-5 h-5 rounded-full bg-[#fbf6ea] border-2 border-[#c89838] shadow absolute -translate-x-1/2"
                    style={{ left: `${row.val}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          <GoldDividerH className="my-0.5" />

          {/* IDIOMA Section */}
          <div className="pearl-subcard rounded-[13px] p-3 flex flex-col gap-2">
            <span
              className="text-[11px] font-semibold tracking-[0.08em] text-[#0c1e33] uppercase"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              IDIOMA
            </span>
            <div className="pearl-pill rounded-[8px] px-3.5 py-2 flex items-center justify-between text-[12px] text-[#142230]">
              <span>Português</span>
              <span>⌄</span>
            </div>
          </div>

          <GoldDividerH className="my-0.5" />

          {/* GRÁFICOS Section */}
          <div className="pearl-subcard rounded-[13px] p-3.5 flex flex-col gap-2.5">
            <span
              className="text-[11px] font-semibold tracking-[0.08em] text-[#0c1e33] uppercase"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              GRÁFICOS
            </span>

            {[
              { label: 'PARTÍCULAS', val: particulas, set: setParticulas },
              { label: 'HOLOGRAFIA', val: holografia, set: setHolografia },
              { label: 'SOMBRAS', val: sombras, set: setSombras },
            ].map((tog) => (
              <div
                key={tog.label}
                className="flex items-center justify-between py-0.5 border-b border-[#e5d8be]/60 last:border-none"
              >
                <span
                  className="text-[10.5px] tracking-[0.06em] text-[#142230] uppercase"
                  style={{ fontFamily: 'var(--font-display)' }}
                >
                  {tog.label}
                </span>
                <button
                  type="button"
                  onClick={() => tog.set((v) => !v)}
                  className={`w-10 h-5 rounded-full p-0.5 transition-colors cursor-pointer ${
                    tog.val ? 'bg-[#062356]' : 'bg-[#989ea6]'
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full bg-white shadow transition-transform ${
                      tog.val ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            ))}

            <div className="flex items-center justify-between gap-3 pt-1">
              <span
                className="text-[10.5px] tracking-[0.06em] text-[#142230] uppercase"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                QUALIDADE
              </span>
              <div className="pearl-pill rounded-[8px] px-3.5 py-1.5 flex-1 flex items-center justify-between text-[11.5px] text-[#142230]">
                <span>Qualidade</span>
                <span>⌄</span>
              </div>
            </div>
          </div>

          {/* Bottom Buttons: APLICAR | RESTAURAR PADRÕES */}
          <div className="grid grid-cols-2 gap-2.5 pt-1">
            <RoyalButton innerClassName="py-2.5 px-3 text-[11px] tracking-[0.1em] uppercase">
              APLICAR
            </RoyalButton>
            <PearlButton innerClassName="py-2.5 px-3 text-[10.5px] tracking-[0.08em] uppercase">
              RESTAURAR PADRÕES
            </PearlButton>
          </div>
        </OrnateWindow>
      </div>
    </div>
  );
};
