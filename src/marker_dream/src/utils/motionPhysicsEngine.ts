import { MarkerMotionLayer } from '../types/map';

export type PhysicsMode =
  | 'hang'
  | 'follow_parent'
  | 'wing_flap'
  | 'tail_wag'
  | 'buzz'
  | 'spin'
  | 'orbit'
  | 'spring'
  | 'float'
  | 'close_up'
  | 'cloth'
  | 'flag'
  | 'breathe'
  | 'blink'
  | 'none';

export interface PhysicsState {
  angle: number; // Radianos de oscilação
  offsetX: number; // Deslocamento X inercial
  offsetY: number; // Deslocamento Y inercial
  scaleX: number; // Fator de escala X elástica
  scaleY: number; // Fator de escala Y elástica
}

export interface PivotPreset {
  id: string;
  label: string;
  x: number;
  y: number;
}

export const PIVOT_PRESETS: PivotPreset[] = [
  { id: 'top-center', label: 'Topo (Pendurado)', x: 0.5, y: 0.05 },
  { id: 'center', label: 'Centro (Giro Livre)', x: 0.5, y: 0.5 },
  { id: 'bottom-center', label: 'Base (Raiz/Chão)', x: 0.5, y: 0.95 },
  { id: 'top-left', label: 'Ombro Esquerdo', x: 0.1, y: 0.1 },
  { id: 'top-right', label: 'Ombro Direito', x: 0.9, y: 0.1 },
  { id: 'left-center', label: 'Lateral Esquerda', x: 0.05, y: 0.5 },
  { id: 'right-center', label: 'Lateral Direita', x: 0.95, y: 0.5 },
];

export const PHYSICS_MODES: { id: PhysicsMode; label: string; desc: string; icon?: string }[] = [
  {
    id: 'hang',
    label: 'Pendurado (Pêndulo)',
    desc: 'Balança fixado no pivô com inércia harmônica quando o corpo vibra',
    icon: '⚓',
  },
  {
    id: 'follow_parent',
    label: 'Seguir Corpo Pai',
    desc: 'Acompanha o ritmo e gelatina do corpo principal com delay orgânico',
    icon: '🔗',
  },
  {
    id: 'wing_flap',
    label: 'Bater de Asas (Wing Flap)',
    desc: 'Articulação de voo com batimento senoidal, envergadura 3D e defasagem de asas',
    icon: '🦇',
  },
  {
    id: 'tail_wag',
    label: 'Cauda / Tentáculo (Tail Wag)',
    desc: 'Ondulação suave em chicote contínuo para caudas, cobras e mechas',
    icon: '🦊',
  },
  {
    id: 'buzz',
    label: 'Vibração / Zumbido (Buzz)',
    desc: 'Vibração ultra-rápida no pivô para asas de insetos, zumbido e tremedeira',
    icon: '🐝',
  },
  {
    id: 'spin',
    label: 'Giro Contínuo (Hélice/Spin)',
    desc: 'Rotação 360° contínua com sentido horário ou anti-horário',
    icon: '⚙️',
  },
  {
    id: 'orbit',
    label: 'Órbita Flutuante (Orbit)',
    desc: 'Circula em órbita elíptica ao redor do ponto de fixação',
    icon: '🔮',
  },
  {
    id: 'spring',
    label: 'Mola Elástica',
    desc: 'Vibra e comprime/estica (Squash & Stretch) seguindo o ritmo',
    icon: '🌀',
  },
  {
    id: 'float',
    label: 'Flutuação Leve',
    desc: 'Levita suavemente em ondas independentes de ar/água',
    icon: '🫧',
  },
  {
    id: 'close_up',
    label: 'Dobra no Meio (Close Up)',
    desc: 'Dobra e fecha a imagem ao meio como livro, asa ou concha',
    icon: '📖',
  },
  {
    id: 'cloth',
    label: 'Tecido / Pano Macio',
    desc: 'Ondulação suave e caimento com peso elástico de tecido/manto',
    icon: '🧣',
  },
  {
    id: 'flag',
    label: 'Bandeira ao Vento',
    desc: 'Tremulação rápida de flâmula ou capa sob rajadas de vento com ângulo',
    icon: '🚩',
  },
  {
    id: 'breathe',
    label: 'Respiração / Pulso Vital',
    desc: 'Expansão e contração de volume rítmico para criaturas vivas',
    icon: '💓',
  },
  {
    id: 'blink',
    label: 'Piscar Olhos (Procedural)',
    desc: 'Piscada procedural para olhos PNG: pisca duplo rápido, esperas variáveis e pisca único',
    icon: '👁️',
  },
  {
    id: 'none',
    label: 'Fixo (Sem Física)',
    desc: 'Posição e rotação estáticas sem oscilação',
    icon: '🛑',
  },
];

