import React, { useEffect, useRef } from 'react';
import { ShowcaseVfxType } from '../types/vfx';

interface ShowcaseVfxCanvasProps {
  vfxType: ShowcaseVfxType;
  intensity: number; // 10 to 100
  active: boolean;
  strokeColor?: string;
}

interface FrostBranch {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  thickness: number;
  startTime: number; // 0 to 1.4s
  duration: number;
  alpha: number;
  hasNeedles: boolean;
}

interface FrostFacet {
  points: { x: number; y: number }[];
  appearTime: number;
  alpha: number;
}

interface EmberParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  life: number;
  maxLife: number;
  hue: number;
  phase: number;
}

interface VenomCloud {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  alpha: number;
  hue: number;
  phase: number;
}

interface VenomBubble {
  x: number;
  y: number;
  vy: number;
  radius: number;
  maxRadius: number;
  wobblePhase: number;
  popping: boolean;
  popProgress: number;
}

interface MeltColumn {
  x: number;
  width: number;
  length: number;
  maxLength: number;
  speed: number;
  delay: number;
  hueOffset: number;
  bulgePhase: number;
}

interface SlashCut {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  angle: number;
  triggerTime: number;
  color: string;
}

interface SlashShard {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rot: number;
  vRot: number;
  size: number;
  alpha: number;
  color: string;
}

/**
 * Generates a realistic recursive hexagonal dendritic ice crystal network
 * starting from the corners and perimeter edges of the 680x990 card canvas.
 */
function buildProceduralFrostNetwork(): {
  branches: FrostBranch[];
  facets: FrostFacet[];
} {
  const branches: FrostBranch[] = [];
  const facets: FrostFacet[] = [];

  // Deterministic pseudo-random helper so frost looks intricate and organic
  let seed = 1337;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };

  const spawnDendrite = (
    x: number,
    y: number,
    angle: number,
    length: number,
    thickness: number,
    depth: number,
    startTime: number
  ) => {
    if (depth <= 0 || length < 8) return;

    const x2 = x + Math.cos(angle) * length;
    const y2 = y + Math.sin(angle) * length;
    const dur = 0.16 + rand() * 0.14;

    branches.push({
      x1: x,
      y1: y,
      x2,
      y2,
      thickness,
      startTime,
      duration: dur,
      alpha: Math.min(1, 0.35 + depth * 0.16),
      hasNeedles: depth >= 2,
    });

    // Create crystalline polygonal ice facets near roots
    if (depth >= 3 && rand() > 0.35) {
      const spread = length * 0.42;
      facets.push({
        points: [
          { x, y },
          {
            x: (x + x2) * 0.5 + Math.cos(angle + 1.05) * spread,
            y: (y + y2) * 0.5 + Math.sin(angle + 1.05) * spread,
          },
          { x: x2, y: y2 },
          {
            x: (x + x2) * 0.5 + Math.cos(angle - 1.05) * spread * 0.8,
            y: (y + y2) * 0.5 + Math.sin(angle - 1.05) * spread * 0.8,
          },
        ],
        appearTime: startTime + dur * 0.5,
        alpha: 0.14 + rand() * 0.14,
      });
    }

    // Continue main crystal stem with slight natural refraction bend
    spawnDendrite(
      x2,
      y2,
      angle + (rand() - 0.5) * 0.18,
      length * (0.76 + rand() * 0.1),
      thickness * 0.74,
      depth - 1,
      startTime + dur * 0.7
    );

    // 60-degree hexagonal crystallographic side branches (PI / 3 = 1.0472 rad)
    const hexAngle = 1.0472;
    for (const sign of [-1, 1]) {
      if (rand() > 0.15) {
        const midT = 0.45 + rand() * 0.35;
        const bx = x + (x2 - x) * midT;
        const by = y + (y2 - y) * midT;
        spawnDendrite(
          bx,
          by,
          angle + sign * (hexAngle + (rand() - 0.5) * 0.12),
          length * (0.58 + rand() * 0.14),
          thickness * 0.65,
          depth - 1,
          startTime + dur * midT
        );
      }
    }
  };

  // Nucleate major crystal roots from all 4 corners and mid-edges inward
  const origins = [
    { x: -10, y: -10, a: 0.85, len: 145 },
    { x: 690, y: -10, a: 2.28, len: 145 },
    { x: -10, y: 1000, a: -0.85, len: 150 },
    { x: 690, y: 1000, a: -2.28, len: 150 },
    { x: -8, y: 320, a: 0.15, len: 115 },
    { x: 688, y: 340, a: 2.98, len: 115 },
    { x: -8, y: 680, a: -0.18, len: 115 },
    { x: 688, y: 660, a: -2.95, len: 115 },
    { x: 220, y: -8, a: 1.45, len: 105 },
    { x: 460, y: -8, a: 1.68, len: 105 },
    { x: 230, y: 998, a: -1.48, len: 110 },
    { x: 450, y: 998, a: -1.65, len: 110 },
  ];

  origins.forEach((o, idx) => {
    spawnDendrite(o.x, o.y, o.a, o.len, 4.2, 5, (idx % 4) * 0.06);
  });

  return { branches, facets };
}

