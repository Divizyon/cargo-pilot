import { useEffect } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { HelpCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
  currency: 'TRY',
};

const UNIT_TOOLTIPS = {
  dimensionUnit:
    'Ölçü birimi; ürün tanımlama formu, araç boyutları ve 3D koordinat hesaplamalarında kullanılır.',
  weightUnit:
    'Ağırlık birimi; ürün ağırlığı, araç yük kapasitesi ve aks yük limitlerinde kullanılır.',
  volumeUnit: 'Hacim birimi; hesaplanan araç ve kargo hacimlerinin gösteriminde kullanılır.',
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
        <TooltipContent>{text}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
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
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Dil ve Bölge</CardTitle>
            <CardDescription>Arayüz dili ve zaman dilimi tercihleriniz.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4 max-sm:grid-cols-1">
            <FormField
              control={form.control}
              name="language"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Arayüz Dili</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="tr">Türkçe</SelectItem>
                      <SelectItem value="en">English</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="timezone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Zaman Dilimi</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Europe/Istanbul">Europe/Istanbul (UTC+3)</SelectItem>
                      <SelectItem value="Europe/London">Europe/London (UTC+0)</SelectItem>
                      <SelectItem value="America/New_York">America/New_York (UTC-5)</SelectItem>
                      <SelectItem value="America/Los_Angeles">
                        America/Los_Angeles (UTC-8)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="dateFormat"
              render={({ field }) => (
                <FormItem className="col-span-2 max-sm:col-span-1">
                  <FormLabel>Tarih Formatı</FormLabel>
                  <div className="flex items-center gap-3">
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="flex-1">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="DD.MM.YYYY">GG.AA.YYYY — Türkiye Standardı</SelectItem>
                        <SelectItem value="MM/DD/YYYY">MM/DD/YYYY — ABD Standardı</SelectItem>
                        <SelectItem value="YYYY-MM-DD">YYYY-MM-DD — ISO 8601</SelectItem>
                      </SelectContent>
                    </Select>
                    <span className="shrink-0 rounded-md border bg-muted px-3 py-2 text-sm font-mono text-muted-foreground">
                      {datePreview}
                    </span>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="currency"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Para Birimi</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="TRY">Türk Lirası (₺)</SelectItem>
                      <SelectItem value="USD">Amerikan Doları ($)</SelectItem>
                      <SelectItem value="EUR">Euro (€)</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Ölçü Birimleri</CardTitle>
            <CardDescription>
              Form alanları, araç boyutları ve raporlarda kullanılacak varsayılan birimler.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4 max-sm:grid-cols-1">
            <FormField
              control={form.control}
              name="dimensionUnit"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center gap-1.5">
                    <FormLabel>Ölçü Birimi</FormLabel>
                    <UnitTooltip text={UNIT_TOOLTIPS.dimensionUnit} />
                  </div>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="cm">Santimetre (cm)</SelectItem>
                      <SelectItem value="mm">Milimetre (mm)</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="weightUnit"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center gap-1.5">
                    <FormLabel>Ağırlık Birimi</FormLabel>
                    <UnitTooltip text={UNIT_TOOLTIPS.weightUnit} />
                  </div>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="kg">Kilogram (kg)</SelectItem>
                      <SelectItem value="ton">Ton (ton)</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="volumeUnit"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center gap-1.5">
                    <FormLabel>Hacim Birimi</FormLabel>
                    <UnitTooltip text={UNIT_TOOLTIPS.volumeUnit} />
                  </div>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="m³">Metreküp (m³)</SelectItem>
                      <SelectItem value="dm³">Desimetreküp (dm³)</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" disabled={form.formState.isSubmitting} className="min-w-40">
            {form.formState.isSubmitting ? (
              <>
                <Loader2 className="animate-spin" />
                Kaydediliyor...
              </>
            ) : (
              'Kaydet'
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}
