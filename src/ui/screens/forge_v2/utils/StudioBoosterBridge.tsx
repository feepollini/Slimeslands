import React, { useState, useEffect } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { ProceduralEcosystemModal } from '../../../../card_studio/src/components/ProceduralEcosystemModal';
import { PlayerBoosterRevealModal } from '../../../../card_studio/src/components/PlayerBoosterRevealModal';
import {
  DEFAULT_BOOSTER_MODELS,
  DEFAULT_CLASS_BALANCE_TABLES,
  DEFAULT_DECK_CATEGORIES,
  INITIAL_BASE_CHARACTERS,
  generateBoosterPack,
} from '../../../../card_studio/src/utils/proceduralEngine';
import {
  loadGameMatrixSnapshot,
  saveGameMatrixSnapshot,
} from '../../../../card_studio/src/utils/matrixPersistence';
import { CardData } from '../../../../card_studio/src/types/card';
import {
  BaseCharacter,
  BoosterModel,
  CardClass,
  ClassBalanceTable,
  DeckCategory,
} from '../../../../card_studio/src/types/slimelands';

export interface StudioBoosterOptions {
  initialSection?: 'generator' | 'boosters' | 'characters' | 'balance' | 'parry-sim';
  onComplete?: (cards: CardData[]) => void;
  onClose?: () => void;
}

const BoosterBridgeModal: React.FC<{
  options: StudioBoosterOptions;
  onDismiss: () => void;
}> = ({ options, onDismiss }) => {
  const [isOpen, setIsOpen] = useState(true);
  const [baseCharacters, setBaseCharacters] = useState<BaseCharacter[]>(INITIAL_BASE_CHARACTERS);
  const [balanceTables, setBalanceTables] = useState<Record<CardClass, ClassBalanceTable>>(DEFAULT_CLASS_BALANCE_TABLES);
  const [boosterModels, setBoosterModels] = useState<BoosterModel[]>(DEFAULT_BOOSTER_MODELS);
  const [decks, setDecks] = useState<DeckCategory[]>(DEFAULT_DECK_CATEGORIES);
  const [globalBackImageUrl, setGlobalBackImageUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadGameMatrixSnapshot().then(snapshot => {
      if (cancelled || !snapshot) return;
      if (Array.isArray(snapshot.baseCharacters) && snapshot.baseCharacters.length > 0) {
        setBaseCharacters(snapshot.baseCharacters);
      }
      if (snapshot.balanceTables) setBalanceTables(snapshot.balanceTables);
      if (Array.isArray(snapshot.boosterModels) && snapshot.boosterModels.length > 0) {
        setBoosterModels(snapshot.boosterModels);
      }
      if (Array.isArray(snapshot.decks) && snapshot.decks.length > 0) {
        setDecks(snapshot.decks);
      }
      if (snapshot.globalBackImageUrl !== undefined) {
        setGlobalBackImageUrl(snapshot.globalBackImageUrl);
      }
    });
    return () => { cancelled = true; };
  }, []);

  const handleClose = () => {
    setIsOpen(false);
    options.onClose?.();
    setTimeout(onDismiss, 200);
  };

  const handleGrant = (newCards: CardData[]) => {
    const cardsWithBack = newCards.map(c => ({
      ...c,
      backImageUrl: c.backImageUrl || globalBackImageUrl || null,
    }));
    loadGameMatrixSnapshot().then(snapshot => {
      const existing = snapshot?.cards || [];
      const merged = [...cardsWithBack, ...existing];
      saveGameMatrixSnapshot({
        version: snapshot?.version || 1,
        updatedAt: new Date().toISOString(),
        activeCardId: cardsWithBack[0]?.id || snapshot?.activeCardId || '',
        cards: merged,
        baseCharacters,
        balanceTables,
        boosterModels,
        decks,
        globalBackImageUrl,
      }).catch(err => console.warn('Falha ao persistir matriz:', err));
    });
    options.onComplete?.(cardsWithBack);
  };

  return (
    <ProceduralEcosystemModal
      {...({
        isOpen,
        initialSection: options.initialSection || 'boosters',
        onClose: handleClose,
        baseCharacters,
        onUpdateBaseCharacters: setBaseCharacters,
        balanceTables,
        onUpdateBalanceTables: setBalanceTables,
        boosterModels,
        onUpdateBoosterModels: setBoosterModels,
        decks,
        onGrantCardsToInventory: handleGrant,
        onInspectCard: () => {},
      } as any)}
    />
  );
};

let activeRoot: Root | null = null;
let activePortalEl: HTMLElement | null = null;

export function openStudioBoosterModal(options: StudioBoosterOptions = {}): void {
  if (activeRoot && activePortalEl) {
    try {
      activeRoot.unmount();
      activePortalEl.remove();
    } catch (_) {}
    activeRoot = null;
    activePortalEl = null;
  }

  const portal = document.createElement('div');
  portal.id = 'studio-booster-modal-portal';
  portal.style.position = 'fixed';
  portal.style.inset = '0';
  portal.style.zIndex = '9999999';
  portal.style.pointerEvents = 'auto';
  document.body.appendChild(portal);

  activePortalEl = portal;
  activeRoot = createRoot(portal);

  const cleanup = () => {
    if (activeRoot) {
      activeRoot.unmount();
      activeRoot = null;
    }
    if (portal.parentElement) {
      portal.remove();
    }
    activePortalEl = null;
  };

  activeRoot.render(
    <BoosterBridgeModal
      options={options}
      onDismiss={cleanup}
    />
  );
}

