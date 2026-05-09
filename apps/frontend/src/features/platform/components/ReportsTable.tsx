import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Download,
  FileDown,
  Search,
  SlidersHorizontal,
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { useReports, type PlanReport, type ReportsFilters } from '@/lib/api/useReports';

// ─── Constants ────────────────────────────────────────────────────────────────

const PAGE_SIZE = 10;

const dateFormatter = new Intl.DateTimeFormat('tr-TR', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

// ─── Period tabs ──────────────────────────────────────────────────────────────

type PeriodTab = 'all' | 'weekly' | 'monthly' | 'quarterly';

const PERIOD_TABS: { value: PeriodTab; label: string }[] = [
  { value: 'all', label: 'Tümü' },
  { value: 'weekly', label: 'Haftalık' },
  { value: 'monthly', label: 'Aylık' },
  { value: 'quarterly', label: 'Dönemlik' },
];

function getPeriodDates(period: PeriodTab): { startDate?: string; endDate?: string } {
  if (period === 'all') return {};
  const now = new Date();
  const start = new Date(now);
  if (period === 'weekly') start.setDate(start.getDate() - 7);
  else if (period === 'monthly') start.setMonth(start.getMonth() - 1);
  else start.setMonth(start.getMonth() - 3);
  return { startDate: start.toISOString(), endDate: now.toISOString() };
}

// ─── Fill rate filter ─────────────────────────────────────────────────────────

type FillRateFilter = 'high' | 'medium' | 'low';

const FILL_RATE_OPTIONS: { value: FillRateFilter; label: string; color: string }[] = [
  { value: 'high', label: '%90 ve üzeri', color: 'bg-emerald-500' },
  { value: 'medium', label: '%60 – %89', color: 'bg-amber-400' },
  { value: 'low', label: '%60 altı', color: 'bg-red-400' },
];

function matchesFillRate(rate: number, filter: FillRateFilter) {
  if (filter === 'high') return rate >= 90;
  if (filter === 'medium') return rate >= 60 && rate < 90;
  return rate < 60;
}

function fillRateColor(rate: number) {
  if (rate >= 90) return 'text-emerald-600';
  if (rate >= 60) return 'text-amber-500';
  return 'text-red-500';
}

// ─── Status badge ─────────────────────────────────────────────────────────────

const STATUS_MAP: Record<
  number,
  { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }
> = {
  0: { label: 'Taslak', variant: 'secondary' },
  1: { label: 'Aktif', variant: 'default' },
  2: { label: 'Tamamlandı', variant: 'outline' },
  3: { label: 'İptal', variant: 'destructive' },
};

function StatusBadge({ status }: { status: number }) {
  const s = STATUS_MAP[status] ?? STATUS_MAP[0];
  return (
    <Badge variant={s.variant} className="text-[10px] font-medium px-1.5 py-0">
      {s.label}
    </Badge>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function ReportsTableSkeleton() {
  return (
    <Table className="min-w-[700px] table-fixed">
      <TableHeader>
        <TableRow className="bg-muted/40 hover:bg-muted/40">
          {['w-44', 'w-24', 'w-32', 'w-20', 'w-36', 'w-14'].map((w, i) => (
            <TableHead key={i}>
              <Skeleton className={cn('h-3', w)} />
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {Array.from({ length: 6 }).map((_, i) => (
          <TableRow key={i} className="h-12 hover:bg-transparent">
            <TableCell className="py-0 px-3">
              <Skeleton className="h-3 w-36" />
            </TableCell>
            <TableCell className="py-0 px-3">
              <Skeleton className="h-3 w-20" />
            </TableCell>
            <TableCell className="py-0 px-3">
              <Skeleton className="h-3 w-24" />
            </TableCell>
            <TableCell className="py-0 px-3">
              <Skeleton className="h-5 w-16 rounded-full" />
            </TableCell>
            <TableCell className="py-0 px-3">
              <Skeleton className="h-2 w-full rounded-full" />
            </TableCell>
            <TableCell className="py-0 px-3">
              <Skeleton className="h-6 w-6 rounded-md" />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

// ─── Report row ───────────────────────────────────────────────────────────────

interface ReportRowProps {
  report: PlanReport;
}

function ReportRow({ report }: ReportRowProps) {
  const navigate = useNavigate();
  const cell = 'py-0 px-3';

  function handleDownload(e: { stopPropagation(): void }) {
    e.stopPropagation();
    if (report.downloadUrl) {
      window.open(report.downloadUrl, '_blank', 'noopener,noreferrer');
    }
  }

  return (
    <TableRow
      className="h-12 cursor-pointer"
      onClick={() => void navigate(`/reports/${report.id}`)}
    >
      <TableCell className={cn(cell, 'max-w-[176px]')}>
        <span className="block truncate text-xs text-muted-foreground" title={report.planName}>
          {report.planName}
        </span>
      </TableCell>

      <TableCell className={cell}>
        <span className="text-xs text-muted-foreground">
          {dateFormatter.format(new Date(report.date))}
        </span>
      </TableCell>

      <TableCell className={cn(cell, 'max-w-[128px]')}>
        <span className="block truncate text-xs text-foreground" title={report.vehiclePlate}>
          {report.vehiclePlate}
        </span>
      </TableCell>

      <TableCell className={cell}>
        <StatusBadge status={report.status} />
      </TableCell>

      <TableCell className={cell}>
        <div className="flex items-center gap-2">
          <Progress value={report.fillRate} className="h-1.5 flex-1" />
          <span
            className={cn(
              'w-9 shrink-0 text-right font-mono text-xs font-medium',
              fillRateColor(report.fillRate),
            )}
          >
            %{report.fillRate}
          </span>
        </div>
      </TableCell>

      <TableCell className={cell}>
        <Button
          variant="ghost"
          size="icon"
          title="Planı İndir"
          disabled={!report.downloadUrl}
          className="h-7 w-7 text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-40"
          onClick={handleDownload}
        >
          <FileDown className="h-3.5 w-3.5" />
        </Button>
      </TableCell>
    </TableRow>
  );
}

// ─── ReportsTable ─────────────────────────────────────────────────────────────

interface ReportsTableProps {
  onBulkDownload?: (from: string, to: string) => void;
}

export function ReportsTable({ onBulkDownload }: ReportsTableProps) {
  const [period, setPeriod] = useState<PeriodTab>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [fillRateFilters, setFillRateFilters] = useState<Set<FillRateFilter>>(new Set());
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [page, setPage] = useState(1);
  const filterRef = useRef<HTMLDivElement>(null);

  const periodDates = useMemo(() => getPeriodDates(period), [period]);

  const serverFilters = useMemo<ReportsFilters>(() => {
    const f: ReportsFilters = {};
    if (periodDates.startDate) f.startDate = periodDates.startDate;
    if (periodDates.endDate) f.endDate = periodDates.endDate;
    return f;
  }, [periodDates]);

  const { data, isLoading } = useReports(serverFilters, page, PAGE_SIZE);

  const handleSearch = useCallback((term: string) => {
    setSearchTerm(term);
    setPage(1);
  }, []);

  useEffect(() => {
    if (!showFilterPanel) return;
    const handler = (e: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setShowFilterPanel(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showFilterPanel]);

  function toggleFillRate(value: FillRateFilter) {
    setFillRateFilters((prev) => {
      const next = new Set(prev);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      return next;
    });
    setPage(1);
  }

  const pageItems = data?.items ?? [];
  const filtered = pageItems.filter((r) => {
    const matchesSearch =
      !searchTerm || r.planName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFill =
      fillRateFilters.size === 0 ||
      [...fillRateFilters].some((f) => matchesFillRate(r.fillRate, f));
    return matchesSearch && matchesFill;
  });

  const totalCount = data?.totalCount ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const paginated = filtered;

  const hasActiveFilters = fillRateFilters.size > 0;
  const isEmpty =
    !isLoading && totalCount === 0 && !searchTerm && !hasActiveFilters && period === 'all';
  const noResults =
    !isLoading &&
    (totalCount === 0 || filtered.length === 0) &&
    (!!searchTerm || hasActiveFilters || period !== 'all');

  return (
    <div className="flex flex-col gap-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Period tabs */}
        <div className="flex shrink-0 items-center gap-1 rounded-lg border border-border bg-background p-1">
          {PERIOD_TABS.map((tab) => (
            <Button
              key={tab.value}
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setPeriod(tab.value);
                setPage(1);
              }}
              className={cn(
                'h-auto rounded-md px-3 py-1 text-xs font-medium',
                period === tab.value
                  ? 'bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground',
              )}
            >
              {tab.label}
            </Button>
          ))}
        </div>

        {/* Search */}
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Plan ara..."
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
            className="h-8 w-full pl-8 text-xs"
          />
        </div>

        {/* Filter panel */}
        <div ref={filterRef} className="relative shrink-0">
          <Button
            variant="outline"
            size="sm"
            className={cn(
              'gap-1.5 text-xs',
              hasActiveFilters && 'border-primary text-primary ring-1 ring-primary/30',
            )}
            onClick={() => setShowFilterPanel((v) => !v)}
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            Filtrele
            {hasActiveFilters && (
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                {fillRateFilters.size}
              </span>
            )}
            <ChevronDown
              className={cn('h-3.5 w-3.5 transition-transform', showFilterPanel && 'rotate-180')}
            />
          </Button>

          {showFilterPanel && (
            <div className="absolute left-0 top-full z-20 mt-1 min-w-[200px] rounded-xl border border-border bg-background shadow-lg">
              <div className="p-3 space-y-3">
                <div>
                  <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                    Doluluk
                  </p>
                  <div className="space-y-2">
                    {FILL_RATE_OPTIONS.map(({ value, label, color }) => (
                      <label
                        key={value}
                        className="flex cursor-pointer items-center gap-2 rounded-md px-1 py-0.5 hover:bg-muted"
                      >
                        <Checkbox
                          checked={fillRateFilters.has(value)}
                          onCheckedChange={() => toggleFillRate(value)}
                        />
                        <span className={cn('inline-block h-2 w-2 rounded-full', color)} />
                        <span className="text-xs">{label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {hasActiveFilters && (
                  <Button
                    type="button"
                    variant="link"
                    size="sm"
                    className="h-auto p-0 text-[11px] text-muted-foreground"
                    onClick={() => {
                      setFillRateFilters(new Set());
                      setPage(1);
                    }}
                  >
                    Filtreleri temizle
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Dönemsel rapor indir */}
        <Button
          variant="outline"
          size="sm"
          className="ml-auto shrink-0 gap-1.5 text-xs"
          disabled={period === 'all'}
          onClick={() => {
            const { startDate, endDate } = periodDates;
            if (startDate && endDate) onBulkDownload?.(startDate, endDate);
          }}
        >
          <Download className="h-3.5 w-3.5" />
          Dönemsel Rapor İndir
        </Button>
      </div>

      {/* No results */}
      {noResults && (
        <Alert>
          <AlertDescription>Aradığınız kriterlere uygun plan bulunamadı.</AlertDescription>
        </Alert>
      )}

      {/* Table card */}
      <div className="overflow-hidden rounded-2xl border border-border bg-background">
        {isLoading ? (
          <ReportsTableSkeleton />
        ) : (
          <Table className="min-w-[700px] table-fixed">
            <TableHeader>
              <TableRow className="h-9 bg-muted/40 hover:bg-muted/40">
                <TableHead className="w-44 whitespace-nowrap py-0 px-3 text-[10px] font-semibold uppercase tracking-widest">
                  Plan
                </TableHead>
                <TableHead className="w-24 whitespace-nowrap py-0 px-3 text-[10px] font-semibold uppercase tracking-widest">
                  Tarih
                </TableHead>
                <TableHead className="w-32 whitespace-nowrap py-0 px-3 text-[10px] font-semibold uppercase tracking-widest">
                  Plaka
                </TableHead>
                <TableHead className="w-20 whitespace-nowrap py-0 px-3 text-[10px] font-semibold uppercase tracking-widest">
                  Durum
                </TableHead>
                <TableHead className="w-36 whitespace-nowrap py-0 px-3 text-[10px] font-semibold uppercase tracking-widest">
                  Doluluk
                </TableHead>
                <TableHead className="w-14 whitespace-nowrap py-0 px-3 text-[10px] font-semibold uppercase tracking-widest">
                  İndir
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isEmpty && (
                <TableRow className="hover:bg-transparent">
                  <TableCell
                    colSpan={6}
                    className="py-16 text-center text-sm text-muted-foreground"
                  >
                    Henüz plan raporu bulunmuyor.
                  </TableCell>
                </TableRow>
              )}
              {paginated.map((report) => (
                <ReportRow key={report.id} report={report} />
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Pagination */}
      {totalCount > 0 && (
        <div className="flex items-center justify-between px-1">
          <p className="text-xs text-muted-foreground">
            Toplam <span className="font-medium text-foreground">{totalCount}</span> plan
          </p>
          {totalPages > 1 && (
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
          )}
        </div>
      )}
    </div>
  );
}
