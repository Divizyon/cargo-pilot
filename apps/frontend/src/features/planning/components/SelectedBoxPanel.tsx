import type { ReactNode } from 'react';
import { Lock, X } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { useBoxSelection } from '@/lib/three/useBoxSelection';
import { usePlanStore } from '@/lib/store/usePlanStore';
import {
  BOX_ORIENTATIONS,
  isOrientationAllowed,
  type OrientationIndex,
} from '@/lib/utils/boxOrientations';
import type { Item } from '@/lib/types/item';

const ORIENTATION_LIST: readonly OrientationIndex[] = [0, 1, 2, 3, 4, 5] as const;

// Yere değen yüz fill-zinc-900, diğer 5 yüz stroke-only.
// İzometrik kübün 3 görünür yüzü: top (üst), front (ön), right (sağ).
// "Down face" hangisi olursa, izometrik view'de o yüzü göstermek için bütün kübü
// uygun rotasyonla çizmek yerine, basit bir vurgulamayla "yere değen yüz" işaretleniyor.
function FacePreviewIcon({ idx }: { idx: OrientationIndex }) {
  // Üç vizible face (top/front/right) için ayrı path'ler. idx → hangisi vurgulanmalı.
  // Mapping: alt yüz (idx 0) → top yüzünün altı = bottom; üst (idx 1) → top vurgulu; ön (idx 2) →
  // front vurgulu; arka (idx 3) → bizim için soluk vurgu (görünmüyor); sol (idx 4) → sol vurgu;
  // sağ (idx 5) → right vurgu. UX: "yere değen yüz" sembolik gösterim.
  // Pratik çözüm: her idx için izometrik kübün tabanına küçük bir "ground" göstergesi koyuyoruz.
  const groundColor = '#18181b'; // zinc-900
  const stroke = '#71717a'; // zinc-500

  const facePaths: Record<OrientationIndex, ReactNode> = {
    0: (
      <>
        {/* Alt yüz altta: izometrik standart pozisyon */}
        <polygon points="12,4 20,8 20,16 12,20 4,16 4,8" fill="none" stroke={stroke} />
        <polyline points="4,8 12,12 20,8" fill="none" stroke={stroke} />
        <line x1="12" y1="12" x2="12" y2="20" stroke={stroke} />
        <line x1="4" y1="18" x2="20" y2="18" stroke={groundColor} strokeWidth="1.5" />
      </>
    ),
    1: (
      <>
        {/* Üst yüz altta: yere değen taban — ters kuvvet vurgusu */}
        <polygon points="12,4 20,8 20,16 12,20 4,16 4,8" fill="none" stroke={stroke} />
        <polygon points="12,4 20,8 12,12 4,8" fill={groundColor} stroke={groundColor} />
      </>
    ),
    2: (
      <>
        {/* Ön yüz altta: ön yüzey vurgulu */}
        <polygon points="12,4 20,8 20,16 12,20 4,16 4,8" fill="none" stroke={stroke} />
        <polygon points="4,8 12,12 12,20 4,16" fill={groundColor} stroke={groundColor} />
      </>
    ),
    3: (
      <>
        {/* Arka yüz altta: arka yüzey vurgu (öndekinden farklı sembol) */}
        <polygon points="12,4 20,8 20,16 12,20 4,16 4,8" fill="none" stroke={stroke} />
        <polygon points="12,4 20,8 12,12 4,8" fill="none" stroke={groundColor} strokeWidth="1.5" />
        <line x1="4" y1="8" x2="12" y2="4" stroke={groundColor} strokeWidth="1.5" />
      </>
    ),
    4: (
      <>
        {/* Sol yüz altta: sol yüzey vurgu */}
        <polygon points="12,4 20,8 20,16 12,20 4,16 4,8" fill="none" stroke={stroke} />
        <polygon points="4,8 12,12 12,20 4,16" fill="none" stroke={groundColor} strokeWidth="1.5" />
      </>
    ),
    5: (
      <>
        {/* Sağ yüz altta: sağ yüzey vurgulu */}
        <polygon points="12,4 20,8 20,16 12,20 4,16 4,8" fill="none" stroke={stroke} />
        <polygon points="12,12 20,8 20,16 12,20" fill={groundColor} stroke={groundColor} />
      </>
    ),
  };

  return (
    <svg
      viewBox="0 0 24 24"
      width="24"
      height="24"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="shrink-0"
    >
      {facePaths[idx]}
    </svg>
  );
}

