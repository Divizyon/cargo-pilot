import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { tr } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, History } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useERPConnection, useERPSyncLogs } from '@/lib/api/useERPIntegration';
import { SyncLogStatus, type SyncLogStatusValue } from '@/lib/types/erp';

function formatDate(iso: string | null | undefined) {
  if (!iso) return '—';
  try {
    return format(parseISO(iso), 'dd.MM.yyyy HH:mm', { locale: tr });
  } catch {
    return iso;
  }
}

const STATUS_LABEL: Record<SyncLogStatusValue, string> = {
  [SyncLogStatus.Running]: 'Devam Ediyor',
  [SyncLogStatus.Success]: 'Başarılı',
  [SyncLogStatus.PartialFailure]: 'Kısmi Hata',
  [SyncLogStatus.Failed]: 'Başarısız',
};

const STATUS_VARIANT: Record<
  SyncLogStatusValue,
  'default' | 'secondary' | 'destructive' | 'outline'
> = {
  [SyncLogStatus.Running]: 'secondary',
  [SyncLogStatus.Success]: 'default',
  [SyncLogStatus.PartialFailure]: 'outline',
  [SyncLogStatus.Failed]: 'destructive',
};

const PAGE_SIZE = 20;

export function ERPSyncHistory() {
  const [page, setPage] = useState(1);
  const { data: connection } = useERPConnection();
  const integrationId = connection?.id;

  const { data, isLoading } = useERPSyncLogs(integrationId, { page, pageSize: PAGE_SIZE });

  const logs = data?.items ?? [];
  const totalCount = data?.totalCount ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  return (
    <div className="space-y-4">
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full rounded-lg" />
          ))}
        </div>
      ) : logs.length === 0 ? (
        <div className="rounded-lg border border-dashed py-12 text-center">
          <History className="mx-auto mb-3 h-8 w-8 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">Henüz senkronizasyon geçmişi yok.</p>
        </div>
      ) : (
        <>
          <div className="rounded-xl border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="h-9 bg-muted/40 text-left">
                  <th className="px-4 py-0 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                    Başlangıç
                  </th>
                  <th className="px-4 py-0 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                    Bitiş
                  </th>
                  <th className="px-4 py-0 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                    Durum
                  </th>
                  <th className="px-4 py-0 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                    Kayıt
                  </th>
                  <th className="px-4 py-0 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                    Hata Mesajı
                  </th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} className="h-12 border-t border-border hover:bg-muted/20">
                    <td className="px-4 py-0 text-xs text-muted-foreground whitespace-nowrap">
                      {formatDate(log.startedAt)}
                    </td>
                    <td className="px-4 py-0 text-xs text-muted-foreground whitespace-nowrap">
                      {formatDate(log.completedAt)}
                    </td>
                    <td className="px-4 py-0">
                      <Badge variant={STATUS_VARIANT[log.status]} className="text-xs">
                        {STATUS_LABEL[log.status]}
                      </Badge>
                    </td>
                    <td className="px-4 py-0 text-xs text-foreground">{log.syncedRecordCount}</td>
                    <td className="px-4 py-0 text-xs text-destructive max-w-xs truncate">
                      {log.errorMessage ?? '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between px-1">
              <p className="text-xs text-muted-foreground">
                Toplam <span className="font-medium text-foreground">{totalCount}</span> kayıt
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 w-8 p-0"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">{page}</span>
                  {' / '}
                  <span className="font-medium text-foreground">{totalPages}</span>
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 w-8 p-0"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
