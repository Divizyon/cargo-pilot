import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { CalendarDays, ChevronDown, Plus, SlidersHorizontal, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { useDebounce } from '@/lib/hooks/useDebounce';
import { SearchInput } from './SearchInput';
import type { LoadingPlanFiltersHook } from '../hooks/useLoadingPlanFilters';

interface Props {
  filters: LoadingPlanFiltersHook;
  allVehicleNames: string[];
}

export function LoadingPlanFilterBar({ filters, allVehicleNames }: Props) {
  const navigate = useNavigate();
  const {
    search,
    plate,
    vehicleNames,
    dateFrom,
    dateTo,
    hasActiveFilters,
    setSearch,
    setPlate,
    setVehicleNames,
    setDateFrom,
    setDateTo,
    clearFilters,
  } = filters;

  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [localPlate, setLocalPlate] = useState(plate);
  const [prevPlateProp, setPrevPlateProp] = useState(plate);
  const debouncedPlate = useDebounce(localPlate, 350);
  const filterRef = useRef<HTMLDivElement>(null);
  const setPlateRef = useRef(setPlate);
  useLayoutEffect(() => {
    setPlateRef.current = setPlate;
  });

  if (plate !== prevPlateProp) {
    setPrevPlateProp(plate);
    setLocalPlate(plate);
  }

  useEffect(() => {
    setPlateRef.current(debouncedPlate);
  }, [debouncedPlate]);

  useEffect(() => {
    if (!showFilterPanel) return;
    function handler(e: MouseEvent) {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setShowFilterPanel(false);
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showFilterPanel]);

  function toggleVehicleName(name: string) {
    if (vehicleNames.includes(name)) {
      setVehicleNames(vehicleNames.filter((n) => n !== name));
    } else {
      setVehicleNames([...vehicleNames, name]);
    }
  }

  const filterPanelActiveCount =
    (localPlate.length >= 2 ? 1 : 0) +
    (vehicleNames.length > 0 ? 1 : 0) +
    (dateFrom || dateTo ? 1 : 0);

  return (
    <div className="sticky top-0 z-10 bg-page-background pb-3 pt-1">
      <div className="flex flex-wrap items-center gap-2">
        {/* Arama (AC2: minimum 2 karakter tetikler) */}
        <div className="min-w-[260px] flex-1">
          <SearchInput
            onSearch={setSearch}
            placeholder="Plan adı, araç plakası veya araç adı ile ara..."
            initialValue={search}
          />
        </div>

        {/* Filtre paneli (AC3: plaka, araç adı, plan tarihi) */}
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
                {/* Araç Plakası (AC3) */}
                <div>
                  <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                    Araç Plakası
                  </p>
                  <Input
                    value={localPlate}
                    onChange={(e) => setLocalPlate(e.target.value)}
                    placeholder="Plaka ile ara..."
                    className="h-8 text-xs"
                  />
                </div>

                {/* Araç Adı çoklu seçim (AC3) */}
                {allVehicleNames.length > 0 && (
                  <div>
                    <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                      Araç Adı
                    </p>
                    <div className="max-h-40 space-y-1.5 overflow-y-auto">
                      {allVehicleNames.map((name) => (
                        <label
                          key={name}
                          className="flex cursor-pointer items-center gap-2 rounded-md px-1 py-0.5 hover:bg-muted"
                        >
                          <Checkbox
                            checked={vehicleNames.includes(name)}
                            onCheckedChange={() => toggleVehicleName(name)}
                          />
                          <span className="text-xs">{name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {/* Plan Tarihi tarih aralığı (AC3) */}
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
                      setLocalPlate('');
                      setVehicleNames([]);
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

        {/* Filtreleri Temizle — en az bir filtre aktifken görünür (AC4) */}
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            className="shrink-0 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
            onClick={() => {
              setLocalPlate('');
              clearFilters();
            }}
          >
            <X className="h-3.5 w-3.5" />
            Filtreleri Temizle
          </Button>
        )}

        <div className="ml-auto flex shrink-0 items-center gap-2">
          <Button size="sm" className="gap-1.5 text-xs" onClick={() => navigate('/planning/new')}>
            <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
            Yeni Plan Oluştur
          </Button>
        </div>
      </div>
    </div>
  );
}
