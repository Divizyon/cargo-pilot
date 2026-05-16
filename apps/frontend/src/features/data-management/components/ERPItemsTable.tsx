import { useCallback, useState } from 'react';
import { ChevronLeft, ChevronRight, Loader2, RefreshCw, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
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
  useERPConnection,
  useERPPendingMappingsPaginated,
  useTriggerERPSync,
  useApproveERPMappingWithNewItem,
  type ErpPendingMappingItem,
} from '@/lib/api/useERPIntegration';
import { ALLOWED_ROTATIONS, ITEM_CATEGORY, type CreateItemRequest } from '@/lib/api/itemMappers';
import { SearchInput } from './SearchInput';

const PAGE_SIZE = 20;

// ─── Column widths ────────────────────────────────────────────────────────────

const SKELETON_COL_WIDTHS = ['w-4', 'w-44', 'w-24', 'w-16', 'w-16', 'w-16', 'w-16'];

// ─── Inline edit state ────────────────────────────────────────────────────────

interface EditableRow {
  erpProductName: string;
  erpSku: string;
  erpWeight: string;
  erpWidth: string;
  erpHeight: string;
  erpLength: string;
}

function getDisplayValue<K extends keyof EditableRow>(
  row: ErpPendingMappingItem,
  edits: Record<string, Partial<EditableRow>>,
  field: K,
): string {
  const edit = edits[row.id];
  if (edit && field in edit) return edit[field] as string;
  if (field === 'erpProductName') return row.erpProductName;
  if (field === 'erpSku') return row.erpSku ?? '';
  if (field === 'erpWeight') return row.erpWeight?.toString() ?? '';
  if (field === 'erpWidth') return row.erpWidth?.toString() ?? '';
  if (field === 'erpHeight') return row.erpHeight?.toString() ?? '';
  if (field === 'erpLength') return row.erpLength?.toString() ?? '';
  return '';
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function ERPItemsTableSkeleton() {
  return (
    <Table className="min-w-[800px] table-fixed">
      <TableHeader>
        <TableRow className="h-9 bg-muted/40 hover:bg-muted/40">
          {SKELETON_COL_WIDTHS.map((w, i) => (
            <TableHead key={i}>
              <Skeleton className={`h-3 ${w}`} />
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {Array.from({ length: 6 }).map((_, i) => (
          <TableRow key={i} className="h-12 hover:bg-transparent">
            <TableCell className="py-0 px-3">
              <Skeleton className="h-4 w-4" />
            </TableCell>
            <TableCell className="py-0 px-3">
              <Skeleton className="h-7 w-full" />
            </TableCell>
            <TableCell className="py-0 px-3">
              <Skeleton className="h-7 w-full" />
            </TableCell>
            <TableCell className="py-0 px-3">
              <Skeleton className="h-7 w-full" />
            </TableCell>
            <TableCell className="py-0 px-3">
              <Skeleton className="h-7 w-full" />
            </TableCell>
            <TableCell className="py-0 px-3">
              <Skeleton className="h-7 w-full" />
            </TableCell>
            <TableCell className="py-0 px-3">
              <Skeleton className="h-7 w-full" />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

// ─── ERPItemsTable ─────────────────────────────────────────────────────────────

export function ERPItemsTable() {
  const { data: connection } = useERPConnection();
  const integrationId = connection?.id;

  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [edits, setEdits] = useState<Record<string, Partial<EditableRow>>>({});
  const [isTransferring, setIsTransferring] = useState(false);

  const isSearching = searchTerm.trim().length > 0;
  const queryPage = isSearching ? 1 : page;
  const queryPageSize = isSearching ? 100 : PAGE_SIZE;

  const {
    data: mappingsPage,
    isLoading,
    isFetching,
  } = useERPPendingMappingsPaginated(integrationId, {
    page: queryPage,
    pageSize: queryPageSize,
    status: 0,
  });

  const { mutate: triggerSync, isPending: isSyncing } = useTriggerERPSync();
  const { mutateAsync: approveWithNewItem } = useApproveERPMappingWithNewItem();

  const allItems = mappingsPage?.items ?? [];

  const filteredItems = isSearching
    ? allItems.filter(
        (item) =>
          item.erpProductName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (item.erpSku ?? '').toLowerCase().includes(searchTerm.toLowerCase()),
      )
    : allItems;

  const totalCount = isSearching ? filteredItems.length : (mappingsPage?.totalCount ?? 0);
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const displayedItems = isSearching
    ? filteredItems.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
    : filteredItems;

  const showSkeleton = isLoading || isFetching;
  const isEmpty = !showSkeleton && displayedItems.length === 0 && !isSearching;
  const noResults = !showSkeleton && displayedItems.length === 0 && isSearching;

  const allSelected =
    displayedItems.length > 0 && displayedItems.every((i) => selectedIds.has(i.id));
  const someSelected = !allSelected && displayedItems.some((i) => selectedIds.has(i.id));

  const handleSearch = useCallback((value: string) => {
    setSearchTerm(value);
    setPage(1);
  }, []);

  function handleSelectAll(checked: boolean | 'indeterminate') {
    if (checked === true) {
      setSelectedIds(new Set(displayedItems.map((i) => i.id)));
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

  function handleEdit(id: string, field: keyof EditableRow, value: string) {
    setEdits((prev) => ({
      ...prev,
      [id]: { ...prev[id], [field]: value },
    }));
  }

  function handleSync() {
    if (!integrationId) return;
    triggerSync({ integrationId });
  }

  async function handleTransfer() {
    if (!integrationId || selectedIds.size === 0 || isTransferring) return;
    setIsTransferring(true);

    const rowsToTransfer = displayedItems.filter((item) => selectedIds.has(item.id));

    const results = await Promise.allSettled(
      rowsToTransfer.map((row) => {
        const edit = edits[row.id] ?? {};
        const name = edit.erpProductName ?? row.erpProductName;
        const sku = edit.erpSku ?? row.erpSku ?? '';
        const weight =
          edit.erpWeight !== undefined ? parseFloat(edit.erpWeight) || 0 : (row.erpWeight ?? 0);
        const width =
          edit.erpWidth !== undefined ? parseFloat(edit.erpWidth) || 0 : (row.erpWidth ?? 0);
        const height =
          edit.erpHeight !== undefined ? parseFloat(edit.erpHeight) || 0 : (row.erpHeight ?? 0);
        const length =
          edit.erpLength !== undefined ? parseFloat(edit.erpLength) || 0 : (row.erpLength ?? 0);

        const itemPayload: CreateItemRequest = {
          name,
          sku,
          productType: 'koli',
          category: ITEM_CATEGORY.Box,
          width,
          height,
          length,
          weight,
          fragilityType: 0,
          isStackable: true,
          maxStackCount: 1,
          maxWeightOnTop: weight > 0 ? weight : 1,
          allowedRotations: ALLOWED_ROTATIONS.All,
        };

        return approveWithNewItem({ integrationId, mappingId: row.id, itemPayload });
      }),
    );

    const successIds = rowsToTransfer
      .filter((_, i) => results[i].status === 'fulfilled')
      .map((r) => r.id);
    const failCount = results.filter((r) => r.status === 'rejected').length;

    if (successIds.length > 0) {
      const msg =
        failCount === 0
          ? `${successIds.length} ürün Cargo Pilot'a aktarıldı`
          : `${successIds.length}/${rowsToTransfer.length} ürün aktarıldı`;
      toast.success(msg, { position: 'bottom-right' });
      setSelectedIds((prev) => {
        const next = new Set(prev);
        successIds.forEach((id) => next.delete(id));
        return next;
      });
      setEdits((prev) => {
        const next = { ...prev };
        successIds.forEach((id) => delete next[id]);
        return next;
      });
    }
    if (failCount > 0) {
      toast.error(`${failCount} ürün aktarılamadı`, { position: 'bottom-right' });
    }

    setIsTransferring(false);
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <SearchInput
          onSearch={handleSearch}
          placeholder="ERP ürün adı veya SKU ile ara..."
        />

        <Button
          variant="outline"
          size="sm"
          className="shrink-0 gap-1.5 text-xs"
          onClick={handleSync}
          disabled={isSyncing || !integrationId}
        >
          {isSyncing ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <RefreshCw className="h-3.5 w-3.5" />
          )}
          ERP ile Sync
        </Button>

        <Button
          size="sm"
          className="shrink-0 gap-1.5 text-xs"
          onClick={handleTransfer}
          disabled={selectedIds.size === 0 || isTransferring || !integrationId}
        >
          {isTransferring ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Upload className="h-3.5 w-3.5" strokeWidth={2.5} />
          )}
          Ürünlere Aktar
          {selectedIds.size > 0 && (
            <span className="ml-0.5 rounded-full bg-primary-foreground/20 px-1.5 py-0.5 text-[10px] font-bold">
              {selectedIds.size}
            </span>
          )}
        </Button>
      </div>

      {/* No-results alert */}
      {noResults && (
        <Alert>
          <AlertDescription>Aradığınız kriterlere uygun ERP ürünü bulunamadı.</AlertDescription>
        </Alert>
      )}

      {/* Table card */}
      <div className="overflow-x-auto overflow-hidden rounded-2xl border border-border bg-background">
        {showSkeleton ? (
          <ERPItemsTableSkeleton />
        ) : (
          <Table className="min-w-[800px] table-fixed">
            <TableHeader>
              <TableRow className="h-9 bg-muted/40 hover:bg-muted/40">
                <TableHead className="w-10 py-0 px-3">
                  <Checkbox
                    checked={allSelected ? true : someSelected ? 'indeterminate' : false}
                    onCheckedChange={handleSelectAll}
                    aria-label="Tümünü seç"
                  />
                </TableHead>
                <TableHead className="w-52 whitespace-nowrap py-0 px-3 text-[10px] font-semibold uppercase tracking-widest">
                  ERP Ürün Adı
                </TableHead>
                <TableHead className="w-28 whitespace-nowrap py-0 px-3 text-[10px] font-semibold uppercase tracking-widest">
                  SKU
                </TableHead>
                <TableHead className="w-24 whitespace-nowrap py-0 px-3 text-[10px] font-semibold uppercase tracking-widest">
                  Ağırlık (kg)
                </TableHead>
                <TableHead className="w-24 whitespace-nowrap py-0 px-3 text-[10px] font-semibold uppercase tracking-widest">
                  Genişlik (cm)
                </TableHead>
                <TableHead className="w-24 whitespace-nowrap py-0 px-3 text-[10px] font-semibold uppercase tracking-widest">
                  Yükseklik (cm)
                </TableHead>
                <TableHead className="w-24 whitespace-nowrap py-0 px-3 text-[10px] font-semibold uppercase tracking-widest">
                  Uzunluk (cm)
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isEmpty && (
                <TableRow className="hover:bg-transparent">
                  <TableCell
                    colSpan={7}
                    className="py-16 text-center text-sm text-muted-foreground"
                  >
                    {!integrationId
                      ? 'ERP bağlantısı yapılandırılmamış.'
                      : 'Bekleyen ERP ürünü yok.'}
                  </TableCell>
                </TableRow>
              )}
              {displayedItems.map((row) => (
                <TableRow
                  key={row.id}
                  className="h-12"
                >
                  <TableCell className="py-0 px-3">
                    <Checkbox
                      checked={selectedIds.has(row.id)}
                      onCheckedChange={(checked) => handleSelectRow(row.id, Boolean(checked))}
                      aria-label={`${row.erpProductName} satırını seç`}
                    />
                  </TableCell>
                  <TableCell className="py-0 px-3">
                    <Input
                      value={getDisplayValue(row, edits, 'erpProductName')}
                      onChange={(e) => handleEdit(row.id, 'erpProductName', e.target.value)}
                      className="h-7 px-2 text-xs"
                      aria-label="ERP ürün adı"
                    />
                  </TableCell>
                  <TableCell className="py-0 px-3">
                    <Input
                      value={getDisplayValue(row, edits, 'erpSku')}
                      onChange={(e) => handleEdit(row.id, 'erpSku', e.target.value)}
                      className="h-7 px-2 font-mono text-xs"
                      aria-label="SKU"
                    />
                  </TableCell>
                  <TableCell className="py-0 px-3">
                    <Input
                      type="number"
                      min={0}
                      step="any"
                      value={getDisplayValue(row, edits, 'erpWeight')}
                      onChange={(e) => handleEdit(row.id, 'erpWeight', e.target.value)}
                      className="h-7 px-2 text-xs"
                      aria-label="Ağırlık"
                    />
                  </TableCell>
                  <TableCell className="py-0 px-3">
                    <Input
                      type="number"
                      min={0}
                      step="any"
                      value={getDisplayValue(row, edits, 'erpWidth')}
                      onChange={(e) => handleEdit(row.id, 'erpWidth', e.target.value)}
                      className="h-7 px-2 text-xs"
                      aria-label="Genişlik"
                    />
                  </TableCell>
                  <TableCell className="py-0 px-3">
                    <Input
                      type="number"
                      min={0}
                      step="any"
                      value={getDisplayValue(row, edits, 'erpHeight')}
                      onChange={(e) => handleEdit(row.id, 'erpHeight', e.target.value)}
                      className="h-7 px-2 text-xs"
                      aria-label="Yükseklik"
                    />
                  </TableCell>
                  <TableCell className="py-0 px-3">
                    <Input
                      type="number"
                      min={0}
                      step="any"
                      value={getDisplayValue(row, edits, 'erpLength')}
                      onChange={(e) => handleEdit(row.id, 'erpLength', e.target.value)}
                      className="h-7 px-2 text-xs"
                      aria-label="Uzunluk"
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Pagination */}
      {totalCount > 0 && (
        <div className="flex items-center justify-between px-1">
          <p className="text-xs text-muted-foreground">
            Toplam <span className="font-medium text-foreground">{totalCount}</span> ERP ürünü
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
