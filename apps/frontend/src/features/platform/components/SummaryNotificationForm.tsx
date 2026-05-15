import { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  summaryNotificationSchema,
  SummaryEventType,
  type SummaryNotificationValues,
} from '@/features/platform/schemas/summaryNotificationSchema';
import {
  useSummaryNotificationSettings,
  useSaveSummaryNotificationSettings,
} from '@/lib/api/useNotifications';

const EVENT_TYPE_LABELS: Record<string, string> = {
  [SummaryEventType.ErpExportError]: 'ERP aktarım hatası',
  [SummaryEventType.PendingShipment]: 'Bekleyen sevkiyat',
  [SummaryEventType.ProductChange]: 'Ürün değişikliği',
};

const ALL_EVENT_TYPES = Object.values(SummaryEventType);

export function SummaryNotificationForm() {
  const { data: settings, isLoading } = useSummaryNotificationSettings();
  const { mutate: saveSettings, isPending: isSaving } = useSaveSummaryNotificationSettings();

  const form = useForm<SummaryNotificationValues>({
    resolver: zodResolver(summaryNotificationSchema),
    defaultValues: {
      enabled: true,
      frequency: 'Gunluk',
      sendTime: '08:00',
      eventTypes: [],
    },
  });

  useEffect(() => {
    if (settings) {
      form.reset(settings);
    }
  }, [settings, form]);

  const enabled = form.watch('enabled');

  function onSubmit(values: SummaryNotificationValues) {
    saveSettings(values);
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-64" />
        <Skeleton className="h-4 w-56" />
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Enable toggle */}
        <FormField
          control={form.control}
          name="enabled"
          render={({ field }) => (
            <FormItem className="flex items-center justify-between gap-4">
              <div>
                <FormLabel className="text-sm font-medium">Özet bildirimleri etkinleştir</FormLabel>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Seçilen olaylar için düzenli e-posta özeti alın.
                </p>
              </div>
              <FormControl>
                <Switch checked={field.value} onCheckedChange={field.onChange} />
              </FormControl>
            </FormItem>
          )}
        />

        <Separator />

        {/* Frequency */}
        <FormField
          control={form.control}
          name="frequency"
          render={({ field }) => (
            <FormItem className="space-y-3">
              <FormLabel>Gönderim Sıklığı</FormLabel>
              <FormControl>
                <RadioGroup
                  value={field.value}
                  onValueChange={field.onChange}
                  disabled={!enabled}
                  className="gap-3"
                >
                  <div className="flex items-center gap-3">
                    <RadioGroupItem value="Gunluk" id="freq-daily" />
                    <Label htmlFor="freq-daily" className="cursor-pointer">
                      Günlük
                    </Label>
                  </div>
                  <div className="flex items-center gap-3">
                    <RadioGroupItem value="Haftalik" id="freq-weekly" />
                    <Label htmlFor="freq-weekly" className="cursor-pointer">
                      Haftalık
                    </Label>
                  </div>
                </RadioGroup>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Send time */}
        <FormField
          control={form.control}
          name="sendTime"
          render={({ field }) => (
            <FormItem className="max-w-[140px]">
              <FormLabel>Gönderim Saati</FormLabel>
              <FormControl>
                <Input
                  type="time"
                  disabled={!enabled}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Separator />

        {/* Event types */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Dahil Edilecek Olaylar</Label>
          <p className="text-xs text-muted-foreground">
            Özet e-postasına hangi olay türlerinin ekleneceğini seçin.
          </p>
          <Controller
            control={form.control}
            name="eventTypes"
            render={({ field }) => (
              <div className="space-y-3">
                {ALL_EVENT_TYPES.map((eventType) => (
                  <div key={eventType} className="flex items-center gap-3">
                    <Checkbox
                      id={`event-${eventType}`}
                      disabled={!enabled}
                      checked={field.value.includes(eventType)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          field.onChange([...field.value, eventType]);
                        } else {
                          field.onChange(field.value.filter((v) => v !== eventType));
                        }
                      }}
                    />
                    <Label htmlFor={`event-${eventType}`} className="cursor-pointer font-normal">
                      {EVENT_TYPE_LABELS[eventType]}
                    </Label>
                  </div>
                ))}
              </div>
            )}
          />
        </div>

        <div className="flex justify-end">
          <Button type="submit" disabled={isSaving || !form.formState.isDirty}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Kaydet
          </Button>
        </div>
      </form>
    </Form>
  );
}
