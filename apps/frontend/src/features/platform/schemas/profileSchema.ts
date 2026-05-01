import { z } from 'zod';

export const profileSchema = z.object({
  firstName: z.string().min(1, 'Ad zorunludur').max(50),
  lastName: z.string().min(1, 'Soyad zorunludur').max(50),
  companyName: z.string().max(100).optional().or(z.literal('')),
  phone: z
    .string()
    .max(20)
    .optional()
    .or(z.literal(''))
    .refine((v) => !v || /^[+\d\s\-()]{7,20}$/.test(v), {
      message: 'Geçerli bir telefon numarası girin',
    }),
});

export type ProfileFormValues = z.infer<typeof profileSchema>;
