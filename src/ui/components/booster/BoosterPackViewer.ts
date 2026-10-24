import * as THREE from 'three';
import {
  createBoosterFoilFrontTexture,
  createBoosterFoilBackTexture,
  createPokemonCardBackTexture,
  createBoosterNineCards,
  createPremiumCardTexture,
  PackCardData,
} from './pokemonTextures';
import {
  playFoilTearSound,
  playCardSlideSound,
  playDynamicFoilScrape,
  playHoloShimmerSound,
  playSparkleBurstSound,
} from './pokemonAudio';
import { openCardViewer } from '../CardViewer';
import { renderMatrixCardSVG } from '../../screens/forge_v2/utils/HestridiaMatrixRenderer';

// ============================================================================
// FLAGS MODULARES (Prontas para desfazer/desativar facilmente se necessário)
// ============================================================================
export const ENABLE_BOOSTER_TEAR_GLOW = false; // Removido conforme solicitado
export const ENABLE_BOOSTER_CAROUSEL = false;  // Desativa a ciranda experimental para abrir o Booster 3D diretamente na tela

export interface BoosterPackViewerOptions {
  theme?: 'charizard' | 'pikachu' | 'rayquaza' | 'mewtwo' | string;
  customBack?: 'silver' | 'gold' | 'black';
  customFrontUrl?: string;
  customFrontTexture?: THREE.Texture;
  customBackUrl?: string;
  customBackTexture?: THREE.Texture;
  customTitle?: string;
  quantity?: number;
  customCardsList?: PackCardData[];
  cards?: PackCardData[];
  onComplete?: (cards: PackCardData[]) => void;
  onClose?: () => void;
}

function getBoosterCardSortWeight(c: any): number {
  if (!c) return 0;
  if (typeof c.rarityWeight === 'number') return c.rarityWeight;
  const tpl = c.tpl || c.cardData || c;
  const cls = String(c.cardClass || c.matrixRarity || tpl.cardClass || tpl.matrixRarity || '').toLowerCase();
  const raw = String(c.rarity || c.preferredRarity || tpl.preferredRarity || tpl.rarity || '').toLowerCase();
  const label = String(c.rarityLabel || '').toLowerCase();
  const rank = String(c.cardRank || tpl.cardRank || '').toLowerCase();

  if (
    cls.includes('mítica') || cls.includes('mitica') || cls.includes('limitada') ||
    raw.includes('mítica') || raw.includes('mitica') || raw.includes('mythic') ||
    label.includes('mítica') || label.includes('mitica')
  ) {
    return 5;
  }
  if (
    cls.includes('lendária') || cls.includes('lendaria') ||
    raw.includes('lendária') || raw.includes('lendaria') || raw.includes('legendary') ||
    label.includes('lendária') || label.includes('lendaria') ||
    rank === 's'
  ) {
    return 4;
  }
  if (
    cls.includes('épica') || cls.includes('epica') ||
    raw.includes('épica') || raw.includes('epica') || raw.includes('epic') ||
    label.includes('épica') || rank === 'a'
  ) {
    return 3;
  }
  if (cls.includes('rara') || raw.includes('rara') || raw.includes('rare') || label.includes('rara') || rank === 'b') {
    return 2;
  }
  if (cls.includes('incomum') || raw.includes('incomum') || raw.includes('uncommon') || label.includes('incomum') || rank === 'c') {
    return 1;
  }
  return 0;
}

function normalizeAngleRad(angle: number): number {
  let a = ((angle + Math.PI) % (Math.PI * 2));
  if (a < 0) a += Math.PI * 2;
  return a - Math.PI;
}

export class BoosterPackViewer {
  private overlay: HTMLElement;
  private container: HTMLElement;
  private themeGlow: HTMLElement | null = null;
  private qtyCapsule: HTMLElement | null = null;
  private options: BoosterPackViewerOptions;
  private cleanupFn: (() => void) | null = null;

  constructor(options: BoosterPackViewerOptions = {}) {
    this.options = options;

    // Overlay em tela cheia com fundo BRANCO de estúdio (estilo Pokémon TCG Pocket)
    this.overlay = document.createElement('div');
    this.overlay.className = 'booster-modal-overlay';
    this.overlay.style.cssText = `
      position: fixed; inset: 0; width: 100vw; height: 100vh; z-index: 9999999;
      background: #ffffff;
      overflow: hidden; touch-action: none; user-select: none; font-family: 'Outfit', sans-serif;
    `;

    // Botão de fechar elegante no canto superior direito (adaptado para fundo branco)
    const closeBtn = document.createElement('button');
    closeBtn.innerHTML = '✕';
    closeBtn.title = 'Fechar';
    closeBtn.style.cssText = `
      position: absolute; top: 18px; right: 20px; z-index: 1000;
      width: 38px; height: 38px; border-radius: 50%;
      background: rgba(15, 23, 42, 0.06); border: 1px solid rgba(15, 23, 42, 0.15);
      color: #1e293b; font-size: 1.1rem; font-weight: 800;
      cursor: pointer; display: flex; align-items: center; justify-content: center;
      transition: background 0.2s, transform 0.15s;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.06);
    `;
    closeBtn.onmouseenter = () => { closeBtn.style.background = 'rgba(15, 23, 42, 0.12)'; };
    closeBtn.onmouseleave = () => { closeBtn.style.background = 'rgba(15, 23, 42, 0.06)'; };
    closeBtn.onclick = () => this.destroy();
    this.overlay.appendChild(closeBtn);

    // Contêiner WebGL 3D
    this.container = document.createElement('div');
    this.container.style.cssText = `
      position: absolute; inset: 0; width: 100vw; height: 100vh; overflow: hidden; touch-action: none;
    `;
    this.overlay.appendChild(this.container);

    // Fundo branco puro de estúdio (substituindo o antigo desfoque de lente escuro)
    const studioWhiteBg = document.createElement('div');
    studioWhiteBg.style.cssText = `
      position: absolute; inset: 0; pointer-events: none;
      background: radial-gradient(circle at 50% 42%, #ffffff 0%, #f8fafc 58%, #eef2f7 100%);
    `;
    this.overlay.insertBefore(studioWhiteBg, this.container);
    const themeKey = (this.options.theme || '').toLowerCase();
    const themeTint: Record<string, string> = {
      charizard: 'rgba(255,140,60,0.14)',
      pikachu: 'rgba(255,215,0,0.16)',
      rayquaza: 'rgba(16,185,129,0.14)',
      mewtwo: 'rgba(168,85,247,0.14)',
    };
    const tint = themeTint[themeKey] || 'rgba(148,163,184,0.12)';
    const themeGlow = document.createElement('div');
    themeGlow.style.cssText = `
      position: absolute; inset: 0; pointer-events: none; z-index: 0;
      transition: opacity 0.6s ease;
      background:
        radial-gradient(circle at 50% 42%, ${tint} 0%, transparent 64%);
    `;
    this.overlay.insertBefore(themeGlow, this.container);
    this.themeGlow = themeGlow;

    // Cápsula simples de quantidade abaixo do pacote (quando compra mais de 1)
    const qty = this.options.quantity ?? (
      this.options.customTitle?.match(/\((\d+)x\)/)?.[1]
        ? parseInt(this.options.customTitle.match(/\((\d+)x\)/)![1])
        : 1
    );

    if (qty > 1) {
      const qtyCapsule = document.createElement('div');
      qtyCapsule.className = 'booster-quantity-capsule';
      qtyCapsule.innerHTML = `
        <span style="display:inline-block; width:7px; height:7px; border-radius:50%; background:#f59e0b; box-shadow:0 0 8px #f59e0b;"></span>
        <span>PACOTES: <b style="color:#0f172a; font-size:0.95rem;">${qty}x</b></span>
      `;
      qtyCapsule.style.cssText = `
        position: absolute; top: 20px; left: 50%; transform: translateX(-50%);
        z-index: 1000; pointer-events: none;
        display: flex; align-items: center; gap: 8px;
        padding: 7px 20px; border-radius: 999px;
        background: rgba(255, 255, 255, 0.92);
        border: 1px solid rgba(245, 158, 11, 0.45);
        box-shadow: 0 4px 16px rgba(15, 23, 42, 0.08);
        color: #b45309; font-family: 'Outfit', sans-serif;
        font-size: 0.8rem; font-weight: 800; letter-spacing: 1.2px;
        transition: opacity 0.35s ease, transform 0.35s ease;
        white-space: nowrap;
      `;
      this.overlay.appendChild(qtyCapsule);
      this.qtyCapsule = qtyCapsule;
    }

    document.body.appendChild(this.overlay);

    // Inicia a cena 3D
    this.initThreeScene();
  }

  private initThreeScene() {
    const container = this.container;
    const width = window.innerWidth || container.clientWidth || 800;
    const height = window.innerHeight || container.clientHeight || 600;

    // --- Scene, Camera & Renderer (fundo transparente: cenário aparece atrás) ---
    const scene = new THREE.Scene();
    scene.background = null;

    const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 100);
    camera.position.set(0, 0, 12.4);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setClearColor(0x000000, 0);
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = false;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    container.appendChild(renderer.domElement);

    // --- Studio Lighting reforçada para que a frente do envelope fique clara, viva e bem iluminada ---
    const ambientLight = new THREE.AmbientLight('#ffffff', 1.75);
    scene.add(ambientLight);

    const hemiLight = new THREE.HemisphereLight('#ffffff', '#e2e8f0', 1.40);
    hemiLight.position.set(0, 10, 0);
    scene.add(hemiLight);

    const frontStudioLight = new THREE.DirectionalLight('#ffffff', 1.35);
    frontStudioLight.position.set(0, 1.2, 9.5);
    scene.add(frontStudioLight);

    const keyLight = new THREE.DirectionalLight('#fffcf8', 1.25);
    keyLight.position.set(4.5, 8.5, 6.5);
    scene.add(keyLight);

    const softFillLight = new THREE.DirectionalLight('#f8fafc', 0.85);
    softFillLight.position.set(-6, 3, 6);
    scene.add(softFillLight);

    const rimLight = new THREE.DirectionalLight('#e2e8f0', 0.55);
    rimLight.position.set(0, -6, 5);
    scene.add(rimLight);

    // --- Textures & Materials ---
    const validTheme = (['charizard', 'pikachu', 'rayquaza', 'mewtwo'].includes(this.options.theme as any)
      ? this.options.theme
      : 'charizard') as 'charizard' | 'pikachu' | 'rayquaza' | 'mewtwo';

    let foilFrontTex: THREE.Texture = this.options.customFrontTexture || createBoosterFoilFrontTexture(validTheme);
    let foilBackTex: THREE.Texture = this.options.customBackTexture || createBoosterFoilBackTexture((this.options.customBack as any) || 'silver');
    const cardBackTex = createPokemonCardBackTexture();

    const defaultNine = createBoosterNineCards();
    const mapRawCardsList = (rawList: PackCardData[]): PackCardData[] => {
      const mappedList = rawList.map((c, i) => {
        const fallback = defaultNine[i % defaultNine.length];
        const mapped: any = {
          ...fallback,
          ...c,
          name: c.name || fallback.name,
          rarity: (c.rarity as any) || fallback.rarity,
          atk: (c as any).atk ?? (fallback as any).atk,
          pv: (c as any).pv ?? (fallback as any).pv,
          mana: (c as any).mana ?? (c as any).manaCost ?? (fallback as any).mana,
          stamina: (c as any).stamina ?? (c as any).staminaCost ?? (fallback as any).stamina,
          tpl: (c as any).tpl || c,
          image: (c as any).image || (fallback as any).image || '',
        };
        mapped.rarityWeight = getBoosterCardSortWeight(mapped);
        if (mapped.rarityWeight >= 4) {
          mapped.rarity = 'legendary';
        }
        mapped.texture = c.texture || createPremiumCardTexture(mapped);
        return mapped;
      });
      // Garante que as cartas mais raras (ou múltiplas raras) fiquem SEMPRE nas últimas posições (reveladas por último)
      return mappedList.sort((a, b) => {
        const diff = getBoosterCardSortWeight(a) - getBoosterCardSortWeight(b);
        if (diff !== 0) return diff;
        return (Number(a.atk || 0) + Number(a.pv || 0)) - (Number(b.atk || 0) + Number(b.pv || 0));
      });
    };

