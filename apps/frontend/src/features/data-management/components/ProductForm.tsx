import type { ReactNode } from 'react';
import { Controller, useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import {
  Ban,
  Box,
  Cylinder,
  Droplets,
  FlaskConical,
  HelpCircle,
  Package,
  Sun,
  Utensils,
  Wind,
  Wine,
  Flame,
} from 'lucide-react';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useProductForm } from '@/features/data-management/hooks/useProductForm';
import {
  DIMENSION_UNITS,
  FRAGILITY_LEVELS,
  LOAD_CATEGORIES,
  NOTES_MAX_LENGTH,
  WEIGHT_UNITS,
  toCentimeters,
  type DimensionUnitKey,
  type LoadCategory,
  type ProductFormValues,
} from '@/features/data-management/schemas/productSchema';

const DEFAULT_INCOMPATIBLE: Record<LoadCategory, LoadCategory[]> = {
  Gıda: ['Kimya', 'Tehlikeli Madde'],
  Kimya: ['Gıda', 'Tehlikeli Madde'],
  Genel: ['Tehlikeli Madde'],
  'Tehlikeli Madde': ['Gıda', 'Kimya', 'Genel'],
};
import { cn } from '@/lib/utils';

interface ProductFormProps {
  defaultValues?: Partial<ProductFormValues>;
  onSubmit: (values: ProductFormValues) => void;
  onCancel?: () => void;
  isSubmitting?: boolean;
  disableSubmitWhenPristine?: boolean;
}

const DIMENSION_KEYS = Object.keys(DIMENSION_UNITS) as Array<keyof typeof DIMENSION_UNITS>;
const WEIGHT_KEYS = Object.keys(WEIGHT_UNITS) as Array<keyof typeof WEIGHT_UNITS>;

const PRODUCT_TYPE_OPTIONS = [
  { value: 'koli', labelKey: 'forms.product.typeBox', Icon: Box },
  { value: 'varil', labelKey: 'forms.product.typeBarrel', Icon: Cylinder },
  { value: 'palet', labelKey: 'forms.product.typePallet', Icon: Package },
] as const;

type AxisKey = 'x' | 'y' | 'z';

const ROTATION_AXES = [
  {
    name: 'allowRotateX',
    labelKey: 'forms.product.allowRotateX',
    tooltipKey: 'forms.product.axisXTooltip',
    axis: 'x' as AxisKey,
  },
  {
    name: 'allowRotateY',
    labelKey: 'forms.product.allowRotateY',
    tooltipKey: 'forms.product.axisYTooltip',
    axis: 'y' as AxisKey,
  },
  {
    name: 'allowRotateZ',
    labelKey: 'forms.product.allowRotateZ',
    tooltipKey: 'forms.product.axisZTooltip',
    axis: 'z' as AxisKey,
  },
] as const;

const FRAGILITY_OPTIONS = [
  {
    value: FRAGILITY_LEVELS.NonFragile,
    labelKey: 'forms.product.fragilityNonFragile',
    Icon: Ban,
    iconClass: 'text-zinc-400',
  },
  {
    value: FRAGILITY_LEVELS.Fragile,
    labelKey: 'forms.product.fragilityFragile',
    Icon: Wine,
    iconClass: 'text-amber-500',
  },
  {
    value: FRAGILITY_LEVELS.Liquid,
    labelKey: 'forms.product.fragilityLiquid',
    Icon: Droplets,
    iconClass: 'text-blue-500',
  },
  {
    value: FRAGILITY_LEVELS.Corrosive,
    labelKey: 'forms.product.fragilityCorrosive',
    Icon: Flame,
    iconClass: 'text-orange-500',
  },
  {
    value: FRAGILITY_LEVELS.OdorSensitive,
    labelKey: 'forms.product.fragilityOdorSensitive',
    Icon: Wind,
    iconClass: 'text-teal-500',
  },
  {
    value: FRAGILITY_LEVELS.FoodContact,
    labelKey: 'forms.product.fragilityFoodContact',
    Icon: Utensils,
    iconClass: 'text-green-500',
  },
  {
    value: FRAGILITY_LEVELS.Dry,
    labelKey: 'forms.product.fragilityDry',
    Icon: Sun,
    iconClass: 'text-yellow-500',
  },
  {
    value: FRAGILITY_LEVELS.Chemical,
    labelKey: 'forms.product.fragilityChemical',
    Icon: FlaskConical,
    iconClass: 'text-purple-500',
  },
] as const;

