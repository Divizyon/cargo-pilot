import { useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Building2, Mail, MapPin, Phone, Upload, X, Info } from 'lucide-react';
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
import { cn } from '@/lib/utils';
import { useReportingSettingsStore } from '@/lib/store/useReportingSettingsStore';
import { reportingSettingsSchema } from '@/features/platform/schemas/reportingSettingsSchema';
import type { ReportingSettingsFormValues } from '@/features/platform/schemas/reportingSettingsSchema';

const MAX_LOGO_SIZE_BYTES = 2 * 1024 * 1024; // 2 MB

export function ReportingSettingsForm() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { logoDataUrl, companyName, phone, email, address, setLogo, removeLogo, updateContactInfo } =
    useReportingSettingsStore();

  const form = useForm<ReportingSettingsFormValues>({
    resolver: zodResolver(reportingSettingsSchema),
    defaultValues: { companyName, phone, email, address },
    mode: 'onBlur',
  });

  useEffect(() => {
    form.reset({ companyName, phone, email, address });
  }, [companyName, phone, email, address, form]);

  function onSubmit(values: ReportingSettingsFormValues) {
    updateContactInfo(values);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_LOGO_SIZE_BYTES) {
      form.setError('root', { message: 'Logo dosyası en fazla 2 MB olabilir.' });
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result;
      if (typeof result === 'string') setLogo(result);
    };
    reader.readAsDataURL(file);

    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  return (
    <div className="space-y-8">
      {/* Logo section */}
      <div className="space-y-3">
        <div>
          <p className="text-sm font-medium text-foreground">Şirket Logosu</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            PNG veya JPG, en fazla 2 MB. PDF raporlarının üst bilgisine basılır.
          </p>
        </div>

        {logoDataUrl ? (
          <div className="flex items-start gap-4">
            <div className="flex h-20 w-40 items-center justify-center overflow-hidden rounded-md border border-border bg-muted/30">
              <img
                src={logoDataUrl}
                alt="Şirket logosu önizlemesi"
                className="max-h-full max-w-full object-contain"
              />
            </div>
            <div className="flex flex-col gap-2 pt-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="mr-1.5 h-3.5 w-3.5" />
                Logoyu Değiştir
              </Button>
              <button
                type="button"
                onClick={removeLogo}
                className="flex items-center gap-1 text-xs text-destructive hover:underline"
              >
                <X className="h-3 w-3" />
                Logoyu Kaldır
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                'flex w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border px-6 py-8',
                'text-sm text-muted-foreground transition-colors hover:border-primary/40 hover:bg-muted/30',
              )}
            >
              <Upload className="h-8 w-8 text-muted-foreground/60" />
              <span>Logo yüklemek için tıklayın</span>
              <span className="text-xs">PNG, JPG — maks. 2 MB</span>
            </button>

            <div className="flex items-start gap-2 rounded-md bg-muted/50 px-3 py-2.5">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">
                Şirket logosu tanımlanmamış. Platform logosu kullanılmaktadır.
              </p>
            </div>
          </div>
        )}

        {form.formState.errors.root && (
          <p className="text-xs text-destructive">{form.formState.errors.root.message}</p>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/jpg"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>

      {/* Contact fields */}
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-2 gap-4 max-sm:grid-cols-1">
            <FormField
              control={form.control}
              name="companyName"
              render={({ field }) => (
                <FormItem className="col-span-2 max-sm:col-span-1">
                  <FormLabel>Şirket Adı</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Building2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input placeholder="Şirket adı" className="pl-10" {...field} />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Telefon</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input placeholder="+90 555 000 00 00" className="pl-10" {...field} />
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
                        placeholder="iletisim@sirket.com"
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

            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem className="col-span-2 max-sm:col-span-1">
                  <FormLabel>Adres</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <MapPin className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Textarea
                        placeholder="Şirket adresi"
                        className="min-h-20 pl-10 resize-none"
                        {...field}
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="flex justify-end">
            <Button type="submit" className="min-w-40">
              Değişiklikleri Kaydet
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
