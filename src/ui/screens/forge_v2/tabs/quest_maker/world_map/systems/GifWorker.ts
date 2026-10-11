/**
 * GifWorker.ts
 * Worker para extração de quadros de GIFs em segundo plano.
 * Previne que o navegador trave durante a inserção de assets animados.
 */

self.onmessage = async (e: MessageEvent) => {
  const { arrayBuffer } = e.data;
  
  try {
    const extractor = new GIFWorkerExtractor(arrayBuffer);
    const frames = extractor.extract();
    
    // Transferir os frames de volta como uma lista de pixels canais (Uint8ClampedArray)
    const result = frames.map(f => ({
      pixels: f.pixels, // Uint8ClampedArray
      width: f.width,
      height: f.height,
      delay: f.delay
    }));

    self.postMessage({ frames: result });
  } catch (err) {
    self.postMessage({ error: (err as Error).message });
  }
};

class GIFWorkerExtractor {
  private buffer: Uint8Array;
  private pos: number = 0;
  private width: number = 0;
  private height: number = 0;
  private frames: any[] = [];
  private globalColorTable: number[] | null = null;
  private transparentIndex: number = -1;

  constructor(arrayBuffer: ArrayBuffer) {
    this.buffer = new Uint8Array(arrayBuffer);
  }

  extract() {
    if (!this.parseHeader()) return [];
    return this.frames;
  }

  private parseHeader(): boolean {
    const sig = String.fromCharCode(this.buffer[0], this.buffer[1], this.buffer[2], this.buffer[3], this.buffer[4], this.buffer[5]);
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
      for (let i = 0; i < colorCount; i++) this.globalColorTable.push(this.buffer[this.pos++]);
    }
    return this.parseBlocks();
  }

  private parseBlocks(): boolean {
    while (this.pos < this.buffer.length) {
      const separator = this.buffer[this.pos++];
      if (separator === 0x21) {
        const label = this.buffer[this.pos++];
        if (label === 0xF9) this.parseGraphicControl();
        else this.skipBlock();
      } else if (separator === 0x2C) this.parseImageBlock();
      else if (separator === 0x3B) break;
    }
    return this.frames.length > 0;
  }

  private parseGraphicControl(): void {
    this.pos++;
    const flags = this.buffer[this.pos++];
    this.transparentIndex = (flags & 0x01) !== 0 ? this.buffer[this.pos++] : -1;
    this.pos += 3;
  }

  private parseImageBlock(): void {
    this.pos += 4;
    const flags = this.buffer[this.pos++];
    const hasLocalColorTable = (flags & 0x80) !== 0;
    const interlace = (flags & 0x40) !== 0;
    const colorTableSize = flags & 0x07;
    
    let localColorTable: number[] | null = null;
    if (hasLocalColorTable) {
      const colorCount = 3 * Math.pow(2, colorTableSize + 1);
      localColorTable = [];
      for (let i = 0; i < colorCount; i++) localColorTable.push(this.buffer[this.pos++]);
    }

    const minCodeSize = this.buffer[this.pos++];
    const lzwData = this.readDataSubBlocks();
    const pixels = this.decodeLZW(lzwData, minCodeSize, this.width, this.height, interlace, localColorTable);
    
    this.frames.push({ delay: 10, pixels, width: this.width, height: this.height });
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
    for (let i = 0; i < clearCode; i++) dictionary.set(i, new Uint8Array([i]));
    
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
      const rowStep = interlace ? (interlace ? rowOrder[pass] * 8 : rowOrder[pass]) : 1; // Simplificando step para interlace
      
      for (let row = startRow; row < h; row += (interlace ? Math.max(1, rowStep) : 1)) {
        let col = 0;
        while (col < w) {
          const code = getCode();
          if (code === eoiCode) break;
          if (code === clearCode) {
            codeSize = minCodeSize + 1; nextCode = eoiCode + 1;
            dictionary.clear();
            for (let i = 0; i < clearCode; i++) dictionary.set(i, new Uint8Array([i]));
            prevCode = -1; continue;
          }
          
          let entry: Uint8Array;
          if (dictionary.has(code)) {
            entry = dictionary.get(code)!;
          } else if (code === nextCode && prevCode !== -1) {
            const prevEntry = dictionary.get(prevCode)!;
            entry = new Uint8Array(prevEntry.length + 1);
            entry.set(prevEntry);
            entry[prevEntry.length] = firstByte!;
          } else { break; }
          
          for (let i = 0; i < entry.length; i++) {
            const colorIdx = entry[i];
            const pixelIdx = (row * w + col) * 4;
            if (colorIdx === this.transparentIndex) {
               // Alpha 0
            } else if (colorIdx * 3 < colorTable.length) {
              output[pixelIdx] = colorTable[colorIdx * 3];
              output[pixelIdx + 1] = colorTable[colorIdx * 3 + 1];
              output[pixelIdx + 2] = colorTable[colorIdx * 3 + 2];
              output[pixelIdx + 3] = 255;
            }
            col++;
            if (col >= w) break;
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
        if (interlace === false) { /* continua normal */ } else { /* rows handled by step */ }
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
