import { RefreshCw, Loader2, Clock, AlertTriangle } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { tr } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { QueryErrorState } from '@/components/shared/QueryErrorState';
import {
  useERPSyncSettings,
  useSaveERPSyncSettings,
  useRunERPSyncNow,
} from '@/lib/api/useERPIntegration';
import { useERPConnection } from '@/lib/api/useERPIntegration';
import { ErpSyncInterval, ErpSyncStatus } from '@/lib/types/erp';

function formatSyncDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  return format(parseISO(iso), 'dd.MM.yyyy HH:mm', { locale: tr });
}

export function ERPSyncPanel() {
  const {
    data: connection,
    isError: isConnectionError,
    error: connectionError,
    refetch: refetchConnection,
  } = useERPConnection();
  const integrationId = connection?.id;

  const {
    data: syncSettings,
    isLoading: isSettingsLoading,
    isError: isSettingsError,
    error: settingsError,
    refetch: refetchSettings,
  } = useERPSyncSettings(integrationId);

  const { mutate: saveSettings, isPending: isSavingSettings } = useSaveERPSyncSettings();
  const { mutate: runNow, isPending: isRunNowPending } = useRunERPSyncNow();

  // Seçili sıklık yalnızca sunucu verisinden okunur; yerel kopya kullanıcının
  // kayıtlı ayarını farkında olmadan ezmesine yol açıyordu.
  const selectedInterval = syncSettings?.syncInterval ?? ErpSyncInterval.Daily;

  const isRunning = syncSettings?.syncStatus === ErpSyncStatus.Running;
  const isLastSyncFailed = syncSettings?.syncStatus === ErpSyncStatus.Failed;
  const isSyncDisabled = isRunning || isRunNowPending || !integrationId;

  function handleSaveInterval(value: string) {
    if (!integrationId) return;
    saveSettings({
      integrationId,
      syncInterval: value as (typeof ErpSyncInterval)[keyof typeof ErpSyncInterval],
    });
  }

  function handleRunNow() {
    if (!integrationId) return;
    runNow(integrationId);
  }

  // Bağlantı sorgusu hata verdiyse "bağlantı yok" demek yanlis olur.
  if (isConnectionError) {
    return (
      <QueryErrorState
        error={connectionError}
        title="ERP bağlantısı okunamadı"
        fallbackMessage="Bağlantı bilgisi alınamadı; senkronizasyon ayarları gösterilemiyor."
        onRetry={() => void refetchConnection()}
      />
    );
  }

  if (!integrationId) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        Senkronizasyon ayarlarına erişmek için önce ERP bağlantısını kaydedin.
      </p>
    );
  }

  return (
    <div className="divide-y divide-border">
      {/* Otomatik senkronizasyon sıklığı */}
      <div className="space-y-4 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-foreground">Otomatik Senkronizasyon Sıklığı</p>
            <Badge variant="outline" className="text-[10px]">
              Yakında
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Otomatik zamanlayıcı henüz devrede değil. Seçtiğiniz sıklık kaydedilir ve zamanlayıcı
            açıldığında uygulanır; şimdilik senkronizasyonu aşağıdaki düğmeyle başlatın.
          </p>
        </div>

        {isSettingsLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-5 w-32" />
          </div>
        ) : isSettingsError ? (
          <QueryErrorState
            error={settingsError}
            title="Senkronizasyon ayarları yüklenemedi"
            fallbackMessage="Kayıtlı sıklık ve durum okunamadı; gösterilen değerler güncel olmayabilir."
            onRetry={() => void refetchSettings()}
          />
        ) : (
          <RadioGroup
            value={selectedInterval}
            onValueChange={handleSaveInterval}
            disabled={isSavingSettings}
            className="gap-3"
          >
            <div className="flex items-center gap-3">
              <RadioGroupItem value={ErpSyncInterval.FourHours} id="interval-4h" />
              <Label htmlFor="interval-4h" className="cursor-pointer">
                4 saatte bir
              </Label>
            </div>
            <div className="flex items-center gap-3">
              <RadioGroupItem value={ErpSyncInterval.Daily} id="interval-daily" />
              <Label htmlFor="interval-daily" className="cursor-pointer">
                Günlük
              </Label>
            </div>
          </RadioGroup>
        )}
      </div>

      {/* Manuel senkronizasyon */}
      <div className="space-y-4 pt-6">
        <div>
          <p className="text-sm font-medium text-foreground">Manuel Senkronizasyon</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            ERP'den ürün verilerini şimdi çekin. Sonucun satır kırılımı Senkronizasyon Geçmişi
            sekmesinde görünür.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Button onClick={handleRunNow} disabled={isSyncDisabled}>
            {isRunning || isRunNowPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            {isRunning ? 'Senkronizasyon devam ediyor…' : 'Şimdi Senkronize Et'}
          </Button>

          {syncSettings?.lastSyncedAt && (
            <span className="flex items-center gap-2 text-xs text-muted-foreground">
              <Clock className="h-3.5 w-3.5 shrink-0" />
              Son senkronizasyon: {formatSyncDate(syncSettings.lastSyncedAt)}
            </span>
          )}
        </div>

        {isLastSyncFailed && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <div>
              <AlertDescription>
                Son senkronizasyon başarısız oldu. Ayrıntı için Geçmiş sekmesindeki hata mesajına
                bakın, ardından yeniden deneyin.
              </AlertDescription>
            </div>
          </Alert>
        )}
      </div>
    </div>
  );
}
