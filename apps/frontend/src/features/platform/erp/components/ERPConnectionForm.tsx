import { useEffect, useRef, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import {
  Loader2,
  CheckCircle2,
  XCircle,
  Eye,
  EyeOff,
  ShieldAlert,
  ClipboardList,
  Trash2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button, buttonVariants } from '@/components/ui/button';
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
  ERP_DIMENSION_UNITS,
  ERP_WEIGHT_UNITS,
  erpConnectionFormSchema,
  type ErpConnectionFormValues,
} from '@/features/platform/erp/schemas/erpConnectionSchema';
import {
  PROVIDER_TYPE_FROM_INT,
  useDeleteERPSettings,
  useERPConnection,
  useERPSettings,
  useSaveERPSettings,
  useTestERPSettings,
} from '@/lib/api/useERPIntegration';
import type { ErpSettings } from '@/lib/types/erp';
import { getApiErrorMessage } from '@/lib/api/apiError';
import {
  ERP_NETWORK_PRECONDITIONS,
  getErpFieldGuidance,
} from '@/features/platform/erp/utils/erpFieldGuidance';

type TestResult = { success: boolean; message?: string | null; warning?: string | null } | null;

/** Kayıtlı bağlantının kullanıcıya gösterilen durumu; 'Bağlı' yalnızca güncel başarılı testle verilir. */
type ConnectionStatus = {
  label: string;
  detail: string;
  badgeClass: string;
  icon: typeof CheckCircle2;
  iconClass: string;
};

function buildConnectionStatus(
  lastTestSucceeded: boolean | null,
  lastTestedAt: string | null,
): ConnectionStatus {
  if (lastTestSucceeded === true) {
    return {
      label: 'Bağlı',
      detail: `Son başarılı test: ${formatTestDate(lastTestedAt)}`,
      badgeClass: 'text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-950/40',
      icon: CheckCircle2,
      iconClass: 'text-green-600',
    };
  }
  if (lastTestSucceeded === false) {
    return {
      label: 'Test başarısız',
      detail: `Son deneme: ${formatTestDate(lastTestedAt)} — bu ayarlarla ERP'ye bağlanılamıyor.`,
      badgeClass: 'text-destructive bg-destructive/10',
      icon: XCircle,
      iconClass: 'text-destructive',
    };
  }
  return {
    label: 'Kayıtlı (test edilmedi)',
    detail: 'Bu ayarlarla henüz başarılı bir bağlantı testi yapılmadı.',
    badgeClass: 'text-muted-foreground bg-muted',
    icon: ShieldAlert,
    iconClass: 'text-muted-foreground',
  };
}

function formatTestDate(iso: string | null): string {
  if (!iso) return '—';
  const parsed = new Date(iso);
  return Number.isNaN(parsed.getTime()) ? '—' : format(parsed, 'dd.MM.yyyy HH:mm', { locale: tr });
}

/** Sağlayıcı, veritabanı veya sunucu değiştiyse senkronizasyonun kaynağı değişiyor demektir. */
function isDataSourceChanged(values: ErpConnectionFormValues, existing: ErpSettings): boolean {
  return (
    values.systemType !== PROVIDER_TYPE_FROM_INT[existing.providerType] ||
    values.companyCode !== existing.companyCode ||
    values.serverAddress !== existing.serverAddress
  );
}

interface ERPConnectionFormProps {
  /** Kaydedilmemiş değişiklik korumasını çalıştırmak için üst sekmeye bildirilir. */
  onDirtyChange?: (dirty: boolean) => void;
}

