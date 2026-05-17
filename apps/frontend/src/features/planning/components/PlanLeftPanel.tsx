import { useState, useRef, useEffect, useMemo, type ElementType } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useVirtualizer } from '@tanstack/react-virtual';
import {
  Box,
  Check,
  CheckCheck,
  ChevronDown,
  ChevronRight,
  Cylinder,
  Droplets,
  Eye,
  EyeOff,
  Flame,
  FlaskConical,
  FolderPlus,
  ArrowDown,
  ArrowUp,
  Layers,
  Leaf,
  Loader2,
  Minus,
  Package,
  PackageMinus,
  PackagePlus,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  SlidersHorizontal,
  Sun,
  Trash2,
  Utensils,
  Wind,
  Wine,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils/cn';
import { usePlanStore } from '@/lib/store/usePlanStore';
import { useSceneStore } from '@/lib/store/useSceneStore';
import { SCENE } from '@/lib/config/scene-config';
import { ROUTES } from '@/lib/config/routes';
import { useItems } from '@/lib/api/useItems';
import {
  useCreateGroup,
  useUpdateGroup,
  useDeleteGroup,
  useAssignItemToGroup,
} from '@/lib/api/useGroups';
import { UnfitItemsPanel } from './UnfitItemsPanel';
import type { Item } from '@/lib/types/item';

const VIRTUAL_THRESHOLD = 100;

// ─── Constraint SVG icons ─────────────────────────────────────────────────────

function NonStackableIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <rect x="3" y="3" width="18" height="15" rx="2" />
      <path d="M9 15 V8" />
      <path d="M6 11 L9 8 L12 11" />
      <path d="M15 15 V8" />
      <path d="M12 11 L15 8 L18 11" />
      <line x1="2" y1="21" x2="22" y2="21" />
    </svg>
  );
}

// X rotation: inward-curving vertical arcs on left and right (sweep-flag 0), derived from AxisBoxIllustration X arrows
function RotateXIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 14 14" fill="none" strokeLinecap="round" className={className} aria-hidden>
      <path d="M2.5 1.5 A 2.5 5 0 0 0 2.5 12.5" stroke="currentColor" strokeWidth="1.4" />
      <polygon points="2.5,13.5 0,11 5,11" fill="currentColor" />
      <path d="M11.5 12.5 A 2.5 5 0 0 0 11.5 1.5" stroke="currentColor" strokeWidth="1.4" />
      <polygon points="11.5,0.5 9,3 14,3" fill="currentColor" />
    </svg>
  );
}

// Y rotation: horizontal arcs on top and bottom, derived from AxisBoxIllustration Y arrows
function RotateYIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 14 14" fill="none" strokeLinecap="round" className={className} aria-hidden>
      <path d="M2 4 A 5 2.5 0 0 1 12 4" stroke="currentColor" strokeWidth="1.4" />
      <polygon points="12,4 9.5,2 9.5,6" fill="currentColor" />
      <path d="M12 10 A 5 2.5 0 0 1 2 10" stroke="currentColor" strokeWidth="1.4" />
      <polygon points="2,10 4.5,8 4.5,12" fill="currentColor" />
    </svg>
  );
}

// Z rotation: outward-curving vertical arcs on right and left (sweep-flag 1), derived from AxisBoxIllustration Z arrows
function RotateZIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 14 14" fill="none" strokeLinecap="round" className={className} aria-hidden>
      <path d="M11.5 1.5 A 2.5 5 0 0 1 11.5 12.5" stroke="currentColor" strokeWidth="1.4" />
      <polygon points="11.5,13.5 9,11 14,11" fill="currentColor" />
      <path d="M2.5 12.5 A 2.5 5 0 0 1 2.5 1.5" stroke="currentColor" strokeWidth="1.4" />
      <polygon points="2.5,0.5 0,3 5,3" fill="currentColor" />
    </svg>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const PRODUCT_TYPE_ICON: Record<string, ElementType> = {
  koli: Box,
  varil: Cylinder,
  palet: Package,
};

const GROUP_ICON_COLORS = [
  '#2DD4BF',
  '#FB923C',
  '#FBBF24',
  '#818CF8',
  '#FB7185',
  '#34D399',
  '#0EA5E9',
  '#A855F7',
  '#64748B',
  '#E11D48',
  '#84CC16',
  '#D97706',
  '#4338CA',
  '#A7F3D0',
  '#334155',
] as const;

type ConstraintFilter =
  | 'fragile'
  | 'liquid'
  | 'corrosive'
  | 'odor'
  | 'food'
  | 'dry'
  | 'chemical'
  | 'organic'
  | 'stackable'
  | 'rotationLocked';

const FRAGILITY_FILTER_VALUE: Partial<Record<ConstraintFilter, number>> = {
  fragile: 1,
  liquid: 2,
  corrosive: 5,
  odor: 6,
  food: 7,
  dry: 8,
  chemical: 9,
  organic: 10,
};

const CONSTRAINT_FILTER_OPTIONS: {
  value: ConstraintFilter;
  label: string;
  Icon: ElementType;
  className: string;
}[] = [
  { value: 'fragile', label: 'Kırılgan', Icon: Wine, className: 'text-amber-600' },
  { value: 'liquid', label: 'Sıvı İçerir', Icon: Droplets, className: 'text-blue-600' },
  { value: 'corrosive', label: 'Aşındırıcı', Icon: Flame, className: 'text-orange-600' },
  { value: 'odor', label: 'Kokuya Hassas', Icon: Wind, className: 'text-green-600' },
  { value: 'food', label: 'Gıda Teması', Icon: Utensils, className: 'text-green-600' },
  { value: 'dry', label: 'Kuru', Icon: Sun, className: 'text-muted-foreground' },
  { value: 'chemical', label: 'Kimyasal', Icon: FlaskConical, className: 'text-purple-600' },
  { value: 'organic', label: 'Organik', Icon: Leaf, className: 'text-green-600' },
  { value: 'stackable', label: 'İstiflenebilir', Icon: Layers, className: 'text-muted-foreground' },
  {
    value: 'rotationLocked',
    label: 'Rotasyon Kısıtlı',
    Icon: RotateCcw,
    className: 'text-muted-foreground',
  },
];

function matchesConstraintFilter(item: Item, filter: ConstraintFilter): boolean {
  const fragilityVal = FRAGILITY_FILTER_VALUE[filter];
  if (fragilityVal !== undefined) return item.fragility === fragilityVal;
  if (filter === 'stackable') return item.isStackable;
  if (filter === 'rotationLocked')
    return !item.allowRotateX || !item.allowRotateY || !item.allowRotateZ;
  return false;
}

function itemMatchesFilters(
  item: Item,
  query: string,
  activeConstraints: ReadonlySet<ConstraintFilter>,
): boolean {
  if (
    query &&
    !item.name.toLowerCase().includes(query.toLowerCase()) &&
    !item.sku.toLowerCase().includes(query.toLowerCase())
  )
    return false;
  if (activeConstraints.size > 0) {
    const matches = [...activeConstraints].some((f) => matchesConstraintFilter(item, f));
    if (!matches) return false;
  }
  return true;
}

interface ConstraintMeta {
  key: string;
  label: string;
  Icon: ElementType;
  colorClass: string;
}

const FRAGILITY_CONSTRAINT: Record<
  number,
  { label: string; Icon: ElementType; colorClass: string }
> = {
  1: { label: 'Kırılgan', Icon: Wine, colorClass: 'text-amber-600' },
  2: { label: 'Sıvı İçerir', Icon: Droplets, colorClass: 'text-blue-600' },
  5: { label: 'Aşındırıcı', Icon: Flame, colorClass: 'text-orange-600' },
  6: { label: 'Kokuya Hassas', Icon: Wind, colorClass: 'text-green-600' },
  7: { label: 'Gıda Teması', Icon: Utensils, colorClass: 'text-green-600' },
  8: { label: 'Kuru', Icon: Sun, colorClass: 'text-muted-foreground' },
  9: { label: 'Kimyasal', Icon: FlaskConical, colorClass: 'text-purple-600' },
  10: { label: 'Organik', Icon: Leaf, colorClass: 'text-green-600' },
};

