import * as THREE from 'three';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { CardData, BottomStatPill } from '../../../../card_studio/src/types/card';
import { CardFrameSVG } from '../../../../card_studio/src/components/CardFrameSVG';
import { CardBackSVG } from '../../../../card_studio/src/components/CardBackSVG';
import { loadGameMatrixSnapshot } from '../../../../card_studio/src/utils/matrixPersistence';

export async function getMergedGameTemplates(baseTemplates: any[] = []): Promise<any[]> {
  try {
    const snapshot = await loadGameMatrixSnapshot();
    if (snapshot && Array.isArray(snapshot.cards) && snapshot.cards.length > 0) {
      const matrixConverted = snapshot.cards.map((cd: CardData) => {
        const p1 = cd.pills?.[0];
        const p2 = cd.pills?.[1];
        const p3 = cd.pills?.[2];
        const p4 = cd.pills?.[3];
        const basePv = cd.pvNumber || parseInt((cd.pvText || '').replace(/\D/g, '')) || 400;
        const atk1 = parseInt(p1?.mainText || '200') || 200;
        const atk2 = parseInt(p2?.mainText || '350') || 350;
        const atk3 = parseInt(p3?.mainText || '500') || 500;
        const ultiDmg = parseInt(p4?.mainText || '650') || 650;

        return {
          id: cd.id,
          name: cd.title,
          image: cd.imageUrl || '',
          imageUrl: cd.imageUrl || '',
          baseAtk: atk1,
          basePv: basePv,
          pv: basePv,
          maxPv: basePv,
          manaCost: cd.summonStaminaCost || 2,
          staminaCost: 1,
          preferredRarity: cd.cardRank === 'S' ? 'legendary' : cd.cardRank === 'A' ? 'epic' : cd.cardRank === 'B' ? 'rare' : 'common',
          classId: (cd.elementText || 'FERRO').toLowerCase(),
          flavorText: cd.loreBody,
          attacks: [
            { name: 'GOLPE 1', damage: atk1, cost: parseInt(p1?.badgeValue || '1') || 1, costType: 'stamina' },
            { name: 'GOLPE 2', damage: atk2, cost: parseInt(p2?.badgeValue || '2') || 2, costType: 'stamina' },
            { name: 'GOLPE 3', damage: atk3, cost: parseInt(p3?.badgeValue || '3') || 3, costType: 'mana' },
          ],
          specialAttack: {
            name: cd.magicPrefix || 'GOLPE FINAL',
            damage: ultiDmg,
            cost: 0,
            costType: 'mana',
            description: cd.magicDescription || ''
          },
          cardData: cd
        };
      });

      const idSet = new Set(matrixConverted.map(c => c.id));
      const filteredBase = baseTemplates.filter(b => !idSet.has(b.id));
      return [...matrixConverted, ...filteredBase];
    }
  } catch (err) {
    console.warn('Falha ao sincronizar cartas da matriz:', err);
  }
  return baseTemplates;
}

export interface MatrixRenderOptions {
  mode?: 'full' | 'field' | 'hand' | 'thumb';
  isEnemy?: boolean;
  animateChroma?: boolean;
  idScope?: string;
  showLoreBox?: boolean;
  pureSvgText?: boolean;
  width?: string | number;
  height?: string | number;
}

let scopeCounter = 0;

/**
 * Converte qualquer carta do sistema para o padrão CardData da Matriz.
 */
