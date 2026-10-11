// Sprite Animation System - Sistema de animação integrado à timeline
// Usa o sistema de keyframes existente do projeto

interface SpriteFrameCache {
  url: string;
  frames: string[];  // Array de URLs de frames (para PNG sequences) ou 1 URL de GIF
  frameRate: number;
  loaded: boolean;
  imgElements: HTMLImageElement[];
}

class SpriteAnimationCache {
  private cache: Map<string, SpriteFrameCache> = new Map();
  
  // Pre-load frames para sprite sheets ou GIFs (primeiro frame)
  async preload(url: string, type: string | undefined, frameRate: number = 100): Promise<SpriteFrameCache> {
    if (this.cache.has(url)) {
      return this.cache.get(url)!;
    }
    
    const cacheEntry: SpriteFrameCache = {
      url,
      frames: [],
      frameRate,
      loaded: false,
      imgElements: []
    };
    
    // Se for GIF, precisamos criar a "ilusão" de animação
    // O sistema de timeline vai ciclar através do tempo, nós usamos isso
    if (type === 'gif' || url.toLowerCase().endsWith('.gif')) {
      // Para GIFs: criar um elemento que o browser vai animated
      // e pré-carregar
      const img = document.createElement('img');
      img.src = url;
      img.style.position = 'fixed';
      img.style.left = '0';
      img.style.top = '0';
      img.style.visibility = 'hidden';
      document.body.appendChild(img);
      cacheEntry.imgElements.push(img);
      cacheEntry.frames = [url]; // 1 frame "virtual" - o browser faz a animação
      cacheEntry.loaded = true;
    } else {
      // Para PNG sequences: já tem frames no charData
      cacheEntry.loaded = true;
    }
    
    this.cache.set(url, cacheEntry);
    return cacheEntry;
  }
  
  get(url: string): SpriteFrameCache | undefined {
    return this.cache.get(url);
  }
  
  // Limpar quando objeto for deletado
  release(url: string) {
    const entry = this.cache.get(url);
    if (entry) {
      entry.imgElements.forEach(img => {
        if (img.parentNode) img.parentNode.removeChild(img);
      });
      this.cache.delete(url);
    }
  }
}

// Instância global
export const spriteAnimationCache = new SpriteAnimationCache();