import * as THREE from 'three';

const CELL = 512;
const PADDING = 20;

function lightenHex(hex: string, amount = 0.62): string {
  const c = new THREE.Color(hex);
  c.lerp(new THREE.Color('#ffffff'), amount);
  return `#${c.getHexString()}`;
}

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

function drawCell(
  ctx: CanvasRenderingContext2D,
  ox: number,
  oy: number,
  sku: string,
  seqNo: number,
  instanceNo: number,
  bgColor: string,
) {
  // Arka plan kutu rengi — label plane'in opak görünmesi için
  ctx.fillStyle = bgColor;
  ctx.fillRect(ox, oy, CELL, CELL);

  // Etiket paneli
  const panelX = ox + PADDING;
  const panelY = oy + CELL * 0.22;
  const panelW = CELL - PADDING * 2;
  const panelH = CELL * 0.56;
  const radius = 10;

  ctx.fillStyle = lightenHex(bgColor, 0.62);
  ctx.beginPath();
  ctx.roundRect(panelX, panelY, panelW, panelH, radius);
  ctx.fill();

  const textMaxW = panelW - PADDING * 2;
  const line1 = `${seqNo} · ${sku}`;
  const line2 = `#${instanceNo}`;

  const size1 = fitFont(ctx, line1, textMaxW, CELL * 0.18, true);
  ctx.font = `bold ${size1}px Arial, sans-serif`;
  ctx.fillStyle = '#111111';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(line1, ox + CELL / 2, panelY + panelH * 0.36);

  const size2 = fitFont(ctx, line2, textMaxW, CELL * 0.14, false);
  ctx.font = `${size2}px Arial, sans-serif`;
  ctx.fillStyle = '#555555';
  ctx.fillText(line2, ox + CELL / 2, panelY + panelH * 0.7);
}

export interface LabelEntry {
  sku: string;
  seqNo: number;
  instanceNo: number;
  bgColor: string;
}

export interface AtlasResult {
  texture: THREE.CanvasTexture;
  /** instanceIdx → UV offset [u, v] (0..1 aralığı, atlas içindeki hücre başlangıcı) */
  uvOffsets: Float32Array;
  /** Atlas hücre boyutu normalize edilmiş (her eksen için) */
  cellSize: number;
  cols: number;
}

/**
 * Tüm box instance'ları için tek bir atlas canvas texture üretir.
 * Her instance CELL×CELL px'lik bir hücreye sahiptir.
 * uvOffsets: [u0, v0, u1, v1, ...] — instanceIdx * 2 ile indekslenir.
 */
export function buildAtlasTexture(entries: LabelEntry[]): AtlasResult {
  const count = entries.length;
  if (count === 0) {
    const tex = new THREE.CanvasTexture(document.createElement('canvas'));
    return { texture: tex, uvOffsets: new Float32Array(0), cellSize: 1, cols: 1 };
  }

  // Grid boyutu — kare'ye yakın
  const cols = Math.ceil(Math.sqrt(count));
  const rows = Math.ceil(count / cols);

  const W = cols * CELL;
  const H = rows * CELL;

  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;

  const uvOffsets = new Float32Array(count * 2);

  entries.forEach((e, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const ox = col * CELL;
    const oy = row * CELL;

    drawCell(ctx, ox, oy, e.sku, e.seqNo, e.instanceNo, e.bgColor);

    // UV: Three.js'te V ekseni aşağıdan yukarıya — (H - oy - CELL) / H
    uvOffsets[i * 2 + 0] = ox / W;
    uvOffsets[i * 2 + 1] = (H - oy - CELL) / H;
  });

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;

  return { texture, uvOffsets, cellSize: CELL / Math.max(W, H), cols };
}
