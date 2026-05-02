import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';
import { vehicleSchema } from '@/lib/types/vehicle';
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

const duplicateCheckSchema = z.object({ exists: z.boolean() });

export function useVehicleDuplicateCheck(name: string) {
  return useQuery({
    queryKey: ['vehicles', 'duplicate-check', name] as const,
    queryFn: () =>
      apiFetch(
        `/vehicles/check-name?name=${encodeURIComponent(name)}`,
        duplicateCheckSchema,
      ),
    enabled: name.trim().length > 0,
  });
}
