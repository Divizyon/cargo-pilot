import { z } from 'zod';

export const erpConnectionFormSchema = z.object({
  systemType: z.enum(['Logo', 'Netsis']),
  companyCode: z.string().min(1, 'Şirket kodu zorunludur'),
  username: z.string().min(1, 'Kullanıcı adı zorunludur'),
  password: z.string().min(1, 'Şifre zorunludur'),
  serverAddress: z.string().min(1, 'Sunucu adresi zorunludur'),
});

export type ErpConnectionFormValues = z.infer<typeof erpConnectionFormSchema>;
