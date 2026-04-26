import type { ComponentType, ReactNode } from 'react';
import { Controller, useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeftRight,
  ArrowUpDown,
  Box,
  Cylinder,
  HelpCircle,
  Info,
  Layers,
  Move3d,
  Package,
  PackageOpen,
  RotateCcw,
  Ruler,
  ShieldOff,
  Tag,
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
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
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

const ROTATION_AXES = [
  {
    name: 'allowRotateX',
    labelKey: 'forms.product.allowRotateX',
    tooltipKey: 'forms.product.axisXTooltip',
    Icon: ArrowLeftRight,
  },
  {
    name: 'allowRotateY',
    labelKey: 'forms.product.allowRotateY',
    tooltipKey: 'forms.product.axisYTooltip',
    Icon: ArrowUpDown,
  },
  {
    name: 'allowRotateZ',
    labelKey: 'forms.product.allowRotateZ',
    tooltipKey: 'forms.product.axisZTooltip',
    Icon: Move3d,
  },
] as const;

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

  const [width, widthUnit, height, heightUnit, length, lengthUnit, maxStackCount] = useWatch({
    control: form.control,
    name: ['width', 'widthUnit', 'height', 'heightUnit', 'length', 'lengthUnit', 'maxStackCount'],
  });

  const isNonStackable = !maxStackCount || maxStackCount <= 1;

  const widthCm = Number.isFinite(width) ? toCentimeters(width, widthUnit ?? 'cm') : 0;
  const heightCm = Number.isFinite(height) ? toCentimeters(height, heightUnit ?? 'cm') : 0;
  const lengthCm = Number.isFinite(length) ? toCentimeters(length, lengthUnit ?? 'cm') : 0;
  const volumeCm3 = widthCm * heightCm * lengthCm;

  return (
    <TooltipProvider delayDuration={150}>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          {/* Bölüm 1 — Kimlik */}
          <section className="space-y-4">
            <SectionTitle icon={Tag}>{t('forms.product.sectionIdentity')}</SectionTitle>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('forms.product.name')}</FormLabel>
                    <FormControl>
                      <Input placeholder={t('forms.product.namePlaceholder')} {...field} />
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
                      <Input placeholder={t('forms.product.skuPlaceholder')} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </section>

          {/* Bölüm 2 — Ürün Tipi */}
          <section className="space-y-4">
            <SectionTitle icon={PackageOpen}>{t('forms.product.sectionType')}</SectionTitle>
            <FormField
              control={form.control}
              name="productType"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <ToggleGroup
                      type="single"
                      value={field.value}
                      onValueChange={(value) => value && field.onChange(value)}
                      className="flex-wrap"
                    >
                      {PRODUCT_TYPE_OPTIONS.map(({ value, labelKey, Icon }) => (
                        <ToggleGroupItem key={value} value={value} aria-label={t(labelKey)}>
                          <Icon className="h-6 w-6" strokeWidth={1.5} />
                          <span className="text-xs">{t(labelKey)}</span>
                        </ToggleGroupItem>
                      ))}
                    </ToggleGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </section>

          {/* Bölüm 3 — Fiziksel Özellikler */}
          <section className="space-y-4">
            <SectionTitle icon={Ruler}>{t('forms.product.sectionPhysical')}</SectionTitle>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
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
            </div>

            <div
              aria-live="polite"
              className="flex items-center justify-between rounded-md border bg-muted/40 px-3 py-2 text-sm"
            >
              <span className="text-muted-foreground">{t('forms.product.volume')}</span>
              <span className="font-medium">{volumeCm3 > 0 ? formatVolume(volumeCm3) : '—'}</span>
            </div>

            <FormField
              control={form.control}
              name="weight"
              render={({ field }) => (
                <FormItem className="md:max-w-md">
                  <FormLabel>{t('forms.product.weight')}</FormLabel>
                  <div className="flex gap-2">
                    <FormControl>
                      <Input
                        type="number"
                        step="0.1"
                        min={0}
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
                          <SelectTrigger className="w-24">
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
          </section>

          {/* Bölüm 4 — Kısıtlar */}
          <section className="space-y-4">
            <SectionTitle icon={ShieldOff}>{t('forms.product.sectionConstraints')}</SectionTitle>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <FormField
                control={form.control}
                name="maxStackCount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <Layers className="h-4 w-4 text-muted-foreground" />
                      {t('forms.product.layerCount')}
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        step={1}
                        placeholder="1"
                        {...field}
                        value={field.value ?? ''}
                        onChange={(e) => {
                          const value = e.target.value === '' ? 1 : e.target.valueAsNumber;
                          field.onChange(value);
                          form.setValue('isStackable', value > 1, { shouldValidate: false });
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div
                className={cn(
                  'flex items-center gap-3 rounded-md border p-3 transition-colors',
                  isNonStackable
                    ? 'border-amber-300 bg-amber-50 text-amber-800'
                    : 'border-border bg-muted/40 text-muted-foreground',
                )}
              >
                <ShieldOff className="h-5 w-5 shrink-0" />
                <div className="flex flex-col">
                  <span className="text-sm font-medium">{t('forms.product.nonStackable')}</span>
                  <span className="text-xs opacity-80">
                    {isNonStackable
                      ? t('forms.product.nonStackableActive')
                      : t('forms.product.nonStackableInactive')}
                  </span>
                </div>
              </div>
            </div>

            {/* Rotasyon — yan yana kutu şeklinde, eksen ikonları + tooltip */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <RotateCcw className="h-4 w-4 text-muted-foreground" />
                <p className="text-sm font-medium">{t('forms.product.rotation')}</p>
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

              <div className="grid grid-cols-3 gap-3">
                {ROTATION_AXES.map(({ name, labelKey, tooltipKey, Icon }) => (
                  <FormField
                    key={name}
                    control={form.control}
                    name={name}
                    render={({ field }) => (
                      <FormItem
                        className={cn(
                          'flex flex-col items-center gap-2 rounded-md border p-4 text-center transition-colors',
                          field.value
                            ? 'border-primary/40 bg-primary/5'
                            : 'border-border bg-muted/30',
                        )}
                      >
                        <Icon
                          className={cn(
                            'h-6 w-6',
                            field.value ? 'text-primary' : 'text-muted-foreground',
                          )}
                          strokeWidth={1.5}
                        />
                        <div className="flex items-center gap-1">
                          <FormLabel className="m-0 text-sm font-medium">{t(labelKey)}</FormLabel>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button type="button" aria-label={t(tooltipKey)}>
                                <Info className="h-3.5 w-3.5 text-muted-foreground" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent>{t(tooltipKey)}</TooltipContent>
                          </Tooltip>
                        </div>
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                ))}
              </div>
            </div>
          </section>

          <div className="flex gap-3 pt-2">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? t('forms.product.submitting') : t('forms.product.submit')}
            </Button>
            {onCancel && (
              <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
                {t('forms.product.cancel')}
              </Button>
            )}
          </div>
        </form>
      </Form>
    </TooltipProvider>
  );
}

interface SectionTitleProps {
  children: ReactNode;
  icon?: ComponentType<{ className?: string }>;
}

function SectionTitle({ children, icon: Icon }: SectionTitleProps) {
  return (
    <div className="flex items-center gap-2 border-b pb-2">
      {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
      <h3 className={cn('text-sm font-semibold uppercase tracking-wide text-muted-foreground')}>
        {children}
      </h3>
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
          <div className="flex gap-2">
            <FormControl>
              <Input
                type="number"
                step="0.1"
                min={0}
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
                  <SelectTrigger className="w-24">
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