export function toMatrixCardData(raw: any): CardData {
  if (!raw) raw = {};

  if (raw.pills && raw.frameTopColor && raw.dockAutoFit !== undefined) {
    return raw as CardData;
  }

  if (raw.cardData && raw.cardData.pills) {
    return raw.cardData as CardData;
  }

  const name = raw.title || raw.name || 'Guerreiro do Inverno';
  const pvNum = raw.pvNumber ?? raw.pv ?? raw.basePv ?? raw.maxPv ?? 400;
  const atkNum = raw.atk ?? raw.baseAtk ?? 250;
  const manaCost = raw.summonStaminaCost ?? raw.manaCost ?? raw.mana ?? 2;
  const staminaCost = raw.staminaCost ?? raw.stamina ?? 2;
  const rarity = (raw.cardRank || raw.preferredRarity || raw.rarity || 'common').toLowerCase();

  let frameTopColor = '#1C1F26';
  let frameMidColor = '#101217';
  let frameBottomColor = '#030405';
  let strokeColor = '#94A3B8';
  let elementTextColor = '#38BDF8';
  let rankCircleColor = '#64748B';
  let rankBadgeText = 'C';

  if (rarity === 'legendary' || rarity === 's' || rarity === 'mítica') {
    frameTopColor = '#3B1E08';
    frameMidColor = '#1E0D03';
    frameBottomColor = '#030405';
    strokeColor = '#FFB703';
    elementTextColor = '#F59E0B';
    rankCircleColor = '#D97706';
    rankBadgeText = 'S';
  } else if (rarity === 'epic' || rarity === 'a' || rarity === 'lendária') {
    frameTopColor = '#2A0944';
    frameMidColor = '#140324';
    frameBottomColor = '#020005';
    strokeColor = '#A855F7';
    elementTextColor = '#C084FC';
    rankCircleColor = '#9333EA';
    rankBadgeText = 'A';
  } else if (rarity === 'rare' || rarity === 'b' || rarity === 'rara') {
    frameTopColor = '#092338';
    frameMidColor = '#04101A';
    frameBottomColor = '#020406';
    strokeColor = '#38BDF8';
    elementTextColor = '#38BDF8';
    rankCircleColor = '#0284C7';
    rankBadgeText = 'B';
  }

  if (raw.frameTopColor) frameTopColor = raw.frameTopColor;
  if (raw.frameMidColor) frameMidColor = raw.frameMidColor;
  if (raw.frameBottomColor) frameBottomColor = raw.frameBottomColor;
  if (raw.strokeColor) strokeColor = raw.strokeColor;
  if (raw.elementTextColor) elementTextColor = raw.elementTextColor;
  if (raw.rankCircleColor) rankCircleColor = raw.rankCircleColor;

  const rawAttacks = raw.attacks || [];
  const pills: [BottomStatPill, BottomStatPill, BottomStatPill, BottomStatPill] = [
    {
      id: 'p1',
      mode: 'stat',
      badgeValue: String(rawAttacks[0]?.cost ?? staminaCost),
      badgeColor: '#0084FF',
      mainText: String(rawAttacks[0]?.damage ?? atkNum)
    },
    {
      id: 'p2',
      mode: 'stat',
      badgeValue: String(rawAttacks[1]?.cost ?? (staminaCost + 1)),
      badgeColor: '#10B981',
      mainText: String(rawAttacks[1]?.damage ?? Math.round(atkNum * 1.35))
    },
    {
      id: 'p3',
      mode: 'stat',
      badgeValue: String(rawAttacks[2]?.cost ?? (manaCost)),
      badgeColor: '#9333EA',
      mainText: String(rawAttacks[2]?.damage ?? Math.round(atkNum * 1.7))
    },
    {
      id: 'p4',
      mode: 'stat',
      badgeValue: '∞',
      badgeColor: '#DF9A1E',
      mainText: String(raw.specialAttack?.damage ?? Math.round(atkNum * 2.2)),
      isChromaticSpecial: true
    }
  ];

  return {
    id: String(raw.id || `card-${Date.now()}`),
    title: name,
    pvText: `PV${pvNum}`,
    elementText: (raw.classId || raw.element || 'FERRO').toUpperCase().slice(0, 8),
    rankBadgeText,
    loreHeader: raw.loreHeader || name,
    loreBody: raw.loreBody || raw.flavorText || 'Forjada nas névoas eternas de Hestridia.',
    magicPrefix: raw.magicPrefix || (raw.abilityId ? `✨ Habilidade: ${raw.abilityId}` : '⚔️ Golpe Especial'),
    magicDescription: raw.magicDescription || (raw.specialAttack?.description || 'Libera a fúria ancestral do inverno.'),
    showLoreBox: raw.showLoreBox ?? true,
    loreBoxOpacity: raw.loreBoxOpacity ?? 88,
    loreBoxY: raw.loreBoxY ?? 724,
    pillCount: (raw.pillCount || 4) as 1 | 2 | 3 | 4,
    dockAutoFit: raw.dockAutoFit ?? true,
    pills,
    imageUrl: raw.imageUrl || raw.image || null,
    videoUrl: raw.videoUrl || null,
    mediaType: raw.mediaType || 'image',
    imageScale: raw.imageScale ?? 1,
    imageOffsetX: raw.imageOffsetX ?? 0,
    imageOffsetY: raw.imageOffsetY ?? 0,
    backgroundFill: raw.backgroundFill || 'dark',
    autoAdaptColors: raw.autoAdaptColors ?? true,
    frameTopColor,
    frameMidColor,
    frameBottomColor,
    strokeColor,
    strokeWidth: raw.strokeWidth ?? 2,
    strokeGlow: raw.strokeGlow ?? 90,
    elementTextColor,
    rankCircleColor,
    extractedSwatches: raw.extractedSwatches || [],
    isPremium: raw.isPremium ?? true,
    prismaticIntensity: raw.prismaticIntensity ?? 90,
    microGlitterIntensity: raw.microGlitterIntensity ?? 80,
    contourLightSpeed: raw.contourLightSpeed ?? 1.8,
    parallaxDepth: raw.parallaxDepth ?? 65,
    autoShowcaseEnabled: false,
    showcaseDurationSec: 5,
    isRankChromatic: raw.isRankChromatic ?? (rankBadgeText === 'S'),
    isPvChromatic: raw.isPvChromatic ?? false,
    invertElementCapsule: raw.invertElementCapsule ?? true,
    showcaseVfx: raw.showcaseVfx || 'none',
    showcaseVfxIntensity: raw.showcaseVfxIntensity ?? 80,
    backImageUrl: raw.backImageUrl || raw.cardBack || null
  };
}

