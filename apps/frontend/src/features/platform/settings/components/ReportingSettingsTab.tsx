import { useEffect, useRef, type ChangeEvent } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle, Building2, Calendar, Mail, MapPin, Phone, Upload, X } from 'lucide-react';
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
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
  useReportingSettings,
  useUpdateReportingSettings,
  useUploadReportingLogo,
  useRemoveReportingLogo,
} from '@/lib/api/useReportingSettings';
import { reportingSettingsSchema } from '@/features/platform/settings/schemas/reportingSettingsSchema';
import type { ReportingSettingsFormValues } from '@/features/platform/settings/schemas/reportingSettingsSchema';
import { useReportingSettingsStore } from '@/lib/store/useReportingSettingsStore';
import type { DateFormat } from '@/lib/store/useReportingSettingsStore';
import { cn } from '@/lib/utils';

const DATE_FORMAT_OPTIONS: { value: DateFormat; label: string }[] = [
  { value: 'DD.MM.YYYY', label: 'GG.AA.YYYY — 31.12.2026' },
  { value: 'MM/DD/YYYY', label: 'AA/GG/YYYY — 12/31/2026' },
  { value: 'YYYY-MM-DD', label: 'YYYY-AA-GG — 2026-12-31' },
];

function formatPreviewDate(fmt: DateFormat): string {
  const d = new Date();
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = String(d.getFullYear());
  if (fmt === 'DD.MM.YYYY') return `${dd}.${mm}.${yyyy}`;
  if (fmt === 'MM/DD/YYYY') return `${mm}/${dd}/${yyyy}`;
  return `${yyyy}-${mm}-${dd}`;
}

// ─── PDF Preview ──────────────────────────────────────────────────────────────

interface PdfPreviewProps {
  companyName: string;
  phone: string;
  email: string;
  address: string;
  logoUrl?: string;
  dateFormat: DateFormat;
  showSignatureArea: boolean;
}

function EditableField({ value, placeholder }: { value: string; placeholder: string }) {
  if (value) {
    return (
      <span className="block truncate rounded bg-blue-50 px-0.5 text-gray-900 ring-1 ring-blue-200">
        {value}
      </span>
    );
  }
  return (
    <span className="block rounded border border-dashed border-gray-300 px-0.5 text-gray-300 italic">
      {placeholder}
    </span>
  );
}

