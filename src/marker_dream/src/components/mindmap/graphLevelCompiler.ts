import type {
  MapProject,
  SavedLevel,
  MapMarker,
  BiomeTileConfig,
  SubBiomeTileConfig,
  MapRoute,
  DialogueStep,
} from '../../types/map';
import type { MindMapData, MindMapNode, MindMapConnection } from './MindMapStudio';
import type { NodeQuickConfig } from './editorContentCatalog';
import {
  BIOME_FOREST_PNG,
  BIOME_VILLAGE_PNG,
  BIOME_RUINS_PNG,
  SUB_BIOME_ALCHEMIST_LAB_PNG,
} from '../../data/masterTestPhase';
import { DEFAULT_PROJECT } from '../../data/defaultMap';
import { computeLevelStats } from '../../utils/storage';
import { ensureProjectQuestsConfig } from '../../utils/questEngine';
import { DEFAULT_CHARACTERS } from '../../utils/characterHelpers';
import { DEFAULT_ITEM_CATALOG, DEFAULT_INVENTORY_PROJECTS } from '../../utils/inventoryHelpers';
import { getOrCreateScreensConfig } from '../screens/ScreensStudio';
import { getOrCreateWorldMapConfig } from '../workspace/WorldMapCanvasEditor';
import { MobbyManager, Mobby } from '../../../../core/MobbyManager';

