import { Link } from 'react-router-dom';
import { ArrowRight, Loader2, Clock, CalendarClock, AlertTriangle } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { tr } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { QueryErrorState } from '@/components/shared/QueryErrorState';
import { RequiresErpConnection } from '@/features/platform/erp/components/RequiresErpConnection';
import { useERPSyncSettings, useSaveERPSyncSettings } from '@/lib/api/useERPIntegration';
import { ERP_TERM } from '@/lib/config/erpTerms';
import { ErpSyncInterval, ErpSyncStatus } from '@/lib/types/erp';

/** Elle çekim tek yüzeyde toplanır: ERP Ürünleri ekranındaki "ERP'den Ürün Çek" butonu. */
const ERP_ITEMS_ROUTE = '/erp';

function formatSyncDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  return format(parseISO(iso), 'dd.MM.yyyy HH:mm', { locale: tr });
}

/** Manuel ve otomatik çalıştırmalar aynı durumu yazar; kullanıcı sonucu tarihle birlikte görür. */
function lastSyncOutcomeLabel(status: ErpSyncStatus | undefined): string {
  if (status === ErpSyncStatus.Running) return 'devam ediyor';
  return status === ErpSyncStatus.Failed ? 'başarısız' : 'başarılı';
}

function ErpSyncSettings({ integrationId }: { integrationId: string }) {
  const {
    data: syncSettings,
    isLoading: isSettingsLoading,
    isError: isSettingsError,
    error: settingsError,
    refetch: refetchSettings,
  } = useERPSyncSettings(integrationId);

  const { mutate: saveSettings, isPending: isSavingSettings } = useSaveERPSyncSettings();

  // Seçili sıklık yalnızca sunucu verisinden okunur; yerel kopya kullanıcının
  // kayıtlı ayarını farkında olmadan ezmesine yol açıyordu.
  const selectedInterval = syncSettings?.syncInterval ?? ErpSyncInterval.Daily;

  const isRunning = syncSettings?.syncStatus === ErpSyncStatus.Running;
  const isLastSyncFailed = syncSettings?.syncStatus === ErpSyncStatus.Failed;

  function handleSaveInterval(value: string) {
    saveSettings({
      integrationId,
      syncInterval: value as (typeof ErpSyncInterval)[keyof typeof ErpSyncInterval],
    });
  }

  return (
    <div className="divide-y divide-border">
      {/* Otomatik senkronizasyon sıklığı */}
      <div className="space-y-4 pb-6">
        <div>
          <p className="text-sm font-medium text-foreground">Otomatik Çekim Sıklığı</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Seçtiğiniz sıklıkta ERP ürünleri arka planda otomatik çekilir. Zamanlayıcı vadesi
            gelenleri 15 dakikada bir tarar; o sırada devam eden bir çekim varsa sıra bir sonraki
            taramaya kalır.
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

        {syncSettings?.nextScheduledSyncAt && (
          <p className="flex items-center gap-2 text-xs text-muted-foreground">
            <CalendarClock className="h-3.5 w-3.5 shrink-0" />
            Sonraki otomatik çekim: {formatSyncDate(syncSettings.nextScheduledSyncAt)}
          </p>
        )}
      </div>

      {/* Elle çekim tek yüzeyde: ERP Ürünleri ekranı */}
      <div className="space-y-4 pt-6">
        <div>
          <p className="text-sm font-medium text-foreground">Elle Çekim</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            ERP'den ürünleri elle çekmek ve gelen ürünleri onaylamak için ERP Ürünleri ekranını
            kullanın. Sonucun satır kırılımı Senkronizasyon Geçmişi sekmesinde görünür.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Button asChild variant="outline">
            <Link to={ERP_ITEMS_ROUTE}>
              {ERP_TERM.sync}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>

          {isRunning && (
            <span className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" />
              {ERP_TERM.syncRunning}
            </span>
          )}

          {syncSettings?.lastSyncedAt && (
            <span className="flex items-center gap-2 text-xs text-muted-foreground">
              <Clock className="h-3.5 w-3.5 shrink-0" />
              Son çekim: {formatSyncDate(syncSettings.lastSyncedAt)} ·{' '}
              {lastSyncOutcomeLabel(syncSettings.syncStatus)}
            </span>
          )}
        </div>

        {isLastSyncFailed && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <div>
              <AlertDescription>
                Son çekim başarısız oldu. Ayrıntı için Geçmiş sekmesindeki hata mesajına bakın,
                ardından yeniden deneyin.
              </AlertDescription>
            </div>
          </Alert>
        )}
      </div>
    </div>
  );
}

export function ERPSyncPanel() {
  return (
    <RequiresErpConnection>
      {(integrationId) => <ErpSyncSettings integrationId={integrationId} />}
    </RequiresErpConnection>
  );
}
