import { z } from 'zod';

export const passwordChangeSchema = z
  .object({
    currentPassword: z.string().min(1, 'Mevcut şifrenizi giriniz'),
    newPassword: z
      .string()
      .min(8, 'En az 8 karakter olmalıdır')
      .regex(/[A-Z]/, 'En az 1 büyük harf içermelidir')
      .regex(/[a-z]/, 'En az 1 küçük harf içermelidir')
      .regex(/[0-9]/, 'En az 1 rakam içermelidir'),
    confirmPassword: z.string().min(1, 'Şifre tekrarını giriniz'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Şifreler eşleşmiyor',
    path: ['confirmPassword'],
  });

export type PasswordChangeFormValues = z.infer<typeof passwordChangeSchema>;
