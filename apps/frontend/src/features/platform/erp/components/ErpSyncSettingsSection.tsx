import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { QueryErrorState } from '@/components/shared/QueryErrorState';
import { FieldLabelRow } from '@/features/platform/erp/components/FieldHint';
import {
  ERP_DIMENSION_UNITS,
  ERP_WEIGHT_UNITS,
} from '@/features/platform/erp/schemas/erpConnectionSchema';
import {
  PROVIDER_TYPE_FROM_INT,
  useERPConnection,
  useERPSettings,
  useERPSyncSettings,
  useSaveERPSettings,
  useSaveERPSyncSettings,
} from '@/lib/api/useERPIntegration';
import { ErpSyncInterval } from '@/lib/types/erp';

const DIMENSION_HINT =
  'ERP tarafındaki en / boy / yükseklik kolonlarının birimi. ERP bu bilgiyi taşımadığı için ' +
  'burada bildirilir. Değiştirdiğinizde ERP ürünlerinin ölçüleri yeniden hesaplanır; ' +
  'senkronizasyon beklemeniz gerekmez.';

const WEIGHT_HINT =
  'ERP tarafındaki birim ağırlık kolonunun birimi. Değiştirdiğinizde mevcut ERP ürünlerinin ' +
  'ağırlıkları yeniden hesaplanır.';

const AUTO_SYNC_HINT =
  'Açıkken ERP ürünleri seçtiğiniz sıklıkta arka planda senkronize edilir. Zamanlayıcı vadesi ' +
  'gelenleri 15 dakikada bir tarar; o sırada devam eden bir çalışma varsa sıra bir sonraki ' +
  'taramaya kalır.';

/**
 * ERP birimleri ve otomatik senkronizasyon. Aynı ayarlar ERP Ürünleri ekranındaki
 * senkronizasyon diyaloğunda da var; kullanıcı kurulumu bitirdiği yerden ayrılmadan
 * bunları da görebilsin diye burada tekrarlanır. İkisi de sunucudaki tek kaydı yazar,
 * yerel kopya tutulmaz.
 *
 * Bağlantı yokken bölüm gizlenmez: kaybolan bir alan "bu ayar nerede" sorusunu doğurur.
 * Kontroller devre dışı kalır ve nedeni yazar.
 */
