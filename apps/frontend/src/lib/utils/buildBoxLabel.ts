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

/**
 * Kutu yüzü için CanvasTexture üretir.
 * Panel içinde metin otomatik olarak sığdırılır — taşma olmaz.
 */
export function buildBoxLabel(
  sku: string,
  seqNo: number,
  instanceNo: number,
  bgColor: string,
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext('2d')!;

  // Arka plan — kutu rengi
  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, SIZE, SIZE);

  // Etiket paneli
  const panelX = PADDING;
  const panelY = SIZE * 0.22;
  const panelW = SIZE - PADDING * 2;
  const panelH = SIZE * 0.56;
  const radius = 10;

  ctx.fillStyle = lightenHex(bgColor, 0.62);
  ctx.beginPath();
  ctx.roundRect(panelX, panelY, panelW, panelH, radius);
  ctx.fill();

  const textMaxW = panelW - PADDING * 2;
  const line1 = `${seqNo} · ${sku}`;
  const line2 = `#${instanceNo}`;

  // Üst satır — bold, auto-fit
  const size1 = fitFont(ctx, line1, textMaxW, SIZE * 0.18, true);
  ctx.font = `bold ${size1}px Arial, sans-serif`;
  ctx.fillStyle = '#111111';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(line1, SIZE / 2, panelY + panelH * 0.36);

  // Alt satır — normal, auto-fit
  const size2 = fitFont(ctx, line2, textMaxW, SIZE * 0.14, false);
  ctx.font = `${size2}px Arial, sans-serif`;
  ctx.fillStyle = '#555555';
  ctx.fillText(line2, SIZE / 2, panelY + panelH * 0.7);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}
