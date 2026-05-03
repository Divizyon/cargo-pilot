import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { toast } from 'sonner';
import type { AxiosError } from 'axios';
import type { VehicleFormValues } from '@/features/data-management/schemas/vehicleSchema';
import type { Vehicle } from '@/lib/types/vehicle';
import { axiosInstance } from './axiosInstance';
import {
  fromApiVehicle,
  paginatedVehiclesApiSchema,
  toCreateVehicleRequest,
  createVehicleResponseSchema,
  VEHICLE_TYPE_TO_API,
} from './vehicleMappers';

const VEHICLES_ENDPOINT = '/api/v1/vehicles';

interface ProblemDetails {
  type?: string;
  title?: string;
  status?: number;
  detail?: string;
}

interface CreateVehicleResponse {
  isSuccess?: boolean;
  data?: string;
}

export interface VehicleFilters {
  search?: string;
  vehicleType?: string;
  isActive?: boolean;
  page?: number;
  pageSize?: number;
}

export function useVehicles(filters?: VehicleFilters) {
  return useQuery({
    queryKey: ['vehicles', filters] as const,
    queryFn: async (): Promise<Vehicle[]> => {
      const params = new URLSearchParams();
      if (filters?.search) params.set('searchTerm', filters.search);
      if (filters?.vehicleType && filters.vehicleType !== 'all') {
        params.set('vehicleType', String(VEHICLE_TYPE_TO_API[filters.vehicleType] ?? 0));
      }
      if (filters?.isActive !== undefined) params.set('isActive', String(filters.isActive));
      params.set('isExport', 'true');
      const qs = params.toString();
      const { data } = await axiosInstance.get<unknown>(
        `${VEHICLES_ENDPOINT}${qs ? `?${qs}` : ''}`,
      );
      const parsed = paginatedVehiclesApiSchema.parse(data);
      return parsed.data.items.map(fromApiVehicle);
    },
    staleTime: 5 * 60 * 1000,
  });
}

// Backend has no GET /vehicles/:id endpoint yet — stub to avoid breaking VehicleEditPage
export function useVehicle(_id: string) {
  return {
    data: undefined as Vehicle | undefined,
    isLoading: false,
    isError: true,
  };
}

export function useCreateVehicle() {
  const queryClient = useQueryClient();
  return useMutation<CreateVehicleResponse, AxiosError<ProblemDetails>, VehicleFormValues>({
    mutationFn: (values) =>
      axiosInstance
        .post<CreateVehicleResponse>(VEHICLES_ENDPOINT, toCreateVehicleRequest(values))
        .then((r) => {
          createVehicleResponseSchema.parse(r.data);
          return r.data;
        }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      toast.success('Araç başarıyla eklendi', { position: 'bottom-right' });
    },
    onError: (error) => {
      const status = error.response?.status;
      const detail = error.response?.data?.detail;
      if (status === 409) {
        toast.error('Bu plaka zaten kullanımda.', { position: 'bottom-right' });
        return;
      }
      if (status === 400) {
        toast.error(detail ?? 'Doğrulama hatası. Lütfen alanları kontrol edin.', {
          position: 'bottom-right',
        });
        return;
      }
      if (status && status !== 401 && status < 500) {
        toast.error(detail ?? 'Araç eklenemedi.', { position: 'bottom-right' });
      }
    },
  });
}

export function useUpdateVehicle() {
  const queryClient = useQueryClient();
  return useMutation<
    CreateVehicleResponse,
    AxiosError<ProblemDetails>,
    { id: string; data: VehicleFormValues }
  >({
    mutationFn: ({ id, data }) =>
      axiosInstance
        .put<CreateVehicleResponse>(`${VEHICLES_ENDPOINT}/${id}`, toCreateVehicleRequest(data))
        .then((r) => r.data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      toast.success('Araç güncellendi', { position: 'bottom-right' });
    },
    onError: (error) => {
      const status = error.response?.status;
      const detail = error.response?.data?.detail;
      if (status === 409) {
        toast.error('Bu plaka başka bir araçta kullanılıyor.', { position: 'bottom-right' });
        return;
      }
      if (status === 404) {
        toast.error('Araç bulunamadı.', { position: 'bottom-right' });
        return;
      }
      if (status === 400) {
        toast.error(detail ?? 'Doğrulama hatası. Lütfen alanları kontrol edin.', {
          position: 'bottom-right',
        });
        return;
      }
      if (status && status !== 401 && status < 500) {
        toast.error(detail ?? 'Araç güncellenemedi.', { position: 'bottom-right' });
      }
    },
  });
}

