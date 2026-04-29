// src/features/platform/schemas/forgotPasswordSchema.ts
import { z } from 'zod';

export const forgotPasswordSchema = z.object({
  email: z.string().email('Geçerli bir e-posta adresi girin'),
});

export type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;