/**
 * Generates midpoint-displacement jagged lightning bolt segments between two coordinates.
 */
function buildLightningSegments(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  displace: number,
  depth: number
): { x1: number; y1: number; x2: number; y2: number; main: boolean }[] {
  if (depth === 0) {
    return [{ x1, y1, x2, y2, main: true }];
  }
  const midX = (x1 + x2) * 0.5 + (Math.random() - 0.5) * displace;
  const midY = (y1 + y2) * 0.5 + (Math.random() - 0.5) * displace;

  const left = buildLightningSegments(x1, y1, midX, midY, displace * 0.55, depth - 1);
  const right = buildLightningSegments(midX, midY, x2, y2, displace * 0.55, depth - 1);
  const res = [...left, ...right];

  // Occasional fork branch
  if (depth === 3 && Math.random() > 0.35) {
    const angle = Math.atan2(y2 - y1, x2 - x1) + (Math.random() > 0.5 ? 0.65 : -0.65);
    const forkLen = Math.hypot(x2 - x1, y2 - y1) * 0.48;
    const fx = midX + Math.cos(angle) * forkLen;
    const fy = midY + Math.sin(angle) * forkLen;
    const forkSegs = buildLightningSegments(midX, midY, fx, fy, displace * 0.4, 2).map(
      (s) => ({ ...s, main: false })
    );
    res.push(...forkSegs);
  }

  return res;
}

