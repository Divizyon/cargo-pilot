import { useState } from 'react';
import { ArrowUpFromLine, XCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useDraftItems, useRejectDraftItem, type DraftItem } from '@/lib/api/useDraftItems';
import {
  BulkImportDialog,
  type EditableRow,
} from '@/features/data-management/imports/components/BulkImportDialog';

const PAGE_SIZE = 20;

function draftItemToRow(item: DraftItem): EditableRow {
  let tip: string;
  if (item.category === 1) tip = 'palet';
  else if (item.category === 0) tip = 'koli';
  else tip = 'varil';

  let allowRotateX = false,
    allowRotateY = false,
    allowRotateZ = false;
  switch (item.allowedRotations) {
    case 0:
      allowRotateX = true;
      allowRotateY = true;
      allowRotateZ = true;
      break;
    case 1:
      allowRotateX = false;
      allowRotateY = true;
      allowRotateZ = false;
      break;
    case 3:
      allowRotateX = true;
      allowRotateY = false;
      allowRotateZ = true;
      break;
    case 4:
      allowRotateX = true;
      allowRotateY = false;
      allowRotateZ = false;
      break;
    case 5:
      allowRotateX = false;
      allowRotateY = false;
      allowRotateZ = true;
      break;
    case 6:
      allowRotateX = false;
      allowRotateY = true;
      allowRotateZ = false;
      break;
  }

  return {
    _id: crypto.randomUUID(),
    sku: item.sku ?? '',
    name: item.name,
    tip,
    width: String(item.width),
    height: String(item.height),
    length: String(item.length),
    weight: String(item.weight),
    fragility: String(item.fragilityType),
    isStackable: item.isStackable,
    maxStackCount: String(item.maxStackCount > 0 ? item.maxStackCount : 1),
    allowRotateX,
    allowRotateY,
    allowRotateZ,
    constraintIds: item.constraintIds ?? [],
    incompatibleGroups: [],
    notes: item.specialNotes ?? '',
  };
}