function getItemConstraints(item: Item): ConstraintMeta[] {
  const list: ConstraintMeta[] = [];

  const fragilityDef = FRAGILITY_CONSTRAINT[item.fragility];
  if (fragilityDef) {
    list.push({ key: `fragility-${item.fragility}`, ...fragilityDef });
  }

  if (!item.isStackable) {
    list.push({
      key: 'nostack',
      label: 'İstiflenemez',
      Icon: NonStackableIcon,
      colorClass: 'text-muted-foreground',
    });
  }

  if (!item.allowRotateX) {
    list.push({
      key: 'noRotX',
      label: 'X ekseni kısıtlı',
      Icon: RotateXIcon,
      colorClass: 'text-muted-foreground',
    });
  }
  if (!item.allowRotateY) {
    list.push({
      key: 'noRotY',
      label: 'Y ekseni kısıtlı',
      Icon: RotateYIcon,
      colorClass: 'text-muted-foreground',
    });
  }
  if (!item.allowRotateZ) {
    list.push({
      key: 'noRotZ',
      label: 'Z ekseni kısıtlı',
      Icon: RotateZIcon,
      colorClass: 'text-muted-foreground',
    });
  }

  if (item.stackGroup?.trim()) {
    list.push({
      key: 'group',
      label: `Yük Grubu: ${item.stackGroup}`,
      Icon: Package,
      colorClass: 'text-muted-foreground',
    });
  }

  return list;
}

// ─── GroupSelectionRow ────────────────────────────────────────────────────────

interface GroupSelectionRowProps {
  item: Item;
  isSelected: boolean;
  onToggle: () => void;
}

function GroupSelectionRow({ item, isSelected, onToggle }: GroupSelectionRowProps) {
  const TypeIcon = PRODUCT_TYPE_ICON[item.productType] ?? Box;
  return (
    <button
      onClick={onToggle}
      className={cn(
        'w-full flex items-center gap-2 px-2.5 py-2 rounded-lg transition-colors text-left',
        isSelected ? 'bg-muted ring-1 ring-border' : 'hover:bg-accent',
      )}
    >
      <div
        className={cn(
          'w-4 h-4 shrink-0 rounded border-2 flex items-center justify-center transition-colors',
          isSelected ? 'bg-foreground border-foreground' : 'border-border',
        )}
      >
        {isSelected && <Check className="w-2.5 h-2.5 text-background" strokeWidth={3} />}
      </div>
      <TypeIcon className="w-3.5 h-3.5 shrink-0 text-muted-foreground" strokeWidth={1.5} />
      <span className="flex-1 min-w-0 text-xs text-foreground truncate">{item.name}</span>
      <span className="text-[10px] text-muted-foreground tabular-nums shrink-0">{item.sku}</span>
    </button>
  );
}

// ─── StoreItemRow ─────────────────────────────────────────────────────────────

interface GroupOption {
  id: string;
  ad: string;
  color: string;
}

interface StoreItemRowProps {
  storeEntry: { item: Item; quantity: number };
  isPlaced: boolean;
  canPlace: boolean;
  isExpanded: boolean;
  indent?: boolean;
  iconColor?: string;
  groups?: GroupOption[];
  onToggleExpand: () => void;
  onPlace: (qty: number) => void;
  onRemove?: () => void;
  onEdit?: () => void;
  onAddToGroup?: (groupId: string) => void;
  onClearStackGroup?: () => void;
  onSelect?: () => void;
  isHidden?: boolean;
  onToggleVisibility?: () => void;
  onRemoveFromGroup?: (action: 'ungroup' | 'remove') => void;
  onUpdateQty?: (qty: number) => void;
}

