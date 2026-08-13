import { z } from 'zod';

export const erpConnectionFormSchema = z.object({
  systemType: z.enum(['Logo', 'Netsis']),
  /** Backend'de SQL InitialCatalog olarak kullanılır; arayüzdeki adı 'Veritabanı Adı'dır. */
  companyCode: z.string().min(1, 'Veritabanı adı zorunludur'),
  username: z.string().min(1, 'Kullanıcı adı zorunludur'),
  password: z.string().optional(),
  serverAddress: z.string().min(1, 'Sunucu adresi zorunludur'),
  /** true iken sunucu sertifikası doğrulanmaz; self-signed sertifikalı kurulumlar için varsayılan. */
  trustServerCertificate: z.boolean(),
  /**
   * ERP'deki ölçü ve ağırlık kolonlarının birimi. ERP bu bilgiyi taşımadığı için
   * kurulumda bildirilir; yanlış seçim ölçüleri sessizce 10 veya 100 kat kaydırır.
   */
  dimensionUnit: z.number().int(),
  weightUnit: z.number().int(),
});

/** Backend `ErpDimensionUnit` sözleşmesi. */
export const ERP_DIMENSION_UNITS = [
  { value: 0, label: 'Santimetre (cm)' },
  { value: 1, label: 'Milimetre (mm)' },
  { value: 2, label: 'Metre (m)' },
  { value: 3, label: 'İnç (in)' },
] as const;

/** Backend `ErpWeightUnit` sözleşmesi. */
export const ERP_WEIGHT_UNITS = [
  { value: 0, label: 'Kilogram (kg)' },
  { value: 1, label: 'Gram (g)' },
  { value: 2, label: 'Pound (lb)' },
] as const;

export type ErpConnectionFormValues = z.infer<typeof erpConnectionFormSchema>;