export const ShowcaseVfxCanvas: React.FC<ShowcaseVfxCanvasProps> = ({
  vfxType,
  intensity,
  active,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!active || vfxType === 'none') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = 680;
    const H = 990;
    const power = Math.max(0.2, Math.min(1.2, intensity / 85));

    let rafId: number;
    const startTime = performance.now();

    // Pre-initialize effect-specific data structures
    const frostData =
      vfxType === 'frost' ? buildProceduralFrostNetwork() : null;

    // Snow/Cryo motes for frost
    const cryoMotes = Array.from({ length: 65 }, (_, i) => ({
      x: (i * 97) % W,
      y: (i * 151) % H,
      vx: (Math.random() - 0.5) * 0.8,
      vy: 0.6 + Math.random() * 1.4,
      r: 1.2 + Math.random() * 2.8,
      alpha: 0.3 + Math.random() * 0.65,
    }));

    // Fire embers for hellfire
    const embers: EmberParticle[] = Array.from({ length: 90 }, () => ({
      x: Math.random() * W,
      y: H - Math.random() * 320,
      vx: (Math.random() - 0.5) * 2.4,
      vy: -(2.8 + Math.random() * 5.5),
      size: 1.5 + Math.random() * 4.2,
      life: Math.random(),
      maxLife: 0.65 + Math.random() * 0.65,
      hue: 12 + Math.random() * 38,
      phase: Math.random() * Math.PI * 2,
    }));

    // Venom miasma clouds & bubbles
    const venomClouds: VenomCloud[] = Array.from({ length: 28 }, (_, idx) => ({
      x: (idx % 4) * 210 + (Math.random() - 0.5) * 80,
      y: H - (idx / 28) * 580,
      vx: (Math.random() - 0.5) * 1.1,
      vy: -(0.35 + Math.random() * 0.65),
      radius: 95 + Math.random() * 115,
      alpha: 0.14 + Math.random() * 0.18,
      hue: 78 + (idx % 5) * 12,
      phase: Math.random() * Math.PI * 2,
    }));

    const venomBubbles: VenomBubble[] = Array.from({ length: 34 }, () => ({
      x: 30 + Math.random() * (W - 60),
      y: H - Math.random() * 380,
      vy: -(1.1 + Math.random() * 2.2),
      radius: 4 + Math.random() * 14,
      maxRadius: 14 + Math.random() * 16,
      wobblePhase: Math.random() * Math.PI * 2,
      popping: false,
      popProgress: 0,
    }));

    // Acid / Viscous Melt columns
    const meltColumns: MeltColumn[] = Array.from({ length: 26 }, (_, i) => {
      const colW = 28 + (i % 4) * 14;
      return {
        x: (i / 25) * (W + 20) - 10,
        width: colW,
        length: 15,
        maxLength: 260 + ((i * 137) % 620),
        speed: 115 + ((i * 73) % 165),
        delay: (i % 6) * 0.08,
        hueOffset: (i % 3) * 16,
        bulgePhase: i * 0.9,
      };
    });

    // Dimensional Katana Slashes
    const slashCuts: SlashCut[] = [
      {
        x1: -60,
        y1: 240,
        x2: 740,
        y2: 720,
        angle: Math.atan2(480, 800),
        triggerTime: 0.05,
        color: '#00F0FF',
      },
      {
        x1: 740,
        y1: 160,
        x2: -60,
        y2: 810,
        angle: Math.atan2(650, -800),
        triggerTime: 0.24,
        color: '#FF0055',
      },
      {
        x1: -40,
        y1: 620,
        x2: 720,
        y2: 310,
        angle: Math.atan2(-310, 760),
        triggerTime: 0.44,
        color: '#A855F7',
      },
      {
        x1: 190,
        y1: -50,
        x2: 520,
        y2: 1040,
        angle: Math.atan2(1090, 330),
        triggerTime: 0.62,
        color: '#00F0FF',
      },
      {
        x1: -60,
        y1: 485,
        x2: 740,
        y2: 515,
        angle: Math.atan2(30, 800),
        triggerTime: 0.82,
        color: '#FFE600',
      },
    ];

    const slashShards: SlashShard[] = Array.from({ length: 55 }, (_, i) => {
      const cut = slashCuts[i % slashCuts.length];
      const t = Math.random();
      const sx = cut.x1 + (cut.x2 - cut.x1) * t;
      const sy = cut.y1 + (cut.y2 - cut.y1) * t;
      return {
        x: sx,
        y: sy,
        vx: (Math.random() - 0.5) * 9,
        vy: (Math.random() - 0.5) * 9,
        rot: Math.random() * Math.PI * 2,
        vRot: (Math.random() - 0.5) * 0.18,
        size: 6 + Math.random() * 16,
        alpha: 0.9,
        color: cut.color,
      };
    });

    const renderFrame = (now: number) => {
      const elapsed = (now - startTime) / 1000;
      ctx.clearRect(0, 0, W, H);

      // ========================================================================
      // 1. PROCEDURAL DENDRITIC FROST & SUB-ZERO RIME
      // ========================================================================
      if (vfxType === 'frost' && frostData) {
        ctx.save();

        // Outer creeping sub-zero vignette glaze
        const frostGrow = Math.min(1, elapsed / 1.35);
        const radGrad = ctx.createRadialGradient(
          W * 0.5,
          H * 0.5,
          W * (0.48 - 0.14 * frostGrow * power),
          W * 0.5,
          H * 0.5,
          W * 0.82
        );
        radGrad.addColorStop(0, 'rgba(186, 230, 253, 0)');
        radGrad.addColorStop(0.55, `rgba(56, 189, 248, ${0.18 * frostGrow * power})`);
        radGrad.addColorStop(0.85, `rgba(186, 230, 253, ${0.46 * frostGrow * power})`);
        radGrad.addColorStop(1, `rgba(240, 249, 255, ${0.78 * frostGrow * power})`);
        ctx.fillStyle = radGrad;
        ctx.fillRect(0, 0, W, H);

        // Crystalline polygonal facets
        for (const facet of frostData.facets) {
          if (elapsed < facet.appearTime) continue;
          const fProg = Math.min(1, (elapsed - facet.appearTime) / 0.35);
          ctx.beginPath();
          ctx.moveTo(facet.points[0].x, facet.points[0].y);
          for (let i = 1; i < facet.points.length; i++) {
            ctx.lineTo(facet.points[i].x, facet.points[i].y);
          }
          ctx.closePath();
          ctx.fillStyle = `rgba(186, 230, 253, ${facet.alpha * fProg * power})`;
          ctx.fill();
          ctx.strokeStyle = `rgba(255, 255, 255, ${facet.alpha * 1.4 * fProg * power})`;
          ctx.lineWidth = 0.7;
          ctx.stroke();
        }

        // Recursive Dendritic Ice Branches with Specular Highlight
        ctx.lineCap = 'round';
        for (const b of frostData.branches) {
          if (elapsed < b.startTime) continue;
          const prog = Math.min(1, (elapsed - b.startTime) / b.duration);
          const curX = b.x1 + (b.x2 - b.x1) * prog;
          const curY = b.y1 + (b.y2 - b.y1) * prog;

          // Ice shadow/refraction base
          ctx.beginPath();
          ctx.moveTo(b.x1, b.y1);
          ctx.lineTo(curX, curY);
          ctx.strokeStyle = `rgba(56, 189, 248, ${b.alpha * 0.75 * power})`;
          ctx.lineWidth = b.thickness * 1.35 * power;
          ctx.stroke();

          // Crisp white crystalline core
          ctx.beginPath();
          ctx.moveTo(b.x1, b.y1);
          ctx.lineTo(curX, curY);
          ctx.strokeStyle = `rgba(240, 249, 255, ${Math.min(1, b.alpha * 1.15 * power)})`;
          ctx.lineWidth = b.thickness * 0.65 * power;
          ctx.stroke();

          // Micro fern-like frost needles along completed segments
          if (b.hasNeedles && prog > 0.5) {
            const mx = (b.x1 + curX) * 0.5;
            const my = (b.y1 + curY) * 0.5;
            const ang = Math.atan2(b.y2 - b.y1, b.x2 - b.x1);
            const nLen = b.thickness * 3.8 * prog;
            ctx.beginPath();
            ctx.moveTo(
              mx + Math.cos(ang + 1.047) * nLen,
              my + Math.sin(ang + 1.047) * nLen
            );
            ctx.lineTo(mx, my);
            ctx.lineTo(
              mx + Math.cos(ang - 1.047) * nLen,
              my + Math.sin(ang - 1.047) * nLen
            );
            ctx.strokeStyle = `rgba(224, 242, 254, ${b.alpha * 0.8 * power})`;
            ctx.lineWidth = 0.85;
            ctx.stroke();
          }
        }

        // Drifting Cryo-Mist & Shimmering Ice Motes
        for (const m of cryoMotes) {
          m.x += m.vx + Math.sin(elapsed * 2 + m.y * 0.02) * 0.35;
          m.y += m.vy;
          if (m.y > H + 10) m.y = -10;
          if (m.x < -10) m.x = W + 10;
          if (m.x > W + 10) m.x = -10;

          const twinkle = 0.5 + 0.5 * Math.sin(elapsed * 5 + m.x);
          ctx.beginPath();
          ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(224, 242, 254, ${m.alpha * twinkle * power})`;
          ctx.fill();
        }

        ctx.restore();
      }

      // ========================================================================
      // 2. VOLUMETRIC HELLFIRE PLUMES & CURL-NOISE EMBERS
      // ========================================================================
      else if (vfxType === 'hellfire') {
        ctx.save();
        ctx.globalCompositeOperation = 'screen';

        // 4 Thermal Wave Layers (Outer Crimson -> Fierce Orange -> Solar Gold -> White-Hot Core)
        const layers = [
          {
            baseHeight: 280 * power,
            amp: 58,
            freq: 0.012,
            speed: 5.5,
            colorTop: 'rgba(153, 27, 27, 0)',
            colorMid: `rgba(220, 38, 38, ${0.65 * power})`,
            colorBot: `rgba(127, 29, 29, ${0.9 * power})`,
          },
          {
            baseHeight: 215 * power,
            amp: 46,
            freq: 0.017,
            speed: 7.2,
            colorTop: 'rgba(234, 88, 12, 0)',
            colorMid: `rgba(249, 115, 22, ${0.8 * power})`,
            colorBot: `rgba(234, 88, 12, ${0.95 * power})`,
          },
          {
            baseHeight: 145 * power,
            amp: 34,
            freq: 0.024,
            speed: 9.4,
            colorTop: 'rgba(250, 204, 21, 0)',
            colorMid: `rgba(250, 204, 21, ${0.85 * power})`,
            colorBot: `rgba(251, 191, 36, ${0.95 * power})`,
          },
          {
            baseHeight: 82 * power,
            amp: 22,
            freq: 0.032,
            speed: 11.8,
            colorTop: 'rgba(255, 255, 255, 0)',
            colorMid: `rgba(254, 243, 199, ${0.9 * power})`,
            colorBot: `rgba(255, 255, 255, ${0.98 * power})`,
          },
        ];

        for (const layer of layers) {
          const grad = ctx.createLinearGradient(0, H - layer.baseHeight - 70, 0, H);
          grad.addColorStop(0, layer.colorTop);
          grad.addColorStop(0.45, layer.colorMid);
          grad.addColorStop(1, layer.colorBot);

          ctx.beginPath();
          ctx.moveTo(0, H);
          for (let x = 0; x <= W; x += 10) {
            // Side wall climb factor so flames lick up the left & right edges higher
            const edgeDist = Math.min(x, W - x) / (W * 0.5);
            const sideClimb = Math.pow(1 - edgeDist, 2.6) * 230 * power;

            const n1 = Math.sin(x * layer.freq + elapsed * layer.speed);
            const n2 = Math.cos(x * layer.freq * 1.8 - elapsed * layer.speed * 1.35);
            const n3 = Math.sin(x * layer.freq * 3.1 + elapsed * layer.speed * 1.9);
            const flameY =
              H -
              layer.baseHeight -
              sideClimb +
              (n1 * 0.5 + n2 * 0.35 + n3 * 0.15) * layer.amp;
            ctx.lineTo(x, flameY);
          }
          ctx.lineTo(W, H);
          ctx.closePath();
          ctx.fillStyle = grad;
          ctx.fill();
        }

        // Rising Glowing Ember Sparks with Curl-Noise Trajectories
        for (const e of embers) {
          e.phase += 0.08;
          e.x += e.vx + Math.sin(e.phase + elapsed * 3) * 1.8;
          e.y += e.vy;
          e.life += 0.016;

          if (e.life >= e.maxLife || e.y < -20) {
            e.x = Math.random() * W;
            e.y = H + 10;
            e.life = 0;
            e.maxLife = 0.6 + Math.random() * 0.7;
          }

          const lifeRatio = Math.max(0.05, 1 - e.life / e.maxLife);
          const tailX = e.x - e.vx * 2.2;
          const tailY = e.y - e.vy * 2.2;

          ctx.beginPath();
          ctx.moveTo(tailX, tailY);
          ctx.lineTo(e.x, e.y);
          ctx.strokeStyle = `hsla(${e.hue}, 100%, 65%, ${lifeRatio * power})`;
          ctx.lineWidth = Math.max(0.2, e.size * lifeRatio);
          ctx.lineCap = 'round';
          ctx.stroke();

          ctx.beginPath();
          ctx.arc(e.x, e.y, Math.max(0.1, e.size * 0.65 * lifeRatio), 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255, 250, 220, ${lifeRatio * power})`;
          ctx.fill();
        }

        ctx.restore();
      }

      // ========================================================================
      // 3. GASEOUS VENOM MIASMA & POPPING ACID BUBBLES
      // ========================================================================
      else if (vfxType === 'venom') {
        ctx.save();

        // Volumetric Rolling Toxic Gas Puffs
        for (const c of venomClouds) {
          c.x += c.vx + Math.sin(elapsed * 1.2 + c.phase) * 0.9;
          c.y += c.vy;
          if (c.y < -c.radius) {
            c.y = H + c.radius * 0.6;
            c.x = Math.random() * W;
          }

          const safeCloudRadius = Math.max(10, c.radius);
          const g = ctx.createRadialGradient(c.x, c.y, 4, c.x, c.y, safeCloudRadius);
          g.addColorStop(0, `hsla(${c.hue}, 95%, 46%, ${c.alpha * 1.45 * power})`);
          g.addColorStop(0.5, `hsla(${c.hue + 18}, 90%, 28%, ${c.alpha * 0.95 * power})`);
          g.addColorStop(1, 'rgba(6, 78, 59, 0)');
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(c.x, c.y, safeCloudRadius, 0, Math.PI * 2);
          ctx.fill();
        }

        // Glossy Acid Bubbles that swell and pop into toxic rings
        for (const b of venomBubbles) {
          if (!b.popping) {
            b.wobblePhase += 0.09;
            b.x += Math.sin(b.wobblePhase) * 1.2;
            b.y += b.vy;
            b.radius = Math.max(1, Math.min(b.maxRadius, b.radius + 0.06));

            if (b.y < 140 + Math.random() * 420 || b.radius >= b.maxRadius * 0.98) {
              b.popping = true;
              b.popProgress = 0;
            }

            // Bubble Rim & Toxic Subsurface Glow
            ctx.beginPath();
            ctx.arc(b.x, b.y, Math.max(0.5, b.radius), 0, Math.PI * 2);
            ctx.fillStyle = `rgba(132, 204, 22, ${0.18 * power})`;
            ctx.fill();
            ctx.lineWidth = 1.8;
            ctx.strokeStyle = `rgba(190, 242, 100, ${0.82 * power})`;
            ctx.stroke();

            // Specular highlight crescent on bubble
            ctx.beginPath();
            ctx.arc(
              b.x - b.radius * 0.32,
              b.y - b.radius * 0.32,
              Math.max(0.2, b.radius * 0.24),
              0,
              Math.PI * 2
            );
            ctx.fillStyle = `rgba(255, 255, 255, ${0.85 * power})`;
            ctx.fill();
          } else {
            b.popProgress = Math.min(1, b.popProgress + 0.08);
            const remain = Math.max(0, 1 - b.popProgress);
            const ringR = Math.max(0.5, b.radius * (1 + b.popProgress * 1.2));
            const alpha = remain * power;

            if (remain > 0.01) {
              ctx.beginPath();
              ctx.arc(b.x, b.y, ringR, 0, Math.PI * 2);
              ctx.strokeStyle = `rgba(163, 230, 53, ${alpha})`;
              ctx.lineWidth = Math.max(0.2, 2.2 * remain);
              ctx.stroke();

              // Micro droplets flying outward
              const dropRadius = Math.max(0.15, 2 * remain);
              for (let d = 0; d < 6; d++) {
                const ang = (d / 6) * Math.PI * 2 + b.wobblePhase;
                const dx = b.x + Math.cos(ang) * ringR * 1.15;
                const dy = b.y + Math.sin(ang) * ringR * 1.15;
                ctx.beginPath();
                ctx.arc(dx, dy, dropRadius, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(217, 249, 157, ${alpha})`;
                ctx.fill();
              }
            }

            if (b.popProgress >= 1) {
              b.popping = false;
              b.popProgress = 0;
              b.y = H + 20;
              b.x = 30 + Math.random() * (W - 60);
              b.radius = 4 + Math.random() * 8;
            }
          }
        }

        ctx.restore();
      }

      // ========================================================================
      // 4. VISCOUS ACID/PLASMA MELT DRIPS (With Meniscus Bulges & Specular Sheen)
      // ========================================================================
      else if (vfxType === 'acid-melt') {
        ctx.save();

        // Top reservoir wave
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(W, 0);
        ctx.lineTo(W, 38);
        for (let x = W; x >= 0; x -= 16) {
          const wy = 34 + Math.sin(x * 0.03 + elapsed * 3.5) * 10;
          ctx.lineTo(x, wy);
        }
        ctx.closePath();
        ctx.fillStyle = `rgba(88, 28, 135, ${0.88 * power})`;
        ctx.fill();

        // Individual Viscous Drip Streams
        for (const col of meltColumns) {
          const activeTime = Math.max(0, elapsed - col.delay);
          const curLen =
            30 +
            ((activeTime * col.speed) % col.maxLength) *
              (0.75 + 0.25 * Math.sin(elapsed + col.bulgePhase));

          const topX = col.x;
          const botY = curLen;
          const headRadius = col.width * 0.56;

          const dripGrad = ctx.createLinearGradient(topX, 0, topX, botY + headRadius);
          dripGrad.addColorStop(0, `hsla(${275 + col.hueOffset}, 90%, 26%, ${0.92 * power})`);
          dripGrad.addColorStop(0.65, `hsla(${288 + col.hueOffset}, 95%, 48%, ${0.88 * power})`);
          dripGrad.addColorStop(1, `hsla(${145 + col.hueOffset}, 95%, 58%, ${0.95 * power})`);

          // Viscous neck + bulbous meniscus droplet head
          ctx.beginPath();
          ctx.moveTo(topX - col.width * 0.5, 0);
          ctx.quadraticCurveTo(
            topX - col.width * 0.26,
            botY * 0.55,
            topX - headRadius * 0.85,
            botY
          );
          ctx.arc(topX, botY, headRadius, Math.PI, 0, true);
          ctx.quadraticCurveTo(
            topX + col.width * 0.26,
            botY * 0.55,
            topX + col.width * 0.5,
            0
          );
          ctx.closePath();
          ctx.fillStyle = dripGrad;
          ctx.fill();

          // Glossy wet highlight line along the drip
          ctx.beginPath();
          ctx.moveTo(topX - col.width * 0.18, 12);
          ctx.lineTo(topX - headRadius * 0.35, botY - 4);
          ctx.strokeStyle = `rgba(255, 255, 255, ${0.55 * power})`;
          ctx.lineWidth = 2.4;
          ctx.lineCap = 'round';
          ctx.stroke();

          // Specular bead on droplet tip
          ctx.beginPath();
          ctx.arc(
            topX - headRadius * 0.28,
            botY + headRadius * 0.25,
            headRadius * 0.22,
            0,
            Math.PI * 2
          );
          ctx.fillStyle = `rgba(255, 255, 255, ${0.85 * power})`;
          ctx.fill();
        }

        ctx.restore();
      }

      // ========================================================================
      // 5. DIMENSIONAL KATANA SLASHES (Screen-Slicing Blade Cuts & Reality Shards)
      // ========================================================================
      else if (vfxType === 'dimensional-slash') {
        ctx.save();
        const cycleTime = elapsed % 2.4;

        // Brief screen inversion impact flash when the final combo slash hits
        if (cycleTime > 0.82 && cycleTime < 0.96) {
          const flashAlpha = (1 - (cycleTime - 0.82) / 0.14) * 0.38 * power;
          ctx.fillStyle = `rgba(255, 255, 255, ${flashAlpha})`;
          ctx.fillRect(0, 0, W, H);
        }

        for (const cut of slashCuts) {
          if (cycleTime < cut.triggerTime) continue;
          const age = cycleTime - cut.triggerTime;
          if (age > 1.35) continue;

          const slashExtend = Math.min(1, age / 0.09);
          const fade = age < 0.25 ? 1 : Math.max(0, 1 - (age - 0.25) / 1.1);

          const curX2 = cut.x1 + (cut.x2 - cut.x1) * slashExtend;
          const curY2 = cut.y1 + (cut.y2 - cut.y1) * slashExtend;

          // Chromatic Aberration Twin Ghost Cuts (Cyan & Magenta offset)
          const nx = -Math.sin(cut.angle) * 6;
          const ny = Math.cos(cut.angle) * 6;

          ctx.beginPath();
          ctx.moveTo(cut.x1 + nx, cut.y1 + ny);
          ctx.lineTo(curX2 + nx, curY2 + ny);
          ctx.strokeStyle = `rgba(0, 240, 255, ${0.75 * fade * power})`;
          ctx.lineWidth = 8 * fade * power;
          ctx.stroke();

          ctx.beginPath();
          ctx.moveTo(cut.x1 - nx, cut.y1 - ny);
          ctx.lineTo(curX2 - nx, curY2 - ny);
          ctx.strokeStyle = `rgba(255, 0, 100, ${0.75 * fade * power})`;
          ctx.lineWidth = 8 * fade * power;
          ctx.stroke();

          // Dark dimensional void gap inside the cut
          ctx.beginPath();
          ctx.moveTo(cut.x1, cut.y1);
          ctx.lineTo(curX2, curY2);
          ctx.strokeStyle = `rgba(5, 5, 15, ${0.95 * fade})`;
          ctx.lineWidth = 14 * fade * power;
          ctx.stroke();

          // Blinding Razor-Sharp White-Hot Blade Core
          ctx.beginPath();
          ctx.moveTo(cut.x1, cut.y1);
          ctx.lineTo(curX2, curY2);
          ctx.strokeStyle = `rgba(255, 255, 255, ${fade})`;
          ctx.lineWidth = 4.5 * fade * power;
          ctx.stroke();

          // Cross-flare lens burst at midpoint of the slash
          if (age < 0.35) {
            const mx = (cut.x1 + cut.x2) * 0.5;
            const my = (cut.y1 + cut.y2) * 0.5;
            const flareLen = (1 - age / 0.35) * 95 * power;
            ctx.beginPath();
            ctx.moveTo(mx - flareLen, my);
            ctx.lineTo(mx + flareLen, my);
            ctx.moveTo(mx, my - flareLen);
            ctx.lineTo(mx, my + flareLen);
            ctx.strokeStyle = '#FFFFFF';
            ctx.lineWidth = 3;
            ctx.stroke();
          }
        }

        // Shattered Reality / Glass Shards Ejected from the Cuts
        for (const s of slashShards) {
          s.x += s.vx * 0.35;
          s.y += s.vy * 0.35;
          s.rot += s.vRot;

          if (cycleTime < 0.06) {
            // Reset shards at start of combo cycle
            const cut = slashCuts[Math.floor(Math.random() * slashCuts.length)];
            const t = Math.random();
            s.x = cut.x1 + (cut.x2 - cut.x1) * t;
            s.y = cut.y1 + (cut.y2 - cut.y1) * t;
          }

          ctx.save();
          ctx.translate(s.x, s.y);
          ctx.rotate(s.rot);
          ctx.beginPath();
          ctx.moveTo(0, -s.size);
          ctx.lineTo(s.size * 0.65, s.size * 0.5);
          ctx.lineTo(-s.size * 0.55, s.size * 0.35);
          ctx.closePath();
          ctx.fillStyle = `rgba(255, 255, 255, ${0.45 * power})`;
          ctx.fill();
          ctx.strokeStyle = s.color;
          ctx.lineWidth = 1.4;
          ctx.stroke();
          ctx.restore();
        }

        ctx.restore();
      }

      // ========================================================================
      // 6. ARCANE LIGHTNING STORM (Midpoint-Displacement Bolts)
      // ========================================================================
      else if (vfxType === 'arcane-storm') {
        ctx.save();
        ctx.globalCompositeOperation = 'screen';

        const origins = [
          { x1: 0, y1: 120, x2: 340, y2: 495 },
          { x1: 680, y1: 160, x2: 340, y2: 495 },
          { x1: 40, y1: 920, x2: 340, y2: 495 },
          { x1: 640, y1: 880, x2: 340, y2: 495 },
        ];

        origins.forEach((o, idx) => {
          // Flicker bolts organically
          if (Math.sin(elapsed * 22 + idx * 1.9) > -0.25) {
            const segs = buildLightningSegments(o.x1, o.y1, o.x2, o.y2, 75, 5);
            for (const seg of segs) {
              // Outer plasma aura
              ctx.beginPath();
              ctx.moveTo(seg.x1, seg.y1);
              ctx.lineTo(seg.x2, seg.y2);
              ctx.strokeStyle = seg.main
                ? `rgba(59, 130, 246, ${0.75 * power})`
                : `rgba(147, 51, 234, ${0.55 * power})`;
              ctx.lineWidth = seg.main ? 7 * power : 3.5 * power;
              ctx.lineCap = 'round';
              ctx.stroke();

              // White-hot electrical core
              ctx.beginPath();
              ctx.moveTo(seg.x1, seg.y1);
              ctx.lineTo(seg.x2, seg.y2);
              ctx.strokeStyle = `rgba(255, 255, 255, ${0.95 * power})`;
              ctx.lineWidth = seg.main ? 2.2 * power : 1 * power;
              ctx.stroke();
            }
          }
        });

        ctx.restore();
      }

      rafId = requestAnimationFrame(renderFrame);
    };

    rafId = requestAnimationFrame(renderFrame);
    return () => cancelAnimationFrame(rafId);
  }, [vfxType, intensity, active]);

  if (!active || vfxType === 'none') return null;

  return (
    <foreignObject
      x="0"
      y="0"
      width="680"
      height="990"
      style={{ pointerEvents: 'none' }}
    >
      <canvas
        ref={canvasRef}
        width={680}
        height={990}
        style={{
          width: '680px',
          height: '990px',
          display: 'block',
          pointerEvents: 'none',
        }}
      />
    </foreignObject>
  );
};
