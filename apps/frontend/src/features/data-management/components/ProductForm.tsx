import { useState, type ReactNode, type ComponentType } from 'react';
import { useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import {
  Box,
  Cpu,
  Cylinder,
  Droplets,
  Flame,
  FlaskConical,
  HelpCircle,
  Lock,
  Package,
  Sun,
  Utensils,
  Wind,
  Wine,
  Zap,
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
  FRAGILITY_LEVELS,
  NOTES_MAX_LENGTH,
  toCentimeters,
  type ProductFormValues,
} from '@/features/data-management/schemas/productSchema';
import { useUnitStore } from '@/lib/store/useUnitStore';
import { formatVolumeDisplay } from '@/lib/utils/unitConversion';
import { cn } from '@/lib/utils';
import { ProductPreview3D } from '@/features/data-management/components/ProductPreview3D';
import { FormWithPreviewLayout } from '@/components/shared/FormWithPreviewLayout';

interface ProductFormProps {
  defaultValues?: Partial<ProductFormValues>;
  onSubmit: (values: ProductFormValues) => void;
  onDraftSubmit?: (values: ProductFormValues) => void;
  onCancel?: () => void;
  isSubmitting?: boolean;
  disableSubmitWhenPristine?: boolean;
  submitLabel?: string;
}

const PRODUCT_TYPE_OPTIONS = [
  { value: 'koli', labelKey: 'forms.product.typeBox', Icon: Box },
  { value: 'varil', labelKey: 'forms.product.typeBarrel', Icon: Cylinder },
  { value: 'palet', labelKey: 'forms.product.typePallet', Icon: Package },
] as const;

type AxisKey = 'x' | 'y' | 'z';

const ROTATION_AXES = [
  {
    name: 'allowRotateX' as const,
    labelKey: 'forms.product.allowRotateX',
    tooltipKey: 'forms.product.axisXTooltip',
    axis: 'x' as AxisKey,
    axisLabel: 'X',
    subtitle: 'Sol / Sağ',
  },
  {
    name: 'allowRotateY' as const,
    labelKey: 'forms.product.allowRotateY',
    tooltipKey: 'forms.product.axisYTooltip',
    axis: 'y' as AxisKey,
    axisLabel: 'Y',
    subtitle: 'Yukarı / Aşağı',
  },
  {
    name: 'allowRotateZ' as const,
    labelKey: 'forms.product.allowRotateZ',
    tooltipKey: 'forms.product.axisZTooltip',
    axis: 'z' as AxisKey,
    axisLabel: 'Z',
    subtitle: 'Öne / Arkaya',
  },
] as const;

const COMPACT_INPUT = 'h-9 border-input bg-background';
const COMPACT_INPUT_WITH_UNIT = 'h-9 border-input bg-background pr-10';

type ConstraintColor = 'default' | 'amber' | 'blue' | 'orange' | 'green' | 'purple';

const ICON_COLOR_CLASSES: Record<ConstraintColor, string> = {
  default: 'text-foreground',
  amber: 'text-amber-500',
  blue: 'text-blue-500',
  orange: 'text-orange-500',
  green: 'text-green-500',
  purple: 'text-purple-500',
};

type ConstraintOption = {
  value: string;
  label: string;
  color: ConstraintColor;
  Icon: ComponentType<{ className?: string; strokeWidth?: string | number }>;
  fragilityValue?: number;
  incompatibleGroups?: readonly string[];
};

function CorrosiveIcon({
  className,
  strokeWidth = 2,
}: {
  className?: string;
  strokeWidth?: string | number;
}) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M9 3H5v4l7 9 7-9V3h-4" />
      <path d="M9 3l3 4 3-4" />
      <path d="M5 21c2-2 4-2 7-2s5 0 7 2" />
    </svg>
  );
}