export function ErpSyncSettingsSection() {
  const { data: settings, isLoading: isSettingsLoading } = useERPSettings();
  const { data: connection } = useERPConnection();
  const integrationId = connection?.id ?? null;

  const { mutate: saveSettings, isPending: isSavingSettings } = useSaveERPSettings();
  const {
    data: syncSettings,
    isLoading: isSyncLoading,
    isError: isSyncError,
    error: syncError,
    refetch: refetchSync,
  } = useERPSyncSettings(integrationId ?? '');
  const { mutate: saveSyncSettings, isPending: isSavingSync } = useSaveERPSyncSettings();

  const hasConnection = Boolean(settings);
  const isAutoSyncOn = syncSettings?.syncInterval != null;

  /**
   * Birim, bağlantı ayarlarıyla aynı kaydın parçası. Kayıtlı değerler olduğu gibi geri
   * gönderilir; eksik gönderilen alan sunucuda varsayılana düşerdi. Şifre gönderilmez,
   * sunucu kayıtlı olanı korur.
   */
  function saveUnits(patch: { dimensionUnit?: number; weightUnit?: number }) {
    if (!settings) return;
    saveSettings({
      systemType: PROVIDER_TYPE_FROM_INT[settings.providerType] ?? 'Netsis',
      companyCode: settings.companyCode,
      username: settings.username,
      password: '',
      serverAddress: settings.serverAddress,
      trustServerCertificate: settings.trustServerCertificate,
      dimensionUnit: patch.dimensionUnit ?? settings.dimensionUnit,
      weightUnit: patch.weightUnit ?? settings.weightUnit,
    });
  }

  /**
   * Anahtar kapatıldığında sıklık boşaltılır; zamanlayıcı sıklığı olmayan entegrasyonu
   * hiç tetiklemez. Açıldığında kullanıcıya sormadan bir sıklık gerekir, günlük en az
   * sürprizli olan.
   */
  function handleToggleAutoSync(enabled: boolean) {
    if (!integrationId) return;
    saveSyncSettings({
      integrationId,
      syncInterval: enabled ? ErpSyncInterval.Daily : null,
    });
  }

  const isUnitsDisabled = !hasConnection || isSettingsLoading || isSavingSettings;

  return (
    <div className="space-y-4 rounded-lg border border-border bg-muted/40 px-4 py-3">
      {!hasConnection && !isSettingsLoading && (
        <p className="text-xs leading-relaxed text-muted-foreground">
          Bu ayarlar ERP bağlantısı kurulduktan sonra kullanılabilir.
        </p>
      )}

      <div className="grid gap-x-4 gap-y-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <FieldLabelRow hintLabel="Ölçü birimi hakkında bilgi" hint={DIMENSION_HINT}>
            <Label htmlFor="erp-dimension-unit">ERP ölçü birimi</Label>
          </FieldLabelRow>
          <Select
            disabled={isUnitsDisabled}
            value={String(settings?.dimensionUnit ?? 0)}
            onValueChange={(value) => saveUnits({ dimensionUnit: Number(value) })}
          >
            <SelectTrigger id="erp-dimension-unit">
              <SelectValue placeholder="Birim seçin" />
            </SelectTrigger>
            <SelectContent>
              {ERP_DIMENSION_UNITS.map((unit) => (
                <SelectItem key={unit.value} value={String(unit.value)}>
                  {unit.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <FieldLabelRow hintLabel="Ağırlık birimi hakkında bilgi" hint={WEIGHT_HINT}>
            <Label htmlFor="erp-weight-unit">ERP ağırlık birimi</Label>
          </FieldLabelRow>
          <Select
            disabled={isUnitsDisabled}
            value={String(settings?.weightUnit ?? 0)}
            onValueChange={(value) => saveUnits({ weightUnit: Number(value) })}
          >
            <SelectTrigger id="erp-weight-unit">
              <SelectValue placeholder="Birim seçin" />
            </SelectTrigger>
            <SelectContent>
              {ERP_WEIGHT_UNITS.map((unit) => (
                <SelectItem key={unit.value} value={String(unit.value)}>
                  {unit.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Separator />

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <FieldLabelRow hintLabel="Otomatik senkronizasyon hakkında bilgi" hint={AUTO_SYNC_HINT}>
            <p className="text-sm font-medium text-foreground">Otomatik senkronizasyon</p>
          </FieldLabelRow>

          {integrationId && isSyncLoading ? (
            <Skeleton className="h-6 w-10" />
          ) : (
            !isSyncError && (
              <Switch
                checked={isAutoSyncOn}
                onCheckedChange={handleToggleAutoSync}
                disabled={!integrationId || isSavingSync}
                aria-label="Otomatik senkronizasyon"
              />
            )
          )}
        </div>

        {isSyncError ? (
          <QueryErrorState
            error={syncError}
            title="Senkronizasyon ayarları yüklenemedi"
            fallbackMessage="Kayıtlı sıklık okunamadı; gösterilen değerler güncel olmayabilir."
            onRetry={() => void refetchSync()}
          />
        ) : (
          // Sıklık seçenekleri yalnızca anahtar açıkken anlamlı; kapalıyken ekranda
          // durunca hangi seçeneğin geçerli olduğu belirsiz kalıyordu.
          isAutoSyncOn && (
            <RadioGroup
              value={syncSettings?.syncInterval ?? ErpSyncInterval.Daily}
              onValueChange={(value) =>
                integrationId &&
                saveSyncSettings({
                  integrationId,
                  syncInterval: value as (typeof ErpSyncInterval)[keyof typeof ErpSyncInterval],
                })
              }
              disabled={isSavingSync}
              className="flex flex-wrap items-center gap-x-6 gap-y-2"
            >
              <div className="flex items-center gap-2">
                <RadioGroupItem value={ErpSyncInterval.FourHours} id="settings-interval-4h" />
                <Label htmlFor="settings-interval-4h" className="cursor-pointer font-normal">
                  4 saatte bir
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value={ErpSyncInterval.Daily} id="settings-interval-daily" />
                <Label htmlFor="settings-interval-daily" className="cursor-pointer font-normal">
                  Günlük
                </Label>
              </div>
            </RadioGroup>
          )
        )}
      </div>
    </div>
  );
}
