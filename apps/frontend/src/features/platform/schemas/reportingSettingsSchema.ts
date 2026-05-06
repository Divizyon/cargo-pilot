import { z } from 'zod';

export const reportingSettingsSchema = z.object({
  companyName: z.string().max(100, 'En fazla 100 karakter'),
  phone: z.string().max(30, 'En fazla 30 karakter'),
  email: z
    .string()
    .max(100)
    .refine((v) => v === '' || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), {
      message: 'Geçerli bir e-posta giriniz',
    }),
  address: z.string().max(200, 'En fazla 200 karakter'),
});

export type ReportingSettingsFormValues = z.infer<typeof reportingSettingsSchema>;
