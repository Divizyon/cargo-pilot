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
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd
        className={cn(
          'truncate text-right',
          emphasize ? 'text-base font-semibold text-foreground' : 'text-sm text-foreground',
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

  const dims = length && width && height ? `${length} × ${width} × ${height} cm` : '—';

  const cargo = maxCargoWeight
    ? `${Number(maxCargoWeight).toLocaleString('tr-TR')} kg`
    : '—';

  return (
    <aside className="lg:sticky lg:top-6 lg:self-start">
      <div className="flex flex-col gap-4">
        <VehicleStatusToggle form={form} />

        <VehiclePreviewCanvas control={control} />

        {(length && width) ? (
          <div className="flex items-baseline justify-between rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              U × G × Y
            </span>
            <span className="text-lg font-semibold tabular-nums text-foreground">{dims}</span>
          </div>
        ) : null}

        <dl className="space-y-2 text-sm">
          <PreviewRow label="Araç Adı" value={name || '—'} emphasize />
          <PreviewRow label="Tip" value={TYPE_LABELS[vehicleType] ?? vehicleType ?? '—'} />
          <PreviewRow label="Maks Yük" value={cargo} />
          <PreviewRow
            label="Kapı"
            value={doorDirection ? (DOOR_LABELS[doorDirection] ?? doorDirection) : '—'}
          />
        </dl>

        {description && description.trim().length > 0 && (
          <div className="rounded-md border border-dashed border-zinc-300 bg-zinc-50 p-3 text-xs text-foreground">
            <p className="mb-1 font-semibold uppercase tracking-wide text-muted-foreground">
              Açıklama
            </p>
            <p className="whitespace-pre-wrap break-words">{description}</p>
          </div>
        )}
      </div>
    </aside>
  );
}
