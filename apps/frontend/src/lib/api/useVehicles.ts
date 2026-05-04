import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { VehicleType, DoorDirection, type Vehicle } from '@/lib/types/vehicle';
import type { VehicleFormValues } from '@/features/data-management/schemas/vehicleSchema';
import { useAuthStore } from '@/lib/store/useAuthStore';
import { axiosInstance } from './axiosInstance';
import {
  vehicleApiSchema,
  singleVehicleApiSchema,
  fromApiVehicle,
  buildCreateVehiclePayload,
  VEHICLE_TYPE_INT,
} from './vehicleMappers';

// ─── List API response schema ─────────────────────────────────────────────────

const vehicleListApiItemSchema = z.object({
  id: z.string().uuid(),
  vehicleName: z.string(),
  vehicleType: z.number().int(),
  plateNumber: z.string().nullable().optional(),
  internalWidth: z.number(),
  internalHeight: z.number(),
  internalLength: z.number(),
  maxWeightCapacity: z.number(),
  layerCount: z.number().int().nullable().optional(),
  loadingType: z.number().int().nullable().optional(),
  isActive: z.boolean().optional(),
  isFavorite: z.boolean().optional(),
});

const vehicleListApiResponseSchema = z.object({
  isSuccess: z.boolean(),
  data: z.object({
    items: z.array(vehicleListApiItemSchema),
    totalCount: z.number().int(),
    page: z.number().int(),
    pageSize: z.number().int(),
  }),
});

type VehicleListApiItem = z.infer<typeof vehicleListApiItemSchema>;

const VEHICLE_TYPE_MAP: Record<number, VehicleType> = {
  0: VehicleType.Tir,
  1: VehicleType.Kamyon,
  2: VehicleType.Kamposet,
  3: VehicleType.Konteyner,
};

const LOADING_TYPE_MAP: Record<number, (typeof DoorDirection)[keyof typeof DoorDirection]> = {
  0: DoorDirection.Rear,
  1: DoorDirection.Side,
  2: DoorDirection.Top,
  3: DoorDirection.RearAndSide,
};

