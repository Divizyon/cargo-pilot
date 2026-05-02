import { z } from 'zod';

export const profileSchema = z.object({
  firstName: z.string().min(1, 'Ad zorunludur').max(50),
  lastName: z.string().min(1, 'Soyad zorunludur').max(50),
  companyName: z.string().max(100).optional().or(z.literal('')),
});

export type ProfileFormValues = z.infer<typeof profileSchema>;
