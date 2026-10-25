import React from 'react';
import type { EquipmentSlotKey } from '../../../marker_dream/src/components/screens/HudStatusAndQuestsWidgets';
import {
  ConceptStar,
  ConceptSectionHeader,
  HeroSlimeSilhouetteSvg,
  type BackpackScreenState,
} from '../../screens/backpack_shared/useBackpackScreenState';

export const LandscapeMochilaScreen: React.FC<{
  state: BackpackScreenState;
  compactLandscape?: boolean;
}> = ({ state, compactLandscape = false }) => {
  const {
    equippedBySlot,
    allUnifiedItems,
    activeEquipSlotFilter,
    setActiveEquipSlotFilter,
    activeCategory,
    setActiveCategory,
    customHeroSpritePng,
    heroDisplayName,
    realEquippedPets,
    targetPetSlotIdx,
    setTargetPetSlotIdx,
    resolvedPetConfig,
    equipPetInSlot,
    totalSlotsCount,
    selectedSlotIndex,
    setSelectedSlotIndex,
    filteredItems,
    catScrollRef,
    itemsScrollRef,
    selectDropMode,
    setSelectDropMode,
    triggerToast,
    handleDropSelectedItem,
    balloonExpandedLore,
    setBalloonExpandedLore,
    isSelectedItemEquipped,
    handlePrimaryEquipOrUse,
    selectedItem,
  } = state;

  const leftSlots: { key: EquipmentSlotKey; label: string }[] = [
    { key: 'head', label: 'CABEÇA' },
    { key: 'armor', label: 'TRAJE' },
    { key: 'accessory', label: 'ARTEFATOS' },
  ];

  // Categorias idênticas à imagem de referência Paisagem (incluindo Relíquias / Artefatos)
  const categories = [
    { id: 'todos', label: 'Todos' },
    { id: 'pets', label: 'Pets' },
    { id: 'item_pet', label: 'Item Pet' },
    { id: 'equipaveis', label: 'Equipáveis' },
    { id: 'consumiveis', label: 'Consumíveis' },
    { id: 'livros', label: 'Livros' },
    { id: 'artefatos', label: 'Relíquias' },
  ];

  // Grade Paisagem fiel ao mockup: 4 colunas x 3 linhas visíveis (com rolagem suave para 24 slots)
  const LANDSCAPE_GRID_COLS = 4;
  const landscapeTotalSlots = Math.max(12, Math.ceil(totalSlotsCount / 4) * 4);

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
      {/* LINHA CENTRAL: 2 PAINÉIS LADO A LADO (EQUIPAMENTO 48.5% | ITENS 51.5%) */}
      <div
        style={{
          position: 'relative',
          display: 'grid',
          gridTemplateColumns: '48.5% 1fr',
          gap: compactLandscape ? '6px' : '10px',
          alignItems: 'stretch',
          flex: 1,
          minHeight: 0,
          width: '100%',
        }}
      >
        {/* Estrelas Douradas nas Interseções Central Superior e Inferior */}
        <div
          style={{
            position: 'absolute',
            left: '48.5%',
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
            left: '48.5%',
            bottom: '-5px',
            transform: 'translateX(-50%)',
            zIndex: 25,
            pointerEvents: 'none',
          }}
        >
          <ConceptStar size={14} />
        </div>

        {/* ====================================================================
            PAINEL ESQUERDO: ─── ✦ EQUIPAMENTO ✦ ───
           ==================================================================== */}
        <div
          style={{
            borderRadius: '20px',
            padding: compactLandscape ? '8px 10px' : '12px 16px 14px',
            background: 'linear-gradient(180deg, #fcf9f2 0%, #f5ecdc 100%)',
            border: '2px solid #d4af37',
            outline: '1px solid #784808',
            boxShadow: 'inset 0 1px 0 #ffffff, 0 6px 16px rgba(0, 8, 24, 0.35)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            minWidth: 0,
            minHeight: 0,
            width: '100%',
            boxSizing: 'border-box',
            overflow: 'hidden',
          }}
        >
          <ConceptSectionHeader title="EQUIPAMENTO" compact={compactLandscape} />

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '23% 41% 36%',
              alignItems: 'stretch',
              gap: compactLandscape ? '6px' : '10px',
              width: '100%',
              minWidth: 0,
              flex: 1,
              marginTop: compactLandscape ? '2px' : '4px',
            }}
          >
            {/* COLUNA 1: 3 SLOTS CIRCULARES (CABEÇA, TRAJE, ARTEFATOS) */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: compactLandscape ? '5px' : '8px',
                minWidth: 0,
              }}
            >
              {leftSlots.map((s) => {
                const eqId = equippedBySlot[s.key];
                const eqItem = allUnifiedItems.find((i) => i.id === eqId) || null;
                const isFiltered = activeEquipSlotFilter === s.key;
                const circleSize = compactLandscape ? 46 : 62;
                return (
                  <button
                    key={s.key}
                    type="button"
                    onClick={() => {
                      setActiveEquipSlotFilter((prev) => (prev === s.key ? null : s.key));
                      setActiveCategory(s.key === 'accessory' ? 'artefatos' : 'equipaveis');
                    }}
                    style={{
                      flex: 1,
                      width: '100%',
                      borderRadius: '14px',
                      padding: compactLandscape ? '5px 4px' : '8px 6px',
                      background: 'linear-gradient(180deg, #fbf7ef 0%, #f3ead8 100%)',
                      border: isFiltered ? '2px solid #d4af37' : '1.5px solid #e6d7be',
                      boxShadow: 'inset 0 1px 0 #ffffff',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      minWidth: 0,
                    }}
                  >
                    <div
                      style={{
                        width: `${circleSize}px`,
                        height: `${circleSize}px`,
                        borderRadius: '9999px',
                        background: 'linear-gradient(180deg, #c6cbd4 0%, #b5bbc6 100%)',
                        border: eqItem ? '2.5px solid #f59e0b' : '1.5px solid #adb4c0',
                        boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.12)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      {eqItem ? (
                        eqItem.iconPng ? (
                          <img
                            src={eqItem.iconPng}
                            alt={eqItem.name}
                            style={{
                              width: compactLandscape ? '26px' : '34px',
                              height: compactLandscape ? '26px' : '34px',
                              objectFit: 'contain',
                            }}
                          />
                        ) : (
                          <span style={{ fontSize: compactLandscape ? '18px' : '24px' }}>
                            {eqItem.iconEmoji}
                          </span>
                        )
                      ) : (
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
                      )}
                    </div>
                    <span
                      style={{
                        marginTop: compactLandscape ? '3px' : '5px',
                        fontFamily: "'Cinzel', serif",
                        fontWeight: 900,
                        fontSize: compactLandscape ? '8.5px' : '10px',
                        color: '#0f172a',
                        textTransform: 'uppercase',
                        letterSpacing: '0.03em',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        maxWidth: '100%',
                      }}
                    >
                      {s.label}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* COLUNA 2: ALTAR EM ARCO COM SLIME + PLACA ORNAMENTADA NOME DO HERÓI / NÍVEL */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'space-between',
                minWidth: 0,
                padding: '0 2px',
              }}
            >
              <div
                style={{
                  width: '100%',
                  flex: 1,
                  minHeight: compactLandscape ? '145px' : '215px',
                  borderRadius: '999px 999px 18px 18px',
                  background:
                    'radial-gradient(circle at 50% 45%, #fdfbf7 0%, #f4ead7 70%, #eadbc0 100%)',
                  border: '2px solid #dfbe78',
                  outline: '1px solid rgba(212,175,55,0.35)',
                  boxShadow:
                    'inset 0 6px 18px rgba(180,140,60,0.18), 0 4px 12px rgba(120,85,25,0.08)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: compactLandscape ? '8px 6px 18px' : '14px 8px 26px',
                  boxSizing: 'border-box',
                }}
              >
                {customHeroSpritePng ? (
                  <img
                    src={customHeroSpritePng}
                    alt={heroDisplayName}
                    style={{
                      width: compactLandscape ? '92px' : '128px',
                      height: compactLandscape ? '92px' : '128px',
                      objectFit: 'contain',
                    }}
                  />
                ) : (
                  <HeroSlimeSilhouetteSvg
                    width={compactLandscape ? 94 : 126}
                    height={compactLandscape ? 84 : 112}
                  />
                )}
              </div>

              {/* Placa Ornamentada Inferior do Herói */}
              <div
                style={{
                  marginTop: compactLandscape ? '-16px' : '-22px',
                  zIndex: 10,
                  width: '94%',
                  padding: compactLandscape ? '5px 8px' : '8px 12px',
                  borderRadius: '14px',
                  background: 'linear-gradient(180deg, #fdfbf7 0%, #f4ead6 100%)',
                  border: '1.5px solid #d4af37',
                  boxShadow: '0 4px 10px rgba(120,85,25,0.16), inset 0 1px 0 #ffffff',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative',
                  boxSizing: 'border-box',
                }}
              >
                {/* Estrelas laterais da placa */}
                <div style={{ position: 'absolute', left: '-5px', top: '50%', transform: 'translateY(-50%)' }}>
                  <ConceptStar size={9} />
                </div>
                <div style={{ position: 'absolute', right: '-5px', top: '50%', transform: 'translateY(-50%)' }}>
                  <ConceptStar size={9} />
                </div>

                <span
                  style={{
                    fontFamily: "'Cinzel', serif",
                    fontWeight: 900,
                    fontSize: compactLandscape ? '9.5px' : '11.5px',
                    color: '#0f172a',
                    textTransform: 'uppercase',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    maxWidth: '100%',
                  }}
                >
                  {heroDisplayName}
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                  <span style={{ width: '16px', height: '1px', background: '#d4af37' }} />
                  <ConceptStar size={7} />
                  <span
                    style={{
                      fontFamily: "'Cinzel', serif",
                      fontWeight: 900,
                      fontSize: compactLandscape ? '7.5px' : '9px',
                      color: '#1e293b',
                      textTransform: 'uppercase',
                    }}
                  >
                    NÍVEL
                  </span>
                  <ConceptStar size={7} />
                  <span style={{ width: '16px', height: '1px', background: '#d4af37' }} />
                </div>
              </div>
            </div>

            {/* COLUNA 3: CARDS P1 ATIVO, P2, P3 */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: compactLandscape ? '3px' : '5px',
                minWidth: 0,
                paddingRight: '2px',
              }}
            >
              {([0, 1, 2] as const).map((slotIdx) => {
                const pet = realEquippedPets[slotIdx];
                const isTarget = targetPetSlotIdx === slotIdx;
                const isActiveBadge =
                  slotIdx === 0 || (pet && resolvedPetConfig.activePetId === pet.id);
                return (
                  <React.Fragment key={`eq-pet-${slotIdx}`}>
                    {slotIdx > 0 && (
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'center',
                          margin: '-3px 0',
                          zIndex: 5,
                        }}
                      >
                        <ConceptStar size={10} />
                      </div>
                    )}
                    <div
                      onClick={() => {
                        setTargetPetSlotIdx(slotIdx);
                        if (pet) equipPetInSlot(pet.id, slotIdx, true);
                      }}
                      style={{
                        flex: 1,
                        width: '100%',
                        borderRadius: '14px',
                        padding: compactLandscape ? '5px 7px' : '8px 10px',
                        background: 'linear-gradient(180deg, #fbf7ef 0%, #f3ead8 100%)',
                        border: isTarget ? '2px solid #d4af37' : '1.5px solid #e6d7be',
                        boxShadow: 'inset 0 1px 0 #ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        gap: compactLandscape ? '6px' : '9px',
                        cursor: 'pointer',
                        minWidth: 0,
                        boxSizing: 'border-box',
                      }}
                    >
                      {/* Retângulo do Pet */}
                      <div
                        style={{
                          width: compactLandscape ? '36px' : '46px',
                          height: compactLandscape ? '44px' : '56px',
                          borderRadius: '9px',
                          background: 'linear-gradient(180deg, #c6cbd4 0%, #b5bbc6 100%)',
                          border: '1.5px solid #adb4c0',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        {pet ? (
                          pet.avatarPng ? (
                            <img
                              src={pet.avatarPng}
                              alt={pet.name}
                              style={{ width: '80%', height: '80%', objectFit: 'contain' }}
                            />
                          ) : (
                            <span style={{ fontSize: compactLandscape ? '16px' : '20px' }}>
                              {pet.iconEmoji || '🐾'}
                            </span>
                          )
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

                      {/* Infos P1 / NÍVEL / PV */}
                      <div
                        style={{
                          flex: 1,
                          minWidth: 0,
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'center',
                          gap: compactLandscape ? '3px' : '5px',
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '4px',
                          }}
                        >
                          <span
                            style={{
                              fontFamily: "'Cinzel', serif",
                              fontWeight: 900,
                              fontSize: compactLandscape ? '11px' : '13px',
                              color: '#0f172a',
                            }}
                          >
                            P{slotIdx + 1}
                          </span>
                          {isActiveBadge && (
                            <span
                              style={{
                                padding: compactLandscape ? '1px 6px' : '2px 9px',
                                borderRadius: '8px',
                                fontFamily: "'Cinzel', serif",
                                fontWeight: 900,
                                fontSize: compactLandscape ? '7.5px' : '8.5px',
                                color: '#ffffff',
                                background: 'linear-gradient(180deg, #0b3778 0%, #031536 100%)',
                                border: '1.5px solid #d4af37',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              ATIVO
                            </span>
                          )}
                        </div>

                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '6px',
                            minWidth: 0,
                          }}
                        >
                          <span
                            style={{
                              fontFamily: "'Cinzel', serif",
                              fontWeight: 900,
                              fontSize: compactLandscape ? '7.5px' : '8.5px',
                              color: '#0f172a',
                              width: '32px',
                              flexShrink: 0,
                            }}
                          >
                            NÍVEL
                          </span>
                          <div
                            style={{
                              flex: 1,
                              height: compactLandscape ? '6px' : '8px',
                              borderRadius: '9999px',
                              background: '#c6cbd4',
                              overflow: 'hidden',
                            }}
                          >
                            {pet && (
                              <div
                                style={{
                                  width: '65%',
                                  height: '100%',
                                  background: 'linear-gradient(90deg, #f59e0b, #fbbf24)',
                                }}
                              />
                            )}
                          </div>
                        </div>

                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '6px',
                            minWidth: 0,
                          }}
                        >
                          <span
                            style={{
                              fontFamily: "'Cinzel', serif",
                              fontWeight: 900,
                              fontSize: compactLandscape ? '7.5px' : '8.5px',
                              color: '#0f172a',
                              width: '32px',
                              flexShrink: 0,
                            }}
                          >
                            PV
                          </span>
                          <div
                            style={{
                              flex: 1,
                              height: compactLandscape ? '6px' : '8px',
                              borderRadius: '9999px',
                              background: '#c6cbd4',
                              overflow: 'hidden',
                            }}
                          >
                            {pet && (
                              <div
                                style={{
                                  width: '85%',
                                  height: '100%',
                                  background: 'linear-gradient(90deg, #16a34a, #4ade80)',
                                }}
                              />
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </React.Fragment>
                );
              })}
            </div>
          </div>
        </div>

        {/* ====================================================================
            PAINEL DIREITO: ─── ✦ ITENS ✦ ───
           ==================================================================== */}
        <div
          style={{
            position: 'relative',
            borderRadius: '20px',
            padding: compactLandscape ? '8px 10px' : '12px 16px 14px',
            background: 'linear-gradient(180deg, #fcf9f2 0%, #f5ecdc 100%)',
            border: '2px solid #d4af37',
            outline: '1px solid #784808',
            boxShadow: 'inset 0 1px 0 #ffffff, 0 6px 16px rgba(0, 8, 24, 0.35)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            minWidth: 0,
            minHeight: 0,
            width: '100%',
            boxSizing: 'border-box',
            overflow: 'hidden',
          }}
        >
          {/* Topo de ITENS + Categorias + Medalhão MODO SOLTAR à direita */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '8px',
              marginBottom: compactLandscape ? '4px' : '8px',
              minWidth: 0,
              width: '100%',
            }}
          >
            <div
              style={{
                flex: 1,
                minWidth: 0,
                display: 'flex',
                flexDirection: 'column',
                gap: compactLandscape ? '4px' : '6px',
              }}
            >
              <ConceptSectionHeader title="ITENS" compact={compactLandscape} />

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  minWidth: 0,
                  width: '100%',
                }}
              >
                <div
                  ref={catScrollRef}
                  className="no-scrollbar"
                  style={{
                    flex: 1,
                    minWidth: 0,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    overflowX: 'auto',
                    paddingBottom: '2px',
                  }}
                >
                  {categories.map((cat) => {
                    const isActive = activeCategory === cat.id && !activeEquipSlotFilter;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => {
                          setActiveEquipSlotFilter(null);
                          setActiveCategory(cat.id as any);
                          setSelectedSlotIndex(null);
                        }}
                        style={{
                          padding: compactLandscape ? '4px 9px' : '6px 12px',
                          borderRadius: '10px',
                          fontFamily: "'Cinzel', serif",
                          fontWeight: 800,
                          fontSize: compactLandscape ? '8.5px' : '10px',
                          whiteSpace: 'nowrap',
                          flexShrink: 0,
                          cursor: 'pointer',
                          ...(isActive
                            ? {
                                background: 'linear-gradient(180deg, #0b3778 0%, #031536 100%)',
                                border: '1.5px solid #d4af37',
                                color: '#ffffff',
                                boxShadow: '0 2px 5px rgba(4, 27, 66, 0.35)',
                              }
                            : {
                                background: 'linear-gradient(180deg, #fbf7ef 0%, #efe4ce 100%)',
                                border: '1px solid #d8c39e',
                                color: '#0f172a',
                              }),
                        }}
                      >
                        {cat.label}
                      </button>
                    );
                  })}
                </div>

                {/* Setinha '>' para rolar categorias */}
                <button
                  type="button"
                  onClick={() => catScrollRef.current?.scrollBy({ left: 120, behavior: 'smooth' })}
                  style={{
                    width: compactLandscape ? '22px' : '26px',
                    height: compactLandscape ? '22px' : '26px',
                    borderRadius: '9999px',
                    background: 'linear-gradient(180deg, #fbf7ef 0%, #efe4ce 100%)',
                    border: '1.5px solid #d4af37',
                    color: '#0f172a',
                    fontWeight: 900,
                    fontSize: '11px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    cursor: 'pointer',
                  }}
                  title="Mais categorias"
                >
                  ❯
                </button>
              </div>
            </div>

            {/* Medalhão Circular Azul Royal & Ouro: MODO SOLTAR */}
            <button
              type="button"
              onClick={() => {
                const next = !selectDropMode;
                setSelectDropMode(next);
                triggerToast(next ? 'Modo Soltar Ativo' : 'Modo Soltar Desativado');
              }}
              style={{
                width: compactLandscape ? '50px' : '64px',
                height: compactLandscape ? '50px' : '64px',
                minWidth: compactLandscape ? '50px' : '64px',
                borderRadius: '9999px',
                background: selectDropMode
                  ? 'linear-gradient(180deg, #1d4ed8 0%, #0b3778 100%)'
                  : 'linear-gradient(180deg, #0b3778 0%, #031536 100%)',
                border: '2.5px solid #d4af37',
                outline: '1.5px solid #785212',
                boxShadow:
                  '0 4px 12px rgba(0,8,22,0.45), inset 0 1px 2px rgba(255,255,255,0.35)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                cursor: 'pointer',
                padding: '3px',
              }}
              title="Alternar Modo Soltar"
            >
              <span
                style={{
                  color: '#fff3c2',
                  fontSize: compactLandscape ? '10px' : '12px',
                  lineHeight: 1,
                  marginBottom: '2px',
                }}
              >
                ❂
              </span>
              <span
                style={{
                  fontFamily: "'Cinzel', serif",
                  fontWeight: 900,
                  fontSize: compactLandscape ? '6.5px' : '8px',
                  lineHeight: 1.1,
                  color: '#ffffff',
                  textAlign: 'center',
                  textTransform: 'uppercase',
                }}
              >
                MODO
                <br />
                SOLTAR
              </span>
            </button>
          </div>

          {/* Grade Interna de Slots Circulares (4 colunas x 3 linhas visíveis como no mockup!) */}
          <div
            style={{
              borderRadius: '16px',
              padding: compactLandscape ? '8px 10px' : '12px 16px',
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
              ref={itemsScrollRef}
              className="no-scrollbar"
              style={{
                flex: 1,
                minWidth: 0,
                minHeight: 0,
                height: '100%',
                overflowY: 'auto',
                paddingRight: '4px',
              }}
            >
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: `repeat(${LANDSCAPE_GRID_COLS}, minmax(0, 1fr))`,
                  columnGap: compactLandscape ? '10px' : '18px',
                  rowGap: compactLandscape ? '8px' : '14px',
                  padding: '4px 2px',
                }}
              >
                {Array.from({ length: landscapeTotalSlots }).map((_, idx) => {
                  const slotItem = filteredItems[idx] || null;
                  const isSelected = selectedSlotIndex === idx;
                  const isEquipped = slotItem
                    ? Object.values(equippedBySlot).includes(slotItem.id)
                    : false;
                  const slotDiameter = compactLandscape ? 48 : 66;

                  return (
                    <div
                      key={`ls-slot-${idx}`}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        position: 'relative',
                        minWidth: 0,
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          if (slotItem && selectDropMode) {
                            handleDropSelectedItem(slotItem);
                            return;
                          }
                          setBalloonExpandedLore(false);
                          setSelectedSlotIndex((prev) => (prev === idx ? null : idx));
                        }}
                        style={{
                          width: `${slotDiameter}px`,
                          height: `${slotDiameter}px`,
                          borderRadius: '9999px',
                          background: 'linear-gradient(180deg, #c6cbd4 0%, #b5bbc6 100%)',
                          border:
                            isSelected || isEquipped
                              ? '2.5px solid #f59e0b'
                              : '1.5px solid #adb4c0',
                          outline:
                            isSelected || isEquipped
                              ? '2px solid rgba(251, 191, 36, 0.45)'
                              : 'none',
                          boxShadow:
                            isSelected || isEquipped
                              ? '0 0 12px rgba(245, 158, 11, 0.55), inset 0 2px 4px rgba(0,0,0,0.12)'
                              : 'inset 0 2px 4px rgba(0,0,0,0.12)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          position: 'relative',
                          cursor: 'pointer',
                        }}
                      >
                        {slotItem ? (
                          slotItem.iconPng ? (
                            <img
                              src={slotItem.iconPng}
                              alt={slotItem.name}
                              style={{
                                width: compactLandscape ? '26px' : '34px',
                                height: compactLandscape ? '26px' : '34px',
                                objectFit: 'contain',
                              }}
                            />
                          ) : (
                            <span style={{ fontSize: compactLandscape ? '20px' : '26px' }}>
                              {slotItem.iconEmoji}
                            </span>
                          )
                        ) : (
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
                        )}

                        {(isEquipped || isSelected) && (
                          <span
                            style={{
                              position: 'absolute',
                              top: '-4px',
                              right: '-4px',
                              width: compactLandscape ? '18px' : '22px',
                              height: compactLandscape ? '18px' : '22px',
                              borderRadius: '9999px',
                              background: 'linear-gradient(180deg, #0b3778 0%, #031536 100%)',
                              border: '1.5px solid #d4af37',
                              color: '#ffffff',
                              fontFamily: "'Cinzel', serif",
                              fontWeight: 900,
                              fontSize: compactLandscape ? '8.5px' : '10px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              boxShadow: '0 2px 5px rgba(0,0,0,0.35)',
                            }}
                          >
                            E
                          </span>
                        )}
                      </button>

                      {/* Pílula QTD sobreposta na base do círculo */}
                      <span
                        style={{
                          marginTop: '-8px',
                          zIndex: 5,
                          padding: compactLandscape ? '1px 8px' : '2px 12px',
                          borderRadius: '9999px',
                          background: 'linear-gradient(180deg, #fdfbf7 0%, #efe4ce 100%)',
                          border: '1px solid #d8c39e',
                          fontFamily: "'Cinzel', serif",
                          fontWeight: 900,
                          fontSize: compactLandscape ? '7.5px' : '8.5px',
                          color: '#0f172a',
                          textTransform: 'uppercase',
                          boxShadow: '0 1px 3px rgba(120,85,25,0.12)',
                        }}
                      >
                        {slotItem ? `×${slotItem.quantity}` : 'QTD'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Barra de Rolagem Vertical Dourada à Direita */}
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
                onClick={() => itemsScrollRef.current?.scrollBy({ top: -100, behavior: 'smooth' })}
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
                    height: '42%',
                    borderRadius: '9999px',
                    background: 'linear-gradient(180deg, #f59e0b 0%, #b45309 100%)',
                  }}
                />
              </div>
              <button
                type="button"
                onClick={() => itemsScrollRef.current?.scrollBy({ top: 100, behavior: 'smooth' })}
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
          BARRA INSPETORA INFERIOR (LARGURA TOTAL EM PAISAGEM)
          [ ( + ) NOME DO ITEM / CATEGORIA | QUANTIDADE | ATRIBUTOS ] [ EQUIPAR / USAR ] [ SABER MAIS ] [ SOLTAR 1x ]
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
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: compactLandscape ? '10px' : '18px',
          width: '100%',
          minWidth: 0,
          boxSizing: 'border-box',
          flexShrink: 0,
        }}
      >
        {/* Esquerda e Centro da Barra Inspetora */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: compactLandscape ? '10px' : '14px',
            flex: 1,
            minWidth: 0,
          }}
        >
          {/* Slot Circular de Preview do Item Selecionado */}
          <div
            style={{
              width: compactLandscape ? '44px' : '56px',
              height: compactLandscape ? '44px' : '56px',
              borderRadius: '9999px',
              background: 'linear-gradient(180deg, #c6cbd4 0%, #b5bbc6 100%)',
              border: '1.5px solid #adb4c0',
              boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.12)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            {selectedItem ? (
              selectedItem.iconPng ? (
                <img
                  src={selectedItem.iconPng}
                  alt={selectedItem.name}
                  style={{ width: '62%', height: '62%', objectFit: 'contain' }}
                />
              ) : (
                <span style={{ fontSize: compactLandscape ? '20px' : '24px' }}>
                  {selectedItem.iconEmoji}
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

          {/* Colunas: NOME DO ITEM / CATEGORIA | QUANTIDADE | ATRIBUTOS */}
          <div
            style={{
              flex: 1,
              minWidth: 0,
              display: 'grid',
              gridTemplateColumns: '1.15fr 0.65fr 1.4fr',
              gap: compactLandscape ? '10px' : '16px',
              alignItems: 'center',
            }}
          >
            {/* Coluna 1: NOME DO ITEM / CATEGORIA */}
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
                {selectedItem ? selectedItem.name : 'NOME DO ITEM'}
              </div>
              <div
                style={{
                  fontFamily: "'Cinzel', serif",
                  fontWeight: 900,
                  fontSize: compactLandscape ? '9px' : '10.5px',
                  color: '#0f172a',
                  paddingTop: '4px',
                  textTransform: 'uppercase',
                }}
              >
                {selectedItem
                  ? selectedItem.equipSlot === 'accessory'
                    ? 'RELÍQUIAS / ARTEFATOS'
                    : selectedItem.category.toUpperCase()
                  : 'CATEGORIA'}
              </div>
            </div>

            {/* Coluna 2: QUANTIDADE */}
            <div
              style={{
                borderLeft: '1.5px solid #c59638',
                paddingLeft: compactLandscape ? '10px' : '14px',
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
                QUANTIDADE
              </div>
              <div
                style={{
                  fontFamily: "'Cinzel', serif",
                  fontWeight: 800,
                  fontSize: compactLandscape ? '9.5px' : '11px',
                  color: '#334155',
                  borderBottom: '1px solid #d4c3a3',
                  paddingBottom: '3px',
                  marginTop: '6px',
                }}
              >
                {selectedItem ? `×${selectedItem.quantity}` : '\u00A0'}
              </div>
            </div>

            {/* Coluna 3: ATRIBUTOS (3 linhas pautadas ou texto de status/lore) */}
            <div
              style={{
                borderLeft: '1.5px solid #c59638',
                paddingLeft: compactLandscape ? '10px' : '14px',
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
              {selectedItem ? (
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
                  {balloonExpandedLore
                    ? selectedItem.detailedLore
                    : selectedItem.statsText || selectedItem.shortDescription}
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

        {/* Direita: 3 Botões de Ação Fiéis à Imagem ([ EQUIPAR / USAR ] [ SABER MAIS ] [ SOLTAR 1x ]) */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: compactLandscape ? '6px' : '10px',
            flexShrink: 0,
          }}
        >
          <button
            type="button"
            onClick={() => handlePrimaryEquipOrUse()}
            style={{
              padding: compactLandscape ? '8px 14px' : '12px 22px',
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
            {isSelectedItemEquipped ? 'DESEQUIPAR' : 'EQUIPAR / USAR'}
          </button>

          <button
            type="button"
            onClick={() => {
              if (!selectedItem) {
                triggerToast('Selecione um item para ver detalhes');
                return;
              }
              setBalloonExpandedLore((v) => !v);
            }}
            style={{
              padding: compactLandscape ? '8px 14px' : '12px 20px',
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
            {balloonExpandedLore ? 'OCULTAR' : 'SABER MAIS'}
          </button>

          <button
            type="button"
            onClick={() => handleDropSelectedItem()}
            style={{
              padding: compactLandscape ? '8px 14px' : '12px 20px',
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
            SOLTAR 1x
          </button>
        </div>
      </div>
    </div>
  );
};
