import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { vehicleSchema, type Vehicle } from '@/lib/types/vehicle';
import type { VehicleFormValues } from '@/features/data-management/schemas/vehicleSchema';
import { useAuthStore } from '@/lib/store/useAuthStore';
import { apiFetch } from './fetcher';

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
    queryFn: () => {
      const params = new URLSearchParams();
      Object.entries(mergedFilters).forEach(([k, v]) => {
        if (v !== undefined && v !== '') params.set(k, String(v));
      });
      const qs = params.toString();
      return apiFetch(`/vehicles${qs ? `?${qs}` : ''}`, z.array(vehicleSchema));
    },
    staleTime: 5 * 60 * 1000,
    select: (data) => {
      const sorted = [...data].sort((a, b) => {
        if (a.isFavorite === b.isFavorite) return 0;
        return a.isFavorite ? -1 : 1;
      });
      return sorted;
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
