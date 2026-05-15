import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { toast } from 'sonner';
import type { AxiosError } from 'axios';
import { loadingPlanSchema, type LoadingPlanListItem } from '@/lib/types/loadingPlan';
import { apiFetch } from './fetcher';
import { axiosInstance } from './axiosInstance';
import {
  planDetailApiResponseSchema,
  planListApiResponseSchema,
  planListApiItemSchema,
  extractListData,
  fromApiPlanListItem,
  fromApiDetailPlacements,
  fromApiPlacementsToScene,
  planFullDetailApiResponseSchema,
  fromApiFullDetail,
  type PlanFullDetail,
} from './loadingPlanMappers';
import type { PlacementWithDimensions } from '@/lib/types/loadingPlan';
import type { OptimizationCriteria } from '@/lib/types/loadingPlan';
import type { UnplacedEntry } from '@/lib/store/usePlanStore';

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
        vehicleId: d.vehicleId ?? d.vehicle?.id ?? '',
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

// ─── Full detail hook (3D planner) ────────────────────────────────────────────

export function useLoadingPlanDetail(id: string | undefined) {
  return useQuery<PlanFullDetail>({
    queryKey: ['loading-plan-detail', id] as const,
    queryFn: async (): Promise<PlanFullDetail> => {
      const { data } = await axiosInstance.get<unknown>(`/api/v1/loading-plans/${id}`);
      const parsed = planFullDetailApiResponseSchema.safeParse(data);
      if (!parsed.success) {
        console.error('[useLoadingPlanDetail] parse error', parsed.error);
        return { planName: '—', vehicle: null, inputItems: [], placements: [], skuColorMap: {}, unplacedItems: [] };
      }
      return fromApiFullDetail(parsed.data.data);
    },
    enabled: Boolean(id),
    staleTime: 5 * 60 * 1000,
  });
}

// ─── Create mutation ───────────────────────────────────────────────────────────

interface CreateLoadingPlanInput {
  planName: string;
  vehicleId: string;
  items: Array<{ itemId: string; quantity: number }>;
  optimizationCriteria: OptimizationCriteria;
}

