import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { AlgorithmRun } from '../hooks/useAlgorithmTestRun';
import { CRITERIA_LABEL } from '../hooks/useCriteriaMatrixRun';
import { cogLevel, type CogLevel } from './PlacementCanvas2D';

interface RunSummaryProps {
  run: AlgorithmRun | null;
  error: string | null;
  onDismissError: () => void;
}

const COG_LEVEL_LABEL: Record<CogLevel, string> = {
  ideal: 'ideal',
  dikkat: 'dikkat',
  riskli: 'riskli',
  kritik: 'kritik',
};

/** Sapma bandı 'ideal' değilse dikkat çekmeli; ideal olan sessiz kalır. */
function cogBadgeVariant(level: CogLevel) {
  return level === 'ideal' ? 'outline' : 'destructive';
}

/**
 * Ağırlık merkezi ve sapma bandı. Denge yalnızca X ve Z'de değerlendirilir —
 * motorun denge teriminde Y ekseni yok (BalanceScoring.cs:24-55).
 */
function CogReadout({ cog, vehicle }: { cog: NonNullable<AlgorithmRun['cog']>; vehicle: NonNullable<AlgorithmRun['vehicle']> }) {
  const axes = [
    { key: 'X', value: cog.x, span: vehicle.width },
    { key: 'Z', value: cog.z, span: vehicle.length },
  ];

  return (
    <>
      <span className="text-muted-foreground">
        CoG{' '}
        <span className="font-mono text-foreground">
          {cog.x.toFixed(0)}, {cog.y.toFixed(0)}, {cog.z.toFixed(0)}
        </span>{' '}
        cm
      </span>
      {axes.map(({ key, value, span }) => {
        const level = cogLevel((value - span / 2) / span);
        return (
          <Badge key={key} variant={cogBadgeVariant(level)}>
            {key} sapma {COG_LEVEL_LABEL[level]}
          </Badge>
        );
      })}
    </>
  );
}

export function RunSummary({ run, error, onDismissError }: RunSummaryProps) {
  if (error) {
    return (
      <Card className="border-destructive/50">
        <CardContent className="flex items-center gap-3 p-4 text-sm text-destructive">
          <span className="min-w-0 flex-1">{error}</span>
          <Button type="button" size="sm" variant="ghost" onClick={onDismissError}>
            Kapat
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!run) {
    return (
      <Card>
        <CardContent className="p-4 text-sm text-muted-foreground">
          Bir araç ve en az bir ürün seçip matrisi çalıştırın.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="flex flex-wrap items-center gap-x-4 gap-y-2 p-4 text-sm">
        <Badge variant="secondary">{CRITERIA_LABEL[run.criteria]}</Badge>
        <span className="text-muted-foreground">
          Plan <span className="font-mono text-foreground">{run.planId.slice(0, 8)}</span>
        </span>
        {run.totalWeight !== null && (
          <span className="text-muted-foreground">
            Yük <span className="font-medium text-foreground">{run.totalWeight} kg</span>
          </span>
        )}
        {run.vehicle && (
          <span className="text-muted-foreground">
            Araç <span className="text-foreground">{run.vehicle.name}</span>
          </span>
        )}

        {run.cog && run.vehicle && <CogReadout cog={run.cog} vehicle={run.vehicle} />}

        <span className="ml-auto text-xs text-muted-foreground">
          Bu koşunun yerleşimi aşağıda gösteriliyor
        </span>
      </CardContent>
    </Card>
  );
}
