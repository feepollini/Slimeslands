import React, { useEffect, useState } from 'react';
import {
  DEFAULT_VIEWPORT_VARIABLES,
  detectDialogueViewportMode,
  type DialogueButtonVariant,
  type DialogueViewportMode,
  type OrnateDialogueBubbleProps,
  type DialogueOptionItem,
  type QuestBadgeInfo,
  type ViewportScreenVariables,
} from '../../types/dialogue';

export type {
  DialogueButtonVariant,
  DialogueViewportMode,
  OrnateDialogueBubbleProps,
  DialogueOptionItem,
  QuestBadgeInfo,
  ViewportScreenVariables,
};
export { DEFAULT_VIEWPORT_VARIABLES, detectDialogueViewportMode };

/**
 * Estrela Concava de 4 Pontas (SVG fiel à arte original)
 */
const FourPointStar: React.FC<{
  size?: number;
  variant?: 'gold_top' | 'gold' | 'mint' | 'rose' | 'lilac';
  className?: string;
  idSuffix?: string;
}> = ({ size = 16, variant = 'gold', className = '', idSuffix = 'star' }) => {
  const gradId = `star-grad-${variant}-${idSuffix}`;

  const stops: Record<string, [string, string, string]> = {
    gold_top: ['#fff7b2', '#f5c731', '#c79214'],
    gold: ['#fff5a5', '#f3c328', '#c89212'],
    mint: ['#d1fae5', '#6ee7b7', '#10b981'],
    rose: ['#ffe4e6', '#fda4af', '#f43f5e'],
    lilac: ['#f5f3ff', '#ddd6fe', '#a78bfa'],
  };

  const [c1, c2, c3] = stops[variant] || stops.gold;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 select-none pointer-events-none ${className}`}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={gradId} x1="6" y1="4" x2="26" y2="28" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor={c1} />
          <stop offset="52%" stopColor={c2} />
          <stop offset="100%" stopColor={c3} />
        </linearGradient>
      </defs>
      <path
        d="M16 1C17.8 10.6 21.4 14.2 31 16C21.4 17.8 17.8 21.4 16 31C14.2 21.4 10.6 17.8 1 16C10.6 14.2 14.2 10.6 16 1Z"
        fill={`url(#${gradId})`}
      />
      <path
        d="M16 1C16.9 10.6 14.2 14.2 1 16C10.6 14.2 14.2 10.6 16 1Z"
        fill="#ffffff"
        fillOpacity="0.45"
      />
    </svg>
  );
};

/**
 * Estilos das 5 variantes visuais de botões (variant)
 */
const BUTTON_VARIANT_STYLES: Record<
  DialogueButtonVariant,
  {
    background: string;
    boxShadow: string;
    textColor: string;
    starVariant: 'gold' | 'mint' | 'rose' | 'lilac';
    borderColor: string;
  }
> = {
  primary_sapphire: {
    background: 'linear-gradient(180deg, #033a82 0%, #022b68 55%, #011c47 100%)',
    boxShadow:
      'inset 0 2px 5px rgba(0, 10, 32, 0.78), inset 0 -2px 4px rgba(14, 88, 189, 0.35), 0 4px 10px rgba(0, 0, 0, 0.48)',
    textColor: '#ffffff',
    starVariant: 'gold',
    borderColor: '#f7cc00',
  },
  secondary_pearl: {
    background: 'linear-gradient(180deg, #fffdf8 0%, #f6efe5 62%, #eae0d2 100%)',
    boxShadow:
      'inset -2px -2px 5px rgba(175, 158, 138, 0.45), inset 2px 2px 5px rgba(255, 255, 255, 0.95), 0 4px 10px rgba(0, 0, 0, 0.42)',
    textColor: '#0c2c61',
    starVariant: 'gold',
    borderColor: '#f7cc00',
  },
  emerald_quest: {
    background: 'linear-gradient(180deg, #06b07c 0%, #059669 55%, #046346 100%)',
    boxShadow:
      'inset 0 2px 5px rgba(1, 38, 26, 0.72), inset 0 -2px 4px rgba(52, 211, 153, 0.35), 0 4px 10px rgba(0, 0, 0, 0.48)',
    textColor: '#ffffff',
    starVariant: 'mint',
    borderColor: '#f7cc00',
  },
  crimson_duel: {
    background: 'linear-gradient(180deg, #f43f5e 0%, #e11d48 55%, #9f1239 100%)',
    boxShadow:
      'inset 0 2px 5px rgba(58, 4, 18, 0.75), inset 0 -2px 4px rgba(251, 113, 133, 0.35), 0 4px 10px rgba(0, 0, 0, 0.48)',
    textColor: '#ffffff',
    starVariant: 'rose',
    borderColor: '#f7cc00',
  },
  amethyst_travel: {
    background: 'linear-gradient(180deg, #9d74f7 0%, #8b5cf6 55%, #5b21b6 100%)',
    boxShadow:
      'inset 0 2px 5px rgba(32, 10, 74, 0.75), inset 0 -2px 4px rgba(196, 181, 253, 0.35), 0 4px 10px rgba(0, 0, 0, 0.48)',
    textColor: '#ffffff',
    starVariant: 'lilac',
    borderColor: '#f7cc00',
  },
};

