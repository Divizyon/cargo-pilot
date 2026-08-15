import { Card, CardContent } from '@/components/ui/card';
import { SectionCard } from '@/components/shared/AppShell';
import { cn } from '@/lib/utils';
import type { EffectivenessResult } from '../suite/criteriaEffectiveness';
import type { GateResult } from '../suite/regressionGate';

/**
 * Koşunun kararı ve dayanağı.
 *
 * Karar eskiden kartın köşesinde küçük bir rozetti; sayfadaki en büyük yazı
 * deltalardan biriydi. Şimdi karar şeridi başta ve kapsamı yazıyor — kapı
 * seçili kritere göre hesaplanır (`regressionGate.ts`), oysa aynı kartta duran
 * kriter etkinliği koşunun tamamına aittir. İki farklı kapsam tek kartta
 * okununca "kaldı" hangi kritere ait belirsiz kalıyordu; etkinlik ayrı karta
 * taşındı.
 */
interface SuiteGatePanelProps {
  /** Koşu yokken `null`: kart boş iskeletiyle durur, sonradan belirmez. */
  gate: GateResult | null;
  /** Kapının hangi kritere göre hesaplandığı. */
  criteriaLabel: string;
  referenceLabel: string | null;
}

function signed(value: number | null, unit = ' puan'): string {
  if (value === null) return '—';
  return `${value > 0 ? '+' : '−'}${Math.abs(value).toFixed(1)}${unit}`;
}

/** Karar şeridinin tek satırlık gerekçesi: neden kaldı, ya da neye bakılarak geçti. */
function verdictReason(gate: GateResult | null): string {
  if (gate === null) {
    return 'Aynı tohum her zaman aynı senaryoları üretir; motoru değiştirip aynı tohumla tekrar koşun, fark burada çıkar.';
  }
  if (gate.violations.length > 0) {
    const [first, ...rest] = gate.violations;
    const more = rest.length > 0 ? ` · +${rest.length} bulgu daha` : '';
    return `${first.label} — ${first.detail}${more}`;
  }
  if (gate.comparison === null) {
    return 'Referans koşu yok — yalnızca kural ihlali ve kriter etkinliği denetlendi.';
  }
  return `${gate.comparison.improved} senaryo iyileşti, ${gate.comparison.regressed} geriledi, kural ihlali yok.`;
}

