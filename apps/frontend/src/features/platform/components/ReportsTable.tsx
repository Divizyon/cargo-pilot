import { useState, useMemo, useRef, useEffect } from 'react';
import { ChevronDown, FileDown } from 'lucide-react';
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

// ─── Types ────────────────────────────────────────────────────────────────────

type FilterableCol = 'planName' | 'date' | 'vehicle' | 'totalWeightKg' | 'fillRate';

type ColFilters = Record<FilterableCol, Set<string>>;

function emptyFilters(): ColFilters {
  return {
    planName: new Set(),
    date: new Set(),
    vehicle: new Set(),
    totalWeightKg: new Set(),
    fillRate: new Set(),
  };
}

// ─── Formatters ───────────────────────────────────────────────────────────────

const dateFormatter = new Intl.DateTimeFormat('tr-TR', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

function formatDate(iso: string) {
  return dateFormatter.format(new Date(iso));
}

function fillRateColor(rate: number) {
  if (rate >= 90) return 'text-emerald-600';
  if (rate >= 60) return 'text-amber-500';
  return 'text-red-500';
}

function colValue(report: PlanReport, col: FilterableCol): string {
  switch (col) {
    case 'planName':
      return report.planName;
    case 'date':
      return formatDate(report.date);
    case 'vehicle':
      return report.vehicle;
    case 'totalWeightKg':
      return `${new Intl.NumberFormat('tr-TR').format(report.totalWeightKg)} kg`;
    case 'fillRate':
      return `%${report.fillRate}`;
  }
}

// ─── AutoFilter dropdown ──────────────────────────────────────────────────────

interface AutoFilterMenuProps {
  col: FilterableCol;
  options: string[];
  selected: Set<string>;
  onToggle: (val: string) => void;
  onClear: () => void;
  onClose: () => void;
}

function AutoFilterMenu({
  col,
  options,
  selected,
  onToggle,
  onClear,
  onClose,
}: AutoFilterMenuProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  // silence unused col warning — kept for future keyed logic
  void col;

  return (
    <div
      ref={ref}
      className="absolute left-0 top-full z-30 mt-1 min-w-[180px] rounded-xl border border-border bg-background shadow-lg"
    >
      <div className="p-3">
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          Filtre
        </p>
        <div className="max-h-52 overflow-y-auto space-y-1.5">
          {options.map((opt) => (
            <label
              key={opt}
              className="flex cursor-pointer items-center gap-2 rounded-md px-1 py-0.5 hover:bg-muted"
            >
              <Checkbox checked={selected.has(opt)} onCheckedChange={() => onToggle(opt)} />
              <span className="text-xs">{opt}</span>
            </label>
          ))}
        </div>
        {selected.size > 0 && (
          <Button
            type="button"
            variant="link"
            size="sm"
            className="mt-3 h-auto p-0 text-[11px] text-muted-foreground"
            onClick={onClear}
          >
            Filtreyi temizle
          </Button>
        )}
      </div>
    </div>
  );
}

// ─── Column header with autofilter ───────────────────────────────────────────

interface ColHeadProps {
  label: string;
  col: FilterableCol;
  options: string[];
  selected: Set<string>;
  activeCol: FilterableCol | null;
  onOpen: (col: FilterableCol) => void;
  onToggle: (col: FilterableCol, val: string) => void;
  onClear: (col: FilterableCol) => void;
  onClose: () => void;
  className?: string;
}

function ColHead({
  label,
  col,
  options,
  selected,
  activeCol,
  onOpen,
  onToggle,
  onClear,
  onClose,
  className,
}: ColHeadProps) {
  const isOpen = activeCol === col;
  const hasFilter = selected.size > 0;

  return (
    <TableHead className={cn('relative px-3 py-0', className)}>
      <button
        type="button"
        onClick={() => (isOpen ? onClose() : onOpen(col))}
        className={cn(
          'flex items-center gap-1 text-[10px] font-semibold uppercase tracking-widest transition-colors',
          hasFilter ? 'text-primary' : 'text-muted-foreground hover:text-foreground',
        )}
      >
        {label}
        <ChevronDown
          className={cn('h-3 w-3 shrink-0 transition-transform', isOpen && 'rotate-180')}
        />
        {hasFilter && (
          <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground">
            {selected.size}
          </span>
        )}
      </button>

      {isOpen && (
        <AutoFilterMenu
          col={col}
          options={options}
          selected={selected}
          onToggle={(val) => onToggle(col, val)}
          onClear={() => onClear(col)}
          onClose={onClose}
        />
      )}
    </TableHead>
  );
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
            <TableCell className="px-3 py-0">
              <Skeleton className="h-3 w-40" />
            </TableCell>
            <TableCell className="px-3 py-0">
              <Skeleton className="h-3 w-20" />
            </TableCell>
            <TableCell className="px-3 py-0">
              <Skeleton className="h-3 w-28" />
            </TableCell>
            <TableCell className="px-3 py-0">
              <Skeleton className="h-3 w-20" />
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
  const cell = 'px-3 py-0';

  function handleDownload() {
    console.info('Plan indiriliyor:', report.id);
  }

  return (
    <TableRow className="h-12">
      <TableCell className={cn(cell, 'max-w-[192px]')}>
        <span className="block truncate text-xs text-foreground" title={report.planName}>
          {report.planName}
        </span>
      </TableCell>
      <TableCell className={cell}>
        <span className="text-xs text-muted-foreground">{formatDate(report.date)}</span>
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
              'w-9 text-right font-mono text-xs font-medium',
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
          className="h-7 w-7 text-muted-foreground hover:text-foreground"
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
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [colFilters, setColFilters] = useState<ColFilters>(emptyFilters);
  const [activeCol, setActiveCol] = useState<FilterableCol | null>(null);

  const { data, isLoading } = useReports();

  // Base filter (search bar + date range)
  const baseFiltered = useMemo(() => {
    if (!data) return [];
    return data.filter((r) => {
      const matchesSearch = !search || r.planName.toLowerCase().includes(search.toLowerCase());
      const matchesFrom = !dateFrom || r.date >= dateFrom;
      const matchesTo = !dateTo || r.date <= dateTo;
      return matchesSearch && matchesFrom && matchesTo;
    });
  }, [data, search, dateFrom, dateTo]);

  // Unique options per column (from base-filtered set)
  const colOptions = useMemo<Record<FilterableCol, string[]>>(() => {
    const cols: FilterableCol[] = ['planName', 'date', 'vehicle', 'totalWeightKg', 'fillRate'];
    return Object.fromEntries(
      cols.map((col) => [col, [...new Set(baseFiltered.map((r) => colValue(r, col)))].sort()]),
    ) as Record<FilterableCol, string[]>;
  }, [baseFiltered]);

  // Apply column autofilters on top of base filter
  const filtered = useMemo(() => {
    return baseFiltered.filter((r) => {
      const cols: FilterableCol[] = ['planName', 'date', 'vehicle', 'totalWeightKg', 'fillRate'];
      return cols.every((col) => {
        const sel = colFilters[col];
        return sel.size === 0 || sel.has(colValue(r, col));
      });
    });
  }, [baseFiltered, colFilters]);

  function toggleColFilter(col: FilterableCol, val: string) {
    setColFilters((prev) => {
      const next = { ...prev, [col]: new Set(prev[col]) };
      if (next[col].has(val)) next[col].delete(val);
      else next[col].add(val);
      return next;
    });
  }

  function clearColFilter(col: FilterableCol) {
    setColFilters((prev) => ({ ...prev, [col]: new Set() }));
  }

  const colHeadProps = (col: FilterableCol) => ({
    col,
    options: colOptions[col],
    selected: colFilters[col],
    activeCol,
    onOpen: setActiveCol,
    onToggle: toggleColFilter,
    onClear: clearColFilter,
    onClose: () => setActiveCol(null),
  });

  return (
    <div className="flex flex-col gap-4">
      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2">
        <Input
          placeholder="Plan Ara..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-9 w-56 text-sm"
        />
        <Input
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          className="h-9 w-40 text-sm"
          title="Başlangıç tarihi"
        />
        <Input
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          className="h-9 w-40 text-sm"
          title="Bitiş tarihi"
        />
        <div className="ml-auto">
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5 text-xs"
            onClick={() => onBulkDownload?.(dateFrom, dateTo)}
            disabled={!dateFrom && !dateTo}
          >
            <FileDown className="h-3.5 w-3.5" />
            Dönemsel Rapor İndir
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-border bg-background">
        {isLoading ? (
          <ReportsTableSkeleton />
        ) : (
          <Table className="min-w-[700px] table-fixed">
            <TableHeader>
              <TableRow className="h-9 bg-muted/40 hover:bg-muted/40">
                <ColHead label="Plan" {...colHeadProps('planName')} className="w-48" />
                <ColHead label="Tarih" {...colHeadProps('date')} className="w-28" />
                <ColHead label="Araç" {...colHeadProps('vehicle')} className="w-36" />
                <ColHead label="Ağırlık" {...colHeadProps('totalWeightKg')} className="w-28" />
                <ColHead label="Doluluk" {...colHeadProps('fillRate')} className="w-40" />
                <TableHead className="w-16 px-3 py-0 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                  İndir
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell
                    colSpan={6}
                    className="py-16 text-center text-sm text-muted-foreground"
                  >
                    {data?.length === 0
                      ? 'Henüz plan raporu bulunmuyor.'
                      : 'Arama kriterlerine uyan plan bulunamadı.'}
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((report) => <ReportRow key={report.id} report={report} />)
              )}
            </TableBody>
          </Table>
        )}
      </div>

      {!isLoading && filtered.length > 0 && (
        <p className="px-1 text-xs text-muted-foreground">
          Toplam <span className="font-medium text-foreground">{filtered.length}</span> plan
        </p>
      )}
    </div>
  );
}
