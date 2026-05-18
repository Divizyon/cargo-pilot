import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  LayoutList,
  Pencil,
  Plus,
  SlidersHorizontal,
  Trash2,
} from 'lucide-react';
import { planningDetailRoute } from '@/lib/config/routes';
import { cn } from '@/lib/utils';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  useDeleteLoadingPlan,
  useLoadingPlanList,
  useRenameLoadingPlan,
} from '@/lib/api/useLoadingPlans';
import type { LoadingPlanListItem } from '@/lib/types/loadingPlan';
import { PlanStatus } from '@/lib/types/loadingPlan';
import { useUnitStore } from '@/lib/store/useUnitStore';
import { formatWeightDisplay } from '@/lib/utils/unitConversion';
import { useLoadingPlanFilters } from '../hooks/useLoadingPlanFilters';
import { SearchInput } from './SearchInput';
import { VehicleCard } from './VehicleCard';

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_TABS = [
  { value: 'all', label: 'Tümü' },
  { value: 'taslak', label: 'Taslak' },
  { value: 'aktif', label: 'Aktif' },
  { value: 'tamamlandi', label: 'Tamamlandı' },
];

const ROW_H = 48;
const HEADER_ROW_H = 48;
const BELOW_TABLE_H = 80;
const CARD_GAP = 12;
const GRID_V_PAD = 24;
const CARD_HEADER_H = 120; // fixed header section height estimate

// ─── Vehicle icon ─────────────────────────────────────────────────────────────

function VehicleIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="1" y="5" width="6" height="11" rx="1" />
      <line x1="1" y1="9" x2="7" y2="9" />
      <rect x="7" y="3" width="16" height="13" rx="1" />
      <circle cx="4" cy="18.5" r="1.8" />
      <circle cx="14" cy="18.5" r="1.8" />
      <circle cx="19" cy="18.5" r="1.8" />
    </svg>
  );
}

// ─── Status badge ─────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; className: string; dotClass: string }> = {
  [PlanStatus.Tamamlandi]: {
    label: 'Tamamlandı',
    className:
      'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800',
    dotClass: 'bg-emerald-500',
  },
  [PlanStatus.Aktif]: {
    label: 'Aktif',
    className:
      'bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-800',
    dotClass: 'bg-blue-500',
  },
  [PlanStatus.Iptal]: {
    label: 'İptal',
    className:
      'bg-red-50 text-red-700 border border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-800',
    dotClass: 'bg-red-500',
  },
  [PlanStatus.Taslak]: {
    label: 'Taslak',
    className: 'bg-muted text-muted-foreground border border-border',
    dotClass: 'bg-muted-foreground',
  },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG[PlanStatus.Taslak];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium',
        cfg.className,
      )}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full', cfg.dotClass)} />
      {cfg.label}
    </span>
  );
}

// ─── Fill progress bar ────────────────────────────────────────────────────────