export function useDeleteVehicle() {
  const queryClient = useQueryClient();
  return useMutation<void, AxiosError<ProblemDetails>, string>({
    mutationFn: (id) => axiosInstance.delete(`${VEHICLES_ENDPOINT}/${id}`).then(() => undefined),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      toast.success('Araç silindi', { position: 'bottom-right' });
    },
    onError: (error) => {
      const status = error.response?.status;
      const detail = error.response?.data?.detail;
      if (status === 404) {
        toast.error('Araç bulunamadı.', { position: 'bottom-right' });
        return;
      }
      if (status && status !== 401 && status < 500) {
        toast.error(detail ?? 'Araç silinemedi.', { position: 'bottom-right' });
      }
    },
  });
}

export function useArchiveVehicle() {
  const queryClient = useQueryClient();
  return useMutation<void, AxiosError<ProblemDetails>, string>({
    mutationFn: (id) =>
      axiosInstance.patch(`${VEHICLES_ENDPOINT}/${id}`, { isActive: false }).then(() => undefined),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      toast.success('Araç arşivlendi', { position: 'bottom-right' });
    },
  });
}

export function useToggleFavorite() {
  const queryClient = useQueryClient();
  return useMutation<void, AxiosError<ProblemDetails>, { id: string; isFavorite: boolean }>({
    mutationFn: ({ id, isFavorite }) =>
      axiosInstance.patch(`${VEHICLES_ENDPOINT}/${id}`, { isFavorite }).then(() => undefined),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ['vehicles'] });
    },
  });
}

const plansSchema = z.array(z.object({ id: z.string(), name: z.string(), isActive: z.boolean() }));

export function useVehiclePlans(vehicleId: string) {
  return useQuery({
    queryKey: ['vehicle-plans', vehicleId] as const,
    queryFn: async () => {
      const { data } = await axiosInstance.get<unknown>(`${VEHICLES_ENDPOINT}/${vehicleId}/plans`);
      return plansSchema.parse(data);
    },
    enabled: Boolean(vehicleId),
  });
}

const duplicateCheckSchema = z.object({ exists: z.boolean() });

export function useVehicleDuplicateCheck(name: string) {
  return useQuery({
    queryKey: ['vehicles', 'duplicate-check', name] as const,
    queryFn: async () => {
      const { data } = await axiosInstance.get<unknown>(
        `${VEHICLES_ENDPOINT}/check-name?name=${encodeURIComponent(name)}`,
      );
      return duplicateCheckSchema.parse(data);
    },
    enabled: name.trim().length > 0,
  });
}

export function useVehiclePlateCheck(plate: string) {
  return useQuery({
    queryKey: ['vehicles', 'plate-check', plate] as const,
    queryFn: async () => {
      const { data } = await axiosInstance.get<unknown>(
        `${VEHICLES_ENDPOINT}/check-plate?plate=${encodeURIComponent(plate)}`,
      );
      return duplicateCheckSchema.parse(data);
    },
    enabled: plate.trim().length > 0,
  });
}

export function useVehicleSerialCheck(serial: string) {
  return useQuery({
    queryKey: ['vehicles', 'serial-check', serial] as const,
    queryFn: async () => {
      const { data } = await axiosInstance.get<unknown>(
        `${VEHICLES_ENDPOINT}/check-serial?serial=${encodeURIComponent(serial)}`,
      );
      return duplicateCheckSchema.parse(data);
    },
    enabled: serial.trim().length > 0,
  });
}