export interface PlayerBoosterModalOptions {
  packId?: string;
  packName?: string;
  packSubtitle?: string;
  cards?: CardData[];
  onComplete?: (cards: CardData[]) => void;
  onClose?: () => void;
}

const PlayerBoosterBridgeContainer: React.FC<{
  options: PlayerBoosterModalOptions;
  onDismiss: () => void;
}> = ({ options, onDismiss }) => {
  const [isOpen, setIsOpen] = useState(true);
  const [cards, setCards] = useState<CardData[]>(options.cards || []);
  const [packTitle, setPackTitle] = useState(options.packName || 'Booster de Slimelands');

  useEffect(() => {
    if (options.cards && options.cards.length > 0) {
      setCards(options.cards);
      return;
    }

    let isMounted = true;
    loadGameMatrixSnapshot().then((snapshot) => {
      if (!isMounted) return;

      const boosterModels = (snapshot?.boosterModels && snapshot.boosterModels.length > 0)
        ? snapshot.boosterModels
        : DEFAULT_BOOSTER_MODELS;

      const matchingBooster =
        (options.packId && boosterModels.find((b) => b.id === options.packId)) ||
        (options.packName &&
          boosterModels.find(
            (b) => b.name.toLowerCase() === options.packName?.toLowerCase()
          )) ||
        boosterModels[0];

      if (matchingBooster) {
        setPackTitle(matchingBooster.name);
      }

      const baseCharacters = (snapshot?.baseCharacters && snapshot.baseCharacters.length > 0)
        ? snapshot.baseCharacters
        : INITIAL_BASE_CHARACTERS;

      const balanceTables = snapshot?.balanceTables || DEFAULT_CLASS_BALANCE_TABLES;
      const globalBack = snapshot?.globalBackImageUrl || null;

      // Filter eligible matrix blueprints: must be classified!
      const classifiedPool = baseCharacters.filter(
        (c: any) => c.rarity !== 'Não classificada' && c.isClassified !== false
      );
      const eligiblePool = classifiedPool.length > 0 ? classifiedPool : baseCharacters;

      // Generate the official 9 instances procedural cards
      const generatedCards = generateBoosterPack(
        matchingBooster,
        eligiblePool,
        balanceTables,
        'deck-inventory'
      ).map((c) => ({
        ...c,
        backImageUrl: c.backImageUrl || globalBack || null,
        isMatrixBlueprint: false,
      }));

      // Immediately register the result safely into inventory
      const existingCards = snapshot?.cards || [];
      const updatedCards = [...generatedCards, ...existingCards];

      saveGameMatrixSnapshot({
        version: snapshot?.version || 1,
        updatedAt: new Date().toISOString(),
        activeCardId: generatedCards[0]?.id || snapshot?.activeCardId || '',
        cards: updatedCards,
        baseCharacters,
        balanceTables,
        boosterModels,
        decks: snapshot?.decks || DEFAULT_DECK_CATEGORIES,
        globalBackImageUrl: globalBack,
      }).catch((err) => console.warn('Erro ao salvar booster no inventário:', err));

      setCards(generatedCards);
    });

    return () => {
      isMounted = false;
    };
  }, [options.cards, options.packId, options.packName]);

  const handleClose = () => {
    setIsOpen(false);
    options.onClose?.();
    setTimeout(onDismiss, 200);
  };

  const handleCollect = (collected: CardData[]) => {
    options.onComplete?.(collected);
  };

  return (
    <PlayerBoosterRevealModal
      isOpen={isOpen}
      packName={packTitle}
      packSubtitle={options.packSubtitle}
      cards={cards}
      onClose={handleClose}
      onCollect={handleCollect}
    />
  );
};

export function openPlayerBoosterModal(options: PlayerBoosterModalOptions = {}): void {
  if (activeRoot && activePortalEl) {
    try {
      activeRoot.unmount();
      activePortalEl.remove();
    } catch (_) {}
    activeRoot = null;
    activePortalEl = null;
  }

  const portal = document.createElement('div');
  portal.id = 'player-booster-reveal-portal';
  portal.style.position = 'fixed';
  portal.style.inset = '0';
  portal.style.zIndex = '9999999';
  portal.style.pointerEvents = 'auto';
  document.body.appendChild(portal);

  activePortalEl = portal;
  activeRoot = createRoot(portal);

  const cleanup = () => {
    if (activeRoot) {
      activeRoot.unmount();
      activeRoot = null;
    }
    if (portal.parentElement) {
      portal.remove();
    }
    activePortalEl = null;
  };

  activeRoot.render(
    <PlayerBoosterBridgeContainer
      options={options}
      onDismiss={cleanup}
    />
  );
}
