import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormDescription,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  reportingSettingsSchema,
  type ReportingSettingsValues,
} from '@/features/platform/schemas/systemSettingsSchema';

const DEFAULT_VALUES: ReportingSettingsValues = {
  reportLanguage: 'tr',
  pageSize: 'A4',
  exportFormat: 'pdf',
  includeCompanyLogo: true,
  headerText: '',
  footerText: '',
};

interface ReportingSettingsTabProps {
  onDirtyChange: (dirty: boolean) => void;
}

export function ReportingSettingsTab({ onDirtyChange }: ReportingSettingsTabProps) {
  const form = useForm<ReportingSettingsValues>({
    resolver: zodResolver(reportingSettingsSchema),
    defaultValues: DEFAULT_VALUES,
    mode: 'onBlur',
  });

  const { isDirty } = form.formState;
  useEffect(() => {
    onDirtyChange(isDirty);
  }, [isDirty, onDirtyChange]);

  function onSubmit(_values: ReportingSettingsValues) {
    toast.success('Raporlama ayarları kaydedildi.');
    form.reset(_values);
    onDirtyChange(false);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Çıktı Formatı</CardTitle>
            <CardDescription>Rapor dili, sayfa boyutu ve dışa aktarma tercihleri.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4 max-sm:grid-cols-1">
            <FormField
              control={form.control}
              name="reportLanguage"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Rapor Dili</FormLabel>
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
              name="pageSize"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Sayfa Boyutu</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="A4">A4</SelectItem>
                      <SelectItem value="A3">A3</SelectItem>
                      <SelectItem value="Letter">Letter</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="exportFormat"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Varsayılan Dışa Aktarma Formatı</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="pdf">PDF</SelectItem>
                      <SelectItem value="excel">Excel</SelectItem>
                      <SelectItem value="both">PDF + Excel</SelectItem>
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
            <CardTitle className="text-base">Rapor İçeriği</CardTitle>
            <CardDescription>
              Raporlarda görünecek başlık, alt bilgi ve logo ayarları.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="includeCompanyLogo"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <FormLabel className="text-sm font-medium">Şirket Logosu</FormLabel>
                    <FormDescription className="text-xs">
                      Rapor başlığına şirket logosunu ekler.
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="headerText"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Başlık Metni{' '}
                    <span className="text-xs font-normal text-muted-foreground">(opsiyonel)</span>
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Rapor başlığında görünecek metin..."
                      className="resize-none"
                      rows={2}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="footerText"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Alt Bilgi Metni{' '}
                    <span className="text-xs font-normal text-muted-foreground">(opsiyonel)</span>
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Rapor alt bilgisinde görünecek metin..."
                      className="resize-none"
                      rows={2}
                      {...field}
                    />
                  </FormControl>
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