function StoreItemRow({
  storeEntry,
  isPlaced,
  canPlace,
  isExpanded,
  indent = false,
  iconColor,
  groups,
  onToggleExpand,
  onPlace,
  onRemove,
  onEdit,
  onAddToGroup,
  onClearStackGroup,
  onSelect,
  isHidden = false,
  onToggleVisibility,
  onRemoveFromGroup,
  onUpdateQty,
}: StoreItemRowProps) {
  const { item, quantity } = storeEntry;
  const [localQty, setLocalQty] = useState(quantity);
  const TypeIcon = PRODUCT_TYPE_ICON[item.productType] ?? Box;
  const constraints = getItemConstraints(item);
  const hasConstraints = constraints.length > 0;

  return (
    <div
      className={cn(
        'rounded-lg overflow-hidden',
        indent && 'ml-4',
        isExpanded && 'ring-1 ring-border',
      )}
    >
      <div
        onClick={() => {
          onToggleExpand();
          onSelect?.();
        }}
        className={cn(
          'group/item-row flex items-center gap-1.5 px-2.5 py-1.5 cursor-pointer select-none transition-colors',
          isPlaced ? 'bg-zinc-50/80' : 'hover:bg-zinc-50',
          isExpanded && 'bg-zinc-50',
        )}
      >
        <TypeIcon
          className={cn('w-3.5 h-3.5 shrink-0', !iconColor && 'text-muted-foreground')}
          style={iconColor ? { color: iconColor } : undefined}
          strokeWidth={1.5}
        />
        <span className="flex-1 min-w-0 text-xs text-zinc-800 truncate">{item.name}</span>
        <span className="text-[10px] text-zinc-400 tabular-nums shrink-0">{item.sku}</span>
        {onToggleVisibility !== undefined && (
          <button
            title={isHidden ? 'Göster' : 'Gizle'}
            onClick={(e) => {
              e.stopPropagation();
              onToggleVisibility();
            }}
            className="shrink-0 w-5 h-5 flex items-center justify-center rounded text-zinc-300 hover:text-zinc-500 hover:bg-zinc-100 transition-colors"
          >
            {isHidden ? <EyeOff className="w-2.5 h-2.5" /> : <Eye className="w-2.5 h-2.5" />}
          </button>
        )}
        {onEdit && (
          <button
            title="Düzenle"
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
            className="shrink-0 w-5 h-5 flex items-center justify-center rounded text-muted-foreground/30 hover:text-muted-foreground hover:bg-accent transition-colors"
          >
            <Pencil className="w-2.5 h-2.5" />
          </button>
        )}
        <ChevronDown
          className={cn(
            'w-3 h-3 shrink-0 text-muted-foreground/50 transition-transform duration-150',
            isExpanded && 'rotate-180',
          )}
        />
      </div>

      {isExpanded && (
        <div className="px-2.5 pt-2 pb-2.5 bg-muted/40 border-t border-border space-y-2">
          <p className="text-[11px] text-muted-foreground tabular-nums">
            {item.width}×{item.height}×{item.length} cm · {item.weight} kg
          </p>
          {hasConstraints && (
            <TooltipProvider delayDuration={100}>
              <div className="flex items-center gap-1.5">
                {constraints.map((c) => (
                  <Tooltip key={c.key}>
                    <TooltipTrigger asChild>
                      <span className="cursor-default">
                        <c.Icon className={cn('w-3.5 h-3.5', c.colorClass)} strokeWidth={2} />
                      </span>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="text-xs">
                      {c.label}
                    </TooltipContent>
                  </Tooltip>
                ))}
              </div>
            </TooltipProvider>
          )}
          {item.stackGroup?.trim() && (
            <div className="flex items-center gap-1.5 text-[11px]">
              <Package className="w-3 h-3 text-muted-foreground shrink-0" />
              <span className="text-muted-foreground shrink-0">Yük Grubu</span>
              <span className="text-foreground font-medium truncate">{item.stackGroup}</span>
              {onClearStackGroup && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onClearStackGroup();
                  }}
                  className="ml-auto shrink-0 text-muted-foreground/50 hover:text-rose-500 transition-colors"
                  title="Yük grubundan çıkar"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          )}
          {item.specialNotes?.trim() && (
            <p className="text-[11px] text-muted-foreground italic leading-snug">
              {item.specialNotes}
            </p>
          )}
          <div className="flex items-center justify-between gap-2 pt-1.5 border-t border-zinc-100">
            {!isPlaced && !onRemoveFromGroup ? (
              <>
                <div className="flex items-center gap-1">
                  <span className="text-[10px] text-muted-foreground">Adet</span>
                  <div className="flex items-center rounded border border-border overflow-hidden ml-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setLocalQty((v) => Math.max(1, v - 1));
                      }}
                      className="w-5 h-5 flex items-center justify-center hover:bg-accent text-muted-foreground transition-colors"
                    >
                      <Minus className="w-2 h-2" />
                    </button>
                    <input
                      type="number"
                      min={1}
                      value={localQty}
                      onChange={(e) => {
                        const v = parseInt(e.target.value, 10);
                        if (!isNaN(v) && v >= 1) setLocalQty(v);
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className="w-8 text-center text-[11px] tabular-nums text-foreground bg-transparent outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                    />
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setLocalQty((v) => v + 1);
                      }}
                      className="w-5 h-5 flex items-center justify-center hover:bg-accent text-muted-foreground transition-colors"
                    >
                      <Plus className="w-2 h-2" />
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {groups && groups.length > 0 && onAddToGroup && (
                    <DropdownMenu>
                      <TooltipProvider delayDuration={300}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <DropdownMenuTrigger asChild>
                              <button
                                onClick={(e) => e.stopPropagation()}
                                className="flex items-center justify-center text-muted-foreground hover:text-muted-foreground transition-colors"
                              >
                                <FolderPlus className="w-3.5 h-3.5" />
                              </button>
                            </DropdownMenuTrigger>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="text-xs">
                            Gruba Ekle
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      <DropdownMenuContent side="top" align="end" className="w-44 p-1">
                        {groups.map((g) => (
                          <DropdownMenuItem
                            key={g.id}
                            className="flex items-center gap-2 text-xs"
                            onClick={(e) => {
                              e.stopPropagation();
                              onAddToGroup(g.id);
                            }}
                          >
                            <Layers className="w-3.5 h-3.5 shrink-0" style={{ color: g.color }} />
                            <span className="truncate">{g.ad}</span>
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                  <Button
                    size="sm"
                    disabled={!canPlace}
                    onClick={(e) => {
                      e.stopPropagation();
                      onPlace(localQty);
                      onToggleExpand();
                    }}
                    className="h-6 text-[11px] px-2.5 bg-foreground text-background hover:bg-foreground/80"
                  >
                    Ekle
                  </Button>
                </div>
              </>
            ) : (
              <div className="flex items-center justify-between w-full gap-2">
                {/* Left: Gruba Ekle + quantity controls */}
                <div className="flex items-center gap-1.5">
                  {groups && groups.length > 0 && onAddToGroup && (
                    <DropdownMenu>
                      <TooltipProvider delayDuration={300}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <DropdownMenuTrigger asChild>
                              <button
                                onClick={(e) => e.stopPropagation()}
                                className="flex items-center justify-center text-zinc-400 hover:text-zinc-600 transition-colors"
                              >
                                <FolderPlus className="w-3.5 h-3.5" />
                              </button>
                            </DropdownMenuTrigger>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="text-xs">
                            Gruba Ekle
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      <DropdownMenuContent side="top" align="start" className="w-44 p-1">
                        {groups.map((g) => (
                          <DropdownMenuItem
                            key={g.id}
                            className="flex items-center gap-2 text-xs"
                            onClick={(e) => {
                              e.stopPropagation();
                              onAddToGroup(g.id);
                            }}
                          >
                            <Layers className="w-3.5 h-3.5 shrink-0" style={{ color: g.color }} />
                            <span className="truncate">{g.ad}</span>
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                  {onUpdateQty && (
                    <>
                      <div className="flex items-center rounded border border-zinc-200 overflow-hidden">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setLocalQty((v) => Math.max(1, v - 1));
                          }}
                          className="w-5 h-5 flex items-center justify-center hover:bg-zinc-100 text-zinc-500 transition-colors"
                        >
                          <Minus className="w-2 h-2" />
                        </button>
                        <input
                          type="number"
                          min={1}
                          value={localQty}
                          onChange={(e) => {
                            const v = parseInt(e.target.value, 10);
                            if (!isNaN(v) && v >= 1) setLocalQty(v);
                          }}
                          onClick={(e) => e.stopPropagation()}
                          className="w-8 text-center text-[11px] tabular-nums text-zinc-700 bg-transparent outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                        />
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setLocalQty((v) => v + 1);
                          }}
                          className="w-5 h-5 flex items-center justify-center hover:bg-zinc-100 text-zinc-500 transition-colors"
                        >
                          <Plus className="w-2 h-2" />
                        </button>
                      </div>
                      {localQty !== quantity && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onUpdateQty(localQty);
                          }}
                          className="text-[11px] text-zinc-600 hover:text-zinc-900 px-1.5 py-0.5 rounded hover:bg-zinc-100 transition-colors"
                        >
                          Güncelle
                        </button>
                      )}
                    </>
                  )}
                </div>

                {/* Right: Çıkar */}
                {onRemoveFromGroup ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        onClick={(e) => e.stopPropagation()}
                        className="flex items-center gap-1 text-[11px] text-zinc-400 hover:text-rose-600 transition-colors ml-auto"
                      >
                        <PackageMinus className="w-3 h-3" />
                        Çıkar
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent side="top" align="end" className="w-52 p-1">
                      <DropdownMenuItem
                        className="text-xs"
                        onClick={(e) => {
                          e.stopPropagation();
                          onRemoveFromGroup('ungroup');
                        }}
                      >
                        Gruptan çıkar, grupsuzlara ekle
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-xs text-rose-600 focus:text-rose-600"
                        onClick={(e) => {
                          e.stopPropagation();
                          onRemoveFromGroup('remove');
                        }}
                      >
                        Yüklü ürünlerden çıkar
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemove?.();
                      onToggleExpand();
                    }}
                    className="flex items-center gap-1 text-[11px] text-zinc-400 hover:text-rose-600 transition-colors ml-auto"
                  >
                    <PackageMinus className="w-3 h-3" />
                    Çıkar
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── PlanNameField ────────────────────────────────────────────────────────────

interface PlanNameFieldProps {
  value: string;
  onChange: (name: string) => void;
  isNew: boolean;
}

function PlanNameField({ value, onChange, isNew }: PlanNameFieldProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.select();
  }, [editing]);

  function startEditing() {
    setDraft(value);
    setEditing(true);
  }

  function commit() {
    setEditing(false);
    const trimmed = draft.trim();
    if (trimmed && trimmed !== value) {
      onChange(trimmed);
    } else {
      setDraft(value);
    }
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        value={draft}
        autoFocus
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            commit();
          }
          if (e.key === 'Escape') {
            setEditing(false);
            setDraft(value);
          }
        }}
        placeholder="Plan adı girin…"
        className="w-full text-sm font-medium text-zinc-800 bg-transparent outline-none border-b border-zinc-300 focus:border-zinc-500 py-0.5 transition-colors"
      />
    );
  }

  return (
    <button
      onClick={startEditing}
      className="group/pname flex items-center gap-1.5 w-full text-left min-w-0"
    >
      {value ? (
        <span className="text-sm font-medium text-zinc-800 truncate flex-1">{value}</span>
      ) : (
        <span className={cn('text-sm flex-1', isNew ? 'text-rose-400' : 'text-zinc-400')}>
          {isNew ? 'Plan adı gerekli…' : 'Plan adı girin…'}
        </span>
      )}
      <Pencil className="w-3 h-3 shrink-0 text-zinc-300 group-hover/pname:text-zinc-500 transition-colors" />
    </button>
  );
}

// ─── PlanLeftPanel ────────────────────────────────────────────────────────────

interface PlanLeftPanelProps {
  fromPlanId?: string;
  onRenamePlan?: (name: string) => Promise<void>;
}

