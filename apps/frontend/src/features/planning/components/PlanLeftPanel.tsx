import { useState, type ElementType } from 'react';
import {
  AlertTriangle,
  ArrowDownToLine,
  ChevronRight,
  Flame,
  FlipHorizontal,
  FolderPlus,
  GripVertical,
  Layers,
  Plus,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────

interface DisplayItem {
  id: string;
  ad: string;
  adet: number;
  agirlik: number;
  boyut: string;
  dotClass: string;
  kisitlar: string[];
}

interface DisplayGroup {
  id: string;
  ad: string;
  acik: boolean;
  itemIdler: string[];
}

// ─── Mock data (API entegrasyonu ayrı task) ───────────────────────────────────

const MOCK_ITEMS: DisplayItem[] = [
  { id: 'U1', ad: 'Elektronik Aksam',   adet: 18, agirlik: 180, boyut: '80×60×40 cm',  dotClass: 'bg-indigo-500', kisitlar: ['fragile']      },
  { id: 'U2', ad: 'Tekstil Paketleri',  adet: 24, agirlik: 80,  boyut: '60×40×30 cm',  dotClass: 'bg-sky-500',    kisitlar: []               },
  { id: 'U3', ad: 'Plastik Bileşenler', adet: 12, agirlik: 240, boyut: '100×80×60 cm', dotClass: 'bg-amber-500',  kisitlar: ['heavy_side']   },
  { id: 'U4', ad: 'Metal Profiller',    adet: 8,  agirlik: 550, boyut: '200×10×10 cm', dotClass: 'bg-rose-500',   kisitlar: ['bottom_only']  },
  { id: 'U5', ad: 'Kimyasal Variller',  adet: 6,  agirlik: 900, boyut: '60×60×90 cm',  dotClass: 'bg-violet-500', kisitlar: ['hazmat']       },
  { id: 'U6', ad: 'Ahşap Kasalar',      adet: 15, agirlik: 120, boyut: '80×80×60 cm',  dotClass: 'bg-orange-400', kisitlar: []               },
];

const INITIAL_GROUPS: DisplayGroup[] = [
  { id: 'G1', ad: 'Grup A', acik: true,  itemIdler: ['U1', 'U2'] },
  { id: 'G2', ad: 'Grup B', acik: false, itemIdler: ['U4', 'U5'] },
];

const UNGROUPED_IDS = ['U3', 'U6'];

// ─── Constraint metadata ──────────────────────────────────────────────────────

const KISIT_META: Record<string, { icon: ElementType; label: string }> = {
  fragile:     { icon: AlertTriangle,   label: 'Kırılgan'        },
  heavy_side:  { icon: FlipHorizontal,  label: 'Yan Yükleme'     },
  bottom_only: { icon: ArrowDownToLine, label: 'Alt Katman'       },
  hazmat:      { icon: Flame,           label: 'Tehlikeli Mad.'   },
};

// ─── ItemRow ──────────────────────────────────────────────────────────────────

function ItemRow({ item, indent = false }: { item: DisplayItem; indent?: boolean }) {
  return (
    <div
      className={cn(
        'flex items-start gap-2 px-2 py-2 rounded-lg hover:bg-zinc-50 transition-colors group/item',
        indent && 'ml-5',
      )}
    >
      <GripVertical className="w-3.5 h-3.5 text-zinc-300 group-hover/item:text-zinc-400 shrink-0 cursor-grab mt-0.5" />
      <div className={cn('w-2.5 h-2.5 rounded shrink-0 mt-1', item.dotClass)} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-0.5">
          <span className="text-sm text-zinc-700 truncate">{item.ad}</span>
          <span className="text-xs text-zinc-400 shrink-0">{item.adet} adet</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-zinc-400">
          <span>{item.boyut}</span>
          <span>·</span>
          <span>{item.agirlik} kg</span>
        </div>
        {item.kisitlar.length > 0 && (
          <div className="flex items-center gap-1.5 mt-1.5">
            {item.kisitlar.map((k) => {
              const meta = KISIT_META[k];
              if (!meta) return null;
              const Icon = meta.icon;
              return (
                <span
                  key={k}
                  title={meta.label}
                  className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-500 text-[10px]"
                >
                  <Icon className="w-2.5 h-2.5" />
                  {meta.label}
                </span>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── PlanLeftPanel ────────────────────────────────────────────────────────────

export function PlanLeftPanel() {
  const [groups, setGroups] = useState<DisplayGroup[]>(INITIAL_GROUPS);

  const getItem = (id: string) => MOCK_ITEMS.find((u) => u.id === id)!;

  const toggleGroup = (id: string) =>
    setGroups((prev) => prev.map((g) => (g.id === id ? { ...g, acik: !g.acik } : g)));

  return (
    <div className="h-full bg-white border border-zinc-200 rounded-xl flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 flex items-center justify-between shrink-0 border-b border-zinc-100">
        <span className="text-sm text-zinc-800">Ürünler</span>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            title="Grup Oluştur"
            className="h-7 w-7 text-zinc-500 hover:text-zinc-800 hover:bg-zinc-100"
          >
            <FolderPlus className="w-3.5 h-3.5" />
          </Button>
          <Button
            size="icon"
            title="Ürün Ekle"
            className="h-7 w-7 bg-zinc-900 text-white hover:bg-zinc-700"
          >
            <Plus className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2">
        {/* Groups */}
        {groups.map((g) => {
          const groupTotal = g.itemIdler.reduce((s, id) => s + getItem(id).adet, 0);
          return (
            <div key={g.id} className="flex flex-col gap-0.5">
              <button
                onClick={() => toggleGroup(g.id)}
                className="w-full flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-zinc-50 transition-colors"
              >
                <ChevronRight
                  className={cn(
                    'w-3.5 h-3.5 text-zinc-400 transition-transform duration-150',
                    g.acik && 'rotate-90',
                  )}
                />
                <Layers className="w-4 h-4 text-zinc-400" strokeWidth={2} />
                <span className="text-sm text-zinc-700 flex-1 text-left">{g.ad}</span>
                <span className="text-xs text-zinc-400">{groupTotal} kalem</span>
              </button>

              {g.acik &&
                g.itemIdler.map((id) => (
                  <ItemRow key={id} item={getItem(id)} indent />
                ))}
            </div>
          );
        })}

        {/* Ungrouped */}
        {UNGROUPED_IDS.length > 0 && (
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-2 px-2 py-2">
              <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wide">
                Grupsuz
              </span>
            </div>
            {UNGROUPED_IDS.map((id) => (
              <ItemRow key={id} item={getItem(id)} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
