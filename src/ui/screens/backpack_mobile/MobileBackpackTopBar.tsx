import React from 'react';
import {
  ConceptStar,
  ConceptGoldCoinSvg,
  ConceptBlueGemSvg,
  ConceptLeatherBagSvg,
  type BackpackScreenState,
} from '../backpack_shared/useBackpackScreenState';

export const MobileBackpackTopBar: React.FC<{
  state: BackpackScreenState;
  isHubFullScreen?: boolean;
}> = ({ state, isHubFullScreen = true }) => {
  const { topFolderTab, setTopFolderTab, allUnifiedItems, totalSlotsCount, onClose } = state;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
        width: '100%',
        minWidth: 0,
        flexShrink: 0,
      }}
    >
      {/* Cápsula de Abas Superiores (4 colunas exatas em Mobile para NUNCA transbordar) */}
      <div
        style={{
          borderRadius: '16px',
          padding: '4px',
          background: 'linear-gradient(180deg, #fcf9f2 0%, #f1e6d0 100%)',
          border: '2px solid #d4af37',
          outline: '1px solid #784808',
          boxShadow: 'inset 0 1px 0 #ffffff, 0 4px 12px rgba(0, 8, 24, 0.35)',
          display: 'grid',
          gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
          gap: '4px',
          width: '100%',
          minWidth: 0,
          boxSizing: 'border-box',
        }}
      >
        {(
          [
            { id: 'equipamento', label: 'MOCHILA', star: false },
            { id: 'deck', label: 'DECK', star: false },
            { id: 'jornada', label: 'JORNADA', star: true },
            { id: 'tarefas', label: 'TAREFAS', star: false },
          ] as const
        ).map((tab) => {
          const isActive = topFolderTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setTopFolderTab(tab.id)}
              style={{
                padding: '6px 4px',
                borderRadius: '11px',
                fontFamily: "'Cinzel', serif",
                fontWeight: 900,
                fontSize: '9px',
                textTransform: 'uppercase',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px',
                cursor: 'pointer',
                minWidth: 0,
                whiteSpace: 'nowrap',
                ...(isActive
                  ? {
                      background: 'linear-gradient(180deg, #0b3778 0%, #041b42 100%)',
                      border: '1.5px solid #d4af37',
                      color: '#ffffff',
                      boxShadow: '0 2px 6px rgba(4, 27, 66, 0.35)',
                    }
                  : {
                      background: 'linear-gradient(180deg, #fbf7ef 0%, #ebe0c9 100%)',
                      border: '1px solid #d5be90',
                      color: '#0f172a',
                    }),
              }}
            >
              {tab.star && <ConceptStar size={9} />}
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Cápsula de Saldos e Capacidade (OURO · SALDO | GEMAS · SALDO | CAPACIDADE OCUPADOS / TOTAL) */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0, width: '100%' }}>
        <div
          style={{
            flex: 1,
            borderRadius: '16px',
            padding: '4px 8px',
            background: 'linear-gradient(180deg, #fcf9f2 0%, #f1e6d0 100%)',
            border: '2px solid #d4af37',
            outline: '1px solid #784808',
            boxShadow: 'inset 0 1px 0 #ffffff, 0 4px 12px rgba(0, 8, 24, 0.35)',
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1.25fr',
            alignItems: 'center',
            gap: '6px',
            minWidth: 0,
            boxSizing: 'border-box',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', minWidth: 0 }}>
            <ConceptGoldCoinSvg size={16} />
            <span
              style={{
                fontFamily: "'Cinzel', serif",
                fontWeight: 900,
                fontSize: '7.5px',
                color: '#0f172a',
                whiteSpace: 'nowrap',
              }}
            >
              OURO · SALDO
            </span>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px',
              borderLeft: '1px solid rgba(212,175,55,0.55)',
              borderRight: '1px solid rgba(212,175,55,0.55)',
              padding: '0 4px',
              minWidth: 0,
            }}
          >
            <ConceptBlueGemSvg size={15} />
            <span
              style={{
                fontFamily: "'Cinzel', serif",
                fontWeight: 900,
                fontSize: '7.5px',
                color: '#0f172a',
                whiteSpace: 'nowrap',
              }}
            >
              GEMAS · SALDO
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', minWidth: 0 }}>
            <ConceptLeatherBagSvg size={16} />
            <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.1, minWidth: 0 }}>
              <span
                style={{
                  fontFamily: "'Cinzel', serif",
                  fontWeight: 900,
                  fontSize: '6.5px',
                  color: '#0f172a',
                }}
              >
                CAPACIDADE
              </span>
              <span
                style={{
                  fontFamily: "'Cinzel', serif",
                  fontWeight: 800,
                  fontSize: '6px',
                  color: '#334155',
                  whiteSpace: 'nowrap',
                }}
              >
                {allUnifiedItems.length > 0
                  ? `${allUnifiedItems.length} / ${totalSlotsCount}`
                  : 'OCUPADOS / TOTAL'}
              </span>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          title="Voltar ao Lobby"
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '9999px',
            background: 'linear-gradient(180deg, #0b3778 0%, #041b42 100%)',
            border: '2px solid #d4af37',
            color: '#fff3c2',
            fontWeight: 900,
            fontSize: '13px',
            cursor: 'pointer',
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 3px 8px rgba(0, 8, 24, 0.45)',
          }}
        >
          ✕
        </button>
      </div>
    </div>
  );
};
