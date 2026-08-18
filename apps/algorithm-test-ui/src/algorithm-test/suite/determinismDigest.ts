import type { Placement } from '@/lib/types/loadingPlan';

/**
 * Bir koşunun "anlamlı" izdüşümü: aynı girdi aynı planı üretti mi sorusunu tek
 * bir hex dizesine indirger.
 *
 * İçine giren: senaryo kimliği, yerleşimlerin `(itemId, rotation, x, y, z)`
 * listesi, yerleşemeyenlerin `(itemId, reason, quantity)` listesi — ikisi de
 * kanonik sıralı.
 *
 * Dışında kalan: süre, plan kimliği, `placementId`, zaman damgası, makine adı,
 * arama istatistikleri. Bunlar her koşuda değişir; ham rapor eşitliği aranırsa
 * determinizm testi hiçbir zaman yeşil olmaz.
 *
 * Biçim C# tarafıyla ORTAKTIR (`CargoPilot.Engine.Bench/DeterminismDigest.cs`).
 * Değiştiren taraf diğerini de değiştirmek zorundadır; aksi hâlde iki koşucu
 * aynı planı farklı damgalar ve kıyas sessizce anlamsızlaşır.
 */

const FRACTION_DIGITS = 6;

export interface DigestUnplaced {
  itemId: string;
  reason: number;
  quantity: number;
}

/** Tek senaryonun kanonik metin izdüşümü. */
export function canonicalScenario(
  scenarioId: string,
  placements: readonly Placement[],
  unplaced: readonly DigestUnplaced[],
): string {
  const placementLines = placements
    .map((p) =>
      ['P', p.itemId, String(p.rotation), num(p.positionX), num(p.positionY), num(p.positionZ)].join('|'),
    )
    .sort();

  const unplacedLines = unplaced
    .map((u) => ['U', u.itemId, String(u.reason), String(u.quantity)].join('|'))
    .sort();

  return [`scenario:${scenarioId}`, ...placementLines, ...unplacedLines].join('\n');
}

export async function scenarioDigest(
  scenarioId: string,
  placements: readonly Placement[],
  unplaced: readonly DigestUnplaced[],
): Promise<string> {
  return sha256(canonicalScenario(scenarioId, placements, unplaced));
}

/**
 * Koşunun tamamının damgası. Senaryo damgaları kanonik sıraya sokulur, böylece
 * senaryoların hangi sırada koşulduğu — işçi havuzu sırasız çektiği için her
 * koşuda değişir — sonucu etkilemez.
 */
export async function runDigest(
  scenarios: readonly { scenarioId: string; digest: string }[],
): Promise<string> {
  const lines = scenarios.map((s) => `${s.scenarioId}:${s.digest}`).sort();

  return sha256(lines.join('\n'));
}

/**
 * Ondalıkların iki dilde aynı yazılması için sabit biçim: en fazla altı basamak,
 * sondaki sıfırlar atılır. Motor santimetre çalıştığı için değerler pratikte tam
 * sayıdır; biçim yine de yuvarlama farkına kapalı tutulur.
 */
function num(value: number): string {
  const rounded = Number(value.toFixed(FRACTION_DIGITS));
  const text = rounded
    .toFixed(FRACTION_DIGITS)
    .replace(/0+$/, '')
    .replace(/\.$/, '');

  return text === '-0' ? '0' : text;
}

async function sha256(text: string): Promise<string> {
  const bytes = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest('SHA-256', bytes);

  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
