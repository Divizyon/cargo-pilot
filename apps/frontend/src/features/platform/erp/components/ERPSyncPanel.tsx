import { useState } from 'react';
import { RefreshCw, Loader2, Clock, CalendarClock, AlertTriangle } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { tr } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { QueryErrorState } from '@/components/shared/QueryErrorState';
import {
  useERPSyncOptions,
  useERPSyncSettings,
  useSaveERPSyncSettings,
  useRunERPSyncNow,
} from '@/lib/api/useERPIntegration';
import { useERPConnection } from '@/lib/api/useERPIntegration';
import { ErpSyncInterval, ErpSyncStatus, type ErpSyncFilters } from '@/lib/types/erp';
import { useErpSettingsStore } from '@/lib/store/useErpSettingsStore';

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
    data: syncOptions,
    isLoading: isOptionsLoading,
    isError: isOptionsError,
  } = useERPSyncOptions();
  const {
    data: syncSettings,
    isLoading: isSettingsLoading,
    isError: isSettingsError,
    error: settingsError,
    refetch: refetchSettings,
  } = useERPSyncSettings(integrationId);

  const { mutate: saveSettings, isPending: isSavingSettings } = useSaveERPSyncSettings();
  const { mutate: runNow, isPending: isRunNowPending } = useRunERPSyncNow();

  const autoTriggerOnApproval = useErpSettingsStore((s) => s.autoTriggerOnApproval);
  const setAutoTriggerOnApproval = useErpSettingsStore((s) => s.setAutoTriggerOnApproval);

  const [filters, setFilters] = useState<ErpSyncFilters>({
    categoryId: null,
    warehouseId: null,
  });

  const [localInterval, setLocalInterval] = useState<string>(
    syncSettings?.syncInterval ?? ErpSyncInterval.Daily,
  );

  const isRunning = syncSettings?.syncStatus === ErpSyncStatus.Running;
  const isLastSyncFailed = syncSettings?.syncStatus === ErpSyncStatus.Failed;
  const isSyncDisabled = isRunning || isRunNowPending || !integrationId;

  function handleSaveInterval(value: string) {
    setLocalInterval(value);
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
          <p className="text-sm font-medium text-foreground">Otomatik Senkronizasyon Sıklığı</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            ERP'den ürün verilerinin ne sıklıkla çekileceğini belirleyin.
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
            value={localInterval}
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

        {syncSettings?.nextScheduledSyncAt && (
          <div className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm text-muted-foreground">
            <CalendarClock className="h-4 w-4 shrink-0" />
            <span>
              Sonraki senkronizasyon:{' '}
              <span className="font-medium text-foreground">
                {formatSyncDate(syncSettings.nextScheduledSyncAt)}
              </span>
            </span>
          </div>
        )}

        {syncSettings?.lastSyncedAt && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="h-3.5 w-3.5 shrink-0" />
            <span>Son senkronizasyon: {formatSyncDate(syncSettings.lastSyncedAt)}</span>
          </div>
        )}

        <Separator />

        {/* Plan onayında otomatik aktar */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <Label htmlFor="auto-trigger" className="text-sm font-medium">
              Plan onayında otomatik aktar
            </Label>
            <p className="text-xs text-muted-foreground mt-0.5">
              Bir yükleme planı onaylandığında ERP aktarımı otomatik olarak başlar.
            </p>
          </div>
          <Switch
            id="auto-trigger"
            checked={autoTriggerOnApproval}
            onCheckedChange={setAutoTriggerOnApproval}
          />
        </div>
      </div>

      {/* Manuel senkronizasyon */}
      <div className="space-y-4 pt-6">
        <div>
          <p className="text-sm font-medium text-foreground">Manuel Senkronizasyon</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Planlı zamanı beklemeksizin şimdi senkronize edin. Senkronizasyon tamamlanınca özet
            bildirim gösterilir.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Kategori Filtresi</Label>
            <Select
              disabled={isOptionsLoading || isSyncDisabled}
              value={filters.categoryId ?? 'all'}
              onValueChange={(v) =>
                setFilters((f) => ({ ...f, categoryId: v === 'all' ? null : v }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Tüm kategoriler" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tüm kategoriler</SelectItem>
                {syncOptions?.categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Depo Filtresi</Label>
            <Select
              disabled={isOptionsLoading || isSyncDisabled}
              value={filters.warehouseId ?? 'all'}
              onValueChange={(v) =>
                setFilters((f) => ({ ...f, warehouseId: v === 'all' ? null : v }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Tüm depolar" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tüm depolar</SelectItem>
                {syncOptions?.warehouses.map((wh) => (
                  <SelectItem key={wh.id} value={wh.id}>
                    {wh.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {isOptionsError && (
          <p className="text-xs text-destructive">
            Kategori ve depo listesi yüklenemedi; filtreler yalnızca &quot;Tümü&quot; seçeneğiyle
            çalışır.
          </p>
        )}

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
            <span className="text-xs text-muted-foreground">
              Son senkronizasyon: {formatSyncDate(syncSettings.lastSyncedAt)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
