import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Loader2, RefreshCw, Upload } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
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
  useERPConnection,
  useERPPendingMappingsPaginated,
  useTriggerERPSync,
  type ErpPendingMappingItem,
} from '@/lib/api/useERPIntegration';
import { BulkImportDialog, type EditableRow } from './BulkImportDialog';
import { SearchInput } from './SearchInput';

const ROW_H = 48;
const HEADER_ROW_H = 36;
const BELOW_TABLE_H = 80;

// ─── Mock data (no ERP connection) ───────────────────────────────────────────

const MOCK_ITEMS: ErpPendingMappingItem[] = [
  {
    id: 'mock-1',
    erpProductId: 'STK001',
    erpProductName: 'Ahşap Kargo Kutusu',
    erpSku: 'STK001',
    erpWeight: 15,
    erpWidth: 60,
    erpHeight: 40,
    erpLength: 80,
    erpCategory: 'AHSAP',
    erpBarcode: '8691234567890',
  },
  {
    id: 'mock-2',
    erpProductId: 'STK002',
    erpProductName: 'Metal Depo Kasası',
    erpSku: 'MTL-002',
    erpWeight: 45,
    erpWidth: 120,
    erpHeight: 60,
    erpLength: 100,
    erpCategory: 'METAL',
    erpBarcode: '8699876543210',
  },
  {
    id: 'mock-3',
    erpProductId: 'STK003',
    erpProductName: 'Plastik Saklama Kabı',
    erpSku: 'PLT-003',
    erpWeight: 3.5,
    erpWidth: 30,
    erpHeight: 20,
    erpLength: 40,
    erpCategory: 'PLASTIK',
    erpBarcode: '8695551234567',
  },
  {
    id: 'mock-4',
    erpProductId: 'STK004',
    erpProductName: 'Elektronik Aksesuar Kutusu',
    erpSku: 'ELK-004',
    erpWeight: 2.8,
    erpWidth: 25,
    erpHeight: 15,
    erpLength: 35,
    erpCategory: 'ELEKTRONIK',
    erpBarcode: '8697778889990',
  },
  {
    id: 'mock-5',
    erpProductId: 'STK005',
    erpProductName: 'Tekstil Karton Kolisi',
    erpSku: 'TKS-005',
    erpWeight: 8,
    erpWidth: 50,
    erpHeight: 50,
    erpLength: 60,
    erpCategory: 'TEKSTIL',
    erpBarcode: '8691112223334',
  },
  {
    id: 'mock-6',
    erpProductId: 'STK006',
    erpProductName: 'Cam Eşya Nakliye Kasası',
    erpSku: 'CAM-006',
    erpWeight: 22,
    erpWidth: 80,
    erpHeight: 70,
    erpLength: 90,
    erpCategory: 'CAM',
    erpBarcode: '8694445556667',
  },
  {
    id: 'mock-7',
    erpProductId: 'STK007',
    erpProductName: 'Endüstriyel Boya Kovası',
    erpSku: 'BYA-007',
    erpWeight: 18,
    erpWidth: 35,
    erpHeight: 45,
    erpLength: 35,
    erpCategory: 'KIMYASAL',
    erpBarcode: '8692223334445',
  },
  {
    id: 'mock-8',
    erpProductId: 'STK008',
    erpProductName: 'Kağıt Rulo Ambalaj',
    erpSku: 'KAG-008',
    erpWeight: 12,
    erpWidth: 100,
    erpHeight: 60,
    erpLength: 60,
    erpCategory: 'KAGIT',
    erpBarcode: '8696667778889',
  },
  {
    id: 'mock-9',
    erpProductId: 'STK009',
    erpProductName: 'Demir Profil Paketi',
    erpSku: 'DMR-009',
    erpWeight: 85,
    erpWidth: 200,
    erpHeight: 20,
    erpLength: 30,
    erpCategory: 'METAL',
    erpBarcode: '8693334445556',
  },
  {
    id: 'mock-10',
    erpProductId: 'STK010',
    erpProductName: 'Organik Gübre Torbası',
    erpSku: 'GBR-010',
    erpWeight: 25,
    erpWidth: 55,
    erpHeight: 80,
    erpLength: 30,
    erpCategory: 'TARIM',
    erpBarcode: '8698889990001',
  },
  {
    id: 'mock-11',
    erpProductId: 'STK011',
    erpProductName: 'Seramik Fayans Kutusu',
    erpSku: 'SRM-011',
    erpWeight: 30,
    erpWidth: 60,
    erpHeight: 15,
    erpLength: 60,
    erpCategory: 'SERAMIK',
    erpBarcode: '8691230004567',
  },
  {
    id: 'mock-12',
    erpProductId: 'STK012',
    erpProductName: 'Otomotiv Yedek Parça',
    erpSku: 'OTO-012',
    erpWeight: 9,
    erpWidth: 40,
    erpHeight: 25,
    erpLength: 50,
    erpCategory: 'OTOMOTIV',
    erpBarcode: '8695670001234',
  },
  {
    id: 'mock-13',
    erpProductId: 'STK013',
    erpProductName: 'Bebek Bezi Karton Koli',
    erpSku: 'BBK-013',
    erpWeight: 5.5,
    erpWidth: 70,
    erpHeight: 45,
    erpLength: 50,
    erpCategory: 'TEKSTIL',
    erpBarcode: '8699001112223',
  },
  {
    id: 'mock-14',
    erpProductId: 'STK014',
    erpProductName: 'Gıda Konserve Kasası',
    erpSku: 'GDA-014',
    erpWeight: 20,
    erpWidth: 45,
    erpHeight: 30,
    erpLength: 55,
    erpCategory: 'GIDA',
    erpBarcode: '8694561237890',
  },
  {
    id: 'mock-15',
    erpProductId: 'STK015',
    erpProductName: 'İnşaat Malzeme Torbası',
    erpSku: 'INS-015',
    erpWeight: 40,
    erpWidth: 65,
    erpHeight: 90,
    erpLength: 35,
    erpCategory: 'INSAAT',
    erpBarcode: '8697894561230',
  },
  {
    id: 'mock-16',
    erpProductId: 'STK016',
    erpProductName: 'Plastik Boru Demeti',
    erpSku: 'BRU-016',
    erpWeight: 14,
    erpWidth: 150,
    erpHeight: 25,
    erpLength: 25,
    erpCategory: 'PLASTIK',
    erpBarcode: '8692346781230',
  },
  {
    id: 'mock-17',
    erpProductId: 'STK017',
    erpProductName: 'Mobilya Aksesuar Kutusu',
    erpSku: 'MOB-017',
    erpWeight: 6,
    erpWidth: 35,
    erpHeight: 20,
    erpLength: 45,
    erpCategory: 'MOBILYA',
    erpBarcode: '8691237894560',
  },
  {
    id: 'mock-18',
    erpProductId: 'STK018',
    erpProductName: 'Tarım İlacı Bidonu',
    erpSku: 'TRM-018',
    erpWeight: 11,
    erpWidth: 25,
    erpHeight: 40,
    erpLength: 25,
    erpCategory: 'TARIM',
    erpBarcode: '8696781234560',
  },
  {
    id: 'mock-19',
    erpProductId: 'STK019',
    erpProductName: 'Tekstil Ürünü Balya',
    erpSku: 'BAL-019',
    erpWeight: 35,
    erpWidth: 90,
    erpHeight: 60,
    erpLength: 70,
    erpCategory: 'TEKSTIL',
    erpBarcode: '8694560001237',
  },
  {
    id: 'mock-20',
    erpProductId: 'STK020',
    erpProductName: 'Elektronik Kart Paketi',
    erpSku: 'ELK-020',
    erpWeight: 1.2,
    erpWidth: 20,
    erpHeight: 10,
    erpLength: 30,
    erpCategory: 'ELEKTRONIK',
    erpBarcode: '8693456780001',
  },
  {
    id: 'mock-21',
    erpProductId: 'STK021',
    erpProductName: 'Alüminyum Profil Kutusu',
    erpSku: 'ALM-021',
    erpWeight: 28,
    erpWidth: 180,
    erpHeight: 15,
    erpLength: 20,
    erpCategory: 'METAL',
    erpBarcode: '8691122334456',
  },
  {
    id: 'mock-22',
    erpProductId: 'STK022',
    erpProductName: 'Deterjan Koli',
    erpSku: 'DTR-022',
    erpWeight: 16,
    erpWidth: 55,
    erpHeight: 40,
    erpLength: 45,
    erpCategory: 'KIMYASAL',
    erpBarcode: '8695544332210',
  },
  {
    id: 'mock-23',
    erpProductId: 'STK023',
    erpProductName: 'Spor Malzeme Çantası',
    erpSku: 'SPR-023',
    erpWeight: 4.5,
    erpWidth: 60,
    erpHeight: 35,
    erpLength: 30,
    erpCategory: 'TEKSTIL',
    erpBarcode: '8698877665544',
  },
  {
    id: 'mock-24',
    erpProductId: 'STK024',
    erpProductName: 'Ahşap Palet',
    erpSku: 'PLT-024',
    erpWeight: 20,
    erpWidth: 120,
    erpHeight: 14,
    erpLength: 80,
    erpCategory: 'AHSAP',
    erpBarcode: '8692233445566',
  },
  {
    id: 'mock-25',
    erpProductId: 'STK025',
    erpProductName: 'Soğuk Zincir Köpük Kutu',
    erpSku: 'SGK-025',
    erpWeight: 3,
    erpWidth: 40,
    erpHeight: 30,
    erpLength: 50,
    erpCategory: 'GIDA',
    erpBarcode: '8697766554433',
  },
];

