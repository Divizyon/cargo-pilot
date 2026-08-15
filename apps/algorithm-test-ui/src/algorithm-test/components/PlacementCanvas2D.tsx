import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent } from 'react';
import type { Placement } from '@/lib/types/loadingPlan';
import type { Vehicle } from '@/lib/types/vehicle';
import type { LifoZone } from '../verification/lifoZones';
import { readDrawPalette, type DrawPalette } from '../utils/colors';
import { cn } from '@/lib/utils';

/**
 * Üç ortografik projeksiyon. Üretimdeki 3D sahnenin (apps/frontend
 * src/features/planning/scene) yerini almaz; denetim için ölçülebilir olduğu
 * için tercih edilir — perspektif yok, her kenar gerçek ölçeğinde.
 *
 * `side` görünümü Z×Y'dir: LIFO bölgeleri ve boyuna denge yalnızca burada
 * okunabilir, çünkü ikisi de Z ekseninde ölçülür.
 */
export type ProjectionView = 'plan' | 'side' | 'front';

type Axis = 'x' | 'y' | 'z';

interface ViewConfig {
  /** Yatay eksen. */
  h: Axis;
  /** Düşey eksen. */
  v: Axis;
  /** Ekrana dik eksen — çizim sırası bu eksende belirlenir. */
  perp: Axis;
  /** Düşey eksen ters çevrilsin mi (taban canvas'ın altında olsun diye). */
  flipV: boolean;
  /** Çizim sırası: dik eksende artan yön kameraya yaklaşıyor mu. */
  perpAscending: boolean;
  label: string;
  hLabel: string;
  vLabel: string;
}

export const VIEW_CONFIG: Record<ProjectionView, ViewConfig> = {
  // Kamera yukarıdan bakar: Y arttıkça kameraya yaklaşır. Uzun eksen (Z) yatayda:
  // 13.6 m'lik bir dorse dikey çizilince ekranı boydan boya kaplayıp okunmaz
  // hâle geliyordu. Yandan görünümle aynı yatay ekseni paylaşması, iki görünümü
  // alt alta karşılaştırmayı da kolaylaştırıyor.
  plan: {
    h: 'z',
    v: 'x',
    perp: 'y',
    flipV: false,
    perpAscending: true,
    label: 'Üstten (Z×X)',
    hLabel: 'Z derinlik — 0 arka kapı',
    vLabel: 'X genişlik',
  },
  // Kamera sağ yandan bakar: X arttıkça yaklaşır. Z=0 (arka kapı) solda.
  side: {
    h: 'z',
    v: 'y',
    perp: 'x',
    flipV: true,
    perpAscending: true,
    label: 'Yandan (Z×Y)',
    hLabel: 'Z derinlik — 0 arka kapı',
    vLabel: 'Y yükseklik',
  },
  // Kamera arka kapıdan bakar: Z küçüldükçe yaklaşır.
  front: {
    h: 'x',
    v: 'y',
    perp: 'z',
    flipV: true,
    perpAscending: false,
    label: 'Önden (X×Y)',
    hLabel: 'X genişlik',
    vLabel: 'Y yükseklik',
  },
};

/** 11 px etiketler 9 px'e göre daha çok yer ister; dolgu buna göre. */
const PADDING_PX = 32;
/**
 * Tuval, kabında kalan yüksekliği doldurur. Sabit 460 pikselken kart ya boş alan
 * bırakıyor ya da altındaki panelleri kaydırmaya itiyordu. Alt sınır, ölçüsü
 * okunamayacak kadar küçülmesini engeller.
 */
const MIN_CANVAS_PX_HEIGHT = 240;

/** Ölçü sayıları mono: rakam genişlikleri eşit olunca cetvel hizalı okunur. */
const TICK_FONT = '11px ui-monospace, SFMono-Regular, Menlo, monospace';
/** Eksen adları arayüzün kesimiyle aynı. */
const AXIS_LABEL_FONT = '11px "Plus Jakarta Sans", sans-serif';

