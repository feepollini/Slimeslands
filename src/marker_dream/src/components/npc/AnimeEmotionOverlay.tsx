import React from 'react';
import { NpcEmotionType } from '../../types/map';

interface AnimeEmotionOverlayProps {
  emotion?: NpcEmotionType;
  intensity?: number;
  isPlayerIdle?: boolean;
  playerIdleType?: 'zzz' | 'sweat' | 'dots' | 'sparkle' | null;
  size?: number; // Tamanho de referência do personagem em px
  className?: string;
}

export const AnimeEmotionOverlay: React.FC<AnimeEmotionOverlayProps> = ({
  emotion,
  intensity = 1.0,
  isPlayerIdle = false,
  playerIdleType,
  size = 64,
  className = '',
}) => {
  // 1. Emoções de Anime do Jogador em Idle
  if (isPlayerIdle && playerIdleType) {
    if (playerIdleType === 'zzz') {
      return (
        <div
          className={`absolute -top-7 right-1 pointer-events-none z-30 select-none animate-float-fade ${className}`}
          style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.4))' }}
        >
          <div className="flex items-end gap-0.5 font-black text-sky-300 drop-shadow-md italic">
            <span className="text-[10px] animate-pulse">z</span>
            <span className="text-xs">Z</span>
            <span className="text-sm">Z</span>
            <span className="text-base text-sky-200">~</span>
          </div>
        </div>
      );
    }

    if (playerIdleType === 'sweat') {
      return (
        <div className={`absolute -top-3.5 right-0 pointer-events-none z-30 select-none ${className}`}>
          <svg
            className="w-5 h-6 animate-sweat-wobble"
            viewBox="0 0 24 30"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.35))' }}
          >
            <path
              d="M12 2 C12 2, 3 14, 3 20 C3 25 7 29 12 29 C17 29 21 25 21 20 C21 14, 12 2 12 2 Z"
              fill="url(#sweatGradient)"
              stroke="#0284c7"
              strokeWidth="1.8"
            />
            <path
              d="M8 18 C8 15, 11 9, 12 6"
              stroke="#ffffff"
              strokeWidth="1.8"
              strokeLinecap="round"
              opacity="0.85"
            />
            <defs>
              <linearGradient id="sweatGradient" x1="12" y1="2" x2="12" y2="29" gradientUnits="userSpaceOnUse">
                <stop stopColor="#bae6fd" />
                <stop offset="1" stopColor="#38bdf8" />
              </linearGradient>
            </defs>
          </svg>
        </div>
      );
    }

    if (playerIdleType === 'dots') {
      return (
        <div
          className={`absolute -top-6 left-1/2 -translate-x-1/2 pointer-events-none z-30 select-none ${className}`}
          style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.4))' }}
        >
          <div className="bg-slate-900/90 border border-slate-600 rounded-full px-2 py-0.5 flex items-center gap-1 shadow-lg">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-300 animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="w-1.5 h-1.5 rounded-full bg-slate-300 animate-bounce" style={{ animationDelay: '150ms' }} />
            <span className="w-1.5 h-1.5 rounded-full bg-slate-300 animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        </div>
      );
    }

    if (playerIdleType === 'sparkle') {
      return (
        <div className={`absolute -top-6 -right-2 pointer-events-none z-30 select-none animate-bounce ${className}`}>
          <span className="text-base filter drop-shadow">✨</span>
        </div>
      );
    }
  }

  // 2. Camada Visual de Emoções do NPC (Estilo Anime Autêntico)
  if (!emotion || emotion === 'neutral') return null;

  switch (emotion) {
    case 'angry': // 💢 Veia de raiva pulsante de anime (Cross Vein Pop)
      return (
        <div
          className={`absolute -top-5 right-0 pointer-events-none z-30 select-none animate-vein-pop ${className}`}
          style={{
            transform: `scale(${0.9 + intensity * 0.3})`,
            filter: 'drop-shadow(0 2px 5px rgba(220, 38, 38, 0.6))',
          }}
        >
          <svg className="w-6 h-6" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* Linhas curvas em cruz vermelha clássica de anime */}
            <path
              d="M7 11 C11 11, 14 8, 14 4 M18 4 C18 8, 21 11, 25 11 M25 21 C21 21, 18 24, 18 28 M14 28 C14 24, 11 21, 7 21"
              stroke="#ef4444"
              strokeWidth="4"
              strokeLinecap="round"
            />
            <path
              d="M10 16 H22 M16 10 V22"
              stroke="#dc2626"
              strokeWidth="3.5"
              strokeLinecap="round"
            />
            {/* Realce interno branco */}
            <path
              d="M8 12 C11 12, 13 10, 13 6"
              stroke="#ffffff"
              strokeWidth="1.2"
              strokeLinecap="round"
            />
          </svg>
        </div>
      );

    case 'fear': // 💧 Gota de suor e pânico escorrendo / tremendo de pavor
      return (
        <div
          className={`absolute -top-6 -right-1 pointer-events-none z-30 select-none animate-panic-tremble ${className}`}
          style={{
            transform: `scale(${0.95 + intensity * 0.35})`,
            filter: 'drop-shadow(0 3px 6px rgba(14, 165, 233, 0.45))',
          }}
        >
          <div className="relative">
            <svg className="w-6 h-8 animate-sweat-wobble" viewBox="0 0 24 30" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M12 2 C12 2, 3 14, 3 20 C3 25 7 29 12 29 C17 29 21 25 21 20 C21 14, 12 2 12 2 Z"
                fill="url(#sweatGradientNpc)"
                stroke="#0369a1"
                strokeWidth="2.2"
              />
              <path
                d="M8 18 C8 15, 11 9, 12 6"
                stroke="#ffffff"
                strokeWidth="2"
                strokeLinecap="round"
                opacity="0.95"
              />
              <defs>
                <linearGradient id="sweatGradientNpc" x1="12" y1="2" x2="12" y2="29" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#e0f2fe" />
                  <stop offset="0.6" stopColor="#38bdf8" />
                  <stop offset="1" stopColor="#0284c7" />
                </linearGradient>
              </defs>
            </svg>
            {/* Linhas de pânico verticais no topo */}
            <div className="absolute -top-2 left-1/2 -translate-x-1/2 flex gap-1">
              <span className="w-0.5 h-2 bg-sky-400 opacity-80" />
              <span className="w-0.5 h-3 bg-sky-400 opacity-90" />
              <span className="w-0.5 h-2 bg-sky-400 opacity-80" />
            </div>
          </div>
        </div>
      );

    case 'alert': // ❗ Ponto de exclamação de alerta / susto estilizado
      return (
        <div
          className={`absolute -top-7 left-1/2 -translate-x-1/2 pointer-events-none z-30 select-none animate-bounce ${className}`}
          style={{
            transform: `scale(${0.9 + intensity * 0.3})`,
            filter: 'drop-shadow(0 3px 6px rgba(234, 88, 12, 0.5))',
          }}
        >
          <div className="bg-gradient-to-t from-red-600 to-amber-400 text-white font-black text-sm px-1.5 py-0.5 rounded-full border-2 border-white shadow-xl flex items-center justify-center min-w-5 h-6">
            !
          </div>
        </div>
      );

    case 'confused': // ❓ Ponto de interrogação com balanço de dúvida
      return (
        <div
          className={`absolute -top-6 left-1/2 -translate-x-1/2 pointer-events-none z-30 select-none animate-question-bob ${className}`}
          style={{
            transform: `scale(${0.9 + intensity * 0.25})`,
            filter: 'drop-shadow(0 2px 5px rgba(168, 85, 247, 0.4))',
          }}
        >
          <div className="bg-gradient-to-t from-purple-600 to-indigo-400 text-white font-black text-xs px-1.5 py-0.5 rounded-full border border-white shadow-md">
            ?
          </div>
        </div>
      );

    case 'curious':
    case 'happy': // ✨💖 Brilhos e coração flutuante de afeto/curiosidade
      return (
        <div
          className={`absolute -top-6 -right-2 pointer-events-none z-30 select-none animate-float-fade ${className}`}
          style={{
            transform: `scale(${0.9 + intensity * 0.3})`,
            filter: 'drop-shadow(0 2px 4px rgba(236, 72, 153, 0.4))',
          }}
        >
          <div className="flex items-center gap-0.5">
            <span className="text-sm">💖</span>
            <span className="text-xs text-amber-300 animate-spin" style={{ animationDuration: '4s' }}>✨</span>
          </div>
        </div>
      );

    default:
      return null;
  }
};