const COMPACT_INPUT = 'h-9 border-zinc-200 bg-zinc-50';
const COMPACT_INPUT_WITH_UNIT = 'h-9 border-zinc-200 bg-zinc-50 pr-16';
const UNIT_TRIGGER =
  'absolute right-1 top-1/2 h-7 w-14 -translate-y-1/2 gap-1 border-0 bg-transparent px-2 py-0 text-xs text-muted-foreground shadow-none focus:ring-0 focus:ring-offset-0';

interface ProductTypeIllustrationProps {
  type: 'koli' | 'varil' | 'palet';
}

function ProductTypeIllustration({ type }: ProductTypeIllustrationProps) {
  const stroke = 'currentColor';

  if (type === 'varil') {
    return (
      <svg width="120" height="120" viewBox="0 0 120 120" fill="none">
        <ellipse cx="60" cy="22" rx="36" ry="10" stroke={stroke} strokeWidth="1.5" />
        <path d="M24 22 L24 98" stroke={stroke} strokeWidth="1.5" />
        <path d="M96 22 L96 98" stroke={stroke} strokeWidth="1.5" />
        <path d="M24 98 A36 10 0 0 0 96 98" stroke={stroke} strokeWidth="1.5" fill="none" />
        <path
          d="M24 98 A36 10 0 0 1 96 98"
          stroke={stroke}
          strokeWidth="0.8"
          strokeDasharray="2 2"
          fill="none"
        />
        <ellipse cx="60" cy="50" rx="36" ry="10" stroke={stroke} strokeWidth="1" opacity="0.5" />
        <ellipse cx="60" cy="74" rx="36" ry="10" stroke={stroke} strokeWidth="1" opacity="0.5" />
      </svg>
    );
  }

  if (type === 'palet') {
    return (
      <svg width="140" height="120" viewBox="0 0 140 120" fill="none">
        <path
          d="M30 20 L70 8 L110 20 L110 60 L70 72 L30 60 Z"
          stroke={stroke}
          strokeWidth="1.5"
          strokeLinejoin="round"
          fill="none"
        />
        <path d="M30 20 L70 32 L110 20" stroke={stroke} strokeWidth="1.5" />
        <path d="M70 32 L70 72" stroke={stroke} strokeWidth="1.5" />
        <path
          d="M14 76 L70 92 L126 76 L126 84 L70 100 L14 84 Z"
          stroke={stroke}
          strokeWidth="1.5"
          strokeLinejoin="round"
          fill="none"
        />
        <path d="M22 86 L22 102 L50 110 L50 94" stroke={stroke} strokeWidth="1.5" fill="none" />
        <path d="M70 100 L70 116" stroke={stroke} strokeWidth="1.5" />
        <path d="M118 86 L118 102 L90 110 L90 94" stroke={stroke} strokeWidth="1.5" fill="none" />
      </svg>
    );
  }

  return (
    <svg width="120" height="120" viewBox="0 0 120 120" fill="none">
      <path
        d="M24 38 L60 20 L96 38 L96 86 L60 104 L24 86 Z"
        stroke={stroke}
        strokeWidth="1.5"
        strokeLinejoin="round"
        fill="none"
      />
      <path d="M24 38 L60 56 L96 38" stroke={stroke} strokeWidth="1.5" />
      <path d="M60 56 L60 104" stroke={stroke} strokeWidth="1.5" />
    </svg>
  );
}

interface AxisBoxIllustrationProps {
  axis: AxisKey;
  active: boolean;
}

