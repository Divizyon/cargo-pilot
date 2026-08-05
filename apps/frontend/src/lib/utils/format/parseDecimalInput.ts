/**
 * Sayısal metin girdisini sayıya çevirir.
 *
 * Türkçe klavyede ondalık ayırıcı virgüldür. `parseFloat` virgülde durur ve
 * "15,5" girdisini sessizce 15'e çevirir; bu yüzden virgül noktaya normalize
 * edilip `Number` ile çevrilir. `Number` bozuk girdide NaN döndürdüğünden
 * "15.5.5" gibi değerler sessizce kırpılmak yerine tanımsız kalır.
 */
export function parseDecimalInput(raw: string): number | undefined {
  const normalized = raw.trim().replace(',', '.');
  if (normalized === '') return undefined;
  const value = Number(normalized);
  return Number.isFinite(value) ? value : undefined;
}
