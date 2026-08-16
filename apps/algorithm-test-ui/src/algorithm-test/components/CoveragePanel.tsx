import { Badge } from '@/components/ui/badge';
import { SectionCard } from '@/components/shared/AppShell';
import type { CoverageRow } from '../utils/catalogCoverage';

/**
 * Motorun hangi kısıt dallarının test edilebilir olduğu.
 *
 * Sonucun şerhi olduğu için toplu koşunun yanında duruyor: boş dal, o dalın
 * geçtiği değil hiç koşulmadığı anlamına gelir ve yeşil bir kapıyı olduğundan
 * geniş okutur. Ayrı sayfadayken hem bakmayı hatırlamak gerekiyordu hem de
 * gösterdiği şey koşunun kapsamı değil, o anki kataloğun kapsamıydı.
 *
 * Satırlar dışarıdan verilir: koşu varsa kaydındaki sayılar (koşu anındaki
 * katalog), yoksa canlı katalogdan hesaplananlar.
 */
interface CoveragePanelProps {
  rows: readonly CoverageRow[];
  /** Sayıların koşu kaydından mı yoksa güncel katalogdan mı geldiği. */
  source: 'run' | 'catalog';
}

export function CoveragePanel({ rows, source }: CoveragePanelProps) {
  const uncovered = rows.filter((row) => row.count === 0).length;

  return (
    <SectionCard
      title="Kısıt kapsamı"
      meta={
        <span className="font-mono text-xs tabular-nums text-muted-foreground">
          {uncovered > 0 ? `${uncovered}/${rows.length} dal boş` : `${rows.length} dal kapsandı`}
        </span>
      }
    >
      <div className="flex flex-col gap-1">
        {rows.map((row) => (
          <div key={row.key} className="flex items-center gap-2 text-xs" title={row.sourceRef}>
            <span className="min-w-0 flex-1 truncate text-foreground">{row.label}</span>
            {row.count > 0 ? (
              <span className="shrink-0 font-mono tabular-nums text-muted-foreground">
                {row.count} ürün
              </span>
            ) : (
              <Badge variant="outline" className="shrink-0 text-muted-foreground">
                ürün yok
              </Badge>
            )}
          </div>
        ))}

        <p className="pt-2 text-xs leading-relaxed text-muted-foreground">
          {source === 'run'
            ? 'Bu koşu anındaki katalog. Boş dallar koşulmadı — o dalın geçtiği anlamına gelmez.'
            : 'Güncel katalog. Boş dalı denemek için ilgili kısıta sahip bir ürünü üretim uygulamasında oluşturun.'}
        </p>
      </div>
    </SectionCard>
  );
}