function FillBar({ pct }: { pct: number }) {
  const color =
    pct >= 80 ? 'bg-emerald-500' : pct >= 50 ? 'bg-amber-400' : 'bg-muted-foreground/30';
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-20 overflow-hidden rounded-full bg-muted">
        <div
          className={cn('h-full rounded-full transition-all', color)}
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>
      <span className="w-8 text-right text-xs font-medium text-foreground">%{pct}</span>
    </div>
  );
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function TableSkeleton() {
  return (
    <Table className="min-w-[1000px] table-fixed">
      <TableHeader>
        <TableRow className="h-9 bg-muted/40 hover:bg-muted/40">
          {['w-64', 'w-40', 'w-28', 'w-28', 'w-28', 'w-24', 'w-28', 'w-32', 'w-20'].map((w, i) => (
            <TableHead key={i}>
              <Skeleton className={cn('h-3', w)} />
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {Array.from({ length: 8 }).map((_, i) => (
          <TableRow key={i} className="h-12 hover:bg-transparent">
            <TableCell className="py-0 px-3">
              <Skeleton className="h-3 w-40" />
            </TableCell>
            <TableCell className="py-0 px-3">
              <Skeleton className="h-3 w-24" />
            </TableCell>
            <TableCell className="py-0 px-3">
              <Skeleton className="h-3 w-20" />
            </TableCell>
            <TableCell className="py-0 px-3">
              <Skeleton className="h-3 w-20" />
            </TableCell>
            <TableCell className="py-0 px-3">
              <Skeleton className="h-5 w-20 rounded-full" />
            </TableCell>
            <TableCell className="py-0 px-3">
              <Skeleton className="h-3 w-14" />
            </TableCell>
            <TableCell className="py-0 px-3">
              <Skeleton className="h-3 w-16" />
            </TableCell>
            <TableCell className="py-0 px-3">
              <Skeleton className="h-2 w-24 rounded-full" />
            </TableCell>
            <TableCell className="py-0 px-3">
              <Skeleton className="h-6 w-14 rounded-lg" />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

// ─── Rename dialog ────────────────────────────────────────────────────────────

interface RenameDialogProps {
  plan: LoadingPlanListItem;
  open: boolean;
  onClose: () => void;
}

function RenameDialog({ plan, open, onClose }: RenameDialogProps) {
  const [value, setValue] = useState(plan.planName);
  const rename = useRenameLoadingPlan();

  function handleSubmit() {
    const trimmed = value.trim();
    if (!trimmed || trimmed === plan.planName) {
      onClose();
      return;
    }
    rename.mutate({ id: plan.id, planName: trimmed }, { onSettled: onClose });
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Plan Adını Düzenle</DialogTitle>
        </DialogHeader>
        <Input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
          className="mt-1"
          autoFocus
        />
        <DialogFooter className="mt-4">
          <Button variant="outline" size="sm" onClick={onClose}>
            İptal
          </Button>
          <Button size="sm" onClick={handleSubmit} disabled={rename.isPending}>
            Kaydet
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Plan row ─────────────────────────────────────────────────────────────────

interface PlanRowProps {
  plan: LoadingPlanListItem;
  onSelect?: (id: string) => void;
}

function PlanRow({ plan, onSelect }: PlanRowProps) {
  const navigate = useNavigate();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const deletePlan = useDeleteLoadingPlan();
  const weightUnit = useUnitStore((s) => s.weightUnit);
  const cell = 'py-0 px-3';

  function handleRowClick() {
    if (onSelect) {
      onSelect(plan.id);
    } else {
      navigate(planningDetailRoute(plan.id));
    }
  }

  return (
    <>
      <TableRow className="group h-12 cursor-pointer" onClick={handleRowClick}>
        <TableCell className={cn(cell, 'max-w-[256px]')}>
          <div>
            <p className="truncate text-xs font-medium text-foreground">{plan.planName}</p>
            <p className="text-[10px] text-muted-foreground">{plan.planCode}</p>
          </div>
        </TableCell>

        <TableCell className={cell}>
          <div className="flex items-center gap-1.5">
            <VehicleIcon className="h-3 w-3 shrink-0 text-muted-foreground" />
            <span className="truncate text-xs text-foreground">{plan.vehicleName}</span>
          </div>
        </TableCell>

        <TableCell className={cell}>
          <span className="text-xs text-muted-foreground">{formatDate(plan.createdAt)}</span>
        </TableCell>

        <TableCell className={cell}>
          <span className="text-xs text-muted-foreground">
            {plan.plannedAt ? formatDate(plan.plannedAt) : '—'}
          </span>
        </TableCell>

        <TableCell className={cell}>
          <StatusBadge status={plan.status} />
        </TableCell>

        <TableCell className={cell}>
          <span className="text-xs text-foreground">{plan.productCount} ürün</span>
        </TableCell>

        <TableCell className={cell}>
          <span className="text-xs font-medium text-foreground">
            {formatWeightDisplay(plan.totalWeightKg, weightUnit)}
          </span>
        </TableCell>

        <TableCell className={cell}>
          <FillBar pct={plan.fillPercentage} />
        </TableCell>

        <TableCell className={cell} onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
            <button
              aria-label="Düzenle"
              onClick={() => setRenameOpen(true)}
              className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
            <button
              aria-label="Sil"
              onClick={() => setDeleteOpen(true)}
              className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </TableCell>
      </TableRow>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Planı sil</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{plan.planName}</strong> planı silinecek. Bu işlem geri alınamaz.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>İptal</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deletePlan.mutate(plan.id)}
              disabled={deletePlan.isPending}
            >
              Sil
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {renameOpen && (
        <RenameDialog plan={plan} open={renameOpen} onClose={() => setRenameOpen(false)} />
      )}
    </>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface LoadingPlanTableProps {
  onPlanSelect?: (id: string) => void;
}

export function LoadingPlanTable({ onPlanSelect }: LoadingPlanTableProps) {
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<'card' | 'table'>('card');
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);
  const tableCardRef = useRef<HTMLDivElement>(null);

  const { search, statusTab, dateFrom, dateTo, setSearch, setStatusTab, setDateFrom, setDateTo } =
    useLoadingPlanFilters();

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(6);
  const [cardContainerMaxH, setCardContainerMaxH] = useState<number | null>(null);
  const [cardHeight, setCardHeight] = useState(400);
  const [previewHeight, setPreviewHeight] = useState(120);
  const [productsMaxHeight, setProductsMaxHeight] = useState(260);

  useEffect(() => {
    let last = pageSize;
    const calculate = () => {
      if (!tableCardRef.current) return;
      const top = tableCardRef.current.getBoundingClientRect().top;
      const containerAvailable = Math.max(300, window.innerHeight - top - BELOW_TABLE_H);
      setCardContainerMaxH(containerAvailable);
      const cols = window.innerWidth >= 1920 ? 4 : 3;
      const visibleRows = window.innerWidth >= 1536 ? 2 : 1;
      const available = containerAvailable - HEADER_ROW_H;
      let next: number;
      if (viewMode === 'table') {
        next = Math.max(5, Math.floor(available / ROW_H));
      } else {
        const gridAvailable = available - GRID_V_PAD;
        const cardH = Math.max(
          260,
          Math.floor((gridAvailable - (visibleRows - 1) * CARD_GAP) / visibleRows),
        );
        const previewH = Math.max(60, Math.min(120, cardH - CARD_HEADER_H - 80));
        const productsH = Math.max(120, cardH - CARD_HEADER_H - previewH - 2);
        setCardHeight(cardH);
        setPreviewHeight(previewH);
        setProductsMaxHeight(productsH);
        next = cols * visibleRows;
      }
      if (next !== last) {
        last = next;
        setPageSize(next);
        setPage(1);
      }
    };
    calculate();
    window.addEventListener('resize', calculate);
    return () => window.removeEventListener('resize', calculate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewMode]);

  const handleSearch = useCallback(
    (term: string) => {
      setSearch(term);
      setPage(1);
    },
    [setSearch],
  );

  const { data, isLoading, isFetching, isError } = useLoadingPlanList(
    { search, status: statusTab === 'all' ? undefined : statusTab, dateFrom, dateTo },
    page,
    pageSize,
  );

  const { data: allData } = useLoadingPlanList({ search, dateFrom, dateTo }, 1, 100);

  const tabCounts = {
    all: allData?.totalCount ?? 0,
    taslak: allData?.items.filter((p) => p.status === 'taslak').length ?? 0,
    aktif: allData?.items.filter((p) => p.status === 'aktif').length ?? 0,
    tamamlandi: allData?.items.filter((p) => p.status === 'tamamlandi').length ?? 0,
  };

  const items = data?.items ?? [];
  const totalCount = data?.totalCount ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const showSkeleton = isLoading || isFetching;

  const filterPanelActiveCount = dateFrom || dateTo ? 1 : 0;

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

  if (isError) {
    return (
      <Alert variant="destructive">
        <AlertDescription>Yükleme planları yüklenirken bir hata oluştu.</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Status tabs */}
        <div className="flex shrink-0 items-center gap-1 rounded-lg border border-border bg-background p-1">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => {
                setStatusTab(tab.value);
                setPage(1);
              }}
              className={cn(
                'rounded-md px-3 py-1 text-xs font-medium transition-colors',
                statusTab === tab.value
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground',
              )}
            >
              <span className="flex items-center gap-1.5">
                {tab.label}
                {tabCounts[tab.value as keyof typeof tabCounts] > 0 && (
                  <span
                    className={cn(
                      'inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-semibold leading-none',
                      statusTab === tab.value
                        ? 'bg-primary-foreground/20 text-primary-foreground'
                        : 'bg-muted text-muted-foreground',
                    )}
                  >
                    {tabCounts[tab.value as keyof typeof tabCounts]}
                  </span>
                )}
              </span>
            </button>
          ))}
        </div>

        {/* Search */}
        <SearchInput
          onSearch={handleSearch}
          placeholder="Plan adı veya araç adı ile ara..."
          initialValue={search}
        />

        {/* Date filter */}
        <div ref={filterRef} className="relative shrink-0">
          <Button
            variant="outline"
            size="sm"
            className={cn(
              'gap-1.5 text-xs',
              filterPanelActiveCount > 0 && 'border-primary text-primary ring-1 ring-primary/30',
            )}
            onClick={() => setShowFilterPanel((v) => !v)}
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            Filtrele
            {filterPanelActiveCount > 0 && (
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                {filterPanelActiveCount}
              </span>
            )}
            <ChevronDown
              className={cn('h-3.5 w-3.5 transition-transform', showFilterPanel && 'rotate-180')}
            />
          </Button>

          {showFilterPanel && (
            <div
              className="absolute left-0 top-full z-20 mt-1 w-72 rounded-xl border border-border bg-background shadow-lg"
              onMouseDown={(e) => e.stopPropagation()}
            >
              <div className="space-y-4 p-4">
                <div>
                  <p className="mb-1.5 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                    <CalendarDays className="h-3 w-3" />
                    Plan Tarihi
                  </p>
                  <div className="flex flex-col gap-1.5">
                    <Input
                      type="date"
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                      className="h-8 w-full text-xs"
                    />
                    <Input
                      type="date"
                      value={dateTo}
                      onChange={(e) => setDateTo(e.target.value)}
                      min={dateFrom || undefined}
                      className="h-8 w-full text-xs"
                    />
                  </div>
                </div>
                {filterPanelActiveCount > 0 && (
                  <button
                    type="button"
                    className="text-[11px] text-muted-foreground underline hover:text-foreground"
                    onClick={() => {
                      setDateFrom('');
                      setDateTo('');
                      setShowFilterPanel(false);
                    }}
                  >
                    Panel filtrelerini temizle
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* View mode toggle */}
        <div className="ml-auto flex shrink-0 items-center gap-1 rounded-lg border border-border bg-background p-1">
          <button
            onClick={() => {
              setViewMode('card');
              setPage(1);
            }}
            className={cn(
              'flex h-7 w-7 items-center justify-center rounded-md transition-colors',
              viewMode === 'card'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-accent hover:text-foreground',
            )}
            title="Kart görünümü"
          >
            <LayoutGrid className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => {
              setViewMode('table');
              setPage(1);
            }}
            className={cn(
              'flex h-7 w-7 items-center justify-center rounded-md transition-colors',
              viewMode === 'table'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-accent hover:text-foreground',
            )}
            title="Liste görünümü"
          >
            <LayoutList className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Yeni Plan Oluştur */}
        <Button
          size="sm"
          className="shrink-0 gap-1.5 text-xs"
          onClick={() => navigate('/planning/new')}
        >
          <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
          Yeni Plan Oluştur
        </Button>
      </div>

      {/* Content */}
      <div
        ref={tableCardRef}
        className={cn(
          'rounded-2xl border border-border bg-background overflow-hidden',
          viewMode === 'table' && 'overflow-x-auto scrollbar-hide',
        )}
        style={cardContainerMaxH ? { height: cardContainerMaxH } : undefined}
      >
        {viewMode === 'table' ? (
          <>
            {showSkeleton ? (
              <TableSkeleton />
            ) : (
              <Table className="min-w-[1000px] table-fixed">
                <TableHeader>
                  <TableRow className="h-9 bg-muted/40 hover:bg-muted/40">
                    <TableHead className="w-64 whitespace-nowrap py-0 px-3 text-[10px] font-semibold uppercase tracking-widest">
                      Plan
                    </TableHead>
                    <TableHead className="w-40 whitespace-nowrap py-0 px-3 text-[10px] font-semibold uppercase tracking-widest">
                      Araç
                    </TableHead>
                    <TableHead className="w-28 whitespace-nowrap py-0 px-3 text-[10px] font-semibold uppercase tracking-widest">
                      Oluşturuldu
                    </TableHead>
                    <TableHead className="w-28 whitespace-nowrap py-0 px-3 text-[10px] font-semibold uppercase tracking-widest">
                      Planlanan
                    </TableHead>
                    <TableHead className="w-28 whitespace-nowrap py-0 px-3 text-[10px] font-semibold uppercase tracking-widest">
                      Durum
                    </TableHead>
                    <TableHead className="w-24 whitespace-nowrap py-0 px-3 text-[10px] font-semibold uppercase tracking-widest">
                      Ürün Sayısı
                    </TableHead>
                    <TableHead className="w-28 whitespace-nowrap py-0 px-3 text-[10px] font-semibold uppercase tracking-widest">
                      Top. Ağırlık
                    </TableHead>
                    <TableHead className="w-32 whitespace-nowrap py-0 px-3 text-[10px] font-semibold uppercase tracking-widest">
                      Doluluk
                    </TableHead>
                    <TableHead className="w-20 whitespace-nowrap py-0 px-3 text-[10px] font-semibold uppercase tracking-widest">
                      İşlem
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.length === 0 ? (
                    <TableRow className="hover:bg-transparent">
                      <TableCell
                        colSpan={9}
                        className="py-16 text-center text-sm text-muted-foreground"
                      >
                        Eşleşen yükleme planı bulunamadı.
                      </TableCell>
                    </TableRow>
                  ) : (
                    items.map((plan) => (
                      <PlanRow key={plan.id} plan={plan} onSelect={onPlanSelect} />
                    ))
                  )}
                </TableBody>
              </Table>
            )}
          </>
        ) : (
          <>
            <div className="flex h-12 items-center border-b border-border bg-muted/40 px-4">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                Yükleme Planları
              </span>
              {!showSkeleton && totalCount > 0 && (
                <span className="ml-auto text-[10px] text-muted-foreground">
                  Toplam <span className="font-medium text-foreground">{totalCount}</span> plan
                </span>
              )}
            </div>

            {showSkeleton ? (
              <div
                className="grid grid-cols-3 gap-3 px-4 py-3 min-[1920px]:grid-cols-4"
                style={{ gridAutoRows: cardHeight }}
              >
                {Array.from({ length: pageSize }).map((_, i) => (
                  <div key={i} className="animate-pulse rounded-xl border border-border bg-muted" />
                ))}
              </div>
            ) : items.length === 0 ? (
              <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
                Eşleşen yükleme planı bulunamadı.
              </div>
            ) : (
              <div
                className="grid grid-cols-3 gap-3 px-4 py-3 min-[1920px]:grid-cols-4"
                style={{ gridAutoRows: cardHeight }}
              >
                {items.map((plan, i) => (
                  <VehicleCard
                    key={plan.id}
                    plan={plan}
                    index={(page - 1) * pageSize + i}
                    previewHeight={previewHeight}
                    productsMaxHeight={productsMaxHeight}
                  />
                ))}
              </div>
            )}
          </>
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
                disabled={page <= 1 || showSkeleton}
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
                disabled={page >= totalPages || showSkeleton}
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
