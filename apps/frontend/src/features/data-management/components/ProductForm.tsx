import type { ReactNode } from 'react';
import { useState } from 'react';
import { Controller, useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import {
  Ban,
  Box,
  Cylinder,
  HelpCircle,
  Minus,
  Move3d,
  Package,
  Plus,
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
  NOTES_MAX_LENGTH,
  WEIGHT_UNITS,
  toCentimeters,
  type DimensionUnitKey,
  type ProductFormValues,
} from '@/features/data-management/schemas/productSchema';
import { cn } from '@/lib/utils';
import { ProductPreview3D } from '@/features/data-management/components/ProductPreview3D';

interface ProductFormProps {
  formId?: string;
  hideFooterActions?: boolean;
  defaultValues?: Partial<ProductFormValues>;
  onSubmit: (values: ProductFormValues) => void;
  onCancel?: () => void;
  isSubmitting?: boolean;
  disableSubmitWhenPristine?: boolean;
}

const DIMENSION_KEYS = Object.keys(DIMENSION_UNITS) as DimensionUnitKey[];
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

const COMPACT_INPUT = 'h-9 border-zinc-200 bg-white';
const COMPACT_INPUT_WITH_UNIT = 'h-9 border-zinc-200 bg-white pr-16';
const UNIT_TRIGGER =
  'absolute right-1 top-1/2 h-7 w-14 -translate-y-1/2 gap-1 border-0 bg-transparent px-2 py-0 text-xs text-muted-foreground shadow-none focus:ring-0 focus:ring-offset-0';

type ConstraintOption = {
  value: string;
  label: string;
  color: 'default' | 'amber' | 'blue' | 'orange' | 'green' | 'purple';
  disabled?: boolean;
};

const CONSTRAINT_OPTIONS: ConstraintOption[] = [
  { value: String(FRAGILITY_LEVELS.NonFragile), label: 'Kısıt Yok', color: 'default' },
  { value: String(FRAGILITY_LEVELS.Fragile), label: 'Kırılgan', color: 'amber' },
  { value: String(FRAGILITY_LEVELS.Liquid), label: 'Sıvı', color: 'blue' },
  { value: 'corrosive', label: 'Aşındırıcı', color: 'orange', disabled: true },
  { value: 'odor', label: 'Kokuya Hassas', color: 'green', disabled: true },
  { value: 'food', label: 'Gıda Teması', color: 'green', disabled: true },
  { value: 'dry', label: 'Kuru', color: 'default', disabled: true },
  { value: 'chemical', label: 'Kimyasal', color: 'purple', disabled: true },
];

const CARGO_GROUPS = ['Kimya', 'Gıda', 'Genel', 'Tehlikeli Madde', 'Elektronik', 'Tekstil'];
const INCOMPATIBLE_GROUPS = ['Gıda', 'Genel', 'Tehlikeli Madde', 'Kimya', 'Elektronik'];

function formatVolume(cm3: number): string {
  if (cm3 >= 1_000_000) return `${(cm3 / 1_000_000).toFixed(2)} m³`;
  if (cm3 >= 1_000) return `${(cm3 / 1_000).toFixed(2)} dm³`;
  return `${cm3.toFixed(1)} cm³`;
}

function SectionCard({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('rounded-xl border border-zinc-200 bg-white p-5', className)}>
      {children}
    </div>
  );
}

function SectionTitle({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p
      className={cn(
        'mb-4 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground',
        className,
      )}
    >
      {children}
    </p>
  );
}

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