/**
 * Calcula os parâmetros de animação física para uma camada com base no tempo e modo
 */
export function computeLayerPhysics(
  layer: MarkerMotionLayer,
  elapsed: number,
  parentHasJelly: boolean = false
): PhysicsState {
  const mode = layer.physicsMode || 'none';
  if (mode === 'none') {
    return { angle: 0, offsetX: 0, offsetY: 0, scaleX: 1, scaleY: 1 };
  }

  const speed = layer.speed ?? 1.0;
  const intensity = layer.intensity ?? 1.0;
  // Se o corpo pai tem gelatina ativa, o salto e inércia aumentam e injetam oscilação rítmica
  const parentBoost = parentHasJelly ? 1.4 : 1.0;
  // Frequência idêntica ao ciclo de 1.3s do .animate-jelly dos NPCs do mapa (~4.83 rad/s)
  const jellyFreq = (Math.PI * 2) / 1.3;
  const jellyImpulse = parentHasJelly ? Math.sin(elapsed * jellyFreq) * (0.22 * intensity) : 0;

  switch (mode) {
    case 'hang': {
      // Pêndulo harmônico com amortecimento, inércia no ponto pivô e resposta ao balanço do corpo pai
      const freq = speed * 3.4;
      const amp = intensity * 0.22 * parentBoost; // ~12° a 25°
      // Onda primária com pequena harmônica secundária + impulso do balanço do corpo pai
      const angle =
        Math.sin(elapsed * freq) * amp +
        Math.sin(elapsed * freq * 1.8 + 0.4) * (amp * 0.2) +
        jellyImpulse;
      const offsetY = Math.abs(Math.sin(elapsed * freq)) * 3 * intensity;
      return {
        angle,
        offsetX: Math.sin(angle) * 2,
        offsetY,
        scaleX: 1,
        scaleY: 1,
      };
    }

    case 'follow_parent': {
      // Segue com leve atraso de fase e rotação suave induzida pelo salto
      const freq = speed * 2.8;
      const angle =
        Math.sin(elapsed * freq - 0.5) * (0.16 * intensity * parentBoost) +
        jellyImpulse * 0.8;
      const offsetX = Math.cos(elapsed * freq) * (4 * intensity);
      const offsetY = Math.sin(elapsed * freq * 2) * (2 * intensity);
      return {
        angle,
        offsetX,
        offsetY,
        scaleX: 1,
        scaleY: 1,
      };
    }

    case 'spring': {
      // Squash & Stretch elástico
      const freq = speed * 4.5;
      const stretch = Math.sin(elapsed * freq) * (0.12 * intensity * parentBoost);
      return {
        angle: Math.sin(elapsed * freq * 0.5) * 0.05 * intensity,
        offsetX: 0,
        offsetY: -stretch * 8,
        scaleX: 1 - stretch * 0.6,
        scaleY: 1 + stretch,
      };
    }

    case 'float': {
      // Flutuação orgânica
      const freq = speed * 2.0;
      const offsetY = Math.sin(elapsed * freq) * (6 * intensity);
      const offsetX = Math.cos(elapsed * freq * 0.7) * (3 * intensity);
      const angle = Math.sin(elapsed * freq * 0.5) * (0.08 * intensity);
      return {
        angle,
        offsetX,
        offsetY,
        scaleX: 1,
        scaleY: 1,
      };
    }

    case 'close_up': {
      // Efeito Close Up (Dobra ao Meio): apenas dobra pura no eixo SEM rotação e SEM balanço
      const axis = layer.foldAxis || 'horizontal';
      const freq = speed * 2.8;
      // Ciclo de dobra pura [0, 1]
      const rawFold = Math.abs(Math.cos(elapsed * freq));
      // Intensidade controla a profundidade da dobra (de quase fechado até 1.0 totalmente aberto)
      const minScale = Math.max(0.01, 1 - 0.98 * Math.min(2.0, intensity));
      const foldFactor = minScale + (1 - minScale) * Math.pow(rawFold, 1.2);

      if (axis === 'vertical') {
        return {
          angle: 0, // Apenas dobra sem rotação
          offsetX: 0, // Sem balanço
          offsetY: 0,
          scaleX: 1,
          scaleY: foldFactor,
        };
      } else {
        return {
          angle: 0, // Apenas dobra sem rotação
          offsetX: 0, // Sem balanço
          offsetY: 0,
          scaleX: foldFactor,
          scaleY: 1,
        };
      }
    }

    case 'blink': {
      // Piscar Procedural para Olhos PNG:
      // Padrão orgânico procedural: double-blink rápido, pausas aleatórias e single-blink
      const axis = layer.foldAxis || 'vertical'; // Olhos fecham a pálpebra verticalmente por padrão
      const macroCycle = 5.8 / Math.max(0.2, speed);
      const t = elapsed % macroCycle;

      // Eventos de piscada procedural no ciclo de ~5.8s:
      // 1. Double blink: Pisca em t=1.15s (130ms), abre por 140ms, pisca de novo em t=1.42s (130ms)
      // 2. Pausa longa: ~2.0s de olhos abertos observando
      // 3. Single blink rápido: Pisca em t=3.6s (120ms)
      // 4. Pausa de ~1.3s
      // 5. Single blink sutil: Pisca em t=5.0s (120ms)

      let closeAmount = 0; // 0 = olho 100% aberto, 1 = pálpebra fechada

      if (t >= 1.15 && t < 1.28) {
        // Primeira piscada do double blink (130ms)
        const p = (t - 1.15) / 0.13;
        closeAmount = Math.sin(p * Math.PI);
      } else if (t >= 1.42 && t < 1.55) {
        // Segunda piscada rápida do double blink (130ms)
        const p = (t - 1.42) / 0.13;
        closeAmount = Math.sin(p * Math.PI);
      } else if (t >= 3.6 && t < 3.72) {
        // Piscada única rápida (120ms)
        const p = (t - 3.6) / 0.12;
        closeAmount = Math.sin(p * Math.PI);
      } else if (t >= 5.0 && t < 5.12) {
        // Piscada final rápida (120ms)
        const p = (t - 5.0) / 0.12;
        closeAmount = Math.sin(p * Math.PI);
      }

      // Intensidade modula a profundidade do fechamento (padrão fecha quase total: scale ~0.04)
      const clampedIntensity = Math.min(1.5, Math.max(0.2, intensity));
      const closedScale = Math.max(0.02, 1 - 0.96 * clampedIntensity * closeAmount);

      if (axis === 'horizontal') {
        return {
          angle: 0,
          offsetX: 0,
          offsetY: 0,
          scaleX: closedScale,
          scaleY: 1 + closeAmount * 0.05, // leve squash volumétrico
        };
      } else {
        return {
          angle: 0,
          offsetX: 0,
          offsetY: 0,
          scaleX: 1 + closeAmount * 0.05, // leve squash volumétrico horizontal
          scaleY: closedScale, // pálpebra fechando no Y
        };
      }
    }

    case 'cloth': {
      // Física de Tecido / Pano macio: ondulação harmônica e peso gravitacional
      const freq = speed * 2.4;
      const wave = Math.sin(elapsed * freq) * (0.16 * intensity * parentBoost);
      const heavyLag = Math.sin(elapsed * freq * 1.5 - 0.4) * (0.08 * intensity);
      const sag = Math.abs(Math.sin(elapsed * freq * 0.7)) * (3 * intensity);
      return {
        angle: wave + heavyLag,
        offsetX: Math.cos(elapsed * freq) * (2.5 * intensity),
        offsetY: sag,
        scaleX: 1 + wave * 0.2,
        scaleY: 1 - wave * 0.15,
      };
    }

    case 'flag': {
      // Bandeira ao Vento: tremulação rápida com rajadas de vento
      const freq = speed * 5.8;
      const flutter =
        (Math.sin(elapsed * freq) * 0.7 + Math.sin(elapsed * freq * 2.1 + 0.3) * 0.3) *
        (0.18 * intensity);
      const rippleX = Math.cos(elapsed * freq * 1.2) * (4 * intensity);
      const rippleY = Math.sin(elapsed * freq * 0.9) * (2 * intensity);
      return {
        angle: flutter,
        offsetX: rippleX,
        offsetY: rippleY,
        scaleX: 1 + Math.sin(elapsed * freq) * 0.12 * intensity,
        scaleY: 1 - Math.sin(elapsed * freq) * 0.06 * intensity,
      };
    }

    case 'breathe': {
      // Respiração / Pulso Vital: expansão e retração de volume biológico
      const freq = speed * 2.0;
      const pulse = Math.sin(elapsed * freq) * (0.09 * intensity * parentBoost);
      return {
        angle: Math.sin(elapsed * freq * 0.5) * 0.02 * intensity,
        offsetX: 0,
        offsetY: -pulse * 2,
        scaleX: 1 + pulse,
        scaleY: 1 + pulse * 1.3,
      };
    }

    case 'wing_flap': {
      // Bater de Asas: Articulação de voo com batimento senoidal, envergadura 3D e defasagem de asas
      const phaseRad = ((layer.wingPhaseOffset || 0) * Math.PI) / 180;
      const freq = speed * 4.6;
      const flapSine = Math.sin(elapsed * freq + phaseRad);
      // Rotação no pivô da asa (~30° de abertura) com espelhamento simétrico se linkada
      const mirrorMult = layer.syncWingMirror ? -1 : 1;
      const angle = flapSine * (0.52 * intensity) * mirrorMult;
      // Envergadura 3D: encolhimento de projeção na descida e subida da asa
      const foldSpan = 1 - Math.abs(flapSine) * (0.28 * intensity);
      const flapLift = Math.cos(elapsed * freq + phaseRad) * (4 * intensity);
      return {
        angle,
        offsetX: 0,
        offsetY: flapLift,
        scaleX: foldSpan,
        scaleY: 1 + Math.abs(flapSine) * (0.08 * intensity),
      };
    }

    case 'tail_wag': {
      // Cauda / Tentáculo: Balanço contínuo em chicote e onda suave
      const freq = speed * 3.6;
      const wave = Math.sin(elapsed * freq);
      const secondaryWave = Math.sin(elapsed * freq * 2.0 + 0.5) * 0.25;
      const angle = (wave + secondaryWave) * (0.38 * intensity * parentBoost);
      const offsetX = Math.cos(elapsed * freq) * (5 * intensity);
      const offsetY = Math.abs(wave) * (2 * intensity);
      return {
        angle,
        offsetX,
        offsetY,
        scaleX: 1 + Math.sin(elapsed * freq) * 0.05,
        scaleY: 1,
      };
    }

    case 'buzz': {
      // Vibração / Zumbido: Oscilação de alta frequência para asas de insetos, frio ou eletricidade
      const freq = speed * 32.0;
      const angle = Math.sin(elapsed * freq) * (0.12 * intensity);
      const jitterX = Math.sin(elapsed * freq * 1.3) * (2.4 * intensity);
      const jitterY = Math.cos(elapsed * freq * 0.9) * (2.4 * intensity);
      return {
        angle,
        offsetX: jitterX,
        offsetY: jitterY,
        scaleX: 1 + Math.sin(elapsed * freq * 2.0) * (0.04 * intensity),
        scaleY: 1 - Math.sin(elapsed * freq * 2.0) * (0.04 * intensity),
      };
    }

    case 'spin': {
      // Giro Contínuo: Rotação contínua 360° no pivô com sentido horário ou anti-horário
      const dir = layer.spinDirection === 'ccw' ? -1 : 1;
      const angle = (elapsed * speed * 4.2 * dir) % (Math.PI * 2);
      return {
        angle,
        offsetX: 0,
        offsetY: 0,
        scaleX: 1,
        scaleY: 1,
      };
    }

    case 'orbit': {
      // Órbita Flutuante: Circula em elipse de perspectiva ao redor do ponto de ancoragem
      const radius = layer.orbitRadius || 24;
      const freq = speed * 2.4;
      const ox = Math.cos(elapsed * freq) * (radius * intensity);
      const oy = Math.sin(elapsed * freq) * (radius * 0.65 * intensity);
      const bobAngle = Math.sin(elapsed * freq) * (0.08 * intensity);
      return {
        angle: bobAngle,
        offsetX: ox,
        offsetY: oy,
        scaleX: 1 + Math.sin(elapsed * freq) * 0.08,
        scaleY: 1 + Math.sin(elapsed * freq) * 0.08,
      };
    }

    default:
      return { angle: 0, offsetX: 0, offsetY: 0, scaleX: 1, scaleY: 1 };
  }
}

