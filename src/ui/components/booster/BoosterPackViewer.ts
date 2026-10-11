import * as THREE from 'three';
import {
  createBoosterFoilFrontTexture,
  createBoosterFoilBackTexture,
  createPokemonCardBackTexture,
  createSparkleSpriteTexture,
  createHoloLightBeamTexture,
  createBoosterNineCards,
  PackCardData,
} from './pokemonTextures';
import {
  playFoilTearSound,
  playCardSlideSound,
  playDynamicFoilScrape,
  playHoloShimmerSound,
  playSparkleBurstSound,
} from './pokemonAudio';
import { getGlobalCardBack } from '../../../core/constants';

export interface BoosterPackViewerOptions {
  theme?: 'charizard' | 'pikachu' | 'rayquaza' | 'mewtwo' | string;
  customBack?: 'silver' | 'gold' | 'black';
  customFrontUrl?: string;
  customFrontTexture?: THREE.Texture;
  customBackUrl?: string;
  customBackTexture?: THREE.Texture;
  customTitle?: string;
  customCardsList?: PackCardData[];
  cards?: PackCardData[];
  onComplete?: (cards: PackCardData[]) => void;
  onClose?: () => void;
}

export class BoosterPackViewer {
  private overlay: HTMLElement;
  private container: HTMLElement;
  private options: BoosterPackViewerOptions;
  private cleanupFn: (() => void) | null = null;

  constructor(options: BoosterPackViewerOptions = {}) {
    this.options = options;

    // Overlay em tela cheia com fundo limpo (branco puro igual ao original)
    this.overlay = document.createElement('div');
    this.overlay.className = 'booster-modal-overlay';
    this.overlay.style.cssText = `
      position: fixed; inset: 0; width: 100vw; height: 100vh; z-index: 9999999;
      background: #ffffff;
      overflow: hidden; touch-action: none; user-select: none; font-family: 'Outfit', sans-serif;
    `;

    // Botão de fechar elegante no canto superior direito
    const closeBtn = document.createElement('button');
    closeBtn.innerHTML = '✕';
    closeBtn.title = 'Fechar';
    closeBtn.style.cssText = `
      position: absolute; top: 18px; right: 20px; z-index: 1000;
      width: 38px; height: 38px; border-radius: 50%;
      background: rgba(0, 0, 0, 0.08); border: 1px solid rgba(0, 0, 0, 0.15);
      color: #333333; font-size: 1.1rem; font-weight: 700;
      cursor: pointer; display: flex; align-items: center; justify-content: center;
      transition: background 0.2s, transform 0.15s;
    `;
    closeBtn.onmouseenter = () => { closeBtn.style.background = 'rgba(0, 0, 0, 0.15)'; };
    closeBtn.onmouseleave = () => { closeBtn.style.background = 'rgba(0, 0, 0, 0.08)'; };
    closeBtn.onclick = () => this.destroy();
    this.overlay.appendChild(closeBtn);

    // Contêiner WebGL 3D
    this.container = document.createElement('div');
    this.container.style.cssText = `
      position: absolute; inset: 0; width: 100vw; height: 100vh; overflow: hidden; touch-action: none;
    `;
    this.overlay.appendChild(this.container);

    document.body.appendChild(this.overlay);

    // Inicia a cena 3D idêntica ao original
    this.initThreeScene();
  }

  private initThreeScene() {
    const container = this.container;
    const width = window.innerWidth || container.clientWidth || 800;
    const height = window.innerHeight || container.clientHeight || 600;

    // --- Scene, Camera & Renderer ---
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#ffffff'); // PURE WHITE BACKGROUND

    const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 100);
    // Diminui um pouco o tamanho do booster (distância 12.4 ao invés de 10.8)
    camera.position.set(0, 0, 12.4);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = false;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    container.appendChild(renderer.domElement);

    // --- Studio Lighting calibrated for Crisp White Setting ---
    const ambientLight = new THREE.AmbientLight('#ffffff', 0.85);
    scene.add(ambientLight);

    const hemiLight = new THREE.HemisphereLight('#ffffff', '#cbd5e1', 0.85);
    hemiLight.position.set(0, 10, 0);
    scene.add(hemiLight);