function PdfPreviewPanel({
  companyName,
  phone,
  email,
  address,
  logoUrl,
  dateFormat,
  showSignatureArea,
}: PdfPreviewProps) {
  const today = formatPreviewDate(dateFormat);

  const docNo = (() => {
    const d = new Date();
    const yy = String(d.getFullYear());
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const seq = String(((d.getDate() * 3 + 7) % 900) + 100);
    return `RP-${yy}${mm}-${seq}`;
  })();

  return (
    <div className="sticky top-0">
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
        PDF Önizleme
      </p>

      {/* A4 page shell */}
      <div
        className="w-full overflow-hidden rounded border border-border bg-white shadow-md"
        style={{ aspectRatio: '210/297' }}
      >
        <div className="flex h-full flex-col p-[6%] text-[7px] leading-snug">
          {/* ── Header (editable area) ── */}
          <div className="flex items-start gap-2 border-b border-gray-200 pb-2">
            {/* Logo */}
            {logoUrl ? (
              <img
                src={logoUrl}
                alt="logo"
                className="h-8 w-auto max-w-[56px] shrink-0 rounded object-contain ring-1 ring-blue-200"
              />
            ) : (
              <div className="flex h-8 w-10 shrink-0 items-center justify-center rounded border border-dashed border-gray-300 text-[6px] italic text-gray-300">
                logo
              </div>
            )}

            {/* Company info */}
            <div className="min-w-0 flex-1 space-y-0.5">
              <EditableField value={companyName} placeholder="Şirket adı" />
              <EditableField value={phone} placeholder="Telefon" />
              <EditableField value={email} placeholder="E-posta" />
              <EditableField value={address} placeholder="Adres" />
            </div>

            {/* Doc no + Date */}
            <div className="shrink-0 space-y-0.5 text-right">
              <div className="rounded bg-gray-100 px-0.5 font-mono text-gray-500">{docNo}</div>
              <div className="rounded bg-blue-50 px-0.5 text-gray-700 ring-1 ring-blue-200">
                {today}
              </div>
            </div>
          </div>

          {/* ── Report content placeholder ── */}
          <div className="mt-2 flex-1 space-y-1">
            {/* Title bar placeholder */}
            <div className="h-2 w-2/3 rounded bg-gray-100" />
            <div className="h-1.5 w-1/2 rounded bg-gray-100" />

            {/* Table placeholder rows */}
            <div className="mt-2 space-y-px">
              <div className="flex gap-px">
                {[2, 1, 1, 1].map((w, i) => (
                  <div key={i} className={`h-2 flex-${w} rounded-sm bg-gray-200`} />
                ))}
              </div>
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex gap-px">
                  {[2, 1, 1, 1].map((w, j) => (
                    <div key={j} className={`h-1.5 flex-${w} rounded-sm bg-gray-100`} />
                  ))}
                </div>
              ))}
            </div>

            {/* Summary placeholder */}
            <div className="mt-1 flex justify-between border-t border-gray-100 pt-1">
              <div className="h-1.5 w-1/3 rounded bg-gray-100" />
              <div className="h-1.5 w-1/4 rounded bg-gray-100" />
            </div>
          </div>

          {/* ── Signature area (editable) ── */}
          {showSignatureArea && (
            <div className="mt-2 grid grid-cols-2 gap-3 rounded border border-dashed border-blue-200 bg-blue-50 p-1.5">
              <div>
                <div className="h-4 border-b border-gray-400" />
                <p className="mt-0.5 text-center text-gray-400">Hazırlayan</p>
              </div>
              <div>
                <div className="h-4 border-b border-gray-400" />
                <p className="mt-0.5 text-center text-gray-400">Onaylayan</p>
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="mt-auto border-t border-gray-100 pt-1 text-center text-gray-300">
            CargoPilot · {today}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="mt-2 flex items-center gap-3 text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-3 rounded-sm border border-dashed border-gray-300" />
          Boş alan
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-3 rounded-sm bg-blue-50 ring-1 ring-blue-200" />
          Doldurulmuş alan
        </span>
      </div>
    </div>
  );
}

// ─── ReportingSettingsTab ─────────────────────────────────────────────────────

