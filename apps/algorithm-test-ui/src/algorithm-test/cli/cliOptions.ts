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
  /** Bench ucu; --fixtures kipinde varsayılan hedef. */
  benchUrl: 'http://127.0.0.1:5099',
  repeat: 1,
} as const;

export interface CliOptions {
  seed: number;
  /** Çok tohumlu koşu; `--seed-range a..b` verilmezse `[seed]`. */
  seeds: number[];
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
  /**
   * Fixture kipi: giriş yapılmaz, canlı katalog okunmaz, plan kalıcılığı yoktur.
   * İstekler bench ucuna gider. Ayrı bir --dry-run / --catalog bayrağı YOK;
   * kipin tamamı tek anahtarla açılır ki yarı-fixture bir koşu oluşamasın.
   */
  fixtures: boolean;
  benchUrl: string;
  /** Aynı koşuyu N kez tekrarla; damga farkı beklenmiyor. */
  repeat: number;
  /**
   * Sert kural ihlali olan senaryoları bu dizine yaz. Rapor yalnız sayı taşır;
   * "hangi kutu hangi kuralı kırdı" sorusu ancak girdi + yerleşim elde olunca
   * yanıtlanır ve koşu bitince o veri kayboluyordu.
   */
  dumpFailuresDir: string | null;
  /** Hangi yerleştirici koşsun. Deneysel yol backend'de bayrakla açık olmalı. */
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

Hızlı döngü (kimlik doğrulama ve veritabanı olmadan):
  --fixtures              Sentetik katalog + bench motoru ucu; giriş yapılmaz
  --bench-url <url>       Bench ucu (varsayılan ${DEFAULTS.benchUrl})
  --repeat <n>            Aynı koşuyu n kez koş, damga farkı ara (varsayılan ${DEFAULTS.repeat})
  --seed-range <a..b>     Tohum aralığı; --seed yerine geçer
  --dump-failures <dizin> İhlalli senaryoları (girdi + yerleşim) diske yaz
  --strategy <ad>         greedy | wallbuilder (varsayılan greedy)

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

  const fixtures = argv.includes('--fixtures');

  const baseUrl = readFlag(argv, 'base-url') ?? env.CARGO_PILOT_API_URL ?? '';
  const email = readFlag(argv, 'email') ?? env.CARGO_PILOT_EMAIL ?? '';
  const password = env.CARGO_PILOT_PASSWORD ?? '';

  // Fixture kipinde canlı backend hiç kullanılmaz; adres ve kimlik istemek
  // kullanıcıyı olmayan bir bağımlılığı doldurmaya zorlardı.
  if (!fixtures) {
    if (!baseUrl) {
      throw new CliUsageError('Backend adresi yok: --base-url ya da CARGO_PILOT_API_URL verin');
    }
    if (!email || !password) {
      throw new CliUsageError('Giriş bilgisi yok: CARGO_PILOT_EMAIL ve CARGO_PILOT_PASSWORD verin');
    }
  }

  const seeds = readSeeds(argv);

  return {
    seed: seeds[0],
    seeds,
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
    fixtures,
    benchUrl: readFlag(argv, 'bench-url') ?? DEFAULTS.benchUrl,
    repeat: readPositive(argv, 'repeat', DEFAULTS.repeat),
    dumpFailuresDir: readFlag(argv, 'dump-failures') ?? null,
  };
}

/**
 * `--seed-range a..b` verilmişse aralık, yoksa tek tohum. Aralık ve tek tohum
 * birlikte verilirse aralık kazanır ama sessizce değil: tek tohum zaten
 * aralığın ilk elemanı olarak raporlanır.
 */
function readSeeds(argv: readonly string[]): number[] {
  const range = readFlag(argv, 'seed-range');
  if (range === undefined) return [readNumber(argv, 'seed', DEFAULTS.seed)];

  const parts = range.split('..').filter((part) => part.length > 0);
  if (parts.length !== 2) throw new CliUsageError(`--seed-range 'a..b' biçiminde olmalı (verilen: ${range})`);

  const from = Number(parts[0]);
  const to = Number(parts[1]);
  if (!Number.isFinite(from) || !Number.isFinite(to)) {
    throw new CliUsageError(`--seed-range sayı aralığı olmalı (verilen: ${range})`);
  }

  const [low, high] = from <= to ? [from, to] : [to, from];

  return Array.from({ length: high - low + 1 }, (_, index) => low + index);
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