function AxisBoxIllustration({ axis, active }: AxisBoxIllustrationProps) {
  const stroke = 'currentColor';
  const arrowColor = active ? 'hsl(var(--primary))' : 'currentColor';

  return (
    <div className="relative">
      <svg
        width="32"
        height="28"
        viewBox="0 0 72 64"
        fill="none"
        className={cn('transition-opacity', active ? 'opacity-100' : 'opacity-40')}
      >
        <path
          d="M14 22 L36 12 L58 22 L58 46 L36 56 L14 46 Z"
          stroke={stroke}
          strokeWidth="1.5"
          strokeLinejoin="round"
          fill="none"
        />
        <path d="M14 22 L36 32 L58 22" stroke={stroke} strokeWidth="1.5" strokeLinejoin="round" />
        <path d="M36 32 L36 56" stroke={stroke} strokeWidth="1.5" />
        {axis === 'x' && (
          <>
            <path d="M2 34 L70 34" stroke={arrowColor} strokeWidth="1.5" strokeLinecap="round" />
            <path d="M66 30 L70 34 L66 38" stroke={arrowColor} strokeWidth="1.5" fill="none" />
            <path d="M6 30 L2 34 L6 38" stroke={arrowColor} strokeWidth="1.5" fill="none" />
          </>
        )}
        {axis === 'y' && (
          <>
            <path d="M36 2 L36 62" stroke={arrowColor} strokeWidth="1.5" strokeLinecap="round" />
            <path d="M32 6 L36 2 L40 6" stroke={arrowColor} strokeWidth="1.5" fill="none" />
            <path d="M32 58 L36 62 L40 58" stroke={arrowColor} strokeWidth="1.5" fill="none" />
          </>
        )}
        {axis === 'z' && (
          <>
            <path d="M8 56 L64 8" stroke={arrowColor} strokeWidth="1.5" strokeLinecap="round" />
            <path d="M58 8 L64 8 L64 14" stroke={arrowColor} strokeWidth="1.5" fill="none" />
            <path d="M14 50 L8 56 L8 50" stroke={arrowColor} strokeWidth="1.5" fill="none" />
          </>
        )}
      </svg>
      {!active && (
        <Ban className="absolute inset-0 m-auto h-5 w-5 text-red-500" strokeWidth={2} aria-hidden />
      )}
    </div>
  );
}

function formatVolume(cm3: number): string {
  if (cm3 >= 1_000_000) return `${(cm3 / 1_000_000).toFixed(2)} m³`;
  if (cm3 >= 1_000) return `${(cm3 / 1_000).toFixed(2)} dm³`;
  return `${cm3.toFixed(2)} cm³`;
}

