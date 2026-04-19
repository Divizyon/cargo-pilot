import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';
import { loadingPlanSchema } from '@/lib/types/loadingPlan';
import { apiFetch } from './fetcher';

interface LoadingPlanFilters {
  vehicleId?: string;
  page?: number;
}

export function useLoadingPlans(filters?: LoadingPlanFilters) {
  return useQuery({
    queryKey: ['loading-plans', filters] as const,
    queryFn: () => apiFetch('/loading-plans', z.array(loadingPlanSchema)),
  });
}

export function useLoadingPlan(id: string) {
  return useQuery({
    queryKey: ['loading-plans', id] as const,
    queryFn: () => apiFetch(`/loading-plans/${id}`, loadingPlanSchema),
    enabled: Boolean(id),
  });
}
