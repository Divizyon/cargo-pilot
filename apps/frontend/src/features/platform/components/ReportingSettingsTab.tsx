import { useEffect, useRef, type ChangeEvent } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle, Building2, Mail, MapPin, Phone, Upload, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
import { Separator } from '@/components/ui/separator';
import {
  useReportingSettings,
  useUpdateReportingSettings,
  useUploadReportingLogo,
  useRemoveReportingLogo,
} from '@/lib/api/useReportingSettings';
import { reportingSettingsSchema } from '@/features/platform/schemas/reportingSettingsSchema';
import type { ReportingSettingsFormValues } from '@/features/platform/schemas/reportingSettingsSchema';
import { cn } from '@/lib/utils';

export function ReportingSettingsTab() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { data: settings, isLoading } = useReportingSettings();
  const { mutate: updateSettings, isPending: isSaving } = useUpdateReportingSettings();
  const { mutate: uploadLogo, isPending: isUploading } = useUploadReportingLogo();
  const { mutate: removeLogo, isPending: isRemoving } = useRemoveReportingLogo();

  const form = useForm<ReportingSettingsFormValues>({
    resolver: zodResolver(reportingSettingsSchema),
    defaultValues: {
      companyName: '',
      phone: '',
      email: '',
      address: '',
    },
    mode: 'onBlur',
  });

  useEffect(() => {
    if (!settings) return;
    form.reset({
      companyName: settings.companyName ?? '',
      phone: settings.phone ?? '',
      email: settings.email ?? '',
      address: settings.address ?? '',
    });
  }, [settings, form]);

  function onSubmit(values: ReportingSettingsFormValues) {
    updateSettings({
      companyName: values.companyName || undefined,
      phone: values.phone || undefined,
      email: values.email || undefined,
      address: values.address || undefined,
    });
  }

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    uploadLogo(file);
    e.target.value = '';
  }

  const hasLogo = !!settings?.logoUrl;
  const isLogoActionPending = isUploading || isRemoving;

  if (isLoading) {
    return <div className="py-8 text-sm text-muted-foreground">Yükleniyor...</div>;
  }

  return (
    <div className="space-y-8">
      {/* Logo Section */}
      <div className="space-y-4">
        <div>
          <h3 className="text-base font-semibold text-foreground">Şirket Logosu</h3>
          <p className="mt-0.5 text-sm text-muted-foreground">
            PDF raporlarının üst bilgisinde gösterilecek logo.
          </p>
        </div>

        {!hasLogo ? (
          <div className="flex items-center gap-2 rounded-lg border px-4 py-3 text-sm text-muted-foreground">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>Şirket logosu tanımlanmamış. Platform logosu kullanılmaktadır.</span>
          </div>
        ) : (
          <div className="flex items-start gap-4">
            <div className="flex h-24 w-40 items-center justify-center overflow-hidden rounded-md border bg-muted">
              <img
                src={settings.logoUrl}
                alt="Şirket logosu"
                className="max-h-full max-w-full object-contain"
              />
            </div>
            <div className="flex flex-col gap-2 pt-1">
              <button
                type="button"
                onClick={() => removeLogo()}
                disabled={isLogoActionPending}
                className={cn(
                  'flex items-center gap-1.5 text-sm text-destructive underline-offset-4 hover:underline',
                  isLogoActionPending && 'pointer-events-none opacity-50',
                )}
              >
                <X className="h-3.5 w-3.5" />
                Logoyu Kaldır
              </button>
            </div>
          </div>
        )}

        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/svg+xml,image/webp"
            className="hidden"
            onChange={handleFileChange}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isLogoActionPending}
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="mr-2 h-4 w-4" />
            {hasLogo ? 'Logoyu Değiştir' : 'Logo Yükle'}
          </Button>
          <p className="mt-1.5 text-xs text-muted-foreground">PNG, JPG, SVG veya WEBP · Maks. 2 MB</p>
        </div>
      </div>

      <Separator />

      {/* Company Info Section */}
      <div className="space-y-4">
        <div>
          <h3 className="text-base font-semibold text-foreground">İletişim Bilgileri</h3>
          <p className="mt-0.5 text-sm text-muted-foreground">
            PDF raporlarının üst bilgisinde logonun yanında gösterilecek bilgiler.
          </p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="companyName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Şirket Adı</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Building2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input placeholder="Şirket adınız" className="pl-10" {...field} />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4 max-sm:grid-cols-1">
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Telefon</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input placeholder="+90 212 000 00 00" className="pl-10" {...field} />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>E-posta</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          type="email"
                          placeholder="info@sirketiniz.com"
                          className={cn(
                            'pl-10',
                            form.formState.errors.email &&
                              'border-destructive bg-destructive/5 focus-visible:ring-0 focus-visible:border-destructive',
                          )}
                          {...field}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Adres</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <MapPin className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Textarea
                        placeholder="Şirket adresi"
                        className="min-h-[80px] pl-10 resize-none"
                        {...field}
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end pt-2">
              <Button type="submit" disabled={isSaving} className="min-w-40">
                {isSaving ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}
