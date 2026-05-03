import { useWatch } from 'react-hook-form';
import type { UseFormReturn } from 'react-hook-form';
import { cn } from '@/lib/utils';
import { VehiclePreviewCanvas } from './VehiclePreviewCanvas';
import { VehicleStatusToggle } from './VehicleStatusToggle';
import type { VehicleFormValues } from '../schemas/vehicleSchema';

const DOOR_LABELS: Record<string, string> = {
  rear: 'Arka',
  side: 'Yan',
  top: 'Üst',
};

const TYPE_LABELS: Record<string, string> = {
  Tir: 'Tır',
  Kamyon: 'Kamyon',
  Romork: 'Römork',
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
    <div className="flex items-center justify-between gap-3 border-b border-border py-2 last:border-0 last:pb-0">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd
        className={cn(
          'max-w-[60%] truncate text-right',
          emphasize ? 'text-sm font-semibold text-foreground' : 'text-sm text-foreground',
        )}
      >
        {value}
      </dd>
    </div>
  );
}

export function VehiclePreviewPanel({ form }: Props) {
  const { control } = form;
  const [name, vehicleType, length, width, height, maxCargoWeight, doorDirection, description] =
    useWatch({
      control,
      name: [
        'name',
        'vehicleType',
        'length',
        'width',
        'height',
        'maxCargoWeight',
        'doorDirection',
        'description',
      ],
    });

  const volume =
    length && width && height
      ? (() => {
          const v = length * width * height;
          if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(2)} m³`;
          if (v >= 1_000) return `${(v / 1_000).toFixed(1)} dm³`;
          return `${v} cm³`;
        })()
      : '0.00 m³';

  const cargo = maxCargoWeight ? `${Number(maxCargoWeight).toLocaleString('tr-TR')} kg` : '—';

  return (
    <aside className="flex flex-col gap-4 lg:sticky lg:top-6 lg:self-start">
      {/* Operasyonel Durum */}
      <div className="rounded-xl border bg-card p-4 shadow-sm">
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Operasyonel Durum
        </p>
        <VehicleStatusToggle form={form} compact />
      </div>

      {/* Kargo Hacmi Önizleme */}
      <div className="rounded-xl border bg-card p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Kargo Hacmi Önizleme
          </p>
          <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
            3D Önizleme
          </span>
        </div>
        <div className="overflow-hidden rounded-lg bg-muted/30">
          <VehiclePreviewCanvas control={control} />
        </div>
        <div className="mt-3 border-t pt-3">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Toplam Hacim</p>
          <p className="mt-0.5 text-2xl font-bold tabular-nums text-foreground">{volume}</p>
        </div>
      </div>

      {/* Araç Özeti */}
      <div className="rounded-xl border bg-card p-4 shadow-sm">
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Araç Özeti
        </p>
        <dl className="flex flex-col">
          <PreviewRow label="Araç Adı" value={name || '—'} emphasize />
          <PreviewRow label="Tip" value={TYPE_LABELS[vehicleType] ?? vehicleType ?? '—'} />
          <PreviewRow label="Maks. Yük" value={cargo} />
          <PreviewRow
            label="Kapı"
            value={doorDirection ? (DOOR_LABELS[doorDirection] ?? doorDirection) : '—'}
          />
        </dl>

        {description && description.trim().length > 0 && (
          <div className="mt-3 rounded-lg border border-dashed bg-muted/40 p-3">
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Açıklama
            </p>
            <p className="text-xs text-foreground/80">{description}</p>
          </div>
        )}
      </div>
    </aside>
  );
}
