import { useEffect, useRef, useState } from 'react';
import { CalendarDays, ChevronDown, Plus, SlidersHorizontal } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SearchInput } from './SearchInput';
import type { LoadingPlanFiltersHook } from '../hooks/useLoadingPlanFilters';

const STATUS_TABS = [
  { value: 'all', label: 'Tümü' },
  { value: 'taslak', label: 'Taslak' },
  { value: 'aktif', label: 'Aktif' },
  { value: 'tamamlandi', label: 'Tamamlandı' },
];

interface Props {
  filters: LoadingPlanFiltersHook;
}

export function LoadingPlanFilterBar({ filters }: Props) {
  const navigate = useNavigate();
  const {
    search,
    statusTab,
    dateFrom,
    dateTo,
    setSearch,
    setStatusTab,
    setDateFrom,
    setDateTo,
  } = filters;

  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);

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

  const filterPanelActiveCount = dateFrom || dateTo ? 1 : 0;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Durum sekmeleri */}
      <div className="flex shrink-0 items-center gap-1 rounded-lg border border-border bg-background p-1">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setStatusTab(tab.value)}
            className={cn(
              'rounded-md px-3 py-1 text-xs font-medium transition-colors',
              statusTab === tab.value
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-accent hover:text-foreground',
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Arama */}
      <SearchInput
        onSearch={setSearch}
        placeholder="Plan adı veya araç adı ile ara..."
        initialValue={search}
      />

      {/* Filtrele — tarih aralığı */}
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

      {/* Yeni Plan Oluştur */}
      <Button
        size="sm"
        className="ml-auto shrink-0 gap-1.5 text-xs"
        onClick={() => navigate('/planning/new')}
      >
        <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
        Yeni Plan Oluştur
      </Button>
    </div>
  );
}
