import React from 'react';
import {
  ConceptStar,
  ConceptSectionHeader,
  type BackpackScreenState,
} from '../backpack_shared/useBackpackScreenState';

export const MobileDeckScreen: React.FC<{ state: BackpackScreenState }> = ({ state }) => {
  const {
    realEquippedPets,
    targetPetSlotIdx,
    setTargetPetSlotIdx,
    cardSearchQuery,
    setCardSearchQuery,
    cardRarityFilter,
    setCardRarityFilter,
    filteredDeckCards,
    selectedCardIdx,
    setSelectedCardIdx,
    equipPetInSlot,
    triggerToast,
    selectedDeckCard,
  } = state;

  const mobileSlots = 9;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%', minWidth: 0, flexShrink: 0 }}>
      {/* CORPO 2 COLUNAS: PETS EQUIPADOS (28%) + MINHAS CARTAS (72%) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '28% 1fr',
          gap: '6px',
          width: '100%',
          minWidth: 0,
          alignItems: 'stretch',
        }}
      >
        {/* ESQUERDA: PETS EQUIPADOS */}
        <div
          style={{
            borderRadius: '18px',
            padding: '8px 5px',
            background: 'linear-gradient(180deg, #fcf9f2 0%, #f5ecdc 100%)',
            border: '2px solid #d4af37',
            outline: '1px solid #784808',
            boxShadow: 'inset 0 1px 0 #ffffff, 0 6px 16px rgba(0, 8, 24, 0.35)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            minWidth: 0,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '3px',
              marginBottom: '6px',
              width: '100%',
            }}
          >
            <ConceptStar size={9} />
            <div
              style={{
                fontFamily: "'Cinzel', serif",
                fontWeight: 900,
                fontSize: '8.5px',
                lineHeight: 1.15,
                color: '#0f172a',
                textAlign: 'center',
                textTransform: 'uppercase',
              }}
            >
              PETS
              <br />
              EQUIPADOS
            </div>
            <ConceptStar size={9} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1, justifyContent: 'space-around' }}>
            {[0, 1, 2].map((slotIdx) => {
              const eqPet = realEquippedPets[slotIdx];
              const isSelectedSlot = targetPetSlotIdx === slotIdx;
              return (
                <React.Fragment key={`mob-deck-pet-${slotIdx}`}>
                  {slotIdx > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'center', margin: '-2px 0' }}>
                      <ConceptStar size={9} />
                    </div>
                  )}
                  <div
                    onClick={() => setTargetPetSlotIdx(slotIdx)}
                    style={{
                      borderRadius: '14px',
                      padding: '6px 4px',
                      background: 'linear-gradient(180deg, #fbf7ef 0%, #f3ead8 100%)',
                      border: isSelectedSlot ? '2px solid #f59e0b' : '1.5px solid #e2d3b8',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '3px',
                      cursor: 'pointer',
                      minWidth: 0,
                    }}
                  >
                    <div
                      style={{
                        width: '44px',
                        height: '44px',
                        borderRadius: '9999px',
                        background: 'linear-gradient(180deg, #c6cbd4 0%, #b5bbc6 100%)',
                        border: isSelectedSlot ? '2px solid #f59e0b' : '1.5px solid #d5d9e0',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {eqPet ? (
                        <span style={{ fontSize: '18px' }}>{eqPet.iconEmoji || '🐾'}</span>
                      ) : (
                        <span style={{ color: '#7c8390', fontSize: '20px', fontWeight: 300 }}>+</span>
                      )}
                    </div>
                    <span
                      style={{
                        fontFamily: "'Cinzel', serif",
                        fontWeight: 900,
                        fontSize: '8.5px',
                        color: '#0f172a',
                        textTransform: 'uppercase',
                      }}
                    >
                      PET {slotIdx + 1}
                    </span>

                    <div
                      style={{
                        width: '30px',
                        height: '30px',
                        borderRadius: '7px',
                        background: 'linear-gradient(180deg, #c6cbd4 0%, #b5bbc6 100%)',
                        border: '1.5px solid #d5d9e0',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <span style={{ color: '#7c8390', fontSize: '16px', fontWeight: 300 }}>+</span>
                    </div>
                    <span
                      style={{
                        fontFamily: "'Cinzel', serif",
                        fontWeight: 900,
                        fontSize: '6.5px',
                        lineHeight: 1.1,
                        color: '#0f172a',
                        textAlign: 'center',
                        textTransform: 'uppercase',
                      }}
                    >
                      CARTA
                      <br />
                      EQUIPADA
                    </span>
                  </div>
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* DIREITA: MINHAS CARTAS */}
        <div
          style={{
            borderRadius: '18px',
            padding: '8px 7px',
            background: 'linear-gradient(180deg, #fcf9f2 0%, #f5ecdc 100%)',
            border: '2px solid #d4af37',
            outline: '1px solid #784808',
            boxShadow: 'inset 0 1px 0 #ffffff, 0 6px 16px rgba(0, 8, 24, 0.35)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            minWidth: 0,
            overflow: 'hidden',
          }}
        >
          <ConceptSectionHeader title="MINHAS CARTAS" compact />

          {/* Busca + Raridade na mesma linha sem estourar */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(0, 1fr) auto',
              gap: '5px',
              marginBottom: '6px',
              width: '100%',
              minWidth: 0,
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '4px 8px',
                borderRadius: '9999px',
                background: '#fbf7ef',
                border: '1px solid #d8c39e',
                minWidth: 0,
              }}
            >
              <span style={{ fontSize: '10px', color: '#475569' }}>🔍</span>
              <input
                type="text"
                value={cardSearchQuery}
                onChange={(e) => setCardSearchQuery(e.target.value)}
                placeholder="Buscar carta..."
                style={{
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  fontSize: '9px',
                  color: '#0f172a',
                  width: '100%',
                  minWidth: 0,
                }}
              />
            </div>

            <select
              value={cardRarityFilter}
              onChange={(e) => setCardRarityFilter(e.target.value)}
              style={{
                padding: '4px 6px',
                borderRadius: '9999px',
                background: '#fbf7ef',
                border: '1px solid #d8c39e',
                fontFamily: "'Cinzel', serif",
                fontWeight: 800,
                fontSize: '8px',
                color: '#0f172a',
                outline: 'none',
              }}
            >
              <option value="all">Todas as raridades</option>
              <option value="common">Comum</option>
              <option value="rare">Rara</option>
              <option value="epic">Épica</option>
              <option value="legendary">Lendária</option>
            </select>
          </div>

          {/* Grade 3x3 de Cartas Verticais */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
              gap: '5px',
              width: '100%',
              minWidth: 0,
            }}
          >
            {Array.from({ length: mobileSlots }).map((_, idx) => {
              const card = filteredDeckCards[idx] || null;
              const isCardSelected = selectedCardIdx === idx;
              return (
                <div
                  key={`mob-card-${idx}`}
                  onClick={() => setSelectedCardIdx(idx)}
                  style={{
                    borderRadius: '11px',
                    padding: '5px 4px',
                    background: 'linear-gradient(180deg, #fbf7ef 0%, #f3ead8 100%)',
                    border: isCardSelected ? '2px solid #d4af37' : '1.5px solid #e2d3b8',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '3px',
                    cursor: 'pointer',
                    minWidth: 0,
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      width: '100%',
                      height: '62px',
                      borderRadius: '8px',
                      background: 'linear-gradient(180deg, #c6cbd4 0%, #b5bbc6 100%)',
                      border: '1.5px solid #d5d9e0',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {card ? (
                      <span style={{ fontSize: '20px' }}>{card.iconEmoji || '🐾'}</span>
                    ) : (
                      <>
                        <span style={{ color: '#7c8390', fontSize: '20px', fontWeight: 300, lineHeight: 1 }}>+</span>
                        <span
                          style={{
                            fontFamily: "'Cinzel', serif",
                            fontWeight: 800,
                            fontSize: '7px',
                            color: '#475569',
                            marginTop: '2px',
                          }}
                        >
                          CARTA
                        </span>
                      </>
                    )}
                  </div>

                  <span
                    style={{
                      fontFamily: "'Cinzel', serif",
                      fontWeight: 900,
                      fontSize: '6.5px',
                      color: '#0f172a',
                      textTransform: 'uppercase',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      maxWidth: '100%',
                    }}
                  >
                    {card ? card.name : 'NOME DA CARTA'}
                  </span>

                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '2px',
                      width: '100%',
                      fontSize: '5.5px',
                      fontFamily: "'Cinzel', serif",
                      fontWeight: 800,
                      color: '#334155',
                    }}
                  >
                    <span>NV</span>
                    <span style={{ width: '8px', height: '3px', borderRadius: '99px', background: '#c6cbd4' }} />
                    <span>PV</span>
                    <span style={{ width: '8px', height: '3px', borderRadius: '99px', background: '#c6cbd4' }} />
                    <span>ATK</span>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (card) {
                        equipPetInSlot(card.id, targetPetSlotIdx, true);
                        triggerToast(`Equipado em PET ${targetPetSlotIdx + 1}: ${card.name}`);
                      } else {
                        triggerToast('Slot de carta vazio');
                      }
                    }}
                    style={{
                      width: '100%',
                      padding: '3.5px 2px',
                      borderRadius: '9999px',
                      background: 'linear-gradient(180deg, #0b3778 0%, #041b42 100%)',
                      border: '1.5px solid #d4af37',
                      color: '#ffffff',
                      fontFamily: "'Cinzel', serif",
                      fontWeight: 900,
                      fontSize: '7px',
                      textTransform: 'uppercase',
                      cursor: 'pointer',
                    }}
                  >
                    EQUIPAR
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* RODAPÉ MOBILE DECK (Fiel a 'Mochila com cartas e pets.png') */}
      <div
        style={{
          borderRadius: '16px',
          padding: '7px 8px',
          background: 'linear-gradient(180deg, #fcf9f2 0%, #f3e8d3 100%)',
          border: '2px solid #d4af37',
          outline: '1px solid #784808',
          boxShadow: 'inset 0 1px 0 #ffffff, 0 6px 16px rgba(0, 8, 24, 0.35)',
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) auto auto',
          alignItems: 'center',
          gap: '6px',
          width: '100%',
          minWidth: 0,
          boxSizing: 'border-box',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              background: 'linear-gradient(180deg, #c6cbd4 0%, #b5bbc6 100%)',
              border: '1.5px solid #d5d9e0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            {selectedDeckCard ? (
              <span style={{ fontSize: '16px' }}>{selectedDeckCard.iconEmoji}</span>
            ) : (
              <span style={{ color: '#7c8390', fontSize: '18px', fontWeight: 300 }}>+</span>
            )}
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div
              style={{
                fontFamily: "'Cinzel', serif",
                fontWeight: 900,
                fontSize: '8px',
                color: '#0f172a',
                borderBottom: '1px solid #d8c39e',
                paddingBottom: '2px',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {selectedDeckCard ? selectedDeckCard.name : 'NOME DA CARTA'}
            </div>
            <div
              style={{
                fontFamily: "'Cinzel', serif",
                fontWeight: 800,
                fontSize: '7px',
                color: '#334155',
                paddingTop: '2px',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {selectedDeckCard ? selectedDeckCard.roleLabel || 'ATAQUE' : 'ESTILO DE ATAQUE'}
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            if (selectedDeckCard) {
              equipPetInSlot(selectedDeckCard.id, targetPetSlotIdx, true);
              triggerToast(`Equipado em PET ${targetPetSlotIdx + 1}`);
            } else {
              triggerToast('Selecione uma carta primeiro');
            }
          }}
          style={{
            padding: '8px 10px',
            borderRadius: '10px',
            background: 'linear-gradient(180deg, #0b3778 0%, #041b42 100%)',
            border: '1.5px solid #d4af37',
            color: '#ffffff',
            fontFamily: "'Cinzel', serif",
            fontWeight: 900,
            fontSize: '8px',
            textTransform: 'uppercase',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          EQUIPAR NO SLOT
        </button>

        <button
          type="button"
          onClick={() => triggerToast(selectedDeckCard?.shortDescription || 'Selecione uma carta')}
          style={{
            padding: '8px 10px',
            borderRadius: '10px',
            background: 'linear-gradient(180deg, #fdfbf7 0%, #efe3cc 100%)',
            border: '1.5px solid #d4af37',
            color: '#0f172a',
            fontFamily: "'Cinzel', serif",
            fontWeight: 900,
            fontSize: '8px',
            textTransform: 'uppercase',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          SABER MAIS
        </button>
      </div>
    </div>
  );
};
