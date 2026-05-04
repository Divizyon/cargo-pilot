import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { vehicleSchema, VehicleType, DoorDirection, type Vehicle } from '@/lib/types/vehicle';
import type { VehicleFormValues } from '@/features/data-management/schemas/vehicleSchema';
import { useAuthStore } from '@/lib/store/useAuthStore';
import { apiFetch } from './fetcher';
import { axiosInstance } from './axiosInstance';

// ─── API response schema (actual shape returned by backend) ──────────────────

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
    // API returns mm; frontend uses cm
    width: api.internalWidth / 10,
    height: api.internalHeight / 10,
    length: api.internalLength / 10,
    // API returns grams; frontend uses kg
    maxCargoWeight: api.maxWeightCapacity / 1000,
    maxLayerCount: api.layerCount ?? undefined,
    doorDirection: LOADING_TYPE_MAP[api.loadingType ?? 0] ?? DoorDirection.Rear,
    isFavorite: false,
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

export function useVehicle(id: string) {
  const companyId = useCompanyId();
  return useQuery({
    queryKey: ['vehicles', companyId, id] as const,
    queryFn: () => apiFetch(`/vehicles/${id}`, vehicleSchema),
    enabled: Boolean(id),
    staleTime: 2 * 60 * 1000,
  });
}

export function useCreateVehicle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: VehicleFormValues) =>
      apiFetch('/vehicles', vehicleSchema, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['vehicles'] });
    },
  });
}

export function useUpdateVehicle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<VehicleFormValues> }) =>
      apiFetch(`/vehicles/${id}`, vehicleSchema, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ['vehicles'] });
    },
  });
}

export function useDeleteVehicle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/vehicles/${id}`, z.object({ success: z.boolean() }), { method: 'DELETE' }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['vehicles'] });
    },
  });
}

export function useArchiveVehicle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/vehicles/${id}`, vehicleSchema, {
        method: 'PATCH',
        body: JSON.stringify({ isActive: false }),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['vehicles'] });
    },
  });
}

export function useToggleFavorite() {
  const queryClient = useQueryClient();
  const companyId = useCompanyId();
  return useMutation({
    mutationFn: ({ id, isFavorite }: { id: string; isFavorite: boolean }) =>
      apiFetch(`/vehicles/${id}`, vehicleSchema, {
        method: 'PATCH',
        body: JSON.stringify({ isFavorite }),
      }),
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

export function useVehiclePlans(vehicleId: string) {
  return useQuery({
    queryKey: ['vehicle-plans', vehicleId] as const,
    queryFn: () =>
      apiFetch(
        `/vehicles/${vehicleId}/plans`,
        z.array(z.object({ id: z.string(), name: z.string(), isActive: z.boolean() })),
      ),
    enabled: Boolean(vehicleId),
  });
}

const duplicateCheckSchema = z.object({ exists: z.boolean() });

export function useVehicleDuplicateCheck(name: string) {
  return useQuery({
    queryKey: ['vehicles', 'duplicate-check', name] as const,
    queryFn: () =>
      apiFetch(`/vehicles/check-name?name=${encodeURIComponent(name)}`, duplicateCheckSchema),
    enabled: name.trim().length > 0,
  });
}

export function useVehiclePlateCheck(plate: string) {
  return useQuery({
    queryKey: ['vehicles', 'plate-check', plate] as const,
    queryFn: () =>
      apiFetch(`/vehicles/check-plate?plate=${encodeURIComponent(plate)}`, duplicateCheckSchema),
    enabled: plate.trim().length > 0,
  });
}

export function useVehicleSerialCheck(serial: string) {
  return useQuery({
    queryKey: ['vehicles', 'serial-check', serial] as const,
    queryFn: () =>
      apiFetch(`/vehicles/check-serial?serial=${encodeURIComponent(serial)}`, duplicateCheckSchema),
    enabled: serial.trim().length > 0,
  });
}

// ─── Planning-context vehicle create ─────────────────────────────────────────

const planVehicleCreatePayloadSchema = z.object({
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
