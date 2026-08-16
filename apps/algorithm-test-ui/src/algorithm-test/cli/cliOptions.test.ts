import { describe, expect, it } from 'vitest';
import { OptimizationCriteria } from '@/lib/types/loadingPlan';
import {
  CliUsageError,
  DEFAULTS,
  EXIT_CODES,
  isHelpRequested,
  parseCliOptions,
  resolveExitCode,
  type CliEnv,
} from './cliOptions';

/**
 * CI'ın dayandığı sözleşme burada sınanıyor. Bir betik `npm run suite` çağırıp
 * çıkış koduna bakıyorsa, o kodun hangi durumda ne olduğu ağ çağrısı kurmadan
 * doğrulanabilmeli — aksi hâlde pipeline sessizce yeşil kalabilir.
 */

const ENV: CliEnv = {
  CARGO_PILOT_API_URL: 'https://ornek.test',
  CARGO_PILOT_EMAIL: 'test@ornek.test',
  CARGO_PILOT_PASSWORD: 'gizli',
};

describe('parseCliOptions', () => {
  it('bayrak verilmezse varsayılanları kullanır', () => {
    const options = parseCliOptions([], ENV);

    expect(options.seed).toBe(DEFAULTS.seed);
    expect(options.count).toBe(DEFAULTS.count);
    expect(options.criteria).toBe(OptimizationCriteria.VolumeFirst);
    expect(options.applyGate).toBe(true);
    expect(options.baselinePath).toBeNull();
  });

  it('bayrakları okur', () => {
    const options = parseCliOptions(
      ['--seed', '7', '--count', '100', '--criteria', '0', '--baseline', 'a.json', '--out', 'r'],
      ENV,
    );

    expect(options.seed).toBe(7);
    expect(options.count).toBe(100);
    expect(options.criteria).toBe(OptimizationCriteria.Lifo);
    expect(options.baselinePath).toBe('a.json');
    expect(options.outDir).toBe('r');
  });

  it('--no-gate kapıyı kapatır', () => {
    expect(parseCliOptions(['--no-gate'], ENV).applyGate).toBe(false);
  });

  // Bayrak ortam değişkenini ezmeli; CI'da tek koşu için adres değiştirilebilsin.
  it('--base-url ortam değişkenini ezer', () => {
    expect(parseCliOptions(['--base-url', 'https://baska.test'], ENV).baseUrl).toBe(
      'https://baska.test',
    );
  });

  /**
   * Parola bayrakla alınmaz: komut satırına yazılan parola kabuk geçmişine ve
   * CI günlüğündeki komut satırına düşer.
   */
  it('parolayı yalnızca ortamdan okur', () => {
    const options = parseCliOptions(['--password', 'komut-satiri'], ENV);
    expect(options.password).toBe('gizli');
  });

  it.each([
    ['adres yoksa', { ...ENV, CARGO_PILOT_API_URL: undefined }],
    ['e-posta yoksa', { ...ENV, CARGO_PILOT_EMAIL: undefined }],
    ['parola yoksa', { ...ENV, CARGO_PILOT_PASSWORD: undefined }],
  ])('%s kullanım hatası verir', (_label, env) => {
    expect(() => parseCliOptions([], env)).toThrow(CliUsageError);
  });

  it.each([
    ['--criteria', '9'],
    ['--count', 'abc'],
    ['--count', '0'],
    ['--concurrency', '0'],
  ])('geçersiz %s değerini reddeder', (flag, value) => {
    expect(() => parseCliOptions([flag, value], ENV)).toThrow(CliUsageError);
  });

  // Değeri unutulmuş bir bayrak sessizce sonrakini yutmamalı.
  it('değersiz bayrakta varsayılana döner', () => {
    expect(parseCliOptions(['--seed', '--no-gate'], ENV).seed).toBe(DEFAULTS.seed);
  });
});

describe('resolveExitCode', () => {
  it('kapı geçtiyse 0 döner', () => {
    expect(resolveExitCode({ gatePassed: true, applyGate: true })).toBe(EXIT_CODES.ok);
  });

  // CI'ın regresyonda durmasını sağlayan tek şey bu.
  it('kapı düştüyse 1 döner', () => {
    expect(resolveExitCode({ gatePassed: false, applyGate: true })).toBe(EXIT_CODES.gateFailed);
  });

  it('--no-gate ile regresyonda bile 0 döner', () => {
    expect(resolveExitCode({ gatePassed: false, applyGate: false })).toBe(EXIT_CODES.ok);
  });

  it('kullanım ve bağlantı hatası kapı hatasından ayrı kodda', () => {
    expect(EXIT_CODES.usageOrConnection).not.toBe(EXIT_CODES.gateFailed);
  });
});

describe('isHelpRequested', () => {
  it.each([['--help'], ['-h']])('%s yardım ister', (flag) => {
    expect(isHelpRequested([flag])).toBe(true);
  });

  it('bayrak yoksa yardım istemez', () => {
    expect(isHelpRequested(['--seed', '1'])).toBe(false);
  });
});
