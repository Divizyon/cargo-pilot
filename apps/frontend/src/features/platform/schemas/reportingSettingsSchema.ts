import { z } from 'zod';

export const reportingSettingsSchema = z.object({
  companyName: z.string().max(200).optional(),
  phone: z
    .string()
    .max(30)
    .optional()
    .refine((v) => !v || /^[0-9+\-\s()]*$/.test(v), {
      message: 'Sadece rakam giriniz',
    }),
  email: z
    .string()
    .optional()
    .refine((v) => !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), {
      message: 'Geçerli bir e-posta giriniz',
    }),
  address: z.string().max(500).optional(),
});

export type ReportingSettingsFormValues = z.infer<typeof reportingSettingsSchema>;