function svgIconDataUrl(emoji: string, ringColor: string, bgColor = '#18181b'): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96">
    <defs>
      <radialGradient id="g" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="${ringColor}" stop-opacity="0.45"/>
        <stop offset="100%" stop-color="${bgColor}" stop-opacity="0.95"/>
      </radialGradient>
    </defs>
    <circle cx="48" cy="48" r="42" fill="url(#g)" stroke="${ringColor}" stroke-width="4"/>
    <circle cx="48" cy="48" r="34" fill="none" stroke="#ffffff" stroke-opacity="0.2" stroke-width="1.5" stroke-dasharray="4 3"/>
    <text x="48" y="60" font-size="38" text-anchor="middle" dominant-baseline="central">${emoji}</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg.trim())}`;
}

export interface CompilationReport {
  level: SavedLevel;
  biomesCreated: number;
  subBiomesCreated: number;
  markersCreated: number;
  routesCreated: number;
  questsCreated: number;
  mobbysSynced: number;
}

/**
 * Compila o Grafo do Mapa Mental (`MindMapData`) em uma Fase Real (`SavedLevel`)
 * pronta para jogar ou editar no Marker Dream.
 */
export function compileGraphToLevel(
  mindMap: MindMapData,
  currentProject?: MapProject
): CompilationReport {
  const now = Date.now();
  const nodes = mindMap.nodes || [];
  const connections = mindMap.connections || [];

  // 1. Identify Root Node
  const rootNode =
    nodes.find((n) => n.parentId === null && n.category === 'core') ||
    nodes.find((n) => n.category === 'core') ||
    nodes[0];

  const phaseTitle = rootNode?.title || mindMap.title || `Fase Compilada #${now % 1000}`;
  const phaseDesc =
    rootNode?.description ||
    `Fase sintetizada a partir do Mapa Mental "${mindMap.title}" (${nodes.length} nós, ${connections.length} conexões).`;

  // 2. Compute Topological Depth from Root (BFS) so markers are ordered along Y axis
  const adj: Record<string, string[]> = {};
  const depthMap: Record<string, number> = {};
  nodes.forEach((n) => {
    adj[n.id] = [];
  });
  connections.forEach((c) => {
    if (adj[c.from]) adj[c.from].push(c.to);
  });

  if (rootNode) {
    const queue: Array<{ id: string; depth: number }> = [{ id: rootNode.id, depth: 0 }];
    depthMap[rootNode.id] = 0;
    while (queue.length > 0) {
      const curr = queue.shift()!;
      for (const nextId of adj[curr.id] || []) {
        if (depthMap[nextId] === undefined) {
          depthMap[nextId] = curr.depth + 1;
          queue.push({ id: nextId, depth: curr.depth + 1 });
        }
      }
    }
  }

  // Fallback depth by Y coordinate if disconnected
  const sortedByY = [...nodes].sort((a, b) => a.y - b.y || a.x - b.x);
  sortedByY.forEach((n, idx) => {
    if (depthMap[n.id] === undefined) {
      depthMap[n.id] = Math.max(1, Math.floor(idx / 2) + 1);
    }
  });

  // 3. Build Biomes & Sub-Biomes
  const biomeNodes = nodes.filter(
    (n) =>
      n.id !== rootNode?.id &&
      (n.editorLink?.editorId === 'maps' ||
        n.editorLink?.editorId === 'scenarios' ||
        n.category === 'world')
  );

  const biomes: BiomeTileConfig[] = [];
  const subBiomes: SubBiomeTileConfig[] = [
    {
      id: 'sub_alchemist_lab_synth',
      name: 'Santuário / Interior Sintetizado',
      tilePng: SUB_BIOME_ALCHEMIST_LAB_PNG,
      tileWidth: 768,
      tileHeight: 768,
      baseColor: '#ffffff',
      spawnX: 384,
      spawnY: 610,
      walkableCells: [],
      blockedCells: [],
    },
  ];

  const defaultBiomeTiles = [BIOME_FOREST_PNG, BIOME_VILLAGE_PNG, BIOME_RUINS_PNG];

  if (biomeNodes.length > 0) {
    biomeNodes.forEach((bn, idx) => {
      const qc = bn.editorLink?.quickConfig;
      biomes.push({
        id: `biome-synth-${bn.id}`,
        name: bn.title || bn.editorLink?.itemLabel || `Bioma ${idx + 1}`,
        tilePng: qc?.scenarioBgUrl || defaultBiomeTiles[idx % defaultBiomeTiles.length],
        tileWidth: 768,
        tileHeight: 256,
        tileRepeatCount: 2,
        repeatCount: 2,
        transitionBlendRows: 1,
        baseColor: '#ffffff',
      });
    });
  } else {
    biomes.push(
      {
        id: `biome-synth-forest-${now}`,
        name: '1. Floresta Esmeralda (Início)',
        tilePng: BIOME_FOREST_PNG,
        tileWidth: 768,
        tileHeight: 256,
        tileRepeatCount: 2,
        repeatCount: 2,
        transitionBlendRows: 1,
        baseColor: '#ffffff',
      },
      {
        id: `biome-synth-village-${now}`,
        name: '2. Praça Mercante & Encontros',
        tilePng: BIOME_VILLAGE_PNG,
        tileWidth: 768,
        tileHeight: 256,
        tileRepeatCount: 2,
        repeatCount: 2,
        transitionBlendRows: 1,
        baseColor: '#ffffff',
      },
      {
        id: `biome-synth-ruins-${now}`,
        name: '3. Cidadela do Boss Final',
        tilePng: BIOME_RUINS_PNG,
        tileWidth: 768,
        tileHeight: 256,
        tileRepeatCount: 2,
        repeatCount: 2,
        transitionBlendRows: 1,
        baseColor: '#ffffff',
      }
    );
  }

  const totalMapHeight = biomes.reduce(
    (acc, b) => acc + (b.tileHeight || 256) * (b.tileRepeatCount || b.repeatCount || 1),
    0
  );

  // 4. Convert Nodes into Ordered Markers + Sync Mobbys & Quests
  const entityNodes = nodes.filter((n) => n.id !== rootNode?.id);
  // Group nodes by depth to distribute X & Y cleanly
  const depthBuckets: Record<number, MindMapNode[]> = {};
  let maxDepth = 1;
  entityNodes.forEach((n) => {
    const d = Math.max(1, depthMap[n.id] || 1);
    maxDepth = Math.max(maxDepth, d);
    if (!depthBuckets[d]) depthBuckets[d] = [];
    depthBuckets[d].push(n);
  });

  const markers: MapMarker[] = [];
  const nodeIdToMarkerId: Record<string, string> = {};
  let mobbysSynced = 0;

  // Create Spawn / Portal de Chegada at top of map for Root Node
  const rootMarkerId = `marker-root-${now}`;
  if (rootNode) {
    nodeIdToMarkerId[rootNode.id] = rootMarkerId;
    markers.push({
      id: rootMarkerId,
      name: `Início: ${rootNode.title}`,
      x: 384,
      y: 130,
      width: 68,
      height: 68,
      zOffset: 10,
      solidCollision: false,
      iconPng: svgIconDataUrl('🌟', '#a855f7'),
      isActionNpc: true,
      npcPhrases: [
        rootNode.description || `Bem-vindo a ${phaseTitle}!`,
        rootNode.editorLink?.actionTrigger || 'Siga as rotas conectadas para avançar na jornada.',
      ],
      speechRange: 130,
      speechIntervalSeconds: 6,
      speechDisplaySeconds: 5,
      lightConfig: {
        enabled: true,
        color: '#a855f7',
        radius: 170,
        intensity: 0.75,
        flicker: true,
      },
    });
  }

  // Distribute remaining nodes by depth
  const usableHeight = Math.max(900, totalMapHeight - 280);

  Object.keys(depthBuckets)
    .map(Number)
    .sort((a, b) => a - b)
    .forEach((depth) => {
      const bucket = depthBuckets[depth];
      // Sort bucket horizontally by node.x
      bucket.sort((a, b) => a.x - b.x);

      const depthRatio = maxDepth > 1 ? (depth - 1) / (maxDepth - 1) : 0.5;
      const baseY = Math.round(250 + depthRatio * (usableHeight - 220));

      bucket.forEach((node, idxInBucket) => {
        const count = bucket.length;
        // Spread horizontally across [170 .. 598] around center 384
        let markerX = 384;
        if (count === 2) {
          markerX = idxInBucket === 0 ? 240 : 528;
        } else if (count >= 3) {
          const span = 440;
          markerX = Math.round(164 + (idxInBucket / (count - 1)) * span);
        } else {
          // Single node in layer: slight alternation around center road
          markerX = depth % 2 === 0 ? 430 : 338;
        }
        const markerY = Math.min(totalMapHeight - 90, baseY + (idxInBucket % 2) * 34);

        const qc: NodeQuickConfig = node.editorLink?.quickConfig || {};
        const edId = node.editorLink?.editorId || '';

        // Check if this node is a Mobby Boss
        const isMobby =
          edId === 'mobbys' ||
          node.category === 'combat' ||
          node.editorLink?.subCategory === 'enemies';

        // Emoji & Color selection
        let emoji = '📍';
        let ringColor = node.color || '#ec4899';
        if (isMobby) {
          emoji = '👹';
          ringColor = '#f43f5e';
        } else if (edId === 'npcs' || node.category === 'lore') {
          emoji = '🧙‍♂️';
          ringColor = '#f59e0b';
        } else if (edId === 'quests') {
          emoji = '📜';
          ringColor = '#eab308';
        } else if (edId === 'packs' || edId === 'store' || edId === 'cards' || node.category === 'economy') {
          emoji = '🎁';
          ringColor = '#10b981';
        } else if (edId === 'events') {
          emoji = '⚡';
          ringColor = '#06b6d4';
        } else if (edId === 'maps' || edId === 'scenarios') {
          emoji = '🏛️';
          ringColor = '#8b5cf6';
        }

        // Upsert Mobby in MobbyManager if it's a combat/boss node
        if (isMobby) {
          const existingMobbys = MobbyManager.getMobbys();
          const targetId =
            node.editorLink?.realEntityId ||
            `mobby_synth_${node.id.replace(/[^a-zA-Z0-9]/g, '_')}`;
          const existing = existingMobbys.find((m) => m.id === targetId);
          const mobbyPayload: Mobby = {
            ...(existing || {
              id: targetId,
              name: node.title,
              title: qc.bossTitle || node.description || 'Chefe Sintetizado do Mapa Mental',
              avatar: '👹',
              maxHp: 35,
              difficulty: 'hard',
              deckIds: ['fire_slime', 'king_slime', 'obsidian_golem'],
              dialogues: [],
            }),
            name: node.title,
            title: qc.bossTitle || existing?.title || 'Chefe de Fase',
            maxHp: qc.hp ?? existing?.maxHp ?? 35,
            difficulty: qc.difficulty || existing?.difficulty || 'hard',
            rewardCardId: qc.rewardCardId ?? existing?.rewardCardId,
            dialogues: [
              ...(existing?.dialogues?.filter(
                (d) => d.trigger !== 'start' && d.trigger !== 'low_hp' && d.trigger !== 'defeat'
              ) || []),
              ...(qc.startDialogue
                ? [{ trigger: 'start' as const, text: qc.startDialogue }]
                : [
                    {
                      trigger: 'start' as const,
                      text: node.description || `Você ousa desafiar ${node.title}?!`,
                    },
                  ]),
              ...(qc.furyDialogue
                ? [{ trigger: 'low_hp' as const, text: qc.furyDialogue }]
                : []),
              ...(qc.defeatDialogue
                ? [{ trigger: 'defeat' as const, text: qc.defeatDialogue }]
                : []),
            ],
          };
          MobbyManager.upsertMobby(mobbyPayload);
          mobbysSynced++;
        }

        // Build Dialogue Steps
        const dialogueSteps: DialogueStep[] = [];
        if (qc.dialogueLines && qc.dialogueLines.length > 0) {
          qc.dialogueLines.forEach((line, lIdx) => {
            dialogueSteps.push({
              id: `dlg-${node.id}-${lIdx}`,
              speakerName: node.title,
              text: line,
              type: 'speech',
            });
          });
        } else if (qc.startDialogue || node.description) {
          dialogueSteps.push({
            id: `dlg-${node.id}-0`,
            speakerName: node.title,
            text: qc.startDialogue || node.description || `Interação com ${node.title}`,
            type: 'speech',
          });
          if (qc.furyDialogue) {
            dialogueSteps.push({
              id: `dlg-${node.id}-1`,
              speakerName: `${node.title} (Fúria)`,
              text: qc.furyDialogue,
              type: 'speech',
            });
          }
        }

        const markerId =
          node.editorLink?.realEntityId?.startsWith('marker')
            ? node.editorLink.realEntityId
            : `marker-synth-${node.id}`;
        nodeIdToMarkerId[node.id] = markerId;

        const isPortal = Boolean(qc.isPortal || edId === 'events' || edId === 'scenarios');

        const newMarker: MapMarker = {
          id: markerId,
          name: node.title,
          x: markerX,
          y: markerY,
          width: isMobby ? 84 : 68,
          height: isMobby ? 84 : 68,
          zOffset: 10,
          solidCollision: qc.solidCollision ?? (isMobby || edId === 'limits'),
          collisionW: isMobby ? 54 : 44,
          collisionH: isMobby ? 44 : 36,
          collisionOffsetX: 0,
          collisionOffsetY: 8,
          iconPng: svgIconDataUrl(emoji, ringColor),
          isActionNpc: true,
          npcPhrases:
            qc.dialogueLines && qc.dialogueLines.length > 0
              ? qc.dialogueLines
              : [
                  qc.startDialogue || node.description || `${node.title}`,
                  ...(node.editorLink?.actionTrigger ? [node.editorLink.actionTrigger] : []),
                ],
          dialogueSteps,
          speechRange: qc.speechRange || 125,
          speechIntervalSeconds: 6,
          speechDisplaySeconds: 5,
          lightConfig: {
            enabled: qc.hasLight ?? (isMobby || isPortal || node.category === 'audio'),
            color: qc.lightColor || ringColor,
            radius: qc.lightRadius || (isMobby ? 190 : 140),
            intensity: qc.lightIntensity || 0.75,
            flicker: true,
          },
          ...(isPortal
            ? {
                travel: {
                  enabled: true,
                  targetType: 'subBiome' as const,
                  targetSubBiomeId: 'sub_alchemist_lab_synth',
                  targetX: 384,
                  targetY: 590,
                  label: qc.portalTargetLabel || `Entrar em ${node.title}`,
                  requireConfirm: false,
                },
              }
            : {}),
          ...(qc.rewardCardId || qc.dropCoins
            ? {
                rewardSlots: [
                  {
                    id: `rew-${node.id}`,
                    itemId: qc.rewardCardId || 'gold_pouch',
                    quantity: qc.dropCoins || 1,
                    chancePercent: 100,
                  },
                ],
              }
            : {}),
        };

        markers.push(newMarker);
      });
    });

  // 5. Generate Routes (`MapRoute[]`) from Bézier Connections
  const routes: MapRoute[] = [];
  connections.forEach((conn, idx) => {
    const fromMarkerId = nodeIdToMarkerId[conn.from];
    const toMarkerId = nodeIdToMarkerId[conn.to];
    const fromMarker = markers.find((m) => m.id === fromMarkerId);
    const toMarker = markers.find((m) => m.id === toMarkerId);
    if (!fromMarker || !toMarker) return;

    const midX = Math.round((fromMarker.x + toMarker.x) / 2);
    const midY = Math.round((fromMarker.y + toMarker.y) / 2);

    routes.push({
      id: `route-synth-${conn.id || idx}`,
      name: conn.label || `${fromMarker.name} ➔ ${toMarker.name}`,
      color: conn.color || '#ec4899',
      assignedMarkerId: fromMarker.id,
      loop: false,
      speed: 2.2,
      waypoints: [
        { x: fromMarker.x, y: fromMarker.y, waitSeconds: 1 },
        { x: midX, y: midY, waitSeconds: 0 },
        { x: toMarker.x, y: toMarker.y, waitSeconds: 1 },
      ],
    });
  });

  // 6. Synthesize Quests from Lore/Quest Nodes & Connections
  const baseQuestsConfig = ensureProjectQuestsConfig(currentProject || DEFAULT_PROJECT);
  const questNodes = nodes.filter(
    (n) => n.editorLink?.editorId === 'quests' || n.category === 'lore'
  );
  let questsCreated = 0;

  const synthesizedQuests = questNodes.map((qn, qIdx) => {
    questsCreated++;
    const qc = qn.editorLink?.quickConfig || {};
    const mId = nodeIdToMarkerId[qn.id] || markers[0]?.id || rootMarkerId;
    // Find connected target node if any
    const outConn = connections.find((c) => c.from === qn.id);
    const destMarkerId = (outConn && nodeIdToMarkerId[outConn.to]) || markers[markers.length - 1]?.id || mId;

    // Mark markers with quest role
    const startMarker = markers.find((m) => m.id === mId);
    if (startMarker) {
      startMarker.questStationRole = 'both';
    }

    return {
      id: `quest_synth_${qn.id.replace(/[^a-zA-Z0-9]/g, '_')}`,
      title: qn.title,
      category: 'main' as const,
      summary: qn.description || `Missão gerada pelo nó "${qn.title}" no Mapa Mental.`,
      giverMarkerId: mId,
      turnInMarkerId: destMarkerId,
      autoTrackOnStart: qIdx === 0,
      repeatable: false,
      prerequisites: {},
      objectives: [
        {
          id: `obj_${qn.id}_1`,
          title: qc.questObjectiveText || qn.editorLink?.actionTrigger || `Concluir objetivo: ${qn.title}`,
          kind: 'talk_npc' as const,
          targetId: destMarkerId,
          requiredCount: 1,
          currentCount: 0,
        },
      ],
      rewards: {
        xp: qc.questXpReward ?? 150,
        gold: qc.dropCoins ?? 100,
        items: [],
      },
      dialogues: {
        offerText: qc.dialogueLines?.[0] || qn.description || `Você aceita a missão "${qn.title}"?`,
        acceptText: 'Excelente! Siga o marcador na bússola.',
        inProgressText: 'Continue avançando pelos nós conectados do mapa!',
        readyToTurnInText: 'Você cumpriu todos os requisitos desta etapa!',
        completedText: 'Missão concluída com maestria!',
      },
    };
  });

  // 7. Assemble Complete MapProject & SavedLevel
  const baseProj: MapProject = {
    ...DEFAULT_PROJECT,
    id: `level-mindmap-${now}`,
    title: phaseTitle,
    description: phaseDesc,
    version: '2.0-mindmap-synth',
    canvasKind: 'vertical',
    tileWidth: 768,
    tileHeight: 256,
    collisionGrid: 32,
    biomes,
    subBiomes,
    markers,
    routes,
    walkableCells: [],
    blockedCells: [],
    spawnConfig: {
      enabled: true,
      targetType: 'mainMap',
      targetX: 384,
      targetY: 165,
      autoCenterCamera: true,
      entryEffect: 'portal',
    },
    player: {
      id: 'player-hero',
      name: 'Herói Slime',
      x: 384,
      y: 165,
      color: '#10b981',
      speed: 4,
      characterId: DEFAULT_CHARACTERS[0]?.id,
    },
    characters: currentProject?.characters || DEFAULT_CHARACTERS,
    itemCatalog: currentProject?.itemCatalog || DEFAULT_ITEM_CATALOG,
    inventoryProjects: currentProject?.inventoryProjects || DEFAULT_INVENTORY_PROJECTS,
    activeInventoryId: currentProject?.activeInventoryId || DEFAULT_INVENTORY_PROJECTS[0]?.id,
    questsConfig: {
      ...baseQuestsConfig,
      quests: [...synthesizedQuests, ...(baseQuestsConfig.quests || [])],
    },
    galleryAssets: currentProject?.galleryAssets || [],
    galleryCategories: currentProject?.galleryCategories || [],
  };

  baseProj.screensConfig = getOrCreateScreensConfig(baseProj);
  baseProj.worldMapConfig = getOrCreateWorldMapConfig(baseProj);

  const compiledLevel: SavedLevel = {
    id: baseProj.id,
    name: `⚡ ${phaseTitle}`,
    description: phaseDesc,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    closedInTabs: false,
    projectData: baseProj,
    stats: computeLevelStats(baseProj),
    thumbnailPng: biomes[0]?.tilePng || BIOME_FOREST_PNG,
  };

  return {
    level: compiledLevel,
    biomesCreated: biomes.length,
    subBiomesCreated: subBiomes.length,
    markersCreated: markers.length,
    routesCreated: routes.length,
    questsCreated: synthesizedQuests.length,
    mobbysSynced,
  };
}

