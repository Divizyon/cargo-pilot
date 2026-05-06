import { useWatch } from 'react-hook-form';
import type { UseFormReturn } from 'react-hook-form';
import { cn } from '@/lib/utils';
import { VehiclePreview3D } from './VehiclePreview3D';
import { VehicleStatusToggle } from './VehicleStatusToggle';
import type { VehicleFormValues } from '../schemas/vehicleSchema';

const DOOR_LABELS: Record<string, string> = {
  rear: 'Arka',
  side: 'Yan',
  top: 'Üst',
  rearAndSide: 'Arka + Yan',
};

const TYPE_LABELS: Record<string, string> = {
  Tir: 'Tır',
  Kamyon: 'Kamyon',
  Kamposet: 'Römork',
  Konteyner: 'Konteyner',
};

interface Props {
  form: UseFormReturn<VehicleFormValues>;
}

function PreviewRow({
  label,
  value,
  emphasize = false,
}: {
  label: string;
  value: string;
  emphasize?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3  py-1">
      <dt className="shrink-0 text-xs text-muted-foreground mt-2">{label}</dt>
      <dd
        className={cn(
          'truncate text-right text-xs',
          emphasize ? 'font-semibold text-foreground' : 'text-foreground',
        )}
      >
        {value}
      </dd>
    </div>
  );
}

export function VehiclePreviewPanel({ form }: Props) {
  const { control } = form;
  const [
    name,
    vehicleType,
    length,
    width,
    height,
    maxCargoWeight,
    grossWeight,
    tareWeight,
    doorDirection,
    doorSide,
    description,
    axles,
    axleB,
    kingpin,
  ] = useWatch({
    control,
    name: [
      'name',
      'vehicleType',
      'length',
      'width',
      'height',
      'maxCargoWeight',
      'grossWeight',
      'tareWeight',
      'doorDirection',
      'doorSide',
      'description',
      'axles',
      'axleB',
      'kingpin',
    ],
  });

  const dims =
    length && width && height
      ? `${(length / 100).toFixed(1)}m × ${(width / 100).toFixed(2)}m × ${(height / 100).toFixed(1)}m`
      : '—';

  const dimsRaw = length && width && height ? `${length} × ${width} × ${height} cm` : '—';

  const cargo = maxCargoWeight ? `${Number(maxCargoWeight).toLocaleString('tr-TR')} kg` : '—';

  const gross = grossWeight ? `${Number(grossWeight).toLocaleString('tr-TR')} kg` : '—';
  const tare = tareWeight ? `${Number(tareWeight).toLocaleString('tr-TR')} kg` : '—';

  const axleCount = 1 + (axleB ? 1 : 0) + (axles ?? []).length;

  const volume =
    length && width && height ? ((length * width * height) / 1_000_000).toFixed(2) : null;

  return (
    <aside className="flex flex-1 flex-col gap-4">
      {/* Operasyonel Durum */}
      <VehicleStatusToggle form={form} />

      {/* 3D Araç Önizleme */}
      <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
        <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          3D Araç Önizleme
        </h3>
        <div className="mt-3 h-56">
          {vehicleType ? (
            <VehiclePreview3D
              vehicleType={vehicleType}
              length={length ?? 0}
              width={width ?? 0}
              height={height ?? 0}
              doorDirection={doorDirection}
              doorSide={doorSide}
              kingpinDistance={kingpin?.distance}
              axleBDistance={axleB?.distance}
              axleDistances={(axles ?? [])
                .map((a) => a?.distance)
                .filter((d): d is number => d > 0)}
            />
          ) : (
            <div className="flex h-full items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
              Araç tipi seçilince 3D önizleme görünür
            </div>
          )}
        </div>
        {volume && (
          <div className="mt-3 text-center">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Toplam Hacim
            </p>
            <p className="mt-0.5 text-2xl font-bold tabular-nums text-foreground">{volume} m³</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{dims}</p>
          </div>
        )}
      </div>

      {/* Araç Özeti */}
      <div className="flex flex-1 flex-col rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
        <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Araç Özeti
        </h3>
        <dl className="mt-2 divide-y divide-zinc-100 ">
          <PreviewRow label="Araç Adı" value={name || '—'} emphasize />
          <PreviewRow label="Tip" value={TYPE_LABELS[vehicleType] ?? vehicleType ?? '—'} />
          <PreviewRow
            label="Kapı Yönleri"
            value={doorDirection ? (DOOR_LABELS[doorDirection] ?? doorDirection) : '—'}
          />
          <PreviewRow label="Fiziksel Ölçüler" value={dimsRaw} />
          <PreviewRow label="Maks. Kargo Yükü" value={cargo} />
          <PreviewRow label="Brüt Ağırlık" value={gross} />
          <PreviewRow label="Dara Ağırlığı" value={tare} />
          <PreviewRow label="Aks Sayısı" value={axleCount > 1 ? `${axleCount} Adet` : '—'} />
          <PreviewRow
            label="Açıklama"
            value={description && description.trim() ? description : '—'}
          />
        </dl>
      </div>
    </aside>
  );
}
