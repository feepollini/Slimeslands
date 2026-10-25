import React from 'react';
import type { EquipmentSlotKey } from '../../../marker_dream/src/components/screens/HudStatusAndQuestsWidgets';
import {
  ConceptStar,
  ConceptSectionHeader,
  HeroSlimeSilhouetteSvg,
  type BackpackScreenState,
} from '../backpack_shared/useBackpackScreenState';

export const MobileMochilaScreen: React.FC<{ state: BackpackScreenState }> = ({ state }) => {
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
    GRID_COLS,
    selectedSlotIndex,
    setSelectedSlotIndex,
    filteredItems,
    catScrollRef,
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

  const categories = [
    { id: 'todos', label: 'Todos' },
    { id: 'pets', label: 'Pets' },
    { id: 'item_pet', label: 'Item Pet' },
    { id: 'equipaveis', label: 'Equipáveis' },
    { id: 'artefatos', label: 'Artefatos' },
    { id: 'consumiveis', label: 'Consumíveis' },
    { id: 'livros', label: 'Livros' },
  ];

  const rowsCount = Math.ceil(totalSlotsCount / GRID_COLS);
  const selectedRow =
    selectedSlotIndex !== null ? Math.floor(selectedSlotIndex / GRID_COLS) : null;
  const placeBalloonBelow = selectedRow !== null ? selectedRow < 2 : true;

  const renderAdaptiveItemBalloon = (slotIndex: number) => {
    const row = Math.floor(slotIndex / GRID_COLS);
    const col = slotIndex % GRID_COLS;
    const placeBelow = row < 2;
    const arrowLeftPercent = col * 20 + 10;
    const item = filteredItems[slotIndex] || null;

    return (
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          gridColumn: '1 / -1',
          position: 'relative',
          zIndex: 35,
          margin: '4px 0',
          width: '100%',
          minWidth: 0,
        }}
      >
        {placeBelow && (
          <div
            style={{
              width: '14px',
              height: '14px',
              transform: 'rotate(45deg)',
              marginBottom: '-8px',
              marginLeft: `calc(${arrowLeftPercent}% - 7px)`,
              background: '#fdfaf3',
              borderLeft: '2px solid #d4af37',
              borderTop: '2px solid #d4af37',
              position: 'relative',
              zIndex: 10,
            }}
          />
        )}

        <div
          style={{
            borderRadius: '16px',
            padding: '10px 12px',
            background: 'linear-gradient(180deg, #fdfbf7 0%, #f3ead8 100%)',
            border: '2px solid #d4af37',
            outline: '1px solid #785212',
            boxShadow: '0 10px 24px rgba(15, 23, 42, 0.25), inset 0 1px 0 #ffffff',
            position: 'relative',
            zIndex: 20,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
              <div
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '9999px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  background: 'linear-gradient(180deg, #c6cbd4 0%, #b5bbc6 100%)',
                  border: '2px solid #d4af37',
                }}
              >
                {item ? (
                  item.iconPng ? (
                    <img src={item.iconPng} alt={item.name} style={{ width: '24px', height: '24px', objectFit: 'contain' }} />
                  ) : (
                    <span style={{ fontSize: '18px' }}>{item.iconEmoji}</span>
                  )
                ) : (
                  <span style={{ color: '#64748b', fontSize: '20px', fontWeight: 300 }}>+</span>
                )}
              </div>
              <div style={{ minWidth: 0 }}>
                <div
                  style={{
                    fontFamily: "'Cinzel', serif",
                    fontWeight: 900,
                    fontSize: '11px',
                    color: '#0f172a',
                    textTransform: 'uppercase',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {item ? item.name : `SLOT #${slotIndex + 1} VAZIO`}
                </div>
                <div
                  style={{
                    fontFamily: "'Cinzel', serif",
                    fontWeight: 700,
                    fontSize: '9px',
                    color: '#475569',
                    textTransform: 'uppercase',
                  }}
                >
                  {item
                    ? `${item.equipSlot === 'accessory' ? 'ARTEFATO' : item.category.toUpperCase()} • QTD: ×${item.quantity}`
                    : 'CATEGORIA: LIVRE • QTD: 0'}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setSelectedSlotIndex(null);
                setBalloonExpandedLore(false);
              }}
              style={{
                width: '24px',
                height: '24px',
                borderRadius: '9999px',
                border: '1px solid #d4af37',
                background: '#ffffff',
                color: '#0f172a',
                fontSize: '11px',
                fontWeight: 900,
                cursor: 'pointer',
                flexShrink: 0,
              }}
            >
              ✕
            </button>
          </div>

          <div
            style={{
              marginTop: '6px',
              paddingTop: '6px',
              borderTop: '1px solid rgba(212,175,55,0.4)',
              fontSize: '10px',
              color: '#334155',
              lineHeight: 1.35,
            }}
          >
            {item ? (
              <>
                <div style={{ fontWeight: 700, color: '#0f172a' }}>
                  {item.statsText || item.shortDescription}
                </div>
                {balloonExpandedLore && (
                  <div style={{ marginTop: '4px', color: '#475569' }}>{item.detailedLore}</div>
                )}
              </>
            ) : (
              <span style={{ color: '#64748b' }}>
                Slot disponível. Itens coletados em fases ou criados no Editor de Inventário / Motion Canvas aparecem aqui.
              </span>
            )}
          </div>

          <div
            style={{
              marginTop: '8px',
              display: 'grid',
              gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
              gap: '6px',
            }}
          >
            <button
              type="button"
              onClick={() => handlePrimaryEquipOrUse(item)}
              style={{
                padding: '6px 4px',
                borderRadius: '10px',
                fontFamily: "'Cinzel', serif",
                fontWeight: 900,
                fontSize: '8.5px',
                textTransform: 'uppercase',
                color: '#ffffff',
                background: 'linear-gradient(180deg, #0b3778 0%, #041b42 100%)',
                border: '1.5px solid #d4af37',
                cursor: 'pointer',
              }}
            >
              {isSelectedItemEquipped ? 'DESEQUIPAR' : 'EQUIPAR / USAR'}
            </button>
            <button
              type="button"
              onClick={() => setBalloonExpandedLore((v) => !v)}
              style={{
                padding: '6px 4px',
                borderRadius: '10px',
                fontFamily: "'Cinzel', serif",
                fontWeight: 900,
                fontSize: '8.5px',
                textTransform: 'uppercase',
                color: '#0f172a',
                background: 'linear-gradient(180deg, #fdfbf7 0%, #e9dec8 100%)',
                border: '1.5px solid #c59638',
                cursor: 'pointer',
              }}
            >
              {balloonExpandedLore ? 'OCULTAR' : 'SABER MAIS'}
            </button>
            <button
              type="button"
              onClick={() => handleDropSelectedItem(item)}
              style={{
                padding: '6px 4px',
                borderRadius: '10px',
                fontFamily: "'Cinzel', serif",
                fontWeight: 900,
                fontSize: '8.5px',
                textTransform: 'uppercase',
                color: '#0f172a',
                background: 'linear-gradient(180deg, #fdfbf7 0%, #e9dec8 100%)',
                border: '1.5px solid #c59638',
                cursor: 'pointer',
              }}
            >
              SOLTAR 1x
            </button>
          </div>
        </div>

        {!placeBelow && (
          <div
            style={{
              width: '14px',
              height: '14px',
              transform: 'rotate(45deg)',
              marginTop: '-8px',
              marginLeft: `calc(${arrowLeftPercent}% - 7px)`,
              background: '#f3ead8',
              borderRight: '2px solid #d4af37',
              borderBottom: '2px solid #d4af37',
              position: 'relative',
              zIndex: 30,
            }}
          />
        )}
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '100%', flexShrink: 0 }}>
      {/* 1. SEÇÃO EQUIPAMENTO COMPACTA EM MOBILE */}
      <div
        style={{
          borderRadius: '18px',
          padding: '6px 8px 8px',
          background: 'linear-gradient(180deg, #fcf9f2 0%, #f5ecdc 100%)',
          border: '2px solid #d4af37',
          outline: '1px solid #784808',
          boxShadow: 'inset 0 1px 0 #ffffff, 0 6px 16px rgba(0, 8, 24, 0.35)',
          display: 'flex',
          flexDirection: 'column',
          minWidth: 0,
          width: '100%',
          boxSizing: 'border-box',
          overflow: 'hidden',
          flexShrink: 0,
        }}
      >
        <ConceptSectionHeader title="EQUIPAMENTO" compact />

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '23% 41% 36%',
            alignItems: 'center',
            gap: '4px',
            width: '100%',
            minWidth: 0,
          }}
        >
          {/* ESQUERDA: CABEÇA, TRAJE, ARTEFATOS */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: 0 }}>
            {leftSlots.map((s) => {
              const eqId = equippedBySlot[s.key];
              const eqItem = allUnifiedItems.find((i) => i.id === eqId) || null;
              const isFiltered = activeEquipSlotFilter === s.key;
              return (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => {
                    setActiveEquipSlotFilter((prev) => (prev === s.key ? null : s.key));
                    setActiveCategory(s.key === 'accessory' ? 'artefatos' : 'equipaveis');
                  }}
                  style={{
                    width: '100%',
                    borderRadius: '12px',
                    padding: '3px 2px',
                    background: 'linear-gradient(180deg, #fbf7ef 0%, #f3ead8 100%)',
                    border: isFiltered ? '2px solid #d4af37' : '1.5px solid #e2d3b8',
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
                      width: '32px',
                      height: '32px',
                      borderRadius: '9999px',
                      background: 'linear-gradient(180deg, #c6cbd4 0%, #b5bbc6 100%)',
                      border: eqItem ? '2px solid #f59e0b' : '1.5px solid #d5d9e0',
                      boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.12)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {eqItem ? (
                      eqItem.iconPng ? (
                        <img
                          src={eqItem.iconPng}
                          alt={eqItem.name}
                          style={{ width: '20px', height: '20px', objectFit: 'contain' }}
                        />
                      ) : (
                        <span style={{ fontSize: '14px' }}>{eqItem.iconEmoji}</span>
                      )
                    ) : (
                      <span style={{ color: '#7c8390', fontSize: '17px', fontWeight: 300, lineHeight: 1 }}>+</span>
                    )}
                  </div>
                  <span
                    style={{
                      marginTop: '2px',
                      fontFamily: "'Cinzel', serif",
                      fontWeight: 900,
                      fontSize: '7px',
                      color: '#0f172a',
                      textTransform: 'uppercase',
                      letterSpacing: '0.02em',
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

          {/* CENTRO: ALTAR EM ARCO COM SLIME + PLACA NOME DO HERÓI / NÍVEL */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'flex-end',
              minWidth: 0,
              padding: '0 2px',
            }}
          >
            <div
              style={{
                width: '100%',
                height: '114px',
                borderRadius: '999px 999px 18px 18px',
                background: 'radial-gradient(circle at 50% 42%, #fdfbf7 0%, #f4ead7 72%, #eadbc0 100%)',
                border: '2px solid #dfbe78',
                boxShadow: 'inset 0 4px 14px rgba(180,140,60,0.16), 0 4px 10px rgba(120,85,25,0.08)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '6px 4px 14px',
              }}
            >
              {customHeroSpritePng ? (
                <img
                  src={customHeroSpritePng}
                  alt={heroDisplayName}
                  style={{ width: '72px', height: '72px', objectFit: 'contain' }}
                />
              ) : (
                <HeroSlimeSilhouetteSvg width={70} height={64} />
              )}
            </div>

            <div
              style={{
                marginTop: '-14px',
                zIndex: 10,
                width: '94%',
                padding: '3px 5px',
                borderRadius: '12px',
                background: 'linear-gradient(180deg, #fdfbf7 0%, #f4ead6 100%)',
                border: '1.5px solid #d4af37',
                boxShadow: '0 3px 8px rgba(120,85,25,0.14), inset 0 1px 0 #ffffff',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <span
                style={{
                  fontFamily: "'Cinzel', serif",
                  fontWeight: 900,
                  fontSize: '8px',
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
              <div style={{ display: 'flex', alignItems: 'center', gap: '3px', marginTop: '1px' }}>
                <span style={{ width: '10px', height: '1px', background: '#d4af37' }} />
                <ConceptStar size={6} />
                <span
                  style={{
                    fontFamily: "'Cinzel', serif",
                    fontWeight: 800,
                    fontSize: '6.5px',
                    color: '#334155',
                    textTransform: 'uppercase',
                  }}
                >
                  NÍVEL
                </span>
                <ConceptStar size={6} />
                <span style={{ width: '10px', height: '1px', background: '#d4af37' }} />
              </div>
            </div>
          </div>

          {/* DIREITA: P1 ATIVO, P2, P3 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0, paddingRight: '2px' }}>
            {([0, 1, 2] as const).map((slotIdx) => {
              const pet = realEquippedPets[slotIdx];
              const isTarget = targetPetSlotIdx === slotIdx;
              const isActiveBadge = slotIdx === 0 || (pet && resolvedPetConfig.activePetId === pet.id);
              return (
                <React.Fragment key={`eq-pet-${slotIdx}`}>
                  {slotIdx > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'center', margin: '-3px 0', zIndex: 5 }}>
                      <ConceptStar size={8} />
                    </div>
                  )}
                  <div
                    onClick={() => {
                      setTargetPetSlotIdx(slotIdx);
                      if (pet) equipPetInSlot(pet.id, slotIdx, true);
                    }}
                    style={{
                      width: '100%',
                      borderRadius: '12px',
                      padding: '3px 5px',
                      background: 'linear-gradient(180deg, #fbf7ef 0%, #f3ead8 100%)',
                      border: isTarget ? '2px solid #d4af37' : '1.5px solid #e2d3b8',
                      boxShadow: 'inset 0 1px 0 #ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      cursor: 'pointer',
                      minWidth: 0,
                    }}
                  >
                    <div
                      style={{
                        width: '26px',
                        height: '32px',
                        borderRadius: '8px',
                        background: 'linear-gradient(180deg, #c6cbd4 0%, #b5bbc6 100%)',
                        border: '1.5px solid #d5d9e0',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      {pet ? (
                        <span style={{ fontSize: '13px' }}>{pet.iconEmoji || '🐾'}</span>
                      ) : (
                        <span style={{ color: '#7c8390', fontSize: '15px', fontWeight: 300 }}>+</span>
                      )}
                    </div>

                    <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '2px' }}>
                        <span
                          style={{
                            fontFamily: "'Cinzel', serif",
                            fontWeight: 900,
                            fontSize: '8.5px',
                            color: '#0f172a',
                          }}
                        >
                          P{slotIdx + 1}
                        </span>
                        {isActiveBadge && (
                          <span
                            style={{
                              padding: '1px 4px',
                              borderRadius: '9999px',
                              fontFamily: "'Cinzel', serif",
                              fontWeight: 900,
                              fontSize: '6px',
                              color: '#ffffff',
                              background: 'linear-gradient(180deg, #0b3778 0%, #041b42 100%)',
                              border: '1px solid #d4af37',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            ATIVO
                          </span>
                        )}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '3px', minWidth: 0 }}>
                        <span
                          style={{
                            fontFamily: "'Cinzel', serif",
                            fontWeight: 800,
                            fontSize: '6px',
                            color: '#1e293b',
                            width: '22px',
                            flexShrink: 0,
                          }}
                        >
                          NÍVEL
                        </span>
                        <div
                          style={{
                            flex: 1,
                            minWidth: '16px',
                            height: '5px',
                            borderRadius: '9999px',
                            background: '#c6cbd4',
                          }}
                        />
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '3px', minWidth: 0 }}>
                        <span
                          style={{
                            fontFamily: "'Cinzel', serif",
                            fontWeight: 800,
                            fontSize: '6px',
                            color: '#1e293b',
                            width: '22px',
                            flexShrink: 0,
                          }}
                        >
                          PV
                        </span>
                        <div
                          style={{
                            flex: 1,
                            minWidth: '16px',
                            height: '5px',
                            borderRadius: '9999px',
                            background: '#c6cbd4',
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </React.Fragment>
              );
            })}
          </div>
        </div>
      </div>

      {/* 2. SEÇÃO ITENS AMPLA EM MOBILE (SEM CAIXA DE SCROLL INTERNA PRENDENDO OS SLOTS!) */}
      <div
        style={{
          borderRadius: '18px',
          padding: '8px 8px 10px',
          background: 'linear-gradient(180deg, #fcf9f2 0%, #f5ecdc 100%)',
          border: '2px solid #d4af37',
          outline: '1px solid #784808',
          boxShadow: 'inset 0 1px 0 #ffffff, 0 6px 16px rgba(0, 8, 24, 0.35)',
          display: 'flex',
          flexDirection: 'column',
          minWidth: 0,
          width: '100%',
          boxSizing: 'border-box',
          overflow: 'hidden',
          flexShrink: 0,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '6px',
            marginBottom: '6px',
            minWidth: 0,
            width: '100%',
          }}
        >
          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <ConceptSectionHeader title="ITENS" compact />

            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', minWidth: 0, width: '100%' }}>
              <div
                ref={catScrollRef}
                className="no-scrollbar"
                style={{
                  flex: 1,
                  minWidth: 0,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
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
                        padding: '4px 9px',
                        borderRadius: '9px',
                        fontFamily: "'Cinzel', serif",
                        fontWeight: 800,
                        fontSize: '8.5px',
                        whiteSpace: 'nowrap',
                        flexShrink: 0,
                        cursor: 'pointer',
                        ...(isActive
                          ? {
                              background: 'linear-gradient(180deg, #0b3778 0%, #041b42 100%)',
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

              <button
                type="button"
                onClick={() => catScrollRef.current?.scrollBy({ left: 110, behavior: 'smooth' })}
                style={{
                  width: '24px',
                  height: '24px',
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

          <button
            type="button"
            onClick={() => {
              const next = !selectDropMode;
              setSelectDropMode(next);
              triggerToast(next ? 'Modo Soltar Ativo' : 'Modo Soltar Desativado');
            }}
            style={{
              width: '48px',
              height: '48px',
              minWidth: '48px',
              borderRadius: '9999px',
              background: selectDropMode
                ? 'linear-gradient(180deg, #1d4ed8 0%, #0b3778 100%)'
                : 'linear-gradient(180deg, #0b3778 0%, #031536 100%)',
              border: '2px solid #d4af37',
              outline: '1.5px solid #785212',
              boxShadow: '0 4px 10px rgba(0,8,22,0.4), inset 0 1px 2px rgba(255,255,255,0.35)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              cursor: 'pointer',
              padding: '2px',
            }}
            title="Alternar Modo Soltar"
          >
            <span style={{ color: '#fff3c2', fontSize: '9px', lineHeight: 1, marginBottom: '1px' }}>❂</span>
            <span
              style={{
                fontFamily: "'Cinzel', serif",
                fontWeight: 900,
                fontSize: '6.5px',
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

        <div
          style={{
            borderRadius: '14px',
            padding: '10px 6px',
            background: 'linear-gradient(180deg, #f8f2e4 0%, #f2e8d5 100%)',
            border: '1.5px solid #e4d3b5',
            minWidth: 0,
          }}
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(5, minmax(0, 1fr))',
              columnGap: '6px',
              rowGap: '10px',
              padding: '2px 0',
            }}
          >
            {Array.from({ length: rowsCount }).map((_, rowIndex) => {
              const startIdx = rowIndex * GRID_COLS;
              const isBalloonInThisRow = selectedRow === rowIndex && selectedSlotIndex !== null;

              return (
                <React.Fragment key={`item-row-${rowIndex}`}>
                  {isBalloonInThisRow && !placeBalloonBelow && renderAdaptiveItemBalloon(selectedSlotIndex!)}

                  {Array.from({ length: GRID_COLS }).map((__, colOffset) => {
                    const idx = startIdx + colOffset;
                    if (idx >= totalSlotsCount) return null;
                    const slotItem = filteredItems[idx] || null;
                    const isSelected = selectedSlotIndex === idx;
                    const isEquipped =
                      slotItem ? Object.values(equippedBySlot).includes(slotItem.id) : false;

                    return (
                      <div
                        key={`slot-${idx}`}
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
                            width: '48px',
                            height: '48px',
                            borderRadius: '9999px',
                            background: 'linear-gradient(180deg, #c6cbd4 0%, #b5bbc6 100%)',
                            border: isSelected ? '2.5px solid #f59e0b' : '1.5px solid #d5d9e0',
                            boxShadow: isSelected
                              ? '0 0 12px rgba(245, 158, 11, 0.75), inset 0 2px 4px rgba(0,0,0,0.12)'
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
                                style={{ width: '26px', height: '26px', objectFit: 'contain' }}
                              />
                            ) : (
                              <span style={{ fontSize: '18px' }}>{slotItem.iconEmoji}</span>
                            )
                          ) : (
                            <span style={{ color: '#7c8390', fontSize: '22px', fontWeight: 300, lineHeight: 1 }}>
                              +
                            </span>
                          )}

                          {(isEquipped || isSelected) && (
                            <span
                              style={{
                                position: 'absolute',
                                top: '-3px',
                                right: '-3px',
                                width: '18px',
                                height: '18px',
                                borderRadius: '9999px',
                                background: 'linear-gradient(180deg, #0b3778 0%, #041b42 100%)',
                                border: '1.5px solid #d4af37',
                                color: '#ffffff',
                                fontFamily: "'Cinzel', serif",
                                fontWeight: 900,
                                fontSize: '8.5px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                            >
                              E
                            </span>
                          )}
                        </button>

                        <span
                          style={{
                            marginTop: '-7px',
                            zIndex: 5,
                            padding: '1px 8px',
                            borderRadius: '9999px',
                            background: 'linear-gradient(180deg, #fdfbf7 0%, #efe4ce 100%)',
                            border: '1px solid #d8c39e',
                            fontFamily: "'Cinzel', serif",
                            fontWeight: 900,
                            fontSize: '7.5px',
                            color: '#0f172a',
                            textTransform: 'uppercase',
                          }}
                        >
                          {slotItem ? `×${slotItem.quantity}` : 'QTD'}
                        </span>
                      </div>
                    );
                  })}

                  {isBalloonInThisRow && placeBalloonBelow && renderAdaptiveItemBalloon(selectedSlotIndex!)}
                </React.Fragment>
              );
            })}
          </div>
        </div>
      </div>

      {/* 3. RODAPÉ MOBILE DA MOCHILA */}
      <div
        style={{
          borderRadius: '18px',
          padding: '8px 10px',
          background: 'linear-gradient(180deg, #fcf9f2 0%, #f3e8d3 100%)',
          border: '2px solid #d4af37',
          outline: '1px solid #784808',
          boxShadow: 'inset 0 1px 0 #ffffff, 0 6px 16px rgba(0, 8, 24, 0.35)',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          width: '100%',
          minWidth: 0,
          boxSizing: 'border-box',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', minWidth: 0 }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '9999px',
              background: 'linear-gradient(180deg, #c6cbd4 0%, #b5bbc6 100%)',
              border: '1.5px solid #d5d9e0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            {selectedItem ? (
              <span style={{ fontSize: '18px' }}>{selectedItem.iconEmoji}</span>
            ) : (
              <span style={{ color: '#7c8390', fontSize: '22px', fontWeight: 300 }}>+</span>
            )}
          </div>

          <div
            style={{
              flex: 1,
              minWidth: 0,
              display: 'grid',
              gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)',
              gap: '10px',
              alignItems: 'center',
            }}
          >
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  fontFamily: "'Cinzel', serif",
                  fontWeight: 900,
                  fontSize: '9px',
                  color: '#0f172a',
                  borderBottom: '1px solid #d8c39e',
                  paddingBottom: '2px',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {selectedItem ? selectedItem.name : 'NOME DO ITEM'}
              </div>
              <div
                style={{
                  fontFamily: "'Cinzel', serif",
                  fontWeight: 800,
                  fontSize: '8px',
                  color: '#334155',
                  paddingTop: '2px',
                }}
              >
                {selectedItem
                  ? selectedItem.equipSlot === 'accessory'
                    ? 'ARTEFATOS'
                    : selectedItem.category.toUpperCase()
                  : 'CATEGORIA'}
              </div>
            </div>

            <div style={{ borderLeft: '1.5px solid #d4af37', paddingLeft: '10px', minWidth: 0 }}>
              <div style={{ fontFamily: "'Cinzel', serif", fontWeight: 900, fontSize: '8.5px', color: '#0f172a' }}>
                ATRIBUTOS
              </div>
              <div
                style={{
                  fontSize: '8.5px',
                  color: '#475569',
                  borderBottom: '1px solid #d8c39e',
                  paddingBottom: '2px',
                  marginTop: '2px',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {selectedItem?.statsText || selectedItem?.shortDescription || '—'}
              </div>
            </div>
          </div>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
            gap: '8px',
            width: '100%',
          }}
        >
          <button
            type="button"
            onClick={() => handlePrimaryEquipOrUse()}
            style={{
              padding: '8px 6px',
              borderRadius: '11px',
              background: 'linear-gradient(180deg, #0b3778 0%, #041b42 100%)',
              border: '2px solid #d4af37',
              color: '#ffffff',
              fontFamily: "'Cinzel', serif",
              fontWeight: 900,
              fontSize: '9.5px',
              textTransform: 'uppercase',
              cursor: 'pointer',
            }}
          >
            USAR
          </button>

          <button
            type="button"
            onClick={() => {
              if (selectedSlotIndex === null) setSelectedSlotIndex(0);
              setBalloonExpandedLore((v) => !v);
            }}
            style={{
              padding: '8px 6px',
              borderRadius: '11px',
              background: 'linear-gradient(180deg, #fdfbf7 0%, #efe3cc 100%)',
              border: '2px solid #d4af37',
              color: '#0f172a',
              fontFamily: "'Cinzel', serif",
              fontWeight: 900,
              fontSize: '9.5px',
              textTransform: 'uppercase',
              cursor: 'pointer',
            }}
          >
            SABER MAIS
          </button>

          <button
            type="button"
            onClick={() => handleDropSelectedItem()}
            style={{
              padding: '8px 6px',
              borderRadius: '11px',
              background: 'linear-gradient(180deg, #fdfbf7 0%, #efe3cc 100%)',
              border: '2px solid #d4af37',
              color: '#0f172a',
              fontFamily: "'Cinzel', serif",
              fontWeight: 900,
              fontSize: '9.5px',
              textTransform: 'uppercase',
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