export function ProductForm({
  defaultValues,
  onSubmit,
  onCancel,
  isSubmitting = false,
  disableSubmitWhenPristine = false,
}: ProductFormProps) {
  const { t } = useTranslation();
  const form = useProductForm(defaultValues);

  const [
    width,
    widthUnit,
    height,
    heightUnit,
    length,
    lengthUnit,
    maxStackCount,
    productType,
    name,
    weight,
    weightUnit,
    fragilityTypes,
    allowRotateX,
    allowRotateY,
    allowRotateZ,
    notes,
    loadCategory,
  ] = useWatch({
    control: form.control,
    name: [
      'width',
      'widthUnit',
      'height',
      'heightUnit',
      'length',
      'lengthUnit',
      'maxStackCount',
      'productType',
      'name',
      'weight',
      'weightUnit',
      'fragilityTypes',
      'allowRotateX',
      'allowRotateY',
      'allowRotateZ',
      'notes',
      'loadCategory',
    ],
  });

  const isPallet = productType === 'palet';

  const isZLocked = (fragilityTypes ?? []).some((f) => f >= 1) || isPallet;
  const isYLocked = isPallet;

  const widthCm = Number.isFinite(width) ? toCentimeters(width, widthUnit ?? 'cm') : 0;
  const heightCm = Number.isFinite(height) ? toCentimeters(height, heightUnit ?? 'cm') : 0;
  const lengthCm = Number.isFinite(length) ? toCentimeters(length, lengthUnit ?? 'cm') : 0;
  const volumeCm3 = widthCm * heightCm * lengthCm;

  return (
    <TooltipProvider delayDuration={150}>
      <Form {...form}>
        <form id="product-form" onSubmit={form.handleSubmit(onSubmit)}>
          <div className="flex flex-col gap-6">
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
              {/* SOL — Form alanları */}
              <div className="flex flex-col gap-5">
                {/* Kimlik */}
                <section className="rounded-xl border bg-card p-5 shadow-sm">
                  <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {t('forms.product.sectionIdentity')}
                  </p>
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('forms.product.name')}</FormLabel>
                          <FormControl>
                            <Input
                              className={COMPACT_INPUT}
                              placeholder={t('forms.product.namePlaceholder')}
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="sku"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('forms.product.sku')}</FormLabel>

                          <FormControl>
                            <Input
                              className={COMPACT_INPUT}
                              placeholder={t('forms.product.skuPlaceholder')}
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </section>

                {/* Ürün Tipi & Hassasiyet */}
                <section className="rounded-xl border bg-card p-5 shadow-sm">
                  <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {t('forms.product.sectionType')}
                  </p>
                  <div className="flex flex-col gap-4 md:flex-row md:items-start">
                    {/* Sol: ürün tipi */}
                    <FormField
                      control={form.control}
                      name="productType"
                      render={({ field }) => (
                        <FormItem className="shrink-0">
                          <FormLabel className="block text-xs font-medium text-muted-foreground uppercase tracking-wide">
                            {t('forms.product.sectionType')}
                          </FormLabel>
                          <FormControl>
                            <ToggleGroup
                              type="single"
                              value={field.value}
                              onValueChange={(value) => {
                                if (!value) return;
                                field.onChange(value);
                                if (value === 'pallet') {
                                  form.setValue('allowRotateY', false, { shouldValidate: false });
                                  form.setValue('allowRotateZ', false, { shouldValidate: false });
                                } else {
                                  form.setValue('allowRotateY', true, { shouldValidate: false });
                                  if (
                                    !(form.getValues('fragilityTypes') ?? []).some(
                                      (f: number) => f >= 1,
                                    )
                                  ) {
                                    form.setValue('allowRotateZ', true, { shouldValidate: false });
                                  }
                                }
                              }}
                              className="flex"
                            >
                              {PRODUCT_TYPE_OPTIONS.map(({ value, labelKey, Icon }) => (
                                <ToggleGroupItem key={value} value={value} aria-label={t(labelKey)}>
                                  <Icon className="h-5 w-5" strokeWidth={1.5} />
                                  <span className="text-xs">{t(labelKey)}</span>
                                </ToggleGroupItem>
                              ))}
                            </ToggleGroup>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Sağ: kısıt (hassasiyet) butonları */}
                    <FormField
                      control={form.control}
                      name="fragilityTypes"
                      render={({ field }) => {
                        const selected: number[] = field.value ?? [0];
                        const toggle = (val: number) => {
                          let next: number[];
                          if (val === FRAGILITY_LEVELS.NonFragile) {
                            next = [FRAGILITY_LEVELS.NonFragile];
                          } else if (selected.includes(val)) {
                            next = selected.filter((v) => v !== val);
                            if (next.length === 0) next = [FRAGILITY_LEVELS.NonFragile];
                          } else {
                            next = selected
                              .filter((v) => v !== FRAGILITY_LEVELS.NonFragile)
                              .concat(val);
                          }
                          field.onChange(next);
                          const hasFragile = next.some((v) => v >= FRAGILITY_LEVELS.Fragile);
                          if (hasFragile) {
                            form.setValue('allowRotateZ', false, { shouldValidate: false });
                            form.setValue('maxStackCount', 1, { shouldValidate: false });
                            form.setValue('isStackable', false, { shouldValidate: false });
                          }
                        };
                        return (
                          <FormItem className="flex-1">
                            <FormLabel className="block text-xs font-medium text-muted-foreground uppercase tracking-wide">
                              {t('forms.product.fragility')}
                            </FormLabel>
                            <div className="flex flex-wrap gap-2 pt-1">
                              {FRAGILITY_OPTIONS.map(({ value, labelKey, Icon, iconClass }) => {
                                const isSelected = selected.includes(value);
                                return (
                                  <button
                                    key={value}
                                    type="button"
                                    onClick={() => toggle(value)}
                                    className={cn(
                                      'flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors',
                                      isSelected
                                        ? 'border-primary bg-primary/10 text-primary ring-1 ring-primary/20'
                                        : 'border-zinc-200 bg-zinc-50 text-muted-foreground hover:border-zinc-300',
                                    )}
                                  >
                                    <Icon
                                      className={cn('h-3.5 w-3.5 shrink-0', iconClass)}
                                      strokeWidth={1.5}
                                    />
                                    {t(labelKey)}
                                  </button>
                                );
                              })}
                            </div>
                            <FormMessage />
                          </FormItem>
                        );
                      }}
                    />
                  </div>
                </section>

                {/* Yük Kategorisi & İstif */}
                <section className="rounded-xl border bg-card p-5 shadow-sm">
                  <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {t('forms.product.sectionLoadCategory')}
                  </p>
                  <div className="flex flex-col gap-4">
                    {/* Satır 1: Yük Grubu + Katman Sayısı */}
                    <div className="flex flex-wrap items-start gap-4">
                      <FormField
                        control={form.control}
                        name="loadCategory"
                        render={({ field }) => (
                          <FormItem className="min-w-48 flex-1">
                            <FormLabel>{t('forms.product.loadCategory')}</FormLabel>
                            <Select
                              value={field.value}
                              onValueChange={(value) => {
                                const cat = value as LoadCategory;
                                field.onChange(cat);
                                form.setValue(
                                  'incompatibleLoadGroups',
                                  DEFAULT_INCOMPATIBLE[cat] ?? [],
                                  { shouldValidate: false },
                                );
                              }}
                            >
                              <FormControl>
                                <SelectTrigger className={COMPACT_INPUT}>
                                  <SelectValue
                                    placeholder={t('forms.product.loadCategoryPlaceholder')}
                                  />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {LOAD_CATEGORIES.map((cat) => (
                                  <SelectItem key={cat} value={cat}>
                                    {t(`forms.product.loadCat_${cat}`)}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Katman Sayısı */}
                      <FormField
                        control={form.control}
                        name="maxStackCount"
                        render={({ field }) => {
                          const isStackLocked = (fragilityTypes ?? []).some(
                            (f) => f >= FRAGILITY_LEVELS.Fragile,
                          );
                          return (
                            <FormItem className="shrink-0">
                              <FormLabel>{t('forms.product.layerCount')}</FormLabel>
                              <div className="flex items-center gap-1 pt-1">
                                <button
                                  type="button"
                                  disabled={isStackLocked}
                                  onClick={() => {
                                    const next = Math.max(1, (field.value ?? 1) - 1);
                                    field.onChange(next);
                                    form.setValue('isStackable', true, { shouldValidate: false });
                                  }}
                                  className={cn(
                                    'flex h-8 w-8 shrink-0 items-center justify-center rounded-md border text-sm font-medium transition-colors',
                                    isStackLocked
                                      ? 'cursor-not-allowed border-rose-300 bg-rose-50 text-rose-300'
                                      : 'border-zinc-200 bg-zinc-50 hover:border-zinc-300 hover:bg-zinc-100',
                                  )}
                                >
                                  −
                                </button>
                                <Input
                                  type="number"
                                  min={1}
                                  step={1}
                                  disabled={isStackLocked}
                                  className={cn(
                                    'h-8 w-14 text-center text-sm [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none',
                                    isStackLocked &&
                                      'cursor-not-allowed border-rose-300 bg-rose-50',
                                  )}
                                  {...field}
                                  value={field.value ?? 1}
                                  onChange={(e) => {
                                    const next =
                                      e.target.value === ''
                                        ? 1
                                        : Math.max(1, e.target.valueAsNumber);
                                    field.onChange(next);
                                    form.setValue('isStackable', true, { shouldValidate: false });
                                  }}
                                />
                                <button
                                  type="button"
                                  disabled={isStackLocked}
                                  onClick={() => {
                                    const next = (field.value ?? 1) + 1;
                                    field.onChange(next);
                                    form.setValue('isStackable', true, { shouldValidate: false });
                                  }}
                                  className={cn(
                                    'flex h-8 w-8 shrink-0 items-center justify-center rounded-md border text-sm font-medium transition-colors',
                                    isStackLocked
                                      ? 'cursor-not-allowed border-rose-300 bg-rose-50 text-rose-300'
                                      : 'border-zinc-200 bg-zinc-50 hover:border-zinc-300 hover:bg-zinc-100',
                                  )}
                                >
                                  +
                                </button>
                              </div>
                              <FormMessage />
                            </FormItem>
                          );
                        }}
                      />
                    </div>

                    {/* Satır 2: Uyumsuz Yük Grupları (tam genişlik, kırılabilir) */}
                    <FormField
                      control={form.control}
                      name="incompatibleLoadGroups"
                      render={({ field }) => {
                        const selected: LoadCategory[] = field.value ?? [];
                        const available = LOAD_CATEGORIES.filter((c) => c !== loadCategory);
                        return (
                          <FormItem>
                            <FormLabel>{t('forms.product.incompatibleLoadGroups')}</FormLabel>
                            {!loadCategory ? (
                              <p className="pt-1 text-xs text-muted-foreground">
                                {t('forms.product.incompatibleLoadGroupsHint')}
                              </p>
                            ) : (
                              <div className="flex flex-wrap gap-1.5 pt-1">
                                {available.map((cat) => {
                                  const isSelected = selected.includes(cat);
                                  return (
                                    <button
                                      key={cat}
                                      type="button"
                                      onClick={() => {
                                        const next = isSelected
                                          ? selected.filter((c) => c !== cat)
                                          : [...selected, cat];
                                        field.onChange(next);
                                      }}
                                      className={cn(
                                        'rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors',
                                        isSelected
                                          ? 'border-destructive bg-destructive/10 text-destructive'
                                          : 'border-zinc-200 bg-zinc-50 text-muted-foreground hover:border-zinc-300',
                                      )}
                                    >
                                      {t(`forms.product.loadCat_${cat}`)}
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                            <FormMessage />
                          </FormItem>
                        );
                      }}
                    />
                  </div>
                </section>

                {/* Fiziksel Ölçüler */}
                <section className="rounded-xl border bg-card p-5 shadow-sm">
                  <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {t('forms.product.sectionPhysical')}
                  </p>
                  <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                    <DimensionField
                      form={form}
                      name="width"
                      unitName="widthUnit"
                      labelKey="forms.product.width"
                    />
                    <DimensionField
                      form={form}
                      name="height"
                      unitName="heightUnit"
                      labelKey="forms.product.height"
                    />
                    <DimensionField
                      form={form}
                      name="length"
                      unitName="lengthUnit"
                      labelKey="forms.product.length"
                    />
                    <FormField
                      control={form.control}
                      name="weight"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('forms.product.weight')}</FormLabel>
                          <div className="relative">
                            <FormControl>
                              <Input
                                type="number"
                                step="0.1"
                                className={COMPACT_INPUT_WITH_UNIT}
                                {...field}
                                value={field.value ?? ''}
                                onChange={(e) =>
                                  field.onChange(
                                    e.target.value === '' ? undefined : e.target.valueAsNumber,
                                  )
                                }
                              />
                            </FormControl>
                            <Controller
                              control={form.control}
                              name="weightUnit"
                              render={({ field: unitField }) => (
                                <Select value={unitField.value} onValueChange={unitField.onChange}>
                                  <SelectTrigger className={UNIT_TRIGGER}>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {WEIGHT_KEYS.map((unit) => (
                                      <SelectItem key={unit} value={unit}>
                                        {unit}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              )}
                            />
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </section>

                {/* Döndürme Kısıtları */}
                <section className="rounded-xl border bg-card p-5 shadow-sm">
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      {t('forms.product.sectionConstraints')}
                    </p>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button type="button" aria-label={t('forms.product.axisGuideAria')}>
                          <HelpCircle className="h-4 w-4 text-muted-foreground" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <div className="space-y-1">
                          <p className="font-medium">{t('forms.product.axisGuideTitle')}</p>
                          <p>{t('forms.product.axisXTooltip')}</p>
                          <p>{t('forms.product.axisYTooltip')}</p>
                          <p>{t('forms.product.axisZTooltip')}</p>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    {ROTATION_AXES.map(({ name: axisFieldName, labelKey, tooltipKey, axis }) => {
                      const isDisabled =
                        (axisFieldName === 'allowRotateZ' && isZLocked) ||
                        (axisFieldName === 'allowRotateY' && isYLocked);
                      return (
                        <FormField
                          key={axisFieldName}
                          control={form.control}
                          name={axisFieldName}
                          render={({ field }) => (
                            <FormItem className="m-0 space-y-0">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button
                                    type="button"
                                    aria-pressed={field.value}
                                    aria-label={
                                      isDisabled
                                        ? t('forms.product.rotateZLockedWarning')
                                        : t(tooltipKey)
                                    }
                                    disabled={isDisabled}
                                    onClick={() => field.onChange(!field.value)}
                                    className={cn(
                                      'flex h-full w-full flex-col items-center justify-center gap-1 rounded-md border bg-zinc-50 px-2 py-1.5 text-center transition-all',
                                      field.value
                                        ? 'border-primary text-primary shadow-sm ring-1 ring-primary/20'
                                        : 'border-zinc-200 text-muted-foreground hover:border-zinc-300',
                                      isDisabled && 'cursor-not-allowed opacity-50',
                                    )}
                                  >
                                    <AxisBoxIllustration axis={axis} active={field.value} />
                                    <span className="text-xs font-medium leading-none text-foreground">
                                      {t(labelKey)}
                                    </span>
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  {isDisabled
                                    ? t('forms.product.rotateZLockedWarning')
                                    : t(tooltipKey)}
                                </TooltipContent>
                              </Tooltip>
                            </FormItem>
                          )}
                        />
                      );
                    })}
                  </div>
                </section>

                {/* Taşıma Notları */}
                <section className="rounded-xl border bg-card p-5 shadow-sm">
                  <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {t('forms.product.sectionNotes')}
                  </p>
                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => {
                      const value = field.value ?? '';
                      const length = value.length;
                      const isOverLimit = length >= NOTES_MAX_LENGTH;
                      return (
                        <FormItem>
                          <FormLabel className="sr-only">{t('forms.product.notesLabel')}</FormLabel>
                          <FormControl>
                            <Textarea
                              rows={3}
                              maxLength={NOTES_MAX_LENGTH}
                              placeholder={t('forms.product.notesPlaceholder')}
                              className="resize-none overflow-y-auto border-zinc-200 bg-zinc-50 focus-visible:ring-2 focus-visible:ring-primary/40"
                              {...field}
                              value={value}
                              onChange={(e) => {
                                const next = e.target.value.slice(0, NOTES_MAX_LENGTH);
                                field.onChange(next);
                              }}
                            />
                          </FormControl>
                          <div className="mt-1 flex items-start justify-between gap-3 text-xs">
                            <p className="text-muted-foreground">
                              {t('forms.product.notesHelper')}
                            </p>
                            <span
                              aria-live="polite"
                              className={cn(
                                'shrink-0 tabular-nums',
                                isOverLimit
                                  ? 'font-semibold text-red-600'
                                  : 'text-muted-foreground',
                              )}
                            >
                              {t('forms.product.notesCounter', {
                                count: length,
                                max: NOTES_MAX_LENGTH,
                              })}
                            </span>
                          </div>
                          <FormMessage />
                        </FormItem>
                      );
                    }}
                  />
                </section>
              </div>

              {/* SAĞ — Önizleme paneli */}
              <PreviewPanel
                name={name}
                productType={productType ?? 'koli'}
                width={width}
                widthUnit={widthUnit}
                height={height}
                heightUnit={heightUnit}
                length={length}
                lengthUnit={lengthUnit}
                weight={weight}
                weightUnit={weightUnit}
                volumeCm3={volumeCm3}
                maxStackCount={maxStackCount ?? 1}
                fragilityTypes={fragilityTypes ?? [0]}
                allowRotateX={allowRotateX}
                allowRotateY={allowRotateY}
                allowRotateZ={allowRotateZ}
                notes={notes}
              />
            </div>

            {/* Aksiyonlar — grid dışında, tam genişlik */}
            <div className="flex justify-end gap-3 border-t pt-4">
              {onCancel && (
                <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
                  {t('forms.product.cancel')}
                </Button>
              )}
              <Button
                type="submit"
                disabled={isSubmitting || (disableSubmitWhenPristine && !form.formState.isDirty)}
              >
                {isSubmitting ? t('forms.product.submitting') : t('forms.product.submit')}
              </Button>
            </div>
          </div>
        </form>
      </Form>
    </TooltipProvider>
  );
}

interface PreviewPanelProps {
  name?: string;
  productType: 'koli' | 'varil' | 'palet';
  width?: number;
  widthUnit?: DimensionUnitKey;
  height?: number;
  heightUnit?: DimensionUnitKey;
  length?: number;
  lengthUnit?: DimensionUnitKey;
  weight?: number;
  weightUnit?: keyof typeof WEIGHT_UNITS;
  volumeCm3: number;
  maxStackCount: number;
  fragilityTypes: number[];
  allowRotateX: boolean;
  allowRotateY: boolean;
  allowRotateZ: boolean;
  notes?: string;
}

function PreviewPanel(props: PreviewPanelProps) {
  const { t } = useTranslation();
  const {
    name,
    productType,
    width,
    widthUnit,
    height,
    heightUnit,
    length,
    lengthUnit,
    weight,
    weightUnit,
    volumeCm3,
    maxStackCount,
    fragilityTypes,
    allowRotateX,
    allowRotateY,
    allowRotateZ,
    notes,
  } = props;

  const fmt = (val?: number, unit?: string) =>
    val !== undefined && Number.isFinite(val) && unit ? `${val} ${unit}` : '—';

  const FRAGILITY_LABEL_KEYS: Record<number, string> = {
    [FRAGILITY_LEVELS.NonFragile]: 'forms.product.fragilityNonFragile',
    [FRAGILITY_LEVELS.Fragile]: 'forms.product.fragilityFragile',
    [FRAGILITY_LEVELS.Liquid]: 'forms.product.fragilityLiquid',
    [FRAGILITY_LEVELS.Corrosive]: 'forms.product.fragilityCorrosive',
    [FRAGILITY_LEVELS.OdorSensitive]: 'forms.product.fragilityOdorSensitive',
    [FRAGILITY_LEVELS.FoodContact]: 'forms.product.fragilityFoodContact',
    [FRAGILITY_LEVELS.Dry]: 'forms.product.fragilityDry',
    [FRAGILITY_LEVELS.Chemical]: 'forms.product.fragilityChemical',
  };
  const fragilityLabel = (fragilityTypes ?? [0])
    .map((f) => t(FRAGILITY_LABEL_KEYS[f] ?? 'forms.product.fragilityNonFragile'))
    .join(', ');

  const lockedAxes: string[] = [];
  if (!allowRotateX) lockedAxes.push('X');
  if (!allowRotateY) lockedAxes.push('Y');
  if (!allowRotateZ) lockedAxes.push('Z');
  const allRotationsFree = lockedAxes.length === 0;

  return (
    <aside className="flex flex-col gap-4 lg:sticky lg:top-6 lg:self-start">
      {/* Önizleme kartı */}
      <div className="rounded-xl border bg-card p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Ürün Önizleme
          </p>
          <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
            3D Önizleme
          </span>
        </div>
        <div className="flex items-center justify-center overflow-hidden rounded-lg bg-muted/30 py-6">
          <div className="flex flex-col items-center gap-3 text-muted-foreground">
            <ProductTypeIllustration type={productType} />
            <p className="px-6 text-center text-[10px] uppercase tracking-wide text-muted-foreground">
              {t('forms.product.previewPlaceholder')}
            </p>
          </div>
        </div>
        <div className="mt-3 border-t pt-3">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
            {t('forms.product.volume')}
          </p>
          <p className="mt-0.5 text-2xl font-bold tabular-nums text-foreground">
            {volumeCm3 > 0 ? formatVolume(volumeCm3) : '0.00 m³'}
          </p>
        </div>
      </div>

      {/* Ürün özeti kartı */}
      <div className="rounded-xl border bg-card p-4 shadow-sm">
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Ürün Özeti
        </p>
        <dl className="flex flex-col">
          <PreviewRow label={t('forms.product.name')} value={name || '—'} emphasize />
          <PreviewRow label={t('forms.product.width')} value={fmt(width, widthUnit)} />
          <PreviewRow label={t('forms.product.height')} value={fmt(height, heightUnit)} />
          <PreviewRow label={t('forms.product.length')} value={fmt(length, lengthUnit)} />
          <PreviewRow label={t('forms.product.weight')} value={fmt(weight, weightUnit)} />
          <PreviewRow label={t('forms.product.fragility')} value={fragilityLabel} />
          <PreviewRow label={t('forms.product.layerCount')} value={String(maxStackCount)} />
          <PreviewRow
            label="Döndürme"
            value={
              allRotationsFree
                ? t('forms.product.summaryRotationFree')
                : t('forms.product.summaryRotationLocked', { axes: lockedAxes.join(', ') })
            }
          />
        </dl>
      </div>

      {notes && notes.trim().length > 0 && (
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            {t('forms.product.notesSummaryLabel')}
          </p>
          <p className="text-xs text-foreground/80 whitespace-pre-wrap break-words">{notes}</p>
        </div>
      )}
    </aside>
  );
}

interface PreviewRowProps {
  label: ReactNode;
  value: ReactNode;
  emphasize?: boolean;
}

function PreviewRow({ label, value, emphasize = false }: PreviewRowProps) {
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

interface DimensionFieldProps {
  form: ReturnType<typeof useProductForm>;
  name: 'width' | 'height' | 'length';
  unitName: 'widthUnit' | 'heightUnit' | 'lengthUnit';
  labelKey: string;
}

function DimensionField({ form, name, unitName, labelKey }: DimensionFieldProps) {
  const { t } = useTranslation();
  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{t(labelKey)}</FormLabel>
          <div className="relative">
            <FormControl>
              <Input
                type="number"
                step="0.1"
                className={COMPACT_INPUT_WITH_UNIT}
                {...field}
                value={field.value ?? ''}
                onChange={(e) =>
                  field.onChange(e.target.value === '' ? undefined : e.target.valueAsNumber)
                }
              />
            </FormControl>
            <Controller
              control={form.control}
              name={unitName}
              render={({ field: unitField }) => (
                <Select value={unitField.value} onValueChange={unitField.onChange}>
                  <SelectTrigger className={UNIT_TRIGGER}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DIMENSION_KEYS.map((unit) => (
                      <SelectItem key={unit} value={unit}>
                        {unit}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
