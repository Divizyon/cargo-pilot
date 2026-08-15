import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ROTATION_LABEL, type Placement } from '@/lib/types/loadingPlan';
import type { Vehicle } from '@/lib/types/vehicle';
import type { LifoZone } from '../verification/lifoZones';
import {
  PlacementCanvas2D,
  VIEW_CONFIG,
  type CogPoint,
  type ProjectionView,
} from './PlacementCanvas2D';

const VIEW_ORDER: ProjectionView[] = ['side', 'plan', 'front'];

interface PlacementViewerProps {
  placements: Placement[];
  vehicle: Vehicle | null;
  itemNameById?: Map<string, string>;
  cog?: CogPoint | null;
  zones?: readonly LifoZone[];
  highlightedIndices?: readonly number[] | null;
}

/** Görünüm ve kutu seçimi burada tutulur; canvas saf çizici kalır. */
export function PlacementViewer({
  placements,
  vehicle,
  itemNameById,
  cog = null,
  zones = [],
  highlightedIndices = null,
}: PlacementViewerProps) {
  const [view, setView] = useState<ProjectionView>('side');
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  useEffect(() => {
    setSelectedIndex(null);
  }, [placements]);

  const selected = selectedIndex !== null ? placements[selectedIndex] : undefined;

  return (
    <Card className="flex min-h-0 flex-1 flex-col">
      <CardContent className="flex min-h-0 flex-1 flex-col gap-3 p-4">
        <div className="flex shrink-0 flex-wrap items-center gap-3">
          <Tabs value={view} onValueChange={(next) => setView(next as ProjectionView)}>
            <TabsList>
              {VIEW_ORDER.map((candidate) => (
                <TabsTrigger key={candidate} value={candidate}>
                  {VIEW_CONFIG[candidate].label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          {zones.length > 0 && <Badge variant="outline">{zones.length} LIFO bölgesi</Badge>}

          <span className="ml-auto font-mono text-xs tabular-nums text-muted-foreground">
            {placements.length} kutu
          </span>
        </div>

        {/* Araç yokken de aynı yer tutulur; koşu gelince kart büyüyüp sayfayı
            zıplatmasın. */}
        {vehicle ? (
          <PlacementCanvas2D
            placements={placements}
            vehicle={vehicle}
            view={view}
            cog={cog}
            zones={zones}
            highlightedIndices={highlightedIndices}
            selectedIndex={selectedIndex}
            onSelect={setSelectedIndex}
          />
        ) : (
          <div className="flex min-h-0 flex-1 items-center justify-center rounded border border-dashed text-sm text-muted-foreground">
            Yerleşim burada çizilir
          </div>
        )}

        {selected ? (
          <div className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-1 rounded-md border bg-muted/40 px-3 py-2 text-xs">
            <span className="font-medium text-foreground">
              {itemNameById?.get(selected.itemId) ?? selected.itemId.slice(0, 8)}
            </span>
            <span className="text-muted-foreground">
              Konum{' '}
              <span className="font-mono tabular-nums text-foreground">
                {selected.positionX}, {selected.positionY}, {selected.positionZ}
              </span>{' '}
              cm
            </span>
            <span className="text-muted-foreground">
              Kenar{' '}
              <span className="font-mono tabular-nums text-foreground">
                {selected.width}×{selected.height}×{selected.depth}
              </span>
            </span>
            <span className="text-muted-foreground">
              Rotasyon{' '}
              <span className="text-foreground">
                {ROTATION_LABEL[selected.rotation] ?? selected.rotation}
              </span>
            </span>
            {selected.isViolation && <Badge variant="destructive">ihlal</Badge>}
          </div>
        ) : (
          <p className="shrink-0 text-xs text-muted-foreground">
            Kutuya tıklayarak konum, kenar uzunlukları ve seçilen rotasyonu görebilirsiniz.
            Konumlar sol-alt-arka köşedir.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