export function SuiteGatePanel({ gate, criteriaLabel, referenceLabel }: SuiteGatePanelProps) {
  const comparison = gate?.comparison ?? null;

  return (
    <Card className="overflow-hidden">
      {/* Durum rengi yazının ve zeminin kendisinde; karara ayrıca renkli bir
          şerit çekmek aynı bilgiyi üçüncü kez söylemek olurdu. */}
      <div
        className={cn(
          'flex flex-col gap-1 border-b border-border px-4 py-3',
          gate === null ? 'bg-muted/30' : gate.passed ? 'bg-state-pass/5' : 'bg-destructive/5',
        )}
      >
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span
            className={cn(
              'text-2xl font-bold tracking-tight',
              gate === null
                ? 'text-muted-foreground'
                : gate.passed
                  ? 'text-state-pass'
                  : 'text-destructive',
            )}
          >
            {gate === null ? 'KOŞU YOK' : gate.passed ? 'GEÇTİ' : 'KALDI'}
          </span>
          <span className="text-sm text-muted-foreground">
            {criteriaLabel} kriterine göre
            {referenceLabel ? ` · referans ${referenceLabel}` : ''}
          </span>
        </div>
        <p className="text-sm text-foreground">{verdictReason(gate)}</p>
      </div>

      <CardContent className="flex flex-col gap-4 p-4">
        {gate !== null && gate.violations.length > 0 && (
          <ul className="flex flex-col gap-1">
            {gate.violations.map((violation, index) => (
              <li key={`${violation.id}-${index}`} className="flex flex-wrap gap-x-2 text-sm">
                <span className="font-medium text-destructive">{violation.label}</span>
                <span className="text-muted-foreground">{violation.detail}</span>
              </li>
            ))}
          </ul>
        )}

        {/* Ölçüm yuvaları koşudan önce de durur; dolan şey yalnızca sayılar. */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Metric
            label="Ortalama doluluk"
            value={signed(comparison?.meanFill ?? null)}
            improved={comparison?.meanFill == null ? null : comparison.meanFill > 0}
          />
          <Metric
            label="En kötü senaryo"
            value={signed(comparison?.worstFill ?? null)}
            improved={comparison?.worstFill == null ? null : comparison.worstFill > 0}
          />
          <Metric
            label="Yerleşen oranı"
            value={signed(comparison?.placedRatio ?? null)}
            improved={comparison?.placedRatio == null ? null : comparison.placedRatio > 0}
          />
          <Metric
            label="İhlalli senaryo"
            value={
              comparison === null
                ? '—'
                : comparison.failures === 0
                  ? 'değişmedi'
                  : signed(comparison.failures, ' senaryo')
            }
            improved={
              comparison === null || comparison.failures === 0 ? null : comparison.failures < 0
            }
          />
        </div>

        {comparison ? (
          // Ortalama tek başına yanıltıcı: sabit görünürken bir senaryo
          // iyileşip başkası gerilemiş olabilir.
          <div className="flex flex-wrap gap-x-5 gap-y-1 border-t pt-3 font-mono text-sm tabular-nums">
            <span className="text-state-pass">{comparison.improved} iyileşti</span>
            <span className={cn(comparison.regressed > 0 && 'text-destructive')}>
              {comparison.regressed} geriledi
            </span>
            <span className="text-muted-foreground">{comparison.unchanged} değişmedi</span>
          </div>
        ) : (
          <p className="border-t pt-3 text-sm text-muted-foreground">
            Aynı tohum, katalog ve senaryo üretimiyle ikinci bir koşu yapıldığında karşılaştırma
            ölçümleri burada çıkar.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function Metric({
  label,
  value,
  improved,
}: {
  label: string;
  value: string;
  improved: boolean | null;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span
        className={cn(
          'font-mono text-xl tabular-nums',
          improved === null && 'text-foreground',
          improved === true && 'text-state-pass',
          improved === false && 'text-destructive',
        )}
      >
        {value}
      </span>
    </div>
  );
}

const VERDICT_STYLE: Record<EffectivenessResult['verdict'], string> = {
  pass: 'bg-state-pass',
  fail: 'bg-destructive',
  inconclusive: 'bg-muted-foreground/40',
};

const VERDICT_LABEL: Record<EffectivenessResult['verdict'], string> = {
  pass: 'geçti',
  fail: 'kaldı',
  inconclusive: 'ölçülemedi',
};

/**
 * Kriterin kendi işini yapıp yapmadığı: hacim kriteri en yüksek dolulukta,
 * denge kriteri en düşük sapmada olmalı. Kapıdan ayrı okunur ve **koşunun
 * tamamına** bakar — "ölçülemedi" ihlal değil, örneklemin küçük olduğunun
 * bildirimidir.
 */
export function CriteriaEffectivenessPanel({
  effectiveness,
}: {
  effectiveness: readonly EffectivenessResult[];
}) {
  return (
    <SectionCard
      title="Kriter etkinliği"
      meta={<span className="text-xs text-muted-foreground">tüm koşu</span>}
    >
      <div className="flex flex-col gap-1.5">
        {effectiveness.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Kriterlerin kendi işini yapıp yapmadığı koşudan sonra ölçülür.
          </p>
        )}
        {effectiveness.map((result) => (
          <div key={result.id} className="flex flex-wrap items-baseline gap-2 text-sm">
            <span
              className={cn('size-2 shrink-0 self-center rounded-full', VERDICT_STYLE[result.verdict])}
              aria-hidden
            />
            <span className="text-foreground">{result.label}</span>
            <span className="text-xs text-muted-foreground">{VERDICT_LABEL[result.verdict]}</span>
            <span className="font-mono text-xs tabular-nums text-muted-foreground">
              {result.detail}
            </span>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}
