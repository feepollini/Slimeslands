import { CardData } from '../types/card';

/**
 * Converts a non-data URL into a base64 data: URL so isolated SVG rendering
 * inside an <img> never drops external/blob images or taints the canvas.
 */
async function toInlineDataUrl(url: string): Promise<string | null> {
  if (!url) return null;
  if (url.startsWith('data:')) return url;

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const blob = await response.blob();
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          resolve(reader.result);
        } else {
          reject(new Error('Failed to convert blob to data URL'));
        }
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch {
    // Fallback: try loading via CORS-enabled HTMLImageElement
    return await new Promise<string | null>((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        try {
          const c = document.createElement('canvas');
          c.width = img.naturalWidth || 680;
          c.height = img.naturalHeight || 990;
          const ctx = c.getContext('2d');
          if (!ctx) {
            resolve(null);
            return;
          }
          ctx.drawImage(img, 0, 0);
          resolve(c.toDataURL('image/png'));
        } catch {
          resolve(null);
        }
      };
      img.onerror = () => resolve(null);
      img.src = url;
    });
  }
}

/**
 * Word-wraps a paragraph of text to fit within maxWidthPx using a 2D canvas context.
 */
function wrapTextLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  font: string,
  maxWidthPx: number
): string[] {
  if (!text.trim()) return [];
  ctx.font = font;
  const words = text.trim().split(/\s+/);
  const lines: string[] = [];
  let currentLine = words[0] || '';

  for (let i = 1; i < words.length; i++) {
    const word = words[i];
    const testLine = `${currentLine} ${word}`;
    if (ctx.measureText(testLine).width <= maxWidthPx) {
      currentLine = testLine;
    } else {
      lines.push(currentLine);
      currentLine = word;
    }
  }
  if (currentLine) {
    lines.push(currentLine);
  }
  return lines;
}

/**
 * Builds pure SVG <g> text nodes to replace the Lore Box <foreignObject>
 * so Chromium never marks the SVG as tainted due to <foreignObject>.
 */
