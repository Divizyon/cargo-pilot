import { useWatch } from 'react-hook-form';
import type { UseFormReturn } from 'react-hook-form';
import { cn } from '@/lib/utils';
import { VehiclePreview3D } from './VehiclePreview3D';
import { FormControl, FormField, FormItem } from '@/components/ui/form';
import { Switch } from '@/components/ui/switch';
import type { VehicleFormValues } from '../schemas/vehicleSchema';
import { useAuthStore } from '@/lib/store/useAuthStore';
import { useUnitStore } from '@/lib/store/useUnitStore';
import { formatAuditDate } from '@/lib/utils/formatAuditDate';
import type { Vehicle } from '@/lib/types/vehicle';

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
  vehicle?: Pick<Vehicle, 'updatedAt' | 'updatedBy' | 'isActive'>;
  isCreateMode?: boolean;
}

export function VehiclePreviewPanel({ form, vehicle, isCreateMode = false }: Props) {
  const { control } = form;
  const currentUser = useAuthStore((s) => s.user);
  const dateFormat = useUnitStore((s) => s.dateFormat);

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
    isActive,
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
      'isActive',
    ],
  });

  const dims =
    length && width && height
      ? `${(length / 100).toFixed(1)}m × ${(height / 100).toFixed(1)}m × ${(width / 100).toFixed(2)}m`
      : '—';

  const dimsRaw = length && width && height ? `${length} × ${height} × ${width} cm` : '—';
  const cargo = maxCargoWeight ? `${Number(maxCargoWeight).toLocaleString('tr-TR')} kg` : '—';
  const gross = grossWeight ? `${Number(grossWeight).toLocaleString('tr-TR')} kg` : '—';
  const tare = tareWeight ? `${Number(tareWeight).toLocaleString('tr-TR')} kg` : '—';
  const axleCount = 1 + (axleB ? 1 : 0) + (axles ?? []).length;
  const volume =
    length && width && height ? ((length * width * height) / 1_000_000).toFixed(2) : null;

  const currentUserName = currentUser?.fullName ?? '—';
  const isPassive = isActive === false || vehicle?.isActive === false;

  const summaryRows = [
    { label: 'Araç Adı', value: name || '—', bold: true },
    { label: 'Tip', value: TYPE_LABELS[vehicleType] ?? vehicleType ?? '—' },
    {
      label: 'Kapı Yönü',
      value: doorDirection ? (DOOR_LABELS[doorDirection] ?? doorDirection) : '—',
    },
    { label: 'Ölçüler', value: dimsRaw },
    { label: 'Maks. Kargo', value: cargo },
    { label: 'Brüt Ağırlık', value: gross },
    { label: 'Dara', value: tare },
    { label: 'Aks Sayısı', value: axleCount > 1 ? `${axleCount} adet` : '—' },
    { label: 'Açıklama', value: description?.trim() || '—' },
    ...(isCreateMode ? [{ label: 'Oluşturan', value: currentUserName }] : []),
    ...(!isCreateMode && vehicle?.updatedAt
      ? [
          {
            label: 'Son Güncelleme',
            value: `${vehicle.updatedBy?.fullName ?? currentUserName} — ${formatAuditDate(vehicle.updatedAt, dateFormat, false)}`,
          },
        ]
      : []),
    ...(!isCreateMode && isPassive ? [{ label: 'Pasife Alan', value: currentUserName }] : []),
  ];

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-xl border border-border bg-background p-3">
      {/* Başlık + operasyonel durum */}
      <div className="mb-2 flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
          Araç Önizleme
        </p>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-muted-foreground">Aktif</span>
          <FormField
            control={form.control}
            name="isActive"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
              </FormItem>
            )}
          />
        </div>
      </div>

      {/* 3D Alan — flex-1 ile kalan alanı doldurur */}
      <div className="relative min-h-[160px] flex-1 overflow-hidden rounded-lg bg-muted/40">
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
            axleDistances={(axles ?? []).map((a) => a?.distance).filter((d): d is number => d > 0)}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="px-4 text-center text-[10px] uppercase tracking-wide text-muted-foreground">
              Araç tipi seçilince 3D önizleme görünür
            </p>
          </div>
        )}
      </div>

      {/* Hacim */}
      <div className="mt-2 flex items-center justify-between border-t border-border/50 pt-2">
        <span className="text-xs text-muted-foreground">Hacim</span>
        <span className="text-xs font-semibold tabular-nums text-foreground">
          {volume ? `${volume} m³` : '—'}
        </span>
      </div>
      {volume && dims !== '—' && (
        <p className="mb-1 text-right text-[10px] text-muted-foreground">{dims}</p>
      )}

      {/* Özet satırları */}
      <div className="flex flex-col">
        {summaryRows.map((r) => (
          <div
            key={r.label}
            className="flex items-center justify-between border-b border-border/50 py-1 last:border-0"
          >
            <span className="text-xs text-muted-foreground">{r.label}</span>
            <span
              className={cn(
                'max-w-[60%] truncate text-right text-xs tabular-nums',
                r.bold ? 'font-medium text-foreground' : 'text-muted-foreground',
              )}
            >
              {r.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
