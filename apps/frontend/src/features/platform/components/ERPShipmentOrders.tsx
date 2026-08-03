import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { tr } from 'date-fns/locale';
import { MapPin, Package, ChevronDown, Truck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { useERPConnection, useERPShipmentOrders } from '@/lib/api/useERPIntegration';
import {
  ErpShipmentStatus,
  type ErpShipmentOrder,
  type ErpShipmentOrderFilters,
} from '@/lib/types/erp';
import { CreatePlanFromOrdersDialog } from './CreatePlanFromOrdersDialog';

const STATUS_LABELS: Record<string, string> = {
  [ErpShipmentStatus.Pending]: 'Bekleyen',
  [ErpShipmentStatus.Imported]: 'Aktarıldı',
  [ErpShipmentStatus.Cancelled]: 'İptal',
};

type BadgeVariant = 'default' | 'secondary' | 'outline' | 'destructive';

const STATUS_VARIANTS: Record<string, BadgeVariant> = {
  [ErpShipmentStatus.Pending]: 'default',
  [ErpShipmentStatus.Imported]: 'secondary',
  [ErpShipmentStatus.Cancelled]: 'destructive',
};

function formatDate(iso: string | null | undefined) {
  if (!iso) return '—';
  return format(parseISO(iso), 'dd.MM.yyyy HH:mm', { locale: tr });
}

interface ItemsDialogProps {
  order: ErpShipmentOrder;
  onClose: () => void;
}

function ShipmentItemsDialog({ order, onClose }: ItemsDialogProps) {
  return (
    <Dialog
      open
      onOpenChange={(v) => {
        if (!v) onClose();
      }}
    >
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Sipariş {order.orderNumber} — Ürün Kalemleri</DialogTitle>
          <p className="text-sm text-muted-foreground">{order.customerName}</p>
        </DialogHeader>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Ürün</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead className="text-right">Adet</TableHead>
              <TableHead className="text-right">Birim Ağırlık (kg)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {order.items.map((item) => (
              <TableRow key={item.erpProductId}>
                <TableCell className="font-medium">{item.erpProductName}</TableCell>
                <TableCell className="text-muted-foreground">{item.erpSku ?? '—'}</TableCell>
                <TableCell className="text-right">{item.quantity}</TableCell>
                <TableCell className="text-right">
                  {item.unitWeight != null ? item.unitWeight : '—'}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </DialogContent>
    </Dialog>
  );
}

export function ERPShipmentOrders() {
  const [filters, setFilters] = useState<ErpShipmentOrderFilters>({ status: null });
  const [detailOrder, setDetailOrder] = useState<ErpShipmentOrder | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  const { data: connection } = useERPConnection();
  const { data: orders, isLoading } = useERPShipmentOrders(connection?.id, filters);

  const filterValue = filters.status ?? 'all';
  const pendingOrders = orders?.filter((o) => o.status === ErpShipmentStatus.Pending) ?? [];
  const selectedOrders = pendingOrders.filter((o) => selectedIds.has(o.id));
  const allPendingSelected =
    pendingOrders.length > 0 && pendingOrders.every((o) => selectedIds.has(o.id));

  function handleStatusFilter(value: string) {
    setSelectedIds(new Set());
    setFilters({
      status:
        value === 'all'
          ? null
          : (value as (typeof ErpShipmentStatus)[keyof typeof ErpShipmentStatus]),
    });
  }

  function toggleOrder(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (allPendingSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(pendingOrders.map((o) => o.id)));
    }
  }

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold">Bekleyen Sevkiyatlar</h2>
            <p className="text-sm text-muted-foreground">
              ERP'de onaylanan sevkiyat emirleri senkronizasyon sonrası burada listelenir.
            </p>
          </div>
          <Select value={filterValue} onValueChange={handleStatusFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Tüm statüler" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tüm statüler</SelectItem>
              <SelectItem value={ErpShipmentStatus.Pending}>Bekleyen</SelectItem>
              <SelectItem value={ErpShipmentStatus.Imported}>Aktarıldı</SelectItem>
              <SelectItem value={ErpShipmentStatus.Cancelled}>İptal</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <ShipmentSkeleton />
        ) : !orders || orders.length === 0 ? (
          <div className="rounded-lg border border-dashed py-12 text-center">
            <Package className="mx-auto mb-3 h-8 w-8 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">
              {filterValue === 'all'
                ? 'Henüz aktarılmış sevkiyat emri yok.'
                : `"${STATUS_LABELS[filterValue] ?? filterValue}" statüsünde kayıt bulunamadı.`}
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  {pendingOrders.length > 0 && (
                    <Checkbox
                      checked={allPendingSelected}
                      onCheckedChange={toggleAll}
                      aria-label="Tüm bekleyen siparişleri seç"
                    />
                  )}
                </TableHead>
                <TableHead>Sipariş No</TableHead>
                <TableHead>Müşteri</TableHead>
                <TableHead>Teslimat Adresi</TableHead>
                <TableHead>ERP Tarihi</TableHead>
                <TableHead>Statü</TableHead>
                <TableHead className="text-right">Kalemler</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((order) => {
                const isPending = order.status === ErpShipmentStatus.Pending;
                const isSelected = selectedIds.has(order.id);
                return (
                  <TableRow key={order.id} data-state={isSelected ? 'selected' : undefined}>
                    <TableCell>
                      {isPending && (
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleOrder(order.id)}
                          aria-label={`Sipariş ${order.orderNumber} seç`}
                        />
                      )}
                    </TableCell>
                    <TableCell className="font-mono font-medium">{order.orderNumber}</TableCell>
                    <TableCell>{order.customerName}</TableCell>
                    <TableCell>
                      {order.deliveryAddress ? (
                        <span className="flex items-start gap-1 text-sm text-muted-foreground">
                          <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                          {order.deliveryAddress}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {formatDate(order.erpCreatedAt)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANTS[order.status]}>
                        {STATUS_LABELS[order.status] ?? order.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setDetailOrder(order)}
                        className="gap-1.5"
                      >
                        {order.items.length} kalem
                        <ChevronDown className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}

        {/* Selection action bar */}
        {selectedIds.size > 0 && (
          <div className="sticky bottom-0 flex items-center justify-between gap-3 rounded-lg border bg-background px-4 py-3 shadow-md">
            <span className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{selectedIds.size}</span> sipariş
              seçildi
            </span>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setSelectedIds(new Set())}>
                Seçimi Temizle
              </Button>
              <Button size="sm" onClick={() => setCreateDialogOpen(true)} className="gap-2">
                <Truck className="h-4 w-4" />
                Yükleme Planı Oluştur
              </Button>
            </div>
          </div>
        )}
      </div>

      {detailOrder && (
        <ShipmentItemsDialog order={detailOrder} onClose={() => setDetailOrder(null)} />
      )}

      {createDialogOpen && selectedOrders.length > 0 && (
        <CreatePlanFromOrdersDialog
          selectedOrders={selectedOrders}
          onClose={() => {
            setCreateDialogOpen(false);
            setSelectedIds(new Set());
          }}
        />
      )}
    </>
  );
}

function ShipmentSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} className="h-12 w-full" />
      ))}
    </div>
  );
}