function createPureSvgLoreTextGroup(card: CardData): SVGGElement {
  const svgNs = 'http://www.w3.org/2000/svg';
  const group = document.createElementNS(svgNs, 'g');

  const totalChars =
    (card.loreHeader?.length || 0) +
    (card.loreBody?.length || 0) +
    (card.magicPrefix?.length || 0) +
    (card.magicDescription?.length || 0);

  const autoScale =
    totalChars > 240
      ? 0.78
      : totalChars > 195
      ? 0.86
      : totalChars > 155
      ? 0.93
      : 1;

  const baseScale = (card.loreTextScale ?? 100) / 100;
  const headerFontSize = Math.round(18 * baseScale * autoScale * 10) / 10;
  const bodyFontSize = Math.round(14.5 * baseScale * autoScale * 10) / 10;

  const measureCanvas = document.createElement('canvas');
  const ctx = measureCanvas.getContext('2d');
  const maxWidth = 412;

  interface RenderedLine {
    text: string;
    prefixBold?: string;
    restNormal?: string;
    fontSize: number;
    fontWeight: number;
    color: string;
    lineHeight: number;
    gapAfter: number;
  }

  const renderedLines: RenderedLine[] = [];

  if (ctx) {
    if (card.loreHeader) {
      const hLines = wrapTextLines(
        ctx,
        card.loreHeader,
        `800 ${headerFontSize}px "Plus Jakarta Sans", sans-serif`,
        maxWidth
      );
      hLines.forEach((line, idx) => {
        renderedLines.push({
          text: line,
          fontSize: headerFontSize,
          fontWeight: 800,
          color: '#FFFFFF',
          lineHeight: headerFontSize * 1.15,
          gapAfter: idx === hLines.length - 1 ? 3 : 0,
        });
      });
    }

    if (card.loreBody) {
      const bLines = wrapTextLines(
        ctx,
        card.loreBody,
        `400 ${bodyFontSize}px "Plus Jakarta Sans", sans-serif`,
        maxWidth
      );
      bLines.forEach((line, idx) => {
        renderedLines.push({
          text: line,
          fontSize: bodyFontSize,
          fontWeight: 400,
          color: '#F8FAFC',
          lineHeight: bodyFontSize * 1.18,
          gapAfter: idx === bLines.length - 1 ? 6 : 0,
        });
      });
    }

    if (card.magicPrefix || card.magicDescription) {
      const fullMagic =
        card.magicPrefix && card.magicDescription
          ? `${card.magicPrefix} — ${card.magicDescription}`
          : card.magicPrefix || card.magicDescription || '';
      const mLines = wrapTextLines(
        ctx,
        fullMagic,
        `600 ${bodyFontSize}px "Plus Jakarta Sans", sans-serif`,
        maxWidth
      );
      const prefixTarget = card.magicPrefix ? `${card.magicPrefix} — ` : '';
      mLines.forEach((line, idx) => {
        if (idx === 0 && card.magicPrefix && line.startsWith(card.magicPrefix)) {
          const boldPart = line.startsWith(prefixTarget)
            ? card.magicPrefix
            : card.magicPrefix;
          const restPart = line.slice(boldPart.length);
          renderedLines.push({
            text: line,
            prefixBold: boldPart,
            restNormal: restPart,
            fontSize: bodyFontSize,
            fontWeight: 400,
            color: '#FFFFFF',
            lineHeight: bodyFontSize * 1.18,
            gapAfter: 0,
          });
        } else {
          renderedLines.push({
            text: line,
            fontSize: bodyFontSize,
            fontWeight: 400,
            color: '#FFFFFF',
            lineHeight: bodyFontSize * 1.18,
            gapAfter: 0,
          });
        }
      });
    }
  }

  // Center vertically inside the Lore Box (x=120..552 => centerX=336, y=734..878 => centerY=806)
  const totalHeight = renderedLines.reduce(
    (acc, l) => acc + l.lineHeight + l.gapAfter,
    0
  );
  let currentY = 806 - totalHeight / 2;

  for (const line of renderedLines) {
    currentY += line.lineHeight * 0.82;
    const textEl = document.createElementNS(svgNs, 'text');
    textEl.setAttribute('x', '336');
    textEl.setAttribute('y', `${Math.round(currentY * 10) / 10}`);
    textEl.setAttribute('text-anchor', 'middle');
    textEl.setAttribute('fill', line.color);
    textEl.setAttribute('font-family', "'Plus Jakarta Sans', sans-serif");
    textEl.setAttribute('font-size', `${line.fontSize}`);

    if (line.prefixBold !== undefined) {
      const tspanBold = document.createElementNS(svgNs, 'tspan');
      tspanBold.setAttribute('font-weight', '800');
      tspanBold.textContent = line.prefixBold;
      textEl.appendChild(tspanBold);

      if (line.restNormal) {
        const tspanRest = document.createElementNS(svgNs, 'tspan');
        tspanRest.setAttribute('font-weight', '400');
        tspanRest.textContent = line.restNormal;
        textEl.appendChild(tspanRest);
      }
    } else {
      textEl.setAttribute('font-weight', `${line.fontWeight}`);
      textEl.textContent = line.text;
    }

    group.appendChild(textEl);
    currentY += line.lineHeight * 0.18 + line.gapAfter;
  }

  return group;
}

/**
 * Prepares a sanitized, taint-free clone of the SVG element by:
 * 1. Replacing any <foreignObject> (which Chromium always marks as tainting) with pure SVG equivalents
 * 2. Inlining all <image> URLs as base64 data: URLs
 */
