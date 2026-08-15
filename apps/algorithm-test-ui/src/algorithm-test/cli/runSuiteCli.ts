import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import axios, { type AxiosInstance } from 'axios';
import { fromApiItem, paginatedItemsApiSchema } from '@/lib/api/itemMappers';
import { fromApiVehicleListItem, vehicleListApiItemSchema } from '@/lib/api/vehicleMappers';
import type { Item } from '@/lib/types/item';
import type { OptimizationCriteria } from '@/lib/types/loadingPlan';
import type { Vehicle } from '@/lib/types/vehicle';
import { CRITERIA_LABEL } from '../criteria';
import { runSuite } from '../suite/runSuite';
import { createHttpSuiteClient } from '../suite/suiteClient';
import {
  buildMarkdownSummary,
  buildSuiteReport,
  parseSuiteRun,
  serializeReport,
  suiteReportFileName,
} from '../suite/suiteReport';
import { aggregateFor, type SuiteRun } from '../utils/suiteStorage';
import {
  CliUsageError,
  EXIT_CODES,
  USAGE,
  isHelpRequested,
  parseCliOptions,
  resolveExitCode,
  type CliOptions,
  type ExitCode,
} from './cliOptions';

/**
 * Toplu koşunun komut satırı kapısı.
 *
 * Arayüz bir insanın senaryoyu incelemesi için; loop otomatik olmak zorunda.
 * Bu araç aynı motoru (`suite/runSuite.ts`) tarayıcısız koşturur, raporu diske
 * yazar ve regresyonda sıfırdan farklı bir çıkış kodu döner.
 *
 * Sözleşme (bayraklar, varsayılanlar, çıkış kodları) `cliOptions.ts`'te ve
 * ayrıca test ediliyor — CI'ın dayandığı şey o.
 */

async function login(http: AxiosInstance, options: CliOptions): Promise<void> {
  const { data } = await http.post<{
    isSuccess?: boolean;
    message?: string;
    data?: { accessToken: string; companyId: string };
  }>('/api/v1/auth/login', { email: options.email, password: options.password });

  if (!data.data?.accessToken) throw new Error(data.message ?? 'Giriş başarısız');

  http.defaults.headers.common.Authorization = `Bearer ${data.data.accessToken}`;
  if (data.data.companyId) http.defaults.headers.common['X-Company-Id'] = data.data.companyId;
}

async function fetchCatalog(
  http: AxiosInstance,
  pageSize: number,
): Promise<{ vehicles: Vehicle[]; items: Item[] }> {
  const [itemsResponse, vehiclesResponse] = await Promise.all([
    http.get<unknown>(`/api/v1/items?pageSize=${pageSize}`),
    http.get<unknown>(`/api/v1/vehicles?isDeleted=false&pageSize=${pageSize}`),
  ]);

  const items = paginatedItemsApiSchema.parse(itemsResponse.data).data.items.map(fromApiItem);

  const rawVehicles = (vehiclesResponse.data as { data?: { items?: unknown } })?.data?.items;
  const vehicles: Vehicle[] = [];
  if (Array.isArray(rawVehicles)) {
    for (const raw of rawVehicles) {
      const parsed = vehicleListApiItemSchema.safeParse(raw);
      if (parsed.success) vehicles.push(fromApiVehicleListItem(parsed.data));
    }
  }

  return { vehicles, items };
}

function loadBaseline(baselinePath: string | null): SuiteRun | null {
  if (!baselinePath) return null;

  const run = parseSuiteRun(readFileSync(baselinePath, 'utf8'));
  if (!run) throw new CliUsageError(`Referans koşu okunamadı ya da şemaya uymuyor: ${baselinePath}`);
  return run;
}

function printSummary(run: SuiteRun, criteria: OptimizationCriteria): void {
  const aggregate = aggregateFor(run, criteria);
  const percent = (value: number | null) => (value !== null ? `%${value.toFixed(1)}` : '—');

  console.log(`\n── ${CRITERIA_LABEL[criteria]} ──`);
  console.log(`  senaryo            ${aggregate.scenarioCount} (hata: ${aggregate.errorCount})`);
  console.log(`  ortalama doluluk   ${percent(aggregate.meanFill)}`);
  console.log(`  en kötü doluluk    ${percent(aggregate.worstFill)}`);
  console.log(`  yerleşen oranı     ${percent(aggregate.placedRatio)}`);
  console.log(`  ihlalli senaryo    ${aggregate.scenariosWithFailures}`);

  for (const entry of aggregate.failuresByCheck) {
    console.log(`    - ${entry.id}: ${entry.scenarios} senaryo`);
  }
}