const CONSTRAINT_OPTIONS: ConstraintOption[] = [
  {
    value: 'fragile',
    label: 'Kırılgan',
    color: 'amber',
    Icon: Wine,
    fragilityValue: FRAGILITY_LEVELS.Fragile,
    incompatibleGroups: [],
  },
  {
    value: 'liquid',
    label: 'Sıvı',
    color: 'blue',
    Icon: Droplets,
    fragilityValue: FRAGILITY_LEVELS.Liquid,
    incompatibleGroups: ['Elektronik'],
  },
  {
    value: 'flammable',
    label: 'Yanıcı',
    color: 'orange',
    Icon: Flame,
    fragilityValue: FRAGILITY_LEVELS.Flammable,
    incompatibleGroups: ['Gıda', 'Elektronik'],
  },
  {
    value: 'oxidizing',
    label: 'Yakıcı',
    color: 'amber',
    Icon: Zap,
    fragilityValue: FRAGILITY_LEVELS.Oxidizing,
    incompatibleGroups: ['Gıda', 'Genel'],
  },
  {
    value: 'corrosive',
    label: 'Aşındırıcı',
    color: 'green',
    Icon: CorrosiveIcon,
    fragilityValue: FRAGILITY_LEVELS.Corrosive,
    incompatibleGroups: ['Gıda', 'Genel', 'Elektronik'],
  },
  {
    value: 'odor',
    label: 'Kokuya Hassas',
    color: 'purple',
    Icon: Wind,
    fragilityValue: FRAGILITY_LEVELS.OdorSensitive,
    incompatibleGroups: ['Kimya', 'Tehlikeli Madde'],
  },
  {
    value: 'food',
    label: 'Gıda Teması',
    color: 'default',
    Icon: Utensils,
    fragilityValue: FRAGILITY_LEVELS.FoodContact,
    incompatibleGroups: ['Kimya', 'Tehlikeli Madde'],
  },
  {
    value: 'dry',
    label: 'Kuru',
    color: 'default',
    Icon: Sun,
    fragilityValue: FRAGILITY_LEVELS.KeepDry,
    incompatibleGroups: ['Gıda'],
  },
  {
    value: 'chemical',
    label: 'Kimyasal',
    color: 'purple',
    Icon: FlaskConical,
    fragilityValue: FRAGILITY_LEVELS.Chemical,
    incompatibleGroups: ['Gıda', 'Genel'],
  },
];

const CARGO_GROUPS = ['Kimya', 'Gıda', 'Genel', 'Tehlikeli Madde', 'Elektronik', 'Tekstil'];
const INCOMPATIBLE_GROUPS = [
  { value: 'Gıda', Icon: Utensils },
  { value: 'Genel', Icon: Package },
  { value: 'Tehlikeli Madde', Icon: Flame },
  { value: 'Kimya', Icon: FlaskConical },
  { value: 'Elektronik', Icon: Cpu },
  { value: 'Tekstil', Icon: Package },
] as const;

