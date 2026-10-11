# Análise: Sistema de Save/Load Scene no World Map

## Estado Atual

### Save Scene (linha 1954-2010)
- Salva **todos os objetos** do canvas via `JSON.stringify`
- Preserva TODAS as propriedades dos objetos (deep clone)
- Salva em servidor ou localStorage como fallback
- **Problemas identificados:**
  - Não diferencia "local scene" vs "global scene"
  - Não calcula positioning inteligente para grupos
  - Não salva referências de assets corretamente
  - Não salva initial spawn + camera setup

### Load Scene (linha 2012-2069)
- Carrega objetos da cena
- Se objeto já existe → atualiza propriedades
- Se não existe → adiciona ao canvas
- **Problemas identificados:**
  - Não recarrega assets (precisa chamar URL)
  - Não restaura initial spawn/camera
  - Não reconecta eventos corretamente

---

## Necessidades Identificadas

### 1. Tipos de Objetos a Salvar
```
- morph (assets com charData)
- group (grupos de objetos)
- collision (primal de colisão)
- area_sensor (primal de sensor)
- camera (câmera)
- player (jogador)
- phase (fase)
- vector (vetores)
```

### 2. Estrutura de Dados para Save
```typescript
interface SceneData {
  id: string;
  name: string;
  savedAt: number;
  sceneType: 'local' | 'global';  // NOVO
  
  // Posicionamento
  originX?: number;  // Para local scene
  originY?: number;
  
  // Setup inicial
  initialSpawn?: { x: number, y: number, dir: string };
  initialCamera?: { x: number, y: number, zoom: number };
  
  // Objetos
  objects: ObjectData[];
  
  // Referências
  assetUrls: string[];  // URLs únicas para pre-load
}

interface ObjectData {
  // Identificação
  id: string;
  type: string;
  label: string;
  
  // Transform (salvo em coordenadas locais OU mundo)
  x: number;
  y: number;
  w: number;
  h: number;
  rotation?: number;
  scaleX?: number;
  scaleY?: number;
  opacity?: number;
  
  // Hierarquia
  parentId?: string;
  groupId?: string;
  
  // Assets
  assetUrl?: string;
  charData?: any;  // Sprite animation data
  
  // Primal properties
  shape?: string;
  collisionMode?: string;
  sensorTrigger?: string;
  navType?: string;
  sensorRadius?: number;
  
  // Eventos
  colEvents?: any[];
  area_sensorEvents?: any[];
  
  // Keyframes/Motion
  keyframes?: Keyframe[];
}
```

### 3. Posicionamento Inteligente (Global Scene)
Quando salvar como **global scene** (cena completa):
- Calcular bounding box de todos os objetos selecionados
- Usar esse bounding box como "gizmo" de referência
- Salvar coordenadas relativas ao centro do grupo
- Ao carregar, recalcular posições baseado no ponto de spawn

Quando salvar como **local scene** (evento):
- Manter coordenadas absolutas do canvas
- Mais simples para reprodução via triggers

### 4. Carregar Cena - Fluxo
```typescript
async loadScene(sceneData) {
  // 1. Pre-load todos os assets (paralelo)
  await Promise.all(sceneData.assetUrls.map(loadAsset));
  
  // 2. Criar objetos na ordem correta (pais primeiro)
  // - groups primeiro
  // - depois morphs
  // - por último primals (collision/sensor)
  
  // 3. Configurar initial spawn + camera
  if (sceneData.initialSpawn) {
    this.setInitialSpawn(sceneData.initialSpawn);
  }
  if (sceneData.initialCamera) {
    this.setInitialCamera(sceneData.initialCamera);
  }
  
  // 4. Reconectar eventos
  this.reconnectEvents();
}
```

---

## Bugs Identificados

### Bug 1: Collision/Sensor replicando imagem
**Local:** `createAssetWithCollision()` e `createSpriteWithCollision()`
**Sintoma:** Ao adicionar collision/sensor a um morph, está criando visual duplicado
**Causa:** Está adicionando collision/sensor como objetos separados com seu próprio visual
**Solução:** O collision e sensor devem usar apenas o gizmo do morph como referência (sem visual próprio)

### Bug 2: Assets não carregam ao restaurar cena
**Sintoma:** Imagens ficam em branco ao carregar cena
**Causa:** URLs são restauradas mas imagens não são recarregadas
**Solução:** Precisa fazer pre-load das URLs após carregar

---

## Plano de Implementação

### Fase 1: Correção de Bugs
1. [ ] Corrigir criação de collision/sensor (usar gizmo do morph)
2. [ ] Testar criação de assets

### Fase 2: Melhorar Save Scene
1. [ ] Adicionar campo `sceneType: 'local' | 'global'`
2. [ ] Salvar initial spawn + camera
3. [ ] Listar assetUrls únicos para pre-load
4. [ ] Implementar posicionamento inteligente para global scene

### Fase 3: Melhorar Load Scene
1. [ ] Pre-load de assets via URLs
2. [ ] Restaurar initial spawn + camera
3. [ ] Reconectar eventos
4. [ ] Ordernar criação de objetos (pais → filhos)

### Fase 4: Save Phase (Completo)
1. [ ] Salvar canvas completo
2. [ ] Incluir player + all primals
3. [ ] Incluir todos os eventos
4. [ ] Incluir fases completas

---

## Decisões a Tomar

1. **Coordenadas salvas**: Relativas ao grupo ou absolutas?
   - Sugestão: Absolutas para local, relativas para global

2. **Eventos salvos**: Como serializar?
   - Atualmente já tem `colEvents` e `area_sensorEvents`

3. **Assets externos**: Como garantir que carregam?
   - Pre-load antes de criar objetos

---

*Documento de análise para discussão antes de implementar*