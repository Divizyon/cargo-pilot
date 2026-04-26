import { useEffect } from 'react';
import { useForm, Controller, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { ElementType } from 'react';
import { Car, Package2, Truck } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import type { Vehicle } from '@/lib/types/vehicle';

// ─── Schema ───────────────────────────────────────────────────────────────────

const vehicleModalSchema = z.object({
  vehicleType: z.enum(['tir', 'kamyon', 'kamposet', 'konteyner']),
  name:        z.string().min(1, 'Zorunlu'),
  payload:     z.number({ error: 'Sayı giriniz' }).positive('Pozitif olmalı'),
  length:      z.number({ error: 'Sayı giriniz' }).positive('Pozitif olmalı'),
  width:       z.number({ error: 'Sayı giriniz' }).positive('Pozitif olmalı'),
  height:      z.number({ error: 'Sayı giriniz' }).positive('Pozitif olmalı'),
  loadingArea: z.enum(['arka', 'yan', 'arka-yan']),
});

type VehicleModalValues = z.infer<typeof vehicleModalSchema>;

const EMPTY_DEFAULTS: VehicleModalValues = {
  vehicleType: 'kamyon',
  name:        '',
  payload:     0,
  length:      0,
  width:       0,
  height:      0,
  loadingArea: 'arka',
};

// ─── Vehicle type config ──────────────────────────────────────────────────────

const VEHICLE_TYPES: Array<{
  value: 'tir' | 'kamyon' | 'kamposet' | 'konteyner';
  label: string;
  Icon: ElementType;
}> = [
  { value: 'tir',       label: 'Tır',       Icon: Truck    },
  { value: 'kamyon',    label: 'Kamyon',    Icon: Truck    },
  { value: 'kamposet',  label: 'Kamposet',  Icon: Car      },
  { value: 'konteyner', label: 'Konteyner', Icon: Package2 },
];

// ─── Loading area config ──────────────────────────────────────────────────────

const LOADING_AREAS: Array<{
  value: 'arka' | 'yan' | 'arka-yan';
  label: string;
}> = [
  { value: 'arka',     label: 'Yalnızca Arka'      },
  { value: 'yan',      label: '+ Yan Profil'        },
  { value: 'arka-yan', label: '+ Arka + Yan (Full)' },
];

// ─── AddVehicleModal ──────────────────────────────────────────────────────────

interface AddVehicleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (vehicle: Vehicle) => void;
}