    const sourceCardsInput: any = this.options.cards && this.options.cards.length > 0 ? this.options.cards : defaultNine;
    let cardsData: PackCardData[] = mapRawCardsList(sourceCardsInput);

    // Reduzimos metalness na frente para não escurecer o albedo sem HDRI, mantendo brilho acetinado vivo
    const foilFrontMat = new THREE.MeshStandardMaterial({
      map: foilFrontTex,
      metalness: 0.14,
      roughness: 0.30,
      side: THREE.DoubleSide,
    });

    const foilBackMat = new THREE.MeshStandardMaterial({
      map: foilBackTex,
      metalness: 0.30,
      roughness: 0.28,
      side: THREE.DoubleSide,
    });

    const cardBackMat = new THREE.MeshStandardMaterial({
      map: cardBackTex,
      roughness: 0.55,
      metalness: 0.1,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    });

    const texLoader = new THREE.TextureLoader();

    // Carrega arte frontal personalizada com segurança
    if (!this.options.customFrontTexture && this.options.customFrontUrl) {
      texLoader.load(this.options.customFrontUrl, (loadedTex) => {
        loadedTex.colorSpace = THREE.SRGBColorSpace;
        loadedTex.needsUpdate = true;
        foilFrontMat.map = loadedTex;
        foilFrontMat.needsUpdate = true;
      });
    }

    // Carrega arte do verso personalizada com segurança
    if (!this.options.customBackTexture && this.options.customBackUrl) {
      texLoader.load(this.options.customBackUrl, (loadedTex) => {
        loadedTex.colorSpace = THREE.SRGBColorSpace;
        loadedTex.needsUpdate = true;
        foilBackMat.map = loadedTex;
        foilBackMat.needsUpdate = true;
      });
    }

    const tearSilverMat = new THREE.MeshStandardMaterial({
      color: '#f8fafc',
      metalness: 0.98,
      roughness: 0.12,
      side: THREE.DoubleSide,
      emissive: '#475569',
      emissiveIntensity: 0.2,
    });

    // --- Master World Rig Group ---
    const worldGroup = new THREE.Group();
    scene.add(worldGroup);

    // --- Dimensions: Exact ratio for 941x1672 artwork (1 : 1.7768) ---
    const PW = 3.6; // Width
    const PH = 3.6 * (1672 / 941); // Height ~6.3966 matching 941x1672 ratio
    const Y_CUT = (PH / 2) - PH * (266 / 1672); // Tear line matching 266px (~2.18)

    const getPillowZ = (x: number, y: number, isFront: boolean) => {
      const normX = Math.min(1, Math.abs(x) / (PW / 2));
      const edgeFactorX = Math.max(0, 1 - Math.pow(normX, 2.6));

      const crimpTop = PH / 2 - 0.55;
      const crimpBot = -PH / 2 + 0.55;

      let edgeFactorY = 1.0;
      if (y > crimpTop) {
        edgeFactorY = Math.max(0, 1 - (y - crimpTop) / 0.55);
      } else if (y < crimpBot) {
        edgeFactorY = Math.max(0, 1 - (crimpBot - y) / 0.55);
      }

      const maxBulge = 0.088;
      const bulge = Math.pow(edgeFactorX, 1.25) * edgeFactorY * maxBulge;
      return isFront ? bulge : -bulge;
    };

    const createPouchSectionGeo = (yMin: number, yMax: number, isFront: boolean, segX = 40, segY = 14) => {
      const geo = new THREE.BufferGeometry();
      const positions: number[] = [];
      const normals: number[] = [];
      const uvs: number[] = [];
      const indices: number[] = [];

      for (let j = 0; j <= segY; j++) {
        const vRatio = j / segY;
        const y = yMin + vRatio * (yMax - yMin);
        const globalV = (y - (-PH / 2)) / PH;

        for (let i = 0; i <= segX; i++) {
          const uRatio = i / segX;
          const x = -PW / 2 + uRatio * PW;
          const z = getPillowZ(x, y, isFront);

          positions.push(x, y, z);
          normals.push(0, 0, isFront ? 1 : -1);
          uvs.push(isFront ? uRatio : 1 - uRatio, globalV);
        }
      }

      for (let j = 0; j < segY; j++) {
        for (let i = 0; i < segX; i++) {
          const a = j * (segX + 1) + i;
          const b = j * (segX + 1) + (i + 1);
          const c = (j + 1) * (segX + 1) + i;
          const d = (j + 1) * (segX + 1) + (i + 1);

          if (isFront) {
            indices.push(a, b, c);
            indices.push(b, d, c);
          } else {
            indices.push(a, c, b);
            indices.push(b, c, d);
          }
        }
      }

      geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
      geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
      geo.setIndex(indices);
      geo.computeVertexNormals();

      return geo;
    };

    const createSideSeamGeo = (yMin: number, yMax: number, isRight: boolean, segY = 20) => {
      const geo = new THREE.BufferGeometry();
      const positions: number[] = [];
      const normals: number[] = [];
      const uvs: number[] = [];
      const indices: number[] = [];

      const x = isRight ? PW / 2 : -PW / 2;

      for (let j = 0; j <= segY; j++) {
        const vRatio = j / segY;
        const y = yMin + vRatio * (yMax - yMin);
        const globalV = (y - (-PH / 2)) / PH;

        positions.push(x, y, 0.005);
        normals.push(isRight ? 1 : -1, 0, 0);
        uvs.push(isRight ? 1 : 0, globalV);

        positions.push(x, y, -0.005);
        normals.push(isRight ? 1 : -1, 0, 0);
        uvs.push(isRight ? 1 : 0, globalV);
      }

      for (let j = 0; j < segY; j++) {
        const a = j * 2;
        const b = j * 2 + 1;
        const c = (j + 1) * 2;
        const d = (j + 1) * 2 + 1;

        if (isRight) {
          indices.push(a, c, b);
          indices.push(b, c, d);
        } else {
          indices.push(a, b, c);
          indices.push(b, d, c);
        }
      }

      geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
      geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
      geo.setIndex(indices);
      geo.computeVertexNormals();

      return geo;
    };

    // --- 1. Lower Pouch Group (From -PH/2 to Y_CUT) ---
    const lowerPouchGroup = new THREE.Group();
    worldGroup.add(lowerPouchGroup);

    const lowerFrontGeo = createPouchSectionGeo(-PH / 2, Y_CUT, true, 40, 20);
    const lowerFrontMesh = new THREE.Mesh(lowerFrontGeo, foilFrontMat);
    lowerPouchGroup.add(lowerFrontMesh);

    const lowerBackGeo = createPouchSectionGeo(-PH / 2, Y_CUT, false, 40, 20);
    const lowerBackMesh = new THREE.Mesh(lowerBackGeo, foilBackMat);
    lowerPouchGroup.add(lowerBackMesh);

    const lowerLeftSeamGeo = createSideSeamGeo(-PH / 2, Y_CUT, false, 24);
    const lowerLeftSeamMesh = new THREE.Mesh(lowerLeftSeamGeo, foilBackMat);
    lowerPouchGroup.add(lowerLeftSeamMesh);

    const lowerRightSeamGeo = createSideSeamGeo(-PH / 2, Y_CUT, true, 24);
    const lowerRightSeamMesh = new THREE.Mesh(lowerRightSeamGeo, foilFrontMat);
    lowerPouchGroup.add(lowerRightSeamMesh);

    // --- 2. Top Cut Strip (From Y_CUT to PH/2) ---
    const topStripGroup = new THREE.Group();
    worldGroup.add(topStripGroup);

    const topSegX = 48;
    const topSegY = 12;

    const topFrontGeo = createPouchSectionGeo(Y_CUT, PH / 2, true, topSegX, topSegY);
    const baseTopFrontPositions = new Float32Array(
      (topFrontGeo.attributes.position as THREE.BufferAttribute).array
    );
    const topFrontMesh = new THREE.Mesh(topFrontGeo, foilFrontMat);
    topStripGroup.add(topFrontMesh);

    const topBackGeo = createPouchSectionGeo(Y_CUT, PH / 2, false, topSegX, topSegY);
    const baseTopBackPositions = new Float32Array(
      (topBackGeo.attributes.position as THREE.BufferAttribute).array
    );
    const topBackMesh = new THREE.Mesh(topBackGeo, foilBackMat);
    topStripGroup.add(topBackMesh);

    // --- 3. Dynamic Jagged Cutting Line Mesh Along Cut Seam ---
    const maxTearSegments = 48;
    const tearCutGeo = new THREE.BufferGeometry();
    const tearPos = new Float32Array((maxTearSegments + 1) * 2 * 3);
    const tearIndices: number[] = [];

    for (let s = 0; s < maxTearSegments; s++) {
      const i0 = s * 2;
      const i1 = s * 2 + 1;
      const i2 = (s + 1) * 2;
      const i3 = (s + 1) * 2 + 1;
      tearIndices.push(i0, i1, i2);
      tearIndices.push(i1, i3, i2);
    }

    tearCutGeo.setAttribute('position', new THREE.BufferAttribute(tearPos, 3));
    tearCutGeo.setIndex(tearIndices);
    tearCutGeo.computeVertexNormals();

    const tearCutMesh = new THREE.Mesh(tearCutGeo, tearSilverMat);
    tearCutMesh.visible = false;
    worldGroup.add(tearCutMesh);

    // Dynamic finger spark at cutting front
    const sparkGeo = new THREE.SphereGeometry(0.045, 12, 12);
    const sparkMat = new THREE.MeshBasicMaterial({ color: '#ffffff' });
    const sparkMesh = new THREE.Mesh(sparkGeo, sparkMat);
    sparkMesh.visible = false;
    worldGroup.add(sparkMesh);

    // --- 3.5 Luminous Tear Guide Shimmer (Brilho na linha indicando onde passar o dedo) ---
    const createTearGuideTexture = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 64;
      const ctx = canvas.getContext('2d')!;
      ctx.clearRect(0, 0, 512, 64);

      const vGrad = ctx.createLinearGradient(0, 0, 0, 64);
      vGrad.addColorStop(0.0, 'rgba(255, 255, 255, 0)');
      vGrad.addColorStop(0.35, 'rgba(0, 235, 255, 0.45)');
      vGrad.addColorStop(0.50, 'rgba(255, 255, 255, 0.95)');
      vGrad.addColorStop(0.65, 'rgba(0, 235, 255, 0.45)');
      vGrad.addColorStop(1.0, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = vGrad;
      ctx.fillRect(0, 0, 512, 64);

      const hGrad = ctx.createLinearGradient(0, 0, 512, 0);
      hGrad.addColorStop(0.0, 'rgba(255, 255, 255, 0.2)');
      hGrad.addColorStop(0.32, 'rgba(255, 255, 255, 0.3)');
      hGrad.addColorStop(0.46, 'rgba(255, 235, 160, 0.85)');
      hGrad.addColorStop(0.50, 'rgba(255, 255, 255, 1.0)');
      hGrad.addColorStop(0.54, 'rgba(255, 235, 160, 0.85)');
      hGrad.addColorStop(0.68, 'rgba(255, 255, 255, 0.3)');
      hGrad.addColorStop(1.0, 'rgba(255, 255, 255, 0.2)');
      ctx.globalCompositeOperation = 'source-in';
      ctx.fillStyle = hGrad;
      ctx.fillRect(0, 0, 512, 64);

      const tex = new THREE.CanvasTexture(canvas);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.wrapS = THREE.RepeatWrapping;
      tex.wrapT = THREE.ClampToEdgeWrapping;
      return tex;
    };

    const tearGuideTex = createTearGuideTexture();
    const tearGuideMat = new THREE.MeshBasicMaterial({
      map: tearGuideTex,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });

    const guideSegX = 36;
    const guideW = PW * 0.92;
    const guideH = 0.28;
    const guideGeo = new THREE.BufferGeometry();
    const guidePositions: number[] = [];
    const guideUvs: number[] = [];
    const guideIndices: number[] = [];

    for (let i = 0; i <= guideSegX; i++) {
      const u = i / guideSegX;
      const gx = -guideW / 2 + u * guideW;
      const gz = getPillowZ(gx, Y_CUT, true) + 0.015;

      guidePositions.push(gx, Y_CUT - guideH / 2, gz);
      guideUvs.push(u, 0);

      guidePositions.push(gx, Y_CUT + guideH / 2, gz);
      guideUvs.push(u, 1);
    }

