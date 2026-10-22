# 📖 TileScroll — Documentação Completa

**TileScroll — Mapas Verticais de Biomas & Rotas (Studio RPG)**
Criador e navegador de mapas com rolagem vertical usando tiles PNG, múltiplos biomas configuráveis, marcadores interativos, traçados de rotas e um emulador de jogo completo.

> Documento gerado por leitura integral do código-fonte. **Nenhum arquivo de código foi modificado.**
> Referências no formato `arquivo:linha` apontam para a localização exata no código.

---

## 📑 Índice

1. [Visão Geral & Stack](#1-visão-geral--stack)
2. [Estrutura do Projeto](#2-estrutura-do-projeto)
3. [Núcleo — App.tsx, Navegação e Persistência](#3-núcleo--apptsx-navegação-e-persistência)
4. [Modelo de Dados — types/map.ts](#4-modelo-de-dados--typesmapts)
5. [Renderizador do Mapa Vertical](#5-renderizador-do-mapa-vertical)
6. [Motor de Animação (Motion Canvas)](#6-motor-de-animação-motion-canvas)
7. [Marcadores, NPCs e Eventos](#7-marcadores-npcs-e-eventos)
8. [Atmosfera, Clima e Iluminação](#8-atmosfera-clima-e-iluminação)
9. [Emulador, Estações, Spawn, Telas e Diálogos](#9-emulador-estações-spawn-telas-e-diálogos)
10. [Galeria de Assets, Vídeo e Sincronização Local](#10-galeria-de-assets-vídeo-e-sincronização-local)
11. [Utilitários (src/utils)](#11-utilitários-srcutils)
12. [Dados e Sementes (src/data)](#12-dados-e-sementes-srcdata)
13. [Algoritmos-chave resumidos](#13-algoritmos-chave-resumidos)
14. [Débitos Técnicos e Bugs Conhecidos](#14-débitos-técnicos-e-bugs-conhecidos)
15. [Glossário de Tipos (Union Types)](#15-glossário-de-tipos-union-types)

---

# 1. Visão Geral & Stack

| Item | Tecnologia |
|---|---|
| Framework | React 19.0.1 |
| Linguagem | TypeScript 7.0 |
| Bundler | Vite 8.3.0 (`@vitejs/plugin-react` 6) |
| Estilo | Tailwind CSS 4.3 (plugin `@tailwindcss/vite`) |
| Animações | `motion` 12.23 (Framer Motion), CSS keyframes extensas |
| IA | `@google/genai` 2.4 (capability `MAJOR_CAPABILITY_SERVER_SIDE_GEMINI_API`) |
| Ícones | `lucide-react` 0.546 |
| Backend opcional | `express` + `dotenv` |
| Renderização | Canvas 2D nativo + DOM/CSS para overlays |
| Persistência | IndexedDB (`TileScrollDB`) + `localStorage` (legado) |
| Fontes | Cinzel (display), Plus Jakarta Sans (texto), JetBrains Mono (dados) |

**Scripts** (`package.json`):

| Script | Comando |
|---|---|
| `dev` | `vite --port=3000 --host=0.0.0.0` |
| `build` | `vite build` |
| `preview` | `vite preview` |
| `lint` | `tsc --noEmit` (typecheck) |
| `clean` | `rm -rf dist server.js` |

**Duas telas/canvas distintos:**
- **`vertical`** — mapa de rolagem vertical composto por segmentos de bioma (tiles PNG empilhados no eixo Y).
- **`extended`** — "fases" horizontais (sub-biomas) dispostas lado a lado, cada uma com colisão local.

**Duas superfícies de execução:**
- **Editor** — `VerticalMapCanvas` (canvas + camadas DOM de edição).
- **Jogo** — `PortraitEmulator` (runtime jogável: herói, física, NPCs, áudio, quests).

---

# 2. Estrutura do Projeto

```
create-phases/
├── index.html                      # Shell, metadados OG, fontes Google
├── package.json / package-lock.json
├── vite.config.ts                  # react + tailwind, alias '@', HMR condicional
├── tsconfig.json
├── metadata.json                   # Nome/capabilities do applet
├── .env.example                    # GEMINI_API_KEY, APP_URL
├── PLANEJAMENTO_SISTEMAS_AUDIO_CINEMATICA_EVENTOS.md   # Spec de áudio/cinemática
└── src/
    ├── main.tsx                    # createRoot → <App/>
    ├── App.tsx                     # ★ 3.166 linhas — orquestrador central
    ├── index.css                   # 922 linhas — tema + ~100 keyframes
    ├── TestApp.tsx                 # stub (export {})
    ├── types/map.ts                # ★ 1.077 linhas — modelo de dados (68 tipos)
    ├── data/
    │   ├── defaultMap.ts           # DEFAULT_PROJECT (sementes)
    │   ├── defaultAtmosphereAssets.ts  # SVGs embutidos (insetos, folhas, nuvens)
    │   ├── defaultSpawnVehicles.ts     # 5 veículos de spawn (SVG)
    │   └── defaultStationAssets.ts     # SVGs de estações + presets
    ├── services/
    │   └── localAssetSyncService.ts    # Sync de pasta local (File System Access API)
    ├── utils/
    │   ├── storage.ts              # IndexedDB
    │   ├── exportHelpers.ts        # Export JSON/PNG
    │   ├── mapMath.ts              # Geometria de biomas/rotas
    │   ├── canvasSeamBlend.ts      # Costura de tiles
    │   ├── tileGenerator.ts        # Leitura de imagem
    │   ├── assetSize.ts            # Hook de dimensões + GroundShadow
    │   ├── dialogueTheme.ts        # Paleta extraída de imagem
    │   ├── videoUtils.ts           # Cache/preload de vídeo
    │   ├── motionCanvasEngine.ts   # Malha + VFX
    │   ├── motionPhysicsEngine.ts  # 15 modos de física
    │   ├── motionCutoutExtractor.ts    # Recorte/laço
    │   ├── motionInpaintRepair.ts      # Content-aware healing
    │   └── npcActionEngine.ts      # ★ IA de combate de NPCs
    └── components/
        ├── TopNav.tsx / Toolbar.tsx
        ├── VerticalMapCanvas.tsx   # ★ 3.200 linhas — canvas do editor
        ├── MiniMap.tsx
        ├── PortraitEmulator.tsx    # ★ 6.334 linhas — emulador de jogo
        ├── BiomeStudio / SubBiomeStudio / LimitsStudio / RouteStudio
        ├── AtmosphereStudio / CloudStudio / FogStudio
        ├── LivingAtmosphereLayers.tsx
        ├── atmosphere/             # 7 camadas de clima (chuva, neve, folhas...)
        ├── MarkerStudio.tsx / MarkerPenStudio.tsx / MarkerLayersStudio.tsx
        ├── marker-studio/          # 9 módulos + 4 abas
        ├── npc/                    # Combate overlay + emoções anime
        ├── MotionCanvasStudio / Workspace / LayersPanel / Brush / AssetCanvas
        ├── station/                # 4 componentes de estação
        ├── screens/ScreensStudio.tsx
        ├── video/                  # VideoAssetCanvas + ChromaKeyModal
        ├── gallery/                # Galeria de pasta local
        ├── AssetGalleryStudio.tsx / AssetGalleryModal.tsx
        └── *Studio.tsx             # Player, Spawn, Dialogue, Stamp, Effect, Event...
```

---

# 3. Núcleo — App.tsx, Navegação e Persistência

## 3.1 Estado principal (`App.tsx`)

| Estado | Linha | Papel |
|---|---|---|
| `project: MapProject` | `:52` | Fonte da verdade do documento aberto |
| `savedLevels: SavedLevel[]` | `:53` | Galeria de fases (cada uma embute um `MapProject`) |
| `activeLevelId` / `closingLevel` | `:54-55` | Fase ativa / fase pendente de confirmação |
| `undoStackRef` / `redoStackRef` | `:58-59` | Histórico (máx. **20** entradas) |
| `clipboardRef` | `:65` | Copiar/colar marcadores |
| `toastMsg` + `showToast` | `:66-71` | Toast com auto-expiração de 2.200 ms |
| `activeTab` / `activeTool` | `:266-267` | Aba e ferramenta ativas |
| `selectedMarkerId` | `:268` | Marcador selecionado |
| 10 estados Motion Canvas | `:272-283` | Camadas, pincéis, `canvasRightView` |
| `limitsBrushMode/Size/mirror` | `:285-288` | Pincel de limites |
| `canvasView` (derivado) | `:290-295` | `vertical` \| `extended` |
| Viewport (`zoom`, `scrollY`...) | `:871-875` | Rolagem e zoom |
| Pens/VFX (`motionBrush*`, `effectBrush*`) | `:901-914` | Pincéis |

### Sistema de histórico
- **`cloneSnapshot`** (`:74`) — cópia rasa inteligente que evita re-serializar Base64 pesados.
- **`pushHistory`** (`:88`) — limite de 20, limpa a pilha de redo.
- **`handleUndo`/`handleRedo`** (`:97`, `:112`) — `JSON.parse(JSON.stringify())` no lado oposto; desliga a guarda `isHistoryActionRef` por 50 ms.

## 3.2 Ciclo de vida inicial (`useEffect`, `App.tsx:147-248`)

1. `Promise.all([loadLevelsGallery(), loadProject()])` — lê galeria + projeto do IndexedDB em paralelo.
2. `tryRecoverFromOldLocalStorage()` busca o legado `tilescroll_project`.
3. Prioridade de escolha: salvo **com conteúdo** → legado **com conteúdo** → salvo (mesmo vazio).
4. **`migrateProjectGrid`** (`:128`) — migra grade de colisão 24px → 8px em todas as fases.
5. **`splitMixedProject`** (`mapMath.ts:148`) — separa projetos "mistos" (biomas + sub-biomas) em **duas telas** (vertical + extended 💜), remeando portais que cruzavam a divisão.
6. Projeto ativo com conteúdo que não está na galeria é injetado como primeira fase ("Fase recuperada da sessão ativa").
7. Restaura `tilescroll_active_level_id` do `localStorage`.
8. `isInitialLoadDoneRef` só vira `true` após **350 ms** — janela que evita o autosave sobrescrever o dado recém-carregado.

## 3.3 Autosave
- **Projeto ativo** (`:251-258`): debounce de **1.500 ms** → `saveProject` + `saveProjectSafetyBackup`.
- **Galeria** (`:260-263`): sem debounce, salva a cada mudança.

## 3.4 Persistência — `utils/storage.ts`

| Item | Valor |
|---|---|
| Database | `TileScrollDB`, versão `1` |
| Object store | `projects` (chaves *out-of-line*, sem `keyPath`) |
| Chaves | `active_project`, `levels_gallery`, `safety_backup_project` |
| `localStorage` | `tilescroll_active_level_id`, legado `tilescroll_project` |

| Função | Papel |
|---|---|
| `openDB()` | Promise sobre `indexedDB.open`; cria store no `onupgradeneeded` |
| `saveProject` / `loadProject` | `put`/`get` transacional; **erros viram `console.warn`** e resolvem `null` (pensado para iframes sandbox) |
| `saveLevelsGallery` / `loadLevelsGallery` | Idem, retornando `[]` em falha |
| `tryRecoverFromOldLocalStorage` | Lê `localStorage['tilescroll_project']` com `JSON.parse` defensivo |
| `saveProjectSafetyBackup` | Grava sob `'safety_backup_project'`, **ignora projetos vazios** (não sobrescreve backup com lixo) |
| `cleanupOldLocalStorage` | No-op (corpo vazio) — export morto, não importado pelo App |

## 3.5 Sistema de abas — `TabId` (`App.tsx:297`)

19 valores: `editor, levels, biomes, extended, clouds, markers, limits, dialogue, player, spawn, motion, effect, stamp, assets, marker_pen, layers, motion_canvas, events, screens`

| Aba | Componente renderizado no painel esquerdo |
|---|---|
| `editor` | *(sem painel — só canvas + minimapa + barra flutuante)* |
| `levels` | `LevelGalleryStudio` (`:2333`) |
| `biomes` | `BiomeStudio` (`:2348`) |
| `extended` | `SubBiomeStudio` (`:2359`) |
| `clouds` | `AtmosphereStudio` (`:2372`) |
| `markers` | `MarkerStudio` (`:2472`) |
| `limits` | `LimitsStudio` (`:2516`) |
| `dialogue` | `DialogueInteractionStudio` (`:2665`) |
| `player` | `PlayerStudio` (`:2621`) |
| `spawn` | `SpawnStudio` (`:2641`) |
| `motion` | `MotionStudio` (`:2533`) |
| `effect` | `EffectStudio` (`:2598`) |
| `stamp` | `StampStudio` (`:2685`) |
| `assets` | `AssetGalleryStudio` (`:2290`) |
| `marker_pen` | `MarkerPenStudio` (`:2312`) |
| `layers` | `MarkerLayersStudio` (`:2322`) |
| `motion_canvas` | `MotionCanvasStudio` (`:2768`) **+** `MotionCanvasWorkspace` (`:1913`) substitui o canvas |
| `events` | `EventGalleryStudio` (`:2814`) |
| `screens` | `ScreensStudio` (`:2273`) |

## 3.6 Handlers principais (índice)

| Domínio | Handlers |
|---|---|
| **Histórico** | `showToast :68`, `pushHistory :88`, `cloneSnapshot :74`, `handleUndo :97`, `handleRedo :112`, `migrateProjectGrid :128` |
| **Abas/jogo** | `handleSelectTab :298`, `handleTopNavSelect :663`, `handlePlayPhase :676`, `handleToolChange :854`, `handleCycleGrid :1749`, `handleMotionTool :1756`, `handleEffectTool :1769` |
| **Marcadores** | `handleAddMarkerAt :985`, `handleAddSubBiomeMarkerAt :1019`, `handleDropMarkerAsset :1050`, `handleDuplicateMarker :1225`, `handleReorderMarker :1244`, `handleAddMotionMarker :1287`, `handleUpdateMarkerPos :1328`, `handleUpdateMarker :1695`, `handleDeleteMarker :1703` |
| **Biomas** | `handleUpdateBiome :1381`, `handleAddBiomeFromPNG :1388`, `handleRemoveBiome :1412`, `handleMoveBiome :1419` |
| **Sub-biomas** | `handleAddSubBiome :1432`, `handleUpdateSubBiome :1448`, `handleRemoveSubBiome :1455` |
| **Fases** | `handleSaveCurrentAsLevel :1463`, `handleOverwriteSavedLevel :1484`, `handleLoadLevel :1498`, `handleDuplicateLevel :1507`, `handleDeleteLevel :1518`, `handleCreateNewEmptyLevel :1523`, `isProjectDirty :1552`, `snapshotCurrentToSlot :1559`, `switchCanvasLevel :1581`, `createNewCanvas :1599`, `handleConfirmCloseLevel :1626` |
| **Rotas** | `handleAddRoute :1717`, `handleUpdateRoute :1734`, `handleDeleteRoute :1741` |
| **Overlays VFX** | `handleUpdateOverlay :916`, `handleDeleteOverlay :926`, `handleDuplicateOverlay :936`, `handleMoveOverlayOrder :956`, `handleClearAllOverlays :975` |
| **Motion Canvas** | `pushMotionLayersHistory :487` (limite 40), `handleMotionUndo/Redo/Copy/Paste/Duplicate/Delete/Nudge :496-592`, `handleLoadMotionComposition :595`, `handleReplaceBaseAssetPng :647`, `handleSaveMotionCanvas :372` |
| **Import/drop** | `globalUploadRef :1335`, `handleGlobalPNGUpload :1337`, `handleDropPNG :1359` |

## 3.7 Atalhos de teclado (`useEffect`, `:732-847`)

Ignora foco em `input`/`textarea`/`contentEditable`.

| Contexto | Atalhos |
|---|---|
| Aba `motion_canvas` | `Ctrl+Z/Shift+Z/Y/C/V/D/S`, `Delete/Backspace`, setas (Shift = nudge 10px) |
| Demais abas | `Ctrl+Z` (undo), `Ctrl+Shift+Z` / `Ctrl+Y` (redo), `Ctrl+C` (`handleCopy :695`), `Ctrl+V` (`handlePaste :707`) |

## 3.8 Layout e composição

```
TopNav (sticky, 3 zonas)
├── Régua de chips "Telas" (:1793) — 🗺️ vertical / 💜 extended, ⚙️ gerenciar, ✕ fechar, + novo
├── Workspace flex
│   ├── Toolbar (importar PNG, zoom, grade, undo/redo)
│   ├── Canvas principal
│   │   ├── activeTab === 'motion_canvas' → MotionCanvasWorkspace (:1913)
│   │   └── senão → VerticalMapCanvas (:1961) + MiniMap (:2022)
│   ├── Barra flutuante de ferramentas (:2041-2237)
│   ├── Painel esquerdo de estúdio (460-500px, aba ativa)
│   └── Coluna direita (:2832-3112)
│       ├── MotionCanvasLayersPanel (se motion_canvas + layers)
│       └── alternador: Emulador / Marcador / Camadas / Dividido
└── Toast (:3116) + modal de fechamento (:3124)
```

## 3.9 TopNav (`components/TopNav.tsx`)

Header sticky de 3 zonas:
- **Zona 1** (`:46-58`): wordmark "TileScroll / Studio RPG" com ícone `Compass`.
- **Zona 2** (`:61-114`): 9 abas em controle segmentado — `levels`, `assets`, `screens`, `events`, `editor` (especial, `forceActive`), `player`, `dialogue`, `clouds` (badge "Atm"), `motion_canvas` (badge "Anim").
- **Zona 3** (`:117-154`): "Salvar Fase", "JSON", "Exportar PNG" (âmbar), "Player Fase" (esmeralda).

## 3.10 Exportação — `utils/exportHelpers.ts`

**`exportProjectJSON`** (`:8-17`): `JSON.stringify(project, null, 2)` → Blob → download `{titulo}_tiles.json`.

**`exportMapToPNG`** (`:22-133`):
1. `totalWidth = mapWidth || 768`; `totalHeight = getTotalMapHeight(biomes)`; `spans = getBiomeSegmentSpans(biomes)`.
2. Canvas offscreen com essas dimensões.
3. Pré-carrega imagens em paralelo: `tilePng` de cada bioma + `customIconPng` de cada marcador (erros resolvem igualmente).
4. `drawBiomeSpansWithFeather(ctx, spans, loadedImages, totalWidth)` — fundo sólido + tiles com `imageSmoothingEnabled = false`.
5. **Rotas**: polyline `strokeWidth 4`, tracejado `[12,8]` ou pontilhado `[4,6]`.
6. **Marcadores**: `translate` + rotação; PNG centrado (size 150) ou círculo colorido com borda branca 2.5px; rótulo em retângulo `#0f172a` com texto branco 12px.
7. `toDataURL('image/png')` → download `{titulo}_mapa.png`.

---

# 4. Modelo de Dados — types/map.ts

Arquivo de **1.077 linhas** com **~68 interfaces/tipos exportados**. É o contrato central do app.

## 4.1 Projeto, Biomas e Sub-Biomas

### `BiomeTileConfig` — segmento vertical do mapa

| Campo | Tipo | Significado |
|---|---|---|
| `id` / `name` | `string` | Identificador e nome |
| `tilePng` | `string` | Data URL do PNG de tiling |
| `tileWidth` / `tileHeight` | `number` | Dimensões exatas do tile (px) |
| `tileRepeatCount` | `number` | Repetições verticais para compor o segmento |
| `repeatCount?` | `number` | Alias de compatibilidade |
| `transitionBlendRows` | `number` | Linhas de transição suave ao próximo bioma |
| `baseColor` | `string` | Cor de tema/fallback |
| `biomeEvent?` | união única | Evento legado |
| `biomeEvents?` | `Array<...>` | Múltiplos climas simultâneos |
| `walkSpeed?` | `number` | Multiplicador de velocidade (0.5–2.0) |
| `playerScale?` | `number` | Escala do PNG do jogador |
| `cameraZoom?` | `number` | Zoom de câmera com transição suave |
| `bgmAudioUrl?` | `string` | Trilha/som ambiente (Base64 ou URL) |
| `bgmVolume?` | `number` | Volume 0–1 (padrão 0.7) |

### `SubBiomeConfig` — fase estendida (cenário interno)

Adiciona, além dos campos acima: `description?`, `parentBiomeId?`, `walkableCells?: string[]`, `blockedCells?: string[]`, `restrictPlayerToPaintedAreas?: boolean`.

### `MapProject` — raiz

| Grupo | Campos |
|---|---|
| Identidade | `id`, `title`, `description`, `canvasKind? ('vertical'\|'extended')`, `mapWidth`, `gridType` |
| Conteúdo | `biomes[]`, `subBiomes?[]`, `markers[]`, `routes[]`, `player?` |
| Atmosfera | `clouds?`, `fogConfig?`, `leavesConfig?`, `rainConfig?`, `windConfig?`, `bugsConfig?`, `antsConfig?`, `snowConfig?`, `lighting?` |
| Colisão | `walkableCells?`, `blockedCells?`, `collisionMode? ('walkable'\|'blockers'\|'hybrid')`, `restrictPlayerToPaintedAreas?`, `collisionGrid?` |
| Chão | `groundStamps?`, `stampLayers?`, `stampBrushConfig?` |
| Assets | `galleryAssets?`, `galleryCategories?`, `localAssetFolderConfig?` |
| Marcadores | `markerPenConfig?`, `markerLayers?`, `activeMarkerLayerId?` |
| Jogo | `savedDialogues?`, `motionOverlays?`, `spawnConfig?`, `screensConfig?` |

## 4.2 Marcadores

### `MapMarker` — objeto central (dezenas de campos)

| Grupo | Campos |
|---|---|
| **Identidade** | `id`, `name`, `description`, `type (MarkerType)`, `color`, `status`, `x`, `y`, `biomeId?`, `subBiomeId?`, `layerId?` |
| **Aparência** | `customIconPng?`, `size`, `rotation`, `flipX/flipY`, `hasShadow`, `bannerImagePng`, `rewardSlots?` |
| **Quest** | `questResourceType?`, `questResource?`, `questRequiredAmount?`, `targetDeliverableMarkerId?`, objeto `quest?` (7 kinds: `collect\|deliver\|reach\|interact\|talk\|discover\|duel`) |
| **Travel** | `travelTargetType? ('marker'\|'level'\|'sub_biome')`, `targetTravelMarkerId?`, `travelAuto?` |
| **Eventos** | `events?: MarkerEventItem[]` (modulares) + evento legado `eventKind?`, `eventWeather?`, `eventZoom?`, `eventDuration?`, `eventFreeze?`, `eventVideoUrl?`, `eventTrigger?`, `eventTriggerRadius?`, `eventTriggerDelay?`, `eventRepeat?`, `parentEventId?`, `delayAfterParent?`, `triggerAreaMarkerId?` |
| **Áudio espacial** | `audioUrl?`, `audioVolume?`, `audioShape? ('circle'\|'rect')`, `audioRadius?`, `audioWidth/Height?`, `audioBlendMode? ('mix'\|'solo')`, `audioPlaybackMode? ('restart'\|'continuous')` |
| **Cinemática** | `cinematicTargetType?`, `cinematicTargetMarkerId?`, `cinematicTargetX/Y?`, `cinematicZoom?`, `cinematicPanIn/Hold/PanOutDuration?`, `cinematicFreezePlayer?` |
| **Área** | `areaShape? ('circle'\|'rect')`, `areaWidth/Height/Radius?`, `areaColor?` |
| **NPC/Visual** | `npcBounce?`, `jellyStyle?` (6 estilos), `jellyIntensity/IdleIntensity/Speed?`, `effect?`, `effectSpeed/Intensity/Strokes?`, `motionLayers?`, `npcPhrases?`, `npcPatrol?`, `actionNpc?`, `emotionState?` |
| **Luz** | `lightConfig?` (`preset: torch\|lamp\|crystal\|campfire\|arcane\|custom`, `radius`, `color`, `intensity`, `flicker?`) |
| **Sombra** | `shadowOffsetX/Y?`, `shadowBlur?`, `shadowOpacity?`, `shadowShape? ('silhouette'\|'ellipse')` |
| **Colisão** | `solidCollision?`, `collisionRadiusScale?`, `collisionBaseOffsetY?`, `markerOff?` |
| **Diálogo VN** | `dialogueEnabled?`, `dialogueId?`, `dialogueCharacter*`, `dialogueText?`, `dialogueSteps?`, `dialogueOptions?`, `interactionButtons?` (8 actionTypes), `clickBehavior?` (4), `popupStyle?` |
| **Estação** | `stationConfig?: InteractiveScreenConfig` |
| **Mídia** | `mediaType? ('image'\|'video')`, `videoUrl?`, `videoChromaKey?` |
| **Pivô** | `pivotX?`, `pivotY?` |

### `ActionNpcConfig` — NPC de combate
`enabled, role, detectionRadius, sensoryRadius, spawnOrigin?, leashDistance?, moveSpeed?, locomotionStyle?, attacks, speechPhrases?, retaliateOnHit?, fleeOnWitnessCombat?, propagateFear?, showAnimeEmotes?, spontaneousPlayerApproach?, noBodyDeformation?, dropConfig?, targetAffiliation?, health?, maxHealth?`

Sub-objetos: `ActionNpcAttacks` (`jump`, `dash`, `hackSlash`, `ranged`, `standard`), cada um com `enabled/damage/cooldown` + parâmetros próprios e `attackAsset?` (type `none|png|motion|video`).

### `NpcPatrolConfig`
`enabled, preset ('horizontal'|'vertical'|'custom'|'procedural'), walkStyle ('jelly'|'slime_hop'), speed, distance, pauseTime, loop, customMode?, waypoints?[]`

## 4.3 Estações — `InteractiveScreenConfig`

`stationTitle/Subtitle`, `stationType ('incubator'|'furnace'|'alchemy'|'display'|'crafting'|'custom')`, `baseAssetPng/Scale/MotionEffect`, `slotsCount`, `slots: StationSubAssetSlot[]`, `activationTrigger ('proximity'|'click'|'both')`, `triggerRadius`, `unlockCondition: StationUnlockCondition`, `processTimeSeconds`, `processStatus ('idle'|'running'|'completed')`, `resultAsset*`, `showResultOnMap`, `availablePaletteAssets[]`, `spawnNpcOnHatch`, `spawnNpcMovementType ('wander'|'idle'|'patrol'|'bounce')`, `spawnNpcPatrolRadius`, `spawnNpcHasDialogue/Dialogue/LinkMarkerId`, e offsets de layout.

## 4.4 Eventos — `MarkerEventItem`

- `timing: 'simultaneous' | 'sequential'`, `delay?: number`, `trigger?: 'contact'|'interact'|'auto_start'|'sub_event'`
- **7 ações** (`MarkerEventActionType`): `quest`, `dialogue`, `teleport`, `sound_area`, `cinematic`, `weather`, `reward`

## 4.5 Atmosfera (9 configs)

| Config | Campos principais |
|---|---|
| `CloudConfig` | `enabled`, `customCloudPng(s)`, `cloudCount`, `speed`, `showTopClouds`, `showGroundFog`, `randomScalePercent`, `baseCloudScale`, `edgeOpacity`, `centerTransparency` |
| `FogConfig` | `enabled`, `fogCount`, `opacity`, `speed`, `tintColor`, `groundLevelPercent`, `customFogPng(s)` |
| `LeavesConfig` | `enabled`, `preset` (8), `customTint/customColors`, `leafCount`, `baseSize`, `randomScalePercent`, `speed`, `opacity`, `customLeafPngs` |
| `RainConfig` | `enabled`, `intensity`, `splashCount`, `splashSize`, `speed`, `puddlesEnabled`, `puddleSplashes` |
| `WindConfig` | `enabled`, `gustCount`, `speed`, `curvature`, `opacity`, `color` |
| `BugsConfig` | `enabled`, `preset/activeSpecies`, `bugCount`, `size`, `speed`, `customBugPng(s)`, `landOnPlayer`, `wingFlapSpeed` |
| `AntsConfig` | `enabled`, `antCount`, `soloCount`, `leafScale`, `leafChance`, `trailNetwork`, `size`, `speed`, `scatterRadius`, `trailPattern`, `customAntPng` |
| `SnowConfig` | `enabled`, `density`, `speed`, `windDrift`, `accumulateOnPlayer/Assets/Ground`, `footstepTracks`, `chromaticSparkle`, `customSnowPngs` |
| `LightingConfig` | `enabled`, `nightEnabled`, `darknessOpacity`, `flashlightRadius`, `showVignette`, `ambientDarkness/Color`, `heroTorch*`, `flickerStyle`, `threeLayerRender`, `lightBloom`, `globalWeather(s)` |

## 4.6 Motion

### `MarkerMotionLayer`
`id, name, visible?, effect, speed?, intensity?, brushSize?, strokes?[], isBaseAsset?, pngUrl?, x, y, scale, scaleX, scaleY, rotation, flipX, flipY, pivotX, pivotY, physicsMode? (15 modos), foldAxis?, clothMeshDensity?, clothSag?, flagWindAngle?, flagRippleFreq?, wingPhaseOffset?, spinDirection?, orbitRadius?, pins?[], linkedLayerId?, syncWingMirror?`

### `MotionOverlayStroke`
`id, name?, effect, brushSize, scale?, speed, intensity, points[], visible?, subBiomeId?, createdAt?`

### `VideoChromaKeyConfig`
`enabled, color, tolerance (0–100), smoothness (0–50), cropSquare?, cropOffsetX/Y?, videoSpeed? (0.25–3.0), scale?, flipH?`

## 4.7 Spawn, Telas, Diálogos, Stamps

### `SpawnConfig`
`enabled, targetX/Y?, targetMarkerId?, transportPng/Name/Scale?, entryDirection ('top'|'bottom'|'left'|'right'), speed, landingPause, effect ('none'|'jelly'|'squash'|'float'|'shake'|'glow'), effectIntensity/Speed, cameraFraming ('lower_half'|'center'), hidePlayerDuringTransit?, anchorMode?, offsetY?, flipHorizontal?, fadeTransition?, introVideoUrl/Speed?, introAudioUrl/Name?, fadeColor?`

### Sistema de Telas
- `GameScreenType`: `player_hud`, `dialogue`, `inventory`, `pause_menu`, `victory`, `game_over`, `custom`
- `ScreenButtonAction` (union discriminada): `navigate_screen`, `player_action (jump|attack|dash|interact)`, `open_inventory`, `toggle_locomotion`, `open_dialogue`, `trigger_event`, `pause_game`
- `ScreenCustomButton`: posição/âncora (6), forma (3), cor, `action`, `shortcutKey?`
- `PlayerHudConfig`: `backpackButton?`, `joystick?` (com `customDiscoUrl/customKnobUrl`), `touchMoveButton?`, `customButtons[]`

### Diálogos
- `DialogueStep`: `id, speaker?, characterPng?, text, playerResponses?[{id,label,nextStepIndex?}]`
- `SavedDialogue`: `id, name, speaker?, characterPng?, steps[], endEvent?` (`kind: none|quest|duel|travel|weather|video`)

### Stamps
- `GroundStamp`: `id, x, y, pngUrl, size, rotation, flipX, flipY, feather, opacity, layerId`
- `StampBrushConfig`: `pngUrl, size, feather, spacing, randomRotation, randomMirror, opacity, activeLayerId, savedPresets?`

### `SavedLevel`
`id, name, description?, createdAt, updatedAt, projectData: MapProject, thumbnailPng?`

---

# 5. Renderizador do Mapa Vertical

## 5.1 `VerticalMapCanvas.tsx` (3.200 linhas) — canvas do editor

> **Importante:** este componente é o **editor**, não o jogo. O loop de jogo/emulação vive em `PortraitEmulator`.

### Modos
- **Vertical**: biomas empilhados no eixo Y; `canvasH = totalMapHeight`.
- **Extended** (`:351`): sub-biomas lado a lado com `SUB_BIOME_GAP = 40` (`:360`).

### Cache de alfa (`pngAlphaCache`, `:57-96`)
`getPngAlphaData` reduz a 128px (`willReadFrequently`) para hit-testing pixel-perfect (threshold 25).

### Efeitos de ciclo de vida

| Efeito | Linha | Papel |
|---|---|---|
| Tecla Espaço = Pan | `:230-252` | Listeners globais keydown/keyup |
| Pan global | `:255-273` | Ajusta `scrollLeft/scrollTop` durante `isPanning` |
| Cache de tiles | `:508-524` | Cria `Image` por bioma → `renderTiles()` no `onload` |
| Cache de sub-biomas | `:526-541` | Idem para fases |
| **Loop rAF** | `:565-698` | Anima `motionOverlays` a 60 FPS + gizmos + cursor de pincel |
| API externa | `:823-825` | `motionApiRef = { extract, clear }` |
| Limpeza ao trocar ferramenta | `:827-829` | `clearMotion()` |
| Render principal | `:1161` | Dispara `renderTiles` |
| Scroll target | `:1166-1174` | Rolagem suave programática |
| Wheel zoom | `:1233-1243` | Ctrl/Cmd + scroll |
| Compensação de zoom | `:1246-1265` | Mantém ponto fixo do mouse |

### Camadas de desenho (ordem)

**No `<canvas>` (dentro de `renderTiles`, `:982`):**
1. Fundo `#020617` / `#0f172a`
2. **Tiles** via `drawBiomeSpansWithFeather`
3. Grid `squares` (`:1113`)
4. Overlay verde — `walkableCells` (`:1128-1142`)
5. Overlay vermelho — `blockedCells` (`:1144-1158`)

**No DOM (z-index):**
1. Frame + `<canvas>` (`z-0`, `pointer-events-none`)
2. Canvas de overlay do Motion Pen
3. **Ground Stamps** (`z-10`) — estritamente abaixo dos marcadores
4. Cursores de pincel (Stamp/MarkerPen/Limits)
5. Pips de rótulo de bioma
6. **Camada de marcadores** (`z-30`) com `zIndex` dinâmico por profundidade
7. Marcador do jogador (`#editor-player-marker`, `:3030`)
8. Modais (gallery, chroma key)

### Funções principais

| Função | Linha | Lógica |
|---|---|---|
| `focusMarkerCanvas` | `:333` | Centraliza câmera com `scrollTo({behavior:'smooth'})` |
| `isPixelOpaqueAtPoint` | `:386` | Desfaz rotação/flip, normaliza UV, consulta cache de alfa |
| `findTopmostOpaqueMarker` | `:448` | Ordena por camada/ordem/Y; respeita visibilidade/lock/grupo |
| `paintCellAtEvent` | `:831` | **Pintura de colisão** (detalhe abaixo) |
| `renderTiles` | `:982` | `useCallback` — desenho memoizado |
| `handleScroll` | `:1177` | Throttle de 1×/frame via `scrollRafRef` |
| `handleMapClick` | `:1194` | Cria marcador com `add_marker` |
| `placeStampAtEvent` | `:1272` | Dispersa `groundStamps` com espaçamento/rotação aleatórios |
| `placeMarkerPenAtEvent` | `:1332` | Dispersa marcadores da galeria; gera `npcPatrolConfig` para NPCs |
| `extractMotion` | `:714-821` | Recorta região do mapa com máscara → novo asset |
| `findOverlayAtPos` | `:1492` | Hit-test de overlays |
| `handleMouseDown/Move/Up` | `:1508/:1624/:1778` | Pan, arrasto, pincéis |
| `renderMarkerIcon` | `:1872` | Ícones lucide por `MarkerType` |

### Pintura de colisão — `paintCellAtEvent` (`:831-979`)

- **Extended**: grava `walkableCells`/`blockedCells` **locais** no `SubBiomeConfig`.
- **Vertical**: grava em `project.walkableCells`/`blockedCells`.
- Célula `COLLISION_CELL = 8px`; raio = `floor(limitsBrushSize/2)`.
- **Modos**: `paint` → adiciona verde e remove vermelho (liga `restrictPlayerToPaintedAreas`); `block` → inverso; `erase` → remove dos dois.
- **Espelho** (`mirrorLimits`, `:942-965`): replica a pintura dentro de cada repetição da tile do bioma.

### Padrões de performance
- `spans` com `useMemo` (`:346`) — não recalcula a cada scroll.
- `renderTiles` com `useCallback` (`:982`).
- Loop rAF de overlays (`:565`).
- **Sem virtualização** de marcadores — todos renderizados como DOM, profundidade simulada por `zIndex` dinâmico.

## 5.2 `MiniMap.tsx` (138 linhas)

"Radar" vertical (48×380px).
- `scaleY = 380 / totalMapHeight`
- Desenha segmentos de bioma coloridos (`baseColor`) + pontos de marcadores + caixa reticular da viewport.
- `handleSeek(clientY)` (`:35`) converte clique → `targetWorldY` → `onNavigateY`.
- Drag com `mousemove/mouseup` globais (`:54-72`).

## 5.3 `BiomeStudio.tsx` (573 linhas)

Edita `BiomeTileConfig[]`:

| Controle | Faixa |
|---|---|
| `name` | texto |
| `tileRepeatCount` | slider 1–200 / number 1–500 |
| `tileWidth/Height` | presets de escala 0.5x…16x |
| `biomeEvents` | night, rain, wind, leaves, dawn, bugs, ants (multi) |
| `walkSpeed` | 0.2–3.0 |
| `playerScale` | 0.1–10.0 |
| `cameraZoom` | 0.6–2.2 |
| `bgmAudioUrl` / `bgmVolume` | upload + preview |

Ações: importar PNG, substituir, `handleTrimBiome` (apara 1px, recalcula cor dominante), mover, remover.

## 5.4 `SubBiomeStudio.tsx` (687 linhas)

Gerencia fases Extended. Adiciona: trava de proporção (aspect ratio), largura 100–12000px, e **portais vinculados** (filtra `type === 'travel' && targetSubBiomeId === sb.id`).

## 5.5 `LimitsStudio.tsx` (377 linhas)

- **Pincéis**: `block` (Paredes, vermelho), `paint` (Circulação, verde), `erase` (Borracha).
- **Tamanhos**: 1x1=8px, 2x2=16, 3x3=24, 5x5=40.
- Controles: `mirrorLimits`, `restrictPlayerToPaintedAreas`.
- Ações em lote: `handleClearBlocked`, `handleClearWalkable`, `handleClearAllVertical`, `handleFillAllWalkable`, `handleClearEverything`.
- A pintura real acontece no canvas via `paintCellAtEvent`.

## 5.6 `RouteStudio.tsx` (225 linhas)

- Estilos `ROUTE_STYLES`: `dashed`, `solid`, `dotted`, `footprints` (o tipo ainda aceita `glowing`).
- `ROUTE_COLORS` — paleta de cores.
- `toggleMarkerInRoute` (`:48`) — adiciona/remove `markerIds`.
- Distância via `calculateRouteDistance` com `pixelToKmFactor = 0.5`.
- Botão "Expedição" — simulação de caravana (`onToggleCaravanSimulation`).

## 5.7 `LevelGalleryStudio.tsx` (222 linhas)

CRUD de `SavedLevel`: salvar (nome digitado ou `project.title`), nova fase vazia, renomear inline, sobrescrever, carregar, duplicar, excluir. Cards mostram badge "Fase Ativa" + contagens de biomas/marcadores + data.

---

**Referência: `utils/mapMath.ts`**

| Função | Lógica |
|---|---|
| `COLLISION_CELL = 8` | Tamanho da célula de colisão |
| `migrateCollisionCells(cells, from)` | Expande cada célula antiga em `k×k` células de 8px (idempotente via `Set`) |
| `getBiomeSegmentSpans(biomes)` | Acumula `startY/endY` por bioma: `height = max(1,repeat) * max(8, tileHeight)` |
| `getTotalMapHeight(biomes)` | Soma total, fallback `768`, mínimo `100` |
| `getBiomeAtY(y, spans)` | Busca binária linear; fallback = último span |
| `calculateRouteDistance(markerIds, markers, k=0.5)` | Soma `Math.hypot` entre pares consecutivos → `{pixelDistance, kmDistance}` |
| `generateCurvedPath(points)` | 1 ponto → `M`; 2 pontos → Quadrática com deslocamento 0.08; ≥3 → Catmull-Rom → Bézier `C` (`cp = p1 ± (p2-p0)/6`) |
| `splitMixedProject(pd, verticalLevelId, makeLevelId)` | Separa mistos em vertical + extended; converte travels que cruzam a divisão para `travelTargetType:'level'` |
| `subBiomeSig(pd)` | Assinatura `(ids ordenados).join('|')` para deduplicar fases extended |

---

# 6. Motor de Animação (Motion Canvas)

Sistema de animação 2D procedural: deformação de malha, física de transformação e VFX de luz/partículas.

**Duas camadas:**
- **Runtime** — `MotionAssetCanvas.tsx`: anima assets dentro de marcadores, players, estações e overlays.
- **Autoria** — `MotionCanvasStudio` + `MotionCanvasWorkspace` + `MotionCanvasLayersPanel` + `MotionBrushStudio`.

## 6.1 `utils/motionCanvasEngine.ts` (~1.242 linhas)

### Tipos
| Símbolo | Definição |
|---|---|
| `EffectType` | 17 valores: `none, water, vortex, gelatin, jelly, wind, rotation, pulse, fire, pendulum, glow, glitter, smoke, fireflies, sparks, cloth, flag` |
| `LayerStroke` | `{ id, points[], brushSize }` |
| `MotionConfig` | `{ effectType, speed?, intensity?, brushSize?, strokes? }` |
| `MeshVertex` | `{ ox, oy, x, y, weight, r, c }` (original → deformada) |
| `MeshGrid` | `{ cols, rows, vertices[][], width, height }` |

### Funções

| Função | Algoritmo |
|---|---|
| `distToSegment` | Projeção `t` clampada em [0,1] — base do peso por traço poligonal |
| `hash2D(x,y,seed)` | `sin(x*12.9898 + y*78.233 + seed*43.123)*43758.5453` — ruído determinístico |
| `drawTriangleTextured` | Mapeamento afim por triângulo: `clip()` + `transform` derivada do determinante UV; aborta se `\|det\| < 0.0001` |
| `createMeshGrid(w,h,cols=32,rows=32)` | Grade de vértices com `weight=1.0` |
| `computeMeshWeights(grid, strokes?)` | **Sem traço**: decaimento de borda 5%, `max(0.2, fx*fy)`. **Com traço**: gaussiana `exp(-0.5*(dist/radius)²)`, `radius = max(8, brushSize*0.55)`, só considera `dist < brushSize*1.5` |
| `updateMeshDeformation(grid, effect, t, speed, intensity)` | 11 equações de malha (ver abaixo) |
| `updateClothFlagMesh(grid, mode, t, speed, intensity, px, py, options)` | Versão densa: `cloth` usa distância vertical ao pivô + `drapeSag`; `flag` usa distância ao mastro e **rotaciona** o vetor por `flagWindAngle` |
| `renderDeformedMesh(ctx, img, grid)` | 2 triângulos por célula (UV = posições originais) |
| `isVfxOverlayEffect(e)` | `glow\|glitter\|smoke\|fireflies\|sparks` |
| `renderMotionOverlayStroke` | Traço **sem corte** (overlay) + casos extras: `fire`, `water` (`screen`), `wind` (dash animado), `jelly`, `vortex`, `pulse` |
| `composeMotionAssetSnapshot(basePngUrl, layers)` | PNG achatado: bbox projetado dos 4 cantos transformados + margens (`padX = max(32, 8%w)`, `padY = max(64, 15%h)`) |

### Equações de deformação (`phase = t*speed*4.0`)

| Efeito | Fórmula |
|---|---|
| `water` | `sin(phase*1.2 + ox*0.008 + oy*0.004) * 6*sInt` (X), `cos(...) * 12*sInt` (Y) |
| `vortex` | `currentAngle = atan2(dy,dx) + (phase + dist*0.005)*0.12*sInt` |
| `gelatin`/`jelly` | Oscilação por linha (`r*0.3`) e coluna (`c*0.3`) |
| `rotation` | `sin(phase)*0.09*sInt` |
| `wind` | Balanço lateral modulado por `oy*0.01` |
| `fire` | Tremulação + empuxo ascendente `-Y` |
| `pendulum` | Pivô fixo na base (`cx, height`), arco oscilante |
| `pulse` | `1 + sin(phase*2.5)*0.05*sInt` |
| `cloth`/`flag` | Liberdade `pow(normY,1.25)` / `pow(normX,1.35)` + onda + rajada |

Interpolação final: `v.x = v.ox + (targetX - v.ox) * v.weight`.

### VFX (blend `lighter`)

| VFX | Comportamento |
|---|---|
| `renderGlowVFX` | Halo Phong em 2 camadas (âmbar + núcleo branco), luz desliza com `sin(phase)` ou segue o traço |
| `renderGlitterVFX` | 48 partículas via `hash2D`, brilho `pow(max(0,sin),9)`, micro-flares em cruz |
| `renderSmokeVFX` | `puffCount = clamp(round(14*max(0.5,bSize/15)),6,24)`, ciclo `upwardRise`+`curlX`, densidade `sin(life*π)*0.45` |
| `renderFirefliesVFX` | 16 vagalumes com deriva Lissajous e respiração luminosa |
| `renderSparksVFX` | Arco Lichtenberg: 14 passos, 3 camadas (bainha violeta `shadowBlur 18` / plasma ciano / filamento branco) |

**`OFFICIAL_EFFECTS`** — lista canônica de `EffectMeta` (categoria `mesh`): `none, jelly, water, vortex, rotation, wind, fire, pendulum, pulse`.

## 6.2 `utils/motionPhysicsEngine.ts` (~532 linhas)

**15 `PhysicsMode`**: `hang, follow_parent, wing_flap, tail_wag, buzz, spin, orbit, spring, float, close_up, cloth, flag, breathe, blink, none`

**`PhysicsState`**: `{ angle (rad), offsetX, offsetY, scaleX, scaleY }`

**`PIVOT_PRESETS`** (7): Topo (0.5/0.05), Centro (0.5/0.5), Base (0.5/0.95), Ombro Esq/Dir, Lateral Esq/Dir.

### `computeLayerPhysics(layer, elapsed, parentHasJelly)`
Soma **impulso de gelatina do pai** quando `parentHasJelly` — mesma frequência do CSS `.animate-jelly` (`jellyFreq = 2π/1.3`), `parentBoost = 1.4`.

| Modo | Comportamento |
|---|---|
| `hang` | Pêndulo harmônico + harmônica secundária |
| `follow_parent` | Segue com atraso de fase `-0.5` |
| `spring` | Squash & stretch: `scaleX = 1-stretch*0.6`, `scaleY = 1+stretch` |
| `float` | Flutuação senoidal/cossenoidal orgânica |
| `close_up` | Dobra pura ao meio (eixo `foldAxis`), `\|cos\|^1.2`, **sem rotação** |
| `blink` | Ciclo macro `5.8/speed`: double-blink (1.15s/1.42s), pausa, single (3.6s), blink sutil (5.0s) |
| `cloth` | Ondulação + atraso pesado + caimento gravitacional |
| `flag` | Tremulação rápida (duas senoides) |
| `breathe` | `scaleY = 1 + pulse*1.3` |
| `wing_flap` | Batimento + `wingPhaseOffset`, `foldSpan` 3D, `syncWingMirror ? -1 : 1` |
| `tail_wag` | Chicote com onda secundária |
| `buzz` | `speed*32` com jitter X/Y |
| `spin` | 360° contínuo (`cw`/`ccw`) |
| `orbit` | Órbita elíptica com `orbitRadius` + bob |

### `applyLayerTransform`
Matriz: `translate(pos+offset)` → `translate(piv)` → `rotate(manual + physics.angle)` → `scale(base*deforme*flip*physics.scale)` → `translate(-piv)`.

### `computeNpcJellyTransform(elapsed)`
Reproduz o `@keyframes jellyJiggleIdle` (ciclo 1.3s, pivô 50%/100%) por interpolação cúbica entre 4 quadrantes com easing `t²(3-2t)`:
`(1.00,1.00,0°) → (1.14,0.88,-1.5°) → (0.90,1.12,+1.5°) → (1.06,0.95,-0.8°)`.

## 6.3 `MotionCanvasStudio.tsx` (~2.190 linhas) — orquestrador

- `MotionCanvasTool = 'move' | 'brush' | 'pivot' | 'pan'`
- `StudioTab = 'layers' | 'draw' | 'physics' | 'gallery'`
- Atalhos: `Ctrl+D` duplicar, `Ctrl+S` salvar, `Delete` excluir, setas = nudge 1px (Shift = 10px).
- `handleSaveCompositionToGallery()` — salva `"<Marcador> (Motion)"` ou `"Composição Motion Canvas"` no acervo.
- Aba `gallery` clonando profundamente (`JSON.parse(JSON.stringify)`) e recarregando via `onLoadMotionComposition`.

## 6.4 `MotionCanvasWorkspace.tsx` (~1.975 linhas) — canvas interativo

- `GizmoHandle = 'nw'|'ne'|'se'|'sw'|'n'|'s'|'e'|'w'`
- **Conversão de coordenadas** (`getCanvasPos`): corrige `canvas.width/rect.width` e faz clamp — pixel-exato mesmo com zoom/pan.
- **Pointer down**: botão meio/espaço/`pan` → pan; `move` → gizmo ou *hit-test* pixel-perfect; `brush` → ramifica por modo; `pivot` → `pivotX/Y` normalizado [0..1].
- **Gizmo**: `e/w` → `scaleX` (0.1–4.0), `n/s` → `scaleY`, cantos → `scale` uniforme (0.1–5.0); delta rotacionado pelo ângulo inverso da camada.
- **Borracha PNG**: canvas offscreen + `destination-out` interpolado (`applyPngErasePath`).
- **Borracha de traços**: filtra `strokes` com ponto a ≤ `brushSize`.
- **Esponja**: `repairInpaintArea(...)` → substitui o PNG reparado.
- **`executeCutoutExtraction(pts)`**: `extractCutoutPiece` → cria `MarkerMotionLayer` (`pivotY: 0.1`) → troca ferramenta para `move`.
- Retícula de pivô desenhada em `padX + x + activeW*pivotX`.
- Cursor dinâmico: `nwse-resize`, `nesw-resize`, `ew-resize`, `ns-resize`, `move`, `crosshair`.

## 6.5 `MotionCanvasLayersPanel.tsx` (~972 linhas)

Operações de camada: reordenar (botões **e** drag & drop), espelhar H/V, adicionar à frente/atrás, importar PNG, trocar base, copiar/colar, **duplicar com regra rígida** (nunca duplica `isBaseAsset`), visibilidade, excluir (base e última protegidas), renomear. Botão **Salvar** → `onTriggerSave`. Feedback temporário de 3s.

## 6.6 `MotionBrushStudio.tsx` (~633 linhas)

`BrushMode = 'brush' | 'lasso' | 'erase_strokes' | 'erase_png' | 'sponge'`
`ExtractionAction = 'copy' | 'cut' | 'cut_repair'`

Menus por modo: Esponja (raio 6–120px, presets 12/24/42/68), Pincel (4–100px, suavidade 0–4, chave Copy/Cut/Reparar, Auto Extrair), Laço (arredondamento 0–4), Borracha Traço (8–90px), Borracha PNG (4–90px).

## 6.7 `MotionAssetCanvas.tsx` (~674 linhas) — runtime

| Mecanismo | Detalhe |
|---|---|
| `GLOBAL_IMAGE_CACHE` | Evita recarregar o mesmo PNG (fallback remove `crossOrigin` em erro) |
| `ALPHA_BOUNDS_CACHE` | `getImageAlphaBounds` reduz a ≤96px, varre alpha > 15 → centraliza mesmo com margens assimétricas |
| `MASTER_INSTANCE_CACHE` | **Texture instancing**: o 1º clone vira Master Renderer; os demais só fazem blit se `master.lastFrameTime === time` |
| `GLOBAL_APP_START_TIME` | Timestamp compartilhado para sincronizar todos os assets |
| **Viewport culling** | `IntersectionObserver` (threshold 0.01, rootMargin 120px) pausa o rAF |
| **LOD de malha** | `lodCols/Rows = clamp(targetW/12, 5, 10)` |
| **Margens de segurança** | 35% em cada borda (asas/capas não cortam) |

Fluxo: `baseLayer = motionLayers.find(isBaseAsset)`; se `isSimpleImage` → `<img>` direto; senão loop rAF calcula `elapsed` → `jellyTransform` (se NPC) → por camada: base desenha direto, peças conectam pivô à âncora deformada na malha do pai (**rigging**), `cloth`/`flag` usam malha densa.

## 6.8 Cortes e Reparo

### `motionCutoutExtractor.ts` (214 linhas)
`extractCutoutPiece(...)`:
1. Converte pontos para coordenadas da arte (`-padX/-padY`).
2. `smoothPoints` — suavização Chaikin (75/25 e 25/75), `min(4, smoothLevel)` iterações.
3. Bounding box com raio (`brush` = `ceil(brushSize/2)+4`, `lasso` = 4).
4. Canvas offscreen: `lasso` → polígono + `clip()`; `brush` → traço + `source-in`.
5. `cut` → `destination-out` na origem; `cut_repair` → `repairInpaintArea` escalado.
6. Retorna `{ dataUrl, x, y, width, height, pivotX: 0.5, pivotY: 0.1 }` — **pivô no topo** (ideal para balanço pendurado).

### `motionInpaintRepair.ts` (285 linhas)
`repairInpaintArea(ctx, w, h, points, mode, brushSize)` — **Content-Aware Healing**:
1. Máscara offscreen (branco = reparar).
2. Bounding box com margem `max(16, brushSize*0.8)`.
3. **16 raios radiais** (a cada π/8) de cada pixel mascarado até pixel válido (`alpha > 10`), peso `1/(dist²+0.1)`.
4. **3 passes de difusão laplaciana**: `0.4*centro + 0.15*vizinhos` em R/G/B/A.
5. `putImageData` de volta.

Wrapper assíncrono: `repairImageWithSponge(sourceDataUrl, points, mode, brushSize)`.

---

# 7. Marcadores, NPCs e Eventos

## 7.1 Tipos de marcador → modos de edição

21 `MarkerType` mapeados em **9 modos de UI** (`MarkerStudio.tsx:307-322`): `npc`, `interactive_screen`, `neutral`, `light`, `area`, `travel`, `mission`, `event`, `ponto`.

`MarkerStatus`: `discovered | active | completed | locked`

**Presets** (`DEFAULT_PRESET_MARKERS`, `MarkerStudio.tsx:103-248`): 11 modelos — Ancião/Guarda/Mercador (NPC `jelly`), Tocha/Fogueira/Cristal (luz), Baú, Portal Dimensional (`vortex`), Chefe (`pulse`), Árvore (`wind`), Tenda.

**`QuestPatch`** (`:326`): `updateQuest(patch)` faz merge parcial mantendo o `kind` — evita sobrescrever campos não editados.

**5 sub-abas de edição**: Propriedades, Visual, Física, Efeitos, Eventos (`:1168-1330`).

## 7.2 Módulos (`marker-studio/modules/`)

Todos recebem `MarkerModuleCommonProps` (`marker, markers, project, galleryAssets, onUpdateMarker`).

| Módulo | Função |
|---|---|
| `MarkerNpcModule` | Sub-abas **Patrulha & Falas** e **Action NPC** |
| `MarkerActionNpcModule` | Editor completo de `ActionNpcConfig` (46KB) |
| `MarkerTravelModule` | Teleporte automático (`travelAuto`) + destino em marcador `travel` |
| `MarkerLightModule` | Presets torch/lamp/crystal/campfire/arcane: radius, color, intensity, flicker |
| `MarkerMissionModule` | Alterna `collectible`/`deliverable`; 6 recursos, quantidade, link |
| `MarkerAreaModule` | Formato `circle`/`rect`, raio/dimensões, cor |
| `MarkerNeutralModule` | Toggle "Modo Chão" (`markerOff`) |
| `MarkerStationModule` | Delega a `StationStudioPanel` |
| `AttackAssetSelector` | Asset de ataque (PNG/vídeo/galeria/chroma key) |

## 7.3 Abas de edição

| Aba | Conteúdo |
|---|---|
| **Visual** | Camada (🔒/🚫), tamanho 16–3000px, rotação 0–360°, sombra (silhueta/elipse) |
| **Física** | `solidCollision`, `collisionRadiusScale` (10–50%), `collisionBaseOffsetY` (−40…+40) |
| **Efeitos** | Editor das `motionLayers` (efeito, speed, intensity, strokes) |
| **Eventos** | Lista `events: MarkerEventItem[]` — ver abaixo |

### Sistema de Eventos (`MarkerEventsTab.tsx`, 67KB)

**7 ações** (`MarkerEventActionType`):

| Ação | Config |
|---|---|
| `quest` | kind `collect/talk/discover/duel`, recurso, quantidade, alvos |
| `dialogue` | `dialogueId`, texto, falante |
| `teleport` | destino `marker/level/sub_biome`, modo auto |
| `sound_area` | áudio, forma, raio/dims, volume, blend `mix/solo`, playback `restart/continuous` |
| `cinematic` | alvo (marker/coordinate/player), zoom, pan-in/hold/pan-out, freeze |
| `weather` | tipo (night/rain/dawn/leaves) + duração |
| `reward` | 6 slots de recompensa |

**Encadeamento:**
- `timing: 'simultaneous' | 'sequential'` + `delay` (segundos)
- `trigger: 'contact' | 'interact' | 'auto_start' | 'sub_event'`
- Legado: `eventTrigger` inclui `area_trigger`, `parentEventId` + `delayAfterParent`, `triggerAreaMarkerId`

## 7.4 `utils/npcActionEngine.ts` (~1.388 linhas) — IA de combate

### `NpcRuntimeState` (por NPC)
Posição atual/origem, HP, emoção, estado de IA (`idle | explore | approach_player | combat | flee | return_spawn`), alvo, **cooldowns por tipo de ataque**, ataque ativo (tipo, tempos, `hasImpacted`, asset), `bodyTransform` (offset/scale/rotação/altura do pulo/tilt), wander, strafe, timer de drop, `isSlime`.

### Configuração padrão

**`DEFAULT_ATTACK_CONFIGS`:**

| Tipo | Dano | Cooldown | Parâmetros |
|---|---|---|---|
| `jump` | 18 | 3.5s | 70px alto, raio 55, 0.85s |
| `dash` | 15 | 2.5s | 2.2×, 130px, 0.65s |
| `hack_slash` | 12 | 1.4s | alcance 60, arco normal, 0.75s |
| `standard` | 15 | 1.8s | 65, 0.8s |
| `ranged` | 16 | 2.8s | 260px, `magic_orb`, 520 px/s, 26px *(desativado por padrão)* |

**`DEFAULT_ACTION_NPC_CONFIG`**: hostile, detecção 110px, sensorial 260px, leash 340px, 85 px/s, 100 HP, `retaliateOnHit/flee/propagateFear/showAnimeEmotes/spontaneousApproach = true`, drops desativados (intervalo 15s, máx. 5).

### Lógica de ciclo

1. **`syncMarkers()`** — cria/remove estados conforme marcadores `npc` com `actionNpc.enabled`; papéis `peaceful/curious` nascem em `explore`; re-sincroniza origem se o editor moveu o marcador (>5px).
2. **`applyDamage`** — subtrai HP, emite VFX `damage_number` + `contact_spark`; HP < 30% → `flee`; senão emoção `angry` + `combat`. Depois **`broadcastCombatIncident()`** propaga pânico (medo 0.9 por 6.5s + balão "Socorro!") a todos no raio sensorial calmos.
3. **`setEmotion`** — 7 tipos com intensidade 0–1 e expiração; motivos: `witnessed_fight`, `attacked`, `player_approached`, `fear_propagated`.
4. **Combate** — cada ataque é mini-estado com duração/dano/cooldown próprios; `bodyTransform` calcula squash/stretch/lean/jump por frame. `ranged` spawna `ActiveProjectile` (7 tipos + custom) com colisão por alcance.
5. **`dropConfig`** — a cada `intervalSec` sorteia até 3 itens (chance %, tipo `gold/potion/key/gem/custom`); coleta a ≤32px via `onItemCollected`.
6. **Retorno**: `{ updatedPositions, vfx, projectiles, speechBalloons, droppedItems }`.

**`isSlimeMarker()`** — detecta slime por locomoção, `walkStyle`, `jelly`, `npcBounce`, ou regex (`slime|blob|jelly|gelatina|morcego|bat`).

**`globalNpcActionEngine`** — singleton exportado.

## 7.5 Overlays de NPC

### `ActionNpcCombatOverlay.tsx`
Renderiza VFX de combate, projéteis (rotacionados na direção do voo), balões de fala e itens dropados. `RenderAttackAsset` escolhe a fonte por `AttackAssetConfig.type`:
- **vídeo** → `VideoAssetCanvas` com chroma key
- **motion** → `MotionAssetCanvas`
- **png** → imagem estática

### `AnimeEmotionOverlay.tsx`
Emoções de anime em CSS/SVG:
- **Jogador idle**: `zzz`, `sweat`, `dots`, `sparkle`
- **NPC**: 💢 (raiva), 💧 (medo), ❓ (confusão), ❗ (alerta), ✨ (curiosidade), modulados pela `intensity`. Controlado por `showAnimeEmotes`.

**VFX ativos**: `slash_arc`, `dash_impact`, `jump_shockwave`, `contact_spark`, `damage_number`.

## 7.6 `EventGalleryStudio.tsx` (28KB)

Visão unificada de todos os acontecimentos:
- **Unificação**: marcadores `event`, qualquer um com `eventKind`/`eventWeather`/`eventZoom`, `travel`, com `quest` ou `dialogueSteps`.
- **Filtros** por busca e tags (Diálogo/Cena, Clima, Batalha, Teleporte, Vídeo, Timers).
- **Cards** com tipo, localização e duração; ações: focar, excluir, editar inline.
- **`handleCreateNewEvent`** cria marcador `event` com defaults (proximidade 64px, delay 0, kind dialogue).
- Árvore pai→sub-evento via `parentEventId`, `delayAfterParent`, `triggerAreaMarkerId` (linhas tracejadas com tags `+X.Xs`).

## 7.7 `EffectStudio.tsx` (24KB) — Effect Pen

**`EFFECT_PEN_PRESETS`** (8): `smoke`, `fireflies`, `glow`, `glitter`, `sparks`, `fire`, `water`, `wind`.

Parâmetros: tamanho do pincel, tipo, velocidade, intensidade, escala (0.1–5.0). Permite selecionar, arrastar/redimensionar no mapa, duplicar, reordenar, alternar visibilidade, limpar tudo. Cada stroke guarda `points[]` e pode vincular a sub-bioma.

## 7.8 `MarkerPenStudio.tsx` (29KB) e `MarkerLayersStudio.tsx` (30KB)

**Marker Pen** — semeia marcadores em lote (`MarkerPenConfig`):
- Tipo gerado: `neutral, light, npc, collectible, travel, event, camp`
- Assets: seleção múltipla sem limite; escolha aleatória ao pintar
- Randomização: espelho H/V, escala ±25%, rotação 0–360°, tamanho 24–200px, espaçamento 30–300px
- Efeito padrão (`OFFICIAL_EFFECTS`) + NPC auto-move (`horizontal/vertical/random/procedural`)

**Marker Layers** — gerenciador de `MarkerLayer[]`:
- Camada simples (cor cíclica) ou **grupo/pasta** (`isGroup`)
- Renomear, visibilidade, trava, reordenar, excluir, seleção múltipla
- **Separar camada em individuais** — uma camada cheia vira grupo com 1 camada por marcador, ordenada por Y

---

# 8. Atmosfera, Clima e Iluminação

## 8.1 Arquitetura de 3 camadas

| Camada | Local | Papel |
|---|---|---|
| **Configs** | `types/map.ts:640-755` | 9 tipos de configuração |
| **UI/Studios** | `AtmosphereStudio`, `CloudStudio`, `FogStudio`, `SnowStudio` | Editam via `onUpdateXConfig(partial)` |
| **Render** | `components/atmosphere/*` + `LivingAtmosphereLayers.tsx` | Canvas 2D (60fps) e/ou divs CSS |

### Ordem de composição (z-index, em `PortraitEmulator`)

| # | Camada | z-index |
|---|---|---|
| 1 | `OrganicSnowDriftsLayer` (dunas) | `z-[5]` |
| 2 | `OrganicRainPuddlesLayer` (poças) | `z-[6]` |
| 3 | `LeavesGroundLayer` | `z-[6]` |
| 4 | `RainGroundSplashesLayer` | `z-[7]` |
| 5 | `LivingAntColony` | `z-[7]` |
| 6 | `GroundFogLayer` (abaixo do player) | `z-[8]` |
| 7 | **Player + marcadores** | `zIndex = Math.round(posY)` |
| 8 | `LeavesAirLayer` | `z-[9940]` |
| 9 | `VolumetricWorldWind` | `z-[9930]` |
| 10 | `SnowWorldLayer` | `z-[9935]` |
| 11 | `LivingBugsLayer` | `z-[9945]` |
| 12 | Filtros (noite/alvorada/folhas) | `z-25` |
| 13 | `SkyCloudsLayer` | `zIndex: 9999` |

**Prioridade de clima** (`isWeatherEffectActive`, `:1065`): disable explícito no Studio > ativação explícita > `globalWeather(s)` > clima do bioma.

**Anti-zoom**: `setZoomVisual()` (`:863`) aplica `scale(1/z)` em `SkyCloudsLayer`, `GroundFogLayer` e `dawn` para a atmosfera não ser ampliada.

## 8.2 `AtmosphereStudio.tsx` (1.314 linhas) — 11 sub-abas

| Seção | Controles |
|---|---|
| **clouds** ☁️ | Renderiza `<CloudStudio>` |
| **fog** 🌫️ | Renderiza `<FogStudio>` |
| **night** 🌙 | `nightEnabled`, `darknessOpacity` (0.2–0.95), `flashlightRadius` (80–400 + presets), `showVignette` |
| **wind** 🍃 | `enabled`, `gustCount` (2–20), `curvature` (10–80), `speed` (1.5–8.0), `opacity` (0.1–0.9) |
| **rain** 🌧️ | `enabled`, `intensity` (10–100), `splashCount` (5–60), `splashSize` (14–60), `puddlesEnabled`, `puddleSplashes` |
| **dawn** 🌅 | Informativo (gradiente fixo) |
| **leaves** 🍂 | `enabled`, 7 presets, `customTint` + 8 swatches, upload `customLeafPngs`, `leafCount` (6–60), `baseSize` (16–80) |
| **snow** ❄️ | Renderiza `<SnowStudio>` |
| **bugs** 🪰 | `enabled`, espécies multi (`fireflies/butterflies/flies/custom`) + "TODOS JUNTOS", upload, `bugCount` (4–60), `landOnPlayer` |
| **ants** 🐜 | `enabled`, `leafScale` (0.8–3.0), `leafChance` (0.1–1.0), `soloCount` (0–35), `antCount` (10–100), `scatterRadius` (30–140) |
| **biomes** 🗺️ | Seletor multi por bioma/sub-bioma: `ALL_WEATHER_OPTIONS` |

## 8.3 Componentes de `atmosphere/`

| Componente | Papel e algoritmo |
|---|---|
| **`SkyCloudsLayer`** | `cloudCount = clamp(round(density*1.8+2),3,22)` divs; **seeds determinísticos** (`i*263`, `i*419`); tamanhos 160/250/360px × `baseScale`; `animate-cloud-float` (16s) |
| **`GroundFogLayer`** | Ativa se `fogConfig.enabled` **ou** `showGroundFog`; `clamp(round(density*1.6),3,18)` bancos em grade; `mixBlendMode: 'screen'` |
| **`RainAtmosphereLayer`** | **Splashes**: `clamp(area/90000,18,36)` elipses. **Puddles** (canvas): 9 poças orgânicas com máquina `dormant→growing→alive→drying`, respawn com seed; interação: player próximo → `FootSplash` (35%/frame) |
| **`LeavesAtmosphereLayer`** | Solo (`animate-autumn-leaf-ground`) + ar (`animate-autumn-leaf-air` com `rotateY/rotateX`); fontes `customLeafPngs` ou `getLeafGroupSvgs(preset, tint)` |
| **`OrganicSnowDriftsLayer`** | 7 dunas; `generateDriftContour()` — 7 pontos com `arch=sin(i/seg*π)` + noise `sin(i*1.7+seed)*0.25+0.75`; ciclo `dormant→accumulating→mature→settling`; **pegadas** a cada 14px com alternância pé esq./dir. (máx. 70) |
| **`AssetSnowCoat`** | Manto de neve no sprite; calcula caixa real compensando letterbox de `object-contain`; `accumulation` cresce em idle (+0.08/s); ao mover → **shatter físico** de 6–12 `SnowShard` com gravidade `+0.28` |
| **`SnowModule`** | Ver abaixo |

### `SnowModule.tsx` (1.252 linhas)

**`SnowStudio`**: `enabled`, `density` (1–10), `speed` (1.0–6.0), `windDrift` (−45–45), `chromaticSparkle`, `accumulateOnPlayer/Ground`, `footstepTracks`.

**Camada viva**: `SnowWorldLayer` (z-9935) — `round(density*18*scale)` flocos, drift senoidal, **micro-brilho cromático** em 20% (`i%5===0`) com `shadowBlur`, wrap em X/Y.

**Exports legados (não renderizados)**: `ProceduralSnowGroundLayer`, `ProceduralRainPuddlesLayer`, `VolumetricRainWorldLayer`, `InteractiveLeafPilesLayer` (dispersão 3D com atrito `*0.92`), `DynamicPlayerSnow`.

> **Pipeline de neve atual**: `SnowWorldLayer` + `OrganicSnowDriftsLayer` + `AssetSnowCoat`.

## 8.4 `LivingAtmosphereLayers.tsx` (879 linhas)

### `LivingAntColony` (z-7, canvas)
- **4 trilhas**: Trilha 0 = S de Bézier cúbica; Trilha 1 = **laço oval fechado** com perturbação `sin(2θ)`; 2/3 = arcos de Bézier. Desenhadas tracejadas (feromônio).
- **`AntTrailUnit`** (42): `t` avança por `speed*(1+panic*2.3)`, `direction ±1`, `hasLeaf` em 60% (3 tipos). **Pânico**: `dist < 65px` → empurrão radial; decai `*0.92`; ângulo de fuga vira `atan2(panicVy,panicVx)` quando `panic > 0.15`.
- **`SoloAntUnit`** (14): wander Brownian (`wanderAngle += rand*0.22`) com **ciclo de pausa para farejar** (400–1300ms parada / 1800–5300ms andando). Pânico instantâneo a `dist < scatterRadius*1.15`.
- `drawBigLeaf()` — 3 tipos vetoriais (tropical, serrada, trevo).

### `LivingBugsLayer` (z-9945, canvas)
Espécies: `fireflies | butterflies | flies | custom`. Escala (borboleta 1.45×, vagalume 1.05×, mosca 0.85×). Física: `wanderAngle`, lerp `0.06`, `maxSpd` por espécie (0.9/1.4/1.1), `wingFold = 0.4+|sin(flap)|*0.6`.
**Vagalumes**: glow radial `pulse = max(0, sin(now*pulseFreq+phase))^3`.
**Pouso no player** (`landOnPlayer`, `i%5===0`): máquina `flying→approach→landed→takeoff` (espera 6–9s, pousa a ±14px, decola com impulso).

### `VolumetricWorldWind` (z-9930, DOM)
`gustCount` divs com `WIND_GUST_SVG`, `mixBlendMode: 'screen'`, `animate-wind-gust` (`stroke-dashoffset: 700→-700`).

## 8.5 `CloudStudio.tsx` / `FogStudio.tsx`

Mesmo padrão: toggle + upload múltiplo de PNGs + sliders.

| Studio | Controles |
|---|---|
| **FogStudio** | `fogCount` 1–10, `opacity` 0.05–0.80, `speed` 10–60s, `groundLevelPercent` 20–100, 5 `TINT_PRESETS` (branco/azul/esmeralda/roxo/sépia) |
| **CloudStudio** | `cloudCount` 1–10, `randomScalePercent` 0–200, `baseCloudScale` 40–300, `edgeOpacity` 0.2–1.0, `centerTransparency` 0–0.6, `speed` 4–40s |

## 8.6 `defaultAtmosphereAssets.ts` (238 linhas)

SVGs embutidos como data-URI: `FIREFLY_SVG`, `FLY_SVG`, `BUTTERFLY_SVG`, `ANT_SVG`, `WIND_GUST_SVG`, `DEFAULT_FOG_SVG`, `DEFAULT_CLOUD_SVG`, e 7 arrays de folhas (`AUTUMN/SPRING/DRY/JUNGLE/MYSTIC/FROST/NEON_LEAF_SVGS`, 3 cada).

**`applyCustomTintToSvg(svgUrl, tintHex)`** — decodifica, substitui **todos** os `fill` via regex, reencoda; falha → original.
**`getLeafGroupSvgs(preset?, customTint?)`** — `autumn` é default *e* fallback (inclusive para `'custom'`).

## 8.7 Iluminação — estado atual

**Expõe na UI**: `nightEnabled`, `darknessOpacity`, `flashlightRadius`, `showVignette`.

**O que efetivamente renderiza:**
- Filtro noturno: div `bg-slate-950/40` com transição 1s (`:5258`) — **não usa `darknessOpacity`**.
- Lanterna: halo fixo `w-80 h-80` com `radial-gradient` âmbar (`:5123`) — **não usa `flashlightRadius`/`heroTorch*`**.
- Alvorada (`dawn`, `:5263`) e tint de folhas usam gradientes fixos por preset.

> ⚠️ `ambientDarkness`, `ambientColor`, `heroTorchRadius/Color/Intensity`, `flickerStyle`, `threeLayerRender`, `lightBloom` estão **persistidos mas não consumidos** pelo renderer.

---

**Referência: `utils/canvasSeamBlend.ts`**

`drawBiomeSpansWithFeather(ctx, spans, tileImages, totalMapWidth)` — por span:
1. `imageSmoothingEnabled = false`
2. Preenche fundo sólido `baseColor` no retângulo do span (base de segurança)
3. Loop `row < repeatCount`: `h = isLastRow ? max(tileH, span.endY - rowY) : tileH+1`
4. Loop `x < totalMapWidth` com passo `tileW`: `w = isLastCol ? max(tileW, totalMapWidth - x) : tileW+1`
5. `drawImage(img, 0,0,naturalW,naturalH, x, rowY, w, h)` — **+1px de folga** em cada linha/coluna elimina costuras transparentes

---

# 9. Emulador de Jogo — PortraitEmulator.tsx

## 9.1 Visão Geral

`PortraitEmulator.tsx` (~6.686 linhas) — o **maior arquivo do projeto**. Emula o app em modo retrato (500×1080px) para preview jogável.

**Responsabilidades:**
- Renderizar o mundo (biomas, marcadores, NPCs, estações, diálogo).
- Loop de física/jogo (3× `requestAnimationFrame`).
- Input do jogador (toque, joystick virtual, botões HUD).
- Colisão e navegação, áudio espacial.
- Spawn/transporte, diálogo VN, estações interativas.
- HUD/mochila/pause, `screensConfig` (edição inline).

Viewport fixo: `SCREEN_WIDTH=500`, `SCREEN_HEIGHT=1080` (l.107-108). `interface Props` l.73; componente inicia l.363.

## 9.2 Estado Principal

| Linha | Estado | Tipo | Papel |
|---|---|---|---|
| 396-397 | `spawnPhase` | `'idle'\|'fading'\|'approaching'\|'landed'\|'departing'` | Fase do spawn cinemático |
| 925-932 | `screensConfig`, `activeScreenConfig`, `hudConfig`, `joystickConfig`, `backpackConfig`, `touchMoveConfig` | Derivação | HUD vindos de `project.screensConfig` |
| 1061 | `liveDialogueMarker` | `MapMarker \| null` | Marcador ativo no balão de diálogo |
| 1069 | `playerInventory` | `InventoryItem[]` | Itens coletados |
| 1071 | `inventoryOpen` | `boolean` | Mochila aberta |
| 1072 | `bpTab` | `'items'\|'equipment'\|'skills'` | Aba da mochila |

## 9.3 Ciclo de Vida (useEffects)

| Linha (aprox.) | Gatilho | O que faz |
|---|---|---|
| ~730-739 | montagem | spawn inicial conforme `spawnConfig` |
| ~722-727 | `testSpawnTriggerId` | dispara spawn ao ativar gatilho de teste |
| ~742 | câmera | `applyCameraZoomFor` |
| ~776 | bioma/segmento | `syncBiomeBgmFor` (troca de BGM por bioma) |
| ~870 | zoom | `setZoomVisual` atualiza transform visual |
| ~1960-1971 | marcadores | sync de elementos por `data-mid` |
| ~2124 | animação | loop de motion overlays |
| ~2325 | animação | loop de patrulha NPC |
| ~2822 | animação | loop do player |

## 9.4 Loop de Jogo (3 rAF)

| Loop | Linha | Atualiza por frame |
|---|---|---|
| Motion overlays | ~2.124 | `renderMotionOverlayStroke`, VFX contínuos (glow, glitter, smoke) |
| NPCs | ~2.325 | `globalNpcActionEngine.update/sync` — emoções, combate, patrulha, drops |
| Player | ~2.822 | Posição, colisão, áudio espacial (~3.134-3.164) |

**Constantes do player:** velocidade walk 120 px/s, run 180 px/s; raio de colisão 8px; gravidade 980 px/s² (pulo).

**Colisão:**
- `walkableBlockedAt(col, row)` (~2.839) — verifica `project.walkableCells`/`blockedCells`.
- Grid `COLLISION_CELL = 8px`; sólidos de obstáculo: `obstacleSolids` (~2.863).
- Modos: `walkable`, `blockers`, `hybrid`; `restrictPlayerToPaintedAreas`.

## 9.5 Input

- **Nenhum teclado no emulador.** Atalhos `Ctrl+Z`/setas vivem só no editor (`App.tsx` l.733, setas 788-803, listeners 845-846).
- Toque/ponteiro: `handlePointerMove/Up` (6.107/6.140), `handleMouseMove/Up` (~6.365), `handleTouchMove/End` (6.382/6.399).
- Joystick virtual: `setVector`/`knob` (9.469), JSX (6.320-6.347), `maxRadius = 38px` (de `PlayerHudConfig.joystick`).
- Botões HUD custom têm `shortcutKey` (ex.: `'J'`, `'Space'`), mas o disparo no emulador é por toque.

## 9.6 Câmera e Interação

- `applyCameraZoomFor(segment)` (7.42); `setZoomVisual()` (8.70); rolagem acompanha `playerPos`.
- `handleInteractWithStation` (1.477) — ativa estação por clique/proximidade (`activationTrigger` + `triggerRadius`).
- `performTravelMove` (1.397); `handleTravelToSubBiome` (1.709); `handleTravelToLevel` (1.724).
- `handleDialogueBoxClick` (1.862) — avança falas VN.
- Eventos de marcador (`MapMarker.events`): `weather/zoom/dialogue/popup/video/duel/cutscene/vfx/teleport/sound/cinematic/sound_area/quest`. Gatilhos: `proximity|interact|on_enter_map|timer|quest_complete|sub_event|area_trigger` (l.414) + `eventTriggerRadius/Delay`, `eventRepeat`. Clima via `eventWeather` e `globalWeather(s)` (`LightingConfig`, l.753-754).

## 9.7 Renderização em Camadas (fundo → frente)

1. Chão/bioma + `groundStamps` (z baixo).
2. Motion overlays (traços).
3. Marcadores mundo: `StationWorldMarker` (base z-10, slots z `35+idx`, resultado z-20, lock z-30).
4. NPCs + overlays (`AnimeEmotionOverlay`, `ActionNpcCombatOverlay`).
5. Player DOM (~5.129-5.450).
6. Clima/atmosfera: `CloudsLayer`, `RainAtmosphereLayer`, `SnowModule`, `LeavesAtmosphereLayer`, `GroundFogLayer`.
7. Overlay noturno/vinheta (refs 1.952-1.959).
8. Diálogo/estação modal (`StationInteractiveModal`, `absolute inset-3 z-50`).
9. HUD/joystick/mochila/popup (~4.833-5.129) + modais (inventory ~5.919-5.955).
10. `screensConfig` custom buttons (edição inline ~6.017-6.096).

## 9.8 Spawn Cinemático

**Fluxo:** `executeSpawnTransit()` (4.48) → `finishIntroVideoAndStartSpawn()` (5.21, espera intro video) → `runSpawnAnimation()` (5.58). Gatilho de teste em 7.22-7.27; spawn inicial no mount (7.30-7.39).

**Config** (`SpawnConfig`, `map.ts:819`): `entryDirection` (top/bottom/left/right), `transportPng`, `speed` 0.5–4.0s, `landingPause` 0.5–2.0s, `effect` (`none|jelly|squash|float|shake|glow`).

## 9.9 Áudio Espacial

- `syncBiomeBgmFor(segment)` (7.76) — BGM por bioma (`bgmAudioUrl`/`bgmVolume`).
- Modos de som de marcador: `one_shot` (uma vez ao entrar no raio) e `continuous` (enquanto no raio, fade in/out), ~3.134-3.164.
- Raio: `audioRadius` ou `audioWidth`/`audioHeight`; volume `audioVolume`; blend `mix`/`solo`.

## 9.10 Diálogo Visual Novel

- `dialogueSteps[]` (`map.ts:516-522`): `id`, `speaker`, `characterPng`, `text`, `playerResponses[]` (opções levam a steps diferentes).
- Avanço por clique no balão; fim → `onDialogueEnd()` (dispara evento de fim se definido).

## 9.11 Estações Interativas — Runtime

**`StationInteractiveModal.tsx`** (~614 linhas):
- Estado: `slots`, `status` (`idle/running/completed`), `timeLeft`, `isEggDrawerOpen` (44-48).
- Timer real-time via `setInterval` 1s (58-75) → `handleHatchProcessComplete` (78).
- Ao eclodir: gera N NPCs em círculo (`angle = idx/total*2π`, raio 44 + i%2*14) com `npcPatrol` (118-150); 1 → objeto, >1 → array via `onSpawnNpcMarker`.
- Slots: adicionar/remover/preencher/limpar (180-223); `handleStartProcess` (225) exige `occupied>0`.
- UI com slots posicionados sobre a PNG base (355-415), animação `eggOrganicJellyEmulator` (260-279) durante `running`, drawer de ovos (538-610).
- Defaults: 6 slots, 10s, tipos de ovo em `defaultStationAssets` (50-55).

**`StationWorldMarker.tsx`** (~185 linhas): base (`customIconPng || baseAssetPng`) + `MotionAssetCanvas` se `baseMotionEffect ≠ none` (84-96); slots zIndex `35+idx` (110-143); resultado em `completed` (146-171); badge de `Lock` se `unlockCondition` não atendida (174-181).

## 9.12 HUD e Inventário

- `PlayerHudConfig` (`map.ts:1033`): `backpackButton`, `joystick` (disco+knob, `maxRadius` 38), `touchMoveButton`, `customButtons[]`.
- `ScreenCustomButton` (`map.ts:1014`): `anchor` (6 pontos), `shape`, `action`, `shortcutKey`.
- Defaults: `btn-attack-default` (J, bottom_right -24,68), `btn-jump-default` (Space) — `ScreensStudio.tsx:76-111`.
- Inventário: `playerInventory` (1069), `inventoryOpen` (1071), `bpTab` (1072); painel ~5919-5955.

## 9.13 Integração ↔ App

- Recebe `project` + `onUpdateProject` (persiste `screensConfig`, `spawnConfig`, `markers`).
- Edição inline de telas (6.028-6.096, 6.234-6.258) via `getOrCreateScreensConfig` (`ScreensStudio.tsx:45`).
- Estação: `onSpawnNpcMarker` → adiciona NPC(s); `onUpdateMarker` sincroniza `stationConfig`.
- **Sem `onPlayerMove` exposto** — posição interna ao loop rAF.

## 9.14 Achados de Qualidade

| Severidade | Achado |
|---|---|
| 🔴 Alta | Monólito ~6.686 linhas → extrair subsistemas (spawn, clima, HUD, diálogo, estação). |
| 🔴 Alta | 3 loops rAF + N camadas de clima + overlays → culling/visibility por viewport. |
| 🟡 Média | Duplicação HUD/joystick entre `PortraitEmulator` (925-932) e `ScreensStudio` (144-165). |
| 🟡 Média | Sync DOM↔estado imperativa (`data-mid`, refs) → risco de dessincronização. |
| 🟡 Média | Input só de toque — desktop sem emulação de toque falha. |
| 🟢 Baixa | `setInterval` da estação com `station` recriado a cada render pode reiniciar o timer (`StationInteractiveModal.tsx:58-75`). |

---

# 10. Galeria de Assets, Vídeo e Chroma Key

## 10.1 `AssetGalleryStudio.tsx` (~1.643 linhas)

**Categorias** (L46-52): `Motion Canvas`, `Telas Interativas`, `Marcadores da Fase`, `Carimbos`, `Geral`; merge com `project.galleryCategories` + categorias descobertas (L93-101).

**Funcionalidades:**
- Upload em massa (L214-280): imagens via `readUploadedImage`, vídeos via `readUploadedVideo` (com **chroma key default verde** já aplicada, tol 35, smooth 12, crop 1:1 — L237-245).
- Import por pasta (L284-334): `webkitRelativePath` → categoria automática.
- **Auto-sync marcadores → galeria** (L127-190): `useEffect` em `project.markers` importa `customIconPng` não catalogados; classifica por `motionLayers`→`Motion Canvas`, `stationConfig`/`dialogueId`→`Telas Interativas`, senão `Marcadores da Fase`. Deep clone via `JSON.parse(JSON.stringify)`.
- Modal de gerenciamento avançado (L1131-1299): seletor de tipo de marcador, `onInsertMarker` (dedup por `dataUrl`), `onSetAsStamp` (→ `stampBrushConfig.pngUrl` + ferramenta `stamp_brush`).
- Preview de vídeo na grade (L1054-1056, L1545-1547): `VideoAssetCanvas` com chroma key do asset.
- Modal Chroma Key (L1633-1634): ao salvar, propaga para `galleryAssets` + todos os `markers` que compartilham o `videoUrl` (L376-391).

**Persistência:** `galleryAssets: GalleryAsset[]` é campo de `MapProject` → blob único em `active_project` (IndexedDB). Vídeo: thumbnail em `dataUrl` + vídeo completo em `videoUrl` (ambos Base64).

## 10.2 Modelo — `GalleryAsset` (`types/map.ts:903-922`)

`id`, `name`, `dataUrl`, `width?`, `height?`, `createdAt?`, `mirrored?`, `category?`, `subCategoryPath?`, `tags?`, `motionLayers?`, `sourcePath?`, `isPersistentPhaseAsset?`, `mediaType? ('image'|'video')`, `videoUrl?`, `videoChromaKey?`, `pivotX?`, `pivotY?`.

`LocalFolderAsset` (~L924-940) e `FolderTreeNode` (~L942-950): metadados + `previewUrl` (object URL) + `dataUrl?` + `fileHandle?` (FS Access); árvore com `subfolders[]`, `fileCount`, `directFileCount`, `level`.

## 10.3 `VideoAssetCanvas.tsx` (~397 linhas)

**Props** (L5-23): `videoUrl`, `chromaKey?`, `targetDurationSec?`, `playTrigger?`, `autoPlay/loop/muted/playsInline` (true), `paused?`, `onSampleColor?`, `pipetteActive?`.

**Ciclo de vida:**
1. **Cache hit** (L76-103): `getPreloadedVideo` — se `readyState≥2`, reaproveita, play do frame 0.
2. **Cache miss** (L105-154): `preloadVideoUrl` → cache global; `loadeddata` → metadata + play.
3. **Cleanup** (L156-161): pausa só se não for o cacheado.

**Pipeline por frame** (rAF, L187-324): `drawImage(video→offCanvas)` full-res → `getImageData` → loop por pixel → `putImageData` → desenha no canvas visível com translate/scale/flip/pan. Config via `chromaKeyRef` (L63-65) — sem reiniciar o loop.

**Algoritmo chroma key** (L253-288):
```
tol = (tolerance/100) × 240
smooth = max(0.1, (smoothness/100) × 70)
dist = √(Δr² + Δg² + Δb²)
dist < tol        → alpha = 0
dist < tol+smooth → alpha *= (dist-tol)/smooth
```
- Normalização defensiva: valores ≤1 tratados como fração ×100 (L262-264).
- Fallback CORS (L295-303): `getImageData` falha → desenha **sem** chroma key (silencioso).
- Crop 1:1 (`cropSquare`): `destW/H = min(vw,vh)`; pan via `cropOffsetX/Y` (L244-251).
- Auto-speed (L231-240): se `videoSpeed` ausente ou `1.0` → `playbackRate = clamp(duration/targetSec, 0.25, 3.5)`, reaplicado a cada frame.
- `playTrigger` (L165-173): número muda → `currentTime=0` + `play()`.
- Pipeta (L327-381): mapeia canvas→vídeo invertendo transformações, amostra 1×1 px → hex.

**Cache global** (`videoUtils.ts` L159-185): `Map<url, HTMLVideoElement>`, `preload='auto'`, `crossOrigin='anonymous'`; **nunca invalidado**.

## 10.4 `VideoChromaKeyModal.tsx` (~764 linhas)

Defaults `DEFAULT_CHROMA_KEY` (L39-50); presets `COLOR_PRESETS` (L52-58). Estado local para `videoSpeed`, `scale`, `flipH`, `pivotX/Y` (L78-90). Preview com fundo xadrez (L205-241). Pipeta (L112-119, 340-352). `handleSave` (L121-142) → `onSave({chromaKey, pivotX, pivotY})`; `handleReset` (L144-151).

## 10.5 `videoUtils.ts` (~186 linhas)

- `readUploadedVideo` (L1-118): → dataURL + thumbnail via canvas (timeout fixo 3s, L107-111 — codecs lentos podem cair no fallback).
- `getVideoDuration`, `preloadVideoUrl`, `getPreloadedVideo` (cache L159-185).

## 10.6 Fluxo de Inserção no Mapa (`App.tsx` L1055-1222)

1. Recuperação Base64 (L1072-1077): `localAssetSyncService.getCachedBase64` se `sourcePath`.
2. Conversão blob→Base64 (L1080-1092): `fetch`+`FileReader`.
3. Dedup no acervo (L1095-1112): por `dataUrl` **ou** `sourcePath`; novo → `GalleryAsset` com `isPersistentPhaseAsset: true`.
4. Coordenadas (L1124-1152): resolve `biomeId`/`subBiomeId` por varredura de spans.
5. Cria `MapMarker` (L1165-1206): `customIconPng`, `motionLayers` deep-cloned, `mediaType`/`videoUrl`/`videoChromaKey` herdados, `pivotX/Y` default 0.5.
6. `pushHistory` → `setProject` → seleciona → abre painel (L1208-1221).

## 10.7 `localAssetSyncService.ts` (764 linhas)

Singleton observável (`subscribe`/`notify`, L59-75).

| Fase | Linhas | Detalhe |
|---|---|---|
| Persistência do handle | L80-141 | IndexedDB separada; `queryPermission`/`requestPermission` no reconnect |
| Conexão FS Access | L146-202 | `showDirectoryPicker({id, mode:'read'})`; `AbortError` = cancelamento |
| Fallback `webkitdirectory` | L269-337 | Infere categorias; **sem polling** (`isWatching: false`) |
| Scan recursivo | L433-495 | Pula `.`, `node_modules`, `Thumbs.db`, `desktop.ini`; diff por `lastModified-size` |
| Diffing / cache eviction | L377-402 | Revoga `objectURL`; limpa `base64Cache` |
| Watcher | L500-535 | Polling 2.5s (aba visível) + `window focus` (fluxo Photoshop/Aseprite) |

## 10.8 Sincronização: Export, Backup, Níveis

| Mecanismo | Onde | Detalhe |
|---|---|---|
| Export JSON | `exportHelpers.ts` L8-17 | `JSON.stringify(project, null, 2)` → download `.json` |
| Import JSON | `App.tsx` ~L220-242 | Parse → valida `canvasKind` → `migrateProjectGrid` → `setProject`; fallback `tryRecoverFromOldLocalStorage` → `DEFAULT_PROJECT` |
| Autosave | `App.tsx` L250-258 | Debounce 1.5s; só após `isInitialLoadDoneRef`; salva `active_project` + `safety_backup_project` |
| Níveis | `storage.ts` L80-118 | `levels_gallery: SavedLevel[]` — cada um embute `projectData` **completo** |
| Backup | `storage.ts` L143-160 | Ignora projeto vazio; chave `safety_backup_project` |
| Multi-aba/dispositivo | — | **Não implementado** — sem lock/`storage` event; duas abas disputam `active_project` |

## 10.9 Achados de Qualidade

| Severidade | Achado |
|---|---|
| 🔴 Alta | Chroma key em CPU por pixel a 60fps — vídeos grandes causam jank. |
| 🔴 Alta | `preloadedVideoCache` nunca invalidado → vazamento de memória. |
| 🔴 Alta | `SavedLevel.projectData` duplica projeto inteiro (Base64 incluído) por nível. |
| 🟡 Média | Fallback CORS silencioso (chroma key desliga sem avisar). |
| 🟡 Média | `videoSpeed === 1.0` indistinguível de "auto". |
| 🟡 Média | Todo vídeo recebe chroma key verde `enabled:true` no upload. |
| 🟡 Média | Autosave serializa Base64 de todos os assets → lag no debounce. |
| 🟡 Média | Dois modos de categoria quase idênticos (`AssetGalleryStudio` L46 vs `LocalFolderGalleryView` L23). |
| 🟢 Baixa | Export monolítico não comprime; undo/redo via `JSON.parse(JSON.stringify)` frágil; sem `BroadcastChannel` entre abas. |

---

# 11. Utilitários — `src/utils/` (13 arquivos)

| Arquivo | Linhas | Papel |
|---|---|---|
| `npcActionEngine.ts` | ~1.388 | IA de combate NPC (seção 7.4) |
| `motionCanvasEngine.ts` | ~1.242 | Motor Motion Brush (seção 6.1) |
| `motionPhysicsEngine.ts` | ~533 | Física de camadas (seção 6.2) |
| `motionInpaintRepair.ts` | ~286 | Content-aware healing (seção 6.8) |
| `motionCutoutExtractor.ts` | ~215 | Extração de recortes (seção 6.8) |
| `mapMath.ts` | ~228 | Geometria do mapa (seção 5) |
| `storage.ts` | ~168 | IndexedDB (seção 3.4) |
| `exportHelpers.ts` | ~134 | Export JSON/PNG (seção 3.10) |
| `canvasSeamBlend.ts` | ~50 | Costuras de tiles (seção 5) |
| `dialogueTheme.ts` | ~292 | Extração de paleta multi-cor da PNG do NPC (36 buckets de matiz, scoring de vibração vs. frequência) → `DialogueTheme` (botões, cápsula de nome, degradê) com cache |
| `assetSize.ts` | ~161 | Hook `useAssetSize` (cache global + `listeners`/`setTick`), `containedBox`, componente `GroundShadow` (elipse/silhueta sob o personagem, respeta pivô; desativado para `data:video/`) |
| `videoUtils.ts` | ~186 | Pipeline de vídeo (seção 10.5) |
| `tileGenerator.ts` | ~123 | `readUploadedImage` (dimensões + cor dominante), `extractDominantColor` (média RGB), `trimImageBorder` |

**Observações:**
- `assetSize.ts` mistura utilitário + componente React + hook — quebra de separação de camadas.
- `tileGenerator.ts`, `videoUtils.ts`, `dialogueTheme.ts`, `assetSize.ts` implementam **cache global em memória** próprio sem invalidação/TTL → possível leak em sessões longas.

---

# 12. Dados e Sementes — `src/data/` (4 arquivos)

| Arquivo | Linhas | Conteúdo |
|---|---|---|
| `defaultMap.ts` | ~104 | `DEFAULT_PROJECT`: 768px, `canvasKind:'vertical'`, grid none; player, 2 stamp layers, `stampBrushConfig`, `markerPenConfig`, 3 diálogos de exemplo (boas-vindas, duelo, quest de coleta) |
| `defaultStationAssets.ts` | ~301 | SVGs Data-URI de estações (chocadeira, ovos gold/blue/red/green, pintinho, caldeirão, fornalha) + `createDefaultStationConfig(type)` para 6 tipos |
| `defaultSpawnVehicles.ts` | ~321 | 5 veículos em SVG (águia, nave, caravela, balão, dragão) + `BUILT_IN_SPAWN_VEHICLES` (fantasy/scifi/medieval/steampunk) + `DEFAULT_SPAWN_VEHICLE_PNG` |
| `defaultAtmosphereAssets.ts` | ~239 | SVGs de atmosfera (vagalume, mosca, borboleta, formiga, rajada, névoa, nuvem) + 7 arrays de folhas + `applyCustomTintToSvg` + `getLeafGroupSvgs` (seção 8.6) |

**Presets embutidos:** estações (`createDefaultStationConfig`), veículos, folhas (7 presets), pivôs/física (`PIVOT_PRESETS`, `PHYSICS_MODES`).

**Não existe:** `src/hooks/` (único hook: `useAssetSize` em `utils/assetSize.ts`); testes; fixtures; seeds de projeto além do `DEFAULT_PROJECT`.

---

# 13. Algoritmos-Chave (Resumo)

| Algoritmo | Local | Descrição |
|---|---|---|
| `drawBiomeSpansWithFeather` | `canvasSeamBlend.ts` | Fundo `baseColor` + loop com `+1px` de folga por linha/coluna → sem costuras |
| `getBiomeSegmentSpans` / `getBiomeAtY` | `mapMath.ts` | Acumula `startY/endY` por bioma; busca binária para navegação vertical |
| `migrateCollisionCells` | `mapMath.ts` | Expande células 24px→8px (`k×k`), idempotente via `Set` |
| `calculateRouteDistance` / `generateCurvedPath` | `mapMath.ts` | Soma `Math.hypot` entre pares; Quadrática/Catmull-Rom → Bézier `C` (`cp = p1 ± (p2-p0)/6`) |
| `splitMixedProject` | `mapMath.ts` | Separa mistos vertical+extended; travels cruzando a divisão → `travelTargetType:'level'` |
| `computeMeshWeights` | `motionCanvasEngine.ts` | Gaussiana `exp(-0.5*(dist/radius)²)` por traço (`radius = max(8, brushSize*0.55)`); sem traço → decaimento de borda 5% |
| `updateMeshDeformation` | `motionCanvasEngine.ts` | 11 equações (water, vortex, jelly, fire, pendulum, pulse...) com `phase = t*speed*4.0` |
| `updateClothFlagMesh` | `motionCanvasEngine.ts` | Malha densa: `pow(normY,1.25)`/`pow(normX,1.35)` + onda + rajada; `cloth` tem `drapeSag` |
| `drawTriangleTextured` | `motionCanvasEngine.ts` | Mapeamento afim UV por triângulo, `clip()` + `transform`, aborta se `\|det\|<0.0001` |
| VFX (glow/glitter/smoke/fireflies/sparks) | `motionCanvasEngine.ts` | Blend `lighter`; sparks = arco Lichtenberg 14 passos, 3 camadas (bainha violeta/plasma ciano/filamento branco) |
| `computeLayerPhysics` | `motionPhysicsEngine.ts` | 15 modos; soma `parentBoost = 1.4` sincronizado com CSS `.animate-jelly` (`jellyFreq = 2π/1.3`) |
| `computeNpcJellyTransform` | `motionPhysicsEngine.ts` | Interpolação cúbica entre 4 quadrantes do `@keyframes jellyJiggleIdle` com easing `t²(3-2t)` |
| `extractCutoutPiece` | `motionCutoutExtractor.ts` | Chaikin smoothing (75/25, 25/75, `min(4, smoothLevel)`); bbox + margem; pivô `pivotY: 0.1` |
| `repairInpaintArea` | `motionInpaintRepair.ts` | 16 raios radiais (peso `1/(dist²+0.1)`) + 3 passes de difusão laplaciana `0.4*centro+0.15*vizinhos` |
| Chroma key pixel-a-pixel | `VideoAssetCanvas.tsx` | Distância Euclidiana RGB; `tol=(tolerance/100)*240`, `smooth=max(0.1,(smoothness/100)*70)` |
| `walkableBlockedAt` / `obstacleSolids` | `PortraitEmulator.tsx` | Colisão por grid 8px + sólidos de obstáculo |
| `broadcastCombatIncident` | `npcActionEngine.ts` | Propaga pânico a calmos no raio sensorial (medo 0.9, 6.5s, balão "Socorro!") |
| `generateDriftContour` | `OrganicSnowDriftsLayer.tsx` | 7 pontos com `arch=sin(i/seg*π)` + noise `sin(i*1.7+seed)*0.25+0.75` |
| Pânico formigas | `LivingAtmosphereLayers.tsx` | `dist<65px` → empurrão radial; decai `*0.92`; ângulo de fuga vira `atan2(panicVy,panicVx)` quando `panic>0.15` |
| Pouso de insetos | `LivingAtmosphereLayers.tsx` | Máquina `flying→approach→landed→takeoff` (espera 6-9s, pousa a ±14px) |

---

# 14. Débitos Técnicos e Bugs Conhecidos

## 14.1 Débitos Autodeclarados — **zero**

Grep por `TODO`, `FIXME`, `HACK`, `XXX` retorna apenas falsos positivos (`// HACK AND SLASH: Golpe de lâmina` em `npcActionEngine.ts:854`; `TODOS JUNTOS` em português em vários studios). Não há `eslint-disable`, `@ts-expect-error`, nem `console.log` de debug. **Nenhum bloco de código comentado extenso.**

## 14.2 Supressões de Tipo — 4 `@ts-ignore`

| Local | Motivo | Risco |
|---|---|---|
| `AssetGalleryModal.tsx:291`, `AssetGalleryStudio.tsx:689`, `gallery/LocalFolderConnectionBanner.tsx:57`, `:103` | `webkitdirectory`/`directory` fora de `InputHTMLAttributes` | Baixo — ideal `@ts-expect-error` + augment de tipo |

## 14.3 `any` — proliferação (strict desabilitado)

Top: `AssetGalleryStudio.tsx` (~20), `App.tsx` (~16), `PortraitEmulator.tsx` (~14), `AtmosphereStudio.tsx` (~12), `localAssetSyncService.ts` (~12, incl. `private dirHandle: any`). `App.tsx:65` — `clipboardRef` com `data: any`. **56 `console.warn/error`** em 18 arquivos, sem logger centralizado.

## 14.4 Dependências Não Usadas

| Pacote | Evidência | Ação |
|---|---|---|
| `@google/genai@^2.4.0` | 0 imports; `metadata.json` declara capability Gemini; `.env.example` define `GEMINI_API_KEY` | remover ou implementar |
| `express` (+`@types/express`) | 0 imports; sem `server.js` (script `clean` referencia arquivo inexistente) | remover |
| `dotenv` | 0 imports | remover |
| `motion` | 0 imports (`framer-motion` só transitivo) | remover |
| `autoprefixer` | sem `postcss.config`/`tailwind.config` (Tailwind v4 via plugin Vite) | provável redundante |

**Usados de fato:** `react`, `react-dom`, `lucide-react`, e as devDeps de build (vite, tailwindcss, typescript).

## 14.5 Bugs Conhecidos e Descompasso UI↔Runtime

| Local | Achado |
|---|---|
| `MarkerEventsTab.tsx:58-131` | **Camada legacy**: sintetiza `legacy-quest-*`, `legacy-dialogue-*`, etc. a partir de campos antigos; editar pode duplicar/divergir do modelo novo |
| `AtmosphereStudio.tsx:159-181` | Coexistência de `legacyEvent` (string) e array de eventos |
| `storage.ts:165-167` | `cleanupOldLocalStorage()` é função **no-op** exportada |
| `storage.ts:123` | Migração legada `localStorage['tilescroll_project']` mantida indefinidamente |
| `mapMath.ts:6-23` | Migração de grid 24px→8px executada em runtime |
| `assetSize.ts:5-6` | Comentário defensivo pino↔asset (histórico de bug) |
| `vite.config.ts:15-19` | `watch: null` fora do tipo Vite; acoplamento a `DISABLE_HMR` com "Do not modify" |
| `PortraitEmulator` (iluminação) | `darknessOpacity`, `flashlightRadius`, `heroTorch*`, `flickerStyle`, `threeLayerRender`, `lightBloom` **persistidos mas não consumidos** — filtros noturnos usam valores fixos |
| `PlayerStudio.tsx` | Fallback de direção: asset base aplicado quando direção específica ausente |

## 14.6 Configuração — Achados

**`package.json`:** `name: "react-example"` (genérico); `scripts.clean: "rm -rf dist server.js"` **quebra no Windows** e referencia arquivo inexistente; `scripts.lint` = `tsc --noEmit` (sem ESLint/Prettier/CI); versões forward (`typescript@^7`, `vite@^8`, Tailwind v4).

**`tsconfig.json`:** **`strict` ausente** (desabilitado — explica os `any`); `skipLibCheck: true`; `allowJs: true`; `allowImportingTsExtensions: true` + `noEmit`.

**`vite.config.ts`:** alias `@` → raiz; HMR/watch condicionados a `DISABLE_HMR` (AI Studio).

**Outros:** `TestApp.tsx` = `export {}` (arquivo morto); sem testes (`*.test.*`), sem fixtures, sem `src/hooks/`.

## 14.7 Achados de Arquitetura

| Severidade | Achado |
|---|---|
| 🔴 Alta | Monólitos: `App.tsx` ~3.167, `PortraitEmulator.tsx` ~6.686, `MotionCanvasStudio.tsx` ~2.191, `VerticalMapCanvas.tsx` ~3.201, `AssetGalleryStudio.tsx` ~1.643, `ScreensStudio.tsx` ~2.141, `MarkerEventsTab.tsx` ~1.271 |
| 🔴 Alta | Sem camada de estado (Context/Redux/Zustand) — props-drilling e `App.tsx` como gargalo; estado manual (`undoStackRef`, `clipboardRef`, toast) |
| 🔴 Alta | 3 loops rAF no emulador + N camadas de clima — sem culling/visibility |
| 🟡 Média | Ausência total de testes, ESLint, Prettier e CI |
| 🟡 Média | Autosave serializa Base64 de todos os assets (lag); `SavedLevel` duplica projeto inteiro por nível |
| 🟡 Média | Sincronização marcador→galeria roda a cada mudança de `project.markers` (risco de loop se `onUpdateProject` falhar) |
| 🟢 Baixa | `TestApp.tsx` morto; capability Gemini declarada sem implementação; fallback `webkitdirectory` sem polling |

---

# 15. Glossário de Union Types

| Tipo | Valores | Local |
|---|---|---|
| `EffectType` | `none, water, vortex, gelatin, jelly, wind, rotation, pulse, fire, pendulum, glow, glitter, smoke, fireflies, sparks, cloth, flag` (17) | `motionCanvasEngine.ts` |
| `PhysicsMode` | `hang, follow_parent, wing_flap, tail_wag, buzz, spin, orbit, spring, float, close_up, cloth, flag, breathe, blink, none` (15) | `motionPhysicsEngine.ts` |
| `MarkerType` | 21 valores: `npc`, `light`, `station`, `travel`, `collectible`, `event`, `mission`, `neutral`, `area`, `portal`, etc. | `types/map.ts:374` |
| `MarkerEventActionType` | `quest, dialogue, teleport, sound_area, cinematic, weather, reward` (7) | `types/map.ts:435` |
| `EventTriggerType` | `proximity, interact, on_enter_map, timer, quest_complete, sub_event, area_trigger` | `types/map.ts:414` |
| `CollisionMode` | `walkable, blockers, hybrid` | `types/map.ts:792` |
| `CanvasKind` | `vertical, extended` | `types/map.ts:774` |
| `SpawnPhase` | `idle, fading, approaching, landed, departing` | `PortraitEmulator.tsx:396` |
| `StationType` | `incubator, furnace, alchemy, display, crafting, custom` | `types/map.ts:1006` |
| `StationStatus` | `idle, running, completed` | `types/map.ts:1007` |
| `GameScreenType` | `player_hud, dialogue, inventory, pause_menu, victory, game_over, custom` | `types/map.ts:1015` |
| `ScreenButtonAction` | `navigate_screen, player_action, open_inventory, toggle_locomotion, open_dialogue, trigger_event, pause_game` | `types/map.ts:1021` |
| `PivotPreset` | `top, center, bottom, left_shoulder, right_shoulder, left_side, right_side` (7) | `motionPhysicsEngine.ts` |
| `MotionCanvasTool` | `move, brush, pivot, pan` | `MotionCanvasStudio.tsx` |
| `StudioTab` | `layers, draw, physics, gallery` | `MotionCanvasStudio.tsx` |
| `BrushMode` | `brush, lasso, erase_strokes, erase_png, sponge` | `MotionBrushStudio.tsx` |
| `ExtractionAction` | `copy, cut, cut_repair` | `MotionBrushStudio.tsx` |
| `LeafPreset` | `autumn, spring, dry, jungle, mystic, frost, neon` | `defaultAtmosphereAssets.ts` |
| `BuiltInSpawnVehicle` | `eagle, ship, balloon, dragon, airship` | `defaultSpawnVehicles.ts` |
| `AttackAssetType` | `none, png, motion, video` | `types/map.ts:97-106` |
| `VideoChromaKeyConfig` | `{ enabled, color, tolerance (0-100), smoothness (0-50), cropSquare?, cropOffsetX/Y?, videoSpeed? (0.25-3.5), scale?, flipH? }` | `types/map.ts:84-95` |
| `MarkerStatus` | `discovered, active, completed, locked` | `types/map.ts:377` |

---

# Fim da Documentação

**Total:** 15 seções. **Cobertura:** Núcleo (App.tsx), Modelo de Dados, Renderizador, Motion Canvas, Marcadores/NPCs/Eventos, Atmosfera/Clima/Iluminação, Emulador de Jogo, Estações/Spawn/Telas/Diálogos, Galeria/Vídeo/Chroma Key/Sync, Utilitários, Dados/Sementes, Algoritmos-Chave, Débitos Técnicos e Bugs Conhecidos, Glossário.

**Limitações:** números de linha **aproximados**; foco em lógica principal (props de UI/estilos Tailwind omitidos); não substitui leitura do código para manutenção profunda.