interface OrientationButtonProps {
  idx: OrientationIndex;
  active: boolean;
  disabled: boolean;
  onClick: () => void;
}

function OrientationButton({ idx, active, disabled, onClick }: OrientationButtonProps) {
  const def = BOX_ORIENTATIONS[idx];
  const tooltipMsg = disabled ? 'Bu ürün için bu dönüş kısıtlanmış' : def.label;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={onClick}
          disabled={disabled}
          aria-label={def.label}
          aria-pressed={active}
          className={cn(
            'relative flex aspect-square items-center justify-center rounded-md border transition-colors',
            active
              ? 'border-foreground bg-foreground text-background'
              : 'border-border bg-background text-foreground hover:bg-accent',
            disabled && 'cursor-not-allowed opacity-50',
          )}
        >
          <FacePreviewIcon idx={idx} />
          {disabled && (
            <Lock
              className="absolute right-1 top-1 h-3 w-3 text-muted-foreground"
              strokeWidth={2.5}
            />
          )}
        </button>
      </TooltipTrigger>
      <TooltipContent>{tooltipMsg}</TooltipContent>
    </Tooltip>
  );
}

interface SelectedBoxSummaryProps {
  item: Item;
  width: number;
  height: number;
  depth: number;
  isViolation: boolean;
}

function SelectedBoxSummary({ item, width, height, depth, isViolation }: SelectedBoxSummaryProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-2">
        <p className="truncate text-sm font-semibold text-foreground">{item.name}</p>
        <span className="shrink-0 text-xs text-muted-foreground">{item.sku}</span>
      </div>
      <div className="grid grid-cols-3 gap-2 rounded-md bg-muted/40 p-2 text-center">
        <div>
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Genişlik</p>
          <p className="text-xs font-medium text-foreground">{width} cm</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Yükseklik</p>
          <p className="text-xs font-medium text-foreground">{height} cm</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Derinlik</p>
          <p className="text-xs font-medium text-foreground">{depth} cm</p>
        </div>
      </div>
      {isViolation && (
        <p className="rounded-md bg-rose-50 px-2 py-1.5 text-xs text-rose-700">
          Bu yön konteyner sınırını veya başka bir kutuyu ihlal ediyor.
        </p>
      )}
    </div>
  );
}

export function SelectedBoxPanel() {
  const { selected, clear } = useBoxSelection();
  const setOrientation = usePlanStore((s) => s.setOrientation);

  if (!selected) return null;

  const { instanceId, placement, item } = selected;

  return (
    <TooltipProvider delayDuration={120}>
      <div className="border-t border-border px-4 py-3">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-sm text-foreground">Seçili Kutu</span>
          <button
            type="button"
            onClick={clear}
            title="Seçimi kaldır"
            className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        <SelectedBoxSummary
          item={item}
          width={placement.width}
          height={placement.height}
          depth={placement.depth}
          isViolation={placement.isViolation}
        />

        <div className="mt-3">
          <p className="mb-2 text-xs font-medium text-muted-foreground">Yön (yere değen yüz)</p>
          <div className="grid grid-cols-3 gap-2">
            {ORIENTATION_LIST.map((idx) => (
              <OrientationButton
                key={idx}
                idx={idx}
                active={placement.orientationIndex === idx}
                disabled={!isOrientationAllowed(item, idx)}
                onClick={() => setOrientation(instanceId, idx)}
              />
            ))}
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
