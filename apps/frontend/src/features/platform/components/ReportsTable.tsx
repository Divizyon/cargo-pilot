import { useCallback, useEffect, useRef, useState } from 'react';
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
import { useReports, type PlanReport } from '@/lib/api/useReports';

// ─── Constants ────────────────────────────────────────────────────────────────

const PAGE_SIZE = 10;

const dateFormatter = new Intl.DateTimeFormat('tr-TR', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

// ─── Category tabs ────────────────────────────────────────────────────────────

type CategoryTab = 'all' | 'high' | 'medium' | 'low';

const CATEGORY_TABS: { value: CategoryTab; label: string }[] = [
  { value: 'all', label: 'Tümü' },
  { value: 'high', label: 'Yüksek' },
  { value: 'medium', label: 'Orta' },
  { value: 'low', label: 'Düşük' },
];

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

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function ReportsTableSkeleton() {
  return (
    <Table className="min-w-[700px] table-fixed">
      <TableHeader>
        <TableRow className="bg-muted/40 hover:bg-muted/40">
          {['w-48', 'w-28', 'w-36', 'w-28', 'w-40', 'w-16'].map((w, i) => (
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
              <Skeleton className="h-3 w-40" />
            </TableCell>
            <TableCell className="py-0 px-3">
              <Skeleton className="h-3 w-20" />
            </TableCell>
            <TableCell className="py-0 px-3">
              <Skeleton className="h-3 w-28" />
            </TableCell>
            <TableCell className="py-0 px-3">
              <Skeleton className="h-3 w-20" />
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
  const cell = 'py-0 px-3';

  function handleDownload(e: { stopPropagation: () => void }) {
    e.stopPropagation();
    console.info('Plan indiriliyor:', report.id);
  }

  return (
    <TableRow className="h-12">
      <TableCell className={cn(cell, 'max-w-[192px]')}>
        <span className="block truncate text-xs text-muted-foreground" title={report.planName}>
          {report.planName}
        </span>
      </TableCell>

      <TableCell className={cell}>
        <span className="text-xs text-muted-foreground">
          {dateFormatter.format(new Date(report.date))}
        </span>
      </TableCell>

      <TableCell className={cn(cell, 'max-w-[144px]')}>
        <span className="block truncate text-xs text-foreground" title={report.vehicle}>
          {report.vehicle}
        </span>
      </TableCell>

      <TableCell className={cell}>
        <span className="font-mono text-xs text-foreground">
          {new Intl.NumberFormat('tr-TR').format(report.totalWeightKg)} kg
        </span>
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
          className="h-7 w-7 text-muted-foreground hover:bg-accent hover:text-foreground"
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
  const [category, setCategory] = useState<CategoryTab>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [fillRateFilters, setFillRateFilters] = useState<Set<FillRateFilter>>(new Set());
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [page, setPage] = useState(1);
  const filterRef = useRef<HTMLDivElement>(null);

  const { data, isLoading } = useReports();

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

  const filtered = (data ?? []).filter((r) => {
    const matchesCategory = category === 'all' || matchesFillRate(r.fillRate, category);
    const matchesSearch =
      !searchTerm || r.planName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFrom = !dateFrom || r.date >= dateFrom;
    const matchesTo = !dateTo || r.date <= dateTo;
    const matchesFill =
      fillRateFilters.size === 0 || [...fillRateFilters].some((f) => matchesFillRate(r.fillRate, f));
    return matchesCategory && matchesSearch && matchesFrom && matchesTo && matchesFill;
  });

  const totalCount = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const hasActiveFilters = fillRateFilters.size > 0 || !!dateFrom || !!dateTo;
  const isEmpty = !isLoading && filtered.length === 0 && !searchTerm && !hasActiveFilters;
  const noResults = !isLoading && filtered.length === 0 && (!!searchTerm || hasActiveFilters);

  return (
    <div className="flex flex-col gap-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Category tabs */}
        <div className="flex shrink-0 items-center gap-1 rounded-lg border border-border bg-background p-1">
          {CATEGORY_TABS.map((tab) => (
            <Button
              key={tab.value}
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setCategory(tab.value);
                setPage(1);
              }}
              className={cn(
                'h-auto rounded-md px-3 py-1 text-xs font-medium',
                category === tab.value
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
                {fillRateFilters.size + (dateFrom ? 1 : 0) + (dateTo ? 1 : 0)}
              </span>
            )}
            <ChevronDown
              className={cn('h-3.5 w-3.5 transition-transform', showFilterPanel && 'rotate-180')}
            />
          </Button>

          {showFilterPanel && (
            <div className="absolute left-0 top-full z-20 mt-1 min-w-[220px] rounded-xl border border-border bg-background shadow-lg">
              <div className="p-3 space-y-3">
                {/* Date range */}
                <div>
                  <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                    Tarih Aralığı
                  </p>
                  <div className="space-y-1.5">
                    <Input
                      type="date"
                      value={dateFrom}
                      onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
                      className="h-7 text-xs"
                    />
                    <Input
                      type="date"
                      value={dateTo}
                      onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
                      className="h-7 text-xs"
                    />
                  </div>
                </div>

                {/* Fill rate */}
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
                      setDateFrom('');
                      setDateTo('');
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
          disabled={!dateFrom && !dateTo}
          onClick={() => onBulkDownload?.(dateFrom, dateTo)}
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
                <TableHead className="w-48 whitespace-nowrap py-0 px-3 text-[10px] font-semibold uppercase tracking-widest">
                  Plan
                </TableHead>
                <TableHead className="w-28 whitespace-nowrap py-0 px-3 text-[10px] font-semibold uppercase tracking-widest">
                  Tarih
                </TableHead>
                <TableHead className="w-36 whitespace-nowrap py-0 px-3 text-[10px] font-semibold uppercase tracking-widest">
                  Araç
                </TableHead>
                <TableHead className="w-28 whitespace-nowrap py-0 px-3 text-[10px] font-semibold uppercase tracking-widest">
                  Ağırlık
                </TableHead>
                <TableHead className="w-40 whitespace-nowrap py-0 px-3 text-[10px] font-semibold uppercase tracking-widest">
                  Doluluk
                </TableHead>
                <TableHead className="w-16 whitespace-nowrap py-0 px-3 text-[10px] font-semibold uppercase tracking-widest">
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
