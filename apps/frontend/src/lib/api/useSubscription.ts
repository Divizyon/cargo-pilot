import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { toast } from 'sonner';
import { axiosInstance } from '@/lib/api/axiosInstance';
import { useSubscriptionStore } from '@/lib/store/useSubscriptionStore';

const subscriptionStatusSchema = z.object({
  plan: z.enum(['free', 'starter', 'pro', 'enterprise']),
  expiresAt: z.string().nullable(),
  willCancelAtPeriodEnd: z.boolean(),
});

export function useSubscriptionStatus() {
  const setPlan = useSubscriptionStore((s) => s.setPlan);

  return useQuery({
    queryKey: ['subscription', 'status'],
    queryFn: async () => {
      const res = await axiosInstance.get('/api/v1/subscription/status');
      const data = subscriptionStatusSchema.parse(res.data);
      setPlan(data.plan, data.expiresAt, data.willCancelAtPeriodEnd);
      return data;
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useCancelSubscription() {
  const queryClient = useQueryClient();
  const setWillCancelAtPeriodEnd = useSubscriptionStore((s) => s.setWillCancelAtPeriodEnd);

  return useMutation({
    mutationFn: () => axiosInstance.post('/api/v1/subscription/cancel'),
    onSuccess: () => {
      setWillCancelAtPeriodEnd(true);
      queryClient.invalidateQueries({ queryKey: ['subscription'] });
      toast.success('Aboneliğiniz dönem sonunda iptal edilecek.');
    },
    onError: () => {
      toast.error('İptal işlemi başarısız. Lütfen tekrar deneyin.');
    },
  });
}

export function useReactivateSubscription() {
  const queryClient = useQueryClient();
  const setWillCancelAtPeriodEnd = useSubscriptionStore((s) => s.setWillCancelAtPeriodEnd);

  return useMutation({
    mutationFn: () => axiosInstance.post('/api/v1/subscription/reactivate'),
    onSuccess: () => {
      setWillCancelAtPeriodEnd(false);
      queryClient.invalidateQueries({ queryKey: ['subscription'] });
      toast.success('Abonelik iptali geri alındı.');
    },
    onError: () => {
      toast.error('İşlem başarısız. Lütfen tekrar deneyin.');
    },
  });
}
