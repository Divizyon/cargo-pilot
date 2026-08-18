import { CheckCircle2, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DIMENSION_SHORT_LABEL } from '@/lib/config/erpTerms';
import type { EditableRow } from '@/features/data-management/imports/utils/itemImportRow';

interface SummaryRow {
  label: string;
  value: string;
  tone?: 'default' | 'error' | 'ok';
}

/** Boş ya da sayısal olmayan hücre toplama girmez; kullanıcı henüz doldurmamış olabilir. */
function toNumber(value: string): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

/** Santimetre kenarlardan m³; ürün özet panelindeki hesabın aynısı. */
function totalVolumeM3(rows: readonly EditableRow[]): number {
  return rows.reduce(
    (sum, row) =>
      sum + (toNumber(row.width) * toNumber(row.height) * toNumber(row.length)) / 1_000_000,
    0,
  );
}

function totalWeightKg(rows: readonly EditableRow[]): number {
  return rows.reduce((sum, row) => sum + toNumber(row.weight), 0);
}

/**
 * Doğrulama alan adlarının okunur karşılığı. `validateRow` bu sekiz alanı üretir;
 * sekizi de ızgaranın ana satırında düzenlenir, yani hiçbir engel açılır satırın
 * arkasında saklı kalmaz.
 */
// Ölçü adları sözlükten türetilir; elle yazılınca koordinat standardı değiştiğinde
// (Derinlik → Uzunluk) burası sessizce bayatlıyordu.
const BLOCKER_LABEL: Record<string, string> = {
  name: 'Ürün adı eksik',
  sku: 'SKU sorunu',
  tip: 'Tip seçilmemiş',
  width: `${DIMENSION_SHORT_LABEL.width} eksik`,
  height: `${DIMENSION_SHORT_LABEL.height} eksik`,
  length: `${DIMENSION_SHORT_LABEL.length} eksik`,
  weight: `${DIMENSION_SHORT_LABEL.weight} eksik`,
  stackGroup: 'Yük grubu seçilmemiş',
};

/** Histogram kova sayısı; 90 satırlık tipik partide şekli okunur kılan aralık. */
const VOLUME_BIN_COUNT = 8;

interface ImportSummaryPanelProps {
  rows: readonly EditableRow[];
  errorRowCount: number;
  validRowCount: number;
  /** Alan adı → o alanda hatası olan satır sayısı. */
  errorFieldCounts: Readonly<Record<string, number>>;
}

/**
 * Aktarım ekranının sağ sütunu. Ürün ve araç detay sayfalarında bu sütunda 3D
 * önizleme durur; toplu aktarımda önizlenecek tek bir nesne olmadığı için aynı
 * yerde bu ekranın tek gerçek sorusu cevaplanır: aktarımı ne engelliyor?
 *
 * İstatistik listesinin biçimi bilinçli olarak ürün önizleme panelindekiyle aynıdır.
 */
