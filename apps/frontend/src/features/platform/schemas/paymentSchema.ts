import { z } from 'zod';

export const paymentSchema = z.object({
  cardholderName: z.string().min(2, 'Kart sahibinin adı gereklidir.'),
  cardNumber: z
    .string()
    .min(1, 'Kart numarası gereklidir.')
    .refine((v) => v.replace(/\s/g, '').length === 16, 'Kart numarası 16 haneli olmalıdır.'),
  expiry: z
    .string()
    .regex(/^\d{2}\/\d{2}$/, 'GG/YY formatında giriniz.')
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