function fromApiVehicleListItem(api: VehicleListApiItem): Vehicle {
  return {
    id: api.id,
    name: api.vehicleName,
    vehicleType: VEHICLE_TYPE_MAP[api.vehicleType] ?? VehicleType.Kamyon,
    plate: api.plateNumber ?? undefined,
    width: api.internalWidth,
    height: api.internalHeight,
    length: api.internalLength,
    maxCargoWeight: api.maxWeightCapacity,
    maxLayerCount: api.layerCount ?? undefined,
    doorDirection: LOADING_TYPE_MAP[api.loadingType ?? 0] ?? DoorDirection.Rear,
    isFavorite: api.isFavorite ?? false,
    isActive: api.isActive ?? true,
    isDeleted: false,
    createdAt: new Date(0).toISOString(),
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

export function useVehicles(filters?: VehicleFilters) {
  const companyId = useCompanyId();
  const mergedFilters = { isDeleted: false, ...filters };
  return useQuery({
    queryKey: ['vehicles', companyId, mergedFilters] as const,
    queryFn: async (): Promise<Vehicle[]> => {
      const params = new URLSearchParams();
      if (mergedFilters.search) params.set('searchTerm', mergedFilters.search);
      if (mergedFilters.page !== undefined) params.set('page', String(mergedFilters.page));
      if (mergedFilters.pageSize !== undefined)
        params.set('pageSize', String(mergedFilters.pageSize));

      // Vehicle type filter — convert string label to backend int
      if (mergedFilters.vehicleType) {
        const typeInt =
          VEHICLE_TYPE_INT[mergedFilters.vehicleType as keyof typeof VEHICLE_TYPE_INT];
        if (typeInt !== undefined) params.set('vehicleType', String(typeInt));
      }

      // Status filter
      if (mergedFilters.status) {
        params.set('isActive', String(mergedFilters.status === 'active'));
      }

      // Favorites filter
      if (mergedFilters.favoritesOnly) {
        params.set('isFavorite', 'true');
      }

      const qs = params.toString();
      const { data } = await axiosInstance.get<unknown>(`/api/v1/vehicles${qs ? `?${qs}` : ''}`);
      const parsed = vehicleListApiResponseSchema.parse(data);
      return parsed.data.items.map(fromApiVehicleListItem);
    },
    staleTime: 5 * 60 * 1000,
    select: (data) => {
      return [...data].sort((a, b) => {
        if (a.isFavorite === b.isFavorite) return 0;
        return a.isFavorite ? -1 : 1;
      });
    },
  });
}

export function useVehicle(id: string, initialData?: Vehicle) {
  const queryClient = useQueryClient();
  const companyId = useCompanyId();
  return useQuery({
    queryKey: ['vehicles', companyId, id] as const,
    queryFn: (): Vehicle => {
      const caches = queryClient.getQueriesData<Vehicle[]>({ queryKey: ['vehicles', companyId] });
      for (const [, data] of caches) {
        if (!Array.isArray(data)) continue;
        const found = data.find((v) => v.id === id);
        if (found) return found;
      }
      throw new Error('Araç bulunamadı');
    },
    initialData,
    enabled: Boolean(id),
    staleTime: 2 * 60 * 1000,
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
    },
  });
}

export function useUpdateVehicle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<VehicleFormValues> }) => {
      const payload = buildCreateVehiclePayload(data as VehicleFormValues);
      const { data: res } = await axiosInstance.put<unknown>(`/api/v1/vehicles/${id}`, payload);
      const parsed = singleVehicleApiSchema.safeParse(res);
      return parsed.success ? fromApiVehicle(parsed.data.data) : null;
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
        isActive: vehicle.isActive ?? true,
        status: vehicle.status,
      } as VehicleFormValues);
      await axiosInstance.put<unknown>(`/api/v1/vehicles/${vehicle.id}`, {
        ...payload,
        isDeleted: true,
      });
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
      const keys = queryClient.getQueriesData<Vehicle[]>({ queryKey: ['vehicles', companyId] });
      keys.forEach(([key, data]) => {
        if (!data) return;
        queryClient.setQueryData<Vehicle[]>(
          key,
          data.map((v) => (v.id === id ? { ...v, isFavorite } : v)),
        );
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

const existsSchema = z.union([
  z.object({ data: z.object({ exists: z.boolean() }) }).transform((r) => r.data),
  z.object({ exists: z.boolean() }),
]);

export function useVehicleDuplicateCheck(name: string) {
  return useQuery({
    queryKey: ['vehicles', 'duplicate-check', name] as const,
    queryFn: async () => {
      const { data } = await axiosInstance.get<unknown>(
        `/api/v1/vehicles/check-name?name=${encodeURIComponent(name)}`,
      );
      return existsSchema.parse(data);
    },
    enabled: name.trim().length > 0,
  });
}

export function useVehiclePlateCheck(plate: string) {
  return useQuery({
    queryKey: ['vehicles', 'plate-check', plate] as const,
    queryFn: async () => {
      const { data } = await axiosInstance.get<unknown>(
        `/api/v1/vehicles/check-plate?plate=${encodeURIComponent(plate)}`,
      );
      return existsSchema.parse(data);
    },
    enabled: plate.trim().length > 0,
  });
}

export function useVehicleSerialCheck(serial: string) {
  return useQuery({
    queryKey: ['vehicles', 'serial-check', serial] as const,
    queryFn: async () => {
      const { data } = await axiosInstance.get<unknown>(
        `/api/v1/vehicles/check-serial?serial=${encodeURIComponent(serial)}`,
      );
      return existsSchema.parse(data);
    },
    enabled: serial.trim().length > 0,
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
