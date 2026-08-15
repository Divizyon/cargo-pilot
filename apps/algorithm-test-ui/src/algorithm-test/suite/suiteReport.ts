import type { OptimizationCriteria } from '@/lib/types/loadingPlan';
import { CRITERIA_LABEL } from '../criteria';
import { aggregateFor, suiteRunSchema, type SuiteRun } from '../utils/suiteStorage';
import {
  evaluateCriteriaEffectiveness,
  type EffectivenessResult,
} from './criteriaEffectiveness';
import { evaluateGate, type GateResult, type GateThresholds } from './regressionGate';

/**
 * Dışa aktarılabilir koşu raporu.
 *
 * Toplu koşu kaydı `localStorage`'da yaşıyor: tek tarayıcı profiline bağlı,
 * sınırlı sayıda ve paylaşılamaz. Motorun aylar içindeki gidişatını izlemek için
 * koşunun dosyaya yazılabilmesi, PR'a eklenebilmesi ve sonraki koşuya referans
 * olarak geri verilebilmesi gerekiyor.
 *
 * Rapor koşunun kendisini AYNEN taşır; değerlendirme (kriter etkinliği, kapı)
 * türetilmiş veridir ve okunurken yeniden hesaplanabilir — yine de dosyaya
 * yazılır, çünkü rapor tek başına okunabilir olmalı.
 */

export interface SuiteReport {
  reportVersion: 1;
  generatedAt: string;
  /** Kapı ve karşılaştırmanın uygulandığı kriter. */
  criteria: OptimizationCriteria;
  criteriaLabel: string;
  run: SuiteRun;
  effectiveness: EffectivenessResult[];
  gate: GateResult;
}

export interface BuildSuiteReportInput {
  run: SuiteRun;
  previous?: SuiteRun | null;
  criteria: OptimizationCriteria;
  thresholds?: Partial<GateThresholds>;
  generatedAt: string;
}

export function buildSuiteReport({
  run,
  previous = null,
  criteria,
  thresholds,
  generatedAt,
}: BuildSuiteReportInput): SuiteReport {
  const effectiveness = evaluateCriteriaEffectiveness(run);

  return {
    reportVersion: 1,
    generatedAt,
    criteria,
    criteriaLabel: CRITERIA_LABEL[criteria],
    run,
    effectiveness,
    gate: evaluateGate({ run, previous, criteria, effectiveness, thresholds }),
  };
}

export function serializeReport(report: SuiteReport): string {
  return JSON.stringify(report, null, 2);
}

/**
 * Raporun okunabilir özeti (Markdown).
 *
 * CI'ın koşu özetine yazılır: gece koşan bir işin sonucunu görmek için JSON
 * indirip okumak gerekmemeli — kapının neden düştüğü işin ilk ekranında dursun.
 */
export function buildMarkdownSummary(report: SuiteReport): string {
  const aggregate = aggregateFor(report.run, report.criteria);
  const percent = (value: number | null) => (value !== null ? `%${value.toFixed(1)}` : '—');
  const signed = (value: number | null) =>
    value === null ? '—' : `${value > 0 ? '+' : '−'}${Math.abs(value).toFixed(2)}`;

  const lines = [
    `## Algoritma regresyon koşusu — ${report.gate.passed ? '✅ geçti' : '❌ kaldı'}`,
    '',
    `Tohum \`${report.run.seed}\` · ${report.run.requestedScenarios} senaryo · ` +
      `motor \`${report.run.engineVersion ?? 'belirtilmedi'}\` · kriter ${report.criteriaLabel}`,
    '',
    '| Ölçüm | Değer | Referansa göre |',
    '| --- | --- | --- |',
    `| Ortalama doluluk | ${percent(aggregate.meanFill)} | ${signed(report.gate.comparison?.meanFill ?? null)} |`,
    `| En kötü senaryo | ${percent(aggregate.worstFill)} | ${signed(report.gate.comparison?.worstFill ?? null)} |`,
    `| Yerleşen oranı | ${percent(aggregate.placedRatio)} | ${signed(report.gate.comparison?.placedRatio ?? null)} |`,
    `| İhlalli senaryo | ${aggregate.scenariosWithFailures} | ${signed(report.gate.comparison?.failures ?? null)} |`,
    `| Koşulamayan | ${aggregate.errorCount} | ${signed(report.gate.comparison?.errors ?? null)} |`,
    '',
  ];

  if (report.gate.comparedTo === null) {
    lines.push('> Referans koşu yok — yalnızca kural ihlali ve kriter etkinliği denetlendi.', '');
  }

  if (report.gate.violations.length > 0) {
    lines.push('### Kapıyı düşürenler', '');
    for (const violation of report.gate.violations) {
      lines.push(`- **${violation.label}** — ${violation.detail}`);
    }
    lines.push('');
  }

  lines.push('### Kriter etkinliği', '');
  for (const result of report.effectiveness) {
    const mark = result.verdict === 'pass' ? '✅' : result.verdict === 'fail' ? '❌' : '➖';
    lines.push(`- ${mark} **${result.label}** — ${result.detail}`);
  }

  return `${lines.join('\n')}\n`;
}

/** Dosya adı sıralanabilir olmalı: tohum + zaman, iki nokta olmadan. */
export function suiteReportFileName(run: SuiteRun): string {
  const stamp = run.completedAt.replace(/[:.]/g, '-');
  const engine = run.engineVersion ? `-${slug(run.engineVersion)}` : '';
  return `suite-seed${run.seed}${engine}-${stamp}.json`;
}

function slug(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40);
}

/**
 * Referans koşuyu okur. Hem rapor sarmalayıcısını hem çıplak koşu kaydını kabul
 * eder — elle kaydedilmiş bir koşu da referans olarak verilebilsin.
 */
export function parseSuiteRun(raw: string): SuiteRun | null {
  try {
    const parsed = JSON.parse(raw) as unknown;
    const candidate =
      parsed !== null && typeof parsed === 'object' && 'run' in parsed
        ? (parsed as { run: unknown }).run
        : parsed;

    const result = suiteRunSchema.safeParse(candidate);
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}
