import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { toast } from 'sonner';
import axios from 'axios';
import { VehicleType, DoorDirection, type Vehicle } from '@/lib/types/vehicle';
import type { VehicleFormValues } from '@/features/data-management/schemas/vehicleSchema';
import { useAuthStore } from '@/lib/store/useAuthStore';
import { axiosInstance } from './axiosInstance';
import {
  vehicleApiSchema,
  singleVehicleApiSchema,
  singleVehicleDetailApiSchema,
  fromApiVehicle,
  fromApiVehicleDetail,
  buildCreateVehiclePayload,
  VEHICLE_TYPE_INT,
  VEHICLE_TYPE_FROM_INT,
  LOADING_TYPE_FROM_INT,
} from './vehicleMappers';

// ─── List API response schema ─────────────────────────────────────────────────

const vehicleListApiItemSchema = z.object({
  id: z.string().uuid(),
  vehicleName: z.string(),
  vehicleType: z.number().int(),
  plateNumber: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  internalWidth: z.number(),
  internalHeight: z.number(),
  internalLength: z.number(),
  maxWeightCapacity: z.number(),
  layerCount: z.number().int().nullable().optional(),
  loadingType: z.number().int().nullable().optional(),
  isActive: z.boolean().optional(),
  isFavorite: z.boolean().optional(),
  createdAt: z.string().optional(),
  kingPinDistanceMm: z.number().nullable().optional(),
  kingPinTareWeightKg: z.number().nullable().optional(),
  kingPinMaxLoadKg: z.number().nullable().optional(),
  mainAxleDistanceMm: z.number().nullable().optional(),
  mainAxleTareWeightKg: z.number().nullable().optional(),
  mainAxleMaxLoadKg: z.number().nullable().optional(),
  additionalAxleDistanceMm: z.number().nullable().optional(),
  additionalAxleTareWeightKg: z.number().nullable().optional(),
  additionalAxleMaxLoadKg: z.number().nullable().optional(),
});

type VehicleListApiItem = z.infer<typeof vehicleListApiItemSchema>;

function fromApiVehicleListItem(api: VehicleListApiItem): Vehicle {
  const loadingTypeInfo = LOADING_TYPE_FROM_INT[api.loadingType ?? 0];
  const kingpin =
    api.kingPinDistanceMm != null && api.kingPinMaxLoadKg != null
      ? {
          distance: api.kingPinDistanceMm,
          tareWeight: api.kingPinTareWeightKg ?? 0,
          maxLoad: api.kingPinMaxLoadKg,
        }
      : undefined;
  const axleB =
    api.mainAxleDistanceMm != null && api.mainAxleMaxLoadKg != null
      ? {
          distance: api.mainAxleDistanceMm,
          tareWeight: api.mainAxleTareWeightKg ?? 0,
          maxLoad: api.mainAxleMaxLoadKg,
        }
      : undefined;
  const additionalAxle =
    api.additionalAxleDistanceMm != null && api.additionalAxleMaxLoadKg != null
      ? {
          distance: api.additionalAxleDistanceMm,
          tareWeight: api.additionalAxleTareWeightKg ?? 0,
          maxLoad: api.additionalAxleMaxLoadKg,
        }
      : undefined;

  return {
    id: api.id,
    name: api.vehicleName,
    vehicleType: VEHICLE_TYPE_FROM_INT[api.vehicleType] ?? VehicleType.Tir,
    description: api.description ?? undefined,
    plate: api.plateNumber ?? undefined,
    width: api.internalWidth,
    height: api.internalHeight,
    length: api.internalLength,
    maxCargoWeight: api.maxWeightCapacity,
    maxLayerCount: api.layerCount ?? undefined,
    doorDirection: loadingTypeInfo?.direction ?? DoorDirection.Rear,
    doorSide: loadingTypeInfo?.doorSide,
    kingpin,
    axleB,
    axles: additionalAxle ? [additionalAxle] : undefined,
    isFavorite: api.isFavorite ?? false,
    isActive: api.isActive ?? true,
    isDeleted: false,
    createdAt: api.createdAt ?? new Date(0).toISOString(),
    createdBy: { id: '', fullName: '' },
  };
}

