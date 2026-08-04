import { useState } from 'react';
import { Loader2, Link2, Pencil, Trash2, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ERPItemMatchDialog } from './ERPItemMatchDialog';
import {
  useERPConnection,
  useERPPendingMatches,
  useERPSavedMatches,
  useConfirmERPMatch,
  useUpdateERPMatch,
  useDeleteERPMatch,
} from '@/lib/api/useERPIntegration';
import { useItems } from '@/lib/api/useItems';
import type { ErpPendingMatch, ErpSavedMatch } from '@/lib/types/erp';

export function ERPPendingMatches() {
  const { data: connection } = useERPConnection();
  const integrationId = connection?.id;

  const { data: pending, isLoading: isPendingLoading } = useERPPendingMatches(integrationId);
  const { data: saved, isLoading: isSavedLoading } = useERPSavedMatches(integrationId);
  const { data: itemsData, isLoading: isItemsLoading } = useItems({ pageSize: 200 });

  const { mutate: confirm, isPending: isConfirming } = useConfirmERPMatch();
  const { mutate: update, isPending: isUpdating } = useUpdateERPMatch();
  const { mutate: remove, isPending: isDeleting } = useDeleteERPMatch();

  const [matchDialog, setMatchDialog] = useState<{
    mode: 'create' | 'edit';
    erpProduct: ErpPendingMatch | null;
    savedMatch?: ErpSavedMatch;
  } | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [showOnlyMissingConstraints, setShowOnlyMissingConstraints] = useState(false);

  const items = itemsData?.items ?? [];
  const pendingCount = pending?.length ?? 0;
  const missingConstraintCount = pending?.filter((p) => p.hasConstraintData === false).length ?? 0;

  const visiblePending = showOnlyMissingConstraints
    ? (pending ?? []).filter((p) => p.hasConstraintData === false)
    : (pending ?? []);

  function handleConfirmMatch(cargoItemId: string) {
    if (!matchDialog || !integrationId) return;
    if (matchDialog.mode === 'create' && matchDialog.erpProduct) {
      confirm(
        { integrationId, mappingId: matchDialog.erpProduct.id, cargoPilotItemId: cargoItemId },
        { onSuccess: () => setMatchDialog(null) },
      );
    } else if (matchDialog.mode === 'edit' && matchDialog.savedMatch) {
      update(
        { integrationId, mappingId: matchDialog.savedMatch.id, cargoPilotItemId: cargoItemId },
        { onSuccess: () => setMatchDialog(null) },
      );
    }
  }

  function handleDelete() {
    if (!deleteTarget || !integrationId) return;
    remove({ integrationId, mappingId: deleteTarget }, { onSettled: () => setDeleteTarget(null) });
  }

  return (
    <TooltipProvider>
      <>
        <Tabs defaultValue="pending">
          <TabsList>
            <TabsTrigger value="pending" className="gap-2">
              Bekleyenler
              {pendingCount > 0 && (
                <Badge variant="destructive" className="h-5 min-w-5 px-1.5 text-xs">
                  {pendingCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="saved">Kaydedilmiş Eşleştirmeler</TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="mt-4 space-y-3">
            {missingConstraintCount > 0 && (
              <div className="flex items-center gap-2">
                <Checkbox
                  id="filter-missing"
                  checked={showOnlyMissingConstraints}
                  onCheckedChange={(v) => setShowOnlyMissingConstraints(Boolean(v))}
                />
                <Label htmlFor="filter-missing" className="cursor-pointer text-sm">
                  Yalnızca kural atanmamışları göster
                  <Badge variant="outline" className="ml-2 gap-1 text-amber-600 border-amber-300">
                    <AlertTriangle className="h-3 w-3" />
                    {missingConstraintCount}
                  </Badge>
                </Label>
              </div>
            )}

            {isPendingLoading || isItemsLoading ? (
              <PendingMatchesSkeleton />
            ) : visiblePending.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                {showOnlyMissingConstraints
                  ? 'Kural atanmamış ürün yok.'
                  : 'Bekleyen eşleştirme yok.'}
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ERP Ürün Adı</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>Ağırlık (kg)</TableHead>
                    <TableHead>Kural</TableHead>
                    <TableHead className="text-right">İşlem</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visiblePending.map((row) => (
                    <TableRow key={row.erpProductId}>
                      <TableCell className="font-medium">{row.erpProductName}</TableCell>
                      <TableCell className="text-muted-foreground">{row.erpSku ?? '—'}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {row.erpWeight != null ? row.erpWeight : '—'}
                      </TableCell>
                      <TableCell>
                        {row.hasConstraintData === false ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Badge
                                variant="outline"
                                className="gap-1 text-amber-600 border-amber-300 cursor-default"
                              >
                                <AlertTriangle className="h-3 w-3" />
                                Kural Atanmamış
                              </Badge>
                            </TooltipTrigger>
                            <TooltipContent side="top">
                              ERP'den gelen kısıt verisi eksik. Eşleştirme sonrası
                              düzenleyebilirsiniz.
                            </TooltipContent>
                          </Tooltip>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setMatchDialog({ mode: 'create', erpProduct: row })}
                        >
                          <Link2 className="mr-1.5 h-3.5 w-3.5" />
                          Eşleştir
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </TabsContent>

          <TabsContent value="saved" className="mt-4">
            {isSavedLoading ? (
              <PendingMatchesSkeleton />
            ) : !saved || saved.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Kaydedilmiş eşleştirme yok.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ERP Ürünü</TableHead>
                    <TableHead>Cargo Pilot Ürünü</TableHead>
                    <TableHead className="text-right">İşlem</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {saved.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell>
                        <p className="font-medium">{row.erpProductName}</p>
                        <p className="text-xs text-muted-foreground">{row.erpSku ?? ''}</p>
                      </TableCell>
                      <TableCell>
                        <p className="font-medium">{row.cargoItemName}</p>
                        <p className="text-xs text-muted-foreground">{row.cargoItemSku}</p>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() =>
                              setMatchDialog({ mode: 'edit', erpProduct: null, savedMatch: row })
                            }
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setDeleteTarget(row.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </TabsContent>
        </Tabs>

        {matchDialog !== null && (
          <ERPItemMatchDialog
            open
            erpProductName={
              matchDialog.mode === 'create'
                ? (matchDialog.erpProduct?.erpProductName ?? '')
                : (matchDialog.savedMatch?.erpProductName ?? '')
            }
            items={items}
            currentCargoItemId={matchDialog.savedMatch?.cargoItemId}
            onConfirm={handleConfirmMatch}
            onClose={() => setMatchDialog(null)}
            isPending={isConfirming || isUpdating}
          />
        )}

        <AlertDialog
          open={deleteTarget !== null}
          onOpenChange={(v) => {
            if (!v) setDeleteTarget(null);
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Eşleştirmeyi sil</AlertDialogTitle>
              <AlertDialogDescription>
                Bu eşleştirme kalıcı olarak silinecek. Silmek istediğinizden emin misiniz?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting}>İptal</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} disabled={isDeleting}>
                {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Sil
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </>
    </TooltipProvider>
  );
}

function PendingMatchesSkeleton() {
  return (
    <div className="space-y-2 pt-2">
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={i} className="h-10 w-full" />
      ))}
    </div>
  );
}