/**
 * Aplica a matriz de transformação completa no canvas 2D:
 * Deslocamento -> Ponto Pivô -> Rotação Manual + Física -> Espelhamento H/V -> Escala -> Retorno do Pivô
 */
export function applyLayerTransform(
  ctx: CanvasRenderingContext2D,
  layer: MarkerMotionLayer,
  width: number,
  height: number,
  physics: PhysicsState
) {
  const posX = (layer.x ?? 0) + physics.offsetX;
  const posY = (layer.y ?? 0) + physics.offsetY;

  const pivX = width * (layer.pivotX ?? 0.5);
  const pivY = height * (layer.pivotY ?? 0.5);

  const baseRotRad = ((layer.rotation ?? 0) * Math.PI) / 180;
  const totalAngle = baseRotRad + physics.angle;

  const baseScale = layer.scale ?? 1.0;
  const defX = layer.scaleX ?? 1.0;
  const defY = layer.scaleY ?? 1.0;
  const flipFactorX = layer.flipX ? -1 : 1;
  const flipFactorY = layer.flipY ? -1 : 1;

  const scaleX = baseScale * defX * flipFactorX * physics.scaleX;
  const scaleY = baseScale * defY * flipFactorY * physics.scaleY;

  // 1. Translada até a posição desejada da peça
  ctx.translate(posX, posY);

  // 2. Translada até o pivô da peça
  ctx.translate(pivX, pivY);

  // 3. Aplica rotação total
  ctx.rotate(totalAngle);

  // 4. Aplica escala e espelhamento
  ctx.scale(scaleX, scaleY);

  // 5. Retorna do pivô para que a origem do desenho (0, 0) fique correta
  ctx.translate(-pivX, -pivY);
}

