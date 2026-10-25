import React, { useState } from 'react';
import {
  ConceptStar,
  ConceptSectionHeader,
  type BackpackScreenState,
} from '../../screens/backpack_shared/useBackpackScreenState';

export const LandscapeDeckScreen: React.FC<{
  state: BackpackScreenState;
  compactLandscape?: boolean;
}> = ({ state, compactLandscape = false }) => {
  const {
    realEquippedPets,
    targetPetSlotIdx,
    setTargetPetSlotIdx,
    cardSearchQuery,
    setCardSearchQuery,
    cardRarityFilter,
    setCardRarityFilter,
    cardsScrollRef,
    filteredDeckCards,
    selectedCardIdx,
    setSelectedCardIdx,
    equipPetInSlot,
    triggerToast,
    selectedDeckCard,
  } = state;

  const [showCardLore, setShowCardLore] = useState(false);
  const landscapeSlots = Math.max(6, Math.ceil(filteredDeckCards.length / 3) * 3);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: compactLandscape ? '6px' : '8px',
        flex: 1,
        minHeight: 0,
        width: '100%',
        flexShrink: 0,
      }}
    >
      {/* LINHA CENTRAL: 2 PAINÉIS LADO A LADO (PETS EQUIPADOS 28.5% | MINHAS CARTAS 71.5%) */}
      <div
        style={{
          position: 'relative',
          display: 'grid',
          gridTemplateColumns: '28.5% 1fr',
          gap: compactLandscape ? '6px' : '10px',
          flex: 1,
          minHeight: 0,
          width: '100%',
          alignItems: 'stretch',
        }}
      >
        {/* Estrelas Douradas nas Interseções Superior e Inferior */}
        <div
          style={{
            position: 'absolute',
            left: '28.5%',
            top: '-5px',
            transform: 'translateX(-50%)',
            zIndex: 25,
            pointerEvents: 'none',
          }}
        >
          <ConceptStar size={14} />
        </div>
        <div
          style={{
            position: 'absolute',
            left: '28.5%',
            bottom: '-5px',
            transform: 'translateX(-50%)',
            zIndex: 25,
            pointerEvents: 'none',
          }}
        >
          <ConceptStar size={14} />
        </div>

        {/* ====================================================================
            ESQUERDA: ─── ✦ PETS EQUIPADOS ✦ ───
           ==================================================================== */}
        <div
          style={{
            borderRadius: '20px',
            padding: compactLandscape ? '8px 10px' : '12px 14px',
            background: 'linear-gradient(180deg, #fcf9f2 0%, #f5ecdc 100%)',
            border: '2px solid #d4af37',
            outline: '1px solid #784808',
            boxShadow: 'inset 0 1px 0 #ffffff, 0 6px 16px rgba(0, 8, 24, 0.35)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            minWidth: 0,
            minHeight: 0,
            boxSizing: 'border-box',
            overflow: 'hidden',
          }}
        >
          <ConceptSectionHeader title="PETS EQUIPADOS" compact={compactLandscape} />

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: compactLandscape ? '4px' : '6px',
              flex: 1,
              justifyContent: 'space-between',
              marginTop: compactLandscape ? '2px' : '4px',
            }}
          >
            {[0, 1, 2].map((slotIdx) => {
              const eqPet = realEquippedPets[slotIdx];
              const isSelectedSlot = targetPetSlotIdx === slotIdx;
              const petCircleSize = compactLandscape ? 48 : 66;
              return (
                <React.Fragment key={`ls-deck-pet-${slotIdx}`}>
                  {slotIdx > 0 && (
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'center',
                        margin: '-4px 0',
                        zIndex: 5,
                      }}
                    >
                      <ConceptStar size={10} />
                    </div>
                  )}
                  <div
                    onClick={() => setTargetPetSlotIdx(slotIdx)}
                    style={{
                      flex: 1,
                      borderRadius: '16px',
                      padding: compactLandscape ? '6px 10px' : '8px 14px',
                      background: 'linear-gradient(180deg, #fbf7ef 0%, #f3ead8 100%)',
                      border: isSelectedSlot ? '2px solid #d4af37' : '1.5px solid #e6d7be',
                      boxShadow: 'inset 0 1px 0 #ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '6px',
                      cursor: 'pointer',
                      minWidth: 0,
                      boxSizing: 'border-box',
                    }}
                  >
                    {/* Esquerda do Card: Círculo do Pet + PET 1 / PET 2 / PET 3 */}
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        position: 'relative',
                        flexShrink: 0,
                      }}
                    >
                      {slotIdx === 0 && (
                        <span
                          style={{
                            position: 'absolute',
                            top: '-3px',
                            right: '-14px',
                            zIndex: 10,
                            padding: compactLandscape ? '1px 6px' : '2px 8px',
                            borderRadius: '8px',
                            background: 'linear-gradient(180deg, #0b3778 0%, #031536 100%)',
                            border: '1.5px solid #d4af37',
                            color: '#ffffff',
                            fontFamily: "'Cinzel', serif",
                            fontWeight: 900,
                            fontSize: compactLandscape ? '7px' : '8px',
                            boxShadow: '0 2px 5px rgba(0,0,0,0.3)',
                          }}
                        >
                          ATIVO
                        </span>
                      )}
                      <div
                        style={{
                          width: `${petCircleSize}px`,
                          height: `${petCircleSize}px`,
                          borderRadius: '9999px',
                          background: 'linear-gradient(180deg, #c6cbd4 0%, #b5bbc6 100%)',
                          border: isSelectedSlot ? '2.5px solid #f59e0b' : '1.5px solid #adb4c0',
                          outline: isSelectedSlot ? '2px solid rgba(251, 191, 36, 0.45)' : 'none',
                          boxShadow: isSelectedSlot
                            ? '0 0 12px rgba(245, 158, 11, 0.55), inset 0 2px 4px rgba(0,0,0,0.12)'
                            : 'inset 0 2px 4px rgba(0,0,0,0.12)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {eqPet ? (
                          eqPet.avatarPng ? (
                            <img
                              src={eqPet.avatarPng}
                              alt={eqPet.name}
                              style={{ width: '65%', height: '65%', objectFit: 'contain' }}
                            />
                          ) : (
                            <span style={{ fontSize: compactLandscape ? '20px' : '26px' }}>
                              {eqPet.iconEmoji || '🐾'}
                            </span>
                          )
                        ) : (
                          <span
                            style={{
                              color: '#7c8390',
                              fontSize: compactLandscape ? '22px' : '28px',
                              fontWeight: 300,
                            }}
                          >
                            +
                          </span>
                        )}
                      </div>
                      <span
                        style={{
                          marginTop: compactLandscape ? '2px' : '4px',
                          fontFamily: "'Cinzel', serif",
                          fontWeight: 900,
                          fontSize: compactLandscape ? '8.5px' : '10px',
                          color: '#0f172a',
                        }}
                      >
                        PET {slotIdx + 1}
                      </span>
                    </div>

                    {/* Conector Central: ── ✦ ── */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '3px',
                        flex: 1,
                        minWidth: '24px',
                      }}
                    >
                      <span
                        style={{
                          flex: 1,
                          maxWidth: '18px',
                          height: '1.5px',
                          background: '#d4af37',
                        }}
                      />
                      <ConceptStar size={compactLandscape ? 9 : 11} />
                      <span
                        style={{
                          flex: 1,
                          maxWidth: '18px',
                          height: '1.5px',
                          background: '#d4af37',
                        }}
                      />
                    </div>

                    {/* Direita do Card: Retângulo CARTA EQUIPADA */}
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <div
                        style={{
                          width: compactLandscape ? '38px' : '48px',
                          height: compactLandscape ? '48px' : '62px',
                          borderRadius: '9px',
                          background: 'linear-gradient(180deg, #c6cbd4 0%, #b5bbc6 100%)',
                          border: '1.5px solid #adb4c0',
                          boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.12)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {eqPet ? (
                          <span style={{ fontSize: compactLandscape ? '16px' : '20px' }}>
                            {eqPet.iconEmoji || '🃏'}
                          </span>
                        ) : (
                          <span
                            style={{
                              color: '#7c8390',
                              fontSize: compactLandscape ? '18px' : '22px',
                              fontWeight: 300,
                            }}
                          >
                            +
                          </span>
                        )}
                      </div>
                      <span
                        style={{
                          marginTop: '3px',
                          fontFamily: "'Cinzel', serif",
                          fontWeight: 900,
                          fontSize: compactLandscape ? '6.5px' : '7.5px',
                          lineHeight: 1.1,
                          color: '#0f172a',
                          textAlign: 'center',
                        }}
                      >
                        CARTA
                        <br />
                        EQUIPADA
                      </span>
                    </div>
                  </div>
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* ====================================================================
            DIREITA: ─── ✦ MINHAS CARTAS ✦ ───
           ==================================================================== */}
        <div
          style={{
            borderRadius: '20px',
            padding: compactLandscape ? '8px 10px' : '12px 16px',
            background: 'linear-gradient(180deg, #fcf9f2 0%, #f5ecdc 100%)',
            border: '2px solid #d4af37',
            outline: '1px solid #784808',
            boxShadow: 'inset 0 1px 0 #ffffff, 0 6px 16px rgba(0, 8, 24, 0.35)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            minWidth: 0,
            minHeight: 0,
            boxSizing: 'border-box',
            overflow: 'hidden',
          }}
        >
          {/* Cabeçalho de MINHAS CARTAS + Busca + Raridades na mesma linha (fiel ao mockup!) */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: compactLandscape ? '8px' : '12px',
              marginBottom: compactLandscape ? '6px' : '10px',
              minWidth: 0,
            }}
          >
            {/* Linha ornamentada + Título MINHAS CARTAS */}
            <div
              style={{
                flex: 1,
                minWidth: 0,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <ConceptStar size={compactLandscape ? 10 : 12} />
              <div
                style={{
                  flex: 1,
                  height: '1.5px',
                  background: 'linear-gradient(90deg, rgba(212,175,55,0.85), rgba(212,175,55,0.85))',
                }}
              />
              <ConceptStar size={compactLandscape ? 10 : 12} />
              <span
                style={{
                  fontFamily: "'Cinzel', serif",
                  fontWeight: 900,
                  fontSize: compactLandscape ? '12px' : '15px',
                  letterSpacing: '0.06em',
                  color: '#0f172a',
                  textTransform: 'uppercase',
                  whiteSpace: 'nowrap',
                }}
              >
                MINHAS CARTAS
              </span>
              <ConceptStar size={compactLandscape ? 10 : 12} />
            </div>

            {/* Pílula Buscar carta... | Todas as raridades */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: compactLandscape ? '6px' : '10px',
                flexShrink: 0,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: compactLandscape ? '4px 10px' : '6px 14px',
                  borderRadius: '9999px',
                  background: '#fbf7ef',
                  border: '1px solid #d8c39e',
                  width: compactLandscape ? '140px' : '175px',
                }}
              >
                <span style={{ fontSize: '12px', color: '#0f172a' }}>🔍</span>
                <input
                  type="text"
                  value={cardSearchQuery}
                  onChange={(e) => setCardSearchQuery(e.target.value)}
                  placeholder="Buscar carta..."
                  style={{
                    background: 'transparent',
                    border: 'none',
                    outline: 'none',
                    fontSize: compactLandscape ? '9.5px' : '11px',
                    fontFamily: "'Cinzel', serif",
                    color: '#0f172a',
                    width: '100%',
                  }}
                />
              </div>

              <div
                style={{
                  width: '1.5px',
                  height: '20px',
                  background: '#d4af37',
                  flexShrink: 0,
                }}
              />

              <select
                value={cardRarityFilter}
                onChange={(e) => setCardRarityFilter(e.target.value)}
                style={{
                  padding: compactLandscape ? '4px 10px' : '6px 14px',
                  borderRadius: '10px',
                  background: '#fbf7ef',
                  border: '1px solid #d8c39e',
                  fontFamily: "'Cinzel', serif",
                  fontWeight: 800,
                  fontSize: compactLandscape ? '9.5px' : '11px',
                  color: '#0f172a',
                  outline: 'none',
                  cursor: 'pointer',
                }}
              >
                <option value="all">Todas as raridades</option>
                <option value="common">Comum</option>
                <option value="rare">Rara</option>
                <option value="epic">Épica</option>
                <option value="legendary">Lendária</option>
              </select>
            </div>
          </div>

          {/* Grade de Cartas 3 colunas x 2 linhas visíveis + Scrollbar Dourada */}
          <div
            style={{
              borderRadius: '16px',
              padding: compactLandscape ? '8px' : '12px',
              background: 'linear-gradient(180deg, #f8f2e4 0%, #f2e8d5 100%)',
              border: '1.5px solid #e4d3b5',
              display: 'flex',
              alignItems: 'stretch',
              gap: '10px',
              flex: 1,
              minHeight: 0,
              minWidth: 0,
            }}
          >
            <div
              ref={cardsScrollRef}
              className="no-scrollbar"
              style={{
                flex: 1,
                minWidth: 0,
                minHeight: 0,
                height: '100%',
                overflowY: 'auto',
                position: 'relative',
              }}
            >
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                  gap: compactLandscape ? '8px' : '12px',
                  position: 'relative',
                }}
              >
                {Array.from({ length: landscapeSlots }).map((_, idx) => {
                  const card = filteredDeckCards[idx] || null;
                  const isCardSelected = selectedCardIdx === idx;
                  const cardPreviewW = compactLandscape ? 58 : 78;
                  const cardPreviewH = compactLandscape ? 88 : 118;

                  return (
                    <div
                      key={`ls-card-${idx}`}
                      onClick={() => {
                        setSelectedCardIdx(idx);
                        setShowCardLore(false);
                      }}
                      style={{
                        position: 'relative',
                        borderRadius: '14px',
                        padding: compactLandscape ? '7px' : '10px',
                        background: 'linear-gradient(180deg, #fbf7ef 0%, #f3ead8 100%)',
                        border: isCardSelected ? '2px solid #d4af37' : '1.5px solid #e6d7be',
                        boxShadow: 'inset 0 1px 0 #ffffff',
                        display: 'flex',
                        alignItems: 'stretch',
                        gap: compactLandscape ? '7px' : '10px',
                        cursor: 'pointer',
                        minWidth: 0,
                        boxSizing: 'border-box',
                      }}
                    >
                      {/* Estrelas douradas nos cantos de interseção entre os cards (como na referência!) */}
                      {idx % 3 < 2 && idx < 3 && (
                        <div
                          style={{
                            position: 'absolute',
                            right: compactLandscape ? '-9px' : '-11px',
                            bottom: compactLandscape ? '-9px' : '-11px',
                            zIndex: 15,
                            pointerEvents: 'none',
                          }}
                        >
                          <ConceptStar size={10} />
                        </div>
                      )}

                      {/* Esquerda: Retângulo Vertical CARTA */}
                      <div
                        style={{
                          width: `${cardPreviewW}px`,
                          height: `${cardPreviewH}px`,
                          borderRadius: '10px',
                          background: 'linear-gradient(180deg, #c6cbd4 0%, #b5bbc6 100%)',
                          border: '1.5px solid #adb4c0',
                          boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.12)',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        {card ? (
                          card.avatarPng ? (
                            <img
                              src={card.avatarPng}
                              alt={card.name}
                              style={{ width: '75%', height: '75%', objectFit: 'contain' }}
                            />
                          ) : (
                            <span style={{ fontSize: compactLandscape ? '22px' : '28px' }}>
                              {card.iconEmoji || '🐾'}
                            </span>
                          )
                        ) : (
                          <>
                            <span
                              style={{
                                color: '#7c8390',
                                fontSize: compactLandscape ? '22px' : '28px',
                                fontWeight: 300,
                                lineHeight: 1,
                              }}
                            >
                              +
                            </span>
                            <span
                              style={{
                                fontFamily: "'Cinzel', serif",
                                fontWeight: 800,
                                fontSize: compactLandscape ? '7.5px' : '9px',
                                color: '#334155',
                                marginTop: '6px',
                              }}
                            >
                              CARTA
                            </span>
                          </>
                        )}
                      </div>

                      {/* Direita: NOME DA CARTA + NÍVEL / PV / ATK + Botão EQUIPAR */}
                      <div
                        style={{
                          flex: 1,
                          minWidth: 0,
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                          height: `${cardPreviewH}px`,
                        }}
                      >
                        <div
                          style={{
                            fontFamily: "'Cinzel', serif",
                            fontWeight: 900,
                            fontSize: compactLandscape ? '8.5px' : '10px',
                            color: '#0f172a',
                            borderBottom: '1px solid #d8c39e',
                            paddingBottom: '3px',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            textTransform: 'uppercase',
                          }}
                        >
                          {card ? card.name : 'NOME DA CARTA'}
                        </div>

                        <div
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: compactLandscape ? '3px' : '5px',
                          }}
                        >
                          {(['NÍVEL', 'PV', 'ATK'] as const).map((st) => (
                            <div
                              key={st}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: '5px',
                              }}
                            >
                              <span
                                style={{
                                  fontFamily: "'Cinzel', serif",
                                  fontWeight: 900,
                                  fontSize: compactLandscape ? '7px' : '8px',
                                  color: '#0f172a',
                                  width: '28px',
                                  flexShrink: 0,
                                }}
                              >
                                {st}
                              </span>
                              <div
                                style={{
                                  flex: 1,
                                  height: compactLandscape ? '6px' : '7px',
                                  borderRadius: '9999px',
                                  background: '#c6cbd4',
                                  overflow: 'hidden',
                                }}
                              >
                                {card && (
                                  <div
                                    style={{
                                      width: st === 'PV' ? '85%' : st === 'ATK' ? '70%' : '55%',
                                      height: '100%',
                                      background:
                                        st === 'PV'
                                          ? '#22c55e'
                                          : st === 'ATK'
                                          ? '#ef4444'
                                          : '#f59e0b',
                                    }}
                                  />
                                )}
                              </div>
                            </div>
                          ))}
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
                            padding: compactLandscape ? '4px 0' : '6px 0',
                            borderRadius: '9999px',
                            background: 'linear-gradient(180deg, #0b3778 0%, #031536 100%)',
                            border: '1.5px solid #d4af37',
                            boxShadow: '0 2px 5px rgba(3, 21, 54, 0.35)',
                            color: '#ffffff',
                            fontFamily: "'Cinzel', serif",
                            fontWeight: 900,
                            fontSize: compactLandscape ? '8px' : '9px',
                            textTransform: 'uppercase',
                            cursor: 'pointer',
                          }}
                        >
                          EQUIPAR
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Barra de Rolagem Vertical Dourada */}
            <div
              style={{
                width: '14px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexShrink: 0,
              }}
            >
              <button
                type="button"
                onClick={() => cardsScrollRef.current?.scrollBy({ top: -110, behavior: 'smooth' })}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#b45309',
                  fontSize: '10px',
                  cursor: 'pointer',
                  lineHeight: 1,
                }}
              >
                ▲
              </button>
              <div
                style={{
                  width: '6px',
                  flex: 1,
                  margin: '4px 0',
                  borderRadius: '9999px',
                  background: '#e5dccb',
                  border: '1px solid #d6c5a7',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    width: '100%',
                    height: '45%',
                    borderRadius: '9999px',
                    background: 'linear-gradient(180deg, #f59e0b 0%, #b45309 100%)',
                  }}
                />
              </div>
              <button
                type="button"
                onClick={() => cardsScrollRef.current?.scrollBy({ top: 110, behavior: 'smooth' })}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#b45309',
                  fontSize: '10px',
                  cursor: 'pointer',
                  lineHeight: 1,
                }}
              >
                ▼
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ====================================================================
          BARRA INSPETORA INFERIOR DO DECK (LARGURA TOTAL EM PAISAGEM)
          [ [ + ] NOME DA CARTA / ESTILO DE ATAQUE | ATRIBUTOS ] [ EQUIPAR NO SLOT ] [ SABER MAIS ]
         ==================================================================== */}
      <div
        style={{
          borderRadius: '20px',
          padding: compactLandscape ? '6px 12px' : '10px 18px',
          background: 'linear-gradient(180deg, #fcf9f2 0%, #f3e8d3 100%)',
          border: '2px solid #d4af37',
          outline: '1px solid #784808',
          boxShadow: 'inset 0 1px 0 #ffffff, 0 6px 16px rgba(0, 8, 24, 0.35)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: compactLandscape ? '12px' : '20px',
          width: '100%',
          minWidth: 0,
          boxSizing: 'border-box',
          flexShrink: 0,
        }}
      >
        {/* Esquerda e Centro */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: compactLandscape ? '10px' : '16px',
            flex: 1,
            minWidth: 0,
          }}
        >
          {/* Preview Quadrado Arredondado da Carta */}
          <div
            style={{
              width: compactLandscape ? '44px' : '56px',
              height: compactLandscape ? '44px' : '56px',
              borderRadius: '11px',
              background: 'linear-gradient(180deg, #c6cbd4 0%, #b5bbc6 100%)',
              border: '1.5px solid #adb4c0',
              boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.12)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            {selectedDeckCard ? (
              selectedDeckCard.avatarPng ? (
                <img
                  src={selectedDeckCard.avatarPng}
                  alt={selectedDeckCard.name}
                  style={{ width: '70%', height: '70%', objectFit: 'contain' }}
                />
              ) : (
                <span style={{ fontSize: compactLandscape ? '20px' : '24px' }}>
                  {selectedDeckCard.iconEmoji || '🐾'}
                </span>
              )
            ) : (
              <span
                style={{
                  color: '#7c8390',
                  fontSize: compactLandscape ? '22px' : '26px',
                  fontWeight: 300,
                }}
              >
                +
              </span>
            )}
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1.35fr',
              gap: compactLandscape ? '12px' : '20px',
              flex: 1,
              minWidth: 0,
              alignItems: 'center',
            }}
          >
            {/* Coluna 1: NOME DA CARTA / ESTILO DE ATAQUE */}
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  fontFamily: "'Cinzel', serif",
                  fontWeight: 900,
                  fontSize: compactLandscape ? '10px' : '11.5px',
                  color: '#0f172a',
                  borderBottom: '1px solid #d4c3a3',
                  paddingBottom: '4px',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  textTransform: 'uppercase',
                }}
              >
                {selectedDeckCard ? selectedDeckCard.name : 'NOME DA CARTA'}
              </div>
              <div
                style={{
                  fontFamily: "'Cinzel', serif",
                  fontWeight: 900,
                  fontSize: compactLandscape ? '9px' : '10.5px',
                  color: '#0f172a',
                  paddingTop: '4px',
                  borderBottom: '1px solid #d4c3a3',
                  paddingBottom: '2px',
                  textTransform: 'uppercase',
                }}
              >
                {selectedDeckCard
                  ? selectedDeckCard.roleLabel || 'ESTILO DE ATAQUE'
                  : 'ESTILO DE ATAQUE'}
              </div>
            </div>

            {/* Coluna 2: ATRIBUTOS */}
            <div
              style={{
                borderLeft: '1.5px solid #c59638',
                paddingLeft: compactLandscape ? '12px' : '16px',
                minWidth: 0,
              }}
            >
              <div
                style={{
                  fontFamily: "'Cinzel', serif",
                  fontWeight: 900,
                  fontSize: compactLandscape ? '9.5px' : '11px',
                  color: '#0f172a',
                }}
              >
                ATRIBUTOS
              </div>
              {selectedDeckCard ? (
                <div
                  style={{
                    fontSize: compactLandscape ? '9px' : '10px',
                    color: '#1e293b',
                    marginTop: '3px',
                    lineHeight: 1.3,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {showCardLore
                    ? selectedDeckCard.detailedLore || selectedDeckCard.shortDescription
                    : `Nv.${selectedDeckCard.level ?? 1} • PV ${selectedDeckCard.hp ?? 140} • ATQ ${selectedDeckCard.attackDamage ?? 24}`}
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '6px' }}>
                  <div style={{ height: '1px', background: '#d4c3a3', width: '100%' }} />
                  <div style={{ height: '1px', background: '#d4c3a3', width: '100%' }} />
                  <div style={{ height: '1px', background: '#d4c3a3', width: '100%' }} />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Direita: 2 Botões ([ EQUIPAR NO SLOT ] [ SABER MAIS ]) */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: compactLandscape ? '8px' : '12px',
            flexShrink: 0,
          }}
        >
          <button
            type="button"
            onClick={() => {
              if (!selectedDeckCard) {
                triggerToast('Selecione uma carta primeiro!');
                return;
              }
              equipPetInSlot(selectedDeckCard.id, targetPetSlotIdx, true);
              triggerToast(`Equipado em PET ${targetPetSlotIdx + 1}: ${selectedDeckCard.name}`);
            }}
            style={{
              padding: compactLandscape ? '8px 18px' : '12px 28px',
              borderRadius: '14px',
              background: 'linear-gradient(180deg, #0b3778 0%, #031536 100%)',
              border: '2px solid #d4af37',
              outline: '1px solid #784808',
              boxShadow: '0 4px 10px rgba(3, 21, 54, 0.35), inset 0 1px 0 rgba(255,255,255,0.25)',
              color: '#ffffff',
              fontFamily: "'Cinzel', serif",
              fontWeight: 900,
              fontSize: compactLandscape ? '9.5px' : '11.5px',
              textTransform: 'uppercase',
              whiteSpace: 'nowrap',
              cursor: 'pointer',
            }}
          >
            EQUIPAR NO SLOT
          </button>

          <button
            type="button"
            onClick={() => {
              if (!selectedDeckCard) {
                triggerToast('Selecione uma carta para ver detalhes');
                return;
              }
              setShowCardLore((v) => !v);
            }}
            style={{
              padding: compactLandscape ? '8px 18px' : '12px 28px',
              borderRadius: '14px',
              background: 'linear-gradient(180deg, #fdfbf7 0%, #efe3cc 100%)',
              border: '2px solid #d4af37',
              outline: '1px solid #784808',
              boxShadow: '0 3px 8px rgba(120, 85, 25, 0.15), inset 0 1px 0 #ffffff',
              color: '#0f172a',
              fontFamily: "'Cinzel', serif",
              fontWeight: 900,
              fontSize: compactLandscape ? '9.5px' : '11.5px',
              textTransform: 'uppercase',
              whiteSpace: 'nowrap',
              cursor: 'pointer',
            }}
          >
            {showCardLore ? 'OCULTAR' : 'SABER MAIS'}
          </button>
        </div>
      </div>
    </div>
  );
};
