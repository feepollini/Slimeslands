import React from 'react';
import {
  ConceptStar,
  ConceptGoldCoinSvg,
  ConceptBlueGemSvg,
  ConceptLeatherBagSvg,
  type BackpackScreenState,
} from '../../screens/backpack_shared/useBackpackScreenState';

export const LandscapeBackpackTopBar: React.FC<{
  state: BackpackScreenState;
  isHubFullScreen?: boolean;
  compactLandscape?: boolean;
}> = ({ state, compactLandscape = false }) => {
  const { topFolderTab, setTopFolderTab, allUnifiedItems, totalSlotsCount, onClose, project } =
    state;

  const goldBalance = project.player?.gold ?? (project as any).gold ?? null;
  const gemsBalance = (project.player as any)?.gems ?? (project as any).gems ?? null;

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        minWidth: 0,
        flexShrink: 0,
        display: 'grid',
        gridTemplateColumns: '48.5% 1fr',
        alignItems: 'stretch',
        gap: compactLandscape ? '6px' : '10px',
      }}
    >
      {/* Estrela Dourada Central de Interseção entre as duas metades do Topo */}
      <div
        style={{
          position: 'absolute',
          left: '48.5%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 25,
          pointerEvents: 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <ConceptStar size={compactLandscape ? 14 : 18} />
      </div>

      {/* METADE ESQUERDA: [ MOCHILA | DECK ]  |  [ ✦ JORNADA ] [ TAREFAS ] */}
      <div
        style={{
          borderRadius: '18px',
          padding: compactLandscape ? '4px 8px' : '6px 12px',
          background: 'linear-gradient(180deg, #fcf9f2 0%, #f2e7d2 100%)',
          border: '2px solid #d4af37',
          outline: '1px solid #784808',
          boxShadow: 'inset 0 1px 0 #ffffff, 0 4px 12px rgba(0, 8, 24, 0.35)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-start',
          gap: compactLandscape ? '6px' : '10px',
          minWidth: 0,
          boxSizing: 'border-box',
        }}
      >
        {/* Cápsula Segmentada Dupla: [ MOCHILA | DECK ] */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            borderRadius: '12px',
            padding: '2px',
            background: 'linear-gradient(180deg, #f5ecd9 0%, #e7d7b9 100%)',
            border: '1.5px solid #d4b475',
            boxShadow: 'inset 0 1px 3px rgba(120, 80, 20, 0.18)',
            flex: '1 1 56%',
            minWidth: 0,
          }}
        >
          {(
            [
              { id: 'equipamento', label: 'MOCHILA' },
              { id: 'deck', label: 'DECK' },
            ] as const
          ).map((tab) => {
            const isActive = topFolderTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setTopFolderTab(tab.id)}
                style={{
                  padding: compactLandscape ? '5px 8px' : '7px 14px',
                  borderRadius: '10px',
                  fontFamily: "'Cinzel', serif",
                  fontWeight: 900,
                  fontSize: compactLandscape ? '10px' : '11.5px',
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  minWidth: 0,
                  whiteSpace: 'nowrap',
                  transition: 'all 0.15s ease',
                  ...(isActive
                    ? {
                        background: 'linear-gradient(180deg, #0b3778 0%, #031536 100%)',
                        border: '1.5px solid #d4af37',
                        color: '#ffffff',
                        boxShadow: '0 2px 6px rgba(3, 21, 54, 0.45), inset 0 1px 0 rgba(255,255,255,0.25)',
                      }
                    : {
                        background: 'transparent',
                        border: '1.5px solid transparent',
                        color: '#0f172a',
                      }),
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Divisor Vertical Fino | */}
        <div
          style={{
            width: '1.5px',
            height: compactLandscape ? '20px' : '24px',
            background: 'linear-gradient(180deg, rgba(146,104,41,0.15), rgba(146,104,41,0.75), rgba(146,104,41,0.15))',
            flexShrink: 0,
          }}
        />

        {/* Botões JORNADA e TAREFAS */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: compactLandscape ? '4px' : '6px',
            flex: '1 1 40%',
            minWidth: 0,
          }}
        >
          <button
            type="button"
            onClick={() => setTopFolderTab('jornada')}
            style={{
              flex: 1,
              padding: compactLandscape ? '5px 8px' : '7px 10px',
              borderRadius: '11px',
              fontFamily: "'Cinzel', serif",
              fontWeight: 900,
              fontSize: compactLandscape ? '9.5px' : '11px',
              textTransform: 'uppercase',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '5px',
              cursor: 'pointer',
              minWidth: 0,
              whiteSpace: 'nowrap',
              ...(topFolderTab === 'jornada'
                ? {
                    background: 'linear-gradient(180deg, #0b3778 0%, #031536 100%)',
                    border: '1.5px solid #d4af37',
                    color: '#ffffff',
                    boxShadow: '0 2px 6px rgba(3, 21, 54, 0.4)',
                  }
                : {
                    background: 'linear-gradient(180deg, #faf5e8 0%, #ede0c7 100%)',
                    border: '1px solid #d8c39e',
                    color: '#0f172a',
                  }),
            }}
          >
            <ConceptStar size={compactLandscape ? 11 : 13} />
            <span>JORNADA</span>
          </button>

          <button
            type="button"
            onClick={() => setTopFolderTab('tarefas')}
            style={{
              padding: compactLandscape ? '5px 7px' : '7px 9px',
              borderRadius: '11px',
              fontFamily: "'Cinzel', serif",
              fontWeight: 900,
              fontSize: compactLandscape ? '9px' : '10px',
              textTransform: 'uppercase',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              minWidth: 0,
              whiteSpace: 'nowrap',
              ...(topFolderTab === 'tarefas'
                ? {
                    background: 'linear-gradient(180deg, #0b3778 0%, #031536 100%)',
                    border: '1.5px solid #d4af37',
                    color: '#ffffff',
                    boxShadow: '0 2px 6px rgba(3, 21, 54, 0.4)',
                  }
                : {
                    background: 'linear-gradient(180deg, #faf5e8 0%, #ede0c7 100%)',
                    border: '1px solid #d8c39e',
                    color: '#0f172a',
                  }),
            }}
          >
            <span>TAREFAS</span>
          </button>
        </div>
      </div>

      {/* METADE DIREITA: [ OURO · SALDO ] [ GEMAS · SALDO ] [ CAPACIDADE · OCUPADOS / TOTAL ] + [ ✕ ] */}
      <div
        style={{
          borderRadius: '18px',
          padding: compactLandscape ? '4px 8px' : '6px 10px',
          background: 'linear-gradient(180deg, #fcf9f2 0%, #f2e7d2 100%)',
          border: '2px solid #d4af37',
          outline: '1px solid #784808',
          boxShadow: 'inset 0 1px 0 #ffffff, 0 4px 12px rgba(0, 8, 24, 0.35)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: compactLandscape ? '5px' : '8px',
          minWidth: 0,
          boxSizing: 'border-box',
        }}
      >
        <div
          style={{
            flex: 1,
            minWidth: 0,
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1.25fr',
            gap: compactLandscape ? '4px' : '6px',
            alignItems: 'center',
          }}
        >
          {/* Pílula 1: OURO · SALDO */}
          <div
            style={{
              borderRadius: '12px',
              padding: compactLandscape ? '3px 6px' : '5px 8px',
              background: 'linear-gradient(180deg, #faf5e8 0%, #efe2c9 100%)',
              border: '1px solid #e0cda8',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '5px',
              minWidth: 0,
            }}
          >
            <ConceptGoldCoinSvg size={compactLandscape ? 17 : 21} />
            <span
              style={{
                fontFamily: "'Cinzel', serif",
                fontWeight: 900,
                fontSize: compactLandscape ? '8.5px' : '9.5px',
                color: '#0f172a',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {goldBalance !== null ? `OURO · ${goldBalance}` : 'OURO · SALDO'}
            </span>
          </div>

          {/* Pílula 2: GEMAS · SALDO */}
          <div
            style={{
              borderRadius: '12px',
              padding: compactLandscape ? '3px 6px' : '5px 8px',
              background: 'linear-gradient(180deg, #faf5e8 0%, #efe2c9 100%)',
              border: '1px solid #e0cda8',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '5px',
              minWidth: 0,
            }}
          >
            <ConceptBlueGemSvg size={compactLandscape ? 16 : 20} />
            <span
              style={{
                fontFamily: "'Cinzel', serif",
                fontWeight: 900,
                fontSize: compactLandscape ? '8.5px' : '9.5px',
                color: '#0f172a',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {gemsBalance !== null ? `GEMAS · ${gemsBalance}` : 'GEMAS · SALDO'}
            </span>
          </div>

          {/* Pílula 3: CAPACIDADE · OCUPADOS / TOTAL */}
          <div
            style={{
              borderRadius: '12px',
              padding: compactLandscape ? '2px 6px' : '4px 8px',
              background: 'linear-gradient(180deg, #faf5e8 0%, #efe2c9 100%)',
              border: '1px solid #e0cda8',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              minWidth: 0,
            }}
          >
            <ConceptLeatherBagSvg size={compactLandscape ? 17 : 21} />
            <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.15, minWidth: 0 }}>
              <span
                style={{
                  fontFamily: "'Cinzel', serif",
                  fontWeight: 900,
                  fontSize: compactLandscape ? '7.5px' : '8.5px',
                  color: '#0f172a',
                  whiteSpace: 'nowrap',
                }}
              >
                CAPACIDADE
              </span>
              <span
                style={{
                  fontFamily: "'Cinzel', serif",
                  fontWeight: 900,
                  fontSize: compactLandscape ? '7.5px' : '8.5px',
                  color: '#1e293b',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {allUnifiedItems.length > 0
                  ? `${allUnifiedItems.length} / ${totalSlotsCount}`
                  : 'OCUPADOS / TOTAL'}
              </span>
            </div>
          </div>
        </div>

        {/* Botão Circular Dourado [ ✕ ] no canto superior direito (fiel às 2 imagens Paisagem) */}
        <button
          type="button"
          onClick={onClose}
          title="Fechar Mochila"
          style={{
            width: compactLandscape ? '30px' : '36px',
            height: compactLandscape ? '30px' : '36px',
            borderRadius: '9999px',
            background: 'linear-gradient(180deg, #fdfbf7 0%, #e7d6b5 100%)',
            border: '2px solid #d4af37',
            outline: '1px solid #784808',
            boxShadow: 'inset 0 1px 0 #ffffff, 0 3px 8px rgba(0, 8, 24, 0.3)',
            color: '#0f172a',
            fontWeight: 900,
            fontSize: compactLandscape ? '13px' : '15px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            flexShrink: 0,
            lineHeight: 1,
          }}
        >
          ✕
        </button>
      </div>
    </div>
  );
};
