import { useMutation } from '@tanstack/react-query';
import { z } from 'zod';
import type { AxiosError } from 'axios';
import { axiosInstance } from './axiosInstance';

export const contactMessageSchema = z.object({
  name: z.string().min(2, 'Ad en az 2 karakter olmalıdır.'),
  email: z.string().email('Geçerli bir e-posta adresi giriniz.'),
  subject: z.string().min(3, 'Konu en az 3 karakter olmalıdır.'),
  message: z.string().min(10, 'Mesajınız en az 10 karakter olmalıdır.'),
});

export type ContactMessageValues = z.infer<typeof contactMessageSchema>;

interface ProblemDetails {
  detail?: string;
}

export function useSendContactMessage() {
  return useMutation<void, AxiosError<ProblemDetails>, ContactMessageValues>({
    mutationFn: (values) => axiosInstance.post('/api/v1/contact', values).then(() => undefined),
  });
}