/**
 * Üretimdeki `calcBalance` eşiklerinin aynası (apps/frontend
 * src/lib/utils/geometry/calcCenterOfGravity.ts COG_THRESHOLDS): normalize
 * sapma bu bantlara göre sınıflanır.
 */
const COG_THRESHOLDS = { dikkat: 0.05, riskli: 0.1, kritik: 0.15 } as const;

export type CogLevel = 'ideal' | 'dikkat' | 'riskli' | 'kritik';

/**
 * Dört bant üç durum rengine iner: `dikkat` ile `riskli` aynı uyarı rengini
 * paylaşır. Bandın tam adı RunSummary rozetinde yazıyla verildiği için bilgi
 * kaybolmuyor; arayüzde renk sayısını üçte tutmak tutarlılığa değer.
 */
function cogLevelColor(level: CogLevel, palette: DrawPalette): string {
  if (level === 'ideal') return palette.pass;
  if (level === 'kritik') return palette.fail;
  return palette.warn;
}

export function cogLevel(bias: number): CogLevel {
  const abs = Math.abs(bias);
  if (abs > COG_THRESHOLDS.kritik) return 'kritik';
  if (abs > COG_THRESHOLDS.riskli) return 'riskli';
  if (abs > COG_THRESHOLDS.dikkat) return 'dikkat';
  return 'ideal';
}

function axisPosition(placement: Placement, axis: Axis): number {
  if (axis === 'x') return placement.positionX;
  if (axis === 'y') return placement.positionY;
  return placement.positionZ;
}

function axisSize(placement: Placement, axis: Axis): number {
  if (axis === 'x') return placement.width;
  if (axis === 'y') return placement.height;
  return placement.depth;
}

function vehicleSpan(vehicle: Vehicle, axis: Axis): number {
  if (axis === 'x') return vehicle.width;
  if (axis === 'y') return vehicle.height;
  return vehicle.length;
}

/** Ölçek çizgisi aralığını, canvas'ta ~60 pikselden seyrek olmayacak şekilde seçer. */
function pickTickStepCm(spanCm: number, spanPx: number): number {
  const candidates = [10, 25, 50, 100, 200, 500, 1000];
  const target = 60;
  for (const step of candidates) {
    if ((step / spanCm) * spanPx >= target) return step;
  }
  return candidates[candidates.length - 1];
}

export interface CogPoint {
  x: number;
  y: number;
  z: number;
}

interface PlacementCanvas2DProps {
  placements: Placement[];
  vehicle: Vehicle | null;
  view: ProjectionView;
  /** Backend'den gelen ağırlık merkezi (cm). */
  cog?: CogPoint | null;
  /** Çizilecek LIFO bölgeleri; yalnızca Z ekseni görünen projeksiyonlarda çizilir. */
  zones?: readonly LifoZone[];
  /** Seçili kuralın etkilediği kutu indeksleri; verilirse gerisi soluklaşır. */
  highlightedIndices?: readonly number[] | null;
  selectedIndex?: number | null;
  onSelect?: (index: number | null) => void;
  className?: string;
}