async function prepareTaintFreeSvgClone(
  svgElement: SVGSVGElement,
  card: CardData,
  width: number,
  height: number
): Promise<SVGSVGElement> {
  const svgNs = 'http://www.w3.org/2000/svg';
  const clonedSvg = svgElement.cloneNode(true) as SVGSVGElement;
  clonedSvg.setAttribute('xmlns', svgNs);
  clonedSvg.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');
  clonedSvg.setAttribute('width', `${width}`);
  clonedSvg.setAttribute('height', `${height}`);

  // 1. Inspect live foreignObjects (video, VFX canvas, or Lore Box) and replace in clone
  const liveForeignObjects = Array.from(
    svgElement.querySelectorAll('foreignObject')
  );
  const clonedForeignObjects = Array.from(
    clonedSvg.querySelectorAll('foreignObject')
  );

  for (let i = 0; i < clonedForeignObjects.length; i++) {
    const clonedFo = clonedForeignObjects[i];
    const liveFo = liveForeignObjects[i];

    // Case A: Video inside foreignObject -> snapshot current video frame
    const liveVideo = liveFo?.querySelector('video');
    if (liveVideo && liveVideo.readyState >= 2) {
      try {
        const vCanvas = document.createElement('canvas');
        vCanvas.width = 680;
        vCanvas.height = 990;
        const vCtx = vCanvas.getContext('2d');
        if (vCtx) {
          vCtx.drawImage(liveVideo, 0, 0, 680, 990);
          const dataUrl = vCanvas.toDataURL('image/png');
          const svgImg = document.createElementNS(svgNs, 'image');
          svgImg.setAttribute('href', dataUrl);
          svgImg.setAttribute('x', clonedFo.getAttribute('x') || '0');
          svgImg.setAttribute('y', clonedFo.getAttribute('y') || '0');
          svgImg.setAttribute('width', clonedFo.getAttribute('width') || '680');
          svgImg.setAttribute('height', clonedFo.getAttribute('height') || '990');
          svgImg.setAttribute('preserveAspectRatio', 'none');
          clonedFo.replaceWith(svgImg);
          continue;
        }
      } catch {
        // Ignore if cross-origin video cannot be snapshotted
      }
    }

    // Case B: VFX Canvas inside foreignObject -> snapshot canvas
    const liveCanvas = liveFo?.querySelector('canvas');
    if (liveCanvas) {
      try {
        const dataUrl = liveCanvas.toDataURL('image/png');
        const svgImg = document.createElementNS(svgNs, 'image');
        svgImg.setAttribute('href', dataUrl);
        svgImg.setAttribute('x', clonedFo.getAttribute('x') || '0');
        svgImg.setAttribute('y', clonedFo.getAttribute('y') || '0');
        svgImg.setAttribute('width', clonedFo.getAttribute('width') || '680');
        svgImg.setAttribute('height', clonedFo.getAttribute('height') || '990');
        svgImg.setAttribute('preserveAspectRatio', 'none');
        clonedFo.replaceWith(svgImg);
        continue;
      } catch {
        // Ignore if canvas snapshot fails
      }
    }

    // Case C: Lore Box foreignObject (x="120", y="734") -> convert to pure SVG <text> nodes
    if (clonedFo.getAttribute('y') === '734' || clonedFo.querySelector('div')) {
      const loreSvgGroup = createPureSvgLoreTextGroup(card);
      clonedFo.replaceWith(loreSvgGroup);
      continue;
    }

    // Remove any remaining foreignObject so Chromium never taints the canvas
    clonedFo.remove();
  }

  // Final safety sweep: ensure zero foreignObject nodes remain
  clonedSvg.querySelectorAll('foreignObject').forEach((fo) => fo.remove());

  // 2. Inline all <image> hrefs as base64 data: URLs
  const imageElements = Array.from(clonedSvg.querySelectorAll('image'));
  for (const imgEl of imageElements) {
    const rawHref =
      imgEl.getAttribute('href') ||
      imgEl.getAttributeNS('http://www.w3.org/1999/xlink', 'href');
    if (!rawHref) continue;

    if (!rawHref.startsWith('data:')) {
      const dataUrl = await toInlineDataUrl(rawHref);
      if (dataUrl) {
        imgEl.setAttribute('href', dataUrl);
        imgEl.removeAttributeNS('http://www.w3.org/1999/xlink', 'href');
      } else {
        // Remove unreachable cross-origin image attribute so canvas export still succeeds
        imgEl.removeAttribute('href');
        imgEl.removeAttributeNS('http://www.w3.org/1999/xlink', 'href');
      }
    }
  }

  return clonedSvg;
}

/**
 * Exports the SVG element into a high-resolution PNG (2x or 3x scale) and triggers a download.
 */
export async function exportCardAsPng(
  svgElement: SVGSVGElement,
  card: CardData,
  scale = 2
): Promise<void> {
  const width = 680 * scale;
  const height = 990 * scale;

  const clonedSvg = await prepareTaintFreeSvgClone(
    svgElement,
    card,
    width,
    height
  );

  const serializer = new XMLSerializer();
  const svgString = serializer.serializeToString(clonedSvg);
  const svgDataUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
    svgString
  )}`;

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Could not get 2D canvas context'));
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error('Canvas toBlob failed'));
          return;
        }
        const downloadUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        const safeName = (card.title || 'card-frame')
          .toLowerCase()
          .replace(/[^a-z0-9-_]+/g, '-');
        link.download = `${safeName}-frame.png`;
        link.href = downloadUrl;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(downloadUrl);
        resolve();
      }, 'image/png');
    };
    img.onerror = (err) => {
      reject(err);
    };
    img.src = svgDataUrl;
  });
}

/**
 * Exports the SVG element directly as a scalable vector (.svg) file.
 */
export function exportCardAsSvg(svgElement: SVGSVGElement, card: CardData): void {
  const clonedSvg = svgElement.cloneNode(true) as SVGSVGElement;
  clonedSvg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  clonedSvg.setAttribute('width', '680');
  clonedSvg.setAttribute('height', '990');

  const serializer = new XMLSerializer();
  const svgString = serializer.serializeToString(clonedSvg);
  const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  const safeName = (card.title || 'card-frame')
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, '-');
  link.download = `${safeName}-frame.svg`;
  link.href = url;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
