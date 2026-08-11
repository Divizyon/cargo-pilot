import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, CheckCircle2, XCircle, Eye, EyeOff, ShieldAlert } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { QueryErrorState } from '@/components/shared/QueryErrorState';
import {
  erpConnectionFormSchema,
  type ErpConnectionFormValues,
} from '@/features/platform/erp/schemas/erpConnectionSchema';
import {
  PROVIDER_TYPE_FROM_INT,
  useERPConnection,
  useERPSettings,
  useSaveERPSettings,
  useTestERPSettings,
} from '@/lib/api/useERPIntegration';
import { getApiErrorMessage } from '@/lib/api/apiError';

type TestResult = { success: boolean; message?: string | null; warning?: string | null } | null;

export function ERPConnectionForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [testResult, setTestResult] = useState<TestResult>(null);

  const { data: connection } = useERPConnection();
  const {
    data: existing,
    isLoading: isLoadingExisting,
    isError: isSettingsError,
    error: settingsError,
    refetch: refetchSettings,
  } = useERPSettings();
  const { mutate: save, isPending: isSaving } = useSaveERPSettings();
  const { mutate: testConnection, isPending: isTesting } = useTestERPSettings();

  const form = useForm<ErpConnectionFormValues>({
    resolver: zodResolver(erpConnectionFormSchema),
    defaultValues: {
      systemType: 'Logo',
      companyCode: '',
      username: '',
      password: '',
      serverAddress: '',
      trustServerCertificate: true,
    },
  });

  useEffect(() => {
    if (!existing) return;
    form.reset({
      systemType: PROVIDER_TYPE_FROM_INT[existing.providerType] ?? 'Logo',
      companyCode: existing.companyCode,
      username: existing.username,
      password: '',
      serverAddress: existing.serverAddress,
      trustServerCertificate: existing.trustServerCertificate,
    });
  }, [existing, form]);

  function onSubmit(values: ErpConnectionFormValues) {
    setTestResult(null);
    save(values);
  }

  function handleTestConnection() {
    form.trigger().then((valid) => {
      if (!valid) return;
      const values = form.getValues();
      if (existing?.hasPassword && !values.password) {
        setTestResult({
          success: false,
          message: 'Bağlantıyı test etmek için şifrenizi tekrar girin.',
        });
        return;
      }
      setTestResult(null);
      testConnection(values, {
        onSuccess: (result) => setTestResult(result),
        onError: (error) => {
          setTestResult({
            success: false,
            message: getApiErrorMessage(error, 'Bağlantı test edilemedi.'),
          });
        },
      });
    });
  }

  if (isLoadingExisting) {
    return (
      <div className="flex items-center gap-2 py-8 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>Bağlantı bilgileri yükleniyor…</span>
      </div>
    );
  }

  // Ayarlar okunamadiysa boş form gostermek "kayit yok" yanilgisi uretir.
  if (isSettingsError) {
    return (
      <QueryErrorState
        error={settingsError}
        title="ERP bağlantı ayarları yüklenemedi"
        fallbackMessage="Kayıtlı ayarlar okunamadı. Formu doldurmak mevcut ayarların üzerine yazabilir; önce tekrar deneyin."
        onRetry={() => void refetchSettings()}
      />
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
        {connection && (
          <div className="rounded-lg border border-border bg-muted/40 px-4 py-3 flex items-center gap-3">
            <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-foreground">{connection.systemName}</p>
              <p className="text-xs text-muted-foreground truncate">{connection.apiEndpoint}</p>
            </div>
            <span className="text-[11px] text-green-700 dark:text-green-400 font-medium bg-green-50 dark:bg-green-950/40 px-2 py-0.5 rounded-full shrink-0">
              Bağlı
            </span>
          </div>
        )}
        <FormField
          control={form.control}
          name="systemType"
          render={({ field }) => (
            <FormItem>
              <FormLabel>ERP Sistemi</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Sistem seçin" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="Logo">Logo</SelectItem>
                  <SelectItem value="Netsis">Netsis</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="companyCode"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Şirket Kodu</FormLabel>
              <FormControl>
                <Input placeholder="001" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="username"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Kullanıcı Adı</FormLabel>
              <FormControl>
                <Input placeholder="erp_user" autoComplete="username" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Şifre</FormLabel>
              <FormControl>
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    placeholder={existing ? '••••••••' : 'ERP şifrenizi girin'}
                    autoComplete="current-password"
                    className="pr-10"
                    {...field}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={showPassword ? 'Şifreyi gizle' : 'Şifreyi göster'}
                    aria-pressed={showPassword}
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-1 top-1/2 h-8 w-8 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </FormControl>
              {existing?.hasPassword && !field.value && (
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                  <CheckCircle2 className="h-3 w-3 text-green-600 shrink-0" />
                  Kayıtlı şifre korunuyor — değiştirmek için yeni şifre girin.
                </p>
              )}
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="serverAddress"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Sunucu Adresi</FormLabel>
              <FormControl>
                <Input placeholder="192.168.1.100 veya erp.sirket.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="trustServerCertificate"
          render={({ field }) => (
            <FormItem className="flex items-start justify-between gap-4 rounded-lg border border-border px-4 py-3">
              <div className="space-y-1">
                <FormLabel>Sunucu sertifikasını doğrulama</FormLabel>
                <FormDescription>
                  Açıkken ERP sunucusunun TLS sertifikası doğrulanmaz; kurum içi (self-signed)
                  sertifikalı sunucular için gerekir ama bağlantı araya girme saldırılarına
                  açık hale gelir. Sunucunun geçerli bir sertifikası varsa kapatın.
                </FormDescription>
              </div>
              <FormControl>
                <Switch checked={field.value} onCheckedChange={field.onChange} />
              </FormControl>
            </FormItem>
          )}
        />

        {testResult !== null && (
          <div
            className={cn(
              'flex items-start gap-2.5 rounded-lg border px-3.5 py-3 text-sm',
              testResult.success
                ? 'border-green-200 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-950/40 dark:text-green-300'
                : 'border-destructive/40 bg-destructive/10 text-destructive',
            )}
          >
            {testResult.success ? (
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-600 dark:text-green-400" />
            ) : (
              <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
            )}
            <span>
              {testResult.success
                ? (testResult.message ?? 'Bağlantı başarılı.')
                : (testResult.message ??
                  'Sunucuya ulaşılamadı. Sunucu adresini ve kimlik bilgilerini kontrol edin.')}
            </span>
          </div>
        )}

        {testResult?.warning && (
          <div className="flex items-start gap-2.5 rounded-lg border border-amber-300 bg-amber-50 px-3.5 py-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{testResult.warning}</span>
          </div>
        )}

        <Separator />

        <div className="flex gap-3">
          <Button
            type="button"
            variant="outline"
            disabled={isTesting}
            onClick={handleTestConnection}
          >
            {isTesting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Bağlantıyı Test Et
          </Button>
          <Button type="submit" disabled={isSaving}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Kaydet
          </Button>
        </div>
      </form>
    </Form>
  );
}
