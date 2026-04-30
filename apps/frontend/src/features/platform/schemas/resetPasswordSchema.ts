// src/features/platform/schemas/resetPasswordSchema.ts
import { z } from 'zod';

export const resetPasswordSchema = z
  .object({
    password: z
      .string()
      .min(8, 'En az 8 karakter olmalıdır')
      .regex(/[A-Z]/, 'En az 1 büyük harf içermelidir')
      .regex(/[a-z]/, 'En az 1 küçük harf içermelidir')
      .regex(/[0-9]/, 'En az 1 rakam içermelidir'),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Şifreler eşleşmiyor',
    path: ['confirmPassword'],
  });

export type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;
