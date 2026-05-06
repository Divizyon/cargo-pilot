import { useEffect, useRef } from 'react';
import { useForm, Controller, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { ElementType } from 'react';
import { AlertTriangle, Archive, Box, Layers, Loader2, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { usePlanStore } from '@/lib/store/usePlanStore';
import { SCENE } from '@/lib/config/scene-config';
import type { Item } from '@/lib/types/item';
import { useCreatePlanItem } from '@/lib/api/useItems';
import { toCategory, toMaxWeightOnTop, ALLOWED_ROTATIONS } from '@/lib/api/itemMappers';
import { ProductPreview3D } from '@/features/data-management/components/ProductPreview3D';

// ─── Schema ───────────────────────────────────────────────────────────────────

const itemModalSchema = z.object({
  productType: z.enum(['koli', 'varil', 'palet']),
  name: z.string().min(1, 'Zorunlu'),
  width: z.number({ error: 'Sayı giriniz' }).positive('Pozitif olmalı'),
  length: z.number({ error: 'Sayı giriniz' }).positive('Pozitif olmalı'),
  height: z.number({ error: 'Sayı giriniz' }).positive('Pozitif olmalı'),
  weight: z.number({ error: 'Sayı giriniz' }).positive('Pozitif olmalı'),
  quantity: z.number().int().min(1, 'En az 1'),
  isFragile: z.boolean(),
  isNotStackable: z.boolean(),
  isNotRotatable: z.boolean(),
});

type ItemModalValues = z.infer<typeof itemModalSchema>;

const EMPTY_DEFAULTS: ItemModalValues = {
  productType: 'koli',
  name: '',
  width: 0,
  length: 0,
  height: 0,
  weight: 0,
  quantity: 1,
  isFragile: false,
  isNotStackable: false,
  isNotRotatable: false,
};

// ─── Type selector config ─────────────────────────────────────────────────────

const PRODUCT_TYPES: Array<{
  value: 'koli' | 'varil' | 'palet';
  label: string;
  Icon: ElementType;
}> = [
  { value: 'koli', label: 'Küp', Icon: Box },
  { value: 'varil', label: 'Varil', Icon: Archive },
  { value: 'palet', label: 'Panel', Icon: Layers },
];

// ─── Constraint config ────────────────────────────────────────────────────────

const CONSTRAINTS: Array<{
  name: 'isFragile' | 'isNotStackable' | 'isNotRotatable';
  label: string;
  Icon: ElementType;
}> = [
  { name: 'isFragile', label: 'Kırılabilir', Icon: AlertTriangle },
  { name: 'isNotStackable', label: 'İstiflenemez', Icon: Layers },
  { name: 'isNotRotatable', label: 'Döndürülemez', Icon: RotateCcw },
];

// ─── AddItemModal ─────────────────────────────────────────────────────────────

interface EditTarget {
  itemId: string;
  item: Item;
  quantity: number;
}

interface AddItemModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editTarget?: EditTarget;
  onSuccess?: () => void;
}

export function AddItemModal({ open, onOpenChange, editTarget, onSuccess }: AddItemModalProps) {
  const createPlanItem = useCreatePlanItem();
  const addManualItem = usePlanStore((s) => s.addManualItem);
  const updateItem = usePlanStore((s) => s.updateItem);
  const skuColorMap = usePlanStore((s) => s.skuColorMap);
  const selectedVehicle = usePlanStore((s) => s.selectedVehicle);
  const setPreview = usePlanStore((s) => s.setPreview);
  const clearPreview = usePlanStore((s) => s.clearPreview);

  const isEditing = editTarget !== undefined;
  const palette = SCENE.COLORS.SKU_PALETTE;

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ItemModalValues>({
    resolver: zodResolver(itemModalSchema),
    defaultValues: EMPTY_DEFAULTS,
  });

  useEffect(() => {
    if (!open) return;
    if (isEditing) {
      reset({
        productType: editTarget.item.productType,
        name: editTarget.item.name,
        width: editTarget.item.width,
        length: editTarget.item.length,
        height: editTarget.item.height,
        weight: editTarget.item.weight,
        quantity: editTarget.quantity,
        isFragile: editTarget.item.fragility >= 1,
        isNotStackable: !editTarget.item.isStackable,
        isNotRotatable: !editTarget.item.allowRotateY,
      });
    } else {
      reset(EMPTY_DEFAULTS);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const previewTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const previewIdRef = useRef<string>('');

  const name = useWatch({ control, name: 'name' });
  const productType = useWatch({ control, name: 'productType' });
  const width = useWatch({ control, name: 'width' });
  const height = useWatch({ control, name: 'height' });
  const length = useWatch({ control, name: 'length' });
  const weight = useWatch({ control, name: 'weight' });
  const quantity = useWatch({ control, name: 'quantity' });
  const isFragile = useWatch({ control, name: 'isFragile' });
  const isNotStack = useWatch({ control, name: 'isNotStackable' });
  const isNotRotate = useWatch({ control, name: 'isNotRotatable' });

  const activeConstraints: string[] = [];
  if (isFragile) activeConstraints.push('Kırılgan');
  if (isNotStack) activeConstraints.push('İstiflenmez');
  if (isNotRotate) activeConstraints.push('Döndürülemez');

  const previewColor = isEditing
    ? (skuColorMap[editTarget!.item.sku] ?? SCENE.COLORS.NORMAL_STR)
    : (() => {
        const usedColors = new Set(Object.values(skuColorMap));
        return (
          palette.find((c) => !usedColors.has(c)) ??
          palette[Object.keys(skuColorMap).length % palette.length]
        );
      })();

  const exceedsVehicle = Boolean(
    selectedVehicle &&
    ((width && width > selectedVehicle.width) ||
      (height && height > selectedVehicle.height) ||
      (length && length > selectedVehicle.length)),
  );

  useEffect(() => {
    if (!open || !selectedVehicle) return;
    if (!width || !height || !length || !weight || !quantity) return;
    if (width <= 0 || height <= 0 || length <= 0 || weight <= 0 || quantity < 1) return;

    if (!previewIdRef.current) previewIdRef.current = crypto.randomUUID();
    const itemId = isEditing ? editTarget!.itemId : previewIdRef.current;
    const sku = isEditing ? editTarget!.item.sku : `PREVIEW-${itemId}`;
    const color = skuColorMap[sku] ?? SCENE.COLORS.NORMAL_STR;

    if (previewTimerRef.current) clearTimeout(previewTimerRef.current);
    previewTimerRef.current = setTimeout(() => {
      setPreview(
        itemId,
        {
          id: itemId,
          name: name ?? '',
          sku,
          productType: isEditing ? editTarget!.item.productType : 'koli',
          width,
          height,
          length,
          weight,
          isStackable: !isNotStack,
          maxStackCount: isNotStack ? 1 : 3,
          maxWeightOnTop: null,
          fragility: isFragile ? 1 : 0,
          allowRotateX: !isNotRotate,
          allowRotateY: !isNotRotate,
          allowRotateZ: !isNotRotate,
          allowFaceBottom: true,
          allowFaceTop: !isNotRotate,
          allowFaceFront: !isNotRotate,
          allowFaceBack: !isNotRotate,
          allowFaceLeft: !isNotRotate,
          allowFaceRight: !isNotRotate,
        },
        quantity,
        color,
      );
    }, 350);

    return () => {
      if (previewTimerRef.current) clearTimeout(previewTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, width, height, length, weight, quantity, isFragile, isNotStack, isNotRotate]);

  useEffect(() => {
    if (!open) {
      clearPreview();
      previewIdRef.current = '';
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function onSubmit(data: ItemModalValues) {
    const sku = isEditing ? editTarget.item.sku : `ITEM-${crypto.randomUUID().slice(0, 8)}`;
    const color = isEditing
      ? (skuColorMap[sku] ?? SCENE.COLORS.NORMAL_STR)
      : (() => {
          const usedColors = new Set(Object.values(skuColorMap));
          return (
            palette.find((c) => !usedColors.has(c)) ??
            palette[Object.keys(skuColorMap).length % palette.length]
          );
        })();

    const isStackable = !data.isNotStackable;
    const maxStackCount = isStackable ? 3 : 0;

    if (isEditing) {
      const item: Item = {
        id: editTarget.itemId,
        name: data.name,
        sku,
        productType: data.productType,
        width: data.width,
        height: data.height,
        length: data.length,
        weight: data.weight,
        isStackable,
        maxStackCount: isStackable ? 3 : 1,
        maxWeightOnTop: null,
        fragility: data.isFragile ? 1 : 0,
        allowRotateX: !data.isNotRotatable,
        allowRotateY: !data.isNotRotatable,
        allowRotateZ: !data.isNotRotatable,
        allowFaceBottom: true,
        allowFaceTop: !data.isNotRotatable,
        allowFaceFront: !data.isNotRotatable,
        allowFaceBack: !data.isNotRotatable,
        allowFaceLeft: !data.isNotRotatable,
        allowFaceRight: !data.isNotRotatable,
      };
      updateItem(editTarget.itemId, item, data.quantity, color);
    } else {
      try {
        const newId = await createPlanItem.mutateAsync({
          sku,
          name: data.name,
          productType: data.productType,
          category: toCategory(data.productType),
          width: data.width,
          height: data.height,
          length: data.length,
          weight: data.weight,
          fragilityType: data.isFragile ? 1 : 0,
          isStackable,
          maxStackCount,
          maxWeightOnTop: toMaxWeightOnTop(data.weight, isStackable, maxStackCount),
          allowedRotations: data.isNotRotatable ? ALLOWED_ROTATIONS.Fixed : ALLOWED_ROTATIONS.All,
        });

        const item: Item = {
          id: newId ?? crypto.randomUUID(),
          name: data.name,
          sku,
          productType: data.productType,
          width: data.width,
          height: data.height,
          length: data.length,
          weight: data.weight,
          isStackable,
          maxStackCount: isStackable ? 3 : 1,
          maxWeightOnTop: null,
          fragility: data.isFragile ? 1 : 0,
          allowRotateX: !data.isNotRotatable,
          allowRotateY: !data.isNotRotatable,
          allowRotateZ: !data.isNotRotatable,
          allowFaceBottom: true,
          allowFaceTop: !data.isNotRotatable,
          allowFaceFront: !data.isNotRotatable,
          allowFaceBack: !data.isNotRotatable,
          allowFaceLeft: !data.isNotRotatable,
          allowFaceRight: !data.isNotRotatable,
        };
        addManualItem(item, data.quantity, color);
        toast.success('Ürün eklendi.', { position: 'bottom-right' });
      } catch (err: unknown) {
        const axiosErr = err as { response?: { data?: { detail?: string; title?: string } } };
        const detail =
          axiosErr?.response?.data?.detail ??
          axiosErr?.response?.data?.title ??
          'Ürün kaydedilemedi. Lütfen tekrar deneyin.';
        toast.error(detail, { position: 'bottom-right' });
        return;
      }
    }

    onSuccess?.();
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl p-0 gap-0 overflow-hidden" aria-describedby={undefined}>
        <div className="flex">
          {/* ── Left: Form ───────────────────────────────────────────────── */}
          <form onSubmit={handleSubmit(onSubmit)} className="flex-1 flex flex-col gap-5 p-6">
            <DialogHeader>
              <DialogTitle className="text-base font-semibold text-zinc-900">
                {isEditing ? 'Ürün Düzenle' : 'Yeni Ürün Ekle'}
              </DialogTitle>
            </DialogHeader>

            {/* 1. Ürün Şekli / Tipi */}
            <div className="flex flex-col gap-2.5">
              <span className="text-xs font-medium text-zinc-500">1. Ürün Şekli / Tipi</span>
              <Controller
                name="productType"
                control={control}
                render={({ field }) => (
                  <div className="flex gap-2">
                    {PRODUCT_TYPES.map(({ value, label, Icon }) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => field.onChange(value)}
                        className={cn(
                          'flex flex-col items-center gap-1.5 px-4 py-3 rounded-xl border-2 text-xs font-medium transition-colors flex-1',
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

            {/* 2. Fiziksel Boyutlar */}
            <div className="flex flex-col gap-3">
              <span className="text-xs font-medium text-zinc-500">2. Fiziksel Boyutlar</span>
              <Input
                {...register('name')}
                placeholder="Ürün Adı (Örn: Demir Palet)"
                className={cn('h-9', errors.name && 'border-rose-400')}
              />
              <div className="grid grid-cols-4 gap-2">
                {[
                  { key: 'width' as const, label: 'EN' },
                  { key: 'length' as const, label: 'BOY' },
                  { key: 'height' as const, label: 'YÜKSEKLİK' },
                  { key: 'weight' as const, label: 'AĞIRLIK (KG)' },
                ].map(({ key, label }) => (
                  <div key={key} className="flex flex-col gap-1">
                    <Label className="text-[10px] text-zinc-400 uppercase tracking-wide">
                      {label}
                    </Label>
                    <Input
                      type="number"
                      min="0.1"
                      step="0.1"
                      placeholder="0"
                      {...register(key, { valueAsNumber: true })}
                      className={cn('h-8 text-sm', errors[key] && 'border-rose-400')}
                    />
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-xs text-zinc-500 shrink-0">Adet</Label>
                <Input
                  type="number"
                  min="1"
                  step="1"
                  placeholder="1"
                  {...register('quantity', { valueAsNumber: true })}
                  className={cn('h-8 text-sm w-24', errors.quantity && 'border-rose-400')}
                />
              </div>
              {exceedsVehicle && (
                <p className="flex items-center gap-1.5 text-xs text-destructive">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  {[
                    selectedVehicle &&
                      width &&
                      width > selectedVehicle.width &&
                      `en (${width} cm > ${selectedVehicle.width} cm)`,
                    selectedVehicle &&
                      length &&
                      length > selectedVehicle.length &&
                      `boy (${length} cm > ${selectedVehicle.length} cm)`,
                    selectedVehicle &&
                      height &&
                      height > selectedVehicle.height &&
                      `yükseklik (${height} cm > ${selectedVehicle.height} cm)`,
                  ]
                    .filter(Boolean)
                    .join(', ')}{' '}
                  aracı aşıyor — eklenemez.
                </p>
              )}
            </div>

            {/* 3. Lojistik Kısıtlar */}
            <div className="flex flex-col gap-2.5">
              <span className="text-xs font-medium text-zinc-500">3. Lojistik Kısıtlar</span>
              <div className="flex gap-2 flex-wrap">
                {CONSTRAINTS.map(({ name: fieldName, label, Icon }) => (
                  <Controller
                    key={fieldName}
                    name={fieldName}
                    control={control}
                    render={({ field }) => (
                      <button
                        type="button"
                        onClick={() => field.onChange(!field.value)}
                        className={cn(
                          'flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-medium transition-colors',
                          field.value
                            ? 'border-zinc-900 bg-zinc-900 text-white'
                            : 'border-zinc-200 text-zinc-500 hover:border-zinc-400',
                        )}
                      >
                        <Icon className="w-3.5 h-3.5" strokeWidth={2} />
                        {label}
                      </button>
                    )}
                  />
                ))}
              </div>
            </div>

            {/* Footer */}
            {Object.keys(errors).length > 0 && (
              <p className="text-xs text-rose-500 -mt-2">Tüm zorunlu alanları doğru doldurun.</p>
            )}
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
                disabled={createPlanItem.isPending || exceedsVehicle}
                className="flex-1 bg-zinc-900 text-white hover:bg-zinc-700 disabled:opacity-60"
              >
                {createPlanItem.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : null}
                {isEditing ? 'Güncelle' : 'Kaydet'}
              </Button>
            </div>
          </form>

          {/* ── Right: Preview ────────────────────────────────────────────── */}
          <div className="w-52 bg-zinc-50 border-l border-zinc-100 flex flex-col items-center gap-4 p-5 shrink-0">
            <div className="w-full aspect-square overflow-hidden rounded-xl border border-zinc-200 bg-zinc-50">
              <ProductPreview3D
                widthCm={width || 1}
                heightCm={height || 1}
                depthCm={length || 1}
                productType={productType ?? 'koli'}
                color={previewColor}
              />
            </div>

            <div className="w-full text-center space-y-3">
              <p className="text-sm font-semibold text-zinc-800 truncate">
                {name?.trim() || 'İsimsiz Ürün...'}
              </p>

              <div>
                <span className="inline-block text-[10px] font-bold text-zinc-500 uppercase tracking-wide px-2 py-0.5 bg-zinc-200 rounded-sm">
                  BOYUT & İSTİAP
                </span>
                <p className="text-[11px] text-zinc-500 mt-1.5">
                  {width || 0}×{length || 0}×{height || 0} cm · {weight || 0} kg
                </p>
              </div>

              <div>
                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wide mb-1.5">
                  AKTİF KISITLAR
                </p>
                {activeConstraints.length > 0 ? (
                  <div className="flex flex-wrap gap-1 justify-center">
                    {activeConstraints.map((c) => (
                      <span
                        key={c}
                        className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-200 text-zinc-600"
                      >
                        {c}
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="text-[11px] px-2 py-0.5 rounded bg-zinc-100 text-zinc-400">
                    Standart Taşıma
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