export function PlacementCanvas2D({
  placements,
  vehicle,
  view,
  cog = null,
  zones = [],
  highlightedIndices = null,
  selectedIndex = null,
  onSelect,
  className,
}: PlacementCanvas2DProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [available, setAvailable] = useState({ width: 0, height: 0 });

  /**
   * Kap iki eksende de ölçülür; ölçek ikisinin küçüğüne göre seçilir. Kap
   * `flex-1 min-h-0 overflow-hidden` olduğu için boyutu yerleşimden gelir,
   * içindeki tuvalden değil — ölçüm geri beslemeye girmez.
   */
  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;

    const observer = new ResizeObserver((entries) => {
      const rect = entries[0]?.contentRect;
      if (!rect) return;
      setAvailable((prev) => {
        const width = Math.round(rect.width);
        const height = Math.round(rect.height);
        return prev.width === width && prev.height === height ? prev : { width, height };
      });
    });
    observer.observe(wrapper);
    return () => observer.disconnect();
  }, []);

  /**
   * Ekran koordinatı hesabı çizim ve hit-test tarafından paylaşılır; ikisi
   * ayrışırsa tıklama yanlış kutuyu seçer.
   */
  const projection = useMemo(() => {
    if (!vehicle || available.width === 0) return null;

    const config = VIEW_CONFIG[view];
    const spanH = vehicleSpan(vehicle, config.h);
    const spanV = vehicleSpan(vehicle, config.v);
    const drawableW = available.width - PADDING_PX * 2;
    const drawableH = Math.max(available.height, MIN_CANVAS_PX_HEIGHT) - PADDING_PX * 2;
    if (drawableW <= 0 || drawableH <= 0 || spanH <= 0 || spanV <= 0) return null;

    // Tuval tam olarak çizimin kapladığı alan kadar; artan boşluk bırakılmaz.
    const scale = Math.min(drawableW / spanH, drawableH / spanV);
    const canvasWidth = Math.round(spanH * scale + PADDING_PX * 2);
    const canvasHeight = Math.round(spanV * scale + PADDING_PX * 2);

    return {
      config,
      spanH,
      spanV,
      scale,
      canvasWidth,
      canvasHeight,
      toX: (value: number) => PADDING_PX + value * scale,
      toY: (value: number, size: number) =>
        config.flipV
          ? PADDING_PX + (spanV - value - size) * scale
          : PADDING_PX + value * scale,
    };
  }, [available, vehicle, view]);


  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    if (!projection || !vehicle) return;

    const { config, spanH, spanV, scale, toX, toY, canvasWidth, canvasHeight } = projection;

    // Retina'da bulanıklaşmasın diye çizim yüzeyi DPR ile ölçeklenir.
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(canvasWidth * dpr);
    canvas.height = Math.round(canvasHeight * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);

    // Palet her çizimde okunur; tema değişirse bir sonraki çizimde yansır.
    const palette = readDrawPalette();

    drawTicks(ctx, { spanH, spanV, scale, toX, toY, config, palette });

    // Araç çerçevesi: düşey eksen ters çevrildiğinde üst kenarı bulmak için
    // `size` olarak span geçilmeli, aksi hâlde çerçeve canvas dışına düşer.
    ctx.strokeStyle = palette.ink;
    ctx.lineWidth = 2;
    ctx.strokeRect(toX(0), toY(0, spanV), spanH * scale, spanV * scale);

    drawZones(ctx, { zones, config, spanH, spanV, scale, toX, toY, palette });

    // Kameradan uzaktan yakına çizilir: yakındaki kutu üstte kalır, aksi hâlde
    // dizi sırası derinlik ipucunu bozar.
    const order = placements
      .map((_, index) => index)
      .sort((a, b) => {
        const delta =
          axisPosition(placements[a], config.perp) - axisPosition(placements[b], config.perp);
        return config.perpAscending ? delta : -delta;
      });

    const highlightSet = highlightedIndices ? new Set(highlightedIndices) : null;

    for (const index of order) {
      const placement = placements[index];
      const isHighlighted = highlightSet ? highlightSet.has(index) : true;
      const isSelected = selectedIndex === index;

      const x = toX(axisPosition(placement, config.h));
      const sizeV = axisSize(placement, config.v);
      const y = toY(axisPosition(placement, config.v), sizeV);
      const w = axisSize(placement, config.h) * scale;
      const h = sizeV * scale;

      ctx.globalAlpha = isHighlighted ? 0.85 : 0.15;
      ctx.fillStyle = placement.isViolation ? palette.fail : (placement.color ?? palette.box);
      ctx.fillRect(x, y, w, h);

      ctx.globalAlpha = isHighlighted ? 1 : 0.25;
      ctx.strokeStyle = isSelected ? palette.selected : palette.ink;
      ctx.lineWidth = isSelected ? 2.5 : 1;
      ctx.strokeRect(x, y, w, h);
      ctx.globalAlpha = 1;
    }

    drawCog(ctx, { cog, vehicle, config, spanH, spanV, scale, toX, toY, palette });
  }, [cog, highlightedIndices, placements, projection, selectedIndex, vehicle, zones]);

  const handleClick = useCallback(
    (event: MouseEvent<HTMLCanvasElement>) => {
      if (!onSelect) return;
      const canvas = canvasRef.current;
      if (!projection || !canvas) return;

      const rect = canvas.getBoundingClientRect();
      const px = event.clientX - rect.left;
      const py = event.clientY - rect.top;
      const { config, scale, toX, toY } = projection;

      // Çizim sırasının tersinden tarar: en üstte görünen kutu seçilir.
      const order = placements
        .map((_, index) => index)
        .sort((a, b) => {
          const delta =
            axisPosition(placements[a], config.perp) - axisPosition(placements[b], config.perp);
          return config.perpAscending ? delta : -delta;
        })
        .reverse();

      for (const index of order) {
        const placement = placements[index];
        const sizeV = axisSize(placement, config.v);
        const x = toX(axisPosition(placement, config.h));
        const y = toY(axisPosition(placement, config.v), sizeV);
        const w = axisSize(placement, config.h) * scale;
        const h = sizeV * scale;

        if (px >= x && px <= x + w && py >= y && py <= y + h) {
          onSelect(selectedIndex === index ? null : index);
          return;
        }
      }

      onSelect(null);
    },
    [onSelect, placements, projection, selectedIndex],
  );

  return (
    // `overflow-hidden`: tuval kabı büyütemez, ölçüm tek yönlü kalır.
    <div
      ref={wrapperRef}
      className={cn(
        'flex min-h-0 w-full flex-1 items-center justify-center overflow-hidden',
        className,
      )}
    >
      <canvas
        ref={canvasRef}
        onClick={handleClick}
        style={{ width: projection?.canvasWidth ?? 0, height: projection?.canvasHeight ?? 0 }}
        className={cn('rounded border bg-background', onSelect && 'cursor-crosshair')}
        role="img"
        aria-label={VIEW_CONFIG[view].label}
      />
    </div>
  );
}

