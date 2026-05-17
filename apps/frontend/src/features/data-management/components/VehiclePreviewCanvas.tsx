import { memo, useMemo } from 'react';
import { useWatch } from 'react-hook-form';
import type { Control } from 'react-hook-form';
import { VehicleType } from '@/lib/types/vehicle';
import { scaleVehicleDimensions } from '@/lib/utils/scaleVehicleDimensions';
import { useUnitStore } from '@/lib/store/useUnitStore';
import { formatDimensionDisplay } from '@/lib/utils/unitConversion';
import type { VehicleFormValues } from '../schemas/vehicleSchema';

interface VehiclePreviewCanvasProps {
  control: Control<VehicleFormValues>;
}

const CANVAS_W = 400;
const CANVAS_H = 180;
const PAD = 24;

export const VehiclePreviewCanvas = memo(function VehiclePreviewCanvas({
  control,
}: VehiclePreviewCanvasProps) {
  const [vehicleType, length, width, axles, doorDirection] = useWatch({
    control,
    name: ['vehicleType', 'length', 'width', 'axles', 'doorDirection'],
  });
  const dimensionUnit = useUnitStore((s) => s.dimensionUnit);

  const isContainer = vehicleType === VehicleType.Konteyner;

  const { scaledLength, scaledWidth } = useMemo(
    () => scaleVehicleDimensions(length ?? 0, width ?? 0, CANVAS_W - PAD * 2, CANVAS_H - PAD * 2),
    [length, width],
  );

  if (!length || !width) {
    return (
      <div className="flex h-56 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
        Uzunluk ve genişlik girilince ön izleme görünür
      </div>
    );
  }

  const bx = PAD;
  const by = PAD;
  const bw = scaledLength;
  const bh = scaledWidth;

  return (
    <div className="rounded-lg border bg-muted/30 p-2">
      <p className="mb-1 text-xs text-muted-foreground">Ön İzleme — Üstten Görünüm</p>
      <svg
        width={CANVAS_W}
        height={CANVAS_H}
        viewBox={`0 0 ${CANVAS_W} ${CANVAS_H}`}
        className="w-full"
        aria-label="Araç ön izleme"
      >
        <rect
          x={bx}
          y={by}
          width={bw}
          height={bh}
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          rx={isContainer ? 2 : 6}
        />

        {(doorDirection === 'rear' || doorDirection === 'rearAndSide') && (
          <rect x={bx + bw - 5} y={by} width={5} height={bh} fill="var(--primary)" opacity={0.6} />
        )}
        {(doorDirection === 'side' || doorDirection === 'rearAndSide') && (
          <rect x={bx} y={by + bh - 5} width={bw} height={5} fill="var(--primary)" opacity={0.6} />
        )}
        {doorDirection === 'top' && (
          <text
            x={bx + bw / 2}
            y={by + bh / 2}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize={10}
            fill="var(--primary)"
          >
            Üst Kapı
          </text>
        )}

        {!isContainer &&
          (axles ?? []).map((axle, i) => {
            if (!axle?.distance || !length) return null;
            const axleX = bx + (axle.distance / length) * bw;
            return (
              <line
                key={i}
                x1={axleX}
                y1={by}
                x2={axleX}
                y2={by + bh}
                stroke="currentColor"
                strokeWidth={1.5}
                strokeDasharray="4 2"
                opacity={0.5}
              />
            );
          })}

        <text
          x={bx + bw / 2}
          y={by + bh + 14}
          textAnchor="middle"
          fontSize={10}
          fill="currentColor"
          opacity={0.7}
        >
          {formatDimensionDisplay(length, dimensionUnit)}
        </text>
        <text
          x={bx - 8}
          y={by + bh / 2}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize={10}
          fill="currentColor"
          opacity={0.7}
          transform={`rotate(-90, ${bx - 8}, ${by + bh / 2})`}
        >
          {formatDimensionDisplay(width, dimensionUnit)}
        </text>
      </svg>
    </div>
  );
});