/**
 * Renderiza a carta usando DIRETAMENTE o CardFrameSVG oficial da Matriz (sem recriar ou alterar nada).
 */
export function renderMatrixCardSVG(cardInput: any, opts: MatrixRenderOptions = {}): string {
  const card = toMatrixCardData(cardInput);
  scopeCounter++;
  const scope = opts.idScope || `mat-${card.id}-${scopeCounter}`;
  const animateChroma = opts.animateChroma ?? (opts.mode !== 'thumb');
  const pureSvgText = Boolean(opts.pureSvgText);

  try {
    return renderToStaticMarkup(
      React.createElement(CardFrameSVG, {
        card,
        animateChroma,
        idScope: scope,
        pureSvgText,
      })
    );
  } catch (err) {
    console.error('Erro ao renderizar CardFrameSVG oficial:', err);
    return `<div class="matrix-card-error" style="color:red; padding:10px;">Erro CardFrameSVG</div>`;
  }
}

/**
 * Renderiza o verso fiel da carta usando DIRETAMENTE o CardBackSVG oficial da Matriz.
 */
export function renderMatrixCardBackSVG(cardInput?: any): string {
  const card = toMatrixCardData(cardInput || {});
  try {
    return renderToStaticMarkup(
      React.createElement(CardBackSVG, {
        card
      })
    );
  } catch (err) {
    console.error('Erro ao renderizar CardBackSVG oficial:', err);
    return `<div class="matrix-card-error" style="color:red; padding:10px;">Erro CardBackSVG</div>`;
  }
}

const dataUrlCache = new Map<string, string>();

/**
 * Converte qualquer imagem local/remota em Data URL base64 autossuficiente
 * para que o CardFrameSVG oficial renderize 100% no Three.js sem bloqueio de cross-origin ou caminho relativo.
 */
export async function ensureDataUrl(url?: string | null): Promise<string | null> {
  if (!url) return null;
  if (url.startsWith('data:')) return url;
  if (dataUrlCache.has(url)) return dataUrlCache.get(url)!;

  try {
    const res = await fetch(url);
    if (res.ok) {
      const blob = await res.blob();
      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = () => resolve(url);
        reader.readAsDataURL(blob);
      });
      if (base64 && base64.startsWith('data:')) {
        dataUrlCache.set(url, base64);
        return base64;
      }
    }
  } catch (_) {}

  // Fallback via Image element drawing to canvas
  try {
    const base64 = await new Promise<string>((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        try {
          const cvs = document.createElement('canvas');
          cvs.width = img.naturalWidth || img.width || 400;
          cvs.height = img.naturalHeight || img.height || 400;
          const c = cvs.getContext('2d');
          if (c) {
            c.drawImage(img, 0, 0);
            const data = cvs.toDataURL('image/png');
            resolve(data);
            return;
          }
        } catch (_) {}
        resolve(url);
      };
      img.onerror = () => resolve(url);
      img.src = url;
    });
    if (base64 && base64.startsWith('data:')) {
      dataUrlCache.set(url, base64);
      return base64;
    }
  } catch (_) {}

  return url;
}

/**
 * Cria uma CanvasTexture do Three.js renderizando 100% FIEL e EXCLUSIVAMENTE o CardFrameSVG oficial da Matriz.
 * Não recria nenhum design: o SVG gerado pelo CardFrameSVG é decodificado diretamente no CanvasTexture.
 */
export function createMatrixCardTexture(cardInput: any): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 680;
  canvas.height = 990;
  const ctx = canvas.getContext('2d')!;
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;

  const card = toMatrixCardData(cardInput);

  const renderOfficialSvgToCanvas = (targetCard: CardData) => {
    try {
      const svgString = renderMatrixCardSVG(targetCard, {
        pureSvgText: true,
        animateChroma: false,
        idScope: `tex-${targetCard.id}-${Math.floor(Math.random() * 999999)}`,
      });

      let sizedSvg = svgString;
      if (!sizedSvg.includes('xmlns=')) {
        sizedSvg = sizedSvg.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
      }
      if (!/width=/.test(sizedSvg)) {
        sizedSvg = sizedSvg.replace('<svg', '<svg width="680" height="990"');
      }

      const img = new Image();
      const svgUri = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(sizedSvg);
      img.onload = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        texture.needsUpdate = true;
      };
      img.onerror = (e) => {
        console.warn('Erro ao decodificar CardFrameSVG oficial para textura 3D:', e);
      };
      img.src = svgUri;
    } catch (err) {
      console.warn('Falha ao renderizar CardFrameSVG oficial para textura:', err);
    }
  };

  // Renderiza imediatamente o CardFrameSVG oficial
  renderOfficialSvgToCanvas(card);

  // Se a imagem precisa ser convertida para Data URL base64 autossuficiente para o SVG:
  if (card.imageUrl && !card.imageUrl.startsWith('data:')) {
    ensureDataUrl(card.imageUrl).then((dataUrl) => {
      if (dataUrl && dataUrl.startsWith('data:')) {
        renderOfficialSvgToCanvas({ ...card, imageUrl: dataUrl });
      }
    });
  }

  return texture;
}



