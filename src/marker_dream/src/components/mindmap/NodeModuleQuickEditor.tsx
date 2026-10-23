import React, { useState, useEffect } from 'react';
import {
  X,
  Zap,
  Shield,
  Heart,
  Swords,
  MessageSquare,
  Sparkles,
  PackageOpen,
  Compass,
  Volume2,
  Sun,
  Check,
  Plus,
  Trash2,
  Sliders,
  Video,
  Award,
} from 'lucide-react';
import type { MapProject, SavedLevel, MarkerType } from '../../types/map';
import type { MindMapNode } from './MindMapStudio';
import {
  NodeEditorLink,
  NodeQuickConfig,
  getEditorMeta,
} from './editorContentCatalog';
import { MobbyManager, Mobby, MobbyDialogue } from '../../../../core/MobbyManager';
import defaultStoreJson from '../../../../core/store.json';
import defaultScenariosJson from '../../../../core/scenarios.json';
import defaultSoundsJson from '../../../../core/sounds.json';

export interface QuickEditorProps {
  node: MindMapNode;
  editorLink: NodeEditorLink;
  project?: MapProject;
  savedLevels?: SavedLevel[];
  onUpdateProject?: (updater: (prev: MapProject) => MapProject) => void;
  onSaveUpdates: (
    updatedEditorLink: NodeEditorLink,
    nodeUpdates?: Partial<MindMapNode>
  ) => void;
  onClose: () => void;
  showToast: (msg: string) => void;
}

type QuickTab = 'balance' | 'narrative' | 'triggers';

