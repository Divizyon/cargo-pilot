import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, Pencil, Trash2 } from 'lucide-react';
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
import type { LoadingPlanFiltersHook } from '../hooks/useLoadingPlanFilters';

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
  const d = new Date(iso);
  return d.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

// ─── Skeleton rows ────────────────────────────────────────────────────────────

function SkeletonRows() {
  return (
    <>
      {Array.from({ length: 8 }).map((_, i) => (
        <TableRow key={i}>
          {Array.from({ length: 9 }).map((__, j) => (
            <TableCell key={j}>
              <Skeleton className="h-4 w-full" />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  );
}

// ─── Pagination ───────────────────────────────────────────────────────────────

const PAGE_SIZE_OPTIONS = [10, 25, 50];

interface PaginationProps {
  page: number;
  pageSize: number;
  totalCount: number;
  onPage: (p: number) => void;
  onPageSize: (s: number) => void;
}

function Pagination({ page, pageSize, totalCount, onPage, onPageSize }: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, totalCount);

  return (
    <div className="flex items-center justify-between border-t border-border px-4 py-3">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span>
          {totalCount === 0 ? '0' : `${from}-${to}`} / {totalCount} kayıt
        </span>
        <span>Sayfa başına</span>
        <select
          value={pageSize}
          onChange={(e) => {
            onPageSize(Number(e.target.value));
            onPage(1);
          }}
          className="h-7 rounded-md border border-border bg-background px-2 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
        >
          {PAGE_SIZE_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-1">
        {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
          <button
            key={p}
            onClick={() => onPage(p)}
            className={cn(
              'flex h-7 w-7 items-center justify-center rounded-md text-xs font-medium transition-colors',
              p === page
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-accent hover:text-foreground',
            )}
          >
            {p}
          </button>
        ))}
        <button
          onClick={() => onPage(Math.min(page + 1, totalPages))}
          disabled={page >= totalPages}
          className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-40"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

// ─── Main table component ─────────────────────────────────────────────────────

interface Props {
  filters: LoadingPlanFiltersHook;
  onPlanSelect?: (id: string) => void;
}

export function LoadingPlanTable({ filters, onPlanSelect }: Props) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const { search, statusTab, plate, vehicleNames, dateFrom, dateTo } = filters;

  const { data, isLoading, isError } = useLoadingPlanList(
    { search, status: statusTab, plate, vehicleNames, dateFrom, dateTo },
    page,
    pageSize,
  );

  const items = data?.items ?? [];
  const totalCount = data?.totalCount ?? 0;

  function handlePageSize(s: number) {
    setPageSize(s);
    setPage(1);
  }

  if (isError) {
    return (
      <Alert variant="destructive">
        <AlertDescription>Yükleme planları yüklenirken bir hata oluştu.</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-background">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="w-[280px] text-[11px] font-semibold uppercase tracking-wider">
              Plan
            </TableHead>
            <TableHead className="text-[11px] font-semibold uppercase tracking-wider">
              Araç
            </TableHead>
            <TableHead className="text-[11px] font-semibold uppercase tracking-wider">
              Oluşturuldu
            </TableHead>
            <TableHead className="text-[11px] font-semibold uppercase tracking-wider">
              Planlanan
            </TableHead>
            <TableHead className="text-[11px] font-semibold uppercase tracking-wider">
              Durum
            </TableHead>
            <TableHead className="text-right text-[11px] font-semibold uppercase tracking-wider">
              Ürün Sayısı
            </TableHead>
            <TableHead className="text-[11px] font-semibold uppercase tracking-wider">
              Top. Ağırlık
            </TableHead>
            <TableHead className="text-[11px] font-semibold uppercase tracking-wider">
              Doluluk
            </TableHead>
            <TableHead className="w-[80px] text-[11px] font-semibold uppercase tracking-wider">
              İşlem
            </TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {isLoading ? (
            <SkeletonRows />
          ) : items.length === 0 ? (
            <TableRow>
              <TableCell colSpan={9} className="py-12 text-center text-sm text-muted-foreground">
                Eşleşen yükleme planı bulunamadı.
              </TableCell>
            </TableRow>
          ) : (
            items.map((plan) => <PlanRow key={plan.id} plan={plan} onSelect={onPlanSelect} />)
          )}
        </TableBody>
      </Table>

      <Pagination
        page={page}
        pageSize={pageSize}
        totalCount={totalCount}
        onPage={setPage}
        onPageSize={handlePageSize}
      />
    </div>
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

function PlanRow({
  plan,
  onSelect,
}: {
  plan: LoadingPlanListItem;
  onSelect?: (id: string) => void;
}) {
  const navigate = useNavigate();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const deletePlan = useDeleteLoadingPlan();
  const weightUnit = useUnitStore((s) => s.weightUnit);

  function handleRowClick() {
    if (onSelect) {
      onSelect(plan.id);
    } else {
      navigate(planningDetailRoute(plan.id));
    }
  }

  return (
    <>
      <TableRow className="group cursor-pointer" onClick={handleRowClick}>
        {/* Plan name + code */}
        <TableCell>
          <div>
            <p className="text-sm font-medium text-foreground">{plan.planName}</p>
            <p className="text-xs text-muted-foreground">{plan.planCode}</p>
          </div>
        </TableCell>

        {/* Vehicle */}
        <TableCell>
          <div className="flex items-center gap-2">
            <VehicleIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="text-sm text-foreground">{plan.vehicleName}</span>
          </div>
        </TableCell>

        {/* Created date */}
        <TableCell className="text-sm text-muted-foreground">
          {formatDate(plan.createdAt)}
        </TableCell>

        {/* Planned date */}
        <TableCell className="text-sm text-muted-foreground">
          {plan.plannedAt ? formatDate(plan.plannedAt) : '—'}
        </TableCell>

        {/* Status */}
        <TableCell>
          <StatusBadge status={plan.status} />
        </TableCell>

        {/* Product count */}
        <TableCell className="text-right text-sm text-foreground">
          {plan.productCount} ürün
        </TableCell>

        {/* Total weight */}
        <TableCell>
          <p className="text-sm font-medium text-foreground">
            {formatWeightDisplay(plan.totalWeightKg, weightUnit)}
          </p>
        </TableCell>

        {/* Fill percentage */}
        <TableCell>
          <FillBar pct={plan.fillPercentage} />
        </TableCell>

        {/* Actions */}
        <TableCell onClick={(e) => e.stopPropagation()}>
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

      {/* Delete confirmation */}
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

      {/* Rename dialog */}
      {renameOpen && (
        <RenameDialog plan={plan} open={renameOpen} onClose={() => setRenameOpen(false)} />
      )}
    </>
  );
}