/**
 * Cores semânticas para o QuestBadgeInfo
 */
const QUEST_BADGE_STYLES: Record<
  QuestBadgeInfo['status'],
  { bg: string; text: string; border: string }
> = {
  INITIAL_OFFER: {
    bg: 'linear-gradient(180deg, #033a82, #022b68)',
    text: '#fef08a',
    border: '#facc15',
  },
  IN_PROGRESS: {
    bg: 'linear-gradient(180deg, #92400e, #78350f)',
    text: '#fde68a',
    border: '#f59e0b',
  },
  READY: {
    bg: 'linear-gradient(180deg, #059669, #065f46)',
    text: '#a7f3d0',
    border: '#34d399',
  },
  COMPLETED: {
    bg: 'linear-gradient(180deg, #334155, #1e293b)',
    text: '#e2e8f0',
    border: '#94a3b8',
  },
};

export const OrnateDialogueBubble: React.FC<OrnateDialogueBubbleProps> = ({
  speakerName,
  characterPng,
  characterScale = 1.0,
  characterOffsetX = 0,
  characterOffsetY = 0,
  fallbackColor = '#6d28d9',
  displayedText,
  fullText,
  isTypingComplete,
  options,
  questInfo = null,
  customMotionAsset,
  viewportMode = 'desktop_landscape',
  viewportVariables,
  viewportConfigMap = DEFAULT_VIEWPORT_VARIABLES,
  currentStepIndex = 0,
  totalSteps = 1,
  onSkipTyping,
  referencePlaceholderMode = false,
}) => {
  const [autoDetectedMode, setAutoDetectedMode] = useState<DialogueViewportMode>('desktop_landscape');
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    setImgError(false);
  }, [characterPng]);

  useEffect(() => {
    if (viewportMode !== 'auto') return;
    const handleResize = () => {
      setAutoDetectedMode(detectDialogueViewportMode(window.innerWidth, window.innerHeight));
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [viewportMode]);

  const activeMode: DialogueViewportMode =
    viewportMode === 'auto' ? autoDetectedMode : viewportMode;

  const screenVars: ViewportScreenVariables = {
    ...viewportConfigMap[activeMode],
    ...(viewportVariables || {}),
  };

  const visibleOptions = options.slice(0, 3);
  const optionCount = visibleOptions.length;
  const isThreeButtons = optionCount === 3;

  const totalOffsetX = screenVars.avatarScreenOffsetX + characterOffsetX;
  const totalOffsetY = screenVars.avatarScreenOffsetY + characterOffsetY;
  const isCompactPortrait = activeMode === 'mobile_portrait';

  // Garante que o início do espaço de texto sempre respeite a borda direita real do personagem + margem generosa
  const avatarVisualRightEdge = Math.round(
    screenVars.avatarSize * 0.96 * characterScale + totalOffsetX + (isCompactPortrait ? 16 : 24)
  );
  const effectivePaddingLeft = Math.max(screenVars.contentPaddingLeft, avatarVisualRightEdge);

  // Compensação óptica horizontal para centralizar o conjunto (Avatar + Cápsula) perfeitamente na tela
  const leftProtrusion = Math.max(0, -totalOffsetX);
  const opticalCenterShiftX = Math.round(leftProtrusion * 0.45);

  // Escalonamento proporcional dos detalhes internos
  const topStarSize = isCompactPortrait ? 20 : 27;
  const topStarOffset = isCompactPortrait ? -11.5 : -15;
  const capsuleBorderWidth = isCompactPortrait ? 2.6 : 3.5;
  const buttonBorderWidth = isCompactPortrait ? 2.1 : isThreeButtons ? 2.4 : 2.8;
  const barHeight = isCompactPortrait ? 5 : 7;
  const barGap = isCompactPortrait ? 4.5 : 6;
  const capsulePadTop = isCompactPortrait ? 8 : 12;
  const capsulePadBottom = isCompactPortrait ? 16 : 22;
  const pillMarginBottom = isCompactPortrait ? 6 : 9;

  // Limites exatos da faixa inferior de botões para NUNCA sobrepor o personagem nem transbordar à direita
  const buttonRowLeft = isThreeButtons
    ? Math.max(avatarVisualRightEdge - 8, effectivePaddingLeft - (isCompactPortrait ? 8 : 12))
    : Math.max(avatarVisualRightEdge - 6, effectivePaddingLeft - (isCompactPortrait ? 6 : 8));

  const buttonRowRight = isThreeButtons
    ? isCompactPortrait
      ? 6
      : 12
    : Math.max(10, screenVars.contentPaddingRight - (isCompactPortrait ? 8 : 14));

  const buttonRowGap = isThreeButtons
    ? isCompactPortrait
      ? 4
      : 8
    : isCompactPortrait
    ? 8
    : 16;

  return (
    <div
      className="relative select-none flex items-center justify-center"
      style={{
        transform: `scale(${screenVars.uiScale})`,
        transformOrigin: 'center center',
        paddingTop: isCompactPortrait ? 18 : 28,
        paddingBottom: isCompactPortrait ? 20 : 28,
      }}
    >
      {/* CONTAINER PRINCIPAL DO BALÃO */}
      <div
        onClick={() => {
          if (!isTypingComplete && onSkipTyping) {
            onSkipTyping();
          }
        }}
        className={`relative transition-transform duration-150 ${
          !isTypingComplete && onSkipTyping ? 'cursor-pointer' : ''
        }`}
        style={{
          width: screenVars.bubbleMaxWidth,
          minHeight: screenVars.bubbleMinHeight,
          marginLeft: opticalCenterShiftX,
          borderRadius: 9999,
          background:
            'linear-gradient(180deg, #f9f1e7 0%, #f7eee4 58%, #efe4d6 100%)',
          border: `${capsuleBorderWidth}px solid #ffd400`,
          boxShadow:
            '0 0 0 1px #b89200, 0 0 12px rgba(255, 212, 0, 0.35), 0 10px 24px rgba(0, 0, 0, 0.65), inset -3px -3px 7px rgba(182, 166, 145, 0.45), inset 2px 2px 5px rgba(255, 255, 255, 0.92)',
          paddingLeft: effectivePaddingLeft,
          paddingRight: screenVars.contentPaddingRight,
          paddingTop: capsulePadTop,
          paddingBottom: capsulePadBottom,
        }}
      >
        {/* ESTRELA DE 4 PONTAS NO TOPO DA BORDA DOURADA (100% LIVRE E DESIMPEDIDA) */}
        <div
          className="absolute z-20 pointer-events-none"
          style={{
            top: topStarOffset,
            left: `calc(${effectivePaddingLeft}px + (100% - ${
              effectivePaddingLeft + screenVars.contentPaddingRight
            }px) / 2)`,
            transform: 'translateX(-50%)',
            filter: 'drop-shadow(0 2px 2px rgba(130, 95, 0, 0.45))',
          }}
        >
          <FourPointStar size={topStarSize} variant="gold_top" idSuffix="top-crest" />
        </div>

        {/* AVATAR DO PERSONAGEM TRANSBORDANDO NA PONTA ESQUERDA DA CÁPSULA */}
        <div
          className="absolute z-30 pointer-events-none flex items-center justify-center"
          style={{
            width: screenVars.avatarSize,
            height: screenVars.avatarSize * 1.03,
            left: totalOffsetX,
            top: '50%',
            transform: `translateY(calc(-50% + ${totalOffsetY}px)) scale(${characterScale})`,
            transformOrigin: 'center center',
          }}
        >
          {customMotionAsset ? (
            <div
              className="w-full h-full flex items-center justify-center"
              style={{
                filter:
                  'drop-shadow(0 0 10px rgba(255, 205, 45, 0.55)) drop-shadow(0 6px 12px rgba(0, 0, 0, 0.5))',
              }}
            >
              {customMotionAsset}
            </div>
          ) : characterPng && !imgError ? (
            <img
              src={characterPng}
              alt={speakerName || 'NPC'}
              referrerPolicy="no-referrer"
              onError={() => setImgError(true)}
              className="w-full h-full object-contain select-none"
              style={{
                filter:
                  'drop-shadow(0 0 8px rgba(255, 205, 45, 0.45)) drop-shadow(0 5px 10px rgba(0, 0, 0, 0.45))',
              }}
            />
          ) : (
            /* Fallback caso o NPC não tenha PNG (usa fallbackColor = marker.color) */
            <div
              className="w-[74%] h-[74%] rounded-full flex flex-col items-center justify-center border-[3px] border-[#ffd400] shadow-xl"
              style={{
                background: `radial-gradient(circle at 35% 30%, ${fallbackColor}, #1e1b4b)`,
                boxShadow:
                  '0 0 18px rgba(255, 212, 0, 0.55), inset 0 2px 8px rgba(255, 255, 255, 0.4)',
              }}
            >
              <span
                className="text-white font-bold text-xl tracking-wider uppercase drop-shadow"
                style={{ fontFamily: "'Cinzel', serif" }}
              >
                {(speakerName || 'NPC').slice(0, 2)}
              </span>
            </div>
          )}
        </div>

        {/* CONTEÚDO CENTRAL (PÍLULA DO NOME + CORPO DE TEXTO + LINHA INFERIOR DE QUEST/PASSOS) */}
        <div className="relative z-10 flex flex-col items-center w-full">
          {/* PÍLULA CENTRAL SUPERIOR (speakerName) */}
          <div
            className="flex items-center justify-center rounded-full px-3 transition-all"
            style={{
              width: screenVars.speakerPillWidth,
              maxWidth: '92%',
              height: screenVars.speakerPillHeight,
              marginBottom: pillMarginBottom,
              backgroundColor: '#dbd4ca',
              boxShadow: 'inset 0 1px 2px rgba(0, 0, 0, 0.08)',
            }}
          >
            {!referencePlaceholderMode && speakerName && (
              <span
                className="truncate text-[#3b3024] font-bold tracking-wider uppercase"
                style={{
                  fontFamily: "'Cinzel', serif",
                  fontSize: Math.max(8.5, screenVars.dialogueFontSize - 2.5),
                  letterSpacing: '0.07em',
                }}
              >
                {speakerName}
              </span>
            )}
          </div>

          {/* CORPO DO DIÁLOGO: MODO FIEL À IMAGEM (BARRAS PLACEHOLDER) OU TEXTO ANIMADO (TYPEWRITER) */}
          {referencePlaceholderMode ? (
            <div
              className="w-full flex flex-col pt-0.5 pb-0.5"
              style={{ gap: barGap }}
            >
              <div
                className="w-full rounded-full"
                style={{ height: barHeight, backgroundColor: '#dbd4ca' }}
              />
              <div
                className="w-full rounded-full"
                style={{ height: barHeight, backgroundColor: '#dbd4ca' }}
              />
              <div
                className="w-full rounded-full"
                style={{ height: barHeight, backgroundColor: '#dbd4ca' }}
              />
              <div className="w-full flex justify-end">
                <div
                  className="rounded-full"
                  style={{
                    width: '17%',
                    minWidth: isCompactPortrait ? 32 : 44,
                    height: barHeight,
                    backgroundColor: '#dbd4ca',
                  }}
                />
              </div>
            </div>
          ) : (
            <div
              className="w-full flex flex-col justify-between"
              style={{ minHeight: isCompactPortrait ? 34 : 46 }}
            >
              <p
                className="text-[#2c2219] font-medium leading-[1.35] text-left select-text"
                style={{
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  fontSize: screenVars.dialogueFontSize,
                }}
                aria-label={fullText}
              >
                {displayedText}
                {!isTypingComplete && (
                  <span className="inline-block ml-1 align-middle animate-pulse text-[#d99b00]">
                    ✦
                  </span>
                )}
              </p>

              {/* RODAPÉ INTERNO DO TEXTO (No mesmo slot da 4ª barra curta da referência):
                  Exibe a cápsula de Quest (questInfo) e os indicadores de passos sem cobrir a estrela do topo! */}
              {(questInfo || totalSteps > 1) && (
                <div className="w-full flex items-center justify-end gap-2 mt-1.5">
                  {questInfo && (
                    <div
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-bold tracking-wider uppercase shadow-sm whitespace-nowrap"
                      style={{
                        fontSize: isCompactPortrait ? 8 : 9.5,
                        background: QUEST_BADGE_STYLES[questInfo.status].bg,
                        color: QUEST_BADGE_STYLES[questInfo.status].text,
                        border: `1px solid ${QUEST_BADGE_STYLES[questInfo.status].border}`,
                        fontFamily: "'Cinzel', serif",
                      }}
                    >
                      <span>✦ {questInfo.label}</span>
                      {questInfo.progressText && !isCompactPortrait && (
                        <span className="opacity-95 font-sans normal-case font-medium">
                          · {questInfo.progressText}
                        </span>
                      )}
                    </div>
                  )}

                  {totalSteps > 1 && (
                    <div className="flex items-center gap-1 shrink-0">
                      {Array.from({ length: totalSteps }).map((_, idx) => (
                        <span
                          key={idx}
                          className="rounded-full transition-all"
                          style={{
                            width: idx === currentStepIndex ? (isCompactPortrait ? 12 : 16) : 5,
                            height: isCompactPortrait ? 4 : 5,
                            backgroundColor:
                              idx === currentStepIndex ? '#b8860b' : '#dbd4ca',
                          }}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* BOTÕES DE AÇÃO NA BORDA INFERIOR (1, 2 ou 3 OPÇÕES CONTIDAS SEM TRANSBORDAR) */}
        <div
          className="absolute z-30 flex items-center justify-center"
          style={{
            bottom: -(screenVars.buttonHeight / 2) - 1,
            left: buttonRowLeft,
            right: buttonRowRight,
            gap: buttonRowGap,
          }}
        >
          {visibleOptions.map((opt, idx) => {
            const style =
              BUTTON_VARIANT_STYLES[opt.variant] ||
              BUTTON_VARIANT_STYLES.primary_sapphire;

            const isLongLabel = opt.label.length > 15;

            const computedFontSize = isThreeButtons
              ? isCompactPortrait
                ? 7.8
                : Math.max(10, screenVars.buttonFontSize - 3.2)
              : isLongLabel
              ? Math.max(isCompactPortrait ? 8.5 : 11, screenVars.buttonFontSize - 2.2)
              : screenVars.buttonFontSize;

            const starSize = isThreeButtons
              ? isCompactPortrait
                ? 8
                : 11
              : Math.max(10, Math.round(computedFontSize * 0.92));

            const horizontalPad = isThreeButtons
              ? isCompactPortrait
                ? 5
                : 9
              : isCompactPortrait
              ? 10
              : 15;

            return (
              <button
                key={opt.id || idx}
                type="button"
                disabled={opt.disabled}
                onClick={(e) => {
                  e.stopPropagation();
                  opt.onClick();
                }}
                className={`group relative flex items-center justify-center rounded-full transition-transform duration-150 hover:scale-[1.02] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 disabled:opacity-50 disabled:pointer-events-none whitespace-nowrap cursor-pointer ${
                  isThreeButtons ? 'flex-1 min-w-0' : 'shrink-0'
                }`}
                style={{
                  minWidth: isThreeButtons ? 0 : screenVars.buttonMinWidth,
                  maxWidth: isThreeButtons ? '33.33%' : optionCount === 2 ? '48.5%' : '100%',
                  height: isThreeButtons
                    ? Math.max(24, screenVars.buttonHeight - (isCompactPortrait ? 2 : 3))
                    : screenVars.buttonHeight,
                  paddingLeft: horizontalPad,
                  paddingRight: horizontalPad,
                  gap: isThreeButtons ? (isCompactPortrait ? 3 : 4.5) : isCompactPortrait ? 5 : 7,
                  background: style.background,
                  border: `${buttonBorderWidth}px solid ${style.borderColor}`,
                  boxShadow: `${style.boxShadow}, 0 0 0 1px #b89200`,
                  color: style.textColor,
                }}
              >
                <FourPointStar
                  size={starSize}
                  variant={style.starVariant}
                  idSuffix={`btn-${idx}`}
                  className="transition-transform duration-200 group-hover:rotate-12 group-hover:scale-110"
                />
                <span
                  className="font-semibold tracking-[0.03em] uppercase truncate"
                  style={{
                    fontFamily: "'Cinzel', 'Cormorant Garamond', serif",
                    fontSize: computedFontSize,
                    textShadow:
                      opt.variant === 'secondary_pearl'
                        ? '0 1px 0 rgba(255,255,255,0.8)'
                        : '0 1px 2px rgba(0, 0, 0, 0.65)',
                  }}
                >
                  {opt.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