    const frontStudioLight = new THREE.DirectionalLight('#ffffff', 0.70);
    frontStudioLight.position.set(0, 1.2, 8.5);
    scene.add(frontStudioLight);

    const keyLight = new THREE.DirectionalLight('#fffcf8', 1.15);
    keyLight.position.set(4.5, 8.5, 6.5);
    scene.add(keyLight);

    const softFillLight = new THREE.DirectionalLight('#f0f4f8', 0.50);
    softFillLight.position.set(-6, 3, 5);
    scene.add(softFillLight);

    const rimLight = new THREE.DirectionalLight('#e2e8f0', 0.35);
    rimLight.position.set(0, -6, 4);
    scene.add(rimLight);

    // --- Textures & Materials ---
    const validTheme = (['charizard', 'pikachu', 'rayquaza', 'mewtwo'].includes(this.options.theme as any)
      ? this.options.theme
      : 'charizard') as 'charizard' | 'pikachu' | 'rayquaza' | 'mewtwo';

    let foilFrontTex: THREE.Texture = this.options.customFrontTexture || createBoosterFoilFrontTexture(validTheme);
    let foilBackTex: THREE.Texture = this.options.customBackTexture || createBoosterFoilBackTexture((this.options.customBack as any) || 'silver');
    const cardBackTex = createPokemonCardBackTexture();

    const defaultNine = createBoosterNineCards();
    let initialCards = defaultNine;
    if (this.options.cards && this.options.cards.length > 0) {
      if (this.options.cards[0].texture) {
        initialCards = this.options.cards;
      } else {
        initialCards = this.options.cards.map((c, i) => {
          const fallback = defaultNine[i % defaultNine.length];
          return {
            ...fallback,
            name: c.name || fallback.name,
            rarity: (c.rarity as any) || fallback.rarity,
            texture: fallback.texture
          };
        });
      }
    }

    const cardsData = [...initialCards];

    const foilFrontMat = new THREE.MeshStandardMaterial({
      map: foilFrontTex,
      metalness: 0.88,
      roughness: 0.26,
      side: THREE.DoubleSide,
    });