const INCOMPATIBLE_BY_GROUP: Record<string, string[]> = {
  Kimya: ['Gıda', 'Elektronik', 'Tekstil'],
  'Tehlikeli Madde': ['Gıda', 'Genel', 'Tekstil'],
  Gıda: ['Kimya', 'Tehlikeli Madde'],
  Elektronik: ['Kimya', 'Tehlikeli Madde'],
  Tekstil: ['Kimya', 'Tehlikeli Madde'],
  Genel: ['Tehlikeli Madde'],
};

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
  const isLocked = !active;
  const topFill = '#4b5563';
  const sideFill = '#6b7280';
  const sideDark = '#374151';
  const strokeCol = '#1f2937';
  const arrowCol = '#ffffff';
  const AW = 2.5;

  return (
    <div className="relative flex items-center justify-center">
      <svg
        viewBox="0 0 100 96"
        fill="none"
        style={{
          width: 66,
          height: 60,
          minWidth: 66,
          flexShrink: 0,
          opacity: isLocked ? 0.28 : 1,
          filter: isLocked ? 'grayscale(1)' : 'none',
          transition: 'opacity 0.15s, filter 0.15s',
        }}
      >
        {axis === 'x' && (
          <>
            <path
              d="M50 4 L82 20 L50 36 L18 20 Z"
              fill={topFill}
              stroke={strokeCol}
              strokeWidth="1"
              strokeLinejoin="round"
            />
            <path
              d="M82 20 L82 82 L50 94 L50 36 Z"
              fill={sideFill}
              stroke={strokeCol}
              strokeWidth="1"
              strokeLinejoin="round"
            />
            <path
              d="M18 20 L18 82 L50 94 L50 36 Z"
              fill={sideDark}
              stroke={strokeCol}
              strokeWidth="1"
              strokeLinejoin="round"
            />
            {!isLocked && (
              <>
                <path
                  d="M10 26 A 22 26 0 0 0 10 72"
                  stroke={arrowCol}
                  strokeWidth={AW}
                  fill="none"
                  strokeLinecap="round"
                />
                <polygon points="10,82 3,70 17,70" fill={arrowCol} />
                <path
                  d="M90 70 A 22 26 0 0 0 90 26"
                  stroke={arrowCol}
                  strokeWidth={AW}
                  fill="none"
                  strokeLinecap="round"
                />
                <polygon points="90,16 83,28 97,28" fill={arrowCol} />
              </>
            )}
          </>
        )}
        {axis === 'y' && (
          <>
            <path
              d="M50 26 L90 40 L50 54 L10 40 Z"
              fill={topFill}
              stroke={strokeCol}
              strokeWidth="1"
              strokeLinejoin="round"
            />
            <path
              d="M90 40 L90 68 L50 78 L50 54 Z"
              fill={sideFill}
              stroke={strokeCol}
              strokeWidth="1"
              strokeLinejoin="round"
            />
            <path
              d="M10 40 L10 68 L50 78 L50 54 Z"
              fill={sideDark}
              stroke={strokeCol}
              strokeWidth="1"
              strokeLinejoin="round"
            />
            {!isLocked && (
              <>
                <path
                  d="M20 37 A 34 12 0 0 1 78 37"
                  stroke={arrowCol}
                  strokeWidth={AW}
                  fill="none"
                  strokeLinecap="round"
                />
                <polygon points="88,37 77,30 77,44" fill={arrowCol} />
                <path
                  d="M80 47 A 34 12 0 0 1 22 47"
                  stroke={arrowCol}
                  strokeWidth={AW}
                  fill="none"
                  strokeLinecap="round"
                />
                <polygon points="12,47 23,40 23,54" fill={arrowCol} />
              </>
            )}
          </>
        )}
        {axis === 'z' && (
          <>
            <path
              d="M50 10 L84 26 L50 42 L16 26 Z"
              fill={topFill}
              stroke={strokeCol}
              strokeWidth="1"
              strokeLinejoin="round"
            />
            <path
              d="M84 26 L84 72 L50 88 L50 42 Z"
              fill={sideFill}
              stroke={strokeCol}
              strokeWidth="1"
              strokeLinejoin="round"
            />
            <path
              d="M16 26 L16 72 L50 88 L50 42 Z"
              fill={sideDark}
              stroke={strokeCol}
              strokeWidth="1"
              strokeLinejoin="round"
            />
            {!isLocked && (
              <>
                <path
                  d="M90 30 A 20 24 0 0 1 90 70"
                  stroke={arrowCol}
                  strokeWidth={AW}
                  fill="none"
                  strokeLinecap="round"
                />
                <polygon points="90,80 83,68 97,68" fill={arrowCol} />
                <path
                  d="M10 68 A 20 24 0 0 1 10 28"
                  stroke={arrowCol}
                  strokeWidth={AW}
                  fill="none"
                  strokeLinecap="round"
                />
                <polygon points="10,18 3,30 17,30" fill={arrowCol} />
              </>
            )}
          </>
        )}
      </svg>
      {isLocked && <Lock className="absolute h-4 w-4 text-muted-foreground/60" />}
    </div>
  );
}