interface DrawContext {
  config: ViewConfig;
  spanH: number;
  spanV: number;
  scale: number;
  toX: (value: number) => number;
  toY: (value: number, size: number) => number;
  palette: DrawPalette;
}

function drawTicks(ctx: CanvasRenderingContext2D, draw: DrawContext) {
  const { config, spanH, spanV, scale, toX, toY, palette } = draw;

  ctx.font = TICK_FONT;
  ctx.fillStyle = palette.label;
  ctx.strokeStyle = palette.grid;
  ctx.lineWidth = 1;

  const stepH = pickTickStepCm(spanH, spanH * scale);
  for (let value = 0; value <= spanH; value += stepH) {
    const x = toX(value);
    ctx.beginPath();
    ctx.moveTo(x, toY(0, spanV));
    ctx.lineTo(x, toY(0, spanV) + spanV * scale);
    ctx.globalAlpha = 0.4;
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.textAlign = 'center';
    ctx.fillText(String(value), x, toY(0, spanV) + spanV * scale + 14);
  }

  const stepV = pickTickStepCm(spanV, spanV * scale);
  for (let value = 0; value <= spanV; value += stepV) {
    const y = toY(value, 0);
    ctx.beginPath();
    ctx.moveTo(toX(0), y);
    ctx.lineTo(toX(spanH), y);
    ctx.globalAlpha = 0.4;
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.textAlign = 'right';
    ctx.fillText(String(value), toX(0) - 6, y + 4);
  }

  // Eksen adları sayı değil, metin: sans'a geçilir.
  ctx.font = AXIS_LABEL_FONT;
  ctx.textAlign = 'left';
  ctx.fillText(config.hLabel, toX(0), toY(0, spanV) - 8);
  ctx.fillText(`${config.vLabel} · cm`, toX(0), toY(0, spanV) + spanV * scale + 28);
}