export function ERPConnectionForm({ onDirtyChange }: ERPConnectionFormProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [testResult, setTestResult] = useState<TestResult>(null);
  const [saveDespiteFailure, setSaveDespiteFailure] = useState<ErpConnectionFormValues | null>(
    null,
  );
  /** Test sonucunun hangi form içeriğine ait olduğunu tutar. */
  const [testedSignature, setTestedSignature] = useState<string | null>(null);
  const [pendingOverwrite, setPendingOverwrite] = useState<ErpConnectionFormValues | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

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
  const { mutate: removeConnection, isPending: isDeleting } = useDeleteERPSettings();

  const form = useForm<ErpConnectionFormValues>({
    resolver: zodResolver(erpConnectionFormSchema),
    defaultValues: {
      // Varsayilan Netsis: Logo urun cekimi henuz yok, varsayilanla ilerleyen
      // kullanici senkronda "desteklenmiyor" hatasina carpiyordu.
      systemType: 'Netsis',
      companyCode: '',
      username: '',
      password: '',
      serverAddress: '',
      trustServerCertificate: false,
      dimensionUnit: 0,
      weightUnit: 0,
    },
  });

  // Kayıtlı ayar yalnızca ilk yüklemede forma basılır; test sonrası yapılan tazeleme
  // kullanıcının yarım kalan düzenlemesini silmemelidir.
  const loadedSettingsIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (!existing || loadedSettingsIdRef.current === existing.id) return;
    loadedSettingsIdRef.current = existing.id;
    form.reset({
      systemType: PROVIDER_TYPE_FROM_INT[existing.providerType] ?? 'Netsis',
      companyCode: existing.companyCode,
      username: existing.username,
      password: '',
      serverAddress: existing.serverAddress,
      trustServerCertificate: existing.trustServerCertificate,
      dimensionUnit: existing.dimensionUnit,
      weightUnit: existing.weightUnit,
    });
  }, [existing, form]);

  const watchedValues = useWatch({ control: form.control });
  const guidance = getErpFieldGuidance(watchedValues.systemType ?? 'Netsis');
  // Test sonucu yalnızca test edildiği andaki alanlar hâlâ geçerliyken gösterilir;
  // herhangi bir alan değişince bayat sonuç ekrandan kalkar.
  const formSignature = JSON.stringify(watchedValues);
  const isTestResultFresh = testResult !== null && testedSignature === formSignature;
  const status = buildConnectionStatus(
    existing?.lastTestSucceeded ?? null,
    existing?.lastTestedAt ?? null,
  );

  const { isDirty } = form.formState;
  useEffect(() => {
    onDirtyChange?.(isDirty);
  }, [isDirty, onDirtyChange]);

  async function handleCopyChecklist() {
    await navigator.clipboard.writeText(guidance.itChecklist);
    toast.success('Bilgi listesi panoya kopyalandı.', { position: 'bottom-right' });
  }

  function persistSettings(values: ErpConnectionFormValues) {
    save(values, {
      // Kayıt sonrası form temiz sayılır; şifre alanı yeniden boşaltılır.
      onSuccess: () => form.reset({ ...values, password: '' }),
    });
  }

  /**
   * Veri kaynağını değiştiren kayıt (sağlayıcı, veritabanı veya sunucu adresi)
   * teyit alınmadan uygulanmaz; senkronizasyon bundan sonra yeni kaynaktan çalışır.
   */
  function onSubmit(values: ErpConnectionFormValues) {
    if (existing && isDataSourceChanged(values, existing)) {
      setPendingOverwrite(values);
      return;
    }
    testThenSave(values);
  }

  function testThenSave(values: ErpConnectionFormValues) {
    setTestResult(null);
    setTestedSignature(formSignature);
    testConnection(values, {
      onSuccess: (result) => {
        setTestResult(result);
        if (result.success) {
          persistSettings(values);
          return;
        }
        setSaveDespiteFailure(values);
      },
      onError: (error) => {
        setTestResult({
          success: false,
          message: getApiErrorMessage(error, 'Bağlantı test edilemedi.'),
        });
        setSaveDespiteFailure(values);
      },
    });
  }

  function handleRemoveConnection() {
    removeConnection(undefined, {
      onSuccess: () => {
        setShowDeleteConfirm(false);
        setTestResult(null);
        loadedSettingsIdRef.current = null;
        form.reset({
          systemType: 'Netsis',
          companyCode: '',
          username: '',
          password: '',
          serverAddress: '',
          trustServerCertificate: false,
          dimensionUnit: 0,
          weightUnit: 0,
        });
      },
    });
  }

  function handleTestConnection() {
    form.trigger().then((valid) => {
      if (!valid) return;
      setTestResult(null);
      setTestedSignature(formSignature);
      testConnection(form.getValues(), {
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
        {existing && (
          <div className="rounded-lg border border-border bg-muted/40 px-4 py-3 flex items-center gap-3">
            <status.icon className={cn('h-4 w-4 shrink-0', status.iconClass)} />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-foreground">
                {connection?.systemName ?? PROVIDER_TYPE_FROM_INT[existing.providerType]}
              </p>
              <p className="text-xs text-muted-foreground truncate">{existing.serverAddress}</p>
              <p className="text-xs text-muted-foreground">{status.detail}</p>
            </div>
            <span
              className={cn(
                'text-[11px] font-medium px-2 py-0.5 rounded-full shrink-0',
                status.badgeClass,
              )}
            >
              {status.label}
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
              <FormDescription>
                Seçtiğiniz sisteme göre aşağıdaki alanların örnekleri ve açıklamaları değişir.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="rounded-lg border border-dashed border-border px-4 py-3">
          <p className="text-sm font-medium text-foreground">Bu bilgileri nereden bulacaksınız?</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Aşağıdaki alanların tamamı ERP sunucunuzu yöneten IT ekibinde bulunur. Listeyi
            kopyalayıp IT yöneticinize iletebilirsiniz.
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-3"
            onClick={handleCopyChecklist}
          >
            <ClipboardList className="mr-2 h-4 w-4" />
            IT'nize gönderilecek bilgi listesini kopyala
          </Button>
        </div>

        {/*
          Ağ ön koşulları yalnızca ADR dokümanındaydı. Sağlanmadığında bağlantı testi
          "sunucuya ulaşılamıyor" diyor ve kullanıcı nedenini ekranda göremiyordu.
        */}
        <div className="rounded-lg border border-dashed border-border px-4 py-3">
          <p className="text-sm font-medium text-foreground">Ağ ön koşulları</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Aşağıdakiler sağlanmadan bağlantı kurulamaz; testte &quot;sunucuya ulaşılamıyor&quot;
            hatası alırsınız.
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-muted-foreground">
            {ERP_NETWORK_PRECONDITIONS.map((precondition) => (
              <li key={precondition}>{precondition}</li>
            ))}
          </ul>
        </div>

        <FormField
          control={form.control}
          name="companyCode"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Veritabanı Adı</FormLabel>
              <FormControl>
                <Input placeholder={guidance.databasePlaceholder} {...field} />
              </FormControl>
              <FormDescription>{guidance.databaseHelp}</FormDescription>
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
                <Input
                  placeholder={guidance.usernamePlaceholder}
                  autoComplete="username"
                  {...field}
                />
              </FormControl>
              <FormDescription>{guidance.usernameHelp}</FormDescription>
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
              {existing?.hasPassword && !field.value ? (
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                  <CheckCircle2 className="h-3 w-3 text-green-600 shrink-0" />
                  Kayıtlı şifre korunuyor — değiştirmek için yeni şifre girin.
                </p>
              ) : (
                <FormDescription>{guidance.passwordHelp}</FormDescription>
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
                <Input placeholder={guidance.serverPlaceholder} {...field} />
              </FormControl>
              <FormDescription>{guidance.serverHelp}</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="dimensionUnit"
            render={({ field }) => (
              <FormItem>
                <FormLabel>ERP ölçü birimi</FormLabel>
                <Select
                  onValueChange={(value) => field.onChange(Number(value))}
                  value={String(field.value)}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Birim seçin" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {ERP_DIMENSION_UNITS.map((unit) => (
                      <SelectItem key={unit.value} value={String(unit.value)}>
                        {unit.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormDescription>
                  ERP&apos;deki en / boy / yükseklik kolonlarının birimi. ERP bu bilgiyi taşımadığı
                  için burada bildirilir; yanlış seçim ölçüleri sessizce 10 veya 100 kat kaydırır.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="weightUnit"
            render={({ field }) => (
              <FormItem>
                <FormLabel>ERP ağırlık birimi</FormLabel>
                <Select
                  onValueChange={(value) => field.onChange(Number(value))}
                  value={String(field.value)}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Birim seçin" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {ERP_WEIGHT_UNITS.map((unit) => (
                      <SelectItem key={unit.value} value={String(unit.value)}>
                        {unit.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormDescription>ERP&apos;deki birim ağırlık kolonunun birimi.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="trustServerCertificate"
          render={({ field }) => (
            <FormItem className="flex items-start justify-between gap-4 rounded-lg border border-border px-4 py-3">
              <div className="space-y-1">
                {/*
                  Eski etiket "Sunucu sertifikasını doğrulama" idi ve anahtarın açık olması
                  doğrulamanın yapıldığı gibi okunabiliyordu; davranışın tersi.
                */}
                <FormLabel>Sertifika doğrulamasını atla</FormLabel>
                <FormDescription>
                  Açıkken ERP sunucusunun TLS sertifikası doğrulanmaz; kurum içi (self-signed)
                  sertifikalı sunucular için gerekir ama bağlantı araya girme saldırılarına açık
                  hale gelir. Sunucunun geçerli bir sertifikası varsa kapalı bırakın.
                </FormDescription>
              </div>
              <FormControl>
                <Switch checked={field.value} onCheckedChange={field.onChange} />
              </FormControl>
            </FormItem>
          )}
        />

        {isTestResultFresh && testResult !== null && (
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

        {isTestResultFresh && testResult?.warning && (
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
          <Button type="submit" disabled={isSaving || isTesting}>
            {(isSaving || isTesting) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Kaydet
          </Button>
        </div>

        <p className="text-xs text-muted-foreground">
          Kaydetmeden önce bağlantı otomatik olarak test edilir.
        </p>

        {existing && (
          <div className="rounded-lg border border-destructive/40 px-4 py-3">
            <p className="text-sm font-medium text-foreground">Bağlantıyı kaldır</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Kimlik bilgileri silinir ve otomatik çekim durur. Senkronizasyon geçmişi korunur;
              bağlantıyı sonradan yeniden kurabilirsiniz.
            </p>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              className="mt-3"
              disabled={isDeleting}
              onClick={() => setShowDeleteConfirm(true)}
            >
              {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Trash2 className="mr-2 h-4 w-4" />
              Bağlantıyı kaldır
            </Button>
          </div>
        )}
      </form>

      <AlertDialog
        open={saveDespiteFailure !== null}
        onOpenChange={(open) => {
          if (!open) setSaveDespiteFailure(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Bağlantı testi başarısız</AlertDialogTitle>
            <AlertDialogDescription>
              Bu bilgilerle ERP sistemine bağlanılamadı. Yine de kaydederseniz ayarlar saklanır
              ancak senkronizasyon çalışmaz; bağlantı düzeltilene kadar ERP&apos;den ürün çekilemez.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Bilgileri düzelt</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                const values = saveDespiteFailure;
                setSaveDespiteFailure(null);
                if (values) persistSettings(values);
              }}
            >
              Yine de kaydet
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={pendingOverwrite !== null}
        onOpenChange={(open) => {
          if (!open) setPendingOverwrite(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Veri kaynağı değişiyor</AlertDialogTitle>
            <AlertDialogDescription>
              Mevcut ERP bağlantısının üzerine yazılacak; senkronizasyon bundan sonra bu yeni
              kaynaktan çalışacak. Devam etmek istiyor musunuz?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Vazgeç</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                const values = pendingOverwrite;
                setPendingOverwrite(null);
                if (values) testThenSave(values);
              }}
            >
              Üzerine yaz
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Bağlantı kaldırılsın mı?</AlertDialogTitle>
            <AlertDialogDescription>
              ERP kimlik bilgileri silinecek ve otomatik çekim duracak. ERP&apos;den yeni ürün
              çekilemeyecek; mevcut ürünler ve senkronizasyon geçmişi silinmez.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Vazgeç</AlertDialogCancel>
            <AlertDialogAction
              className={cn(buttonVariants({ variant: 'destructive' }))}
              onClick={(event) => {
                event.preventDefault();
                handleRemoveConnection();
              }}
            >
              Bağlantıyı kaldır
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Form>
  );
}