export function ProductForm({
  defaultValues,
  onSubmit,
  onDraftSubmit,
  onCancel,
  isSubmitting = false,
  disableSubmitWhenPristine = false,
  submitLabel,
}: ProductFormProps) {
  const { t } = useTranslation();
  const form = useProductForm(defaultValues);

  const [selectedConstraints, setSelectedConstraints] = useState<string[]>(() => {
    if (defaultValues?.constraintIds && defaultValues.constraintIds.length > 0) {
      return CONSTRAINT_OPTIONS.filter(
        (o) =>
          o.fragilityValue !== undefined && defaultValues.constraintIds!.includes(o.fragilityValue),
      ).map((o) => o.value);
    }
    const frag = defaultValues?.fragility ?? 0;
    if (frag === 0) return [];
    const match = CONSTRAINT_OPTIONS.find((o) => o.fragilityValue === frag);
    return match ? [match.value] : [];
  });

  const dimensionUnit = useUnitStore((s) => s.dimensionUnit);
  const weightUnit = useUnitStore((s) => s.weightUnit);

  const [
    width,
    height,
    length,
    maxStackCount,
    productType,
    name,
    weight,
    fragility,
    allowRotateX,
    allowRotateY,
    allowRotateZ,
    notes,
    incompatibleGroups,
    stackGroup,
  ] = useWatch({
    control: form.control,
    name: [
      'width',
      'height',
      'length',
      'maxStackCount',
      'productType',
      'name',
      'weight',
      'fragility',
      'allowRotateX',
      'allowRotateY',
      'allowRotateZ',
      'notes',
      'incompatibleGroups',
      'stackGroup',
    ],
  });

  // Yerel display state'ler: React controlled input'u yeniden yazarken cursor
  // sıfırlanmasını önlemek için ham string saklanır. defaultValues ile init
  // edilir; sonraki senkronizasyon onChange handler'larında yapılır.
  const [weightDisplay, setWeightDisplay] = useState<string>(() =>
    defaultValues?.weight != null && Number.isFinite(defaultValues.weight)
      ? String(defaultValues.weight)
      : '',
  );
  const [maxStackDisplay, setMaxStackDisplay] = useState<string>(() =>
    defaultValues?.maxStackCount != null ? String(defaultValues.maxStackCount) : '',
  );

  const isPallet = productType === 'palet';
  const isVaril = productType === 'varil';

  const isZLocked = (fragility ?? 0) >= 1 || isPallet;
  const isYLocked = isPallet;

  const widthCm = Number.isFinite(width) ? toCentimeters(width, dimensionUnit) : 0;
  const heightCm = Number.isFinite(height) ? toCentimeters(height, dimensionUnit) : 0;
  const lengthCm = Number.isFinite(length) ? toCentimeters(length, dimensionUnit) : 0;
  const volumeCm3 = isVaril
    ? Math.PI * (widthCm / 2) ** 2 * heightCm
    : widthCm * heightCm * lengthCm;

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
                  onValueChange={(value) => {
                    if (!value) return;
                    field.onChange(value);
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
                      if (w !== undefined && Number.isFinite(w)) {
                        form.setValue('length', w, { shouldDirty: false, shouldValidate: false });
                      }
                    }
                  }}
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
        <SectionTitle>Kimlik Bilgileri</SectionTitle>
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
                    value={field.value ?? ''}
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
                    value={field.value ?? ''}
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
                <Select
                  value={field.value ?? ''}
                  onValueChange={(v) => {
                    field.onChange(v);
                    const autoGroups = INCOMPATIBLE_BY_GROUP[v] ?? [];
                    form.setValue('incompatibleGroups', autoGroups, { shouldDirty: true });
                  }}
                >
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
                <FormLabel>İstif Sayısı</FormLabel>
                <FormControl>
                  <Input
                    type="text"
                    inputMode="numeric"
                    className={COMPACT_INPUT}
                    placeholder="3"
                    value={maxStackDisplay}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/\D/g, '');
                      setMaxStackDisplay(raw);
                      const v = raw === '' ? undefined : Math.max(1, parseInt(raw, 10));
                      field.onChange(v);
                      form.setValue('isStackable', (v ?? 0) > 0, { shouldValidate: false });
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
                dimensionUnit={dimensionUnit}
                label={t('forms.product.diameter')}
                placeholder="60"
                onAfterChange={(v) => {
                  if (v !== undefined && Number.isFinite(v)) {
                    form.setValue('length', v, { shouldDirty: false, shouldValidate: false });
                  }
                }}
              />
              <DimensionField
                form={form}
                name="height"
                dimensionUnit={dimensionUnit}
                label={t('forms.product.height')}
                placeholder="120"
              />
            </>
          ) : (
            <>
              <DimensionField
                form={form}
                name="width"
                dimensionUnit={dimensionUnit}
                label={`${t('forms.product.width')} (X)`}
                placeholder="120"
              />
              <DimensionField
                form={form}
                name="height"
                dimensionUnit={dimensionUnit}
                label={`${t('forms.product.height')} (Y)`}
                placeholder="80"
                labelTooltip={
                  isPallet
                    ? 'Toplam yükseklik; palet (maks. 14 cm) ve üzerindeki yükü birlikte kapsar. Örn: 14 cm palet + 86 cm ürün = 100 cm girilmeli.'
                    : undefined
                }
              />
              <DimensionField
                form={form}
                name="length"
                dimensionUnit={dimensionUnit}
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
                      type="text"
                      inputMode="numeric"
                      step="0.1"
                      min={0}
                      placeholder="15.5"
                      className={COMPACT_INPUT_WITH_UNIT}
                      {...field}
                      value={weightDisplay}
                      onChange={(e) => {
                        const raw = e.target.value;
                        setWeightDisplay(raw);
                        field.onChange(
                          raw === '' || !Number.isFinite(parseFloat(raw))
                            ? undefined
                            : parseFloat(raw),
                        );
                      }}
                    />
                  </FormControl>
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">
                    {weightUnit}
                  </span>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </div>

      {/* 3. KISITLAR — yük kısıtları tek satır, altında uyumsuz gruplar */}
      <div className="space-y-4 py-6">
        <SectionTitle>{t('forms.product.sectionConstraints')}</SectionTitle>
        {/* Yük kısıtı chip'leri — tek satır */}
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
                          ? 'border-primary bg-primary/10 hover:bg-primary/20'
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
                        form.setValue('fragility', maxFragility, { shouldDirty: true, shouldValidate: false });
                        const ids = next
                          .map(
                            (v) =>
                              CONSTRAINT_OPTIONS.find((c) => c.value === v)?.fragilityValue ?? 0,
                          )
                          .filter((id) => id > 0);
                        form.setValue('constraintIds', ids, { shouldDirty: true, shouldValidate: false });
                        if (maxFragility >= FRAGILITY_LEVELS.Fragile && !isPallet) {
                          form.setValue('allowRotateZ', false, { shouldDirty: true, shouldValidate: false });
                        } else if (!isPallet) {
                          form.setValue('allowRotateZ', true, { shouldDirty: true, shouldValidate: false });
                        }
                      }}
                    >
                      <opt.Icon
                        className={cn('h-4 w-4 shrink-0', ICON_COLOR_CLASSES[opt.color])}
                        strokeWidth={1.8}
                      />
                      {opt.label}
                    </Button>
                  );
                })}
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Uyumsuz yük grupları — stackGroup seçimine göre otomatik, tek satır */}
        {(incompatibleGroups ?? []).length > 0 && (
          <div>
            <p className="mb-1.5 text-sm font-medium leading-none">Uyumsuz Yük Grupları</p>
            <div className="flex flex-wrap gap-1.5">
              {(incompatibleGroups ?? []).map((g) => {
                const entry = INCOMPATIBLE_GROUPS.find((ig) => ig.value === g);
                const Icon = entry?.Icon ?? Package;
                return (
                  <span
                    key={g}
                    className="inline-flex h-9 items-center gap-1.5 rounded-md bg-destructive/10 px-3 text-sm text-destructive"
                  >
                    <Icon className="h-4 w-4" strokeWidth={1.5} />
                    {g}
                  </span>
                );
              })}
            </div>
          </div>
        )}

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
              const isAutoDisabled =
                (axisFieldName === 'allowRotateZ' && isZLocked) ||
                (axisFieldName === 'allowRotateY' && isYLocked);
              return (
                <FormField
                  key={axisFieldName}
                  control={form.control}
                  name={axisFieldName}
                  render={({ field }) => {
                    const isDisabled = isAutoDisabled;
                    const tooltipMsg = isAutoDisabled
                      ? t('forms.product.rotateZLockedWarning')
                      : t(tooltipKey);
                    const isLocked = field.value === false;
                    return (
                      <FormItem className="m-0 flex-1 space-y-0">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              type="button"
                              variant="outline"
                              aria-pressed={isLocked}
                              aria-label={tooltipMsg}
                              disabled={isDisabled}
                              onClick={() => field.onChange(!field.value)}
                              className={cn(
                                'h-auto w-full flex-col items-center gap-1.5 rounded-md px-2 py-3 transition-all duration-150 focus-visible:ring-0 focus-visible:ring-offset-0',
                                !isLocked && !isAutoDisabled
                                  ? 'border-primary bg-primary/15 text-primary shadow-[0_0_10px_1px_hsl(var(--primary)/0.3)]'
                                  : 'border-border text-muted-foreground',
                                isAutoDisabled && 'opacity-40',
                              )}
                            >
                              <AxisBoxIllustration
                                axis={axis}
                                active={!isLocked && !isAutoDisabled}
                              />
                              <div className="flex flex-col items-center gap-0.5">
                                <span className="text-sm font-semibold leading-none">
                                  {axisLabel}
                                </span>
                                <span className="text-xs font-normal opacity-70">{subtitle}</span>
                              </div>
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>{tooltipMsg}</TooltipContent>
                        </Tooltip>
                      </FormItem>
                    );
                  }}
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

  async function handleDraftSubmit() {
    const valid = await form.trigger(['name', 'sku', 'productType']);
    if (!valid) return;
    onDraftSubmit?.(form.getValues());
  }

  const actionBar = (
    <div className="flex w-full items-center justify-center gap-2 rounded-2xl border border-border bg-background px-6 py-3 shadow-lg">
      {onCancel && (
        <Button
          type="button"
          variant="ghost"
          onClick={onCancel}
          disabled={isSubmitting}
          className="text-muted-foreground hover:text-foreground"
        >
          İptal Et
        </Button>
      )}
      {onDraftSubmit && (
        <Button
          type="button"
          variant="outline"
          onClick={() => void handleDraftSubmit()}
          disabled={isSubmitting}
        >
          Taslak Olarak Kaydet
        </Button>
      )}
      <Button
        type="submit"
        disabled={isSubmitting || (disableSubmitWhenPristine && !form.formState.isDirty)}
      >
        {isSubmitting ? t('forms.product.submitting') : (submitLabel ?? 'Değişiklikleri Kaydet')}
      </Button>
    </div>
  );

  return (
    <TooltipProvider delayDuration={150}>
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit, () => {
            toast.error('Lütfen zorunlu alanları doldurunuz.', { position: 'bottom-right' });
          })}
          className="flex h-full flex-col"
        >
          <FormWithPreviewLayout
            className="flex-1 min-h-0"
            formContent={formFields}
            actionBar={actionBar}
            actionBarVisible={form.formState.isDirty}
            previewContent={
              <PreviewPanel
                name={name}
                productType={productType ?? 'koli'}
                length={length}
                width={width}
                height={height}
                weight={weight}
                volumeCm3={volumeCm3}
                maxStackCount={maxStackCount}
                constraintLabels={selectedConstraints
                  .map((v) => CONSTRAINT_OPTIONS.find((o) => o.value === v)?.label)
                  .filter((l): l is string => l !== undefined)}
                allowRotateX={allowRotateX}
                allowRotateY={allowRotateY}
                allowRotateZ={allowRotateZ}
                notes={notes}
              />
            }
          />
        </form>
      </Form>
    </TooltipProvider>
  );
}

