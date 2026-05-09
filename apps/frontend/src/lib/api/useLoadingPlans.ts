import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { toast } from 'sonner';
import type { AxiosError } from 'axios';
import {
  loadingPlanSchema,
  planProductGroupSchema,
  type LoadingPlanListItem,
  type PlanProductGroup,
} from '@/lib/types/loadingPlan';
import { apiFetch } from './fetcher';
import { axiosInstance } from './axiosInstance';
import {
  planListApiItemSchema,
  planListApiResponseSchema,
  planDetailApiResponseSchema,
  fromApiPlanListItem,
  extractListData,
} from './loadingPlanMappers';

// ─── Existing plan detail (3D viewer) ─────────────────────────────────────────

export function useLoadingPlans(filters?: { vehicleId?: string; page?: number }) {
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

// ─── List view types ───────────────────────────────────────────────────────────

export interface LoadingPlanListFilters {
  search?: string;
  status?: string;
  plate?: string;
  vehicleNames?: string[];
  dateFrom?: string;
  dateTo?: string;
}

export interface LoadingPlanListPage {
  items: LoadingPlanListItem[];
  totalCount: number;
  allVehicleNames: string[];
}

// ─── List with real API ────────────────────────────────────────────────────────

export function useLoadingPlanList(filters?: LoadingPlanListFilters, page = 1, pageSize = 10) {
  return useQuery({
    queryKey: ['loading-plan-list', filters, page, pageSize] as const,
    queryFn: async (): Promise<LoadingPlanListPage> => {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('pageSize', String(Math.min(pageSize, 100)));
      params.set('sortBy', 'createdAt');
      params.set('sortDirection', 'desc');

      if (filters?.status && filters.status !== 'all') {
        params.set('status', filters.status);
      }
      if (filters?.search && filters.search.length >= 2) {
        params.set('searchTerm', filters.search);
      }
      if (filters?.plate && filters.plate.length >= 2) {
        params.set('plate', filters.plate);
      }
      if (filters?.dateFrom) {
        params.set('startDate', new Date(filters.dateFrom).toISOString());
      }
      if (filters?.dateTo) {
        const to = new Date(filters.dateTo);
        to.setHours(23, 59, 59, 999);
        params.set('endDate', to.toISOString());
      }

      const { data } = await axiosInstance.get<unknown>(
        `/api/v1/loading-plans?${params.toString()}`,
      );

      const parsed = planListApiResponseSchema.safeParse(data);
      if (!parsed.success) {
        console.error('[useLoadingPlanList] outer parse error', parsed.error, 'raw:', data);
        return { items: [], totalCount: 0, allVehicleNames: [] };
      }

      const { rawItems, totalCount } = extractListData(parsed.data);
      console.debug('[useLoadingPlanList] rawItems count:', rawItems.length, 'totalCount:', totalCount, 'sample:', rawItems[0]);

      const items: LoadingPlanListItem[] = [];
      for (const raw of rawItems) {
        const result = planListApiItemSchema.safeParse(raw);
        if (result.success) {
          items.push(fromApiPlanListItem(result.data));
        } else {
          console.error('[useLoadingPlanList] item parse error', result.error.issues, 'raw item:', raw);
        }
      }

      return { items, totalCount, allVehicleNames: [] };
    },
    staleTime: 2 * 60 * 1000,
  });
}

// ─── Single list-item (detail page) ───────────────────────────────────────────

export function useLoadingPlanListItem(id: string) {
  return useQuery({
    queryKey: ['loading-plan-list-item', id] as const,
    queryFn: async (): Promise<LoadingPlanListItem | null> => {
      const { data } = await axiosInstance.get<unknown>(`/api/v1/loading-plans/${id}`);
      const parsed = planDetailApiResponseSchema.safeParse(data);
      if (!parsed.success) {
        console.error('[useLoadingPlanListItem] parse error', parsed.error);
        return null;
      }
      const d = parsed.data.data;
      return fromApiPlanListItem({
        id: d.id,
        planName: d.planName,
        vehicleId: d.vehicleId ?? '',
        vehicle: d.vehicle,
        fillRate: d.fillRate,
        volumeFillRate: d.volumeFillRate,
        optimizationStatus: d.optimizationStatus,
        itemCount: d.itemCount,
        totalWeight: d.totalWeight,
        createdAt: d.createdAt,
        plannedAt: d.plannedAt,
        planCode: d.planCode,
        status: d.status,
      });
    },
    enabled: Boolean(id),
    staleTime: 5 * 60 * 1000,
  });
}

// ─── Delete mutation ───────────────────────────────────────────────────────────

interface ProblemDetails {
  type?: string;
  title?: string;
  status?: number;
  detail?: string;
}

export function useDeleteLoadingPlan() {
  const queryClient = useQueryClient();
  return useMutation<void, AxiosError<ProblemDetails>, string>({
    mutationFn: (id) =>
      axiosInstance.delete(`/api/v1/loading-plans/${id}`).then(() => undefined),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['loading-plan-list'] });
      void queryClient.invalidateQueries({ queryKey: ['loading-plan-list-item'] });
      toast.success('Yükleme planı silindi.', { position: 'bottom-right' });
    },
    onError: (error) => {
      const status = error.response?.status;
      const detail = error.response?.data?.detail;
      if (status === 404) {
        toast.error('Plan bulunamadı.', { position: 'bottom-right' });
        return;
      }
      toast.error(detail ?? 'Plan silinemedi. Lütfen tekrar deneyin.', {
        position: 'bottom-right',
      });
    },
  });
}