export function ReportingSettingsTab() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { data: settings } = useReportingSettings();
  const { mutate: updateSettings, isPending: isSaving } = useUpdateReportingSettings();
  const { mutate: uploadLogo, isPending: isUploading } = useUploadReportingLogo();
  const { mutate: removeLogo, isPending: isRemoving } = useRemoveReportingLogo();

  const {
    logoDataUrl,
    dateFormat,
    showSignatureArea,
    setLogo,
    removeLogo: storeClearLogo,
    updateContactInfo,
    setDateFormat,
    toggleSignatureArea,
  } = useReportingSettingsStore();

  const form = useForm<ReportingSettingsFormValues>({
    resolver: zodResolver(reportingSettingsSchema),
    defaultValues: { companyName: '', phone: '', email: '', address: '' },
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
    updateContactInfo({
      companyName: settings.companyName ?? '',
      phone: settings.phone ?? '',
      email: settings.email ?? '',
      address: settings.address ?? '',
    });
  }, [settings, form, updateContactInfo]);

  // Live values for preview
  const watchedCompanyName = useWatch({ control: form.control, name: 'companyName' }) ?? '';
  const watchedPhone = useWatch({ control: form.control, name: 'phone' }) ?? '';
  const watchedEmail = useWatch({ control: form.control, name: 'email' }) ?? '';
  const watchedAddress = useWatch({ control: form.control, name: 'address' }) ?? '';

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
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      if (dataUrl) setLogo(dataUrl);
    };
    reader.readAsDataURL(file);
    uploadLogo(file);
    e.target.value = '';
  }

  const hasLogo = !!settings?.logoUrl;
  const isLogoActionPending = isUploading || isRemoving;

  return (
    <div className="grid grid-cols-[minmax(0,1fr)_280px] gap-8 xl:grid-cols-[minmax(0,1fr)_320px]">
      {/* ── Left: form ── */}
      <div className="flex flex-col divide-y divide-border">
        {/* Logo */}
        <div className="flex flex-col gap-3 pb-6">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            Şirket Logosu
          </p>

          {!hasLogo ? (
            <div className="flex items-center gap-2 rounded-lg border px-3 py-2.5 text-sm text-muted-foreground">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>Şirket logosu tanımlanmamış.</span>
            </div>
          ) : (
            <div className="flex items-start gap-3">
              <div className="flex h-16 w-28 items-center justify-center overflow-hidden rounded-md border bg-muted">
                <img
                  src={settings.logoUrl}
                  alt="Şirket logosu"
                  className="max-h-full max-w-full object-contain"
                />
              </div>
              <button
                type="button"
                onClick={() => {
                  removeLogo();
                  storeClearLogo();
                }}
                disabled={isLogoActionPending}
                className={cn(
                  'flex items-center gap-1.5 pt-1 text-sm text-destructive underline-offset-4 hover:underline',
                  isLogoActionPending && 'pointer-events-none opacity-50',
                )}
              >
                <X className="h-3.5 w-3.5" />
                Logoyu Kaldır
              </button>
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
              <Upload className="mr-2 h-3.5 w-3.5" />
              {hasLogo ? 'Logoyu Değiştir' : 'Logo Yükle'}
            </Button>
            <p className="mt-1 text-xs text-muted-foreground">
              PNG, JPG, SVG veya WEBP · Maks. 2 MB
            </p>
          </div>
        </div>

        {/* Company info */}
        <div className="flex flex-col gap-3 py-6">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            İletişim Bilgileri
          </p>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-3">
              <FormField
                control={form.control}
                name="companyName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Şirket Adı</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Building2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input placeholder="Şirket adınız" className="h-9 pl-9" {...field} />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Telefon</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                          <Input
                            placeholder="+90 212 000 00 00"
                            inputMode="tel"
                            className="h-9 pl-9"
                            {...field}
                            onChange={(e) => {
                              field.onChange(e.target.value.replace(/[^\d+\-\s()]/g, ''));
                            }}
                          />
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
                              'h-9 pl-9',
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
                          className="min-h-[72px] resize-none pl-9"
                          {...field}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end">
                <Button type="submit" size="sm" disabled={isSaving} className="min-w-36">
                  {isSaving ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}
                </Button>
              </div>
            </form>
          </Form>
        </div>

        {/* Date format */}
        <div className="flex flex-col gap-3 py-6">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            Tarih Formatı
          </p>
          <div className="relative max-w-xs">
            <Calendar className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Select value={dateFormat} onValueChange={(v) => setDateFormat(v as DateFormat)}>
              <SelectTrigger className="h-9 pl-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DATE_FORMAT_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Signature toggle */}
        <div className="flex items-center justify-between gap-4 pt-6">
          <div>
            <Label
              htmlFor="signature-toggle"
              className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground"
            >
              İmza Alanı
            </Label>
            <p className="mt-1 text-xs text-muted-foreground">
              Her raporun son sayfasına otomatik imza alanı eklenir.
            </p>
          </div>
          <Switch
            id="signature-toggle"
            checked={showSignatureArea}
            onCheckedChange={toggleSignatureArea}
          />
        </div>
      </div>

      {/* ── Right: PDF preview ── */}
      <PdfPreviewPanel
        companyName={watchedCompanyName}
        phone={watchedPhone}
        email={watchedEmail}
        address={watchedAddress}
        logoUrl={logoDataUrl ?? settings?.logoUrl}
        dateFormat={dateFormat}
        showSignatureArea={showSignatureArea}
      />
    </div>
  );
}
