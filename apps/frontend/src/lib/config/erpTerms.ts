/** ERP yüzeylerinin ayarlar sekmelerine köprüsü; rota dizesi tek yerde tutulur. */
export const ERP_SETTINGS_ROUTE = {
  connection: '/settings?tab=erp-baglanti',
  sync: '/settings?tab=erp-senkronizasyon',
} as const;
