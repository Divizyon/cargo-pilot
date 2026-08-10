import { useEffect } from 'react';
import { useForm, Controller, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { ElementType } from 'react';
import { Car, Loader2, Package2, Truck } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { useCreatePlanVehicle } from '@/lib/api/useVehicles';

// ─── Schema ───────────────────────────────────────────────────────────────────

const vehicleModalSchema = z.object({
  vehicleType: z.enum(['tir', 'kamyon', 'kamposet', 'konteyner']),
  name: z.string().min(1, 'Zorunlu'),
  plateNumber: z.string().min(1, 'Zorunlu'),
  payload: z.number({ error: 'Sayı giriniz' }).positive('Pozitif olmalı'),
  length: z.number({ error: 'Sayı giriniz' }).positive('Pozitif olmalı'),
  width: z.number({ error: 'Sayı giriniz' }).positive('Pozitif olmalı'),
  height: z.number({ error: 'Sayı giriniz' }).positive('Pozitif olmalı'),
  layerCount: z.number({ error: 'Sayı giriniz' }).int().min(1, 'En az 1'),
  loadingArea: z.enum(['arka', 'yan', 'ust']),
});

type VehicleModalValues = z.infer<typeof vehicleModalSchema>;

const EMPTY_DEFAULTS: VehicleModalValues = {
  vehicleType: 'kamyon',
  name: '',
  plateNumber: '',
  payload: 24000,
  length: 1360,
  width: 248,
  height: 270,
  layerCount: 3,
  loadingArea: 'arka',
};

// ─── Vehicle type config ──────────────────────────────────────────────────────

const VEHICLE_TYPES: Array<{
  value: 'tir' | 'kamyon' | 'kamposet' | 'konteyner';
  label: string;
  Icon: ElementType;
}> = [
  { value: 'tir', label: 'Tır', Icon: Truck },
  { value: 'kamyon', label: 'Kamyon', Icon: Truck },
  { value: 'kamposet', label: 'Kamposet', Icon: Car },
  { value: 'konteyner', label: 'Konteyner', Icon: Package2 },
];

// ─── Loading area config ──────────────────────────────────────────────────────

const LOADING_AREAS: Array<{
  value: 'arka' | 'yan' | 'ust';
  label: string;
}> = [
  { value: 'arka', label: 'Yalnızca Arka' },
  { value: 'yan', label: 'Yan Kapı' },
  { value: 'ust', label: 'Üst Kapak' },
];

// ─── AddVehicleModal ──────────────────────────────────────────────────────────

interface AddVehicleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (id: string | null) => void;
}

const FORM_VEHICLE_TYPE_INT: Record<string, number> = {
  tir: 0,
  kamyon: 1,
  kamposet: 2,
  konteyner: 3,
};

// Backend LoadingType: Rear=0, SideRight=1, SideLeft=2, SideBoth=3, Top=4.
// Bu modalde sağ/sol kapı seçimi yok; "yan" seçimi varsayılan olarak SideRight'a eşlenir.
const LOADING_AREA_INT: Record<string, number> = {
  arka: 0,
  yan: 1,
  ust: 4,
};

