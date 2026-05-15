import { useState } from 'react';
import { Box, ChevronRight, Cylinder, Package, RotateCcw, Trash2 } from 'lucide-react';
import type { ElementType } from 'react';
import { cn } from '@/lib/utils/cn';
import { usePlanStore } from '@/lib/store/usePlanStore';
import { UnfitReason } from '@/lib/types/loadingPlan';
import type { UnfitItem } from '@/lib/types/loadingPlan';

const REASON_LABEL: Record<UnfitReason, string> = {
  [UnfitReason.Volume]: 'Hacim Yetersiz',
  [UnfitReason.Weight]: 'Ağırlık Limiti Aşıldı',
  [UnfitReason.Stacking]: 'İstif Kısıtı İhlali',
};

const REASON_CLASS: Record<UnfitReason, string> = {
  [UnfitReason.Volume]: 'bg-amber-50 text-amber-700 border border-amber-200',
  [UnfitReason.Weight]: 'bg-rose-50 text-rose-700 border border-rose-200',
  [UnfitReason.Stacking]: 'bg-orange-50 text-orange-700 border border-orange-200',
};

const PRODUCT_TYPE_ICON: Record<string, ElementType> = {
  koli: Box,
  varil: Cylinder,
  palet: Package,
};

function UnfitItemRow({
  unfitItem,
  onRetry,
  onRemove,
}: {
  unfitItem: UnfitItem;
  onRetry: () => void;
  onRemove: () => void;
}) {
  const { item, quantity, reason } = unfitItem;
  const TypeIcon = PRODUCT_TYPE_ICON[item.productType] ?? Box;

  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-zinc-50 group/unfit">
      <TypeIcon className="w-4 h-4 shrink-0 text-zinc-400" strokeWidth={1.5} />

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm truncate text-zinc-700">{item.name}</span>
          <span className="text-[10px] shrink-0 tabular-nums text-zinc-400">{quantity} adet</span>
        </div>
        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
          <span
            className={cn('text-[9px] font-medium px-1.5 py-0.5 rounded', REASON_CLASS[reason])}
          >
            {REASON_LABEL[reason]}
          </span>
          <span className="text-[10px] text-zinc-400 tabular-nums">
            {item.width}×{item.length}×{item.height} cm · {item.weight} kg
          </span>
        </div>
      </div>

      <div
        className="flex flex-col items-center gap-0.5 shrink-0 opacity-0 group-hover/unfit:opacity-100 transition-opacity"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          title="Tekrar Dene"
          onClick={onRetry}
          className="w-5 h-5 rounded flex items-center justify-center text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors"
        >
          <RotateCcw className="w-3 h-3" />
        </button>
        <button
          title="Listeden Çıkar"
          onClick={onRemove}
          className="w-5 h-5 rounded flex items-center justify-center text-zinc-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}

export function UnfitItemsPanel() {
  const [open, setOpen] = useState(true);
  const unfitItems = usePlanStore((s) => s.unfitItems);
  const removeUnfitItem = usePlanStore((s) => s.removeUnfitItem);
  const retryUnfitItem = usePlanStore((s) => s.retryUnfitItem);

  if (unfitItems.length === 0) return null;

  const totalQty = unfitItems.reduce((s, u) => s + u.quantity, 0);
  const totalWeight = unfitItems.reduce((s, u) => s + u.item.weight * u.quantity, 0);
  const totalVolumeM3 =
    unfitItems.reduce((s, u) => s + u.item.width * u.item.height * u.item.length * u.quantity, 0) /
    1_000_000;

  return (
    <div className="border-t border-zinc-100 shrink-0">
      <button
        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-zinc-50 transition-colors"
        onClick={() => setOpen((v) => !v)}
      >
        <ChevronRight
          className={cn(
            'w-3.5 h-3.5 text-rose-400 transition-transform duration-150',
            open && 'rotate-90',
          )}
        />
        <span className="text-sm text-zinc-700 flex-1 text-left">Sığmayan Ürünler</span>
        <span className="text-[10px] bg-rose-100 text-rose-600 rounded-full px-1.5 py-0.5 tabular-nums font-medium">
          {totalQty}
        </span>
      </button>

      {open && (
        <div className="flex flex-col">
          <div className="flex items-center gap-2 px-3 py-1 text-[10px] text-zinc-400 tabular-nums border-b border-zinc-50">
            <span>{unfitItems.length} ürün çeşidi</span>
            <span>·</span>
            <span>{totalVolumeM3.toFixed(3)} m³</span>
            <span>·</span>
            <span>{totalWeight.toFixed(1)} kg</span>
          </div>
          <div className="max-h-48 overflow-y-auto p-1 flex flex-col gap-0.5">
            {unfitItems.map((u) => (
              <UnfitItemRow
                key={u.item.id}
                unfitItem={u}
                onRetry={() => retryUnfitItem(u.item.id)}
                onRemove={() => removeUnfitItem(u.item.id)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