// ─── ERP → BulkImportDialog row dönüşümü (cm → mm) ──────────────────────────

function erpItemToImportRow(item: ErpPendingMappingItem): EditableRow {
  return {
    _id: crypto.randomUUID(),
    name: item.erpProductName,
    sku: item.erpSku ?? '',
    tip: 'koli',
    width: item.erpWidth != null ? String(item.erpWidth) : '',
    height: item.erpHeight != null ? String(item.erpHeight) : '',
    length: item.erpLength != null ? String(item.erpLength) : '',
    weight: item.erpWeight != null ? String(item.erpWeight) : '',
    fragility: '0',
    isStackable: false,
    maxStackCount: '1',
    allowRotateX: true,
    allowRotateY: true,
    allowRotateZ: true,
    notes: '',
  };
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

const SKELETON_COLS = 9;

function ERPItemsTableSkeleton() {
  return (
    <Table className="min-w-[1100px] table-fixed">
      <TableHeader>
        <TableRow className="h-9 bg-muted/40 hover:bg-muted/40">
          {Array.from({ length: SKELETON_COLS }).map((_, i) => (
            <TableHead key={i}>
              <Skeleton className="h-3 w-16" />
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {Array.from({ length: 6 }).map((_, i) => (
          <TableRow key={i} className="h-12 hover:bg-transparent">
            {Array.from({ length: SKELETON_COLS }).map((_, j) => (
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

// ─── ERPItemsTable ─────────────────────────────────────────────────────────────

export function ERPItemsTable() {
  const { data: connection } = useERPConnection();
  const integrationId = connection?.id;

  const tableCardRef = useRef<HTMLDivElement>(null);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(() =>
    Math.max(5, Math.floor((window.innerHeight - 400) / ROW_H)),
  );
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [importOpen, setImportOpen] = useState(false);
  const [importRows, setImportRows] = useState<EditableRow[]>([]);

  useEffect(() => {
    let last = pageSize;
    const calculate = () => {
      if (!tableCardRef.current) return;
      const top = tableCardRef.current.getBoundingClientRect().top;
      const available = window.innerHeight - top - BELOW_TABLE_H - HEADER_ROW_H;
      const next = Math.max(5, Math.floor(available / ROW_H));
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
  }, []);

  const isSearching = searchTerm.trim().length > 0;
  const queryPage = isSearching ? 1 : page;
  const queryPageSize = isSearching ? 100 : pageSize;

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

  const useMock = !integrationId;
  const allItems = useMock ? MOCK_ITEMS : (mappingsPage?.items ?? []);

  const filteredItems = allItems.filter((item) => {
    if (!isSearching) return true;
    const q = searchTerm.toLowerCase();
    return (
      item.erpProductName.toLowerCase().includes(q) ||
      (item.erpSku ?? '').toLowerCase().includes(q) ||
      item.erpProductId.toLowerCase().includes(q) ||
      (item.erpBarcode ?? '').toLowerCase().includes(q)
    );
  });

  const totalCount = useMock || isSearching ? filteredItems.length : (mappingsPage?.totalCount ?? 0);
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const displayedItems =
    isSearching || useMock
      ? filteredItems.slice((page - 1) * pageSize, page * pageSize)
      : filteredItems;

  const showSkeleton = !useMock && (isLoading || isFetching);
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

  function handleSync() {
    if (!integrationId) return;
    triggerSync({ integrationId });
  }

  function handleOpenImport() {
    const selected = displayedItems.filter((item) => selectedIds.has(item.id));
    setImportRows(selected.map(erpItemToImportRow));
    setImportOpen(true);
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <SearchInput onSearch={handleSearch} placeholder="Ürün adı, SKU, ERP ID veya barkod ile ara..." />

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
          onClick={handleOpenImport}
          disabled={selectedIds.size === 0}
        >
          <Upload className="h-3.5 w-3.5" strokeWidth={2.5} />
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

      {/* Table */}
      <div ref={tableCardRef} className="overflow-x-auto overflow-hidden rounded-2xl border border-border bg-background">
        {showSkeleton ? (
          <ERPItemsTableSkeleton />
        ) : (
          <Table className="min-w-[1100px] table-fixed">
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
                  Ürün Adı
                </TableHead>
                <TableHead className="w-28 whitespace-nowrap py-0 px-3 text-[10px] font-semibold uppercase tracking-widest">
                  Kategori
                </TableHead>
                <TableHead className="w-24 whitespace-nowrap py-0 px-3 text-[10px] font-semibold uppercase tracking-widest">
                  SKU
                </TableHead>
                <TableHead className="w-32 whitespace-nowrap py-0 px-3 text-[10px] font-semibold uppercase tracking-widest">
                  Barkod
                </TableHead>
                <TableHead className="w-24 whitespace-nowrap py-0 px-3 text-[10px] font-semibold uppercase tracking-widest">
                  Uzunluk
                </TableHead>
                <TableHead className="w-24 whitespace-nowrap py-0 px-3 text-[10px] font-semibold uppercase tracking-widest">
                  Yükseklik
                </TableHead>
                <TableHead className="w-24 whitespace-nowrap py-0 px-3 text-[10px] font-semibold uppercase tracking-widest">
                  Derinlik
                </TableHead>
                <TableHead className="w-24 whitespace-nowrap py-0 px-3 text-[10px] font-semibold uppercase tracking-widest">
                  Ağırlık
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isEmpty && (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={9} className="py-16 text-center text-sm text-muted-foreground">
                    {!integrationId ? 'ERP bağlantısı yapılandırılmamış.' : 'Bekleyen ERP ürünü yok.'}
                  </TableCell>
                </TableRow>
              )}
              {displayedItems.map((row) => (
                <TableRow key={row.id} className="h-12">
                  <TableCell className="py-0 px-3">
                    <Checkbox
                      checked={selectedIds.has(row.id)}
                      onCheckedChange={(checked) => handleSelectRow(row.id, Boolean(checked))}
                      aria-label={`${row.erpProductName} satırını seç`}
                    />
                  </TableCell>
                  <TableCell className="py-0 px-3 text-sm">
                    {row.erpProductName}
                  </TableCell>
                  <TableCell className="py-0 px-3 text-xs text-muted-foreground">
                    {row.erpCategory ?? '—'}
                  </TableCell>
                  <TableCell className="py-0 px-3 font-mono text-xs text-muted-foreground">
                    {row.erpSku ?? row.erpProductId}
                  </TableCell>
                  <TableCell className="py-0 px-3 font-mono text-xs text-muted-foreground">
                    {row.erpBarcode ?? '—'}
                  </TableCell>
                  <TableCell className="py-0 px-3 text-xs tabular-nums">
                    {row.erpWidth ?? '—'}
                  </TableCell>
                  <TableCell className="py-0 px-3 text-xs tabular-nums">
                    {row.erpHeight ?? '—'}
                  </TableCell>
                  <TableCell className="py-0 px-3 text-xs tabular-nums">
                    {row.erpLength ?? '—'}
                  </TableCell>
                  <TableCell className="py-0 px-3 text-xs tabular-nums">
                    {row.erpWeight ?? '—'}
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

      {/* Transfer modal */}
      <BulkImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        initialRows={importRows}
      />
    </div>
  );
}