function DraftItemsSkeleton() {
  return (
    <Table className="min-w-[700px]">
      <TableHeader>
        <TableRow className="h-9 bg-muted/40 hover:bg-muted/40">
          {Array.from({ length: 6 }).map((_, i) => (
            <TableHead key={i}>
              <Skeleton className="h-3 w-16" />
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {Array.from({ length: 8 }).map((_, i) => (
          <TableRow key={i} className="h-12 hover:bg-transparent">
            {Array.from({ length: 6 }).map((_, j) => (
              <TableCell key={j} className="py-0 px-3">
                <Skeleton className="h-4 w-full" />
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export function ERPDraftItems() {
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [rejectTarget, setRejectTarget] = useState<DraftItem | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogRows, setDialogRows] = useState<EditableRow[]>([]);
  const [dialogDraftIds, setDialogDraftIds] = useState<Record<string, string>>({});

  const { data, isLoading, isFetching } = useDraftItems({ page, pageSize: PAGE_SIZE, status: 0 });
  const { mutate: reject, isPending: isRejecting } = useRejectDraftItem();

  const items = data?.items ?? [];
  const totalCount = data?.totalCount ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  const allSelected = items.length > 0 && items.every((i) => selectedIds.has(i.id));
  const someSelected = !allSelected && items.some((i) => selectedIds.has(i.id));

  function handleSelectAll(checked: boolean | 'indeterminate') {
    if (checked === true) {
      setSelectedIds(new Set(items.map((i) => i.id)));
    } else {
      setSelectedIds(new Set());
    }
  }

  function handleSelectRow(id: string, checked: boolean) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  function handleAktar() {
    const targets = selectedIds.size > 0 ? items.filter((i) => selectedIds.has(i.id)) : items;
    if (targets.length === 0) return;
    const rows: EditableRow[] = [];
    const draftIds: Record<string, string> = {};
    for (const item of targets) {
      const row = draftItemToRow(item);
      rows.push(row);
      draftIds[row._id] = item.id;
    }
    setDialogRows(rows);
    setDialogDraftIds(draftIds);
    setDialogOpen(true);
  }

  function handleRejectConfirm() {
    if (!rejectTarget) return;
    reject(rejectTarget.id, { onSuccess: () => setRejectTarget(null) });
  }

  const showSkeleton = isLoading || isFetching;
  const isEmpty = !showSkeleton && items.length === 0;

  return (
    <div className="flex flex-col gap-4">
      {/* Toolbar */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">
          Toplam <span className="font-medium text-foreground">{totalCount}</span> taslak ürün
        </span>
        <Button
          size="sm"
          className="ml-auto gap-1.5 text-xs"
          disabled={showSkeleton || items.length === 0}
          onClick={handleAktar}
        >
          <ArrowUpFromLine className="h-3.5 w-3.5" />
          {selectedIds.size > 0 ? `${selectedIds.size} Ürünü Aktar` : 'Tümünü Aktar'}
        </Button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto overflow-hidden rounded-xl border border-border bg-background">
        {showSkeleton ? (
          <DraftItemsSkeleton />
        ) : (
          <Table className="min-w-[700px]">
            <TableHeader>
              <TableRow className="h-9 bg-muted/40 hover:bg-muted/40">
                <TableHead className="w-10 py-0 px-3">
                  <Checkbox
                    checked={allSelected ? true : someSelected ? 'indeterminate' : false}
                    onCheckedChange={handleSelectAll}
                    aria-label="Tümünü seç"
                  />
                </TableHead>
                <TableHead className="py-0 px-3 text-[10px] font-semibold uppercase tracking-widest">
                  Ürün
                </TableHead>
                <TableHead className="w-28 py-0 px-3 text-[10px] font-semibold uppercase tracking-widest">
                  SKU
                </TableHead>
                <TableHead className="w-36 py-0 px-3 text-[10px] font-semibold uppercase tracking-widest">
                  Boyutlar (cm)
                </TableHead>
                <TableHead className="w-24 py-0 px-3 text-[10px] font-semibold uppercase tracking-widest">
                  Ağırlık
                </TableHead>
                <TableHead className="w-24 py-0 px-3 text-[10px] font-semibold uppercase tracking-widest">
                  İşlemler
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
                    Bekleyen taslak ürün yok.
                  </TableCell>
                </TableRow>
              )}
              {items.map((item) => (
                <TableRow key={item.id} className="h-12">
                  <TableCell className="py-0 px-3">
                    <Checkbox
                      checked={selectedIds.has(item.id)}
                      onCheckedChange={(checked) => handleSelectRow(item.id, Boolean(checked))}
                      aria-label={`${item.name} satırını seç`}
                    />
                  </TableCell>
                  <TableCell className="py-0 px-3 max-w-[200px]">
                    <span
                      className="block truncate text-xs font-medium text-foreground"
                      title={item.name}
                    >
                      {item.name}
                    </span>
                    {item.erpId && (
                      <span className="text-[10px] text-muted-foreground">{item.erpId}</span>
                    )}
                  </TableCell>
                  <TableCell className="py-0 px-3 font-mono text-xs text-muted-foreground">
                    {item.sku ?? '—'}
                  </TableCell>
                  <TableCell className="py-0 px-3 text-xs text-muted-foreground">
                    {item.width} × {item.height} × {item.length}
                  </TableCell>
                  <TableCell className="py-0 px-3 text-xs text-muted-foreground">
                    {item.weight} kg
                  </TableCell>
                  <TableCell className="py-0 px-3">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 gap-1 px-2 text-[11px] text-destructive hover:bg-destructive/10"
                      disabled={isRejecting}
                      onClick={() => setRejectTarget(item)}
                    >
                      <XCircle className="h-3.5 w-3.5" />
                      Reddet
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-end gap-2">
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

      {/* Reject confirm dialog */}
      <AlertDialog
        open={Boolean(rejectTarget)}
        onOpenChange={(open) => {
          if (!open) setRejectTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ürünü Reddet</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{rejectTarget?.name}</strong> taslak ürünü reddedilecek. Bu işlem geri
              alınamaz.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>İptal</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isRejecting}
              onClick={handleRejectConfirm}
            >
              Reddet
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Aktar dialog */}
      <BulkImportDialog
        key={dialogOpen ? dialogRows.map((r) => r._id).join(',') : 'closed'}
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setSelectedIds(new Set());
        }}
        initialRows={dialogRows}
        draftItemIds={dialogDraftIds}
      />
    </div>
  );
}
