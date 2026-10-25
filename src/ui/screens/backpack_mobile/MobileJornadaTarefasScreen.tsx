import React from 'react';
import {
  ConceptSectionHeader,
  type BackpackScreenState,
} from '../backpack_shared/useBackpackScreenState';

export const MobileJornadaTarefasScreen: React.FC<{
  state: BackpackScreenState;
  questTab: 'jornada' | 'tarefas';
}> = ({ state, questTab }) => {
  const { jornadaQuests, tarefasQuests, selectedQuestId, setSelectedQuestId } = state;
  const list = questTab === 'jornada' ? jornadaQuests : tarefasQuests;

  return (
    <div
      style={{
        borderRadius: '18px',
        padding: '10px 8px',
        background: 'linear-gradient(180deg, #fcf9f2 0%, #f5ecdc 100%)',
        border: '2px solid #d4af37',
        outline: '1px solid #784808',
        boxShadow: 'inset 0 1px 0 #ffffff, 0 6px 16px rgba(0, 8, 24, 0.35)',
        width: '100%',
        minWidth: 0,
        boxSizing: 'border-box',
        overflow: 'hidden',
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
      }}
    >
      <ConceptSectionHeader
        title={questTab === 'jornada' ? 'JORNADA PRINCIPAL' : 'TAREFAS & RECOMPENSAS'}
        compact
      />

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          width: '100%',
          minWidth: 0,
        }}
      >
        {list.map((q) => {
          const doneCount = q.objectives.filter((o) => o.completed).length;
          const totalCount = Math.max(1, q.objectives.length);
          const pct = Math.round((doneCount / totalCount) * 100);
          const isSelected = selectedQuestId === q.id;
          return (
            <div
              key={q.id}
              onClick={() => setSelectedQuestId(isSelected ? null : q.id)}
              style={{
                borderRadius: '14px',
                padding: '8px 9px',
                background: 'linear-gradient(180deg, #fbf7ef 0%, #f1e6d2 100%)',
                border: q.isCompleted
                  ? '2px solid #16a34a'
                  : isSelected
                  ? '2px solid #b45309'
                  : '1.5px solid #d4af37',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
                width: '100%',
                minWidth: 0,
                boxSizing: 'border-box',
                overflow: 'hidden',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', minWidth: 0 }}>
                <div
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '11px',
                    background: q.isCompleted
                      ? 'linear-gradient(180deg, #065f46 0%, #022c22 100%)'
                      : 'linear-gradient(180deg, #0b3778 0%, #041b42 100%)',
                    border: '1.5px solid #d4af37',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '17px',
                    flexShrink: 0,
                  }}
                >
                  {q.isLocked ? '🔒' : q.iconEmoji || '📜'}
                </div>

                <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
                  <div
                    style={{
                      fontFamily: "'Cinzel', serif",
                      fontWeight: 900,
                      fontSize: '9.5px',
                      lineHeight: 1.2,
                      color: '#0f172a',
                      textTransform: 'uppercase',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      width: '100%',
                    }}
                  >
                    {q.title}
                  </div>
                  <div
                    style={{
                      marginTop: '4px',
                      height: '13px',
                      width: '100%',
                      borderRadius: '9999px',
                      background: '#1e293b',
                      border: '1px solid #d4af37',
                      position: 'relative',
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        width: `${Math.max(12, pct)}%`,
                        height: '100%',
                        background: q.isCompleted
                          ? 'linear-gradient(90deg, #16a34a, #4ade80)'
                          : 'linear-gradient(90deg, #0b3778, #d4af37)',
                      }}
                    />
                    <span
                      style={{
                        position: 'absolute',
                        top: 0,
                        right: 0,
                        bottom: 0,
                        left: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontFamily: "'Cinzel', serif",
                        fontWeight: 900,
                        fontSize: '7.5px',
                        color: '#ffffff',
                      }}
                    >
                      {doneCount} / {totalCount} ETAPAS
                    </span>
                  </div>
                </div>

                <div
                  style={{
                    width: '26px',
                    height: '26px',
                    borderRadius: '8px',
                    background: q.isCompleted
                      ? 'linear-gradient(180deg, #16a34a 0%, #15803d 100%)'
                      : 'linear-gradient(180deg, #fbf7ef 0%, #e7d8bc 100%)',
                    border: '1px solid #d4af37',
                    color: q.isCompleted ? '#ffffff' : '#0f172a',
                    fontSize: '10px',
                    fontWeight: 900,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  {q.isCompleted ? '✓' : isSelected ? '▲' : '▼'}
                </div>
              </div>

              {isSelected && (
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                    paddingTop: '6px',
                    borderTop: '1px solid #d8c39e',
                    width: '100%',
                    minWidth: 0,
                  }}
                >
                  {q.objectives.map((obj, idx) => (
                    <div
                      key={obj.id}
                      style={{
                        padding: '5px 8px',
                        borderRadius: '8px',
                        background: '#fcf9f2',
                        border: '1px solid #d8c39e',
                        fontSize: '9px',
                        color: '#0f172a',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '6px',
                        minWidth: 0,
                      }}
                    >
                      <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {idx + 1}. {obj.title}
                      </span>
                      <span style={{ fontWeight: 900, flexShrink: 0 }}>
                        {obj.current}/{obj.required}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