// ─── Filters & hooks ──────────────────────────────────────────────────────────

export interface VehicleFilters {
  search?: string;
  vehicleType?: string;
  status?: string;
  favoritesOnly?: boolean;
  isDeleted?: boolean;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

function useCompanyId() {
  return useAuthStore((s) => s.user?.companyId ?? '');
}

export interface VehiclesPage {
  items: Vehicle[];
  totalCount: number;
}

export function useVehicles(filters?: VehicleFilters) {
  const companyId = useCompanyId();
  const mergedFilters = { isDeleted: false, ...filters };
  return useQuery({
    queryKey: ['vehicles', companyId, mergedFilters] as const,
    queryFn: async (): Promise<VehiclesPage> => {
      const params = new URLSearchParams();
      if (mergedFilters.search) params.set('searchTerm', mergedFilters.search);
      if (mergedFilters.page !== undefined) params.set('page', String(mergedFilters.page));
      if (mergedFilters.pageSize !== undefined)
        params.set('pageSize', String(mergedFilters.pageSize));

      if (mergedFilters.vehicleType) {
        const typeInt =
          VEHICLE_TYPE_INT[mergedFilters.vehicleType as keyof typeof VEHICLE_TYPE_INT];
        if (typeInt !== undefined) params.set('vehicleType', String(typeInt));
      }

      if (mergedFilters.status) {
        params.set('isActive', String(mergedFilters.status === 'active'));
      }

      if (mergedFilters.favoritesOnly) {
        params.set('onlyFavorites', 'true');
      }

      const qs = params.toString();
      const { data } = await axiosInstance.get<unknown>(`/api/v1/vehicles${qs ? `?${qs}` : ''}`);
      const raw = (data as Record<string, unknown>)?.data as Record<string, unknown>;
      const rawItems = raw?.items;
      const totalCount = (raw?.totalCount as number) ?? 0;
      if (!Array.isArray(rawItems)) return { items: [], totalCount };
      const validItems: Vehicle[] = [];
      for (const item of rawItems) {
        const result = vehicleListApiItemSchema.safeParse(item);
        if (result.success) {
          validItems.push(fromApiVehicleListItem(result.data));
        } else {
          console.error(
            '[useVehicles] tenant veri doğrulama hatası — öğe göz ardı edildi',
            result.error,
          );
        }
      }
      return { items: validItems, totalCount };
    },
    staleTime: 5 * 60 * 1000,
    select: (data): VehiclesPage => ({
      items: [...data.items].sort((a, b) => {
        if (a.isFavorite !== b.isFavorite) return a.isFavorite ? -1 : 1;
        return b.createdAt.localeCompare(a.createdAt);
      }),
      totalCount: data.totalCount,
    }),
  });
}

export function useVehicle(id: string) {
  const companyId = useCompanyId();
  return useQuery({
    queryKey: ['vehicles', companyId, id] as const,
    queryFn: async (): Promise<Vehicle> => {
      const { data } = await axiosInstance.get<unknown>(`/api/v1/vehicles/${id}`);
      const detail = singleVehicleDetailApiSchema.safeParse(data);
      if (detail.success) return fromApiVehicleDetail(detail.data.data);
      const wrapped = singleVehicleApiSchema.safeParse(data);
      if (wrapped.success) return fromApiVehicle(wrapped.data.data);
      const direct = vehicleApiSchema.safeParse(data);
      if (direct.success) return fromApiVehicle(direct.data);
      throw new Error('Araç bulunamadı');
    },
    enabled: Boolean(id),
    staleTime: 30 * 1000,
  });
}

export function useCreateVehicle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: VehicleFormValues) => {
      const payload = buildCreateVehiclePayload(data);
      const { data: res } = await axiosInstance.post<unknown>('/api/v1/vehicles', payload);
      const parsed = singleVehicleApiSchema.safeParse(res);
      return parsed.success ? fromApiVehicle(parsed.data.data) : null;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      toast.success('Araç başarıyla kaydedildi.', { position: 'bottom-right' });
    },
    onError: (err: unknown) => {
      if (axios.isAxiosError(err)) {
        if (err.response?.status === 409) {
          toast.error('Bu plaka zaten kayıtlı. Farklı bir plaka giriniz.', {
            position: 'bottom-right',
          });
        } else {
          toast.error('Araç kaydedilemedi. Lütfen tekrar deneyin.', { position: 'bottom-right' });
        }
      } else {
        toast.error('Araç kaydedilemedi. Lütfen tekrar deneyin.', { position: 'bottom-right' });
      }
    },
  });
}

