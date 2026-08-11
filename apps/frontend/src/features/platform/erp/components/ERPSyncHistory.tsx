import { Fragment, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { tr } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, History } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { EmptyState } from '@/components/shared/EmptyState';
import { QueryErrorState } from '@/components/shared/QueryErrorState';
import { RequiresErpConnection } from '@/features/platform/erp/components/RequiresErpConnection';
import { useERPSyncLogs } from '@/lib/api/useERPIntegration';
import { summarizeDrops } from '@/lib/config/erpDropReasons';
import { SyncLogStatus, type SyncLogDto, type SyncLogStatusValue } from '@/lib/types/erp';

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

const DETAIL_COLUMN_COUNT = 6;

const HEADER_CLASS =
  'whitespace-nowrap px-4 py-0 text-[11px] font-semibold uppercase tracking-wide';

/**
 * Kaynak toplamı ile sayaçlar arasındaki fark; sıfırdan farklıysa muhasebede
 * hesaplanamayan satır var demektir ve kullanıcıya gizlenmez.
 */
function UnaccountedBadge({ unaccounted }: { unaccounted: number }) {
  const explanation = `Kaynak toplamı ile sayaçlar arasında ${Math.abs(unaccounted)} satırlık fark var; bu satırlar hiçbir sayaca düşmedi.`;

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant="destructive" className="text-[10px]" title={explanation} tabIndex={0}>
            ±{Math.abs(unaccounted)}
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-80 whitespace-pre-wrap break-words">
          {explanation}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/** Uzun hata metni hücrede kırpılır; tam metin tooltip ve title ile erişilebilir kalır. */
function ErrorMessageCell({ message }: { message: string | null }) {
  if (!message) return <span className="text-muted-foreground">—</span>;

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="block max-w-xs truncate" title={message} tabIndex={0}>
            {message}
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-80 whitespace-pre-wrap break-words">
          {message}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function SyncLogDetail({ log }: { log: SyncLogDto }) {
  const { rows } = summarizeDrops(log.droppedByReason);

  return (
    <div className="space-y-3">
      {rows.length > 0 && (
        <div>
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Taslağa yazılmayan satırlar
          </p>
          <ul className="space-y-1">
            {rows.map((row) => (
              <li key={row.reason} className="flex items-baseline gap-2 text-xs">
                <span className="font-medium text-foreground">{row.label}:</span>
                <span className="text-foreground">{row.count}</span>
                <span className="text-muted-foreground">
                  {row.isFilter ? 'filtrelendi' : 'atlandı'}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {log.rowErrors.length > 0 && (
        <div>
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Hatalı satırlar
          </p>
          <ul className="space-y-1">
            {log.rowErrors.map((rowError, index) => (
              <li
                key={`${rowError.erpId}-${index}`}
                className="flex flex-wrap items-baseline gap-x-2 text-xs"
              >
                <span className="font-mono text-foreground">{rowError.erpId}</span>
                {rowError.sku && (
                  <span className="font-mono text-muted-foreground">{rowError.sku}</span>
                )}
                <span className="text-destructive">{rowError.reason}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function SyncLogTable({ integrationId }: { integrationId: string }) {
  const [page, setPage] = useState(1);
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  const { data, isLoading, isError, error, refetch } = useERPSyncLogs(integrationId, {
    page,
    pageSize: PAGE_SIZE,
  });

  const logs = data?.items ?? [];
  const totalCount = data?.totalCount ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <QueryErrorState
        error={error}
        title="Senkronizasyon geçmişi yüklenemedi"
        fallbackMessage="Geçmiş kayıtları alınamadı. Bu bir bağlantı veya sunucu hatası; kayıt olmadığı anlamına gelmez."
        onRetry={() => void refetch()}
      />
    );
  }

  if (logs.length === 0) {
    return (
      <EmptyState
        icon={History}
        title="Henüz senkronizasyon geçmişi yok."
        description="ERP'den ürün çektiğinizde her çalışmanın satır kırılımı burada listelenir."
      />
    );
  }

  return (
    <>
      <div className="overflow-x-auto rounded-xl border border-border">
        <Table className="min-w-[900px]">
          <TableHeader>
            <TableRow className="h-9 bg-muted/40 hover:bg-muted/40">
              <TableHead className={HEADER_CLASS}>Başlangıç</TableHead>
              <TableHead className={HEADER_CLASS}>Bitiş</TableHead>
              <TableHead className={HEADER_CLASS}>Durum</TableHead>
              <TableHead className={HEADER_CLASS}>Kaynak Satır</TableHead>
              <TableHead className={HEADER_CLASS}>İşlenen Ürün</TableHead>
              <TableHead className={HEADER_CLASS}>Hata / Ayrıntı</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.map((log) => {
              const hasDetail =
                log.rowErrors.length > 0 || summarizeDrops(log.droppedByReason).rows.length > 0;
              const detailLabel =
                log.rowErrors.length > 0
                  ? `${log.rowErrors.length} hatalı satır`
                  : 'Eleme ayrıntısı';

              return (
                <Fragment key={log.id}>
                  <TableRow className="h-12">
                    <TableCell className="whitespace-nowrap px-4 py-0 text-xs text-muted-foreground">
                      {formatDate(log.startedAt)}
                    </TableCell>
                    <TableCell className="whitespace-nowrap px-4 py-0 text-xs text-muted-foreground">
                      {formatDate(log.completedAt)}
                    </TableCell>
                    <TableCell className="px-4 py-0">
                      <Badge variant={STATUS_VARIANT[log.status]} className="text-xs">
                        {STATUS_LABEL[log.status]}
                      </Badge>
                    </TableCell>
                    <TableCell className="px-4 py-0 text-xs text-foreground">
                      <div className="flex items-center gap-2">
                        <span>{log.sourceTotal}</span>
                        {log.unaccounted !== 0 && (
                          <UnaccountedBadge unaccounted={log.unaccounted} />
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="px-4 py-0 text-xs text-foreground">
                      {log.syncedRecordCount}
                    </TableCell>
                    <TableCell className="px-4 py-0 text-xs text-destructive">
                      <div className="flex items-center gap-2">
                        <ErrorMessageCell message={log.errorMessage} />
                        {hasDetail && (
                          <Button
                            variant="link"
                            size="sm"
                            className="h-auto shrink-0 p-0 text-xs"
                            aria-expanded={expandedLogId === log.id}
                            onClick={() =>
                              setExpandedLogId((prev) => (prev === log.id ? null : log.id))
                            }
                          >
                            {detailLabel}
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                  {expandedLogId === log.id && hasDetail && (
                    <TableRow className="bg-muted/20 hover:bg-muted/20">
                      <TableCell colSpan={DETAIL_COLUMN_COUNT} className="px-4 py-3">
                        <SyncLogDetail log={log} />
                      </TableCell>
                    </TableRow>
                  )}
                </Fragment>
              );
            })}
          </TableBody>
        </Table>
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
              aria-label="Önceki sayfa"
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
              aria-label="Sonraki sayfa"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </>
  );
}

export function ERPSyncHistory() {
  return (
    <div className="space-y-4">
      <RequiresErpConnection>
        {(integrationId) => <SyncLogTable integrationId={integrationId} />}
      </RequiresErpConnection>
    </div>
  );
}
