# Sprite Animation System - Arquitetura

## Visão Geral

O sistema de animação de sprites deve ser uma camada dedicada que:
1. Se integra à hierarquia existente (parentId/groupId)
2. Funciona com o sistema de motion/timeline
3. Suporta culling por viewport para performance
4. Trata GIFs e sprites de forma unificada

## Estrutura Proposed

### 1. SpriteAnimationManager (Nova Classe)
Responsável por:
- Gerenciar instâncias de GIFAnimator
- Controlar timing (sincronizado com timeline)
-Viewport culling (animar apenas objetos visíveis)
-Cleanup de recursos

```typescript
class SpriteAnimationManager {
  private animators: Map<string, GIFAnimator> = new Map();
  private lastUpdateTime: number = 0;
  
  // Sincronizado com timeline (currentTime)
  update(currentTime: number, objects: any[], viewport: Rect): void
  
  // Verifica se objeto está no viewport antes de animá-lo (culling)
  private isInViewport(obj: any, viewport: Rect): boolean
  
  // Limpa recursos de objetos removidos
  cleanup(visibleObjectIds: Set<string>): void
}
```

### 2. Integração com RenderPipeline

O RenderPipeline já tem a estrutura de renderização. Adicionamos:

```typescript
export class RenderPipeline {
  // ... existente ...
  
  // NOVO: Sprite Animation Manager
  private spriteManager: SpriteAnimationManager;
  
  draw() {
    // 1. update sprites (com culling)
    const viewport = this.getViewport();
    this.spriteManager.update(
      this.state.currentTime || 0, 
      this.objects, 
      viewport
    );
    
    // 2. renderiza normalmente
    // Os sprites já terão seus canvas atualizados
  }
}
```

### 3. Definição de Sprite no Objeto

Os objetos precisam de uma estrutura padronizada:

```typescript
interface SpriteData {
  // URL do asset (GIF ou sprite sheet)
  assetUrl: string;
  
  // Tipo de animação: 'gif' | 'spritesheet' | 'sequence'
  animType: 'gif' | 'spritesheet' | 'sequence';
  
  // Dados de animação (para timeline)
  animations?: {
    idle?: AnimationTrack;
    move?: AnimationTrack;
    run?: AnimationTrack;
  };
  
  // Para spritesheets: dimensões do frame
  frameWidth?: number;
  frameHeight?: number;
  frameCount?: number;
  frameRate?: number; // FPS da animação
  
  // Estado atual (para realtime mode)
  _currentAnim?: string;
  _currentFrame?: number;
}
```

### 4. Sistema de Renderização em Camadas

O canvas pode ter múltiplas "sub-camadas" para sprites:

```
┌─────────────────────────────────┐
│         Canvas Principal        │
│  ┌───────────────────────────┐  │
│  │  Sprite Layer (GIFs)      │  │ ← Canvas overlay para GIFs animados
│  │  - Atualizado via RAF     │  │
│  │  - Culling aplicado      │  │
│  └───────────────────────────┘  │
│  ┌───────────────────────────┐  │
│  │  Object Layer            │  │ ← RenderPipeline existente
│  │  - Morphs, Groups       │  │
│  │  - Primal Objects       │  │
│  └───────────────────────────┘  │
└─────────────────────────────────┘
```

### 5. Integração com Timeline/Motion

O sistema de keyframes já existe. Para sprites:
- Se `currentTime` existe → usar interpolação de keyframes
- Se `currentTime` é 0/null → modo realtime (animação contínua)

```typescript
// No getVal() - já existe a lógica
const hasAnimatedCharData = o.charData && (o.charData.idle || o.charData.move);
const isRealtimeMode = hasAnimatedCharData && (time === 0 || !this.state.currentTime);
```

Extendemos para GIFs:
```typescript
const isAnimatedSprite = o.charData?._isGif || o.assetUrl?.endsWith('.gif');
```

### 6. Culling (Otimização)

Apenas animate GIFs que estão no campo de visão da câmera:

```typescript
private isInViewport(obj: any, viewport: Rect): boolean {
  const worldX = obj.x || 0;
  const worldY = obj.y || 0;
  const worldW = obj.w || 64;
  const worldH = obj.h || 64;
  
  return !(
    worldX + worldW < viewport.x ||
    worldX > viewport.x + viewport.w ||
    worldY + worldH < viewport.y ||
    worldY > viewport.y + viewport.h
  );
}
```

## Fluxo de Trabalho

### 1. Ao inserir um sprite/GIF no canvas:
```typescript
// WorldMapMain.createSpriteWithCollision()
const spriteData = {
  assetUrl: url,
  animType: url.endsWith('.gif') ? 'gif' : 'spritesheet',
  charData: { _isGif: true, ... }
};
```

### 2. Durante o render:
```typescript
// RenderPipeline.draw()
// 1. SpriteManager verifica viewport e atualiza apenas sprites visíveis
// 2. Cada sprite tem seu GIFAnimator que renderiza para um canvas
// 3. RenderPipeline desenha o canvas do sprite na posição correta
```

### 3. Timeline control:
```typescript
// Se play → currentTime avanza → getVal() interpola keyframes
// Se pause → currentTime para → sprites continuam em realtime mode
```

## Arquivos a Criar/Modificar

### Novos Arquivos:
- `systems/SpriteAnimationManager.ts` - Gerencia instâncias de animação

### Arquivos a Modificar:
- `systems/RenderPipeline.ts` - Integrar SpriteManager
- `WorldMapMain.ts` - Passar dados corretos de sprite
- Opcional: adicionar culling config no state

## Considerações de Performance

1. **Culling**: Só animar sprites no viewport
2. **Cache**: Reutilizar GIFAnimator por assetUrl
3. **Cleanup**: Remover animators de objetos deletados
4. **Batch**: Agrupar atualizações de sprites

---

*Este documento define a arquitetura base. Posso implementar passo a passo se preferir.*