export const NodeModuleQuickEditor: React.FC<QuickEditorProps> = ({
  node,
  editorLink,
  project,
  savedLevels = [],
  onUpdateProject,
  onSaveUpdates,
  onClose,
  showToast,
}) => {
  const meta = getEditorMeta(editorLink.editorId);
  const [activeTab, setActiveTab] = useState<QuickTab>('balance');

  // Node basic fields
  const [nodeTitle, setNodeTitle] = useState<string>(node.title);
  const [nodeDescription, setNodeDescription] = useState<string>(node.description || '');
  const [itemLabel, setItemLabel] = useState<string>(editorLink.itemLabel);
  const [actionTrigger, setActionTrigger] = useState<string>(editorLink.actionTrigger || '');

  // Hydrate initial quickConfig from live engine data if available
  const [cfg, setCfg] = useState<NodeQuickConfig>(() => {
    const base: NodeQuickConfig = {
      hp: 150,
      maxHp: 150,
      atk: 20,
      defense: 10,
      speed: 4,
      manaCost: 2,
      scale: 100,
      price: 100,
      currency: 'gold',
      rarity: 'rare',
      cardsCount: 9,
      packMode: 'random',
      dropRates: { common: 70, rare: 25, legendary: 5 },
      published: true,
      markerType: 'npc',
      solidCollision: true,
      hasLight: false,
      lightRadius: 160,
      lightColor: '#f59e0b',
      lightFlicker: true,
      isPortal: false,
      travelTargetType: 'level',
      travelAuto: true,
      npcBounce: true,
      jellyEffect: 'jelly',
      actionNpcEnabled: false,
      actionNpcRole: 'hostile',
      detectionRadius: 120,
      speakerName: node.title,
      dialogueText: '',
      npcPhrases: ['Saudações, aventureiro de Slimeslands!'],
      hintText: '',
      audioVolume: 0.8,
      weatherType: 'none',
      particleType: 'none',
      chromaKeyEnabled: false,
      chromaKeyColor: '#00ff00',
      chromaKeyTolerance: 35,
      triggerCondition: 'proximity',
      questKind: 'collect',
      questRequiredAmount: 3,
      questResourceName: 'Cristal de Gel',
      rewardGold: 150,
      rewardXp: 75,
      ...(editorLink.quickConfig || {}),
    };

    // Hydrate from MobbyManager if mobby/boss
    if (
      editorLink.editorId === 'mobbys' ||
      editorLink.subCategory === 'bosses' ||
      editorLink.itemId.startsWith('mob-') ||
      editorLink.itemId.startsWith('live-mobby-') ||
      editorLink.itemId === 'npc-titan' ||
      editorLink.itemId === 'npc-queen'
    ) {
      const mobbyList = MobbyManager.getMobbys();
      const targetMobbyId =
        base.mobbyId ||
        editorLink.realEntityId ||
        (editorLink.itemId.includes('queen') || editorLink.itemId.includes('vulcanico')
          ? 'slime_vulcanico'
          : 'slime_colosso');
      const foundMobby =
        mobbyList.find((m) => m.id === targetMobbyId) || mobbyList[0];
      if (foundMobby && !editorLink.quickConfig?.hp) {
        base.mobbyId = foundMobby.id;
        base.hp = foundMobby.hp;
        base.maxHp = foundMobby.maxHp || foundMobby.hp;
        base.atk = foundMobby.atk;
        base.scale = foundMobby.scale ?? 150;
        base.rewardCardId = foundMobby.rewardCardId || '04 obsidiana';
        base.artifacts = foundMobby.artifacts || ['art_escudo', 'art_golpe'];
        base.mobbyDialogues =
          foundMobby.dialogues && foundMobby.dialogues.length > 0
            ? JSON.parse(JSON.stringify(foundMobby.dialogues))
            : [
                {
                  triggerType: 'turn_reached',
                  triggerValue: 1,
                  speaker: 'mobby',
                  text: 'Quem ousa invadir meu domínio?!',
                },
                {
                  triggerType: 'hp_below',
                  triggerValue: 50,
                  speaker: 'mobby',
                  text: 'Agora você verá minha fúria verdadeira!',
                },
              ];
        base.backgroundUrl = foundMobby.backgroundUrl || '';
        base.bgmUrl = foundMobby.bgmUrl || '/sounds/battle_2.mp3';
      }
    }

    // Hydrate from project marker if linked
    if (project && (base.markerId || editorLink.realEntityId)) {
      const targetId = base.markerId || editorLink.realEntityId;
      const foundMarker = (project.markers || []).find((m) => m.id === targetId);
      if (foundMarker) {
        base.markerId = foundMarker.id;
        base.markerType = foundMarker.type;
        base.solidCollision = !!foundMarker.solidCollision;
        base.hasLight = foundMarker.type === 'light' || !!foundMarker.lightConfig;
        base.lightRadius = foundMarker.lightConfig?.radius ?? 160;
        base.lightColor = foundMarker.lightConfig?.color ?? '#f59e0b';
        base.lightFlicker = foundMarker.lightConfig?.flicker ?? true;
        base.isPortal = foundMarker.type === 'travel' || foundMarker.type === 'portal';
        base.travelTargetType = foundMarker.travelTargetType || 'level';
        base.travelTargetId =
          foundMarker.targetLevelId ||
          foundMarker.targetTravelMarkerId ||
          foundMarker.targetSubBiomeId;
        base.travelAuto = foundMarker.travelAuto ?? true;
        base.npcBounce = foundMarker.npcBounce ?? true;
        base.jellyEffect = (foundMarker.effect as any) || 'jelly';
        base.actionNpcEnabled = !!foundMarker.actionNpc?.enabled;
        base.actionNpcRole = (foundMarker.actionNpc?.role as any) || 'hostile';
        if (foundMarker.actionNpc) {
          base.hp = foundMarker.actionNpc.health ?? foundMarker.actionNpc.maxHp ?? base.hp;
          base.maxHp = foundMarker.actionNpc.maxHp ?? base.maxHp;
          base.atk = foundMarker.actionNpc.attackDamage ?? base.atk;
          base.detectionRadius = foundMarker.actionNpc.detectionRadius ?? 120;
        }
        base.speakerName = foundMarker.dialogueCharacterName || foundMarker.name;
        base.dialogueText =
          foundMarker.dialogueText ||
          foundMarker.dialogueSteps?.[0]?.text ||
          foundMarker.npcPhrases?.[0] ||
          base.dialogueText;
        if (foundMarker.npcPhrases && foundMarker.npcPhrases.length > 0) {
          base.npcPhrases = [...foundMarker.npcPhrases];
        }
        if (foundMarker.quest) {
          base.questKind = foundMarker.quest.kind;
          base.questRequiredAmount = foundMarker.quest.requiredAmount ?? 3;
          base.questResourceName = foundMarker.quest.resourceName ?? 'Cristal';
        }
      }
    }

    // Hydrate from Store Boosters if booster
    if (editorLink.editorId === 'boosters' || editorLink.editorId === 'store') {
      try {
        let storeData: any = defaultStoreJson;
        const raw = localStorage.getItem('forge_store');
        if (raw) storeData = JSON.parse(raw);
        const packs = storeData?.packs || [];
        const foundPack =
          packs.find((p: any) => p.id === (base.packId || editorLink.realEntityId)) ||
          packs[0];
        if (foundPack && !editorLink.quickConfig?.dropRates) {
          base.packId = foundPack.id;
          base.price = foundPack.price ?? 0;
          base.currency = foundPack.currency === 'gems' ? 'gems' : 'gold';
          base.cardsCount = foundPack.cardsCount ?? 9;
          base.packMode = foundPack.mode || 'special';
          base.dropRates = foundPack.rates || { common: 75, rare: 20, legendary: 5 };
          base.published = foundPack.published ?? true;
        }
      } catch {}
    }

    return base;
  });

  const updateCfg = (patch: Partial<NodeQuickConfig>) => {
    setCfg((prev) => ({ ...prev, ...patch }));
  };

  const isMobbyModule =
    editorLink.editorId === 'mobbys' ||
    editorLink.subCategory === 'bosses' ||
    editorLink.subCategory === 'mobby_bosses' ||
    editorLink.subCategory === 'mobby_dialogues' ||
    editorLink.itemId.startsWith('mob-') ||
    editorLink.itemId.startsWith('live-mobby-');

  const isNpcOrMarkerModule =
    editorLink.editorId === 'markers' ||
    editorLink.editorId === 'npcs' ||
    editorLink.editorId === 'characters' ||
    editorLink.editorId === 'pets';

  const isBoosterOrStoreModule =
    editorLink.editorId === 'boosters' ||
    editorLink.editorId === 'store' ||
    editorLink.editorId === 'cards' ||
    editorLink.editorId === 'card_engine' ||
    editorLink.editorId === 'arsenal';

  const isScenarioOrAudioModule =
    editorLink.editorId === 'scenarios' ||
    editorLink.editorId === 'sound' ||
    editorLink.editorId === 'atmosphere' ||
    editorLink.editorId === 'levels';

  const soundLibrary: { url: string; name: string }[] =
    (defaultSoundsJson as any)?.library || [];

  // Add/Remove Mobby Dialogue
  const handleAddMobbyDialogue = () => {
    const cur = cfg.mobbyDialogues || [];
    updateCfg({
      mobbyDialogues: [
        ...cur,
        {
          triggerType: 'hp_below',
          triggerValue: 30,
          speaker: 'mobby',
          text: 'Vocês nunca terão minha carta lendária!',
        },
      ],
    });
  };

  const handleUpdateMobbyDialogue = (idx: number, patch: Partial<MobbyDialogue>) => {
    const cur = [...(cfg.mobbyDialogues || [])];
    cur[idx] = { ...cur[idx], ...patch };
    updateCfg({ mobbyDialogues: cur });
  };

  const handleRemoveMobbyDialogue = (idx: number) => {
    const cur = (cfg.mobbyDialogues || []).filter((_, i) => i !== idx);
    updateCfg({ mobbyDialogues: cur });
  };

  // Persist everything to the real engine stores & MindMap history
  const handleApplyAndSave = () => {
    let syncedTargets: string[] = [];

    // 1. Persist Mobby Boss changes to MobbyManager (localStorage + /api/save-mobbys)
    if (isMobbyModule) {
      const mobbyList = MobbyManager.getMobbys();
      const targetId = cfg.mobbyId || editorLink.realEntityId || `mobby_${node.id.replace(/[^a-zA-Z0-9]/g, '_')}`;
      const existing = mobbyList.find((m) => m.id === targetId) || mobbyList[0];

      const updatedMobby: Mobby = {
        id: existing ? existing.id : targetId,
        name: nodeTitle.replace(/^Mobby:\s*/i, '').trim() || existing?.name || 'Mobby Chefe',
        description: nodeDescription || existing?.description || 'Chefe configurado via Mapa Mental',
        image: existing?.image || '/cards/1791856764818_cfcc2709-bf95-4b0e-8a39-7cc96830c148.png',
        hp: Number(cfg.hp ?? 250),
        maxHp: Number(cfg.maxHp ?? cfg.hp ?? 250),
        atk: Number(cfg.atk ?? 20),
        rewardCardId: cfg.rewardCardId || existing?.rewardCardId || '04 obsidiana',
        artifacts: cfg.artifacts && cfg.artifacts.length > 0 ? cfg.artifacts : existing?.artifacts || ['art_escudo', 'art_golpe'],
        dialogues:
          cfg.mobbyDialogues && cfg.mobbyDialogues.length > 0
            ? cfg.mobbyDialogues
            : existing?.dialogues || [],
        scale: Number(cfg.scale ?? existing?.scale ?? 150),
        backgroundUrl: cfg.backgroundUrl || existing?.backgroundUrl,
        bgmUrl: cfg.bgmUrl || existing?.bgmUrl,
        attackSfxUrl: cfg.sfxUrl || existing?.attackSfxUrl,
        rotation: existing?.rotation ?? 0,
        offsetX: existing?.offsetX ?? 0,
        offsetY: existing?.offsetY ?? 0,
      };

      MobbyManager.upsertMobby(updatedMobby);
      cfg.mobbyId = updatedMobby.id;
      syncedTargets.push(`Mobby "${updatedMobby.name}" (HP ${updatedMobby.hp} / ATK ${updatedMobby.atk})`);
    }

    // 2. Persist Booster / Store changes to localStorage('forge_store') + /api/save-store
    if (editorLink.editorId === 'boosters' || editorLink.editorId === 'store') {
      try {
        let storeData: any = JSON.parse(JSON.stringify(defaultStoreJson));
        const raw = localStorage.getItem('forge_store');
        if (raw) storeData = JSON.parse(raw);
        if (!Array.isArray(storeData.packs)) storeData.packs = [];

        const packId = cfg.packId || editorLink.realEntityId || 'booster_starter';
        const packIdx = storeData.packs.findIndex((p: any) => p.id === packId);
        const packPayload = {
          ...(packIdx >= 0 ? storeData.packs[packIdx] : {}),
          id: packId,
          name: nodeTitle.replace(/^Booster:\s*/i, '').trim() || 'Booster Customizado',
          desc: nodeDescription || 'Pacote configurado via Quick Edit no Mapa Mental',
          price: Number(cfg.price ?? 100),
          currency: cfg.currency || 'gold',
          cardsCount: Number(cfg.cardsCount ?? 9),
          mode: cfg.packMode || 'random',
          rates: cfg.dropRates || { common: 70, rare: 25, legendary: 5 },
          published: cfg.published ?? true,
        };

        if (packIdx >= 0) {
          storeData.packs[packIdx] = packPayload;
        } else {
          storeData.packs.push(packPayload);
        }

        localStorage.setItem('forge_store', JSON.stringify(storeData));
        fetch('/api/save-store', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(storeData),
        }).catch(() => {});
        syncedTargets.push(`Booster "${packPayload.name}"`);
      } catch {}
    }

    // 3. Persist Scenario / Audio changes to localStorage('forge_scenarios') + /api/save-scenarios
    if (editorLink.editorId === 'scenarios') {
      try {
        let scenariosData: any = JSON.parse(JSON.stringify(defaultScenariosJson));
        const raw = localStorage.getItem('forge_scenarios');
        if (raw) scenariosData = { ...scenariosData, ...JSON.parse(raw) };
        if (!scenariosData.__meta) scenariosData.__meta = {};

        const scnId = cfg.scenarioScreenId || editorLink.realEntityId || 'battle';
        const prevMeta = scenariosData.__meta[scnId] || {};
        const bgUrl = cfg.backgroundUrl || prevMeta.url || '/cards/Obscure_summoning_dnd_battle_map.jpg';
        const isVid = /\.(mp4|webm|mov)$/i.test(bgUrl);

        const nextMeta = {
          ...prevMeta,
          mode: 'image',
          url: bgUrl,
          mediaType: isVid ? 'video' : 'image',
          particles: {
            type: cfg.particleType || 'none',
            color: '#ffaa00',
            count: 24,
          },
        };
        scenariosData.__meta[scnId] = nextMeta;
        scenariosData[scnId] = JSON.stringify({
          mode: 'image',
          url: bgUrl,
          mediaType: isVid ? 'video' : 'image',
          filter: 'none',
          filterVal: 20,
          particles: nextMeta.particles,
        });

        localStorage.setItem('forge_scenarios', JSON.stringify(scenariosData));
        fetch('/api/save-scenarios', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(scenariosData),
        }).catch(() => {});
        syncedTargets.push(`Cenário "${scnId}"`);
      } catch {}
    }

    // 4. Persist Marker / NPC / Atmosphere / Biome updates directly to active MapProject
    if (onUpdateProject && project) {
      const targetMarkerId = cfg.markerId || editorLink.realEntityId;
      const hasMatchingMarker =
        targetMarkerId && (project.markers || []).some((m) => m.id === targetMarkerId);

      if (hasMatchingMarker || isNpcOrMarkerModule || isScenarioOrAudioModule) {
        onUpdateProject((prev) => {
          let nextMarkers = [...(prev.markers || [])];
          if (hasMatchingMarker) {
            nextMarkers = nextMarkers.map((m) => {
              if (m.id !== targetMarkerId) return m;
              const phrases =
                cfg.npcPhrases && cfg.npcPhrases.length > 0
                  ? cfg.npcPhrases
                  : cfg.dialogueText
                  ? [cfg.dialogueText]
                  : m.npcPhrases;
              return {
                ...m,
                name: nodeTitle || m.name,
                description: nodeDescription || m.description,
                type: cfg.markerType || m.type,
                solidCollision: cfg.solidCollision ?? m.solidCollision,
                npcBounce: cfg.npcBounce ?? m.npcBounce,
                effect: cfg.jellyEffect || m.effect,
                lightConfig: cfg.hasLight
                  ? {
                      preset: 'torch',
                      radius: Number(cfg.lightRadius ?? 160),
                      color: cfg.lightColor || '#f59e0b',
                      intensity: 0.85,
                      flicker: cfg.lightFlicker ?? true,
                    }
                  : m.lightConfig,
                travelTargetType: cfg.isPortal ? cfg.travelTargetType || 'level' : m.travelTargetType,
                targetLevelId:
                  cfg.isPortal && cfg.travelTargetType === 'level'
                    ? cfg.travelTargetId
                    : m.targetLevelId,
                travelAuto: cfg.travelAuto ?? m.travelAuto,
                dialogueEnabled: !!(cfg.dialogueText || (phrases && phrases.length > 0)),
                dialogueCharacterName: cfg.speakerName || nodeTitle || m.name,
                dialogueText: cfg.dialogueText || phrases?.[0] || m.dialogueText,
                npcPhrases: phrases,
                actionNpc: cfg.actionNpcEnabled
                  ? {
                      ...(m.actionNpc || {
                        enabled: true,
                        role: 'hostile',
                        detectionRadius: 120,
                        sensoryRadius: 240,
                        attacks: {
                          jump: { enabled: true, damage: Number(cfg.atk ?? 20), cooldown: 2.5 },
                        },
                      }),
                      enabled: true,
                      role: cfg.actionNpcRole || 'hostile',
                      health: Number(cfg.hp ?? 100),
                      maxHealth: Number(cfg.maxHp ?? cfg.hp ?? 100),
                      maxHp: Number(cfg.maxHp ?? cfg.hp ?? 100),
                      attackDamage: Number(cfg.atk ?? 20),
                      detectionRadius: Number(cfg.detectionRadius ?? 120),
                      speechPhrases: phrases as any,
                    }
                  : m.actionNpc
                  ? { ...m.actionNpc, enabled: false }
                  : undefined,
                quest: cfg.questKind
                  ? {
                      ...(m.quest || {}),
                      kind: cfg.questKind,
                      title: nodeTitle,
                      instructions: actionTrigger || nodeDescription,
                      resourceName: cfg.questResourceName || 'Item',
                      requiredAmount: Number(cfg.questRequiredAmount ?? 1),
                    }
                  : m.quest,
              };
            });
            syncedTargets.push(`Marcador "${nodeTitle}" na Fase`);
          }

          // Also sync biome weather / BGM if atmosphere or biome module
          let nextBiomes = prev.biomes || [];
          if (
            (editorLink.editorId === 'atmosphere' || editorLink.editorId === 'levels' || editorLink.editorId === 'sound') &&
            nextBiomes.length > 0
          ) {
            nextBiomes = nextBiomes.map((b, i) =>
              i === 0 || b.id === editorLink.realEntityId
                ? {
                    ...b,
                    biomeEvent:
                      cfg.weatherType && cfg.weatherType !== 'none' && cfg.weatherType !== 'fog' && cfg.weatherType !== 'snow'
                        ? (cfg.weatherType as any)
                        : b.biomeEvent,
                    bgmAudioUrl: cfg.bgmUrl || b.bgmAudioUrl,
                    bgmVolume: cfg.audioVolume ?? b.bgmVolume,
                  }
                : b
            );
          }

          return {
            ...prev,
            markers: nextMarkers,
            biomes: nextBiomes,
            rainConfig:
              cfg.weatherType === 'rain'
                ? { ...(prev.rainConfig || { intensity: 45, splashCount: 24, splashSize: 26, speed: 0.5 }), enabled: true }
                : prev.rainConfig,
            fogConfig:
              cfg.weatherType === 'fog'
                ? { ...(prev.fogConfig || { fogCount: 6, opacity: 0.3, speed: 30, tintColor: '#ffffff', groundLevelPercent: 60 }), enabled: true }
                : prev.fogConfig,
            snowConfig:
              cfg.weatherType === 'snow'
                ? { ...(prev.snowConfig || { density: 6, speed: 3.2, windDrift: 15, accumulateOnPlayer: true, accumulateOnGround: true, chromaticSparkle: true }), enabled: true }
                : prev.snowConfig,
          };
        });
      }
    }

    // Build dynamic label with key stats if appropriate
    let updatedItemLabel = itemLabel;
    if (isMobbyModule && cfg.hp !== undefined && cfg.atk !== undefined) {
      const baseName = itemLabel.replace(/\s*\(HP:.*?\)/i, '').trim();
      updatedItemLabel = `${baseName} (HP: ${cfg.hp} / ATK: ${cfg.atk})`;
    }

    const updatedLink: NodeEditorLink = {
      ...editorLink,
      itemLabel: updatedItemLabel,
      actionTrigger,
      quickConfig: cfg,
    };

    onSaveUpdates(updatedLink, {
      title: nodeTitle,
      description: nodeDescription,
    });

    showToast(
      syncedTargets.length > 0
        ? `⚡ Salvo em Tempo Real: ${syncedTargets.join(' + ')}!`
        : `⚡ Propriedades de "${nodeTitle}" atualizadas no Card!`
    );
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-end bg-black/75 backdrop-blur-sm animate-fadeIn select-none"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-xl h-full bg-[#0b0d14] border-l border-zinc-800 shadow-2xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-zinc-800 bg-zinc-900/80 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className={`w-10 h-10 rounded-xl border ${meta.borderColor} ${meta.bgColor} flex items-center justify-center text-lg shrink-0 shadow-lg`}
            >
              {meta.icon}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                  <Zap className="w-3 h-3" /> In-Card Quick Edit
                </span>
                <span className={`text-[10px] font-bold uppercase ${meta.textColor}`}>
                  {meta.name}
                </span>
              </div>
              <h2 className="text-sm font-bold text-white truncate mt-0.5">
                {nodeTitle || editorLink.itemLabel}
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg bg-zinc-800/80 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Sub-Tabs */}
        <div className="px-5 pt-3 bg-zinc-950/80 border-b border-zinc-800 flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('balance')}
            className={`px-3.5 py-2 rounded-t-xl text-xs font-bold flex items-center gap-1.5 border-b-2 transition-all cursor-pointer ${
              activeTab === 'balance'
                ? 'border-pink-500 text-white bg-pink-500/10'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Sliders className="w-3.5 h-3.5 text-pink-400" />
            <span>Status & Balanceamento</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('narrative')}
            className={`px-3.5 py-2 rounded-t-xl text-xs font-bold flex items-center gap-1.5 border-b-2 transition-all cursor-pointer ${
              activeTab === 'narrative'
                ? 'border-amber-500 text-white bg-amber-500/10'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5 text-amber-400" />
            <span>Narrativa & Falas</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('triggers')}
            className={`px-3.5 py-2 rounded-t-xl text-xs font-bold flex items-center gap-1.5 border-b-2 transition-all cursor-pointer ${
              activeTab === 'triggers'
                ? 'border-cyan-500 text-white bg-cyan-500/10'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Zap className="w-3.5 h-3.5 text-cyan-400" />
            <span>Gatilhos & Regras</span>
          </button>
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Card Identity Bar (always accessible) */}
          <div className="p-3.5 rounded-xl bg-zinc-900/60 border border-zinc-800/90 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">
                  Nome no Card / Entidade
                </label>
                <input
                  type="text"
                  value={nodeTitle}
                  onChange={(e) => setNodeTitle(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-white focus:outline-none focus:border-pink-500"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">
                  Rótulo do Módulo Vinculado
                </label>
                <input
                  type="text"
                  value={itemLabel}
                  onChange={(e) => setItemLabel(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-zinc-200 focus:outline-none focus:border-pink-500"
                />
              </div>
            </div>
          </div>

          {/* =========================================================
              TAB 1: STATUS & BALANCEAMENTO
             ========================================================= */}
          {activeTab === 'balance' && (
            <div className="space-y-4">
              {/* SECTION A: MOBBY BOSS / COMBATE / NPC */}
              {(isMobbyModule || isNpcOrMarkerModule || editorLink.editorId === 'arsenal' || editorLink.editorId === 'card_engine') && (
                <div className="p-4 rounded-xl bg-rose-950/20 border border-rose-500/30 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-rose-300 flex items-center gap-1.5">
                      <Swords className="w-4 h-4 text-rose-400" />
                      Atributos de Combate & Vida
                    </span>
                    {isMobbyModule && (
                      <span className="text-[10px] px-2 py-0.5 rounded bg-rose-500/20 text-rose-200 font-mono">
                        Sincronizado com MobbyManager
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    <div>
                      <label className="text-[10px] text-zinc-400 font-semibold block mb-1">
                        ❤️ HP / Vida
                      </label>
                      <input
                        type="number"
                        value={cfg.hp ?? 150}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          updateCfg({ hp: val, maxHp: Math.max(val, cfg.maxHp || val) });
                        }}
                        className="w-full px-2.5 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-xs font-bold text-emerald-400 focus:outline-none focus:border-rose-500"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] text-zinc-400 font-semibold block mb-1">
                        ⚔️ Ataque (ATK)
                      </label>
                      <input
                        type="number"
                        value={cfg.atk ?? 20}
                        onChange={(e) => updateCfg({ atk: Number(e.target.value) })}
                        className="w-full px-2.5 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-xs font-bold text-rose-400 focus:outline-none focus:border-rose-500"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] text-zinc-400 font-semibold block mb-1">
                        🛡️ Defesa
                      </label>
                      <input
                        type="number"
                        value={cfg.defense ?? 10}
                        onChange={(e) => updateCfg({ defense: Number(e.target.value) })}
                        className="w-full px-2.5 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-xs font-bold text-sky-400 focus:outline-none focus:border-rose-500"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] text-zinc-400 font-semibold block mb-1">
                        📐 Escala (%)
                      </label>
                      <input
                        type="number"
                        value={cfg.scale ?? 100}
                        onChange={(e) => updateCfg({ scale: Number(e.target.value) })}
                        className="w-full px-2.5 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-xs font-bold text-amber-300 focus:outline-none focus:border-rose-500"
                      />
                    </div>
                  </div>

                  {isMobbyModule && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-rose-500/20">
                      <div>
                        <label className="text-[10px] text-zinc-400 font-semibold block mb-1">
                          🎴 Carta de Recompensa (ID ou Título)
                        </label>
                        <input
                          type="text"
                          value={cfg.rewardCardId || ''}
                          onChange={(e) => updateCfg({ rewardCardId: e.target.value })}
                          placeholder="Ex: 04 obsidiana"
                          className="w-full px-2.5 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-amber-200 focus:outline-none focus:border-rose-500"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-zinc-400 font-semibold block mb-1">
                          💍 Artefatos do Chefe (separados por vírgula)
                        </label>
                        <input
                          type="text"
                          value={(cfg.artifacts || []).join(', ')}
                          onChange={(e) =>
                            updateCfg({
                              artifacts: e.target.value
                                .split(',')
                                .map((s) => s.trim())
                                .filter(Boolean),
                            })
                          }
                          placeholder="art_escudo, art_golpe, art_nuke"
                          className="w-full px-2.5 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-zinc-200 focus:outline-none focus:border-rose-500"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* SECTION B: MARCADOR DO MAPA (Colisão, Luz, Portal, Action NPC, Física Jelly) */}
              {isNpcOrMarkerModule && (
                <div className="p-4 rounded-xl bg-zinc-900/70 border border-zinc-800 space-y-3.5">
                  <span className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                    <Compass className="w-4 h-4 text-emerald-400" />
                    Propriedades Físicas & Interativas do Marcador
                  </span>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] text-zinc-400 font-semibold block mb-1">
                        Tipo do Marcador no Mapa
                      </label>
                      <select
                        value={cfg.markerType || 'npc'}
                        onChange={(e) => updateCfg({ markerType: e.target.value as MarkerType })}
                        className="w-full px-2.5 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-white"
                      >
                        <option value="npc">🧙‍♂️ NPC / Criatura</option>
                        <option value="boss">💀 Arena de Chefe (Boss)</option>
                        <option value="travel">🌀 Portal Travel (Teleporte)</option>
                        <option value="collectible">📦 Item Coletável</option>
                        <option value="deliverable">🚩 Ponto de Entrega</option>
                        <option value="treasure">💎 Baú de Tesouro</option>
                        <option value="light">💡 Ponto de Luz / Tocha</option>
                        <option value="camp">⛺ Acampamento / Checkpoint</option>
                        <option value="town">🏘️ Vila / Povoado</option>
                        <option value="castle">🏰 Castelo / Fortaleza</option>
                        <option value="event">⚡ Gatilho de Evento</option>
                        <option value="neutral">🪨 Objeto Cenográfico</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] text-zinc-400 font-semibold block mb-1">
                        Física / Efeito Visual (Motion)
                      </label>
                      <select
                        value={cfg.jellyEffect || 'jelly'}
                        onChange={(e) => updateCfg({ jellyEffect: e.target.value as any })}
                        className="w-full px-2.5 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-white"
                      >
                        <option value="jelly">🍮 Gelatina (Squash & Stretch)</option>
                        <option value="water">🌊 Ondulação Fluida</option>
                        <option value="fire">🔥 Chama Viva</option>
                        <option value="glow">✨ Pulso Luminoso</option>
                        <option value="none">⏹️ Estático (Sem Deformação)</option>
                      </select>
                    </div>
                  </div>

                  {/* Quick Toggles: Solid, Light, Portal, Action NPC */}
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <label className="flex items-center gap-2 p-2.5 rounded-lg bg-zinc-950 border border-zinc-800 cursor-pointer hover:border-zinc-700">
                      <input
                        type="checkbox"
                        checked={!!cfg.solidCollision}
                        onChange={(e) => updateCfg({ solidCollision: e.target.checked })}
                        className="accent-pink-500"
                      />
                      <div>
                        <span className="text-xs font-semibold text-white block">🧱 Colisão Sólida</span>
                        <span className="text-[10px] text-zinc-400">Bloqueia passagem física</span>
                      </div>
                    </label>

                    <label className="flex items-center gap-2 p-2.5 rounded-lg bg-zinc-950 border border-zinc-800 cursor-pointer hover:border-zinc-700">
                      <input
                        type="checkbox"
                        checked={!!cfg.hasLight}
                        onChange={(e) => updateCfg({ hasLight: e.target.checked })}
                        className="accent-amber-500"
                      />
                      <div>
                        <span className="text-xs font-semibold text-white block">💡 Emite Luz Dinâmica</span>
                        <span className="text-[10px] text-zinc-400">Dissipa névoa e escuridão</span>
                      </div>
                    </label>

                    <label className="flex items-center gap-2 p-2.5 rounded-lg bg-zinc-950 border border-zinc-800 cursor-pointer hover:border-zinc-700">
                      <input
                        type="checkbox"
                        checked={!!cfg.isPortal}
                        onChange={(e) =>
                          updateCfg({
                            isPortal: e.target.checked,
                            markerType: e.target.checked ? 'travel' : cfg.markerType,
                          })
                        }
                        className="accent-purple-500"
                      />
                      <div>
                        <span className="text-xs font-semibold text-white block">🌀 É Portal / Viagem</span>
                        <span className="text-[10px] text-zinc-400">Teleporta para fase ou local</span>
                      </div>
                    </label>

                    <label className="flex items-center gap-2 p-2.5 rounded-lg bg-zinc-950 border border-zinc-800 cursor-pointer hover:border-zinc-700">
                      <input
                        type="checkbox"
                        checked={!!cfg.actionNpcEnabled}
                        onChange={(e) => updateCfg({ actionNpcEnabled: e.target.checked })}
                        className="accent-rose-500"
                      />
                      <div>
                        <span className="text-xs font-semibold text-white block">⚔️ IA Action NPC Ativa</span>
                        <span className="text-[10px] text-zinc-400">Combate e patrulha autônoma</span>
                      </div>
                    </label>
                  </div>

                  {/* Light sub-panel */}
                  {cfg.hasLight && (
                    <div className="p-3 rounded-lg bg-amber-950/20 border border-amber-500/30 grid grid-cols-3 gap-2.5">
                      <div>
                        <label className="text-[10px] text-amber-300 font-semibold block mb-1">
                          Raio da Luz (px)
                        </label>
                        <input
                          type="number"
                          value={cfg.lightRadius ?? 160}
                          onChange={(e) => updateCfg({ lightRadius: Number(e.target.value) })}
                          className="w-full px-2 py-1 rounded bg-zinc-950 border border-zinc-800 text-xs text-white"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-amber-300 font-semibold block mb-1">
                          Cor da Luz
                        </label>
                        <input
                          type="color"
                          value={cfg.lightColor || '#f59e0b'}
                          onChange={(e) => updateCfg({ lightColor: e.target.value })}
                          className="w-full h-7 rounded bg-zinc-950 border border-zinc-800 cursor-pointer"
                        />
                      </div>
                      <label className="flex items-center gap-1.5 pt-4 text-xs text-amber-200 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={cfg.lightFlicker ?? true}
                          onChange={(e) => updateCfg({ lightFlicker: e.target.checked })}
                        />
                        <span>Chama Tremeluzente</span>
                      </label>
                    </div>
                  )}
                </div>
              )}

              {/* SECTION C: BOOSTER 3D & ECONOMIA DA LOJA */}
              {isBoosterOrStoreModule && (
                <div className="p-4 rounded-xl bg-amber-950/20 border border-amber-500/30 space-y-3.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                      <PackageOpen className="w-4 h-4 text-amber-400" />
                      Configuração de Booster 3D, Taxas de Drop & Preço
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-200 font-mono">
                      TabPacks / TabStore
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2.5">
                    <div>
                      <label className="text-[10px] text-zinc-400 font-semibold block mb-1">
                        💰 Preço na Loja
                      </label>
                      <input
                        type="number"
                        value={cfg.price ?? 100}
                        onChange={(e) => updateCfg({ price: Number(e.target.value) })}
                        className="w-full px-2.5 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-xs font-bold text-amber-300"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-zinc-400 font-semibold block mb-1">
                        Moeda
                      </label>
                      <select
                        value={cfg.currency || 'gold'}
                        onChange={(e) => updateCfg({ currency: e.target.value as 'gold' | 'gems' })}
                        className="w-full px-2.5 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-white"
                      >
                        <option value="gold">🪙 Ouro (Gold)</option>
                        <option value="gems">💎 Gemas (Premium)</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] text-zinc-400 font-semibold block mb-1">
                        🃏 Nº de Cartas no Pack
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={15}
                        value={cfg.cardsCount ?? 9}
                        onChange={(e) => updateCfg({ cardsCount: Number(e.target.value) })}
                        className="w-full px-2.5 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-xs font-bold text-white"
                      />
                    </div>
                  </div>

                  {/* Drop Rates Sliders */}
                  <div className="p-3 rounded-lg bg-zinc-950/90 border border-zinc-800 space-y-2">
                    <span className="text-[10px] font-bold text-zinc-300 uppercase tracking-wider block">
                      🎲 Taxas de Drop por Raridade (%)
                    </span>
                    <div className="grid grid-cols-3 gap-2.5">
                      <div>
                        <label className="text-[10px] text-zinc-400 block mb-1">
                          Comum (%)
                        </label>
                        <input
                          type="number"
                          value={cfg.dropRates?.common ?? 70}
                          onChange={(e) =>
                            updateCfg({
                              dropRates: {
                                ...(cfg.dropRates || { common: 70, rare: 25, legendary: 5 }),
                                common: Number(e.target.value),
                              },
                            })
                          }
                          className="w-full px-2 py-1 rounded bg-zinc-900 border border-zinc-800 text-xs text-zinc-200"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-sky-400 block mb-1">
                          Rara (%)
                        </label>
                        <input
                          type="number"
                          value={cfg.dropRates?.rare ?? 25}
                          onChange={(e) =>
                            updateCfg({
                              dropRates: {
                                ...(cfg.dropRates || { common: 70, rare: 25, legendary: 5 }),
                                rare: Number(e.target.value),
                              },
                            })
                          }
                          className="w-full px-2 py-1 rounded bg-zinc-900 border border-zinc-800 text-xs text-sky-300 font-bold"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-amber-400 block mb-1">
                          Lendária (%)
                        </label>
                        <input
                          type="number"
                          value={cfg.dropRates?.legendary ?? 5}
                          onChange={(e) =>
                            updateCfg({
                              dropRates: {
                                ...(cfg.dropRates || { common: 70, rare: 25, legendary: 5 }),
                                legendary: Number(e.target.value),
                              },
                            })
                          }
                          className="w-full px-2 py-1 rounded bg-zinc-900 border border-zinc-800 text-xs text-amber-300 font-bold"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* SECTION D: CENÁRIOS, BGM, ÁUDIO & CLIMA */}
              <div className="p-4 rounded-xl bg-sky-950/20 border border-sky-500/30 space-y-3.5">
                <span className="text-xs font-bold text-sky-300 flex items-center gap-1.5">
                  <Volume2 className="w-4 h-4 text-sky-400" />
                  Cenário, Fundo, Música BGM & Clima
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] text-zinc-400 font-semibold block mb-1">
                      🎵 Trilha Sonora BGM / Áudio
                    </label>
                    <select
                      value={cfg.bgmUrl || ''}
                      onChange={(e) => updateCfg({ bgmUrl: e.target.value })}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-white"
                    >
                      <option value="">(Padrão da Fase / Sem troca)</option>
                      {soundLibrary.map((snd, idx) => (
                        <option key={idx} value={snd.url}>
                          {snd.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] text-zinc-400 font-semibold block mb-1">
                      🌧️ Clima / Atmosfera Dinâmica
                    </label>
                    <select
                      value={cfg.weatherType || 'none'}
                      onChange={(e) => updateCfg({ weatherType: e.target.value as any })}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-white"
                    >
                      <option value="none">☀️ Limpo / Normal</option>
                      <option value="rain">🌧️ Chuva Dinâmica</option>
                      <option value="fog">🌫️ Névoa Rasteira</option>
                      <option value="snow">❄️ Neve Volumétrica</option>
                      <option value="leaves">🍃 Vento & Folhas</option>
                      <option value="night">🌙 Noite & Penumbra</option>
                      <option value="dawn">🌅 Crepúsculo Dourado</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] text-zinc-400 font-semibold block mb-1">
                      🖼️ URL de Fundo (Imagem ou Vídeo MP4)
                    </label>
                    <input
                      type="text"
                      value={cfg.backgroundUrl || ''}
                      onChange={(e) => updateCfg({ backgroundUrl: e.target.value })}
                      placeholder="/cards/gemini_generated_video_0381afa9.mp4"
                      className="w-full px-2.5 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-zinc-200"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-zinc-400 font-semibold block mb-1">
                      ✨ Partículas de Cenário
                    </label>
                    <select
                      value={cfg.particleType || 'none'}
                      onChange={(e) => updateCfg({ particleType: e.target.value as any })}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-white"
                    >
                      <option value="none">Sem partículas</option>
                      <option value="sparks">✨ Centelhas Douradas</option>
                      <option value="embers">🔥 Brasas de Forja</option>
                      <option value="snow">❄️ Flocos de Inverno</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* =========================================================
              TAB 2: NARRATIVA & DIÁLOGOS
             ========================================================= */}
          {activeTab === 'narrative' && (
            <div className="space-y-4">
              {/* MOBBY FURY DIALOGUES (HP / TURN) */}
              {isMobbyModule && (
                <div className="p-4 rounded-xl bg-rose-950/20 border border-rose-500/30 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-rose-300 block">
                        👹 Diálogos de Fúria do Mobby (Duelo 3x1)
                      </span>
                      <span className="text-[10px] text-zinc-400">
                        Disparados automaticamente quando o HP cai ou em turnos específicos
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={handleAddMobbyDialogue}
                      className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" /> Adicionar Fala
                    </button>
                  </div>

                  <div className="space-y-2.5">
                    {(cfg.mobbyDialogues || []).map((dlg, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-lg bg-zinc-950/90 border border-zinc-800 space-y-2"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <select
                              value={dlg.triggerType}
                              onChange={(e) =>
                                handleUpdateMobbyDialogue(idx, {
                                  triggerType: e.target.value as 'hp_below' | 'turn_reached',
                                })
                              }
                              className="px-2 py-1 rounded bg-zinc-900 border border-zinc-800 text-[11px] text-white"
                            >
                              <option value="hp_below">⚡ Quando HP cair abaixo de (%)</option>
                              <option value="turn_reached">⏳ Ao chegar no Turno Nº</option>
                            </select>
                            <input
                              type="number"
                              value={dlg.triggerValue}
                              onChange={(e) =>
                                handleUpdateMobbyDialogue(idx, {
                                  triggerValue: Number(e.target.value),
                                })
                              }
                              className="w-16 px-2 py-1 rounded bg-zinc-900 border border-zinc-800 text-xs font-bold text-amber-300"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveMobbyDialogue(idx)}
                            className="p-1 text-zinc-500 hover:text-rose-400 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <input
                          type="text"
                          value={dlg.text}
                          onChange={(e) =>
                            handleUpdateMobbyDialogue(idx, { text: e.target.value })
                          }
                          placeholder="Digite a fala dramática do chefe..."
                          className="w-full px-2.5 py-1.5 rounded bg-zinc-900 border border-zinc-800 text-xs text-white"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* NPC SPEECH & DIALOGUE STEPS */}
              <div className="p-4 rounded-xl bg-amber-950/20 border border-amber-500/30 space-y-3">
                <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                  <MessageSquare className="w-4 h-4 text-amber-400" />
                  Diálogo do NPC & Balões de Fala no Mapa
                </span>

                <div>
                  <label className="text-[10px] text-zinc-400 font-semibold block mb-1">
                    Nome do Orador (Speaker)
                  </label>
                  <input
                    type="text"
                    value={cfg.speakerName || ''}
                    onChange={(e) => updateCfg({ speakerName: e.target.value })}
                    placeholder="Ex: Mestre Glub"
                    className="w-full px-3 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-white"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-zinc-400 font-semibold block mb-1">
                    Fala Principal de Diálogo (Visual Novel / Interação)
                  </label>
                  <textarea
                    rows={3}
                    value={cfg.dialogueText || ''}
                    onChange={(e) => updateCfg({ dialogueText: e.target.value })}
                    placeholder="Texto exibido quando o jogador interage com este personagem ou ponto..."
                    className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-white resize-none"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-zinc-400 font-semibold block mb-1">
                    Frases Rápidas em Balão (1 por linha, até 3 frases)
                  </label>
                  <textarea
                    rows={3}
                    value={(cfg.npcPhrases || []).join('\n')}
                    onChange={(e) =>
                      updateCfg({
                        npcPhrases: e.target.value.split('\n').slice(0, 3),
                      })
                    }
                    placeholder={'Olá, viajante!\nCuidado com o Titã de Gosma adiante!\nBoa sorte na jornada!'}
                    className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-zinc-200 resize-none"
                  />
                </div>
              </div>

              {/* LORE & CARD DESCRIPTION */}
              <div className="p-4 rounded-xl bg-zinc-900/70 border border-zinc-800 space-y-3">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
                  📜 Lore, Regras & Notas de Design do Card
                </label>
                <textarea
                  rows={3}
                  value={nodeDescription}
                  onChange={(e) => setNodeDescription(e.target.value)}
                  placeholder="Descreva a história, comportamento ou papel deste módulo na fase..."
                  className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-white resize-none"
                />
              </div>
            </div>
          )}

          {/* =========================================================
              TAB 3: GATILHOS & REGRAS
             ========================================================= */}
          {activeTab === 'triggers' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-cyan-950/20 border border-cyan-500/30 space-y-3.5">
                <span className="text-xs font-bold text-cyan-300 flex items-center gap-1.5">
                  <Zap className="w-4 h-4 text-cyan-400" />
                  Gatilho de Ativação & Condições de Jogo
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] text-zinc-400 font-semibold block mb-1">
                      Quando Dispara? (Trigger)
                    </label>
                    <select
                      value={cfg.triggerCondition || 'proximity'}
                      onChange={(e) => updateCfg({ triggerCondition: e.target.value as any })}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-white"
                    >
                      <option value="proximity">📍 Por Proximidade do Jogador</option>
                      <option value="interact">🖐️ Ao Clicar / Interagir</option>
                      <option value="on_enter_map">🚪 Ao Entrar na Fase</option>
                      <option value="hp_below">❤️ Quando HP Cair Abaixo do Limite</option>
                      <option value="quest_complete">✅ Ao Concluir Nó / Quest Anterior</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] text-zinc-400 font-semibold block mb-1">
                      Nota / Regra do Gatilho no Fluxo
                    </label>
                    <input
                      type="text"
                      value={actionTrigger}
                      onChange={(e) => setActionTrigger(e.target.value)}
                      placeholder="Ex: Desbloqueia portal norte ao vencer"
                      className="w-full px-2.5 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-white"
                    />
                  </div>
                </div>
              </div>

              {/* QUEST & REWARDS CONFIG */}
              <div className="p-4 rounded-xl bg-orange-950/20 border border-orange-500/30 space-y-3.5">
                <span className="text-xs font-bold text-orange-300 flex items-center gap-1.5">
                  <Award className="w-4 h-4 text-orange-400" />
                  Objetivo de Missão (Quest) & Recompensas
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div>
                    <label className="text-[10px] text-zinc-400 font-semibold block mb-1">
                      Tipo de Objetivo
                    </label>
                    <select
                      value={cfg.questKind || 'collect'}
                      onChange={(e) => updateCfg({ questKind: e.target.value as any })}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-white"
                    >
                      <option value="collect">📦 Coletar Recurso</option>
                      <option value="deliver">🚩 Entregar Item</option>
                      <option value="talk">🗣️ Falar com NPC</option>
                      <option value="duel">⚔️ Vencer Duelo / Boss</option>
                      <option value="discover">🧭 Descobrir Local</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] text-zinc-400 font-semibold block mb-1">
                      Recurso / Alvo
                    </label>
                    <input
                      type="text"
                      value={cfg.questResourceName || ''}
                      onChange={(e) => updateCfg({ questResourceName: e.target.value })}
                      placeholder="Ex: Essência de Gosma"
                      className="w-full px-2.5 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-white"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-zinc-400 font-semibold block mb-1">
                      Quantidade Necessária
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={cfg.questRequiredAmount ?? 3}
                      onChange={(e) => updateCfg({ questRequiredAmount: Number(e.target.value) })}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-xs font-bold text-amber-300"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5 pt-1">
                  <div>
                    <label className="text-[10px] text-zinc-400 font-semibold block mb-1">
                      🪙 Recompensa em Ouro
                    </label>
                    <input
                      type="number"
                      value={cfg.rewardGold ?? 150}
                      onChange={(e) => updateCfg({ rewardGold: Number(e.target.value) })}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-xs font-bold text-yellow-400"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-zinc-400 font-semibold block mb-1">
                      ⭐ Recompensa em XP
                    </label>
                    <input
                      type="number"
                      value={cfg.rewardXp ?? 75}
                      onChange={(e) => updateCfg({ rewardXp: Number(e.target.value) })}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-xs font-bold text-purple-300"
                    />
                  </div>
                </div>
              </div>

              {/* PORTAL / TELEPORT DESTINATION */}
              <div className="p-4 rounded-xl bg-purple-950/20 border border-purple-500/30 space-y-3">
                <span className="text-xs font-bold text-purple-300 flex items-center gap-1.5">
                  🌌 Destino de Teleporte / Transição de Fase
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] text-zinc-400 font-semibold block mb-1">
                      Tipo de Destino
                    </label>
                    <select
                      value={cfg.travelTargetType || 'level'}
                      onChange={(e) => updateCfg({ travelTargetType: e.target.value as any })}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-white"
                    >
                      <option value="level">🗺️ Outra Fase Salva</option>
                      <option value="sub_biome">🚪 Sub-Bioma Interior</option>
                      <option value="marker">📍 Marcador na Mesma Fase</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] text-zinc-400 font-semibold block mb-1">
                      Fase / Destino Vinculado
                    </label>
                    <select
                      value={cfg.travelTargetId || ''}
                      onChange={(e) => updateCfg({ travelTargetId: e.target.value, isPortal: true })}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-white"
                    >
                      <option value="">(Selecionar destino...)</option>
                      {savedLevels.map((lvl) => (
                        <option key={lvl.id} value={lvl.id}>
                          🗺️ {lvl.name}
                        </option>
                      ))}
                      {(project?.subBiomes || []).map((sb) => (
                        <option key={sb.id} value={sb.id}>
                          🚪 {sb.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3.5 border-t border-zinc-800 bg-zinc-900/90 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold transition-colors cursor-pointer"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={handleApplyAndSave}
            className="px-5 py-2 rounded-xl bg-gradient-to-r from-pink-600 via-purple-600 to-indigo-600 hover:from-pink-500 hover:to-indigo-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-pink-600/25 transition-all cursor-pointer"
          >
            <Check className="w-4 h-4" />
            <span>⚡ Salvar & Aplicar no Jogo</span>
          </button>
        </div>
      </div>
    </div>
  );
};
