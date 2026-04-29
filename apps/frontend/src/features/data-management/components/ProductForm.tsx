import type { ReactNode } from 'react';
import { Controller, useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Ban, Box, Cylinder, Droplets, HelpCircle, Move3d, Package, Wine } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
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

interface ProductFormProps {
  defaultValues?: Partial<ProductFormValues>;
  onSubmit: (values: ProductFormValues) => void;
  onCancel?: () => void;
  isSubmitting?: boolean;
}

const DIMENSION_KEYS = Object.keys(DIMENSION_UNITS) as DimensionUnitKey[];
const WEIGHT_KEYS = Object.keys(WEIGHT_UNITS) as Array<keyof typeof WEIGHT_UNITS>;

const PRODUCT_TYPE_OPTIONS = [
  { value: 'box', labelKey: 'forms.product.typeBox', Icon: Box },
  { value: 'barrel', labelKey: 'forms.product.typeBarrel', Icon: Cylinder },
  { value: 'pallet', labelKey: 'forms.product.typePallet', Icon: Package },
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

const COMPACT_INPUT = 'h-9 border-zinc-200 bg-zinc-50';
const COMPACT_INPUT_WITH_UNIT = 'h-9 border-zinc-200 bg-zinc-50 pr-16';
const UNIT_TRIGGER =
  'absolute right-1 top-1/2 h-7 w-14 -translate-y-1/2 gap-1 border-0 bg-transparent px-2 py-0 text-xs text-muted-foreground shadow-none focus:ring-0 focus:ring-offset-0';

interface NonStackableIconProps {
  className?: string;
}

function NonStackableIcon({ className }: NonStackableIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <rect x="3" y="3" width="18" height="15" rx="2" />
      <path d="M9 15 V8" />
      <path d="M6 11 L9 8 L12 11" />
      <path d="M15 15 V8" />
      <path d="M12 11 L15 8 L18 11" />
      <line x1="2" y1="21" x2="22" y2="21" />
    </svg>
  );
}

interface ProductTypeIllustrationProps {
  type: 'box' | 'barrel' | 'pallet';
}