export function PlanLeftPanel({ fromPlanId, onRenamePlan }: PlanLeftPanelProps) {
  const navigate = useNavigate();
  const [groups, setGroups] = useState<
    Array<{ id: string; ad: string; acik: boolean; itemIdler: string[]; color: string }>
  >([]);
  // Tracks whether we've already restored groups from the store (for existing plans).
  const restoredFromStoreRef = useRef(false);
  const [ungroupedIds, setUngroupedIds] = useState<string[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [activeConstraints, setActiveConstraints] = useState<Set<ConstraintFilter>>(new Set());
  const [activeTab, setActiveTab] = useState<'unloaded' | 'loaded'>('unloaded');
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);

  // Group management state
  const [groupSelectionMode, setGroupSelectionMode] = useState<string | null>(null);
  const [selectedForGroup, setSelectedForGroup] = useState<Set<string>>(new Set());

  // stackGroup collapsible state for Ürün Listesi tab
  const [openStackGroups, setOpenStackGroups] = useState<Set<string>>(new Set());
  const [clearedStackGroups, setClearedStackGroups] = useState<Set<string>>(new Set());
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [editingGroupName, setEditingGroupName] = useState('');

  const createGroup = useCreateGroup();
  const updateGroup = useUpdateGroup();
  const deleteGroup = useDeleteGroup();
  const assignItemToGroup = useAssignItemToGroup();

  // Temp IDs (g-<timestamp>) are used for groups not yet persisted to the backend.
  // Backend calls that need a real group ID skip temp IDs gracefully.
  const isTempId = (id: string) => id.startsWith('g-');

  const { data: itemsPage, isLoading: itemsLoading } = useItems({ pageSize: 100 });
  const apiItems = useMemo(() => itemsPage?.items ?? [], [itemsPage]);

  const scrollRef = useRef<HTMLDivElement>(null);

  const selectedVehicle = usePlanStore((s) => s.selectedVehicle);
  const selectedItems = usePlanStore((s) => s.selectedItems);
  const placements = usePlanStore((s) => s.placements);
  const togglePlacement = usePlanStore((s) => s.togglePlacement);
  const addManualItem = usePlanStore((s) => s.addManualItem);
  const updateItem = usePlanStore((s) => s.updateItem);
  const initItems = usePlanStore((s) => s.initItems);
  const mockPlacements = usePlanStore((s) => s.mockPlacements);
  const setPlacements = usePlanStore((s) => s.setPlacements);
  const skuColorMap = usePlanStore((s) => s.skuColorMap);
  const planName = usePlanStore((s) => s.planName);
  const setPlanName = usePlanStore((s) => s.setPlanName);
  const syncGroups = usePlanStore((s) => s.syncGroups);
  const storeGroups = usePlanStore((s) => s.groups);
  const storeAssignments = usePlanStore((s) => s.itemGroupAssignments);
  const cascadeOffer = usePlanStore((s) => s.cascadeOffer);
  const dismissCascade = usePlanStore((s) => s.dismissCascade);
  const acceptCascade = usePlanStore((s) => s.acceptCascade);

  const canPlace = !!selectedVehicle;

  const focusedGroupItemIds = useSceneStore((s) => s.focusedGroupItemIds);
  const setFocusedGroupItemIds = useSceneStore((s) => s.setFocusedGroupItemIds);
  const hiddenItemIds = useSceneStore((s) => s.hiddenItemIds);
  const toggleHiddenItem = useSceneStore((s) => s.toggleHiddenItem);
  const setSelectedItemId = useSceneStore((s) => s.setSelectedItemId);

  const placedIds = useMemo(() => new Set(placements.map((p) => p.itemId)), [placements]);

  const prevSelectedLenRef = useRef(selectedItems.length);
  useEffect(() => {
    if (prevSelectedLenRef.current > 0 && selectedItems.length === 0 && placements.length === 0) {
      setUngroupedIds([]);
    }
    prevSelectedLenRef.current = selectedItems.length;
  }, [selectedItems.length, placements.length]);

  useEffect(() => {
    if (ungroupedIds.length > 0) return;
    if (selectedItems.length > 0) {
      setUngroupedIds(selectedItems.map((si) => si.item.id));
      return;
    }
    if (apiItems.length > 0) {
      const colorMap: Record<string, string> = {};
      apiItems.forEach((item, i) => {
        colorMap[item.sku] = SCENE.COLORS.SKU_PALETTE[i % SCENE.COLORS.SKU_PALETTE.length];
      });
      initItems(
        apiItems.map((item) => ({ item, quantity: 1 })),
        colorMap,
      );
      setUngroupedIds(apiItems.map((item) => item.id));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiItems, selectedItems, ungroupedIds.length]);

  useEffect(() => {
    if (!showFilterPanel) return;
    const handler = (e: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(e.target as Node))
        setShowFilterPanel(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showFilterPanel]);

  // When opening an existing plan, restore local group state from store (populated by PlanAutoLoader).
  useEffect(() => {
    if (!fromPlanId || restoredFromStoreRef.current || storeGroups.length === 0) return;
    restoredFromStoreRef.current = true;
    setGroups(
      storeGroups.map((g) => ({
        id: g.clientGroupId,
        ad: g.name,
        acik: true,
        color: g.color,
        itemIdler: Object.entries(storeAssignments)
          .filter(([, gId]) => gId === g.clientGroupId)
          .map(([itemId]) => itemId),
      })),
    );
  }, [fromPlanId, storeGroups, storeAssignments]);

  // Sync local group state → store so API calls pick up group assignments.
  // Guard: skip until restoration is done for existing plans (avoids clobbering loaded data).
  useEffect(() => {
    if (fromPlanId && !restoredFromStoreRef.current) return;
    const apiGroups = groups.map((g, i) => ({
      clientGroupId: g.id,
      name: g.ad,
      color: g.color,
      unloadingOrder: i + 1,
    }));
    const assignments: Record<string, string> = {};
    for (const g of groups) {
      for (const itemId of g.itemIdler) {
        assignments[itemId] = g.id;
      }
    }
    syncGroups(apiGroups, assignments);
  }, [groups, fromPlanId, syncGroups]);

  const hasActiveFilters = activeConstraints.size > 0;

  function toggleConstraintFilter(value: ConstraintFilter) {
    setActiveConstraints((prev) => {
      const next = new Set(prev);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      return next;
    });
  }

  const groupedIds = useMemo(() => new Set(groups.flatMap((g) => g.itemIdler)), [groups]);

  const itemIconColorMap = useMemo<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    for (const g of groups) {
      for (const id of g.itemIdler) {
        map[id] = g.color;
      }
    }
    let idx = 0;
    for (const id of ungroupedIds) {
      if (!map[id]) {
        map[id] = GROUP_ICON_COLORS[idx % GROUP_ICON_COLORS.length];
        idx++;
      }
    }
    for (const si of selectedItems) {
      if (!map[si.item.id]) {
        map[si.item.id] = GROUP_ICON_COLORS[idx % GROUP_ICON_COLORS.length];
        idx++;
      }
    }
    for (const item of apiItems) {
      if (!map[item.id]) {
        map[item.id] = GROUP_ICON_COLORS[idx % GROUP_ICON_COLORS.length];
        idx++;
      }
    }
    return map;
  }, [groups, ungroupedIds, selectedItems, apiItems]);

  const filteredCatalogOnlyItems = useMemo(() => {
    if (activeTab !== 'unloaded') return [];
    return apiItems.filter((item) => itemMatchesFilters(item, search, activeConstraints));
  }, [apiItems, activeTab, search, activeConstraints]);

  const catalogItemsCount = useMemo(
    () => apiItems.filter((item) => itemMatchesFilters(item, search, activeConstraints)).length,
    [apiItems, search, activeConstraints],
  );

  const flatDisplayItems = useMemo(() => {
    if (activeTab !== 'loaded') return [];
    const seen = new Set<string>();
    const result: string[] = [];

    for (const id of ungroupedIds) {
      if (seen.has(id)) continue;
      seen.add(id);
      if (groupedIds.has(id)) continue;
      const entry = selectedItems.find((si) => si.item.id === id);
      if (!entry || !placedIds.has(id)) continue;
      if (!itemMatchesFilters(entry.item, search, activeConstraints)) continue;
      result.push(id);
    }

    for (const si of selectedItems) {
      const id = si.item.id;
      if (seen.has(id)) continue;
      seen.add(id);
      if (groupedIds.has(id)) continue;
      if (!placedIds.has(id)) continue;
      if (!itemMatchesFilters(si.item, search, activeConstraints)) continue;
      result.push(id);
    }

    return result;
  }, [ungroupedIds, selectedItems, groupedIds, placedIds, activeTab, search, activeConstraints]);

  type ItemRef = { id: string; isCatalog: boolean };

  const groupedUnloadedSections = useMemo(() => {
    if (activeTab !== 'unloaded' || groupSelectionMode) return null;
    const groupMap = new Map<string, ItemRef[]>();
    const noGroupCatalog: ItemRef[] = [];

    for (const item of filteredCatalogOnlyItems) {
      const sg = clearedStackGroups.has(item.id) ? null : item.stackGroup?.trim() || null;
      if (sg) {
        if (!groupMap.has(sg)) groupMap.set(sg, []);
        groupMap.get(sg)!.push({ id: item.id, isCatalog: true });
      } else {
        noGroupCatalog.push({ id: item.id, isCatalog: true });
      }
    }

    return { groupMap, noGroupCatalog };
  }, [activeTab, groupSelectionMode, filteredCatalogOnlyItems, clearedStackGroups]);

  const shouldVirtualize = flatDisplayItems.length >= VIRTUAL_THRESHOLD;

  // eslint-disable-next-line react-hooks/incompatible-library
  const rowVirtualizer = useVirtualizer({
    count: shouldVirtualize ? flatDisplayItems.length : 0,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 36,
    overscan: 8,
  });

  const groupSelectionItems = useMemo(() => {
    if (!groupSelectionMode) return [];
    return apiItems.filter((item) => itemMatchesFilters(item, search, activeConstraints));
  }, [groupSelectionMode, apiItems, search, activeConstraints]);

  function lookupEntry(id: string) {
    return selectedItems.find((si) => si.item.id === id);
  }

  function toggleGroup(groupId: string, itemIds: string[]) {
    setGroups((prev) => prev.map((g) => (g.id === groupId ? { ...g, acik: !g.acik } : g)));
    const isSameFocus =
      focusedGroupItemIds !== null &&
      focusedGroupItemIds.length === itemIds.length &&
      itemIds.every((id) => focusedGroupItemIds.includes(id));
    setFocusedGroupItemIds(isSameFocus ? null : itemIds);
    if (!isSameFocus) {
      useSceneStore.getState().setSelectedItemId(null);
      useSceneStore.getState().setSelectedInstanceId(null);
    }
  }

  async function handleAddGroup() {
    const tempId = `g-${Date.now()}`;
    const num = groups.length + 1;
    const name = `Grup ${num}`;
    const usedColors = groups.map((g) => g.color);
    const available = GROUP_ICON_COLORS.filter((c) => !usedColors.includes(c));
    const pool = available.length > 0 ? available : [...GROUP_ICON_COLORS];
    const color = pool[Math.floor(Math.random() * pool.length)];

    setGroups((prev) => [...prev, { id: tempId, ad: name, acik: true, itemIdler: [], color }]);

    if (fromPlanId) {
      try {
        const realId = await createGroup.mutateAsync({
          planId: fromPlanId,
          name,
          color,
          unloadingOrder: num,
        });
        setGroups((prev) => prev.map((g) => (g.id === tempId ? { ...g, id: realId } : g)));
      } catch {
        setGroups((prev) => prev.filter((g) => g.id !== tempId));
      }
    }
  }

  function handleStartGroupSelection(groupId: string) {
    setGroupSelectionMode(groupId);
    setSelectedForGroup(new Set());
    setActiveTab('unloaded');
  }

  function handleConfirmGroupSelection() {
    if (!groupSelectionMode) return;
    const newItemIds: string[] = [];

    selectedForGroup.forEach((itemId) => {
      const catalogItem = apiItems.find((i) => i.id === itemId);
      if (!catalogItem) return;
      const planEntry = selectedItems.find((si) => si.item.id === itemId);
      if (planEntry) {
        if (!placedIds.has(itemId)) togglePlacement(itemId);
      } else {
        const color =
          SCENE.COLORS.SKU_PALETTE[
            Object.keys(skuColorMap).length % SCENE.COLORS.SKU_PALETTE.length
          ];
        addManualItem(catalogItem, 1, color);
        setUngroupedIds((prev) => [...prev, itemId]);
      }
      newItemIds.push(itemId);
    });

    setGroups((prev) =>
      prev.map((g) =>
        g.id === groupSelectionMode
          ? { ...g, itemIdler: [...new Set([...g.itemIdler, ...newItemIds])] }
          : g,
      ),
    );

    if (fromPlanId && !isTempId(groupSelectionMode)) {
      for (const itemId of newItemIds) {
        void assignItemToGroup
          .mutateAsync({
            planId: fromPlanId,
            inputItemId: itemId,
            groupId: groupSelectionMode,
          })
          .catch(() => undefined);
      }
    }

    setGroupSelectionMode(null);
    setSelectedForGroup(new Set());
    setActiveTab('loaded');
  }

  function handleRenameGroup(groupId: string, name: string) {
    const trimmed = name.trim();
    if (!trimmed) {
      setEditingGroupId(null);
      return;
    }
    setGroups((prev) => prev.map((g) => (g.id === groupId ? { ...g, ad: trimmed } : g)));
    setEditingGroupId(null);
    if (fromPlanId && !isTempId(groupId)) {
      const group = groups.find((g) => g.id === groupId);
      const idx = groups.findIndex((g) => g.id === groupId);
      if (group) {
        void updateGroup.mutate({
          planId: fromPlanId,
          groupId,
          name: trimmed,
          color: group.color,
          unloadingOrder: idx + 1,
        });
      }
    }
  }

  function handleDeleteGroup(groupId: string) {
    const group = groups.find((g) => g.id === groupId);
    if (!group) return;
    setUngroupedIds((prev) => [...new Set([...prev, ...group.itemIdler])]);
    setGroups((prev) => prev.filter((g) => g.id !== groupId));
    if (focusedGroupItemIds !== null) setFocusedGroupItemIds(null);
    if (fromPlanId && !isTempId(groupId)) {
      void deleteGroup.mutate({ planId: fromPlanId, groupId });
    }
  }

  function handleMoveGroup(groupId: string, direction: 'up' | 'down') {
    const idx = groups.findIndex((g) => g.id === groupId);
    if (idx === -1) return;
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= groups.length) return;

    setGroups((prev) => {
      const next = [...prev];
      [next[idx], next[targetIdx]] = [next[targetIdx], next[idx]];
      return next;
    });

    if (fromPlanId) {
      // g1 moves from targetIdx → idx; g2 moves from idx → targetIdx
      const g1 = groups[targetIdx];
      const g2 = groups[idx];
      if (!isTempId(g1.id)) {
        void updateGroup.mutate({
          planId: fromPlanId,
          groupId: g1.id,
          name: g1.ad,
          color: g1.color,
          unloadingOrder: idx + 1,
        });
      }
      if (!isTempId(g2.id)) {
        void updateGroup.mutate({
          planId: fromPlanId,
          groupId: g2.id,
          name: g2.ad,
          color: g2.color,
          unloadingOrder: targetIdx + 1,
        });
      }
    }
  }

  function handleToggleGroupVisibility(itemIds: string[]) {
    const state = useSceneStore.getState();
    const allHidden = itemIds.length > 0 && itemIds.every((id) => state.hiddenItemIds.includes(id));
    if (allHidden) {
      useSceneStore.setState({
        hiddenItemIds: state.hiddenItemIds.filter((id) => !itemIds.includes(id)),
      });
    } else {
      const toAdd = itemIds.filter((id) => !state.hiddenItemIds.includes(id));
      useSceneStore.setState({ hiddenItemIds: [...state.hiddenItemIds, ...toAdd] });
    }
  }

  const groupOptions: GroupOption[] = groups.map((g) => ({ id: g.id, ad: g.ad, color: g.color }));

  const commonRowProps = (id: string) => {
    const entry = lookupEntry(id);
    if (!entry) return null;
    const isPlaced = placedIds.has(id);
    return {
      storeEntry: entry,
      isPlaced,
      canPlace,
      isExpanded: expandedId === id,
      groups: groupOptions,
      isHidden: hiddenItemIds.includes(id),
      onToggleVisibility: () => toggleHiddenItem(id),
      onSelect: () => {
        setSelectedItemId(id);
        setFocusedGroupItemIds(null);
      },
      onToggleExpand: () => setExpandedId((prev) => (prev === id ? null : id)),
      onPlace: (qty: number) => {
        if (qty !== entry.quantity) {
          const color = skuColorMap[entry.item.sku] ?? SCENE.COLORS.NORMAL_STR;
          updateItem(id, entry.item, qty, color);
        }
        togglePlacement(id);
      },
      onUpdateQty: isPlaced
        ? (qty: number) => {
            const color = skuColorMap[entry.item.sku] ?? SCENE.COLORS.NORMAL_STR;
            updateItem(id, entry.item, qty, color);
          }
        : undefined,
      onRemove: () => togglePlacement(id),
      onEdit: () => navigate(`/products/${id}/edit`),
      onAddToGroup: (groupId: string) => {
        if (!placedIds.has(id)) togglePlacement(id);
        setGroups((prev) =>
          prev.map((g) =>
            g.id === groupId ? { ...g, itemIdler: [...new Set([...g.itemIdler, id])] } : g,
          ),
        );
        if (fromPlanId && !isTempId(groupId)) {
          void assignItemToGroup.mutate({ planId: fromPlanId, inputItemId: id, groupId });
        }
      },
    };
  };

  const activeGroupName = groups.find((g) => g.id === groupSelectionMode)?.ad ?? 'Grup';

  function handlePlanNameChange(name: string) {
    setPlanName(name);
    void onRenamePlan?.(name);
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-3 py-2.5 flex items-center justify-between shrink-0 border-b border-border">
        <span className="text-sm text-foreground">Ürünler</span>
        <Button
          size="icon"
          title="Ürün Ekle"
          className="h-7 w-7 bg-zinc-900 text-white hover:bg-zinc-700"
          onClick={() => navigate(ROUTES.PRODUCTS_NEW)}
        >
          <Plus className="w-3.5 h-3.5" />
        </Button>
      </div>

      {/* Plan name */}
      <div className="px-3 py-2 border-b border-zinc-100 shrink-0">
        <PlanNameField value={planName} onChange={handlePlanNameChange} isNew={!fromPlanId} />
      </div>

      {/* Tabs */}
      <div className="px-2 pt-2 shrink-0">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'unloaded' | 'loaded')}>
          <TabsList className="w-full h-7 bg-muted">
            <TabsTrigger value="unloaded" className="flex-1 text-xs h-5.5">
              Ürün Listesi
              <span className="ml-1 text-[10px] tabular-nums text-zinc-400">
                ({catalogItemsCount})
              </span>
            </TabsTrigger>
            <TabsTrigger value="loaded" className="flex-1 text-xs h-5.5">
              Yüklü Ürünler
              <span className="ml-1 text-[10px] tabular-nums text-muted-foreground">
                ({placedIds.size})
              </span>
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Search + Filter */}
      <div className="px-2 pt-1.5 pb-1 shrink-0 flex items-center gap-1.5">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground pointer-events-none" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="İsim veya SKU ile ara…"
            className="h-7 pl-7 pr-7 text-xs bg-muted/40 border-border focus-visible:ring-1 focus-visible:ring-border"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-muted-foreground"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Filter dropdown */}
        <div ref={filterRef} className="relative shrink-0">
          <Button
            variant="outline"
            size="sm"
            className={cn(
              'h-7 gap-1 px-2 text-xs',
              hasActiveFilters && 'border-primary text-primary ring-1 ring-primary/30',
            )}
            onClick={() => setShowFilterPanel((v) => !v)}
          >
            <SlidersHorizontal className="w-3 h-3" />
            {hasActiveFilters && (
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                {activeConstraints.size}
              </span>
            )}
            <ChevronDown
              className={cn('w-3 h-3 transition-transform', showFilterPanel && 'rotate-180')}
            />
          </Button>

          {showFilterPanel && (
            <div className="absolute right-0 top-full z-20 mt-1 min-w-[200px] rounded-xl border border-border bg-background shadow-lg">
              <div className="p-3">
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                  Kısıt Filtresi
                </p>
                <div className="space-y-2">
                  {CONSTRAINT_FILTER_OPTIONS.map(({ value, label, Icon, className }) => (
                    <label
                      key={value}
                      className="flex cursor-pointer items-center gap-2 rounded-md px-1 py-0.5 hover:bg-muted"
                    >
                      <Checkbox
                        checked={activeConstraints.has(value)}
                        onCheckedChange={() => toggleConstraintFilter(value)}
                      />
                      <Icon className={cn('h-3.5 w-3.5', className)} />
                      <span className="text-xs">{label}</span>
                    </label>
                  ))}
                </div>
                {hasActiveFilters && (
                  <Button
                    type="button"
                    variant="link"
                    size="sm"
                    className="mt-3 h-auto p-0 text-[11px] text-muted-foreground"
                    onClick={() => setActiveConstraints(new Set())}
                  >
                    Filtreleri temizle
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Scrollable area */}
      <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto p-2 flex flex-col gap-0.5">
        {itemsLoading && (
          <div className="flex items-center justify-center py-8 text-muted-foreground text-xs">
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
            Ürünler yükleniyor…
          </div>
        )}

        {/* ── Yüklü Ürünler tab content ──────────────────────────────── */}
        {activeTab === 'loaded' && (
          <>
            {/* Grup Oluştur button */}
            {!groupSelectionMode && (
              <button
                onClick={() => {
                  void handleAddGroup();
                }}
                disabled={createGroup.isPending}
                className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-800 px-2 py-1.5 rounded-lg hover:bg-zinc-50 transition-colors self-start mb-0.5 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {createGroup.isPending ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <FolderPlus className="w-3.5 h-3.5" />
                )}
                <span>Grup Oluştur</span>
              </button>
            )}

            {/* Groups */}
            {groups.map((g, groupIndex) => {
              const groupEntries = g.itemIdler
                .map(lookupEntry)
                .filter((e): e is { item: Item; quantity: number } => e !== undefined);
              const hasFilter = search.trim() || activeConstraints.size > 0;
              const filteredGroupEntries = hasFilter
                ? groupEntries.filter((e) => itemMatchesFilters(e.item, search, activeConstraints))
                : groupEntries;
              const groupTotal = groupEntries.length;
              const isFocused =
                focusedGroupItemIds !== null &&
                g.itemIdler.length === focusedGroupItemIds.length &&
                g.itemIdler.every((id) => focusedGroupItemIds.includes(id));

              return (
                <div key={g.id} className="flex flex-col gap-0.5">
                  {/* Group header row */}
                  <div
                    className={cn(
                      'group/grp flex items-center gap-2 px-3 py-2.5 rounded-lg transition-colors',
                      isFocused
                        ? 'bg-amber-50 ring-1 ring-amber-300 hover:bg-amber-100'
                        : 'hover:bg-accent',
                    )}
                  >
                    {/* Expand toggle + icon + name */}
                    <button
                      onClick={() => toggleGroup(g.id, g.itemIdler)}
                      className="flex items-center gap-2 flex-1 min-w-0"
                    >
                      <ChevronRight
                        className={cn(
                          'w-3.5 h-3.5 shrink-0 transition-transform duration-150',
                          isFocused ? 'text-amber-500' : 'text-muted-foreground',
                          g.acik && 'rotate-90',
                        )}
                      />
                      <Layers
                        className="w-4 h-4 shrink-0"
                        style={{ color: isFocused ? '#f59e0b' : g.color }}
                        strokeWidth={2}
                      />
                      {editingGroupId === g.id ? (
                        <input
                          value={editingGroupName}
                          autoFocus
                          className="flex-1 min-w-0 text-sm bg-transparent border-b border-border outline-none text-foreground px-0"
                          onChange={(e) => setEditingGroupName(e.target.value)}
                          onBlur={() => handleRenameGroup(g.id, editingGroupName)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleRenameGroup(g.id, editingGroupName);
                            if (e.key === 'Escape') setEditingGroupId(null);
                          }}
                          onClick={(e) => e.stopPropagation()}
                        />
                      ) : (
                        <span
                          className={cn(
                            'text-sm flex-1 text-left truncate cursor-text',
                            isFocused ? 'text-amber-700 font-medium' : 'text-foreground',
                          )}
                          onDoubleClick={(e) => {
                            e.stopPropagation();
                            setEditingGroupId(g.id);
                            setEditingGroupName(g.ad);
                          }}
                        >
                          {g.ad}
                        </span>
                      )}
                    </button>

                    {/* Unloading order badge + move buttons */}
                    <span
                      title={`Boşaltma sırası: ${groupIndex + 1}`}
                      className="shrink-0 text-[10px] tabular-nums text-zinc-400 bg-zinc-100 rounded px-1 py-0.5 leading-none"
                    >
                      ↑{groupIndex + 1}
                    </span>

                    <div className="shrink-0 flex items-center opacity-0 group-hover/grp:opacity-100 transition-opacity">
                      <button
                        title="Yukarı taşı (önce boşalt)"
                        disabled={groupIndex === 0}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMoveGroup(g.id, 'up');
                        }}
                        className="w-4 h-5 flex items-center justify-center text-zinc-400 hover:text-zinc-700 disabled:opacity-20 disabled:cursor-not-allowed"
                      >
                        <ArrowUp className="w-3 h-3" />
                      </button>
                      <button
                        title="Aşağı taşı (sonra boşalt)"
                        disabled={groupIndex === groups.length - 1}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMoveGroup(g.id, 'down');
                        }}
                        className="w-4 h-5 flex items-center justify-center text-zinc-400 hover:text-zinc-700 disabled:opacity-20 disabled:cursor-not-allowed"
                      >
                        <ArrowDown className="w-3 h-3" />
                      </button>
                    </div>

                    <span className="text-xs text-zinc-400 shrink-0">{groupTotal} kalem</span>

                    {/* Toggle group visibility */}
                    {(() => {
                      const isGroupHidden =
                        g.itemIdler.length > 0 &&
                        g.itemIdler.every((id) => hiddenItemIds.includes(id));
                      return (
                        <button
                          title={isGroupHidden ? 'Grubu Göster' : 'Grubu Gizle'}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleGroupVisibility(g.itemIdler);
                          }}
                          className={cn(
                            'shrink-0 w-5 h-5 rounded flex items-center justify-center transition-opacity text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100',
                            isGroupHidden ? 'opacity-100' : 'opacity-0 group-hover/grp:opacity-100',
                          )}
                        >
                          {isGroupHidden ? (
                            <EyeOff className="w-3.5 h-3.5" />
                          ) : (
                            <Eye className="w-3.5 h-3.5" />
                          )}
                        </button>
                      );
                    })()}

                    {/* Delete group */}
                    <button
                      title="Grubu Sil"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteGroup(g.id);
                      }}
                      className="shrink-0 w-5 h-5 rounded flex items-center justify-center opacity-0 group-hover/grp:opacity-100 transition-opacity text-zinc-400 hover:text-rose-600 hover:bg-rose-50"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>

                    {/* Add products to group */}
                    <button
                      title="Gruba Ürün Ekle"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleStartGroupSelection(g.id);
                      }}
                      className="shrink-0 w-5 h-5 rounded flex items-center justify-center opacity-0 group-hover/grp:opacity-100 transition-opacity text-muted-foreground hover:text-foreground hover:bg-accent"
                    >
                      <PackagePlus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {g.acik &&
                    filteredGroupEntries.map((entry) => {
                      const id = entry.item.id;
                      const props = commonRowProps(id);
                      if (!props) return null;
                      return (
                        <StoreItemRow
                          key={id}
                          {...props}
                          indent
                          iconColor={g.color}
                          onRemoveFromGroup={(action) => {
                            setGroups((prev) =>
                              prev.map((grp) =>
                                grp.id === g.id
                                  ? { ...grp, itemIdler: grp.itemIdler.filter((iid) => iid !== id) }
                                  : grp,
                              ),
                            );
                            if (action === 'ungroup') {
                              setUngroupedIds((prev) => [...new Set([...prev, id])]);
                            } else {
                              togglePlacement(id);
                            }
                            if (fromPlanId && !isTempId(g.id)) {
                              void assignItemToGroup.mutate({
                                planId: fromPlanId,
                                inputItemId: id,
                                groupId: null,
                              });
                            }
                          }}
                        />
                      );
                    })}
                </div>
              );
            })}
          </>
        )}

        {/* ── Ürün Listesi tab: group selection mode ──────────────────── */}
        {activeTab === 'unloaded' && groupSelectionMode && (
          <>
            {/* Banner */}
            <div className="flex items-center gap-2 px-2.5 py-1.5 bg-muted/40 border border-border rounded-lg mb-1">
              <Layers className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <span className="text-xs text-muted-foreground truncate">
                <span className="font-medium">{activeGroupName}</span> için ürün seçin
              </span>
            </div>

            {groupSelectionItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center gap-1.5">
                <Package className="w-5 h-5 text-muted-foreground/30" />
                <p className="text-xs text-muted-foreground">Eklenecek ürün bulunamadı</p>
              </div>
            ) : (
              <div className="flex flex-col gap-0.5">
                {groupSelectionItems.map((item) => (
                  <GroupSelectionRow
                    key={item.id}
                    item={item}
                    isSelected={selectedForGroup.has(item.id)}
                    onToggle={() =>
                      setSelectedForGroup((prev) => {
                        const next = new Set(prev);
                        if (next.has(item.id)) next.delete(item.id);
                        else next.add(item.id);
                        return next;
                      })
                    }
                  />
                ))}
              </div>
            )}
          </>
        )}

        {/* ── Loaded tab: flat item list (no group selection mode) ───── */}
        {!groupSelectionMode && activeTab === 'loaded' && flatDisplayItems.length > 0 && (
          <div className="flex flex-col gap-0.5">
            {shouldVirtualize ? (
              <div style={{ height: `${rowVirtualizer.getTotalSize()}px`, position: 'relative' }}>
                {rowVirtualizer.getVirtualItems().map((virtualItem) => {
                  const id = flatDisplayItems[virtualItem.index];
                  const props = commonRowProps(id);
                  if (!props) return null;
                  return (
                    <div
                      key={virtualItem.key}
                      data-index={virtualItem.index}
                      ref={rowVirtualizer.measureElement}
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        transform: `translateY(${virtualItem.start}px)`,
                      }}
                    >
                      <StoreItemRow {...props} iconColor={itemIconColorMap[id]} />
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col gap-px">
                {flatDisplayItems.map((id) => {
                  const props = commonRowProps(id);
                  if (!props) return null;
                  return <StoreItemRow key={id} {...props} iconColor={itemIconColorMap[id]} />;
                })}
              </div>
            )}
          </div>
        )}

        {/* ── Unloaded tab: grouped by stackGroup ─────────────────────── */}
        {!groupSelectionMode && activeTab === 'unloaded' && groupedUnloadedSections && (
          <>
            {[...groupedUnloadedSections.groupMap.entries()].map(([groupName, refs]) => {
              const isOpen = openStackGroups.has(groupName);
              const renderCatalogRow = (itemId: string) => {
                const catalogItem = apiItems.find((i) => i.id === itemId);
                if (!catalogItem) return null;
                const color =
                  SCENE.COLORS.SKU_PALETTE[
                    Object.keys(usePlanStore.getState().skuColorMap).length %
                      SCENE.COLORS.SKU_PALETTE.length
                  ];
                const planProps = commonRowProps(itemId);
                if (planProps) {
                  return (
                    <StoreItemRow
                      key={itemId}
                      {...planProps}
                      iconColor={itemIconColorMap[itemId]}
                      onClearStackGroup={() =>
                        setClearedStackGroups((prev) => {
                          const next = new Set(prev);
                          next.add(itemId);
                          return next;
                        })
                      }
                    />
                  );
                }
                return (
                  <StoreItemRow
                    key={itemId}
                    storeEntry={{ item: catalogItem, quantity: 1 }}
                    isPlaced={false}
                    canPlace={canPlace}
                    isExpanded={expandedId === itemId}
                    iconColor={itemIconColorMap[itemId]}
                    groups={groupOptions}
                    onToggleExpand={() =>
                      setExpandedId((prev) => (prev === itemId ? null : itemId))
                    }
                    onPlace={(qty) => {
                      addManualItem(catalogItem, qty, color);
                      setUngroupedIds((prev) => [...prev, itemId]);
                    }}
                    onAddToGroup={(groupId) => {
                      addManualItem(catalogItem, 1, color);
                      setUngroupedIds((prev) => [...prev, itemId]);
                      setGroups((prev) =>
                        prev.map((g) =>
                          g.id === groupId
                            ? { ...g, itemIdler: [...new Set([...g.itemIdler, itemId])] }
                            : g,
                        ),
                      );
                    }}
                    onClearStackGroup={() =>
                      setClearedStackGroups((prev) => {
                        const next = new Set(prev);
                        next.add(itemId);
                        return next;
                      })
                    }
                  />
                );
              };

              return (
                <div key={groupName} className="flex flex-col gap-0.5">
                  <button
                    onClick={() =>
                      setOpenStackGroups((prev) => {
                        const next = new Set(prev);
                        if (next.has(groupName)) next.delete(groupName);
                        else next.add(groupName);
                        return next;
                      })
                    }
                    className="flex items-center gap-2 px-2.5 py-2 rounded-lg hover:bg-accent transition-colors w-full text-left"
                  >
                    <ChevronRight
                      className={cn(
                        'w-3.5 h-3.5 shrink-0 text-muted-foreground transition-transform duration-150',
                        isOpen && 'rotate-90',
                      )}
                    />
                    <Package className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
                    <span className="text-xs text-foreground flex-1 truncate">{groupName}</span>
                    <span className="text-[10px] text-muted-foreground tabular-nums shrink-0">
                      {refs.length}
                    </span>
                  </button>
                  {isOpen && (
                    <div className="flex flex-col gap-px pl-2">
                      {refs.map((ref) => {
                        if (!ref.isCatalog) {
                          const props = commonRowProps(ref.id);
                          if (!props) return null;
                          return (
                            <StoreItemRow
                              key={ref.id}
                              {...props}
                              iconColor={itemIconColorMap[ref.id]}
                              onClearStackGroup={() =>
                                setClearedStackGroups((prev) => {
                                  const next = new Set(prev);
                                  next.add(ref.id);
                                  return next;
                                })
                              }
                            />
                          );
                        }
                        return renderCatalogRow(ref.id);
                      })}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Ungrouped catalog items */}
            {groupedUnloadedSections.noGroupCatalog.length > 0 && (
              <div className="flex flex-col gap-px">
                {groupedUnloadedSections.noGroupCatalog.map((ref) => {
                  const catalogItem = apiItems.find((i) => i.id === ref.id);
                  if (!catalogItem) return null;
                  const color =
                    SCENE.COLORS.SKU_PALETTE[
                      Object.keys(usePlanStore.getState().skuColorMap).length %
                        SCENE.COLORS.SKU_PALETTE.length
                    ];
                  const planProps = commonRowProps(ref.id);
                  if (planProps) {
                    return (
                      <StoreItemRow
                        key={ref.id}
                        {...planProps}
                        iconColor={itemIconColorMap[ref.id]}
                      />
                    );
                  }
                  return (
                    <StoreItemRow
                      key={ref.id}
                      storeEntry={{ item: catalogItem, quantity: 1 }}
                      isPlaced={false}
                      canPlace={canPlace}
                      isExpanded={expandedId === ref.id}
                      iconColor={itemIconColorMap[ref.id]}
                      groups={groupOptions}
                      onToggleExpand={() =>
                        setExpandedId((prev) => (prev === ref.id ? null : ref.id))
                      }
                      onPlace={(qty) => {
                        addManualItem(catalogItem, qty, color);
                        setUngroupedIds((prev) => [...prev, ref.id]);
                      }}
                      onAddToGroup={(groupId) => {
                        addManualItem(catalogItem, 1, color);
                        setUngroupedIds((prev) => [...prev, ref.id]);
                        setGroups((prev) =>
                          prev.map((g) =>
                            g.id === groupId
                              ? { ...g, itemIdler: [...new Set([...g.itemIdler, ref.id])] }
                              : g,
                          ),
                        );
                      }}
                    />
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* No results */}
        {(search || activeConstraints.size > 0) &&
          !groupSelectionMode &&
          flatDisplayItems.length === 0 &&
          filteredCatalogOnlyItems.length === 0 &&
          !itemsLoading && (
            <div className="flex flex-col items-center justify-center py-8 text-center gap-1.5">
              <Search className="w-5 h-5 text-muted-foreground/30" />
              <p className="text-xs text-muted-foreground">
                {search ? `"${search}" için` : 'Seçili kısıt filtresine göre'} sonuç bulunamadı
              </p>
            </div>
          )}
      </div>

      {/* Sticky "Gruba Ekle" panel — shown when in group selection mode */}
      {groupSelectionMode &&
        (() => {
          const allSelected =
            groupSelectionItems.length > 0 &&
            groupSelectionItems.every((item) => selectedForGroup.has(item.id));
          return (
            <div className="shrink-0 border-t border-zinc-100 px-3 py-2 flex items-center justify-between gap-2 bg-white">
              <span className="text-xs text-zinc-500 shrink-0">
                {selectedForGroup.size} ürün seçildi
              </span>
              <div className="flex items-center gap-1">
                <TooltipProvider delayDuration={200}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => {
                          setGroupSelectionMode(null);
                          setSelectedForGroup(new Set());
                          setActiveTab('loaded');
                        }}
                        className="w-7 h-7 flex items-center justify-center rounded text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="text-xs">
                      İptal
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <TooltipProvider delayDuration={200}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => {
                          if (allSelected) {
                            setSelectedForGroup(new Set());
                          } else {
                            setSelectedForGroup(new Set(groupSelectionItems.map((i) => i.id)));
                          }
                        }}
                        className={cn(
                          'w-7 h-7 flex items-center justify-center rounded transition-colors',
                          allSelected
                            ? 'text-zinc-900 bg-zinc-100 hover:bg-zinc-200'
                            : 'text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100',
                        )}
                      >
                        <CheckCheck className="w-3.5 h-3.5" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="text-xs">
                      {allSelected ? 'Tümünü Kaldır' : 'Tümünü Seç'}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <Button
                  size="sm"
                  disabled={selectedForGroup.size === 0}
                  onClick={handleConfirmGroupSelection}
                  className="h-7 text-xs bg-zinc-900 text-white hover:bg-zinc-700 disabled:opacity-40"
                >
                  Gruba Ekle ({selectedForGroup.size})
                </Button>
              </div>
            </div>
          );
        })()}

      <UnfitItemsPanel />

      {/* Cascade distribution offer */}
      {cascadeOffer && (
        <div className="shrink-0 mx-3 mb-2 mt-1 rounded-xl border border-zinc-200 bg-white shadow-md p-3 flex flex-col gap-2">
          <p className="text-xs text-zinc-700 leading-relaxed">
            <span className="font-medium">{cascadeOffer.unfitCount} ürün</span> birincil araca
            sığmadı. <span className="font-medium">{cascadeOffer.nextVehicleName}</span>&apos;a
            otomatik dağıtmak ister misiniz?
          </p>
          <div className="flex items-center gap-2 justify-end">
            <button
              onClick={dismissCascade}
              className="text-xs text-zinc-400 hover:text-zinc-600 transition-colors px-2 py-1"
            >
              Hayır
            </button>
            <Button
              size="sm"
              className="h-7 text-xs bg-zinc-900 text-white hover:bg-zinc-700"
              onClick={() => {
                const before = usePlanStore.getState().unfitItems.length;
                acceptCascade();
                const after = usePlanStore.getState().unfitItems.length;
                const distributed = before - after;
                if (distributed > 0) {
                  toast.success(
                    `${distributed} ürün ${cascadeOffer.nextVehicleName} aracına dağıtıldı.`,
                    { position: 'bottom-right' },
                  );
                } else {
                  toast.info(`Ürünler ${cascadeOffer.nextVehicleName} aracına da sığmadı.`, {
                    position: 'bottom-right',
                  });
                }
              }}
            >
              Evet, Dağıt
            </Button>
          </div>
        </div>
      )}

      {import.meta.env.DEV && (
        <div className="shrink-0 border-t border-border px-3 py-2 flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="flex-1 h-7 text-xs"
            onClick={() => mockPlacements(500)}
            title="500 random kutu enjekte et (yalnızca dev)"
          >
            Stres Testi (500)
          </Button>
          {placements.length > 0 && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 text-xs text-muted-foreground"
              onClick={() => setPlacements([])}
              title="Tüm placements'ları temizle"
            >
              Temizle
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
