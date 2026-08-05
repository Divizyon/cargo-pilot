import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Loader2, XCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { useERPConnection, useERPSavedMatches } from '@/lib/api/useERPIntegration';
import { useCreateLoadingPlan } from '@/lib/api/useLoadingPlans';
import { useVehicles } from '@/lib/api/useVehicles';
import { planningDetailRoute } from '@/lib/config/routes';
import { OptimizationCriteria } from '@/lib/types/loadingPlan';
import type { ErpShipmentOrder } from '@/lib/types/erp';
import type { Vehicle } from '@/lib/types/vehicle';

interface Props {
  selectedOrders: ErpShipmentOrder[];
  onClose: () => void;
}

interface AggregatedItem {
  cargoItemId: string;
  erpProductName: string;
  quantity: number;
  totalWeight: number | null;
}

interface UnmatchedItem {
  erpProductId: string;
  erpProductName: string;
  quantity: number;
}

function formatKg(value: number | null): string {
  if (value === null) return '—';
  return `${value.toLocaleString('tr-TR', { maximumFractionDigits: 1 })} kg`;
}

function CapacityWarning({ vehicle, totalWeight }: { vehicle: Vehicle; totalWeight: number }) {
  const exceeded = totalWeight > vehicle.maxCargoWeight;
  const remaining = vehicle.maxCargoWeight - totalWeight;

  if (!exceeded) return null;

  return (
    <Alert variant="destructive">
      <AlertTriangle className="h-4 w-4" />
      <AlertDescription>
        <span className="font-semibold">Araç kapasitesi aşıldı.</span> Seçilen ürünlerin toplam
        ağırlığı ({formatKg(totalWeight)}) bu aracın maksimum yük kapasitesini (
        {formatKg(vehicle.maxCargoWeight)}) aşıyor — fazlalık: {formatKg(Math.abs(remaining))}. Daha
        yüksek kapasiteli bir araç seçin veya ürün miktarını azaltın.
      </AlertDescription>
    </Alert>
  );
}