async function main(): Promise<ExitCode> {
  const argv = process.argv.slice(2);
  if (isHelpRequested(argv)) {
    console.log(USAGE);
    return EXIT_CODES.ok;
  }

  const options = parseCliOptions(argv, process.env);
  const baseline = loadBaseline(options.baselinePath);

  const http = axios.create({
    baseURL: options.baseUrl,
    timeout: options.timeoutMs,
    headers: { 'Content-Type': 'application/json' },
  });

  await login(http, options);
  const { vehicles, items } = await fetchCatalog(http, options.pageSize);
  console.log(`Katalog: ${vehicles.length} araç, ${items.length} ürün`);

  let lastLoggedPercent = -1;
  const outcome = await runSuite({
    seed: options.seed,
    count: options.count,
    vehicles,
    items,
    client: createHttpSuiteClient({
      post: (url, body) => http.post(url, body),
      get: (url) => http.get(url),
      delete: (url) => http.delete(url),
    }),
    concurrency: options.concurrency,
    engineVersion: options.engineVersion,
    onProgress: ({ completed, total }) => {
      // Her istekte satır basmak CI günlüğünü yüzlerce satırla doldururdu.
      const percent = total > 0 ? Math.floor((completed / total) * 10) * 10 : 0;
      if (percent !== lastLoggedPercent) {
        lastLoggedPercent = percent;
        console.log(`  %${percent} (${completed}/${total})`);
      }
    },
  });

  if (outcome.status !== 'ok') {
    console.error(`Koşu tamamlanamadı: ${outcome.status}`);
    return EXIT_CODES.usageOrConnection;
  }

  const report = buildSuiteReport({
    run: outcome.run,
    previous: baseline,
    criteria: options.criteria,
    generatedAt: new Date().toISOString(),
  });

  mkdirSync(options.outDir, { recursive: true });
  const reportPath = path.join(options.outDir, suiteReportFileName(outcome.run));
  writeFileSync(reportPath, serializeReport(report), 'utf8');

  printSummary(outcome.run, options.criteria);

  console.log('\n── Kriter etkinliği ──');
  for (const result of report.effectiveness) {
    console.log(`  [${result.verdict}] ${result.label}: ${result.detail}`);
  }

  console.log('\n── Kapı ──');
  console.log(
    report.gate.comparedTo === null
      ? '  Referans koşu yok; yalnızca mutlak kurallar uygulandı.'
      : `  Referans: ${report.gate.comparedTo}`,
  );
  for (const violation of report.gate.violations) {
    console.log(`  ✗ ${violation.label}: ${violation.detail}`);
  }
  console.log(`  Sonuç: ${report.gate.passed ? 'GEÇTİ' : 'KALDI'}`);

  console.log(`\nRapor: ${reportPath}`);

  // CI bağlamında raporu iki yere daha bırak: sonraki adımların okuyabileceği bir
  // çıktı değişkeni ve işin özet ekranı. Gece koşan bir işin sonucunu görmek için
  // JSON indirmek gerekmesin.
  if (process.env.GITHUB_OUTPUT) {
    writeFileSync(process.env.GITHUB_OUTPUT, `report-path=${reportPath}\n`, { flag: 'a' });
  }
  if (process.env.GITHUB_STEP_SUMMARY) {
    writeFileSync(process.env.GITHUB_STEP_SUMMARY, buildMarkdownSummary(report), { flag: 'a' });
  }

  return resolveExitCode({ gatePassed: report.gate.passed, applyGate: options.applyGate });
}

main()
  .then((code) => {
    process.exitCode = code;
  })
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error));
    if (error instanceof CliUsageError) console.error(`\n${USAGE}`);
    process.exitCode = EXIT_CODES.usageOrConnection;
  });
