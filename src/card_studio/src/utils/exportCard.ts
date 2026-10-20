import { CardData } from '../types/card';

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

  // Clone SVG so we can serialize it cleanly with explicit dimensions
  const clonedSvg = svgElement.cloneNode(true) as SVGSVGElement;
  clonedSvg.setAttribute('width', `${width}`);
  clonedSvg.setAttribute('height', `${height}`);

  const serializer = new XMLSerializer();
  const svgString = serializer.serializeToString(clonedSvg);
  const svgBlob = new Blob([svgString], {
    type: 'image/svg+xml;charset=utf-8',
  });
  const url = URL.createObjectURL(svgBlob);

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        URL.revokeObjectURL(url);
        reject(new Error('Could not get 2D canvas context'));
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);
      URL.revokeObjectURL(url);

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
      URL.revokeObjectURL(url);
      reject(err);
    };
    img.src = url;
  });
}

/**
 * Exports the SVG element directly as a scalable vector (.svg) file.
 */
export function exportCardAsSvg(svgElement: SVGSVGElement, card: CardData): void {
  const clonedSvg = svgElement.cloneNode(true) as SVGSVGElement;
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