function drawZones(
  ctx: CanvasRenderingContext2D,
  draw: DrawContext & { zones: readonly LifoZone[] },
) {
  const { zones, config, spanH, spanV, scale, toX, toY, palette } = draw;
  // Bölgeler Z ekseninde tanımlıdır; Z görünmeyen projeksiyonda çizilmez.
  if (zones.length === 0 || (config.h !== 'z' && config.v !== 'z')) return;

  const zIsHorizontal = config.h === 'z';
  ctx.save();
  ctx.setLineDash([5, 4]);
  ctx.lineWidth = 1.5;
  ctx.font = TICK_FONT;
  ctx.strokeStyle = palette.zone;
  ctx.fillStyle = palette.zone;

  for (const zone of zones) {

    if (zIsHorizontal) {
      const x = toX(zone.zEnd);
      ctx.beginPath();
      ctx.moveTo(x, toY(0, spanV));
      ctx.lineTo(x, toY(0, spanV) + spanV * scale);
      ctx.stroke();
      ctx.textAlign = 'center';
      ctx.fillText(`G${zone.unloadingOrder}`, toX((zone.zStart + zone.zEnd) / 2), toY(0, spanV) - 6);
    } else {
      const y = toY(zone.zEnd, 0);
      ctx.beginPath();
      ctx.moveTo(toX(0), y);
      ctx.lineTo(toX(spanH), y);
      ctx.stroke();
      ctx.textAlign = 'left';
      ctx.fillText(`G${zone.unloadingOrder}`, toX(spanH) + 4, toY((zone.zStart + zone.zEnd) / 2, 0));
    }
  }

  ctx.restore();
}

function drawCog(
  ctx: CanvasRenderingContext2D,
  draw: DrawContext & { cog: CogPoint | null; vehicle: Vehicle },
) {
  const { cog, vehicle, config, spanH, spanV, scale, toX, toY, palette } = draw;
  if (!cog) return;

  const axisValue = (axis: Axis) => (axis === 'x' ? cog.x : axis === 'y' ? cog.y : cog.z);
  const hValue = axisValue(config.h);
  const vValue = axisValue(config.v);
  if (!Number.isFinite(hValue) || !Number.isFinite(vValue)) return;

  // Sapma yalnızca X ve Z'de anlamlıdır (Y motorun denge teriminde yok);
  // görünen eksenlerden hangileri bunlarsa en kötü seviye alınır.
  const levels: CogLevel[] = [];
  for (const axis of [config.h, config.v] as Axis[]) {
    if (axis === 'y') continue;
    const span = vehicleSpan(vehicle, axis);
    levels.push(cogLevel((axisValue(axis) - span / 2) / span));
  }
  const order: CogLevel[] = ['ideal', 'dikkat', 'riskli', 'kritik'];
  const level = levels.reduce<CogLevel>(
    (worst, candidate) => (order.indexOf(candidate) > order.indexOf(worst) ? candidate : worst),
    'ideal',
  );

  const cx = toX(hValue);
  const cy = toY(vValue, 0);

  ctx.save();

  // Araç merkezi referansı.
  ctx.strokeStyle = palette.grid;
  ctx.setLineDash([3, 3]);
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(toX(spanH / 2), toY(0, spanV));
  ctx.lineTo(toX(spanH / 2), toY(0, spanV) + spanV * scale);
  ctx.stroke();
  ctx.setLineDash([]);

  const levelColor = cogLevelColor(level, palette);
  ctx.strokeStyle = levelColor;
  ctx.fillStyle = levelColor;
  ctx.lineWidth = 2;
  const arm = 9;
  ctx.beginPath();
  ctx.moveTo(cx - arm, cy);
  ctx.lineTo(cx + arm, cy);
  ctx.moveTo(cx, cy - arm);
  ctx.lineTo(cx, cy + arm);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(cx, cy, 3.5, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}
