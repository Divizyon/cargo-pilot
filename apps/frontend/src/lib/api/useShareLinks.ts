import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { toast } from 'sonner';
import type { AxiosError } from 'axios';
import { axiosInstance } from './axiosInstance';
import {
  shareLinkSchema,
  sharePlanSchema,
  type ShareValidity,
  type ShareLink,
  type SharePlan,
} from '@/lib/types/share';

interface ProblemDetails {
  title?: string;
  detail?: string;
  status?: number;
}

export function useCreateShareLink() {
  const queryClient = useQueryClient();
  return useMutation<
    ShareLink,
    AxiosError<ProblemDetails>,
    { planId: string; validity: ShareValidity }
  >({
    mutationFn: async ({ planId, validity }) => {
      const { data } = await axiosInstance.post<unknown>('/api/v1/shares', {
        planId,
        validity,
      });
      const parsed = z.object({ data: shareLinkSchema }).safeParse(data);
      if (!parsed.success) throw new Error('Geçersiz yanıt formatı');
      return parsed.data.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['share-links'] });
    },
    onError: (error) => {
      const detail = error.response?.data?.detail;
      toast.error(detail ?? 'Paylaşım bağlantısı oluşturulamadı.', { position: 'bottom-right' });
    },
  });
}

export function useShareLinks() {
  return useQuery({
    queryKey: ['share-links'] as const,
    queryFn: async (): Promise<ShareLink[]> => {
      const { data } = await axiosInstance.get<unknown>('/api/v1/shares');
      const parsed = z.object({ data: z.array(shareLinkSchema) }).safeParse(data);
      if (!parsed.success) return [];
      return parsed.data.data;
    },
    staleTime: 2 * 60 * 1000,
  });
}

export function useDeleteShareLink() {
  const queryClient = useQueryClient();
  return useMutation<void, AxiosError<ProblemDetails>, string>({
    mutationFn: (id) => axiosInstance.delete(`/api/v1/shares/${id}`).then(() => undefined),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['share-links'] });
      toast.success('Paylaşım bağlantısı iptal edildi.', { position: 'bottom-right' });
    },
    onError: (error) => {
      const detail = error.response?.data?.detail;
      toast.error(detail ?? 'Bağlantı iptal edilemedi.', { position: 'bottom-right' });
    },
  });
}

/** Backend süresi dolmuş bağlantıda plan verisi döndürmez, bu kodu döner. */
const SHARE_EXPIRED_CODE = 'Share.Expired';

const shareErrorSchema = z.object({ error: z.object({ code: z.string() }).partial() }).partial();

/** Sunucunun "süresi dolmuş" yanıtını 404'ten ayırır. */
export function isShareExpiredError(error: unknown): boolean {
  const response = (error as AxiosError<unknown> | null)?.response;
  if (!response) return false;
  const parsed = shareErrorSchema.safeParse(response.data);
  return parsed.success && parsed.data.error?.code === SHARE_EXPIRED_CODE;
}

export function useShareByToken(token: string) {
  return useQuery({
    queryKey: ['share-by-token', token] as const,
    queryFn: async (): Promise<SharePlan | null> => {
      const { data } = await axiosInstance.get<unknown>(`/api/v1/shares/${token}/plan`);
      const parsed = z.object({ data: sharePlanSchema }).safeParse(data);
      if (!parsed.success) return null;
      return parsed.data.data;
    },
    enabled: Boolean(token),
    retry: false,
    staleTime: 5 * 60 * 1000,
  });
}

export function useRecordShareView() {
  return useMutation<void, AxiosError<ProblemDetails>, string>({
    mutationFn: (token) => axiosInstance.post(`/api/v1/shares/${token}/view`).then(() => undefined),
  });
}
