import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { vehicleSchema } from '@/lib/types/vehicle';
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