    for (let i = 0; i < guideSegX; i++) {
      const i0 = i * 2;
      const i1 = i * 2 + 1;
      const i2 = (i + 1) * 2;
      const i3 = (i + 1) * 2 + 1;
      guideIndices.push(i0, i2, i1);
      guideIndices.push(i1, i2, i3);
    }

    guideGeo.setAttribute('position', new THREE.Float32BufferAttribute(guidePositions, 3));
    guideGeo.setAttribute('uv', new THREE.Float32BufferAttribute(guideUvs, 2));
    guideGeo.setIndex(guideIndices);
    guideGeo.computeVertexNormals();

    const tearGuideMesh = new THREE.Mesh(guideGeo, tearGuideMat);
    worldGroup.add(tearGuideMesh);

    // --- 3.9 Ciranda / Carrossel 3D de 12 Boosters com Faces Viradas Para Fora ---
    const CAROUSEL_SLOTS = 12;
    const CAROUSEL_RADIUS = 7.4;
    const carouselRootGroup = new THREE.Group();
    carouselRootGroup.position.set(0, 0, -CAROUSEL_RADIUS);
    carouselRootGroup.visible = ENABLE_BOOSTER_CAROUSEL;
    scene.add(carouselRootGroup);

    const carouselWheelGroup = new THREE.Group();
    carouselRootGroup.add(carouselWheelGroup);

    const carouselPackFrontGeo = createPouchSectionGeo(-PH / 2, PH / 2, true, 32, 18);
    const carouselPackBackGeo = createPouchSectionGeo(-PH / 2, PH / 2, false, 32, 18);
    const carouselLeftSeamGeo = createSideSeamGeo(-PH / 2, PH / 2, false, 18);
    const carouselRightSeamGeo = createSideSeamGeo(-PH / 2, PH / 2, true, 18);

    const carouselSlotGroups: THREE.Group[] = [];
    for (let k = 0; k < CAROUSEL_SLOTS; k++) {
      const theta = (k / CAROUSEL_SLOTS) * Math.PI * 2;
      const slotGroup = new THREE.Group();
      slotGroup.position.set(
        Math.sin(theta) * CAROUSEL_RADIUS,
        0,
        Math.cos(theta) * CAROUSEL_RADIUS
      );
      // Todas as 12 faces frontais (+Z local) viradas radialmente para fora da roda!
      slotGroup.rotation.y = theta;

      const packHolder = new THREE.Group();
      packHolder.add(new THREE.Mesh(carouselPackFrontGeo, foilFrontMat));
      packHolder.add(new THREE.Mesh(carouselPackBackGeo, foilBackMat));
      packHolder.add(new THREE.Mesh(carouselLeftSeamGeo, foilBackMat));
      packHolder.add(new THREE.Mesh(carouselRightSeamGeo, foilFrontMat));

      (slotGroup as any).userData = { slotIndex: k, theta, packHolder };
      slotGroup.add(packHolder);
      carouselWheelGroup.add(slotGroup);
      carouselSlotGroups.push(slotGroup);
    }

    // --- 4. Cards Rig ---
    const cardsMasterGroup = new THREE.Group();
    worldGroup.add(cardsMasterGroup);

    const CW = 2.48;
    const CH = 3.61;
    const CARD_CORNER_RADIUS = 0.095;

    const createRoundedCardShape = (w: number, h: number, r: number) => {
      const shape = new THREE.Shape();
      const x = -w / 2;
      const y = -h / 2;
      shape.moveTo(x + r, y);
      shape.lineTo(x + w - r, y);
      shape.quadraticCurveTo(x + w, y, x + w, y + r);
      shape.lineTo(x + w, y + h - r);
      shape.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
      shape.lineTo(x + r, y + h);
      shape.quadraticCurveTo(x, y + h, x, y + h - r);
      shape.lineTo(x, y + r);
      shape.quadraticCurveTo(x, y, x + r, y);
      return shape;
    };

    const MAX_STACK_DEPTH = 0.042;
    let cardMeshes: THREE.Object3D[] = [];
    const cardOrder: number[] = [];

    const cardsStackGroup = new THREE.Group();
    cardsMasterGroup.add(cardsStackGroup);

    // --- 4.5 Animação Existente na Matriz para Carta Mítica/Lendária (Última Carta) ---
    // Em vez de criar partículas Three.js avulsas, montamos o SVG oficial da Matriz com animateChroma=true
    // sincronizado 1:1 sobre a última carta revelada antes de ir para o grid de 9 cartas!
    const matrixRarityOverlay = document.createElement('div');
    matrixRarityOverlay.className = 'booster-matrix-rarity-live-overlay';
    matrixRarityOverlay.style.cssText = `
      position: absolute; left: 0; top: 0; width: 0; height: 0;
      pointer-events: none; z-index: 950; display: none;
      transform-origin: center center; will-change: transform, left, top, width, height, opacity;
    `;
    this.overlay.appendChild(matrixRarityOverlay);

    let activeMatrixOverlayMeshIdx = -1;
    let matrixRarityTimer = 0;
    const MATRIX_RARITY_DURATION = 2.25;
    let pendingGridTimer = 0;

    const hideMatrixRarityAnimation = () => {
      if (activeMatrixOverlayMeshIdx >= 0 && cardMeshes[activeMatrixOverlayMeshIdx]) {
        const frontMesh = (cardMeshes[activeMatrixOverlayMeshIdx] as any).userData?.frontMesh;
        if (frontMesh) frontMesh.visible = true;
      }
      activeMatrixOverlayMeshIdx = -1;
      matrixRarityTimer = 0;
      matrixRarityOverlay.style.display = 'none';
      matrixRarityOverlay.innerHTML = '';
    };

    const triggerMatrixRarityAnimation = (meshIdx: number) => {
      const targetMesh = cardMeshes[meshIdx];
      if (!targetMesh) return;
      const cd = (targetMesh as any).userData?.cardData || cardsData[meshIdx];
      if (!cd) return;

      hideMatrixRarityAnimation();

      const rawCardSource = cd.tpl || cd.cardData || cd;
      const svgMarkup = renderMatrixCardSVG(
        {
          ...rawCardSource,
          ...cd,
          rarityWeight: getBoosterCardSortWeight(cd),
        },
        { mode: 'full', animateChroma: true }
      );

      matrixRarityOverlay.innerHTML = `
        <div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;">
          ${svgMarkup}
        </div>
      `;
      const svgEl = matrixRarityOverlay.querySelector('svg');
      if (svgEl) {
        svgEl.style.width = '100%';
        svgEl.style.height = '100%';
        svgEl.style.display = 'block';
        svgEl.style.overflow = 'visible';
      }

      activeMatrixOverlayMeshIdx = meshIdx;
      matrixRarityTimer = 9999;
      matrixRarityOverlay.style.display = 'block';
      matrixRarityOverlay.style.opacity = '1';

      // Oculta a face estática WebGL enquanto o SVG vivo da Matriz está sobreposto 1:1
      const frontMesh = (targetMesh as any).userData?.frontMesh;
      if (frontMesh) frontMesh.visible = false;

      playSparkleBurstSound();
      playHoloShimmerSound();
    };

    let currentCardThickness = 0.0075;
    const getSlotZ = (slotIdx: number, total: number) => {
      const stepZ = total > 1 ? (MAX_STACK_DEPTH - currentCardThickness) / (total - 1) : 0;
      return (MAX_STACK_DEPTH / 2) - slotIdx * stepZ;
    };

    const cardCycleState = {
      isCycling: false,
      progress: 0,
      slidingMeshIdx: -1,
      startOrder: [] as number[],
    };

    const videoCinematic = {
      active: false,
      meshIdx: -1,
      timer: 0,
      startPos: new THREE.Vector3(),
      startRot: new THREE.Euler(),
      startScale: 1.0,
    };

    // --- 5. Holographic Foil Sheen Texture (Confinado 100% à geometria da carta) ---
    const createCardFoilSheenTexture = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 512;
      const ctx = canvas.getContext('2d')!;
      ctx.clearRect(0, 0, 512, 512);

