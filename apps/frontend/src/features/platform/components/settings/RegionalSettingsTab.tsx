import { useEffect, type ReactNode } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { HelpCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  regionalSettingsSchema,
  type RegionalSettingsValues,
} from '@/features/platform/schemas/systemSettingsSchema';
import { useUnitStore } from '@/lib/store/useUnitStore';
import { formatDate } from '@/lib/utils/formatDate';
import i18n from '@/lib/config/i18n';

const DEFAULT_VALUES: RegionalSettingsValues = {
  language: 'tr',
  timezone: 'Europe/Istanbul',
  dateFormat: 'DD.MM.YYYY',
  dimensionUnit: 'cm',
  weightUnit: 'kg',
  volumeUnit: 'm³',
};

const UNIT_TOOLTIPS = {
  dimensionUnit:
    'Ürün tanımlama formu, araç boyutları ve 3D koordinat hesaplamalarında kullanılır.',
  weightUnit: 'Ürün ağırlığı, araç yük kapasitesi ve aks yük limitlerinde kullanılır.',
  volumeUnit: 'Hesaplanan araç ve kargo hacimlerinin gösteriminde kullanılır.',
} as const;

interface RegionalSettingsTabProps {
  onDirtyChange: (dirty: boolean) => void;
}

function UnitTooltip({ text }: { text: string }) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <HelpCircle className="h-3.5 w-3.5 cursor-help text-muted-foreground" />
        </TooltipTrigger>
        <TooltipContent side="right" className="max-w-56 text-xs">
          {text}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground pt-4 pb-1 first:pt-0">
      {children}
    </p>
  );
}

interface RowProps {
  label: string;
  tooltip?: string;
  children: ReactNode;
}

function Row({ label, tooltip, children }: RowProps) {
  return (
    <div className="flex items-center gap-6 border-b border-border py-2.5 last:border-0">
      <div className="flex w-44 shrink-0 items-center gap-1.5">
        <span className="text-sm text-foreground">{label}</span>
        {tooltip && <UnitTooltip text={tooltip} />}
      </div>
      <div className="w-52">{children}</div>
    </div>
  );
}

export function RegionalSettingsTab({ onDirtyChange }: RegionalSettingsTabProps) {
  const setUnits = useUnitStore((s) => s.setUnits);
  const storedLanguage = useUnitStore((s) => s.language);
  const storedDimensionUnit = useUnitStore((s) => s.dimensionUnit);
  const storedWeightUnit = useUnitStore((s) => s.weightUnit);
  const storedVolumeUnit = useUnitStore((s) => s.volumeUnit);
  const storedDateFormat = useUnitStore((s) => s.dateFormat);

  const form = useForm<RegionalSettingsValues>({
    resolver: zodResolver(regionalSettingsSchema),
    defaultValues: {
      ...DEFAULT_VALUES,
      language: storedLanguage,
      dimensionUnit: storedDimensionUnit,
      weightUnit: storedWeightUnit,
      volumeUnit: storedVolumeUnit,
      dateFormat: storedDateFormat,
    },
    mode: 'onBlur',
  });

  const { isDirty } = form.formState;
  useEffect(() => {
    onDirtyChange(isDirty);
  }, [isDirty, onDirtyChange]);

  const watchedDateFormat = useWatch<RegionalSettingsValues, 'dateFormat'>({
    control: form.control,
    name: 'dateFormat',
  });
  const datePreview = formatDate(new Date(), watchedDateFormat);

  function onSubmit(values: RegionalSettingsValues) {
    setUnits({
      language: values.language,
      dimensionUnit: values.dimensionUnit,
      weightUnit: values.weightUnit,
      volumeUnit: values.volumeUnit,
      dateFormat: values.dateFormat,
    });
    void i18n.changeLanguage(values.language);
    toast.success('Bölgesel ayarlar kaydedildi.');
    form.reset(values);
    onDirtyChange(false);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="max-w-xl">
        <SectionLabel>Dil ve Bölge</SectionLabel>

        <FormField
          control={form.control}
          name="language"
          render={({ field }) => (
            <FormItem>
              <Row label="Arayüz Dili">
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="tr">Türkçe</SelectItem>
                    <SelectItem value="en">English</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </Row>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="timezone"
          render={({ field }) => (
            <FormItem>
              <Row label="Zaman Dilimi">
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="Europe/Istanbul">Europe/Istanbul (UTC+3)</SelectItem>
                    <SelectItem value="Europe/London">Europe/London (UTC+0)</SelectItem>
                    <SelectItem value="America/New_York">America/New_York (UTC-5)</SelectItem>
                    <SelectItem value="America/Los_Angeles">America/Los_Angeles (UTC-8)</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </Row>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="dateFormat"
          render={({ field }) => (
            <FormItem>
              <Row label="Tarih Formatı">
                <div className="flex items-center gap-2">
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="h-8 flex-1 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="DD.MM.YYYY">GG.AA.YYYY</SelectItem>
                      <SelectItem value="MM/DD/YYYY">AA/GG/YYYY</SelectItem>
                      <SelectItem value="YYYY-MM-DD">YYYY-AA-GG</SelectItem>
                    </SelectContent>
                  </Select>
                  <span className="shrink-0 rounded border bg-muted px-2 py-1 font-mono text-xs text-muted-foreground">
                    {datePreview}
                  </span>
                </div>
                <FormMessage />
              </Row>
            </FormItem>
          )}
        />

        <SectionLabel>Ölçü Birimleri</SectionLabel>

        <FormField
          control={form.control}
          name="dimensionUnit"
          render={({ field }) => (
            <FormItem>
              <Row label="Ölçü Birimi" tooltip={UNIT_TOOLTIPS.dimensionUnit}>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="cm">Santimetre (cm)</SelectItem>
                    <SelectItem value="mm">Milimetre (mm)</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </Row>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="weightUnit"
          render={({ field }) => (
            <FormItem>
              <Row label="Ağırlık Birimi" tooltip={UNIT_TOOLTIPS.weightUnit}>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="kg">Kilogram (kg)</SelectItem>
                    <SelectItem value="ton">Ton (ton)</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </Row>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="volumeUnit"
          render={({ field }) => (
            <FormItem>
              <Row label="Hacim Birimi" tooltip={UNIT_TOOLTIPS.volumeUnit}>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="m³">Metreküp (m³)</SelectItem>
                    <SelectItem value="dm³">Desimetreküp (dm³)</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </Row>
            </FormItem>
          )}
        />

        <div className="flex justify-end pt-4">
          <Button
            type="submit"
            size="sm"
            disabled={form.formState.isSubmitting}
            className="min-w-36"
          >
            {form.formState.isSubmitting ? (
              <>
                <Loader2 className="animate-spin" />
                Kaydediliyor...
              </>
            ) : (
              'Değişiklikleri Kaydet'
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}
