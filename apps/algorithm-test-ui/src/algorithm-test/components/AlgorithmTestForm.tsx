import { useEffect, useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { useVehicles } from '@/lib/api/useVehicles';
import { useItems } from '@/lib/api/useItems';
import { OptimizationCriteria } from '@/lib/types/loadingPlan';
import { formatDoorSummary, hasReferenceDoor } from '@/lib/types/vehicle';
import {
  algorithmTestRequestSchema,
  MAX_TOTAL_BOX_COUNT,
  type AlgorithmTestRequest,
} from '../schemas/algorithmTestRequestSchema';
import { CRITERIA_LABEL, CRITERIA_ORDER } from '../hooks/useCriteriaMatrixRun';
import { describeItemConstraints } from '../utils/itemConstraints';
import type { RunContext } from '../verification/types';
import type { Item } from '@/lib/types/item';
import {
  loadScenarioFromStorage,
  saveScenarioToStorage,
  type Scenario,
} from '../utils/scenarioIo';

interface AlgorithmTestFormValues {
  vehicleId: string;
  optimizationCriteria: OptimizationCriteria;
  clusterGroups: boolean;
}

interface AlgorithmTestFormProps {
  isBusy: boolean;
  onRunSingle: (request: AlgorithmTestRequest, context: RunContext) => void;
  onRunMatrix: (request: AlgorithmTestRequest, context: RunContext) => void;
  /**
   * Toplu koşudan gelen senaryo. Her aktarımda yeni bir nesne verilir; kimlik
   * değişimi aynı senaryonun tekrar incelenmesini de tetikler.
   */
  incomingScenario: Scenario | null;
}

/** Ürün başına seçilen grup numarası; 0 = gruba dahil değil. */
const NO_GROUP = 0;
const GROUP_NUMBERS = [1, 2, 3] as const;
const GROUP_COLORS = ['#2563EB', '#DC2626', '#16A34A'];

interface SelectedItem {
  quantity: number;
  groupNumber: number;
}

export function AlgorithmTestForm({
  isBusy,
  onRunSingle,
  onRunMatrix,
  incomingScenario,
}: AlgorithmTestFormProps) {
  const { control, handleSubmit, watch, reset: resetForm } = useForm<AlgorithmTestFormValues>({
    defaultValues: {
      vehicleId: '',
      optimizationCriteria: OptimizationCriteria.VolumeFirst,
      clusterGroups: true,
    },
  });

  const { data: vehiclesPage } = useVehicles({ pageSize: 100 });
  const { data: itemsPage } = useItems({ pageSize: 100 });
  const [selection, setSelection] = useState<Record<string, SelectedItem>>({});
  const [formError, setFormError] = useState<string | null>(null);

  const selectedVehicleId = watch('vehicleId');
  const watchedCriteria = watch('optimizationCriteria');
  const watchedClusterGroups = watch('clusterGroups');
  const vehicles = vehiclesPage?.items ?? [];
  const selectedVehicle = vehicles.find((v) => v.id === selectedVehicleId);

  function applyScenario(scenario: Scenario) {
    resetForm({
      vehicleId: scenario.vehicleId,
      optimizationCriteria: scenario.optimizationCriteria,
      clusterGroups: scenario.clusterGroups,
    });
    setSelection(
      Object.fromEntries(
        scenario.items.map((entry) => [
          entry.itemId,
          { quantity: entry.quantity, groupNumber: entry.groupNumber },
        ]),
      ),
    );
  }

  // Sayfa yenilenince oturum kaybolur ama senaryonun da kaybolması gereksizdi.
  useEffect(() => {
    const stored = loadScenarioFromStorage();
    // Yalnızca ilk yüklemede; sonrasında kullanıcı seçimi kazanır.
    if (stored) applyScenario(stored);
  }, []);

  // Toplu koşudan aktarılan senaryo formu ezer: kullanıcı zaten "bu senaryoyu
  // incele" dedi, mevcut seçimi korumak istemi yok sayardı.
  useEffect(() => {
    if (incomingScenario) applyScenario(incomingScenario);
  }, [incomingScenario]);

  function currentScenario(): Scenario {
    return {
      version: 1,
      vehicleId: selectedVehicleId,
      optimizationCriteria: watchedCriteria,
      clusterGroups: watchedClusterGroups,
      items: Object.entries(selection).map(([itemId, s]) => ({
        itemId,
        quantity: s.quantity,
        groupNumber: s.groupNumber,
      })),
    };
  }

  useEffect(() => {
    saveScenarioToStorage(currentScenario());
  }, [selectedVehicleId, watchedCriteria, watchedClusterGroups, selection]);

  const items = itemsPage?.items ?? [];
  // Katalog sırası korunur: seçim sırasına göre dizmek, aynı senaryoyu iki kez
  // kurduğunda listeyi başka türlü gösteriyordu.
  const selectedItems = items.filter((item) => selection[item.id]);
  const selectableItems = items.filter((item) => !selection[item.id]);

  const totalBoxCount = useMemo(
    () => Object.values(selection).reduce((sum, s) => sum + s.quantity, 0),
    [selection],
  );

  const usedGroupNumbers = useMemo(
    () =>
      [...new Set(Object.values(selection).map((s) => s.groupNumber))]
        .filter((n) => n !== NO_GROUP)
        .sort((a, b) => a - b),
    [selection],
  );

  // LIFO bölgeleri yalnızca referans kapı + en az 2 farklı boşaltılma sırasıyla
  // devreye girer (LifoPlacement.ComputeGroupZones). Yan kapı bölgeleri kapatmaz;
  // belirleyici olan araçta arka kapı bulunup bulunmadığıdır.
  const lifoZonesActive =
    selectedVehicle !== undefined &&
    hasReferenceDoor(selectedVehicle.doors) &&
    usedGroupNumbers.length >= 2;

  function addItem(itemId: string) {
    setSelection((prev) =>
      prev[itemId] ? prev : { ...prev, [itemId]: { quantity: 1, groupNumber: NO_GROUP } },
    );
  }

  function removeItem(itemId: string) {
    setSelection((prev) => {
      const next = { ...prev };
      delete next[itemId];
      return next;
    });
  }

  function updateItem(itemId: string, patch: Partial<SelectedItem>) {
    setSelection((prev) =>
      prev[itemId] ? { ...prev, [itemId]: { ...prev[itemId], ...patch } } : prev,
    );
  }

  function buildRequest(values: AlgorithmTestFormValues): AlgorithmTestRequest | null {
    // Aynı grup numarasını kullanan ürünler tek bir gruba bağlanır; unloadingOrder
    // grup numarasıdır (1 = ilk boşaltılacak = kapıya en yakın).
    const groupIdByNumber = new Map(
      usedGroupNumbers.map((number) => [number, crypto.randomUUID()]),
    );

    const candidate = {
      vehicleId: values.vehicleId,
      optimizationCriteria: values.optimizationCriteria,
      clusterGroups: values.clusterGroups,
      items: Object.entries(selection).map(([itemId, s]) => ({
        itemId,
        quantity: s.quantity,
        groupId: groupIdByNumber.get(s.groupNumber),
      })),
      groups: usedGroupNumbers.map((number, index) => ({
        clientGroupId: groupIdByNumber.get(number) as string,
        name: `Grup ${number}`,
        color: GROUP_COLORS[index % GROUP_COLORS.length],
        unloadingOrder: number,
      })),
    };

    const parsed = algorithmTestRequestSchema.safeParse(candidate);
    if (!parsed.success) {
      setFormError(parsed.error.issues[0]?.message ?? 'Form geçersiz');
      return null;
    }
    setFormError(null);
    return parsed.data;
  }

  /**
   * Denetim bağlamı: istek şeması yalnızca itemId/quantity/groupId taşır, ama
   * kural denetleyicileri kısıt bayraklarına ihtiyaç duyar. Katalogdaki tam
   * `Item` kayıtları bu yüzden ayrıca aktarılır.
   */
  function buildContext(): RunContext {
    const itemsById = new Map<string, Item>();
    const unloadingOrderByItemId = new Map<string, number>();

    for (const item of itemsPage?.items ?? []) {
      const selected = selection[item.id];
      if (!selected) continue;
      itemsById.set(item.id, item);
      // unloadingOrder grup numarasıdır; gruba dahil olmayan ürünün sırası yok.
      if (selected.groupNumber !== NO_GROUP) {
        unloadingOrderByItemId.set(item.id, selected.groupNumber);
      }
    }

    return { itemsById, unloadingOrderByItemId };
  }

  const submitSingle = handleSubmit((values) => {
    const request = buildRequest(values);
    if (request) onRunSingle(request, buildContext());
  });

  const submitMatrix = handleSubmit((values) => {
    const request = buildRequest(values);
    if (request) onRunMatrix(request, buildContext());
  });


  return (
    <form onSubmit={submitSingle} className="flex flex-col gap-4">
      {/* Araç ve ürün açılır kutudan seçilir. Liste hâlindeyken form, koşu
          sonrası büyüyen kural denetimi paneli yüzünden eziliyordu; şimdi
          boyu yalnızca seçilen ürün sayısıyla değişiyor. */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="vehicleId">Araç</Label>
        <Controller
          control={control}
          name="vehicleId"
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger id="vehicleId">
                <SelectValue placeholder="Araç seçin" />
              </SelectTrigger>
              <SelectContent>
                {vehicles.map((vehicle) => (
                  <SelectItem key={vehicle.id} value={vehicle.id}>
                    {vehicle.name}
                    {vehicle.plate ? ` · ${vehicle.plate}` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        {selectedVehicle && (
          <p className="text-xs text-muted-foreground">
            {selectedVehicle.width}×{selectedVehicle.height}×{selectedVehicle.length} cm ·{' '}
            {selectedVehicle.maxCargoWeight} kg ·{' '}
            {formatDoorSummary(selectedVehicle.doors)}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="flex items-baseline justify-between">
          <Label htmlFor="itemPicker">Ürünler</Label>
          <span
            className={cn(
              'font-mono text-xs tabular-nums',
              totalBoxCount > MAX_TOTAL_BOX_COUNT ? 'text-destructive' : 'text-muted-foreground',
            )}
          >
            {totalBoxCount} / {MAX_TOTAL_BOX_COUNT} kutu
          </span>
        </div>

        {/* Seçilen ürün listeden düşer: aynı ürünü iki kez eklemek adet alanının
            işi, ayrı satır açmak değil. */}
        <Select value="" onValueChange={addItem} disabled={selectableItems.length === 0}>
          <SelectTrigger id="itemPicker">
            <SelectValue
              placeholder={selectableItems.length > 0 ? 'Ürün ekle…' : 'Tüm ürünler eklendi'}
            />
          </SelectTrigger>
          <SelectContent>
            {selectableItems.map((item) => (
              <SelectItem key={item.id} value={item.id}>
                {item.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {selectedItems.length > 0 && (
          <div className="rounded-md border">
            {selectedItems.map((item) => {
              const selected = selection[item.id];
              const constraints = describeItemConstraints(item);

              return (
                <div key={item.id} className="flex items-center gap-2 border-b px-3 py-2 last:border-b-0">
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="truncate text-sm">{item.name}</span>
                    {constraints.length > 0 && (
                      <span className="flex flex-wrap gap-1">
                        {constraints.map((c) => (
                          <Badge
                            key={c.label}
                            variant={c.affectsEngine ? 'secondary' : 'outline'}
                            className="px-1.5 py-0 text-[10px] font-normal"
                          >
                            {c.label}
                          </Badge>
                        ))}
                      </span>
                    )}
                  </div>

                  <Input
                    type="number"
                    min={1}
                    aria-label={`${item.name} adedi`}
                    value={selected.quantity}
                    onChange={(e) =>
                      updateItem(item.id, { quantity: Math.max(1, Number(e.target.value)) })
                    }
                    className="w-16"
                  />
                  <Select
                    value={String(selected.groupNumber)}
                    onValueChange={(value) => updateItem(item.id, { groupNumber: Number(value) })}
                  >
                    <SelectTrigger className="w-16" aria-label={`${item.name} grubu`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={String(NO_GROUP)}>—</SelectItem>
                      {GROUP_NUMBERS.map((n) => (
                        <SelectItem key={n} value={String(n)}>
                          G{n}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground"
                    aria-label={`${item.name} ürününü çıkar`}
                    onClick={() => removeItem(item.id)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              );
            })}
          </div>
        )}

        <p className="text-xs text-muted-foreground">
          Grup numarası boşaltılma sırasıdır: G1 ilk boşaltılır, kapıya en yakın yüklenir.
        </p>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>Optimizasyon Kriteri</Label>
        <Controller
          control={control}
          name="optimizationCriteria"
          render={({ field }) => (
            <RadioGroup
              value={String(field.value)}
              onValueChange={(value) => field.onChange(Number(value) as OptimizationCriteria)}
              className="flex flex-row flex-wrap gap-x-4 gap-y-2"
            >
              {CRITERIA_ORDER.map((criteria) => (
                <div key={criteria} className="flex items-center gap-2">
                  <RadioGroupItem value={String(criteria)} id={`criteria-${criteria}`} />
                  <Label htmlFor={`criteria-${criteria}`}>{CRITERIA_LABEL[criteria]}</Label>
                </div>
              ))}
            </RadioGroup>
          )}
        />
      </div>

      <div className="flex items-center gap-2">
        <Controller
          control={control}
          name="clusterGroups"
          render={({ field }) => (
            <Checkbox
              id="clusterGroups"
              checked={field.value}
              onCheckedChange={(v) => field.onChange(v === true)}
            />
          )}
        />
        <Label htmlFor="clusterGroups">Grupları kümele</Label>
      </div>

      {usedGroupNumbers.length > 0 && !lifoZonesActive && (
        <p className="text-xs text-muted-foreground">
          LIFO bölgeleri devre dışı: arka kapılı araç ve en az iki farklı grup gerekir.
        </p>
      )}

      {formError && <p className="text-sm text-destructive">{formError}</p>}

      <div className="grid grid-cols-2 gap-2">
        <Button type="button" disabled={isBusy} onClick={submitMatrix}>
          {isBusy ? 'Çalışıyor...' : 'Matrisi Çalıştır'}
        </Button>
        <Button type="submit" variant="secondary" disabled={isBusy}>
          Tek Kriter
        </Button>
      </div>
    </form>
  );
}