/**
 * Sincronização Inversa 1: Lê uma Fase Existente (`SavedLevel`) do Marker Dream
 * e projeta seus Biomas, Sub-Biomas, Marcadores, NPCs e Quests em um Grafo Mental Automático!
 */
export function projectLevelToGraph(level: SavedLevel): MindMapData {
  const proj = level.projectData;
  const nodes: MindMapNode[] = [];
  const connections: MindMapConnection[] = [];

  const rootId = `node-root-${level.id}`;
  nodes.push({
    id: rootId,
    title: level.name || proj.title || 'Fase Importada',
    description: level.description || proj.description || 'Fase projetada via Sincronização Inversa',
    category: 'core',
    x: 100,
    y: 360,
    color: '#a855f7',
    status: 'done',
    tags: ['Fase Real', 'Sync Inverso'],
    parentId: null,
    editorLink: {
      editorId: 'levels',
      subCategory: 'campaign',
      itemId: `live-lvl-${level.id}`,
      itemLabel: `Fase: ${level.name}`,
      realEntityId: level.id,
      actionTrigger: 'Raiz da Fase no Marker Dream',
    },
  });

  // 1. Project Biomes & SubBiomes (Column 1: x = 440)
  const biomes = proj.biomes || [];
  const subBiomes = proj.subBiomes || [];
  const biomeNodeIds: string[] = [];

  biomes.forEach((b, idx) => {
    const bNodeId = `node-biome-${b.id}`;
    biomeNodeIds.push(bNodeId);
    nodes.push({
      id: bNodeId,
      title: b.name || `Bioma #${idx + 1}`,
      description: `Terreno ${b.tileWidth}x${b.tileHeight}px • Repetições: ${b.tileRepeatCount || b.repeatCount || 1}x`,
      category: 'world',
      x: 440,
      y: 100 + idx * 170,
      color: '#10b981',
      status: 'done',
      tags: ['Bioma', `${b.tileWidth}x${b.tileHeight}`],
      parentId: rootId,
      editorLink: {
        editorId: 'maps',
        subCategory: 'biomes',
        itemId: `live-biome-${b.id}`,
        itemLabel: `Bioma: ${b.name}`,
        realEntityId: b.id,
        actionTrigger: `Camada vertical #${idx + 1}`,
        quickConfig: {
          scenarioBgUrl: b.tilePng,
        },
      },
    });
    connections.push({
      id: `conn-root-b-${idx}`,
      from: rootId,
      to: bNodeId,
      style: 'solid',
      color: '#10b981',
    });
  });

  subBiomes.forEach((sb, idx) => {
    const sbNodeId = `node-subbiome-${sb.id}`;
    biomeNodeIds.push(sbNodeId);
    nodes.push({
      id: sbNodeId,
      title: `Sub-Mapa: ${sb.name}`,
      description: `Interior / Sub-Bioma ${sb.tileWidth}x${sb.tileHeight}px`,
      category: 'world',
      x: 440,
      y: 100 + (biomes.length + idx) * 170,
      color: '#14b8a6',
      status: 'done',
      tags: ['Sub-Bioma', 'Interior'],
      parentId: rootId,
      editorLink: {
        editorId: 'maps',
        subCategory: 'subbiomes',
        itemId: `live-subbiome-${sb.id}`,
        itemLabel: `Sub-Bioma: ${sb.name}`,
        realEntityId: sb.id,
        actionTrigger: 'Destino de Portal / Interior',
      },
    });
    connections.push({
      id: `conn-root-sb-${idx}`,
      from: rootId,
      to: sbNodeId,
      style: 'dashed',
      color: '#14b8a6',
    });
  });

  // 2. Project Markers (Column 2: x = 800, or grouped by biome Y range)
  const markers = proj.markers || [];
  const markerIdToNodeId: Record<string, string> = {};

  markers.forEach((m, idx) => {
    const mNodeId = `node-marker-${m.id}`;
    markerIdToNodeId[m.id] = mNodeId;

    // Find parent biome node by Y coordinate or SubBiomeId
    let parentBiomeNodeId = rootId;
    if (m.subBiomeId) {
      const sbCandidate = `node-subbiome-${m.subBiomeId}`;
      if (nodes.some((n) => n.id === sbCandidate)) {
        parentBiomeNodeId = sbCandidate;
      }
    } else if (biomes.length > 0) {
      let accY = 0;
      for (const b of biomes) {
        const h = (b.tileHeight || 256) * (b.tileRepeatCount || b.repeatCount || 1);
        if (m.y >= accY && m.y <= accY + h) {
          parentBiomeNodeId = `node-biome-${b.id}`;
          break;
        }
        accY += h;
      }
      if (parentBiomeNodeId === rootId && biomeNodeIds.length > 0) {
        parentBiomeNodeId = biomeNodeIds[Math.min(biomeNodeIds.length - 1, Math.floor(idx / 3))];
      }
    }

    const hasTravel = Boolean(m.travel?.enabled);
    const isNpc = Boolean(m.isActionNpc);
    const category: MindMapNode['category'] = hasTravel
      ? 'mechanics'
      : isNpc
      ? 'lore'
      : m.solidCollision
      ? 'combat'
      : 'world';

    const dialogueLines =
      m.dialogueSteps && m.dialogueSteps.length > 0
        ? m.dialogueSteps.map((d) => d.text)
        : m.npcPhrases || [];

    nodes.push({
      id: mNodeId,
      title: m.name || `Marcador #${idx + 1}`,
      description:
        dialogueLines[0] ||
        `Posição (${Math.round(m.x)}, ${Math.round(m.y)}) ${hasTravel ? '• Portal Ativo' : ''}`,
      category,
      x: 820 + (idx % 2) * 270,
      y: 80 + idx * 135,
      color: hasTravel ? '#06b6d4' : isNpc ? '#f59e0b' : '#ec4899',
      status: 'done',
      tags: [
        `(${Math.round(m.x)},${Math.round(m.y)})`,
        ...(m.solidCollision ? ['Sólido'] : []),
        ...(m.lightConfig?.enabled ? ['Luz'] : []),
        ...(hasTravel ? ['Portal'] : []),
      ],
      parentId: parentBiomeNodeId,
      editorLink: {
        editorId: isNpc ? 'npcs' : 'events',
        subCategory: isNpc ? 'town_npcs' : 'triggers',
        itemId: `live-marker-${m.id}`,
        itemLabel: `${isNpc ? 'NPC' : 'Marcador'}: ${m.name}`,
        realEntityId: m.id,
        actionTrigger: hasTravel
          ? `Portal: ${m.travel?.label || 'Teleporte'}`
          : dialogueLines[0] || `Pos (${Math.round(m.x)}, ${Math.round(m.y)})`,
        quickConfig: {
          solidCollision: Boolean(m.solidCollision),
          hasLight: Boolean(m.lightConfig?.enabled),
          lightColor: m.lightConfig?.color || '#fbbf24',
          lightRadius: m.lightConfig?.radius || 140,
          lightIntensity: m.lightConfig?.intensity || 0.75,
          isPortal: hasTravel,
          portalTargetLabel: m.travel?.label || '',
          dialogueLines,
          speechRange: m.speechRange || 120,
        },
      },
    });

    connections.push({
      id: `conn-parent-m-${m.id}`,
      from: parentBiomeNodeId,
      to: mNodeId,
      style: 'solid',
      color: hasTravel ? '#06b6d4' : '#f59e0b',
    });
  });

  // 3. Project Quests (Column 3: x = 1380)
  const quests = proj.questsConfig?.quests || [];
  quests.forEach((q, qIdx) => {
    const qNodeId = `node-quest-${q.id}`;
    const giverNodeId = (q.giverMarkerId && markerIdToNodeId[q.giverMarkerId]) || rootId;

    nodes.push({
      id: qNodeId,
      title: `Quest: ${q.title}`,
      description: q.summary || q.objectives?.[0]?.title || 'Missão da fase',
      category: 'lore',
      x: 1380,
      y: 120 + qIdx * 170,
      color: '#eab308',
      status: 'done',
      tags: ['Quest', `${q.rewards?.xp || 100} XP`, `${q.rewards?.gold || 50} Ouro`],
      parentId: giverNodeId,
      editorLink: {
        editorId: 'quests',
        subCategory: 'main_quests',
        itemId: `live-quest-${q.id}`,
        itemLabel: `Quest: ${q.title}`,
        realEntityId: q.id,
        actionTrigger: q.objectives?.[0]?.title || 'Objetivo de Quest',
        quickConfig: {
          questXpReward: q.rewards?.xp || 100,
          dropCoins: q.rewards?.gold || 50,
          questObjectiveText: q.objectives?.[0]?.title || '',
          dialogueLines: [
            q.dialogues?.offerText || '',
            q.dialogues?.completedText || '',
          ].filter(Boolean),
        },
      },
    });

    connections.push({
      id: `conn-quest-${q.id}`,
      from: giverNodeId,
      to: qNodeId,
      style: 'dashed',
      color: '#eab308',
    });
  });

  return {
    title: `Grafo da Fase: ${level.name || proj.title}`,
    nodes,
    connections,
  };
}

