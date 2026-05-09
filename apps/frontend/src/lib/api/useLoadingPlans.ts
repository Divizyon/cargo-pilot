import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { toast } from 'sonner';
import type { AxiosError } from 'axios';
import {
  loadingPlanSchema,
  type LoadingPlanListItem,
} from '@/lib/types/loadingPlan';
import { apiFetch } from './fetcher';
import { axiosInstance } from './axiosInstance';
import {
  planDetailApiResponseSchema,
  planListApiResponseSchema,
  planListApiItemSchema,
  extractListData,
  fromApiPlanListItem,
  fromApiDetailPlacements,
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

// ─── List hook ────────────────────────────────────────────────────────────────

export function useLoadingPlanList(filters?: LoadingPlanListFilters, page = 1, pageSize = 10) {
  return useQuery({
    queryKey: ['loading-plan-list', filters, page, pageSize] as const,
    queryFn: async (): Promise<LoadingPlanListPage> => {
      const { data } = await axiosInstance.get<unknown>('/api/v1/loading-plans', {
        params: { page, pageSize, sortBy: 'createdAt', sortDirection: 'desc' },
      });

      const parsed = planListApiResponseSchema.safeParse(data);
      if (!parsed.success) {
        console.error('[useLoadingPlanList] parse error', parsed.error);
        return { items: [], totalCount: 0, allVehicleNames: [] };
      }

      const { rawItems, totalCount } = extractListData(parsed.data);
      const mappedItems = rawItems
        .map((raw) => {
          const p = planListApiItemSchema.safeParse(raw);
          return p.success ? fromApiPlanListItem(p.data) : null;
        })
        .filter((item): item is LoadingPlanListItem => item !== null);

      const allVehicleNames = [...new Set(mappedItems.map((p) => p.vehicleName).filter(Boolean))];
      const filtered = applyClientFilters(mappedItems, filters);

      return {
        items: filtered,
        totalCount: filters && Object.values(filters).some(Boolean) ? filtered.length : totalCount,
        allVehicleNames,
      };
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
    mutationFn: (id) => axiosInstance.delete(`/api/v1/loading-plans/${id}`).then(() => undefined),
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

// ─── Client-side filter (API bu parametreleri desteklemiyor) ──────────────────

function applyClientFilters(
  plans: LoadingPlanListItem[],
  filters?: LoadingPlanListFilters,
): LoadingPlanListItem[] {
  let result = plans;
  if (filters?.search && filters.search.length >= 2) {
    const q = filters.search.toLowerCase();
    result = result.filter(
      (p) =>
        p.planName.toLowerCase().includes(q) ||
        (p.vehiclePlate ?? '').toLowerCase().includes(q) ||
        p.vehicleName.toLowerCase().includes(q),
    );
  }
  if (filters?.plate && filters.plate.length >= 2) {
    const q = filters.plate.toLowerCase();
    result = result.filter((p) => (p.vehiclePlate ?? '').toLowerCase().includes(q));
  }
  if (filters?.vehicleNames && filters.vehicleNames.length > 0) {
    result = result.filter((p) => filters.vehicleNames!.includes(p.vehicleName));
  }
  if (filters?.dateFrom) {
    const from = new Date(filters.dateFrom).getTime();
    result = result.filter((p) => new Date(p.plannedAt ?? p.createdAt).getTime() >= from);
  }
  if (filters?.dateTo) {
    const to = new Date(filters.dateTo);
    to.setHours(23, 59, 59, 999);
    result = result.filter((p) => new Date(p.plannedAt ?? p.createdAt).getTime() <= to.getTime());
  }
  if (filters?.status) {
    result = result.filter((p) => p.status === filters.status);
  }
  return result;
}

export function useLoadingPlanProducts(planId: string) {
  return useQuery({
    queryKey: ['loading-plan-products', planId] as const,
    queryFn: async (): Promise<import('@/lib/types/loadingPlan').PlanProductGroup[]> => {
      const { data } = await axiosInstance.get<unknown>(`/api/v1/loading-plans/${planId}`);
      console.log('[useLoadingPlanProducts] raw response keys:', Object.keys(data as object));
      const parsed = planDetailApiResponseSchema.safeParse(data);
      if (!parsed.success) {
        console.error('[useLoadingPlanProducts] parse error', parsed.error);
        return [];
      }
      const d = parsed.data.data;
      const rawPlacements = d.placements?.length ? d.placements : d.placementDetails ?? [];
      const rawInput = (d as Record<string, unknown>)['inputItems'];
      console.log('[useLoadingPlanProducts] inputItems[0]:', Array.isArray(rawInput) ? rawInput[0] : rawInput);
      const source = rawPlacements.length
        ? rawPlacements
        : Array.isArray(rawInput) ? (rawInput as typeof rawPlacements) : [];
      return fromApiDetailPlacements(source);
    },
    enabled: Boolean(planId),
    staleTime: 5 * 60 * 1000,
  });
}
