// src/features/platform/schemas/loginSchema.ts
import { z } from 'zod';

export const loginSchema = z.object({
  email:    z.string().email('Geçerli bir e-posta adresi giriniz'),
  password: z.string().min(8, 'Şifre en az 8 karakter olmalıdır'),
});

export type LoginFormValues = z.infer<typeof loginSchema>;
