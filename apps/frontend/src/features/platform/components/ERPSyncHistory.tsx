import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { tr } from 'date-fns/locale';
import { RefreshCw, Loader2, ChevronDown, ChevronRight, History } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { useERPSyncHistory, useRetryERPSyncItem } from '@/lib/api/useERPIntegration';
import {
  ErpSyncLogStatus,
  ErpSyncEntityType,
  type ErpSyncRun,
  type ErpSyncLogEntry,
} from '@/lib/types/erp';

function formatDate(iso: string | null | undefined) {
  if (!iso) return '—';
  return format(parseISO(iso), 'dd.MM.yyyy HH:mm', { locale: tr });
}

const ENTITY_LABELS: Record<string, string> = {
  [ErpSyncEntityType.Product]: 'Ürün',
  [ErpSyncEntityType.ShipmentOrder]: 'Sevkiyat Emri',
};

const RUN_STATUS_LABELS: Record<string, string> = {
  Idle: 'Bekliyor',
  Running: 'Devam Ediyor',
  Completed: 'Tamamlandı',
  Failed: 'Başarısız',
};

interface LogEntryRowProps {
  entry: ErpSyncLogEntry;
  retryingId: string | null;
  onRetry: (id: string) => void;
}

function LogEntryRow({ entry, retryingId, onRetry }: LogEntryRowProps) {
  const isError = entry.status === ErpSyncLogStatus.Error;
  const isRetrying = retryingId === entry.id;

  return (
    <div
      className={cn(
        'flex flex-col gap-1 rounded-md border px-4 py-3 text-sm',
        isError && 'border-red-200 bg-red-50 dark:border-red-900/40 dark:bg-red-950/20',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={isError ? 'destructive' : 'secondary'} className="shrink-0 text-xs">
            {isError ? 'Hata' : entry.status === ErpSyncLogStatus.Warning ? 'Uyarı' : 'Başarılı'}
          </Badge>
          <span className="font-medium">{entry.entityName}</span>
          <span className="text-muted-foreground">
            ({ENTITY_LABELS[entry.entityType] ?? entry.entityType})
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className="text-xs text-muted-foreground">{formatDate(entry.occurredAt)}</span>
          {isError && (
            <Button
              size="sm"
              variant="outline"
              disabled={isRetrying}
              onClick={() => onRetry(entry.id)}
              className="h-7 px-2 text-xs"
            >
              {isRetrying ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <RefreshCw className="h-3 w-3" />
              )}
              <span className="ml-1">Tekrar Dene</span>
            </Button>
          )}
        </div>
      </div>

      {isError && entry.errorReason && (
        <p className="text-sm text-red-700 dark:text-red-400">{entry.errorReason}</p>
      )}
    </div>
  );
}

interface SyncRunCardProps {
  run: ErpSyncRun;
  retryingId: string | null;
  onRetry: (id: string) => void;
}

function SyncRunCard({ run, retryingId, onRetry }: SyncRunCardProps) {
  const [expanded, setExpanded] = useState(run.errorCount > 0);

  const hasErrors = run.errorCount > 0;
  const errorEntries = run.entries.filter((e) => e.status === ErpSyncLogStatus.Error);
  const otherEntries = run.entries.filter((e) => e.status !== ErpSyncLogStatus.Error);

  return (
    <div className="rounded-lg border">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-accent/50 transition-colors"
      >
        <div className="flex flex-wrap items-center gap-3">
          {expanded ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
          <span className="font-medium text-sm">{formatDate(run.startedAt)}</span>
          <Badge variant="secondary" className="text-xs">
            {RUN_STATUS_LABELS[run.status] ?? run.status}
          </Badge>
          <span className="text-sm text-muted-foreground">{run.totalCount} kayıt</span>
          {hasErrors && (
            <Badge variant="destructive" className="text-xs">
              {run.errorCount} hata
            </Badge>
          )}
        </div>
        <span className="shrink-0 text-xs text-muted-foreground">
          {run.completedAt ? formatDate(run.completedAt) : '—'}
        </span>
      </button>

      {expanded && run.entries.length > 0 && (
        <>
          <Separator />
          <div className="space-y-2 p-4">
            {/* Error entries first */}
            {errorEntries.map((entry) => (
              <LogEntryRow key={entry.id} entry={entry} retryingId={retryingId} onRetry={onRetry} />
            ))}
            {/* Non-error entries */}
            {otherEntries.map((entry) => (
              <LogEntryRow key={entry.id} entry={entry} retryingId={retryingId} onRetry={onRetry} />
            ))}
          </div>
        </>
      )}

      {expanded && run.entries.length === 0 && (
        <>
          <Separator />
          <p className="px-4 py-3 text-sm text-muted-foreground">
            Bu senkronizasyona ait log kaydı bulunamadı.
          </p>
        </>
      )}
    </div>
  );
}

export function ERPSyncHistory() {
  const { data: runs, isLoading } = useERPSyncHistory();
  const { mutate: retry, isPending: isRetrying, variables } = useRetryERPSyncItem();

  const retryingId = isRetrying && variables ? variables.logEntryId : null;

  function handleRetry(logEntryId: string) {
    retry({ logEntryId });
  }

  return (
    <div className="space-y-4">
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full rounded-lg" />
          ))}
        </div>
      ) : !runs || runs.length === 0 ? (
        <div className="rounded-lg border border-dashed py-12 text-center">
          <History className="mx-auto mb-3 h-8 w-8 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">Henüz senkronizasyon geçmişi yok.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {runs.map((run) => (
            <SyncRunCard key={run.id} run={run} retryingId={retryingId} onRetry={handleRetry} />
          ))}
        </div>
      )}
    </div>
  );
}
