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

const ICON_SIZE = 52;
const ICON_GAP = 8;

function loadIcons(urls: string[]): Promise<HTMLImageElement[]> {
  return Promise.all(
    urls.map(
      (url) =>
        new Promise<HTMLImageElement>((resolve) => {
          const img = new Image();
          img.onload = () => resolve(img);
          img.onerror = () => resolve(img);
          img.src = url;
        }),
    ),
  );
}

function drawCell(
  ctx: CanvasRenderingContext2D,
  ox: number,
  oy: number,
  sku: string,
  seqNo: number,
  instanceNo: number,
  bgColor: string,
  iconImgs?: HTMLImageElement[],
) {
  const hasIcons = iconImgs && iconImgs.length > 0;

  // Arka plan kutu rengi — label plane'in opak görünmesi için
  ctx.fillStyle = bgColor;
  ctx.fillRect(ox, oy, CELL, CELL);

  const panelX = ox + PADDING;
  const panelY = oy + CELL * 0.14;
  const panelW = CELL - PADDING * 2;
  // İkon satırı panel içinde — textAreaH + iconRowH
  const iconRowH = hasIcons ? ICON_SIZE + PADDING * 2 : 0;
  const textAreaH = CELL * 0.46;
  const panelH = textAreaH + iconRowH;
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
  ctx.fillText(line1, ox + CELL / 2, panelY + textAreaH * 0.36);

  const size2 = fitFont(ctx, line2, textMaxW, CELL * 0.14, false);
  ctx.font = `${size2}px Arial, sans-serif`;
  ctx.fillStyle = '#555555';
  ctx.fillText(line2, ox + CELL / 2, panelY + textAreaH * 0.7);

  if (!hasIcons) return;

  const loaded = iconImgs.filter((img) => img.complete && img.naturalWidth > 0);
  if (loaded.length === 0) return;

  const totalW = loaded.length * ICON_SIZE + (loaded.length - 1) * ICON_GAP;
  const startX = ox + (CELL - totalW) / 2;
  // Panel içinde, metin alanının altında
  const iconY = panelY + textAreaH + PADDING;

  loaded.forEach((img, i) => {
    ctx.drawImage(img, startX + i * (ICON_SIZE + ICON_GAP), iconY, ICON_SIZE, ICON_SIZE);
  });
}

export interface LabelEntry {
  sku: string;
  seqNo: number;
  instanceNo: number;
  bgColor: string;
  constraintIconUrls?: string[];
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
 * constraintIconUrls varsa SVG ikonlar async yüklenerek panel altına çizilir.
 */
export async function buildAtlasTexture(entries: LabelEntry[]): Promise<AtlasResult> {
  const count = entries.length;
  if (count === 0) {
    const tex = new THREE.CanvasTexture(document.createElement('canvas'));
    return { texture: tex, uvOffsets: new Float32Array(0), cellSize: 1, cols: 1 };
  }

  // Tüm unique URL'leri tek seferde yükle
  const allUrls = Array.from(new Set(entries.flatMap((e) => e.constraintIconUrls ?? [])));
  const loadedMap = new Map<string, HTMLImageElement>();
  if (allUrls.length > 0) {
    const imgs = await loadIcons(allUrls);
    allUrls.forEach((url, i) => loadedMap.set(url, imgs[i]));
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

    const iconImgs = e.constraintIconUrls?.map((url) => loadedMap.get(url)!).filter(Boolean);
    drawCell(ctx, ox, oy, e.sku, e.seqNo, e.instanceNo, e.bgColor, iconImgs);

    // UV: Three.js'te V ekseni aşağıdan yukarıya — (H - oy - CELL) / H
    uvOffsets[i * 2 + 0] = ox / W;
    uvOffsets[i * 2 + 1] = (H - oy - CELL) / H;
  });

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;

  return { texture, uvOffsets, cellSize: CELL / Math.max(W, H), cols };
}
