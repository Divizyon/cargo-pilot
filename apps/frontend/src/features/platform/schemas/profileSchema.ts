import { z } from 'zod';

export const profileSchema = z.object({
  firstName: z.string().min(1, 'Ad zorunludur'),
  lastName: z.string().min(1, 'Soyad zorunludur'),
  companyName: z.string().optional(),
});

export type ProfileFormValues = z.infer<typeof profileSchema>;