export function ImportSummaryPanel({
  rows,
  errorRowCount,
  validRowCount,
  errorFieldCounts,
}: ImportSummaryPanelProps) {
  const missingStackGroupCount = rows.filter((row) => !row.stackGroup).length;

  /**
   * Yük grubu dağılımı — yalnızca gerçekten birden fazla grup varsa çizilir.
   * Tek gruplu bir dağılım "grafik" değildir; tek dilimli pasta ya da tek çubuklu
   * grafik bilinen bir anti-desen. Partinin tamamı aynı gruptaysa bölüm hiç
   * görünmez ve panel doğal boyunda kalır.
   */
  const groupCounts = new Map<string, number>();
  for (const row of rows) {
    const key = row.stackGroup || 'Atanmamış';
    groupCounts.set(key, (groupCounts.get(key) ?? 0) + 1);
  }
  const groupRows =
    groupCounts.size > 1
      ? Array.from(groupCounts, ([label, count]) => ({ label, count })).sort(
          (a, b) => b.count - a.count || a.label.localeCompare(b.label, 'tr'),
        )
      : [];
  const maxGroupCount = groupRows.reduce((max, group) => Math.max(max, group.count), 0);

  /**
   * Ürün başına hacim dağılımı. Tip ve yük grubu bir partide çoğunlukla tekdüze
   * olduğu için kategorik grafik tek dilime düşüyordu; hacim sürekli bir ölçü ve
   * gerçekten dağılıyor, dolayısıyla histogram burada dejenere olmuyor.
   *
   * Tek ölçü → tek renk, gösterge kutusu gerekmez; başlık ölçüyü zaten adlandırır.
   */
  const itemVolumes = rows
    .map((row) => (toNumber(row.width) * toNumber(row.height) * toNumber(row.length)) / 1_000_000)
    .filter((volume) => volume > 0)
    .sort((a, b) => a - b);

  const minVolume = itemVolumes[0] ?? 0;
  const maxVolume = itemVolumes[itemVolumes.length - 1] ?? 0;
  const binWidth = (maxVolume - minVolume) / VOLUME_BIN_COUNT || 1;

  const volumeBins = Array.from({ length: VOLUME_BIN_COUNT }, (_, index) => {
    const from = minVolume + index * binWidth;
    const to = index === VOLUME_BIN_COUNT - 1 ? maxVolume : from + binWidth;
    const count = itemVolumes.filter((volume) =>
      index === VOLUME_BIN_COUNT - 1 ? volume >= from : volume >= from && volume < to,
    ).length;
    return { from, to, count };
  });
  const maxBinCount = volumeBins.reduce((max, bin) => Math.max(max, bin.count), 0);

  const blockers = Object.entries(errorFieldCounts)
    .filter(([, count]) => count > 0)
    .map(([field, count]) => ({ field, count, label: BLOCKER_LABEL[field] ?? field }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, 'tr'));

  const summaryRows: SummaryRow[] = [
    { label: 'Toplam satır', value: String(rows.length) },
    {
      label: 'Aktarıma hazır',
      value: String(validRowCount),
      tone: validRowCount > 0 ? 'ok' : 'default',
    },
    {
      label: 'Hatalı',
      value: String(errorRowCount),
      tone: errorRowCount > 0 ? 'error' : 'default',
    },
    { label: 'Toplam hacim', value: `${totalVolumeM3(rows).toFixed(2)} m³` },
    { label: 'Toplam ağırlık', value: `${totalWeightKg(rows).toFixed(0)} kg` },
  ];

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card p-3">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
          Aktarım Özeti
        </p>
        <span className="rounded border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground">
          {rows.length} satır
        </span>
      </div>

      {/*
        Ürün ve araç panellerinde bu kutuda 3D önizleme durur. Toplu aktarımda
        önizlenecek tek bir nesne yok; aynı yerde aktarımı engelleyen alanlar
        sayılır. Veri `validateRow` sonucundan gelir, yeni bir hesap yapılmaz.
      */}
      {/*
        Hacim dağılımı. Tek ölçü olduğu için tek renk ve gösterge kutusu yok; sayılar
        her çubuğun üstüne değil, yalnızca en yüksek kovaya ve ipucuna yazılır.
        Çubuklar tabana oturur, aralarında 2px yüzey boşluğu ve üstleri 4px yuvarlaktır.
      */}
      <div className="mb-3 mt-1 flex min-h-[160px] flex-1 flex-col rounded-lg bg-muted/40 p-3">
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          Ürün başına hacim
        </p>

        {itemVolumes.length > 0 ? (
          <>
            <div
              className="flex min-h-[80px] flex-1 items-end gap-0.5"
              role="img"
              aria-label={`Hacim dağılımı: ${itemVolumes.length} ürün, ${minVolume.toFixed(2)} ile ${maxVolume.toFixed(2)} m³ arasında`}
            >
              {volumeBins.map((bin, index) => (
                <div
                  key={index}
                  title={`${bin.from.toFixed(2)}–${bin.to.toFixed(2)} m³ · ${bin.count} ürün`}
                  className="flex h-full flex-1 flex-col justify-end"
                >
                  {bin.count === maxBinCount && bin.count > 0 && (
                    <span className="mb-1 text-center text-[10px] tabular-nums text-muted-foreground">
                      {bin.count}
                    </span>
                  )}
                  <div
                    className="w-full rounded-t bg-primary/70"
                    style={{
                      height: maxBinCount > 0 ? `${(bin.count / maxBinCount) * 100}%` : '0%',
                    }}
                  />
                </div>
              ))}
            </div>
            <div className="mt-1.5 flex items-center justify-between border-t border-border/50 pt-1.5 text-[10px] tabular-nums text-muted-foreground">
              <span>{minVolume.toFixed(2)} m³</span>
              <span>{maxVolume.toFixed(2)} m³</span>
            </div>
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center">
            <p className="text-xs text-muted-foreground">Ölçüsü girilmiş ürün yok.</p>
          </div>
        )}
      </div>

      {groupRows.length > 0 && (
        <div className="mb-3 mt-1 rounded-lg bg-muted/40 p-3">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            Yük grubu dağılımı
          </p>
          <ul className="flex flex-col gap-1.5">
            {groupRows.map((group) => (
              <li key={group.label} className="flex items-center gap-2">
                <span className="w-24 shrink-0 truncate text-xs text-muted-foreground">
                  {group.label}
                </span>
                {/* Tek ölçünün kategoriler arası karşılaştırması: tek nötr ton yeter,
                    kategorik palet gerekmez. Sayı çubuğun yanında yazılı. */}
                <span className="flex h-2 min-w-0 flex-1 items-center">
                  <span
                    className="h-full rounded-full bg-foreground/25"
                    style={{ width: `${(group.count / maxGroupCount) * 100}%` }}
                  />
                </span>
                <span className="w-6 shrink-0 text-right text-xs font-medium tabular-nums text-foreground">
                  {group.count}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {blockers.length > 0 ? (
        <div className="mb-3 rounded-lg border border-border/50 p-2.5">
          <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            Aktarımı engelleyenler
          </p>
          <ul className="flex flex-col gap-1">
            {blockers.map((blocker) => (
              <li key={blocker.field} className="flex items-center justify-between gap-2">
                <span className="text-xs text-foreground">{blocker.label}</span>
                <span className="text-xs font-medium tabular-nums text-destructive">
                  {blocker.count}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="mb-3 flex items-center gap-1.5 text-xs text-green-700 dark:text-green-400">
          <CheckCircle2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          Engel yok — {validRowCount} satır aktarıma hazır.
        </p>
      )}

      <div className="flex flex-col">
        {summaryRows.map((row) => (
          <div
            key={row.label}
            className="flex items-center justify-between border-b border-border/50 py-1 last:border-0"
          >
            <span className="text-xs text-muted-foreground">{row.label}</span>
            <span
              className={cn(
                'text-xs font-medium tabular-nums',
                row.tone === 'error' && 'text-destructive',
                row.tone === 'ok' && 'text-green-700 dark:text-green-400',
                (!row.tone || row.tone === 'default') && 'text-foreground',
              )}
            >
              {row.value}
            </span>
          </div>
        ))}
      </div>

      {/*
        ERP yük grubu göndermiyor ama alan zorunlu; ekran bu yüzden her açılışta
        hatalı başlıyor. Varsayılan atamak doğrulama davranışını değiştirirdi, bu
        yüzden yalnızca toplu doldurmanın nerede olduğu söyleniyor.
      */}
      {missingStackGroupCount > 0 && (
        <div className="mt-3 flex gap-2 rounded-lg border border-border/50 bg-muted/40 p-2">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            ERP yük grubu göndermiyor. Tablodaki <span className="font-medium">Yük Grubu</span>{' '}
            başlığındaki <span className="font-medium">Tümü</span> menüsünden hepsine birden
            atayabilirsiniz.
          </p>
        </div>
      )}
    </div>
  );
}
