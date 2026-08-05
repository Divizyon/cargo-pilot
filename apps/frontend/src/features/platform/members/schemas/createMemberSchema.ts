import { z } from 'zod';

export const createMemberSchema = z.object({
  firstName: z.string().min(2, 'Ad en az 2 karakter olmalıdır'),
  lastName: z.string().min(2, 'Soyad en az 2 karakter olmalıdır'),
  email: z.string().email('Geçerli bir e-posta adresi giriniz'),
  password: z
    .string()
    .min(8, 'En az 8 karakter olmalıdır')
    .regex(/[A-Z]/, 'En az 1 büyük harf içermelidir')
    .regex(/[a-z]/, 'En az 1 küçük harf içermelidir')
    .regex(/[0-9]/, 'En az 1 rakam içermelidir'),
  role: z.enum(['admin', 'operator']),
});

export type CreateMemberFormValues = z.infer<typeof createMemberSchema>;
