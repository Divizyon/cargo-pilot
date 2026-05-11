import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Download,
  FileDown,
  Loader2,
  Search,
  SlidersHorizontal,
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { ROUTES } from '@/lib/config/routes';
import {
  useReports,
  useDownloadPlanPdf,
  type PlanReport,
  type ReportsFilters,
} from '@/lib/api/useReports';
import { useVehicles } from '@/lib/api/useVehicles';

// ─── Constants ────────────────────────────────────────────────────────────────

const PAGE_SIZE = 10;

const dateFormatter = new Intl.DateTimeFormat('tr-TR', {
  day: '2-digit',
  month: '2-digit',
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

// ─── Fill rate color ──────────────────────────────────────────────────────────

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
    <Badge variant={s.variant} className="px-1.5 py-0 text-[10px] font-medium">
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
            <TableCell className="px-3 py-0">
              <Skeleton className="h-3 w-36" />
            </TableCell>
            <TableCell className="px-3 py-0">
              <Skeleton className="h-3 w-20" />
            </TableCell>
            <TableCell className="px-3 py-0">
              <Skeleton className="h-3 w-24" />
            </TableCell>
            <TableCell className="px-3 py-0">
              <Skeleton className="h-5 w-16 rounded-full" />
            </TableCell>
            <TableCell className="px-3 py-0">
              <Skeleton className="h-2 w-full rounded-full" />
            </TableCell>
            <TableCell className="px-3 py-0">
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
  const { mutate: downloadPdf, isPending } = useDownloadPlanPdf();
  const cell = 'px-3 py-0';

  function handleDownload(e: { stopPropagation(): void }) {
    e.stopPropagation();
    downloadPdf({ id: report.id, planName: report.planName });
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
          title="PDF İndir"
          disabled={isPending}
          className="h-7 w-7 text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-40"
          onClick={handleDownload}
        >
          {isPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <FileDown className="h-3.5 w-3.5" />
          )}
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
  const navigate = useNavigate();
  const [period, setPeriod] = useState<PeriodTab>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [vehicleId, setVehicleId] = useState('');
  const [minFillRateStr, setMinFillRateStr] = useState('');
  const [maxFillRateStr, setMaxFillRateStr] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [page, setPage] = useState(1);
  const filterRef = useRef<HTMLDivElement>(null);

  const { data: vehiclesData } = useVehicles({ pageSize: 200 });
  const vehicles = vehiclesData?.items ?? [];

  const periodDates = useMemo(() => getPeriodDates(period), [period]);

  const serverFilters = useMemo<ReportsFilters>(() => {
    const f: ReportsFilters = {};
    if (dateFrom || dateTo) {
      if (dateFrom) f.startDate = new Date(dateFrom).toISOString();
      if (dateTo) {
        const end = new Date(dateTo);
        end.setHours(23, 59, 59, 999);
        f.endDate = end.toISOString();
      }
    } else {
      if (periodDates.startDate) f.startDate = periodDates.startDate;
      if (periodDates.endDate) f.endDate = periodDates.endDate;
    }
    if (vehicleId) f.vehicleId = vehicleId;
    const min = Number(minFillRateStr);
    const max = Number(maxFillRateStr);
    if (minFillRateStr && !isNaN(min)) f.minFillRate = Math.min(100, Math.max(0, min));
    if (maxFillRateStr && !isNaN(max)) f.maxFillRate = Math.min(100, Math.max(0, max));
    return f;
  }, [periodDates, dateFrom, dateTo, vehicleId, minFillRateStr, maxFillRateStr]);

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

  function clearAllFilters() {
    setVehicleId('');
    setMinFillRateStr('');
    setMaxFillRateStr('');
    setDateFrom('');
    setDateTo('');
    setPage(1);
  }

  // AC1: sort by date descending (newest first)
  const sorted = useMemo(
    () =>
      [...(data?.items ?? [])].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
      ),
    [data?.items],
  );

  // client-side: plan name search only (vehicle + fill rate are server-side)
  const filtered = sorted.filter(
    (r) => !searchTerm || r.planName.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const totalCount = data?.totalCount ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  const activeFilterCount =
    (vehicleId ? 1 : 0) + (minFillRateStr || maxFillRateStr ? 1 : 0) + (dateFrom || dateTo ? 1 : 0);

  const hasActiveFilters = activeFilterCount > 0;
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
                setDateFrom('');
                setDateTo('');
                setPage(1);
              }}
              className={cn(
                'h-auto rounded-md px-3 py-1 text-xs font-medium',
                period === tab.value && !dateFrom && !dateTo
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
                {activeFilterCount}
              </span>
            )}
            <ChevronDown
              className={cn('h-3.5 w-3.5 transition-transform', showFilterPanel && 'rotate-180')}
            />
          </Button>

          {showFilterPanel && (
            <div className="absolute left-0 top-full z-20 mt-1 w-64 rounded-xl border border-border bg-background shadow-lg">
              <div className="space-y-4 p-3">
                {/* Date range */}
                <div>
                  <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                    Tarih Aralığı
                  </p>
                  <div className="flex flex-col gap-1.5">
                    <Input
                      type="date"
                      value={dateFrom}
                      max={dateTo || undefined}
                      onChange={(e) => {
                        setDateFrom(e.target.value);
                        setPage(1);
                      }}
                      className="h-7 text-xs"
                    />
                    <Input
                      type="date"
                      value={dateTo}
                      min={dateFrom || undefined}
                      onChange={(e) => {
                        setDateTo(e.target.value);
                        setPage(1);
                      }}
                      className="h-7 text-xs"
                    />
                  </div>
                </div>

                {/* Vehicle select — AC2 */}
                <div>
                  <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                    Araç
                  </p>
                  <Select
                    value={vehicleId || '__all__'}
                    onValueChange={(v) => {
                      setVehicleId(v === '__all__' ? '' : v);
                      setPage(1);
                    }}
                  >
                    <SelectTrigger className="h-7 text-xs">
                      <SelectValue placeholder="Tüm araçlar" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__all__">Tüm araçlar</SelectItem>
                      {vehicles.map((v) => (
                        <SelectItem key={v.id} value={v.id}>
                          {v.name}
                          {v.plate ? ` (${v.plate})` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Fill rate range — AC2 */}
                <div>
                  <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                    Doluluk Oranı (%)
                  </p>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      placeholder="Min"
                      value={minFillRateStr}
                      onChange={(e) => {
                        setMinFillRateStr(e.target.value);
                        setPage(1);
                      }}
                      className="h-7 text-xs"
                    />
                    <span className="shrink-0 text-xs text-muted-foreground">–</span>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      placeholder="Max"
                      value={maxFillRateStr}
                      onChange={(e) => {
                        setMaxFillRateStr(e.target.value);
                        setPage(1);
                      }}
                      className="h-7 text-xs"
                    />
                  </div>
                </div>

                {hasActiveFilters && (
                  <Button
                    type="button"
                    variant="link"
                    size="sm"
                    className="h-auto p-0 text-[11px] text-muted-foreground"
                    onClick={clearAllFilters}
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
                <TableHead className="w-44 whitespace-nowrap px-3 py-0 text-[10px] font-semibold uppercase tracking-widest">
                  Plan
                </TableHead>
                <TableHead className="w-24 whitespace-nowrap px-3 py-0 text-[10px] font-semibold uppercase tracking-widest">
                  Tarih
                </TableHead>
                <TableHead className="w-32 whitespace-nowrap px-3 py-0 text-[10px] font-semibold uppercase tracking-widest">
                  Plaka/Seri No
                </TableHead>
                <TableHead className="w-20 whitespace-nowrap px-3 py-0 text-[10px] font-semibold uppercase tracking-widest">
                  Durum
                </TableHead>
                <TableHead className="w-36 whitespace-nowrap px-3 py-0 text-[10px] font-semibold uppercase tracking-widest">
                  Doluluk
                </TableHead>
                <TableHead className="w-14 whitespace-nowrap px-3 py-0 text-[10px] font-semibold uppercase tracking-widest">
                  İndir
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isEmpty && (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={6} className="py-16">
                    <div className="flex flex-col items-center gap-3 text-center">
                      <p className="text-sm text-muted-foreground">
                        Henüz rapor bulunmuyor. İlk planınızı oluşturun.
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs"
                        onClick={() => void navigate(ROUTES.PLANNING_NEW)}
                      >
                        Plan Oluştur
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              )}
              {filtered.map((report) => (
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
