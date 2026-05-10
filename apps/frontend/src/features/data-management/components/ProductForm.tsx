import { useState, type ReactNode } from 'react';
import { Controller, useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import type { LucideIcon } from 'lucide-react';
import {
  Ban,
  Box,
  Cpu,
  Cylinder,
  Droplets,
  Flame,
  FlaskConical,
  HelpCircle,
  Leaf,
  Package,
  Sun,
  Utensils,
  Wind,
  Wine,
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
import { FormWithPreviewLayout } from '@/components/shared/FormWithPreviewLayout';

interface ProductFormProps {
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
    axisLabel: 'X',
    subtitle: 'Sol / Sağ',
  },
  {
    name: 'allowRotateY',
    labelKey: 'forms.product.allowRotateY',
    tooltipKey: 'forms.product.axisYTooltip',
    axis: 'y' as AxisKey,
    axisLabel: 'Y',
    subtitle: 'Yukarı / Aşağı',
  },
  {
    name: 'allowRotateZ',
    labelKey: 'forms.product.allowRotateZ',
    tooltipKey: 'forms.product.axisZTooltip',
    axis: 'z' as AxisKey,
    axisLabel: 'Z',
    subtitle: 'Öne / Arkaya',
  },
] as const;

const COMPACT_INPUT = 'h-9 border-input bg-background';
const COMPACT_INPUT_WITH_UNIT = 'h-9 border-input bg-background pr-16';
const UNIT_TRIGGER =
  'absolute right-1 top-1/2 h-7 w-14 -translate-y-1/2 gap-1 border-0 bg-transparent px-2 py-0 text-xs text-muted-foreground shadow-none focus:ring-0 focus:ring-offset-0';

type ConstraintColor = 'default' | 'amber' | 'blue' | 'orange' | 'green' | 'purple';

type ConstraintOption = {
  value: string;
  label: string;
  color: ConstraintColor;
  Icon: LucideIcon;
  fragilityValue?: number;
};

const CONSTRAINT_OPTIONS: ConstraintOption[] = [
  {
    value: 'fragile',
    label: 'Kırılgan',
    color: 'amber',
    Icon: Wine,
    fragilityValue: FRAGILITY_LEVELS.Fragile,
  },
  {
    value: 'liquid',
    label: 'Sıvı',
    color: 'blue',
    Icon: Droplets,
    fragilityValue: FRAGILITY_LEVELS.Liquid,
  },
  {
    value: 'corrosive',
    label: 'Aşındırıcı',
    color: 'orange',
    Icon: Flame,
    fragilityValue: FRAGILITY_LEVELS.Corrosive,
  },
  {
    value: 'odor',
    label: 'Kokuya Hassas',
    color: 'green',
    Icon: Wind,
    fragilityValue: FRAGILITY_LEVELS.OdorSensitive,
  },
  {
    value: 'food',
    label: 'Gıda Teması',
    color: 'green',
    Icon: Utensils,
    fragilityValue: FRAGILITY_LEVELS.FoodContact,
  },
  {
    value: 'dry',
    label: 'Kuru',
    color: 'default',
    Icon: Sun,
    fragilityValue: FRAGILITY_LEVELS.KeepDry,
  },
  {
    value: 'chemical',
    label: 'Kimyasal',
    color: 'purple',
    Icon: FlaskConical,
    fragilityValue: FRAGILITY_LEVELS.Chemical,
  },
  {
    value: 'organic',
    label: 'Organik',
    color: 'green',
    Icon: Leaf,
    fragilityValue: FRAGILITY_LEVELS.Organic,
  },
];

const CARGO_GROUPS = ['Kimya', 'Gıda', 'Genel', 'Tehlikeli Madde', 'Elektronik', 'Tekstil'];
const INCOMPATIBLE_GROUPS = [
  { value: 'Gıda', Icon: Utensils },
  { value: 'Genel', Icon: Package },
  { value: 'Tehlikeli Madde', Icon: Flame },
  { value: 'Kimya', Icon: FlaskConical },
  { value: 'Elektronik', Icon: Cpu },
] as const;

function formatVolume(cm3: number): string {
  if (cm3 >= 1_000_000) return `${(cm3 / 1_000_000).toFixed(2)} m³`;
  if (cm3 >= 1_000) return `${(cm3 / 1_000).toFixed(2)} dm³`;
  return `${cm3.toFixed(1)} cm³`;
}

interface SectionTitleProps {
  children: ReactNode;
  className?: string;
}

function SectionTitle({ children, className }: SectionTitleProps) {
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
        <Ban
          className="absolute inset-0 m-auto h-5 w-5 text-destructive"
          strokeWidth={2}
          aria-hidden
        />
      )}
    </div>
  );
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

  const [selectedConstraints, setSelectedConstraints] = useState<string[]>(() => {
    const frag = defaultValues?.fragility ?? 0;
    if (frag === 0) return [];
    const match = CONSTRAINT_OPTIONS.find((o) => o.fragilityValue === frag);
    return match ? [match.value] : [];
  });

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
    incompatibleGroups,
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
      'incompatibleGroups',
    ],
  });

  const isPallet = productType === 'palet';
  const isVaril = productType === 'varil';

  const isZLocked = (fragility ?? 0) >= 1 || isPallet;
  const isYLocked = isPallet;

  const widthCm = Number.isFinite(width) ? toCentimeters(width, widthUnit ?? 'cm') : 0;
  const heightCm = Number.isFinite(height) ? toCentimeters(height, heightUnit ?? 'cm') : 0;
  const lengthCm = Number.isFinite(length) ? toCentimeters(length, lengthUnit ?? 'cm') : 0;
  const volumeCm3 = isVaril
    ? Math.PI * (widthCm / 2) ** 2 * heightCm
    : widthCm * heightCm * lengthCm;

  function toggleIncompatibleGroup(group: string) {
    const prev = form.getValues('incompatibleGroups') ?? [];
    const next = prev.includes(group) ? prev.filter((g) => g !== group) : [...prev, group];
    form.setValue('incompatibleGroups', next, { shouldDirty: true });
  }

  const productTypeOnChange = (value: string) => {
    if (!value) return;
    form.setValue('productType', value as 'koli' | 'varil' | 'palet', { shouldDirty: true });
    if (value === 'palet') {
      form.setValue('allowRotateY', false, { shouldValidate: false });
      form.setValue('allowRotateZ', false, { shouldValidate: false });
    } else {
      form.setValue('allowRotateY', true, { shouldValidate: false });
      if ((form.getValues('fragility') ?? 0) < 1) {
        form.setValue('allowRotateZ', true, { shouldValidate: false });
      }
    }
    if (value === 'varil') {
      const w = form.getValues('width');
      const wu = form.getValues('widthUnit');
      if (w !== undefined && Number.isFinite(w)) {
        form.setValue('length', w, { shouldDirty: false, shouldValidate: false });
        form.setValue('lengthUnit', wu ?? 'mm', { shouldDirty: false, shouldValidate: false });
      }
    }
  };

  const formFields = (
    <div className="divide-y divide-border">
      {/* 0. ÜRÜN TİPİ — tam genişlik */}
      <div className="space-y-4 pb-6">
        <SectionTitle>{t('forms.product.sectionType')}</SectionTitle>
        <FormField
          control={form.control}
          name="productType"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <ToggleGroup
                  type="single"
                  value={field.value}
                  onValueChange={productTypeOnChange}
                  className="flex gap-2"
                >
                  {PRODUCT_TYPE_OPTIONS.map(({ value, labelKey, Icon }) => (
                    <ToggleGroupItem
                      key={value}
                      value={value}
                      aria-label={t(labelKey)}
                      className="h-12 flex-1 flex-row gap-2.5 rounded-md px-4 text-sm font-medium text-muted-foreground data-[state=on]:border-primary data-[state=on]:bg-primary/10 data-[state=on]:text-primary"
                    >
                      <Icon className="h-5 w-5 shrink-0" strokeWidth={1.5} />
                      {t(labelKey)}
                    </ToggleGroupItem>
                  ))}
                </ToggleGroup>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      {/* 1. KİMLİK — 4 eşit sütun */}
      <div className="space-y-4 py-6">
        <SectionTitle>{t('forms.product.sectionIdentity')}</SectionTitle>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
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
          <FormField
            control={form.control}
            name="stackGroup"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Yük Grubu</FormLabel>
                <Select value={field.value ?? ''} onValueChange={(v) => field.onChange(v)}>
                  <FormControl>
                    <SelectTrigger className={COMPACT_INPUT}>
                      <SelectValue placeholder="Kimya, Gıda…" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {CARGO_GROUPS.map((g) => (
                      <SelectItem key={g} value={g}>
                        {g}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="maxStackCount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Katman Sayısı</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={1}
                    step={1}
                    className={COMPACT_INPUT}
                    placeholder="3"
                    value={field.value ?? ''}
                    onChange={(e) => {
                      const v =
                        e.target.value === '' ? undefined : Math.max(1, e.target.valueAsNumber);
                      field.onChange(v);
                      form.setValue('isStackable', (v ?? 0) > 1, { shouldValidate: false });
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </div>

      {/* 2. FİZİKSEL ÖZELLİKLER — 4 eşit sütun */}
      <div className="space-y-4 py-6">
        <SectionTitle>{t('forms.product.sectionPhysical')}</SectionTitle>
        <div
          className={cn(
            'grid gap-3',
            isVaril ? 'grid-cols-2 sm:grid-cols-3' : 'grid-cols-2 sm:grid-cols-4',
          )}
        >
          {isVaril ? (
            <>
              <DimensionField
                form={form}
                name="width"
                unitName="widthUnit"
                label={t('forms.product.diameter')}
                placeholder="60"
                onAfterChange={(v, unit) => {
                  if (v !== undefined && Number.isFinite(v)) {
                    form.setValue('length', v, { shouldDirty: false, shouldValidate: false });
                    form.setValue('lengthUnit', unit, {
                      shouldDirty: false,
                      shouldValidate: false,
                    });
                  }
                }}
              />
              <DimensionField
                form={form}
                name="height"
                unitName="heightUnit"
                label={t('forms.product.height')}
                placeholder="120"
              />
            </>
          ) : (
            <>
              <DimensionField
                form={form}
                name="width"
                unitName="widthUnit"
                label={`${t('forms.product.width')} (X)`}
                placeholder="120"
              />
              <DimensionField
                form={form}
                name="height"
                unitName="heightUnit"
                label={`${t('forms.product.height')} (Y)`}
                placeholder="80"
              />
              <DimensionField
                form={form}
                name="length"
                unitName="lengthUnit"
                label={`${t('forms.product.depth')} (Z)`}
                placeholder="100"
              />
            </>
          )}
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
                      placeholder="15.5"
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
      </div>

      {/* 3. KISITLAR — sol: yük kısıtları, sağ: uyumsuz yük grupları */}
      <div className="space-y-4 py-6">
        <SectionTitle>{t('forms.product.sectionConstraints')}</SectionTitle>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* Sol: yük kısıtı chip'leri */}
          <FormField
            control={form.control}
            name="fragility"
            render={() => (
              <FormItem>
                <FormLabel>Yük Kısıtları</FormLabel>
                <div className="flex flex-wrap gap-1.5">
                  {CONSTRAINT_OPTIONS.map((opt) => {
                    const isActive = selectedConstraints.includes(opt.value);
                    return (
                      <Button
                        key={opt.value}
                        type="button"
                        variant="outline"
                        size="sm"
                        className={cn(
                          'h-9 gap-1.5 rounded-md px-3 text-sm font-normal',
                          isActive
                            ? 'border-primary bg-primary/10 text-primary hover:bg-primary/20 hover:text-primary'
                            : 'text-muted-foreground hover:text-foreground',
                        )}
                        onClick={() => {
                          const next = isActive
                            ? selectedConstraints.filter((v) => v !== opt.value)
                            : [...selectedConstraints, opt.value];
                          setSelectedConstraints(next);
                          const maxFragility = next.reduce((acc, v) => {
                            const o = CONSTRAINT_OPTIONS.find((c) => c.value === v);
                            return Math.max(acc, o?.fragilityValue ?? 0);
                          }, 0);
                          form.setValue('fragility', maxFragility, { shouldValidate: false });
                          if (maxFragility >= FRAGILITY_LEVELS.Fragile && !isPallet) {
                            form.setValue('allowRotateZ', false, { shouldValidate: false });
                          } else if (!isPallet) {
                            form.setValue('allowRotateZ', true, { shouldValidate: false });
                          }
                        }}
                      >
                        <opt.Icon className="h-4 w-4" strokeWidth={1.8} />
                        {opt.label}
                      </Button>
                    );
                  })}
                </div>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Sağ: uyumsuz yük grupları */}
          <FormField
            control={form.control}
            name="incompatibleGroups"
            render={() => (
              <FormItem>
                <FormLabel>Uyumsuz Yük Grupları</FormLabel>
                <div className="flex flex-wrap gap-1.5">
                  {INCOMPATIBLE_GROUPS.map(({ value: g, Icon }) => {
                    const selected = (incompatibleGroups ?? []).includes(g);
                    return (
                      <Button
                        key={g}
                        type="button"
                        variant="outline"
                        size="sm"
                        className={cn(
                          'h-9 gap-1.5 rounded-md px-3 text-sm font-normal',
                          selected
                            ? 'border-destructive bg-destructive/10 text-destructive hover:bg-destructive/20 hover:text-destructive'
                            : 'text-muted-foreground hover:text-foreground',
                        )}
                        onClick={() => toggleIncompatibleGroup(g)}
                      >
                        <Icon className="h-4 w-4" strokeWidth={1.5} />
                        {g}
                      </Button>
                    );
                  })}
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Eksen rotasyonu — ürün tipi butonlarıyla tutarlı */}
        <div className="space-y-2">
          <div className="flex items-center gap-1">
            <p className="text-sm font-medium leading-none">Eksen Rotasyonu</p>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5"
                  aria-label={t('forms.product.axisGuideAria')}
                >
                  <HelpCircle className="h-3.5 w-3.5 text-muted-foreground" />
                </Button>
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
          <div className="flex gap-2">
            {ROTATION_AXES.map(({ name: axisFieldName, tooltipKey, axis, axisLabel, subtitle }) => {
              const isDisabled =
                (axisFieldName === 'allowRotateZ' && isZLocked) ||
                (axisFieldName === 'allowRotateY' && isYLocked);
              return (
                <FormField
                  key={axisFieldName}
                  control={form.control}
                  name={axisFieldName}
                  render={({ field }) => (
                    <FormItem className="m-0 flex-1 space-y-0">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            type="button"
                            variant="outline"
                            aria-pressed={field.value}
                            aria-label={
                              isDisabled ? t('forms.product.rotateZLockedWarning') : t(tooltipKey)
                            }
                            disabled={isDisabled}
                            onClick={() => field.onChange(!field.value)}
                            className={cn(
                              'h-12 w-full gap-2.5 rounded-md px-4 text-sm font-medium text-muted-foreground',
                              field.value ? 'border-primary bg-primary/10 text-primary' : '',
                              isDisabled && 'cursor-not-allowed opacity-40',
                            )}
                          >
                            <AxisBoxIllustration axis={axis} active={field.value && !isDisabled} />
                            <span className="font-semibold">{axisLabel}</span>
                            <span className="text-xs font-normal opacity-70">{subtitle}</span>
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          {isDisabled ? t('forms.product.rotateZLockedWarning') : t(tooltipKey)}
                        </TooltipContent>
                      </Tooltip>
                    </FormItem>
                  )}
                />
              );
            })}
          </div>
        </div>
      </div>

      {/* ÖZEL TAŞIMA NOTLARI */}
      <div className="space-y-4 pt-6">
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
                <div className="flex items-center gap-1">
                  <FormLabel>{t('forms.product.notesLabel')}</FormLabel>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5"
                        aria-label={t('forms.product.notesHelper')}
                      >
                        <HelpCircle className="h-3.5 w-3.5 text-muted-foreground" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      {t('forms.product.notesHelper')}
                    </TooltipContent>
                  </Tooltip>
                </div>
                <div className="relative">
                  <FormControl>
                    <Textarea
                      rows={3}
                      maxLength={NOTES_MAX_LENGTH}
                      placeholder={t('forms.product.notesPlaceholder')}
                      className="resize-none overflow-y-auto border-input bg-background pb-6 focus-visible:ring-2 focus-visible:ring-primary/40"
                      {...field}
                      value={value}
                      onChange={(e) => {
                        const next = e.target.value.slice(0, NOTES_MAX_LENGTH);
                        field.onChange(next);
                      }}
                    />
                  </FormControl>
                  <span
                    aria-live="polite"
                    className={cn(
                      'pointer-events-none absolute bottom-2 right-3 text-xs tabular-nums',
                      isOverLimit ? 'font-semibold text-destructive' : 'text-muted-foreground',
                    )}
                  >
                    {t('forms.product.notesCounter', { count: charCount, max: NOTES_MAX_LENGTH })}
                  </span>
                </div>
                <FormMessage />
              </FormItem>
            );
          }}
        />
      </div>
    </div>
  );

  return (
    <TooltipProvider delayDuration={150}>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FormWithPreviewLayout
            formContent={formFields}
            previewContent={
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
            }
          />

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
        </form>
      </Form>
    </TooltipProvider>
  );
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
  const hasDimensions =
    productType === 'varil'
      ? widthCm > 0 && heightCm > 0
      : widthCm > 0 && heightCm > 0 && depthCm > 0;

  const summaryRows = [
    { label: t('forms.product.name'), value: name || '—', bold: true },
    { label: t('forms.product.width'), value: fmt(width, widthUnit) },
    { label: t('forms.product.height'), value: fmt(height, heightUnit) },
    { label: t('forms.product.length'), value: fmt(length, lengthUnit) },
    { label: t('forms.product.weight'), value: fmt(weight, weightUnit) },
    { label: 'Kısıtlar', value: fragilityLabel },
    { label: 'Katman', value: maxStackCount > 0 ? String(maxStackCount) : '—' },
    {
      label: 'Rotasyon',
      value: allRotationsFree
        ? t('forms.product.summaryRotationFree')
        : t('forms.product.summaryRotationLocked', { axes: lockedAxes.join(', ') }),
    },
  ];

  return (
    <div className="flex h-full flex-col rounded-xl border border-border bg-background p-3">
      {/* Başlık */}
      <div className="mb-2 flex items-center justify-between">
        <p className="text-[10px] text-muted-foreground">Ürün Önizleme</p>
        <span className="rounded border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground">
          3D
        </span>
      </div>

      {/* 3D Alan — flex-1 ile kalan alanı doldurur */}
      <div className="relative min-h-[160px] flex-1 overflow-hidden rounded-lg bg-muted/40">
        {hasDimensions ? (
          <ProductPreview3D
            widthCm={widthCm}
            heightCm={heightCm}
            depthCm={depthCm}
            productType={productType}
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-muted-foreground">
            <ProductTypeIllustration type={productType} />
            <p className="px-4 text-center text-[10px] uppercase tracking-wide">
              {t('forms.product.previewPlaceholder')}
            </p>
          </div>
        )}
      </div>

      {/* Hacim */}
      <div className="mt-2 flex items-center justify-between border-t border-border/50 pt-2">
        <span className="text-[10px] text-muted-foreground">Hacim</span>
        <span className="text-xs font-semibold tabular-nums text-foreground">
          {volumeCm3 > 0 ? formatVolume(volumeCm3) : '—'}
        </span>
      </div>

      {/* Özet satırları */}
      <div className="mt-1 flex flex-col">
        {summaryRows.map((r) => (
          <div
            key={r.label as string}
            className="flex items-center justify-between border-b border-border/50 py-1 last:border-0"
          >
            <span className="text-[10px] text-muted-foreground">{r.label}</span>
            <span
              className={cn(
                'text-xs tabular-nums',
                r.bold ? 'font-medium text-foreground' : 'text-muted-foreground',
              )}
            >
              {r.value}
            </span>
          </div>
        ))}
      </div>

      {/* Notlar */}
      {notes && notes.trim().length > 0 && (
        <div className="mt-2 rounded-lg border border-border/50 bg-muted/40 p-2">
          <p className="mb-1 text-[10px] font-medium text-muted-foreground">
            {t('forms.product.notesSummaryLabel')}
          </p>
          <p className="whitespace-pre-wrap break-words text-[10px] text-foreground">{notes}</p>
        </div>
      )}
    </div>
  );
}

interface DimensionFieldProps {
  form: ReturnType<typeof useProductForm>;
  name: 'width' | 'height' | 'length';
  unitName: 'widthUnit' | 'heightUnit' | 'lengthUnit';
  label: string;
  placeholder?: string;
  onAfterChange?: (value: number | undefined, unit: DimensionUnitKey) => void;
}

function DimensionField({
  form,
  name,
  unitName,
  label,
  placeholder,
  onAfterChange,
}: DimensionFieldProps) {
  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <div className="relative">
            <FormControl>
              <Input
                type="number"
                step="0.1"
                min={0}
                placeholder={placeholder}
                className={COMPACT_INPUT_WITH_UNIT}
                {...field}
                value={field.value ?? ''}
                onChange={(e) => {
                  const v = e.target.value === '' ? undefined : e.target.valueAsNumber;
                  field.onChange(v);
                  if (onAfterChange) {
                    onAfterChange(v, form.getValues(unitName) ?? 'mm');
                  }
                }}
              />
            </FormControl>
            <Controller
              control={form.control}
              name={unitName}
              render={({ field: unitField }) => (
                <Select
                  value={unitField.value}
                  onValueChange={(u) => {
                    unitField.onChange(u);
                    if (onAfterChange) {
                      onAfterChange(form.getValues(name), u as DimensionUnitKey);
                    }
                  }}
                >
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