export function useUpdateVehicle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<VehicleFormValues> }) => {
      const payload = buildCreateVehiclePayload(data as VehicleFormValues);
      console.debug('[useUpdateVehicle] payload', JSON.stringify(payload, null, 2));
      const { data: res } = await axiosInstance.put<unknown>(`/api/v1/vehicles/${id}`, payload);
      const parsed = singleVehicleApiSchema.safeParse(res);
      return parsed.success ? fromApiVehicle(parsed.data.data) : null;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      toast.success('Araç başarıyla güncellendi.', { position: 'bottom-right' });
    },
    onError: (err: unknown) => {
      if (axios.isAxiosError(err)) {
        console.error(
          '[useUpdateVehicle] error response',
          err.response?.status,
          JSON.stringify(err.response?.data, null, 2),
        );
        if (err.response?.status === 409) {
          toast.error('Bu plaka zaten kayıtlı. Farklı bir plaka giriniz.', {
            position: 'bottom-right',
          });
        } else {
          toast.error('Araç güncellenemedi. Lütfen tekrar deneyin.', { position: 'bottom-right' });
        }
      } else {
        toast.error('Araç güncellenemedi. Lütfen tekrar deneyin.', { position: 'bottom-right' });
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ['vehicles'] });
    },
  });
}

export function useDeleteVehicle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (vehicle: Vehicle) => {
      const payload = buildCreateVehiclePayload({
        vehicleType: vehicle.vehicleType,
        name: vehicle.name,
        description: vehicle.description ?? '',
        plate: vehicle.plate ?? '',
        serialNumber: vehicle.serialNumber ?? '',
        length: vehicle.length,
        width: vehicle.width,
        height: vehicle.height,
        maxCargoWeight: vehicle.maxCargoWeight,
        grossWeight: vehicle.grossWeight,
        tareWeight: vehicle.tareWeight,
        maxLayerCount: vehicle.maxLayerCount,
        doorDirection: vehicle.doorDirection,
        isActive: false,
        status: vehicle.status,
      } as VehicleFormValues);
      await axiosInstance.put<unknown>(`/api/v1/vehicles/${vehicle.id}`, payload);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['vehicles'] });
    },
  });
}

export function useArchiveVehicle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (vehicle: Vehicle) => {
      const payload = buildCreateVehiclePayload({
        vehicleType: vehicle.vehicleType,
        name: vehicle.name,
        description: vehicle.description ?? '',
        plate: vehicle.plate ?? '',
        serialNumber: vehicle.serialNumber ?? '',
        length: vehicle.length,
        width: vehicle.width,
        height: vehicle.height,
        maxCargoWeight: vehicle.maxCargoWeight,
        grossWeight: vehicle.grossWeight,
        tareWeight: vehicle.tareWeight,
        maxLayerCount: vehicle.maxLayerCount,
        doorDirection: vehicle.doorDirection,
        isActive: false,
        status: vehicle.status,
      } as VehicleFormValues);
      await axiosInstance.put<unknown>(`/api/v1/vehicles/${vehicle.id}`, payload);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['vehicles'] });
    },
  });
}

export function useToggleFavorite() {
  const queryClient = useQueryClient();
  const companyId = useCompanyId();
  return useMutation({
    mutationFn: async ({ id, isFavorite }: { id: string; isFavorite: boolean }) => {
      if (isFavorite) {
        await axiosInstance.post<unknown>(`/api/v1/vehicles/${id}/favorite`);
      } else {
        await axiosInstance.delete<unknown>(`/api/v1/vehicles/${id}/favorite`);
      }
    },
    onMutate: async ({ id, isFavorite }) => {
      await queryClient.cancelQueries({ queryKey: ['vehicles', companyId] });
      const keys = queryClient.getQueriesData<VehiclesPage>({ queryKey: ['vehicles', companyId] });
      keys.forEach(([key, data]) => {
        if (!data?.items) return;
        queryClient.setQueryData<VehiclesPage>(key, {
          ...data,
          items: data.items.map((v) => (v.id === id ? { ...v, isFavorite } : v)),
        });
      });
      return { keys };
    },
    onError: (_err, _vars, context) => {
      context?.keys.forEach(([key, data]) => {
        queryClient.setQueryData(key, data);
      });
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ['vehicles'] });
    },
  });
}