      const grad = ctx.createLinearGradient(0, 0, 512, 512);
      grad.addColorStop(0.0, 'rgba(255, 255, 255, 0)');
      grad.addColorStop(0.32, 'rgba(0, 230, 255, 0)');
      grad.addColorStop(0.40, 'rgba(0, 230, 255, 0.40)');
      grad.addColorStop(0.46, 'rgba(255, 240, 160, 0.75)');
      grad.addColorStop(0.50, 'rgba(255, 255, 255, 0.95)');
      grad.addColorStop(0.54, 'rgba(255, 120, 220, 0.75)');
      grad.addColorStop(0.60, 'rgba(160, 80, 255, 0.40)');
      grad.addColorStop(0.68, 'rgba(255, 255, 255, 0)');
      grad.addColorStop(1.0, 'rgba(255, 255, 255, 0)');

      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 512, 512);

      const drawGlint = (cx: number, cy: number, r: number) => {
        const radGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
        radGrad.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
        radGrad.addColorStop(0.4, 'rgba(255, 240, 180, 0.55)');
        radGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = radGrad;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(cx - r * 1.5, cy);
        ctx.lineTo(cx + r * 1.5, cy);
        ctx.moveTo(cx, cy - r * 1.5);
        ctx.lineTo(cx, cy + r * 1.5);
        ctx.stroke();
      };

      drawGlint(220, 220, 16);
      drawGlint(260, 255, 22);
      drawGlint(300, 295, 14);

      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.RepeatWrapping;
      return texture;
    };
    const foilSheenTex = createCardFoilSheenTexture();

    let shimmerTimer = 0;
    let shimmerMeshIdx = -1;

    const triggerCardShimmer = (targetIdx?: number) => {
      shimmerTimer = 1.35;
      shimmerMeshIdx = targetIdx !== undefined ? targetIdx : (cardOrder[0] ?? 0);
      playHoloShimmerSound();
    };

    const triggerSparkleFx = () => {
      playSparkleBurstSound();
    };

    const stopVideoCinematic = () => {
      if (!videoCinematic.active) return;
      videoCinematic.active = false;
      const idx = videoCinematic.meshIdx;
      if (idx >= 0 && cardMeshes[idx]) {
        const m = cardMeshes[idx];
        m.scale.set(1, 1, 1);
        m.rotation.set(0, 0, 0);
        if (!isGridMode) {
          const slot = cardOrder.indexOf(idx);
          if (slot >= 0) {
            m.position.set(0, 0, getSlotZ(slot, cardMeshes.length));
          }
        }
      }
      videoCinematic.meshIdx = -1;
      videoCinematic.timer = 0;
    };

    const enterGridMode = () => {
      if (isGridMode) return;
      stopVideoCinematic();
      hideMatrixRarityAnimation();
      pendingGridTimer = 0;
      isGridMode = true;
      bottomGridBar.style.display = 'flex';
      playHoloShimmerSound();

      // Limpeza completa: garante que todos os frontMeshes estão visíveis e nenhum overlay de croma fica travado
      cardMeshes.forEach((m: any) => {
        if (m?.userData?.frontMesh) m.userData.frontMesh.visible = true;
        if (m?.userData?.sheenMesh) {
          m.userData.sheenMesh.visible = false;
          m.userData.sheenMesh.material.opacity = 0;
        }
      });
      matrixRarityOverlay.style.display = 'none';
      matrixRarityOverlay.innerHTML = '';
      activeMatrixOverlayMeshIdx = -1;
    };

    const finishCycle = () => {
      if (!cardCycleState.isCycling) return;
      cardCycleState.isCycling = false;
      const count = cardMeshes.length;
      if (count > 1) {
        const top = cardOrder.shift()!;
        cardOrder.push(top);
        cardOrder.forEach((meshIdx, slotIdx) => {
          const m = cardMeshes[meshIdx];
          if (m) {
            m.position.set(0, 0, getSlotZ(slotIdx, count));
            m.rotation.set(0, 0, 0);
            if (!videoCinematic.active || videoCinematic.meshIdx !== meshIdx) {
              m.scale.set(1, 1, 1);
            }
          }
        });

        const newTopIdx = cardOrder[0];
        const newTopMesh = cardMeshes[newTopIdx];
        if (newTopMesh && !isGridMode) {
          const rarity = (newTopMesh as any).userData?.rarity;
          const weight = (newTopMesh as any).userData?.rarityWeight ?? 0;
          const isLastCard = revealedCount >= count || newTopIdx === count - 1;
          const isMythicOrLegendary = rarity === 'legendary' || weight >= 4;
          const isPremium = isMythicOrLegendary || rarity === 'epic' || (newTopMesh as any).userData?.isVideo;

          if (isMythicOrLegendary) {
            // Dispara imediatamente o efeito cromado vivo da Matriz ao contemplar a carta mítica/lendária!
            triggerCardShimmer(newTopIdx);
            triggerMatrixRarityAnimation(newTopIdx);
            if (isLastCard) {
              pendingGridTimer = 15.0; // Dá tempo abundante para contemplar a última carta; clique avança imediatamente ao grid
            }
          } else if (isLastCard) {
            triggerCardShimmer(newTopIdx);
            pendingGridTimer = 15.0;
          } else if (isPremium) {
            triggerCardShimmer(newTopIdx);
            triggerSparkleFx();
          }
        }
      }
    };

    const triggerCycleCard = () => {
      if (videoCinematic.active) {
        stopVideoCinematic();
      }
      hideMatrixRarityAnimation();
      const count = cardMeshes.length;
      if (count <= 1) {
        playCardSlideSound();
        return;
      }
      if (cardCycleState.isCycling) {
        finishCycle();
      }
      cardCycleState.isCycling = true;
      cardCycleState.progress = 0;
      cardCycleState.slidingMeshIdx = cardOrder[0];
      cardCycleState.startOrder = [...cardOrder];
      playCardSlideSound();
    };

    const rebuildCardMeshes = (cardsList: PackCardData[]) => {
      hideMatrixRarityAnimation();
      while (cardsStackGroup.children.length > 0) {
        cardsStackGroup.remove(cardsStackGroup.children[0]);
      }
      cardMeshes = [];
      cardOrder.length = 0;
      cardCycleState.isCycling = false;
      videoCinematic.active = false;
      initialFlipRevealed = false;

      const count = cardsList.length;
      currentCardThickness = Math.min(0.0075, MAX_STACK_DEPTH / Math.max(1, count));
      const halfThick = currentCardThickness / 2;

      const cardShape = createRoundedCardShape(CW, CH, CARD_CORNER_RADIUS);

      const frontGeo = new THREE.ShapeGeometry(cardShape, 32);
      const fPos = frontGeo.attributes.position;
      const fUvs = new Float32Array(fPos.count * 2);
      for (let k = 0; k < fPos.count; k++) {
        fUvs[k * 2] = (fPos.getX(k) + CW / 2) / CW;
        fUvs[k * 2 + 1] = (fPos.getY(k) + CH / 2) / CH;
      }
      frontGeo.setAttribute('uv', new THREE.BufferAttribute(fUvs, 2));

      const backGeo = new THREE.ShapeGeometry(cardShape, 32);
      const bPos = backGeo.attributes.position;
      const bUvs = new Float32Array(bPos.count * 2);
      for (let k = 0; k < bPos.count; k++) {
        bUvs[k * 2] = (bPos.getX(k) + CW / 2) / CW;
        bUvs[k * 2 + 1] = (bPos.getY(k) + CH / 2) / CH;
      }
      backGeo.setAttribute('uv', new THREE.BufferAttribute(bUvs, 2));

      const curvePoints = cardShape.getPoints(32);
      const edgeVertices: number[] = [];
      const numPts = curvePoints.length;
      for (let i = 0; i < numPts; i++) {
        const p1 = curvePoints[i];
        const p2 = curvePoints[(i + 1) % numPts];
        edgeVertices.push(
          p1.x, p1.y, halfThick,
          p2.x, p2.y, halfThick,
          p1.x, p1.y, -halfThick,

          p2.x, p2.y, halfThick,
          p2.x, p2.y, -halfThick,
          p1.x, p1.y, -halfThick
        );
      }
      const edgeGeo = new THREE.BufferGeometry();
      edgeGeo.setAttribute('position', new THREE.Float32BufferAttribute(edgeVertices, 3));
      edgeGeo.computeVertexNormals();

      const edgeMat = new THREE.MeshBasicMaterial({
        color: '#ffffff',
        side: THREE.DoubleSide,
      });

      cardsList.forEach((cardItem, idx) => {
        const cardGroup = new THREE.Group();
        const frontTex = cardItem.texture;
        const isVideoCard = Boolean(cardItem.isVideo || (frontTex as any).isVideo);

        const frontMat = new THREE.MeshBasicMaterial({
          map: frontTex,
          side: THREE.DoubleSide,
          polygonOffset: true,
          polygonOffsetFactor: -1,
          polygonOffsetUnits: -1,
        });

        const frontMesh = new THREE.Mesh(frontGeo, frontMat);
        frontMesh.position.z = halfThick + 0.0006;
        cardGroup.add(frontMesh);

        const backMesh = new THREE.Mesh(backGeo, cardBackMat);
        backMesh.position.z = -(halfThick + 0.0006);
        backMesh.rotation.y = Math.PI;
        cardGroup.add(backMesh);

        const rimMesh = new THREE.Mesh(edgeGeo, edgeMat);
        cardGroup.add(rimMesh);

        const sheenMat = new THREE.MeshBasicMaterial({
          map: foilSheenTex.clone(),
          transparent: true,
          opacity: 0,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          side: THREE.FrontSide,
        });
        const sheenMesh = new THREE.Mesh(frontGeo, sheenMat);
        sheenMesh.position.z = halfThick + 0.0012;
        sheenMesh.visible = false;
        cardGroup.add(sheenMesh);

        (cardGroup as any).userData = {
          cardData: cardItem,
          isVideo: isVideoCard,
          rarity: cardItem.rarity,
          rarityWeight: getBoosterCardSortWeight(cardItem),
          meshIndex: idx,
          sheenMesh: sheenMesh,
          frontMesh: frontMesh,
        };

        cardGroup.position.set(0, 0, getSlotZ(idx, count));
        cardsStackGroup.add(cardGroup);
        cardMeshes.push(cardGroup);
        cardOrder.push(idx);
      });
    };

    rebuildCardMeshes(cardsData);

    // State Variables
    let packState: 'carousel' | 'sealed' | 'cutting' | 'opened' = ENABLE_BOOSTER_CAROUSEL ? 'carousel' : 'sealed';
    let carouselAngle = 0;
    let targetCarouselAngle = 0;
    let carouselTransition = ENABLE_BOOSTER_CAROUSEL ? 0 : 1;
    let targetCarouselTransition = ENABLE_BOOSTER_CAROUSEL ? 0 : 1;
    let lastCarouselTickSlot = 0;
    let chosenCarouselSlotIdx = -1;

    // Rotação 3D livre do pacote enquadrado na frente da ciranda antes de escolhê-lo
    let inspectRotX = 0.06;
    let inspectRotY = 0.0;
    let targetInspectRotX = 0.06;
    let targetInspectRotY = 0.0;
    let carouselDragMode: 'none' | 'wheel' | 'inspect' = 'none';
    let clickedSideSlotIndex = -1;

    let cutProgress = 0;
    let targetCutProgress = 0;
    let flopProgress = 0;

    let isCardsLeapt = false;
    let cardsLeapProgress = 0;
    let targetCardsLeapProgress = 0;

    let isCardsFlipped = false;
    let cardsFlipProgress = 0;
    let targetCardsFlipProgress = 0;

    let isGridMode = false;
    let gridProgress = 0;
    let revealedCount = 0;
    let initialFlipRevealed = false;

    // Pointer Interaction
    let isPointerDown = false;
    let isCuttingStroke = false;
    let pointerStartX = 0;
    let pointerStartY = 0;
    let lastTraceX = 0;
    let hasMoved = false;

    let rotX = 0.08;
    let rotY = 0.0;
    let targetRotX = rotX;
    let targetRotY = rotY;

    let targetZoom = 12.4;
    let currentZoom = 12.4;

    if (ENABLE_BOOSTER_CAROUSEL) {
      worldGroup.visible = false;
    }

    const stepAngle = (Math.PI * 2) / CAROUSEL_SLOTS;

    const getActiveFrontSlotIndex = () => {
      const idx = Math.round(-targetCarouselAngle / stepAngle);
      return ((idx % CAROUSEL_SLOTS) + CAROUSEL_SLOTS) % CAROUSEL_SLOTS;
    };

    // --- UI da Ciranda / Carrossel de 12 Boosters ---
    const carouselBar = document.createElement('div');
    carouselBar.className = 'booster-carousel-bar';
    carouselBar.style.cssText = `
      position: absolute; bottom: 26px; left: 50%; transform: translateX(-50%);
      display: ${ENABLE_BOOSTER_CAROUSEL ? 'flex' : 'none'};
      flex-direction: column; align-items: center; gap: 10px;
      z-index: 1000; pointer-events: auto;
    `;

    const carouselHint = document.createElement('div');
    carouselHint.style.cssText = `
      font-size: 0.72rem; font-weight: 800; letter-spacing: 1.3px;
      color: #334155; text-transform: uppercase;
      background: rgba(255, 255, 255, 0.92);
      padding: 6px 18px; border-radius: 999px;
      border: 1px solid rgba(148, 163, 184, 0.35);
      box-shadow: 0 4px 12px rgba(15, 23, 42, 0.06);
      pointer-events: none; white-space: nowrap;
    `;

    const updateCarouselHintText = () => {
      const slotNum = getActiveFrontSlotIndex() + 1;
      carouselHint.innerHTML = `<span style="color:#d97706;">PACOTE #${slotNum} DE ${CAROUSEL_SLOTS}</span> · ARRASTE NO PACOTE PARA ROTACIONAR 3D · LATERAIS GIRA A RODA`;
    };
    updateCarouselHintText();

    const carouselControlsRow = document.createElement('div');
    carouselControlsRow.style.cssText = `
      display: flex; align-items: center; gap: 12px;
    `;

    const resetInspectRotation = () => {
      targetInspectRotX = 0.06;
      targetInspectRotY = 0;
    };

    const btnSpinLeft = document.createElement('button');
    btnSpinLeft.innerHTML = '‹';
    btnSpinLeft.title = 'Pacote Anterior';
    btnSpinLeft.style.cssText = `
      width: 42px; height: 42px; border-radius: 50%;
      background: #ffffff; border: 1.5px solid rgba(15, 23, 42, 0.14);
      color: #0f172a; font-size: 1.35rem; font-weight: 800;
      cursor: pointer; display: flex; align-items: center; justify-content: center;
      box-shadow: 0 4px 14px rgba(15, 23, 42, 0.08);
      transition: transform 0.15s ease, box-shadow 0.15s ease;
    `;
    btnSpinLeft.onclick = (e) => {
      e.stopPropagation();
      resetInspectRotation();
      targetCarouselAngle = Math.round(targetCarouselAngle / stepAngle + 1) * stepAngle;
      updateCarouselHintText();
      playCardSlideSound();
    };

    // Carrega o lote REAL de cartas associado ao pacote escolhido na roda (0..11)
    const materializeSlotPackCards = (slotIdx: number) => {
      if (typeof sourceCardsInput?.materializeCarouselSlot === 'function') {
        const slotRes = sourceCardsInput.materializeCarouselSlot(slotIdx, true);
        if (slotRes instanceof Promise) {
          slotRes.then((slotCards: any) => {
            if (Array.isArray(slotCards) && slotCards.length > 0) {
              cardsData = mapRawCardsList(slotCards);
              rebuildCardMeshes(cardsData);
            }
          });
          return;
        } else if (Array.isArray(slotRes) && slotRes.length > 0) {
          cardsData = mapRawCardsList(slotRes);
          rebuildCardMeshes(cardsData);
          return;
        }
      }
      if (Array.isArray(sourceCardsInput) && sourceCardsInput.length > 0) {
        cardsData = mapRawCardsList(sourceCardsInput);
        rebuildCardMeshes(cardsData);
      }
    };

    const selectCarouselBooster = () => {
      if (packState !== 'carousel') return;

      const frontIdx = getActiveFrontSlotIndex();
      chosenCarouselSlotIdx = frontIdx;
      targetCarouselAngle = -frontIdx * stepAngle;

      // Materializa o pacote REAL correspondente ao slot escolhido (sem ser apenas animação estética)
      materializeSlotPackCards(frontIdx);

      // Transfere IMEDIATAMENTE a pose exata (posição, escala e rotação 3D) do envelope enquadrado
      // para o worldGroup e oculta apenas esse slot na roda -> ZERO CORTE SECO!
      const chosenSlot = carouselSlotGroups[frontIdx];
      if (chosenSlot) {
        const { theta, packHolder } = (chosenSlot as any).userData;
        const worldPos = new THREE.Vector3();
        packHolder.getWorldPosition(worldPos);
        worldGroup.position.copy(worldPos);
        worldGroup.scale.copy(chosenSlot.scale);

        const relAngle = normalizeAngleRad(theta + carouselAngle);
        rotX = packHolder.rotation.x;
        rotY = normalizeAngleRad(relAngle + packHolder.rotation.y);
        targetRotX = 0.08;
        targetRotY = 0.0;
        worldGroup.rotation.set(rotX, rotY, 0);

        chosenSlot.visible = false;
      }

      packState = 'sealed';
      targetCarouselTransition = 1.0;
      carouselBar.style.display = 'none';
      worldGroup.visible = true;
      playHoloShimmerSound();
    };

    const btnPickPack = document.createElement('button');
    btnPickPack.innerHTML = '✨ ESCOLHER ESTE BOOSTER';
    btnPickPack.style.cssText = `
      display: inline-flex; align-items: center; justify-content: center; gap: 8px;
      padding: 12px 28px; white-space: nowrap; border-radius: 999px;
      background: linear-gradient(135deg, #ffd700 0%, #f59e0b 55%, #d97706 100%);
      color: #0f172a; border: 1.5px solid rgba(255, 255, 255, 0.9);
      font-family: 'Outfit', sans-serif; font-size: 0.86rem; font-weight: 900;
      letter-spacing: 0.8px; cursor: pointer; transition: all 0.2s ease;
      box-shadow: 0 6px 20px rgba(245, 158, 11, 0.35), 0 2px 6px rgba(15, 23, 42, 0.08);
    `;
    btnPickPack.onclick = (e) => {
      e.stopPropagation();
      selectCarouselBooster();
    };

    const btnSpinRight = document.createElement('button');
    btnSpinRight.innerHTML = '›';
    btnSpinRight.title = 'Próximo Pacote';
    btnSpinRight.style.cssText = btnSpinLeft.style.cssText;
    btnSpinRight.onclick = (e) => {
      e.stopPropagation();
      resetInspectRotation();
      targetCarouselAngle = Math.round(targetCarouselAngle / stepAngle - 1) * stepAngle;
      updateCarouselHintText();
      playCardSlideSound();
    };

    carouselControlsRow.appendChild(btnSpinLeft);
    carouselControlsRow.appendChild(btnPickPack);
    carouselControlsRow.appendChild(btnSpinRight);
    carouselBar.appendChild(carouselHint);
    carouselBar.appendChild(carouselControlsRow);
    this.overlay.appendChild(carouselBar);

    const getLocalPointerCoords = (clientX: number, clientY: number) => {
      const rect = container.getBoundingClientRect();
      const mouse = new THREE.Vector2(
        ((clientX - rect.left) / rect.width) * 2 - 1,
        -((clientY - rect.top) / rect.height) * 2 + 1
      );

      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(mouse, camera);

      const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
      plane.applyMatrix4(worldGroup.matrixWorld);

      const intersectionPoint = new THREE.Vector3();
      if (raycaster.ray.intersectPlane(plane, intersectionPoint)) {
        worldGroup.worldToLocal(intersectionPoint);
        return { x: intersectionPoint.x, y: intersectionPoint.y };
      }
      return null;
    };

    const resetToSealed = () => {
      stopVideoCinematic();
      hideMatrixRarityAnimation();
      pendingGridTimer = 0;

      // Re-sorteia o slot que acabou de ser aberto caso o jogador clique em "Abrir Outro Pack"
      if (chosenCarouselSlotIdx >= 0 && typeof sourceCardsInput?.rerollCarouselSlot === 'function') {
        sourceCardsInput.rerollCarouselSlot(chosenCarouselSlotIdx);
      }
      chosenCarouselSlotIdx = -1;
      carouselSlotGroups.forEach((slotGrp) => {
        slotGrp.visible = true;
      });
      resetInspectRotation();
      inspectRotX = 0.06;
      inspectRotY = 0;

      packState = ENABLE_BOOSTER_CAROUSEL ? 'carousel' : 'sealed';
      carouselTransition = ENABLE_BOOSTER_CAROUSEL ? 0 : 1;
      targetCarouselTransition = ENABLE_BOOSTER_CAROUSEL ? 0 : 1;
      carouselRootGroup.visible = ENABLE_BOOSTER_CAROUSEL;
      carouselBar.style.display = ENABLE_BOOSTER_CAROUSEL ? 'flex' : 'none';
      worldGroup.visible = !ENABLE_BOOSTER_CAROUSEL;
      worldGroup.position.set(0, 0, 0);
      worldGroup.scale.setScalar(1);
      updateCarouselHintText();

      targetCutProgress = 0;
      cutProgress = 0;
      flopProgress = 0;
      isCardsLeapt = false;
      targetCardsLeapProgress = 0;
      cardsLeapProgress = 0;
      isCardsFlipped = false;
      targetCardsFlipProgress = 0;
      cardsFlipProgress = 0;
      isGridMode = false;
      gridProgress = 0;
      revealedCount = 0;

      topStripGroup.visible = true;
      lowerPouchGroup.visible = true;
      cardsMasterGroup.visible = false;
      rebuildCardMeshes(cardsData);

      updateFloppyTopStrip(0, 0);
      tearGuideMesh.visible = true;
      tearGuideTex.offset.x = 0;
      bottomGridBar.style.display = 'none';
      if (this.qtyCapsule) {
        this.qtyCapsule.style.opacity = '1';
        this.qtyCapsule.style.transform = 'translateX(-50%) translateY(0)';
      }
    };

    // Duas cápsulas simples de linha única no rodapé
    const bottomGridBar = document.createElement('div');
    bottomGridBar.className = 'booster-grid-actions';
    bottomGridBar.style.cssText = `
      position: absolute; bottom: 26px; left: 50%; transform: translateX(-50%);
      display: none; align-items: center; justify-content: center; gap: 14px;
      z-index: 1000; pointer-events: auto;
    `;

    // Cápsula 1: Abrir outro pack (cápsula simples de linha única)
    const btnOpenAnother = document.createElement('button');
    btnOpenAnother.innerHTML = `✨ Abrir Outro Pack`;
    btnOpenAnother.style.cssText = `
      display: inline-flex; align-items: center; justify-content: center; gap: 8px;
      padding: 10px 22px; white-space: nowrap; border-radius: 999px;
      background: #ffffff;
      color: #0f172a; border: 1.5px solid rgba(15, 23, 42, 0.16);
      font-family: 'Outfit', sans-serif; font-size: 0.84rem; font-weight: 800;
      letter-spacing: 0.6px; cursor: pointer; transition: all 0.2s ease;
      box-shadow: 0 4px 16px rgba(15, 23, 42, 0.08);
    `;
    btnOpenAnother.onmouseenter = () => {
      btnOpenAnother.style.borderColor = 'rgba(212, 175, 55, 0.8)';
      btnOpenAnother.style.transform = 'translateY(-1px)';
    };
    btnOpenAnother.onmouseleave = () => {
      btnOpenAnother.style.borderColor = 'rgba(15, 23, 42, 0.16)';
      btnOpenAnother.style.transform = 'none';
    };
    btnOpenAnother.onmousedown = () => {
      btnOpenAnother.style.transform = 'translateY(1px)';
    };
    btnOpenAnother.onmouseup = () => {
      btnOpenAnother.style.transform = 'none';
    };
    btnOpenAnother.onclick = () => resetToSealed();

    // Cápsula 2: Concluir & Coletar (cápsula simples de linha única)
    const btnCollect = document.createElement('button');
    btnCollect.innerHTML = `🏆 Concluir & Coletar`;
    btnCollect.style.cssText = `
      display: inline-flex; align-items: center; justify-content: center; gap: 8px;
      padding: 10px 24px; white-space: nowrap; border-radius: 999px;
      background: linear-gradient(135deg, #ffd700 0%, #e5a910 50%, #c48208 100%);
      color: #1a0f00; border: 1px solid rgba(255, 245, 180, 0.6);
      font-family: 'Outfit', sans-serif; font-size: 0.84rem; font-weight: 800;
      letter-spacing: 0.6px; cursor: pointer; transition: all 0.2s ease;
      box-shadow: 0 4px 20px rgba(245, 158, 11, 0.35);
    `;
    btnCollect.onmouseenter = () => {
      btnCollect.style.filter = 'brightness(1.08)';
      btnCollect.style.transform = 'translateY(-1px)';
    };
    btnCollect.onmouseleave = () => {
      btnCollect.style.filter = 'none';
      btnCollect.style.transform = 'none';
    };
    btnCollect.onmousedown = () => {
      btnCollect.style.transform = 'translateY(1px)';
    };
    btnCollect.onmouseup = () => {
      btnCollect.style.transform = 'none';
    };
    btnCollect.onclick = () => {
      if (this.options.onComplete) {
        this.options.onComplete(cardsData);
      }
      this.destroy();
    };

    bottomGridBar.appendChild(btnOpenAnother);
    bottomGridBar.appendChild(btnCollect);
    this.overlay.appendChild(bottomGridBar);

    const normalizeForViewer = (cd: any): any => {
      if (!cd) return null;
      const tpl = cd.tpl || cd;
      const atk = cd.atk ?? tpl.baseAtk ?? tpl.atk ?? 100;
      const pv = cd.pv ?? tpl.basePv ?? tpl.pv ?? 100;
      const mana = cd.mana ?? tpl.manaCost ?? tpl.mana ?? 1;
      const stamina = cd.stamina ?? tpl.staminaCost ?? tpl.stamina ?? 1;
      const attacksSource = (tpl.attacks && tpl.attacks.length > 0) ? tpl.attacks : (cd.attacks || [
        { name: 'ATACAR', damage: atk, cost: stamina, costType: 'stamina' }
      ]);
      return {
        ...tpl,
        id: tpl.id || cd.id || 'viewer-' + Math.random().toString(36).slice(2, 7),
        name: tpl.name || cd.name || 'Carta',
        image: tpl.image || cd.image || cd.imageUrl || '',
        atk,
        baseAtk: atk,
        pv,
        basePv: pv,
        maxPv: pv,
        manaCost: mana,
        staminaCost: stamina,
        attacks: attacksSource,
        specialAttack: tpl.specialAttack || cd.specialAttack,
        abilityId: tpl.abilityId || cd.abilityId,
        flavorText: tpl.flavorText || cd.flavorText || 'Uma relíquia das lendas de inverno.',
        rarity: tpl.preferredRarity || tpl.rarity || cd.rarity || 'common',
        preferredRarity: tpl.preferredRarity || tpl.rarity || cd.rarity || 'common',
        borderColor: tpl.borderColor || cd.borderColor,
        glowColor: tpl.glowColor || cd.glowColor,
        immersiveMode: false
      };
    };

    // Detecta qual slot do carrossel foi clicado/tocado via Raycaster
    const raycastCarouselSlot = (clientX: number, clientY: number): number => {
      const rect = container.getBoundingClientRect();
      const mouse = new THREE.Vector2(
        ((clientX - rect.left) / rect.width) * 2 - 1,
        -((clientY - rect.top) / rect.height) * 2 + 1
      );
      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(carouselSlotGroups, true);
      if (intersects.length > 0) {
        let obj: THREE.Object3D | null = intersects[0].object;
        while (obj && !carouselSlotGroups.includes(obj as THREE.Group)) {
          obj = obj.parent;
        }
        if (obj && typeof (obj as any).userData?.slotIndex === 'number') {
          return (obj as any).userData.slotIndex;
        }
      }
      return -1;
    };

    const onPointerDown = (e: PointerEvent) => {
      isPointerDown = true;
      pointerStartX = e.clientX;
      pointerStartY = e.clientY;
      hasMoved = false;

      if (packState === 'carousel') {
        isCuttingStroke = false;
        clickedSideSlotIndex = -1;
        const hitSlotIdx = raycastCarouselSlot(e.clientX, e.clientY);
        const frontSlotIdx = getActiveFrontSlotIndex();

        if (hitSlotIdx === frontSlotIdx) {
          // Arrastar diretamente sobre o booster enquadrado rotaciona-o em 3D antes de escolher!
          carouselDragMode = 'inspect';
        } else {
          // Arrastar fora do booster central ou sobre os boosters laterais gira a ciranda de 12 pacotes!
          carouselDragMode = 'wheel';
          if (hitSlotIdx >= 0 && hitSlotIdx !== frontSlotIdx) {
            clickedSideSlotIndex = hitSlotIdx;
          }
        }
        container.style.cursor = 'grabbing';
        return;
      }

      const local = getLocalPointerCoords(e.clientX, e.clientY);

      if (
        packState === 'sealed' &&
        local &&
        Math.abs(local.y - Y_CUT) < 0.45 &&
        Math.abs(local.x) <= PW / 2 + 0.3
      ) {
        isCuttingStroke = true;
        packState = 'cutting';
        lastTraceX = local.x;

        const initialProgress = THREE.MathUtils.clamp((local.x - (-PW / 2)) / PW, 0, 1);
        targetCutProgress = initialProgress < 0.3 ? 0 : initialProgress;
        cutProgress = targetCutProgress;
        container.style.cursor = 'crosshair';
      } else {
        isCuttingStroke = false;
        container.style.cursor = packState === 'sealed' ? 'grabbing' : 'pointer';
      }
    };

    const onPointerMove = (e: PointerEvent) => {
      const dx = e.clientX - pointerStartX;
      const dy = e.clientY - pointerStartY;

      if (Math.hypot(dx, dy) > 5) {
        hasMoved = true;
      }

      if (packState === 'carousel') {
        if (isPointerDown) {
          if (carouselDragMode === 'inspect') {
            // Rotaciona livremente o pacote enquadrado em 3D antes de escolher
            targetInspectRotY += dx * 0.0085;
            targetInspectRotX += dy * 0.0075;
            targetInspectRotX = Math.max(-Math.PI * 0.42, Math.min(Math.PI * 0.42, targetInspectRotX));
          } else {
            // Gira a roda de 12 boosters
            resetInspectRotation();
            targetCarouselAngle += dx * 0.0065;
            const currentSlotTick = Math.round(targetCarouselAngle / stepAngle);
            if (currentSlotTick !== lastCarouselTickSlot) {
              lastCarouselTickSlot = currentSlotTick;
              updateCarouselHintText();
              playCardSlideSound();
            }
          }
          pointerStartX = e.clientX;
          pointerStartY = e.clientY;
        } else {
          container.style.cursor = 'grab';
        }
        return;
      }

      if (isPointerDown && isCuttingStroke) {
        const local = getLocalPointerCoords(e.clientX, e.clientY);
        if (local) {
          const deltaX = local.x - lastTraceX;
          lastTraceX = local.x;

          const currentStroke = THREE.MathUtils.clamp((local.x - (-PW / 2)) / PW, 0, 1);
          if (currentStroke > targetCutProgress) {
            targetCutProgress = currentStroke;
            const speed = Math.abs(deltaX) * 30;
            if (speed > 0.05) {
              playDynamicFoilScrape(Math.min(speed, 2.5));
            }
          }

          if (targetCutProgress >= 0.85) {
            targetCutProgress = 1.0;
            packState = 'opened';
            isCuttingStroke = false;
            playFoilTearSound();
            setTimeout(() => playCardSlideSound(), 250);
          }
        }
      } else if (isPointerDown) {
        if (packState === 'sealed') {
          targetRotY += dx * 0.007;
          targetRotX += dy * 0.007;
          targetRotX = Math.max(-Math.PI * 0.45, Math.min(Math.PI * 0.45, targetRotX));
          pointerStartX = e.clientX;
          pointerStartY = e.clientY;
        }
      } else {
        if (packState === 'opened') {
          container.style.cursor = 'pointer';
        } else {
          const local = getLocalPointerCoords(e.clientX, e.clientY);
          if (local && Math.abs(local.y - Y_CUT) < 0.4) {
            container.style.cursor = 'crosshair';
          } else {
            container.style.cursor = 'grab';
          }
        }
      }
    };

    const onPointerUp = (e: PointerEvent) => {
      if (packState === 'carousel') {
        isPointerDown = false;
        container.style.cursor = 'grab';
        if (!hasMoved) {
          if (clickedSideSlotIndex >= 0) {
            // Clicar num pacote lateral da roda gira suavemente até enquadrá-lo
            resetInspectRotation();
            const currentFront = getActiveFrontSlotIndex();
            let diff = clickedSideSlotIndex - currentFront;
            if (diff > CAROUSEL_SLOTS / 2) diff -= CAROUSEL_SLOTS;
            if (diff < -CAROUSEL_SLOTS / 2) diff += CAROUSEL_SLOTS;
            targetCarouselAngle = Math.round(targetCarouselAngle / stepAngle - diff) * stepAngle;
            updateCarouselHintText();
            playCardSlideSound();
          } else if (carouselDragMode === 'inspect') {
            // Clique simples sem arrastar no pacote frontal escolhe-o para abrir
            selectCarouselBooster();
          }
        } else if (carouselDragMode === 'wheel') {
          // Alinha magneticamente no slot mais próximo da roda de 12 pacotes
          targetCarouselAngle = Math.round(targetCarouselAngle / stepAngle) * stepAngle;
          updateCarouselHintText();
        }
        carouselDragMode = 'none';
        clickedSideSlotIndex = -1;
        return;
      }

      if (isCuttingStroke) {
        if (targetCutProgress >= 0.72) {
          targetCutProgress = 1.0;
          packState = 'opened';
          playFoilTearSound();
          setTimeout(() => playCardSlideSound(), 200);
          setTimeout(() => {
            if (!isCardsLeapt && packState === 'opened') {
              isCardsLeapt = true;
              targetCardsLeapProgress = 1.0;
              playCardSlideSound();
            }
          }, 360);
        } else {
          targetCutProgress = 0.0;
          packState = 'sealed';
        }
        isCuttingStroke = false;
      } else if (!hasMoved) {
        if (packState === 'sealed') {
          targetCutProgress = 1.0;
          packState = 'opened';
          playFoilTearSound();
          setTimeout(() => playCardSlideSound(), 200);
          setTimeout(() => {
            if (!isCardsLeapt && packState === 'opened') {
              isCardsLeapt = true;
              targetCardsLeapProgress = 1.0;
              playCardSlideSound();
            }
          }, 360);
        } else if (packState === 'opened') {
          const rect = container.getBoundingClientRect();
          const mouse = new THREE.Vector2(
            ((e.clientX - rect.left) / rect.width) * 2 - 1,
            -((e.clientY - rect.top) / rect.height) * 2 + 1
          );
          const raycaster = new THREE.Raycaster();
          raycaster.setFromCamera(mouse, camera);
          const intersects = raycaster.intersectObjects(cardMeshes, true);

          if (!isCardsLeapt) {
            isCardsLeapt = true;
            targetCardsLeapProgress = 1.0;
            playCardSlideSound();
          } else if (!isCardsFlipped) {
            isCardsFlipped = true;
            targetCardsFlipProgress = 1.0;
            revealedCount = 1;
            const firstTopIdx = cardOrder[0];
            triggerCardShimmer(firstTopIdx);
            playSparkleBurstSound();
            // Caso o booster tenha apenas 1 carta e ela já seja a última
            if (cardMeshes.length === 1) {
              triggerMatrixRarityAnimation(firstTopIdx);
              pendingGridTimer = 15.0;
            }
          } else if (videoCinematic.active) {
            stopVideoCinematic();
          } else if (isGridMode) {
            if (intersects.length > 0) {
              let clickedMesh: THREE.Object3D | null = intersects[0].object;
              while (clickedMesh && !cardMeshes.includes(clickedMesh)) {
                clickedMesh = clickedMesh.parent;
              }
              const clickedIdx = clickedMesh ? cardMeshes.indexOf(clickedMesh) : -1;
              if (clickedIdx >= 0) {
                triggerCardShimmer(clickedIdx);
                const cd = (clickedMesh as any)?.userData?.cardData || cardsData[clickedIdx];
                const cardForViewer = normalizeForViewer(cd);
                if (cardForViewer) {
                  openCardViewer({
                    card: cardForViewer,
                    list: cardsData.map((c: any) => normalizeForViewer(c)).filter(Boolean),
                    index: clickedIdx,
                    actionLabel: 'FECHAR',
                    onAction: () => ({ close: true }),
                  });
                }
              }
            }
          } else {
            // Fase de abertura do booster (passando as cartas uma a uma no stack)
            const totalCards = cardMeshes.length;
            if (revealedCount >= totalCards) {
              // Se já estamos na última carta, o clique avança imediatamente para o grid de 9 cards
              enterGridMode();
            } else {
              // Passa suavemente para a próxima carta; quando chegar na última (Mítica/Lendária),
              // o finishCycle dispara a animação oficial da Matriz antes de abrir o grid de 9 cards!
              stopVideoCinematic();
              revealedCount += 1;
              triggerCycleCard();
            }
          }
        }
      }

      isPointerDown = false;
      container.style.cursor = packState === 'sealed' || packState === 'carousel' ? 'grab' : 'pointer';
    };

    const onWheel = (e: WheelEvent) => {
      if (packState === 'carousel') {
        e.preventDefault();
        resetInspectRotation();
        const dir = e.deltaY > 0 ? -1 : 1;
        targetCarouselAngle = Math.round(targetCarouselAngle / stepAngle + dir) * stepAngle;
        updateCarouselHintText();
        playCardSlideSound();
      } else if (packState === 'sealed') {
        e.preventDefault();
        targetZoom += e.deltaY * 0.006;
        targetZoom = Math.max(5.0, Math.min(15.0, targetZoom));
      }
    };

    container.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    container.addEventListener('wheel', onWheel, { passive: false });

    const onResize = () => {
      if (!container) return;
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || window.innerHeight;
      if (!w || !h) return;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', onResize);

    const updateFloppyTopStrip = (cutP: number, timeSec: number) => {
      const topPosAttr = topFrontGeo.attributes.position as THREE.BufferAttribute;
      const topBackPosAttr = topBackGeo.attributes.position as THREE.BufferAttribute;
      const cutX = -PW / 2 + cutP * PW;

      if (cutP >= 0.999) {
        flopProgress = Math.min(1.0, flopProgress + 0.035);
      }
      const flopP = flopProgress;

      for (let j = 0; j <= topSegY; j++) {
        const vRatio = j / topSegY;

        for (let i = 0; i <= topSegX; i++) {
          const vertIdx = j * (topSegX + 1) + i;
          const posOffset = vertIdx * 3;

          const baseX = baseTopFrontPositions[posOffset];
          const baseY = baseTopFrontPositions[posOffset + 1];
          const baseZ = baseTopFrontPositions[posOffset + 2];
          const baseBackZ = baseTopBackPositions[posOffset + 2];

          if (cutP <= 0.001) {
            topPosAttr.setXYZ(vertIdx, baseX, baseY, baseZ);
            topBackPosAttr.setXYZ(vertIdx, baseX, baseY, baseBackZ);
          } else {
            const isTorn = baseX <= cutX;
            const distFromCut = Math.max(0, cutX - baseX);
            const peelAmount = Math.min(1.0, distFromCut / 1.35) * cutP;

            if (isTorn) {
              const wavePhase = timeSec * 6.5 + i * 0.45;
              const floppyWaveZ = Math.sin(wavePhase) * 0.055 * peelAmount * (1 - vRatio * 0.5);
              const floppyWaveY = Math.cos(wavePhase * 0.8) * 0.035 * peelAmount;

              const curlZ = -peelAmount * (0.35 + 0.25 * (1 - vRatio));
              const liftY = peelAmount * 0.22 * (1 - vRatio) - 0.04 * peelAmount;

              const flutterDrop = -flopP * (flopP * 3.2);
              const flutterDriftZ = flopP * 0.6;
              const flutterSwayX = flopP * (Math.sin(timeSec * 4 + i * 0.2) * 0.25 + 0.45);
              const finalWave = Math.sin(timeSec * 4 + i * 0.3) * 0.04 * flopP;

              topPosAttr.setXYZ(
                vertIdx,
                baseX + flutterSwayX,
                baseY + liftY + floppyWaveY + flutterDrop,
                baseZ + curlZ + floppyWaveZ + flutterDriftZ + finalWave
              );

              topBackPosAttr.setXYZ(
                vertIdx,
                baseX + flutterSwayX,
                baseY + liftY + floppyWaveY + flutterDrop,
                baseBackZ + curlZ + floppyWaveZ + flutterDriftZ + finalWave
              );
            } else {
              topPosAttr.setXYZ(vertIdx, baseX, baseY, baseZ);
              topBackPosAttr.setXYZ(vertIdx, baseX, baseY, baseBackZ);
            }
          }
        }
      }

      if (flopP >= 0.95) {
        topStripGroup.visible = false;
      } else {
        topStripGroup.visible = true;
      }

      topPosAttr.needsUpdate = true;
      topBackPosAttr.needsUpdate = true;
      topFrontGeo.computeVertexNormals();
      topBackGeo.computeVertexNormals();

      if (cutP > 0.02 && cutP < 0.999) {
        tearCutMesh.visible = true;
        sparkMesh.visible = true;

        const posAttr = tearCutGeo.attributes.position as THREE.BufferAttribute;
        const totalSegments = Math.min(maxTearSegments, Math.max(2, Math.floor(cutP * maxTearSegments)));

        for (let s = 0; s <= maxTearSegments; s++) {
          const ratio = Math.min(1, s / totalSegments);
          const currentX = -PW / 2 + ratio * cutP * PW;
          const jagY = Math.sin(s * 7.5) * 0.015;
          const zFront = getPillowZ(currentX, Y_CUT, true);

          posAttr.setXYZ(s * 2, currentX, Y_CUT + 0.018 + jagY, zFront + 0.005);
          posAttr.setXYZ(s * 2 + 1, currentX, Y_CUT - 0.018 - jagY, zFront + 0.002);
        }

        posAttr.needsUpdate = true;
        tearCutGeo.computeVertexNormals();

        const sparkZ = getPillowZ(cutX, Y_CUT, true) + 0.03;
        sparkMesh.position.set(cutX, Y_CUT, sparkZ);
      } else {
        tearCutMesh.visible = false;
        sparkMesh.visible = false;
      }
    };

    const projVecTL = new THREE.Vector3();
    const projVecBR = new THREE.Vector3();

    let reqId: number;
    let lastTime = performance.now();

    const animate = (time: number) => {
      reqId = requestAnimationFrame(animate);

      const dt = Math.min((time - lastTime) / 1000, 0.1);
      lastTime = time;
      const timeSec = time * 0.001;

      // --- Atualização da Ciranda / Carrossel 3D de 12 Boosters ---
      if (ENABLE_BOOSTER_CAROUSEL) {
        carouselAngle += (targetCarouselAngle - carouselAngle) * Math.min(dt * 9, 1);
        carouselTransition += (targetCarouselTransition - carouselTransition) * Math.min(dt * 6.5, 1);
        inspectRotX += (targetInspectRotX - inspectRotX) * Math.min(dt * 10, 1);
        inspectRotY += (targetInspectRotY - inspectRotY) * Math.min(dt * 10, 1);

        carouselWheelGroup.rotation.y = carouselAngle;
        // Quando um pacote é escolhido, os outros 11 pacotes recuam suavemente para trás
        carouselRootGroup.position.z = -CAROUSEL_RADIUS - carouselTransition * 4.5;

        if (carouselTransition < 0.995) {
          carouselRootGroup.visible = true;
          const frontSlotIdx = getActiveFrontSlotIndex();

          carouselSlotGroups.forEach((slotGrp, idx) => {
            if (idx === chosenCarouselSlotIdx) {
              slotGrp.visible = false;
              return;
            }
            const { theta, packHolder } = (slotGrp as any).userData;
            const relAngle = theta + carouselAngle;
            const cosA = Math.cos(relAngle);
            const frontFactor = THREE.MathUtils.clamp((cosA + 1) / 2, 0, 1);

            if (idx === frontSlotIdx && packState === 'carousel') {
              // O pacote enquadrado pode ser rotacionado em 3D pelo usuário antes de escolher!
              packHolder.rotation.x = inspectRotX;
              packHolder.rotation.y = inspectRotY;
              packHolder.position.y = 0;
            } else {
              // Os demais 11 pacotes mantêm suas faces viradas radialmente para fora da roda
              packHolder.rotation.x = 0.04 + Math.sin(timeSec * 2.0 + idx) * 0.018;
              packHolder.rotation.y = 0;
              packHolder.position.y = Math.sin(timeSec * 2.2 + idx * 0.7) * 0.05 * (1 - frontFactor);
            }

            // No centro frontal (frontFactor = 1), baseScale = 1.0 (idêntico ao worldGroup para transição sem corte seco!)
            const baseScale = THREE.MathUtils.lerp(0.58, 1.0, Math.pow(frontFactor, 1.65));
            const fadeOutScale = baseScale * (1 - carouselTransition * 0.95);
            slotGrp.scale.setScalar(Math.max(0.001, fadeOutScale));
          });
        } else {
          carouselRootGroup.visible = false;
        }
      }

      // Converge suavemente a posição e escala do worldGroup para (0,0,0) e 1.0 após sair da ciranda
      if (packState !== 'carousel') {
        worldGroup.position.lerp(new THREE.Vector3(0, 0, 0), Math.min(dt * 8, 1));
        const nextScale = THREE.MathUtils.lerp(worldGroup.scale.x, 1.0, Math.min(dt * 8, 1));
        worldGroup.scale.setScalar(nextScale);
      }

      const cutSpeed = isCuttingStroke ? 14 : 7;
      cutProgress += (targetCutProgress - cutProgress) * Math.min(dt * cutSpeed, 1);
      const cutP = cutProgress;

      const leapSpeed = 5.5;
      cardsLeapProgress += (targetCardsLeapProgress - cardsLeapProgress) * Math.min(dt * leapSpeed, 1);
      const leapP = cardsLeapProgress;

      const flipSpeed = 6.5;
      cardsFlipProgress += (targetCardsFlipProgress - cardsFlipProgress) * Math.min(dt * flipSpeed, 1);
      const flipP = cardsFlipProgress;

      // Dispara o efeito cromado assim que a primeira carta virar de frente se for mítica/lendária
      if (!initialFlipRevealed && isCardsFlipped && flipP >= 0.88 && !isGridMode) {
        initialFlipRevealed = true;
        const firstIdx = cardOrder[0];
        const firstMesh = cardMeshes[firstIdx];
        if (firstMesh) {
          const weight = (firstMesh as any).userData?.rarityWeight ?? 0;
          const rarity = (firstMesh as any).userData?.rarity;
          if (weight >= 4 || rarity === 'legendary') {
            triggerMatrixRarityAnimation(firstIdx);
          }
        }
      }

      updateFloppyTopStrip(cutP, timeSec);

      const openTipPeek = THREE.MathUtils.clamp((cutP - 0.3) / 0.7, 0, 1);
      const tuckedY = -0.45;
      const peekedY = 0.58;
      const currentPocketY = THREE.MathUtils.lerp(tuckedY, peekedY, openTipPeek);

      const targetLeapY = 0.15;
      const targetLeapZ = 1.85;

      const cardFinalY = THREE.MathUtils.lerp(currentPocketY, targetLeapY, leapP);
      let cardFinalZ = THREE.MathUtils.lerp(0.01, targetLeapZ, leapP);

      const baseLeapRotY = THREE.MathUtils.lerp(0, Math.PI, leapP);
      let cardFinalRotY = baseLeapRotY - flipP * Math.PI;
      let cardFinalRotX = 0;
      let cardFinalRotZ = 0;

      cardsData.forEach((c) => {
        if (c.update) c.update(timeSec);
      });

      // --- Contagem regressiva após a animação da Matriz na última carta para abrir o Grid de 9 Cartas ---
      if (pendingGridTimer > 0 && !isGridMode) {
        pendingGridTimer -= dt;
        if (pendingGridTimer <= 0) {
          enterGridMode();
        }
      }

      const gridSpeed = 4.2;
      gridProgress += ((isGridMode ? 1.0 : 0.0) - gridProgress) * Math.min(dt * gridSpeed, 1);
      const gridP = gridProgress;

      if (cardCycleState.isCycling) {
        cardCycleState.progress += dt / 0.36;
        const cp = Math.min(1.0, cardCycleState.progress);
        const slidingIdx = cardCycleState.slidingMeshIdx;
        const startOrder = cardCycleState.startOrder;
        const slidingMesh = cardMeshes[slidingIdx];
        const count = cardMeshes.length;

        for (let k = 1; k < count; k++) {
          const mesh = cardMeshes[startOrder[k]];
          if (mesh) {
            const fromZ = getSlotZ(k, count);
            const toZ = getSlotZ(k - 1, count);
            mesh.position.set(0, 0, THREE.MathUtils.lerp(fromZ, toZ, cp));
            mesh.rotation.set(0, 0, 0);
          }
        }

        if (slidingMesh) {
          if (cp < 0.48) {
            const p1 = cp / 0.48;
            const ease1 = Math.sin((p1 * Math.PI) / 2);
            slidingMesh.position.x = ease1 * 1.6;
            slidingMesh.position.y = Math.sin(p1 * Math.PI) * 0.12;
            slidingMesh.position.z = getSlotZ(0, count) + 0.012;
            slidingMesh.rotation.z = -ease1 * 0.12;
          } else if (cp < 0.54) {
            const pMid = (cp - 0.48) / 0.06;
            slidingMesh.position.x = 1.6;
            slidingMesh.position.y = 0.06 * (1 - pMid);
            slidingMesh.position.z = THREE.MathUtils.lerp(
              getSlotZ(0, count) + 0.012,
              getSlotZ(count - 1, count) - 0.008,
              pMid
            );
            slidingMesh.rotation.z = -0.12 * (1 - pMid);
          } else {
            const p2 = (cp - 0.54) / 0.46;
            const ease2 = 1.0 - Math.sin((p2 * Math.PI) / 2);
            slidingMesh.position.x = ease2 * 1.6;
            slidingMesh.position.y = 0;
            slidingMesh.position.z = getSlotZ(count - 1, count);
            slidingMesh.rotation.z = -ease2 * 0.06;
          }
        }

        if (cp >= 1.0) {
          finishCycle();
        }
      }

      // Grid 9 Cards
      const count = cardMeshes.length;
      const aspect = camera.aspect;
      const isLandscape = aspect >= 1.25;
      const usePanoramic = isLandscape && count === 9;

      const gapX = usePanoramic ? 0.32 : 0.22;
      const gapY = usePanoramic ? 0.32 : 0.22;
      const stepX = CW + gapX;
      const stepY = CH + gapY;

      const getGridPos = (idx: number) => {
        if (usePanoramic && count === 9) {
          if (idx < 5) {
            return { gx: (idx - 2) * stepX, gy: stepY * 0.52 };
          } else {
            return { gx: (idx - 5 - 1.5) * stepX, gy: -stepY * 0.52 };
          }
        } else {
          const cols = 3;
          const col = idx % cols;
          const row = Math.floor(idx / cols);
          const totalRows = Math.ceil(count / cols);
          return { gx: (col - 1) * stepX, gy: ((totalRows - 1) / 2 - row) * stepY };
        }
      };

      let minX = Infinity, maxX = -Infinity;
      let minY = Infinity, maxY = -Infinity;
      for (let k = 0; k < count; k++) {
        const { gx, gy } = getGridPos(k);
        minX = Math.min(minX, gx - CW / 2);
        maxX = Math.max(maxX, gx + CW / 2);
        minY = Math.min(minY, gy - CH / 2);
        maxY = Math.max(maxY, gy + CH / 2);
      }
      const gridTotalW = maxX - minX;
      const gridTotalH = maxY - minY;
      const gridCenterY = (minY + maxY) / 2;

      const vFOV = (camera.fov * Math.PI) / 180;
      const tanHalfFOV = Math.tan(vFOV / 2);
      const targetOccupancyH = 0.86;
      const targetOccupancyW = 0.90;
      const distH = (gridTotalH / targetOccupancyH) / (2 * tanHalfFOV);
      const distW = (gridTotalW / targetOccupancyW) / (2 * tanHalfFOV * camera.aspect);
      const targetGridCameraZ = Math.max(distH, distW);
      const targetGridCenterY = -gridCenterY + 0.35;

      if (gridP > 0.001) {
        for (let i = 0; i < count; i++) {
          const mesh = cardMeshes[i];
          if (!mesh) continue;
          if (videoCinematic.active && videoCinematic.meshIdx === i) continue;

          const { gx, gy } = getGridPos(i);
          const gz = 0;

          const slotIdx = cardOrder.indexOf(i);
          const sx = 0;
          const sy = 0;
          const sz = getSlotZ(slotIdx >= 0 ? slotIdx : i, count);

          if (!cardCycleState.isCycling) {
            mesh.position.x = THREE.MathUtils.lerp(sx, gx, gridP);
            mesh.position.y = THREE.MathUtils.lerp(sy, gy, gridP);
            mesh.position.z = THREE.MathUtils.lerp(sz, gz, gridP);
            mesh.rotation.x = THREE.MathUtils.lerp(mesh.rotation.x, 0, gridP);
            mesh.rotation.y = THREE.MathUtils.lerp(mesh.rotation.y, 0, gridP);
            mesh.rotation.z = THREE.MathUtils.lerp(mesh.rotation.z, 0, gridP);

            if (!videoCinematic.active || videoCinematic.meshIdx !== i) {
              mesh.scale.set(1, 1, 1);
            }

            const cardRarity = (mesh as any).userData?.rarity;
            if (cardRarity === 'legendary') {
              mesh.position.z += Math.sin(time * 0.003) * 0.12 * gridP;
            } else if (cardRarity === 'rare') {
              mesh.position.z += Math.sin(time * 0.003 + i) * 0.06 * gridP;
            }
          }
        }
      }

      // Video Expansion
      if (videoCinematic.active) {
        videoCinematic.timer += dt;
        const vTimer = videoCinematic.timer;
        const mesh = cardMeshes[videoCinematic.meshIdx];

        if (mesh) {
          const targetLocalZ = isGridMode ? 3.5 : 2.0;
          const worldCardZ = THREE.MathUtils.lerp(cardFinalZ, 0, gridP) + targetLocalZ;
          const distToCamera = Math.max(0.5, camera.position.z - worldCardZ);
          const vFOVAngle = (camera.fov * Math.PI) / 180;
          const visibleH = 2 * distToCamera * Math.tan(vFOVAngle / 2);
          const visibleW = visibleH * camera.aspect;

          const maxW = visibleW * 0.80;
          const maxH = visibleH * 0.80;
          const targetScale = Math.min(maxW / CW, maxH / CH);

          const startP = videoCinematic.startPos;
          const startR = videoCinematic.startRot;
          const startS = 1.0;

          if (vTimer < 0.35) {
            const p1 = vTimer / 0.35;
            const easeIn = 1 - Math.pow(1 - p1, 3);
            mesh.position.set(
              THREE.MathUtils.lerp(startP.x, 0, easeIn),
              THREE.MathUtils.lerp(startP.y, 0, easeIn),
              THREE.MathUtils.lerp(startP.z, targetLocalZ, easeIn)
            );
            mesh.scale.setScalar(THREE.MathUtils.lerp(startS, targetScale, easeIn));
            mesh.rotation.set(
              THREE.MathUtils.lerp(startR.x, 0, easeIn),
              THREE.MathUtils.lerp(startR.y, 0, easeIn),
              THREE.MathUtils.lerp(startR.z, 0, easeIn)
            );
          } else if (vTimer < 2.35) {
            mesh.position.set(
              Math.sin(vTimer * 2.5) * 0.02,
              Math.cos(vTimer * 2.0) * 0.02,
              targetLocalZ
            );
            mesh.scale.setScalar(targetScale);
            mesh.rotation.set(
              Math.sin(vTimer * 3.0) * 0.02,
              Math.cos(vTimer * 2.5) * 0.03,
              Math.sin(vTimer * 4.0) * 0.01
            );

          } else if (vTimer < 2.70) {
            const p3 = (vTimer - 2.35) / 0.35;
            const easeRet = Math.sin((p3 * Math.PI) / 2);
            mesh.position.set(
              THREE.MathUtils.lerp(0, startP.x, easeRet),
              THREE.MathUtils.lerp(0, startP.y, easeRet),
              THREE.MathUtils.lerp(targetLocalZ, startP.z, easeRet)
            );
            mesh.scale.setScalar(THREE.MathUtils.lerp(targetScale, 1.0, easeRet));
            mesh.rotation.set(
              THREE.MathUtils.lerp(0, startR.x, easeRet),
              THREE.MathUtils.lerp(0, startR.y, easeRet),
              THREE.MathUtils.lerp(0, startR.z, easeRet)
            );
          } else {
            stopVideoCinematic();
          }
        }
      }

      // ── Brilho Holográfico (Foil Sheen) 100% Confinado à geometria da carta ──
      if (shimmerTimer > 0) {
        shimmerTimer = Math.max(0, shimmerTimer - dt);
        const sProg = 1.0 - shimmerTimer / 1.35;
        const sAlpha = Math.sin(sProg * Math.PI);

        cardMeshes.forEach((g: any, idx) => {
          const sheen = g.userData?.sheenMesh;
          if (sheen) {
            if (idx === shimmerMeshIdx && idx !== activeMatrixOverlayMeshIdx) {
              sheen.visible = true;
              sheen.material.opacity = sAlpha * 0.90;
              if (sheen.material.map) {
                sheen.material.map.offset.x = (sProg - 0.5) * 1.6;
              }
            } else {
              sheen.visible = false;
              sheen.material.opacity = 0;
            }
          }
        });
      } else {
        cardMeshes.forEach((g: any) => {
          const sheen = g.userData?.sheenMesh;
          if (sheen) {
            sheen.visible = false;
            sheen.material.opacity = 0;
          }
        });
      }

      // ── Fading do themeGlow e balanceamento de iluminação no modo grid ──
      if (this.themeGlow) {
        this.themeGlow.style.opacity = String(Math.max(0, 1.0 - gridP * 2.5));
      }

      if (gridP > 0.001) {
        frontStudioLight.intensity = THREE.MathUtils.lerp(1.35, 0.35, gridP);
        keyLight.intensity = THREE.MathUtils.lerp(1.25, 0.35, gridP);
        ambientLight.intensity = THREE.MathUtils.lerp(1.75, 1.25, gridP);
      } else {
        frontStudioLight.intensity = 1.35;
        keyLight.intensity = 1.25;
        ambientLight.intensity = 1.75;
      }

      const effectiveCardY = THREE.MathUtils.lerp(cardFinalY, targetGridCenterY, gridP);
      const effectiveCardZ = THREE.MathUtils.lerp(cardFinalZ, 0, gridP);
      cardsMasterGroup.position.set(0, effectiveCardY, effectiveCardZ);
      cardsMasterGroup.rotation.set(cardFinalRotX, cardFinalRotY, cardFinalRotZ);
      cardsMasterGroup.visible = cutP > 0.05 || leapP > 0.001 || isCardsLeapt || isGridMode;

      const shouldHidePouch = packState === 'carousel' || isCardsLeapt || leapP > 0.05 || isGridMode || gridP > 0.01;
      if (shouldHidePouch) {
        lowerPouchGroup.visible = false;
        topStripGroup.visible = false;
        tearGuideMesh.visible = false;
      } else {
        worldGroup.visible = true;
        lowerPouchGroup.position.set(0, 0, 0);
        lowerPouchGroup.scale.setScalar(1);
        lowerPouchGroup.visible = true;

        if (packState === 'sealed' && cutP < 0.05) {
          tearGuideMesh.visible = true;
          tearGuideTex.offset.x -= dt * 0.85;
          const pulse = Math.sin(time * 0.005) * 0.25;
          tearGuideMat.opacity = THREE.MathUtils.clamp(0.75 + pulse, 0.45, 1.0);
        } else {
          tearGuideMesh.visible = false;
        }
      }

      // Transição suave da cápsula de quantidade
      if (this.qtyCapsule) {
        const showQty = (packState === 'carousel' || (packState === 'sealed' && cutP < 0.05)) && !isCardsLeapt && !isGridMode;
        this.qtyCapsule.style.opacity = showQty ? '1' : '0';
        this.qtyCapsule.style.transform = showQty
          ? 'translateX(-50%) translateY(0)'
          : 'translateX(-50%) translateY(-10px)';
      }

      const effectiveTargetZoom = THREE.MathUtils.lerp(targetZoom, targetGridCameraZ, gridP);
      currentZoom += (effectiveTargetZoom - currentZoom) * Math.min(dt * 8, 1);
      camera.position.z = currentZoom;

      if (gridP > 0.001 || isCardsLeapt) {
        targetRotX *= (1 - Math.max(gridP, leapP) * Math.min(dt * 6, 1));
        targetRotY *= (1 - Math.max(gridP, leapP) * Math.min(dt * 6, 1));
      }

      rotX += (targetRotX - rotX) * Math.min(dt * 8, 1);
      rotY += (targetRotY - rotY) * Math.min(dt * 8, 1);
      worldGroup.rotation.x = rotX;
      worldGroup.rotation.y = rotY;

      renderer.render(scene, camera);

      // ── Sincronização 1:1 da Animação Oficial da Matriz (SVG animateChroma=true) na Carta Revelada ──
      if (activeMatrixOverlayMeshIdx >= 0 && !isGridMode) {
        const targetMesh = cardMeshes[activeMatrixOverlayMeshIdx];
        if (targetMesh && targetMesh.visible && cardsMasterGroup.visible) {
          targetMesh.updateWorldMatrix(true, false);
          projVecTL.set(-CW / 2, CH / 2, 0).applyMatrix4(targetMesh.matrixWorld).project(camera);
          projVecBR.set(CW / 2, -CH / 2, 0).applyMatrix4(targetMesh.matrixWorld).project(camera);

          const viewW = container.clientWidth || window.innerWidth;
          const viewH = container.clientHeight || window.innerHeight;
          const x1 = (projVecTL.x * 0.5 + 0.5) * viewW;
          const y1 = (-projVecTL.y * 0.5 + 0.5) * viewH;
          const x2 = (projVecBR.x * 0.5 + 0.5) * viewW;
          const y2 = (-projVecBR.y * 0.5 + 0.5) * viewH;

          const boxW = Math.abs(x2 - x1);
          const boxH = Math.abs(y2 - y1);
          const left = Math.min(x1, x2);
          const top = Math.min(y1, y2);

          const currentRotYNorm = ((cardFinalRotY % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
          const isFacingCamera = currentRotYNorm < 0.35 * Math.PI || currentRotYNorm > 1.65 * Math.PI;

          if (isFacingCamera && boxW > 20 && boxH > 20) {
            matrixRarityOverlay.style.display = 'block';
            matrixRarityOverlay.style.left = `${left}px`;
            matrixRarityOverlay.style.top = `${top}px`;
            matrixRarityOverlay.style.width = `${boxW}px`;
            matrixRarityOverlay.style.height = `${boxH}px`;
          } else {
            matrixRarityOverlay.style.display = 'none';
          }
        } else {
          hideMatrixRarityAnimation();
        }
      } else if (isGridMode || activeMatrixOverlayMeshIdx < 0) {
        if (matrixRarityOverlay.style.display !== 'none') {
          matrixRarityOverlay.style.display = 'none';
          matrixRarityOverlay.innerHTML = '';
        }
      }
    };

    reqId = requestAnimationFrame(animate);

    this.cleanupFn = () => {
      cancelAnimationFrame(reqId);
      hideMatrixRarityAnimation();
      window.removeEventListener('resize', onResize);
      container.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      container.removeEventListener('wheel', onWheel);

      renderer.dispose();
      foilFrontTex.dispose();
      foilBackTex.dispose();
      cardBackTex.dispose();
      foilSheenTex.dispose();
      tearGuideTex.dispose();
      guideGeo.dispose();
      tearGuideMat.dispose();
      carouselPackFrontGeo.dispose();
      carouselPackBackGeo.dispose();
      carouselLeftSeamGeo.dispose();
      carouselRightSeamGeo.dispose();

      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }

  public destroy() {
    if (this.cleanupFn) {
      this.cleanupFn();
      this.cleanupFn = null;
    }
    if (this.overlay && this.overlay.parentElement) {
      this.overlay.parentElement.removeChild(this.overlay);
    }
    if (this.options.onClose) {
      this.options.onClose();
    }
  }
}