/**
 * Sincronização Inversa 2: Lê todos os Chefes & Mobbys reais do `MobbyManager`
 * e projeta a Árvore de Chefes 3x1 (com Status, Diálogos de Fúria e Recompensas) no Mapa Mental!
 */
export function projectMobbysToGraph(): MindMapData {
  const mobbys = MobbyManager.getMobbys();
  const nodes: MindMapNode[] = [];
  const connections: MindMapConnection[] = [];

  const rootId = 'node-mobbys-root';
  nodes.push({
    id: rootId,
    title: 'Panteão de Chefes Mobbys (3x1)',
    description: 'Árvore viva sincronizada com o MobbyManager — edite HP, Fúria e Drops direto nos cards!',
    category: 'combat',
    x: 120,
    y: 340,
    color: '#f43f5e',
    status: 'done',
    tags: ['MobbyManager', 'Bosses 3x1'],
    parentId: null,
    editorLink: {
      editorId: 'mobbys',
      subCategory: 'boss_ai',
      itemId: 'mob-ai-3v1',
      itemLabel: 'IA de Boss 3x1 (TabMobbys)',
      actionTrigger: `${mobbys.length} Chefes sincronizados`,
    },
  });

  mobbys.forEach((m, idx) => {
    const mNodeId = `node-mobby-${m.id}`;
    const startDlg = m.dialogues.find((d) => d.trigger === 'start')?.text || '';
    const furyDlg = m.dialogues.find((d) => d.trigger === 'low_hp')?.text || '';
    const defeatDlg = m.dialogues.find((d) => d.trigger === 'defeat')?.text || '';

    const diffColor =
      m.difficulty === 'insane'
        ? '#a855f7'
        : m.difficulty === 'hard'
        ? '#f43f5e'
        : m.difficulty === 'medium'
        ? '#f59e0b'
        : '#10b981';

    nodes.push({
      id: mNodeId,
      title: `${m.avatar || '👹'} ${m.name}`,
      description: `${m.title} • ❤️ ${m.maxHp} HP • Deck: ${m.deckIds.length} cartas`,
      category: 'combat',
      x: 500,
      y: 80 + idx * 170,
      color: diffColor,
      status: 'done',
      tags: [`HP: ${m.maxHp}`, m.difficulty.toUpperCase(), ...(m.rewardCardId ? [`Drop: ${m.rewardCardId}`] : [])],
      parentId: rootId,
      editorLink: {
        editorId: 'mobbys',
        subCategory: 'live_mobbys',
        itemId: `live-mobby-${m.id}`,
        itemLabel: `Mobby: ${m.name} (${m.title})`,
        realEntityId: m.id,
        actionTrigger: startDlg || `Batalha 3x1 (${m.difficulty})`,
        quickConfig: {
          hp: m.maxHp,
          atk: m.difficulty === 'insane' ? 14 : m.difficulty === 'hard' ? 10 : 6,
          def: m.difficulty === 'insane' ? 8 : 4,
          difficulty: m.difficulty,
          bossTitle: m.title,
          rewardCardId: m.rewardCardId || '',
          startDialogue: startDlg,
          furyDialogue: furyDlg,
          defeatDialogue: defeatDlg,
          dialogueLines: m.dialogues.map((d) => `[${d.trigger.toUpperCase()}] ${d.text}`),
        },
      },
    });

    connections.push({
      id: `conn-mobby-${m.id}`,
      from: rootId,
      to: mNodeId,
      style: 'solid',
      color: diffColor,
    });

    // If the mobby has a reward card or artifact, create a child reward node
    if (m.rewardCardId || m.artifactCardId) {
      const rewNodeId = `node-mobby-rew-${m.id}`;
      nodes.push({
        id: rewNodeId,
        title: `Espólio: ${m.rewardCardId || m.artifactCardId}`,
        description: `Carta / Artefato concedido ao derrotar ${m.name}`,
        category: 'economy',
        x: 860,
        y: 80 + idx * 170,
        color: '#eab308',
        status: 'done',
        tags: ['Drop', 'Carta Recompensa'],
        parentId: mNodeId,
        editorLink: {
          editorId: 'cards',
          subCategory: 'card_types',
          itemId: m.rewardCardId || m.artifactCardId || 'card-art-heart',
          itemLabel: `Recompensa: ${m.rewardCardId || m.artifactCardId}`,
          actionTrigger: `Drop ao vencer ${m.name}`,
          quickConfig: {
            rewardCardId: m.rewardCardId || m.artifactCardId,
            dropCoins: m.difficulty === 'insane' ? 500 : 200,
          },
        },
      });

      connections.push({
        id: `conn-mobby-rew-${m.id}`,
        from: mNodeId,
        to: rewNodeId,
        style: 'dashed',
        color: '#eab308',
      });
    }
  });

  return {
    title: 'Mapa Mental - Panteão Mobbys 3x1 (Sincronizado)',
    nodes,
    connections,
  };
}