export function AddVehicleModal({ open, onOpenChange, onCreated }: AddVehicleModalProps) {
  const createVehicle = useCreatePlanVehicle();

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<VehicleModalValues>({
    resolver: zodResolver(vehicleModalSchema),
    defaultValues: EMPTY_DEFAULTS,
  });

  useEffect(() => {
    if (open) reset(EMPTY_DEFAULTS);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const name = useWatch({ control, name: 'name' });
  const payload = useWatch({ control, name: 'payload' });
  const length = useWatch({ control, name: 'length' });
  const width = useWatch({ control, name: 'width' });
  const height = useWatch({ control, name: 'height' });
  const loadingArea = useWatch({ control, name: 'loadingArea' });

  const volumeM3 =
    length && width && height ? ((length * width * height) / 1_000_000).toFixed(1) : '0';

  const loadingLabel = LOADING_AREAS.find((a) => a.value === loadingArea)?.label ?? '';

  async function onSubmit(data: VehicleModalValues) {
    try {
      const newId = await createVehicle.mutateAsync({
        vehicleName: data.name,
        plateNumber: data.plateNumber,
        vehicleType: FORM_VEHICLE_TYPE_INT[data.vehicleType] ?? 1,
        internalWidth: Math.round(data.width),
        internalHeight: Math.round(data.height),
        internalLength: Math.round(data.length),
        maxWeightCapacity: Math.round(data.payload),
        layerCount: data.layerCount,
        loadingType: LOADING_AREA_INT[data.loadingArea] ?? 0,
      });

      onCreated(newId);
      onOpenChange(false);
      toast.success('Araç kaydedildi.', { position: 'bottom-right' });
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { detail?: string; title?: string } } };
      const detail =
        axiosErr?.response?.data?.detail ??
        axiosErr?.response?.data?.title ??
        'Araç kaydedilemedi. Lütfen tekrar deneyin.';
      toast.error(detail, { position: 'bottom-right' });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl p-0 gap-0 overflow-hidden" aria-describedby={undefined}>
        <div className="flex">
          {/* ── Left: Form ───────────────────────────────────────────────── */}
          <form onSubmit={handleSubmit(onSubmit)} className="flex-1 flex flex-col gap-5 p-6">
            <DialogHeader>
              <DialogTitle className="text-base font-semibold text-foreground">
                Yeni Araç Ekle
              </DialogTitle>
            </DialogHeader>

            {/* 1. Araç Tipi */}
            <div className="flex flex-col gap-2.5">
              <span className="text-xs font-medium text-muted-foreground">1. Araç Tipi</span>
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
                            ? 'border-foreground bg-foreground text-background'
                            : 'border-border text-muted-foreground hover:border-border hover:text-foreground',
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
              <span className="text-xs font-medium text-muted-foreground">
                2. Kapasite ve Boyutlar
              </span>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  {...register('name')}
                  placeholder="Araç Modeli (Örn: Volvo FH16)"
                  className={cn('h-9', errors.name && 'border-rose-400')}
                />
                <Input
                  {...register('plateNumber')}
                  placeholder="Plaka (Örn: 34 CP 001)"
                  className={cn('h-9', errors.plateNumber && 'border-rose-400')}
                />
              </div>
              <div className="grid grid-cols-4 gap-2">
                <div className="flex flex-col gap-1">
                  <Label className="text-[10px] text-muted-foreground uppercase tracking-wide">
                    KAPASİTE (KG)
                  </Label>
                  <Input
                    type="number"
                    min="1"
                    step="1"
                    {...register('payload', { valueAsNumber: true })}
                    className={cn('h-8 text-sm', errors.payload && 'border-rose-400')}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <Label className="text-[10px] text-muted-foreground uppercase tracking-wide">
                    KAT SAYISI
                  </Label>
                  <Input
                    type="number"
                    min="1"
                    step="1"
                    {...register('layerCount', { valueAsNumber: true })}
                    className={cn('h-8 text-sm', errors.layerCount && 'border-rose-400')}
                  />
                </div>
                <div className="flex flex-col gap-1 col-span-2">
                  <Label className="text-[10px] text-muted-foreground uppercase tracking-wide">
                    HACİM (M³)
                  </Label>
                  <div className="h-8 px-3 flex items-center rounded-md border border-border bg-muted/40 text-sm text-muted-foreground select-none">
                    {volumeM3}
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { key: 'width' as const, label: 'EN' },
                  { key: 'length' as const, label: 'BOY' },
                  { key: 'height' as const, label: 'YÜKSEKLİK' },
                ].map(({ key, label }) => (
                  <div key={key} className="flex flex-col gap-1">
                    <Label className="text-[10px] text-muted-foreground uppercase tracking-wide">
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
              <span className="text-xs font-medium text-muted-foreground">
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
                            ? 'border-foreground bg-foreground text-background'
                            : 'border-border text-muted-foreground hover:border-border',
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
                disabled={isSubmitting || createVehicle.isPending}
                className="flex-1 bg-foreground text-background hover:bg-foreground/80 disabled:opacity-60"
              >
                {createVehicle.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Kaydet
              </Button>
            </div>
          </form>

          {/* ── Right: Preview ────────────────────────────────────────────── */}
          <div className="w-52 bg-muted/40 border-l border-border flex flex-col items-center gap-4 p-5 shrink-0">
            <div className="w-16 h-16 rounded-2xl bg-background border border-border flex items-center justify-center shadow-sm mt-2">
              <Truck className="w-8 h-8 text-muted-foreground/50" strokeWidth={1.5} />
            </div>

            <div className="w-full text-center space-y-3">
              <p className="text-sm font-semibold text-foreground truncate">
                {name?.trim() || 'İsimsiz Araç...'}
              </p>

              <div>
                <span className="inline-block text-[10px] font-bold text-muted-foreground uppercase tracking-wide px-2 py-0.5 bg-muted rounded-sm">
                  KAPASİTE & BOYUT
                </span>
                <p className="text-[11px] text-muted-foreground mt-1.5">
                  {volumeM3} m³ · {payload || 0} kg
                </p>
              </div>

              {loadingLabel && (
                <div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide mb-1.5">
                    KAPI TİPİ
                  </p>
                  <span className="text-[11px] px-2 py-0.5 rounded bg-muted text-muted-foreground">
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
