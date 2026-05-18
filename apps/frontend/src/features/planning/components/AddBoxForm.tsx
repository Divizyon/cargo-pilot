import { useState, useEffect } from 'react';
import { useForm, Controller, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { usePlanStore } from '@/lib/store/usePlanStore';
import { SCENE } from '@/lib/config/scene-config';
import type { Item } from '@/lib/types/item';
import { ProductPreview3D } from '@/features/data-management/components/ProductPreview3D';

// ─── Schema ───────────────────────────────────────────────────────────────────

const addBoxSchema = z
  .object({
    name: z.string().min(1, 'Zorunlu'),
    sku: z.string().min(1, 'Zorunlu'),
    productType: z.enum(['koli', 'varil', 'palet']),
    width: z.number({ error: 'Sayı giriniz' }).positive('Pozitif olmalı'),
    height: z.number({ error: 'Sayı giriniz' }).positive('Pozitif olmalı'),
    length: z.number({ error: 'Sayı giriniz' }).positive('Pozitif olmalı'),
    weight: z.number({ error: 'Sayı giriniz' }).positive('Pozitif olmalı'),
    quantity: z.number().int().min(1, 'En az 1'),
    isStackable: z.boolean(),
    maxStackCount: z.number().int().min(1).optional(),
    fragility: z.number().int().min(0).max(2),
    allowRotateX: z.boolean(),
    allowRotateY: z.boolean(),
    allowRotateZ: z.boolean(),
    allowFaceBottom: z.boolean(),
    allowFaceTop: z.boolean(),
    allowFaceFront: z.boolean(),
    allowFaceBack: z.boolean(),
    allowFaceLeft: z.boolean(),
    allowFaceRight: z.boolean(),
    color: z.string(),
  })
  .refine((d) => !d.isStackable || (d.maxStackCount !== undefined && d.maxStackCount >= 1), {
    message: 'İstif sayısı zorunlu',
    path: ['maxStackCount'],
  });

export type AddBoxFormValues = z.infer<typeof addBoxSchema>;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const PRODUCT_TYPE_LABELS: Record<string, string> = {
  koli: 'Koli',
  varil: 'Varil',
  palet: 'Palet',
};

const FACE_FIELDS = [
  { key: 'allowFaceBottom' as const, label: 'Alt' },
  { key: 'allowFaceTop' as const, label: 'Üst' },
  { key: 'allowFaceFront' as const, label: 'Ön' },
  { key: 'allowFaceBack' as const, label: 'Arka' },
  { key: 'allowFaceLeft' as const, label: 'Sol' },
  { key: 'allowFaceRight' as const, label: 'Sağ' },
];

const FRAGILITY_LABELS: Record<string, string> = {
  '0': 'Normal',
  '1': 'Kırılgan',
  '2': 'Sıvı İçerik',
};

// ─── ProductTypeShape ─────────────────────────────────────────────────────────

function ProductTypeShape({ type }: { type: string }) {
  const s = 'currentColor';
  if (type === 'varil') {
    return (
      <svg
        width="28"
        height="28"
        viewBox="0 0 60 60"
        fill="none"
        className="shrink-0 text-muted-foreground"
      >
        <ellipse cx="30" cy="10" rx="18" ry="5" stroke={s} strokeWidth="1.5" />
        <line x1="12" y1="10" x2="12" y2="50" stroke={s} strokeWidth="1.5" />
        <line x1="48" y1="10" x2="48" y2="50" stroke={s} strokeWidth="1.5" />
        <path d="M12 50 A18 5 0 0 0 48 50" stroke={s} strokeWidth="1.5" fill="none" />
        <path
          d="M12 50 A18 5 0 0 1 48 50"
          stroke={s}
          strokeWidth="0.8"
          strokeDasharray="2 2"
          fill="none"
        />
        <ellipse cx="30" cy="25" rx="18" ry="5" stroke={s} strokeWidth="1" opacity="0.4" />
        <ellipse cx="30" cy="38" rx="18" ry="5" stroke={s} strokeWidth="1" opacity="0.4" />
      </svg>
    );
  }
  if (type === 'palet') {
    return (
      <svg
        width="28"
        height="28"
        viewBox="0 0 60 60"
        fill="none"
        className="shrink-0 text-muted-foreground"
      >
        <path
          d="M10 10 L30 4 L50 10 L50 30 L30 36 L10 30 Z"
          stroke={s}
          strokeWidth="1.5"
          strokeLinejoin="round"
          fill="none"
        />
        <path d="M10 10 L30 16 L50 10" stroke={s} strokeWidth="1.5" />
        <path d="M30 16 L30 36" stroke={s} strokeWidth="1.5" />
        <path
          d="M4 38 L30 46 L56 38 L56 44 L30 52 L4 44 Z"
          stroke={s}
          strokeWidth="1.5"
          strokeLinejoin="round"
          fill="none"
        />
        <line x1="12" y1="42" x2="12" y2="54" stroke={s} strokeWidth="1.5" />
        <line x1="30" y1="52" x2="30" y2="60" stroke={s} strokeWidth="1.5" />
        <line x1="48" y1="42" x2="48" y2="54" stroke={s} strokeWidth="1.5" />
      </svg>
    );
  }
  return (
    <svg
      width="28"
      height="28"
      viewBox="0 0 60 60"
      fill="none"
      className="shrink-0 text-muted-foreground"
    >
      <path
        d="M10 18 L30 8 L50 18 L50 44 L30 54 L10 44 Z"
        stroke={s}
        strokeWidth="1.5"
        strokeLinejoin="round"
        fill="none"
      />
      <path d="M10 18 L30 28 L50 18" stroke={s} strokeWidth="1.5" />
      <path d="M30 28 L30 54" stroke={s} strokeWidth="1.5" />
    </svg>
  );
}

// ─── AddBoxForm ───────────────────────────────────────────────────────────────

interface EditTarget {
  itemId: string;
  item: Item;
  quantity: number;
}

interface AddBoxFormProps {
  onClose: () => void;
  onSuccess?: () => void;
  editTarget?: EditTarget;
}

export function AddBoxForm({ onClose, onSuccess, editTarget }: AddBoxFormProps) {
  const addManualItem = usePlanStore((s) => s.addManualItem);
  const updateItem = usePlanStore((s) => s.updateItem);
  const skuColorMap = usePlanStore((s) => s.skuColorMap);
  const [showPalette, setShowPalette] = useState(false);

  const palette = SCENE.COLORS.SKU_PALETTE;
  const isEditing = editTarget !== undefined;

  const initialColor = (() => {
    if (isEditing) return skuColorMap[editTarget.item.sku] ?? palette[0];
    const usedColors = new Set(Object.values(skuColorMap));
    return (
      palette.find((c) => !usedColors.has(c)) ??
      palette[Object.keys(skuColorMap).length % palette.length]
    );
  })();

  const editDefaults: Partial<AddBoxFormValues> = isEditing
    ? {
        name: editTarget.item.name,
        sku: editTarget.item.sku,
        productType: editTarget.item.productType,
        width: editTarget.item.width,
        height: editTarget.item.height,
        length: editTarget.item.length,
        weight: editTarget.item.weight,
        quantity: editTarget.quantity,
        isStackable: editTarget.item.isStackable,
        maxStackCount: editTarget.item.isStackable ? editTarget.item.maxStackCount : undefined,
        fragility: editTarget.item.fragility,
        allowRotateX: editTarget.item.allowRotateX,
        allowRotateY: editTarget.item.allowRotateY,
        allowRotateZ: editTarget.item.allowRotateZ,
        allowFaceBottom: editTarget.item.allowFaceBottom,
        allowFaceTop: editTarget.item.allowFaceTop,
        allowFaceFront: editTarget.item.allowFaceFront,
        allowFaceBack: editTarget.item.allowFaceBack,
        allowFaceLeft: editTarget.item.allowFaceLeft,
        allowFaceRight: editTarget.item.allowFaceRight,
        color: initialColor,
      }
    : {};

  const {
    register,
    control,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<AddBoxFormValues>({
    resolver: zodResolver(addBoxSchema),
    defaultValues: {
      productType: 'koli',
      quantity: 1,
      isStackable: false,
      fragility: 0,
      allowRotateX: true,
      allowRotateY: true,
      allowRotateZ: true,
      allowFaceBottom: true,
      allowFaceTop: true,
      allowFaceFront: true,
      allowFaceBack: true,
      allowFaceLeft: true,
      allowFaceRight: true,
      color: initialColor,
      ...editDefaults,
    },
  });

  const watchedColor = useWatch({ control, name: 'color' }) ?? initialColor;
  const watchedStackable = useWatch({ control, name: 'isStackable' });
  const watchedFragility = useWatch({ control, name: 'fragility' });
  const watchedProductType = useWatch({ control, name: 'productType' }) ?? 'koli';
  const watchedWidth = useWatch({ control, name: 'width' });
  const watchedHeight = useWatch({ control, name: 'height' });
  const watchedLength = useWatch({ control, name: 'length' });

  const isVarilType = watchedProductType === 'varil';

  useEffect(() => {
    if (
      isVarilType &&
      watchedWidth !== undefined &&
      Number.isFinite(watchedWidth) &&
      watchedWidth > 0
    ) {
      setValue('length', watchedWidth);
    }
  }, [isVarilType, watchedWidth, setValue]);

  const hasDimensions = isVarilType
    ? Number.isFinite(watchedWidth) &&
      watchedWidth > 0 &&
      Number.isFinite(watchedHeight) &&
      watchedHeight > 0
    : Number.isFinite(watchedWidth) &&
      Number.isFinite(watchedHeight) &&
      Number.isFinite(watchedLength) &&
      watchedWidth > 0 &&
      watchedHeight > 0 &&
      watchedLength > 0;

  function onSubmit(data: AddBoxFormValues) {
    const item: Item = {
      id: isEditing ? editTarget.itemId : crypto.randomUUID(),
      name: data.name,
      sku: data.sku,
      productType: data.productType,
      width: data.width,
      height: data.height,
      length: data.length,
      weight: data.weight,
      isStackable: data.isStackable,
      maxStackCount: data.maxStackCount ?? 1,
      maxWeightOnTop: null,
      fragility: data.fragility as 0 | 1 | 2,
      allowRotateX: data.allowRotateX,
      allowRotateY: data.allowRotateY,
      allowRotateZ: data.allowRotateZ,
      allowFaceBottom: data.allowFaceBottom,
      allowFaceTop: data.allowFaceTop,
      allowFaceFront: data.allowFaceFront,
      allowFaceBack: data.allowFaceBack,
      allowFaceLeft: data.allowFaceLeft,
      allowFaceRight: data.allowFaceRight,
    };

    if (isEditing) {
      updateItem(editTarget.itemId, item, data.quantity, data.color);
    } else {
      addManualItem(item, data.quantity, data.color);
    }

    onSuccess?.();
    onClose();
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="px-3 py-3 border-b border-border flex flex-col gap-2 bg-muted/40 shrink-0"
    >
      {/* Ürün Adı */}
      <div className="flex flex-col gap-1">
        <Label className="text-xs text-muted-foreground">Ürün Adı</Label>
        <Input
          {...register('name')}
          placeholder="ör. Elektronik Aksam"
          className={cn('h-7 text-sm', errors.name && 'border-rose-400')}
        />
      </div>

      {/* SKU + Color */}
      <div className="grid grid-cols-[1fr_auto] gap-2 items-end">
        <div className="flex flex-col gap-1">
          <Label className="text-xs text-muted-foreground">SKU</Label>
          <Controller
            name="sku"
            control={control}
            render={({ field }) => (
              <Input
                {...field}
                placeholder="SKU-001"
                className={cn('h-7 text-sm', errors.sku && 'border-rose-400')}
                onChange={(e) => {
                  field.onChange(e);
                  const existing = skuColorMap[e.target.value];
                  if (existing) setValue('color', existing);
                }}
              />
            )}
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label className="text-xs text-muted-foreground">Renk</Label>
          <button
            type="button"
            title="Renk seç"
            onClick={() => setShowPalette((v) => !v)}
            className="w-7 h-7 rounded-full border-2 border-white shadow-sm ring-1 ring-border hover:ring-border transition-all"
            style={{ backgroundColor: watchedColor }}
          />
        </div>
      </div>

      {/* Color Palette */}
      {showPalette && (
        <div className="flex flex-wrap gap-1.5 p-2 bg-background border border-border rounded-lg">
          {palette.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => {
                setValue('color', c);
                setShowPalette(false);
              }}
              className={cn(
                'w-5 h-5 rounded-full border-2 transition-transform hover:scale-110',
                watchedColor === c ? 'border-foreground scale-110' : 'border-transparent',
              )}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
      )}

      {/* 3D Önizleme */}
      <div className="relative aspect-square overflow-hidden rounded-xl border border-border bg-muted/40">
        {hasDimensions ? (
          <ProductPreview3D
            widthCm={watchedWidth}
            heightCm={watchedHeight}
            depthCm={watchedLength}
            productType={watchedProductType}
            color={watchedColor}
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-muted-foreground">
            <ProductTypeShape type={watchedProductType} />
            <span className="text-xs">Boyutları girin</span>
          </div>
        )}
      </div>

      {/* Ürün Tipi */}
      <div className="flex flex-col gap-1">
        <Label className="text-xs text-muted-foreground">Ürün Tipi</Label>
        <Controller
          name="productType"
          control={control}
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger className="h-7 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(PRODUCT_TYPE_LABELS).map(([val, label]) => (
                  <SelectItem key={val} value={val}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </div>

      {/* Boyutlar */}
      <div className={cn('grid gap-1.5', isVarilType ? 'grid-cols-2' : 'grid-cols-3')}>
        {isVarilType ? (
          <>
            <div className="flex flex-col gap-1">
              <Label className="text-xs text-muted-foreground">Çap (cm)</Label>
              <Input
                type="number"
                min="1"
                step="1"
                placeholder="80"
                {...register('width', { valueAsNumber: true })}
                className={cn('h-7 text-sm', errors.width && 'border-rose-400')}
              />
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-xs text-muted-foreground">Yükseklik (cm)</Label>
              <Input
                type="number"
                min="1"
                step="1"
                placeholder="120"
                {...register('height', { valueAsNumber: true })}
                className={cn('h-7 text-sm', errors.height && 'border-rose-400')}
              />
            </div>
          </>
        ) : (
          <>
            <div className="flex flex-col gap-1">
              <Label className="text-xs text-muted-foreground">Genişlik — X (cm)</Label>
              <Input
                type="number"
                min="1"
                step="1"
                placeholder="80"
                {...register('width', { valueAsNumber: true })}
                className={cn('h-7 text-sm', errors.width && 'border-rose-400')}
              />
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-xs text-muted-foreground">Yükseklik — Y (cm)</Label>
              <Input
                type="number"
                min="1"
                step="1"
                placeholder="40"
                {...register('height', { valueAsNumber: true })}
                className={cn('h-7 text-sm', errors.height && 'border-rose-400')}
              />
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-xs text-muted-foreground">Derinlik — Z (cm)</Label>
              <Input
                type="number"
                min="1"
                step="1"
                placeholder="60"
                {...register('length', { valueAsNumber: true })}
                className={cn('h-7 text-sm', errors.length && 'border-rose-400')}
              />
            </div>
          </>
        )}
      </div>

      {/* Ağırlık + Adet */}
      <div className="grid grid-cols-2 gap-2">
        <div className="flex flex-col gap-1">
          <Label className="text-xs text-muted-foreground">Ağırlık (kg)</Label>
          <Input
            type="number"
            min="0.1"
            step="0.1"
            placeholder="10"
            {...register('weight', { valueAsNumber: true })}
            className={cn('h-7 text-sm', errors.weight && 'border-rose-400')}
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label className="text-xs text-muted-foreground">Adet</Label>
          <Input
            type="number"
            min="1"
            step="1"
            placeholder="1"
            {...register('quantity', { valueAsNumber: true })}
            className={cn('h-7 text-sm', errors.quantity && 'border-rose-400')}
          />
        </div>
      </div>

      {/* Hassasiyet */}
      <div className="flex flex-col gap-1">
        <Label className="text-xs text-muted-foreground">Hassasiyet</Label>
        <Controller
          name="fragility"
          control={control}
          render={({ field }) => (
            <Select
              value={String(field.value)}
              onValueChange={(v) => {
                const n = Number(v);
                field.onChange(n);
                if (n >= 1) setValue('allowRotateZ', false);
              }}
            >
              <SelectTrigger className="h-7 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(FRAGILITY_LABELS).map(([val, label]) => (
                  <SelectItem key={val} value={val}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </div>

      {/* İstiflenebilir */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <Label className="text-xs text-muted-foreground">İstiflenebilir</Label>
          <Controller
            name="isStackable"
            control={control}
            render={({ field }) => (
              <Switch checked={field.value} onCheckedChange={field.onChange} className="scale-75" />
            )}
          />
        </div>
        {watchedStackable && (
          <div className="flex flex-col gap-1">
            <Label className="text-xs text-muted-foreground">Max İstif Sayısı</Label>
            <Input
              type="number"
              min="1"
              step="1"
              placeholder="3"
              {...register('maxStackCount', { valueAsNumber: true })}
              className={cn('h-7 text-sm', errors.maxStackCount && 'border-rose-400')}
            />
          </div>
        )}
      </div>

      {/* Rotasyon */}
      <div className="flex flex-col gap-1">
        <Label className="text-xs text-muted-foreground">Rotasyon</Label>
        <div className="flex items-center gap-2">
          {(['X', 'Y', 'Z'] as const).map((axis) => {
            const key = `allowRotate${axis}` as const;
            const disabled = axis === 'Z' && watchedFragility >= 1;
            return (
              <Controller
                key={axis}
                name={key}
                control={control}
                render={({ field }) => (
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => !disabled && field.onChange(!field.value)}
                    className={cn(
                      'flex-1 h-6 rounded text-xs font-medium transition-colors border',
                      field.value && !disabled
                        ? 'bg-foreground text-background border-foreground'
                        : 'bg-background text-muted-foreground border-border',
                      disabled && 'opacity-40 cursor-not-allowed',
                    )}
                  >
                    {axis}
                  </button>
                )}
              />
            );
          })}
        </div>
      </div>

      {/* Yüzey Kısıtları */}
      <div className="flex flex-col gap-1">
        <Label className="text-xs text-muted-foreground">Desteklenebilir Yüzey</Label>
        <div className="grid grid-cols-3 gap-1">
          {FACE_FIELDS.map(({ key, label }) => (
            <Controller
              key={key}
              name={key}
              control={control}
              render={({ field }) => (
                <button
                  type="button"
                  onClick={() => field.onChange(!field.value)}
                  className={cn(
                    'h-6 rounded text-xs font-medium transition-colors border',
                    field.value
                      ? 'bg-foreground text-background border-foreground'
                      : 'bg-background text-muted-foreground border-border',
                  )}
                >
                  {label}
                </button>
              )}
            />
          ))}
        </div>
      </div>

      {/* Buttons */}
      <div className="flex gap-2 pt-1">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="flex-1 h-7 text-xs"
          onClick={onClose}
        >
          İptal
        </Button>
        <Button
          type="submit"
          size="sm"
          className="flex-1 h-7 text-xs bg-foreground text-background hover:bg-foreground/80"
        >
          {isEditing ? 'Güncelle' : 'Kaydet'}
        </Button>
      </div>
    </form>
  );
}
