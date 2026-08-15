import type { OptimizationCriteria } from '@/lib/types/loadingPlan';
import { isOptimizationCriteria } from '../criteria';

/**
 * Komut satırı sözleşmesi: bayraklar, varsayılanlar ve çıkış kodları.
 *
 * Ayrı ve saf bir modülde duruyor çünkü CI'ın dayandığı şey bu sözleşme. Bir
 * betik `npm run suite` çağırıp çıkış koduna bakıyorsa, o kodun hangi durumda ne
 * olduğu test edilebilir olmak zorunda — ağ çağrısı kurmadan.
 */

export const EXIT_CODES = {
  /** Kapı geçti (ya da --no-gate verildi). */
  ok: 0,
  /** Koşu tamamlandı ama regresyon kapısı düştü. */
  gateFailed: 1,
  /** Kullanım hatası, bağlantı hatası ya da koşunun hiç tamamlanamaması. */
  usageOrConnection: 2,
} as const;

export type ExitCode = (typeof EXIT_CODES)[keyof typeof EXIT_CODES];

export const DEFAULTS = {
  seed: 1,
  count: 25,
  criteria: 2,
  concurrency: 4,
  pageSize: 100,
  outDir: 'reports',
  timeoutMs: 60_000,
} as const;

export interface CliOptions {
  seed: number;
  count: number;
  baseUrl: string;
  email: string;
  password: string;
  timeoutMs: number;
  engineVersion: string | null;
  outDir: string;
  baselinePath: string | null;
  criteria: OptimizationCriteria;
  concurrency: number;
  pageSize: number;
  applyGate: boolean;
}

export const USAGE = `
Kullanım: npm run suite -- [seçenekler]

  --seed <n>              Tohum (varsayılan ${DEFAULTS.seed})
  --count <n>             Senaryo sayısı (varsayılan ${DEFAULTS.count})
  --criteria <0|1|2>      Kapı kriteri: 0=LIFO 1=Denge 2=Hacim (varsayılan ${DEFAULTS.criteria})
  --engine-version <s>    Rapora yazılacak motor sürümü/commit
  --baseline <dosya>      Karşılaştırılacak önceki rapor ya da koşu JSON'u
  --out <dizin>           Rapor dizini (varsayılan ${DEFAULTS.outDir})
  --concurrency <n>       Eşzamanlı istek (varsayılan ${DEFAULTS.concurrency})
  --page-size <n>         Katalog sayfa boyutu (varsayılan ${DEFAULTS.pageSize})
  --base-url <url>        Backend kök adresi
  --no-gate               Kapıyı uygulama; regresyonda da ${EXIT_CODES.ok} dön

Ortam değişkenleri:
  CARGO_PILOT_API_URL, CARGO_PILOT_EMAIL, CARGO_PILOT_PASSWORD
  CARGO_PILOT_API_TIMEOUT_MS (varsayılan ${DEFAULTS.timeoutMs})

Çıkış kodları:
  ${EXIT_CODES.ok} geçti · ${EXIT_CODES.gateFailed} kapı düştü · ${EXIT_CODES.usageOrConnection} kullanım/bağlantı hatası
`.trim();

/** Kullanım hatası; çağıran bunu `usageOrConnection` koduna çevirir. */
export class CliUsageError extends Error {}

export type CliEnv = Record<string, string | undefined>;

function readFlag(argv: readonly string[], name: string): string | undefined {
  const index = argv.indexOf(`--${name}`);
  if (index === -1) return undefined;
  const value = argv[index + 1];
  // Bayrağın hemen ardından başka bir bayrak geliyorsa değer verilmemiş demektir.
  return value !== undefined && !value.startsWith('--') ? value : undefined;
}

function readNumber(argv: readonly string[], name: string, fallback: number): number {
  const raw = readFlag(argv, name);
  if (raw === undefined) return fallback;

  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) throw new CliUsageError(`--${name} sayı olmalı (verilen: ${raw})`);
  return parsed;
}

function readPositive(argv: readonly string[], name: string, fallback: number): number {
  const value = readNumber(argv, name, fallback);
  if (value < 1) throw new CliUsageError(`--${name} en az 1 olmalı (verilen: ${value})`);
  return value;
}

export function isHelpRequested(argv: readonly string[]): boolean {
  return argv.includes('--help') || argv.includes('-h');
}

/**
 * Parola yalnızca ortamdan okunur: komut satırına yazılan parola kabuk geçmişine
 * ve CI günlüğündeki komut satırına düşer.
 */
export function parseCliOptions(argv: readonly string[], env: CliEnv): CliOptions {
  const criteria = readNumber(argv, 'criteria', DEFAULTS.criteria);
  if (!isOptimizationCriteria(criteria)) {
    throw new CliUsageError(`--criteria 0, 1 ya da 2 olmalı (verilen: ${criteria})`);
  }

  const baseUrl = readFlag(argv, 'base-url') ?? env.CARGO_PILOT_API_URL ?? '';
  const email = readFlag(argv, 'email') ?? env.CARGO_PILOT_EMAIL ?? '';
  const password = env.CARGO_PILOT_PASSWORD ?? '';

  if (!baseUrl) {
    throw new CliUsageError('Backend adresi yok: --base-url ya da CARGO_PILOT_API_URL verin');
  }
  if (!email || !password) {
    throw new CliUsageError('Giriş bilgisi yok: CARGO_PILOT_EMAIL ve CARGO_PILOT_PASSWORD verin');
  }

  return {
    seed: readNumber(argv, 'seed', DEFAULTS.seed),
    count: readPositive(argv, 'count', DEFAULTS.count),
    baseUrl,
    email,
    password,
    timeoutMs: Number(env.CARGO_PILOT_API_TIMEOUT_MS ?? DEFAULTS.timeoutMs),
    engineVersion: readFlag(argv, 'engine-version') ?? null,
    outDir: readFlag(argv, 'out') ?? DEFAULTS.outDir,
    baselinePath: readFlag(argv, 'baseline') ?? null,
    criteria,
    concurrency: readPositive(argv, 'concurrency', DEFAULTS.concurrency),
    pageSize: readPositive(argv, 'page-size', DEFAULTS.pageSize),
    applyGate: !argv.includes('--no-gate'),
  };
}

/**
 * Kapının kararını çıkış koduna çevirir.
 *
 * `--no-gate` yalnızca KODU bastırır, kapıyı değil: rapor yine düştüğünü söyler.
 * Amaç, henüz eşik tutturamayan bir ortamda ölçüme devam edebilmek.
 */
export function resolveExitCode(input: { gatePassed: boolean; applyGate: boolean }): ExitCode {
  if (!input.applyGate) return EXIT_CODES.ok;
  return input.gatePassed ? EXIT_CODES.ok : EXIT_CODES.gateFailed;
}