const plansItemSchema = z.object({ id: z.string(), name: z.string(), isActive: z.boolean() });
const plansResponseSchema = z.union([
  z.object({ data: z.array(plansItemSchema) }).transform((r) => r.data),
  z.array(plansItemSchema),
]);

export function useVehiclePlans(vehicleId: string) {
  return useQuery({
    queryKey: ['vehicle-plans', vehicleId] as const,
    queryFn: async () => {
      const { data } = await axiosInstance.get<unknown>(`/api/v1/vehicles/${vehicleId}/plans`);
      return plansResponseSchema.parse(data);
    },
    enabled: Boolean(vehicleId),
  });
}

// TODO: Backend check-name/check-plate/check-serial hazır olunca kullanılacak
// const existsSchema = z.union([...]);

// TODO: Backend check-name/check-plate/check-serial endpoint'leri eklenince enabled: false kaldırılacak
export function useVehicleDuplicateCheck(_name: string) {
  return useQuery({
    queryKey: ['vehicles', 'duplicate-check', _name] as const,
    queryFn: async () => ({ exists: false }),
    enabled: false,
  });
}

export function useVehiclePlateCheck(_plate: string) {
  return useQuery({
    queryKey: ['vehicles', 'plate-check', _plate] as const,
    queryFn: async () => ({ exists: false }),
    enabled: false,
  });
}

export function useVehicleSerialCheck(_serial: string) {
  return useQuery({
    queryKey: ['vehicles', 'serial-check', _serial] as const,
    queryFn: async () => ({ exists: false }),
    enabled: false,
  });
}

export function useDuplicateVehicle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      vehicleName,
      plateNumber,
    }: {
      id: string;
      vehicleName: string;
      plateNumber: string;
    }) => {
      const { data } = await axiosInstance.post<unknown>(`/api/v1/vehicles/${id}/duplicate`, {
        vehicleName,
        plateNumber,
      });
      const parsed = singleVehicleApiSchema.safeParse(data);
      return parsed.success ? fromApiVehicle(parsed.data.data) : null;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['vehicles'] });
    },
  });
}

// ─── Planning-context vehicle create ─────────────────────────────────────────

export const planVehicleCreatePayloadSchema = z.object({
  vehicleName: z.string(),
  plateNumber: z.string(),
  vehicleType: z.number().int(),
  internalWidth: z.number(),
  internalHeight: z.number(),
  internalLength: z.number(),
  maxWeightCapacity: z.number(),
  layerCount: z.number().int(),
  loadingType: z.number().int(),
});

export type PlanVehicleCreatePayload = z.infer<typeof planVehicleCreatePayloadSchema>;

function extractCreatedId(data: unknown): string | null {
  if (typeof data === 'string' && /^[0-9a-f-]{36}$/i.test(data)) return data;
  if (data !== null && typeof data === 'object') {
    const obj = data as Record<string, unknown>;
    if (typeof obj.id === 'string') return obj.id;
    if (typeof obj.data === 'string') return obj.data;
    if (obj.data !== null && typeof obj.data === 'object') {
      const inner = obj.data as Record<string, unknown>;
      if (typeof inner.id === 'string') return inner.id;
    }
  }
  return null;
}

export function useCreatePlanVehicle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: PlanVehicleCreatePayload): Promise<string | null> => {
      const { data } = await axiosInstance.post<unknown>(
        '/api/v1/vehicles',
        planVehicleCreatePayloadSchema.parse(payload),
      );
      return extractCreatedId(data);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['vehicles'] });
    },
  });
}

// Re-export schema for consumers that used the old apiFetch-based export
export { vehicleApiSchema };
