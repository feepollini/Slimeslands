export class GIFExtractor {
  private buffer: Uint8Array;
  private pos: number = 0;
  private width: number = 0;
  private height: number = 0;
  private frames: { pixels: ImageData; delay: number }[] = [];
  private globalColorTable: number[] | null = null;
  private transparentIndex: number = -1;

  constructor(arrayBuffer: ArrayBuffer) {
    this.buffer = new Uint8Array(arrayBuffer);
  }

  extract(): { pixels: ImageData; delay: number }[] {
    console.log('[GIFExtractor] Starting extraction...');
    try {
      if (!this.parseHeader()) {
        console.error('[GIFExtractor] Failed to parse header');
        return [];
      }
      console.log('[GIFExtractor] Parsed header, frames:', this.frames.length);
    } catch (e) {
      console.error('[GIFExtractor] Extraction error:', e);
      return [];
    }
    return this.frames;
  }

  private parseHeader(): boolean {
    const sig = String.fromCharCode(
      this.buffer[0], this.buffer[1], this.buffer[2],
      this.buffer[3], this.buffer[4], this.buffer[5]
    );
    console.log('[GIFExtractor] Signature:', sig);
    if (sig !== 'GIF87a' && sig !== 'GIF89a') return false;
    
    this.pos = 6;
    this.width = this.readUint16LE(this.pos); this.pos += 2;
    this.height = this.readUint16LE(this.pos); this.pos += 2;
    
    const flags = this.buffer[this.pos++];
    const hasGlobalColorTable = (flags & 0x80) !== 0;
    const colorTableSize = flags & 0x07;
    
    this.pos += 2;
    
    if (hasGlobalColorTable) {
      const colorCount = 3 * Math.pow(2, colorTableSize + 1);
      this.globalColorTable = [];
      for (let i = 0; i < colorCount; i++) {
        this.globalColorTable.push(this.buffer[this.pos++]);
      }
    }

    return this.parseBlocks();
  }

  private parseBlocks(): boolean {
    while (this.pos < this.buffer.length) {
      const separator = this.buffer[this.pos++];
      
      if (separator === 0x21) {
        const label = this.buffer[this.pos++];
        if (label === 0xF9) {
          this.parseGraphicControl();
        } else {
          this.skipBlock();
        }
      } else if (separator === 0x2C) {
        this.parseImageBlock();
      } else if (separator === 0x3B) {
        break;
      }
    }
    return this.frames.length > 0;
  }

  private parseGraphicControl(): void {
    this.pos++;
    const flags = this.buffer[this.pos++];
    const hasTransparency = (flags & 0x01) !== 0;
    this.transparentIndex = hasTransparency ? this.buffer[this.pos++] : -1;
    this.pos += 3;
  }

  private parseImageBlock(): void {
    console.log('[GIFExtractor] Parsing image block at pos:', this.pos);
    this.pos += 4;
    const flags = this.buffer[this.pos++];
    const hasLocalColorTable = (flags & 0x80) !== 0;
    const interlace = (flags & 0x40) !== 0;
    const colorTableSize = flags & 0x07;
    console.log('[GIFExtractor] Image flags:', { hasLocalColorTable, interlace, colorTableSize });
    
    let localColorTable: number[] | null = null;
    if (hasLocalColorTable) {
      const colorCount = 3 * Math.pow(2, colorTableSize + 1);
      localColorTable = [];
      for (let i = 0; i < colorCount; i++) {
        localColorTable.push(this.buffer[this.pos++]);
      }
    }

    const minCodeSize = this.buffer[this.pos++];
    console.log('[GIFExtractor] LZW minCodeSize:', minCodeSize);
    const lzwData = this.readDataSubBlocks();
    console.log('[GIFExtractor] LZW data size:', lzwData.length);
    
    const pixels = this.decodeLZW(lzwData, minCodeSize, this.width, this.height, interlace, localColorTable);
    console.log('[GIFExtractor] Decoded pixels length:', pixels.length);
    
    const imageData = new ImageData(this.width, this.height);
    imageData.data.set(pixels);
    this.frames.push({ delay: 100, pixels: imageData });
    console.log('[GIFExtractor] Added frame, total frames:', this.frames.length);
  }

  private decodeLZW(data: Uint8Array, minCodeSize: number, w: number, h: number, interlace: boolean, localTable: number[] | null): Uint8ClampedArray {
    const colorTable = localTable || this.globalColorTable || [];
    const output = new Uint8ClampedArray(w * h * 4);
    
    const clearCode = 1 << minCodeSize;
    const eoiCode = clearCode + 1;
    let codeSize = minCodeSize + 1;
    let nextCode = eoiCode + 1;
    let codeBuffer = 0;
    let codeBits = 0;
    
    const dictionary: Map<number, Uint8Array> = new Map();
    for (let i = 0; i < clearCode; i++) {
      dictionary.set(i, new Uint8Array([i]));
    }
    
    let dataIdx = 0;
    let prevCode = -1;
    let firstByte: number | null = null;
    
    const getCode = (): number => {
      while (codeBits < codeSize) {
        if (dataIdx >= data.length) return eoiCode;
        codeBuffer |= data[dataIdx++] << codeBits;
        codeBits += 8;
      }
      const code = codeBuffer & ((1 << codeSize) - 1);
      codeBuffer >>= codeSize;
      codeBits -= codeSize;
      return code;
    };
    
    const rowOrder = interlace ? [0, 8, 4, 2, 1] : [1];
    const rowCount = interlace ? 5 : 1;
    
    for (let pass = 0; pass < rowCount; pass++) {
      const startRow = interlace ? rowOrder[pass] : 0;
      const rowStep = interlace ? rowOrder[pass] * 8 : 1;
      
      for (let row = startRow; row < h; row += rowStep) {
        let col = 0;
        while (col < w) {
          const code = getCode();
          
          if (code === eoiCode) break;
          if (code === clearCode) {
            codeSize = minCodeSize + 1;
            nextCode = eoiCode + 1;
            dictionary.clear();
            for (let i = 0; i < clearCode; i++) {
              dictionary.set(i, new Uint8Array([i]));
            }
            prevCode = -1;
            continue;
          }
          
          let entry: Uint8Array;
          if (dictionary.has(code)) {
            entry = dictionary.get(code)!;
          } else if (code === nextCode && prevCode !== -1) {
            const prevEntry = dictionary.get(prevCode)!;
            entry = new Uint8Array(prevEntry.length + 1);
            entry.set(prevEntry);
            entry[prevEntry.length] = firstByte!;
          } else {
            break;
          }
          
          for (let i = 0; i < entry.length; i++) {
            const colorIdx = entry[i];
            const pixelIdx = (row * w + col) * 4;
            if (colorIdx === this.transparentIndex && colorTable.length > 0) {
              output[pixelIdx] = 0;
              output[pixelIdx + 1] = 0;
              output[pixelIdx + 2] = 0;
              output[pixelIdx + 3] = 0;
            } else if (colorIdx < colorTable.length) {
              output[pixelIdx] = colorTable[colorIdx * 3];
              output[pixelIdx + 1] = colorTable[colorIdx * 3 + 1];
              output[pixelIdx + 2] = colorTable[colorIdx * 3 + 2];
              output[pixelIdx + 3] = 255;
            }
            col++;
          }
          
          if (prevCode !== -1 && nextCode < 4096) {
            const prevEntry = dictionary.get(prevCode)!;
            const newEntry = new Uint8Array(prevEntry.length + 1);
            newEntry.set(prevEntry);
            newEntry[prevEntry.length] = entry[0];
            dictionary.set(nextCode++, newEntry);
            if (nextCode > (1 << codeSize) && codeSize < 12) codeSize++;
          }
          
          firstByte = entry[0];
          prevCode = code;
        }
      }
    }
    
    return output;
  }

  private readDataSubBlocks(): Uint8Array {
    const chunks: Uint8Array[] = [];
    while (this.pos < this.buffer.length) {
      const blockSize = this.buffer[this.pos++];
      if (blockSize === 0) break;
      chunks.push(this.buffer.slice(this.pos, this.pos + blockSize));
      this.pos += blockSize;
    }
    const result = new Uint8Array(chunks.reduce((sum, c) => sum + c.length, 0));
    let offset = 0;
    chunks.forEach(c => { result.set(c, offset); offset += c.length; });
    return result;
  }

  private skipBlock(): void {
    while (this.pos < this.buffer.length) {
      const size = this.buffer[this.pos++];
      if (size === 0) break;
      this.pos += size;
    }
  }

  private readUint16LE(pos: number): number {
    return this.buffer[pos] | (this.buffer[pos + 1] << 8);
  }
}