/**
 * Calcula a deformação Squash & Stretch idêntica à classe CSS .animate-jelly (@keyframes jellyJiggleIdle)
 * Usada pelos NPCs no mapa do jogo (ciclo de 1.3s com pivô em 50% 100%).
 */
export function computeNpcJellyTransform(elapsed: number) {
  const duration = 1.3;
  // Progresso cíclico normalizado [0, 1)
  const normTime = (((elapsed % duration) + duration) % duration) / duration;

  // Interpolação suave entre os 4 quadrantes do @keyframes jellyJiggleIdle:
  // 0.00: scale(1.00, 1.00) rotate(0deg)
  // 0.25: scale(1.14, 0.88) rotate(-1.5deg)
  // 0.50: scale(0.90, 1.12) rotate(+1.5deg)
  // 0.75: scale(1.06, 0.95) rotate(-0.8deg)
  // 1.00: scale(1.00, 1.00) rotate(0deg)

  let p0: { sX: number; sY: number; rot: number };
  let p1: { sX: number; sY: number; rot: number };
  let t = 0;

  if (normTime < 0.25) {
    p0 = { sX: 1.0, sY: 1.0, rot: 0 };
    p1 = { sX: 1.14, sY: 0.88, rot: -1.5 };
    t = normTime / 0.25;
  } else if (normTime < 0.5) {
    p0 = { sX: 1.14, sY: 0.88, rot: -1.5 };
    p1 = { sX: 0.9, sY: 1.12, rot: 1.5 };
    t = (normTime - 0.25) / 0.25;
  } else if (normTime < 0.75) {
    p0 = { sX: 0.9, sY: 1.12, rot: 1.5 };
    p1 = { sX: 1.06, sY: 0.95, rot: -0.8 };
    t = (normTime - 0.5) / 0.25;
  } else {
    p0 = { sX: 1.06, sY: 0.95, rot: -0.8 };
    p1 = { sX: 1.0, sY: 1.0, rot: 0 };
    t = (normTime - 0.75) / 0.25;
  }

  // Curva cúbica suave (aproximação da curva cubic-bezier(0.4, 0, 0.2, 1))
  const ease = t * t * (3 - 2 * t);

  const scaleX = p0.sX + (p1.sX - p0.sX) * ease;
  const scaleY = p0.sY + (p1.sY - p0.sY) * ease;
  const rotationRad = ((p0.rot + (p1.rot - p0.rot) * ease) * Math.PI) / 180;

  return { scaleX, scaleY, rotationRad };
}
