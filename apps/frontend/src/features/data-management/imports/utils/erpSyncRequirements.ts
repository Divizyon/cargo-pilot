import type { ErpSettings } from '@/lib/types/erp';

interface ErpConnectionSummary {
  id: string;
}

/**
 * Senkronizasyon için gereken ama eksik kalan ayarlar. Buton sessizce disabled kalmaz;
 * kullanıcı eksiği diyalogda görür ve ayarlar ekranına yönlendirilir.
 */
export function collectMissingSyncRequirements(
  connection: ErpConnectionSummary | null | undefined,
  settings: ErpSettings | null | undefined,
): string[] {
  if (!settings)
    return ['ERP bağlantı bilgileri (sunucu adresi, veritabanı adı, kullanıcı, şifre)'];

  const missing: string[] = [];
  if (!settings.serverAddress.trim()) missing.push('Sunucu adresi');
  if (!settings.companyCode.trim()) missing.push('Veritabanı adı');
  if (!settings.username.trim()) missing.push('Kullanıcı adı');
  if (!settings.hasPassword) missing.push('ERP şifresi');
  if (!connection) missing.push('Kayıtlı ERP bağlantısı');
  return missing;
}
