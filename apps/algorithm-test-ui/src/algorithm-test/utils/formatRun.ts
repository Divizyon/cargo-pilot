/**
 * Koşu ekranının zaman biçimleri. ISO dizgesini kesip göstermek ("2026-08-15
 * 11:40") makine kaydı gibi okunuyordu; koşular gün içinde art arda yapıldığı
 * için ayırt edici olan kısım gün ve saat.
 */
const RUN_TIME_FORMAT = new Intl.DateTimeFormat('tr-TR', {
  day: '2-digit',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
});

export function formatRunTime(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? iso : RUN_TIME_FORMAT.format(date);
}

/** Saniye altını yuvarlar: koşu süreleri dakika mertebesinde, hassasiyet gereksiz. */
export function formatDuration(ms: number): string {
  const totalSeconds = Math.max(0, Math.round(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}
