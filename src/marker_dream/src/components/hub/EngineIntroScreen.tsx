import React, { useEffect, useState } from 'react';
import { ArrowRight, MonitorPlay } from 'lucide-react';

interface Props {
  onEnterDashboard: () => void;
  onEnterEditor: () => void;
}

export const EngineIntroScreen: React.FC<Props> = ({
  onEnterDashboard,
  onEnterEditor,
}) => {
  const [animStage, setAnimStage] = useState<number>(0);

  useEffect(() => {
    const t1 = setTimeout(() => setAnimStage(1), 100);
    const t2 = setTimeout(() => setAnimStage(2), 400);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onEnterDashboard();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onEnterDashboard]);

  return (
    <div className="relative w-screen h-screen bg-black text-white flex flex-col justify-between items-center p-8 select-none overflow-hidden">
      {/* Linha técnica sutil de acento superior em 4 cores: vermelho, laranja, verde, azul */}
      <div className="absolute top-0 left-0 w-full h-[2px] flex">
        <div className="h-full flex-1 bg-red-600" />
        <div className="h-full flex-1 bg-orange-500" />
        <div className="h-full flex-1 bg-emerald-500" />
        <div className="h-full flex-1 bg-blue-600" />
      </div>

      {/* Grid preto e branco sutil */}
      <div
        className="absolute inset-0 opacity-[0.04] pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
      />

      {/* Header minimalista P&B */}
      <header className="w-full max-w-5xl flex items-center justify-between z-10 pt-2">
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 rounded-full bg-white" />
          <span className="text-[11px] font-mono tracking-widest text-zinc-400 uppercase">
            Marker Dream
          </span>
        </div>

        <button
          type="button"
          onClick={onEnterEditor}
          className="px-3 py-1.5 rounded-md bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs text-zinc-400 hover:text-white transition-colors flex items-center gap-2 cursor-pointer"
        >
          <MonitorPlay className="w-3.5 h-3.5 text-zinc-300" />
          <span>Editor Direto</span>
        </button>
      </header>

      {/* Centro: Nome da Engine e Subtítulo solicitado */}
      <main className="flex-1 flex flex-col items-center justify-center text-center z-10 max-w-3xl px-4">
        <div
          className={`transition-all duration-700 transform ${
            animStage >= 1 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
          }`}
        >
          {/* Logo Minimalista Geométrico */}
          <div className="w-16 h-16 mx-auto mb-8 rounded-2xl bg-zinc-950 border border-zinc-800 flex items-center justify-center relative shadow-2xl">
            <div className="w-8 h-8 border-2 border-white rounded-lg flex items-center justify-center">
              <div className="w-2.5 h-2.5 bg-orange-500" />
            </div>
            {/* 4 dots coloridos de destaque */}
            <div className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-red-500" />
            <div className="absolute -bottom-1 -left-1 w-2 h-2 rounded-full bg-emerald-500" />
            <div className="absolute -top-1 -left-1 w-2 h-2 rounded-full bg-blue-500" />
          </div>

          {/* Nome da engine exato */}
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-white mb-3 font-display">
            Marker Dream
          </h1>

          {/* Subtítulo exato */}
          <p className="text-xl md:text-2xl font-mono text-zinc-400 tracking-wide">
            a easy game engine
          </p>
        </div>

        {/* Botão de ação para iniciar */}
        <div
          className={`mt-12 transition-all duration-700 delay-150 transform ${
            animStage >= 2 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          } flex flex-col sm:flex-row items-center gap-4`}
        >
          <button
            type="button"
            onClick={onEnterDashboard}
            className="px-8 py-3.5 rounded-lg bg-white hover:bg-zinc-200 text-black font-semibold text-sm tracking-wide transition-all duration-200 flex items-center gap-3 cursor-pointer shadow-lg hover:shadow-white/10 active:scale-98"
          >
            <span>Gerenciador de Fases</span>
            <ArrowRight className="w-4 h-4 text-black" />
          </button>
        </div>
      </main>

      {/* Footer minimalista */}
      <footer className="w-full max-w-5xl flex items-center justify-between text-[11px] text-zinc-500 font-mono z-10 border-t border-zinc-900 pt-4">
        <span>Pressione Enter para iniciar</span>
        <div className="flex items-center gap-3">
          <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
          <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
        </div>
      </footer>
    </div>
  );
};
