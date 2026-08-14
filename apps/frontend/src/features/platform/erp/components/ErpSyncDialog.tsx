import { AlertTriangle, Clock, Loader2, RefreshCw } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { tr } from 'date-fns/locale';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { QueryErrorState } from '@/components/shared/QueryErrorState';
import { FieldLabelRow } from '@/features/platform/erp/components/FieldHint';
import { useERPSyncSettings, useSaveERPSyncSettings } from '@/lib/api/useERPIntegration';
import { ERP_TERM } from '@/lib/config/erpTerms';
import { ErpSyncInterval, ErpSyncStatus } from '@/lib/types/erp';

function formatSyncDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  return format(parseISO(iso), 'dd.MM.yyyy HH:mm', { locale: tr });
}

/** Manuel ve otomatik çalıştırmalar aynı durumu yazar; kullanıcı sonucu tarihle birlikte görür. */
function lastSyncOutcomeLabel(status: ErpSyncStatus | undefined): string {
  if (status === ErpSyncStatus.Running) return 'devam ediyor';
  return status === ErpSyncStatus.Failed ? 'başarısız' : 'başarılı';
}

interface ErpSyncDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  integrationId: string;
  onSyncNow: () => void;
  isSyncing: boolean;
}

/**
 * Senkronizasyon ve ayarları tek yerde: ERP Ürünleri ekranındaki senkronizasyon
 * butonu bunu açar.
 *
 * Sıklık ayarı önce Ayarlar altındaydı; kullanıcı ürünleri senkronize etmek için bir
 * ekranda, zamanlamak için başka bir ekranda çalışıyordu. İkisi aynı işin parçası
 * olduğu için aksiyonun yanına alındı.
 */
export function ErpSyncDialog({
  open,
  onOpenChange,
  integrationId,
  onSyncNow,
  isSyncing,
}: ErpSyncDialogProps) {
  const {
    data: syncSettings,
    isLoading: isSettingsLoading,
    isError: isSettingsError,
    error: settingsError,
    refetch: refetchSettings,
  } = useERPSyncSettings(integrationId);

  const { mutate: saveSettings, isPending: isSavingSettings } = useSaveERPSyncSettings();

  // Seçili sıklık yalnızca sunucu verisinden okunur; yerel kopya kullanıcının kayıtlı
  // ayarını farkında olmadan ezmesine yol açıyordu. Sunucuda sıklık yoksa hiçbir seçenek
  // işaretlenmez: zamanlayıcı da bu entegrasyonu tetiklemez.
  const isAutoSyncOn = syncSettings?.syncInterval != null;
  const isRunning = syncSettings?.syncStatus === ErpSyncStatus.Running;
  const isLastSyncFailed = syncSettings?.syncStatus === ErpSyncStatus.Failed;

  function saveInterval(interval: ErpSyncInterval | null) {
    saveSettings({
      integrationId,
      syncInterval: interval,
    });
  }

  /**
   * Anahtar kapatıldığında sıklık boşaltılır; zamanlayıcı sıklığı olmayan
   * entegrasyonu hiç tetiklemez. Açıldığında kullanıcıya sormadan bir sıklık
   * gerekir, günlük en az sürprizli olan.
   */
  function handleToggleAutoSync(enabled: boolean) {
    saveInterval(enabled ? ErpSyncInterval.Daily : null);
  }

  function handleSyncNow() {
    onSyncNow();
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{ERP_TERM.sync}</DialogTitle>
          <DialogDescription>
            ERP&apos;deki ürünler taslak olarak alınır; hiçbir ürün onayınız olmadan kaydedilmez.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <Button size="sm" className="gap-2" onClick={handleSyncNow} disabled={isSyncing}>
              {isSyncing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              {isSyncing ? ERP_TERM.syncRunning : 'Şimdi senkronize et'}
            </Button>

            {syncSettings?.lastSyncedAt && (
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Clock className="h-3.5 w-3.5 shrink-0" />
                Son senkronizasyon: {formatSyncDate(syncSettings.lastSyncedAt)} ·{' '}
                {lastSyncOutcomeLabel(syncSettings.syncStatus)}
              </span>
            )}
          </div>

          {isRunning && (
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" />
              {ERP_TERM.syncRunning}
            </p>
          )}

          {isLastSyncFailed && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <div>
                <AlertDescription>
                  Son senkronizasyon başarısız oldu. Ayrıntı için Ayarlar &gt; ERP Entegrasyonu
                  altındaki geçmiş listesine bakın.
                </AlertDescription>
              </div>
            </Alert>
          )}

          <Separator />

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <FieldLabelRow
                hintLabel="Otomatik senkronizasyon hakkında bilgi"
                hint="Açıkken ERP ürünleri seçtiğiniz sıklıkta arka planda senkronize edilir. Zamanlayıcı vadesi gelenleri 15 dakikada bir tarar; o sırada devam eden bir çalışma varsa sıra bir sonraki taramaya kalır."
              >
                <p className="text-sm font-medium text-foreground">Otomatik senkronizasyon</p>
              </FieldLabelRow>

              {isSettingsLoading ? (
                <Skeleton className="h-6 w-10" />
              ) : (
                !isSettingsError && (
                  <Switch
                    checked={isAutoSyncOn}
                    onCheckedChange={handleToggleAutoSync}
                    disabled={isSavingSettings}
                    aria-label="Otomatik senkronizasyon"
                  />
                )
              )}
            </div>

            {isSettingsError ? (
              <QueryErrorState
                error={settingsError}
                title="Senkronizasyon ayarları yüklenemedi"
                fallbackMessage="Kayıtlı sıklık ve durum okunamadı; gösterilen değerler güncel olmayabilir."
                onRetry={() => void refetchSettings()}
              />
            ) : (
              // Siklik secenekleri yalnizca anahtar acikken anlamli; kapaliyken
              // ekranda durunca hangi secenegin gecerli oldugu belirsiz kaliyordu.
              isAutoSyncOn && (
                <RadioGroup
                  value={syncSettings?.syncInterval ?? ErpSyncInterval.Daily}
                  onValueChange={(value) =>
                    saveInterval(value as (typeof ErpSyncInterval)[keyof typeof ErpSyncInterval])
                  }
                  disabled={isSavingSettings}
                  className="flex flex-wrap items-center gap-x-6 gap-y-2"
                >
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value={ErpSyncInterval.FourHours} id="interval-4h" />
                    <Label htmlFor="interval-4h" className="cursor-pointer font-normal">
                      4 saatte bir
                    </Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value={ErpSyncInterval.Daily} id="interval-daily" />
                    <Label htmlFor="interval-daily" className="cursor-pointer font-normal">
                      Günlük
                    </Label>
                  </div>
                </RadioGroup>
              )
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