export function AddVehicleModal({ open, onOpenChange, onAdd }: AddVehicleModalProps) {
  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<VehicleModalValues>({
    resolver: zodResolver(vehicleModalSchema),
    defaultValues: EMPTY_DEFAULTS,
  });

  useEffect(() => {
    if (open) reset(EMPTY_DEFAULTS);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const name        = useWatch({ control, name: 'name' });
  const payload     = useWatch({ control, name: 'payload' });
  const length      = useWatch({ control, name: 'length' });
  const width       = useWatch({ control, name: 'width' });
  const height      = useWatch({ control, name: 'height' });
  const loadingArea = useWatch({ control, name: 'loadingArea' });

  const volumeM3 =
    length && width && height
      ? ((length * width * height) / 1_000_000).toFixed(1)
      : '0';

  const loadingLabel = LOADING_AREAS.find((a) => a.value === loadingArea)?.label ?? '';

  function onSubmit(data: VehicleModalValues) {
    const vehicle: Vehicle = {
      id:      crypto.randomUUID(),
      name:    data.name,
      length:  data.length,
      width:   data.width,
      height:  data.height,
      payload: data.payload,
    };
    onAdd(vehicle);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl p-0 gap-0 overflow-hidden">
        <div className="flex">

          {/* ── Left: Form ───────────────────────────────────────────────── */}
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="flex-1 flex flex-col gap-5 p-6"
          >
            <DialogHeader>
              <DialogTitle className="text-base font-semibold text-zinc-900">
                Yeni Araç Ekle
              </DialogTitle>
            </DialogHeader>

            {/* 1. Araç Tipi */}
            <div className="flex flex-col gap-2.5">
              <span className="text-xs font-medium text-zinc-500">1. Araç Tipi</span>
              <Controller
                name="vehicleType"
                control={control}
                render={({ field }) => (
                  <div className="flex gap-2">
                    {VEHICLE_TYPES.map(({ value, label, Icon }) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => field.onChange(value)}
                        className={cn(
                          'flex flex-col items-center gap-1.5 px-3 py-3 rounded-xl border-2 text-xs font-medium transition-colors flex-1',
                          field.value === value
                            ? 'border-zinc-900 bg-zinc-900 text-white'
                            : 'border-zinc-200 text-zinc-500 hover:border-zinc-400 hover:text-zinc-700',
                        )}
                      >
                        <Icon className="w-5 h-5" strokeWidth={1.5} />
                        {label}
                      </button>
                    ))}
                  </div>
                )}
              />
            </div>

            {/* 2. Kapasite ve Boyutlar */}
            <div className="flex flex-col gap-3">
              <span className="text-xs font-medium text-zinc-500">2. Kapasite ve Boyutlar</span>
              <Input
                {...register('name')}
                placeholder="Araç Modeli (Örn: Volvo FH16 - 6x4)"
                className={cn('h-9', errors.name && 'border-rose-400')}
              />
              <div className="grid grid-cols-3 gap-2">
                <div className="flex flex-col gap-1">
                  <Label className="text-[10px] text-zinc-400 uppercase tracking-wide">
                    KAPASİTE (KG)
                  </Label>
                  <Input
                    type="number"
                    min="1"
                    step="1"
                    placeholder="0"
                    {...register('payload', { valueAsNumber: true })}
                    className={cn('h-8 text-sm', errors.payload && 'border-rose-400')}
                  />
                </div>
                <div className="flex flex-col gap-1 col-span-2">
                  <Label className="text-[10px] text-zinc-400 uppercase tracking-wide">
                    HACİM (M³)
                  </Label>
                  <div className="h-8 px-3 flex items-center rounded-md border border-zinc-200 bg-zinc-50 text-sm text-zinc-500 select-none">
                    {volumeM3}
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {(
                  [
                    { key: 'width'  as const, label: 'EN'         },
                    { key: 'length' as const, label: 'BOY'        },
                    { key: 'height' as const, label: 'YÜKSEKLİK' },
                  ]
                ).map(({ key, label }) => (
                  <div key={key} className="flex flex-col gap-1">
                    <Label className="text-[10px] text-zinc-400 uppercase tracking-wide">
                      {label}
                    </Label>
                    <Input
                      type="number"
                      min="1"
                      step="1"
                      placeholder="0"
                      {...register(key, { valueAsNumber: true })}
                      className={cn('h-8 text-sm', errors[key] && 'border-rose-400')}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* 3. Yükleme Alanı & Kapı Tipi */}
            <div className="flex flex-col gap-2.5">
              <span className="text-xs font-medium text-zinc-500">
                3. Yükleme Alanı & Kapı Tipi
              </span>
              <Controller
                name="loadingArea"
                control={control}
                render={({ field }) => (
                  <div className="flex gap-2">
                    {LOADING_AREAS.map(({ value, label }) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => field.onChange(value)}
                        className={cn(
                          'flex-1 py-2 px-3 rounded-lg border text-xs font-medium transition-colors',
                          field.value === value
                            ? 'border-zinc-900 bg-zinc-900 text-white'
                            : 'border-zinc-200 text-zinc-500 hover:border-zinc-400',
                        )}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                )}
              />
            </div>

            {/* Footer */}
            <div className="flex gap-2 mt-auto pt-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => onOpenChange(false)}
              >
                İptal
              </Button>
              <Button
                type="submit"
                className="flex-1 bg-zinc-900 text-white hover:bg-zinc-700"
              >
                Kaydet
              </Button>
            </div>
          </form>

          {/* ── Right: Preview ────────────────────────────────────────────── */}
          <div className="w-52 bg-zinc-50 border-l border-zinc-100 flex flex-col items-center gap-4 p-5 shrink-0">
            <div className="w-16 h-16 rounded-2xl bg-white border border-zinc-200 flex items-center justify-center shadow-sm mt-2">
              <Truck className="w-8 h-8 text-zinc-300" strokeWidth={1.5} />
            </div>

            <div className="w-full text-center space-y-3">
              <p className="text-sm font-semibold text-zinc-800 truncate">
                {name?.trim() || 'İsimsiz Araç...'}
              </p>

              <div>
                <span className="inline-block text-[10px] font-bold text-zinc-500 uppercase tracking-wide px-2 py-0.5 bg-zinc-200 rounded-sm">
                  KAPASİTE & BOYUT
                </span>
                <p className="text-[11px] text-zinc-500 mt-1.5">
                  {volumeM3} m³ · {payload || 0} kg
                </p>
              </div>

              {loadingLabel && (
                <div>
                  <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wide mb-1.5">
                    KAPI TİPİ
                  </p>
                  <span className="text-[11px] px-2 py-0.5 rounded bg-zinc-100 text-zinc-600">
                    {loadingLabel}
                  </span>
                </div>
              )}
            </div>
          </div>

        </div>
      </DialogContent>
    </Dialog>
  );
}