interface PreviewPanelProps {
  name?: string;
  productType: 'koli' | 'varil' | 'palet';
  length?: number;
  width?: number;
  height?: number;
  weight?: number;
  volumeCm3: number;
  maxStackCount: number | undefined;
  constraintLabels: string[];
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
    width,
    height,
    weight,
    volumeCm3,
    maxStackCount,
    constraintLabels,
    allowRotateX,
    allowRotateY,
    allowRotateZ,
    notes,
  } = props;

  const dimensionUnit = useUnitStore((s) => s.dimensionUnit);
  const weightUnit = useUnitStore((s) => s.weightUnit);
  const volumeUnit = useUnitStore((s) => s.volumeUnit);

  const fmt = (val?: number, unit?: string) =>
    val !== undefined && Number.isFinite(val) && unit ? `${val} ${unit}` : '—';

  const lockedAxes: string[] = [];
  if (!allowRotateX) lockedAxes.push('X');
  if (!allowRotateY) lockedAxes.push('Y');
  if (!allowRotateZ) lockedAxes.push('Z');
  const allRotationsFree = lockedAxes.length === 0;

  const widthCm =
    Number.isFinite(width) && width !== undefined ? toCentimeters(width, dimensionUnit) : 0;
  const heightCm =
    Number.isFinite(height) && height !== undefined ? toCentimeters(height, dimensionUnit) : 0;
  const depthCm =
    Number.isFinite(length) && length !== undefined ? toCentimeters(length, dimensionUnit) : 0;
  const hasDimensions =
    productType === 'varil'
      ? widthCm > 0 && heightCm > 0
      : widthCm > 0 && heightCm > 0 && depthCm > 0;

  const summaryRows = [
    { label: t('forms.product.name'), value: name || '—', bold: true },
    { label: t('forms.product.width'), value: fmt(width, dimensionUnit) },
    { label: t('forms.product.height'), value: fmt(height, dimensionUnit) },
    { label: t('forms.product.length'), value: fmt(length, dimensionUnit) },
    { label: t('forms.product.weight'), value: fmt(weight, weightUnit) },
    { label: 'Kısıtlar', value: constraintLabels.length > 0 ? constraintLabels.join(', ') : '—' },
    {
      label: 'İstif Sayısı',
      value: maxStackCount === undefined ? '∞' : maxStackCount > 1 ? String(maxStackCount) : '—',
    },
    {
      label: 'Rotasyon',
      value: allRotationsFree
        ? t('forms.product.summaryRotationFree')
        : t('forms.product.summaryRotationLocked', { axes: lockedAxes.join(', ') }),
    },
  ];

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-xl border border-border bg-background p-3">
      {/* Başlık */}
      <div className="mb-2 flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
          Ürün Önizleme
        </p>
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
        <span className="text-xs text-muted-foreground">Hacim</span>
        <span className="text-xs font-semibold tabular-nums text-foreground">
          {volumeCm3 > 0 ? formatVolumeDisplay(volumeCm3, volumeUnit) : '—'}
        </span>
      </div>

      {/* Özet satırları */}
      <div className="mt-1 flex flex-col">
        {summaryRows.map((r) => (
          <div
            key={r.label as string}
            className="flex items-center justify-between border-b border-border/50 py-1 last:border-0"
          >
            <span className="text-xs text-muted-foreground">{r.label}</span>
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
          <p className="mb-1 text-xs font-medium text-muted-foreground">
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
  dimensionUnit: string;
  label: string;
  placeholder?: string;
  onAfterChange?: (value: number | undefined) => void;
  labelTooltip?: string;
}

function DimensionField({
  form,
  name,
  dimensionUnit,
  label,
  placeholder,
  onAfterChange,
  labelTooltip,
}: DimensionFieldProps) {
  const initVal = form.getValues(name);
  const [display, setDisplay] = useState<string>(() =>
    initVal != null && Number.isFinite(initVal) ? String(initVal) : '',
  );

  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <div className="flex items-center gap-1">
            <FormLabel>{label}</FormLabel>
            {labelTooltip && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5"
                    aria-label={labelTooltip}
                  >
                    <HelpCircle className="h-3.5 w-3.5 text-muted-foreground" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent className="max-w-[220px]">{labelTooltip}</TooltipContent>
              </Tooltip>
            )}
          </div>
          <div className="relative">
            <FormControl>
              <Input
                type="text"
                inputMode="numeric"
                placeholder={placeholder}
                className={COMPACT_INPUT_WITH_UNIT}
                {...field}
                value={display}
                onChange={(e) => {
                  const raw = e.target.value;
                  setDisplay(raw);
                  const num =
                    raw === '' || !Number.isFinite(parseFloat(raw)) ? undefined : parseFloat(raw);
                  field.onChange(num);
                  onAfterChange?.(num);
                }}
              />
            </FormControl>
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">
              {dimensionUnit}
            </span>
          </div>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
