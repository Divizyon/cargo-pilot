import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { AxiosError } from 'axios';
import { axiosInstance } from '@/lib/api/axiosInstance';

const QUERY_KEY = ['settings', 'reporting'] as const;

interface ReportingSettingsData {
  companyName?: string;
  phone?: string;
  email?: string;
  address?: string;
  logoUrl?: string;
}

interface SettingsApiResponse<T> {
  isSuccess: boolean;
  message: string;
  data: T;
}

export function useReportingSettings() {
  return useQuery<ReportingSettingsData>({
    queryKey: QUERY_KEY,
    queryFn: () =>
      axiosInstance
        .get<SettingsApiResponse<ReportingSettingsData>>('/api/v1/settings/reporting')
        .then((r) => r.data.data),
    staleTime: 5 * 60 * 1000,
  });
}

interface UpdateReportingSettingsPayload {
  companyName?: string;
  phone?: string;
  email?: string;
  address?: string;
}

export function useUpdateReportingSettings() {
  const queryClient = useQueryClient();

  return useMutation<
    SettingsApiResponse<ReportingSettingsData>,
    AxiosError,
    UpdateReportingSettingsPayload
  >({
    mutationFn: (payload) =>
      axiosInstance
        .put<SettingsApiResponse<ReportingSettingsData>>('/api/v1/settings/reporting', payload)
        .then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      toast.success('Raporlama ayarları başarıyla kaydedildi.', { position: 'bottom-right' });
    },
    onError: () => {
      toast.error('Ayarlar kaydedilemedi. Lütfen tekrar deneyin.', { position: 'bottom-right' });
    },
  });
}

export function useUploadReportingLogo() {
  const queryClient = useQueryClient();

  return useMutation<SettingsApiResponse<ReportingSettingsData>, AxiosError, File>({
    mutationFn: (file) => {
      const form = new FormData();
      form.append('logo', file);
      return axiosInstance
        .post<
          SettingsApiResponse<ReportingSettingsData>
        >('/api/v1/settings/reporting/logo', form, { headers: { 'Content-Type': 'multipart/form-data' } })
        .then((r) => r.data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      toast.success('Logo başarıyla yüklendi.', { position: 'bottom-right' });
    },
    onError: () => {
      toast.error('Logo yüklenemedi. Lütfen tekrar deneyin.', { position: 'bottom-right' });
    },
  });
}

export function useRemoveReportingLogo() {
  const queryClient = useQueryClient();

  return useMutation<void, AxiosError>({
    mutationFn: () => axiosInstance.delete('/api/v1/settings/reporting/logo').then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      toast.success('Logo kaldırıldı.', { position: 'bottom-right' });
    },
    onError: () => {
      toast.error('Logo kaldırılamadı. Lütfen tekrar deneyin.', { position: 'bottom-right' });
    },
  });
}