export function useCreateLoadingPlan() {
  const queryClient = useQueryClient();
  return useMutation<string, AxiosError<ProblemDetails>, CreateLoadingPlanInput>({
    mutationFn: async (input) => {
      const { data } = await axiosInstance.post<unknown>('/api/v1/loading-plans', input);

      // API returns the UUID directly as a string
      if (typeof data === 'string' && data !== '00000000-0000-0000-0000-000000000000') {
        return data;
      }

      // Fallback: wrapped response { isSuccess, message, data }
      const raw = data as Record<string, unknown>;
      if (raw['isSuccess'] === false) {
        const msg = (raw['message'] as string | undefined) ?? 'Plan oluşturulamadı';
        throw new Error(msg);
      }
      const nested = raw['data'];
      const id =
        (typeof nested === 'string' && nested !== '00000000-0000-0000-0000-000000000000'
          ? nested
          : undefined) ??
        (typeof nested === 'object' && nested !== null
          ? ((nested as Record<string, unknown>)['id'] as string | undefined)
          : undefined) ??
        (typeof raw['id'] === 'string' ? (raw['id'] as string) : undefined);

      if (!id) throw new Error('Plan ID alınamadı');
      return id;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['loading-plan-list'] });
    },
    onError: (error) => {
      const detail =
        error.response?.data?.detail ??
        error.message ??
        'Plan oluşturulamadı. Lütfen tekrar deneyin.';
      toast.error(detail, { position: 'bottom-right' });
    },
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

// ─── Approve mutation ─────────────────────────────────────────────────────────

export function useApprovePlan() {
  const queryClient = useQueryClient();
  return useMutation<void, AxiosError<ProblemDetails>, string>({
    mutationFn: (id) =>
      axiosInstance
        .patch(`/api/v1/loading-plans/${id}/status`, { status: 'tamamlandi' })
        .then(() => undefined),
    onSuccess: (_data, id) => {
      void queryClient.invalidateQueries({ queryKey: ['loading-plan-list'] });
      void queryClient.invalidateQueries({ queryKey: ['loading-plan-list-item', id] });
    },
    onError: (error) => {
      const detail = error.response?.data?.detail;
      toast.error(detail ?? 'Plan onaylanamadı.', { position: 'bottom-right' });
    },
  });
}

// ─── Re-optimize mutation (PUT) ───────────────────────────────────────────────

interface ReoptimizeLoadingPlanInput {
  id: string;
  vehicleId: string;
  items: Array<{ itemId: string; quantity: number }>;
  optimizationCriteria: OptimizationCriteria;
}

export function useReoptimizeLoadingPlan() {
  const queryClient = useQueryClient();
  return useMutation<string, AxiosError<ProblemDetails>, ReoptimizeLoadingPlanInput>({
    mutationFn: async ({ id, vehicleId, items, optimizationCriteria }) => {
      const { data } = await axiosInstance.put<unknown>(`/api/v1/loading-plans/${id}`, {
        vehicleId,
        items,
        optimizationCriteria,
      });

      if (typeof data === 'string' && data !== '00000000-0000-0000-0000-000000000000') {
        return data;
      }

      const raw = data as Record<string, unknown>;
      if (raw['isSuccess'] === false) {
        throw new Error((raw['message'] as string | undefined) ?? 'Plan optimize edilemedi');
      }
      const nested = raw['data'];
      const planId =
        (typeof nested === 'string' && nested !== '00000000-0000-0000-0000-000000000000'
          ? nested
          : undefined) ??
        (typeof nested === 'object' && nested !== null
          ? ((nested as Record<string, unknown>)['id'] as string | undefined)
          : undefined) ??
        (typeof raw['id'] === 'string' ? (raw['id'] as string) : undefined) ??
        id;
      return planId;
    },
    onSuccess: (planId) => {
      void queryClient.invalidateQueries({ queryKey: ['loading-plan-detail', planId] });
      void queryClient.invalidateQueries({ queryKey: ['loading-plan-list-item', planId] });
      void queryClient.invalidateQueries({ queryKey: ['loading-plan-list'] });
      toast.success('Plan yeniden optimize edildi.', { position: 'bottom-right', duration: 2000 });
    },
    onError: (error) => {
      const detail =
        error.response?.data?.detail ??
        error.message ??
        'Plan optimize edilemedi. Lütfen tekrar deneyin.';
      toast.error(detail, { position: 'bottom-right' });
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

// ─── Scene placements from backend result ─────────────────────────────────────

export function useLoadingPlanScenePlacements(planId: string, colorMap?: Record<string, string>) {
  return useQuery({
    queryKey: ['loading-plan-scene-placements', planId, colorMap] as const,
    queryFn: async (): Promise<PlacementWithDimensions[]> => {
      const { data } = await axiosInstance.get<unknown>(`/api/v1/loading-plans/${planId}`);
      const parsed = planDetailApiResponseSchema.safeParse(data);
      if (!parsed.success) return [];
      const d = parsed.data.data;
      const raw = d.placements?.length ? d.placements : (d.placementDetails ?? []);
      return fromApiPlacementsToScene(raw, colorMap);
    },
    enabled: Boolean(planId),
    staleTime: 5 * 60 * 1000,
  });
}

export function useLoadingPlanProducts(planId: string) {
  return useQuery({
    queryKey: ['loading-plan-products', planId] as const,
    queryFn: async (): Promise<import('@/lib/types/loadingPlan').PlanProductGroup[]> => {
      const { data } = await axiosInstance.get<unknown>(`/api/v1/loading-plans/${planId}`);
      const parsed = planDetailApiResponseSchema.safeParse(data);
      if (!parsed.success) {
        console.error('[useLoadingPlanProducts] parse error', parsed.error);
        return [];
      }
      const d = parsed.data.data;
      // inputItems: orijinal istek adetleri — sığmayan ürünler dahil
      if (d.inputItems?.length) {
        return fromApiDetailPlacements(
          d.inputItems as Parameters<typeof fromApiDetailPlacements>[0],
        );
      }
      // Fallback: sadece yerleştirilen kutular (adetler eksik olabilir)
      const rawPlacements = d.placements?.length ? d.placements : (d.placementDetails ?? []);
      return fromApiDetailPlacements(rawPlacements);
    },
    enabled: Boolean(planId),
    staleTime: 5 * 60 * 1000,
  });
}

export function useLoadingPlanUnplaced(planId: string | null) {
  return useQuery({
    queryKey: ['loading-plan-unplaced', planId] as const,
    queryFn: async (): Promise<UnplacedEntry[]> => {
      const { data } = await axiosInstance.get<unknown>(`/api/v1/loading-plans/${planId}`);
      const parsed = planDetailApiResponseSchema.safeParse(data);
      if (!parsed.success) return [];
      type RawU = {
        id?: string;
        itemId?: string;
        quantity: number;
        reason?: number;
        item?: { name?: string } | null;
      };
      return (parsed.data.data.unplacedItems ?? []).map((u: RawU) => ({
        itemId: u.itemId ?? u.id ?? '',
        quantity: u.quantity,
        reason: u.reason ?? 0,
        name: u.item?.name ?? '',
      }));
    },
    enabled: Boolean(planId),
    staleTime: 5 * 60 * 1000,
  });
}

// ─── ERP export mutation ───────────────────────────────────────────────────────

export function useExportPlanToERP() {
  return useMutation<void, AxiosError<ProblemDetails>, string>({
    mutationFn: (planId) =>
      axiosInstance.post(`/api/v1/plans/${planId}/export-erp`).then(() => undefined),
    onSuccess: () => {
      toast.success("Plan ERP'ye başarıyla aktarıldı", { position: 'bottom-right' });
    },
    onError: (error) => {
      const status = error.response?.status;
      const detail = error.response?.data?.detail;
      if (status === 409) {
        toast.error("Bu plan daha önce ERP'ye aktarılmış.", { position: 'bottom-right' });
        return;
      }
      if (status === 422) {
        toast.error(
          detail ?? 'Plan ERP aktarımı için uygun değil. Planın tamamlanmış olduğundan emin olun.',
          { position: 'bottom-right' },
        );
        return;
      }
      toast.error(detail ?? 'ERP aktarımı başarısız', { position: 'bottom-right' });
    },
  });
}
