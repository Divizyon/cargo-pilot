import { z } from 'zod';

export const paymentSchema = z.object({
  cardHolder: z.string().min(3, 'Kart sahibi adı giriniz'),
  cardNumber: z
    .string()
    .refine((v) => /^\d{16}$/.test(v.replace(/\s/g, '')), 'Geçerli bir kart numarası giriniz'),
  expiry: z.string().regex(/^(0[1-9]|1[0-2])\/\d{2}$/, 'AA/YY formatında giriniz'),
  cvc: z.string().regex(/^\d{3,4}$/, 'Geçersiz CVC'),
});

export type PaymentFormValues = z.infer<typeof paymentSchema>;
