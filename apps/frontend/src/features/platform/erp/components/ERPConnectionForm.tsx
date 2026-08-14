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
  Trash2,
  PlugZap,
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
import { Switch } from '@/components/ui/switch';
import { QueryErrorState } from '@/components/shared/QueryErrorState';
import { FieldLabelRow } from '@/features/platform/erp/components/FieldHint';
import {
  ErpSetupHelpCard,
  ErpSetupHelpPopover,
} from '@/features/platform/erp/components/ErpSetupHelp';
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
import { getErpFieldGuidance } from '@/features/platform/erp/utils/erpFieldGuidance';

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

  // Baglan yalnizca zorunlu alanlarin tamami dolduysa etkinlesir. Sifre kayitliysa
  // tekrar istenmez; kullanici yalnizca degistirmek isterse doldurur.
  const hasRequiredFields =
    Boolean(watchedValues.companyCode?.trim()) &&
    Boolean(watchedValues.username?.trim()) &&
    Boolean(watchedValues.serverAddress?.trim()) &&
    (Boolean(existing?.hasPassword) || Boolean(watchedValues.password?.trim()));

  /** Iptal formu kayitli hale dondurur; kayit yoksa bos forma. */
  function handleCancelEdits() {
    setTestResult(null);
    form.reset(
      existing
        ? {
            systemType: PROVIDER_TYPE_FROM_INT[existing.providerType] ?? 'Netsis',
            companyCode: existing.companyCode,
            username: existing.username,
            password: '',
            serverAddress: existing.serverAddress,
            trustServerCertificate: existing.trustServerCertificate,
            dimensionUnit: existing.dimensionUnit,
            weightUnit: existing.weightUnit,
          }
        : {
            systemType: 'Netsis',
            companyCode: '',
            username: '',
            password: '',
            serverAddress: '',
            trustServerCertificate: false,
            dimensionUnit: 0,
            weightUnit: 0,
          },
    );
  }
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
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {existing ? (
          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
            <div className="flex min-w-0 items-center gap-2.5">
              <status.icon className={cn('h-4 w-4 shrink-0', status.iconClass)} />
              <div className="flex min-w-0 flex-wrap items-baseline gap-x-2">
                <span className="text-sm font-medium text-foreground">
                  {connection?.systemName ?? PROVIDER_TYPE_FROM_INT[existing.providerType]}
                </span>
                <span className="truncate text-xs text-muted-foreground">
                  {existing.serverAddress}
                </span>
                {/* Son test bilgisi metin olarak kalir; title icine gomulseydi
                    ekran okuyucuya ve dokunmatik cihaza ulasmazdi. */}
                <span className="text-xs text-muted-foreground">{status.detail}</span>
              </div>
              <span
                className={cn(
                  'shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium',
                  status.badgeClass,
                )}
              >
                {status.label}
              </span>
            </div>

            {/* Test ve kaldirma yalnizca kurulu baglantida anlamli; kurulum sirasinda
                ekranda durup kullaniciyi yaniltiyordu. */}
            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 gap-1.5 px-2 text-xs"
                disabled={isTesting}
                onClick={handleTestConnection}
              >
                {isTesting ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <PlugZap className="h-3.5 w-3.5" />
                )}
                Test Et
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 gap-1.5 px-2 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
                disabled={isDeleting}
                onClick={() => setShowDeleteConfirm(true)}
              >
                {isDeleting ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Trash2 className="h-3.5 w-3.5" />
                )}
                Kaldır
              </Button>
              <ErpSetupHelpPopover onCopyChecklist={handleCopyChecklist} />
            </div>
          </div>
        ) : (
          <ErpSetupHelpCard onCopyChecklist={handleCopyChecklist} />
        )}

        {/*
          Alan aciklamalari etiketin yanindaki ipucuna tasindi. Paragraf olarak dururken
          form ekrana sigmiyor, alanlar arasindaki olu alan okumayi zorlastiriyordu.
        */}
        <div className="grid gap-x-4 gap-y-3 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="systemType"
            render={({ field }) => (
              <FormItem className="space-y-1.5">
                <FieldLabelRow
                  hintLabel="ERP sistemi hakkında bilgi"
                  hint="Seçtiğiniz sisteme göre alanların örnekleri ve açıklamaları değişir."
                >
                  <FormLabel>ERP Sistemi</FormLabel>
                </FieldLabelRow>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Sistem seçin" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="Netsis">Netsis</SelectItem>
                    <SelectItem value="Logo">Logo</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="serverAddress"
            render={({ field }) => (
              <FormItem className="space-y-1.5">
                <FieldLabelRow hintLabel="Sunucu adresi hakkında bilgi" hint={guidance.serverHelp}>
                  <FormLabel>Sunucu Adresi</FormLabel>
                </FieldLabelRow>
                <FormControl>
                  <Input placeholder={guidance.serverPlaceholder} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="companyCode"
            render={({ field }) => (
              <FormItem className="space-y-1.5">
                <FieldLabelRow
                  hintLabel="Veritabanı adı hakkında bilgi"
                  hint={guidance.databaseHelp}
                >
                  <FormLabel>Veritabanı Adı</FormLabel>
                </FieldLabelRow>
                <FormControl>
                  <Input placeholder={guidance.databasePlaceholder} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="username"
            render={({ field }) => (
              <FormItem className="space-y-1.5">
                <FieldLabelRow
                  hintLabel="Kullanıcı adı hakkında bilgi"
                  hint={guidance.usernameHelp}
                >
                  <FormLabel>Kullanıcı Adı</FormLabel>
                </FieldLabelRow>
                <FormControl>
                  <Input
                    placeholder={guidance.usernamePlaceholder}
                    autoComplete="username"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem className="space-y-1.5">
                <FieldLabelRow hintLabel="Şifre hakkında bilgi" hint={guidance.passwordHelp}>
                  <FormLabel>Şifre</FormLabel>
                </FieldLabelRow>
                {/* FormControl yalnizca Input'u sarar; div'i sardiginda etiket
                    input yerine div'e baglaniyor ve iliski kopuyordu. */}
                <div className="relative">
                  <FormControl>
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      placeholder={
                        existing?.hasPassword ? 'Kayıtlı şifre korunuyor' : 'ERP şifrenizi girin'
                      }
                      autoComplete="current-password"
                      className="pr-10"
                      {...field}
                    />
                  </FormControl>
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
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="trustServerCertificate"
            render={({ field }) => (
              <FormItem className="flex h-10 items-center justify-between gap-3 space-y-0 self-end rounded-md border border-border px-3">
                <FieldLabelRow
                  hintLabel="Sertifika doğrulaması hakkında bilgi"
                  hint="Açıkken ERP sunucusunun TLS sertifikası doğrulanmaz. Kurum içi (self-signed) sertifikalı sunucular için gerekir ama bağlantı araya girme saldırılarına açık hale gelir. Sunucunun geçerli bir sertifikası varsa kapalı bırakın."
                >
                  <FormLabel className="cursor-pointer text-sm font-normal">
                    Sertifika doğrulamasını atla
                  </FormLabel>
                </FieldLabelRow>
                <FormControl>
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="dimensionUnit"
            render={({ field }) => (
              <FormItem className="space-y-1.5">
                <FieldLabelRow
                  hintLabel="Ölçü birimi hakkında bilgi"
                  hint="ERP tarafındaki en / boy / yükseklik kolonlarının birimi. ERP bu bilgiyi taşımadığı için burada bildirilir; yanlış seçim ölçüleri sessizce 10 veya 100 kat kaydırır."
                >
                  <FormLabel>ERP ölçü birimi</FormLabel>
                </FieldLabelRow>
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
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="weightUnit"
            render={({ field }) => (
              <FormItem className="space-y-1.5">
                <FieldLabelRow
                  hintLabel="Ağırlık birimi hakkında bilgi"
                  hint="ERP tarafındaki birim ağırlık kolonunun birimi."
                >
                  <FormLabel>ERP ağırlık birimi</FormLabel>
                </FieldLabelRow>
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
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {isTestResultFresh && testResult !== null && (
          <div
            className={cn(
              'flex items-start gap-2.5 rounded-md border px-3 py-2 text-sm',
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
          <div className="flex items-start gap-2.5 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{testResult.warning}</span>
          </div>
        )}

        {/*
          Kaydet dugmesi formun icinden kaldirildi. Degisiklik yapilir yapilmaz alttan
          cikan cubuk, urun ekranlarindaki kaydetme deseninin aynisi; kullanici formun
          sonuna kadar inmeden aksiyona ulasiyor.
        */}
        <div
          className={cn(
            'fixed bottom-6 left-1/2 z-40 -translate-x-1/2 transition-all duration-300 ease-out',
            isDirty ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-4 opacity-0',
          )}
        >
          <div className="flex items-center gap-2 rounded-2xl border border-border bg-background px-6 py-3 shadow-lg">
            <Button
              type="button"
              variant="ghost"
              className="text-muted-foreground hover:text-foreground"
              onClick={handleCancelEdits}
            >
              İptal
            </Button>
            <Button
              type="submit"
              className="gap-1.5"
              disabled={!hasRequiredFields || isSaving || isTesting}
            >
              {(isSaving || isTesting) && <Loader2 className="h-4 w-4 animate-spin" />}
              Bağlan
            </Button>
          </div>
        </div>
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
              ERP kimlik bilgileri silinecek ve otomatik senkronizasyon duracak. ERP ile
              senkronizasyon yapılamayacak; mevcut ürünler ve geçmiş silinmez.
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
