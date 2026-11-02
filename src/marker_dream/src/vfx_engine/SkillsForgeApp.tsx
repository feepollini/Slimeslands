import './vfx_theme.css';
import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  AudioWaveform,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Code2,
  Crosshair,
  Eye,
  EyeOff,
  FolderOpen,
  LayoutGrid,
  Pause,
  Play,
  RotateCcw,
  Sliders,
  Sparkles,
  Volume2,
  VolumeX,
  X,
  Zap,
} from 'lucide-react';
import {
  ArenaBackgroundConfig,
  buildSkillLoadoutForTags,
  createCustomSlimeCharacter,
  ELEMENTAL_PALETTES,
  ElementalPaletteId,
  checkNpcClickInteraction,
  checkTreeChatPillClick,
  closePlayerTreeChat,
  getActiveTreeChatSessions,
  getSkillTacticalSpec,
  getSpellDossier,
  getVisualsForClassTags,
  interactPlayerTreeChat,
  selectPlayerTreeChatOption,
  ShaderParams,
  SlimeDirectionalSprites,
  SlimePersonality,
  triggerRandomTreeChatPair,
  VFX_PRESETS,
  VFX_TAGS,
  VfxEngine,
  VfxPresetId,
  VfxTag,
} from './vfx';
import { slimeVoiceEngine } from './vfx/modules/slimeVoiceModule';
import { ExportModal } from './components/ExportModal';
import { ArenaAndSlimeAssetsModal } from './components/ArenaAndSlimeAssetsModal';
import { VoiceValidatorSidebar } from './components/VoiceValidatorSidebar';
import { FishAudioApp } from './components/FishAudioModal';
import {
  loadFishAudioGallery,
  loadSavedFishApiKey,
  FISH_AUDIO_EXPRESSION_TAGS,
} from './extra_modules/FishAudioStudio';

const DEFAULT_SHADER_PARAMS: ShaderParams = {
  effectScale: 1.0,
  hitstopMs: 36,
  chromaticAberration: 2.0,
  erosionSharpness: 1.35,
  particleMultiplier: 1.0,
  bloomIntensity: 1.25,
  screenShakeIntensity: 0.0,
  timeScale: 1.0,
  enableSound: true,
};