export function ProductForm({
  formId,
  hideFooterActions = false,
  defaultValues,
  onSubmit,
  onCancel,
  isSubmitting = false,
  disableSubmitWhenPristine = false,
}: ProductFormProps) {
  const { t } = useTranslation();
  const form = useProductForm(defaultValues);

  const [selectedCargoGroup, setSelectedCargoGroup] = useState<string>('');
  const [incompatibleGroups, setIncompatibleGroups] = useState<string[]>([]);

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
    fragility,
    allowRotateX,
    allowRotateY,
    allowRotateZ,
    notes,
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
      'fragility',
      'allowRotateX',
      'allowRotateY',
      'allowRotateZ',
      'notes',
    ],
  });

  const isPallet = productType === 'palet';
  const isZLocked = (fragility ?? 0) >= 1 || isPallet;
  const isYLocked = isPallet;

  const widthCm = Number.isFinite(width) ? toCentimeters(width, widthUnit ?? 'cm') : 0;
  const heightCm = Number.isFinite(height) ? toCentimeters(height, heightUnit ?? 'cm') : 0;
  const lengthCm = Number.isFinite(length) ? toCentimeters(length, lengthUnit ?? 'cm') : 0;
  const volumeCm3 = widthCm * heightCm * lengthCm;

  function toggleIncompatibleGroup(group: string) {
    setIncompatibleGroups((prev) =>
      prev.includes(group) ? prev.filter((g) => g !== group) : [...prev, group],
    );
  }

  return (
    <TooltipProvider delayDuration={150}>
      <Form {...form}>
        <form
          id={formId}
          onSubmit={form.handleSubmit(onSubmit)}
          className="space-y-4"
        >
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
            {/* SOL — Form alanları */}
            <div className="space-y-4">
              {/* KİMLİK */}
              <SectionCard>
                <SectionTitle>{t('forms.product.sectionIdentity')}</SectionTitle>
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
              </SectionCard>

              {/* ÜRÜN TİPİ & KISITLAR */}
              <SectionCard>
                <SectionTitle>{t('forms.product.sectionType')}</SectionTitle>
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  {/* Ürün Tipi */}
                  <FormField
                    control={form.control}
                    name="productType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="block">{t('forms.product.sectionType')}</FormLabel>
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
                                if ((form.getValues('fragility') ?? 0) < 1) {
                                  form.setValue('allowRotateZ', true, { shouldValidate: false });
                                }
                              }
                            }}
                            className="flex flex-wrap gap-1"
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

                  {/* Kısıtlar — chip tabanlı */}
                  <FormField
                    control={form.control}
                    name="fragility"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="block">KISITLAR</FormLabel>
                        <div className="flex flex-wrap gap-1.5">
                          {CONSTRAINT_OPTIONS.map((opt) => {
                            const isActive =
                              !opt.disabled && String(field.value) === opt.value;
                            return (
                              <button
                                key={opt.value}
                                type="button"
                                disabled={opt.disabled}
                                onClick={() => {
                                  if (opt.disabled) return;
                                  const num = Number(opt.value);
                                  field.onChange(num);
                                  if (num >= FRAGILITY_LEVELS.Fragile) {
                                    form.setValue('allowRotateZ', false, {
                                      shouldValidate: false,
                                    });
                                  } else {
                                    if (!isPallet) {
                                      form.setValue('allowRotateZ', true, {
                                        shouldValidate: false,
                                      });
                                    }
                                  }
                                }}
                                className={cn(
                                  'inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium transition-all',
                                  isActive
                                    ? 'border-primary bg-primary/10 text-primary'
                                    : 'border-zinc-200 bg-white text-muted-foreground hover:border-zinc-300',
                                  opt.disabled && 'cursor-not-allowed opacity-40',
                                )}
                              >
                                <ConstraintDot color={opt.color} active={isActive} />
                                {opt.label}
                              </button>
                            );
                          })}
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </SectionCard>

              {/* YÜK KATEGORİSİ */}
              <SectionCard>
                <SectionTitle>YÜK KATEGORİSİ</SectionTitle>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_auto]">
                  <div className="space-y-3">
                    {/* Yük Grubu */}
                    <div>
                      <p className="mb-1.5 text-sm font-medium leading-none">Yük Grubu</p>
                      <Select value={selectedCargoGroup} onValueChange={setSelectedCargoGroup}>
                        <SelectTrigger className="h-9 border-zinc-200 bg-white">
                          <SelectValue placeholder="Yük grubu seçin…" />
                        </SelectTrigger>
                        <SelectContent>
                          {CARGO_GROUPS.map((g) => (
                            <SelectItem key={g} value={g}>
                              {g}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Uyumsuz Yük Grupları */}
                    <div>
                      <p className="mb-1.5 text-sm font-medium leading-none">
                        Uyumsuz Yük Grupları
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {INCOMPATIBLE_GROUPS.map((g) => {
                          const selected = incompatibleGroups.includes(g);
                          return (
                            <button
                              key={g}
                              type="button"
                              onClick={() => toggleIncompatibleGroup(g)}
                              className={cn(
                                'inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium transition-all',
                                selected
                                  ? 'border-destructive bg-destructive/10 text-destructive'
                                  : 'border-zinc-200 bg-white text-muted-foreground hover:border-zinc-300',
                              )}
                            >
                              {g}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Katman Sayısı — +/- sayacı */}
                  <FormField
                    control={form.control}
                    name="maxStackCount"
                    render={({ field }) => (
                      <FormItem className="flex flex-col items-center">
                        <FormLabel className="text-center">Katman Sayısı</FormLabel>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            aria-label="Azalt"
                            onClick={() => {
                              const next = Math.max(1, (field.value ?? 1) - 1);
                              field.onChange(next);
                              form.setValue('isStackable', next > 1, { shouldValidate: false });
                            }}
                            className="flex h-8 w-8 items-center justify-center rounded-md border border-zinc-200 bg-white text-muted-foreground transition hover:bg-zinc-50"
                          >
                            <Minus className="h-3.5 w-3.5" />
                          </button>
                          <span className="w-8 text-center text-sm font-semibold tabular-nums">
                            {field.value ?? 1}
                          </span>
                          <button
                            type="button"
                            aria-label="Artır"
                            onClick={() => {
                              const next = (field.value ?? 1) + 1;
                              field.onChange(next);
                              form.setValue('isStackable', next > 1, { shouldValidate: false });
                            }}
                            className="flex h-8 w-8 items-center justify-center rounded-md border border-zinc-200 bg-white text-muted-foreground transition hover:bg-zinc-50"
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </SectionCard>

              {/* FİZİKSEL ÖZELLİKLER */}
              <SectionCard>
                <SectionTitle>{t('forms.product.sectionPhysical')}</SectionTitle>
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
                              min={0}
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
              </SectionCard>

              {/* KISITLAR — eksen rotasyonu */}
              <SectionCard>
                <div className="mb-4 flex items-center justify-between">
                  <SectionTitle className="mb-0">
                    {t('forms.product.sectionConstraints')}
                  </SectionTitle>
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
                                    'flex h-full w-full flex-col items-center justify-center gap-1 rounded-md border bg-zinc-50 px-2 py-3 text-center transition-all',
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
              </SectionCard>

              {/* ÖZEL TAŞIMA NOTLARI */}
              <SectionCard>
                <SectionTitle>{t('forms.product.sectionNotes')}</SectionTitle>
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => {
                    const value = field.value ?? '';
                    const charCount = value.length;
                    const isOverLimit = charCount >= NOTES_MAX_LENGTH;
                    return (
                      <FormItem>
                        <FormLabel className="sr-only">{t('forms.product.notesLabel')}</FormLabel>
                        <FormControl>
                          <Textarea
                            rows={3}
                            maxLength={NOTES_MAX_LENGTH}
                            placeholder={t('forms.product.notesPlaceholder')}
                            className="resize-none overflow-y-auto border-zinc-200 bg-white focus-visible:ring-2 focus-visible:ring-primary/40"
                            {...field}
                            value={value}
                            onChange={(e) => {
                              const next = e.target.value.slice(0, NOTES_MAX_LENGTH);
                              field.onChange(next);
                            }}
                          />
                        </FormControl>
                        <div className="mt-1 flex items-start justify-between gap-3 text-xs">
                          <p className="text-muted-foreground">{t('forms.product.notesHelper')}</p>
                          <span
                            aria-live="polite"
                            className={cn(
                              'shrink-0 tabular-nums',
                              isOverLimit ? 'font-semibold text-red-600' : 'text-muted-foreground',
                            )}
                          >
                            {t('forms.product.notesCounter', {
                              count: charCount,
                              max: NOTES_MAX_LENGTH,
                            })}
                          </span>
                        </div>
                        <FormMessage />
                      </FormItem>
                    );
                  }}
                />
              </SectionCard>
            </div>

            {/* SAĞ — Önizleme */}
            <PreviewPanel
              name={name}
              productType={productType ?? 'koli'}
              length={length}
              lengthUnit={lengthUnit}
              width={width}
              widthUnit={widthUnit}
              height={height}
              heightUnit={heightUnit}
              weight={weight}
              weightUnit={weightUnit}
              volumeCm3={volumeCm3}
              maxStackCount={maxStackCount ?? 1}
              fragility={fragility ?? 0}
              allowRotateX={allowRotateX}
              allowRotateY={allowRotateY}
              allowRotateZ={allowRotateZ}
              notes={notes}
            />
          </div>

          {!hideFooterActions && (
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
          )}
        </form>
      </Form>
    </TooltipProvider>
  );
}

interface ConstraintDotProps {
  color: 'default' | 'amber' | 'blue' | 'orange' | 'green' | 'purple';
  active: boolean;
}

function ConstraintDot({ color, active }: ConstraintDotProps) {
  if (!active) return null;
  const colorMap: Record<ConstraintDotProps['color'], string> = {
    default: 'bg-zinc-400',
    amber: 'bg-amber-400',
    blue: 'bg-blue-400',
    orange: 'bg-orange-400',
    green: 'bg-green-400',
    purple: 'bg-purple-400',
  };
  return <span className={cn('h-1.5 w-1.5 rounded-full', colorMap[color])} />;
}

interface PreviewPanelProps {
  name?: string;
  productType: 'koli' | 'varil' | 'palet';
  length?: number;
  lengthUnit?: DimensionUnitKey;
  width?: number;
  widthUnit?: DimensionUnitKey;
  height?: number;
  heightUnit?: DimensionUnitKey;
  weight?: number;
  weightUnit?: keyof typeof WEIGHT_UNITS;
  volumeCm3: number;
  maxStackCount: number;
  fragility: number;
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
    length,
    lengthUnit,
    width,
    widthUnit,
    height,
    heightUnit,
    weight,
    weightUnit,
    volumeCm3,
    maxStackCount,
    fragility,
    allowRotateX,
    allowRotateY,
    allowRotateZ,
    notes,
  } = props;

  const fmt = (val?: number, unit?: string) =>
    val !== undefined && Number.isFinite(val) && unit ? `${val} ${unit}` : '—';

  const fragilityLabel =
    fragility === FRAGILITY_LEVELS.Liquid
      ? t('forms.product.fragilityLiquid')
      : fragility === FRAGILITY_LEVELS.Fragile
        ? t('forms.product.fragilityFragile')
        : t('forms.product.fragilityNonFragile');

  const lockedAxes: string[] = [];
  if (!allowRotateX) lockedAxes.push('X');
  if (!allowRotateY) lockedAxes.push('Y');
  if (!allowRotateZ) lockedAxes.push('Z');
  const allRotationsFree = lockedAxes.length === 0;

  const widthCm =
    Number.isFinite(width) && width !== undefined ? toCentimeters(width, widthUnit ?? 'cm') : 0;
  const heightCm =
    Number.isFinite(height) && height !== undefined ? toCentimeters(height, heightUnit ?? 'cm') : 0;
  const depthCm =
    Number.isFinite(length) && length !== undefined ? toCentimeters(length, lengthUnit ?? 'cm') : 0;
  const hasDimensions = widthCm > 0 && heightCm > 0 && depthCm > 0;

  return (
    <aside className="lg:sticky lg:top-6 lg:self-start">
      <div className="flex flex-col gap-3">
        {/* Önizleme kartı */}
        <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
          {/* Başlık */}
          <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-2.5">
            <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
              ÜRÜN ÖNİZLEME
            </span>
            <span className="rounded-md bg-zinc-100 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-zinc-500">
              3D Önizleme
            </span>
          </div>

          {/* 3D Alan */}
          <div className="relative aspect-square overflow-hidden bg-zinc-50">
            {hasDimensions ? (
              <ProductPreview3D
                widthCm={widthCm}
                heightCm={heightCm}
                depthCm={depthCm}
                productType={productType}
              />
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-zinc-400">
                <div className="text-zinc-500">
                  <ProductTypeIllustration type={productType} />
                </div>
                <p className="px-6 text-center text-xs uppercase tracking-wide">
                  {t('forms.product.previewPlaceholder')}
                </p>
              </div>
            )}
          </div>

          {/* Hacim */}
          <div className="flex items-baseline justify-between border-t border-zinc-100 px-4 py-3">
            <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
              HACİM
            </span>
            <span className="text-xl font-semibold tabular-nums text-foreground">
              {volumeCm3 > 0 ? formatVolume(volumeCm3) : '0.00 m³'}
            </span>
          </div>
        </div>

        {/* Özet kartı */}
        <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
          <div className="border-b border-zinc-100 px-4 py-2.5">
            <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
              ÜRÜN ÖZETİ
            </span>
          </div>
          <dl className="divide-y divide-zinc-50 px-4">
            <PreviewRow label={t('forms.product.name')} value={name || '—'} emphasize />
            <PreviewRow label={t('forms.product.width')} value={fmt(width, widthUnit)} />
            <PreviewRow label={t('forms.product.height')} value={fmt(height, heightUnit)} />
            <PreviewRow label={t('forms.product.length')} value={fmt(length, lengthUnit)} />
            <PreviewRow label={t('forms.product.weight')} value={fmt(weight, weightUnit)} />
            <PreviewRow label="Kısıtlar" value={fragilityLabel} />
            <PreviewRow label={t('forms.product.layerCount')} value={String(maxStackCount)} />
            <PreviewRow
              label={<Move3d className="h-4 w-4" aria-hidden />}
              value={
                allRotationsFree
                  ? t('forms.product.summaryRotationFree')
                  : t('forms.product.summaryRotationLocked', { axes: lockedAxes.join(', ') })
              }
            />
          </dl>
        </div>

        {notes && notes.trim().length > 0 && (
          <div className="rounded-xl border border-dashed border-zinc-300 bg-white p-3 text-xs text-foreground">
            <p className="mb-1 font-semibold uppercase tracking-wide text-muted-foreground">
              {t('forms.product.notesSummaryLabel')}
            </p>
            <p className="whitespace-pre-wrap break-words">{notes}</p>
          </div>
        )}
      </div>
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
    <div className="flex items-baseline justify-between gap-3 py-2">
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
                min={0}
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
