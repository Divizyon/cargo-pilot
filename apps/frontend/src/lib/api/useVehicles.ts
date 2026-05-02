import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { vehicleSchema, type Vehicle } from '@/lib/types/vehicle';
import type { VehicleFormValues } from '@/features/data-management/schemas/vehicleSchema';
import { apiFetch } from './fetcher';

interface VehicleFilters {
  search?: string;
  page?: number;
}

export function useVehicles(filters?: VehicleFilters) {
  return useQuery({
    queryKey: ['vehicles', filters] as const,
    queryFn: () => apiFetch('/vehicles', z.array(vehicleSchema)),
  });
}

export function useVehicle(id: string) {
  return useQuery({
    queryKey: ['vehicles', id] as const,
    queryFn: () => apiFetch(`/vehicles/${id}`, vehicleSchema),
    enabled: Boolean(id),
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

export function useUpdateVehicle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<VehicleFormValues> }) =>
      apiFetch(`/vehicles/${id}`, vehicleSchema, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: ['vehicles'] });
      const previous = queryClient.getQueryData<Vehicle[]>(['vehicles']);
      queryClient.setQueryData<Vehicle[]>(['vehicles'], (old) =>
        old?.map((v) => (v.id === id ? { ...v, ...data } : v)) ?? [],
      );
      return { previous };
    },
    onError: (_err, _vars, context) => {
      queryClient.setQueryData(['vehicles'], context?.previous);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ['vehicles'] });
    },
  });
}