export function CreatePlanFromOrdersDialog({ selectedOrders, onClose }: Props) {
  const navigate = useNavigate();

  const { data: connection } = useERPConnection();
  const { data: savedMatches = [] } = useERPSavedMatches(connection?.id);
  const { data: vehiclesPage } = useVehicles({ pageSize: 100 });
  const { mutateAsync: createPlan, isPending: isCreating } = useCreateLoadingPlan();

  const [vehicleId, setVehicleId] = useState('');
  const [planName, setPlanName] = useState(() => {
    const date = new Date().toLocaleDateString('tr-TR');
    const orderNums = selectedOrders
      .slice(0, 3)
      .map((o) => o.orderNumber)
      .join(', ');
    return `ERP Sevkiyat — ${orderNums}${selectedOrders.length > 3 ? ` +${selectedOrders.length - 3}` : ''} — ${date}`;
  });

  const matchMap = useMemo(
    () => new Map(savedMatches.map((m) => [m.erpProductId, m.cargoItemId])),
    [savedMatches],
  );

  // Aggregate all items from selected orders
  const { aggregatedItems, unmatchedItems, totalWeight } = useMemo(() => {
    const matchedMap = new Map<
      string,
      { erpProductName: string; quantity: number; totalWeight: number | null }
    >();
    const unmatched: UnmatchedItem[] = [];

    for (const order of selectedOrders) {
      for (const item of order.items) {
        const cargoItemId = matchMap.get(item.erpProductId);
        if (cargoItemId) {
          const existing = matchedMap.get(cargoItemId);
          const itemWeight = item.unitWeight != null ? item.unitWeight * item.quantity : null;
          if (existing) {
            matchedMap.set(cargoItemId, {
              erpProductName: existing.erpProductName,
              quantity: existing.quantity + item.quantity,
              totalWeight:
                existing.totalWeight != null && itemWeight != null
                  ? existing.totalWeight + itemWeight
                  : (existing.totalWeight ?? itemWeight),
            });
          } else {
            matchedMap.set(cargoItemId, {
              erpProductName: item.erpProductName,
              quantity: item.quantity,
              totalWeight: itemWeight,
            });
          }
        } else {
          const existing = unmatched.find((u) => u.erpProductId === item.erpProductId);
          if (existing) {
            existing.quantity += item.quantity;
          } else {
            unmatched.push({
              erpProductId: item.erpProductId,
              erpProductName: item.erpProductName,
              quantity: item.quantity,
            });
          }
        }
      }
    }

    const agg: AggregatedItem[] = [...matchedMap.entries()].map(([id, v]) => ({
      cargoItemId: id,
      ...v,
    }));

    const total = agg.reduce((sum, i) => (i.totalWeight != null ? sum + i.totalWeight : sum), 0);

    return { aggregatedItems: agg, unmatchedItems: unmatched, totalWeight: total };
  }, [selectedOrders, matchMap]);

  const selectedVehicle = vehiclesPage?.items.find((v) => v.id === vehicleId) ?? null;
  const canCreate = aggregatedItems.length > 0 && vehicleId && planName.trim();

  async function handleCreate() {
    if (!canCreate) return;
    const id = await createPlan({
      planName: planName.trim(),
      vehicleId,
      items: aggregatedItems.map((i) => ({ itemId: i.cargoItemId, quantity: i.quantity })),
      optimizationCriteria: OptimizationCriteria.WeightBalance,
    });
    onClose();
    navigate(planningDetailRoute(id));
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Yükleme Planı Oluştur</DialogTitle>
          <p className="text-sm text-muted-foreground">
            {selectedOrders.length} sipariş seçildi · {aggregatedItems.length} eşleştirilmiş kalem
          </p>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 py-1">
          {/* Unmatched items warning */}
          {unmatchedItems.length > 0 && (
            <Alert variant="warning">
              <XCircle className="h-4 w-4" />
              <AlertDescription>
                <span className="font-semibold">Eşleştirilmemiş ürünler.</span>{' '}
                {unmatchedItems.length} ürünün ERP eşleştirmesi bulunamadı ve plana dahil
                edilmeyecek: {unmatchedItems.map((u) => u.erpProductName).join(', ')}.
              </AlertDescription>
            </Alert>
          )}

          {/* Aggregated items table */}
          {aggregatedItems.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ürün</TableHead>
                    <TableHead className="text-right">Adet</TableHead>
                    <TableHead className="text-right">Toplam Ağırlık</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {aggregatedItems.map((item) => (
                    <TableRow key={item.cargoItemId}>
                      <TableCell className="font-medium">{item.erpProductName}</TableCell>
                      <TableCell className="text-right">{item.quantity}</TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {formatKg(item.totalWeight)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="flex items-center justify-end gap-2 border-t px-4 py-2 text-sm text-muted-foreground">
                <span>Tahmini toplam ağırlık:</span>
                <span className="font-medium text-foreground">{formatKg(totalWeight)}</span>
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-dashed py-8 text-center text-sm text-muted-foreground">
              Seçilen siparişlerdeki ürünlerin hiçbiri Cargo Pilot ile eşleştirilmemiş. Önce ERP
              Eşleştirmeleri sekmesinden eşleştirme yapın.
            </div>
          )}

          {/* Plan settings */}
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="plan-name-erp">Plan Adı</Label>
              <Input
                id="plan-name-erp"
                value={planName}
                onChange={(e) => setPlanName(e.target.value)}
                placeholder="Plan adını girin"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Araç Seçimi</Label>
              <Select value={vehicleId} onValueChange={setVehicleId}>
                <SelectTrigger>
                  <SelectValue placeholder="Araç seçin…" />
                </SelectTrigger>
                <SelectContent>
                  {vehiclesPage?.items.map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      <span className="flex items-center gap-2">
                        {v.name}
                        {v.plate && (
                          <Badge variant="outline" className="text-xs">
                            {v.plate}
                          </Badge>
                        )}
                        <span className="text-muted-foreground text-xs">
                          maks. {formatKg(v.maxCargoWeight)}
                        </span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Capacity warning */}
          {selectedVehicle && totalWeight > 0 && (
            <CapacityWarning vehicle={selectedVehicle} totalWeight={totalWeight} />
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            İptal
          </Button>
          <Button disabled={!canCreate || isCreating} onClick={() => void handleCreate()}>
            {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Yükleme Planı Oluştur
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
