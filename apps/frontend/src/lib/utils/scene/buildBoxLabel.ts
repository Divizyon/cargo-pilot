import * as THREE from 'three';

const SIZE = 512;
const PADDING = 20;

function lightenHex(hex: string, amount = 0.55): string {
  const c = new THREE.Color(hex);
  c.lerp(new THREE.Color('#ffffff'), amount);
  return `#${c.getHexString()}`;
}

/** Panel içinde sığan en büyük fontu bulur — maxSize'dan başlayıp küçültür */
function fitFont(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxSize: number,
  bold = false,
): number {
  let size = maxSize;
  while (size > 8) {
    ctx.font = `${bold ? 'bold ' : ''}${size}px Arial, sans-serif`;
    if (ctx.measureText(text).width <= maxWidth) break;
    size -= 2;
  }
  return size;
}

const ICON_SIZE = 48;
const ICON_GAP = 10;

/**
 * SVG URL listesini HTMLImageElement dizisine paralel yükler.
 * Yüklenemeyen ikonlar sessizce atlanır.
 */
function loadIcons(urls: string[]): Promise<HTMLImageElement[]> {
  return Promise.all(
    urls.map(
      (url) =>
        new Promise<HTMLImageElement>((resolve) => {
          const img = new Image();
          img.onload = () => resolve(img);
          img.onerror = () => resolve(img); // yüklenemezse boş img
          img.src = url;
        }),
    ),
  );
}

/**
 * Kutu yüzü için CanvasTexture üretir — tamamen sync.
 * constraintIconImgs önceden yüklenmiş HTMLImageElement dizisi olarak verilir.
 * Panel içinde metin + ikonlar (panel beyaz alanı içinde) çizilir.
 */
export function buildBoxLabel(
  sku: string,
  seqNo: number,
  instanceNo: number,
  bgColor: string,
  constraintIconImgs?: HTMLImageElement[],
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext('2d')!;

  const loaded = (constraintIconImgs ?? []).filter((img) => img.complete && img.naturalWidth > 0);
  const hasIcons = loaded.length > 0;

  // Arka plan — kutu rengi
  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, SIZE, SIZE);

  const panelX = PADDING;
  const panelY = SIZE * 0.14;
  const panelW = SIZE - PADDING * 2;
  const iconRowH = hasIcons ? ICON_SIZE + PADDING * 2 : 0;
  const textAreaH = SIZE * 0.46;
  const panelH = textAreaH + iconRowH;
  const radius = 10;

  ctx.fillStyle = lightenHex(bgColor, 0.62);
  ctx.beginPath();
  ctx.roundRect(panelX, panelY, panelW, panelH, radius);
  ctx.fill();

  const textMaxW = panelW - PADDING * 2;
  const line1 = `${seqNo} · ${sku}`;
  const line2 = `#${instanceNo}`;

  const size1 = fitFont(ctx, line1, textMaxW, SIZE * 0.18, true);
  ctx.font = `bold ${size1}px Arial, sans-serif`;
  ctx.fillStyle = '#111111';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(line1, SIZE / 2, panelY + textAreaH * 0.36);

  const size2 = fitFont(ctx, line2, textMaxW, SIZE * 0.14, false);
  ctx.font = `${size2}px Arial, sans-serif`;
  ctx.fillStyle = '#555555';
  ctx.fillText(line2, SIZE / 2, panelY + textAreaH * 0.7);

  if (hasIcons) {
    const totalW = loaded.length * ICON_SIZE + (loaded.length - 1) * ICON_GAP;
    const startX = (SIZE - totalW) / 2;
    const iconY = panelY + textAreaH + PADDING;
    loaded.forEach((img, i) => {
      ctx.drawImage(img, startX + i * (ICON_SIZE + ICON_GAP), iconY, ICON_SIZE, ICON_SIZE);
    });
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

/**
 * URL listesini yükleyip buildBoxLabel'a hazır HTMLImageElement[] döndürür.
 * Yüklenemeyen ikonlar sessizce atlanır.
 */
export { loadIcons };