export function SkillCreatorWorkspace({
  onBackToDashboard,
  onOpenFishAudio,
}: {
  onBackToDashboard: () => void;
  onOpenFishAudio: () => void;
}) {
  const [selectedPresetId, setSelectedPresetId] = useState<VfxPresetId>('cryo_sphere_aegis');
  const [selectedPaletteId, setSelectedPaletteId] = useState<ElementalPaletteId>('freljord_ice');
  const [activeTag, setActiveTag] = useState<'todos' | VfxTag>('todos');
  const [shaderParams, setShaderParams] = useState<ShaderParams>(DEFAULT_SHADER_PARAMS);
  const [simulationOn, setSimulationOn] = useState<boolean>(false);
  const [showTuning, setShowTuning] = useState<boolean>(false);
  const [voiceMuted, setVoiceMuted] = useState<boolean>(false);
  const [showDossier, setShowDossier] = useState<boolean>(false);
  const [dockCollapsed, setDockCollapsed] = useState<boolean>(false);
  const [showExportModal, setShowExportModal] = useState<boolean>(false);
  const [showAssetsModal, setShowAssetsModal] = useState<boolean>(false);
  const [showVoiceSidebar, setShowVoiceSidebar] = useState<boolean>(false);
  const [panModeActive, setPanModeActive] = useState<boolean>(false);
  const [showAimPreview, setShowAimPreview] = useState<boolean>(true);
  const [cameraZoomPct, setCameraZoomPct] = useState<number>(68);
  const [perfStats, setPerfStats] = useState({ ms: '0.24', entities: 0, slimesCount: 4 });
  const [, setAssetVersion] = useState(0);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<VfxEngine | null>(null);
  const paramsRef = useRef<ShaderParams>(shaderParams);
  paramsRef.current = shaderParams;

  const dragStateRef = useRef<{
    isDown: boolean;
    isPanning: boolean;
    isAimingSkill: boolean;
    startX: number;
    startY: number;
    lastX: number;
    lastY: number;
    movedDist: number;
  }>({
    isDown: false,
    isPanning: false,
    isAimingSkill: false,
    startX: 0,
    startY: 0,
    lastX: 0,
    lastY: 0,
    movedDist: 0,
  });

  const activePreset =
    VFX_PRESETS.find((p) => p.id === selectedPresetId) || VFX_PRESETS[0];
  const activeDossier = getSpellDossier(activePreset);
  const activeTacticalSpec = getSkillTacticalSpec(activePreset.id);
  const activePalette =
    ELEMENTAL_PALETTES.find((p) => p.id === selectedPaletteId) || ELEMENTAL_PALETTES[0];

  const filteredPresets =
    activeTag === 'todos'
      ? VFX_PRESETS
      : VFX_PRESETS.filter((p) => p.tags.includes(activeTag));

  const selectPreset = useCallback((presetId: VfxPresetId) => {
    setSelectedPresetId(presetId);
    const meta = VFX_PRESETS.find((p) => p.id === presetId);
    if (meta) {
      setSelectedPaletteId(meta.defaultPalette);
    }
  }, []);

  const fireVfxAt = useCallback(
    (worldX: number, worldY: number, overridePresetId?: VfxPresetId) => {
      const engine = engineRef.current;
      if (!engine) return;
      const pid = overridePresetId || selectedPresetId;
      const meta = VFX_PRESETS.find((p) => p.id === pid) || activePreset;
      const pal = overridePresetId
        ? ELEMENTAL_PALETTES.find((e) => e.id === meta.defaultPalette) || activePalette
        : activePalette;

      // Always cast player-triggered skills from the player character (VOCÊ) so attack range limits & aim previews match 1:1
      const playerCaster = engine.getPlayerSlime();
      const fallbackCasters = engine.slimes.filter((s) => !s.isDesperate);
      const caster =
        playerCaster && !playerCaster.isDesperate
          ? playerCaster
          : fallbackCasters[0] || engine.slimes[0];

      if (caster) {
        engine.triggerPresetFromCaster(caster, meta.id, worldX, worldY, pal, paramsRef.current);
      } else {
        engine.triggerPreset(meta.id, worldX, worldY, pal, paramsRef.current);
      }
    },
    [selectedPresetId, activePreset, activePalette]
  );

  // Sync simulationEnabled flag with VfxEngine
  useEffect(() => {
    if (engineRef.current) {
      engineRef.current.simulationEnabled = simulationOn;
    }
  }, [simulationOn]);

  // Sync tactical aim preview state with VfxEngine
  useEffect(() => {
    if (engineRef.current) {
      engineRef.current.setAimPreviewConfig(selectedPresetId, activePalette, showAimPreview);
    }
  }, [selectedPresetId, activePalette, showAimPreview]);

  // Full-Viewport High-DPI Canvas Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = window.innerWidth;
    const height = window.innerHeight;
    canvas.width = width * dpr;
    canvas.height = height * dpr;

    const engine = new VfxEngine(width, height);
    engine.simulationEnabled = false;
    engineRef.current = engine;
    setCameraZoomPct(Math.round(engine.cameraZoom * 100));

    const handleResize = () => {
      if (!canvasRef.current || !engineRef.current) return;
      const curDpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = window.innerWidth;
      const h = window.innerHeight;
      canvasRef.current.width = w * curDpr;
      canvasRef.current.height = h * curDpr;
      engineRef.current.resize(w, h);
    };

    window.addEventListener('resize', handleResize);

    let animationFrameId: number;
    let lastTime = performance.now();
    let hudTick = 0;

    const renderLoop = (now: number) => {
      const rawDt = Math.min(0.05, (now - lastTime) / 1000);
      lastTime = now;

      const ctx = canvas.getContext('2d');
      if (ctx && engineRef.current) {
        const curDpr = Math.min(window.devicePixelRatio || 1, 2);
        engineRef.current.update(rawDt, paramsRef.current);

        ctx.save();
        ctx.setTransform(curDpr, 0, 0, curDpr, 0, 0);
        engineRef.current.render(ctx, paramsRef.current);
        ctx.restore();

        hudTick++;
        if (hudTick % 12 === 0) {
          setPerfStats({
            ms: engineRef.current.frameTimeMs.toFixed(2),
            entities: engineRef.current.getActiveEntityCount(),
            slimesCount: engineRef.current.slimes.length,
          });
        }
      }

      animationFrameId = requestAnimationFrame(renderLoop);
    };

    animationFrameId = requestAnimationFrame(renderLoop);
    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Keyboard shortcuts + WASD Player Slime Locomotion + Arrow Keys Camera Pan
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const engine = engineRef.current;

      // Initialize/resume Web Audio context on user action
      slimeVoiceEngine.initContext();

      // WASD controls player slime locomotion
      if (engine) {
        if (e.code === 'KeyW' || e.key === 'w' || e.key === 'W') {
          engine.setPlayerInput({ up: true });
          return;
        }
        if (e.code === 'KeyS' || e.key === 's' || e.key === 'S') {
          engine.setPlayerInput({ down: true });
          return;
        }
        if (e.code === 'KeyA' || e.key === 'a' || e.key === 'A') {
          engine.setPlayerInput({ left: true });
          return;
        }
        if (e.code === 'KeyD' || e.key === 'd' || e.key === 'D') {
          engine.setPlayerInput({ right: true });
          return;
        }
        if (e.shiftKey) {
          engine.setPlayerInput({ sprint: true });
        }

        // Arrow keys pan the camera smoothly
        const panStep = 65;
        if (e.key === 'ArrowLeft') {
          engine.panCamera(panStep, 0);
          return;
        }
        if (e.key === 'ArrowRight') {
          engine.panCamera(-panStep, 0);
          return;
        }
        if (e.key === 'ArrowUp') {
          engine.panCamera(0, panStep);
          return;
        }
        if (e.key === 'ArrowDown') {
          engine.panCamera(0, -panStep);
          return;
        }
      }

      // 1. TreeChat Dialogue Selection: If player is deliberating, keys 1, 2, 3 pick dialogue options!
      if (
        e.code === 'Digit1' ||
        e.key === '1' ||
        e.code === 'Digit2' ||
        e.key === '2' ||
        e.code === 'Digit3' ||
        e.key === '3' ||
        e.code === 'Numpad1' ||
        e.code === 'Numpad2' ||
        e.code === 'Numpad3'
      ) {
        const sessions = getActiveTreeChatSessions();
        const player = engine?.getPlayerSlime();
        if (player && engine) {
          const playerChat = sessions.find(
            (c) =>
              (c.npcAId === player.id || c.npcBId === player.id) &&
              c.activeSpeakerId === player.id &&
              c.phase === 'deliberating'
          );
          if (playerChat) {
            const optIdx =
              e.code === 'Digit1' || e.key === '1' || e.code === 'Numpad1'
                ? 0
                : e.code === 'Digit2' || e.key === '2' || e.code === 'Numpad2'
                ? 1
                : 2;
            selectPlayerTreeChatOption(playerChat, optIdx, engine);
            return; // Prevent firing attack skill shortcuts!
          }
        }
      }

      // 2. [F] Hotkey: Approach NPC and press F to initiate interactive TreeChat (or press F again to end it!)
      if (e.code === 'KeyF' || e.key === 'f' || e.key === 'F') {
        const player = engine?.getPlayerSlime();
        if (player && engine) {
          if (closePlayerTreeChat(player, engine.slimes)) {
            return;
          }
          let closestNpc = null;
          let minDist = 280;
          for (const s of engine.slimes) {
            if (s.isPlayer || s.isDesperate) continue;
            const d = Math.hypot(s.x - player.x, s.y - player.y);
            if (d < minDist) {
              minDist = d;
              closestNpc = s;
            }
          }
          if (closestNpc) {
            interactPlayerTreeChat(player, closestNpc, engine.slimes);
            return;
          }
        }
      }

      const key = e.key.toUpperCase();
      const matched = VFX_PRESETS.find((p) => p.shortcut.toUpperCase() === key);
      if (matched) {
        selectPreset(matched.id);
        const aimX = engine?.aimPreviewState.hoverWorldX ?? (engine?.getWidth() || 2750) * 0.55;
        const aimY = engine?.aimPreviewState.hoverWorldY ?? (engine?.getHeight() || 1700) * 0.45;
        fireVfxAt(aimX, aimY, matched.id);
      } else if (e.code === 'Space') {
        e.preventDefault();
        const player = engine?.getPlayerSlime();
        if (player && player.z <= 0) {
          player.vz = 240;
          player.squashX = 0.85;
          player.squashY = 1.25;
        }
        const aimX = engine?.aimPreviewState.hoverWorldX ?? (engine?.getWidth() || 2750) * 0.55;
        const aimY = engine?.aimPreviewState.hoverWorldY ?? (engine?.getHeight() || 1700) * 0.45;
        fireVfxAt(aimX, aimY);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const engine = engineRef.current;
      if (engine) {
        if (e.code === 'KeyW' || e.key === 'w' || e.key === 'W') {
          engine.setPlayerInput({ up: false });
        }
        if (e.code === 'KeyS' || e.key === 's' || e.key === 'S') {
          engine.setPlayerInput({ down: false });
        }
        if (e.code === 'KeyA' || e.key === 'a' || e.key === 'A') {
          engine.setPlayerInput({ left: false });
        }
        if (e.code === 'KeyD' || e.key === 'd' || e.key === 'D') {
          engine.setPlayerInput({ right: false });
        }
        if (!e.shiftKey) {
          engine.setPlayerInput({ sprint: false });
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [selectPreset, fireVfxAt]);

  const handleCanvasPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current || !engineRef.current) return;
    slimeVoiceEngine.initContext();
    const rect = canvasRef.current.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const worldPt = engineRef.current.screenToWorld(sx, sy);
    engineRef.current.setAimPreviewHover(worldPt.x, worldPt.y);

    // Pan on middle-click (button 1), right-click (button 2), Shift/Alt+Left-click, or when Pan Mode is toggled on
    const shouldPan =
      panModeActive || e.button === 1 || e.button === 2 || e.shiftKey || e.altKey;

    if (!shouldPan && e.button === 0) {
      // Check 1: Did player click on a TreeChat dialogue pill [1], [2], or [3]?
      if (checkTreeChatPillClick(worldPt.x, worldPt.y, engineRef.current)) {
        return;
      }

      // Check 2: Did player click directly on a nearby NPC to interact?
      if (checkNpcClickInteraction(worldPt.x, worldPt.y, engineRef.current)) {
        return;
      }

      // Hold left-click to show tactical skill preview & aim, release to fire!
      engineRef.current.setAimPreviewHolding(true);
    }

    dragStateRef.current = {
      isDown: true,
      isPanning: shouldPan,
      isAimingSkill: !shouldPan && e.button === 0,
      startX: sx,
      startY: sy,
      lastX: sx,
      lastY: sy,
      movedDist: 0,
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handleCanvasPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current || !engineRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;

    // Update live tactical aim preview coordinates in world space
    const worldPt = engineRef.current.screenToWorld(sx, sy);
    engineRef.current.setAimPreviewHover(worldPt.x, worldPt.y);

    if (!dragStateRef.current.isDown) return;
    const dx = sx - dragStateRef.current.lastX;
    const dy = sy - dragStateRef.current.lastY;
    dragStateRef.current.lastX = sx;
    dragStateRef.current.lastY = sy;
    dragStateRef.current.movedDist += Math.hypot(dx, dy);

    if (dragStateRef.current.isPanning) {
      engineRef.current.panCamera(dx, dy);
    }
  };

  const handleCanvasPointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current || !engineRef.current) return;
    engineRef.current.setAimPreviewHolding(false);

    if (!dragStateRef.current.isDown) return;
    const wasAimingSkill = dragStateRef.current.isAimingSkill;

    dragStateRef.current.isDown = false;
    dragStateRef.current.isPanning = false;
    dragStateRef.current.isAimingSkill = false;

    if (wasAimingSkill) {
      const rect = canvasRef.current.getBoundingClientRect();
      const sx = e.clientX - rect.left;
      const sy = e.clientY - rect.top;
      const worldPt = engineRef.current.screenToWorld(sx, sy);
      fireVfxAt(worldPt.x, worldPt.y);
    }
  };

  const handleCanvasPointerCancel = () => {
    if (engineRef.current) {
      engineRef.current.setAimPreviewHolding(false);
    }
    dragStateRef.current.isDown = false;
    dragStateRef.current.isPanning = false;
    dragStateRef.current.isAimingSkill = false;
  };

  const handleCanvasWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    const engine = engineRef.current;
    if (!engine || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const zoomFactor = e.deltaY < 0 ? 1.12 : 0.89;
    engine.zoomCameraAt(engine.cameraZoom * zoomFactor, sx, sy);
    setCameraZoomPct(Math.round(engine.cameraZoom * 100));
  };

  // Character & Arena Customizer Callbacks
  const handleUpdateSlimeSprites = useCallback(
    (slimeId: string, sprites: SlimeDirectionalSprites | undefined) => {
      const engine = engineRef.current;
      if (!engine) return;
      const target = engine.slimes.find((s) => s.id === slimeId);
      if (target) {
        target.customSprites = sprites;
        setAssetVersion((v) => v + 1);
      }
    },
    []
  );

  const handleUpdateSlimeTagsAndMeta = useCallback(
    (
      slimeId: string,
      updates: {
        allowedTags?: VfxTag[];
        name?: string;
        team?: 0 | 1;
        personality?: SlimePersonality;
      }
    ) => {
      const engine = engineRef.current;
      if (!engine) return;
      const target = engine.slimes.find((s) => s.id === slimeId);
      if (!target) return;

      if (updates.name !== undefined) {
        target.name = updates.name.toUpperCase();
      }
      if (updates.team !== undefined) {
        target.team = updates.team;
      }
      if (updates.personality !== undefined) {
        target.personality = updates.personality;
      }
      if (updates.allowedTags !== undefined) {
        target.allowedTags = updates.allowedTags;
        const vis = getVisualsForClassTags(updates.allowedTags);
        target.color = vis.color;
        target.coreColor = vis.coreColor;
        target.darkColor = vis.darkColor;
        target.defaultPalette = vis.defaultPalette;
        target.roleTitle = vis.roleTitle;
        target.skills = buildSkillLoadoutForTags(updates.allowedTags, 0);
      }
      setAssetVersion((v) => v + 1);
    },
    []
  );

  const handleCreateNewCharacter = useCallback(
    (options: {
      name: string;
      team: 0 | 1;
      allowedTags: VfxTag[];
      personality?: SlimePersonality;
      customSprites?: SlimeDirectionalSprites;
    }) => {
      const engine = engineRef.current;
      if (!engine) return;
      const w = engine.getWidth();
      const h = engine.getHeight();
      const idx = engine.slimes.length;
      // Golden-angle distribution across the expanded world so 10+ characters never spawn stacked!
      const goldenAngle = idx * 2.3999632;
      const ringDist = 220 + (idx % 6) * 145;
      const sideBias = options.team === 0 ? -180 : 180;
      const spawnX = Math.max(
        180,
        Math.min(w - 180, w * 0.5 + sideBias + Math.cos(goldenAngle) * ringDist)
      );
      const spawnY = Math.max(
        160,
        Math.min(h - 180, h * 0.48 + Math.sin(goldenAngle) * ringDist * 0.72)
      );

      const newSlime = createCustomSlimeCharacter({
        name: options.name,
        team: options.team,
        x: spawnX,
        y: spawnY,
        allowedTags: options.allowedTags,
        personality: options.personality,
        customSprites: options.customSprites,
      });

      engine.slimes.push(newSlime);
      setPerfStats((p) => ({ ...p, slimesCount: engine.slimes.length }));
      setAssetVersion((v) => v + 1);
    },
    []
  );

  const handleRemoveCharacter = useCallback((slimeId: string) => {
    const engine = engineRef.current;
    if (!engine || engine.slimes.length <= 2) return;
    engine.slimes = engine.slimes.filter((s) => s.id !== slimeId);
    setPerfStats((p) => ({ ...p, slimesCount: engine.slimes.length }));
    setAssetVersion((v) => v + 1);
  }, []);

  const handleUpdateArenaBg = useCallback((nextBg: ArenaBackgroundConfig) => {
    const engine = engineRef.current;
    if (!engine) return;
    engine.arenaBg = nextBg;
    setAssetVersion((v) => v + 1);
  }, []);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#030305] select-none font-sans text-zinc-100">
      {/* 100% Viewport Interactive VFX & Slime Arena Canvas (Supports Pan & Zoom) */}
      <canvas
        ref={canvasRef}
        onPointerDown={handleCanvasPointerDown}
        onPointerMove={handleCanvasPointerMove}
        onPointerUp={handleCanvasPointerUp}
        onPointerCancel={handleCanvasPointerCancel}
        onWheel={handleCanvasWheel}
        onContextMenu={(e) => e.preventDefault()}
        className={`block w-full h-full ${
          panModeActive ? 'cursor-grab active:cursor-grabbing' : 'cursor-crosshair'
        }`}
      />

      {/* Top-Left Liquid Glass HUD Bar */}
      <div className="fixed top-3 left-3 flex items-center gap-2.5 liquid-glass-elevated chromatic-border-subtle px-3.5 py-2 rounded-xl z-20">
        <span className="text-[11px] font-mono font-bold tracking-wider text-white uppercase tabular-nums">
          {VFX_PRESETS.length} VFX · {perfStats.slimesCount} PERSONAGENS
        </span>
        <span className="text-zinc-700">|</span>
        <span className="text-[11px] font-mono text-zinc-300 tabular-nums">
          {perfStats.ms} ms
        </span>
        <span className="text-zinc-700">|</span>
        {/* Camera Zoom & Pan Controls */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => {
              const engine = engineRef.current;
              if (!engine) return;
              engine.zoomCameraAt(engine.cameraZoom * 0.85);
              setCameraZoomPct(Math.round(engine.cameraZoom * 100));
            }}
            className="px-2 py-0.5 text-[11px] font-mono font-bold btn-liquid-glass rounded-md cursor-pointer"
            title="Diminuir Zoom (Ou use o Scroll do Mouse)"
          >
            -
          </button>
          <button
            onClick={() => {
              const engine = engineRef.current;
              if (!engine) return;
              engine.resetCamera();
              setCameraZoomPct(Math.round(engine.cameraZoom * 100));
            }}
            className="px-2 py-0.5 text-[10px] font-mono text-white btn-liquid-glass rounded-md cursor-pointer tabular-nums"
            title="Clique para centralizar e resetar o Zoom da Arena Expandida"
          >
            {cameraZoomPct}%
          </button>
          <button
            onClick={() => {
              const engine = engineRef.current;
              if (!engine) return;
              engine.zoomCameraAt(engine.cameraZoom * 1.18);
              setCameraZoomPct(Math.round(engine.cameraZoom * 100));
            }}
            className="px-2 py-0.5 text-[11px] font-mono font-bold btn-liquid-glass rounded-md cursor-pointer"
            title="Aumentar Zoom (Ou use o Scroll do Mouse)"
          >
            +
          </button>
          <button
            onClick={() => setPanModeActive((v) => !v)}
            className={`ml-1 px-2.5 py-0.5 text-[10px] font-mono font-semibold rounded-md transition cursor-pointer whitespace-nowrap ${
              panModeActive
                ? 'btn-monochrome-primary'
                : 'btn-liquid-glass text-zinc-300'
            }`}
            title="Arraste com o mouse para mover a câmera (Pan) ou clique para disparar magia"
          >
            {panModeActive ? 'Modo Pan Ativo' : 'Pan / Scroll Zoom'}
          </button>
        </div>
      </div>

      {/* Top-Right Liquid Glass Simulation & Engine Controls */}
      <div className="fixed top-3 right-3 flex items-center gap-1.5 liquid-glass-elevated chromatic-border-subtle p-1.5 rounded-xl z-20">
        <button
          onClick={onBackToDashboard}
          className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium btn-liquid-glass rounded-lg cursor-pointer whitespace-nowrap"
          title="Voltar ao Dashboard Central (Pausa o Skill Creator para economizar recursos)"
        >
          <LayoutGrid className="w-3.5 h-3.5 text-white" />
          ← Dashboard
        </button>

        <button
          onClick={onOpenFishAudio}
          className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold btn-monochrome-primary rounded-lg cursor-pointer whitespace-nowrap"
          title="Alternar para Fish Audio Studio (Fecha o Skill Creator e abre a Central de Vozes)"
        >
          <AudioWaveform className="w-3.5 h-3.5" />
          Fish Audio Studio
        </button>

        <button
          onClick={() => setShowAssetsModal(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium btn-liquid-glass rounded-lg cursor-pointer whitespace-nowrap"
          title="Importar pasta com 4 PNGs direcionais, criar novos personagens (>4), definir classes por tags e alterar o fundo da arena"
        >
          <FolderOpen className="w-3.5 h-3.5 text-white" />
          Personagens ({perfStats.slimesCount}) & Fundo
        </button>

        <button
          onClick={() => {
            const nextVal = !simulationOn;
            setSimulationOn(nextVal);
            const engine = engineRef.current;
            if (!nextVal && engine) {
              engine.simulationEnabled = false;
              triggerRandomTreeChatPair(engine);
              const sessions = getActiveTreeChatSessions();
              const session = sessions[sessions.length - 1];
              if (session) {
                engine.cameraZoom = 1.05;
                engine.cameraX = window.innerWidth * 0.5 - session.centerX * engine.cameraZoom;
                engine.cameraY = window.innerHeight * 0.45 - session.centerY * engine.cameraZoom;
              }
            }
          }}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold rounded-lg transition cursor-pointer whitespace-nowrap ${
            simulationOn ? 'btn-monochrome-primary' : 'btn-liquid-glass'
          }`}
          title={
            simulationOn
              ? 'Simulação de Combate Ativa — Clique para mudar para Modo Passeio & TreeChat Procedural'
              : 'Simulação OFF — Personagens em Caminhada Procedural & Diálogos TreeChat'
          }
        >
          {simulationOn ? (
            <>
              <Pause className="w-3 h-3" />
              Simulação Ativa
            </>
          ) : (
            <>
              <Play className="w-3 h-3" />
              Modo Passeio
            </>
          )}
        </button>

        <button
          onClick={() => {
            const engine = engineRef.current;
            if (!engine) return;
            setSimulationOn(false);
            engine.simulationEnabled = false;
            triggerRandomTreeChatPair(engine);
            const sessions = getActiveTreeChatSessions();
            const session = sessions[sessions.length - 1] || null;
            if (session) {
              engine.cameraZoom = 1.1;
              engine.cameraX = window.innerWidth * 0.5 - session.centerX * engine.cameraZoom;
              engine.cameraY = window.innerHeight * 0.45 - session.centerY * engine.cameraZoom;
            }
          }}
          className="flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-medium btn-liquid-glass rounded-lg cursor-pointer whitespace-nowrap"
          title="Inicia imediatamente uma conversa procedural TreeChat entre dois NPCs"
        >
          TreeChat
        </button>

        <button
          onClick={() => {
            const nextMuted = slimeVoiceEngine.toggleMute();
            setVoiceMuted(nextMuted);
          }}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-medium rounded-lg transition cursor-pointer whitespace-nowrap ${
            voiceMuted ? 'btn-liquid-glass text-zinc-400' : 'btn-monochrome-primary'
          }`}
          title="Alternar vozes procedurais dos slimes com área de escuta espacial"
        >
          {voiceMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
          {voiceMuted ? 'Vozes: Mudas' : 'Vozes TTS'}
        </button>

        <button
          onClick={() => setShowVoiceSidebar((v) => !v)}
          className={`flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-medium rounded-lg transition cursor-pointer whitespace-nowrap ${
            showVoiceSidebar ? 'btn-monochrome-primary' : 'btn-liquid-glass'
          }`}
          title="Abrir/Fechar Menu Lateral para ouvir o Play Preview de cada voz"
        >
          Menu Vozes
        </button>

        <button
          onClick={() => {
            const engine = engineRef.current;
            if (!engine) return;
            const player = engine.getPlayerSlime();
            if (player) {
              engine.cameraX = player.x;
              engine.cameraY = player.y;
              engine.cameraZoom = 0.95;
              setCameraZoomPct(95);
            }
          }}
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-medium btn-liquid-glass rounded-lg cursor-pointer whitespace-nowrap"
          title="Centralizar câmera no seu slime (Controlável com WASD)"
        >
          Herói (WASD)
        </button>

        <button
          onClick={() => setShowAimPreview((v) => !v)}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-medium rounded-lg transition cursor-pointer whitespace-nowrap ${
            showAimPreview ? 'btn-monochrome-primary' : 'btn-liquid-glass text-zinc-400'
          }`}
          title="Exibir/Ocultar Raios de Limite de Ataque e Geometria Tática da Skill (Cones, Salvas de Flechas, Parábolas, Corredores)"
        >
          <Crosshair className="w-3.5 h-3.5" />
          {showAimPreview ? 'Mira & Alcance: ON' : 'Mira: OFF'}
        </button>

        <button
          onClick={() => {
            const engine = engineRef.current;
            if (!engine) return;
            const player = engine.getPlayerSlime();
            if (player) {
              if (closePlayerTreeChat(player, engine.slimes)) {
                return;
              }
              let closestNpc = null;
              let minDist = 380;
              for (const s of engine.slimes) {
                if (s.isPlayer || s.isDesperate) continue;
                const d = Math.hypot(s.x - player.x, s.y - player.y);
                if (d < minDist) {
                  minDist = d;
                  closestNpc = s;
                }
              }
              if (closestNpc) {
                interactPlayerTreeChat(player, closestNpc, engine.slimes);
              }
            }
          }}
          className="flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-medium btn-liquid-glass rounded-lg cursor-pointer whitespace-nowrap"
          title="Aperte F ou clique aqui para conversar com o NPC mais próximo usando TreeChat"
        >
          [F] Falar NPC
        </button>

        <button
          onClick={() => {
            const engine = engineRef.current;
            if (!engine || engine.slimes.length < 2) return;
            const victim =
              engine.slimes.find((s) => !s.isDesperate) || engine.slimes[0];
            const attacker =
              engine.slimes.find((s) => s.team !== victim.team) || engine.slimes[2];
            engine.damageSlime(
              victim,
              victim.hp + victim.shieldHp + 500,
              '0 PV DESESPERO!',
              ELEMENTAL_PALETTES[0],
              attacker?.id,
              { flattenDuration: 0.65 }
            );
          }}
          className="flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-medium btn-liquid-glass rounded-lg cursor-pointer whitespace-nowrap"
          title="Força um Slime a atingir 0 PV para testar o estado de Desespero e Fuga"
        >
          <AlertTriangle className="w-3 h-3 text-white" />
          0 PV (Fuga)
        </button>

        {[1.0, 0.3].map((spd) => (
          <button
            key={spd}
            onClick={() => setShaderParams((s) => ({ ...s, timeScale: spd }))}
            className={`px-2.5 py-1.5 text-[11px] font-mono font-semibold rounded-lg transition cursor-pointer tabular-nums ${
              shaderParams.timeScale === spd
                ? 'btn-monochrome-primary'
                : 'btn-liquid-glass text-zinc-400'
            }`}
          >
            {spd === 1 ? '1x' : '0.3x'}
          </button>
        ))}

        <button
          onClick={() =>
            setShaderParams((s) => ({ ...s, enableSound: !s.enableSound }))
          }
          className="p-1.5 btn-liquid-glass rounded-lg cursor-pointer"
          title="Som"
        >
          {shaderParams.enableSound ? (
            <Volume2 className="w-3.5 h-3.5 text-white" />
          ) : (
            <VolumeX className="w-3.5 h-3.5 text-zinc-500" />
          )}
        </button>

        <button
          onClick={() => setShowTuning((v) => !v)}
          className={`p-1.5 rounded-lg transition cursor-pointer ${
            showTuning ? 'btn-monochrome-primary' : 'btn-liquid-glass'
          }`}
          title="Parâmetros"
        >
          <Sliders className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={() => setDockCollapsed((v) => !v)}
          className={`flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-medium rounded-lg transition cursor-pointer whitespace-nowrap ${
            dockCollapsed ? 'btn-monochrome-primary' : 'btn-liquid-glass'
          }`}
          title="Ocultar ou exibir todo o painel inferior de skills"
        >
          {dockCollapsed ? (
            <>
              <ChevronUp className="w-3.5 h-3.5" />
              Exibir Skills
            </>
          ) : (
            <>
              <EyeOff className="w-3.5 h-3.5" />
              Ocultar Barra
            </>
          )}
        </button>

        <button
          onClick={() => setShowExportModal(true)}
          className="flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-medium btn-liquid-glass rounded-lg cursor-pointer whitespace-nowrap"
        >
          <Code2 className="w-3.5 h-3.5 text-white" />
          Módulos / PNG
        </button>

        <button
          onClick={() => engineRef.current?.clearAll()}
          className="p-1.5 btn-liquid-glass rounded-lg cursor-pointer"
          title="Resetar Arena (Preserva personagens criados, classes e PNGs importados)"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Collapsible Shader Drawer */}
      {showTuning && (
        <div className="fixed top-16 right-3 w-64 liquid-glass-elevated chromatic-border p-4 rounded-2xl z-30 space-y-3.5 text-xs">
          <div className="flex items-center justify-between border-b border-white/10 pb-2">
            <span className="font-semibold text-white">
              Parâmetros Instanciados
            </span>
            <button
              onClick={() => setShaderParams(DEFAULT_SHADER_PARAMS)}
              className="text-[11px] font-mono text-zinc-400 hover:text-white cursor-pointer"
            >
              Resetar
            </button>
          </div>

          <div>
            <div className="flex justify-between font-mono text-[11px] mb-1.5 tabular-nums">
              <span className="text-zinc-300">Escala dos Efeitos</span>
              <span className="text-white font-semibold">{shaderParams.effectScale.toFixed(2)}x</span>
            </div>
            <input
              type="range"
              min="0.6"
              max="1.6"
              step="0.05"
              value={shaderParams.effectScale}
              onChange={(e) =>
                setShaderParams((s) => ({ ...s, effectScale: parseFloat(e.target.value) }))
              }
              className="w-full"
            />
          </div>

          <div>
            <div className="flex justify-between font-mono text-[11px] mb-1.5 tabular-nums">
              <span className="text-zinc-300">Multiplicador Instâncias</span>
              <span className="text-white font-semibold">
                {Math.round(shaderParams.particleMultiplier * 100)}%
              </span>
            </div>
            <input
              type="range"
              min="0.4"
              max="2.0"
              step="0.1"
              value={shaderParams.particleMultiplier}
              onChange={(e) =>
                setShaderParams((s) => ({
                  ...s,
                  particleMultiplier: parseFloat(e.target.value),
                }))
              }
              className="w-full"
            />
          </div>

          <div>
            <div className="flex justify-between font-mono text-[11px] mb-1.5 tabular-nums">
              <span className="text-zinc-300">Tremor de Câmera</span>
              <span className="text-white font-semibold">
                {Math.round(shaderParams.screenShakeIntensity * 100)}%
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="1.5"
              step="0.1"
              value={shaderParams.screenShakeIntensity}
              onChange={(e) =>
                setShaderParams((s) => ({
                  ...s,
                  screenShakeIntensity: parseFloat(e.target.value),
                }))
              }
              className="w-full"
            />
          </div>
        </div>
      )}

      {/* COLLAPSIBLE / HIDEABLE BOTTOM SKILLS DOCK */}
      {dockCollapsed ? (
        <div className="fixed bottom-3 right-3 flex items-center gap-2 liquid-glass-elevated chromatic-border-subtle px-3.5 py-2 rounded-full z-20">
          <button
            onClick={() => setDockCollapsed(false)}
            className="flex items-center gap-1.5 px-3.5 py-1 btn-monochrome-primary text-[11px] rounded-full cursor-pointer whitespace-nowrap"
          >
            <ChevronUp className="w-3.5 h-3.5" />
            Mostrar Barra de Skills ({VFX_PRESETS.length})
          </button>
        </div>
      ) : (
        <div className="fixed bottom-2.5 left-1/2 -translate-x-1/2 w-[97vw] max-w-7xl flex flex-col gap-2 liquid-glass-elevated chromatic-border-subtle px-4 py-3 rounded-2xl z-20">
          {/* Floating Top-Right Tab to Hide Entire Bottom Panel Instantly */}
          <button
            onClick={() => setDockCollapsed(true)}
            className="absolute -top-7 right-3 flex items-center gap-1 px-3 py-1 liquid-glass-elevated border border-white/15 hover:border-white/40 text-zinc-200 hover:text-white text-[10px] font-medium rounded-t-lg transition cursor-pointer whitespace-nowrap"
            title="Ocultar todo este painel inferior de skills"
          >
            <ChevronDown className="w-3.5 h-3.5" />
            Ocultar Painel de Skills
          </button>

          {/* Active Spell Technical Analysis Dossier */}
          {showDossier && (
            <div className="relative grid grid-cols-1 md:grid-cols-12 gap-2 liquid-glass border border-white/10 rounded-xl px-3 py-2 pr-8 text-[11px]">
              <button
                onClick={() => setShowDossier(false)}
                className="absolute top-1.5 right-1.5 p-1 text-zinc-400 hover:text-white rounded cursor-pointer"
                title="Ocultar Dossiê QA"
              >
                <X className="w-3.5 h-3.5" />
              </button>
              <div className="md:col-span-3 flex flex-col justify-between border-r border-white/10 pr-2">
                <div className="flex items-center gap-1.5">
                  <span className="font-mono font-bold text-white tabular-nums">
                    #{activePreset.number}
                  </span>
                  <span className="font-bold text-white truncate">
                    {activePreset.name}
                  </span>
                </div>
                <div className="text-zinc-300 mt-0.5 leading-snug">
                  <span className="font-semibold text-white">Função: </span>
                  {activeDossier.paraQue}
                </div>
              </div>

              <div className="md:col-span-3 border-r border-white/10 pr-2 leading-snug text-zinc-300">
                <div>
                  <span className="font-semibold text-white">Coreografia: </span>
                  {activeDossier.comoFunciona}
                </div>
              </div>

              <div className="md:col-span-3 border-r border-white/10 pr-2 leading-snug text-zinc-300">
                <div>
                  <span className="font-semibold text-white">Shader & Textura: </span>
                  {activeDossier.shaderETextura}
                </div>
              </div>

              <div className="md:col-span-3 flex flex-col justify-between leading-snug text-zinc-300">
                <div>
                  <span className="font-semibold text-white">Reação: </span>
                  {activeDossier.reacaoInimigo}
                </div>
                <div className="flex items-center gap-1 text-[10px] font-mono text-zinc-200 mt-0.5">
                  <CheckCircle2 className="w-3 h-3 shrink-0 text-white" />
                  <span className="truncate">{activeDossier.statusAceite}</span>
                </div>
              </div>
            </div>
          )}

          {/* 15 Multi-Tags + 8 Palettes + Combo + Hide Dock Button */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-2">
            <div className="flex flex-wrap items-center gap-1">
              <button
                onClick={() => setActiveTag('todos')}
                className={`px-2.5 py-1 text-[10px] font-medium rounded-md transition cursor-pointer whitespace-nowrap ${
                  activeTag === 'todos'
                    ? 'btn-monochrome-primary'
                    : 'btn-liquid-glass text-zinc-400'
                }`}
              >
                Todos ({VFX_PRESETS.length})
              </button>
              {VFX_TAGS.map((tag) => {
                const count = VFX_PRESETS.filter((p) => p.tags.includes(tag.id)).length;
                const isActive = activeTag === tag.id;
                return (
                  <button
                    key={tag.id}
                    onClick={() => setActiveTag(tag.id)}
                    className={`px-2.5 py-1 text-[10px] font-medium rounded-md transition cursor-pointer whitespace-nowrap ${
                      isActive
                        ? 'btn-monochrome-primary'
                        : 'btn-liquid-glass text-zinc-400'
                    }`}
                  >
                    {tag.label} ({count})
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-1.5">
              {/* Active Skill Tactical Range & Archetype Telemetry Badge */}
              <div
                className="hidden lg:flex items-center gap-2 px-2.5 py-1 rounded-md liquid-glass border border-white/15 text-[10px] font-mono text-zinc-200"
                title={activeTacticalSpec.labelPt}
              >
                <Crosshair className="w-3 h-3 text-white shrink-0" />
                <span className="font-bold text-white uppercase">
                  {activeTacticalSpec.labelPt}
                </span>
                <span className="text-zinc-500">|</span>
                <span className="text-zinc-300">
                  {activeTacticalSpec.selfCentered
                    ? `RAIO: ${activeTacticalSpec.impactRadius}m (SELF)`
                    : `ALCANCE: ${activeTacticalSpec.maxRange}m`}
                </span>
                {activeTacticalSpec.rayCount > 1 && (
                  <>
                    <span className="text-zinc-500">|</span>
                    <span className="text-white font-semibold">
                      {activeTacticalSpec.rayCount}x VETORES
                    </span>
                  </>
                )}
              </div>

              <button
                onClick={() => setShowDossier((v) => !v)}
                className={`flex items-center gap-1 px-2.5 py-1 text-[10px] font-medium rounded-md transition cursor-pointer whitespace-nowrap ${
                  showDossier
                    ? 'btn-monochrome-primary'
                    : 'btn-liquid-glass text-zinc-300'
                }`}
                title="Exibir/Ocultar Análise Técnica"
              >
                <Eye className="w-3 h-3" />
                {showDossier ? 'Ocultar Dossiê' : 'Ver Dossiê'}
              </button>

              {ELEMENTAL_PALETTES.map((pal) => (
                <button
                  key={pal.id}
                  onClick={() => setSelectedPaletteId(pal.id)}
                  title={pal.name}
                  className={`w-4 h-4 rounded-full border transition cursor-pointer ${
                    selectedPaletteId === pal.id
                      ? 'border-white scale-115 ring-2 ring-white/40'
                      : 'border-white/20 opacity-65 hover:opacity-100'
                  }`}
                  style={{
                    background: `linear-gradient(135deg, ${pal.core} 0%, ${pal.primary} 55%, ${pal.secondary} 100%)`,
                  }}
                />
              ))}

              <button
                onClick={() => {
                  const engine = engineRef.current;
                  if (!engine) return;
                  VFX_PRESETS.forEach((p, idx) => {
                    setTimeout(() => {
                      const target =
                        engine.slimes[idx % engine.slimes.length] || {
                          x: window.innerWidth * 0.5,
                          y: window.innerHeight * 0.45,
                        };
                      fireVfxAt(
                        target.x + ((idx % 3) - 1) * 35,
                        target.y + ((idx % 2) - 0.5) * 35,
                        p.id
                      );
                    }, idx * 175);
                  });
                }}
                className="ml-1 flex items-center gap-1 px-3 py-1 btn-monochrome-primary text-[10px] rounded-md cursor-pointer whitespace-nowrap"
              >
                <Zap className="w-3 h-3" />
                Combo ({VFX_PRESETS.length}x)
              </button>
            </div>
          </div>

          {/* Scrollable / Compact 9-Column Grid of All VFX Skills */}
          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-9 gap-1.5 max-h-32 overflow-y-auto pr-1">
            {filteredPresets.map((preset) => {
              const isSelected = preset.id === selectedPresetId;
              const tacSpec = getSkillTacticalSpec(preset.id);
              return (
                <button
                  key={preset.id}
                  onClick={() => {
                    selectPreset(preset.id);
                    const engine = engineRef.current;
                    const nonPlayerSlimes = engine?.slimes.filter((s) => !s.isPlayer) || [];
                    const target =
                      nonPlayerSlimes[Math.floor(Math.random() * (nonPlayerSlimes.length || 1))] || {
                        x: window.innerWidth * 0.55,
                        y: window.innerHeight * 0.45,
                      };
                    fireVfxAt(target.x, target.y, preset.id);
                  }}
                  className={`px-2 py-1.5 rounded-lg text-left transition cursor-pointer truncate ${
                    isSelected
                      ? 'chromatic-border text-white'
                      : 'btn-liquid-glass text-zinc-300'
                  }`}
                  title={`#${preset.number} ${preset.name} | ${tacSpec.labelPt} (${
                    tacSpec.selfCentered ? `Raio ${tacSpec.impactRadius}m` : `Alcance ${tacSpec.maxRange}m`
                  })`}
                >
                  <div className="flex items-center justify-between text-[9px] font-mono text-zinc-400 tabular-nums">
                    <span className={isSelected ? 'text-white font-bold' : ''}>
                      #{preset.number}
                    </span>
                    <span className="text-[8px] text-zinc-300">
                      {tacSpec.selfCentered ? `R:${tacSpec.impactRadius}m` : `${tacSpec.maxRange}m`}
                    </span>
                  </div>
                  <div className="text-[10px] font-semibold leading-tight truncate text-white mt-0.5">
                    {preset.name}
                  </div>
                  <div className="text-[8px] font-mono text-zinc-400 truncate mt-0.5">
                    {tacSpec.labelPt}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Characters (4-Directional PNG Folder Import & Tag Classes) + Arena Background Modal */}
      {showAssetsModal && engineRef.current && (
        <ArenaAndSlimeAssetsModal
          isOpen={showAssetsModal}
          slimes={engineRef.current.slimes}
          arenaBg={engineRef.current.arenaBg}
          onUpdateSlimeSprites={handleUpdateSlimeSprites}
          onUpdateSlimeTagsAndMeta={handleUpdateSlimeTagsAndMeta}
          onCreateNewCharacter={handleCreateNewCharacter}
          onRemoveCharacter={handleRemoveCharacter}
          onUpdateArenaBg={handleUpdateArenaBg}
          onClose={() => setShowAssetsModal(false)}
        />
      )}

      {/* Lateral Voice Validator & Preview Menu */}
      <VoiceValidatorSidebar
        isOpen={showVoiceSidebar}
        onToggle={() => setShowVoiceSidebar((v) => !v)}
        slimes={engineRef.current?.slimes || []}
        onVoiceChange={() => setAssetVersion((v) => v + 1)}
      />

      {/* Export Code & Spritesheet Modal */}
      {showExportModal && (
        <ExportModal
          isOpen={showExportModal}
          preset={activePreset}
          palette={activePalette}
          params={shaderParams}
          onClose={() => setShowExportModal(false)}
        />
      )}
    </div>
  );
}

export default function App() {
  const [activeApp, setActiveApp] = useState<'dashboard' | 'fish_audio' | 'skill_creator'>('dashboard');

  // Render ONLY Fish Audio Studio when selected (Skill Creator canvas is completely unmounted)
  if (activeApp === 'fish_audio') {
    return <FishAudioApp onSwitchToArena={() => setActiveApp('dashboard')} />;
  }

  // Render ONLY Skill Creator when selected (Fish Audio Studio is completely unmounted)
  if (activeApp === 'skill_creator') {
    return (
      <SkillCreatorWorkspace
        onBackToDashboard={() => setActiveApp('dashboard')}
        onOpenFishAudio={() => setActiveApp('fish_audio')}
      />
    );
  }

  const savedGalleryCount = loadFishAudioGallery().length;
  const hasSavedApiKey = Boolean(loadSavedFishApiKey());

  return (
    <div className="min-h-screen w-screen obsidian-canvas text-zinc-100 font-sans flex flex-col justify-between overflow-y-auto">
      {/* Top Header Bar — 3-Zone Contract in Monochrome Liquid Glass + Chromatic Contour */}
      <header className="w-full liquid-glass border-b border-white/10">
        <div className="max-w-6xl mx-auto px-8 py-4 flex items-center justify-between gap-8">
          {/* Zone 1: Single-line Brand Wordmark */}
          <span className="text-base font-bold tracking-tight text-white whitespace-nowrap shrink-0">
            Studio Workspace Hub
          </span>

          {/* Zone 2: Clean Single-Line Nav Links */}
          <nav className="hidden md:flex items-center gap-6 text-xs font-medium text-zinc-400">
            <button
              onClick={() => setActiveApp('fish_audio')}
              className="hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Fish Audio Studio
            </button>
            <button
              onClick={() => setActiveApp('skill_creator')}
              className="hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Skill Creator & VFX Arena
            </button>
          </nav>

          {/* Zone 3: 1 Primary Action */}
          <div className="shrink-0">
            <button
              onClick={() => setActiveApp('fish_audio')}
              className="px-4 py-2 text-xs rounded-lg btn-monochrome-primary whitespace-nowrap shrink-0 cursor-pointer"
            >
              Abrir Fish Audio Studio
            </button>
          </div>
        </div>
        <div className="chromatic-divider" />
      </header>

      {/* Main Content Container */}
      <main className="flex-1 flex items-center justify-center px-8 py-12">
        <div className="max-w-6xl w-full space-y-10">
          {/* Intro Section */}
          <div className="space-y-2 max-w-2xl">
            <h1 className="text-3xl font-bold tracking-tight text-white">
              Selecione o Ambiente de Produção
            </h1>
            <p className="text-sm text-zinc-400 leading-relaxed">
              Cada estúdio executa de forma isolada com memória dedicada. Alterne entre a central de síntese vocal{' '}
              <strong className="text-white font-semibold">Fish Audio Studio</strong> e o laboratório visual{' '}
              <strong className="text-white font-semibold">Skill Creator & VFX Arena</strong>.
            </p>
          </div>

          {/* 2-Column Project Selector Grid with Liquid Glass & Chromatic Contours */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch">
            {/* CARD 1: FISH AUDIO STUDIO */}
            <div className="liquid-glass-elevated chromatic-border rounded-2xl p-8 flex flex-col justify-between">
              <div className="space-y-6">
                <div className="flex items-center justify-between gap-4">
                  <div className="w-12 h-12 rounded-xl liquid-glass border border-white/20 flex items-center justify-center text-white shrink-0">
                    <AudioWaveform className="w-6 h-6" />
                  </div>
                  <span className="text-xs font-mono text-zinc-300 tabular-nums">
                    {hasSavedApiKey ? 'API s2.1-pro-free conectada' : 'API configurável'} · Isolado
                  </span>
                </div>

                <div className="space-y-2">
                  <h2 className="text-2xl font-bold text-white tracking-tight">
                    Fish Audio Studio
                  </h2>
                  <p className="text-sm text-zinc-400 leading-relaxed">
                    Estúdio de síntese vocal em Português com Mini Seletor lateral completo, busca ao vivo na API Fish Audio, sincronização de vozes Favoritas, tags de entonação e lote CSV.
                  </p>
                </div>

                {/* Key Metrics — Clean Unboxed Tabular Numerals */}
                <div className="grid grid-cols-3 gap-4 pt-4 border-t border-white/10">
                  <div>
                    <div className="text-xs text-zinc-400">Tags Oficiais</div>
                    <div className="text-lg font-bold text-white font-mono tabular-nums mt-0.5">
                      {FISH_AUDIO_EXPRESSION_TAGS.length}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-zinc-400">Entonação & Tom</div>
                    <div className="text-lg font-bold text-white font-mono tabular-nums mt-0.5">
                      14 Tons
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-zinc-400">Galeria Salva</div>
                    <div className="text-lg font-bold text-white font-mono tabular-nums mt-0.5">
                      {savedGalleryCount} Áudios
                    </div>
                  </div>
                </div>

                <div className="space-y-2 text-xs text-zinc-300 pt-1">
                  <div>01. Mini Seletor de Vozes completo na barra lateral + Seletor em 3 colunas</div>
                  <div>02. Pesquisa em tempo real por nome, personagem ou criador na API Fish Audio</div>
                  <div>03. Inserção limpa de tags de entonação, pausa e emoção + importador CSV</div>
                </div>
              </div>

              <div className="pt-6 mt-6 border-t border-white/10">
                <button
                  onClick={() => setActiveApp('fish_audio')}
                  className="w-full py-3 px-5 btn-monochrome-primary text-sm rounded-xl flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap"
                >
                  <span>Entrar no Fish Audio Studio</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* CARD 2: SKILL CREATOR & VFX ARENA */}
            <div className="liquid-glass chromatic-border-subtle rounded-2xl p-8 flex flex-col justify-between">
              <div className="space-y-6">
                <div className="flex items-center justify-between gap-4">
                  <div className="w-12 h-12 rounded-xl liquid-glass border border-white/20 flex items-center justify-center text-white shrink-0">
                    <Sparkles className="w-6 h-6" />
                  </div>
                  <span className="text-xs font-mono text-zinc-400 tabular-nums">
                    Engine 2D · Shaders & Sprites
                  </span>
                </div>

                <div className="space-y-2">
                  <h2 className="text-2xl font-bold text-white tracking-tight">
                    Skill Creator & VFX Arena
                  </h2>
                  <p className="text-sm text-zinc-400 leading-relaxed">
                    Laboratório visual de criação e validação de magias 2D, partículas instanciadas, customização de personagens com sprites direcionais PNG e diálogos TreeChat.
                  </p>
                </div>

                {/* Key Metrics — Clean Unboxed Tabular Numerals */}
                <div className="grid grid-cols-3 gap-4 pt-4 border-t border-white/10">
                  <div>
                    <div className="text-xs text-zinc-400">Catálogo VFX</div>
                    <div className="text-lg font-bold text-white font-mono tabular-nums mt-0.5">
                      {VFX_PRESETS.length} Skills
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-zinc-400">Paletas Elementais</div>
                    <div className="text-lg font-bold text-white font-mono tabular-nums mt-0.5">
                      {ELEMENTAL_PALETTES.length} Temas
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-zinc-400">Classes / Tags</div>
                    <div className="text-lg font-bold text-white font-mono tabular-nums mt-0.5">
                      {VFX_TAGS.length} Grupos
                    </div>
                  </div>
                </div>

                <div className="space-y-2 text-xs text-zinc-300 pt-1">
                  <div>01. Disparo interativo de magias, ajuste de escala, hitstop e câmera</div>
                  <div>02. Importação de pastas PNG de 4 direções para personagens e fundos</div>
                  <div>03. Exportação de módulos TypeScript e Spritesheets PNG prontos</div>
                </div>
              </div>

              <div className="pt-6 mt-6 border-t border-white/10">
                <button
                  onClick={() => setActiveApp('skill_creator')}
                  className="w-full py-3 px-5 btn-liquid-glass text-sm font-semibold rounded-xl flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap"
                >
                  <span>Entrar no Skill Creator</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Quiet Footer */}
      <footer className="w-full border-t border-white/10 liquid-glass py-4 px-8">
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-4 text-xs text-zinc-400">
          <span>
            Alterne entre os módulos a qualquer momento pelo botão Dashboard no topo de cada tela.
          </span>
          <span className="font-mono text-zinc-300">
            Execução independente de recursos ativa
          </span>
        </div>
      </footer>
    </div>
  );
}

