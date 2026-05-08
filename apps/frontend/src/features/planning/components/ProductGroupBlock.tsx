import { useMemo, useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { PlanProductGroup } from '@/lib/types/loadingPlan';
import { ProductRow } from './ProductRow';

const PAGE_SIZE = 20;

interface ProductGroupBlockProps {
  group: PlanProductGroup;
  defaultOpen?: boolean;
}

export function ProductGroupBlock({ group, defaultOpen = true }: ProductGroupBlockProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const totalQuantity = useMemo(
    () => group.products.reduce((sum, p) => sum + p.quantity, 0),
    [group.products],
  );

  const visibleProducts = group.products.slice(0, visibleCount);
  const hasMore = visibleCount < group.products.length;

  function handleShowMore() {
    setVisibleCount((prev) => prev + PAGE_SIZE);
  }

  return (
    <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
      {/* Group header */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-zinc-50 transition-colors text-left"
      >
        {/* Collapse chevron */}
        {isOpen ? (
          <ChevronDown className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
        ) : (
          <ChevronRight className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
        )}

        {/* Color badge */}
        <span
          className="w-2.5 h-2.5 rounded-full shrink-0"
          style={{ backgroundColor: group.color }}
        />

        {/* Group name */}
        <span className="text-sm font-medium text-zinc-800 flex-1 truncate">{group.name}</span>

        {/* Group ID */}
        <span className="text-[10px] text-zinc-400 font-mono shrink-0">{group.id}</span>

        {/* Total quantity — rightmost */}
        <span
          className={cn(
            'ml-2 inline-flex items-center justify-center rounded-full px-2 py-0.5',
            'text-[10px] font-medium text-white shrink-0',
          )}
          style={{ backgroundColor: group.color }}
        >
          {totalQuantity} adet
        </span>
      </button>

      {/* Column header */}
      {isOpen && (
        <>
          <div className="flex items-center gap-3 px-3 py-1.5 border-t border-zinc-100 bg-zinc-50">
            <span className="flex-1 text-[10px] text-zinc-400">Ürün Adı</span>
            <span className="text-[10px] text-zinc-400 w-10 text-right shrink-0">Adet</span>
            <span className="text-[10px] text-zinc-400 w-16 text-right shrink-0">Birim Ağırlık</span>
            <span className="text-[10px] text-zinc-400 w-10 shrink-0">Katman</span>
            <span className="text-[10px] text-zinc-400 shrink-0">Kısıtlar</span>
          </div>

          <div className="divide-y divide-zinc-50">
            {visibleProducts.map((product) => (
              <ProductRow key={product.id} product={product} />
            ))}
          </div>

          {hasMore && (
            <div className="px-3 py-2 border-t border-zinc-100">
              <Button
                variant="ghost"
                size="sm"
                className="w-full h-7 text-xs text-zinc-500 hover:text-zinc-800"
                onClick={(e) => {
                  e.stopPropagation();
                  handleShowMore();
                }}
              >
                Daha fazla göster ({group.products.length - visibleCount} ürün daha)
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