export class GIFAnimator {
  private frames: { pixels: ImageData; delay: number }[] = [];
  private currentFrame: number = 0;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private isLoaded: boolean = false;
  private loadedCallback: (() => void) | null = null;

  constructor(width: number, height: number) {
    this.canvas = document.createElement('canvas');
    this.canvas.width = width;
    this.canvas.height = height;
    this.ctx = this.canvas.getContext('2d')!;
  }

  async loadFromUrl(url: string): Promise<boolean> {
    try {
      console.log('[GIFAnimator] Fetching:', url);
      const response = await fetch(url);
      if (!response.ok) {
        console.error('[GIFAnimator] HTTP error:', response.status);
        return false;
      }
      const arrayBuffer = await response.arrayBuffer();
      console.log('[GIFAnimator] Got arrayBuffer, size:', arrayBuffer.byteLength);
      
      // Use setTimeout to avoid blocking
      setTimeout(() => {
        try {
          console.log('[GIFAnimator] Starting extraction...');
          const extractor = new GIFExtractor(arrayBuffer);
          this.frames = extractor.extract();
          console.log('[GIFAnimator] Extracted frames:', this.frames.length);
          
          this.isLoaded = this.frames.length > 0;
          
          if (this.isLoaded && this.frames[0].pixels) {
            this.canvas.width = this.frames[0].pixels.width;
            this.canvas.height = this.frames[0].pixels.height;
            console.log('[GIFAnimator] Canvas set to:', this.canvas.width, 'x', this.canvas.height);
          } else {
            console.warn('[GIFAnimator] No frames or no pixels!');
          }
          
          if (this.isLoaded && this.loadedCallback) {
            this.loadedCallback();
          }
        } catch (err) {
          console.error('[GIFAnimator] Extraction error:', err);
        }
      }, 0);
      
      return true; // Return immediately, loading happens async
    } catch (e) {
      console.error('[GIFAnimator] Failed to load:', url, e);
      return false;
    }
  }

  onLoaded(callback: () => void): void {
    this.loadedCallback = callback;
  }

  update(): void {
    if (!this.isLoaded || this.frames.length === 0) return;
    
    const now = Date.now();
    const frame = this.frames[this.currentFrame];
    const delay = frame?.delay || 100;
    
    if (now - this.lastFrameTime >= delay) {
      this.currentFrame = (this.currentFrame + 1) % this.frames.length;
      this.lastFrameTime = now;
      this.renderFrame();
    }
  }

  private lastFrameTime: number = 0;

  private renderFrame(): void {
    if (!this.frames[this.currentFrame]) return;
    this.ctx.putImageData(this.frames[this.currentFrame].pixels, 0, 0);
  }

  getCanvas(): HTMLCanvasElement {
    return this.canvas;
  }

  hasFrames(): boolean {
    return this.isLoaded && this.frames.length > 0;
  }
}