    const foilBackMat = new THREE.MeshStandardMaterial({
      map: foilBackTex,
      metalness: 0.92,
      roughness: 0.30,
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

    // Carrega verso global das cartas do jogo
    const globalBackUrl = getGlobalCardBack();
    if (globalBackUrl) {
      texLoader.load(globalBackUrl, (loadedBack) => {
        loadedBack.colorSpace = THREE.SRGBColorSpace;
        loadedBack.needsUpdate = true;
        cardBackMat.map = loadedBack;
        cardBackMat.needsUpdate = true;
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

    // --- 4. Cards Rig ---
    const cardsMasterGroup = new THREE.Group();
    worldGroup.add(cardsMasterGroup);

    const CW = 2.28;
    const CH = 3.82;
    const CARD_CORNER_RADIUS = 0.088;

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

    // --- 5. Holographic Light Beam & Radiant Aura ---
    const auraGeo = new THREE.PlaneGeometry(CW * 1.45, CH * 1.45);
    const auraCanvas = document.createElement('canvas');
    auraCanvas.width = 256;
    auraCanvas.height = 256;
    const aCtx = auraCanvas.getContext('2d')!;
    const aGlow = aCtx.createRadialGradient(128, 128, 0, 128, 128, 120);
    aGlow.addColorStop(0, 'rgba(255, 240, 180, 0.85)');
    aGlow.addColorStop(0.35, 'rgba(255, 100, 200, 0.55)');
    aGlow.addColorStop(0.7, 'rgba(0, 230, 255, 0.3)');
    aGlow.addColorStop(1, 'rgba(255, 255, 255, 0)');
    aCtx.fillStyle = aGlow;
    aCtx.fillRect(0, 0, 256, 256);
    const auraTex = new THREE.CanvasTexture(auraCanvas);
    const auraMat = new THREE.MeshBasicMaterial({
      map: auraTex,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const auraMesh = new THREE.Mesh(auraGeo, auraMat);
    auraMesh.position.set(0, 0, -MAX_STACK_DEPTH / 2 - 0.02);
    cardsMasterGroup.add(auraMesh);

    const beamTex = createHoloLightBeamTexture();

    const beamGeo = new THREE.PlaneGeometry(1.65, CH * 2.3);
    const beamMat = new THREE.MeshBasicMaterial({
      map: beamTex,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const holoBeamMesh = new THREE.Mesh(beamGeo, beamMat);
    holoBeamMesh.rotation.z = -0.62;
    holoBeamMesh.position.set(0, 0, (MAX_STACK_DEPTH / 2) + 0.012);
    cardsMasterGroup.add(holoBeamMesh);

    const diffGeo = new THREE.PlaneGeometry(3.3, CH * 2.3);
    const diffMat = new THREE.MeshBasicMaterial({
      map: beamTex,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const diffuseBeamMesh = new THREE.Mesh(diffGeo, diffMat);
    diffuseBeamMesh.rotation.z = -0.62;
    diffuseBeamMesh.position.set(0, 0, (MAX_STACK_DEPTH / 2) + 0.010);
    cardsMasterGroup.add(diffuseBeamMesh);

    // --- 6. Particles ---
    const maxSparkles = 280;
    const sparkleGeo = new THREE.BufferGeometry();
    const sparklePositions = new Float32Array(maxSparkles * 3);
    const sparkleColors = new Float32Array(maxSparkles * 3);
    const sparkleVelocities = new Float32Array(maxSparkles * 3);
    const sparkleLives = new Float32Array(maxSparkles);

    const sparklePalette = [
      new THREE.Color('#ffffff'),
      new THREE.Color('#ffd700'),
      new THREE.Color('#00f5d4'),
      new THREE.Color('#ff00aa'),
      new THREE.Color('#fff275'),
      new THREE.Color('#e0aaff'),
    ];

    for (let i = 0; i < maxSparkles; i++) {
      sparklePositions[i * 3] = 0;
      sparklePositions[i * 3 + 1] = 0;
      sparklePositions[i * 3 + 2] = -999;
      sparkleLives[i] = 0;

      const col = sparklePalette[i % sparklePalette.length];
      sparkleColors[i * 3] = col.r;
      sparkleColors[i * 3 + 1] = col.g;
      sparkleColors[i * 3 + 2] = col.b;
    }

    sparkleGeo.setAttribute('position', new THREE.BufferAttribute(sparklePositions, 3));
    sparkleGeo.setAttribute('color', new THREE.BufferAttribute(sparkleColors, 3));

    const sparkleSprite = createSparkleSpriteTexture();
    const sparkleMat = new THREE.PointsMaterial({
      size: 0.36,
      map: sparkleSprite,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      vertexColors: true,
      opacity: 0.0,
    });

    const sparklePoints = new THREE.Points(sparkleGeo, sparkleMat);
    worldGroup.add(sparklePoints);

    let sparkleTimer = 0;

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
      holoBeamMesh.visible = false;
      diffuseBeamMesh.visible = false;
      beamMat.opacity = 0;
      diffMat.opacity = 0;
      auraMesh.visible = false;
      auraMat.opacity = 0;
    };

    const triggerVideoCinematic = (meshIdx: number) => {
      const mesh = cardMeshes[meshIdx];
      if (!mesh) return;
      if (videoCinematic.active && videoCinematic.meshIdx !== meshIdx) {
        stopVideoCinematic();
      }
      videoCinematic.active = true;
      videoCinematic.meshIdx = meshIdx;
      videoCinematic.timer = 0;
      videoCinematic.startPos.copy(mesh.position);
      videoCinematic.startRot.copy(mesh.rotation);
      videoCinematic.startScale = 1.0;
      mesh.scale.set(1, 1, 1);
      sparkleTimer = 2.4;
      playHoloShimmerSound();
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
        if (newTopMesh && (newTopMesh as any).userData?.isVideo && !isGridMode) {
          triggerVideoCinematic(newTopIdx);
        }
      }
    };

    const triggerCycleCard = () => {
      if (videoCinematic.active) {
        stopVideoCinematic();
      }
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
      while (cardsStackGroup.children.length > 0) {
        cardsStackGroup.remove(cardsStackGroup.children[0]);
      }
      cardMeshes = [];
      cardOrder.length = 0;
      cardCycleState.isCycling = false;
      videoCinematic.active = false;

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

        const frontMat = new THREE.MeshStandardMaterial({
          map: frontTex,
          roughness: 0.28,
          metalness: 0.08,
          side: THREE.FrontSide,
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

        (cardGroup as any).userData = {
          cardData: cardItem,
          isVideo: isVideoCard,
          rarity: cardItem.rarity,
          meshIndex: idx,
        };

        cardGroup.position.set(0, 0, getSlotZ(idx, count));
        cardsStackGroup.add(cardGroup);
        cardMeshes.push(cardGroup);
        cardOrder.push(idx);
      });
    };

    rebuildCardMeshes(cardsData);

    const triggerSparkleFx = () => {
      sparkleTimer = 2.0;
      playSparkleBurstSound();

      for (let i = 0; i < maxSparkles; i++) {
        const x = (Math.random() - 0.5) * CW * 0.95;
        const y = (Math.random() - 0.5) * CH * 0.95;
        const z = 1.95 + (Math.random() - 0.5) * 0.1;

        sparklePositions[i * 3] = x;
        sparklePositions[i * 3 + 1] = y;
        sparklePositions[i * 3 + 2] = z;

        const angle = Math.random() * Math.PI * 2;
        const speed = 1.2 + Math.random() * 2.8;
        sparkleVelocities[i * 3] = Math.cos(angle) * speed;
        sparkleVelocities[i * 3 + 1] = Math.sin(angle) * speed + 0.6;
        sparkleVelocities[i * 3 + 2] = 1.0 + Math.random() * 2.8;

        sparkleLives[i] = 1.0;
      }

      (sparkleGeo.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    };

    // State Variables
    let packState: 'sealed' | 'cutting' | 'opened' = 'sealed';
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

    // Pointer Interaction
    let isPointerDown = false;
    let isCuttingStroke = false;
    let pointerStartX = 0;
    let pointerStartY = 0;
    let lastTraceX = 0;
    let hasMoved = false;

    let rotX = 0.12;
    let rotY = 0.0;
    let targetRotX = rotX;
    let targetRotY = rotY;

    // Zoom inicial ajustado para que o booster fique ligeiramente menor
    let targetZoom = 12.4;
    let currentZoom = 12.4;

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
      packState = 'sealed';
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
      bottomGridBar.style.display = 'none';
    };

    // Barra de Ação no Modo Grid (idêntica ao projeto original)
    const bottomGridBar = document.createElement('div');
    bottomGridBar.style.cssText = `
      position: absolute; bottom: 24px; left: 50%; transform: translateX(-50%);
      display: none; align-items: center; gap: 8px; padding: 6px 10px;
      background: rgba(255, 255, 255, 0.95); backdrop-filter: blur(12px);
      border: 1px solid rgba(0, 0, 0, 0.12); border-radius: 999px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.12); z-index: 100;
    `;

    const btnOpenAnother = document.createElement('button');
    btnOpenAnother.innerHTML = `✨ Abrir outro pack`;
    btnOpenAnother.style.cssText = `
      display: flex; align-items: center; gap: 6px; padding: 8px 18px;
      background: #171717; color: #ffffff; border: none; border-radius: 999px;
      font-size: 0.78rem; font-weight: 600; cursor: pointer; transition: all 0.2s;
    `;
    btnOpenAnother.onclick = () => resetToSealed();

    const btnCollect = document.createElement('button');
    btnCollect.innerHTML = `Concluir & Coletar`;
    btnCollect.style.cssText = `
      display: flex; align-items: center; gap: 6px; padding: 8px 18px;
      background: #2563eb; color: #ffffff; border: none; border-radius: 999px;
      font-size: 0.78rem; font-weight: 600; cursor: pointer; transition: all 0.2s;
    `;
    btnCollect.onclick = () => {
      if (this.options.onComplete) {
        this.options.onComplete(cardsData);
      }
      this.destroy();
    };

    bottomGridBar.appendChild(btnOpenAnother);
    bottomGridBar.appendChild(btnCollect);
    this.overlay.appendChild(bottomGridBar);

    const onPointerDown = (e: PointerEvent) => {
      isPointerDown = true;
      pointerStartX = e.clientX;
      pointerStartY = e.clientY;
      hasMoved = false;

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
          }, 320);
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
          }, 320);
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
            playHoloShimmerSound();
            triggerSparkleFx();

            const firstTopIdx = cardOrder[0];
            const firstMesh = cardMeshes[firstTopIdx];
            if (firstMesh && (firstMesh as any).userData?.isVideo) {
              setTimeout(() => {
                triggerVideoCinematic(firstTopIdx);
              }, 450);
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
                if ((clickedMesh as any)?.userData?.isVideo) {
                  triggerVideoCinematic(clickedIdx);
                } else {
                  playSparkleBurstSound();
                  triggerSparkleFx();
                }
              }
            }
          } else {
            const totalCards = cardMeshes.length;
            if (revealedCount >= totalCards) {
              stopVideoCinematic();
              isGridMode = true;
              bottomGridBar.style.display = 'flex';
              playHoloShimmerSound();
              playSparkleBurstSound();
              triggerSparkleFx();
            } else {
              stopVideoCinematic();
              revealedCount += 1;
              triggerCycleCard();

              if (revealedCount >= totalCards) {
                playSparkleBurstSound();
                triggerSparkleFx();
              }
            }
          }
        }
      }

      isPointerDown = false;
      container.style.cursor = packState === 'sealed' ? 'grab' : 'pointer';
    };

    const onWheel = (e: WheelEvent) => {
      if (packState === 'sealed') {
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

    let reqId: number;
    let lastTime = performance.now();

    const animate = (time: number) => {
      reqId = requestAnimationFrame(animate);

      const dt = Math.min((time - lastTime) / 1000, 0.1);
      lastTime = time;

      const cutSpeed = isCuttingStroke ? 14 : 7;
      cutProgress += (targetCutProgress - cutProgress) * Math.min(dt * cutSpeed, 1);
      const cutP = cutProgress;

      const leapSpeed = 5.5;
      cardsLeapProgress += (targetCardsLeapProgress - cardsLeapProgress) * Math.min(dt * leapSpeed, 1);
      const leapP = cardsLeapProgress;

      const flipSpeed = 6.5;
      cardsFlipProgress += (targetCardsFlipProgress - cardsFlipProgress) * Math.min(dt * flipSpeed, 1);
      const flipP = cardsFlipProgress;

      updateFloppyTopStrip(cutP, time * 0.001);

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
        if (c.update) c.update(time * 0.001);
      });

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

            holoBeamMesh.visible = true;
            diffuseBeamMesh.visible = true;
            const beamSweep = Math.sin((vTimer - 0.35) * 4.5);
            holoBeamMesh.position.set(beamSweep * CW * 1.3, 0, targetLocalZ + 0.02);
            diffuseBeamMesh.position.set(beamSweep * CW * 1.3, 0, targetLocalZ + 0.02);
            beamMat.opacity = 0.98;
            diffMat.opacity = 0.85;

            auraMesh.visible = true;
            auraMesh.position.set(0, 0, targetLocalZ - 0.08);
            auraMesh.scale.setScalar(targetScale * 1.35 + Math.sin(vTimer * 5) * 0.2);
            auraMat.opacity = 0.95;
            sparkleMat.opacity = 0.98;
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

      // Sparkles & Beam
      if (sparkleTimer > 0 && !videoCinematic.active) {
        sparkleTimer = Math.max(0, sparkleTimer - dt);
        const sTime = sparkleTimer;
        const sProgress = 1.0 - sTime / 2.0;

        const sweepProgress = Math.min(1.0, sProgress / 0.42);
        if (sProgress < 0.48) {
          holoBeamMesh.visible = true;
          diffuseBeamMesh.visible = true;
          const beamX = -CW * 1.9 + sweepProgress * CW * 3.8;
          holoBeamMesh.position.x = beamX;
          diffuseBeamMesh.position.x = beamX;
          const beamAlpha = Math.sin(sweepProgress * Math.PI);
          beamMat.opacity = beamAlpha * 0.98;
          diffMat.opacity = beamAlpha * 0.75;
        } else {
          holoBeamMesh.visible = false;
          diffuseBeamMesh.visible = false;
          beamMat.opacity = 0;
          diffMat.opacity = 0;
        }

        auraMesh.visible = true;
        auraMat.opacity = Math.sin(sProgress * Math.PI) * 0.85;
        auraMesh.scale.setScalar(1.0 + Math.sin(sProgress * Math.PI) * 0.18);
        sparkleMat.opacity = Math.sin(sProgress * Math.PI) * 0.98;

        const posAttr = sparkleGeo.attributes.position as THREE.BufferAttribute;
        for (let i = 0; i < maxSparkles; i++) {
          if (sparkleLives[i] > 0) {
            sparklePositions[i * 3] += sparkleVelocities[i * 3] * dt;
            sparklePositions[i * 3 + 1] += sparkleVelocities[i * 3 + 1] * dt + 0.18 * dt;
            sparklePositions[i * 3 + 2] += sparkleVelocities[i * 3 + 2] * dt;

            sparkleVelocities[i * 3] *= 0.96;
            sparkleVelocities[i * 3 + 1] *= 0.96;
            sparkleVelocities[i * 3 + 2] *= 0.96;
          }
        }
        posAttr.needsUpdate = true;

        if (gridP < 0.1) {
          const cardPop = Math.sin(sProgress * Math.PI) * 0.45;
          cardFinalZ += cardPop;
          cardFinalRotX = Math.sin(sProgress * Math.PI * 2) * 0.12;
          cardFinalRotZ = Math.cos(sProgress * Math.PI * 2) * 0.06;
          cardFinalRotY += Math.sin(sProgress * Math.PI * 2) * 0.05;
        }
      } else if (!videoCinematic.active) {
        holoBeamMesh.visible = false;
        diffuseBeamMesh.visible = false;
        beamMat.opacity = 0.0;
        diffMat.opacity = 0.0;
        auraMesh.visible = false;
        auraMat.opacity = 0.0;
        sparkleMat.opacity = 0.0;
      }

      const effectiveCardY = THREE.MathUtils.lerp(cardFinalY, targetGridCenterY, gridP);
      const effectiveCardZ = THREE.MathUtils.lerp(cardFinalZ, 0, gridP);
      cardsMasterGroup.position.set(0, effectiveCardY, effectiveCardZ);
      cardsMasterGroup.rotation.set(cardFinalRotX, cardFinalRotY, cardFinalRotZ);
      cardsMasterGroup.visible = cutP > 0.05 || leapP > 0.001 || isCardsLeapt || isGridMode;

      const shouldHidePouch = isCardsLeapt || leapP > 0.05 || isGridMode || gridP > 0.01;
      if (shouldHidePouch) {
        lowerPouchGroup.visible = false;
        topStripGroup.visible = false;
      } else {
        lowerPouchGroup.position.set(0, 0, 0);
        lowerPouchGroup.scale.setScalar(1);
        lowerPouchGroup.visible = true;
      }

      const effectiveTargetZoom = THREE.MathUtils.lerp(targetZoom, targetGridCameraZ, gridP);
      currentZoom += (effectiveTargetZoom - currentZoom) * Math.min(dt * 8, 1);
      camera.position.z = currentZoom;

      if (gridP > 0.001) {
        targetRotX *= (1 - gridP * Math.min(dt * 6, 1));
        targetRotY *= (1 - gridP * Math.min(dt * 6, 1));
      }

      rotX += (targetRotX - rotX) * Math.min(dt * 8, 1);
      rotY += (targetRotY - rotY) * Math.min(dt * 8, 1);
      worldGroup.rotation.x = rotX;
      worldGroup.rotation.y = rotY;

      renderer.render(scene, camera);
    };

    reqId = requestAnimationFrame(animate);

    this.cleanupFn = () => {
      cancelAnimationFrame(reqId);
      window.removeEventListener('resize', onResize);
      container.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      container.removeEventListener('wheel', onWheel);

      renderer.dispose();
      foilFrontTex.dispose();
      foilBackTex.dispose();
      cardBackTex.dispose();
      sparkleSprite.dispose();
      auraTex.dispose();
      beamTex.dispose();

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