// ─── Rename mutation ───────────────────────────────────────────────────────────

export function useRenameLoadingPlan() {
  const queryClient = useQueryClient();
  return useMutation<void, AxiosError<ProblemDetails>, { id: string; planName: string }>({
    mutationFn: ({ id, planName }) =>
      axiosInstance.patch(`/api/v1/loading-plans/${id}`, { planName }).then(() => undefined),
    onSuccess: (_data, { id }) => {
      void queryClient.invalidateQueries({ queryKey: ['loading-plan-list'] });
      void queryClient.invalidateQueries({ queryKey: ['loading-plan-list-item', id] });
      toast.success('Plan adı güncellendi.', { position: 'bottom-right' });
    },
    onError: (error) => {
      const status = error.response?.status;
      const detail = error.response?.data?.detail;
      if (status === 404) {
        toast.error('Plan bulunamadı.', { position: 'bottom-right' });
        return;
      }
      toast.error(detail ?? 'Plan adı güncellenemedi.', { position: 'bottom-right' });
    },
  });
}

// ─── Mock product groups (no API endpoint yet) ────────────────────────────────

const MOCK_PLAN_PRODUCTS: Record<string, PlanProductGroup[]> = {};

function getDefaultProductGroups(planId: string): PlanProductGroup[] {
  return [
    {
      id: `GRP-DEF-${planId.slice(0, 8)}`,
      name: 'Genel Kargo',
      color: '#6b7280',
      products: [
        {
          id: `pd-${planId}-001`,
          name: 'Standart Koli Ürün A',
          quantity: 3,
          unitWeightKg: 5.0,
          layerCount: 2,
          constraints: [],
        },
        {
          id: `pd-${planId}-002`,
          name: 'Standart Koli Ürün B',
          quantity: 5,
          unitWeightKg: 3.5,
          layerCount: 3,
          constraints: [],
        },
        {
          id: `pd-${planId}-003`,
          name: 'Palet Ürün C',
          quantity: 2,
          unitWeightKg: 25.0,
          layerCount: 1,
          constraints: ['bottom_only'],
        },
      ],
    },
  ];
}

export function useLoadingPlanProducts(planId: string) {
  return useQuery({
    queryKey: ['loading-plan-products', planId] as const,
    queryFn: (): PlanProductGroup[] => {
      return z
        .array(planProductGroupSchema)
        .parse(MOCK_PLAN_PRODUCTS[planId] ?? getDefaultProductGroups(planId));
    },
    enabled: Boolean(planId),
    staleTime: 5 * 60 * 1000,
  });
}
