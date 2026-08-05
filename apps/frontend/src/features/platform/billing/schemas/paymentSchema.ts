import { z } from 'zod';
import { luhnCheck } from '@/features/platform/billing/utils/luhn';

export const paymentSchema = z.object({
  cardholderName: z.string().min(2, 'Kart sahibinin adı gereklidir.'),
  cardNumber: z
    .string()
    .min(1, 'Kart numarası gereklidir.')
    .refine((v) => {
      const len = v.replace(/\s/g, '').length;
      return len === 15 || len === 16;
    }, 'Kart numarası 15 veya 16 haneli olmalıdır.')
    .refine(luhnCheck, 'Geçersiz kart numarası.'),
  expiry: z
    .string()
    .regex(/^\d{2}\/\d{2}$/, 'AA/YY formatında giriniz.')
    .refine((v) => {
      const [mm, yy] = v.split('/').map(Number);
      if (!mm || !yy) return false;
      if (mm < 1 || mm > 12) return false;
      const now = new Date();
      const expDate = new Date(2000 + yy, mm - 1, 1);
      return expDate > now;
    }, 'Kartın son kullanma tarihi geçmiş.'),
  cvv: z.string().regex(/^\d{3,4}$/, 'CVV 3 veya 4 haneli olmalıdır.'),
});

export type PaymentFormValues = z.infer<typeof paymentSchema>;
