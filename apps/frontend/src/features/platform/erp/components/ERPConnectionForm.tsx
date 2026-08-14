import { useEffect, useRef, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Loader2, Eye, EyeOff } from 'lucide-react';
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
import { ErpConnectionStatusCard } from '@/features/platform/erp/components/ErpConnectionStatusCard';
import {
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

type TestResult = { success: boolean; message?: string | null; warning?: string | null };

const TOAST_OPTIONS = { position: 'bottom-right' } as const;

/**
 * Sertifika uyarısı test başarılı olsa da çıkabilir; ayrı bir bildirim olarak ve daha
 * uzun süreyle gösterilir, sonucun içinde eriyip kaybolmamalı.
 */
function notifyCertificateWarning(warning: string | null | undefined) {
  if (warning) {
    toast.warning(warning, { ...TOAST_OPTIONS, duration: 8000 });
  }
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
  const [saveDespiteFailure, setSaveDespiteFailure] = useState<ErpConnectionFormValues | null>(
    null,
  );
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

  /**
   * Birimler artık ayrı bölümden yönetiliyor ama aynı kaydın parçası. Formdaki kopya
   * bağlantı kaydedilirken bayat kalabileceği için kayıtlı değer geri yazılır; aksi
   * halde bağlantıyı kaydetmek birim değişikliğini sessizce geri alırdı.
   */
  function withSavedUnits(values: ErpConnectionFormValues): ErpConnectionFormValues {
    if (!existing) return values;
    return {
      ...values,
      dimensionUnit: existing.dimensionUnit,
      weightUnit: existing.weightUnit,
    };
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

  /**
   * Kaydetmeden önceki test. Sonucu ayrıca bildirmez: başarılıysa kaydetme bildirimi,
   * başarısızsa teyit diyaloğu zaten çıkıyor; üzerine bir de toast eklemek aynı olayı
   * iki kez anlatırdı.
   */
  function testThenSave(input: ErpConnectionFormValues) {
    const values = withSavedUnits(input);
    testConnection(values, {
      onSuccess: (result) => {
        notifyCertificateWarning(result.warning);
        if (result.success) {
          persistSettings(values);
          return;
        }
        setSaveDespiteFailure(values);
      },
      onError: () => setSaveDespiteFailure(values),
    });
  }

  function handleRemoveConnection() {
    removeConnection(undefined, {
      onSuccess: () => {
        setShowDeleteConfirm(false);
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

  /** Kullanıcının kendi başlattığı test; tek geri bildirimi toast. */
  function handleTestConnection() {
    form.trigger().then((valid) => {
      if (!valid) return;
      testConnection(withSavedUnits(form.getValues()), {
        onSuccess: (result: TestResult) => {
          if (result.success) {
            toast.success(result.message ?? 'Bağlantı başarılı.', TOAST_OPTIONS);
          } else {
            toast.error(
              result.message ??
                'Sunucuya ulaşılamadı. Sunucu adresini ve kimlik bilgilerini kontrol edin.',
              TOAST_OPTIONS,
            );
          }
          notifyCertificateWarning(result.warning);
        },
        onError: (error) => {
          toast.error(getApiErrorMessage(error, 'Bağlantı test edilemedi.'), TOAST_OPTIONS);
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
        <ErpConnectionStatusCard
          settings={existing ?? null}
          systemName={connection?.systemName}
          isTesting={isTesting}
          isDeleting={isDeleting}
          onTest={handleTestConnection}
          onRemove={() => setShowDeleteConfirm(true)}
          onCopyChecklist={handleCopyChecklist}
        />

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

        </div>

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