function ProductTypeIllustration({ type }: ProductTypeIllustrationProps) {
  const stroke = 'currentColor';

  if (type === 'barrel') {
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

  if (type === 'pallet') {
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
  if (cm3 >= 1_000_000) return `${(cm3 / 1_000_000).toFixed(3)} m³`;
  if (cm3 >= 1_000) return `${(cm3 / 1_000).toFixed(2)} dm³`;
  return `${cm3.toFixed(1)} cm³`;
}

export function ProductForm({
  defaultValues,
  onSubmit,
  onCancel,
  isSubmitting = false,
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

  const isNonStackableSelected = fragility === FRAGILITY_LEVELS.NonFragile;

  const isZLocked = (fragility ?? 0) >= 1;

  const widthCm = Number.isFinite(width) ? toCentimeters(width, widthUnit ?? 'cm') : 0;
  const heightCm = Number.isFinite(height) ? toCentimeters(height, heightUnit ?? 'cm') : 0;
  const lengthCm = Number.isFinite(length) ? toCentimeters(length, lengthUnit ?? 'cm') : 0;
  const volumeCm3 = widthCm * heightCm * lengthCm;

  return (
    <TooltipProvider delayDuration={150}>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px]">
            {/* SOL — Form alanları */}
            <div className="space-y-8">
              {/* Kimlik */}
              <section className="space-y-3">
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
              </section>

              {/* Ürün Tipi & Hassasiyet */}
              <section className="space-y-3">
                <SectionTitle>{t('forms.product.sectionType')}</SectionTitle>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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
                            onValueChange={(value) => value && field.onChange(value)}
                            className="flex flex-wrap"
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

                  <FormField
                    control={form.control}
                    name="fragility"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="block">{t('forms.product.fragility')}</FormLabel>
                        <FormControl>
                          <ToggleGroup
                            type="single"
                            value={String(field.value)}
                            onValueChange={(value) => {
                              if (value === '') return;
                              const num = Number(value);
                              field.onChange(num);
                              if (num === FRAGILITY_LEVELS.NonFragile) {
                                form.setValue('maxStackCount', 1, { shouldValidate: false });
                                form.setValue('isStackable', false, { shouldValidate: false });
                              }
                              if (num >= FRAGILITY_LEVELS.Fragile) {
                                form.setValue('allowRotateZ', false, { shouldValidate: false });
                              }
                            }}
                            className="flex flex-wrap"
                          >
                            <ToggleGroupItem value={String(FRAGILITY_LEVELS.NonFragile)}>
                              <NonStackableIcon className="h-5 w-5" />
                              <span className="text-xs">
                                {t('forms.product.fragilityNonFragile')}
                              </span>
                            </ToggleGroupItem>
                            <ToggleGroupItem value={String(FRAGILITY_LEVELS.Fragile)}>
                              <Wine className="h-5 w-5 text-amber-500" strokeWidth={1.5} />
                              <span className="text-xs">{t('forms.product.fragilityFragile')}</span>
                            </ToggleGroupItem>
                            <ToggleGroupItem value={String(FRAGILITY_LEVELS.Liquid)}>
                              <Droplets className="h-5 w-5 text-blue-500" strokeWidth={1.5} />
                              <span className="text-xs">{t('forms.product.fragilityLiquid')}</span>
                            </ToggleGroupItem>
                          </ToggleGroup>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </section>

              {/* Fiziksel Özellikler — Genişlik / Yükseklik / Uzunluk / Ağırlık / Katman Sayısı */}
              <section className="space-y-3">
                <SectionTitle>{t('forms.product.sectionPhysical')}</SectionTitle>
                <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
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
                  <FormField
                    control={form.control}
                    name="maxStackCount"
                    render={({ field }) => {
                      const lockToOne = fragility === FRAGILITY_LEVELS.NonFragile;
                      return (
                        <FormItem>
                          <div className="flex items-center justify-between gap-2">
                            <FormLabel className="m-0">{t('forms.product.layerCount')}</FormLabel>
                            <Badge
                              variant="outline"
                              aria-hidden={!isNonStackableSelected}
                              className={cn(
                                'h-5 gap-1 border-amber-300 bg-amber-50 px-1.5 text-[10px] text-amber-800',
                                !isNonStackableSelected && 'invisible',
                              )}
                            >
                              {t('forms.product.nonStackable')}
                            </Badge>
                          </div>
                          <FormControl>
                            <Input
                              type="number"
                              min={1}
                              step={1}
                              placeholder="1"
                              disabled={lockToOne}
                              className={cn(COMPACT_INPUT, lockToOne && 'cursor-not-allowed')}
                              {...field}
                              value={lockToOne ? 1 : (field.value ?? '')}
                              onChange={(e) => {
                                if (lockToOne) return;
                                const value = e.target.value === '' ? 1 : e.target.valueAsNumber;
                                field.onChange(value);
                                form.setValue('isStackable', value > 1, { shouldValidate: false });
                              }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      );
                    }}
                  />
                </div>
              </section>

              {/* Kısıtlar — sadece eksen rotasyonu */}
              <section className="space-y-3">
                <div className="flex items-center justify-between">
                  <SectionTitle>{t('forms.product.sectionConstraints')}</SectionTitle>
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
                    const isDisabled = axisFieldName === 'allowRotateZ' && isZLocked;
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

              {/* Özel Taşıma Notları */}
              <section className="space-y-3">
                <SectionTitle>{t('forms.product.sectionNotes')}</SectionTitle>
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
                          <p className="text-muted-foreground">{t('forms.product.notesHelper')}</p>
                          <span
                            aria-live="polite"
                            className={cn(
                              'shrink-0 tabular-nums',
                              isOverLimit ? 'font-semibold text-red-600' : 'text-muted-foreground',
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

            {/* SAĞ — 3D Önizleme (Three.js placeholder) */}
            <PreviewPanel
              name={name}
              productType={productType ?? 'box'}
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

          {/* Aksiyonlar — sayfa genişliği boyunca, en sağda */}
          <div className="flex justify-end gap-3 border-t pt-4">
            {onCancel && (
              <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
                {t('forms.product.cancel')}
              </Button>
            )}
            <Button type="submit" disabled={isSubmitting}>
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
  productType: 'box' | 'barrel' | 'pallet';
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

  return (
    <aside className="lg:sticky lg:top-6 lg:self-start">
      <div className="flex flex-col gap-4">
        {/* 3D placeholder kutusu */}
        <div className="relative flex aspect-square items-center justify-center overflow-hidden rounded-xl border border-dashed border-zinc-300 bg-zinc-50">
          <div className="flex flex-col items-center gap-3 text-zinc-400">
            <div className="text-zinc-500">
              <ProductTypeIllustration type={productType} />
            </div>
            <p className="px-6 text-center text-xs uppercase tracking-wide">
              {t('forms.product.previewPlaceholder')}
            </p>
          </div>
        </div>

        {/* Anlık Hacim — 3D placeholder hemen altı */}
        <div className="flex items-baseline justify-between rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {t('forms.product.volume')}
          </span>
          <span className="text-lg font-semibold tabular-nums text-foreground">
            {volumeCm3 > 0 ? formatVolume(volumeCm3) : '—'}
          </span>
        </div>

        {/* Canlı veri özeti */}
        <dl className="space-y-2 text-sm">
          <PreviewRow label={t('forms.product.name')} value={name || '—'} emphasize />
          <PreviewRow label={t('forms.product.width')} value={fmt(width, widthUnit)} />
          <PreviewRow label={t('forms.product.height')} value={fmt(height, heightUnit)} />
          <PreviewRow label={t('forms.product.length')} value={fmt(length, lengthUnit)} />
          <PreviewRow label={t('forms.product.weight')} value={fmt(weight, weightUnit)} />
          <PreviewRow label={t('forms.product.fragility')} value={fragilityLabel} />
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

        {notes && notes.trim().length > 0 && (
          <div className="rounded-md border border-dashed border-zinc-300 bg-zinc-50 p-3 text-xs text-foreground">
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

interface SectionTitleProps {
  children: ReactNode;
}

function SectionTitle({ children }: SectionTitleProps) {
  return (
    <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
      {children}
    </h3>
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
